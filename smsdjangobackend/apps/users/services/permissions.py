import datetime
import json
from django.utils import timezone
from datetime import timedelta

from django.db import transaction
from knox.auth import TokenAuthentication
from knox.settings import knox_settings
from rest_framework import exceptions
from rest_framework.authentication import get_authorization_header
from rest_framework.permissions import BasePermission
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.models import ContentType
from django.contrib.auth.models import Permission

from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from django.conf import settings

from apps.users.services.permissions_map import permission_map

EDUBRICZ_SIGNUP_COMMUNICATION_KEY = getattr(settings, 'EDUBRICZ_SIGNUP_COMMUNICATION_KEY', None)


def get_permission(old_codename, new_codename, app_label, contentType):
    default_permissions = ('add', 'change', 'delete', 'view')
    perms = {}
    screen_name_type = ''
    if app_label == 'screen_name':
        screen_name_type = 'visible'
    elif app_label == 'app_screen_name':
        screen_name_type = 'app'
    elif app_label == 'staff_app_screen_name':
        screen_name_type = 'staff_app'
    for action in default_permissions:
        perms.update({'%s_%s_%s' % (screen_name_type, old_codename, action): {
            'name': 'Can %s %s %s' % (screen_name_type, action, new_codename),
            'codename': '%s_%s_%s' % (screen_name_type, new_codename, action), 'content_type': contentType}})
    return perms

def get_basename_from_url(self, request):
    return request.path.split('/')[3]

def create_contenttypes_and_permissions(self,data):
    new_screen_name = []
    duplicate_new_screen_name = []
    old_screen_name = []
    duplicate_old_screen_name = []
    contentType = ContentType.objects.all()
    content_types = dict(contentType.filter(app_label__in=data.keys()).values_list('model', 'id'))
    excluded_content_types = contentType.exclude(app_label__in=data.keys()).values_list('model', flat=True)
    error = {'old_code': [], 'new_code': []}
    for app_label, value in data.items():
        for basename in value:
            if basename['new_code'] in excluded_content_types:
                error['new_code'].append(basename['new_code'])
            if basename['old_code'] in excluded_content_types:
                error['old_code'].append(basename['old_code'])
            if basename['new_code'] in new_screen_name:
                duplicate_new_screen_name.append(basename['new_code'])
            else:
                new_screen_name.append(basename['new_code'])
            if basename['old_code'] in old_screen_name:
                duplicate_old_screen_name.append(basename['old_code'])
            else:
                old_screen_name.append(basename['old_code'])
    if error['old_code'] or error['new_code']:
        raise exceptions.ValidationError(f'Avoid giving the following codes: {error}')
    if duplicate_old_screen_name:
        raise exceptions.ValidationError(f'Duplicate old codes found: {duplicate_old_screen_name}')
    if duplicate_new_screen_name:
        raise exceptions.ValidationError(f'Duplicate new codes found: {duplicate_new_screen_name}')
    with open('apps/users/services/codename_map.py', 'w') as dict_file:
        dict_file.write('codename_map = ' + json.dumps(data, indent=4))
    return {'Reason': 'Data updated successfully.'}

def save_content_type_and_permission(self, data):
    new_screen_name = []
    duplicate_new_screen_name = []
    old_screen_name = []
    duplicate_old_screen_name = []
    contentType = ContentType.objects.all()
    content_types = dict(contentType.filter(app_label__in=data.keys()).values_list('model', 'id'))
    excluded_content_types = contentType.exclude(app_label__in=data.keys()).values_list('model', flat=True)
    error = {'old_code': [], 'new_code': []}
    for app_label, value in data.items():
        for basename in value:
            if basename['new_code'] in excluded_content_types:
                error['new_code'].append(basename['new_code'])
            if basename['old_code'] in excluded_content_types:
                error['old_code'].append(basename['old_code'])
            if basename['new_code'] in new_screen_name:
                duplicate_new_screen_name.append(basename['new_code'])
            else:
                new_screen_name.append(basename['new_code'])
            if basename['old_code'] in old_screen_name:
                duplicate_old_screen_name.append(basename['old_code'])
            else:
                old_screen_name.append(basename['old_code'])
    if error['old_code'] or error['new_code']:
        raise exceptions.ValidationError(f'Avoid giving the following codes: {error}')
    if duplicate_old_screen_name:
        raise exceptions.ValidationError(f'Duplicate old codes found: {duplicate_old_screen_name}')
    if duplicate_new_screen_name:
        raise exceptions.ValidationError(f'Duplicate new codes found: {duplicate_new_screen_name}')
    permission = Permission.objects.all()
    with transaction.atomic(using=get_current_db_name()):
        for app_label, value in data.items():
            for basename in value:
                if basename['new_code'] in content_types:
                    del content_types[basename['new_code']]
                else:
                    obj, created = contentType.update_or_create(model=basename['old_code'],
                                                                defaults={'model': basename['new_code'],
                                                                          'app_label': app_label})
                    if not created:
                        del content_types[basename['old_code']]
                    perms = get_permission(basename['old_code'], basename['new_code'], app_label, obj)
                    for old_perms, new_perms in perms.items():
                        permission.update_or_create(codename=old_perms, defaults=new_perms)
        # contentType.filter(id__in=content_types.values()).delete()
        # permission.filter(content_type__in=content_types.values()).delete()
    return {'Reason': 'Data updated successfully.'}


def create_permissions_map(self, data, *args, **kwargs):
    with open('apps/users/services/permissions_map.py', 'w') as dict_file:
        dict_file.write('permission_map = ' + json.dumps(data, indent=4))
    return {'Reason': 'Data updated successfully.'}


def check_is_api_allowed_for_signup(self, request):
    allowed_base_names = {
        'company_POST', 'company_PUT', 'serveroperations_POST', 'urlsmenu_GET', 'urlsoperation_POST', 'login_POST',
        'otpdata_POST', 'getuseridforusername_POST', 'syncdatas_POST'
    }
    request_method_name = request.method
    requested_base_name = get_basename_from_url(self, request) + '_' + request_method_name
    if requested_base_name in allowed_base_names:
        return True
    msg = ('User dont have permission to access this api')
    raise exceptions.AuthenticationFailed(msg)


class CustomTokenAuthentication(TokenAuthentication):
    '''
    This authentication scheme uses Knox AuthTokens for authentication.

    Similar to DRF's TokenAuthentication, it overrides a large amount of that
    authentication scheme to cope with the fact that Tokens are not stored
    in plaintext in the database

    If successful
    - `request.user` will be a django `User` instance
    - `request.auth` will be an `AuthToken` instance
    '''

    @classmethod
    def renew_token(cls, request, auth_token) -> None:
        current_expiry = auth_token.expiry
        inc_time = settings.REST_KNOX['TOKEN_TTL']
        if request.GET.get('device_type') and int(request.GET.get('device_type')) in [1, 2]: # For Android and IOS requests
            inc_time = timedelta(days=30)
        new_expiry = timezone.now() + inc_time
        auth_token.expiry = new_expiry
        # Throttle refreshing of token to avoid db writes
        delta = (new_expiry - current_expiry).days
        if delta > 1:
            auth_token.save(update_fields=('expiry',))

    def authenticate(self, request):
        communication_key_signup = request.headers['Edubricz-Communitcation-Key'] if 'Edubricz-Communitcation-Key' in request.headers else None
        if EDUBRICZ_SIGNUP_COMMUNICATION_KEY and communication_key_signup == EDUBRICZ_SIGNUP_COMMUNICATION_KEY and request.META.get('HTTP_USER') == 'empty_user_#_1_#_1_#':
            check_is_api_allowed_for_signup(self, request)
            return None
        # Here we give admin access to signup database
        if EDUBRICZ_SIGNUP_COMMUNICATION_KEY and communication_key_signup == EDUBRICZ_SIGNUP_COMMUNICATION_KEY and request.META.get('HTTP_USER') == 'select_default_user_#_1_#_1_#':
            check_is_api_allowed_for_signup(self, request)
            user = User.objects.filter(is_active=True, is_superuser=True).first()
            if not user:
                msg = _('No Super User')
                raise exceptions.AuthenticationFailed(msg)
            return user,None
        auth = get_authorization_header(request).split()
        prefix = knox_settings.AUTH_HEADER_PREFIX.encode()
        if not auth or auth[0].lower() != prefix.lower():
            return None
        if len(auth) == 1:
            msg = _('Invalid token header. No credentials provided.')
            raise exceptions.AuthenticationFailed(msg)
        elif len(auth) > 2:
            msg = _('Invalid token header. '
                    'Token string should not contain spaces.')
            raise exceptions.AuthenticationFailed(msg)
        user, auth_token = self.authenticate_credentials(auth[1])
        try: #avoiding the error
            now = datetime.datetime.now()
            if not user.last_activity or (now-user.last_activity).seconds > 300:
                User.objects.filter(id=user.id).update(
                    last_activity = now
                )
        except:
            pass
        CustomTokenAuthentication.renew_token(request, auth_token)
        return user, auth_token


class IsAuthenticated(BasePermission):
    """
    Allows access only to authenticated users.
    """

    def has_permission(self, request, view):
        return True
        if request.headers.get('Edubricz-Communitcation-Key') == EDUBRICZ_SIGNUP_COMMUNICATION_KEY:
            return True
        return bool(request.user and request.user.is_authenticated)

class OnlyListAccess(BasePermission):

    def has_permission(self, request, view):
        if view.action == 'list':
            return True
        obj = CustomBasePermissions()
        return obj.has_permission(request, view)

class OnlyCreateAccess(BasePermission):

    def has_permission(self, request, view):
        if view.action == 'create':
            return True
        obj = CustomBasePermissions()
        return obj.has_permission(request, view)

"""
    pk should be the staff id 
"""
class OnlyRetrieveAccessForStaffData(BasePermission):

    def has_permission(self, request, view):
        if view.action == 'retrieve':
            if request.user.is_superuser:
                return True
            if str(request.user.staff.id) == str(view.kwargs['pk']):
                return True
        obj = CustomBasePermissions()
        return obj.has_permission(request, view)

class OnlyRetrieveAccessForStudentData(BasePermission):
    
    def has_permission(self, request, view):
        if view.action == 'retrieve':
            if str(request.user.student.id) == str(view.kwargs['pk']):
                return True
        obj = CustomBasePermissions()
        return obj.has_permission(request, view)

class CustomBasePermissions(BasePermission):
    perms_map = {
        'GET': 'view_%(basename)s',
        'OPTIONS': '',
        'HEAD': '',
        'POST': 'add_%(basename)s',
        'PUT': 'change_%(basename)s',
        'PATCH': 'change_%(basename)s',
        'DELETE': 'delete_%(basename)s',
    }

    authenticated_users_only = True

    def get_required_permissions(self, request, view):
        """
        Given a model and an HTTP method, return the list of permission
        codes that the user is required to have.
        """
        return True
        kwargs = {}
        if 'basename' in view.__dict__:
            kwargs.update({'basename': view.basename})
        else:
            kwargs.update({'basename': get_basename_from_url(self, request)})
        if request.method not in self.perms_map:
            raise exceptions.MethodNotAllowed(request.method)
        api_codename = self.perms_map[request.method] % kwargs
        for permission in request.user.get_all_permissions():
            permission = permission.split('.')[1]
            if permission not in permission_map:
                continue
            if api_codename in permission_map[permission]:
                return True
        return False

    def has_permission(self, request, view):
        return True
        if not request.user or (
                not request.user.is_authenticated and self.authenticated_users_only):
            return False
        if request.user.is_superuser or any(
                item in request.user.groups.all().values_list('id', flat=True) for item in [1, 2]):
            return True
        perms = self.get_required_permissions(request, view)
        return perms
