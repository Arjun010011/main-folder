import json

from django.contrib.auth.models import Permission, Group
from django.db import transaction
from django.db.models import F
from rest_framework import exceptions
from django.db.models import F

from apps.staffs.services.staff import validate_user_details
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.users.serializers import (GetGroupSerializer, PermissionSerializer, GetUserPermissionSerializer,
                                    UserSerializer)


def read_group_data(self):
    if self.request.GET.get('group_type'):
        group_type=self.request.GET.get('group_type')
        queryset = self.get_queryset().filter(reporting_group_mapping_group__group_type=group_type).values('id', 'name',
                                          reporting_group=F('reporting_group_mapping_group__reporting_group'))
    else:
        queryset = self.get_queryset().values('id', 'name',
                                          reporting_group=F('reporting_group_mapping_group__reporting_group'))

    return {'data': queryset}


def read_group_permission_data(self):
    queryset = self.get_object()
    serializer = GetGroupSerializer(queryset, context={'request': self.request})
    permissions = self.get_queryset().filter(permissions__group=self.kwargs['pk']).values_list('permissions',
                                                                                               flat=True)
    permission_queryset = Permission.objects.exclude(id__in=permissions)
    permission_serializer = PermissionSerializer(permission_queryset, many=True, context={'request': self.request})
    return {'data': {'group': serializer.data, 'available_permissions': permission_serializer.data}}


def add_group_data(self, data, **kwargs):
    if len(data['permissions']) != len(set(data['permissions'])):
        raise exceptions.ValidationError('Duplicate permissions found!')
    with transaction.atomic(using=get_current_db_name()):
        data['permissions'] = list(
            Permission.objects.filter(codename__in=data['permissions']).values_list('id', flat=True))
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return {'Reason': 'Data added Successfully!'}


def read_user_permission_data(self):
    queryset = self.get_object()
    serializer = GetUserPermissionSerializer(queryset, context={'request': self.request})
    user_permissions = self.get_queryset().filter(user_permissions__user=self.kwargs['pk']).values_list(
        'user_permissions', flat=True)
    group_permissions = self.get_queryset().filter(groups__user=self.kwargs['pk']).values_list(
        'groups', flat=True)
    groups = Group.objects.filter(permissions__group__in=group_permissions).values_list('permissions', flat=True)
    permission_queryset = Permission.objects.exclude(id__in=user_permissions).exclude(id__in=groups)
    permission_serializer = PermissionSerializer(permission_queryset, many=True, context={'request': self.request})
    return {'data': {'user': serializer.data, 'available_permissions': permission_serializer.data}}


def validate_app_permission(self, data, instance, key):
    f = open('apps/shared/templates/jsons/app_permission_list.json', )
    permissions = json.load(f)
    if key == 'user_permissions':
        instance = instance.groups.all().first()
    group = instance.pk
    for permission in permissions:
        if permission['action_code'] in data[key]:
            if permission['roles'] and group not in permission['roles']:
                raise exceptions.ValidationError(
                    f'{permission["name"]} permission cannot assign to group/users under group {instance}')


def update_data(self, data, key, **kwargs):
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    if key not in data:
        raise exceptions.ValidationError(f'Please provide proper {key}')
    if key in ['user_permissions', 'permissions']:
        if len(data[key]) != len(set(data[key])):
            raise exceptions.ValidationError(f'Duplicate {key} found!')
        if data['menu_type'] == 'app':
            validate_app_permission(self, data, instance, key)
            get_menu_type = ['visible', 'staff_app']
        elif data['menu_type'] == 'staff_app':
            get_menu_type = ['visible', 'app']
        else:
            get_menu_type = ['app', 'staff_app']
        if key == 'user_permissions':
            existing = []
            for menu_type in get_menu_type:
                existing += User.objects.filter(user_permissions__codename__startswith=menu_type,
                                           id=self.kwargs['pk']).values_list('user_permissions', flat=True)
        else:
            existing = []
            for menu_type in get_menu_type:
                existing += Group.objects.filter(permissions__codename__startswith=menu_type,
                                            id=self.kwargs['pk']).values_list('permissions', flat=True)
        data[key] = list(Permission.objects.filter(codename__in=data[key]).values_list('id', flat=True)) + list(
            existing)
    elif key in ['groups']:
        if len(data['groups']) > 1:
            raise exceptions.ValidationError(f'user {data["user"]} can be assigned to max 1 group')
        if 1 in data['groups']:
            raise exceptions.ValidationError('Cannot assign to Super Admin group')
        validate_user_details(self, data)
    with transaction.atomic(using=get_current_db_name()):
        serializer = self.get_serializer(instance=instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return {'Reason': 'Data updated Successfully!'}


def add_user_group(self, data):
    with transaction.atomic(using=get_current_db_name()):
        for user in data:
            if len(user['groups']) > 1:
                raise exceptions.ValidationError(f'user {user["user"]} can be assigned to max 1 group')
            if 1 in user['groups']:
                raise exceptions.ValidationError('Cannot assign to Super Admin group')
            validate_user_details(self, user)
            self.kwargs['pk'] = user['user']
            instance = self.get_object()
            add_user_to_groups(self, user, instance)
        return {'Reason': 'Data updated Successfully!'}


def add_user_to_groups(self, data, instance):
    serializer = UserSerializer(instance=instance, data=data, partial=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Data Saved Successfully '}
