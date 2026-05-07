from datetime import datetime, timedelta
import json

from django.db.models import Count, F, Q
from rest_framework import exceptions
from dateutil import parser as date_parser
from django.core.serializers.json import DjangoJSONEncoder
from django.utils.dateformat import format as date_format
from copy import deepcopy

from apps.classes.models import Enrollment
from apps.classes.models.subject import AssignSubject, Subject
from apps.classes.serializers import MachineAttendanceSerializer
from apps.classes.models.attendance import Attendance, MachineAttendance, MachineAttendanceLog, SubjectAttendance, StandardAttendanceConfiguration
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.services.enrollment import get_enrolled_students
from apps.classes.services.standard import get_standard_and_section
from apps.general.models import HolidayCalender
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.general.models.school_timing import SchoolTiming, SchoolTimingParent
from apps.hr.models import Day
from apps.hr.services.staffattendance import is_staff_attendance_exist, staff_attendance_add
from apps.institutes.models import Institute
from apps.institutes.models.academicYear import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer
from apps.shared.services import ConfigurationService, FormdefinitionService, SharedService, PDFService, NotificationBodyTemplate
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.students.models import Student
from apps.users.models import User
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name
from apps.bdu.services.write_to_excel import write_to_excel_new

def get_working_dates(self,from_date, to_date):
    date_range_list = SharedService.get_for_date_from_date_range(SharedService.date_to_obj(from_date), SharedService.date_to_obj(to_date))
    holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date, to_date, True)
    final_list = []
    working_days = Day.get_student_working_days(self)
    for row_date in date_range_list:
        day_name = SharedService.get_day_for_date(row_date.strftime('%Y-%m-%d'))
        if str(row_date) in holiday_list:
            continue
        if day_name not in  working_days:
            continue
        final_list.append(row_date)
    return final_list

def add_attendance_bulk(self, data):
    format = "%Y-%m-%d"
    from_date = data['from_date']
    to_date = data['to_date']
    session_list = data['session_list']
    number_of_sessions = int(FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'number_of_session'))
    if number_of_sessions == 1:
        session_list = ['Session1', 'Session2']
    standard_section = data['standard_section']
    attendance = data['attendance']
    with transaction.atomic(using=get_current_db_name()):
        date_range_list = get_working_dates(self, from_date, to_date)
        if not date_range_list:
            raise exceptions.ValidationError('Your mostly marking attendance on non working daysS')
        for for_date in date_range_list:
            for session in session_list:
                temp = {
                    'for_date': for_date.strftime(format),
                    'session': session,
                    'standard_section': standard_section,
                    'attendance': attendance,
                    'marked_by': self.request.user.id
                }
                send_notification = True
                if number_of_sessions == 1 and session == 'Session1':
                    send_notification = False
                add_attendance(self, temp, send_notification)
    return {'Reason': 'Data Saved Successfully'}


def add_attendance(self, data, send_notification=True):
    if SharedService.date_to_obj(data['for_date']) > datetime.today().date():
        raise exceptions.ValidationError('Marking attendance for future date.')
    strength = Enrollment.objects.filter(standard_section=data['standard_section'], student__is_active=True).values('standard_section').annotate(
        count=Count('standard_section'))
    if not strength:
        raise exceptions.ValidationError('Students are not enrolled to the standard/section.')
    count = len(data['attendance'])
    strength = strength[0]['count']
    if count != strength:
        raise exceptions.ValidationError(
            f'{strength} student(s) are enrolled in the section. marking attendance for {count} student(s)')
    dataList = list()
    students = list()
    attendance_data = Attendance.objects.filter(for_date=data['for_date'], session=data['session'], student__is_active=True).values('student', 'id')
    attendance_data = {str(atd['student']): atd for atd in attendance_data}
    for student, status in data['attendance'].items():
        temp = {'for_date': data['for_date'], 'session': data['session'], 'standard_section': data['standard_section'],
             'student': student, 'status': status}
        if str(student) in attendance_data:
            temp['id'] = attendance_data[str(student)]['id']
        dataList.append(
            temp
        )
        students.append(student)
    response = SharedService.add_or_update_data(self, dataList)
    if students and send_notification:
        SharedService.custom_thread(attendance_notification, self, data, students)
    return response


def attendance_notification(self, data, students):
    users = User.objects.filter(student__in=students)
    customizedData = list()
    standard = StandardSectionMapping.objects.filter(id= data['standard_section']).values('standard','standard__name').first()
    customizedPresentData = list()
    staff_first_name = self.request.user.staff.first_name if self.request.user.staff else ''
    notification_obj = NotificationBodyTemplate('attendance_create')
    notification_present_obj = NotificationBodyTemplate('attendance_present_create')
    for student in users:
        status=data['attendance'][str(student.student.id)]
        temp = {
            'student_name':get_full_name(student.student.first_name,student.student.middle_name,student.student.last_name),
            'fordate':SharedService.date_to_obj(data["for_date"]).strftime("%d/%m/%Y"),
            'session':data['session'],
            'staffname':staff_first_name,
            'status':status,
            'standard_name':standard['standard__name']
        }
        body_email = notification_obj.select_template('email', temp) if status=='absent' else notification_present_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp) if status=='absent' else notification_present_obj.select_template('push', temp)
        body_sms = notification_obj.select_template('sms',temp) if status=='absent' else notification_present_obj.select_template('sms', temp)
        if student.student.mobile_num:
            sms_data = {
                'mobile_number':student.student.mobile_num,'sms_body':body_sms,'sms_notification':1,'user_id':student.pk}
            customizedData.append(sms_data) if status=='absent' else customizedPresentData.append(sms_data)
        if student.student.email:
            email_data = {'email': student.student.email, 'user_id': student.pk, 'email_subject': None,
                                   'email_body': body_email,'email_notification':1}
            customizedData.append(email_data) if status=='absent' else customizedPresentData.append(email_data)
        push_data={'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}}
        customizedData.append(push_data) if status=='absent' else customizedPresentData.append(push_data)
    send_notification('attendance_create', body=None, customizedData=customizedData)
    send_notification('attendance_present_create', body=None,customizedData=customizedPresentData)


def get_attendance(self):
    for_date = self.request.GET.get('for_date')
    day = datetime.strptime(for_date, '%Y-%m-%d').strftime('%A')
    working_days = Day.get_student_working_days(self)
    holiday_reason = ''
    if day not in working_days:
        holiday_reason += day + ', '
    holidays = HolidayCalender.objects.filter(from_date__lte=for_date, to_date__gte=for_date)
    if holidays:
        for holiday in holidays:
            holiday_reason += holiday.reason + ', '
    holiday_reason = ''
    if holiday_reason:
        holiday_reason += "It's a holiday. Reason: " + holiday_reason[:-2] + '.'
    attendance = Attendance.objects.filter(for_date=for_date).values(
        'for_date', 'session', 'status', 'standard_section', 'student', 'marked_by'
    )
    queryset = self.filter_queryset(self.get_queryset())
    data = queryset.annotate(standard_section=F('id'), section_name=F('section__name')).values('standard_section',
                                                                                               'section_name',
                                                                                               'section','id').order_by('section_name')
    standard_section_ids = [row_data['id'] for row_data in data]
    enrollment_data = Enrollment.objects.filter(
        standard_section__in=standard_section_ids, student__is_active=True
    ).values(
        'id', 'standard_section', 'standard_section__standard', 'standard_section__section', 'student'
    )
    standard_section_enrol = {}
    student_standard_section_mapping = {}
    for enr in enrollment_data:
        if enr['standard_section'] not in standard_section_enrol:
            standard_section_enrol[enr['standard_section']] = 0
        standard_section_enrol[enr['standard_section']] += 1
        student_standard_section_mapping[enr['student']] = enr['standard_section']
    attendance_standard_sec_mapping = {}
    for attendance_row in attendance:
        standard_sec = attendance_row['standard_section']
        if attendance_row['student'] in student_standard_section_mapping:
            standard_sec = student_standard_section_mapping[attendance_row['student']]
        if standard_sec not in attendance_standard_sec_mapping:
            attendance_standard_sec_mapping[standard_sec] = {'Session1': {'present': 0, 'absent': 0}, 'Session2': {'present': 0, 'absent': 0}}
        if attendance_row['session'] == 'Session1':
            if attendance_row['status'] == 'present':
                attendance_standard_sec_mapping[standard_sec]['Session1']['present'] += 1
            else:
                attendance_standard_sec_mapping[standard_sec]['Session1']['absent'] += 1
        elif attendance_row['session'] == 'Session2':
            if attendance_row['status'] == 'present':
                attendance_standard_sec_mapping[standard_sec]['Session2']['present'] += 1
            else:
                attendance_standard_sec_mapping[standard_sec]['Session2']['absent'] += 1
    for section in data:
        section['strength'] = 0
        if section['id'] in standard_section_enrol:
            section['strength'] = standard_section_enrol[section['id']]
        if section['standard_section'] not in attendance_standard_sec_mapping:
            sessions = {'Session1': {'present': 0, 'absent': 0}, 'Session2': {'present': 0, 'absent': 0}}
        else:
            sessions = attendance_standard_sec_mapping[section['standard_section']]
        session1 = sessions['Session1']['present']
        session2 = sessions['Session2']['present']
        session1_has_data = sessions['Session1']['present'] + sessions['Session1']['absent'] > 0
        session2_has_data = sessions['Session2']['present'] + sessions['Session2']['absent'] > 0
        is_multiple_sessions = session1_has_data or session2_has_data
        section.update({
            'total_present': (session1+session2)/2,
            'session1_present': session1,
            'session2_present': session2,
            'is_multiple_sessions': is_multiple_sessions,
            'sessions': sessions.values()
        })
    return {'data': {'data_list': data, 'holiday_reason': holiday_reason, 'is_attendance_marked': True if attendance else False}}

def get_attendance_standard_section_wise(self):
    from datetime import datetime, timedelta
    from collections import defaultdict

    for_date_str = self.request.GET.get('for_date')
    from_date_str = self.request.GET.get('from_date')
    to_date_str = self.request.GET.get('to_date')

    if for_date_str:
        from_date = to_date = datetime.strptime(for_date_str, '%Y-%m-%d').date()
    else:
        from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
        to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()

    attendance = Attendance.objects.filter(for_date__range=[from_date, to_date]).values(
        'for_date', 'session', 'status', 'student'
    )


    # Get standard-section info
    queryset = self.filter_queryset(self.get_queryset())
    standard_data = queryset.annotate(
        standard_section=F('id'),
        section_name=F('section__name'),
        standard_name=F('standard__name'),
        standard_sequence=F('standard__sequence')  # Include sequence here
    ).values('standard_section', 'section_name', 'standard_name', 'standard_sequence').order_by('standard_sequence', 'section_name')
    standard_section_ids = [s['standard_section'] for s in standard_data]
    
    # Get enrollment data with gender
    enrollment_data = Enrollment.objects.filter(
        standard_section__in=standard_section_ids, student__is_active=True
    ).values('student', 'standard_section', 'student__gender')
    summary = {}
    student_gender_map = {}
    student_standard_section_map = {}

    for enr in enrollment_data:
        sec_id = enr['standard_section']
        gender = (enr['student__gender'] or '').lower()
        student_id = enr['student']
        student_gender_map[student_id] = gender
        student_standard_section_map[student_id] = sec_id
        if sec_id not in summary:
            summary[sec_id] = {
                'standard_name': '',
                'section_name': '',
                'total_boys': 0,
                'total_girls': 0,
                'boys_present': 0,
                'girls_present': 0,
            }
        if gender == 'boy':
            summary[sec_id]['total_boys'] += 1
        elif gender == 'girl':
            summary[sec_id]['total_girls'] += 1
    for att in attendance:
        student_id = att['student']
        gender = student_gender_map.get(student_id)
        sec_id = student_standard_section_map.get(student_id)
        if not gender or not sec_id:
            continue
        if att['status'] == 'present':
            if gender == 'boy':
                summary[sec_id]['boys_present'] += 0.5
            elif gender == 'girl':
                summary[sec_id]['girls_present'] += 0.5
    result = []
    for s in standard_data:
        sec_id = s['standard_section']
        row = summary.get(sec_id, {
            'standard_name': '',
            'section_name': '',
            'total_boys': 0,
            'total_girls': 0,
            'boys_present': 0,
            'girls_present': 0,
        })
        row['standard_name'] = s['standard_name']
        row['section_name'] = s['section_name']
        total = row['total_boys'] + row['total_girls']
        present = row['boys_present'] + row['girls_present']
        row['percentage'] = round((present / total) * 100, 2) if total else 0.0
        result.append(row)

    return {
        'data': {
            'data_list': result,
            'is_attendance_marked': bool(attendance)
        }
    }


# def get_attendance(self):
#     forDate = self.request.GET.get('for_date')
#     queryset = self.filter_queryset(self.get_queryset())
#     attendance = Attendance.objects.filter(for_date=forDate)
   
#     day = datetime.strptime(forDate, '%Y-%m-%d').strftime('%A')
#     workingDays = Day.get_student_working_days(self)
#     holidayReason = ''
#     if day not in workingDays:
#         holidayReason += day + ', '
#     holidays = HolidayCalender.objects.filter(from_date__lte=forDate, to_date__gte=forDate)
#     if holidays:
#         for holiday in holidays:
#             holidayReason += holiday.reason + ', '
#     holiday_reason = ''
#     if holidayReason:
#         holiday_reason += "It's a holiday. Reason: " + holidayReason[:-2] + '.'
#     return {'data': {'data_list': data, 'holiday_reason': holiday_reason}}


def get_attendance_detail(self):
    # queryset = self.filter_queryset(self.get_queryset())
    ordering = self.request.GET.get('ordering')
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    attendance_status = self.request.GET.get('attendance_status')
    std_sec_id = self.kwargs['pk']
    is_today_marked = False
    student_ids = []
    student_data = Student.get_student_for_standard(None, None, [std_sec_id], ['id'])
    for student in student_data:
        student_ids.append(student['id'])
    filter_query = {'student__in': student_ids}
    if from_date and to_date:
        filter_query['for_date__range'] = (from_date, to_date)
    if attendance_status:
        if attendance_status == "Present":
            attendance_status = "present"
        elif attendance_status == "Absent":
            attendance_status = "absent"
    queryset = Attendance.objects.filter(**filter_query)
    attendance_data = queryset.values()
    days_count = {}
    attendance = {}
    students = []
    document_ids = []
    student_ids_attendance = []
    for attendance_row in attendance_data:
        days_count[attendance_row['for_date']] = ''
    days = len(days_count.keys())
    students = queryset.values('student', 'session', 'status', 'for_date').annotate(
        standard=F('standard_section__standard')
    )
    todays_date = datetime.now().date().strftime('%Y-%m-%d')
    for student in students:
        student_ids_attendance.append(student['student'])
    student_ids_attendance=list(set(student_ids_attendance))
    for student in student_ids:
        if student not in student_ids_attendance:
            attendance[student]={
                'present': 0, 'absent': 0, 'total': 0, 'session1_todays_status': 'Un Marked', 'session2_todays_status': 'Un Marked'
            }
    for student in students:
        is_todays_date = False
        if student['for_date'].strftime('%Y-%m-%d') == todays_date:
            is_todays_date = True
            is_today_marked = True
        if student['student'] not in attendance:
            attendance[student['student']] = {
                'present': 0, 'absent': 0, 'total': 0, 'session1_todays_status': 'Un Marked', 'session2_todays_status': 'Un Marked'
            }
        if is_todays_date:
            attendance[student['student']][f"{student['session'].lower()}_todays_status"] = student['status']
        if student['status'] == 'present':
            attendance[student['student']]['present'] += 0.5
        else:
            attendance[student['student']]['absent'] += 0.5
        attendance[student['student']]['total'] += 0.5
    order_by_gender = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'order_by_gender')
    gender_ordering = ['gender', 'first_name'] if int(order_by_gender) == 1 else ['first_name']
    student_list = Student.objects.filter(id__in=attendance.keys()).order_by(*gender_ordering).values(
        'current_reg_num',
        'email',
        'first_name',
        'gender',
        'id',
        'is_new_student',
        'last_name',
        'middle_name',
        'mobile_num',
        'user_student',
        'profile_pic'
    )
    for data in student_list:
        data['name'] = get_full_name(data['first_name'], data['middle_name'], data['last_name'])
        data.update(attendance[data['id']])
        if data['profile_pic']:
            document_ids.append(data['profile_pic'])
    document_queryset = Document.objects.filter(id__in=document_ids)
    document_data = {doc['id']: doc for doc in DocumentSerializer(document_queryset, many=True).data}
    filtered_student_list=[]
    for student_row in student_list:
        student_row['profile_pic_details'] = {}
        if student_row['profile_pic'] and student_row['profile_pic'] in document_data:
            student_row['profile_pic_details'] = document_data[student_row['profile_pic']]
        if attendance_status and attendance_status == student_row['session1_todays_status'] or attendance_status == student_row['session2_todays_status']:
            filtered_student_list.append(student_row)
    if attendance_status:
        student_list = filtered_student_list
    if ordering:
        if '-' in ordering:
            ordering = ordering.replace('-', '')
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower(), reverse=True)
        else:
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower())
    std_sec_obj = StandardSectionMapping.objects.get(id=std_sec_id)
    standard_section_data = {
        'standard_name': std_sec_obj.standard.name,
        'section_name': std_sec_obj.section.name,
    }
    return {'data': {'days': days, 'student': student_list, 'is_today_marked': is_today_marked, **standard_section_data}}

def get_rfid_attendance_detail(self):
    # queryset = self.filter_queryset(self.get_queryset())
    ordering = self.request.GET.get('ordering')
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    attendance_status = self.request.GET.get('attendance_status')
    std_sec_id = self.kwargs['pk']
    is_today_marked = False
    student_ids = []
    student_data = Student.get_student_for_standard(None, None, [std_sec_id], ['id'])
    for student in student_data:
        student_ids.append(student['id'])
    filter_query = {'student__in': student_ids}
    if from_date and to_date:
        filter_query['for_date__range'] = (from_date, to_date)
    if attendance_status:
        if attendance_status == "Present":
            attendance_status = "present"
        elif attendance_status == "Absent":
            attendance_status = "absent"
    queryset = MachineAttendance.objects.filter(**filter_query)
    attendance_data = queryset.values()
    days_count = {}
    attendance = {}
    students = []
    document_ids = []
    student_ids_attendance = []
    for attendance_row in attendance_data:
        days_count[attendance_row['for_date']] = ''
    days = len(days_count.keys())
    students = queryset.values('student', 'status', 'for_date')
    todays_date = datetime.now().date().strftime('%Y-%m-%d')
    for student in students:
        student_ids_attendance.append(student['student'])
    student_ids_attendance=list(set(student_ids_attendance))
    for student in student_ids:
        if student not in student_ids_attendance:
            attendance[student]={
                'present': 0, 'absent': 0, 'total': 0
            }
    for student in students:
        is_todays_date = False
        if student['for_date'].strftime('%Y-%m-%d') == todays_date:
            is_todays_date = True
            is_today_marked = True
        if student['student'] not in attendance:
            attendance[student['student']] = {
                'present': 0, 'absent': 0, 'total': 0
            }
        # if is_todays_date:
            # attendance[student['student']][f"{student['session'].lower()}_todays_status"] = student['status']
        if student['status'] == 'present':
            attendance[student['student']]['present'] += 1
        else:
            attendance[student['student']]['absent'] += 1
        attendance[student['student']]['total'] += 1
    order_by_gender = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'order_by_gender')
    gender_ordering = ['gender', 'first_name'] if int(order_by_gender) == 1 else ['first_name']
    student_list = Student.objects.filter(id__in=attendance.keys()).order_by(*gender_ordering).values(
        'current_reg_num',
        'email',
        'first_name',
        'gender',
        'id',
        'is_new_student',
        'last_name',
        'middle_name',
        'mobile_num',
        'user_student',
        'profile_pic'
    )
    for data in student_list:
        data['name'] = get_full_name(data['first_name'], data['middle_name'], data['last_name'])
        data.update(attendance[data['id']])
        if data['profile_pic']:
            document_ids.append(data['profile_pic'])
    document_queryset = Document.objects.filter(id__in=document_ids)
    document_data = {doc['id']: doc for doc in DocumentSerializer(document_queryset, many=True).data}
    filtered_student_list=[]
    for student_row in student_list:
        student_row['profile_pic_details'] = {}
        if student_row['profile_pic'] and student_row['profile_pic'] in document_data:
            student_row['profile_pic_details'] = document_data[student_row['profile_pic']]
        if attendance_status and attendance_status == student_row['status']:
            filtered_student_list.append(student_row)
    if attendance_status:
        student_list = filtered_student_list
    if ordering:
        if '-' in ordering:
            ordering = ordering.replace('-', '')
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower(), reverse=True)
        else:
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower())
    std_sec_obj = StandardSectionMapping.objects.get(id=std_sec_id)
    standard_section_data = {
        'standard_name': std_sec_obj.standard.name,
        'section_name': std_sec_obj.section.name,
    }
    return {'data': {'days': days, 'student': student_list, 'is_today_marked': is_today_marked, **standard_section_data}}


def get_attendance_report(self):
    attendance = self.get_queryset().filter(student=self.kwargs['pk'])
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    standard = None
    if fromDate and toDate:
        attendance = attendance.filter(for_date__range=(fromDate, toDate))
    if self.request.GET.get('standard_section'):
        attendance = attendance.filter(standard_section=self.request.GET.get('standard_section'))
        standard = [StandardSectionMapping.objects.get(id=self.request.GET.get('standard_section')).standard.id]
    if not attendance:
        raise exceptions.ValidationError('No data exists to generate the report for the student.')
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    fromDate = SharedService.date_to_obj(fromDate)
    toDate = SharedService.date_to_obj(toDate)
    data = {'attendance': attendance.order_by('for_date'), 'today': today, 'institute': Institute.get_institute(self, standard),
            'from_date': fromDate, 'to_date': toDate}
    response = PDFService.receipt(self, data, attendance.first().student.first_name, 'attendanceReport.html')
    return response

def get_attendance_section_wise_report(self):
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    standard_section_id = self.request.GET.get('standard_section')
    forDate = self.request.GET.get('for_date')

    if not standard_section_id:
        raise exceptions.ValidationError('Standard section is required to generate the report.')

    # Get students
    students = Student.get_student_for_standard(None, None, [standard_section_id], ['id', 'first_name', 'last_name'])
    student_map = {s['id']: s for s in students}

    # Filter attendance
    attendance_qs = self.get_queryset().filter(standard_section=standard_section_id)
    if fromDate and toDate:
        attendance_qs = attendance_qs.filter(for_date__range=(fromDate, toDate))
    elif forDate:
        attendance_qs = attendance_qs.filter(for_date=forDate)
    else:
        raise exceptions.ValidationError('Either from_date & to_date OR for_date is required.')

    std_sec_obj = StandardSectionMapping.objects.select_related('standard', 'section').get(id=standard_section_id)
    standard_name = std_sec_obj.standard.name
    section_name = std_sec_obj.section.name

    # Get attendance data
    attendance_data = attendance_qs.order_by('for_date', 'student__first_name').values(
        'for_date',
        'student_id',
        'status',
        'session'
    )

    # Build date range
    date_list = set()
    if fromDate and toDate:
        from_obj = SharedService.date_to_obj(fromDate)
        to_obj = SharedService.date_to_obj(toDate)
        while from_obj <= to_obj:
            date_list.add(from_obj.strftime('%d-%m-%Y'))
            from_obj += timedelta(days=1)
    else:
        date_list.add(SharedService.date_to_obj(forDate).strftime('%d-%m-%Y'))

    # Initialize structure
    formatted_attendance = {}
    for date in date_list:
        formatted_attendance[date] = {}
        for sid, stu in student_map.items():
            formatted_attendance[date][sid] = {
                'student_name': f"{stu['first_name']} {stu['last_name']}",
                'sessions': {
                    'Session1': 'Not Marked',
                    'Session2': 'Not Marked'
                }
            }

    # Fill attendance
    for record in attendance_data:
        date_key = record['for_date'].strftime('%d-%m-%Y')
        student_id = record['student_id']
        session = record['session']
        status = record['status'].capitalize()

        if date_key in formatted_attendance and student_id in formatted_attendance[date_key]:
            formatted_attendance[date_key][student_id]['sessions'][session] = status

    # Flatten for rendering
    for date in formatted_attendance:
        formatted_attendance[date] = list(formatted_attendance[date].values())

    # Build PDF
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    fromDateObj = SharedService.date_to_obj(fromDate) if fromDate else SharedService.date_to_obj(forDate)
    toDateObj = SharedService.date_to_obj(toDate) if toDate else fromDateObj
    standard = [std_sec_obj.standard.id]

    current_time = datetime.now().strftime("%Y-%m-%d_%H-%M")
    filename = f"attendance_report_{current_time}.pdf"

    data = {
        'attendance_grouped': formatted_attendance,
        'today': today,
        'institute': Institute.get_institute(self, standard),
        'from_date': fromDateObj,
        'to_date': toDateObj,
        'standard_name': standard_name,
        'section_name': section_name
    }
    selected_template, no_of_copies = get_selected_template(self, 'attendance_reports', 'pdf', 'attendanceSectionWiseReport.html')
    path = 'attendance_reports/' + selected_template
    response = PDFService.receipt(self, data, filename, path)
    return response

def get_attendence_daily_report(self,response):
    student_list=[]
    for student_details in response['data']:
        student={}
        student['name']=student_details['name']
        student['status']=student_details['status']
        student_list.append(student)
    options={}
    options['Data'] = student_list
    options['extraWorksheetData'] = dict()
    options['columns'] = json_student_attendence_report()
    options['title']='Students attendence Report'
    return write_to_excel_new(self,options,{},{})

def json_student_attendence_report():
    column_data=[
        {
            'column': 'STUDENT NAME', 'required': False, 'schemacolumn': 'name'
        }]
    column_data.append({
                'column':'STATUS', 'required': False, 'schemacolumn': 'status'
        })
    return column_data

def get_student_attendance_status(self, student_ids, academic_year, for_date_obj, in_time, out_time,status=''):
    in_time = datetime.strptime(in_time, "%Y-%m-%d %H:%M:%S")
    out_time = datetime.strptime(out_time, "%Y-%m-%d %H:%M:%S")
    if out_time < in_time:
        raise exceptions.ValidationError('Out time should greater than in time')
    if (out_time - in_time).days > 1:
        raise exceptions.ValidationError('Out time and in time difference should be less than one day')
    student_standard_section = Enrollment.objects.filter(
        standard_section__academic_year=academic_year, student__in=student_ids
    ).values()
    standard_section_ids = []
    student_standard_section_data = {}
    for standard_section in student_standard_section:
        standard_section_ids.append(standard_section['standard_section_id'])
        student_standard_section_data[standard_section['student_id']] = standard_section['standard_section_id']
    school_timing_data_section_wise = get_school_timing_data_for_standard_sections(self, standard_section_ids, academic_year, for_date_obj)
    return_data = {}
    for student_id in student_ids:
        school_timing_data = None if (student_id not in student_standard_section_data or not school_timing_data_section_wise[student_standard_section_data[student_id]]) else school_timing_data_section_wise[student_standard_section_data[student_id]]
        if not school_timing_data:
            return_data[student_id] = {"status": "timenotassigned"}
            continue
        shift_in_time = school_timing_data['start_time'].strftime('%H:%M:%S')
        shift_out_time = school_timing_data['end_time'].strftime('%H:%M:%S')
        if shift_in_time > shift_out_time:
            shift_out_time = (for_date_obj + timedelta(days=1)).strftime('%Y-%m-%d') + ' ' + shift_out_time
        else:
            shift_out_time = (for_date_obj).strftime('%Y-%m-%d') + ' ' + shift_out_time
        shift_in_time = (for_date_obj).strftime('%Y-%m-%d') + ' ' + shift_in_time
        if str(in_time.date()) != shift_in_time.split(' ')[0] and str(in_time.date()) != shift_out_time.split(' ')[0]:
            raise exceptions.ValidationError('in_time date and fordate should be same.')
        session1_end_time = school_timing_data['half_day_time'].strftime('%H:%M:%S')
        session_2_start_time = school_timing_data['end_time'].strftime('%H:%M:%S')
        if session1_end_time:
            if shift_in_time > session1_end_time:
                session1_end_time = (for_date_obj).strftime('%Y-%m-%d') + ' ' + session1_end_time
                session1_end_time = datetime.strptime(session1_end_time, '%Y-%m-%d %H:%M:%S')
            else:
                session1_end_time = (for_date_obj + timedelta(days=1)).strftime('%Y-%m-%d') + ' ' + session1_end_time
                session1_end_time = datetime.strptime(session1_end_time, '%Y-%m-%d %H:%M:%S')
        if session_2_start_time:
            if shift_in_time > session_2_start_time:
                session_2_start_time = (for_date_obj).strftime('%Y-%m-%d') + ' ' + session_2_start_time
                session_2_start_time = datetime.strptime(session_2_start_time, '%Y-%m-%d %H:%M:%S')
            else:
                session_2_start_time = (for_date_obj + timedelta(days=1)).strftime('%Y-%m-%d') + ' ' + session_2_start_time
                session_2_start_time = datetime.strptime(session_2_start_time, '%Y-%m-%d %H:%M:%S')

        status = 'absent'
        if shift_out_time > shift_in_time and in_time > out_time:
            raise exceptions.ValidationError('In time should be less than out Time')

        checkin_status = 'absent'
        checkout_status = 'absent'
        late_buffer_time = school_timing_data['allowable_late_minutes']

        """ Find the checkin status """

        shift_in_time = datetime.strptime(shift_in_time, '%Y-%m-%d %H:%M:%S')
        shift_in_time_plus_later_buffer = shift_in_time + timedelta(0, ((late_buffer_time) * 60))

        shift_out_time = datetime.strptime(shift_out_time, '%Y-%m-%d %H:%M:%S')

        if session1_end_time:
            session1_end_time_minus_late_buffer = session1_end_time - + timedelta(0, ((late_buffer_time) * 60))
        else: #handle for halfday
            session1_end_time_minus_late_buffer = None
        if session_2_start_time:
            session_2_start_time_plus_buffer = session_2_start_time + timedelta(0, ((late_buffer_time) * 60))
            session_2_start_time_plus_late_buffer = session_2_start_time + timedelta(0, ((late_buffer_time) * 60))
        else:#handle for halfday
            session_2_start_time_plus_buffer = None
            session_2_start_time_plus_late_buffer = None
        session_2_end_time_minus_buffer = shift_out_time - + timedelta(0, ((late_buffer_time) * 60))
        session_2_end_time_minus_late_buffer = shift_out_time - + timedelta(0, ((late_buffer_time) * 60))


        if in_time.strftime('%Y-%m-%d %H:%M:%S') <= shift_in_time_plus_later_buffer.strftime('%Y-%m-%d %H:%M:%S'):
            checkin_status = 'present'
        elif SharedService.time_is_between(self, in_time.strftime('%Y-%m-%d %H:%M:%S'),
            shift_in_time_plus_later_buffer.strftime('%Y-%m-%d %H:%M:%S'),
            session1_end_time_minus_late_buffer.strftime('%Y-%m-%d %H:%M:%S') #attend in late time
        ):
            checkin_status = 'late'
        elif session_2_start_time_plus_buffer and session_2_end_time_minus_buffer and SharedService.time_is_between(self, in_time.strftime('%Y-%m-%d %H:%M:%S'),
            session_2_start_time_plus_buffer.strftime('%Y-%m-%d %H:%M:%S'),
            session_2_end_time_minus_buffer.strftime('%Y-%m-%d %H:%M:%S') #attend in late time
        ):
            checkin_status = 'attending_session_2_but_late'
        elif session1_end_time_minus_late_buffer and session_2_start_time_plus_buffer and SharedService.time_is_between(self, in_time.strftime('%Y-%m-%d %H:%M:%S'),
            session1_end_time_minus_late_buffer.strftime('%Y-%m-%d %H:%M:%S'),
            session_2_start_time_plus_buffer.strftime('%Y-%m-%d %H:%M:%S')
        ):
            checkin_status = 'attending_session_2_present'
        elif session_2_start_time_plus_late_buffer and in_time > session_2_start_time_plus_late_buffer:
            checkin_status = 'absent'

        """ Find the checkout status ordering is important"""

        if out_time >= session_2_end_time_minus_buffer:
            checkout_status = 'present'
        elif SharedService.time_is_between(self, out_time.strftime('%Y-%m-%d %H:%M:%S'),
            session_2_end_time_minus_buffer.strftime('%Y-%m-%d %H:%M:%S'),
            shift_out_time.strftime('%Y-%m-%d %H:%M:%S')
        ):
            checkout_status = 'secondofflate' #leaving the  school in second off but leaving early
        elif session1_end_time and out_time >= session1_end_time:
            checkout_status = 'checkout_in_second_off_before_end' #checkouts after the session1
        elif session1_end_time_minus_late_buffer and out_time >= session1_end_time_minus_late_buffer:
            checkout_status = 'firsthalflate'
        else:
            checkout_status = 'absent'

        """ Find the checkin status """

        if checkin_status == 'absent' or checkout_status == 'absent':
            status = 'absent'
        elif checkin_status  == 'present' and checkout_status == 'present':
            status = 'present'
        elif checkin_status == 'present' and checkout_status == 'secondofflate':
            status = 'late'
        elif checkin_status == 'present' and checkout_status == 'checkout_in_second_off_before_end':
            status = 'halfday'
        elif checkin_status == 'present' and checkout_status == 'firsthalflate':
            status = 'halfdaylate'
        elif checkin_status == 'late' and checkout_status == 'present':
            status = 'late'
        elif checkin_status == 'late' and checkout_status == 'secondofflate':
            status = 'late'
        elif checkin_status == 'late' and checkout_status == 'checkout_in_second_off_before_end':
            status = 'lateandhalfday'
        elif checkin_status == 'late' and checkout_status == 'firsthalflate':
            status = 'halfdayandlate'
        elif checkin_status == 'attending_session_2_but_late' and checkout_status == 'present':
            status = 'halfdayandlate'
        elif checkin_status == 'attending_session_2_but_late' and checkout_status == 'secondofflate':
            status = 'halfdayandlate'
        elif checkin_status == 'attending_session_2_but_late' and checkout_status == 'checkout_in_second_off_before_end':
            status = 'absent'
        elif checkin_status == 'attending_session_2_but_late' and checkout_status == 'firsthalflate':
            status = 'absent'
        elif checkin_status == 'attending_session_2_present' and checkout_status == 'present':
            status = 'halfday'
        elif checkin_status == 'attending_session_2_present' and checkout_status == 'secondofflate':
            status = 'halfdayandlate'
        elif checkin_status == 'attending_session_2_present' and checkout_status == 'checkout_in_second_off_before_end':
            status = 'absent'
        elif checkin_status == 'attending_session_2_present' and checkout_status == 'firsthalflate':
            status = 'absent'
        return_data[student_id] = status
    return return_data


def add_user_attendance_machine(self, data, user_id, is_send_notification=True):
    punch_date_time = data['RealTime']['PunchLog']['LogTime']
    machine_user_id = data['RealTime']['PunchLog']['UserId']
    #handling for student
    user_obj = User.objects.filter(id=user_id).first()
    for_date = date_parser.parse(punch_date_time).date()
    time = date_parser.parse(punch_date_time).time()
    if user_obj.student_id:
        student_id = user_obj.student.id
        try:
            academic_year = AcademicYear.get_academic_year_for_date(self, for_date).id
        except:
            raise exceptions.ValidationError('Invalid academic year')
        date_format = '%Y-%m-%d %H:%M:%S'
        time = datetime.strptime(for_date.strftime("%Y-%m-%d") + ' ' + time.strftime('%H:%M:%S'), date_format) #converting like this because staff takes datetime
        is_machine_data_exist, machine_data = is_machine_attendance_exist(self, student_id, for_date, academic_year)
        is_skip_adding = False
        if is_machine_data_exist:
            if machine_data['in_time'] == time:
                return {'status': 'done'}
            elif machine_data['in_time'] > time:
                machine_data['out_time'] = machine_data['in_time']
                machine_data['in_time'] = time
            elif machine_data['out_time'] and machine_data['out_time'] > time:
                is_skip_adding = True
            else:
                machine_data['out_time'] = time
            time_difference = SharedService.get_time_string_difference(machine_data['in_time'].strftime(date_format), machine_data['out_time'].strftime(date_format), date_format)
            if time_difference < 5: #after 5minutes if user mark the attendance we wont consider
                is_skip_adding = True
            if not is_skip_adding:
                machine_data['in_time'] = machine_data['in_time'].strftime(date_format)
                machine_data['out_time'] = machine_data['out_time'].strftime(date_format)
            if not is_skip_adding:
                machine_data['status'] = get_student_attendance_status(self, [student_id], academic_year, for_date, machine_data['in_time'], machine_data['out_time'])[student_id]
                instance = MachineAttendance.objects.get(id=machine_data['id'])
                serializer = MachineAttendanceSerializer(instance=instance, data=machine_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        else:
            machine_data = {
                'student': student_id,
                'for_date': for_date,
                'in_time': time,
                'out_time': None,
                'academic_year': academic_year,
                'status': 'checkinmarked'
            }
            serializer = MachineAttendanceSerializer(data=machine_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        if is_send_notification:
            SharedService.custom_thread(send_notification_for_machine, self, machine_data)
    elif user_obj.staff_id:
        staff_id = user_obj.staff.id
        date_format = '%Y-%m-%d %H:%M:%S'
        time = datetime.strptime(for_date.strftime("%Y-%m-%d") + ' ' + time.strftime('%H:%M:%S'), date_format) #converting like this because staff takes datetime
        is_machine_data_exist, machine_data = is_staff_attendance_exist(self, staff_id, for_date)
        is_skip_adding = False
        if is_machine_data_exist:
            if machine_data['in_time'] == time:
                return {'status': 'done'}
            elif machine_data['in_time'] > time:
                machine_data['out_time'] = machine_data['in_time']
                machine_data['in_time'] = time
            elif machine_data['out_time'] and machine_data['out_time'] > time:
                is_skip_adding = True
            else:
                machine_data['out_time'] = time
            time_difference = SharedService.get_time_string_difference(machine_data['in_time'].strftime(date_format), machine_data['out_time'].strftime(date_format), date_format)
            if time_difference < 1: #after 5minutes if user mark the attendance we wont consider
                is_skip_adding = True
            if not is_skip_adding:
                machine_data['in_time'] = machine_data['in_time'].strftime(date_format)
                machine_data['out_time'] = machine_data['out_time'].strftime(date_format)
            machine_data = {
                'in_time': machine_data['in_time'],
                'staff_ids': [machine_data['staff_id']],
                'for_date': machine_data['for_date'].strftime("%Y-%m-%d"),
                'out_time': machine_data['out_time'],
                'id': machine_data['id']
            }
        else:
            machine_data = {
                'staff_ids': [staff_id],
                'for_date': for_date.strftime("%Y-%m-%d"),
                'in_time': for_date.strftime("%Y-%m-%d") + ' ' + time.strftime('%H:%M:%S'),
                'out_time': None,
            }
        if not is_skip_adding:
            staff_attendance_add(self, machine_data, False, 'machine_attendance', is_send_notification)
    else:
        raise exceptions.ValidationError('Unexpected user type')
    if not MachineAttendanceLog.objects.filter(operation=data['RealTime']['OperationID']).exists():
        temp = {
            'for_date': for_date,
            'operation': data['RealTime']['OperationID'],
            'json': json.loads(json.dumps(data, cls=DjangoJSONEncoder)),
            'machine_user_id': machine_user_id
        }
        MachineAttendanceLog.objects.create(
            **temp
        )
    return {'status': 'done'}

def is_machine_attendance_exist(self, student_id, for_date, academic_year):
    machine_data = MachineAttendance.objects.filter(student=student_id, for_date=for_date, academic_year=academic_year).values()
    if machine_data:
        return True, machine_data[0]
    return False, {}

def send_notification_for_machine(self, data):
    student_id = data['student_id'] if 'student_id' in data else data['student']
    users = User.objects.filter(student=student_id).first()
    customizedData = list()
    notification_obj = NotificationBodyTemplate('rfid_attendance_create')
    temp = {
        'student_name':users.student.first_name,
        'for_date': data['for_date'],
        'in_time': data['in_time'],
        'out_time': data['out_time'],
        'status': data['status']
    }
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    if users.student.email:
        customizedData.append({'email': users.student.email, 'user_id': users.pk, 'email_subject': None,
                                'email_body': body_email})
    customizedData.append(
        {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': users.pk, 'extra_params': {}}
    )
    send_notification('rfid_attendance_create', body=None, customizedData=customizedData)


def get_student_rfid_attendance_list(self, request):
    format = "%Y-%m-%d"
    academic_year = self.request.GET.get('academic_year')
    if not academic_year:
        raise exceptions.ValidationError('Academic year is mandaotry')
    if request.user.student:
        response = {'data': {'student_list': [{'student' : request.user.student.id}]}}
    else:
        response = get_enrolled_students(self)
        if not self.request.GET.get('pagination'):
            response = {'data': {'student_list': response['data']}}
    student_ids = []
    for student in response['data']['student_list']:
        student_ids.append(student['student'])
    academic_year_data = AcademicYear.objects.get(id=academic_year)
    start_date = academic_year_data.start_date.strftime(format)
    end_date = academic_year_data.end_date.strftime(format)
    now = datetime.now().date().strftime(format)
    total_number_of_holidays = len(HolidayCalenderStudent.get_upcoming_holidays(self, start_date, end_date))
    attendanc_count = {}
    if now < end_date and start_date < now:
        end_date = now
    for idx, data in enumerate(response['data']['student_list']):
        temp = get_rfid_student_attendance_individual(
            self, data['student'], academic_year, start_date, end_date
        )['report']
        response['data']['student_list'][idx]['total_number_of_working_days'] = temp['total_number_of_working_days']
        response['data']['student_list'][idx]['total_present_days'] = temp['total_present_days']
        response['data']['student_list'][idx]['percentage'] = temp['percentage']
        response['data']['student_list'][idx]['total_absent_days'] = temp['total_absent_days']
        response['data']['student_list'][idx]['total'] = temp['total_unmarked_days']
        response['data']['student_list'][idx]['total_number_of_holidays'] = total_number_of_holidays
    if request.user.student:
        return {'data': response['data']['student_list'][0] if response['data']['student_list'] else {}}
    return response

def get_student_attendance_list(self, request):
    from_date = self.request.GET.get('start_date')
    to_date = self.request.GET.get('end_date')
    format = "%Y-%m-%d"
    academic_year = self.request.GET.get('academic_year')
    if not academic_year:
        raise exceptions.ValidationError('Academic year is mandaotry')
    if request.user.student:
        response = {'data': {'student_list': [{'student' : request.user.student.id}]}}
    else:
        response = get_enrolled_students(self)
        if not self.request.GET.get('pagination'):
            response = {'data': {'student_list': response['data']}}
    student_ids = []
    for student in response['data']['student_list']:
        student_ids.append(student['student'])
    academic_year_data = AcademicYear.objects.get(id=academic_year)
    if from_date and to_date:
        start_date=from_date
        end_date=to_date
    else:
        start_date = academic_year_data.start_date.strftime(format)
        end_date = academic_year_data.end_date.strftime(format)
    now = datetime.now().date().strftime(format)
    total_number_of_holidays = len(HolidayCalenderStudent.get_upcoming_holidays(self, start_date, end_date))
    attendanc_count = {}
    if now < end_date and start_date < now:
        end_date = now
    for idx, data in enumerate(response['data']['student_list']):
        temp = get_student_attendance_individual(
            self, data['student'], academic_year, start_date, end_date
        )['report']
        response['data']['student_list'][idx]['total_number_of_working_days'] = temp['total_number_of_working_days']
        response['data']['student_list'][idx]['total_present_days'] = temp['total_present_days']
        response['data']['student_list'][idx]['percentage'] = temp['percentage']
        response['data']['student_list'][idx]['total_absent_days'] = temp['total_absent_days']
        response['data']['student_list'][idx]['total'] = temp['total_unmarked_days']
        response['data']['student_list'][idx]['total_number_of_holidays'] = total_number_of_holidays
    if request.user.student:
        return {'data': response['data']['student_list'][0] if response['data']['student_list'] else {}}
    return response

def get_student_subject_attendance_list(self, request):
    from_date = self.request.GET.get('start_date')
    to_date = self.request.GET.get('end_date')
    format = "%Y-%m-%d"
    academic_year = self.request.GET.get('academic_year')
    subject = self.request.GET.get('subject')
    for_date = self.request.GET.get('for_date')
    if not academic_year:
        raise exceptions.ValidationError('Academic year is mandaotry')
    if request.user.student:
        response = {'data': {'student_list': [{'student' : request.user.student.id}]}}
    else:
        response = get_enrolled_students(self)
        if not self.request.GET.get('pagination'):
            response = {'data': {'student_list': response['data']}}
    student_ids = []
    for student in response['data']['student_list']:
        student_ids.append(student['student'])
    academic_year_data = AcademicYear.objects.get(id=academic_year)
    if from_date and to_date:
        start_date=from_date
        end_date=to_date
    else:
        start_date = academic_year_data.start_date.strftime(format)
        end_date = academic_year_data.end_date.strftime(format)
    now = datetime.now().date().strftime(format)
    total_number_of_holidays = len(HolidayCalenderStudent.get_upcoming_holidays(self, start_date, end_date))
    attendanc_count = {}
    if now < end_date and start_date < now:
        end_date = now
    for idx, data in enumerate(response['data']['student_list']):
        temp = get_student_subject_attendance_individual(
            self, data['student'], int(academic_year),subject,start_date, end_date, for_date
        )
        response['data']['student_list'][idx]['subject_wise_attendance_report_academic'] = temp
        response['data']['student_list'][idx]['total_number_of_holidays'] = total_number_of_holidays
        # response['data']['student_list'][idx]['total_number_of_working_days'] = temp['total_number_of_working_days']
        # response['data']['student_list'][idx]['total_present_days'] = temp['total_present_days']
        # response['data']['student_list'][idx]['percentage'] = temp['percentage']
        # response['data']['student_list'][idx]['total_absent_days'] = temp['total_absent_days']
        # response['data']['student_list'][idx]['total'] = temp['total_unmarked_days']
    if request.user.student:
        return {'data': response['data']['student_list'][0] if response['data']['student_list'] else {}}
    return response

def get_student_attendance_individual(self, student_id, academic_year, from_date=None, to_date=None):
    try:
        studentId = self.request.user.student.id    
        is_login_student_same, is_student = SharedService.is_check_student_login_user_same(self, studentId)
        if is_student and not is_login_student_same:
            raise exceptions.ValidationError('Trying to get the other student details')
    except AttributeError:
        if student_id:
            studentId = student_id
        else:
            raise exceptions.ValidationError('Student ID is required')
    date_format = '%Y-%m-%d'
    academic_obj = AcademicYear.is_date_range_exist_in_academic_year(self, academic_year, from_date, to_date)
    if not from_date:
        from_date = academic_obj.start_date
    else:
        from_date = datetime.strptime(from_date, date_format).date()
    if not to_date:
        to_date = academic_obj.end_date
    else:
        to_date = datetime.strptime(to_date, date_format).date()
    now = datetime.now().date()
    if now < to_date and from_date < now:
        to_date = now
    attendance_data = Attendance.get_date_for_range_data(self, from_date, to_date, [student_id])
    report = {
        "total_present_days": 0,
        "total_absent_days": 0,
        "total_unmarked_days": 0,
        "total_number_of_working_days": 0
    }
    for attendance in attendance_data:
        if attendance['session_1_status'] == 'not marked':
            report['total_unmarked_days'] += 0.5
        elif attendance['session_1_status'] == 'present':
            report['total_present_days'] += 0.5
        elif attendance['session_1_status'] == 'absent':
            report['total_absent_days'] += 0.5
        if attendance['session_2_status'] == 'not marked':
            report['total_unmarked_days'] += 0.5
        elif attendance['session_2_status'] == 'present':
            report['total_present_days'] += 0.5
        elif attendance['session_2_status'] == 'absent':
            report['total_absent_days'] += 0.5

    holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date,
            to_date, True)
    if self.request.GET.get('ordering') and self.request.GET.get('ordering').startswith('-'):
        sorted_data = self.request.GET.get('ordering')[1:]
        attendance_data = sorted(attendance_data, key=lambda k: k[sorted_data], reverse=True)
    elif self.request.GET.get('ordering'):
        attendance_data = sorted(attendance_data, key=lambda k: k[self.request.GET.get('ordering')])
    else:
        attendance_data = sorted(attendance_data, key=lambda k: k['for_date'])
    student_non_working_days = Day.objects.filter(is_student_working_day=False).values_list('name', flat=True)
    if self.request.GET.get('limit') and self.request.GET.get('pageno'):
        attendance_data, count, next_page, previous_page = SharedService.custom_pagination(self, list(attendance_data),
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': attendance_data,
                    'student_non_working_days': student_non_working_days
        }}

    report['percentage'] = ((report['total_present_days'] / report['total_number_of_working_days'])*100) if report['total_number_of_working_days'] else 0
    return {
        'data': attendance_data, 'student_non_working_days': student_non_working_days, 'report': report,
        'holiday_list': holiday_list
    }

def get_student_subject_attendance_individual(self, student_id, academic_year, subject=None, from_date=None, to_date=None, for_date=None):
    try:
        studentId = self.request.user.student.id
        is_login_student_same, is_student = SharedService.is_check_student_login_user_same(self, studentId)
        if is_student and not is_login_student_same:
            raise exceptions.ValidationError('Trying to get the other student details')
    except AttributeError:
        if student_id:
            studentId = student_id
        else:
            raise exceptions.ValidationError('Student ID is required')

    date_format = '%Y-%m-%d'
    academic_obj = AcademicYear.is_date_range_exist_in_academic_year(self, academic_year, from_date, to_date)

    #  keep from_date & to_date logic unchanged
    if not from_date:
        from_date = academic_obj.start_date
    else:
        from_date = datetime.strptime(from_date, date_format).date()

    if not to_date:
        to_date = academic_obj.end_date
    else:
        to_date = datetime.strptime(to_date, date_format).date()

    now = datetime.now().date()
    if now < to_date and from_date < now:
        to_date = now

    standard_section = Enrollment.get_student_standard_for_academic(self, academic_obj.id, studentId, True)

    if not standard_section:
        raise exceptions.ValidationError('Not Enrolled to any section')

    # Base filter for range-based attendance
    filter_query = {
        'for_date__gte': from_date,
        'for_date__lte': to_date,
        'standard_section': standard_section['standard_section'],
    }

    subject_wise_report = {}
    base_report = {
        "total_present_days": 0,
        "total_absent_days": 0,
        "total_unmarked_days": 0,
        "total_unmarked_days": 0,
        "total_number_of_working_days": 0,
        "subject_id": None,
        "subject_name": "",
        "subject_codename": "",
        "percentage": 0
    }

    # Prepare subjects list
    if subject:
        sub = Subject.objects.get(id=subject)
        report = deepcopy(base_report)
        report.update({
            "subject_id": sub.id,
            "subject_name": sub.name,
            "subject_codename": sub.codename
        })
        subject_wise_report[sub.id] = report
        filter_query['subject'] = subject
    else:
        assigned_subjects = (
            AssignSubject.objects.filter(standard_section__section__is_active=True, standard_section=standard_section['standard_section'])
            .values('subject', 'subject__name', 'subject__codename', 'subject__sequence')
            .order_by('subject__sequence')
            .distinct()
        )
        for subject_obj in assigned_subjects:
            report = deepcopy(base_report)
            report.update({
                "subject_id": subject_obj['subject'],
                "subject_name": subject_obj['subject__name'],
                "subject_codename": subject_obj['subject__codename']
            })
            subject_wise_report[subject_obj['subject']] = report

    # Attendance calculations (range)
    attendance_data = SubjectAttendance.objects.filter(**filter_query)
    attendance_taken = attendance_data.values('transaction_id', 'subject_id').distinct()
    student_attendance = attendance_data.filter(student=studentId).values()

    student_attendance_dict = {sa['transaction_id']: sa for sa in student_attendance}

    for attendance in attendance_taken:
        sub_id = attendance['subject_id']
        if sub_id not in subject_wise_report:
            subject_wise_report[sub_id] = deepcopy(base_report)
        if attendance['transaction_id'] in student_attendance_dict and student_attendance_dict[attendance['transaction_id']]['status'] == "present":
            subject_wise_report[sub_id]['total_present_days'] += 1
        elif attendance['transaction_id'] in student_attendance_dict and student_attendance_dict[attendance['transaction_id']]['status'] == "absent":
            subject_wise_report[sub_id]['total_absent_days'] += 1
        else:
            subject_wise_report[sub_id]['total_unmarked_days'] += 1

        subject_wise_report[sub_id]['total_number_of_working_days'] += 1

    # Percentage calculation
    for sub_id, rep in subject_wise_report.items():
        if rep['total_number_of_working_days']:
            rep['percentage'] = (rep['total_present_days'] / rep['total_number_of_working_days']) * 100

    # Holidays and sorting (existing logic)
    holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date, to_date, True)

    if self.request.GET.get('ordering') and self.request.GET.get('ordering').startswith('-'):
        sorted_data = self.request.GET.get('ordering')[1:]
        student_attendance = sorted(student_attendance, key=lambda k: k[sorted_data], reverse=True)
    elif self.request.GET.get('ordering'):
        student_attendance = sorted(student_attendance, key=lambda k: k[self.request.GET.get('ordering')])
    else:
        student_attendance = sorted(student_attendance, key=lambda k: k['for_date'])

    student_non_working_days = Day.objects.filter(is_student_working_day=False).values_list('name', flat=True)

    #  NEW: Extra attendance for given for_date (if provided)
    
    for_date_attendance = {}
    if for_date:
        for_date_obj = datetime.strptime(for_date, date_format).date()

        # Build filter (only for single date)
        filter_query_for_date = {
            'for_date': for_date_obj,
            'standard_section': standard_section['standard_section']
        }
        if subject:
            filter_query_for_date['subject'] = subject

        # Prepare subject-wise base report (same as overall report)
        for_date_attendance = {}
        for sub_id, rep in subject_wise_report.items():
            for_date_attendance[sub_id] = {
                "subject_id": rep["subject_id"],
                "subject_name": rep["subject_name"],
                "subject_codename": rep["subject_codename"],
                "total_present_days": 0,
                "total_absent_days": 0,
                "total_unmarked_days": 0,
                "total_number_of_working_days": 0,
                "percentage": 0,
                "attendance_status": "unmarked"
            }

        # Fetch attendance (same logic as range)
        attendance_data_for_date = SubjectAttendance.objects.filter(**filter_query_for_date)
        attendance_taken_for_date = attendance_data_for_date.values('transaction_id', 'subject_id').distinct()
        student_attendance_for_date = attendance_data_for_date.filter(student=studentId).values()

        student_attendance_dict_for_date = {
            sa['transaction_id']: sa for sa in student_attendance_for_date
        }

        for attendance in attendance_taken_for_date:
            sub_id = attendance['subject_id']
            if sub_id not in for_date_attendance:
                # Initialize if subject wasn't in assigned_subjects
                sub_obj = Subject.objects.get(id=sub_id)
                for_date_attendance[sub_id] = {
                    "subject_id": sub_id,
                    "subject_name": sub_obj.name,
                    "subject_codename": sub_obj.codename,
                    "total_present_days": 0,
                    "total_absent_days": 0,
                    "total_unmarked_days": 0,
                    "total_number_of_working_days": 0,
                    "percentage": 0,
                    "attendance_status": "unmarked"
                }

            if attendance['transaction_id'] in student_attendance_dict_for_date and student_attendance_dict_for_date[attendance['transaction_id']]['status'] == 'present':
                for_date_attendance[sub_id]['total_present_days'] += 1
                for_date_attendance[sub_id]['attendance_status'] = "present"
            elif attendance['transaction_id'] in student_attendance_dict_for_date and student_attendance_dict_for_date[attendance['transaction_id']]['status'] == 'absent':
                for_date_attendance[sub_id]['total_absent_days'] += 1
                for_date_attendance[sub_id]['attendance_status'] = "absent"
            else:
                for_date_attendance[sub_id]['total_unmarked_days'] += 1
                for_date_attendance[sub_id]['attendance_status'] = "unmarked"
            for_date_attendance[sub_id]['total_number_of_working_days'] += 1

        # Calculate percentage (same as report)
        for sub_id, rep in for_date_attendance.items():
            if rep['total_number_of_working_days']:
                rep['percentage'] = (
                    rep['total_present_days'] / rep['total_number_of_working_days']
                ) * 100

    #  Pagination (unchanged)
    if self.request.GET.get('limit') and self.request.GET.get('pageno'):
        student_attendance, count, next_page, previous_page = SharedService.custom_pagination(
            self, list(student_attendance),
            self.request.GET.get('limit'),
            self.request.GET.get('pageno')
        )
        return {
            'data': {
                'count': count,
                'next': next_page,
                'previous': previous_page,
                'data_list': student_attendance,
                'student_non_working_days': student_non_working_days
            },
            'for_date_attendance': for_date_attendance
        }

    return {
        'data': student_attendance,
        'student_non_working_days': student_non_working_days,
        'report': subject_wise_report,
        'holiday_list': holiday_list,
        'for_date_attendance': for_date_attendance
    }


def get_rfid_student_attendance_individual(self, student_id, academic_year, from_date=None, to_date=None):
    is_login_student_same, is_student = SharedService.is_check_student_login_user_same(self, student_id)
    date_format = '%Y-%m-%d'
    if is_student and not is_login_student_same:
        raise exceptions.ValidationError('Trying to get the other student details')
    academic_obj = AcademicYear.is_date_range_exist_in_academic_year(self, academic_year, from_date, to_date)
    if not from_date:
        from_date = academic_obj.start_date
    else:
        from_date = datetime.strptime(from_date, date_format).date()
    if not to_date:
        to_date = academic_obj.end_date
    else:
        to_date = datetime.strptime(to_date, date_format).date()
    now = datetime.now().date()
    if now < to_date and from_date < now:
        to_date = now
    attendance_data = MachineAttendance.get_date_for_range_data(self, from_date, to_date, [student_id])
    report = {
        "total_present_days": 0,
        "total_absent_days": 0,
        "total_unmarked_days": 0,
        "total_number_of_working_days": 0
    }
    for attendance in attendance_data:
        if attendance['status'] == 'unmarked':
            report['total_unmarked_days'] += 0.5
        elif attendance['status'] == 'present':
            report['total_present_days'] += 1
        elif attendance['status'] == 'absent':
            report['total_absent_days'] += 0.5
        elif attendance['status'] == 'halfday':
            report['total_absent_days'] += 0.5

    holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date,
            to_date, True)
    if self.request.GET.get('ordering') and self.request.GET.get('ordering').startswith('-'):
        sorted_data = self.request.GET.get('ordering')[1:]
        attendance_data = sorted(attendance_data, key=lambda k: k[sorted_data], reverse=True)
    elif self.request.GET.get('ordering'):
        attendance_data = sorted(attendance_data, key=lambda k: k[self.request.GET.get('ordering')])
    else:
        attendance_data = sorted(attendance_data, key=lambda k: k['for_date'])
    student_non_working_days = Day.objects.filter(is_student_working_day=False).values_list('name', flat=True)
    if self.request.GET.get('limit') and self.request.GET.get('pageno'):
        attendance_data, count, next_page, previous_page = SharedService.custom_pagination(self, list(attendance_data),
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': attendance_data,
                    'student_non_working_days': student_non_working_days
        }}

    report['percentage'] = ((report['total_present_days'] / report['total_number_of_working_days'])*100) if report['total_number_of_working_days'] else 0
    return {
        'data': attendance_data, 'student_non_working_days': student_non_working_days, 'report': report,
        'holiday_list': holiday_list
    }

def get_machine_attendance_status(self, student_id, intime, outtime, fordate, academic_year):
    format = '%H:%M:%S'
    student_standard_section = Enrollment.get_student_standard_for_academic(self, academic_year, student_id, True)['standard_section']
    school_timing_data = get_school_timing_data_for_standard_section(self, student_standard_section, academic_year, fordate)
    if not school_timing_data:
        return None
    school_half_day_time = (datetime.strptime(school_timing_data['half_day_time'].strftime(format), format) - timedelta(0, (school_timing_data['allowable_late_minutes'] * 60))).time()
    school_half_day_time_plus_buffer = (datetime.strptime(school_timing_data['half_day_time'].strftime(format), format) + timedelta(0, (school_timing_data['allowable_late_minutes'] * 60))).time()
    school_start_time = (datetime.strptime(school_timing_data['start_time'].strftime(format), format) + timedelta(0, (school_timing_data['allowable_late_minutes'] * 60))).time()
    school_end_time = (datetime.strptime(school_timing_data['end_time'].strftime(format), format) - timedelta(0, (school_timing_data['allowable_late_minutes'] * 60))).time()
    is_intime_correct = True if intime <= school_start_time else False
    is_outtime_correct = True if outtime >= school_end_time else False
    status = 'absent'
    if is_intime_correct and is_outtime_correct:
        status = 'present'
    elif is_intime_correct and not is_outtime_correct and school_half_day_time <= outtime < school_end_time: #morning correct time but evening left after the break
        status = 'halfday'
    elif is_intime_correct and not is_outtime_correct and school_start_time <= outtime < school_half_day_time: #morning correct time but left in morning itself
        status = 'absent'
    elif is_outtime_correct and not is_intime_correct and school_start_time <= intime <= school_half_day_time_plus_buffer: #evening left correct but morning came before the second half starts
        status = 'halfday'
    elif is_outtime_correct and not is_intime_correct and school_half_day_time_plus_buffer <= intime <= school_end_time: #intime after afternoon
        status = 'absent'
    return status


def get_school_timing_data_for_standard_section(self, standard_section, academic_year, for_date):
    school_timing_parent = SchoolTimingParent.objects.filter(academic_year=academic_year).values()
    parent_id = None
    for timing_data in school_timing_parent:
        standard_section_ids = timing_data['standard_section_ids'].split(',')
        if str(standard_section) in standard_section_ids:
            parent_id = timing_data['id']
            break
    day_name = SharedService.get_day_for_date(for_date.strftime('%Y-%m-%d'))
    school_timing_data = SchoolTiming.objects.filter(school_timing_parent=parent_id, day__name=day_name).values()
    if school_timing_data:
        school_timing_data = school_timing_data[0]
    return school_timing_data

def get_school_timing_data_for_standard_sections(self, standard_section_ids, academic_year, for_date):
    school_timing_parent = SchoolTimingParent.objects.filter(academic_year=academic_year).values()
    parent_ids = []
    school_parent_standard_section_mapping = {}
    for school_timing in school_timing_parent:
        parent_ids.append(school_timing['id'])
        school_parent_standard_section_mapping[school_timing['id']] = school_timing['standard_section_ids'].split(',')
    day_name = SharedService.get_day_for_date(for_date.strftime('%Y-%m-%d'))
    school_timing_data = SchoolTiming.objects.filter(school_timing_parent__in=parent_ids, day__name=day_name).values()
    school_timing_day_mapping = {}
    for school_timing in school_timing_data:
        temp_standard_section_ids = school_parent_standard_section_mapping[school_timing['school_timing_parent_id']]
        for temp_stand_sect in temp_standard_section_ids:
            school_timing_day_mapping[temp_stand_sect] = school_timing
    return_data = {}
    for standard_section in standard_section_ids:
        if str(standard_section) in school_timing_day_mapping:
            return_data[standard_section] = school_timing_day_mapping[str(standard_section)]
        else:
            return_data[standard_section] = {}
    return return_data

def attendance_report(self, data):
    filters = data['filters']
    academic_year = filters['academic_year']
    for_date = filters.get('for_date')
    is_holiday = False
    is_non_working_day = False
    standard_ids=[]
    attendance_standard_section_session_mapping = {}
    if not for_date:
        raise exceptions.ValidationError('for_date is mandatory')
    temp_standard_section_data = get_standard_and_section(self, academic_year)
    subject_attendance_config = StandardAttendanceConfiguration.objects.filter().values()
    if subject_attendance_config:
        for standard in subject_attendance_config:
            standard_ids.append(standard['standard_id'])
        standard_section_ids = []
        standard_section_data={'data':[],'standard_section_ids':[]}
        for standard_section in temp_standard_section_data['data']:
            for section_data in standard_section['sections']:
                if standard_section['id'] in standard_ids:
                    standard_section_data['data'].append(standard_section)
                    standard_section_data['standard_section_ids'].append(section_data['standard_section'])
                    standard_section_ids.append(section_data['standard_section'])
    else:
        standard_section_ids = []
        standard_section_data={'data':[],'standard_section_ids':[]}
        for standard_section in temp_standard_section_data['data']:
            for section_data in standard_section['sections']:
                standard_section_data['data'].append(standard_section)
                standard_section_data['standard_section_ids'].append(section_data['standard_section'])
                standard_section_ids.append(section_data['standard_section'])
    student_list = Student.get_student_for_standard(academic_year, None, standard_section_ids, ['id'])
    standard_section_student_data = {}
    attendance_data =  Attendance.objects.filter(
        for_date=for_date
    ).values(
        'student', 'for_date', 'status', 'session', 'marked_by__staff__first_name',
        'marked_by__staff__middle_name', 'marked_by__staff__last_name', 'marked_by','standard_section'
    )
    for attendance in attendance_data:
        if attendance['standard_section'] not in attendance_standard_section_session_mapping:
            attendance_standard_section_session_mapping[attendance['standard_section']] = []
        if attendance['session'] not in attendance_standard_section_session_mapping[attendance['standard_section']]:
            attendance_standard_section_session_mapping[attendance['standard_section']].append(attendance['session'])
    holiday_status = HolidayCalenderStudent.get_upcoming_holidays(self, for_date, for_date)
    if for_date in holiday_status:
        is_holiday = True
    if SharedService.get_day_for_date(for_date) not in Day.get_student_working_days(self):
        is_non_working_day = True
    attendance_data_mapping = {}
    block_attendance_on_holiday_or_nonworking = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'block_attendance_on_holiday_or_nonworking')
    for attendance in attendance_data:
        if attendance['student'] not in attendance_data_mapping:
            attendance_data_mapping[attendance['student']] = {
                'present': 0, 'absent': 0, 'is_unmarked': True,
                'is_unmarked_session_1': True, 'is_unmarked_session_2': True,
                'marked_by': attendance['marked_by'],
                'marked_by_name': get_full_name(attendance['marked_by__staff__first_name'],attendance['marked_by__staff__middle_name'],attendance['marked_by__staff__last_name'])
            }
        if attendance['session'] == 'Session1':
            attendance_data_mapping[attendance['student']]['is_unmarked_session_1'] = False
        else:
            attendance_data_mapping[attendance['student']]['is_unmarked_session_2'] = False
        attendance_data_mapping[attendance['student']]['is_unmarked'] = False
        if attendance['status'] == 'present' and len(attendance_standard_section_session_mapping[attendance['standard_section']]) == 2:
            attendance_data_mapping[attendance['student']]['present'] += 0.5
        if attendance['status'] == 'present' and len(attendance_standard_section_session_mapping[attendance['standard_section']]) == 1:
            attendance_data_mapping[attendance['student']]['present'] += 1
        if attendance['status'] == 'absent' and len(attendance_standard_section_session_mapping[attendance['standard_section']]) == 2:
            attendance_data_mapping[attendance['student']]['absent'] += 0.5
        if attendance['status'] == 'absent' and len(attendance_standard_section_session_mapping[attendance['standard_section']]) == 1:
            attendance_data_mapping[attendance['student']]['absent'] += 1
    for student_data in student_list:
        if student_data['standard_section'] not in standard_section_student_data:
            standard_section_student_data[student_data['standard_section']] = {
                'strength': 0, 'total_present': 0, 'total_absent': 0, 'is_unmarked': True, 
                'marked_by': ''
            }
        if student_data['id'] in attendance_data_mapping:
            standard_section_student_data[student_data['standard_section']]['is_unmarked'] = False
            standard_section_student_data[student_data['standard_section']]['total_present'] += attendance_data_mapping[student_data['id']]['present']
            standard_section_student_data[student_data['standard_section']]['total_absent'] += attendance_data_mapping[student_data['id']]['absent']
        standard_section_student_data[student_data['standard_section']]['strength'] += 1
    return_data={'standard_data':{},'data':[]}
    for standard in standard_section_data['data']:
        for standard_sec in standard['sections']:
            if standard_sec['standard_section'] not in standard_section_student_data:
                standard_sec.update({'strength': 0, 'total_present': 0, 'is_unmarked': True, 'total_absent': 0})
            else:
                standard_sec.update({
                    'strength': standard_section_student_data[standard_sec['standard_section']]['strength'],
                    'total_present': standard_section_student_data[standard_sec['standard_section']]['total_present'],
                    'total_absent': standard_section_student_data[standard_sec['standard_section']]['total_absent'],
                    'is_unmarked': standard_section_student_data[standard_sec['standard_section']]['is_unmarked'],
                })
            standard_sec['show_mark_attendance'] = True
            if block_attendance_on_holiday_or_nonworking and (is_holiday or is_non_working_day):
                standard_sec['show_mark_attendance'] = False
        if standard['id'] not in return_data['data']:
            return_data['standard_data'][standard['id']]=standard
    return_data['data'] = list(return_data['standard_data'].values())
    return return_data