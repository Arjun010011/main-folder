from django.db import models

from apps.staffs.models import Staff
from django.db.models import JSONField
from apps.transport.models import Vehicle



class DriverLocation(models.Model):
    driver = models.ForeignKey(Staff, related_name='driver_location_staff', on_delete=models.SET_NULL, null=True,
                               blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class VehicleLocation(models.Model):
    vehicle = models.ForeignKey(Vehicle, related_name='vehicle_location_vehicle', on_delete=models.SET_NULL, null=True,
                                blank=True)
    latitude = models.DecimalField(max_digits=30, decimal_places=20, null=True, blank=True)
    longitude = models.DecimalField(max_digits=30, decimal_places=20, null=True, blank=True)
    extra_details = JSONField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    token = models.CharField(max_length=2000,blank=True, null=True)