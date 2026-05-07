from rest_framework import exceptions
from django.db import transaction
from apps.finance.models.concession import ConcessionType, FeePlanConcessionMapping, FeePlanConcessionMappingMaster
from apps.finance.models.fee import FeePlan
from apps.finance.serializers import FeePlanConcessionMappingMasterSerializer, FeePlanConcessionMappingSerializer
from apps.tenants.services.middlewares import get_current_db_name

from apps.shared.services import SharedService


def add_concession_types(self, data):
    SharedService.duplicate_list_one_object(data['concession_type'], 'name')
    response = SharedService.add_data(self, data['concession_type'])
    return response


def update_concession_types(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(is_active=True, concession_type__isnull=False):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_concession_types(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(is_active=True, concession_type__isnull=False):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    if self.queryset.filter(is_active=True, fee_plan_concession_mapping_concession_type__isnull=False):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    SharedService.soft_delete_data(self)
    return {'Reason': 'Data deleted successfully!'}


def validate_fee_plan_concession(self, data):
    #validating only for one time payment concession
    concession_obj = ConcessionType.objects.get(id=data['concession_type'])
    fee_term_list_data = []
    updatable_ids = []
    for fee_term_list in data['fee_term_list']:
        if not fee_term_list['concession_amount']:
            continue #temproary fix not to save the zero amount until front end removes we  keep this
            raise exceptions.ValidationError('concession amount should be greater than 0')
        fee_term_list_data.append(int(fee_term_list['fee_plan']))
        if 'id' in fee_term_list:
            updatable_ids.append(fee_term_list['id'])
    if concession_obj.code == 'one_time_payment':
        fee_plan_obj = {fee['id']: fee for fee in FeePlan.objects.filter(id__in=fee_term_list_data).values(
            'standard_fee__standard', 'id', 'standard_fee__academic_year'
        )}
        check_is_same_standard = {}
        for fee_term in fee_term_list_data:
            if fee_term not in fee_plan_obj:
                raise exceptions.ValidationError(f'Invalid fee Term {fee_term}')
            key = str(fee_plan_obj[fee_term]['standard_fee__standard']) + '_' + str(fee_plan_obj[fee_term]['standard_fee__academic_year'])
            check_is_same_standard[key] = '' #check different standard fee plan is adding or not
        if len(check_is_same_standard) != 1:
            raise exceptions.ValidationError('Trying to add differen standards fee plan')
    else:
        raise exceptions.ValidationError('Unhandled concession type')
    existing_fee_plan_list = FeePlanConcessionMapping.objects.filter(
        fee_plan__in=fee_term_list_data
    ).exclude(id__in=updatable_ids).values()
    if existing_fee_plan_list:
        raise exceptions.ValidationError('Duplicate fee plan list')

def add_fee_plan_concession(self, data):
    validate_fee_plan_concession(self, data)
    master_data = {
        'concession_type': data['concession_type'],
    }
    with transaction.atomic(using=get_current_db_name()):
        if 'id' in data and data['id']:
            serializer_master = FeePlanConcessionMappingMasterSerializer(instance=FeePlanConcessionMappingMaster.objects.get(id=data['id']) ,
                data=master_data)
            serializer_master.is_valid(raise_exception=True)
            master_data = serializer_master.save()
        else:
            serializer_master = FeePlanConcessionMappingMasterSerializer(data=master_data)
            serializer_master.is_valid(raise_exception=True)
            master_data = serializer_master.save()
        fee_plan_concession_data = []
        for fee_term in data['fee_term_list']:
            fee_term['master'] = master_data.id
            fee_term['fee_plan_id'] = fee_term['fee_plan']
            fee_plan_concession_data.append(fee_term)
        for row_data in fee_plan_concession_data:
            if 'id' in row_data and row_data['id']:
                serializer = FeePlanConcessionMappingSerializer(instance=FeePlanConcessionMapping.objects.get(id=row_data['id']), data=row_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = FeePlanConcessionMappingSerializer(data=row_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
    return {'Reason': 'Data Added?updated successfully'}