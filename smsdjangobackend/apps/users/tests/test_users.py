import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.users.models import User

client = Client()


class UserViewSetTest(TestCase):

    def setUp(self):
        self.users = User.objects.create(username='User', password='password')

    def test_get_all_users_pos(self):
        # get API response
        response = client.get(reverse('users-list'))
        data = [{'id': self.users.pk, 'username': 'User'}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_users_neg(self):
        # get API response
        response = client.get(reverse('users-list'), {'is_active': False})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_users_permission_pos(self):
        # get API response
        response = client.get(reverse('users-detail', kwargs={'pk': self.users.pk}))
        data = {'user_permissions': [], 'groups': []}
        self.assertEqual(response.data['data']['user'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_users_permission_pos(self):
        valid_payload = {'user_permissions': ['visible_subjects_add', 'visible_subjects_delete']}
        response = client.patch(reverse('users-detail', kwargs={'pk': self.users.pk}),
                                data=json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_users_permission_neg(self):
        invalid_payload = {'user_permissions': ['visible_subjects_add', 'visible_subjects_add']}
        response = client.patch(reverse('users-detail', kwargs={'pk': self.users.pk}),
                                data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Duplicate user_permissions found!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_users_pos(self):
        response = client.delete(reverse('users-detail', kwargs={'pk': self.users.pk}))
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
