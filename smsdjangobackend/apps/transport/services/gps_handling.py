
"""
    Fetching the current gps details of the vehicle
"""

from rest_framework import exceptions
from datetime import datetime, timedelta
from django.forms.models import model_to_dict

from apps.shared.services import SharedService
from apps.shared.utils import http_request
from apps.transport.models.vehicle import GpsMachine
from apps.transport.models.location import VehicleLocation


def handle_loconav(vehicle_data):
    # Configurations
    hit_back_time = 90 #hit the loconav api 60 seconds once
    url = 'https://testtracker.zingmobility.com/v1/gps/locoNav/getBusCordinates'
    authentication_token = 'yn2tf8iPjozhfeb9zvPR'
    authetication_user_id = '2254014'

    current_date_time = datetime.now()
    response_data = {}
    last_api_hit_date_time = vehicle_data['gps_details']['last_api_hit_date_time']
    if last_api_hit_date_time:
        last_api_hit_date_time = datetime.strptime(last_api_hit_date_time, '%Y-%m-%dT%H:%M:%S.%f') + timedelta(seconds=hit_back_time)
        last_api_hit_date_time += timedelta(seconds=hit_back_time)
    #hit api when last hit not happend for 60seconds
    if not vehicle_data['gps_details']['last_api_requested_data'] or not last_api_hit_date_time or last_api_hit_date_time < current_date_time:
        params = {
            'number': vehicle_data['vehicle_num'].replace(' ', '')
        }
        kwargs = {
            'headers': {
                'Content-Type': "application/json",
                'Cache-Control': "no-cache",
                # 'Admin-Authentication': authentication_token,
                'Authorization': 'Basic bG9jb05hdjpOOGZEQC12NnBxTS15M2pRRXhx',
                'User-Id': authetication_user_id
            }
        }
        remote_response = http_request('POST', url, None, params, **kwargs)
        if remote_response.status_code != 200:
            raise exceptions.ValidationError(remote_response.json())
        temp_response_data = {}
        remote_response = remote_response.json()
        if remote_response['data']:
            temp_response_data = remote_response['data'][0]
        GpsMachine.objects.filter(id=vehicle_data['gps_details']['id']).update(
            last_api_requested_data=temp_response_data,
            last_api_hit_date_time=current_date_time
        )
    else:
        response_data = vehicle_data['gps_details']['last_api_requested_data']
    return response_data


def handle_gps_data(self, vehicle_data):
    response = {'data': {}}
    if 'vendor_code' in vehicle_data['gps_details'] and vehicle_data['gps_details']['vendor_code'] == 'loconav':
        response['data'] = handle_loconav(vehicle_data)
    return response

def handle_gurukulhigh_gps(vehicle_data):
    # Configurations
    hit_back_time = 90 #hit the loconav api 60 seconds once
    url = 'https://v1.dhundhoo.com/vendor/journeys/refresh'

    current_date_time = datetime.now()
    response_data = {}
    params = {
            'apiKey':'30cb1d1e-b04a-4c0d-aa2c-a594de3e9481'
    }
    kwargs = {
            'headers': {
                'Content-Type': "application/json",
                'Cache-Control': "no-cache",
            },
            'json':vehicle_data
    }
    remote_response = http_request('POST', url, None,params, **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(remote_response.json())
    response = remote_response.json()
    return response

def handle_aadithya_gps(vehicle_data):
    token_url = "https://partnerapi.vecv.net/service-gateway/genrateToken"
    kwargs = {
            'headers': {
                'Content-Type': "application/json",
                'Cache-Control': "no-cache",
                'client-id':"c0f50da0-6cb6-Aadhithya-a782-5731b78717c4"
            }
    }
    token_response = http_request('GET', token_url, None,None, **kwargs)
    if token_response.status_code not in [200,429]:
        raise exceptions.ValidationError(token_response.json())
    token_response = token_response.json()
    url ="https://partnerapi.vecv.net/service-gateway/vehicle/getlivedata"
    kwargs = {
            'headers': {
                'Content-Type': "application/json",
                'Cache-Control': "no-cache",
                'Authorization': 'Bearer '+str(token_response['token']),
                'X-IBM-Client-Id':'c0f50da0-6cb6-Aadhithya-a782-5731b78717c4'
            },
            'json':{
                'clientId':'c0f50da0-6cb6-Aadhithya-a782-5731b78717c4'
            }
    }
    remote_response = http_request('POST', url, None,None, **kwargs)
    if remote_response.status_code not in [200,429]:
        raise exceptions.ValidationError(remote_response.json())
    response = remote_response.json()
    return response

def handle_shv_gps(vehicle):
    url ="https://pullapi-s2.track360.co.in/api/v1/auth/pull_api"
    kwargs = {
            'headers': {
                'Content-Type': "application/json",
                'Cache-Control': "no-cache",
            }
    }
    params={
        'username':'shvschool',
        'password':'Shvschool@12345'
    }
    remote_response = http_request('GET', url, None,params, **kwargs)
    if remote_response.status_code not in [200,429]:
        raise exceptions.ValidationError(remote_response.json())
    response = remote_response.json()
    return_data = {'errorMessage':'None','vehicleData':[]}
    if 'data' in response:
        for vehicle_data in response['data']:
            vehicle_data['name']=SharedService.format_vehicle_number(vehicle_data['name'])
            if vehicle_data['name'] == vehicle['vehicle__vehicle_num']:
                vehicle_data['vehicleNo'] = vehicle_data['name']
                return_data['vehicleData'].append(vehicle_data)
    if response['status'] != 'success':
        return_data['errorMessage'] = response['message']
    return return_data

def handle_wcis_gps_token(vehicle):
    token_url = "https://cvp.api.tatamotors/auth/realms/external/protocol/openid-connect/token"
    kwargs = {
            'headers': {
                'Content-Type': "application/x-www-form-urlencoded",
                'Cache-Control': "no-cache"
            },
    }
    data={
        'grant_type':"client_credentials",
        'client_id':"ab95fd6b-ca02-3b27-821e-1a3681e6f8f1",
        'client_secret':"8a052ba5-d98f-4085-bc5e-e561f9cc3034",
    }
    token_response = http_request('POST', token_url, data,None, **kwargs)
    if token_response.status_code not in [200,429]:
        raise exceptions.ValidationError(token_response.text)
    token_response = token_response.json()
    try:
        instance = VehicleLocation.objects.get(vehicle_id = vehicle['vehicle'])
        instance.token = token_response["access_token"]
        instance.save()
    except:
        instance = VehicleLocation.objects.create(token = token_response["access_token"],vehicle_id = vehicle['vehicle'])
        instance.save()

def handle_wcis_gps(vehicle):
    url ="https://cvp.api.tatamotors/api/vehicle-snapshots/"+str(vehicle['vehicle__vehicle_num']).replace(' ','')
    if 'token' in vehicle and vehicle['token']:
        kwargs = {
                'headers': {
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Cache-Control': "no-cache",
                    'Authorization': 'Bearer '+str(vehicle['token']),
                }
        }
    else:
        handle_wcis_gps_token(vehicle)
        vehicle_location = VehicleLocation.objects.get(vehicle__vehicle_num = vehicle['vehicle__vehicle_num'])
        kwargs = {
                'headers': {
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Cache-Control': "no-cache",
                    'Authorization': 'Bearer '+str(vehicle_location.token),
                }
        }
    remote_response = http_request('GET', url, None,None, **kwargs)
    if remote_response.status_code in [400,401,403] :
        handle_wcis_gps_token(vehicle)
        vehicle_location = VehicleLocation.objects.get(vehicle__vehicle_num = vehicle['vehicle__vehicle_num'])
        kwargs = {
                'headers': {
                    'Content-Type': "application/x-www-form-urlencoded",
                    'Cache-Control': "no-cache",
                    'Authorization': 'Bearer '+str(vehicle_location.token),
                }
        }
        remote_response = http_request('GET', url, None,None, **kwargs)
    if remote_response.status_code not in [200,429]:
        raise exceptions.ValidationError(remote_response.text)
    response = remote_response.json()
    if 'code' in response and response['code'] == 1203:
        response['latitude']=vehicle['latitude']
        response['longitude']=vehicle['longitude']
        response['vehicleNo'] = vehicle['vehicle__vehicle_num']
    else:
        response['latitude']=response['gpsLatitude']
        response['longitude']=response['gpsLongitude']
        response['vehicleNo'] = SharedService.format_vehicle_number(response['registrationNumber'])
    return_data = {'errorMessage':'None','vehicleData':[]}
    return_data['vehicleData'].append(response)
    return return_data

def handle_aips_gps(vehicle):
    url = "https://tbtrack.in/gps/public/api/v1/company/"
    kwargs = {
            'headers': {
                'Content-Type': "application/x-www-form-urlencoded",
                'Cache-Control': "no-cache",
                'username':'asian21',
            }
    }
    remote_response = http_request('GET', url, None,None, **kwargs)
    if remote_response.status_code not in [200,429]:
        raise exceptions.ValidationError(remote_response.json())
    response = remote_response.json()
    return_data = {'errorMessage':'None','vehicleData':[]}
    if 'data' in response:
        for vehicle_data in response['data']:
            # vehicle_data['name']=SharedService.format_vehicle_number(vehicle_data['name'])
            if vehicle_data['vehicleNo'] == vehicle['vehicle__vehicle_num']:
                return_data['latitude']=vehicle_data['latitude']
                return_data['longitude']=vehicle_data['longitude']
                return_data['vehicleNo'] = vehicle_data['vehicleNo']
            return_data['vehicleData'].append(vehicle_data)
    if response['code'] != 0:
        return_data['errorMessage'] = response['status']
    return return_data
