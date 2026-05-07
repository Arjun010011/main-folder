from django.db import models

from apps.staffs.models.staff import Staff
from apps.users.models.user import User


class StaffAttendance(models.Model):
    attendanceStatus = ( # if any status is added please add in get_lop_attendance_list
        ('present', 'present'),  # 1
        ('absent', 'absent'),  # 0
        ('halfday', 'halfday'),  # 0.5
        ('late', 'late'),  # 1 check the frequency
        ('lateandhalfday', 'lateandhalfday'),  # 0.5
        ('halfdaylate', 'halfdaylate'),  # halfday late
        ('unmarked', 'unmarked'),
        ('checkinmarked', 'checkinmarked'),
        ('halfdayandlate', 'halfdayandlate'),
        ('shiftnotassigned', 'shiftnotassigned'), #when machine sends attendance but staff shift not assinged to staff. we are storing because the error wont be captured
        ('nonworkingday', 'nonworkingday'), #when shift is not assigned to staff on the day
        ('lop_attendance', 'lop_attendance'), #user can mark lop for this day attendance,
        ('first_ses_leave_sec_sess_half', 'first_ses_leave_sec_sess_half'),
        ('first_ses_half_sec_sess_leave', 'first_ses_half_sec_sess_leave'),
        ('holiday', 'holiday'),
        ('leave_applied', 'leave_applied')
    )
    marked_from_datas = (
        ('web', 'web'),
        ('machine_attendance', 'machine_attendance'),
        ('bulk_add', 'bulk_add')
    )
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL)
    for_date = models.DateField()
    in_time = models.DateTimeField(blank=True, null=True)
    out_time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=30, choices=attendanceStatus)
    is_active = models.BooleanField(default=True)
    marked_from = models.CharField(max_length=20, choices=marked_from_datas, default='web')
    marked_by_user = models.ForeignKey(User, related_name='staff_attendance_marked_by_user', on_delete=models.SET_NULL, null=True)
    is_status_manually_set = models.BooleanField(default=False, help_text='True if status was manually set by user')
    status_changed_by = models.ForeignKey(User, related_name='staff_attendance_status_changed_by', on_delete=models.SET_NULL, null=True, blank=True, help_text='User who manually changed the status')
    status_changed_at = models.DateTimeField(null=True, blank=True, help_text='When the status was manually changed')
    reason = models.TextField(blank=True, null=True, help_text='Reason for attendance status change')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
