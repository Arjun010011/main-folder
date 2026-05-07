from datetime import datetime

from django.db import transaction
from rest_framework import exceptions

from apps.finance.models import FeePlan, PaymentDetail
from apps.finance.models.concession import AdjustmentFee
from apps.finance.models.fee import FeeStandardMappingItemSellingPrice, FeeplanStudentFeature, StudentStoreMapping, StudentStoreMappingLog
from apps.finance.serializers import FeeplanStudentFeatureSerializer, StudentStoreMappingLogSerializer, StudentStoreMappingSerializer
from apps.finance.services import fee_collection
from apps.finance.services.fee_plan import CUSTOM_CODENAME, STORE_CODENAME, TRANSPORT_CODENAME
from apps.notification.services.notification_service import send_notification
from apps.shared.services import  SharedService, NotificationBodyTemplate
from apps.store.models.dataEntry import ItemSold, ItemSoldDetails
from apps.students.models import Student
from apps.classes.models.enrollment import StudentStandardMapping
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User


def validate_feature(self, student, feature, deletedFeature):
    standardFee = self.get_queryset()
    academicYearStandard = standardFee.filter(id__in=feature + deletedFeature).first()
    if not academicYearStandard:
        return
    academicYear = academicYearStandard.academic_year
    standard = academicYearStandard.standard
    featurePlanId = standardFee.filter(id__in=feature).values('standard_fee__id', flat=True)
    deletedFeaturePlanId = standardFee.filter(id__in=deletedFeature).values('standard_fee__id', flat=True)


def validate_feature_stock_mapping(self, fee_data, fee_plan_instance, student_id, feature_status, deleted_fee_plan_ids):
    if 'fee_plan_item_selling_mapping' in fee_data and str(fee_plan_instance.id) in fee_data['fee_plan_item_selling_mapping']:
        fee_standard_mapping_item_selling_price_ids = [f['fee_standard_mapping_item_selling_price_id'] for f in \
            fee_data['fee_plan_item_selling_mapping'][str(fee_plan_instance.id)]]
        fee_plan_item_selling_mapping = fee_data['fee_plan_item_selling_mapping'][str(fee_plan_instance.id)]
    elif fee_plan_instance.id in fee_data and 'fee_plan_item_selling_mapping' in fee_data and fee_data['fee_plan_item_selling_mapping']:
        fee_standard_mapping_item_selling_price_ids = [f['fee_standard_mapping_item_selling_price_id'] for f in \
            fee_data['fee_plan_item_selling_mapping'][fee_plan_instance.id]]
        fee_plan_item_selling_mapping = fee_data['fee_plan_item_selling_mapping'][fee_plan_instance.id]
    else:
        fee_standard_mapping_item_selling_price_ids = []
        fee_plan_item_selling_mapping = []
    fee_plan_ids = list(FeeStandardMappingItemSellingPrice.objects.filter(
        id__in=fee_standard_mapping_item_selling_price_ids
    ).values_list('fee_standard_mapping__standard_fee__id', flat=True))
    if set([fee_plan_instance.id]) - set(fee_plan_ids): #checking are we adding different fee type for it
        raise exceptions.ValidationError('Store items not added to the fee plan')
    fee_plan_name = fee_plan_instance.standard_fee.fee_type.name
    adding_stock_mapping_datas = []
    removing_stock_mapping_datas = []
    is_current_fee_plan_disalbed = False
    if feature_status == 2:
        is_current_fee_plan_disalbed = True
    elif feature_status == 3 and fee_plan_instance.id in deleted_fee_plan_ids:
        is_current_fee_plan_disalbed = True
    existing_student_store = StudentStoreMapping.objects.filter(student=student_id,
        fee_standard_mapping_item_selling__fee_standard_mapping=fee_plan_instance.standard_fee.id
    )
    existing_stock_mapping_datas = list(existing_student_store.values_list('fee_standard_mapping_item_selling', flat=True))
    student_store_mapping_data = {s['fee_standard_mapping_item_selling']: s for s in existing_student_store.values(
        'issued_quantity', 'quantity', 'fee_standard_mapping_item_selling__quantity', 'student',
        'fee_standard_mapping_item_selling'
    )}
    for fee_data in fee_plan_item_selling_mapping:
        if fee_data['feature_status'] == 1:
            adding_stock_mapping_datas.append(fee_data['fee_standard_mapping_item_selling_price_id'])
            if 'quantity' in fee_data and fee_data['quantity'] and fee_data['fee_standard_mapping_item_selling_price_id'] in student_store_mapping_data:
                if fee_data['quantity'] < student_store_mapping_data[fee_data['fee_standard_mapping_item_selling_price_id']]['issued_quantity']:
                    raise exceptions.ValidationError('Trying to set the quantity less than issued')
                if fee_data['quantity'] > student_store_mapping_data[fee_data['fee_standard_mapping_item_selling_price_id']]['fee_standard_mapping_item_selling__quantity']:
                    raise exceptions.ValidationError('Trying to set the quantity greater than configuration')
        elif fee_data['feature_status'] == 2:
            removing_stock_mapping_datas.append(fee_data['fee_standard_mapping_item_selling_price_id'])
    adding_and_existing = adding_stock_mapping_datas + existing_stock_mapping_datas
    existing_after_update = set(adding_and_existing) - set(removing_stock_mapping_datas) #currently what items we adding
    if not (existing_after_update) and not is_current_fee_plan_disalbed:#check empty stock data and enable the feature
        raise exceptions.ValidationError(f'Empty stock item enabled {fee_plan_name}')
    if existing_after_update and is_current_fee_plan_disalbed:
        raise exceptions.ValidationError(f'{fee_plan_name} - Current item exist but disabling the feature')
    if removing_stock_mapping_datas:
        if ItemSoldDetails.objects.filter(
            student_store_mapping__fee_standard_mapping_item_selling__in=removing_stock_mapping_datas,
            student_store_mapping__student=student_id
        ).exists():
            raise exceptions.ValidationError('Item already sold, cant disable')


def add_or_remove_student_store_mapping(self, fee_plan_item_selling_mapping, student_ids):
    data_to_save = []
    deletable_item_selling_mapping_ids = []
    for student in student_ids:
        for fee_plan_row in fee_plan_item_selling_mapping:
            if fee_plan_row['feature_status'] == 1:
                temp = {'fee_standard_mapping_item_selling': fee_plan_row['fee_standard_mapping_item_selling_price_id'], 'student': student}
                if 'quantity' in fee_plan_row and fee_plan_row['quantity']:
                    temp['quantity'] = fee_plan_row['quantity']
                if 'issued_quantity' in fee_plan_row and fee_plan_row['issued_quantity']:
                    temp['issued_quantity'] = fee_plan_row['issued_quantity']
                data_to_save.append(temp)
            if fee_plan_row['feature_status'] == 2:
                deletable_item_selling_mapping_ids.append(fee_plan_row['fee_standard_mapping_item_selling_price_id'])
    if deletable_item_selling_mapping_ids:
        StudentStoreMapping.objects.filter(student__in=student_ids, fee_standard_mapping_item_selling__in=deletable_item_selling_mapping_ids).delete()
    if data_to_save:
        currently_decrementing_quantity = 0
        current_quantity = 0
        for data in data_to_save:
            currently_adding_quantity = 0
            try:
                temp = {'fee_standard_mapping_item_selling': data['fee_standard_mapping_item_selling'], 'student': data['student']}
                student_store = StudentStoreMapping.objects.get(**temp)
                if data['quantity'] != student_store.quantity:
                    student_store.quantity = data['quantity']
                if 'issued_quantity' in data and int(student_store.issued_quantity) != int(data['issued_quantity']):
                    if student_store.issued_quantity < data['issued_quantity']:
                        currently_adding_quantity = data['issued_quantity'] - student_store.issued_quantity
                    elif student_store.issued_quantity > data['issued_quantity']:
                        currently_decrementing_quantity = student_store.issued_quantity - data['issued_quantity']
                if 'issued_quantity' in data:
                    student_store.issued_quantity = data['issued_quantity']
                student_store.save()
                student_store_id = student_store.id
                current_quantity = student_store.quantity
            except StudentStoreMapping.DoesNotExist:
                serializer = StudentStoreMappingSerializer(data=data)
                serializer.is_valid(raise_exception=True)
                student_store = serializer.save()
                current_quantity = student_store.quantity
                student_store_id = student_store.id
                if 'issued_quantity' in data:
                    if data['issued_quantity'] > 0:
                        currently_adding_quantity = data['issued_quantity']
            if currently_adding_quantity > 0:
                store_issued_quantity_log(current_quantity, currently_adding_quantity,student_store_id,1)
            elif currently_decrementing_quantity > 1:
                store_issued_quantity_log(current_quantity, currently_decrementing_quantity,student_store_id,0)

def store_issued_quantity_log(current_assigned_quantity, quantity, student_store_id, is_addition=1): #type 1 adding data type 0 decreasing quantity
    student_store_data = {
        'current_issued_quantity': quantity, 'is_addition': is_addition, 'student_store_mapping': student_store_id, 
        'current_assigned_quantity': current_assigned_quantity
    }
    ser = StudentStoreMappingLogSerializer(data=student_store_data)
    ser.is_valid(raise_exception=True)
    ser.save()
    return

def validate_custom_fee_type(self, feature_row, data):
    is_student_wise = False
    if ('custom_fee_type_mapping' not in data or str(feature_row['fee_plan']) not in data['custom_fee_type_mapping']) and \
        ('student_custom_fee_type_mapping' not in data or \
            str(feature_row['student']) not in data['student_custom_fee_type_mapping'] or \
            str(feature_row['fee_plan']) not in data['student_custom_fee_type_mapping'][str(feature_row['student'])]):
        raise exceptions.ValidationError('custom fee mapping doesnot exist')
    if 'custom_fee_type_mapping' in data and data['custom_fee_type_mapping']:
        for fee_plan_id in data['custom_fee_type_mapping']:
            if 'amount' not in data['custom_fee_type_mapping'][fee_plan_id] or not data['custom_fee_type_mapping'][fee_plan_id]:
                raise exceptions.ValidationError('Amount should not be empty')
    else:
        is_student_wise = True
        for student_id in data['student_custom_fee_type_mapping']:
            for fee_plan_id in data['student_custom_fee_type_mapping'][student_id]:
                if 'amount' not in data['student_custom_fee_type_mapping'][student_id][fee_plan_id] or not data['student_custom_fee_type_mapping'][student_id][fee_plan_id]:
                    raise exceptions.ValidationError('Amount should not be empty')
    return is_student_wise

""" here data is store data """
def validate_and_save_feature(self, data, data_list, deleted_list):
    response = {'Reason': ''}
    fee_plan_ids = []
    student_ids = []
    is_student_wise_feature_enable = False
    for row_data in data_list:
       fee_plan_ids.append(row_data['fee_plan'])
       student_ids.append(row_data['student'])
    for row_data_t in deleted_list:
        fee_plan_ids.append(row_data_t['fee_plan'])
        student_ids.append(row_data_t['student'])
    fee_plan = FeePlan.objects.filter(id__in=fee_plan_ids)
    student_id = Student.objects.filter(id__in=student_ids)
    student_standard_details = StudentStandardMapping.objects.filter(student__in=student_ids,standard=fee_plan[0].standard_fee.standard,academic_year=fee_plan[0].standard_fee.academic_year).values()
    student_details={}
    for student in student_id.values('id','gender'):
        if student['id'] not in student_details:
            student_details[student['id']] = {}
        student_details[student['id']] = student
    for detail in student_standard_details:
        if detail['student_id'] not in student_standard_details:
            student_details[detail['student_id']] = {}
        student_details[detail['student_id']].update(detail)
    if set(student_id.values_list('id', flat=True)) != set(student_ids):
        raise exceptions.ValidationError('Student is not exist(s)')
    payment_data = PaymentDetail.objects.filter(
        fee_collection__student__in=student_ids,
        fee_collection__is_active=True
    ).values(
        'fee_collection__student', 'fee_plan'
    )
    adjustment_data = AdjustmentFee.objects.filter(fee_plan__in=fee_plan_ids, student__in=student_ids, is_active=True).values(
        'student', 'id', 'fee_plan'
    )
    payment_student_fee_plan_mapping = {}
    adjustment_student_fee_plan_mapping = {}
    for payment_row in payment_data:
        if payment_row['fee_collection__student'] not in payment_student_fee_plan_mapping:
            payment_student_fee_plan_mapping[payment_row['fee_collection__student']] = {}
        if payment_row['fee_plan'] not in payment_student_fee_plan_mapping[payment_row['fee_collection__student']]:
            payment_student_fee_plan_mapping[payment_row['fee_collection__student']][payment_row['fee_plan']] = {}
    for adjustment_row in adjustment_data:
        if adjustment_row['student'] not in adjustment_student_fee_plan_mapping:
            adjustment_student_fee_plan_mapping[adjustment_row['student']] = {}
        if adjustment_row['fee_plan'] not in adjustment_student_fee_plan_mapping[adjustment_row['student']]:
            adjustment_student_fee_plan_mapping[adjustment_row['student']][adjustment_row['fee_plan']] = {}
    for feature_row in data_list:
            instance = fee_plan.get(id=feature_row['fee_plan'])
            is_store = True if instance.standard_fee.fee_type.codename == STORE_CODENAME else False
            is_custom_fee_type = True if instance.standard_fee.fee_type.codename == CUSTOM_CODENAME else False
            if not instance.standard_fee.is_approved:
                raise exceptions.ValidationError('Still fee plan is not approved')
            if is_store:
                validate_feature_stock_mapping(self, data, instance, feature_row['student'], data['feature_status'], deleted_list)
            elif is_custom_fee_type:
                is_student_wise_feature_enable = validate_custom_fee_type(self, feature_row, data)
    for feature_row_d in deleted_list:
        for temp_student in student_ids:
            if temp_student in payment_student_fee_plan_mapping and feature_row_d['fee_plan'] in payment_student_fee_plan_mapping[temp_student]:
                raise exceptions.ValidationError('Cannot enable/disable the feature fees is already paid')
            if temp_student in adjustment_student_fee_plan_mapping and feature_row_d['fee_plan'] in adjustment_student_fee_plan_mapping[temp_student]:
                raise exceptions.ValidationError('Cannot enable/disable the feature fees is Adjusted/Concession provided.To disable feature Remove data from Adjustment or Concession')
    with transaction.atomic(using=get_current_db_name()):
        fee_plan_mapping = {str(tempp['student']) + '_' + str(tempp['fee_plan']): tempp for tempp in FeeplanStudentFeature.objects.all().values('student', 'fee_plan', 'id')}
        for fee in data_list:
            instance = fee_plan.get(id=fee['fee_plan'])
            special_fee_plan =[]
            fee_plan_item_selling_mapping = []
            is_store = True if instance.standard_fee.fee_type.codename == STORE_CODENAME else False
            is_custom_fee_type = True if instance.standard_fee.fee_type.codename == CUSTOM_CODENAME else False
            #if you adding any code add in not data_list section also for store
            if instance.standard_fee.student_group:
                special_fee_plan.append('student_group')
            if instance.standard_fee.gender:
                special_fee_plan.append('gender')
            if instance.standard_fee.is_new_student != None:
                special_fee_plan.append('is_new_student')
            if not special_fee_plan:
                pass
            elif 'student_group'in special_fee_plan and 'gender' in special_fee_plan and 'is_new_student' in special_fee_plan:
                if instance.standard_fee.student_group.id != student_details[fee['student']]['student_group_id'] or instance.standard_fee.gender != student_details[fee['student']]['gender'] or instance.standard_fee.is_new_student!=student_details[fee['student']]['is_new_student']:
                   raise exceptions.ValidationError('not a valid fee plan') 
            elif 'student_group' in special_fee_plan and 'gender' in special_fee_plan and 'is_new_student' not in special_fee_plan:
                if instance.standard_fee.student_group:
                    if instance.standard_fee.student_group.id != student_details[fee['student']]['student_group_id'] or instance.standard_fee.gender != student_details[fee['student']]['gender']:
                        raise exceptions.ValidationError('not a valid fee plan')
            elif 'student_group' in special_fee_plan and 'is_new_student' in special_fee_plan and 'gender' not in special_fee_plan:
                if instance.standard_fee.student_group.id != student_details[fee['student']]['student_group_id'] or instance.standard_fee.is_new_student != student_details[fee['student']]['is_new_student']:
                   raise exceptions.ValidationError('not a valid fee plan')
            elif 'gender' in special_fee_plan and 'is_new_student' in special_fee_plan and 'student_group' not in special_fee_plan:
                if instance.standard_fee.gender != student_details[fee['student']]['gender'] or instance.standard_fee.is_new_student != student_details[fee['student']]['is_new_student']:
                   raise exceptions.ValidationError('not a valid fee plan')
            elif 'gender' in special_fee_plan and 'gender' not in special_fee_plan and 'student_group' not in special_fee_plan:
                if instance.standard_fee.gender != student_details[fee['student']]['gender']:
                   raise exceptions.ValidationError('not a valid fee plan')
            elif 'student_group' in special_fee_plan and 'gender' not in special_fee_plan and 'is_new_student' not in special_fee_plan:
                if instance.standard_fee.student_group.id != student_details[fee['student']]['student_group_id']:
                   raise exceptions.ValidationError('not a valid fee plan')
            elif 'is_new_student' in special_fee_plan and 'gender' not in special_fee_plan and 'student_group' not in special_fee_plan:
                if instance.standard_fee.is_new_student != student_details[fee['student']]['is_new_student']:
                   raise exceptions.ValidationError('not a valid fee plan')
            if 'fee_plan_item_selling_mapping' in data and data['fee_plan_item_selling_mapping']:
                if instance.id in data['fee_plan_item_selling_mapping']:
                    fee_plan_item_selling_mapping = data['fee_plan_item_selling_mapping'][instance.id]
                elif str(instance.id) in data['fee_plan_item_selling_mapping']:
                    fee_plan_item_selling_mapping = data['fee_plan_item_selling_mapping'][str(instance.id)]
            if is_store and len(fee_plan_item_selling_mapping)>0:
                add_or_remove_student_store_mapping(self, fee_plan_item_selling_mapping, student_ids)
            if is_custom_fee_type:
                if is_student_wise_feature_enable:
                    fee['amount'] = data['student_custom_fee_type_mapping'][str(fee['student'])][str(fee['fee_plan'])]['amount']
                else:
                    fee['amount'] = data['custom_fee_type_mapping'][str(fee['fee_plan'])]['amount']
            if data['feature_status'] in [1, 3]:
                key = str(fee['student']) + '_' + str(fee['fee_plan'])
                if key in fee_plan_mapping:
                    fee['id'] = fee_plan_mapping[key]['id']
                if 'id' in fee and fee['id']:
                    temp_instance = FeeplanStudentFeature.objects.get(id=fee['id'])
                    fee_plan_ser = FeeplanStudentFeatureSerializer(instance=temp_instance, data=fee)
                else:
                    fee_plan_ser = FeeplanStudentFeatureSerializer(data=fee)
                fee_plan_ser.is_valid(raise_exception=True)
                fee_plan_ser.save()
                response['Reason'] = 'Data added Successfully!'
            elif data['feature_status'] == 2:
                FeeplanStudentFeature.objects.filter(
                    student=fee['student'], fee_plan=fee['fee_plan']
                ).delete()
                response['Reason'] = 'Data deleted Successfully!'
        if data['feature_status'] == 3 and deleted_list:
            for fee in deleted_list:
                FeeplanStudentFeature.objects.filter(
                    student=fee['student'], fee_plan=fee['fee_plan']
                ).delete()
            response['Reason'] = 'Data updated Successfully!'
    if not data_list and deleted_list:
        for fee in deleted_list:
            instance = fee_plan.get(id=fee['fee_plan'])
            if 'fee_plan_item_selling_mapping' in data and data['fee_plan_item_selling_mapping']:
                if instance.id in data['fee_plan_item_selling_mapping']:
                    fee_plan_item_selling_mapping = data['fee_plan_item_selling_mapping'][instance.id]
                elif str(instance.id) in data['fee_plan_item_selling_mapping']:
                    fee_plan_item_selling_mapping = data['fee_plan_item_selling_mapping'][str(instance.id)]
            is_store = True if instance.standard_fee.fee_type.codename == STORE_CODENAME else False
            if is_store and len(fee_plan_item_selling_mapping)>0:
                add_or_remove_student_store_mapping(self, fee_plan_item_selling_mapping, student_ids)
    if data_list or deleted_list:
        SharedService.custom_thread(add_bulk_feature_notification, data, fee_plan, student_id)
    return response

def add_bulk_feature(self, data, *args, **kwargs):
    if len(data['feature']) != len(set(data['feature'])):
        raise exceptions.ValidationError('Duplicate terms found.')
    if len(data['student_feature']) != len(set(data['student_feature'])):
        raise exceptions.ValidationError('Duplicate student(s) found!')
    if 'deleted_feature' not in data:
        data['deleted_feature'] = []
    data_list = []
    deleted_feature_list = []
    for fee in data['feature']:
        for student in data['student_feature']:
            data_list.append({
                'student': student, 'fee_plan': fee
            })
    for fee in data['deleted_feature']:
        for student in data['student_feature']:
            deleted_feature_list.append({
                'student': student, 'fee_plan': fee
            })
    return validate_and_save_feature(self, data, data_list, deleted_feature_list)


def add_bulk_feature_notification(data, feePlan, student_id):
    feature = feePlan.first()
    academic_year = f'{feature.standard_fee.academic_year.start_date.year}-{feature.standard_fee.academic_year.end_date.year}'
    users = User.objects.filter(student__in=student_id)
    notification_obj = NotificationBodyTemplate('feature_create')
    customized_data = []
    for student_obj in student_id:
        temp = {
            'available_features' : '',
            'status': '',
            'student_name': student_obj.first_name,
            'academic_year': academic_year
        }
        user = {}
        feature_detail = ''
        user_id = users.filter(student=student_obj.pk).first().id
        for index, fee in enumerate(data['feature'], start=1):
            instance = feePlan.get(id=fee)
            feature_detail += f'{index}. {instance.standard_fee.fee_type.name} {instance.terms} ({instance.term_start_date.strftime("%d/%m/%Y")} to {instance.term_start_date.strftime("%d/%m/%Y")})<br/>'
        if data['feature_status'] in [1, 3]:
            temp['available_features'] += feature_detail
            temp['status'] = 'enabled'
        elif data['feature_status'] == 2 and (not data['deleted_feature']):
            temp['available_features'] += feature_detail
            temp['status'] = 'disabled'
        if data['feature_status'] == 3 and data['deleted_feature']:
            delete_detail = ''
            for index, fee in enumerate(data['deleted_feature'], start=1):
                instance = feePlan.get(id=fee)
                delete_detail += f'{index}. {instance.standard_fee.fee_type.name} {instance.terms} ({instance.term_start_date.strftime("%d/%m/%Y")} to {instance.term_start_date.strftime("%d/%m/%Y")})<br/>'
            temp['available_features'] += delete_detail
            temp['status'] = 'disabled'
        subject = f'Fee/Feature details | {academic_year}'
        if student_obj.mobile_num:
            body_sms = notification_obj.select_template('sms', temp)
            customized_data.append(
                {
                    'mobile_number': student_obj.mobile_num, 'sms_body': body_sms,'sms_notification': 1, 'user_id': user_id
                }
            )
        if student_obj.email:
            body_email = notification_obj.select_template('email', temp)
            user.update(
                {'email': student_obj.email, 'email_subject': subject, 'user_id': user_id, 'email_notification':1})
            user['email_body'] = body_email
            customized_data.append(user)
        body_push = notification_obj.select_template('push', temp)
        temp_data = {
            'push_subject': subject, 'push_body': body_push, 'push_notification': 1, 'user_id': user_id, 'extra_params': {}
        }
        customized_data.append(temp_data)
    if customized_data:
        return send_notification('feature_create', customizedData=customized_data)

def get_feature(self):
    response = {}
    student_ids = self.request.GET.get('student')
    queryset = self.filter_queryset(self.get_queryset())
    student_type = self.request.GET.get('student_type')
    new_list=[]
    if student_type:
        queryset = queryset.filter(student_type__startswith=student_type).distinct()
    if student_ids:
        response['data'] = self.get_serializer(queryset, many=True, context={'student_ids': student_ids.split(',')}).data
    else:
        response['data'] = self.get_serializer(queryset, many=True).data
    student_store_data = []
    store_student_mapping = {}
    if student_ids:
        standard = self.request.GET.get('standard')
        student_ids = student_ids.split(',')
        student_store_data = StudentStoreMapping.objects.filter(student__in=student_ids).values('id', 'student', 'fee_standard_mapping_item_selling_id', 'issued_quantity', 'quantity')
        student_store_ids = [s['id'] for s in student_store_data]
        student_store_mapping_log = StudentStoreMappingLog.objects.filter(
            student_store_mapping__in=student_store_ids
        ).values()
        student_store_log_mapping = {}
        for s in student_store_mapping_log:
            if s['student_store_mapping_id'] not in student_store_log_mapping:
                student_store_log_mapping[s['student_store_mapping_id']] = []
            student_store_log_mapping[s['student_store_mapping_id']].append(s)
        for student_store in student_store_data:
            if student_store['id'] in student_store_log_mapping:
                student_store['student_store_log_data'] = student_store_log_mapping[student_store['id']]
            if student_store['fee_standard_mapping_item_selling_id'] not in store_student_mapping:
                store_student_mapping[student_store['fee_standard_mapping_item_selling_id']] = student_store
        academic_year = self.request.GET.get('academic_year')
        payment_detail = PaymentDetail.objects.filter(
                            fee_plan__standard_fee__academic_year=academic_year,
                            fee_plan__standard_fee__standard=standard,
                            fee_collection__is_active=True,
                            fee_collection__student__in=student_ids).values(
                                'fee_plan', 'amount_paid'
                            )
        payment_detail_data = {}
        for row_data in payment_detail:
            if row_data['fee_plan'] not in payment_detail_data:
                payment_detail_data[row_data['fee_plan']] = {'total_paid_amount': 0}
            payment_detail_data[row_data['fee_plan']]['total_paid_amount'] += row_data['amount_paid']
        if len(student_ids)==1:
            student_details = Student.objects.filter(id__in=student_ids).values('id','gender','is_new_student').first()
            student_standard_details = StudentStandardMapping.objects.filter(student__in=student_ids,standard=standard,academic_year=academic_year).values().first()
            for fees in response['data']:
                if not fees['student_group'] and not fees['gender'] and fees['is_new_student'] == None:
                    new_list.append(fees)
                elif fees['student_group'] and fees['gender'] and fees['is_new_student']!=None:
                    if fees['student_group']==student_standard_details['student_group_id'] and fees['gender'] == student_details['gender'] and fees['is_new_student']==student_standard_details['is_new_student']:
                        new_list.append(fees)
                elif fees['student_group'] and fees['gender'] and fees['is_new_student']==None:
                    if fees['student_group']==student_standard_details['student_group_id'] and fees['gender'] == student_details['gender']:
                        new_list.append(fees)
                elif fees['student_group'] and not fees['gender'] and fees['is_new_student']!=None:
                    if fees['student_group']==student_standard_details['student_group_id'] and fees['is_new_student'] == student_standard_details['is_new_student']:
                        new_list.append(fees)
                elif not fees['student_group'] and fees['gender'] and fees['is_new_student']!=None:
                    if fees['gender']==student_details['gender'] and fees['is_new_student'] == student_standard_details['is_new_student']:
                        new_list.append(fees)
                elif fees['student_group'] and not fees['gender'] and fees['is_new_student']==None:
                    if fees['student_group']==student_standard_details['student_group_id']:
                        new_list.append(fees)
                elif not fees['student_group'] and fees['gender'] and fees['is_new_student']==None:
                    if fees['gender']==student_details['gender']:
                        new_list.append(fees)
                elif not fees['student_group'] and not fees['gender'] and fees['is_new_student']!=None:
                    if fees['is_new_student']==student_standard_details['is_new_student']:
                        new_list.append(fees)
            response['data'] = new_list
        for fee in response['data']:
            if 'fee_standard_mapping_item_selling_price_fee_standard_mapping' in fee and fee['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
                for store_data in fee['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
                    store_data['is_enabled'] = True if store_data['id'] in store_student_mapping else False
                    store_data['assigned_quantity'] = store_student_mapping[store_data['id']]['quantity'] if store_data['id'] in store_student_mapping else 0
                    store_data['issued_quantity'] = store_student_mapping[store_data['id']]['issued_quantity'] if store_data['id'] in store_student_mapping else 0
                    store_data['studentstoremappinglog'] = store_student_mapping[store_data['id']]['student_store_log_data'] if store_data['id'] in store_student_mapping and 'student_store_log_data' in store_student_mapping[store_data['id']] else []
            for terms in fee['standard_fee']:
                terms['total_paid_amount'] = 0
                if terms['id'] in payment_detail_data:
                    terms['total_paid_amount'] = payment_detail_data[terms['id']]['total_paid_amount']
                terms['is_fee_paid'] = True if terms['id'] in payment_detail_data else False
    return response