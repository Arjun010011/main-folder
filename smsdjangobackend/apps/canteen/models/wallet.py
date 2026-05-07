from django.db import models
from django.conf import settings


class Wallet(models.Model):

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="wallet_user",
    )
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet | User {self.user_id if self.user_id else '-'} | ₹{self.balance}"


class WalletTransaction(models.Model):

    TRANSACTION_TYPE_CHOICES = [
        (0, "Credit"),
        (1, "Debit"),
    ]


    REFERENCE_TYPE_CHOICES = [
        (0, "Top-up"),
        (1, "Order Payment"),
        (2, "Package Purchase"),
        (3, "Refund"),
        (4, "Adjustment"),
    ]

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="wallet_transaction_wallet")
    transaction_type = models.IntegerField(choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    balance_before = models.DecimalField(max_digits=10, decimal_places=2)
    balance_after = models.DecimalField(max_digits=10, decimal_places=2)
    reference_type = models.IntegerField(choices=REFERENCE_TYPE_CHOICES)
    reference_id = models.PositiveIntegerField(null=True, blank=True)
    description = models.CharField(max_length=255, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.wallet} | {self.transaction_type} ₹{self.amount}"