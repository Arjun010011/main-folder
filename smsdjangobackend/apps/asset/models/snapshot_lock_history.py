from django.db import models
from apps.institutes.models.financialyear import FinancialYear
from apps.users.models import User


class AssetSnapshotLockHistory(models.Model):

    ACTION_CHOICES = (
        ('LOCKED', 'Locked'),
        ('UNLOCKED', 'Unlocked'),
        ('EDITED', 'Edited'),
    )

    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        related_name='asset_snapshot_lock_history_financial_year'
    )
    action = models.CharField(
        max_length=10,
        choices=ACTION_CHOICES
    )
    performed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_snapshot_lock_history_performed_by',
        help_text="User who performed the action (null for system/CLI operations)"
    )
    performed_on = models.DateTimeField(auto_now_add=True)
    remarks = models.TextField(
        null=True,
        blank=True,
        help_text="Optional reason for lock/unlock action"
    )
    snapshot_count = models.PositiveIntegerField(
        help_text="Number of snapshots affected by this action"
    )
    details = models.JSONField(
        null=True,
        blank=True,
        help_text="Detailed information about edits (asset codes, old/new values)"
    )
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-performed_on']
        verbose_name = 'Asset Snapshot Lock History'
        verbose_name_plural = 'Asset Snapshot Lock History'

    def __str__(self):
        return f"{self.action} - FY {self.financial_year} by {self.performed_by} on {self.performed_on}"
