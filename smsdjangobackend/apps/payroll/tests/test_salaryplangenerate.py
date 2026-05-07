from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.payroll.tests.salary_data import add_salary_data

client = Client()


class SalaryPlanGenerateViewSetTest(TestCase):

    def setUp(self):
        add_salary_data(self)

    def test_get_salaryplangenerate_pos(self):
        # get API response
        response = client.get(reverse('salaryplangenerate-list'), {'financial_year': self.financial_year.pk,
                                                                   'staff': self.staff1.pk})
        data = {'earnings': [
            {'id': self.salary_plan.pk, 'salary_component_name': 'Basic Pay', 'is_deduction': False, 'is_amount': True,
             'rate': 10000.0, 'financial_year': self.financial_year.pk, 'salary_component': self.salary_component.pk,
             'percentage_of': None, 'amount': 10000.0, 'formula': None, 'use_formula': False,
             'percentage_of_component_id': 0, 'percentage_component_name': None}], 'deductions': [],
            'gross_earnings': 10000.0,
            'gross_deductions': 0.0, 'net_pay': 10000.0}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salaryplangenerate_neg(self):
        # get API response
        response = client.get(reverse('salaryplangenerate-list'), {'staff': self.staff1.pk})
        self.assertEqual(response.data['data'], self.neg_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
