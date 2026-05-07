from django.urls import path
from rest_framework import routers

from apps.quiz.views import (
    FormViewSet, ResponseViewSet, EvalutaionViewSet, ResponseSummary, TermsAndConditionViewSet)


router = routers.DefaultRouter()
router.register(r'forms', FormViewSet, basename='forms'),
router.register(r'response', ResponseViewSet, basename='response')
router.register(r'evaluate', EvalutaionViewSet, basename='evaluate')
router.register(r'responsesummary', ResponseSummary,
                basename='responsesummary')
router.register(r'termsandcondition', TermsAndConditionViewSet,
                basename='termsandcondition')
urlpatterns = router.urls
