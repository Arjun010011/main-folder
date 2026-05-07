import json
import logging

from django.db.models import Sum, Count, Q

from apps.asset.models import Asset, AssetGroup, AssetDisposal, AssetDepreciationSnapshot
from apps.asset.serializers import (
    AssetDashboardGroupSerializer,
    AssetDisposalReadSerializer
)
from apps.institutes.models import FinancialYear

logger = logging.getLogger(__name__)

def _to_json_safe(obj):
    return json.loads(json.dumps(obj, default=str))


def get_asset_dashboard_summary(fy_id=None):
    
    active_assets = Asset.objects.filter(status='ACTIVE')
    if fy_id:
        try:
            fy = FinancialYear.objects.get(id=fy_id)
            active_assets = active_assets.filter(
                Q(asset_cost_movement_asset__financial_year=fy) |
                Q(asset_depreciation_snapshot_asset__financial_year=fy) |
                Q(purchase_date__gte=fy.start_date, purchase_date__lte=fy.end_date)
            ).distinct()
        except FinancialYear.DoesNotExist:
            pass

    total_value = active_assets.aggregate(
        total=Sum('original_cost')
    )['total'] or 0

    depreciation_run = False

    if fy_id:
        depreciation_run = AssetDepreciationSnapshot.objects.filter(
            financial_year_id=fy_id
        ).exists()

    if fy_id:
        try:
            fy = FinancialYear.objects.get(id=fy_id)
            fy_assets = Asset.objects.filter(
                Q(asset_cost_movement_asset__financial_year=fy) |
                Q(asset_depreciation_snapshot_asset__financial_year=fy) |
                Q(purchase_date__gte=fy.start_date, purchase_date__lte=fy.end_date)
            ).distinct()
            total_assets = fy_assets.count()
            disposed_assets = fy_assets.filter(status='DISPOSED').count()
            fully_depreciated = fy_assets.filter(is_fully_depreciated=True).count()
        except FinancialYear.DoesNotExist:
            total_assets = 0
            disposed_assets = 0
            fully_depreciated = 0
    else:
        total_assets = Asset.objects.count()
        disposed_assets = Asset.objects.filter(status='DISPOSED').count()
        fully_depreciated = Asset.objects.filter(is_fully_depreciated=True).count()

    return {
        'totalAssets': total_assets,
        'totalValue': str(total_value),
        'depreciationRun': depreciation_run,
        'activeAssets': active_assets.count(),
        'disposedAssets': disposed_assets,
        'fullyDepreciated': fully_depreciated
    }


def get_asset_dashboard_groups(fy_id=None):
    queryset = AssetGroup.objects.filter(
        asset_group_parent_group__isnull=True, is_active=True
    )
    if fy_id:
        queryset = queryset.filter(financial_year_id=fy_id)

    groups = queryset.order_by('name')
    result = []
    for group in groups:
        all_group_ids = list(
            AssetGroup.objects.filter(
                code=group.code, is_active=True
            ).values_list('id', flat=True)
        ) if group.code else [group.id]
        
        active_assets = Asset.objects.filter(
            asset_group_id__in=all_group_ids, status='ACTIVE', is_active=True
        )
        
        if fy_id:
            try:
                fy = FinancialYear.objects.get(id=fy_id)
                active_assets = active_assets.filter(
                    Q(asset_cost_movement_asset__financial_year=fy) |
                    Q(asset_depreciation_snapshot_asset__financial_year=fy) |
                    Q(purchase_date__gte=fy.start_date, purchase_date__lte=fy.end_date)
                ).distinct()
            except FinancialYear.DoesNotExist:
                pass

        agg = active_assets.aggregate(
            asset_count=Count('id'),
            total_value=Sum('original_cost')
        )
        
        result.append({
            'id': group.id,
            'name': group.name,
            'parent_group_name': group.parent_group.name if group.parent_group else None,
            'depreciation_method': group.depreciation_method,
            'asset_count': agg['asset_count'] or 0,
            'total_value': str(agg['total_value'] or 0),
        })

    return _to_json_safe(result)


def get_asset_dashboard_disposals(fy_id=None):
    queryset = AssetDisposal.objects.select_related(
        'asset', 'asset__asset_group'
    )
    if fy_id:
        try:
            fy = FinancialYear.objects.get(id=fy_id)
            queryset = queryset.filter(
                disposal_date__gte=fy.start_date,
                disposal_date__lte=fy.end_date
            )
        except FinancialYear.DoesNotExist:
            pass
        
    queryset = queryset.order_by('-disposal_date')

    return _to_json_safe(AssetDisposalReadSerializer(queryset, many=True).data)


def get_full_asset_dashboard(fy_id=None):
    return {
        'summary': get_asset_dashboard_summary(fy_id),
        'groups': get_asset_dashboard_groups(fy_id),
        'disposals': get_asset_dashboard_disposals(fy_id)
    }

