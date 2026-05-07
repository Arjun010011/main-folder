from rest_framework.validators import UniqueValidator
from rest_framework import serializers

from apps.payments.models import Beneficiary, OnlinePayment, OnlinePaymentMethods, OnlinePaymentLog,BeneficiaryFeePlanMapping
from apps.payments.models.gateways import PaymentGateWays
from apps.payments.models.online_payments import OnlinePaymentReturnDataLog
from apps.payments.models.payout import Payout
from apps.payments.models.refund import Refund,RefundRequest


class BeneficiarySerializer(serializers.ModelSerializer):
    beneficiary_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Beneficiary.objects.filter())]
    )
    email = serializers.CharField(
        validators=[UniqueValidator(queryset=Beneficiary.objects.filter(), message='Beneficiary email is already registered')]
    )

    class Meta:
        model = Beneficiary
        exclude = ['created', 'modified']


class OnlinePaymentsSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=OnlinePayment.objects.filter())]
    )
    mode_of_payment = serializers.CharField(
        allow_blank=True,
    )

    class Meta:
        model = OnlinePayment
        exclude = ['created', 'modified']

class OnlinePaymentLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = OnlinePaymentLog
        fields = '__all__'

class RefundReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = Refund
        exclude = ['created', 'modified']

class OnlinePaymentsReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = OnlinePayment
        fields = '__all__'


class OnlinePaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=OnlinePayment.objects.filter())]
    )

    class Meta:
        model = OnlinePayment
        exclude = ['created', 'modified']

class PayoutSerializer(serializers.ModelSerializer):
    payout_order_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Payout.objects.filter())]
    )   

    class Meta:
        model = Payout
        exclude = ['created', 'modified']


class OnlinePaymentMethodsSerializer(serializers.ModelSerializer):
    gateway_vendor_code = serializers.ReadOnlyField(source='gateway_vendor.code')

    class Meta:
        model = OnlinePaymentMethods
        exclude = ['created', 'modified']

class RefundRequestSerializer(serializers.ModelSerializer):
    online_payment_data = OnlinePaymentSerializer(read_only=True,source='online_payment')

    class Meta:
        model = RefundRequest
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('user', 'online_payment'),
                message='Refund Request is already rised for this payment'
            )
        ]
        exclude = ['created', 'modified']

class OnlinePaymentReturnDataLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = OnlinePaymentReturnDataLog
        fields = '__all__'

class PaymentGatewaySerializer(serializers.ModelSerializer):

    class Meta:
        model = PaymentGateWays
        fields = '__all__'