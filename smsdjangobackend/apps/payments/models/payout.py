from django.db import models
from apps.payments.models.beneficiary import Beneficiary
from apps.payments.models.beneficiary import Beneficiary

class Payout(models.Model):
    payout_order_id = models.CharField(max_length=50, unique=True)
    beneficiary = models.ForeignKey(Beneficiary, on_delete=models.PROTECT)
    amount = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    vendor_transaction_fees = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    order_status = models.CharField(max_length=50, default='PENDING')
    reference_id = models.CharField(max_length=50, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
