import json
import os
from math import ceil
import tempfile
import requests
from pydub import AudioSegment

from rest_framework.exceptions import ValidationError
from apps.shared.models import Document
from apps.shared.utils import http_request
from rest_framework import exceptions
from apps.institutes.models.institute import Institute

from apps.institutes.models.resource import Resource, ResourceFailureLog
from apps.shared.services import SharedService
from django.conf import settings

NOTIFICATION_BACKEND_URL = getattr(settings, 'NOTIFICATION_BACKEND_URL', None)

RESOURCE = {'S3BUCKET': 's3bucket', 'SMS': 'sms', 'EMAIL': 'email', 'PUSH':'push', 'WEBPUSH': 'webpush','WHATSAPP':'whatsapp', 'IVR': 'ivr'}

def add_resource(self, data):
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response

def calculate_ivr_credits(document_list, total_users=1, seconds_per_credit=28):
    """
    Calculates IVR credits based on total duration of attached audio files.
    """
    total_seconds = 0
    for doc in document_list or []:
        if doc.get("document_data"):
            path_or_url = doc["document_data"]
        elif doc.get("url"):
            path_or_url = doc["url"]
        elif doc.get("document"):
            path_or_url = doc["document"]
            document_obj = Document.objects.filter(id=doc["document"]).first()
            if document_obj:
                path_or_url = document_obj.file.url if hasattr(document_obj.file, "url") else document_obj.file
        if path_or_url:
            try:
                _, ext = os.path.splitext(path_or_url)
                if not ext:
                    ext = ".mp3"
                response = requests.get(path_or_url, stream=True, timeout=10)
                response.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=True, suffix=ext) as tmp:
                    for chunk in response.iter_content(chunk_size=8192):
                        tmp.write(chunk)
                    tmp.flush()
                    sound = AudioSegment.from_file(tmp.name)
                    total_seconds += int(sound.duration_seconds)
            except Exception as e:
                raise e
        else:
            raise ValidationError('Invalid data')

    if total_seconds == 0:
        raise ValidationError("invalid audio")
    credits_per_call = ceil(total_seconds / seconds_per_credit)
    total_credits_needed = total_users * credits_per_call
    return total_credits_needed, credits_per_call


def validate_and_update_resource(medium, total_users, data=None, document_list=None, update=False):
    from apps.notification.services.notification_service import contains_non_english

    """
    Centralized resource validation and optional update.

    :param medium: str ('email', 'sms', 'push', 'whatsapp', 'ivr', etc.)
    :param total_users: int number of recipients
    :param data: dict (for sms message or ivr info)
    :param document_list: list of docs for ivr
    :param update: bool, whether to update usage after validation
    """
    medium_map = {
        'sms': 'SMS',
        'email': 'EMAIL',
        'push': 'PUSH',
        'webpush': 'WEBPUSH',
        'whatsapp': 'WHATSAPP',
        'ivr': 'IVR'
    }

    key = medium_map.get(medium.lower())
    if not key:
        raise ValidationError(f"Unsupported notification medium: {medium}")

    message_details = {}

    if key == 'SMS':
        message_body = ''
        if data and 'message_data' in data:
            message_body = data['message_data']
        elif data and 'notification_entity' in data:
            message_body = data['notification_entity']['channel_data'].get('body', '')
        message_details = {
            'length': len(message_body),
            'is_unicode': 1 if contains_non_english(message_body) else 0
        }
        available_resource_check(key, total_users, isupdateResource=update, message_details=message_details)

    elif key == 'IVR':
        total_credits_needed, credits_per_call = calculate_ivr_credits(document_list, total_users)
        message_details = {'ivr_credits': credits_per_call}
        available_resource_check(key, total_credits_needed, isupdateResource=update, message_details=message_details)

    else:
        available_resource_check(key, total_users, isupdateResource=update)

    return True

def available_resource_check(key, data, isupdateResource=False,message_details={}):
    from apps.notification.services.notification_service import get_notification_post_format
    from apps.classes.services.handled_machine_data import EMAIL_HOST_USER

    resource = Resource.objects.filter(is_active=True, name=RESOURCE[key]).first()
    if not resource:
        raise exceptions.ValidationError(f'{RESOURCE[key]} resource settings is not configured.')
    sms_points = 1
    total_usage = resource.usage
    if key == 'IVR':
        # 'data' could be the number of notifications (each has ivr_credits)
        total_usage += data
    elif key == 'SMS':
        # existing SMS logic
        if not message_details.get('is_unicode'):
            if 'length' in message_details:
                if message_details['length'] > 918:
                    sms_points = 7
                elif message_details['length'] > 765:
                    sms_points = 6
                elif message_details['length'] > 612:
                    sms_points = 5
                elif message_details['length'] > 459:
                    sms_points = 4
                elif message_details['length'] > 306:
                    sms_points = 3
                elif message_details['length'] > 106:
                    sms_points = 2
        else:
            if 'length' in message_details:
                if message_details['length'] > 469:
                    sms_points = 8
                elif message_details['length'] > 402:
                    sms_points = 7
                elif message_details['length'] > 335:
                    sms_points = 6
                elif message_details['length'] > 268:
                    sms_points = 5
                elif message_details['length'] > 201:
                    sms_points = 4
                elif message_details['length'] > 134:
                    sms_points = 3
                elif message_details['length'] > 70:
                    sms_points = 2
        total_usage += data * sms_points
    else:
        total_usage += data
    # total_usage = resource.usage + (data*sms_points)
    if isupdateResource and (resource.max_limit - total_usage) < 2000:
        institute = Institute.objects.filter().first()
        message = f'{institute.name} - Resource balance is less than 2000 for - {key}'
        kwargs = SharedService.get_notification_header()
        subject = f'Resource Low Balance {key}'
        sending_format = get_notification_post_format(subject, [EMAIL_HOST_USER], message)
        url = NOTIFICATION_BACKEND_URL + 'notification/sendnotification/'
        http_request('POST', url, json.dumps([sending_format]), **kwargs)
    if total_usage > resource.max_limit:
        raise exceptions.ValidationError(f'{RESOURCE[key]} resource is reached the max limit.')
    if isupdateResource:
        update_resource_usage(resource, total_usage)
    return resource, total_usage


def update_resource_usage(resource, total_usage):
    resource.usage = total_usage
    resource.save()
