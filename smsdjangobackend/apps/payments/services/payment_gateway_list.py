"""
Payment Gateway List service – list and retrieve logic for online payment transactions.
"""
from django.db.models import Count, Sum

from apps.finance.models import FeeCollection
from apps.payments.models import OnlinePayment
from apps.shared.services_shared.common import get_full_name
from apps.users.models.user import User


def get_payment_gateway_queryset(query_params):
    """
    Build filtered queryset for payment gateway list.
    """
    queryset = OnlinePayment.objects.filter(entity_name='FC')

    from_date = query_params.get('from_date')
    to_date = query_params.get('to_date')
    if from_date:
        queryset = queryset.filter(created__date__gte=from_date)
    if to_date:
        queryset = queryset.filter(created__date__lte=to_date)

    payment_status = query_params.get('payment_status')
    if payment_status:
        queryset = queryset.filter(payment_status__iexact=payment_status)

    order_status = query_params.get('order_status')
    if order_status:
        queryset = queryset.filter(order_status__iexact=order_status)

    mode_of_payment = query_params.get('mode_of_payment')
    if mode_of_payment:
        queryset = queryset.filter(mode_of_payment__icontains=mode_of_payment)

    user_type = query_params.get('user_type')
    if user_type == 'Student':
        queryset = queryset.filter(user__student__isnull=False)
    elif user_type == 'Staff':
        queryset = queryset.filter(user__staff__isnull=False)

    order_id = query_params.get('order_id')
    if order_id:
        queryset = queryset.filter(order_id__icontains=order_id)

    return queryset.order_by('-created')


def get_payment_gateway_summary(queryset, query_params):
    """
    Compute summary for successful paid payments with fee_collection.
    Returns None if date range not provided.
    """
    if not query_params.get('from_date') or not query_params.get('to_date'):
        return None

    summary_queryset = queryset.filter(
        payment_status__iexact='SUCCESS',
        fee_collection_online_payment__isnull=False
    )
    agg = summary_queryset.aggregate(
        total_count=Count('id'),
        total_amount=Sum('amount')
    )
    return {
        'total_count': agg['total_count'] or 0,
        'total_amount': float(agg['total_amount'] or 0),
    }


def enrich_payment_gateway_items(items):
    """
    Enrich serialized payment items with user info and fee collection data.
    Modifies items in place.
    """
    for item in items:
        if 'transaction_fees' in item:
            del item['transaction_fees']
        if 'vendor_transaction_fees' in item:
            del item['vendor_transaction_fees']

        if item.get('user'):
            try:
                user = User.objects.get(id=item['user'])
                if user.student:
                    s = user.student
                    item['user_name'] = get_full_name(s.first_name, s.middle_name, s.last_name)
                    item['user_type'] = 'Student'
                elif user.staff:
                    s = user.staff
                    item['user_name'] = get_full_name(s.first_name, s.middle_name, s.last_name)
                    item['user_type'] = 'Staff'
                else:
                    item['user_name'] = user.username
                    item['user_type'] = 'User'
            except User.DoesNotExist:
                item['user_name'] = 'N/A'
                item['user_type'] = 'N/A'

        try:
            fc = FeeCollection.objects.get(online_payment=item['id'], is_active=True)
            item['fee_collection_id'] = fc.id
            item['receipt_num'] = fc.receipt_num
            item['payment_ref_num'] = fc.payment_ref_num
            item['student_id'] = fc.student_id if fc.student_id else None
        except FeeCollection.DoesNotExist:
            item['fee_collection_id'] = None
            item['receipt_num'] = None
            item['payment_ref_num'] = None
            item['student_id'] = None

    return items


def get_payment_gateway_retrieve(order_id, view):
    """
    Build retrieve response for a single payment by order_id.
    view: viewset instance (for get_payment_history which needs view.request).
    """
    try:
        online_payment = OnlinePayment.objects.get(order_id=order_id)
    except OnlinePayment.DoesNotExist:
        return None

    try:
        from apps.payments.services.order_payments import get_payment_history
        history = get_payment_history(view, order_id)
    except Exception:
        history = {'data': []}

    gateway_response = online_payment.gateway_response if online_payment.gateway_response else {}

    fee_collection_data = {}
    try:
        fc = FeeCollection.objects.get(online_payment=online_payment.id, is_active=True)
        fee_collection_data = {
            'id': fc.id,
            'receipt_num': fc.receipt_num,
            'payment_ref_num': fc.payment_ref_num,
            'transaction_date': fc.transaction_date,
            'total_amount': fc.total_amount,
        }
    except FeeCollection.DoesNotExist:
        pass

    return {
        'order_id': online_payment.order_id,
        'amount': str(online_payment.amount),
        'order_status': online_payment.order_status,
        'payment_status': online_payment.payment_status,
        'mode_of_payment': online_payment.mode_of_payment,
        'created': online_payment.created,
        'gateway_response': gateway_response,
        'fee_collection': fee_collection_data,
        'payment_history': history.get('data', []),
    }
