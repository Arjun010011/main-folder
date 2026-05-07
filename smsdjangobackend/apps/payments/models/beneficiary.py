from django.db import models
from datetime import datetime
from rest_framework import exceptions
from django.db.models import JSONField

from apps.users.models import User
from apps.shared.services import CounterService
from apps.finance.models import FeePlan
from apps.shared.services import SharedService
from apps.institutes.models.institute import Institute
from apps.payments.models.gateways import PaymentGateWays


class Beneficiary(models.Model):
    beneficiary_id = models.CharField(max_length=50, default='', blank=True, unique=True)
    user = models.ForeignKey(User, null=True, blank=True, related_name='beneficiary_user', on_delete=models.SET_NULL)
    email = models.EmailField(blank=False)
    phone = models.CharField(max_length=50)
    bank_account = models.CharField(max_length=50)
    account_holder_name = models.CharField(max_length=50)
    ifsc = models.CharField(max_length=50)
    address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    pincode = models.IntegerField()
    status = models.BooleanField(default=True)
    is_primary = models.BooleanField(default=False)
    data = JSONField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        from apps.payments.services import CashFreePayoutAPICalls
        if not self.user.is_superuser:
            if self.is_primary:
                raise exceptions.ValidationError('Only super admin can set Primary Beneficiary')

        if self.id is None:
            # Here I am gererating beneficiary id based on academic year. 
            # Please check whether it is required or not
            # But this account is not related to academic year
            beneficiary_counter, beneficiary_prefix, beneficiary_postfix = CounterService.get_countered_value(self, 'BENEFICIARY')
            beneficiary_prefix += str(Institute.get_institute(self).company_id) + '_'
            beneficiary_prefix += SharedService.generate_random_number()
            beneficiary_id = f'{beneficiary_prefix}{beneficiary_counter.value}{beneficiary_postfix}'
            self.beneficiary_id = beneficiary_id
            CounterService.increment_counter(self, beneficiary_counter)
            payload = {
                "beneId": beneficiary_id,
                "name": self.account_holder_name,
                "phone": self.phone,
                "email": self.email,
                "bankAccount": self.bank_account,
                "accountHolder": self.account_holder_name,
                "ifsc": self.ifsc,
                "address": self.address,
                "city": self.city,
                "state": self.state,
                "pincode": self.pincode
            }
            CashFreePayoutAPICalls.add_beneficiary(payload)
        super(Beneficiary, self).save(*args, **kwargs)

    def __str__(self):
        return str(self.bank_account)

    class Meta:
        db_table = 'beneficiary'


class BeneficiaryFeePlanMapping(models.Model):
    beneficiary = models.ForeignKey(Beneficiary, related_name='beneficiary', on_delete=models.CASCADE)
    fee_plan = models.ForeignKey(FeePlan, related_name='fee_type', on_delete=models.CASCADE)
    gateway_vendor = models.ForeignKey(PaymentGateWays, default=1, on_delete=models.PROTECT)
    amount_type_choice = (
        (1, 'fee_amount'),
        (2, 'fine_amount'),
        (3, 'adjustment_amount'),
        (4, 'transaction_fees'),
    )
    amount_type = models.IntegerField(default=1, choices=amount_type_choice)
    is_amount = models.BooleanField(default=False)
    rate = models.DecimalField(max_digits=30, decimal_places=2)
    priority = models.IntegerField(default=1)
    
    def clean(self) -> None:
        if not self.request.user.is_superuser:
            raise exceptions.ValidationError(f"Only super admin can set Fee plan wise beneficiary")
        # qs = BeneficiaryFeePlanMapping.objects.filter(beneficiary=self.beneficiary, fee_type=self.fee_type, is_active=True)
        # if qs.count() > 0:
        #     raise exceptions.ValidationError(f"Already One Beneficiary found for ${self.fee_type.name}!!")