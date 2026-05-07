import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard
from apps.finance.models import FeeType, FeeStandardMapping
from apps.institutes.models import AcademicYear

client = Client()


class DeleteFeeStandardMappingDeleteAllViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.feetype = FeeType.objects.create(name='Mess fee')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype)
        self.valid_payload = {'academic_year': self.academic_year1.pk, 'standard': 2}
        self.invalid_payload = {'academic_year': self.academic_year1.pk, 'standard': 2}

    def test_delete_all_feetypes_pos(self):
        response = client.post(reverse('feetypesdeleteall-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_all_feetypes_neg(self):
        self.fs.is_approved = '1'
        self.fs.save()
        response = client.post(reverse('feetypesdeleteall-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Cannot delete fee is approved!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
