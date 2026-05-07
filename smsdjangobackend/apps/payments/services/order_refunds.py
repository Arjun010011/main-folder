import datetime
from datetime import date , timedelta
import pytz
from rest_framework.exceptions import ValidationError
from django.db.models import Q, F
from django.db import transaction

from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.services import SharedService, CounterService
from apps.payments.models import OnlinePayment, Refund,RefundRequest
from apps.finance.models import FeeCollection
from apps.payments.services import refresh_order_status, CashFreeAPICalls
from apps.payments.services.order_payments import refresh_order_status_billdesk
from apps.payments.models.online_payments import EntityNames
from apps.institutes.models.institute import Institute
from apps.payments.models.gateways import PaymentGateWays
from apps.finance.services.fee_collection import delete_fee_collection
from apps.shared.services_shared.common import get_full_name
from apps.users.models.user import User
from apps.students.models.student import Student
from apps.staffs.models.staff import Staff
from apps.payments.serializers import RefundRequestSerializer
from apps.payments.services.gateway_handlers.billdesk_api import BillDeskAPICallsNew
from apps.payments.constants import CASHFREE_ORDER_STATUSES, CASHFREE_REFUND_STATUSES,CASHFREE_PAYMENT_STATUSES,PAYMENT_GATEWAYS_DATA_MAP,REFUND_REQUEST_TYPES
from apps.payments.billdesk_constants import BILLDESK_ORDER_STATUSES, BILLDESK_REFUND_STATUSES,BILLDESK_PAYMENT_STATUSES,BILLDESK_CREATE_ORDER_CALL

def  make_order_refund(self, data):
    online_payment = data.get('online_payment')
    try:
        online_payment_obj = OnlinePayment.objects.get(
            id=online_payment
        )
    except OnlinePayment.DoesNotExist:
        raise ValidationError('Payment not found')
    
    gateway_vendor_obj = PaymentGateWays.objects.get(is_active=True)
    gateway_vendor_code = gateway_vendor_obj.code
    if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
        payment_constant = CASHFREE_PAYMENT_STATUSES
        order_constant = CASHFREE_ORDER_STATUSES
        refund_constant = CASHFREE_REFUND_STATUSES
        if online_payment_obj.payment_status == CASHFREE_PAYMENT_STATUSES['failed']:
            raise ValidationError('Transaction got failed')
        else:
            online_payment_obj,billdesk_response = refresh_order_status(online_payment_obj, True)
    if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
        payment_constant = BILLDESK_PAYMENT_STATUSES
        order_constant = BILLDESK_ORDER_STATUSES
        refund_constant = BILLDESK_REFUND_STATUSES
        if online_payment_obj.payment_status == BILLDESK_PAYMENT_STATUSES['failed']:
            raise ValidationError('Transaction got failed')
        else:
            online_payment_obj,billdesk_response = refresh_order_status_billdesk(online_payment_obj, True)
    
    process_status = online_payment_obj.status
    payment_order_status = online_payment_obj.order_status
    payment_order_id = online_payment_obj.order_id

    if process_status and payment_order_status == order_constant['paid']:
        pass
    # elif process_status and payment_order_status == CASHFREE_ORDER_STATUSES['paid']:
    #     raise ValidationError('Transaction made. No need to refund')
    elif payment_order_status == 'PENDING':
        raise ValidationError('Transaction is still under processing')
    elif online_payment_obj.payment_status == payment_constant['failed']:
        raise ValidationError('Transaction got failed')
    else:
        raise ValidationError('Refund can not be done. Please check in contact cashfree')

    refund_list = Refund.objects.filter(
        online_payment=online_payment_obj
    )
    for refund_obj in refund_list:
        refreshable_statuses = [refund_constant['pending'], refund_constant['onhold']]
        if refund_obj.refund_status in refreshable_statuses:
            if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
                refresh_refund_status(refund_obj)
            if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
                refresh_refund_status_billdesk(refund_obj)

        not_refundable_statuses = [refund_constant['pending'], refund_constant['onhold']]
        if refund_obj.refund_status in not_refundable_statuses:
            raise ValidationError(f'Refund can not Done. Refund Id: {refund_obj.refund_id} alredy initiated and have status {refund_obj.refund_status}')

        if refund_obj.refund_status == refund_constant['success']:
            raise ValidationError(
                'Refund is already Done. Refund Id: ' + str(refund_obj.refund_id))
    
    refund_counter, refund_prefix, refund_postfix = CounterService.get_countered_value(
        self, 'ONLINE_TRANSACTION_REFUND')
    refund_prefix += str(Institute.get_institute(self).company_id)
    refund_prefix += datetime.datetime.now(pytz.timezone('Asia/Kolkata')).strftime("%Y%m%d%H%M%S%m")
    refund_id = f'{refund_prefix}{refund_counter.value}{refund_postfix}'
    CounterService.increment_counter(self, refund_counter)

    refund_data = dict(
        online_payment=online_payment_obj,
        refund_id=refund_id,
        amount=online_payment_obj.amount + online_payment_obj.transaction_fees
    )

    with transaction.atomic(using=get_current_db_name()):
        refund_serializer_response = Refund.objects.create(**refund_data)
        if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['cashfree']:
            payload = dict(
                refund_id=refund_id,
                refund_amount=online_payment_obj.amount + online_payment_obj.transaction_fees,
                refund_note=f'Refund of order {payment_order_id}'
            )
            cashfree_refund_response = CashFreeAPICalls.initiate_refund_call(payment_order_id, payload)
            refund_serializer_response.refund_status = cashfree_refund_response['refund_status']
            refund_serializer_response.save()
            return refund_serializer_response
        if gateway_vendor_code == PAYMENT_GATEWAYS_DATA_MAP['billdesk']:
            payload={
                "transactionid":billdesk_response["transactionid"],
                "orderid":billdesk_response["orderid"],
                "mercid":billdesk_response["mercid"],
                "transaction_date":billdesk_response["transaction_date"],
                "txn_amount":billdesk_response["amount"],
                "refund_amount":billdesk_response["amount"],
                "currency":BILLDESK_CREATE_ORDER_CALL['currency'],
                "merc_refund_ref_no":refund_id
            }
            billdesk_refund_response = BillDeskAPICallsNew.initiate_refund(payload)
            if billdesk_refund_response['refund_status'] == "0699" or billdesk_refund_response['refund_status'] == "0799":
                refund_serializer_response.refund_status = "SUCCESS"
                FeeCollection.objects.filter(online_payment__order_id=billdesk_response["orderid"]).update(is_active=False)
                RefundRequest.objects.filter(online_payment__order_id=billdesk_response["orderid"]).update(status=2)
            refund_serializer_response.gateway_refund_id = billdesk_refund_response['refundid']
            refund_serializer_response.save()
            return billdesk_refund_response


def refresh_refund_status(refund_obj):
    payload = {'refundId': refund_obj.refund_id}
    cashfree_response = CashFreeAPICalls.refund_status_call(payload)
    refund_obj.refund_status = cashfree_response['refund_status']
    refund_obj.save()
    return refund_obj

def refresh_refund_status_billdesk(refund_obj):
    payload = {'refundId': refund_obj.refund_id}
    billdesk_response = BillDeskAPICallsNew.get_refund(payload)
    if billdesk_response['refund_status'] == "0699" or billdesk_response['refund_status'] == "0799":
        refund_obj.refund_status = "SUCCESS"        
        refund_obj.save()
    return refund_obj

def refundable_payment_list(self):
    filters = self.request.GET.dict()
    search = filters.get('search')
    payment_filters = dict(
        order_status=CASHFREE_ORDER_STATUSES['paid'],
        status=False
    )
    query = dict()
    if search:
        query = Q(order_id__icontains=search) | Q(order_id__icontains=search) | Q(student__first_name__icontains=search) | Q(
            student__middle_name__icontains=search) | Q(student__last_name__icontains=search) | Q(student__current_reg_num__icontains=search)

    online_payment_values = OnlinePayment.objects.filter(
        query,
        **payment_filters
    ).order_by('-created')[filters.get('offset', 0): filters.get('limit', 50) + filters.get('offset',)].values(
        'id',
        'order_id',
        'entity_name',
        'amount',
        'transaction_fees',
        'order_status',
        'mode_of_payment',
        first_name=F('user__student__first_name'),
        middle_name=F('user__student__middle_name'),
        last_name=F('user__student__last_name'),        
    )
    entity_dict = dict((val, key) for key, val in EntityNames)
    online_payment_ids = list()
    for online_payment in online_payment_values:
        online_payment['entity_name_display'] = entity_dict[online_payment['entity_name']]
        online_payment['total'] = online_payment['amount'] + online_payment['transaction_fees']
        online_payment_ids.append(online_payment['id'])
        
    refund_values = Refund.objects.filter(
        online_payment_id__in=online_payment_ids,
    ).exclude(
        refund_status=CASHFREE_REFUND_STATUSES['success']
    ).values(
        'id',
        'refund_id',
        'online_payment_id',
        'amount',
        'refund_status'
    )
    refund_mapping = dict()
    for refund in refund_values:
        if refund['online_payment_id'] not in refund_mapping:
            refund_mapping[refund['online_payment_id']] = []
        refund_mapping[refund['online_payment_id']].append(refund)

    for online_payment in online_payment_values:
        online_payment_id = online_payment['id']
        online_payment['refund_data'] = refund_values.get(online_payment_id)     
    return online_payment_values

def create_refund_request(self,data):
    online_payment = data.get('online_payment')
    try:
        online_payment_obj = OnlinePayment.objects.get(
            id=online_payment
        )
    except OnlinePayment.DoesNotExist:
        raise ValidationError('Payment not found')
    if online_payment_obj.payment_status != 'SUCCESS':
        raise ValidationError('Online Payment was not successfull')
    today = date.today()
    user = self.request.user
    online_payment_created_plus_two = online_payment_obj.created.date()+timedelta(days=2)
    if today>online_payment_created_plus_two:
        raise ValidationError('Cannot request refund payment done 2 days back')
    refund_request_data = {
        'online_payment':online_payment_obj.id,
        'status' : 1,
        'comments' : data['comments'],
        'user' : user.id
    }
    serializer = RefundRequestSerializer(data=refund_request_data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer.data

def get_refund_requests(self):
    response = SharedService.read_data(self,True)
    users = User.objects.filter(is_active=True).values('is_staff','student_id','staff_id','id')
    students = Student.objects.filter().values('first_name','middle_name','last_name','id')
    staffs = Staff.objects.filter().values('first_name','middle_name','last_name','id')
    user_dict={}
    student_dict={}
    staff_dict={}
    for user in users:
        user_dict[user['id']]=user
    for student in students:
        student_dict[student['id']] = student
    for staff in staffs:
        staff_dict[staff['id']] = staff
    for data in response['data']:
        data['status_name']=get_refund_request_status(self,data['status'])
        data['refund_requested_is_staff'] = user_dict[data['user']]['is_staff']
        data['online_payment_done_is_staff']= user_dict[data['online_payment_data']['user']]['is_staff']
        if not data['refund_requested_is_staff']:
            data['name_of_refund_requested_user'] = get_full_name(student_dict[user_dict[data['user']]['student_id']]['first_name'],
                                                student_dict[user_dict[data['user']]['student_id']]['middle_name'],
                                                student_dict[user_dict[data['user']]['student_id']]['last_name'])
        else:
            data['name_of_refund_requested_user'] = get_full_name(staff_dict[user_dict[data['user']]['staff_id']]['first_name'],
                                                staff_dict[user_dict[data['user']]['staff_id']]['middle_name'],
                                                staff_dict[user_dict[data['user']]['staff_id']]['last_name'])
        if not data['online_payment_done_is_staff']:
            data['online_payment_done_user_name'] = get_full_name(student_dict[user_dict[data['online_payment_data']['user']]['student_id']]['first_name'],
                                                student_dict[user_dict[data['online_payment_data']['user']]['student_id']]['middle_name'],
                                                student_dict[user_dict[data['online_payment_data']['user']]['student_id']]['last_name'])
        else:
            data['online_payment_done_user_name'] = get_full_name(staff_dict[user_dict[data['online_payment_data']['user']]['staff_id']]['first_name'],
                                                staff_dict[user_dict[data['online_payment_data']['user']]['staff_id']]['middle_name'],
                                                staff_dict[user_dict[data['online_payment_data']['user']]['staff_id']]['last_name'])
        data['refund_request_amount']=float(data['online_payment_data']['amount'])+float(data['online_payment_data']['transaction_fees'])
    return response

def get_refund_request_status(self,refund_request_status):
    refund_request_status_name=None
    if refund_request_status in REFUND_REQUEST_TYPES:
        refund_request_status_name = REFUND_REQUEST_TYPES[refund_request_status]
    return refund_request_status_name