"""
Service for Application Fee Payment via Payment Gateway
"""
import copy
from django.db import transaction
from rest_framework import exceptions
from decimal import Decimal

from apps.forms.models import ApplicationStudent
from apps.finance.models import ApplicationPlan, ApplicationPaymentDetail
from apps.payments.models.gateways import PaymentGateWays
from apps.payments.models.online_payments import OnlinePayment, EntityNames, StatusList
from apps.payments.services.order_payments import make_payment, calculate_transaction_fees
from apps.payments.constants import PAYMENT_GATEWAYS_DATA_MAP
from apps.shared.services import CounterService, SharedService, FormdefinitionService
from apps.shared.services_shared.common import get_full_name
from apps.tenants.services.middlewares import get_current_db_name
from apps.institutes.models import Institute


def get_application_fee_amount(self, application_student_id, standard_id=None, academic_year_id=None):
    """
    Get application fee amount for a standard
    """
    application_student = ApplicationStudent.objects.get(id=application_student_id)
    
    # Get standard from application or parameter
    standard = standard_id or application_student.current_standard_id
    academic_year = academic_year_id or application_student.entry_academic_year_id
    
    if not standard or not academic_year:
        raise exceptions.ValidationError('Standard and Academic Year are required')
    
    try:
        application_plan = ApplicationPlan.objects.get(
            standard_id=standard,
            academic_year_id=academic_year,
            is_active=True
        )
        return application_plan.amount
    except ApplicationPlan.DoesNotExist:
        raise exceptions.ValidationError('Application fee plan not found for the selected standard')


def create_application_payment_order(self, data):
    """
    Create payment order for application fee via payment gateway
    """
    application_student_id = data.get('application_student_id')
    payment_gateway_id = data.get('payment_gateway_id')
    transaction_type = data.get('transaction_type', 'UPI_TRANSACTION_FEE')
    
    if not application_student_id:
        raise exceptions.ValidationError('Application Student ID is required')
    
    if not payment_gateway_id:
        raise exceptions.ValidationError('Payment Gateway ID is required')
    
    # Get application student
    try:
        application_student = ApplicationStudent.objects.get(id=application_student_id)
    except ApplicationStudent.DoesNotExist:
        raise exceptions.ValidationError('Application Student not found')
    
    # Get application fee amount
    fee_amount = get_application_fee_amount(
        self,
        application_student_id,
        application_student.current_standard_id,
        application_student.entry_academic_year_id
    )
    
    # Get payment gateway
    try:
        gateway_vendor_obj = PaymentGateWays.objects.get(id=payment_gateway_id, is_active=True)
    except PaymentGateWays.DoesNotExist:
        raise exceptions.ValidationError('Payment Gateway not found or inactive')
    
    # Get mobile number and email from application student
    mobile_num = application_student.mobile_num or ''
    email = application_student.email or ''
    
    # Prepare payment data similar to fee collection
    payment_data = {
        'entity_name': 'AF',  # Application Fee
        'transaction_type': transaction_type,
        'payment_gateway_id': payment_gateway_id,
        'payload': {
            'application_student_id': application_student_id,
            'total_payable_amount': float(fee_amount),
            'payment_data': {
                'application_student_id': application_student_id,
                'mobile_num': mobile_num,
                'email': email,
            },
            'student_name': get_full_name(
                application_student.first_name,
                application_student.middle_name,
                application_student.last_name
            ),
            'student_standard': application_student.current_standard_id if application_student.current_standard else None,
        }
    }
    
    # Temporarily set user to None for public application form
    original_user = getattr(self.request, 'user', None)
    self.request.user = None
    
    try:
        # Create payment order
        order_response = make_payment(self, payment_data)
    finally:
        # Restore original user
        self.request.user = original_user
    
    return {
        'Reason': 'Payment order created successfully',
        'data': order_response
    }


def update_application_payment_status(self, order_id, payment_status, payment_data=None):
    """
    Update application payment status after payment gateway callback
    """
    try:
        online_payment = OnlinePayment.objects.get(order_id=order_id, entity_name='AF')
    except OnlinePayment.DoesNotExist:
        raise exceptions.ValidationError('Payment order not found')
    
    # Update payment status
    online_payment.payment_status = payment_status
    online_payment.order_status = 'PAID' if payment_status == 'SUCCESS' else 'ACTIVE'
    
    if payment_status == 'SUCCESS':
        online_payment.status = '1'  # Paid
        # Create application payment detail record
        with transaction.atomic(using=get_current_db_name()):
            # Get application_student_id from payment data
            application_student_id = None
            if payment_data and 'application_student_id' in payment_data:
                application_student_id = payment_data['application_student_id']
            elif online_payment.data and 'application_student_id' in online_payment.data:
                application_student_id = online_payment.data['application_student_id']
            elif online_payment.data and 'payment_data' in online_payment.data:
                payment_data_dict = online_payment.data.get('payment_data', {})
                application_student_id = payment_data_dict.get('application_student_id')
            
            if not application_student_id:
                raise exceptions.ValidationError('Application Student ID not found in payment data')
            
            application_student = ApplicationStudent.objects.get(id=application_student_id)
            application_student.is_active = True
            application_student.save()
            
            # Check if payment already exists
            if not ApplicationPaymentDetail.objects.filter(student=application_student).exists():
                # Get application plan
                application_plan = ApplicationPlan.objects.get(
                    standard=application_student.current_standard,
                    academic_year=application_student.entry_academic_year,
                    is_active=True
                )
                
                # Generate receipt number
                counter, prefix, postfix = CounterService.get_countered_value(
                    self,
                    'APPLICATION_RECEIPT',
                    academic_year=application_student.entry_academic_year
                )
                receipt_num = f'{prefix}{counter.value}{postfix}'
                
                # Extract bank_ref_id from gateway_response if available (for OnePay)
                bank_ref_id = order_id  # Default to order_id
                if online_payment.gateway_response:
                    gateway_response = online_payment.gateway_response
                    if isinstance(gateway_response, dict) and 'bank_ref_id' in gateway_response:
                        bank_ref_id = gateway_response.get('bank_ref_id') or order_id
                
                # Create payment detail
                payment_detail = ApplicationPaymentDetail.objects.create(
                    student=application_student,
                    amount_paid=float(online_payment.amount),
                    receipt_num=receipt_num,
                    mode_of_payment='Online',
                    payment_ref_num=bank_ref_id,
                    online_payment=online_payment,
                    user=self.request.user  # No user for public application form
                )
                
                CounterService.increment_counter(self, counter)
    
    online_payment.save()
    
    return {
        'Reason': 'Payment status updated successfully',
        'data': {
            'order_id': order_id,
            'payment_status': payment_status,
            'application_student_id': application_student_id if payment_status == 'SUCCESS' else None
        }
    }

