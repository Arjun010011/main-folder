from datetime import datetime , timedelta, time as time_class
import random
import pytz
from django.utils.dateformat import format as date_format

from django.db.models import F, Value, CharField, Count
from django.db.models.functions import Concat
from rest_framework import exceptions

from apps.classes.models import Enrollment,SubjectStudent
from apps.classes.models.attendance import Attendance,SubjectAttendance,StandardAttendanceConfiguration
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.services.enrollment import get_enrolled_students
from apps.classes.services.standard import get_standard_and_section
from apps.general.models import HolidayCalender
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.hr.models import Day
from apps.institutes.models import Institute
from apps.institutes.models.academicYear import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer
from apps.shared.services import FormdefinitionService, SharedService, PDFService, NotificationBodyTemplate
from apps.shared.services_shared.common import get_full_name
from apps.students.models import Student
from apps.users.models import User
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.classes.services.attendance import get_working_dates
from apps.hr.services.timetable import get_date_range,read_scheduled_data
from apps.hr.models.timeTable import TimeTableSchedule, TimeTableScheduleParent
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.institutes.models.institute import Institute
from apps.institutes.serializers import InstituteSerializer
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.hr.models import StaffHourSubjectMapping
from rest_framework.exceptions import ValidationError
from apps.classes.models.subject import Subject

def add_subject_attendance_bulk(self, data):
#     "subject" : [
# {
# "subject_id" : 1,
# "attendance": [
# {
# "student_id" : 1,
# "status" : "present"
# }
# ]
# ]
    format = "%Y-%m-%d"
    time_format = "%H:%M:%S"
    from_date = data['from_date']
    to_date = data['to_date']
    from_time = data['from_time']
    to_time = data['to_time']
    standard_section = data['standard_section']
    if 'timetable_schedule' in data and data['timetable_schedule']:
        timetable_schedule = data['timetable_schedule']
    if SubjectAttendance.objects.filter(for_date__gte=from_date,for_date__lte=to_date,
                                        standard_section=standard_section,from_time__gte=from_time,
                                        to_time__lte=to_time) and 'transaction_id' not in data:
        raise exceptions.ValidationError('Attendance is already marked for this time.')
    with transaction.atomic(using=get_current_db_name()):
        date_range_list = get_working_dates(self, from_date, to_date)
        if not date_range_list:
            raise exceptions.ValidationError('Your mostly marking attendance on non working daysS')
        for sub in data['subject']:
            if 'transaction_id' in data and data['transaction_id']:
                transaction_id = data['transaction_id']
            else:
                transaction_id = datetime.now(pytz.timezone('Asia/Kolkata')).strftime("%Y%m%d%H%M%S%f")
            for for_date in date_range_list:
                temp = {
                    'for_date': for_date.strftime(format),
                    'from_time': from_time,
                    'to_time' : to_time,
                    'subject': sub['subject_id'],
                    'standard_section': standard_section,
                    'attendance': sub['attendance'],
                    'transaction_id': transaction_id,
                    'marked_by': self.request.user.id,
                    'marked_from': 'bulk'}
                if 'period_day_mapping' in  data and data['period_day_mapping']:
                    temp['period_day_mapping'] = data['period_day_mapping']
                if 'timetable_schedule' in data and data['timetable_schedule']:
                    temp['timetable_schedule'] = data['timetable_schedule']
                add_subject_attendance(self, temp)
    return {'Reason': 'Data Saved Successfully'}

def upload_subject_attendance_bulk(self, data):
    """
    Alias for add_subject_attendance_bulk to handle bulk upload requests.
    This function is used when 'upload_bulk' or 'upload_subject_attendance_bulk' is in the request data.
    """
    return add_subject_attendance_bulk(self, data)

def update_subject_attendance_bulk(self, data):
    standard_section = data["standard_section"]
    from_date = data["from_date"]
    to_date = data["to_date"]

    date_range_list = get_working_dates(self, from_date, to_date)
    if not date_range_list:
        raise exceptions.ValidationError(
            "Attendance cannot be marked on non-working days"
        )

    with transaction.atomic(using=get_current_db_name()):

        for sub in data["subject"]:
            subject_id = sub["subject_id"]
            max_days = sub["max_days"]
            present_required = sub["present_obtained"]
            students = sub["students"]
            absent_required = max_days - present_required
            for st_id in students:
                existing = SubjectAttendance.objects.filter(
                    for_date__range=[from_date, to_date],
                    subject_id=subject_id,
                    standard_section_id=standard_section,
                    student_id=st_id
                )

                current_present = existing.filter(status="present").count()
                current_absent = existing.filter(status="absent").count()
                current_total = current_present + current_absent
                remaining_present = max(present_required - current_present, 0)
                remaining_absent = max(absent_required - current_absent, 0)
                if remaining_present == 0 and remaining_absent == 0:
                    continue
                existing_dates = set(
                    existing.values_list("for_date", flat=True)
                )
                missing_dates = [
                    d for d in date_range_list if d not in existing_dates
                ]
                total_needed = remaining_present + remaining_absent
                if total_needed > len(missing_dates):
                    available_dates = len(missing_dates)
                    if remaining_present >= available_dates:
                        remaining_present = available_dates
                        remaining_absent = 0
                    else:
                        remaining_absent = min(remaining_absent, available_dates - remaining_present)
                present_dates = missing_dates[:remaining_present]
                absent_dates = missing_dates[
                    remaining_present:remaining_present + remaining_absent
                ]

                defaults_present = {
                    "status": "present",
                    "marked_by": self.request.user,
                    "marked_from": "bulk"
                }

                defaults_absent = {
                    "status": "absent",
                    "marked_by": self.request.user,
                    "marked_from": "bulk"
                }

                if data.get("period_day_mapping"):
                    defaults_present["period_day_mapping_id"] = data["period_day_mapping"]
                    defaults_absent["period_day_mapping_id"] = data["period_day_mapping"]

                if data.get("timetable_schedule"):
                    defaults_present["timetable_schedule_id"] = data["timetable_schedule"]
                    defaults_absent["timetable_schedule_id"] = data["timetable_schedule"]

                for dt in present_dates:
                    SubjectAttendance.objects.update_or_create(
                        student_id=st_id,
                        subject_id=subject_id,
                        standard_section_id=standard_section,
                        for_date=dt,
                        defaults=defaults_present
                    )

                for dt in absent_dates:
                    SubjectAttendance.objects.update_or_create(
                        student_id=st_id,
                        subject_id=subject_id,
                        standard_section_id=standard_section,
                        for_date=dt,
                        defaults=defaults_absent
                    )

    return {"Reason": "Attendance balanced & updated successfully"}



def add_subject_attendance(self, data):
    if SharedService.date_to_obj(data['for_date']) > datetime.today().date():
        raise exceptions.ValidationError('Marking attendance for future date.')
    if SharedService.datetime_to_obj(data['from_time']) > datetime.today():
        raise exceptions.ValidationError('Marking attendance for future time.')
    strength = Enrollment.objects.filter(standard_section=data['standard_section'], student__is_active=True).values('standard_section').annotate(
        count=Count('standard_section'))
    if not strength:
        raise exceptions.ValidationError('Students are not enrolled to the standard/section.')
    standardsection_data = StandardSectionMapping.objects.filter(id=data['standard_section']).first()
    subject_strength = SubjectStudent.objects.filter(academic_year=standardsection_data.academic_year, student__is_active=True,subject = data['subject']).values('subject').annotate(
        subject_count=Count('subject'))
    if not subject_strength:
        raise exceptions.ValidationError('Subject is not assigned to students.')
    subject_count = len(data['attendance'])
    subject_strength = strength[0]['count']
    # if subject_count != subject_strength:
    #     raise exceptions.ValidationError(
    #         f'{subject_strength} student(s) are assigened. marking attendance for {subject_count} student(s)')
    dataList = list()
    students = list()
    data['student_attendance']={}
    attendance_data = SubjectAttendance.objects.filter(transaction_id=data['transaction_id']).values('student', 'id')
    attendance_data = {str(atd['student']): atd for atd in attendance_data}
    for attendance in data['attendance']:
        if attendance['student_id'] not in data['student_attendance']:
            data['student_attendance'][attendance['student_id']] = attendance['status']
        temp = {'for_date': data['for_date'], 'subject': data['subject'], 'standard_section': data['standard_section'], 'transaction_id':data['transaction_id'],
             'student': attendance['student_id'], 'status': attendance['status'],'from_time':data['from_time'],'to_time':data['to_time'],'marked_by':data['marked_by'],
             'marked_from': data.get('marked_from', 'normal')}
        if 'period_day_mapping' in data and data['period_day_mapping']:
            temp['period_day_mapping']= data['period_day_mapping']
        if 'timetable_schedule' in data and data['timetable_schedule']:
            temp['timetable_schedule'] = data['timetable_schedule']
        if str(attendance['student_id']) in attendance_data:
            temp['id'] = attendance_data[str(attendance['student_id'])]['id']
        dataList.append(
            temp
        )
        students.append(attendance['student_id'])
    response = SharedService.add_or_update_data(self, dataList)
    if students:
        SharedService.custom_thread(subject_attendance_notification, self, data, students)
    return response


def subject_attendance_notification(self, data, students):
    users = User.objects.filter(student__in=students)
    customizedData = list()
    customizedPresentData = list()
    staff_first_name = self.request.user.staff.first_name if self.request.user.staff else ''
    notification_obj = NotificationBodyTemplate('subject_attendance_create')
    notification_present_obj = NotificationBodyTemplate('subject_attendance_present_create')
    for student in users:
        status=data['student_attendance'][student.student.id]
        temp = {
            'student_name':student.student.first_name,
            'fordate':SharedService.date_to_obj(data["for_date"]).strftime("%d/%m/%Y"),
            'subject':data['subject'],
            'staffname':staff_first_name,
            'status':status,
            'from_time':data['from_time'],
            'to_time':data['to_time']
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
    send_notification('subject_attendance_create', body=None, customizedData=customizedData)
    send_notification('subject_attendance_present_create', body=None,customizedData=customizedPresentData)


def get_subject_attendance(self):
    request={}
    time_table_schedule_parent=None
    for_date = self.request.GET.get('for_date')
    from_time = self.request.GET.get('from_time')
    to_time = self.request.GET.get('to_time')
    subject = self.request.GET.get('subject')
    standard_section = self.request.GET.get('standard_section')
    day = datetime.strptime(for_date, '%Y-%m-%d').strftime('%A')
    working_days = Day.get_student_working_days(self)
    if self.request.GET.get('academic_year'):
        academic_year = self.request.GET.get('academic_year')
        request['academic_year'] = academic_year
    else:
        current_academic_year = AcademicYear.get_academic_year_for_date(self, for_date)
        request['academic_year']=current_academic_year.id
    response = get_date_range(self, request)
    for_date_obj = datetime.strptime(for_date, "%Y-%m-%d").date()
    staff_subject_mapping=0
    if not self.request.user.is_anonymous and not self.request.user.is_superuser and self.request.user and self.request.user.staff:
        staff_subject_mapping = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'is_subject_attendance_staff_subject_map')
        if int(staff_subject_mapping):
            staff_assigned_standard_list = StaffStandardMapping.objects.filter(staff=self.request.user.staff).values_list('standard', flat=True)
            staff_assigned_subject_list = StaffHourSubjectMapping.objects.filter(staff_teaching_hour__staff=self.request.user.staff,staff_teaching_hour__academic_year=academic_year).values_list('subject',flat=True)
    if self.request.GET.get('print_report'):
        attendance_qs = SubjectAttendance.objects.filter(for_date=for_date_obj).annotate(
                staff_full_name=Concat(
                    F('marked_by__staff__first_name'),
                    Value(' '),
                    F('marked_by__staff__middle_name'),
                    Value(' '),
                    F('marked_by__staff__last_name'),
                    output_field=CharField()
                )
            ).values(
                'for_date', 'subject', 'status', 'standard_section', 'student', 'marked_by','standard_section__standard__name','subject__name',
                'from_time', 'to_time', 'subject_id', 'student_id', 'transaction_id', 'staff_full_name','period_day_mapping__period__name'
            )
        attendance_list = list(attendance_qs)
        unique_attendance = {att['transaction_id']: att for att in attendance_list}.values()
        selected_template_obj = get_selected_template(self, 'subject_staff_attendance_report', None, 'guptha_report.html',None,None,None,None,True)
        path = 'subject_staff_attendance_report/'+selected_template_obj['path']
        institute_obj = Institute.get_institute(self)
        response['data'] = unique_attendance
        response['for_date'] = for_date_obj
        response['institute'] = InstituteSerializer(institute_obj).data
        response['institute']['address'] = institute_obj.address
        response['institute']['city'] = institute_obj.city
        response['institute']['pincode'] = institute_obj.pincode
        response = PDFService.receipt_new(self, response, "subject_staff_attendance_report", path, False)
        return response
    time_table_data = {}
    if response['data']:
        for data in response['data']:
            if 'assigned_classes' in data:
                for classes in data['assigned_classes']:
                    if 'section_list' in  classes:
                        for section in classes['section_list']:
                            if section['standard_section'] == int(standard_section):
                                time_table_schedule_parent = section['time_table_schedule_parent']
    if time_table_schedule_parent:
        timetable_request = {
            "standard_section":standard_section,
            "is_active":True,
            "time_table_schedule_parent":time_table_schedule_parent
        }
        time_table_response = read_scheduled_data(self,None,timetable_request)
        for period_plan in time_table_response['data']['period_period_plan']:
            for period_day in period_plan['perioddaymapping_period']:
                if period_day['day_name'] == SharedService.get_day_for_date(for_date):
                    if 'assignedData' in period_day and 'subject' in period_day['assignedData']:
                        if period_day['assignedData']['subject'] not in time_table_data:
                            time_table_data[period_day['assignedData']['subject']]={}
                        key=str(period_day['assignedData']['period_start_time'])+'-'+str(period_day['assignedData']['period_end_time'])
                        if key not in time_table_data[period_day['assignedData']['subject']]:
                            time_table_data[period_day['assignedData']['subject']][key]={}
                        time_table_data[period_day['assignedData']['subject']][key]['period_start_time'] = period_day['assignedData']['period_start_time']
                        time_table_data[period_day['assignedData']['subject']][key]['period_end_time'] = period_day['assignedData']['period_end_time']
                        time_table_data[period_day['assignedData']['subject']][key]['staff'] = period_day['assignedData']['staff']
                        time_table_data[period_day['assignedData']['subject']][key]['staff_name'] = period_day['assignedData']['full_name']
                        time_table_data[period_day['assignedData']['subject']][key]['subject'] = period_day['assignedData']['subject']
                        # for time_table_schedule_staff_subject_batch in period_day['assignedData']['id']:
                        time_table_data[period_day['assignedData']['subject']][key]['timetable_schedule'] = period_day['assignedData']['id']
                    # if 'assignedData' in period_day:
                    #     for assignedData in period_day['assignedData']:
                    #         if 'subject' in assignedData:
                    #             if assignedData['subject'] not in time_table_data:
                    #                 time_table_data[assignedData['subject']]={}
                    #             key=str(assignedData['period_start_time'])+'-'+str(assignedData['period_end_time'])
                    #             if key not in time_table_data[assignedData['subject']]:
                    #                 time_table_data[assignedData['subject']][key]={}
                    #             time_table_data[assignedData['subject']][key]['period_start_time'] = assignedData['period_start_time']
                    #             time_table_data[assignedData['subject']][key]['period_end_time'] = assignedData['period_end_time']
                    #             time_table_data[assignedData['subject']][key]['staff'] = assignedData['staff']
                    #             time_table_data[assignedData['subject']][key]['staff_name'] = assignedData['full_name']
                    #             time_table_data[assignedData['subject']][key]['subject'] = assignedData['subject']
                    #             for time_table_schedule_staff_subject_batch in assignedData['timetable_schedule_staff_subject_batch']:
                    #                 time_table_data[assignedData['subject']][key]['timetable_schedule'] = time_table_schedule_staff_subject_batch['timetable_schedule']
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
    attendance = SubjectAttendance.objects.filter(standard_section=standard_section,for_date=for_date_obj).values(
        'for_date', 'subject', 'status', 'standard_section', 'student', 'marked_by','from_time','to_time','subject_id','student_id','marked_by__staff__first_name','marked_by__staff__middle_name',
        'marked_by__staff__last_name','transaction_id'
    )
    queryset = self.filter_queryset(self.get_queryset())
    data = queryset.values('standard_section','standard_section__section__name','standard_section__section_id','id','subject_id','subject__name','standard_section__standard__name','standard_section__standard').order_by('subject__name')
    # standard_section_ids = [row_data['standard_section'] for row_data in data]
    subject_ids = [row_data['subject_id'] for row_data in data]
    student_section_enrolment = Enrollment.objects.filter(standard_section=standard_section).values()
    section_stu_list = [enrol['student_id'] for enrol in student_section_enrolment]
    student_subject_assignment_data = SubjectStudent.objects.filter(subject__in = subject_ids,student__is_active=True,student__in=section_stu_list,academic_year=academic_year).values()
    # enrollment_data = Enrollment.objects.filter(
    #     standard_section__in=standard_section_ids, student__is_active=True
    # ).values(
    #     'id', 'standard_section', 'standard_section__standard', 'standard_section__section', 'student'
    # )
    subject_enrol={}
    student_subject_mapping ={}
    for sub_data in student_subject_assignment_data:
        if sub_data['subject_id'] not in subject_enrol:
            subject_enrol[sub_data['subject_id']]=0
        subject_enrol[sub_data['subject_id']]+=1
        if sub_data['student_id'] not in student_subject_mapping:
            student_subject_mapping[sub_data['student_id']] = []
        student_subject_mapping[sub_data['student_id']].append(sub_data['subject_id'])
    attendance_subject_mapping={}
    for attendance_row in attendance:
        key1 = attendance_row['from_time'].strftime("%H:%M:%S")+'-'+attendance_row['to_time'].strftime("%H:%M:%S")
        subject = attendance_row['subject_id']
        if subject not in attendance_subject_mapping:
            attendance_subject_mapping[subject]={}#present':0,'absent':0}
        if key1 not in attendance_subject_mapping[subject]:
            attendance_subject_mapping[subject][key1] = {'present':0,'absent':0}
        if attendance_row['status'] =='present':
            attendance_subject_mapping[subject][key1]['present'] += 1
        else:
            attendance_subject_mapping[subject][key1]['absent'] += 1
        attendance_subject_mapping[subject][key1]['transaction_id']=attendance_row['transaction_id']
        attendance_subject_mapping[subject][key1]['from_time']=attendance_row['from_time']
        attendance_subject_mapping[subject][key1]['to_time']=attendance_row['to_time']
        attendance_subject_mapping[subject][key1]['staff_marked']=get_full_name(attendance_row['marked_by__staff__first_name'],
                                                                          attendance_row['marked_by__staff__middle_name'],
                                                                          attendance_row['marked_by__staff__last_name'])

    # for subject in student_subject_assignment_data:
    #     subject['strength'] =0
    #     if subject['subject_id'] in subject_enrol:
    #         subject['strength'] = subject_enrol[subject['subject_id']]
    #     if subject['subject_id'] not in attendance_subject_mapping:
    #         sub= {'present':0,'absent':0}
    #     else:
    #         sub=attendance_subject_mapping[subject['subject_id']]
    #     present = sub['present']
    #     subject.update({'total_present':present})
    return_data = []
    for subject_section in data:
        subject_section['strength']=0
        subject_section['period_start_time']=""
        subject_section['period_end_time']=""
        subject_section['staff']=""
        subject_section['staff_name']=""
        subject_section['transaction_id']=""
        subject_section['timetable_schedule']=""
        time_table_subject_data={}
        if subject_section['subject_id'] in subject_enrol:
            subject_section['strength'] = subject_enrol[subject_section['subject_id']]
        if time_table_data and subject_section['subject_id'] in time_table_data:
            for subject in time_table_data[subject_section['subject_id']]:
                key = str(time_table_data[subject_section['subject_id']][subject]['period_start_time'])+'-'+str(time_table_data[subject_section['subject_id']][subject]['period_end_time'])
                if subject_section['subject_id'] not in time_table_subject_data:
                    time_table_subject_data[subject_section['subject_id']]={}
                if key not in time_table_subject_data[subject_section['subject_id']]:
                    time_table_subject_data[subject_section['subject_id']][key]={}
                if 'period_start_time' in time_table_data[subject_section['subject_id']][subject]:
                    time_table_subject_data[subject_section['subject_id']][key]['period_start_time']=time_table_data[subject_section['subject_id']][subject]['period_start_time']
                if 'period_end_time' in time_table_data[subject_section['subject_id']][subject]:
                    time_table_subject_data[subject_section['subject_id']][key]['period_end_time']=time_table_data[subject_section['subject_id']][subject]['period_end_time']
                if 'staff' in time_table_data[subject_section['subject_id']][subject]:
                    time_table_subject_data[subject_section['subject_id']][key]['staff']=time_table_data[subject_section['subject_id']][subject]['staff']
                if 'staff_name' in time_table_data[subject_section['subject_id']][subject]:
                    time_table_subject_data[subject_section['subject_id']][key]['staff_name']=time_table_data[subject_section['subject_id']][subject]['staff_name']
                if 'timetable_schedule' in time_table_data[subject_section['subject_id']][subject]:
                    time_table_subject_data[subject_section['subject_id']][key]['timetable_schedule']=time_table_data[subject_section['subject_id']][subject]['timetable_schedule'] 
        if subject_section['subject_id'] not in attendance_subject_mapping and subject_section['subject_id'] not in time_table_subject_data:
            sub= {'present':0,'absent':0,'staff_marked':'','from_time':'','to_time':'','transaction_id':'','period_start_time':'','period_end_time':'',
                  'staff_name':0}
            if subject_section['period_start_time']:
                sub['period_start_time']=subject_section['period_start_time']
            if subject_section['period_end_time']:
                sub['period_end_time']=subject_section['period_end_time']
            if subject_section['staff_name']:
                sub['staff_name']=subject_section['staff_name']
            subject_section.update({'total_present':sub['present'],'period_start_time':sub['period_start_time'],
                                'total_absent':sub['absent'],'period_end_time':sub['period_end_time'],
                                'attendance_marked_staff':sub['staff_marked'],'staff_name':sub['staff_name'],
                                'from_time':sub['from_time'],
                                'to_time':sub['to_time'],'transaction_id':sub['transaction_id'],}) 
            return_data.append(subject_section)
        elif subject_section['subject_id'] in time_table_subject_data and subject_section['subject_id'] not in attendance_subject_mapping:
            for key in time_table_subject_data[subject_section['subject_id']]:
                period_data = time_table_subject_data[subject_section['subject_id']][key]
                temp_subject_data = subject_section.copy()
                sub= {'present':0,'absent':0,'staff_marked':'','from_time':'','to_time':'','transaction_id':'','period_start_time':'','period_end_time':'',
                      'staff_name':'','timetable_schedule':''}
                if period_data['period_start_time']:
                    sub['period_start_time']=period_data['period_start_time']
                if period_data['period_end_time']:
                    sub['period_end_time']=period_data['period_end_time']
                if period_data['staff_name']:
                    sub['staff_name']=period_data['staff_name']
                if 'timetable_schedule' in period_data and period_data['timetable_schedule']:
                    sub['timetable_schedule']=period_data['timetable_schedule']
                temp_subject_data.update({'total_present':sub['present'],'period_start_time':sub['period_start_time'],
                                'total_absent':sub['absent'],'period_end_time':sub['period_end_time'],
                                'attendance_marked_staff':sub['staff_marked'],'staff_name':sub['staff_name'],
                                'from_time':sub['from_time'],
                                'to_time':sub['to_time'],'transaction_id':sub['transaction_id'],'timetable_schedule':sub['timetable_schedule']})  
                return_data.append(temp_subject_data)
        else:
            for index,attendance_transaction in enumerate(attendance_subject_mapping[subject_section['subject_id']]):
                transaction = attendance_subject_mapping[subject_section['subject_id']][attendance_transaction]
                temp_subject_section = subject_section.copy()
                temp_subject_section.update({'total_present':transaction['present'],
                            'total_absent':transaction['absent'],
                            'attendance_marked_staff':transaction['staff_marked'],
                            'from_time':transaction['from_time'],
                            'to_time':transaction['to_time'],'transaction_id':transaction['transaction_id']}) 
                if subject_section['subject_id'] in time_table_subject_data and attendance_transaction in time_table_subject_data[subject_section['subject_id']]:
                    temp_subject_section.update({
                        'period_start_time':time_table_subject_data[subject_section['subject_id']][attendance_transaction]['period_start_time'],
                        'period_end_time':time_table_subject_data[subject_section['subject_id']][attendance_transaction]['period_end_time'],
                        'staff_name':time_table_subject_data[subject_section['subject_id']][attendance_transaction]['staff_name'],
                        # 'timetable_schedule':time_table_subject_data[subject_section['subject_id']][attendance_transaction]['timetable_schedule']
                    })
                    if 'timetable_schedule' in time_table_subject_data[subject_section['subject_id']][attendance_transaction]:
                        temp_subject_section['timetable_schedule'] = time_table_subject_data[subject_section['subject_id']][attendance_transaction]['timetable_schedule']
                else:
                    temp_subject_section.update({
                        'period_start_time':'',
                        'period_end_time':'',
                        'staff_name':''
                    })
                return_data.append(temp_subject_section)
    response_data = []
    if int(staff_subject_mapping) and not self.request.user.is_anonymous and not self.request.user.is_superuser and self.request.user and self.request.user.staff:
        for subject in return_data:
            if subject['standard_section__standard'] in staff_assigned_standard_list and subject['subject_id'] in staff_assigned_subject_list:
                response_data.append(subject)
    else:
        response_data = return_data
        # present = sub['present']
        # absent = sub['absent']
        # staff_marked = sub['staff_marked']
        # from_time = sub['from_time']
        # to_time = sub['to_time']
        # transaction_id = sub['transaction_id']
        # subject_section.update({'total_present':present,
        #                         'total_absent':absent,
        #                         'attendance_marked_staff':staff_marked,
        #                         'from_time':from_time,
        #                         'to_time':to_time,'transaction_id':transaction_id})
    return {'data': {'data_list': response_data, 'holiday_reason': holiday_reason, 'is_attendance_marked': True if attendance else False}}

def get_subject_attendance_single_report(self):
    request={}
    time_table_schedule_parent=None
    for_date = self.request.GET.get('for_date')
    day = datetime.strptime(for_date, '%Y-%m-%d').strftime('%A')
    working_days = Day.get_student_working_days(self)
    current_academic_year = AcademicYear.get_academic_year_for_date(self, for_date)
    request['academic_year']=current_academic_year.id
    response = get_date_range(self, request)
    for_date_obj = datetime.strptime(for_date, "%Y-%m-%d").date()
    staff_subject_mapping=0
    time_table_data = {}
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
    attendance = SubjectAttendance.objects.filter(for_date=for_date_obj).values(
        'for_date', 'subject', 'status', 'standard_section', 'student', 'marked_by','from_time','to_time','subject_id','student_id','marked_by__staff__first_name','marked_by__staff__middle_name',
        'marked_by__staff__last_name','transaction_id','period_day_mapping__period__name'
    )
    queryset = self.filter_queryset(self.get_queryset())
    queryset = queryset.filter(standard_section__academic_year = current_academic_year)
    data = queryset.values('standard_section','standard_section__section__name','standard_section__section_id','id','subject_id','subject__name','standard_section__standard__name','standard_section__standard').order_by('subject__name')
    subject_ids = [row_data['subject_id'] for row_data in data]
    student_section_enrolment = Enrollment.objects.filter(standard_section__academic_year = current_academic_year).values('standard_section','student_id')
    section_student_mapping={}
    student_section_mapping={}
    section_stu_list=[]
    for enrol in student_section_enrolment:
        section_stu_list.append(enrol['student_id'])
        if enrol['standard_section'] not in section_student_mapping:
            section_student_mapping[enrol['standard_section']]=[]
        if enrol['student_id'] not in student_section_mapping:
            student_section_mapping[enrol['student_id']] = enrol['standard_section']
        section_student_mapping[enrol['standard_section']].append(enrol['student_id'])
    student_subject_assignment_data = SubjectStudent.objects.filter(subject__in = subject_ids,student__is_active=True,student__in=section_stu_list,academic_year=current_academic_year).values()
    subject_enrol={}
    for sub_data in student_subject_assignment_data:
        if student_section_mapping[sub_data['student_id']] not in subject_enrol:
            subject_enrol[student_section_mapping[sub_data['student_id']]] = {}
        if sub_data['subject_id'] not in subject_enrol[student_section_mapping[sub_data['student_id']]]:
            subject_enrol[student_section_mapping[sub_data['student_id']]][sub_data['subject_id']]=0
        subject_enrol[student_section_mapping[sub_data['student_id']]][sub_data['subject_id']]+=1
    attendance_subject_mapping={}
    for attendance_row in attendance:
        key1 = attendance_row['from_time'].strftime("%H:%M:%S")+'-'+attendance_row['to_time'].strftime("%H:%M:%S")
        subject = attendance_row['subject_id']
        if attendance_row['standard_section'] not in attendance_subject_mapping:
            attendance_subject_mapping[attendance_row['standard_section']] ={}
        if subject not in attendance_subject_mapping[attendance_row['standard_section']]:
            attendance_subject_mapping[attendance_row['standard_section']][subject]={}
        if key1 not in attendance_subject_mapping[attendance_row['standard_section']][subject]:
            attendance_subject_mapping[attendance_row['standard_section']][subject][key1] = {'present':0,'absent':0}
        if attendance_row['status'] =='present':
            attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['present'] += 1
        else:
            attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['absent'] += 1
        attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['transaction_id']=attendance_row['transaction_id']
        attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['from_time']=attendance_row['from_time']
        attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['to_time']=attendance_row['to_time']
        attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['staff_marked']=get_full_name(attendance_row['marked_by__staff__first_name'],
                                                                          attendance_row['marked_by__staff__middle_name'],
                                                                          attendance_row['marked_by__staff__last_name'])
        attendance_subject_mapping[attendance_row['standard_section']][subject][key1]['period_day_mapping__period__name']=attendance_row['period_day_mapping__period__name']
    return_data = {}
    for subject_section in data:
        subject_section['strength']=0
        subject_section['period_start_time']=""
        subject_section['period_end_time']=""
        subject_section['staff']=""
        subject_section['staff_name']=""
        subject_section['transaction_id']=""
        subject_section['timetable_schedule']=""
        if subject_section['standard_section'] not in return_data:
            return_data[subject_section['standard_section']] = {'subject_list':[]}
        if subject_section['standard_section'] in subject_enrol:
            if subject_section['subject_id'] in subject_enrol[subject_section['standard_section']]:
                subject_section['strength'] = subject_enrol[subject_section['standard_section']][subject_section['subject_id']]
            if (subject_section['standard_section'] in attendance_subject_mapping and subject_section['subject_id'] not in attendance_subject_mapping[subject_section['standard_section']]) or\
            (subject_section['standard_section'] not in attendance_subject_mapping) and subject_section['subject_id']:
                sub= {'present':0,'absent':0,'staff_marked':'','from_time':'','to_time':'','transaction_id':'','period_start_time':'','period_end_time':'',
                    'staff_name':'','is_marked':0,'period_day_mapping__period__name':''}
                if subject_section['period_start_time']:
                    sub['period_start_time']=subject_section['period_start_time']
                if subject_section['period_end_time']:
                    sub['period_end_time']=subject_section['period_end_time']
                if subject_section['staff_name']:
                    sub['staff_name']=subject_section['staff_name']
                subject_section.update({'total_present':sub['present'],'period_start_time':sub['period_start_time'],
                                    'total_absent':sub['absent'],'period_end_time':sub['period_end_time'],
                                    'attendance_marked_staff':sub['staff_marked'],'staff_name':sub['staff_name'],
                                    'from_time':sub['from_time'],'period_day_mapping__period__name':sub['period_day_mapping__period__name'],
                                    'to_time':sub['to_time'],'transaction_id':sub['transaction_id']}) 
                return_data[subject_section['standard_section']]['standard_name'] = subject_section['standard_section__section__name']
                return_data[subject_section['standard_section']]['section_name'] = subject_section['standard_section__standard__name']
                return_data[subject_section['standard_section']]['subject_list'].append(subject_section)
            else:
                for index,attendance_transaction in enumerate(attendance_subject_mapping[subject_section['standard_section']][subject_section['subject_id']]):
                    transaction = attendance_subject_mapping[subject_section['standard_section']][subject_section['subject_id']][attendance_transaction]
                    temp_subject_section = subject_section.copy()
                    temp_subject_section.update({'total_present':transaction['present'],
                                'total_absent':transaction['absent'],
                                'attendance_marked_staff':transaction['staff_marked'],
                                'from_time':transaction['from_time'],'is_marked':1,
                                'period_day_mapping__period__name':transaction['period_day_mapping__period__name'],
                                'to_time':transaction['to_time'],'transaction_id':transaction['transaction_id']}) 
                    temp_subject_section.update({
                        'period_start_time':'',
                        'period_end_time':'',
                        'staff_name':''
                    })
                    return_data[subject_section['standard_section']]['standard_name'] = subject_section['standard_section__section__name']
                    return_data[subject_section['standard_section']]['section_name'] = subject_section['standard_section__standard__name']
                    return_data[subject_section['standard_section']]['subject_list'].append(temp_subject_section)
    return {'data': {'data_list': return_data, 'holiday_reason': holiday_reason, 'is_attendance_marked': True if attendance else False}}

def get_subject_attendance_detail(self):
    # queryset = self.filter_queryset(self.get_queryset())
    ordering = self.request.GET.get('ordering')
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date') 
    subject = self.request.GET.get('subject')
    std_sec_id = self.kwargs.get('pk') or self.request.GET.get('standard_section')
    is_today_marked = False
    student_ids = []
    student_data = Student.get_student_for_standard(None, None, [std_sec_id], ['id'])
    for student in student_data:
        student_ids.append(student['id'])
    filter_query = {'student__in': student_ids}
    academic_year = AcademicYear.objects.filter(is_active=True).order_by('start_date')
    data = academic_year.get(start_date__lte=from_date, end_date__gte=to_date)
    subjectstudent_filter_query = {'academic_year':data}
    subjectstudent_filter_query = {'student__in':student_ids}
    if from_date and to_date:
        filter_query['for_date__range'] = (from_date, to_date)
    if subject:
        filter_query['subject']=subject
        subjectstudent_filter_query['subject']=subject
    subjectstudent = SubjectStudent.objects.filter(**subjectstudent_filter_query)
    queryset = SubjectAttendance.objects.filter(**filter_query)
    subjectstudent_data=subjectstudent.values()
    attendance_data = queryset.values()
    days_count = {}
    attendance = {}
    students = []
    document_ids = []
    student_ids_attendance = []
    student_subject_mapping={}
    subjectstudent_data_id=[]
    days=0
    for subject in subjectstudent_data:
        if subject['student_id'] not in student_subject_mapping:
            student_subject_mapping[subject['student_id']]={
                'subject':[]
            }
            subjectstudent_data_id.append(subject['student_id'])
        student_subject_mapping[subject['student_id']]['subject'].append(subject['subject_id'])
    for attendance_row in attendance_data:
        key = str(attendance_row['from_time'])+str(attendance_row['to_time'])
        if attendance_row['for_date'] not in days_count:
            days_count[attendance_row['for_date']] = {}
        if key not in days_count[attendance_row['for_date']]:
            days_count[attendance_row['for_date']][key] = ''
    # days = len(days_count.keys())
    for date, sessions in days_count.items():
        days += len(sessions)
    students = queryset.values('student', 'subject', 'status', 'for_date','from_time','to_time').annotate(
        standard=F('standard_section__standard')
    )
    todays_date = datetime.now().date().strftime('%Y-%m-%d')
    for student in students:
        student_ids_attendance.append(student['student'])
    student_ids_attendance=list(set(student_ids_attendance))
    for student in subjectstudent_data_id:
        if student not in student_ids_attendance:
            attendance[student]={
                'present': 0, 'absent': 0, 'total': 0
            }
            for subject in student_subject_mapping[student]['subject']:
                attendance[student][str(subject)+'_todays_status']='Un Marked'
    for student in students:
        is_todays_date = False
        if student['for_date'].strftime('%Y-%m-%d') == todays_date:
            is_todays_date = True
            is_today_marked = True
        if student['student'] not in attendance:
            attendance[student['student']] = {
                'present': 0, 'absent': 0, 'total': 0
            }
            if student['student'] in attendance and student['student'] in student_subject_mapping:
                for subject in student_subject_mapping[student['student']]['subject']:
                    attendance[student['student']][str(subject)+'_todays_status']='Un Marked'
        if is_todays_date:
            attendance[student['student']][str(student['subject'])+'_todays_status'] = student['status']
        if student['status'] == 'present':
            attendance[student['student']]['present'] += 1
        else:
            attendance[student['student']]['absent'] +=1
        attendance[student['student']]['total'] += 1
    student_list = Student.objects.filter(id__in=attendance.keys()).values(
        'current_reg_num',
        'email',
        'first_name',
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
    for student_row in student_list:
        student_row['profile_pic_details'] = {}
        if student_row['profile_pic'] and student_row['profile_pic'] in document_data:
            student_row['profile_pic_details'] = document_data[student_row['profile_pic']]
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


def get_subject_attendance_report(self):
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
    response = PDFService.receipt(self, data, attendance.first().student.first_name, 'subject_wise_attendance.html')
    return response

def get_student_subject_attendance_list(self, request):
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

def get_student_attendance_individual(self, student_id, academic_year, from_date=None, to_date=None):
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
    attendance_data = Attendance.get_date_for_range_data(self, from_date, to_date, [student_id])
    academic_year = AcademicYear.objects.filter(is_active=True).order_by('start_date')
    data = academic_year.get(start_date__lte=from_date, end_date__gte=to_date)
    subjectstudent_filter_query = {'academic_year':data,'student_id':student_id}
    subjectstudent = SubjectStudent.objects.filter(**subjectstudent_filter_query)
    subjectstudent_data=subjectstudent.values()
    student_subject_mapping={}
    for subject in subjectstudent_data:
        if subject['student_id'] not in student_subject_mapping:
            student_subject_mapping[subject['student_id']]={
                'subject':[]
            }
        student_subject_mapping[subject['student_id']]['subject'].append(subject['subject_id'])
    report={}
    for subject in student_subject_mapping[student_id]['subject']:
        if subject not in report:
            report[subject]={}
        report[subject] = {
            "total_present_periods": 0,
            "total_absent_periods": 0,
            "total_unmarked_periods": 0,
            "total_number_of_working_periods": 0
        }
        for attendance in attendance_data:
            if attendance[str(subject)+'_status'] == 'not marked':
                report[subject]['total_unmarked_periods'] += 1
            elif attendance[str(subject)+'_status'] == 'present':
                report[subject]['total_present_periods'] += 1
            elif attendance[str(subject)+'_status'] == 'absent':
                report[subject]['total_absent_periods'] += 1

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
    return {
        'data': attendance_data, 'student_non_working_days': student_non_working_days, 'report': report,
        'holiday_list': holiday_list
    }


def subject_attendance_report(self, data):
    filters = data['filters']
    academic_year = filters['academic_year']
    for_date = filters.get('for_date')
    subject = filters.get('subject')
    is_holiday = False
    is_non_working_day = False
    standard_ids=[]
    if not for_date:
        raise exceptions.ValidationError('for_date is mandatory')
    temp_standard_section_data = get_standard_and_section(self, academic_year)
    subject_attendance_config = StandardAttendanceConfiguration.objects.filter().values()
    if subject_attendance_config:
        for standard in subject_attendance_config:
            if standard['attendance_type'] == 3:
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
    enrolled_student = Enrollment.objects.filter(standard_section__in=standard_section_ids).values()
    enrolled_student_list=[]
    student_data_dict = {}
    enrollment_data = {}
    for student in enrolled_student:
        if student['student_id'] not in enrollment_data:
            enrollment_data[student['student_id']] = {}
        enrollment_data[student['student_id']] = student
        enrolled_student_list.append(student['student_id'])
    # student_list = Student.get_student_for_standard(academic_year, None, standard_section_ids, ['id'])
    subject_student = SubjectStudent.objects.filter(student__in=enrolled_student_list).values()
    for sub_student in subject_student:
        if sub_student['student_id'] in enrollment_data:
            if sub_student['student_id'] not in student_data_dict:
                student_data_dict[sub_student['student_id']] = {}
            student_data_dict[sub_student['student_id']] = enrollment_data[sub_student['student_id']]
    student_list = list(student_data_dict.values())
    standard_section_student_data = {}
    attendance_data_obj =  SubjectAttendance.objects.filter(
        for_date=for_date,subject=subject
    )
    transaction_ids = attendance_data_obj.values_list('transaction_id', flat=True).distinct()
    attendance_data = attendance_data_obj.values(
        'student', 'for_date', 'status', 'transaction_id', 'marked_by__staff__first_name',
        'marked_by__staff__middle_name', 'marked_by__staff__last_name', 'marked_by','from_time','to_time'
    )
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
                'marked_by': attendance['marked_by'],
                'marked_by_name': get_full_name(attendance['marked_by__staff__first_name'],attendance['marked_by__staff__middle_name'],attendance['marked_by__staff__last_name'])
            }
            for transaction_id in transaction_ids:
                key = 'is_unmarked'+str(transaction_id)
                attendance_data_mapping[attendance['student']][key]=True
            if attendance['transaction_id'] == str(transaction_id):
                attendance_data_mapping[attendance['student']][key] = False
        attendance_data_mapping[attendance['student']]['is_unmarked'] = False
        if attendance['status'] == 'present':
            attendance_data_mapping[attendance['student']]['present'] += 0.5
        if attendance['status'] == 'absent':
            attendance_data_mapping[attendance['student']]['absent'] += 0.5
    for student_data in student_list:
        if student_data['standard_section_id'] not in standard_section_student_data:
            standard_section_student_data[student_data['standard_section_id']] = {
                'strength': 0, 'total_present': 0, 'total_absent': 0, 'is_unmarked': True, 
                'marked_by': ''
            }
        if student_data['student_id'] in attendance_data_mapping:
            standard_section_student_data[student_data['standard_section_id']]['is_unmarked'] = False
            standard_section_student_data[student_data['standard_section_id']]['total_present'] += attendance_data_mapping[student_data['student_id']]['present']
            standard_section_student_data[student_data['standard_section_id']]['total_absent'] += attendance_data_mapping[student_data['student_id']]['absent']
        standard_section_student_data[student_data['standard_section_id']]['strength'] += 1
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
    return standard_section_data

def staff_subject_attendance_report(self):
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    staff = self.request.GET.get('staff')
    subject = self.request.GET.get('subject')
    standard = self.request.GET.get('standard')
    day_name_to_schedules={}
    staff_subject_mapping={}
    return_data={}
    unique_transaction={}
    filter_query = {
        'for_date__gte':from_date,'for_date__lte':to_date
    }
    timetable_filter_query = {}
    if staff:
        filter_query['marked_by__staff'] = staff
        timetable_filter_query['staff'] = staff
    if standard:
        filter_query['standard_section__standard'] = standard
    if subject:
        filter_query['subject']=subject
        timetable_filter_query['subject']=subject
    subject_attendance_marked = SubjectAttendance.objects.filter(**filter_query).values('marked_by__staff','subject','transaction_id','for_date','from_time','to_time','marked_by__staff__first_name','marked_by__staff__middle_name','marked_by__staff__last_name','subject__name',
                                                                                                                       'status','standard_section__standard','transaction_id')
    # timetable_schedule = TimeTableSchedule.objects.filter(time_table_schedule_parent__date_range__start_date__gte = from_date,time_table_schedule_parent__date_range__end_date__lte=to_date).values(
    #     'period_day_mapping__day','period_day_mapping__period','period_day_mapping__day__name','period_day_mapping__period__name','id')
    timetable_schedule = TimeTableSchedule.objects.filter().values(
        'period_day_mapping__day','period_day_mapping__period','period_day_mapping__day__name','period_day_mapping__period__name','id')
    for schedule in timetable_schedule:
        day_name = schedule['period_day_mapping__day__name']
        if day_name not in day_name_to_schedules:
            day_name_to_schedules[day_name]=[]
        day_name_to_schedules[day_name].append(schedule)
    schedule_data = []
    time_table_schedule_id=[]
    current_date = datetime.strptime(from_date, "%Y-%m-%d").date()
    while current_date <= datetime.strptime(to_date, "%Y-%m-%d").date():
        weekday_name = current_date.strftime('%A')
        if weekday_name in day_name_to_schedules:
            for schedule in day_name_to_schedules[weekday_name]:
                schedule_data.append({
                    'date': date_format(current_date, 'Y-m-d'),
                    'period': schedule['period_day_mapping__period'],
                    'timetable_schedule':schedule['id']
                })
                time_table_schedule_id.append(schedule['id'])
        current_date += timedelta(days=1)
    # timetable_schedule_staff_subject_batch = TimeTableScheduleStaffSubjectBatch.objects.filter(timetable_schedule__in = time_table_schedule_id).values('staff','staff_id','subject','subject_id','subject__name','staff__first_name','staff__middle_name','staff__last_name')
    timetable_filter_query['id__in'] = time_table_schedule_id
    timetable_schedule_staff_subject_batch = TimeTableSchedule.objects.filter(**timetable_filter_query).values('staff','staff_id','subject','subject_id','subject__name','staff__first_name','staff__middle_name','staff__last_name')
    for data in timetable_schedule_staff_subject_batch:
        if data['staff_id'] not in staff_subject_mapping:
            staff_subject_mapping[data['staff_id']]={'total_attendance_timetable':0,'total_attendance_marked':0,'staff_id':data['staff_id'],'staff_name':get_full_name(data['staff__first_name'],data['staff__middle_name'],data['staff__last_name']),
                                                     'subject_list':{}}
        if data['subject_id'] not in staff_subject_mapping[data['staff_id']]['subject_list']:
            staff_subject_mapping[data['staff_id']]['subject_list'][data['subject_id']]={'total_attendance_timetable':0,'total_attendance_marked':0,'subject_id':data['subject_id'],'subject_name':data['subject__name'],'transaction_detail':{}}
        staff_subject_mapping[data['staff_id']]['subject_list'][data['subject_id']]['total_attendance_timetable']+=1
        staff_subject_mapping[data['staff_id']]['total_attendance_timetable']+=1
    for attendance in subject_attendance_marked:
        if attendance['transaction_id'] not in unique_transaction:
            unique_transaction[attendance['transaction_id']] ={'staff_id':attendance['marked_by__staff'],'staff_name':get_full_name(attendance['marked_by__staff__first_name'],attendance['marked_by__staff__middle_name'],attendance['marked_by__staff__last_name']),
                                                               'subject_id':attendance['subject']}
        if attendance['marked_by__staff'] not in staff_subject_mapping:
            staff_subject_mapping[attendance['marked_by__staff']]={'total_attendance_timetable':0,'total_attendance_marked':0,'staff_id':attendance['marked_by__staff'],'subject_list':{},
                                                            'staff_name':get_full_name(attendance['marked_by__staff__first_name'],attendance['marked_by__staff__middle_name'],attendance['marked_by__staff__last_name'])}
        if attendance['subject'] not in staff_subject_mapping[attendance['marked_by__staff']]['subject_list']:
            staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]={'total_attendance_timetable':0,'total_attendance_marked':0,'subject_id':attendance['subject'],'subject_name':attendance['subject__name'],'transaction_detail':{}}
    for transaction in unique_transaction:
        staff_subject_mapping[unique_transaction[transaction]['staff_id']]['total_attendance_marked']+=1
        staff_subject_mapping[unique_transaction[transaction]['staff_id']]['subject_list'][unique_transaction[transaction]['subject_id']]['total_attendance_marked']+=1

    for attendance in subject_attendance_marked:
        if staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['total_attendance_marked'] > staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['total_attendance_timetable']:
            staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['total_attendance_timetable']=staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['total_attendance_marked']
        if staff_subject_mapping[attendance['marked_by__staff']]['total_attendance_marked']>staff_subject_mapping[attendance['marked_by__staff']]['total_attendance_timetable']:
            staff_subject_mapping[attendance['marked_by__staff']]['total_attendance_timetable']=staff_subject_mapping[attendance['marked_by__staff']]['total_attendance_marked']
        if attendance['transaction_id'] not in staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['transaction_detail']:
            staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['transaction_detail'][attendance['transaction_id']]={'present':0,'absent':0,'for_date':attendance['for_date'],
                                                                                                                                       'from_time':attendance['from_time'],'to_time':attendance['to_time']}
        if attendance['status'] == 'present':
            staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['transaction_detail'][attendance['transaction_id']]['present']+=1
        else:
            staff_subject_mapping[attendance['marked_by__staff']]['subject_list'][attendance['subject']]['transaction_detail'][attendance['transaction_id']]['absent']+=1
    for data in staff_subject_mapping:
        for subject in staff_subject_mapping[data]['subject_list']:
            staff_subject_mapping[data]['subject_list'][subject]['student_attendance_detail'] = staff_subject_mapping[data]['subject_list'][subject]['transaction_detail'].values()
    for data in staff_subject_mapping:
        staff_subject_mapping[data]['subject_list']=staff_subject_mapping[data]['subject_list'].values()
    staff_subject_mapping = staff_subject_mapping.values()
    return {'staff_list':staff_subject_mapping}

def get_notmarked_attendance_list(self):
    for_date = self.request.GET.get('for_date')
    if for_date:
        today = for_date
    else:
        today = datetime.now().today()
    now = datetime.now()
    day_name = today.strftime("%A")
    timetable_schedule_list = []
    response_data = []
    timetable_query = self.get_queryset().filter(period_day_mapping__day__name = day_name,
                                                 is_active=True,
                                                 period_day_mapping__start_time__lte = now ,
                                                 period_day_mapping__end_time__lte = now )
    academic_year = AcademicYear.get_academic_year_for_date(self, today)
    if not academic_year:
        raise ValidationError('Invalid date')
    date_range_data = TimeTableScheduleParent.objects.filter(date_range__academic_year=academic_year.id).values(
        'id', 'date_range__start_date', 'date_range__end_date'
    )
    schedule_parent_id = None
    for date_range in date_range_data:
        if date_range['date_range__start_date'].strftime('%Y-%m-%d') <= today.strftime('%Y-%m-%d') <= date_range['date_range__end_date'].strftime('%Y-%m-%d'):
            schedule_parent_id = date_range['id']
            continue
    if not schedule_parent_id:
        raise ValidationError('time_table_schedule_parent are mandatory')
    timetable_data = timetable_query.filter(time_table_schedule_parent = schedule_parent_id).values('staff','subject','period_day_mapping__day','period_day_mapping__period',
                                           'time_table_schedule_parent__standard_section__standard','time_table_schedule_parent__standard_section__section','id',
                                           'time_table_schedule_parent__date_range','period_day_mapping__period__name',
                                           'time_table_schedule_parent__standard_section__standard__name','time_table_schedule_parent__standard_section__section__name','staff__first_name',
                                           'staff__middle_name','staff__last_name','subject__name','period_day_mapping__day__name')
    for timetable in timetable_data:
        timetable_schedule_list.append(timetable['id'])
    subject_attendance = SubjectAttendance.objects.filter(for_date = today,timetable_schedule__in=timetable_schedule_list).values_list('timetable_schedule_id',flat=True).distinct()
    for timetable in timetable_data:
        if timetable['id'] not in subject_attendance:
            response_data.append({
                'staff':timetable['staff'],
                'subject':timetable['subject'],
                'subject_name':timetable['subject__name'],
                'day':timetable['period_day_mapping__day'],
                'day_name':timetable['period_day_mapping__day__name'],
                'period_name':timetable['period_day_mapping__period__name'],
                'standard_name':timetable['time_table_schedule_parent__standard_section__standard__name'],
                'section_name':timetable['time_table_schedule_parent__standard_section__section__name'],
                'staff_name':get_full_name(timetable['staff__first_name'],timetable['staff__middle_name'],timetable['staff__last_name'])
            })
    return response_data