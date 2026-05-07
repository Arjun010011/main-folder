from django.db import models
from django.db.models import Sum, F, Window
from django.db.models.functions import Rank
from django.db import transaction
from django.db.models import F, Sum, Window
from django.db.models.functions import Rank

from apps.exams.models import Exam, ExamTerm
from apps.exams.models.exam import GradePlan
from apps.institutes.models import AcademicYear
from apps.classes.models import Subject, StandardSectionMapping
from apps.students.models import Student
from apps.users.models import User

"""
    Three setting based on that tables will be selected
    1. Exam Wise Result Configuration - 
    2. Final Result Manual Configuration - 
"""

class ResultConfiguration(models.Model):
    term = models.ForeignKey(ExamTerm, null=True, on_delete=models.SET_NULL, related_name='result_configuration_term')
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True,
                                      on_delete=models.SET_NULL, related_name='result_configuration_academic_year')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ResultSectionMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='result_section_standard_section')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='result_section_subject')
    result = models.ForeignKey(ResultConfiguration, on_delete=models.SET_NULL, null=True, related_name='result_section_result')
    min_marks = models.FloatField(null=True)
    max_marks = models.FloatField(null=True)
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, null=True,
                                         related_name='result_section_mapping_grade_plan') # for separate grade plan for perticular subject
    final_result_configured_marks = models.FloatField(null=True)
    final_result_configured_min_marks = models.FloatField(null=True)
    final_result_disabled = models.BooleanField(default=False)
    final_result_min_for_subject = models.FloatField(null=True) #for some bad reason saving the min marks the subject both the places
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ResultConfigurationMergeName(models.Model):  #Name for merging exams in resultconfiguration
    name = models.CharField(max_length=255,null=True,blank=True)
    is_active = models.BooleanField(default=True)

class ResultMarksConfiguration(models.Model):
    result_section = models.ForeignKey(ResultSectionMapping, on_delete=models.SET_NULL, null=True,
                                       related_name='result_marks_configuration_result_section')
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, related_name='result_marks_configuration_exam')
    marks = models.FloatField(null=True)
    cum_marks = models.FloatField(null=True)
    is_disabled = models.IntegerField(default=0)
    is_cum_disabled = models.BooleanField(null=True)
    is_only_grade_for_config = models.BooleanField(null=True) #To select whether to take only grade or marks from exam

class ResultConfigurationMerge(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='result_configuration_merge_standard_section')
    exam = models.ManyToManyField(Exam, blank=True, related_name='result_configuration_merge_exam')
    result = models.ForeignKey(ResultConfiguration, on_delete=models.SET_NULL, null=True, related_name='result_configuration_merge_result')
    name = models.ForeignKey(ResultConfigurationMergeName, on_delete=models.SET_NULL, null=True, related_name='result_configuration_merge_name')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentExamFinalResult(models.Model):
    statuslist = (
        ('pass', 'pass'),
        ('fail', 'fail'),
    )
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_exam_exam')
    result_config = models.ForeignKey(ResultConfiguration, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='student_exam_result')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='student_exam_student')
    changed_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='student_exam_changed_user_id')
    status = models.CharField(max_length=10, choices=statuslist)
    is_announced = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    totalgrade=models.CharField(max_length=10,null=True,blank=True)
    standard_rank = models.IntegerField(null=True, blank=True)
    section_rank = models.IntegerField(null=True, blank=True)

class ResultSectionApproval(models.Model):
    approval_status = models.BooleanField(default=False)
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, null=True,
                                         related_name='result_section_approval_grade_plan')
    total_grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL,null=True,related_name='result_section_approval_total_grade_plan') # Grade plan for total marks
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='result_section_approval_standard_section')
    result_config = models.ForeignKey(ResultConfiguration, on_delete=models.SET_NULL, null=True,
                                         related_name='result_section_approval_result_config')
    is_announced = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
    Applicable for the given academic year the marks configuration stored in ResultSectionMapping
"""
class ExamFinalResultConfiguration(models.Model):
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True,
                                      on_delete=models.SET_NULL, related_name='exam_final_result_configuration_academic_year')
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, null=True,
                                         related_name='exam_final_result_configuration_grade_plan')
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='exam_final_result_configuration_standard_section')
    total_max_marks = models.FloatField(null=True)
    total_min_marks = models.FloatField(null=True)
    result_config_term = models.ManyToManyField(ResultConfiguration, blank=True, related_name='exam_final_result_configuration_result_config_term')
    is_finalized = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
Nikhil things to check
if final result is finalized should not allow to add new term configuration
if term result is finalized then only we should be able to configure for the final result
total max marks should match the number of terms data
"""