from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Subject, AssignSubject
from apps.institutes.models import AcademicYear

client = Client()


class GetSubjectViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.kannada = Subject.objects.create(name='Kannada')
        self.assignsubject = AssignSubject.objects.create(standard_section=self.ss1, subject=self.kannada)

    def test_get_all_subjects_pos(self):
        # get API response
        response = client.get(reverse('getsubjects-list'), {'academic_year': self.academic_year.pk})
        data = [
            {
                'id': self.assignsubject.pk,
                'subject': 'Kannada',
                'subject_id': self.kannada.pk
            }
        ]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_subjects_neg(self):
        # get API response
        response = client.get(reverse('getsubjects-list'))
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
