from rest_framework import routers
from django.urls import path

from apps.bdu.views import (BduValidationClassViewSet, BduViewSet, BduGetViewSet, BduUploadViewSet, ModelAPIView,
                            ModelFieldAPIView)

router = routers.DefaultRouter()
router.register(r'bdu', BduViewSet, basename='bdu')
router.register(r'getbdu', BduGetViewSet, basename='getbdu')
router.register(r'bduvalidationclass', BduValidationClassViewSet, basename='bduvalidationclass')
router.register(r'bduupload', BduUploadViewSet, basename='bduupload')
urlpatterns = router.urls

urlpatterns += [
    path('model/', ModelAPIView.as_view(), name='model'),
    path('modelfield/', ModelFieldAPIView.as_view(), name='modelfield'),
]
