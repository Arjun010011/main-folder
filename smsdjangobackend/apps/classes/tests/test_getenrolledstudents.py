from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetEnrolledStudentStandardViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.enrollment = Enrollment.objects.create(standard_section=self.ss1, student=self.student)

    def test_get_enrolled_students_pos(self):
        # get API response
        response = client.get(reverse('getenrolledstudents-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 2})
        data = [{
            'id': self.enrollment.pk,
            'name': 'Student None None',
            'current_reg_num': None,
            'dob': datetime(1995, 11, 18).date(),
            'section_name': 'A',
            'profile_pic_details': None,
            'standard_section': self.ss1.pk,
            'student': self.student.pk
        }]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_enrolled_students_neg(self):
        # get API response
        response = client.get(reverse('getenrolledstudents-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 3})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
