import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Section

client = Client()


class GetSectionViewSetTest(TestCase):
    """ Test module for GET all section"""

    def setUp(self):
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B', is_active=False)
        self.c = Section.objects.create(name='C')

    def test_get_all_section_pos(self):
        # get API response
        response = client.get(reverse('section-list'), {'is_active': True})
        # get data from db
        data = [{'id': self.a.pk, 'name': 'A'}, {'id': self.c.pk, 'name': 'C'}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_section_pos(self):
        response = client.get(reverse('section-detail', kwargs={'pk': self.a.pk}))
        data = {'id': self.a.pk, 'name': 'A'}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_section_neg(self):
        self.c.delete()
        response = client.get(reverse('section-detail', kwargs={'pk': self.c.pk}))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class CreateSectionViewSetTest(TestCase):
    """ Test module for POST section"""

    def setUp(self):
        self.valid_payload = {'sections': [{'name': 'A'}, {'name': 'B'}]}
        self.invalid_payload = {'sections': [{'name': ''}, {'name': 'B'}]}

    def test_create_section_pos(self):
        response = client.post(reverse('section-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_section_neg(self):
        response = client.post(reverse('section-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateSectionViewSetTest(TestCase):

    def setUp(self):
        self.a = Section.objects.create(name='A')
        self.valid_payload = {'name': 'A'}
        self.invalid_payload = {'name': ''}

    def test_update_section_pos(self):
        response = client.put(reverse('section-detail', kwargs={'pk': self.a.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_section_neg(self):
        response = client.put(reverse('section-detail', kwargs={'pk': self.a.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class DeleteSectionViewSetTest(TestCase):

    def setUp(self):
        self.a = Section.objects.create(name='A')

    def test_delete_section_pos(self):
        response = client.delete(reverse('section-detail', kwargs={'pk': self.a.pk}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_section_neg(self):
        response = client.delete(reverse('section-detail', kwargs={'pk': self.a.pk + 1}))
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
