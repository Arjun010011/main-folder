"""
Import json data from URL to Datababse
"""
import json

from apps.bdu.models import Bdu, BduColumn, BduValidationClass, BduValidation
from apps.shared.models import Url  # Import your model here
from django.core.management.base import BaseCommand
from rest_framework import exceptions

from apps.shared.models.menu import Menu
from apps.shared.services import SharedService, UploadTypeService
from apps.users.services.permissions import create_contenttypes_and_permissions, save_content_type_and_permission


class Command(BaseCommand):

    def handle(self, *args, **options):
        from apps.users.services.url_map import url_map
        from apps.users.services.codename_map import codename_map
        from apps.shared.services import MenuService

        save_content_type_and_permission(self, codename_map)
        MenuService.add_urls(self, url_map, True)