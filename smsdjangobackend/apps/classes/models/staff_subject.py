from django.db import models
from .subject import Subject

class StaffSubjectDetails(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='staff_subject_details_subject')
    subject_code = models.CharField(max_length=255)
    teaching_pedagogy = models.CharField(max_length=255)
    credit = models.IntegerField(default=0,null=True,blank=True)
    staff = models.ForeignKey('staffs.Staff', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)