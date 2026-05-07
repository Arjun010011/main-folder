from django.db import models
from apps.institutes.models.academicYear import AcademicYear
from apps.users.models import User


class ExamTerm(models.Model):
    name = models.CharField(max_length=255, unique=True)
    code = models.CharField(max_length=255, null=True, blank=True)
    alias_name = models.CharField(max_length=255, null=True, unique=True) # To give name of term as per school(used in marks card)


class ExamType(models.Model):
    examType = (
        ('Exam', 'Exam'),
        ('Test', 'Test'),
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    exam_type = models.CharField(max_length=10, choices=examType)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Exam(models.Model):
    term = models.ForeignKey(ExamTerm, null=True, blank=True, on_delete=models.SET_NULL, related_name='exam_term')
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True,
                                      on_delete=models.SET_NULL)
    exam_type = models.ForeignKey(ExamType, null=True, blank=True, on_delete=models.SET_NULL,
                                  related_name='exam_type_related')
    description = models.CharField(max_length=255, blank=True)
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)
    standard_section_ids = models.CharField(max_length=255, blank=True, null=True)
    created_by = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name='exam_created_by')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GradePlan(models.Model):
    name = models.CharField(max_length=255)
    is_default = models.BooleanField(default=False)
    is_percentage = models.BooleanField(default=True) #nikhil remove after the migration
    grade_type = models.IntegerField(default=0) #0 for marks 1 for percentage wise 2 for only grade
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)