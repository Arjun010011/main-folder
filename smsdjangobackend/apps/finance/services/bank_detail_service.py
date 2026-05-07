"""
Service layer for Bank Detail and Deposit/Withdraw business logic.
Extracted from views.py to keep ViewSets as thin CRUD wrappers.
"""
import logging
from datetime import date as date_type

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from rest_framework import exceptions

from apps.finance.models.bankTransaction import BankDetail, BankTransaction
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.institutes.models.financialyear import FinancialYear


logger = logging.getLogger(__name__)


# ━━━━━━━━━━━━━━━ BANK BALANCE CALCULATION ━━━━━━━━━━━━━━━

def compute_bank_balance(bank_id, opening_balance, fy):
    """Compute current balance for a bank within a financial year.
    Returns (credit, debit, current_balance).
    """
    credit = 0
    debit = 0

    # Sum DepositWithdrawRecord transfers within FY
    deposits = DepositWithdrawRecord.objects.filter(
        is_active=True, date__gte=fy.start_date, date__lte=fy.end_date,
    ).filter(
        Q(bank_from_id=bank_id) | Q(bank_to_id=bank_id)
    ).values('bank_from_id', 'bank_to_id', 'amount')

    for d in deposits:
        if d['amount'] is None:
            continue
        if d['bank_to_id'] == bank_id:
            credit += float(d['amount'])
        if d['bank_from_id'] == bank_id:
            debit += float(d['amount'])

    # Sum BankTransaction deposits/withdrawals within FY
    bank_txns = BankTransaction.objects.filter(
        bank_id=bank_id, is_active=True,
        date__gte=fy.start_date, date__lte=fy.end_date
    )
    for txn in bank_txns:
        if txn.amount is None:
            continue
        if txn.is_deposit:
            credit += float(txn.amount)
        else:
            debit += float(txn.amount)

    current_balance = float(opening_balance) + credit - debit
    return credit, debit, current_balance


def resolve_financial_year(financial_year_id, fallback_view=None):
    """Resolve a FinancialYear object from an ID or fallback to current date."""
    from datetime import datetime

    if financial_year_id:
        try:
            return FinancialYear.objects.get(id=financial_year_id)
        except FinancialYear.DoesNotExist:
            return None

    if fallback_view:
        fy_data = FinancialYear.get_financial_year_for_date(fallback_view, datetime.today())
        if fy_data:
            try:
                return FinancialYear.objects.get(id=fy_data['id'])
            except FinancialYear.DoesNotExist:
                pass
    return None


# ━━━━━━━━━━━━━━━ BANK DETAIL LIST ━━━━━━━━━━━━━━━

def enrich_bank_list_with_balances(response, fy):
    """Enrich bank list response data with computed current_balance for each bank."""
    bank_list = response.get('data', [])
    if isinstance(bank_list, dict):
        bank_list = bank_list.get('data_list', bank_list.get('data', []))

    if fy:
        for bank_data in bank_list:
            bank_id = bank_data.get('id')
            if not bank_id:
                continue
            opening = float(bank_data.get('opening_balance', 0))
            _, _, current_balance = compute_bank_balance(bank_id, opening, fy)
            bank_data['current_balance'] = current_balance

    today = date_type.today()
    is_current_fy = fy and (fy.start_date <= today <= fy.end_date)
    response['is_current_fy'] = is_current_fy

    return response


# ━━━━━━━━━━━━━━━ BANK CARRY FORWARD ━━━━━━━━━━━━━━━

def enrich_carry_forward_list(response, fy):
    """Enrich bank carry-forward list with credit/debit/closing_balance per bank."""
    for bank_data in response['data']['data_list']:
        bank_id = bank_data['id']
        opening = float(bank_data.get('opening_balance', 0))
        credit, debit, closing = compute_bank_balance(bank_id, opening, fy)

        bank_data['bank_id'] = bank_id
        bank_data['credit'] = credit
        bank_data['debit'] = debit
        bank_data['closing_balance'] = closing

    return response


def process_carry_forward(source_fy_id, target_fy_id, banks_data, view):
    """Process bank balance carry forward from source to target FY."""
    from apps.shared.services import SharedService

    if not source_fy_id or not target_fy_id:
        raise exceptions.ValidationError('source and target FY IDs required')

    try:
        target_fy = FinancialYear.objects.get(id=target_fy_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.ValidationError('Financial year not found')

    new_banks = []
    for bd in banks_data:
        try:
            source_bank = BankDetail.objects.get(id=bd['bank_id'], is_active=True)
        except BankDetail.DoesNotExist:
            continue

        source_bank.closing_balance = float(bd.get('closing_balance', 0))
        source_bank.save()

        new_banks.append({
            'bank_name': source_bank.bank_name,
            'bank_id': source_bank.bank_id,
            'branch_name': source_bank.branch_name,
            'account_num': source_bank.account_num,
            'ifsc': source_bank.ifsc,
            'financial_year': target_fy.id,
            'opening_balance': float(bd.get('new_opening_balance', 0)),
            'closing_balance': 0,
        })

    if not new_banks:
        raise exceptions.ValidationError('No valid banks to carry forward')

    return SharedService.add_data(view, new_banks, isList=True)


# ━━━━━━━━━━━━━━━ DEPOSIT/WITHDRAW RETRIEVE ━━━━━━━━━━━━━━━

def resolve_deposit_record(object_id_raw, content_type_name):
    """Resolve a DepositWithdrawRecord by content_type + object_id.
    Returns the record instance or raises ValidationError.
    """
    if not object_id_raw or not content_type_name:
        raise exceptions.ValidationError('object_id and content_type are required')

    try:
        object_id = int(object_id_raw)
    except ValueError:
        raise exceptions.ValidationError('object_id must be a valid integer')

    try:
        if '.' in content_type_name:
            app_label, model = content_type_name.split('.', 1)
            content_type = ContentType.objects.get(app_label=app_label, model=model)
        else:
            content_type = ContentType.objects.get(model=content_type_name)
    except ContentType.DoesNotExist:
        raise exceptions.ValidationError(
            f'ContentType with model "{content_type_name}" not found in django_content_type table. '
            f'Please check the model name matches exactly (e.g., "feecollection" for FeeCollection model)'
        )
    except ContentType.MultipleObjectsReturned:
        raise exceptions.ValidationError(
            f'Multiple ContentTypes found for model "{content_type_name}". '
            f'Please use "app_label.model" format (e.g., "finance.feecollection")'
        )

    try:
        return DepositWithdrawRecord.objects.get(
            content_type=content_type,
            object_id=object_id,
            is_active=True
        )
    except DepositWithdrawRecord.DoesNotExist:
        raise exceptions.ValidationError(
            f'DepositWithdrawRecord not found for content_type="{content_type_name}" and object_id={object_id}'
        )
