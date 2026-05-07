from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping
from apps.institutes.models import AcademicYear

client = Client()


class GetStandardFeeViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype)

    def test_get_all_feetypes_pos(self):
        # get API response
        response = client.get(reverse('getfeetypes-list'), {'academic_year': self.academic_year1.pk})
        data = [
            {
                'id': 2,
                'fee_types': [
                    {
                        'id': self.fs.pk,
                        'fee_type_name': 'Admission fee',
                        'codename': 'admission',
                        'is_feature': False,
                        'amount': 100.0,
                        'is_mandatory': '0',
                        'sub_fee_type': {},
                        'is_approved': '0',
                        'fee_type': self.feetype.pk
                    }
                ],
                'name': 'Standard 1',
                'alias_name': 'Standard 1',
                'sequence': 51,
                'is_active': True
            }]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_feetypes_neg(self):
        # get API response
        response = client.get(reverse('getfeetypes-list'), {'academic_year': self.academic_year2.pk})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_feetypes_pos(self):
        # get API response
        response = client.get(reverse('getfeetypes-detail', kwargs={'pk': 2}),
                              {'academic_year': self.academic_year1.pk})
        data = {
            'id': 2,
            'fee_types': [
                {
                    'id': self.fs.pk,
                    'fee_type_name': 'Admission fee',
                    'codename': 'admission',
                    'is_feature': False,
                    'amount': 100.0,
                    'is_mandatory': '0',
                    'sub_fee_type': {},
                    'is_approved': '0',
                    'fee_type': self.feetype.pk
                }
            ],
            'name': 'Standard 1',
            'alias_name': 'Standard 1',
            'sequence': 51,
            'is_active': True
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
