from django.db import models

class ModeOfPayment(models.Model):
    label = models.CharField(max_length=75, blank=True, null=True)
    name = models.CharField(max_length=75, blank=True, null=True)
    mandatory_fields = models.CharField(max_length=255, null=True, blank=True)
    display_fields = models.CharField(max_length=255, null=True, blank=True)
    allowed_app_types = models.CharField(max_length=255, null=True, blank=True) # example student_app, staff_app, staff_web, nowhere
    is_active = models.BooleanField(default=True)
    sequence = models.IntegerField(null=True, blank=True)
