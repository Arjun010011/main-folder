import json

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.finance.models import FeeType, FeeStandardMapping, FeePlan, FeeCollection, PaymentDetail
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class CreatePromoteStudentViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.std2 = Standard.objects.get(id=3)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.ss2 = StandardSectionMapping.objects.create(academic_year=self.academic_year2, standard=self.std2,
                                                         section=self.a, strength=10)
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-17', current_standard=self.std1)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_mandatory='1', is_approved='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)
        self.fc = FeeCollection.objects.create(student=self.student1, mode_of_payment='Cash')
        self.pd = PaymentDetail.objects.create(fee_collection=self.fc, fee_plan=self.fp, amount_paid=100)
        self.valid_payload = {'from_academic_year': self.academic_year1.pk, 'to_academic_year': self.academic_year2.pk,
                              'from_standard': self.std1.pk, 'to_standard': self.std2.pk, 'student': [self.student1.pk]}
        self.invalid_payload = {'from_academic_year': self.academic_year1.pk,
                                'to_academic_year': self.academic_year2.pk, 'from_standard': self.std1.pk,
                                'to_standard': self.std2.pk, 'student': [self.student2.pk]}

    def test_create_promotion_pos(self):
        response = client.post(reverse('promotestudent-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Student(s) Promoted Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_promotion_neg(self):
        response = client.post(reverse('promotestudent-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], f'Student {self.student2.pk} has not paid full fees')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
