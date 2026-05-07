from datetime import datetime, date

from rest_framework import exceptions
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.hr.services.default_varialbes import get_lop_attendance_list
from apps.hr.services.staffattendance import mark_absent_for_unmarked_in_month
from apps.hr.services.staffleave import get_lop_count_and_date_status
from apps.institutes.models import FinancialYear, Institute
from apps.institutes.serializers import InstituteSerializer
from apps.notification.services.notification_service import send_notification
from apps.payroll.models.payroll import SalaryComponent, SalaryEmployeePlan, SalaryEmployeeMonthPlan
from apps.payroll.serializers import SalaryEmployeePlanSerializer, SalaryEmployeeMonthPlanSerializer
from apps.payroll.services import payroll_calculation, payroll
from apps.payroll.services.payroll_component import LOP_CODENAME
from apps.shared.services import FormdefinitionService, NotificationBodyTemplate, SharedService, UploadTypeService
from apps.staffs.models import Staff, AccountDetail
from apps.staffs.serializers import StaffAllDetailSerializer, AccountDetailSerializer
from apps.staffs.services.staff import get_staff_list
from apps.users.models import User
from apps.payroll.services.payroll_engine import _get_formula, _get_rules, _calc_component
from decimal import Decimal
from apps.payroll.services.payroll_engine import run_formula_engine, compute_staff_attendance, get_historical_staff_salary
from apps.payroll.models.payroll import SalaryEmployeeOverride

def _formula_salary_data(staff_obj, financial_year, salary_start_date, salary_end_date, total_days):
    
    year = salary_start_date.year
    month = salary_start_date.month

    try:
        att = compute_staff_attendance(staff_obj.id, year, month)
        working_days = att.get('working_days', total_days)
        present_days = att.get('present_days', total_days)
    except Exception:
        working_days = total_days
        present_days = total_days

    salary_month = salary_start_date.replace(day=1)

    records = SalaryEmployeeMonthPlan.objects.filter(
        staff=staff_obj, salary_month=salary_month, is_active=True
    ).select_related('salary_component')

    # If salary not yet generated, compute preview using formula engine (read-only).
    # Uses correct monthly gross (annual/12) and actual attendance data.
    if not records.exists():
        try:
            formula = _get_formula(financial_year.id)
            rules = _get_rules(formula)
        except Exception:
            return {
                'earnings': [], 'deductions': [],
                'gross_earnings': 0, 'gross_deductions': 0, 'net_pay': 0,
                'lop_days': 0, 'present_days': present_days, 'days': working_days,
                'staff_days': 0, 'start_date': salary_start_date, 'end_date': salary_end_date,
                'use_formula': True, 'error': 'No active formula found.',
            }

        annual_salary = get_historical_staff_salary(staff_obj, year, month)
        monthly_gross = (Decimal(str(annual_salary or 0)) / 12).quantize(Decimal('0.01'))

        ded_codes = {
            (r.salary_component.codename or r.salary_component.name.upper())
            for r in rules
            if r.salary_component and r.salary_component.is_deduction and r.is_active
        }
        account = AccountDetail.objects.filter(staff=staff_obj, is_active=True).first()

        ctx = {
            'gross': monthly_gross,
            'components': {},
            'working': working_days,
            'present': present_days,
            'ded_codes': ded_codes,
            'account': account,
        }

        p_earnings = []
        p_deductions = []
        p_gross_earnings = Decimal('0')
        p_gross_deductions = Decimal('0')

        for rule in rules:
            if not rule.salary_component or not rule.is_active:
                continue
            value = _calc_component(rule, ctx)
            codename = rule.salary_component.codename or rule.salary_component.name.upper()
            ctx['components'][codename] = value

            comp_data = {
                'salary_component': rule.salary_component_id,
                'salary_component_name': rule.salary_component.name,
                'is_deduction': rule.salary_component.is_deduction,
                'amount': float(value),
                'lop_days': 0,
                'lop_amount': 0,
            }
            if rule.salary_component.is_deduction:
                p_deductions.append(comp_data)
                p_gross_deductions += value
            else:
                p_earnings.append(comp_data)
                p_gross_earnings += value

        pending_overrides = {
            ov.salary_component_id: ov
            for ov in SalaryEmployeeOverride.objects.filter(
                staff=staff_obj, salary_year=year, salary_month=month,
                is_active=True, month_plan__isnull=True,
            )
        }
        if pending_overrides:
            p_gross_earnings = Decimal('0')
            p_gross_deductions = Decimal('0')
            for comp in p_earnings + p_deductions:
                comp_id = comp['salary_component']
                if comp_id in pending_overrides:
                    comp['amount'] = float(pending_overrides[comp_id].amount)
                    comp['overridden'] = True
                if comp['is_deduction']:
                    p_gross_deductions += Decimal(str(comp['amount']))
                else:
                    p_gross_earnings += Decimal(str(comp['amount']))

        return {
            'earnings': p_earnings,
            'deductions': p_deductions,
            'gross_earnings': round(float(p_gross_earnings)),
            'gross_deductions': round(float(p_gross_deductions)),
            'net_pay': round(float(p_gross_earnings - p_gross_deductions)),
            'lop_days': 0,
            'present_days': present_days,
            'days': working_days,
            'staff_days': 0,
            'start_date': salary_start_date,
            'end_date': salary_end_date,
            'use_formula': True,
        }

    earnings = []
    deductions = []
    gross_earnings = Decimal('0')
    gross_deductions = Decimal('0')
    lop_days = 0

    for rec in records:
        comp_data = {
            'salary_component': rec.salary_component_id,
            'salary_component_name': rec.salary_component.name if rec.salary_component else '',
            'is_deduction': rec.salary_component.is_deduction if rec.salary_component else False,
            'amount': float(rec.amount or 0),
            'lop_days': int(rec.lop or 0),
            'lop_amount': float(rec.lop_amount or 0),
        }
        lop_days = int(rec.lop or 0)
        if rec.salary_component and rec.salary_component.is_deduction:
            deductions.append(comp_data)
            gross_deductions += rec.amount or Decimal('0')
        else:
            earnings.append(comp_data)
            gross_earnings += rec.amount or Decimal('0')

    return {
        'earnings': earnings,
        'deductions': deductions,
        'gross_earnings': round(float(gross_earnings)),
        'gross_deductions': round(float(gross_deductions)),
        'net_pay': round(float(gross_earnings - gross_deductions)),
        'lop_days': lop_days,
        'present_days': present_days,
        'days': working_days,
        'staff_days': 0,
        'start_date': salary_start_date,
        'end_date': salary_end_date,
        'use_formula': True,
    }


def _formula_salary_preview(staff_obj, financial_year):
    
    try:
        formula = _get_formula(financial_year.id)
        rules = _get_rules(formula)
    except Exception:
        return {
            'earnings': [], 'deductions': [],
            'gross_earnings': 0, 'gross_deductions': 0, 'net_pay': 0,
            'use_formula': True, 'error': 'No active formula found.',
        }

    gross = (Decimal(str(staff_obj.salary or 0)) / 12).quantize(Decimal('0.01'))
    ded_codes = {
        (r.salary_component.codename or r.salary_component.name.upper())
        for r in rules
        if r.salary_component and r.salary_component.is_deduction
    }

    ctx = {
        'gross': gross,
        'components': {},
        'working': 30,
        'present': 30,
        'ded_codes': ded_codes,
        'account': None,
    }

    earnings = []
    deductions = []
    gross_earnings = Decimal('0')
    gross_deductions = Decimal('0')

    for rule in rules:
        if not rule.salary_component:
            continue
        value = _calc_component(rule, ctx)
        codename = rule.salary_component.codename or rule.salary_component.name.upper()
        ctx['components'][codename] = value

        comp_data = {
            'salary_component': rule.salary_component_id,
            'salary_component_name': rule.salary_component.name,
            'is_deduction': rule.salary_component.is_deduction,
            'amount': float(value),
        }
        if rule.salary_component.is_deduction:
            deductions.append(comp_data)
            gross_deductions += value
        else:
            earnings.append(comp_data)
            gross_earnings += value

    return {
        'earnings': earnings,
        'deductions': deductions,
        'gross_earnings': round(float(gross_earnings)),
        'gross_deductions': round(float(gross_deductions)),
        'net_pay': round(float(gross_earnings - gross_deductions)),
        'use_formula': True,
    }


def get_lop_details(data, days):
    perDaySalary = data['net_pay'] / days
    lop = SalaryComponent.objects.filter(codename=LOP_CODENAME).first()
    return perDaySalary, lop


def get_staff_day_of_month(staff_objs, start_date, end_date):
    response = {}
    for staff_obj in staff_objs:
        response[staff_obj.id] = {'start_date': start_date, 'end_date': end_date, 'days': 0}
        if (staff_obj.date_joined and staff_obj.date_left) and start_date < staff_obj.date_joined < staff_obj.date_left <= end_date:
            response[staff_obj.id]['start_date'] = staff_obj.date_joined
            response[staff_obj.id]['end_date'] = staff_obj.date_left
        elif staff_obj.date_joined and start_date < staff_obj.date_joined <= end_date:
            response[staff_obj.id]['start_date'] = staff_obj.date_joined
        elif staff_obj.date_left and start_date < staff_obj.date_left <= end_date:
            response[staff_obj.id]['end_date'] = staff_obj.date_left
        response[staff_obj.id]['staff_days'] = (response[staff_obj.id]['end_date'] - response[staff_obj.id]['start_date']).days + 1
    return response


def get_staff_salary_by_joining_detail(self, staff_objs, data, start_date, end_date, total_days):
    staff_day_month = get_staff_day_of_month(staff_objs, start_date, end_date)
    response = {'staff_list': {}, 'day_list': []}
    for staff_obj in staff_objs:
        staff_id = staff_obj.id
        if staff_id not in response['staff_list']:
            response['staff_list'][staff_id] = {
                'staff_days': 0, 'days': total_days,
                'data': {}, 'start_date': start_date,
                'end_date': end_date
            }
        temp_start_date = start_date.strftime('%Y-%m-%d')
        temp_end_date = end_date.strftime('%Y-%m-%d')
        lop_data_list = get_lop_count_and_date_status(self, temp_start_date, temp_end_date, [staff_id])
        lop_data = lop_data_list['staff_list'][staff_id]
        response['day_list'] = lop_data_list['day_list']
        response['staff_list'][staff_id]['staff_days'] = 0 if total_days == staff_day_month[staff_id]['staff_days'] else staff_day_month[staff_id]['staff_days']
        response['staff_list'][staff_id]['days'] = response['staff_list'][staff_id]['staff_days'] if response['staff_list'][staff_id]['staff_days'] > 0 else total_days
        response['staff_list'][staff_id]['present_days'] = response['staff_list'][staff_id]['days'] - lop_data['lop_days']
        attendance_days_per_month = FormdefinitionService.get_formdefintion_data({}, 'payrol_confgiruation', 'attendance_days_per_month')
        if  int(attendance_days_per_month) >= 28 and int(attendance_days_per_month) <= 31:
            if not response['staff_list'][staff_id]['days'] != total_days:
                response['staff_list'][staff_id]['days'] = attendance_days_per_month
                response['staff_list'][staff_id]['present_days'] = attendance_days_per_month - lop_data['lop_days']
            total_days = attendance_days_per_month
        response['staff_list'][staff_id].update(lop_data)
        response['staff_list'][staff_id].update(payroll_calculation.salary_calculate(data[staff_id], True, total_days, response['staff_list'][staff_id]['present_days']))
    return response


def generate_salary_employee_plan(self, extra_params={}):
    response = {}
    staff_joining_data = None
    financial_year =  extra_params['financial_year'] if 'financial_year' in extra_params else self.request.GET.get('financial_year')
    salary_month = extra_params['salary_month'] if 'salary_month' in extra_params else self.request.GET.get('salary_month')
    staff = extra_params['staff'] if 'staff' in extra_params else self.request.GET.get('staff')
    staff_ids = extra_params['staff_ids'] if 'staff_ids' in extra_params else self.request.GET.get('staff_ids')
    financial_year = FinancialYear.objects.get(id=1)
    if staff:
        staff_ids = [staff]
    staff_objs = Staff.objects.filter(id__in=staff_ids)
    queryset =  SalaryEmployeePlan.objects.filter(
                    staff__in=staff_ids, is_approved=True,from_date__gte=financial_year.start_date,
                    to_date__lte=financial_year.end_date
                )
    serializer = SalaryEmployeePlanSerializer(queryset, many=True)
    staff_salary_plan = {}
    for salary_employee in serializer.data:
        if salary_employee['staff'] not in staff_salary_plan:
            staff_salary_plan[salary_employee['staff']] = []
        staff_salary_plan[salary_employee['staff']].append(
            salary_employee
        )
    if salary_month:
        if isinstance(salary_month, date):
            salary_month = salary_month.strftime("%Y-%m")
        salary_start_date = datetime.strptime(salary_month, "%Y-%m").date()
        days, salary_end_date = SharedService.last_day_of_month(salary_start_date, True)
    salary_data = {}
    # Identify which staff members use formula mode
    formula_staff_ids = set(
        queryset.filter(use_formula=True, formula__isnull=False)
        .values_list('staff_id', flat=True)
    )
    # Only run legacy joining detail for non-formula staff
    non_formula_staff_objs = [s for s in staff_objs if s.id not in formula_staff_ids]
    if salary_month and non_formula_staff_objs:
        non_formula_plan = {sid: staff_salary_plan.get(sid, []) for sid in [s.id for s in non_formula_staff_objs]}
        staff_joining_data = get_staff_salary_by_joining_detail(
            self, non_formula_staff_objs, non_formula_plan, salary_start_date, salary_end_date, days
        )
    elif salary_month:
        staff_joining_data = {'staff_list': {}, 'day_list': []}
    else:
        staff_joining_data = None
    for staff_obj in staff_objs:
        staff_id = staff_obj.id
        if staff_id in formula_staff_ids:
            # ─── Formula path (new) ───
            if salary_month:
                salary_data[staff_id] = _formula_salary_data(
                    staff_obj, financial_year, salary_start_date, salary_end_date, days
                )
            else:
                salary_data[staff_id] = _formula_salary_preview(staff_obj, financial_year)
        else:
            # ─── Legacy path (unchanged) ───
            if salary_month:
                salary_data[staff_id] = staff_joining_data['staff_list'][staff_id]
            else:
                salary_data[staff_obj.id] = payroll_calculation.salary_calculate(staff_salary_plan[staff_obj.id])
    response['status_list'] = get_lop_attendance_list()
    response['data'] = salary_data
    response['day_list'] = staff_joining_data['day_list'] if staff_joining_data else []
    return response

def download_staff_salary_bulk(self, month, financial_year):
    staff_list = get_staff_list(self, True)
    staff_ids = staff_list['staff_ids']
    salary_data = generate_salary_employee_plan(self, {
        'financial_year': financial_year, 'salary_month': month,
        'staff_ids': staff_ids
    })['data']
    earning_columns = {}
    deduction_columns = {}
    idx = 0
    for staff in staff_list['data']:
        idx += 1
        staff['sl_no'] = idx
        staff['salary_plan'] = salary_data[staff['id']]
        staff['gross_earnings'] = staff['salary_plan']['gross_earnings']
        staff['gross_deductions'] = staff['salary_plan']['gross_deductions']
        staff['net_pay'] = staff['salary_plan']['net_pay']
        staff['lop_days'] = staff['salary_plan']['lop_days']
        staff['present_days'] = staff['salary_plan']['present_days']
        staff['days'] = staff['salary_plan']['days']
        for salary_plan in staff['salary_plan']['earnings']:
            staff[salary_plan['salary_component_name']] = round(salary_plan['amount'],2)
            earning_columns[salary_plan['salary_component_name']] = salary_plan
        for salary_plan in staff['salary_plan']['deductions']:
            staff[salary_plan['salary_component_name']] = round(salary_plan['amount'],2)
            deduction_columns[salary_plan['salary_component_name']] = salary_plan
    options={}
    options['title'] = 'Payroll Report'
    options['description'] = 'Payroll Report'
    options['extraWorksheet'] = False
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Name', 'required': False, 'schemacolumn': 'full_name'
        },
    ]
    for index in earning_columns:
        earning_column = earning_columns[index]
        options['columns'].append(
            {
                'column': earning_column['salary_component_name'], 'required': False, 'schemacolumn': earning_column['salary_component_name']
            }
        )
    options['columns'].append({
        'column': 'Present Days', 'required': False, 'schemacolumn': 'present_days'
    })
    options['columns'].append({
        'column': 'Lop Days', 'required': False, 'schemacolumn': 'lop_days'
    })
    options['columns'].append({
        'column': 'Days', 'required': False, 'schemacolumn': 'days'
    })
    options['columns'].append({
        'column': 'Gross', 'required': False, 'schemacolumn': 'gross_earnings'
    })
    for index in deduction_columns:
        deduction_column=deduction_columns[index]
        options['columns'].append(
            {
                'column': deduction_column['salary_component_name'], 'required': False, 'schemacolumn': deduction_column['salary_component_name']
            }
        )
    options['columns'].append({
        'column': 'Total DED', 'required': False, 'schemacolumn': 'gross_deductions'
    })
    options['columns'].append({
        'column': 'NET Salary', 'required': False, 'schemacolumn': 'net_pay'
    })
    options['Data'] = staff_list['data']
    return write_to_excel_new(self, options, {}, {})

def add_salary_employee_plan(self, data):
    financeYear = FinancialYear.objects.get(id=data['financial_year'])
    staff = Staff.objects.get(id=data['staff'])
    user = self.request.user.pk if self.request.user.pk else None
    if financeYear.end_date < staff.date_joined:
        raise exceptions.ValidationError('Invalid financial year for the staff to plan salary.')
    if staff.date_left and staff.date_left < datetime.today().date():
        raise exceptions.ValidationError('Cannot plan the salary for the staff.')
    if self.get_queryset().filter(staff=data['staff'], is_approved=True, from_date__gte=financeYear.start_date,
                                  to_date__lte=financeYear.end_date):
        raise exceptions.ValidationError('Salary Plan is already approved.')
    SharedService.duplicate_list_one_object(data['salary_plan'], 'salary_component')
    dataList = list()
    grossEarnings = grossDeductions = 0.0
    salary_component = dict(SalaryComponent.objects.filter(is_active=True).values_list('id', 'is_deduction'))
    
    use_formula = data.get('use_formula', False)
    formula_id = data.get('formula', None)

    for salary_plan in data['salary_plan']:
        if not float(salary_plan['amount']) and not use_formula:
            raise exceptions.ValidationError(f'Salary Amount should be greater than 0.')
        if salary_component[salary_plan['salary_component']]:
            grossDeductions += float(salary_plan['amount'])
        else:
            grossEarnings += float(salary_plan['amount'])
        if salary_plan['is_approved']:
            salary_plan['salary_plan_approved_date'] = datetime.today().date()
        dataList.append({**salary_plan, **{'staff': data['staff'], 'from_date': financeYear.start_date,
                                           'to_date': financeYear.end_date, 'approved_user': user}})
    if use_formula:
        for item in dataList:
            item['use_formula'] = True
            item['formula'] = formula_id
    else:
        if (staff.salary != grossEarnings) or ((staff.salary - grossDeductions) != (grossEarnings - grossDeductions)):
            raise exceptions.ValidationError(f'Salary Plan is not matching the fixed pay of the employee.')
    response = SharedService.add_data(self, dataList)
    return response


def add_salary_employee_month_plan(self, data):
    SharedService.duplicate_list_one_object(data['salary_plan'], 'salary_component')
    start_date = salary_month = datetime.strptime(data['salary_month'], "%Y-%m").date()
    days, end_date = SharedService.last_day_of_month(salary_month, True)
    staff = Staff.objects.get(id=data['staff'])
    account = AccountDetail.objects.filter(staff=staff, is_active=True).first()
    # if not account:
    #     raise exceptions.ValidationError('Bank account details is not exist(s).')
    if self.get_queryset().filter(salary_month=start_date, staff=staff).exists():
        raise exceptions.ValidationError('Salary is already paid for the month.')
    if SharedService.get_month_difference_for_two_dates(start_date, datetime.today().date()) >= 0:
        raise exceptions.ValidationError('Cannot pay the salary for the current/later month(s).')
    if staff.date_joined and SharedService.get_month_difference_for_two_dates(staff.date_joined, start_date) > 0:
        raise exceptions.ValidationError('Cannot pay the salary to the staff for the earlier month(s).')
    if staff.date_left and SharedService.get_month_difference_for_two_dates(start_date, staff.date_left) > 0:
        raise exceptions.ValidationError('Cannot pay the salary to the staff for the later month(s).')
    salary = SalaryEmployeePlan.objects.filter(staff=data['staff'], is_approved=True, from_date__lte=start_date,
                                               to_date__gte=start_date)
    if not salary:
        raise exceptions.ValidationError('Salary plan is not exists.')

    # ─── Formula path: delegate to formula engine ───
    uses_formula = salary.filter(use_formula=True, formula__isnull=False).exists()
    if uses_formula:
        year = salary_month.year
        month_num = salary_month.month
        # Auto-compute attendance
        try:
            att = compute_staff_attendance(staff.id, year, month_num)
            working_days = att.get('working_days', days)
            present_days = att.get('present_days', days)
        except Exception:
            working_days = days
            present_days = days
        # Determine financial year
        fy = salary.first().from_date
        fy_obj = FinancialYear.objects.filter(
            start_date__lte=salary_month, end_date__gte=salary_month
        ).first()
        fy_id = fy_obj.id if fy_obj else None
        if not fy_id:
            raise exceptions.ValidationError('Financial year not found for salary month.')
        records = run_formula_engine(
            staff.id, fy_id, year, month_num,
            working_days, present_days, user=self.request.user if hasattr(self, 'request') and self.request.user else None
        )
        response = {
            'Reason': f'Generated {len(records)} formula-based records.',
            'data': SalaryEmployeeMonthPlanSerializer(records, many=True).data,
        }
        SharedService.custom_thread(add_salary_employee_month_plan_notification, self, staff, data, salary_month)
        return response

    # ─── Legacy path (unchanged) ───
    serializer = SalaryEmployeePlanSerializer(salary, many=True)
    salary_data_dict = {d['salary_component']: d for d in serializer.data}
    salary_resposne = get_staff_salary_by_joining_detail(self, [staff], {staff.id: serializer.data}, start_date,
                                                                                end_date, days)
    days = salary_resposne['staff_list'][staff.id]['staff_days']
    start_date = salary_resposne['staff_list'][staff.id]['start_date']
    end_date = salary_resposne['staff_list'][staff.id]['end_date']

    data_list = list()
    def add_salary(salary_plan):
        salary_plan['lop'] = salary_plan['lop_days']
        if salary_plan['salary_component'] not in salary_data_dict:
            raise exceptions.ValidationError('salary component is mismatching.')
        data_list.append({'salary_month': salary_month, 'account': account.pk if account else None,
                         **salary_data_dict[salary_plan['salary_component']]})
    for salary_plan in salary_resposne['staff_list'][staff.id]['earnings']:
        add_salary(salary_plan)
    for salary_plan in salary_resposne['staff_list'][staff.id]['deductions']:
        add_salary(salary_plan)
    response = SharedService.add_data(self, data_list)
    # mark_absent_for_unmarked_in_month(self, data['staff'], start_date, end_date)
    SharedService.custom_thread(add_salary_employee_month_plan_notification, self, staff, data, salary_month)
    return response


def add_salary_employee_month_plan_notification(self, staff, data, salary_month):
    customized_data = []
    self.kwargs['pk'] = data['staff']
    filename, salary = payroll.get_payslip(self, salary_month, True, True)
    url = UploadTypeService.upload_local_file(filename, path='PaySlips')
    notification_obj = NotificationBodyTemplate('salaryemployeemonthplan_create')
    temp = {
        'salary_month': salary_month.strftime('%B'),
        'salary_month_year': salary_month.year,
        'staff_name': staff.first_name,
        'amount': SharedService.format_amount(salary['salary']['net_pay'])
    }
    user_id = staff.users.id
    if staff.email:
        body_email = notification_obj.select_template('email', temp)
        customized_data.append(
            {   'email': staff.email, 'email_subject': None, 'user_id': user_id, 'email_body': body_email,
                'attachmentLinks':[{'url': url, 'file_name': filename.split('.')[0]}],'email_notification':1
            }
        )
    if staff.mobile_num:
        body_sms = notification_obj.select_template('sms', temp)
        customized_data.append(
            {'mobile_number': staff.mobile_num, 'user_id': user_id, 'sms_body': body_sms, 'sms_notification': 1}
        )
    body_push = notification_obj.select_template('push',  temp)
    customized_data.append({
            'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user_id, 'extra_params': {}
    })
    send_notification('salaryemployeemonthplan_create', customizedData=customized_data)


def generate_salary_employee_month_plan(self):
    staff_id = self.request.GET.get('staff')
    salary_month = self.request.GET.get('salary_month')
    financial_year = self.request.GET.get('financial_year')
    if not financial_year:
        for_date = datetime.strptime(salary_month, "%Y-%m").date()
        fy_instance = FinancialYear()
        financial_year_data = fy_instance.get_financial_year_for_date(for_date)
        if not financial_year_data:
            raise exceptions.ValidationError("Financial year not found for the given date.")
        financial_year = financial_year_data.get('id')
    start_date = datetime.strptime(self.request.GET.get('salary_month'), "%Y-%m").date()
    salary_data = generate_salary_employee_plan(self, {
        'financial_year': financial_year, 'salary_month': salary_month, 
        'staff_ids': [staff_id]
    })['data'][int(staff_id)]
    staff = Staff.objects.get(id=staff_id)
    staff_serializer = StaffAllDetailSerializer(staff).data
    queryset = self.get_queryset().filter(staff=staff_id, salary_month=start_date)
    first_record = queryset.first()
    account = AccountDetailSerializer(first_record.account).data if first_record and first_record.account else {}
    institute_serializer = InstituteSerializer(Institute.get_institute(self))
    return {'data': salary_data, 'staff_details': staff_serializer,
            'institute': institute_serializer.data, 'account_detail': account}
