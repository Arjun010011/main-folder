from django.db import models
from apps.users.models.user import User

class SwitchableInstitute(models.Model):
    company_id = models.IntegerField()
    database_name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class UserSwitchableInstituteMapping(models.Model):
    switchable_institute = models.ForeignKey(SwitchableInstitute, null=True, blank=True, on_delete=models.SET_NULL)
    switchable_institute_user_id = models.IntegerField()
    user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)