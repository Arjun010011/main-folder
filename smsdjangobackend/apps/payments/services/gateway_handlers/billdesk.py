from rest_framework.exceptions import ValidationError
from apps.payments.services.gateway_handlers.billdesk_api import BillDeskAPICallsNew
from apps.payments.models.user_bank_card_mapping import UserBankAccount, PaymentAccountMapping
from apps.payments.constants import PAYMENTS_METHODS_CONFIG
from apps.payments.models.gateways import PaymentGateWays

def billdesk_order_payments(self, gateway_data,gateway):
    payload, mode_of_payment = gateway_data.get('payload', {}), gateway_data.get('mode_of_payment')
    total, amount, transaction_fees = gateway_data['total'], gateway_data['amount'], gateway_data['transaction_fees']
    
    order_note = f'amount of Rs. {total} {amount} plus {transaction_fees} '
    order_data = {
        'customer_id': gateway_data['customer_id'],
        'orderId': gateway_data['order_id'],
        'orderAmount': float(round(total, 2)),
        'orderNote': order_note,
        'customerPhone': gateway_data['mobile_num'],
        'returnUrl': gateway_data['online_payments_return_url'],
        'notifyUrl': gateway_data['online_payments_notify_url'],
        'webhookUrl': gateway_data['online_payments_webhook_url'],
        'paymentModes': mode_of_payment,
        'mercid' : get_merc_id(gateway),
        'student_name' : gateway_data['payload']['student_name'],
        'student_standard' : gateway_data['payload']['student_standard'],
        'mobile_num':gateway_data['mobile_num'],
        'online_pay_obj':gateway_data['online_pay_obj']
    }
    order_create_response = BillDeskAPICallsNew.create_order_call(
        self, **order_data)
    return order_create_response, {}, None

def get_merc_id(gateway):
    try:
        merc_id = PaymentGateWays.objects.get(code=gateway)
    except:
        ValidationError('No payment gateway is selected')
    return merc_id.merc_id