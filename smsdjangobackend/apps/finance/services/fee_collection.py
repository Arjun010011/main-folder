import copy
import os
from datetime import datetime,timedelta,date
from itertools import chain
from django.db.models import Q, Value
from apps.bdu.services.download_service import download_excel_for_jnanajyothi
from apps.bdu.services.write_to_excel import write_to_excel_new,write_to_excel_new_fee_collection_group_wise
from apps.classes.services.standard import get_standard_for_current_year
from apps.finance.models.additional_charge import FeeCollectionAdditionChargeMapping
from apps.finance.models.fee_category import FeeCategory, FeeCategoryFeeStandardSectionMapping
from apps.finance.services import fee_plan
from apps.finance.services.additional_charge import add_additional_charge_payment_data, calculate_additional_charge
from apps.finance.services.adjustment import add_fee_plan_adjustment, apply_adjustment_in_fee_collection, check_is_adjustment_in_pending
from apps.forms.models.applicationStudent import ApplicationStudent
from apps.notification.models.notification import NotificationApiConfiguration
from apps.payments.constants import FAILED_PAYMENT_STATUSES, PENDING_PAYMENT_STATUSES
from apps.payments.constants import FAILED_PAYMENT_STATUSES, PENDING_PAYMENT_STATUSES
from apps.shared.models import counter_standard_section
from apps.shared.models.counter import CounterStandardMapping, Counter
from apps.shared.models.counter_standard_section import CounterStandardSectionMapping
from apps.shared.models.custom_design_template import CustomDesignTemplateMap
from apps.shared.models.fee_type_counter import CounterFeeTypeMapping,CounterMiscTypeMapping
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.store.models.dataEntry import ItemSold
from apps.shared.services_shared.custom import get_custom_data_for_objects
from apps.store.services.purchase_master import add_item_sold, delete_item_sold
from num2words import num2words

from django.db import transaction
from django.db.models import Sum, F
from django.forms import ValidationError
from rest_framework import exceptions

from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.classes.models.standard import InstituteAdresses, Standard, StandardSectionMapping
from apps.shared.models.custom_design_template import CustomDesignTemplate
from apps.expenditure.models import Expense
from apps.expenditure.serializers import ExpenseSerializer
from apps.expenditure.services.expense import get_expense_report
from apps.finance.models import (
    FeePlan, PaymentDetail, FeeCollection, ApplicationPaymentDetail, FeeCollectionModeOfPayment
)
from apps.finance.models.concession import AdjustmentFee, ConcessionType , AdjustmentFeeParent
from apps.finance.models.fee import FeeStandardMapping, StudentStoreMapping
from apps.finance.models.feeCollection import AdmissionForm,FeeCollectionModeOfPayment
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.finance.models.bankTransaction import BankDetail, BankTransaction
from apps.finance.models.miscellaneous import MiscellaneousType, MiscellaneousPayment
from apps.finance.serializers import (
    FeeCollectionAdditionChargeMappingReadSerilaizer, FeeCollectionDeleteTrackingSerializer, 
    FeeCollectionSerializer, FeeTermsSerializer, GetFeeCollectionSerializer, PaymentDetailSerializer,
    AdmissionFormSerializer, MiscellaneousTypeSerializer, FeeCollectionModeOfPaymentSerializer, DepositWithdrawRecordSerializer
)
from apps.finance.services import calculations
from apps.finance.services.concession_fee import add_concession_fee
from apps.finance.services.fee_plan import apply_automatic_concession_to_fee_plan, arrange_fee_plan_group_wise, get_fee_plan, get_student_fee_data, validate_apply_automatic_concession
from apps.institutes.models import Institute, AcademicYear, institute
from apps.institutes.serializers import InstituteAddressReadSerializer, InstituteAddressReadWithoutStandardSerializer, InstituteSerializer
from apps.notification.services.notification_service import send_notification
from apps.payments.models.online_payments import OnlinePayment
from apps.shared.services import FormdefinitionService, PDFService, SharedService, CounterService, ConfigurationService, UploadTypeService, NotificationBodyTemplate
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.students.models import Student
from apps.students.models.studentDetail import StudentParentMapping, StudentType, StudentAddress
from apps.students.serializers import ParentDetailSerializer, StudentListSerializer, StudentParentGuardianMappingSerializer, StudentTypeSerializer
from apps.students.services.student import STUDENT_TYPE, get_student_admission_form, get_student_current_standard, get_student_current_standard_section_name, get_students_standards_list
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.shared.models.template_mapping import TemplateStandardMapping
from apps.classes.services.standard import get_standard_for_current_year
from django.contrib.contenttypes.models import ContentType
from apps.institutes.models.financialyear import FinancialYear
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
from apps.finance.models.fee_advance import FeeAdvanceCollection
from apps.finance.services.fee_advance import sync_fee_advance_payment_details_for_fee_collection

import re

def num_sort(test_string):
    return_list = list(map(int,re.findall(r'\d+',test_string)))
    if return_list:
        return return_list[0]
    else:
        return 0


def get_fee_receipt_counter(self, academic_year, standard_id):
    counter_standard = CounterStandardMapping.objects.filter(
        standard=standard_id, is_active=True,  counter_type_name='fee_receipt'
    ).first()
    if counter_standard and counter_standard.is_global:
        academic_year = None
    if not counter_standard:
        receipt_counter, receipt_prefix, receipt_postfix = CounterService.get_countered_value(self, 'FEE_RECEIPT',
                                                                                            academic_year=academic_year)
    else:
        key = counter_standard.counter_type_name + '_' + counter_standard.group_name
        receipt_counter = Counter.objects.get(type=key, academic_year=academic_year)
        receipt_prefix = receipt_counter.prefix  if receipt_counter.prefix else ''
        receipt_postfix = receipt_counter.postfix  if receipt_counter.postfix else ''
    return receipt_counter, receipt_prefix, receipt_postfix

def get_misc_receipt_counter_misc_type(self, academic_year, misc_type_id,standard):
    filter_query = {
        'misc_type': misc_type_id,
        'is_active': True,
        'counter_type_name': 'misc_receipt'
        }
    counter_misc_type = CounterMiscTypeMapping.objects.filter(**filter_query).first()
    if counter_misc_type:
        key = counter_misc_type.counter_type_name + '_' + counter_misc_type.group_name
        if counter_misc_type.is_global:
            academic_year=None
        counter = Counter.objects.get(type=key, academic_year=academic_year)
        prefix = counter.prefix  if counter.prefix else ''
        postfix = counter.postfix  if counter.postfix else ''
        counter.value = '{0:03}'.format(int(counter.value))
    elif FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'misc_counter_point_to_finance'):
        counter, prefix, postfix = get_fee_receipt_counter(self, academic_year, standard)
    else:
        counter, prefix, postfix = CounterService.get_countered_value(self, 'MISC_RECEIPT', academic_year=academic_year)
    return counter,prefix,postfix

def get_fee_receipt_counter_fee_type(self, academic_year, fee_type, mode_of_payment=None):
    counter_fee_type = None
    filter_query = {
        'fee_type': fee_type,
        'is_active': True,
        'counter_type_name': 'fee_receipt'
    }
    if mode_of_payment:
        counter_fee_type = CounterFeeTypeMapping.objects.filter(
            **filter_query, mode_of_payment=mode_of_payment
        )
    if not counter_fee_type:
        counter_fee_type = CounterFeeTypeMapping.objects.filter(
            **filter_query, mode_of_payment=None
        )
    selected_counter_fee_type = None
    for counter_row in counter_fee_type:
        if counter_row.mode_of_payment:
           selected_counter_fee_type = counter_row
           break
        selected_counter_fee_type = counter_row
    if selected_counter_fee_type and selected_counter_fee_type.is_global:
        academic_year = None
    if not selected_counter_fee_type:
        receipt_counter, receipt_prefix, receipt_postfix = CounterService.get_countered_value(self, 'FEE_RECEIPT',
                                                                                        academic_year=academic_year)
    else:
        key = selected_counter_fee_type.counter_type_name + '_' + selected_counter_fee_type.group_name
        receipt_counter = Counter.objects.get(type=key, academic_year=academic_year)
        receipt_prefix = receipt_counter.prefix  if receipt_counter.prefix else ''
        receipt_postfix = receipt_counter.postfix  if receipt_counter.postfix else ''
    return receipt_counter, receipt_prefix, receipt_postfix

def get_fee_receipt_counter_standard_section(self, standard_section, fee_type_id, academic_year):
    counter_standard_section_data = CounterStandardSectionMapping.objects.filter(standard_section=standard_section)
    receipt_counter = receipt_prefix = receipt_postfix = ''
    if not counter_standard_section:
        standard_section = StandardSectionMapping.objects.get(standard_section=standard_section)
        raise exceptions.ValidationError(f'{standard_section.standard.name - standard_section.section.name}')
    for counter_standard in counter_standard_section_data:
        key = counter_standard.counter_type_name + '_' + counter_standard.group_name+'_standard_section'
        if str(counter_standard.fee_type) == str(fee_type_id):
            receipt_counter = Counter.objects.get(type=key, academic_year=academic_year)
            receipt_prefix = receipt_counter.prefix  if receipt_counter.prefix else ''
            receipt_postfix = receipt_counter.postfix  if receipt_counter.postfix else ''
            break #break if fee type condition gets to give priority to fee type
        else:
            receipt_counter = Counter.objects.get(type=key, academic_year=academic_year)
            receipt_prefix = receipt_counter.prefix  if receipt_counter.prefix else ''
            receipt_postfix = receipt_counter.postfix  if receipt_counter.postfix else ''
    return receipt_counter, receipt_prefix, receipt_postfix

def validate_mode_of_payment_data(mode_of_payment_list, total_payable_amount):
    temp_payable_total_amount = 0
    for mode_of_payment in mode_of_payment_list:
        if not mode_of_payment['mode_of_payment']:
            raise exceptions.ValidationError('mode_of_payment is mandatory')
        if not mode_of_payment['amount']:
            raise exceptions.ValidationError('Amount is mandatory in mode_of_payments')
        temp_payable_total_amount += mode_of_payment['amount']
    if temp_payable_total_amount != total_payable_amount:
        raise exceptions.ValidationError('Mode Of Payment total amount is not equal to the total amount payable')

def add_mode_of_payment_data(self,mode_of_payment_list,transaction_date=None,fee_collection_obj=None):
    deposit_data = []
    for payment in mode_of_payment_list:
        if 'bank_detail_id' in payment and payment['bank_detail_id']:
            payment['bank_detail'] = payment['bank_detail_id']
            del payment['bank_detail_id']
            content_type = ContentType.objects.get_for_model(fee_collection_obj)
            deposit={
                "bank_to":payment['bank_detail'],
                "date":transaction_date,
                "transaction_type":1,
                "transaction_from":1,
                "amount":payment['amount'],
                "created_by":self.request.user.id,
                "content_type":content_type.id,
                "object_id":fee_collection_obj.pk
            }
            deposit_data.append(deposit)
    serializer = FeeCollectionModeOfPaymentSerializer(data=mode_of_payment_list, many=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    depositserializer = DepositWithdrawRecordSerializer(data = deposit_data,many=True)
    depositserializer.is_valid(raise_exception=True)
    depositserializer.save()

"""
Nikhil get all formdefinition data at once 
"""
def add_fee_collection(self, data, is_validate_only=False, online_payment=False, dont_send_notification=False):
    data = copy.deepcopy(data)
    from apps.finance.services.fee_plan import TRANSPORT_CODENAME
    global feeTerm, standard
    admission = False
    academic_year = data['academic_year']
    fee_plan_list = dict()
    return_value = True
    automatic_concession = None
    apply_automatic_concession_total_amount = 0
    data['total_amount'] = 0
    student_obj = Student.objects.get(id=data['student'])
    student_standard_mapping_obj = StudentStandardMapping.objects.get(
        student=student_obj.id, academic_year=academic_year
    )
    enrolment_obj=None
    try:
        enrolment_obj = Enrollment.objects.get(student=student_obj.id,standard_section__academic_year=academic_year,standard_section__standard=student_standard_mapping_obj.standard)
    except:
        pass
    required_form_definition = [
        {'form_name': 'counter_confgiruation', 'column_name': 'counter_type'},
        {'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_fee_type'},
        {'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_fee_type_group'},
        {'form_name': 'counter_confgiruation', 'column_name': 'fee_receipt_standard_wise'},
        {'form_name': 'fee_configurations', 'column_name': 'enable_manual_receipt_num'},
    ]
    temp_form_defintion = FormdefinitionService.get_formdefinition_for_multiple_data(self, required_form_definition)
    enable_manual_receipt_num = temp_form_defintion['fee_configurations']['enable_manual_receipt_num']['default_value']
    adjustment_data_to_save = []
    total_applying_adjustment = 0
    is_apply_automatic_concession = True if ('automatic_concession_apply' in data and
            'concession_type' in data['automatic_concession_apply']  and
            data['automatic_concession_apply']['concession_type']
        ) \
        else False
    payment_total_amount = 0
    if not is_validate_only and not online_payment:
        if self.request.user.student and self.request.user.student.id:
            raise exceptions.ValidationError('Student cant collect the fees')
    for terms in data['standard_fee']:
        payment_total_amount += float(terms['amount_paid'])
        temp = {terms['fee_plan']: {'amount_paid': terms['amount_paid'], 'pending_amount': terms['pending_amount']}}
        if 'apply_automatic_concession_amount' in terms and terms['apply_automatic_concession_amount']:
            temp[terms['fee_plan']]['apply_automatic_concession_amount'] = terms['apply_automatic_concession_amount']
            apply_automatic_concession_total_amount += terms['apply_automatic_concession_amount']
        if 'fee_standard_mapping_item_selling_price_fee_standard_mapping' in terms and terms['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
            temp[terms['fee_plan']]['fee_standard_mapping_item_selling_price_fee_standard_mapping'] = terms['fee_standard_mapping_item_selling_price_fee_standard_mapping']
        if 'additional_charge_data' in terms:
            temp[terms['fee_plan']]['additional_charge_data'] = terms['additional_charge_data']
        fee_plan_list.update(temp)
    if 'mode_of_payment' in data and data['mode_of_payment'] and ('mode_of_payment_list' not in data or ('mode_of_payment_list' in data and not data['mode_of_payment_list'])): #to support old functionality
        total_adjustment = 0
        if 'fee_group_adjustment' in data and data['fee_group_adjustment']:
            for adjustment_row in data['fee_group_adjustment']:
                total_adjustment += adjustment_row['amount']
        data['mode_of_payment_list'] = []
        data['mode_of_payment_list'].append({
            'mode_of_payment': data['mode_of_payment'] if 'mode_of_payemnt' in data else None,
            'payment_ref_num': data['payment_ref_num'] if 'payment_ref_num' in data else None,
            'note': data['payment_note'] if 'payment_note' in data else None,
            'amount': payment_total_amount - total_adjustment,
            'loan_from_bank':data['loan_from_bank'] if 'loan_from_bank' in data else None,
            'loan_to_bank':data['loan_to_bank'] if 'loan_to_bank' in data else None,
            'loan_utr_number':data['loan_utr_number'] if 'loan_utr_number' in data else None,
            'loan_credited_date':data['loan_credited_date'] if 'loan_credited_date' in data else None,
            'bank_detail_id':data['bank_detail_id'] if 'bank_detail_id' in data else None,

        })
    if 'mode_of_payment_list' in data and data['mode_of_payment_list']: #temp just to make sure old functionality works
        data['mode_of_payment'] = data['mode_of_payment_list'][0]['mode_of_payment']
        data['payment_ref_num'] = data['mode_of_payment_list'][0]['payment_ref_num']
    feeTerm = FeePlan.objects.filter(id__in=fee_plan_list.keys())
    fee_category_plan_data = FeeCategoryFeeStandardSectionMapping.objects.filter(fee_plan__in=fee_plan_list.keys())
    fee_category_dict={}
    fee_plan_section_mapping_check=[]
    if enrolment_obj:
        fee_category_data = fee_category_plan_data.filter(standard_section_id=enrolment_obj.standard_section).values('standard_section_id','fee_plan_id','fee_category_id')
        for category in fee_category_data:
            if category['fee_plan_id'] not in fee_category_dict:
                fee_category_dict[category['fee_plan_id']] = {'fee_plan_id':category['fee_plan_id'],'fee_category_id':category['fee_category_id']}
    elif fee_category_plan_data:
        raise exceptions.ValidationError('Student is not Enrolled')
    if feeTerm.filter(standard_fee__fee_type__codename=TRANSPORT_CODENAME):
        return_value = False
    standard = feeTerm.first().standard_fee.standard.pk
    check_is_adjustment_in_pending(self, [data['student']], academic_year)
    standard_name = feeTerm.first().standard_fee.standard.name
    fee_data = calculations.fee_calculation(self, data['student'], academic_year, standard, return_value, termDivision=True)
    data['pending_amount'] = fee_data['total_pending_amount'] - payment_total_amount
    data['standard_fee'] = list()
    admission_data = AdmissionForm.objects.filter(academic_year=academic_year,student=data['student'])
    standard_fee_fine_mapping = {}
    automatic_concession_type_name = ''
    is_fee_group_adjustment_exists = False
    fee_group_total_amount = {}
    if 'fee_group_adjustment' in data and data['fee_group_adjustment']:
        is_fee_group_adjustment_exists = True
    if is_fee_group_adjustment_exists and self.request.user and not self.request.user.student and is_apply_automatic_concession:
        validate_apply_automatic_concession(
            self, fee_data['total_amount'], payment_total_amount, apply_automatic_concession_total_amount,
            data['automatic_concession_apply']['concession_type']
        )
        fee_data['data'], automatic_concession = apply_automatic_concession_to_fee_plan(fee_data['data'])
        if not automatic_concession:
            raise exceptions.ValidationError('Applied Concession')
        if not(data['automatic_concession_apply']['concession_type'] == automatic_concession['id']):
            raise exceptions.ValidationError('Applied Concession type and configured concession type not matching')
        automatic_concession_type_name = ConcessionType.objects.get(id=data['automatic_concession_apply']['concession_type']).name
    if is_fee_group_adjustment_exists and self.request.user and not self.request.user.student:
        for fee_group in data['fee_group_adjustment']: #for some bad reason we are using the same key for group and not group
            if 'fee_group' in fee_group:
                if fee_group['fee_group'] not in fee_group_total_amount:
                    fee_group_total_amount[fee_group['fee_group']] = 0
                fee_group_total_amount[fee_group['fee_group']] += fee_group['amount']
        total_applying_adjstment, fee_data['data'], adjustment_data_to_save, fee_plan_list = apply_adjustment_in_fee_collection(data['fee_group_adjustment'], fee_data['data'], fee_plan_list)
        payment_total_amount = payment_total_amount - total_applying_adjstment
        if not fee_plan_list:
            raise exceptions.ValidationError('Trying to apply discount more than paid amount')
    elif is_apply_automatic_concession: #both concession adjustment cant apply in same page. Concession front end updates everything
        validate_apply_automatic_concession(
            self, fee_data['total_amount'], payment_total_amount, apply_automatic_concession_total_amount,
            data['automatic_concession_apply']['concession_type']
        )
        fee_data['data'], automatic_concession = apply_automatic_concession_to_fee_plan(fee_data['data'])
        if not automatic_concession:
            raise exceptions.ValidationError('Applied Concession')
        if not(data['automatic_concession_apply']['concession_type'] == automatic_concession['id']):
            raise exceptions.ValidationError('Applied Concession type and configured concession type not matching')
        automatic_concession_type_name = ConcessionType.objects.get(id=data['automatic_concession_apply']['concession_type']).name
    if not is_validate_only:
        validate_mode_of_payment_data(data['mode_of_payment_list'], payment_total_amount) #validating here because payment_total_amount will be calculated here
    apply_automatic_concession = {} #if automatic concession is applied then first we have to apply the concession for it
    fee_type_duplicate_track = {} #used for fee type wise incremental
    data['store_data_to_update'] = []
    is_enable_manual_receipt_num = False
    item_selling_price_fee_standard_mapping = {}
    for fee in fee_data['data']:
        if 'fee_standard_mapping_item_selling_price_fee_standard_mapping' in fee and fee['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
            for fee_store in fee['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
                item_selling_price_fee_standard_mapping[fee_store['student_store_mapping_id']] = fee_store
        for terms in fee['standard_fee']:
            if terms['id'] in fee_plan_list:
                given_fee_plan_data = fee_plan_list[terms['id']]
                data['total_amount'] += given_fee_plan_data['amount_paid']
                if 'fee_standard_mapping_item_selling_price_fee_standard_mapping' in given_fee_plan_data and given_fee_plan_data['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
                    data['store_data_to_update']+=validate_store_data(given_fee_plan_data, item_selling_price_fee_standard_mapping)
                if is_apply_automatic_concession:
                    if 'apply_automatic_concession_amount' in given_fee_plan_data and given_fee_plan_data['apply_automatic_concession_amount']: #checking whether the applied concession from the ui and the backend
                        if 'automatic_concession_data' not in terms or 'concession_fee_plan_mapping' not in terms['automatic_concession_data'] or 'concession_amount' not in terms['automatic_concession_data']['concession_fee_plan_mapping']:
                            raise exceptions.ValidationError(f'Automatic concession not enabled for the fee type {fee["fee_type_name"]} - {terms["terms"]}')
                        if terms['automatic_concession_data']['concession_fee_plan_mapping']['concession_amount'] < given_fee_plan_data['apply_automatic_concession_amount']:
                            raise exceptions.ValidationError('Applied concession amount is greater than the configured concession amount')
                    if not apply_automatic_concession:
                        apply_automatic_concession = {
                            'academic_year': academic_year,
                            'concession_on_type': 'feetype',
                            'concession_type': automatic_concession['id'],
                            'concession_types': [],
                            'standard': fee['standard'],
                            'student': data['student']
                        }
                    if 'apply_automatic_concession_amount' in given_fee_plan_data:
                        apply_automatic_concession['concession_types'].append(
                            {
                                'amount': given_fee_plan_data['apply_automatic_concession_amount'],
                                'fee_plan': terms['id'],
                                'reason': automatic_concession_type_name
                            }
                        )
                standard_fee_fine_mapping[terms['id']] = {
                    'pending_fine_amount': terms['pending_fine_amount'],
                    'total_fine_days_paid': terms['total_fine_no_of_days_late'] - terms['total_fine_days_paid']
                }
                if terms['is_disabled']:
                    raise exceptions.ValidationError(f'{fee["fee_type_name"]} {terms["terms"]} feature is not enabled.')
                if terms['pending_amount'] <= 0:
                    raise exceptions.ValidationError(f'{fee["fee_type_name"]} {terms["terms"]} amount is already paid.')
                amount_paid = given_fee_plan_data['amount_paid']
                pending_amount = given_fee_plan_data['pending_amount']
                applied_automatic_concession = 0
                if is_apply_automatic_concession and 'apply_automatic_concession_amount' in given_fee_plan_data and given_fee_plan_data['apply_automatic_concession_amount']:
                    data['pending_amount'] -= given_fee_plan_data['apply_automatic_concession_amount']
                    applied_automatic_concession = given_fee_plan_data['apply_automatic_concession_amount']
                if 0 >= float(amount_paid) or float(amount_paid) > terms['pending_amount']:
                    raise exceptions.ValidationError(
                        f'Please enter a valid amount for {fee["fee_type_name"]} {terms["terms"]}')
                if float(amount_paid) + float(pending_amount) + float(applied_automatic_concession) != terms['pending_amount']:
                    raise exceptions.ValidationError(
                        f'Amount(s) are mismatching for {fee["fee_type_name"]} {terms["terms"]}')
                standard_fee_data = {'fee_plan': terms['id'], 'amount_paid': amount_paid, 'receipt_num': None}
                if enable_manual_receipt_num and 'receipt_num' in data and data['receipt_num']:
                    is_enable_manual_receipt_num = True
                if FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'fee_receipt_fee_type_group') or temp_form_defintion['counter_confgiruation']['counter_type']['default_value'] == 'FEE_RECEIPT_FEE_TYPE_GROUP': #to support old functionality fee_receipt_fee_type_group 
                    fee_plan_obj = FeePlan.objects.get(id=terms['id'])
                    fee_type_id = fee_plan_obj.standard_fee.fee_type.id
                    fee_type_code = fee_plan_obj.standard_fee.fee_type.codename
                    type_name = None
                    if enable_manual_receipt_num and 'receipt_num' in data and data['receipt_num']:
                        standard_fee_data['receipt_num'] = data['receipt_num']
                    else:
                        receipt_counter_t, receipt_prefix_t, receipt_postfix_t = get_fee_receipt_counter_fee_type(
                            self, academic_year, fee_type_id, data['mode_of_payment_list'][0]['mode_of_payment']
                        )
                        standard_fee_data['receipt_num'] = f'{receipt_prefix_t}{receipt_counter_t.value}{receipt_postfix_t}'
                        if fee_type_id not in fee_type_duplicate_track:
                            standard_fee_data['receipt_counter_t'] = receipt_counter_t #used to increment while saving
                            fee_type_duplicate_track[fee_type_id] = 1
                elif FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'fee_receipt_fee_type') or temp_form_defintion['counter_confgiruation']['counter_type']['default_value'] == 'FEE_RECEIPT_FEE_TYPE':
                    fee_plan_obj = FeePlan.objects.get(id=terms['id'])
                    fee_type_id = fee_plan_obj.standard_fee.fee_type.id
                    fee_type_code = fee_plan_obj.standard_fee.fee_type.codename
                    type_name = None
                    if fee_type_code == 'df_and_others_gurukula':
                        if student_standard_mapping_obj.is_new_student:
                            type_name = 'fee_receipt_fee_typeN'
                        else:
                            type_name = 'fee_receipt_fee_typeO'
                    if enable_manual_receipt_num and 'receipt_num' in data and data['receipt_num']:
                        standard_fee_data['receipt_num'] = data['receipt_num']
                    else:
                        if type_name:
                            receipt_counter_t, receipt_prefix_t, receipt_postfix_t = CounterService.get_countered_value(self, 'FEE_RECEIPT_FEE_TYPE', None, fee_type_id, academic_year=academic_year, type_name=type_name)
                            standard_fee_data['receipt_num'] = f'{receipt_prefix_t}{receipt_counter_t.value}{receipt_postfix_t}'
                        else:
                            receipt_counter_t, receipt_prefix_t, receipt_postfix_t = get_fee_receipt_counter_fee_type(self, academic_year, fee_type_id, data['mode_of_payment_list'][0]['mode_of_payment'])
                            standard_fee_data['receipt_num'] = f'{receipt_prefix_t}{receipt_counter_t.value}{receipt_postfix_t}'
                        if fee_type_id not in fee_type_duplicate_track:
                            standard_fee_data['receipt_counter_t'] = receipt_counter_t #used to increment while saving
                            fee_type_duplicate_track[fee_type_id] = 1
                elif temp_form_defintion['counter_confgiruation']['counter_type']['default_value'] == 'STANDARD_SECTION_WISE':
                    fee_plan_obj = FeePlan.objects.get(id=terms['id'])
                    fee_type_id = fee_plan_obj.standard_fee.fee_type.id
                    standard_section = Enrollment.get_student_standard_for_academic(self, academic_year, student_obj.id, True)
                    if not standard_section:
                        raise exceptions.ValidationError('Student Enrollment to section is mandatory')
                    receipt_counter_t, receipt_prefix_t, receipt_postfix_t = get_fee_receipt_counter_standard_section(self, standard_section['standard_section'], fee_type_id, academic_year)
                    if not receipt_counter_t:
                        raise exceptions.ValidationError('Counter is not set')
                    counter_value = '{0:04}'.format(int(receipt_counter_t.value))
                    standard_fee_data['receipt_counter_t'] = receipt_counter_t
                    standard_fee_data['receipt_num'] = f'{receipt_prefix_t}{counter_value}{receipt_postfix_t}'

                given_additional_charge = given_fee_plan_data['additional_charge_data'] if 'additional_charge_data' in given_fee_plan_data else []
                standard_fee_data['payment_additional_charge_data'] = []
                if 'fee_plan_additional_charge_mapping_fee_plan' in terms and terms['fee_plan_additional_charge_mapping_fee_plan']:
                    #This function also validate whether the user given the fees. Handle carefully
                    additoinal_charge_calcualted = calculate_additional_charge(
                        self, terms['fee_plan_additional_charge_mapping_fee_plan'], \
                        given_additional_charge,
                        {
                            'amount_paid': given_fee_plan_data['amount_paid'],
                            'mode_of_payment': data['mode_of_payment_list'][0]['mode_of_payment']
                        }
                    )
                    standard_fee_data['payment_additional_charge_data'] = additoinal_charge_calcualted['payment_additional_charge_data']
                    data['total_amount'] += additoinal_charge_calcualted['total_amount']
                data['standard_fee'].append(standard_fee_data)
                if not admission_data:
                    admission = True
                if admission and terms['payment_detail']:
                    admission = False
    data['user'] = self.request.user.pk if self.request.user else None
    total_amount_payble = 0
    for terms in data['standard_fee']:
            pending_fine_amount = standard_fee_fine_mapping[terms['fee_plan']]['pending_fine_amount']
            total_fine_days_paid = standard_fee_fine_mapping[terms['fee_plan']]['total_fine_days_paid']
            total_amount_payble += float(terms['amount_paid'])
            if 'payment_additional_charge_data' in terms and terms['payment_additional_charge_data']:
                for additional_charge in terms['payment_additional_charge_data']:
                    total_amount_payble += float(additional_charge['amount'])
            if float(amount_paid) < pending_fine_amount:
                raise exceptions.ValidationError('Before Paying Term Amount Should pay fine amount. Payable amount should be greater than fine amount')
    existing_online_payment_data = OnlinePayment.objects.filter(
        payment_status__in=PENDING_PAYMENT_STATUSES,user=student_obj.user_student.id)
    max_time_to_expire_order_id = FormdefinitionService.get_formdefintion_data(self, 'payment_confgiruation', 'max_time_to_expire_order_id')
    if existing_online_payment_data:
        for online_payment in existing_online_payment_data:
            if online_payment.created+timedelta(minutes=max_time_to_expire_order_id) >= datetime.now():
                raise exceptions.ValidationError('Other transaction in pending try after sometime')
    if is_validate_only:
        return {'total_amount_payble': round(total_amount_payble, 2)}
    else:
        with transaction.atomic(using=get_current_db_name()):
            if is_enable_manual_receipt_num and 'receipt_num' in data and data['receipt_num']:
                data['receipt_num'] = data['receipt_num']
                if 'receipt_date' in data and data['receipt_date']:
                    data['transaction_date'] = data['receipt_date']
            else:
                receipt_counter, receipt_prefix, receipt_postfix = get_fee_receipt_counter(self,academic_year, standard)
                data['receipt_num'] = f'{receipt_prefix}{receipt_counter.value}{receipt_postfix}'
            serializer = FeeCollectionSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            fee = serializer.save()
            for mode_of_payment in data['mode_of_payment_list']:
                mode_of_payment['fee_collection'] = fee.id
            if 'transaction_date' in data and data['transaction_date']:
                deposit_date = data['transaction_date']
            else:
                deposit_date = datetime.now().date()
            add_mode_of_payment_data(self,data['mode_of_payment_list'],deposit_date,fee)
            if apply_automatic_concession:
                add_concession_fee(self, apply_automatic_concession,fee.id)
            if adjustment_data_to_save:
                add_fee_plan_adjustment(self, {
                    'adjustment': adjustment_data_to_save, 'student': data['student'],
                    'academic_year': data['academic_year'], 'standard': standard
                }, fee_data, fee.id)
            payment_data_to_save = []
            additional_charge_index_data = {}
            for idx, terms in enumerate(data['standard_fee']):
                pending_fine_amount = standard_fee_fine_mapping[terms['fee_plan']]['pending_fine_amount']
                total_fine_days_paid = standard_fee_fine_mapping[terms['fee_plan']]['total_fine_days_paid']
                if float( terms['amount_paid']) < pending_fine_amount:
                    raise exceptions.ValidationError('Before Paying Term Amount Should pay fine amount. Payable amount should be greater than fine amount')
                fee_fine_amount = pending_fine_amount
                receipt_num = terms['receipt_num'] if 'receipt_num' in terms else None
                if 'receipt_counter_t' in terms and receipt_num and not is_enable_manual_receipt_num:
                    CounterService.increment_counter(self, terms['receipt_counter_t'])
                payment_data_to_save.append({
                    'fee_collection': fee.id, 'fee_plan': terms['fee_plan'], 'fee_fine_amount' : fee_fine_amount,
                    'amount_paid': terms['amount_paid'],
                    'total_fine_days_paid': total_fine_days_paid, 'receipt_num': receipt_num
                })
                if terms['fee_plan'] in fee_category_dict:
                    payment_data_to_save[idx]['category']=fee_category_dict[terms['fee_plan']]['fee_category_id']
                if 'payment_additional_charge_data' in terms and terms['payment_additional_charge_data']:
                    additional_charge_index_data[idx] = terms['payment_additional_charge_data']
            payment_serializer = PaymentDetailSerializer(data=payment_data_to_save, many=True, allow_empty=False)
            payment_serializer.is_valid(raise_exception=True)
            student = Student.objects.get(id=data['student'])
            payment_detail_saved_datas = payment_serializer.save()
            # sync_fee_advance_payment_details_for_fee_collection(
            #     fee,
            #     data.get('academic_year'),
            #     data.get('student'),
            #     data.get('standard_fee') or [],
            #     payment_detail_saved_datas,
            # )
            additional_charge_data_to_save = []
            for add_index in additional_charge_index_data:
                for row_additonal_charge in additional_charge_index_data[add_index]:
                    additional_charge_data_to_save.append(
                        {
                            'payment_detail': payment_detail_saved_datas[add_index].id,
                            'additional_charge': row_additonal_charge['additional_charge'],
                            'amount': row_additonal_charge['amount']
                        }
                    )
            if additional_charge_data_to_save:
                add_additional_charge_payment_data(self, additional_charge_data_to_save)
            if not is_enable_manual_receipt_num:
                CounterService.increment_counter(self, receipt_counter)
            if data['store_data_to_update']:
                temp = {'stock_details': data['store_data_to_update']}
                add_item_sold(self, temp, fee)
            self.kwargs['pk'] = fee.id

        if not dont_send_notification:
            SharedService.custom_thread(add_fee_collection_notification, self, student, payment_total_amount, fee,academic_year,standard_name)
        
        # Dashboard cache is now updated automatically via signals (apps.finance.signals)
        
        return {'Reason': 'Data added Successfully!', 'data': serializer.data}

def add_fee_collection_notification(self, student, payment_total_amount, fee_obj,academic_year,standard_name):
    is_email_enabled = NotificationApiConfiguration.objects.filter(api_name='feecollection_create', notification_medium='email', enable_for_school=True).exists()
    if is_email_enabled:
        filename = get_fee_receipt(self, 'fee_collection', True, fee_obj)
        url = UploadTypeService.upload_local_file(filename, path='FeeReceipt')
    user = User.objects.get(student=student).pk
    notification_obj = NotificationBodyTemplate('feecollection_create')
    aca_obj = AcademicYear.objects.get(id=academic_year)
    institute_obj = Institute.get_institute(self)
    temp = {
        'student_name': student.first_name.capitalize(),
        'payment_total_amount': f'{payment_total_amount:,}',
        'standard_name':standard_name,
        'start_date':aca_obj.start_date.year,
        'end_date':aca_obj.end_date.year,
        'school_name':institute_obj.name,
        'student_obj':student
    }
    body_sms = notification_obj.select_template('sms', temp)
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    whatsapp_details = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp', temp)
    body_sms_for_other_user = notification_obj.select_template_for_other_user('sms',temp)
    body_email_for_other_user = notification_obj.select_template_for_other_user('email',temp)
    body_push_for_other_user = notification_obj.select_template_for_other_user('push',temp)
    # body_whatsapp_for_other_user = notification_obj.select_template_for_other_user('whatsapp',temp)

    customized_data = []
    if student.mobile_num:
        customized_data.append(
            {
                'mobile_number': student.mobile_num, 'sms_body': body_sms,'sms_notification': 1, 'user_id': user,
                'sms_body_for_others':body_sms_for_other_user
            }
        )
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': student.user_student.id, 'whatsapp_body': whatsapp_details['whatsapp_template'], 'whatsapp_notification': 1,
             'whatsapp_template_id':whatsapp_details['whatsapp_template_id'],'whatsapp_field_value':whatsapp_details['field_values'],'whatsapp_contact_details':whatsapp_details['contact']}
        )
    customized_data.append({
            'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user, 'extra_params': {'heading': 'Fee(s) Paid'},
            'push_body_for_others':body_push_for_other_user
    })
    if is_email_enabled and student.email:
        customized_data.append(
            {   'email': student.email, 'email_subject': None, 'user_id': user, 'email_body': body_email, 'email_notification' : 1,
                'attachmentLinks':[{'url': url, 'file_name': filename.split('.')[0]}], 'email_body_for_others':body_email_for_other_user
            }
        )
    if customized_data:
        send_notification('feecollection_create', customizedData=customized_data)


def get_fee_collection(self):
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    queryset = self.filter_queryset(self.get_queryset())
    if fromDate and toDate:
        queryset = queryset.filter(transaction_date__range=(fromDate, toDate))
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


def get_fee_list_for_student(self, student_ids):
    academic_year_data = get_students_standards_list(self, student_ids)
    for student_id in academic_year_data:
        student_academic_list = academic_year_data[student_id]
        for idx1, student_row in enumerate(student_academic_list):
            try:
                paid_data = calculations.paid_data_and_status(self, student_id, student_row['academic_year'], student_row['standard'])
                academic_year_data[student_id][idx1].update(
                    {'is_paid_full_fee': paid_data['is_paid'], 'total_amount': paid_data['total_amount'],
                    'total_payable': paid_data['total_payable'],
                    'paid_amount': paid_data['paid_amount'], 'pending_amount': paid_data['pending_amount'],
                    'concession_amount': paid_data['concession_amount'], 'reason': paid_data['reason'],
                    'amount': paid_data['amount'],
                    'paid_amount_excluding_concession_and_adjustment': paid_data['paid_amount_excluding_concession_and_adjustment'],
                    'total_fine_amount': paid_data['total_fine_amount']})
            except Exception as e:
                academic_year_data[student_id][idx1].update(
                    {'error': 'Fee Not Planned Yet'}
                )
    return academic_year_data

def get_fee_approved_status_students_list_data(self):
    academic_year = self.request.GET.get('academic_year')
    standard = int(self.request.GET.get('standard')) if self.request.GET.get('standard') else None
    standard_section_ids = [int(student) for student in self.request.GET.get('standard_section_ids').split(',')] if self.request.GET.get('standard_section_ids') else None
    standard_list = []
    student_type = self.request.GET.get('student_type')
    standard_queryset = None
    student_filter = {
            'is_active': True, 'standard_student__academic_year':academic_year
    }
    student_exclude = {}
    if standard:
        student_filter['standard_student__standard'] = standard
    if standard_section_ids:
        filterd_student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student', flat=True)
        student_filter['id__in'] = filterd_student_ids
    if student_type:
        student_filter['student_type__startswith'] = student_type
    if standard:
        queryset = calculations.get_fees(academic_year, [standard])
        standard_queryset = queryset.values_list('standard', flat=True).distinct()
    else:
        temp_queryset = get_standard_for_current_year(self, {}, True)
        standard_list = temp_queryset.values_list('id', flat=True)
        standard_queryset = calculations.get_fees(academic_year, standard_list)
        standard_queryset = standard_queryset.values_list('standard', flat=True).distinct()
    if self.request.GET.get('payment_end_date'):
        payment_end_date = queryset.filter(
            standard_fee__payment_end_date__lte=self.request.GET.get('payment_end_date')).values_list(
            'standard_fee__id', flat=True)
        student_exclude['fee_collection__payment_detail__fee_plan__in'] =payment_end_date
    ordering = self.request.GET.get('ordering', 'first_name')
    if ordering == 'name' or ordering == 'full_name': #nikhil temp fix change after ui changes
        ordering = 'first_name'
    elif ordering == '-name' or ordering == '-full_name':
        ordering = '-first_name'
    student_queryset = self.filter_queryset(self.get_queryset()).filter(**student_filter).exclude(**student_exclude).order_by(ordering)
    student_serializer = StudentListSerializer(student_queryset, many=True)
    if self.request.GET.get('limit') and self.request.GET.get('pageno'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    else:
        data = student_serializer.data
    student_ids = []
    for student in data:
        if 'student_group_name' not in student:
            student['student_group_name'] = None
        student_ids.append(student['id'])
    student_standard_mapping = get_student_current_standard(student_ids)
    student_admission_num_mapping = get_student_admission_form(self, student_ids)
    student_section_mapping = get_student_current_standard_section_name(student_ids) #not using standard from this because not to affect existing flow
    for student in data:
        student['admission_num'] = ''
        student['section_name'] = ''
        kwargs = {}
        if self.request.GET.get('fee_types'):
            kwargs['return_fee_data'] = True
        if standard:
            paid_data = calculations.paid_data_and_status(self, student['id'], academic_year, standard, **kwargs)
        elif student['id'] in student_standard_mapping:
            standard = student_standard_mapping[student['id']]['standard']
            paid_data = calculations.paid_data_and_status(self, student['id'], academic_year, student_standard_mapping[student['id']]['standard'], **kwargs)
        else:
            standard = None
            paid_data = []
        if student['id'] in student_admission_num_mapping:
            student['admission_num'] = student_admission_num_mapping[student['id']]
        if student['id'] in student_section_mapping:
            student['section_name'] = student_section_mapping[student['id']]['section_name']
        temp = {'is_paid_full_fee': paid_data['is_paid'], 'total_amount': paid_data['total_amount'],
                'paid_amount': paid_data['paid_amount'], 'pending_amount': paid_data['pending_amount'],
                'concession_amount': paid_data['concession_amount'], 'reason': paid_data['reason'],
                'amount': paid_data['amount'], 'adjustment_parent_ids': paid_data['adjustment_parent_ids'],
                'adjustment_unapproved_parent_ids': paid_data['adjustment_unapproved_parent_ids'],
                'paid_amount_excluding_concession_and_adjustment': paid_data['paid_amount_excluding_concession_and_adjustment'],
                'total_fine_amount': paid_data['total_fine_amount'], 'fee_collection_standard': standard,
                'adjustment_in_pending_block_fee_collection': paid_data['adjustment_in_pending_block_fee_collection'],
                'adjustment_in_pending_block_fee_collection_error': paid_data['adjustment_in_pending_block_fee_collection_error'],
                'is_has_approval_permission_on_adj': paid_data['is_has_approval_permission_on_adj'],
                'total_adjusted_amount': paid_data['total_adjusted_amount']
            }
        if self.request.GET.get('fee_types'):
            temp['data'] = []
            for row_data in paid_data['data']:
                if str(row_data['fee_type']) in self.request.GET.get('fee_types').split(','):
                     temp['data'].append(row_data)
        student.update(
            temp
        )
    if self.request.GET.get('download_excel'):
        response = download_fee_collection_student_list(self,data)
        return response
    return {
        'data': {'approved_std_id': standard_queryset, 'count': count, 'next': next_page,
                 'previous': previous_page, 'student_list': data}}

def download_fee_collection_student_list(self, data):
    multiple_data = []
    options={}
    options['title'] = 'Fee Collection Report'
    options['description'] = 'Fee Collection Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Parent Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Admission Number', 'required': False, 'schemacolumn': 'admission_num'
        }
        ,{
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },{
            'column': 'Amount Paid', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Discount', 'required': False, 'schemacolumn': 'concession_amount'
        },
        {
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        },
    ]
    total_column_data = { 
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'concession_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Total'}
    }
    total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0
        }
    sl_no=0
    for student in data:
        sl_no += 1
        student['sl_no'] = sl_no
        for total_column in total_column_data_local:
            total_column_data_local[total_column] += student[total_column]
            total_column_data[total_column]['value'] += student[total_column]
    options['Data'] = data
    if len(data) > 1:
        total_column_data_local['sl_no'] = 'Total'
    return write_to_excel_new(self, options, {}, total_column_data)

def download_fee_collection_report_standard_wise(self, data):
    options={}
    options['title'] = 'Standard Wise'
    options['description'] = 'Fee Collection Report'
    options['extraWorksheet'] = False
    options['Data'] = data.values()
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Total Students', 'required': False, 'schemacolumn': 'total_students'
        },
        {
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },{
            'column': 'Paid Amount', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Concession Amount', 'required': False, 'schemacolumn': 'concession_amount'
        },{
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        }
    ]
    total_column_data = {
        'total_students':{'value': 0, 'is_auto_calculate': True},
        'paid_amount':{'value': 0, 'is_auto_calculate': True},
        'pending_amount': {'value': 0, 'is_auto_calculate': True},
        'total_amount': {'value': 0, 'is_auto_calculate': True},
        'concession_amount': {'value': 0, 'is_auto_calculate': True},
        'sl_no': {'value': 'Total'}
    }
    institute = Institute.get_institute(self)
    if institute.code == 'cordialhighschool':
        options['columns'].append({
            'column': 'One Time Payment', 'required': False, 'schemacolumn': 'one_time_payment_concession'
        },
        {
            'column': 'Staff Concession', 'required': False, 'schemacolumn': 'staff_concession'
        },
        {
            'column': 'Other Concession', 'required': False, 'schemacolumn': 'other_concession'
        }
        )
    total_column_data['one_time_payment_concession'] = {'value': 0, 'is_auto_calculate': True}
    total_column_data['staff_concession'] = {'value': 0, 'is_auto_calculate': True}
    total_column_data['other_concession'] = {'value': 0, 'is_auto_calculate': True}
    return write_to_excel_new(self, options, {}, total_column_data)

def dashboard_pending_amount(self):
    term_wise_download = 1
    standard = get_standard_for_current_year(self)
    standard_ids = []
    for std in standard['data']:
        standard_ids.append(std['id'])
    standard_student_mapping = get_fee_collection_report(self,{'term_wise_download':term_wise_download,'standard_ids':standard_ids})
    total_column_data_local = {
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'concession_amount':  0,
        }
    for standard in standard_student_mapping:
        for student in standard_student_mapping[standard]['student_list']:
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
    result_data = {'fee_summary':{'total_amount':total_column_data_local['total_amount'],
                           'total_paid_amount':total_column_data_local['paid_amount'],
                           'total_pending_amount':total_column_data_local['pending_amount'],
                           'total_concession_amount':total_column_data_local['concession_amount']}}
    if self.request.GET.get('long_running_process'):
        transaction_id = self.request.GET.get('transaction_id')
        user_id = self.request.user.id
        store_long_running_process(self, transaction_id,result_data)

def download_transport_area_wise_pending_report(self, data, file_name, extra_columns=[]):
    """
    Generate detailed area-wise pending report for transport students grouped by area
    Format: Report Header -> Area Header -> Student Details Table -> Area Totals -> 2 empty rows -> Next Area
    """
    from apps.institutes.models.institute import Institute
    from apps.finance.models.feeCollection import FeeCollection, PaymentDetail
    from apps.finance.models.fee import FeePlan
    from datetime import datetime
    from decimal import Decimal
    
    # Get institute data
    institute_obj = Institute.get_institute(self)
    academic_year = self.request.GET.get('academic_year')
    from_date = self.request.GET.get('from_date', '')
    to_date = self.request.GET.get('to_date', '')
    report_period = f"{from_date} to {to_date}" if from_date and to_date else "All Periods"
    generated_on = datetime.now().strftime('%d-%b-%Y %H:%M:%S')
    
    options={}
    options['title'] = f'Area-Wise Student Pending Amount Report - {file_name}'
    options['description'] = f'Area-Wise Student Pending Amount Report - {file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    
    # Report columns
    options['columns'] = [
        {'column': 'Sl No', 'required': False, 'schemacolumn': 'sl_no'},
        {'column': 'Student Name', 'required': False, 'schemacolumn': 'student_name'},
        {'column': 'Admission No', 'required': False, 'schemacolumn': 'admission_num'},
        {'column': 'Class / Section', 'required': False, 'schemacolumn': 'class_section'},
        {'column': 'Total Fee (₹)', 'required': False, 'schemacolumn': 'total_fee'},
        {'column': 'Paid Amount (₹)', 'required': False, 'schemacolumn': 'paid_amount'},
        {'column': 'Pending Amount (₹)', 'required': False, 'schemacolumn': 'pending_amount'},
        {'column': 'Last Payment Date', 'required': False, 'schemacolumn': 'last_payment_date'},
        {'column': 'Contact No', 'required': False, 'schemacolumn': 'contact_no'},
    ]
    
    # Group students by area
    area_wise_students = {}
    student_ids = []
    
    # Import necessary models and services
    from apps.transport.models.route import RouteUserAddress
    from apps.finance.models.fee import FeeType
    from apps.finance.services import calculations
    from apps.students.models.student import Student
    from apps.classes.models.standard_student import StudentStandardMapping
    from apps.institutes.models.academicYear import AcademicYear
    
    # Get transport fee type
    transport_fee_type = FeeType.objects.filter(codename='transport', is_active=True).first()
    
    if not transport_fee_type:
        # No transport fee type configured
        pass
    else:
        # Get academic year object
        academic_year_obj = AcademicYear.objects.filter(id=academic_year).first()
        
        # First pass: collect all students and calculate their transport fees
        for standard in data:
            for student in data[standard]['student_list']:
                student_id = student.get('id') or student.get('student_id')
                if not student_id:
                    continue
                
                try:
                    # Get student's standard
                    standard_id = standard
                    if not standard_id:
                        continue
                    
                    # Calculate fee for this student to get transport fee details
                    fee_data = calculations.fee_calculation(
                        self, student_id, academic_year, standard_id, returnValue=True
                    )
                    
                    # Extract transport fee information
                    transport_fee_paid = Decimal('0')
                    transport_fee_pending = Decimal('0')
                    transport_fee_total = Decimal('0')
                    area_name = None
                    has_transport_fee = False
                    
                    if fee_data and isinstance(fee_data, dict) and 'data' in fee_data:
                        for fee_item in fee_data['data']:
                            if fee_item.get('codename') == 'transport':
                                has_transport_fee = True
                                transport_fee_total += Decimal(str(fee_item.get('total_amount', 0) or 0))
                                transport_fee_paid += Decimal(str(fee_item.get('total_paid_amount', 0) or 0))
                                transport_fee_pending += Decimal(str(fee_item.get('pending_amount', 0) or 0))
                                
                                # Get area name from fee calculation
                                if fee_item.get('areaname'):
                                    area_name = fee_item.get('areaname')
                    
                    # If area not found in fee calculation, try RouteUserAddress
                    if not area_name and academic_year_obj:
                        route_address = RouteUserAddress.objects.filter(
                            user__student_id=student_id,
                            academic_year=academic_year_obj,
                            is_active=True
                        ).select_related('area').first()
                        
                        if route_address and route_address.area:
                            area_name = route_address.area.name
                    
                    # Only include students with transport fees and pending amounts > 0
                    if has_transport_fee and transport_fee_pending > 0:
                        if not area_name:
                            area_name = 'Not Assigned'
                        
                        if area_name not in area_wise_students:
                            area_wise_students[area_name] = []
                        
                        student_ids.append(student_id)
                        
                        # Get section name if available
                        section_name = student.get('section_name', '')
                        if not section_name:
                            # Try to get from enrollment
                            from apps.students.models.enrollment import Enrollment
                            enrollment = Enrollment.objects.filter(
                                student_id=student_id,
                                standard_section__academic_year_id=academic_year,
                                standard_section__standard_id=standard_id
                            ).select_related('standard_section__section').first()
                            if enrollment and enrollment.standard_section and enrollment.standard_section.section:
                                section_name = enrollment.standard_section.section.name
                        
                        # Store student data
                        student_record = {
                            'student_id': student_id,
                            'name': student.get('name', ''),
                            'admission_num': student.get('admission_num', ''),
                            'standard_name': student.get('standard_name', ''),
                            'section_name': section_name,
                            'mobile_num': student.get('mobile_num', ''),
                            'total_fee': float(transport_fee_total),
                            'paid_amount': float(transport_fee_paid),
                            'pending_amount': float(transport_fee_pending),
                        }
                        area_wise_students[area_name].append(student_record)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Error processing student {student_id} for transport area report: {str(e)}")
                    continue
    
    # Get last payment dates for all students
    last_payment_dates = {}
    if student_ids:
        # Get last payment date for each student from transport fee collections
        from apps.finance.models.fee import FeeType
        transport_fee_type = FeeType.objects.filter(codename='transport', is_active=True).first()
        
        if transport_fee_type:
            transport_fee_plans = FeePlan.objects.filter(
                standard_fee__fee_type=transport_fee_type,
                is_active=True
            ).values_list('id', flat=True)
            
            if transport_fee_plans:
                from django.db.models import Max
                last_payments = PaymentDetail.objects.filter(
                    fee_collection__student_id__in=student_ids,
                    fee_collection__is_active=True,
                    fee_plan_id__in=transport_fee_plans
                ).values('fee_collection__student_id').annotate(
                    last_date=Max('fee_collection__transaction_date')
                )
                
                for payment in last_payments:
                    student_id = payment['fee_collection__student_id']
                    last_date = payment['last_date']
                    if last_date:
                        last_payment_dates[student_id] = last_date.strftime('%d-%b-%Y')
    
    # Build report data
    sl_no = 0
    grand_total_fee = 0
    grand_total_paid = 0
    grand_total_pending = 0
    grand_students_with_pending = 0
    
    # Add report header rows (will be formatted in Excel)
    header_row = {
        'sl_no': f'Institution Name: {institute_obj.name if institute_obj else ""}',
        'student_name': '',
        'admission_num': '',
        'class_section': '',
        'total_fee': '',
        'paid_amount': '',
        'pending_amount': '',
        'last_payment_date': '',
        'contact_no': '',
    }
    options['Data'].append(header_row)
    
    report_period_row = {
        'sl_no': f'Report Period: {report_period}',
        'student_name': '',
        'admission_num': '',
        'class_section': '',
        'total_fee': '',
        'paid_amount': '',
        'pending_amount': '',
        'last_payment_date': '',
        'contact_no': '',
    }
    options['Data'].append(report_period_row)
    
    generated_row = {
        'sl_no': f'Generated On: {generated_on}',
        'student_name': '',
        'admission_num': '',
        'class_section': '',
        'total_fee': '',
        'paid_amount': '',
        'pending_amount': '',
        'last_payment_date': '',
        'contact_no': '',
    }
    options['Data'].append(generated_row)
    
    # Empty row after header
    options['Data'].append({})
    
    # Process each area
    for area in sorted(area_wise_students.keys()):
        # Add area header
        area_header = {
            'sl_no': f'📌 Area: {area}',
            'student_name': '',
            'admission_num': '',
            'class_section': '',
            'total_fee': '',
            'paid_amount': '',
            'pending_amount': '',
            'last_payment_date': '',
            'contact_no': '',
        }
        options['Data'].append(area_header)
        
        # Add column headers for this area
        column_header = {
            'sl_no': 'Sl No',
            'student_name': 'Student Name',
            'admission_num': 'Admission No',
            'class_section': 'Class / Section',
            'total_fee': 'Total Fee (₹)',
            'paid_amount': 'Paid Amount (₹)',
            'pending_amount': 'Pending Amount (₹)',
            'last_payment_date': 'Last Payment Date',
            'contact_no': 'Contact No',
        }
        options['Data'].append(column_header)
        
        # Add students for this area
        area_total_fee = 0
        area_total_paid = 0
        area_total_pending = 0
        area_students_with_pending = 0
        area_sl_no = 0
        
        for student_record in area_wise_students[area]:
            area_sl_no += 1
            sl_no += 1
            
            student_id = student_record['student_id']
            last_payment_date = last_payment_dates.get(student_id, '')
            
            class_section = f"{student_record['standard_name']}"
            if student_record['section_name']:
                class_section += f" / {student_record['section_name']}"
            
            student_row = {
                'sl_no': area_sl_no,
                'student_name': student_record['name'],
                'admission_num': student_record['admission_num'],
                'class_section': class_section,
                'total_fee': student_record['total_fee'],
                'paid_amount': student_record['paid_amount'],
                'pending_amount': student_record['pending_amount'],
                'last_payment_date': last_payment_date,
                'contact_no': student_record['mobile_num'] or '',
            }
            options['Data'].append(student_row)
            
            # Calculate area totals
            area_total_fee += student_record['total_fee']
            area_total_paid += student_record['paid_amount']
            area_total_pending += student_record['pending_amount']
            if student_record['pending_amount'] > 0:
                area_students_with_pending += 1
        
        # Add area totals
        area_total_row = {
            'sl_no': f'Area Total Pending: ₹{area_total_pending:,.2f}',
            'student_name': f'Students with Pending: {area_students_with_pending}',
            'admission_num': '',
            'class_section': '',
            'total_fee': area_total_fee,
            'paid_amount': area_total_paid,
            'pending_amount': area_total_pending,
            'last_payment_date': '',
            'contact_no': '',
        }
        options['Data'].append(area_total_row)
        
        # Update grand totals
        grand_total_fee += area_total_fee
        grand_total_paid += area_total_paid
        grand_total_pending += area_total_pending
        grand_students_with_pending += area_students_with_pending
        
        # Add two empty rows
        options['Data'].append({})
        options['Data'].append({})
    
    # Add grand total row
    grand_total_row = {
        'sl_no': f'Grand Total Pending: ₹{grand_total_pending:,.2f}',
        'student_name': f'Total Students with Pending: {grand_students_with_pending}',
        'admission_num': '',
        'class_section': '',
        'total_fee': grand_total_fee,
        'paid_amount': grand_total_paid,
        'pending_amount': grand_total_pending,
        'last_payment_date': '',
        'contact_no': '',
    }
    options['Data'].append(grand_total_row)
    
    total_column_data = {
        'total_fee': {'value': grand_total_fee, 'is_auto_calculate': False},
        'paid_amount': {'value': grand_total_paid, 'is_auto_calculate': False},
        'pending_amount': {'value': grand_total_pending, 'is_auto_calculate': False},
    }
    
    for extra_column in extra_columns:
        options['columns'].append(
            {'column': extra_column, 'required': False, 'schemacolumn': extra_column}
        )
        total_column_data[extra_column] = {'value': 0, 'is_auto_calculate': True}
    
    return write_to_excel_new(self, options, {}, total_column_data)

def download_transport_report_area_wise(self, data, file_name, extra_columns=[]):
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Photo', 'required': False, 'schemacolumn': 'profile_pic'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Area Name', 'required': False, 'schemacolumn': 'area'
        },
        {
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },
        {
            'column': 'Payable Amount', 'required': False, 'schemacolumn': 'payable_amount'
        },
        {
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        },
        {
            'column': 'Student Group', 'required': False, 'schemacolumn': 'student_group_name'
        }
    ]
    total_column_data = { #keep total_column_data and total_column_data_local in sync for calculation
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'payable_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Total'},
    }
    sl_no = 0
    for standard in data:
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'payable_amount':0,
        }
        for student in data[standard]['student_list']:
            sl_no += 1
            student['sl_no'] = sl_no
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
                total_column_data[total_column]['value'] += student[total_column]
        options['Data'] += data[standard]['student_list']
        if len(data) > 1:
            total_column_data_local['sl_no'] = 'Total'
    for extra_column in extra_columns:
        options['columns'].append(
            {
                'column': extra_column, 'required': False, 'schemacolumn': extra_column
            }
        )
        total_column_data[extra_column] = {'value': 0, 'is_auto_calculate': True}
    return write_to_excel_new(self, options, {},total_column_data)

def download_fee_collection_report_student_wise(self, data, file_name, extra_columns=[]):
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Admission Number', 'required': False, 'schemacolumn': 'admission_num'
        },
        {
            'column': 'Sts Num', 'required': False, 'schemacolumn': 'sts'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
        },
        {
            'column': 'Student Group', 'required': False, 'schemacolumn': 'student_group_name'
        },
        {
            'column': 'Fee Type', 'required': False, 'schemacolumn': 'assigned_fee_types'
        },
        {
            'column': 'Student Type', 'required': False, 'schemacolumn': 'student_type_name'
        }
        ,{
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },{
            'column': 'Paid Amount', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Concession Amount', 'required': False, 'schemacolumn': 'concession_amount'
        },{
            'column': 'Concession Reasons', 'required': False, 'schemacolumn': 'concession_reason'
        },{
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        },
    ]
    if self.request.GET.get('from_date') and self.request.GET.get('to_date'):
        options['columns'].append({
            'column': 'Amount Collected Before From Date', 'required': False, 'schemacolumn': 'total_paid_before'
        })
    total_column_data = { #keep total_column_data and total_column_data_local in sync for calculation
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'concession_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Total'}
    }
    sl_no = 0
    for standard in data:
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'concession_amount':  0,
        }
        for student in data[standard]['student_list']:
            sl_no += 1
            student['sl_no'] = sl_no
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
                total_column_data[total_column]['value'] += student[total_column]
        options['Data'] += data[standard]['student_list']
        if len(data) > 1:
            total_column_data_local['sl_no'] = 'Total'
            options['Data'].append(total_column_data_local)
            options['Data'].append({})
    for extra_column in extra_columns:
        options['columns'].append(
            {
                'column': extra_column, 'required': False, 'schemacolumn': extra_column
            }
        )
        total_column_data[extra_column] = {'value': 0, 'is_auto_calculate': True}
        multiple_data.append(options)
    return write_to_excel_new(self, options, {}, total_column_data)

def download_fee_collection_report_student_wise_sadguru(self, data, file_name, extra_columns=[]):
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },{
            'column': 'Paid Amount', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Concession Amount', 'required': False, 'schemacolumn': 'concession_amount'
        },{
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        }
    ]
    total_column_data = { #keep total_column_data and total_column_data_local in sync for calculation
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'concession_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Total'}
    }
    sl_no = 0
    for standard in data:
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'concession_amount':  0,
        }
        for student in data[standard]['student_list']:
            sl_no += 1
            student['sl_no'] = sl_no
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
                total_column_data[total_column]['value'] += student[total_column]
        options['Data'] += data[standard]['student_list']
        if len(data) > 1:
            total_column_data_local['sl_no'] = 'Total'
            options['Data'].append(total_column_data_local)
            options['Data'].append({})
        multiple_data.append(options)
    return write_to_excel_new(self, options, {}, total_column_data)

def download_fee_collection_report_student_wise_svems(self, data, file_name, extra_columns=[]):
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        },{
            'column': 'Paid Amount', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Discount Amount', 'required': False, 'schemacolumn': 'concession_amount'
        },{
            'column': 'Discount Reasons', 'required': False, 'schemacolumn': 'concession_reason'
        },
        {
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        }
    ]
    total_column_data = { #keep total_column_data and total_column_data_local in sync for calculation
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'concession_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Total'}
    }
    sl_no = 0
    for standard in data:
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'concession_amount':  0,
        }
        for student in data[standard]['student_list']:
            sl_no += 1
            student['sl_no'] = sl_no
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
                total_column_data[total_column]['value'] += student[total_column]
        options['Data'] += data[standard]['student_list']
        if len(data) > 1:
            total_column_data_local['sl_no'] = 'Total'
            options['Data'].append(total_column_data_local)
            options['Data'].append({})
        multiple_data.append(options)
    return write_to_excel_new(self, options, {}, total_column_data)

def download_full_fee_collection_report(self, data, file_name, extra_columns=[]):
    options={}
    options['title'] = file_name
    options['description'] = 'Fee Collection Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },{
            'column': 'Total Amount', 'required': False, 'schemacolumn': 'amount'
        },{
            'column': 'Paid Amount', 'required': False, 'schemacolumn': 'paid_amount'
        },{
            'column': 'Pending Amount', 'required': False, 'schemacolumn': 'pending_amount'
        }
    ]
    if extra_columns:
        options['columns'] += extra_columns
    total_column_data = {
        'paid_amount':{'value': 0, 'is_auto_calculate': True},
        'pending_amount': {'value': 0, 'is_auto_calculate': True},
        'amount': {'value': 0, 'is_auto_calculate': True},
        'sl_no': {'value': 'Total'}
    }
    for column in extra_columns:
        total_column_data[column['schemacolumn']] = {'value': 0, 'is_auto_calculate': True}
    return write_to_excel_new(self, options, {}, total_column_data)

def download_fee_collection_report_fee_group_wise(self, data,file_name, extra_columns=[]):
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
        },
    ]
    total_column_data = { #keep total_column_data and total_column_data_local in sync for calculation
        'paid_amount':{'value': 0, 'is_auto_calculate': False},
        'pending_amount': {'value': 0, 'is_auto_calculate': False},
        'total_amount': {'value': 0, 'is_auto_calculate': False},
        'concession_amount': {'value': 0, 'is_auto_calculate': False},
        'sl_no': {'value': 'Final Total'}
    }
    for extra_column in extra_columns:
        if extra_column not in total_column_data:
            total_column_data[extra_column] = {'value': 0, 'is_auto_calculate': False}
    sl_no = 0
    total_column_data_local = {}
    for standard in data:
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
            'paid_amount': 0,
            'pending_amount':  0,
            'total_amount':  0,
            'concession_amount':  0,
        }
        for extra_column in extra_columns:
            total_column_data_local[extra_column] = 0
        for student in data[standard]['student_list']:
            sl_no += 1
            student['sl_no'] = sl_no
            for total_column in total_column_data_local:
                total_column_data_local[total_column] += student[total_column]
                total_column_data[total_column]['value'] += student[total_column]
        options['Data'] += data[standard]['student_list']
        if len(data) > 1:
            total_column_data_local['sl_no'] = 'Total'
            options['Data'].append(total_column_data_local)
            options['Data'].append({})
    for extra_column in extra_columns:
        options['columns'].append(
            {
                'column': extra_column, 'required': False, 'schemacolumn': extra_column
            }
        )
        multiple_data.append(options)
    return write_to_excel_new_fee_collection_group_wise(self, options, {},total_column_data,total_column_data_local )

def get_fee_collection_report(self,extra_params={}):
    try:
        academic_year = self.request.GET.get('academic_year')
        standard = self.request.GET.get('standard')
        if self.request.GET.get('term_wise_download'):
            term_wise_download = self.request.GET.get('term_wise_download')
        elif 'term_wise_download' in extra_params and extra_params['term_wise_download']:
            term_wise_download=extra_params['term_wise_download']
        else:
            term_wise_download=0
        transport_download = self.request.GET.get('transport_download')
        download_standard_report = self.request.GET.get('download_standard_report')
        fee_group_wise_download = self.request.GET.get('fee_group_wise_download')
        fee_group_ids = self.request.GET.get('fee_group_ids', [])
        fee_type_ids = self.request.GET.get('fee_type_ids', [])
        fee_category = self.request.GET.get('fee_category')
        is_last_transaction_required = self.request.GET.get('last_transaction_details')
        is_selected_feetypes_totalamount = self.request.GET.get('selected_feetypes_totalamount')
        only_selected_fee_type_term_paid = self.request.GET.get('only_selected_fee_type_term_paid')
        transport_area_wise_pending_report = self.request.GET.get('transport_area_wise_pending_report')
        from_paid_range = self.request.GET.get('from_paid_date_range', None)
        to_paid_range = self.request.GET.get('to_paid_date_range', None)
        from_date = self.request.GET.get('from_date')
        to_date = self.request.GET.get('to_date')
        if fee_group_ids:
            fee_group_ids = fee_group_ids.split(',')
        if fee_type_ids:
            fee_type_ids = fee_type_ids.split(',')
        fee_term_names = self.request.GET.get('fee_term_names', [])
        inst_obj = Institute.objects.all().first()
        extra_columns = []
        term_extra_columns = []
        if standard:
            standard_ids = [standard]
        elif 'standard_ids' in extra_params and extra_params['standard_ids']:
            standard_ids = extra_params['standard_ids']
        else:
            standard_ids = self.request.GET.get('standard_ids').split(',')
        students_section_data={}
        if self.request.GET.get('section_ids'):
            section_ids = self.request.GET.get('section_ids').split(',')
            enrollment_data = Enrollment.objects.filter(standard_section__standard__in=standard_ids,standard_section__section__in=section_ids,standard_section__academic_year=academic_year).values('standard_section__section__name','standard_section__section_id','standard_section__standard_id','student_id')
            for student in enrollment_data:
                if student['student_id'] not in students_section_data:
                    students_section_data[student['student_id']]={'student':student['student_id'],'section_name':student['standard_section__section__name']}
        download_excel = self.request.GET.get('download_excel')
        student_group = self.request.GET.get('student_group')
        if students_section_data:
            student_standard_data = StudentStandardMapping.objects.filter(
                academic_year=academic_year,
                student__in=students_section_data.keys()
            ).values('standard', 'academic_year', 'standard__name', 'student','is_new_student')
        else:
            student_standard_data = StudentStandardMapping.objects.filter(
                academic_year=academic_year,
                standard__in=standard_ids
            ).values('standard', 'academic_year', 'standard__name', 'student','is_new_student')
        student_standard_mapping = {}
        standard_student_mapping = {}
        for student_standard in student_standard_data:
            if student_standard['student'] not in student_standard_mapping:
                student_standard_mapping[student_standard['student']] = {}
            student_standard_mapping[student_standard['student']] = {
                'standard': student_standard['standard'],
                'standard_name': student_standard['standard__name']
            }
            if student_standard['is_new_student']:
                student_standard_mapping[student_standard['student']]['student_type_name'] = 'New Student'
            else:
                student_standard_mapping[student_standard['student']]['student_type_name'] = 'Old Student'
        student_filter = {
            'is_active': True, 'id__in': student_standard_mapping.keys()
        }
        if student_group:
            student_filter['student_group'] = student_group
        fee_category_plan_datas={}
        if fee_category:
            fee_category=int(fee_category)
            fee_category_standardsection_data=FeeCategoryFeeStandardSectionMapping.objects.filter(fee_plan__terms__in=fee_term_names.split(','),
                                                fee_plan__standard_fee__standard__in=standard_ids,standard_section__academic_year=academic_year).values()
            for category_data in fee_category_standardsection_data:
                if category_data['fee_category_id'] not in fee_category_standardsection_data:
                    fee_category_plan_datas[category_data['fee_category_id']]={'plan_list':[]}
                fee_category_plan_datas[category_data['fee_category_id']]['plan_list'].append(category_data['fee_plan_id'])
        student_queryset = self.filter_queryset(self.get_queryset()).filter(**student_filter)
        student_serializer = StudentListSerializer(student_queryset, many=True)
        student_admission_dict = get_student_admission_form(self, student_standard_mapping.keys())
        if not download_excel and not self.request.GET.get('dashboard'):
            data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer.data,
                                                                                    self.request.GET.get('limit'),
                                                                                    self.request.GET.get('pageno'))
            for student in data:
                fee_data = calculations.fee_calculation(
                    self, student['id'], academic_year, student_standard_mapping[student['id']]['standard'], returnValue=True,
                    extra_params={'from_paid_range': from_paid_range, 'to_paid_range': to_paid_range}
                )
                student.update(
                    {'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
                    'paid_amount': fee_data['total_paid_amount'], 'amount': fee_data['amount']})
                if standard not in standard_student_mapping:
                    standard_student_mapping[standard] = {'student_list': [], 'standard': standard,
                        'standard_name': student_standard_mapping[student['id']]['standard_name']}
                standard_student_mapping[standard]['student_list'].append(
                    student
                )
            return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
        else:
            data = student_serializer.data
            for index, student in enumerate(data):
                student['one_time_payment_concession'] = 0
                student['staff_concession'] = 0
                student['other_concession'] = 0 
                only_fee_type_assigned_students={}
                standard_obj = student_standard_mapping[student['id']]
                standard = standard_obj['standard']
                fee_data = calculations.fee_calculation(
                                                        self, student['id'], academic_year, standard, returnValue=True,
                                                        extra_params={'from_paid_range': from_paid_range, 'to_paid_range': to_paid_range}
                                                    )
                today = datetime.today().date()
                concession_reason = ''
                student['student_type_name'] = student_standard_mapping[student['id']]['student_type_name']
                student['admission_num'] = student_admission_dict[student['id']] if student['id'] in student_admission_dict else ''
                student['profile_pic'] = student['profile_pic_details']['file'] if student['profile_pic_details'] else None
                if term_wise_download:
                    term_wise_amount = {}
                    total_term_wise_amount = {'assigned_fee_types':''}
                    fee_type_wise_amount ={'total_amount':0,'paid_amount':0,'adjustment_amount':0,'pending_amount':0,'concession_amount':0}
                    selected_feetypes_totalamount = {'total_amount':0,'paid_amount':0,'adjustment_amount':0,'pending_amount':0,'concession_amount':0}
                    for row_data in fee_data['data']:
                        if not fee_type_ids or str(row_data['fee_type']) in fee_type_ids:
                            if 'reason' in row_data and row_data['reason']:
                                continue
                            total_term_wise_amount['assigned_fee_types']+=row_data['fee_type_name']
                            for standard_fee in row_data['standard_fee']:
                                if not fee_term_names or standard_fee['terms'] in fee_term_names.split(','):
                                    amount_paid=0
                                    pending_calc_amount_paid=0
                                    paid_before_from_date =0
                                    if from_date and to_date:
                                        if 'payment_detail' in standard_fee:
                                            for payment in standard_fee['payment_detail']:
                                                if payment['transaction_date'] >= datetime.strptime(from_date, "%Y-%m-%d").date() and payment['transaction_date'] <= datetime.strptime(to_date, "%Y-%m-%d").date():
                                                    amount_paid += payment['amount_paid']
                                                if payment['transaction_date'] <= datetime.strptime(to_date, "%Y-%m-%d").date():
                                                    pending_calc_amount_paid+=payment['amount_paid']
                                                if payment['transaction_date'] < datetime.strptime(from_date, "%Y-%m-%d").date():
                                                    paid_before_from_date+=payment['amount_paid']
                                    if standard_fee['is_disabled']:
                                        continue
                                    if fee_category and standard_fee['id'] not in fee_category_plan_datas[fee_category]['plan_list']:
                                        continue
                                    if is_last_transaction_required:
                                        last_transaction_data={}
                                        differences=0
                                        minimum=0
                                        if 'payment_detail' in standard_fee:
                                            for index,payment_details in enumerate(standard_fee['payment_detail']):
                                                differences = abs(today - payment_details['transaction_date'])
                                                if index==0:
                                                    minimum = differences
                                                    last_transaction_data = payment_details
                                                else:
                                                    if differences < minimum:
                                                        minimum = differences
                                                        last_transaction_data = payment_details
                                    fee_type_wise_amount['total_amount']+=standard_fee['total_amount']
                                    selected_feetypes_totalamount['total_amount']+=standard_fee['total_amount']
                                    selected_feetypes_totalamount['paid_amount']+=standard_fee['paid_amount']
                                    selected_feetypes_totalamount['adjustment_amount']+=standard_fee['adjustment_amount']
                                    selected_feetypes_totalamount['concession_amount']+=standard_fee['concession_amount']
                                    selected_feetypes_totalamount['pending_amount']+=standard_fee['pending_amount']
                                    term_name = standard_fee['term_alias'] if standard_fee['term_alias'] else standard_fee['terms']
                                    paid_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Amount Paid'
                                    pending_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Pending Amount'
                                    total_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Total Amount'
                                    last_transaction_key = row_data['fee_type_name'] + ' ' +'Last paid amount'
                                    last_transaction_date_key = row_data['fee_type_name']+ ' ' +'Last paid date'
                                    term_total = standard_fee['terms']+' '+'Total Amount'
                                    term_paid = standard_fee['terms']+' '+'Amount Paid'
                                    term_pending = standard_fee['terms']+' '+'Pending Amount'
                                    if paid_amount_key not in term_wise_amount:
                                        term_wise_amount[paid_amount_key] = 0
                                    if pending_amount_key not in term_wise_amount:
                                        term_wise_amount[pending_amount_key] = 0
                                    if total_amount_key not in term_wise_amount:
                                        term_wise_amount[total_amount_key] = 0
                                    if term_total not in total_term_wise_amount:
                                        total_term_wise_amount[term_total]=0
                                    if term_pending not in total_term_wise_amount:
                                        total_term_wise_amount[term_pending]=0
                                    if term_paid not in total_term_wise_amount:
                                        total_term_wise_amount[term_paid]=0
                                    term_wise_amount[paid_amount_key] += standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    term_wise_amount[pending_amount_key] += standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    term_wise_amount[total_amount_key] += standard_fee['amount'] if 'amount' in standard_fee else 0
                                    total_term_wise_amount[term_total] += standard_fee['amount'] if 'amount' in standard_fee else 0
                                    total_term_wise_amount[term_pending] += standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    total_term_wise_amount[term_paid] += standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    for adjustment in standard_fee['adjustment_list']:
                                        if not adjustment['is_addition']:
                                            concession_reason += str(int(adjustment['amount']))+'-'+adjustment['reason_id__name']+','
                                            if not adjustment['is_addition'] and adjustment['reason_id__name'] == 'ONE TIME PAYMENT':
                                                student['one_time_payment_concession'] += adjustment['amount']
                                            else:
                                                student['other_concession'] += adjustment['amount'] 
                                    for concession in standard_fee['concession_list']:
                                        if not concession['is_addition']:
                                            concession_reason += str(int(concession['amount']))+'-'+concession['concession__concession_type__name']+','
                                            if concession['concession__concession_type__name'] == 'One Time Paymets':
                                                student['one_time_payment_concession'] = concession['amount']
                                            elif concession['concession__concession_type__name'] == 'CORDIAL STAFF WARDS  DIS':
                                                student['staff_concession'] = concession['amount']
                                            else:
                                                student['other_concession'] = concession['amount']
                                    if is_last_transaction_required:
                                        term_wise_amount[last_transaction_key] = last_transaction_data['amount_paid'] if 'amount_paid' in last_transaction_data else 0
                                        term_wise_amount[last_transaction_date_key] = last_transaction_data['transaction_date'].strftime('%Y-%m-%d') if 'transaction_date' in last_transaction_data else ''
                            fee_type_wise_amount['paid_amount']+=row_data['total_paid_amount']
                            fee_type_wise_amount['adjustment_amount']+=row_data['adjustment_amount']
                            fee_type_wise_amount['concession_amount']+=row_data['concession_amount']
                            fee_type_wise_amount['pending_amount']+=row_data['pending_amount']
                        if is_selected_feetypes_totalamount or only_selected_fee_type_term_paid:
                            fee_data['total_amount'] = selected_feetypes_totalamount['total_amount']
                            fee_data['total_paid_amount'] = selected_feetypes_totalamount['paid_amount']
                            fee_data['total_adjusted_amount'] = selected_feetypes_totalamount['adjustment_amount']
                            fee_data['concession_amount']=selected_feetypes_totalamount['concession_amount']
                            fee_data['total_pending_amount'] = selected_feetypes_totalamount['pending_amount']
                        if from_date and to_date:
                            fee_data['total_paid_amount'] = amount_paid
                            fee_data['total_pending_amount'] = selected_feetypes_totalamount['total_amount']-pending_calc_amount_paid
                            fee_data['total_paid_before'] = paid_before_from_date
                    if only_selected_fee_type_term_paid:
                        term_extra_columns += total_term_wise_amount.keys()
                        only_fee_type_assigned_students.update(student)
                        only_fee_type_assigned_students.update(total_term_wise_amount)
                    elif fee_data['total_amount']:
                        only_fee_type_assigned_students.update(student)
                        only_fee_type_assigned_students.update(term_wise_amount)
                    extra_columns += term_wise_amount.keys()
                    student.update(term_wise_amount)
                if fee_group_wise_download:
                    fee_group_wise_amount = {}
                    extra_columns=[]
                    for row_data in fee_data['data']:
                        if 'fee_group' in row_data and str(row_data['fee_group']) in fee_group_ids:
                            fee_group_id = str(row_data['fee_group'])
                            total_amount_key =row_data['fee_group_name'] + " " + 'Total Amount'
                            paid_amount_key = row_data['fee_group_name'] + " " + 'Amount Paid'
                            pending_amount_key = row_data['fee_group_name'] + " " + 'Pending Amount'
                            discount_key = row_data['fee_group_name'] + " " + 'Discount'
                            if fee_group_id not in fee_group_wise_amount:
                                fee_group_wise_amount[fee_group_id] = {
                                total_amount_key: 0,
                                paid_amount_key: 0,
                                pending_amount_key: 0,
                                discount_key:0,
                            }
                            fee_group_wise_amount[fee_group_id][total_amount_key] += row_data.get('total_amount', 0)
                            fee_group_wise_amount[fee_group_id][paid_amount_key] += row_data.get('total_paid_amount', 0)
                            fee_group_wise_amount[fee_group_id][pending_amount_key] += row_data.get('pending_amount', 0)
                            fee_group_wise_amount[fee_group_id][discount_key] += row_data.get('adjustment_amount', 0)
                            student.update(fee_group_wise_amount[fee_group_id])
                    for fee_group_id in fee_group_ids:
                        if fee_group_id in fee_group_wise_amount:
                            for fee_group_data in fee_group_wise_amount[fee_group_id]:
                                extra_columns.append(fee_group_data)
                if term_wise_download or fee_group_wise_download or download_standard_report:
                    if is_selected_feetypes_totalamount or only_selected_fee_type_term_paid:
                        if only_fee_type_assigned_students:
                            only_fee_type_assigned_students.update(
                            {
                                'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
                                'paid_amount': fee_data['total_paid_amount'],
                                'amount': fee_data['amount'],
                                'standard_name': standard_obj['standard_name'],
                                'concession_amount': fee_data['total_adjusted_amount'] + fee_data['concession_amount'],
                                'concession_reason':concession_reason
                            })
                            if standard not in standard_student_mapping:
                                standard_student_mapping[standard] = {'student_list': [], 'standard': standard,
                                    'standard_name': student_standard_mapping[student['id']]['standard_name'],
                                    'total_amount': 0, 'pending_amount': 0, 'paid_amount': 0,
                                    'amount': 0, 'concession_amount': 0
                                }
                            standard_student_mapping[standard]['total_amount'] += only_fee_type_assigned_students['total_amount']
                            standard_student_mapping[standard]['pending_amount'] += only_fee_type_assigned_students['pending_amount']
                            standard_student_mapping[standard]['paid_amount'] += only_fee_type_assigned_students['paid_amount']
                            standard_student_mapping[standard]['amount'] += only_fee_type_assigned_students['amount']
                            standard_student_mapping[standard]['concession_amount'] += only_fee_type_assigned_students['concession_amount']
                            standard_student_mapping[standard]['student_list'].append(only_fee_type_assigned_students)
                    else:
                        student.update(
                        {
                            'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
                            'paid_amount': fee_data['total_paid_amount'],
                            'amount': fee_data['amount'],
                            'standard_name': standard_obj['standard_name'],
                            'concession_amount': fee_data['total_adjusted_amount'] + fee_data['concession_amount'],
                            'concession_reason':concession_reason
                        })
                        if standard not in standard_student_mapping:
                            standard_student_mapping[standard] = {'student_list': [], 'standard': standard,
                                'standard_name': student_standard_mapping[student['id']]['standard_name'],
                                'total_amount': 0, 'pending_amount': 0, 'paid_amount': 0,
                                'amount': 0, 'concession_amount': 0,'one_time_payment_concession': 0,'staff_concession': 0,'other_concession': 0
                            }
                        standard_student_mapping[standard]['total_amount'] += student['total_amount']
                        standard_student_mapping[standard]['pending_amount'] += student['pending_amount']
                        standard_student_mapping[standard]['paid_amount'] += student['paid_amount']
                        standard_student_mapping[standard]['amount'] += student['amount']
                        standard_student_mapping[standard]['concession_amount'] += student['concession_amount']
                        standard_student_mapping[standard]['one_time_payment_concession'] += student['one_time_payment_concession']
                        standard_student_mapping[standard]['staff_concession'] += student['staff_concession']
                        standard_student_mapping[standard]['other_concession'] += student['other_concession']
                        standard_student_mapping[standard]['student_list'].append(student)
                if transport_download:
                    term_wise_amount={}
                    for row_data in fee_data['data']:
                        if row_data['codename'] == 'transport':
                            transport_student=student
                            if not fee_type_ids or str(row_data['fee_type']) in fee_type_ids:
                                for standard_fee in row_data['standard_fee']:
                                    if not fee_term_names or standard_fee['terms'] in fee_term_names.split(','):
                                        if standard_fee['is_disabled']:
                                            continue
                                        if is_last_transaction_required:
                                            last_transaction_data={}
                                            differences=0
                                            minimum=0
                                            if 'payment_detail' in standard_fee:
                                                for index,payment_details in enumerate(standard_fee['payment_detail']):
                                                    differences = abs(today - payment_details['transaction_date'])
                                                    if index==0:
                                                        minimum = differences
                                                        last_transaction_data = payment_details
                                                    else:
                                                        if differences < minimum:
                                                            minimum = differences
                                                            last_transaction_data = payment_details
                                        term_name = standard_fee['term_alias'] if standard_fee['term_alias'] else standard_fee['terms']
                                        paid_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Amount Paid'
                                        pending_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Pending Amount'
                                        total_amount_key = row_data['fee_type_name'] + ' ' + term_name + ' ' + 'Total Amount'
                                        last_transaction_key = row_data['fee_type_name'] + ' ' +'Last paid amount'
                                        last_transaction_date_key = row_data['fee_type_name']+ ' ' +'Last paid date'
                                        if paid_amount_key not in term_wise_amount:
                                            term_wise_amount[paid_amount_key] = 0
                                        if pending_amount_key not in term_wise_amount:
                                            term_wise_amount[pending_amount_key] = 0
                                        if total_amount_key not in term_wise_amount:
                                            term_wise_amount[total_amount_key] = 0
                                        transport_student['area']=''
                                        str(transport_student['area'])
                                        term_wise_amount[paid_amount_key] += standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                        term_wise_amount[pending_amount_key] += standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                        term_wise_amount[total_amount_key] += standard_fee['amount'] if 'amount' in standard_fee else 0
                                        transport_student['area'] = standard_fee['areaname'] if 'areaname' in standard_fee else ''
                                        transport_student['total_amount'] = row_data['total_amount'] if 'total_amount' in row_data else 0
                                        transport_student['payable_amount'] = row_data['total_payable_amount'] if 'total_payable_amount' in row_data else 0
                                        transport_student['pending_amount'] = row_data['pending_amount'] if 'pending_amount' in row_data else 0
                                        if is_last_transaction_required:
                                            term_wise_amount[last_transaction_key] = last_transaction_data['amount_paid'] if 'amount_paid' in last_transaction_data else 0
                                            term_wise_amount[last_transaction_date_key] = last_transaction_data['transaction_date'].strftime('%Y-%m-%d') if 'transaction_date' in last_transaction_data else ''
                            transport_student.update(transport_student)
                            extra_columns += term_wise_amount.keys()
                            transport_student.update(term_wise_amount)
                            transport_student.update(
                                {
                                'paid_amount': fee_data['total_paid_amount'],
                                'amount': fee_data['amount'],
                                'standard_name': standard_obj['standard_name'],
                                'concession_amount': fee_data['total_adjusted_amount'] + fee_data['concession_amount']
                                })
                            if standard not in standard_student_mapping:
                                standard_student_mapping[standard] = {'student_list': [], 'standard': standard,
                                'standard_name': student_standard_mapping[student['id']]['standard_name'],
                                'total_amount': 0, 'pending_amount': 0, 'paid_amount': 0,
                                'amount': 0, 'concession_amount': 0
                                }
                            #standard_student_mapping[standard]['total_amount'] += transport_student['total_amount']
                                    #standard_student_mapping[standard]['pending_amount'] += transport_student['pending_amount']
                                    #standard_student_mapping[standard]['paid_amount'] += transport_student['paid_amount']
                            standard_student_mapping[standard]['amount'] += transport_student['amount']
                                    #standard_student_mapping[standard]['concession_amount'] += transport_student['concession_amount']
                            standard_student_mapping[standard]['student_list'].append(transport_student)
            standard_student_mapping[standard]['total_students'] = len(standard_student_mapping[standard]['student_list'])
        file_name = 'Fc_Report'
        acad = AcademicYear.objects.get(id=academic_year)
        file_name += '_' + acad.start_date.strftime('%Y') + '_' + acad.end_date.strftime('%Y')+'.xlsx'
        response = None
        if self.request.GET.get('dashboard'):
            return standard_student_mapping
        if download_standard_report:
            response = download_fee_collection_report_standard_wise(self, standard_student_mapping)
        if extra_columns and term_wise_download:
            extra_columns = list(set(extra_columns))
            extra_columns.sort()
            extra_columns.sort(key=num_sort)
        if term_extra_columns and term_wise_download:
            term_extra_columns = list(set(term_extra_columns))
            if 'assigned_fee_types' in term_extra_columns:
                term_extra_columns.remove('assigned_fee_types')
            term_extra_columns.sort()
            term_extra_columns.sort(key=num_sort)
        if transport_area_wise_pending_report and transport_download:
            # Generate area-wise pending report grouped by area
            response = download_transport_area_wise_pending_report(self, standard_student_mapping, file_name, extra_columns)
        elif extra_columns and transport_download:
            extra_columns = list(set(extra_columns))
            extra_columns.sort()
            extra_columns.sort(key=num_sort)
            response = download_transport_report_area_wise(self,standard_student_mapping, file_name, extra_columns)
        if not response and fee_group_wise_download:
            response = download_fee_collection_report_fee_group_wise(self, standard_student_mapping, file_name, extra_columns)
        if not response and  inst_obj.code == 'sadguru':
            response = download_fee_collection_report_student_wise_sadguru(self,standard_student_mapping,file_name,extra_columns)
        if not response and inst_obj.code == 'svems':
            response = download_fee_collection_report_student_wise_svems(self,standard_student_mapping,file_name,extra_columns)
        if from_date and to_date:
            response = download_fee_collection_report_student_wise(self, standard_student_mapping, file_name,{})
        if not response and only_selected_fee_type_term_paid:
            response = download_fee_collection_report_student_wise(self, standard_student_mapping, file_name,term_extra_columns)
        if not response:
            response = download_fee_collection_report_student_wise(self, standard_student_mapping, file_name, extra_columns)
        if not response:
            raise exceptions.ValidationError('Invalid Request')
        if self.request.GET.get('long_running_process'):
            if response.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                filename = file_name
            url = UploadTypeService.upload_local_file(filename, path='FeeReport')
            if download_excel:
                if self.request.GET.get('long_running_process'):
                    if os.path.exists(file_name):
                        os.remove(file_name)
                    transaction_id = self.request.GET.get('transaction_id')
                    user_id = self.request.user.id
                    store_long_running_process(self, transaction_id,{'url': url})
                else:
                    return response
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            user_id = self.request.user.id
            store_long_running_process(self, transaction_id,{'error': e.args[:250]})
        else:
            raise e

def get_fee_collection_fee_type_wise_report(self):
    academic_year = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard')
    download_excel = self.request.GET.get('download_excel')
    if not standard or not academic_year:
        raise exceptions.ValidationError('standard and acadeemic_year is mandatory')
    student_queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True,
                                                                       standard_student__academic_year=academic_year,
                                                                       standard_student__standard=standard)
    student_serializer = StudentListSerializer(student_queryset, many=True)
    data = student_serializer.data
    fee_type_wise_summary = {} #{'fee_type_name': {'paid': 0, 'payable': 0, 'pending_amount': 0}}
    columns = {}
    for index, student in enumerate(data):
        fee_type_summary_student_wise = {}
        student['sl_no'] = index + 1
        fee_data = calculations.fee_calculation(self, student['id'], academic_year, standard, returnValue=True)
        for row_fee in fee_data['data']:
            for standard_fee_data in row_fee['standard_fee']:
                key = row_fee['fee_type_name']+ '#_#' + standard_fee_data['terms']
                if key not in fee_type_summary_student_wise:
                    fee_type_summary_student_wise[key] = {
                        'column_name': row_fee['fee_type_name'] + ' ' + standard_fee_data['terms'],
                        'paid_amount': 0, 'pending_amount': 0, 'total_amount': 0 }
                fee_type_summary_student_wise[key]['total_amount']  += standard_fee_data['total_amount']
                fee_type_summary_student_wise[key]['pending_amount'] += standard_fee_data['pending_amount']
                fee_type_summary_student_wise[key]['paid_amount']  += standard_fee_data['paid_amount']
                if key not in fee_type_wise_summary:
                    fee_type_wise_summary[key] = {
                        'column_name': row_fee['fee_type_name'] + ' ' + standard_fee_data['terms'],
                        'paid_amount': 0, 'pending_amount': 0, 'total_amount': 0 }
                fee_type_wise_summary[key]['total_amount']  += standard_fee_data['total_amount']
                fee_type_wise_summary[key]['pending_amount'] += standard_fee_data['pending_amount']
                fee_type_wise_summary[key]['paid_amount']  += standard_fee_data['paid_amount']
                columns[key] = {'column': fee_type_wise_summary[key]['column_name'], 'required': False, 'schemacolumn': key} #nikhi
        student.update(
            {'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
            'paid_amount': fee_data['total_paid_amount'], 'amount': fee_data['amount']})
    if download_excel:
        file_name = 'Fc Report'
        acad = AcademicYear.objects.get(id=academic_year)
        file_name += ' ' + acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')
        if standard:
            stand_obj = Standard.objects.get(id=standard)
            file_name += ' ' + stand_obj.name
        return download_full_fee_collection_report(self, data, file_name, columns.values())
    else:
        return data

def myFunc(e):
    return e['created']

def add_additonal_charge_amount(self, data_list):
    payment_detail_ids = []
    for paid in data_list:
        if paid['local_module'] == 'fee_collection':
            payment_detail_ids.append(paid['id'])
    queryset = FeeCollectionAdditionChargeMapping.objects.filter(
        payment_detail__in=payment_detail_ids
    )
    payment_id_additonal_data_mapping = {}
    ser = FeeCollectionAdditionChargeMappingReadSerilaizer(queryset, many=True)
    for row_data in ser.data:
        if row_data['payment_detail'] not in payment_id_additonal_data_mapping:
            payment_id_additonal_data_mapping[row_data['payment_detail']] = []
        payment_id_additonal_data_mapping[row_data['payment_detail']].append(
            row_data
        )
    for row_data in data_list:
        row_data['amount_paid_exc_other_charges'] = row_data['amount_paid']
        if row_data['id'] in payment_id_additonal_data_mapping:
            for additonal_charge in payment_id_additonal_data_mapping[row_data['id']]:
                row_data['amount_paid'] += float(additonal_charge['amount'])
    return data_list

def get_cashbook_report_detail(self, payment, application, misc,mode_of_payment, pagination=True, filters={}, cashbook_total=False):
    cashbook_feecollection_wise = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'cashbook_feecollection_wise')
    is_active_true_false = 0 if self.request.GET.get('is_active')=='false' else 1
    required_form_definition = [
        {'form_name': 'fee_configurations', 'column_name': 'split_based_on_mode_of_payment'}
    ]
    temp_form_defintion = FormdefinitionService.get_formdefinition_for_multiple_data(self, required_form_definition)
    applicationData = miscData = data = list()
    split_based_on_mode_of_payment = int(temp_form_defintion['fee_configurations']['split_based_on_mode_of_payment']['default_value'])
    filter_query = None
    fee_collection_data = []
    if self.request.GET.get('search'):
        search_key = self.request.GET.get('search')
        filter_query = Q(student_first_name__icontains=search_key) | Q(standard_name__icontains=search_key)
    if payment:
        data = payment.order_by('fee_collection__transaction_date').annotate(fee_type_name=F('fee_plan__standard_fee__fee_type__name'),
                                                    date=F('fee_collection__transaction_date'),
                                                    fee_collection_receipt_num=F('fee_collection__receipt_num'),
                                                    user=F('fee_collection__user'),
                                                    student_first_name=F('fee_collection__student__first_name'),
                                                    student_middle_name=F('fee_collection__student__middle_name'),
                                                    student_last_name=F('fee_collection__student__last_name'),
                                                    reg_num=F('fee_collection__student__current_reg_num'),
                                                    student=F('fee_collection__student'),
                                                    local_module=Value('fee_collection'),
                                                    online_payment=F('fee_collection__online_payment__id'),
                                                    mode_of_payment=F('fee_collection__mode_of_payment'),
                                                    payment_note=F('fee_collection__payment_note'),
                                                    fee_group_name=F('fee_plan__standard_fee__fee_group__name'),
                                                    fee_group=F('fee_plan__standard_fee__fee_group'),
                                                    standard=F('fee_plan__standard_fee__standard'),
                                                    term_name=F('fee_plan__terms'),
                                                    ref_number=F('fee_collection__payment_ref_num'),
                                                    academic_year=F('fee_plan__standard_fee__academic_year'),
                                                    standard_name=F('fee_plan__standard_fee__standard__name'),
                                                    branch_name=F('fee_plan__standard_fee__standard__branch__name'),
                                                    is_active=F('fee_collection__is_active'),
                                                    fee_delete_reason=F('fee_collection__fee_collection_delete_tracking_fee_collection__reason'),
                                                    fee_delete_user=F('fee_collection__fee_collection_delete_tracking_fee_collection__user'),
                                                    fee_delete_date=F('fee_collection__fee_collection_delete_tracking_fee_collection__created')
                                                    ).values(
            'fee_type_name', 'amount_paid', 'date', 'receipt_num', 'user','reg_num', 'standard_name', 'student', 'online_payment', 'fee_collection_receipt_num', 'local_module', 'standard',
            'mode_of_payment', 'fee_collection__payment_note', 'fee_group_name', 'ref_number', 'fee_collection', 'fee_group',
            'created', 'id', 'term_name','academic_year','branch_name','is_active','fee_delete_reason','fee_delete_user','fee_delete_date')
        if filter_query:
            data = data.filter(filter_query)
        fee_collection_ids = []
        fee_collection_dict={}
        for row_data in data:
            fee_collection_ids.append(row_data['fee_collection'])
            if row_data['fee_collection'] not in fee_collection_dict:
                fee_collection_dict[row_data['fee_collection']] = {
                    'fee_collection':row_data['fee_collection'],
                    'fee_payment_list':[],
                    'mode_of_payment_list':[]
                }
            fee_collection_dict[row_data['fee_collection']]['fee_payment_list'].append({'payment_id':row_data['id'],'payment_amount':row_data['amount_paid'],'detail':row_data})
        adjustment_data_list = AdjustmentFee.objects.filter(fee_collection_id__in=fee_collection_ids).values('fee_plan','amount','is_active','is_addition', 'reason_id','student','user',
                                                                                                        'concession','fee_collection_id','adjustment_fee_parent',
                                                                                                        'created','modified','reason_id__name')
        mode_of_payment_list_data = FeeCollectionModeOfPayment.objects.filter(
            fee_collection__in=fee_collection_ids
        ).values('id', 'mode_of_payment', 'payment_ref_num', 'fee_collection_id', 'amount', 
                 'created', 'modified', 'loan_from_bank', 'loan_to_bank', 'loan_utr_number', 
                 'loan_credited_date', 'bank_detail__bank_name', 'bank_detail_id')
        mode_of_payment_mapping = {}
        result={}
        for mode_of_pay in mode_of_payment_list_data:
            if 'bank_detail__bank_name' in mode_of_pay and mode_of_pay['bank_detail__bank_name'] is not None:
                mode_of_pay['bank_detail__bank_name'] = mode_of_pay['bank_detail__bank_name']
            else:
                mode_of_pay['bank_detail__bank_name'] = None
            if mode_of_pay['fee_collection_id'] not in mode_of_payment_mapping:
                mode_of_payment_mapping[mode_of_pay['fee_collection_id']] = []
            mode_of_payment_mapping[mode_of_pay['fee_collection_id']].append(mode_of_pay)
            mode_of_pay_copy = copy.copy(mode_of_pay)
            fee_collection_dict[mode_of_pay['fee_collection_id']]['mode_of_payment_list'].append(mode_of_pay_copy)
        for fee_collection in fee_collection_dict:
            for payment in fee_collection_dict[fee_collection]['fee_payment_list']:
                payment_amount = payment['payment_amount']
                for mode in fee_collection_dict[fee_collection]['mode_of_payment_list']:
                    if payment_amount == 0:
                        break
                    mode_amount = mode['amount']
                    if mode_amount > 0:
                        allocated_amount = min(payment_amount, mode_amount)
                        if fee_collection not in result:
                            result[fee_collection]={'list':[],'is_feecollection_appended':0}
                        result[fee_collection]['list'].append({
                            'id':mode['id'],
                            'fee_collection_id':mode['fee_collection_id'],
                            'created':mode['created'],
                            'modified':mode['modified'],
                            'payment_ref_num':mode['payment_ref_num'],
                            'mode_of_payment': mode['mode_of_payment'],
                            'amount': allocated_amount,
                            'payment_id': payment['payment_id'],
                            'bank_detail__bank_name': mode.get('bank_detail__bank_name', None),
                        })
                        payment_amount -= allocated_amount
                        mode['amount'] -= allocated_amount
        adjustment_data={}
        for adj in adjustment_data_list:
            if not adj['fee_collection_id'] in adjustment_data:
                adjustment_data[adj['fee_collection_id']]=[]
                adjustment_data[adj['fee_collection_id']].append(adj)
            else:
                adjustment_data[adj['fee_collection_id']].append(adj)
        for adj in adjustment_data:
            for adjustment in adjustment_data[adj]:
                adjustment['already_assigned'] = 0
        for row_data in data:
            row_data['mode_of_payment_list'] = mode_of_payment_mapping[row_data['fee_collection']]
            fee_collection_id = row_data['fee_collection']
            if fee_collection_id in adjustment_data:
                discount = 0
                for adjustment in adjustment_data[fee_collection_id]:
                    if adjustment['already_assigned'] == 0:
                        discount += adjustment['amount']
                        adjustment['already_assigned'] = 1
                        discount_reason = adjustment['reason_id__name']
                row_data['discount'] = discount
                row_data['discount_reason'] = discount_reason
            else:
                row_data['discount'] = 0
                row_data['discount_reason'] =''
            # if split_based_on_mode_of_payment: #this should be in last line always
            #     for index, mode_of_pay in enumerate(row_data['mode_of_payment_list']):
            #         temp_row_data = copy.deepcopy(row_data)
            #         if temp_row_data['discount'] and index > 0: #delete discount for the second mode of payment
            #             temp_row_data['discount'] = 0
            #         temp_row_data['amount_paid'] = mode_of_pay['amount']
            #         temp_row_data['mode_of_payment_list'] = [mode_of_pay]
            #         temp_row_data['mode_of_payment'] = mode_of_pay['mode_of_payment'] #temp Fix we are removing this key soon
            #         fee_collection_data.append(temp_row_data)
            # else:
            #     fee_collection_data.append(row_data)
            is_not_split=True
            if not mode_of_payment:
                if len(row_data['mode_of_payment_list'])>1:
                    for index,mode_of_pay in enumerate(result[row_data['fee_collection']]['list']):
                        if split_based_on_mode_of_payment: #this should be in last line always
                            if mode_of_pay['payment_id'] == row_data['id']:
                                temp_row_data = copy.deepcopy(row_data)
                                if temp_row_data['discount'] and index > 0: #delete discount for the second mode of payment
                                    temp_row_data['discount'] = 0
                                temp_row_data['amount_paid'] = mode_of_pay['amount']
                                temp_row_data['mode_of_payment_list'] = [mode_of_pay]
                                temp_row_data['mode_of_payment'] = mode_of_pay['mode_of_payment'] #temp Fix we are removing this key soon
                                fee_collection_data.append(temp_row_data)
                                is_not_split=False
            if mode_of_payment:
                temp_mode_data = copy.deepcopy(row_data)
                temp_mode_data['mode_of_payment_list']=[]
                temp_mode_data['amount_paid']=0
                for index,datas in enumerate(result[row_data['fee_collection']]['list']):
                    if datas['payment_id'] == row_data['id']:
                        if datas['mode_of_payment'] in mode_of_payment:
                            temp_mode_data['amount_paid'] += datas['amount']
                            temp_mode_data['mode_of_payment'] = datas['mode_of_payment']
                            temp_mode_data['mode_of_payment_list'].append(datas)
                fee_collection_data.append(temp_mode_data)
                is_not_split=False
            if is_not_split:
                fee_collection_data.append(row_data)
        if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
            group_by_fee_group = {}
            data_without_group = []
            for row_data in fee_collection_data:
                if row_data['fee_group']:
                    key = str(row_data['fee_group']) + '' + str(row_data['fee_collection'])
                    if key not in group_by_fee_group:
                        group_by_fee_group[key] = row_data
                    else:
                        group_by_fee_group[key]['amount_paid'] += row_data['amount_paid']
                else:
                    data_without_group.append(row_data)
            fee_collection_data = list(group_by_fee_group.values()) + data_without_group
    if application:
        applicationData = application.order_by('transaction_date').annotate(
                date=F('transaction_date'), fee_type_name=F('name'),
                academic_year=F('student__entry_academic_year'),
                local_module=Value('application_fee'),
                ref_number=F('payment_ref_num'),
                standard_name=F('student__current_standard__name'),
                branch_name=F('student__current_standard__branch__name'),
                is_active = F('student__is_active')
            ).values(
            'fee_type_name', 'amount_paid', 'date', 'user', 'receipt_num', 'standard_name', 'student', 'is_active',
            'local_module', 'mode_of_payment', 'payment_ref_num', 'created', 'id','academic_year','branch_name')
        if filter_query:
            applicationData = applicationData.filter(filter_query)
    if misc:
        miscData = misc.order_by('miscellaneous__created').annotate(fee_type_name=F('misc__misc_type__name'),
                                                                    amount_paid=F('amount'), student=F('miscellaneous__student'),
                                                                    student_first_name=F('miscellaneous__student__first_name'),
                                                                    student_middle_name=F('miscellaneous__student__middle_name'),
                                                                    student_last_name=F('miscellaneous__student__last_name'),
                                                                    reg_num=F('miscellaneous__student__current_reg_num'),
                                                                    standard_name=F(
                                                                        'miscellaneous__student__current_standard__name'),
                                                                    local_module=Value('misc_collection'),
                                                                    date=F('miscellaneous__date'),
                                                                    misc_receipt_num=F('miscellaneous__receipt_num'),
                                                                    is_active = F('miscellaneous__is_active'),
                                                                    user=F('miscellaneous__user'),
                                                                    mode_of_payment=F('miscellaneous__mode_of_payment'),
                                                                    payment_note=F('miscellaneous__payment_note'),
                                                                    ref_number=F('miscellaneous__ref_number'),
                                                                    created=F('miscellaneous__created'),
                                                                    academic_year=F('misc__academic_year'),
                                                                    guest_name=F('miscellaneous__guest_name'),
                                                                    branch_name=F(
                                                                       'miscellaneous__student__current_standard__branch__name')).values(
            'fee_type_name', 'amount_paid', 'date', 'receipt_num', 'user', 'student_first_name', 'reg_num','is_active',
            'guest_name', 'standard_name', 'student', 'local_module', 'student_middle_name', 'student_last_name', 'misc_receipt_num',
            'mode_of_payment', 'payment_note', 'ref_number', 'created', 'id','academic_year','branch_name'
            )
        if filter_query:
            miscData = miscData.filter(filter_query)
    fee_advance_data = _cashbook_fee_advance_as_data_rows(self, cashbook_total=cashbook_total)
    report = list(applicationData) + list(fee_collection_data) + list(miscData) + fee_advance_data
    report.sort(key=myFunc)
    user_ids = []
    users = {}
    academic_year_ids = []
    student_ids = []
    application_student_ids = []
    for user in report:
        user_ids.append(user['user'])
        if user['local_module'] == 'application_fee':
            application_student_ids.append(user['student'])
        else:
            student_ids.append(user['student'])
        academic_year_ids.append(user['academic_year'])
        if 'fee_delete_user' in user:
            user_ids.append(user['fee_delete_user'])
    academic_year_data = {aca['id'] : aca for aca in AcademicYear.objects.filter(id__in=academic_year_ids).values()}
    for u in User.objects.filter(id__in=user_ids).values(
        'is_superuser', 'id' , 'is_staff', 'staff__first_name', 'staff__middle_name',
        'staff__last_name', 'student', 'student__first_name', 'student__middle_name', 'student__last_name'
    ):
        users[u['id']] = u
    try:
        current_academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today(), True).id
    except:
        raise exceptions.ValidationError('Academic year not set for the current date')
    enr_data = {e['student']: e for e in Enrollment.objects.filter(
        student__in=student_ids, standard_section__academic_year= current_academic_year
    ).values('student', 'standard_section', 'standard_section__section__name', 'standard_section__standard__name')}
    student_data = {stu['id'] : stu for stu in Student.objects.filter(id__in=student_ids).values(
        'first_name', 'middle_name', 'last_name', 'id', 'is_new_student'
    )}
    application_student_data = {
        stu['id'] : stu for stu in ApplicationStudent.objects.filter(id__in=application_student_ids).values(
            'first_name', 'middle_name', 'last_name', 'id', 'student__is_new_student'
        )
    }
    report_data = {
        'collected_by': {},
        'mode_of_payment': {},
        'standard': {},
        'fee_type': {},
        'fee_group': {}
    }#works when pagination is off. report based on the all data
    total_amount = 0
    admission_num_list = get_student_admission_form(self, student_ids)
    collected_by_user_list = {}
    return_data = [] #to remove according to filter
    for index, user in enumerate(report):
        user['sl_no'] = index + 1
        user['academic_year_value'] = ''
        if user['academic_year'] in academic_year_data:
            user['academic_year_value'] = academic_year_data[user['academic_year']]['start_date'].strftime('%Y') + '-' + academic_year_data[user['academic_year']]['end_date'].strftime('%Y')
        if user['local_module'] == 'application_fee':
            if user['student'] in application_student_data:
                user['student_first_name'] = application_student_data[user['student']]['first_name']
                user['student_middle_name'] = application_student_data[user['student']]['middle_name']
                user['student_last_name'] = application_student_data[user['student']]['last_name']
                user['student_type_name'] = 'New Student' if application_student_data[user['student']]['student__is_new_student'] else 'Old Student'

            else:
                user['student_first_name'] = application_student_data[user['student']]['first_name']
                user['student_middle_name'] = application_student_data[user['student']]['middle_name']
                user['student_last_name'] = application_student_data[user['student']]['last_name']
                user['student_type_name'] = 'New Student' if application_student_data[user['student']]['student__is_new_student'] else 'Old Student'
        else:
            if user['student'] in student_data:
                user['student_first_name'] = student_data[user['student']]['first_name']
                user['student_middle_name'] = student_data[user['student']]['middle_name']
                user['student_last_name'] = student_data[user['student']]['last_name']
                user['student_type_name'] = 'New Student' if student_data[user['student']]['is_new_student'] else 'Old Student'
            else:
                user['student_first_name'] = ''
                user['student_middle_name'] = ''
                user['student_last_name'] = ''
                user['student_type_name'] = ''
        if ('fee_type_name' not in user):
            user['fee_type_name'] = None #avoidiyng key error
        if user['fee_type_name'] != 'Application' and user['student'] in enr_data:
            user.update({
                # 'standard_name': enr_data[user['student']]['standard_section__standard__name'], temproary fix showing the standard of the student
                'section_name': enr_data[user['student']]['standard_section__section__name']
            })
        else:
            user.update({'section_name': ''})
        if user['user']:
            user_ob = users[user['user']]
            if  user_ob['is_superuser']:
                user['collected_user_full_name'] = ''
                pass
            else:
                if user_ob['is_staff']:
                    user.update({'user_first_name': user_ob['staff__first_name']})
                    user.update({'user_middle_name': user_ob['staff__middle_name']})
                    user.update({'user_last_name': user_ob['staff__last_name']})
                else:
                    user.update({'user_first_name':  user_ob['student__first_name']})
                    user.update({'user_middle_name':  user_ob['student__middle_name']})
                    user.update({'user_last_name':  user_ob['student__last_name']})
                user['collected_user_full_name'] = get_full_name(user['user_first_name'], user['user_middle_name'], user['user_last_name'])
            collected_by_user_list[user['user']] = {'id': user['user'], 'collected_user_full_name': user['collected_user_full_name']}
        if 'fee_delete_user' in user and user['fee_delete_user']:
            user_ob = users[user['fee_delete_user']]
            if  user_ob['is_superuser']:
                user['fee_delete_user_full_name'] = ''
                pass
            else:
                if user_ob['is_staff']:
                    user.update({'user_first_name': user_ob['staff__first_name']})
                    user.update({'user_middle_name': user_ob['staff__middle_name']})
                    user.update({'user_last_name': user_ob['staff__last_name']})
                else:
                    user.update({'user_first_name':  user_ob['student__first_name']})
                    user.update({'user_middle_name':  user_ob['student__middle_name']})
                    user.update({'user_last_name':  user_ob['student__last_name']})
                user['fee_delete_user_full_name'] = get_full_name(user['user_first_name'], user['user_middle_name'], user['user_last_name'])
        if user['local_module'] == 'misc_collection' and not user['receipt_num']:
            user['receipt_num'] = user['misc_receipt_num'] if 'misc_receipt_num' in user and user['misc_receipt_num'] else ''
        if user['local_module'] == 'fee_collection' and not user['receipt_num']:
            user['receipt_num'] = user['fee_collection_receipt_num'] if 'fee_collection_receipt_num' in user else None
        user['full_name'] = get_full_name(user['student_first_name'], user['student_middle_name'], user['student_last_name'])
        if 'fee_delete_date' in user and user['fee_delete_date']:
            user['fee_delete_date'] = user['fee_delete_date'].strftime('%d-%m-%Y')
            user['deleted_comments'] = 'Deleted on:'+user['fee_delete_date']+os.linesep+'Reason:'+user['fee_delete_reason']
        else:
            user['deleted_comments']=''
        if 'guest_name' in user and user['guest_name']:
            user['full_name'] = user['guest_name']
        user['admission_num'] = admission_num_list[user['student']] if user['student'] in admission_num_list else ''
        if ('collected_by_user' in filters and filters['collected_by_user'] and str(user['user']) not in filters['collected_by_user']):
            continue #we wont update the report when data is not related to him
        if not pagination:
            if 'date' in user and user['date']:
                try:
                    user['date'] = user['date'].strftime('%d-%m-%Y')
                except:
                    pass
            if 'mode_of_payment_list' in user and len(user['mode_of_payment_list'])>1:
                for index,mode_of_payment in enumerate(user['mode_of_payment_list']):
                    if index==0:
                        user['mode_of_payment'] = ''
                    if index==len(user['mode_of_payment_list'])-1:
                        user['mode_of_payment'] += mode_of_payment['mode_of_payment']+'='+str(mode_of_payment['amount'])
                    else:
                        user['mode_of_payment'] += mode_of_payment['mode_of_payment']+'='+str(mode_of_payment['amount'])+os.linesep
                    user['bank_detail__bank_name'] = mode_of_payment['bank_detail__bank_name'] if 'bank_detail__bank_name' in mode_of_payment else None
            collected_by = user['collected_by'] if 'collected_by' in user and user['collected_by'] else ''
            mode_of_payment = user['mode_of_payment'] if 'mode_of_payment' in user and user['mode_of_payment'] else ''
            standard = user['standard'] if 'standard' in user and user['standard'] else ''
            fee_type = user['fee_type'] if 'fee_type' in user and user['fee_type'] else ''
            fee_group = user['fee_group'] if 'fee_group' in user and user['fee_group'] else ''
            fee_group_name = user['fee_group_name'] if 'fee_group_name' in user and user['fee_group_name'] else ''
            if collected_by not in report_data['collected_by']:
                report_data['collected_by'][collected_by] = {'total_amount': 0, 'name': collected_by }
            report_data['collected_by'][collected_by]['total_amount'] += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
            if mode_of_payment not in report_data['mode_of_payment']:
                report_data['mode_of_payment'][mode_of_payment] = {'total_amount': 0, 'name': mode_of_payment }
            report_data['mode_of_payment'][mode_of_payment]['total_amount'] += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
            if standard not in report_data['standard']:
                report_data['standard'][standard] = {'total_amount': 0, 'name': standard }
            report_data['standard'][standard]['total_amount'] += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
            if fee_type not in report_data['fee_type']:
                report_data['fee_type'][fee_type] = {'total_amount': 0, 'name': fee_type }
            report_data['fee_type'][fee_type]['total_amount'] += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
            if fee_group not in report_data['fee_group']:
                report_data['fee_group'][fee_group] = {'total_amount': 0, 'name': fee_group_name }
            report_data['fee_group'][fee_group]['total_amount'] += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
            total_amount += user['amount_paid'] if 'is_active' in user and user['is_active']==is_active_true_false else 0
        #there is continue statement
        return_data.append(user)
    if pagination:
        return_data, count, next_page, previous_page = SharedService.custom_pagination(self, return_data, self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return_data = add_additional_charge(self, return_data)
        return {
            'count': count, 'next': next_page, 'previous': previous_page, 'data_list': return_data,
            'user_list': collected_by_user_list.values(),
        }
    else:
        return_data = add_additional_charge(self, return_data)
        return {
            'data_list': return_data, 'report_data': report_data, 'total_amount': total_amount,
            'collected_by_user_list': collected_by_user_list.values(),
        }

def add_additional_charge(self, return_data):
    if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'enable_additional_charge'):
        return add_additonal_charge_amount(self, return_data)
    return return_data

def _get_cashbook_fee_advance_queryset(view, cashbook_total=False):
    """
    FeeAdvanceCollection queryset for cashbook using the same GET filters / visibility as payment.
    """
    academic_year = view.request.GET.get('academic_year')
    standard = view.request.GET.get('standard').split(',') if view.request.GET.get('standard') else None
    standard_section = view.request.GET.get('standard_section').split(',') if view.request.GET.get('standard_section') else None
    section = view.request.GET.get('section').split(',') if view.request.GET.get('section') else None
    application_ids = view.request.GET.get('application').split(',') if view.request.GET.get('application') else None
    fee_ids = [int(fee) for fee in view.request.GET.get('fees').split(',')] if view.request.GET.get('fees') else None
    misc_ids = view.request.GET.get('misc').split(',') if view.request.GET.get('misc') else None
    from_date = view.request.GET.get('from_date')
    to_date = view.request.GET.get('to_date')
    if not (from_date and to_date) and view.request.GET.get('fee_from_date'):
        from_date = view.request.GET.get('fee_from_date')
        to_date = datetime.today().date().strftime('%Y-%m-%d')
    type_name = view.request.GET.get('type_name')
    download_excel = view.request.GET.get('download_excel')
    download_pdf = view.request.GET.get('download_pdf')
    mode_of_payment = view.request.GET.get('mode_of_payment').split(',') if view.request.GET.get('mode_of_payment') else None
    student_type = view.request.GET.get('student_type')
    branch = view.request.GET.get('branch')
    show_payment = show_misc = show_application = True
    if application_ids:
        if not fee_ids:
            show_payment = False
        if not misc_ids:
            show_misc = False
    if misc_ids:
        if not fee_ids:
            show_payment = False
        if not application_ids:
            show_application = False
    if fee_ids:
        if not misc_ids:
            show_misc = False
        if not application_ids:
            show_application = False
    if type_name:
        type_id = view.request.GET.get('type_id')
        if type_name == 'application':
            show_payment = show_misc = None
        elif type_name == 'fees':
            show_application = show_misc = None
        elif type_name == 'misc':
            if type_id:
                pass
            show_payment = show_application = None
    if not show_payment:
        return None
    fee_advance_filter = {}
    if academic_year:
        fee_advance_filter['academic_year'] = academic_year
    if standard:
        fee_advance_filter['student__current_standard__in'] = standard
    if standard_section:
        fee_advance_student_ids = list(
            Enrollment.objects.filter(standard_section__in=standard_section).values_list('student_id', flat=True)
        )
        fee_advance_filter['student__in'] = fee_advance_student_ids
    if section and standard and academic_year:
        fee_advance_student_ids = list(
            Enrollment.objects.filter(
                standard_section__academic_year=academic_year,
                standard_section__standard__in=standard,
                standard_section__section__in=section,
            ).values_list('student_id', flat=True)
        )
        fee_advance_filter['student__in'] = fee_advance_student_ids
    if branch:
        fee_advance_filter['student__current_standard__branch__in'] = branch
    if mode_of_payment:
        fee_advance_filter['mode_of_payment__in'] = mode_of_payment
    if from_date and to_date:
        fee_advance_filter['transaction_date__range'] = (from_date, to_date)
    if student_type and student_type == 'old_student' or student_type == 'new_student':
        fee_adv_is_new = False if student_type == 'old_student' else True
        fee_advance_filter['student__is_new_student'] = fee_adv_is_new
    # Match payment behaviour: empty filters still mean "all" rows in scope (not .none()).
    if fee_advance_filter:
        fee_advance = FeeAdvanceCollection.objects.filter(**fee_advance_filter)
    else:
        fee_advance = FeeAdvanceCollection.objects.all()
    if not (show_payment and (download_excel or download_pdf) and not cashbook_total):
        fee_advance = fee_advance.filter(
            is_active=False
            if view.request.GET.get('is_active') and view.request.GET.get('is_active') == 'false'
            else True
        )
    return fee_advance


def _cashbook_fee_advance_as_data_rows(view, cashbook_total=False):
    """
    Fee advance rows shaped like other cashbook rows (local_module='fee_advance') for data_list.
    """
    qs = _get_cashbook_fee_advance_queryset(view, cashbook_total=cashbook_total)
    if qs is None:
        return []
    rows = (
        qs.order_by('transaction_date', 'id')
        .annotate(
            date=F('transaction_date'),
            fee_type_name=F('fee_advance_type__name'),
            amount_paid=F('amount'),
            local_module=Value('fee_advance'),
            ref_number=F('payment_ref_num'),
            standard_name=F('student__current_standard__name'),
            branch_name=F('student__current_standard__branch__name'),
            student_first_name=F('student__first_name'),
            student_middle_name=F('student__middle_name'),
            student_last_name=F('student__last_name'),
            reg_num=F('student__current_reg_num'),
        )
        .values(
            'fee_type_name',
            'amount_paid',
            'date',
            'receipt_num',
            'student',
            'local_module',
            'mode_of_payment',
            'payment_note',
            'ref_number',
            'created',
            'id',
            'academic_year',
            'branch_name',
            'is_active',
            'standard_name',
            'student_first_name',
            'student_middle_name',
            'student_last_name',
            'reg_num',
        )
    )
    out = []
    for r in rows:
        row = dict(r)
        if not row.get('fee_type_name'):
            row['fee_type_name'] = 'Fee Advance'
        row['user'] = None
        # Align with fee_collection rows: one entry (advance has a single mode on the model)
        mop = row.get('mode_of_payment') or 'Cash'
        amt = row['amount_paid'] if row.get('amount_paid') is not None else 0
        ref = row.get('ref_number')
        row['mode_of_payment_list'] = [
            {
                'mode_of_payment': mop,
                'amount': amt,
                'payment_ref_num': ref,
                'bank_detail__bank_name': None,
                'fee_collection_id': None,
            }
        ]
        row['discount'] = 0
        row['discount_reason'] = ''
        out.append(row)
    return out

def get_cashbook_total_report(self, queryset, application, misc, mode_of_payment,collected_by_user=None, from_date=None, to_date=None, cashbook_total=False):
    applicationData = miscData = data=appln_mode_of_payment_data=misc_mode_of_payment_data=mode_of_payment_data= list()
    term_wise_payment_details={}
    report_rows = []
    fee_summary_report_data = {}
    bank_wise_summary = {}
    if queryset:
        if collected_by_user:
            queryset = queryset.filter(fee_collection__user__in=collected_by_user)

        data1 = queryset.values(
            'fee_plan__standard_fee__fee_type',
            'fee_plan__standard_fee__fee_type__name',
            'amount_paid', 'fee_collection_id', 'id',
            'fee_plan__terms', 'fee_plan__term_alias',
            'fee_plan__standard_fee__standard__branch__name',
            'fee_plan__standard_fee__fee_group__name'
        )

        mode_of_payment_details = {}
        payment_details = {}
        fee_collection_ids = set()
        fee_collection_dict = {}
        result = []
        for info in data1:
            fee_collection_id = info['fee_collection_id']
            fee_collection_ids.add(fee_collection_id)

            fee_collection_dict.setdefault(fee_collection_id, {
                'fee_payment_list': [],
                'mode_of_payment_list': []
            })

            # For reports without mode_of_payment filter
            if not mode_of_payment:
                fee_type = info['fee_plan__standard_fee__fee_type']
                term = info['fee_plan__terms']
                fee_type_name = info['fee_plan__standard_fee__fee_type__name']

                payment_details.setdefault(fee_type, {'fee_type_name': fee_type_name, 'amount': 0})
                payment_details[fee_type]['amount'] += info['amount_paid']

                term_wise_payment_details.setdefault(term, {
                    'fee_term_name': term,
                    'fee_term_alias_name': info['fee_plan__term_alias'],
                    'amount': 0
                })
                term_wise_payment_details[term]['amount'] += info['amount_paid']

            fee_collection_dict[fee_collection_id]['fee_payment_list'].append({
                'payment_id': info['id'],
                'payment_amount': info['amount_paid'],
                'fee_type': info['fee_plan__standard_fee__fee_type'],
                'fee_type_name': info['fee_plan__standard_fee__fee_type__name'],
                'branch_name': info['fee_plan__standard_fee__standard__branch__name'],
            })

        # Mode of payment data
        mode_of_payment_query = FeeCollectionModeOfPayment.objects.filter(
            fee_collection_id__in=fee_collection_ids,fee_collection__is_active = 1
        )
        if mode_of_payment:
            mode_of_payment_query = mode_of_payment_query.filter(mode_of_payment__in=mode_of_payment)

        mode_of_payments_list = mode_of_payment_query.values(
            'fee_collection_id', 'mode_of_payment', 'amount', 'fee_collection__is_active', 'bank_detail__bank_name'
        )

        processed_fc_for_mode = set()  # Track (fc_id, mode) pairs to avoid double counting

        for payment in mode_of_payments_list:
            fc_id = payment['fee_collection_id']
            mode = payment['mode_of_payment']
            is_active = payment['fee_collection__is_active']
            amount = payment['amount']  # Use actual mode of payment amount
            bank_name = payment.get('bank_detail__bank_name') or 'Not Specified'

            if fc_id not in fee_collection_dict:
                continue  # Safety check

            # Avoid double counting same fc_id + mode combination
            fc_mode_key = (fc_id, mode)
            if fc_mode_key in processed_fc_for_mode:
                fee_collection_dict[fc_id]['mode_of_payment_list'].append(payment)
                continue
            processed_fc_for_mode.add(fc_mode_key)

            mode_of_payment_details.setdefault(mode, {
                'mode_of_payment': mode,
                'is_active': is_active,
                'amount': 0
            })
            mode_of_payment_details[mode]['amount'] += amount

            # Bank wise summary calculation
            if bank_name not in bank_wise_summary:
                bank_wise_summary[bank_name] = {
                    'bank_name': bank_name,
                    'amount': 0
                }
            bank_wise_summary[bank_name]['amount'] += amount

            fee_collection_dict[fc_id]['mode_of_payment_list'].append(payment)
        
        if from_date and to_date:
            group_mode_summary = {}  # {group_name: {'Cash': 0, 'Online': 0, 'Total': 0}}
            
            # Instead of looping payments, allocate only once per fee_collection
            for fee_collection in fee_collection_dict.values():
                mode_list = fee_collection['mode_of_payment_list']
                payment_list = fee_collection['fee_payment_list']

                total_payment_amount = sum(p['payment_amount'] for p in payment_list if p['payment_amount'] > 0)
                total_mode_amount = sum(m['amount'] for m in mode_list if m['amount'] > 0)

                if total_mode_amount == 0 or total_payment_amount == 0:
                    continue

                for payment in payment_list:
                    branch_name = payment.get('branch_name') or 'Unknown Branch'
                    fee_type_name = payment.get('fee_type_name') or 'Unknown Fee Type'
                    payment_amount = payment['payment_amount']

                    payment_ratio = payment_amount / total_payment_amount  # Share of this payment

                    for mode in mode_list:
                        mode_name = mode['mode_of_payment']
                        mode_amount = mode['amount']
                        if mode_amount <= 0:
                            continue

                        allocated_amount = payment_ratio * mode_amount  # Split mode among payments

                        # Init
                        if branch_name not in group_mode_summary:
                            group_mode_summary[branch_name] = {}
                        if fee_type_name not in group_mode_summary[branch_name]:
                            group_mode_summary[branch_name][fee_type_name] = {'Cash': 0, 'Online': 0, 'Total': 0}

                        if 'cash' in mode_name.lower():
                            group_mode_summary[branch_name][fee_type_name]['Cash'] += allocated_amount
                        else:
                            group_mode_summary[branch_name][fee_type_name]['Online'] += allocated_amount

                        group_mode_summary[branch_name][fee_type_name]['Total'] += allocated_amount

            # Ensure all groups have a concession key
            for branch_data in group_mode_summary.values():
                for group_data in branch_data.values():
                    if 'concession_total' not in group_data:
                        group_data['concession_total'] = 0
                    if 'concession_Cash' not in group_data:
                        group_data['concession_Cash'] = 0
                    if 'concession_Online' not in group_data:
                        group_data['concession_Online'] = 0

            # Process all concessions
            adjustments = AdjustmentFee.objects.filter(
                is_active=True,
                is_addition=False,
                created__date__gte=from_date,
                created__date__lte=to_date
            )

            for adj in adjustments:
                if not adj.fee_plan or not adj.student:
                    continue

                branch_name = adj.fee_plan.standard_fee.standard.branch.name if adj.fee_plan.standard_fee.standard.branch else 'Unknown Branch'
                fee_type_name = adj.fee_plan.standard_fee.fee_type.name if adj.fee_plan.standard_fee.fee_type else 'Unknown Fee Type'

                # Initialize if missing
                if branch_name not in group_mode_summary:
                    group_mode_summary[branch_name] = {}
                if fee_type_name not in group_mode_summary[branch_name]:
                    group_mode_summary[branch_name][fee_type_name] = {
                        'Cash': 0, 'Online': 0, 'Total': 0, 'concession_total': 0,
                        'concession_Cash': 0,
                        'concession_Online': 0
                    }

                group_mode_summary[branch_name][fee_type_name]['concession_total'] += adj.amount or 0
                if adj.fee_collection:
                    if adj.fee_collection.id in fee_collection_dict:
                        for temp_mode_of_payment in fee_collection_dict[adj.fee_collection.id]['mode_of_payment_list']:
                            if temp_mode_of_payment['mode_of_payment'] == 'Cash':
                                group_mode_summary[branch_name][fee_type_name]['concession_Cash']+=adj.amount
                            else:
                                group_mode_summary[branch_name][fee_type_name]['concession_Online']+=adj.amount
                else:
                    group_mode_summary[branch_name][fee_type_name]['concession_Cash']+=adj.amount

            temp = {
                'grand_total_cash': 0,
                'grand_total_online': 0,
                'grand_total_total': 0,
                'grand_total_concession': 0,
                'grand_total_concession_cash': 0,
                'grand_total_concession_online': 0
            }
            for branch, groups in group_mode_summary.items():
                for group, data in groups.items():
                    temp['grand_total_cash'] += data.get('Cash', 0)
                    temp['grand_total_online'] += data.get('Online', 0)
                    temp['grand_total_total'] += data.get('Total', 0)
                    temp['grand_total_concession'] += data.get('concession_total', 0)
                    temp['grand_total_concession_cash'] += data.get('concession_Cash', 0)
                    temp['grand_total_concession_online'] += data.get('concession_Online', 0)
                    report_rows.append({
                        'branch': branch,
                        'fee_group': group,
                        'cash': data.get('Cash', 0),
                        'online': data.get('Online', 0),
                        'total': data.get('Total', 0),
                        'concession_total': data.get('concession_total', 0),
                        'concession_Online':data.get('concession_Online',0),
                        'concession_Cash':data.get('concession_Cash',0),
                    })
            fee_summary_report_data = {'report_rows': report_rows, 'report_summary': temp}
        if mode_of_payment:
            for fc_id, fc_data in fee_collection_dict.items():
                for payment in fc_data['fee_payment_list']:
                    payment_amount = payment['payment_amount']
                    for mode in fc_data['mode_of_payment_list']:
                        if payment_amount == 0:
                            break
                        allocated_amount = min(payment_amount, mode['amount'])

                        result.append({
                            'fee_collection_id': mode['fee_collection_id'],
                            'mode_of_payment': mode['mode_of_payment'],
                            'amount': allocated_amount,
                            'payment_id': payment['payment_id'],
                            'fee_type': payment['fee_type'],
                            'fee_type_name': payment['fee_type_name'],
                            'bank_detail__bank_name': mode.get('bank_detail__bank_name') or 'Not Specified'
                        })

                        payment_amount -= allocated_amount
                        mode['amount'] -= allocated_amount

            for payment in result:
                if payment['mode_of_payment'] in mode_of_payment:
                    ft = payment['fee_type']
                    payment_details.setdefault(ft, {
                        'fee_type_name': payment['fee_type_name'],
                        'amount': 0
                    })
                    payment_details[ft]['amount'] += payment['amount']

            # Recalculate mode_of_payment_details from allocated results when filter is active
            mode_of_payment_details = {}
            for alloc in result:
                if alloc['mode_of_payment'] in mode_of_payment:
                    mode = alloc['mode_of_payment']
                    mode_of_payment_details.setdefault(mode, {
                        'mode_of_payment': mode,
                        'is_active': True,
                        'amount': 0
                    })
                    mode_of_payment_details[mode]['amount'] += alloc['amount']

            # Recalculate bank_wise_summary from allocated results when filter is active
            bank_wise_summary = {}
            for alloc in result:
                if alloc['mode_of_payment'] in mode_of_payment:
                    bank_name = alloc.get('bank_detail__bank_name') or 'Not Specified'
                    if bank_name not in bank_wise_summary:
                        bank_wise_summary[bank_name] = {
                            'bank_name': bank_name,
                            'amount': 0
                        }
                    bank_wise_summary[bank_name]['amount'] += alloc['amount']
        data = list(payment_details.values())
        mode_of_payment_data = list(mode_of_payment_details.values())

        # Additional Charges
        additional_charge_data = FeeCollectionAdditionChargeMapping.objects.filter(
            payment_detail__in=queryset.values_list('id', flat=True)
        ).values('payment_detail__fee_plan__standard_fee__fee_type__name').annotate(
            fee_type_name=F('payment_detail__fee_plan__standard_fee__fee_type__name'),
            amount_sum=Sum('amount')
        ).values('fee_type_name', 'amount_sum')

        if additional_charge_data:
            for row_data in data:
                for additional_row in additional_charge_data:
                    if row_data['fee_type_name'] == additional_row['fee_type_name']:
                        row_data['amount'] += float(additional_row['amount_sum'])

    term_wise_data = list(term_wise_payment_details.values())
    if application:
        if collected_by_user:
            application = application.filter(user__in=collected_by_user)
        applicationData = application.values('name','mode_of_payment','amount_paid','student__is_active')
        applnpayment_details={}
        applnmode_of_payment_details={}
        for info in applicationData:
            if info['mode_of_payment'] not in applnmode_of_payment_details:
                applnmode_of_payment_details[info['mode_of_payment']] = {'mode_of_payment':info['mode_of_payment'],
                                                                             'amount':0,'is_active':info['student__is_active']}
            if (self.request.GET.get('download_pdf') or self.request.GET.get('download_excel')):
                if info['student__is_active']:
                    applnmode_of_payment_details[info['mode_of_payment']]['amount']+=info['amount_paid']
            else:
                applnmode_of_payment_details[info['mode_of_payment']]['amount']+=info['amount_paid']
            if info['name'] not in applnpayment_details:
                applnpayment_details[info['name']] = {'fee_type_name':info['name'],
                                                                             'amount':0}
            applnpayment_details[info['name']]['amount']+=info['amount_paid']
        applicationData = list(applnpayment_details.values())
        appln_mode_of_payment_data = list(applnmode_of_payment_details.values())    
    if misc:
        if collected_by_user:
            misc = misc.filter(miscellaneous__user__in=collected_by_user)
        miscData = misc.values('misc__misc_type__name','amount','miscellaneous__mode_of_payment','miscellaneous__is_active')
        miscpayment_details={}
        miscmode_of_payment_details={}
        for info in miscData:
            if info['miscellaneous__mode_of_payment'] not in miscmode_of_payment_details:
                miscmode_of_payment_details[info['miscellaneous__mode_of_payment']] = {'mode_of_payment':info['miscellaneous__mode_of_payment'],
                                                                             'amount':0,'is_active':info['miscellaneous__is_active']}
            if (self.request.GET.get('download_pdf') or self.request.GET.get('download_excel')):
                if info['miscellaneous__is_active']:
                    miscmode_of_payment_details[info['miscellaneous__mode_of_payment']]['amount']+=info['amount']
            else:
                miscmode_of_payment_details[info['miscellaneous__mode_of_payment']]['amount']+=info['amount']
            if info['misc__misc_type__name'] not in miscpayment_details:
                miscpayment_details[info['misc__misc_type__name']] = {'fee_type_name':info['misc__misc_type__name'],
                                                                             'amount':0}
            miscpayment_details[info['misc__misc_type__name']]['amount']+=info['amount']
        miscData = list(miscpayment_details.values())
        misc_mode_of_payment_data = list(miscmode_of_payment_details.values())
    fee_adv_qs = _get_cashbook_fee_advance_queryset(self, cashbook_total=cashbook_total)
    if fee_adv_qs is not None:
        fee_adv_fee_type_rows = []
        for row in fee_adv_qs.values('fee_advance_type__name').annotate(total=Sum('amount')):
            name = row['fee_advance_type__name'] or 'Fee Advance'
            fee_adv_fee_type_rows.append({'fee_type_name': name, 'amount': row['total'] or 0})
        if fee_adv_fee_type_rows:
            data = list(data) + fee_adv_fee_type_rows
    report = list(chain(applicationData, data, miscData))
    mode_of_payment_report = list(chain(appln_mode_of_payment_data, mode_of_payment_data, misc_mode_of_payment_data))
    mode_of_payment_report_dict={}
    for datas in mode_of_payment_report:
        if datas['mode_of_payment'] not in mode_of_payment_report_dict:
            mode_of_payment_report_dict[datas['mode_of_payment']] = {
                'mode_of_payment':datas['mode_of_payment'],'amount':0,'label':datas['mode_of_payment']
            }
        mode_of_payment_report_dict[datas['mode_of_payment']]['amount'] +=datas['amount']
    if fee_adv_qs is not None:
        for row in fee_adv_qs.values('mode_of_payment').annotate(total=Sum('amount')):
            m = row['mode_of_payment'] or 'Not Specified'
            if m not in mode_of_payment_report_dict:
                mode_of_payment_report_dict[m] = {
                    'mode_of_payment': m, 'amount': 0, 'label': m
                }
            mode_of_payment_report_dict[m]['amount'] += row['total'] or 0
    mode_of_payment_report_list = mode_of_payment_report_dict.values()
    bank_wise_summary_list = list(bank_wise_summary.values())
    return {
        'fee_type_summary':report,
        'mode_of_payment_summary':mode_of_payment_report_list,
        'term_wise_summary':term_wise_data,
        'bank_wise_summary':bank_wise_summary_list,
        'fee_summary_report_data': fee_summary_report_data,  # build for lourdes to show fee groupwise and standard groupwsise summary
    }

def get_cashbook_report(self, total=False):
    is_hide_misc_from_cashbook = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'hide_miscellaneous')
    cashbook_feecollection_wise = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'cashbook_feecollection_wise')
    is_active_true_false = 0 if self.request.GET.get('is_active')=='false' else 1
    download_excel = self.request.GET.get('download_excel')
    download_pdf = self.request.GET.get('download_pdf')
    academic_year = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard').split(',') if self.request.GET.get('standard') else None
    misc_ids = self.request.GET.get('misc').split(',') if self.request.GET.get('misc') else None
    standard_section = self.request.GET.get('standard_section').split(',') if self.request.GET.get('standard_section') else None
    section = self.request.GET.get('section').split(',') if self.request.GET.get('section') else None
    application_ids = self.request.GET.get('application').split(',') if self.request.GET.get('application') else None
    fee_ids = [int(fee) for fee in self.request.GET.get('fees').split(',')] if self.request.GET.get('fees') else None
    fee_category_ids = [int(fee) for fee in self.request.GET.get('fee_category_ids').split(',')] if self.request.GET.get('fee_category_ids') else None
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    type_name = self.request.GET.get('type_name')
    get_groupwise = self.request.GET.get('get_groupwise')
    collected_by_user = self.request.GET.get('collected_by_user').split(',') if self.request.GET.get('collected_by_user') else None
    mode_of_payment = self.request.GET.get('mode_of_payment').split(',') if self.request.GET.get('mode_of_payment') else None
    student_type = self.request.GET.get('student_type')
    branch = self.request.GET.get('branch')
    payment_filter = {}
    deleted_payment_filter ={}
    application_filter = {}
    misc_filter = {}
    misc_exclude_filter = {'misc__misc_type__code_name': 'hide_from_cashbook'}
    payment = None
    misc = None
    application = None
    fee_type_label = 'Fee Type'
    fee_type_key = 'fee_type_name'
    show_application = True
    show_payment = True
    show_misc = True
    enrollment_mapping = {}
    if get_groupwise:
        fee_type_label = 'Fee Group Name'
        fee_type_key = 'fee_group_name'
    if fee_category_ids:
        payment_filter['category__in'] = fee_category_ids
    if academic_year:
        payment_filter['fee_plan__standard_fee__academic_year'] = academic_year
        application_filter['student__entry_academic_year'] = academic_year
        misc_filter['misc__academic_year'] = academic_year
    if standard:
        payment_filter['fee_plan__standard_fee__standard__in'] = standard
        application_filter['student__current_standard__in'] = standard
        misc_filter['miscellaneous__student__current_standard__in'] = standard
    if standard_section:
        student_ids = list(Enrollment.objects.filter(standard_section__in=standard_section).values_list('student_id', flat=True))
        payment_filter['fee_collection__student__in'] = student_ids
        application_filter['student__in'] = student_ids
        misc_filter['miscellaneous__student__in'] = student_ids
    if section and standard and academic_year:
        student_ids = list(Enrollment.objects.filter(standard_section__academic_year=academic_year,standard_section__standard__in=standard,standard_section__section__in=section).values_list('student_id', flat=True))
        payment_filter['fee_collection__student__in'] = student_ids
        application_filter['student__in'] = student_ids
        misc_filter['miscellaneous__student__in'] = student_ids
    if branch:
        payment_filter['fee_plan__standard_fee__standard__branch__in'] = branch
        application_filter['student__current_standard__branch__in'] = branch
        misc_filter['miscellaneous__student__current_standard__branch__in'] = branch
    if mode_of_payment:
        mode_of_payments_list = FeeCollectionModeOfPayment.objects.filter(mode_of_payment__in=mode_of_payment).values('fee_collection_id')
        mode_of_payment_fee_collection=[payment['fee_collection_id'] for payment in mode_of_payments_list]
        mode_of_payment_fee_collection = list(set(mode_of_payment_fee_collection))
        payment_filter['fee_collection__in'] = mode_of_payment_fee_collection
        application_filter['mode_of_payment__in'] = mode_of_payment
        misc_filter['miscellaneous__mode_of_payment__in'] = mode_of_payment
    if from_date and to_date:
        payment_filter['fee_collection__transaction_date__range'] = (from_date, to_date)
        from_date_datetime=datetime.strptime(from_date,'%Y-%m-%d')
        to_date_datetime=datetime.strptime(to_date,'%Y-%m-%d')
        deleted_payment_filter['fee_collection__fee_collection_delete_tracking_fee_collection__created__range'] = (datetime.combine(from_date_datetime, datetime.min.time()), datetime.combine(to_date_datetime, datetime.max.time()))
        application_filter['transaction_date__range'] = (from_date, to_date)
        misc_filter['miscellaneous__date__range'] = (from_date, to_date)
    if student_type and student_type == 'old_student' or student_type == 'new_student':
        is_new_student = False if student_type == 'old_student' else True
        payment_filter['fee_collection__student__is_new_student'] = is_new_student
        application_filter['student__student__is_new_student'] = is_new_student
        misc_filter['miscellaneous__student__is_new_student'] = is_new_student
    show_payment = show_misc = show_application = True
    if application_ids:
        if not fee_ids:
            show_payment = False
        if not misc_ids:
            show_misc = False
    if misc_ids:
        if not fee_ids:
            show_payment = False
        if not application_ids:
            show_application = False
        misc_filter['misc__misc_type__in'] = misc_ids
    if fee_ids:
        if not misc_ids:
            show_misc = False
        if not application_ids:
            show_application = False
        payment_filter['fee_plan__standard_fee__fee_type__in'] = fee_ids
    if type_name:
        type_id = self.request.GET.get('type_id')
        if type_name == 'application':
            show_payment = show_misc = None
        elif type_name == 'fees':
            show_application = show_misc = None
            payment_filter['fee_plan__standard_fee__fee_type'] = type_id
        elif type_name == 'misc':
            if type_id:
                misc_filter['misc__misc_type'] = type_id
            show_payment = show_application = None
    if show_payment and (download_excel or download_pdf) and not total:
        payment = self.get_queryset().filter(Q(**payment_filter)|Q(**deleted_payment_filter))
    elif show_payment:
        payment_filter['fee_collection__is_active']= False if self.request.GET.get('is_active') and self.request.GET.get('is_active') == 'false' else True
        payment = self.get_queryset().filter(**payment_filter)
    if show_misc and (download_excel or download_pdf):
        misc = MiscellaneousPayment.objects.filter(**misc_filter).exclude(**misc_exclude_filter)
    elif show_misc:
        misc_filter['miscellaneous__is_active'] = False if self.request.GET.get('is_active') and self.request.GET.get('is_active') == 'false' else True
        misc = MiscellaneousPayment.objects.filter(**misc_filter).exclude(**misc_exclude_filter)
    if show_application:
        application_filter['student__is_active'] = False if self.request.GET.get('is_active') and self.request.GET.get('is_active') == 'false' else True
        application = ApplicationPaymentDetail.objects.filter(**application_filter)
    if is_hide_misc_from_cashbook:
        misc = []
    if total:
        data = get_cashbook_total_report(
            self, payment, application, misc, mode_of_payment, collected_by_user, from_date, to_date, cashbook_total=True
        )
    else:
        pagination = False if (download_excel or download_pdf or cashbook_feecollection_wise) else True
        data_total = get_cashbook_total_report(
            self, payment, application, misc, mode_of_payment, collected_by_user, cashbook_total=False
        )
        data = get_cashbook_report_detail(
            self, payment, application, misc, mode_of_payment, pagination,
            {'collected_by_user': collected_by_user}, cashbook_total=False,
        )
        retreived_student_ids = [stu['student'] for stu in data['data_list']]
        enrollment_data = Enrollment.objects.filter(student__in=retreived_student_ids).values(
            'standard_section__standard', 'standard_section__section', 'student_id', 'standard_section',
            'standard_section__standard__name', 'standard_section__section__name'
        )
        for enrollment in enrollment_data:
            if enrollment['standard_section'] not in enrollment_mapping:
                if enrollment['student_id']  not in enrollment_mapping:
                    enrollment_mapping[enrollment['student_id']] = {}
                enrollment_mapping[enrollment['student_id']][enrollment['standard_section__standard']] = {
                    'standard_name': enrollment['standard_section__standard__name'],
                    'section_name': enrollment['standard_section__section__name'],
                    'standard_section': enrollment['standard_section']
                }
    inst_obj = InstituteSerializer(Institute.get_institute(self)).data
    if download_pdf and total:
        default = 'default_cashbook_summary_report.html'
        data['from_date']=datetime.strptime(from_date,'%Y-%m-%d')
        data['to_date']=datetime.strptime(to_date,'%Y-%m-%d')
        selected_template, number_of_copies = get_selected_template(self, 'cashbook_summary_report', 'pdf', default)
        data['institute'] = Institute.get_institute(self)
        path = 'cashbook_summary_report/'+selected_template
        response = PDFService.receipt_new(self, data, 'cashbook_summary_report', path,False)
        return response
    elif (download_pdf or cashbook_feecollection_wise) and not total:
        default = 'default_cashbook_report.html'
        selected_template, number_of_copies = get_selected_template(self, 'cashbook_report', 'pdf', default)
        data['institute'] = Institute.get_institute(self)
        path = 'cashbook_report/'+selected_template
        data['receipt_wise']={}
        data['from_date']=datetime.strptime(from_date,'%Y-%m-%d')
        data['to_date']=datetime.strptime(to_date,'%Y-%m-%d')
        data['login_staff_name'] =  get_full_name(self.request.user.staff.first_name, self.request.user.staff.middle_name, self.request.user.staff.last_name) if self.request.user and self.request.user.staff else self.request.user.username
        data['summary'] = {'total_paid_amount': 0}
        for index,payment in enumerate(data['data_list']):
            if index==0:
                temp_receipt_num = payment['receipt_num']
            payment['section_name'] = ''
            if ('student' in payment and payment['student'] in enrollment_mapping) and ('standard' in payment and  payment['standard'] in enrollment_mapping[payment['student']]):
                payment['section_name'] = enrollment_mapping[payment['student']][payment['standard']]['section_name']
            if 'is_active' not in payment or payment['is_active']:
                if payment['receipt_num'] not in data['receipt_wise']:
                    print(payment, 'payment ')
                    data['receipt_wise'][payment['receipt_num']]={}
                    data['receipt_wise'][payment['receipt_num']].update(payment)
                    data['receipt_wise'][payment['receipt_num']]['total_amount']=0
                    data['receipt_wise'][payment['receipt_num']]['total_discount']=0
                    dt = datetime.strptime(payment['date'], "%d-%m-%Y")
                    # Convert to yyyy-mm-dd
                    new_date_str = dt.strftime("%Y-%m-%d")
                    data['receipt_wise'][payment['receipt_num']]['date']=new_date_str
                    data['receipt_wise'][payment['receipt_num']]['receipt_num']=payment['receipt_num']
                    data['receipt_wise'][payment['receipt_num']]['full_name']=payment['full_name']
                    data['receipt_wise'][payment['receipt_num']]['student_first_name']=payment['student_first_name']
                    data['receipt_wise'][payment['receipt_num']]['student_middle_name']=payment['student_middle_name']
                    data['receipt_wise'][payment['receipt_num']]['student_last_name']=payment['student_last_name']
                    data['receipt_wise'][payment['receipt_num']]['standard_name']=payment['standard_name']
                    data['receipt_wise'][payment['receipt_num']]['discount']=payment['discount'] if 'discount' in payment else ''
                    data['receipt_wise'][payment['receipt_num']]['mode_of_payment']=''
                    data['receipt_wise'][payment['receipt_num']]['admission_num']=payment['admission_num']
                    data['receipt_wise'][payment['receipt_num']]['discount_reason']=payment['discount_reason'] if 'discount_reason' in payment else ''
                    data['receipt_wise'][payment['receipt_num']]['collected_user_full_name']=payment['collected_user_full_name']
                    data['receipt_wise'][payment['receipt_num']]['ref_number']= ''
                    data['receipt_wise'][payment['receipt_num']]['ref_number_note']= ''
                    data['receipt_wise'][payment['receipt_num']]['payment_note']= payment['fee_collection__payment_note'] if 'fee_collection__payment_note' in payment else ''
                    data['receipt_wise'][payment['receipt_num']]['fee_type_name']= payment['fee_type_name'] if 'fee_type_name' in payment and payment ['fee_type_name'] else ''
                    data['receipt_wise'][payment['receipt_num']]['section_name']= payment['section_name']
                    data['receipt_wise'][payment['receipt_num']]['fee_collection__payment_note']=payment['fee_collection__payment_note'] if 'fee_collection__payment_note' in payment else ''
                    data['receipt_wise'][payment['receipt_num']]['is_active']=payment['is_active']
                    if 'mode_of_payment_list' in payment:
                        for mode_of_payments in payment['mode_of_payment_list']:
                            if len(payment['mode_of_payment_list'])>1:
                                if mode_of_payment:
                                    if mode_of_payments['mode_of_payment'] in mode_of_payment:
                                        data['receipt_wise'][payment['receipt_num']]['mode_of_payment']+=mode_of_payments['mode_of_payment']+"("+str(mode_of_payments['amount'])+")\n"
                                        data['receipt_wise'][payment['receipt_num']]['ref_number']+= str(mode_of_payments['payment_ref_num'])+"\n"
                                else:
                                    data['receipt_wise'][payment['receipt_num']]['mode_of_payment']+=mode_of_payments['mode_of_payment']+"("+str(mode_of_payments['amount'])+")\n"
                                    data['receipt_wise'][payment['receipt_num']]['ref_number']+= str(mode_of_payments['payment_ref_num'])+"\n"
                            else:
                                data['receipt_wise'][payment['receipt_num']]['mode_of_payment']=mode_of_payments['mode_of_payment']
                                data['receipt_wise'][payment['receipt_num']]['ref_number']=mode_of_payments['payment_ref_num']
                        data['receipt_wise'][payment['receipt_num']]['mode_of_payment_list']=payment['mode_of_payment_list']
                    else:
                        data['receipt_wise'][payment['receipt_num']]['mode_of_payment']=payment['mode_of_payment']
                        if 'payment_ref_num' in payment:
                            data['receipt_wise'][payment['receipt_num']]['ref_number']=payment['payment_ref_num']
                        elif 'ref_num' in payment:
                            data['receipt_wise'][payment['receipt_num']]['ref_number']=payment['ref_num']
                    note = payment.get('fee_collection__payment_note')
                    data['receipt_wise'][payment['receipt_num']]['ref_number_note'] = (
                        f"{data['receipt_wise'][payment['receipt_num']]['ref_number']}\n({note})" if note else
                        str(data['receipt_wise'][payment['receipt_num']]['ref_number'])
                    )
                if mode_of_payment:
                    if 'mode_of_payment_list' in payment and len(payment['mode_of_payment_list'])>1:
                        if temp_receipt_num != payment['receipt_num'] or index==0:
                            for mode_of_payments in payment['mode_of_payment_list']:
                                if mode_of_payments['mode_of_payment'] in mode_of_payment:
                                    data['receipt_wise'][payment['receipt_num']]['total_amount']+=mode_of_payments['amount']
                                    data['summary']['total_paid_amount'] += mode_of_payments['amount']
                                    temp_receipt_num = payment['receipt_num']
                    else:
                        data['receipt_wise'][payment['receipt_num']]['total_amount']+=payment['amount_paid']
                        data['summary']['total_paid_amount'] += payment['amount_paid']    
                else:
                    data['receipt_wise'][payment['receipt_num']]['total_amount']+=payment['amount_paid']
                    data['summary']['total_paid_amount'] += payment['amount_paid']
                data['receipt_wise'][payment['receipt_num']]['amount_paid']=data['receipt_wise'][payment['receipt_num']]['total_amount']
                data['receipt_wise'][payment['receipt_num']]['total_discount']+=payment['discount'] if 'discount' in payment else 0
        data['receipt_wise']=data['receipt_wise'].values()
        data['mode_of_payment_summary'] = data_total['mode_of_payment_summary']
        if download_pdf:
            data['institute'] = Institute.get_institute(self)
            #Drag and drop design template check
            designtemplatecheck = SharedService.prepare_pdf(key='cashbook_report', data=data)
            if designtemplatecheck == False:
                response = PDFService.receipt_new(self, data, 'cashbook_report', path,False)
            else:
                response = designtemplatecheck
            return response
    if not total and cashbook_feecollection_wise:
        data['data_list'] = data['receipt_wise']
    if download_excel and not total:
        options={}
        options['title'] = 'Cashbook Report'
        options['description'] = 'Cashbook Report'
        options['extraWorksheet'] = False
        options['Data'] = data['data_list']
        options['extraWorksheetData'] = dict()
        options['columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },{
                'column': 'Student Name', 'required': False, 'schemacolumn': 'full_name'
            },{
                'column': 'Academic Year', 'required': False, 'schemacolumn': 'academic_year_value'
            },{
                'column': 'Transaction Date', 'required': False, 'schemacolumn': 'date'
            },{
                'column': fee_type_label, 'required': False, 'schemacolumn': fee_type_key
            },{
                'column': 'Amount Paid', 'required': False, 'schemacolumn': 'amount_paid'
            },{
                'column': 'Mode Of Payment', 'required': False, 'schemacolumn': 'mode_of_payment'
            },{
                'column': 'Receipt No', 'required': False, 'schemacolumn': 'receipt_num'
            },{
                'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
            },{
                'column': 'Branch Name', 'required': False, 'schemacolumn': 'branch_name'
            },{
                 'column': 'Discount', 'required': False, 'schemacolumn': 'discount'
            },{
                 'column': 'Discount Reason', 'required': False, 'schemacolumn': 'discount_reason'
            },{
                'column': 'Collected By', 'required': False, 'schemacolumn': 'collected_user_full_name'
            },{
                'column': 'Admission No ', 'required': False, 'schemacolumn': 'admission_num'
            },{
                'column': 'Payment Reference Number', 'required': False, 'schemacolumn': 'ref_number'
            },{
                'column': 'Student Type', 'required': False, 'schemacolumn': 'student_type_name'
            },{
                'column': 'Terms', 'required': False, 'schemacolumn': 'term_name'
            },{
                'column': 'Comments', 'required': False, 'schemacolumn': 'deleted_comments'
            }
        ]
        options['misc_columns'] = [
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },{
                'column': 'Student Name', 'required': False, 'schemacolumn': 'full_name'
            },
            {
                'column': 'Academic Year', 'required': False, 'schemacolumn': 'academic_year_value'
            },{
                'column': 'Transaction Date', 'required': False, 'schemacolumn': 'date'
            },{
                'column': 'Misc Type', 'required': False, 'schemacolumn': 'fee_type_name'
            },{
                'column': 'Amount Paid', 'required': False, 'schemacolumn': 'amount_paid'
            },{
                'column': 'Mode Of Payment', 'required': False, 'schemacolumn': 'mode_of_payment'
            },{
                'column': 'Receipt No', 'required': False, 'schemacolumn': 'receipt_num'
            },{
                'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard_name'
            },{
                'column': 'Collected By', 'required': False, 'schemacolumn': 'collected_user_full_name'
            },{
                'column': 'Admission No ', 'required': False, 'schemacolumn': 'admission_num'
            },{
                'column': 'Payment Reference Number', 'required': False, 'schemacolumn': 'ref_number'
            },{
                'column': 'Student Type', 'required': False, 'schemacolumn': 'student_type_name'
            }
        ]
        options['Data']=[]
        for payment in data['data_list']:
            options['Data'].append(payment) if 'is_active' in payment and payment['is_active'] == is_active_true_false else None
        report_data = {}
        report_data['columns']=[
            {
                'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
            },{
                'column': 'Mode Of Payment', 'required': False, 'schemacolumn': 'mode_of_payment'
            },
            {
                'column': 'Total Amount', 'required': False, 'schemacolumn': 'amount'
            },
        ]
        report_data['rows']=data_total['mode_of_payment_summary']
        total_column_data = {'amount_paid':{'value':data['total_amount']}, 'fee_type_name': {'value': 'Total Amount'}} #change this to custom
        inst_obj = InstituteSerializer(Institute.get_institute(self)).data
        if inst_obj['code'] == 'jnanajyothi':
            options['Data']=data['data_list']
            return download_excel_for_jnanajyothi(self, options, from_date, to_date)
        # if 'report_data' in data:
            # report_data['rows'] = data['report_data'] nikhil change this  later
            # report_data['columns'] = [{
            #     'column': 'Name',
            #     'schemacolumn': 'name'
            # },{
            #     'column': 'Total Amount',
            #     'schemacolumn': 'total_amount'
            # }]
            # pass
        return write_to_excel_new(self, options, report_data, total_column_data)
    if not total and cashbook_feecollection_wise:
        return_data, count, next_page, previous_page = SharedService.custom_pagination(self, list(data['receipt_wise']), self.request.GET.get('limit'),
                                                                              self.request.GET.get('pageno'))
        data = {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': return_data, 'user_list': data['collected_by_user_list']}
    return {'data': data}


def get_cashbook_report_fy_wise(self):

    financial_year_id = self.request.GET.get('financial_year')
    if not financial_year_id:
        raise exceptions.ValidationError('financial_year is mandatory')

    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id, is_active=True)
    except FinancialYear.DoesNotExist:
        raise exceptions.ValidationError('Invalid financial_year')

    start_date = financial_year.start_date
    end_date = financial_year.end_date

    months = []
    current = date(start_date.year, start_date.month, 1)
    while current <= end_date and len(months) < 12:
        months.append(current)
        if current.month == 12:
            current = date(current.year + 1, 1, 1)
        else:
            current = date(current.year, current.month + 1, 1)

    is_hide_misc_from_cashbook = FormdefinitionService.get_formdefintion_data(
        self, 'fee_configurations', 'hide_miscellaneous'
    )

    is_active_true_false = 0 if self.request.GET.get('is_active') == 'false' else 1

    from collections import defaultdict
    amounts_by_date = defaultdict(float)

    payment_qs = PaymentDetail.objects.filter(
        fee_collection__transaction_date__range=(start_date, end_date),
        fee_collection__is_active=is_active_true_false
    )
    payments_by_date = payment_qs.values('fee_collection__transaction_date').annotate(
        total_amount=Sum('amount_paid')
    )
    for row in payments_by_date:
        dt = row['fee_collection__transaction_date']
        amounts_by_date[dt] += float(row['total_amount'] or 0)

    application_qs = ApplicationPaymentDetail.objects.filter(
        transaction_date__range=(start_date, end_date)
    )
    if self.request.GET.get('is_active') is not None:
        application_qs = application_qs.filter(student__is_active=is_active_true_false)
    applications_by_date = application_qs.values('transaction_date').annotate(
        total_amount=Sum('amount_paid')
    )
    for row in applications_by_date:
        dt = row['transaction_date']
        amounts_by_date[dt] += float(row['total_amount'] or 0)

    if not is_hide_misc_from_cashbook:
        misc_qs = MiscellaneousPayment.objects.filter(
            miscellaneous__date__range=(start_date, end_date)
        )
        if self.request.GET.get('is_active') is not None:
            misc_qs = misc_qs.filter(miscellaneous__is_active=is_active_true_false)

        misc_by_date = misc_qs.values('miscellaneous__date').annotate(
            total_amount=Sum('amount')
        )
        for row in misc_by_date:
            dt = row['miscellaneous__date']
            amounts_by_date[dt] += float(row['total_amount'] or 0)

    report_rows = []
    monthly_totals = [0 for _ in months]

    for day in range(1, 32):
        row_amounts = []
        row_total = 0

        for idx, month_start in enumerate(months):
            year = month_start.year
            month = month_start.month
            try:
                current_date = date(year, month, day)
            except ValueError:
                amount = 0
            else:
                if current_date < start_date or current_date > end_date:
                    amount = 0
                else:
                    amount = amounts_by_date.get(current_date, 0)

            row_amounts.append(amount)
            monthly_totals[idx] += amount
            row_total += amount

        report_rows.append({
            'day': day,
            'amounts': row_amounts,
            'total': row_total,
        })

    grand_total = sum(monthly_totals)

    month_labels = [m.strftime('%b') for m in months]

    inst_obj = InstituteSerializer(Institute.get_institute(self)).data
    context = {
        'institute': inst_obj,
        'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
        'month_labels': month_labels,
        'report_rows': report_rows,
        'monthly_totals': monthly_totals,
        'grand_total': grand_total,
    }

    default = 'cordial_cashbook_report_fy_wise.html'
    selected_template, number_of_copies = get_selected_template(
        self,
        'cashbook_report_fy_wise',
        'pdf',
        default
    )
    path = 'cashbook_report_fy_wise/' + selected_template
    response = PDFService.receipt_new(self, context, 'cashbook_report_fy_wise', path, False)
    return response


def get_cashbook_fee_type(self):
    response = SharedService.read_data(self, True)
    for fee in response['data']:
        if fee['codename'] == 'application':
            fee.update({'type_name': 'application'})
        else:
            fee.update({'type_name': 'fees'})
    misc = MiscellaneousType.objects.filter(is_active=True)
    misc = MiscellaneousTypeSerializer(misc, many=True).data
    for fee in misc:
        fee.update({'type_name': 'misc'})
    response['data'] += misc
    return response

def override_queryset():
    return Expense.objects.all()

def get_balance_report(self):
    cashbook_data = get_cashbook_report(self, True)
    collection = 0
    expense = 0
    for cash in cashbook_data['data']['fee_type_summary']:
        collection += cash['amount']
    self.serializer_class = ExpenseSerializer
    self.get_queryset = override_queryset
    self.queryset = Expense.objects.filter(is_active=True)
    expense_data = get_expense_report(self, True, self.request.GET.get('from_date'), self.request.GET.get('to_date'), 1)
    for temp in expense_data:
        expense += temp['total_amount']
    return {'data': {'collection': collection, 'expense': expense, 'total': collection - expense}}

def get_student_fee_report(self):
    academicYear = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard')
    student = self.get_object()
    fee_collection_history={}
    feeData = calculations.fee_calculation(self, student.pk, academicYear, standard, returnValue=True, termDivision=True)
    fee_type_wise_collection = {}
    for fee in feeData['data']:
        for terms in fee['standard_fee']:
            if 'pending_amount' in terms and terms['pending_amount'] > 0:
                terms.update(
                    {'payment_end_date': datetime.strptime(terms['payment_end_date'], "%Y-%m-%d").strftime('%d/%m/%Y')})
            if 'payment_detail' in terms:
                for payment_detail in terms['payment_detail']:
                    payment_detail['transaction_date'] = payment_detail['transaction_date'].strftime('%Y-%m-%d')
                    if payment_detail['fee_collection__receipt_num'] not in fee_collection_history:
                        fee_collection_history[payment_detail['fee_collection__receipt_num']] = {
                            'receipt_num': payment_detail['fee_collection__receipt_num'],
                            'transaction_date': payment_detail['transaction_date'], 'total_amount': 0,
                            'mode_of_payment':payment_detail['mode_of_payment'], 'fee_term_type':[],
                            'transaction_date_str': payment_detail['transaction_date_str']
                        }
                    fee_collection_history[payment_detail['fee_collection__receipt_num']]['fee_term_type'].append({'fee_type':payment_detail['fee_type'],'fee_type_name':payment_detail['fee_type_name'],'fee_term':payment_detail['fee_term'],
                                                                                                                'total_term_amount':payment_detail['total_term_amount'],'amount_paid':payment_detail['amount_paid']})
                    fee_collection_history[payment_detail['fee_collection__receipt_num']]['total_amount'] += payment_detail['amount_paid']
                    if payment_detail['fee_collection'] not in fee_type_wise_collection:
                        fee_type_wise_collection[payment_detail['fee_collection']] = {}
                    if payment_detail['fee_type'] not in fee_type_wise_collection[payment_detail['fee_collection']]:
                        fee_type_wise_collection[payment_detail['fee_collection']][payment_detail['fee_type']] = {'total_amount': 0,**payment_detail}
                    fee_type_wise_collection[payment_detail['fee_collection']][payment_detail['fee_type']]['total_amount'] += payment_detail['amount_paid']
    for fee_collection in fee_type_wise_collection:
        fee_type_wise_collection[fee_collection] = fee_type_wise_collection[fee_collection].values()
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    student_details = StudentStandardMapping.objects.filter(academic_year=academicYear, standard=standard,
                                                                     student=student).first()
    student_parent_details = StudentParentMapping.objects.filter(student=student).values('parent__father_name','parent__mother_name').first()
    student_admission_number = AdmissionForm.objects.filter(student=student).values('admission_num').first()
    try:#when lkg, ukg kind of data comes
        standard_name = int(''.join(filter(str.isdigit, student_details.standard.name)))
    except:
        standard_name = student_details.standard.name
    branch_name = ''
    branch_code = ''
    if student_details.standard.branch:
        branch_name = student_details.standard.branch.name
        branch_code = student_details.standard.branch.code
    data = {'student': student, 'data': feeData['data'], 'today': today, 'total_amount': feeData['total_amount'],
            'total_payable_amount': feeData['total_amount'] - feeData['concession_amount'] - feeData['total_adjusted_amount'] + feeData['total_fine_amount'],
            'total_concession_amount': feeData['concession_amount'], 'total_adjusted_amount': feeData['total_adjusted_amount'],
            'paid_amount': feeData['total_paid_amount'], 'amount': feeData['amount'], 'total_fine_amount': feeData['total_fine_amount'],'student_admission_number':student_admission_number,
            'pending_amount': feeData['total_pending_amount'], 'institute': Institute.get_institute(self, [standard]),'student_parent_details':student_parent_details,
            'student_details': student_details, 'standard_name': standard_name, 'branch_name': branch_name, 'branch_code': branch_code,'fee_data':feeData['data'],'fee_collection_history':fee_collection_history.values(),
            'fee_type_wise_collection':fee_type_wise_collection.values()}
    data['total_row_span'] = 2
    data['total_row_span_pending'] = 1
    if data['total_concession_amount'] and data['total_adjusted_amount']:
        data['total_row_span'] = 4
        data['total_row_span_pending'] = 3
    elif data['total_concession_amount'] or data['total_adjusted_amount']:
        data['total_row_span'] = 3
        data['total_row_span_pending'] = 2
    selected_template, number_of_copies = get_selected_template(self, 'fee_collection_report', 'pdf', 'feesReport.html')
    path = 'fee_collection_reports/'+selected_template

    #Drag and drop design template check
    designtemplatecheck = SharedService.prepare_pdf(key='fee_collection_report', data=data)
    if designtemplatecheck == False:
        response = PDFService.receipt(self, data, student.first_name, path)
    else:
        response = designtemplatecheck
    
    return response

def handle_gurukula_reciept(self, fee_collection_details):
    fee_plan = {}
    isDFFees = False
    isAdmissionFees = False
    months = []
    if 'payment_detail' in fee_collection_details:
        fee_collection_details['invoice_list'] = []
        for payment in fee_collection_details['payment_detail']:
            is_new_student = True
            if not fee_collection_details['student_detail']['is_new_student']:
                is_new_student = False
            if (payment['standard_fee_id'] in fee_collection_details['fee_plan_mapping_data']):
                for fee_plan_data in fee_collection_details['fee_plan_mapping_data'][payment['standard_fee_id']]:
                    if (fee_plan_data['id'] == payment['fee_plan']):
                        if (len(fee_collection_details['fee_plan_mapping_data'][payment['standard_fee_id']]) > 1 ):
                            isAdmissionFees = True
                            months = []
                            if (payment['standard_fee_id'] in fee_plan):
                                payment['amount_paid'] = float(fee_plan[payment['standard_fee_id']]['amount_paid']) + float(payment['amount_paid'])
                                months = SharedService.month_names_list(fee_plan[payment['standard_fee_id']]['term_start_date'], fee_plan_data['term_end_date'])
                                payment['fee_alias'] = f'Monthly Fee {" ".join(months)}'
                                payment['amount_rate'] = round(payment['amount_paid'] / len(months) * 100) / 100
                                payment['term_start_date'] = fee_plan_data['term_start_date']
                                payment['term_end_date'] = fee_plan_data['term_end_date']
                                payment['bottom_text'] = 'Paid - MONTHLY FEE'
                            else:
                                months = SharedService.month_names_list(fee_plan_data['term_start_date'], fee_plan_data['term_end_date'])
                                payment['fee_alias'] = f'Monthly Fee {" ".join(months)}'
                                payment['amount_rate'] = round(payment['amount_paid'] / len(months) * 100) / 100
                                payment['term_start_date'] = fee_plan_data['term_start_date']
                                payment['term_end_date'] = fee_plan_data['term_end_date']
                                payment['bottom_text'] = 'Paid - MONTHLY FEE'
                        else:
                            isDFFees=True
                            payment['fee_alias'] = payment['fee_type_name']
                            payment['amount_rate'] = payment['amount_paid']
                            student_type = 'Old Student ' if not is_new_student else ' New Student'
                            payment['bottom_text'] = f'Paid - {student_type}'
                        payment['amount_in_words'] = num2words(payment['amount_paid'], lang='en') + ' Rupees'
                        fee_plan[payment['standard_fee_id']] = payment
        for temp in fee_plan:
            fee_collection_details['invoice_list'].append(fee_plan[temp])
    fee_collection_details['isDFFees'] = isDFFees
    fee_collection_details['isAdmissionFees'] = isAdmissionFees
    fee_collection_details['months'] = months
    return fee_collection_details

def handle_mahapragya(self, fee_collection_details):
    fee_type_mapping = {}
    if 'payment_detail' in fee_collection_details:
        for payment in fee_collection_details['payment_detail']:
            if payment['fee_type_name'] not in fee_type_mapping:
                fee_type_mapping[payment['fee_type_name']] = {'payment_detail': [], 'receipt_num': payment['receipt_num']}
            fee_type_mapping[payment['fee_type_name']]['payment_detail'].append(payment)
        fee_collection_details['invoice_list'] = fee_type_mapping.values()
    return fee_collection_details

def handle_pis(self, fee_collection_details):
    total_amount = fee_collection_details['total_amount']
    total_adjustment_amount = fee_collection_details['total_adjusted_amount']
    total_paid_amount = fee_collection_details['total_paid_amount']
    total_amount_dict = {"term1":0,"term2":0,"term3":0,"term4":0}
    total_adjustment_dict = {"term1":0,"term2":0,"term3":0,"term4":0}
    total_payable_dict = {"term1":0,"term2":0,"term3":0,"term4":0}
    total_paid_dict = {"term1":0,"term2":0,"term3":0,"term4":0}
    for i in range(4):
        key = 'term'+str(i+1)
        total_amount_dict[key] =  total_amount/4
    temp_adjust = total_adjustment_amount
    temp_paid = total_paid_amount
    for i in range(4):
        key = 'term'+str(i+1)
        if temp_adjust<=total_amount_dict[key]:
            total_adjustment_dict[key]=temp_adjust
        else:
            total_adjustment_dict[key]=total_amount_dict[key]
        temp_adjust = temp_adjust - total_adjustment_dict[key]
        total_payable_dict[key] = total_amount_dict[key] - total_adjustment_dict[key]
        if temp_paid<=total_payable_dict[key]:
            total_paid_dict[key]=temp_paid
        else:
            total_paid_dict[key]=total_payable_dict[key]
        temp_paid = temp_paid - total_paid_dict[key]
    return_data = {
        "term1":{'total':total_amount_dict['term1'],'adjustment':total_adjustment_dict['term1'],'payable':total_payable_dict['term1'],
                 'paid':total_paid_dict['term1']},
        "term2":{'total':total_amount_dict['term2'],'adjustment':total_adjustment_dict['term2'],'payable':total_payable_dict['term2'],
            'paid':total_paid_dict['term2']},
        "term3":{'total':total_amount_dict['term3'],'adjustment':total_adjustment_dict['term3'],'payable':total_payable_dict['term3'],
            'paid':total_paid_dict['term3']},
        "term4":{'total':total_amount_dict['term4'],'adjustment':total_adjustment_dict['term4'],'payable':total_payable_dict['term4'],
            'paid':total_paid_dict['term4']}
        
    }
    return return_data

def arrange_fee_type_wise_using_group(self,payment_detail_group_wise):
    payment_detail_type_wise={}
    for data in payment_detail_group_wise:
        for fees in payment_detail_group_wise[data]['fee_type_mapping']:
            fee_type=payment_detail_group_wise[data]['fee_type_mapping'][fees]['fee_type']
            if fee_type not in payment_detail_type_wise:
                payment_detail_type_wise[fee_type]={}
            if 'fee_type_mapping' not in payment_detail_type_wise[fee_type]:
                payment_detail_type_wise[fee_type]['fee_type_mapping']={}
                payment_detail_type_wise[fee_type]['fee_type_mapping'][fees]= payment_detail_group_wise[data]['fee_type_mapping'][fees]
            if 'fee_type_total_currently_paid' not in payment_detail_type_wise[fee_type]:
                payment_detail_type_wise[fee_type]['fee_type_total_currently_paid']=0
            if fees not in payment_detail_type_wise[fee_type]['fee_type_mapping']:
                payment_detail_type_wise[fee_type]['fee_type_mapping'][fees]= payment_detail_group_wise[data]['fee_type_mapping'][fees]
            payment_detail_type_wise[fee_type]['fee_type_total_currently_paid'] += payment_detail_group_wise[data]['fee_type_mapping'][fees]['currently_paid_amount']
            payment_detail_type_wise[fee_type]['fee_type_total_currently_paid_in_words']=f"{num2words(payment_detail_type_wise[fee_type]['fee_type_total_currently_paid'], lang='en')} Rupees"
    return payment_detail_type_wise
            
def get_fee_receipt(self, module='fee_collection', localPath=False, fee_collection=None):
    # default = 'feesReceipt' if module == 'fee_collection' else 'feesReceiptStudentCopy' #nikhil remove this once you fix the fees reciept
    default = 'gurukula_fee_receipt.html' if module == 'fee_collection' else 'gurukula_fee_receipt.html'
    fee_collection_details = get_payment_detail(self, fee_collection)['data']
    for mode_of_payment in fee_collection_details['mode_of_payment_list']:
        mode_of_payment['amount_in_words'] = num2words(mode_of_payment['amount'], lang='en')
    student_id = fee_collection_details['student']
    custom_dict = get_custom_data_for_objects(self,[{'id':student_id}],'Student',modify_existing_data=False)
    if student_id in custom_dict['custom_data_mapping']:
        fee_collection_details['student_detail']['custom_details']=custom_dict['custom_data_mapping'][student_id]['data']
    academic_year = fee_collection_details['academic_year']['academic_year']
    standard = fee_collection_details['standard']
    student_fee_summary = get_student_fee_data(self, student_id, academic_year, standard)['data']
    student_fee_summary['total_paid_amount_in_words'] = num2words(student_fee_summary['total_paid_amount'], lang='en')
    student_fee_summary['total_adjustment_till_date'] = 0
    fee_collection_history = {}
    fee_collection_history_fee_type ={}
    fee_group_wise_pending_amount = {} #used to show pending and payment for group only current transaction
    fee_group_wise_student_fee_plan = {}
    fee_plan_wise_pending={}
    fee_payment_plan_details = {}
    total_amount_paid_till_now = 0
    fee_type_fee_term_alias_mapping={}
    for fee_summary in student_fee_summary['plans']:
        fee_summary['currently_paid_amount'] = 0
        if fee_summary['fee_group'] not in fee_group_wise_pending_amount:
            fee_group_wise_pending_amount[fee_summary['fee_group']] = {
                'amount_paid': 0, 'pending_amount': 0, 'total_amount': 0, 'total_payable_amount': 0, 'amount_paid_till_date':0,
                'pending_amount_till_date':0
            }
        # transport we wont be having the pending amount
        fee_group_wise_pending_amount[fee_summary['fee_group']]['pending_amount'] += fee_summary['pending_amount'] if 'pending_amount' in fee_summary else 0
        fee_group_wise_pending_amount[fee_summary['fee_group']]['total_amount'] += fee_summary['total_amount'] if 'total_amount' in fee_summary else 0
        fee_group_wise_pending_amount[fee_summary['fee_group']]['total_payable_amount'] += fee_summary['amount'] if 'amount' in fee_summary else 0
        if fee_summary['fee_group'] not in fee_group_wise_student_fee_plan:
            fee_group_wise_student_fee_plan[fee_summary['fee_group']] = []
        fee_group_wise_student_fee_plan[fee_summary['fee_group']] += fee_summary['standard_fee']
        plans_for_feetype=[]
        fee_collection_created = datetime.strptime(fee_collection_details['created'], '%Y-%m-%dT%H:%M:%S.%f').strftime('%Y-%m-%d %H:%M:%S')
        for standard_fee in fee_summary['standard_fee']:
            if 'adjustment_list' in standard_fee:
                for adjustments in standard_fee['adjustment_list']:
                    # if 'created' in adjustments and adjustments['created']:
                    #     if adjustments['created'].strftime('%Y-%m-%d %H:%M:%S') <= fee_collection_created and not adjustments['is_addition']:
                    if 'fee_collection_id' in adjustments and adjustments['fee_collection_id'] :
                        if (adjustments['fee_collection_id'] == fee_collection_details['id'] or adjustments['created'].strftime('%Y-%m-%d %H:%M:%S') <= fee_collection_created) and not adjustments['is_addition']:
                            student_fee_summary['total_adjustment_till_date'] +=adjustments['amount']
            for concession in standard_fee['concession_list']:
                if 'created' in concession and concession['created']:
                    if concession['created'].strftime('%Y-%m-%d %H:%M:%S') <= fee_collection_created:
                        student_fee_summary['total_adjustment_till_date'] +=concession['amount']
            if standard_fee['id'] not in fee_payment_plan_details:
                fee_payment_plan_details[standard_fee['id']] = { 'amount_payable':standard_fee['amount'],'total_amount':standard_fee['total_amount'],
                                                            'adjustment_amount':standard_fee['adjustment_amount'],'no_of_terms_in_this_fee_type':len(fee_summary['standard_fee'])
                                                            ,'plan_id_list':plans_for_feetype.append(standard_fee['id']),'is_fee_type_full_amount_paid':False}
                if fee_summary['total_payable_amount'] == fee_summary['total_paid_amount']:
                    fee_payment_plan_details[standard_fee['id']]['is_fee_type_full_amount_paid'] = True
            if standard_fee['id'] not in fee_plan_wise_pending:
                fee_plan_wise_pending[standard_fee['id']] = {'amount_paid':0,'total_amount':standard_fee['amount']}
            if fee_summary['fee_type'] not in fee_collection_history_fee_type:
                fee_collection_history_fee_type[fee_summary['fee_type']]={}
                fee_collection_history_fee_type[fee_summary['fee_type']]['total_amount'] = 0
            if 'payment_detail' in standard_fee and standard_fee['payment_detail']: #Nikhil try to get fee collectioin detail directly
                for payment_detail in standard_fee['payment_detail']:
                    if payment_detail['fee_collection'] == fee_collection_details['id']:
                        fee_group_wise_pending_amount[fee_summary['fee_group']]['amount_paid'] += payment_detail['amount_paid']
                        fee_summary['currently_paid_amount'] += payment_detail['amount_paid']
                    if payment_detail['fee_collection__created'].strftime('%Y-%m-%d %H:%M:%S') <= fee_collection_created:
                        fee_plan_wise_pending[standard_fee['id']]['amount_paid'] += payment_detail['amount_paid']
                        fee_collection_history_fee_type[fee_summary['fee_type']]['total_amount'] += payment_detail['amount_paid']
                        fee_group_wise_pending_amount[fee_summary['fee_group']]['amount_paid_till_date'] += payment_detail['amount_paid']
                        total_amount_paid_till_now += payment_detail['amount_paid']
                    if payment_detail['created'].strftime('%Y-%m-%d %H:%M:%S') < fee_collection_created:
                        payment_detail['transaction_date'] = payment_detail['transaction_date'].strftime('%Y-%m-%d')
                        if payment_detail['fee_collection__receipt_num'] not in fee_collection_history:
                            fee_collection_history[payment_detail['fee_collection__receipt_num']] = {
                                'receipt_num': payment_detail['fee_collection__receipt_num'],
                                'transaction_date': payment_detail['transaction_date'], 'total_amount': 0,
                                'mode_of_payment':payment_detail['mode_of_payment'], 'fee_term_type':[],
                                'transaction_date_str': payment_detail['transaction_date_str']
                            }
                        fee_collection_history[payment_detail['fee_collection__receipt_num']]['fee_term_type'].append({'fee_type':payment_detail['fee_type'],'fee_type_name':payment_detail['fee_type_name'],'fee_term':payment_detail['fee_term'],
                                                                                                                       'total_term_amount':payment_detail['total_term_amount'],'amount_paid':payment_detail['amount_paid']})
                        fee_collection_history[payment_detail['fee_collection__receipt_num']]['total_amount'] += payment_detail['amount_paid']
        fee_group_wise_pending_amount[fee_summary['fee_group']]['pending_amount_till_date'] = fee_group_wise_pending_amount[fee_summary['fee_group']]['total_payable_amount'] - fee_group_wise_pending_amount[fee_summary['fee_group']]['amount_paid_till_date']
    student_fee_summary['total_paid_amount_till_now'] = total_amount_paid_till_now
    student_fee_summary['balance_till_date'] = (student_fee_summary['total_amount']-(student_fee_summary['total_concession_amount']+student_fee_summary['total_adjusted_amount']))-total_amount_paid_till_now
    student_fee_summary['amount_payable_till_date'] = student_fee_summary['total_amount'] - student_fee_summary['total_adjustment_till_date']
    student_fee_summary['balance_till_date_including_adjustment_till_date'] = (student_fee_summary['total_amount'] - student_fee_summary['total_adjustment_till_date'])-student_fee_summary['total_paid_amount_till_now']
    fee_collection_history = fee_collection_history.values()
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    fee_collection_details['transaction_date'] = datetime.strptime(fee_collection_details['transaction_date'], '%Y-%m-%d').strftime('%d-%m-%Y')
    fee_collection_details['payment_end_date'] = datetime.strptime(fee_collection_details['payment_end_date'], '%Y-%m-%d').strftime('%d-%m-%Y')
    fee_collection_details['paid_fee_plan_ids'] = [p['fee_plan'] for p in fee_collection_details.get('payment_detail', [])]
    fee_collection_details['paid_standard_fee_ids'] = list(set([p['standard_fee_id'] for p in fee_collection_details.get('payment_detail', [])]))
    feetypeIds = [i['fee_type'] for i in fee_collection_details['payment_detail']]
    feetypeIds = list(set(feetypeIds))
    selected_template_list=[]
    path_list=[]
    is_only_one_fee_receipt=True
    temp_dict={}
    for index,fee_types in enumerate(feetypeIds):
        fee_type_id_list=[]
        selected_templates, number_of_copies = get_selected_template(self, module, 'pdf', default, academic_year, [standard], fee_types)
        fee_type_ids = TemplateStandardMapping.objects.filter(template__name=selected_templates.replace('.html','')).values('fee_type')
        for ids in fee_type_ids:
            fee_type_id_list.append(ids['fee_type'])
        if index==0:
            first_template=selected_templates
        if selected_templates != first_template:
            is_only_one_fee_receipt=False
        if selected_templates not in temp_dict:
            temp_dict[selected_templates] = {
                'fee_type':[],
                'template':selected_templates,
                'fee_type_ids_for_template':fee_type_id_list
            }
        temp_dict[selected_templates]['fee_type'].append(fee_types)
        '''temp_dict={'fee_type':fee_types,
                    'template':selected_templates,
                    'fee_type_ids_for_template':fee_type_id_list}'''
        path_list.append('fee_reciepts/'+selected_templates)
    selected_template_list=list(temp_dict.values())
    if is_only_one_fee_receipt:
        selected_template = selected_template_list[0]["template"]
        if selected_template == 'gurukula_fee_receipt.html':
            fee_collection_details = handle_gurukula_reciept(self, fee_collection_details)
        elif selected_template == 'acharya_mahapragya.html': #fee type wise receipt
            fee_collection_details = handle_mahapragya(self, fee_collection_details)
    if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
        fee_collection_details['payment_detail_group_wise'], temp = arrange_fee_plan_group_wise(
            self, fee_collection_details['payment_detail'], fee_group_wise_pending_amount, fee_group_wise_student_fee_plan,fee_collection_created
        )
        fee_collection_details['payment_detail_fee_type_wise'] = arrange_fee_type_wise_using_group(self,fee_collection_details['payment_detail_group_wise'])
        fee_collection_details['payment_detail_group_wise'] = fee_collection_details['payment_detail_group_wise'].values()
        fee_collection_details['payment_detail_fee_type_wise'] = fee_collection_details['payment_detail_fee_type_wise'].values()
        payment_detail_group_wise = []
        for payment_detail_g in fee_collection_details['payment_detail_group_wise']:
            if 'fee_type_mapping' in payment_detail_g:
                payment_detail_g['fee_type_mapping'] = payment_detail_g['fee_type_mapping'].values()
            payment_detail_group_wise.append(payment_detail_g)
        fee_collection_details['payment_detail_group_wise'] = payment_detail_group_wise
        payment_detail_type_wise=[]
        for payment_detail_t in fee_collection_details['payment_detail_fee_type_wise']:
            if 'fee_type_mapping' in payment_detail_t:
                payment_detail_t['fee_type_mapping']=payment_detail_t['fee_type_mapping'].values()
            payment_detail_type_wise.append(payment_detail_t)
        fee_collection_details['payment_detail_fee_type_wise'] = payment_detail_type_wise
    payment_fee_types={}
    for payments in fee_collection_details['payment_detail']:
        if payments['fee_type'] not in fee_type_fee_term_alias_mapping:
            fee_type_fee_term_alias_mapping[(payments['fee_type'])]={'alias_list':[]}
        if payments['fee_payment_terms_alias'] not in fee_type_fee_term_alias_mapping[(payments['fee_type'])]:
            fee_type_fee_term_alias_mapping[(payments['fee_type'])][payments['fee_payment_terms_alias']]={}
        fee_type_fee_term_alias_mapping[(payments['fee_type'])]['alias_list'].append(payments['fee_payment_terms_alias'])
        fee_type_fee_term_alias_mapping[(payments['fee_type'])][payments['fee_payment_terms_alias']]['amount'] = payments['amount_paid']
        if payments['fee_type'] not in payment_fee_types:
            payment_fee_types[payments['fee_type']]={}
            payment_fee_types[payments['fee_type']]['fee_type']=payments['fee_type']
            payment_fee_types[payments['fee_type']]['fee_type_name']=payments['fee_type_name']
            payment_fee_types[payments['fee_type']]['fee_type_codename']=payments['fee_type_codename']
            payment_fee_types[payments['fee_type']]['amount_paid']=0
            payment_fee_types[payments['fee_type']]['pending_amount_till_date']=0
        payment_fee_types[payments['fee_type']]['amount_paid'] += payments['amount_paid']
        payment_fee_types[payments['fee_type']]['amount_paid_in_words'] = f"{num2words(payment_fee_types[payments['fee_type']]['amount_paid'], lang='en')} Rupees"
        payments['amount_payable'] = fee_payment_plan_details[payments['fee_plan']]['amount_payable']
        payments['total_amount'] = fee_payment_plan_details[payments['fee_plan']]['total_amount']
        payments['adjustment_amount'] = fee_payment_plan_details[payments['fee_plan']]['adjustment_amount']
        payment_fee_types[payments['fee_type']]['is_fee_type_full_amount_paid'] = fee_payment_plan_details[payments['fee_plan']]['is_fee_type_full_amount_paid']
        payments['is_full_term_amt_paid'] = False
        if payments['amount_payable'] == payments['amount_paid']:
            payments['is_full_term_amt_paid'] = True
        payments['pending_amount_till_date'] = fee_plan_wise_pending[payments['fee_plan']]['total_amount']-fee_plan_wise_pending[payments['fee_plan']]['amount_paid']
        payment_fee_types[payments['fee_type']]['pending_amount_till_date'] += payments['pending_amount_till_date']
    fee_collection_details['payment_detail_fee_type'] = payment_fee_types.values()
    #if not is_only_one_fee_receipt:
    fee_collection={}
    for index1,templates in enumerate(selected_template_list):
        template_fee_type=templates['fee_type']
        template=templates['template']
        template=template.replace('.html','')
        if 'payment_detail_group_wise' not in fee_collection_details:
            if template not in fee_collection_details:
                fee_collection_details[template]={}
                fee_collection_details[template]['payment_details']=[]
                fee_collection_details[template]['total_amount_paid']=0
                fee_collection_details[template]['pending_amount_till_date']=0
                fee_collection_details[template]['total_amount_pending']=0
                fee_collection_details[template]['total_amount_pending_till_date']=0
                fee_collection_details[template]['total_amount_payable']=0
                fee_collection_details[template]['payment_details_fee_type_wise']={}
        else:
            if template not in fee_collection:
                fee_collection[template]={}
        if 'payment_detail_group_wise' in fee_collection_details:
            for index,group in enumerate(fee_collection_details['payment_detail_group_wise']):
                group_list = list(fee_collection[template].keys())
                if group['fee_group'] not in group_list:
                    temp_group={}
                    temp_group['fee_group_name']=group['fee_group_name']
                    temp_group['fee_group_code_name']=group['fee_group_code_name']
                    temp_group['fee_group']=group['fee_group']
                    temp_group['fee_types']=[]
                    temp_group['fee_structure']=[]
                    temp_group['fee_type_mapping']=[]
                    temp_group['group_amount_paid']=0
                    temp_group['group_amount_pending']=0
                    temp_group['paid_amount_in_words']=''
                else:
                    for template_group in fee_collection[template]:
                        if fee_collection[template][template_group]['fee_group'] == group['fee_group']:
                            temp_group=fee_collection[template][template_group]
                temp_fee_type=[]
                temp_fee_structure=[]
                temp_fee_type_mapping=[]
                temp_group_amount_paid=0
                temp_group_amount_pending=0
                for fee_type in group['fee_types']:
                    if fee_type['fee_type'] in template_fee_type:
                        temp_fee_type.append(fee_type)
                for fee_structure in group['fee_structure']:
                    if fee_structure['fee_type'] in template_fee_type:
                        temp_fee_structure.append(fee_structure)
                for fee_type_mapping in group['fee_type_mapping']:
                    if fee_type_mapping['fee_type'] in template_fee_type:
                        temp_fee_type_mapping.append(fee_type_mapping)
                        temp_group_amount_paid+=fee_type_mapping['currently_paid_amount']
                        temp_group_amount_pending+=fee_type_mapping['pending_amount']
                temp_group['fee_types']+=temp_fee_type
                temp_group['fee_structure']+=temp_fee_structure
                temp_group['fee_type_mapping']+=temp_fee_type_mapping
                temp_group['group_amount_paid'] += temp_group_amount_paid
                temp_group['group_amount_pending'] += temp_group_amount_pending
                temp_group['paid_amount_in_words']= f"{num2words(temp_group['group_amount_paid'], lang='en')} Rupees"
                if temp_group['fee_types']:
                    fee_collection[template][temp_group['fee_group']]=copy.copy(temp_group)
            if template not in fee_collection_details:
                fee_collection_details[template]=[]
            fee_collection_details[template]=copy.copy(list(fee_collection[template].values()))
        else:
            collected_fee_types=[]
            for payment in fee_collection_details['payment_detail']:
                if payment['fee_type'] in templates['fee_type_ids_for_template']:
                    fee_collection_details[template]['total_amount_paid']+=payment['amount_paid']
                    fee_collection_details[template]['pending_amount_till_date']+=payment['pending_amount_till_date']
                    if payment['fee_type'] not in fee_collection_details[template]['payment_details_fee_type_wise']:
                        fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]={}
                        fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]['amount_paid']=0
                        fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]['fee_type_name']=payment['fee_type_name']
                        fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]['fee_type_alias_name']=payment['fee_type_alias_name']
                        fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]['fee_type_codename']=payment['fee_type_codename']
                    fee_collection_details[template]['payment_details_fee_type_wise'][payment['fee_type']]['amount_paid']+=payment['amount_paid']
                    fee_collection_details[template]['payment_details'].append(payment)
                collected_fee_types.append(payment['fee_type'])
            for summary in student_fee_summary['plans']:
                summary['pending_amount_till_date']=summary['amount']-fee_collection_history_fee_type[summary['fee_type']]['total_amount']
                if summary['fee_type'] in templates['fee_type_ids_for_template']:
                    fee_collection_details[template]['total_amount_pending']+=summary['pending_amount']
                    fee_collection_details[template]['total_amount_pending_till_date']+=summary['pending_amount_till_date']
                    fee_collection_details[template]['total_amount_payable']+=summary['amount']
                if summary['fee_type'] in collected_fee_types and summary['fee_type'] in templates['fee_type_ids_for_template']:
                    fee_collection_details[template]['payment_details_fee_type_wise'][summary['fee_type']]['is_fee_type_full_amount_paid'] = False
                    if summary['total_payable_amount'] == summary['total_paid_amount']:
                        fee_collection_details[template]['payment_details_fee_type_wise'][summary['fee_type']]['is_fee_type_full_amount_paid'] = True
                    fee_collection_details[template]['payment_details_fee_type_wise'][summary['fee_type']]['fee_type_amount'] = summary['amount']
                    fee_collection_details[template]['payment_details_fee_type_wise'][summary['fee_type']]['fee_type_amount_pending'] = summary['pending_amount']
                    fee_collection_details[template]['payment_details_fee_type_wise'][summary['fee_type']]['fee_type_amount_pending_till_date'] = summary['pending_amount_till_date']
            fee_collection_details[template]['payment_detail_fee_type']=list(fee_collection_details[template]['payment_details_fee_type_wise'].values())
            fee_collection_details[template]['amount_in_words']=f"{num2words(fee_collection_details[template]['total_amount_paid'], lang='en')} Rupees"
    data = {'fee_collection': fee_collection_details, 'today': today, 'student_fee_summary': student_fee_summary,
            'institute': Institute.get_institute(self), 'number_of_copies': range(number_of_copies),'fee_type_fee_term_alias_mapping':fee_type_fee_term_alias_mapping,
            'fee_collection_history': fee_collection_history, 'edubricz_details': {'company_name': 'Edubricz Technologies'},'today_date_time':datetime.today()}
    if is_only_one_fee_receipt:
        if selected_template == 'pis_fee_receipt.html': #fee type wise receipt
            data['auto_term_division'] = handle_pis(self, student_fee_summary)
    amount_in_words = num2words(fee_collection_details['total_amount'], lang='en')
    data['amount_in_words'] = amount_in_words
    data['amount_in_words'] += ' Rupees'
    data['amount_in_words_rupees_first']='Rupees '+ amount_in_words
    data['admission_num'] = AdmissionForm.get_student_admission_num(self, student_id)
    data['student_fee_summary']['total_concession_adjustment'] = student_fee_summary['total_concession_amount']+student_fee_summary['total_adjusted_amount']
    data['standard_name_in_roman'] = SharedService.number_to_roman(data['fee_collection']['standard_name'])
    # from django.shortcuts import render
    # return render(self.request, path, data)
    print("data", data)
    if is_only_one_fee_receipt:
        path=path_list[0]
        if selected_template == 'gurukula_fee_receipt.html':
            #Drag and drop design template check
            designtemplatecheck = SharedService.prepare_pdf(key='new_fee_receipt', data=data)
            if designtemplatecheck == False:
                response = PDFService.receipt(self, data, fee_collection_details['receipt_num'], path, localPath)
            else:
                response = designtemplatecheck
        elif selected_template == 'nightingales_fee_receipt.html':
            #Drag and drop design template check
            designtemplatecheck = SharedService.prepare_pdf(key='new_fee_receipt', data=data)
            if designtemplatecheck == False:
                response = PDFService.id_card(self, data, fee_collection_details['receipt_num'], path, localPath)
            else:
                response = designtemplatecheck
        else:
            #Drag and drop design template check
            designtemplatecheck = SharedService.prepare_pdf(key='fee_receipt', data=data)
            if designtemplatecheck == False:
                response = PDFService.receipt_new(self, data, fee_collection_details['receipt_num'], path, localPath)
            else:
                response = designtemplatecheck
    else:
        path_list=list(set(path_list))
        response = PDFService.two_receipt(self, data, fee_collection_details['receipt_num'],path_list,localPath)
    return response

"""
    mode_of_payment : Online, Offline, Cash,Cheque,CreditCard,DebitCard,NetBanking,UPIPayments
"""
def get_payments(self, academic_year=None, standard=None, student=None, exclude_fee_collection=None):
    student = self.request.GET.get('student', student)
    logged_in_student_id = self.request.user.student.id if self.request.user.student else None
    filtered_failed_transaction = []
    data = []
    if logged_in_student_id and str(logged_in_student_id) != student:
        raise exceptions.ValidationError('You cant view other student payment')
    academic_year = self.request.GET.get('academic_year', academic_year)
    standard = self.request.GET.get('standard', standard)
    status = self.request.GET.get('status').split(',') if self.request.GET.get('status') else None
    dont_show_sucess = True if status and 'success' not in status else False
    dont_show_failure = True if status and 'failed' not in status else False
    dont_show_pending = True if status and 'pending' not in status else False
    mode_of_payment = None
    temp_mode_of_payment = self.request.GET.get('mode_of_payment')
    order_by = self.request.GET.get('ordering', '-id') #used for both in fee collection and online payment obj
    if temp_mode_of_payment:
        if temp_mode_of_payment == 'Offline':
            mode_of_payment = 'Cash,Cheque,CreditCard,DebitCard,NetBanking,UPIPayments'
        else:
            mode_of_payment = temp_mode_of_payment
    if not dont_show_sucess:
        queryset = self.filter_queryset(self.get_queryset())
        if exclude_fee_collection:
            queryset.exclude(id=exclude_fee_collection)
        if mode_of_payment:
            temp_collect_ids = FeeCollectionModeOfPayment.objects.filter(
                mode_of_payment__in=mode_of_payment.split(',')
            ).values_list('fee_collection', flat=True)
            queryset = queryset.filter(id__in=temp_collect_ids)
        if academic_year:
            queryset = queryset.filter(payment_detail__fee_plan__standard_fee__academic_year=academic_year).distinct()
        queryset = queryset.order_by(order_by)
        data = queryset.values()
        online_payment_ids = []
        user_ids = []
        fee_collection_ids = []
        for temp in data:
            fee_collection_ids.append(temp['id'])
            if temp['online_payment_id']:
                online_payment_ids.append(temp['online_payment_id'])
            user_ids.append(temp['user_id'])
        user_data = {user['id']:user for user in User.objects.filter(id__in=user_ids).values(
            'staff', 'student', 'student__first_name', 'student__middle_name', 'student__last_name',
            'staff__first_name', 'staff__middle_name', 'staff__last_name', 'id'
        )}
        fee_col_mode_of_pay_data = FeeCollectionModeOfPayment.objects.filter(
            fee_collection__in=fee_collection_ids
        ).values()
        payment_details = PaymentDetail.objects.filter(
            fee_collection_id__in=fee_collection_ids
        ).values(
            "receipt_num", "fee_collection_id"
        )
        fee_term_mapping = {}
        for pd in payment_details:
            if pd["fee_collection_id"] not in fee_term_mapping:
                fee_term_mapping[pd["fee_collection_id"]] = {"receipt_num": None}
            if pd['receipt_num']:
                fee_term_mapping[pd["fee_collection_id"]]['receipt_num'] = pd['receipt_num']
        fee_col_mod_of_pay_mapping = {}
        for mode_of_pay in fee_col_mode_of_pay_data:
            if mode_of_pay['fee_collection_id'] not in fee_col_mod_of_pay_mapping:
                fee_col_mod_of_pay_mapping[mode_of_pay['fee_collection_id']] = []
            fee_col_mod_of_pay_mapping[mode_of_pay['fee_collection_id']].append(mode_of_pay)
        online_payment_data = {online_payment['id'] : online_payment for online_payment in OnlinePayment.objects.filter(
            id__in=online_payment_ids
        ).values(
            'order_status', 'payment_status', 'order_id', 'entity_name', 'status', 'id', 'mode_of_payment', 'transaction_fees', 'vendor_transaction_fees'
        )}
        for temp in data:
            temp['collected_user_full_name'] = ''
            if temp['user_id'] in user_data:
                if user_data[temp['user_id']]['student']:
                    temp['collected_user_full_name'] = get_full_name(
                        user_data[temp['user_id']]['student__first_name'], 
                        user_data[temp['user_id']]['student__middle_name'],
                        user_data[temp['user_id']]['student__last_name']
                    )
                elif user_data[temp['user_id']]['staff']:
                    temp['collected_user_full_name'] = get_full_name(
                        user_data[temp['user_id']]['staff__first_name'],
                        user_data[temp['user_id']]['staff__middle_name'],
                        user_data[temp['user_id']]['staff__last_name']
                    )
            temp['online_payment_data'] = {}
            if temp['online_payment_id'] in online_payment_data:
                temp['online_payment_data'] = online_payment_data[temp['online_payment_id']]
            if temp['id'] in fee_col_mod_of_pay_mapping:
                temp['mode_of_payment_list'] = fee_col_mod_of_pay_mapping[temp['id']]
                temp['mode_of_payment'] = ','.join(str(x['mode_of_payment']) for x in fee_col_mod_of_pay_mapping[temp['id']])
                temp['payment_ref_num'] = ','.join(str(x['payment_ref_num']) for x in fee_col_mod_of_pay_mapping[temp['id']])
            temp["payment_detail_receipt_num"] = None
            if temp["id"] in fee_term_mapping:
                temp["payment_detail_receipt_num"] = fee_term_mapping[temp["id"]]["receipt_num"]
    if student:
        temp_filter = ['SUCCESS']
        if dont_show_failure:
            temp_filter = temp_filter + FAILED_PAYMENT_STATUSES
        if dont_show_pending:
            temp_filter = temp_filter + PENDING_PAYMENT_STATUSES
        user = User.objects.get(student=student)
        failed_transactions = OnlinePayment.objects.filter(user=user, entity_name='FC').exclude(payment_status__in=temp_filter).order_by(order_by).values()
        filtered_failed_transaction = []
        for failed_data in failed_transactions:
            temp = failed_data['data']
            if not academic_year or 'academic_year' in temp and str(temp['academic_year']) == str(academic_year):
                failed_data['student_id'] = failed_data['data']['student']
                failed_data['total_amount'] = failed_data['data']['total_amount']
                failed_data['online_payment_mode'] = failed_data['mode_of_payment']
                failed_data['mode_of_payment'] = failed_data['data']['mode_of_payment']
                failed_data['payment_ref_num'] = failed_data['data']['payment_ref_num']
                failed_data['total_payable_amount'] = failed_data['data']['total_payable_amount'] if 'total_payable_amount' in failed_data['data'] else None
                filtered_failed_transaction.append(failed_data)
    return {'data': data, 'failed_and_pending_transactions': filtered_failed_transaction}

def get_payment_detail(self, feecollection=None):
    if not feecollection and self.kwargs['pk']:
        feecollection = self.kwargs['pk']
        queryset = FeeCollection.objects.get(id=feecollection)
    else:
        queryset = feecollection
    serializer = GetFeeCollectionSerializer(queryset)
    response =  {'data': serializer.data}
    store_fee_type_id=[]
    fee_collection_mode_of_pay = FeeCollectionModeOfPayment.objects.filter(fee_collection=queryset.id).values()
    response['data']['mode_of_payment_list'] = fee_collection_mode_of_pay
    response['data']['mode_of_payment'] = fee_collection_mode_of_pay[0]['mode_of_payment']
    response['data']['payment_ref_num'] = fee_collection_mode_of_pay[0]['payment_ref_num']
    is_store_fee_type=False
    for payment in response['data']['payment_detail']:
        if payment['fee_type_codename'] == 'store':
            store_fee_type_id.append(payment['fee_type'])
            is_store_fee_type=True
    if is_store_fee_type:
        total_store_amount_paid=0
        previous_collected_fee=0
        student_feecollected_list=[]
        student_feecollection = PaymentDetail.objects.filter(fee_collection__student_id=queryset.student.id,
                                                             fee_collection=queryset.id,
                                                             fee_plan__standard_fee__fee_type__codename ='store',
                                                             fee_plan__standard_fee__academic_year=response['data']['payment_detail'][0]['academic_year_id'],
                                                             fee_plan__standard_fee__fee_type__in=store_fee_type_id,
                                                             fee_collection__is_active=1).values('fee_collection_id','fee_plan','fee_collection__transaction_date','amount_paid')
        for fee_collection in student_feecollection:
            student_feecollected_list.append(fee_collection['fee_collection_id'])
            if fee_collection['fee_collection_id'] != queryset.id and fee_collection['fee_collection__transaction_date']<=queryset.transaction_date:
                previous_collected_fee+=fee_collection['amount_paid']
        store_items = ItemSold.objects.filter(fee_collection__in=student_feecollected_list).values('item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__stock__item__name',
                        'item_sold_details_item_sold__student_store_mapping__issued_quantity','item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price','fee_collection_id')
        store_items=list(store_items)
    for payment in response['data']['payment_detail']:
        total_amount_for_issued_items=0
        total_amount_for_issued_items_paid=0
        if payment['fee_type_codename'] == 'store':
            total_store_amount_paid+=payment['amount_paid']
            temp_amount_paid=total_store_amount_paid
            for items in store_items:
                selling_price= items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price']
                issued_quantity = items ['item_sold_details_item_sold__student_store_mapping__issued_quantity']
                previous_pending_fee = 0
                if previous_collected_fee:
                    if selling_price*issued_quantity <= previous_collected_fee:
                        previous_collected_fee -= selling_price*issued_quantity
                    elif selling_price*issued_quantity == 0:
                        previous_collected_fee = 0
                    elif selling_price*issued_quantity>=previous_collected_fee:
                        previous_pending_fee += ((selling_price*issued_quantity)-previous_collected_fee)
                        previous_collected_fee -= previous_collected_fee
                if not previous_collected_fee:
                    if previous_pending_fee:
                        items['temp_amount_paid'] = previous_pending_fee
                        total_amount_for_issued_items_paid+=previous_pending_fee
                        total_amount_for_issued_items+=previous_pending_fee
                        previous_pending_fee =0
                    else:
                        if items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity'] <= temp_amount_paid:
                            items['temp_amount_paid'] = items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity']
                            temp_amount_paid-=items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity']
                        elif items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity'] == 0:
                            items['temp_amount_paid'] = 0
                        elif items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity'] >= temp_amount_paid:
                            items['temp_amount_paid'] = temp_amount_paid
                            temp_amount_paid-=temp_amount_paid
                        total_amount_for_issued_items+=items['item_sold_details_item_sold__student_store_mapping__fee_standard_mapping_item_selling__selling_price'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity']
                        total_amount_for_issued_items_paid+=items['temp_amount_paid'] * items ['item_sold_details_item_sold__student_store_mapping__issued_quantity']
            payment['total_amount_for_issued_items']=total_amount_for_issued_items_paid
            payment['total_balance_amount']=total_amount_for_issued_items-total_store_amount_paid
            payment['amount_paid_in_words']=f"{num2words(total_amount_for_issued_items_paid, lang='en')} Rupees"
            for items in store_items:
                if 'temp_amount_paid' not in items:
                    store_items.remove(items)
            payment['store_data'] = list(store_items)
    response['data']['institute_detail'] =  InstituteSerializer(Institute.get_institute(self)).data
    payment_detail_obj = PaymentDetail.objects.filter(fee_collection=self.kwargs['pk']).first()
    temp = payment_detail_obj.fee_plan.standard_fee
    enrollment_data = Enrollment.objects.filter(student=response['data']['student'], standard_section__standard=temp.standard).values(
        'student', standard_name=F('standard_section__standard__name'), section_name=F('standard_section__section__name')
    )
    response['data']['enrollment_data'] = enrollment_data[0] if len(enrollment_data) > 0 else {}
    response['data']['academic_year'] = {
        'start_date': temp.academic_year.start_date, 
        'end_date': temp.academic_year.end_date, 
        'academic_year': temp.academic_year.id
    }
    response['data']['institute_address'] = {}
    queryset = InstituteAdresses.objects.filter(Q(standard=temp.standard)|Q(default=True),is_active=True)
    address_data = InstituteAddressReadWithoutStandardSerializer(queryset, many=True)
    for instituteaddress in address_data.data:
        if response['data']['institute_address'] and instituteaddress['default']:
            continue
        response['data']['institute_address'] = instituteaddress
    self.serializer_class = FeeTermsSerializer
    """
        Nikhil optimize the below yo can achieve this in previous function waste of calling feeplan
    """
    fee_plan = get_fee_plan(self, temp.academic_year.id,temp.standard.id, FeeStandardMapping.objects.filter(academic_year=temp.academic_year.id))
    response['data']['standard'] = temp.standard.id
    response['data']['standard_name'] = temp.standard.name
    fee_plan_mapping_data = {}
    response['data']['payment_end_date'] = None#this  cant be multiple dates so careful
    for fee_plan_row in fee_plan['data']['plan']:
        for standard_fee in fee_plan_row['standard_fee']:
            response['data']['payment_end_date'] = standard_fee['payment_end_date']
            if standard_fee['fee_standard_mapping_id'] not in fee_plan_mapping_data:
                fee_plan_mapping_data[standard_fee['fee_standard_mapping_id']] = []
            fee_plan_mapping_data[standard_fee['fee_standard_mapping_id']].append(standard_fee)
    response['data']['fee_plan_mapping_data'] = fee_plan_mapping_data
    temp = StudentParentMapping.objects.filter(student=response['data']['student']).first()
    temp_address =StudentAddress.objects.filter(student=response['data']['student'])
    if temp:
        name = ''
        if temp.parent and temp.parent.father_name:
            name = temp.parent.father_name
        elif temp.parent and  temp.parent.mother_name:
            name = temp.parent.mother_name
        elif temp.guardian and temp.guardian.guardian_name:
            name = temp.guardian.guardian_name
        response['data']['parent_details'] = {
            'name': name
        }
        response['data']['student_address']=temp_address.values()
    return response

def delete_fee_collection(self):
    instance = FeeCollection.objects.get(id=self.kwargs['pk'])
    deposit_data = DepositWithdrawRecord.objects.filter(content_type=ContentType.objects.get_for_model(instance), object_id=instance.pk).values().first()
    number_of_days = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'valid_days_to_delete_fees')
    today = datetime.now().date()
    number_of_days_fees_collected = SharedService.days_between(instance.transaction_date.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d'))
    if number_of_days_fees_collected > number_of_days:
        raise exceptions.ValidationError(f'You cant revert the fee tranasaction after {number_of_days} days')
    today_date = datetime.now().date()
    withdraw_data_to_save = {}
    if deposit_data:
        withdraw_data_to_save={
                "date":today_date,
                "transaction_type":2,
                "transaction_from":6,
                "amount":instance.total_amount,
                "created_by":self.request.user.id
            }
        if 'bank_from_id' in self.request.data and self.request.data['bank_from_id']:
            withdraw_data_to_save['bank_from'] = self.request.data['bank_from_id']
        if 'user_from_id' in self.request.data and self.request.data['user_from_id']:
            withdraw_data_to_save['user_from'] = self.request.data['user_from_id']
    with transaction.atomic(using=get_current_db_name()):
        tracking = {
            'user': self.request.user.id,
            'fee_collection': instance.id,
            'reason': self.request.data['reason']
        }
        fee_collection_tracking_serializer = FeeCollectionDeleteTrackingSerializer(data=tracking)
        fee_collection_tracking_serializer.is_valid(raise_exception=True)
        fee_collection_tracking_serializer.save()
        item_sold = ItemSold.objects.filter(fee_collection=instance.id).first()
        if item_sold:
            delete_item_sold(self, item_sold.id)
        FeeCollection.objects.filter(
            id=self.kwargs['pk']
        ).update(
            is_active=False
        )
        AdjustmentFee.objects.filter(
            fee_collection=self.kwargs['pk']
        ).update(
            is_active=False
        )
        payment_delete_notification(self, instance)
        content_type = ContentType.objects.get_for_model(fee_collection_tracking_serializer.instance)
        withdraw_data_to_save['content_type'] = content_type.id
        withdraw_data_to_save['object_id'] = fee_collection_tracking_serializer.instance.pk
        depositserializer = DepositWithdrawRecordSerializer(data = withdraw_data_to_save)
        depositserializer.is_valid(raise_exception=True)
        depositserializer.save()
    return {'Reason': 'Deleted Successfully'}

def payment_delete_notification(self, fee_collection_obj):
    action = 'feecollection_destroy'
    notification_obj = NotificationBodyTemplate(action)
    customized_data = list()
    student_name = get_full_name(fee_collection_obj.student.first_name, fee_collection_obj.student.middle_name, fee_collection_obj.student.last_name)
    temp = {
        'student_name': student_name,
        'payment_total_amount': fee_collection_obj.total_amount, 
        'receipt_num': fee_collection_obj.receipt_num
    }
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    body_sms = notification_obj.select_template('sms', temp)
    if fee_collection_obj.student.email:
        customized_data.append(
            {'email': fee_collection_obj.student.email, 'user_id': fee_collection_obj.student.user_student.id, 'email_subject': None,
                                   'email_body': body_email, 'email_notification':1}
        )
    if fee_collection_obj.student.mobile_num:
        customized_data.append(
            {'mobile_number': fee_collection_obj.student.mobile_num, 'user_id': fee_collection_obj.student.user_student.id, 'sms_body': body_sms, 'sms_notification': 1}
        )
    customized_data.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': fee_collection_obj.student.user_student.id, 'extra_params': {}})
    send_notification(action, body=None, customizedData=customized_data)


#for now printing only for jnana jyothi
def print_dummy_receipt(self, data):
    path =  'fee_reciepts/jnanajyothidummyreceipt.html'
    return PDFService.receipt_new(self, data, data['receipt_num'], path)
    

def validate_store_data(given_fee_plan_data, item_selling_price_fee_standard_mapping):
    check_duplicate_item = []
    data = []
    for fee_price in given_fee_plan_data['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
        if fee_price['student_store_mapping_id'] in check_duplicate_item:
            raise exceptions.ValidationError('Duplicate Store items')
        if fee_price['student_store_mapping_id'] not in item_selling_price_fee_standard_mapping:
            raise exceptions.ValidationError("Store item not mapped")
        if 'is_issued' not in fee_price:
            raise exceptions.ValidationError('is_issued is mandatory')
        if 'quantity' not in fee_price:
            raise exceptions.ValidationError('quantity is mandatory')
        if item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['assigned_quantity'] < fee_price['quantity']:
            raise exceptions.ValidationError('Quantity is greater than configured')
        if item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['assigned_quantity'] < (fee_price['quantity'] + item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['issued_quantity']):
            raise exceptions.ValidationError('Quantity is greater than the configured / Quantity is already sold')
        if fee_price['is_issued']:
            fee_price['stock'] = item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['stock']
            fee_price['student_store_mapping'] = fee_price['student_store_mapping_id']
            fee_price['selling_price_per_unit'] = item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['selling_price'] / item_selling_price_fee_standard_mapping[fee_price['student_store_mapping_id']]['quantity']
            data.append(fee_price)
    return data

def get_fee_deposit_data(self, extra_params={}):
    total = 0
    financial_year_obj = None
    financial_year_id = extra_params.get('financial_year_id')
    if financial_year_id:
        try:
            financial_year_obj = FinancialYear.objects.get(id=financial_year_id, is_active=True)
        except FinancialYear.DoesNotExist:
            raise exceptions.ValidationError('Invalid financial_year_id')

    if extra_params.get('from_cash_in_hand'):
        # Look up opening balance and date first
        opening_balance = 0
        opening_date = None
        try:
            wallet = StaffWallet.objects.get(
                staff__users__id=extra_params['from_cash_in_hand'],
                is_active=True
            )
            opening_balance = float(wallet.opening_balance)
            opening_date = wallet.opening_date
        except StaffWallet.DoesNotExist:
            # No opening balance set — not tracking this staff yet
            return {'total_collected': 0}

        # Start with the opening balance
        total = opening_balance

        # Build fee collection filters — only count collections AFTER opening_date
        payment_filter_query = {
            'fee_collection__is_active':1,
            'fee_collection__user':extra_params['from_cash_in_hand'],
            'fee_collection__fee_collection_mode_of_payment_fee_collection__mode_of_payment':'Cash'
        }
        appln_filter_query={
            'student__is_active':1,
            'user':extra_params['from_cash_in_hand'],
            'mode_of_payment':'Cash'
        }
        misc_filter_query={
            'miscellaneous__is_active':1,
            'miscellaneous__user':extra_params['from_cash_in_hand'],
            'miscellaneous__mode_of_payment':'Cash'
        }
        if opening_date:
            payment_filter_query['fee_collection__transaction_date__gte'] = opening_date
            appln_filter_query['transaction_date__gte'] = opening_date
            misc_filter_query['miscellaneous__date__gte'] = opening_date

        payment = PaymentDetail.objects.filter(
            **payment_filter_query
        )
        application = ApplicationPaymentDetail.objects.filter(
            **appln_filter_query
        )
        misc =  MiscellaneousPayment.objects.filter(**misc_filter_query)
        if financial_year_obj:
            payment = payment.filter(
                fee_collection__transaction_date__gte=financial_year_obj.start_date,
                fee_collection__transaction_date__lte=financial_year_obj.end_date
            )
            application = application.filter(
                transaction_date__gte=financial_year_obj.start_date,
                transaction_date__lte=financial_year_obj.end_date
            )
            misc = misc.filter(
                miscellaneous__date__gte=financial_year_obj.start_date,
                miscellaneous__date__lte=financial_year_obj.end_date
            )
        fy_from_date = financial_year_obj.start_date if financial_year_obj else None
        fy_to_date = financial_year_obj.end_date if financial_year_obj else None
        fee_collection_summary = get_cashbook_total_report(
            self,
            payment,
            application,
            misc,
            None,
            None,
            fy_from_date,
            fy_to_date,
            cashbook_total=False
        )['fee_type_summary']
        # get_cashbook_total_report() also appends fee-advance totals from
        # _get_cashbook_fee_advance_queryset(). That inflates available cash-in-hand
        # for transfer validation, so remove that contribution here only.
        fee_advance_total = 0
        fee_adv_qs = _get_cashbook_fee_advance_queryset(self, cashbook_total=False)
        if fee_adv_qs is not None:
            fee_advance_total = fee_adv_qs.aggregate(total=Sum('amount'))['total'] or 0
        for fee in fee_collection_summary:
            total += fee['amount']
        total -= float(fee_advance_total)

        # Add/subtract transfers — only AFTER opening_date
        deposit_qs = DepositWithdrawRecord.objects.filter(
            Q(user_from=extra_params['from_cash_in_hand'])|Q(user_to=extra_params['from_cash_in_hand']),
            is_active=True
        )
        if opening_date:
            deposit_qs = deposit_qs.filter(date__gte=opening_date)
        if financial_year_obj:
            deposit_qs = deposit_qs.filter(
                date__gte=financial_year_obj.start_date,
                date__lte=financial_year_obj.end_date
            )
        deposit_data = deposit_qs.values()
        for deposit in deposit_data:
            if deposit['transaction_type'] == 3 and deposit['user_to_id'] == extra_params['from_cash_in_hand']:
                total+=deposit['amount']
            if deposit['transaction_type'] == 3 and deposit['user_from_id'] == extra_params['from_cash_in_hand']:
                total-=deposit['amount']
    if extra_params.get('from_bank'):
        bank_id = extra_params['from_bank']
        # Start with bank opening balance
        try:
            bank = BankDetail.objects.get(id=bank_id)
            total = float(bank.opening_balance)
        except BankDetail.DoesNotExist:
            total = 0
        # Add/subtract BankTransaction deposits and withdrawals
        bank_transactions = BankTransaction.objects.filter(bank_id=bank_id, is_active=True)
        if financial_year_obj:
            bank_transactions = bank_transactions.filter(
                date__gte=financial_year_obj.start_date,
                date__lte=financial_year_obj.end_date
            )
        for txn in bank_transactions:
            if txn.is_deposit:
                total += float(txn.amount)
            else:
                total -= float(txn.amount)
        # Add/subtract DepositWithdrawRecord transfers (bank-to-bank, cash-to-bank, bank-to-cash)
        deposit_qs = DepositWithdrawRecord.objects.filter(
            Q(bank_from=bank_id)|Q(bank_to=bank_id),
            is_active=True
        )
        if financial_year_obj:
            deposit_qs = deposit_qs.filter(
                date__gte=financial_year_obj.start_date,
                date__lte=financial_year_obj.end_date
            )
        deposit_data = deposit_qs.values()
        for deposit in deposit_data:
            if deposit['bank_to_id'] == bank_id:
                total+=deposit['amount']
            if deposit['bank_from_id'] == bank_id:
                total-=deposit['amount']
    report = {
        'total_collected': total,
    }
    return report

def get_deposit_amount_summary(self):
    """
    Returns summary of cash in hand for all users and bank account totals for all banks
    Uses bulk queries and aggregation to avoid N+1 queries
    """
    total_deposits = 0
    total_withdrawals = 0
    total_bank_balance = 0
    total_cash_in_hand = 0
    total_bank_data = {'opening_balance':0,'closing_balance':0,'debit':0,'credit':0}
    total_cash_in_hand_data = {'opening_balance':0,'closing_balance':0,'debit':0,'credit':0}

    if self.request.GET.get('financial_year_id'):
        financial_year = self.request.GET.get('financial_year_id')
        financial_year_obj = FinancialYear.objects.get(id=financial_year)

    payment_data = PaymentDetail.objects.filter(
        fee_collection__is_active=1,
        fee_collection__fee_collection_mode_of_payment_fee_collection__mode_of_payment='Cash'
    ).values(
        'fee_collection__user__staff__first_name','fee_collection__user__staff__middle_name','fee_collection__user__staff__last_name',
        'fee_collection__user',
        'fee_collection__transaction_date',
        'amount_paid'
    )

    appln_data = ApplicationPaymentDetail.objects.filter(
        student__is_active=1,
        mode_of_payment='Cash'
    ).values(
        'user','user__staff__first_name','user__staff__middle_name','user__staff__last_name',
        'transaction_date',
        'amount_paid'
    )

    misc_data = MiscellaneousPayment.objects.filter(
        miscellaneous__is_active=1,
        miscellaneous__mode_of_payment='Cash'
    ).values(
        'miscellaneous__user',
        'miscellaneous__user__staff__first_name','miscellaneous__user__staff__middle_name','miscellaneous__user__staff__last_name',
        'miscellaneous__date',
        'amount'
    )

    deposit_data = DepositWithdrawRecord.objects.filter(
        is_active=True,
    ).values(
        'transaction_type',
        'amount',
        'date',
        'user_from',
        'user_to',
        'bank_from',
        'bank_to',
        'bank_from__bank_name',
        'bank_to__bank_name',
        'user_from__staff__first_name',
        'user_from__staff__middle_name',
        'user_from__staff__last_name',
        'user_to__staff__first_name',
        'user_to__staff__middle_name',
        'user_to__staff__last_name',
    )

    bank_wise_opening_closing_balance = {}
    user_wise_opening_closing_balance = {}

    all_banks = BankDetail.objects.filter(is_active=True)
    if self.request.GET.get('financial_year_id'):
        all_banks = all_banks.filter(financial_year_id=financial_year)
    for bank in all_banks:
        ob = float(bank.opening_balance)
        bank_wise_opening_closing_balance[bank.id] = {
            'opening_balance': ob,
            'closing_balance': 0,
            'debit': 0,
            'credit': 0,
            'bank_id': bank.id,
            'bank_name': bank.bank_name,
            'account_num': bank.account_num,
            'name': bank.bank_name
        }
        total_bank_data['opening_balance'] += ob

    opening_balance_records = StaffWallet.objects.filter(
        is_active=True
    ).select_related('staff', 'staff__users')
    # Build wallet lookup: user_id -> opening_date
    wallet_opening_dates = {}
    for ob_record in opening_balance_records:
        try:
            user_id = ob_record.staff.users.id
        except Exception:
            continue
        ob_amount = float(ob_record.opening_balance)
        name = get_full_name(ob_record.staff.first_name, ob_record.staff.middle_name, ob_record.staff.last_name)
        wallet_opening_dates[user_id] = ob_record.opening_date
        user_wise_opening_closing_balance[user_id] = {
            'opening_balance': ob_amount,
            'closing_balance': 0,
            'debit': 0,
            'credit': 0,
            'user_id': user_id,
            'name': name
        }
        total_cash_in_hand_data['opening_balance'] += ob_amount

    for payment in payment_data:
        user = payment['fee_collection__user']
        # Only include staff with a registered opening balance
        if user not in wallet_opening_dates:
            continue
        # Only count transactions on/after the opening_date
        if payment['fee_collection__transaction_date'] < wallet_opening_dates[user]:
            continue

        if financial_year_obj.start_date <= payment['fee_collection__transaction_date'] <= financial_year_obj.end_date:
            user_wise_opening_closing_balance[user]['credit'] += payment['amount_paid']
            total_cash_in_hand_data['credit'] += payment['amount_paid']
            total_deposits += payment['amount_paid']

    for appln in appln_data:
        user = appln['user']
        if user not in wallet_opening_dates:
            continue
        if appln['transaction_date'] < wallet_opening_dates[user]:
            continue

        if financial_year_obj.start_date <= appln['transaction_date'] <= financial_year_obj.end_date:
            user_wise_opening_closing_balance[user]['credit'] += appln['amount_paid']
            total_cash_in_hand_data['credit'] += appln['amount_paid']
            total_deposits += appln['amount_paid']

    for misc in misc_data:
        user = misc['miscellaneous__user']
        if user not in wallet_opening_dates:
            continue
        if misc['miscellaneous__date'] < wallet_opening_dates[user]:
            continue

        if financial_year_obj.start_date <= misc['miscellaneous__date'] <= financial_year_obj.end_date:
            user_wise_opening_closing_balance[user]['credit'] += misc['amount']
            total_cash_in_hand_data['credit'] += misc['amount']
            total_deposits += misc['amount']

    for deposit in deposit_data:
        # Skip records with null amount (bad data)
        if deposit['amount'] is None:
            continue

        if financial_year_obj.start_date <= deposit['date'] <= financial_year_obj.end_date:
            if deposit['transaction_type'] == 1:
                total_deposits += deposit['amount']
            elif deposit['transaction_type'] == 2:
                total_withdrawals += deposit['amount']

        if deposit['user_from'] and deposit['user_from'] in wallet_opening_dates:
            if deposit['date'] >= wallet_opening_dates[deposit['user_from']]:
                if financial_year_obj.start_date <= deposit['date'] <= financial_year_obj.end_date:
                    user_wise_opening_closing_balance[deposit['user_from']]['debit'] += deposit['amount']
                    total_cash_in_hand_data['debit'] += deposit['amount']
        if deposit['user_to'] and deposit['user_to'] in wallet_opening_dates:
            if deposit['date'] >= wallet_opening_dates[deposit['user_to']]:
                if financial_year_obj.start_date <= deposit['date'] <= financial_year_obj.end_date:
                    user_wise_opening_closing_balance[deposit['user_to']]['credit'] += deposit['amount']
                    total_cash_in_hand_data['credit'] += deposit['amount']

        if deposit['bank_from'] and deposit['bank_from'] in bank_wise_opening_closing_balance:
            if financial_year_obj.start_date <= deposit['date'] <= financial_year_obj.end_date:
                bank_wise_opening_closing_balance[deposit['bank_from']]['debit'] += deposit['amount']
                total_bank_data['debit'] += deposit['amount']
        if deposit['bank_to'] and deposit['bank_to'] in bank_wise_opening_closing_balance:
            if financial_year_obj.start_date <= deposit['date'] <= financial_year_obj.end_date:
                bank_wise_opening_closing_balance[deposit['bank_to']]['credit'] += deposit['amount']
                total_bank_data['credit'] += deposit['amount']

    # Include BankTransaction records (fee deposits, asset disposals, etc.)
    bank_txn_data = BankTransaction.objects.filter(
        is_active=True,
        date__gte=financial_year_obj.start_date,
        date__lte=financial_year_obj.end_date,
        bank_id__in=bank_wise_opening_closing_balance.keys()
    ).values('bank_id', 'is_deposit', 'amount')

    for txn in bank_txn_data:
        if txn['amount'] is None:
            continue
        bank_id = txn['bank_id']
        if bank_id in bank_wise_opening_closing_balance:
            if txn['is_deposit']:
                bank_wise_opening_closing_balance[bank_id]['credit'] += float(txn['amount'])
                total_bank_data['credit'] += float(txn['amount'])
            else:
                bank_wise_opening_closing_balance[bank_id]['debit'] += float(txn['amount'])
                total_bank_data['debit'] += float(txn['amount'])

    for user_data in user_wise_opening_closing_balance.values():
        user_data['closing_balance'] = user_data['opening_balance'] + user_data['credit'] - user_data['debit']
        total_cash_in_hand += user_data['closing_balance']

    for bank_data in bank_wise_opening_closing_balance.values():
        bank_data['closing_balance'] = bank_data['opening_balance'] + bank_data['credit'] - bank_data['debit']
        total_bank_balance += bank_data['closing_balance']

    response_data = {
        'cash_in_hand': list(user_wise_opening_closing_balance.values()),
        'bank_accounts': list(bank_wise_opening_closing_balance.values()),
        'totals': {
            'total_deposits': total_deposits,
            'total_withdrawals': total_withdrawals,
            'total_bank_balance': total_bank_balance,
            'total_cash_in_hand': total_cash_in_hand
        }
    }
    if self.request.GET.get('download_pdf') :
        institute = Institute.get_institute(self)
        data = {
            'institute': institute,
            'financial_year': financial_year_obj
        }
        if self.request.GET.get('bank_report'):
            data['column_data'] = bank_wise_opening_closing_balance.values()
            data['total_data'] = total_bank_data
            data['bank_report'] = 1
        else:
            data['column_data'] = user_wise_opening_closing_balance.values()
            data['total_data'] = total_cash_in_hand_data
            data['bank_report'] = 0
        path = 'deposit_amount_summary/deposit_amount_summary.html'
        return PDFService.receipt_new(self, data, 'deposit_amount_summary', path, False)
    return response_data

def validate_deposit_data(self,data):
    from_bank = data.get('from_bank')
    to_bank = data.get('to_bank')
    from_cash = data.get('from_cash_in_hand')
    to_cash = data.get('to_cash_in_hand')
    amount = data.get('amount')

    if not from_bank and not from_cash:
        raise exceptions.ValidationError(
            'From Bank / Cash In Hand User is Mandatory'
        )
    if not to_bank and not to_cash:
        raise exceptions.ValidationError(
            'To Bank / Cash In Hand User is Mandatory'
        )
    if not amount:
        raise exceptions.ValidationError(
            'Amount to Transfer is Mandatory'
        )
    extra_params = {'from_cash_in_hand':None,'from_bank':None, 'financial_year_id': None}
    if from_cash:
        extra_params['from_cash_in_hand'] = from_cash
    if from_bank:
        extra_params['from_bank'] = from_bank
    if data.get('financial_year'):
        extra_params['financial_year_id'] = data.get('financial_year')
    from_data = get_fee_deposit_data(self, extra_params)
    if from_data.get('total_collected', 0) < amount:
        raise exceptions.ValidationError(
            'Amount to Transfer is Greater than the Available Amount'
        )

def create_deposit_amount(self,data):
    validate_deposit_data(self,data)
    data.pop('recoverable_asset_id', None)
    data.pop('ra_transaction_type', None)

    data['transaction_type'] = 3
    data['created_by'] = self.request.user.id
    if data.get('from_bank'):
        data['bank_from'] = data['from_bank']
    if data.get('to_bank'):
        data['bank_to'] = data['to_bank']
    if data.get('from_cash_in_hand'):
        data['user_from'] = data['from_cash_in_hand']
    if data.get('to_cash_in_hand'):
        data['user_to'] = data['to_cash_in_hand']

    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, False)

        from apps.finance.services.recoverable_asset_service import sync_bank_to_recoverable_asset
        txn_date = data.get('date', date.today())
        transfer_type = data.get('transfer_type', '')
        remark = f'Bank/Cash Transfer ({transfer_type})' if transfer_type else 'Bank/Cash Transfer'

        if data.get('bank_from'):
            sync_bank_to_recoverable_asset(
                bank_id=data['bank_from'], amount=data['amount'],
                is_incoming=False, transaction_date=txn_date,
                source_reference='DepositWithdrawRecord',
                remarks=remark, user=self.request.user)

        if data.get('bank_to'):
            sync_bank_to_recoverable_asset(
                bank_id=data['bank_to'], amount=data['amount'],
                is_incoming=True, transaction_date=txn_date,
                source_reference='DepositWithdrawRecord',
                remarks=remark, user=self.request.user)

    return {'data':'Data Saved Successfuly'}

def update_fee_collection(view, data, fee_collection_id):
    try:
        fee_collection = FeeCollection.objects.get(
            id=fee_collection_id,
            is_active=True
        )
    except FeeCollection.DoesNotExist:
        raise exceptions.ValidationError("Fee collection not found")

    payload = data.get("data", {})
    transaction_date_str = payload.get("transaction_date")
    payments = payload.get("payments")

    if not transaction_date_str and payments is None:
        raise exceptions.ValidationError(
            "Nothing to update. Provide transaction_date or payments."
        )

    related_changes = []

    with transaction.atomic(using=get_current_db_name()):
        if transaction_date_str:
            tx_date = datetime.strptime(transaction_date_str, "%Y-%m-%d").date()

            if tx_date > date.today():
                raise exceptions.ValidationError(
                    "Transaction date cannot be in the future"
                )

            fee_collection.transaction_date = tx_date
            fee_collection.save(update_fields=['transaction_date', 'modified'])

        if payments is not None:
            if not payments:
                raise exceptions.ValidationError(
                    "At least one payment mode is required"
                )

            for idx, p in enumerate(payments):
                if "mode_of_payment" not in p or not p["mode_of_payment"]:
                    raise exceptions.ValidationError(
                        f"Payment mode is required for payment entry {idx + 1}"
                    )
                if "amount" not in p:
                    raise exceptions.ValidationError(
                        f"Amount is required for payment entry {idx + 1}"
                    )
                try:
                    amount = float(p["amount"])
                    if amount <= 0:
                        raise exceptions.ValidationError(
                            f"Payment amount must be greater than zero for payment entry {idx + 1}"
                        )
                except (ValueError, TypeError):
                    raise exceptions.ValidationError(
                        f"Invalid amount format for payment entry {idx + 1}"
                    )

            total_split_amount = sum(float(p["amount"]) for p in payments)
            
            if round(total_split_amount, 2) != round(float(fee_collection.total_amount), 2):
                raise exceptions.ValidationError(
                    f"Payment split total ({total_split_amount}) must match fee collection total amount ({fee_collection.total_amount})"
                )

            old_mops = FeeCollectionModeOfPayment.objects.filter(fee_collection=fee_collection)
            for mop in old_mops:
                related_changes.append(SharedService.build_related_change(mop, action='DELETE'))
            
            old_mops.delete()

            primary_payment = payments[0]
            fee_collection.mode_of_payment = primary_payment["mode_of_payment"]
            fee_collection.payment_ref_num = primary_payment.get("payment_ref_num")
            fee_collection.save(update_fields=['mode_of_payment', 'payment_ref_num', 'modified'])

            for payment in payments:
                mop_data = {
                    "fee_collection": fee_collection.id,
                    "mode_of_payment": payment["mode_of_payment"],
                    "amount": float(payment["amount"]),
                    "payment_ref_num": payment.get("payment_ref_num"),
                    "loan_from_bank": payment.get("loan_from_bank"),
                    "loan_to_bank": payment.get("loan_to_bank"),
                    "loan_utr_number": payment.get("loan_utr_number"),
                    "loan_credited_date": payment.get("loan_credited_date"),
                    "bank_detail_id": payment.get("bank_detail_id") or payment.get("bank_detail"),
                }

                mop_data = {k: v for k, v in mop_data.items() if v is not None}

                mop_serializer = FeeCollectionModeOfPaymentSerializer(
                    data=mop_data,
                    context={"request": view.request},
                )
                mop_serializer.is_valid(raise_exception=True)
                mop_serializer.save()
                
                related_changes.append(SharedService.build_related_change(mop_serializer.instance, action='CREATE'))
        
    SharedService.add_to_log(
        view, view.request, {"Reason": "Updated"}, 
        FeeCollection, fee_collection_id, 
        action='UPDATE', 
        related_changes=related_changes if related_changes else None
    )

    return {"Reason": "Data Updated Successfully"}