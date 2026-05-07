from datetime import date
from decimal import Decimal

from django.db.models import Sum, Count, Q

from apps.canteen.models.order import Order, OrderItem
from apps.canteen.models.wallet import Wallet, WalletTransaction
from apps.canteen.models.meal_package import MealPackageSubscription, MealPackageUsage


def get_admin_dashboard_stats(for_date=None):
    if for_date is None:
        for_date = date.today()

    orders_qs = Order.objects.filter(
        created_at__date=for_date,
        is_active=True,
    ).exclude(status=5)

    total_orders = orders_qs.count()
    total_revenue = orders_qs.aggregate(total=Sum('net_amount'))['total'] or Decimal('0.00')
    pending_orders = orders_qs.filter(status__in=[0, 1]).count()
    preparing_orders = orders_qs.filter(status=2).count()
    delivered_orders = orders_qs.filter(status=4).count()

    order_items = OrderItem.objects.filter(
        order__in=orders_qs, is_active=True
    ).values('food_item__name', 'combo__name').annotate(
        total_qty=Sum('quantity'),
        total_sales=Sum('total_price'),
    ).order_by('-total_qty')[:10]

    top_items = []
    for item in order_items:
        name = item['food_item__name'] or item['combo__name'] or 'Unknown'
        top_items.append({
            'name': name,
            'quantity': item['total_qty'],
            'sales': str(item['total_sales'] or 0),
        })

    total_wallets = Wallet.objects.filter(is_active=True).count()
    total_wallet_balance = Wallet.objects.filter(is_active=True).aggregate(
        total=Sum('balance')
    )['total'] or Decimal('0.00')

    active_subscriptions = MealPackageSubscription.objects.filter(
        is_active=True, status=0,
        start_date__lte=for_date, end_date__gte=for_date,
    ).count()

    payment_breakdown = {}
    for mode_val, mode_label in Order.PAYMENT_MODE_CHOICES:
        count = orders_qs.filter(payment_mode=mode_val).count()
        amount = orders_qs.filter(payment_mode=mode_val).aggregate(
            total=Sum('net_amount')
        )['total'] or Decimal('0.00')
        payment_breakdown[mode_label] = {'count': count, 'amount': str(amount)}

    return {
        'date': str(for_date),
        'total_orders': total_orders,
        'total_revenue': str(total_revenue),
        'pending_orders': pending_orders,
        'preparing_orders': preparing_orders,
        'delivered_orders': delivered_orders,
        'top_items': top_items,
        'total_wallets': total_wallets,
        'total_wallet_balance': str(total_wallet_balance),
        'active_subscriptions': active_subscriptions,
        'payment_breakdown': payment_breakdown,
    }


def get_my_dashboard(user):
    today = date.today()

    wallet = Wallet.objects.filter(user=user, is_active=True).first()
    wallet_balance = str(wallet.balance) if wallet else '0.00'
    wallet_id = wallet.id if wallet else None

    recent_transactions = []
    if wallet:
        txns = WalletTransaction.objects.filter(
            wallet=wallet, is_active=True
        ).order_by('-created_at')[:5]
        for t in txns:
            recent_transactions.append({
                'id': t.id,
                'type': t.get_transaction_type_display(),
                'amount': str(t.amount),
                'reference': t.get_reference_type_display(),
                'description': t.description,
                'date': t.created_at.strftime('%Y-%m-%d %H:%M'),
            })

    recent_orders = Order.objects.filter(
        user=user, is_active=True
    ).order_by('-created_at')[:5]
    orders_data = []
    for o in recent_orders:
        orders_data.append({
            'id': o.id,
            'order_number': o.order_number,
            'status': o.get_status_display(),
            'status_code': o.status,
            'net_amount': str(o.net_amount),
            'payment_mode': o.get_payment_mode_display(),
            'date': o.created_at.strftime('%Y-%m-%d %H:%M'),
        })

    active_subs = MealPackageSubscription.objects.filter(
        user=user, is_active=True, status=0,
        start_date__lte=today, end_date__gte=today,
    ).select_related('package')
    subs_data = []
    for s in active_subs:
        used = MealPackageUsage.objects.filter(
            subscription=s, is_active=True
        ).aggregate(total=Sum('quantity'))['total'] or 0
        subs_data.append({
            'id': s.id,
            'package_name': s.package.name,
            'meal_type': s.package.get_meal_type_display(),
            'start_date': str(s.start_date),
            'end_date': str(s.end_date),
            'total_used': used,
        })

    return {
        'wallet_id': wallet_id,
        'wallet_balance': wallet_balance,
        'recent_transactions': recent_transactions,
        'recent_orders': orders_data,
        'active_subscriptions': subs_data,
    }
