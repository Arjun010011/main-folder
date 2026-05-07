from django.db import models
from apps.staffs.models.staff import Staff
from apps.classes.models.standard import Standard


class StaffStandardMapping(models.Model):
    staff = models.ForeignKey(Staff, related_name='staff_standard_mapping_staff', on_delete=models.CASCADE)
    standard = models.ForeignKey(Standard, related_name='staff_standard_mapping_standard', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)