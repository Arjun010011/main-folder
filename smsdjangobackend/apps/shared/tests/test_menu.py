import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.shared.models import Url

client = Client()


class MenuViewSetTest(TestCase):

    def setUp(self):
        self.urls = Url.objects.create(menu_name='menu')
        self.data = [
            {'id': 1, 'path': None, 'image_url': None, 'alias_name': 'Dashboard', 'parent': 0, 'first_child': 0,
             'next_menu': 2, 'is_active': True, 'new_window': False, 'menu_type': 'web', 'url': 1},
            {'id': 2, 'path': None, 'image_url': None, 'alias_name': 'Admin', 'parent': 0, 'first_child': 3,
             'next_menu': 0, 'is_active': True, 'new_window': False, 'menu_type': 'web', 'url': 2},
            {'id': 3, 'path': '/admin/customize-menu', 'image_url': None, 'alias_name': 'Customize Menu',
             'parent': 2, 'first_child': 0, 'next_menu': 4, 'is_active': True, 'new_window': False,
             'menu_type': 'web', 'url': 3},
            {'id': 4, 'path': '/admin/permissions/view', 'image_url': None, 'alias_name': 'Permission View',
             'parent': 2, 'first_child': 0, 'next_menu': 5, 'is_active': True, 'new_window': False,
             'menu_type': 'web', 'url': 4},
            {'id': 5, 'path': '/admin/permissions/add', 'image_url': None, 'alias_name': 'Permission add',
             'parent': 2, 'first_child': 0, 'next_menu': 6, 'is_active': True, 'new_window': False,
             'menu_type': 'web', 'url': 5}, {'id': 6, 'path': '/admin/assign-groups', 'image_url': None,
                                             'alias_name': 'Here we can view the Assign grops', 'parent': 2,
                                             'first_child': 0, 'next_menu': 0, 'is_active': True,
                                             'new_window': False, 'menu_type': 'web', 'url': 6}]

    def test_get_all_menu_pos(self):
        # get API response
        response = client.get(reverse('menu-list'))
        self.assertEqual(list(response.data['data']), self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_menu_pos(self):
        valid_payload = {'alias_name': 'new menu', 'module': 1, 'main_module_after': 1, 'sub_module_after': 0,
                         'url': self.urls.pk, 'menu_type': 'web'}
        response = client.post(reverse('menu-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_menu_neg(self):
        invalid_payload = {'alias_name': 'new menu', 'module': 1, 'main_module_after': 1, 'sub_module_after': 0,
                           'url': 2, 'menu_type': 'web'}
        response = client.post(reverse('menu-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['url'][0], 'This field must be unique.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_menu_pos(self):
        data = {'menus': self.data, 'deletetable_ids': []}
        response = client.put(reverse('menu-detail', kwargs={'pk': 1}), data=json.dumps(data),
                              content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_menu_pos(self):
        response = client.delete(reverse('menu-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data['Reason'], 'Data Deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
