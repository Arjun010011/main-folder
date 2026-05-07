import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.institutes.models import Institute

client = Client()


class InstituteViewSetTest(TestCase):

    def setUp(self):
        self.institute = Institute.objects.create(name='Edubricz', code='eb', tel_num='9876543210', company_id=1)
        self.data = {'id': self.institute.pk, 'logo_details': None, 'name': 'Edubricz', 'code': 'eb',
                     'tel_num': '9876543210', 'tel_num_2': '', 'address': '', 'pincode': '', 'type': '',
                     'gstin_num': '', 'board_name': '', 'fax_num': '', 'company_id': 1, 'enquiry_format': 'enquiry',
                     'application_format': 'application', 'admission_format': 'admission', 'country': None,
                     'state': None, 'district': None, 'city': None, 'logo': None}
        self.valid_payload = {
            'institute': {'name': 'School', 'code': 'school', 'tel_num': '9873521626', 'company_id': 1, 'logo': None}}
        self.invalid_payload = {
            'institute': {'name': '', 'code': 'school', 'tel_num': '9873521626', 'company_id': 1, 'logo': None}}

    def test_get_all_institute_pos(self):
        # get API response
        response = client.get(reverse('institute-list'))
        self.assertEqual(response.data['data'], [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_institute_pos(self):
        response = client.get(reverse('institute-detail', kwargs={'pk': self.institute.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_institute_pos(self):
        self.institute.delete()
        response = client.post(reverse('institute-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_institute_neg(self):
        response = client.post(reverse('institute-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Institute details already exists!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_institute_pos(self):
        response = client.put(reverse('institute-detail', kwargs={'pk': self.institute.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_institute_neg(self):
        response = client.put(reverse('institute-detail', kwargs={'pk': self.institute.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
