from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.payroll.tests.salary_data import add_salary_data

client = Client()


class SalaryEmployeeYearPlanViewSetTest(TestCase):

    def setUp(self):
        add_salary_data(self)
        self.maxDiff = None

    def test_get_salaryemployeeyearplan_pos(self):
        # get API response
        response = client.get(reverse('salaryemployeeyearplan-list'),
                              {'staff': self.staff1.pk, 'financial_year': self.financial_year.pk})
        data = {'total_gross_earnings': 10000.0, 'total_gross_deductions': 0.0, 'total_net_pay': 10000.0,
                'total_salary_plan': [{'salary_month': datetime(2020, 6, 1).date(), 'salary_plan': {'earnings': [
                    {'id': self.semp.pk, 'staff': self.staff1.pk, 'salary_component': self.salary_component.pk,
                     'amount': 10000.0, 'salary_month': datetime(2020, 6, 1).date(),
                     'salary_date': datetime.today().date(), 'is_deduction': False,
                     'salary_component_name': 'Basic Pay'}], 'deductions': [], 'gross_earnings': 10000.0,
                    'gross_deductions': 0.0, 'net_pay': 10000.0}}]}
        response.data['data']['total_salary_plan'] = list(response.data['data']['total_salary_plan'])
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salaryemployeeyearplan_neg(self):
        # get API response
        response = client.get(reverse('salaryemployeeyearplan-list'),
                              {'staff': self.staff2.pk, 'financial_year': self.financial_year.pk})
        data = {'total_gross_earnings': 0.0, 'total_gross_deductions': 0.0, 'total_net_pay': 0.0,
                'total_salary_plan': []}
        response.data['data']['total_salary_plan'] = list(response.data['data']['total_salary_plan'])
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
