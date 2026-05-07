from django.db import models
from django.db.models import JSONField
from apps.users.models import User

"""
    Whenever long running api is there store those result in Table
"""

class LongProcessingApiResult(models.Model):
    result_data = JSONField(blank=True)
    api_name = models.CharField(max_length=255)
    transaction_id = models.CharField(max_length=255, unique=True)
    is_active = models.BooleanField(default=True)
    last_updated_date_time = models.DateTimeField(null=True, blank=True)
    execution_started_date_time = models.DateTimeField(null=True, blank=True)
    is_process_running = models.BooleanField(default=False)
    user = models.ForeignKey(User, null=True, blank=True, related_name='long_processing_api_result_user', on_delete=models.SET_NULL)
