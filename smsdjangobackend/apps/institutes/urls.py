from rest_framework import routers
from django.urls import path
from apps.institutes.models.sibling_institute import SwitchableInstitute
from apps.institutes.views import (AcademicYearViewSet, AppVersionViewSet, GetAcademicYearViewSet, InstituteViewSet, FinancialYearViewSet,
                                   GetFinancialYearViewSet, DashBoardViewSet, ResourceViewSet, BuildingViewset,
                                   AssetViewset, RoomViewSet, BannerViewSet, UserSwitchableInstituteMappingViewSet, VisitorViewSet, VisitorVerifyView, ReasonViewSet, 
                                   InstituteAddressViewset, SwitchableInstituteViewSet, BiometricMachineViewSet,DashBoardViewNewSet, VisitorOtpViewSet)

router = routers.DefaultRouter()
router.register(r'academicyear', AcademicYearViewSet, basename='academicyear')
router.register(r'getacademicyear', GetAcademicYearViewSet, basename='getacademicyear')
router.register(r'institute', InstituteViewSet, basename='institute')
router.register(r'financialyear', FinancialYearViewSet, basename='financialyear')
router.register(r'getfinancialyear', GetFinancialYearViewSet, basename='getfinancialyear')
router.register(r'dashboard', DashBoardViewSet, basename='dashboard')
router.register(r'resource', ResourceViewSet, basename='resource')
router.register(r'buildingdata', BuildingViewset, basename='buildingdata')
router.register(r'asset', AssetViewset, basename='asset')
router.register(r'room', RoomViewSet, basename='room')
router.register(r'banner', BannerViewSet, basename='banner')
router.register(r'visitor', VisitorViewSet, basename='visitor')
router.register(r'reason', ReasonViewSet, basename='reason')
router.register(r'instituteaddress', InstituteAddressViewset, basename='instituteaddress')
router.register(r'appversion', AppVersionViewSet, basename='appversion')
router.register(r'switchableinstitute', SwitchableInstituteViewSet, basename='switchableinstitute')
router.register(r'userswitchableinstitutemapping', UserSwitchableInstituteMappingViewSet, basename='userswitchableinstitutemapping')
router.register(r'biometricmachine', BiometricMachineViewSet, basename='biometricmachine')
router.register(r'dashboardnew', DashBoardViewNewSet, basename='dashboardnew')
urlpatterns = [
    path('visitor/verify/', VisitorVerifyView.as_view(), name='visitor-verify'),
] + router.urls


urlpatterns += [
    path('vistorotp', VisitorOtpViewSet.as_view(), name='visitor_otp'),
]
