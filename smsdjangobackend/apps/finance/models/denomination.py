from django.db import models

from apps.finance.models.bankTransaction import BankTransaction
from apps.finance.models.deposit import DepositWithdrawRecord

class Denomination(models.Model):
    amount = models.IntegerField(unique=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.amount)


class BankTransactionDenomination(models.Model):
    bank_transaction = models.ForeignKey(
        BankTransaction, related_name='bank_transaction_denomination_bank_transaction', on_delete=models.CASCADE
    )
    denomination = models.ForeignKey(Denomination, on_delete=models.PROTECT)
    count = models.IntegerField(default=0)
    total_amount = models.FloatField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.denomination.amount * self.count
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.count} x {self.denomination.amount}"

class DepositWithdrawRecordDenomination(models.Model):
    deposit_withdraw_record = models.ForeignKey(
        DepositWithdrawRecord, related_name='deposit_withdraw_record_denomination_deposit_withdraw_record', on_delete=models.CASCADE
    )
    denomination = models.ForeignKey(Denomination, on_delete=models.PROTECT)
    count = models.IntegerField(default=0)
    total_amount = models.FloatField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        self.total_amount = self.denomination.amount * self.count
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.count} x {self.denomination.amount}"
