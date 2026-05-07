from django.db import transaction
from rest_framework import exceptions
from decimal import Decimal

from apps.asset.models import Asset, AssetCostMovement, AssetDepreciationSnapshot
from apps.institutes.models.financialyear import FinancialYear
from apps.tenants.services.middlewares import get_current_db_name


def is_fy_cost_locked(financial_year_id):
    return AssetDepreciationSnapshot.objects.filter(
        financial_year_id=financial_year_id,
        is_locked=True
    ).exists()


def get_financial_year_for_date(date):
    """Resolve a date to its financial year.
    Note: does NOT filter by is_active so that dates in a future FY
    (created but not yet active) can still be resolved.
    """
    try:
        return FinancialYear.objects.get(
            start_date__lte=date,
            end_date__gte=date,
        )
    except FinancialYear.DoesNotExist:
        return None
    except FinancialYear.MultipleObjectsReturned:
        return FinancialYear.objects.filter(
            start_date__lte=date,
            end_date__gte=date,
        ).first()


def create_opening_cost_entry(asset, financial_year, amount, opening_source, opening_reference=None):

    if is_fy_cost_locked(financial_year.id):
        raise exceptions.ValidationError(
            "Cannot create opening balance for a locked financial year."
        )
    
    if AssetCostMovement.objects.filter(
        asset=asset,
        financial_year=financial_year,
        movement_type='OPENING'
    ).exists():
        raise exceptions.ValidationError(
            f"Opening balance already exists for {asset.asset_code} in FY {financial_year.start_date.year}-{financial_year.end_date.year}"
        )
    
    entry = AssetCostMovement.objects.create(
        asset=asset,
        financial_year=financial_year,
        movement_type='OPENING',
        amount=amount,
        movement_date=financial_year.start_date,
        opening_source=opening_source,
        opening_reference=opening_reference
    )
    return entry


def create_disposal_cost_entry(asset, financial_year, disposal_date, remarks=None):

    if is_fy_cost_locked(financial_year.id):
        raise exceptions.ValidationError(
            "Cannot create disposal cost entry for a locked financial year."
        )
    
    if AssetCostMovement.objects.filter(
        asset=asset,
        financial_year=financial_year,
        movement_type='DISPOSAL'
    ).exists():
        raise exceptions.ValidationError(
            f"Disposal cost entry already exists for {asset.asset_code}"
        )
    
    # Calculate Gross Block at time of disposal
    movements_prior_to_disposal = AssetCostMovement.objects.filter(
        asset=asset,
        movement_date__lte=disposal_date,
        movement_type__in=['OPENING', 'ADDITION']
    )
    
    gross_block = sum(m.amount for m in movements_prior_to_disposal)
    # If no movements found, fallback to original cost
    if gross_block == Decimal('0.00'):
        gross_block = asset.original_cost
        
    entry = AssetCostMovement.objects.create(
        asset=asset,
        financial_year=financial_year,
        movement_type='DISPOSAL',
        amount=gross_block, 
        movement_date=disposal_date,
        remarks=remarks
    )
    return entry


def get_asset_closing_cost(asset, financial_year):

    movements = AssetCostMovement.objects.filter(
        asset=asset,
        financial_year=financial_year
    )
    
    opening = Decimal('0.00')
    additions = Decimal('0.00')
    disposals = Decimal('0.00')
    
    for m in movements:
        if m.movement_type == 'OPENING':
            opening = m.amount
        elif m.movement_type == 'ADDITION':
            additions += m.amount
        elif m.movement_type == 'DISPOSAL':
            disposals += m.amount
    
    closing = opening + additions - disposals
    
    return {
        'opening_cost': opening,
        'additions': additions,
        'disposals': disposals,
        'closing_cost': closing
    }


def get_previous_fy_closing_cost(asset, current_fy):

    if asset.status == 'DISPOSED':
        return Decimal('0.00')

    previous_fy = FinancialYear.objects.filter(
        end_date__lt=current_fy.start_date,
    ).order_by('-end_date').first()
    
    if not previous_fy:
        return asset.original_cost
    
    result = get_asset_closing_cost(asset, previous_fy)
    
    if result['opening_cost'] == Decimal('0.00') and result['additions'] == Decimal('0.00'):
        return asset.original_cost
    
    return result['closing_cost']


def ensure_opening_balance_exists(asset, financial_year):

    existing = AssetCostMovement.objects.filter(
        asset=asset,
        financial_year=financial_year,
        movement_type='OPENING'
    ).first()
    
    if existing:
        return existing
    
    if is_fy_cost_locked(financial_year.id):
        return None
    
    earliest_movement = AssetCostMovement.objects.filter(
        asset=asset
    ).order_by('financial_year__start_date').first()
    
    if earliest_movement is None:
        if (asset.purchase_date >= financial_year.start_date and 
            asset.purchase_date <= financial_year.end_date):
            opening_amount = asset.original_cost
            opening_source = 'MIGRATED'
            opening_reference = f"Initial opening balance for asset purchased {asset.purchase_date}"
        else:
            opening_amount = get_previous_fy_closing_cost(asset, financial_year)
            opening_source = 'PREVIOUS_FY_CLOSING'
            opening_reference = None
    else:
        opening_amount = get_previous_fy_closing_cost(asset, financial_year)
        opening_source = 'PREVIOUS_FY_CLOSING'
        opening_reference = None
    
    return create_opening_cost_entry(
        asset=asset,
        financial_year=financial_year,
        amount=opening_amount,
        opening_source=opening_source,
        opening_reference=opening_reference
    )


def validate_asset_creation_fy(purchase_date):

    financial_year = get_financial_year_for_date(purchase_date)
    
    if financial_year and is_fy_cost_locked(financial_year.id):
        fy_name = f"{financial_year.start_date.year}-{financial_year.end_date.year}"
        raise exceptions.ValidationError(
            f"Cannot create asset with purchase date in locked financial year ({fy_name}). "
            "Please contact Edubricz."
        )
