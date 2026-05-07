import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.payroll.models.payroll import SalaryComponent

client = Client()


class SalaryComponentViewSetTest(TestCase):

    def setUp(self):
        self.salary_component = SalaryComponent.objects.create(name='Basic Pay')

    def test_get_all_salarycomponent_pos(self):
        # get API response
        response = client.get(reverse('salarycomponent-list'))
        data = [{'id': self.salary_component.pk, 'name': 'Basic Pay', 'codename': None, 'is_deduction': False, 'is_active': True}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_salarycomponent_neg(self):
        # get API response
        response = client.get(reverse('salarycomponent-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_salarycomponent_pos(self):
        # get API response
        response = client.get(reverse('salarycomponent-detail', kwargs={'pk': self.salary_component.pk}))
        data = {'id': self.salary_component.pk, 'name': 'Basic Pay', 'codename': None, 'is_deduction': False, 'is_active': True}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salarycomponent_pos(self):
        valid_payload = {'salary_components': [{'name': 'HRA'}]}
        response = client.post(reverse('salarycomponent-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_salarycomponent_neg(self):
        invalid_payload = {'salary_components': [{'name': 'Basic Pay'}]}
        response = client.post(reverse('salarycomponent-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'Salary name is already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_salarycomponent_pos(self):
        valid_payload = {'name': 'HRA'}
        response = client.put(reverse('salarycomponent-detail', kwargs={'pk': self.salary_component.pk}),
                              data=json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_salarycomponent_neg(self):
        invalid_payload = {'name': ''}
        response = client.put(reverse('salarycomponent-detail', kwargs={'pk': self.salary_component.pk}),
                              data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_salarycomponent_pos(self):
        response = client.delete(reverse('salarycomponent-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
