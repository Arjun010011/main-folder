from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Subject, AssignSubject
from apps.institutes.models import AcademicYear

client = Client()


class GetAssignedSubjectViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.b, strength=10)
        self.kannada = Subject.objects.create(name='Kannada')
        self.english = Subject.objects.create(name='English')
        self.maths = Subject.objects.create(name='Maths', is_active=False)
        self.assignsubject = AssignSubject.objects.create(standard_section=self.ss1, subject=self.kannada)

    def test_get_assign_subject_pos(self):
        # get API response
        response = client.get(reverse('getassignsubject-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 2, 'section': self.a.pk})
        data = {
            'standard_section': self.ss1.pk,
            'assigned_subjects': [
                {
                    'id': self.assignsubject.pk,
                    'subject_name': 'Kannada',
                    'subject_id': self.kannada.pk
                }
            ],
            'unassignedsubjects': [
                {
                    'subject_id': self.english.pk,
                    'subject_name': 'English'
                }
            ]
        }
        response.data['data']['unassignedsubjects'] = list(response.data['data']['unassignedsubjects'])
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_assign_subject_neg(self):
        # get API response
        self.kannada.delete()
        self.english.delete()
        response = client.get(reverse('getassignsubject-list'),
                              {'academic_year': self.academic_year.pk, 'standard': 2, 'section': self.b.pk})
        data = {
            'standard_section': self.ss2.pk,
            'assigned_subjects': [],
            'unassignedsubjects': []
        }
        response.data['data']['unassignedsubjects'] = list(response.data['data']['unassignedsubjects'])
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
