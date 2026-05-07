from rest_framework import serializers

from apps.classes.models import Enrollment
from apps.diary.models.diary import Diary, StandardSectionDiary, StaffDiary, StudentDiary, DocumentDiary, StudentDiaryRemarkMapping, StudentDiarySubjectMapping, StudentDiaryTitleMapping
from apps.institutes.models import AcademicYear
from apps.shared.serializers import DocumentSerializer
from apps.shared.services_shared.common import get_full_name

class StandardSectionDiarySerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    standard = serializers.ReadOnlyField(source='standard_section.standard.id')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    section = serializers.ReadOnlyField(source='standard_section.section.id')

    class Meta:
        model = StandardSectionDiary
        fields = '__all__'


class StaffDiarySerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField(source='staff.first_name')
    middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    last_name = serializers.ReadOnlyField(source='staff.last_name')

    class Meta:
        model = StaffDiary
        fields = '__all__'

class StudentDiarySubjectMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentDiarySubjectMapping
        fields = '__all__'

class StudentDiaryTitleMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentDiaryTitleMapping
        fields = '__all__'

class StudentDiaryRemarkMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentDiaryRemarkMapping
        fields = '__all__'

class StudentDiarySerializer(serializers.ModelSerializer):
    first_name = serializers.ReadOnlyField(source='student.first_name')
    middle_name = serializers.ReadOnlyField(source='student.middle_name')
    last_name = serializers.ReadOnlyField(source='student.last_name')
    standard_details = serializers.SerializerMethodField()
    student_diary_subject_mapping = StudentDiarySubjectMappingSerializer(source='student_diary_subject_mapping_student_diary', read_only=True, many=True)
    student_diary_title_mapping = StudentDiaryTitleMappingSerializer(source='student_diary_title_mapping_student_diary', read_only=True, many=True)
    student_diary_remark_mapping = StudentDiaryRemarkMappingSerializer(source='student_diary_remark_mapping_student_diary', read_only=True, many=True) 

    def get_standard_details(self, obj):
        enrollment = Enrollment.objects.filter(standard_section__standard=obj.student.current_standard,
                                               student=obj.student)
        if enrollment:
            enrollment = enrollment.first()
            return {'standard_name': enrollment.standard_section.standard.name,
                    'section_name': enrollment.standard_section.section.name,
                    'standard_section': enrollment.standard_section.pk}
        else:
            return {'standard_name': None, 'section_name': None, 'standard_section': None}

    class Meta:
        model = StudentDiary
        fields = '__all__'


class FilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        if self.context['request'].GET.get('from_diary'):
            data = data.filter(from_diary=self.context['request'].GET.get('from_diary'))
        return super(FilteredListSerializer, self).to_representation(data)


class DocumentDiarySerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')
    user_details = serializers.SerializerMethodField()

    def get_user_details(self, obj):
        if obj.user.is_staff:
            return {'first_name': obj.user.staff.first_name, 'middle_name': obj.user.staff.middle_name,
                    'last_name': obj.user.staff.last_name, 'is_staff': obj.user.is_staff}
        else:
            return {'first_name': obj.user.student.first_name, 'middle_name': obj.user.student.middle_name,
                    'last_name': obj.user.student.last_name, 'is_staff': obj.user.is_staff,
                    'student': obj.user.student.pk,
                    'profile_pic_details': DocumentSerializer(source='obj.user.student.profile_pic').data}

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = DocumentDiary
        fields = '__all__'


class DiarySerializer(serializers.ModelSerializer):
    standard_details = StandardSectionDiarySerializer(read_only=True, many=True, source='diary_standard')
    staff_details = StaffDiarySerializer(many=True, read_only=True, source='diary_staff')
    document_details = DocumentDiarySerializer(read_only=True, many=True, source='diary_document')
    student_details = StudentDiarySerializer(read_only=True, many=True, source='diary_student')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    academic_year = serializers.SerializerMethodField()

    def get_academic_year(self, obj):
        return AcademicYear.get_academic_year_for_date(self, obj.due_date, False, True).id

    class Meta:
        model = Diary
        fields = '__all__'


class AppDiarySerializer(serializers.ModelSerializer):
    staff_details = StaffDiarySerializer(many=True, read_only=True, source='diary_staff')
    subject_name = serializers.ReadOnlyField(source='subject.name')
    document_details = DocumentDiarySerializer(read_only=True, many=True, source='diary_document')
    academic_year = serializers.SerializerMethodField()
    created_user_name = serializers.SerializerMethodField()

    def get_academic_year(self, obj):
        return AcademicYear.get_academic_year_for_date(self, obj.due_date, False, True).id

    def get_created_user_name(self, obj):
        name = ''
        if obj.created_user.student:
            name = get_full_name(obj.created_user.student.first_name, obj.created_user.student.middle_name, obj.created_user.student.last_name)
        elif obj.created_user.staff.middle_name:
            name = get_full_name(obj.created_user.staff.first_name, obj.created_user.staff.middle_name, obj.created_user.staff.last_name)
        return name
    class Meta:
        model = Diary
        fields = '__all__'
