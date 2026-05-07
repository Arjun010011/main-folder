from django.template import base
from django.urls import path
from knox import views
from rest_framework import routers

from apps.users.views import (CheckUserNameViewSet, CreateUserViewSet, LoginView, GroupViewSet, PermissionViewSet,
                              UserViewSet, UserGroupViewSet, ChangePasswordAPIView, OtpForMobileViewSet,
                              VerifyEmailAPIView, UserProfilePicViewSet, UserTreeStructureViewSet, 
                              GetUserIdForUsernameViewSet, SwitchAccountAPIView, UpdateUserdataViewset,
                              UserReportViewSet, UserBirthdayViewSet, UserReportAppViewSet,GroupTypeViewSet)

router = routers.DefaultRouter()
router.register(r'checkusernamenotexist', CheckUserNameViewSet, basename='checkusernamenotexist')
router.register(r'signup', CreateUserViewSet, basename='signup')
router.register(r'groups', GroupViewSet, basename='groups')
router.register(r'grouptypes', GroupTypeViewSet, basename='groups')
router.register(r'permissions', PermissionViewSet, basename='permissions')
router.register(r'users', UserViewSet, basename='users')
router.register(r'usergroups', UserGroupViewSet, basename='usergroups')
router.register(r'profilepic', UserProfilePicViewSet, basename='profilepic')
router.register(r'usertreestructure', UserTreeStructureViewSet, basename='usertreestructure')
router.register(r'getuseridforusername', GetUserIdForUsernameViewSet, basename='getuseridforusername')
router.register(r'updateuserdata', UpdateUserdataViewset, basename='updateuserdata')
router.register(r'userreport', UserReportViewSet, basename='userreport')
router.register(r'userbirthday', UserBirthdayViewSet, basename='userbirthday')
router.register(r'userreportapp', UserReportAppViewSet, basename='userreportapp')
urlpatterns = router.urls

urlpatterns += [
    path(r'login/', LoginView.as_view(), name='login'),  # LoginView.as_view(), name='knox_login'),
    path(r'otpdata/', OtpForMobileViewSet.as_view(), name='otpdata'),  # LoginView.as_view(), name='knox_login'),
    path(r'switchaccount/', SwitchAccountAPIView.as_view(), name='switchaccount'),  # LoginView.as_view(), name='knox_login'),
    path(r'logout/', views.LogoutView.as_view(), name='logout'),
    path(r'logoutall/', views.LogoutAllView.as_view(), name='logoutall'),
    path(r'changepassword/', ChangePasswordAPIView.as_view(), name='changepassword'),
    # path(r'verifyemail/<str:email>/', VerifyEmailAPIView.as_view(), name='verifyemail'),
]
