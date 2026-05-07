from django.db import transaction
from rest_framework import exceptions

from apps.shared.models.custom import FormDefinition
from apps.shared.services import FormdefinitionService, SharedService
from apps.tenants.services.middlewares import get_current_db_name


def salary_plan_cycle_check(self, plan, salary, component, planDict):
    if plan['is_amount'] or (not plan['percentage_of']):
        planDict.update({plan['salary_component']: plan})
        return
    if plan['percentage_of'] in component:
        raise exceptions.ValidationError('Salary Component(s) are pointing to each other.')
    if plan['percentage_of'] not in salary:
        raise exceptions.ValidationError('please select a valid percentage salary component.')
    component.append(plan['salary_component'])
    salary_plan_cycle_check(self, salary[plan['percentage_of']], salary, component, planDict)
    planDict.update({plan['salary_component']: plan})


def salary_plan_add_update(self, data):
    salaryPlan = dict()
    for plan in data['salary_plan']:
        value = 'amount'
        if not plan['is_amount']:
            value = 'percentage'
            if float(plan['rate']) > 100:
                raise exceptions.ValidationError('Enter a valid percentage.')
        if float(plan['rate']) <= 0:
            raise exceptions.ValidationError(f'Enter a valid {value}.')
        plan.update({'financial_year': data['financial_year']})
        salaryPlan.update({plan['salary_component']: plan})
    SharedService.duplicate_list_two_objects(data['salary_plan'], 'financial_year', 'salary_component')
    planDict = dict()
    for plan in data['salary_plan']:
        salaryComponent = [plan['salary_component']]
        salary_plan_cycle_check(self, plan, salaryPlan, salaryComponent, planDict)
    with transaction.atomic(using=get_current_db_name()):
        self.get_queryset().filter(financial_year=data['financial_year']).delete()
        serializer = self.get_serializer(data=list(planDict.values()), many=True, remove_fields=['percentage_of'])
        serializer.is_valid(raise_exception=True)
        for plan in planDict.values():
            try:
                salary = self.get_queryset().get(financial_year=plan['financial_year'],
                                                 salary_component=plan['percentage_of'])
                plan.update({'percentage_of': salary.pk})
            except:
                plan.update({'percentage_of': None})
            SharedService.add_data(self, plan, False)
    return {'Reason': 'Data added Successfully!'}


def get_formatted_component(data):
    earnings = list()
    deductions = list()
    for component in data:
        if component['is_deduction']:
            deductions.append(component)
        else:
            earnings.append(component)
    return {'data': {'earnings': earnings, 'deductions': deductions}}


def get_salary_plan(self):
    response = SharedService.read_data(self, True)
    if self.request.query_params.get('formatted'):
        return get_formatted_component(response['data'])
    return response

#send lop days for attendance_days_per_month formdefintion
def salary_calculate(data, month=False, total_days=0, working_days=0):
    gross_earnings = gross_deductions = 0.0
    data_list = {'earnings': list(), 'deductions': list()}
    day_calculation = total_days > 0
    for component in data:
        component['lop_days'] = total_days - working_days
        if month:
            component['amount'] = component['amount'] / 12
            if day_calculation and (not component['is_fixed_deduction'] or not component['is_deduction']):
                component['amount'] = (component['amount'] / total_days) * working_days
        else:
            component['amount'] = component['amount']
        if component['is_deduction']:
            data_list['deductions'].append(component)
            gross_deductions += component['amount']
        else:
            data_list['earnings'].append(component)
            gross_earnings += component['amount']
    data_list['gross_earnings'] = round(gross_earnings)
    data_list['gross_deductions'] = round(gross_deductions)
    data_list['net_pay'] = round(gross_earnings - gross_deductions)
    return data_list


def generate_salary_plan(self):
    if not self.request.GET.get('staff'):
        raise exceptions.ValidationError('staff is required.')
    queryset = self.get_queryset()
    serializer = self.get_serializer(queryset, many=True)
    return {'data': salary_calculate(serializer.data)}
