from django.db import models
from apps.institutes.models.academicYear import AcademicYear
from apps.hr.models.timeTable import Day

class SchoolTimingParent(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True, unique=True)
    academic_year = models.ForeignKey(
        AcademicYear, null=True, blank=True, on_delete=models.SET_NULL, related_name='school_timing_parent_academic_year'
    )
    standard_section_ids = models.CharField(max_length=255)

class SchoolTiming(models.Model):
    start_time = models.TimeField()
    half_day_time = models.TimeField()
    end_time = models.TimeField()
    day = models.ForeignKey(
        Day, null=True, blank=True, on_delete=models.SET_NULL, related_name='school_timing_day'
    )
    allowable_late_minutes = models.IntegerField(default=0)
    school_timing_parent = models.ForeignKey(
        SchoolTimingParent, null=True, blank=True, on_delete=models.SET_NULL, related_name='school_timing_school_timing_parent'
    )
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SchoolTimingCustomDates(models.Model):
    for_date = models.DateField()
    school_timing_parent = models.ForeignKey(
        SchoolTimingParent, null=True, blank=True, on_delete=models.SET_NULL, related_name='school_timing_custom_dats_school_timing'
    )
    start_time = models.TimeField()
    allowable_late_minutes = models.IntegerField(default=0)
    half_day_time = models.TimeField()
    end_time = models.TimeField()
    reason = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    