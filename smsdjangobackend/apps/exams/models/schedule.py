from django.db import models
from apps.exams.models import Exam
from apps.classes.models.standard import  StandardSectionMapping
from apps.exams.models.exam import GradePlan
from apps.students.models.student import Student
from apps.classes.models.subject import CumulativeType, Subject,CourseOutcome


class ExamSchedule(models.Model):
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, on_delete=models.SET_NULL, blank=True)
    subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL)
    is_sub_schedule = models.BooleanField(default=False)
    sub_schedule_parent = models.ForeignKey('self', null=True, related_name='exam_schedule_sub_schedule_parent',
                                            on_delete=models.SET_NULL)
    fordate = models.DateField(null=True)
    start_time = models.TimeField(null=True)
    end_time = models.TimeField(null=True)
    min_marks = models.FloatField(null=True)
    max_marks = models.FloatField(null=True)
    next_linking_id = models.ForeignKey('self', null=True, related_name='exam_schedule_next_linking_id',
                                            on_delete=models.SET_NULL )
    grade_plan = models.ForeignKey(GradePlan, null=True, related_name='exam_schedule_grade_plan', on_delete=models.SET_NULL) #this is used when only the grade is configured for subject
    is_marks = models.BooleanField(default=True) #if false it will be only grades
    #used when only grade are there marks not there also used when subject wise grade is there when the grade_plan is not there fetches from the standardsection mapping
    is_sub_disabled_for_halticket = models.BooleanField(default=False)
    schedule_sequence = models.IntegerField(default=0, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    questionframe_lastdate = models.DateField(null=True,blank=True)
    marksentry_lastdate = models.DateField(null=True,blank=True)

class ExamScheduleCumulativeMapping(models.Model):
    exam_schedule = models.ForeignKey(ExamSchedule, null=True, blank=True, on_delete=models.SET_NULL, related_name='exam_schedule_cumulative_mapping_exam_schedule')
    cumulative_type = models.ManyToManyField(CumulativeType, related_name='exam_schedule_cumulative_mapping_cumulative_type')
    max_marks = models.FloatField(null=True)
    min_marks = models.FloatField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StudentScheduleMapping(models.Model):
    exam_schedule = models.ForeignKey(ExamSchedule, null=True, blank=True, on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExamScheduleQuestionmapping(models.Model):
    exam_schedule = models.ForeignKey(ExamSchedule, null=True, blank=True, on_delete=models.SET_NULL)
    question_number = models.CharField(max_length=255)
    sub_question_number = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    sequence = models.IntegerField(default=0,null=True,blank=True)
    max_marks = models.FloatField(null=True)
    min_marks = models.FloatField(null=True)
    course_outcome = models.ForeignKey(CourseOutcome, on_delete=models.SET_NULL, null=True, related_name='exam_schedule_question_mapping_course_outcome')
    group_name = models.CharField(max_length=255,null=True)
    option_link_id = models.ForeignKey('self', null=True, related_name='exam_schedule_question_mapping_option_link_id',
                                            on_delete=models.SET_NULL )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExamScheduleAdditionalInfo(models.Model):
    exam_schedule = models.ForeignKey(ExamSchedule, null=True, blank=True, on_delete=models.SET_NULL, related_name='exam_schedule_additional_info_exam_schedule')
    portions = models.CharField(max_length=500, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)