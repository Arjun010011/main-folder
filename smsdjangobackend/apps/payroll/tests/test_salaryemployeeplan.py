import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.payroll.models.payroll import SalaryComponent, SalaryPlan
from apps.payroll.tests.salary_data import add_salary_data

client = Client()


class SalaryEmployeePlanViewSetTest(TestCase):

    def setUp(self):
        add_salary_data(self)
        self.salary_plan = [{'salary_component': self.salary_component.pk, 'amount': 10000.0}]
        self.valid_payload = {'staff': [self.staff2.pk], 'salary_plan': self.salary_plan}
        self.invalid_payload = {'staff': [self.staff1.pk], 'salary_plan': self.salary_plan}

    def test_get_salaryemployeeplan_pos(self):
        # get API response
        response = client.get(reverse('salaryemployeeplan-list'), {'staff': self.staff1.pk})
        data = {'earnings': [
            {'id': self.sep.pk, 'salary_component_name': 'Basic Pay', 'is_deduction': False, 'amount': 10000.0,
             'is_approved': False, 'salary_plan_approved_date': None, 'staff': self.staff1.pk,
             'salary_component': self.salary_component.pk, 'formula': None, 'use_formula': False,
             'is_fixed_deduction': False, 'from_date': self.sep.from_date.isoformat(),
             'to_date': '9999-12-31', 'approved_user': None}], 'deductions': [], 'gross_earnings': 10000.0,
            'gross_deductions': 0.0, 'net_pay': 10000.0}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salaryemployeeplan_neg(self):
        # get API response
        response = client.get(reverse('salaryemployeeplan-list'))
        self.assertEqual(response.data['data'], self.neg_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryemployeeplan_pos(self):
        response = client.post(reverse('salaryemployeeplan-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salaryemployeeplan_neg(self):
        response = client.post(reverse('salaryemployeeplan-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['non_field_errors'][0], 'Salary component is already exists for the Staff.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_salaryemployeeplan_pos(self):
        response = client.delete(reverse('salaryemployeeplan-detail', kwargs={'pk': self.sep.pk}))
        self.assertEqual(response.data['Reason'], 'Data is deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_salaryemployeeplan_neg(self):
        self.sep.is_approved = True
        self.sep.save()
        response = client.delete(reverse('salaryemployeeplan-detail', kwargs={'pk': self.sep.pk}))
        self.assertEqual(response.data[0], 'Data is Approved!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
