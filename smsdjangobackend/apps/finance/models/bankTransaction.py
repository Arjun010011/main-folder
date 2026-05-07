import datetime

from django.db import models

from apps.finance.models import FeeType
from apps.institutes.models.financialyear import FinancialYear
from apps.shared.models import Document
from apps.staffs.models import Staff


class BankDetail(models.Model):
    bank_id = models.CharField(max_length=255, null=True, blank=True)
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_num = models.CharField(max_length=255)
    opening_balance = models.FloatField(default=0)
    opening_balance_type = models.CharField(
        max_length=10, default='DEBIT',
        help_text="Whether the opening balance is a debit or credit entry"
    )
    closing_balance = models.FloatField(default=0)
    financial_year = models.ForeignKey(
        FinancialYear, related_name='bank_detail_financial_year',
        null=True, blank=True, on_delete=models.SET_NULL
    )
    ifsc = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class BankFeeTypeMapping(models.Model):
    bank = models.ForeignKey(BankDetail, related_name='bank_fee_type_mapping_bank', null=True, blank=True, on_delete=models.SET_NULL)
    fee_type = models.ForeignKey(FeeType, related_name='bank_fee_type_mapping_fee_type', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    from_date = models.DateField(default=datetime.date.today)
    to_date = models.DateField(default='9999-12-31')


class BankTransaction(models.Model):
    date = models.DateField(default=datetime.date.today)
    bank = models.ForeignKey(BankDetail, related_name='bank_transaction_bank', null=True, blank=True,
                             on_delete=models.SET_NULL)
    is_deposit = models.BooleanField(default=True)
    amount = models.FloatField(null=True)
    balance = models.FloatField(null=True)
    ref_number = models.CharField(max_length=255, blank=True, null=True)
    particulars = models.CharField(max_length=255, blank=True, null=True)
    attachment = models.OneToOneField(Document, related_name='bank_transaction_attachment', blank=True, null=True,
                                      on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, related_name='bank_transaction_staff', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
