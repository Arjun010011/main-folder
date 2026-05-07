import logging
from datetime import datetime, date
from decimal import Decimal

from rest_framework import exceptions

from apps.payroll.models.salary_advance import SalaryAdvance

logger = logging.getLogger(__name__)


def parse_date_param(date_str, param_name='date'):
    if not date_str:
        return None
    try:
        return datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        raise exceptions.ValidationError(
            f'Invalid date format for {param_name}. Use YYYY-MM-DD'
        )


def get_salary_advance_asset(asset_id):
    if not asset_id:
        raise exceptions.ValidationError('asset_id is required')
    try:
        return SalaryAdvance.objects.get(id=asset_id, is_active=True)
    except SalaryAdvance.DoesNotExist:
        raise exceptions.ValidationError('Salary advance not found')


def get_statement(from_date_str, to_date_str, staff_id, financial_year_id):
    from apps.finance.services.salary_advance_report import get_staff_salary_advance_statement

    if not from_date_str or not to_date_str:
        raise exceptions.ValidationError('from_date and to_date are required')

    from_date = parse_date_param(from_date_str, 'from_date')
    to_date = parse_date_param(to_date_str, 'to_date')

    result = get_staff_salary_advance_statement(from_date, to_date, staff_id, financial_year_id)
    return {'success': True, 'data': result}



def get_amortization_schedule(asset_id):
    from apps.finance.services.salary_advance_amortization import generate_amortization_schedule

    asset = get_salary_advance_asset(asset_id)

    if not asset.start_month or not asset.tenure_months:
        raise exceptions.ValidationError('Tenure information not available')

    schedule = generate_amortization_schedule(
        asset.total_amount,
        asset.interest_rate,
        asset.tenure_months,
        asset.start_month
    )

    for item in schedule:
        item['due_date'] = item['due_date'].isoformat()
        item['emi'] = str(item['emi'])
        item['principal'] = str(item['principal'])
        item['interest'] = str(item['interest'])
        item['balance'] = str(item['balance'])

    return {'success': True, 'data': schedule}



def apply_interest(request_data, user):
    from apps.finance.services.salary_advance_interest_penalty import apply_interest_charge

    asset_id = request_data.get('asset_id') or request_data.get('salary_advance_id')
    asset = get_salary_advance_asset(asset_id)

    calculation_date_str = request_data.get('calculation_date')
    calculation_date = parse_date_param(calculation_date_str, 'calculation_date') if calculation_date_str else date.today()

    remarks = request_data.get('remarks')
    txn = apply_interest_charge(asset, user, calculation_date, remarks)

    if txn:
        return {'success': True, 'message': 'Interest charge applied', 'transaction_id': txn.id}
    return {'success': True, 'message': 'No interest to apply or already charged for this period'}



def apply_penalty(request_data, user):
    from apps.finance.services.salary_advance_interest_penalty import apply_penalty_charge

    asset_id = request_data.get('asset_id') or request_data.get('salary_advance_id')
    asset = get_salary_advance_asset(asset_id)

    calculation_date_str = request_data.get('calculation_date')
    calculation_date = parse_date_param(calculation_date_str, 'calculation_date') if calculation_date_str else date.today()

    remarks = request_data.get('remarks')
    txn = apply_penalty_charge(asset, user, calculation_date, remarks)

    if txn:
        return {'success': True, 'message': 'Penalty charge applied', 'transaction_id': txn.id}
    return {'success': True, 'message': 'No penalty to apply or already charged for this period'}


def get_dashboard(financial_year_id):
    from apps.finance.services.salary_advance_report import get_dashboard_metrics, get_organization_summary

    metrics = get_dashboard_metrics()
    summary = get_organization_summary(financial_year_id)

    return {
        'success': True,
        'data': {
            'metrics': metrics,
            'summary': summary
        }
    }

def get_aging(staff_id, financial_year_id, as_of_date_str):
    from apps.finance.services.salary_advance_report import get_aging_report

    as_of_date = parse_date_param(as_of_date_str, 'as_of_date') if as_of_date_str else None

    result = get_aging_report(staff_id, financial_year_id, as_of_date)
    return {'success': True, 'data': result}


def get_payroll_recovery_details(staff_id, salary_month_str):
    from apps.finance.services.salary_advance_payroll import get_recovery_details_for_payroll

    if not staff_id or not salary_month_str:
        raise exceptions.ValidationError('staff_id and salary_month are required')

    salary_month = parse_date_param(salary_month_str, 'salary_month')
    result = get_recovery_details_for_payroll(staff_id, salary_month)

    serialized = {
        'total_recovery': str(result.get('total_recovery', '0.00')),
        'advances': [],
    }
    for adv in result.get('advances', []):
        serialized['advances'].append({
            'id': adv['id'],
            'name': adv['name'],
            'description': adv.get('description', ''),
            'principal': str(adv['principal']),
            'interest': str(adv['interest']),
            'total': str(adv['total']),
            'outstanding_before': str(adv['outstanding_before']),
            'priority': adv['priority'],
        })
    return {'success': True, 'data': serialized}


def handle_payroll_recovery(request_data, user):
    from apps.finance.services.salary_advance_payroll import (
        create_recovery_from_payroll, check_payroll_period_processed
    )

    staff_id = request_data.get('staff_id')
    salary_month_str = request_data.get('salary_month')
    payroll_id = request_data.get('payroll_id')
    available_amount = request_data.get('available_amount')
    remarks = request_data.get('remarks')

    if not staff_id or not salary_month_str:
        raise exceptions.ValidationError('staff_id and salary_month are required')

    salary_month = parse_date_param(salary_month_str, 'salary_month')

    if check_payroll_period_processed(staff_id, salary_month):
        raise exceptions.ValidationError('Payroll recovery already processed for this period')

    if available_amount:
        available_amount = Decimal(str(available_amount))

    result = create_recovery_from_payroll(
        staff_id, salary_month, payroll_id, user, available_amount, remarks
    )

    if result.get('error'):
        raise exceptions.ValidationError(result['error'])

    result['total_recovered'] = str(result.get('total_recovered', '0.00'))
    result['carry_forward'] = str(result.get('carry_forward', '0.00'))
    return {'success': True, 'data': result}


def handle_payroll_reversal(request_data, user):
    from apps.finance.services.salary_advance_payroll import reverse_payroll_recovery

    staff_id = request_data.get('staff_id')
    salary_month_str = request_data.get('salary_month')
    reason = (request_data.get('reason') or '').strip()

    if not staff_id or not salary_month_str:
        raise exceptions.ValidationError('staff_id and salary_month are required')
    if not reason:
        raise exceptions.ValidationError('reason is required for reversal')

    salary_month = parse_date_param(salary_month_str, 'salary_month')

    result = reverse_payroll_recovery(staff_id, salary_month, user, reason)
    result['total_reversed'] = str(result.get('total_reversed', '0.00'))
    return {'success': True, 'data': result}


def apply_bulk_charges(salary_month_str, user):
    from apps.finance.services.salary_advance_payroll import apply_monthly_charges_bulk

    if not salary_month_str:
        raise exceptions.ValidationError('salary_month is required')

    salary_month = parse_date_param(salary_month_str, 'salary_month')
    result = apply_monthly_charges_bulk(salary_month, user)
    return {'success': True, 'data': result}
