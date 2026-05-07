
from rest_framework import serializers

from apps.appointments.models.master import StaffAppointment, StaffAvailability, UserStaffAppointmentMapping
from apps.shared.services_shared.common import get_full_name
        
class StaffAvailabilitySerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    day_of_week_name = serializers.ReadOnlyField(source="day_of_week.name")

    def get_staff_name(self, obj):
        if obj.staff is None:
            return None
        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
    
    class Meta:
        model= StaffAvailability
        fields="__all__"
        
class UserStaffAppointmentMappigSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):

        if not obj.user:
            return None

        if obj.user.staff:
            return get_full_name(
                obj.user.staff.first_name,
                obj.user.staff.middle_name,
                obj.user.staff.last_name
            )

        if obj.user.student:
            return get_full_name(
                obj.user.student.first_name,
                obj.user.student.middle_name,
                obj.user.student.last_name
            )

        return None

    class Meta:
        model = UserStaffAppointmentMapping
        fields = "__all__"

class BookAppointmentSerializer(serializers.ModelSerializer):
    user_data = UserStaffAppointmentMappigSerializer(source='staff_appointment_user_staff_appointment_mapping',read_only=True,many=True)
    
    class Meta:
        model= StaffAppointment
        fields='__all__'

        
