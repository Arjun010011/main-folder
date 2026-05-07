from django.db import models
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard
from apps.students.models.student import Student
from django.db.models import JSONField


class FinanceDashboardCache(models.Model):
    """
    Pre-calculated finance dashboard data cache
    Updates in real-time based on events (student added, adjustment, concession, etc.)
    """
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='dashboard_cache')
    standard = models.ForeignKey(Standard, on_delete=models.SET_NULL, null=True, blank=True, related_name='dashboard_cache')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, null=True, blank=True, related_name='dashboard_cache')
    
    # Aggregated metrics
    total_students = models.IntegerField(default=0)
    total_fee_amount = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    total_collected = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    total_pending = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    total_adjustment = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    total_concession = models.DecimalField(max_digits=30, decimal_places=2, default=0)
    
    # Detailed breakdown (stored as JSON for flexibility)
    fee_type_breakdown = JSONField(default=dict, blank=True, null=True)
    payment_mode_breakdown = JSONField(default=dict, blank=True, null=True)
    monthly_collection = JSONField(default=dict, blank=True, null=True)
    
    # Cache metadata
    last_calculated = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['academic_year', 'standard', 'student']]
        indexes = [
            models.Index(fields=['academic_year', 'standard']),
            models.Index(fields=['academic_year', 'student']),
            models.Index(fields=['academic_year']),
        ]
    
    def __str__(self):
        if self.student:
            return f"Dashboard Cache - {self.academic_year.year_name} - Student: {self.student.id}"
        elif self.standard:
            return f"Dashboard Cache - {self.academic_year.year_name} - Standard: {self.standard.name}"
        else:
            return f"Dashboard Cache - {self.academic_year.year_name} - Overall"

