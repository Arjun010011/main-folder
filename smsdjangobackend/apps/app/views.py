from rest_framework import viewsets
from rest_framework.views import Response

from apps.app.services.attendance import get_attendance_report, get_attendance_detail
from apps.app.services.permission import (
    get_app_permission, add_app_permission, add_staff_app_permission, get_staff_app_permission
)
from apps.app.services.upcoming_task import upcoming_task
from apps.app.services.user import get_app_user
from apps.general.models import HolidayCalender
from apps.general.serializers import HolidayCalenderSerializer
from apps.users.models import User
from apps.users.services.permissions import IsAuthenticated
from apps.users.serializers import LoginUserSerializer
from apps.app.services.helpcenter import read_help_center_data, add_help_center_data, delete_help_center, update_helpcenter_read_time

class AttendanceReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    
    def list(self, request, *args, **kwargs):
        response = get_attendance_report(self)
        return Response(response)


class AttendanceDetailViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_attendance_detail(self)
        return Response(response)


class AppPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        response = get_app_permission(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_app_permission(self, request.data)
        return Response(response)

class StaffAppPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        response = get_staff_app_permission(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_staff_app_permission(self, request.data)
        return Response(response)

class AppUserViewSet(viewsets.ModelViewSet):
    serializer_class = LoginUserSerializer
    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = User.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_app_user(self)
        return Response(response)


class UpcomingTaskViewSet(viewsets.ModelViewSet):
    serializer_class = HolidayCalenderSerializer
    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = HolidayCalender.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = upcoming_task(self, request)
        return Response(response)

class HelpCenterViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post', 'get', 'delete', 'put']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return None

    def list(self, request):
        response = read_help_center_data(self, request)
        return Response(response)

    def create(self, request):
        response = add_help_center_data(self, request)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_helpcenter_read_time(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_help_center(self, request)
        return Response(response)