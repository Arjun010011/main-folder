import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.institutes.models import FinancialYear

client = Client()


class FinancialYearViewSetTest(TestCase):

    def setUp(self):
        self.financial_year1 = FinancialYear.objects.create(start_date='2019-06-01', end_date='2020-04-30')
        self.financial_year2 = FinancialYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.valid_payload = {'financialyear': {'start_date': '2021-06-01', 'end_date': '2022-04-30'}}
        self.invalid_payload = {'financialyear': {'start_date': '2019-06-01', 'end_date': '2020-04-30'}}

    def test_get_all_financialyear_pos(self):
        # get API response
        response = client.get(reverse('financialyear-list'))
        data = [
            {'id': self.financial_year1.pk, 'start_date': '2019-06-01', 'end_date': '2020-04-30', 'is_active': True},
            {'id': self.financial_year2.pk, 'start_date': '2020-06-01', 'end_date': '2021-04-30', 'is_active': True}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_financialyear_pos(self):
        response = client.get(reverse('financialyear-detail', kwargs={'pk': self.financial_year2.pk}))
        data = {'id': self.financial_year2.pk, 'start_date': '2020-06-01', 'end_date': '2021-04-30', 'is_active': True}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getfinancialyear_pos(self):
        # get API response
        response = client.get(reverse('getfinancialyear-list'))
        data = [{'id': self.financial_year1.pk, 'name': '2019-2020'},
                {'id': self.financial_year2.pk, 'name': '2020-2021'}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getfinancialyear_pos(self):
        response = client.get(reverse('getfinancialyear-detail', kwargs={'pk': self.financial_year2.pk}))
        data = {'id': self.financial_year2.pk, 'name': '2020-2021'}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_financialyear_pos(self):
        response = client.post(reverse('financialyear-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_financialyear_neg(self):
        response = client.post(reverse('financialyear-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Given Date Range Already exist in range $2019-06-01 - $2020-04-30')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_financialyear_pos(self):
        response = client.put(reverse('financialyear-detail', kwargs={'pk': self.financial_year2.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_financialyear_neg(self):
        response = client.put(reverse('financialyear-detail', kwargs={'pk': self.financial_year2.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Given Date Range Already exist in range $2019-06-01 - $2020-04-30')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_financialyear_pos(self):
        response = client.delete(reverse('financialyear-detail', kwargs={'pk': self.financial_year2.pk}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
