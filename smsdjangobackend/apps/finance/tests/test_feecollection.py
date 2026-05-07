import json
from datetime import datetime

from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.classes.models import Standard, StandardSectionMapping, Section, Enrollment
from apps.finance.models import FeeType, FeeStandardMapping, FeePlan, FeeCollection, PaymentDetail
from apps.institutes.models import AcademicYear
from apps.students.models import Student

client = Client()


class GetFeeCollectionViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_mandatory='1', is_approved='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)
        self.fc = FeeCollection.objects.create(student=self.student, mode_of_payment='Cash')
        self.pd = PaymentDetail.objects.create(fee_collection=self.fc, fee_plan=self.fp, amount_paid=100)

    def test_get_fee_collection_pos(self):
        # get API response
        response = client.get(reverse('feecollection-list'),
                              {'academic_year': self.academic_year1.pk, 'student': self.student.pk})
        data = {
            'collection': [
                {
                    'id': self.fc.pk,
                    'payment_detail': [
                        {
                            'id': self.pd.pk,
                            'amount_paid': 100.0,
                            'fee_collection': self.fc.pk,
                            'fee_plan': self.fp.pk
                        }
                    ],
                    'receipt_num': None,
                    'transaction_date': datetime.today().strftime('%Y-%m-%d'),
                    'mode_of_payment': 'Cash',
                    'payment_ref_num': '',
                    'student': self.student.pk,
                    'user': None
                }
            ],
            'student': {
                'id': self.student.pk,
                'name': 'Student None None',
                'standard': 'Standard 1',
                'dob': '1995-11-18',
                'email': None,
                'gender': None,
                'current_reg_num': None,
                'mobile_num': None,
                'current_standard': 2,
                'profile_pic_details': None
            }
        }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_fee_collection_neg(self):
        # get API response
        response = client.get(reverse('feecollection-list'),
                              {'academic_year': self.academic_year2.pk, 'student': self.student.pk})
        data = {'collection': [],
                'student': {
                    'id': self.student.pk,
                    'name': 'Student None None',
                    'standard': 'Standard 1',
                    'dob': '1995-11-18',
                    'email': None,
                    'gender': None,
                    'current_reg_num': None,
                    'mobile_num': None,
                    'current_standard': 2,
                    'profile_pic_details': None
                }
                }
        self.assertEqual(response.data['data'], data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)


class CreateFeeCollectionViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2021-06-01', end_date='2022-04-30')
        self.std1 = Standard.objects.get(id=2)
        self.a = Section.objects.create(name='A')
        self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year1, standard=self.std1,
                                                         section=self.a, strength=10)
        self.student1 = Student.objects.create(first_name='Student1', dob='1995-11-18', current_standard=self.std1)
        self.student2 = Student.objects.create(first_name='Student2', dob='1995-11-17', current_standard=self.std1)
        self.feetype = FeeType.objects.get(codename='admission')
        self.fs = FeeStandardMapping.objects.create(academic_year=self.academic_year1, standard=self.std1, amount=100,
                                                    fee_type=self.feetype, is_mandatory='1', is_approved='1')
        self.fp = FeePlan.objects.create(standard_fee=self.fs, terms='Term1', percentage=100)
        self.fc = FeeCollection.objects.create(student=self.student2, mode_of_payment='Cash')
        self.pd = PaymentDetail.objects.create(fee_collection=self.fc, fee_plan=self.fp, amount_paid=100)

        self.valid_payload = {
            'student': self.student1.pk,
            'mode_of_payment': 'Cash',
            'payment_ref_num': '123456',
            'standard_fee': [
                {
                    'fee_plan': self.fp.pk
                }
            ]
        }
        self.invalid_payload = {
            'student': self.student2.pk,
            'mode_of_payment': 'Cash',
            'payment_ref_num': '123456',
            'standard_fee': [
                {
                    'fee_plan': self.fp.pk
                }
            ]
        }

    def test_create_fee_plan_pos(self):
        response = client.post(reverse('feecollection-list'), data=json.dumps(self.valid_payload),
                               content_type='application/json')
        self.assertEqual(response.data['Reason'], 'Data added Successfully!')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_create_fee_plan_neg(self):
        response = client.post(reverse('feecollection-list'), data=json.dumps(self.invalid_payload),
                               content_type='application/json')
        self.assertEqual(response.data[0], 'Student has already paid Term1 of Admission fee.')
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
