from datetime import date, datetime
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.classes.serializers import StandardSerializer
from apps.institutes.serializers import InstituteAddressReadSerializer
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer, CustomUniqueValidator
from apps.staffs.serializers import StaffSerializer
from apps.students.serializers import StudentListSerializer
from apps.transport.models import (Route, RouteArea, RoutePickupPlan, RouteDropPlan, RoutePrice, Vehicle, VehicleDriverMapping,
                                   VehicleRouteMapping, DriverLocation, RideDetail, RideStatus, Attendance,VehicleLocation)
from apps.transport.models.route import RouteUserAddress, RoutePricePlan, RouteUserDropMapping, RouteUserPickupMapping
from apps.transport.models.vehicle import GpsMachine


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'academic_year'),
                message='Route name is already exists in the given academic year.'
            )
        ]
        fields = '__all__'

class RouteAreaSerializer(serializers.ModelSerializer):
    institute_address_data = InstituteAddressReadSerializer(read_only=True, source='institute_address')

    class Meta:
        model = RouteArea
        fields = '__all__'


class RoutePickupPlanSerializer(serializers.ModelSerializer):
    area_details = RouteAreaSerializer(source='area', read_only=True)

    class Meta:
        model = RoutePickupPlan
        fields = '__all__'

class RouteDropSerializer(serializers.ModelSerializer):
    area_details = RouteAreaSerializer(source='area', read_only=True)

    class Meta:
        model = RouteDropPlan
        fields = '__all__'


class RoutePricePlanSerializer(serializers.ModelSerializer):
    standard_detail = StandardSerializer(many=True, read_only=True, source='standard')

    class Meta:
        model = RoutePricePlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('academic_year', 'name'),
                message='Route price plan name is already exist(s) in the academic year.'
            )
        ]
        fields = '__all__'


class RoutePriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoutePrice
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('price_plan', 'km')
            )
        ]
        fields = '__all__'


class AreaPriceSerializer(serializers.ModelSerializer):
    area_details = RouteAreaSerializer(source='area', read_only=True)

    class Meta:
        model = RoutePrice
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('price_plan', 'area'),
                message='price is already set for the area.'
            )
        ]
        fields = '__all__'


class GpsMachineSerializer(serializers.ModelSerializer):
    object_name = serializers.CharField(validators=[CustomUniqueValidator(queryset=GpsMachine.objects.all())])

    class Meta:
        model = GpsMachine
        fields = '__all__'

class VehicleSerializer(serializers.ModelSerializer):
    queryset = Vehicle.objects.filter(is_active=True)
    vehicle_code = serializers.CharField(validators=[UniqueValidator(queryset=queryset)])
    vehicle_num = serializers.CharField(validators=[UniqueValidator(queryset=queryset)])
    department_name = serializers.ReadOnlyField(source='department.name')
    gps_details = GpsMachineSerializer(source='gps',read_only=True)
    url = serializers.SerializerMethodField()
    def get_url(self, obj):
        return obj.url if obj.url else None
    
    class Meta:
        model = Vehicle
        exclude = ['created', 'modified']

class VehicleDriverMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleDriverMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(to_date__gte=date.today()),
                fields=('vehicle', 'driver')
            )
        ]
        fields = '__all__'


class GetVehicleDriverMappingSerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField(source='driver.first_name')
    middle_name = serializers.ReadOnlyField(source='driver.middle_name')
    last_name = serializers.ReadOnlyField(source='driver.last_name')
    mobile_num = serializers.ReadOnlyField(source='driver.mobile_num')
    email = serializers.ReadOnlyField(source='driver.email')
    dl_number = serializers.ReadOnlyField(source='driver.dl_number')
    name = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='driver.profile_pic')
    driver_user_id = serializers.ReadOnlyField(source='driver.users.id')

    def get_name(self, obj):
        middleName = obj.driver.middle_name if obj.driver.middle_name else ''
        return '{} {} {}'.format(obj.driver.first_name, middleName, obj.driver.last_name)

    class Meta:
        model = VehicleDriverMapping
        fields = '__all__'


class VehicleRouteMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = VehicleRouteMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(to_date__gte=date.today()),
                fields=('vehicle', 'route', 'assignment_type')
            )
        ]
        fields = '__all__'

class FilterVehicleRouteMappingSerializer(serializers.ListSerializer):
    
    def to_representation(self, data):
        data = data.filter(to_date__gte=datetime.today())
        return super(FilterVehicleRouteMappingSerializer, self).to_representation(data)
        
class VehicleRouteMappingReadSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)

    class Meta:
        list_serializer_class = FilterVehicleRouteMappingSerializer
        model = VehicleRouteMapping
        fields = '__all__'


class GetRoutePickupUserMappingSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    mobile_num = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    stop_name = serializers.ReadOnlyField(source='pickup_route_plan.area.name')
    profile_pic_details = serializers.SerializerMethodField()
    current_standard = serializers.ReadOnlyField(source='user.student.current_standard.id')
    current_standard_name = serializers.ReadOnlyField(source='user.student.current_standard.name')

    def get_name(self, obj):
        if obj.user.student:
            middle_name = obj.user.student.middle_name if obj.user.student.middle_name else ''
            return '{} {} {}'.format(obj.user.student.first_name, middle_name, obj.user.student.last_name)
        elif obj.user.staff:
            middle_name = obj.user.staff.middle_name if obj.user.staff.middle_name else ''
            return '{} {} {}'.format(obj.user.staff.first_name, middle_name, obj.user.staff.last_name)
        else:
            return None
    
    def get_mobile_num(self, obj):
        mobile_num = None
        if obj.user.student:
            mobile_num = obj.user.student.mobile_num
        elif obj.user.staff:
            mobile_num = obj.user.staff.mobile_num
        return mobile_num
    
    def get_email(self, obj):
        email = None
        if obj.user.student:
            email = obj.user.student.email
        elif obj.user.staff:
            email = obj.user.staff.email
        return email

    def get_profile_pic_details(self, obj):
        if obj.user.student and obj.user.student.profile_pic:
            doc = Document.objects.get(id=obj.user.student.profile_pic.id)
            return DocumentSerializer(doc).data
        elif obj.user.staff and obj.user.student.profile_pic:
            doc = Document.objects.get(id=obj.user.staff.profile_pic.id)
            return DocumentSerializer(doc).data
        return None

    class Meta:
        model = RouteUserPickupMapping
        fields = '__all__'

class GetRouteDropUserMappingSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    mobile_num = serializers.SerializerMethodField()
    email = serializers.SerializerMethodField()
    stop_name = serializers.ReadOnlyField(source='drop_route_plan.area.name')
    profile_pic_details = serializers.SerializerMethodField()
    current_standard = serializers.ReadOnlyField(source='user.student.current_standard.id')
    current_standard_name = serializers.ReadOnlyField(source='user.student.current_standard.name')

    def get_name(self, obj):
        if obj.user.student:
            middle_name = obj.user.student.middle_name if obj.user.student.middle_name else ''
            return '{} {} {}'.format(obj.user.student.first_name, middle_name, obj.user.student.last_name)
        elif obj.user.staff:
            middle_name = obj.user.staff.middle_name if obj.user.staff.middle_name else ''
            return '{} {} {}'.format(obj.user.staff.first_name, middle_name, obj.user.staff.last_name)
        else:
            return None
    
    def get_mobile_num(self, obj):
        mobile_num = None
        if obj.user.student:
            mobile_num = obj.user.student.mobile_num
        elif obj.user.staff:
            mobile_num = obj.user.staff.mobile_num
        return mobile_num
    
    def get_email(self, obj):
        email = None
        if obj.user.student:
            email = obj.user.student.email
        elif obj.user.staff:
            email = obj.user.staff.email
        return email

    def get_profile_pic_details(self, obj):
        if obj.user.student and obj.user.student.profile_pic:
            doc = Document.objects.get(id=obj.user.student.profile_pic.id)
            return DocumentSerializer(doc).data
        elif obj.user.staff and obj.user.student.profile_pic:
            doc = Document.objects.get(id=obj.user.staff.profile_pic.id)
            return DocumentSerializer(doc).data
        return None

    class Meta:
        model = RouteUserDropMapping
        fields = '__all__'


class RouteUserAddressSerializer(serializers.ModelSerializer):
    area_details = RouteAreaSerializer(source='area', read_only=True)
    student_details = StudentListSerializer(read_only=True, source='user.student')
    staff_details = StaffSerializer(read_only=True, source='user.staff')

    class Meta:
        model = RouteUserAddress
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('academic_year', 'user'),
                message='User area already exist'
            )
        ]
        fields = '__all__'

class RouteUserAddressReadSerializer(serializers.ModelSerializer):
    area_details = RouteAreaSerializer(source='area', read_only=True)
    student = serializers.ReadOnlyField(source='user.student.id', read_only=True)

    class Meta:
        model = RouteUserAddress
        fields = '__all__'

class DriverLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverLocation
        fields = '__all__'


class RideDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = RideDetail
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True, for_date=datetime.today().date()),
                fields=('type', 'route'),
                message='Ride is already started.'
            )
        ]
        fields = '__all__'


class RideStatusSerializer(serializers.ModelSerializer):
    class Meta:
        model = RideStatus
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('ride_detail', 'route_pickup_plan', 'route_drop_plan'),
                message='Ride status is already created.'
            )
        ]
        fields = '__all__'


class AttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Attendance
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('ride_detail', 'user'),
                message='User attendance is already exists for the ride.'
            )
        ]
        fields = '__all__'

class RouteUserPickupMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = RouteUserPickupMapping
        fields = '__all__'

class RouteUserDropMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = RouteUserDropMapping
        fields = '__all__'

class RouteReadSerialzier(serializers.ModelSerializer):
    vehicle_detail = VehicleRouteMappingReadSerializer(many=True, source='vehicle_route_route')
    
    class Meta:
        model = Route
        fields = '__all__'

class VehicleLocationSerializer(serializers.ModelSerializer):

    class Meta:
        model = VehicleLocation
        fields = '__all__'


