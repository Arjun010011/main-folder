import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.bdu.tests.bdu_data import add_bdu_data, bdu_data, bdu_full_data, valid_payload, invalid_payload

client = Client()


class BduViewSetTest(TestCase):

    def setUp(self):
        add_bdu_data(self)
        self.bdu_data = bdu_data(self)
        self.bdu_full_data = bdu_full_data(self)
        self.valid_payload = valid_payload(self)
        self.invalid_payload = invalid_payload(self)
        self.maxDiff = None

    def test_get_all_bdu_pos(self):
        # get API response
        response = client.get(reverse('bdu-list'))
        self.assertEqual(list(response.data['data']), [self.bdu_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_bdu_neg(self):
        # get API response
        response = client.get(reverse('bdu-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_bdu_pos(self):
        # get API response
        response = client.get(reverse('bdu-detail', kwargs={'pk': self.bdu.pk}))
        self.assertEqual(response.data['data'], self.bdu_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getbdu_pos(self):
        # get API response
        response = client.get(reverse('getbdu-list'))
        self.assertEqual(list(response.data['data']), [self.bdu_full_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getbdu_neg(self):
        # get API response
        response = client.get(reverse('getbdu-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_getbdu_pos(self):
        # get API response
        response = client.get(reverse('getbdu-detail', kwargs={'pk': self.bdu.pk}))
        self.assertEqual(response.data['data'], self.bdu_full_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_bdu_pos(self):
        response = client.post(reverse('bdu-list'), data=json.dumps([self.valid_payload['bdu']]),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_bdu_neg(self):
        self.invalid_payload['bdu']['name'] = ''
        response = client.post(reverse('bdu-list'), data=json.dumps([self.invalid_payload['bdu']]),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_bdu_pos(self):
        response = client.put(reverse('bdu-detail', kwargs={'pk': self.bdu.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data Updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_bdu_neg(self):

        response = client.put(reverse('bdu-detail', kwargs={'pk': self.bdu.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['non_field_errors'][0], 'Schema Column is exists in BDU.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_bdu_pos(self):
        response = client.delete(reverse('bdu-detail', kwargs={'pk': self.bdu.pk}), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
