import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Subject

client = Client()


class GetSubjectViewSetTest(TestCase):
    """ Test module for GET all Subjects"""

    def setUp(self):
        self.kannada = Subject.objects.create(name='Kannada')
        self.english = Subject.objects.create(name='English')
        self.maths = Subject.objects.create(name='Maths', is_active=False)

    def test_get_all_subject_pos(self):
        # get API response
        response = client.get(reverse('subject-list'), {'is_active': True})
        data = [{'id': self.kannada.pk, 'name': 'Kannada'}, {'id': self.english.pk, 'name': 'English'}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_subject_pos(self):
        response = client.get(reverse('subject-detail', kwargs={'pk': self.kannada.pk}))
        data = {'id': self.kannada.pk, 'name': 'Kannada'}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_subject_neg(self):
        self.maths.delete()
        response = client.get(reverse('subject-detail', kwargs={'pk': self.maths.pk}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreateSubjectViewSetTest(TestCase):
    """ Test module for POST Subjects"""

    def setUp(self):
        self.valid_payload = {'subjects': [{'name': 'Kannada'}, {'name': 'English'}]}
        self.invalid_payload = {'subjects': [{'name': ''}, {'name': 'English'}]}

    def test_create_subject_pos(self):
        response = client.post(reverse('subject-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_subject_neg(self):
        response = client.post(reverse('subject-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateSubjectViewSetTest(TestCase):

    def setUp(self):
        self.kannada = Subject.objects.create(name='Kannada')
        self.valid_payload = {'name': 'Maths'}
        self.invalid_payload = {'name': ''}

    def test_update_subject_pos(self):
        response = client.put(reverse('subject-detail', kwargs={'pk': self.kannada.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_subject_neg(self):
        response = client.put(reverse('subject-detail', kwargs={'pk': self.kannada.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class DeleteSubjectViewSetTest(TestCase):

    def setUp(self):
        self.kannada = Subject.objects.create(name='Kannada')

    def test_delete_subject_pos(self):
        response = client.delete(reverse('subject-detail', kwargs={'pk': self.kannada.pk}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_subject_neg(self):
        response = client.delete(reverse('subject-detail', kwargs={'pk': self.kannada.pk + 1}))
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
