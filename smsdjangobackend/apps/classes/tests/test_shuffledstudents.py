import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetShuffleStudentStandardViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=1)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.b, strength=1)
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-17', current_standard=self.std1)
        self.enrollment = Enrollment.objects.create(standard_section=self.ss1, student=self.student1)

    def test_get_Shuffled_students_pos(self):
        # get API response
        response = client.get(reverse('shuffledstudents-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 2, 'section': self.a.pk})
        data = {'strength': 1, 'enrollments': [
            {
                'id': self.enrollment.pk,
                'name': 'Student1 None None',
                'current_reg_num': None,
                'dob': datetime(1995, 11, 18).date(),
                'section_name': 'A',
                'profile_pic_details': None,
                'standard_section': self.ss1.pk,
                'student': self.student1.pk
            }]}
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_shuffled_students_neg(self):
        # get API response
        response = client.get(reverse('shuffledstudents-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 2, 'section': self.b.pk})
        self.assertEqual(response.data['data'], {'strength': 0, 'enrollments': []})
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateShuffleStudentStandardViewSetTest(TestCase):
    """ Test module for POST standard"""

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=2)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.b, strength=2)
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-17', current_standard=self.std1)
        self.student3 = Student.objects.create(first_name='Student3', dob='1995-11-16', current_standard=self.std1)
        self.enrollment1 = Enrollment.objects.create(standard_section=self.ss1, student=self.student1)
        self.enrollment2 = Enrollment.objects.create(standard_section=self.ss2, student=self.student2)
        self.enrollment3 = Enrollment.objects.create(standard_section=self.ss2, student=self.student3)
        self.valid_payload = [{'standard_section': self.ss1.pk,
                               'enrollments': [{'id': self.enrollment1.pk, 'student': self.student2.pk}]},
                              {'standard_section': self.ss2.pk,
                               'enrollments': [{'id': self.enrollment2.pk, 'student': self.student1.pk}]}]
        self.invalid_payload = [{'standard_section': self.ss1.pk,
                                 'enrollments': [{'id': self.enrollment1.pk, 'student': self.student2.pk},
                                                 {'id': self.enrollment2.pk, 'student': self.student1.pk},
                                                 {'id': self.enrollment3.pk, 'student': self.student3.pk}]},
                                {'standard_section': self.ss2.pk,
                                 'enrollments': []}]

    def test_create_Shuffle_students_pos(self):
        response = client.post(reverse('shuffledstudents-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data Shuffled Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_shuffle_studentas_neg(self):
        response = client.post(reverse('shuffledstudents-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Max strength exceeded! in section A')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
