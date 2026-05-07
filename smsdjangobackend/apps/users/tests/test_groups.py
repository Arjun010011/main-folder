import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

client = Client()


class GroupViewSetTest(TestCase):

    def test_get_all_groups_pos(self):
        # get API response
        response = client.get(reverse('groups-list'))
        data = [{'id': 2, 'name': 'Admin'}, {'id': 8, 'name': 'Driver'}, {'id': 5, 'name': 'Finance'},
                {'id': 4, 'name': 'Hr'}, {'id': 9, 'name': 'Non Teaching'}, {'id': 3, 'name': 'Principal'},
                {'id': 7, 'name': 'Student'}, {'id': 1, 'name': 'Super Admin'}, {'id': 6, 'name': 'Teacher'}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_groups_pos(self):
        # get API response
        response = client.get(reverse('groups-detail', kwargs={'pk': 1}))
        data = {'id': 1, 'permissions': [], 'name': 'Super Admin'}
        self.assertEqual(response.data['data']['group'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_groups_pos(self):
        valid_payload = {'name': 'group', 'permissions': ['visible_subjects_add', 'visible_subjects_delete']}
        response = client.post(reverse('groups-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_groups_neg(self):
        invalid_payload = {'name': 'Admin', 'permissions': ['visible_subjects_add', 'visible_subjects_delete']}
        response = client.post(reverse('groups-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['name'][0], 'group with this name already exists.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_groups_pos(self):
        valid_payload = {'permissions': ['visible_subjects_add', 'visible_subjects_delete']}
        response = client.patch(reverse('groups-detail', kwargs={'pk': 1}),
                                data=json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_groups_neg(self):
        invalid_payload = {'permissions': [1, 2]}
        response = client.patch(reverse('groups-detail', kwargs={'pk': 1}),
                                data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Please provide proper permissions')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_users_pos(self):
        response = client.delete(reverse('groups-detail', kwargs={'pk': 1}))
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
