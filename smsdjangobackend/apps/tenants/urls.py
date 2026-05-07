from django.urls import path
from rest_framework import routers

from apps.tenants.views import CompanyViewSet, ServerOpertationViewSet

router = routers.DefaultRouter()
router.register(r'company', CompanyViewSet, basename='company')
router.register(r'serveroperations', ServerOpertationViewSet, basename='serveroperations')
urlpatterns = router.urls
