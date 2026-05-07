from django.db import models
from apps.finance.models.fee import FeePlan

from apps.finance.models.feeCollection import PaymentDetail

"""
    Initially build for GST
"""

class AdditionalChargeType(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=50, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class AdditionalCharge(models.Model):
    name = models.CharField(max_length=255)
    additional_charge_type = models.ForeignKey(
        AdditionalChargeType, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='additional_charge_additional_charge_type'
    )
    description = models.CharField(max_length=255, null=True, blank=True)
    fees = models.DecimalField(max_digits=30, decimal_places=2)
    is_percentage = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    apply_on_payment_mode = models.CharField(max_length=255, null=True, blank=True) #comma separated values
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
    apply_on statuses
    0: means apply always
    1: means apply on online payment
"""
class FeePlanAdditionalChargeMapping(models.Model):
    fee_plan = models.ForeignKey(FeePlan, on_delete=models.CASCADE, null=True, blank=True, related_name='fee_plan_additional_charge_mapping_fee_plan')
    additional_charge = models.ForeignKey(
        AdditionalCharge, on_delete=models.CASCADE, null=True, blank=True,
        related_name='fee_plan_additional_charge_mapping_additional_charge'
    )
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FeeCollectionAdditionChargeMapping(models.Model):
    payment_detail = models.ForeignKey(
                        PaymentDetail, null=True, related_name='fee_collection_addition_charge_mapping_fee_collection',
                        blank=True, on_delete=models.SET_NULL
                    )
    additional_charge = models.ForeignKey(
                            AdditionalCharge, null=True, blank=True, on_delete=models.SET_NULL,
                            related_name='fee_collection_addition_charge_mapping'
                        )
    amount = models.DecimalField(max_digits=30, decimal_places=2)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)