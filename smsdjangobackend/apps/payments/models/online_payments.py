import datetime
from apps.users.models import User
from django.db import models
from apps.payments.models.payment_methods import TRANSACTION_TYPES
from apps.payments.models.gateways import PaymentGateWays
from apps.payments.constants import PAYMENT_GATEWAYS_DATA_MAP
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

EntityNames = (
    ("FC", "Fee Collection"),
    ("AF", "Application Fee"),
)
StatusList = (
    (0, "Pending"),
    (1, "Paid"),
    (2, "Refunded"),
)


class OnlinePayment(models.Model):
    order_id = models.CharField(max_length=50, unique=True)
    cf_payment_id = models.CharField(
        max_length=20, null=True, default=None
    )  # cashfree_payment_id
    entity_name = models.CharField(max_length=10, choices=EntityNames)
    amount = models.DecimalField(max_digits=30, decimal_places=2)
    transaction_fees = models.DecimalField(
        max_digits=30, decimal_places=2
    )  # transaction fee taken from student
    vendor_transaction_fees = models.DecimalField(
        max_digits=30, decimal_places=2, default=0
    )  # institute transaction fee
    """
        PENDING, FAILED, SUCCESS order statuses
        ACTIVE -> transaction started but payment not done
        Success -> payment done
        Failed -> Payment not done
    """
    order_status = models.CharField(max_length=50, default="ACTIVE")
    # Payment status - ["SUCCESS", "NOT_ATTEMPTED", "FAILED", "USER_DROPPED", "VOID", "CANCELLED", "PENDING"]
    payment_status = models.CharField(
        max_length=50, default="NOT_ATTEMPTED"
    )  # here we save the response directly from the payment gateway it means whatever the status it sends we store that
    mode_of_payment = models.CharField(max_length=50, default="", blank=True)
    return_url = models.CharField(max_length=255, default="")
    user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name="online_payment_created_by",
        on_delete=models.SET_NULL,
    )
    #  Module got updated if status is true
    #  Example :- Fee collection is marked as paid on payment if status is true
    status = models.CharField(max_length=10, choices=StatusList)
    gateway_vendor = models.ForeignKey(
        PaymentGateWays, default=1, on_delete=models.PROTECT
    )
    data = models.JSONField()
    gateway_response = models.JSONField(default=dict)
    failed_reason = models.CharField(max_length=500, null=True, blank=True)
    expiry_time = models.DateTimeField(default=datetime.datetime.now)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return str(self.order_id)


class OnlinePaymentLog(models.Model):
    content_type = models.ForeignKey(
        ContentType, on_delete=models.CASCADE, null=True, blank=True, default=None
    )
    object_id = models.PositiveIntegerField(null=True, blank=True, default=None)
    content_object = GenericForeignKey("content_type", "object_id")
    request_token = models.CharField(max_length=3000, null=True, blank=True)
    response_token = models.CharField(max_length=3000, null=True, blank=True)
    request_type = models.IntegerField(
        null=True, blank=True
    )  # 1 POST REQUEST, 2 GET REQUEST
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class OnlinePaymentReturnDataLog(models.Model):
    online_payment = models.ForeignKey(
        OnlinePayment,
        null=True,
        blank=True,
        related_name="online_payment_return_data_log_online_payment",
        on_delete=models.SET_NULL,
    )
    data = models.JSONField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

