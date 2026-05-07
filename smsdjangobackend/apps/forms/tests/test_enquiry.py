import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.forms.tests.enquiry_data import valid_payload, enquiry_full_data, enquiry_data, add_enquiry_data

client = Client()


class EnquiryStudentViewSetTest(TestCase):

    def setUp(self):
        add_enquiry_data(self)
        self.enquiry_data = enquiry_data(self)
        self.getenquiry_data = enquiry_full_data(self)
        self.valid_payload = valid_payload(self)

    def test_get_all_enquiry_pos(self):
        # get API response
        response = client.get(reverse('enquiry-list'))
        self.assertEqual(list(response.data['data']), [self.enquiry_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_enquiry_neg(self):
        # get API response
        response = client.get(reverse('enquiry-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_enquiry_pos(self):
        # get API response
        response = client.get(reverse('enquiry-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.enquiry_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getenquiry_pos(self):
        # get API response
        response = client.get(reverse('getenquiry-list'))
        self.assertEqual(list(response.data['data']), [self.getenquiry_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getenquiry_neg(self):
        # get API response
        response = client.get(reverse('getenquiry-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getenquiry_pos(self):
        # get API response
        response = client.get(reverse('getenquiry-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.getenquiry_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getenquiryforapplication_pos(self):
        # get API response
        response = client.get(reverse('getenquiryforapplication-list'), {'search': 'Student'})
        data = [{'first_name': 'Student', 'enquiry_num': 'enquiry1'}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getenquiryforapplication_pos(self):
        # get API response
        response = client.get(reverse('getenquiryforapplication-detail', kwargs={'enquiry_num': 'enquiry1'}))
        self.assertEqual(response.data['data'], self.getenquiry_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_enquiry_pos(self):
        response = client.post(reverse('enquiry-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'],
                         f'Enquiry form successfully created! Enquiry # : enquiry{response.data["data"]["id"]}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_enquiry_neg(self):
        self.invalid_payload = {'student': {'first_name': 'Student', 'dob': '1995-11-18'}}
        response = client.post(reverse('enquiry-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['non_field_errors'][0],
                         'Student with same Name and Date of birth already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_enquiry_pos(self):
        self.valid_payload['student_detail']['id'] = self.sd.pk
        response = client.put(reverse('enquiry-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_enquiry_neg(self):
        self.invalid_payload = {'student': {'first_name': '', 'dob': '1995-11-18'}}
        response = client.put(reverse('enquiry-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['first_name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_enquiry_pos(self):
        response = client.delete(reverse('enquiry-detail', kwargs={'pk': self.student.pk}),
                                 data=json.dumps([self.student.pk]), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_enquiry_neg(self):
        response = client.delete(reverse('enquiry-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data[0], 'No data is selected to delete.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
