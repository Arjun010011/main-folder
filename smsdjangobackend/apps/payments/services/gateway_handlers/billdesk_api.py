
import datetime
import hashlib
import jwt
import logging
import os
import pytz
import requests

from cashfree_sdk.payouts.beneficiary import Beneficiary
from cashfree_sdk.payouts.transfers import Transfers
from cashfree_sdk.payouts import Payouts
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import exceptions

from apps.shared.services_shared.common import get_client_ip
from apps.payments.models import OnlinePayment,Refund
from apps.payments.constants import PAYMENT_TIMEOUT
from apps.shared.services import FormdefinitionService
from apps.payments.services.online_payment_log import update_onlinepaymentlog
from apps.payments.billdesk_constants import BILLDESK_CREATE_ORDER_CALL,BILLDESK_API_CALL
# from apps.payments.services.gateway_handlers.billdesk import get_merc_id
log = logging.getLogger(__name__)
now = datetime.datetime.now(pytz.timezone('Asia/Kolkata'))
# CASHFREE_APP_ID='634278d068419350cdcc834c072436'
# CASHFREE_SECRET_KEY='04742fc543a14f63bd1936d4f808b7bc66442500'

class BillDeskAPICallsNew:
    get_order_status = ""
    get_order = '/payments/ve1_2/transactions/get'
    create_order_url = '/payments/ve1_2/orders/create'
    order_pay_url = '/orders/sessions'
    get_refund_url = '/payments/ve1_2/refunds/get'
    create_refund_url = '/payments/ve1_2/refunds/create'
    payment_status_url = '/orders'

    @staticmethod
    def get_order_call(order_id,mercid):
        url = f'{BillDeskAPICallsNew.get_order}'
        payload = {
            "mercid":mercid,
            "orderid":order_id,
            "refund_details":"true"
        }
        response = BillDeskAPICallsNew.api_call(url=url, http_type='POST', payload=payload)
        log_data = {
            'content_obj':OnlinePayment.objects.get(order_id=order_id),
            'request_token':response['request_token'],
            'response_token':response['response_token'],
            'request_type':1
        }
        update_onlinepaymentlog(log_data)
        return response['response_json']

    @staticmethod
    def get_payment_status_call(order_id, cf_payment_id):
        url = f'{BillDeskAPICallsNew.get_order}/{order_id}/payments/{cf_payment_id}'
        return BillDeskAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def get_payments_service(order_id):
        url = f'{BillDeskAPICallsNew.get_order}/{order_id}/payments'
        return BillDeskAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def create_order_call(self, **kwargs):
        current_time = datetime.datetime.now(pytz.timezone('Asia/Kolkata')).replace(microsecond=0)
        payload = {
            "mercid": kwargs.get('mercid'),  # Gurukul high merchant ID
            "orderid": kwargs.get('orderId'),
            "amount": kwargs.get('orderAmount'),
            "order_date": current_time.isoformat(),
            "currency": BILLDESK_CREATE_ORDER_CALL['currency'],  # "356",
            "ru": kwargs.get('returnUrl'),
            "webhook": kwargs.get('webhookUrl'),
            "additional_info": {
                "additional_info1": kwargs.get('orderNote'),
                "additional_info2": kwargs.get('student_name'),
                "additional_info3": kwargs.get('student_standard'),
                "additional_info4": kwargs.get('mobile_num'),
                "additional_info5": 'NA',
                "additional_info6": 'NA',
                "additional_info7": 'NA'
            },
            "itemcode": BILLDESK_CREATE_ORDER_CALL['itemcode'],
            "device": {
                "init_channel": BILLDESK_CREATE_ORDER_CALL['init_channel'],
                "ip": get_client_ip(self),
                "user_agent": BILLDESK_CREATE_ORDER_CALL['user_agent'],# self.request.META['HTTP_USER_AGENT'],
                "accept_header": BILLDESK_CREATE_ORDER_CALL['accept_header'],
                "browser_tz": BILLDESK_CREATE_ORDER_CALL['browser_tz'],  # for +5:30
                "browser_color_depth": BILLDESK_CREATE_ORDER_CALL['browser_color_depth'],
                "browser_java_enabled": BILLDESK_CREATE_ORDER_CALL['browser_java_enabled'],
                "browser_screen_height": BILLDESK_CREATE_ORDER_CALL['browser_screen_height'],
                "browser_screen_width": BILLDESK_CREATE_ORDER_CALL['browser_screen_width'],
                "browser_language": BILLDESK_CREATE_ORDER_CALL['browser_language'],
                "browser_javascript_enabled": BILLDESK_CREATE_ORDER_CALL['browser_javascript_enabled']
            }
        }
        
        url = BillDeskAPICallsNew.create_order_url

        response_data = BillDeskAPICallsNew.api_call(url=url, http_type='POST', payload=payload)
        log_data = {
            'content_obj':kwargs['online_pay_obj'],
            'request_token':response_data['request_token'],
            'response_token':response_data['response_token'],
            'request_type':1
        }
        update_onlinepaymentlog(log_data)

        # if not response_data.get('paymentLink'):
        #     raise exceptions.ValidationError('Payment Link Not found.')

        return response_data['response_json']

    @staticmethod
    def order_pay(order_pay_data):
        url = BillDeskAPICallsNew.order_pay_url
        response_data = BillDeskAPICallsNew.api_call(url=url, http_type='POST', payload=order_pay_data)
        return response_data
    
    @staticmethod
    def get_refund(self,refund_data):
        url = f'{BillDeskAPICallsNew.get_refund_url}'
        response_data = BillDeskAPICallsNew.api_call(url=url, http_type='POST', payload=refund_data)
        log_data = {
            'content_obj':Refund.objects.get(refund_id=refund_data['refundId']),
            'request_token':response_data['request_token'],
            'response_token':response_data['response_token'],
            'request_type':2
        }
        update_onlinepaymentlog(log_data)
        return response_data['response_json']
    
    @staticmethod
    def initiate_refund(refund_data):
        url = f'{BillDeskAPICallsNew.create_refund_url}'
        response_data = BillDeskAPICallsNew.api_call(url=url, http_type='POST', payload=refund_data)
        log_data = {
            'content_obj':Refund.objects.get(refund_id=refund_data['merc_refund_ref_no']),
            'request_token':response_data['request_token'],
            'response_token':response_data['response_token'],
            'request_type':1
        }
        update_onlinepaymentlog(log_data)
        return response_data['response_json']

    @staticmethod
    def api_call(**kwargs):
        default_headers = {
            "Content-Type": BILLDESK_API_CALL['Content-Type'],
            "Accept": BILLDESK_API_CALL['Accept'],
            "BD-Traceid": datetime.datetime.now(pytz.timezone('Asia/Kolkata')).strftime("%Y%m%d%H%M%S%f"),
            "BD-Timestamp": datetime.datetime.now(pytz.timezone('Asia/Kolkata')).strftime("%Y%m%d%H%M%S")
        }
        headers = {
            "clientid":'kvbgurukul',
        }
        if "headers" in kwargs:
            headers = kwargs['headers']

        if "url" not in kwargs or "payload" not in kwargs or "http_type" not in kwargs:
            raise exceptions.ValidationError("http type, URL and payload are required")

        url = settings.BILLDESK_URL + kwargs['url']
        payload = kwargs['payload']

        log.info(kwargs["http_type"] + ' ' + url)
        log.info(headers)
        log.info(payload)
        # jwt = JWT()
        token = jwt.encode(payload, settings.SECRET, algorithm="HS256", headers=headers)
        log.info(token)
        
        try:
            if kwargs["http_type"] == "POST":
                response = requests.post(url, data=token, headers=default_headers)
            else:
                response = requests.request(
                    kwargs["http_type"],
                    url,
                    data=payload,
                    headers=headers
                )
        except requests.exceptions.Timeout:
            raise exceptions.ValidationError('Payment Gateway timeout.')
        except requests.exceptions.TooManyRedirects:
            raise exceptions.ValidationError('Payment Gateway too many redirects.')
        except requests.exceptions.RequestException:
            raise exceptions.ValidationError('Connection issue with Payment Gateway.')
        log.info(response.text)
        response_json = jwt.decode(response.text, settings.SECRET, algorithms="HS256")
        if response.status_code not in [200,404]:
            log.info(f'Got error from Billdesk: {response.text}')
            raise exceptions.ValidationError(f'Something went wrong from Billdesk server {response.status_code}')
        request_response={'response_json':response_json,'request_token':token,'response_token':response.text}
        return request_response
