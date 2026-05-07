import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import ApplicationPlan, ApplicationPaymentDetail
from apps.forms.models import ApplicationStudent
from apps.institutes.models import AcademicYear

client = Client()


class ApplicationPaymentDetailViewSetTest(TestCase):

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
        self.student1 = ApplicationStudent.objects.create(first_name='Student1', dob='1995-11-18',
                                                          current_standard=self.std1)
        self.ap = ApplicationPlan.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100)
        self.valid_payload = {'application_plan': self.ap.pk, 'student': self.student1.pk, 'mode_of_payment': 'Cash'}
        self.invalid_payload = {'application_plan': self.ap.pk, 'student': self.student1.pk, 'mode_of_payment': 'Cash'}

    def test_get_all_application_fees_pos(self):
        # get API response
        self.apd = ApplicationPaymentDetail.objects.create(amount_paid=100, student=self.student1,
                                                           mode_of_payment='Cash')
        response = client.get(reverse('applicationfees-list'))
        data = [{'id': self.apd.pk, 'name': 'Application', 'amount_paid': 100.0, 'receipt_num': None,
                 'transaction_date': datetime.today().strftime('%Y-%m-%d'), 'mode_of_payment': 'Cash',
                 'payment_ref_num': '', 'student': self.student1.pk}]
        self.assertEqual(list(response.data['data']), data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_application_fees_neg(self):
        response = client.get(reverse('applicationfees-list'), {'is_active': True})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_application_fees_pos(self):
        response = client.post(reverse('applicationfees-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
