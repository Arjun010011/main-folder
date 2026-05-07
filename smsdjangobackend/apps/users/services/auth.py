from apps.bdu.services import student
import base64
import json
from datetime import datetime
from django.db import transaction

import pyotp
from django.conf import settings
from django.contrib.auth import login, user_logged_in
from django.core.exceptions import ObjectDoesNotExist
from django.utils import timezone
from knox.models import AuthToken
from rest_framework import exceptions, status
from rest_framework.authtoken.serializers import AuthTokenSerializer
from rest_framework.response import Response
from django.db.models import Q
from apps.classes.models.standard import Board, Branch

from apps.institutes.models import Institute
from apps.institutes.models.visitor import Visitor
from apps.notification.models.notification import NotificationVendor
from apps.shared.models.configuration import Setting
from apps.shared.models.custom import FormDefinition
from apps.shared.models.menu import Menu
from apps.shared.serializers import MenuSerializer, GetSettingSerializer
from apps.shared.services import FormdefinitionService, SharedService, UploadTypeService
from apps.shared.utils import http_request
from apps.users.models import Otp, User
from apps.notification.services.notification_service import send_notification
from apps.users.serializers import LoginUserSerializer, UserReadSerializer, UserSerializer
from apps.users.services.default_variables import OtpEmailFormat, OtpMessageFormat
from apps.notification.services.notification_service import register_push
from django.contrib.auth.models import Group, Permission
from apps.tenants.services.middlewares import get_current_db_name


SERVER_URL = getattr(settings, 'SERVER_URL', None)

INTERVAL = 1800

def remove_unused_data(data):
    data.pop('staff_id', None)
    data.pop('student_id', None)
    data.pop('groups', None)
    data.pop('reporting_to_id', None)


def central_sign_up(self, data):
    data['company_id'] = Institute.get_institute(self).company_id
    kwargs = SharedService.get_edubricz_header(self)
    remove_unused_data(data)  # when staff_id is set want to remove staff_id key
    remote_response = http_request('POST', SERVER_URL + 'users/signup/', json.dumps(data), **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
    return True

def update_mobile_and_email_signup(self, userid, mobile, email, isStaff=False):
    data = {}
    data['company_id'] = Institute.get_institute(self).company_id
    data['email'] = email
    data['mobile_num'] = mobile
    userObj = User.objects.get(id=userid)
    data['username'] = userObj.username
    data['password'] = userObj.password
    data['is_staff'] = isStaff
    kwargs = SharedService.get_edubricz_header(self)
    remote_response = http_request('PUT', SERVER_URL + 'users/signup/'+str(userid)+'/', json.dumps(data), **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
    return True

def change_password_service(self, request, *args, **kwargs):
    self.object = self.get_object()
    oldPasswordNotRequired = self.request.GET.get('old_password_not_required', False)
    if not oldPasswordNotRequired and not request.data['old_password']:
        raise exceptions.ValidationError('Old password is required')
    serializer = self.get_serializer(data=request.data)
    with transaction.atomic(using=get_current_db_name()):
        if serializer.is_valid():
            if not oldPasswordNotRequired and not self.object.check_password(serializer.data.get("old_password")):
                raise exceptions.ValidationError('Old password didnot matched')
            self.object.set_password(serializer.data.get("new_password"))
            self.object.save()
            expire_all_token_for_user(self.request.user)
            request.data['username'] = self.object.username
            request.data['company'] = Institute.get_institute(self).company_id
            update_to_server(self, request.data)
            return {'Reason': 'Password updated successfully'}
    return {'Reason': serializer.errors}

def update_to_server(self, data):
    kwargs = SharedService.get_edubricz_header(self)
    remote_response = http_request('POST', SERVER_URL + 'users/changepassword/', json.dumps(data), **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
    return remote_response

def update_username_password_bulk(self, data):
    data['company'] = Institute.get_institute(self).company_id
    kwargs = SharedService.get_edubricz_header(self)
    remote_response = http_request('POST', SERVER_URL + 'users/changeuserdatabulk/', json.dumps(data), **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
    return remote_response

def expire_all_token_for_user(userId, isList=False):
    from knox.models import AuthToken
    if isList:
        filter_query = {'user__in': userId}
    else:
        filter_query = {'user': userId}
    AuthToken.objects.filter(**filter_query).update(expiry=datetime.now())


class generateKey:
    @staticmethod
    def returnValue(phone):
        return str(str(phone) + str(datetime.date(datetime.now())) + '671237723').lower()


def generate_otp_for_mobile(self, request):
    mobile = request.data['mobile_num'] if 'mobile_num' in request.data else None
    email = request.data['email'] if 'email' in request.data else None
    from apps.staffs.models import Staff
    from apps.students.models import Student
    app_type = self.request.GET.get('app_type')
    otp_for = request.data.get('otp_for')
    if mobile:
        if not app_type or app_type == 'staff':
            staffObj = Staff.objects.filter(mobile_num=mobile).first()
        if not app_type or app_type == 'student':
            studentObj = Student.objects.filter(mobile_num=mobile).first()
    elif email:
        if not app_type or app_type == 'staff':
            staffObj = Staff.objects.filter(email=email).first()
        if not app_type or app_type == 'student':
            studentObj = Student.objects.filter(email=email).first()
    if not mobile and not email:
        raise exceptions.ValidationError('Mobile Number or Email should be provided')
    if otp_for == 'visitor':
        pass
    else:
        if not staffObj and not studentObj:
            raise exceptions.ValidationError('Given Mobile/Email Doesnot exist')
    try:
        otpModel = Otp.objects.get(
            mobile_or_email=mobile
        )
    except ObjectDoesNotExist:
        if mobile:
            otpModel = Otp.objects.create(mobile_or_email=mobile)
        elif email:
            otpModel = Otp.objects.create(mobile_or_email=email, is_email=True)
    otpModel.counter += 1
    otpModel.is_verified = 0
    otpModel.save()
    keygen = generateKey()
    if mobile:
        key = base64.b32encode(keygen.returnValue(mobile).encode())
    elif email:
        key = base64.b32encode(keygen.returnValue(email).encode())
    otp = pyotp.TOTP(key, interval=INTERVAL)
    companyName = Institute.get_institute(self).name
    if mobile:
        vendor_detail = NotificationVendor.objects.filter(notification_medium='sms', is_active=True).first()
        sms_brand_name = 'Edubricz'
        if vendor_detail and vendor_detail.brand_name:
            sms_brand_name = vendor_detail.brand_name
        body = OtpMessageFormat.format(otp=otp.now(), institute_name=companyName, sms_brand_name=sms_brand_name)
        if 'hash' in request.data:
            body += request.data['hash']
        print(body,'databody')
        # send_notification('otpforemail__retrive', '', [], [
        #     {'mobile_number': mobile, 'user_id': None, 'sms_body': body, 'sms_notification': 2}],
        #     allowableMedium=['sms'])
    elif email:
        body = OtpEmailFormat.format(otp=otp.now(), institute_name=companyName)
        send_notification('otpforemail__retrive', '', [], [{'email': email, 'user_id': None,
    'email_subject': 'Login Otp', 'email_body': body,'email_notification':1}], allowableMedium=['email'])
    # SharedService.send_email('Edubricz Otp', body, email)
    return {'Reason': 'Otp sent successfully'}


def verify_otp_for_sms_and_email(self, request):
    from knox.models import AuthToken
    mobile = request.data['mobile_num'] if 'mobile_num' in request.data else None
    email = request.data['email'] if 'email' in request.data else None
    userId = request.data['user'] if 'user' in request.data else None
    otp_for = request.data['otp_for'] if 'otp_for' in request.data else None
    userData = []
    try:
        tempKey = ''
        if mobile:
            tempKey = mobile
        else:
            tempKey = email
        otpModel = Otp.objects.filter(mobile_or_email=tempKey).last()
    except Exception as e:
        raise exceptions.ValidationError('Invalid Otp')
    query = {}
    if otp_for == 'visitor':
        pass
    else:
        if mobile:
            query = Q(staff__mobile_num=mobile)|Q(student__mobile_num=mobile)
        if email:
            query = Q(staff__email=email)|Q(student__email=email)

        if userId:
            userData = User.objects.filter(query,id=userId, is_active=True)
        else:
            userData = User.objects.filter(query, is_active=True)
        if self.request.GET.get('app_type') == 'student':
            userData = userData.filter(Q(is_superuser=True) | Q(staff__isnull=True))
        if self.request.GET.get('app_type') == 'staff':
            userData = userData.filter(Q(is_superuser=True) | Q(student__isnull=True))
        if len(userData) == 0:
            raise exceptions.ValidationError('User does not exist')
    response = {
        'Reason': 'Authorized',
        'data': {
            'userdetail': []
        }
    }
    keygen = generateKey()
    key = base64.b32encode(keygen.returnValue(tempKey).encode())
    otp_key = pyotp.TOTP(key, interval=INTERVAL)
    if otp_key.verify(request.data['otp']):
        otpModel.is_verified = True
        otpModel.save()
    else:
        raise exceptions.ValidationError('Invalid Otp')
    if otp_for == 'visitor':
        pass
    elif len(userData) == 1:
        for user_obj in userData:
            if 'fcm_data' in request.data and request.data['fcm_data']:
                SharedService.custom_thread(register_push, self, request.data['fcm_data'], user_obj.id)
            temp = user_login(self, request, None, {
                'data': {
                    'user_obj': user_obj
                }
            })
            temp = temp['data']
            response['data']['userdetail'].append(temp)
    elif len(userData) > 1:
        response['data']['userdetail'] = UserReadSerializer(userData, many=True).data
    return response


def verify_email_address(request, email):
    import boto3
    client = boto3.client('ses', region_name='ap-south-1')
    response = client.verify_email_identity(EmailAddress=email)
    return {'data': 'Email Verfication sent to your email please check your inbox to get mail - Edubricz'}


def get_login(self, request, format=None):
    token_limit_per_user = self.get_token_limit_per_user()
    if token_limit_per_user is not None:
        now = timezone.now()
        token = request.user.auth_token_set.filter(expiry__gt=now)
        if token.count() >= token_limit_per_user:
            return Response(
                {"error": "Maximum amount of tokens allowed per user exceeded."},
                status=status.HTTP_403_FORBIDDEN
            )
    token_ttl = self.get_token_ttl(request.data.get('app_central_login', False))
    instance, token = AuthToken.objects.create(request.user, token_ttl)
    user_logged_in.send(sender=request.user.__class__,
                        request=request, user=request.user)
    data = self.get_post_response_data(request, token, instance)
    return Response(data)


"""
    whatever data is added or removed please add those data to 
    'verify_otp_for_sms_and_email'
"""
def user_login(self, request, format=None, extra_params={}):
    response = {'Reason': 'Logged in Successfully!'}
    UploadTypeService.set_bucket_folder_path()
    app_type = extra_params['app_type'] if extra_params.get('app_type') else self.request.GET.get('app_type')
    data = extra_params['data'] if extra_params.get('data') else request.data
    if 'data' in extra_params and 'user_obj' in extra_params['data']:
        user = extra_params['data']['user_obj']
    else:
        serializer = AuthTokenSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
    if user.is_superuser:
        pass
    elif app_type == 'student':
        if user.staff_id:
            raise exceptions.ValidationError('Please use staff app for login')
    elif app_type == 'staff':
        if user.student_id:
            raise exceptions.ValidationError('Please use student app for login')
    login(request, user)
    res = get_login(self, request, format)
    if res.status_code == 200:
        response['data'] = res.data
        setting_data = Setting.objects.filter(is_active=1)
        setting_data = GetSettingSerializer(setting_data, many=True).data
        setting_data = {setting['name']: setting for setting in setting_data}
        response['data']['settings'] = setting_data
        response['data']['user']['other_details'] = SharedService.get_current_details_for_user(self)['data']
        response['data']['branches'] = Branch.objects.all().values()
        response['data']['boards'] = Board.objects.all().values()
        institutedata = Institute.objects.filter().values()[0]
        response['data']['user']['institute_details'] = institutedata
        groups = list()
        for group in res.data['user']['groups']:
            for permission in group.pop('permissions'):
                groups.append(permission)
        response['data']['user']['groups'] = set(groups)
        if not request.data.get('app_central_login', False):
            queryset = Menu.objects.filter(menu_type='web')
        else:
            if app_type == 'staff':
                app_type = 'staff_app'
            elif app_type == 'student':
                app_type = 'app'
            queryset = Menu.objects.filter(menu_type=app_type)
            response['data']['formdefintion'] = FormdefinitionService.get_formdefinition_for_app(self)
        serializer = MenuSerializer(queryset, many=True)
        response['data']['menu'] = serializer.data
        if 'fcm_data' in request.data and request.data['fcm_data']:
            SharedService.custom_thread(register_push, self, request.data['fcm_data'])
        return response
