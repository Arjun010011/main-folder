from django.db import models

from apps.institutes.models.academicYear import AcademicYear
from apps.students.models.student import Student, StudentGroup
from apps.users.models import User


class FeeMismatchReconciliationLog(models.Model):
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE,
        related_name='fee_mismatch_reconciliation_log_student'
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fee_mismatch_reconciliation_log_academic_year'
    )
    original_student_group = models.ForeignKey(
        StudentGroup, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fee_mismatch_original_student_group'
    )
    new_student_group = models.ForeignKey(
        StudentGroup, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fee_mismatch_new_student_group'
    )
    original_is_new_student = models.BooleanField(null=True, blank=True)
    new_is_new_student = models.BooleanField(null=True, blank=True)
    original_total_fee = models.FloatField(default=0)
    new_total_fee = models.FloatField(default=0)
    total_paid = models.FloatField(default=0)
    adjustment_amount = models.FloatField(default=0)
    reason = models.TextField(null=True, blank=True)
    is_reconciled = models.BooleanField(default=False)
    reconciled_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='fee_mismatch_reconciled_by'
    )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']
        verbose_name = 'Fee Mismatch Reconciliation Log'
        verbose_name_plural = 'Fee Mismatch Reconciliation Logs'


class FeeMismatchPaymentChangeLog(models.Model):
    
    reconciliation_log = models.ForeignKey(
        FeeMismatchReconciliationLog, on_delete=models.CASCADE,
        related_name='payment_changes'
    )
    payment_detail_id = models.IntegerField()
    old_fee_plan_id = models.IntegerField(null=True, blank=True)
    new_fee_plan_id = models.IntegerField(null=True, blank=True)
    old_fee_plan_name = models.CharField(max_length=255, null=True, blank=True)
    new_fee_plan_name = models.CharField(max_length=255, null=True, blank=True)
    old_standard_fee_id = models.IntegerField(null=True, blank=True)
    new_standard_fee_id = models.IntegerField(null=True, blank=True)
    amount_paid = models.FloatField(default=0)
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['id']
        verbose_name = 'Fee Mismatch Payment Change Log'
        verbose_name_plural = 'Fee Mismatch Payment Change Logs'
