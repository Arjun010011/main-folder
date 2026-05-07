from django.db import models
from django.core.exceptions import ValidationError

from apps.finance.models.fee import FeeType
from apps.finance.models.miscellaneous import MiscellaneousType
from apps.shared.models.counter import Counter

class CounterFeeTypeMapping(models.Model):
    modeofpayment = (
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('CreditCard', 'Credit card'),
        ('DebitCard', 'Debit card'),
        ('NetBanking', 'Net Banking'),
        ('UPIPayments', 'UPI payments'),
        ('Online', 'Online'), # Online cashfree payment
    )
    counter_type_name = models.CharField(max_length=255)
    group_name = models.CharField(max_length=255) #all the standard group based on this name
    fee_type = models.ForeignKey(FeeType, related_name='counter_fee_type_mapping', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    mode_of_payment = models.CharField(max_length=20, choices=modeofpayment, blank=True, null=True)
    prefix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    prefix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    default_prefix = models.CharField(max_length=255, null=True, blank=True) #this will uploaded to the counter prefix when intially created
    default_postfix = models.CharField(max_length=255, null=True, blank=True)
    is_global = models.BooleanField(default=False) #is_global false then creates counter for all the academic year
    is_active=models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('counter_type_name', 'fee_type', 'is_active', 'mode_of_payment')

    def save(self, *args, **kwargs):
        counter_obj = Counter.objects.filter(
            is_active=True
        ).values('type')
        is_type_found = False
        for counter_data in counter_obj:
            if counter_data['type'] == self.counter_type_name:
                is_type_found = True
        if not is_type_found:
            raise ValidationError(f'Counter value not found. Is should be only in {counter_obj}')
        super(CounterFeeTypeMapping, self).save(*args, **kwargs)

class CounterMiscTypeMapping(models.Model):
    modeofpayment = (
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('CreditCard', 'Credit card'),
        ('DebitCard', 'Debit card'),
        ('NetBanking', 'Net Banking'),
        ('UPIPayments', 'UPI payments'),
        ('Online', 'Online'), # Online cashfree payment
    )
    counter_type_name = models.CharField(max_length=255)
    group_name = models.CharField(max_length=255) #all the standard group based on this name
    misc_type = models.ForeignKey(MiscellaneousType, related_name='counter_misc_type_mapping', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    mode_of_payment = models.CharField(max_length=20, choices=modeofpayment, blank=True, null=True)
    prefix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    prefix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    default_prefix = models.CharField(max_length=255, null=True, blank=True) #this will uploaded to the counter prefix when intially created
    default_postfix = models.CharField(max_length=255, null=True, blank=True)
    is_global = models.BooleanField(default=False) #is_global false then creates counter for all the academic year
    is_active=models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('counter_type_name', 'misc_type', 'is_active', 'mode_of_payment')

    def save(self, *args, **kwargs):
        counter_obj = Counter.objects.filter(
            is_active=True
        ).values('type')
        is_type_found = False
        for counter_data in counter_obj:
            if counter_data['type'] == self.counter_type_name:
                is_type_found = True
        if not is_type_found:
            raise ValidationError(f'Counter value not found. Is should be only in {counter_obj}')
        super(CounterMiscTypeMapping, self).save(*args, **kwargs)