import calendar
from datetime import timedelta

from django.db.models import Count, Q

from apps.app.serializers import AttendanceStudentSerializer, AttendanceStaffSerializer
from apps.classes.models.attendance import Attendance
from apps.classes.models.enrollment import StudentStandardMapping
from apps.general.models import HolidayCalender
from apps.hr.models import Day, StaffAttendance
from apps.shared.services import SharedService
from apps.staffs.models import Staff
from apps.students.models import Student, StudentParentMapping

def get_attendance_days_report(self, user=False):
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    userId = self.request.GET.get('id')
    user_details = None
    if self.request.GET.get('is_staff'):
        working_days = Day.get_staff_working_day(self)
        attendance = StaffAttendance.objects.filter(staff=userId, for_date__range=(fromDate, toDate))
        sessionsValues = attendance.values('for_date', 'status')
        sessions = {}
        for session in sessionsValues:
            if session['status'] == 'absent':
                session_present = 0
            elif session['status'] == 'halfday':
                session_present = 1
            else:
                session_present = 2
            sessions.update({str(session['for_date']): {'session_count': 2, 'session_present': session_present}})
        if user:
            staff = Staff.objects.get(id=userId)
            user_details = AttendanceStaffSerializer(staff).data
            user_details['contact_person'] = user_details['name']
            user_details['is_staff'] = True
    else:
        working_days = Day.get_student_working_days(self)
        attendance = Attendance.objects.filter(student=userId, for_date__range=(fromDate, toDate),
                                               standard_section__academic_year=self.request.GET.get('year'))
        sessions = attendance.values('for_date').annotate(session_count=Count('session'),
                                                          session_present=Count('status', filter=Q(status='present')))
        sessions = {str(session['for_date']): session for session in sessions}
        if user:
            student = Student.objects.get(id=userId)
            user_details = AttendanceStudentSerializer(student).data
            contact = StudentParentMapping.objects.get(student=student)
            try:
                if contact.parent:
                    user_details['contact_person'] = contact.parent.father_name or contact.parent.mother_name
                else:
                    user_details['contact_person'] = contact.guardian.guardian_name
            except:
                user_details['contact_person'] = None
            try:
                user_details['description'] = StudentStandardMapping.objects.get(student=student,
                                                                                 academic_year=self.request.GET.get(
                                                                                     'year')).standard.name
            except:
                user_details['description'] = None
            user_details['is_staff'] = False
    holidays = HolidayCalender.get_upcoming_holidays(self, fromDate, toDate, False)
    holidayDict = dict()
    for holiday in holidays:
        for day in SharedService.get_for_date_from_date_range(holiday['from_date'], holiday['to_date']):
            day_in_string = str(day)
            if day_in_string in holidayDict:
                holidayDict[day_in_string]['reason'].append(holiday['reason'])
            else:
                holidayDict.update({day_in_string: {'reason': [holiday['reason']], 'is_holiday': True}})
    startDate = SharedService.date_to_obj(fromDate)
    endDate = SharedService.date_to_obj(toDate)
    delta = endDate - startDate
    attendanceReport = dict()
    for dates in range(delta.days + 1):
        day = startDate + timedelta(days=dates)
        day_in_string = str(day)
        weekday = calendar.day_name[day.weekday()]
        is_weekday = weekday in working_days
        data = {'is_working_day': is_weekday, 'is_holiday': not is_weekday,
                'reason': [weekday] if not is_weekday else []}
        if day_in_string in holidayDict:
            data.update(**holidayDict[day_in_string])
        data.update(
            **sessions[day_in_string] if day_in_string in sessions else {'session_count': 0, 'session_present': 0})
        attendanceReport.update({day_in_string: data})
    return attendanceReport, user_details


def get_attendance_report(self):
    attendanceReport, user_details = get_attendance_days_report(self)
    return {'data': attendanceReport}


def get_attendance_detail(self):
    attendanceReport, user_details = get_attendance_days_report(self, True)
    days = session = present = 0
    for key, value in attendanceReport.items():
        if value['is_working_day'] and not value['is_holiday']:
            days += 1
            session += value['session_count']
            present += value['session_present']
    user_details['attendance_details'] = {'days_count': days, 'session_count': session, 'session_present': present,
                                          'minimum_count': 0}
    return user_details
