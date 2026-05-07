from datetime import datetime, date as date_only
from decimal import Decimal, ROUND_HALF_UP
from django.db import transaction
from django.db.models import Sum
from rest_framework import exceptions

from apps.asset.models import (
    Asset, AssetDepreciationSnapshot, AssetSnapshotLockHistory
)

from apps.asset.serializers import AssetDepreciationSnapshotReadSerializer
from apps.institutes.models.financialyear import FinancialYear
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name


def _get_safe_name(user):
    if not user:
        return None
    try:
        if hasattr(user, 'get_full_name'):
            return user.get_full_name()
        
        first = getattr(user, 'first_name', '')
        last = getattr(user, 'last_name', '')
        if first or last:
            return f"{first} {last}".strip()
            
        return getattr(user, 'username', str(user))
    except (AttributeError, TypeError):
        return str(user)



def calculate_slm_depreciation(original_cost, salvage_value, useful_life_years, months=12):

    if useful_life_years <= 0:
        return Decimal('0.00')
    
    annual_depreciation = (original_cost - salvage_value) / Decimal(useful_life_years)
    pro_rata_depreciation = annual_depreciation * Decimal(months) / Decimal(12)
    
    return pro_rata_depreciation.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def calculate_wdv_depreciation(opening_value, depreciation_rate, salvage_value, months=12):

    if not depreciation_rate or depreciation_rate <= 0:
        return Decimal('0.00')
    
    rate = depreciation_rate / Decimal(100)
    annual_depreciation = opening_value * rate
    pro_rata_depreciation = annual_depreciation * Decimal(months) / Decimal(12)
    
    max_depreciation = opening_value - salvage_value
    if pro_rata_depreciation > max_depreciation:
        pro_rata_depreciation = max(max_depreciation, Decimal('0.00'))
    
    return pro_rata_depreciation.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def get_months_in_fy(asset, financial_year):

    fy_start = financial_year.start_date
    fy_end = financial_year.end_date
    put_to_use = asset.put_to_use_date or asset.purchase_date
    
    disposal_date = None
    if hasattr(asset, 'asset_disposal_asset') and asset.asset_disposal_asset:
        disposal_date = asset.asset_disposal_asset.disposal_date
    
    start_date = max(put_to_use, fy_start)
    end_date = fy_end
    
    if disposal_date and fy_start <= disposal_date <= fy_end:
        end_date = disposal_date
    
    if start_date > fy_end:
        return 0
    
    if disposal_date and disposal_date < fy_start:
        return 0
    
    start_month = start_date.month if start_date.day <= 15 else start_date.month + 1
    end_month = end_date.month
    
    if start_date.year == end_date.year:
        months = end_month - start_month + 1
    else:
        months = (12 - start_month + 1) + end_month
    
    return max(0, min(12, months))


def get_opening_value(asset, financial_year):

    prev_snapshot = AssetDepreciationSnapshot.objects.filter(
        asset=asset,
        financial_year__end_date__lt=financial_year.start_date
    ).order_by('-financial_year__end_date').first()
    
    if prev_snapshot:
        return prev_snapshot.closing_value
    
    return asset.original_cost


def calculate_depreciation_for_asset(asset, financial_year):
    
    if not asset.is_depreciable():
        return None
    
    method = asset.get_depreciation_method()
    if method == 'NONE':
        return None
    
    opening_value = get_opening_value(asset, financial_year)
    
    if opening_value <= asset.salvage_value:
        return {
            'asset_id': asset.id,
            'asset_code': asset.asset_code,
            'asset_name': asset.asset_name,
            'asset_group_name': asset.asset_group.name,
            'financial_year_id': financial_year.id,
            'financial_year_name': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
            'opening_value': opening_value,
            'additions': Decimal('0.00'),
            'depreciation_amount': Decimal('0.00'),
            'closing_value': opening_value,
            'depreciation_basis': 'COST' if method == 'SLM' else 'WDV',
            'calculation_method': method,
            'months_depreciated': 0,
            'is_first_year': False,
            'is_fully_depreciated': True,
            'is_manual_depreciation': False
        }
    
    months = get_months_in_fy(asset, financial_year)
    if months <= 0:
        return None
    
    if method == 'SLM':
        depreciation_amount = calculate_slm_depreciation(
            asset.original_cost,
            asset.salvage_value,
            asset.get_effective_useful_life(),
            months
        )
        depreciation_basis = 'COST'
    elif method == 'MANUAL':
        depreciation_amount = Decimal('0.00')
        depreciation_basis = 'MANUAL'
    else: 
        depreciation_amount = calculate_wdv_depreciation(
            opening_value,
            asset.get_depreciation_rate(),
            asset.salvage_value,
            months
        )
        depreciation_basis = 'WDV'
    
    max_depreciation = opening_value - asset.salvage_value
    if depreciation_amount > max_depreciation:
        depreciation_amount = max(max_depreciation, Decimal('0.00'))
    
    closing_value = opening_value - depreciation_amount
    is_fully_depreciated = closing_value <= asset.salvage_value
    
    is_first_year = not AssetDepreciationSnapshot.objects.filter(asset=asset).exists()
    
    return {
        'asset_id': asset.id,
        'asset_code': asset.asset_code,
        'asset_name': asset.asset_name,
        'asset_group_name': asset.asset_group.name,
        'financial_year_id': financial_year.id,
        'financial_year_name': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
        'opening_value': opening_value,
        'additions': Decimal('0.00'), 
        'depreciation_amount': depreciation_amount,
        'closing_value': closing_value,
        'depreciation_basis': depreciation_basis,
        'calculation_method': method,
        'months_depreciated': months,
        'is_first_year': is_first_year,
        'is_fully_depreciated': is_fully_depreciated,
        'is_manual_depreciation': True if method == 'MANUAL' else False,
        'original_calculation_method': 'MANUAL' if method == 'MANUAL' else None
    }


def verify_previous_fy_depreciation(financial_year):
    prev_fy = FinancialYear.objects.filter(
        end_date__lt=financial_year.start_date,
        is_active=True
    ).order_by('-end_date').first()

    if prev_fy:
        has_assets = Asset.objects.filter(
            purchase_date__lte=prev_fy.end_date,
            is_active=True,
            status__in=['ACTIVE', 'DISPOSED']
        ).exists()

        if has_assets:
            depreciation_locked = AssetDepreciationSnapshot.objects.filter(
                financial_year=prev_fy,
                is_locked=True
            ).exists()
            if not depreciation_locked:
                raise exceptions.ValidationError(
                    f"Cannot run or preview depreciation for this FY. Depreciation for the previous financial year ({prev_fy.start_date.year}-{prev_fy.end_date.year}) has not been run and locked."
                )
        else:
            if not prev_fy.is_locked:
                raise exceptions.ValidationError(
                    f"Cannot run or preview depreciation for this FY. Previous financial year ({prev_fy.start_date.year}-{prev_fy.end_date.year}) has no assets but must be locked first."
                )


def preview_depreciation(self, financial_year_id):

    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    verify_previous_fy_depreciation(financial_year)
    
    locked_count = AssetDepreciationSnapshot.objects.filter(
        financial_year=financial_year,
        is_locked=True
    ).count()
    
    if locked_count > 0:
        raise exceptions.ValidationError(
            f"Depreciation is already locked for this financial year. "
            f"{locked_count} snapshots are locked."
        )
    
    assets = Asset.objects.filter(
        is_active=True,
        status__in=['ACTIVE', 'DISPOSED']  
    ).select_related('asset_group')
    
    previews = []
    for asset in assets:
        preview = calculate_depreciation_for_asset(asset, financial_year)
        if preview:
            previews.append(preview)
    
    total_opening = sum(p['opening_value'] for p in previews)
    total_depreciation = sum(p['depreciation_amount'] for p in previews)
    total_closing = sum(p['closing_value'] for p in previews)
    
    return {
        'data': {
            'financial_year': {
                'id': financial_year.id,
                'name': f"{financial_year.start_date.year}-{financial_year.end_date.year}"
            },
            'assets': previews,
            'summary': {
                'total_assets': len(previews),
                'total_opening_value': total_opening,
                'total_depreciation': total_depreciation,
                'total_closing_value': total_closing
            }
        }
    }


def generate_snapshots(self, financial_year_id, manual_edits=None, lock=False):

    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    verify_previous_fy_depreciation(financial_year)
    
    if AssetDepreciationSnapshot.objects.filter(
        financial_year=financial_year,
        is_locked=True
    ).exists():
        raise exceptions.ValidationError(
            "Cannot regenerate snapshots. Some snapshots are already locked for this financial year."
        )
    
    with transaction.atomic(using=get_current_db_name()):
        existing_manual = AssetDepreciationSnapshot.objects.filter(
            financial_year=financial_year,
            is_manual_depreciation=True
        ).values('asset_id', 'depreciation_amount', 'closing_value', 
                 'original_calculation_method', 'months_depreciated')
        
        manual_map = {m['asset_id']: m for m in existing_manual}
        
        # Inject the new manual edits from the frontend preview
        if manual_edits:
            for edit in manual_edits:
                asset_id = edit.get('asset_id')
                # Overwrite or create manual map entry
                if asset_id:
                    manual_map[asset_id] = {
                        'asset_id': asset_id,
                        'depreciation_amount': Decimal(str(edit.get('depreciation_amount', 0))),
                        'closing_value': Decimal(str(edit.get('closing_value', 0))),
                        'original_calculation_method': 'MANUAL',
                        'months_depreciated': 12  # Defaults
                    }
        
        
        AssetDepreciationSnapshot.objects.filter(
            financial_year=financial_year,
            is_locked=False
        ).delete()
        
        assets = Asset.objects.filter(
            is_active=True,
            status__in=['ACTIVE', 'DISPOSED']
        ).select_related('asset_group')
        
        user = self.request.user if hasattr(self, 'request') and hasattr(self.request, 'user') else None
        
        created_count = 0
        manual_preserved = 0
        
        for asset in assets:
            preview = calculate_depreciation_for_asset(asset, financial_year)
            if preview:
                if asset.id in manual_map:
                    manual_entry = manual_map[asset.id]
                    preview['depreciation_amount'] = manual_entry['depreciation_amount']
                    preview['closing_value'] = manual_entry['closing_value']
                    preview['is_manual_depreciation'] = True
                    preview['calculation_method'] = 'MANUAL'
                    preview['original_calculation_method'] = manual_entry.get('original_calculation_method')
                    preview['months_depreciated'] = manual_entry.get('months_depreciated', 12)
                    manual_preserved += 1
                
                snapshot = AssetDepreciationSnapshot.objects.create(
                    asset=asset,
                    financial_year=financial_year,
                    opening_value=preview['opening_value'],
                    additions=preview['additions'],
                    depreciation_amount=preview['depreciation_amount'],
                    closing_value=preview['closing_value'],
                    depreciation_basis=preview['depreciation_basis'],
                    calculation_method=preview['calculation_method'],
                    months_depreciated=preview['months_depreciated'],
                    is_manual_depreciation=preview.get('is_manual_depreciation', False),
                    original_calculation_method=preview.get('original_calculation_method'),
                    is_locked=lock,
                    locked_by=user if lock else None,
                    locked_on=datetime.now() if lock else None
                )
                
                if preview['is_fully_depreciated']:
                    asset.is_fully_depreciated = True
                    asset.save(update_fields=['is_fully_depreciated'])
                
                created_count += 1
        
        if lock and created_count > 0:
            AssetSnapshotLockHistory.objects.create(
                financial_year=financial_year,
                action='LOCKED',
                performed_by=user,
                snapshot_count=created_count,
                remarks="Generated and locked"
            )
        
        return {
            'Reason': f'Depreciation snapshots {"generated and locked" if lock else "generated"} successfully!',
            'data': {
                'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
                'snapshots_created': created_count,
                'manual_preserved': manual_preserved,
                'is_locked': lock
            }
        }


def lock_snapshots(self, financial_year_id):

    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    with transaction.atomic(using=get_current_db_name()):
        
        user = self.request.user if hasattr(self.request, 'user') else None
        
        updated_count = AssetDepreciationSnapshot.objects.filter(
            financial_year=financial_year,
            is_locked=False
        ).update(
            is_locked=True,
            locked_on=datetime.now(),
            locked_by=user
        )
        
        if updated_count == 0:
            total_count = AssetDepreciationSnapshot.objects.filter(financial_year=financial_year).count()
            if total_count == 0:
                raise exceptions.ValidationError("No snapshots exist for this financial year. Please generate snapshots first.")
            
            already_locked = AssetDepreciationSnapshot.objects.filter(
                financial_year=financial_year, 
                is_locked=True
            ).count()
            
            if already_locked > 0 and already_locked == total_count:
                raise exceptions.ValidationError("All snapshots for this financial year are already locked.")
                
            raise exceptions.ValidationError(
                "No unlocked snapshots found to lock. Please verify snapshot status."
            )
        
        untouched_manuals = AssetDepreciationSnapshot.objects.filter(
            financial_year=financial_year,
            is_locked=True,
            calculation_method='MANUAL',
            is_manual_depreciation=False,
            depreciation_amount=Decimal('0.00')
        )

        if untouched_manuals.exists():
            updated_count = AssetDepreciationSnapshot.objects.filter(
                financial_year=financial_year,
                is_locked=True
            ).update(is_locked=False, locked_on=None, locked_by=None)
            
            raise exceptions.ValidationError(
                f"Cannot lock: {untouched_manuals.count()} manual depreciation entries are missing values. "
                "Please enter depreciation for assets with Manual method."
            )
        


        if untouched_manuals.exists():
            updated_count = AssetDepreciationSnapshot.objects.filter(
                financial_year=financial_year,
                is_locked=True
            ).update(is_locked=False, locked_on=None, locked_by=None)
            
            raise exceptions.ValidationError(
                f"Cannot lock: {untouched_manuals.count()} manual depreciation entries are missing values. "
                "Please enter depreciation for assets with Manual method."
            )
        
        AssetSnapshotLockHistory.objects.create(
            financial_year=financial_year,
            action='LOCKED',
            performed_by=user,
            snapshot_count=updated_count,
            remarks=None
        )
        
        return {
            'Reason': 'Depreciation snapshots locked successfully!',
            'data': {
                'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
                'snapshots_locked': updated_count
            }
        }


def unlock_snapshots(self, financial_year_id, remarks=None):
    
    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    today = date_only.today()
    if not (financial_year.start_date <= today <= financial_year.end_date):
        raise exceptions.ValidationError(
            "Only the current financial year can be unlocked. "
            "Previous financial years are permanently locked for audit purposes."
        )
    
    with transaction.atomic(using=get_current_db_name()):
        
        user = self.request.user if hasattr(self.request, 'user') else None
        
        snapshots_to_unlock = AssetDepreciationSnapshot.objects.filter(
            financial_year=financial_year,
            is_locked=True
        )
        
        unlock_count = snapshots_to_unlock.count()
        
        if unlock_count == 0:
            raise exceptions.ValidationError(
                "No locked snapshots found for this financial year."
            )
        
        for snapshot in snapshots_to_unlock:
            snapshot.is_locked = False
            snapshot.unlocked_on = datetime.now()
            snapshot.unlocked_by = user
            snapshot.save(allow_unlock=True)
        
        AssetSnapshotLockHistory.objects.create(
            financial_year=financial_year,
            action='UNLOCKED',
            performed_by=user,
            snapshot_count=unlock_count,
            remarks=remarks
        )
        
        return {
            'Reason': 'Depreciation snapshots unlocked successfully!',
            'data': {
                'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
                'snapshots_unlocked': unlock_count,
                'unlocked_by': _get_safe_name(user),
                'unlocked_on': datetime.now().isoformat()
            }
        }


def bulk_edit_snapshots(self, financial_year_id, edits):

    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    if AssetDepreciationSnapshot.objects.filter(
        financial_year=financial_year,
        is_locked=True
    ).exists():
        raise exceptions.ValidationError(
            "Cannot edit snapshots. Depreciation is locked for this financial year. "
            "Please unlock first."
        )
    
    if not edits or len(edits) == 0:
        raise exceptions.ValidationError("No edits provided.")
    
    with transaction.atomic(using=get_current_db_name()):
        updated_count = 0
        errors = []
        edit_details = []
        
        for edit in edits:
            snapshot_id = edit.get('snapshot_id')
            new_depreciation = edit.get('depreciation_amount')
            
            if snapshot_id is None or new_depreciation is None:
                errors.append(f"Invalid edit data: {edit}")
                continue
            
            try:
                snapshot = AssetDepreciationSnapshot.objects.get(
                    id=snapshot_id,
                    financial_year=financial_year
                )
                
                new_depreciation = Decimal(str(new_depreciation))
                
                if new_depreciation < 0:
                    errors.append(f"Snapshot {snapshot_id}: Depreciation cannot be negative.")
                    continue
                
                max_depreciation = snapshot.opening_value - snapshot.asset.salvage_value
                if new_depreciation > max_depreciation:
                    errors.append(
                        f"Snapshot {snapshot_id}: Depreciation ({new_depreciation}) exceeds "
                        f"maximum allowed ({max_depreciation})."
                    )
                    continue
                
                if not snapshot.original_calculation_method:
                    snapshot.original_calculation_method = snapshot.calculation_method
                
                old_depreciation = float(snapshot.depreciation_amount)
                
                snapshot.depreciation_amount = new_depreciation
                snapshot.closing_value = snapshot.opening_value - new_depreciation
                snapshot.is_manual_depreciation = True
                snapshot.calculation_method = 'MANUAL'
                snapshot.save()
                
                is_fully_depreciated = snapshot.closing_value <= snapshot.asset.salvage_value
                if snapshot.asset.is_fully_depreciated != is_fully_depreciated:
                    snapshot.asset.is_fully_depreciated = is_fully_depreciated
                    snapshot.asset.save(update_fields=['is_fully_depreciated'])
                
                edit_details.append({
                    'asset_code': snapshot.asset.asset_code,
                    'asset_name': snapshot.asset.asset_name,
                    'edited_field': 'depreciation_amount',
                    'old_value': old_depreciation,
                    'new_value': float(new_depreciation)
                })
                
                updated_count += 1
                
            except AssetDepreciationSnapshot.DoesNotExist:
                errors.append(f"Snapshot {snapshot_id} not found for this financial year.")
            except Exception as e:
                errors.append(f"Snapshot {snapshot_id}: {str(e)}")
        
        if updated_count > 0:
            user = getattr(self.request, 'user', None)
            AssetSnapshotLockHistory.objects.create(
                financial_year=financial_year,
                action='EDITED',
                performed_by=user,
                snapshot_count=updated_count,
                remarks=f"Manual depreciation edit: {updated_count} snapshot(s) modified",
                details=edit_details
            )
        
        return {
            'Reason': f'{updated_count} snapshot(s) updated successfully!',
            'data': {
                'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
                'snapshots_updated': updated_count,
                'errors': errors if errors else None
            }
        }


def reset_to_calculated(self, snapshot_id):

    try:
        snapshot = AssetDepreciationSnapshot.objects.get(id=snapshot_id)
    except AssetDepreciationSnapshot.DoesNotExist:
        raise exceptions.NotFound("Snapshot not found.")
    
    if snapshot.is_locked:
        raise exceptions.ValidationError("Cannot reset a locked snapshot.")
    
    override_method = self.request.data.get('calculation_method')
    
    if not snapshot.is_manual_depreciation and not override_method:
         if snapshot.calculation_method != 'MANUAL':
             raise exceptions.ValidationError("Snapshot is not manually edited.")
    
    preview = calculate_depreciation_for_asset(snapshot.asset, snapshot.financial_year)
    
    if not preview:
        raise exceptions.ValidationError("Could not recalculate depreciation for this asset.")
    
    if override_method and override_method in ['SLM', 'WDV']:
        months = preview['months_depreciated']
        opening_value = preview['opening_value']
        
        if override_method == 'SLM':
             depreciation_amount = calculate_slm_depreciation(
                snapshot.asset.original_cost,
                snapshot.asset.salvage_value,
                snapshot.asset.get_effective_useful_life(),
                months
            )
        else:
             override_rate = self.request.data.get('depreciation_rate')
             rate = Decimal(str(override_rate)) if override_rate else snapshot.asset.get_depreciation_rate()
             depreciation_amount = calculate_wdv_depreciation(
                opening_value,
                rate,
                snapshot.asset.salvage_value,
                months
            )
        
        max_depreciation = opening_value - snapshot.asset.salvage_value
        if depreciation_amount > max_depreciation:
            depreciation_amount = max(max_depreciation, Decimal('0.00'))
            
        closing_value = opening_value - depreciation_amount
        is_fully_depreciated = closing_value <= snapshot.asset.salvage_value
        
        preview['depreciation_amount'] = depreciation_amount
        preview['closing_value'] = closing_value
        preview['calculation_method'] = override_method
        preview['is_fully_depreciated'] = is_fully_depreciated

    else:
        original_method = snapshot.original_calculation_method or preview['calculation_method']
        preview['calculation_method'] = original_method
    
    snapshot.depreciation_amount = preview['depreciation_amount']
    snapshot.closing_value = preview['closing_value']
    snapshot.calculation_method = preview['calculation_method']
    snapshot.is_manual_depreciation = False
    
    if snapshot.original_calculation_method is None and snapshot.calculation_method != preview['calculation_method']:
         snapshot.original_calculation_method = preview['calculation_method']
         
    snapshot.original_calculation_method = None
    
    if snapshot.asset.get_depreciation_method() == 'MANUAL' and override_method:
         pass 

    snapshot.save()
    
    if snapshot.asset.is_fully_depreciated != preview['is_fully_depreciated']:
        snapshot.asset.is_fully_depreciated = preview['is_fully_depreciated']
        snapshot.asset.save(update_fields=['is_fully_depreciated'])

    return {
        'Reason': 'Snapshot reset to calculated value successfully!',
        'data': {
            'snapshot_id': snapshot.id,
            'depreciation_amount': str(snapshot.depreciation_amount),
            'closing_value': str(snapshot.closing_value),
            'calculation_method': snapshot.calculation_method
        }
    }


def get_lock_history(self, financial_year_id):
    
    try:
        financial_year = FinancialYear.objects.get(id=financial_year_id)
    except FinancialYear.DoesNotExist:
        raise exceptions.NotFound("Financial year not found.")
    
    history = AssetSnapshotLockHistory.objects.filter(
        financial_year=financial_year
    ).select_related('performed_by').order_by('-performed_on')
    
    history_data = []
    for entry in history:
        history_data.append({
            'id': entry.id,
            'action': entry.action,
            'performed_by': _get_safe_name(entry.performed_by),
            'performed_by_id': entry.performed_by_id,
            'performed_on': entry.performed_on.isoformat(),
            'remarks': entry.remarks,
            'snapshot_count': entry.snapshot_count,
            'details': entry.details
        })
    
    return {
        'data': {
            'financial_year': f"{financial_year.start_date.year}-{financial_year.end_date.year}",
            'history': history_data
        }
    }


def get_snapshot_list(self):

    queryset = AssetDepreciationSnapshot.objects.select_related(
        'asset', 'asset__asset_group', 'financial_year', 'locked_by', 'unlocked_by'
    )
    
    financial_year_id = self.request.GET.get('financial_year')
    if not financial_year_id:
        raise exceptions.ValidationError("financial_year is required.")
    
    queryset = queryset.filter(financial_year_id=financial_year_id)
    
    if self.request.GET.get('asset_group'):
        queryset = queryset.filter(asset__asset_group_id=self.request.GET.get('asset_group'))
    if self.request.GET.get('is_locked'):
        is_locked = self.request.GET.get('is_locked').lower() == 'true'
        queryset = queryset.filter(is_locked=is_locked)
    if self.request.GET.get('is_manual'):
        is_manual = self.request.GET.get('is_manual').lower() == 'true'
        queryset = queryset.filter(is_manual_depreciation=is_manual)
    
    queryset = queryset.order_by('asset__asset_code')
    
    data, count, next_page, previous_page = SharedService.custom_pagination(
        self, queryset,
        self.request.GET.get('limit', 50),
        self.request.GET.get('pageno', 1)
    )
    
    serializer = AssetDepreciationSnapshotReadSerializer(data, many=True)
    return {
        'data': {
            'count': count,
            'next': next_page,
            'previous': previous_page,
            'data_list': serializer.data
        }
    }


def check_fy_locked(financial_year_id):

    return AssetDepreciationSnapshot.objects.filter(
        financial_year_id=financial_year_id,
        is_locked=True
    ).exists()
