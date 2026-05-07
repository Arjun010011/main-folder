import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class FeatureStudentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.feetype = FeeType.objects.get(codename='transport')
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-17', current_standard=self.std1)
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype)
        self.fs.student_feature.add(self.student1)
        self.valid_payload = {'is_enable': 1, 'feature': [self.fs.pk], 'student_feature': [self.student2.pk]}
        self.invalid_payload = {'is_enable': 1, 'feature': [2], 'student_feature': [self.student2.pk]}

        self.feature_data = {
            'id': self.fs.pk,
            'fee_type_name': 'Transport fee',
            'codename': 'transport',
            'is_feature': False,
            'student_feature': [
                {
                    'id': self.student1.pk,
                    'name': 'Student1 None None',
                    'standard': 'Standard 1',
                    'dob': '1995-11-18',
                    'email': None,
                    'gender': None,
                    'current_reg_num': None,
                    'mobile_num': None,
                    'current_standard': 2,
                    'profile_pic_details': None
                }
            ],
            'amount': 100.0,
            'is_mandatory': '0',
            'sub_fee_type': {},
            'is_approved': '0',
            'academic_year': self.academic_year1.pk,
            'standard': 2,
            'fee_type': 2
        }

        self.student_feature_data = {
            'id': self.student1.pk,
            'name': 'Student1 None None',
            'standard': 'Standard 1',
            'dob': '1995-11-18',
            'email': None,
            'gender': None,
            'current_reg_num': None,
            'mobile_num': None,
            'current_standard': 2,
            'profile_pic': None,
            'profile_pic_details': None,
            'student_feature': [
                {
                    'id': self.fs.pk,
                    'fee_type_name': 'Transport fee',
                    'codename': 'transport',
                    'is_feature': False,
                    'amount': 100.0,
                    'is_mandatory': '0',
                    'sub_fee_type': {},
                    'is_approved': '0',
                    'academic_year': self.academic_year1.pk,
                    'standard': 2,
                    'fee_type': 2
                }
            ]
        }

    def test_get_all_feature_pos(self):
        # get API response
        response = client.get(reverse('feature-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': self.std1.pk})
        self.assertEqual(list(response.data['data']), [self.feature_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_feature_pos(self):
        # get API response
        response = client.get(reverse('feature-detail', kwargs={'pk': self.fs.pk}))
        self.assertEqual(response.data['data'], self.feature_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_feature_neg(self):
        response = client.get(reverse('feature-list'),
                              {'academic_year': self.academic_year2.pk, 'standard': self.std1.pk})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_feature_plan_pos(self):
        response = client.post(reverse('feature-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_student_feature_pos(self):
        # get API response
        self.student2.delete()
        response = client.get(reverse('studentfeature-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': self.std1.pk})
        self.assertEqual(list(response.data['data']), [self.student_feature_data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_student_feature_pos(self):
        # get API response
        response = client.get(reverse('studentfeature-detail', kwargs={'pk': self.student1.pk}))
        self.assertEqual(response.data['data'], self.student_feature_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
