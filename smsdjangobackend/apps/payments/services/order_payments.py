from apps.payments.onepay_constants import ONEPAY_ORDER_STATUSES, ONEPAY_PAYMENT_STATUSES, ONEPAY_PAYMENT_STATUSES_CODES
from apps.payments.services.gateway_handlers import onepay
from rest_framework import exceptions
from django.db import transaction
from datetime import datetime, timedelta
from decimal import Decimal
import copy

from apps.institutes.models.institute import Institute
from apps.payments.models.payment_methods import OnlinePaymentMethods
from apps.payments.models.online_payments import OnlinePayment
from apps.payments.models.gateways import PaymentGateWays
from apps.payments.services import CashFreeAPICalls, CashFreeAPICallsNew
from apps.payments.services.gateway_handlers.billdesk_api import BillDeskAPICallsNew
from django.contrib.contenttypes.models import ContentType
from apps.finance.services import calculations
from apps.payments.services.gateway_handlers.onepay_api import OnePayAPICallsNew
from apps.shared.services import SharedService, CounterService, ConfigurationService,FormdefinitionService
from apps.finance.services.fee_collection import add_fee_collection
from apps.payments.constants import PAYMENT_TIMEOUT
from apps.finance.models import FeeCollection
from apps.finance.models.feeCollection import FeeCollectionModeOfPayment
from apps.payments.constants import PAYMENTS_METHODS_CONFIG, CASHFREE_ORDER_STATUSES, CASHFREE_PAYMENT_STATUSES, PAYMENT_GATEWAYS_DATA_MAP
from apps.payments.billdesk_constants import BILLDESK_PAYMENT_STATUSES_CODES, BILLDESK_ORDER_STATUSES, BILLDESK_PAYMENT_STATUSES
from apps.tenants.services.middlewares import get_current_db_name
from apps.payments.serializers import OnlinePaymentsSerializer,OnlinePaymentLogSerializer
from apps.payments.services.gateway_handlers.gateway import gateway_order_payments, gateway_save_post_create_order_data
from rest_framework.exceptions import ValidationError
from apps.shared.services_shared.common import get_full_name
from apps.payments.services.gateway_handlers.billdesk import get_merc_id

def make_payment(self, data):
    order_create_response = None
    host = self.request.META['HTTP_HOST']
    if host:
        return_url = f'https://{host}'
    else:
        raise ValidationError('Invalid host')
    payload = copy.deepcopy(data.get('payload'))
    payment_data = payload.get('payment_data', {})
    transaction_type = data.get('transaction_type')
    show_edubricz_mode_of_payment_page=FormdefinitionService.get_formdefintion_data(self, 'payment_confgiruation', 'show_edubricz_mode_of_payment_page')
    entity_name = data.get('entity_name')
    ot_counter, ot_prefix, ot_postfix = CounterService.get_countered_value(
        self, 'ONLINE_TRANSACTION', None, None)
    institute_obj = Institute.get_institute(self)
    ot_prefix += str(institute_obj.company_id)
    ot_prefix += SharedService.generate_random_number()
    order_id = f'{ot_prefix}{ot_counter.value}{ot_postfix}'
    CounterService.increment_counter(self, ot_counter)
    if 'total_payable_amount' not in payload:
        raise exceptions.ValidationError('total_payable_amount is required please update the application')
    # remove once config part is done
    # gateway_vendor_code = PAYMENT_GATEWAYS_DATA_MAP['cashfree']
    # if institute_obj.code == 'gurukulhigh':
    payment_gateway_id = data.get('payment_gateway_id')
    filter_query = {'is_active': True, }
    if payment_gateway_id:
        filter_query['id'] = payment_gateway_id
    if not payment_gateway_id:
        raise exceptions.ValidationError("payment gateway is mandatory")
    gateway_vendor_obj = PaymentGateWays.objects.get(**filter_query)
    gateway_vendor_code = gateway_vendor_obj.code
    # ------------------------------------
    gateway_data = {}
    with transaction.atomic(using=get_current_db_name()):
        total = amount = transaction_fees = 0
        gateway_data['online_payments_return_url'] = ''
        gateway_data['online_payments_notify_url'] = ''
        user_id = self.request.user.id if self.request.user else None
        gateway_data['mobile_num'] = ''
        if entity_name == 'FC':
            payload['mode_of_payment'] = 'Online'
            student_obj = self.request.user.student
            if student_obj:
                payload['student'] = student_obj.id
                payload['student_name'] = get_full_name(student_obj.first_name,student_obj.middle_name,student_obj.last_name)
                payload['student_standard'] = student_obj.current_standard.id #nikhil should not take current standard should take for which standard he is paying
                gateway_data['mobile_num'] = student_obj.mobile_num
                gateway_data['email'] = student_obj.email
            total_amount_payble = add_fee_collection(self, data['payload'], True)['total_amount_payble']
            gateway_data['online_payments_return_url'] = return_url + '/api/payments/online-payment-noftify/?orderId='+order_id
            gateway_data['online_payments_notify_url'] = return_url + \
                '/api/payments/online-payment-noftify/'
            gateway_data['online_payments_webhook_url'] = return_url + '/api/payments/online-payment-noftify/'
        elif entity_name == 'AF':
            # Application Fee payment
            payload['mode_of_payment'] = 'Online'
            total_amount_payble = Decimal(payload.get('total_payable_amount', 0))
            gateway_data['mobile_num'] = payload.get('payment_data', {}).get('mobile_num', '')
            gateway_data['email'] = payload.get('payment_data', {}).get('email', '')
            # Return URL should redirect to application dashboard after payment
            gateway_data['online_payments_return_url'] = return_url + '/api/payments/online-payment-noftify/?orderId='+order_id + '&entity=AF'
            gateway_data['online_payments_notify_url'] = return_url + '/api/payments/online-payment-noftify/'
            gateway_data['online_payments_webhook_url'] = return_url + '/api/payments/online-payment-noftify/'
        if show_edubricz_mode_of_payment_page:
            transaction_fees, mode_of_payment, deduct_from_student = calculate_transaction_fees(
                total_amount_payble, transaction_type, gateway_vendor_obj)
        else:
            temp_transaction_type = transaction_type if transaction_type else 'Online'
            transaction_fees, mode_of_payment, deduct_from_student = 0, temp_transaction_type, 1 #when directly redirecting to payment page
        student_trans_fees = vendor_transaction_fees = 0
        if deduct_from_student:
            total = Decimal(total_amount_payble) + transaction_fees
            student_trans_fees = transaction_fees
        else:
            total = Decimal(total_amount_payble)
            vendor_transaction_fees = transaction_fees

        gateway_data['order_id'] = order_id
        gateway_data['total'] = total
        gateway_data['amount'] = total_amount_payble
        gateway_data['transaction_fees'] = transaction_fees
        gateway_data['mode_of_payment'] = mode_of_payment
        gateway_data['payload'] = payload
        gateway_data['customer_id'] = get_customer_id(self, institute_obj, self.request.user) if self.request.user else None

        if not total:
            raise exceptions.ValidationError('Paying amount can not be 0!!')
        else:
            total = round(total, 2)
        if Decimal(total) != Decimal(payload['total_payable_amount']):
            raise exceptions.ValidationError(f'Total payable amount and calculated amount is not matching {total} {payload["total_payable_amount"]}')
        timeout_at = datetime.now() + timedelta(minutes = PAYMENT_TIMEOUT)
        online_payment_data = dict(
            order_id=order_id,
            entity_name=entity_name,
            amount=total_amount_payble,
            transaction_fees=student_trans_fees,
            vendor_transaction_fees=vendor_transaction_fees,
            mode_of_payment=mode_of_payment,
            data=payload,
            status=0,
            expiry_time=timeout_at,
            # if in case we have redirect to app and web differently
            return_url=gateway_data['online_payments_return_url'],
            user=user_id,
            gateway_vendor=gateway_vendor_obj.id,
            gateway_response={}
        )

        serializer = OnlinePaymentsSerializer(data=online_payment_data)
        serializer.is_valid(raise_exception=True)
        online_pay_obj = serializer.save()
        gateway_data['online_pay_obj'] = online_pay_obj
        order_create_response, order_pay_response, api_form_data = gateway_order_payments(self, gateway_data, gateway_vendor_code)
        order_create_response['orderId'] = order_id
        if gateway_vendor_code=='billdesk':
            for link in order_create_response['links']:
                if 'valid_date' in link:
                    order_create_response['expiry_time'] = link['valid_date']
        order_create_response.update(order_pay_response)
        gateway_save_post_create_order_data(self, api_form_data, payment_data, mode_of_payment, order_create_response, online_pay_obj, gateway_vendor_code)
        return order_create_response


def calculate_transaction_fees(amount, transaction_type, gateway_vendor_obj):
    try:
        mode = OnlinePaymentMethods.objects.get(
            gateway_vendor=gateway_vendor_obj,
            transaction_type=transaction_type,
            is_active=1
        )

    except OnlinePaymentMethods.DoesNotExist:
        raise ValidationError('Selected Mode of Payment is not configured in online payment methods')

    mode_of_payment = PAYMENTS_METHODS_CONFIG.get(
        transaction_type, {}).get('bValue', None)
    if mode_of_payment is None:
        raise ValidationError('Mode of Payment is not valid.')

    fees = mode.fees
    if mode.is_percentage:
        fees = calculations.convert_percentage_to_amount(amount, fees)
    if mode.max_fees:
        fees = min(fees, mode.max_fees)
    return round(fees, 2), mode_of_payment, mode.deduct_from_student


def update_payment_status(self, extra_params={}):
    from apps.payments.services.payout import make_payout
    if 'orderId' in extra_params:
        order_id = extra_params['orderId']
    elif 'orderid' in extra_params:
        order_id = extra_params['orderid']
    elif self.request.GET.get('orderId'):
        order_id = self.request.GET.get('orderId')
    order_id = extra_params['orderId'] if 'orderId' in extra_params else self.request.GET.get('orderId')
    online_payment = OnlinePayment.objects.get(
        order_id=order_id,
    )
    gateway_vendor_code = online_payment.gateway_vendor.code
    online_payment = gateway_refresh_order_status(self,online_payment,gateway_vendor_code,False)
    payment_status = ''
    if gateway_vendor_code == 'onepay':
        payment_status = ONEPAY_PAYMENT_STATUSES['success']
    elif gateway_vendor_code == 'cashfree':
        payment_status = CASHFREE_PAYMENT_STATUSES['success']
    elif gateway_vendor_code == 'billdesk':
        payment_status = BILLDESK_PAYMENT_STATUSES['success']
    successfull_transaction = online_payment.payment_status == payment_status
    return_url = online_payment.return_url
    if successfull_transaction:
        data = online_payment.data
        if online_payment.entity_name == 'FC':
            data['online_payment'] = online_payment.id
            self.request.user = online_payment.user
            data['mode_of_payment_list']=[{"mode_of_payment":"Online","payment_ref_num":"","note":"","amount":data['total_amount']}]
            # Validation funcion will be called here 
            # validate_payload_data(data)
            fee_collection_data = add_fee_collection(self, data, False, True)
            online_payment.status = 1
            online_payment.save()
            fee_collection_id = fee_collection_data.get('data', {}).get('id')
            try:
                # Extract bank_ref_id from gateway_response and store in FeeCollection.payment_ref_num and FeeCollectionModeOfPayment
                if fee_collection_id and online_payment.gateway_response:
                    gateway_response = online_payment.gateway_response
                    if isinstance(gateway_response, dict) and 'bank_ref_id' in gateway_response:
                        bank_ref_id = gateway_response.get('bank_ref_id')
                        if bank_ref_id and bank_ref_id != 'NA':
                            # Update FeeCollection.payment_ref_num
                            FeeCollection.objects.filter(id=fee_collection_id).update(payment_ref_num=bank_ref_id)
                            # Update FeeCollectionModeOfPayment.payment_ref_num for Online mode of payment
                            FeeCollectionModeOfPayment.objects.filter(
                                fee_collection_id=fee_collection_id,
                                mode_of_payment='Online'
                            ).update(payment_ref_num=bank_ref_id)
            except Exception as e:
                pass
            settig_val = ConfigurationService.get_setting_value('instant_payout')
            if settig_val == '200':
                from apps.payments.services import make_payout_param_data, make_payout_view
                payout_payload = make_payout_param_data(data['academic_year'], [fee_collection_id])
                make_payout_view(self, payout_payload)
        elif online_payment.entity_name == 'AF':
            # Handle Application Fee payment
            from apps.forms.services.application_payment import update_application_payment_status
            from apps.finance.models.feeCollection import ApplicationPaymentDetail
            
            application_student_id = data.get('application_student_id') or data.get('payment_data', {}).get('application_student_id')
            payment_status = 'SUCCESS' if online_payment.payment_status in ['SUCCESS', 'SUCCESSFUL'] else online_payment.payment_status
            
            # Update application payment status
            update_application_payment_status(self, online_payment.order_id, payment_status, {'application_student_id': application_student_id})
            
            # Update bank_ref_id in ApplicationPaymentDetail if available (for OnePay)
            try:
                if online_payment.payment_status == payment_status and online_payment.gateway_response:
                    gateway_response = online_payment.gateway_response
                    if isinstance(gateway_response, dict) and 'bank_ref_id' in gateway_response:
                        bank_ref_id = gateway_response.get('bank_ref_id')
                        if bank_ref_id and bank_ref_id != 'NA':
                            # Update ApplicationPaymentDetail.payment_ref_num
                            ApplicationPaymentDetail.objects.filter(
                                online_payment=online_payment
                            ).update(payment_ref_num=bank_ref_id)
            except Exception as e:
                pass
            
            # For application fees, redirect to application dashboard
            host = self.request.META.get('HTTP_HOST', '')
            if host:
                if successfull_transaction:
                    return_url = f'https://{host}/apply/dashboard?payment=success&orderId={order_id}'
                else:
                    return_url = f'https://{host}/apply/dashboard?payment=failed&orderId={order_id}'
    return return_url


def get_company_beneficiary():
    from apps.payments.models.beneficiary import Beneficiary
    try:
        beneficiary = Beneficiary.objects.get(
            is_primary=True,
            user__groups__id=1
        )
    except Beneficiary.DoesNotExist:
        raise exceptions.ValidationError(
            'Institute Primary Beneficiary not found!!')
    return beneficiary

def gateway_refresh_order_status(self,online_payment,gateway,check_status=True):
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
        if online_payment.order_status == CASHFREE_ORDER_STATUSES['paid']:
            raise exceptions.ValidationError('Transaction already made!!')
        online_payment = refresh_order_status(online_payment,check_status=True)
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
        if online_payment.order_status == CASHFREE_ORDER_STATUSES['paid']:
            raise exceptions.ValidationError('Transaction already made!!')
        online_payment,billdesk_response = refresh_order_status_billdesk(self,online_payment,check_status=True)
    if gateway == PAYMENT_GATEWAYS_DATA_MAP['onepay']:
        if online_payment.order_status == ONEPAY_ORDER_STATUSES['paid']:
            raise exceptions.ValidationError("Transaction already made!!")
        online_payment, onepay_response = refresh_order_status_onepay(self, online_payment, check_status=True)
    return online_payment

def refresh_order_status(online_payment, check_status=True):
    cashfree_response = CashFreeAPICallsNew.get_order_call(online_payment.order_id)
    if online_payment.cf_payment_id:
        cashfree_payment_response = CashFreeAPICallsNew.get_payment_status_call(online_payment.order_id, online_payment.cf_payment_id)
        if 'payment_status' in cashfree_payment_response:
            online_payment.payment_status = cashfree_payment_response['payment_status']    

    if 'order_status' in cashfree_response:
        online_payment.order_status = cashfree_response['order_status']
    
    if online_payment.order_status == CASHFREE_ORDER_STATUSES['paid'] and check_status:
        order_processed = 0
        if online_payment.entity_name == 'FC':
            order_processed = FeeCollection.objects.filter(
                mode_of_payment="Online",
                online_payment=online_payment,
                is_active=True
            ).count()
        if order_processed > 0:
            online_payment.status = 1
    online_payment.save()
    return online_payment

def refresh_order_status_billdesk(self,online_payment, check_status=True):
    billdesk_response = BillDeskAPICallsNew.get_order_call(online_payment.order_id,get_merc_id('billdesk'))
    max_time_to_expire_order_id=FormdefinitionService.get_formdefintion_data(self, 'payment_confgiruation', 'max_time_to_expire_order_id')
    if 'surcharge' in billdesk_response:
        online_payment.transaction_fees=billdesk_response['surcharge']
    if 'status' in billdesk_response: #if payment not done then it has only status
        if str(billdesk_response['status']) == str(BILLDESK_PAYMENT_STATUSES_CODES['not_found']) and online_payment.expiry_time <= datetime.now():
            online_payment.order_status = BILLDESK_ORDER_STATUSES['expired']
    if 'transactionid' in billdesk_response:
        online_payment.cf_payment_id=billdesk_response['transactionid']
    if 'auth_status' in billdesk_response:
        if billdesk_response['auth_status'] == BILLDESK_PAYMENT_STATUSES_CODES['success']:
            if online_payment.created+timedelta(minutes=max_time_to_expire_order_id)<=datetime.strptime(billdesk_response['transaction_date'],"%Y-%m-%dT%H:%M:%S%z").replace(tzinfo=None):
                online_payment.order_status = BILLDESK_ORDER_STATUSES['paid']
                online_payment.failed_reason = "Payment Done After expiry time"
                online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['success_in_billdesk_failed_in_edubricz']
            elif str(online_payment.amount) != billdesk_response['amount'] or online_payment.mode_of_payment != billdesk_response['payment_method_type']:
                online_payment.order_status = BILLDESK_ORDER_STATUSES['paid']
                online_payment.failed_reason = "Bill Desk response data amount is not matching the edubricz amount"
                online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['success_in_billdesk_failed_in_edubricz']
            else:
                online_payment.order_status = BILLDESK_ORDER_STATUSES['paid']
                online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['success']
        if billdesk_response['auth_status'] == BILLDESK_PAYMENT_STATUSES_CODES['failed']:
            online_payment.order_status = BILLDESK_ORDER_STATUSES['paid']
            online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['failed']
        if billdesk_response['auth_status'] == BILLDESK_PAYMENT_STATUSES_CODES['pending']:
            online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['pending']

    if online_payment.payment_status == BILLDESK_PAYMENT_STATUSES['success'] and check_status:
        order_processed = 0
        if online_payment.entity_name == 'FC':
            order_processed = FeeCollection.objects.filter(
                mode_of_payment="Online",
                online_payment=online_payment,
                is_active=True
            ).count()
        if order_processed > 0:
            online_payment.status = 1
    online_payment.save()
    return online_payment,billdesk_response

def refresh_order_status_onepay(self,online_payment, check_status=True):
    onepay_response = OnePayAPICallsNew.get_order_call(online_payment.order_id,online_payment.gateway_vendor.merc_id)
    online_payment.gateway_response = onepay_response
    max_time_to_expire_order_id=FormdefinitionService.get_formdefintion_data(self, 'payment_confgiruation', 'max_time_to_expire_order_id')
    if max_time_to_expire_order_id == 5:
        max_time_to_expire_order_id = 15
    if 'sur_charge' in onepay_response and onepay_response['sur_charge'] != 'NA':
        online_payment.transaction_fees = onepay_response['sur_charge']
    if 'payment_mode' in onepay_response:
        online_payment.mode_of_payment = onepay_response['payment_mode']
    if 'pg_ref_id' in onepay_response:
        online_payment.cf_payment_id=onepay_response['pg_ref_id']
    if 'trans_status' in onepay_response:
        if str(onepay_response['trans_status']) == str(ONEPAY_PAYMENT_STATUSES_CODES['timeout']) and online_payment.expiry_time <= datetime.now():
            online_payment.order_status = ONEPAY_ORDER_STATUSES['expired']
        if (str(onepay_response['trans_status']) == str(ONEPAY_PAYMENT_STATUSES_CODES['failed'])) or (str(onepay_response['trans_status']) == 'NA'):
            online_payment.order_status = ONEPAY_ORDER_STATUSES['failed']
            online_payment.payment_status = ONEPAY_PAYMENT_STATUSES['failed']
    if 'trans_status' in onepay_response and onepay_response['trans_status'] == ONEPAY_PAYMENT_STATUSES_CODES['success']:
        if str(online_payment.amount) != str(onepay_response['txn_amount']):
            online_payment.order_status = ONEPAY_ORDER_STATUSES['paid']
            online_payment.failed_reason = "One Pay response data amount is not matching the edubricz amount"
            online_payment.payment_status = ONEPAY_PAYMENT_STATUSES['success_in_onepay_failed_in_edubricz']
        else:
            online_payment.order_status = ONEPAY_ORDER_STATUSES['paid']
            online_payment.payment_status = ONEPAY_PAYMENT_STATUSES['success']
    if online_payment.payment_status == ONEPAY_PAYMENT_STATUSES['success'] and check_status:
        order_processed = 0
        if online_payment.entity_name == 'FC':
            order_processed = FeeCollection.objects.filter(
                mode_of_payment="Online",
                online_payment=online_payment,
                is_active=True
            ).count()
        if order_processed > 0:
            online_payment.status = 1
    online_payment.save()
    return online_payment,onepay_response

def get_payment_history(self, order_id):
    filters = { 'order_id': order_id }
    if self.request.user.student:
        filters['user'] = self.request.user

    try:
        OnlinePayment.objects.get(**filters)
    except OnlinePayment.DoesNotExist:
        raise exceptions.ValidationError('Order not found!!')
    return CashFreeAPICallsNew.get_payments_service(order_id)

def invalidate_links(order_id):
    # gateway_vendor_obj = PaymentGateWays.objects.get(is_active=True)
    # gateway_vendor_code = gateway_vendor_obj.code
    online_payment = OnlinePayment.objects.get(order_id=order_id)
    gateway_vendor = PaymentGateWays.objects.get(id=online_payment.gateway_vendor.id)
    if gateway_vendor.code == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
        billdesk_response = BillDeskAPICallsNew.get_order_call(online_payment.order_id,gateway_vendor.merc_id)
        if 'status' in billdesk_response:
            if billdesk_response['status'] == BILLDESK_PAYMENT_STATUSES['not_found']:
                online_payment.payment_status = BILLDESK_PAYMENT_STATUSES['temporarily_disabled']#need to check
                online_payment.save()
                return True
    elif gateway_vendor.code == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
        cashfree_response = CashFreeAPICallsNew.get_order_call(online_payment.order_id)
        if cashfree_response.get('order_status') == CASHFREE_ORDER_STATUSES['active']:
            cashfree_payment_response = CashFreeAPICallsNew.get_payment_status_call(online_payment.order_id, online_payment.cf_payment_id)
            if cashfree_payment_response.get('payment_status') == CASHFREE_PAYMENT_STATUSES['not_attempted']:
                online_payment.payment_status = CASHFREE_PAYMENT_STATUSES['temporarily_disabled']
                online_payment.save()
                return True
    elif gateway_vendor.code == PAYMENT_GATEWAYS_DATA_MAP['onepay']:
        onepay_response =  OnePayAPICallsNew.get_order_call(online_payment.order_id, gateway_vendor.merc_id)
        if 'trans_status' in onepay_response:
            if onepay_response['trans_status'] == ONEPAY_PAYMENT_STATUSES_CODES['timeout']:
                if 'payment_mode' in onepay_response and onepay_response['payment_mode'] == 'NA':
                    online_payment.order_status = ONEPAY_ORDER_STATUSES['expired']
                online_payment.payment_status = ONEPAY_PAYMENT_STATUSES['timeout']#need to check
                online_payment.save()
                return True
    return False

def get_customer_id(self, institute_obj, user_obj):
    if not institute_obj:
        institute_obj = Institute.get_institute(self)
    if not user_obj:
        user_obj = self.request.user

    return institute_obj.code + '_' + user_obj.username