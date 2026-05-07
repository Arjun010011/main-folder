from datetime import datetime
from django.db import models
from django.db.models import JSONField
import json

from apps.classes.models import StandardSectionMapping
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.hr.models.timeTable import Day,TimeTableSchedule
from apps.institutes.models.biometric_machine import BiometricMachine
from apps.students.models import Student
from apps.classes.models.subject import Subject
from apps.institutes.models import AcademicYear
from apps.users.models.user import User
from apps.classes.models import Enrollment,SubjectStudent
from apps.classes.models.standard import Standard
from apps.hr.models.timeTable import PeriodDayMapping

class Attendance(models.Model):
    attendanceStatus = (
        ('present', 'present'),
        ('absent', 'absent'),
    )
    Sessions = (
        ('Session1', 'Session1'),
        ('Session2', 'Session2')
    )
    for_date = models.DateField()
    session = models.CharField(max_length=10, choices=Sessions)
    status = models.CharField(max_length=20, choices=attendanceStatus)
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='attendance', null=True,
                                         blank=True, on_delete=models.PROTECT)
    student = models.ForeignKey(Student, related_name='attendance', null=True, blank=True, on_delete=models.SET_NULL)
    marked_by = models.ForeignKey(User, related_name='attendance_marked_by', null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_date_for_range_data(self, from_date, to_date, student_ids=[], status=None):
        from apps.shared.services import SharedService
        present_list_only = bool(self.request.GET.get('present_list_only')) if self.request.GET.get('present_list_only') else None
        absent_list_only = bool(self.request.GET.get('absent_list_only')) if self.request.GET.get('absent_list_only') else None
        not_marked_list_only = bool(self.request.GET.get('not_marked_list_only')) if self.request.GET.get('not_marked_list_only') else None
        filter_query = {}
        return_data = []
        if student_ids:
            filter_query['student__in'] = student_ids
        if status:
            filter_query['status'] = status
        attendance_data = Attendance.objects.filter(
            for_date__range=(from_date, to_date), **filter_query
        ).values().order_by('for_date')
        temp_attendance_data = {}
        working_days = Day.get_student_working_days(self)
        holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date,
            to_date, True)
        #getting present datas
        for day in attendance_data:
            day['for_date'] = day['for_date'].strftime('%Y-%m-%d')
            day_name = SharedService.get_day_for_date(day['for_date'])
            if day_name not in working_days:
                continue
            if day['for_date'] in holiday_list:
                continue
            if day['for_date'] not in temp_attendance_data:
                intialization_value = {
                    'for_date': day['for_date'], 'session_1_status': 'not marked', 'session_2_status': 'not marked',
                }
            temp_attendance_data[day['for_date']] = intialization_value
            if day['session'] == 'Session1':
                temp_attendance_data[day['for_date']]['session_1_status'] = day['status']
            else:
                temp_attendance_data[day['for_date']]['session_2_status'] = day['status']
        #getting not marked attendance
        date_range_list = SharedService.get_for_date_from_date_range(from_date, to_date)
        for date_key in date_range_list:
            day_name = SharedService.get_day_for_date(date_key.strftime('%Y-%m-%d'))
            if day_name in working_days and str(date_key) not in temp_attendance_data:
                temp = {
                    'for_date': date_key.strftime('%Y-%m-%d'), 'session_1_status': 'not marked', 'session_2_status': 'not marked',
                }
                return_data.append(temp)
        if temp_attendance_data:
            return_data += temp_attendance_data.values()
        temp_return_data = []
        if not_marked_list_only:
            for row_data in return_data:
                if row_data['session_1_status'] == 'not marked' or row_data['session_2_status'] == 'not marked':
                    temp_return_data.append(row_data)
            return_data = temp_return_data
        elif present_list_only:
            for row_data in return_data:
                if row_data['session_1_status'] == 'present' or row_data['session_2_status'] == 'present':
                    temp_return_data.append(row_data)
            return_data = temp_return_data
        elif absent_list_only:
            for row_data in return_data:
                if row_data['session_1_status'] == 'absent' or row_data['session_2_status'] == 'absent':
                    temp_return_data.append(row_data)
            return_data = temp_return_data
        return return_data

class SubjectAttendance(models.Model):
    for_date = models.DateField()
    status = models.CharField(max_length=20)
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='subject_attendance_standard_section', null=True,
                                         blank=True, on_delete=models.PROTECT)
    student = models.ForeignKey(Student, related_name='subject_attendance_student', null=True, blank=True, on_delete=models.SET_NULL)
    marked_by = models.ForeignKey(User, related_name='subject_attendance_marked_by', null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.ForeignKey(Subject, related_name='subject_attendance_subject',null=True,blank=True,on_delete=models.SET_NULL)
    from_time = models.DateTimeField(blank=True, null=True)
    to_time = models.DateTimeField(blank=True, null=True)
    timetable_schedule = models.ForeignKey(TimeTableSchedule,related_name='subject_attendence_timetable_schedule',null=True,blank=True,on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    transaction_id = models.CharField(max_length=255, null=True, blank=True)
    period_day_mapping = models.ForeignKey(PeriodDayMapping, related_name='subject_attendance_period_day_mapping', null=True, blank=True, on_delete=models.SET_NULL)
    marked_from = models.CharField(max_length=50, null=True, blank=True, default='normal')  # normal = staff app,bulk = from studentattendance/update-subject-attendance page

    def save(self, *args, **kwargs):
        f = open('apps/classes/attendance_status.json', )
        data = json.load(f)
        if self.status in data:
            super().save(*args, **kwargs)
        else:
            raise Exception('Invalid Status')

    def get_date_for_range_data(self, from_date, to_date, student_ids=[], status=None):
        from apps.shared.services import SharedService
        present_list_only = bool(self.request.GET.get('present_list_only')) if self.request.GET.get('present_list_only') else None
        absent_list_only = bool(self.request.GET.get('absent_list_only')) if self.request.GET.get('absent_list_only') else None
        not_marked_list_only = bool(self.request.GET.get('not_marked_list_only')) if self.request.GET.get('not_marked_list_only') else None
        academic_year = AcademicYear.objects.filter(is_active=True).order_by('start_date')
        data = academic_year.get(start_date__lte=from_date, end_date__gte=to_date)
        subjectstudent_filter_query = {'academic_year':data}
        filter_query = {}
        return_data = []
        if student_ids:
            filter_query['student__in'] = student_ids
            subjectstudent_filter_query['student__in']=student_ids
        if status:
            filter_query['status'] = status
        attendance_data = SubjectAttendance.objects.filter(
            for_date__range=(from_date, to_date), **filter_query
        ).values().order_by('for_date')
        temp_attendance_data = {}
        working_days = Day.get_student_working_days(self)
        holiday_list = HolidayCalenderStudent.get_upcoming_holidays(self, from_date,
            to_date, True)
        #getting present datas
        subjectstudent = SubjectStudent.objects.filter(**subjectstudent_filter_query)
        subjectstudent_data=subjectstudent.values()
        student_subject_mapping={}
        for subject in subjectstudent_data:
            if subject['student_id'] not in student_subject_mapping:
                student_subject_mapping[subject['student_id']]={
                    'subject':[]
                }
            student_subject_mapping[subject['student_id']]['subject'].append(subject['subject_id'])
        for day in attendance_data:
            day['for_date'] = day['for_date'].strftime('%Y-%m-%d')
            day_name = SharedService.get_day_for_date(day['for_date'])
            if day_name not in working_days:
                continue
            if day['for_date'] in holiday_list:
                continue
            if day['for_date'] not in temp_attendance_data:
                intialization_value = {
                    'for_date': day['for_date']
                }
                for subject in student_subject_mapping[student_ids[0]]['subject']:
                    intialization_value[str(subject)+'_status'] = 'not marked'
            temp_attendance_data[day['for_date']] = intialization_value
            for subject in student_subject_mapping[student_ids[0]]['subject']:
                if day['subject'] == subject:
                    temp_attendance_data[day['for_date']][str(subject)+'_status'] = day['status']
        #getting not marked attendance
        date_range_list = SharedService.get_for_date_from_date_range(from_date, to_date)
        for date_key in date_range_list:
            day_name = SharedService.get_day_for_date(date_key.strftime('%Y-%m-%d'))
            if day_name in working_days and str(date_key) not in temp_attendance_data:
                temp = {
                    'for_date': date_key.strftime('%Y-%m-%d'), 'session_1_status': 'not marked', 'session_2_status': 'not marked',
                }
                return_data.append(temp)
        if temp_attendance_data:
            return_data += temp_attendance_data.values()
        temp_return_data = []
        if not_marked_list_only:
            for row_data in return_data:
                for subject in student_subject_mapping[student_ids[0]]['subject']:
                    if row_data[str(subject)+'_status'] == 'not marked' or row_data[str(subject)+'_status'] == 'not marked':
                        temp_return_data.append(row_data)
            return_data = temp_return_data
        elif present_list_only:
            for row_data in return_data:
                for subject in student_subject_mapping[student_ids[0]]['subject']:
                    if row_data[str(subject)+'_status'] == 'present' or row_data[str(subject)+'_status'] == 'present':
                        temp_return_data.append(row_data)
            return_data = temp_return_data
        elif absent_list_only:
            for row_data in return_data:
                for subject in student_subject_mapping[student_ids[0]]['subject']:
                    if row_data[str(subject)+'_status'] == 'absent' or row_data[str(subject)+'_status'] == 'absent':
                        temp_return_data.append(row_data)
            return_data = temp_return_data
        return return_data

class MachineAttendance(models.Model):
    status = ( # if any status is added please add in get_lop_attendance_list
        ('present', 'present'),  # 1
        ('absent', 'absent'),  # 0
        ('halfday', 'halfday'),  # 0.5
        ('late', 'late'),  # 1 check the frequency
        ('lateandhalfday', 'lateandhalfday'),  # 0.5
        ('halfdaylate', 'halfdaylate'),  # halfday late
        ('unmarked', 'unmarked'),
        ('checkinmarked', 'checkinmarked'),
        ('halfdayandlate', 'halfdayandlate'),
        ('timenotassigned', 'timenotassigned'), #when machine sends attendance but staff shift not assinged to staff. we are storing because the error wont be captured
        ('nonworkingday', 'nonworkingday'), #when shift is not assigned to staff on the day
        ('first_ses_leave_sec_sess_half', 'first_ses_leave_sec_sess_half'),
        ('first_ses_half_sec_sess_leave', 'first_ses_half_sec_sess_leave'),
        ('holiday', 'holiday'),
        ('leave_applied', 'leave_applied')
    )
    student = models.ForeignKey(Student, related_name='machine_attendance_student', null=True, blank=True, on_delete=models.SET_NULL)
    for_date = models.DateField()
    in_time = models.DateTimeField(blank=True, null=True)
    out_time = models.DateTimeField(blank=True, null=True)
    academic_year = models.ForeignKey( AcademicYear,
        related_name='machine_attendance_academic_year', null=True, blank=True,
        on_delete=models.PROTECT
    )
    status = models.CharField(max_length=30, choices=status)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_value_for_attendance(status):
        value = 0
        if status == 'present':
            value = 1
        elif status == 'halfday':
            value = 0.5
        return value

    def get_date_for_range_data(self, from_date, to_date, student_ids=[], status=None):
        filter_query = {}
        if student_ids:
            filter_query['student__in'] = student_ids
        if status:
            filter_query['status'] = status
        machine_attendance_data = MachineAttendance.objects.filter(
            for_date__range=(from_date, to_date), **filter_query
        ).values()
        return machine_attendance_data

class MachineAttendanceLog(models.Model):
    for_date = models.DateField()
    operation = models.CharField(max_length=50)
    json = models.TextField()
    machine_user_id = models.IntegerField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)

class MachineAttendanceFailedToSaveData(models.Model):
    json = models.TextField()
    failed_data = models.CharField(max_length=1000)
    is_data_processed = models.BooleanField(default=False)
    machine_user_id = models.IntegerField(null=True, blank=True)
    operation_id = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class MachineUserMapping(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='user_machine_mapping_user')
    machine_user_id = models.IntegerField()
    is_user_updated_to_machine = models.BooleanField(default=False)
    username_in_machine = models.CharField(max_length=255, null=True, blank=True)
    biometric_machine = models.ForeignKey(BiometricMachine, null=True, blank=True, related_name='machine_user_mapping_biometric_machine', on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    def get_user_for_machine(self, machine_user_ids):
        return {usmac.machine_user_id: usmac for usmac in MachineUserMapping.objects.filter(
            machine_user_id__in=machine_user_ids, is_active=True
        )}

#stores machine userupdated logs
class MachineUserLog(models.Model):
    machine_user_id = models.IntegerField(null=True, default=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='machine_user_log_user')
    operation_id = models.CharField(max_length=255, null=True, blank=True)
    template = JSONField(null=True)
    is_data_processed = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)

class StandardAttendanceConfiguration(models.Model):
    standard = models.ForeignKey(Standard, related_name = 'standard_attendance_configuration_standard',null=True,blank=True,
                                      on_delete=models.SET_NULL)
    attendance_type = models.IntegerField(null=True, default=True) # 1.session wise,2. rfid, 3. subject wise

class AttendanceBatch(models.Model):
    name = models.CharField(max_length=250, null=True)
    code = models.CharField(max_length=250, null=True)
    is_active = models.BooleanField(default=True)
    academic_year = models.ForeignKey(AcademicYear, related_name='attendance_batch_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    batch_type = models.CharField(max_length=250, null=True,blank=True)
    created = models.DateTimeField(auto_now_add=True,null=True, blank=True)
    modified = models.DateTimeField(auto_now=True,null=True, blank=True)

class AttendanceBatchStandardSectionSubjectMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='standard_section_attendance_batch_standard_section_subject_mapping', null=True,
                                         blank=True, on_delete=models.PROTECT)
    subject = models.ForeignKey(Subject, related_name='subject_attendance_batch_standard_section_subject_mapping', null=True,
                                         blank=True, on_delete=models.PROTECT)
    attendance_batch = models.ForeignKey(AttendanceBatch, related_name='attendance_batch_attendance_batch_standard_section_subject_mapping', null=True,
                                         blank=True, on_delete=models.PROTECT)

class AttendanceBatchStudentMapping(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name='attendance_batch_student_mapping_student')
    attendance_batch = models.ForeignKey(AttendanceBatch, on_delete=models.CASCADE, null=True, blank=True, related_name='attendance_batch_student_mapping_attendance_batch')
    is_active = models.BooleanField(default=True)

class BatchAttendance(models.Model):
    attendanceStatus = (
        ('present', 'present'),
        ('absent', 'absent'),
    )
    for_date = models.DateField()
    status = models.CharField(max_length=20, choices=attendanceStatus)
    attendance_batch = models.ForeignKey(AttendanceBatch, related_name='batch_attendance_attendance_batch', null=True,
                                         blank=True, on_delete=models.PROTECT)
    student = models.ForeignKey(Student, related_name='batch_attendance_student', null=True, blank=True, on_delete=models.SET_NULL)
    marked_by = models.ForeignKey(User, related_name='batch_attendance_marked_by', null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)