import datetime

from django.db import models

from apps.institutes.models import AcademicYear
from apps.staffs.models.staff import Staff
from apps.students.models import Student
from apps.users.models import User
from apps.finance.models.bankTransaction import BankDetail
from apps.classes.models.standard import Standard



class MiscellaneousType(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    code_name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class MiscellaneousMapping(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='misc_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    misc_type = models.ForeignKey(MiscellaneousType, null=True, blank=True, related_name='misc_type',
                                  on_delete=models.SET_NULL)
    amount = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Miscellaneous(models.Model):
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
    date = models.DateField(default=datetime.date.today)
    total_amount = models.FloatField(null=True)# tax + amount
    guest_name = models.CharField(max_length=255, null=True, blank=True)
    guest_standard = models.ForeignKey(Standard, related_name='miscellaneous_guest_standard', null=True, blank=True, on_delete=models.SET_NULL)
    ref_number = models.CharField(max_length=255, blank=True, null=True)
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_note = models.CharField(max_length=255, null=True, blank=True)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    particulars = models.CharField(max_length=255, blank=True, null=True)
    student = models.ForeignKey(Student, related_name='misc_student', null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, related_name='misc_user', on_delete=models.SET_NULL)
    staff = models.ForeignKey(      # ✅ NEW FIELD
        Staff,
        related_name="miscellaneous_staff",
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    is_active = models.BooleanField(default=True)
    tax = models.FloatField(null=True,blank=True)# tax
    amount = models.FloatField(null=True,blank=True)# amount
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class MiscellaneousPayment(models.Model):
    amount = models.FloatField(null=True)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    misc = models.ForeignKey(MiscellaneousMapping, related_name='misc', null=True, blank=True,
                             on_delete=models.SET_NULL)
    miscellaneous = models.ForeignKey(Miscellaneous, related_name='miscellaneous', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    bank_detail = models.ForeignKey(BankDetail, null=True, blank=True, related_name='miscellaneous_payment_bank_detail',on_delete=models.SET_NULL)
