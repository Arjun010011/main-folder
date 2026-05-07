"""
Service layer for Fixed Asset CRUD business logic.
Extracted from views.py to keep ViewSets as thin CRUD wrappers.
"""
from rest_framework import exceptions
from apps.asset.models import AssetGroup, Asset, AssetDepreciationSnapshot
from apps.institutes.models.financialyear import FinancialYear


def check_previous_fy_locked(financial_year_id, action_name, ignore_current_lock=False):
    """Raise ValidationError if the prior FY is not locked or current FY is locked."""
    if not financial_year_id:
        return
    try:
        selected_fy = FinancialYear.objects.get(id=financial_year_id)
        if selected_fy.is_locked and not ignore_current_lock:
            raise exceptions.ValidationError(
                f"Cannot {action_name} – this financial year is locked."
            )
        previous_fys = FinancialYear.objects.filter(
            end_date__lt=selected_fy.start_date,
            is_active=True
        ).order_by('-end_date')
        if previous_fys.exists():
            prev_fy = previous_fys.first()
            if not prev_fy.is_locked:
                raise exceptions.ValidationError(
                    f"Cannot {action_name} for this FY – previous financial year "
                    f"({prev_fy.start_date.year}-{prev_fy.end_date.year}) must be locked first."
                )
    except FinancialYear.DoesNotExist:
        pass


# ━━━━━━━━━━━━━━━ ASSET GROUP SERVICE ━━━━━━━━━━━━━━━

def validate_asset_group_create(financial_year_id):
    check_previous_fy_locked(financial_year_id, 'create asset group')


def validate_asset_group_update(instance, new_fy_id):
    check_previous_fy_locked(instance.financial_year_id, 'update asset group')
    if new_fy_id and str(new_fy_id) != str(instance.financial_year_id):
        check_previous_fy_locked(new_fy_id, 'update asset group')


def cascade_delete_asset_group(instance, confirm=False):
    child_assets = instance.asset_asset_group.filter(is_active=True)
    child_groups = instance.asset_group_parent_group.filter(is_active=True)
    asset_count = child_assets.count()
    group_count = child_groups.count()

    if (asset_count > 0 or group_count > 0) and not confirm:
        return False, {
            'warning': True,
            'message': (
                f'This group has {asset_count} asset(s) and {group_count} sub-group(s). '
                f'Deleting will also deactivate all items under it.'
            ),
            'asset_count': asset_count,
            'group_count': group_count,
        }

    if asset_count > 0:
        child_assets.update(is_active=False)
    if group_count > 0:
        child_groups.update(is_active=False)

    return True, None

def check_asset_depreciation_locked(asset, financial_year_id=None):
    if financial_year_id:
        if asset.asset_depreciation_snapshot_asset.filter(
            financial_year_id=financial_year_id, is_locked=True
        ).exists():
            raise exceptions.ValidationError(
                "Cannot modify asset – depreciation is locked for this financial year."
            )
    else:
        if asset.asset_depreciation_snapshot_asset.filter(
            financial_year__is_active=True, is_locked=True
        ).exists():
            raise exceptions.ValidationError(
                "Cannot modify asset – depreciation is locked for the active financial year."
            )


def validate_asset_create(asset_group_id):
    if not asset_group_id:
        return
    try:
        group = AssetGroup.objects.select_related('financial_year').get(id=asset_group_id)
        check_previous_fy_locked(group.financial_year_id, 'create asset')
    except AssetGroup.DoesNotExist:
        pass


def validate_asset_update(instance, new_group_id, financial_year_id=None):
    check_asset_depreciation_locked(instance, financial_year_id)

    if instance.asset_group_id:
        try:
            group = AssetGroup.objects.select_related('financial_year').get(id=instance.asset_group_id)
            check_previous_fy_locked(group.financial_year_id, 'update asset')
        except AssetGroup.DoesNotExist:
            pass

    if new_group_id and str(new_group_id) != str(instance.asset_group_id):
        try:
            new_group = AssetGroup.objects.select_related('financial_year').get(id=new_group_id)
            check_previous_fy_locked(new_group.financial_year_id, 'update asset')
        except AssetGroup.DoesNotExist:
            pass


def validate_asset_destroy(instance):
    if instance.asset_depreciation_snapshot_asset.filter(is_locked=True).exists():
        raise exceptions.ValidationError(
            "Cannot delete asset with locked depreciation snapshots."
        )

def validate_depreciation_action(action_type, financial_year_id, request_data):
    if action_type in ['preview', 'generate', 'lock', 'unlock'] and not financial_year_id:
        raise exceptions.ValidationError("financial_year is required.")

    if action_type in ['generate', 'lock', 'edit', 'reset']:
        if action_type == 'reset':
            snapshot_id = request_data.get('snapshot_id')
            if snapshot_id:
                try:
                    snapshot = AssetDepreciationSnapshot.objects.get(id=snapshot_id)
                    check_previous_fy_locked(snapshot.financial_year_id, 'reset depreciation')
                except AssetDepreciationSnapshot.DoesNotExist:
                    pass
        else:
            action_name = "modify depreciation snapshots"
            if action_type == 'lock':
                action_name = "lock depreciation"
            check_previous_fy_locked(financial_year_id, action_name)


def route_depreciation_action(view, action_type, financial_year_id, request_data):
    from apps.asset.services.depreciation import (
        preview_depreciation, generate_snapshots, lock_snapshots,
        unlock_snapshots, bulk_edit_snapshots, reset_to_calculated
    )

    if action_type == 'preview':
        return preview_depreciation(view, financial_year_id)
    elif action_type == 'generate':
        edits = request_data.get('edits', None)
        return generate_snapshots(view, financial_year_id, manual_edits=edits)
    elif action_type == 'lock':
        return lock_snapshots(view, financial_year_id)
    elif action_type == 'unlock':
        remarks = request_data.get('remarks')
        return unlock_snapshots(view, financial_year_id, remarks)
    elif action_type == 'edit':
        edits = request_data.get('edits', [])
        if not edits:
            raise exceptions.ValidationError("No snapshot edits provided.")
        return bulk_edit_snapshots(view, financial_year_id, edits)
    elif action_type == 'reset':
        snapshot_id = request_data.get('snapshot_id')
        if not snapshot_id:
            raise exceptions.ValidationError("snapshot_id is required.")
        return reset_to_calculated(view, snapshot_id)
    else:
        raise exceptions.ValidationError(f"Unknown action: {action_type}")



def validate_disposal_create(asset_id, disposal_date=None):
    
    if not asset_id:
        return
    if disposal_date:
        from apps.asset.services.asset_cost import get_financial_year_for_date
        fy = get_financial_year_for_date(disposal_date)
        if fy:
            check_previous_fy_locked(fy.id, 'dispose asset')

def validate_cost_movement_create(financial_year_id):
    if financial_year_id:
        check_previous_fy_locked(financial_year_id, 'create cost movement')
