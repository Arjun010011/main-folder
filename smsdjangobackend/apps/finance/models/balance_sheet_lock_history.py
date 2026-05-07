from django.db import models
from apps.institutes.models import FinancialYear
from apps.users.models import User


class BalanceSheetLockHistory(models.Model):

    ACTION_CHOICES = (
        ('LOCKED', 'Locked'),
        ('UNLOCKED', 'Unlocked'),
        ('EDITED', 'Edited'),
    )

    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.CASCADE,
        related_name='balance_sheet_lock_history_financial_year'
    )
    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    performed_on = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(blank=True, null=True)
    entry_count = models.PositiveIntegerField(
        default=0,
        help_text='Number of balance sheet entries affected'
    )
    details = models.JSONField(
        blank=True, null=True,
        help_text='Extra details about the action (e.g. edited entry info)'
    )

    class Meta:
        verbose_name = 'Balance Sheet Lock History'
        verbose_name_plural = 'Balance Sheet Lock Histories'
        ordering = ['-performed_on']

    def __str__(self):
        return f"BS {self.action} – FY {self.financial_year_id} by {self.performed_by_id}"
