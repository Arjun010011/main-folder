from django.db import transaction
from rest_framework import exceptions

from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name


def add_update_delete_banner(self, data):
    data = sorted(data, key=lambda d: int(d['sequence']))
    for index, banner in enumerate(data, start=1):
        if index != int(banner['sequence']):
            raise exceptions.ValidationError('Sequence is not in order.')
    with transaction.atomic(using=get_current_db_name()):
        self.get_queryset().update(sequence=None)
        return SharedService.add_or_update_data(self, data)
