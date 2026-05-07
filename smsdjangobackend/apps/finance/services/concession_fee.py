from django.db import transaction
from rest_framework import exceptions
from apps.classes.models.standard import Standard
from django.core.exceptions import ObjectDoesNotExist

from apps.finance.models import FeeStandardMapping, ConcessionType
from apps.finance.models import ConcessionType, Concession
from apps.finance.models.concession import FeePlanConcessionMapping, FeePlanConcessionMappingMaster
from apps.finance.models.fee import FeePlan
from apps.finance.models.feeCollection import AdmissionForm
from apps.finance.serializers import AdjustmentFeeSerializer, AdmissionFormSerializer, ConcessionFeeSerializer, ConcessionSerializer, FeePlanConcessionMappingMasterSerializer, FeePlanConcessionMappingSerializer, StandardFeeTermSerializer
from apps.finance.services import calculations
from apps.finance.services.concession_student import CONCESSION_TYPE_TOTAL
from apps.finance.services.fee_plan import get_fee_plan
from apps.institutes.models import AcademicYear
from apps.institutes.models.visitor import Reason
from apps.notification.services.notification_service import send_notification
from apps.shared.services import CounterService, SharedService, NotificationBodyTemplate
from apps.students.models import Student
from apps.tenants.services.middlewares import get_current_db_name


def add_concession_fee(self, data, fee_collection_id=None,**kwargs):
    fee_standard = FeeStandardMapping.objects.all()
    fee_standard = fee_standard.filter(academic_year=data['academic_year'], standard=data['standard'], is_approved='1')
    if not fee_standard:
        raise exceptions.ValidationError('Feeplan is not yet approved.')
    SharedService.duplicate_list_one_object(data['concession_types'], 'fee_plan')
    instance = Concession.objects.filter(academic_year=data['academic_year'], concession_adjustment__is_active=True,
                                        concession_adjustment__concession__isnull=False,
                                        concession_adjustment__student=data['student'], is_active=1).first()
    if instance:
        raise exceptions.ValidationError('Concession is already applied to the student.')
    if data['concession_on_type'] == CONCESSION_TYPE_TOTAL:
        return_value = False
    else:
        return_value = True
    fee = calculations.fee_calculation(self, data['student'], data['academic_year'], data['standard'], return_value)
    student_concession_data = {concession['fee_plan']: concession for concession in data['concession_types']}
    fee_plan_ids = student_concession_data.keys()
    fee_plan_data = FeePlan.objects.filter(
        id__in=fee_plan_ids
    )
    is_admission_fee_exist = False
    for fee_plan in fee_plan_data:
        if fee_plan.standard_fee.fee_type.codename == 'admission':
            is_admission_fee_exist = True
    term_ids = list()
    total_concession_amount = 0
    for fee_type in fee['data']:
        for terms in fee_type['standard_fee']:
            term_ids.append(terms['id'])
            if terms['id'] in student_concession_data:
                fee_name = f'{fee_type["fee_type_name"]} {terms["terms"]}'
                if terms['is_disabled']:
                    raise exceptions.ValidationError(
                        f'Cannot apply concession for {fee_name}. Since the student is not opted {fee_name}.')
                if terms['pending_amount'] <= 0:
                    raise exceptions.ValidationError(
                        f'Cannot apply concession for {fee_name}. Since the student is does not have pending amount in {fee_name}.')
                amount = float(student_concession_data[terms['id']]['amount'])
                total_concession_amount += amount
                if terms['pending_amount'] < amount:
                    raise exceptions.ValidationError(
                        f'Concession amount for {fee_name} is should be less than or equal to {terms["pending_amount"]}.')
    for name in student_concession_data.keys():
        if name not in term_ids:
            raise exceptions.ValidationError('Invalid fee term(s).')
    user = self.request.user.pk if self.request.user.pk else None
    with transaction.atomic(using=get_current_db_name()):
        if is_admission_fee_exist:
            if not AdmissionForm.objects.filter(student=data['student'],academic_year=data['academic_year']).exists():
                admission_counter, admission_prefix, admission_postfix = CounterService.get_countered_value(self,
                                                                                                                'ADMISSION',
                                                                                                                academic_year=data['academic_year'])
                admission_data = {'academic_year': data['academic_year'], 'student': data['student'],
                                    'admission_num': f'{admission_prefix}{admission_counter.value}{admission_postfix}'}
                admission_serializer = AdmissionFormSerializer(data=admission_data)
                admission_serializer.is_valid(raise_exception=True)
                admission_serializer.save()
        serializer = ConcessionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        concession = serializer.save()
        for con in data['concession_types']:
            if 'reason' in con and con['reason']: #check is reason_text
                try:
                    reason_obj = Reason.objects.get(name=con['reason'])
                except ObjectDoesNotExist:
                   reason_obj = Reason.objects.create(name=con['reason'], reason_type='adjustment')
                con['reason_id'] = reason_obj.id
            con.update({'concession': concession.pk, 'student': data['student'], 'user': user})
        for types in data['concession_types']:
            types['fee_collection']=fee_collection_id 
        serializer = ConcessionFeeSerializer(data=data['concession_types'], many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response = {'Reason': 'Data added Successfully!', 'data': serializer.data}
    SharedService.custom_thread(add_concession_fee_notification, self, data, total_concession_amount)
    return response

def add_concession_fee_notification(self, data, total_concession_amount):
    student = Student.objects.get(id=data['student'])
    academic_year = AcademicYear.objects.get(id=data['academic_year'])
    concession = ConcessionType.objects.get(id=data['concession_type'])
    temp = {
        'student_name': student.first_name.capitalize(),
        'concession_name': concession.name,
        'standard_name': student.current_standard.name,
        'start_date': academic_year.start_date.year,
        'end_date': academic_year.end_date.year,
        'total_concession_amount': total_concession_amount
    }
    notification_obj = NotificationBodyTemplate('concession_create')
    body_email = notification_obj.select_template('email', temp)
    body_sms = notification_obj.select_template('sms', temp)
    body_push = notification_obj.select_template('push', temp)
    customized_data = []
    user_id = student.user_student.id
    customized_data.append(
        {
            'push_subject': None, 'push_body': body_push, 'push_notification': 1,
            'user_id': user_id, 'extra_params': {}
        }
    )
    if student.email:
        customized_data.append(
            {
                'email': student.email, 'user_id': user_id, 'email_subject': None,'email_body': body_email,'email_notification': 1
            }
        )
    if student.mobile_num:
        customized_data.append(
            {
                'mobile_number': student.mobile_num, 'sms_body': body_sms,'sms_notification': 1, 'user_id': user_id
            }
        )
    send_notification('concession_create', body=None, customizedData=customized_data)

def get_fee_plan_concession(self, standard_id, academic_year):
    
    try:
        fee_standard_mapping_data = FeePlanConcessionMappingMaster.objects.get(
            fee_plan_concession_mapping_master__fee_plan__standard_fee__academic_year=academic_year,
            fee_plan_concession_mapping_master__fee_plan__standard_fee__standard=standard_id
        )
        serializer = FeePlanConcessionMappingMasterSerializer(instance=fee_standard_mapping_data)
        response  = {'data': serializer.data}
        queryset = FeePlanConcessionMapping.objects.filter(master=serializer.data['id'])
        serilizer_temp = FeePlanConcessionMappingSerializer(queryset, many=True)
        response['data']['master_data'] = serilizer_temp.data
        return response
    except Exception as e:
        return {'data': {}}

def get_fee_plan_concession_list(self):
    if not self.request.GET.get('academic_year'):
        raise exceptions.ValidationError('Academic Year is mandatory')
    response = SharedService.read_data(self, True)
    fee_standard_mapping = []
    for fee_data in response['data']:
        for fee_type in fee_data['fee_types']:
            fee_standard_mapping.append(
                fee_type['id']
            )
    concession_data = FeePlanConcessionMapping.objects.filter(fee_plan__standard_fee__in=fee_standard_mapping).values(
        'fee_plan__standard_fee', 'fee_plan', 'concession_amount', 'master', 'master__concession_type'
    )
    concession_mapping_data = {}
    for row_data in concession_data:
        if row_data['fee_plan__standard_fee'] not in concession_mapping_data:
            concession_mapping_data[row_data['fee_plan__standard_fee']] = {
                'master_data': {
                    'concession_type': row_data['master__concession_type']
                },
                'fee_plan_mapping': []
            }
        temp = {
            'fee_plan': row_data['fee_plan'],
            'concession_amount': row_data['concession_amount'],
        }
        concession_mapping_data[row_data['fee_plan__standard_fee']]['fee_plan_mapping'].append(temp)
    for fee_data in response['data']:
        for fee_type in fee_data['fee_types']:
            if fee_type['id'] in  concession_mapping_data:
                if 'concession_data' not in fee_data:
                    fee_data['concession_data'] = {
                        'concession_fee_plan_mapping': [],
                        'concession_master_data': concession_mapping_data[fee_type['id']]['master_data']
                    }
                fee_data['concession_data']['concession_fee_plan_mapping'] += concession_mapping_data[fee_type['id']]['fee_plan_mapping']
    return response


def get_fee_plan_concession_detail(self):
    if not self.request.GET.get('academic_year'):
        raise exceptions.ValidationError('Academic Year is mandatory')
    response = get_fee_plan(self)
    
    return response

    