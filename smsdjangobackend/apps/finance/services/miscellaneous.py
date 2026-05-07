import datetime

from django.db import transaction
from django.db.models import Sum
from rest_framework import exceptions
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.models.standard import Standard
from apps.finance.models.feeCollection import AdmissionForm
from apps.finance.services.fee_collection import get_fee_receipt_counter, get_misc_receipt_counter_misc_type
from apps.students.models.student import Student
from apps.students.models import StudentParentMapping
from apps.students.services.student import delete_student, get_student_admission_form, issue_tc_for_student
from num2words import num2words

from apps.finance.models.miscellaneous import MiscellaneousMapping, MiscellaneousPayment, Miscellaneous
from apps.finance.serializers import MiscellaneousPaymentSerializer,DepositWithdrawRecordSerializer
from apps.institutes.models import AcademicYear, Institute
from apps.notification.services.notification_service import send_notification
from apps.shared.services import FormdefinitionService, SharedService, CounterService, PDFService, UploadTypeService, NotificationBodyTemplate
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.finance.services import calculations
from apps.shared.models.fee_type_counter import CounterMiscTypeMapping, Counter
from django.contrib.contenttypes.models import ContentType
from apps.institutes.serializers import InstituteSerializer

def update_misc_types(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(misc_type__is_active=True, misc_type__isnull=False):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_misc_types(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(misc_type__is_active=True, misc_type__isnull=False):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response


def add_misc_plan(self, data):
    SharedService.duplicate_list_one_object(data['misc_plan'], 'misc_type')
    for misc in data['misc_plan']:
        if misc['amount'] and float(misc['amount']) < 0:
            raise exceptions.ValidationError('Please enter a valid amount.')
        misc.update({'academic_year': data['academic_year']})
    response = SharedService.add_data(self, data['misc_plan'])
    return response


def update_misc_plan(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(misc__miscellaneous__is_active=True, misc__isnull=False):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    if float(data['amount']) < 1:
        raise exceptions.ValidationError('Please enter a valid amount.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_misc_plan(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(misc__miscellaneous__is_active=True, misc__isnull=False):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response


def add_misc(self, data):
    academic_year = AcademicYear.get_academic_year_for_date(self, datetime.date.today(), next=True)
    misc_data = MiscellaneousMapping.objects.filter(is_active=True, academic_year=data['academic_year']).values('id','misc_type',
                                                                                                             'amount', 'misc_type__code_name')
    misc_plan = {}
    misc_separate_counter_for_misc_type = FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'misc_separate_counter_for_misc_type')
    for misc in misc_data:
        misc_plan[misc['id']] = misc
    total_amount = 0
    if len(data['misc_types'])>1:
        raise exceptions.ValidationError('Counter not handeled.')
    for misc_type in data['misc_types']:
        # if float(misc_type['amount']) != misc_plan[misc_type['misc']]['amount']:
        #     raise exceptions.ValidationError('Amount should be equal.')
        misc_type_id = misc_plan[misc_type['misc']]['misc_type']
        total_amount += misc_plan[misc_type['misc']]['amount']
        if misc_separate_counter_for_misc_type:
            if misc_plan[misc_type['misc']]['misc_type__code_name'] == 'sc':
                counter, prefix, postfix = CounterService.get_countered_value(self, 'STUDY_CERTIFICATE_MISC', academic_year=academic_year)
                misc_type['receipt_num'] = f'{prefix}{counter.value}{postfix}'
                misc_type['counter'] = counter #sending this to increment counter
            elif misc_plan[misc_type['misc']]['misc_type__code_name'] == 'tc':
                if 'is_student_delete' in data and data['is_student_delete']:
                    if 'standard' not in data or not data['standard']:
                        raise exceptions.ValidationError(
                            'standard is mandatory'
                        )
                    if not data['student']:
                        raise exceptions.ValidationError('Tc certificate given only for student')
                counter, prefix, postfix = CounterService.get_countered_value(self, 'TC_CERTIFICATE_MISC', academic_year=academic_year)
                misc_type['receipt_num'] = f'{prefix}{counter.value}{postfix}'
                misc_type['counter'] = counter
    if total_amount > 0 and ('mode_of_payment' not in data or not data['mode_of_payment']):
        raise exceptions.ValidationError('Mode Of Payment is Mandatory') 
    standard = data['standard'] if 'standard' in data and data['standard'] else None
    if not data.get('student') and not data.get('guest_name') and not data.get('staff'):
        raise exceptions.ValidationError("Either student, guest or staff is required")
    if data.get('guest_name') and standard:
        data['guest_standard'] = standard
    counter, prefix, postfix = get_misc_receipt_counter_misc_type(self, academic_year, misc_type_id,standard)
    data['receipt_num'] = f'{prefix}{counter.value}{postfix}'
    data['user'] = self.request.user.pk if self.request.user else None
    deposit_data = []
    if 'bank_detail_id' in data and data['bank_detail_id']:
        data['bank_detail'] = data['bank_detail_id']
        del data['bank_detail_id']
        deposit_data={
            "bank_to":data['bank_detail'],
            "date":data['date'],
            "transaction_type":1,
            "transaction_from":2,
            "amount":data['total_amount'],
            "created_by":self.request.user.id
        }
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, False)
        for misc_type in data['misc_types']:
            if 'counter' in misc_type and misc_type['counter']:
                CounterService.increment_counter(self, misc_type['counter'])
            if misc_plan[misc_type['misc']]['misc_type__code_name'] == 'tc' and 'is_student_delete' in data and data['is_student_delete']:
                issue_tc_for_student(self, data['student'], data['standard'])
            misc_type.update({'miscellaneous': response['data']['id']})
        serializer = MiscellaneousPaymentSerializer(data=data['misc_types'], many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if data.get('bank_detail'):
            miscellaneous = Miscellaneous.objects.get(id=response['data']['id'])
            content_type = ContentType.objects.get_for_model(miscellaneous)
            deposit_data['content_type'] = content_type.id
            deposit_data['object_id'] = miscellaneous.pk
            depositserializer = DepositWithdrawRecordSerializer(data = deposit_data)
            depositserializer.is_valid(raise_exception=True)
            depositserializer.save()
        CounterService.increment_counter(self, counter)
    if data.get('student'):
        self.kwargs['pk'] = response['data']['id']
        SharedService.custom_thread(add_misc_notification, self, data['student'], total_amount)
    return response


def add_misc_notification(self, student, total_amount):
    filename = get_misc_fee_receipt(self, localPath=True)
    url = UploadTypeService.upload_local_file(filename, path='FeeReceipt')
    user = User.objects.get(student=student)
    notification_obj = NotificationBodyTemplate('misc_create')
    temp = {
        'student_name': user.student.first_name,
        'amount': f'{total_amount:,}'
    }
    body_sms = notification_obj.select_template('sms', temp)
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    customized_data = []
    if user.student.mobile_num:
        customized_data.append(
            {'mobile_number': user.student.mobile_num, 'sms_body': body_sms,'sms_notification': 1, 'user_id': user.id}
        )
    if user.student.email:
        customized_data.append(
            {   'email': user.student.email, 'email_subject': None, 'user_id': user.id, 'email_body': body_email,
                'attachmentLinks':[{'url': url, 'file_name': filename.split('.')[0]}],'email_notification':1
            }
        )
    customized_data.append({
            'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user.id, 'extra_params': {'heading': 'Fee(s) Paid'}
    })
    send_notification('misc_create', customizedData=customized_data)

def get_misc_fee_receipt(self, localPath=False):
    selected_template, number_of_copies  = get_selected_template(self, 'misc_reciept', 'pdf', 'miscFeesReceiptStudentCopy.html')
    path = 'miscs_reports/'+selected_template
    miscellaneous = self.get_object()
    payment_details = MiscellaneousPayment.objects.filter(miscellaneous=miscellaneous)
    today = datetime.datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    amount_in_words = num2words(miscellaneous.total_amount, lang='en')
    student_parent=StudentParentMapping.objects.filter(student=miscellaneous.student)
    balance=0
    for payments in payment_details:
        balance+=miscellaneous.total_amount-payments.amount
    data = {'misc_collection': miscellaneous, 'payment_details': payment_details, 'today': today,
            'institute': Institute.get_institute(self), 'amount_in_words': amount_in_words,
            'number_of_copies': range(number_of_copies),'balance':balance,'student_parent':student_parent}
    if miscellaneous.student:
        AdmissionForm.get_student_admission_num(self, miscellaneous.student.id)
        data['admission_num'] = AdmissionForm.get_student_admission_num(self, miscellaneous.student.id)
    if selected_template == 'misc_gurukula_reciept.html':
        response = PDFService.receipt(self, data, miscellaneous.receipt_num, path, localPath)
    else:
        response = PDFService.receipt_new(self, data, miscellaneous.receipt_num, path, localPath)
    return response


def get_misc(self):
    queryset = self.filter_queryset(self.get_queryset())
    if self.request.GET.get('from_date') and self.request.GET.get('to_date'):
        queryset = queryset.filter(date__range=(self.request.GET.get('from_date'), self.request.GET.get('to_date')))
    user = self.request.GET.get('user')
    if user == '1':
        queryset = queryset.exclude(student=None)
    elif user == '2':
        queryset = queryset.filter(student=None)
    elif user == '3':  # Staff
        queryset = queryset.filter(staff__isnull=False)

    # Mode of payment filter
    mode_of_payment = self.request.GET.get('mode_of_payment')
    if mode_of_payment:
        mode_list = [m.strip() for m in mode_of_payment.split(',') if m.strip()]
        if mode_list:
            queryset = queryset.filter(mode_of_payment__in=mode_list)

    # Standard filter
    standard = self.request.GET.get('standard')
    if standard:
        standard_ids = [s.strip() for s in standard.split(',') if s.strip()]
        if standard_ids:
            queryset = queryset.filter(student__current_standard__in=standard_ids)

    # Section filter
    section = self.request.GET.get('section')
    if section:
        section_ids = [s.strip() for s in section.split(',') if s.strip()]
        if section_ids:
            student_ids_in_section = StudentStandardMapping.objects.filter(
                section__in=section_ids, is_active=True
            ).values_list('student_id', flat=True)
            queryset = queryset.filter(student__in=student_ids_in_section)

    # Student type filter (new_student / old_student)
    student_type = self.request.GET.get('student_type')
    if student_type == 'new_student':
        queryset = queryset.filter(student__is_new_student=True)
    elif student_type == 'old_student':
        queryset = queryset.filter(student__is_new_student=False)

    summary_queryset = queryset.distinct()
    mode_of_payment_summary = [
        {
            'label': summary.get('mode_of_payment') or 'Other',
            'amount': float(summary.get('amount') or 0),
        }
        for summary in summary_queryset.values('mode_of_payment').annotate(amount=Sum('total_amount'))
    ]
    bank_wise_summary = [
        {
            'bank_name': summary.get('bank_detail__bank_name'),
            'amount': float(summary.get('amount') or 0),
        }
        for summary in MiscellaneousPayment.objects.filter(
            miscellaneous__in=summary_queryset
        ).values('bank_detail__bank_name').annotate(amount=Sum('amount'))
    ]

    download_report = self.request.GET.get('download_report')

    serializer = self.get_serializer(queryset.distinct(), many=True)

    if download_report:
        data = serializer.data
    else:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))

    student_ids = []
    for row_data in data:
        row_data['admission_num'] = ''
        if row_data.get('student'):
            student_ids.append(row_data['student'])
            row_data['name'] = get_full_name(row_data['student_first_name'], row_data['student_middle_name'], row_data['student_last_name']) + " (Student)"
        elif row_data.get('staff'):
            row_data['name'] = get_full_name(row_data['staff_first_name'], row_data['staff_middle_name'], row_data['staff_last_name']) + " (Staff)"
        elif row_data.get('guest_name'):
            row_data['name'] = row_data.get('guest_name', '') + " (Guest)"
        else:
            row_data['name'] = "-"

        # Build misc_type string for each row
        misc_type = ''
        if row_data.get('payment_details'):
            misc_type = ', '.join([p.get('misc_type_name', '') for p in row_data['payment_details'] if p.get('misc_type_name')])
        row_data['misc_type'] = misc_type

    if student_ids:
        student_admission_map = get_student_admission_form(self, student_ids)
        for row_data in data:
            if row_data['student'] in student_admission_map:
                row_data['admission_num'] = student_admission_map[row_data['student']]

    if download_report:
        return _download_misc_report_pdf(self, data)

    return {
        'data': {
            'count': count,
            'next': next_page,
            'previous': previous_page,
            'data_list': data,
            'mode_of_payment_summary': mode_of_payment_summary,
            'bank_wise_summary': bank_wise_summary,
        }
    }


def _download_misc_report_pdf(self, data):

    selected_template, number_of_copies = get_selected_template(
        self, 'misc_collection_report', 'pdf', 'default_misc_collection_report.html'
    )
    path = 'miscs_reports/' + selected_template

    total_amount = sum(float(row.get('total_amount', 0) or 0) for row in data)

    mop_summary = {}
    for row in data:
        mop = row.get('mode_of_payment', 'Other') or 'Other'
        amt = float(row.get('total_amount', 0) or 0)
        if mop in mop_summary:
            mop_summary[mop] += amt
        else:
            mop_summary[mop] = amt
    mode_of_payment_summary = [{'mode': k, 'amount': v} for k, v in mop_summary.items()]

    from_date = self.request.GET.get('from_date', '')
    to_date = self.request.GET.get('to_date', '')

    template_data = {
        'data_list': data,
        'institute': Institute.get_institute(self),
        'total_amount': total_amount,
        'mode_of_payment_summary': mode_of_payment_summary,
        'from_date': from_date,
        'to_date': to_date,
    }

    options = {
        'page-size': 'A4',
        'orientation': 'Landscape',
        'margin-top': '5mm',
        'margin-right': '5mm',
        'margin-bottom': '5mm',
        'margin-left': '5mm',
    }

    response = PDFService.receipt_new(self, template_data, 'Miscellaneous_Collection_Report', path, options=options)
    return response

