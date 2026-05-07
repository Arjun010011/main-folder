from django.db import models
from django.contrib.contenttypes.models import ContentType
from apps.users.models.user import User
from django.db.models import JSONField

class LogData(models.Model):
    user = models.ForeignKey(User, related_name='log_data_user', null=True, blank=True, on_delete=models.SET_NULL)
    request_method = models.CharField(max_length=255, blank=True, null=True)
    request_path = models.CharField(max_length=255, blank=True, null=True)
    header = models.CharField(max_length=1000, blank=True, null=True)
    client_ip = models.CharField(max_length=255, blank=True, null=True)
    request_body_new = JSONField(null=True)
    response = models.CharField(max_length=1000, blank=True, null=True)
    
    content_type = models.ForeignKey(
        ContentType, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='log_entries',
        help_text='The model/table that was modified'
    )
    object_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True,
        help_text='The primary key of the modified object'
    )
    previous_data = JSONField(
        null=True, 
        blank=True,
        help_text='Data before the change'
    )
    new_data = JSONField(
        null=True, 
        blank=True,
        help_text='Data after the change'
    )
    action = models.CharField(
        max_length=50, 
        null=True, 
        blank=True,
        help_text='Action type: CREATE, UPDATE, DELETE'
    )
    related_changes = JSONField(
        null=True, 
        blank=True,
        help_text='Changes to related models: [{"model": "ModelName", "object_id": "1", "action": "CREATE/UPDATE/DELETE", "previous_data": {...}, "new_data": {...}}]'
    )
    created_at = models.DateTimeField(auto_now_add=True, null=True)