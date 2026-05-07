from django.db import models
from rest_framework.exceptions import ValidationError
from apps.payments.constants import PAYMENTS_METHODS_CONFIG
from apps.payments.models.gateways import PaymentGateWays

TRANSACTION_TYPES = (
    ('DEBIT_CARD_TRANSACTION_FEE', 'Debit Card Transaction fee'),
    ('CREDIT_CARD_TRANSACTION_FEE', 'Credit Card Transaction fee'),
    ('NET_BANKING_TRANSACTION_FEE', 'Net Banking Transaction fee'),
    ('UPI_TRANSACTION_FEE', 'UPI Transaction fee'),
    ('UPI_PAYMENT_LINK_FEE', 'UPI Payment Link fee'),
)

class OnlinePaymentMethods(models.Model):
    transaction_type = models.CharField(max_length=50, choices=TRANSACTION_TYPES, default="UPI_TRANSACTION_FEE", unique=True)
    fees = models.DecimalField(max_digits=30, decimal_places=2)
    is_percentage = models.BooleanField(default=True)
    max_fees = models.DecimalField(max_digits=30, decimal_places=2, default=None, null=True, blank=True)
    deduct_from_student = models.BooleanField(default=True)
    gateway_vendor = models.ForeignKey(PaymentGateWays, default=1, on_delete=models.PROTECT)

    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


    def clean(self):
        amount_type_key = 'percentage' if self.is_percentage else 'amount'
        if self.transaction_type not in ['UPI_TRANSACTION_FEE', 'UPI_PAYMENT_LINK_FEE'] and self.max_fees:
            raise ValidationError("For UPI transactions only max fees can be set!!")
        elif not self.is_percentage and self.max_fees:
            raise ValidationError("For fixed transaction fees max fees can't be set!!")
        elif self.max_fees is not None and self.max_fees <= 0:
            raise ValidationError("Max fees should be greater than 0!!")
        elif self.fees is not None and self.fees <= 0:
            raise ValidationError("Fees should be greater than 0!!")
        elif PAYMENTS_METHODS_CONFIG[self.transaction_type]['min_fees']['cashfree'][amount_type_key] > self.fees:
            raise ValidationError(f"Fees is less than min fees!!")
        if not self.is_percentage:
            # max fees will be set for amount type transaction fees type only
            if PAYMENTS_METHODS_CONFIG[self.transaction_type]['min_fees']['cashfree'][amount_type_key] > self.max_fees:
                raise ValidationError(f"Max Fees is less than min fees!!")
