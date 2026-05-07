import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.general.models import Event
from apps.general.tests.event_data import add_event_data, event_data, valid_payload, invalid_payload

client = Client()


class EventViewSetTest(TestCase):

    def setUp(self):
        add_event_data(self)
        self.event_data = event_data(self)
        self.valid_payload = valid_payload(self)
        self.invalid_payload = invalid_payload(self)

    def test_get_all_event_pos(self):
        # get API response
        response = client.get(reverse('event-list'), {'is_active': True})
        self.assertEqual(list(response.data['data']), [self.event_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_event_neg(self):
        # get API response
        response = client.get(reverse('event-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_event_pos(self):
        # get API response
        response = client.get(reverse('event-detail', kwargs={'pk': self.event.pk}))
        self.assertEqual(response.data['data'], self.event_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_event_pos(self):
        response = client.post(reverse('event-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_event_neg(self):
        response = client.post(reverse('event-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Event School day has conflicts! for Standard 1 A from 2020-06-01 to '
                                           '2020-06-01 and from 09:00:00 to 10:00:00')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_pos(self):
        response = client.put(reverse('event-detail', kwargs={'pk': self.event.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_neg(self):
        self.event = Event.objects.create(name='extra', place='school', description='school day',
                                          type=self.event_type, from_date='2020-06-01', to_date='2020-06-01',
                                          start_time='1:00', end_time='2:00', alternate_contact='9876543210')
        response = client.put(reverse('event-detail', kwargs={'pk': self.event.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Event School day has conflicts! for Standard 1 A from 2020-06-01 to '
                                           '2020-06-01 and from 09:00:00 to 10:00:00')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_event_pos(self):
        response = client.delete(reverse('event-detail', kwargs={'pk': self.event.pk}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
