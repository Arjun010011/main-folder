from django.contrib.auth.models import Group, Permission
from rest_framework import serializers

from apps.staffs.models import Staff
from apps.students.serializers import StudentSerializer
from apps.users.models.user import User,ReportingGroupMapping
from apps.shared.models.groups_type import GroupType
from apps.shared.serializers import DocumentSerializer
from apps.shared.services_shared.common import get_full_name


class StaffSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    full_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['id', 'profile_pic_details', 'full_name', 'first_name', 'middle_name',
                    'last_name', 'mobile_num', 'email', 'group_name']


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'

class UserReportSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    student = StudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'staff', 'student', 'last_activity']


class UserReadSerializer(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    student = StudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'staff', 'student']


class FilteredListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        if self.context.get('request'):
            menu_type = self.context['request'].GET.get('menu_type')
            if menu_type:
                if menu_type == 'web':
                    codename = 'visible'
                elif menu_type == 'staff_app':
                    codename = 'staff_app'
                else:
                    codename = 'app'
                data = data.filter(codename__startswith=codename)
        return super(FilteredListSerializer, self).to_representation(data)


class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        list_serializer_class = FilteredListSerializer
        model = Permission
        fields = '__all__'


class GetGroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = '__all__'


class GroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = '__all__'

class GroupTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = GroupType
        fields = '__all__'


class GetUserPermissionSerializer(serializers.ModelSerializer):
    user_permissions = PermissionSerializer(many=True, read_only=True)
    groups = GetGroupSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['user_permissions', 'groups']


class LoginPermissionSerializer(serializers.ModelSerializer):

    def to_representation(self, instance):
        representation = super(LoginPermissionSerializer, self).to_representation(instance)
        codename = representation.pop('codename')
        return codename

    class Meta:
        model = Permission
        fields = ['codename']


class LoginGroupSerializer(serializers.ModelSerializer):
    permissions = LoginPermissionSerializer(many=True, read_only=True)

    class Meta:
        model = Group
        fields = ['permissions']


class LoginUserSerializer(serializers.ModelSerializer):
    user_permissions = LoginPermissionSerializer(many=True, read_only=True)
    groups = LoginGroupSerializer(many=True, read_only=True)
    staff = StaffSerializer(read_only=True)
    student = StudentSerializer(read_only=True)
    group_name = serializers.SerializerMethodField(read_only=True)
    group_id = serializers.SerializerMethodField(read_only=True)

    def get_group_id(self, obj):
        return obj.groups.values_list('id', flat=True)

    def get_group_name(self, obj):
        return obj.groups.values_list('name', flat=True)

    class Meta:
        model = User
        exclude = ['password']


class GroupNameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Group
        fields = ['id', 'name']


class StaffGetNameSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['id', 'full_name', 'mobile_num']

class UserReadSerializerStaffAndStudentDetail(serializers.ModelSerializer):
    staff = StaffSerializer(read_only=True)
    student = StudentSerializer(read_only=True)
    groups = GroupNameSerializer(many=True, read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'staff', 'student', 'groups', 'reporting_to']


class UserGroupSerializer(serializers.ModelSerializer):
    groups = GroupNameSerializer(many=True, read_only=True)
    reporting_to = UserReadSerializerStaffAndStudentDetail(read_only=True)
    staff = StaffGetNameSerializer(read_only=True)
    student = StudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'groups', 'reporting_to', 'staff', 'student','barcode_url', 'barcode_number']


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=False)
    new_password = serializers.CharField(required=True)

    class Meta:
        model = User
        fields = ['*']
