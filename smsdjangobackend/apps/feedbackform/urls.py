from django.urls import path
from rest_framework import routers

from apps.feedbackform.views import (
    FeedBackFormViewSet, FeedBackFormResponseViewSet, FeedBackFormEvalutaionViewSet, FeedBackFormResponseSummary, FeedBackFormTermsAndConditionViewSet,
    FeedBackTypesViewSet)


router = routers.DefaultRouter()
router.register(r'feedbackforms', FeedBackFormViewSet, basename='feedbackforms'),
router.register(r'feedbackformresponse', FeedBackFormResponseViewSet, basename='feedbackformresponse')
router.register(r'feedbackevaluate', FeedBackFormEvalutaionViewSet, basename='feedbackevaluate')
router.register(r'feedbackformresponsesummary', FeedBackFormResponseSummary,
                basename='feedbackformresponsesummary')
router.register(r'feedbackformtermsandcondition', FeedBackFormTermsAndConditionViewSet,
                basename='feedbackformtermsandcondition')
router.register(r'feedbacktypes', FeedBackTypesViewSet,
                basename='feedbackformtermsandcondition')
urlpatterns = router.urls
