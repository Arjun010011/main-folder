from django.urls import path, include
from rest_framework import routers

from apps.payments.views import *

router = routers.DefaultRouter()

router.register(r'online_payment_type', OnlinePaymentTypeViewSet,
                basename='online_payment_type')
router.register(r'beneficiary', BeneficiaryViewSet, basename='beneficiary'),
router.register(r'order-online-payment', OnlinePaymentViewSet,
                basename='order-online-payment'),
router.register(r'refund',RefundViewSet,basename='refund')
router.register(r'refundrequest',RefundRequestViewSet,basename='refundrequest')
router.register(r'refundrequesttypes',RefundRequestTypesViewSet,basename='refundrequesttypes')
router.register(r'online-payment-noftify',
                OnlinePaymentNotifyViewSet, basename='online-payment-noftify'),
router.register(r'payout', PayoutViewSet, basename='payout'),
router.register(r'beneficiary_fee_plan', BeneficiaryMappingViewSet, basename='beneficiary_fee_plan'),
router.register(r'payment_attempts', PaymentAttemptViewSet, basename='payment_attempts'),
router.register(r'bank_data', BankDataViewSet, basename='bank_data'),
router.register(r'payment_gateway', PaymentGatewayViewSet, basename='payment_gateway'),
router.register(r'payment_gateway_list', PaymentGatewayListViewSet, basename='payment_gateway_list'),

urlpatterns = router.urls
