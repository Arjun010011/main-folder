import datetime

from django.db import models

from apps.users.models import User
from apps.institutes.models import FinancialYear
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.finance.models.bankTransaction import BankDetail
from apps.shared.models import Document

class DepositWithdrawRecord(models.Model):
    date = models.DateField(default=datetime.date.today)
    transaction_type = models.IntegerField(default=True) #1.deposit , 2.withdraw 3.transaction
    transaction_from = models.IntegerField(default=True) #1.fee collection ,2.misc ,3. Expenses ,4.Banktobank/cash_in_hand 5. application fees
    amount = models.FloatField(null=True,blank=True)
    reason = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, related_name='deposit_withdraw_record_created_by', null=True, blank=True,
                on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    financial_year = models.ForeignKey(FinancialYear,related_name='deposit_withdraw_record_financial_year', null=True, blank=True,
                on_delete=models.SET_NULL)
    bank_from = models.ForeignKey(BankDetail, null=True, blank=True, related_name='deposit_withdraw_record_bank_from',on_delete=models.SET_NULL)
    bank_to = models.ForeignKey(BankDetail, null=True, blank=True, related_name='deposit_withdraw_record_bank_to',on_delete=models.SET_NULL)
    user_from = models.ForeignKey(User, null=True, blank=True, related_name='deposit_withdraw_record_user_from',on_delete=models.SET_NULL)
    user_to = models.ForeignKey(User, null=True, blank=True, related_name='deposit_withdraw_record_user_to',on_delete=models.SET_NULL)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE,null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    attachment = models.OneToOneField(Document, related_name='deposit_withdraw_record_attachment', blank=True, null=True,
                                      on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)