from datetime import datetime

from django.db import transaction
from rest_framework import exceptions
from apps.finance.models.feeCollection import AdmissionForm
from num2words import num2words

from apps.classes.models import StandardSectionMapping
from apps.finance.models import ApplicationPlan, ApplicationPaymentDetail
from apps.finance.serializers import ApplicationPaymentDetailSerializer, DepositWithdrawRecordSerializer
from apps.forms.serializers import ApplicationStudentParentMappingSerializer
from apps.forms.models.applicationStudent import ApplicationStudentParentMapping
from apps.institutes.models import Institute
from apps.users.models import User
from apps.shared.services import FormdefinitionService, SharedService, PDFService, CounterService, UploadTypeService
from apps.shared.services_shared.common import get_selected_template
from apps.tenants.services.middlewares import get_current_db_name
from apps.forms.serializers import ApplicationStudentSerializer
from apps.finance.models.feeCollection import ApplicationPaymentDetail
from django.contrib.contenttypes.models import ContentType


def add_application_fee_plan(self, data):
    """
    Supports:
    1. Payload with non-empty plan – create/update application plans (existing behaviour).
    2. Payload with empty plan + is_academic_year_online_appln – set the given academic year
       as the only one with is_academic_year_online_appln=1; all others become 0.
    """
    academic_year_id = data.get('academic_year')
    plans = data.get('plan', [])

    if plans:
        standard_queryset = StandardSectionMapping.objects.filter(academic_year=academic_year_id)
        # Use payload value if sent; else inherit from table: if this academic_year already has
        # is_academic_year_online_appln=True, new plans should also be True
        flag_value = data.get('is_academic_year_online_appln')
        if flag_value is not None:
            is_online = bool(int(flag_value)) if isinstance(flag_value, (str, int)) else bool(flag_value)
        else:
            is_online = ApplicationPlan.objects.filter(
                academic_year_id=academic_year_id,
                is_academic_year_online_appln=True
            ).exists()
        for plan in plans:
            if not standard_queryset.filter(standard=plan['standard']):
                raise exceptions.ValidationError(
                    f'standard id {plan["standard"]} is not present in the given academic year!')
            if not plan.get('amount'):
                raise exceptions.ValidationError('Please enter amount!')
            plan.update({
                'academic_year': academic_year_id,
                'is_academic_year_online_appln': is_online,
            })
        response = SharedService.add_data(self, plans)
        if is_online:
            ApplicationPlan.objects.exclude(academic_year_id=academic_year_id).update(
                is_academic_year_online_appln=False
            )
        return response

    # Empty plan: only update is_academic_year_online_appln by academic year
    # e.g. {"academic_year": 3, "plan": [], "is_academic_year_online_appln": 1}
    if academic_year_id is None:
        raise exceptions.ValidationError('academic_year is mandatory')
    flag_value = data.get('is_academic_year_online_appln')
    is_online = bool(int(flag_value)) if isinstance(flag_value, (str, int)) else bool(flag_value)
    if is_online:
        ApplicationPlan.objects.exclude(academic_year_id=academic_year_id).update(
            is_academic_year_online_appln=False
        )
        ApplicationPlan.objects.filter(academic_year_id=academic_year_id).update(
            is_academic_year_online_appln=True
        )
    else:
        ApplicationPlan.objects.filter(academic_year_id=academic_year_id).update(
            is_academic_year_online_appln=False
        )
    return {'Reason': 'Data added Successfully!'}


def update_application_fee_plan(self, data, **kwargs):
    standard_queryset = StandardSectionMapping.objects.filter(academic_year=data['academic_year'],
                                                              standard=data['standard'])
    if not standard_queryset:
        raise exceptions.ValidationError(f'standard is not present in the given academic year!')
    # if ApplicationPaymentDetail.objects.filter(student__entry_academic_year=data['academic_year'], #nikhil play with active and inactive
    #                                            student__current_standard=data['standard']).exists():
    #     raise exceptions.ValidationError(f'Cannot update application fee is paid by student(s).')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def get_application_fee_plan(self, isList=False):
    if isList:
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.filter(
            standard__present_standard__academic_year=self.request.GET.get('academic_year')).distinct()
        if self.request.GET.get('standard'):
            isList = False
            queryset = queryset.first()
    else:
        queryset = self.get_object()
    serializer = self.get_serializer(queryset, many=isList)
    return {'data': serializer.data}


def add_application_fee(self, data,date=None):
    applicationPlan = ApplicationPlan.objects.get(id=data['application_plan'])
    data['amount_paid'] = applicationPlan.amount
    if FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'application_reciept_new_student_old_student'):
        if data['is_new_student']:#new student
            counter, prefix, postfix  = CounterService.get_countered_value(self, 'APPLICATION_FEE_RECEIPT_NEW_STUDENT',
                academic_year=applicationPlan.academic_year)
        else:
            counter, prefix, postfix  = CounterService.get_countered_value(self, 'APPLICATION_FEE_RECEIPT_OLD_STUDENT',
            academic_year=applicationPlan.academic_year)
    else:
        counter, prefix, postfix = CounterService.get_countered_value(self, 'APPLICATION_RECEIPT',
                                                                    academic_year=applicationPlan.academic_year)
    data['receipt_num'] = f'{prefix}{counter.value}{postfix}'
    data['user'] = self.request.user.pk if self.request.user else None
    if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_application_amount_editable'):
        data['amount_paid'] = data['amount']
    elif 'amount' in data and data['amount_paid'] != data['amount']:
        raise exceptions.ValidationError('Payment is not editable')
    serializer = ApplicationPaymentDetailSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    deposit_data = []
    if 'bank_detail_id' in data and data['bank_detail_id']:
        data['bank_detail'] = data['bank_detail_id']
        del data['bank_detail_id']
        deposit_data={
            "bank_to":data['bank_detail'],
            "date":date,
            "transaction_type":1,
            "transaction_from":5,
            "amount":data['amount'],
            "created_by":self.request.user.id
        }
    with transaction.atomic(using=get_current_db_name()):
        serializer.save()
        CounterService.increment_counter(self, counter)
        if data.get('bank_detail'):
            application_payment_detail = ApplicationPaymentDetail.objects.get(id=serializer.data['id'])
            content_type = ContentType.objects.get_for_model(application_payment_detail)
            deposit_data['content_type'] = content_type.id
            deposit_data['object_id'] = application_payment_detail.pk
            depositserializer = DepositWithdrawRecordSerializer(data = deposit_data)
            depositserializer.is_valid(raise_exception=True)
            depositserializer.save()
    return {'Reason': 'Data added Successfully!', 'data': serializer.data}


def get_application_fee_receipt(self,data):
    selected_template, number_of_copies  = get_selected_template(self, 'application_fees', 'pdf', 'applicationReceipt.html')
    path = 'application_reciepts/'+selected_template
    if 'application_payment_detail_id' in data:
        application_receipt = ApplicationPaymentDetail.objects.get(id=data['application_payment_detail_id'])
    elif 'application_student_id' in data:
        application_receipt = ApplicationPaymentDetail.objects.get(student=data['application_student_id'])
    parent_details = ApplicationStudentParentMapping.objects.filter(application_student=application_receipt.student.id).values('application_parent__father_name')[0]
    user_details = User.objects.filter(id=application_receipt.user.id).values('staff__first_name','staff__middle_name','staff__last_name')[0]
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    father_name = parent_details['application_parent__father_name']
    data = {'application_receipt': application_receipt, 'today': today, 'institute': Institute.get_institute(self),'collected_by': user_details,
            'bucket': UploadTypeService.set_bucket_folder_path(), 'number_of_copies': range(number_of_copies), 'father_name':father_name}
    data['admission_num'] = ''
    if application_receipt.student.student:
        admission_form = AdmissionForm.objects.filter(student=application_receipt.student.student.id).first()
        if admission_form:
            data['admission_num'] = admission_form.admission_num
    amount_in_words = num2words(application_receipt.amount_paid , lang='en')
    data['amount_in_words'] = amount_in_words
    if selected_template == 'application_fee_report_gurukula.html':
        response = PDFService.receipt(self, data, application_receipt.receipt_num, path)
    else:
        response = PDFService.receipt_new(self, data, application_receipt.receipt_num, path)
    return response

def get_application_transaction(self, standard_id=None):
    payment_details = ApplicationPaymentDetail.objects.all()   
    if standard_id:
        payment_details = payment_details.filter(student__current_standard=standard_id)
    result = []
    for payment in payment_details:
        payment_data = ApplicationPaymentDetailSerializer(payment).data
        student = payment.student
        if student:
            student_data = ApplicationStudentSerializer(student).data
            payment_data['student_details'] = student_data
        result.append(payment_data)
    return result

def update_transaction_date(self, transaction_id, transaction_date):
    try:
        transaction = ApplicationPaymentDetail.objects.get(id=transaction_id)
        if not transaction_date:
            raise exceptions.ValidationError("Transaction date must be provided.")
        transaction.transaction_date = transaction_date
        transaction.save()  
        return {"status": "success", "message": "Transaction date updated successfully."}
  
    except Exception as e:  
        raise exceptions.ValidationError(f"Error: {str(e)}")
