import json
import logging

from rest_framework import viewsets, exceptions
from rest_framework.exceptions import ValidationError
from django.shortcuts import redirect
from django.db import transaction
from apps.finance.models.fee import FeePlan
from rest_framework.views import Response, APIView
from django.db.models import F, Sum, Count
from django.http import HttpResponse

from apps.shared.services import SharedService,FormdefinitionService
from apps.payments.models.payout import Payout
from apps.shared.services_shared.common import get_full_name
from apps.users.models.user import User
from apps.staffs.models.staff import Staff
from apps.finance.models import FeeCollection
from apps.finance.models.additional_charge import AdditionalCharge
from apps.users.services.permissions import IsAuthenticated
from apps.tenants.services.middlewares import get_current_db_name
from apps.payments.serializers import (BeneficiarySerializer, OnlinePaymentReturnDataLogSerializer, OnlinePaymentsSerializer, PayoutSerializer, OnlinePaymentMethodsSerializer, OnlinePaymentsReadSerializer,
                                       RefundReadSerializer,RefundRequestSerializer, PaymentGatewaySerializer)
from apps.finance.serializers import FeeCollectionSerializer
from apps.payments.services.order_refunds import make_order_refund,create_refund_request,get_refund_requests,get_refund_request_status
from apps.payments.services.gateway_handlers.billdesk import get_merc_id
from apps.payments.services.gateway_handlers.billdesk_api import BillDeskAPICallsNew
from apps.students.models import Student
from apps.payments.models import *
from apps.payments.services import *
from apps.payments.constants import BANK_CODES,REFUND_REQUEST_TYPES
from rest_framework import permissions
log = logging.getLogger(__name__)


class BeneficiaryViewSet(viewsets.ModelViewSet):
    
    serializer_class = BeneficiarySerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = Beneficiary.objects.filter(
            user=self.request.user
        )
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_beneficiary(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class RefundViewSet(viewsets.ModelViewSet):
    
    serializer_class = RefundReadSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = Refund.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        merc_refund_ref_no = self.request.GET.get('refund_id')
        payload={
            'merc_refund_ref_no':merc_refund_ref_no,
            "mercid":get_merc_id('billdesk')
        }
        response = BillDeskAPICallsNew.get_refund(self,payload)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = make_order_refund(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)
    
class RefundRequestViewSet(viewsets.ModelViewSet):
    
    serializer_class = RefundRequestSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = RefundRequest.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_refund_requests(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = create_refund_request(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)
    
class RefundRequestTypesViewSet(viewsets.ModelViewSet):
    
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response_data = REFUND_REQUEST_TYPES
        response=[]
        for data in response_data:
            response.append({'status':data,'status_name':response_data[data]})
        return Response({'data':response})

class OnlinePaymentViewSet(viewsets.ModelViewSet):
    queryset = OnlinePayment.objects.all()
    serializer_class = OnlinePaymentsSerializer
    http_method_names = ['post', 'get', 'put']
    
    def create(self, request, *args, **kwargs):
        response = make_payment(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        """
            We call this when we refresh the order status in the order status page
        """
        order_id = request.GET.get('orderId')
        online_payment_fields = ['order_id', 'entity_name', 'amount', 'transaction_fees', 'order_status', 'payment_status',
                            'mode_of_payment', 'return_url', 'user', 'status', 'data', 'created', 'modified',
                            'fee_collection_online_payment__id', 'id']
        if order_id:
            data = OnlinePayment.objects.filter(order_id=request.GET.get('orderId')).values(*online_payment_fields)
            refresh = self.request.GET.get('refresh')
            if data:
                data = data[0]
                fee_collection_data = FeeCollection.objects.filter(online_payment=data['id'], is_active=True).values(
                    'online_payment_id', 'id', 'transaction_date'
                )
                fee_collection_data = {fee_data['id']:fee_data for fee_data in fee_collection_data}
                if refresh and not fee_collection_data: #refreshing the page and fee colleciton is not created 
                    try:
                        update_payment_status(self)
                        # we call this again because when we refresh we want this data
                        data = OnlinePayment.objects.filter(order_id=request.GET.get('orderId')).values(
                            *online_payment_fields
                        )
                        data = data[0]
                        fee_collection_data = FeeCollection.objects.filter(online_payment=data['id'], is_active=True).values(
                            'online_payment_id', 'id', 'transaction_date'
                        )
                        fee_collection_data = {fee_data['id']:fee_data for fee_data in fee_collection_data}
                    except Exception as e:
                        pass
                data['refund_data'] = Refund.objects.filter(online_payment=data['id']).values()
                data['fee_collection_data'] = fee_collection_data[data['fee_collection_online_payment__id']] if fee_collection_data and data['fee_collection_online_payment__id'] in fee_collection_data else {}
                data['entity_display_name'] = 'Fee Collection'
                fee_plan_ids = []
                temp_data = data['data']
                additional_charge_ids = set()
                for standard_fee in temp_data['standard_fee']:
                    fee_plan_ids.append(standard_fee['fee_plan'])
                    if standard_fee.get('additional_charge_data', None):
                        for charge_data in standard_fee.get('additional_charge_data'):
                            additional_charge_ids.add(charge_data["additional_charge"])
                    else:
                        standard_fee['additional_charge_data'] = []
                charge_vals = AdditionalCharge.objects.filter(id__in=list(additional_charge_ids)).values('id', charge_name=F('additional_charge_type__name'))
                charge_name_mapping = {}
                for charge_type in charge_vals:
                    charge_name_mapping[charge_type['id']] = charge_type['charge_name']
                fee_plan_data = {fee['id']: fee for fee in FeePlan.objects.filter(id__in=fee_plan_ids).values(
                    'standard_fee__fee_type__name', 'payment_end_date', 'terms','id'
                )}
                for standard_fee in temp_data['standard_fee']:
                    temp = fee_plan_data[standard_fee['fee_plan']]
                    standard_fee['fee_type_name'] = temp['standard_fee__fee_type__name']
                    standard_fee['fee_payment_end_date'] = temp['payment_end_date']
                    standard_fee['fee_payment_terms'] = temp['terms']
                    standard_fee['fee_plan'] = temp['id']
                    for charge_data in standard_fee.get('additional_charge_data', []):
                        charge_data['name'] = charge_name_mapping.get(charge_data['additional_charge'], '')
                data['data'] = temp_data
            else:
                raise exceptions.ValidationError('Order Not found')
            return Response(data)
        else:
            response_data = SharedService.read_data(self,True)
            device_type = self.request.GET.get('device_type')
            if not device_type:
                refund_status_filter_ids = self.request.GET.get('status', [])
                if refund_status_filter_ids:
                    refund_status_filter_ids = refund_status_filter_ids.split(',')
                response_data_filter = {'data':[]}
                online_payment_ids=[]
                for data in response_data['data']:
                    online_payment_ids.append(data['id'])
                users = User.objects.filter(is_active=True).values('is_staff','student_id','staff_id','id')
                students = Student.objects.filter().values('first_name','middle_name','last_name','id')
                staffs = Staff.objects.filter().values('first_name','middle_name','last_name','id')
                refund_data= RefundRequest.objects.filter(online_payment__in=online_payment_ids).values()
                user_dict={}
                student_dict={}
                staff_dict={}
                refund_dict={}
                for user in users:
                    user_dict[user['id']]=user
                for student in students:
                    student_dict[student['id']] = student
                for staff in staffs:
                    staff_dict[staff['id']] = staff
                for refund in refund_data:
                    refund_dict[refund['online_payment_id']] = refund
                for data in response_data['data']:
                    data['refund_status']=None
                    if data['id'] in refund_dict:
                        data['refund_status'] = refund_dict[data['id']]['status']
                        data['refund_status_name'] = get_refund_request_status(self,refund_dict[data['id']]['status'])
                    data['online_payment_done_is_staff']= user_dict[data['user']]['is_staff']
                    if not data['online_payment_done_is_staff']:
                        data['online_payment_done_user_name'] = get_full_name(student_dict[user_dict[data['user']]['student_id']]['first_name'],
                                                            student_dict[user_dict[data['user']]['student_id']]['middle_name'],
                                                            student_dict[user_dict[data['user']]['student_id']]['last_name'])
                    else:
                        data['online_payment_done_user_name'] = get_full_name(staff_dict[user_dict[data['user']]['staff_id']]['first_name'],
                                                            staff_dict[user_dict[data['user']]['staff_id']]['middle_name'],
                                                            staff_dict[user_dict[data['user']]['staff_id']]['last_name'])
                    data['total_online_payment_amount']=float(data['amount'])+float(data['transaction_fees'])
                    if refund_status_filter_ids and str(data['refund_status']) in refund_status_filter_ids:
                        response_data_filter['data'].append(data)
                if refund_status_filter_ids:
                    response_data = response_data_filter
            return Response(response_data)

    def update(self, request, *args, **kwargs):
        order_id = self.kwargs['pk']
        data = invalidate_links(order_id)
        return Response({ 'message': 'Order updated successfully!!' })


class OnlinePaymentNotifyViewSet(viewsets.ModelViewSet):
    """ This is a open api. It will be hit by the cashfree. """
    queryset = FeeCollection.objects.all()
    serializer_class = FeeCollectionSerializer
    permission_classes = (permissions.AllowAny,)
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        return HttpResponse("")

    # payment gateway hit this api because this is the return url
    def create(self, request):
        from apps.payments.services.gateway_handlers.aes_encrypt import decrypt
        order_id = self.request.GET.get('orderId')
        try:
            with transaction.atomic(using=get_current_db_name()):
                return_url = update_payment_status(self,{'orderId': order_id})
                return redirect(return_url)
        except Exception as e:
            print(e.args)
            host = self.request.META['HTTP_HOST']
            failed_url = f'https://{host}'+'/failed-url/?orderId='+order_id
            return redirect(failed_url)


class PayoutViewSet(viewsets.ModelViewSet):
    queryset = Payout.objects.all()
    serializer_class = PayoutSerializer
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        params = request.GET.dict()
        response = fee_collection_payout_detail(params.get("year"), params.get("standard"))
        return Response(response)

    def create(self, request, *args, **kwargs):
        request_data = self.request.data
        response = make_payout_view(self, request_data)
        return Response({ "message": "Payout made successfully!!" })

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class OnlinePaymentTypeViewSet(viewsets.ModelViewSet):
    serializer_class = OnlinePaymentMethodsSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = OnlinePaymentMethods.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        # if FormdefinitionService.get_formdefintion_data(self, 'payment_confgiruation', 'is_disable_payment_method_page_in_student_app'):
        #     raise ValidationError('This school not opted payment type')
        data = SharedService.read_data(self, True)
        response = get_payment_methods(data.get('data', []), request.GET.dict())
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class BeneficiaryMappingViewSet(viewsets.ModelViewSet):
    # serializer_class = OnlinePaymentMethodsSerializer
    http_method_names = ['get', 'post']
    
    def create(self, request, *args, **kwargs):
        request_data = request.data
        response = set_beneficiary_fee_plan(self, request_data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_beneficiary_plans(self)
        return Response(response)

    # def retrieve(self, request, *args, **kwargs):
    #     raise exceptions.MethodNotAllowed(request.method)

class PaymentAttemptViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        order_id = self.request.GET.get('order_id')
        response = get_payment_history(order_id)
        return Response(response)

class BankDataViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        return Response({'data': BANK_CODES})

class PaymentGatewayViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentGatewaySerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = PaymentGateWays.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class PaymentGatewayListViewSet(viewsets.ModelViewSet):
    queryset = OnlinePayment.objects.all()
    serializer_class = OnlinePaymentsSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return get_payment_gateway_queryset(self.request.GET)

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        summary = get_payment_gateway_summary(queryset, request.GET)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            data = serializer.data
        else:
            serializer = self.get_serializer(queryset, many=True)
            data = serializer.data

        enrich_payment_gateway_items(data)

        if page is not None:
            response = self.get_paginated_response(data)
            if summary is not None:
                response.data['summary'] = summary
            return response
        return Response({'data': data, 'summary': summary})

    def retrieve(self, request, *args, **kwargs):
        order_id = self.kwargs.get('pk')
        if not order_id:
            raise exceptions.ValidationError('Order ID is required')

        response_data = get_payment_gateway_retrieve(order_id, self)
        if response_data is None:
            raise exceptions.ValidationError('Payment not found')
        return Response(response_data)
