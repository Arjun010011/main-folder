import logging
import os
from datetime import date, datetime as dt
from decimal import Decimal

from django.db.models import Sum, Case, When, DecimalField
from django.http import HttpResponse

from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction
from apps.finance.services.salary_advance import (
    get_salary_advance_queryset, get_total_outstanding, get_principal_outstanding
)
from apps.finance.services.salary_advance_interest_penalty import is_overdue
from apps.institutes.models import Institute
from apps.shared.services import PDFService, UploadTypeService
from apps.shared.services_shared.common import get_selected_template
from apps.shared.services_shared.store_api_result import store_long_running_process

logger = logging.getLogger(__name__)

def get_staff_salary_advance_statement(from_date, to_date, staff_id=None, financial_year_id=None):

    queryset = get_salary_advance_queryset().filter(
        status__in=['APPROVED', 'CLOSED']
    )
    
    if staff_id:
        queryset = queryset.filter(staff_id=staff_id)
    
    if financial_year_id:
        queryset = queryset.filter(financial_year_id=financial_year_id)
    
    result = []
    grand_opening = Decimal('0.00')
    grand_debit = Decimal('0.00')
    grand_credit = Decimal('0.00')
    grand_closing = Decimal('0.00')
    
    for advance in queryset.select_related('staff'):
        asset_opening = advance.opening_balance or advance.total_amount or Decimal('0.00')
        
        advance_created = advance.approved_on or (advance.created_at.date() if advance.created_at else None)
        
        opening_txns = advance.salary_advance_transaction_salary_advance.filter(
            transaction_date__lt=from_date
        ).aggregate(
            debits=Sum(
                Case(
                    When(transaction_type__in=['ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            credits=Sum(
                Case(
                    When(transaction_type__in=['RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
        )
        
        opening_debits = opening_txns['debits'] or Decimal('0.00')
        opening_credits = opening_txns['credits'] or Decimal('0.00')
        
        if advance_created and advance_created < from_date:
            opening_balance = asset_opening + opening_debits - opening_credits
        elif advance_created and advance_created >= from_date:
            opening_balance = opening_debits - opening_credits
        else:
            opening_balance = asset_opening + opening_debits - opening_credits
        
        period_txns = advance.salary_advance_transaction_salary_advance.filter(
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        if opening_balance == Decimal('0.00') and not period_txns.exists() and not (advance_created and from_date <= advance_created <= to_date):
            continue
        
        period_agg = period_txns.aggregate(
            debit=Sum(
                Case(
                    When(transaction_type__in=['ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            credit=Sum(
                Case(
                    When(transaction_type__in=['RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
        )
        
        debit = period_agg['debit'] or Decimal('0.00')
        credit = period_agg['credit'] or Decimal('0.00')
        
        if advance_created and from_date <= advance_created <= to_date:
            debit += asset_opening
        
        closing_balance = opening_balance + debit - credit
        
        particulars = advance.purpose or advance.name
        staff_name = ''
        if advance.staff:
            staff_name = f"{advance.staff.first_name} {advance.staff.middle_name or ''} {advance.staff.last_name or ''}".strip()
        
        result.append({
            'staff_id': advance.staff_id,
            'staff_name': staff_name,
            'particulars': particulars,
            'salary_advance_id': advance.id,
            'opening_balance': opening_balance,
            'debit': debit,
            'credit': credit,
            'closing_balance': closing_balance
        })
        
        grand_opening += opening_balance
        grand_debit += debit
        grand_credit += credit
        grand_closing += closing_balance
    
    result.sort(key=lambda x: x['staff_name'])
    
    return {
        'data': result,
        'grand_total': {
            'opening_balance': grand_opening,
            'debit': grand_debit,
            'credit': grand_credit,
            'closing_balance': grand_closing
        }
    }


def get_salary_advance_summary_by_staff(staff_id):
    advances = get_salary_advance_queryset().filter(
        staff_id=staff_id
    ).select_related('financial_year')
    
    result = []
    total_outstanding = Decimal('0.00')
    
    for advance in advances:
        outstanding = get_total_outstanding(advance.id)
        principal = get_principal_outstanding(advance.id)
        
        txn_agg = advance.salary_advance_transaction_salary_advance.aggregate(
            interest=Sum(
                Case(
                    When(transaction_type='INTEREST', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            penalty=Sum(
                Case(
                    When(transaction_type='PENALTY', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            recovered=Sum(
                Case(
                    When(transaction_type__in=['RECOVERY', 'ADJUSTMENT'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
        )
        
        result.append({
            'id': advance.id,
            'name': advance.name,
            'description': advance.purpose,
            'total_amount': advance.total_amount,
            'total_recovered': txn_agg['recovered'] or Decimal('0.00'),
            'total_interest_charged': txn_agg['interest'] or Decimal('0.00'),
            'total_penalty_charged': txn_agg['penalty'] or Decimal('0.00'),
            'principal_outstanding': principal,
            'outstanding': outstanding,
            'status': advance.status,
            'start_month': advance.start_month,
            'monthly_recovery': advance.monthly_recovery_amount,
            'emi_amount': advance.emi_amount,
            'tenure_months': advance.tenure_months
        })
        
        if advance.status == 'APPROVED':
            total_outstanding += outstanding
    
    return {
        'advances': result,
        'total_outstanding': total_outstanding
    }


def get_aging_report(staff_id=None, financial_year_id=None, as_of_date=None):

    if as_of_date is None:
        as_of_date = date.today()
    
    queryset = get_salary_advance_queryset().filter(
        status='APPROVED'
    ).select_related('staff')
    
    if staff_id:
        queryset = queryset.filter(staff_id=staff_id)
    
    if financial_year_id:
        queryset = queryset.filter(financial_year_id=financial_year_id)
    
    buckets = {
        'current': [],
        '1_30': [],
        '31_60': [],
        '61_90': [],
        '90_plus': []
    }
    
    totals = {
        'current': Decimal('0.00'),
        '1_30': Decimal('0.00'),
        '31_60': Decimal('0.00'),
        '61_90': Decimal('0.00'),
        '90_plus': Decimal('0.00')
    }
    
    for advance in queryset:
        outstanding = get_total_outstanding(advance.id)
        if outstanding <= Decimal('0.00'):
            continue
        
        if not advance.start_month or advance.start_month > as_of_date:
            bucket = 'current'
            days_overdue = 0
        else:
            months_passed = (as_of_date.year - advance.start_month.year) * 12 + \
                           (as_of_date.month - advance.start_month.month) + 1
            
            monthly_amount = advance.emi_amount or advance.monthly_recovery_amount
            expected = min(months_passed * monthly_amount, advance.total_amount)
            
            actual = advance.salary_advance_transaction_salary_advance.filter(
                transaction_type__in=['RECOVERY', 'ADJUSTMENT'],
                is_active=True
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
            
            overdue_amount = expected - actual
            
            if overdue_amount <= Decimal('0.00'):
                bucket = 'current'
                days_overdue = 0
            else:
                days_overdue = (as_of_date - advance.start_month).days
                
                if days_overdue <= 30:
                    bucket = '1_30'
                elif days_overdue <= 60:
                    bucket = '31_60'
                elif days_overdue <= 90:
                    bucket = '61_90'
                else:
                    bucket = '90_plus'
        
        staff_name = ''
        if advance.staff:
            staff_name = f"{advance.staff.first_name} {advance.staff.middle_name or ''} {advance.staff.last_name or ''}".strip()
        
        record = {
            'id': advance.id,
            'staff_id': advance.staff_id,
            'staff_name': staff_name,
            'staff_employee_id': getattr(advance.staff, 'employee_id', None) if advance.staff else None,
            'name': advance.name,
            'total_amount': advance.total_amount,
            'outstanding': outstanding,
            'start_month': advance.start_month.isoformat() if advance.start_month else None,
            'days_overdue': days_overdue
        }
        
        buckets[bucket].append(record)
        totals[bucket] += outstanding
    
    return {
        'buckets': buckets,
        'totals': totals,
        'grand_total': sum(totals.values()),
        'as_of_date': as_of_date.isoformat(),
        'count': {k: len(v) for k, v in buckets.items()}
    }


def get_principal_interest_penalty_report(from_date, to_date, staff_id=None, financial_year_id=None):
    queryset = get_salary_advance_queryset().filter(
        status__in=['APPROVED', 'CLOSED']
    )
    
    if staff_id:
        queryset = queryset.filter(staff_id=staff_id)
    
    if financial_year_id:
        queryset = queryset.filter(financial_year_id=financial_year_id)
    
    result = []
    totals = {
        'principal_recovered': Decimal('0.00'),
        'interest_charged': Decimal('0.00'),
        'penalty_charged': Decimal('0.00'),
        'adjustments': Decimal('0.00')
    }
    
    for advance in queryset.select_related('staff'):
        period_txns = advance.salary_advance_transaction_salary_advance.filter(
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        if not period_txns.exists():
            continue
        
        agg = period_txns.aggregate(
            principal_recovered=Sum(
                Case(
                    When(transaction_type='RECOVERY', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            interest_charged=Sum(
                Case(
                    When(transaction_type='INTEREST', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            penalty_charged=Sum(
                Case(
                    When(transaction_type='PENALTY', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            ),
            adjustments=Sum(
                Case(
                    When(transaction_type='ADJUSTMENT', then='amount'),
                    default=Decimal('0.00'),
                    output_field=DecimalField()
                )
            )
        )
        
        staff_name = ''
        if advance.staff:
            staff_name = f"{advance.staff.first_name} {advance.staff.middle_name or ''} {advance.staff.last_name or ''}".strip()
        
        record = {
            'id': advance.id,
            'staff_id': advance.staff_id,
            'staff_name': staff_name,
            'name': advance.name,
            'principal_recovered': agg['principal_recovered'] or Decimal('0.00'),
            'interest_charged': agg['interest_charged'] or Decimal('0.00'),
            'penalty_charged': agg['penalty_charged'] or Decimal('0.00'),
            'adjustments': agg['adjustments'] or Decimal('0.00')
        }
        
        result.append(record)
        
        for key in totals:
            totals[key] += record[key]
    
    return {
        'data': result,
        'totals': totals,
        'from_date': from_date.isoformat(),
        'to_date': to_date.isoformat()
    }


def get_dashboard_metrics():
    all_advances = get_salary_advance_queryset()
    active_advances = all_advances.filter(status='APPROVED')
    
    total_outstanding = Decimal('0.00')
    total_overdue = Decimal('0.00')
    overdue_count = 0
    
    today = date.today()
    
    for advance in active_advances:
        outstanding = get_total_outstanding(advance.id)
        total_outstanding += outstanding
        
        if is_overdue(advance):
            overdue_count += 1
            if advance.start_month and advance.start_month <= today:
                months_passed = (today.year - advance.start_month.year) * 12 + \
                               (today.month - advance.start_month.month) + 1
                
                monthly_amount = advance.emi_amount or advance.monthly_recovery_amount
                expected = min(months_passed * monthly_amount, advance.total_amount)
                actual = advance.salary_advance_transaction_salary_advance.filter(
                    transaction_type__in=['RECOVERY', 'ADJUSTMENT'],
                    is_active=True
                ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
                
                total_overdue += max(expected - actual, Decimal('0.00'))
    
    return {
        'total_active_advances': active_advances.count(),
        'total_outstanding': total_outstanding,
        'overdue_count': overdue_count,
        'total_overdue_amount': total_overdue,
        'pending_approval_count': all_advances.filter(status='DRAFT').count(),
        'closed_this_month': all_advances.filter(
            status='CLOSED',
            updated_at__year=today.year,
            updated_at__month=today.month
        ).count(),
        'new_this_month': all_advances.filter(
            created_at__year=today.year,
            created_at__month=today.month
        ).count()
    }


def get_organization_summary(financial_year_id=None):
    queryset = get_salary_advance_queryset()
    
    if financial_year_id:
        queryset = queryset.filter(financial_year_id=financial_year_id)
    
    approved_advances = queryset.filter(status='APPROVED')
    total_outstanding = Decimal('0.00')
    for adv in approved_advances:
        total_outstanding += get_total_outstanding(adv.id)
    
    total_disbursed = queryset.aggregate(
        total=Sum('total_amount')
    )['total'] or Decimal('0.00')
    
    return {
        'totals': {
            'total_advances': queryset.count(),
            'total_disbursed': total_disbursed,
            'total_outstanding': total_outstanding,
            'active_advances': approved_advances.count()
        }
    }


# ━━━━━━━━━━━━━━━ PDF DOWNLOADS ━━━━━━━━━━━━━━━

def download_statement_pdf(view_self):
    """Generate PDF for Salary Advance Statement using PDFService.receipt_new()."""
    from_date = view_self.request.GET.get('from_date')
    to_date = view_self.request.GET.get('to_date')
    staff_id = view_self.request.GET.get('staff_id')
    financial_year_id = view_self.request.GET.get('financial_year_id')

    if not from_date or not to_date:
        return HttpResponse('from_date and to_date are required', status=400)

    report = get_staff_salary_advance_statement(from_date, to_date, staff_id, financial_year_id)
    data = report
    data['from_date'] = from_date
    data['to_date'] = to_date
    data['institute'] = Institute.get_institute(view_self)

    default = 'default_salary_advance_statement.html'
    selected_template, _ = get_selected_template(view_self, 'salary_advance', 'pdf', default)
    path = 'salary_advance/' + selected_template
    return PDFService.receipt_new(view_self, data, 'salary_advance_statement', path, False)


def download_aging_report_pdf(view_self):
    """Generate PDF for Salary Advance Aging Report using PDFService.receipt_new()."""
    staff_id = view_self.request.GET.get('staff_id')
    financial_year_id = view_self.request.GET.get('financial_year_id')

    report = get_aging_report(staff_id, financial_year_id)
    data = report
    data['institute'] = Institute.get_institute(view_self)

    default = 'default_salary_advance_aging.html'
    selected_template, _ = get_selected_template(view_self, 'salary_advance', 'pdf', default)
    path = 'salary_advance/' + selected_template
    return PDFService.receipt_new(view_self, data, 'salary_advance_aging', path, False)


def download_pip_report_pdf(view_self):
    """Generate PDF for Principal/Interest/Penalty Report using PDFService.receipt_new()."""
    from_date = view_self.request.GET.get('from_date')
    to_date = view_self.request.GET.get('to_date')
    staff_id = view_self.request.GET.get('staff_id')
    financial_year_id = view_self.request.GET.get('financial_year_id')

    if not from_date or not to_date:
        return HttpResponse('from_date and to_date are required', status=400)

    report = get_principal_interest_penalty_report(from_date, to_date, staff_id, financial_year_id)
    data = report
    data['institute'] = Institute.get_institute(view_self)

    default = 'default_salary_advance_pip.html'
    selected_template, _ = get_selected_template(view_self, 'salary_advance', 'pdf', default)
    path = 'salary_advance/' + selected_template
    return PDFService.receipt_new(view_self, data, 'salary_advance_pip', path, False)


# ━━━━━━━━━━━━━━━ LONG-RUNNING PROCESS (LRP) WRAPPERS ━━━━━━━━━━━━━━━

def _run_salary_advance_lrp(view_self, download_fn, report_label):
    """Generic LRP wrapper for salary advance PDF downloads."""
    transaction_id = view_self.request.GET.get('transaction_id')
    try:
        response = download_fn(view_self)
        if response.status_code == 200:
            file_name = f'{report_label}_{dt.now().strftime("%Y%m%d_%H%M%S")}.pdf'
            with open(file_name, 'wb') as f:
                f.write(response.content)
            url = UploadTypeService.upload_local_file(file_name, path='SalaryAdvanceReports')
            if os.path.exists(file_name):
                os.remove(file_name)
            store_long_running_process(view_self, transaction_id, {'url': url})
        else:
            store_long_running_process(
                view_self, transaction_id,
                {'error': f'Error with status code {response.status_code}'},
            )
    except Exception as e:
        logger.error(f'Error in {report_label} LRP: {e}', exc_info=True)
        store_long_running_process(
            view_self, transaction_id, {'error': str(e)[:250]},
        )


def download_statement_pdf_lrp(view_self):
    """LRP wrapper for Salary Advance Statement PDF."""
    _run_salary_advance_lrp(view_self, download_statement_pdf, 'salary_advance_statement')


def download_aging_report_pdf_lrp(view_self):
    """LRP wrapper for Salary Advance Aging Report PDF."""
    _run_salary_advance_lrp(view_self, download_aging_report_pdf, 'salary_advance_aging')


def download_pip_report_pdf_lrp(view_self):
    """LRP wrapper for Salary Advance PIP Report PDF."""
    _run_salary_advance_lrp(view_self, download_pip_report_pdf, 'salary_advance_pip')
