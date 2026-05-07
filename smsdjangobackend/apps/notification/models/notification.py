from django.db import models
from apps.shared.models.document import Document
from rest_framework import exceptions
from django.core.exceptions import ValidationError

from apps.users.models import User
from django.contrib.auth.models import Group
from apps.institutes.models import AcademicYear
"""
    This is to hold all the api which is going to send notification when the api got hit
    Suggestion eg: Hi ###full_name###, Your pending fee payment amount ###FeePlan.amount###
"""

notification_medium_global = (
        ('sms', 'sms'),
        ('email', 'email'),
        ('push', 'push'),
        ('webpush', 'webpush'),
        ('whatsapp','whatsapp'),
        ('ivr','ivr')
    )

sms_vendor_list = [
    'jtg', 'infomedia', 'lumbinsmartsms'
]

# notification vendor
# sms - lumbinsmartsms -LUMBIN - LIPS SPEduT - 1
	

class NotificationVendor(models.Model):
    notification_medium = models.CharField(max_length=20, choices=notification_medium_global)
    vendor_name = models.CharField(max_length=50)
    sender_id = models.CharField(max_length=50)
    brand_name = models.CharField(max_length=100, default='Edubricz')
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.notification_medium != 'sms':
            raise ValidationError('Right Now supporting only sms')
        if self.notification_medium == 'sms' and self.vendor_name not in sms_vendor_list:
            raise ValidationError(f'Invalid vendor - Available Vendors are {" , ".join(sms_vendor_list)}')
        if self.is_active:
            notification_data = NotificationVendor.objects.filter(
                is_active=True, notification_medium=self.notification_medium,
                vendor_name=self.vendor_name
            )
            if notification_data:
                raise ValidationError('Duplicate Notification medium exists')
        super().save(*args, **kwargs)


def _default_notification_api_extra_params():
    return []


class NotificationApiConfiguration(models.Model):
    notification_medium = notification_medium_global
    api_name = models.CharField(max_length=255)
    description = models.CharField(max_length=500)
    suggestion = models.CharField(max_length=255, blank=True, null=True)
    customized_message = models.CharField(max_length=500, blank=True, null=True)
    default_message = models.CharField(max_length=500, blank=True, null=True)
    notification_medium = models.CharField(max_length=15, choices=notification_medium)
    enable_for_school = models.BooleanField(default=False)  # when enabled sent for all the users
    enable_for_otherusers = models.BooleanField(default=True) # when enabled sent for only other users
    subject = models.CharField(max_length=255, blank=True)
    screen_name = models.CharField(max_length=255, blank=True, null=True)
    users = models.ManyToManyField(User, related_name='notification_api_configuration_users', blank=True)
    groups = models.ManyToManyField(Group, related_name='notification_api_configuration_groups', blank=True)
    template = models.TextField(max_length=1000, blank=True, null=True)
    template_for_other_user = models.CharField(max_length=1000,blank=True,null=True)
    is_default = models.BooleanField(default=True)#whenever we edit the notificatoin custom for each client this should be zero
    template_id = models.CharField(max_length=255, blank=True,null=True)
    extra_params = models.JSONField(blank=True, null=True)
    #when user want to change the template for individual client we specify the template_id here
    
    class Meta:
        unique_together = ('api_name', 'notification_medium')

    def __str__(self):
        return self.api_name

class NotificationLog(models.Model):
    notification_type = models.CharField(max_length=255, null=True, blank=True)
    notification_medium = models.CharField(max_length=15, choices=notification_medium_global)
    channel_data = models.JSONField()
    api_name = models.CharField(max_length=255, null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True, related_name='notificationlog_user', on_delete=models.SET_NULL, db_index=True)
    is_read_by_user = models.BooleanField(default=False, db_index=True)
    transaction_id = models.CharField(max_length=255, null=True, db_index=True) #used to find the status of the notification in each module
    created = models.DateTimeField(auto_now_add=True, db_index=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['user', 'created']),
            models.Index(fields=['user', 'is_read_by_user', 'created']),
            models.Index(fields=['created']),
        ]

class NotificationType(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    visible_to = models.CharField(default='all', max_length=50) #student #staff #kind of temp fix

class NotificationTypeMapping(models.Model):
    api_name = models.CharField(max_length=255, unique=True)
    notification_type = models.ForeignKey(NotificationType, null=True, blank=True, 
        related_name='notification_type_mapping_notification_type', on_delete=models.SET_NULL
    )

class NotificationLangauge(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255)

class NotificationMedium(models.Model):
    name = models.CharField(max_length=25)
    is_active=models.BooleanField(default=True)

class NotificationTemplate(models.Model):
    data = models.TextField()
    notification_medium = models.ForeignKey(NotificationMedium, null=True, blank=True, related_name='notification_template_medium', on_delete=models.SET_NULL)
    name = models.CharField(max_length=255)
    language = models.ForeignKey(NotificationLangauge, null=True, blank=True, related_name='notification_template_language', on_delete=models.SET_NULL)

class BulkNotificationCategory(models.Model): #used to store circular category example : Exam , Finance , Like this
    name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BulkNotification(models.Model):
    message_data = models.TextField(null=True, blank=True)
    selected_template = models.ForeignKey(NotificationTemplate, null=True, blank=True, related_name='bulk_notification_selected_template', on_delete=models.SET_NULL)
    heading = models.CharField(max_length=255)
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, related_name='bulk_notification_academic_year', on_delete=models.SET_NULL)
    standard_section_ids = models.CharField(max_length=255, null=True, blank=True)
    schedule = models.DateTimeField(null=True,blank=True)
    notification_medium = models.ForeignKey(NotificationMedium, null=True, related_name='bulk_notification_medium', on_delete=models.SET_NULL)
    language = models.ForeignKey(NotificationLangauge, null=True, blank=True, related_name='bulk_notification_language', on_delete=models.SET_NULL)
    transaction_id = models.CharField(unique=True, max_length=255)
    created_by_user = models.ForeignKey(User, null=True, blank=True, related_name='bulk_notification_create', on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    notification_type = models.IntegerField(default=0) #0 bulk notification, 1 custom report notification , 2 circular
    bulk_notification_category = models.ForeignKey(BulkNotificationCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='bulk_notification_bulk_notification_category')

class BulkNotificationUsers(models.Model):
    bulk_notification = models.ForeignKey(BulkNotification, null=True, blank=True, related_name='bulk_notification_users_bulk_notification', on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, related_name='bulk_notification_users_user', on_delete=models.SET_NULL)
    delivery_status = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class BulkNotificationDocumentMapping(models.Model):
    bulk_notification = models.ForeignKey(BulkNotification, related_name='bulk_notification_document_mapping_bulk_notification', null=True, blank=True, on_delete=models.SET_NULL)
    document = models.ForeignKey(Document, related_name='bulk_notification_document_mapping_document', null=True, blank=True, on_delete=models.SET_NULL)
    title = models.CharField(max_length=255, null=True, blank=True)