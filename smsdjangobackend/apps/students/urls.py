from rest_framework import routers
from apps.students.views import (AdmissionNumberViewSet, StudentStandardWiseReport, StudentViewSet, StudentListViewSet, StudentAllDetailsViewSet, GetStudentViewSet,
                                 CertificateViewSet, StudentTypeViewSet, StudentRfidRegisterViewSet, SiblingDataViewSet,StudentRevertViewSet, 
                                 StudentGroupViewset, StudentAdmissionNumViewset, StudentReadmissionViewSet, IssueTcForStudentViewSet,
                                 StudentReportViewSet, DeletedStudentViewSet, GenerateIdCardViewSet,CombinedStudentStaffViewSet,StudentAcademicDetailsViewSet,UploadIdCardViewSet,StudentIdCardUpdateViewSet,IdCardUpdateViewSet,IdCardDashboardViewSet,
                                 IdCardDataSyncViewSet)

router = routers.DefaultRouter()
router.register(r'student', StudentViewSet, basename='student')  # GET
router.register(r'studentstandardwisereport', StudentStandardWiseReport, basename='studentstandardwisereport')
router.register(r'studentrfidregister', StudentRfidRegisterViewSet, basename='studentrfidregister')
router.register(r'studentall', StudentAllDetailsViewSet, basename='studentall')  # POST PUT DELETE
router.register(r'studentlist', StudentListViewSet, basename='studentlist')  # GET
router.register(r'getallstudents', GetStudentViewSet, basename='getallstudents')  # GET
router.register(r'certificate', CertificateViewSet, basename='certificate')  # Post
router.register(r'studenttype', StudentTypeViewSet, basename='studenttype')  # GET
router.register(r'getmysiblingdatas', SiblingDataViewSet, basename='getmysiblingdatas')
router.register(r'getstudentgroups', StudentGroupViewset, basename='getstudentgroups')
router.register(r'checkadmissionnumexist', StudentAdmissionNumViewset, basename='checkadmissionnumexist')
router.register(r'readmission', StudentReadmissionViewSet, basename='readmission')
router.register(r'issuetcforstudent', IssueTcForStudentViewSet, basename='issuetcforstudent')
router.register(r'admissionnumber', AdmissionNumberViewSet, basename='admissionnumber')
router.register(r'studentreport', StudentReportViewSet, basename='studentreport')
router.register(r'deletedstudentlist', DeletedStudentViewSet, basename='deletedstudentlist')
router.register(r'generateidcard', GenerateIdCardViewSet, basename='generateidcard')
router.register(r'fetchstudentstaffdetails', CombinedStudentStaffViewSet,basename='fetchstudentstaffdetails')
router.register(r'revert',StudentRevertViewSet,basename='revert')
router.register(r'studentacademicdetails',StudentAcademicDetailsViewSet,basename='studentacademicdetails')
router.register(r'uploadidcard', UploadIdCardViewSet, basename='uploadidcard')
router.register(r'studentidcardupdate', StudentIdCardUpdateViewSet, basename='studentidcardupdate')
router.register(r'idcardupdate', IdCardUpdateViewSet, basename='idcardupdate')
router.register(r'idcarddashboard', IdCardDashboardViewSet, basename='iddashboard')
router.register(r'idcarddatasync', IdCardDataSyncViewSet, basename='idcarddatasync')

urlpatterns = router.urls
