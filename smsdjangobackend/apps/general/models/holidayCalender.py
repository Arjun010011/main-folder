from django.db import models
from django.db.models import Q

from apps.institutes.models import FinancialYear
from apps.shared.models import Document
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard


class HolidayCalender(models.Model):
    financial_year = models.ForeignKey(FinancialYear, null=True, blank=True, on_delete=models.SET_NULL)
    from_date = models.DateField()
    to_date = models.DateField()
    reason = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_upcoming_holidays(self, fromDate, toDate='9999-12-30', returnList=True):
        from apps.shared.services import SharedService
        holidayDateRangeList = []
        holidays = HolidayCalender.objects.filter(
            Q(from_date__gte=fromDate, from_date__lte=toDate) | Q(to_date__gte=fromDate, to_date__lte=toDate)).values(
            'from_date', 'to_date', 'reason').order_by('from_date')
        if not returnList:
            return holidays
        for date in holidays:
            holidayDateRangeList += SharedService.get_for_date_from_date_range(date['from_date'], date['to_date'])
        return holidayDateRangeList

class HolidayPlan(models.Model):
    name = models.CharField(max_length=255)
    academic_year = models.ForeignKey(AcademicYear, related_name='holiday_plan_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ManyToManyField(Standard, blank=True, related_name='holiday_plan_standard')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class HolidayCalenderStudent(models.Model):
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL)
    from_date = models.DateField()
    to_date = models.DateField()
    reason = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    holiday_plan = models.ForeignKey(HolidayPlan, related_name='holiday_plan', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    holiday_type = models.IntegerField(default=1) #1: holiday 2:event

    def get_upcoming_holidays(self, fromDate, toDate='9999-12-30', returnList=True):
        from apps.shared.services import SharedService
        holidayDateRangeList = {}
        holidays = HolidayCalenderStudent.objects.filter(
            Q(from_date__gte=fromDate, from_date__lte=toDate,holiday_type=1) | Q(to_date__gte=fromDate, to_date__lte=toDate,holiday_type=1)).values(
            'from_date', 'to_date', 'reason').order_by('from_date')
        if not returnList:
            return holidays
        for date in holidays:
            temp = SharedService.get_for_date_from_date_range(date['from_date'], date['to_date'])
            for t in temp:
                holidayDateRangeList[str(t)] = date['reason']
        return holidayDateRangeList

class EventImageMapping(models.Model):
    image = models.ForeignKey(Document, related_name='event_image_mapping_image', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    event_calender = models.ForeignKey(HolidayCalenderStudent, related_name='event_image_mapping_event_calender', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)