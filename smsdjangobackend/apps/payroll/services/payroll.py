from datetime import datetime
from itertools import groupby
from operator import itemgetter

from django.db.models import F
from rest_framework import exceptions

from apps.institutes.models import FinancialYear, Institute
from apps.payroll.models.payroll import SalaryEmployeeMonthPlan
from apps.payroll.serializers import SalaryEmployeeMonthPlanSerializer
from apps.payroll.services import payroll_calculation
from apps.payroll.services.payroll_employee import generate_salary_employee_plan, get_staff_day_of_month
from apps.shared.services import SharedService, PDFService
from apps.staffs.models import Staff
from apps.staffs.serializers import AccountDetailSerializer, StaffAllDetailSerializer
from apps.shared.services_shared.common import get_selected_template
from apps.institutes.serializers import InstituteSerializer

def generate_salary_employee_year_plan(self):
    queryset = self.get_queryset()
    if self.request.GET.get('staff'):
        queryset = queryset.filter(staff=self.request.GET.get('staff'))
    if self.request.GET.get('financial_year'):
        financialYear = FinancialYear.objects.get(id=self.request.GET.get('financial_year'))
        queryset = queryset.filter(salary_month__gte=financialYear.start_date,
                                   salary_month__lte=financialYear.end_date).order_by('salary_month')
    elif self.request.GET.get('from_date') and self.request.GET.get('to_date'):
        queryset = queryset.filter(salary_month__gte=self.request.GET.get('from_date'),
                                   salary_month__lte=self.request.GET.get('to_date')).order_by('salary_month')
    else:
        raise exceptions.ValidationError('Incorrect filter option!')
    salaryData = queryset.values('salary_month').distinct()
    salary = queryset.annotate(is_deduction=F('salary_component__is_deduction'),
                               salary_component_name=F('salary_component__name')).values('id', 'staff',
                                                                                         'salary_component', 'amount',
                                                                                         'salary_month', 'salary_date',
                                                                                         'salary_component_name',
                                                                                         'is_deduction')
    rows = groupby(salary, itemgetter('salary_month'))
    monthData = {key: list(items) for key, items in rows}
    grossEarnings = grossDeductions = 0.0
    for items in salaryData:
        items.update({'salary_plan': monthData[items['salary_month']]})
        items['salary_plan'] = payroll_calculation.salary_calculate(items['salary_plan'])
        grossEarnings += items['salary_plan']['gross_earnings']
        grossDeductions += items['salary_plan']['gross_deductions']
    net_pay = grossEarnings - grossDeductions
    return {'data': {'staff_count': queryset.values('staff').distinct().count(), 'total_gross_earnings': grossEarnings,
                     'total_gross_deductions': grossDeductions, 'total_net_pay': net_pay,
                     'total_salary_plan': salaryData}}


def get_payslip(self, salary_month=None, localPath=False, return_json_with_payslip=False):
    response = {}
    staff = Staff.objects.get(id=self.kwargs['pk'])
    staff_serializer = StaffAllDetailSerializer(staff).data
    staff_serializer['date_joined'] = SharedService.date_to_obj(staff_serializer['date_joined'])
    financial_year = self.request.GET.get('financial_year')
    if not financial_year:
        raise exceptions.ValidationError('Financial year is mandatory')
    start_date  = datetime.strptime(salary_month, "%Y-%m").date()
    salary_month_data = datetime.strptime(salary_month, "%Y-%m")
    salary_month_str = salary_month_data.strftime('%B %Y')
    queryset = SalaryEmployeeMonthPlan.objects.filter(staff=self.kwargs['pk'], salary_month=start_date)
    if not queryset:
        raise exceptions.ValidationError('Payslip is not found.')
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    # response = get_staff_day_of_month([staff], start_date, end_date)
    # lop_queryset = queryset.first()
    # lop_days = lop_queryset.lop if lop_queryset.lop else 0
    # present_days = response[staff.id]['staff_days'] - lop_days
    # payroll_data = payroll_calculation.salary_calculate(serializer.data)
    payroll_data = generate_salary_employee_plan(self, {
        'financial_year': financial_year, 'salary_month': salary_month,
        'staff_ids': [self.kwargs['pk']]
    })['data'][int(self.kwargs['pk'])]
    group_name = ' '.join([str(elem['name']) for elem in staff_serializer['users']['groups']])
    data = {'salary': payroll_data, 'today': today,
            'salary_month': salary_month_str, 'institute': Institute.get_institute(self), 'staff': staff_serializer,
            'account_detail': AccountDetailSerializer(queryset.first().account).data, 'group_name': group_name}
    selected_template, number_of_copies = get_selected_template(self, 'payslip', 'pdf', 'paySlip.html')
    path = 'payslip/'+selected_template
    response['institute_data'] = InstituteSerializer(Institute.get_institute(self)).data
    response = PDFService.receipt_new(self, data, "payslip", path, False)
    if return_json_with_payslip:
        return response, data
    return response


def get_payslip_month(self):
    months = self.get_queryset().filter(staff=self.kwargs['pk']).values('salary_month').order_by(
        'salary_month').distinct()
    dataList = list()
    for month in months:
        dataList.append(
            {'id': month['salary_month'].strftime('%Y-%m'), 'name': month['salary_month'].strftime('%b - %Y')})
    return {'data': dataList}
