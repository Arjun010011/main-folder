import json

from django.contrib.auth.hashers import make_password
from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse, resolve

from apps.institutes.models import Institute
from apps.users.models import User

client = Client()


class CreateUserViewSetTest(TestCase):

    def setUp(self):
        Institute.objects.create(name='Edubricz', code='eb', tel_num='9876543210', company_id=1)
        self.users = User.objects.create(username='User', password=make_password('password'))

    def test_create_signup_pos(self):
        valid_payload = {'username': 'User1', 'password': 'qwerty1234', 'groups': [2], 'server_sign_up': False}
        response = client.post(reverse('signup-list'), data=json.dumps(valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Sign up success!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_signup_neg(self):
        invalid_payload = {'username': 'User', 'password': 'qwerty1234', 'groups': [2]}
        response = client.post(reverse('signup-list'), data=json.dumps(invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Username already exist')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_create_login_pos(self):
        valid_payload = {'username': 'User', 'password': 'password'}
        response = client.post('/users/login/', data=json.dumps(valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Logged in Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_login_neg(self):
        invalid_payload = {'username': 'User', 'password': 'pass'}
        response = client.post('/users/login/', data=json.dumps(invalid_payload), content_type='application/json')
        self.assertEqual(response.data['non_field_errors'][0], 'Unable to log in with provided credentials.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_create_logout_pos(self):
        valid_payload = {'username': 'User', 'password': 'password'}
        response = client.post('/users/login/', data=json.dumps(valid_payload), content_type='application/json')
        token = response.data['data']['token']
        response = client.post('/users/logout/', content_type='application/json',
                               **{'HTTP_AUTHORIZATION': f'Token {token}'})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

    def test_create_logout_neg(self):
        response = client.post('/users/logout/', content_type='application/json')
        self.assertEqual(response.data['detail'], 'Authentication credentials were not provided.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_create_logoutall_pos(self):
        valid_payload = {'username': 'User', 'password': 'password'}
        response = client.post('/users/login/', data=json.dumps(valid_payload), content_type='application/json')
        token = response.data['data']['token']
        response = client.post('/users/logoutall/', content_type='application/json',
                               **{'HTTP_AUTHORIZATION': f'Token {token}'})
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
