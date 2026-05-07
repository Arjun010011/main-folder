from apps.finance.models.additional_charge import AdditionalCharge, FeeCollectionAdditionChargeMapping, FeePlanAdditionalChargeMapping
from apps.shared.services import SharedService
from rest_framework import exceptions
from django.db import transaction
from decimal import Decimal
from apps.tenants.services.middlewares import get_current_db_name

def additional_charge_type(self, data_list):
    id_list = []
    for row_data in data_list:
        if 'id' in row_data:
            id_list.append(row_data['id'])
    if id_list:
        if AdditionalCharge.objects.filter(
          additional_charge_type__in=id_list
        ):
            raise exceptions.ValidationError('Additional Charge type already exist')
    response = SharedService.add_or_update_data(self, data_list)
    return response


def validate_additon_charge(self, data_list):
    ids_list = []
    for row_data in data_list:
        if 'is_percentage' in row_data and not row_data['is_percentage']:
            raise exceptions.ValidationError('is_percentage should be true')
        if 'id' in row_data:
            ids_list.append(row_data['id'])
    existing_data = FeePlanAdditionalChargeMapping.objects.filter(
        additional_charge__in=ids_list
    )
    if existing_data:
        raise exceptions.ValidationError('Data already exist not able to update')
    # for row_data in data_list:
    #     if 'id' in row_data and row_data['id']:
    #         raise exceptions.ValidationError('Update is not allowed already used by other')

def add_or_update_additional_charge(self, data_list):
    validate_additon_charge(self, data_list)
    response = SharedService.add_or_update_data(self, data_list)
    return response

def delete_additional_charge(self, delete_ids):
    AdditionalCharge.objects.filter(id__in=delete_ids).update(is_active=False)
    return {'Reason': 'Deleted Successfully'}

def validate_additional_charge_mapping(self, data):
    data_list = data['data_list']
    deletable_ids = data['deletable_ids'] if 'deletable_ids' in data else []
    fee_plan_list = []
    additional_charge_mapping = {}
    if deletable_ids:
        deletable_fee_plan_ids = FeePlanAdditionalChargeMapping.objects.filter(
            id__in=deletable_ids
        ).values_list('fee_plan', flat=True)
        if FeeCollectionAdditionChargeMapping.objects.filter(
            payment_detail__fee_plan__in=deletable_fee_plan_ids
        ):
            raise exceptions.ValidationError('Not able to delete few of them are referred')
    for row_data in data_list:
        if not row_data['fee_plan']:
            raise exceptions.ValidationError('fee_plan is mandatory')
        if not row_data['additional_charge']:
            raise exceptions.ValidationError('additional_chareg is mandatory')
        fee_plan_list.append(
            row_data['fee_plan']
        )
    existing_add_mapping = FeePlanAdditionalChargeMapping.objects.filter(
        fee_plan__in=fee_plan_list
    )
    for row_data in existing_add_mapping:
        if row_data.fee_plan not in additional_charge_mapping:
            additional_charge_mapping[row_data.fee_plan] = {}
        additional_charge_mapping[row_data.fee_plan][row_data.additional_charge] = row_data
    for row_data in data_list:
        if row_data['fee_plan'] in additional_charge_mapping and row_data['additional_charge'] in additional_charge_mapping[row_data['fee_plan']]:
            if 'id' in row_data and row_data['id'] and additional_charge_mapping[row_data['fee_plan']][row_data['additional_charge']].id != row_data['id']:
                if row_data['id'] in deletable_ids:
                    raise exceptions.ValidationError('Few id in add and delete')
            else:
                additional_char_obj = AdditionalCharge.objects.get(id=row_data['additional_charge'])
                raise exceptions.ValidationError(f'{additional_char_obj.name} - is already assigned to the fee plan')

def add_additional_charge_mapping(self, data, **kwargs):
    data_list = data['data_list']
    deletable_ids = data['deletable_ids'] if 'deletable_ids' in data else []
    from apps.finance.serializers import FeePlanAdditionalChargeMappingSerializer
    validate_additional_charge_mapping(self, data)
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            FeePlanAdditionalChargeMapping.objects.filter(
                id__in=deletable_ids
            ).update(is_active=False)
        for list_data in data_list:
            if 'id' in list_data:
                instance = FeePlanAdditionalChargeMapping.objects.get(id=list_data['id'])
                serializer = FeePlanAdditionalChargeMappingSerializer(instance=instance, data=list_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = FeePlanAdditionalChargeMappingSerializer(data=list_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
    return {'Reason': 'Data Saved Successfully'}

def calculate_additional_charge(self, additional_charge_mapping_data, given_additional_charge, payment_detail):
    if 'amount_paid' not in payment_detail:
        raise exceptions.ValidationError('amount is mandatory')
    if 'mode_of_payment' not in payment_detail:
        raise exceptions.ValidationError('mode_of_payment is mandatory')
    total_amount = 0
    payment_additional_charge_data = []
    given_additional_charge = {add['additional_charge']: add for add in given_additional_charge}
    for additonal_charge_map in additional_charge_mapping_data:
        additional_charge = additonal_charge_map['additional_charge']
        if payment_detail['mode_of_payment'] in additional_charge['apply_on_payment_mode'].split(','):
            if additional_charge['id'] not in given_additional_charge:
                raise exceptions.ValidationError(f'{additional_charge["additional_charge_type_name"]} does not exist')
            if additional_charge['is_percentage']:
                amount = (Decimal(payment_detail['amount_paid']) * Decimal(additional_charge['fees'])) / 100
            else:
                amount = Decimal(additional_charge['fees'])
            if additional_charge['id'] not in given_additional_charge:
                raise exceptions.ValidationError('additional_charge_data is missing')
            if float(amount) != float(given_additional_charge[additional_charge['id']]['amount']):
                raise exceptions.ValidationError(f'{amount} {given_additional_charge[additional_charge["id"]]["amount"]} additional charges amount is not matching')
            payment_additional_charge_data.append({
                'additional_charge': additional_charge['id'],
                'amount': amount
            })
            total_amount += amount
    return {'total_amount': total_amount, 'payment_additional_charge_data': payment_additional_charge_data}

def add_additional_charge_payment_data(self, data_list):
    from apps.finance.serializers import FeeCollectionAdditionChargeMappingSerilaizer #circular depedency
    ser = FeeCollectionAdditionChargeMappingSerilaizer(data=data_list, many=True)
    ser.is_valid(raise_exception=True)
    ser.save()
    return {'Reason': 'Data Saved Successfully'}