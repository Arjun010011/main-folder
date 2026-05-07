import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.students.tests.student_data import (add_student_data, student_data, student_full_data, valid_payload,
                                              invalid_payload, student_list_data)

client = Client()


class ApplicationStudentViewSetTest(TestCase):

    def setUp(self):
        add_student_data(self)
        self.student_data = student_data(self)
        self.student_full_data = student_full_data(self)
        self.student_list_data = student_list_data(self)
        self.valid_payload = valid_payload(self)
        self.invalid_payload = invalid_payload(self)
        # self.maxDiff = None

    def test_get_all_student_pos(self):
        # get API response
        response = client.get(reverse('student-list'))
        self.assertEqual(list(response.data['data']), [self.student_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_student_neg(self):
        # get API response
        response = client.get(reverse('student-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_student_pos(self):
        # get API response
        response = client.get(reverse('student-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.student_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getallstudents_pos(self):
        # get API response
        response = client.get(reverse('getallstudents-list'))
        self.assertEqual(list(response.data['data']), [self.student_full_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getallstudents_neg(self):
        # get API response
        response = client.get(reverse('getallstudents-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getstudent_pos(self):
        # get API response
        self.student_full_data['admission_year'] = None
        self.student_full_data['admission_num'] = None
        self.student_full_data['admission_date'] = None
        response = client.get(reverse('getallstudents-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.student_full_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_studentlist_pos(self):
        # get API response
        response = client.get(reverse('studentlist-list'), {'is_active': True})
        self.assertEqual(list(response.data['data']), [self.student_list_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_studentlist_neg(self):
        # get API response
        response = client.get(reverse('studentlist-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_studentlist_pos(self):
        # get API response
        response = client.get(reverse('studentlist-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data['data'], self.student_list_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_student_pos(self):
        response = client.post(reverse('studentall-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Student successfully created!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_student_neg(self):
        response = client.post(reverse('studentall-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['non_field_errors'][0],
                         'Student with same Name and Date of birth already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_student_pos(self):
        self.valid_payload['student_detail']['id'] = self.sd.pk
        self.valid_payload['parent_detail']['id'] = self.pd.pk
        self.valid_payload['guardian_detail']['id'] = self.gd.pk
        self.valid_payload['student_address']['current_address']['id'] = self.sa.pk
        response = client.put(reverse('studentall-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Student details updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_student_neg(self):
        self.invalid_payload['student']['first_name'] = ''
        response = client.put(reverse('studentall-detail', kwargs={'pk': self.student.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['first_name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_student_pos(self):
        response = client.delete(reverse('studentall-detail', kwargs={'pk': self.student.pk}),
                                 data=json.dumps([self.student.pk]), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_enquiry_neg(self):
        response = client.delete(reverse('studentall-detail', kwargs={'pk': self.student.pk}))
        self.assertEqual(response.data[0], 'No data is selected to delete.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
