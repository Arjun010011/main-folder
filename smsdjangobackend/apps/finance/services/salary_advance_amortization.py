import math
from decimal import Decimal
from datetime import date
from dateutil.relativedelta import relativedelta

from apps.finance.services.salary_advance import get_total_outstanding, get_principal_outstanding


def calculate_emi(principal, annual_rate, tenure_months):

    if tenure_months <= 0:
        return Decimal('0.00')
    
    principal = Decimal(str(principal))
    annual_rate = Decimal(str(annual_rate))
    
    if annual_rate <= 0:
        return (principal / Decimal(tenure_months)).quantize(Decimal('0.01'))

    monthly_rate = annual_rate / Decimal('1200')
    n = Decimal(tenure_months)
    
    one_plus_r_power_n = (1 + monthly_rate) ** int(n)
    
    emi = (principal * monthly_rate * one_plus_r_power_n) / (one_plus_r_power_n - 1)
    return emi.quantize(Decimal('0.01'))


def generate_amortization_schedule(principal, annual_rate, tenure_months, start_date):
    
    if tenure_months <= 0:
        return []
    
    principal = Decimal(str(principal))
    annual_rate = Decimal(str(annual_rate))
    
    schedule = []
    emi = calculate_emi(principal, annual_rate, tenure_months)
    balance = principal
    monthly_rate = annual_rate / Decimal('1200') if annual_rate > 0 else Decimal('0')
    
    current_date = start_date
    
    for i in range(1, tenure_months + 1):
        interest_component = (balance * monthly_rate).quantize(Decimal('0.01'))
        principal_component = emi - interest_component
        
        if i == tenure_months:
            principal_component = balance
            emi = principal_component + interest_component
        
        balance = balance - principal_component
        
        schedule.append({
            'installment_no': i,
            'due_date': current_date,
            'emi': emi,
            'principal': principal_component,
            'interest': interest_component,
            'balance': max(balance, Decimal('0.00'))
        })
        
        current_date = current_date + relativedelta(months=1)
    
    return schedule


def get_current_installment_details(asset):
    
    outstanding = get_total_outstanding(asset.id)
    
    if outstanding <= Decimal('0.00'):
        return {
            'principal': Decimal('0.00'),
            'interest': Decimal('0.00'),
            'total': Decimal('0.00')
        }
    
    if asset.interest_type == 'NONE' or asset.interest_rate <= 0:
        if asset.emi_amount:
            recovery = min(asset.emi_amount, outstanding)
        else:
            recovery = min(asset.monthly_recovery_amount, outstanding)
        
        return {
            'principal': recovery,
            'interest': Decimal('0.00'),
            'total': recovery
        }
    
    principal_outstanding = get_principal_outstanding(asset.id)
    
    monthly_rate = asset.interest_rate / Decimal('1200')
    interest = (principal_outstanding * monthly_rate).quantize(Decimal('0.01'))
    
    if asset.emi_amount:
        emi = asset.emi_amount
    else:
        emi = asset.monthly_recovery_amount
    
    principal = min(emi - interest, principal_outstanding) if emi > interest else Decimal('0.00')
    
    return {
        'principal': max(principal, Decimal('0.00')),
        'interest': interest,
        'total': principal + interest
    }


def calculate_expected_end_date(start_date, tenure_months):
    
    if tenure_months <= 0:
        return start_date
    return start_date + relativedelta(months=tenure_months - 1)


def get_remaining_tenure(asset):
    outstanding = get_total_outstanding(asset.id)
    
    if outstanding <= Decimal('0.00'):
        return 0
    
    if asset.emi_amount:
        emi = asset.emi_amount
    else:
        emi = asset.monthly_recovery_amount
    
    if emi <= Decimal('0.00'):
        return None
    
    return math.ceil(float(outstanding) / float(emi))
