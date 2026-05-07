from rest_framework import exceptions

from apps.payroll.services.payroll_calculation import get_formatted_component
from apps.shared.services import SharedService

LOP_CODENAME = 'lop'
SALARY_COMPONENT_CODENAME = ['basicpay', 'hra', 'pf', 'pt', 'lop']


def add_salary_component(self, data):
    dataList = list()
    for component in data['earnings']:
        dataList.append({**component, 'is_deduction': False})
    for component in data['deductions']:
        dataList.append({**component, 'is_deduction': True})
    SharedService.duplicate_list_one_object(dataList, 'name')
    response = SharedService.add_data(self, dataList)
    return response


def update_salary_component(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(codename__in=SALARY_COMPONENT_CODENAME):
        raise exceptions.ValidationError('Cannot update the salary component.')
    if queryset.filter(salary_plan_salary_component__isnull=True, salary_employee_plan_salary_component__isnull=True,
                       salary_employee_month_plan_salary_component__isnull=True):
        return SharedService.update_data(self, data, **kwargs)
    raise exceptions.ValidationError('Cannot update some instances of data are referenced.')


def get_salary_component(self):
    response = SharedService.read_data(self, True)
    if self.request.query_params.get('formatted'):
        return get_formatted_component(response['data'])
    return response


def delete_salary_component(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(codename__in=SALARY_COMPONENT_CODENAME):
        raise exceptions.ValidationError('Cannot delete the salary component.')
    if self.queryset.filter(salary_plan_salary_component__isnull=True, salary_employee_plan_salary_component__isnull=True,
                            salary_employee_month_plan_salary_component__isnull=True):
        return SharedService.soft_delete_data(self)
    raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
