from datetime import datetime
from django.db.models import Q
from django.db import transaction

from rest_framework.exceptions import ValidationError
from apps.exams.services.mark import student_exam_final_result_obj


from apps.hostel.models import DepositAndWithDraw
from apps.hostel.services.hostel import get_student_opted_for_hostel_list, get_student_opted_hostel_list_based_on_academic_year
from apps.institutes.models import building
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.services import SharedService
from apps.students.models import Student
from apps.shared.services import NotificationBodyTemplate
from apps.tenants.services.middlewares import get_current_db_name
from apps.notification.services.notification_service import send_notification

def get_student_wise_balance(self, student_lists):
    student_details = {}
    deposit_and_withdraw_data = DepositAndWithDraw.objects.filter(
        student__in=student_lists
    ).values('amount', 'deposit_type', 'student')
    for dep_with_data in deposit_and_withdraw_data:
        if dep_with_data['student'] not in student_details:
            student_details[dep_with_data['student']] = {
                'deposited_amount': 0,
                'withdrawed_amount': 0,
                'balance': 0,
                'returnback': 0
            }
        if str(dep_with_data['deposit_type']) == '1':
            student_details[dep_with_data['student']]['deposited_amount'] += dep_with_data['amount']
        elif str(dep_with_data['deposit_type']) == '2':
            student_details[dep_with_data['student']]['withdrawed_amount'] += dep_with_data['amount']
        elif str(dep_with_data['deposit_type']) == '3':
            student_details[dep_with_data['student']]['returnback'] += dep_with_data['amount']
        student_details[dep_with_data['student']]['balance'] = student_details[dep_with_data['student']]['deposited_amount'] - student_details[dep_with_data['student']]['withdrawed_amount'] - student_details[dep_with_data['student']]['returnback']
    return student_details

def add_deposit_and_withdraw(self, request, deposit_type):
    data = request.data
    logged_in_user = self.request.user.id
    fordate = datetime.now().date()
    if 'academic_year' in data and data['academic_year']:
        academic_year = data['academic_year']
    else:
        academic_year = AcademicYear.get_academic_year_for_date(self, fordate)
    if not academic_year:
        raise ValidationError('No current academic year for todays date')
    data['academic_year'] = academic_year.id
    academic_year = data['academic_year']
    student_list= data['student_list']
    save_data_list = []
    student_details = get_student_wise_balance(self, data['student_list'])
    transaction_id = data['transaction_id']
    if deposit_type == '1':
        for student in student_list:
            existing_balance = student_details[student]['balance'] if student in student_details else 0
            temp = {
                'deposit_type': deposit_type,
                'deposited_or_withdraw_by': logged_in_user,
                'fordate': fordate,
                'student': student,
                'amount': data['amount'],
                'academic_year': academic_year,
                'description': data['description'],
                'balance': existing_balance + data['amount'],
                'transaction_id': str(transaction_id) + '_' + str(student)
            }
            
            save_data_list.append(temp)
    elif deposit_type == '2' or deposit_type == '3':
        for student in student_list:
            if student not in student_details or student_details[student]['balance'] < data['amount']:
                student_obj = Student.objects.get(id=student)
                raise ValidationError(f'No balance for {student_obj.first_name}')
            temp = {
                'deposit_type': deposit_type,
                'deposited_or_withdraw_by': logged_in_user,
                'fordate': fordate,
                'student': student,
                'amount': data['amount'],
                'academic_year': academic_year,
                'description': data['description'],
                'balance': student_details[student]['balance'] - data['amount'],
                'transaction_id': str(transaction_id) + '_' + str(student)
            }
            save_data_list.append(temp)
    validate_deposit_withdraw_data(self, data)
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, save_data_list, True)
    SharedService.custom_thread(add_deposit_and_withdraw_notification, save_data_list, deposit_type)
    return response

def add_deposit_and_withdraw_notification(data, deposit_type):
    from apps.users.models import User
    customizedData = []
    student_id_data = {s['student']: s for s in data}
    users = User.objects.filter(student__in=student_id_data.keys())
    notification_key = ''
    if deposit_type == '1':
        notification_key = 'pocket_money_deposit'
    elif deposit_type == '2':
        notification_key = 'pocket_money_withdraw'
    elif deposit_type == '3':
        notification_key = 'pocket_money_returnback'
    notification_obj = NotificationBodyTemplate(notification_key)
    for student in users:
        amount = student_id_data[student.student.id]['amount']
        fordate = student_id_data[student.student.id]['fordate']
        temp = {
            'student_name':student.student.first_name,
            'fordate': fordate.strftime('%Y-%m-%d'),
            'amount': f'{amount:,}'
        }
        body_email = notification_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp)
        body_sms = notification_obj.select_template('sms', temp)
        if student.student.email:
            customizedData.append({'email': student.student.email, 'user_id': student.pk, 'email_subject': None,
                                   'email_body': body_email,'email_notification':1})
        customizedData.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}})
        if student.student.mobile_num:
            customizedData.append(
                {'mobile_number': student.student.mobile_num, 'user_id': student.pk, 'sms_body': body_sms, 'sms_notification': 1}
            )
    send_notification(notification_key, customizedData=customizedData)

def validate_deposit_withdraw_data(self, data):
    student_datas = get_student_opted_for_hostel_list(self)
    student_datas = {student['id'] : student for student in student_datas}
    for student in data['student_list']:
        if student not in student_datas:
            obj = Student.objects.get(id=student)
            raise ValidationError(f'{obj.first_name} student is not opted for the hostel management please verify the user')
