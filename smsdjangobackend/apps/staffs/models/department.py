from django.db import models

from apps.classes.models.standard import Branch
from apps.staffs.models.staff import Staff

class Department(models.Model):
    branch = models.ForeignKey(Branch, on_delete=models.CASCADE, related_name='department_branch', null=True, blank=True)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class DepartmentStaffMapping(models.Model):
    department = models.ForeignKey(Department, on_delete=models.RESTRICT)
    staff = models.ForeignKey(Staff, related_name='department_staff_mapping_staff', on_delete=models.CASCADE, null=True, blank=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)

class DepartmentManager(models.Model):
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)