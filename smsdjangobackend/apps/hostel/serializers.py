from rest_framework import serializers
from rest_framework.validators import UniqueValidator
import datetime
from django.db.models import Q

from apps.hostel.models import RoomAllocation, UserAttendance, DepositAndWithDraw, pocket_money
from apps.institutes.serializers import RoomAssetMappingReadSerializer
from apps.shared.services_shared.common import get_full_name
from apps.students.serializers import StudentSerializer
from apps.staffs.serializers import StaffSerializer
from apps.institutes.models import Room
from apps.shared.serializers import DocumentSerializer
from apps.staffs.models import Staff
from apps.students.models import Student


class RoomAllocationSerializer(serializers.ModelSerializer):
    room_name = serializers.ReadOnlyField(source='room.name')
    floor_name = serializers.ReadOnlyField(source='room.floor.name')

    class Meta:
        model = RoomAllocation
        fields = '__all__'


class CustomAllocationSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        if self.context.get('previous_data'):
            data = data.filter(is_active=True).exclude(Q(checkout__gt=datetime.datetime.now()) | Q(checkout=None))
        elif self.context.get('current_data'):
            data = data.filter(is_active=True).filter(Q(checkout__gt=datetime.datetime.now(), checkin__lt=datetime.datetime.now()) | Q(
                checkout__isnull=True, checkin__lt=datetime.datetime.now()
            ))
        else:
            data = data.filter(Q(checkout__gt=datetime.datetime.now()) | Q(checkout=None), is_active=True)
        return super(CustomAllocationSerializer, self).to_representation(data)


class RoomAllocationReadSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(read_only=True, source='student')
    staff_details = StaffSerializer(read_only=True, source='staff')

    class Meta:
        list_serializer_class = CustomAllocationSerializer
        model = RoomAllocation
        exclude = ['modified', 'created', 'is_active']


class RoomAllocationVisitorReadSerializer(serializers.ModelSerializer):
    student_details = StudentSerializer(read_only=True, source='student')
    staff_details = StaffSerializer(read_only=True, source='staff')
    floor_name = serializers.ReadOnlyField(source='room.floor.name')
    building_name = serializers.ReadOnlyField(source='room.floor.building.name')
    room_name = serializers.ReadOnlyField(source='room.name')

    class Meta:
        model = RoomAllocation
        exclude = ['modified', 'created', 'is_active']


class CustomAllocationUserListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        attendanceData = []
        data = data.filter(is_active=True).order_by('-created')
        if self.context.get('checkin'):
            data = data.filter(Q(checkout__gt=self.context.get('checkin')) | Q(checkout=None), is_active=True,
                               checkin__lte=self.context.get('checkin')).order_by('-checkin')
            if data:
                attendanceData = data[0].userattendance_roomallocation.order_by('-checkin')
        instance = super().to_representation(data)
        if self.context.get('checkin'):
            if instance:
                if attendanceData:
                    instance[0]['attendance_checkout'] = attendanceData[0].checkout
                    instance[0]['attendance_checkin'] = attendanceData[0].checkin
                    instance[0]['attendance_id'] = attendanceData[0].id
                return instance[0]
            else:
                return {}
        if self.context.get('individual'): #return allocation data in object
            if instance:
                return instance[0]
            else:
                return {}
        return instance


class RoomAllocationUserListSerializer(serializers.ModelSerializer):
    floor_name = serializers.ReadOnlyField(source='room.floor.name')
    building_name = serializers.ReadOnlyField(source='room.floor.building.name')
    room_name = serializers.ReadOnlyField(source='room.name')
    asset_details = RoomAssetMappingReadSerializer(source='room.roomassetmapping_room', many=True, read_only=True)

    class Meta:
        list_serializer_class = CustomAllocationUserListSerializer
        model = RoomAllocation
        exclude = ['modified', 'created', 'is_active']


""" Individual Room Allocation Data """


class RoomForAllocationSerializer(serializers.ModelSerializer):
    allocation_details = RoomAllocationReadSerializer(many=True, source='roomallocation_room', read_only=True)
    asset_details = RoomAssetMappingReadSerializer(source='roomassetmapping_room', many=True, read_only=True)
    floor_name = serializers.ReadOnlyField(source='floor.name')
    building_name = serializers.ReadOnlyField(source='floor.building.name')
    building_for = serializers.ReadOnlyField(source='floor.building.building_for')

    class Meta:
        model = Room
        exclude = ['modified', 'created', 'is_active']


class StaffAllocationSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Staff.objects.filter(is_active=True))]
    )
    email = serializers.CharField(
        validators=[UniqueValidator(queryset=Staff.objects.filter(is_active=True),
                                    message='Staff primary email should be unique')]
    )
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    group_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    roomallocation_staff = RoomAllocationUserListSerializer(many=True, read_only=True)

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['employee_id', 'email', 'profile_pic_details', 'group_name', 'dob',
                  'full_name', 'id', 'mobile_num', 'roomallocation_staff', 'first_name', 'middle_name', 'last_name']


""" To show student List """


class StudentAllocationSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    standard = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    roomallocation_student = RoomAllocationUserListSerializer(many=True, read_only=True)

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'name', 'first_name', 'middle_name', 'last_name', 'standard', 'dob', 'email', 'gender',
                  'current_reg_num', 'mobile_num', 'current_standard', 'profile_pic_details', 'student_type',
                  'roomallocation_student']


class UserAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserAttendance
        fields = '__all__'


class UserAttendanceReadSerializer(serializers.ModelSerializer):
    allocation_detail = RoomAllocationSerializer(source='roomallocation', read_only=True)

    class Meta:
        model = UserAttendance
        exclude = ['modified', 'created']

class DepositAndWithDrawReadListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        data = data.filter(is_active=True).order_by('-id')
        return super(DepositAndWithDrawReadListSerializer, self).to_representation(data)

class DepositAndWithDrawSerializer(serializers.ModelSerializer):

    class Meta:
        model = DepositAndWithDraw
        fields = '__all__'

class DepositAndWithDrawReadSerializer(serializers.ModelSerializer):

    class Meta:
        list_serializer_class = DepositAndWithDrawReadListSerializer
        model = DepositAndWithDraw
        fields = '__all__'


class StudentAllocationReadSerializerPocketMoney(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    standard = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    roomallocation_student = RoomAllocationUserListSerializer(many=True, read_only=True)
    deposit_and_with_draw_student = DepositAndWithDrawReadSerializer(many=True, read_only=True)
    

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'name', 'first_name', 'middle_name', 'last_name', 'standard', 'dob', 'email', 'gender',
                  'current_reg_num', 'mobile_num', 'current_standard', 'profile_pic_details', 'student_type',
                  'deposit_and_with_draw_student', 'roomallocation_student']