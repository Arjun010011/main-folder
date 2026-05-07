from rest_framework import routers

from apps.interview.views import (
    JobRoleViewSet, InterviewSetupViewSet, InterviewRoundViewSet,
    JobApplicationViewSet, PublicJobApplicationViewSet,
    InterviewEvaluationViewSet
)

router = routers.SimpleRouter()
router.register(r'jobrole', JobRoleViewSet, basename='jobrole')
router.register(r'interviewsetup', InterviewSetupViewSet, basename='interviewsetup')
router.register(r'interviewround', InterviewRoundViewSet, basename='interviewround')
router.register(r'jobapplication', JobApplicationViewSet, basename='jobapplication')
router.register(r'publicjobapplication', PublicJobApplicationViewSet, basename='publicjobapplication')
router.register(r'interviewevaluation', InterviewEvaluationViewSet, basename='interviewevaluation')

urlpatterns = router.urls
