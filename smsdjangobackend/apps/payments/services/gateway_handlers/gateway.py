from apps.payments.constants import PAYMENT_GATEWAYS_DATA_MAP
from apps.payments.services.gateway_handlers.cashfree import cashfree_order_payments, cashfree_save_post_create_order_data
from apps.payments.services.gateway_handlers.billdesk import billdesk_order_payments
from apps.payments.services. gateway_handlers.onepay import onepay_order_payments

def gateway_order_payments(self, gateway_data, gateway):
    order_create_response, order_pay_response, api_form_data = None, None, None
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
        order_create_response, order_pay_response, api_form_data = cashfree_order_payments(gateway_data)
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
        order_create_response, order_pay_response, api_form_data = billdesk_order_payments(self, gateway_data,gateway)
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['onepay']:
        order_create_response, order_pay_response, api_form_data = onepay_order_payments(self, gateway_data,gateway)
    return order_create_response, order_pay_response, api_form_data

def gateway_save_post_create_order_data(self, api_form_data, payment_data, mode_of_payment, order_create_response, online_payment_obj, gateway):
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
        cashfree_save_post_create_order_data(self, api_form_data, payment_data, mode_of_payment, order_create_response, online_payment_obj)
