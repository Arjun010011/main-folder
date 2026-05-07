from django.db import models

from apps.bdu.models.Bdu import BduColumn


class BduValidationClass(models.Model):
    validation_type = models.CharField(max_length=255, null=True, blank=True)
    error_message = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class BduValidation(models.Model):
    bdu_column = models.ForeignKey(BduColumn, related_name='bdu_validation_column', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    bdu_validation_class = models.ForeignKey(BduValidationClass, related_name='bdu_validation_class',
                                             on_delete=models.PROTECT)
    validation_value = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
