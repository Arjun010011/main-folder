from rest_framework import routers

from apps.expenditure.views import ExpenseTypeViewSet, ExpenseViewSet, ExpensePlanViewSet, TokenViewSet

router = routers.DefaultRouter()
router.register(r'expensetype', ExpenseTypeViewSet, basename='expensetype')
router.register(r'expenseplan', ExpensePlanViewSet, basename='expenseplan')
router.register(r'expense', ExpenseViewSet, basename='expense')
router.register(r'token', TokenViewSet, basename='token')
urlpatterns = router.urls
