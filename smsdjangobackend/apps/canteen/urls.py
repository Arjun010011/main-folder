from rest_framework import routers
from apps.canteen import views

router = routers.DefaultRouter()

# ─────────────────────────────────────────────
# FOOD CATALOG
# ─────────────────────────────────────────────
router.register(r'food-category', views.FoodCategoryViewSet, basename='food_category')
router.register(r'food-item', views.FoodItemViewSet, basename='food_item')

# ─────────────────────────────────────────────
# COMBO SYSTEM
# ─────────────────────────────────────────────
router.register(r'food-combo', views.FoodComboViewSet, basename='food_combo')
router.register(r'food-combo-item', views.FoodComboItemViewSet, basename='food_combo_item')
router.register(r'combo-option-group', views.ComboOptionGroupViewSet, basename='combo_option_group')
router.register(r'combo-option-item', views.ComboOptionItemViewSet, basename='combo_option_item')

# ─────────────────────────────────────────────
# MENU SYSTEM
# ─────────────────────────────────────────────
router.register(r'menu', views.MenuViewSet, basename='menu')
router.register(r'menu-item', views.MenuItemViewSet, basename='menu_item')
router.register(r'menu-discount', views.MenuDiscountViewSet, basename='menu_discount')

# ─────────────────────────────────────────────
# ORDER SYSTEM (merged actions)
# ─────────────────────────────────────────────
router.register(r'order', views.OrderViewSet, basename='order')
router.register(r'order-item', views.OrderItemViewSet, basename='order_item')
router.register(r'order-item-combo-option', views.OrderItemComboOptionViewSet, basename='order_item_combo_option')

# ─────────────────────────────────────────────
# WALLET SYSTEM (top-up merged)
# ─────────────────────────────────────────────
router.register(r'wallet', views.WalletViewSet, basename='wallet')
router.register(r'wallet-transaction', views.WalletTransactionViewSet, basename='wallet_transaction')

# ─────────────────────────────────────────────
# MEAL PACKAGE SYSTEM (remaining merged)
# ─────────────────────────────────────────────
router.register(r'meal-package', views.MealPackageViewSet, basename='meal_package')
router.register(r'meal-package-item', views.MealPackageItemViewSet, basename='meal_package_item')
router.register(r'meal-package-subscription', views.MealPackageSubscriptionViewSet, basename='meal_package_subscription')
router.register(r'meal-package-usage', views.MealPackageUsageViewSet, basename='meal_package_usage')

# ─────────────────────────────────────────────
# FEE & PAYROLL INTEGRATION
# ─────────────────────────────────────────────
router.register(r'student-fee-meal-package-mapping', views.StudentFeeMealPackageMappingViewSet, basename='student_fee_meal_package_mapping')
router.register(r'staff-meal-package-payroll-mapping', views.StaffMealPackagePayrollMappingViewSet, basename='staff_meal_package_payroll_mapping')

# ─────────────────────────────────────────────
# FOOD REQUEST SYSTEM
# ─────────────────────────────────────────────
router.register(r'food-request-config', views.FoodRequestConfigViewSet, basename='food_request_config')
router.register(r'food-request', views.FoodRequestViewSet, basename='food_request')

urlpatterns = router.urls