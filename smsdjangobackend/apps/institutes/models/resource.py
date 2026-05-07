from django.db import models


class Resource(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    alias_name = models.CharField(max_length=255, blank=True, null=True)
    max_limit = models.FloatField(default=0)
    usage = models.FloatField(default=0)
    measure = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ResourceFailureLog(models.Model):
    resource = models.ForeignKey(Resource, related_name='resource_failure_log_resource', null=True, blank=True,
        on_delete=models.SET_NULL)
    failed_json = models.CharField(max_length=5000, null=True, blank=True)
    failed_reason = models.CharField(max_length=5000, null=True, blank=True)
    is_processed = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
