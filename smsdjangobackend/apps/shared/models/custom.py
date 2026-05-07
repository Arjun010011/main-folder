from django.db import models
from django.db.models import JSONField

from apps.institutes.models.academicYear import AcademicYear
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType

class FormDefinition(models.Model):
    form_name = models.CharField(max_length=255)
    column_name = models.CharField(max_length=255)
    column_alias = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=500, blank=True, null=True)
    hidden = models.BooleanField(default=False)
    editable = models.BooleanField(default=True)
    required = models.BooleanField(default=False)
    default_value = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class CustomForm(models.Model):
    form_name = models.CharField(max_length=255)
    form_for = models.CharField(max_length=255)
    field_structure = JSONField(blank=True, null=True)
    old_field_structure_log = JSONField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class CustomData(models.Model):
    data = JSONField(blank=True)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='custom_data_content_type')
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    custom_field = models.ForeignKey(CustomForm, null=True, blank=True, on_delete=models.SET_NULL, related_name='custom_data_custom_field')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)



