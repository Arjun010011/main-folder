from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import AdmissionForm
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetStudentEnrollViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.b, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        AdmissionForm.objects.create(academic_year=self.academic_year, admission_num='Admission 1',
                                     student=self.student)

    def test_get_student_for_enrollment_pos(self):
        # get API response
        response = client.get(reverse('getenrollment-list'), {'academic_year': self.academic_year.pk, 'standard': 2})
        data = {
            'sections': [
                {
                    'standard_section': self.ss1.pk,
                    'id': self.a.pk,
                    'name': 'A',
                    'strength': 10
                },
                {
                    'standard_section': self.ss2.pk,
                    'id': self.b.pk,
                    'name': 'B',
                    'strength': 10
                }
            ],
            'students': [
                {
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
            ]
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_student_for_enrollment_neg(self):
        # get API response
        response = client.get(reverse('getenrollment-list'), {'academic_year': self.academic_year.pk, 'standard': 3})
        self.assertEqual(response.data['data'], {'sections': [], 'students': []})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
