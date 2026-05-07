from rest_framework import routers

from apps.app.views import (AttendanceReportViewSet, AttendanceDetailViewSet, AppPermissionViewSet, AppUserViewSet,
                            UpcomingTaskViewSet, HelpCenterViewSet, StaffAppPermissionViewSet)

router = routers.DefaultRouter()
router.register(r'attendancedata', AttendanceDetailViewSet, basename='attendancedata')
router.register(r'attendancereport', AttendanceReportViewSet, basename='attendancereport')
router.register(r'permissionlist', AppPermissionViewSet, basename='permissionlist')
router.register(r'staffpermissionlist', StaffAppPermissionViewSet, basename='staffpermissionlist')
router.register(r'appusers', AppUserViewSet, basename='appusers')
router.register(r'upcomingtask', UpcomingTaskViewSet, basename='upcomingtask')
router.register(r'helpcenterticket', HelpCenterViewSet, basename='helpcenterticket')
urlpatterns = router.urls
