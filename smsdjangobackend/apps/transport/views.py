from rest_framework import viewsets, exceptions, permissions
from rest_framework.response import Response
from django.db.models import Q


from apps.shared.constants import DRIVER_GROUP
from apps.shared.services import SharedService, ConfigurationService, ApprovalService
from apps.staffs.models import Staff
from apps.staffs.serializers import StaffGetNameSerializer
from apps.transport.models import (Route, RouteArea, Route, RoutePrice, Vehicle, VehicleDriverMapping,
                                   VehicleRouteMapping, DriverLocation, RideDetail, RideStatus, Attendance,VehicleLocation)
from apps.transport.models.route import RouteUserAddress, RoutePricePlan
from apps.transport.models.vehicle import GpsMachine
from apps.transport.serializers import (GpsMachineSerializer, RouteReadSerialzier, RouteSerializer, RouteAreaSerializer, RoutePriceSerializer,
                                        VehicleSerializer, VehicleDriverMappingSerializer, DriverLocationSerializer,
                                        VehicleRouteMappingSerializer,
                                        RouteUserAddressSerializer, RideDetailSerializer, RideStatusSerializer,
                                        AttendanceSerializer, AreaPriceSerializer,
                                        RoutePricePlanSerializer,VehicleLocationSerializer)
from apps.transport.services.attendance import add_attendance
from apps.transport.services.default_variables import VENDOR_CODE_LIST
from apps.transport.services.driver import read_driver_details, read_driver_location
from apps.transport.services.ride import ride_status, start_ride, reached_status, ride_detail , get_routedetail_gpsnew, add_vehicle_url, gps_geofence_notification,add_vehicle_location
from apps.transport.services.route import (add_route, add_user_address, delete_route, get_route, add_area, delete_area, read_area_details,
                                           add_price, read_route_student, get_price, read_student_address,
                                           add_user_address, update_student_address, approve_price_plan,copy_route_user_address,
                                           update_price_plan, add_price_plan)
from apps.transport.services.shared import soft_delete_data, read_data
from apps.transport.services.vehicle import (add_or_update_gps_data, read_vehicle_details, add_driver_vehicle, update_driver_vehicle,
                                             read_vehicle_driver_details, add_route_vehicle, update_route_vehicle,
                                             delete_vehicle, delete_driver_vehicle, get_location_for_vehicle)
from apps.transport.services.gps_handling import handle_gurukulhigh_gps


class RouteViewSet(viewsets.ModelViewSet):
    serializer_class = RouteSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['is_active', 'academic_year', 'institute_address']

    def get_queryset(self):
        self.queryset = Route.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_route(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_route(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = RouteReadSerialzier
        response = get_route(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = RouteReadSerialzier
        response = get_route(self, True)
        return Response(response)

class RouteAreaViewSet(viewsets.ModelViewSet):
    serializer_class = RouteAreaSerializer
    http_method_names = ['get', 'post', 'delete']
    search_fields = ['name', 'address', 'pincode', 'landmark']
    ordering_fields = ['name', 'address', 'pincode', 'landmark']
    filterset_fields = ['area_type', 'institute_address']

    def get_queryset(self):
        self.queryset = RouteArea.objects.all()
        if self.request.GET.get('academic_year'):
            queryset = self.queryset.filter(
                route_price_routearea__price_plan__academic_year=self.request.GET.get('academic_year'),
                route_price_routearea__price_plan=self.request.GET.get('price_plan'),
                route_price_routearea__is_active=True, route_price_routearea__price_plan__is_active=True)
            self.queryset = self.queryset.exclude(id__in=queryset)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_area(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_area(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_area_details(self)
        return Response(response)

class RoutePricePlanViewSet(viewsets.ModelViewSet):
    serializer_class = RoutePricePlanSerializer
    http_method_names = ['post', 'put', 'delete', 'get']
    filterset_fields = ['is_active', 'academic_year']

    def get_queryset(self):
        self.queryset = RoutePricePlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_price_plan(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_price_plan(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        ApprovalService.get_approval_status(self, self.get_object(), message='Price plan is already approved.')
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)


class RoutePricePlanApproveViewSet(viewsets.ModelViewSet):
    serializer_class = RoutePricePlanSerializer
    http_method_names = ['put']

    def get_queryset(self):
        self.queryset = RoutePricePlan.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = approve_price_plan(self, request.data, **kwargs)
        return Response(response)


class RoutePriceViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'price_plan']
    search_fields = ['area__name', 'area__address_one', 'area__pincode', 'area__landmark']
    ordering_fields = ['area', 'rate']

    def get_queryset(self):
        self.queryset = RoutePrice.objects.all()
        return self.queryset

    def get_serializer_class(self):
        if ConfigurationService.get_setting_value('price_on_area') == '0':
            self.serializer_class = RoutePriceSerializer
        else:
            self.serializer_class = AreaPriceSerializer
        return self.serializer_class

    def create(self, request, *args, **kwargs):
        response = add_price(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_price(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        ApprovalService.get_approval_status(self, self.get_object().price_plan,
                                            message='Price plan is already approved.')
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        ApprovalService.get_approval_status(self, self.get_object().price_plan,
                                            message='Price plan is already approved.')
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    search_fields = ['vehicle_code','vehicle_num','manufacturer','model','name']

    def get_queryset(self):
        if self.request.GET.get('search'):
            search_query = self.request.GET.get('search')
            self.queryset = Vehicle.objects.filter(Q(vehicle_code__icontains=search_query) | Q(vehicle_num__icontains=search_query) | Q(manufacturer__icontains=search_query) | Q(model__icontains=search_query))
        else:
            self.queryset = Vehicle.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data, False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_vehicle(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_vehicle_details(self)
        return Response(response)


class VehicleDriverMappingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleDriverMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = VehicleDriverMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_driver_vehicle(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_driver_vehicle(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_driver_vehicle(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_vehicle_driver_details(self)
        return Response(response)


class VehicleRouteMappingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleRouteMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = VehicleRouteMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_route_vehicle(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_route_vehicle(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_data(self, True)
        return Response(response)


class RouteUserAddressViewSet(viewsets.ModelViewSet):
    serializer_class = RouteUserAddressSerializer
    http_method_names = ['get', 'post', 'put']

    def get_queryset(self):
        self.queryset = RouteUserAddress.objects.filter()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_user_address(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_student_address(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_student_address(self)
        return Response(response)

class CopyRouteUserAddressViewSet(viewsets.ModelViewSet):
    serializer_class = RouteUserAddressSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = RouteUserAddress.objects.filter()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = copy_route_user_address(self, request.data)
        return Response(response)

class DriverLocationViewSet(viewsets.ModelViewSet):
    serializer_class = DriverLocationSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = DriverLocation.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data, False)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = read_driver_location(self, request)
        return Response(response)


class DriverViewSet(viewsets.ModelViewSet):
    serializer_class = StaffGetNameSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Staff.objects.filter(users__groups=DRIVER_GROUP)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = read_driver_details(self)
        return Response(response)


class RideDetailViewSet(viewsets.ModelViewSet):
    serializer_class = RideDetailSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        self.queryset = RideDetail.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = start_ride(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = ride_detail(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = ride_status(self)
        return Response(response)


class RideStatusViewSet(viewsets.ModelViewSet):
    serializer_class = RideStatusSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = RideStatus.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = reached_status(self, request.data)
        return Response(response)


class RideAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = Attendance.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_attendance(self, request.data)
        return Response(response)

class GpsMachineViewSet(viewsets.ModelViewSet):
    serializer_class = GpsMachineSerializer
    http_method_names =['get', 'post', 'delete']

    def get_queryset(self):
        if self.request.GET.get('unmapped_data'):
            filter_query = Q(vehicle_gps__isnull=True) | Q(vehicle_gps__is_active=False)
            self.queryset = GpsMachine.objects.filter(filter_query)
        else:
            self.queryset = GpsMachine.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_update_gps_data(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('vendor_code_list'):
            return Response({'data': VENDOR_CODE_LIST})
        return Response(SharedService.read_data(self, True))

    def retrieve(self, request, *args, **kwargs):
        return Response(SharedService.read_data(self))

    def destroy(self, request, *args, **kwargs):
        if Vehicle.objects.filter(gps=self.kwargs['pk']):
            raise exceptions.ValidationError('Gps is already mapped to the vehicle')
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        queryset.delete()
        return Response({
            'Reason': 'Data Deleted Successfully'
        })

class GetVehicleLocationViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    http_method_names = ['get']
    
    def get_queryset(self):
        return Vehicle.objects.all()

    def retrieve(self, request, *args, **kwargs):
        response = get_location_for_vehicle(self, request)
        return Response(response)

class RouteDetailGpsViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleRouteMappingSerializer
    http_method_names = ['post']
    
    def get_queryset(self):
        return VehicleRouteMapping.objects.all()

    def create(self, request, *args, **kwargs):
        responsedata = get_routedetail_gpsnew(self,request)
        response = handle_gurukulhigh_gps(responsedata)
        response = add_vehicle_url(self,response)
        return  Response(response)
    
class GpsRouteNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']
    permission_classes = (permissions.AllowAny,)

    def create(self, request, *args, **kwargs):
        response = gps_geofence_notification(self,request)
        return  Response(response)
    
class VehicleLocationtrackingViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleLocationSerializer
    http_method_names =['get']

    def get_queryset(self):
        if self.request.GET.get('read'):
            return VehicleLocation.objects.all()
        else:
            return VehicleLocation.objects.none()

    def list(self,request, *args, **kwargs):
        if request.GET.get('read'):
            response = read_data(self,request)
            return Response(response)
        response = add_vehicle_location(self,request)
        return Response(response)
