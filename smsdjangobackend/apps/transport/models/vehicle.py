from django.db import models

from apps.staffs.models import Staff
from apps.transport.models.route import Route
from django.db.models import JSONField


class GpsMachine(models.Model):
    CategoryList = (
        ('Movable', 'Movable'),
        ('Immovable', 'Immovable')
    )
    DetectionFrom = (
        ('FromDevice', 'FromDevice'),
        ('FromLatLng', 'FromLatLng'),
    )
    vendor = models.CharField(max_length=255, null=True, blank=True)
    object_name = models.CharField(max_length=255)
    device_type = models.CharField(max_length=255, blank=True, null=True) #gps model name
    object_model = models.CharField(max_length=255, blank=True, null=True)
    imei_no = models.CharField(max_length=255, blank=True, null=True)
    device_model = models.CharField(max_length=255, blank=True, null=True)
    sim_provider = models.CharField(max_length=255, blank=True, null=True)
    sim_card_number = models.CharField(max_length=255, blank=True, null=True)
    object_type = models.CharField(max_length=255, blank=True, null=True) #car, bike, truck
    object_category = models.CharField(max_length=15, choices=CategoryList, null=True, blank=True, default=3)
    object_brand = models.CharField(max_length=255, null=True, blank=True)
    ign = models.CharField(max_length=255, blank=True, null=True)
    pwr = models.CharField(max_length=255, blank=True, null=True)
    gps = models.CharField(max_length=255, blank=True, null=True)
    speed_detection = models.CharField(max_length=255, choices=DetectionFrom, blank=True, null=True)
    battery = models.CharField(max_length=255, blank=True, null=True)
    manufacture_date =  models.DateField(null=True, blank=True)
    purchase_date = models.DateField(null=True, blank=True)
    gps_installation_date = models.DateField(null=True, blank=True)
    gps_warranty = models.IntegerField(null=True, blank=True)
    last_api_requested_data = JSONField(null=True)
    last_api_hit_date_time = models.DateTimeField(null=True, blank=True)
    vendor_code = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Vehicle(models.Model):
    FUELTYPE = (
        (1, 'pertol'),
        (2, 'diesel'),
        (3, 'gas')
    )
    vehicle_code = models.CharField(max_length=255)
    name = models.CharField(max_length=255, null=True, blank=True)
    manufacturer = models.CharField(max_length=255, blank=True)
    vehicle_num = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    seat_capacity = models.IntegerField()
    fuel_type = models.CharField(max_length=30, blank=True, null=True, choices=FUELTYPE)
    gps = models.ForeignKey(GpsMachine,related_name='vehicle_gps', on_delete=models.SET_NULL, null=True,
                                   blank=True)
    model = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    url = models.CharField(max_length=255, blank=True)
    last_sync = models.DateTimeField(blank=True, null=True)


class VehicleRouteMapping(models.Model):
    AssignmentTypes = (
        (1, 'pickup'),
        (2, 'drop'),
        (3, 'pickupdrop')
    )
    vehicle = models.ForeignKey(Vehicle, related_name='vehicle_route_vehicle', on_delete=models.SET_NULL, null=True,
                                blank=True)
    route = models.ForeignKey(Route, related_name='vehicle_route_route', on_delete=models.SET_NULL, null=True,
                              blank=True)
    assignment_type = models.CharField(max_length=2, choices=AssignmentTypes, null=True, blank=True, default=3)
    from_date = models.DateField()
    to_date = models.DateField(default='9999-12-31')


class VehicleDriverMapping(models.Model):
    vehicle = models.ForeignKey(Vehicle, related_name='vehicle_driver_vehicle', on_delete=models.SET_NULL, null=True,
                                blank=True)
    driver = models.ForeignKey(Staff, related_name='vehicle_driver_staff', on_delete=models.SET_NULL, null=True,
                               blank=True)
    from_date = models.DateField(auto_now_add=True)
    to_date = models.DateField(default='9999-12-31')