from apps.finance.services.fee_mismatch import create_fee_mismatch_reconciliation, preview_fee_mismatch_reconciliation
from apps.finance.models.recoverable_asset import (
    RecoverableAsset, RecoverableAssetTransaction, RecoverableAssetHistory
)
from apps.finance.services.fee_collection import update_fee_collection
from datetime import date, datetime

import copy
import logging

from rest_framework import viewsets, exceptions, permissions
from rest_framework.decorators import action
from rest_framework.views import Response
from django.db.models import Q
from django.contrib.contenttypes.models import ContentType

from apps.classes.models import Standard
from apps.classes.services.standard import get_standard_for_current_year,get_only_first_sem_standards
from apps.finance.models import (FeeType, FeeStandardMapping, FeeCollection, ConcessionType)
from apps.finance.models.additional_charge import AdditionalCharge, AdditionalChargeType, FeePlanAdditionalChargeMapping
from apps.finance.models.bankTransaction import BankDetail, BankFeeTypeMapping, BankTransaction
from apps.finance.models.concession import (AdjustmentFeeParent, Concession, AdjustmentFee, FeePlanConcessionMapping, FeePlanConcessionMappingMaster)
from apps.finance.models.fee import FeeGroup
from apps.finance.models.feeCollection import ApplicationPaymentDetail, ApplicationPlan, AdmissionForm, PaymentDetail
from apps.finance.models.fee_category import FeeCategory, FeeCategoryFeeStandardSectionMapping
from apps.finance.models.miscellaneous import MiscellaneousType, MiscellaneousMapping, Miscellaneous
from apps.finance.models.denomination import Denomination
from apps.finance.serializers import (
                                      AdditionalChargeReadSerializer, AdditionalChargeSerializer, AdditionalChargeTypeSerializer,AdjustmentFeeParentReadSerializer, FeeCategoryFeeStandardSectionMappingSerializer, FeeCategorySerializer, 
                                      FeeGroupSerializer, FeePlanAdditionalChargeMappingReadSerializer, FeePlanAdditionalChargeMappingSerializer, FeePlanConcessionMappingMasterSerializer, FeePlanConcessionMappingSerializer, 
                                      FeeTypeSerializer, FeeStandardMappingSerializer, StandardFeeMappingSerializer,
                                      FeeCollectionSerializer, FeeTermsSerializer, StandardFeeTermSerializer,
                                      ApplicationPaymentDetailSerializer, ApplicationPlanSerializer,
                                      AdmissionFormSerializer, StudentFeatureSerializer, StudentFinanceSerializer,
                                      GetStudentFeatureSerializer, ConcessionTypeSerializer, ConcessionSerializer,
                                      PaymentDetailSerializer, GetFeeCollectionSerializer, AdjustmentFeeSerializer,
                                      BankDetailSerializer, BankFeeTypeMappingSerializer, BankTransactionSerializer,
                                      MiscellaneousTypeSerializer, MiscellaneousMappingSerializer,
                                      MiscellaneousSerializer, DepositWithdrawRecordSerializer, FeeMismatchReconciliationLogSerializer,
                                      FeeMismatchReconciliationLogReadSerializer,
                                      RecoverableAssetSerializer, RecoverableAssetReadSerializer,
                                      SalaryAdvanceSerializer, SalaryAdvanceReadSerializer,
                                      SalaryAdvanceTransactionSerializer, SalaryAdvanceTransactionReadSerializer,
                                      RecoverableAssetHistoryReadSerializer, RecoverableAssetTransactionSerializer,
                                      RecoverableAssetTransactionReadSerializer, RecoverableAssetCategorySerializer, RecoverableAssetCategoryReadSerializer, BankTransactionDenominationSerializer, DenominationSerializer,
                                      FeeAdvanceTypeSerializer,
                                      FeeAdvanceCollectionSerializer,
                                      FeeAdvanceCollectionReadSerializer)
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.finance.services import recoverable_asset_reports
from apps.finance.services.additional_charge import add_additional_charge_mapping, add_or_update_additional_charge, additional_charge_type, delete_additional_charge
from apps.finance.services.adjustment import add_fee_plan_adjustment, approve_or_reject_adjustment, get_adjustment_parent_data, get_my_adjustments_list
from apps.finance.services.bank_transaction import (add_bank_details, update_bank_details, delete_bank_details,
                                                    add_bank_fee_type, update_bank_fee_type, delete_bank_fee_type,
                                                    add_bank_transaction, get_bank_transaction,
                                                    get_bank_transaction_detail, get_bank_fee_type)
from apps.finance.services.calculations import fee_calculation_bulk_students
from apps.finance.services.concession import (add_concession_types, add_fee_plan_concession, update_concession_types, delete_concession_types)
from apps.finance.services.concession_fee import (add_concession_fee, get_fee_plan_concession_list)
from apps.finance.services.concession_student import (get_concession_students_list)
from apps.finance.services.feature import add_bulk_feature, get_feature
from apps.finance.services.fee_collection import (add_fee_collection, delete_fee_collection, get_fee_collection_fee_type_wise_report, get_fee_list_for_student, get_fee_receipt, get_fee_collection,
                                                  get_fee_approved_status_students_list_data, get_fee_collection_report,
                                                  get_cashbook_report, get_cashbook_report_fy_wise, get_student_fee_report, get_balance_report,dashboard_pending_amount,create_deposit_amount,
                                                  get_payments, get_payment_detail, get_cashbook_fee_type, print_dummy_receipt,get_fee_deposit_data, get_deposit_amount_summary)
from apps.finance.services.area_wise_pending_report import get_area_wise_pending_report
from apps.finance.services.fee_plan import (add_fee_group_type, add_types, apply_automatic_concession_to_fee_plan, arrange_fee_plan_group_wise, delete_fee_group_type, delete_feetype_category, fee_category_fee_standard_section_add_data, get_fee_category_fee_standard_section_data, update_fee_group_type, update_fee_type_category, update_fee_types, delete_fee_types, add_fee_class_mapping, edit_fee_class_mapping,
                                            update_fee_types_fee_plan, delete_fee_types_fee_plan, delete_all_fee_plan,
                                            fee_approve, add_update_fee_plan, get_student_fee_data,
                                            get_fee_plan, get_fee_types, APPLICATION_CODENAME,
                                            copy_all_fee_plan)
from apps.finance.services.forms import (add_application_fee_plan, update_application_fee_plan,
                                         get_application_fee_plan, add_application_fee, get_application_fee_receipt,get_application_transaction,
                                         update_transaction_date)
from apps.finance.services.miscellaneous import get_misc_fee_receipt, update_misc_types, delete_misc_types, add_misc_plan, update_misc_plan, \
    delete_misc_plan, add_misc, get_misc
from apps.finance.variables.default_variables import bank_list_data
from apps.shared.variables.default_variables import feecollection_report_filterdata
from apps.institutes.models import Institute
from apps.institutes.models.academicYear import AcademicYear
from apps.institutes.models.financialyear import FinancialYear
from apps.institutes.serializers import InstituteSerializer
from apps.payments.constants import PENDING_PAYMENT_STATUSES
from apps.payments.models.online_payments import OnlinePayment
from apps.payments.services.order_payments import update_payment_status
from apps.shared.models.custom import FormDefinition
from apps.shared.services import FormdefinitionService, SharedService, UploadTypeService
from apps.shared.services_shared.common import get_full_name
from apps.shared.services_shared.store_api_result import start_long_running_process, store_long_running_process
from apps.students.models import Student
from apps.students.models.student import StudentSiblingMapping
from apps.students.serializers import StudentListSerializer
from apps.students.services.student import get_student_sibling_data, get_students_standards_list
from apps.users.services.permissions import OnlyListAccess
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.finance.models.fee_mismatch import FeeMismatchReconciliationLog
from apps.finance.services.fee_mismatch import get_fee_mismatch_students
from apps.finance.services.fee_plan import download_fee_plan_pdf
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
from apps.finance.serializers import StaffWalletSerializer, StaffWalletReadSerializer
from apps.finance.services.recoverable_asset_service import (
    resolve_category_for_create, check_asset_bs_locked, auto_recalculate_pending_fees,
    soft_delete_asset_cascade, check_fy_locked_for_date, log_transaction_delete,
    recalculate_after_transaction_change,
    validate_category_create, validate_category_update, cascade_delete_category,
    build_recoverable_dashboard, recoverable_dashboard_lrp
)
from apps.finance.services.salary_advance_view_service import (
    get_statement as sa_get_statement, get_amortization_schedule as sa_get_amortization,
    apply_interest as sa_apply_interest, apply_penalty as sa_apply_penalty,
    get_dashboard as sa_get_dashboard, get_aging as sa_get_aging,
    get_payroll_recovery_details as sa_get_payroll_details,
    handle_payroll_recovery as sa_handle_recovery, handle_payroll_reversal as sa_handle_reversal,
    apply_bulk_charges as sa_apply_bulk_charges
)
from apps.finance.services.bank_detail_service import (
    resolve_financial_year, enrich_bank_list_with_balances,
    enrich_carry_forward_list, process_carry_forward, resolve_deposit_record
)
from apps.finance.services.balance_sheet_view_service import (
    lock_balance_sheet, unlock_balance_sheet, get_lock_status,
    enrich_balance_sheet_response, check_bs_entry_fy_locked
)
from apps.finance.services.balance_sheet_builder import (
    get_balance_sheet, download_balance_sheet_excel, download_balance_sheet_pdf,
    download_balance_sheet_excel_lrp, download_balance_sheet_pdf_lrp
)
from apps.finance.models.fee_advance import FeeAdvanceType, FeeAdvanceCollection
from apps.finance.services.fee_advance import (
    create_fee_advance_collection,
    get_fee_advance_receipt,
    update_fee_advance_collection,
)

from apps.finance.models.balance_sheet_lock_history import BalanceSheetLockHistory
from apps.finance.serializers import BalanceSheetLockHistorySerializer
from apps.finance.services.fy_carry_forward import (
    preview_carry_forward, execute_carry_forward
)
from apps.finance.services.pending_fees_calculator import (
    preview_pending_fees, execute_pending_fees_calculation,
    sync_all_pending_fees_for_fy
)

from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction
from apps.finance.services.salary_advance_crud_service import (
    create_recoverable_asset_for_salary_advance,
    sync_salary_advance_to_recoverable_asset,
    soft_delete_salary_advance_cascade,
)


class FeeTypeViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['codename']

    def get_queryset(self):
        self.queryset = FeeType.objects.all()
        if self.request.GET.get('available_for_bank'):
            self.queryset = self.queryset.exclude(bank_fee_type__to_date__gte=date.today())
            return self.queryset
        if self.request.GET.get('assigned_for_bank'):
            self.queryset = self.queryset.filter(bank_fee_type__to_date__gte=date.today())
            return self.queryset
        if self.request.GET.get('academic_year') and self.request.GET.get('standard'):
            standard_ids = self.request.GET.get('standard').split(',')
            fee_type_ids = FeeStandardMapping.objects.filter(
                standard__in=standard_ids,
                academic_year=self.request.GET.get('academic_year')
            ).values_list('fee_type', flat=True)
            self.queryset = self.queryset.filter(id__in=fee_type_ids)
        self.queryset = self.queryset.exclude(codename=APPLICATION_CODENAME)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_types(self, request.data['feetypes'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_fee_types(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_fee_types(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if self.request.GET.get('for_cashbook'):
            misc_data = MiscellaneousType.objects.filter(is_active=True).values()
            for misc in misc_data:
                response['data'].insert(0, {
                    'id': misc['id'],
                    'name': misc['name'],
                    'type': 'misc'
                })
            response['data'].insert(0,{
                'id': 'application',
                'name': 'Application Fee',
                'type': 'application'
            })
        return Response(response)


class StandardFeeViewSet(viewsets.ModelViewSet):
    serializer_class = StandardFeeMappingSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        filter_query = {
            'present_standard__academic_year': self.request.GET.get('academic_year'),
            'is_active': True,
        }
        if self.request.GET.get('branch'):
            filter_query['branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['board'] = self.request.GET.get('board')
        if self.request.GET.get('standard_id'):
            ids = self.request.GET.get('standard_id').split(',')
            filter_query['id__in'] = ids
        self.queryset = Standard.objects.filter(**filter_query).order_by('sequence').distinct()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):

        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):

        response = get_fee_types(self)
        return Response(response)


class FeeStandardMappingViewSet(viewsets.ModelViewSet):
    serializer_class = FeeStandardMappingSerializer
    http_method_names = ['post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        if request.data.get('is_edit'):
            response = edit_fee_class_mapping(self, request.data)
        else:
            response = add_fee_class_mapping(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_fee_types_fee_plan(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_fee_types_fee_plan(self)
        return Response(response)


class FeeStandardMappingDeleteAllViewSet(viewsets.ModelViewSet):
    serializer_class = FeeStandardMappingSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = delete_all_fee_plan(self, request.data)
        return Response(response)


class ApproveViewSet(viewsets.ModelViewSet):
    serializer_class = FeeStandardMappingSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = fee_approve(self, request.data)
        return Response(response)

class CopyAllFeePlanViewSet(viewsets.ModelViewSet):
    serializer_class = FeeStandardMappingSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        if not request.user.is_superuser:
            raise exceptions.PermissionDenied('Only superusers can copy all fee plans')
        response = copy_all_fee_plan(self, request.data)
        return Response(response)


class StandardFeeTermViewSet(viewsets.ModelViewSet):
    serializer_class = StandardFeeTermSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        filter_query = {
            'is_active':True,
            'present_standard__academic_year': self.request.GET.get(
            'academic_year')
        }
        self.queryset = get_standard_for_current_year(self, {'filter_query': filter_query}, True,)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if request.GET.get('download_pdf'):
            return download_fee_plan_pdf(self, request.GET.get('academic_year'), request.GET.get('standard'))
        response = SharedService.read_data(self, True)
        if self.queryset.filter(standardyearname__isnull=False).exists():
            response['data'] = get_only_first_sem_standards(self,response['data'])
        return Response(response)


class FeePlanViewSet(viewsets.ModelViewSet):  # add update read fee plan

    serializer_class = FeeTermsSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['academic_year', 'standard', 'fee_type']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_update_fee_plan(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        temp_student_id = self.request.GET.get('student')
        temp_standard_id = self.request.GET.get('standard')
        temp_academic_year = self.request.GET.get('academic_year')
        if temp_student_id:
            logged_in_student_id = self.request.user.student.id if self.request.user.student else None
            if logged_in_student_id and str(temp_student_id) != str(logged_in_student_id):
                raise exceptions.ValidationError('Only your fees can be visible')
            response = get_student_fee_data(
                self,
                temp_student_id,
                temp_academic_year,
                temp_standard_id
            )
            if self.request.GET.get('update_payment_status'):
                pending_order_data = OnlinePayment.objects.filter(
                    user__student=temp_student_id, payment_status__in=PENDING_PAYMENT_STATUSES,
                ).values('order_id')
                for pending in pending_order_data:
                    update_payment_status(self, {'orderId': pending['order_id']})
                for plan in response['data']['plans']:
                    for standard_fee in plan['standard_fee']:
                        if 'fee_standard_mapping_item_selling_price_fee_standard_mapping' in plan:
                            standard_fee['fee_standard_mapping_item_selling_price_fee_standard_mapping'] = plan['fee_standard_mapping_item_selling_price_fee_standard_mapping']
                            del plan['fee_standard_mapping_item_selling_price_fee_standard_mapping']
                        if 'codename' in plan:
                            standard_fee['codename']=plan['codename']
                            # del plan['codename']
            if self.request.GET.get('range_wise'):
                response['range_wise'] = []
                today = datetime.today().strftime('%Y-%m-%d')
                if 'data' in response and 'plans' in response['data']:
                    currentList = {}
                    upcomingList = {}
                    expiredList = {}
                    for plan in response['data']['plans']:
                        for standardFee in plan['standard_fee']:
                            if standardFee['payment_start_date'] <= today <= standardFee['payment_end_date']:
                                if plan['id'] not in currentList:
                                    currentList[plan['id']] = copy.deepcopy(plan)
                                    currentList[plan['id']]['standard_fee'] = []
                                currentList[plan['id']]['standard_fee'].append(standardFee)
                            elif standardFee['payment_start_date'] >= today:
                                if plan['id'] not in upcomingList:
                                    upcomingList[plan['id']] = copy.deepcopy(plan)
                                    upcomingList[plan['id']]['standard_fee'] = []
                                upcomingList[plan['id']]['standard_fee'].append(standardFee)
                            else:
                                if plan['id'] not in expiredList:
                                    expiredList[plan['id']] = copy.deepcopy(plan)
                                    expiredList[plan['id']]['standard_fee'] = []
                                expiredList[plan['id']]['standard_fee'].append(standardFee)
                del response['data']['plans']
                response['data']['range_wise_plan'] = {
                    'current': currentList.values(),
                    'upcoming': upcomingList.values(),
                    'expired': expiredList.values()
                }
            response['data']['plans'], automatic_concession_details = apply_automatic_concession_to_fee_plan(response['data']['plans'])
            if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
                response['data']['fee_group_plan'], response['data']['fee_group_list'] = arrange_fee_plan_group_wise(self, response['data']['plans'])
        else:
            response = get_fee_plan(self)
            response['data']['plan'], automatic_concession_details = apply_automatic_concession_to_fee_plan(response['data']['plan'])
            if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
                response['data']['fee_group_plan'], response['data']['fee_group_list'] = arrange_fee_plan_group_wise(self, response['data']['plan'])
        formdefintion_data = FormDefinition.objects.filter(form_name='fee_configurations').values('default_value', 'column_name')
        response['data']['fee_configurations'] = {f['column_name']:f['default_value'] for f in formdefintion_data}
        response['data']['automatic_concession_details'] = automatic_concession_details
        response['data']['academic_year_data'] = {}
        if temp_academic_year:
            academic_obj = AcademicYear.objects.get(id=temp_academic_year)
            response['data']['academic_year_data'] = {
                'start_date': academic_obj.start_date, 'end_date': academic_obj.end_date,
                'name': academic_obj.start_date.strftime('%Y') + '-' + academic_obj.end_date.strftime('%Y')
            }
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class AdjustmentFeePlanViewSet(viewsets.ModelViewSet):
    serializer_class = AdjustmentFeeSerializer
    http_method_names = ['post']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = AdjustmentFee.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_plan_adjustment(self, request.data)
        return Response(response)

class AdjustmentApprovalRequestViewSet(viewsets.ModelViewSet):
    serializer_class = AdjustmentFeeParentReadSerializer
    http_method_names = ['post', 'put', 'get']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = AdjustmentFeeParent.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_plan_adjustment(self, request.data, is_request_for_approval=True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = approve_or_reject_adjustment(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_adjustment_parent_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_adjustment_parent_data(self, False)
        return Response(response)


class MyAdjustmentsListViewSet(viewsets.ModelViewSet):
    serializer_class = AdjustmentFeeParentReadSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = AdjustmentFeeParent.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_my_adjustments_list(self)
        return Response(response)


class SingleFeePlanViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTermsSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard', 'fee_type']
    lookup_field = 'fee_type'

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        if not (self.request.GET.get('academic_year') and self.request.GET.get('standard')):
            raise exceptions.NotAcceptable('Could not satisfy the request Accept header.')
        queryset = self.filter_queryset(self.get_queryset()).filter(is_approved='1')
        return Response({'data': {'is_approved': queryset.exists()}})

    def list(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class FeeCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCollectionSerializer
    http_method_names = ['post', 'get', 'delete', 'put']
    filterset_fields = ['receipt_num', 'transaction_date', 'student', 'mode_of_payment']
    search_fields = ['student__first_name', 'student__middle_name', 'student__last_name', 'receipt_num',
                     'transaction_date']
    ordering_fields = ['student__first_name', 'receipt_num', 'transaction_date', ('name', 'student__first_name')]

    def get_queryset(self):
        self.queryset = FeeCollection.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_collection(self, request.data)
        SharedService.add_to_log(self, request, response)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_fee_receipt(self)
        return response

    def list(self, request, *args, **kwargs):
        response = get_fee_collection(self)
        return Response(response)

    # def update(self, request, *args, **kwargs):
        #only allowing to edit the date
        # transaction_date = request.data['data']['transaction_date']
        # if transaction_date > datetime.today().strftime('%Y-%m-%d'):
        #     raise exceptions.ValidationError('Date should be less than todays date')
        # collection_obj = FeeCollection.objects.get(
        #     id=self.kwargs['pk']
        # )
        # collection_obj.transaction_date = transaction_date
        # collection_obj.save()
        # return Response({'Reason': 'Data Updated Successfully'})
    def update(self, request, *args, **kwargs):
        # if request.user.is
        response = update_fee_collection(
            self,
            request.data,
            self.kwargs["pk"]
        )
        # SharedService.add_to_log(self, request, response)
        return Response(response)



    def destroy(self, request, *args, **kwargs):
        response = delete_fee_collection(self)
        return Response(response)


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = GetFeeCollectionSerializer
    http_method_names = ['get']
    filterset_fields = ['receipt_num', 'transaction_date', 'student']

    def get_queryset(self):
        self.queryset = FeeCollection.objects.filter(is_active=True)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_payment_detail(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_payments(self)
        return Response(response)

class FinanceDashboardViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']

    def get_queryset(self):
        from apps.students.models.student import Student
        self.queryset = Student.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        from apps.finance.services.finance_dashboard_view import get_finance_dashboard
        response = get_finance_dashboard(self)
        return Response(response)


class TallyViewSet(viewsets.ModelViewSet):
    """
    Tally-like Accounting View
    Provides ledger, day book, trial balance, and account list
    """
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        # Not used, but required by ModelViewSet
        return []

    def list(self, request, *args, **kwargs):
        from apps.finance.services.tally import (
            get_ledger_view, get_day_book, get_trial_balance, get_account_list,
            download_tally_ledger_report, download_tally_daybook_report, download_tally_trial_balance_report
        )
        from apps.shared.services_shared.store_api_result import start_long_running_process
        from apps.shared.services import SharedService
        
        view_type = request.GET.get('view_type', 'ledger')  # ledger, daybook, trial_balance, accounts
        download_excel = request.GET.get('download_excel')
        is_long_running_process = request.GET.get('long_running_process')
        
        # Handle Excel download
        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                if view_type == 'ledger':
                    SharedService.custom_thread(download_tally_ledger_report, self)
                elif view_type == 'daybook':
                    SharedService.custom_thread(download_tally_daybook_report, self)
                elif view_type == 'trial_balance':
                    SharedService.custom_thread(download_tally_trial_balance_report, self)
                else:
                    return Response({'error': 'Excel download not supported for accounts view'})
                return Response({'Result': True})
            else:
                if view_type == 'ledger':
                    return download_tally_ledger_report(self)
                elif view_type == 'daybook':
                    return download_tally_daybook_report(self)
                elif view_type == 'trial_balance':
                    return download_tally_trial_balance_report(self)
                else:
                    return Response({'error': 'Excel download not supported for accounts view'})
        
        # Regular data retrieval
        if view_type == 'ledger':
            response = get_ledger_view(self)
        elif view_type == 'daybook':
            response = get_day_book(self)
        elif view_type == 'trial_balance':
            response = get_trial_balance(self)
        elif view_type == 'accounts':
            response = get_account_list(self)
        else:
            response = {'error': 'Invalid view_type. Use: ledger, daybook, trial_balance, or accounts'}
        
        return Response(response)


class AccountingViewSet(viewsets.ModelViewSet):
    """
    Accounting Module - Tally-like Reports
    Provides comprehensive accounting reports: Day Book, Ledger, Trial Balance, Cash/Bank Book, Profit & Loss
    """
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        # Not used, but required by ModelViewSet
        return []

    def list(self, request, *args, **kwargs):
        from apps.finance.services.accounting import (
            get_day_book, get_ledger_view, get_trial_balance,
            get_cash_bank_book, get_profit_loss, get_account_list,
            get_cash_in_hand_summary, get_fixed_assets_summary,
            get_bank_accounts_summary, get_sundry_debtors_summary,
            get_loans_advances_summary, get_staff_advances_summary,
            get_enhanced_cash_tracking
        )
        from apps.shared.services_shared.store_api_result import start_long_running_process
        from apps.shared.services import SharedService
        
        report_type = request.GET.get('report_type', 'day_book')  # day_book, ledger, trial_balance, cash_bank_book, profit_loss, cash_in_hand, fixed_assets, bank_accounts, sundry_debtors, loans_advances, staff_advances, cash_tracking, accounts
        download_excel = request.GET.get('download_excel')
        is_long_running_process = request.GET.get('long_running_process')
        
        # Handle Excel download
        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                from apps.finance.services.accounting import (
                    download_accounting_day_book, download_accounting_ledger,
                    download_accounting_trial_balance, download_accounting_cash_bank_book,
                    download_accounting_profit_loss, download_accounting_cash_in_hand,
                    download_accounting_fixed_assets, download_accounting_bank_accounts,
                    download_accounting_sundry_debtors, download_accounting_loans_advances,
                    download_accounting_staff_advances, download_accounting_cash_tracking
                )
                if report_type == 'day_book':
                    SharedService.custom_thread(download_accounting_day_book, self)
                elif report_type == 'ledger':
                    SharedService.custom_thread(download_accounting_ledger, self)
                elif report_type == 'trial_balance':
                    SharedService.custom_thread(download_accounting_trial_balance, self)
                elif report_type == 'cash_bank_book':
                    SharedService.custom_thread(download_accounting_cash_bank_book, self)
                elif report_type == 'profit_loss':
                    SharedService.custom_thread(download_accounting_profit_loss, self)
                elif report_type == 'cash_in_hand':
                    SharedService.custom_thread(download_accounting_cash_in_hand, self)
                elif report_type == 'fixed_assets':
                    SharedService.custom_thread(download_accounting_fixed_assets, self)
                elif report_type == 'bank_accounts':
                    SharedService.custom_thread(download_accounting_bank_accounts, self)
                elif report_type == 'sundry_debtors':
                    SharedService.custom_thread(download_accounting_sundry_debtors, self)
                elif report_type == 'loans_advances':
                    SharedService.custom_thread(download_accounting_loans_advances, self)
                elif report_type == 'staff_advances':
                    SharedService.custom_thread(download_accounting_staff_advances, self)
                elif report_type == 'cash_tracking':
                    SharedService.custom_thread(download_accounting_cash_tracking, self)
                else:
                    return Response({'error': 'Excel download not supported for accounts view'})
                return Response({'Result': True})
            else:
                from apps.finance.services.accounting import (
                    download_accounting_day_book, download_accounting_ledger,
                    download_accounting_trial_balance, download_accounting_cash_bank_book,
                    download_accounting_profit_loss, download_accounting_cash_in_hand,
                    download_accounting_fixed_assets, download_accounting_bank_accounts,
                    download_accounting_sundry_debtors, download_accounting_loans_advances,
                    download_accounting_staff_advances, download_accounting_cash_tracking
                )
                if report_type == 'day_book':
                    return download_accounting_day_book(self)
                elif report_type == 'ledger':
                    return download_accounting_ledger(self)
                elif report_type == 'trial_balance':
                    return download_accounting_trial_balance(self)
                elif report_type == 'cash_bank_book':
                    return download_accounting_cash_bank_book(self)
                elif report_type == 'profit_loss':
                    return download_accounting_profit_loss(self)
                elif report_type == 'cash_in_hand':
                    return download_accounting_cash_in_hand(self)
                elif report_type == 'fixed_assets':
                    return download_accounting_fixed_assets(self)
                elif report_type == 'bank_accounts':
                    return download_accounting_bank_accounts(self)
                elif report_type == 'sundry_debtors':
                    return download_accounting_sundry_debtors(self)
                elif report_type == 'loans_advances':
                    return download_accounting_loans_advances(self)
                elif report_type == 'staff_advances':
                    return download_accounting_staff_advances(self)
                elif report_type == 'cash_tracking':
                    return download_accounting_cash_tracking(self)
                else:
                    return Response({'error': 'Excel download not supported for accounts view'})
        
        # Regular data retrieval
        if report_type == 'day_book':
            response = get_day_book(self)
        elif report_type == 'ledger':
            response = get_ledger_view(self)
        elif report_type == 'trial_balance':
            response = get_trial_balance(self)
        elif report_type == 'cash_bank_book':
            response = get_cash_bank_book(self)
        elif report_type == 'profit_loss':
            response = get_profit_loss(self)
        elif report_type == 'cash_in_hand':
            response = get_cash_in_hand_summary(self)
        elif report_type == 'fixed_assets':
            response = get_fixed_assets_summary(self)
        elif report_type == 'bank_accounts':
            response = get_bank_accounts_summary(self)
        elif report_type == 'sundry_debtors':
            response = get_sundry_debtors_summary(self)
        elif report_type == 'loans_advances':
            response = get_loans_advances_summary(self)
        elif report_type == 'staff_advances':
            response = get_staff_advances_summary(self)
        elif report_type == 'cash_tracking':
            response = get_enhanced_cash_tracking(self)
        elif report_type == 'accounts':
            response = get_account_list(self)
        else:
            response = {'error': 'Invalid report_type. Use: day_book, ledger, trial_balance, cash_bank_book, profit_loss, cash_in_hand, fixed_assets, bank_accounts, sundry_debtors, loans_advances, staff_advances, cash_tracking, or accounts'}
        
        return Response(response)


class FeeCollectionReportFilterDatasViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        return Response({'data': feecollection_report_filterdata})

class FeeCollectionReportViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_student_fee_report(self)
        return response

    def list(self, request, *args, **kwargs):
        is_long_running_process = self.request.GET.get('long_running_process')
        if is_long_running_process and self.request.GET.get('dashboard'):
            start_long_running_process(self)
            SharedService.custom_thread(dashboard_pending_amount, self)
            return Response({'Result': True})
        elif is_long_running_process:
            start_long_running_process(self)
            SharedService.custom_thread(get_fee_collection_report,self)
            return Response({'Result': True})
        else:
            response = get_fee_collection_report(self)
            download_excel = self.request.GET.get('download_excel')
            if not download_excel:
                return Response(response)
            else:
                return response


class CashbookViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentDetailSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = PaymentDetail.objects.filter()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        if self.request.GET.get('download_all') and self.request.GET.get('financial_year'):
            response = get_cashbook_report_fy_wise(self)
            return response
        if self.request.GET.get('download_excel') or self.request.GET.get('download_pdf'):
            response = get_cashbook_report(self, True)
            return response
        response = get_cashbook_report(self, True)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_all') and self.request.GET.get('financial_year'):
            response = get_cashbook_report_fy_wise(self)
            return response
        if self.request.GET.get('download_excel') or self.request.GET.get('download_pdf'):
            response = get_cashbook_report(self, False)
            return response
        response = get_cashbook_report(self)
        return Response(response)


class CashbookFeeTypeViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTypeSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = FeeType.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_cashbook_fee_type(self)
        return Response(response)


class BalanceViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentDetailSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = PaymentDetail.objects.filter(fee_collection__is_active=True)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = get_balance_report(self)
        return Response(response)


class FeePlanStatusStudentListViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num']
    filterset_fields = ['gender']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = get_fee_approved_status_students_list_data(self)
        if self.request.GET.get('download_excel'):
            return response
        return Response(response)


class ApplicationPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationPlanSerializer
    http_method_names = ['get', 'post', 'put']
    filterset_fields = ['is_active', 'academic_year', 'standard']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        filter_query = {}
        if self.request.GET.get('branch'):
            filter_query['standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard__board'] = self.request.GET.get('board')
        self.queryset = ApplicationPlan.objects.filter(**filter_query)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_application_fee_plan(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_application_fee_plan(self, request.data, **kwargs)
        return Response(response)

    #
    # def destroy(self, request, *args, **kwargs):
    #     self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    #     response = SharedService.soft_delete_data(self)
    #     return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_application_fee_plan(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_application_fee_plan(self, True)
        return Response(response)


class ApplicationPaymentDetailViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationPaymentDetailSerializer
    http_method_names = ['post', 'get']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = ApplicationPaymentDetail.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_application_fee(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        data={
            "application_payment_detail_id":kwargs['pk']
        }
        response = get_application_fee_receipt(self,data)
        return response

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
class ApplicationFeesTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationPaymentDetailSerializer
    http_method_names = ['get','put']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = ApplicationPaymentDetail.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        standard_id = self.request.GET.get('standard_id', None)
        response = get_application_transaction(self, standard_id)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        transaction_id = self.kwargs['pk']
        transaction_date = request.data.get('transaction_date')
        response = update_transaction_date(self,transaction_id, transaction_date)
        return Response(response)


class AdmissionFormViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionFormSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['academic_year', 'student']

    def get_queryset(self):
        self.queryset = AdmissionForm.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data, False)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class FeatureStudentViewSet(viewsets.ModelViewSet):
    serializer_class = GetStudentFeatureSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_mandatory', 'academic_year', 'standard', 'fee_type']

    def get_queryset(self):
        self.queryset = FeeStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        self.serializer_class = StudentFeatureSerializer
        response = add_bulk_feature(self, request.data, *args, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_feature(self)
        return Response(response)


class StudentFeatureViewSet(viewsets.ModelViewSet):
    serializer_class = StudentFinanceSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active', 'current_standard', 'current_reg_num']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class ConcessionTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ConcessionTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        if self.request.GET.get('automatic_concession_only'):
            self.queryset = ConcessionType.objects.filter(code__isnull=False)
        else:
            self.queryset = ConcessionType.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_concession_types(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_concession_types(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_concession_types(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class ConcessionViewSet(viewsets.ModelViewSet):
    serializer_class = ConcessionSerializer
    http_method_names = ['post']
    filterset_fields = ['is_active', 'concession_type', 'academic_year']
    search_fields = ['concession_type__name', 'standard__name', 'concession__standard_fee__fee_type__name']

    # ordering_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'enquiry_date', 'enquiry_num', 'id',
    #                    ('concession_type', 'concession_type__name')]

    def get_queryset(self):
        self.queryset = Concession.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_concession_fee(self, request.data)
        return Response(response)


class ConcessionStudentListViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num', 'mobile_num', 'email']
    filterset_fields = ['student_group']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = get_concession_students_list(self)
        return Response(response)


class BankDetailViewSet(viewsets.ModelViewSet):
    serializer_class = BankDetailSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'financial_year']

    def get_queryset(self):
        self.queryset = BankDetail.objects.all()
        if self.request.GET.get('available_bank'):
            self.queryset = self.queryset.filter(bank_fee_type_mapping_bank__isnull=True)
        financial_year_id = self.request.GET.get('financial_year_id')
        if financial_year_id:
            self.queryset = self.queryset.filter(financial_year_id=financial_year_id)
        else:
            current_fy = FinancialYear.get_financial_year_for_date(self, datetime.today())
            if current_fy:
                self.queryset = self.queryset.filter(financial_year_id=current_fy['id'])
        return self.queryset.order_by('-id')

    def create(self, request, *args, **kwargs):
        response = add_bank_details(self, request.data['bank_details'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_bank_details(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_bank_details(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        fy = resolve_financial_year(request.GET.get('financial_year_id'), self)
        response = enrich_bank_list_with_balances(response, fy)
        return Response(response)


class BankBalanceCarryForwardViewSet(viewsets.ModelViewSet):
    serializer_class = BankDetailSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'financial_year']

    def get_queryset(self):
        self.queryset = BankDetail.objects.filter(is_active=True)
        financial_year_id = self.request.GET.get('financial_year_id')
        if financial_year_id:
            self.queryset = self.queryset.filter(financial_year_id=financial_year_id)
        return self.queryset.order_by('-id')

    def list(self, request, *args, **kwargs):
        financial_year_id = request.GET.get('financial_year_id')
        if not financial_year_id:
            return Response({'error': 'financial_year_id is required'}, status=400)

        try:
            fy = FinancialYear.objects.get(id=financial_year_id)
        except FinancialYear.DoesNotExist:
            return Response({'error': 'Financial year not found'}, status=404)

        response = SharedService.read_data_paginated(self, True)
        response = enrich_carry_forward_list(response, fy)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = process_carry_forward(
            request.data.get('source_financial_year_id'),
            request.data.get('target_financial_year_id'),
            request.data.get('banks', []),
            self
        )
        return Response(response)


class BankFeeTypeMappingViewSet(viewsets.ModelViewSet):
    serializer_class = BankFeeTypeMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = BankFeeTypeMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_bank_fee_type(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_bank_fee_type(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_bank_fee_type(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_bank_fee_type(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class BankTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = BankTransactionSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['is_active', 'bank', 'staff']
    search_fields = ['date', 'staff__first_name', 'staff__middle_name', 'staff__last_name', 'particulars']
    ordering_fields = ['date', 'staff']
    lookup_field = 'bank'

    def get_queryset(self):
        self.queryset = BankTransaction.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_bank_transaction(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_bank_transaction_detail(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_bank_transaction(self)
        return Response(response)


class MiscellaneousTypeViewSet(viewsets.ModelViewSet):
    serializer_class = MiscellaneousTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = MiscellaneousType.objects.all()
        if self.request.GET.get('academic_year'):
            queryset = self.queryset.filter(misc_type__academic_year=self.request.GET.get('academic_year'),
                                            misc_type__is_active=True)
            self.queryset = self.queryset.exclude(id__in=queryset)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_types(self, request.data['misc_types'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_misc_types(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_misc_types(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class MiscellaneousMappingViewSet(viewsets.ModelViewSet):
    serializer_class = MiscellaneousMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'academic_year']

    def get_queryset(self):
        self.queryset = MiscellaneousMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_misc_plan(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_misc_plan(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_misc_plan(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class MiscellaneousViewSet(viewsets.ModelViewSet):
    serializer_class = MiscellaneousSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'miscellaneous__misc', 'miscellaneous__misc__academic_year']
    search_fields = ['date', 'miscellaneous__misc__misc_type__name', 'total_amount', 'guest_name', 'receipt_num',
                     'student__first_name', 'student__middle_name', 'student__last_name', 'student__current_reg_num',
                     'student__current_standard__name']
    ordering_fields = ['date', ('payment_details', 'miscellaneous__misc__misc_type__name'), 'total_amount',
                       'receipt_num', 'guest_name', 'student__first_name',
                       ('current_reg_num', 'student__current_reg_num'),
                       ('standard_name', 'student__current_standard__name')]

    def get_queryset(self):
        self.queryset = Miscellaneous.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_misc(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        response['data']['institute_detail'] = InstituteSerializer(Institute.get_institute(self)).data
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_report'):
            response = get_misc(self)
            return response
        response = get_misc(self)
        return Response(response)

    #
    # def update(self, request, *args, **kwargs):
    #     response = update_misc_plan(self, request.data, **kwargs)
    #     return Response(response)
    #
    # def destroy(self, request, *args, **kwargs):
    #     response = delete_misc_plan(self)
    #     return Response(response)


class ValidateFeeCollectionViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCollectionSerializer

    def get_queryset(self):
        self.queryset = FeeCollection.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_collection(self, request.data, True)
        return Response(response)

class FeePlanConcessionViewSet(viewsets.ModelViewSet):
    serializer_class = StandardFeeMappingSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        get_datas = {
            'academic_year': self.request.GET.get('academic_year'),
            'filter_query': {'is_active': True}
        }
        if self.request.GET.get('standard'):
            get_datas['filter_query']['id'] = self.request.GET.get('standard')
        self.queryset = get_standard_for_current_year(self, get_datas, True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_plan_concession(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = get_fee_plan_concession_list(self)
        return Response(response)

class MiscFeeRecieptViewSet(viewsets.ModelViewSet):
    serializer_class = MiscellaneousSerializer

    def get_queryset(self):
        self.queryset = Miscellaneous.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_misc_fee_receipt(self, False)
        return response

class FeeGroupViewSet(viewsets.ModelViewSet):
    serializer_class = FeeGroupSerializer

    def get_queryset(self):
        self.queryset = FeeGroup.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_fee_group_type(self, request.data['groups'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_fee_group_type(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_fee_group_type(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class FeeGroupTypesViewSet(viewsets.ModelViewSet):
    serializer_class = FeeGroupSerializer

    def get_queryset(self):
        self.queryset = FeeGroup.objects.all()
        return self.queryset
    
    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if self.request.GET.get('for_cashbook'):
            misc_data = MiscellaneousType.objects.filter(is_active=True).values()
            for misc in misc_data:
                response['data'].insert(0, {
                    'id': misc['id'],
                    'name': misc['name'],
                    'type': 'misc'
                })
            response['data'].insert(0,{
                'id': 'application',
                'name': 'Application Fee',
                'type': 'application'
            })
        return Response(response)

class PrintDummyReceiptViewSet(viewsets.ModelViewSet):
    serializer_class = None

    def create(self, request, *args, **kwargs):
        response = print_dummy_receipt(self, request.data)
        return response
    
class GetFeeListForStudentViewSet(viewsets.ModelViewSet):
    serializer_class  = None
    http_method_names = ['post']

    def create(self, request):
        student_ids = request.data['student_ids']
        response = get_fee_list_for_student(self, student_ids)
        student_data = Student.objects.filter(id__in=student_ids).values(
            'first_name', 'middle_name', 'last_name', 'id', 'student_group__name'
        )
        student_details = {}
        for student in student_data:
            student_details[student['id']] = {'name': get_full_name(student['first_name'], student['middle_name'], student['last_name']) ,
                                              'student_group_name': student['student_group__name']}
        return Response({'data': response, 'student_details': student_details})

class GetFeeCodeNamesViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request):
        obj = FeeType()
        return_array = obj.get_predefined_code_names()
        return Response({'data': return_array})

class AdditionalChargeTypeViewSet(viewsets.ModelViewSet):
    serializer_class = AdditionalChargeTypeSerializer
    http_method_names = ['post', 'get', 'delete']

    def get_queryset(self):
        return AdditionalChargeType.objects.all()

    def create(self, request, *args, **kwargs):
        response = additional_charge_type(self, request.data['data_list'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        return Response(SharedService.read_data(self, True))

    def retrieve(self, request, *args, **kwargs):
        return Response(SharedService.read_data(self))

    def destroy(self, request, *args, **kwargs):
        filter_data = {'additional_charge_additional_charge_type__isnull': True}
        return SharedService.delete_unrefered_data(self, filter_data, 'Unable to delete some of the data is referred')

class AdditionalChargeViewSet(viewsets.ModelViewSet):
    serializer_class = AdditionalChargeSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return AdditionalCharge.objects.all()

    def create(self, request, *args, **kwargs):
        response = add_or_update_additional_charge(self, request.data['data_list'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = AdditionalChargeReadSerializer
        return Response(SharedService.read_data(self, True))

    def retrieve(self, request, *args, **kwargs):
        return Response(SharedService.read_data(self))

    def destroy(self, request, *args, **kwargs):
        response = delete_additional_charge(self, request.data['ids'])
        return Response(response)

class FeePlanAdditionalChargeMappingViewSet(viewsets.ModelViewSet):
    serializer_class = FeePlanAdditionalChargeMappingSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        return FeePlanAdditionalChargeMapping.objects.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        response = add_additional_charge_mapping(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = FeePlanAdditionalChargeMappingReadSerializer
        return Response(SharedService.read_data(self, True))


class FeeCollectionSummaryReportViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_fee_collection_fee_type_wise_report(self)
        download_excel = self.request.GET.get('download_excel')
        if not download_excel:
            return Response(response)
        else:
            return response

# class AdjustmentReportViewSet(viewsets.ModelViewSet):
#     serializer_class = None
#     http_method_names = ['get']

#     def list(self, request, *args, **kwargs):
#         response = get_adjustment_report(self, request)
#         return Response(response)
        
class FeeCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = FeeCategory.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['category'], 'name')
        response = SharedService.add_data(self, request.data['category'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_fee_type_category(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_feetype_category(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)
    
class FeeCategoryFeeStandardSectionMappingViewSet(viewsets.ModelViewSet):
    serializer_class = FeeCategoryFeeStandardSectionMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = FeeCategoryFeeStandardSectionMapping.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = fee_category_fee_standard_section_add_data(self, request.data)
        return Response(response)

    # def update(self, request, *args, **kwargs):
    #     response = update_fee_type_category(self, request.data)
    #     return Response(response)

    # def destroy(self, request, *args, **kwargs):
    #     response = delete_feetype_category(self)
    #     return Response(response)

    def retrieve(self, request, *args, **kwargs):
        standard_id = self.kwargs['pk']
        academic_year = request.GET.get('academic_year')
        if not academic_year:
            raise exceptions.ValidationError('academic_year is mandatory')
        response = get_fee_category_fee_standard_section_data(self, academic_year, standard_id)
        return Response(response)
    
class GetOnlyFeeTypeViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTermsSerializer
    http_method_names = ['get','put']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        standard_ids = self.request.GET.get('standard_id').split(',')
        self.queryset = FeeStandardMapping.objects.filter(standard__in=standard_ids)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response_data={}
        response = get_fee_plan(self)
        response['data']['plan'], automatic_concession_details = apply_automatic_concession_to_fee_plan(response['data']['plan'])
        if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
            response['data']['fee_group_plan'], response['data']['fee_group_list'] = arrange_fee_plan_group_wise(self, response['data']['plan'])
        formdefintion_data = FormDefinition.objects.filter(form_name='fee_configurations').values('default_value', 'column_name')
        response['data']['fee_configurations'] = {f['column_name']:f['default_value'] for f in formdefintion_data}
        response['data']['automatic_concession_details'] = automatic_concession_details
        for data in response['data']['plan']:
            response_data[data['fee_type']] = {'id':data['fee_type'],'name':data['fee_type_name']}
        response_data_list = list(response_data.values())
        return Response({"data":response_data_list})
    
class GetOnlyFeeTermViewSet(viewsets.ModelViewSet):
    serializer_class = FeeTermsSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        fee_type_ids = self.request.GET.get('fee_type').split(',')
        standard_ids = self.request.GET.get('standard_id').split(',')
        self.queryset = FeeStandardMapping.objects.filter(standard__in=standard_ids,fee_type__in=fee_type_ids)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response_data={}
        response = get_fee_plan(self)
        response['data']['plan'], automatic_concession_details = apply_automatic_concession_to_fee_plan(response['data']['plan'])
        if FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'is_fee_group_enabled'):
            response['data']['fee_group_plan'], response['data']['fee_group_list'] = arrange_fee_plan_group_wise(self, response['data']['plan'])
        formdefintion_data = FormDefinition.objects.filter(form_name='fee_configurations').values('default_value', 'column_name')
        response['data']['fee_configurations'] = {f['column_name']:f['default_value'] for f in formdefintion_data}
        response['data']['automatic_concession_details'] = automatic_concession_details
        for data in response['data']['plan']:
            for terms in data['standard_fee']:
                if not terms['term_alias']:
                    terms['term_alias']=""
                response_data[terms['terms']] = {'id':terms['terms'],'name':terms['terms'],'alias':terms['term_alias']}
        response_data_list = list(response_data.values())
        return Response({"data":response_data_list})

class GetSiblingFeeListViewSet(viewsets.ModelViewSet):
    serializer_class  = None
    http_method_names = ['post']

    def create(self, request):
        student_id = request.data['student_id']
        show_only_pending_sibling = request.data.get('show_only_pending_sibling')
        sib_obj = StudentSiblingMapping()
        sibling_data = sib_obj.get_student_sibling_data([student_id])
        sibling_student_ids = []
        sibling_fee_data = []
        sibling_detail_mapping = {}
        student_data_with_fee_data = []
        if sibling_data and sibling_data[student_id] and sibling_data[student_id]['sibling_list']:
            for sibling_student in sibling_data[student_id]['sibling_list']:
                if sibling_student['student_id'] != student_id:
                    sibling_student_ids.append(sibling_student['student_id'])
                    sibling_detail_mapping[sibling_student['student_id']] = sibling_student
        if sibling_student_ids:
            fee_list_data = get_fee_list_for_student(self, sibling_student_ids)
            for student_id in fee_list_data:
                fee_data = fee_list_data[student_id]
                if show_only_pending_sibling:
                    # Filter out fee_data items with pending_amount <= 0
                    filtered_fee_data = [fee for fee in fee_data if fee.get('pending_amount', 0) > 0]
                    # Only include student if there is at least one pending fee
                    if filtered_fee_data:
                        student_details = {}
                        student_details = sibling_detail_mapping[student_id]
                        student_details['fee_data'] = filtered_fee_data
                        student_data_with_fee_data.append(student_details)
                else:
                    student_details = sibling_detail_mapping[student_id]
                    student_details['fee_data'] = fee_data
                    student_data_with_fee_data.append(student_details)

        return Response({'sibling_fee_data': student_data_with_fee_data})

class TemplateMappingFilterDatasViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        return Response({'data': bank_list_data})

class AreaWisePendingReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    permission_classes = (OnlyListAccess,)

    def list(self, request, *args, **kwargs):
        response = get_area_wise_pending_report(self)
        return Response(response)
    
class DepositDataViewSet(viewsets.ModelViewSet):
    serializer_class = DepositWithdrawRecordSerializer
    http_method_names = ['get','post']
    filterset_fields = ['transaction_type', 'transaction_from']

    def get_queryset(self):
        self.queryset = DepositWithdrawRecord.objects.filter(is_active=True)
        if self.request.GET.get('from_date') and self.request.GET.get('to_date'):
            self.queryset = self.queryset.filter(date__range=(self.request.GET.get('from_date'), self.request.GET.get('to_date')))
        if self.request.GET.get('user_from') and self.request.GET.get('user_to'):
            self.queryset = self.queryset.filter(Q(user_from=self.request.GET.get('user_from'))|Q(user_to=self.request.GET.get('user_to')))
        if self.request.GET.get('bank_from') and self.request.GET.get('bank_to'):
            self.queryset = self.queryset.filter(Q(bank_from=self.request.GET.get('bank_from'))|Q(bank_to=self.request.GET.get('bank_to')))
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = create_deposit_amount(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        deposit_record = resolve_deposit_record(
            request.GET.get('object_id'), request.GET.get('content_type_name')
        )
        serializer = self.get_serializer(deposit_record)
        return Response(serializer.data)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('transaction_history'):
            response = SharedService.read_data_paginated(self,True)
        elif self.request.GET.get('deposit_amount_summary'):
            response = get_deposit_amount_summary(self)
        else:
            extra_params = {
                "from_cash_in_hand":self.request.GET.get("from_cash_in_hand"),
                "from_bank":self.request.GET.get("from_bank")
            }
            if extra_params['from_cash_in_hand']:
                extra_params['from_cash_in_hand'] = int(extra_params['from_cash_in_hand'])
            if extra_params['from_bank']:
                extra_params['from_bank']=int(extra_params['from_bank'])
            response = get_fee_deposit_data(self,extra_params)
        if self.request.GET.get('download_pdf'):
            return response
        return Response(response)


def get_active_financial_year():
    return FinancialYear.objects.filter(
        is_active=True, is_locked=False
    ).order_by('start_date').first()


def check_sequential_fy_guard(financial_year_id):
    
    if not financial_year_id:
        return None

    try:
        target_fy = FinancialYear.objects.get(id=financial_year_id)
        if target_fy.is_locked:
            label = f"{target_fy.start_date.year}-{target_fy.end_date.year}"
            raise exceptions.ValidationError(
                f"Financial year {label} is locked. No modifications allowed."
            )
    except FinancialYear.DoesNotExist:
        raise exceptions.ValidationError("Financial year not found.")

    active_fy = get_active_financial_year()
    if active_fy is None:
        raise exceptions.ValidationError(
            "All financial years are locked. No modifications allowed."
        )

    if int(financial_year_id) != active_fy.id:
        active_label = f"{active_fy.start_date.year}-{active_fy.end_date.year}"
        raise exceptions.ValidationError(
            f"Modifications are only allowed for the active financial year ({active_label}). "
            f"Please switch to the correct FY."
        )
    return active_fy


class RecoverableAssetViewSet(viewsets.ModelViewSet):
    serializer_class = RecoverableAssetSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    filterset_fields = ['is_active', 'account_label']

    def get_queryset(self):
        self.queryset = RecoverableAsset.objects.filter(is_active=True).select_related(
            'category', 'bank', 'category__financial_year', 'salary_advance'
        )

        financial_year_id = self.request.GET.get('financial_year')
        if financial_year_id:
            self.queryset = self.queryset.filter(category__financial_year_id=financial_year_id)

        if self.request.GET.get('unlocked_fy_only') == 'true':
            self.queryset = self.queryset.filter(category__financial_year__is_locked=False)

        status = self.request.GET.get('status')
        if status:
            self.queryset = self.queryset.filter(status=status)

        linked_module = self.request.GET.get('linked_module')
        if linked_module:
            self.queryset = self.queryset.filter(linked_module=linked_module)

        category_id = self.request.GET.get('category')
        if category_id:
            self.queryset = self.queryset.filter(category_id=category_id)

        asset_type = self.request.GET.get('asset_type')
        if asset_type:
            self.queryset = self.queryset.filter(asset_type=asset_type)
        if self.request.GET.get('loans_advance'):
            self.queryset = self.queryset.filter(asset_type__in=['LOAN', 'ADVANCE', 'DEPOSIT'])
        elif not asset_type and self.action == 'list':
            pass

        return self.queryset

    def create(self, request, *args, **kwargs):
        resolve_category_for_create(request.data)
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        check_asset_bs_locked(instance)
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):

        instance = self.get_object()
        if instance.linked_module == 'SUNDRY_DEBTORS' and instance.pending_fees_config:
            fy_id = instance.category.financial_year_id if instance.category else None
            if fy_id:
                auto_recalculate_pending_fees(fy_id, request.user)
                instance.refresh_from_db()

        if instance.linked_module == 'STAFF_SALARY_ADVANCE' and instance.salary_advance:
            serializer = SalaryAdvanceReadSerializer(instance.salary_advance)
            return Response({'data': serializer.data})
        else:
            self.serializer_class = RecoverableAssetReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):

        financial_year_id = request.GET.get('financial_year')
        if financial_year_id:
            auto_recalculate_pending_fees(financial_year_id, request.user)

        if self.request.GET.get('salary_advance'):
            qs = SalaryAdvance.objects.filter(is_active=True).select_related('staff', 'financial_year', 'approved_by')
            if financial_year_id:
                qs = qs.filter(financial_year_id=financial_year_id)
            status = request.GET.get('status')
            if status:
                qs = qs.filter(status=status)
            self.queryset = qs
            self.serializer_class = SalaryAdvanceReadSerializer
        else:
            self.serializer_class = RecoverableAssetReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):

        instance = self.get_object()
        check_asset_bs_locked(instance)
        soft_delete_asset_cascade(instance)
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)



class RecoverableAssetHistoryViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    filterset_fields = ['recoverable_asset', 'action']

    def get_queryset(self):
        self.queryset = RecoverableAssetHistory.objects.select_related(
            'recoverable_asset', 'recoverable_asset_transaction', 'performed_by'
        ).order_by('-performed_at')
        
        if self.request.GET.get('loans_advance'):
            self.queryset = self.queryset.filter(recoverable_asset__asset_type__in=['LOAN', 'ADVANCE', 'DEPOSIT'])
        
        if self.request.GET.get('is_transaction_history') == 'true':
            self.queryset = self.queryset.filter(recoverable_asset_transaction__isnull=False)
        elif self.request.GET.get('is_transaction_history') == 'false':
            self.queryset = self.queryset.filter(recoverable_asset_transaction__isnull=True)
        
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = RecoverableAssetHistoryReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = RecoverableAssetHistoryReadSerializer
        response = SharedService.read_data(self)
        return Response(response)


class RecoverableAssetTransactionViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['recoverable_asset', 'transaction_type', 'is_active']

    def get_queryset(self):
        self.queryset = RecoverableAssetTransaction.objects.filter(
            is_active=True
        ).select_related('recoverable_asset', 'created_by')

        category_id = self.request.GET.get('category')
        if category_id:
            self.queryset = self.queryset.filter(recoverable_asset__category_id=category_id)

        if self.request.GET.get('loans_advance'):
            self.queryset = self.queryset.filter(recoverable_asset__asset_type__in=['LOAN', 'ADVANCE', 'DEPOSIT'])
        elif self.request.GET.get('salary_advance'):
            # Route to SalaryAdvanceTransaction model
            self.queryset = SalaryAdvanceTransaction.objects.filter(
                is_active=True
            ).select_related('salary_advance', 'created_by')
            sa_id = self.request.GET.get('salary_advance_id') or self.request.GET.get('recoverable_asset')
            if sa_id:
                self.queryset = self.queryset.filter(salary_advance_id=sa_id)
            self.serializer_class = SalaryAdvanceTransactionReadSerializer
            return self.queryset

        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if start_date:
            self.queryset = self.queryset.filter(transaction_date__gte=start_date)
        if end_date:
            self.queryset = self.queryset.filter(transaction_date__lte=end_date)

        return self.queryset

    def create(self, request, *args, **kwargs):

        txn_date = request.data.get('transaction_date')
        if txn_date:
            check_fy_locked_for_date(txn_date)
        self.serializer_class = RecoverableAssetTransactionSerializer
        response = SharedService.add_data(self, request.data, isList=False)
        if response.get('status') == 'success':
            txn_data = response.get('data', {})
            txn_id = txn_data.get('id') if isinstance(txn_data, dict) else None
            if txn_id:
                from apps.finance.models.recoverable_asset import RecoverableAssetTransaction
                try:
                    txn = RecoverableAssetTransaction.objects.select_related('recoverable_asset').get(id=txn_id)
                    txn.recoverable_asset.recalculate_closing_balance()
                except RecoverableAssetTransaction.DoesNotExist:
                    pass
        return Response(response)

    def update(self, request, *args, **kwargs):

        instance = self.get_queryset().filter(id=self.kwargs['pk']).first()
        if instance:
            check_fy_locked_for_date(instance.transaction_date)
        txn_date = request.data.get('transaction_date')
        if txn_date:
            check_fy_locked_for_date(txn_date)
        self.serializer_class = RecoverableAssetTransactionSerializer
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = RecoverableAssetTransactionReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):

        self.serializer_class = RecoverableAssetTransactionReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):

        instance = self.get_queryset().filter(id=self.kwargs['pk']).first()
        if instance:
            check_fy_locked_for_date(instance.transaction_date)
        asset = None
        if instance:
            asset = instance.recoverable_asset
            log_transaction_delete(asset, instance, request.user)
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        if asset:
            recalculate_after_transaction_change(asset)
        return Response(response)


class SalaryAdvanceReportViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        report_type = request.GET.get('report_type')

        if report_type == 'statement':
            result = sa_get_statement(
                request.GET.get('from_date'), request.GET.get('to_date'),
                request.GET.get('staff_id'), request.GET.get('financial_year_id')
            )
        elif report_type == 'dashboard':
            result = sa_get_dashboard(request.GET.get('financial_year_id'))
        elif report_type == 'aging':
            result = sa_get_aging(
                request.GET.get('staff_id'), request.GET.get('financial_year_id'),
                request.GET.get('as_of_date')
            )
        elif report_type == 'amortization':
            asset_id = request.GET.get('asset_id')
            if not asset_id:
                raise exceptions.ValidationError('asset_id is required for amortization report')
            result = sa_get_amortization(asset_id)
        else:
            raise exceptions.ValidationError(
                'report_type is required. Options: statement, dashboard, aging, amortization'
            )
        return Response(result)


class SalaryAdvancePayrollViewSet(viewsets.ViewSet):
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        result = sa_get_payroll_details(
            request.GET.get('staff_id'), request.GET.get('salary_month')
        )
        return Response(result)

    def create(self, request, *args, **kwargs):
        action = request.data.get('action', 'recover')
        if action == 'reverse':
            result = sa_handle_reversal(request.data, request.user)
        else:
            result = sa_handle_recovery(request.data, request.user)
        return Response(result)


class SalaryAdvanceChargesViewSet(viewsets.ViewSet):
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        charge_type = request.data.get('charge_type')

        if charge_type == 'interest':
            result = sa_apply_interest(request.data, request.user)
        elif charge_type == 'penalty':
            result = sa_apply_penalty(request.data, request.user)
        elif charge_type == 'bulk':
            result = sa_apply_bulk_charges(request.data.get('salary_month'), request.user)
        else:
            raise exceptions.ValidationError(
                'charge_type is required. Options: interest, penalty, bulk'
            )
        return Response(result)


class SalaryAdvanceViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryAdvanceReadSerializer
        return SalaryAdvanceSerializer

    def get_queryset(self):
        self.queryset = SalaryAdvance.objects.filter(is_active=True).select_related(
            'staff', 'financial_year', 'approved_by'
        )
        fy_id = self.request.GET.get('financial_year')
        if fy_id:
            self.queryset = self.queryset.filter(financial_year_id=fy_id)
        status = self.request.GET.get('status')
        if status:
            self.queryset = self.queryset.filter(status=status)
        staff_id = self.request.GET.get('staff')
        if staff_id:
            self.queryset = self.queryset.filter(staff_id=staff_id)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        category_id = data.pop('category', None)
        response = SharedService.add_data(self, data, isList=False)
        reason = response.get('Reason', '') or response.get('status', '')
        if 'Success' in str(reason) and category_id:
            sa_data = response.get('data', {})
            sa_id = sa_data.get('id') if isinstance(sa_data, dict) else None
            if sa_id:
                sa_instance = SalaryAdvance.objects.get(id=sa_id)
                create_recoverable_asset_for_salary_advance(sa_instance, category_id, request.user)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        instance = self.get_object()
        sync_salary_advance_to_recoverable_asset(instance)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        soft_delete_salary_advance_cascade(instance)
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class SalaryAdvanceTransactionViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryAdvanceTransactionReadSerializer
        return SalaryAdvanceTransactionSerializer

    def get_queryset(self):
        self.queryset = SalaryAdvanceTransaction.objects.filter(
            is_active=True
        ).select_related('salary_advance', 'created_by')
        sa_id = self.request.GET.get('salary_advance')
        if sa_id:
            self.queryset = self.queryset.filter(salary_advance_id=sa_id)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data, isList=False)
        if response.get('status') == 'success':
            txn_data = response.get('data', {})
            txn_id = txn_data.get('id') if isinstance(txn_data, dict) else None
            if txn_id:
                try:
                    txn = SalaryAdvanceTransaction.objects.get(id=txn_id)
                    txn.salary_advance.recalculate_closing_balance()
                except SalaryAdvanceTransaction.DoesNotExist:
                    pass
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_queryset().filter(id=self.kwargs['pk']).first()
        sa = instance.salary_advance if instance else None
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        if sa:
            sa.recalculate_closing_balance()
        return Response(response)


class FeeMismatchReconciliationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post']
    filterset_fields = ['academic_year', 'student', 'is_reconciled']

    def get_serializer_class(self):
        if self.action == 'list':
            return FeeMismatchReconciliationLogReadSerializer
        return FeeMismatchReconciliationLogSerializer

    def get_queryset(self):
        queryset = FeeMismatchReconciliationLog.objects.all()
        academic_year = self.request.GET.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)
        
        standard_ids = self.request.GET.get('standard')
        if standard_ids and academic_year:
            student_ids = StudentStandardMapping.objects.filter(
                standard_id__in=standard_ids.split(','),
                academic_year_id=academic_year
            ).values_list('student_id', flat=True)
            queryset = queryset.filter(student_id__in=student_ids)
        
        return queryset.order_by('-created')

    def list(self, request, *args, **kwargs):
        academic_year = request.GET.get('academic_year')
        if not academic_year:
            raise exceptions.ValidationError('academic_year is required')
        
        show_logs = request.GET.get('show_logs')
        if show_logs:
            response = SharedService.read_data_paginated(self, True)
            return Response(response)
        result = get_fee_mismatch_students(self)
        return Response({'data': result})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        if request.GET.get('preview') == 'true':
            result = preview_fee_mismatch_reconciliation(request.data)
            return Response({'data': result})
        
        try:
            log = create_fee_mismatch_reconciliation(request, request.data)
            serializer = self.get_serializer(log)
            return Response({
                'Reason': 'Reconciliation log created successfully' if log.is_reconciled else 'No changes were made during reconciliation',
                'data': serializer.data
            })
        except ValueError as e:
            return Response({'error': str(e)}, status=400)

class BalanceSheetViewSet(viewsets.ViewSet):
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        financial_year_id = request.GET.get('financial_year_id')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if not financial_year_id:
            return Response({'error': 'financial_year_id is required'}, status=400)

        try:
            if download_excel:
                if is_long_running_process:
                    start_long_running_process(self)
                    SharedService.custom_thread(download_balance_sheet_excel_lrp, self)
                    return Response({'Result': True})
                return download_balance_sheet_excel(self)

            if download_pdf:
                if is_long_running_process:
                    start_long_running_process(self)
                    SharedService.custom_thread(download_balance_sheet_pdf_lrp, self)
                    return Response({'Result': True})
                return download_balance_sheet_pdf(self)

            result = get_balance_sheet(financial_year_id)
            result = enrich_balance_sheet_response(result, financial_year_id)
            return Response({'success': True, 'data': result})

        except Exception as e:
            return Response({'error': str(e)}, status=400)

    def create(self, request, *args, **kwargs):
        action_type = request.data.get('action')
        financial_year_id = request.data.get('financial_year_id')

        if not financial_year_id:
            return Response({'error': 'financial_year_id is required'}, status=400)

        if action_type == 'lock':
            result = lock_balance_sheet(financial_year_id, request.user, request.data.get('remarks', ''))
            status_code = result.pop('_status', 200)
            return Response(result, status=status_code)

        elif action_type == 'unlock':
            result = unlock_balance_sheet(financial_year_id, request.user, request.data.get('remarks', ''))
            status_code = result.pop('_status', 200)
            return Response(result, status=status_code)

        elif action_type == 'get_lock_status':
            result = get_lock_status(financial_year_id)
            return Response(result)

        else:
            return Response({'error': f'Unknown action: {action_type}'}, status=400)





class BalanceSheetLockHistoryViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year')
        limit = int(request.GET.get('limit', 20))
        pageno = int(request.GET.get('pageno', 1))

        qs = BalanceSheetLockHistory.objects.select_related(
            'financial_year', 'performed_by'
        ).order_by('-performed_on')

        if financial_year_id:
            qs = qs.filter(financial_year_id=financial_year_id)

        total = qs.count()
        offset = (pageno - 1) * limit
        page_data = qs[offset:offset + limit]

        serializer = BalanceSheetLockHistorySerializer(page_data, many=True)
        return Response({
            'success': True,
            'data': {
                'data_list': serializer.data,
                'count': total
            }
        })


class FYCarryForwardViewSet(viewsets.ViewSet):
    http_method_names = ['get', 'post']

    def list(self, request):
        source_fy_id = request.GET.get('financial_year_id')
        if not source_fy_id:
            return Response({'error': 'financial_year_id is required'}, status=400)
        result = preview_carry_forward(source_fy_id)
        if 'error' in result:
            return Response(result, status=400)
        return Response({'success': True, 'data': result})

    def create(self, request):
        source_fy_id = request.data.get('source_financial_year_id')
        target_fy_id = request.data.get('target_financial_year_id')
        if not source_fy_id or not target_fy_id:
            return Response({'error': 'source_financial_year_id and target_financial_year_id are required'}, status=400)
        result = execute_carry_forward(source_fy_id, target_fy_id, user=request.user)
        if 'error' in result:
            return Response(result, status=400)
        return Response(result)


class PendingFeesCalculationViewSet(viewsets.ViewSet):
    http_method_names = ['get', 'post']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year_id')
        if not financial_year_id:
            return Response({'error': 'financial_year_id is required'}, status=400)
        result = preview_pending_fees(financial_year_id)
        return Response({'success': True, 'data': result})

    def create(self, request):
        financial_year_id = request.data.get('financial_year_id')
        if not financial_year_id:
            return Response({'error': 'financial_year_id is required'}, status=400)

        action = request.data.get('action', 'execute')

        if action == 'sync':
            SharedService.custom_thread(
                sync_all_pending_fees_for_fy,
                financial_year_id,
                request.user
            )
            return Response({
                'success': True,
                'message': 'Pending fees sync started in background. Refresh the page after a few seconds to see updated data.'
            })

        result = execute_pending_fees_calculation(financial_year_id, user=request.user)
        return Response({'success': True, 'data': result})


class ActiveFinancialYearViewSet(viewsets.ViewSet):
    
    http_method_names = ['get']

    def list(self, request):
        active_fy = get_active_financial_year()
        if active_fy is None:
            return Response({
                'active_fy': None,
                'message': 'All financial years are locked.',
            })

        all_fys = FinancialYear.objects.filter(is_active=True).order_by('start_date').values(
            'id', 'start_date', 'end_date', 'is_locked'
        )
        return Response({
            'active_fy': {
                'id': active_fy.id,
                'label': f"{active_fy.start_date.year}-{str(active_fy.end_date.year)[2:]}",
                'start_date': active_fy.start_date,
                'end_date': active_fy.end_date,
            },
            'all_fys': list(all_fys),
        })


class FinanceAuditLogViewSet(viewsets.ViewSet):
    
    http_method_names = ['get']

    def list(self, request):
        from apps.asset.models import AssetSnapshotLockHistory
        from apps.finance.models.recoverable_asset import RecoverableAssetHistory
        from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory

        module_filter = request.GET.get('module', '')
        action_filter = request.GET.get('action', '')
        limit = int(request.GET.get('limit', 10))
        pageno = int(request.GET.get('pageno', 1))

        category_map = {}
        for cat in RecoverableAssetCategory.objects.filter(is_active=True):
            category_map[cat.id] = cat.name

        is_category_filter = module_filter and module_filter != 'fixed_assets'
        filter_category_id = None
        if is_category_filter:
            try:
                filter_category_id = int(module_filter)
            except (ValueError, TypeError):
                filter_category_id = None

        entries = []

        include_fixed = module_filter in ('', 'fixed_assets')
        if include_fixed:
            asset_qs = AssetSnapshotLockHistory.objects.select_related(
                'financial_year', 'performed_by'
            ).order_by('-performed_on')

            if action_filter:
                asset_qs = asset_qs.filter(action=action_filter.upper())

            for h in asset_qs:
                performed_by_name = ''
                if h.performed_by:
                    first = getattr(h.performed_by, 'first_name', '')
                    last = getattr(h.performed_by, 'last_name', '')
                    performed_by_name = f"{first} {last}".strip() or getattr(h.performed_by, 'username', '')

                fy_name = ''
                if h.financial_year:
                    fy_name = f"{h.financial_year.start_date.year}-{h.financial_year.end_date.year}"

                entries.append({
                    'module': 'Fixed Assets',
                    'action': h.action,
                    'entity_name': f'Depreciation – FY {fy_name}',
                    'performed_by': performed_by_name,
                    'performed_at': h.performed_on.isoformat() if h.performed_on else '',
                    'details': {
                        'remarks': h.remarks,
                        'snapshot_count': h.snapshot_count,
                        'edits': h.details,
                    }
                })

        include_recoverable = module_filter == '' or is_category_filter
        if include_recoverable:
            ra_qs = RecoverableAssetHistory.objects.select_related(
                'recoverable_asset__category', 'recoverable_asset', 'performed_by'
            ).order_by('-performed_at')

            if action_filter:
                ra_qs = ra_qs.filter(action=action_filter.upper())

            if filter_category_id:
                ra_qs = ra_qs.filter(recoverable_asset__category_id=filter_category_id)

            for h in ra_qs:
                performed_by_name = ''
                if h.performed_by:
                    first = getattr(h.performed_by, 'first_name', '')
                    last = getattr(h.performed_by, 'last_name', '')
                    performed_by_name = f"{first} {last}".strip() or getattr(h.performed_by, 'username', '')

                asset_name = h.recoverable_asset.name if h.recoverable_asset else 'Unknown'

                # Use category name as module
                cat_name = 'Uncategorized'
                if h.recoverable_asset and h.recoverable_asset.category_id:
                    cat_name = category_map.get(
                        h.recoverable_asset.category_id,
                        h.recoverable_asset.category.name if h.recoverable_asset.category else 'Uncategorized'
                    )

                entries.append({
                    'module': cat_name,
                    'action': h.action,
                    'entity_name': asset_name,
                    'performed_by': performed_by_name,
                    'performed_at': h.performed_at.isoformat() if h.performed_at else '',
                    'details': {
                        'previous_data': h.previous_data,
                        'new_data': h.new_data,
                    }
                })

        entries.sort(key=lambda x: x['performed_at'], reverse=True)

        total = len(entries)
        offset = (pageno - 1) * limit
        page = entries[offset:offset + limit]

        categories = [{'id': cid, 'name': cname} for cid, cname in category_map.items()]

        return Response({
            'success': True,
            'data': {
                'data_list': page,
                'count': total,
                'categories': categories,
            }
        })

class RecoverableAssetCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = RecoverableAssetCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        qs = RecoverableAssetCategory.objects.filter(is_active=True)
        fy_id = self.request.query_params.get('financial_year')
        all_fy = self.request.query_params.get('all_fy')
        if fy_id:
            qs = qs.filter(
                Q(financial_year_id=fy_id) | Q(financial_year__isnull=True)
            )
        elif not all_fy:
            latest_fy_id = RecoverableAssetCategory.objects.filter(
                is_active=True, financial_year__isnull=False
            ).order_by('-financial_year__start_date').values_list(
                'financial_year_id', flat=True
            ).first()
            if latest_fy_id:
                qs = qs.filter(
                    Q(financial_year_id=latest_fy_id) | Q(financial_year__isnull=True)
                )
        self.queryset = qs
        return self.queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data = validate_category_create(data)
        response = SharedService.add_data(self, data, isList=False)
        SharedService.add_to_log(self, request, response)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        validate_category_update(instance, request.data.get('financial_year'))
        response = SharedService.update_data(self, request.data, **kwargs)
        SharedService.add_to_log(self, request, response)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = RecoverableAssetCategoryReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = RecoverableAssetCategoryReadSerializer
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.financial_year_id:
            check_sequential_fy_guard(instance.financial_year_id)
        confirm = request.GET.get('confirm') == 'true'
        should_proceed, warning = cascade_delete_category(instance, confirm)
        if not should_proceed:
            return Response(warning)
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        SharedService.add_to_log(self, request, response)
        return Response(response)

class RecoverableAssetReportViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):

        report_type = request.GET.get('report_type', 'category_summary')
        download_format = request.GET.get('format', 'json')
        is_long_running_process = request.GET.get('long_running_process')

        _lrp_map = {
            ('ledger', 'pdf'): (
                recoverable_asset_reports.download_ledger_pdf,
                recoverable_asset_reports.download_ledger_pdf_lrp,
            ),
            ('ledger', 'excel'): (
                recoverable_asset_reports.download_ledger_excel,
                recoverable_asset_reports.download_ledger_excel_lrp,
            ),
            ('category_summary', 'pdf'): (
                recoverable_asset_reports.download_category_summary_pdf,
                recoverable_asset_reports.download_category_summary_pdf_lrp,
            ),
            ('category_summary', 'excel'): (
                recoverable_asset_reports.download_category_summary_excel,
                recoverable_asset_reports.download_category_summary_excel_lrp,
            ),
            ('period', 'pdf'): (
                recoverable_asset_reports.download_period_report_pdf,
                recoverable_asset_reports.download_period_report_pdf_lrp,
            ),
            ('period', 'excel'): (
                recoverable_asset_reports.download_period_report_excel,
                recoverable_asset_reports.download_period_report_excel_lrp,
            ),
        }

        key = (report_type, download_format)
        if key in _lrp_map:
            download_fn, lrp_fn = _lrp_map[key]
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(lrp_fn, self)
                return Response({'Result': True})
            return download_fn(self)

        if download_format == 'json':
            if report_type == 'ledger':
                asset_id = request.GET.get('asset_id')
                from_date = request.GET.get('from_date')
                to_date = request.GET.get('to_date')
                if not asset_id:
                    return Response({'status': 400, 'error': 'asset_id is required'})
                data = recoverable_asset_reports.get_ledger_report(asset_id, from_date, to_date)
                return Response({'status': 200, 'data': data})
            elif report_type == 'category_summary':
                fy_id = request.GET.get('financial_year_id')
                data = recoverable_asset_reports.get_category_summary(fy_id)
                return Response({'status': 200, 'data': data})
            elif report_type == 'period':
                from_date = request.GET.get('from_date')
                to_date = request.GET.get('to_date')
                cat_id = request.GET.get('category_id')
                if not from_date or not to_date:
                    return Response({'status': 400, 'error': 'from_date and to_date are required'})
                data = recoverable_asset_reports.get_period_report(from_date, to_date, cat_id)
                return Response({'status': 200, 'data': data})

        return Response({'status': 400, 'error': 'Invalid report_type or format'})


class RecoverableAssetDashboardViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):

        is_long_running_process = request.GET.get('long_running_process')
        fy_id = request.GET.get('financial_year_id')

        if is_long_running_process:
            start_long_running_process(self)
            SharedService.custom_thread(recoverable_dashboard_lrp, self)
            return Response({'Result': True})

        data = build_recoverable_dashboard(fy_id)
        return Response({'status': 200, 'data': data})



class StaffWalletViewSet(viewsets.ModelViewSet):
    serializer_class = StaffWalletSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'staff']

    def get_queryset(self):
        self.queryset = StaffWallet.objects.filter(is_active=True).select_related('staff')
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = StaffWalletReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        staff_id = data.get('staff')

        if not staff_id:
            raise exceptions.ValidationError('Staff is mandatory')
        if not data.get('opening_balance') and data.get('opening_balance') != 0:
            raise exceptions.ValidationError('Opening balance is mandatory')
        if not data.get('opening_date'):
            raise exceptions.ValidationError('Opening date is mandatory')

        if StaffWallet.objects.filter(staff_id=staff_id, is_active=True).exists():
            raise exceptions.ValidationError('Opening balance already exists for this staff member')

        data['created_by'] = request.user.id
        response = SharedService.add_data(self, data, isList=False)
        SharedService.add_to_log(self, request, response)
        return Response(response)

class DenominationViewSet(viewsets.ModelViewSet):
    serializer_class = DenominationSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Denomination.objects.all().order_by('-amount')
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)
        
    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.soft_delete_data(self)
        return Response(response)

class FeeAdvanceTypeViewSet(viewsets.ModelViewSet):
    """ViewSet for FeeAdvanceType - create/update/read using serializer only."""
    serializer_class = FeeAdvanceTypeSerializer
    queryset = FeeAdvanceType.objects.all()
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_queryset(self):
        return FeeAdvanceType.objects.all().order_by('-modified')

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data,True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    def destroy(self, request, *args, **kwargs):
        response = SharedService.soft_delete_data(self)
        return Response(response)

class FeeAdvanceCollectionViewSet(viewsets.ModelViewSet):
    """ViewSet for FeeAdvanceCollection - create/update/read using serializer only."""
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']

    def get_serializer_class(self):
        if self.action == 'list':
            return FeeAdvanceCollectionReadSerializer
        return FeeAdvanceCollectionSerializer

    def get_queryset(self):
        return FeeAdvanceCollection.objects.all().select_related(
            'fee_advance_type', 'academic_year', 'student'
        ).order_by('-modified')

    def create(self, request, *args, **kwargs):
        serializer = create_fee_advance_collection(request.data, request)
        return Response(serializer.data, status=201)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = update_fee_advance_collection(instance, request.data, partial=partial)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        response = get_fee_advance_receipt(self, localPath=False)
        return response
