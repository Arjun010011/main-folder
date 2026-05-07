from apps.classes.models.standard import Standard
from rest_framework import serializers
from apps.hr.models.shift import Shift, AssignShift, ShiftSchedule
from apps.hr.models.staffAttendance import StaffAttendance
from apps.shared.serializers import DocumentSerializer

from django.utils.translation import gettext_lazy as _
from apps.hr.models.staffTeachingHour import StaffTeachingHour, StaffHourSubjectMapping
from apps.hr.models.leaveType import LeaveType, LeaveTypeMapping, StaffLeaves, StaffLeaveDates
from apps.hr.models.timeTable import (Day, Period, PeriodPlan, PeriodDayMapping, TimeTableDateRange,
TimeTableSchedule, TimeTableScheduleParent,TimetableRequestForChange)
from apps.classes.serializers import GetSubjectSerializer
from apps.shared.serializers import CustomUniqueValidator
from rest_framework.validators import UniqueValidator

from apps.shared.services_shared.common import get_full_name

class FilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        data = data.filter(is_active=1)
        return super(FilteredListSerializer, self).to_representation(data)


class ShiftSchedulesSerializer(serializers.ModelSerializer):
    day_name = serializers.ReadOnlyField(source='day.name')

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = ShiftSchedule
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('shift', 'day'),
                message=_('Duplicate entry found for Same day')
            )
        ]
        fields = '__all__'

class ShiftReadSerializer(serializers.ModelSerializer):
    list_serializer_class = FilteredListSerializer
    name = serializers.CharField(validators=[UniqueValidator(queryset=Shift.objects.filter(is_active=True),
                                                             message='Shift name is already exist.')])
    shiftschedule_shift = ShiftSchedulesSerializer(many=True)

    class Meta:
        model = Shift
        fields = '__all__'

class ShiftSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=Shift.objects.filter(is_active=True),
                                                             message='Shift name is already exist.')])

    class Meta:
        model = Shift
        fields = '__all__'

class GetAssignShiftSerializer(serializers.ModelSerializer):

    def get_staff_name(self, obj):

        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)

    class Meta:
        model = AssignShift
        fields = '__all__'


class AssignShiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignShift
        fields = '__all__'


class StaffAttendanceSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='staff.profile_pic')
    status_changed_by_name = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)

    def get_status_changed_by_name(self, obj):
        if obj.status_changed_by and obj.status_changed_by.staff:
            return get_full_name(obj.status_changed_by.staff.first_name, obj.status_changed_by.staff.middle_name, obj.status_changed_by.staff.last_name)
        return None

    class Meta:
        model = StaffAttendance
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('for_date', 'staff'),
                message=_('duplicate entry found for forDate and staff')
            )
        ]
        fields = '__all__'


class StaffTeachingHourSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffTeachingHour
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'staff'),
                message='Already Assigned Subject to Staff in this Academic year'
            )
        ]

        fields = '__all__'


class StaffHourSubjectMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffHourSubjectMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('staff_teaching_hour', 'subject'),
                message='Already Assigned Subject to Staff'
            )
        ]

        fields = '__all__'


class GetStaffHourSubjectMappingSerializer(serializers.ModelSerializer):
    subject = serializers.ReadOnlyField(source='subject.id')

    class Meta:
        model = StaffHourSubjectMapping
        fields = '__all__'


class GetStaffTeachingHourSerializer(serializers.ModelSerializer):
    assigned_subjects = GetSubjectSerializer(many=True, read_only=True)
    staff_name = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='staff.profile_pic')
    designation = serializers.ReadOnlyField(source='staff.designation')

    def get_staff_name(self, obj):
        return f'{obj.staff.first_name} {obj.staff.middle_name} {obj.staff.last_name}'

    class Meta:
        model = StaffTeachingHour
        fields = '__all__'


class LeaveTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=LeaveType.objects.filter(is_active=True))])
    code = serializers.CharField(validators=[CustomUniqueValidator(queryset=LeaveType.objects.filter(is_active=True))])
    class Meta:
        model = LeaveType

        fields = '__all__'


class LeaveTypeMappingSerializer(serializers.ModelSerializer):
    leavetype_name = serializers.ReadOnlyField(source='leave_type.name')
    leavetype_code = serializers.ReadOnlyField(source='leave_type.code')
    section_name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = LeaveTypeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('financial_year', 'leave_type'),
                message='Leave type already exists for the leave year'
            )
        ]
        fields = '__all__'


class StaffLeaveDatesSerializers(serializers.ModelSerializer):
    class Meta:
        model = StaffLeaveDates
        fields = '__all__'


class StaffLeaveSerializers(serializers.ModelSerializer):
    profile_pic_details = DocumentSerializer(read_only=True, source='staff.profile_pic')

    class Meta:
        model = StaffLeaves
        fields = '__all__'


def get_approved_by_name(obj):
    try:
        return get_full_name(obj.approved_by.first_name, obj.approved_by.middle_name, obj.approved_by.last_name)
    except:
        return ''



class GetStaffLeaveSerializers(serializers.ModelSerializer):
    fromdate = serializers.DateField()
    todate = serializers.DateField()
    full_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    attach_file_details = DocumentSerializer(read_only=True, source='attach_file')
    staff_leave_date = StaffLeaveDatesSerializers(many=True)

    def get_full_name(self, obj):
        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)

    def get_approved_by_name(self, obj):
        try:
            return get_full_name(obj.approved_by.first_name, obj.approved_by.middle_name, obj.approved_by.last_name)
        except:
            return ''

    class Meta:
        model = StaffLeaves
        fields = '__all__'


class DaysSerializer(serializers.ModelSerializer):
    class Meta:
        model = Day
        fields = '__all__'


class PeriodPlanSerializer(serializers.ModelSerializer):
    standard_list = serializers.SerializerMethodField()

    def get_standard_list(self, obj):
        return Standard.objects.filter(id__in=obj.standard.split(',')).values('id', 'name')

    class Meta:
        model = PeriodPlan
        fields = '__all__'

class PeriodDayMappingSerializer(serializers.ModelSerializer):
    day_name = serializers.ReadOnlyField(source='day.name')
    period_name = serializers.ReadOnlyField(source='period.name')

    class Meta:
        model = PeriodDayMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('day', 'period'),
                message=_('Duplicate Day exist for same period')
            )
        ]
        fields = '__all__'

class PeriodSerilaizer(serializers.ModelSerializer):
    perioddaymapping_period  = PeriodDayMappingSerializer(many=True, read_only=True)

    class Meta:
        model = Period
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('name', 'period_plan'),
                message=_('Period Name duplicate')
            )
        ]
        fields = '__all__'
class PeriodDetailedSerializer(serializers.ModelSerializer):
    standard_list = serializers.SerializerMethodField()
    period_period_plan = PeriodSerilaizer(many=True, read_only=True)
    academic_year_value = serializers.SerializerMethodField()

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'

    def get_standard_list(self, obj):
        return Standard.objects.filter(id__in=obj.standard.split(',')).values('id', 'name')

    class Meta:
        model = PeriodPlan
        fields = '__all__'


class TimeTableDateRangeSerializer(serializers.ModelSerializer):
    is_active = serializers.BooleanField(default=True)

    class Meta:
        model = TimeTableDateRange
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'is_active', 'name'),
                message=_('Timetable name should be unique')
            )
        ]
        fields = '__all__'

class TimeTableScheduleSerializer(serializers.ModelSerializer):

    class Meta:
        model = TimeTableSchedule
        fields = '__all__'

class TimeTableScheduleParentSerializer(serializers.ModelSerializer):

    class Meta:
        model = TimeTableScheduleParent
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(
                    date_range__is_active=True,
                    timetable_schedule_time_table_schedule_parent__is_active=True
                ).distinct(),
                fields=('date_range', 'standard_section'),
                message=_('Timetable already exist for the standard section')
            )
        ]
        fields = '__all__'

class TimeTableScheduleReadSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()
    day_name = serializers.ReadOnlyField(source='period_day_mapping.day.name')
    day = serializers.ReadOnlyField(source='period_day_mapping.day.id')
    period = serializers.ReadOnlyField(source='period_day_mapping.period.id')
    period_name = serializers.ReadOnlyField(source='period_day_mapping.period.name')
    period_start_time = serializers.ReadOnlyField(source='period_day_mapping.start_time')
    period_end_time = serializers.ReadOnlyField(source='period_day_mapping.end_time')
    subject_code = serializers.ReadOnlyField(source='subject.codename')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    start_date = serializers.ReadOnlyField(source='date_range.start_date')
    end_date = serializers.ReadOnlyField(source='date_range.end_date')
    standard_name = serializers.ReadOnlyField(source='time_table_schedule_parent.standard_section.standard.name')
    standard_section = serializers.ReadOnlyField(source='time_table_schedule_parent.standard_section.id')
    section_name = serializers.ReadOnlyField(source='time_table_schedule_parent.standard_section.section.name')

    def get_full_name(self, obj):
        if obj and obj.staff:
            return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
        return None

    class Meta:
        model = TimeTableSchedule
        fields = '__all__'


class TimetableRequestForChangeSerializer(serializers.ModelSerializer):

    class Meta:
        model = TimetableRequestForChange
        fields = '__all__'

class TimetableRequestForChangeReadSerializer(serializers.ModelSerializer):
    timetable_schedule = TimeTableScheduleReadSerializer()
    staff_name = serializers.SerializerMethodField()
    subject_code = serializers.ReadOnlyField(source='subject.codename')
    subject_name = serializers.ReadOnlyField(source='subject.name')

    def get_staff_name(self, obj):
        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)

    class Meta:
        model = TimetableRequestForChange
        fields = '__all__'