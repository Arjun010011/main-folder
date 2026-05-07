from django.db import models

""" This financial year will be reflected for payroll and leavemanagement. This will be the academic year for staff"""


class FinancialYear(models.Model):
    start_date = models.DateField()
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    is_locked = models.BooleanField(default=False, help_text="Locked when balance sheet is locked")
    locked_at = models.DateTimeField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_financial_year_for_date(self, for_date, next_data=False, previous=False):
        data = FinancialYear.objects.filter(start_date__lte=for_date, end_date__gte=for_date, is_active=True).values(
            'start_date', 'end_date', 'id')
        if not data:
            if next_data:
                data = FinancialYear.objects.filter(
                    start_date__gt=for_date, is_active=True
                ).values(
                    'start_date', 'end_date', 'id'
                )
            if previous:
                data = FinancialYear.objects.filter(
                    end_date__lt=for_date, is_active=True
                ).values(
                    'start_date', 'end_date', 'id'
                )
        tmp_data = {}
        if data.count() >= 1:
            tmp_data = data[0]
        return tmp_data