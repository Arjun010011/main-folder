import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.shared.models import Url
from apps.shared.models.menu import Menu

client = Client()


class UrlViewSetTest(TestCase):

    def setUp(self):
        self.urls = Url.objects.get(id=3)

    def test_get_all_urlsmenu_pos(self):
        # get API response
        response = client.get(reverse('urlsmenu-list'))
        data = [{'id': 1, 'path': None, 'menu_name': 'Dashboard', 'description': '', 'image_url': None},
                {'id': 2, 'path': None, 'menu_name': 'Admin', 'description': '', 'image_url': None},
                {'id': 3, 'path': '/admin/customize-menu', 'menu_name': 'Customize Menu',
                 'description': 'Here we can view the customize menu', 'image_url': None},
                {'id': 4, 'path': '/admin/permissions/view', 'menu_name': 'Permission View',
                 'description': 'Here we can view the urls', 'image_url': None},
                {'id': 5, 'path': '/admin/permissions/add', 'menu_name': 'Permission add',
                 'description': 'Here we can add the urls', 'image_url': None},
                {'id': 6, 'path': '/admin/assign-groups', 'menu_name': 'Here we can view the Assign grops',
                 'description': 'Here we can view the Assign grops', 'image_url': None}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_urlsmenu_pos(self):
        valid_payload = {'path': '/dashboard/institute/', 'menu_name': 'Institute'}
        response = client.post(reverse('urlsmenu-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_urlsmenu_pos(self):
        valid_payload = {'path': '/dashboard/institute/', 'menu_name': 'Institute'}
        response = client.put(reverse('urlsmenu-detail', kwargs={'pk': 3}), data=json.dumps(valid_payload),
                              content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_urlsmenu_pos(self):
        Menu.objects.get(id=3).delete()
        response = client.delete(reverse('urlsmenu-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_urlsmenu_neg(self):
        response = client.delete(reverse('urlsmenu-detail', kwargs={'pk': 3}))
        self.assertEqual(response.data[0], 'Cannot delete some instances of data are referenced.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
