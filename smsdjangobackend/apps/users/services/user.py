import json
import time
import calendar
from django.db import transaction
from django.conf import settings
from rest_framework import exceptions
from django.db.models import Q
from datetime import datetime
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.models.enrollment import StudentStandardMapping
from apps.institutes.models.academicYear import AcademicYear
from django.forms import ValidationError
from datetime import datetime, timedelta

from apps.shared.services import SharedService, ConfigurationService, FormdefinitionService
from apps.classes.serializers import StudentStandardMappingSerializer
from apps.finance.services.calculations import paid_data_and_status
from apps.shared.utils import http_request
from apps.staffs.models import Staff
from apps.students.models import Student
from apps.students.models.student import StudentSiblingMapping
from apps.students.models.studentDetail import ParentDetail, StudentDetails
from apps.students.serializers import ParentDetailSerializer, StudentDetailSerializer, StudentSerializer
from apps.users.models import User
from apps.institutes.models import Institute
from apps.users.serializers import UserReadSerializerStaffAndStudentDetail, UserSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.finance.models import AdmissionForm
from apps.finance.serializers import AdmissionFormSerializer

SERVER_URL = getattr(settings, 'SERVER_URL', None)


def soft_delete_user_login(self, id, key='staff'):
    kwargs = SharedService.get_edubricz_header(self)
    if key == 'staff':
        filter_query = {'staff': id}
    else:
        if not isinstance(id, list):
            id = [id]
        filter_query = {'student__in': id}
    queryset = User.objects.filter(**filter_query)
    timestr = time.strftime("%Y%m%d-%H%M%S")
    if key == 'staff':
        username = queryset.first().username
        remote_response = http_request('POST', SERVER_URL + 'users/deleteuser/', json.dumps({'username': username, 'company_id': Institute.get_institute(self).company_id}), **kwargs)
        temp_user_name = username + '_#$#$#$#$deleteduser'+timestr
        queryset.update(username=temp_user_name, is_active=False)
    else:
        data = {'username': list(queryset.values_list('username', flat=True))}
        remote_response = http_request('Delete', SERVER_URL + 'users/multiplesignup/0/', json.dumps(data), **kwargs)
        for dem in data['username']:
            temp_user_name = dem + '_#$#$#$#$deleteduser'+timestr
            User.objects.filter(username=dem).update(username=temp_user_name, is_active=False)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response}')
    return {'Reason': 'Data Deleted Successfully!'}

def revert_soft_delete_user_login(user_id, key='staff'):
    try:
        if key == 'staff':
            queryset = User.objects.filter(staff=user_id, username__contains='_#$#$#$#$deleteduser', is_active=False)
        else:
            if not isinstance(user_id, list):
                user_id = [user_id]
            queryset = User.objects.filter(student__in=user_id, username__contains='_#$#$#$#$deleteduser', is_active=False)
        if not queryset.exists():
            raise ValidationError('No soft-deleted users found with the given ID(s).')
        for user in queryset:
            original_username = user.username.split('_#$#$#$#$deleteduser')[0]
            user.username = original_username
            user.is_active = True
            user.save()
        return {'status': 'success', 'message': 'Successfully reverted soft-deleted users.'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}


def check_username(self, data, *args, **kwargs):
    response = {'Result': True, 'Reason': 'All username available.'}
    queryset = User.objects.filter(username__in=data['username']).values_list('username', flat=True)
    if queryset:
        response['Result'] = False
        response['Reason'] = 'username already exists.'
        response['data'] = queryset
    return response


def update_profile_pic(self, data, *args, **kwargs):
    raise exceptions.ValidationError('You dont have permission to change the profile pic')
    inst_obj = Institute.objects.all().first()
    if inst_obj.code == 'gurukula' or inst_obj.code == 'jnanajyothi':
        raise exceptions.ValidationError('You dont have permission to change the profile pic')
    if self.request.user.pk != int(kwargs['pk']):
        raise exceptions.ValidationError('User does not have access.')
    if self.request.user.is_staff:
        Staff.objects.filter(pk=self.request.user.staff.pk).update(profile_pic=data['profile_pic'])
    else:
        Student.objects.filter(pk=self.request.user.student.pk).update(profile_pic=data['profile_pic'])
    return {'Reason': 'Data updated successfully.'}

def get_user_under_user_tree(self, request):
    user_ids = self.request.GET.get('user_ids', None)
    response = {}
    if not user_ids:
        user_ids = [self.request.user.id]
    user_ids = user_ids.split(',')
    user_queryset = User.objects.filter(Q(reporting_to__in=user_ids)|Q(id__in=user_ids))
    serializer = UserReadSerializerStaffAndStudentDetail(user_queryset, many=True)
    temp_user_mapping = {}
    for user_id in user_ids:
        temp_user_mapping[int(user_id)] = {'my_reporters': []}
    for user_data in serializer.data:
        if user_data['id'] in temp_user_mapping:
            temp_user_mapping[user_data['id']].update(user_data)
        elif user_data['reporting_to'] in temp_user_mapping:
            temp_user_mapping[user_data['reporting_to']]['my_reporters'].append(user_data['id'])
    response['user_details'] = temp_user_mapping

    return response


def get_higher_tree_hierarchy(self, user_id, parent_user_ids, reporting_to_ids=[]):
    reporting_to_id = User.objects.get(id=user_id).reporting_to_id
    if reporting_to_id:
        reporting_to_ids.append(reporting_to_id)
        temp = {reporting_to_id: {}}
        parent_user_ids[user_id] = get_higher_tree_hierarchy(self, reporting_to_id, temp, reporting_to_ids)[0]
    reporting_to_ids.append(user_id)
    return parent_user_ids, reporting_to_ids

def get_keys(d):
    for v in d.keys():
        if isinstance(v, dict):
            yield from get_keys(v)
        else:
            yield v

def switch_account(self, request):
    from apps.users.services.auth import user_login
    response = {}
    user_id = request.user.id if request.user.id else None
    user_id_to_switch = request.data.get('user_id_to_switch')
    student_id = request.user.student.id if request.user.student else None
    try:
        user_obj = User.objects.get(id=user_id_to_switch, is_active=True)
        student_id_to_switch = user_obj.student.id
    except:
        raise exceptions.ValidationError('Invalid User obj')
    if  user_id == user_id_to_switch:
        raise exceptions.ValidationError('Trying to switch to same account')
    if not student_id:
        raise exceptions.ValidationError('Only student have access to switch accounts')
    sib_obj = StudentSiblingMapping()
    sibling_data_mapping = sib_obj.get_student_sibling_data([student_id])
    sibling_student_ids = []
    for sibling in sibling_data_mapping[student_id]['sibling_list']:
        sibling_student_ids.append(sibling['student_id'])
    if student_id_to_switch not in sibling_student_ids:
        raise exceptions.ValidationError('You dont have access to the other student')
    if user_obj:
        response = user_login(self, request, None, {
            'data': {
                'user_obj': user_obj
            }
        })
    return response

def change_user_data(self, data):
    from apps.users.services.auth import update_username_password_bulk
    from apps.users.services.auth import expire_all_token_for_user
    existing_users = {user['username']: user for user in User.objects.filter(is_active=True).values('username', 'id')}
    data_to_update = []
    admission_data_to_udpate = []
    student_standard_data_to_update = []
    user_ids = []
    student_ids = []
    student_data_to_update = []
    student_detail_to_update = []
    parent_data_to_update = []
    for row_data in data['user_list']:
        temp = {}
        temp1 = {}
        tempgroup={}
        if not row_data['user_id'] and not row_data['student']:
            raise exceptions.ValidationError('user_id is mandatory')
        if 'username' in row_data and row_data['username']:
            if row_data['username'] in existing_users and str(existing_users[row_data['username']]['id']) != str(row_data['user_id']):
                raise exceptions.ValidationError(f'{row_data["username"]} Duplicate Username')
            temp['username'] = row_data['username']
        if 'password' in row_data and row_data['password']:
            temp['password'] = row_data['password']
 
        if 'mobile_num' in row_data and row_data['mobile_num']:
            temp['mobile_num'] = row_data['mobile_num']
        if 'current_student_group_name' in row_data and row_data['current_student_group_name']:
            tempgroup['student_group_id'] = row_data['current_student_group_name']
            tempgroup['student_id'] = row_data['student']
            tempgroup['student_name'] = row_data['student_name']
            tempgroup['standard_id'] = row_data['standard']
            tempgroup['academic_year_id'] = row_data['academic_year']
        if 'email' in row_data and row_data['email']:
            temp['email'] = row_data['email']
        if 'admission_num' in row_data and row_data['admission_num']:
            temp1['admission_num'] = row_data['admission_num']
            temp1['student'] = row_data['student']
            temp1['id'] = row_data['user_id']
            if 'admission_form_id' in row_data and row_data['admission_form_id']:
                temp1['admission_form_id'] = row_data['admission_form_id']
        if 'admission_date' in row_data and row_data['admission_date']:
            temp1['admission_date'] = row_data['admission_date']
            temp1['student'] = row_data['student']
            temp1['id'] = row_data['user_id']
            if 'admission_form_id' in row_data and row_data['admission_form_id']:
                temp1['admission_form_id'] = row_data['admission_form_id']
        if not temp and not temp1:
            raise exceptions.ValidationError('Nothing to update')
        if temp:
            temp['id'] = row_data['user_id']
            if 'student' in row_data:
                temp['student'] = row_data['student']
                student_ids.append(row_data['student'])
            user_ids.append(row_data['user_id'])
            data_to_update.append(temp)
        if temp1:
            admission_data_to_udpate.append(temp1)
        if tempgroup:
            student_standard_data_to_update.append(tempgroup)
        if not self.__class__.__name__ == 'Command' and self.request.user.id == row_data['user_id']:
            raise exceptions.ValidationError('Dont try to change your login')
        if 'student_data' in row_data and row_data['student_data']:
            student_data_to_update.append(row_data['student_data'])
        if 'student_details' in row_data and row_data['student_details']:
            student_detail_to_update.append(row_data['student_details'])
        if 'student_parent' in row_data and row_data['student_parent']:
            parent_data_to_update.append(row_data['student_parent'])
    with transaction.atomic(using=get_current_db_name()):
        password_change_user_list = []
        user_obj_data = {usr.id : usr for usr in User.objects.filter(id__in=user_ids)}
        student_obj_data={student.id : student for student in Student.objects.filter(id__in=student_ids)}
        for row in data_to_update:
            user_obj = user_obj_data[row['id']]
            username = user_obj.username
            row['is_new_username'] = False
            row['old_username'] = username
            if 'username' in row and row['username']:
                user_obj.username = row['username']
                row['is_new_username'] = True
                row['new_username'] = row['username']
            if 'password' in row and row['password']:
                user_obj.set_password(row['password'])
                password_change_user_list.append(row['id'])
            user_obj.save()
            if 'student' in row and row['student']:
                student_obj = student_obj_data[row['student']]
                if 'mobile_num' in row and row['mobile_num']:
                    student_obj.mobile_num = row['mobile_num']
                if 'email' in row and row['email']:
                    student_obj.email = row['email']
                student_obj.save()
        if password_change_user_list:
            expire_all_token_for_user(password_change_user_list, True)
        if data_to_update:
            update_username_password_bulk(self, {'data_list': data_to_update})
        if student_standard_data_to_update:
            for student_group in student_standard_data_to_update:
                if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'fee_plan_types'):
                    try:
                        paid_amount = paid_data_and_status(self,student_group['student_id'], student_group['academic_year_id'], student_group['standard_id'])
                    except:#catching when the fee term plan is not done
                        paid_amount = None
                    if paid_amount and paid_amount['paid_amount'] and paid_amount['paid_amount'] > 0:
                        raise exceptions.ValidationError(f"Fees is already paid you can not edit now for the student {student_group['student_name']}")
                if 'student_group_id' in student_group:
                    instance = StudentStandardMapping.objects.get(student=student_group['student_id'],academic_year=student_group['academic_year_id'],standard=student_group['standard_id'])
                    group_serializer = StudentStandardMappingSerializer(instance=instance, data={'student_group':student_group['student_group_id']},partial=True)
                    group_serializer.is_valid(raise_exception=True)
                    group_serializer.save()
                    if student_group.get('student_id') and student_group.get('student_group_id'):
                        Student.objects.filter(id=student_group['student_id']).update(
                            student_group_id=student_group['student_group_id']
                        )
        if admission_data_to_udpate:
            for admission_row in admission_data_to_udpate:
                if 'admission_form_id' in admission_row and admission_row['admission_form_id']:
                    admission_data={}
                    instance = AdmissionForm.objects.get(id=admission_row['admission_form_id'])
                    if 'admission_date' in admission_row:
                        admission_data['admission_date']=admission_row['admission_date']
                    if 'admission_num' in admission_row:
                        admission_data['admission_num']=admission_row['admission_num']
                    admission_serializer = AdmissionFormSerializer(instance=instance, data=admission_data,partial=True)
                    admission_serializer.is_valid(raise_exception=True)
                    admission_serializer.save()
                else:
                    if 'admission_date' not in admission_row or not admission_row['admission_date']:
                        raise exceptions.ValidationError('Please enter admission date')
                    if 'admission_num' not in admission_row or not admission_row['admission_num']:
                        raise exceptions.ValidationError('Please enter admission num')
                    academic_year=StudentStandardMapping.objects.filter(student=admission_row['student']).first()
                    admission_data={
                        'admission_num':admission_row['admission_num'],
                        'admission_date' : admission_row['admission_date'],
                        'student' : admission_row['student'],
                        'academic_year' : academic_year.academic_year_id
                    }
                    admission_serializer = AdmissionFormSerializer(data=admission_data)
                    admission_serializer.is_valid(raise_exception=True)
                    admission_serializer.save()     
        if student_data_to_update:
            for student in student_data_to_update:
                student_obj = student_obj_data[student['id']]
                if 'first_name' not in student:
                    student['first_name'] = student_obj.first_name
                if 'dob' not in student:
                    student['dob'] = student_obj.dob
                ser = StudentSerializer(instance=student_obj, data=student, partial=True)
                ser.is_valid(raise_exception=True)
                ser.save()
        if student_detail_to_update:
            for student in student_detail_to_update:
                student_d_obj = StudentDetails.objects.get(id=student['id'])
                ser = StudentDetailSerializer(instance=student_d_obj, data=student, partial=True)
                ser.is_valid(raise_exception=True)
                ser.save()
        if parent_data_to_update:
            for parent in parent_data_to_update:
                parent_d_obj = ParentDetail.objects.get(id=parent['id'])
                ser = ParentDetailSerializer(instance=parent_d_obj, data=parent, partial=True)
                ser.is_valid(raise_exception=True)
                ser.save()
    return {'Reason': 'Data updated'}

def user_birthday_list(self):
    from apps.students.services.student import get_student_admission_form_details
    filter_query = {'is_active': True}
    q_query  = Q()
    if self.request.GET.get('only_students'):
        filter_query['student__isnull'] = False
    elif self.request.GET.get('only_staff'):
        filter_query['staff__isnull'] = False
    if self.request.GET.get('standard'):
        filter_query['student__current_standard'] = self.request.GET.get('standard')
    if self.request.GET.get('for_date'):
        date = datetime.strptime(self.request.GET.get('for_date'), '%Y-%m-%d')
        day = date.day
        month = date.month
        q_query = Q(Q(student__dob__month=month),Q(student__dob__day=day)) | Q(Q(staff__dob__month=month),Q(staff__dob__day=day))
    user_data = User.objects.filter(
        q_query, **filter_query
    ).values(
        'id', 'student', 'student__first_name',
        'student__middle_name', 'student__last_name', 'student__dob',
        'staff', 'staff__first_name', 'staff__middle_name', 'staff__last_name',
        'staff__dob', 'student__current_standard__name', 'student__mobile_num'
    )
    data_list = []
    for row_data in user_data:
        if row_data['staff__dob']:
            row_data['dob'] = row_data['staff__dob'].strftime('%Y-%m-%d')
            data_list.append(row_data)
        elif row_data['student__dob']:
            row_data['dob'] = row_data['student__dob'].strftime('%Y-%m-%d')
            data_list.append(row_data)
    now=datetime.now()
    def days_until_next_birthday(dob_str):
        now = datetime.now()
        dob = datetime.strptime(dob_str, '%Y-%m-%d')
        
        try:
            next_birthday = datetime(now.year, dob.month, dob.day)
        except ValueError:
            # Handles Feb 29 for non-leap years by shifting to Feb 28
            if dob.month == 2 and dob.day == 29:
                next_birthday = datetime(now.year, 2, 28)
            else:
                raise

        if next_birthday < now:
            year = now.year + 1
            while True:
                try:
                    next_birthday = datetime(year, dob.month, dob.day)
                    break
                except ValueError:
                    # Again, handle Feb 29 for non-leap years
                    if dob.month == 2 and dob.day == 29:
                        next_birthday = datetime(year, 2, 28)
                        break
                    year += 1

        return (next_birthday - now).days
    data_list = sorted(data_list, key=lambda x: days_until_next_birthday(x["dob"]))
    data, count, next_page, previous_page = SharedService.custom_pagination(self, data_list,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    student_ids = []
    for row_data in data:
        if row_data['student']:
            student_ids.append(row_data['student'])
    student_admission_data = get_student_admission_form_details(self, student_ids)
    for row_data in data:
        row_data['admission_num'] = ''
        if row_data['student'] in student_admission_data:
            row_data['admission_num'] = student_admission_data[row_data['student']]['admission_num']
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}

def user_report_for_app(self):
    today_date = datetime.today()
    standard_names = []
    user_last_activity_from_date_time = self.request.GET.get('user_last_activity_from_date_time')
    if not user_last_activity_from_date_time:
        user_last_activity_from_date_time = str(datetime.today() - timedelta(days=1))
    else:
        user_last_activity_from_date_time += '.00'
    from_date_for_last_activity_days = (datetime.today() -  datetime.strptime(user_last_activity_from_date_time, '%Y-%m-%d %H:%M:%S.%f')).days
    current_academic_year = AcademicYear.get_academic_year_for_date(self, today_date, False, True)
    standard_section_mapping = StandardSectionMapping.objects.filter(
        academic_year=current_academic_year.id
    ).values('standard', 'section', 'standard__name', 'section__name', 'id', 'standard__sequence')
    report_data = {
        'total_students': 0,
        'total_staffs': 0,
        'total_logged_in_students': 0,
        'total_logged_in_staffs': 0,
        'last_activity_students_based_on_date': 0,
        'last_activity_staffs_based_on_date': 0
    }
    user_filter = {'is_active': True}
    user_data = User.objects.filter(**user_filter).values(
        'staff', 'staff__first_name', 'staff__middle_name',
        'staff__last_name',
        'student', 'student__first_name', 'student__middle_name',
        'student__last_name', 'last_activity', 'last_login',
        'staff__dob', 'student__dob', 'student__current_standard'
    )
    standard_report = {}
    standard_section_wise_report = {}
    staff = {
            'active_users': 0,
            'in_active_users': 0,
            'total_logged_in_users': 0,
            'total_not_logged_in_users': 0 
    }
    for standard_section_d in standard_section_mapping:
        if standard_section_d['standard'] not in standard_report:
            standard_report[standard_section_d['standard']] = {
                'standard': standard_section_d['standard'], 
                'standard_name': standard_section_d['standard__name'],
                'sequence': standard_section_d['standard__sequence'],
                'active_users': 0, 'in_active_users': 0,
                'total_logged_in_users': 0,
                'total_not_logged_in_users': 0
            }
            standard_section_wise_report[standard_section_d['standard']] = {
                'standard': standard_section_d['standard'], 'standard_name': standard_section_d['standard__name'],
                'section_list': {}
            }
            standard_names.append(standard_section_d['standard__name'])
        if standard_section_d['id'] not in standard_section_wise_report[standard_section_d['standard']]['section_list']:
            standard_section_wise_report[standard_section_d['standard']]['section_list'][standard_section_d['id']] = {
                'section_name': standard_section_d['section__name'],
                'standard_section': standard_section_d['id'],
                'section': standard_section_d['section'],
                'active_users': 0, 'in_active_users': 0,
                'total_logged_in_users': 0,
                'total_not_logged_in_users': 0
            }
    for user in user_data:
        is_active_user = 0
        is_last_logged_in = 0
        if user['last_activity']:
            difference_days = (today_date - user['last_activity']).days
            if difference_days > 0 and difference_days < from_date_for_last_activity_days:
                report_data['last_activity_staffs_based_on_date'] += 1
                is_active_user = 1
        if user['staff']:
            report_data['total_staffs'] += 1
            if user['last_login']:
                report_data['total_logged_in_staffs'] += 1
                is_last_logged_in += 1
                staff['total_logged_in_users'] += 1
            else:
                staff['total_not_logged_in_users'] += 1
            if is_active_user:
                staff['active_users'] += 1
            else:
                staff['in_active_users'] += 1

        elif user['student']:
            if user['last_activity']:
                difference_days = (today_date - user['last_activity']).days
                if difference_days > 0 and difference_days < from_date_for_last_activity_days:
                    report_data['last_activity_students_based_on_date'] += 1
                    is_active_user = 1
            report_data['total_students'] += 1
            if user['last_login']:
                report_data['total_logged_in_students'] += 1
                is_last_logged_in = 1
    temp_report = {
        'standard_wise_active_users': [],
        'standard_wise_inactive_users': [],
        'standard_wise_logged_in_users': [],
        'standard_wise_not_logged_in_users': []
    }
    standard_report = sorted(standard_report.values(), key=lambda d: d['sequence'])
    temp_report['standard_wise_active_users'].append(staff['active_users'])
    temp_report['standard_wise_inactive_users'].append(staff['in_active_users'])
    temp_report['standard_wise_logged_in_users'].append(staff['total_logged_in_users'])
    temp_report['standard_wise_not_logged_in_users'].append(staff['total_not_logged_in_users'])
    for standard_row in standard_report:
        #if you add any new key here add to staff also
        temp_report['standard_wise_active_users'].append(standard_row['active_users'])
        temp_report['standard_wise_inactive_users'].append(standard_row['in_active_users'])
        temp_report['standard_wise_logged_in_users'].append(standard_row['total_logged_in_users'])
        temp_report['standard_wise_not_logged_in_users'].append(standard_row['total_not_logged_in_users'])
    report_data['standard_section_wise_report'] = standard_section_wise_report.values()
    return report_data
