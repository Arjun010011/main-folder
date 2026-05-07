from django.contrib.auth.models import Group, Permission
from knox.settings import knox_settings
from knox.views import LoginView as KnoxLoginView
from rest_framework import permissions, viewsets, exceptions
from rest_framework.views import Response, APIView
from rest_framework.generics import UpdateAPIView
from apps.classes.models.standard import StandardSectionMapping
from apps.institutes.models.institute import Institute
from apps.institutes.models import AcademicYear
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.shared.services import SharedService
from apps.students.models.student import Student
from apps.users.models import User
from apps.shared.models.groups_type import GroupType
from apps.users.serializers import (UserReportSerializer, UserSerializer, GroupSerializer, PermissionSerializer, UserGroupSerializer,
                                    UserReadSerializer, ChangePasswordSerializer, GroupTypeSerializer)
from apps.shared.utils import http_request
from django.conf import settings
import json

from apps.users.services.auth import (change_password_service,
                                      verify_email_address, user_login, generate_otp_for_mobile, verify_otp_for_sms_and_email)
from apps.users.services.permissions import create_contenttypes_and_permissions, create_permissions_map, IsAuthenticated
from apps.users.services.user import change_user_data, get_user_under_user_tree, switch_account, update_profile_pic, user_birthday_list, user_report_for_app
from apps.users.services.user_group import (add_group_data, update_data, read_group_permission_data, read_group_data,
                                            read_user_permission_data, add_user_group)

SERVER_URL = getattr(settings, 'SERVER_URL', None)


class CheckUserNameViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        if request.data['username']:
            kwargs = SharedService.get_edubricz_header(self)
            request.data['company'] = Institute.objects.first().company_id
            remote_response = http_request('POST', SERVER_URL + 'users/checkusernamenotexist/',
                                            json.dumps(request.data), **kwargs)
            if remote_response.status_code != 200:
                raise exceptions.ValidationError('Username already exist')
            if User.isUsernameExist(self, request.data['username']):
                raise exceptions.ValidationError('Username already exist')
            return Response({'Reason': True})
        raise exceptions.ValidationError('Username not provided')


class CreateUserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = User.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        queryset = User.objects.create_user(**request.data)
        return Response({'Reason': 'Sign up success!'})


class LoginView(KnoxLoginView):
    permission_classes = (permissions.AllowAny,)

    def get_token_ttl(self, appLogin=False):
        if appLogin:
            return timedelta(days=3000)
        return knox_settings.TOKEN_TTL

    def post(self, request, format=None):
        response = user_login(self, request, format)
        return Response(response)


class GroupViewSet(viewsets.ModelViewSet):
    serializer_class = GroupSerializer
    http_method_names = ['get', 'post', 'put', 'delete', 'patch']

    def get_queryset(self):
        self.queryset = Group.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_group_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_data(self, request.data, 'permissions', **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'Reason': 'Data deleted Successfully!'})

    def retrieve(self, request, *args, **kwargs):
        response = read_group_permission_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_group_data(self)
        return Response(response)

class GroupTypeViewSet(viewsets.ModelViewSet):
    serializer_class = GroupTypeSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = GroupType.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class PermissionViewSet(viewsets.ModelViewSet):
    serializer_class = PermissionSerializer
    http_method_names = ['get', 'post', 'put']

    def get_queryset(self):
        self.queryset = Permission.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = create_contenttypes_and_permissions(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = create_permissions_map(self, request.data, *args, **kwargs)
        return Response(response)


class UserViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['get', 'put', 'delete', 'patch']
    filterset_fields = ['groups', 'is_active']

    def get_queryset(self):
        filter = {'is_active': True}
        if self.request.GET.get('is_student'):
            filter = {'student__isnull': False}
        elif self.request.GET.get('is_staff'):
            filter = {'staff__isnull': False}
        self.queryset = User.objects.filter(**filter)
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = update_data(self, request.data, 'user_permissions', **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.get_queryset().filter(id=self.kwargs['pk']).update(is_active=False)
        return Response({'Reason': 'Data deleted Successfully!'})

    def retrieve(self, request, *args, **kwargs):
        response = read_user_permission_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        search_barcode = self.request.GET.get('search_barcode')
        if search_barcode:
            try:
                user_obj = User.objects.get(barcode_number=search_barcode)
            except:
                raise exceptions.ValidationError('Invalid Barcode')
            ser = UserReadSerializer(user_obj)
            response = {'data': ser.data}
            return Response(response)
        self.serializer_class = UserReadSerializer
        response = SharedService.read_data(self, True)
        page = self.request.GET.get('pageno')
        if not page and self.request.GET.get('page'):
            page = self.request.GET.get('page')
        if self.request.GET.get('pagination'):
            data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                            self.request.GET.get('limit'),
                                                                           page)
            return Response({'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}})
        return Response(response)


class UserGroupViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['post', 'patch', 'get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = User.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_user_group(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_data(self, request.data, 'groups', **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        self.serializer_class = UserGroupSerializer
        response = SharedService.read_data(self, True)
        return Response(response)


class ChangePasswordAPIView(UpdateAPIView):
    serializer_class = ChangePasswordSerializer
    model = User
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self, queryset=None):
        obj = self.request.user
        return obj

    def update(self, request, *args, **kwargs):
        response = change_password_service(self, request, *args, **kwargs)
        return Response(response)


from datetime import datetime, timedelta


class generateKey:
    @staticmethod
    def returnValue(phone):
        return str(phone) + str(datetime.date(datetime.now())) + "Some Random Secret Key"


# class GetEmailRegistered(APIView):
#     permission_classes = (permissions.AllowAny,)

#     @staticmethod
#     def get(request, email):
#         response = generate_otp_for_email(request, email)
#         return Response(response)

#     @staticmethod
#     def post(self, request, email):
#         response = verify_otp_for_sms_and_email(self, request, email)
#         return Response(response)


class OtpForMobileViewSet(KnoxLoginView):
    serializer_class = UserSerializer
    http_method_names = ['post']
    permission_classes = (permissions.AllowAny,)

    def get_token_ttl(self, appLogin=False):
        if appLogin:
            return timedelta(days=30000)
        return knox_settings.TOKEN_TTL

    def post(self, request, format=None):
        if 'is_verify' in request.data and request.data['is_verify']:
            response = verify_otp_for_sms_and_email(self, request)
        else:
            response = generate_otp_for_mobile(self, request)
        return Response(response)

# class GetPhoneNumberRegistered(APIView):
#     permission_classes = (permissions.AllowAny,)

#     @staticmethod
#     def get(request, mobile):
#         response = generate_otp_for_mobile(request, mobile)
#         return Response(response)

#     @staticmethod
#     def post(request, mobile):
#         response = verify_otp_for_sms(request, mobile)
#         return Response(response)


class VerifyEmailAPIView(APIView):
    permission_classes = (permissions.AllowAny,)

    @staticmethod
    def get(request, email):
        response = verify_email_address(request, email)
        return Response(response)


class UserProfilePicViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['put']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = User.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = update_profile_pic(self, request.data, *args, **kwargs)
        return Response(response)


class UserTreeStructureViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    

    def list(self, request, *args, **kwargs):
        response = get_user_under_user_tree(self, request)
        return Response(response)
        

class GetUserIdForUsernameViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        try:
            user_obj = User.objects.get(username=request.data['username']).values()[0]
            return Response({'user_id': user_obj['id'], 'user_data': user_obj})
        except:
            raise exceptions.ValidationError('Username doesnot exist')

class SwitchAccountAPIView(KnoxLoginView):
    serializer_class = UserSerializer
    http_method_names = ['post']

    def get_token_ttl(self, appLogin=False):
        if appLogin:
            return timedelta(days=30000)
        return knox_settings.TOKEN_TTL

    def post(self, request, format=None):
        response = switch_account(self, request)
        return Response(response)

class UpdateUserdataViewset(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['post']

    def create(self, request):
        response = change_user_data(self, request.data)
        return Response(response)

class UserReportViewSet(viewsets.ModelViewSet):
    serializer_class = UserReportSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = User.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        today_date = datetime.today()
        current_academic_year = AcademicYear.get_academic_year_for_date(self, today_date, False, True)
        student_standard_section_mapping = {}
        student_standard_mapping = {}
        standard_names = []
        enrollment_data = Enrollment.objects.filter(
            standard_section__academic_year=current_academic_year.id
        ).values(
           'standard_section', 'standard_section__standard', 'standard_section__section', 'student'
        )
        for enrollment in enrollment_data:
            student_standard_section_mapping[enrollment['student']] = enrollment
        student_standard_data = StudentStandardMapping.objects.filter(
            academic_year=current_academic_year.id
        ).values(
            'standard', 'student'
        )
        for student_standard in student_standard_data:
            student_standard_mapping[student_standard['student']] = student_standard

        # from_date_for_last_activity_days = self.request.GET.get('from_date_for_last_activity_days', 7)
        user_last_activity_from_date_time = self.request.GET.get('user_last_activity_from_date_time')
        if not user_last_activity_from_date_time:
            user_last_activity_from_date_time = str(datetime.today() - timedelta(days=1))
        else:
            user_last_activity_from_date_time += '.00'
        from_date_for_last_activity_days = (datetime.today() -  datetime.strptime(user_last_activity_from_date_time, '%Y-%m-%d %H:%M:%S.%f')).days
        user_filter = {'is_active': True}
        user_data = User.objects.filter(**user_filter).values(
            'staff', 'staff__first_name', 'staff__middle_name',
            'staff__last_name',
            'student', 'student__first_name', 'student__middle_name',
            'student__last_name', 'last_activity', 'last_login',
            'staff__dob', 'student__dob', 'student__current_standard'
        )
        standard_section_mapping = StandardSectionMapping.objects.filter(
            academic_year=current_academic_year.id
        ).values('standard', 'section', 'standard__name', 'section__name', 'id', 'standard__sequence')
        report_data = {
            'total_students': 0,
            'total_staffs': 0,
            'total_logged_in_students': 0,
            'total_logged_in_staffs': 0,
            'last_activity_students_based_on_date': 0,
            'last_activity_staffs_based_on_date': 0,
            'standard_categories': []
        }
        standard_report = {}
        standard_section_wise_report = {}
        staff = {
                'active_users': 0,
                'in_active_users': 0,
                'total_logged_in_users': 0,
                'total_not_logged_in_users': 0
        }
        for standard_section_d in standard_section_mapping:
            if standard_section_d['standard'] not in standard_report:
                standard_report[standard_section_d['standard']] = {
                    'standard': standard_section_d['standard'], 
                    'standard_name': standard_section_d['standard__name'],
                    'sequence': standard_section_d['standard__sequence'],
                    'active_users': 0, 'in_active_users': 0,
                    'total_logged_in_users': 0,
                    'total_not_logged_in_users': 0
                }
                standard_section_wise_report[standard_section_d['standard']] = {
                    'standard': standard_section_d['standard'], 'standard_name': standard_section_d['standard__name'],
                    'section_list': {}
                }
                standard_names.append(standard_section_d['standard__name'])
            if standard_section_d['id'] not in standard_section_wise_report[standard_section_d['standard']]['section_list']:
                standard_section_wise_report[standard_section_d['standard']]['section_list'][standard_section_d['id']] = {
                    'section_name': standard_section_d['section__name'],
                    'standard_section': standard_section_d['id'],
                    'section': standard_section_d['section'],
                    'active_users': 0, 'in_active_users': 0,
                    'total_logged_in_users': 0,
                    'total_not_logged_in_users': 0
                }
        for user in user_data:
            is_active_user = 0
            is_last_logged_in = 0
            if user['last_activity']:
                difference_days = (today_date - user['last_activity']).days
                if difference_days == 0 and (today_date - user['last_activity']):
                    report_data['last_activity_staffs_based_on_date'] += 1
                    is_active_user = 1
                elif difference_days > 0 and difference_days < from_date_for_last_activity_days:
                    report_data['last_activity_staffs_based_on_date'] += 1
                    is_active_user = 1
            if user['staff']:
                report_data['total_staffs'] += 1
                if user['last_login']:
                    report_data['total_logged_in_staffs'] += 1
                    is_last_logged_in += 1
                    staff['total_logged_in_users'] += 1
                else:
                    staff['total_not_logged_in_users'] += 1
                if is_active_user:
                    staff['active_users'] += 1
                else:
                    staff['in_active_users'] += 1

            elif user['student']:
                if user['last_activity']:
                    difference_days = (today_date - user['last_activity']).days
                    if difference_days == 0 and (today_date - user['last_activity']):
                        report_data['last_activity_students_based_on_date'] += 1
                        is_active_user = 1
                    elif difference_days > 0 and difference_days < from_date_for_last_activity_days:
                        report_data['last_activity_students_based_on_date'] += 1
                        is_active_user = 1
                report_data['total_students'] += 1
                if user['last_login']:
                    report_data['total_logged_in_students'] += 1
                    is_last_logged_in = 1
                if user['student'] in student_standard_mapping:
                    standard_id = student_standard_mapping[user['student']]['standard']
                    if standard_id in standard_report:
                        if is_last_logged_in:
                            standard_report[standard_id]['total_logged_in_users'] += 1
                        else:
                            standard_report[standard_id]['total_not_logged_in_users'] += 1
                        if is_active_user:
                            standard_report[standard_id]['active_users'] += 1
                        else:
                            standard_report[standard_id]['in_active_users'] += 1
        temp_report = {
            'standard_wise_active_users': [],
            'standard_wise_inactive_users': [],
            'standard_wise_logged_in_users': [],
            'standard_wise_not_logged_in_users': []
        }
        standard_report = sorted(standard_report.values(), key=lambda d: d['sequence'])
        report_data['standard_categories'].append('Staff')
        temp_report['standard_wise_active_users'].append(staff['active_users'])
        temp_report['standard_wise_inactive_users'].append(staff['in_active_users'])
        temp_report['standard_wise_logged_in_users'].append(staff['total_logged_in_users'])
        temp_report['standard_wise_not_logged_in_users'].append(staff['total_not_logged_in_users'])
        for standard_row in standard_report:
            #if you add any new key here add to staff also
            report_data['standard_categories'].append(standard_row['standard_name'])
            temp_report['standard_wise_active_users'].append(standard_row['active_users'])
            temp_report['standard_wise_inactive_users'].append(standard_row['in_active_users'])
            temp_report['standard_wise_logged_in_users'].append(standard_row['total_logged_in_users'])
            temp_report['standard_wise_not_logged_in_users'].append(standard_row['total_not_logged_in_users'])
        report_data['standard_report_series'] = [{
                'name': 'Active Users',
                'group': 'activity',
                'data': temp_report['standard_wise_active_users']
            },{
                'name': 'In Active Users',
                'group': 'activity',
                'data': temp_report['standard_wise_inactive_users']
            },{
                'name': 'Total Logged in Users',
                'group': 'logged',
                'data': temp_report['standard_wise_logged_in_users']
            },
            {
                'name': 'Total Not Logged in Users',
                'group': 'logged',
                'data': temp_report['standard_wise_not_logged_in_users']
            }]
        report_data['standard_section_wise_report'] = standard_section_wise_report
        return Response(report_data)

class UserBirthdayViewSet(viewsets.ModelViewSet):
    serializer_class = UserSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return User.objects.all()

    def list(self, request, *args, **kwargs):
        response = user_birthday_list(self)
        return Response(response)

class UserReportAppViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        return User.objects.all()

    def list(self, request, *args, **kwargs):
        response = user_report_for_app(self)
        return Response(response)