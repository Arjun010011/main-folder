from rest_framework import serializers

from apps.feedbackform.models.feedbackform import (
        FeedBackFormAlternateTeacherMapping, FeedBackFormChoice, FeedBackFormChoiceAnswer, FeedBackForm, FeedBackFormStandardSectionMapping,
        FeedBackFormQuestion, FeedBackFormResponse, UserFeedBackFormMapping, FeedBackFormUserResponseTracking,FeedBackFormBranchMapping
)
from apps.shared.serializers import DocumentSerializer, CustomFilteredListSerializer


# class MatchTheFollowingSerializer(serializers.ModelSerializer):

#     class Meta:
#         model = MatchTheFollowing
#         validators = [
#             serializers.UniqueTogetherValidator(
#                 queryset=model.objects.filter(),
#                 fields=('correct_match', 'shuffled_match'),
#                 message=('Duplicate Data Found for match the following')
#             )
#         ]
#         fields = '__all__'

class FeedBackFormChoiceReadSerializer(serializers.ModelSerializer):
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = FeedBackFormChoice
        fields = '__all__'

class FeedBackFormQuestionReadSerializer(serializers.ModelSerializer):
    choice_question = FeedBackFormChoiceReadSerializer(many=True, read_only=True,source='feedbackform_choice_question')
    documents = DocumentSerializer(read_only=True, many=True)

    class Meta:
        model = FeedBackFormQuestion
        fields = '__all__'

class FeedBackFormQuestionSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackFormQuestion
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('question', 'question_type', 'form'),
                message=('Duplicate Quesiton Found')
            )
        ]
        fields = '__all__'

class FeedBackFormChoiceSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackFormChoice
        fields = '__all__'

class FeedBackFormBranchMappingSerializer(serializers.ModelSerializer):
    name = serializers.ReadOnlyField(source='branch.name')

    class Meta:
        model = FeedBackFormBranchMapping
        fields = '__all__'


class FeedBackFormStandardSectionMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackFormStandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('form', 'standard_section'),
                message=('Duplicate standard section Found')
            )
        ]
        fields = '__all__'

class FeedBackFormResponseSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackFormResponse
        fields = '__all__'

class FeedBackFormChoiceAnswerSeriaizer(serializers.ModelSerializer):
    question_sequence = serializers.ReadOnlyField(source='question.sequence', read_only=True)
    documents = DocumentSerializer(many=True, read_only=True, source='document')

    class Meta:
        model = FeedBackFormChoiceAnswer
        fields = '__all__'

class FeedBackFormAlternateTeacherMappingSerializer(serializers.ModelSerializer):
    staff_first_name = serializers.ReadOnlyField(source='staff.first_name')
    staff_middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    staff_last_name = serializers.ReadOnlyField(source='staff.last_name')

    class Meta:
        model = FeedBackFormAlternateTeacherMapping
        fields = '__all__'

class UserFeedBackFormMappingSerializer(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='user.student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='user.student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='user.student.last_name')
    student_id = serializers.ReadOnlyField(source='user.student.id')
    staff_id = serializers.ReadOnlyField(source='user.staff.id')

    class Meta:
        model = UserFeedBackFormMapping
        fields = '__all__'

class FeedBackFormSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackForm
        fields = '__all__'

class FeedBackFormStandardSectionMappingReadSerializer(serializers.ModelSerializer):
    standard_section_name = serializers.ReadOnlyField(source='standard_section.section.name')
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    standard = serializers.ReadOnlyField(source='standard_section.standard.id')

    class Meta:
        model = FeedBackFormStandardSectionMapping
        fields = ['standard_section_name', 'standard_section', 'standard_name', 'standard']

class FeedBackFormReadSerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = FeedBackFormAlternateTeacherMappingSerializer(many=True, read_only=True,source='feedbackform_alternate_teacher_mapping_form')
    user_form_mapping_form = UserFeedBackFormMappingSerializer(many=True, read_only=True, source='feedbackform_alternate_teacher_mapping_form')
    question_form = FeedBackFormQuestionReadSerializer(many=True, read_only=True,source = 'feedbackform_question_form')
    standard_section_ids = FeedBackFormStandardSectionMappingReadSerializer(many=True, read_only=True, source = 'feedbackform_standard_section_mapping_form')
    branch_ids = FeedBackFormBranchMappingSerializer(many=True, read_only=True, source = 'feedbackform_branch_mapping_form')
    academic_year_value = serializers.SerializerMethodField()
    document = DocumentSerializer(read_only=True)

    def get_academic_year_value(self, obj):
        return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'

    class Meta:
        model = FeedBackForm
        fields = "__all__"

""" Dont use this serializer if using for any list views because FormReadSerializer will read same form multiple times in the list"""
class FeedBackFormResponseReadSerializer(serializers.ModelSerializer):
    choice_answer_response = FeedBackFormChoiceAnswerSeriaizer(many=True, read_only=True, source="feedbackform_choice_answer_response")
    form = FeedBackFormReadSerializer(read_only=True)

    class Meta:
        model = FeedBackFormResponse
        fields = '__all__'

class FeedBackFormResponseListReadSerializer(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='responder_user.student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='responder_user.student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='responder_user.student.last_name')
    choice_answer_response = FeedBackFormChoiceAnswerSeriaizer(many=True, read_only=True,source="feedbackform_choice_answer_response")
    student_id = serializers.ReadOnlyField(source='responder_user.student.id')
    staff_id = serializers.ReadOnlyField(source='responder_user.staff.id')

    class Meta:
        model = FeedBackFormResponse
        fields = '__all__'

class FeedBackFormUserResponseTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = FeedBackFormUserResponseTracking
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(),
                fields=('question', 'user', 'form'),
                message=('Duplicate Question')
            )
        ]
        fields = '__all__'

class FeedBackFormResponseReadForEvaluteSerializer(serializers.ModelSerializer):
    choice_answer_response = FeedBackFormChoiceAnswerSeriaizer(many=True, read_only=True,source="feedbackform_choice_answer_response")
    form = FeedBackFormReadSerializer(read_only=True)

    class Meta:
        model = FeedBackFormResponse
        fields = '__all__'

class FeedBackFormReadWithResponseSerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = FeedBackFormAlternateTeacherMappingSerializer(many=True, read_only=True,source='feedbackform_alternate_teacher_mapping_form')
    user_form_mapping_form = UserFeedBackFormMappingSerializer(many=True, read_only=True,source='feedbackform_alternate_teacher_mapping_form')
    question_form = FeedBackFormQuestionReadSerializer(many=True, read_only=True,source = 'feedbackform_question_form')
    form_standard_section_mapping_form = FeedBackFormStandardSectionMappingReadSerializer(many=True, read_only=True, source = 'feedbackform_standard_section_mapping_form')
    response_form = FeedBackFormResponseListReadSerializer(many=True, read_only=True,source="feedbackform_response_form")

    class Meta:
        model = FeedBackForm
        fields = "__all__"

class FeedBackFormResponseListReadSerializerForSummary(serializers.ModelSerializer):
    student_first_name = serializers.ReadOnlyField(source='student.first_name')
    student_middle_name = serializers.ReadOnlyField(source='student.middle_name')
    student_last_name = serializers.ReadOnlyField(source='student.last_name')
    choice_answer_response = FeedBackFormChoiceAnswerSeriaizer(many=True, read_only=True,source="feedbackform_choice_answer_response")
    form_end_date = serializers.ReadOnlyField(source='form.end_date')

    class Meta:
        list_serializer_class = CustomFilteredListSerializer
        model = FeedBackFormResponse
        fields = '__all__'

class FeedBackFormReadWithResponseForSummarySerializer(serializers.ModelSerializer):
    alternate_teacher_mapping_form = FeedBackFormAlternateTeacherMappingSerializer(many=True, read_only=True,source='feedbackform_alternate_teacher_mapping_form')
    user_form_mapping_form = UserFeedBackFormMappingSerializer(many=True, read_only=True, source='feedbackform_alternate_teacher_mapping_form')
    question_form = FeedBackFormQuestionReadSerializer(many=True, read_only=True,source = 'feedbackform_question_form')
    form_standard_section_mapping_form = FeedBackFormStandardSectionMappingReadSerializer(many=True, read_only=True, source = 'feedbackform_standard_section_mapping_form')
    response_form = FeedBackFormResponseListReadSerializerForSummary(many=True, read_only=True,source="feedbackform_response_form")

    class Meta:
        model = FeedBackForm    
        fields = '__all__'
