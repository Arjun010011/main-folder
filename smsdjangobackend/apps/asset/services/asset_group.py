from apps.asset.models import AssetGroup
from apps.asset.serializers import AssetGroupTreeSerializer


def get_asset_group_tree(self):
    financial_year_id = self.request.GET.get('financial_year')
    root_groups = AssetGroup.objects.filter(
        is_active=True,
        parent_group__isnull=True
    )
    if financial_year_id:
        root_groups = root_groups.filter(financial_year_id=financial_year_id)
        
    root_groups = root_groups.order_by('display_order', 'name')
    
    serializer = AssetGroupTreeSerializer(root_groups, many=True)
    return {'data': serializer.data}
