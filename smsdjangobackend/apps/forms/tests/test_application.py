import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.forms.tests.application_data import (application_full_data, application_data, add_application_data,
                                               valid_payload, invalid_payload)

client = Client()


class ApplicationStudentViewSetTest(TestCase):

    def setUp(self):
        add_application_data(self)
        self.application_data = application_data(self)
        self.getapplication_data = application_full_data(self)
        self.valid_payload = valid_payload(self)
        self.invalid_payload = invalid_payload(self)

    def test_get_all_application_pos(self):
        # get API response
        response = client.get(reverse('application-list'))
        self.assertEqual(list(response.data['data']), [self.application_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_application_neg(self):
        # get API response
        response = client.get(reverse('application-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_application_pos(self):
        # get API response
        response = client.get(reverse('application-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.application_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getapplication_pos(self):
        # get API response
        response = client.get(reverse('getapplication-list'))
        self.assertEqual(list(response.data['data']), [self.getapplication_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getapplication_neg(self):
        # get API response
        response = client.get(reverse('getapplication-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getapplication_pos(self):
        # get API response
        response = client.get(reverse('getapplication-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.getapplication_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getapplicationforadmission_pos(self):
        # get API response
        response = client.get(reverse('getapplicationforadmission-list'), {'search': 'Student'})
        data = [{'first_name': 'Student', 'application_num': 'application1'}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getapplicationforadmission_pos(self):
        # get API response
        response = client.get(
            reverse('getapplicationforadmission-detail', kwargs={'application_num': 'application1'}))
        self.assertEqual(response.data['data'], self.getapplication_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_application_pos(self):
        response = client.post(reverse('application-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'],
                         f'Application form successfully created! Application # : application{response.data["data"]["id"]}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_application_neg(self):
        response = client.post(reverse('application-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['non_field_errors'][0],
                         'Student with same Name and Date of birth already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_application_pos(self):
        self.valid_payload['student_detail']['id'] = self.asd.pk
        self.valid_payload['parent_detail']['id'] = self.apd.pk
        self.valid_payload['guardian_detail']['id'] = self.agd.pk
        self.valid_payload['student_address']['current_address']['id'] = self.asa.pk
        response = client.put(reverse('application-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Application form successfully updated!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_application_neg(self):
        self.invalid_payload['student']['first_name'] = ''
        response = client.put(reverse('application-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['first_name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_application_pos(self):
        response = client.delete(reverse('application-detail', kwargs={'pk': self.student.pk}),
                                 data=json.dumps([self.student.pk]), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_enquiry_neg(self):
        response = client.delete(reverse('application-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data[0], 'No data is selected to delete.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
