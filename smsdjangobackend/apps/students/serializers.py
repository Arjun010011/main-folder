from rest_framework import exceptions
from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.shared.serializers import DocumentSerializer, DocumentTypeSerializer, DocumentUrlSerializer, MapAddressSerializer
from apps.students.models import (Student, StudentDetails, StudentAddress, ParentDetail, GuardianDetail,
                                  StudentParentMapping)
from apps.students.models.student import StudentDocumentMapping, StudentGroup, StudentSiblingMapping
from apps.students.models.studentDetail import StudentType,PreviousSchoolDetails

from apps.classes.models import (SubjectStudent)
from apps.shared.services_shared.common import get_full_name_dot_inbetween
from apps.shared.services_shared.common import get_full_name, get_full_name_with_double_space,get_full_name_with_dot
from apps.shared.services_shared.common import add_double_space
from apps.students.models.student import IdCardUpdate, StudentIdCardUpdate
from apps.institutes.models.academicYear import AcademicYear
##from apps.finance.models import AdmissionForm

class StudentPreviousSchoolDetailsSerializer(serializers.ModelSerializer):
    class Meta:
        model = PreviousSchoolDetails
        fields = '__all__'


class StudentUniqueRegNumSerializer(serializers.ModelSerializer):
    current_reg_num = serializers.CharField(
        allow_blank=True,
        validators=[UniqueValidator(queryset=Student.objects.all())])

    class Meta:
        model = Student
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('first_name', 'dob'))]
        fields = '__all__'

class StudentDetailSerializer(serializers.ModelSerializer):

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(StudentDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = StudentDetails
        exclude = ['created', 'modified']


class StudentDetailReadSerializer(serializers.ModelSerializer):
    nationality_name = serializers.ReadOnlyField(source='nationality.name')
    religion_name = serializers.ReadOnlyField(source='religion.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    caste_name = serializers.ReadOnlyField(source='caste.name')
    entry_academic_year_value = serializers.SerializerMethodField()
    previous_school_details_new = StudentPreviousSchoolDetailsSerializer(read_only=True)

    def get_entry_academic_year_value(self, obj):
        return f'{obj.entry_academic_year.start_date.year}-{obj.entry_academic_year.end_date.year}' if \
            obj.entry_academic_year else None

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(StudentDetailReadSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = StudentDetails
        exclude = ['created', 'modified']


class StudentAddressSerializer(serializers.ModelSerializer):
    country_name = serializers.ReadOnlyField(source='country.name')
    state_name = serializers.ReadOnlyField(source='state.name')
    district_name = serializers.ReadOnlyField(source='district.name')
    city_name = serializers.ReadOnlyField(source='city.name')
    map_address_data = MapAddressSerializer(read_only=True, source='map_address')

    class Meta:
        model = StudentAddress
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('type', 'student'))]
        fields = '__all__'


class StudentBulkAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAddress
        exclude = ['student']


class ParentDetailSerializer(serializers.ModelSerializer):
    f_profile_pic_details = DocumentSerializer(read_only=True, source='f_profile_pic')
    m_profile_pic_details = DocumentSerializer(read_only=True, source='m_profile_pic')

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(ParentDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = ParentDetail
        fields = '__all__'


class GuardianDetailSerializer(serializers.ModelSerializer):
    g_profile_pic_details = DocumentSerializer(read_only=True, source='g_profile_pic')
 
    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(GuardianDetailSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = GuardianDetail
        fields = '__all__'


class StudentParentMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentParentMapping
        fields = '__all__'


class StudentListFullNameSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'name', 'first_name', 'middle_name', 'last_name']


class ParentDetailSerializerRead(serializers.ModelSerializer):

    class Meta:
        model = ParentDetail
        fields = ['father_name', 'mother_name', 'f_mobile_num', 'm_mobile_num']

class GuardianDetailSerializerRead(serializers.ModelSerializer):

    class Meta:
        model = GuardianDetail
        fields = ['guardian_name']

class StudentParentGuardianMappingSerializerRead(serializers.ModelSerializer):
    parent = ParentDetailSerializerRead()
    guardian = GuardianDetailSerializerRead()

    class Meta:
        model = StudentParentMapping
        exclude = ['created', 'modified']


class StudentSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)
    user_id = serializers.ReadOnlyField(read_only=True, source='user_student.id')
    username = serializers.ReadOnlyField(read_only=True, source='user_student.username')
    last_activity = serializers.ReadOnlyField(read_only=True, source='user_student.last_activity')
    student_parent = StudentParentGuardianMappingSerializerRead(read_only=True)
    
    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True), fields=('first_name', 'dob', 'middle_name', 'last_name'),
                message='Student with same Name and Date of birth is already exists.')]
        exclude = ['created', 'modified']

class StudentListSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    standard = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    user_student = serializers.ReadOnlyField(read_only=True, source='user_student.id')
    student_parent = StudentParentGuardianMappingSerializerRead(read_only=True)
    student_group_name = serializers.ReadOnlyField(source='student_group.name')
    
    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'name', 'first_name', 'middle_name', 'last_name', 'standard', 'dob', 'email', 'gender',
                  'current_reg_num', 'mobile_num', 'current_standard', 'profile_pic_details', 'student_type', 'user_student',
                  'is_new_student', 'student_parent', 'student_group_name']

class StudentParentGuardianMappingSerializer(serializers.ModelSerializer):
    parent = ParentDetailSerializer()
    guardian = GuardianDetailSerializer()

    class Meta:
        model = StudentParentMapping
        exclude = ['created', 'modified']

class StudentDocumentMappingSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')
    document_type_details = DocumentTypeSerializer(read_only=True, source='document_type')

    class Meta:
        model = StudentDocumentMapping
        exclude = ['created', 'modified']

class StudentFullDetailsSerializer(serializers.ModelSerializer):
    student_details = StudentDetailReadSerializer(read_only=True)
    student_address = StudentAddressSerializer(many=True, read_only=True)
    student_parent = StudentParentGuardianMappingSerializer(read_only=True)
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    document_list = StudentDocumentMappingSerializer(read_only=True, many=True, source='student_document_mapping_student')
    student_group_name = serializers.ReadOnlyField(source='student_group.name')

    class Meta:
        model = Student
        exclude = ['created', 'modified']


class StudentTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentType
        fields = '__all__'


class SubjectStudentSerializer(serializers.ModelSerializer):
    subject = serializers.ReadOnlyField(source='subject.name')
    subject_id = serializers.ReadOnlyField(source='subject.id')
    subject_code = serializers.ReadOnlyField(source='subject.codename')

    class Meta:
        model = SubjectStudent
        exclude = ['created', 'modified']


class StudentParentDetailsSerializer(serializers.ModelSerializer):
    student_parent = StudentParentGuardianMappingSerializer(read_only=True)
    student_subject = SubjectStudentSerializer(many=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'student_parent', 'student_subject', 'full_name', 'current_reg_num']

class StudentParentDetailedDataSerializer(serializers.ModelSerializer):
    student_parent = StudentParentGuardianMappingSerializer(read_only=True)
    student_subject = SubjectStudentSerializer(many=True)
    full_name = serializers.SerializerMethodField()
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = '__all__'

class StudentRfidSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        exclude = ['created', 'modified']

    def create(self, validated_data):
        raise exceptions.ValidationError('You can do only update')

class StudentSiblingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentSiblingMapping
        fields = '__all__'

class StudentGroupSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentGroup
        fields = '__all__'

class ParentDetailIdCardSerializerRead(serializers.ModelSerializer):
    f_profile_pic_details = DocumentSerializer(read_only=True, source='f_profile_pic')
    fathername_with_dot = serializers.SerializerMethodField()
    mothername_with_dot = serializers.SerializerMethodField()
    m_profile_pic_details = DocumentSerializer(read_only=True, source='m_profile_pic')

    def get_fathername_with_dot(self,obj):
        return get_full_name_with_dot(obj.father_name)
    
    
    def get_mothername_with_dot(self,obj):
        return get_full_name_with_dot(obj.mother_name)

    class Meta:
        model = ParentDetail
        fields = ['father_name', 'mother_name', 'f_mobile_num', 'm_mobile_num', 'f_profile_pic_details', 'm_profile_pic_details', 'fathername_with_dot', 'mothername_with_dot']

class GuardianDetailIdCardSerializerRead(serializers.ModelSerializer):

    class Meta:
        model = GuardianDetail
        fields = ['guardian_name']

class StudentParentGuardianIdCardMappingSerializerRead(serializers.ModelSerializer):
    parent = ParentDetailIdCardSerializerRead()
    guardian = GuardianDetailIdCardSerializerRead()

    class Meta:
        model = StudentParentMapping
        exclude = ['created', 'modified']

class StudentListIdCardSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    name_double_space = serializers.SerializerMethodField()
    standard = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')
    user_student = serializers.ReadOnlyField(read_only=True, source='user_student.id')
    barcode_number = serializers.ReadOnlyField(read_only=True, source='user_student.barcode_number')
    barcode_image_url = serializers.ReadOnlyField(read_only=True, source='user_student.barcode_url')
    student_parent = StudentParentGuardianIdCardMappingSerializerRead(read_only=True)
    student_group_name = serializers.ReadOnlyField(source='student_group.name')
    student_address = StudentAddressSerializer(many=True, read_only=True)
    student_details = StudentDetailReadSerializer(read_only=True)
    
    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    def get_name_double_space(self,obj):
        return get_full_name_with_double_space(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = '__all__'


class IdCardUpdateSerializer(serializers.ModelSerializer):
    academic_year = serializers.SerializerMethodField()
    
    def get_academic_year(self, obj):
        start_year = obj.academic_year.start_date.year
        end_year = obj.academic_year.end_date.year
        return f"{start_year} - {end_year}"


    class Meta:
        model = IdCardUpdate
        fields = '__all__'


from rest_framework import serializers
from django.db.models import Q
from .models import StudentIdCardUpdate
from .serializers import DocumentUrlSerializer  # adjust import


class StudentIdCardUpdateSerializer(serializers.ModelSerializer):
    """Serializer for StudentIdCardUpdate: create, update, list, retrieve."""

    student_display_name = serializers.SerializerMethodField(read_only=True)
    academic_year_display = serializers.SerializerMethodField(read_only=True)
    image_details = serializers.SerializerMethodField(read_only=True)
    processed_image_details = serializers.SerializerMethodField(read_only=True)

    # ✅ MAIN VALIDATION (same table check)
    def validate(self, data):
        student = data.get('student') or getattr(self.instance, 'student', None)
        academic_year = data.get('academic_year') or getattr(self.instance, 'academic_year', None)

        if student and academic_year:
            queryset = StudentIdCardUpdate.objects.filter(
                student=student,
                academic_year=academic_year
            )

            # Exclude current record during update
            if self.instance:
                queryset = queryset.exclude(id=self.instance.id)

            if queryset.exists():
                raise serializers.ValidationError({
                    "student": "An ID card update already exists for this student in the selected academic year."
                })

        return data

    # -----------------------------
    # Display Helpers
    # -----------------------------

    def get_student_display_name(self, obj):
        if not obj.student:
            return None
        return obj.name

    def get_academic_year_display(self, obj):
        if not obj.academic_year:
            return None
        return f"{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}"

    def get_image_details(self, obj):
        if not obj.image:
            return None
        return DocumentUrlSerializer(obj.image).data

    def get_processed_image_details(self, obj):
        if not obj.processed_image:
            return None
        return DocumentUrlSerializer(obj.processed_image).data

    class Meta:
        model = StudentIdCardUpdate
        fields = '__all__'
        
        
        
class IdCardDataSyncSerializer(serializers.Serializer):
    academic_year = serializers.IntegerField(required=True)
    bulk = serializers.IntegerField(required=True)  # 1 = bulk, 0 = selected
    student_to_id = serializers.IntegerField(required=True)  # 1 = student→id, 0 = id→student
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False
    )

    def validate(self, data):
        if data['bulk'] == 0 and not data.get('student_ids'):
            raise serializers.ValidationError("student_ids required for selected sync")
        return data
    
    
class StudentToIdCardSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentIdCardUpdate
        fields = ['student', 'academic_year', 'name', 'dob', 'mobile', 'student_class', 'image']

    def create(self, validated_data):
        student = validated_data['student']
        academic_year = validated_data['academic_year']

        obj, _ = StudentIdCardUpdate.objects.get_or_create(
            student=student,
            academic_year=academic_year
        )

        obj.name = f"{student.first_name} {student.last_name or ''}"
        obj.dob = student.dob
        obj.mobile = student.mobile_num
        obj.student_class = student.current_standard.name if student.current_standard else None
        obj.image = student.profile_pic
        obj.save()

        return obj
    
    
class IdCardToStudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = ['first_name', 'mobile_num', 'dob', 'profile_pic']

    def update(self, instance, validated_data):
        id_card = self.context.get('id_card')

        if id_card.name:
            instance.first_name = id_card.name.split(' ')[0]

        instance.mobile_num = id_card.mobile
        instance.dob = id_card.dob
        instance.profile_pic = id_card.image
        instance.save()

        return instance