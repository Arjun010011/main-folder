import json
from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from rest_framework import exceptions
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.utils import http_request
from apps.institutes.models.institute import Institute

from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService
from apps.staffs.models import Staff
from apps.staffs.serializers import StaffGetNameSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models import Vehicle, VehicleDriverMapping
from apps.transport.models.vehicle import VehicleRouteMapping
from apps.transport.serializers import VehicleSerializer
from apps.transport.services.gps_handling import handle_gps_data
from apps.transport.services.shared import soft_delete_data
from apps.users.models import User
from django.conf import settings

NOTIFICATION_BACKEND_URL = getattr(settings, 'NOTIFICATION_BACKEND_URL', None)

def delete_vehicle(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(vehicle_route_vehicle__to_date__gte=date.today()):
        raise exceptions.ValidationError('Cannot delete the vehicle. The vehicle is assigned to the route.')
    if self.queryset.filter(vehicle_driver_vehicle__to_date__gte=date.today()):
        raise exceptions.ValidationError('Cannot delete the vehicle. The vehicle is assigned to the driver.')
    with transaction.atomic(using=get_current_db_name()):
        data = self.queryset.first()
        response = SharedService.soft_delete_data(self)
        kwargs = SharedService.get_notification_header()
        url = NOTIFICATION_BACKEND_URL + 'notification/locations/dummy/'
        hash_key = data.vehicle_num.replace(' ', '')
        firebase_data = {'hash_key': hash_key,
                         'company_id':Institute.get_institute(self).company_id
        }
        remote_response = http_request('DELETE', url, json.dumps(firebase_data), **kwargs)
        if remote_response.status_code != 200:
            raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')

    return response


def read_vehicle_details(self):
    queryset = self.filter_queryset(self.get_queryset())
    if self.request.GET.get('unassigned_to_driver'):
        queryset = queryset.exclude(vehicle_driver_vehicle__to_date__gte=date.today())
    if self.request.GET.get('assigned_to_driver'):
        queryset = queryset.filter(vehicle_driver_vehicle__to_date__gte=date.today())
    serializer = self.get_serializer(queryset, many=True)
    serializer_data = serializer.data
    for details in serializer_data:
        if Institute.get_institute(self).code == 'gurukulhigh':
            details['show_sync'] = True
        details['show_sync'] = False
    return {'data': serializer_data}


def add_driver_vehicle(self, data):
    if self.get_queryset().filter(to_date__gte=date.today()).filter(
            Q(vehicle=data['vehicle']) | Q(driver=data['driver'])):
        raise exceptions.ValidationError('Duplicate data found!')
    response = SharedService.add_data(self, data, False)
    SharedService.custom_thread(driver_vehicle_notification, self, response['data'], 'vehicledriver_create')
    return response


def delete_driver_vehicle(self):
    instance = self.get_object()
    data = {id: instance.pk, 'from_date': instance.from_date, 'to_date': instance.to_date,
            'vehicle': instance.vehicle.pk, 'driver': instance.driver.pk}
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    response = soft_delete_data(self)
    SharedService.custom_thread(driver_vehicle_notification, self, data, 'vehicledriver_destroy')
    return response


def driver_vehicle_notification(self, data, action):
    vehicle = Vehicle.objects.get(id=data['vehicle'])
    driver = Staff.objects.get(id=data['driver'])
    user = User.objects.get(staff=data['driver']).pk
    if action == 'vehicledriver_create':
        assign = 'assigned to'
        dates = f'Start Date: {SharedService.date_to_obj(data["from_date"]).strftime("%d/%m/%Y")}<br/>'
    else:
        assign = 'unassigned from'
        if data['from_date'] == date.today():
            dates = f'End Date: {date.today().strftime("%d/%m/%Y")}<br/>'
        else:
            dates = f'End Date: {(date.today() - timedelta(days=1)).strftime("%d/%m/%Y")}<br/>'
    body = f'Hi {driver.first_name},<br/><br/>You have been {assign} the Vehicle. Please find below Vehicle details,<br/><br/>'
    body += f'Vehicle Number : {vehicle.vehicle_num}<br/>Seat Capacity: {vehicle.seat_capacity}<br/>' + dates
    body += f'Vehicle Name : {vehicle.name}<br/>Vehicle Code: {vehicle.vehicle_code}<br/>Department: {vehicle.department.name}<br/>'
    body += f'Manufacturer : {vehicle.manufacturer}<br/>Model: {vehicle.model}<br/><br/>Thanks,<br/>{self.request.user.staff.first_name}.'
    send_notification(action, body=body, touserIds=[user], pushData={'extra_params': {'heading': 'Driver Vehicle'}})


def update_driver_vehicle(self, data, **kwargs):
    with transaction.atomic(using=get_current_db_name()):
        instance = self.get_object()
        dataUpdate = {'vehicle': instance.vehicle.pk, 'driver': instance.driver.pk,
                      'to_date': date.today() - timedelta(days=1)}
        SharedService.update_data(self, dataUpdate, **kwargs)
        if self.get_queryset().filter(to_date__gte=date.today()).filter(
                Q(vehicle=data['vehicle']) | Q(driver=data['driver'])):
            raise exceptions.ValidationError('Duplicate data found!')
        return SharedService.add_data(self, data, False)


def read_vehicle_driver_details(self):
    academic_year = self.request.GET.get('academic_year')
    if not academic_year:
        raise exceptions.ValidationError('Academic year is mandatory')
    is_current_academic_year = AcademicYear.is_current_academic_year(academic_year)
    end_date = date.today()
    if not is_current_academic_year:
        temp_date = AcademicYear.objects.get(id=academic_year).start_date
        if temp_date > end_date:
            end_date = temp_date
    queryset = Vehicle.objects.filter(is_active=self.request.GET.get('is_active'))
    route_mapping = {v['vehicle'] : v for v in VehicleRouteMapping.objects.filter(
        to_date__gte=end_date
    ).values('vehicle', 'assignment_type')}
    serializer = VehicleSerializer(queryset, many=True)
    vehicleDriverQueryset = VehicleDriverMapping.objects.filter(to_date__gte=date.today())
    vehicleDriver = dict(vehicleDriverQueryset.values_list('vehicle', 'driver'))
    vehicleDriverId = dict(vehicleDriverQueryset.values_list('vehicle', 'id'))
    queryset = Staff.objects.filter(is_active=True, id__in=list(vehicleDriver.values()))
    driver = StaffGetNameSerializer(queryset, many=True).data
    driver = {d['id']: d for d in driver}
    data_list = {
        'pickup_list': [],
        'drop_list': []
    }
    for data in serializer.data:
        try:
            data.update({'driver_details': driver[vehicleDriver[data['id']]],
                         'vehicle_driver_id': vehicleDriverId[data['id']]})
        except:
            data.update({'driver_details': None, 'vehicle_driver_id': None})
        if data['id'] not in route_mapping:
            data_list['pickup_list'].append(data)
            data_list['drop_list'].append(data)
        else:
            if data['id'] in route_mapping and str(route_mapping[data['id']]['assignment_type']) == '2':
                data_list['pickup_list'].append(data)
            if data['id'] in route_mapping and str(route_mapping[data['id']]['assignment_type']) == '1':
                data_list['drop_list'].append(data)
    return {'data': data_list}


def add_route_vehicle(self, data):
    if self.get_queryset().filter(to_date__gte=date.today(), academic_year=data['academic_year']).filter(
            Q(vehicle=data['vehicle']) | Q(route=data['route'])):
        raise exceptions.ValidationError('Duplicate data found!')
    return SharedService.add_data(self, data, False)


def update_route_vehicle(self, data, **kwargs):
    with transaction.atomic(using=get_current_db_name()):
        instance = self.get_object()
        dataUpdate = {'academic_year': instance.academic_year.pk, 'vehicle': instance.vehicle.pk,
                      'route': instance.route.pk, 'to_date': date.today() - timedelta(days=1)}
        SharedService.update_data(self, dataUpdate, **kwargs)
        if self.get_queryset().filter(to_date__gte=date.today(), academic_year=data['academic_year']).filter(
                Q(vehicle=data['vehicle']) | Q(route=data['route'])):
            raise exceptions.ValidationError('Duplicate data found!')
        return SharedService.add_data(self, data, False)


def delete_department(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(dept_vehicle__is_active=True):
        raise exceptions.ValidationError('Cannot delete the department. Vehicle(s) are mapped under the dept.')
    response = SharedService.soft_delete_data(self)
    return response

def add_or_update_vehicle(self, data):
    with transaction.atomic(using=get_current_db_name()):
        if 'pk' in self.kwargs:
            data['id'] = self.kwargs['pk']
        response = SharedService.add_or_update_data(self, [data])
        kwargs = SharedService.get_notification_header()
        url = NOTIFICATION_BACKEND_URL + 'notification/locations/'
        hash_key = data['vehicle_num'].replace(' ', '')
        institute_data = Institute.get_institute(self)
        latitude_map = ''
        longitude_map = ''
        if institute_data.map_address:
            latitude_map = str(institute_data.map_address.latitude_map)
            longitude_map = str(institute_data.map_address.longitude_map)
        firebase_data = {'hash_key': hash_key,
                         'location': {'latitude': latitude_map, 'longitude': longitude_map},
                         'company_id':Institute.get_institute(self).company_id
        }
        remote_response = http_request('POST', url, json.dumps(firebase_data), **kwargs)
        if remote_response.status_code != 200:
            raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
        return response

def validate_gps_add_data(self, data):
    from apps.transport.services.default_variables import VENDOR_CODE_LIST
    for row in data:
        SharedService.check_mandatory_field_in_list([
            'object_name', 'imei_no', 'vendor_code'
        ], row)
        if row['vendor_code'] not in VENDOR_CODE_LIST:
            raise exceptions.ValidationError(f'Invalid vendor_code - available_choices are {",".join(VENDOR_CODE_LIST)}')

def add_or_update_gps_data(self, request):
    validate_gps_add_data(self, request.data)
    response = SharedService.add_or_update_data(self, request.data)
    return response

def get_location_for_vehicle(self, request):
    vehicle_data = SharedService.read_data(self)['data']
    if not vehicle_data['gps_details']:
        raise exceptions.ValidationError('gps_details are not provided')
    response = handle_gps_data(self, vehicle_data)
    return  response

def get_routedetail_gps(self):
    vehicle_data = SharedService.read_data(self)['data']
    if not vehicle_data['gps_details']:
        raise exceptions.ValidationError('gps_details are not provided')
    response = handle_gps_data(self, vehicle_data)
    return  response
    
