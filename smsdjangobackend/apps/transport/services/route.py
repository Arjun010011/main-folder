from datetime import date, timedelta, datetime
import json

from django.db import transaction
from rest_framework import exceptions
from django.db.models import Q

from apps.classes.models import StandardSectionMapping
from apps.classes.models.standard import InstituteAdresses
from apps.finance.models import PaymentDetail
from apps.finance.services.fee_plan import TRANSPORT_CODENAME
from apps.institutes.models import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.models.approval import ApproveStatus
from apps.shared.services import SharedService, ConfigurationService, ApprovalService, add_google_map_data
from apps.staffs.models import Staff
from apps.staffs.serializers import StaffGetNameSerializer
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models import (Vehicle, VehicleDriverMapping, RouteDropPlan, RoutePickupPlan, VehicleRouteMapping, RideDetail,
                                   RideStatus)
from apps.transport.models.route import RouteArea, RouteUserAddress, RoutePricePlan, RouteUserAddressHistory, RouteUserDropMapping, RouteUserPickupMapping
from apps.transport.serializers import (RouteAreaSerializer, RouteUserAddressReadSerializer, RouteUserAddressSerializer, RouteUserDropMappingSerializer, RouteUserPickupMappingSerializer, VehicleSerializer, VehicleRouteMappingSerializer, RoutePickupPlanSerializer,
                                        RouteDropSerializer)
from apps.users.models import User
from apps.users.serializers import UserReadSerializer
from apps.classes.models.enrollment import StudentStandardMapping

"""
    This will udpate the old vehicle mapping data
"""
def add_or_update_vehicle_route(self, vehicle_data, route_id, academic_year_start_date, academic_year_end_date):
    check_duplicate_vehicle = {}
    vehicle_ids = []
    exisiting_assignement_values = {}
    given_assignment_values = {}
    vehicle_ids = []
    existing_data = VehicleRouteMapping.objects.filter(
        route=route_id, to_date__gte=datetime.now().date()
    ).values()
    for existing in existing_data:
        exisiting_assignement_values[existing['assignment_type']] = existing
    for vehicle in vehicle_data:
        vehicle['route'] = route_id
        vehicle['to_date'] = academic_year_end_date
        key = str(vehicle['vehicle']) + '' + str(vehicle['assignment_type'])
        if key in check_duplicate_vehicle:
            raise exceptions.ValidationError(
                'Duplicate vehicle details found'
            )
        check_duplicate_vehicle[key] = vehicle
        vehicle_ids.append(vehicle['vehicle'])
        given_assignment_values[str(vehicle['assignment_type'])] = vehicle
    data_to_save = []
    ids_to_update_as_delete = []
    is_existing_assignment_three = True if '3' in exisiting_assignement_values else False
    is_given_assignment_three = True if '3' in given_assignment_values else False
    if not exisiting_assignement_values:
        for vehicle in vehicle_data:
            vehicle['from_date'] = academic_year_start_date
            vehicle['to_date'] = academic_year_end_date
        data_to_save += vehicle_data
    elif is_given_assignment_three and is_existing_assignment_three:
        if exisiting_assignement_values['3']['vehicle_id'] != given_assignment_values['3']['vehicle']:
            given_assignment_values['3']['from_date'] = datetime.now().date()
            data_to_save.append(
                given_assignment_values['3']
            )
            ids_to_update_as_delete.append(exisiting_assignement_values['3']['id'])
    elif is_given_assignment_three:
        given_assignment_values['3']['from_date'] = datetime.now().date()
        data_to_save.append(
            given_assignment_values['3']
        )
        ids_to_update_as_delete += [exisiting_assignement_values[e]['id'] for e in exisiting_assignement_values.keys()]
    elif is_existing_assignment_three and '1' in given_assignment_values and '2' in given_assignment_values:
        if given_assignment_values['1']['vehicle'] == given_assignment_values['2']['vehicle']:
            given_assignment_values['1']['assignment_type'] = '3'
            if not( '2' in exisiting_assignement_values ) or not given_assignment_values['1']['vehicle'] == exisiting_assignement_values['2']['vehicle']:
                given_assignment_values['1']['from_date'] = datetime.now().date()
                data_to_save.append(
                    given_assignment_values['1']
                )
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['3']['id']
                )
        else:
            given_assignment_values['1']['from_date'] = datetime.now().date()
            given_assignment_values['2']['from_date'] = datetime.now().date()
            data_to_save.append(
                given_assignment_values['1']
            )
            data_to_save.append(
                given_assignment_values['2']
            )
            ids_to_update_as_delete.append(
                exisiting_assignement_values['3']['id']
            )
    elif is_existing_assignment_three:
        ids_to_update_as_delete.append(exisiting_assignement_values['3']['id'])
        if '1' in given_assignment_values:
            given_assignment_values['1']['from_date'] = datetime.now().date()
            data_to_save.append(
                given_assignment_values['1']
            )
        elif '2' in given_assignment_values:
            given_assignment_values['2']['from_date'] = datetime.now().date()
            data_to_save.append(
                given_assignment_values['2']
            )
    elif '1' in exisiting_assignement_values and '2' in exisiting_assignement_values:
        if '1' in given_assignment_values and '2' in given_assignment_values:
            if given_assignment_values['1']['vehicle'] != exisiting_assignement_values['1']['vehicle_id']:
                given_assignment_values['1']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['1'])
                ids_to_update_as_delete.append(exisiting_assignement_values['1']['id'])
            if given_assignment_values['2']['vehicle'] != exisiting_assignement_values['2']['vehicle_id']:
                given_assignment_values['2']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['2'])
                ids_to_update_as_delete.append(exisiting_assignement_values['1']['id'])
        elif '1' in given_assignment_values:
            if exisiting_assignement_values['1']['vehicle_id'] != given_assignment_values['1']['vehicle']:
                given_assignment_values['1']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['1'])
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['1']['id']
                )
            else:
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['2']['id']
                )
        elif '2' in given_assignment_values:
            if '2' in exisiting_assignement_values and exisiting_assignement_values['2']['vehicle_id'] != given_assignment_values['2']['vehicle']:
                given_assignment_values['2']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['2'])
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['2']['id']
                )
            else:
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['1']['id']
                )
    elif '1' in exisiting_assignement_values:
        if '1' in given_assignment_values and '2' in given_assignment_values:
            if given_assignment_values['1']['vehicle'] != exisiting_assignement_values['1']['vehicle_id']:
                given_assignment_values['1']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['1'])
                ids_to_update_as_delete.append(exisiting_assignement_values['1']['id'])
            given_assignment_values['2']['from_date'] = datetime.now().date()
            data_to_save.append(given_assignment_values['2'])
        elif '1' in given_assignment_values:
            if exisiting_assignement_values['1']['vehicle_id'] != given_assignment_values['1']['vehicle']:
                given_assignment_values['1']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['1'])
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['1']['id']
                )
        elif '2' in given_assignment_values:
            given_assignment_values['2']['from_date'] = datetime.now().date()
            data_to_save.append(given_assignment_values['2'])
            ids_to_update_as_delete.append(
                exisiting_assignement_values['1']['id']
            )
    elif '2' in exisiting_assignement_values:
        if '2' in given_assignment_values and '1' in given_assignment_values:
            if given_assignment_values['2']['vehicle'] != exisiting_assignement_values['2']['vehicle_id']:
                given_assignment_values['2']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['2'])
                ids_to_update_as_delete.append(exisiting_assignement_values['2']['id'])
            given_assignment_values['1']['from_date'] = datetime.now().date()
            data_to_save.append(given_assignment_values['1'])
        elif '2' in given_assignment_values:
            if exisiting_assignement_values['2']['vehicle_id'] != given_assignment_values['2']['vehicle']:
                given_assignment_values['2']['from_date'] = datetime.now().date()
                data_to_save.append(given_assignment_values['2'])
                ids_to_update_as_delete.append(
                    exisiting_assignement_values['2']['id']
                )
        elif '1' in given_assignment_values:
            given_assignment_values['1']['from_date'] = datetime.now().date()
            data_to_save.append(given_assignment_values['1'])
            ids_to_update_as_delete.append(
                exisiting_assignement_values['2']['id']
            )
    if ids_to_update_as_delete:
        for update_data in list(set(ids_to_update_as_delete)):
            instance = VehicleRouteMapping.objects.get(id=update_data)
            if instance.from_date > datetime.now().date() - timedelta(days=1):
                instance.delete()
            else:
                vehicle_serializer = VehicleRouteMappingSerializer(instance=instance, data={
                'to_date': datetime.now().date() - timedelta(days=1)
                },partial=True)
                vehicle_serializer.is_valid(raise_exception=True)
                vehicle_serializer.save()
    if data_to_save:
        vehicle_serializer = VehicleRouteMappingSerializer(data=data_to_save, many=True)
        vehicle_serializer.is_valid(raise_exception=True)
        vehicle_serializer.save()

def delete_route_user_pickup_mapping(self, deletable_ids):
    route_user_pickup_mapping = RouteUserPickupMapping.objects.filter(id__in=deletable_ids)
    now= datetime.now().date()
    for route_user in route_user_pickup_mapping:
        if route_user.pickup_from_date == now:
            route_user.delete() #permanently delete if editing on the same date
        else:
            RouteUserPickupMapping.objects.filter(id=route_user.id).update(
                pickup_to_date=now - timedelta(days=1), is_active=False
            )

def delete_route_user_drop_mapping(self, deletable_ids):
    route_user_drop_mapping = RouteUserDropMapping.objects.filter(id__in=deletable_ids)
    now= datetime.now().date()
    for route_user in route_user_drop_mapping:
        if route_user.drop_from_date == now:
            route_user.delete() #permanently delete if editing on the same date
        else:
            RouteUserDropMapping.objects.filter(id=route_user.id).update(
                drop_to_date=now - timedelta(days=1), is_active=False
            )

#add / update
def add_route(self, data, **kwargs):
    pickup_users = list()
    drop_users = list()
    pickup_area = list()
    drop_area = list()
    academicYear = AcademicYear.objects.get(id=data['academic_year'])
    with transaction.atomic(using=get_current_db_name()):
        if data.get('id'):
            ride_status_check(data['id'])
            rides = RideDetail.objects.filter(for_date=date.today(), is_active=True, route=data['id'])
            for ride in rides:
                if RideStatus.objects.filter(ride_detail=ride, reached=False):
                    raise exceptions.ValidationError(
                        'Ride is started for the route. Please update after the ride is completed.')
            self.kwargs['pk'] = data['id']
            SharedService.update_data(self, data, **kwargs)
            data['route'] = data['id']
        else:
            response = SharedService.add_data(self, data, False)
            data['route'] = response['data']['id']
        #    Assignment of vehicle only for the first time the vehicle is getting assigned
        RoutePickupPlan.objects.filter(
            id__in=data['delete_pickup_routes']
        ).update(is_active=False)
        RouteDropPlan.objects.filter(
            id__in=data['delete_drop_routes']
        ).update(is_active=False)
        if data.get('delete_route_user_drop_mapping'):
            delete_route_user_drop_mapping(self, data['delete_route_user_drop_mapping'])
        if data.get('delete_route_user_pickup_mapping'):
            delete_route_user_pickup_mapping(self, data['delete_route_user_pickup_mapping'])
        add_or_update_vehicle_route(self, data['vehicle_assignment_detail'], data['route'], academicYear.start_date, academicYear.end_date)
        for i, route in enumerate(data['pickup_routes'], start=1):
            if i != route['sequence']:
                raise exceptions.ValidationError('Route stop(s) are not in sequence.')
            pickup_area.append(route['area'])
            pickup_users += route['users']
            route.update({'route': data['route']})
        if len(pickup_area) != len(set(pickup_area)):
            raise exceptions.ValidationError('Duplicate area(s) found in a Pickup route plan.')
        if len(pickup_users) != len(set(pickup_users)):
            raise exceptions.ValidationError('Duplicate user(s) found in a Pickup route plan.')
        for i, route in enumerate(data['drop_routes'], start=1):
            if i != route['sequence']:
                raise exceptions.ValidationError('Route stop(s) are not in sequence.')
            drop_area.append(route['area'])
            drop_users += route['users']
            route.update({'route': data['route']})
        if len(drop_area) != len(set(drop_area)):
            raise exceptions.ValidationError('Duplicate area(s) found in a Drop route plan.')
        if len(drop_users) != len(set(drop_users)):
            raise exceptions.ValidationError('Duplicate user(s) found in a Drop route plan.')
        
        vehicle_details = {v['vehicle_route_vehicle__assignment_type'] : v for v in Vehicle.objects.filter(vehicle_route_vehicle__route=data['route'],
            vehicle_route_vehicle__from_date__lte=datetime.now().date(),
            vehicle_route_vehicle__to_date__gte=datetime.now().date(),
        ).values(
            'id', 'seat_capacity', 'vehicle_route_vehicle__assignment_type', 'name'
        )}
        pickup_vehicle_details = None
        drop_vehicle_details = None
        if '3' in vehicle_details:
            pickup_vehicle_details = vehicle_details['3']
            drop_vehicle_details = vehicle_details['3']
        if '1' in vehicle_details:
            pickup_vehicle_details = vehicle_details['1']
        if '2' in vehicle_details:
            drop_vehicle_details = vehicle_details['2']
        if len(pickup_users) > 0 and not pickup_vehicle_details:
            raise exceptions.ValidationError('pickup vehicle details is mandatory when pickup students are mentioned')
        if pickup_vehicle_details and len(pickup_users) > pickup_vehicle_details['seat_capacity']:
            raise exceptions.ValidationError(
                f"Vehicle {pickup_vehicle_details['name']} max seat capacity is {pickup_vehicle_details['seat_capacity']}.")
        if len(drop_users) > 0 and not drop_vehicle_details:
            raise exceptions.ValidationError('Drop vehicle details is mandatory when drop students are mentioned')
        if drop_vehicle_details and len(drop_users) > drop_vehicle_details['seat_capacity']:
            raise exceptions.ValidationError(
                f"Vehicle {drop_vehicle_details['name']} max seat capacity is {drop_vehicle_details['seat_capacity']}.")
        SharedService.duplicate_list_two_objects(data['pickup_routes'], 'route', 'area', reason='Duplicate area(s) found.')
        SharedService.duplicate_list_two_objects(data['drop_routes'], 'route', 'area', reason='Duplicate area(s) found.')
        
        #saving pickup route plan
        route_users_obj = RouteUserPickupMapping.objects.filter(is_active=True, pickup_route_plan__is_active=True)
        route_student = []
        route_pickup_plan_data = RoutePickupPlan.objects.filter(route=data['route'], is_active=True)
        given_area_ids = [r.area for r in route_pickup_plan_data]
        for pickup_route in data['pickup_routes']:
            given_area_ids.append(pickup_route['area'])
        if len(given_area_ids) != len(set(given_area_ids)):
            raise exceptions.ValidationError('Duplicate area Found in Pickup Routes')
        for pickup_route in data['pickup_routes']:
            try:
                instance = RoutePickupPlan.objects.get(id=pickup_route.get('id'), is_active=True)
            except Exception as e:
                instance = None
            serializer = RoutePickupPlanSerializer(data=pickup_route, instance=instance, partial=True)
            serializer.is_valid(raise_exception=True)
            route_plan = serializer.save()
            for user in pickup_route['users']:
                if route_users_obj.filter(user=user, pickup_to_date__gte=date.today()).exclude(
                        pickup_route_plan=route_plan.pk):
                    raise exceptions.ValidationError('user(s) already assigned to a pickup route.')
                elif not route_users_obj.filter(user=user, pickup_route_plan=route_plan.pk, pickup_to_date__gte=date.today()):
                    route_student.append(
                        {'user': user, 'pickup_route_plan': route_plan.pk, 'pickup_to_date': academicYear.end_date})
        route_student_serializer = RouteUserPickupMappingSerializer(data=route_student, many=True)
        route_student_serializer.is_valid(raise_exception=True)
        route_student_serializer.save()

        #saving pickup route plan
        route_user_queryset = RouteUserDropMapping.objects.filter(is_active=True, drop_route_plan__is_active=True)
        route_student = []
        route_drop_plan_data = RouteDropPlan.objects.filter(route=data['route'], is_active=True)
        given_area_ids = [r.area for r in route_drop_plan_data]
        for drop_route in data['drop_routes']:
            given_area_ids.append(drop_route['area'])
        if len(given_area_ids) != len(set(given_area_ids)):
            raise exceptions.ValidationError(f'Duplicate area Found in drop routes {given_area_ids}')
        for drop_routes in data['drop_routes']:
            try:
                instance = RouteDropPlan.objects.get(id=drop_routes.get('id'), is_active=True)
            except:
                instance = None
            serializer = RouteDropSerializer(data=drop_routes, instance=instance, partial=True)
            serializer.is_valid(raise_exception=True)
            route_drop_plan = serializer.save()
            for user in drop_routes['users']:
                if route_user_queryset.filter(user=user, drop_to_date__gte=date.today()).exclude(
                        drop_route_plan=route_drop_plan.pk):
                    raise exceptions.ValidationError('user(s) already assigned to a drop route.')
                elif not route_user_queryset.filter(user=user, drop_route_plan=route_drop_plan.pk, drop_to_date__gte=date.today()):
                    route_student.append(
                        {'user': user, 'drop_route_plan': route_drop_plan.pk, 'drop_to_date': academicYear.end_date})
        route_student_serializer = RouteUserDropMappingSerializer(data=route_student, many=True)
        route_student_serializer.is_valid(raise_exception=True)
        route_student_serializer.save()
        return {'Reason': 'Data added/updated Successfully'}


def ride_status_check(route):
    if RideStatus.objects.filter(ride_detail__route=route, ride_detail__for_date=date.today(), reached=False):
        raise exceptions.ValidationError('Transport ride is started. Please try after ride end(s).')


def delete_route(self, data, **kwargs):
    pk = self.kwargs['pk']
    ride_status_check(pk)
    with transaction.atomic(using=get_current_db_name()):
        VehicleRouteMapping.objects.filter(route=pk, to_date__gte=date.today()).update(
            to_date=date.today() - timedelta(days=1))
        RoutePickupPlan.objects.filter(route=pk).update(is_active=False)
        RouteDropPlan.objects.filter(route=pk).update(is_active=False)
        RouteUserPickupMapping.objects.filter(pickup_route_plan__route=pk, pickup_to_date__gte=date.today()).update(
            pickup_to_date=date.today() - timedelta(days=1))
        RouteUserDropMapping.objects.filter(drop_route_plan__route=pk, drop_to_date__gte=date.today()).update(
            drop_to_date=date.today() - timedelta(days=1))
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
    return response


def route_details(self, data, isList):
    route_vehicle = VehicleRouteMapping.objects.filter(to_date__gte=date.today(), route=data['id'])
    is_staff = False
    route_pickup_details = {}
    route_drop_details = {}
    data['pickup_staff_details'] = {}
    data['drop_staff_details'] = {}
    data['user_belong_to_this_route'] = False
    if self.request.user.staff:
        is_staff = True
    for route in route_vehicle:
        if route.assignment_type == '3':
            route_pickup_details = route
            route_drop_details = route
        elif route.assignment_type == '1':
            route_pickup_details = route
        elif route.assignment_type == '2':
            route_drop_details = route
    if route_pickup_details:
        vehicle = Vehicle.objects.get(is_active=True, id=route_pickup_details.vehicle.id)
        vehicle = VehicleSerializer(vehicle).data
        data.update({'vehicle_details': vehicle})
        vehicle_driver = VehicleDriverMapping.objects.filter(to_date__gte=date.today(),
                                                            vehicle=route_pickup_details.vehicle).first()
        if vehicle_driver:
            staff = Staff.objects.get(id=vehicle_driver.driver.pk)
            staff = StaffGetNameSerializer(staff).data
            data.update({'pickup_staff_details': staff})
            if str(staff['id']) == str(vehicle_driver.driver.id):
                data['user_belong_to_this_route'] = True
    else:
        data.update({'staff_details': None})
    if route_drop_details:
        vehicle = Vehicle.objects.get(is_active=True, id=route_drop_details.vehicle.id)
        vehicle = VehicleSerializer(vehicle).data
        data.update({'vehicle_details': vehicle})
        vehicle_driver = VehicleDriverMapping.objects.filter(to_date__gte=date.today(),
                                                            vehicle=route_drop_details.vehicle).first()
        if vehicle_driver:
            staff = Staff.objects.get(id=vehicle_driver.driver.pk)
            staff = StaffGetNameSerializer(staff).data
            data.update({'drop_staff_details': staff})
            if str(staff['id']) == str(vehicle_driver.driver.id):
                data['user_belong_to_this_route'] = True
    route_pickup_plan = RoutePickupPlan.objects.filter(is_active=True, route=data['id']).order_by('sequence')
    users = RouteUserPickupMapping.objects.filter(pickup_to_date__gte=date.today(), pickup_route_plan__in=route_pickup_plan)
    data.update({'pickup_total_stops': len(route_pickup_plan), 'pickup_total_users': len(users)})
    route_drop_plan = RouteDropPlan.objects.filter(is_active=True, route=data['id']).order_by('sequence')
    if route_drop_plan:
        data['destination'] = route_drop_plan.values('area__name')[len(route_drop_plan)-1]['area__name']
    users = RouteUserDropMapping.objects.filter(drop_to_date__gte=date.today(), drop_route_plan__in=route_drop_plan)
    data.update({'drop_total_stops': len(route_drop_plan), 'drop_total_users': len(users)})
    if not isList:
        avoiding_for_loop_one = False
        avoiding_for_loop_two = False
        data.update({
            'pickup_routes': RoutePickupPlanSerializer(route_pickup_plan, many=True).data
        })
        data.update({
            'drop_routes': RouteDropSerializer(route_drop_plan, many=True).data
        })
        for plans in data['pickup_routes']:
            queryset = User.objects.filter(route_user_pickup_mapping_user__pickup_route_plan=plans['id'],
                                                route_user_pickup_mapping_user__pickup_from_date__lte=date.today(),
                                                route_user_pickup_mapping_user__pickup_to_date__gte=date.today()
                                            )
            user_pickup_mapping_mapping = {q['route_user_pickup_mapping_user__user']: {
                'id': q['route_user_pickup_mapping_user__id']
            } for q in queryset.values('route_user_pickup_mapping_user__user', 'route_user_pickup_mapping_user__id')}
            plans.update({'users': json.loads(json.dumps(UserReadSerializer(queryset, many=True).data, indent=4, sort_keys=True, default=str))})
            for user in plans['users']:
                user['pickup_user_mapping_id'] = None
                if user['id'] in user_pickup_mapping_mapping:
                    user['pickup_user_mapping_id'] = user_pickup_mapping_mapping[user['id']]['id']
            if not avoiding_for_loop_one:
                for user in plans['users']:
                    if self.request.user.student and str(user['id']) == str(self.request.user.student.id):
                        data['user_belong_to_this_route'] = True
                        avoiding_for_loop_one = True

        for plans in data['drop_routes']:
            queryset = User.objects.filter(route_user_drop_mapping_user__drop_route_plan=plans['id'],
                                                route_user_drop_mapping_user__drop_from_date__lte=date.today(),
                                                route_user_drop_mapping_user__drop_to_date__gte=date.today()
                                            )
            user_drop_mapping_mapping = {q['route_user_drop_mapping_user__user']: {
                'id': q['route_user_drop_mapping_user__id']
            } for q in queryset.values('route_user_drop_mapping_user__user', 'route_user_drop_mapping_user__id')}
            plans.update({'users': json.loads(json.dumps(UserReadSerializer(queryset, many=True).data, indent=4, sort_keys=True, default=str))})
            for user in plans['users']:
                user['drop_user_mapping_id'] = None
                if user['id'] in user_drop_mapping_mapping:
                    user['drop_user_mapping_id'] = user_drop_mapping_mapping[user['id']]['id']
            if not avoiding_for_loop_two:
                for user in plans['users']:
                    if self.request.user.student and  str(user['id']) == str(self.request.user.student.id):
                        data['user_belong_to_this_route'] = True
                        avoiding_for_loop_two = True

    return data


def get_route(self, isList=False):
    response = SharedService.read_data(self, isList)
    if isList:
        for data in response['data']:
            route_details(self, data, isList)
    else:
        route_details(self, response['data'], isList)
    return response

def validate_add_and_update_area_data(self, data, area_type=1):
    existing_area_data = RouteArea.objects.filter(
        area_type=area_type
    )
    institute_addresses_count = InstituteAdresses.objects.filter(is_active=True).count()
    existing_map_plan_map_data = {}
    if area_type == 1:
        for existing in existing_area_data:
            key = str(existing.name) + '' + str(existing.address_one) + '_' + str(existing.pincode)
            if existing.institute_address:
                key += '_'+str(existing.institute_address.id)
            else:
                key += '_'+str(None)
            key += '_'+str(existing.latitude) + '_' + str(existing.longitude)
            existing_map_plan_map_data[key] = existing
        for area in data:
            if institute_addresses_count > 1 and ('institute_address' not in area or not area['institute_address']):
                raise exceptions.ValidationError('institute_address is mandatory')
            if 'institute_address' not in area or not area['institute_address']:
                area['institute_address'] = None
            if 'km' not in area or not area['km']:
                raise exceptions.ValidationError('km is mandatory')
            key = str(area['name']) + '' +str(area['address_one']) + '_' + str(area['pincode']) + '_' + str(area['institute_address'])
            key += '_'+str(area['latitude']) + '_' + str(area['longitude'])
            if key in existing_map_plan_map_data:
                if 'id' not in area or not area['id'] or area['id'] != existing_map_plan_map_data[key].id:
                    raise exceptions.ValidationError('Duplicate address found')
            area['area_type'] = 1
            area['approved'] = 1
    elif area_type == 2:
        for area in data:
            if 'academic_year' not in area or not area['academic_year']:
                raise exceptions.ValidationError(
                    'academic_year is mandatory'
                )
            if institute_addresses_count > 1 and ('institute_address' not in area or not area['institute_address']):
                raise exceptions.ValidationError('institute_address is mandatory')
            if 'institute_address' not in area or not area['institute_address']:
                area['institute_address'] = None
            if 'km' not in area or not area['km']:
                raise exceptions.ValidationError('km is mandatory')
            area['area_type'] = 2
    else:
        raise exceptions.ValidationError('Invalid area type')
    return data

def add_area(self, data, area_type=1):
    area_data = data['area_datas']
    modified_data = validate_add_and_update_area_data(self, area_data, area_type)
    for temp in modified_data:
        if 'id' in temp:
            instance = RouteArea.objects.get(id=temp['id'])
            serializer = RouteAreaSerializer(instance=instance, data=temp, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            response = {'data': serializer.data, 'Reason': 'Data updated Successfully'}
        else:
            serializer = RouteAreaSerializer(data=temp)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            response = {'data': serializer.data, 'Reason': 'Data Added Successfully'}
    return response

def add_or_update_data(self, data, **kwargs):
        with transaction.atomic(using=get_current_db_name()):
            for listData in data:
                if 'id' in listData:
                    self.kwargs['pk'] = listData['id']
                    response = SharedService.update_data(self, listData, **kwargs)
                else:
                    response = SharedService.add_data(self, listData, False)
        return response


def delete_area(self):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(route_pickup_plan_routearea__isnull=False, route_pickup_plan_routearea__is_active=True) and \
        queryset.filter(route_drop_plan_routearea__isnull=False, route_drop_plan_routearea__is_active=True):
        raise exceptions.ValidationError('Data referred!')
    queryset.delete()
    return {'Reason': 'Data deleted successfully!'}


def read_area_details(self):
    response = SharedService.read_data(self, True)
    limit = self.request.GET.get('limit')
    if limit:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                                limit, self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return response


def add_price(self, data, **kwargs):
    is_only_validate = kwargs.get('is_only_validate')
    instance = RoutePricePlan.objects.filter(id=data['price_plan']).first()
    if not instance:
        raise exceptions.ValidationError('Route price plan is not exist(s).')
    ApprovalService.get_approval_status(self, instance, message='Price plan is already approved.')
    price_on_area = ConfigurationService.get_setting_value('price_on_area')
    if price_on_area == '1':
        SharedService.duplicate_list_one_object(data['rate'], 'area')
        for rate in data['rate']:
            if float(rate['rate']) < 1:
                raise exceptions.ValidationError('Price should be greater than 0.')
            rate.update({'price_plan': data['price_plan']})
    else:
        data['rate'] = sorted(data['rate'], key=lambda i: i['km'])
        price = 0
        for rate in data['rate']:
            if price >= rate['rate']:
                raise exceptions.ValidationError(f'km {rate["km"]} price should be greater than Rs.{price}')
            price = rate['rate']
            rate.update({'price_plan': data['price_plan']})
        SharedService.duplicate_list_one_object(data['rate'], 'km')
    if is_only_validate:
        return {}
    with transaction.atomic(using=get_current_db_name()):
        if price_on_area == '0':
            self.get_queryset().filter(price_plan=data['price_plan']).update(is_active=False)
        response = SharedService.add_data(self, data['rate'])
    return response


def get_price(self):
    response = SharedService.read_data(self, True)
    routePricePlan = RoutePricePlan.objects.filter(academic_year=self.request.query_params.get('academic_year'),
                                                   id=self.request.query_params.get('price_plan')).first()
    status = ApprovalService.get_approval_status(self, routePricePlan)
    is_approved = status['approval_status'] == '1'
    if self.request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data,
                         'is_approved': is_approved}}
    return {'data': {'data_list': response['data'], 'is_approved': is_approved}}


def approve_price_plan(self, data, **kwargs):
    detail = self.get_object()
    response = ApprovalService.update_approval_status(self, detail, data['approval_status'],
                                                      message='Price plan is already approved.')
    SharedService.custom_thread(approve_price_plan_notification, self, detail)
    return response


def approve_price_plan_notification(self, detail):
    send_notification('routepriceplanapprove_update',
                      body=f'Hi,<br/><br/>Transport price plan is approved for the plan {detail.name} in the '
                           f'Academic year {detail.academic_year.start_date.year}-{detail.academic_year.end_date.year}.'
                           f'<br/><br/>Thanks,<br/>{self.request.user.staff.first_name}',
                      touserIds=[self.request.user.pk],
                      pushData={'extra_params': {'heading': 'Transport price approve'}})


def validate_price_plan(self, data, isUpdate=True):
    if len(data['standard']) != len(set(data['standard'])):
        raise exceptions.ValidationError('Duplicate standards found!')
    standardSection = StandardSectionMapping.objects.filter(academic_year=data['academic_year'],
                                                            standard__in=data['standard']).values_list('standard',
                                                                                                       flat=True).distinct()
    if len(standardSection) != len(set(data['standard'])):
        raise exceptions.ValidationError('Standard is not present in the academic year!')
    queryset = self.get_queryset().filter(is_active=True, academic_year=data['academic_year'])
    if isUpdate:
        queryset = queryset.exclude(id=self.kwargs['pk'])
    if queryset.filter(standard__in=data['standard']).exists():
        raise exceptions.ValidationError('Standard(s) is already exist(s) in the academic year.')


def add_price_plan(self, data):
    validate_price_plan(self, data, False)
    serializer = self.get_serializer(data=data)
    serializer.is_valid(raise_exception=True)
    routePricePlan = serializer.save()
    ApprovalService.update_approval_status(self, routePricePlan, '0')
    return {'Reason': 'Data added Successfully!'}


def update_price_plan(self, data, **kwargs):
    ApprovalService.get_approval_status(self, self.get_object(), message='Price plan is already approved.')
    validate_price_plan(self, data)
    response = SharedService.update_data(self, data, **kwargs)
    return response

""""
    For now only support student
"""
def read_student_address(self):
    if self.request.GET.get('student_data'):
        academic_year = AcademicYear.objects.get(id=self.request.GET.get('academic_year'))
        queryset = Student.objects.filter(fee_plan_student_feature_student__fee_plan__standard_fee__academic_year=academic_year,
                                        fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename=TRANSPORT_CODENAME).distinct()
        if self.request.GET.get('area'):
            queryset = queryset.filter(user_student__route_user_user__area=self.request.GET.get('area'))
        if self.request.GET.get('unassigned_route'):
            if self.request.GET.get('pickup'):
                queryset = queryset.exclude(user_student__in=RouteUserPickupMapping.objects.filter(pickup_route_plan__is_active=True, pickup_route_plan__route__academic_year=academic_year, is_active=True).values_list('user', flat=True))
            elif self.request.GET.get('drop'):
                queryset = queryset.exclude(user_student__in=RouteUserDropMapping.objects.filter(drop_route_plan__is_active=True, drop_route_plan__route__academic_year=academic_year, is_active=True).values_list('user', flat=True))
            else:
                raise exceptions.ValidationError('When unassigned_route sent please send pickup / drop')
        user_area = RouteUserAddress.objects.filter(academic_year=academic_year, user__student__isnull=False)
        if self.request.GET.get('area'):
            user_area = user_area.filter(area=self.request.GET.get('area'))
        if self.request.GET.get('area__area_type'):
            user_area = user_area.filter(area__area_type=self.request.GET.get('area__area_type'))
        user_area = RouteUserAddressReadSerializer(user_area, many=True).data
        address = {student['student']: student for student in user_area}
        serializer = StudentListSerializer(queryset, many=True)
        for student in serializer.data:
            if student['id'] in address:
                student.update({'address_details': address[student['id']]})
            else:
                student.update({'address_details': None})
        return {'data': serializer.data}
    else:
        #For now supporting only for student
        raise exceptions.ValidationError('student_data should be mandaotry')

def add_user_address(self, data):
    user_obj = User.objects.get(id=data['user'])
    with transaction.atomic(using=get_current_db_name()):
        if user_obj.staff:
            if data['area_datas']:
                data['area_datas']['academic_year'] = data['academic_year']
                data['area_datas'] = [data['area_datas']]
                area_response = add_area(self, data, 2)
                data['area'] = area_response['data']['id']
            response = SharedService.add_data(self, data, False)
            SharedService.custom_thread(staff_address_notification, self, response['data'])
        elif user_obj.student:
            data['student'] = user_obj.student
            if data['area_datas']:
                data['area_datas']['academic_year'] = data['academic_year']
                data['area_datas'] = [data['area_datas']]
                area_response = add_area(self, data, 2)
                data['area'] = area_response['data']['id']
            response = SharedService.add_data(self, data, False)
            SharedService.custom_thread(student_address_notification, self, response['data'])
        else:
            raise exceptions.ValidationError('User is not supported')
    return response

def copy_route_user_address(self, data):
    previous_academic_year_data = RouteUserAddress.objects.filter(academic_year = data['source_academic_year'],user__student__is_active=True).values('user_id','area_id')
    current_academic_year_students = StudentStandardMapping.objects.filter(academic_year = data['target_academic_year'],student__is_active=True).values_list('student__user_student__id',flat=True)
    existing_data = RouteUserAddress.objects.filter(academic_year = data['target_academic_year']).values_list('user_id',flat=True)
    serializer_data = []
    for route in previous_academic_year_data:
        if route['user_id'] in current_academic_year_students and route['user_id'] not in existing_data:
            temp = {
                "academic_year":data['target_academic_year'],
                "area":route['area_id'],
                "user":route['user_id']
            }
            serializer_data.append(temp)
    serializer_data = RouteUserAddressSerializer(data = serializer_data,many=True)
    serializer_data.is_valid(raise_exception=True)
    serializer_data.save()
    return {'data':"Data added Scuccessfully"}

#this is not called anywhere use this whenever we want to change the adddress based on student request
def add_data_to_history(self, area_data, user, academic_year):
    RouteUserAddressHistory.objects.create(
        area_data=json.dumps(area_data.__dict__), user=user,
        academic_year=academic_year
    )
    

def update_student_address(self, data, **kwargs):
    response = {'data': {}}
    instance = self.get_object()
    user_obj = User.objects.get(id=data['user'])
    if 'area' in data and data['area'] and 'area_datas' in data and data['area_datas']:
        raise exceptions.ValidationError('area and area_datas both should not be mentioned together')
    if user_obj.staff:
        pass
    elif user_obj.student:
        data['student'] = user_obj.student.id
        academic_year = AcademicYear.objects.get(id=data['academic_year'])
        payment_detail = PaymentDetail.objects.filter(fee_collection__student=data['student'],
                                                    fee_plan__standard_fee__academic_year=academic_year,
                                                    fee_plan__standard_fee__fee_type__codename=TRANSPORT_CODENAME)
        if RouteUserPickupMapping.objects.filter(
            Q(pickup_from_date__gte=academic_year.start_date, pickup_from_date__lte=academic_year.end_date) | Q(pickup_to_date__gte=academic_year.start_date, pickup_to_date__lte=academic_year.end_date),
            user=data['user']
        ):
            raise exceptions.ValidationError('Address cant be edited already assigned to the route. Please contact admin')
        if RouteUserDropMapping.objects.filter(
            Q(drop_from_date__gte=academic_year.start_date, drop_from_date__lte=academic_year.end_date) | Q(drop_to_date__gte=academic_year.start_date, drop_to_date__lte=academic_year.end_date),
            user=data['user']
        ):
            raise exceptions.ValidationError('Address cant be edited already assigned to the route. Please contact admin')
        if payment_detail.exists():
            raise exceptions.ValidationError(
                'Cannot update the area. Since the student is already paid the fees for transpot.')
    else:
        raise exceptions.ValidationError('Invalid user')
    given_area_obj = None
    with transaction.atomic(using=get_current_db_name()):
        if 'area' in data and data['area']:
            given_area_obj = RouteArea.objects.get(id=data['area'])
            if instance.area.id != given_area_obj.id and given_area_obj.area_type == 2:
                raise exceptions.ValidationError('You can assign others address')
        # existing area type is for student and changing to area type then we will delete the student type area
        if instance.area.area_type == 2 and given_area_obj and given_area_obj.area_type == 1:
            response = SharedService.update_data(self, data)
            route_area_obj = RouteArea.objects.get(id=instance.id)
            route_area_obj.delete()
        elif instance.area.area_type == 2:
            if ('area_datas' in data)  and ('id' not in data['area_datas'] or not data['area_datas']['id']):
                raise exceptions.ValidationError('area id is mandatory to update the data')
            data['area_datas']['academic_year'] = data['academic_year']
            data['area_datas'] = [data['area_datas']]
            area_response = add_area(self, data, 2)
            data['area'] = area_response['data']['id']
            response = SharedService.update_data(self, data)
            try:
                if instance.area.id != data['area']:
                    route_area_obj = RouteArea.objects.get(id=instance.area.id)
                    route_area_obj.delete()
            except Exception as e:
                pass
        elif instance.area.area_type == 1 and ( 'area' not in data or not data['area']):
            if not data['area_datas']:
                raise exceptions.ValidationError('area_datas is mandatory')
            data['area_datas']['academic_year'] = data['academic_year']
            data['area_datas'] = [data['area_datas']]
            area_response = add_area(self, data, 2)
            data['area'] = area_response['data']['id']
            response = SharedService.update_data(self, data)
        else:
            response = SharedService.update_data(self, data)
    if user_obj.staff:
        SharedService.custom_thread(staff_address_notification, self, response['data'])
    else:
        SharedService.custom_thread(student_address_notification, self, response['data'])
    return response


def student_address_notification(self, data):
    if self.request.user.is_superuser:
        return None
    student = Student.objects.get(id=data['student'])
    user = User.objects.get(student=data['student']).pk
    body = f'Dear Parents,<br/><br/>Student {student.first_name} has been registered for the Transport with below Address<br/><br/>'
    body += f'Area: {data["area_details"]["name"]}<br/>Address : {data["area_details"]["name"]}<br/>'
    body += f'Landmark : {data["area_details"]["landmark"]}<br/>Pincode: {data["area_details"]["pincode"]}<br/>'
    body += f'Date : {SharedService.date_to_obj(data["from_date"]).strftime("%d/%m/%Y")} - {SharedService.date_to_obj(data["to_date"]).strftime("%d/%m/%Y")}'
    body += f'<br/><br/>Thanks,<br/>{self.request.user.staff.first_name}.'
    send_notification('routestudentaddress_create', body=body, touserIds=[user],
                      pushData={'extra_params': {'heading': 'Student address'}})

def staff_address_notification(self, data):
    staff = Staff.objects.get(id=data['staff'])
    user = User.objects.get(staff=data['staff'])
    body = f'{staff.first_name} has been registered for the Transport with below Address<br><br>'
    body += f'Area: {data["area_details"]["name"]}<br>Address : {data["area_details"]["name"]}<br>'
    body += f'Landmark : {data["area_details"]["landmark"]}<br>Pincode: {data["area_details"]["pincode"]}<br>'
    body += f'Date : {SharedService.date_to_obj(data["from_date"]).strftime("%d/%m/%Y")} - {SharedService.date_to_obj(data["to_date"]).strftime("%d/%m/%Y")}'
    body += f'<br><br>Thanks,<br>{self.request.user.staff.first_name}.'
    send_notification('RouteUserAddress_create', body=body, touserIds=[user],
                      pushData={'extra_params': {'heading': 'Staff address'}})


def read_route_student(self):
    route = self.kwargs['pk']
    queryset = self.get_queryset().filter(to_date__gte=date.today(), route_plan__route=route,
                                          route_plan__is_active=True)
    serializer = self.get_serializer(queryset, many=True)
    return {'data': serializer.data}