
import datetime
from decimal import Decimal, ROUND_DOWN
import hashlib
import jwt
import logging
import os
import pytz
import requests
import json
import Crypto
from urllib.parse import urlencode

from django.conf import settings
from rest_framework import exceptions

from apps.shared.services_shared.common import get_client_ip
from apps.payments.models import OnlinePayment,Refund
from apps.payments.services.online_payment_log import update_onlinepaymentlog
from apps.payments.onepay_constants import ONEPAY_CREATE_ORDER_CALL,ONEPAY_API_CALL
from apps.payments.services.gateway_handlers.aes_encrypt import encrypt,decrypt
# from apps.payments.services.gateway_handlers.onepay import get_merc_id
log = logging.getLogger(__name__)
now = datetime.datetime.now(pytz.timezone('Asia/Kolkata'))

class OnePayAPICallsNew:
    get_order_status = ""
    get_order = '/payment/getTxnDetails'
    create_order_url = '/payment/payprocessorV2'
    order_pay_url = ''
    get_refund_url = ''
    create_refund_url = ''
    payment_status_url = ''

    @staticmethod
    def get_order_call(order_id,mercid):
        params = {
            "merchantId": mercid,
            "txnId": order_id
        }
        base_url = f'{OnePayAPICallsNew.get_order}'
        url_with_params = f"{base_url}?{urlencode(params)}"
        response = OnePayAPICallsNew.api_call(url=url_with_params, http_type='POST', payload={})
        log_data = {
            'content_obj':OnlinePayment.objects.get(order_id=order_id),
            'request_token':params,
            'response_token':response,
            'request_type':1
        }
        update_onlinepaymentlog(log_data)
        return response

    @staticmethod
    def get_payment_status_call(order_id, cf_payment_id):
        url = f'{OnePayAPICallsNew.get_order}/{order_id}/payments/{cf_payment_id}'
        return OnePayAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def get_payments_service(order_id):
        url = f'{OnePayAPICallsNew.get_order}/{order_id}/payments'
        return OnePayAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def create_order_call(self, **kwargs):
        current_time = datetime.datetime.now(pytz.timezone('Asia/Kolkata')).replace(microsecond=0)
        payload = {
            "merchantId": kwargs.get('mercid'),
            "apiKey": kwargs['apiKey'],
            "txnId": kwargs.get('orderId'),
            "amount": str(Decimal(str(kwargs.get('orderAmount'))).quantize(Decimal('0.01'), rounding=ROUND_DOWN)),
            "dateTime": current_time.isoformat(),
            "custMobile": kwargs.get('mobile_num') if kwargs.get('mobile_num') else '9999999999',
            "custMail": kwargs.get('email') if kwargs.get('email') else 'edubricz@gmail.com',
            "channelId": "0", #nikhil doubt on this,
            "txnType": 'DIRECT', # DIRECT   Payment details (card, UPI, etc.) are collected on the payment aggregator's page. The user is taken to the aggregator’s page (like Paytm, Razorpay, etc.) to enter payment details. 
            # REDIRECT  Payment details are collected on your website (merchant's page) and then passed to the bank/payment page. You collect customer data (like card or UPI ID) and then redirect them to process the payment.
            "returnURL": kwargs.get('returnUrl'),
            "productId": "DEFAULT", #IF Merchant wants Multipart Settlement for single Txn then he needs to pass different Product Ids along with the Amount ELSE value is ‘DEFAULT’.
            "isMultiSettlement": '0',
            "udf1": kwargs.get('orderNote'),
            "udf2": kwargs.get('student_name'),
            "udf3": kwargs.get('student_standard'),
            "udf4": kwargs.get('mobile_num') if kwargs.get('mobile_num') else 'NA',
            "udf5": 'NA',
            "udf6": 'NA',
            # "Rid": kwargs.get('aggregator_id'),
            "instrumentId": 'NA', #NB/CC/DC/UPI nikhil need to support this 
            "cardDetails": 'NA', #nikhil have doubt on this 
            "cardType": 'NA', #nikhil doubt on this 
            "txn_amount": kwargs.get('transactionAmount'),
        }
        api_key = kwargs.get('apiKey') 
        raw_data = json.dumps(payload, separators=(',', ':')).encode('utf-8')
        encrypted_data = encrypt(raw_data, api_key)
        url = OnePayAPICallsNew.create_order_url
        response_data = {
            "merchantId": payload['merchantId'],
            "reqData": encrypted_data
        }
        log_data = {
            'content_obj':kwargs['online_pay_obj'],
            'request_token':response_data['reqData'],
            'request_type':1
        }
        update_onlinepaymentlog(log_data)

        return response_data

    @staticmethod
    def order_pay(order_pay_data):
        url = OnePayAPICallsNew.order_pay_url
        response_data = OnePayAPICallsNew.api_call(url=url, http_type='POST', payload=order_pay_data)
        return response_data
    
    @staticmethod
    def get_refund(self,refund_data):
        url = f'{OnePayAPICallsNew.get_refund_url}'
        response_data = OnePayAPICallsNew.api_call(url=url, http_type='POST', payload=refund_data)
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
        url = f'{OnePayAPICallsNew.create_refund_url}'
        response_data = OnePayAPICallsNew.api_call(url=url, http_type='POST', payload=refund_data)
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

        headers = {
            "accept": "application/json",
            "Content-type": "application/json"
        }
        if "headers" in kwargs:
            headers = kwargs['headers']

        if "url" not in kwargs or "payload" not in kwargs or "http_type" not in kwargs:
            raise exceptions.ValidationError("http type, URL and payload are required")
        onepay_url = getattr(settings, 'ONEPAY_URL', 'https://pay.1pay.in/')
        url = onepay_url + kwargs['url']
        payload = json.dumps(kwargs['payload'])

        log.info(kwargs["http_type"] + ' ' + url)
        log.info(headers)
        log.info(payload)
        try:
            if kwargs["http_type"] == "POST":
                response = requests.post(url, json=payload, headers=headers)
                print(response, 'resposne')
                print(response.text, 'resp text')
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
        if response.status_code != 200:
            log.info(f'Got error from cashfree: {response.text}')
            raise exceptions.ValidationError(f'Something went wrong from Onepay server {response.status_code}')
        return response.json()
