from django.db import models
from apps.institutes.models.institute import Institute
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard


class CustomDesignTemplate(models.Model):
    """Model to store custom design templates for marks cards"""
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    template_data = models.JSONField(help_text="Stores the template design structure (droppedItems, pageSize, etc.)")
    sample_data = models.JSONField(blank=True, null=True, help_text="Sample student mark data used for design")
    api_config = models.JSONField(blank=True, null=True, help_text="API configuration: endpoint, exam, standard_section, student_ids")
    module = models.CharField(max_length=100, default='marks_card', help_text="Module name (e.g., marks_card)")
    template_type = models.CharField(max_length=50, default='pdf', help_text="Template type: pdf or html")
    is_active = models.BooleanField(default=True)
    is_predefined = models.BooleanField(default=False, help_text="True for system templates, False for user-created templates")
    institute = models.ForeignKey(Institute, on_delete=models.CASCADE, related_name='custom_design_templates', null=True, blank=True, help_text="Null for predefined templates")
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, blank=True)
    standard = models.ForeignKey(Standard, on_delete=models.SET_NULL, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_custom_templates')

    class Meta:
        db_table = 'custom_design_template'
        verbose_name = 'Custom Design Template'
        verbose_name_plural = 'Custom Design Templates'
        ordering = ['-created']

    def __str__(self):
        return f"{self.name} - {self.institute.name if self.institute else 'N/A'}"

class CustomDesignTemplateMap(models.Model):
    """Maps a unique key to a CustomDesignTemplate (e.g. for report type -> template)."""
    key = models.CharField(max_length=255, unique=True, help_text="Unique name to identify the design mapping")
    template = models.ForeignKey(
        CustomDesignTemplate,
        on_delete=models.CASCADE,
        related_name='design_maps',
    )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'custom_design_template_map'
        verbose_name = 'Custom Design Template Map'
        verbose_name_plural = 'Custom Design Template Maps'
        ordering = ['key']

    def __str__(self):
        return f"{self.key} -> {self.template.name}"


class TemplateSampleJson(models.Model):
    template_name = models.CharField(max_length=255)
    template_data = models.JSONField(help_text="Stores the template design structure (droppedItems, pageSize, etc.)")
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'template_sample'
        verbose_name = 'Template Sample Json'
        verbose_name_plural = 'Template Sample Jsons'
        ordering = ['-created']