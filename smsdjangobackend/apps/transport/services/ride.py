import json
from datetime import date, datetime, timedelta

from django.conf import settings
from django.db import transaction
from rest_framework import exceptions
from apps.hr.models import Day

from apps.shared.constants import DRIVER_GROUP, STUDENT_GROUP, TEACHER_GROUP
from apps.shared.services import SharedService,NotificationBodyTemplate
from apps.institutes.models import Institute
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models import VehicleDriverMapping, VehicleRouteMapping, RideStatus, RideDetail, Attendance, Vehicle, VehicleLocation
from apps.transport.models.route import Route, RoutePickupPlan, RouteDropPlan, RouteUserDropMapping, RouteUserPickupMapping,RouteUserAddress
from apps.transport.serializers import (GetRouteDropUserMappingSerializer, GetRoutePickupUserMappingSerializer, RideStatusSerializer, VehicleRouteMappingReadSerializer, VehicleRouteMappingSerializer, VehicleSerializer,
                                        GetVehicleDriverMappingSerializer)
from apps.notification.services.notification_service import send_notification
from apps.transport.services.gps_handling import handle_aadithya_gps,handle_wcis_gps,handle_shv_gps,handle_aips_gps
from apps.shared.utils import http_request


NOTIFICATION_BACKEND_URL = getattr(settings, 'NOTIFICATION_BACKEND_URL', None)


def start_ride(self, data):
    if data['type'] == 'pickup':
        route_pickup_plan = RoutePickupPlan.objects.filter(
            is_active=True, route=data['route']
        ).values_list('id', flat=True)
    elif data['type'] == 'drop':
        route_drop_plan = RouteDropPlan.objects.filter(
            is_active=True, route=data['route']
        ).values_list('id', flat=True)
    else:
        raise exceptions.ValidationError('Invalid type')
    if data['type'] == 'pickup' and not route_pickup_plan:
        raise exceptions.ValidationError(
            'Route pickup is not planned to start the ride.')
    elif data['type'] == 'drop' and not route_drop_plan:
        raise exceptions.ValidationError(
            'Route drop is not planned to start the ride'
        )
    with transaction.atomic(using=get_current_db_name()):
        vehicle_route_mapping = VehicleRouteMapping.objects.filter(
            route=data['route'], to_date__gte=date.today()
        )
        if not vehicle_route_mapping:
            raise exceptions.ValidationError(
                'Vehicle is not assigned to route.'
            )
        response = SharedService.add_data(self, data, False)
        data_list = []
        if data['type'] == 'pickup':
            for route in route_pickup_plan:
                data_list.append(
                    {'route_pickup_plan': route, 'ride_detail': response['data']['id'], 'route_drop_plan': None}
                )
        elif data['type'] == 'drop':
            for route in route_drop_plan:
                data_list.append(
                    {'route_drop_plan': route, 'ride_detail': response['data']['id'], 'route_pickup_plan': None}
                )
        serializer = RideStatusSerializer(data=data_list, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response = ride_status(self)
        return response

def ride_status(self):
    global pickup_route, drop_route, start_time, end_time
    user = self.request.user
    groups = user.groups.all().values_list('id', flat=True)
    status = 1
    currentTime = datetime.now().time()
    driver_id = self.request.query_params.get('driver')
    pickup_routes = None
    drop_routes = None
    drop_route = None
    pickup_route = None
    ride_type = ''
    if DRIVER_GROUP in groups:
        driver_id = user.staff
    if self.request.GET.get('pickup_route'):
        pickup_route = Route.objects.get(
            id=self.request.GET.get('pickup_route'))
    elif self.request.GET.get('drop_route'):
        drop_route = Route.objects.get(id=self.request.GET.get('drop_route'))
    elif STUDENT_GROUP in groups or TEACHER_GROUP in groups:
        try:
            user_pickup_data = RouteUserPickupMapping.objects.get(
                user=user, pickup_to_date__gte=date.today())
            user_drop_data = RouteUserDropMapping.objects.get(
                user=user, drop_to_date__gte=date.today())
        except Exception as e:
            raise exceptions.ValidationError(
                'User is not assigned to any route.')
        start_time = user_pickup_data.pickup_route_plan.pickup_time
        end_time = user_drop_data.drop_route_plan.drop_time
        pickup_route = user_pickup_data.pickup_route_plan.route
        drop_route = user_drop_data.drop_route_plan.route
    elif driver_id:
        try:
            driver = VehicleDriverMapping.objects.get(
                driver=driver_id, to_date__gte=date.today())
        except:
            raise exceptions.ValidationError(
                'Driver is not assigned to the vehicle.')
        try:
            vehicle = VehicleRouteMapping.objects.filter(
                vehicle=driver.vehicle, to_date__gte=date.today())
        except:
            raise exceptions.ValidationError(
                'Vehicle is not assigned to the route.')
        for veh in vehicle:
            if veh.assignment_type == 1:
                pickup_route = veh.route
            elif veh.assignment_type == 2:
                drop_route = veh.route
            else:
                pickup_route = veh.route
                drop_route = veh.route
    else:
        raise exceptions.ValidationError('User is not supported.')
    if pickup_route:
        pickup_routes = RoutePickupPlan.objects.filter(
            is_active=True, route=pickup_route).order_by('-sequence')
    if drop_route:
        drop_routes = RouteDropPlan.objects.filter(
            is_active=True, route=drop_route).order_by('-sequence')
    if not pickup_routes and not drop_routes:
        raise exceptions.ValidationError('Route is not planned')
    if self.request.GET.get('pickup_route') and not pickup_routes:
        raise exceptions.ValidationError('pickup route is not planned')
    if self.request.GET.get('drop_route') and not drop_routes:
        raise exceptions.ValidationError('drop route is not planned')
    if self.request.GET.get('pickup_route') and ((not pickup_routes.first().pickup_time) or not pickup_routes.last().pickup_time):
        raise exceptions.ValidationError('pickup time is mandatory')
    if (not self.request.GET.get('pickup_route') and not self.request.GET.get('drop_route')) and ((not pickup_routes.first().pickup_time) or (not drop_routes.first().drop_time) or \
            (not pickup_routes.last().pickup_time) or (not drop_routes.last().drop_time)):
        raise exceptions.ValidationError(
            'pickup time and drop time is mandatory to view the page')
    ride_detail = RideDetail.objects.filter(
        for_date=date.today(), is_active=True, route__in=[pickup_route, drop_route]
    )
    if pickup_routes and drop_routes:
        drop_time_difference = SharedService.get_time_difference_from_two_time(currentTime, drop_routes.last().drop_time, '%H:%M:%S') if SharedService.get_time_difference_from_two_time(currentTime, drop_routes.last(
        ).drop_time, '%H:%M:%S') < SharedService.get_time_difference_from_two_time(currentTime, drop_routes.first().drop_time, '%H:%M:%S') else SharedService.get_time_difference_from_two_time(currentTime, drop_routes.first().drop_time, '%H:%M:%S')
        if drop_time_difference > timedelta(hours=1) or ride_detail.filter(type='pickup', ride_status__reached=False):
            ride_type = 'pickup'
            first_stop_time = pickup_routes.first().pickup_time
            end_time = pickup_routes.last().pickup_time
            start_time = pickup_routes.first().pickup_time
        else:
            ride_type = 'drop'
            first_stop_time = drop_routes.first().drop_time
            start_time = drop_routes.first().drop_time
            end_time = drop_routes.last().drop_time
    elif pickup_routes:
        ride_type = 'pickup'
        first_stop_time = pickup_routes.first().pickup_time
        start_time = pickup_routes.first().pickup_time
        end_time = pickup_routes.last().pickup_time
    elif drop_routes:
        ride_type = 'drop'
        first_stop_time = drop_routes.first().drop_time
        start_time = drop_routes.first().drop_time
        end_time = drop_routes.last().drop_time
    travel_time = SharedService.get_time_difference_from_two_time(
        start_time, end_time, '%H:%M:%S')
    travel_time += timedelta(days=1)
    first_stop_time = SharedService.get_time_difference_from_two_time(
        currentTime, first_stop_time, '%H:%M:%S')
    # if first_stop_time < timedelta(minutes=15):
    #     status = 1
    ride_detail_type = ride_detail.filter(type=ride_type)
    ride_statuses = RideStatus.objects.filter(ride_detail__in=ride_detail_type)
    if ride_detail_type:
        status = 2
        if not ride_statuses.filter(reached=False):
            status = 4
            if not Attendance.objects.filter(ride_detail__in=ride_detail_type):
                status = 3
    pickup_route_lists = None
    drop_route_lists = None
    if pickup_routes:
        pickup_route_lists = pickup_routes.values(
            'id', 'sequence', 'pickup_time', 'area', 'area__address_one', 'area__address_two',
            'area__km', 'area__latitude', 'area__longitude', 'area__city', 'area__pincode',
            'area__country', 'area__district', 'area__name'
            )
    if drop_routes:
        drop_route_lists = drop_routes.values(
            'id', 'sequence', 'drop_time', 'area', 'area__address_one', 'area__address_two',
            'area__km', 'area__latitude', 'area__longitude', 'area__city', 'area__pincode',
            'area__country', 'area__district', 'area__name'
        )
    reached_mapping = {}
    temp_reached = ride_detail_type.values(
        'ride_status__route_pickup_plan', 'ride_status__reached', 'ride_status__route_drop_plan'
    )
    for temp in temp_reached:
        if temp['ride_status__route_pickup_plan']:
            reached_mapping[temp['ride_status__route_pickup_plan']] = temp['ride_status__reached']
        elif temp['ride_status__route_drop_plan']:
            reached_mapping[temp['ride_status__route_drop_plan']] = temp['ride_status__reached']
    lower_sequence_data_pickup = {}
    higher_sequence_data_pickup = {}
    higher_sequence_track_pickup = 1
    source_route_plan_id_pickup = None
    destination_route_plan_id_pickup = None

    lower_sequence_data_drop = {}
    higher_sequence_data_drop = {}
    higher_sequence_track_drop = 1
    source_route_plan_id_drop = None
    destination_route_plan_id_drop = None
    
    if pickup_route_lists:
        try:
            user_pickup_data = RouteUserPickupMapping.objects.get(
                    user=user, pickup_to_date__gte=date.today())
        except:
            user_pickup_data = None
        for route_plan in pickup_route_lists:
            route_plan.update(
                {
                    'reached': reached_mapping.get(route_plan['id'], False),
                    'user_location': True if user_pickup_data and route_plan['area'] == user_pickup_data.pickup_route_plan.area.id else False
                }
            )
            if route_plan['sequence'] == 1:
                lower_sequence_data_pickup = route_plan
            elif route_plan['sequence'] > higher_sequence_track_pickup:
                higher_sequence_data_pickup = route_plan
    if drop_route_lists:
        try:
            user_drop_data = RouteUserDropMapping.objects.get(
                user=user, drop_to_date__gte=date.today())
        except:
            user_drop_data = None
        for route_plan in drop_route_lists:
            route_plan.update(
                {
                    'reached': reached_mapping.get(route_plan['id'], False),
                    'user_location': True if user_drop_data and route_plan['area'] == user_drop_data.drop_route_plan.area.id else False
                }
            )
            if route_plan['sequence'] == 1:
                lower_sequence_data_drop = route_plan
            elif route_plan['sequence'] > higher_sequence_track_drop:
                higher_sequence_data_drop = route_plan

    if lower_sequence_data_pickup and higher_sequence_data_pickup:
        pickup_time = datetime.combine(
            date.min, lower_sequence_data_pickup['pickup_time'])  # pickup time of first stop
        # pickup time of second stop
        drop_time = datetime.combine(
            date.min, lower_sequence_data_pickup['pickup_time'])
        now = datetime.combine(date.min, datetime.now().time())
        # check nearest time and decide whether it is pickup or drop
        nearest_time = min([pickup_time, drop_time], key=lambda x: abs(x-now))
        if pickup_time == nearest_time:
            source_route_plan_id_pickup = lower_sequence_data_pickup['id']
            destination_route_plan_id_pickup = higher_sequence_data_pickup['id']
        else:
            source_route_plan_id_pickup = higher_sequence_data_pickup['id']
            destination_route_plan_id_pickup = higher_sequence_data_pickup['id']
    elif lower_sequence_data_pickup:
        source_route_plan_id_pickup = lower_sequence_data_pickup['id']

    if lower_sequence_data_drop and higher_sequence_data_drop:
        pickup_time = datetime.combine(
            date.min, lower_sequence_data_drop['drop_time'])  # pickup time of first stop
        # pickup time of second stop
        drop_time = datetime.combine(
            date.min, lower_sequence_data_drop['drop_time'])
        now = datetime.combine(date.min, datetime.now().time())
        # check nearest time and decide whether it is pickup or drop
        nearest_time = min([pickup_time, drop_time], key=lambda x: abs(x-now))
        if pickup_time == nearest_time:
            source_route_plan_id_drop = lower_sequence_data_drop['id']
            destination_route_plan_id_drop = higher_sequence_data_drop['id']
        else:
            source_route_plan_id_drop = higher_sequence_data_drop['id']
            destination_route_plan_id_drop = higher_sequence_data_drop['id']
    elif lower_sequence_data_drop:
        source_route_plan_id_drop = lower_sequence_data_drop['id']
    vehicle_route = VehicleRouteMapping.objects.filter(
        route__in=[pickup_route, drop_route], to_date__gte=date.today()
    )
    vehicle = VehicleRouteMappingReadSerializer(vehicle_route, many=True, read_only=True)
    vehicle = vehicle.data
    #need to change vehicle data
    return {
        'data': {'status': status, 'type': ride_type, 'start_time': start_time, 'end_time': end_time,
                 'pickup_route': pickup_route.pk if pickup_route else None, 'pickup_route_name': pickup_route.name if pickup_route else None, 'pickup_routes': pickup_route_lists,
                 'drop_routes': drop_route_lists, 'travel_time': (datetime.min + travel_time).time(),  'vehcile': vehicle,
                  'ride_detail': ride_detail_type.values().first(), 'source_route_plan_id_pickup': source_route_plan_id_pickup,
                  'source_route_plan_id_drop': source_route_plan_id_drop, 'destination_route_plan_id__pickup': destination_route_plan_id_pickup,
                  'destination_route_plan_id_drop': destination_route_plan_id_drop
        }
    }

def ride_detail(self):
    pickup_driver_detail = drop_driver_detail = drop_vehicle_detail = pickup_vehicle_detail = None
    student_pickup_detail = student_drop_detail = []
    user = self.request.user
    groups = user.groups.all().values_list('id', flat=True)
    driver_id = self.request.query_params.get('driver')
    if DRIVER_GROUP in groups:
        driver_id = user.staff
    if self.request.GET.get('pickup_route'):
        pickup_route = self.request.GET.get('pickup_route')
        pickup_vehicle_detail = VehicleRouteMapping.objects.filter(
            route=pickup_route, to_date__gte=date.today(), assignment_type__in=[1,2]
        ).first()
        vehicle_driver_mapping = VehicleDriverMapping.objects.filter(
            vehicle=pickup_vehicle_detail.vehicle, to_date__gte=date.today()
        )
        pickup_driver_detail = GetVehicleDriverMappingSerializer(vehicle_driver_mapping.first()).data
        pickup_vehicle_detail = VehicleSerializer(pickup_vehicle_detail.vehicle).data
        routes = RoutePickupPlan.objects.filter(
            is_active=True, route=pickup_route).order_by('-sequence')
        student = RouteUserPickupMapping.objects.filter(
            is_active=True,
            pickup_route_plan__in=routes, pickup_to_date__gte=date.today())
        student_pickup_detail = GetRoutePickupUserMappingSerializer(student, many=True).data
    elif self.request.GET.get('drop_route'):
        drop_route = self.request.GET.get('drop_route')
        drop_vehicle_detail = VehicleRouteMapping.objects.filter(
            route=drop_route, to_date__gte=date.today(), assignment_type__in=[2,3]
        ).first()
        vehicle_driver_mapping = VehicleDriverMapping.objects.filter(
            vehicle=drop_vehicle_detail.vehicle, to_date__gte=date.today()
        )
        drop_driver_detail = GetVehicleDriverMappingSerializer(vehicle_driver_mapping.first()).data
        drop_vehicle_detail = VehicleSerializer(drop_vehicle_detail.vehicle).data
        routes = RouteDropPlan.objects.filter(
            is_active=True, route=drop_route).order_by('-sequence')
        student = RouteUserDropMapping.objects.filter(
            is_active=True,
            drop_route_plan__in=routes, drop_to_date__gte=date.today())
        student_drop_detail = GetRouteDropUserMappingSerializer(student, many=True).data
    elif STUDENT_GROUP in groups:
        try:
            student_pickup = RouteUserPickupMapping.objects.get(
                user=user, pickup_to_date__gte=date.today()
            )
            pickup_route = student_pickup.pickup_route_plan.route
            pickup_vehicle_detail = VehicleRouteMapping.objects.filter(
                route=pickup_route, to_date__gte=date.today(), assignment_type__in=[1, 3]
            ).first()
            if pickup_vehicle_detail:
                driver = VehicleDriverMapping.objects.filter(
                    vehicle=pickup_vehicle_detail.vehicle, to_date__gte=date.today()
                )
                pickup_driver_detail = GetVehicleDriverMappingSerializer(driver.first()).data
                pickup_vehicle_detail = VehicleSerializer(pickup_vehicle_detail.vehicle).data
        except Exception as e:
            raise exceptions.ValidationError(
                'Student pickup is not assigned to any route.')
        try:
            student_drop = RouteUserDropMapping.objects.get(
                user=user, drop_to_date__gte=date.today()
            )
            drop_route = student_drop.drop_route_plan.route
            drop_vehicle_detail = VehicleRouteMapping.objects.filter(
                route=drop_route, to_date__gte=date.today(), assignment_type__in=[2,3]
            ).first()
            if drop_vehicle_detail:
                driver = VehicleDriverMapping.objects.filter(
                    vehicle=drop_vehicle_detail.vehicle, to_date__gte=date.today()
                )
                drop_driver_detail = GetVehicleDriverMappingSerializer(driver.first()).data
                drop_vehicle_detail = VehicleSerializer(drop_vehicle_detail.vehicle).data
        except:
            raise exceptions.ValidationError('Student drop is not assigned to any route.')
    elif driver_id:
        try:
            driver = VehicleDriverMapping.objects.get(
                driver=driver_id, to_date__gte=date.today())
        except:
            raise exceptions.ValidationError(
                'Driver is not assigned to the vehicle.')
        try:
            vehicle = VehicleRouteMapping.objects.filter(
                vehicle=driver.vehicle, to_date__gte=date.today())
            if not vehicle:
                raise exceptions.ValidationError('')
            vehicle_detail = VehicleRouteMappingReadSerializer(vehicle, many=True).data
            for vehicle in vehicle_detail:
                if vehicle['assignment_type'] == 'pickup':
                    pickup_vehicle_detail = vehicle
                    pickup_route = vehicle['route']
                    pickup_routes = RoutePickupPlan.objects.filter(
                        is_active=True, route=pickup_route
                    ).order_by('-sequence')
                elif vehicle['assignment_type'] == 'drop':
                    drop_vehicle_detail = vehicle
                    drop_route = vehicle['route']
                    drop_routes = RoutePickupPlan.objects.filter(
                        is_active=True, route=pickup_route
                    ).order_by('-sequence')
                else:
                    pickup_vehicle_detail = vehicle
                    drop_vehicle_detail = vehicle
                    pickup_route = vehicle['route']
                    drop_route = vehicle['route']
                    pickup_routes = RoutePickupPlan.objects.filter(
                        is_active=True, route=pickup_route
                    ).order_by('-sequence')
                    drop_routes = RoutePickupPlan.objects.filter(
                        is_active=True, route=pickup_route
                    ).order_by('-sequence')
        except Exception as e:
            raise exceptions.ValidationError('Vehicle is not assigned to the route.')
        if pickup_routes:
            pickup_ids = [pickup['route_id'] for pickup in pickup_routes.values()]
            pickup_student = RouteUserPickupMapping.objects.filter(
                pickup_route_plan__in=pickup_ids, pickup_to_date__gte=date.today())
            student_pickup_detail = GetRoutePickupUserMappingSerializer(pickup_student, many=True).data
        if drop_routes:
            drop_ids = [drop['route_id'] for drop in drop_routes.values()]
            drop_student = RouteUserDropMapping.objects.filter(
                drop_route_plan__in=drop_ids, drop_to_date__gte=date.today()
            )
            student_pickup_detail = GetRouteDropUserMappingSerializer(drop_student, many=True).data
    else:
        raise exceptions.ValidationError('User is not supported.')
    return {
        'data':
            {
                'pickup_vehicle_detail': pickup_vehicle_detail, 'drop_vehicle_detail': drop_vehicle_detail,
                'pickup_driver_detail': pickup_driver_detail, 'drop_driver_detail': drop_driver_detail,
                'pickup_student_detail': student_pickup_detail, 'drop_student_detail': student_drop_detail
            }
    }


def reached_status(self, data):
    ride_detail = self.get_queryset().filter(ride_detail__route=data['route'], ride_detail__for_date=date.today(),
                                             ride_detail__is_active=True, ride_detail__type=data['type'])
    if not ride_detail:
        raise exceptions.ValidationError('Ride is not started.')
    if data['type'] == 'pickup':
        location = ride_detail.filter(route_pickup_plan__in=data['ids'])
    elif data['type'] == 'drop':
        location = ride_detail.filter(route_drop_plan__in=data['ids'])
    else:
        raise exceptions.ValidationError('type is not valid choice')
    if not location:
        raise exceptions.ValidationError('Ride is not started.')
    if location.filter(reached=True):
        raise exceptions.ValidationError('Location is already reached.')
    location.update(reached=True)
    return {'Reason': 'Location is updated.', 'data': ride_status(self)['data']}

def get_routedetail_gpsnew(self,request):
    vehicle_id = request.data['vehicle_id']
    pickup_routes_list=[]
    drop_routes_list=[]
    vehicle_route_details = VehicleRouteMapping.objects.filter(vehicle=vehicle_id).values('route_id','vehicle_id','vehicle__vehicle_num','vehicle__name','route__name','assignment_type')
    for routes in vehicle_route_details:
        if routes['assignment_type'] =='1':
            pickup_routes_list.append(routes['route_id'])
        if routes['assignment_type'] =='2':
            drop_routes_list.append(routes['route_id'])
        if routes['assignment_type'] =='3':
            pickup_routes_list.append(routes['route_id'])
            drop_routes_list.append(routes['route_id'])
    pickup_details = RoutePickupPlan.objects.filter(is_active=True,route__in=pickup_routes_list).values('sequence','pickup_time','is_active','area_id','route_id','area__name','area__latitude','area__longitude','area__landmark').order_by('sequence')
    drop_details = RouteDropPlan.objects.filter(is_active=True,route__in=drop_routes_list).values('sequence','drop_time','is_active','area_id','route_id','area__name','area__latitude','area__longitude','area__landmark').order_by('sequence')
    route_stops_pickup={}
    start_end_time_pickup ={}
    route_stops_drop={}
    start_end_time_drop={}
    for pickup in pickup_details:
        temp_pickup={}
        if pickup['route_id'] not in route_stops_pickup:
            route_stops_pickup[pickup['route_id']] = []
            start_end_time_pickup[pickup['route_id']] ={
                'start_time' :pickup['pickup_time'],
                'end_time' :pickup['pickup_time']}
        if pickup['pickup_time']<start_end_time_pickup[pickup['route_id']]['start_time']:
            start_end_time_pickup[pickup['route_id']]['start_time']=pickup['pickup_time']
        if pickup['pickup_time']>start_end_time_pickup[pickup['route_id']]['end_time']:
            start_end_time_pickup[pickup['route_id']]['end_time']=pickup['pickup_time']
        temp_pickup['stopId']=str(pickup['area_id'])
        temp_pickup['stopName'] = pickup['area__name']
        temp_pickup['stopTime'] = pickup['pickup_time'].strftime("%H:%M:%S")
        temp_pickup['latitude'] = str(pickup['area__latitude'])
        temp_pickup['longitude'] = str(pickup['area__longitude'])
        temp_pickup['landmark'] = pickup['area__landmark']
        route_stops_pickup[pickup['route_id']].append(temp_pickup)
    for drop in drop_details:
        temp_drop={}
        if drop['route_id'] not in route_stops_drop:
            route_stops_drop[drop['route_id']] = []
            start_end_time_drop[drop['route_id']] ={
                'start_time' :drop['drop_time'],
                'end_time' :drop['drop_time']}
        if drop['drop_time']<start_end_time_drop[drop['route_id']]['start_time']:
            start_end_time_drop[drop['route_id']]['start_time']=drop['drop_time']
        if drop['drop_time']>start_end_time_drop[drop['route_id']]['end_time']:
            start_end_time_drop[drop['route_id']]['end_time']=drop['drop_time']
        temp_drop['stopId']=str(drop['area_id'])
        temp_drop['stopName'] = drop['area__name']
        temp_drop['stopTime'] = drop['drop_time'].strftime("%H:%M:%S")
        temp_drop['latitude'] = str(drop['area__latitude'])
        temp_drop['longitude'] = str(drop['area__longitude'])
        temp_drop['landmark'] = drop['area__landmark']
        route_stops_drop[drop['route_id']].append(temp_drop)
    routedetails_gps={'journeys':[]}
    for route in vehicle_route_details:
        route_data_pickup={}
        route_data_drop={}
        routedetails_gps['thingId']=route['vehicle__vehicle_num'].replace(' ','')
        routedetails_gps['thingName']=route['vehicle__name']
        if route['assignment_type'] =='1':
            route_data_pickup['journeyId'] = str(route['route_id'])
            route_data_pickup['journeyName'] = route['route__name']
            route_data_pickup['journeyType'] = "PICKING"
            route_data_pickup['startTime'] = start_end_time_pickup[route['route_id']]['start_time'].strftime("%H:%M:%S")
            route_data_pickup['endTime'] = start_end_time_pickup[route['route_id']]['end_time'].strftime("%H:%M:%S")
            route_data_pickup['workingDays'] = list(Day.get_student_working_days(self))
            route_data_pickup['disabled'] = False
            route_data_pickup['stops']=[]
            route_data_pickup['stops']+=route_stops_pickup[route['route_id']]
            routedetails_gps['journeys'].append(route_data_pickup)
        if route['assignment_type'] =='2':
            route_data_drop['journeyId'] = str(route['route_id'])
            route_data_drop['journeyName'] = route['route__name']
            route_data_drop['journeyType'] = "DROPPING"
            route_data_drop['workingDays'] = list(Day.get_student_working_days(self))
            route_data_drop['disabled'] = False
            route_data_drop['stops']=[]
            route_data_drop['startTime'] = start_end_time_drop[route['route_id']]['start_time'].strftime("%H:%M:%S")
            route_data_drop['endTime'] = start_end_time_drop[route['route_id']]['end_time'].strftime("%H:%M:%S")
            route_data_drop['stops']+=route_stops_drop[route['route_id']]
            routedetails_gps['journeys'].append(route_data_drop)
    Vehicle.objects.filter(id=vehicle_id).update(last_sync=datetime.today())
    return routedetails_gps

def gps_geofence_notification(self,request):
    data=request.data
    notification_obj = NotificationBodyTemplate('gpsgeofence_create')
    notification_obj_eta = NotificationBodyTemplate('gps_eta_create')
    customizedData = list()
    customizedDataETA =list()
    filter_query = {"route":data['journey_id']}
    if data['event_type'] == "eta":
        filter_query['area']=data['stop_id']
    if data['journey_type'] == "DROPPING":
        drop_details = RouteDropPlan.objects.filter(**filter_query).values('route_user_drop_mapping_drop_route_plan__user_id','route__name',
                                                    'route_user_drop_mapping_drop_route_plan__user__student_id','route_user_drop_mapping_drop_route_plan__user__student__first_name',
                                                    'route_user_drop_mapping_drop_route_plan__user__student__email','area','area__name')
        for students in drop_details:
            temp = {
            'student_name': students['route_user_drop_mapping_drop_route_plan__user__student__first_name'],
            'route_name':students['route__name'],
            'pickup_or_drop':"drop-off",
            'area_name':students['area__name'],
            }
            temp['distance'] = data['distance_km'] if 'distance_km' in data else ''
            body_push = notification_obj.select_template('push', temp) if data['event_type'] == "geofence" else notification_obj_eta.select_template('push', temp)
            body_email = notification_obj.select_template('email', temp) if data['event_type'] == "geofence" else notification_obj_eta.select_template('email', temp)
            if students['route_user_drop_mapping_drop_route_plan__user__student__email']:
                email_data = {'email': students['route_user_drop_mapping_drop_route_plan__user__student__email'], 'user_id': students['route_user_drop_mapping_drop_route_plan__user_id'], 'email_subject': None,
                                   'email_body': body_email,'email_notification':1}
                customizedData.append(email_data) if data['event_type'] == "geofence" else customizedDataETA.append(email_data)
            push_data={'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': students['route_user_drop_mapping_drop_route_plan__user_id'], 'extra_params': {}}
            if students['route_user_drop_mapping_drop_route_plan__user_id']:
                customizedData.append(push_data) if data['event_type'] == "geofence" else customizedDataETA.append(push_data)
    if data['journey_type'] == "PICKING":
        drop_details = RoutePickupPlan.objects.filter(**filter_query).values('route_user_pickup_mapping_pickup_route_plan__user_id','route__name',
                                                    'route_user_pickup_mapping_pickup_route_plan__user__student_id','route_user_pickup_mapping_pickup_route_plan__user__student__first_name',
                                                    'route_user_pickup_mapping_pickup_route_plan__user__student__email','area','area__name')
        for students in drop_details:
            temp = {
            'student_name': students['route_user_pickup_mapping_pickup_route_plan__user__student__first_name'],
            'route_name':students['route__name'],
            'pickup_or_drop':"pick-up",
            'area_name':students['area__name']
            }
            temp['distance'] = data['distance_km'] if 'distance_km' in data else ''
            body_push = notification_obj.select_template('push', temp) if data['event_type'] == "geofence" else notification_obj_eta.select_template('push', temp)
            body_email = notification_obj.select_template('email', temp) if data['event_type'] == "geofence" else notification_obj_eta.select_template('email', temp)
            if students['route_user_pickup_mapping_pickup_route_plan__user__student__email']:
                email_data = {'email': students['route_user_pickup_mapping_pickup_route_plan__user__student__email'], 'user_id': students['route_user_pickup_mapping_pickup_route_plan__user_id'], 'email_subject': None,
                                   'email_body': body_email,'email_notification':1}
                customizedData.append(email_data) if data['event_type'] == "geofence" else customizedDataETA.append(email_data)
            push_data={'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': students['route_user_pickup_mapping_pickup_route_plan__user_id'], 'extra_params': {}}
            if students['route_user_pickup_mapping_pickup_route_plan__user_id']:
                customizedData.append(push_data) if data['event_type'] == "geofence" else customizedDataETA.append(push_data)
    send_notification('gpsgeofence_create', body=None, customizedData=customizedData)
    send_notification('gps_eta_create', body=None, customizedData=customizedDataETA)

def add_vehicle_url(self,vehicle_urldetails):
    if vehicle_urldetails['thing_id']:
        Vehicle.objects.filter(vehicle_num=vehicle_urldetails['thing_id']).update(url=vehicle_urldetails['tracking_url'])
        response ={'data': 'url added successfully'}
    else:
        raise exceptions.ValidationError('couldnt find the vehicle')
    return response

def add_vehicle_location(self,vehicle):
    vehicle_mapped_pickup=None
    vehicle_mapped_drop=None
    if isinstance(vehicle, dict) and 'user_id' in vehicle:
        user_id = vehicle['user_id']
    else:
        user_id = self.request.user
        student_id = user_id.student.id
    institute_obj = Institute.get_institute(self)
    user_route_pickup = RouteUserPickupMapping.objects.filter(user=user_id).values('user_id','pickup_route_plan__route','pickup_route_plan__area','pickup_route_plan__area__latitude','pickup_route_plan__area__longitude').first()
    user_route_drop = RouteUserDropMapping.objects.filter(user=user_id).values('user_id','drop_route_plan__route','drop_route_plan__area','drop_route_plan__area__latitude','drop_route_plan__area__longitude').first()
    vehicle_id = None
    if user_route_pickup:
        vehicle_mapped_pickup = VehicleRouteMapping.objects.filter(route = user_route_pickup['pickup_route_plan__route'],assignment_type=1).values().first()
    if user_route_drop:
        vehicle_mapped_drop = VehicleRouteMapping.objects.filter(route = user_route_drop['drop_route_plan__route'],assignment_type=2).values().first()
    if vehicle_mapped_pickup and vehicle_mapped_drop and vehicle_mapped_pickup['vehicle_id'] == vehicle_mapped_drop['vehicle_id']:
        vehicle_id = vehicle_mapped_pickup['vehicle_id']
    elif vehicle_mapped_pickup:
        vehicle_id = vehicle_mapped_pickup['vehicle_id']
    elif vehicle_mapped_drop:
        vehicle_id = vehicle_mapped_drop['vehicle_id']
    if not vehicle_id:
        raise exceptions.ValidationError('Student is not mapped to any area and vehicle in the route plan')
    vehicle_details = Vehicle.objects.get(id=vehicle_id)
    student_area = RouteUserAddress.objects.filter(user=user_id).values('area_id','area__name','area__latitude','area__longitude').first()
    institute_location_latitude = Institute.get_institute(self).latitude
    institute_location_longitude = Institute.get_institute(self).longitude
    current_time = datetime.now()
    vehicle_location = VehicleLocation.objects.filter(vehicle=vehicle_id).values('vehicle','latitude','longitude','extra_details','created','modified','vehicle__vehicle_num','token')
    vehicle_data = {}
    response ={"data":[]}
    if vehicle_location:
        for vehicle in vehicle_location:
            if vehicle['vehicle__vehicle_num'] not in vehicle_data:
                vehicle_data[vehicle['vehicle__vehicle_num']] = {
                    'modified':vehicle['modified'],
                    'vehicle_num':vehicle['vehicle__vehicle_num']
                }
            if institute_obj.code == 'aips':
                after_one_min = vehicle['modified']+timedelta(seconds=180)
            else:
                after_one_min = vehicle['modified']+timedelta(seconds=60)
            today = current_time.strftime('%d-%m-%Y')
            if current_time < after_one_min:
                vehicle['van_latitude'] = float(vehicle['latitude']) if vehicle['latitude'] else vehicle['latitude']
                vehicle['van_longitude'] = float(vehicle['longitude']) if vehicle['longitude'] else vehicle['longitude']
                vehicle['institute_latitude'] = float(institute_location_latitude)
                vehicle['institute_longitude'] = float(institute_location_longitude)
                vehicle['student_latitude'] = float(student_area['area__latitude']) if student_area.get('area__latitude') is not None else None
                vehicle['student_longitude'] = float(student_area['area__longitude']) if student_area.get('area__longitude') is not None else None
                response['data'].append(vehicle)
            else:
                if institute_obj.code == 'wcis':
                    gps_response = handle_wcis_gps(vehicle)
                elif institute_obj.code == 'shv':
                    gps_response = handle_shv_gps(vehicle)
                elif institute_obj.code == 'aips':
                    gps_response = handle_aips_gps(vehicle)
                else:
                    gps_response = handle_aadithya_gps(vehicle)
                if 'errorMessage' in gps_response and gps_response['errorMessage'] != "None":
                    raise exceptions.ValidationError(gps_response['errorMessage'])
                for vehicle_detail in gps_response['vehicleData']:
                    data ={}
                    if 'vehicleNo' in vehicle_detail:
                        if institute_obj.code == 'aips':
                            vehicle_obj = Vehicle.objects.get(vehicle_num=vehicle_detail['vehicleNo'])
                        else:
                            vehicle_obj = Vehicle.objects.get(vehicle_num=SharedService.format_vehicle_number(vehicle_detail['vehicleNo']))
                        data['latitude'] = vehicle_detail['latitude']
                        data['longitude'] = vehicle_detail['longitude']
                        data['vehicle'] = vehicle_obj.id
                        data['extra_details'] = vehicle_detail
                        try:
                            instance = VehicleLocation.objects.get(vehicle_id = vehicle_obj.id)
                            serializer = self.get_serializer(instance=instance, data=data, partial=True)
                            serializer.is_valid(raise_exception=True)
                            serializer.save()
                        except:
                            serializer = self.get_serializer(data=data)
                            serializer.is_valid(raise_exception=True)
                            serializer.save()
                    serializer = serializer.data
                    serializer['van_latitude'] = float(serializer['latitude']) if serializer['latitude'] else serializer['latitude']
                    serializer['van_longitude'] = float(serializer['longitude']) if serializer['longitude'] else serializer['longitude']
                    serializer['institute_latitude'] = float(institute_location_latitude)
                    serializer['institute_longitude'] = float(institute_location_longitude)
                    serializer['student_latitude'] = float(student_area['area__latitude']) if student_area.get('area__latitude') is not None else None
                    serializer['student_longitude'] = float(student_area['area__longitude']) if student_area.get('area__longitude') is not None else None
                    kwargs = SharedService.get_notification_header()
                    url = NOTIFICATION_BACKEND_URL + 'notification/locations/'
                    hash_key = vehicle_detail['vehicleNo'].replace(' ', '')
                    firebase_data = {'hash_key': hash_key,
                                    'location': {'latitude': vehicle_detail['latitude'], 'longitude': vehicle_detail['longitude'],'extra_details':vehicle_detail,'time':current_time.strftime('%Y-%m-%d %H:%M:%S')},
                                    'company_id':Institute.get_institute(self).company_id,'date':today
                    }
                    remote_response = http_request('POST', url, json.dumps(firebase_data), **kwargs)
                    if remote_response.status_code != 200:
                        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
                    response['data'].append(serializer)
    else:
        if institute_obj.code == 'wcis':
            gps_response = handle_wcis_gps({'vehicle':vehicle_id,'vehicle__vehicle_num':vehicle_details.vehicle_num,'latitude':'','langitude':''})
        elif institute_obj.code == 'shv':
            gps_response = handle_shv_gps({'vehicle':vehicle_id,'vehicle__vehicle_num':vehicle_details.vehicle_num,'latitude':'','langitude':''})
        elif institute_obj.code == 'aips':
            gps_response = handle_aips_gps({'vehicle':vehicle_id,'vehicle__vehicle_num':vehicle_details.vehicle_num,'latitude':'','langitude':''})
        else:
            gps_response = handle_aadithya_gps({'vehicle':vehicle_id,'vehicle__vehicle_num':vehicle_details.vehicle_num,'latitude':'','langitude':''})
        if gps_response['errorMessage'] != "None":
            raise exceptions.ValidationError(gps_response['errorMessage'])
        for vehicle_detail in gps_response['vehicleData']:
            data ={}
            vehicle_obj=None
            if 'vehicleNo' in vehicle_detail:
                try:
                    vehicle_obj = Vehicle.objects.get(vehicle_num=vehicle_detail['vehicleNo'])
                    data['vehicle'] = vehicle_obj.id
                except:
                    if vehicle_detail['vehicleNo'] == vehicle_details.vehicle_num:
                        raise exceptions.ValidationError('Student mapped vehicle is not mapped to GPS')
                    else:
                        pass
                data['latitude'] = vehicle_detail['latitude']
                data['longitude'] = vehicle_detail['longitude']
                data['extra_details'] = vehicle_detail
                if vehicle_obj:
                    try:
                        instance = VehicleLocation.objects.get(vehicle_id = vehicle_obj.id)
                        serializer = self.get_serializer(instance=instance, data=data, partial=True)
                        serializer.is_valid(raise_exception=True)
                        serializer.save()
                    except:
                        serializer = self.get_serializer(data=data)
                        serializer.is_valid(raise_exception=True)
                        serializer.save()
            serializer = serializer.data
            serializer['van_latitude'] = float(serializer['latitude']) if serializer['latitude'] else serializer['latitude']
            serializer['van_longitude'] = float(serializer['longitude']) if serializer['latitude'] else serializer['latitude']
            serializer['institute_latitude'] = float(institute_location_latitude)
            serializer['institute_longitude'] = float(institute_location_longitude)
            serializer['student_latitude'] = float(student_area['area__latitude']) if student_area['area__latitude'] else None
            serializer['student_longitude'] = float(student_area['area__longitude']) if student_area['area__longitude'] else None
            if vehicle_obj and vehicle_id == vehicle_obj.id:
                response['data'].append(serializer)
    return response


        
    