import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Subject, AssignSubject
from apps.institutes.models import AcademicYear

client = Client()


class GetAssignSubjectViewSetTest(TestCase):

    def setUp(self):
        self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                         section=self.a, strength=10)
        self.kannada = Subject.objects.create(name='Kannada')
        self.assignsubject = AssignSubject.objects.create(standard_section=self.ss1, subject=self.kannada)

    def test_get_assign_subject_pos(self):
        # get API response
        response = client.get(reverse('assignsubject-list'), {'academic_year': self.academic_year.pk})
        data = [
            {
                'id': 2,
                'name': 'Standard 1',
                'sections': [
                    {
                        'id': self.a.pk,
                        'name': 'A',
                        'subjects': [
                            {
                                'id': self.kannada.pk,
                                'name': 'Kannada',
                                'subject_mapping_id': self.assignsubject.pk
                            }
                        ],
                        'standard_section': self.ss1.pk
                    }
                ]
            }]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_assign_subject_neg(self):
        # get API response
        response = client.get(reverse('assignsubject-list'))
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateAssignSubjectViewSetTest(TestCase):

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
        self.valid_payload = {'standard_section': self.ss1.pk, 'assigned_subjects': [self.kannada.pk, self.english.pk]}
        self.invalid_payload = {'standard_section': self.ss1.pk,
                                'assigned_subjects': [self.kannada.pk, self.english.pk, self.english.pk]}

    def test_create_assign_subjects_pos(self):
        response = client.post(reverse('assignsubject-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_assign_subjects_neg(self):
        response = client.post(reverse('assignsubject-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Duplicate Values Found!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
