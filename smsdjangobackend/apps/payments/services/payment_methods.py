from apps.payments.constants import PAYMENTS_METHODS_CONFIG,PAYMENT_GATEWAYS_DATA_MAP,CASHFREE_FRONTEND_URL
from apps.payments.models.gateways import PaymentGateWays
from apps.payments.billdesk_constants import BILLDESK_PAYMENTS_METHODS_CONFIG,BILLDESK_FRONTEND_URL
from django.conf import settings

def get_payment_methods(data, filters={}):
    final_data = {"final_data":[]}
    payment_gateways_list = PaymentGateWays.objects.filter(is_active=True).values('id', 'name', 'code')
    for payment_data in data:
        transaction_type = payment_data.get('transaction_type', '')
        if payment_data['gateway_vendor_code'] == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
            payment_config = BILLDESK_PAYMENTS_METHODS_CONFIG.get(transaction_type, None)
        else:
            payment_config = PAYMENTS_METHODS_CONFIG.get(transaction_type, None)
        if payment_config is not None:
            if filters.get('is_generic') and not payment_config.get("is_generic"):
                continue
            payment_data.update(payment_config)
            final_data['final_data'].append(payment_data)
    final_data['gateway_list'] = payment_gateways_list
    for gateway in final_data['gateway_list']:
        print(gateway, 'gateway')
        if gateway['code'] == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
            gateway['module']=BILLDESK_FRONTEND_URL['module']
            gateway['nomodule']=BILLDESK_FRONTEND_URL['nomodule']
            gateway['css']=BILLDESK_FRONTEND_URL['css']
        elif gateway['code'] == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
            gateway['url'] = CASHFREE_FRONTEND_URL
    return final_data