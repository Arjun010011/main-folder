from email.policy import default
from django.db import models

from apps.users.models.user import User


class LibraryUserAttendance(models.Model):
    fordate_time = models.DateTimeField(blank=True, null=True)
    visited_type = models.IntegerField(default=1) #1-checkin 2-checkout
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='library_user_attendance_user')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
