from django.db import models
from apps.payments.models.online_payments import OnlinePayment
from apps.users.models.user import User

class Refund(models.Model):
    refund_id = models.CharField(max_length=50, unique=True)
    online_payment = models.ForeignKey(OnlinePayment, on_delete=models.PROTECT, related_name='refund_online_payment')
    amount = models.DecimalField(max_digits=30, decimal_places=2)
    # refund_status = models.BooleanField(default=False)
    refund_status = models.CharField(max_length=50, unique=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    gateway_refund_id = models.CharField(max_length=50, unique=True,default=None)

    def __str__(self):
        return str(self.refund_id)
    
class RefundRequest(models.Model):
    user = models.ForeignKey(User,on_delete=models.PROTECT, related_name='refund_request_user')
    online_payment = models.ForeignKey(OnlinePayment,on_delete=models.PROTECT,related_name='refund_request_online_payment')
    status = models.IntegerField(null=True, blank=True) # 1 requested , 2 Accepted, 3 Rejected, 4 Rejected our mistake
    comments = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)