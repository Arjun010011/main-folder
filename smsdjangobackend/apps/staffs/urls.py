from django.urls import path
from rest_framework import routers
from .views import (DepartmentViewSet, DepartmentStaffMappingViewSet, StaffViewSet, StaffAllDetailViewSet, StaffGetStaffFullName, StaffHODBranchViewSet, MentorStudentMappingViewSet,
                        PaginatedStaffDetail, StaffStandardMappingViewSet, GenerateIdCardForStaffViewSet, StaffCertificateViewSet, StaffStudentMeetingViewSet)

# urlpatterns = [
#     path('staff/', views.StaffDetail.as_view(), name="staff"),
#     path('staff/', views.StaffDetail.as_view()),
# ]

router = routers.DefaultRouter()
router.register(r'staff', StaffViewSet, basename='staff')
router.register(r'staffalldetail', StaffAllDetailViewSet, basename='staffalldetail')
router.register(r'getpaginatedstaffdetail', PaginatedStaffDetail, basename='getpaginatedstaffdetail')
router.register(r'staff_standard_mapping', StaffStandardMappingViewSet, basename='staff_standard_mapping')
router.register(r'department', DepartmentViewSet, basename='department')
router.register(r'generateidcardforstaff', GenerateIdCardForStaffViewSet, basename='generateidcardforstaff')
router.register(r'staffcertificate', StaffCertificateViewSet, basename='staffcertificate')
router.register(r'staffhodbranchmapping', StaffHODBranchViewSet,basename = 'staffhodbranchmapping')
router.register(r'department_staff_mapping', DepartmentStaffMappingViewSet, basename='department_staff_mapping')
router.register(r'mentorstudentmapping',MentorStudentMappingViewSet, basename='mentorstudentmapping')
router.register(r'staffstudentmeeting',StaffStudentMeetingViewSet, basename='staffstudentmeeting')
urlpatterns = router.urls

urlpatterns += [
    path('getstafffullname/', StaffGetStaffFullName.as_view(), name='getstafffullname'),
]
