"""
Import json data from URL to Datababse
"""
from rest_framework import exceptions
import json
from django.db.models import Q


from apps.users.models.user import User

from django.core.management.base import BaseCommand, CommandParser

from apps.users.services.user import change_user_data



class Command(BaseCommand):

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument('--password', action='append', type=str)

    def handle(self, *args, **options):
        password = options['password'][0]
        if not password:
            raise exceptions.ValidationError('password is mandatory')
        user_data = User.objects.filter(Q(is_superuser=True)|Q(groups__name='edubriczadmin')).values()
        data = {'user_list': []}
        for user in user_data:
            data['user_list'].append(
                {
                    'user_id': user['id'], 'password': password
                }
            )
        if data['user_list']:
            change_user_data(self, data)