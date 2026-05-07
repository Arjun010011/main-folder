from decimal import Decimal
from datetime import date
from django.db.models import Sum
import logging

from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction
from apps.finance.services.salary_advance import (
    get_salary_advance_queryset, get_total_outstanding, get_principal_outstanding
)
from apps.tenants.services.middlewares import get_current_db_name

logger = logging.getLogger(__name__)


def calculate_monthly_interest(advance):
    if advance.interest_type == 'NONE' or advance.interest_rate <= 0:
        return Decimal('0.00')
    
    principal = get_principal_outstanding(advance.id)
    if principal <= Decimal('0.00'):
        return Decimal('0.00')
    
    annual_rate = advance.interest_rate / Decimal('100')
    
    if advance.interest_type == 'SIMPLE':
        monthly_interest = (principal * annual_rate / 12).quantize(Decimal('0.01'))
    elif advance.interest_type == 'COMPOUND':
        monthly_interest = (principal * annual_rate / 12).quantize(Decimal('0.01'))
    else:
        monthly_interest = Decimal('0.00')
    
    return monthly_interest


def apply_interest_charge(advance, user, charge_month=None):
    from django.db import transaction as db_transaction

    if advance.interest_type == 'NONE' or advance.interest_rate <= 0:
        return None
    
    if charge_month is None:
        charge_month = date.today().replace(day=1)
    
    existing = SalaryAdvanceTransaction.objects.filter(
        salary_advance=advance,
        transaction_type='INTEREST',
        transaction_date__year=charge_month.year,
        transaction_date__month=charge_month.month,
        is_active=True
    ).exists()
    
    if existing:
        return None
    
    interest = calculate_monthly_interest(advance)
    if interest <= Decimal('0.00'):
        return None
    
    with db_transaction.atomic(using=get_current_db_name()):
        txn = SalaryAdvanceTransaction.objects.create(
            salary_advance=advance,
            transaction_date=charge_month,
            transaction_type='INTEREST',
            amount=interest,
            source_type='INTEREST_CALC',
            remarks=f'Interest charge for {charge_month.strftime("%B %Y")} @ {advance.interest_rate}% p.a.',
            metadata={
                'rate': str(advance.interest_rate),
                'type': advance.interest_type,
                'principal_outstanding': str(get_principal_outstanding(advance.id)),
            },
            created_by=user
        )
        advance.recalculate_closing_balance()
    
    return txn


def is_overdue(advance):
    if advance.status in ('CLOSED', 'CANCELLED'):
        return False
    
    outstanding = get_total_outstanding(advance.id)
    if outstanding <= Decimal('0.00'):
        return False
    
    if advance.expected_end_date and date.today() > advance.expected_end_date:
        return True
    
    if advance.start_month and advance.start_month <= date.today():
        months_passed = (date.today().year - advance.start_month.year) * 12 + \
                       (date.today().month - advance.start_month.month) + 1
        
        monthly_amount = advance.emi_amount or advance.monthly_recovery_amount
        if not monthly_amount or monthly_amount <= 0:
            return False
            
        expected = min(months_passed * monthly_amount, advance.total_amount)
        
        actual = advance.salary_advance_transaction_salary_advance.filter(
            transaction_type__in=['RECOVERY', 'ADJUSTMENT'],
            is_active=True
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        if actual < expected:
            return True
    
    return False


def apply_penalty_charge(advance, user, charge_month=None):
    from django.db import transaction as db_transaction

    if advance.penalty_rate <= 0:
        return None
    
    if not is_overdue(advance):
        return None
    
    if charge_month is None:
        charge_month = date.today().replace(day=1)
    
    existing = SalaryAdvanceTransaction.objects.filter(
        salary_advance=advance,
        transaction_type='PENALTY',
        transaction_date__year=charge_month.year,
        transaction_date__month=charge_month.month,
        is_active=True
    ).exists()
    
    if existing:
        return None
    
    outstanding = get_total_outstanding(advance.id)
    penalty = (outstanding * advance.penalty_rate / Decimal('100')).quantize(Decimal('0.01'))
    
    if penalty <= Decimal('0.00'):
        return None
    
    with db_transaction.atomic(using=get_current_db_name()):
        txn = SalaryAdvanceTransaction.objects.create(
            salary_advance=advance,
            transaction_date=charge_month,
            transaction_type='PENALTY',
            amount=penalty,
            source_type='PENALTY_CALC',
            remarks=f'Late payment penalty for {charge_month.strftime("%B %Y")} @ {advance.penalty_rate}%',
            metadata={
                'rate': str(advance.penalty_rate),
                'outstanding': str(outstanding),
            },
            created_by=user
        )
        advance.recalculate_closing_balance()
    
    return txn


def waive_charge(txn_id, user, reason):
    from django.db import transaction as db_transaction

    txn = SalaryAdvanceTransaction.objects.get(id=txn_id)
    
    if txn.transaction_type not in ('INTEREST', 'PENALTY'):
        raise ValueError("Can only waive interest or penalty charges")
    
    with db_transaction.atomic(using=get_current_db_name()):
        waiver = SalaryAdvanceTransaction.objects.create(
            salary_advance=txn.salary_advance,
            transaction_date=date.today(),
            transaction_type='ADJUSTMENT',
            amount=txn.amount,
            source_type='ADJUSTMENT',
            adjustment_reason='WAIVER',
            source_reference=f'Waiver of {txn.transaction_type} txn #{txn.id}',
            remarks=f'Waiver: {reason}',
            created_by=user
        )
        txn.salary_advance.recalculate_closing_balance()
    
    return waiver
