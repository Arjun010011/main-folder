from rest_framework import routers

from apps.store.views import (CategoryViewSet, SubCategoryViewSet, PropertiesViewSet, PropertyValueViewSet, ItemViewSet,
                              VendorViewSet, StockViewSet, PurchaseMasterViewSet, PurchaseMasterReturnViewSet,PackageViewSet,
                              ItemSoldViewSet)

router = routers.DefaultRouter()
router.register(r'storecategory', CategoryViewSet, basename='storecategory')
router.register(r'subcategory', SubCategoryViewSet, basename='subcategory')
router.register(r'properties', PropertiesViewSet, basename='properties')
router.register(r'propertyvalue', PropertyValueViewSet, basename='propertyvalue')
router.register(r'item', ItemViewSet, basename='item')
router.register(r'vendor', VendorViewSet, basename='vendor')
router.register(r'stock', StockViewSet, basename='stock')
router.register(r'purchasemaster', PurchaseMasterViewSet, basename='purchasemaster')
router.register(r'purchasemasterreturn', PurchaseMasterReturnViewSet, basename='purchasemasterreturn')
router.register(r'itemsold', ItemSoldViewSet, basename='itemsold')
router.register(r'package', PackageViewSet, basename='package')
urlpatterns = router.urls
