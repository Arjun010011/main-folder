from django.db import models

from apps.exams.models import Exam, ExamTerm
from apps.exams.models.exam import GradePlan
from apps.exams.models.result import ResultConfigurationMergeName
from apps.institutes.models import AcademicYear
from apps.classes.models import Subject, StandardSectionMapping
from apps.students.models import Student
from apps.users.models import User

"""
    Three setting based on that tables will be selected
    1. Exam Wise Result Configuration - 
    2. Final Result Manual Configuration - 
"""

class FinalResultConfiguration(models.Model):
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True,
                                      on_delete=models.SET_NULL, related_name='final_result_configuration_academic_year')
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, related_name='final_result_configuration_exam')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FinalResultSectionMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_section_standard_section')
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='final_result_section_subject')
    final_result = models.ForeignKey(FinalResultConfiguration, on_delete=models.SET_NULL, null=True, related_name='final_result_section_result')
    min_marks = models.FloatField(null=True)
    max_marks = models.FloatField(null=True)
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_section_mapping_grade_plan') # for separate grade plan for perticular subject
    final_result_configured_marks = models.FloatField(null=True)
    final_result_configured_min_marks = models.FloatField(null=True)
    final_result_disabled = models.BooleanField(default=False)
    final_result_min_for_subject = models.FloatField(null=True) #for some bad reason saving the min marks the subject both the places
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FinalResultConfigurationMergeName(models.Model):  #Name for merging exams in resultconfiguration
    name = models.CharField(max_length=255,null=True,blank=True)
    is_active = models.BooleanField(default=True)

class FinalResultMarksConfiguration(models.Model):
    result_section = models.ForeignKey(FinalResultSectionMapping, on_delete=models.SET_NULL, null=True,
                                       related_name='final_result_marks_configuration_result_section')
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, related_name='final_result_marks_configuration_exam')
    marks = models.FloatField(null=True)
    cum_marks = models.FloatField(null=True)
    is_disabled = models.IntegerField(default=0)
    is_cum_disabled = models.BooleanField(null=True)
    is_only_grade_for_config = models.BooleanField(null=True) #To select whether to take only grade or marks from exam

class FinalResultConfigurationMerge(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_configuration_merge_standard_section')
    exam = models.ManyToManyField(Exam, blank=True, related_name='final_result_configuration_merge_exam')
    final_result_config = models.ForeignKey(FinalResultConfiguration, on_delete=models.SET_NULL, null=True, related_name='final_result_configuration_merge_result')
    name = models.ForeignKey(ResultConfigurationMergeName, on_delete=models.SET_NULL, null=True, related_name='final_result_configuration_merge_name')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentExamFinalResultForFinalConfig(models.Model):
    statuslist = (
        ('pass', 'pass'),
        ('fail', 'fail'),
    )
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, blank=True, related_name='final_student_exam_exam')
    final_result_config = models.ForeignKey(FinalResultConfiguration, on_delete=models.SET_NULL, null=True, blank=True,
                                      related_name='final_student_exam_result')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='final_student_exam_student')
    changed_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                     related_name='final_student_exam_changed_user_id')
    status = models.CharField(max_length=10, choices=statuslist)
    is_announced = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    totalgrade=models.CharField(max_length=10,null=True,blank=True)

class FinalResultSectionApproval(models.Model):
    approval_status = models.BooleanField(default=False)
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_section_approval_grade_plan')
    total_grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL,null=True,related_name='final_result_section_approval_total_grade_plan') # Grade plan for total marks
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_section_approval_standard_section')
    final_result_config = models.ForeignKey(FinalResultConfiguration, on_delete=models.SET_NULL, null=True,
                                         related_name='final_result_section_approval_result_config')
    is_announced = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)