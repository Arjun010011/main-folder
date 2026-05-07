from django.db import models

from apps.institutes.models.academicYear import AcademicYear
from apps.staffs.models.staff import Staff
from apps.classes.models.subject import Subject
from apps.classes.models.standard import StandardSectionMapping


class StaffTeachingHour(models.Model):
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    max_hour = models.CharField(max_length=10, blank=True)


class StaffHourSubjectMapping(models.Model):
    staff_teaching_hour = models.ForeignKey(StaffTeachingHour, on_delete=models.CASCADE,
                                            related_name='assigned_subjects')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE)
    standard_section = models.ForeignKey(StandardSectionMapping,  on_delete=models.CASCADE,
                                         related_name='staff_hour_subject_maaping_standard_section',null=True,blank=True)
