from venv import create
from django.db import models
from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.finance.models.fee import FeeType

from apps.institutes.models.academicYear import AcademicYear

class TemplateMapping(models.Model):
    templateType = (
        ('pdf', 'pdf'),
        ('html', 'html'),
    )
    name = models.CharField(max_length=255, null=True, blank=True)
    template_type = models.CharField(max_length=10, choices=templateType, blank=True, null=True)
    module = models.CharField(max_length=255, null=True, blank=True)
    no_of_copies = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class TemplateStandardMapping(models.Model):
    template = models.ForeignKey(TemplateMapping, null=True, blank=True, on_delete=models.SET_NULL, related_name='template_standard_mapping_template')
    standard = models.ForeignKey(Standard, null=True, blank=True, on_delete=models.SET_NULL)
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL)
    fee_type = models.ForeignKey(FeeType, null=True, blank=True, on_delete=models.SET_NULL)
    multiple_template_no = models.IntegerField(null=True)
    