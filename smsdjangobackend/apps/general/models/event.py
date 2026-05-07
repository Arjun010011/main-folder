from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.classes.models import StandardSectionMapping
from apps.staffs.models import Staff
from apps.students.models import Student


class EventType(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)


class Event(models.Model):
    name = models.CharField(max_length=255)
    place = models.CharField(max_length=255)
    description = models.CharField(max_length=255)
    type = models.ForeignKey(EventType, related_name='event_type', null=True, blank=True, on_delete=models.SET_NULL)
    from_date = models.DateField()
    to_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_school = models.BooleanField(default=False)
    alternate_contact = models.CharField(max_length=255, blank=True, null=True)
    standard_section = models.ManyToManyField(StandardSectionMapping, verbose_name=_('standard_section'),
                                              related_name='event_standard_section', blank=True)
    staff = models.ManyToManyField(Staff, verbose_name=_('staff'), related_name='event_staff', blank=True)
    student = models.ManyToManyField(Student, verbose_name=_('student'), related_name='event_student', blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
