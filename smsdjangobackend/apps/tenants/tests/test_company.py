import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse, resolve

from apps.institutes.models import Institute
from apps.users.models import User

client = Client()


class CompanyViewSetTest(TestCase):

    def test_create_company_pos(self):
        valid_payload = {'name': 'Edubricz', 'code': 'eb', 'tel_num': '9876543210', 'company_id': 1,
                         'database_key': 'default'}
        response = client.post(reverse('company-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Company created successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
