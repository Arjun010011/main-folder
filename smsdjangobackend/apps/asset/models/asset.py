from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.core.exceptions import ValidationError

from apps.asset.models.asset_group import AssetGroup
from apps.finance.models.bankTransaction import BankDetail



class Asset(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active'),
        ('INACTIVE', 'Inactive'),
        ('DISPOSED', 'Disposed'),
    )

    asset_code = models.CharField(max_length=50)
    asset_name = models.CharField(max_length=255)
    asset_group = models.ForeignKey(
        AssetGroup,
        on_delete=models.PROTECT,
        related_name='asset_asset_group'
    )
    purchase_date = models.DateField()
    put_to_use_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date when asset was put to use. Defaults to purchase_date if not set."
    )
    capitalization_date = models.DateField(
        null=True,
        blank=True,
        help_text="Date of capitalization. Defaults to put_to_use_date."
    )
    original_cost = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    salvage_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    useful_life_years = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Override group's useful life. If null, uses group setting."
    )
    location = models.CharField(max_length=255, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ACTIVE'
    )
    bank = models.ForeignKey(
        BankDetail,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_bank',
        help_text="Bank account used for purchase of this asset"
    )
    remarks = models.TextField(null=True, blank=True)
    expense_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Tracks the expense that created this asset (not FK, just tracking)"
    )
    is_fully_depreciated = models.BooleanField(
        default=False,
        help_text="Computed flag: True when WDV reaches salvage value"
    )
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['asset_code']
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'

    def __str__(self):
        return f"{self.asset_code} - {self.asset_name}"

    def save(self, *args, **kwargs):
        if not self.put_to_use_date:
            self.put_to_use_date = self.purchase_date
        if not self.capitalization_date:
            self.capitalization_date = self.put_to_use_date
        # Validate unique asset_code among active assets
        if self.is_active and self.asset_code:
            qs = Asset.objects.filter(asset_code=self.asset_code, is_active=True)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(f'An active asset with code "{self.asset_code}" already exists.')
        super().save(*args, **kwargs)

    def get_effective_useful_life(self):
        if self.useful_life_years:
            return self.useful_life_years
        return self.asset_group.useful_life_years

    def get_depreciation_method(self):
        return self.asset_group.depreciation_method

    def get_depreciation_rate(self):
        return self.asset_group.depreciation_rate

    def is_depreciable(self):
        return self.asset_group.is_depreciable and self.status == 'ACTIVE'
