from django.db import models
import datetime

from apps.institutes.models.academicYear import AcademicYear
from apps.students.models.student import Student
from apps.finance.models.fee import FeePlan
from apps.finance.models.bankTransaction import BankDetail


class FeeAdvanceType(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or self.code or str(self.id)


class FeeAdvanceCollection(models.Model):
    fee_advance_type = models.ForeignKey(
        FeeAdvanceType,
        on_delete=models.CASCADE,
        related_name='fee_advance_collection_fee_advance_type',
        null=True,
        blank=True,
    )
    amount = models.FloatField()
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        related_name='fee_advance_collection_academic_year',
        null=True,
        blank=True,
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='fee_advance_collection_student',
        null=True,
        blank=True,
    )
    is_active = models.BooleanField(default=True)
    transaction_date = models.DateField(default=datetime.date.today)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_note = models.CharField(max_length=255, null=True, blank=True)
    # bank_detail = models.ForeignKey(BankDetail, null=True, blank=True, related_name='fee_advance_collection_bank_detail',on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'FeeAdvance #{self.id} ({self.amount})'

class FeeAdvanceCollectionPaymentDetail(models.Model):
    fee_advance_collection = models.ForeignKey(
        FeeAdvanceCollection,
        on_delete=models.CASCADE,
        related_name='fee_advance_collection_payment_detail_fee_advance_collection',
        null=True,
        blank=True,
    )
    amount = models.FloatField(null=True, blank=True)
    fee_plan = models.ForeignKey(
        FeePlan,
        on_delete=models.CASCADE,
        related_name='fee_advance_collection_payment_detail_fee_plan',
        null=True,
        blank=True,
    )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'FeeAdvanceCollectionPaymentDetail #{self.id} ({self.amount})'


