from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db import transaction
from decimal import Decimal
from django.db.models import Sum

from apps.asset.models import AssetGroup, Asset, AssetDepreciationSnapshot, AssetDisposal, AssetCostMovement, AssetSnapshotLockHistory
from apps.asset.services.asset_cost import (
    validate_asset_creation_fy, get_financial_year_for_date,
    create_opening_cost_entry, create_disposal_cost_entry
)
from apps.tenants.services.middlewares import get_current_db_name

def get_safe_user_name(user):
    if not user:
        return None
    try:
        if hasattr(user, 'get_full_name') and callable(user.get_full_name):
            return user.get_full_name()
        
        first_name = getattr(user, 'first_name', '')
        last_name = getattr(user, 'last_name', '')
        if first_name or last_name:
            return f"{first_name} {last_name}".strip()
            
        return getattr(user, 'username', str(user))
    except Exception:
        return str(user)


class AssetGroupSerializer(serializers.ModelSerializer):
    parent_group_name = serializers.ReadOnlyField(source='parent_group.name')
    full_path = serializers.SerializerMethodField()
    has_children = serializers.SerializerMethodField()
    is_depreciable = serializers.SerializerMethodField()

    class Meta:
        model = AssetGroup
        exclude = ['created', 'modified']

    def get_full_path(self, obj):
        path = obj.get_hierarchy_path()
        return ' → '.join(path)

    def get_has_children(self, obj):
        return obj.asset_group_parent_group.filter(is_active=True).exists()

    def get_is_depreciable(self, obj):
        return obj.is_depreciable

    def validate_parent_group(self, value):
        if value and self.instance:
            if value.id == self.instance.id:
                raise ValidationError("Asset group cannot be its own parent.")
            children = self.instance.get_all_children()
            if value in children:
                raise ValidationError("Cannot set a child group as parent (circular reference).")
        return value

    def validate(self, data):
        method = data.get('depreciation_method', getattr(self.instance, 'depreciation_method', 'SLM'))
        useful_life = data.get('useful_life_years', getattr(self.instance, 'useful_life_years', None))
        rate = data.get('depreciation_rate', getattr(self.instance, 'depreciation_rate', None))

        if method == 'SLM':
            if not useful_life or useful_life <= 0:
                raise ValidationError({"useful_life_years": "Useful life is required for Straight Line Method."})
        elif method == 'WDV':
            if not rate or rate <= 0:
                raise ValidationError({"depreciation_rate": "Depreciation rate is required for Written Down Value method."})
        elif method == 'NONE':
            if rate is not None:
                data['depreciation_rate'] = None

        return data

    def _check_has_children(self, instance):
        return instance.asset_group_parent_group.filter(is_active=True).exists()

    def _check_has_assets(self, instance):
        return instance.asset_asset_group.filter(is_active=True).exists()


class AssetGroupTreeSerializer(serializers.ModelSerializer):
    children = serializers.SerializerMethodField()
    total_assets = serializers.SerializerMethodField()
    is_depreciable = serializers.SerializerMethodField()

    class Meta:
        model = AssetGroup
        fields = [
            'id', 'name', 'code', 'group_type', 'financial_year', 'depreciation_method', 'useful_life_years',
            'depreciation_rate', 'is_depreciable', 'display_order', 'children', 'total_assets'
        ]

    def get_children(self, obj):
        children = obj.asset_group_parent_group.filter(is_active=True)
        return AssetGroupTreeSerializer(children, many=True).data

    def get_total_assets(self, obj):
        return obj.asset_asset_group.filter(is_active=True).count()

    def get_is_depreciable(self, obj):
        return obj.is_depreciable


class AssetGroupSummarySerializer(serializers.Serializer):
    asset_group_id = serializers.IntegerField()
    asset_group_name = serializers.CharField()
    parent_group_name = serializers.CharField(allow_null=True)
    opening_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    additions = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_value = serializers.DecimalField(max_digits=15, decimal_places=2)


class AssetSerializer(serializers.ModelSerializer):

    class Meta:
        model = Asset
        exclude = ['created', 'modified']

    def validate_asset_group(self, value):
        if value and value.asset_group_parent_group.filter(is_active=True).exists():
            raise ValidationError(
                "Assets can only be assigned to leaf groups (groups without children). "
                f"'{value.name}' has child groups."
            )
        return value

    def validate(self, data):
        original_cost = data.get('original_cost', getattr(self.instance, 'original_cost', 0))
        salvage_value = data.get('salvage_value', getattr(self.instance, 'salvage_value', 0))
        if salvage_value > original_cost:
            raise ValidationError({"salvage_value": "Salvage value cannot exceed original cost."})
        
        purchase_date = data.get('purchase_date', getattr(self.instance, 'purchase_date', None))
        put_to_use_date = data.get('put_to_use_date')
        if put_to_use_date and purchase_date and put_to_use_date < purchase_date:
            raise ValidationError({"put_to_use_date": "Put to use date cannot be before purchase date."})
        
        return data

    def create(self, validated_data):
        
        with transaction.atomic(using=get_current_db_name()):
            purchase_date = validated_data.get('purchase_date')
            if purchase_date:
                validate_asset_creation_fy(purchase_date)
            
            asset = super().create(validated_data)
            
            financial_year = get_financial_year_for_date(asset.purchase_date)
            if financial_year:
                try:
                    create_opening_cost_entry(
                        asset=asset,
                        financial_year=financial_year,
                        amount=asset.original_cost,
                        opening_source='MIGRATED',
                        opening_reference=f"Initial cost at asset creation on {asset.purchase_date}"
                    )
                except Exception:
                    pass
            
            return asset

    def update(self, instance, validated_data):
        if instance.status == 'DISPOSED':
            raise ValidationError("Cannot modify a disposed asset.")
        
        with transaction.atomic(using=get_current_db_name()):
            return super().update(instance, validated_data)


class AssetReadSerializer(serializers.ModelSerializer):
    asset_group_name = serializers.ReadOnlyField(source='asset_group.name')
    depreciation_method = serializers.ReadOnlyField(source='asset_group.depreciation_method')
    effective_useful_life = serializers.SerializerMethodField()
    has_disposal = serializers.SerializerMethodField()
    bank_name = serializers.ReadOnlyField(source='bank.bank_name', default=None)
    current_cost = serializers.SerializerMethodField()
    is_locked_for_active_fy = serializers.SerializerMethodField()

    class Meta:
        model = Asset
        fields = [
            'id', 'asset_code', 'asset_name', 'asset_group', 'asset_group_name',
            'purchase_date', 'put_to_use_date', 'capitalization_date',
            'original_cost', 'current_cost', 'salvage_value', 'useful_life_years', 'effective_useful_life',
            'location', 'status', 'remarks', 'is_fully_depreciated', 'is_active',
            'depreciation_method', 'has_disposal', 'bank', 'bank_name', 'created', 'modified',
            'is_locked_for_active_fy', 'expense_id'
        ]

    def get_effective_useful_life(self, obj):
        return obj.get_effective_useful_life()

    def get_has_disposal(self, obj):
        return hasattr(obj, 'asset_disposal_asset')

    def get_current_cost(self, obj):
        additions = obj.asset_cost_movement_asset.filter(
            movement_type='ADDITION'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        return obj.original_cost + additions

    def get_is_locked_for_active_fy(self, obj):
        request = self.context.get('request')
        fy_id = request.query_params.get('financial_year') if request else None

        if fy_id:
            return obj.asset_depreciation_snapshot_asset.filter(
                financial_year_id=fy_id,
                is_locked=True
            ).exists()

        return obj.asset_depreciation_snapshot_asset.filter(
            financial_year__is_active=True,
            is_locked=True
        ).exists()



class AssetDepreciationSnapshotSerializer(serializers.ModelSerializer):

    class Meta:
        model = AssetDepreciationSnapshot
        exclude = ['created', 'modified', 'calculated_on']
        read_only_fields = ['is_locked', 'locked_on', 'locked_by']

    def validate(self, data):
        if self.instance and self.instance.is_locked:
            raise ValidationError("Cannot modify a locked depreciation snapshot.")
        return data


class AssetDepreciationSnapshotReadSerializer(serializers.ModelSerializer):
    asset_code = serializers.ReadOnlyField(source='asset.asset_code')
    asset_name = serializers.ReadOnlyField(source='asset.asset_name')
    asset_group_name = serializers.ReadOnlyField(source='asset.asset_group.name')
    financial_year_name = serializers.SerializerMethodField()
    locked_by_name = serializers.SerializerMethodField()
    unlocked_by_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetDepreciationSnapshot
        fields = [
            'id', 'asset', 'asset_code', 'asset_name', 'asset_group_name',
            'financial_year', 'financial_year_name',
            'opening_value', 'additions', 'depreciation_amount', 'closing_value',
            'depreciation_basis', 'calculation_method', 'months_depreciated',
            'is_manual_depreciation', 'original_calculation_method',
            'is_locked', 'locked_on', 'locked_by', 'locked_by_name',
            'unlocked_on', 'unlocked_by', 'unlocked_by_name',
            'calculated_on', 'created'
        ]

    def get_financial_year_name(self, obj):
        fy = obj.financial_year
        return f"{fy.start_date.year}-{fy.end_date.year}"

    def get_locked_by_name(self, obj):
        return get_safe_user_name(obj.locked_by)

    def get_unlocked_by_name(self, obj):
        return get_safe_user_name(obj.unlocked_by)


class DepreciationPreviewSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField()
    asset_code = serializers.CharField()
    asset_name = serializers.CharField()
    asset_group_name = serializers.CharField()
    financial_year_id = serializers.IntegerField()
    financial_year_name = serializers.CharField()
    opening_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    additions = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation_basis = serializers.CharField()
    calculation_method = serializers.CharField()
    months_depreciated = serializers.IntegerField()
    is_first_year = serializers.BooleanField()
    is_fully_depreciated = serializers.BooleanField()
    is_manual_depreciation = serializers.BooleanField(default=False)


class SnapshotLockHistorySerializer(serializers.ModelSerializer):
    performed_by_name = serializers.SerializerMethodField()
    financial_year_name = serializers.SerializerMethodField()

    class Meta:
        model = AssetSnapshotLockHistory
        fields = [
            'id', 'financial_year', 'financial_year_name', 'action',
            'performed_by', 'performed_by_name', 'performed_on',
            'remarks', 'snapshot_count', 'details'
        ]

    def get_performed_by_name(self, obj):
        return get_safe_user_name(obj.performed_by)

    def get_financial_year_name(self, obj):
        fy = obj.financial_year
        return f"{fy.start_date.year}-{fy.end_date.year}"


class SnapshotEditSerializer(serializers.Serializer):
    snapshot_id = serializers.IntegerField()
    depreciation_amount = serializers.DecimalField(max_digits=15, decimal_places=2)


class AssetDisposalSerializer(serializers.ModelSerializer):

    class Meta:
        model = AssetDisposal
        exclude = ['created', 'modified']
        read_only_fields = ['gain_loss']

    def validate_asset(self, value):
        if hasattr(value, 'asset_disposal_asset'):
            raise ValidationError("This asset is already disposed.")
        return value

    def validate(self, data):
        asset = data.get('asset', getattr(self.instance, 'asset', None))
        disposal_date = data.get('disposal_date')
        reason = data.get('reason', getattr(self.instance, 'reason', 'SOLD'))
        disposal_value = data.get('disposal_value', getattr(self.instance, 'disposal_value', 0))
        remarks = data.get('remarks', getattr(self.instance, 'remarks', None))
        
        if asset and disposal_date and disposal_date < asset.purchase_date:
            raise ValidationError({"disposal_date": "Disposal date cannot be before purchase date."})
        
        if reason == 'SOLD' and disposal_value <= 0:
            raise ValidationError({"disposal_value": "Disposal value must be greater than zero for sold assets."})
        
        zero_value_reasons = ['DONATED', 'WRITTEN_OFF', 'LOST']
        if reason in zero_value_reasons:
            if disposal_value > 0:
                raise ValidationError({"disposal_value": "Disposal value must be zero for this disposal type."})
            if not remarks or not remarks.strip():
                raise ValidationError({"remarks": "Remarks are mandatory for this disposal type."})
        
        if reason == 'OTHER' and (not remarks or not remarks.strip()):
            raise ValidationError({"remarks": "Remarks are mandatory for 'Other' disposal type."})
        
        return data

    def create(self, validated_data):
        
        asset = validated_data.get('asset')
        disposal_date = validated_data.get('disposal_date')
        disposal_value = validated_data.get('disposal_value', Decimal('0'))
        credit_to = validated_data.get('credit_to', 'NONE')
        credit_bank = validated_data.get('credit_bank')
        
        wdv_at_disposal = asset.original_cost
        latest_snapshot = asset.asset_depreciation_snapshot_asset.order_by('-financial_year__start_date').first()
        if latest_snapshot:
            wdv_at_disposal = latest_snapshot.closing_value
        validated_data['wdv_at_disposal'] = wdv_at_disposal
        
        with transaction.atomic(using=get_current_db_name()):
            disposal = super().create(validated_data)
            
            financial_year = get_financial_year_for_date(disposal_date) if disposal_date else None
            if financial_year:
                try:
                    create_disposal_cost_entry(
                        asset=asset,
                        financial_year=financial_year,
                        disposal_date=disposal_date,
                        remarks=validated_data.get('remarks', '')
                    )
                except Exception:
                    pass
            
            # Create credit transaction if disposal has value and credit_to is set
            if disposal_value > 0 and credit_to != 'NONE':
                request = self.context.get('request')
                user = request.user if request else None
                
                if credit_to == 'BANK' and credit_bank:
                    # Create BankTransaction as credit (deposit) to the selected bank
                    from apps.finance.models.bankTransaction import BankTransaction, BankDetail
                    # Resolve to the FY-specific bank record (carry-forward creates
                    # separate BankDetail per FY, so we must use the correct one)
                    target_bank = credit_bank
                    if financial_year:
                        fy_bank = BankDetail.objects.filter(
                            is_active=True,
                            financial_year=financial_year,
                            account_num=credit_bank.account_num,
                            bank_name=credit_bank.bank_name,
                        ).first()
                        if fy_bank:
                            target_bank = fy_bank
                    # Compute balance from last active transaction (or opening_balance)
                    last_txn = BankTransaction.objects.filter(
                        is_active=True, bank=target_bank
                    ).order_by('created').last()
                    prev_balance = last_txn.balance if last_txn else float(target_bank.opening_balance)
                    new_balance = float(prev_balance) + float(disposal_value)
                    BankTransaction.objects.create(
                        date=disposal_date,
                        bank=target_bank,
                        is_deposit=True,  # Credit / deposit
                        amount=float(disposal_value),
                        balance=new_balance,
                        ref_number=f'DISP-{asset.asset_code}',
                        particulars=f'Asset Disposal: {asset.asset_name} ({asset.asset_code})',
                        staff=user.staff if user and hasattr(user, 'staff') else None,
                    )
                
                elif credit_to == 'CASH':
                    # Create DepositWithdrawRecord as deposit to logged-in user's cash-in-hand
                    from apps.finance.models.deposit import DepositWithdrawRecord
                    DepositWithdrawRecord.objects.create(
                        date=disposal_date,
                        transaction_type=1,  # deposit
                        transaction_from=3,   # Expenses / Asset disposal
                        amount=float(disposal_value),
                        reason=f'Asset Disposal: {asset.asset_name} ({asset.asset_code})',
                        created_by=user,
                        financial_year_id=financial_year.id if financial_year else None,
                        user_to=user,
                    )
            
            asset.status = 'DISPOSED'
            asset.save()
            
            return disposal


class AssetDisposalReadSerializer(serializers.ModelSerializer):
    asset_code = serializers.ReadOnlyField(source='asset.asset_code')
    asset_name = serializers.ReadOnlyField(source='asset.asset_name')
    asset_group_name = serializers.ReadOnlyField(source='asset.asset_group.name')
    original_cost = serializers.ReadOnlyField(source='asset.original_cost')
    credit_bank_name = serializers.ReadOnlyField(source='credit_bank.bank_name', default=None)

    class Meta:
        model = AssetDisposal
        fields = [
            'id', 'asset', 'asset_code', 'asset_name', 'asset_group_name',
            'original_cost', 'disposal_date', 'disposal_value', 'wdv_at_disposal',
            'gain_loss', 'reason', 'credit_to', 'credit_bank', 'credit_bank_name',
            'remarks', 'created'
        ]


class FixedAssetRegisterSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField()
    asset_code = serializers.CharField()
    asset_name = serializers.CharField()
    asset_group_name = serializers.CharField()
    purchase_date = serializers.DateField()
    put_to_use_date = serializers.DateField()
    original_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    opening_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    additions = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    location = serializers.CharField(allow_null=True)
    status = serializers.CharField()


class DepreciationScheduleSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField()
    asset_code = serializers.CharField()
    asset_name = serializers.CharField()
    financial_year_name = serializers.CharField()
    opening_wdv = serializers.DecimalField(max_digits=15, decimal_places=2)
    depreciation = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_wdv = serializers.DecimalField(max_digits=15, decimal_places=2)
    calculation_method = serializers.CharField()

class AssetCostMovementSerializer(serializers.ModelSerializer):

    class Meta:
        model = AssetCostMovement
        exclude = ['created', 'modified']
        extra_kwargs = {
            'financial_year': {'required': False}
        }

    def validate(self, data):
        movement_type = data.get('movement_type', getattr(self.instance, 'movement_type', None))
        opening_source = data.get('opening_source', getattr(self.instance, 'opening_source', None))

        if movement_type == 'OPENING' and not opening_source:
            raise ValidationError({
                'opening_source': 'Opening source is required for OPENING movement type.'
            })

        financial_year = data.get('financial_year', getattr(self.instance, 'financial_year', None))
        if not financial_year:
            movement_date = data.get('movement_date', getattr(self.instance, 'movement_date', None))
            if movement_date:
                financial_year = get_financial_year_for_date(movement_date)
                if not financial_year:
                    raise ValidationError({'movement_date': 'No active financial year found for this date.'})
                data['financial_year'] = financial_year

        if financial_year:
            if AssetDepreciationSnapshot.objects.filter(
                financial_year=financial_year,
                is_locked=True
            ).exists():
                raise ValidationError(
                    "Cannot create or modify cost movements for a locked financial year."
                )

        return data


class AssetCostMovementReadSerializer(serializers.ModelSerializer):

    asset_code = serializers.ReadOnlyField(source='asset.asset_code')
    asset_name = serializers.ReadOnlyField(source='asset.asset_name')
    asset_group_name = serializers.ReadOnlyField(source='asset.asset_group.name')
    financial_year_name = serializers.SerializerMethodField()
    movement_type_display = serializers.SerializerMethodField()
    opening_source_display = serializers.SerializerMethodField()

    class Meta:
        model = AssetCostMovement
        fields = [
            'id', 'asset', 'asset_code', 'asset_name', 'asset_group_name',
            'financial_year', 'financial_year_name',
            'movement_type', 'movement_type_display',
            'amount', 'movement_date',
            'opening_source', 'opening_source_display', 'opening_reference',
            'remarks', 'created'
        ]

    def get_financial_year_name(self, obj):
        fy = obj.financial_year
        return f"{fy.start_date.year}-{fy.end_date.year}"

    def get_movement_type_display(self, obj):
        return obj.get_movement_type_display()

    def get_opening_source_display(self, obj):
        if obj.opening_source:
            return obj.get_opening_source_display()
        return None

class FixedAssetCostRegisterSerializer(serializers.Serializer):
    asset_id = serializers.IntegerField()
    asset_code = serializers.CharField()
    asset_name = serializers.CharField()
    asset_group_id = serializers.IntegerField()
    asset_group_name = serializers.CharField()
    purchase_date = serializers.DateField()
    opening_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    additions = serializers.DecimalField(max_digits=15, decimal_places=2)
    disposals = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    status = serializers.CharField()


class AssetGroupCostSummarySerializer(serializers.Serializer):
    asset_group_id = serializers.IntegerField()
    asset_group_name = serializers.CharField()
    parent_group_name = serializers.CharField(allow_null=True)
    hierarchy_path = serializers.CharField()
    opening_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    additions = serializers.DecimalField(max_digits=15, decimal_places=2)
    disposals = serializers.DecimalField(max_digits=15, decimal_places=2)
    closing_cost = serializers.DecimalField(max_digits=15, decimal_places=2)
    is_fy_locked = serializers.BooleanField()


class AssetDashboardGroupSerializer(serializers.ModelSerializer):
    parent_group_name = serializers.ReadOnlyField(source='parent_group.name')
    asset_count = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=15, decimal_places=2)

    class Meta:
        model = AssetGroup
        fields = ['id', 'name', 'parent_group_name', 'depreciation_method', 'asset_count', 'total_value']

