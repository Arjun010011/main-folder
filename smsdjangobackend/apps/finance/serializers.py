import logging
from decimal import Decimal

from rest_framework import serializers
from rest_framework import exceptions

from django.db import models
from django.db.models import Sum, Case, When, DecimalField, Q
from apps.classes.models import Standard
from apps.shared.services import SharedService
from apps.finance.models import FeeType, FeeStandardMapping, FeePlan, FeeCollection, FeeStandardMappingItemSellingPrice, FeeCollectionModeOfPayment
from apps.finance.models.additional_charge import AdditionalCharge, AdditionalChargeType, FeeCollectionAdditionChargeMapping, FeePlanAdditionalChargeMapping
from apps.finance.models.bankTransaction import BankDetail, BankFeeTypeMapping, BankTransaction
from apps.finance.models.concession import (AdjustmentFeeParent, Concession, ConcessionType, AdjustmentFee, FeePlanConcessionMapping, FeePlanConcessionMappingMaster)
from apps.finance.models.fee import FeeGroup, FeeplanStudentFeature, StudentStoreMapping, StudentStoreMappingLog
from apps.finance.models.feeCollection import (AdmissionForm, FeeCollectionDeleteTracking, PaymentDetail, ApplicationPaymentDetail,
                                               ApplicationPlan)
from apps.finance.models.fee_category import FeeCategory, FeeCategoryFeeStandardSectionMapping
from apps.finance.models.miscellaneous import (MiscellaneousType, MiscellaneousMapping, Miscellaneous,
                                               MiscellaneousPayment)
from apps.finance.services.additional_charge import add_additional_charge_mapping
from apps.finance.models.recoverable_asset import (
    RecoverableAsset, RecoverableAssetTransaction, RecoverableAssetHistory
)
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.payroll.models.salary_advance import SalaryAdvance, SalaryAdvanceTransaction
from apps.shared.models.counter import Counter
from apps.shared.serializers import ActiveFilteredListSerializer, DocumentSerializer, CustomUniqueValidator
from apps.shared.services import FormdefinitionService
from apps.store.serializers import PropertyValueSerializer, StockSerializer
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer
from apps.shared.services_shared.common import get_full_name
from apps.finance.models.feeCollection import AdmissionFormHistory
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.finance.models.fee_mismatch import FeeMismatchReconciliationLog
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
from apps.finance.models.denomination import Denomination, BankTransactionDenomination, DepositWithdrawRecordDenomination
from apps.finance.models.fee_advance import FeeAdvanceType, FeeAdvanceCollection, FeeAdvanceCollectionPaymentDetail

class FeeTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=FeeType.objects.all())])
    type = serializers.ReadOnlyField(default='fees')

    class Meta:
        model = FeeType
        exclude = ['created', 'modified']


class FeeStandardMappingSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    codename = serializers.ReadOnlyField(source='fee_type.codename')
    is_feature = serializers.ReadOnlyField(source='fee_type.is_feature')

    class Meta:
        model = FeeStandardMapping
        exclude = ['created', 'modified']


class FilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        data = data.filter(academic_year=self.context['request'].GET.get('academic_year'))
        student_type = self.context['request'].GET.get('student_type')
        if student_type:
            data = data.filter(student_type__startswith=student_type)
        return super(FilteredListSerializer, self).to_representation(data)

class StudentStoreMappingReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentStoreMapping
        exclude = ['created', 'modified']

class StudentStoreMappingLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentStoreMappingLog
        exclude = ['created', 'modified']

class StandardTypesSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    codename = serializers.ReadOnlyField(source='fee_type.codename')
    is_feature = serializers.ReadOnlyField(source='fee_type.is_feature')
    fee_group_name = serializers.ReadOnlyField(source='fee_group.name')
    fee_group_code_name = serializers.ReadOnlyField(source='fee_group.code_name')
    student_group_name = serializers.ReadOnlyField(source='student_group.name')

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = FeeStandardMapping
        exclude = ['created', 'modified', 'academic_year', 'standard']


class StandardFeeMappingSerializer(serializers.ModelSerializer):
    fee_types = StandardTypesSerializer(many=True, read_only=True)
    standardyearname_name = serializers.ReadOnlyField(source='standardyearname.name')

    class Meta:
        model = Standard
        fields = '__all__'


class FilteredListTermsSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        data = data.filter(is_approved='1')
        return super(FilteredListTermsSerializer, self).to_representation(data)

class FeeplanStudentFeatureSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeplanStudentFeature
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('student', 'fee_plan'),
                message='Feature is already exist'
            )
        ]
        fields = '__all__'

class AdditionalChargeSerializerRead(serializers.ModelSerializer):
    additional_charge_type_name = serializers.ReadOnlyField(source='additional_charge_type.name')

    class Meta:
        model = AdditionalCharge
        fields = '__all__'


class FeePlanAdditionalChargeMappingReadSerializer(serializers.ModelSerializer):
    additional_charge = AdditionalChargeSerializerRead()

    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = FeePlanAdditionalChargeMapping
        fields = '__all__'

class TermSerializer(serializers.ModelSerializer):
    fee_plan_additional_charge_mapping_fee_plan = FeePlanAdditionalChargeMappingReadSerializer(many=True)
    is_paid = serializers.SerializerMethodField()

    class Meta:
        model = FeePlan
        exclude = ['created', 'modified', 'standard_fee']

    def get_is_paid(self, obj):
        """
        Indicates whether any payment has been made against this fee term.
        Used by frontend to lock paid terms from editing/increment.
        """
        return PaymentDetail.objects.filter(fee_plan=obj).exists()

class FeeStandardMappingItemReadSellingPriceSerializer(serializers.ModelSerializer):
    stock_data = StockSerializer(read_only=True, source='stock')

    class Meta:
        model = FeeStandardMappingItemSellingPrice
        exclude = ['created', 'modified']

class FeeStandardMappingItemSellingPriceSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeStandardMappingItemSellingPrice
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('fee_standard_mapping', 'stock'),
                message='Stock is already exist for the stock`'
            )
        ]
        exclude = ['created', 'modified']

class FeeStandardMappingItemSellingPriceReadSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='stock.item.name')
    property_values = PropertyValueSerializer(read_only=True, source='stock.property_value', many=True)
    category_name = serializers.ReadOnlyField(source='stock.category.name')
    sub_category_name = serializers.ReadOnlyField(source='stock.sub_category.name')

    class Meta:
        model = FeeStandardMappingItemSellingPrice
        exclude = ['created', 'modified']

class FeePlanSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeePlan
        fields = '__all__'

class FeeTermsSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    codename = serializers.ReadOnlyField(source='fee_type.codename')
    is_feature = serializers.ReadOnlyField(source='fee_type.is_feature')
    standard_name = serializers.ReadOnlyField(source='standard.name')
    academic_year_start_date = serializers.ReadOnlyField(source='academic_year.start_date')
    academic_year_end_date = serializers.ReadOnlyField(source='academic_year.end_date')
    academic_year_value = serializers.SerializerMethodField()
    student_group_name = serializers.ReadOnlyField(source='student_group.name')
    standard_fee = TermSerializer(many=True)
    fee_standard_mapping_item_selling_price_fee_standard_mapping = FeeStandardMappingItemSellingPriceReadSerializer(many=True)
    fee_group_name = serializers.ReadOnlyField(source='fee_group.name')
    fee_group_code_name = serializers.ReadOnlyField(source='fee_group.code_name')

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}' if obj.academic_year else None

    class Meta:
        model = FeeStandardMapping
        exclude = ['created', 'modified']

    def update(self, instance, validated_data):
        fee_plan_data = validated_data.pop('standard_fee')
        fee_plan = (instance.standard_fee).all()
        fee_plan = list(fee_plan)
        additional_data_save = {'data_list': []}
        for fee_data in fee_plan_data:
            if fee_plan:
                fee = fee_plan.pop(0)
                fee.terms = fee_data.get('terms', fee.terms)
                fee.rate = fee_data.get('rate', fee.rate)
                fee.is_amount = fee_data.get('is_amount', fee.is_amount)
                fee.payment_start_date = fee_data.get('payment_start_date', fee.payment_start_date)
                fee.payment_end_date = fee_data.get('payment_end_date', fee.payment_end_date)
                fee.term_start_date = fee_data.get('term_start_date', fee.term_start_date)
                fee.term_end_date = fee_data.get('term_end_date', fee.term_end_date)
                fee.fee_fine_rate = fee_data.get('fee_fine_rate', fee.fee_fine_rate)
                fee.fee_fine_frequency_in_days = fee_data.get('fee_fine_frequency_in_days', fee.fee_fine_frequency_in_days)
                fee.max_fee_fine_rate = fee_data.get('max_fee_fine_rate', fee.max_fee_fine_rate)
                fee.sequence = fee_data.get('sequence', fee.sequence)
                fee.term_alias = fee_data.get('term_alias', fee.term_alias)
                additional_charge_data = fee_data.get('additional_charge_data', [])
                fee_plan_saved = fee.save()
                if additional_charge_data and 'data_list' in additional_charge_data and additional_charge_data['data_list']:
                    for addition_charge in additional_charge_data['data_list']:
                        additional_data_save['data_list'].append({
                            'fee_plan': fee_plan_saved.id,
                            'additional_charge': addition_charge
                        })
            else:
                FeePlan.objects.create(standard_fee=instance, **fee_data)
        fee_plan_ids = [fee_plan_row['id'] for fee_plan_row in fee_plan]
        payment_exist = PaymentDetail.objects.filter(
            fee_plan__in=fee_plan_ids
        )
        if payment_exist:
            payment_exist = [str(row.fee_plan.standard_fee.fee_type.name) for row in payment_exist].join(',')
            raise exceptions.ValidationError(f'{payment_exist} given fee type already have the payment history. Not able to update  ')
        additonal_charge = FeePlanAdditionalChargeMapping.objects.filter(
            fee_plan__in=fee_plan_ids
        )
        if additonal_charge:
            additonal_charge = [str(row.fee_plan.standard_fee.fee_type.name) for row in additonal_charge].join(',')
            raise exceptions.ValidationError(f'{additonal_charge} given fee type already have the additional charge is configured. Not able to update')
        for fee_data in fee_plan:
            fee_data.delete()
        if additional_data_save['data_list']:
            add_additional_charge_mapping(self, additional_data_save['data_list'])
        return instance


class FeeTermsViewSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    codename = serializers.ReadOnlyField(source='fee_type.codename')
    is_feature = serializers.ReadOnlyField(source='fee_type.is_feature')
    standard_fee = TermSerializer(many=True)

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = FeeStandardMapping
        exclude = ['created', 'modified', 'academic_year', 'fee_type', 'standard']


class StandardFeeTermSerializer(serializers.ModelSerializer):
    fee_types = FeeTermsViewSerializer(many=True, read_only=True)
    standardyearname_name = serializers.ReadOnlyField(source='standardyearname.name')

    class Meta:
        model = Standard
        fields = ['id', 'name', 'fee_types', 'sequence', 'codename', 'dise_code', 'standardyearname_name', 'standardyearname']


class FeeCollectionSerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField(source='student.first_name')
    middle_name = serializers.ReadOnlyField(source='student.middle_name')
    last_name = serializers.ReadOnlyField(source='student.last_name')
    
    def validate(self, data):
        if FormdefinitionService.get_formdefintion_data(
            self, form_name='fee_configurations', column_name='unique_receipt_number'
        ) and FeeCollection.objects.filter(receipt_num=data['receipt_num']):
            raise exceptions.ValidationError('Duplicate Receipt Number Found')
        return data

    class Meta:
        model = FeeCollection
        exclude = ['created', 'modified']
        extra_kwargs = {'receipt_num': {'required': True}}


class AdmissionFormSerializer(serializers.ModelSerializer):
    academic_year_value = serializers.SerializerMethodField()

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}' if obj.academic_year else None

    class Meta:
        model = AdmissionForm
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'student'),
                message='Student admission for the academic year is already exists.'
            )
        ]
        exclude = ['created', 'modified']


class ApplicationPaymentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationPaymentDetail
        exclude = ['created', 'modified']


class ApplicationPlanSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')
    standard_sequence = serializers.ReadOnlyField(source='standard.sequence')

    class Meta:
        model = ApplicationPlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('academic_year', 'standard')
            )
        ]
        exclude = ['created', 'modified']


class StudentFeatureSerializer(serializers.ModelSerializer):
    student_feature = serializers.SerializerMethodField()

    def get_student_feature(self, obj):
        filter_query = {'is_active': True, 'fee_plan':obj.id}
        if 'student_ids' in self.context:
            filter_query['student__in'] = self.context['student_ids']
        return {fee['student_id'] : fee for fee in FeeplanStudentFeature.objects.filter(**filter_query).values()}

    class Meta:
        model = FeePlan
        exclude = ['created', 'modified']


class GetStudentFeatureSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_type.name')
    codename = serializers.ReadOnlyField(source='fee_type.codename')
    is_feature = serializers.ReadOnlyField(source='fee_type.is_feature')
    standard_fee = StudentFeatureSerializer(many=True)
    fee_standard_mapping_item_selling_price_fee_standard_mapping = FeeStandardMappingItemSellingPriceReadSerializer(many=True)

    class Meta:
        model = FeeStandardMapping
        exclude = ['created', 'modified']


class StudentFinanceSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    standard = serializers.ReadOnlyField(source='current_standard.name')
    # student_feature = FeeStandardMappingSerializer(many=True)
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        exclude = ['created', 'modified', 'is_active', 'first_name', 'middle_name', 'last_name']


class ConcessionTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=ConcessionType.objects.all())])

    class Meta:
        model = ConcessionType
        exclude = ['created', 'modified']


class ConcessionSerializer(serializers.ModelSerializer):
    concession_type_name = serializers.ReadOnlyField(source='concession_type.name')

    class Meta:
        model = Concession
        # validators = [
        #     serializers.UniqueTogetherValidator(
        #         queryset=model.objects.filter(is_active=True),
        #         fields=('concession_type', 'academic_year', 'standard'),
        #         message='Concession type is already applied for the standard in the academic year.'
        #     )
        # ]
        exclude = ['created', 'modified']


class AdjustmentFeeSerializer(serializers.ModelSerializer):
    fee_plan_details = TermSerializer(many=True, read_only=True)

    class Meta:
        model = AdjustmentFee
        exclude = ['created', 'modified']
        extra_kwargs = {'reason_id': {'required': True}}

class AdjustmentFeeReadSerializer(serializers.ModelSerializer):
    standard = serializers.ReadOnlyField(source='fee_plan.standard_fee.standard.id')
    academic_year = serializers.ReadOnlyField(source='fee_plan.standard_fee.academic_year.id')
    reason_name = serializers.ReadOnlyField(source='reason_id.name')
    fee_type_name = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_type.name')
    fee_term_name = serializers.ReadOnlyField(source='fee_plan.terms')

    class Meta:
        model = AdjustmentFee
        fields = ['amount', 'fee_plan_id', 'is_addition', 'fee_collection', 'reason_id', 'standard', 'academic_year', 'reason_name', 'fee_type_name', 'fee_term_name']

class AdjustmentFeeParentReadSerializer(serializers.ModelSerializer):
    get_name = serializers.SerializerMethodField()
    adjustment_fee_adjustment_fee_parent = AdjustmentFeeReadSerializer(many=True, read_only=True)
    approved_documents = serializers.SerializerMethodField()

    def get_name(self, obj):
        if obj and obj.staff:
            return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
        if obj and obj.student:
            return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)
        return ''

    def get_approved_documents(self, obj):
        from apps.shared.serializers import DocumentSerializer
        # Don't filter by is_active since documents might be newly uploaded with is_active=False
        documents = obj.approved_documents.all() if obj.approved_documents else []
        return DocumentSerializer(documents, many=True).data

    class Meta:
        model = AdjustmentFeeParent
        fields = '__all__'

class ConcessionFeeSerializer(serializers.ModelSerializer):
    fee_plan_details = TermSerializer(many=True, read_only=True)

    class Meta:
        model = AdjustmentFee
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('student', 'fee_plan', 'concession'),
                message='Concession is already exist(s) for the fee term(s).'
            )
        ]
        exclude = ['created', 'modified']


class BankDetailSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = BankDetail
        exclude = ['created', 'modified']
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=BankDetail.objects.filter(is_active=True),
                fields=('bank_id', 'financial_year'),
                message='Bank ID already exists for this financial year.'
            ),
            serializers.UniqueTogetherValidator(
                queryset=BankDetail.objects.filter(is_active=True),
                fields=('account_num', 'financial_year'),
                message='Account number already exists for this financial year.'
            ),
        ]

    def get_display_name(self, obj):
        return f"{obj.bank_name} (A/c. {obj.account_num})"


class BankFeeTypeMappingSerializer(serializers.ModelSerializer):
    bank_details = BankDetailSerializer(read_only=True, source='bank')
    fee_type_details = FeeTypeSerializer(read_only=True, source='fee_type')

    class Meta:
        model = BankFeeTypeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('bank', 'fee_type'),
                message='Fee type is already mapped to bank.'
            )
        ]
        fields = '__all__'


class BankTransactionSerializer(serializers.ModelSerializer):
    attachment_details = DocumentSerializer(read_only=True, source='attachment')
    staff_first_name = serializers.ReadOnlyField(source='staff.first_name')
    staff_middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    staff_last_name = serializers.ReadOnlyField(source='staff.last_name')
    # Adding denominations as a write-only field to accept denomination data during creation
    denominations = serializers.JSONField(write_only=True, required=False)

    class Meta:
        model = BankTransaction
        fields = '__all__'

    def create(self, validated_data):
        denominations_data = validated_data.pop('denominations', [])
        bank_transaction = super().create(validated_data)
        
        # Create BankTransactionDenomination instances
        if denominations_data:
            from apps.finance.models.denomination import BankTransactionDenomination, Denomination
            for item in denominations_data:
                denomination_id = item.get('denomination')
                count = item.get('count', 0)
                if denomination_id and count > 0:
                    try:
                        denomination = Denomination.objects.get(id=denomination_id)
                        # We don't need to specify total_amount since the pre_save signal handles it, 
                        # but if we don't have a signal, we calculate it or the save method. 
                        # Since we defined a custom save() method in BankTransactionDenomination, we just set count.
                        BankTransactionDenomination.objects.create(
                            bank_transaction=bank_transaction,
                            denomination=denomination,
                            count=count
                        )
                    except Denomination.DoesNotExist:
                        pass

        # Auto-sync to linked recoverable assets
        try:
            from apps.finance.services.recoverable_asset_service import sync_bank_to_recoverable_asset
            staff_user = None
            if bank_transaction.staff and hasattr(bank_transaction.staff, 'users'):
                staff_user = bank_transaction.staff.users
            sync_bank_to_recoverable_asset(
                bank_id=bank_transaction.bank_id,
                amount=float(bank_transaction.amount),
                is_incoming=bank_transaction.is_deposit,
                transaction_date=bank_transaction.date,
                source_reference=f'BankTransaction:{bank_transaction.id}',
                remarks=bank_transaction.particulars or (
                    f'Fee {"Deposit" if bank_transaction.is_deposit else "Withdrawal"}'
                ),
                user=staff_user,
            )
        except Exception:
            import logging
            logging.getLogger(__name__).error(
                f'Error auto-syncing BankTransaction {bank_transaction.id} to RA',
                exc_info=True
            )

        return bank_transaction


class GetBankTransactionSerializer(serializers.ModelSerializer):
    bank_details = BankDetailSerializer(read_only=True, source='bank')
    attachment_details = DocumentSerializer(read_only=True, source='attachment')

    class Meta:
        model = BankTransaction
        fields = '__all__'


class MiscellaneousTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[CustomUniqueValidator(queryset=MiscellaneousType.objects.filter(is_active=True))])

    class Meta:
        model = MiscellaneousType
        exclude = ['created', 'modified']


class MiscellaneousMappingSerializer(serializers.ModelSerializer):
    misc_type_name = serializers.ReadOnlyField(source='misc_type.name')
    misc_code_name = serializers.ReadOnlyField(source='misc_type.code_name')

    class Meta:
        model = MiscellaneousMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('academic_year', 'misc_type')
            )
        ]
        exclude = ['created', 'modified']


class MiscellaneousPaymentSerializer(serializers.ModelSerializer):
    misc_type_name = serializers.ReadOnlyField(source='misc.misc_type.name')

    class Meta:
        model = MiscellaneousPayment
        fields = '__all__'


class MiscellaneousSerializer(serializers.ModelSerializer):
    # misc_type_name = serializers.ReadOnlyField(source='misc.misc_type.name')
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    staff_first_name = serializers.ReadOnlyField(source='staff.first_name')
    staff_middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    staff_last_name = serializers.ReadOnlyField(source='staff.last_name')
    standard_name = serializers.ReadOnlyField(source='student.current_standard.name')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    payment_details = MiscellaneousPaymentSerializer(read_only=True, many=True, source='miscellaneous')

    class Meta:
        model = Miscellaneous
        fields = '__all__'



class StudentStoreMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentStoreMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('fee_standard_mapping_item_selling', 'student'),
                message='Stock is already assigned to student`'
            )
        ]
        exclude = ['created', 'modified']

class FeeCollectionDeleteTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeCollectionDeleteTracking
        fields = '__all__'


class FeePlanConcessionMappingSerializer(serializers.ModelSerializer):
    fee_plan_id = serializers.CharField(validators=[CustomUniqueValidator(queryset=FeePlanConcessionMapping.objects.all())])

    class Meta:
        model = FeePlanConcessionMapping
        fields = '__all__'

class FeePlanConcessionMappingMasterSerializer(serializers.ModelSerializer):
    fee_plan_concession_mapping_fee_plan = FeePlanConcessionMappingSerializer(many=True, read_only=True)

    class Meta:
        model = FeePlanConcessionMappingMaster
        fields = '__all__'

class CounterSerializer(serializers.ModelSerializer):

    class Meta:
        model = Counter
        fields = '__all__'

class FeeGroupSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=FeeGroup.objects.all())])

    class Meta:
        model = FeeGroup
        fields = '__all__'

class AdmissionFormHistorySerializer(serializers.ModelSerializer):

    class Meta:
        model = AdmissionFormHistory
        fields = '__all__'

class AdjustmentFeeParentSerializer(serializers.ModelSerializer):

    class Meta:
        model = AdjustmentFeeParent
        fields = '__all__'


class AdditionalChargeTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=AdditionalChargeType.objects.filter(is_active=True))])

    class Meta:
        model = AdditionalChargeType
        fields = '__all__'

class FeeCollectionAdditionChargeMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeCollectionAdditionChargeMapping
        fields = '__all__'

class FeePlanAdditionalChargeMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeePlanAdditionalChargeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('fee_plan', 'additional_charge'),
                message='Already additional charge exist'
            )
        ]
        fields = '__all__'

class AdditionalChargeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=AdditionalCharge.objects.filter(is_active=True))])

    def validate(self, data):
        if not data['additional_charge_type']:
            raise serializers.ValidationError("Addition charge type is mandatory")
        if not data['fees']:
            raise serializers.ValidationError('Fees is mandatory')
        if data['is_percentage'] and data['fees'] > 100:
            raise serializers.ValidationError('Percentage should not be greater than 100')
        return data

    class Meta:
        model = AdditionalCharge
        fields = '__all__'


class AdditionalChargeReadSerializer(serializers.ModelSerializer):
    additional_charge_type_name = serializers.ReadOnlyField(source='additional_charge_type.name')

    class Meta:
        model = AdditionalCharge
        fields = '__all__'

class FeePlanAdditionalChargeMappingReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeePlanAdditionalChargeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('fee_plan', 'additional_charge'),
                message='Already additional charge exist'
            )
        ]
        fields = '__all__'

class FeeCollectionAdditionChargeMappingSerilaizer(serializers.ModelSerializer):

    class Meta:
        model = FeeCollectionAdditionChargeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('payment_detail', 'additional_charge'),
                message='Payment detail for the additional charge already exist'
            )
        ]
        fields = '__all__'

class FeeCollectionAdditionChargeMappingReadSerilaizer(serializers.ModelSerializer):
    additional_charge_data = AdditionalChargeReadSerializer(source='additional_charge')

    class Meta:
        model = FeeCollectionAdditionChargeMapping
        fields = '__all__'


class PaymentDetailSerializer(serializers.ModelSerializer):
    fee_type_name = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_type.name')
    fee_type_alias_name = serializers.ReadOnlyField(source='fee_plan.standard_fee.receipt_alias')
    fee_type_codename = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_type.codename')
    fee_type = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_type.id')
    fee_payment_end_date = serializers.ReadOnlyField(source='fee_plan.payment_end_date')
    fee_payment_terms = serializers.ReadOnlyField(source='fee_plan.terms')
    fee_payment_terms_alias = serializers.ReadOnlyField(source='fee_plan.term_alias')
    standard_fee_id = serializers.ReadOnlyField(source='fee_plan.standard_fee.id')
    academic_year_id =  serializers.ReadOnlyField(source='fee_plan.standard_fee.academic_year.id')
    fee_group = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_group.id')
    fee_group_name = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_group.name')
    fee_group_code_name = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_group.code_name')
    fee_group = serializers.ReadOnlyField(source='fee_plan.standard_fee.fee_group.id')
    fee_collection_addition_charge_mapping_fee_collection = FeeCollectionAdditionChargeMappingReadSerilaizer(many=True, read_only=True)

    class Meta:
        model = PaymentDetail
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('fee_collection', 'fee_plan')
            )
        ]
        exclude = ['created', 'modified']


class GetFeeCollectionSerializer(serializers.ModelSerializer):
    payment_detail = PaymentDetailSerializer(many=True, read_only=True)
    student_detail = StudentListSerializer(read_only=True, source='student')
    collected_by = serializers.SerializerMethodField()

    def get_collected_by(self, obj):
        if obj.user and obj.user.staff:
            return get_full_name(obj.user.staff.first_name, obj.user.staff.middle_name, obj.user.staff.last_name)
        if obj.user and obj.user.student:
            return get_full_name(obj.user.student.first_name, obj.user.student.middle_name, obj.user.student.last_name)
        return ''

    class Meta:
        model = FeeCollection
        exclude = ['modified']

class FeeCollectionModeOfPaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeCollectionModeOfPayment
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('mode_of_payment', 'fee_collection'),
                message='Mode of payment already exist in fee collection'
            )
        ]
        fields = '__all__'

class FeeCategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=FeeCategory.objects.filter(is_active=True))])

    class Meta:
        model = FeeCategory
        fields = '__all__'

class FeeCategoryFeeStandardSectionMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeeCategoryFeeStandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('standard_section', 'fee_plan'),
                message='Duplicate fee_category standard_section fee_plan'
            )
        ]
        fields = '__all__'

class DenominationSerializer(serializers.ModelSerializer):
    amount = serializers.IntegerField(
        validators=[CustomUniqueValidator(queryset=Denomination.objects.filter(is_active=True))]
    )
    class Meta:
        model = Denomination
        fields = '__all__'


class BankTransactionDenominationSerializer(serializers.ModelSerializer):
    denomination_amount = serializers.ReadOnlyField(source='denomination.amount')

    class Meta:
        model = BankTransactionDenomination
        fields = ['id', 'denomination', 'count', 'total_amount', 'denomination_amount']

class DepositWithdrawRecordDenominationSerializer(serializers.ModelSerializer):
    denomination_amount = serializers.ReadOnlyField(source='denomination.amount')

    class Meta:
        model = DepositWithdrawRecordDenomination
        fields = ['id', 'denomination', 'count', 'total_amount', 'denomination_amount']

class DepositWithdrawRecordSerializer(serializers.ModelSerializer):

    attachment_details = DocumentSerializer(read_only=True, source='attachment')
    transaction_type_display = serializers.SerializerMethodField()
    transaction_from_display = serializers.SerializerMethodField()
    bank_from_name = serializers.SerializerMethodField()
    bank_to_name = serializers.SerializerMethodField()
    user_from_username = serializers.SerializerMethodField()
    user_to_username = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    denominations = DepositWithdrawRecordDenominationSerializer(many=True, read_only=True, source='deposit_withdraw_record_denomination_deposit_withdraw_record')
    denominations_write = serializers.JSONField(write_only=True, required=False, source='denominations')

    def get_created_by_name(self, obj):
        if not obj.created_by.is_superuser:
            return get_full_name(obj.created_by.staff.first_name, obj.created_by.staff.middle_name, obj.created_by.staff.last_name)
        return ''

    def get_transaction_type_display(self, obj):
        """Returns transaction type with human-readable label"""
        transaction_type_map = {
            1: 'deposit',
            2: 'withdraw',
            3: 'transaction'
        }
        return {
            'value': obj.transaction_type,
            'label': transaction_type_map.get(obj.transaction_type, 'Unknown')
        }

    def get_transaction_from_display(self, obj):
        """Returns transaction from with human-readable label"""
        transaction_from_map = {
            1: 'fee collection',
            2: 'misc',
            3: 'Expenses',
            4: 'Banktobank/cash_in_hand',
            5: 'application fees',
            6: 'receipt cancel'
        }
        return {
            'value': obj.transaction_from,
            'label': transaction_from_map.get(obj.transaction_from, 'Unknown')
        }

    def get_bank_from_name(self, obj):
        """Returns bank display name for bank_from"""
        if obj.bank_from:
            return f"{obj.bank_from.bank_name} (A/c. {obj.bank_from.account_num})"
        return None

    def get_bank_to_name(self, obj):
        """Returns bank display name for bank_to"""
        if obj.bank_to:
            return f"{obj.bank_to.bank_name} (A/c. {obj.bank_to.account_num})"
        return None

    def get_user_from_username(self, obj):
        """Returns username for user_from"""
        return obj.user_from.username if obj.user_from else None

    def get_user_to_username(self, obj):
        """Returns username for user_to"""
        return obj.user_to.username if obj.user_to else None

    class Meta:
        model = DepositWithdrawRecord
        fields = '__all__'

    def create(self, validated_data):
        denominations_data = validated_data.pop('denominations', [])
        deposit_withdraw_record = super().create(validated_data)
        if denominations_data:
            from apps.finance.models.denomination import DepositWithdrawRecordDenomination
            for item in denominations_data:
                DepositWithdrawRecordDenomination.objects.create(
                    deposit_withdraw_record=deposit_withdraw_record,
                    denomination_id=item['denomination'],
                    count=item['count']
                )
        return deposit_withdraw_record

class RecoverableAssetSerializer(serializers.ModelSerializer):

    class Meta:
        model = RecoverableAsset
        fields = '__all__'

    def validate(self, data):
        # closing_balance is derived from transactions, not required from user
        # Only enforce mandatory fields on full create/update, not partial (PATCH)
        if not self.partial:
            is_bank_link = data.get('linked_module') == 'BANK_ACCOUNT' and data.get('bank')
            mandatory_fields = ['name']
            if not is_bank_link:
                mandatory_fields.append('opening_balance')
            SharedService.check_mandatory_field_in_list(
                mandatory_fields,
                data
            )

        if data.get('account_number'):
            SharedService.validate_bank_account_num(data['account_number'])

        return data

    def create(self, validated_data):
        request = self.context['request']
        validated_data['created_by'] = request.user
        # Initially closing_balance equals opening_balance (before any transactions)
        if 'closing_balance' not in validated_data:
            validated_data['closing_balance'] = validated_data.get('opening_balance', 0)

        instance = super().create(validated_data)

        RecoverableAssetHistory.objects.create(
            recoverable_asset=instance,
            action='CREATE',
            new_data=SharedService._model_to_dict(instance),
            performed_by=request.user
        )

        return instance

    def update(self, instance, validated_data):
        request = self.context['request']
        previous_data = SharedService._model_to_dict(instance)
        old_config = instance.pending_fees_config
        old_adv_config = instance.advance_fee_config

        validated_data['updated_by'] = request.user
        instance = super().update(instance, validated_data)

        RecoverableAssetHistory.objects.create(
            recoverable_asset=instance,
            action='UPDATE',
            previous_data=previous_data,
            new_data=SharedService._model_to_dict(instance),
            performed_by=request.user
        )

        # Auto-trigger pending fees calculation when pending_fees_config changes
        new_config = instance.pending_fees_config
        if new_config and new_config != old_config:
            try:
                from apps.finance.services.pending_fees_calculator import (
                    calculate_pending_fees_for_asset, _recalculate_closing_balance
                )
                from apps.finance.models.recoverable_asset import RecoverableAssetTransaction
                from decimal import Decimal

                calc = calculate_pending_fees_for_asset(instance)
                pending = Decimal(str(calc.get('pending_amount', 0)))

                # Create or update [AUTO] DEBIT transaction
                existing_txn = RecoverableAssetTransaction.objects.filter(
                    recoverable_asset=instance,
                    is_active=True,
                    transaction_type='DEBIT',
                    remarks__startswith='[AUTO]',
                ).first()

                if pending > 0:
                    if existing_txn:
                        existing_txn.amount = pending
                        existing_txn.remarks = (
                            f'[AUTO] Pending fees: ₹{pending} '
                            f'(total: ₹{calc["total_fees"]}, paid: ₹{calc["total_paid"]})'
                        )
                        existing_txn.save()
                    else:
                        fy_start = (
                            instance.category.financial_year.start_date
                            if instance.category and instance.category.financial_year
                            else None
                        )
                        RecoverableAssetTransaction.objects.create(
                            recoverable_asset=instance,
                            transaction_type='DEBIT',
                            amount=pending,
                            transaction_date=fy_start,
                            source_type='MANUAL',
                            remarks=(
                                f'[AUTO] Pending fees: ₹{pending} '
                                f'(total: ₹{calc["total_fees"]}, paid: ₹{calc["total_paid"]})'
                            ),
                            created_by=request.user,
                        )
                elif existing_txn:
                    existing_txn.is_active = False
                    existing_txn.save(update_fields=['is_active'])

                _recalculate_closing_balance(instance)
            except Exception:
                pass  # Non-blocking

        return instance

class RecoverableAssetReadSerializer(serializers.ModelSerializer):
    particulars = serializers.SerializerMethodField()
    asset_type_display = serializers.SerializerMethodField()
    counterparty_type_display = serializers.SerializerMethodField()
    category_name = serializers.SerializerMethodField()
    category_code = serializers.ReadOnlyField(source='category.code', default='')
    bank_detail_name = serializers.ReadOnlyField(source='bank.bank_name', default=None)
    balance_sheet_classification = serializers.ReadOnlyField(source='category.balance_sheet_classification', default='LIABILITY')
    auto_pending_amount = serializers.SerializerMethodField()
    salary_advance_id = serializers.ReadOnlyField(source='salary_advance.id', default=None)

    class Meta:
        model = RecoverableAsset
        fields = [
            'id',
            'name',
            'asset_type',
            'asset_type_display',
            'category',
            'category_name',
            'category_code',
            'counterparty_type',
            'counterparty_type_display',
            'counterparty_name',
            'bank',
            'bank_detail_name',
            'bank_name',
            'account_number',
            'account_label',
            'linked_module',
            'salary_advance_id',
            'particulars',
            'opening_balance',
            'opening_balance_type',
            'closing_balance',
            'remarks',
            'status',
            'balance_sheet_classification',
            'pending_fees_config',
            'advance_fee_config',
            'auto_pending_amount',
        ]

    def get_asset_type_display(self, obj):
        return obj.get_asset_type_display() if obj.asset_type else None

    def get_counterparty_type_display(self, obj):
        return obj.get_counterparty_type_display() if obj.counterparty_type else None

    def get_category_name(self, obj):
        if obj.category_id and obj.category:
            return obj.category.name
        return obj.get_asset_type_display() if obj.asset_type else ''

    def get_auto_pending_amount(self, obj):
        if obj.linked_module == 'SUNDRY_DEBTORS' and obj.pending_fees_config:
            try:
                from apps.finance.services.pending_fees_calculator import calculate_pending_fees_for_asset
                calc = calculate_pending_fees_for_asset(obj)
                return calc.get('pending_amount', 0)
            except Exception:
                return None
        if obj.linked_module == 'ADVANCE_FEE' and obj.advance_fee_config:
            try:
                from apps.finance.services.advance_fee_calculator import calculate_advance_fees_for_asset
                calc = calculate_advance_fees_for_asset(obj)
                return calc.get('net_advance', 0)
            except Exception:
                return None
        return None

    def get_particulars(self, obj):
        if obj.asset_type in ['LOAN', 'ADVANCE', 'DEPOSIT']:
            type_label = obj.get_asset_type_display() if obj.asset_type else ''
            
            if obj.counterparty_name:
                base_name = obj.counterparty_name.strip()
                if obj.name and obj.name.strip() != obj.counterparty_name.strip():
                    base_name = f"{obj.counterparty_name.strip()}, {obj.name.strip()}"
            else:
                base_name = obj.name.strip() if obj.name else ''
            
            return f"{base_name} ({type_label})" if type_label else base_name

        elif obj.linked_module == 'STAFF_SALARY_ADVANCE' and obj.salary_advance:
            return obj.salary_advance.get_particulars()

        else:
            return obj.name or ''


class SalaryAdvanceReadSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    staff_employee_id = serializers.SerializerMethodField()
    advance_type = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    outstanding_balance = serializers.SerializerMethodField()
    total_recovered = serializers.SerializerMethodField()
    effective_recovery_amount = serializers.SerializerMethodField()
    display_status = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    overdue_amount = serializers.SerializerMethodField()
    start_month_display = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    total_interest_charged = serializers.SerializerMethodField()
    total_penalty_charged = serializers.SerializerMethodField()
    remaining_installments = serializers.SerializerMethodField()

    class Meta:
        model = SalaryAdvance
        fields = [
            'id',
            'name',
            'staff',
            'staff_name',
            'staff_employee_id',
            'advance_type',
            'purpose',
            'total_amount',
            'opening_balance',
            'opening_balance_type',
            'closing_balance',
            'outstanding_balance',
            'total_recovered',
            'monthly_recovery_amount',
            'effective_recovery_amount',
            'status',
            'display_status',
            'is_overdue',
            'overdue_amount',
            'start_month',
            'start_month_display',
            'tenure_months',
            'interest_rate',
            'interest_type',
            'emi_amount',
            'expected_end_date',
            'remaining_installments',
            'approved_on',
            'approved_by',
            'approved_by_name',
            'total_interest_charged',
            'total_penalty_charged',
            'penalty_rate',
            'auto_deduct_from_payroll',
            'deduction_priority',
            'remarks',
            'financial_year',
        ]

    def get_staff_name(self, obj):
        if obj.staff:
            return f"{obj.staff.first_name or ''} {obj.staff.middle_name or ''} {obj.staff.last_name or ''}".strip()
        return obj.name or ''

    def get_staff_employee_id(self, obj):
        if obj.staff:
            return getattr(obj.staff, 'employee_id', None) or getattr(obj.staff, 'emp_code', None)
        return None

    def get_advance_type(self, obj):
        return 'SALARY_ADVANCE'

    def get_outstanding_balance(self, obj):
        return obj.closing_balance or obj.opening_balance or 0

    def get_total_recovered(self, obj):
        from decimal import Decimal
        total_amount = obj.total_amount or obj.opening_balance or Decimal('0')
        outstanding = obj.closing_balance or Decimal('0')
        return max(total_amount - outstanding, Decimal('0'))

    def get_effective_recovery_amount(self, obj):
        return obj.emi_amount or obj.monthly_recovery_amount or 0

    def get_display_status(self, obj):
        from datetime import date
        
        if obj.status == 'CLOSED':
            return 'Fully Recovered'
        elif obj.status == 'CANCELLED':
            return 'Cancelled'
        
        outstanding = obj.closing_balance or obj.opening_balance or 0
        if outstanding <= 0:
            return 'Fully Recovered'
        
        if obj.start_month:
            today = date.today()
            if obj.start_month > today:
                return f"Starts {obj.start_month.strftime('%b %Y')}"
        
        return 'Recovery Pending'

    def get_is_overdue(self, obj):
        from datetime import date
        
        if obj.status in ('CLOSED', 'CANCELLED'):
            return False
        
        outstanding = obj.closing_balance or obj.opening_balance or 0
        if outstanding <= 0:
            return False
        
        if obj.expected_end_date and date.today() > obj.expected_end_date:
            return True
        
        return False

    def get_overdue_amount(self, obj):
        if not self.get_is_overdue(obj):
            return 0
        return obj.closing_balance or 0

    def get_start_month_display(self, obj):
        if obj.start_month:
            return obj.start_month.strftime('%b %Y')
        return None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            first_name = getattr(obj.approved_by, 'first_name', '')
            last_name = getattr(obj.approved_by, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            if name:
                return name
            return getattr(obj.approved_by, 'username', str(obj.approved_by))
        return None

    def get_total_interest_charged(self, obj):
        from decimal import Decimal
        return obj.salary_advance_transaction_salary_advance.filter(
            is_active=True, 
            transaction_type='INTEREST'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0')

    def get_total_penalty_charged(self, obj):
        from decimal import Decimal
        return obj.salary_advance_transaction_salary_advance.filter(
            is_active=True, 
            transaction_type='PENALTY'
        ).aggregate(
            total=models.Sum('amount')
        )['total'] or Decimal('0')

    def get_remaining_installments(self, obj):
        if not obj.tenure_months:
            return None
        recovery_count = obj.salary_advance_transaction_salary_advance.filter(
            is_active=True,
            transaction_type__in=['RECOVERY', 'CREDIT']
        ).count()
        remaining = obj.tenure_months - recovery_count
        return max(remaining, 0)


class SalaryAdvanceSerializer(serializers.ModelSerializer):
    """Write serializer for SalaryAdvance CRUD."""

    class Meta:
        model = SalaryAdvance
        fields = '__all__'

    def create(self, validated_data):
        request = self.context['request']
        validated_data['created_by'] = request.user
        if 'closing_balance' not in validated_data:
            validated_data['closing_balance'] = validated_data.get('opening_balance', 0)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context['request']
        validated_data['updated_by'] = request.user
        return super().update(instance, validated_data)


class SalaryAdvanceTransactionSerializer(serializers.ModelSerializer):
    """Write serializer for SalaryAdvanceTransaction CRUD."""
    salary_advance = serializers.PrimaryKeyRelatedField(
        queryset=SalaryAdvance.objects.all(),
        required=False
    )

    class Meta:
        model = SalaryAdvanceTransaction
        fields = [
            'id', 'salary_advance', 'transaction_date', 'transaction_type',
            'amount', 'remarks', 'is_active'
        ]

    def to_internal_value(self, data):
        if isinstance(data, dict) and 'transaction_date' in data:
            td = data['transaction_date']
            if isinstance(td, str) and 'T' in td:
                data = data.copy()
                data['transaction_date'] = td.split('T')[0]
        return super().to_internal_value(data)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value

    def validate(self, data):
        sa = data.get('salary_advance')
        if not sa:
            raise serializers.ValidationError({"salary_advance": "This field is required."})
        if not sa.is_active:
            raise serializers.ValidationError("Cannot add transaction to inactive salary advance")
        return data

    def create(self, validated_data):
        request = self.context['request']
        validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        instance.salary_advance.recalculate_closing_balance()
        return instance

    def update(self, instance, validated_data):
        request = self.context['request']
        instance = super().update(instance, validated_data)
        instance.salary_advance.recalculate_closing_balance()
        return instance


class SalaryAdvanceTransactionReadSerializer(serializers.ModelSerializer):
    salary_advance_name = serializers.ReadOnlyField(source='salary_advance.name')
    credit_amount = serializers.SerializerMethodField()
    debit_amount = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = SalaryAdvanceTransaction
        fields = [
            'id', 'salary_advance', 'salary_advance_name',
            'transaction_date', 'transaction_type', 'amount',
            'credit_amount', 'debit_amount',
            'source_type', 'adjustment_reason',
            'remarks', 'is_active',
            'created_by', 'created_by_name', 'created_at'
        ]

    def get_credit_amount(self, obj):
        return obj.amount if obj.is_credit_type() else None

    def get_debit_amount(self, obj):
        return obj.amount if obj.is_debit_type() else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            first_name = getattr(obj.created_by, 'first_name', '')
            last_name = getattr(obj.created_by, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            if name:
                return name
            return getattr(obj.created_by, 'username', str(obj.created_by))
        return None

class RecoverableAssetHistoryReadSerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    transaction_id = serializers.ReadOnlyField(source='recoverable_asset_transaction.id')
    is_transaction_history = serializers.SerializerMethodField()

    class Meta:
        model = RecoverableAssetHistory
        fields = [
            'id', 'transaction_id', 'is_transaction_history',
            'action', 'previous_data', 'new_data',
            'performed_by', 'performed_by_name', 'performed_at'
        ]

    def get_is_transaction_history(self, obj):
        return obj.recoverable_asset_transaction is not None

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            first_name = getattr(obj.performed_by, 'first_name', '')
            last_name = getattr(obj.performed_by, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            if name:
                return name
            return getattr(obj.performed_by, 'username', str(obj.performed_by))
        return None


def _compute_actual_bank_balance(bank, up_to_date=None):

    balance = Decimal(str(bank.opening_balance))

    bt_qs = BankTransaction.objects.filter(bank=bank, is_active=True)
    if up_to_date:
        bt_qs = bt_qs.filter(date__lte=up_to_date)
    for txn in bt_qs:
        if txn.is_deposit:
            balance += Decimal(str(txn.amount))
        else:
            balance -= Decimal(str(txn.amount))

    dw_qs = DepositWithdrawRecord.objects.filter(
        Q(bank_from=bank) | Q(bank_to=bank), is_active=True
    )
    if up_to_date:
        dw_qs = dw_qs.filter(date__lte=up_to_date)
    for dw in dw_qs:
        if dw.bank_to_id == bank.id:
            balance += Decimal(str(dw.amount))
        if dw.bank_from_id == bank.id:
            balance -= Decimal(str(dw.amount))

    return balance


def recalculate_asset_closing_balance(asset):

    logger = logging.getLogger(__name__)

    try:
        if asset.linked_module == 'BANK_ACCOUNT' and asset.bank:
            new_closing_balance = _compute_actual_bank_balance(asset.bank)
        else:
            txn_agg = asset.recoverable_asset_transaction_recoverable_asset.filter(is_active=True).aggregate(
                total_debit=Sum(
                    Case(
                        When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                        default=Decimal('0.00'),
                        output_field=DecimalField()
                    )
                ),
                total_credit=Sum(
                    Case(
                        When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                        default=Decimal('0.00'),
                        output_field=DecimalField()
                    )
                )
            )

            total_debit = txn_agg['total_debit'] or Decimal('0.00')
            total_credit = txn_agg['total_credit'] or Decimal('0.00')

            opening_balance = asset.opening_balance
            ob_type = getattr(asset, 'opening_balance_type', 'DEBIT') or 'DEBIT'

            if ob_type == 'CREDIT':
                new_closing_balance = opening_balance + total_credit - total_debit
            else:
                new_closing_balance = opening_balance + total_debit - total_credit

        if asset.closing_balance != new_closing_balance:
            asset.closing_balance = new_closing_balance
            asset.save(update_fields=['closing_balance', 'updated_at'])
            logger.info(
                f"Updated closing_balance for RecoverableAsset {asset.id} ({asset.name}): "
                f"new_closing={new_closing_balance}"
            )
    except Exception as e:
        logger.error(
            f"Error recalculating closing_balance for RecoverableAsset {asset.id}: {str(e)}",
            exc_info=True
        )


class RecoverableAssetTransactionSerializer(serializers.ModelSerializer):
    recoverable_asset = serializers.PrimaryKeyRelatedField(
        queryset=RecoverableAsset.objects.all(),
        required=False
    )
    
    class Meta:
        model = RecoverableAssetTransaction
        fields = [
            'id', 'recoverable_asset', 'transaction_date', 'transaction_type',
            'amount', 'remarks', 'is_active'
        ]

    def to_internal_value(self, data):
        """Pre-process ISO datetime strings before DRF field validation."""
        if isinstance(data, dict) and 'transaction_date' in data:
            td = data['transaction_date']
            if isinstance(td, str) and 'T' in td:
                data = data.copy()
                data['transaction_date'] = td.split('T')[0]
        return super().to_internal_value(data)

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than 0")
        return value

    def validate(self, data):
        recoverable_asset = data.get('recoverable_asset')
        if not recoverable_asset:
            raise serializers.ValidationError({"recoverable_asset": "This field is required."})
        if not recoverable_asset.is_active:
            raise serializers.ValidationError("Cannot add transaction to inactive asset")
        return data

    def create(self, validated_data):
        request = self.context['request']
        validated_data['created_by'] = request.user
        instance = super().create(validated_data)
        
        RecoverableAssetHistory.objects.create(
            recoverable_asset=instance.recoverable_asset,
            recoverable_asset_transaction=instance,
            action='CREATE',
            new_data=SharedService._model_to_dict(instance),
            performed_by=request.user
        )

        recalculate_asset_closing_balance(instance.recoverable_asset)
        
        return instance

    def update(self, instance, validated_data):
        request = self.context['request']
        previous_data = SharedService._model_to_dict(instance)
        
        instance = super().update(instance, validated_data)
        
        RecoverableAssetHistory.objects.create(
            recoverable_asset=instance.recoverable_asset,
            recoverable_asset_transaction=instance,
            action='UPDATE',
            previous_data=previous_data,
            new_data=SharedService._model_to_dict(instance),
            performed_by=request.user
        )

        recalculate_asset_closing_balance(instance.recoverable_asset)
        
        return instance


class RecoverableAssetTransactionReadSerializer(serializers.ModelSerializer):
    recoverable_asset_name = serializers.ReadOnlyField(source='recoverable_asset.name')
    credit_amount = serializers.SerializerMethodField()
    debit_amount = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RecoverableAssetTransaction
        fields = [
            'id', 'recoverable_asset', 'recoverable_asset_name',
            'transaction_date', 'transaction_type', 'amount',
            'credit_amount', 'debit_amount',
            'remarks', 'is_active',
            'created_by', 'created_by_name', 'created_at'
        ]

    def get_credit_amount(self, obj):
        return obj.amount if obj.is_credit_type() else None

    def get_debit_amount(self, obj):
        return obj.amount if obj.is_debit_type() else None

    def get_created_by_name(self, obj):
        if obj.created_by:
            first_name = getattr(obj.created_by, 'first_name', '')
            last_name = getattr(obj.created_by, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            if name:
                return name
            return getattr(obj.created_by, 'username', str(obj.created_by))
        return None


class FeeMismatchReconciliationLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeMismatchReconciliationLog
        fields = '__all__'

class FeeMismatchReconciliationLogReadSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    student_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    original_student_group_name = serializers.ReadOnlyField(source='original_student_group.name')
    new_student_group_name = serializers.ReadOnlyField(source='new_student_group.name')
    academic_year_value = serializers.SerializerMethodField()
    reconciled_by_name = serializers.SerializerMethodField()
    payment_changes = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        if obj.student:
            return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)
        return ''

    def get_academic_year_value(self, obj):
        if obj.academic_year:
            return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'
        return ''

    def get_reconciled_by_name(self, obj):
        if obj.reconciled_by and obj.reconciled_by.staff:
            return get_full_name(obj.reconciled_by.staff.first_name, obj.reconciled_by.staff.middle_name, obj.reconciled_by.staff.last_name)
        return ''

    def get_payment_changes(self, obj):
        changes = obj.payment_changes.all()
        return [{
            'id': c.id,
            'payment_detail_id': c.payment_detail_id,
            'old_fee_plan_id': c.old_fee_plan_id,
            'new_fee_plan_id': c.new_fee_plan_id,
            'old_fee_plan_name': c.old_fee_plan_name,
            'new_fee_plan_name': c.new_fee_plan_name,
            'old_standard_fee_id': c.old_standard_fee_id,
            'new_standard_fee_id': c.new_standard_fee_id,
            'amount_paid': c.amount_paid
        } for c in changes]

    class Meta:
        model = FeeMismatchReconciliationLog
        fields = '__all__'



class BalanceSheetLockHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    financial_year_name = serializers.SerializerMethodField()

    class Meta:
        from apps.finance.models.balance_sheet_lock_history import BalanceSheetLockHistory
        model = BalanceSheetLockHistory
        fields = [
            'id', 'financial_year', 'financial_year_name',
            'action', 'performed_by', 'performed_by_name',
            'performed_on', 'remarks', 'entry_count', 'details'
        ]

    def get_performed_by_name(self, obj):
        if obj.performed_by:
            first_name = getattr(obj.performed_by, 'first_name', '')
            last_name = getattr(obj.performed_by, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            if name:
                return name
            return getattr(obj.performed_by, 'username', str(obj.performed_by))
        return 'Unknown'

    def get_financial_year_name(self, obj):
        fy = obj.financial_year
        if fy:
            return f"{fy.start_date.year}-{fy.end_date.year}"
        return ''

class RecoverableAssetCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = RecoverableAssetCategory
        fields = '__all__'

    def validate(self, data):
        SharedService.check_mandatory_field_in_list(['code', 'name'], data)
        return data

    def create(self, validated_data):
        request = self.context.get('request')
        if request:
            validated_data['created_by'] = request.user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)


class RecoverableAssetCategoryReadSerializer(serializers.ModelSerializer):
    asset_count = serializers.SerializerMethodField()
    is_fy_locked = serializers.SerializerMethodField()

    class Meta:
        model = RecoverableAssetCategory
        fields = [
            'id', 'code', 'name', 'description',
            'asset_types',
            'balance_sheet_classification',
            'financial_year', 'is_fy_locked',
            'is_active', 'display_order',
            'asset_count',
            'created_at', 'updated_at',
        ]

    def get_asset_count(self, obj):
        return obj.recoverable_asset_category.filter(is_active=True).count()

    def get_is_fy_locked(self, obj):
        if obj.financial_year:
            return obj.financial_year.is_locked
        return False


class StaffWalletSerializer(serializers.ModelSerializer):

    class Meta:
        model = StaffWallet
        fields = '__all__'


class StaffWalletReadSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    user_id = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        if obj.staff:
            return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
        return ''

    def get_user_id(self, obj):
        try:
            return obj.staff.users.id
        except Exception:
            return None

    class Meta:
        model = StaffWallet
        fields = '__all__'

class FeeAdvanceTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeAdvanceType
        fields = ['id', 'name', 'code', 'is_active', 'created', 'modified']


class FeeAdvanceCollectionPaymentDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeAdvanceCollectionPaymentDetail
        fields = ['id', 'fee_advance_collection', 'amount', 'fee_plan', 'created', 'modified']


class FeeAdvanceCollectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeeAdvanceCollection
        fields = [
            'id', 'fee_advance_type', 'amount', 'academic_year', 'student', 'is_active',
            'transaction_date', 'receipt_num', 'payment_ref_num', 'mode_of_payment', 'payment_note',
            'bank_detail',
            'created', 'modified',
        ]


class FeeAdvanceCollectionReadSerializer(serializers.ModelSerializer):
    fee_advance_type = FeeAdvanceTypeSerializer(read_only=True)

    class Meta:
        model = FeeAdvanceCollection
        fields = [
            'id', 'fee_advance_type', 'amount', 'academic_year', 'student', 'is_active',
            'transaction_date', 'receipt_num', 'payment_ref_num', 'mode_of_payment', 'payment_note',
            'bank_detail',
            'created', 'modified',
        ]