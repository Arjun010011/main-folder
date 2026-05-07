import hashlib
import json
import logging
import os
import requests

from cashfree_sdk.payouts.beneficiary import Beneficiary
from cashfree_sdk.payouts.transfers import Transfers
from cashfree_sdk.payouts import Payouts
from datetime import datetime, timedelta
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from rest_framework import exceptions

from apps.payments.constants import PAYMENT_TIMEOUT
log = logging.getLogger(__name__)

# CASHFREE_APP_ID='634278d068419350cdcc834c072436'
# CASHFREE_SECRET_KEY='04742fc543a14f63bd1936d4f808b7bc66442500'
class CashFreePayoutAPICalls:

    init = False

    @classmethod
    def start(cls):
        mode = os.environ.get('DJANGO_SETTINGS_MODULE')
        temp_type = 'TEST'
        # if mode == 'sms.settings.production':
        #     temp_type = 'PROD'
        if not cls.init:
            print("========================================")
            Payouts.init(settings.CASHFREE_APP_ID, settings.CASHFREE_SECRET_KEY, temp_type)
        cls.init = True

    @classmethod
    def add_beneficiary(cls, payload):
        cls.start()
        bene_add_response = Beneficiary.add(**payload)
        return bene_add_response.json()

    @classmethod
    def request_transfer(cls, payload):
        cls.start()
        request_transfer_response = Transfers.request_transfer(**payload)
        log.info("Payout Transfer Response")
        log.info(request_transfer_response.content)
        return request_transfer_response.json()
    
    @classmethod
    def get_transfer_status(cls, payload):
        cls.start()
        transfer_status_response = Transfers.get_transfer_status(**payload)
        log.info("Payout Transfer GET status response")
        log.info(transfer_status_response.content)
        return transfer_status_response.json()

    @classmethod
    def get_balance(cls):
        cls.start()
        transfer_status_response = Transfers.get_balance()
        log.info("Payout Transfer GET status response")
        log.info(transfer_status_response.content)
        return transfer_status_response.json()
    

class CashFreeAPICalls:
    verify_api_key = '/api/v1/credentials/verify'
    # Order
    create_order = '/api/v1/order/create'
    get_order = '/api/v1/order/info/link'
    get_order_status = '/api/v1/order/info/status'
    trigger_payment_email = '/api/v1/order/email'

    # UPI Payment Link
    create_payment_link_url = '/billpay/checkout/post/submit'

    # Transaction
    get_transactions = '/api/v1/transactions'
    # Refunds
    initiate_refund = '/api/v1/order/refund'
    refund_list = '/api/v1/refunds'
    refund_status = '/api/v1/refundStatus/'
    # Settlement
    settlement_list = '/api/v1/settlements'
    get_settlement = '/api/v1/settlement'

    @staticmethod
    def get_order_status_call(order_id, cashfree_mode_of_payment):
        payload = {
            'orderId': order_id,
            'paymentModes': cashfree_mode_of_payment
        }
        url = CashFreeAPICalls.get_order_status
        return CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)

    @staticmethod
    def get_order_call(**kwargs):
        payload = {
            'orderId': kwargs.get('orderId')
        }
        url = CashFreeAPICalls.get_order
        return CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)

    @staticmethod
    def create_order_call(**kwargs):
        timeout_at = (datetime.now() + timedelta(minutes = PAYMENT_TIMEOUT)).isoformat()
        payload = {
            'orderId': kwargs.get('orderId'),
            'orderAmount': kwargs.get('orderAmount'),
            'orderCurrency': 'INR',
            'orderNote': kwargs.get('orderNote'),
            'customerEmail': kwargs.get('customerEmail'),
            'customerName': kwargs.get('customerName'),
            'customerPhone': kwargs.get('customerPhone'),
            'returnUrl': kwargs.get('returnUrl'),
            'notifyUrl': kwargs.get('notifyUrl'),
            'paymentModes': kwargs.get('paymentModes'),
            'orderExpiryTime': timeout_at
        }
        url = CashFreeAPICalls.create_order

        response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)

        if not response_data.get('paymentLink'):
            raise exceptions.ValidationError('Payment Link Not found.')

        return response_data
    
    @staticmethod
    def generate_signature(params, secret_key):
        import time
        import base64
        timestamp = time.time()
        # return timestamp
        sorted_params = sorted(params.items())
        concat_string = ""
        for key, val in sorted_params:
            concat_string += key + str(val)
        concat_string = secret_key + concat_string
        return base64.b64encode(concat_string)
        # hash_object = hashlib.sha256(concat_string.encode())
        # return hash_object.hexdigest().lower()

    @staticmethod
    def create_payment_link(**kwargs):

        payload = {
            "appId": "634278d068419350cdcc834c072436",
            "secretKey": "04742fc543a14f63bd1936d4f808b7bc66442500",
            "orderId": "300435235",
            "orderAmount": 300,
            "orderCurrency": "INR",
            "customerName": "Nikhil",
            "customerPhone": "8762504970",
            "customerEmail": "edubricz@gmail.com",
            "returnUrl": "https://testing2.edubricz.com/online-payment/300435235",
            "notifyUrl": "https://testing2.edubricz.com/api/online-payment-qrcode",
            "paymentOption": "upi",
            "responseType": "json",
            "upiMode": "qrcode"
        }
        import hashlib
        import hmac
        import base64
        sortedKeys = sorted(payload)
        signatureData = ""
        for key in sortedKeys:
            signatureData += key+str(payload[key])

        message = bytes(signatureData, encoding='utf8')
        #get secret key from your config
        secret = bytes('04742fc543a14f63bd1936d4f808b7bc66442500', encoding='utf8')
        signature = base64.b64encode(hmac.new(secret, message,digestmod=hashlib.sha256).digest())
        print(signature)
        payload['signature'] = 'S4w/RBUuRmOEGytN8ChqrXXocVvfOe2xbEtE/KX10SI='
        headers = {
            # 'Content-Type': 'multipart/form-data'
            'x-client-id': "634278d068419350cdcc834c072436",
            'x-client-secret': "jy+tz00yIu4kv0rVZJxvPpXSOGwF5rYQvHM0HhBUB5g="
        }
        url = CashFreeAPICalls.create_payment_link_url
        print(payload, "Payload")
        print(url, "url")
        print(headers, "headers")

        response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload, headers=headers)

        # response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)
        print('=' * 20, "response_data" , '=' * 20, response_data)
        # if not response_data.get('paymentLink'):
        #     raise exceptions.ValidationError('Payment Link Not found.')

        return response_data
    
    @staticmethod
    def initiate_refund_call(**kwargs):
        if not kwargs.get('referenceId'):
            raise exceptions.ValidationError('refund referenceId is not given')
        if not kwargs.get('refundAmount'):
            raise exceptions.ValidationError('refund refundAmount is not given')
        payload = {
            'referenceId': kwargs.get('referenceId'),
            'refundAmount': kwargs.get('refundAmount'),
            'refundNote': kwargs.get('refundNote'),
        }

        url = CashFreeAPICalls.initiate_refund
        response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)
        return response_data
    
    
    @staticmethod
    def refund_status_call(**kwargs):
        if not kwargs.get('refundId'):
            raise exceptions.ValidationError('refund refundId is not given')
        payload = {
            'refundId': kwargs.get('refundId'),
        }

        url = CashFreeAPICalls.refund_status
        response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=payload)
        return response_data

    @staticmethod
    def api_call(**kwargs):
        headers = {}
        if "headers" in kwargs:
            headers = kwargs['headers']

        if "url" not in kwargs or "payload" not in kwargs or "http_type" not in kwargs:
            raise exceptions.ValidationError("http type, URL and payload are required")

        url = settings.CASHFREE_URL + kwargs['url']
        payload = kwargs['payload']

        log.info(kwargs["http_type"] + ' ' + url)
        log.info(headers)
        log.info(payload)

        payload['appId'] = settings.CASHFREE_APP_ID
        payload['secretKey'] = settings.CASHFREE_SECRET_KEY

        try:
            response = requests.request(
                kwargs["http_type"],
                url,
                data=json.loads(json.dumps(payload, cls=DjangoJSONEncoder)),
                headers=headers
            )
        except requests.exceptions.Timeout:
            raise exceptions.ValidationError('Payment Gateway timeout.')
        except requests.exceptions.TooManyRedirects:
            raise exceptions.ValidationError('Payment Gateway too many redirects.')
        except requests.exceptions.RequestException:
            raise exceptions.ValidationError('Connection issue with Payment Gateway.')
        if response.status_code != 200:
            raise exceptions.ValidationError(f'Something went wrong from Cashfree server {response.status_code}')
        return CashFreeAPICalls.validate_error(response.json())

    @staticmethod
    def validate_error(response):
        log.info(response)
        if response and response.get('status', 'ERROR') == 'ERROR':
            raise exceptions.ValidationError(response.get('message', 'Unknown error.'))

        return response

class CashFreeAPICallsNew:
    get_order_status = ""
    get_order = "/orders"
    create_order_url = "/orders"
    order_pay_url = '/orders/sessions'
    create_refund_url = '/orders'
    payment_status_url = '/orders'

    @staticmethod
    def get_order_call(order_id):
        url = f'{CashFreeAPICallsNew.get_order}/{order_id}'
        return CashFreeAPICallsNew.api_call(url=url, http_type='GET', payload={})


    @staticmethod
    def get_payment_status_call(order_id, cf_payment_id):
        url = f'{CashFreeAPICallsNew.get_order}/{order_id}/payments/{cf_payment_id}'
        return CashFreeAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def get_payments_service(order_id):
        url = f'{CashFreeAPICallsNew.get_order}/{order_id}/payments'
        return CashFreeAPICallsNew.api_call(url=url, http_type='GET', payload={})

    @staticmethod
    def create_order_call(**kwargs):
        timout = 330 - PAYMENT_TIMEOUT # 330 = 5hrs 30mins
        timeout_at = (datetime.now() - timedelta(minutes = timout)).replace(microsecond=0).isoformat() + 'Z'

        payload = {
            "customer_details": {
                "customer_id": 'name',
                "customer_email": kwargs.get('customerEmail', 'jairam637@gmail.com'),
                "customer_phone": kwargs.get('customerPhone')
            },
            "order_meta": {
                "payment_methods": kwargs.get('paymentModes'),
                "return_url": kwargs.get('returnUrl'),
                "notify_url": kwargs.get('notifyUrl'),
            },
            "order_id": kwargs.get('orderId'),
            "order_amount": kwargs.get('orderAmount'),
            "order_currency": "INR",
            "order_expiry_time": timeout_at,
            "order_note": kwargs.get('orderNote'),
            "order_splits": kwargs.get('order_splits', [])
        }

        url = CashFreeAPICallsNew.create_order_url

        response_data = CashFreeAPICallsNew.api_call(url=url, http_type='POST', payload=payload)

        return response_data

    @staticmethod
    def order_pay(order_pay_data):
        url = CashFreeAPICallsNew.order_pay_url
        response_data = CashFreeAPICallsNew.api_call(url=url, http_type='POST', payload=order_pay_data)
        return response_data
    
    @staticmethod
    def initiate_refund(order_id, refund_data):
        url = f'{CashFreeAPICallsNew.create_refund_url}/{order_id}/refunds'
        url = CashFreeAPICalls.initiate_refund
        response_data = CashFreeAPICalls.api_call(url=url, http_type='POST', payload=refund_data)
        return response_data

    @staticmethod
    def api_call(**kwargs):

        headers = {
            "accept": "application/json",
            "x-client-id": settings.CASHFREE_APP_ID,
            "x-client-secret": settings.CASHFREE_SECRET_KEY,
            "x-api-version": "2022-09-01",
            "Content-type": "application/json"
        }
        if "headers" in kwargs:
            headers = kwargs['headers']

        if "url" not in kwargs or "payload" not in kwargs or "http_type" not in kwargs:
            raise exceptions.ValidationError("http type, URL and payload are required")

        url = settings.CASHFREE_URL_NEW + kwargs['url']
        payload = kwargs['payload']

        log.info(kwargs["http_type"] + ' ' + url)
        log.info(headers)
        log.info(payload)
        try:
            if kwargs["http_type"] == "POST":
                response = requests.post(url, json=payload, headers=headers)
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
        print(response.text)
        if response.status_code != 200:
            log.info(f'Got error from cashfree: {response.text}')
            raise exceptions.ValidationError(f'Something went wrong from Cashfree server {response.status_code}')
        return response.json()
