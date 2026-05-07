from django.db import models

class Url(models.Model):
    path = models.CharField(max_length=255, null=True, default=None)
    menu_name = models.CharField(max_length=255, blank=True, null=True)
    description = models.CharField(max_length=255, blank=True, null=True)
    image_url = models.CharField(max_length=255, null=True)
    menu_type = models.CharField(max_length=255, default='web', blank=True, null=True) #app #staff_app
    is_enabled = models.BooleanField(default=True)

class Menu(models.Model):
    alias_name = models.CharField(max_length=255, blank=True, null=True)
    parent = models.IntegerField(default=0, null=True, blank=True)
    first_child = models.IntegerField(default=0)
    next_menu = models.IntegerField(default=0)
    url = models.OneToOneField(Url, related_name='menu_url', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    new_window = models.BooleanField(default=False)
    menu_type = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
