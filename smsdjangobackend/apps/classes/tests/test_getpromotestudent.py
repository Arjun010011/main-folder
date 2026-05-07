from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetPromoteStudentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.get(id=3)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year2, standard=self.std2,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.enrollment = Enrollment.objects.create(standard_section=self.ss1, student=self.student)

    def test_get_student_for_promotion_pos(self):
        # get API response
        response = client.get(reverse('getpromotestudent-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': 2})
        data = [{
            'id': self.enrollment.pk,
            'name': 'Student None None',
            'current_reg_num': None,
            'dob': datetime(1995, 11, 18).date(),
            'section_name': 'A',
            'profile_pic_details': None,
            'standard_section': self.ss1.pk,
            'student': self.student.pk,
            'is_paid_full_fee': False
        }]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_student_for_promotion_neg(self):
        # get API response
        response = client.get(reverse('getpromotestudent-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': 3})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_next_standard_for_promotion_pos(self):
        response = client.get(reverse('getpromotestudent-detail', kwargs={'pk': self.academic_year1.pk}),
                              {'standard': 2})
        data = {
            'to_academic_year': {
                'id': self.academic_year2.pk,
                'name': '2021-2022'
            },
            'to_standard': {
                'id': 3,
                'name': 'Standard 2',
                'alias_name': 'Standard 2',
                'sequence': 52
            }
        }

        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_next_standard_for_promotion_neg(self):
        response = client.get(reverse('getpromotestudent-detail', kwargs={'pk': self.academic_year2.pk}),
                              {'standard': 2})
        self.assertEqual(response.data[0], 'Next Academic Year not Found!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
