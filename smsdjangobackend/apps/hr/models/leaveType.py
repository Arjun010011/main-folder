from django.db import models

from apps.staffs.models import Staff
from apps.institutes.models import FinancialYear
from apps.shared.models import Document


class LeaveType(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def get_default_leave_codes(self):
        return ['lop']


class LeaveTypeMapping(models.Model):
    leave_type = models.ForeignKey(LeaveType, null=True, blank=True, on_delete=models.SET_NULL)
    financial_year = models.ForeignKey(FinancialYear, on_delete=models.CASCADE)
    max_leave_num = models.DecimalField(max_digits=5, decimal_places=2)
    max_leave_per_month = models.DecimalField(max_digits=5, decimal_places=2, default=0) #if 0 then he can take any number of leaves
    carry_forward_num = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    assigned_globaly = models.BooleanField(default=True) #when assigned globally is true it is assigned for all the staffs
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StaffLeaveTypeMapping(models.Model):
    staff = models.ForeignKey(LeaveType, null=True, blank=True, on_delete=models.SET_NULL, related_name='staff_leave_type_mapping_staff')
    leave_type_map = models.ForeignKey(LeaveTypeMapping, null=True, blank=True, on_delete=models.SET_NULL, related_name='staff_leave_type_mapping_leave_type_map')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StaffLeaves(models.Model):
    Approvalstatuses = (
        ('Approved', 'Approved'),
        ('NotApproved', 'NotApproved'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled')
    )
    leave_type = models.ForeignKey(LeaveType, null=True, on_delete=models.SET_NULL)
    reason_to_apply = models.CharField(max_length=255, null=True)
    attach_file = models.OneToOneField(Document, blank=True, null=True, on_delete=models.PROTECT)
    apply_to = models.CharField(max_length=255, null=True, blank=True)
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    approval_status = models.CharField(max_length=15, choices=Approvalstatuses, blank=True, null=True,
                                       default=Approvalstatuses[1][1])
    applied_from_date = models.DateField()
    applied_to_date = models.DateField()
    approved_by = models.ForeignKey(Staff, null=True, blank=True, related_name='approvedby', on_delete=models.SET_NULL)
    cancel_reject_reason = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StaffLeaveDates(models.Model):
    Sessions = (
        ('Session1', 'Session1'),
        ('Session2', 'Session2')
    )
    fordate = models.DateField()
    session = models.CharField(max_length=10, choices=Sessions)
    staff_leave = models.ForeignKey(StaffLeaves, on_delete=models.CASCADE, related_name='staff_leave_date')

    class Meta:
       ordering = ['fordate', 'session']