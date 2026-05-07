from datetime import datetime
from functools import partial
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions
from django.contrib.contenttypes.models import ContentType
from apps.shared.models.custom_report import Report

from apps.general.models.long_processing import LongProcessingApiResult
from apps.general.serializers import LongProcessingApiResultSerializer
from apps.shared.services import SharedService
from apps.users.services.permissions import get_basename_from_url
from apps.shared.models.custom_report import LongProcessingAPIResultMapping

def update_longprocessingapimapping(self, content_object, longprocessingapi):
    user = self.request.user if self.request.user.pk else None
    content_type = ContentType.objects.get_for_model(content_object)
    data = {'content_type': content_type, 'object_id': content_object.pk, 'long_processing_api':longprocessingapi}
    longprocessingapimapping = LongProcessingAPIResultMapping.objects.create(**data)
    longprocessingapimapping.user = user
    longprocessingapimapping.save()

"""
    Call this function after the process ended
    Calling Long Process long_running_process=1 and transaction_id=123
"""
def store_long_running_process(self, transaction_id,data): #report id user for custom reports only
    data_to_save={
        'result_data': data,
        'last_updated_date_time': datetime.today().strftime('%Y-%m-%d %H:%M:%S'),
        'is_process_running': False,
    }
    obj = LongProcessingApiResult.objects.get(transaction_id=transaction_id)
    ser = LongProcessingApiResultSerializer(instance=obj, data=data_to_save, partial=True)
    ser.is_valid(raise_exception=True)
    ser.save()

def start_long_running_process(self,report_id=None):
    if not self.request.GET.get('transaction_id'):
        raise exceptions.ValidationError('transaction_id is not mandatory')
    transaction_id = self.request.GET.get('transaction_id')
    api_name = get_basename_from_url(self, self.request)
    current_date_time = datetime.today().strftime('%Y-%m-%d %H:%M:%S')
    parameters = self.request.GET.dict()
    data_to_save = {
        'transaction_id': transaction_id,
        'execution_started_date_time': current_date_time,
        'is_process_running': True,
        'api_name': api_name,
        'params': parameters,
        'result_data': {},
        'user':self.request.user.id
    }
    ser = LongProcessingApiResultSerializer(data=data_to_save)
    ser.is_valid(raise_exception=True)
    long_process_data=ser.save()
    if api_name == 'generatecustomreport':
        report = Report.objects.get(id=report_id)
        update_longprocessingapimapping(self, report, long_process_data)
    return {'Result': True}
