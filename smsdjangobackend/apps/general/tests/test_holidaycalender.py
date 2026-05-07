import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.general.models import HolidayCalender
from apps.institutes.models import FinancialYear

client = Client()


class HolidayCalenderViewSetTest(TestCase):

    def setUp(self):
        self.financial_year1 = FinancialYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.financial_year2 = FinancialYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.holiday_calender = HolidayCalender.objects.create(financial_year=self.financial_year1, reason='Festival',
                                                               from_date='2020-06-01', to_date='2020-06-01')
        self.data = {'id': self.holiday_calender.pk, 'from_date': '2020-06-01', 'to_date': '2020-06-01',
                     'reason': 'Festival', 'financial_year': self.financial_year1.pk}

    def test_get_all_holidays_pos(self):
        # get API response
        response = client.get(reverse('holidaycalender-list'), {'financial_year': self.financial_year1.pk})
        self.assertEqual(list(response.data['data']), [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_holidays_neg(self):
        # get API response
        response = client.get(reverse('holidaycalender-list'), {'financial_year': self.financial_year2.pk})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_holidays_pos(self):
        # get API response
        response = client.get(reverse('holidaycalender-detail', kwargs={'pk': self.holiday_calender.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_holidays_pos(self):
        valid_payload = {'financial_year': self.financial_year1.pk,
                         'holidays': [{'reason': 'Holiday', 'from_date': '2020-06-10', 'to_date': '2020-06-10'}]}
        response = client.post(reverse('holidaycalender-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_holidays_neg(self):
        invalid_payload = {'financial_year': self.financial_year1.pk,
                           'holidays': [{'reason': 'holiday', 'from_date': '2020-06-01', 'to_date': '2020-06-01'}]}
        response = client.post(reverse('holidaycalender-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'][0], 'Holiday Festival has conflicts! from 2020-06-01 to 2020-06-01')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_holidays_pos(self):
        response = client.put(reverse('holidaycalender-detail', kwargs={'pk': self.holiday_calender.pk}),
                              data=json.dumps(self.data), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_holidays_neg(self):
        invalid_payload = {'financial_year': self.financial_year1.pk, 'reason': '', 'from_date': '2020-06-01',
                           'to_date': '2020-06-01'}
        response = client.put(reverse('holidaycalender-detail', kwargs={'pk': self.holiday_calender.pk}),
                              data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data['reason'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_holidays_pos(self):
        response = client.delete(reverse('holidaycalender-detail', kwargs={'pk': self.holiday_calender.pk}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
