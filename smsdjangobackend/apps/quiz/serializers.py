from rest_framework import serializers

from apps.quiz.models.forms import (
        AlternateTeacherMapping, Choice, ChoiceAnswer, Form, FormStandardSectionMapping,
        Question, MatchTheFollowing, Response, StudentFormMapping, StudentResponseTracking,
)
from apps.shared.serializers import DocumentSerializer, CustomFilteredListSerializer


class MatchTheFollowingSerializer(serializers.ModelSerializer):

    class Meta:
        model = MatchTheFollowing
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('correct_match', 'shuffled_match'),
                message=('Duplicate Data Found for match the following')
            )
        ]
        fields = '__all__'

class ChoiceReadSerializer(serializers.ModelSerializer):
    correct_match = serializers.ReadOnlyField(source='match_the_following_choice.correct_match_id')
    shuffled_match = serializers.ReadOnlyField(source='match_the_following_choice.shuffled_match_id')
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = Choice
        fields = '__all__'

class QuestionReadSerializer(serializers.ModelSerializer):
    choice_question = ChoiceReadSerializer(many=True, read_only=True)
    documents = DocumentSerializer(read_only=True, many=True)

    class Meta:
        model = Question
        fields = '__all__'

class QuestionSerializer(serializers.ModelSerializer):

    class Meta:
        model = Question
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('question', 'question_type', 'form'),
                message=('Duplicate Quesiton Found')
            )
        ]
        fields = '__all__'

class ChoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = Choice
        fields = '__all__'


class FormStandardSectionMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FormStandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('form', 'standard_section'),
                message=('Duplicate standard section Found')
            )
        ]
        fields = '__all__'

class ResponseSerializer(serializers.ModelSerializer):

    class Meta:
        model = Response
        fields = '__all__'

class ChoiceAnswerSeriaizer(serializers.ModelSerializer):
    question_sequence = serializers.ReadOnlyField(source='question.sequence', read_only=True)
    documents = DocumentSerializer(many=True, read_only=True, source='document')

    class Meta:
        model = ChoiceAnswer
        fields = '__all__'

class AlternateTeacherMappingSerializer(serializers.ModelSerializer):
    staff_first_name = serializers.ReadOnlyField(source='staff.first_name')
    staff_middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    staff_last_name = serializers.ReadOnlyField(source='staff.last_name')

    class Meta:
        model = AlternateTeacherMapping
        fields = '__all__'

class StudentFormMappingSerializer(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')

    class Meta:
        model = StudentFormMapping
        fields = '__all__'

class FormSerializer(serializers.ModelSerializer):

    class Meta:
        model = Form
        fields = '__all__'

class FormStandardSectionMappingReadSerializer(serializers.ModelSerializer):
    standard_section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    standard = serializers.ReadOnlyField(source='standard_section.standard.id')

    class Meta:
        model = FormStandardSectionMapping
        fields = ['standard_section_name', 'standard_section', 'standard_name', 'standard']

class FormReadSerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = AlternateTeacherMappingSerializer(many=True, read_only=True)
    student_form_mapping_form = StudentFormMappingSerializer(many=True, read_only=True)
    question_form = QuestionReadSerializer(many=True, read_only=True)
    form_standard_section_mapping_form = FormStandardSectionMappingReadSerializer(many=True, read_only=True)
    academic_year_value = serializers.SerializerMethodField()
    document = DocumentSerializer(read_only=True)

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'

    class Meta:
        model = Form
        fields = "__all__"

""" Dont use this serializer if using for any list views because FormReadSerializer will read same form multiple times in the list"""
class ResponseReadSerializer(serializers.ModelSerializer):
    choice_answer_response = ChoiceAnswerSeriaizer(many=True, read_only=True)
    form = FormReadSerializer(read_only=True)

    class Meta:
        model = Response
        fields = '__all__'

class ResponseListReadSerializer(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    choice_answer_response = ChoiceAnswerSeriaizer(many=True, read_only=True)

    class Meta:
        model = Response
        fields = '__all__'

class StudentResponseTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = StudentResponseTracking
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('question', 'student', 'form'),
                message=('Duplicate Question')
            )
        ]
        fields = '__all__'

class ResponseReadForEvaluteSerializer(serializers.ModelSerializer):
    choice_answer_response = ChoiceAnswerSeriaizer(many=True, read_only=True)
    form = FormReadSerializer(read_only=True)

    class Meta:
        model = Response
        fields = '__all__'

class FormReadWithResponseSerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = AlternateTeacherMappingSerializer(many=True, read_only=True)
    student_form_mapping_form = StudentFormMappingSerializer(many=True, read_only=True)
    question_form = QuestionReadSerializer(many=True, read_only=True)
    form_standard_section_mapping_form = FormStandardSectionMappingReadSerializer(many=True, read_only=True)
    response_form = ResponseListReadSerializer(many=True, read_only=True)

    class Meta:
        model = Form
        fields = "__all__"

class ResponseListReadSerializerForSummary(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    choice_answer_response = ChoiceAnswerSeriaizer(many=True, read_only=True)
    form_end_date = serializers.ReadOnlyField(source='form.end_date')

    class Meta:
        list_serializer_class = CustomFilteredListSerializer
        model = Response
        fields = '__all__'

class FormReadWithResponseForSummarySerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = AlternateTeacherMappingSerializer(many=True, read_only=True)
    student_form_mapping_form = StudentFormMappingSerializer(many=True, read_only=True)
    question_form = QuestionReadSerializer(many=True, read_only=True)
    form_standard_section_mapping_form = FormStandardSectionMappingReadSerializer(many=True, read_only=True)
    response_form = ResponseListReadSerializerForSummary(many=True, read_only=True)

    class Meta:
        model = Form
        fields = '__all__'
