from apps.shared.services import SharedService
from rest_framework import exceptions
from django.db import transaction
from rest_framework.exceptions import ValidationError
from django.db.models import F, Q

from apps.shared.services import SharedService
from apps.finance.models import FeePlan
from apps.payments.models import BeneficiaryFeePlanMapping, Beneficiary
from apps.tenants.services.middlewares import get_current_db_name


def add_beneficiary(self, data):
    user = self.request.user
    if user.is_superuser:
        raise exceptions.ValidationError('Super user can not add beneficiary')

    validated_data = validate_benefiary_data(data, user)
    SharedService.duplicate_list_one_object(validated_data, 'bank_account')
    response = SharedService.add_data(self, validated_data, isList=True)
    return response

def validate_benefiary_data(data, user):
    beneficiary_qs = Beneficiary.objects.filter(
        user=user,
        is_primary=True
    )
    beneficiary_count = beneficiary_qs.count()
    post_beneficiary_primary_account_counts = 0
    bank_accounts = set()
    for beneficiary in data:
        beneficiary["beneficiary_id"] = ""
        beneficiary["user"] = user.id
        bank_accounts.add(beneficiary['bank_account'])
        SharedService.validate_bank_account_num(beneficiary['bank_account'])
        SharedService.validate_india_mobile_number(beneficiary['phone'])
        SharedService.validate_email(beneficiary['email'])
        SharedService.validate_ifsc_code(beneficiary['ifsc'])
        if beneficiary.get('is_primary'):
            post_beneficiary_primary_account_counts += 1
    if len(bank_accounts) != len(data):
        raise exceptions.ValidationError(f'Duplicate bank accounts are present')

    if beneficiary_count > 0 and post_beneficiary_primary_account_counts > 0:
        previous_primary_beneficiary_account = beneficiary_qs.first().bank_account
        raise exceptions.ValidationError(f'Already {previous_primary_beneficiary_account} is already marked as primary account!!')

    if post_beneficiary_primary_account_counts > 1:
        raise exceptions.ValidationError(f'At a time only one account can be primary account!!')
    return data


def set_beneficiary_fee_plan(self, request_data):
    # {
    #     'year': 1,
    #     'standard': 2,
    #     'gateway_vendor': 1, 
    #     'data': [
    #         { 
    #             'beneficiary': 1
    #             'fee_plan': 1,
    #             'rate': 30,
    #             'amount_type': 1,#is_fee_amount=1, is_primary_adjustment=2, is_fine_amount=3
    #             'is_amount': True, 
    #             'priority': 1,
    #         }
    #     ],
    #     'deletable_ids': []
    # }
    academic_year, standard, beneficiary_plan_data, deletable_ids, gateway_vendor = request_data.get('year', None), request_data.get(
        'standard', None), request_data.get('data', []), request_data.get('deletable_ids', []), request_data.get('gateway_vendor')

    if not academic_year:
        raise ValidationError("Academic year not found")

    if not standard:
        raise ValidationError("standard not found")
    
    if not gateway_vendor:
        raise ValidationError("Vendor not found")

    if not self.request.user.is_superuser:
        raise ValidationError("Only super admin can update this")

    beneficiaries = Beneficiary.objects.filter(status=True).values(
        'id', 'beneficiary_id', 'account_holder_name', 'bank_account', 'is_primary')
    beneficiary_data = {
        beneficiary['id']: beneficiary for beneficiary in beneficiaries}

    mapping_ids = BeneficiaryFeePlanMapping.objects.filter(
        fee_plan__standard_fee__academic_year_id=academic_year,
        fee_plan__standard_fee__standard_id=standard,
        gateway_vendor_id=gateway_vendor
    ).values_list('id', flat=True)

    fee_plans = FeePlan.objects.filter(
        standard_fee__academic_year_id=academic_year,
        standard_fee__standard_id=standard
    ).values('id', 'is_amount', 'rate', standard_name=F(
        'standard_fee__standard__name'), fee_type_name=F('standard_fee__fee_type__name'), is_approved=F('standard_fee__is_approved'))
    fee_plan_data = {fee_plan['id']: fee_plan for fee_plan in fee_plans}
    beneficiary_plan_data.sort(key=lambda k: k['priority'])

    beneficiary_mapping_data = {}
    updating_ids = set()
    for data in beneficiary_plan_data:
        (
            beneficiary,
            fee_plan_id,
            is_amount,
            rate,
            amount_type
        ) = (
            data['beneficiary'],
            data['fee_plan'],
            data.get('is_amount', True),
            data['rate'],
            data["amount_type"]
        )
        is_fee_amount = amount_type == 1
        is_primary_adjustment = amount_type == 2
        is_fine_amount = amount_type == 3
        if beneficiary not in beneficiary_data:
            raise ValidationError("Beneficiary not found!!")
        if fee_plan_id not in fee_plan_data:
            raise ValidationError("Fee plan not found!!")

        if not str(rate).isdigit():
            raise ValidationError("Amount should be a number!!")
        rate = float(rate)
        if rate <= 0:
            raise ValidationError("Minimum amount is 1!!")

        term_name = f"{fee_plan_data[fee_plan_id].get('standard_name')}({fee_plan_data[fee_plan_id].get('fee_type_name')})"

        if data.get('id'):
            updating_ids.add(data.get('id'))
            if data.get('id') not in mapping_ids:
                raise ValidationError(f"ID: {data.get('id')} not found")

            if data.get('id') in deletable_ids:
                raise ValidationError(
                    "Both Deleting and updating happening for ${term_name}")

        if fee_plan_id not in beneficiary_mapping_data:
            beneficiary_mapping_data[fee_plan_id] = {
                'term_name': term_name,
                'total_rate': 0,
                'other_total_rate': 0,
                'mapped_beneficiaries': [],
                'other_mapped_beneficiaries': [],
                'last_priority': None,
                'primary_adjustment_total_rate': 0,
                'fine_total_rate': 0,
            }

        if not beneficiary_data[beneficiary].get('is_primary'):
            raise ValidationError(
                f"{beneficiary_data[beneficiary].get('bank_account')} is not marked as primary account!!")

        if not fee_plan_data[fee_plan_id].get('is_approved'):
            raise ValidationError("{term_name} Fee plan is not approved yet!!")
        
        if is_fine_amount:
            if is_amount:
                raise ValidationError("{term_name} Fine Amount always to be in percentage!!")
            beneficiary_mapping_data[fee_plan_id]['fine_total_rate'] += rate
            if beneficiary_mapping_data[fee_plan_id]['fine_total_rate'] > 100:
                raise ValidationError(
                    "{term_name} Fine Amount overall rate can not be more than 100!!")
        elif is_primary_adjustment:
            if is_amount:
                raise ValidationError("{term_name} Adjustment amount always to be in percentage!!")
            beneficiary_mapping_data[fee_plan_id]['primary_adjustment_total_rate'] += rate
            if beneficiary_mapping_data[fee_plan_id]['primary_adjustment_total_rate'] > 100:
                raise ValidationError(
                    "{term_name} Adjustment overall rate can not be more than 100!!")
        elif is_fee_amount:
            if 'is_amount' not in beneficiary_mapping_data[fee_plan_id]:
                beneficiary_mapping_data[fee_plan_id]['is_amount'] = is_amount

            if beneficiary_mapping_data[fee_plan_id].get('is_amount') != is_amount:
                raise ValidationError(
                    f"{term_name} is declared with both percentage and amount")

            beneficiary_mapping_data[fee_plan_id]["total_rate"] += rate
            if beneficiary in beneficiary_mapping_data[fee_plan_id]['mapped_beneficiaries']:
                raise ValidationError(
                    f"{beneficiary_data[beneficiary].get('bank_account')} is used multiple times in same standard and same term")
            beneficiary_mapping_data[fee_plan_id]['mapped_beneficiaries'].append(
                beneficiary)
            if is_amount:
                if not fee_plan_data.get(fee_plan_id).get('is_amount'):
                    raise ValidationError(
                        f"{term_name} is declared percentage amount. so you can not put amount.")
                if beneficiary_mapping_data[fee_plan_id]["last_priority"] is not None and beneficiary_mapping_data[fee_plan_id]["last_priority"] == data.get("priority"):
                    raise ValidationError(
                        f"{term_name} have same priorities and Can not set same priority when devision set as amount wise")
                if beneficiary_mapping_data[fee_plan_id]["total_rate"] > fee_plan_data.get(fee_plan_id).get('rate'):
                    raise ValidationError(
                        f"{term_name} total amount devision is greater than fee term amount({fee_plan_data.get(fee_plan_id).get('rate')})")
            else:
                if beneficiary_mapping_data[fee_plan_id]["total_rate"] > 100:
                    raise ValidationError(
                        f"{term_name} total percentage devision is greater than 100")

            beneficiary_mapping_data[fee_plan_id]["last_priority"] = data.get(
                "priority")

        else:
            if 'is_other_amount' not in beneficiary_mapping_data[fee_plan_id]:
                beneficiary_mapping_data[fee_plan_id]['is_other_amount'] = is_amount

            if beneficiary_mapping_data[fee_plan_id].get('is_other_amount') != is_amount:
                raise ValidationError(
                    f"{term_name} is declared with both percentage and amount")

            beneficiary_mapping_data[fee_plan_id]["other_total_rate"] += rate

            if beneficiary in beneficiary_mapping_data[fee_plan_id]['other_mapped_beneficiaries']:
                raise ValidationError(
                    f"{beneficiary_data[beneficiary].get('bank_account')} is used multiple times in same standard and same term for other data")
            beneficiary_mapping_data[fee_plan_id]['other_mapped_beneficiaries'].append(
                beneficiary)
            if not is_amount:
                if beneficiary_mapping_data[fee_plan_id]["other_total_rate"] > 100:
                    raise ValidationError(
                        f"{term_name} other total percentage devision is greater than 100")

    for fee_plan_id, ben_data in beneficiary_mapping_data.items():
        if not ben_data.get("is_amount"):
            if ben_data["other_mapped_beneficiaries"] and ben_data["other_total_rate"] < 100:
                raise ValidationError(
                    f"{ben_data['term_name']} other total percentage devision is less than 100")
            if ben_data["total_rate"] < 100:
                raise ValidationError(
                    f"{ben_data['term_name']} total percentage devision is less than 100")
        if ben_data["primary_adjustment_total_rate"] < 100: 
            raise ValidationError(
                f"{ben_data['term_name']} Extra adjustment amount is less than 100%")
        if ben_data["fine_total_rate"] < 100: 
            raise ValidationError(
                f"{ben_data['term_name']} Fine Amount rate is less than 100%")
 
    for fee_plan_id, plan_data in fee_plan_data.items():
        name = f"{plan_data.get('standard_name', '')} - {plan_data.get('fee_type_name', '')}"
        if fee_plan_id not in beneficiary_mapping_data:
            # print(fee_plan_id, beneficiary_mapping_data)
            raise ValidationError(f"{name} Amount devision not included!!")
        if beneficiary_mapping_data[fee_plan_id].get("is_amount", False) and beneficiary_mapping_data[fee_plan_id]["total_rate"] != plan_data.get('rate', 0):
            raise ValidationError(f"{name} total amount not matching")

    deletable_ids = set(deletable_ids)
    if len(mapping_ids) != len(deletable_ids.union(updating_ids)):
        raise ValidationError('Some of the data is not updating.')
    intersection_ids = deletable_ids.intersection(updating_ids)
    if len(intersection_ids):
        raise ValidationError(
            'Some of the data is marking as deleting and updating')

    with transaction.atomic(using=get_current_db_name()):
        beneficiary_create_instances = []
        for data in beneficiary_plan_data:
            if data.get('id'):
                beneficiary = BeneficiaryFeePlanMapping.objects.get(
                    id=data.get('id'))
                beneficiary.is_amount = data["is_amount"]
                beneficiary.beneficiary_id = data["beneficiary"]
                beneficiary.rate = data["rate"]
                beneficiary.priority = data["priority"]
                beneficiary.fee_plan_id = data["fee_plan"]
                beneficiary.amount_type = data["amount_type"]
                beneficiary.gateway_vendor_id = gateway_vendor
                beneficiary.save()
            else:
                beneficiary_create_instances.append(
                    BeneficiaryFeePlanMapping(
                        is_amount=data["is_amount"],
                        beneficiary_id=data["beneficiary"],
                        rate=data["rate"],
                        priority=data["priority"],
                        fee_plan_id=data["fee_plan"],
                        amount_type=data["amount_type"],
                        gateway_vendor_id=gateway_vendor
                    )
                )
        if beneficiary_create_instances:
            BeneficiaryFeePlanMapping.objects.bulk_create(
                beneficiary_create_instances)
        if deletable_ids:
            BeneficiaryFeePlanMapping.objects.filter(
                id__in=list(deletable_ids)).delete()
    return {"message": "Data added successfully!!"}


def get_beneficiary_plans(self):
    from apps.payments.services import CashFreeAPICalls
    # re = CashFreeAPICalls.create_payment_link()
    academic_year = self.request.GET.get("year")
    standard = self.request.GET.get("standard")
    gateway_vendor = self.request.GET.get("gateway_vendor")
    if not academic_year:
        raise ValidationError('Please select academic year')

    if not standard:
        raise ValidationError('Please select Standard')

    if not gateway_vendor:
        raise ValidationError('Please select gateway vendor')

    fee_plan_data = FeePlan.objects.filter(
        standard_fee__academic_year_id=academic_year,
        standard_fee__standard_id=standard
    ).values(
        'id',
        'is_amount',
        'rate',
        'terms',
        standard_id=F('standard_fee__standard_id'),
        standard_name=F('standard_fee__standard__name'),
        fee_type_id=F('standard_fee__fee_type_id'),
        fee_type_name=F('standard_fee__fee_type__name'),
        is_approved=F('standard_fee__is_approved'),
    )
    fee_plan_dict = {}
    for fee_plan in fee_plan_data:
        if fee_plan["fee_type_id"] not in fee_plan_dict:
            fee_plan_dict[fee_plan["fee_type_id"]] = {
                'standard_id': fee_plan["standard_id"],
                'standard_name': fee_plan["standard_name"],
                'fee_type_id': fee_plan["fee_type_id"],
                'fee_type_name': fee_plan["fee_type_name"],
                "is_approved": fee_plan["is_approved"],
                "rate": 0,
                "standard_fee": []
            }
        fee_plan_dict[fee_plan["fee_type_id"]]["rate"] += fee_plan["rate"]
        fee_plan_dict[fee_plan["fee_type_id"]]["standard_fee"].append({
            "id": fee_plan["id"],
            "is_amount": fee_plan["is_amount"],
            "rate": fee_plan["rate"],
            "terms": fee_plan["terms"],
        })

    beneficiary_fee_plans = BeneficiaryFeePlanMapping.objects.filter(
        fee_plan__standard_fee__academic_year_id=academic_year,
        fee_plan__standard_fee__standard_id=standard,
        gateway_vendor_id=gateway_vendor
    ).values(
        'id',
        'amount_type',
        'is_amount',
        'rate',
        'priority',
        'fee_plan_id',
        'beneficiary_id',
    )

    ben_ids = set()
    fee_plan_wise_data = {}
    for ben_fee_plan in beneficiary_fee_plans:
        ben_ids.add(ben_fee_plan['beneficiary_id'])
        if ben_fee_plan["fee_plan_id"] not in fee_plan_wise_data:
            fee_plan_wise_data[ben_fee_plan["fee_plan_id"]] = []
        fee_plan_wise_data[ben_fee_plan["fee_plan_id"]].append({
            'id': ben_fee_plan["id"],
            'is_amount': ben_fee_plan["is_amount"],
            "rate": ben_fee_plan["rate"],
            "priority": ben_fee_plan["priority"],
            "fee_plan_id": ben_fee_plan["fee_plan_id"],
            "beneficiary_id": ben_fee_plan["beneficiary_id"],
            "amount_type": ben_fee_plan["amount_type"],
        })
    overall_fee_plan_data = fee_plan_dict.values()
    for plan_data in overall_fee_plan_data:
        for plan in plan_data["standard_fee"]:
            plan["beneficiary_split"] = fee_plan_wise_data.get(plan["id"], [])

    beneficiaries = Beneficiary.objects.filter(
        Q(is_primary=True) | Q(id__in=list(ben_ids)),
        status=True
    ).values(
        'id',
        'beneficiary_id',
        'account_holder_name',
        'bank_account',
        'is_primary',
        'ifsc',
        'address',
        'city',
        'state',
        'pincode',
    )
    return {'beneficiary_data': list(beneficiaries), 'fee_plan_data': list(overall_fee_plan_data)}
