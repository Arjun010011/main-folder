from rest_framework import routers

from apps.asset.views import (
    AssetGroupViewSet,
    AssetViewSet,
    DepreciationViewSet,
    DepreciationHistoryViewSet,
    AssetDisposalViewSet,
    AssetCostMovementViewSet,
    FixedAssetRegisterViewSet,
    AssetGroupSummaryViewSet,
    DepreciationScheduleViewSet,
    FixedAssetCostRegisterViewSet,
    AssetGroupCostSummaryViewSet,
    DisposalListViewSet,
    AssetDashboardViewSet
)

router = routers.DefaultRouter()

router.register(r'asset-groups', AssetGroupViewSet, basename='asset-groups')
router.register(r'assets', AssetViewSet, basename='assets')

router.register(r'depreciation', DepreciationViewSet, basename='depreciation')
router.register(r'depreciation-history', DepreciationHistoryViewSet, basename='depreciation-history')

router.register(r'disposals', AssetDisposalViewSet, basename='asset-disposals')
router.register(r'cost-movements', AssetCostMovementViewSet, basename='cost-movements')

router.register(r'reports/fixed-asset-register', FixedAssetRegisterViewSet, basename='fixed-asset-register')
router.register(r'reports/asset-group-summary', AssetGroupSummaryViewSet, basename='asset-group-summary')
router.register(r'reports/depreciation-schedule', DepreciationScheduleViewSet, basename='depreciation-schedule')
router.register(r'reports/fixed-asset-cost-register', FixedAssetCostRegisterViewSet, basename='fixed-asset-cost-register')
router.register(r'reports/asset-group-cost-summary', AssetGroupCostSummaryViewSet, basename='asset-group-cost-summary')
router.register(r'reports/disposal-list', DisposalListViewSet, basename='disposal-list')

router.register(r'dashboard', AssetDashboardViewSet, basename='dashboard')

urlpatterns = router.urls