from rest_framework import serializers
from django.utils.translation import gettext_lazy as _
from django.db.models import F
from rest_framework.exceptions import ValidationError
from apps.classes.models.subject import CumulativeType

from apps.exams.models import (ExamType, Exam, ExamSchedule, StudentMark, Grade,
ResultMarksConfiguration, ResultSectionMapping, ResultConfiguration, StudentScheduleMapping,
StudentMarkSectionWiseApproval, StudentExamFinalResult)
from apps.exams.models import result_configuration
from apps.exams.models.marks import GradeExamScheduleMapping, GradePlan, StudentCumulativeMark, StudentMarkQuestionWise
from apps.exams.models.result import ExamFinalResultConfiguration, ResultSectionApproval,ResultConfigurationMergeName,ResultConfigurationMerge
from apps.exams.models.result_configuration import ExamResultConfiguration, ExamResultCumulativeConfiguration, ExamResultMarksObtained, ExamResultSubjectConfiguration
from apps.exams.models.final_result import (FinalResultConfiguration,FinalResultConfigurationMerge,FinalResultConfigurationMergeName,FinalResultMarksConfiguration,FinalResultSectionApproval,FinalResultSectionMapping,StudentExamFinalResultForFinalConfig,
StudentExamFinalResultForFinalConfig)
from apps.shared.serializers import CustomUniqueValidator, CustomFilteredListSerializer
from apps.classes.models import StandardSectionMapping
from apps.shared.services import ApprovalService
from apps.shared.services_shared.common import get_full_name
from apps.exams.models.schedule import (
    ExamScheduleCumulativeMapping,
    ExamScheduleQuestionmapping,
    ExamScheduleAdditionalInfo,
)

class ExamTypeSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=ExamType.objects.filter(is_active=True))])
    code = serializers.CharField(validators=[CustomUniqueValidator(queryset=ExamType.objects.filter(is_active=True))])

    class Meta:
        model = ExamType
        fields = '__all__'

class ResultConfigurationMergeNameViewSetSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=ExamType.objects.filter(is_active=True))])

    class Meta:
        model = ResultConfigurationMergeName
        fields = '__all__'

class ExamTermReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamType
        fields = ['name', 'id']

class ExamReadSerializer(serializers.ModelSerializer):
    standard_names = serializers.SerializerMethodField()
    academic_year_value = serializers.SerializerMethodField()
    exam_type_name = serializers.ReadOnlyField(source='exam_type.name')
    term_name = serializers.ReadOnlyField(source='term.name')
    approval_status = serializers.SerializerMethodField()

    def get_approval_status(self, obj):
        data = ApprovalService.get_approval_status(self, obj)
        return {'approval_status': data['approval_status'], 'approval_status_value': data['approval_status_value'],
                'reason': data['reason']}

    def get_standard_names(self, obj):
        sectionIds = obj.standard_section_ids.split(",")
        data = StandardSectionMapping.objects.filter(id__in=sectionIds).values('id', 'standard', 'section__name',
            'standard__name').order_by('standard__sequence')
        returnData = []
        tempData = {}
        for i in data:
            temp = {'section': i['id'], 'section_name': i['section__name'],
            'standard_name': i['standard__name'], 'standard': i['standard']}
            if i['standard'] in tempData:
                tempData[i['standard']]['section_list'].append(temp)
            else:
                tempData[i['standard']] = {'section_list': [],
                'standard_name': i['standard__name'], 'standard': i['standard'],
                'name': i['standard__name'], 'id': i['standard']
                }
                tempData[i['standard']]['section_list'].append(temp)
        for data in tempData:
            returnData.append(tempData[data])
        return returnData

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'

    class Meta:
        model = Exam
        exclude = ['created', 'modified']


class ExamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Exam
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_type', 'term', 'academic_year'),
                message=_('Exam Type is already assigned to the term')
            )
        ]
        exclude = ['created', 'modified']

class CummulativeSerializer(serializers.ModelSerializer):

    def to_representation(self, instance):
        return {'id': instance.id, 'name': instance.name, 'alias': instance.alias}

    class Meta:
        model = CumulativeType
        fields = '__all__'

class ExamScheduleCumulativeMappingReadSerializer(serializers.ModelSerializer):
    cumulative_type_data = CummulativeSerializer(many=True, source='cumulative_type')

    class Meta:
        model = ExamScheduleCumulativeMapping
        fields = '__all__'

class ExamScheduleReadSerilaizer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    subject_code = serializers.ReadOnlyField(source='subject.codename')
    subject_part_type = serializers.ReadOnlyField(source='subject.subject_part_type.name')
    subject_part_type_id = serializers.ReadOnlyField(source='subject.subject_part_type.id')
    is_language = serializers.ReadOnlyField(source='subject.is_language')
    sequence = serializers.ReadOnlyField(source='subject.sequence')
    is_standard_section = serializers.ReadOnlyField(source='exam.is_standard_section')
    standard_name = serializers.SerializerMethodField()
    standard_id = serializers.SerializerMethodField()
    standard_section_id = serializers.SerializerMethodField()
    standard_section_name = serializers.SerializerMethodField()
    academic_year = serializers.ReadOnlyField(source='exam.academic_year.id')
    cumulative_mapping = ExamScheduleCumulativeMappingReadSerializer(source='exam_schedule_cumulative_mapping_exam_schedule', many=True)
    total_max_marks = serializers.SerializerMethodField()
    total_min_marks = serializers.SerializerMethodField()
    grade_plan_name = serializers.ReadOnlyField(source='grade_plan.name')
    grade_type = serializers.ReadOnlyField(source='grade_plan.grade_type')
    exam_description=serializers.ReadOnlyField(source='exam.description')


    def get_standard_name(self, obj):
        return obj.standard_section.standard.name

    def get_standard_id(self, obj):
        return obj.standard_section.standard_id

    def get_standard_section_id(self, obj):
        return obj.standard_section_id

    def get_standard_section_name(self, obj):
        return obj.standard_section.section.name

    def get_total_max_marks(self, obj):
        total_marks = obj.max_marks if obj.max_marks else 0
        for row_data in obj.exam_schedule_cumulative_mapping_exam_schedule.values():
            row_data['max_marks'] = row_data['max_marks'] if row_data['max_marks'] else 0
            total_marks += row_data['max_marks']
        return total_marks

    def get_total_min_marks(self, obj):
        total_marks = obj.min_marks if obj.min_marks else 0
        for row_data in obj.exam_schedule_cumulative_mapping_exam_schedule.values():
            total_marks += row_data['min_marks'] if row_data['min_marks'] else 0
        return total_marks


    class Meta:
        model = ExamSchedule
        exclude = ['created', 'modified']


class ExamScheduleSerilaizer(serializers.ModelSerializer):

    class Meta:
        model = ExamSchedule
        exclude = ['created', 'modified']


class ExamScheduleAdditionalInfoSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamScheduleAdditionalInfo
        fields = '__all__'

class ExamScheduleMarkSerilaizer(serializers.ModelSerializer):
    subject_name = serializers.ReadOnlyField(source='subject.name')
    subject_code = serializers.ReadOnlyField(source='subject.subject_code')
    subject_part_type = serializers.ReadOnlyField(source='subject.subject_part_type.name')
    subject_part_type_code_name = serializers.ReadOnlyField(source='subject.subject_part_type.code_name')
    subject_part_type_id = serializers.ReadOnlyField(source='subject.subject_part_type.id')
    
    class Meta:
        model = ExamSchedule
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam', 'standard', 'subject'),
                message=_('Subject is already assigned to the standard')
            )
        ]
        fields = ['subject', 'subject_name', 'min_marks', 'max_marks', 'id',
        'subject_part_type', 'subject_part_type_id', 'subject_part_type_code_name', 'subject_code']

class StudentMarkReadSerializer(serializers.ModelSerializer):
    exam_schedule = ExamScheduleMarkSerilaizer(read_only=True)
    full_name = serializers.SerializerMethodField()
    first_name = serializers.ReadOnlyField(source='student.first_name')
    middle_name = serializers.ReadOnlyField(source='student.middle_name')
    sts = serializers.ReadOnlyField(source='student.sts')
    last_name = serializers.ReadOnlyField(source='student.last_name')
    current_reg_num = serializers.ReadOnlyField(source='student.current_reg_num')

    def get_full_name(self, obj):
        return get_full_name(obj.student.first_name, obj.student.middle_name, obj.student.last_name)

    class Meta:
        model = StudentMark
        exclude = ['created', 'modified']



class StudentMarkSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentMark
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_schedule', 'student', 'is_active'),
                message=_('Duplicate entry found for student')
            )
        ]
        fields = '__all__'

class ExamMarkUnapproveSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentMarkSectionWiseApproval
        fields = '__all__'

class StudentCumulativeMarkSerializer(serializers.ModelSerializer):

    def validate(self, data):
        exam_cumulative = data.get('exam_cumulative', getattr(self.instance, 'exam_cumulative', None))
        student = data.get('student', getattr(self.instance, 'student', None))
        is_active = data.get('is_active', getattr(self.instance, 'is_active', True))

        # Exclude the current instance if updating
        qs = StudentCumulativeMark.objects.filter(
            exam_cumulative=exam_cumulative,
            student=student,
            is_active=is_active
        )
        if self.instance:
            qs = qs.exclude(id=self.instance.id)

        if qs.exists():
            existing = qs.first()
            print(f"Duplicate Found: ID={existing.id}, Exam Cumulative={existing.exam_cumulative}, Student={existing.student}")
            raise serializers.ValidationError({
                "non_field_errors": _(
                    f"Duplicate entry already exists for student: {existing.id} "
                    f"Student={existing.student}, ExamCumulative={existing.exam_cumulative}"
                )
            })

        return data

    class Meta:
        model = StudentCumulativeMark
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('exam_cumulative', 'student', 'is_active'),
                message=_('Duplicate entry found for student, student cummulative marks')
            )
        ]
        fields = '__all__'


class GradeSerializer(serializers.ModelSerializer):

    class Meta:
        model = Grade
        fields = '__all__'

class GradePlanSerializer(serializers.ModelSerializer):
    grade_plan_data = GradeSerializer(many=True, read_only=True, source='grade_grade_plan')
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=GradePlan.objects.filter(is_active=True))])

    class Meta:
        model = GradePlan
        exclude = ['created', 'modified']


class HallTicketSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamSchedule
        exclude = ['created', 'modified']

class ResultConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = ResultConfiguration
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('term', 'academic_year'),
                message=_('Duplicate term for the given academic Year')
            )
        ]
        fields = '__all__'

class ResultSectionMappingSerilaizer(serializers.ModelSerializer):

    class Meta:
        model = ResultSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('result', 'standard_section', 'subject'),
                message=_('Duplicate standard found for the result')
            )
        ]
        fields = '__all__'

class ResultMarksConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = ResultMarksConfiguration
        fields = '__all__'

class ResultConfigurationMergeSerializer(serializers.ModelSerializer):

    class Meta:
        model = ResultConfigurationMerge
        validators = [
             serializers.UniqueTogetherValidator(
                 queryset=model.objects.filter(),
                 fields=('standard_section', 'result'),
                 message=_('Duplicate standard found for the result')
             )]

        fields = '__all__'

    # def is_valid(self, raise_exception=False):
    #     data = self.initial_data
    #     if not data['name']:
    #         raise ValidationError('Merge name is required!')
    #     return super(ResultConfigurationMergeSerializer).is_valid(self,raise_exception)

class ScheduleStudentSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentScheduleMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_schedule', 'student'),
                message=_('Student is already assigned to the schedule')
            )
        ]
        fields = '__all__'

class StudentMarkSectionWiseApprovalSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentMarkSectionWiseApproval
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam', 'standard_section'),
                message=_('Already approved to the section for the given exam')
            )
        ]
        fields = '__all__'

class ResultSectionMappingFilteredSerilaizer(serializers.ModelSerializer):
    subject_exam_data = ResultMarksConfigurationSerializer(source='result_marks_configuration_result_section', many=True, read_only=True)
    exam_name = ExamTypeSerializer(source='result_marks_configuration_exam_type',read_only=True)

    class Meta:
        list_serializer_class = CustomFilteredListSerializer
        model = ResultSectionMapping
        fields = '__all__'

class ResultConfigurationReadSerializer(serializers.ModelSerializer):
    result_section_data = ResultSectionMappingFilteredSerilaizer(source='result_section_result', many=True)

    class Meta:
        model = ResultConfiguration
        fields = '__all__'

class StudentExamFinalResultSerializer(serializers.ModelSerializer):

    def validate(self, data):
        proceed = True
        if self.instance:
            proceed = False
        elif 'exam' in data and data['exam'] and ('result_config' not in data or 'id' not in data['result_config'].__dict__):
            temp = {'exam': data['exam'], 'student': data['student']}
        elif 'result_config' in data  and data['result_config'] and 'id' not in data['result_config'].__dict__:
            temp = {'result_config': data['result_config'], 'student': data['student']}
        else:
            proceed = False #when we are updating only stauts no need to check
        if proceed and StudentExamFinalResult.objects.filter(**temp):
            raise ValidationError('Student already marked the status')
        return data

    class Meta:
        model = StudentExamFinalResult
        fields = '__all__'

class ExamScheduleCumulativeMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamScheduleCumulativeMapping
        fields = '__all__'

class GradeExamScheduleMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = GradeExamScheduleMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('standard_section', 'exam'),
                message=_('Grade Duplicate configuration')
            )
        ]
        fields = '__all__'

class ExamResultConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamResultConfiguration
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('standard_section', 'exam'),
                message=_('Duplicate configuration')
            )
        ]
        fields = '__all__'

class ExamResultSubjectConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamResultSubjectConfiguration
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields = ('subject', 'exam_result_configuration')
            )
        ]
        fields = '__all__'

class ExamResultCumulativeConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamResultCumulativeConfiguration
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields = ('schedule_cumulative', 'exam_result_subject_config')
            )
        ]
        fields = '__all__'

class ExamResultCumulativeConfigurationReadSerializer(serializers.ModelSerializer):
    cumulative_type_name = serializers.ReadOnlyField(source='schedule_cumulative.cumulative_type.name')
    
    class Meta:
        model = ExamResultCumulativeConfiguration
        fields = '__all__'

class ExamResultSubjectConfigurationReadSerializer(serializers.ModelSerializer):
    cumulative_data = ExamResultCumulativeConfigurationReadSerializer(many=True, source='exam_result_cumulative_config_exam_result_subject_config')
    subject_name = serializers.ReadOnlyField(source='subject.name')

    class Meta:
        model = ExamResultSubjectConfiguration
        fields = '__all__'

class ExamResultReadConfigurationSerializer(serializers.ModelSerializer):
    exam_result_subject_config = ExamResultSubjectConfigurationReadSerializer(many=True, source='exam_result_subject_configuration_exam_result_configuration')
    grade_plan_name = serializers.ReadOnlyField(source='grade_plan.name')
    
    class Meta:
        model = ExamResultConfiguration
        fields = '__all__'

class ResultReadConfigurationMergeSerializer(serializers.ModelSerializer):
    merge_name = serializers.ReadOnlyField(source='name.name')
    
    class Meta:
        model = ResultConfigurationMerge
        fields = '__all__'

class ExamResultMarksObtainedSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamResultMarksObtained
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_result_configuration', 'student'),
                message=_('Exam_result_configuration and student matching already exist')
            )
        ]
        fields = '__all__'

class ResultSectionApprovalSerializer(serializers.ModelSerializer):

    class Meta:
        model = ResultSectionApproval
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('standard_section', 'result_config'),
                message=_('Result already configured')
            )
        ]
        fields = '__all__'

class ExamFinalResultConfigurationSerializer(serializers.ModelSerializer):
    grade_plan_name = serializers.ReadOnlyField(source='grade_plan.name')

    class Meta:
        model = ExamFinalResultConfiguration
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('academic_year', 'standard_section'),
                message=_('Result already configured')
            )
        ]
        fields = '__all__'

class FinalResultConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = FinalResultConfiguration
        fields = '__all__'

class FinalResultSectionMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FinalResultSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('final_result', 'standard_section', 'subject'),
                message=_('Duplicate standard found for the result')
            )
        ]
        fields = '__all__'

class FinalResultConfigurationMergeNameViewSetSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=ExamType.objects.filter(is_active=True))])

    class Meta:
        model = FinalResultConfigurationMergeName
        fields = '__all__'

class FinalResultMarksConfigurationSerializer(serializers.ModelSerializer):
    exam_name = serializers.ReadOnlyField(source='exam.exam_type.name')
    exam_description=serializers.ReadOnlyField(source='exam.description')

    class Meta:
        model = FinalResultMarksConfiguration
        fields = '__all__'

class FinalResultConfigurationMergeSerializer(serializers.ModelSerializer):

    class Meta:
        model = FinalResultConfigurationMerge
        validators = [
             serializers.UniqueTogetherValidator(
                 queryset=model.objects.filter(),
                 fields=('standard_section', 'final_result_config'),
                 message=_('Duplicate standard found for the result')
             )]

        fields = '__all__'

class FinalResultReadConfigurationMergeSerializer(serializers.ModelSerializer):
    merge_name = serializers.ReadOnlyField(source='name.name')
    
    class Meta:
        model = FinalResultConfigurationMerge
        fields = '__all__'

class FinalStudentExamFinalResultSerializer(serializers.ModelSerializer):

    def validate(self, data):
        proceed = True
        if self.instance:
            proceed = False
        elif 'exam' in data and data['exam'] and ('result_config' not in data or 'id' not in data['result_config'].__dict__):
            temp = {'exam': data['exam'], 'student': data['student']}
        elif 'result_config' in data  and data['result_config'] and 'id' not in data['result_config'].__dict__:
            temp = {'result_config': data['result_config'], 'student': data['student']}
        else:
            proceed = False #when we are updating only stauts no need to check
        if proceed and StudentExamFinalResult.objects.filter(**temp):
            raise ValidationError('Student already marked the status')
        return data

    class Meta:
        model = StudentExamFinalResult
        fields = '__all__'

class FinalResultSectionApprovalSerializer(serializers.ModelSerializer):

    class Meta:
        model = FinalResultSectionApproval
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('standard_section', 'final_result_config'),
                message=_('Result already configured')
            )
        ]
        fields = '__all__'

class FinalResultSectionMappingFilteredSerilaizer(serializers.ModelSerializer):
    subject_exam_data = FinalResultMarksConfigurationSerializer(source='final_result_marks_configuration_result_section', many=True, read_only=True)
    exam_name = ExamTypeSerializer(source='final_result_marks_configuration_exam_type',read_only=True)
    exam=ExamSerializer(source='final_result_marks_configuration_exam',read_only=True)

    class Meta:
        list_serializer_class = CustomFilteredListSerializer
        model = FinalResultSectionMapping
        fields = '__all__'

class FinalResultConfigurationReadSerializer(serializers.ModelSerializer):
    result_section_data = FinalResultSectionMappingFilteredSerilaizer(source='final_result_section_result', many=True)
    exam_name = serializers.ReadOnlyField(source='exam.exam_type.name')

    class Meta:
        model = FinalResultConfiguration
        fields = '__all__'
    
class StudentExamFinalResultForFinalConfigSerializer(serializers.ModelSerializer):

    def validate(self, data):
        proceed = True
        if self.instance:
            proceed = False
        elif 'exam' in data and data['exam'] and ('final_result_config' not in data or 'id' not in data['final_result_config'].__dict__):
            temp = {'exam': data['exam'], 'student': data['student']}
        elif 'final_result_config' in data  and data['final_result_config'] and 'id' not in data['final_result_config'].__dict__:
            temp = {'final_result_config': data['final_result_config'], 'student': data['student']}
        else:
            proceed = False #when we are updating only stauts no need to check
        if proceed and StudentExamFinalResultForFinalConfig.objects.filter(**temp):
            raise ValidationError('Student already marked the status')
        return data

    class Meta:
        model = StudentExamFinalResultForFinalConfig
        fields = '__all__'

class ExamScheduleQuestionmappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = ExamScheduleQuestionmapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_schedule', 'question_number','sub_question_number'),
                message=_('Result already configured')
            )
        ]
        fields = '__all__'

class StudentMarkQuestionWiseSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentMarkQuestionWise
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('exam_schedule_question_mapping', 'student', 'is_active'),
                message=_('Duplicate entry found for student')
            )
        ]
        fields = '__all__'