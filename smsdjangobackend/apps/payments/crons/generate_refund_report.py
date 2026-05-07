from django.db import transaction
from datetime import datetime, timedelta
from django.db.models import F
from django.conf import settings

from apps.tenants.services.middlewares import get_current_db_name
from apps.finance.models import FeeCollection, PaymentDetail
from apps.payments.models import OnlinePayment, Refund
from apps.payments.models.online_payments import EntityNames
from apps.payments.services import make_payout, send_fee_collection_payout_failure_notification, get_company_beneficiary
from apps.tenants.services.middlewares import set_db_for_router
from apps.payments.constants import CASHFREE_ORDER_STATUSES

DB = getattr(settings, 'DATABASES', None)


def refund_report_execute():
    data = list()
    for name, item in DB.items():
        if name != 'default':
            set_db_for_router(item['NAME'])
            institute_data = institutewise_refund_report(item['NAME'])
            data.extend(institute_data)


def institutewise_refund_report(db):
    payment_filters = dict(
        order_status=CASHFREE_ORDER_STATUSES['paid'],
        status=False
    )

    online_payment_values = OnlinePayment.objects.filter(
        **payment_filters
    ).order_by('-created').values(
        'id',
        'order_id',
        'entity_name',
        'amount',
        'transaction_fees',
        'mode_of_payment',
    )
    entity_dict = dict((val, key) for key, val in EntityNames)
    online_payment_ids = list()
    for online_payment in online_payment_values:
        online_payment['entity_name_display'] = entity_dict[online_payment['entity_name']]
        online_payment['total'] = online_payment['amount'] + \
            online_payment['transaction_fees']
        online_payment_ids.append(online_payment['id'])

    refund_values = Refund.objects.filter(
        online_payment_id__in=online_payment_ids
    ).values(
        'id',
        'refund_id',
        'online_payment_id',
        'amount',
        'refund_status'
    )
    refund_mapping = dict()
    for refund in refund_values:
        refund_values[refund['online_payment_id']] = refund

    for online_payment in online_payment_values:
        online_payment_id = online_payment['id']
        online_payment['refund_data'] = refund_values.get(online_payment_id)

    return online_payment_values
