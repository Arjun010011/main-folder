import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Subject, AssignSubject, Enrollment
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetStandardSectionMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.academic_year3 = AcademicYear.objects.create(start_date='2022-06-01', end_date='2023-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.get(id=3)
        self.std3 = Standard.objects.create(name='std3', sequence=63, is_active=False)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B', is_active=False)
        self.b1 = Section.objects.create(name='B')
        self.c = Section.objects.create(name='C')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.b, strength=10)
        self.ss3 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std3,
                                                         section=self.b1, strength=10)
        self.ss4 = StandardSectionMapping.objects.create(academic_year=self.academic_year2, standard=self.std2,
                                                         section=self.c, strength=10)

    def test_get_all_strength_pos(self):
        # get API response
        response = client.get(reverse('strength-list'), {'academic_year': self.academic_year1.pk})
        data = [
            {'standard': self.std1.pk, 'standard__name': 'Standard 1', 'strength__sum': 10,
             'section': [{'id': self.ss1.pk, 'standard': self.std1.pk, 'section': self.a.pk, 'section__name': 'A',
                          'strength': 10}]}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_strength_neg(self):
        # get API response
        response = client.get(reverse('strength-list'), {'academic_year': self.academic_year3.pk})
        self.assertEqual(list(response.data['data']), [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateStandardSectionMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.get(id=3)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B')
        self.valid_payload = {'academic_year': self.academic_year1.pk, 'standard': self.std2.pk,
                              'section': [{'section': self.a.pk, 'strength': 40},
                                          {'section': self.b.pk, 'strength': 30}]}
        self.invalid_payload = {'academic_year': self.academic_year1.pk, 'standard': self.std2.pk,
                                'section': [{'section': self.a.pk, 'strength': 40},
                                            {'section': self.b.pk, 'strength': ''}]}

    def test_create_strength_pos(self):
        response = client.post(reverse('strength-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_strength_neg(self):
        response = client.post(reverse('strength-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], f'{self.b.pk}: Enter Valid strength!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class UpdateStandardSectionMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.valid_payload = {'standard': self.std1.pk, 'section': self.a.pk, 'strength': 20}
        self.invalid_payload = {'standard': self.std1.pk, 'section': self.a.pk, 'strength': ''}

    def test_update_strength_pos(self):
        response = client.put(reverse('strength-detail', kwargs={'pk': self.ss1.pk}),
                              data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_strength_neg(self):
        response = client.put(reverse('strength-detail', kwargs={'pk': self.ss1.pk}),
                              data=json.dumps(self.invalid_payload), content_type='application/json')
        self.assertEqual(response.data['strength'][0], 'A valid integer is required.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)


class DeleteStandardSectionMappingViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.valid_payload = [self.ss1.pk]

    def test_delete_strength_pos(self):
        response = client.delete(reverse('strength-detail', kwargs={'pk': self.ss1.pk}),
                                 data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data deleted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete_strength_neg(self):
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18')
        Enrollment.objects.create(standard_section=self.ss1, student=self.student)
        response = client.delete(reverse('strength-detail', kwargs={'pk': self.ss1.pk}),
                                 data=json.dumps(self.valid_payload), content_type='application/json')
        self.assertEqual(response.data[0], 'Cannot delete some instances of data are referenced.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
