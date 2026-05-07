from rest_framework import routers

from apps.diary.views import (DiaryViewSet, DiaryStatusViewSet, DiaryStudentViewSet, DiaryDocumentViewSet,
                              AppDiaryViewSet, DiaryStandardWiseViewSet,DiaryReportViewSet)

router = routers.DefaultRouter()
router.register(r'diary', DiaryViewSet, basename='diary')
router.register(r'diaryapp', AppDiaryViewSet, basename='diaryapp')
router.register(r'status', DiaryStatusViewSet, basename='status')
router.register(r'diarystudent', DiaryStudentViewSet, basename='diarystudent')
router.register(r'diarydocument', DiaryDocumentViewSet, basename='diarydocument')
router.register(r'diarystandardwise', DiaryStandardWiseViewSet, basename='diarystandardwise')
router.register(r'diaryreport', DiaryReportViewSet, basename='diaryreport')
urlpatterns = router.urls
