from rest_framework import routers
from django.urls import path
from apps.exams.views import ( ExamResultConfigApprovalViewSet, ExamTypeViewSet, ExamViewSet, ExamScheduleViewSet, ExamApproveViewSet,
StudentMarkViewSet, GradeViewSet, HallTicketViewSet, ExamTermViewSet, ResultConfigurationViewSet,ExamScheduleQuestionmappingViewSet,
AnnounceResultViewSet, StudentMarkSummary, ScheduleStudentViewSet, GetScheduledStandardViewSet,QuestionwiseMarksEntryViewSet,
ApproveStudentMarkViewSet, AnnounceResultConfigViewSet, StudentMarkResultConfigViewSet, ExamStatusViewSet,MarksReportAmritaViewSet,
ExamStudentScheduleViewSet, ExamStudentMarkScheduleListViewSet, ExamResultConfigViewSet, AnnounceExamResultConfigViewSet,ExamQuestionMarksExeptionViewSet,
ApproveResultConfigurationViewSet, ExamFinalResultConfigurationViewSet, StandardSectionDataForExamViewSet,ExamFinalResultConfigurationnewViewSet,
ResultConfigurationMergeNameViewSet,ExamMarkUnapproveViewSet,FinalResultConfigurationViewSet,FinalApproveResultConfigurationViewSet,FinalAnnounceResultConfigViewSet,StudentMarkFinalResultConfigViewSet,StudentExamMarksSummaryViewSet,
StudentMarkV2ViewSet, StudentMarkResultConfigV2ViewSet, AnnounceExamResultConfigV2ViewSet, StudentMarkFinalResultConfigV2ViewSet, StudentMarkBulkNotificationViewSet)
from .views import (
    StandardSectionsByExams,
    SubjectWiseReportViewSet,
    StudentWiseReportAPIView,
    RankWiseReportAPIView,
    CumulativeReportAPIView,
    AttendanceReportAPIView,
    AuditLogReportAPIView,
    StudentProfileAPIView,
    SubjectsByExamIdsView,
    CopyScheduleAPIView,
    BulkCopyExamAPIView,
    ClearExamScheduleAPIView,
    ExamScheduleDashboardAPIView,
    BulkClearExamScheduleAPIView,
)

router = routers.DefaultRouter()
router.register(r'examtypes', ExamTypeViewSet, basename='examtypes')
router.register(r'examterms', ExamTermViewSet, basename='examterms')
router.register(r'exam', ExamViewSet, basename='exam')
router.register(r'schedulestudent', ScheduleStudentViewSet, basename='schedulestudent')
router.register(r'examapprove', ExamApproveViewSet, basename='examapprove')
router.register(r'schedule', ExamScheduleViewSet, basename='schedule')
router.register(r'studentmark', StudentMarkViewSet, basename='studentmark')
router.register(r'studentmarkresultconfig', StudentMarkResultConfigViewSet, basename='studentmarkresultconfig')
router.register(r'studentmarkclasssummary', StudentMarkSummary, basename='studentmarkclasssummary')
router.register(r'studentgrade', GradeViewSet, basename='studentgrade')
router.register(r'hallticket', HallTicketViewSet, basename='hallticket')
router.register(r'resultconfiguration', ResultConfigurationViewSet, basename='resultconfiguration')
router.register(r'approveresultconfiguration', ApproveResultConfigurationViewSet, basename='approveresultconfiguration')
router.register(r'announceresult', AnnounceResultViewSet, basename='announceresult')
router.register(r'announceresultconfig', AnnounceResultConfigViewSet, basename='announceresultconfig')
router.register(r'getscheduledstandard', GetScheduledStandardViewSet, basename='getscheduledstandard')
router.register(r'approvestudentmark', ApproveStudentMarkViewSet, basename='approvestudentmark')
router.register(r'examstatusupdate', ExamStatusViewSet, basename='examstatusupdate')
router.register(r'studentschedule', ExamStudentScheduleViewSet, basename='studentschedule')
router.register(r'studentmarkschedulelist', ExamStudentMarkScheduleListViewSet, basename='studentmarkschedulelist')
router.register(r'examresultconfig', ExamResultConfigViewSet, basename='examresultconfig')
router.register(r'approveexamresultconfig', ExamResultConfigApprovalViewSet, basename='approveexamresultconfig')
router.register(r'announceexamresultconfig', AnnounceExamResultConfigViewSet, basename='announceexamresultconfig')
router.register(r'examfinalresultconfiguration', ExamFinalResultConfigurationViewSet, basename='examfinalresultconfiguration')
router.register(r'resultconfigurationmergename',ResultConfigurationMergeNameViewSet, basename='resultconfigurationmergename')
router.register(r'standardsectiondataforexam', StandardSectionDataForExamViewSet, basename='standardsectiondataforexam')
router.register(r'exammarksunapprove',ExamMarkUnapproveViewSet,basename='exammarksunapprove')
router.register(r'finalresultconfiguration',FinalResultConfigurationViewSet,basename='finalresultconfiguration')
router.register(r'finalapproveresultconfiguration', FinalApproveResultConfigurationViewSet, basename='finalapproveresultconfiguration')
router.register(r'finalannonceresultconfiguration', FinalAnnounceResultConfigViewSet, basename='finalannounceresultconfiguration')
router.register(r'studentmarkfinalresultconfig', StudentMarkFinalResultConfigViewSet, basename='studentmarkfinalresultconfig')
router.register(r'examfinalresultconfigurationnew', ExamFinalResultConfigurationnewViewSet, basename='examfinalresultconfigurationnew')
router.register(r'studentexammarkssummary', StudentExamMarksSummaryViewSet, basename='studentexammarkssummary')
router.register(r'examschedulequestionmapping',ExamScheduleQuestionmappingViewSet,basename='examschedulequestionmapping')
router.register(r'questionwisemarksentry',QuestionwiseMarksEntryViewSet,basename='questionwisemarksentry')
router.register(r'reports-subject-wise', SubjectWiseReportViewSet, basename='reports-subject-wise')
router.register(r'marksreportamrita',MarksReportAmritaViewSet,basename='marksreportamrita')
router.register(r'examquestionmarksexeption',ExamQuestionMarksExeptionViewSet,basename='examquestionmarksexeption')
router.register(r'studentmarkv2', StudentMarkV2ViewSet, basename='studentmarkv2')
router.register(r'studentmarkresultconfigv2', StudentMarkResultConfigV2ViewSet, basename='studentmarkresultconfigv2')
router.register(r'announceexamresultconfigv2', AnnounceExamResultConfigV2ViewSet, basename='announceexamresultconfigv2')
router.register(r'studentmarkfinalresultconfigv2', StudentMarkFinalResultConfigV2ViewSet, basename='studentmarkfinalresultconfigv2')
router.register(r'studentmarkbulknotification', StudentMarkBulkNotificationViewSet, basename='studentmarkbulknotification')

urlpatterns = router.urls
urlpatterns += [
    path('reports-student-wise/', StudentWiseReportAPIView.as_view(), name='student-wise-report'),
    path('reports-rank-wise/', RankWiseReportAPIView.as_view(), name='rank-wise-report'),
    path('reports-cumulative/', CumulativeReportAPIView.as_view(), name='cumulative-report'),
    path('reports-attendance/', AttendanceReportAPIView.as_view(), name='attendance-report'),
    path('reports-audit-log/', AuditLogReportAPIView.as_view(), name='audit-log-report'),
    path('students/<int:student_id>/', StudentProfileAPIView.as_view(), name='student-profile'),
    path('standard-sections-by-exams/', StandardSectionsByExams.as_view(), name='standard_sections_by_exams'),
    path('subjectsbyexams/', SubjectsByExamIdsView.as_view(), name='subjectsbyexams'),
    path('copyschedule/', CopyScheduleAPIView.as_view(), name='copyschedule'),
    path('bulkcopyexam/', BulkCopyExamAPIView.as_view(), name='bulkcopyexam'),
    path('clearexamschedule/', ClearExamScheduleAPIView.as_view(), name='clearexamschedule'),
    path('exam-schedule-dashboard/', ExamScheduleDashboardAPIView.as_view(), name='exam_schedule_dashboard'),
    path('bulkclearexamschedule/', BulkClearExamScheduleAPIView.as_view(), name='bulkclearexamschedule'),
]