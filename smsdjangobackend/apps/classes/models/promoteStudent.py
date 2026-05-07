from django.db import models

from apps.institutes.models.academicYear import AcademicYear
from .standard import Standard
from apps.students.models.student import Student


class PromoteStudent(models.Model):
    from_academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL,
                                           related_name='from_academic_year_id')
    to_academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL,
                                         related_name='to_academic_year_id')
    from_standard = models.ForeignKey(Standard, null=True, blank=True, on_delete=models.SET_NULL,
                                      related_name='from_standard_id')
    to_standard = models.ForeignKey(Standard, null=True, blank=True, on_delete=models.SET_NULL,
                                    related_name='to_standard_id')
    student = models.ForeignKey(Student, null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
