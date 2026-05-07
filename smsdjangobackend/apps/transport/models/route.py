from django.db import models

from apps.classes.models import Standard
from apps.classes.models.standard import InstituteAdresses
from apps.institutes.models import AcademicYear
from apps.shared.models.address import MapAddress
from apps.users.models.user import User
from apps.students.models import Student


class Route(models.Model):
    name = models.CharField(max_length=255)
    academic_year = models.ForeignKey(AcademicYear, related_name='route_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    institute_address = models.ForeignKey(InstituteAdresses, related_name='route_institute_address', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)  # not planned

"""
    Name and map_address are two different fields where we store google map address or the manual address so both of this fields will be used.
    area_type : 
    1. area -> This is used to store manual address entered by users 
    2. student_area -> Whenever the student is registered to the address that address will be added to the google map to use for the route plan 
    3. group -> Whenever we group multiple location and mark other location as stop for the route plan that point is called as group
"""

class RouteArea(models.Model):
    AreaTypes = (
        (1, 'area'), #storing direct areas from area screen
        (2, 'student_or_staff_area'), #storing student area
        (3, 'group') #grouping multiple student to one area
    )
    name = models.CharField(max_length=255, blank=True, null=True)
    landmark = models.CharField(max_length=255, blank=True, null=True)
    address_one = models.CharField(max_length=255, blank=True)
    address_two = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=255, null=True)
    district = models.CharField(max_length=255, null=True)
    state = models.CharField(max_length=255, null=True)
    country = models.CharField(max_length=255, null=True)
    pincode = models.IntegerField(null=True)
    latitude = models.DecimalField(max_digits=22, decimal_places=16, null=True, blank=True)
    longitude = models.DecimalField(max_digits=22, decimal_places=16, null=True, blank=True)
    km = models.FloatField(null=True)
    is_aproved = models.BooleanField(default=True) #used this when user himself add the address the approval will be false
    institute_address = models.ForeignKey(InstituteAdresses, related_name='route_area_institute_address', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    academic_year = models.ForeignKey(AcademicYear, related_name='route_area_academic_year', null=True, blank=True,
                                    on_delete=models.SET_NULL) #academic year is for storing the student area
    area_type = models.CharField(max_length=10, choices=AreaTypes, default=1)

class RoutePickupPlan(models.Model):
    route = models.ForeignKey(Route, related_name='route_pickup_plan_route', on_delete=models.CASCADE, null=True, blank=True)
    area = models.ForeignKey(RouteArea, related_name='route_pickup_plan_routearea', on_delete=models.CASCADE, null=True,
                            blank=True)
    sequence = models.IntegerField(default=0)
    pickup_time = models.TimeField(null=True, blank=True)  # estimated time
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class RouteDropPlan(models.Model):
    route = models.ForeignKey(Route, related_name='route_drop_plan_route', on_delete=models.CASCADE, null=True, blank=True)
    area = models.ForeignKey(RouteArea, related_name='route_drop_plan_routearea', on_delete=models.CASCADE, null=True,
                            blank=True)
    sequence = models.IntegerField(default=0)
    drop_time = models.TimeField(null=True, blank=True)  # estimated time
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class RoutePricePlan(models.Model):
    name = models.CharField(max_length=255)
    academic_year = models.ForeignKey(AcademicYear, related_name='route_price_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ManyToManyField(Standard, blank=True, related_name='standard_route_price')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class RoutePrice(models.Model):
    price_plan = models.ForeignKey(RoutePricePlan, related_name='route_price_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    area = models.ForeignKey(RouteArea, related_name='route_price_routearea', on_delete=models.SET_NULL, null=True,
                             blank=True)
    km = models.FloatField(null=True)
    rate = models.FloatField()
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class RouteUserAddress(models.Model):
    user = models.ForeignKey(User, related_name='route_user_user', on_delete=models.CASCADE)
    area = models.ForeignKey(RouteArea, related_name='route_user_area', on_delete=models.CASCADE)
    academic_year = models.ForeignKey(AcademicYear, related_name='route_user_address_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class RouteUserAddressHistory(models.Model):
    user = models.ForeignKey(User, related_name='route_user_area_history_user', on_delete=models.CASCADE)
    area_data = models.CharField(max_length=1000)
    academic_year = models.ForeignKey(AcademicYear, related_name='route_user_area_history_address_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)

class RouteUserPickupMapping(models.Model):
    user = models.ForeignKey(User, related_name='route_user_pickup_mapping_user', null=True, blank=True,
                                on_delete=models.SET_NULL)
    pickup_route_plan = models.ForeignKey(RoutePickupPlan, related_name='route_user_pickup_mapping_pickup_route_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    pickup_from_date = models.DateField(auto_now_add=True)
    pickup_to_date = models.DateField(default='9999-12-31')

class RouteUserDropMapping(models.Model):
    user = models.ForeignKey(User, related_name='route_user_drop_mapping_user', null=True, blank=True,
                                on_delete=models.SET_NULL)
    drop_route_plan = models.ForeignKey(RouteDropPlan, related_name='route_user_drop_mapping_drop_route_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    drop_from_date = models.DateField(auto_now_add=True)
    drop_to_date = models.DateField(default='9999-12-31')