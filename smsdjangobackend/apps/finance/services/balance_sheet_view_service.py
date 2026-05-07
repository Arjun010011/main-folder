import logging

from django.db.models import Q
from django.utils import timezone
from rest_framework import exceptions


from apps.finance.models.balance_sheet_lock_history import BalanceSheetLockHistory
from apps.finance.models.bankTransaction import BankDetail, BankTransaction
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.finance.models.recoverable_asset import RecoverableAsset
from apps.institutes.models.financialyear import FinancialYear

logger = logging.getLogger(__name__)

def lock_balance_sheet(financial_year_id, user, remarks=''):
    from apps.asset.services.depreciation import check_fy_locked as check_asset_fy_locked

    errors = []

    if not check_asset_fy_locked(financial_year_id):
        errors.append('Asset depreciation is not locked for this FY. Please lock depreciation first.')

    try:
        fy = FinancialYear.objects.get(id=financial_year_id)
        banks_without_closing = BankDetail.objects.filter(
            is_active=True, financial_year_id=financial_year_id
        )
        if banks_without_closing.exists():
            banks_no_closing = banks_without_closing.filter(closing_balance=0)
            for bank in banks_no_closing:
                has_txns = BankTransaction.objects.filter(
                    bank=bank, is_active=True,
                    date__gte=fy.start_date, date__lte=fy.end_date
                ).exists()
                has_deposits = DepositWithdrawRecord.objects.filter(
                    is_active=True, date__gte=fy.start_date, date__lte=fy.end_date
                ).filter(
                    Q(bank_from=bank) | Q(bank_to=bank)
                ).exists()
                if not has_txns and not has_deposits and bank.opening_balance == 0:
                    continue
                if bank.closing_balance == 0 and (has_txns or has_deposits or bank.opening_balance > 0):
                    errors.append(f'Bank "{bank.bank_name}" has no closing balance. Run bank carry-forward first.')
                    break
    except FinancialYear.DoesNotExist:
        errors.append('Financial year not found.')

    if errors:
        return {
            'error': 'Cannot lock balance sheet. Please resolve the following:',
            'details': errors,
            '_status': 400,
        }

    try:
        fy_check = FinancialYear.objects.get(id=financial_year_id)
        if fy_check.is_locked:
            return {'error': 'Balance sheet is already locked for this FY', '_status': 400}
    except FinancialYear.DoesNotExist:
        return {'error': 'Financial year not found', '_status': 404}

    BalanceSheetLockHistory.objects.create(
        financial_year_id=financial_year_id,
        action='LOCKED',
        performed_by=user,
        entry_count=0,
        remarks=remarks,
    )

    FinancialYear.objects.filter(id=financial_year_id).update(
        is_locked=True, locked_at=timezone.now()
    )

    carry_forward_result = None
    carry_forward_error = None
    try:
        from apps.finance.services.fy_carry_forward import (
            get_next_financial_year, execute_carry_forward
        )
        source_fy_obj = FinancialYear.objects.get(id=financial_year_id)
        target_fy = get_next_financial_year(source_fy_obj)
        if target_fy:
            carry_forward_result = execute_carry_forward(
                financial_year_id, target_fy.id, user=user
            )
        else:
            carry_forward_error = 'No next financial year found. Please create it and run carry-forward manually.'
    except Exception as e:
        logger.error(
            f'Carry-forward failed after locking FY {financial_year_id}: {e}',
            exc_info=True
        )
        carry_forward_error = f'Carry-forward failed: {str(e)}'

    return {
        'success': True,
        'message': 'Balance sheet locked. Financial year is now locked.',
        'is_locked': True,
        'carry_forward': carry_forward_result,
        'carry_forward_error': carry_forward_error,
    }


def unlock_balance_sheet(financial_year_id, user, remarks=''):
    try:
        fy_check = FinancialYear.objects.get(id=financial_year_id)
        if not fy_check.is_locked:
            return {'error': 'Balance sheet is not locked for this FY', '_status': 400}
    except FinancialYear.DoesNotExist:
        return {'error': 'Financial year not found', '_status': 404}

    if not remarks:
        return {'error': 'Remarks are required when unlocking', '_status': 400}

    BalanceSheetLockHistory.objects.create(
        financial_year_id=financial_year_id,
        action='UNLOCKED',
        performed_by=user,
        entry_count=0,
        remarks=remarks,
    )

    FinancialYear.objects.filter(id=financial_year_id).update(
        is_locked=False, locked_at=None
    )

    next_fy = FinancialYear.objects.filter(
        start_date__gt=fy_check.end_date, is_active=True
    ).order_by('start_date').first()
    needs_re_carry_forward = False
    if next_fy:
        needs_re_carry_forward = RecoverableAsset.objects.filter(
            is_active=True,
            category__financial_year=next_fy,
        ).exists()

    return {
        'success': True,
        'message': f'Balance sheet unlocked. Financial year is now unlocked.',
        'is_locked': False,
        'needs_re_carry_forward': needs_re_carry_forward,
    }

def get_lock_status(financial_year_id):
    from apps.asset.services.depreciation import check_fy_locked as check_asset_fy_locked
    depreciation_locked = check_asset_fy_locked(financial_year_id)

    try:
        fy = FinancialYear.objects.get(id=financial_year_id)
        is_locked = fy.is_locked
    except FinancialYear.DoesNotExist:
        is_locked = False

    ra_count = RecoverableAsset.objects.filter(
        is_active=True,
        category__financial_year_id=financial_year_id,
    ).count()

    return {
        'success': True,
        'is_locked': is_locked,
        'depreciation_locked': depreciation_locked,
        'entry_count': ra_count,
    }

def enrich_balance_sheet_response(result, financial_year_id):
    try:
        fy_obj = FinancialYear.objects.get(id=financial_year_id)
        result['is_locked'] = fy_obj.is_locked
    except FinancialYear.DoesNotExist:
        result['is_locked'] = False

    try:
        current_fy = FinancialYear.objects.get(id=financial_year_id)
        previous_fy = FinancialYear.objects.filter(
            end_date__lt=current_fy.start_date, is_active=True
        ).order_by('-end_date').first()
        if previous_fy:
            result['previous_fy_locked'] = previous_fy.is_locked
            result['previous_fy_name'] = f"{previous_fy.start_date.year}-{previous_fy.end_date.year}"
        else:
            result['previous_fy_locked'] = True
            result['previous_fy_name'] = None
    except FinancialYear.DoesNotExist:
        result['previous_fy_locked'] = True
        result['previous_fy_name'] = None

    return result

def check_bs_entry_fy_locked(financial_year_id):
    from apps.finance.views import check_sequential_fy_guard
    if financial_year_id:
        check_sequential_fy_guard(financial_year_id)
        try:
            fy = FinancialYear.objects.get(id=financial_year_id)
            if fy.is_locked:
                raise exceptions.ValidationError(
                    "Cannot modify entries – balance sheet is locked for this financial year."
                )
        except FinancialYear.DoesNotExist:
            pass
