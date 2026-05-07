from decimal import Decimal
from django.db.models import Sum, Case, When, DecimalField
import logging

from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction

logger = logging.getLogger(__name__)


def get_salary_advance_queryset():
    return SalaryAdvance.objects.filter(is_active=True)


def get_total_outstanding(advance_id):
    try:
        advance = SalaryAdvance.objects.get(id=advance_id)
    except SalaryAdvance.DoesNotExist:
        return Decimal('0.00')
    
    return advance.closing_balance or advance.opening_balance or Decimal('0.00')


def get_principal_outstanding(advance_id):
    try:
        advance = SalaryAdvance.objects.get(id=advance_id)
    except SalaryAdvance.DoesNotExist:
        return Decimal('0.00')
    
    interest_penalty = advance.salary_advance_transaction_salary_advance.filter(
        is_active=True,
        transaction_type__in=['INTEREST', 'PENALTY']
    ).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    interest_penalty_recovered = advance.salary_advance_transaction_salary_advance.filter(
        is_active=True,
        transaction_type__in=['RECOVERY', 'ADJUSTMENT'],
        metadata__has_key='interest'
    ).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0.00')
    
    outstanding = get_total_outstanding(advance_id)
    net_interest = interest_penalty - interest_penalty_recovered
    principal = outstanding - net_interest
    
    return max(principal, Decimal('0.00'))


def create_salary_advance(data, user):
    from django.db import transaction as db_transaction
    from apps.tenants.services.middlewares import get_current_db_name

    with db_transaction.atomic(using=get_current_db_name()):
        advance = SalaryAdvance.objects.create(
            name=data.get('name', ''),
            staff_id=data.get('staff'),
            financial_year_id=data.get('financial_year'),
            total_amount=data.get('total_amount', Decimal('0.00')),
            opening_balance=data.get('opening_balance', Decimal('0.00')),
            opening_balance_type=data.get('opening_balance_type', 'DEBIT'),
            closing_balance=data.get('opening_balance', Decimal('0.00')),
            monthly_recovery_amount=data.get('monthly_recovery_amount', Decimal('0.00')),
            start_month=data.get('start_month'),
            tenure_months=data.get('tenure_months'),
            emi_amount=data.get('emi_amount'),
            expected_end_date=data.get('expected_end_date'),
            interest_rate=data.get('interest_rate', Decimal('0.00')),
            interest_type=data.get('interest_type', 'NONE'),
            auto_deduct_from_payroll=data.get('auto_deduct_from_payroll', False),
            deduction_priority=data.get('deduction_priority', 1),
            penalty_rate=data.get('penalty_rate', Decimal('0.00')),
            status=data.get('status', 'APPROVED'),
            purpose=data.get('purpose', ''),
            remarks=data.get('remarks', ''),
            approved_on=data.get('approved_on'),
            approved_by_id=data.get('approved_by'),
            created_by=user,
        )

        return advance


def update_salary_advance(advance_id, data, user):
    from django.db import transaction as db_transaction
    from apps.tenants.services.middlewares import get_current_db_name

    with db_transaction.atomic(using=get_current_db_name()):
        advance = SalaryAdvance.objects.get(id=advance_id)

        updatable_fields = [
            'name', 'staff', 'financial_year', 'total_amount',
            'monthly_recovery_amount', 'start_month', 'tenure_months',
            'emi_amount', 'expected_end_date', 'interest_rate', 'interest_type',
            'auto_deduct_from_payroll', 'deduction_priority', 'penalty_rate',
            'status', 'purpose', 'remarks', 'approved_on', 'approved_by',
        ]

        for field in updatable_fields:
            if field in data:
                value = data[field]
                if field in ('staff', 'financial_year', 'approved_by'):
                    setattr(advance, f'{field}_id', value)
                else:
                    setattr(advance, field, value)

        advance.updated_by = user
        advance.save()

        return advance


def close_salary_advance(advance_id, reason, user):
    from django.db import transaction as db_transaction
    from apps.tenants.services.middlewares import get_current_db_name

    with db_transaction.atomic(using=get_current_db_name()):
        advance = SalaryAdvance.objects.get(id=advance_id)
        advance.status = 'CLOSED'
        advance.closure_reason = reason
        advance.updated_by = user
        advance.save()

        return advance


def get_salary_advance_detail(advance_id):
    try:
        advance = SalaryAdvance.objects.select_related(
            'staff', 'financial_year', 'approved_by', 'created_by'
        ).get(id=advance_id, is_active=True)
    except SalaryAdvance.DoesNotExist:
        return None

    return advance


def get_transaction_history(advance_id, from_date=None, to_date=None):
    qs = SalaryAdvanceTransaction.objects.filter(
        salary_advance_id=advance_id,
        is_active=True
    ).order_by('transaction_date', 'created_at')

    if from_date:
        qs = qs.filter(transaction_date__gte=from_date)
    if to_date:
        qs = qs.filter(transaction_date__lte=to_date)

    return qs


def create_transaction(advance_id, data, user):
    from django.db import transaction as db_transaction
    from apps.tenants.services.middlewares import get_current_db_name

    with db_transaction.atomic(using=get_current_db_name()):
        advance = SalaryAdvance.objects.get(id=advance_id)

        txn = SalaryAdvanceTransaction.objects.create(
            salary_advance=advance,
            transaction_date=data['transaction_date'],
            transaction_type=data['transaction_type'],
            amount=data['amount'],
            source_type=data.get('source_type', 'MANUAL'),
            source_reference=data.get('source_reference'),
            remarks=data.get('remarks', ''),
            metadata=data.get('metadata'),
            created_by=user,
        )

        advance.recalculate_closing_balance()

        outstanding = get_total_outstanding(advance_id)
        if outstanding <= Decimal('0.00') and advance.status == 'APPROVED':
            advance.status = 'CLOSED'
            advance.closure_reason = 'NORMAL_RECOVERY'
            advance.save()

        return txn


def sync_recoverable_asset_balance(salary_advance_instance):
    from apps.finance.models.recoverable_asset import RecoverableAsset
    RecoverableAsset.objects.filter(
        salary_advance=salary_advance_instance, is_active=True
    ).update(closing_balance=salary_advance_instance.closing_balance)
