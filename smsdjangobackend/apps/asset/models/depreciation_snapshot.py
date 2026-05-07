from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from rest_framework.exceptions import ValidationError

from apps.asset.models.asset import Asset
from apps.institutes.models.financialyear import FinancialYear
from apps.users.models import User


class AssetDepreciationSnapshot(models.Model):

    DEPRECIATION_BASIS_CHOICES = (
        ('COST', 'Original Cost'),
        ('WDV', 'Written Down Value'),
    )

    CALCULATION_METHOD_CHOICES = (
        ('SLM', 'Straight Line Method'),
        ('WDV', 'Written Down Value'),
        ('MANUAL', 'Manual Entry'),
        ('NONE', 'No Depreciation'),
    )

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='asset_depreciation_snapshot_asset'
    )
    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        related_name='asset_depreciation_snapshot_financial_year'
    )
    opening_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    additions = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Capital additions during year (Phase-1: always 0)"
    )
    depreciation_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    closing_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    depreciation_basis = models.CharField(
        max_length=10,
        choices=DEPRECIATION_BASIS_CHOICES,
        default='COST',
        help_text="COST for SLM, WDV for Written Down Value method"
    )
    calculation_method = models.CharField(
        max_length=10,
        choices=CALCULATION_METHOD_CHOICES,
        help_text="SLM, WDV, MANUAL, or NONE"
    )
    months_depreciated = models.PositiveIntegerField(
        default=12,
        help_text="Number of months depreciated (for pro-rata calculation)"
    )
    
    is_manual_depreciation = models.BooleanField(
        default=False,
        help_text="True if depreciation value was manually entered/edited"
    )
    original_calculation_method = models.CharField(
        max_length=10,
        null=True,
        blank=True,
        help_text="Original system-calculated method before manual override"
    )
    
    calculated_on = models.DateTimeField(auto_now=True)
    
    is_locked = models.BooleanField(
        default=False,
        help_text="Once locked, snapshot is immutable for audit purposes"
    )
    locked_on = models.DateTimeField(null=True, blank=True)
    locked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_depreciation_snapshot_locked_by'
    )
    
    unlocked_on = models.DateTimeField(null=True, blank=True)
    unlocked_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_depreciation_snapshot_unlocked_by'
    )
    
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset', 'financial_year']
        unique_together = ('asset', 'financial_year')
        verbose_name = 'Asset Depreciation Snapshot'
        verbose_name_plural = 'Asset Depreciation Snapshots'

    def __str__(self):
        return f"{self.asset.asset_code} - FY {self.financial_year}"

    def save(self, *args, **kwargs):
        allow_unlock = kwargs.pop('allow_unlock', False)
        
        if self.pk:
            old_instance = AssetDepreciationSnapshot.objects.filter(pk=self.pk).first()
            if old_instance and old_instance.is_locked and not allow_unlock:
                raise ValidationError("Cannot modify a locked depreciation snapshot.")
        super().save(*args, **kwargs)
