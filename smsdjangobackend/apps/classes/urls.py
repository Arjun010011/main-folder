from rest_framework import routers
from django.urls import path

from apps.classes.views import (DownloadDayWiseAttendance, DownloadSatsAttendance, MachineAttendanceLogViewSet, MachineUserLogViewSet, SubjectViewSet, StandardViewSet, SectionViewSet, StandardSectionMappingViewSet,
                                EnrollmentViewSet, AssignSubjectViewSet, PromoteStudentViewSet, FilterSectionViewSet,GetStudentForBatchViewSet,
                                FilterStandardViewSet, GetStudentEnrollViewSet, GetSubjectViewSet,BatchStudentStandardViewSet,
                                GetAssignedSubjectViewSet, GetPromoteStudentViewSet, EnrolledStudentStandardViewSet,
                                ShuffleStudentStandardViewSet, GetStandardAndSectionApiView, AttendanceViewSet,
                                DiseCodeViewSet, AttendanceDetailViewSet, AssignStudentSubjectViewSet,
                                StrengthFromPreviousYearViewSet, HandleMachineViewSet, StudentRfidAttendanceReportViewSet,
                                BoardViewSet, BranchViewSet, CumulativeTypeViewSet, GetMyStandardViewSet, GetSubjectPartTypeViewSet,
                                DepromoteStudentViewSet,MoveStudentToPreviousViewSet, AttendanceReportViewSet, MachineUserMappingViewSet,
                                ProcessFaileDataViewSet,RfidAttendanceViewSet,SubjectAttendanceViewSet,SubjectAttendanceDetailViewSet,StudentLeaveApprovalViewSet,
                                StudentLeaveTypeViewSet,StudentLeaveSummaryViewSet,ApplyStudentLeaveViewSet,StudentLeaveTypeAcademicYearMappingViewSet,ApplyStudentLeavePagination,
                                StaffStandardSectionMappingViewSet,AttendanceBatchViewSet,BatchAttendanceDetailViewSet,
                                StudentAttendanceIndividualViewSet,GetMyStandardViewSet1,AttendanceBatchStudentMappingViewSet,SubjectAttendanceReportViewSet,
                                EnrollmentSummaryViewSet,StaffSubjectAttendanceReportViewSet,RFIDAttendanceDetailViewSet, BatchAttendanceViewSet, StandardAttendanceConfigurationViewSet,
                                CourseOutcomeViewSet,ProgramOutcomeViewSet,SubjectCOPOPSOMappingMatrixViewSet,AttendanceNotMarkedTimetable,
                                StaffSubjectCourseDesign, ProgramSpecificOutcomeViewSet, SubjectCategoryViewSet,SubjectDetailsViewSet,ProgramEducationalObjectivesViewSet,
                                BulkChangeStandardViewSet,                                 LessonPlanTemplateViewSet, LessonPlanTemplateAcademicYearViewSet,
                                UpdateLessonPlanStatusViewSet,
                                StaffLessonPlanDashboardViewSet,
                                AILessonPlanPreviewView, AILessonPlanImportView, AILessonPlanNcertPreviewView,
                                NcertHierarchyView, NcertBooksView,
                                LessonPlanVersionViewSet,
                                )

router = routers.DefaultRouter()
router.register(r'subject', SubjectViewSet, basename='subject')
router.register(r'standard', StandardViewSet, basename='standard')
router.register(r'disecode', DiseCodeViewSet, basename='disecode')
router.register(r'getstandard', FilterStandardViewSet, basename='getstandard')
router.register(r'section', SectionViewSet, basename='section')
router.register(r'getsection', FilterSectionViewSet, basename='getsection')
router.register(r'strength', StandardSectionMappingViewSet, basename='strength')
router.register(r'strengthfrompreviousyear', StrengthFromPreviousYearViewSet, basename='strengthfrompreviousyear')
router.register(r'getenrollment', GetStudentEnrollViewSet, basename='getenrollment')
router.register(r'enrollment', EnrollmentViewSet, basename='enrollment')
router.register(r'enrollmentsummary', EnrollmentSummaryViewSet, basename='enrollmentsummary')
router.register(r'getenrolledstudents', EnrolledStudentStandardViewSet, basename='getenrolledstudents')
router.register(r'shuffledstudents', ShuffleStudentStandardViewSet, basename='shuffledstudents')
router.register(r'getassignsubject', GetAssignedSubjectViewSet, basename='getassignsubject')
router.register(r'assignsubject', AssignSubjectViewSet, basename='assignsubject')
router.register(r'assignsubjectstudent', AssignStudentSubjectViewSet, basename='assignsubjectstudent')
router.register(r'getsubjects', GetSubjectViewSet, basename='getsubjects')
router.register(r'promotestudent', PromoteStudentViewSet, basename='promotestudent')
router.register(r'getpromotestudent', GetPromoteStudentViewSet, basename='getpromotestudent')
router.register(r'bulkchangestandard', BulkChangeStandardViewSet, basename='bulkchangestandard')
router.register(r'attendance', AttendanceViewSet, basename='attendance')
router.register(r'attendancedetail', AttendanceDetailViewSet, basename='attendancedetail')
router.register(r'rfidattendancedetail', RFIDAttendanceDetailViewSet, basename='rfidattendancedetail')
router.register(r'subjectattendancedetail', SubjectAttendanceDetailViewSet, basename='subjectattendancedetail')
router.register(r'subjectattendance',SubjectAttendanceViewSet, basename='subjectattendance')
router.register(r'handlemachine', HandleMachineViewSet, basename='handlemachine')
router.register(r'studentrfidattendancereport', StudentRfidAttendanceReportViewSet, basename='studentrfidattendancereport')
router.register(r'studentattendanceindividual', StudentAttendanceIndividualViewSet, basename='studentattendanceindividual')
router.register(r'board', BoardViewSet, basename='board')
router.register(r'branch', BranchViewSet, basename='branch')
router.register(r'cumulativetype', CumulativeTypeViewSet, basename='cumulativetype')
router.register(r'getmystandard', GetMyStandardViewSet, basename='getmystandard')
router.register(r'getmystandard1', GetMyStandardViewSet1, basename='getmystandard')
router.register(r'subjectparttype', GetSubjectPartTypeViewSet, basename='subjectparttype')
router.register(r'depromotestudent', DepromoteStudentViewSet, basename='depromotestudent')
router.register(r'movestudenttopreviousyear',MoveStudentToPreviousViewSet,basename='movestudenttopreviousyear')
router.register(r'machineusermapping', MachineUserMappingViewSet, basename='machineusermapping')
router.register(r'studentattendancereport', AttendanceReportViewSet, basename='studentattendancereport')
router.register(r'faileddatatosave', ProcessFaileDataViewSet, basename='processfaileddata')
router.register(r'machineattendancelog', MachineAttendanceLogViewSet, basename='machineattendancelog')
router.register(r'machineuserlog', MachineUserLogViewSet, basename='machineuserlog')
router.register(r'rfidattendance', RfidAttendanceViewSet, basename='rfidattendance')
router.register(r'studentleavetype', StudentLeaveTypeViewSet, basename='studentleavetype')
router.register(r'studentleaveplan', StudentLeaveTypeAcademicYearMappingViewSet, basename='studentleaveplan')
router.register(r'applystudentleave', ApplyStudentLeaveViewSet, basename='applystudentleave')
router.register(r'applystudentleavepagination', ApplyStudentLeavePagination, basename='applystudentleavepagination')
router.register(r'studentleavesummary', StudentLeaveSummaryViewSet, basename='studentleavesummary')
# router.register(r'studentleavelist', StudentLeaveListViewSet, basename='studentleavelist')
router.register(r'studentleaveapprovalview', StudentLeaveApprovalViewSet, basename='studentleaveapprovalview')
router.register(r'staffstandardsectionmapping', StaffStandardSectionMappingViewSet, basename='staffstandardsectionmapping')
router.register(r'staffsubjectattendancereport', StaffSubjectAttendanceReportViewSet, basename='staffsubjectattendancereport')
router.register(r'attendancebatch', AttendanceBatchViewSet, basename='attendancebatch')
router.register(r'attendancebatchstudentmapping', AttendanceBatchStudentMappingViewSet, basename='attendancebatchstudentmapping')
router.register(r'batchattendancedetail', BatchAttendanceDetailViewSet, basename='batchattendancedetail')
router.register(r'batchattendance', BatchAttendanceViewSet, basename='batchattendance')
router.register(r'getstudentsforbatch', GetStudentForBatchViewSet, basename='getstudentsforbatch')
router.register(r'getbatchstudents', BatchStudentStandardViewSet, basename='getbatchstudents')
router.register(r'standardattendanceconfig', StandardAttendanceConfigurationViewSet, basename='standardattendanceconfig')
router.register(r'attendance_standard_section_summary', AttendanceViewSet, basename='attendance_standard_section_summary')
router.register(r'studentsubjectattendancereport', SubjectAttendanceReportViewSet, basename='studentsubjectattendancereport')
router.register(r'download_daywise_attendance_report', DownloadDayWiseAttendance, basename='download_daywise_attendance_report')
router.register(r'download_sats_attendance', DownloadSatsAttendance, basename='download_sats_attendance')
router.register(r'courseoutcome',CourseOutcomeViewSet,basename='courseoutcome')
router.register(r'programoutcome',ProgramOutcomeViewSet,basename='programoutcome')
router.register(r'programeducationalobjectives',ProgramEducationalObjectivesViewSet,basename='programeducationalobjectives')
router.register(r'programspecificoutcome',ProgramSpecificOutcomeViewSet,basename='programspecificoutcome')
router.register(r'subjectcopopsomappingmatrix',SubjectCOPOPSOMappingMatrixViewSet,basename='subjectcopopsomappingmatrix')
router.register(r'staffsubjectcoursedesign',StaffSubjectCourseDesign,basename='staffsubjectcoursedesign')
router.register(r'subjectcategory',SubjectCategoryViewSet,basename='subjectcategory')
router.register(r'subjectdetails',SubjectDetailsViewSet,basename='subjectdetails')
router.register(r'attendancenotmarkedtimetable', AttendanceNotMarkedTimetable,basename='attendancenotmarkedtimetable')
router.register(r'lessonplantemplate', LessonPlanTemplateViewSet, basename='lessonplantemplate')
router.register(r'lessonplantemplateacademicyear', LessonPlanTemplateAcademicYearViewSet, basename='lessonplantemplateacademicyear')
router.register(r'updatelessonplanningstatus', UpdateLessonPlanStatusViewSet, basename='updatelessonplanningstatus')
router.register(r'stafflessonplandashboard', StaffLessonPlanDashboardViewSet, basename='stafflessonplandashboard')
router.register(r'lessonplanversion', LessonPlanVersionViewSet, basename='lessonplanversion')


urlpatterns = router.urls

urlpatterns += [
    path('getstandardandsection/', GetStandardAndSectionApiView.as_view(), name='getstandardandsection'),
    path('ailessonplanpreview/', AILessonPlanPreviewView.as_view(), name='ailessonplanpreview'),
    path('ailessonplanimport/', AILessonPlanImportView.as_view(), name='ailessonplanimport'),
    path('ncerthierarchy/', NcertHierarchyView.as_view(), name='ncerthierarchy'),
    path('ncertbooks/', NcertBooksView.as_view(), name='ncertbooks'),
    path('ailessonplanncertpreview/', AILessonPlanNcertPreviewView.as_view(), name='ailessonplanncertpreview'),
]
