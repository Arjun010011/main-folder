from django.db import models

from apps.staffs.models import Staff
from apps.institutes.models import AcademicYear
from apps.shared.models import Document
from apps.students.models import Student
from apps.classes.models.standard import StandardSectionMapping


class StudentLeaveType(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=20, blank=True, null=True)
    is_active = models.BooleanField(default=True)

class StudentLeaveTypeAcademicYearMapping(models.Model):
    leave_type = models.ForeignKey(StudentLeaveType, null=True, blank=True, on_delete=models.SET_NULL)
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE)
    max_leave_num = models.DecimalField(max_digits=5, decimal_places=2)
    max_leave_per_month = models.DecimalField(max_digits=5, decimal_places=2, default=0) #if 0 then he can take any number of leaves
    carry_forward_num = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    assigned_globaly = models.BooleanField(default=True) #when assigned globally is true it is assigned for all the staffs
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentLeaveTypeMapping(models.Model):
    student = models.ForeignKey(StudentLeaveType, null=True, blank=True, on_delete=models.SET_NULL, related_name='student_leave_type_mapping_student')
    leave_type_map = models.ForeignKey(StudentLeaveTypeAcademicYearMapping, null=True, blank=True, on_delete=models.SET_NULL, related_name='student_leave_type_academic_year_mapping_leave_type_map')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StudentLeaves(models.Model):
    Approvalstatuses = (
        ('Approved', 'Approved'),
        ('NotApproved', 'NotApproved'),
        ('Rejected', 'Rejected'),
        ('Cancelled', 'Cancelled')
    )
    leave_type = models.ForeignKey(StudentLeaveType, null=True, on_delete=models.SET_NULL)
    reason_to_apply = models.CharField(max_length=255, null=True)
    attach_file = models.OneToOneField(Document, blank=True, null=True, on_delete=models.PROTECT)
    apply_to = models.CharField(max_length=255, null=True, blank=True)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    approval_status = models.CharField(max_length=15, choices=Approvalstatuses, blank=True, null=True,
                                       default=Approvalstatuses[1][1])
    applied_from_date = models.DateField()
    applied_to_date = models.DateField()
    approved_by = models.ForeignKey(Staff, null=True, blank=True, related_name='student_leaves_approvedby', on_delete=models.SET_NULL)
    cancel_reject_reason = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StudentLeaveDates(models.Model):
    Sessions = (
        ('Session1', 'Session1'),
        ('Session2', 'Session2')
    )
    fordate = models.DateField()
    session = models.CharField(max_length=10, choices=Sessions)
    student_leave = models.ForeignKey(StudentLeaves, on_delete=models.CASCADE, related_name='student_leave_date_student_leave')

    class Meta:
       ordering = ['fordate', 'session']

class StaffStandardSectionMapping(models.Model):
    """Common table for both class teacher and staff allocated to standard section."""
    ALLOCATION_TYPE_CHOICES = (
        ('class_teacher', 'Class Teacher'),
        ('staff', 'Staff'),
    )
    staff = models.ForeignKey(Staff, null=True, on_delete=models.SET_NULL, related_name='staff_standard_section_mapping_staff')
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='staff_standard_section_mapping_standard_section', null=True,
                                         blank=True, on_delete=models.PROTECT)
    allocation_type = models.CharField(max_length=20, choices=ALLOCATION_TYPE_CHOICES, default='staff')
    is_active = models.BooleanField(default=True)
    from_date = models.DateField(null=True, blank=True)
    to_date = models.DateField(null=True, blank=True)
