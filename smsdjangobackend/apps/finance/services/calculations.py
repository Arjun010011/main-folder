import math
import copy

from django.db.models import Q, F, Count
from rest_framework import exceptions
from datetime import datetime
from decimal import Decimal
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.models.standard import Standard

from apps.finance.models import (FeeStandardMapping, PaymentDetail, FeePlan, AdjustmentFee)
from apps.finance.models.additional_charge import AdditionalCharge, AdditionalChargeType, FeeCollectionAdditionChargeMapping, FeePlanAdditionalChargeMapping
from apps.finance.models.fee import FeeGroup, FeeStandardMappingItemSellingPrice, FeeType, FeeplanStudentFeature, StudentStoreMapping
from apps.finance.models.feeCollection import FeeCollection, FeeCollectionModeOfPayment
from apps.finance.serializers import FeeCollectionAdditionChargeMappingReadSerilaizer, FeePlanSerializer, FeeTermsSerializer, StudentStoreMappingReadSerializer
from apps.finance.services.additional_charge import additional_charge_type

from apps.institutes.models import AcademicYear
from apps.shared.models.approval import ApproveStatus
from apps.shared.services import ConfigurationService, FormdefinitionService, SharedService
from apps.shared.services_shared.approval import Approval
from apps.shared.services_shared.common import get_full_name
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.students.models import Student
from apps.students.models.student import StudentGroup
from apps.transport.models.route import RoutePrice, RouteUserAddress
from itertools import chain
from django.contrib.contenttypes.models import ContentType
from datetime import datetime, date as date_cls
from apps.finance.models.fee_advance import FeeAdvanceCollection
from apps.finance.models.fee_advance import FeeAdvanceCollectionPaymentDetail
from django.db.models import Sum
from rest_framework import exceptions
from apps.classes.models.enrollment import StudentStandardMapping
from apps.finance.models.fee import FeeStandardMapping
from apps.finance.models.fee_advance import FeeAdvanceCollection


TRANSPORT_CODENAME ='transport'

def get_transport_rate_for_student(student, academicYear, standard, fee, returnValue=False):
    return_data={
        'routePriceRate':0,
        'routePrice':0,
        'routeFeeAmount':0,
        'reason':'',
        'areaname':'',
        'area_id':0
    }
    areaname = None
    reason = ''
    price_on_area = ConfigurationService.get_setting_value('price_on_area', academicYear, standard)
    academicYear = AcademicYear.objects.filter(id=academicYear).first()
    try:
        area_obj  = RouteUserAddress.objects.filter(user__student=student, academic_year=academicYear,is_active=True).first()
        if not area_obj:
            raise exceptions.ValidationError(reason)
    except Exception as e:
        reason = 'Student is opted for the transport but not yet registered to any area.'
        if returnValue:
            return_data['reason']=reason
            return_data['areaname']=areaname
            return return_data
        raise exceptions.ValidationError(reason)
    route = RoutePrice.objects.filter(price_plan__academic_year=academicYear, price_plan__standard=standard,
                                      is_active=True)
    areaname=area_obj.area.name
    area_id=area_obj.area.id
    if not route:
        reason = 'Route price is not set.'
        if returnValue:
            return_data['areaname']=areaname
            return_data['reason']=reason
            return return_data
        raise exceptions.ValidationError(reason)
    if price_on_area == '0':
        studentKm = area_obj.area.km
        routePrice = route.filter(km__gte=studentKm).order_by('km').first()
        if not routePrice:
            routePrice = route.filter(km__lt=studentKm).order_by('-km').first()
    else:
        routePrice = route.filter(area=area_obj.area).first()
    if not routePrice:
        reason = 'Price is not set for the area.'
        if returnValue:
            return_data['areaname']=areaname
            return_data['reason']=reason
            return_data['area_id']=area_id
            return return_data
        raise exceptions.ValidationError(reason)
    return_data['areaname']=areaname
    return_data['reason']=reason
    return_data['area_id']=area_id
    return_data['routePriceRate']=routePrice.rate
    return_data['routeFeeAmount']=routePrice.rate * fee['amount']
    return return_data

def get_store_amount_for_student(student, fee_standard_mapping_obj):
    student_store_mapping = StudentStoreMapping.objects.filter(
        student=student, fee_standard_mapping_item_selling__fee_standard_mapping=fee_standard_mapping_obj['id']
    ).values(
        'fee_standard_mapping_item_selling__selling_price', 'fee_standard_mapping_item_selling', 'fee_standard_mapping_item_selling__quantity',
        'quantity', 'issued_quantity', 'id'
    )
    total = 0
    student_store_map_data = {}
    new_updated_store_obj = []
    for student_store in student_store_mapping:
        quantity_price = (student_store['fee_standard_mapping_item_selling__selling_price']/student_store['fee_standard_mapping_item_selling__quantity'])
        total += (quantity_price*student_store['quantity'])
        student_store_map_data[student_store['fee_standard_mapping_item_selling']] = student_store
    for standard_mapping in fee_standard_mapping_obj['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
        if standard_mapping['id'] in student_store_map_data:
            standard_mapping['issued_quantity'] = student_store_map_data[standard_mapping['id']]['issued_quantity']
            standard_mapping['assigned_quantity'] = student_store_map_data[standard_mapping['id']]['quantity']
            temp_price_for_ind = standard_mapping['selling_price'] / standard_mapping['quantity']
            standard_mapping['assigned_quantity_total_price'] = temp_price_for_ind * standard_mapping['assigned_quantity']
            standard_mapping['student_store_mapping_id'] = student_store_map_data[standard_mapping['id']]['id']
            new_updated_store_obj.append(standard_mapping)
    return total, new_updated_store_obj

def get_fee_amount_for_student(student, fee, academicYear, standard, returnValue, pendingReason):
    from apps.finance.services.fee_plan import STORE_CODENAME
    if fee['codename'] == TRANSPORT_CODENAME:
        transport_fee= get_transport_rate_for_student(student, academicYear, standard, fee, returnValue)
        fee['amount'] = transport_fee['routeFeeAmount']
        fee['reason'] = transport_fee['reason']
        fee['per_month_rate'] = transport_fee['routePriceRate']
        fee['areaname'] = transport_fee['areaname']
        fee['area_id'] = transport_fee['area_id']
        if transport_fee['reason']:
            pendingReason.update({fee['fee_type_name']: transport_fee['reason']})
    elif fee['codename'] == STORE_CODENAME:
        amount, fee['fee_standard_mapping_item_selling_price_fee_standard_mapping'] = get_store_amount_for_student(student, fee)
        fee['amount'] = amount
        fee['rate'] = amount
    return fee


def convert_percentage_to_amount(totalFee, termRate):
    return (Decimal(termRate) * Decimal(totalFee)) / 100


def convert_amount_to_percentage(amount, total):
    return 0 if total < 1 else ((amount / total) * 100)


def get_total_fee_amount_for_standard(data, student=None):
    total = 0
    for fee in data:
        if fee['codename'] == TRANSPORT_CODENAME:
            if not student:
                continue
        for standard_fee in fee['standard_fee']:
            if standard_fee['is_disabled']:
                continue
            total += standard_fee['amount'] if standard_fee['amount'] else 0
    return total


def validate_fee_advance_collection_amount(student_id, academic_year_id, amount, exclude_collection_id=None):
    """
    If approved FeeStandardMapping exists for the student's standard in this academic year,
    total active advances for (student, academic_year) + new amount must not exceed
    total allocated fee from the fee plan. If no mapping / no student-standard row, skip.
    """

    if student_id is None or academic_year_id is None or amount is None:
        return

    ssm = StudentStandardMapping.objects.filter(
        student_id=student_id,
        academic_year_id=academic_year_id,
    ).first()
    if not ssm:
        return

    if not FeeStandardMapping.objects.filter(
        academic_year_id=academic_year_id,
        standard_id=ssm.standard_id,
        is_approved='1',
    ).exists():
        return

    try:
        data, _ = get_fee_term_plan_for_student_and_standard(
            academic_year_id, ssm.standard_id, student_id, returnValue=True, termDivision=True
        )
        total_allocated = float(get_total_fee_amount_for_standard(data, student_id))
    except exceptions.ValidationError:
        raise
    except Exception as exc:
        raise exceptions.ValidationError(
            f'Unable to compute allocated fee for advance validation: {exc}'
        ) from exc

    # Mapping exists but no payable total for this student (e.g. empty plan match) — do not cap.
    if total_allocated <= 0:
        return

    qs = FeeAdvanceCollection.objects.filter(
        student_id=student_id,
        academic_year_id=academic_year_id,
        is_active=True,
    )
    if exclude_collection_id:
        qs = qs.exclude(pk=exclude_collection_id)
    existing_sum = float(qs.aggregate(t=Sum('amount'))['t'] or 0)
    new_amt = float(amount)
    if new_amt + existing_sum > total_allocated + 0.01:
        raise exceptions.ValidationError({
            'amount': (
                f'Total fee advance (existing {existing_sum:.2f} + this {new_amt:.2f}) cannot exceed '
                f'total allocated fee {total_allocated:.2f} for this student and academic year.'
            )
        })

def get_student_opted_store_items(self, student_id, academic_year):
    student_store_mapping_data = StudentStoreMapping.objects.filter(
        student=student_id, fee_standard_mapping_item_selling__fee_standard_mapping__academic_year=academic_year
    )
    store_mapping_data = StudentStoreMappingReadSerializer(student_store_mapping_data).data
    return store_mapping_data

def get_fee_term_plan_for_student_and_standard(academicYear, standard, student, returnValue=False, termDivision=True):
    queryset = FeeStandardMapping.objects.filter(academic_year=academicYear, standard=standard, is_approved='1')
    query_list=[]
    if not queryset:
        raise exceptions.ValidationError('Fee plan is not approved!')
    if student:
        stud_obj = Student.objects.get(id=student)
        stud_standard_mapping_obj = StudentStandardMapping.objects.get(academic_year=academicYear,student=student,standard=standard)
        student_type = stud_obj.student_type
        queryset = queryset.filter(student_type=student_type).filter(
            Q(is_mandatory='1') | (Q(is_mandatory='0') & Q(standard_fee__fee_plan_student_feature_fee_plan__student=student))).distinct()
        for query in queryset:
            if not query.student_group and not query.gender and query.is_new_student == None:
                query_list.append(query)
            elif query.student_group and query.gender and query.is_new_student != None :
                if query.student_group == stud_standard_mapping_obj.student_group and query.gender == stud_obj.gender and query.is_new_student == stud_standard_mapping_obj.is_new_student:
                    query_list.append(query)
            elif query.gender and query.is_new_student!=None and not query.student_group:
                if query.gender == stud_obj.gender and query.is_new_student == stud_standard_mapping_obj.is_new_student:
                    query_list.append(query)
            elif query.student_group and query.gender and  query.is_new_student==None:
                if query.student_group == stud_standard_mapping_obj.student_group and query.gender == stud_obj.gender:
                    query_list.append(query)
            elif query.is_new_student!=None and query.student_group and not query.gender:
                if query.is_new_student == stud_standard_mapping_obj.is_new_student and query.student_group == stud_standard_mapping_obj.student_group:
                    query_list.append(query)
            elif query.student_group and query.is_new_student == None and not query.gender:
                if query.student_group == stud_standard_mapping_obj.student_group:
                    query_list.append(query)
            elif query.gender and not query.student_group and query.is_new_student==None:
                if query.gender == stud_obj.gender:
                    query_list.append(query)
            elif query.is_new_student!=None and not query.gender and not query.student_group:
                if query.is_new_student == stud_standard_mapping_obj.is_new_student:
                    query_list.append(query)
    serializer = FeeTermsSerializer(query_list, many=True)
    pendingReason = dict()
    if student:
        for fee in serializer.data:
            is_store = True if fee['codename'] == 'store' else False
            is_transport = True if fee['codename'] == 'transport' else False
            is_custom = True if fee['codename'] == 'custom' else False
            custom_fee_data = {}
            fee = get_fee_amount_for_student(student, fee, academicYear, standard, returnValue, pendingReason)
            if is_custom:
                fee['amount'] = 0
                for fee_st_feat in FeeplanStudentFeature.objects.filter(
                    is_active=True,fee_plan__standard_fee=fee['id'], student=student
                ).values():
                    custom_fee_data[fee_st_feat['fee_plan_id']] = fee_st_feat
                    fee['amount'] += fee_st_feat['amount'] if fee_st_feat['amount'] else 0
            fee['temp_sequence'] = 0
            if termDivision:
                fee_plan_ids = FeePlan.objects.filter(standard_fee__in=queryset, fee_plan_student_feature_fee_plan__student=student).values_list(
                    'id',flat=True
                )
                frac_total = 0
                max_count = len(fee['standard_fee'])
                for i, standard_fee in enumerate(fee['standard_fee'], start=1):
                    if not fee['temp_sequence'] or ( not standard_fee['sequence'] is None and standard_fee['sequence'] < fee['temp_sequence']):
                        fee['temp_sequence'] = standard_fee['sequence'] if standard_fee['sequence'] else 0
                    if fee['is_mandatory'] == '0' and standard_fee['id'] not in fee_plan_ids:
                        standard_fee['is_disabled'] = True
                    else:
                        standard_fee['is_disabled'] = False
                    if is_transport:
                        standard_fee['amount'] = fee['per_month_rate'] * standard_fee['rate']
                        standard_fee['rate_amount'] = standard_fee['amount']
                        standard_fee['areaname'] = fee['areaname']
                        standard_fee['area_id'] = fee['area_id']
                    elif is_custom and standard_fee['id'] in custom_fee_data:
                        standard_fee['amount'] = custom_fee_data[standard_fee['id']]['amount']
                        standard_fee['rate'] = custom_fee_data[standard_fee['id']]['amount']
                    elif is_store:
                        standard_fee['amount'] = fee['amount']
                    elif standard_fee['is_amount']:
                        standard_fee['amount'] = standard_fee['rate']
                    else:
                        amount = convert_percentage_to_amount(fee['amount'], standard_fee['rate'])
                        frac, whole = math.modf(amount)
                        if i == max_count:
                            standard_fee['rate_amount'] = standard_fee['amount'] = whole + frac_total + frac
                        else:
                            frac_total += frac
                            standard_fee['rate_amount'] = standard_fee['amount'] = whole
        if not FormdefinitionService.get_formdefintion_data({}, 'fee_configurations', 'hide_fee_term_sequence'):
            serializer_data = sorted(serializer.data, key=lambda d: d['temp_sequence'])
        else:
            serializer_data = serializer.data
    return serializer_data, pendingReason


def get_total_disabled_fee(data, student=None):
    total = 0
    for fee in data:
        if fee['codename'] == TRANSPORT_CODENAME:
            if not student:
                continue
        for terms in fee['standard_fee']:
            if terms['is_disabled']:
                total += terms['amount']
    return total


def _enrich_advance_payment_row_for_term_paid_amount(adv_merged, fee_plan_id):
    """
    Shape merged FeeAdvanceCollectionPaymentDetail data like PaymentDetail.values() rows
    so the fee_calculation loop (term_paid_amount) does not KeyError on fee_plan__* keys.
    """
    fp = FeePlan.objects.select_related('standard_fee__fee_type').filter(pk=fee_plan_id).first()
    if not fp or not fp.standard_fee:
        return None
    ft = fp.standard_fee.fee_type
    tx_dt = adv_merged.get('transaction_date') or adv_merged.get('created')
    if isinstance(tx_dt, datetime):
        pass
    elif type(tx_dt) is date_cls:
        tx_dt = datetime.combine(tx_dt, datetime.min.time())
    else:
        tx_dt = datetime.now()
    created = adv_merged.get('created') or tx_dt
    fac_created = adv_merged.get('created') or tx_dt
    fac_receipt = adv_merged.get('receipt_num') or ''
    amt = adv_merged.get('amount')
    if amt is None:
        return None
    return {
        'fee_plan': fee_plan_id,
        'fee_plan__terms': fp.terms,
        'fee_plan__rate': fp.rate,
        'fee_plan__standard_fee__fee_type': ft.id if ft else 0,
        'fee_plan__standard_fee__fee_type__name': getattr(ft, 'name', '') or '',
        'fee_plan__standard_fee__receipt_alias': fp.standard_fee.receipt_alias or '',
        'id': 0,
        'transaction_date': tx_dt,
        'amount_paid': float(amt),
        'fee_fine_amount': 0,
        'total_fine_days_paid': 0,
        'fee_collection': 0,
        'fee_collection__receipt_num': fac_receipt,
        'created': created,
        'fee_collection__created': fac_created,
        'fee_collection__user__staff__first_name': '',
        'fee_collection__user__staff__middle_name': '',
        'fee_collection__user__staff__last_name': '',
        'is_from_advance': True,
        'mode_of_payment': adv_merged.get('mode_of_payment') or '',
        'payment_ref_num': adv_merged.get('payment_ref_num') or '',
    }

def fee_calculation(self, student, academicYear, standard, returnValue=False, termDivision=True, extra_params={}):
    concession_amount = 0
    data, pending_reason = get_fee_term_plan_for_student_and_standard(academicYear, standard, student, returnValue,
                                                                     termDivision)
    total_amount = total_payable = get_total_fee_amount_for_standard(data, student)
    total_pending_amount = 0
    total_adjusted_amount = 0
    total_adjusted_amount_at_fee_collection = 0
    total_paid_amount = 0
    total_fine_amount = 0
    adjustment_in_pending_block_fee_collection = False
    adjustment_in_pending_block_fee_collection_error = ''
    is_has_approval_permission_on_adj = False
    adjustment_parent_ids = []
    adjustment_unapproved_parent_ids = []
    paid_fee_plan_ids = []
    adjustment_approval_enabled = FormdefinitionService.get_formdefintion_data({}, 'fee_configurations', 'adjustment_approval_enabled')
    if termDivision and student:
        filter_query = {
            'fee_plan__standard_fee__academic_year':academicYear,'fee_plan__standard_fee__standard':standard,
            'fee_collection__student':student, 'fee_collection__is_active':True
        }
        if 'from_paid_range' in extra_params and extra_params['from_paid_range'] and 'to_paid_range' in extra_params and extra_params['to_paid_range']:
            filter_query['fee_collection__transaction_date__in'] = (extra_params['from_paid_range'], extra_params['to_paid_range'])
        payment_detail = PaymentDetail.objects.filter(**filter_query)
        paid_data = payment_detail.annotate(transaction_date=F('fee_collection__transaction_date')).values(
            'fee_plan','fee_plan__terms','fee_plan__rate','fee_plan__standard_fee__fee_type','fee_plan__standard_fee__fee_type__name',
            'id', 'transaction_date', 'amount_paid', 'fee_fine_amount', 'total_fine_days_paid','fee_plan__standard_fee__receipt_alias',
            'fee_collection','fee_collection__receipt_num', 'created', 'fee_collection__user__staff__first_name',
            'fee_collection__user__staff__middle_name', 'fee_collection__user__staff__last_name','fee_collection__created'
        )
        advance_amount = FeeAdvanceCollection.objects.filter(academic_year=academicYear,student=student,is_active=True).values()
        advance_amount_list = [d['id'] for d in advance_amount]
        advance_fee_collection_payment_detail = FeeAdvanceCollectionPaymentDetail.objects.filter(fee_advance_collection__in=advance_amount_list).values()
        advance_fee_collection_payment_detail_dict = {}
        for advance_fee_collection in advance_amount:
            if advance_fee_collection['id'] not in advance_fee_collection_payment_detail_dict:
                advance_fee_collection_payment_detail_dict[advance_fee_collection['id']] = {}
            advance_fee_collection_payment_detail_dict[advance_fee_collection['id']]=advance_fee_collection
        advance_payment_detail_dict = {}
        advance_payment_collection_list = []
        for advance_payment_detail in advance_fee_collection_payment_detail:
            advance_payment_collection_list.append(advance_payment_detail['fee_advance_collection_id'])
            if advance_payment_detail['fee_plan_id'] not in advance_payment_detail_dict:
                advance_payment_detail_dict[advance_payment_detail['fee_plan_id']] = {}
            advance_payment_detail_dict[advance_payment_detail['fee_plan_id']].update(advance_payment_detail)
            advance_payment_detail_dict[advance_payment_detail['fee_plan_id']].update(advance_fee_collection_payment_detail_dict[advance_payment_detail['fee_advance_collection_id']])
        adv_not_having_fee_plan = set(advance_fee_collection_payment_detail_dict.keys()) - set(advance_payment_collection_list)
        adjustment_concession_amount = AdjustmentFee.objects.filter(fee_plan__standard_fee__academic_year=academicYear,
                                                                  student=student, fee_plan__standard_fee__standard= standard,is_active=True)
        adjustment_approval_data = {}
        for adjustment_row_data in adjustment_concession_amount.values('adjustment_fee_parent_id'):
            if adjustment_row_data['adjustment_fee_parent_id']:
                adjustment_parent_ids.append(adjustment_row_data['adjustment_fee_parent_id'])
        if adjustment_parent_ids:
            approval_obj = Approval(self.request, 'AdjustmentFeeParent', adjustment_parent_ids)
            adjustment_approval_data = approval_obj.get_approval_status_with_permission()
        adjustment_amount_mapping = {}
        adjustment_date_reason_wise={}
        concession_amount_mapping = {}
        for adjustment_amount in adjustment_concession_amount.filter(concession=None).values(
            'fee_plan', 'amount','is_addition', 'reason_id', 'reason_id__name', 'concession', 'id',
            'adjustment_fee_parent_id','fee_collection_id','created'):
            if adjustment_amount['fee_plan'] not in adjustment_amount_mapping:
                adjustment_amount_mapping[adjustment_amount['fee_plan']] = {
                    'total_increment_adjustment_amount': 0, 'adjustment_list': [],
                    'total_decrement_adjustment_amount': 0, 'is_adjustment_in_pending': False,
                    'is_has_approval_permission_on_adj': False, 'adjustment_parent_ids': [],
                    'total_decrement_adjustment_amount_at_fee_collection':0
                }
            if adjustment_amount['adjustment_fee_parent_id'] in adjustment_approval_data:
                adjustment_amount['is_has_approval_permission_on_adj'] = adjustment_approval_data[adjustment_amount['adjustment_fee_parent_id']].is_has_approval_permission
                is_has_approval_permission_on_adj = True
                adjustment_amount_mapping[adjustment_amount['fee_plan']]['adjustment_parent_ids'].append(adjustment_amount['adjustment_fee_parent_id'])
            if adjustment_amount['adjustment_fee_parent_id'] and adjustment_amount['adjustment_fee_parent_id'] in adjustment_approval_data \
                and not Approval.is_allowable_for_fee_collec_or_adj(
                    adjustment_approval_data[adjustment_amount['adjustment_fee_parent_id']].approval_status
                ):
                    adjustment_amount['is_adjustment_in_pending'] = True
                    adjustment_in_pending_block_fee_collection = True
                    adjustment_in_pending_block_fee_collection_error = 'Adjustment Pending For Approval'
                    adjustment_unapproved_parent_ids.append(adjustment_amount['adjustment_fee_parent_id'])
                    continue
            if adjustment_amount['is_addition']:
                adjustment_amount_mapping[adjustment_amount['fee_plan']]['total_increment_adjustment_amount'] += adjustment_amount['amount']
            else:
                adjustment_amount_mapping[adjustment_amount['fee_plan']]['total_decrement_adjustment_amount'] += adjustment_amount['amount']
                if adjustment_amount['fee_collection_id']:
                    adjustment_amount_mapping[adjustment_amount['fee_plan']]['total_decrement_adjustment_amount_at_fee_collection'] += adjustment_amount['amount']
            adjustment_amount_mapping[adjustment_amount['fee_plan']]['adjustment_list'].append(adjustment_amount)
            if adjustment_amount['created'].strftime("%d-%m-%Y")+str(adjustment_amount['reason_id']) not in adjustment_date_reason_wise:
                adjustment_date_reason_wise[adjustment_amount['created'].strftime("%d-%m-%Y")+str(adjustment_amount['reason_id'])] = {'total_amount':0}
            adjustment_date_reason_wise[adjustment_amount['created'].strftime("%d-%m-%Y")+str(adjustment_amount['reason_id'])].update(adjustment_amount)
            adjustment_date_reason_wise[adjustment_amount['created'].strftime("%d-%m-%Y")+str(adjustment_amount['reason_id'])]['total_amount']+=adjustment_amount['amount']
        for concession_amount_adj in adjustment_concession_amount.filter(concession__isnull=False).values(
            'fee_plan', 'amount','is_addition', 'reason_id', 'reason_id__name', 'concession', 'id', 'concession__concession_type__name',
            'adjustment_fee_parent_id','fee_collection_id','created'):
            if concession_amount_adj['fee_plan'] not in concession_amount_mapping:
                concession_amount_mapping[concession_amount_adj['fee_plan']] = {
                    'concession_list': []
                }
            concession_amount_mapping[concession_amount_adj['fee_plan']]['concession_list'].append(concession_amount_adj)
        adjustment_list= adjustment_date_reason_wise.values()
        concession_amount_data = dict(adjustment_concession_amount.exclude(concession=None).values_list('fee_plan', 'amount'))
        term_paid_amount = dict()
        paid_fee_payment_detail_ids = []
        paid_fee_payment_detail_mapping = {}
        fee_collection_ids = []
        for p in paid_data:
            fee_collection_ids.append(p['fee_collection'])
            paid_fee_payment_detail_ids.append(p['id'])
            paid_fee_plan_ids.append(p['fee_plan'])
            if p['fee_plan'] in term_paid_amount:
                term_paid_amount[p['fee_plan']].append(p)
            else:
                term_paid_amount[p['fee_plan']] = [p]
            total_paid_amount += p['amount_paid']
        # One enriched row per fee_plan from saved fee advance (same shape as PaymentDetail.values())
        for fee_plan_id, adv_merged in advance_payment_detail_dict.items():
            enriched = _enrich_advance_payment_row_for_term_paid_amount(adv_merged, fee_plan_id)
            if not enriched:
                continue
            if fee_plan_id not in term_paid_amount:
                term_paid_amount[fee_plan_id] = [enriched]
            else:
                term_paid_amount[fee_plan_id].append(enriched)
        mode_of_payment_data = FeeCollectionModeOfPayment.objects.filter(
            fee_collection__in=fee_collection_ids
        ).values()
        mode_of_payment_mapping = {}
        for mode_of_payment in mode_of_payment_data:
            if mode_of_payment['fee_collection_id'] not in mode_of_payment_mapping:
                mode_of_payment_mapping[mode_of_payment['fee_collection_id']] = []
            mode_of_payment_mapping[mode_of_payment['fee_collection_id']].append(mode_of_payment)
        addition_charge_query = FeeCollectionAdditionChargeMapping.objects.filter(payment_detail__in=paid_fee_payment_detail_ids)
        additional_charge_col_data = []
        if addition_charge_query:
            addition_charge_ser = FeeCollectionAdditionChargeMappingReadSerilaizer(addition_charge_query, many=True)
            additional_charge_col_data = addition_charge_ser.data
        for addition_row in additional_charge_col_data:
            if addition_row['payment_detail'] not in paid_fee_payment_detail_mapping:
                paid_fee_payment_detail_mapping[addition_row['payment_detail']] = []
            paid_fee_payment_detail_mapping[addition_row['payment_detail']].append(addition_row)
        global_counter = 0
        for fee in data:
            fee['allow_fee_collection'] = True
            fee_pending_amount = 0
            fee['total_paid_amount'] = 0
            fee_concession_amount = 0
            fee['adjustment_amount'] = 0
            fee['total_amount'] = fee['amount']
            term_total_amount = 0
            if 'standard_fee' not in fee:
                continue
            for terms in fee['standard_fee']:
                fine_paid_amount = 0
                total_fine_days_paid = 0
                temp_payment_detail = list()
                temp_term_paid_amount = 0
                terms['concession_amount'] = 0
                terms['fee_type_name'] = fee['fee_type_name']
                terms['fee_type'] = fee['fee_type']
                terms['fee_type_alias_name'] = fee ['receipt_alias']
                terms['allow_fee_collection'] = True
                terms['pending_amount'] = 0
                terms['paid_amount'] = 0
                terms['total_amount'] = 0
                terms['adjustment_amount'] = 0
                terms['adjustment_list'] = []
                terms['concession_list'] =[]
                if 'reason' in fee and fee['reason']:
                    continue
                if terms['is_disabled']:
                    continue #careful while defining variable below
                for advance_fee in adv_not_having_fee_plan:
                    if 'is_advance_added' not in advance_fee_collection_payment_detail_dict[advance_fee] or not advance_fee_collection_payment_detail_dict[advance_fee]['is_advance_added']:
                        if 'remaining_amount' not in advance_fee_collection_payment_detail_dict[advance_fee]:
                            advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount'] = advance_fee_collection_payment_detail_dict[advance_fee]['amount']
                        if advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount'] >= terms['amount']:
                            if terms['id'] not in term_paid_amount:
                                term_paid_amount[terms['id']]=[]
                            temp={
                                'amount_paid':terms['amount'],
                                'fee_fine_amount': 0,
                                'total_fine_days_paid': 0,
                                'transaction_date': datetime.now(),
                                'fee_plan__standard_fee__fee_type': 0,
                                'fee_plan__standard_fee__fee_type__name': '',
                                'fee_plan__standard_fee__receipt_alias': '',
                                'fee_plan__terms': '',
                                'fee_plan__rate': 0,
                                'fee_collection__receipt_num': '',
                                'created': datetime.now(),
                                'fee_collection__created': datetime.now(),
                                'fee_collection': 0,
                                'id': 0,
                                'fee_collection__user__staff__first_name': '',
                                'fee_collection__user__staff__middle_name': '',
                                'fee_collection__user__staff__last_name': '',
                                'is_from_advance':True,
                                'mode_of_payment': advance_fee_collection_payment_detail_dict[advance_fee]['mode_of_payment'],
                                'payment_ref_num': advance_fee_collection_payment_detail_dict[advance_fee]['payment_ref_num']
                            }
                            term_paid_amount[terms['id']].append(temp)
                            advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount']-=terms['amount']
                        else:
                            if terms['id'] not in term_paid_amount:
                                term_paid_amount[terms['id']]=[]
                            temp={
                                'amount_paid':advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount'],
                                'fee_fine_amount': 0,
                                'total_fine_days_paid': 0,
                                'transaction_date': datetime.now(),
                                'fee_plan__standard_fee__fee_type': 0,
                                'fee_plan__standard_fee__fee_type__name': '',
                                'fee_plan__standard_fee__receipt_alias': '',
                                'fee_plan__terms': '',
                                'fee_plan__rate': 0,
                                'fee_collection__receipt_num': '',
                                'created': datetime.now(),
                                'fee_collection__created': datetime.now(),
                                'fee_collection': 0,
                                'id': 0,
                                'fee_collection__user__staff__first_name': '',
                                'fee_collection__user__staff__middle_name': '',
                                'fee_collection__user__staff__last_name': '',
                                'is_from_advance':True,
                                'mode_of_payment': advance_fee_collection_payment_detail_dict[advance_fee]['mode_of_payment'],
                                'payment_ref_num': advance_fee_collection_payment_detail_dict[advance_fee]['payment_ref_num']
                            }
                            term_paid_amount[terms['id']].append(temp)
                            advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount']-=advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount']
                        if advance_fee_collection_payment_detail_dict[advance_fee]['remaining_amount']==0:
                            advance_fee_collection_payment_detail_dict[advance_fee]['is_advance_added']=True
                if terms['id'] in term_paid_amount:
                    for paid in term_paid_amount[terms['id']]:
                        temp_term_paid_amount += paid['amount_paid']
                        fine_paid_amount += paid['fee_fine_amount']
                        total_fine_days_paid += paid['total_fine_days_paid']
                        transaction_date_str = paid['transaction_date'].strftime("%d-%m-%Y")
                        temp_payment = {
                                'fee_type':paid['fee_plan__standard_fee__fee_type'],'fee_type_name':paid['fee_plan__standard_fee__fee_type__name'],'fee_type_alias_name':paid['fee_plan__standard_fee__receipt_alias'],
                                'fee_term':paid['fee_plan__terms'],'total_term_amount':paid['fee_plan__rate'],'transaction_date_str':transaction_date_str,
                                'transaction_date': paid['transaction_date'], 'amount_paid': paid['amount_paid'],
                                'fee_collection__receipt_num': paid['fee_collection__receipt_num'],
                                'created':paid['created'],
                                'fee_collection__created':paid['fee_collection__created'],
                                'fee_fine_amount' : paid['fee_fine_amount'],
                                'total_fine_days_paid': paid['total_fine_days_paid'],
                                'fee_collection': paid['fee_collection'],
                                'paid_additional_charge_data': paid_fee_payment_detail_mapping[paid['id']] if paid['id'] in paid_fee_payment_detail_mapping else [],
                                'collected_user_full_name': get_full_name(
                                    paid['fee_collection__user__staff__first_name'],
                                    paid['fee_collection__user__staff__middle_name'],
                                    paid['fee_collection__user__staff__last_name']
                                ),
                            }
                        if 'is_from_advance' in paid and paid['is_from_advance']:
                            temp_payment['mode_of_payment'] = paid['mode_of_payment']
                            temp_payment['mode_of_payment_list'] = [
                                {
                                    'amount': paid['amount_paid'],
                                    'bank_detail_id':None,
                                    'created': "2026-01-03T11:13:07.228355",
                                    'fee_collection_id': None,
                                    'id':None,
                                    'loan_credited_date': None,
                                    'loan_from_bank': None,
                                    'loan_to_bank': None,
                                    'loan_utr_number': None,
                                    'mode_of_payment': paid['mode_of_payment'],
                                    'modified': "2026-01-03T11:13:07.228502",
                                    'payment_ref_num': paid['payment_ref_num'],
                                }
                            ]
                        else:
                            temp_payment['mode_of_payment'] = mode_of_payment_mapping[paid['fee_collection']][0]['mode_of_payment']
                            temp_payment['mode_of_payment_list'] = mode_of_payment_mapping[paid['fee_collection']]
                        temp_payment_detail.append(temp_payment)
                terms['amount'] = terms['amount'] if terms['amount'] else 0
                terms['pending_amount'] = terms['amount'] - temp_term_paid_amount
                terms['paid_amount'] = temp_term_paid_amount
                fee['total_paid_amount'] += terms['paid_amount']
                terms['total_amount'] = terms['amount']
                if terms['id'] in adjustment_amount_mapping:
                    adjustment_amount = adjustment_amount_mapping[terms['id']]
                    terms['adjustment_list'] = adjustment_amount['adjustment_list']
                    total_incremented_adjustment = adjustment_amount['total_increment_adjustment_amount']
                    total_decremented_adjustment = adjustment_amount['total_decrement_adjustment_amount']
                    total_decremented_adjustment_at_fee_collection = adjustment_amount['total_decrement_adjustment_amount_at_fee_collection']
                    if adjustment_approval_enabled and not adjustment_amount['is_adjustment_in_pending']:
                        fee['allow_fee_collection'] = False
                        fee['allow_fee_collection_error'] = 'Adjustment Is in Pending'
                        terms['allow_fee_collection'] = False
                        terms['allow_fee_collection_error'] = 'Adjustment Is in Pending'
                    if adjustment_approval_enabled and adjustment_amount['is_has_approval_permission_on_adj']:
                        fee['is_has_approval_permission_on_adj'] = True
                        terms['is_has_approval_permission_on_adj'] = True
                    terms['adjustment_amount'] = total_decremented_adjustment
                    terms['adjustment_amount_at_fee_collection'] = total_decremented_adjustment_at_fee_collection
                    terms['adjustment_amount_inc_min_dec'] =  total_incremented_adjustment - total_decremented_adjustment
                    if total_incremented_adjustment:
                        fee['total_amount'] += total_incremented_adjustment
                        total_amount += total_incremented_adjustment
                        terms['pending_amount'] += total_incremented_adjustment
                        terms['total_amount'] += total_incremented_adjustment
                        terms['amount'] += total_incremented_adjustment
                        fee['amount'] += total_incremented_adjustment
                        total_payable += total_incremented_adjustment
                    if total_decremented_adjustment:
                        terms['pending_amount'] -= total_decremented_adjustment
                        terms['amount'] -= total_decremented_adjustment
                        fee['amount'] -= total_decremented_adjustment
                        total_payable -= total_decremented_adjustment
                        total_adjusted_amount += total_decremented_adjustment
                        total_adjusted_amount_at_fee_collection += total_decremented_adjustment_at_fee_collection
                        fee['adjustment_amount'] += total_decremented_adjustment
                if terms['id'] in concession_amount_data:
                    terms['concession_amount'] = concession_amount_data[terms['id']]
                    terms['amount'] -= terms['concession_amount']
                    terms['pending_amount'] -= terms['concession_amount']
                    fee['amount'] -= terms['concession_amount']
                    total_payable -= terms['concession_amount']
                if terms['id'] in concession_amount_mapping:
                    concession_amount_adj = concession_amount_mapping[terms['id']]
                    terms['concession_list'] = concession_amount_adj['concession_list']
                fee_concession_amount += terms['concession_amount']
                terms['payment_detail'] = temp_payment_detail
                terms['total_fine_paid_amount'] = fine_paid_amount
                terms['total_fine_days_paid'] = total_fine_days_paid
                terms['total_fine_amount'],terms['total_fine_no_of_days_late'] = calculate_fine_amount(terms)
                terms['amount'] += terms['total_fine_amount']
                fee['amount'] += terms['total_fine_amount']
                total_fine_amount += terms['total_fine_amount']
                terms['pending_fine_amount'] = terms['total_fine_amount'] - fine_paid_amount
                terms['pending_amount'] += terms['total_fine_amount']
                total_pending_amount += terms['pending_amount']
                fee_pending_amount += terms['pending_amount']
                global_counter += 1
                terms['global_counter'] = global_counter
                if not terms['is_disabled']:
                    term_total_amount += terms['amount']
            fee['concession_amount'] = fee_concession_amount
            fee['total_payable_amount'] = term_total_amount
            concession_amount += fee_concession_amount
            fee['pending_amount'] = fee_pending_amount
    return {'data': data, 'concession_amount': concession_amount, 'total_amount': total_amount, 'amount': total_payable,
            'total_payable': total_payable, 'adjustment_list': adjustment_list,
            'adjustment_in_pending_block_fee_collection':  adjustment_in_pending_block_fee_collection,
            'adjustment_in_pending_block_fee_collection_error': adjustment_in_pending_block_fee_collection_error,
            'is_has_approval_permission_on_adj': is_has_approval_permission_on_adj,
            'adjustment_parent_ids': list(set(adjustment_parent_ids)),
            'adjustment_unapproved_parent_ids': list(set(adjustment_unapproved_parent_ids)),
            'reason': pending_reason, 'total_pending_amount': total_pending_amount,
            'total_adjusted_amount': total_adjusted_amount,'total_adjusted_amount_at_fee_collection': total_adjusted_amount_at_fee_collection, 'total_paid_amount': total_paid_amount, 'total_fine_amount': total_fine_amount}

"""
    this is pending - Returning fee structure based on student group
"""
def get_fee_structure_for_standard(self, academic_year, standard_ids):
    """ Get the Fees Strucuture For all the standards """
    fee_type_ids = set()
    fee_group_ids = set()
    fee_standard_mapping_ids = set()
    fee_standard_mapping_data = FeeStandardMapping.objects.filter(
        academic_year=academic_year, standard__in=standard_ids
    ).values(
        'id',
        'academic_year',
        'standard',
        'fee_type',
        'amount',
        'is_mandatory',
        'sub_fee_type',
        'is_approved',
        'student_type',
        'student_group',
        'fee_group',
        'created',
        'modified'
    )
    for fee_standard_row in fee_standard_mapping_data:
        fee_type_ids.add(fee_standard_row['fee_type'])
        fee_group_ids.add(fee_standard_row['fee_group'])
        fee_standard_mapping_ids.add(fee_standard_row['id'])
    fee_type_mapping = {fee['id']: fee for fee in FeeType.objects.filter(id__in=list(fee_type_ids)).values()}
    standard_data_mapping = {standard['id']: standard for standard in Standard.objects.filter(id__in=list(standard_ids)).values()}
    academic_year_data = AcademicYear.objects.get(id=academic_year)
    fee_group = {fee_group['id']: fee_group for fee_group in FeeGroup.objects.filter(id__in=list(fee_group_ids)).values()}
    fee_plan_data = FeePlan.objects.filter(standard_fee__in=list(fee_standard_mapping_ids))
    fee_plan_data = FeePlanSerializer(fee_plan_data, many=True).data
    fee_standard_mapping_item_selling_price = FeeStandardMappingItemSellingPrice.objects.filter(
        fee_standard_mapping__in=fee_standard_mapping_ids
    ).values()
    fee_standard_map_to_item_selling_price = {}
    for item_selling_row in fee_standard_mapping_item_selling_price:
        if item_selling_row['fee_standard_mapping'] not in fee_standard_map_to_item_selling_price:
            fee_standard_map_to_item_selling_price[item_selling_row['fee_standard_mapping']] = []
        fee_standard_map_to_item_selling_price[item_selling_row['fee_standard_mapping']].append(
            item_selling_row
        )
    fee_plan_standard_fee_mapping = {}
    fee_plan_ids = set()
    additional_charge_mapping = {}
    for fee_plan_row in fee_plan_data:
        if fee_plan_row['standard_fee'] not in fee_plan_standard_fee_mapping:
            fee_plan_standard_fee_mapping[fee_plan_row['standard_fee']] = []
        fee_plan_standard_fee_mapping[fee_plan_row['standard_fee']].append(fee_plan_row)
        fee_plan_ids.add(fee_plan_row['id'])
    # fee_addition_charge_mapping = FeePlanAdditionalChargeMapping.objects.filter(
    #     fee_plan__in=fee_plan_ids, is_active=True
    # ).values()
    # addition_charge_mapping_data = AdditionalCharge.objects.filter(
    #     is_active=True
    # ).values()
    # additional_charge_type_mapping = {addd['id']:addd for addd in AdditionalChargeType.objects.filter(
    #     is_active=True
    # ).values('name', 'id')}
    # addition_charge_mapping = {}
    # for add in addition_charge_mapping_data:
    #     print(add)
    #     add['additional_charge_type_name'] = additional_charge_type_mapping[add['additional_charge_type_id']]
    #     addition_charge_mapping[add['id']] = add
    # for fee_additional in fee_addition_charge_mapping:
    #     if fee_additional['additional_charge'] in addition_charge_mapping:
    #         fee_additional['additional_charge'] = addition_charge_mapping[fee_additional['additional_charge']]
    #     if fee_additional['fee_plan'] not in additional_charge_mapping:
    #         additional_charge_mapping[fee_additional['fee_plan']] = []
    #     additional_charge_mapping[fee_additional['fee_plan']].append(fee_additional)
    for fee_plan_row in fee_plan_data:
        fee_plan_row['additional_charge'] = []
        if fee_plan_row['id'] in additional_charge_mapping:
            fee_plan_row['additional_charge'] = additional_charge_mapping[fee_plan_row['id']]
    fee_standard_data_mapping = {}
    for fee_s_row in fee_standard_mapping_data:
        if not fee_s_row['is_approved']:
            standard_name = Standard.objects.get(id=fee_s_row['standard']).name
            raise exceptions.ValidationError(f'Finance is not approved for {standard_name}')
        fee_s_row['fee_type_name'] = fee_type_mapping[fee_s_row['fee_type']]['name']
        fee_s_row['codename'] = fee_type_mapping[fee_s_row['fee_type']]['codename']
        fee_s_row['is_feature'] = fee_type_mapping[fee_s_row['fee_type']]['is_feature']
        fee_s_row['standard_name'] = standard_data_mapping[fee_s_row['standard']]['name']
        fee_s_row['academic_year_start_date'] = academic_year_data.start_date
        fee_s_row['academic_year_end_date'] = academic_year_data.end_date
        fee_s_row['academic_year_value'] = f'{academic_year_data.start_date.year}-{academic_year_data.end_date.year}' if academic_year_data else None
        fee_s_row['fee_group_name'] = fee_group[fee_s_row['fee_group']]['name'] if fee_s_row['fee_group'] in fee_group else ''
        fee_s_row['fee_group_code_name'] = fee_group[fee_s_row['fee_group']]['code_name']  if fee_s_row['fee_group'] in fee_group else ''
        fee_s_row['standard_fee'] = fee_plan_standard_fee_mapping[fee_s_row['id']] if fee_s_row['id'] in fee_plan_standard_fee_mapping else []
        fee_s_row['fee_standard_mapping_item_selling_price_fee_standard_mapping'] = fee_standard_map_to_item_selling_price[fee_s_row['id']] if fee_s_row['id'] in fee_standard_map_to_item_selling_price else []
        if fee_s_row['standard'] not in fee_standard_data_mapping:
            fee_standard_data_mapping[fee_s_row['standard']] = []
        fee_standard_data_mapping[fee_s_row['standard']].append(fee_s_row)
    return fee_standard_data_mapping


"""
    standard_route_price_data = [{km: 10, rate: 20}, {km: 20, rate: 30}]
    student_km => 15
    First Find price greater than 15 that is 20 and then return 20
    if 20 is not there then it find the next below rate that is 10
"""
def find_km_near_to_range(standard_route_price_data, student_km):
    lesser_than_value = {}
    greater_than_value = {}
    for standard_route in standard_route_price_data:
        if standard_route['km'] >=  student_km:
            if not greater_than_value:
                greater_than_value = standard_route
            elif standard_route['km'] < greater_than_value['km']:
                greater_than_value = standard_route
        elif standard_route['km'] < student_km:
            if not lesser_than_value:
                lesser_than_value = standard_route
            elif standard_route['km'] > lesser_than_value['km']:
                lesser_than_value = standard_route
    if greater_than_value:
        return greater_than_value
    else:
        return lesser_than_value

# student type need to be supported
""" 
    extra_params => {'student_ids' : []}
    extra_params => {'standard_ids': []}
    extra_params => {'all_approved_standards': 1}
    Any one of this should be sent if all 3 send 1priority will be given based on hierarchy above
"""
def fee_calculation_bulk_students(self, academic_year, extra_params={}):
    adjustment_approval_enabled = FormdefinitionService.get_formdefintion_data({}, 'fee_configurations', 'adjustment_approval_enabled')

    student_standard_filter = {'academic_year': academic_year, 'student__is_active': True}
    if 'student_ids' in extra_params and extra_params['student_ids']:
        student_standard_filter['student__in'] = extra_params['student_ids']
    elif 'standard_ids' in extra_params and extra_params['standard_ids']:
        student_standard_filter['standard__in'] = extra_params['standard_ids']
    elif 'all_approved_standards' in extra_params and extra_params['all_approved_standards']:
        student_standard_filter['standard__in'] = FeeStandardMapping.objects.filter(
            academic_year=academic_year, is_approved=1
        ).values_list('standard', flat=True)
    else:
        raise exceptions.ValidationError('Invalid Request')
    hide_fee_term_sequence = FormdefinitionService.get_formdefintion_data({}, 'fee_configurations', 'hide_fee_term_sequence')
    student_standard_data = StudentStandardMapping.objects.filter(
       **student_standard_filter
    ).values('standard_id', 'student_id').order_by('student_id')
    student_standard_ids = set()
    student_standard_mapping = {}
    student_ids = set()
    for student_standard in student_standard_data:
        student_standard_mapping[student_standard['student_id']] = student_standard['standard_id']
        student_standard_ids.add(student_standard['standard_id'])
        student_ids.add(student_standard['student_id'])
    standard_fee_structure_mapping = get_fee_structure_for_standard(self, academic_year, student_standard_ids)
    price_on_area_standard_setting = {}
    for student_standard in student_standard_ids: #optimize this
        price_on_area_standard_setting[student_standard] =  ConfigurationService.get_setting_value('price_on_area', academic_year, student_standard)
    route_user_address = {route['user__student']: route for route in  RouteUserAddress.objects.filter(user__student__in=student_ids, academic_year=academic_year,is_active=True).values(
        'user__student', 'area'
    )}
    standard_route_price_mapping = {}
    student_custom_fee_mapping = {}
    route_price_data  = RoutePrice.objects.filter(price_plan__academic_year=academic_year, price_plan__standard__in=student_standard_ids,
                                                is_active=True).values('price_plan__standard', 'area', 'km', 'rate')
    for standard_route_price in route_price_data:
        if standard_route_price['price_plan__standard'] not in standard_route_price_mapping:
            standard_route_price_mapping[standard_route_price['price_plan__standard']] = {'area_wise': {}, 'km_wise': {}}
        if standard_route_price['area']:
            standard_route_price_mapping[standard_route_price['price_plan__standard']]['area_wise'][standard_route_price['area']] = standard_route_price
        if standard_route_price['km']:
            standard_route_price_mapping[standard_route_price['price_plan__standard']]['km_wise'][standard_route_price['km']] = standard_route_price
    student_store_mapping = StudentStoreMapping.get_store_amount_for_students(self, student_ids)
    
    custom_fee_student_data = FeeplanStudentFeature.objects.filter(
        student__in=student_ids, is_active=True
    ).values()
    for custom_fee in custom_fee_student_data:
        if custom_fee['student_id'] not in student_custom_fee_mapping:
            student_custom_fee_mapping[custom_fee['student_id']] = {'custom_fee_data': {}, 'total_amount': 0}
        student_custom_fee_mapping[custom_fee['student_id']]['custom_fee_data'][custom_fee['fee_plan_id']] = custom_fee
        student_custom_fee_mapping[custom_fee['student_id']]['total_amount'] += custom_fee['amount']
    fee_plan_ids = set()
    for student_standard in student_standard_data:
        student_standard['fee_data'] = {}
        temp_fee_data = standard_fee_structure_mapping[student_standard['standard_id']]
        for fee in temp_fee_data:
            current_student_id = student_standard['standard_id']
            current_standard_id = student_standard['standard_id']
            is_store = True if fee['codename'] == 'store' else False
            is_transport = True if fee['codename'] == 'transport' else False
            is_custom = True if fee['codename'] == 'custom' else False
            fee['temp_sequence'] = 0
            fee['pending_reason'] = ''
            custom_fee_data = {}
            if is_transport:
                transport_return_data = {
                    'routeFeeAmount': 0,
                    'routePriceRate': 0,
                    'reason': '',
                    'areaname': '',
                    'area_id':0
                }
                if current_student_id in route_user_address:
                    transport_return_data['areaname'] = route_user_address[current_student_id]['area']['name']
                    transport_return_data['area_id'] = route_user_address[current_student_id]['area']['id']
                    transport_return_data['area_km'] = route_user_address[current_student_id]['area']['km']
                    if current_standard_id not in standard_route_price_mapping:
                        transport_return_data['reason'] = 'Route Price is not set'
                    else:
                        standard_route_price_data = standard_route_price_mapping[current_standard_id]
                        if price_on_area_standard_setting[current_student_id] == '0':
                            route_price_data = find_km_near_to_range(standard_route_price_data['km_wise'], transport_return_data['area_km'])
                            transport_return_data['routePriceRate'] = route_price_data['rate']
                            transport_return_data['routeFeeAmount'] = route_price_data['reate'] * fee['amount']
                        else:
                            transport_return_data['routePriceRate'] = standard_route_price_data['area_wise'][transport_return_data['area_id']]['rate']
                            transport_return_data['routePriceRate'] = transport_return_data['routePriceRate'] * fee['amount']
                else:
                    transport_return_data['reason'] = 'Student is opted for the transport but not yet registered to any area.'
                #update to fee object
                fee['amount'] = transport_return_data['routeFeeAmount']
                fee['reason'] = transport_return_data['reason']
                fee['per_month_rate'] = transport_return_data['routePriceRate']
                fee['areaname'] = transport_return_data['areaname']
                fee['area_id'] = transport_return_data['area_id']
                fee['pending_reason'] = {fee['fee_type_name']: transport_return_data['reason']}
            elif is_store:
                fee['amount'] = student_store_mapping[current_student_id]['total_amount']
                fee['rate'] = fee['amount']
                new_updated_store_obj = {}
                for standard_mapping in fee['fee_standard_mapping_item_selling_price_fee_standard_mapping']:
                    if standard_mapping['id'] in student_store_mapping[current_standard_id]:
                        standard_mapping['issued_quantity'] = student_store_mapping[current_standard_id][standard_mapping['id']]['issued_quantity']
                        standard_mapping['assigned_quantity'] = student_store_mapping[current_standard_id][standard_mapping['id']]['quantity']
                        temp_price_for_ind = standard_mapping['selling_price'] / standard_mapping['quantity']
                        standard_mapping['assigned_quantity_total_price'] = temp_price_for_ind * standard_mapping['assigned_quantity']
                        standard_mapping['student_store_mapping_id'] = student_store_mapping[current_standard_id][standard_mapping['id']]['id']
                        new_updated_store_obj.append(standard_mapping)
                fee['fee_standard_mapping_item_selling_price_fee_standard_mapping'] = new_updated_store_obj
            elif is_custom:
                fee['amount'] = 0
                if current_student_id in student_custom_fee_mapping and fee['id'] in student_custom_fee_mapping[current_student_id]:
                    fee['amount'] = student_custom_fee_mapping[current_student_id][fee['id']]['total_amount']
            frac_total = 0
            max_count = len(fee['standard_fee'])
            for i, standard_fee in enumerate(fee['standard_fee'], start=1):
                fee_plan_ids.add(standard_fee['id'])
                if not fee['temp_sequence'] or ( not standard_fee['sequence'] is None and standard_fee['sequence'] < fee['temp_sequence']):
                    fee['temp_sequence'] = standard_fee['sequence'] if standard_fee['sequence'] else 0
                if fee['is_mandatory'] == '0' and (current_student_id not in student_custom_fee_mapping or  standard_fee['id'] not in student_custom_fee_mapping[current_student_id]['custom_fee_data']):
                    standard_fee['is_disabled'] = True
                else:
                    standard_fee['is_disabled'] = False
                if is_transport:
                    standard_fee['amount'] = fee['per_month_rate'] * standard_fee['rate']
                    standard_fee['rate_amount'] = standard_fee['amount']
                    standard_fee['areaname'] = fee['areaname']
                    standard_fee['area_id'] = fee['area_id']
                elif is_custom and standard_fee['id'] in custom_fee_data:
                    standard_fee['amount'] = custom_fee_data[standard_fee['id']]['amount']
                    standard_fee['rate'] = custom_fee_data[standard_fee['id']]['amount']
                elif is_store:
                    standard_fee['amount'] = fee['amount']
                elif standard_fee['is_amount']:
                    standard_fee['amount'] = standard_fee['rate']
                else:
                    amount = convert_percentage_to_amount(fee['amount'], standard_fee['rate'])
                    frac, whole = math.modf(amount)
                    if i == max_count:
                        standard_fee['rate_amount'] = standard_fee['amount'] = whole + frac_total + frac
                    else:
                        frac_total += frac
                        standard_fee['rate_amount'] = standard_fee['amount'] = whole
        if not hide_fee_term_sequence:
            temp_fee_data = sorted(temp_fee_data, key=lambda d: d['temp_sequence'])
        student_standard['fee_data'] = temp_fee_data

    fee_collection_ids = FeeCollection.objects.filter(
        is_active=True, student__in=student_ids
    ).values_list('id', flat=True)

    payment_detail_data = PaymentDetail.objects.filter(
        fee_collection__in=fee_collection_ids
    ).values(
        'fee_plan', 'id', 'amount_paid', 'fee_fine_amount', 'total_fine_days_paid',
        'fee_collection', 'fee_collection__receipt_num', 'created', 'fee_collection__user__staff__first_name',
        'fee_collection__user__staff__middle_name', 'fee_collection__user__staff__last_name', 'fee_collection__mode_of_payment',
        'fee_collection__student',
        transaction_date=F('fee_collection__transaction_date')
    )

    adjustment_data = AdjustmentFee.objects.filter(
        fee_plan__in=fee_plan_ids, student__in=student_ids,
        is_active=True
    )
    adjustment_approval_data = {}
    adjustment_parent_ids = []
    for adjustment_row_data in adjustment_data.values('adjustment_fee_parent_id'):
        if adjustment_row_data['adjustment_fee_parent_id']:
            adjustment_parent_ids.append(adjustment_row_data['adjustment_fee_parent_id'])
    if adjustment_parent_ids:
        approval_obj = Approval(self.request, 'AdjustmentFeeParent', adjustment_parent_ids)
        adjustment_approval_data = approval_obj.get_approval_status_with_permission() #optimize this function

    adjustment_student_amount_mapping = {}
    for adjustment_amount in adjustment_data.filter(concession=None).values(
        'fee_plan', 'amount','is_addition', 'reason_id', 'reason_id__name', 'concession', 'id',
        'adjustment_fee_parent_id', 'student'):
        if adjustment_amount['student'] not in adjustment_student_amount_mapping:
            adjustment_student_amount_mapping[adjustment_amount['student']] = {}
        if adjustment_amount['fee_plan'] not in adjustment_student_amount_mapping[adjustment_amount['student']]:
            adjustment_student_amount_mapping[adjustment_amount['student']][adjustment_amount['fee_plan']] = {
                'total_increment_adjustment_amount': 0, 'adjustment_list': [],
                'total_decrement_adjustment_amount': 0, 'is_adjustment_in_pending': False,
                'is_has_approval_permission_on_adj': False, 'adjustment_parent_ids': []
            }
        if adjustment_amount['is_addition']:
            adjustment_student_amount_mapping[adjustment_amount['student']][adjustment_amount['fee_plan']]['total_increment_adjustment_amount'] += adjustment_amount['amount']
        else:
            adjustment_student_amount_mapping[adjustment_amount['student']][adjustment_amount['fee_plan']]['total_decrement_adjustment_amount'] += adjustment_amount['amount']
        if adjustment_amount['adjustment_fee_parent_id'] in adjustment_approval_data:
            adjustment_amount['is_has_approval_permission_on_adj'] = adjustment_approval_data[adjustment_amount['adjustment_fee_parent_id']].is_has_approval_permission
            adjustment_student_amount_mapping[adjustment_amount['student']][adjustment_amount['fee_plan']]['adjustment_parent_ids'].append(adjustment_amount['adjustment_fee_parent_id'])
        if adjustment_amount['adjustment_fee_parent_id'] and adjustment_amount['adjustment_fee_parent_id'] in adjustment_approval_data \
            and not Approval.is_allowable_for_fee_collec_or_adj(
                adjustment_approval_data[adjustment_amount['adjustment_fee_parent_id']]
            ):
                adjustment_amount['is_adjustment_in_pending'] = True
                adjustment_in_pending_block_fee_collection = True
                adjustment_in_pending_block_fee_collection_error = 'Adjustment Pending For Approval'
        adjustment_student_amount_mapping[adjustment_amount['student']][adjustment_amount['fee_plan']]['adjustment_list'].append(adjustment_amount)
    concession_amount_datas = adjustment_data.exclude(concession=None).values(
        'fee_plan', 'amount','student_id'
    )
    concession_amount_data={}
    for concession in concession_amount_datas:
        if concession['student_id'] not in concession_amount_data:
            concession_amount_data[concession['student_id']] = {}
        if concession['fee_plan'] not in concession_amount_data[concession['student_id']]:
            concession_amount_data[concession['student_id']][concession['fee_plan']] = {'amount':concession['amount'],'student_id':concession['student_id'],'fee_plan':concession['fee_plan']}
    student_term_paid_amount = dict()
    paid_fee_payment_detail_ids = []
    paid_fee_plan_ids = []
    paid_fee_payment_detail_mapping = {}
    student_wise_payment_tracking = {}
    for p in payment_detail_data:
        paid_fee_payment_detail_ids.append(p['id'])
        paid_fee_plan_ids.append(p['fee_plan'])
        if p['fee_collection__student'] not in student_term_paid_amount:
            student_term_paid_amount[p['fee_collection__student']] = {}
        if p['fee_plan'] not in student_term_paid_amount[p['fee_collection__student']]:
            student_term_paid_amount[p['fee_collection__student']][p['fee_plan']] = []
        student_term_paid_amount[p['fee_collection__student']][p['fee_plan']].append(p)
        if p['fee_collection__student'] not in student_wise_payment_tracking:
            student_wise_payment_tracking[p['fee_collection__student']] = {'total_paid_amount': 0}
        student_wise_payment_tracking[p['fee_collection__student']]['total_paid_amount'] += p['amount_paid']
    addition_charge_query = FeeCollectionAdditionChargeMapping.objects.filter(payment_detail__in=paid_fee_payment_detail_ids) #optimize this
    additional_charge_col_data = []
    if addition_charge_query:
        addition_charge_ser = FeeCollectionAdditionChargeMappingReadSerilaizer(addition_charge_query, many=True)
        additional_charge_col_data = addition_charge_ser.data
    for addition_row in additional_charge_col_data:
        if addition_row['payment_detail'] not in paid_fee_payment_detail_mapping:
            paid_fee_payment_detail_mapping[addition_row['payment_detail']] = []
        paid_fee_payment_detail_mapping[addition_row['payment_detail']].append(addition_row)
    total_summary = {'fee_summary': {
        'total_amount': 0, 'total_payable_amount': 0, 'total_pending_amount': 0, 'total_paid_amount': 0, 'student_list': [],
        'total_concession_amount': 0
    }}
    return_student_standard_data = []
    for temp_student_standard in student_standard_data:
        student_standard = copy.deepcopy(temp_student_standard)
        student_id = student_standard['student_id']
        student_standard['fee_summary'] = {
            'total_payable_amount': 0,
            'total_pending_amount': 0,
            'total_paid_amount': 0,
            'concession_amount': 0,
            'total_amount': 0
        }
        for fee in student_standard['fee_data']:
            fee['allow_fee_collection'] = True
            fee_pending_amount = 0
            fee_concession_amount = 0
            fee['adjustment_amount'] = 0
            fee['total_amount'] = fee['amount']
            term_total_amount = 0
            if 'reason' in fee and fee['reason']:
                continue
            for terms in fee['standard_fee']:
                fine_paid_amount = 0
                total_fine_days_paid = 0
                temp_payment_detail = list()
                temp_term_paid_amount = 0
                terms['concession_amount'] = 0
                terms['fee_type_name'] = fee['fee_type_name']
                terms['fee_type'] = fee['fee_type']
                terms['allow_fee_collection'] = True
                terms['pending_amount'] = 0
                terms['paid_amount'] = 0
                terms['total_amount'] = 0
                terms['adjustment_amount'] = 0
                terms['adjustment_list'] = []
                if terms['is_disabled']:
                    continue #careful while defining variable below
                if student_id in student_term_paid_amount and terms['id'] in student_term_paid_amount[student_id]:
                    for paid in student_term_paid_amount[student_id][terms['id']]:
                        temp_term_paid_amount += paid['amount_paid']
                        fine_paid_amount += paid['fee_fine_amount']
                        total_fine_days_paid += paid['total_fine_days_paid']
                        temp_payment_detail.append(
                            {
                                'transaction_date': paid['transaction_date'], 'amount_paid': paid['amount_paid'],
                                'fee_collection__receipt_num': paid['fee_collection__receipt_num'],
                                'created':paid['created'],
                                'fee_fine_amount' : paid['fee_fine_amount'],
                                'total_fine_days_paid': paid['total_fine_days_paid'],
                                'fee_collection': paid['fee_collection'],
                                'paid_additional_charge_data': paid_fee_payment_detail_mapping[paid['id']] if paid['id'] in paid_fee_payment_detail_mapping else [],
                                'collected_user_full_name': get_full_name(
                                    paid['fee_collection__user__staff__first_name'],
                                    paid['fee_collection__user__staff__middle_name'],
                                    paid['fee_collection__user__staff__last_name']
                                ),
                                'mode_of_payment': paid['fee_collection__mode_of_payment']
                            }
                        )
                terms['amount'] = terms['amount'] if terms['amount'] else 0
                terms['pending_amount'] = terms['amount'] - temp_term_paid_amount
                terms['paid_amount'] = temp_term_paid_amount
                terms['total_amount'] = terms['amount']
                if student_id in adjustment_student_amount_mapping and terms['id'] in adjustment_student_amount_mapping[student_id]:
                    adjustment_amount = adjustment_student_amount_mapping[student_id][terms['id']]
                    terms['adjustment_list'] = adjustment_amount['adjustment_list']
                    total_incremented_adjustment = adjustment_amount['total_increment_adjustment_amount']
                    total_decremented_adjustment = adjustment_amount['total_decrement_adjustment_amount']
                    if adjustment_approval_enabled and adjustment_amount['is_adjustment_in_pending']:
                        fee['allow_fee_collection'] = False
                        fee['allow_fee_collection_error'] = 'Adjustment Is in Pending'
                        terms['allow_fee_collection'] = False
                        terms['allow_fee_collection_error'] = 'Adjustment Is in Pending'
                    if adjustment_approval_enabled and adjustment_amount['is_has_approval_permission_on_adj']:
                        fee['is_has_approval_permission_on_adj'] = True
                        terms['is_has_approval_permission_on_adj'] = True
                    terms['adjustment_amount'] = total_decremented_adjustment
                    terms['adjustment_amount_inc_min_dec'] =  total_incremented_adjustment - total_decremented_adjustment
                    if total_incremented_adjustment:
                        fee['total_amount'] += total_incremented_adjustment
                        terms['pending_amount'] += total_incremented_adjustment
                        terms['total_amount'] += total_incremented_adjustment
                        terms['amount'] += total_incremented_adjustment
                        fee['amount'] += total_incremented_adjustment
                    if total_decremented_adjustment:
                        terms['pending_amount'] -= total_decremented_adjustment
                        terms['amount'] -= total_decremented_adjustment
                        fee['amount'] -= total_decremented_adjustment
                        fee['adjustment_amount'] += total_decremented_adjustment
                if student_id in concession_amount_data and terms['id'] in concession_amount_data[student_id]:
                    terms['concession_amount'] = concession_amount_data[student_id][terms['id']]['amount']
                    terms['amount'] -= terms['concession_amount']
                    terms['pending_amount'] -= terms['concession_amount']
                    fee['amount'] -= terms['concession_amount']
                fee_concession_amount += terms['concession_amount']
                terms['payment_detail'] = temp_payment_detail
                terms['total_fine_paid_amount'] = fine_paid_amount
                terms['total_fine_days_paid'] = total_fine_days_paid
                terms['total_fine_amount'],terms['total_fine_no_of_days_late'] = calculate_fine_amount(terms)
                terms['amount'] += terms['total_fine_amount']
                fee['amount'] += terms['total_fine_amount']
                terms['pending_fine_amount'] = terms['total_fine_amount'] - fine_paid_amount
                terms['pending_amount'] += terms['total_fine_amount']
                fee_pending_amount += terms['pending_amount']
                if not terms['is_disabled']:
                    term_total_amount += terms['amount']
                student_standard['fee_summary']['total_paid_amount'] += terms['paid_amount']
            fee['concession_amount'] = fee_concession_amount
            fee['total_payable_amount'] = term_total_amount
            student_standard['fee_summary']['concession_amount'] += fee_concession_amount
            fee['pending_amount'] = fee_pending_amount
            student_standard['fee_summary']['total_payable_amount'] += fee['total_payable_amount']
            student_standard['fee_summary']['total_amount'] += fee['total_amount']
            student_standard['fee_summary']['total_pending_amount'] += fee_pending_amount
        return_student_standard_data.append(student_standard)
        total_summary['fee_summary']['total_amount'] += student_standard['fee_summary']['total_amount']
        total_summary['fee_summary']['total_payable_amount'] += student_standard['fee_summary']['total_payable_amount']
        total_summary['fee_summary']['total_pending_amount'] += student_standard['fee_summary']['total_pending_amount']
        total_summary['fee_summary']['total_paid_amount'] += student_standard['fee_summary']['total_paid_amount']
        total_summary['fee_summary']['total_concession_amount'] += student_standard['fee_summary']['concession_amount']
    if self.request.GET.get('long_running_process'):
        transaction_id = self.request.GET.get('transaction_id')
        store_long_running_process(self, transaction_id, total_summary)
    return return_student_standard_data

def get_fees(academicYear, standard_ids):
    queryset = FeeStandardMapping.objects.filter(academic_year=academicYear, standard__in=standard_ids, is_approved='1')
    return queryset


def paid_data_and_status(self, studentId, academicYear, standard, returnValue=True, termDivision=True, **kwargs):
    fee_data = fee_calculation(self, studentId, academicYear, standard, returnValue, termDivision)
    feature_is_zero = False
    for fee in fee_data['data']:
        if fee['codename'] == TRANSPORT_CODENAME:
            if fee['total_amount'] == 0:
                feature_is_zero = True
            break
    is_paid = True
    if feature_is_zero or fee_data['total_pending_amount'] > 0:
        is_paid = False
    return_data = {'is_paid': is_paid, 'paid_amount': fee_data['total_paid_amount'],
            'adjustment_parent_ids': fee_data['adjustment_parent_ids'], 
            'adjustment_unapproved_parent_ids': fee_data['adjustment_unapproved_parent_ids'],
            'adjustment_in_pending_block_fee_collection': fee_data['adjustment_in_pending_block_fee_collection'],
            'adjustment_in_pending_block_fee_collection_error': fee_data['adjustment_in_pending_block_fee_collection_error'],
            'paid_amount_excluding_concession_and_adjustment': fee_data['total_paid_amount'] - fee_data['concession_amount'] - fee_data['concession_amount'],
            'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
            'is_has_approval_permission_on_adj': fee_data['is_has_approval_permission_on_adj'],
            'concession_amount': fee_data['concession_amount'], 'data': fee_data['data'], 'reason': fee_data['reason'], 'total_payable': fee_data['total_payable'],
            'total_adjusted_amount': fee_data['total_adjusted_amount'],'total_adjusted_amount_at_fee_collection': fee_data['total_adjusted_amount_at_fee_collection'], 'amount': fee_data['amount'],
            'total_fine_amount': fee_data['total_fine_amount'],'adjustment_list':fee_data['adjustment_list']}
    if 'return_fee_data' in kwargs and kwargs['return_fee_data']:
        return_data['data'] = fee_data['data']
    return return_data

# built to check the fee status for the student if pending in any academic year
def get_student_all_standard_fee_data(self, student_id, raise_error_on_not_paid=False):
    student_standard_mapping_data = StudentStandardMapping.objects.filter(student=student_id).values(
        'academic_year__start_date', 'academic_year__end_date', 'academic_year', 'standard'
    ).order_by('academic_year__start_date')
    return_payment_data = []
    for standard_data in student_standard_mapping_data:
        paid_data = paid_data_and_status(self, student_id, standard_data['academic_year'], standard_data['standard'])
        paid_data['academic_year_start_date'] = standard_data['academic_year__start_date']
        paid_data['academic_year_end_date'] = standard_data['academic_year__end_date']
        paid_data['academic_year'] = standard_data['academic_year']
        return_payment_data.append(paid_data)
    if raise_error_on_not_paid:
        for payment_data in return_payment_data:
            if not payment_data['is_paid']:
                raise exceptions.ValidationError(
                    f'Fee payment not done for the academic year {payment_data["academic_year_start_date"]} - {payment_data["academic_year_end_date"]}'
                )
    return return_payment_data

def get_fees_for_student(academicYear, standard, student):
    queryset = FeeStandardMapping.objects.filter(academic_year=academicYear, standard=standard, is_approved='1')
    queryset = queryset.filter(Q(is_mandatory='1') | (Q(is_mandatory='0') & Q(standard_fee__fee_plan_student_feature_fee_plan__student=student)))
    return queryset

"""
    Mandaotry Fields
    pending_amount
    payment_end_date
    fee_fine_rate
    fee_fine_frequency_in_days
    max_fee_fine_rate
    total_fine_paid_amount
"""
def calculate_fine_amount(term_details):
    fine_amount = term_details['total_fine_paid_amount']
    days_between = 0
    if term_details['pending_amount'] >= 0:
        now = datetime.now().date().strftime('%Y-%m-%d')
        if term_details['payment_end_date'] < now and term_details['fee_fine_rate']:
            days_between = SharedService.days_between(term_details['payment_end_date'], now)
            if days_between >= term_details['fee_fine_frequency_in_days']:
                fine_amount = (term_details['fee_fine_rate'] * days_between) / term_details['fee_fine_frequency_in_days']
            if fine_amount > term_details['max_fee_fine_rate']:
                fine_amount = term_details['max_fee_fine_rate']
    return [fine_amount, days_between]


def get_fee_term_plan_for_student_and_standard_new(academic_year, standard_ids, student_ids):
    pending_reason = {}
    student_standard_mapping = {}
    standard_student_mapping = {}
    if standard_ids: #get students for the standards
        student_data = StudentStandardMapping.objects.filter(
            standard__in=standard_ids, academic_year=academic_year
        )
    elif student_ids: #get the standard for the students
        student_data = StudentStandardMapping.objects.filter(
            student__in=student_ids, academic_year=academic_year
        )
    elif academic_year: #fetch all the standard and students in the given academic year
        student_data = StudentStandardMapping.objects.filter(
            academic_year=academic_year
        )
    else:
        raise exceptions.ValidationError('Unhaled params')
    for student in student_data:
        student_standard_mapping[student.student_id] = student
        standard_student_mapping[student.standard_id] = student
    queryset = FeeStandardMapping.objects.filter(
        academic_year, standard__in=standard_student_mapping.keys(),
        is_approved='1'
    )
    pass #nikhil continue this

def fee_calculation_new(self, student_ids, academic_year, standard_ids):
    concession_amount = 0
    data, pending_reason = get_fee_term_plan_for_student_and_standard_new(
        academic_year, standard_ids, student_ids
    )