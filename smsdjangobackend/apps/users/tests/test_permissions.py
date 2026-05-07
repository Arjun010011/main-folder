from django.contrib.auth.models import Permission
from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse


client = Client()


class UserViewSetTest(TestCase):

    def setUp(self):
        self.permissions = Permission.objects.all().values()
        for permission in self.permissions:
            permission.update({'content_type': permission['content_type_id']})
            del permission['content_type_id']

    def test_get_all_permissions_pos(self):
        # get API response
        response = client.get(reverse('permissions-list'))
        self.assertEqual(response.data['data'], list(self.permissions))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
