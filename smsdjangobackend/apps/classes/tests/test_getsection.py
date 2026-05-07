from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.institutes.models import AcademicYear

client = Client()


class FilterSectionViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.b = Section.objects.create(name='B', is_active=False)
        self.b1 = Section.objects.create(name='B')
        self.c = Section.objects.create(name='C')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.b, strength=10)
        self.ss3 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.b1, strength=10)
        self.ss4 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.c, strength=10)

    def test_get_all_getsection_pos(self):
        # get API response
        response = client.get(reverse('getsection-list'),
                              {'academic_year': self.academic_year1.pk, 'standard': self.std1.pk})
        data = [{'standard_section': self.ss1.pk, 'id': self.a.pk, 'name': 'A'},
                {'standard_section': self.ss3.pk, 'id': self.b1.pk, 'name': 'B'},
                {'standard_section': self.ss4.pk, 'id': self.c.pk, 'name': 'C'}]
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_getsection_neg(self):
        # get API response
        response = client.get(reverse('getsection-list'), {'academic_year': self.academic_year2.pk})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)
