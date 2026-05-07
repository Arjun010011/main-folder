from django.db import models
from apps.users.models import User
from apps.institutes.models import FinancialYear


class RecoverableAssetCategory(models.Model):

    code = models.CharField(max_length=50)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    asset_types = models.JSONField(
        default=list,
        help_text="List of ASSET_TYPE_CHOICES that belong to this category"
    )

    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='recoverable_asset_category_financial_year',
        help_text='Financial year this category belongs to'
    )

    BALANCE_SHEET_CHOICES = (
        ('LIABILITY', 'Liability'),
        ('FIXED_ASSET', 'Fixed Asset'),
    )
    balance_sheet_classification = models.CharField(
        max_length=20,
        choices=BALANCE_SHEET_CHOICES,
        default='LIABILITY',
        help_text="Determines which side of the balance sheet this category appears on"
    )

    is_active = models.BooleanField(default=True)
    display_order = models.PositiveIntegerField(default=0)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='recoverable_asset_category_created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Recoverable Asset Category'
        verbose_name_plural = 'Recoverable Asset Categories'
        ordering = ['display_order', 'name']

    def __str__(self):
        return self.name

