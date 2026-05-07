from django.db import models
from django.db.models import F
from django.contrib.auth.models import PermissionsMixin
from django.contrib.auth.base_user import AbstractBaseUser
from rest_framework import exceptions

from apps.shared.constants import STUDENT_GROUP
from apps.users.managers import UserManager
from apps.staffs.models.staff import Staff
from apps.students.models.student import Student

from django.contrib.auth.models import Group
from apps.shared.models.groups_type import GroupType
from cryptography.fernet import Fernet


class User(AbstractBaseUser, PermissionsMixin):
    username = models.CharField(max_length=255, unique=True)
    password = models.CharField(max_length=255)
    password_two = models.CharField(max_length=255,null=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    staff = models.OneToOneField(Staff, related_name='users', on_delete=models.CASCADE, blank=True, null=True)
    student = models.OneToOneField(Student, related_name='user_student', on_delete=models.CASCADE, blank=True, null=True)
    reporting_to = models.ForeignKey('self', null=True, related_name='user_reporting_to', on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    last_activity = models.DateTimeField(null=True, blank=True)
    objects = UserManager()
    barcode_number = models.CharField(max_length=255,null=True,blank=True)
    barcode_url = models.CharField(max_length=255,null=True)

    USERNAME_FIELD = 'username'

    def __str__(self):
        return self.username

    def isUsernameExist(self, username):
        return User.objects.filter(username=username).exists()

    def get_my_staff_id(self, raiseException=True):
        obj = User.objects.get(id=self.request.user.id)
        if obj.is_superuser and raiseException:
            raise exceptions.ValidationError('Super Admin doesnot have access')
        return obj.staff_id

    def create_login_for_staff(self, data):
        if not data['groups']:
            raise exceptions.ValidationError('Please provide groups for user')
        if not data['reporting_to']:
            raise exceptions.ValidationError('Please provide reporting to for Staff')
        if 'mobile_num' not in data:
            data['mobile_num'] = None
        if 'email' not in data:
            data['email'] = None
        saveData = {'staff_id': data['staff'], 'is_staff': 1, 'groups': data['groups'],
                    'reporting_to_id': data['reporting_to'], 'mobile_num': data['mobile_num'], 'email': data['email']}
        User.objects.create_user(data['username'], data['password'], **saveData)
        return {'Result': True, 'Reason': 'User login created'}

    def create_login_for_student(self, data):
        if 'mobile_num' not in data:
            data['mobile_num'] = None
        if 'email' not in data:
            data['email'] = None
        saveData = {'student_id': data['student'], 'is_staff': 0, 'groups': [STUDENT_GROUP], 'mobile_num': data['mobile_num'], 'email': data['email']}
        User.objects.create_user(data['username'], data['password'], **saveData)
        return {'Result': True, 'Reason': 'User login created'}

    def getUserHierarchy(self, userId=None, isStaff=True, returnStaffIds=False):
        if not userId:
            userId = self.request.user.id
        from apps.shared.services import ConfigurationService
        userHierarchySetting = ConfigurationService.get_setting_value('userReportingToForHierarchy')
        reportingUserIds = []
        query = 'id'
        if self.request.user.is_superuser:
            if returnStaffIds:
                query = 'staff'
            reportingUserIds = User.objects.filter(is_staff=isStaff, is_superuser=0).values_list(query, flat=True)
        elif int(userHierarchySetting) == 1:
            reportingUserIds = User.get_only_user_reporting(self, userId, isStaff, returnStaffIds)
        elif int(userHierarchySetting) == 2:
            reportingUserIds = User.get_user_under_users(self, userId, reportingUserIds, isStaff, returnStaffIds)
        else:
            reportingUserIds = User.get_user_hierarchy_based_on_roles(self, isStaff, returnStaffIds)
        return reportingUserIds

    def get_user_under_users(self, userId, reportingUserIds, isStaff=1, returnStaffIds=False):
        query = 'id'
        if returnStaffIds:
            query = 'staff'
        userReportingUsers = list(User.objects.filter(reporting_to=userId, is_staff=isStaff, is_superuser=0). \
                                  values_list(query, flat=True))
        for userid in userReportingUsers:
            reportingUserIds.append(userid)
            User.get_user_under_users(self, userid, reportingUserIds)
        return reportingUserIds

    def get_only_user_reporting(self, userId, isStaff=1, returnStaffIds=False):
        query = 'id'
        if returnStaffIds:
            query = 'staff'
        return User.objects.filter(reporting_to=userId, is_staff=isStaff, is_superuser=0).values_list(query, flat=True)

    def get_user_hierarchy_based_on_roles(self, isStaff=1, returnStaffIds=False):
        query = 'id'
        if returnStaffIds:
            query = 'staff'
        reporting_mapping = {}
        reporting_data = ReportingGroupMapping.objects.filter().values()
        for report in reporting_data:
            for group_id in report['reporting_group'].split(','):
                if group_id not in reporting_mapping:
                    reporting_mapping[group_id] = set()
                reporting_mapping[group_id].add(report['group_id'])
        if str(self.request.user.groups.first().id) not in reporting_mapping:
            group_ids = []
        else:
            group_ids = list(reporting_mapping[str(self.request.user.groups.first().id)])
        return User.objects.filter(groups__id__in=group_ids, is_staff=isStaff, is_superuser=0).values_list(query,
                                                                                                          flat=True)

class Otp(models.Model):
    mobile_or_email = models.CharField(max_length=255, blank=True, null=True)
    is_verified = models.IntegerField(default=0, blank=True)
    counter = models.IntegerField(default=0, blank=False)
    is_email = models.IntegerField(default=0)

    def __str__(self):
        return str(self.mobile)


class ReportingGroupMapping(models.Model):
    group = models.OneToOneField(Group, null=True, related_name='reporting_group_mapping_group',
                                 on_delete=models.SET_NULL)
    reporting_group = models.CharField(default="1", blank=True, null=True, max_length=255)
    group_type = models.ForeignKey(GroupType, on_delete=models.CASCADE,default=2) #1->teaching staff , we can use other flag for any
