import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard

client = Client()


class GetStandardViewSetTest(TestCase):
    """ Test module for GET all standard"""

    def test_get_all_standard_pos(self):
        # get API response
        response = client.get(reverse('standard-list'), {'is_active': True})
        data = [{'id': 2, 'name': 'Standard 1', 'alias_name': 'Standard 1', 'sequence': 51},
                {'id': 3, 'name': 'Standard 2', 'alias_name': 'Standard 2', 'sequence': 52},
                {'id': 4, 'name': 'Standard 3', 'alias_name': 'Standard 3', 'sequence': 53},
                {'id': 5, 'name': 'Standard 4', 'alias_name': 'Standard 4', 'sequence': 54},
                {'id': 6, 'name': 'Standard 5', 'alias_name': 'Standard 5', 'sequence': 55},
                {'id': 7, 'name': 'Standard 6', 'alias_name': 'Standard 6', 'sequence': 56},
                {'id': 8, 'name': 'Standard 7', 'alias_name': 'Standard 7', 'sequence': 57},
                {'id': 9, 'name': 'Standard 8', 'alias_name': 'Standard 8', 'sequence': 58},
                {'id': 10, 'name': 'Standard 9', 'alias_name': 'Standard 9', 'sequence': 59},
                {'id': 11, 'name': 'Standard 10', 'alias_name': 'Standard 10', 'sequence': 60}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_standard_pos(self):
        response = client.get(reverse('standard-detail', kwargs={'pk': 2}))
        data = {'id': 2, 'name': 'Standard 1', 'alias_name': 'Standard 1', 'sequence': 51}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_standard_neg(self):
        response = client.get(reverse('standard-detail', kwargs={'pk': 100}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreateStandardViewSetTest(TestCase):
    """ Test module for POST standard"""

    def setUp(self):
        self.valid_payload = {'standards': [{'name': 'std1', 'alias_name': 'std1', 'sequence': 61},
                                            {'name': 'std2', 'alias_name': 'std2', 'sequence': 62}]}
        self.invalid_payload = {'standards': [{'name': '', 'alias_name': 'std1', 'sequence': 61},
                                              {'name': 'std2', 'alias_name': 'std2', 'sequence': 62}]}

    def test_create_standard_pos(self):
        response = client.post(reverse('standard-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_standard_neg(self):
        response = client.post(reverse('standard-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateStandardViewSetTest(TestCase):

    def setUp(self):
        self.std1 = Standard.objects.create(name='std1', sequence=61)
        self.valid_payload = {'name': 'std2', 'alias_name': 'std2', 'sequence': 62}
        self.invalid_payload = {'name': '', 'alias_name': 'std2', 'sequence': 62}

    def test_update_standard_pos(self):
        response = client.put(reverse('standard-detail', kwargs={'pk': self.std1.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_standard_neg(self):
        response = client.put(reverse('standard-detail', kwargs={'pk': self.std1.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
