from django.db.models import Q
from datetime import date

from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.institutes.models.institute import Institute
from apps.notification.services.notification_service import send_notification
from apps.shared.models.address import MapAddress
from apps.shared.services_shared.common import get_selected_template, get_teaching_staff_group_ids
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.staffs.serializers import (StaffAllDetailSerializer, StaffGetNameSerializer, StaffSerializer, NomineeDetailSerializer, AccountDetailSerializer, MentorStudentMappingSerializer,
                                     StaffAddressSerializer, StaffStandardMappingSerializer, StaffDocumentMappingSerializer,StaffBranchMappingSerializer,HODBranchMappingSerializer)
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User, ReportingGroupMapping
from apps.users.serializers import UserSerializer
from apps.classes.models.enrollment import Enrollment
from apps.classes.serializers import GetEnrollmentSerializer
from apps.shared.services import NotificationBodyTemplate, PDFService, SharedService, UploadTypeService, ConfigurationService, add_google_map_data
from apps.staffs.models.staff import Staff, StaffNomineeDetail, AccountDetail, StaffAddress, StaffDocumentMapping, StaffBranchMapping, HODBranchMapping, MentorStudentMapping, StaffStudentMeeting
from datetime import datetime, date, timedelta
from django.db import transaction
from rest_framework import exceptions
from apps.institutes.models import FinancialYear
from apps.payroll.models.payroll import SalaryEmployeePlan, SalaryEmployeeMonthPlan
from apps.users.services.user import soft_delete_user_login
from django.contrib.auth.models import Group
from apps.institutes.models import AcademicYear
from apps.staffs.models import StaffStandardMapping
from apps.users.encrypt_decrypt import decrypt_password
from apps.shared.services_shared.common import get_full_name
from apps.appointments.models.master import StaffAppointment
from django.utils import timezone
from apps.finance.models.feeCollection import AdmissionForm

TEACHING_STAFF_GROUP = [6]


def add_staff(self, data):
    if not data['users']['password']:
        raise exceptions.ValidationError('Password cannot be empty')
    validationResult = validate_all_details(self, data)
    with transaction.atomic(using=get_current_db_name()):
        serializer = StaffSerializer(data=data["staff"])
        serializer.is_valid(raise_exception=True)
        staffDetail = serializer.save()
        if staffDetail.id:
            if "staff_nominee" in validationResult['nonEmptyDict']:
                for value in data['staff_nominee']:
                    value.update({"staff": staffDetail.id})
                create_or_update_nominee_details(data['staff_nominee'], staffDetail.id)
            if "accounts" in validationResult['nonEmptyDict']:
                data['accounts']['staff'] = staffDetail.id
                create_staff_bankdetails(data['accounts'])
            if 'permanent_address' in validationResult['nonEmptyDict']:
                data['staff_address']['permanent_address']['staff'] = staffDetail.id
                create_or_update_staff_address(data['staff_address']['permanent_address'], 'P')
            if 'current_address' in validationResult['nonEmptyDict']:
                addressType = 'CP' if data['staff_address']['cp'] else 'C'
                data['staff_address']['current_address']['staff'] = staffDetail.id
                create_or_update_staff_address(data['staff_address']['current_address'], addressType)
            if 'document_list' in data['staff'] and data['staff']['document_list']:
                create_or_update_staff_document(staffDetail.id, data['staff']['document_list'])
            data['users']['staff'] = staffDetail.id
            self.queryset = User
            self.serializer_class = UserSerializer
            data['users']['mobile_num'] = data['staff']['mobile_num'] if 'mobile_num' in data['staff'] else None
            data['users']['email'] = data['staff']['email'] if 'email' in data['staff'] else None
            User.create_login_for_staff(self, data['users'])
            if data['staff']['profile_pic']:
                UploadTypeService.make_document_active(data['staff']['profile_pic'])
            if 'staff_standard_list' in data and data['staff_standard_list']:
                add_or_update_staff_standard_mapping(self, [{'standards': data['staff_standard_list'], 'staff': staffDetail.id}])
        else:
            raise exceptions.ValidationError('Something went wrong')
    SharedService.custom_thread(add_staff_notification, self, staffDetail, data['users'])
    return {'Reason': 'Staff and User Login Added'}

def create_or_update_staff_document(staff_id, document_list, deletable_document_list=[]):
    if deletable_document_list:
        StaffDocumentMapping.objects.filter(id__in=deletable_document_list).update(is_active=False)
    for data in document_list:
        data['staff'] = staff_id
        if 'id' in data and data['id']:
            serializer = StaffDocumentMappingSerializer(instance=StaffDocumentMapping.objects.get(id=data['id']),data=data)
        else:
            serializer = StaffDocumentMappingSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def add_staff_notification(self, staffDetail, users):
    user = User.objects.filter(id__in=[users['reporting_to'], staffDetail.pk]).values()
    userDetail = {u['id'] : u for u in user }
    notification_obj = NotificationBodyTemplate('staffalldetail_create')
    customized_data = []
    inst_obj=Institute.get_institute(self)
    temp = {
        'reporting_staff_name': userDetail[users["reporting_to"]]["first_name"] if 'first_name' in userDetail[users["reporting_to"]] else 'Super Admin',
        'staff_name': staffDetail.first_name,
        'username': staffDetail.users.username,
        'staff_app_android':'https://rb.gy/kgs9gz',
        'staff_app_ios':'https://rb.gy/fpvryn',
        'school_code':inst_obj.code,
        'password':decrypt_password(staffDetail.users.password_two),
        'school_name':inst_obj.name,
        'staff_obj':staffDetail
    }
    user_id = staffDetail.users.id
    if staffDetail.email:
        body_email = notification_obj.select_template('email', temp)
        customized_data.append(
            {'email': staffDetail.email, 'email_subject': None, 'user_id': user_id, 'email_body': body_email, 'email_notification':1}
        )
    if staffDetail.mobile_num:
        body_sms = notification_obj.select_template('sms', temp)
        customized_data.append(
            {'mobile_number': staffDetail.mobile_num, 'user_id': user_id, 'sms_body': body_sms, 'sms_notification': 1}
        )
        whatsapp_details = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp', temp)
        customized_data.append(
            {'mobile_number': staffDetail.mobile_num, 'user_id': user_id, 'whatsapp_body': whatsapp_details['whatsapp_template'], 'whatsapp_notification': 1,
             'whatsapp_template_id':whatsapp_details['whatsapp_template_id'],'whatsapp_field_value':whatsapp_details['field_values'],'whatsapp_contact_details':whatsapp_details['contact']}
        )
    if customized_data:
        send_notification('staffalldetail_create', customizedData=customized_data)

def update_staff_notification(self, staffDetail, users):
    user = User.objects.filter(id__in=[users['reporting_to'], staffDetail.pk]).values()
    userDetail = {u['id'] : u for u in user }
    notification_obj = NotificationBodyTemplate('staffalldetail_update')
    customized_data = []
    inst_obj=Institute.get_institute(self)
    temp = {
        'reporting_staff_name': userDetail[users["reporting_to"]]["first_name"] if 'first_name' in userDetail[users["reporting_to"]] else 'Super Admin',
        'staff_name': staffDetail.first_name,
        'staff_app_android':'https://rb.gy/kgs9gz',
        'staff_app_ios':'https://rb.gy/fpvryn',
        'school_code':inst_obj.code,
        'username':staffDetail.users.username,
        'password':decrypt_password(staffDetail.users.password_two),
        'school_name':inst_obj.name,
        'staff_obj':staffDetail
    }
    user_id = staffDetail.users.id
    if staffDetail.email:
        body_email = notification_obj.select_template('email', temp)
        customized_data.append(
            {'email': staffDetail.email, 'email_subject': None, 'user_id': user_id, 'email_body': body_email,'email_notification':1}
        )
    if staffDetail.mobile_num:
        body_sms = notification_obj.select_template('sms', temp)
        customized_data.append(
            {'mobile_number': staffDetail.mobile_num, 'user_id': user_id, 'sms_body': body_sms, 'sms_notification': 1}
        )
        whatsapp_details = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp', temp)
        customized_data.append(
            {'mobile_number': staffDetail.mobile_num, 'user_id': user_id, 'whatsapp_body': whatsapp_details['whatsapp_template'], 'whatsapp_notification': 1,
             'whatsapp_template_id':whatsapp_details['whatsapp_template_id'],'whatsapp_field_value':whatsapp_details['field_values'],'whatsapp_contact_details':whatsapp_details['contact']}
        )
    if customized_data:
        send_notification('staffalldetail_update', customizedData=customized_data)

def update_staff(self, data, **kwargs):
    from apps.users.services.auth import update_mobile_and_email_signup
    response = {'Reason': 'Staff updated successfully'}
    instance = self.get_object()
    existingMobile = instance.mobile_num
    existingEmail = instance.email
    with transaction.atomic(using=get_current_db_name()):
        if 'permanent_address' in data['staff_address']:
            permanentAddressId = data['staff_address']['permanent_address'].pop('id',
                                                                                None)  # update validating without id
        else:
            permanentAddressId = None
        validationResult = validate_all_details(self, data)
        serializer = StaffSerializer(instance=instance, data=data['staff'], partial=True)
        serializer.is_valid(raise_exception=True)
        staffDetail = serializer.save()
        if staffDetail.id:
            if 'nominee_deletable_ids' in data and data['nominee_deletable_ids']:
                StaffNomineeDetail.objects.filter(id__in=data['nominee_deletable_ids']).update(is_active=False)
            if 'bank_deletable_ids' in data and data['bank_deletable_ids']:
                AccountDetail.objects.filter(id__in=data['bank_deletable_ids']).update(is_active=False)
            if 'staff_nominee' in validationResult['nonEmptyDict']:
                for value in data['staff_nominee']:
                    value.update({"staff": staffDetail.id})
                create_or_update_nominee_details(data['staff_nominee'], staffDetail.id)
            if "accounts" in validationResult['nonEmptyDict']:
                data['accounts']['staff'] = staffDetail.id
                create_staff_bankdetails(data['accounts'])
            if 'permanent_address' in validationResult['nonEmptyDict']:
                if permanentAddressId:
                    data['staff_address']['permanent_address']['id'] = permanentAddressId
                    staff_address_data = StaffAddress.objects.get(id=permanentAddressId)
                    if 'map_address_data' in data['staff_address']['permanent_address']:
                        data['staff_address']['permanent_address']['map_address_data']['id'] = staff_address_data.map_address_id
                data['staff_address']['permanent_address']['staff'] = staffDetail.id
                create_or_update_staff_address(data['staff_address']['permanent_address'], 'P')
            elif permanentAddressId:
                deletable_data = StaffAddress.objects.filter(id=permanentAddressId)
                map_address_deletable_ids = list(deletable_data.values_list('map_address', flat=True))
                if map_address_deletable_ids:
                    MapAddress.objects.filter(id__in=map_address_deletable_ids).delete()
                deletable_data.delete()
            if 'current_address' in validationResult['nonEmptyDict']:
                address_type = 'CP' if data['staff_address']['cp'] else 'C'
                data['staff_address']['current_address']['staff'] = staffDetail.id
                if 'id' in data['staff_address']['current_address']:
                    staff_address_data = StaffAddress.objects.get(id=data['staff_address']['current_address']['id'])
                if 'map_address_data' in data['staff_address']['current_address']:
                    data['staff_address']['current_address']['map_address_data']['id'] = staff_address_data.map_address_id
                create_or_update_staff_address(data['staff_address']['current_address'], address_type)
            previous_group = Group.objects.get(user__id=data['users']['id']).pk
            if data['staff']['profile_pic']:
                UploadTypeService.make_document_active(data['staff']['profile_pic'])
            if 'document_list' in data and data['document_list']:
                deletable_document_list = []
                if 'deletable_document_list' in data and data['deletable_document_list']:
                    deletable_document_list = data['deletable_document_list']
                create_or_update_staff_document(staffDetail.id, data['document_list'], deletable_document_list)
            if (existingMobile and str(existingMobile) != str(data['staff']['mobile_num'])) or \
                (existingEmail and str(existingEmail) != str(data['staff']['email'])):
                update_mobile_and_email_signup(self, instance.users.id, data['staff']['mobile_num'], data['staff']['email'], True)
            if previous_group not in data['users']['groups']:
                SharedService.custom_thread(update_staff_notification, self, staffDetail, data['users'])
            if 'staff_standard_list' in data and data['staff_standard_list']:
                add_or_update_staff_standard_mapping(self, [{'standards': data['staff_standard_list'], 'staff': staffDetail.id}])
            if data['users']:
                self.queryset = User.objects.all()
                self.kwargs['pk'] = data['users']['id']
                self.serializer_class = UserSerializer
                from apps.users.services.user_group import update_data
                update_data(self, data['users'], 'groups', **{'partial': True})
        else:
            raise exceptions.ValidationError('Not able to save the user')
    return response


def get_staff_list(self, many=True, extra_params={}):
    global financeYear, salaryEmployeePlan, salaryEmployeeMonthPlan
    salary_is_approved = extra_params['salary_is_approved'] if 'salary_is_approved' in extra_params else self.request.GET.get('salary_is_approved')
    salary_month = extra_params['salary_month'] if 'salary_month' in extra_params else self.request.GET.get('salary_month')
    salary_is_approved_status = extra_params['salary_is_approved_status'] if 'salary_is_approved_status' in extra_params else self.request.GET.get('salary_is_approved_status')
    salary_is_paid_status = extra_params['salary_is_paid_status'] if 'salary_is_paid_status' in extra_params else self.request.GET.get('salary_is_paid_status')
    salary_is_paid = extra_params['salary_is_paid'] if 'salary_is_paid' in extra_params else self.request.GET.get('salary_is_paid')
    group = extra_params['group'] if 'group' in extra_params else self.request.GET.get('group')
    group_type = extra_params['group_type'] if 'group_type' in extra_params else self.request.GET.get('group_type')
    employee_status = extra_params['employee_status'] if 'employee_status' in extra_params else self.request.GET.get('employee_status')
    is_active = None
    if 'is_active' in extra_params:
        is_active = bool(extra_params['is_active'])
    else:
        is_active_str = self.request.GET.get('is_active', 'true').lower()
        is_active = is_active_str == 'true'
    financial_year = extra_params['financial_year'] if 'financial_year' in extra_params else self.request.GET.get('financial_year', None)
    show_only_important_data = extra_params['show_only_important_data'] if 'show_only_important_data' in extra_params else False
    user_last_activity_date_range = extra_params['user_last_activity_date_range'] if 'user_last_activity_date_range' in extra_params else self.request.GET.get('user_last_activity_date_range')
    last_activity_active_users = extra_params['last_activity_active_users'] if 'last_activity_active_users' in extra_params else self.request.GET.get('last_activity_active_users')
    last_activity_inactive_users = extra_params['last_activity_inactive_users'] if 'last_activity_inactive_users' in extra_params else self.request.GET.get('last_activity_inactive_users')
    logged_in_users = extra_params['logged_in_users'] if 'logged_in_users' in extra_params else self.request.GET.get('logged_in_users')
    not_logged_in_users = extra_params['not_logged_in_users'] if 'not_logged_in_users' in extra_params else self.request.GET.get('not_logged_in_users')
    search_text = extra_params['search'] if 'search' in extra_params else self.request.GET.get('search')
    filter_query = {}
    exclude_query = {}
    ordering = self.request.GET.get('ordering', 'first_name')
    if employee_status:
        filter_query['employee_status'] = employee_status
    filter_query['is_active'] = is_active
    if financial_year:
        financeYear = FinancialYear.objects.get(id=financial_year)
        filter_query.update({'date_joined__lte': financeYear.end_date})
    if salary_month:
        last_day = SharedService.last_day_of_month(datetime.strptime(salary_month, "%Y-%m").date())
        filter_query.update({'date_joined__lte': last_day})
    if salary_is_approved:
        filter_query.update({'salary_employee_plan_staff__is_approved': salary_is_approved,
                             'salary_employee_plan_staff__from_date__gte': financeYear.start_date,
                             'salary_employee_plan_staff__to_date__lte': financeYear.end_date})
    if salary_is_paid:
        filter_query.update({'salary_employee_month_plan_staff__isnull': False})
    if group:
        filter_query['users__groups__in'] = group
    if group_type:
        filter_query['users__groups__in'] = [r.group for r in ReportingGroupMapping.objects.filter(group_type=group_type)]
    if user_last_activity_date_range:
        if last_activity_active_users:
            filter_query['users__last_activity__gte'] = user_last_activity_date_range
        elif last_activity_inactive_users:
            exclude_query['users__last_activity__gte'] = user_last_activity_date_range
    if logged_in_users:
        filter_query['users__last_login__isnull'] = False
    elif not_logged_in_users:
        filter_query['users__last_login__isnull'] = True
    if many:
        if search_text:
            search_filter = (
                Q(first_name__icontains=search_text) |
                Q(middle_name__icontains=search_text) |
                Q(last_name__icontains=search_text) |
                Q(mobile_num__icontains=search_text)
            )
            queryset = Staff.objects.filter(search_filter, **filter_query).exclude(**exclude_query).distinct().order_by(ordering)
        else:
            queryset = Staff.objects.filter(**filter_query).exclude(**exclude_query).distinct().order_by(ordering)
        if show_only_important_data:
            serializer = StaffGetNameSerializer(queryset, many=many)
        else:
            serializer = StaffSerializer(queryset, many=many)
    else:
        queryset = Staff.objects.get(id=self.kwargs['pk'])
        serializer = StaffAllDetailSerializer(queryset, many=many)
    response = {'data': serializer.data, 'staff_ids': []}
    if salary_is_approved_status:
        salaryEmployeePlan = {sal['staff']: sal for sal in SalaryEmployeePlan.objects.filter(is_approved=True, to_date__lte=financeYear.end_date,
                                                               from_date__gte=financeYear.start_date).values('staff')}
    if salary_is_paid_status and salary_month:
        salaryEmployeeMonthPlan = SalaryEmployeeMonthPlan.objects.filter(
            salary_month=datetime.strptime(salary_month, "%Y-%m").date())
    if many:
        if self.request.GET.get('pagination'):
            response['data'], response['count'], response['next_page'], response['previous_page'] = SharedService.custom_pagination(self, response['data'],
                                                                                    self.request.GET.get('limit'),
                                                                                    self.request.GET.get('pageno'))
        if not show_only_important_data:
            return_data = []
            for staff in response['data']:
                response['staff_ids'].append(staff['id'])
                is_salary_approved = False
                if staff.get('date_left'):
                    staff.update({'date_left_status': SharedService.date_to_obj(staff['date_left']) < date.today()})
                else:
                    staff.update({'date_left_status': False})
                if salary_is_approved_status:
                    staff.update({'salary_is_approved': True if staff['id'] in salaryEmployeePlan else False})
                    is_salary_approved = staff['salary_is_approved']
                # if not staff['is_active'] and not is_salary_approved:
                #     continue #if staff deleted and salary not planned yet we wont show
                if salary_is_paid_status and salary_month:
                    staff.update({'salary_is_paid': salaryEmployeeMonthPlan.filter(staff=staff['id']).exists()})
                user = User.objects.filter(staff=staff['id']).first()  # Fetch user associated with staff
                staff['username'] = user.username if user else None
                staff['barcode_number'] = user.barcode_number if user else None
                return_data.append(staff)
            response['data'] = return_data
        group_data={}
        reporting_data = ReportingGroupMapping.objects.all().values('group_type__name','group_type','group')
        for group in reporting_data:
            if group['group'] not in group_data:
                group_data[group['group']]= group
        for datas in response['data']:
            datas['group_type'] = group_data[datas['users']['groups'][0]['id']]['group_type']
            datas['group_type_name'] = group_data[datas['users']['groups'][0]['id']]['group_type__name']
    else:
        reporting_data = ReportingGroupMapping.objects.filter(group=response['data']['users']['groups'][0]['id']).values('group_type__name','group_type')
        response['data']['group_type'] = reporting_data[0]['group_type']
        response['data']['group_type_name'] = reporting_data[0]['group_type__name']
    return response

def download_staff_data(self, data):
    institute=Institute.get_institute(self)
    options={}
    options['title'] = 'Staff Details'
    options['description'] = 'Staff Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    for row_data in data:
        row_data['address'] = ''
        address_list = row_data.get('staff_address', [])
        if address_list:
            first_address_data = address_list[0]
            if first_address_data['map_address_data']:
                row_data['address'] = first_address_data['map_address_data']['address_one_map'] + first_address_data['map_address_data']['address_two_map']
            else:
                row_data['address'] = first_address_data['address']

    if institute.code == "vss":
        options['columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },
            {
                'column': 'Staff Name', 'required': False, 'schemacolumn': 'name'
            },
            {
                'column': 'Emp id', 'required': False, 'schemacolumn': 'employee_id'
            },
            {
                'column': 'Qualificiation', 'required': False, 'schemacolumn': 'qualification'
            },
            {
                'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
            },
            {
                'column': 'Blood Group', 'required': False, 'schemacolumn': 'blood_group'
            },
            {
                'column': 'Address', 'required': False, 'schemacolumn': 'address'
            }
        ]
    else:
        options['columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },
            {
                'column': 'Staff Name', 'required': False, 'schemacolumn': 'name'
            },
            {
                'column': 'Email', 'required': False, 'schemacolumn': 'email'
            },
            {
                'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
            },{
                'column': 'Dob', 'required': False, 'schemacolumn': 'dob'
            },
            {
                'column': 'Username', 'required': False, 'schemacolumn':'username'
            }
        ]
    return write_to_excel_new(self, options, {}, {})

def delete_staff_detail(self):
    # reportinUIds = User.getUserHierarchy(self, self.request.user.id)
    # userobj = User.objects.get(staff=self.kwargs['pk'])
    # if userobj.id in reportinUIds:
    return delete_staff(self)
    # else:
    #     raise exceptions.ValidationError('Not authorized to delete the user details')


def create_or_update_nominee_details(data, staffId, partial=False):
    for nominee_data in data:
        if 'id' in nominee_data and nominee_data['id']:
            instance = StaffNomineeDetail.objects.get(id=nominee_data['id'])
            serializer = NomineeDetailSerializer(instance=instance, data=nominee_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = NomineeDetailSerializer(data=nominee_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()


def create_staff_bankdetails(data, partial=True):
    instance = AccountDetail.objects.get(id=data['id']) if 'id' in data else None
    serializer = AccountDetailSerializer(data=data, instance=instance, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()


def create_or_update_staff_address(data, addressType='None', partial=True):
    if 'map_address_data' in data and data['map_address_data']:
        map_data = add_google_map_data(data['map_address_data'])
        data['map_address'] = map_data.id
        data['address'] = ""
        data['country'] = ""
        data['state'] = ""
        data['district'] = ""
        data['city'] = ""
        data['pincode'] = None
        if addressType:
            data['type'] = addressType
    else:
        data['map_address'] = None
        data['address'] = data['address'] if 'address' in data and data['address'] else ""
        data['country'] = data['country'] if 'country' in data and data['country'] else None
        data['state'] = data['state'] if 'state' in data and data['state'] else None
        data['district'] = data['district'] if 'district' in data and data['district'] else None
        data['city'] = data['city'] if 'city' in data and data['city'] else None
        data['pincode'] = data['pincode'] if 'pincode' in data and data['pincode'] else None
    if addressType:
        data['type'] = addressType
    instance = StaffAddress.objects.get(id=data['id']) if ('id' in data and data['id']) else None
    serializer = StaffAddressSerializer(data=data, instance=instance, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()


def validate_all_details(self, data):
    nonEmptyDict = []
    validate_user_details(self, data['users'])
    validate_staff_details(data['staff'])
    if SharedService.check_all_dictvalues_not_emp_in_list(data['staff_nominee']):
        validate_nominee_details(data['staff_nominee'])
        nonEmptyDict.append('staff_nominee')
    if SharedService.check_all_dictvalues_not_emp_or_none(data['accounts']):
        validate_bank_details(data['accounts'])
        nonEmptyDict.append('accounts')
    if 'cp' in data['staff_address'] and data['staff_address']['cp']:
        if SharedService.check_all_dictvalues_not_emp_or_none(data['staff_address']['current_address']):
            nonEmptyDict.append('current_address')
    elif 'cp' in data['staff_address'] and not data['staff_address']['cp'] and data['staff_address']['permanent_address']:
        if SharedService.check_all_dictvalues_not_emp_or_none(data['staff_address']['current_address']):
            nonEmptyDict.append('current_address')
        if SharedService.check_all_dictvalues_not_emp_or_none(data['staff_address']['permanent_address']):
            nonEmptyDict.append('permanent_address')
    else:
        if SharedService.check_all_dictvalues_not_emp_or_none(data['staff_address']['current_address']):
            nonEmptyDict.append('current_address')
    return {'nonEmptyDict': nonEmptyDict}


def validate_user_details(self, data):
    mandatoryFields = ['reporting_to']
    SharedService.check_mandatory_field_in_list(mandatoryFields, data)
    groupObj = ReportingGroupMapping.objects.get(group__in=data['groups'])
    reportingGroups = [int(x) for x in groupObj.reporting_group.split(",")]
    try:
        reportgUserGroupIds = User.objects.get(id=data['reporting_to']).groups.values_list('id', flat=True)
    except Exception as e:
        raise exceptions.ValidationError('Reporting user not exist')
    if not all(int(item) in reportingGroups for item in list(reportgUserGroupIds)):
        raise exceptions.ValidationError(f'Reporting to {data["reporting_to"]} is not in reporting group.')


def validate_staff_details(data):
    if (not data['employee_status'] or data[
        'employee_status'] == 'F'):  # fulltime setting frequency to 12months
        data['frequency'] = 'M'
        data['measure'] = 12
    elif (data['employee_status'] == 'P' or data['employee_status'] == 'C'):  # partime setting
        if (not data['frequency'] or not data['measure']):
            raise exceptions.ValidationError('frequency or measure cant be null')
    if (not data['salary'] or float(data['salary']) <= 0):
        raise exceptions.ValidationError('Salary should be greater than 0')
    if data['email']:
        SharedService.validate_email(data['email'])
    if data['mobile_num']:
        SharedService.validate_india_mobile_number(data['mobile_num'])
    if data['aadhar_num']:
        exclude_filter = {}
        if 'id' in data and data['id']:
            exclude_filter = {'id': data['id']}
        if Staff.objects.filter(is_active=True, aadhar_num=data['aadhar_num']).exclude(**exclude_filter):
            raise exceptions.ValidationError('Duplicate Aadhar card number found')
    validate_joining_details(data)


def validate_joining_details(data):
    dateJoined = data['date_joined']
    dateLeft = data['date_left']
    if not dateJoined:
        raise exceptions.ValidationError('Joining date should not be empty')
    try:
        datetime.strptime(dateJoined, "%Y-%m-%d")
    except:
        raise exceptions.ValidationError('Invalid date format')
    if not dateLeft:
        data['date_left'] = None
    else:
        try:
            datetime.strptime(dateLeft, "%Y-%m-%d")
        except:
            raise exceptions.ValidationError('Invalid date format')
        if (dateJoined > dateLeft):
            raise exceptions.ValidationError('Joining date cannot be greater than date left')


def validate_nominee_details(data):
    duplicateData = {}
    todayDate = date.today()
    for nomineeData in data:
        if 'mobile_num' in nomineeData and nomineeData['mobile_num']:
            SharedService.validate_india_mobile_number(nomineeData['mobile_num'])
        if nomineeData['dob']:
            try:
                datetime.strptime(nomineeData['dob'], "%Y-%m-%d")
            except Exception as e:
                raise exceptions.ValidationError('dob - Invalid date format')
            if nomineeData['dob'] > todayDate.strftime("%Y-%m-%d"):
                raise exceptions.ValidationError('Nominee DOB is greater than today"s Date')
        else:
            nomineeData['dob'] = None
        if nomineeData['dob'] in duplicateData:
            if nomineeData['name'] in duplicateData[nomineeData['dob']]:
                raise exceptions.ValidationError(f"Duplicate values Found for ${nomineeData['name']}")
            else:
                duplicateData[nomineeData['dob']].append(nomineeData['name'])
        else:
            duplicateData[nomineeData['dob']] = []
            duplicateData[nomineeData['dob']].append(nomineeData['name'])


def validate_bank_details(data):
    mandatoryFieldsCheck = ['name', 'bank_name', 'branch_name', 'account_num']
    for key, bankData in data.items():
        if key in mandatoryFieldsCheck and (not (bankData is None) and str(bankData).strip() == ""):
            raise exceptions.ValidationError(f'{mandatoryFieldsCheck} all this fields are mandatory')
        if key == 'account_num':
            SharedService.validate_bank_account_num(bankData)
        if key == 'mobile_num' and bankData:
            SharedService.validate_india_mobile_number(bankData)
        if key == 'pan_num' and bankData:
            SharedService.validate_pan_num(bankData)
        if key == 'pf_num' and bankData:
            SharedService.validate_pfnum(bankData)


def delete_staff(self):
    from apps.users.services.auth import expire_all_token_for_user
    with transaction.atomic(using=get_current_db_name()):
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = soft_delete_user_login(self, queryset.first().id)
        expire_all_token_for_user(queryset.first().id)
        if queryset.first().is_active:
            queryset.update(is_active=False, date_left=datetime.today().strftime('%Y-%m-%d'))
        return response


def get_staff_for_academic_year(self, academicYear, groupId=None):
    if not groupId:
        groupId = get_teaching_staff_group_ids(self)
    try:
        academicData = AcademicYear.objects.get(id=academicYear)
    except:
        return []
    return Staff.objects.filter(date_joined__lte=academicData.end_date,
                                users__groups__in=groupId, is_active=True).values_list('id', flat=True)


def add_or_update_staff_standard_mapping(self, data):
    duplicate_staff_id = {}
    post_data = []
    for row_data in data:
        standards_list = set(row_data['standards'])
        for standard_id in standards_list:
            post_data.append(
                {'standard': standard_id, 'staff':row_data['staff']}
            )
        if row_data['staff'] in duplicate_staff_id:
            raise exceptions.ValidationError('Duplicate Staff found')
        duplicate_staff_id[row_data['staff']] = ''
    StaffStandardMapping.objects.filter(staff__in=duplicate_staff_id.keys()).delete()
    self.serializer_class = StaffStandardMappingSerializer
    response = SharedService.add_data(self, post_data)
    return response

def delete_department(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(dept_vehicle__is_active=True):
        raise exceptions.ValidationError('Cannot delete the department. Vehicle(s) are mapped under the dept.')
    response = SharedService.soft_delete_data(self)
    return response

def generate_id_cards_for_staff(self, data):
    try:
        staff_ids = data['staff_ids']
        is_all_staff = data['is_all_staff'] if 'is_all_staff' in data else False
        if not staff_ids and not is_all_staff:
            raise exceptions.ValidationError('Invalid staff and student data')
        filter_query = {'is_active': True}
        if staff_ids:
            filter_query['id__in'] = staff_ids
        queryset = Staff.objects.filter(**filter_query)
        serializer = StaffAllDetailSerializer(queryset, many=True)
        staff_data = serializer.data
        for staff in staff_data:
            staff['dob_changed_format'] = datetime.strptime(staff['dob'], "%Y-%m-%d").strftime('%d-%m-%Y')
            if staff['date_joined']:
                staff['doj_changed_format'] = datetime.strptime(staff['date_joined'], "%Y-%m-%d").strftime('%d-%m-%Y')  
            
        institute_data = Institute.get_institute(self)
        selected_templates, number_of_copies = get_selected_template(self, 'staffidcards', 'pdf', 'default_staff_id_card.html')
        path = 'staff_id_cards/'+selected_templates
        if self.request.GET.get('long_running_process'):
            response = PDFService.return_pdf_path(self, {'data': staff_data, 'institute': institute_data}, 'id_card', path, True)
            url = UploadTypeService.upload_local_file(response, path='idcard_pdfs')
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            response = PDFService.id_card(self, {'data': staff_data, 'institute': institute_data}, 'id_card', path)
            return response
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': e.args[:250]})
        else:
            raise e
    
def add_staff_group(self,data):
    dict_for_dup_check = {}
    hod_datatosave = []
    staff_datatosave = []
    for staff in data['staff_list']:
        staff_id = staff.get("staff_id")
        branch_id = data.get("department_id")
        from_date = staff.get("from_date")
        to_date = staff.get("to_date")
        key = f"{branch_id}_{staff_id}_{from_date}"
        if key in dict_for_dup_check:
            raise exceptions.ValidationError(
                f"Duplicate mapping for staff {staff_id} on {from_date}"
            )
        dict_for_dup_check[key] = staff
        if staff.get('is_hod'):
            qs = HODBranchMapping.objects.filter(
            staff=staff_id,
            branch=branch_id,
            is_active=True,
            )
            if staff.get('from_date_hod'):
                overlap_filter = Q(from_date__lte=to_date or staff.get('from_date_hod') ) & Q(to_date__gte=staff.get('from_date_hod'))
                if qs.filter(overlap_filter).exists():
                    raise exceptions.ValidationError(
                        f"Date conflict for staff {staff_id} in branch {branch_id}"
                    )
            if qs.exists():
                if not from_date:
                    raise exceptions.ValidationError(
                        f"Staff {staff_id} already has mapping, new one must have from_date"
                    )
                last_entry = qs.order_by("-from_date").first()
                if last_entry and not last_entry.to_date:
                    last_entry.to_date = timezone.now().date()
                    last_entry.save()
                    # raise exceptions.ValidationError(
                    #     f"Previous mapping of staff {staff_id} is open-ended, "
                    #     "please close it with a to_date before adding a new one"
                    # )
            temp_hod_datatosave = {
                'staff':staff_id,
                'branch':branch_id,
            }
            if staff.get('from_date_hod'):
                temp_hod_datatosave['from_date'] = staff.get('from_date_hod')
            if to_date:
                temp_hod_datatosave['to_date'] = to_date
            hod_datatosave.append(temp_hod_datatosave)
        else:
            qs = StaffBranchMapping.objects.filter(
                staff=staff_id,
                branch=branch_id,
                is_active=True,
            )
            if from_date:
                overlap_filter = Q(from_date__lte=to_date or from_date) & Q(to_date__gte = from_date)
                if qs.filter(overlap_filter).exists():
                    raise exceptions.ValidationError(
                        f"Date conflict for staff {staff_id} in branch {branch_id}"
                    )
            if qs.exists():
                if not from_date:
                    raise exceptions.ValidationError(
                        f"Staff {staff_id} already has mapping, new one must have from_date"
                    )
                last_entry = qs.order_by("-from_date").first()
                if last_entry and not last_entry.to_date:
                    last_entry.to_date = timezone.now().date()
                    last_entry.save()
                    # raise exceptions.ValidationError(
                    #     f"Previous mapping of staff {staff_id} is open-ended, "
                    #     "please close it with a to_date before adding a new one"
                    # )
            temp_staff_datatosave = {
                'staff':staff_id,
                'branch':branch_id,
            }
            if from_date:
                temp_staff_datatosave['from_date'] = from_date
            if to_date:
                temp_staff_datatosave['to_date'] = to_date
            staff_datatosave.append(temp_staff_datatosave)
    with transaction.atomic(using=get_current_db_name()):
        serializer = StaffBranchMappingSerializer(data=staff_datatosave,many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        hodserializer = HODBranchMappingSerializer(data=hod_datatosave,many=True)
        hodserializer.is_valid(raise_exception=True)
        hodserializer.save()
        serializer = StaffBranchMappingSerializer(data=hod_datatosave,many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def read_staff_group_mapping(self):
    is_group_mapped_staff = self.request.GET.get('is_group_mapped_staff')
    group_id = self.request.GET.get('group_id')
    branch_id = self.request.GET.get('branch')
    staff_id = self.request.GET.get('staff_id')
    is_group_mapped_staff= int(is_group_mapped_staff)
    if staff_id:
        staff_id = int(staff_id)
    filter_query = {
        'is_active':True,
    }
    if group_id:
        filter_query['users__groups__in'] = group_id.split(',')
    if staff_id:
        filter_query['id'] = staff_id
    staff_dict={}
    staff_data_obj = Staff.objects.filter(**filter_query)
    staff_data = StaffSerializer(staff_data_obj,many=True).data
    hod_filter={
        'is_active':True,
    }
    if staff_id:
        hod_filter['staff_id'] = staff_id
    if branch_id:
        hod_filter['branch_id'] = branch_id
    staff_filter={
        'is_active':True,
    }
    if staff_id:
        staff_filter['staff_id'] = staff_id  
    if branch_id:
        staff_filter['branch_id'] = branch_id
    hod_qs = HODBranchMapping.objects.filter(**hod_filter)
    hod_qs = hod_qs.filter(Q(to_date__gte=datetime.now().date()) | Q(to_date__isnull=True))
    hod_data = hod_qs.values('staff_id','from_date')
    hod_dict={}
    for hod in hod_data:
        if hod['staff_id'] not in hod_dict: 
            hod_dict[hod['staff_id']]={}
        hod_dict[hod['staff_id']]['from_date'] = hod['from_date']
    for staff in staff_data:
        staff_dict[int(staff['id'])] = staff
    response={}
    staff_group_list = []
    staff_qs = StaffBranchMapping.objects.filter(**staff_filter)
    staff_qs = staff_qs.filter(Q(to_date__gte=datetime.now().date()) | Q(to_date__isnull=True))
    staff_group_mapping = staff_qs.values('staff_id','id','from_date','branch','branch__name')
    for staff_group in staff_group_mapping:
        staff_group_list.append(staff_group['staff_id'])
        if is_group_mapped_staff:
            if staff_group['staff_id'] not in response:
                response[staff_group['staff_id']] = {}
            response[staff_group['staff_id']] = staff_group
            if staff_group['staff_id'] in hod_dict:
                response[staff_group['staff_id']]['is_hod'] = True
                response[staff_group['staff_id']]['hod_from_date'] = hod_dict[staff_group['staff_id']]['from_date']
            else:
                response[staff_group['staff_id']]['is_hod'] = False
                response[staff_group['staff_id']]['hod_from_date'] = None
            if staff_group['staff_id'] in staff_dict:
                response[staff_group['staff_id']].update(staff_dict[staff_group['staff_id']])
    if not is_group_mapped_staff:
        for staff in staff_data:
            if staff['id'] not in staff_group_list:
                if staff['id'] not in response:
                    response[staff['id']] = staff_dict[staff['id']]
                response[staff['id']].update(staff_dict[staff['id']])
    return response.values()

def update_staff_group(self,staff):
    dict_for_dup_check={}
    hod_datatosave = []
    staff_datatosave = []
    staff_id = staff.get("staff_id")
    branch_id = staff.get("department_id")
    from_date = staff.get("from_date")
    to_date = staff.get("to_date")
    from_date_hod = staff.get('from_date_hod')
    key = f"{branch_id}_{staff_id}_{from_date}"
    if key in dict_for_dup_check:
        raise exceptions.ValidationError(
            f"Duplicate mapping for staff {staff_id} on {from_date}"
        )
    dict_for_dup_check[key] = staff
    if staff.get('is_hod'):
        qs = HODBranchMapping.objects.filter(
        staff=staff_id,
        branch=branch_id,
        is_active=True,
        )
        if qs.exists():
            if not from_date_hod:
                raise exceptions.ValidationError(
                    f"Staff {staff_id} already has mapping, new one must have from_date"
                )
            last_entry = qs.order_by("-from_date").first()
            if last_entry and not last_entry.to_date:
                last_entry.to_date=datetime.now() - timedelta(days=1)
                last_entry.save()
        if from_date_hod:
            overlap_filter = (
                        Q(from_date__lte=from_date) &   # old record started before or on new date
                        Q(to_date__gte=from_date)       # old record ends after or on new date
                    )
            if qs.filter(overlap_filter).exists():
                raise exceptions.ValidationError(
                    f"Date conflict for staff {staff_id} in branch {branch_id}"
                )
        temp_hod_datatosave = {
            'staff':staff_id,
            'branch':branch_id,
        }
        if from_date:
            temp_hod_datatosave['from_date'] = from_date
        if to_date:
            temp_hod_datatosave['to_date'] = to_date
        hod_datatosave.append(temp_hod_datatosave)
    else:
        qs = StaffBranchMapping.objects.filter(
            staff=staff_id,
            branch=branch_id,
            is_active=True,
        )
        if qs.exists():
            if not from_date:
                raise exceptions.ValidationError(
                    f"Staff {staff_id} already has mapping, new one must have from_date"
                )
            last_entry = qs.order_by("-from_date").first()
            if last_entry and not last_entry.to_date:
                last_entry.to_date=datetime.now() - timedelta(days=1)
                last_entry.save()
        if from_date:
            overlap_filter = (
                Q(from_date__lte=from_date) &   # old record started before or on new date
                Q(to_date__gte=from_date)       # old record ends after or on new date
                )
            if qs.filter(overlap_filter).exists():
                raise exceptions.ValidationError(
                    f"Date conflict for staff {staff_id} in branch {branch_id}"
                )
        temp_staff_datatosave = {
            'staff':staff_id,
            'branch':branch_id,
        }
        if from_date:
            temp_staff_datatosave['from_date'] = from_date
        if to_date:
            temp_staff_datatosave['to_date'] = to_date
        staff_datatosave.append(temp_staff_datatosave)
    with transaction.atomic(using=get_current_db_name()):
        serializer = StaffBranchMappingSerializer(data=staff_datatosave,many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        hodserializer = HODBranchMappingSerializer(data=hod_datatosave,many=True)
        hodserializer.is_valid(raise_exception=True)
        hodserializer.save()
        serializer = StaffBranchMappingSerializer(data=hod_datatosave,many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def add_mentor_student(self,data):
    dict_for_dup_check = {}
    student_datatosave = []
    for student in data['student_list']:
        student_id = student
        staff_id = data.get("staff_id")
        if data.get('from_date'):
            from_date = data.get('from_date')
        else:
            from_date = datetime.now().date()
        key = f"{staff_id}_{student_id}_{from_date}"
        if key in dict_for_dup_check:
            raise exceptions.ValidationError(
                f"Duplicate mapping for student {student_id} on {from_date}"
            )
        dict_for_dup_check[key] = student
        qs = MentorStudentMapping.objects.filter(
            student_id=student_id,
            is_active=True,
        )
        if from_date:
            overlap_filter = Q(to_date__gte = from_date) | Q(from_date__lte=from_date)
            if qs.filter(overlap_filter).exists():
                raise exceptions.ValidationError(
                    f"Date conflict for student {student_id}"
                )
        if qs.exists():
            if not from_date:
                raise exceptions.ValidationError(
                    f"Student {student_id} already has mapping, new one must have from_date"
                )
            last_entry = qs.order_by("-from_date").first()
            if last_entry and not last_entry.to_date:
                last_entry.to_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        temp_student_datatosave = {
            'student':student_id,
            'staff':staff_id,
        }
        if from_date:
            temp_student_datatosave['from_date'] = from_date
        student_datatosave.append(temp_student_datatosave)
    with transaction.atomic(using=get_current_db_name()):
        serializer = MentorStudentMappingSerializer(data=student_datatosave,many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return {'data':"data saved successfully","data_list":serializer.data}

def read_mentor_student_mapping(self):
    get_mentors_list = self.request.GET.get('get_mentors_list')
    student_list=[]
    if get_mentors_list:
        user_id = self.request.user.id
        staff_id = self.request.user.staff.id
        today = timezone.now().date()
        hod = HODBranchMapping.objects.filter(
            staff_id=staff_id,
            from_date__lte=today,
            is_active=True
        ).filter(
            Q(to_date__gte=today) | Q(to_date__isnull=True)
        ).values().first()
        staff_list = StaffBranchMapping.objects.filter(branch=hod['branch_id']).values_list('staff_id',flat=True)
        queryset = Staff.objects.filter(id__in = staff_list)
        serializer = StaffAllDetailSerializer(queryset, many=True)
        staff_data = serializer.data
        return staff_data
    is_mapped_mentor_student = self.request.GET.get('is_mapped_mentor_student')
    academic_year = self.request.GET.get('academic_year_id')
    standard_section = self.request.GET.get('standard_section_id')
    standard = self.request.GET.get('standard_id')
    section = self.request.GET.get('section_id')
    staff_id = self.request.GET.get('staff_id')
    if is_mapped_mentor_student:
        is_mapped_mentor_student= int(is_mapped_mentor_student)
    if staff_id:
        staff_id = int(staff_id)
    student_query = {
        'is_active':True,
    }
    if staff_id:
        student_query['staff_id'] = staff_id
    filter_query={}
    if standard_section:
        filter_query["standard_section_id"] = standard_section,
    if academic_year:
        filter_query['standard_section__academic_year_id'] = academic_year
    if standard:
        filter_query['standard_section__standard'] = standard
    if section:
        filter_query['standard_section__section'] = section
    student_dict={}
    student_meeting_dict ={}
    if not is_mapped_mentor_student:
        student_obj = Enrollment.objects.filter(**filter_query)
        student_data = GetEnrollmentSerializer(student_obj,many=True).data
        for student in student_data:
            student_dict[int(student['student'])] = student
    response={}
    student_staff_list = []
    today = timezone.now().date()
    if is_mapped_mentor_student:
        mentor_student_mapping = MentorStudentMapping.objects.filter(**student_query,
                                from_date__lte=today).filter(Q(to_date__gte=today) | Q(to_date__isnull=True)).values('student_id','student','staff_id','staff','staff__first_name','staff__middle_name','staff__last_name')
        student_list = MentorStudentMapping.objects.filter(**student_query,from_date__lte=today).filter(Q(to_date__gte=today) | Q(to_date__isnull=True)).values_list('student_id',flat=True)
        student_list = list(set(student_list))
        student_obj = Enrollment.objects.filter(student__in=student_list)
        student_data = GetEnrollmentSerializer(student_obj,many=True).data
        for student in student_data:
            student_dict[int(student['student'])] = student
        for student in mentor_student_mapping:
            student_staff_list.append(student['student_id'])
            if student['student_id'] not in response:
                response[student['student_id']] = {'meeting_details':[]}
            response[student['student_id']].update(student)
            if student['student_id'] in student_dict:
                response[student['student_id']].update(student_dict[student['student_id']])
                response[student['student_id']]['admission_num'] = AdmissionForm.get_student_admission_num(self, student['student_id'])
        staff_student_meeting = StaffAppointment.objects.filter(staff_appointment_user_staff_appointment_mapping__user__staff=staff_id,staff_appointment_user_staff_appointment_mapping__user__student__in=student_staff_list,is_active=1).values(
            'description','date','start_time','end_time','staff_appointment_user_staff_appointment_mapping__user__student'
        )
        for student in staff_student_meeting:
            if student['staff_appointment_user_staff_appointment_mapping__user__student']:
                if student['staff_appointment_user_staff_appointment_mapping__user__student'] not in student_meeting_dict:
                    student_meeting_dict[student['staff_appointment_user_staff_appointment_mapping__user__student']] = []
                student_meeting_dict[student['staff_appointment_user_staff_appointment_mapping__user__student']].append(student)  
        for student in mentor_student_mapping:
            if student['student_id'] in student_meeting_dict:
                response[student['student_id']]['meeting_details']+=(student_meeting_dict[student['student_id']])
        for student_id, student_info in response.items():
            meetings = student_info.get('meeting_details', [])
            past_meetings = [m for m in meetings if m['date'] < today]
            future_meetings = [m for m in meetings if m['date'] >= today]
            past_meetings.sort(key=lambda m: (m['date'], m['start_time']))
            future_meetings.sort(key=lambda m: (m['date'], m['start_time']))
            student_info['last_meeting'] = past_meetings[-1] if past_meetings else None
            student_info['upcoming_meeting'] = future_meetings[0] if future_meetings else None
    else:
        for student in student_data:
            if student['student'] not in student_staff_list:
                if student['student'] not in response:
                    response[student['student']] = student_dict[student['student']]
                response[student['student']].update(student_dict[student['student']])
    return response.values()