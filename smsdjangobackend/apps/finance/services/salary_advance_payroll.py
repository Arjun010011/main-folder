from decimal import Decimal
from datetime import date
from django.db import transaction as db_transaction
from django.db.models import Sum
import logging

from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction
from apps.finance.services.salary_advance import (
    get_salary_advance_queryset, get_total_outstanding, get_principal_outstanding
)
from apps.finance.services.salary_advance_interest_penalty import (
    calculate_monthly_interest, apply_interest_charge, apply_penalty_charge,
)
from apps.tenants.services.middlewares import get_current_db_name

logger = logging.getLogger(__name__)


def get_recovery_details_for_payroll(staff_id, salary_month):
    try:
        advances = get_salary_advance_queryset().filter(
            staff_id=staff_id,
            status='APPROVED',
            start_month__lte=salary_month,
            auto_deduct_from_payroll=True
        ).order_by('deduction_priority', 'created_at')
        
        result = {
            'total_recovery': Decimal('0.00'),
            'advances': []
        }
        
        for advance in advances:
            outstanding = get_total_outstanding(advance.id)
            if outstanding <= Decimal('0.00'):
                continue
            
            interest = Decimal('0.00')
            if advance.interest_type != 'NONE' and advance.interest_rate > 0:
                interest = calculate_monthly_interest(advance)
            
            emi = advance.emi_amount or advance.monthly_recovery_amount
            
            principal_outstanding = get_principal_outstanding(advance.id)
            principal = min(max(emi - interest, Decimal('0.00')), principal_outstanding)
            total = principal + interest
            
            if total > outstanding:
                total = outstanding
                if interest > outstanding:
                    interest = outstanding
                    principal = Decimal('0.00')
                else:
                    principal = outstanding - interest
            
            result['advances'].append({
                'id': advance.id,
                'name': advance.name,
                'description': advance.purpose or f'Salary Advance #{advance.id}',
                'principal': principal,
                'interest': interest,
                'total': total,
                'outstanding_before': outstanding,
                'priority': advance.deduction_priority
            })
            result['total_recovery'] += total
        
        return result
    
    except Exception as e:
        logger.error(f"Error getting recovery details for staff {staff_id}: {e}")
        return {
            'total_recovery': Decimal('0.00'),
            'advances': [],
            'error': str(e)
        }


def create_recovery_from_payroll(staff_id, salary_month, payroll_id, user,
                                  available_amount=None, remarks=None):
    recovery_details = get_recovery_details_for_payroll(staff_id, salary_month)
    
    if recovery_details['total_recovery'] <= Decimal('0.00'):
        return {
            'total_recovered': Decimal('0.00'),
            'transactions': [],
            'advances_closed': [],
            'carry_forward': Decimal('0.00')
        }
    
    if available_amount is not None:
        remaining_budget = min(available_amount, recovery_details['total_recovery'])
    else:
        remaining_budget = recovery_details['total_recovery']
    
    transactions = []
    advances_closed = []
    total_recovered = Decimal('0.00')
    
    try:
        with db_transaction.atomic(using=get_current_db_name()):
            for adv in recovery_details['advances']:
                if remaining_budget <= Decimal('0.00'):
                    break
                
                recovery = min(adv['total'], remaining_budget)
                
                if recovery > Decimal('0.00'):
                    if recovery < adv['total'] and adv['total'] > Decimal('0.00'):
                        allocation_ratio = recovery / adv['total']
                        alloc_interest = (adv['interest'] * allocation_ratio).quantize(Decimal('0.01'))
                        alloc_principal = recovery - alloc_interest
                    else:
                        alloc_principal = adv['principal']
                        alloc_interest = adv['interest']
                    
                    metadata = {
                        'principal': str(alloc_principal),
                        'interest': str(alloc_interest),
                        'penalty': '0.00',
                        'outstanding_before': str(adv['outstanding_before']),
                        'expected_total': str(adv['total']),
                        'allocation_note': 'Interest-first allocation per standard accounting'
                    }
                    
                    txn = SalaryAdvanceTransaction.objects.create(
                        salary_advance_id=adv['id'],
                        transaction_date=salary_month,
                        transaction_type='RECOVERY',
                        amount=recovery,
                        source_type='PAYROLL',
                        source_reference=str(payroll_id) if payroll_id else None,
                        remarks=remarks or f'Payroll recovery for {salary_month.strftime("%B %Y")}',
                        metadata=metadata,
                        created_by=user
                    )
                    transactions.append(txn.id)
                    total_recovered += recovery
                    remaining_budget -= recovery
                    
                    advance = SalaryAdvance.objects.get(id=adv['id'])
                    advance.recalculate_closing_balance()
                    new_outstanding = get_total_outstanding(adv['id'])
                    if new_outstanding <= Decimal('0.00'):
                        advance.status = 'CLOSED'
                        advance.closure_reason = 'NORMAL_RECOVERY'
                        advance.save()
                        advances_closed.append(adv['id'])
        
        carry_forward = recovery_details['total_recovery'] - total_recovered
        
        return {
            'total_recovered': total_recovered,
            'transactions': transactions,
            'advances_closed': advances_closed,
            'carry_forward': max(carry_forward, Decimal('0.00'))
        }
    
    except Exception as e:
        logger.error(f"Error creating payroll recovery for staff {staff_id}: {e}")
        return {
            'total_recovered': Decimal('0.00'),
            'transactions': [],
            'advances_closed': [],
            'carry_forward': recovery_details['total_recovery'],
            'error': str(e)
        }


def check_payroll_period_processed(staff_id, salary_month):
    return SalaryAdvanceTransaction.objects.filter(
        salary_advance__staff_id=staff_id,
        salary_advance__is_active=True,
        transaction_date__year=salary_month.year,
        transaction_date__month=salary_month.month,
        source_type='PAYROLL'
    ).exists()


def get_payroll_recovery_summary(staff_id, salary_month):
    txns = SalaryAdvanceTransaction.objects.filter(
        salary_advance__staff_id=staff_id,
        salary_advance__is_active=True,
        transaction_date__year=salary_month.year,
        transaction_date__month=salary_month.month,
        source_type='PAYROLL'
    )
    
    total = txns.aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
    advance_ids = list(txns.values_list('salary_advance_id', flat=True).distinct())
    
    return {
        'total_recovered': total,
        'transaction_count': txns.count(),
        'advances_affected': advance_ids
    }


def reverse_payroll_recovery(staff_id, salary_month, user, reason):
    if not reason or not reason.strip():
        raise ValueError("Reason is required for reversal")
    
    original_txns = SalaryAdvanceTransaction.objects.filter(
        salary_advance__staff_id=staff_id,
        salary_advance__is_active=True,
        transaction_date__year=salary_month.year,
        transaction_date__month=salary_month.month,
        source_type='PAYROLL',
        transaction_type='RECOVERY'
    )
    
    if not original_txns.exists():
        return {
            'total_reversed': Decimal('0.00'),
            'transactions': []
        }
    
    reversal_txns = []
    total_reversed = Decimal('0.00')
    
    try:
        with db_transaction.atomic(using=get_current_db_name()):
            for orig in original_txns:
                reversal = SalaryAdvanceTransaction.objects.create(
                    salary_advance=orig.salary_advance,
                    transaction_date=date.today(),
                    transaction_type='REVERSAL',
                    amount=orig.amount,
                    source_type='ADJUSTMENT',
                    source_reference=f'Reversal of txn #{orig.id}',
                    remarks=f'Payroll reversal: {reason}',
                    created_by=user
                )
                reversal_txns.append(reversal.id)
                total_reversed += orig.amount
                
                advance = orig.salary_advance
                advance.recalculate_closing_balance()
                if advance.status == 'CLOSED':
                    new_outstanding = get_total_outstanding(advance.id)
                    if new_outstanding > Decimal('0.00'):
                        advance.status = 'APPROVED'
                        advance.save()
        
        return {
            'total_reversed': total_reversed,
            'transactions': reversal_txns
        }
    
    except Exception as e:
        logger.error(f"Error reversing payroll recovery for staff {staff_id}: {e}")
        raise


def apply_monthly_charges_bulk(salary_month, user):

    advances = get_salary_advance_queryset().filter(
        status='APPROVED',
        start_month__lte=salary_month
    )
    
    results = {
        'interest_applied': 0,
        'penalty_applied': 0,
        'total_interest': Decimal('0.00'),
        'total_penalty': Decimal('0.00'),
        'errors': []
    }
    
    for advance in advances:
        try:
            int_txn = apply_interest_charge(advance, user, salary_month)
            if int_txn:
                results['interest_applied'] += 1
                results['total_interest'] += int_txn.amount
            
            pen_txn = apply_penalty_charge(advance, user, salary_month)
            if pen_txn:
                results['penalty_applied'] += 1
                results['total_penalty'] += pen_txn.amount
                
        except Exception as e:
            results['errors'].append(f'Advance #{advance.id}: {str(e)}')
    
    return results
