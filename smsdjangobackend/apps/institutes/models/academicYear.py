from datetime import datetime
from django.db import models
from rest_framework import exceptions

"""
handle_academic_save -> post save
"""
class AcademicYear(models.Model):
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    alias = models.CharField(max_length=255, null=True, blank=True)
    finance_enabled = models.BooleanField(default=True)

    # def __str__(self):
    #     return '%s %s %s' % (self.start_date, self.end_date, self.is_active)

    def get_academic_year_for_date(self, forDate, next=False, previous=False,is_dashboard = False):
        from apps.shared.services import ConfigurationService
        data = None
        academic_year = AcademicYear.objects.filter(is_active=True).order_by('start_date')
        request = getattr(self, 'request', None) or (getattr(self, 'context', None) or {}).get('request')
        try:
            if request and request.GET.get('branch') and int(ConfigurationService.get_setting_value('is_academic_branch_mapping')) and not is_dashboard:
                academic_year = academic_year.filter(academic_year_branch_mapping_academic_year__branch_id=request.GET.get('branch'))
            data = academic_year.filter(academic_year_branch_mapping_academic_year__start_date__lte=forDate, academic_year_branch_mapping_academic_year__end_date__gte=forDate).first()
            if not data:
                data = academic_year.get(start_date__lte=forDate, end_date__gte=forDate)
        except:
            if next:
                data = academic_year.filter(start_date__gt=forDate).first()
                if not data:
                    previous = True
            if previous:
                data = academic_year.filter(end_date__lt=forDate).last()
        return data

    def get_finance_enabled_academic_year_for_date(self, forDate):
        """Returns the finance-enabled academic year for the date. If the date falls in a
        non-finance-enabled academic year, returns the previous finance-enabled academic year."""
        academic_year = AcademicYear.objects.filter(
            is_active=True, finance_enabled=True
        ).order_by('start_date')
        try:
            return academic_year.get(start_date__lte=forDate, end_date__gte=forDate)
        except AcademicYear.DoesNotExist:
            return academic_year.filter(end_date__lt=forDate).last()

    def is_current_academic_year(academic_year_id):
        try:
            academic_obj = AcademicYear.objects.get(id=academic_year_id)
        except:
            raise exceptions.ValidationError('Current academic does not exist')
        for_date = datetime.today().date()
        if academic_obj.start_date <= for_date <= academic_obj.end_date:
            return True
        return False

    def get_previous_present_year(self):
        academic_year = AcademicYear.objects.all()
        present_year = academic_year.get(id=self.kwargs['pk'])
        previous_year = academic_year.filter(end_date__year=present_year.start_date.year).first()
        return previous_year, present_year
    
    def is_date_range_exist_in_academic_year(self, academic_year, from_date=None, to_date=None):
        academic_obj = AcademicYear.objects.get(id=academic_year)
        start_date = academic_obj.start_date
        end_date = academic_obj.end_date
        if from_date and to_date and not (start_date.strftime('%Y-%m-%d') <= from_date <= end_date.strftime('%Y-%m-%d') \
            and start_date.strftime('%Y-%m-%d') <= to_date <= end_date.strftime('%Y-%m-%d')):
            raise exceptions.ValidationError(f"Date range doesnot exist in the given academic year between {start_date.strftime('%Y-%m-%d')} {end_date.strftime('%Y-%m-%d')}")
        return academic_obj
