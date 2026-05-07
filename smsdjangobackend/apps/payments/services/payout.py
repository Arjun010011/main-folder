import logging
from rest_framework.exceptions import ValidationError
from django.db.models import Sum, F, Q
from django.db import transaction
from requests.exceptions import HTTPError

from apps.finance.serializers import FeeCollectionSerializer
from apps.payments.models.payout_fee_collection_map import PayoutFeeCollectionMapping
from apps.payments.services.order_payments import get_company_beneficiary
from apps.payments.services.notifications import send_low_balance_notification, send_fee_collection_payout_failure_notification
from apps.shared.services import FormdefinitionService
from apps.payments.services import CashFreePayoutAPICalls
from apps.shared.services import SharedService, CounterService
from apps.finance.models import FeeCollection, PaymentDetail, FeePlan
from apps.payments.serializers import PayoutSerializer, BeneficiarySerializer
from apps.payments.models.payout import Payout
from apps.payments.models import BeneficiaryFeePlanMapping, Beneficiary, OnlinePayment
from apps.institutes.models.institute import Institute
from apps.tenants.services.middlewares import get_current_db_name
from apps.payments.constants import CASHFREE_ORDER_STATUSES

log = logging.getLogger(__name__)


def update_pending_payout_list():
    pending_payout_orders = Payout.objects.filter(order_status="PENDING")
    # failed_to_fetch_orders_status = []
    for payout_order in pending_payout_orders:
        payout_order_id = payout_order.payout_order_id
        try:
            response = CashFreePayoutAPICalls.get_transfer_status(
                {'transferId': payout_order_id})
            payout_order.order_status = response.get(
                "data", {}).get("transfer").get("status", "PENDING")
            payout_order.referenceId = response.get(
                "data", {}).get("transfer").get("referenceId", None)
            payout_order.save()
        except HTTPError as e:
            log.exception(f"Error while fetch payout order status: {str(e)}")
            # failed_to_fetch_orders_status.append(payout_order_id)


def fee_collection_payout_list(self):
    update_pending_payout_list()
    filters = self.request.GET.dict()
    search = filters.get('search', '')
    academic_year = filters.get('year', '')
    from_date = filters.get('from_date', '')
    to_date = filters.get('to_date', '')
    fee_collection_filters = {
        'mode_of_payment': 'Online',
        'online_payment__order_status': CASHFREE_ORDER_STATUSES['paid'],
        'is_active': 1
    }
    if academic_year:
        fee_collection_ids = PaymentDetail.objects.filter(
            fee_plan__standard_fee__academic_year_id=academic_year).values_list('fee_collection_id', flat=True).distinct()
        fee_collection_filters["id__in"] = list(fee_collection_ids)

    if from_date and to_date:
        fee_collection_filters["transaction_date__range"] = (
            from_date, to_date)

    q_query = {}
    if search:
        q_query = Q(student__first_name__icontains=search) | Q(student__middle_name__icontains=search) | Q(
            student__last_name__icontains=search) | Q(student__current_reg_num__icontains=search) | Q(receipt_num__icontains=search) | Q(payment_ref_num__icontains=search)
    fee_collection_qs = FeeCollection.objects.filter(
        # q_query,
        **fee_collection_filters
    )
    fee_collection_data = fee_collection_qs.values(
        'id',
        'receipt_num',
        'transaction_date',
        'mode_of_payment',
        'payment_ref_num',
        'total_amount',
        first_name=F('student__first_name'),
        middle_name=F('student__middle_name'),
        last_name=F('student__last_name'),
        email=F('student__email'),
        current_reg_num=F('student__current_reg_num'),
    )
    fee_collection_ids = set()
    for data in fee_collection_data:
        fee_collection_ids.add(data["id"])

    payout_filters = {
        "payout__order_status__in": ["SUCCESS", "PENDING"],
        "fee_collection_id__in": list(fee_collection_ids)
    }
    payout_fee_collections = PayoutFeeCollectionMapping.objects.exclude(
        **payout_filters
    ).values(
        "fee_collection_id",
        amount=F('payout__amount'),
    )
    payout_fc_amount = {}
    for payout_fc in payout_fee_collections:
        if payout_fc["fee_collection_id"] not in payout_fc_amount:
            payout_fc_amount[payout_fc["fee_collection_id"]] = 0
        payout_fc_amount[payout_fc["fee_collection_id"]] += payout_fc["amount"]

    for fc in fee_collection_data:
        fc['payout_paid_amount'] = payout_fc_amount.get(fc["id"], 0)

    if filters.get('limit') and filters.get('pageno'):
        data, count, next_page, previous_page = SharedService.custom_pagination(
            self, fee_collection_data, filters.get('limit'), filters.get('pageno', 0))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return fee_collection_data


def get_payoutable_fee_collections():
    fee_collection_values = FeeCollection.objects.filter(
        mode_of_payment='Online',
        online_payment__order_status=CASHFREE_ORDER_STATUSES['paid'],
        is_active=1
    ).values('id', 'total_amount')
    fee_collection_data = {fee["id"]: fee["total_amount"]
                           for fee in fee_collection_values}
    payout_made_values = PayoutFeeCollectionMapping.objects.filter(
        fee_collection_id__in=list(fee_collection_data.keys())
    ).values('fee_collection_id').annotate(total_amount=Sum('payout__amount'))
    payout_made_data = {payout_val['fee_collection_id']
        : payout_val['total_amount'] for payout_val in payout_made_values}
    payable_fee_collection_ids = set()
    for fee_collection_id, amount in fee_collection_data.items():
        if amount > payout_made_data.get(fee_collection_id, 0):
            payable_fee_collection_ids.add(fee_collection_id)
    return list(payable_fee_collection_ids)


def fee_collection_payout_detail(academic_year, standard=None, collection_ids=None):
    fee_collection_ids = get_payoutable_fee_collections()
    if collection_ids is not None:
        intersect_collections = set(fee_collection_ids).intersection(collection_ids)
        if len(intersect_collections) == len(collection_ids):
            fee_collection_ids = collection_ids
        else:
            return {}
    fee_plan_ids = PaymentDetail.objects.filter(fee_collection_id__in=fee_collection_ids).values_list('fee_plan_id', flat=True)
    filter = {'standard_fee__academic_year_id': academic_year, 'id__in': list(fee_plan_ids) }
    if standard:
        filter["standard_fee__standard_id"] = standard
    
    fee_plan_data = FeePlan.objects.filter(**filter).values(
        'id',
        'is_amount',
        'rate',
        term_name=F('terms'),
        standard_name=F('standard_fee__standard__name'),
        fee_type_name=F('standard_fee__fee_type__name'),
        fee_type_id=F('standard_fee__fee_type_id'),
        is_approved=F('standard_fee__is_approved'),
    )

    fee_plan_dict = {}
    fee_plan_amount = {}
    for fee_plan in fee_plan_data:
        fee_plan_dict[fee_plan["id"]] = fee_plan
        fee_plan_amount[fee_plan["id"]] = fee_plan["rate"]
     
    fee_collection_qs = FeeCollection.objects.filter(
        id__in=fee_collection_ids,
        mode_of_payment='Online',
        online_payment__order_status=CASHFREE_ORDER_STATUSES['paid'],
        is_active=1
    )
    fee_collection_values = FeeCollectionSerializer(
        fee_collection_qs, many=True).data

    fc_data = {}
    online_payment_collection_mapping = {}
    for fc in fee_collection_values:
        fc_data[fc["id"]] = fc
        online_payment_collection_mapping[fc["online_payment"]] = fc["id"]

    online_payment_vals = OnlinePayment.objects.filter(id__in=list(online_payment_collection_mapping.keys(
    ))).values('id', 'vendor_transaction_fees', 'transaction_fees', 'amount', 'gateway_vendor_id')
    for payment in online_payment_vals:
        fee_collection_id = online_payment_collection_mapping[payment["id"]]
        fc_data[fc["id"]].update({
            'vendor_transaction_fees': payment["vendor_transaction_fees"],
            'transaction_fees': payment["transaction_fees"],
            'online_payment_amount': payment["amount"],
            'gateway_vendor_id': payment['gateway_vendor_id']
        })

    payment_details = PaymentDetail.objects.filter(fee_collection_id__in=list(fc_data.keys())).values(
        'fee_collection_id',
        'fee_plan_id',
        'amount_paid',
        'fee_fine_amount',
        student_id=F('fee_collection__student_id'),
    )
    fee_collection_data = {}
    fee_plan_ids = set()
    student_ids = set()
    fee_collection_type_data = {}
    fee_collection_term_data = {}
    for student_payment in payment_details:
        fee_collection_id, fee_plan_id, fee_fine_amount, amount_paid = student_payment['fee_collection_id'], student_payment[
            'fee_plan_id'], student_payment["fee_fine_amount"], student_payment["amount_paid"]
        plan_data = fee_plan_dict.get(fee_plan_id, None)
        if not plan_data:
            continue
        student_payment.update(plan_data)
        # amount_paid = student_payment["amount_paid"] = amount_paid - fee_fine_amount
        fee_type_id, fee_type_name, term_name = plan_data["fee_type_id"], plan_data["fee_type_name"], plan_data["term_name"]
        fee_plan_ids.add(fee_plan_id)
        if fee_collection_id not in fee_collection_data:
            fee_collection_data[fee_collection_id] = {
                **fc_data[fee_collection_id],
                'total_amount_paid': 0,
                'total_fine_amount_paid': 0,
                'standard_fee': [],
            }
            student_ids.add(fc_data[fee_collection_id]["student"])

        fee_collection_data[fee_collection_id]["total_amount_paid"] += amount_paid
        fee_collection_data[fee_collection_id]["total_fine_amount_paid"] += fee_fine_amount

        if (fee_collection_id, fee_type_id) not in fee_collection_type_data:
            fee_collection_type_data[(fee_collection_id, fee_type_id)] = {
                "fee_type_id": fee_type_id,
                "fee_type_name": fee_type_name,
                "amount_paid": 0,
                "fine_amount_paid": 0,
                "terms": []
            }
            fee_collection_data[fee_collection_id]["standard_fee"].append({
                'fee_type_name': student_payment['fee_type_name'],
                'fee_type_id': student_payment['fee_type_id'],
                "terms": []
            })
        fee_collection_type_data[(
            fee_collection_id, fee_type_id)]["amount_paid"] += amount_paid
        fee_collection_type_data[(
            fee_collection_id, fee_type_id)]["fine_amount_paid"] += fee_fine_amount

        if (fee_collection_id, fee_type_id, term_name) not in fee_collection_term_data:
            fee_collection_term_data[(fee_collection_id, fee_type_id, term_name)] = {
                'fee_plan_id': fee_plan_id,
                'term_name': term_name,
                "amount_paid": 0,
                "fine_amount_paid": 0
            }
            fee_collection_type_data[(fee_collection_id, fee_type_id)]["terms"].append({
                'fee_plan_id': fee_plan_id,
                'term_name': term_name,
                "fee_type_id": fee_type_id,
            })
        fee_collection_term_data[(fee_collection_id, fee_type_id, term_name)
                                 ]["amount_paid"] += amount_paid
        fee_collection_term_data[(fee_collection_id, fee_type_id, term_name)
                                 ]["fine_amount_paid"] += fee_fine_amount

    for data in fee_collection_term_data.values():
        fee_plan_id = data["fee_plan_id"]
        fee_amount = fee_plan_amount[fee_plan_id]
        data["fine_amount"] = data["fine_amount_paid"]
        data["fee_amount"] = data["amount_paid"] - data["fine_amount_paid"]
        data["adjustment_amount"] = 0
        if fee_amount < data["amount_paid"] - data["fine_amount_paid"]:
            data["adjustment_amount"] = data["fee_amount"] - fee_amount
            data["fee_amount"] = fee_amount

    previous_payout_details = PayoutFeeCollectionMapping.objects.filter(
        fee_collection_id__in=list(fee_collection_data.keys()),
        is_configuration=False,
        payout__order_status__in=["SUCCESS", "PENDING"],
    ).values(
        'fee_collection_id',
        'fee_plan_id',
        'fee_amount',
        'adjustment_amount',
        'fine_amount',
        payout_order_id=F("payout__payout_order_id"),
        amount=F("payout__amount"),
        order_status=F("payout__order_status"),
        reference_id=F("payout__reference_id"),
        beneficiary_id=F("payout__beneficiary_id"),
    )
    ben_fee_plans = BeneficiaryFeePlanMapping.objects.filter(fee_plan_id__in=list(
        fee_plan_ids)).values('beneficiary_id', 'fee_plan_id', 'is_amount', 'rate', 'priority', 'amount_type', 'gateway_vendor_id').order_by('priority')

    ben_fee_plan_data = {}
    sorted_fee_plan_benficiaries = {}
    ben_last_updated_priority = {}
    plan_amount_config = {}
    beneficiary_ids = set()
    for ben_fee_plan in ben_fee_plans:
        (
            amount_type, 
            fee_plan_id, 
            beneficiary_id,
            priority,
            gateway_vendor_id
         ) = (
            ben_fee_plan['amount_type'], 
            ben_fee_plan['fee_plan_id'], 
            ben_fee_plan['beneficiary_id'],
            ben_fee_plan['priority'],
            ben_fee_plan['gateway_vendor_id']
         )
        beneficiary_ids.add(beneficiary_id)
        plan_amount_config[(fee_plan_id, amount_type)] = ben_fee_plan["is_amount"]
        ben_fee_plan_data[(fee_plan_id, beneficiary_id, amount_type)] = ben_fee_plan

        if (fee_plan_id, amount_type) not in ben_last_updated_priority:
            ben_last_updated_priority[(fee_plan_id, amount_type)] = priority
            sorted_fee_plan_benficiaries[(fee_plan_id, amount_type)] = [[]]

        if ben_last_updated_priority[(fee_plan_id, amount_type)] != priority:
            ben_last_updated_priority[(fee_plan_id, amount_type)] = priority
            sorted_fee_plan_benficiaries[(fee_plan_id, amount_type)].append([])

        sorted_fee_plan_benficiaries[(
            fee_plan_id, amount_type)][-1].append(beneficiary_id)

    previous_payout_data = {}
    fc_ben_amt_data = {}
    for payout_data in previous_payout_details:
        fee_collection_id, fee_plan_id, beneficiary_id = payout_data[
            "fee_collection_id"], payout_data["fee_plan_id"], payout_data["beneficiary_id"]
        beneficiary_ids.add(beneficiary_id)
        if fee_collection_id not in fc_ben_amt_data:
            fc_ben_amt_data[fee_collection_id] = {}
        if (fee_plan_id, beneficiary_id) not in fc_ben_amt_data[fee_collection_id]:
            fc_ben_amt_data[fee_collection_id][(
                fee_plan_id, beneficiary_id)] = {
                    'total_amount': 0,
                    'fee_amount': 0,
                    'adjustment_amount': 0,
                    'fine_amount': 0,
                }
        fc_ben_amt_data[fee_collection_id][(
            fee_plan_id, beneficiary_id)]["total_amount"] += payout_data["amount"]
        fc_ben_amt_data[fee_collection_id][(
            fee_plan_id, beneficiary_id)]["fee_amount"] += payout_data["fee_amount"]
        fc_ben_amt_data[fee_collection_id][(
            fee_plan_id, beneficiary_id)]["adjustment_amount"] += payout_data["adjustment_amount"]
        fc_ben_amt_data[fee_collection_id][(
            fee_plan_id, beneficiary_id)]["fine_amount"] += payout_data["fine_amount"]

        if (fee_collection_id, fee_plan_id) not in previous_payout_data:
            previous_payout_data[(fee_collection_id, fee_plan_id)] = {
                'total': 0,
                'fee_amount': 0,
                'adjustment_amount': 0,
                'fine_amount': 0,
                'data': []
            }
        previous_payout_data[(fee_collection_id, fee_plan_id)
                             ]['total'] += payout_data["amount"]
        previous_payout_data[(fee_collection_id, fee_plan_id)
                             ]['fee_amount'] += payout_data['fee_amount']
        previous_payout_data[(fee_collection_id, fee_plan_id)
                             ]['adjustment_amount'] += payout_data['adjustment_amount']
        previous_payout_data[(fee_collection_id, fee_plan_id)
                             ]['fine_amount'] += payout_data['fine_amount']
        previous_payout_data[(fee_collection_id, fee_plan_id)]['data'].append({
            "amount": payout_data["amount"],
            "order_status": payout_data["order_status"],
            "payout_order_id": payout_data["payout_order_id"],
            "beneficiary_id": beneficiary_id,
        })

    beneficiary_qs = Beneficiary.objects.filter(id__in=list(beneficiary_ids))
    used_beneficiary_data = BeneficiarySerializer(
        beneficiary_qs, many=True).data
    beneficiary_amount = {}
    for fee_collection_id, collection_data in fee_collection_data.items():
        for type_data in collection_data["standard_fee"]:
            fee_type_id = type_data["fee_type_id"]
            type_data["amount_paid"] = fee_collection_type_data[(
                fee_collection_id, fee_type_id)]["amount_paid"]
            type_data["terms"] = fee_collection_type_data[(
                fee_collection_id, fee_type_id)]["terms"]
            for term_data in type_data["terms"]:
                term_data['data_to_be_splitted'] = {
                    'fee_amount': [],
                    'fine_amount': [],
                    'adjustment_amount': []
                }
                term_name, fee_plan_id = term_data["term_name"], term_data["fee_plan_id"]
                term_data["amount_paid"] = fee_collection_term_data[(
                    fee_collection_id, fee_type_id, term_name)]["amount_paid"]
                term_data["payout_amount"] = previous_payout_data.get((fee_collection_id, fee_plan_id), {}).get('total', 0)
                term_data["payout_details"] = previous_payout_data.get((fee_collection_id, fee_plan_id), {}).get('data', [])
                term_data["payout_fee_amount"] = previous_payout_data.get((fee_collection_id, fee_plan_id), {}).get('fee_amount', 0)
                term_data["payout_fine_amount"] = previous_payout_data.get((fee_collection_id, fee_plan_id), {}).get('adjustment_amount', 0)
                term_data["payout_adjustment_amount"] = previous_payout_data.get((fee_collection_id, fee_plan_id), {}).get('fine_amount', 0)
                fee_amount_data, fee_ben_amount = split_payout_amount_on_fee_plan_config(
                    fee_collection_id,
                    term_data,
                    fee_collection_term_data,
                    ben_fee_plan_data,
                    sorted_fee_plan_benficiaries,
                    fc_ben_amt_data.get(fee_collection_id, {}),
                    plan_amount_config,
                    1
                )
                if fee_amount_data:
                    term_data['data_to_be_splitted']['fee_amount'] = fee_amount_data
                    beneficiary_amount = update_beneficiary_amount(beneficiary_amount, fee_ben_amount)
                fine_amount_data, fine_ben_amount = split_payout_amount_on_fee_plan_config(
                    fee_collection_id,
                    term_data,
                    fee_collection_term_data,
                    ben_fee_plan_data,
                    sorted_fee_plan_benficiaries,
                    fc_ben_amt_data.get(fee_collection_id, {}),
                    plan_amount_config,
                    2
                )
                if fine_amount_data:
                    term_data['data_to_be_splitted']['fine_amount'] = fine_amount_data
                    beneficiary_amount = update_beneficiary_amount(beneficiary_amount, fine_ben_amount)

                adjustment_amount_data, adjust_ben_amount = split_payout_amount_on_fee_plan_config(
                    fee_collection_id,
                    term_data,
                    fee_collection_term_data,
                    ben_fee_plan_data,
                    sorted_fee_plan_benficiaries,
                    fc_ben_amt_data.get(fee_collection_id, {}),
                    plan_amount_config,
                    3
                )
                if adjustment_amount_data:
                    term_data['data_to_be_splitted']['adjustment_amount'] = adjustment_amount_data
                    beneficiary_amount = update_beneficiary_amount(beneficiary_amount, adjust_ben_amount)

    return {'beneficiary_data': used_beneficiary_data, 'data': fee_collection_data.values(), 'beneficiary_amount': beneficiary_amount}

def update_beneficiary_amount(overall_amount, ben_amount_dict):
    for ben_id, amount in ben_amount_dict.items():
        if ben_id not in overall_amount:
            overall_amount[ben_id] = 0
        overall_amount[ben_id] += amount
    return overall_amount

def split_payout_amount_on_fee_plan_config(
        fee_collection_id, 
        plan, 
        student_plan_paid_amount, 
        ben_fee_plan_data, 
        sorted_fee_plan_benficiaries, 
        fc_ben_amt_data,
        plan_amount_config,
        amount_type
    ):
    # plans = {'fee_plan_id': fee_plan_id,
    #          'term_name': student_payment['term_name'],
    #          'fee_type_name': student_payment['fee_type_name'],
    #          'amount_paid': student_payment["amount_paid"]}
    # student_plan_paid_amount = {('coll_id', 'type_id', 'term_name'): { "amount_paid": 300}}
    # ben_fee_plan_data = {('plan_id', 'ben', amount_type): ['amout', 'is_amount', 'priority']}
    # sorted_ben = {('plan_id', amount_type): [['ben1', 'ben2'], ['ben3']]}
    # fc_ben_amt_data = {('plan', 'ben'): { 'fee_amount': 100 }}
    amount_type_key_mapping = {
        1: 'fee_amount',
        2: 'adjustment_amount',
        3: 'fine_amount'
    }
    data = []
    beneficiary_amount = {}
    fee_type_id, fee_plan_id, term_name = plan["fee_type_id"], plan['fee_plan_id'], plan['term_name']
    stu_plan_paid_amount = student_plan_paid_amount.get(
        (fee_collection_id, fee_type_id, term_name), {}).get(amount_type_key_mapping[amount_type], 0)
    
    payout_made_plan_amount = plan[f"payout_{amount_type_key_mapping[amount_type]}"]
    payout_remaining_amt = stu_plan_paid_amount - payout_made_plan_amount
    if payout_remaining_amt <= 0:
        return None, None

    is_break = False
    sorted_bens = sorted_fee_plan_benficiaries.get((fee_plan_id, amount_type), [])
    if not sorted_bens:
        type_names = { 1: ' Fee amount', 2: 'Fine amount',  3: ' Adjustment amount' }
        raise ValidationError(f"Beneficiary is not set for {type_names[amount_type]}")

    for prior_bens in sorted_bens:
        for ben_id in prior_bens:
            payout_made_for_ben = fc_ben_amt_data.get(
                (fee_plan_id, ben_id), {}).get(amount_type_key_mapping[amount_type], 0)
            max_payout_for_ben = float(ben_fee_plan_data.get(
                (fee_plan_id, ben_id, amount_type), {}).get('rate', 0))
            # is_amount check
            if plan_amount_config.get((fee_plan_id, amount_type), False):
                payout_current_amt = max_payout_for_ben - payout_made_for_ben
                if payout_current_amt > 0:
                    paying_amt = min(payout_remaining_amt,
                                     payout_current_amt)
                    payout_remaining_amt -= paying_amt
                    data.append({
                        'beneficiary_id': ben_id, 
                        'amount': paying_amt,
                        'amount_paid': payout_made_for_ben
                    })
                    beneficiary_amount[ben_id] = paying_amt

            else:
                try:
                    max_payble_for_plan_for_overall_current_paid_amount = max_payout_for_ben * \
                        stu_plan_paid_amount / 100
                except Exception as e:
                    pass
                payoutble_now_for_plan = max_payble_for_plan_for_overall_current_paid_amount - \
                    payout_made_for_ben
                if payoutble_now_for_plan > 0:
                    paying_amt = min(payoutble_now_for_plan,
                                     payout_remaining_amt)
                    payout_remaining_amt -= paying_amt
                    data.append({
                        'beneficiary_id': ben_id, 
                        'amount': paying_amt,
                        'amount_paid': payout_made_for_ben,
                    })
                    beneficiary_amount[ben_id] = paying_amt
            if payout_remaining_amt <= 0:
                is_break = True
                break
        if is_break:
            break
    if payout_remaining_amt:
        if data and sorted_bens and data[0]["beneficiary_id"] == sorted_bens[0][0]:
            data[0]['amount'] += payout_remaining_amt
        else:
            ben_id = sorted_bens[0][0]
            payout_made_for_ben = fc_ben_amt_data.get(
                (fee_plan_id, ben_id), {}).get(amount_type_key_mapping[amount_type], 0)
            remaining_data = {
                'beneficiary_id': ben_id, 
                'amount': payout_remaining_amt,
                'amount_paid': payout_made_for_ben,
            }
            data = [remaining_data] + data
    return data, beneficiary_amount


def make_payout(self, fee_collection_qs):
    if not len(fee_collection_qs):
        raise ValidationError("No Fee Collections found!!")

    payout_made_fee_collections = PayoutFeeCollectionMapping.objects.filter(
        fee_collection__in=fee_collection_qs,
        is_configuration=False,
        payout__order_status="SUCCESS",
    ).values('fee_collection_id').distinct()
    if len(payout_made_fee_collections):
        raise ValidationError(
            "Payout already made for some of the fee collections!!")

    amount = fee_collection_qs.aggregate(Sum('total_amount'))[
        'total_amount__sum']
    beneficiary = get_company_beneficiary()
    payout_counter, payout_prefix, payout_postfix = CounterService.get_countered_value(
        self, 'PAYOUT')
    payout_prefix += '_' + str(Institute.get_institute(self).company_id) + '_'
    payout_prefix += SharedService.generate_random_number()
    order_id = f'{payout_prefix}{payout_counter.value}{payout_postfix}'
    CounterService.increment_counter(self, payout_counter)
    payout_data = dict(
        beneficiary=beneficiary.id,
        amount=amount,
        payout_order_id=order_id,
    )

    payout_serializer = PayoutSerializer(data=payout_data)
    payout_serializer.is_valid(raise_exception=True)
    for fee_collection_obj in fee_collection_qs.values():
        PayoutFeeCollectionMapping.objects.create(
            payout_id=payout_serializer.id,
            fee_collection=fee_collection_obj,
        )
    return payout_call(self, payout_serializer, beneficiary.id, order_id, amount).get('id', None)


def make_payout_view(self, data, is_credit=True):
    # Sample Data Format
    # data = {
    #     'year': 2,
    #     'data': [
    #         {
    #             'fee_collection_id': 304,
    #             'data': [
    #                 {
    #                     'amount_type': 1,
    #                     'fee_plan_id': 113,
    #                     'amount': 100,
    #                     'beneficiary_id': 1
    #                 },
    #                 {
    #                     'amount_type': 1,
    #                     'fee_plan_id': 113,
    #                     'amount': 200,
    #                     'beneficiary_id': 2
    #                 },
    #                 {
    #                     'amount_type': 1,
    #                     'fee_plan_id': 114,
    #                     'amount': 300,
    #                     'beneficiary_id': 1
    #                 },
    #             ],
    #         }
    #     ]
    # }
    amount_type_mapping = {
        1: 'fee_amount',
        2: 'adjustment_amount',
        3: 'fine_amount'
    }
    fee_collection_ids = set()
    cur_plan_stu_mapping = {}
    save_data = {}
    total_amount = 0
    for collection in data["data"]:
        fee_collection_id = collection["fee_collection_id"]
        fee_collection_ids.add(fee_collection_id)
        for plan_data in collection['data']:
            fee_plan_id, amount_type, beneficiary_id, amount = plan_data['fee_plan_id'], plan_data['amount_type'], plan_data['beneficiary_id'], plan_data['amount']
            if not amount:
                raise ValidationError("Amount should be greater than 0")
            mapping_key = (fee_collection_id, fee_plan_id)
            if mapping_key not in cur_plan_stu_mapping:
                cur_plan_stu_mapping[mapping_key] = {
                    'total': 0,
                    'fee_amount': 0,
                    'adjustment_amount': 0,
                    'fine_amount': 0
                }
            cur_plan_stu_mapping[mapping_key]['total'] += amount
            cur_plan_stu_mapping[mapping_key][amount_type_mapping[amount_type]] += amount
            if beneficiary_id not in save_data:
                save_data[beneficiary_id] = {}
            if mapping_key not in save_data[beneficiary_id]:
                save_data[beneficiary_id][mapping_key] = {
                    'total_amount': 0,
                    'fee_amount': 0,
                    'adjustment_amount': 0,
                    'fine_amount': 0
                }
            total_amount += amount
            save_data[beneficiary_id][mapping_key]['total_amount'] += amount
            save_data[beneficiary_id][mapping_key][amount_type_mapping[amount_type]] += amount
    
    bens = Beneficiary.objects.filter(id__in=list(save_data.keys())).values()
    if len(bens) != len(save_data.keys()):
        raise ValidationError("Some Beneficiaries not found")
    for ben in bens:
        if not ben['status']:
            raise ValidationError(f"{ben['bank_account']}: account is not active")
        if not ben['is_primary']:
            raise ValidationError(f"{ben['bank_account']}: account is not payoutable")

    if total_amount <= 0:
        raise ValidationError("Amount to be greater than 0")
    try:
        response_data = CashFreePayoutAPICalls.get_balance()
        balance = response_data.get('data', {}).get('availableBalance', 0)
        if balance < total_amount:
            send_low_balance_notification(self, balance, total_amount, fee_collection_ids)
            raise ValidationError("Enough balance not found in account")
    except Exception as e:
        pass
    collection_values = FeeCollection.objects.filter(
        id__in=list(fee_collection_ids),
    ).values(
        'id',
        'student_id',
        'receipt_num',
        'mode_of_payment',
        'online_payment__order_status',
        'is_active'
    )
    if collection_values.count() != len(fee_collection_ids):
        raise ValidationError('Some of the fee collections not found')
    for collection in collection_values:
        receipt_num = collection["receipt_num"]
        if collection['mode_of_payment'] != 'Online':
            raise ValidationError(f"{receipt_num} mode of payment is not online")
        elif collection['online_payment__order_status'] != CASHFREE_ORDER_STATUSES['paid']:
            raise ValidationError(f"{receipt_num}: transaction status is {collection['online_payment__order_status']}")
        elif collection['is_active'] != 1:
            raise ValidationError(f"{receipt_num} is already deleted")

    payout_made_vals = PayoutFeeCollectionMapping.objects.filter(
        fee_collection_id__in=fee_collection_ids
    ).values(
        'fee_collection_id',
        'fee_plan_id',
        'fee_amount',
        'adjustment_amount',
        'fine_amount',
    )
    payout_made_data = {}
    for payout in payout_made_vals:
        fee_collection_id, fee_plan_id = payout['fee_collection_id'], payout['fee_plan_id']
        mapping_key = (fee_collection_id, fee_plan_id)

        if mapping_key not in payout_made_data:
            payout_made_data[mapping_key] = {
                'total': 0,
                'fee_amount': 0,
                'adjustment_amount': 0,
                'fine_amount': 0,
            }
        payout_made_data[mapping_key]['total'] += payout['fee_amount'] + payout['adjustment_amount'] + payout['fine_amount']
        payout_made_data[mapping_key]['fee_amount'] += payout['fee_amount']
        payout_made_data[mapping_key]['adjustment_amount'] += payout['adjustment_amount']
        payout_made_data[mapping_key]['fine_amount'] += payout['fine_amount']

    payment_vals = PaymentDetail.objects.filter(
        fee_collection__in=list(fee_collection_ids)
    ).values(
        'fee_collection_id',
        'fee_plan_id',
        'amount_paid',
        'fee_fine_amount'
    )
    payment_data = {}
    for payment in payment_vals:
        fee_collection_id, fee_plan_id = payment['fee_collection_id'], payment['fee_plan_id']
        if (fee_collection_id, fee_plan_id) not in payment_data:
            payment_data[(fee_collection_id, fee_plan_id)] = {
                'amount_paid': payment['amount_paid'],
                'fee_fine_amount': payment['fee_fine_amount'],
            }
    for mapping_key, value in payment_data.items():
        fee_collection_id, fee_plan_id = mapping_key
        overall_payout_amount = payout_made_data.get(mapping_key, {}).get('total', 0) + cur_plan_stu_mapping.get(mapping_key, {}).get('total', 0)
        fine_payout_amount = payout_made_data.get(mapping_key, {}).get('fine_amount', 0) + cur_plan_stu_mapping.get(mapping_key, {}).get('fine_amount', 0)
        if fine_payout_amount != value['fee_fine_amount']:
            raise ValidationError(
                'Fee fine amount versus collected fine amount not matching')
        if overall_payout_amount != value['amount_paid']:
            raise ValidationError('overall amount versus collecting amount is not matching')

    for beneficiary_id, ben_val in save_data.items():
        with transaction.atomic(using=get_current_db_name()):
            if is_credit:
                payout_counter, payout_prefix, payout_postfix = CounterService.get_countered_value(self, 'PAYOUT')
                payout_prefix += '_' + str(Institute.get_institute(self).company_id) + '_'
                payout_prefix += SharedService.generate_random_number()
                payout_counter_value = int(payout_counter.value)
                order_id = f'{payout_prefix}{str(payout_counter_value)}{payout_postfix}'
                payout_data = dict(
                    beneficiary=beneficiary_id,
                    amount=0,
                    payout_order_id=order_id,
                )

                payout_serializer = PayoutSerializer(data=payout_data)
                payout_serializer.is_valid(raise_exception=True)
                payout_obj = payout_serializer.save()
            total_amount = 0
            payout_collection_instances = []
            for mapping_key, amount_data in ben_val.items():
                total_amount += amount_data['total_amount']
                fee_collection_id, fee_plan_id = mapping_key
                payout_collection_instances.append(
                    PayoutFeeCollectionMapping(
                        payout_id=payout_obj.id if is_credit else None,
                        fee_collection_id=fee_collection_id,
                        fee_plan_id=fee_plan_id,
                        fee_amount=amount_data["fee_amount"],
                        adjustment_amount=amount_data["adjustment_amount"],
                        fine_amount=amount_data["fine_amount"],
                        is_configuration=not is_credit,
                    )
                )
            PayoutFeeCollectionMapping.objects.bulk_create(payout_collection_instances)
            if is_credit:
                payout_call(self, payout_obj,
                            beneficiary_id, order_id, total_amount)
                payout_counter_value += 1
                payout_counter.value = payout_counter_value
                payout_counter.save()
    return True


def payout_call(self, payout_obj, beneficiary_id, order_id, amount):
    payload = dict(
        beneId=beneficiary_id,
        transferId=order_id,
        amount=amount,
    )
    # For testing remove it
    # payout_obj.amount = amount
    # payout_obj.save()
    # ===================================
    response_data = {"status": "PENDING"}
    try:
        response_data = CashFreePayoutAPICalls.request_transfer(payload)
    except Exception as e:
        send_fee_collection_payout_failure_notification(self, payout_obj, e)
        raise
    payout_obj.amount = amount
    payout_obj.order_status = response_data['status']
    payout_obj.reference_id = response_data.get(
        'data', {}).get("referenceId", "")
    payout_obj.save()


def make_payout_param_data(year, fee_collection_ids):
    payoutable_data = fee_collection_payout_detail(
        year, None, fee_collection_ids)
    amount_type_mapping = {
        'fee_amount': 1,
        'adjustment_amount': 2,
        'fine_amount': 3,
    }
    fee_collection_data = []
    for fee_data in payoutable_data['data']:
        collection_param_data = {
            'fee_collection_id': fee_data['id'], 'data': []}
        for std_fee in fee_data.get('standard_fee', []):
            for term_data in std_fee.get('terms', []):
                for splittable_key, splittable_data in term_data.get('data_to_be_splitted').items():
                    for ben_data in splittable_data:
                        collection_param_data['data'].append({
                            'amount_type': amount_type_mapping[splittable_key],
                            'fee_plan_id': term_data.get('fee_plan_id'),
                            'amount': ben_data.get('amount'),
                            'beneficiary_id': ben_data.get('beneficiary_id')
                        })
        fee_collection_data.append(collection_param_data)

    return {'year': year, 'data': fee_collection_data}


# yet to be done
def get_splittable_payout_order_data(self):
    student_id = 1
    academic_year = 1
    payout_fc_vals = PayoutFeeCollectionMapping.objects.filter(
        fee_collection__student__id = student_id,
        fee_plan__standard_fee__academic_year__id=academic_year,
        is_configuration=False
    ).values(
        'fee_plan_id',
        'fee_amount',
        'adjustment_amount',
        'fine_amount',
        benficiary_id=F('payout__beneficiary__id'),
        bank_account=F('payout__beneficiary__bank_account'),
        beneficiary_data=F('payout__beneficiary__data'),
        amount=F('payout__amount'),
        vendor_transaction_fees=F('payout__vendor_transaction_fees'),
    )