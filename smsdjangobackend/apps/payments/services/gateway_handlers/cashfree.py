from rest_framework.exceptions import ValidationError
from apps.payments.services import CashFreeAPICallsNew
from apps.payments.models.user_bank_card_mapping import UserBankAccount, PaymentAccountMapping
from apps.payments.constants import PAYMENTS_METHODS_CONFIG
from apps.payments.models.online_payments import OnlinePayment

def cashfree_order_payments(gateway_data):
    payload, mode_of_payment = gateway_data.get('payload', {}), gateway_data.get('mode_of_payment')
    total, amount, transaction_fees = gateway_data['total'], gateway_data['amount'], gateway_data['transaction_fees']
    order_pay_data = {
        'payment_session_id': None,
        'payment_method': {}
    }
    payment_method_keys = {}
    payment_method_keys[PAYMENTS_METHODS_CONFIG['UPI_TRANSACTION_FEE']['bValue']] = "upi"
    payment_method_keys[PAYMENTS_METHODS_CONFIG['DEBIT_CARD_TRANSACTION_FEE']['bValue']] = "card"
    payment_method_keys[PAYMENTS_METHODS_CONFIG['CREDIT_CARD_TRANSACTION_FEE']['bValue']] = "card"
    payment_method_keys[PAYMENTS_METHODS_CONFIG['NET_BANKING_TRANSACTION_FEE']['bValue']] = "netbanking"

    order_pay_data['payment_method'][payment_method_keys[mode_of_payment]] = { 'channel': 'link' }
    payment_data = payload.get('payment_data', {})
    if 'upi' in order_pay_data['payment_method']:
        order_pay_data['payment_method'][payment_method_keys[mode_of_payment]] = { 
            'channel': 'collect',
            'upi_redirect_url': True,
            'upi_expiry_minutes': 10,
            'upi_id': payment_data.get('upi_id', '')
        }
        if not payment_data.get('upi_id', ''):
            raise ValidationError(f'upi id: data not found')
    if 'card' in order_pay_data['payment_method']:
        data_required_for_payment = ['card_number', 'card_holder_name', 'card_expiry_mm', 'card_expiry_yy', 'card_cvv'] 
        for key in data_required_for_payment:
            if not payment_data.get(key, ''):
                raise ValidationError(f'{key} data not found')
            order_pay_data['payment_method'][payment_method_keys[mode_of_payment]][key] = payment_data.get(key, '')
    if 'netbanking' in order_pay_data['payment_method']:
        order_pay_data['payment_method'][payment_method_keys[mode_of_payment]]['netbanking_bank_code'] = payment_data.get('netbanking_bank_code', '')
        if not payment_data.get('netbanking_bank_code', ''):
            raise ValidationError(f'netbanking_bank_code: data not found')
    
    order_note = f'amount of Rs. {total}({amount} + {transaction_fees})'
    order_data = {
        'customer_id': gateway_data['customer_id'],
        'orderId': gateway_data['order_id'],
        'orderAmount': float(round(total, 2)),
        'orderNote': order_note,
        'customerPhone': gateway_data['mobile_num'],
        'returnUrl': gateway_data['online_payments_return_url'],
        'notifyUrl': gateway_data['online_payments_notify_url'],
        'paymentModes': mode_of_payment,
        "order_splits": [
            {
                "vendor_id": "jairam",
                "percentage": 90,
                "tags": {
                    "product": "topwear"
                }
            }
        ]
    }
    order_create_response = CashFreeAPICallsNew.create_order_call(
        **order_data)
    order_pay_data['payment_session_id'] = order_create_response.get('payment_session_id')
    order_pay_response = CashFreeAPICallsNew.order_pay(order_pay_data)
    return order_create_response, order_pay_response, order_pay_data

def cashfree_save_post_create_order_data(self, api_form_data, payment_data, mode_of_payment, order_create_response, online_payment_obj):
    online_payment_obj.cf_payment_id = order_create_response["cf_payment_id"]
    online_payment_obj.save()
    if 'netbanking' in api_form_data['payment_method']:
        try:
            user_account = UserBankAccount.objects.get(
                user=self.request.user,
                card_number=payment_data['card_number']
            )
        except UserBankAccount.DoesNotExist:
            user_account = UserBankAccount.objects.create(
                card_type=mode_of_payment,
                user=self.request.user,
                card_number=payment_data['card_number'],
                card_holder_name=payment_data['card_holder_name'],
                expiry_month=payment_data['card_expiry_mm'],
                expiry_year=payment_data['card_expiry_yy'],
                cvv_code=payment_data['card_cvv'],
            )
        PaymentAccountMapping.objects.create(
            online_payment=online_payment_obj,
            bank_account=user_account
        )