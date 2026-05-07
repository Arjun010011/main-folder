from rest_framework.exceptions import ValidationError
from django.db import models
from apps.exams.models import ExamSchedule, Exam
from apps.exams.models.exam import GradePlan
from apps.exams.models.schedule import ExamScheduleCumulativeMapping, ExamScheduleQuestionmapping
from apps.institutes.models.visitor import Reason
from apps.students.models import Student
from apps.staffs.models import Staff
from apps.classes.models import StandardSectionMapping
from apps.exams.models.result import ResultConfiguration
from apps.institutes.models.academicYear import AcademicYear
from django.core.exceptions import ObjectDoesNotExist
from apps.classes.models.subject import Subject

from apps.users.models.user import User
from decimal import Decimal, InvalidOperation
from django.forms.models import model_to_dict

class StudentMark(models.Model):
    attendanceStatuses = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
    )
    exam_schedule = models.ForeignKey(ExamSchedule, null=True, blank=True, on_delete=models.SET_NULL)
    marks = models.FloatField(null=True)
    marked_attendance_days = models.FloatField(blank=True, null=True) #we store each subject attendance here
    #when set to global marked attendance is for all the subject and we store duplicate in all the row front end read any of the one row and show user as summary
    marked_attendance_is_global = models.BooleanField(default=True)
    remark = models.ForeignKey(Reason, null=True, blank=True, on_delete=models.SET_NULL, related_name='student_mark_remark') #we store each subject remark here
    remark_is_global = models.BooleanField(default=True)
    grade = models.CharField(max_length=250, null=True, blank=True)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL)
    attendance_status = models.CharField(max_length=10, choices=attendanceStatuses)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentMarkAuditLog(models.Model):
    student_mark = models.ForeignKey(StudentMark, on_delete=models.CASCADE, related_name="edit_logs")
    field_name = models.CharField(max_length=100)
    old_value = models.TextField(null=True, blank=True)
    new_value = models.TextField(null=True, blank=True)
    edited_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    edited_on = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def log_student_mark_changes(old_instance, new_data: dict, user, transaction_id=None):
        """
        Log all meaningful changes to StudentMark fields.
        Do NOT log if the change is from 0 to any value.
        """
        fields_to_track = [
            'marks',
            'grade',
            'remark_id',
            'attendance_status',
            'marked_attendance_days'
        ]

        old_data = model_to_dict(old_instance, fields=fields_to_track)

        for field in fields_to_track:
            old_value = old_data.get(field)
            new_value = new_data.get(field)

            # Normalize both values to string and strip spaces
            old_str = str(old_value).strip() if old_value is not None else None
            new_str = str(new_value).strip() if new_value is not None else None

            # Skip if both are None or both empty
            if (old_str is None and new_str is None) or (old_str == '' and new_str == ''):
                continue

            try:
                if old_str is not None and new_str is not None:
                    old_dec = Decimal(old_str)
                    new_dec = Decimal(new_str)

                    # SKIP if change is from 0 to any value
                    if old_dec == 0 and new_dec != 0:
                        continue

                    # Log if values differ
                    if old_dec != new_dec:
                        StudentMarkAuditLog.objects.create(
                            student_mark=old_instance,
                            field_name=field,
                            old_value=old_value,
                            new_value=new_value,
                            edited_by=user
                        )
                else:
                    # One is None, the other is not — log change
                    if old_str != new_str:
                        StudentMarkAuditLog.objects.create(
                            student_mark=old_instance,
                            field_name=field,
                            old_value=old_value,
                            new_value=new_value,
                            edited_by=user
                        )
            except (InvalidOperation, ValueError):
                # Handle non-numeric values like grade or attendance_status
                if old_str == '0' and new_str != '0':
                    continue  # ❌ Don't log 0 → something
                if old_str != new_str:
                    StudentMarkAuditLog.objects.create(
                        student_mark=old_instance,
                        field_name=field,
                        old_value=old_value,
                        new_value=new_value,
                        edited_by=user
                    )

    class Meta:
        ordering = ['-edited_on']


class StudentMarkSectionWiseApproval(models.Model):
    ApprovalStatus = (('0', 'Unapproved'),
                      ('1', 'Finalized'))
    exam = models.ForeignKey(Exam, null=True, blank=True,
                             on_delete=models.SET_NULL)
    result_config = models.ForeignKey(ResultConfiguration, on_delete=models.CASCADE, null=True, blank=True,
                                      related_name='studentmarksection_result_config')
    approval_status = models.CharField(default='0', max_length=1, choices=ApprovalStatus)
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentMarkSectionSubjectWiseApproval(models.Model):
    ApprovalStatus = (('0', 'Unapproved'),
                      ('1', 'Finalized'))
    exam = models.ForeignKey(Exam, null=True, blank=True,
                             on_delete=models.SET_NULL)
    approval_status = models.CharField(default='0', max_length=1, choices=ApprovalStatus)
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, blank=True, on_delete=models.SET_NULL)
    subject = models.ForeignKey(Subject, null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Grade(models.Model):
    name = models.CharField(max_length=255)
    from_range = models.FloatField(null=True)
    to_range = models.FloatField(null=True)
    is_fail_grade = models.BooleanField(default=False) #if any one subject failed we will show this grade
    grade_plan = models.ForeignKey(GradePlan, null=True, blank=True, on_delete=models.CASCADE, related_name='grade_grade_plan')

class StudentCumulativeMark(models.Model):
    attendanceStatuses = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
    )
    exam_cumulative = models.ForeignKey(ExamScheduleCumulativeMapping, related_name='student_cumulative_mark_cumulative',
                                        on_delete=models.SET_NULL,null=True, blank=True)
    marks = models.FloatField(null=True)
    grade = models.CharField(max_length=10, null=True, blank=True)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL) #staff who enters the marks
    attendance_status = models.CharField(max_length=10, choices=attendanceStatuses)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GradeExamScheduleMapping(models.Model):
    exam = models.ForeignKey(Exam, null=True, blank=True, on_delete=models.SET_NULL)
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, on_delete=models.SET_NULL, blank=True)
    grade_plan = models.ForeignKey(GradePlan, null=True, blank=True, on_delete=models.SET_NULL, related_name='grade_exam_schedule_mapping_grade_plan')
    grade_plan_for_total = models.ForeignKey(GradePlan, null=True, blank=True, on_delete=models.SET_NULL, related_name='grade_exam_schedule_mapping_grade_plan_for_total')
    is_final_marks_grade_plan = models.IntegerField(default=3)  # need to remove this because achieved by adding grade_plan_for_total 1 grade plan set for subjects #2 grade plan for final result #3 grade plan for both
    max_no_of_days_attendance = models.FloatField(null=True, blank=True) #used to store attendance config in this
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    attendance_from_date = models.DateTimeField(null=True,blank=True)
    attendance_to_date = models.DateTimeField(null=True, blank=True)

    def get_my_grade_data(self, exam, standard_section, raise_if_empty=False, is_for_total_marks=False,subject=None):
        error_msg = 'Grade plan is mandatory'
        grade_plan = None
        grade_list = []
        try:
            try:
                grade_schedule = ExamSchedule.objects.get(exam=exam,standard_section=standard_section,subject=subject, grade_plan__isnull=False)
                grade_plan = grade_schedule.grade_plan
            except Exception as e:
                grade_schedule = GradeExamScheduleMapping.objects.get(exam=exam, standard_section=standard_section)
                if is_for_total_marks:
                    grade_plan=grade_schedule.grade_plan_for_total
                else:
                    grade_plan=grade_schedule.grade_plan
        except Exception as e:
             try:
                 grade_plan = GradePlan.objects.get(is_default=True)
             except Exception as e:
                 if raise_if_empty:
                     raise ValidationError(error_msg)
        if grade_plan:
            grade_list = Grade.objects.filter(grade_plan=grade_plan).values()
            if raise_if_empty and not grade_list:
                raise ValidationError(error_msg)
        return grade_list, grade_plan
    
class StudentMarkQuestionWise(models.Model):
    attendanceStatuses = (
        ('Present', 'Present'),
        ('Absent', 'Absent'),
    )
    exam_schedule_question_mapping = models.ForeignKey(ExamScheduleQuestionmapping, null=True, blank=True, on_delete=models.SET_NULL)
    marks = models.FloatField(null=True)
    grade = models.CharField(max_length=10, null=True, blank=True)
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL)
    attendance_status = models.CharField(max_length=10, choices=attendanceStatuses)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)