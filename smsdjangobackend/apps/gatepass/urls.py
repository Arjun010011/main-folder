"""
Gate Pass URL configuration.
"""
from django.urls import path
from rest_framework import routers
from apps.gatepass.views import GatePassViewSet, GatePassPdfView, GatePassVerifyView

router = routers.DefaultRouter()
router.register(r'gatepass', GatePassViewSet, basename='gatepass')

# Paths here are relative to main url prefix (e.g. api/gatepass/) so "verify/" => api/gatepass/verify/
# PDF at explicit path; verify is public for watchman (scan QR -> open link -> mark exit/return)
urlpatterns = [
    path('verify/', GatePassVerifyView.as_view(), name='gatepass-verify'),
    path('gatepass/<int:pk>/pdf/', GatePassPdfView.as_view(), name='gatepass-pdf'),
] + router.urls
