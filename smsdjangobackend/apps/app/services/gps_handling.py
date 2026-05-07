
"""
    Fetching the current gps details of the vehicle
"""

from rest_framework import exceptions
from datetime import datetime, timedelta

from apps.shared.services import SharedService
from apps.shared.utils import http_request
from apps.transport.models.vehicle import GpsMachine


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
    
