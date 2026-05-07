from typing import Sequence
from django.db import models
from django.db.models.base import Model
from apps.users.models import User
from apps.shared.models.document import Document
from apps.students.models.student import Student
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import StandardSectionMapping,Branch
from apps.classes.models.subject import Subject
from apps.staffs.models.staff import Staff
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

from django.db.models import JSONField




class FeedBackForm(models.Model):
    form_code = models.CharField(max_length=1000)
    title = models.CharField(max_length=1000, blank=True)
    description = models.CharField(max_length=10000, blank = True)
    creater = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "feedbackform_creater")
    background_color = models.CharField(max_length=1000, default = "#d9efed")
    text_color = models.CharField(max_length=1000, default="#272124")
    confirmation_message = models.CharField(max_length=1000, default = "Your response has been recorded.")
    start_date =  models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='feedbackform_academic_year', blank=True, null=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbackform_user', blank=True, null=True)
    is_finalized = models.BooleanField(default=False)
    is_for_staff = models.BooleanField(default=False) #0=student,1=staff
    form_type = models.CharField(max_length=100, blank=True) #Feedbackform,Surveyform
    total_time = models.CharField(max_length=10, blank=True)
    document = models.ForeignKey(Document, related_name='feedbackform_document', blank=True, null=True, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FeedBackFormStandardSectionMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.CASCADE, related_name='feedbackform_standard_section_mapping_standard_section',
        blank=True, null=True)
    form = models.ForeignKey(FeedBackForm, on_delete=models.CASCADE, related_name='feedbackform_standard_section_mapping_form',
        blank=True, null=True)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FeedBackFormBranchMapping(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='feedbackform_branch_mapping_branch',
        blank=True, null=True)
    form = models.ForeignKey(FeedBackForm, on_delete=models.CASCADE, related_name='feedbackform_branch_mapping_form',
        blank=True, null=True)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FeedBackFormStandardSectionOtherMapping(models.Model):
    formstandardsectionmapping = models.ForeignKey(FeedBackFormStandardSectionMapping, null=True, blank=True, on_delete=models.SET_NULL, related_name='feedbackform_standard_section_other_mapping')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

class FeedBackFormAlternateTeacherMapping(models.Model):
    staff =  models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='feedbackform_alternate_teacher_mapping_staff',
        blank=True, null=True)
    form = models.ForeignKey(FeedBackForm, on_delete=models.CASCADE, related_name='feedbackform_alternate_teacher_mapping_form',
        blank=True, null=True)
    view = models.BooleanField(default=False)
    update = models.BooleanField(default=False)
    evaluate = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class UserFeedBackFormMapping(models.Model):
    user =  models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_feedbackform_mapping_user',
        blank=True, null=True)
    form = models.ForeignKey(FeedBackForm, on_delete=models.CASCADE, related_name='user_feedbackform_mapping_form',
        blank=True, null=True)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)


class FeedBackFormQuestion(models.Model):
    question_type = (
        (1, 'multiplechoice'),
        (3, 'oneword'),
    )
    question = models.CharField(max_length=2500)
    description = models.CharField(max_length=2500, blank=True)
    question_type = models.CharField(max_length=25, choices=question_type, null=True, blank=True)
    required = models.BooleanField(default= False)
    feedback = models.CharField(max_length=5000, null = True)
    documents = models.ManyToManyField(Document, related_name='feedbackform_question_document', blank=True)
    form = models.ForeignKey(FeedBackForm, on_delete=models.CASCADE, related_name='feedbackform_question_form', null=True, blank=True)
    sequence = models.IntegerField()
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FeedBackFormChoice(models.Model):
    data = models.CharField(max_length=1000, null=True, blank=True)
    document = models.ForeignKey(Document, on_delete = models.CASCADE, related_name = "feedbackform_choice_document", null=True, blank=True)
    question = models.ForeignKey(FeedBackFormQuestion, null=True, blank=True, on_delete=models.CASCADE,related_name='feedbackform_choice_question')
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FeedBackFormResponse(models.Model):
    form = models.ForeignKey(FeedBackForm, on_delete = models.CASCADE, related_name = "feedbackform_response_form", null=True)
    responder_ip = models.CharField(max_length=255, null=True, blank=True)
    responder_user = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "feedbackform_response_responderuser", blank = True, null = True)
    is_submitted = models.BooleanField(default=False)
    submitted_time = models.DateTimeField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    respondingto_user = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "feedbackform_response_respondingtouser", blank = True, null = True)
    subject = models.ForeignKey(Subject,on_delete = models.CASCADE, related_name = "feedbackform_response_subject", blank = True, null = True)

class FeedBackFormUserResponseTracking(models.Model):
    form = models.ForeignKey(FeedBackForm, on_delete = models.CASCADE, related_name = "feedbackform_user_response_tracking_form", null=True)
    user = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "feedbackform_user_response_tracking_user",null=True)
    question = models.ForeignKey(FeedBackFormQuestion, on_delete=models.CASCADE, related_name='feedbackform_user_response_tracking_question')
    start_time = models.DateTimeField(auto_now_add = True)
    end_time = models.DateTimeField(null=True, blank=True)

class FeedBackFormChoiceAnswer(models.Model):
    question = models.ForeignKey(FeedBackFormQuestion, on_delete=models.CASCADE, related_name='feedbackform_choice_answer_question')
    document = models.ForeignKey(Document, blank=True, null=True, on_delete = models.CASCADE, related_name = "feedbackform_choice_answer_document")
    response = models.ForeignKey(FeedBackFormResponse, on_delete = models.CASCADE, related_name = "feedbackform_choice_answer_response")
    choices = models.ManyToManyField(FeedBackFormChoice, blank=True, related_name = "feedbackform_choice_answer_choice")
    partial_answer = models.BooleanField(default=False)
    evaluated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='feedbackform_choice_answer_evaluted_by', null=True)
    extra_data = JSONField(blank=True, null=True) # match the following
    points = models.FloatField(default=0.0)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)
