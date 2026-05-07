from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.classes.models import StandardSectionMapping
from apps.general.models.event import Event, EventType
from apps.shared.serializers import DocumentSerializer, DocumentTypeSerializer
from apps.general.models.holidayCalender import HolidayCalender, HolidayCalenderStudent,HolidayPlan, EventImageMapping
from apps.classes.serializers import StandardSerializer
from apps.general.models.school_timing import SchoolTiming, SchoolTimingParent
from apps.staffs.serializers import StaffGetNameSerializer
from apps.students.serializers import StudentListFullNameSerializer
from apps.general.models.long_processing import LongProcessingApiResult


class EventTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=EventType.objects.filter(is_active=True),
                                                             message='Event Type name is already exists.')])

    class Meta:
        model = EventType
        fields = '__all__'


class EventSerializer(serializers.ModelSerializer):

    class Meta:
        model = Event
        fields = '__all__'


class EventStandardSectionGetSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')
    section_name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = StandardSectionMapping
        fields = ['id', 'standard_name', 'section_name']


class EventGetSerializer(serializers.ModelSerializer):
    standard_section = EventStandardSectionGetSerializer(many=True)
    student = StudentListFullNameSerializer(many=True)
    staff = StaffGetNameSerializer(many=True)
    type_name = serializers.ReadOnlyField(source='type.name')

    class Meta:
        model = Event
        exclude = ['created', 'modified']

class EventDocumentMappingSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='image')

    class Meta:
        model = EventImageMapping
        fields='__all__'

class HolidayCalenderSerializer(serializers.ModelSerializer):

    class Meta:
        model = HolidayCalender
        exclude = ['created', 'modified']

class HolidayCalenderForStudentSerializer(serializers.ModelSerializer):
    document_list = EventDocumentMappingSerializer(read_only=True, many=True, source='event_image_mapping_event_calender')

    class Meta:
        model = HolidayCalenderStudent
        exclude = ['created', 'modified']

class HolidayPlanSerializer(serializers.ModelSerializer):
    standard_detail = StandardSerializer(many=True, read_only=True, source='standard')

    class Meta:
        model = HolidayPlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('academic_year', 'name'),
                message='Holiday plan name is already exist(s) in the academic year.'
            )
        ]
        fields = '__all__'

class SchoolTimingSerializer(serializers.ModelSerializer):

    class Meta:
        model = SchoolTiming
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('school_timing_parent', 'day'),
                message='Duplicate data exist'
            )
        ]
        fields = '__all__'

class SchoolTimingReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = SchoolTiming
        fields = '__all__'

class SchoolTimingParentSerializer(serializers.ModelSerializer):

    class Meta:
        model = SchoolTimingParent
        fields = '__all__'


class SchoolTimingParentReadSerializer(serializers.ModelSerializer):
    school_timing_school_timing_parent = SchoolTimingReadSerializer(many=True)
    academic_year_name = serializers.SerializerMethodField()
    
    def get_academic_year_name(self, obj):
        return f'{obj.academic_year.start_date.year} - {obj.academic_year.end_date.year}'

    class Meta:
        model = SchoolTimingParent
        fields = '__all__'

class LongProcessingApiResultSerializer(serializers.ModelSerializer):
    transaction_id = serializers.CharField(
        validators=[UniqueValidator(queryset=LongProcessingApiResult.objects.filter(is_active=True))])

    class Meta:
        model = LongProcessingApiResult
        fields = '__all__'