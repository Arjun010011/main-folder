from decimal import Decimal
from django.db.models import Sum, DecimalField, When, Case
from apps.tenants.services.middlewares import get_current_db_name
from django.db import transaction as db_transaction

from apps.finance.models.fee import FeeType
from apps.finance.models.finance_dashboard import FinanceDashboardCache
from apps.finance.models.recoverable_asset import (
    RecoverableAsset, RecoverableAssetTransaction
)
from apps.finance.services.finance_dashboard import calculate_dashboard_cache
from apps.institutes.models.financialyear import FinancialYear


ZERO = Decimal('0.00')


def calculate_pending_fees_for_asset(asset):
    
    if not asset.pending_fees_config or 'fee_types' not in asset.pending_fees_config:
        return {"total_fees": Decimal('0'), "total_paid": Decimal('0'), "pending_amount": Decimal('0'), "fee_plan_count": 0}

    fee_type_ids = asset.pending_fees_config['fee_types']
    if not fee_type_ids:
         return {"total_fees": Decimal('0'), "total_paid": Decimal('0'), "pending_amount": Decimal('0'), "fee_plan_count": 0}

    fy_id = getattr(asset, 'financial_year_id', None)

    fee_type_names = list(FeeType.objects.filter(id__in=fee_type_ids).values_list('name', flat=True))

    cache_query = FinanceDashboardCache.objects.filter(standard__isnull=True, student__isnull=True, is_active=True)
    
    if fy_id:
        cache_query = cache_query.filter(academic_year_id=fy_id)

    total_pending = Decimal('0')
    total_paid = Decimal('0')
    total_expected = Decimal('0')

    for cache in cache_query:
        if not cache.monthly_collection or not cache.monthly_collection.get('fee_type_detailed'):
            continue
            
        breakdown = cache.monthly_collection['fee_type_detailed']
        
        for ft_name in fee_type_names:
            if ft_name in breakdown:
                total_pending += Decimal(str(breakdown[ft_name].get('pending_amount', 0)))
                total_paid += Decimal(str(breakdown[ft_name].get('paid_amount', 0)))
                total_expected += Decimal(str(breakdown[ft_name].get('total_amount', 0)))

    return {
        "total_fees": float(total_expected),
        "total_paid": float(total_paid),
        "pending_amount": float(total_pending),
        "fee_plan_count": len(fee_type_ids)
    }


def preview_pending_fees(financial_year_id):

    assets = RecoverableAsset.objects.filter(
        is_active=True,
        linked_module='SUNDRY_DEBTORS',
        pending_fees_config__isnull=False,
        category__financial_year_id=financial_year_id,
    ).select_related('category')

    results = []
    for asset in assets:
        calc = calculate_pending_fees_for_asset(asset)
        results.append({
            'asset_id': asset.id,
            'asset_name': asset.name,
            'category_name': asset.category.name if asset.category else '',
            'current_opening_balance': float(asset.opening_balance),
            'current_closing_balance': float(asset.closing_balance),
            **calc,
        })

    return results


def execute_pending_fees_calculation(financial_year_id, user=None):

    assets = RecoverableAsset.objects.filter(
        is_active=True,
        linked_module='SUNDRY_DEBTORS',
        pending_fees_config__isnull=False,
        category__financial_year_id=financial_year_id,
    ).select_related('category', 'category__financial_year')

    results = []

    with db_transaction.atomic(using=get_current_db_name()):
        for asset in assets:
            calc = calculate_pending_fees_for_asset(asset)
            pending = Decimal(str(calc['pending_amount']))

            existing_txn = RecoverableAssetTransaction.objects.filter(
                recoverable_asset=asset,
                is_active=True,
                transaction_type='DEBIT',
                remarks__startswith='[AUTO]',
            ).first()

            action = 'unchanged'
            if pending > 0:
                new_remarks = (
                    f'[AUTO] Pending fees: ₹{pending} '
                    f'(total: ₹{calc["total_fees"]}, paid: ₹{calc["total_paid"]})'
                )
                if existing_txn:
                    if existing_txn.amount != pending or existing_txn.remarks != new_remarks:
                        existing_txn.amount = pending
                        existing_txn.remarks = new_remarks
                        existing_txn.save()
                        action = 'updated'
                else:
                    fy_start = (
                        asset.category.financial_year.start_date
                        if asset.category and asset.category.financial_year
                        else None
                    )
                    RecoverableAssetTransaction.objects.create(
                        recoverable_asset=asset,
                        transaction_type='DEBIT',
                        amount=pending,
                        transaction_date=fy_start,
                        source_type='MANUAL',
                        remarks=new_remarks,
                        created_by=user if user else getattr(asset, 'created_by', None),
                    )
                    action = 'updated'
            elif existing_txn:
                existing_txn.is_active = False
                existing_txn.save(update_fields=['is_active'])
                action = 'updated'

            _recalculate_closing_balance(asset)

            results.append({
                'asset_id': asset.id,
                'asset_name': asset.name,
                'status': action,
                'pending_amount': float(pending),
                'total_fees': calc['total_fees'],
                'total_paid': calc['total_paid'],
            })

    return results


def sync_all_pending_fees_for_fy(financial_year_id, user=None):
    
    
    try:
        fy = FinancialYear.objects.get(id=financial_year_id)
        calculate_dashboard_cache(fy.id, force_recalculate=True)
    except FinancialYear.DoesNotExist:
        pass
    except Exception:
        pass

    results = execute_pending_fees_calculation(financial_year_id, user=user)
    return {
        'synced_assets': results,
        'total_synced': len([r for r in results if r['status'] != 'unchanged']),
        'total_assets': len(results),
    }


def _recalculate_closing_balance(asset):

    txns = RecoverableAssetTransaction.objects.filter(
        recoverable_asset=asset, is_active=True
    ).aggregate(
        debits=Sum(Case(
            When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
            default=ZERO, output_field=DecimalField()
        )),
        credits=Sum(Case(
            When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
            default=ZERO, output_field=DecimalField()
        ))
    )

    additions = txns['debits'] or ZERO
    deductions = txns['credits'] or ZERO
    opening = asset.opening_balance or ZERO
    ob_type = getattr(asset, 'opening_balance_type', 'DEBIT') or 'DEBIT'

    if ob_type == 'CREDIT':
        closing = opening + deductions - additions
    else:
        closing = opening + additions - deductions

    asset.closing_balance = closing
    asset.save(update_fields=['closing_balance'])

