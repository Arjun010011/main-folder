from rest_framework import exceptions
import datetime

from django.db import models
from django.db.models import JSONField

from apps.classes.models import Standard
from apps.forms.models import ApplicationStudent
from apps.institutes.models import AcademicYear
from apps.shared.models.mode_of_payment import ModeOfPayment
from apps.students.models.student import Student
from apps.finance.models.fee import FeePlan
from apps.finance.models.fee_category import FeeCategory
from apps.users.models import User
from apps.payments.models.online_payments import OnlinePayment
from apps.finance.models.bankTransaction import BankDetail

class FeeCollection(models.Model):
    modeofpayment = (
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('CreditCard', 'Credit card'),
        ('DebitCard', 'Debit card'),
        ('NetBanking', 'Net Banking'),
        ('UPIPayments', 'UPI payments'),
        ('Online', 'Online'), # Online cashfree payment
        ('Debit', 'Debit'),
        ('Credit', 'Credit')
    )
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    transaction_date = models.DateField(default=datetime.date.today)
    student = models.ForeignKey(Student, null=True, blank=True, related_name='fee_collection',
                                on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, related_name='user_fee_collection', on_delete=models.SET_NULL)
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    online_payment = models.OneToOneField(OnlinePayment, related_name='fee_collection_online_payment', null=True, blank=True, on_delete=models.PROTECT)
    total_amount = models.FloatField(null=True)
    pending_amount = models.FloatField(null=True)
    payment_note = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        mode_of_payment_list = ModeOfPayment.objects.all().values_list('name', flat=True)
        if self.mode_of_payment not in mode_of_payment_list:
            raise exceptions.ValidationError(f'Invalid mode of payment {self.mode_of_payment}')
        super().save(*args, **kwargs)

class FeeCollectionModeOfPayment(models.Model):
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    fee_collection = models.ForeignKey(FeeCollection, null=True, blank=True, related_name='fee_collection_mode_of_payment_fee_collection',
                                on_delete=models.SET_NULL)
    amount = models.FloatField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    loan_from_bank = models.CharField(max_length=255,null=True,blank=True)
    loan_to_bank = models.CharField(max_length=255,null=True,blank=True)
    loan_utr_number = models.CharField(max_length=255, blank=True, null=True)
    loan_credited_date = models.DateField(null=True,blank=True)
    bank_detail = models.ForeignKey(BankDetail, null=True, blank=True, related_name='fee_collection_mode_of_payment_bank_detail',on_delete=models.SET_NULL)

    def save(self, *args, **kwargs):
        mode_of_payment_list = ModeOfPayment.objects.all().values_list('name', flat=True)
        if self.mode_of_payment not in mode_of_payment_list:
            raise exceptions.ValidationError(f'Invalid mode of payment {self.mode_of_payment}')
        super().save(*args, **kwargs)

class FeeCollectionDeleteTracking(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, related_name='fee_collection_delete_tracking_user', on_delete=models.SET_NULL)
    fee_collection = models.ForeignKey(FeeCollection, related_name='fee_collection_delete_tracking_fee_collection', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    reason = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class PaymentDetail(models.Model):
    fee_collection = models.ForeignKey(FeeCollection, related_name='payment_detail', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    fee_plan = models.ForeignKey(FeePlan, related_name='fee_collection', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    fee_fine_amount = models.FloatField(default=0)
    total_fine_days_paid = models.IntegerField(default=0)
    amount_paid = models.FloatField(null=True)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(FeeCategory,null=True, blank=True,related_name='payment_detail_category', on_delete=models.CASCADE)

class AdmissionForm(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='admission_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    admission_num = models.CharField(max_length=255)
    admission_date = models.DateField(default=datetime.date.today)
    student = models.ForeignKey(Student, null=True, related_name='student_admission', blank=True,
                                on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    """
        for getting multiple student written in student service
    """
    def get_student_admission_num(self, student_id):
        admission_form = AdmissionForm.objects.filter(student=student_id).first()
        if not admission_form:
            return ''
        return admission_form.admission_num

class AdmissionFormHistory(models.Model):
    admission_form = models.ForeignKey(AdmissionForm, related_name='admission_form_history_admission_form', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    data = JSONField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ApplicationPlan(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='application_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='application_standard', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    amount = models.FloatField(null=True)
    online_amount  = models.FloatField(null=True)
    is_academic_year_online_appln = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class ApplicationPaymentDetail(models.Model):
    modeofpayment = (
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('CreditCard', 'Credit card'),
        ('DebitCard', 'Debit card'),
        ('NetBanking', 'Net Banking'),
        ('UPIPayments', 'UPI payments'),
        ('Online', 'Online'), # Online payment gateway (OnePay, CashFree, etc.)
        ('Debit', 'Debit'),
        ('Credit', 'Credit')
    )
    name = models.CharField(max_length=255, default='Application')
    amount_paid = models.FloatField(null=True)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    transaction_date = models.DateField(default=datetime.date.today)
    student = models.OneToOneField(ApplicationStudent, null=True, related_name='application_payment', blank=True,
                                   on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, related_name='user_application', on_delete=models.SET_NULL)
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    online_payment = models.OneToOneField(OnlinePayment, related_name='application_payment_online_payment', null=True, blank=True, on_delete=models.PROTECT)
    bank_detail = models.ForeignKey(BankDetail, null=True, blank=True, related_name='application_payment_detail_bank_detail',on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
