import logging
from datetime import datetime, date as date_type
from decimal import Decimal

from django.db.models import F
from rest_framework import exceptions

from apps.finance.models.recoverable_asset import (
    RecoverableAsset, RecoverableAssetTransaction, RecoverableAssetHistory
)
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.institutes.models import FinancialYear

logger = logging.getLogger(__name__)


def parse_transaction_date(date_value):
    if isinstance(date_value, str):
        if 'T' in date_value:
            date_value = date_value.split('T')[0]
        return datetime.strptime(date_value, '%Y-%m-%d').date()
    return date_value


def check_fy_locked_for_date(transaction_date):
    from apps.finance.views import check_sequential_fy_guard
    parsed = parse_transaction_date(transaction_date)
    if not parsed:
        return
    fy = FinancialYear.objects.filter(
        start_date__lte=parsed,
        end_date__gte=parsed
    ).first()
    if fy:
        check_sequential_fy_guard(fy.id)


def check_asset_bs_locked(asset):
    from apps.finance.views import check_sequential_fy_guard
    if asset.category and asset.category.financial_year_id:
        check_sequential_fy_guard(asset.category.financial_year_id)


def sync_bank_to_recoverable_asset(bank_id, amount, is_incoming, transaction_date,
                                    source_reference, remarks, user):
    from apps.finance.serializers import recalculate_asset_closing_balance

    if not bank_id or not amount or float(amount) <= 0:
        return

    if isinstance(transaction_date, str):
        transaction_date = parse_transaction_date(transaction_date)
    if not transaction_date:
        transaction_date = date_type.today()

    linked_assets = RecoverableAsset.objects.filter(
        linked_module='BANK_ACCOUNT',
        bank_id=bank_id,
        is_active=True,
        status__in=['APPROVED', 'CLOSED']
    )

    ra_txn_type = 'CREDIT' if is_incoming else 'DEBIT'

    for asset in linked_assets:
        try:
            ra_txn = RecoverableAssetTransaction.objects.create(
                recoverable_asset=asset,
                transaction_date=transaction_date,
                transaction_type=ra_txn_type,
                amount=Decimal(str(amount)),
                source_type='BANK_TRANSFER',
                source_reference=source_reference,
                remarks=remarks or '',
                created_by=user,
            )

            RecoverableAssetHistory.objects.create(
                recoverable_asset=asset,
                recoverable_asset_transaction=ra_txn,
                action='CREATE',
                new_data={
                    'transaction_type': ra_txn_type,
                    'amount': str(amount),
                    'source_type': 'BANK_TRANSFER',
                    'source_reference': source_reference,
                },
                performed_by=user,
            )

            recalculate_asset_closing_balance(asset)
            logger.info(
                f"Auto-synced bank {bank_id} → RA {asset.id} ({asset.name}): "
                f"{ra_txn_type} {amount}"
            )
        except Exception as e:
            logger.error(
                f"Error syncing bank {bank_id} to RA {asset.id}: {e}",
                exc_info=True
            )


def resolve_category_for_create(request_data):
    from apps.finance.views import get_active_financial_year, check_sequential_fy_guard

    category_id = request_data.get('category')
    if not category_id:
        return request_data

    try:
        cat = RecoverableAssetCategory.objects.get(id=category_id)
    except RecoverableAssetCategory.DoesNotExist:
        return request_data

    if not cat.financial_year_id:
        return request_data

    target_fy = FinancialYear.objects.get(id=cat.financial_year_id)
    if not target_fy.is_locked:
        check_sequential_fy_guard(cat.financial_year_id)
        return request_data

    active_fy = get_active_financial_year()
    if active_fy is None:
        raise exceptions.ValidationError(
            "All financial years are locked. No modifications allowed."
        )

    next_cat = RecoverableAssetCategory.objects.filter(
        name=cat.name,
        financial_year=active_fy,
        is_active=True
    ).first()

    if not next_cat:
        next_cat = RecoverableAssetCategory.objects.create(
            name=cat.name,
            code=cat.code,
            balance_sheet_classification=cat.balance_sheet_classification,
            financial_year=active_fy,
            financial_category=cat.financial_category,
            is_active=True,
        )

    if hasattr(request_data, '_mutable'):
        request_data._mutable = True
        request_data['category'] = next_cat.id
        request_data._mutable = False
    else:
        request_data['category'] = next_cat.id

    return request_data


def auto_recalculate_pending_fees(financial_year_id, user):
    try:
        has_auto = RecoverableAsset.objects.filter(
            linked_module='SUNDRY_DEBTORS',
            pending_fees_config__isnull=False,
            is_active=True,
            category__financial_year_id=financial_year_id,
        ).exists()
        if has_auto:
            from apps.finance.services.pending_fees_calculator import execute_pending_fees_calculation
            execute_pending_fees_calculation(financial_year_id, user=user)
    except Exception as e:
        logger.warning(f'Auto-recalculate pending fees failed for FY {financial_year_id}: {e}')





def soft_delete_asset_cascade(asset):
    RecoverableAssetTransaction.objects.filter(
        recoverable_asset=asset, is_active=True
    ).update(is_active=False)


def log_transaction_delete(asset, transaction, user):
    from apps.shared.services import SharedService
    RecoverableAssetHistory.objects.create(
        recoverable_asset=asset,
        recoverable_asset_transaction=transaction,
        action='DELETE',
        previous_data=SharedService._model_to_dict(transaction),
        performed_by=user
    )


def recalculate_after_transaction_change(asset):
    from apps.finance.serializers import recalculate_asset_closing_balance
    recalculate_asset_closing_balance(asset)


def get_bank_transactions_for_list(request, queryset_assets):
    from apps.finance.models.bankTransaction import BankTransaction

    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    formatted_bank_txns = []

    for asset in queryset_assets:
        if not asset.bank:
            continue
        bank_txns_qs = BankTransaction.objects.filter(bank=asset.bank, is_active=True)
        if start_date:
            bank_txns_qs = bank_txns_qs.filter(date__gte=start_date)
        if end_date:
            bank_txns_qs = bank_txns_qs.filter(date__lte=end_date)

        for bt in bank_txns_qs:
            t_type = 'CREDIT' if bt.is_deposit else 'DEBIT'
            staff_name = 'System'
            if bt.staff:
                staff_name = (
                    f"{bt.staff.first_name or ''} {bt.staff.last_name or ''}".strip()
                    or getattr(bt.staff.user, 'username', 'System')
                )

            formatted_bank_txns.append({
                'id': f'bank_{bt.id}',
                'recoverable_asset': asset.id,
                'recoverable_asset_name': asset.name,
                'transaction_date': bt.date.strftime('%Y-%m-%d') if bt.date else None,
                'transaction_type': t_type,
                'amount': float(bt.amount) if bt.amount else 0.0,
                'credit_amount': float(bt.amount) if bt.is_deposit else None,
                'debit_amount': float(bt.amount) if not bt.is_deposit else None,
                'remarks': bt.particulars or (
                    f'Bank {"Deposit" if bt.is_deposit else "Withdrawal"} (Ref: {bt.ref_number})'
                    if bt.ref_number
                    else f'Bank {"Deposit" if bt.is_deposit else "Withdrawal"}'
                ),
                'is_active': bt.is_active,
                'created_by': None,
                'created_by_name': staff_name,
                'created_at': bt.created.isoformat() if bt.created else None,
                'is_bank_transaction': True
            })

    return formatted_bank_txns


def merge_bank_txns_into_response(request, response, queryset):
    asset_id = request.GET.get('recoverable_asset')
    category_id = request.GET.get('category')

    if not (asset_id or category_id):
        return response
    if not isinstance(response, dict) or 'data' not in response:
        return response

    try:
        if asset_id:
            assets = RecoverableAsset.objects.filter(id=asset_id, linked_module='BANK_ACCOUNT')
        else:
            assets = RecoverableAsset.objects.filter(category_id=category_id, linked_module='BANK_ACCOUNT')

        if not assets.exists():
            return response

        formatted_bank_txns = get_bank_transactions_for_list(request, assets)

        if formatted_bank_txns:
            from rest_framework import serializers as drf_serializers
            from apps.finance.serializers import RecoverableAssetTransactionReadSerializer
            formatted_manual_txns = RecoverableAssetTransactionReadSerializer(
                list(queryset), many=True
            ).data
            all_txns = list(formatted_manual_txns) + formatted_bank_txns
            all_txns.sort(
                key=lambda x: (x.get('transaction_date') or '', x.get('created_at') or ''),
                reverse=True
            )

            limit = int(request.GET.get('limit', 10))
            pageno = int(request.GET.get('pageno', 1))
            start_idx = (pageno - 1) * limit
            end_idx = start_idx + limit

            response['data'] = {
                'data_list': all_txns[start_idx:end_idx],
                'count': len(all_txns),
                'limit': limit,
                'pageno': pageno
            }
    except Exception as e:
        logger.error(f"Error mixing bank transactions: {e}")

    return response



def validate_category_create(data):
    from apps.finance.views import check_sequential_fy_guard

    financial_year_id = data.get('financial_year')
    if not financial_year_id:
        raise exceptions.ValidationError(
            'Financial year is required. Please select a financial year.'
        )

    check_sequential_fy_guard(financial_year_id)

    display_order = data.get('display_order')
    existing_orders = set(
        RecoverableAssetCategory.objects.filter(is_active=True)
        .values_list('display_order', flat=True)
    )
    max_order = max(existing_orders) if existing_orders else 0

    if not display_order or int(display_order) == 0:
        data['display_order'] = max_order + 1
    else:
        order_val = int(display_order)
        if order_val in existing_orders:
            RecoverableAssetCategory.objects.filter(
                is_active=True, display_order__gte=order_val
            ).update(display_order=F('display_order') + 1)

    return data


def validate_category_update(instance, new_fy_id):
    from apps.finance.views import check_sequential_fy_guard
    if instance.financial_year_id:
        check_sequential_fy_guard(instance.financial_year_id)
    if new_fy_id and str(new_fy_id) != str(instance.financial_year_id):
        check_sequential_fy_guard(new_fy_id)


def cascade_delete_category(category, confirm=False):
    
    child_assets = RecoverableAsset.objects.filter(category=category, is_active=True)
    child_count = child_assets.count()

    if child_count > 0 and not confirm:
        return False, {
            'warning': True,
            'message': (
                f'This category has {child_count} active asset(s). '
                f'Deleting will also deactivate all assets and their transactions under it.'
            ),
            'child_count': child_count,
        }

    if child_count > 0:
        RecoverableAssetTransaction.objects.filter(
            recoverable_asset__in=child_assets, is_active=True
        ).update(is_active=False)
        child_assets.update(is_active=False)

    return True, None

def build_recoverable_dashboard(fy_id=None):
    from datetime import date
    from django.db.models import Sum, Count
    from django.db.models.functions import Coalesce

    ZERO = Decimal('0.00')

    all_assets = RecoverableAsset.objects.filter(is_active=True)
    if fy_id:
        all_assets = all_assets.filter(category__financial_year_id=fy_id)

    total_assets = all_assets.count()

    agg = all_assets.aggregate(
        total_opening=Coalesce(Sum('opening_balance'), ZERO),
        total_closing=Coalesce(Sum('closing_balance'), ZERO),
    )

    total_outstanding = agg['total_closing']
    total_disbursed = agg['total_opening']
    total_recovered = total_disbursed - total_outstanding if total_disbursed > total_outstanding else ZERO

    total_fixed_asset = ZERO
    total_liabilities = ZERO
    if fy_id:
        try:
            from apps.finance.services.balance_sheet_builder import _build_recoverable_group
            fy_obj = FinancialYear.objects.get(id=fy_id)
            from_date = fy_obj.start_date
            to_date = fy_obj.end_date

            fa_group = _build_recoverable_group(
                'Fixed Assets', 'RA_FA', from_date, to_date,
                financial_year_id=fy_id,
                balance_sheet_classification='FIXED_ASSET'
            )
            total_fixed_asset = fa_group.get('total', ZERO)

            liab_group = _build_recoverable_group(
                'Liabilities', 'RA_LIAB', from_date, to_date,
                financial_year_id=fy_id,
                balance_sheet_classification='LIABILITY'
            )
            total_liabilities = liab_group.get('total', ZERO)
        except FinancialYear.DoesNotExist:
            pass
        except Exception as e:
            logger.error(f'Error computing RA totals for dashboard: {e}', exc_info=True)

    active_count = all_assets.filter(status='ACTIVE').count()
    closed_count = all_assets.filter(status='CLOSED').count()
    overdue_count = 0

    summary = {
        'total_assets': total_assets,
        'active_assets': active_count,
        'closed_assets': closed_count,
        'overdue_assets': overdue_count,
        'total_disbursed': str(total_disbursed),
        'total_outstanding': str(total_outstanding),
        'total_recovered': str(total_recovered),
        'total_fixed_asset': str(total_fixed_asset),
        'total_liabilities': str(total_liabilities),
    }

    category_qs = all_assets.values(
        'category__name', 'category__code', 'category__balance_sheet_classification'
    ).annotate(
        count=Count('id'),
        total_outstanding=Coalesce(Sum('closing_balance'), ZERO),
        total_opening=Coalesce(Sum('opening_balance'), ZERO),
    ).order_by('-total_outstanding')

    categories = []
    for row in category_qs:
        categories.append({
            'category': row['category__name'] or 'Uncategorized',
            'code': row['category__code'] or '',
            'classification': row['category__balance_sheet_classification'] or 'LIABILITY',
            'count': row['count'],
            'total_outstanding': str(row['total_outstanding']),
            'total_opening': str(row['total_opening']),
        })

    type_qs = all_assets.values('asset_type').annotate(
        count=Count('id'),
        outstanding=Coalesce(Sum('closing_balance'), ZERO),
    ).order_by('-outstanding')

    type_breakdown = []
    type_labels = dict(RecoverableAsset.ASSET_TYPE_CHOICES) if hasattr(RecoverableAsset, 'ASSET_TYPE_CHOICES') else {}
    for row in type_qs:
        type_breakdown.append({
            'asset_type': row['asset_type'],
            'label': type_labels.get(row['asset_type'], row['asset_type']),
            'count': row['count'],
            'outstanding': str(row['outstanding']),
        })

    recent_txns = RecoverableAssetTransaction.objects.select_related(
        'recoverable_asset'
    )
    if fy_id:
        recent_txns = recent_txns.filter(recoverable_asset__category__financial_year_id=fy_id)
    recent_txns = recent_txns.order_by('-transaction_date', '-created_at')[:10]

    recent = []
    for txn in recent_txns:
        recent.append({
            'id': txn.id,
            'asset_name': txn.recoverable_asset.name if txn.recoverable_asset else '',
            'transaction_type': txn.transaction_type,
            'amount': str(txn.amount or ZERO),
            'transaction_date': str(txn.transaction_date) if txn.transaction_date else '',
            'source_type': txn.source_type if hasattr(txn, 'source_type') else '',
            'remarks': txn.remarks or '',
        })

    top_outstanding = all_assets.filter(
        status='ACTIVE', closing_balance__gt=0
    ).order_by('-closing_balance')[:10]

    top_items = []
    for asset in top_outstanding:
        name = asset.name or ''
        if asset.counterparty_name:
            name = asset.counterparty_name
        if asset.linked_module == 'STAFF_SALARY_ADVANCE' and asset.salary_advance:
            name = asset.salary_advance.get_particulars()

        top_items.append({
            'id': asset.id,
            'name': name,
            'asset_type': asset.asset_type,
            'outstanding': str(asset.closing_balance or ZERO),
            'opening': str(asset.opening_balance or ZERO),
            'status': asset.status,
        })

    return {
        'summary': summary,
        'categories': categories,
        'type_breakdown': type_breakdown,
        'recent_transactions': recent,
        'top_outstanding': top_items,
    }


def recoverable_dashboard_lrp(view_self):
    from apps.shared.services_shared.store_api_result import store_long_running_process

    transaction_id = view_self.request.GET.get('transaction_id')
    fy_id = view_self.request.GET.get('financial_year_id')
    try:
        data = build_recoverable_dashboard(fy_id)
        store_long_running_process(view_self, transaction_id, data)
    except Exception as e:
        logger.error(f'Error in recoverable dashboard LRP: {e}', exc_info=True)
        store_long_running_process(
            view_self, transaction_id, {'error': str(e)[:250]},
        )

