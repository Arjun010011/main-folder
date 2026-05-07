from django.db import models
from django.db.models import F, OuterRef, Q, Subquery

from apps.staffs.models.staff import Staff
from apps.hr.models.timeTable import Day


class Shift(models.Model):
    Sessions = (
        ('0', '0'),
        ('0.5', '0.5'),
        ('1', '1')
    )
    name = models.CharField(max_length=255)
    late_attempt_per_month = models.IntegerField(null=True, blank=True)
    deduction_days = models.CharField(max_length=10, choices=Sessions, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class ShiftSchedule(models.Model):
    start_time = models.TimeField()
    end_time = models.TimeField()
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='shiftschedule_shift')
    day = models.ForeignKey(Day, on_delete=models.CASCADE, blank=True, null=True, related_name='shiftschedule_Day')
    first_session_end_time = models.TimeField(null=True, blank=True)
    second_session_start_time = models.TimeField(null=True, blank=True)
    buffer_time = models.IntegerField(null=True, blank=True)
    late_buffer_time = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class AssignShift(models.Model):
    
    PRIORITY_REGULAR = 1
    PRIORITY_TEMPORARY_OVERRIDE = 10 

    staff = models.ForeignKey(Staff, on_delete=models.CASCADE)
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='assign_shift_shift', null=True, blank=True)
    fromdate = models.DateField()
    todate = models.DateField()
    priority = models.IntegerField(
        default=PRIORITY_REGULAR,
        help_text='Higher value wins when multiple assignments overlap for same date. Use 1=regular, 10+=temporary/event.'
    )
    custom_time_start = models.TimeField(
        null=True, blank=True,
        help_text='Custom start time for temporary shift. Only used when priority >= 10. If not set, uses shift schedule.'
    )
    custom_time_end = models.TimeField(
        null=True, blank=True,
        help_text='Custom end time for temporary shift. Only used when priority >= 10. If not set, uses shift schedule.'
    )
    custom_buffer_time = models.IntegerField(
        null=True, blank=True,
        help_text='Custom buffer time (minutes) for temporary shift. If not set, uses shift schedule buffer_time.'
    )
    custom_late_buffer_time = models.IntegerField(
        null=True, blank=True,
        help_text='Custom late buffer time (minutes) for temporary shift. If not set, uses shift schedule late_buffer_time.'
    )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['staff', 'fromdate', 'todate', 'priority'], name='assignshift_staff_dates_pri'),
        ]
        constraints = [
            models.CheckConstraint(
                check=Q(fromdate__lte=F('todate')),
                name='assignshift_valid_date_range',
            ),
        ]

    def get_unassigned_shift_for_staff(staffIds, fordate):
        assignedIds = AssignShift.objects.filter(fromdate__lte=fordate, todate__gte=fordate,
                                                 staff__in=staffIds).values_list('staff', flat=True).distinct()
        return list(set(staffIds) - set(assignedIds))

    def get_assigned_shift_for_staff(fordate):
        from apps.shared.services import SharedService
        dayname = SharedService.get_day_for_date(fordate)
        best_id_subquery = AssignShift.objects.filter(
            staff=OuterRef('staff'),
            fromdate__lte=fordate,
            todate__gte=fordate,
        ).order_by('-priority', '-fromdate', '-id').values('id')[:1]
        best_assignments = AssignShift.objects.filter(
            fromdate__lte=fordate,
            todate__gte=fordate,
        ).annotate(best_id=Subquery(best_id_subquery)).filter(id=F('best_id'))
        result = []
        for assignment in best_assignments:
            if assignment.custom_time_start and assignment.custom_time_end:
                result.append({
                    'staff': assignment.staff_id,
                    'start_time': assignment.custom_time_start,
                    'end_time': assignment.custom_time_end,
                })
            else:
                schedule = ShiftSchedule.objects.filter(
                    shift=assignment.shift,
                    day__name=dayname,
                    is_active=True
                ).first()
                if schedule:
                    result.append({
                        'staff': assignment.staff_id,
                        'start_time': schedule.start_time,
                        'end_time': schedule.end_time,
                    })
        return result
