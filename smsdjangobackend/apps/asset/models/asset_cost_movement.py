from django.db import models
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal

from apps.asset.models.asset import Asset
from apps.institutes.models.financialyear import FinancialYear


class AssetCostMovement(models.Model):

    MOVEMENT_TYPE_CHOICES = (
        ('OPENING', 'Opening Balance'),
        ('ADDITION', 'Capital Addition'),
        ('DISPOSAL', 'Disposal at Cost'),
    )

    OPENING_SOURCE_CHOICES = (
        ('MIGRATED', 'Migrated from Previous System'),
        ('PREVIOUS_FY_CLOSING', 'Previous FY Closing Balance'),
        ('MANUAL_ADJUSTMENT', 'Manual Adjustment'),
    )

    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE,
        related_name='asset_cost_movement_asset'
    )
    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        related_name='asset_cost_movement_financial_year'
    )
    movement_type = models.CharField(
        max_length=20,
        choices=MOVEMENT_TYPE_CHOICES
    )
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Cost amount (always positive)"
    )
    movement_date = models.DateField(
        help_text="Date of the movement (e.g., purchase date, disposal date)"
    )

    opening_source = models.CharField(
        max_length=30,
        choices=OPENING_SOURCE_CHOICES,
        null=True,
        blank=True,
        help_text="Required for OPENING type. Indicates source of opening balance."
    )
    opening_reference = models.TextField(
        null=True,
        blank=True,
        help_text="Reference for opening balance, e.g., 'As per audited BS 2024-25'"
    )

    remarks = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset', 'financial_year', 'movement_type']
        verbose_name = 'Asset Cost Movement'
        verbose_name_plural = 'Asset Cost Movements'

    def __str__(self):
        return f"{self.asset.asset_code} - {self.movement_type} - FY {self.financial_year}"

    def clean(self):
        if self.movement_type == 'OPENING' and not self.opening_source:
            raise ValidationError({
                'opening_source': 'Opening source is required for OPENING movement type.'
            })
        
        if self.movement_type != 'OPENING' and self.opening_source:
            self.opening_source = None
            self.opening_reference = None

        # Validate unique OPENING/DISPOSAL per asset + financial_year
        if self.movement_type in ('OPENING', 'DISPOSAL'):
            qs = AssetCostMovement.objects.filter(
                asset=self.asset, financial_year=self.financial_year,
                movement_type=self.movement_type
            )
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(
                    f'A {self.movement_type} movement already exists for this asset and financial year.'
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
