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


class GetFeePlanViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_mandatory='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)

    def test_get_all_fee_plan_pos(self):
        # get API response
        response = client.get(reverse('feeplan-list'), {'academic_year': self.academic_year1.pk, 'standard': 2})
        data = {
            'plan': [
                {
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
            ],
            'academic_year_value': '2020-2021',
            'standard_name': 'Standard 1'
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_fee_plan_neg(self):
        # get API response
        response = client.get(reverse('feeplan-list'), {'academic_year': self.academic_year2.pk})
        data = {'plan': [], 'academic_year_value': '2021-2022'}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_student_fee_plan_pos(self):
        # get API response
        self.fs.is_approved = '1'
        self.fs.save()
        response = client.get(reverse('feeplan-list'), {'academic_year': self.academic_year1.pk, 'standard': 2,
                                                        'student': self.student.pk})
        data = {
            'plans': [
                {
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
                            'term_end_date': None,
                            'amount': 100.0
                        }
                    ],
                    'amount': 100.0,
                    'is_mandatory': '1',
                    'sub_fee_type': {},
                    'is_approved': '1',
                    'academic_year': self.academic_year1.pk,
                    'standard': 2
                }
            ],
            'student': {
                'id': self.student.pk,
                'name': 'Student None None',
                'standard': 'Standard 1',
                'dob': '1995-11-18',
                'email': None,
                'gender': None,
                'current_reg_num': None,
                'mobile_num': None,
                'current_standard': 2,
                'profile_pic_details': None
            }
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


    def test_get_student_fee_plan_neg(self):
        # get API response
        response = client.get(reverse('feeplan-list'), {'academic_year': self.academic_year1.pk, 'standard': 2,
                                                        'student': self.student.pk})
        self.assertEqual(response.data[0], 'Plan is not approved!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class CreateFeePlanViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year, standard=self.std1, amount=1000,
                                                    fee_type=self.feetype, is_mandatory='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)
        self.valid_payload = [
            {
                'id': self.fs.pk,
                'fee_type_name': 'Admission fee',
                'codename': 'admission',
                'standard_fee': [
                    {
                        'id': self.fp.pk,
                        'terms': 'Term1',
                        'percentage': 50.0,
                        'payment_start_date': '2020-06-01',
                        'payment_end_date': '2020-11-30',
                        'term_start_date': '2020-06-01',
                        'term_end_date': '2020-11-30',
                    },
                    {
                        'terms': 'Term2',
                        'percentage': 50.0,
                        'payment_start_date': '2020-12-01',
                        'payment_end_date': '2021-04-30',
                        'term_start_date': '2020-12-01',
                        'term_end_date': '2021-04-30',
                    }
                ],
                'amount': 1000.0,
                'is_mandatory': '1',
                'sub_fee_type': {},
                'is_approved': '1',
                'standard': 2
            }]
        self.invalid_payload = [
            {
                'id': self.fs.pk,
                'fee_type_name': 'Admission fee',
                'codename': 'admission',
                'standard_fee': [
                    {
                        'id': self.fp.pk,
                        'terms': 'Term1',
                        'percentage': 50.0,
                        'payment_start_date': '2020-06-01',
                        'payment_end_date': '2020-11-30',
                        'term_start_date': '2020-06-01',
                        'term_end_date': '2020-11-30',
                    },
                    {
                        'terms': 'Term2',
                        'percentage': 50.1,
                        'payment_start_date': '2020-12-01',
                        'payment_end_date': '2021-04-30',
                        'term_start_date': '2020-12-01',
                        'term_end_date': '2021-04-30',
                    }
                ],
                'amount': 1000.0,
                'is_mandatory': '1',
                'sub_fee_type': {},
                'is_approved': '1',
                'standard': 2
            }]

    def test_create_fee_plan_pos(self):
        response = client.post(reverse('feeplan-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data Updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_fee_plan_neg(self):
        response = client.post(reverse('feeplan-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Admission fee Amount/Terms are not equal!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
