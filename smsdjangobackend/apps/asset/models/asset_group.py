from django.db import models
from django.core.exceptions import ValidationError
from apps.institutes.models import FinancialYear

class AssetGroup(models.Model):

    DEPRECIATION_METHOD_CHOICES = (
        ('SLM', 'Straight Line Method'),
        ('WDV', 'Written Down Value'),
        ('MANUAL', 'Manual'),
        ('NONE', 'No Depreciation'),
    )

    GROUP_TYPE_CHOICES = (
        ('FIXED_ASSET', 'Fixed Asset'),
        ('LIABILITY', 'Liability'),
    )

    name = models.CharField(max_length=255)
    group_type = models.CharField(
        max_length=20,
        choices=GROUP_TYPE_CHOICES,
        default='FIXED_ASSET',
        help_text="Whether this group belongs to Assets or Liabilities"
    )
    code = models.CharField(max_length=50, null=True, blank=True)
    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='asset_group_financial_year',
        help_text='Financial year this group belongs to'
    )
    parent_group = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='asset_group_parent_group'
    )
    depreciation_method = models.CharField(
        max_length=10,
        choices=DEPRECIATION_METHOD_CHOICES,
        default='WDV'
    )
    useful_life_years = models.PositiveIntegerField(default=10)
    depreciation_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Rate for WDV method (e.g., 15.00 for 15%)"
    )
    display_order = models.PositiveIntegerField(default=0)
    description = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Asset Group'
        verbose_name_plural = 'Asset Groups'

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_active and self.code:
            qs = AssetGroup.objects.filter(code=self.code, is_active=True, financial_year=self.financial_year)
            if self.pk:
                qs = qs.exclude(pk=self.pk)
            if qs.exists():
                raise ValidationError(f'An active asset group with code "{self.code}" already exists.')
        super().save(*args, **kwargs)

    def get_hierarchy_path(self):
        path = [self.name]
        parent = self.parent_group
        while parent:
            path.insert(0, parent.name)
            parent = parent.parent_group
        return path

    def get_all_children(self):
        children = list(self.asset_group_parent_group.filter(is_active=True))
        for child in self.asset_group_parent_group.filter(is_active=True):
            children.extend(child.get_all_children())
        return children

    @property
    def is_depreciable(self):
        return self.depreciation_method != 'NONE'
