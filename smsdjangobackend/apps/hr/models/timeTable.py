from django.db import models
from django.db.models.fields import related

from apps.staffs.models.staff import Staff
from apps.classes.models.subject import Subject
from apps.classes.models.standard import StandardSectionMapping
from apps.institutes.models.academicYear import AcademicYear

""" List of Days in the week for the time table example """
class Day(models.Model):
    name = models.CharField(max_length=10, unique=True)
    is_active = models.BooleanField(default=True)
    is_teacher_working_day = models.BooleanField(default=True)
    is_student_working_day = models.BooleanField(default=True)

    def get_staff_working_day(self):
        return Day.objects.filter(is_teacher_working_day=True).values_list('name', flat=True)

    def get_student_working_days(self):
        return Day.objects.filter(is_student_working_day=True).values_list('name', flat=True)

class PeriodPlan(models.Model):
    name = models.CharField(max_length=255)
    academic_year = models.ForeignKey(AcademicYear, related_name='period_plan_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Period(models.Model):
    name = models.CharField(max_length=250, null=True)
    period_plan = models.ForeignKey(PeriodPlan, null=True, on_delete=models.CASCADE, related_name='period_period_plan')
    is_break = models.BooleanField(default=False)

class PeriodDayMapping(models.Model):
    day = models.ForeignKey(Day, null=True, on_delete=models.CASCADE, related_name='perioddaymapping_day')
    period = models.ForeignKey(Period, null=True, on_delete=models.CASCADE, related_name='perioddaymapping_period')
    start_time = models.TimeField()
    end_time = models.TimeField()

class TimeTableDateRange(models.Model):
    start_date = models.DateField()
    end_date = models.DateField()
    name = models.CharField(max_length=250, null=True)
    academic_year = models.ForeignKey(AcademicYear, null=True, on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)


class TimeTableScheduleParent(models.Model):
    date_range = models.ForeignKey(TimeTableDateRange, null=True, blank=True, on_delete=models.CASCADE)
    period_plan = models.ForeignKey(PeriodPlan, null=True, blank=True, on_delete=models.CASCADE, related_name='time_table_schedule_parent_period_plan')
    standard_section = models.ForeignKey(StandardSectionMapping, on_delete=models.CASCADE)

class TimeTableSchedule(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, null=True, blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, null=True, blank=True)
    period_day_mapping = models.ForeignKey(PeriodDayMapping, on_delete=models.CASCADE, null=True, blank=True,
        related_name='timetable_schedule_period_day_mapping')
    time_table_schedule_parent = models.ForeignKey(TimeTableScheduleParent, on_delete=models.CASCADE,
        null=True, blank=True, related_name='timetable_schedule_time_table_schedule_parent')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class TimetableRequestForChange(models.Model):
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='request_for_change_staff')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='request_for_change_subject', blank=True, null=True)
    reason = models.CharField(max_length=255, null=True, blank=True)
    timetable_schedule = models.ForeignKey(TimeTableSchedule, on_delete=models.CASCADE, related_name='request_for_change_staff')
    fordate = models.DateField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
