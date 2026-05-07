from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.institutes.models import AcademicYear

client = Client()


class FilterStandardViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.academic_year3 = AcademicYear.objects.create(start_date='2022-06-01', end_date='2023-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.create(name='std2',  sequence=62, is_active=False)
        self.std3 = Standard.objects.get(id=4)
        self.section = Section.objects.create(name='A')
        StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                              section=self.section, strength=10)
        StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std2,
                                              section=self.section, strength=10)
        StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std3,
                                              section=self.section, strength=10)
        StandardSectionMapping.objects.create(academic_year=self.academic_year2, standard=self.std3,
                                              section=self.section, strength=10)

    def test_get_all_getstandard_pos(self):
        # get API response
        response = client.get(reverse('getstandard-list'), {'academic_year': self.academic_year1.pk})
        data = [{'id': self.std1.pk, 'name': 'Standard 1', 'alias_name': 'Standard 1', 'sequence': 51},
                {'id': self.std3.pk, 'name': 'Standard 3', 'alias_name': 'Standard 3', 'sequence': 53}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getstandard_neg(self):
        # get API response
        response = client.get(reverse('getstandard-list'), {'academic_year': self.academic_year3.pk})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
