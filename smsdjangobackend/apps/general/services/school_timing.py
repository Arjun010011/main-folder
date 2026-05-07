from django.db import transaction

from rest_framework import exceptions
from apps.classes.models.standard import StandardSectionMapping
from apps.general.models.school_timing import SchoolTiming, SchoolTimingParent
from apps.general.serializers import SchoolTimingParentSerializer, SchoolTimingSerializer
from apps.hr.models.timeTable import Day
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name

def add_school_timing(self, request):
    data = request.data
    school_parent_data = data['school_parent']
    existing_section_ids = StandardSectionMapping.objects.filter(id__in=school_parent_data['standard_section_ids'],
        academic_year=school_parent_data['academic_year']
    ).values_list('id', flat=True)
    standard_section_ids = school_parent_data['standard_section_ids']
    if set(school_parent_data['standard_section_ids']) - (set(existing_section_ids)):
        raise exceptions.ValidationError('Invalid standard section')
    school_timing_data = SchoolTimingParent.objects.filter(academic_year=school_parent_data['academic_year'])
    if 'id' in school_parent_data and school_parent_data['id']:
        school_timing_data = school_timing_data.exclude(id=school_parent_data['id'])
    existing_standard_section_ids = []
    for timing_data in school_timing_data.values():
        existing_standard_section_ids += [int(x) for x in timing_data['standard_section_ids'].split(",")]
    if set(standard_section_ids).intersection(set(existing_standard_section_ids)):
        raise exceptions.ValidationError('Already configured for the given Section')
    if not standard_section_ids:
        raise exceptions.ValidationError('Standard Section Ids are mandatory')
    school_parent_data['standard_section_ids'] = ','.join(str(x) for x in standard_section_ids)
    with transaction.atomic(using=get_current_db_name()):
        self.queryset = SchoolTimingParent.objects.all()
        self.serializer_class = SchoolTimingParentSerializer
        if 'id' in school_parent_data and school_parent_data['id']:
            school_timing_parent_data = SharedService.update_data(self, school_parent_data, **{'customObjectData': SchoolTimingParent.objects.get(id=school_parent_data['id'])})
        else:
            school_timing_parent_data = SharedService.add_data(self, school_parent_data, False)
        day_data = dict(Day.objects.filter(is_active=True).values_list('id', 'is_student_working_day'))
        find_duplicate_day_ids = []
        for timing_data in data['school_timing']:
            timing_data['school_timing_parent'] = school_timing_parent_data['data']['id']
            if not day_data[timing_data['day']]:
                raise exceptions.ValidationError('The selected day is not working day')
            if timing_data['start_time'] >= timing_data['end_time']:
                raise exceptions.ValidationError('Start time is greater than end time')
            if not ( timing_data['start_time'] <= timing_data['half_day_time'] <= timing_data['end_time'] ):
                raise exceptions.ValidationError('Half day time should be between start_time and end_time')
            time_between_half = SharedService.get_time_difference_from_two_time(
                SharedService.time_to_obj(timing_data['start_time']), SharedService.time_to_obj(timing_data['half_day_time']), "%H:%M:%S")
            time_between_half = int(time_between_half.total_seconds()/60)
            time_between_last = SharedService.get_time_difference_from_two_time(
                SharedService.time_to_obj(timing_data['half_day_time']), SharedService.time_to_obj(timing_data['end_time']), "%H:%M:%S")
            time_between_last = (time_between_last.total_seconds()/60)
            if timing_data['allowable_late_minutes'] > time_between_half or timing_data['allowable_late_minutes'] > time_between_last:
                raise exceptions.ValidationError('Allowable late minutes greater than time between')
            if timing_data['day'] in find_duplicate_day_ids:
                raise exceptions.ValidationError('Duplicate day data')
        self.queryset = SchoolTiming.objects.all()
        self.serializer_class = SchoolTimingSerializer
        for timing_data in data['school_timing']:
            if 'id' in timing_data and timing_data['id']:
                response = SharedService.update_data(self, timing_data, **{'customObjectData': SchoolTiming.objects.get(id=timing_data['id'])})
            else:
                response = SharedService.add_data(self, timing_data, False)
    return {'Reason': 'Data added successfully'}

    