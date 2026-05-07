from django.db import transaction
from rest_framework import exceptions

from apps.interview.models import JobRole
from apps.interview.serializers import JobRoleSerializer
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name


def add_job_role(self, data):
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, True)
    return response


def update_job_role(self, data, **kwargs):
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_job_role(self, data):
    if not data:
        raise exceptions.ValidationError('No data is selected to delete.')
    with transaction.atomic(using=get_current_db_name()):
        JobRole.objects.filter(id__in=data).update(is_active=False)
    return {'Reason': 'Data deleted Successfully!'}
