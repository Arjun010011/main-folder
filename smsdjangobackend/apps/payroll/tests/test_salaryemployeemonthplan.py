import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.payroll.tests.salary_data import add_salary_data

client = Client()


class SalaryEmployeePlanViewSetTest(TestCase):

    def setUp(self):
        add_salary_data(self)
        self.salary_plan = [
            {'salary_component': self.salary_component.pk, 'amount': 10000.0, 'salary_month': '2020-06'}]
        self.valid_payload = {'staff': self.staff2.pk, 'salary_plan': self.salary_plan}
        self.invalid_payload = {'staff': self.staff1.pk, 'salary_plan': self.salary_plan}

    def test_get_salaryemployeemonthplan_pos(self):
        # get API response
        response = client.get(reverse('salaryemployeemonthplan-list'),
                              {'staff': self.staff1.pk, 'salary_month': '2020-06'})
        data = {'earnings': [
            {'id': self.semp.pk, 'salary_component_name': 'Basic Pay', 'salary_month': '2020-06-01',
             'amount': '10000.00',
             'staff': self.staff1.pk, 'is_deduction': False, 'salary_date': datetime.today().strftime('%Y-%m-%d'),
             'salary_component': self.salary_component.pk, 'account': None, 'lop': None,
             'is_locked': False, 'lop_amount': None, 'formula': None,
             'formula_snapshot': None, 'formula_version': None,
             'is_active': True, 'created_by': None, 'modified_by': None}],
            'deductions': [], 'gross_earnings': 10000.0,
            'gross_deductions': 0.0, 'net_pay': 10000.0}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salaryemployeemonthplan_neg(self):
        # get API response
        response = client.get(reverse('salaryemployeemonthplan-list'),
                              {'staff': self.staff1.pk, 'salary_month': '2020-07'})
        self.assertEqual(response.data['data'], self.neg_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryemployeemonthplan_pos(self):
        response = client.post(reverse('salaryemployeemonthplan-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryemployeemonthplan_neg(self):
        response = client.post(reverse('salaryemployeemonthplan-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['non_field_errors'][0], 'Salary component is already exists for the Staff.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
