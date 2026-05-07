import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetEnrollmentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.enrollment = Enrollment.objects.create(standard_section=self.ss1, student=self.student)
        self.data = {
            'id': self.enrollment.pk,
            'academic_year_value': '2020-2021',
            'standard_id': 2,
            'standard_name': 'Standard 1',
            'section_name': 'A',
            'name': 'Student None None',
            'student_reg_num': None,
            'student_mobile_num': None,
            'student_email': None,
            'student_dob': datetime(1995, 11, 18).date(),
            'student_gender': None,
            'standard_section': self.ss1.pk,
            'student': self.student.pk
        }

    def test_get_all_enrollment_pos(self):
        # get API response
        response = client.get(reverse('enrollment-list'))
        data = [self.data]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_enrollment_neg(self):
        # get API response
        self.enrollment.delete()
        response = client.get(reverse('enrollment-list'))
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_enrollment_pos(self):
        # get API response
        response = client.get(reverse('enrollment-detail', kwargs={'pk': self.enrollment.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateEnrollmentViewSetTest(TestCase):
    """ Test module for POST standard"""

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=2)
        self.student1 = Student.objects.create(first_name='Student 1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student 2', dob='1995-11-17', current_standard=self.std1)
        self.student3 = Student.objects.create(first_name='Student 3', dob='1995-11-16', current_standard=self.std1)
        self.valid_payload = {'standard_section': self.ss1.pk, 'student': [self.student1.pk, self.student2.pk]}
        self.invalid_payload = {'standard_section': self.ss1.pk,
                                'student': [self.student1.pk, self.student2.pk, self.student3.pk]}

    def test_create_enrollment_pos(self):
        response = client.post(reverse('enrollment-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_enrollment_neg(self):
        response = client.post(reverse('enrollment-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Max strength exceeded!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateEnrollmentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=2)
        self.student1 = Student.objects.create(first_name='Student 1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student 2', dob='1995-11-17', current_standard=self.std1)
        self.student3 = Student.objects.create(first_name='Student 3', dob='1995-11-16', current_standard=self.std1)
        self.enrollment = Enrollment.objects.create(standard_section=self.ss1, student=self.student1)
        self.valid_payload = {'standard_section': self.ss1.pk, 'student': self.student2.pk}
        self.invalid_payload = {'standard_section': self.ss1.pk, 'student': None}

    def test_update_enrollment_pos(self):
        response = client.put(reverse('enrollment-detail', kwargs={'pk': self.enrollment.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_enrollment_neg(self):
        response = client.put(reverse('enrollment-detail', kwargs={'pk': self.std1.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['detail'], 'Not found.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
