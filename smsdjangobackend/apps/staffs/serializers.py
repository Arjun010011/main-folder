from django.utils.translation import gettext_lazy as _

from rest_framework import serializers
from datetime import datetime
from apps.staffs.models import staff_standard, StaffSalary
from apps.staffs.models.department import Department, DepartmentStaffMapping
from apps.staffs.models.staff import Staff, StaffNomineeDetail, AccountDetail, StaffAddress, StaffDocumentMapping, StaffBranchMapping, HODBranchMapping, MentorStudentMapping, StaffStudentMeeting
from rest_framework.validators import UniqueValidator
from apps.shared.serializers import CustomUniqueValidator, StatesForCountrySerializer
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.users.serializers import UserGroupSerializer
from apps.shared.serializers import DocumentSerializer, MapAddressSerializer, DocumentTypeSerializer
from apps.shared.serializers import ActiveFilteredListSerializer
from apps.shared.services_shared.common import get_full_name

class NomineeDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffNomineeDetail
        fields = '__all__'


class AccountDetailSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountDetail
        fields = '__all__'


class StaffSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Staff.objects.filter(is_active=True))]
    )
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    users = UserGroupSerializer(read_only=True)
    group_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    user_id = serializers.ReadOnlyField(source='users.id')
    username = serializers.ReadOnlyField(source='users.username')
    last_activity = serializers.ReadOnlyField(source='users.last_activity')

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)
    
    class Meta:
        model = Staff
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('first_name', 'dob'),
                message=_("Duplicate entry for the staff found")
            ),
        ]
        fields = '__all__'

class StaffDocumentMappingSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')
    document_type_details = DocumentTypeSerializer(read_only=True, source='document_type')

    class Meta:
        model = StaffDocumentMapping
        exclude = ['created', 'modified']

class StaffSubjectSerilalizer(serializers.ModelSerializer):
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    staff = serializers.SerializerMethodField()
    staff_name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    def get_staff(self, obj):
        return obj.id

    def get_group_name(self, obj):
        return obj.users.groups.values_list('name', flat=True)


    class Meta:
        model = Staff
        fields = ['id', 'staff_name', 'staff', 'profile_pic_details', 'designation', 'group_name']


class StaffGetNameSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    user_id = serializers.ReadOnlyField(source='users.id')
    users = UserGroupSerializer(read_only=True)

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['id', 'full_name', 'mobile_num', 'first_name', 'middle_name', 'last_name', 'user_id', 'users']


class NomineeDetailReadSerializer(serializers.ModelSerializer):
    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = StaffNomineeDetail
        fields = ['id', 'name', 'relationship_name', 'dob', 'address', 'mobile_num']


class AccountDetailReadSerializer(serializers.ModelSerializer):
    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = AccountDetail
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('account_num', 'staff'))]
        fields = '__all__'


class StaffAddressSerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    state_name = serializers.ReadOnlyField(source='state.name')
    district_name = serializers.ReadOnlyField(source='district.name')
    city_name = serializers.ReadOnlyField(source='city.name')
    map_address_data = MapAddressSerializer(read_only=True, source='map_address')

    class Meta:
        model = StaffAddress
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('type', 'staff'))]
        fields = '__all__'


class StaffStandardMappingReadSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')

    class Meta:
        model = StaffStandardMapping
        fields = ['standard', 'standard_name']

class StaffBranchMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StaffBranchMapping
        fields = '__all__'

class HODBranchMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = HODBranchMapping
        fields = '__all__'

class StaffAllDetailSerializer(serializers.ModelSerializer):
    nominee_detail = NomineeDetailReadSerializer(many=True, read_only=True)
    users = UserGroupSerializer(read_only=True)
    accounts = AccountDetailReadSerializer(many=True, read_only=True)
    country_name = serializers.ReadOnlyField(source='country.name')
    state_name = serializers.ReadOnlyField(source='state.name')
    district_name = serializers.ReadOnlyField(source='district.name')
    city_name = serializers.ReadOnlyField(source='city.name')
    religion_name = serializers.ReadOnlyField(source='religion.name')
    nationality_name = serializers.ReadOnlyField(source='nationality.name')
    staff_address = StaffAddressSerializer(many=True, read_only=True)
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    barcode_number = serializers.ReadOnlyField(source='users.barcode_number')
    employee_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Staff.objects.filter(is_active=True))]
    )
    email = serializers.CharField(
        validators=[UniqueValidator(queryset=Staff.objects.filter(is_active=True))]
    )
    staff_standard_mapping_staff = StaffStandardMappingReadSerializer(many=True, read_only=True)
    document_list = StaffDocumentMappingSerializer(read_only=True, many=True, source='staff_document_mapping_staff')
    name = serializers.SerializerMethodField()
    dob_str = serializers.SerializerMethodField()
    salary = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)
    
    def get_dob_str(self, obj):
        if not obj.dob:
            return ''
        else:
            return obj.dob.strftime('%d-%m-%Y')

    def get_salary(self, obj):
        return 5000
    
    class Meta:
        model = Staff
        fields = '__all__'

# User to fetch based on meta fields
class StaffSerializerForNotificationView(serializers.ModelSerializer):
    staff_nominee_details = NomineeDetailReadSerializer(many=True, read_only=True)
    account_details = AccountDetailReadSerializer(many=True, read_only=True)
    staff_address = StaffAddressSerializer(many=True, read_only=True)

    class Meta:
        model = Staff
        fields = '__all__'


class StaffStandardMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StaffStandardMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('staff', 'standard'),
                message=_("Duplicate entry for the staff found")
            ),
        ]
        fields = '__all__'

class MentorStudentMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = MentorStudentMapping
        fields ='__all__'

class StaffStudentMeetingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StaffStudentMeeting
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('staff', 'student','is_active','from_date','time'),
                message=_("Duplicate Meeting Schedule Found")
            ),
        ]
        fields = '__all__'

class StaffStandardMappingDataReadSerializer(serializers.ModelSerializer):
    staff_standard_mapping_staff = StaffStandardMappingReadSerializer(many=True, read_only=True)
    name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    class Meta:
        model = Staff
        fields = ['name', 'email', 'staff_standard_mapping_staff', 'group_name', 'id']

class DepartmentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Department.objects.filter(is_active=True))])

    class Meta:
        model = Department
        exclude = ['created', 'modified']

class StaffReadSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    group_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)
    
    class Meta:
        model = Staff
        fields = ['id', 'profile_pic_details', 'group_name', 'full_name']

class StaffSalarySerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        if obj.staff:
            return get_full_name(
                obj.staff.first_name,
                obj.staff.middle_name,
                obj.staff.last_name
            )
        return None

    class Meta:
        model = StaffSalary
        fields = '__all__'

class DepartmentStaffMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentStaffMapping
        exclude = ['created', 'modified']

class DepartmentStaffMappingReadSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    department_name = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        if obj.staff:
            return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
        return None

    def get_department_name(self, obj):
        if obj.department:
            return obj.department.name
        return None

    class Meta:
        model = DepartmentStaffMapping
        fields = '__all__'
