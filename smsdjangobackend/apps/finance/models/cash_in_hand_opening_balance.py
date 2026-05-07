from django.db import models
from apps.staffs.models import Staff
from apps.users.models import User


class StaffWallet(models.Model):
    staff = models.OneToOneField(
        Staff,
        related_name='staff_wallet_staff',
        on_delete=models.CASCADE,
    )
    opening_balance = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    opening_balance_type = models.CharField(
        max_length=10, default='DEBIT',
        help_text="Whether the opening balance is a debit or credit entry"
    )
    opening_date = models.DateField()
    created_by = models.ForeignKey(
        User,
        related_name='staff_wallet_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
    )
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return f'{self.staff} - {self.opening_balance} ({self.opening_date})'
