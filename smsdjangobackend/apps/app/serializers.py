from rest_framework import serializers

from apps.shared.serializers import DocumentSerializer
from apps.staffs.models import Staff
from apps.students.models import Student
from apps.shared.services_shared.common import get_full_name

class AttendanceStudentSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'name', 'email', 'mobile_num', 'profile_pic_details']


class AttendanceStaffSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    description = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_description(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True).first()
        except:
            return None

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['id', 'name', 'description', 'email', 'mobile_num', 'profile_pic_details']
