import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.bdu.models import BduValidationClass, BduValidation

client = Client()


class BduValidationClassViewSetTest(TestCase):

    def setUp(self):
        self.bdu_validation_class = BduValidationClass.objects.get(id=3)

    def test_get_all_bdu_validation_class_pos(self):
        # get API response
        response = client.get(reverse('bduvalidationclass-list'))
        data = [{'id': 1, 'validation_type': 'None', 'error_message': None},
                {'id': 2, 'validation_type': 'Date (DD-MM-YYYY)', 'error_message': None},
                {'id': 3, 'validation_type': 'Is mobile', 'error_message': None},
                {'id': 4, 'validation_type': 'Date (YYYY-MM-DD)', 'error_message': None},
                {'id': 5, 'validation_type': 'Datetime (YYYY-MM-DD H:M:S)', 'error_message': None},
                {'id': 6, 'validation_type': 'None', 'error_message': None},
                {'id': 7, 'validation_type': 'Min length', 'error_message': None},
                {'id': 8, 'validation_type': 'Max length', 'error_message': None},
                {'id': 9, 'validation_type': 'duplicate in Sheet', 'error_message': None},
                {'id': 10, 'validation_type': 'custom Regex', 'error_message': None}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_bdu_validation_class_pos(self):
        # get API response
        response = client.get(reverse('bduvalidationclass-detail', kwargs={'pk': 3}))
        data = {'id': 3, 'validation_type': 'Is mobile', 'error_message': None}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_bdu_validation_class_pos(self):
        valid_payload = [{'validation_type': 'Is email', 'error_message': 'enter a valid email'}]
        response = client.post(reverse('bduvalidationclass-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_bdu_validation_class_neg(self):
        invalid_payload = [{'validation_type': 'Is mobile', 'error_message': 'enter a valid mobile #'}]
        response = client.post(reverse('bduvalidationclass-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['validation_type'][0], 'Validation type is already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_bdu_validation_class_pos(self):
        valid_payload = {'validation_type': 'Is email', 'error_message': None}
        response = client.put(reverse('bduvalidationclass-detail', kwargs={'pk': 4}), data=json.dumps(valid_payload),
                              content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_bdu_validation_class_neg(self):
        invalid_payload = {'validation_type': 'Is mobile', 'error_message': 'enter a valid mobile #'}
        response = client.put(reverse('bduvalidationclass-detail', kwargs={'pk': 4}), data=json.dumps(invalid_payload),
                              content_type='application/json')
        self.assertEqual(response.data['validation_type'][0], 'Validation type is already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_bdu_validation_class_pos(self):
        response = client.delete(reverse('bduvalidationclass-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_bdu_validation_class_neg(self):
        BduValidation.objects.create(bdu_validation_class=self.bdu_validation_class, validation_value='validation')
        response = client.delete(reverse('bduvalidationclass-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data[0], 'Cannot delete some instances of data are referenced.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
