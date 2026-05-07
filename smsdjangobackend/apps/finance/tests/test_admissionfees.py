import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section
from apps.finance.models import ApplicationPlan, ApplicationPaymentDetail, AdmissionForm
from apps.forms.models import ApplicationStudent
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class AdmissionFormViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18')
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-18')
        self.af = AdmissionForm.objects.create(academic_year=self.academic_year1, admission_num='admission1',
                                               student=self.student1)
        self.valid_payload = {'student': self.student2.pk, 'academic_year': self.academic_year1.pk,
                              'admission_num': 'adm123'}
        self.invalid_payload = {'student': self.student2.pk, 'academic_year': self.academic_year1.pk,
                                'admission_num': None}
        self.data = {
            'id': self.af.pk,
            'academic_year_value': '2020-2021',
            'admission_num': 'admission1',
            'admission_date': datetime.today().strftime('%Y-%m-%d'),
            'academic_year': self.academic_year1.pk,
            'student': self.student1.pk
        }

    def test_get_all_admission_fees_pos(self):
        # get API response
        response = client.get(reverse('admissionfees-list'), {'academic_year': self.academic_year1.pk})
        self.assertEqual(list(response.data['data']), [self.data])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_all_admission_fees_neg(self):
        response = client.get(reverse('admissionfees-list'), {'academic_year': self.academic_year2.pk})
        self.assertEqual(response.data['data'], [])
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_admission_fees_pos(self):
        # get API response
        response = client.get(reverse('admissionfees-detail', kwargs={'pk': self.af.pk}))
        self.assertEqual(response.data['data'], self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_admission_fees_pos(self):
        response = client.post(reverse('admissionfees-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_admission_fees_neg(self):
        response = client.post(reverse('admissionfees-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['admission_num'][0], 'This field may not be null.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
