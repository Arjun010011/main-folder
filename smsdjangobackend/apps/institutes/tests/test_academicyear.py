import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.institutes.models import AcademicYear

client = Client()


class AcademicYearViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2019-06-01', end_date='2020-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.valid_payload = {'academicyear': {'start_date': '2021-06-01', 'end_date': '2022-04-30'}}
        self.invalid_payload = {'academicyear': {'start_date': '2019-06-01', 'end_date': '2020-04-30'}}

    def test_get_all_academicyear_pos(self):
        # get API response
        response = client.get(reverse('academicyear-list'))
        data = [
            {'id': self.academic_year1.pk, 'start_date': '2019-06-01', 'end_date': '2020-04-30', 'is_active': True},
            {'id': self.academic_year2.pk, 'start_date': '2020-06-01', 'end_date': '2021-04-30', 'is_active': True}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_academicyear_pos(self):
        response = client.get(reverse('academicyear-detail', kwargs={'pk': self.academic_year2.pk}))
        data = {'id': self.academic_year2.pk, 'start_date': '2020-06-01', 'end_date': '2021-04-30', 'is_active': True}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getacademicyear_pos(self):
        # get API response
        response = client.get(reverse('getacademicyear-list'))
        data = [{'id': self.academic_year1.pk, 'name': '2019-2020'},
                {'id': self.academic_year2.pk, 'name': '2020-2021'}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getacademicyear_pos(self):
        response = client.get(reverse('getacademicyear-detail', kwargs={'pk': self.academic_year2.pk}))
        data = {'id': self.academic_year2.pk, 'name': '2020-2021'}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_academicyear_pos(self):
        response = client.post(reverse('academicyear-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Academic year added successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_academicyear_neg(self):
        response = client.post(reverse('academicyear-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Academic year exists!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_academicyear_pos(self):
        response = client.put(reverse('academicyear-detail', kwargs={'pk': self.academic_year2.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Academic year updated successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_academicyear_neg(self):
        response = client.put(reverse('academicyear-detail', kwargs={'pk': self.academic_year2.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Academic year exists!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_academicyear_pos(self):
        response = client.delete(reverse('academicyear-detail', kwargs={'pk': self.academic_year2.pk}))
        self.assertEqual(response.data['Reason'], 'Academic year Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
