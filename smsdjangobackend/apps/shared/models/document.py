from django.db import models
from apps.shared.models.groups_type import GroupType


class Document(models.Model):
    file = models.FileField()  # documents location
    file_name = models.CharField(max_length=255, blank=True, null=True)
    size = models.FloatField(default=0)
    content_type = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class DocumentType(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    group_type = models.CharField(default="1", blank=True, null=True, max_length=255)