import json
import base64
from rest_framework.exceptions import ValidationError
from django.conf import settings
from apps.institutes.models.institute import Institute

from apps.shared.services import SharedService
from apps.shared.utils import http_request


SERVER_URL = getattr(settings, 'SERVER_URL', None)
    
def read_help_center_data(self, request):
    kwargs = SharedService.get_edubricz_header(self)
    params = {}
    for i in request.GET.keys():
        params[i] = request.GET.get(i)
    params['username'] = self.request.user.username
    params['company'] = Institute.get_institute(self).company_id
    params['requested_user_id'] = self.request.user.id
    url = SERVER_URL + 'helpcenter/ticket/'
    remote_response = http_request('GET', url, None, params, **kwargs)
    if remote_response.status_code != 200:
        raise ValidationError(remote_response.json())
    return remote_response.json()

def add_help_center_data(self, request):
    kwargs = SharedService.get_edubricz_header(self)
    url = SERVER_URL + 'helpcenter/ticket/'
    post_data = {}
    if 'data' in request.data and request.data['data']:
        post_data = json.loads(request.data['data'])
    post_data['username'] = self.request.user.username
    post_data['company'] = Institute.get_institute(self).company_id
    if 'image' in request.data and request.data['image']:
        image_obj = request.data['image']
        post_data['content_type'] = request.data['image'].content_type
        post_data['files'] = base64.b64encode(image_obj.read()).decode('utf-8')
    remote_response = http_request('POST', url, json.dumps(post_data), **kwargs)
    if remote_response.status_code != 200:
        raise ValidationError(remote_response.json())
    return {'Reason': 'Data added succesfully'}

def delete_help_center(self, request):
    kwargs = SharedService.get_edubricz_header(self)
    url = SERVER_URL + 'helpcenter/ticket/' + self.kwargs['pk']
    remote_response = http_request('DELETE', url, **kwargs)
    if remote_response.status_code != 200:
        raise ValidationError(remote_response.json())
    return {'Reason': 'Data deleted succesfully'}

def update_helpcenter_read_time(self, request):
    kwargs = SharedService.get_edubricz_header(self)
    post_data = json.loads(request.data['data'])
    url = SERVER_URL + 'helpcenter/updatemessageread/' + self.kwargs['pk'] +'/'
    remote_response = http_request('PUT', url, json.dumps(post_data), **kwargs)
    if remote_response.status_code != 200:
        raise ValidationError(remote_response.json())
    return {'Reason': 'Data updated succesfully'}