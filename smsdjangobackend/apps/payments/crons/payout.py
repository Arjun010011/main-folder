from django.db import transaction
from datetime import datetime, timedelta
from django.db.models import F
from django.conf import settings

from apps.tenants.services.middlewares import get_current_db_name
from apps.finance.models import FeeCollection, PaymentDetail
from apps.shared.services import ConfigurationService

from apps.payments.services import make_payout, send_fee_collection_payout_failure_notification, get_company_beneficiary
from apps.tenants.services.middlewares import set_db_for_router

DB = getattr(settings, 'DATABASES', None)

def fee_collection_execute():
    for name, item in DB.items():
        if name != 'default':
            set_db_for_router(item['NAME'])
            settig_val = ConfigurationService.get_setting_value('instant_payout')
            if settig_val != '200':
                institutewise_fee_payout(item['NAME'])

def institutewise_fee_payout(name):
    with transaction.atomic(using=name):
        today = datetime.now().date()
        yesterday = today - timedelta(days=1)
        fee_collections = FeeCollection.objects.filter(
            mode_of_payment='Online',
            created__gte=yesterday,
            online_payment__isnull=False,
            online_payout__isnull=True,
            total_amount__is_null=False,
            is_active=True
        ).values(
            'id',
            'total_amount',
        )
        fee_total_amount_mapping = {}
        fee_collection_ids = list()
        for fee_collection in fee_collections:
            fee_total_amount_mapping[fee_collection['id']] = fee_collection['total_amount']
            fee_collection_ids.append(fee_collection['id'])
            
        payment_detail_values = PaymentDetail.objects.filter(
            fee_collection_id__in=fee_collection_ids,
            fee_collection__is_active=True
        ).values(
            'fee_collection_id',
            academic_year=F('fee_plan__standard_fee__academic_year')
        )
        payment_detail_dict = {}
        for data in payment_detail_values:
            if data['academic_year'] not in payment_detail_dict:
                payment_detail_dict[data['academic_year']] = {
                    'amount': 0,
                    'fee_collection_ids': []
                }
            payment_detail_dict[data['academic_year']]['amount'] += fee_total_amount_mapping[data['fee_collection_id']]
            payment_detail_dict[data['academic_year']]['fee_collection_ids'].append(data['fee_collection_id'])

        beneficiary = get_company_beneficiary()
        for year, data  in payment_detail_dict.items():
            payout_id = make_payout(None, data['amount'], beneficiary)
    
            if payout_id:
                FeeCollection.objects.filter(
                    id__in=data['fee_collection_ids'],
                    is_active=True
                ).update(online_payout_id=payout_id)
            else:
                send_fee_collection_payout_failure_notification(fee_collection_qs)

