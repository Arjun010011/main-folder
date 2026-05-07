import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.general.models.event import EventType, Event

client = Client()


class EventTypeViewSetTest(TestCase):

    def setUp(self):
        self.event_type = EventType.objects.create(name='Cultural')
        self.event = Event.objects.create(name='School day', place='school', description='school day',
                                          type=self.event_type, from_date='2020-06-01', to_date='2020-06-01',
                                          start_time='09:00', end_time='09:01')
        self.data = {'id': self.event_type.pk, 'name': 'Cultural', 'is_active': True}
        self.valid_payload = {'event_types': [{'name': 'Sports'}]}
        self.invalid_payload = {'event_types': [{'name': 'Cultural'}]}

    def test_get_all_event_type_pos(self):
        # get API response
        response = client.get(reverse('eventtype-list'))
        self.assertEqual(list(response.data['data']), [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_event_type_neg(self):
        # get API response
        response = client.get(reverse('eventtype-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_event_type_pos(self):
        # get API response
        response = client.get(reverse('eventtype-detail', kwargs={'pk': self.event_type.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_event_type_pos(self):
        response = client.post(reverse('eventtype-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_event_type_neg(self):
        response = client.post(reverse('eventtype-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0]['name'][0], 'Event Type name is already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_type_pos(self):
        response = client.put(reverse('eventtype-detail', kwargs={'pk': self.event_type.pk}),
                              data=json.dumps(self.data), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_event_type_neg(self):
        self.invalid_payload = {'name': ''}
        response = client.put(reverse('eventtype-detail', kwargs={'pk': self.event_type.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['name'][0], 'This field may not be blank.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_event_type_pos(self):
        self.event.delete()
        response = client.delete(reverse('eventtype-detail', kwargs={'pk': self.event_type.pk}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_event_type_neg(self):
        response = client.delete(reverse('eventtype-detail', kwargs={'pk': self.event_type.pk}))
        self.assertEqual(response.data[0], 'Cannot delete some instances of data are referenced.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
