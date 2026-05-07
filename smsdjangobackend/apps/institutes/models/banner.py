from django.db import models

from apps.shared.models import Document


class Banner(models.Model):
    heading = models.CharField(max_length=255, null=True, blank=True)
    sub_heading = models.CharField(max_length=255, blank=True, null=True)
    sequence = models.IntegerField(null=True, blank=True)
    link = models.CharField(max_length=255, null=True, blank=True)
    file = models.OneToOneField(Document, related_name='banner_file', blank=True, null=True, on_delete=models.SET_NULL)
    empty_space_colour = models.CharField(max_length=100, null=True, blank=True) #when banner uploaded background image what we show here 
    user_type = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
