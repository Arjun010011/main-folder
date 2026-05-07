from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class FeePlanStatusStudentListViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_approved='1')

    def test_get_fee_studentlist_pos(self):
        # get API response
        response = client.get(reverse('feeplanstudentlist-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': 2})
        data = {
            'approved_std_id': [
                2
            ],
            'student_list': [
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
                    'profile_pic_details': None,
                    'is_paid_full_fee': False
                }
            ]
        }
        response.data['data']['approved_std_id'] = list(response.data['data']['approved_std_id'])
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_fee_studentlist_neg(self):
        # get API response
        response = client.get(reverse('feeplanstudentlist-list'),
                              {'academic_year': self.academic_year2.pk, 'standard': 3})
        response.data['data']['approved_std_id'] = list(response.data['data']['approved_std_id'])
        self.assertEqual(response.data['data'], {'approved_std_id': [], 'student_list': []})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
