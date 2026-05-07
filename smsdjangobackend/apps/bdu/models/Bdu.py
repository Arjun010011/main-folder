from django.db import models


class Bdu(models.Model):
    upload_type = (
        ('both', 'both'),
        ('update', 'update'),
        ('insert', 'insert'),
    )
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=255, null=True, blank=True)
    primary_table = models.CharField(max_length=255, null=True, blank=True)
    upload_type = models.CharField(max_length=6, choices=upload_type, null=True, blank=True)
    process_hook = models.CharField(max_length=255, null=True, blank=True)
    process_function = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    read_only = models.BooleanField(default=False)
    transaction_id = models.CharField(max_length=255)
    bulk_upload_supported = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class BduColumn(models.Model):
    bdu = models.ForeignKey(Bdu, related_name='bdu_column_bdu', on_delete=models.SET_NULL, null=True, blank=True)
    schema_table = models.CharField(max_length=255, null=True, blank=True)
    schema_column = models.CharField(max_length=255, null=True, blank=True)
    required = models.BooleanField(default=False)
    alias = models.CharField(max_length=255, null=True, blank=True)
    update_allowed = models.BooleanField(default=True)
    exclude_from_view = models.BooleanField(default=False)
    ignored = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
