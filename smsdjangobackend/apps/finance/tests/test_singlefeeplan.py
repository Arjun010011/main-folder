import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping, FeePlan
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetSingleFeePlanViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_mandatory='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)

    def test_get_single_fee_plan_pos(self):
        # get API response
        response = client.get(reverse('singlefeeplan-detail', kwargs={'fee_type': 1}),
                              {'academic_year': self.academic_year1.pk, 'standard': 2})
        data = {
            'id': self.fs.pk,
            'fee_type_name': 'Admission fee',
            'codename': 'admission',
            'is_feature': False,
            'standard_name': 'Standard 1',
            'academic_year_start_date': datetime(2020, 6, 1).date(),
            'academic_year_end_date': datetime(2021, 4, 30).date(),
            'academic_year_value': '2020-2021',
            'standard_fee': [
                {
                    'id': self.fp.pk,
                    'terms': 'Term1',
                    'percentage': 100.0,
                    'payment_start_date': None,
                    'payment_end_date': None,
                    'term_start_date': None,
                    'term_end_date': None
                }
            ],
            'amount': 100.0,
            'is_mandatory': '1',
            'sub_fee_type': {},
            'is_approved': '0',
            'academic_year': self.academic_year1.pk,
            'standard': 2
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_single_fee_plan_neg(self):
        # get API response
        response = client.get(reverse('singlefeeplan-detail', kwargs={'fee_type': 1}))
        self.assertEqual(response.data['detail'], 'Could not satisfy the request Accept header.')
        self.assertEqual(response.status_code, status.HTTP_406_NOT_ACCEPTABLE)
