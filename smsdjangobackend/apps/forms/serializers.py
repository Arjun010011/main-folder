from rest_framework import serializers

from apps.forms.models import EnquiryStudent, EnquiryStudentDetails,EnquiryFollowup

from apps.forms.models import (ApplicationStudent, ApplicationStudentDetails, ApplicationStudentAddress,
                               ApplicationParentDetail, ApplicationGuardianDetail, ApplicationStudentParentMapping)
from apps.forms.models.applicationStudent import ApplicationStudentDocumentMapping
from apps.shared.models.custom import CustomData, CustomForm
from apps.shared.serializers import ActiveFilteredListSerializer, CustomFormSerializer, DocumentSerializer, DocumentTypeSerializer, MapAddressSerializer
from apps.shared.services_shared.common import get_full_name



class EnquiryStudentSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    entry_academic_year_value = serializers.SerializerMethodField()
    followup_exists = serializers.SerializerMethodField()

    def get_entry_academic_year_value(self, obj):
        if obj.entry_academic_year:
            return f"{obj.entry_academic_year.start_date.year}-{obj.entry_academic_year.end_date.year}"
        return None

    def get_followup_exists(self, obj):
        if not obj.entry_academic_year:
            return False

        return obj.enquiryfollowup_enquiry_student.filter(
            academic_year=obj.entry_academic_year
        ).exists()

    class Meta:
        model = EnquiryStudent
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('first_name', 'dob'),
                message='Student with same Name and Date of birth already exists.'
            )
        ]
        exclude = ['created', 'modified']


class EnquiryStudentDetailSerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    state_name = serializers.ReadOnlyField(source='state.name')
    district_name = serializers.ReadOnlyField(source='district.name')
    city_name = serializers.ReadOnlyField(source='city.name')
    map_address_data = MapAddressSerializer(read_only=True, source='map_address')

    class Meta:
        model = EnquiryStudentDetails
        exclude = ['created', 'modified']


class EnquiryStudentListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = EnquiryStudent
        fields = ['id', 'name']


class EnquiryStudentFullDetailsSerializer(serializers.ModelSerializer):
    student_details = EnquiryStudentDetailSerializer(read_only=True)
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    entry_academic_year_value = serializers.SerializerMethodField()
    followup_exists = serializers.SerializerMethodField()
    def get_entry_academic_year_value(self, obj):
        return f'{obj.entry_academic_year.start_date.year}-{obj.entry_academic_year.end_date.year}' if \
            obj.entry_academic_year else None

    def get_followup_exists(self, obj):
        if not obj.entry_academic_year:
            return False

        return obj.enquiryfollowup_enquiry_student.filter(
            academic_year=obj.entry_academic_year
        ).exists()

    class Meta:
        model = EnquiryStudent
        exclude = ['created', 'modified']


class EnquirySearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnquiryStudent
        fields = ['first_name', 'enquiry_num']


class EnquiryFollowupSerializer(serializers.ModelSerializer):
    enquiry_student_name = serializers.SerializerMethodField()

    def get_enquiry_student_name(self, obj):
        if obj.enquiry_student:
            return get_full_name(
                obj.enquiry_student.first_name,
                obj.enquiry_student.middle_name,
                obj.enquiry_student.last_name
            )
        return None

    class Meta:
        model = EnquiryFollowup
        exclude = ['created', 'modified']


class EnquiryFollowupWithEnquirySerializer(serializers.ModelSerializer):
    """Serializer for followup with nested enquiry and student details."""
    enquiry_student_name = serializers.SerializerMethodField()
    enquiry_details = serializers.SerializerMethodField()
    status_name = serializers.SerializerMethodField()
    remarks = serializers.SerializerMethodField()

    def get_enquiry_student_name(self, obj):
        if obj.enquiry_student:
            return get_full_name(
                obj.enquiry_student.first_name,
                obj.enquiry_student.middle_name,
                obj.enquiry_student.last_name
            )
        return None

    def get_enquiry_details(self, obj):
        if obj.enquiry_student:
            return EnquiryStudentFullDetailsSerializer(obj.enquiry_student).data
        return None
    def get_status_name(self, obj):
        return obj.get_status_display()

    def get_remarks(self, obj):
        return obj.remarks

    class Meta:
        model = EnquiryFollowup
        exclude = ['created', 'modified']


class EnquiryEmployeeReportSerializer(serializers.Serializer):
    staff_name = serializers.CharField()
    count = serializers.IntegerField()


class EnquiryDashboardSerializer(serializers.Serializer):
    staff_name = serializers.CharField()
    count = serializers.IntegerField()


class ApplicationStudentSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    entry_academic_year_value = serializers.SerializerMethodField()
    application_payment = serializers.ReadOnlyField(source='application_payment.id')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_entry_academic_year_value(self, obj):
        return f'{obj.entry_academic_year.start_date.year}-{obj.entry_academic_year.end_date.year}' if \
            obj.entry_academic_year else None

    class Meta:
        model = ApplicationStudent
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True), fields=('first_name', 'dob', 'entry_academic_year', 'student'),
                message='Student with same Name and Date of birth already exists.'),
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True), fields=('entry_academic_year', 'application_num'),
                message='Application number is already exist(s) in the academic year.')
        ]
        exclude = ['created', 'modified']


class BulkApplicationStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStudent
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(), fields=('first_name', 'dob'),
                message='Student with same Name and Date of birth already exists.')
        ]
        exclude = ['created', 'modified']


class ApplicationStudentDetailSerializer(serializers.ModelSerializer):
    nationality_name = serializers.ReadOnlyField(source='nationality.name')
    religion_name = serializers.ReadOnlyField(source='religion.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    caste_name = serializers.ReadOnlyField(source='caste.name')

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(ApplicationStudentDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = ApplicationStudentDetails
        exclude = ['created', 'modified']


class ApplicationStudentAddressSerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    state_name = serializers.ReadOnlyField(source='state.name')
    district_name = serializers.ReadOnlyField(source='district.name')
    city_name = serializers.ReadOnlyField(source='city.name')
    map_address_data = MapAddressSerializer(read_only=True, source='map_address')

    class Meta:
        model = ApplicationStudentAddress
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('type', 'application_student'))]
        fields = '__all__'


class ApplicationStudentBulkAddressSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(ApplicationStudentBulkAddressSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = ApplicationStudentAddress
        exclude = ['application_student']


class ApplicationParentDetailSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(ApplicationParentDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = ApplicationParentDetail
        fields = '__all__'


class ApplicationGuardianDetailSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(ApplicationGuardianDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = ApplicationGuardianDetail
        fields = '__all__'


class ApplicationStudentParentMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStudentParentMapping
        fields = '__all__'

class ApplicationStudentDocumentMappingSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')
    document_type_details = DocumentTypeSerializer(read_only=True, source='document_type')

    class Meta:
        model = ApplicationStudentDocumentMapping
        exclude = ['created', 'modified']

class ApplicationStudentDocumentMappingReadSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')
    document_type_details = DocumentTypeSerializer(read_only=True, source='document_type')

    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = ApplicationStudentDocumentMapping
        exclude = ['created', 'modified']

class ApplicationStudentListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = ApplicationStudent
        fields = ['id', 'name']


class StudentParentMappingSerializer(serializers.ModelSerializer):
    application_parent = ApplicationParentDetailSerializer()
    application_guardian = ApplicationGuardianDetailSerializer()

    class Meta:
        model = ApplicationStudentParentMapping
        exclude = ['created', 'modified']


class ApplicationStudentFullDetailsSerializer(serializers.ModelSerializer):
    student_details = ApplicationStudentDetailSerializer(read_only=True)
    student_address = ApplicationStudentAddressSerializer(many=True, read_only=True)
    student_parent = StudentParentMappingSerializer(read_only=True)
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    entry_academic_year_value = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    document_list = ApplicationStudentDocumentMappingReadSerializer(read_only=True, many=True, source='application_student_document_mapping_student')

    def get_entry_academic_year_value(self, obj):
        return f'{obj.entry_academic_year.start_date.year}-{obj.entry_academic_year.end_date.year}' if \
            obj.entry_academic_year else None
    
    class Meta:
        model = ApplicationStudent
        exclude = ['created', 'modified']


class ApplicationSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = ApplicationStudent
        fields = ['first_name', 'application_num']
