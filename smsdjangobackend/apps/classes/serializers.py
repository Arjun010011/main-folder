from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.classes.models import (Subject, Standard, Section, StandardSectionMapping, Enrollment, AssignSubject,
                                 PromoteStudent, LessonPlanTemplate, LessonPlanTopic, LessonPlanSubtopic,
                                 LessonPlanSubtopicDetail, LessonPlanAcademicYear, LessonPlanTopicAcademicYear,
                                 LessonPlanSubtopicAcademicYear, LessonPlanSubtopicDetailAcademicYear,
                                 LessonPlanSubtopicDetailReview, LessonPlanVersion, AiLessonPlanCache)
from apps.classes.models.attendance import (Attendance, MachineAttendance, MachineAttendanceFailedToSaveData, MachineAttendanceLog, MachineUserLog, MachineUserMapping,SubjectAttendance, 
                                            AttendanceBatch, AttendanceBatchStudentMapping, BatchAttendance, StandardAttendanceConfiguration,AttendanceBatchStandardSectionSubjectMapping)
from apps.classes.models.enrollment import StudentStandardMapping, StudentTcIssuedTrack
from apps.classes.models.standard import Branch
from apps.institutes.models.academic_year_branch import AcademicYearBranchMapping
from apps.students.models.student import Student
from apps.classes.models.subject import (CumulativeType, SubjectPartType, SubjectStudent, SubjectBranchMapping,CourseOutcome,ProgramOutcome,SubjectCourseOutcomeMapping,SubjectProgramOutcomeMapping,ProgramSpecificOutcome,SubjectCategory, SubjectTeachingHourMapping, SubjectExamDetails,
                                         SubjectCourseOutcomeProgramMappingMatrix,SubjectProgramSpecificOutcomeMapping,SubjectProgramSpecificOutcomeMapping,SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix, SubjectDetails, 
                                         SubjectSubjectTypeMapping,ProgramEducationalObjectives,SubjectProgramEducationalObjectives,SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix)
from apps.classes.models.staff_subject import StaffSubjectDetails
from apps.staffs.models.staff import Staff, StaffBranchMapping, HODBranchMapping
from apps.users.models.user import User
from apps.shared.serializers import DocumentSerializer, CustomUniqueValidator
from apps.shared.services_shared.common import get_full_name
from apps.users.serializers import UserReadSerializer
from apps.classes.models.studentleave import StudentLeaveDates,StudentLeaves,StudentLeaveType,StudentLeaveTypeAcademicYearMapping,StaffStandardSectionMapping,StaffStandardSectionMapping
from apps.institutes.models.academicYear import AcademicYear

class SubjectSerializer(serializers.ModelSerializer):
    subject_part_type_name = serializers.ReadOnlyField(source='subject_part_type.name')

    class Meta:
        model = Subject
        fields = '__all__'

class SubjectBranchMappingSerializer(serializers.ModelSerializer):
    branch_name  = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = SubjectBranchMapping
        fields = '__all__'


class StandardSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=Standard.objects.filter(is_active=True),
                                                             message='Standard name is already exists.')])
    standardyearname_name = serializers.ReadOnlyField(source='standardyearname.name')

    class Meta:
        model = Standard
        exclude = ['is_active']


class SectionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=Section.objects.filter(is_active=True),
                                                             message='Section name is already exists.')])

    class Meta:
        model = Section
        fields = ['id', 'name']


class StandardSectionMappingSerializer(serializers.ModelSerializer):
    section__name = serializers.ReadOnlyField(source='section.name')
    standard_name = serializers.ReadOnlyField(source='standard.name')
    standard_sequence = serializers.ReadOnlyField(source='standard.sequence')

    class Meta:
        model = StandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'standard', 'section')
            )
        ]
        fields = '__all__'


class StudentStandardMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentStandardMapping
        # validators = [
        #     serializers.UniqueTogetherValidator(
        #         queryset=model.objects.all(),
        #         # fields=('academic_year', 'student'),
        #         # message='Student is already enrolled to the standard in the academic year.'
        #     )
        # ]
        fields = '__all__'


class FilterStandardSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField(source='standard.id')
    name = serializers.ReadOnlyField(source='standard.name')

    class Meta:
        model = StandardSectionMapping
        fields = ['id', 'name']


class FilterSectionSerializer(serializers.ModelSerializer):
    standard_section = serializers.ReadOnlyField(source='id')
    id = serializers.ReadOnlyField(source='section.id')
    name = serializers.ReadOnlyField(source='section.name')
    standard_name = serializers.ReadOnlyField(source='standard.name')

    class Meta:
        model = StandardSectionMapping
        fields = ['standard_section', 'id', 'name','standard','standard_name']

class FilterSubjectSerializer(serializers.ModelSerializer):
    section_id = serializers.ReadOnlyField(source='assigned_subjects.section.id')
    section_name = serializers.ReadOnlyField(source='assigned_subjects.section.name')
    subject_name = serializers.ReadOnlyField(source='subject.name')

    class Meta:
        model = AssignSubject
        fields = ['standard_section', 'id', 'subject']

class FilterSectionStrengthSerializer(serializers.ModelSerializer):
    standard_section = serializers.ReadOnlyField(source='id')
    id = serializers.ReadOnlyField(source='section.id')
    name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = StandardSectionMapping
        fields = ['standard_section', 'id', 'name', 'strength']


class EnrollmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Enrollment
        queryset = model.objects.all()
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=queryset,
                fields=('standard_section', 'student')
            )
        ]
        fields = '__all__'


class GetEnrollmentSerializer(serializers.ModelSerializer):
    academic_year_value = serializers.SerializerMethodField()
    standard_id = serializers.ReadOnlyField(source='standard_section.standard.id')
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    name = serializers.SerializerMethodField()
    student_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    student_mobile_num = serializers.ReadOnlyField(source='student.mobile_num')
    student_email = serializers.ReadOnlyField(source='student.email')
    student_dob = serializers.ReadOnlyField(source='student.dob')
    student_gender = serializers.ReadOnlyField(source='student.gender')
    student_type = serializers.ReadOnlyField(source='student.student_type')
    profile_pic_details = DocumentSerializer(read_only=True, source='profile_pic')

    def get_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)

    def get_academic_year_value(self, obj):
        return f'{obj.standard_section.academic_year.start_date.year}-{obj.standard_section.academic_year.end_date.year}'

    class Meta:
        model = Enrollment
        exclude = ['created', 'modified']


class EnrolledStudentsSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    student_gender = serializers.ReadOnlyField(source='student.gender')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    mobile_num = serializers.ReadOnlyField(source='student.mobile_num')
    dob = serializers.ReadOnlyField(source='student.dob')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='student.profile_pic')
    student_type = serializers.ReadOnlyField(source='student.student_type')
    rfid = serializers.ReadOnlyField(source='student.rfid')
    user_id = serializers.ReadOnlyField(source='student.user_student.id')

    def get_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)

    class Meta:
        model = Enrollment
        exclude = ['created', 'modified']


class AssignSubjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = AssignSubject
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('standard_section', 'subject')
            )
        ]
        fields = '__all__'


class GetSubjectSerializer(serializers.ModelSerializer):
    subject = serializers.ReadOnlyField(source='subject.name')
    is_language = serializers.ReadOnlyField(source='subject.is_language')
    sequence = serializers.ReadOnlyField(source='subject.sequence')
    subject_alias = serializers.SerializerMethodField()

    def get_subject_alias(self, obj):
        text = ''
        from apps.shared.services import ConfigurationService
        if int(ConfigurationService.get_setting_value('number_of_language')) > 1:
            if obj.subject.is_language:
                if obj.subject.sequence == 1:
                    text = '[Lang 1]'
                if obj.subject.sequence == 2:
                    text = '[Lang 2]'
                if obj.subject.sequence == 3:
                    text = '[Lang 3]'
        subjectName = f'{obj.subject.name} {text}'
        return f'{subjectName.strip()}'

    class Meta:
        model = AssignSubject
        fields = ['id', 'subject', 'subject_id', 'is_language', 'sequence', 'subject_alias','standard_section']


class GetSubjectSerializerForAssignSubject(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    subject_codename = serializers.ReadOnlyField(source='subject.codename')
    subject_sequence = serializers.ReadOnlyField(source='subject.sequence')
    subject_is_language = serializers.ReadOnlyField(source='subject.is_language')

    class Meta:
        model = AssignSubject
        fields = ['id', 'subject_name', 'subject_id', 'subject_codename', 'subject_sequence', 'subject_is_language',
                   'subject']


class GetStandardSectionSubjectSerializer(serializers.ModelSerializer):
    standard_section = serializers.ReadOnlyField(source='id')
    assigned_subjects = GetSubjectSerializerForAssignSubject(many=True)
    section_name = serializers.ReadOnlyField(source='section.name')
    standard_name = serializers.ReadOnlyField(source='standard.name')
    standard_sequence = serializers.ReadOnlyField(source='standard.sequence')

    class Meta:
        model = StandardSectionMapping
        fields = ['standard_section', 'assigned_subjects','standard','section','standard_sequence','section_name','standard_name']

class SubjectStudentSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    subject_codename = serializers.ReadOnlyField(source='subject.codename')
    subject_sequence = serializers.ReadOnlyField(source='subject.sequence')
    subject_is_language = serializers.ReadOnlyField(source='subject.is_language')

    class Meta:
        model = SubjectStudent
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'subject', 'student'),
                message='Subject(s) is already assigned for the student in the Academic Year'
            )
        ]
        fields = '__all__'


class PromoteStudentSerializer(serializers.ModelSerializer):
    from_academic_year_value = serializers.SerializerMethodField()
    to_academic_year_value = serializers.SerializerMethodField()
    from_standard_name = serializers.ReadOnlyField(source='from_standard.name')
    to_standard_name = serializers.ReadOnlyField(source='to_standard.name')

    def get_from_academic_year_value(self, obj):
        return f'{obj.from_academic_year.start_date.year}-{obj.from_academic_year.end_date.year}'

    def get_to_academic_year_value(self, obj):
        return f'{obj.to_academic_year.start_date.year}-{obj.to_academic_year.end_date.year}'

    class Meta:
        model = PromoteStudent
        queryset = model.objects.all()
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=queryset,
                fields=('from_academic_year', 'to_academic_year', 'from_standard', 'to_standard', 'student')
            ), serializers.UniqueTogetherValidator(
                queryset=queryset,
                fields=('from_academic_year', 'to_academic_year', 'student')
            )
        ]
        fields = '__all__'


class GetEnrollmentStandard(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    academic_year = serializers.ReadOnlyField(source='standard_section.academic_year.id')
    academic_year_start_date = serializers.ReadOnlyField(source='standard_section.academic_year.start_date')
    academic_year_end_date = serializers.ReadOnlyField(source='standard_section.academic_year.end_date')

    class Meta:
        model = Enrollment
        fields = ['standard_name', 'section_name', 'standard_section',
        'academic_year', 'academic_year_start_date', 'academic_year_end_date']


class AttendanceSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    mobile_num = serializers.ReadOnlyField(source='student.mobile_num')
    dob = serializers.ReadOnlyField(source='student.dob')
    profile_pic_details = DocumentSerializer(read_only=True, source='student.profile_pic')
    standard_name = serializers.ReadOnlyField(read_only=True, source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(read_only=True, source='standard_section.section.name')

    def get_name(self, obj):
        return get_full_name(obj.student.first_name,obj.student.middle_name, obj.student.last_name)

    class Meta:
        model = Attendance
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('for_date', 'session', 'student'),
                message='Student(s) attendance for the date and session is already exists.'
            )
        ]
        exclude = ['modified']

class SubjectAttendanceSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    mobile_num = serializers.ReadOnlyField(source='student.mobile_num')
    dob = serializers.ReadOnlyField(source='student.dob')
    profile_pic_details = DocumentSerializer(read_only=True, source='student.profile_pic')
    standard_name = serializers.ReadOnlyField(read_only=True, source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(read_only=True, source='standard_section.section.name')
    subject_name = serializers.ReadOnlyField(read_only=True,source='subject.name' )
    period_name = serializers.ReadOnlyField(read_only=True,source='period_day_mapping.period.name')

    def get_name(self, obj):
        return get_full_name(obj.student.first_name,obj.student.middle_name, obj.student.last_name)

    class Meta:
        model = SubjectAttendance
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('for_date', 'subject', 'student','from_time','to_time'),
                message='Student(s) attendance for the period already exists.'
            )
        ]
        exclude = ['modified']


class FilteredListSerializer(serializers.ListSerializer):
    def to_representation(self, data):
        if self.context.get('academic_year'):
            academicYear = self.context.get('academic_year')
            if academicYear:
                data = data.filter(academic_year=academicYear)
        return super(FilteredListSerializer, self).to_representation(data)


class SubjectStudentReadSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = SubjectStudent
        fields = ['subject_name', 'subject', 'id']


class StudentSubjectsReadSerializer(serializers.ModelSerializer):
    student_subject = SubjectStudentReadSerializer(many=True)
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['id', 'full_name', 'student_subject']

class MachineAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()

    def get_student_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)

    class Meta:
        model = MachineAttendance
        fields = '__all__'
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('student', 'for_date', 'academic_year')
            )
        ]

class CumulativeSerializer(serializers.ModelSerializer):


    class Meta:
        model = CumulativeType
        fields = '__all__'

class BranchSerializer(serializers.ModelSerializer):


    class Meta:
        model = Branch
        fields = '__all__'


class SubjectPartTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubjectPartType
        fields = '__all__'

class AcademicYearBranchMappingReadSerializer(serializers.ModelSerializer):
    branch_name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = AcademicYearBranchMapping
        fields = '__all__'

class StudentTcIssuedTrackSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentTcIssuedTrack
        fields = '__all__'


class MachineStaffSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['full_name']

class MachineStudentSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField(read_only=True)

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['full_name', 'rfid']

class MachineUserReadSerializer(serializers.ModelSerializer):
    staff = MachineStaffSerializer(read_only=True)
    student = MachineStudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'staff', 'student']

class MachineUserMappingReadSerializer(serializers.ModelSerializer):
    user_details = MachineUserReadSerializer(source='user', read_only=True)

    class Meta:
        model = MachineUserMapping
        fields = '__all__'

class MachineAttendanceFailedToSaveDataSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = MachineAttendanceFailedToSaveData
        fields = '__all__'

class MachineAttendanceLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = MachineAttendanceLog
        fields = '__all__'

class MachineUserLogSerializer(serializers.ModelSerializer):
    user_details = UserReadSerializer(source='user', read_only=True)

    class Meta:
        model = MachineUserLog
        fields = '__all__'

class StudentLeaveDatesSerializers(serializers.ModelSerializer):
    class Meta:
        model = StudentLeaveDates
        fields = '__all__'

class GetStudentLeaveSerializers(serializers.ModelSerializer):
    fromdate = serializers.DateField()
    todate = serializers.DateField()
    full_name = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    attach_file_details = DocumentSerializer(read_only=True, source='attach_file')
    student_leave_date_student_leave = StudentLeaveDatesSerializers(many=True)

    def get_full_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)

    def get_approved_by_name(self, obj):
        try:
            return get_full_name(obj.approved_by.first_name, obj.approved_by.middle_name, obj.approved_by.last_name)
        except:
            return ''

    class Meta:
        model = StudentLeaves
        fields = '__all__'

class StudentLeaveTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=StudentLeaveType.objects.filter(is_active=True))])
    code = serializers.CharField(validators=[CustomUniqueValidator(queryset=StudentLeaveType.objects.filter(is_active=True))])
    class Meta:
        model = StudentLeaveType

        fields = '__all__'


class StudentLeaveTypeAcademicYearMappingSerializer(serializers.ModelSerializer):
    leavetype_name = serializers.ReadOnlyField(source='leave_type.name')
    leavetype_code = serializers.ReadOnlyField(source='leave_type.code')
    section_name = serializers.ReadOnlyField(source='section.name')

    class Meta:
        model = StudentLeaveTypeAcademicYearMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'leave_type'),
                message='Leave type already exists for the leave year'
            )
        ]
        fields = '__all__'

class StaffStandardSectionMappingSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    standard_name = serializers.ReadOnlyField(source="standard_section.standard.name")
    standard_id = serializers.ReadOnlyField(source="standard_section.standard.id")
    section_id = serializers.ReadOnlyField(source="standard_section.section.id")
    academic_year_id = serializers.ReadOnlyField(source="standard_section.academic_year.id")
    section_name = serializers.ReadOnlyField(source="standard_section.section.name")

    def get_staff_name(self, obj):
        if obj.staff is None:
            return None
        return get_full_name(obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name)
    
    class Meta:
        model = StaffStandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('staff','standard_section','is_active'),
                message='Staff is already mapped to the given Section'
            )
        ]
        fields = '__all__'

class StaffStandardMappingDataReadSerializer(serializers.ModelSerializer):
    staff_standard_section_mapping_staff = serializers.SerializerMethodField()
    name = serializers.SerializerMethodField()
    group_name = serializers.SerializerMethodField()

    def get_staff_standard_section_mapping_staff(self, obj):
        qs = obj.staff_standard_section_mapping_staff.filter(is_active=True)
        academic_year = self.context.get('request', {}).query_params.get('academic_year')
        if academic_year:
            qs = qs.filter(standard_section__academic_year_id=academic_year)
        return StaffStandardSectionMappingSerializer(qs, many=True).data

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    def get_group_name(self, obj):
        try:
            return obj.users.groups.values_list('name', flat=True)
        except:
            return None

    class Meta:
        model = Staff
        fields = ['name', 'email', 'staff_standard_section_mapping_staff', 'group_name', 'id']

class StudentLeaveSerializers(serializers.ModelSerializer):
    profile_pic_details = DocumentSerializer(read_only=True, source='student.profile_pic')

    class Meta:
        model = StudentLeaves
        fields = '__all__'


def get_approved_by_name(obj):
    try:
        return get_full_name(obj.approved_by.first_name, obj.approved_by.middle_name, obj.approved_by.last_name)
    except:
        return ''

class AttendanceBatchStandardSectionSubjectMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = AttendanceBatchStandardSectionSubjectMapping
        fields = '__all__'   

class BatchAttendanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = BatchAttendance
        fields = '__all__'

class AttendanceBatchStudentMappingSerializer(serializers.ModelSerializer):
    id = serializers.ReadOnlyField(source='student.id')
    name = serializers.SerializerMethodField()
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')
    mobile_no = serializers.ReadOnlyField(source='student.mobile_num')
    mobile_num = serializers.ReadOnlyField(source='student.mobile_num')
    dob = serializers.ReadOnlyField(source='student.dob')
    attendance_batch_name = serializers.ReadOnlyField(source='attendance_batch.name')
    profile_pic_details = DocumentSerializer(read_only=True, source='student.profile_pic')
    student_type = serializers.ReadOnlyField(source='student.student_type')
    rfid = serializers.ReadOnlyField(source='student.rfid')
    user_id = serializers.ReadOnlyField(source='student.user_student.id')
    admission_no = serializers.SerializerMethodField()
    current_standard_name = serializers.ReadOnlyField(source='student.current_standard.name')

    def get_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)
    
    def get_admission_no(self,obj):
        from apps.finance.models import AdmissionForm
        return AdmissionForm.get_student_admission_num(self, obj.student.id)

    class Meta:
        model = AttendanceBatchStudentMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('student', 'attendance_batch'),
                message=('Batch Already assigned for student')
            )
        ]
        fields = '__all__'

class StandardAttendanceConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = StandardAttendanceConfiguration
        fields = '__all__'

class AttendanceBatchSerializer(serializers.ModelSerializer):
    standard_section_ids = serializers.SerializerMethodField()
    subject_ids = serializers.SerializerMethodField()
    students = serializers.SerializerMethodField()
    student_ids =serializers.SerializerMethodField()

    class Meta:
        model = AttendanceBatch
        fields = '__all__'

    def get_standard_section_ids(self, obj):
        sections = obj.attendance_batch_attendance_batch_standard_section_subject_mapping.all()
        return [
            {"id": ss.standard_section.id, "name": str(ss.standard_section.standard.name)+'-'+str(ss.standard_section.section.name)}
            for ss in sections if ss.standard_section
        ]

    def get_subject_ids(self, obj):
        sections = obj.attendance_batch_attendance_batch_standard_section_subject_mapping.all()
        return [
            {
                "id": ss.id,  # mapping row ID
                "subjectId": ss.subject.id if ss.subject else None,
                "name": ss.subject.name if ss.subject else None,
            }
            for ss in sections if ss.subject
        ]

    def get_students(self, obj):
        active_students = obj.attendance_batch_student_mapping_attendance_batch.filter(is_active=True)
        return AttendanceBatchStudentMappingSerializer(active_students, many=True).data
    
    def get_student_ids(self, obj):
        active_students = obj.attendance_batch_student_mapping_attendance_batch.filter(is_active=True)
        return [ss.student.id if ss.student else None for ss in active_students if ss.student]

class MachineUserMappingSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(validators=[UniqueValidator(queryset=MachineUserMapping.objects.filter(is_active=True),
                                                             message='MachineUserMapping already exist')])
    machine_user_id = serializers.CharField(validators=[UniqueValidator(queryset=MachineUserMapping.objects.filter(is_active=True),
                                                             message='machine_user_id already exist')])

    user_details = serializers.SerializerMethodField()

    def get_user_details(self, obj):
        if obj.user.student:
            return {'full_name': get_full_name(obj.user.student.first_name, obj.user.student.middle_name, obj.user.student.last_name)}
        elif obj.user.staff:
            return {'full_name': get_full_name(obj.user.staff.first_name, obj.user.staff.middle_name, obj.user.staff.last_name)}
        else:
            return {'full_name': obj.user.username}

    class Meta:
        model = MachineUserMapping
        fields = '__all__'
    
class CourseOutcomeSerializer(serializers.ModelSerializer):

    class Meta:
        model = CourseOutcome
        fields = '__all__'

class ProgramOutcomeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProgramOutcome
        fields = '__all__'

class ProgramSpecificOutcomeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProgramSpecificOutcome
        fields = '__all__'

class ProgramEducationalObjectivesSerializer(serializers.ModelSerializer):

    class Meta:
        model = ProgramEducationalObjectives
        fields = '__all__'

class SubjectProgramEducationalObjectivesSerializer(serializers.ModelSerializer):

    subject_name = serializers.ReadOnlyField(source="subject.name")
    program_educational_objectives_name = serializers.ReadOnlyField(source="program_educational_objectives.name")

    class Meta:
        model = SubjectProgramEducationalObjectives
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject', 'program_educational_objectives'),
                message='This Program Educational Objectives is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectCourseOutcomeMappingSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source="subject.name")
    course_outcome_name = serializers.ReadOnlyField(source="course_outcome.name")

    class Meta:
        model = SubjectCourseOutcomeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject', 'course_outcome'),
                message='This Course is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectProgramOutcomeMappingSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source="subject.name")
    program_outcome_name = serializers.ReadOnlyField(source="program_outcome.name")

    class Meta:
        model = SubjectProgramOutcomeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject', 'program_outcome'),
                message='This Program Outcome is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectProgramSpecificOutcomeMappingSerializer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source="subject.name")
    program_specific_outcome_name = serializers.ReadOnlyField(source="program_specific_outcome.name")

    class Meta:
        model = SubjectProgramSpecificOutcomeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject', 'program_specific_outcome'),
                message='This Program Specific Outcome is already assigned to the subject'
            )
        ]
        fields = '__all__'

class StaffSubjectDetailsSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = StaffSubjectDetails
        fields = '__all__'

class StaffGroupMappingSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = StaffBranchMapping
        fields = '__all__'

class HODGroupMappingSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = HODBranchMapping
        fields = '__all__'

class SubjectCategorySerializer(serializers.ModelSerializer):
    
    class Meta:
        model = SubjectCategory
        fields = '__all__'

class SubjectDetailsSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = SubjectDetails
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject',),
                message='This Subject Details is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectTeachingHourMappingSerializer(serializers.ModelSerializer):
    teaching_type_label = serializers.SerializerMethodField()

    def get_teaching_type_label(self, obj):
        if obj.teaching_type:
            if obj.teaching_type == 1:
                return 'Theory'
            if obj.teaching_type == 2:
                return 'Tutorial'
            if obj.teaching_type == 3:
                return 'Practical'
            if obj.teaching_type == 4:
                return 'Saae'

    class Meta:
        model = SubjectTeachingHourMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject','teaching_type'),
                message='This Subject, Teaching Type already assigned to the subject'
            )
        ]
        fields = ("id", "subject", "teaching_type", "value", "teaching_type_label")

class SubjectExamDetailsSerializer(serializers.ModelSerializer):
    exam_type_label = serializers.SerializerMethodField()

    def get_exam_type_label(self, obj):
        if obj.exam_type:
            if obj.exam_type == 1:
                return 'exam_conduction_hour'
            if obj.exam_type == 2:
                return 'cie_marks'
            if obj.exam_type == 3:
                return 'see_marks'
            if obj.exam_type == 4:
                return 'total_marks'
            
    class Meta:
        model = SubjectExamDetails
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject','exam_type'),
                message='This Subject, Exam Type already assigned to the subject'
            )
        ]
        fields = ("id", "subject", "exam_type", "value", "exam_type_label")

class SubjectSubjectTypeMappingSerializer(serializers.ModelSerializer):
    subject_type_label = serializers.SerializerMethodField()

    def get_subject_type_label(self, obj):
        if obj.subject_type:
            if obj.subject_type == 1:
                return 'is_lab'
            if obj.subject_type == 2:
                return 'is_elective'

    class Meta:
        model = SubjectSubjectTypeMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject','subject_type'),
                message='This Subject, Subject Type already assigned to the subject'
            )
        ]
        fields = ("id", "subject", "subject_type", "value", "subject_type_label")

class SubjectDetailsReadSerializer(serializers.ModelSerializer):
    subject_data = SubjectSerializer(source='subject',read_only=True)
    subject_branch = serializers.SerializerMethodField()
    exam_marks_details = SubjectExamDetailsSerializer(source='subject.subject_exam_details_subject',read_only=True, many=True)
    subject_type_details = SubjectSubjectTypeMappingSerializer(source='subject.subject_subject_type_subject',read_only=True, many=True)
    subject_teaching_hours = SubjectTeachingHourMappingSerializer(source='subject.subject_teaching_hour_subject',read_only=True, many=True)
    subject_name = serializers.ReadOnlyField(source="subject.name")
    subject_category_name = serializers.ReadOnlyField(source="subject_category.name")

    def get_subject_branch(self, obj):
        branch = obj.subject.subject_branch_mapping_subject.first()
        if branch:
            return SubjectBranchMappingSerializer(branch).data
        return None

    class Meta:
        model = SubjectDetails
        fields = '__all__'

class SubjectCourseOutcomeProgramMappingMatrixSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubjectCourseOutcomeProgramMappingMatrix
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject_course_outcome','subject_program_outcome'),
                message='This Course is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrixSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject_course_outcome','subject_program_specific_outcome'),
                message='This Course is already assigned to the subject'
            )
        ]
        fields = '__all__'

class SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrixSerializer(serializers.ModelSerializer):

    class Meta:
        model = SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('subject_course_outcome','subject_program_educational_objectives'),
                message='This Course is already assigned to the subject'
            )
        ]
        fields = '__all__'

# Lesson plan serializers: read (nested for GET); write (plain, create-only in service)
class LessonPlanSubtopicDetailReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanSubtopicDetail
        fields = ['id', 'name', 'objectives', 'activities', 'resource', 'assessment']


class LessonPlanSubtopicDetailWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanSubtopicDetail
        fields = ['subtopic', 'name', 'objectives', 'activities', 'resource', 'assessment']


class LessonPlanSubtopicReadSerializer(serializers.ModelSerializer):
    subtopic_details = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanSubtopic
        fields = ['id', 'name', 'sequence', 'subtopic_details']

    def get_subtopic_details(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_detail_lesson_plan_subtopic', None)
        if qs is None:
            return []
        return LessonPlanSubtopicDetailReadSerializer(qs.order_by('id'), many=True).data


class LessonPlanSubtopicWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanSubtopic
        fields = ['topic', 'name', 'sequence']


class LessonPlanTopicReadSerializer(serializers.ModelSerializer):
    subtopics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanTopic
        fields = ['id', 'name', 'sequence', 'subtopics']

    def get_subtopics(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_lesson_plan_topic', None)
        if qs is None:
            return []
        return LessonPlanSubtopicReadSerializer(qs.order_by('sequence', 'id'), many=True).data


class LessonPlanTopicWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanTopic
        fields = ['lesson_plan_template', 'name', 'sequence']


class LessonPlanTemplateReadSerializer(serializers.ModelSerializer):
    lessonplantemplatename = serializers.CharField(source='plan_name', read_only=True)
    subject_name = serializers.ReadOnlyField(source='subject.name', default=None)
    standard_name = serializers.ReadOnlyField(source='standard.name', default=None)
    topics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanTemplate
        fields = ['id', 'lessonplantemplatename', 'plan_name', 'subject', 'standard', 'subject_name', 'standard_name',
                  'is_active', 'created', 'modified', 'topics']

    def get_topics(self, obj):
        qs = getattr(obj, 'lesson_plan_topic_lesson_plan_template', None)
        if qs is None:
            return []
        return LessonPlanTopicReadSerializer(qs.order_by('sequence', 'id'), many=True).data


class LessonPlanTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanTemplate
        fields = ['plan_name', 'subject', 'standard', 'is_active','id']


# --- Lesson plan academic year: one serializer per model (handles read + write) ---


class LessonPlanSubtopicDetailAcademicYearSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonPlanSubtopicDetailAcademicYear
        fields = [
            'id', 'lesson_plan_subtopic_academic_year', 'name', 'objectives', 'activities',
            'resource', 'assessment', 'allocated_from_date', 'allocated_to_date', 'allocated_to_user', 'completion_date',
            'is_manually_edited', 'last_ai_synced_at',
            'created', 'modified',
        ]


class LessonPlanVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanVersion
        fields = [
            'id', 'lesson_plan', 'version_number', 'snapshot', 
            'change_summary', 'created_by', 'created_by_name', 'created_at'
        ]

    def get_created_by_name(self, obj):
        if not obj.created_by_id:
            return "System"
        return get_full_name(obj.created_by.first_name, obj.created_by.middle_name, obj.created_by.last_name)


class LessonPlanSubtopicAcademicYearSerializer(serializers.ModelSerializer):
    subtopic_details = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanSubtopicAcademicYear
        fields = ['id', 'lesson_plan_topic_academic_year', 'name', 'sequence', 'subtopic_details', 'created', 'modified']

    def get_subtopic_details(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year', None)
        if qs is None:
            return []
        return LessonPlanSubtopicDetailAcademicYearSerializer(qs.order_by('id'), many=True).data


class LessonPlanTopicAcademicYearSerializer(serializers.ModelSerializer):
    subtopics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanTopicAcademicYear
        fields = ['id', 'lesson_plan_academic_year', 'name', 'sequence', 'subtopics', 'created', 'modified']

    def get_subtopics(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year', None)
        if qs is None:
            return []
        return LessonPlanSubtopicAcademicYearSerializer(qs.order_by('sequence', 'id'), many=True).data


class LessonPlanAcademicYearSerializer(serializers.ModelSerializer):
    """Write: accepts academic_year, subject, standard_section, lesson_plan_template (IDs)."""
    class Meta:
        model = LessonPlanAcademicYear
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('academic_year', 'subject', 'standard_section'),
                message='Lesson plan academic year already exists'
            )
        ]
        fields = [
            'id', 'academic_year', 'subject', 'standard_section', 'lesson_plan_template',
            'created', 'modified',
        ]


class LessonPlanAcademicYearReadSerializer(serializers.ModelSerializer):
    """Read: nested output for list/retrieve."""
    lesson_plan_template = LessonPlanTemplateSerializer(read_only=True)
    academic_year = serializers.SerializerMethodField()
    standard_section = StandardSectionMappingSerializer(read_only=True)
    standard_section_display = serializers.SerializerMethodField()
    subject = SubjectSerializer(read_only=True)
    topics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanAcademicYear
        fields = [
            'id', 'academic_year', 'subject', 'standard_section', 'standard_section_display',
            'lesson_plan_template', 'created', 'modified', 'topics',
        ]

    def get_academic_year(self, obj):
        if not obj.academic_year_id:
            return None
        from apps.institutes.serializers import AcademicYearSerializer
        return AcademicYearSerializer(obj.academic_year).data

    def get_standard_section_display(self, obj):
        """Flat string for table display so frontend does not render object as React child."""
        if not obj.standard_section_id:
            return ''
        ss = obj.standard_section
        parts = []
        if ss.standard_id:
            parts.append(ss.standard.name)
        if ss.section_id:
            parts.append(ss.section.name)
        return ' - '.join(parts) if parts else str(ss)

    def get_topics(self, obj):
        qs = getattr(obj, 'lesson_plan_topic_academic_year_lesson_plan_academic_year', None)
        if qs is None:
            return []
        return LessonPlanTopicAcademicYearSerializer(qs.order_by('sequence', 'id'), many=True).data


# --- Lesson plan status (for UpdateLessonPlanStatus API: details + comments) ---


class LessonPlanSubtopicDetailReviewSerializer(serializers.ModelSerializer):
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanSubtopicDetailReview
        fields = ['id', 'lesson_plan_subtopic_detail_academic_year', 'message', 'date', 'created_by', 'created_by_name', 'created', 'modified']

    def get_created_by_name(self, obj):
        if not obj.created_by_id:
            return None
        return get_full_name(
            getattr(obj.created_by, 'first_name', ''),
            getattr(obj.created_by, 'middle_name', ''),
            getattr(obj.created_by, 'last_name', ''),
        )


class LessonPlanSubtopicDetailReviewWriteSerializer(serializers.ModelSerializer):
    """Write serializer for create/update review (comment)."""

    class Meta:
        model = LessonPlanSubtopicDetailReview
        fields = ['id', 'lesson_plan_subtopic_detail_academic_year', 'message', 'date', 'created_by']


class LessonPlanSubtopicDetailStatusSerializer(serializers.ModelSerializer):
    """Subtopic detail with allocated dates, completion_date, and comments (reviews)."""
    comments = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanSubtopicDetailAcademicYear
        fields = [
            'id', 'name', 'objectives', 'activities', 'resource', 'assessment',
            'allocated_from_date', 'allocated_to_date', 'allocated_to_user', 'completion_date',
            'comments', 'created', 'modified',
        ]

    def get_comments(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_detail_review_detail', None)
        if qs is None:
            return []
        return LessonPlanSubtopicDetailReviewSerializer(qs.order_by('-date', '-id'), many=True).data


def _detail_in_date_range(detail, yesterday, today, tomorrow):
    """True if detail is: yesterday pending, or today, or tomorrow."""
    from_date = getattr(detail, 'allocated_from_date', None)
    to_date = getattr(detail, 'allocated_to_date', None)
    completion = getattr(detail, 'completion_date', None)
    if not from_date:
        return False
    # Yesterday pending: allocated covers yesterday and not completed
    if from_date <= yesterday and (to_date is None or to_date >= yesterday) and not completion:
        return True
    # Today
    if from_date <= today and (to_date is None or to_date >= today):
        return True
    # Tomorrow
    if from_date <= tomorrow and (to_date is None or to_date >= tomorrow):
        return True
    return False


class LessonPlanSubtopicStatusSerializer(serializers.ModelSerializer):
    subtopic_details = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanSubtopicAcademicYear
        fields = ['id', 'name', 'sequence', 'subtopic_details', 'created', 'modified']

    def get_subtopic_details(self, obj):
        from datetime import timedelta
        qs = getattr(obj, 'lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year', None)
        if qs is None:
            return []
        details = list(qs.order_by('id'))
        fordate = self.context.get('fordate')  # date object for filtering
        if fordate:
            yesterday = fordate - timedelta(days=1)
            tomorrow = fordate + timedelta(days=1)
            details = [d for d in details if _detail_in_date_range(d, yesterday, fordate, tomorrow)]
        return LessonPlanSubtopicDetailStatusSerializer(details, many=True).data


class LessonPlanTopicStatusSerializer(serializers.ModelSerializer):
    subtopics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanTopicAcademicYear
        fields = ['id', 'name', 'sequence', 'subtopics', 'created', 'modified']

    def get_subtopics(self, obj):
        qs = getattr(obj, 'lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year', None)
        if qs is None:
            return []
        return LessonPlanSubtopicStatusSerializer(qs.order_by('sequence', 'id'), many=True).data

class LessonPlanStatusReadSerializer(serializers.ModelSerializer):
    """Full lesson plan for status API: academic_year, subject, standard_section, topics with details and comments."""
    lesson_plan_template = LessonPlanTemplateSerializer(read_only=True)
    academic_year = serializers.SerializerMethodField()
    standard_section = StandardSectionMappingSerializer(read_only=True)
    subject = SubjectSerializer(read_only=True)
    topics = serializers.SerializerMethodField()

    class Meta:
        model = LessonPlanAcademicYear
        fields = [
            'id', 'academic_year', 'subject', 'standard_section', 'lesson_plan_template',
            'created', 'modified', 'topics',
        ]

    def get_academic_year(self, obj):
        if not obj.academic_year_id:
            return None
        from apps.institutes.serializers import AcademicYearSerializer
        return AcademicYearSerializer(obj.academic_year).data

    def get_topics(self, obj):
        qs = getattr(obj, 'lesson_plan_topic_academic_year_lesson_plan_academic_year', None)
        if qs is None:
            return []
        return LessonPlanTopicStatusSerializer(qs.order_by('sequence', 'id'), many=True).data


def _validate_ai_lesson_plan_metadata(attrs):
    standard_section = attrs['standard_section']
    academic_year = attrs['academic_year']
    subject = attrs['subject']
    lesson_plan_template = attrs.get('lesson_plan_template')

    if standard_section.academic_year_id and standard_section.academic_year_id != academic_year.id:
        raise serializers.ValidationError(
            {'standard_section': 'standard_section does not belong to the provided academic_year.'}
        )

    if lesson_plan_template:
        if lesson_plan_template.subject_id and lesson_plan_template.subject_id != subject.id:
            raise serializers.ValidationError(
                {'lesson_plan_template': 'lesson_plan_template does not belong to the provided subject.'}
            )
        if (
            lesson_plan_template.standard_id
            and standard_section.standard_id
            and lesson_plan_template.standard_id != standard_section.standard_id
        ):
            raise serializers.ValidationError(
                {'lesson_plan_template': 'lesson_plan_template does not belong to the provided standard.'}
            )
    return attrs


class AiLessonPlanPreviewSerializer(serializers.Serializer):
    file = serializers.FileField()
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.filter(is_active=True)
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(is_active=True)
    )
    standard_section = serializers.PrimaryKeyRelatedField(
        queryset=StandardSectionMapping.objects.all()
    )
    lesson_plan_template = serializers.PrimaryKeyRelatedField(
        queryset=LessonPlanTemplate.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )

    use_fuzzy_match = serializers.BooleanField(required=False, default=False)
    force_regenerate = serializers.BooleanField(required=False, default=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        return _validate_ai_lesson_plan_metadata(attrs)


class AiLessonPlanImportSerializer(serializers.Serializer):
    cache_key = serializers.CharField(max_length=64)
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.filter(is_active=True)
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(is_active=True)
    )
    standard_section = serializers.PrimaryKeyRelatedField(
        queryset=StandardSectionMapping.objects.all()
    )
    lesson_plan_template = serializers.PrimaryKeyRelatedField(
        queryset=LessonPlanTemplate.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    replace_existing = serializers.BooleanField(default=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    def validate_cache_key(self, value):
        if len(value) != 64:
            raise serializers.ValidationError('cache_key must be a 64 character hash.')
        return value

    def validate(self, attrs):
        return _validate_ai_lesson_plan_metadata(attrs)


class AiLessonPlanNcertPreviewSerializer(serializers.Serializer):
    academic_year = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.filter(is_active=True)
    )
    subject = serializers.PrimaryKeyRelatedField(
        queryset=Subject.objects.filter(is_active=True)
    )
    standard_section = serializers.PrimaryKeyRelatedField(
        queryset=StandardSectionMapping.objects.all()
    )
    lesson_plan_template = serializers.PrimaryKeyRelatedField(
        queryset=LessonPlanTemplate.objects.filter(is_active=True),
        required=False,
        allow_null=True,
    )
    book_code = serializers.CharField(max_length=32)
    book_title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    pdf_url = serializers.URLField(required=False, allow_blank=True)
    use_fuzzy_match = serializers.BooleanField(required=False, default=False)
    force_regenerate = serializers.BooleanField(required=False, default=False)
    start_date = serializers.DateField(required=False, allow_null=True)
    end_date = serializers.DateField(required=False, allow_null=True)

    def validate(self, attrs):
        attrs = _validate_ai_lesson_plan_metadata(attrs)
        attrs["book_code"] = attrs["book_code"].strip()
        return attrs
