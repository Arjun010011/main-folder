import json

from django.contrib.auth.models import Group
from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.users.models import User

client = Client()


class UserGroupViewSetTest(TestCase):

    def setUp(self):
        self.users = User.objects.create(username='User', password='password')
        self.groups = Group.objects.get(id=2)
        self.users.groups.add(self.groups)

    def test_get_all_usergroups_pos(self):
        # get API response
        response = client.get(reverse('usergroups-list'))
        data = [{'id': self.users.pk, 'username': 'User', 'groups': [{'id': 2, 'name': 'Admin'}]}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_usergroups_neg(self):
        # get API response
        response = client.get(reverse('usergroups-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_usergroups_pos(self):
        valid_payload = [{'user': self.users.pk, 'groups': [1, 2, 3]}]
        response = client.post(reverse('usergroups-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_usergroups_neg(self):
        invalid_payload = [{'user': self.users.pk, 'groups': [1, 1]}]
        response = client.post(reverse('usergroups-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], f'Duplicate groups found for user {self.users.pk}')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_usergroups_pos(self):
        valid_payload = {'groups': [1, 2]}
        response = client.patch(reverse('usergroups-detail', kwargs={'pk': self.users.pk}),
                                data=json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_usergroups_neg(self):
        invalid_payload = {'groups': []}
        response = client.patch(reverse('usergroups-detail', kwargs={'pk': self.users.pk}),
                                data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Please provide proper groups')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
