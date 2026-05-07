import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.finance.models import FeeType

client = Client()


class GetFeeTypeViewSetTest(TestCase):

    def test_get_all_feetypes_pos(self):
        # get API response
        response = client.get(reverse('addfeetypes-list'))
        data = [
            {
                'id': 1,
                'name': 'Admission fee',
                'codename': 'admission',
                'is_feature': False
            },
            {
                'id': 2,
                'name': 'Transport fee',
                'codename': 'transport',
                'is_feature': False
            }
        ]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_feetypes_pos(self):
        response = client.get(reverse('addfeetypes-detail', kwargs={'pk': 1}))
        data = {'id': 1, 'name': 'Admission fee', 'codename': 'admission', 'is_feature': False}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_feetypes_neg(self):
        response = client.get(reverse('addfeetypes-detail', kwargs={'pk': 100}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreateFeeTypeViewSetTest(TestCase):
    """ Test module for POST standard"""

    def setUp(self):
        self.valid_payload = {'feetypes': [{'name': 'fees1'}]}
        self.invalid_payload = {'feetypes': [{'name': 'Admission fee'}]}

    def test_create_feetypes_pos(self):
        response = client.post(reverse('addfeetypes-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_feetypes_neg(self):
        response = client.post(reverse('addfeetypes-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'fee type with this name already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateFeeTypeViewSetTest(TestCase):

    def setUp(self):
        self.feetype = FeeType.objects.create(name='fees1')
        self.valid_payload = {'name': 'fees2'}
        self.invalid_payload = {'name': ''}

    def test_update_feetypes_pos(self):
        response = client.put(reverse('addfeetypes-detail', kwargs={'pk': self.feetype.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_feetypes_neg(self):
        response = client.put(reverse('addfeetypes-detail', kwargs={'pk': self.feetype.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class DeleteFeeTypeViewSetTest(TestCase):

    def setUp(self):
        self.feetype = FeeType.objects.create(name='fees1')

    def test_delete_feetypes_pos(self):
        response = client.delete(reverse('addfeetypes-detail', kwargs={'pk': self.feetype.pk}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_feetypes_neg(self):
        response = client.delete(reverse('addfeetypes-detail', kwargs={'pk': 1}))
        self.assertEqual(response.data[0], 'Fees cant be deleted!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
