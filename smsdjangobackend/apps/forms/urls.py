from rest_framework import routers

from apps.forms.views import (EnquiryStudentViewSet, ApplicationStudentViewSet, GetEnquiryStudentViewSet,
                              GetApplicationStudentViewSet, GetApplicationForAdmissionStudentViewSet,
                              GetEnquiryStudentForApplicationViewSet, ApplicationStudentPublicViewSet,
                              ApproveApplicationViewSet, EnquiryFollowupViewSet, EnquiryEmployeeReportViewSet, EnquiryDashboardViewSet,
                              ApplicationFormOtpViewSet, ApplicationFeePaymentViewSet,
                              ApplicationUserDashboardViewSet)

router = routers.DefaultRouter()
router.register(r'enquiry', EnquiryStudentViewSet, basename='enquiry')
router.register(r'enquiryfollowup', EnquiryFollowupViewSet, basename='enquiryfollowup')
router.register(r'getenquiry', GetEnquiryStudentViewSet, basename='getenquiry')
router.register(r'getenquiryforapplication', GetEnquiryStudentForApplicationViewSet,
                basename='getenquiryforapplication')
router.register(r'enquiryemployeereport', EnquiryEmployeeReportViewSet, basename='enquiryemployeereport')
router.register(r'enquirydashboard', EnquiryDashboardViewSet, basename='enquirydashboard')
router.register(r'application', ApplicationStudentViewSet, basename='application')
router.register(r'applicationpublic', ApplicationStudentPublicViewSet, basename='applicationpublic')
router.register(r'getapplication', GetApplicationStudentViewSet, basename='getapplication')
router.register(r'getapplicationforadmission', GetApplicationForAdmissionStudentViewSet,
                basename='getapplicationforadmission')
router.register(r'approveapplication', ApproveApplicationViewSet, basename='approveapplication')
router.register(r'applicationformotp', ApplicationFormOtpViewSet, basename='applicationformotp')
router.register(r'applicationfeepayment', ApplicationFeePaymentViewSet, basename='applicationfeepayment')
router.register(r'applicationuserdashboard', ApplicationUserDashboardViewSet, basename='applicationuserdashboard')
urlpatterns = router.urls
