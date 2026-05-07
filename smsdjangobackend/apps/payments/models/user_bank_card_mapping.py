from django.db import models

from apps.users.models import User
from apps.payments.models.online_payments import OnlinePayment


CARD_TYPES = (
    ('DC', 'Debit Card'),
    ('CC', 'Credit Card')
)

class UserBankAccount(models.Model):
    card_type = models.CharField(max_length=5, choices=CARD_TYPES)
    card_number = models.CharField(max_length=30)
    card_holder_name = models.CharField(max_length=50, default='', null=True, blank=True)
    expiry_month = models.CharField(max_length=2)
    expiry_year = models.CharField(max_length=4)
    cvv_code = models.CharField(max_length=3)
    user = models.ForeignKey(User, null=True, blank=True, related_name='card_user', on_delete=models.SET_NULL)

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('card_number', 'user')


class PaymentAccountMapping(models.Model):
    bank_account = models.OneToOneField(UserBankAccount, related_name='user_bank_account', on_delete=models.PROTECT)
    online_payment = models.OneToOneField(OnlinePayment, related_name='account_online_payment', on_delete=models.PROTECT)
    