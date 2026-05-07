import datetime

from django.db import models

from apps.students.models import Student
from apps.transport.models import RoutePickupPlan, Route, RouteDropPlan
from django.db.models import JSONField

from apps.users.models.user import User


class RideDetail(models.Model):
    type = (
        ('pickup', 'pickup'),
        ('drop', 'drop')
    )
    for_date = models.DateField(default=datetime.date.today)
    type = models.CharField(max_length=6, choices=type, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    location_history = JSONField(null=True)
    route = models.ForeignKey(Route, related_name='ride_detail', null=True, blank=True, on_delete=models.SET_NULL)


class RideStatus(models.Model):
    reached = models.BooleanField(default=False)
    ride_detail = models.ForeignKey(RideDetail, related_name='ride_status', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    route_pickup_plan = models.ForeignKey(RoutePickupPlan, related_name='ride_status_route_pickup_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    route_drop_plan = models.ForeignKey(RouteDropPlan, related_name='ride_status_route_drop_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Attendance(models.Model):
    attendanceStatus = (
        ('present', 'present'),
        ('absent', 'absent'),
    )
    status = models.CharField(max_length=10, choices=attendanceStatus)
    ride_detail = models.ForeignKey(RideDetail, related_name='ride_attendance', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    user = models.ForeignKey(User, related_name='transport_attendance_user', null=True, blank=True,
                                on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
