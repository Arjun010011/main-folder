from django.db import models
from rest_framework import exceptions

from apps.classes.models import Standard
from apps.institutes.models import AcademicYear


class Setting(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    type = models.CharField(max_length=255, null=True, blank=True)
    value = models.CharField(max_length=500, null=True, blank=True)
    description = models.CharField(max_length=500, null=True, blank=True)
    is_json = models.BooleanField(default=False)
    regex = models.CharField(max_length=255, null=True, blank=True)
    regex_error_message = models.CharField(max_length=255, null=True, blank=True)
    for_device = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class SettingOverride(models.Model):
    value = models.CharField(max_length=255, null=True, blank=True)
    for_device = models.BooleanField(default=True)
    setting = models.ForeignKey(Setting, related_name='setting_override', null=True, blank=True,
                                on_delete=models.SET_NULL)
    academic_year = models.ForeignKey(AcademicYear, related_name='setting_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='setting_standard', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
    Used to control duplicate values for api to table storing transaction id here to reduce the orginal table
    1. chats/message -> chats_message
"""
class TransactionIdTracking(models.Model):
    model_name = models.CharField(max_length=100, null=True, blank=True)
    transaction_id = models.CharField(max_length=150, null=True, blank=True)

    def is_transaction_id_exists(self, model_name, transaction_id):
        if TransactionIdTracking.objects.filter(model_name=model_name, transaction_id=transaction_id):
            raise exceptions.ValidationError('Duplicate Transaction Id')