from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal

from apps.asset.models.asset import Asset
from apps.finance.models.bankTransaction import BankDetail


class AssetDisposal(models.Model):

    DISPOSAL_REASON_CHOICES = (
        ('SOLD', 'Sold'),
        ('SCRAPPED', 'Scrapped'),
        ('DONATED', 'Donated'),
        ('WRITTEN_OFF', 'Written Off'),
        ('LOST', 'Lost / Missing'),
        ('OTHER', 'Other'),
    )

    CREDIT_TO_CHOICES = (
        ('NONE', 'None'),
        ('CASH', 'Cash-in-Hand'),
        ('BANK', 'Bank Account'),
    )

    asset = models.OneToOneField(
        Asset,
        on_delete=models.CASCADE,
        related_name='asset_disposal_asset'
    )
    disposal_date = models.DateField()
    disposal_value = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Sale proceeds or scrap value"
    )
    wdv_at_disposal = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Written Down Value at time of disposal"
    )
    gain_loss = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disposal value - WDV (positive = gain, negative = loss)"
    )
    reason = models.CharField(
        max_length=20,
        choices=DISPOSAL_REASON_CHOICES,
        default='SOLD'
    )
    credit_to = models.CharField(
        max_length=10,
        choices=CREDIT_TO_CHOICES,
        default='NONE',
        help_text="Where the disposal credit amount goes"
    )
    credit_bank = models.ForeignKey(
        BankDetail,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_disposal_credit_bank',
        help_text="Bank account to credit when credit_to is BANK"
    )
    remarks = models.TextField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-disposal_date']
        verbose_name = 'Asset Disposal'
        verbose_name_plural = 'Asset Disposals'

    def __str__(self):
        return f"{self.asset.asset_code} disposed on {self.disposal_date}"

    def save(self, *args, **kwargs):
        if self.wdv_at_disposal is not None:
            self.gain_loss = self.disposal_value - self.wdv_at_disposal
        super().save(*args, **kwargs)
