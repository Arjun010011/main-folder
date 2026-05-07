import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import FeeType, FeeStandardMapping, ApplicationPlan
from apps.institutes.models import AcademicYear

client = Client()


class ApplicationPaymentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.get(id=3)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std2,
                                                         section=self.a, strength=10)
        self.ap = ApplicationPlan.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100)
        self.data = {
            'id': self.ap.pk,
            'amount': 100.0,
            'is_active': True,
            'academic_year': self.academic_year1.pk,
            'standard': 2,
            'standard_name': 'Standard 1'
        }
        self.valid_payload = {'academic_year': self.academic_year1.pk, 'plan': [{'standard': 3, 'amount': 100}]}
        self.invalid_payload = {'academic_year': self.academic_year2.pk, 'plan': [{'standard': 3, 'amount': 100}]}

    def test_get_all_application_plan_pos(self):
        # get API response
        response = client.get(reverse('applicationplan-list'),
                              {'is_active': True, 'academic_year': self.academic_year1.pk})
        self.assertEqual(list(response.data['data']), [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_application_plan_neg(self):
        response = client.get(reverse('applicationplan-list'), {'is_active': True})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_application_plan_pos(self):
        # get API response
        response = client.get(reverse('applicationplan-detail', kwargs={'pk': self.ap.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_application_plan_pos(self):
        response = client.post(reverse('applicationplan-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_application_plan_neg(self):
        response = client.post(reverse('applicationplan-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'standard id 3 is not present in the given academic year!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)

    def test_update_application_plan_pos(self):
        response = client.put(reverse('applicationplan-detail', kwargs={'pk': self.ap.pk}),
                              data=json.dumps(self.data), content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data updated Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_update_application_plan_neg(self):
        self.data['academic_year'] = self.academic_year2.pk
        response = client.put(reverse('applicationplan-detail', kwargs={'pk': self.ap.pk}),
                              data=json.dumps(self.data), content_type='application/json')
        self.assertEqual(response.data[0], 'standard id 2 is not present in the given academic year!')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
