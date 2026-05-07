from typing import Sequence
from django.db import models
from django.db.models.base import Model
from apps.users.models import User
from apps.shared.models.document import Document
from apps.students.models.student import Student
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.models.subject import Subject
from apps.staffs.models.staff import Staff

from django.db.models import JSONField


class Form(models.Model):
    form_code = models.CharField(max_length=1000)
    title = models.CharField(max_length=1000, blank=True)
    description = models.CharField(max_length=10000, blank = True)
    creater = models.ForeignKey(User, on_delete = models.CASCADE, related_name = "form_creater")
    background_color = models.CharField(max_length=1000, default = "#d9efed")
    text_color = models.CharField(max_length=1000, default="#272124")
    confirmation_message = models.CharField(max_length=1000, default = "Your response has been recorded.")
    start_date =  models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='form_academic_year', blank=True, null=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='form_subject', blank=True, null=True)
    is_finalized = models.BooleanField(default=False)
    total_time = models.CharField(max_length=10, blank=True)
    is_automatic_evaluation = models.BooleanField(default=False)
    is_video_quiz = models.BooleanField(default=False)
    document = models.ForeignKey(Document, related_name='form_document', blank=True, null=True, on_delete=models.CASCADE)
    is_questions_at_end = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class FormStandardSectionMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.CASCADE, related_name='form_standard_section_mapping_standard_section',
        blank=True, null=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='form_standard_section_mapping_form',
        blank=True, null=True)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class AlternateTeacherMapping(models.Model):
    staff =  models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='alternate_teacher_mapping_staff',
        blank=True, null=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='alternate_teacher_mapping_form',
        blank=True, null=True)
    view = models.BooleanField(default=False)
    update = models.BooleanField(default=False)
    evaluate = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class StudentFormMapping(models.Model):
    student =  models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_form_mapping_student',
        blank=True, null=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='student_form_mapping_form',
        blank=True, null=True)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)


class Question(models.Model):
    question_type = (
        (1, 'multiplechoice'),
        (2, 'checkbox'),
        (3, 'oneword'),
        (4, 'matchfollowing')
    )
    question = models.CharField(max_length=2500)
    description = models.CharField(max_length=2500, blank=True)
    question_type = models.CharField(max_length=25, choices=question_type, null=True, blank=True)
    required = models.BooleanField(default= False)
    score = models.IntegerField(blank = True, default=0)
    feedback = models.CharField(max_length=5000, null = True)
    documents = models.ManyToManyField(Document, related_name='question_document', blank=True)
    form = models.ForeignKey(Form, on_delete=models.CASCADE, related_name='question_form', null=True, blank=True)
    time_limit_to_answer = models.CharField(max_length=10, default=0) #for vt
    question_start_time = models.CharField(max_length=10, blank=True)  #for vt
    show_answer_after_submit = models.BooleanField(default=False)
    sequence = models.IntegerField()
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class Choice(models.Model):
    data = models.CharField(max_length=1000, null=True, blank=True)
    document = models.ForeignKey(Document, on_delete = models.CASCADE, related_name = "choice_document", null=True, blank=True)
    is_answer = models.BooleanField(default=False)
    question = models.ForeignKey(Question, null=True, blank=True, on_delete=models.CASCADE,related_name='choice_question')
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)

class MatchTheFollowing(models.Model):
    choice = models.OneToOneField(Choice, null=True, blank=True, on_delete=models.CASCADE,related_name='match_the_following_choice',unique=True)
    correct_match = models.ForeignKey(Choice, null=True, blank=True, related_name='match_the_following_correct_match', on_delete=models.SET_NULL)
    shuffled_match = models.ForeignKey(Choice, null=True, related_name='match_the_following_shuffled_match', on_delete=models.SET_NULL)

class Response(models.Model):
    form = models.ForeignKey(Form, on_delete = models.CASCADE, related_name = "response_form", null=True)
    responder_ip = models.CharField(max_length=255, null=True, blank=True)
    student = models.ForeignKey(Student, on_delete = models.CASCADE, related_name = "response_student", blank = True, null = True)
    is_submitted = models.BooleanField(default=False)
    is_evaluated = models.BooleanField(default=False)
    evaluated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='response_evaluted_by', null=True)
    submitted_time = models.DateTimeField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentResponseTracking(models.Model):
    form = models.ForeignKey(Form, on_delete = models.CASCADE, related_name = "student_response_tracking_form", null=True)
    student = models.ForeignKey(Student, on_delete = models.CASCADE, related_name = "student_response_tracking_student")
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='student_response_tracking_question')
    start_time = models.DateTimeField(auto_now_add = True)
    end_time = models.DateTimeField(null=True, blank=True)


class ChoiceAnswer(models.Model):
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='choice_answer_question')
    document = models.ForeignKey(Document, blank=True, null=True, on_delete = models.CASCADE, related_name = "choice_answer_document")
    response = models.ForeignKey(Response, on_delete = models.CASCADE, related_name = "choice_answer_response")
    choices = models.ManyToManyField(Choice, blank=True, related_name = "choice_answer_choice")
    partial_answer = models.BooleanField(default=False)
    evaluated_by = models.ForeignKey(User, on_delete=models.CASCADE, related_name='choice_answer_evaluted_by', null=True)
    extra_data = JSONField(blank=True, null=True) # match the following
    points = models.FloatField(default=0.0)
    created = models.DateTimeField(auto_now_add = True)
    modified = models.DateTimeField(auto_now = True)
