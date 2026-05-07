from django.db import models

from apps.institutes.models import Room, AcademicYear
from apps.students.models import Student
from apps.staffs.models import Staff

class RoomAllocation(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True)
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='roomallocation_room')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='roomallocation_student')
    staff = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='roomallocation_staff')
    is_active = models.BooleanField(default=True)
    checkin = models.DateTimeField()
    checkout = models.DateTimeField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class UserAttendance(models.Model):
    reason = models.CharField(max_length=255, blank=True, null=True)
    checkin = models.DateTimeField()
    checkout = models.DateTimeField(null=True)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='userattendance_student')
    staff = models.ForeignKey(Staff, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='userattendance_staff')
    roomallocation = models.ForeignKey(RoomAllocation, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='userattendance_roomallocation')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
