from datetime import date, datetime
from decimal import Decimal

from django.db.models import (
    Sum, Count, Case, When, DecimalField, Q, F, Value, CharField
)
from django.db.models.functions import Coalesce, TruncMonth

from apps.payroll.models.payroll import (
    SalaryEmployeeMonthPlan, SalaryFormula, SalaryFormulaRule,
    StaffManualAttendance,
)
from apps.staffs.models import Staff
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.hr.models.staffAttendance import StaffAttendance

ZERO = Decimal('0.00')

def get_latest_month_or_current():
    latest = SalaryEmployeeMonthPlan.objects.filter(is_active=True).order_by('-salary_month').first()
    if latest and latest.salary_month:
        return latest.salary_month
    today = date.today()
    return date(today.year, today.month, 1)


def get_payroll_summary():
    current_month = get_latest_month_or_current()

    total_staff = Staff.objects.filter(is_active=True).count()

    staff_on_payroll = SalaryEmployeeMonthPlan.objects.filter(
        is_active=True
    ).values('staff').distinct().count()

    current_qs = SalaryEmployeeMonthPlan.objects.filter(
        salary_month=current_month,
        is_active=True,
    )

    current_agg = current_qs.aggregate(
        gross_earnings=Coalesce(Sum(
            Case(
                When(salary_component__is_deduction=False, then='amount'),
                default=ZERO,
                output_field=DecimalField(),
            )
        ), ZERO),
        gross_deductions=Coalesce(Sum(
            Case(
                When(salary_component__is_deduction=True, then='amount'),
                default=ZERO,
                output_field=DecimalField(),
            )
        ), ZERO),
    )

    gross = current_agg['gross_earnings']
    deductions = current_agg['gross_deductions']
    net_pay = gross - deductions

    current_staff = current_qs.values('staff').distinct().count()
    is_locked = current_qs.filter(is_locked=True).exists()

    # Pending approvals (staff without salary plans)
    pending_approvals = total_staff - staff_on_payroll

    return {
        'total_staff': total_staff,
        'staff_on_payroll': staff_on_payroll,
        'pending_setup': max(pending_approvals, 0),
        'current_month': {
            'month': current_month.strftime('%B %Y'),
            'staff_count': current_staff,
            'gross_earnings': str(gross),
            'gross_deductions': str(deductions),
            'net_pay': str(net_pay),
            'is_locked': is_locked,
        },
    }


def get_monthly_payroll_trend(months=6):
    """
    Month-wise gross earnings, deductions, and net pay for last N months.
    Optimized: single aggregated query using TruncMonth instead of N queries.
    """
    today = date.today()

    # Build the list of expected month-start dates
    month_dates = []
    for i in range(months - 1, -1, -1):
        year = today.year
        month = today.month - i
        while month <= 0:
            month += 12
            year -= 1
        month_dates.append(date(year, month, 1))

    earliest = month_dates[0]

    # Single aggregated query across all months
    agg_qs = (
        SalaryEmployeeMonthPlan.objects
        .filter(salary_month__gte=earliest, is_active=True)
        .annotate(trunc_month=TruncMonth('salary_month'))
        .values('trunc_month')
        .annotate(
            gross_earnings=Coalesce(Sum(
                Case(
                    When(salary_component__is_deduction=False, then='amount'),
                    default=ZERO,
                    output_field=DecimalField(),
                )
            ), ZERO),
            gross_deductions=Coalesce(Sum(
                Case(
                    When(salary_component__is_deduction=True, then='amount'),
                    default=ZERO,
                    output_field=DecimalField(),
                )
            ), ZERO),
            staff_count=Count('staff', distinct=True),
            has_locked=Count(Case(When(is_locked=True, then=1))),
        )
        .order_by('trunc_month')
    )

    # Index by month for O(1) lookup
    agg_map = {}
    for row in agg_qs:
        m = row['trunc_month']
        if isinstance(m, datetime):
            m = m.date()
        agg_map[m] = row

    month_data = []
    for target in month_dates:
        row = agg_map.get(target)
        if row:
            gross = row['gross_earnings']
            deductions = row['gross_deductions']
            month_data.append({
                'month': target.strftime('%b %Y'),
                'month_date': target.isoformat(),
                'staff_count': row['staff_count'],
                'gross_earnings': str(gross),
                'gross_deductions': str(deductions),
                'net_pay': str(gross - deductions),
                'is_locked': row['has_locked'] > 0,
            })
        else:
            month_data.append({
                'month': target.strftime('%b %Y'),
                'month_date': target.isoformat(),
                'staff_count': 0,
                'gross_earnings': str(ZERO),
                'gross_deductions': str(ZERO),
                'net_pay': str(ZERO),
                'is_locked': False,
            })

    return month_data


def get_top_earners(month=None, limit=10):
    """
    Top N staff by net pay for a given month.
    """
    if not month:
        month = get_latest_month_or_current()

    qs = SalaryEmployeeMonthPlan.objects.filter(
        salary_month=month,
        is_active=True,
    ).values('staff', 'staff__first_name', 'staff__middle_name', 'staff__last_name').annotate(
        earnings=Coalesce(Sum(
            Case(
                When(salary_component__is_deduction=False, then='amount'),
                default=ZERO,
                output_field=DecimalField(),
            )
        ), ZERO),
        deductions=Coalesce(Sum(
            Case(
                When(salary_component__is_deduction=True, then='amount'),
                default=ZERO,
                output_field=DecimalField(),
            )
        ), ZERO),
    ).order_by('-earnings')[:limit]

    result = []
    for row in qs:
        first = row['staff__first_name'] or ''
        middle = row['staff__middle_name'] or ''
        last = row['staff__last_name'] or ''
        name = f"{first} {middle} {last}".strip()
        net = row['earnings'] - row['deductions']
        result.append({
            'staff_id': row['staff'],
            'staff_name': name,
            'earnings': str(row['earnings']),
            'deductions': str(row['deductions']),
            'net_pay': str(net),
        })

    return result


def get_component_breakdown(month=None):
    """
    Component-wise totals for a given month (top components).
    """
    if not month:
        month = get_latest_month_or_current()

    qs = SalaryEmployeeMonthPlan.objects.filter(
        salary_month=month,
        is_active=True,
        salary_component__isnull=False,
    )

    default_formula = SalaryFormula.objects.filter(is_default=True, is_active=True).first()
    if default_formula:
        formula_components = SalaryFormulaRule.objects.filter(
            formula=default_formula,
            salary_component__isnull=False
        ).values_list('salary_component', flat=True)
        qs = qs.filter(salary_component__in=formula_components)

    qs = qs.values(
        'salary_component__name',
        'salary_component__is_deduction',
    ).annotate(
        total=Coalesce(Sum('amount'), ZERO),
        staff_count=Count('staff', distinct=True),
    ).order_by('-total')[:15]

    earnings = []
    deductions = []

    for row in qs:
        item = {
            'component': row['salary_component__name'],
            'total': str(row['total']),
            'staff_count': row['staff_count'],
        }
        if row['salary_component__is_deduction']:
            deductions.append(item)
        else:
            earnings.append(item)

    return {
        'earnings': earnings,
        'deductions': deductions,
    }


def get_payroll_summary_table(salary_month):
    """
    Read-only payroll summary table for a given salary_month (date object, first of month).
    Returns {data: [...], columns: [...], prerequisites: {...}}
    """
    qs = SalaryEmployeeMonthPlan.objects.filter(
        salary_month=salary_month,
        is_active=True,
        salary_component__isnull=False,
    ).select_related('staff', 'salary_component')

    # --- prerequisites ---
    salary_generated = qs.exists()
    manual_att = StaffManualAttendance.objects.filter(
        salary_month=salary_month, is_active=True
    ).exists()

    staff_att = StaffAttendance.objects.filter(
        for_date__year=salary_month.year,
        for_date__month=salary_month.month,
    ).exists()

    if manual_att:
        attendance_source = 'manual'
    elif staff_att:
        attendance_source = 'staff_attendance'
    else:
        attendance_source = 'none'

    prerequisites = {
        'salary_generated': salary_generated,
        'attendance_done': manual_att or staff_att,
        'attendance_source': attendance_source,
    }

    if not salary_generated:
        return {'data': [], 'columns': [], 'prerequisites': prerequisites}

    # --- build per-staff data + dynamic columns ---
    staff_map = {}   # staff_id -> {staff_id, staff_name, gross_salary, components: [...], ...}
    column_set = {}  # component_name -> {name, type}

    for rec in qs:
        sid = rec.staff_id
        if sid not in staff_map:
            parts = [rec.staff.first_name or '']
            if getattr(rec.staff, 'middle_name', None):
                parts.append(rec.staff.middle_name)
            if getattr(rec.staff, 'last_name', None):
                parts.append(rec.staff.last_name)
            staff_map[sid] = {
                'staff_id': sid,
                'staff_name': ' '.join(parts).strip(),
                'gross_salary': float(rec.staff.salary or 0),
                'components': [],
                'total_earnings': Decimal('0'),
                'total_deductions': Decimal('0'),
            }

        comp_name = rec.salary_component.name
        is_ded = rec.salary_component.is_deduction
        amount = rec.amount or Decimal('0')

        staff_map[sid]['components'].append({
            'component_name': comp_name,
            'amount': float(amount),
        })

        if is_ded:
            staff_map[sid]['total_deductions'] += amount
        else:
            staff_map[sid]['total_earnings'] += amount

        if comp_name not in column_set:
            column_set[comp_name] = {
                'name': comp_name,
                'type': 'DEDUCTION' if is_ded else 'EARNING',
            }

    # finalize staff rows
    data = []
    for sid, row in staff_map.items():
        row['total_earnings'] = float(row['total_earnings'])
        row['total_deductions'] = float(row['total_deductions'])
        row['net_pay'] = round(row['total_earnings'] - row['total_deductions'], 2)
        data.append(row)

    # sort by staff name
    data.sort(key=lambda x: x['staff_name'])

    # columns: earnings first, then deductions
    columns = sorted(
        column_set.values(),
        key=lambda c: (0 if c['type'] == 'EARNING' else 1, c['name']),
    )

    return {'data': data, 'columns': columns, 'prerequisites': prerequisites}


def download_payroll_summary_excel(self, salary_month):
    """
    Excel download for payroll summary table.
    """
    result = get_payroll_summary_table(salary_month)
    data_list = result.get('data', [])
    columns = result.get('columns', [])

    earning_cols = [c for c in columns if c['type'] == 'EARNING']
    deduction_cols = [c for c in columns if c['type'] == 'DEDUCTION']

    # flatten components into staff row for excel
    for idx, row in enumerate(data_list):
        row['sl_no'] = idx + 1
        comp_map = {c['component_name']: c['amount'] for c in row.get('components', [])}
        for col in columns:
            row[col['name']] = round(comp_map.get(col['name'], 0), 2)

    options = {
        'title': 'Payroll Summary',
        'description': 'Payroll Summary Report',
        'extraWorksheet': False,
        'extraWorksheetData': {},
        'columns': [
            {'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'},
            {'column': 'Staff Name', 'required': False, 'schemacolumn': 'staff_name'},
            {'column': 'Gross Salary', 'required': False, 'schemacolumn': 'gross_salary'},
        ],
    }

    for col in earning_cols:
        options['columns'].append(
            {'column': col['name'], 'required': False, 'schemacolumn': col['name']}
        )
    options['columns'].append(
        {'column': 'Total Earnings', 'required': False, 'schemacolumn': 'total_earnings'}
    )
    for col in deduction_cols:
        options['columns'].append(
            {'column': col['name'], 'required': False, 'schemacolumn': col['name']}
        )
    options['columns'].append(
        {'column': 'Total Deductions', 'required': False, 'schemacolumn': 'total_deductions'}
    )
    options['columns'].append(
        {'column': 'Net Pay', 'required': False, 'schemacolumn': 'net_pay'}
    )
    options['Data'] = data_list
    return write_to_excel_new(self, options, {}, {})
