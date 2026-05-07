from django.db import models

class BiometricMachine(models.Model):
    machine_name = models.CharField(max_length=255, null=True, blank=True)
    service_tag_id = models.CharField(max_length=255, null=True, blank=True)
    model_no = models.CharField(max_length=255, null=True, blank=True)
    expirty_data = models.CharField(max_length=255, null=True, blank=True)
    token = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)