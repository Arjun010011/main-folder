from django.db import models

from apps.payments.models.payout import Payout


class PayoutFeeCollectionMapping(models.Model):
    from apps.finance.models.feeCollection import FeeCollection
    from apps.finance.models.fee import FeePlan
    payout = models.ForeignKey(Payout, related_name='payout', null=True, blank=True, on_delete=models.SET_NULL)
    fee_collection = models.ForeignKey(FeeCollection, related_name='fee_collection', null=True, blank=True, on_delete=models.PROTECT)
    fee_plan = models.ForeignKey(FeePlan, related_name='fee_plan', null=True, blank=True, on_delete=models.SET_NULL)
    fee_amount = models.FloatField(default=0)
    adjustment_amount = models.FloatField(default=0)
    fine_amount = models.FloatField(default=0)
    is_configuration = models.BooleanField(default=True)
