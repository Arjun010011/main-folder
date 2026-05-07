from django.db import models

from apps.exams.models import Exam
from apps.exams.models.exam import GradePlan
from apps.exams.models.schedule import ExamScheduleCumulativeMapping
from apps.institutes.models import AcademicYear
from apps.classes.models import Subject, StandardSectionMapping
from apps.students.models import Student


class ExamResultConfiguration(models.Model):
    ApprovalStatus = (('0', 'Unapproved'),
                      ('1', 'Approved'),
                      ('2', 'Rejected'),
                      ('3', 'Pending'),)
    exam = models.ForeignKey(Exam, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_result_configuration_exam')
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_configuration_standard_section')
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_configuration_grade_plan')
    total_grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_configuration_total_grade_plan')
    remarks = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_configuration_remarks')
    total_min_marks = models.FloatField(null=True)
    is_fail_if_not_min = models.BooleanField(default=True)
    is_announced = models.BooleanField(default=False)
    approval_status = models.CharField(default='0', max_length=1, choices=ApprovalStatus)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExamResultSubjectConfiguration(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_result_subject_configuration_subject')
    exam_result_configuration = models.ForeignKey(ExamResultConfiguration, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_subject_configuration_exam_result_configuration')
    configured_marks = models.FloatField(null=True)
    is_disabled = models.BooleanField(default=False)
    configured_min_marks = models.FloatField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExamResultCumulativeConfiguration(models.Model):
    exam_result_subject_config = models.ForeignKey(ExamResultSubjectConfiguration, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_result_cumulative_config_exam_result_subject_config')
    schedule_cumulative = models.ForeignKey(ExamScheduleCumulativeMapping, on_delete=models.SET_NULL, null=True, blank=True, related_name='exam_result_cumulative_config_cumulative_type')
    is_disabled = models.BooleanField(default=False)
    configured_marks = models.FloatField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExamResultMarksObtained(models.Model):
    total_obtained_marks = models.FloatField(null=True)
    total_configured_marks = models.FloatField(null=True)
    exam_result_configuration = models.ForeignKey(ExamResultConfiguration, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_marks_obtained_exam_result_configuration')
    grade_plan = models.ForeignKey(GradePlan, on_delete=models.SET_NULL, blank=True,null=True, related_name='exam_result_marks_obtained_grade_plan')
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, blank=True, null=True, related_name='exam_result_marks_obtained_student')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)