import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping
from apps.institutes.models import AcademicYear

client = Client()


class CreateFeeStandardMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.valid_payload = {'academic_year': self.academic_year1.pk, 'standard': [2], 'fee_types': [
            {'fee_type': 1, 'amount': 10000, 'sub_fee_type': {}, 'is_mandatory': 1, 'codename': 'admission'}]}
        self.invalid_payload = {'academic_year': self.academic_year1.pk, 'standard': [2], 'fee_types': [
            {'fee_type': 1, 'amount': None, 'sub_fee_type': {}, 'is_mandatory': 1, 'codename': 'admission'}]}

    def test_create_feetypes_pos(self):
        response = client.post(reverse('feetypes-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_feetypes_neg(self):
        response = client.post(reverse('feetypes-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Please enter amount/percentage for fee id 1')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateFeeStandardMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype)
        self.valid_payload = {'academic_year': self.academic_year1.pk, 'standard': 2, 'fee_type': 1, 'amount': 10000,
                              'codename': 'admission'}
        self.invalid_payload = {'academic_year': self.academic_year1.pk, 'standard': 2, 'fee_type': 1, 'amount': None,
                                'codename': 'admission'}

    def test_update_feetypes_pos(self):
        response = client.put(reverse('feetypes-detail', kwargs={'pk': self.fs.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_feetypes_neg(self):
        response = client.put(reverse('feetypes-detail', kwargs={'pk': self.fs.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Please enter amount/percentage')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class DeleteFeeStandardMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.feetype = FeeType.objects.create(name='Mess fee')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype)

    def test_delete_feetypes_pos(self):
        response = client.delete(reverse('feetypes-detail', kwargs={'pk': self.fs.pk}))
        self.assertEqual(response.data['Reason'], 'Data deleted successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_feetypes_neg(self):
        self.fs.is_approved = '1'
        self.fs.save()
        response = client.delete(reverse('feetypes-detail', kwargs={'pk': self.fs.pk}))
        self.assertEqual(response.data[0], 'Cannot delete fee is approved!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
