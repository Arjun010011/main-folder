from django.db import models
from apps.classes.models.standard import Branch
from apps.institutes.models.academicYear import AcademicYear
from rest_framework import exceptions

class AcademicYearBranchMapping(models.Model):
    academic_year = models.ForeignKey( AcademicYear,
        related_name='academic_year_branch_mapping_academic_year', null=True, blank=True,
        on_delete=models.PROTECT
    )
    branch = models.ForeignKey( Branch,
        related_name='academic_year_branch_mapping_branch', null=True, blank=True,
        on_delete=models.PROTECT
    )
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if AcademicYearBranchMapping.objects.filter(
            academic_year=self.academic_year, branch=self.branch
        ).exists():
            raise exceptions.ValidationError('Duplicate Academic year branching')
        super().save(*args, **kwargs)

    def __str__(self):
        return '%s-%s %s' % (
            self.academic_year.start_date, self.academic_year.end_date,
            self.branch.name
        )
