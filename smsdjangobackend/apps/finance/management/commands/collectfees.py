"""
Import json data from URL to Datababse
"""
import json

from apps.bdu.models import Bdu, BduColumn, BduValidationClass, BduValidation
from apps.finance.serializers import FeeTermsSerializer
from apps.shared.models import Url  # Import your model here
from django.core.management.base import BaseCommand
from rest_framework import exceptions

from apps.finance.models.fee import FeePlan, FeeStandardMapping

class Command(BaseCommand):

    def add_arguments(self, parser):
        parser.add_argument('-a', '--academic', type=int, help='', )
        parser.add_argument('-s', '--standard_ids', type=int, help='all data delete', )

    def handle(self, *args, **options):
        standard_ids = options['standard_ids']
        academic = options['academic']
        if not academic:
            print('Academic year is mandatory')
        else:
            fee_plan_data = FeeStandardMapping.objects.filter(academic_year=academic)
            serializer = FeeTermsSerializer(fee_plan_data, many=True)