"""
Import json data from URL to Datababse
"""
import json

from apps.bdu.models import Bdu, BduColumn, BduValidation
from django.core.management.base import BaseCommand
from django.core.management import call_command

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('-b', '--bdu_id', type=int, help='given bdu id columns will be deleted', )
        parser.add_argument('-a', '--alldelete', type=int, help='all data delete', )

    def handle(self, *args, **options):
        bdu_id = options['bdu_id']
        alldelete = options['alldelete']
        if not bdu_id and not alldelete:
            pass
        elif bdu_id:
            bdu_column = BduColumn.objects.filter(bdu=bdu_id)
            BduValidation.objects.filter(bdu_column__in=bdu_column.values_list('id', flat=True)).delete()
            bdu_column.delete()
            call_command('uploadbdu')
        else:
            BduValidation.objects.all().delete()
            BduColumn.objects.all().delete()
            call_command('uploadbdu')