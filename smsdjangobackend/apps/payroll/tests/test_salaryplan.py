import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.institutes.models import FinancialYear
from apps.payroll.models.payroll import SalaryComponent, SalaryPlan

client = Client()


class SalaryPlanViewSetTest(TestCase):

    def setUp(self):
        self.financial_year1 = FinancialYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.financial_year2 = FinancialYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.salary_component1 = SalaryComponent.objects.create(name='Basic Pay')
        self.salary_component2 = SalaryComponent.objects.create(name='PF')
        self.salary_plan = SalaryPlan.objects.create(financial_year=self.financial_year1, rate='10000',
                                                     salary_component=self.salary_component1)
        self.data = {'id': self.salary_plan.pk, 'salary_component_name': 'Basic Pay', 'is_deduction': False,
                     'is_amount': True, 'rate': 10000.0, 'amount': 10000.0, 'financial_year': self.financial_year1.pk,
                     'salary_component': self.salary_component1.pk, 'percentage_of': None,
                     'formula': None, 'use_formula': False,
                     'percentage_of_component_id': 0, 'percentage_component_name': None}
        self.valid_payload = {'financial_year': self.financial_year1.pk, 'salary_plan': [
            {'salary_component': self.salary_component1.pk, 'is_amount': True, 'rate': '10000', 'percentage_of': None}]}
        self.invalid_payload = {'financial_year': self.financial_year1.pk, 'salary_plan': [
            {'salary_component': self.salary_component1.pk, 'is_amount': False, 'rate': '10000',
             'percentage_of': self.salary_component2.pk}]}

    def test_get_all_salaryplan_pos(self):
        # get API response
        response = client.get(reverse('salaryplan-list'))
        self.assertEqual(list(response.data['data']), [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_salaryplan_neg(self):
        # get API response
        response = client.get(reverse('salaryplan-list'), {'financial_year': self.financial_year2.pk})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salaryplan_pos(self):
        # get API response
        response = client.get(reverse('salaryplan-detail', kwargs={'pk': self.salary_plan.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryplan_pos(self):
        self.valid_payload['financial_year'] = self.financial_year2.pk
        response = client.post(reverse('salaryplan-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryplan_neg(self):
        response = client.post(reverse('salaryplan-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'please select a valid percentage salary component.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
