from django.db import transaction
from django.db.models import Q,F
from rest_framework.exceptions import ValidationError
import datetime
from apps.classes.models.standard import Standard

from apps.hr.models.timeTable import Period, PeriodPlan, PeriodDayMapping, Day, TimetableRequestForChange
from apps.classes.models import StandardSectionMapping, Subject, subject,AssignSubject
from apps.hr.models import TimeTableDateRange, TimeTableSchedule, StaffHourSubjectMapping, StaffTeachingHour, TimeTableScheduleParent
from apps.shared.services_shared.common import get_teaching_staff_group_ids
from apps.staffs.models import Staff
from apps.hr.serializers import (PeriodPlanSerializer, PeriodDayMappingSerializer, PeriodSerilaizer,
TimeTableDateRangeSerializer, TimeTableScheduleReadSerializer, TimeTableScheduleParentSerializer,
PeriodDetailedSerializer, TimetableRequestForChangeReadSerializer )
from apps.institutes.models import AcademicYear
from apps.shared.services import SharedService
from django.contrib.contenttypes.models import ContentType
from apps.shared.models.approval import ApproveStatus


# def period_add_old(self, data):
#     validate_periods(self, data)
#     response = SharedService.add_data(self, data['periods'])
#     return response
from apps.tenants.services.middlewares import get_current_db_name

"""
    Nikhil -> Before editing or deleting please check whether it is referred or not
"""


def period_add(self, data):
    response = {'Reason': 'Data Saved Successfully', 'data': {}}
    deletableIds = []
    if 'delete_period_ids' in data and data['delete_period_ids']:
        deletablePeriodIds = data['delete_period_ids']
        tempDeletablePerioddayMapping = PeriodDayMapping.objects.filter(period__in=deletablePeriodIds).values_list('id', flat=True)
        if tempDeletablePerioddayMapping:
            deletableIds += list(tempDeletablePerioddayMapping)
    if 'delete_perioddaymapping_list' in data and data['delete_perioddaymapping_list']:
        deletableIds = data['delete_perioddaymapping_list']
    periodPlandata, periodDataToSave = validate_period_plan(self, data['period_data'], deletableIds)
    with transaction.atomic(using=get_current_db_name()):
        if deletableIds:
            idsToDelete = PeriodDayMapping.objects.filter(id__in=deletableIds, timetable_schedule_period_day_mapping__isnull=True).values_list('id', flat=True)
            if len(idsToDelete) != len(deletableIds):
                deltableIds = set(deletableIds) - set(idsToDelete)
                period_day_mapping = PeriodDayMapping.objects.filter(
                    id__in=deltableIds
                ).values(
                    'period__name', 'day__name', 'start_time', 'end_time'
                )
                deltableIds = ','.join(f"( {x['period__name']} {x['day__name']} {x['start_time']}  {x['end_time']} )" for x in period_day_mapping)
                raise ValidationError(f'{deltableIds} - Data already referred cannot be deleted')
            PeriodDayMapping.objects.filter(id__in=deletableIds).delete()
        if 'delete_period_ids' in data and data['delete_period_ids']:
            Period.objects.filter(id__in=data['delete_period_ids']).delete()
        self.serializer_class = PeriodPlanSerializer
        self.queryset = PeriodPlan
        periodPlanSavedData = SharedService.add_or_update_data(self, [periodPlandata])
        response['data']['id'] = periodPlanSavedData['data']['id']
        for period in periodDataToSave:
            periodData = {'name': period['name'], 'period_plan': periodPlanSavedData['data']['id'], 'is_break': period['is_break']}
            if 'period_id' in period and period['period_id']:
                periodData['id'] = period['period_id']
            self.serializer_class = PeriodSerilaizer
            self.queryset = Period
            periodSavedData = SharedService.add_or_update_data(self, [periodData])
            for periodDay in period['period_list']:
                for day in periodDay['days']:
                    dayId = day['day']
                    periodDayData = {
                        'start_time': periodDay['start_time'],
                        'end_time': periodDay['end_time'], 'day': dayId,
                        'period': periodSavedData['data']['id']
                    }
                    if 'id' in day and day['id']:
                        periodDayData['id'] = day['id']
                    self.serializer_class = PeriodDayMappingSerializer
                    self.queryset = PeriodDayMapping
                    SharedService.add_or_update_data(self, [periodDayData])
    return response

def copy_period_plan_api(self, source_plan_id, new_plan_name=None, new_academic_year=None, standards=[]):
    response = {'Reason': 'Period Plan Copied Successfully', 'data': {}}

    with transaction.atomic(using=get_current_db_name()):
        # Get Source Period Plan
        try:
            source_plan = PeriodPlan.objects.get(id=source_plan_id)
        except PeriodPlan.DoesNotExist:
            raise ValidationError(f"Source Period Plan with id {source_plan_id} does not exist")

        # Prepare New Period Plan Data (Reusing period_add logic)
        periodPlandata = {
            "name": new_plan_name or f"{source_plan.name} - Copy",
            "academic_year": new_academic_year,
            "standard": standards,
            "is_active": source_plan.is_active
        }

        self.serializer_class = PeriodPlanSerializer
        self.queryset = PeriodPlan
        periodPlanSavedData = SharedService.add_or_update_data(self, [periodPlandata])
        new_plan_id = periodPlanSavedData['data']['id']
        response['data']['id'] = new_plan_id

        # Copy Periods and Day Mappings
        source_periods = Period.objects.filter(period_plan=source_plan)
        for period in source_periods:
            periodData = {
                'name': period.name,
                'period_plan': new_plan_id,
                'is_break': period.is_break
            }
            self.serializer_class = PeriodSerilaizer
            self.queryset = Period
            periodSavedData = SharedService.add_or_update_data(self, [periodData])
            new_period_id = periodSavedData['data']['id']

            # Copy Day Mappings
            period_day_mappings = PeriodDayMapping.objects.filter(period=period)
            for mapping in period_day_mappings:
                periodDayData = {
                    'start_time': mapping.start_time,
                    'end_time': mapping.end_time,
                    'day': mapping.day.id,
                    'period': new_period_id
                }
                self.serializer_class = PeriodDayMappingSerializer
                self.queryset = PeriodDayMapping
                SharedService.add_or_update_data(self, [periodDayData])

    return response

def validate_period_plan(self, periodData, deletableIds):
    mandatoryFields = ['name', 'academic_year', 'standard']
    planData = dict(periodData)
    del(planData['periods'])
    SharedService.check_mandatory_field_in_list(mandatoryFields, planData)
    standardIds = planData['standard']
    filterQuery = {'academic_year': planData['academic_year'], 'name': planData['name']}
    excludeQuery = {}
    if 'id' in planData and planData['id']:
        excludeQuery['id'] = planData['id']
    periodPlanData = PeriodPlan.objects.filter(**filterQuery).exclude(**excludeQuery).first()
    existingStandardData = Standard.objects.filter(id__in=standardIds).values('id', 'name')
    existingStandardData = {standard['id'] : standard for standard in existingStandardData}
    # standardList = []
    # for tempPlan in periodPlanForAcademic:
    #     standardList = [int(x) for x in tempPlan['standard'].split(",")]
    if periodPlanData:
        raise ValidationError('Period Plan Name Already Exist for Academic Year')
    for standardId in planData['standard']:
        if standardId not in existingStandardData:
            raise ValidationError('Standard Doesnot exist')
    givenPeriodIds = []
    givenPeriodNames = []
    periodDataToSave = []
    periodNames = []
    periodDayMappingList = []
    tempPeriodDayMappingList = {}
    for period in periodData['periods']:
        dayList = []
        periodDataToSave.append(period)
        if 'id' in period and period['id']:
            givenPeriodIds.append(period['id'])
        elif 'name' in period and period['name']:
            givenPeriodNames.append(period['name'])
        if period['name'] in periodNames:
            raise ValidationError(f'{period["name"]} Period name already exist')
        periodNames.append(period['name'])
        for periodDay in period['period_list']:
            if 'id' in periodDay and periodDay['id']:
                periodDayMappingList.append(periodDay['id'])
            for day in periodDay['days']:
                dayId = day['day']
                if dayId not in tempPeriodDayMappingList:
                    tempPeriodDayMappingList[dayId] = []
                tempPeriodDayMappingList[dayId].append(periodDay)
                if dayId in dayList:
                    dayObj = Day.objects.filter(id=dayId).first()
                    raise ValidationError(f'Duplicate Day exist for the {dayObj.name}')
                dayList.append(dayId)
    if 'id' in planData and planData['id']:
        existingPeriodMappingData = PeriodDayMapping.objects.filter(period__period_plan__id=planData['id']).exclude(
            id__in=periodDayMappingList).values()
        for existingData in existingPeriodMappingData:
            if existingData['day_id'] not in tempPeriodDayMappingList:
                tempPeriodDayMappingList[existingData['day_id']] = []
            existingData['start_time'] = existingData['start_time'].strftime('%H:%M:%S')
            existingData['end_time'] = existingData['end_time'].strftime('%H:%M:%S')
            tempPeriodDayMappingList[existingData['day_id']].append(existingData)
    validate_date_overlaps(tempPeriodDayMappingList)
    planData['standard'] = ','.join(str(e) for e in planData['standard'])
    return planData, periodDataToSave

def validate_date_overlaps(data):
    for dayId in data:
        rowData = data[dayId]
        for index in range(0,len(rowData)):
            for index1 in range(index+1, len(rowData)):
                if ((rowData[index]['start_time'] < rowData[index1]['start_time'] < rowData[index][
                    'end_time'])
                        or (rowData[index]['start_time'] < rowData[index1]['end_time'] < rowData[index][
                            'end_time'])):
                    raise ValidationError(
                        f"Given date {rowData[index1]['start_time']} to {rowData[index1]['end_time']} range already exist range {rowData[index]['start_time']} - {rowData[index]['end_time']}")
                if ((rowData[index]['start_time'] > rowData[index1]['start_time'] and rowData[index][
                'start_time'] < rowData[index1]['end_time'])
                    or (rowData[index]['end_time'] > rowData[index1]['start_time'] and rowData[index][
                        'end_time'] < rowData[index1]['end_time'])):
                    raise ValidationError(
                    f"'Given date {rowData[index1]['start_time']} to {rowData[index1]['end_time']} overlaps the current range {rowData[index]['start_time']} - {rowData[index]['end_time']}")

def period_delete(self, request):
    if TimeTableScheduleParent.objects.filter(period_plan_id=self.kwargs['pk']):
        raise ValidationError('Data Referred Not able to delete')
    Period.objects.filter(period_plan=self.kwargs['pk']).delete()
    self.get_queryset().filter(id=self.kwargs['pk']).delete()
    return {'Reason': 'Data deleted successfully'}


def timetable_add(self, data):
    validate_timetable_data(self, data)
    response = SharedService.add_data(self, data, False)
    return response


def timetable_update(self, data, pk):
    validate_timetable_data(self, data, pk)
    response = SharedService.update_data(self, data)
    return response


def validate_timetable_data(self, data, pk=None):
    dateRow = AcademicYear.objects.filter(id=data['academic_year']).values()
    existing_timetable_range = TimeTableDateRange.objects.filter(academic_year=data['academic_year']).values()
    for existing in existing_timetable_range:
        if existing['start_date'].strftime('%Y-%m-%d') <= data['start_date'] <= existing['end_date'].strftime('%Y-%m-%d'):
            raise ValidationError(f'Date overlaps {existing["start_date"]} - {existing["end_date"]}')
        elif existing['start_date'].strftime('%Y-%m-%d') <= data['end_date'] <= existing['end_date'].strftime('%Y-%m-%d'):
            raise ValidationError(f'Date overlaps {existing["start_date"]} - {existing["end_date"]}')
        elif data['start_date'] <= existing['start_date'].strftime('%Y-%m-%d') <= data['end_date']:
            raise ValidationError(f'Date overlaps {existing["start_date"]} - {existing["end_date"]}')
        elif data['start_date'] <= existing['end_date'].strftime('%Y-%m-%d') <= data['end_date']:
            raise ValidationError(f'Date overlaps {existing["start_date"]} - {existing["end_date"]}')
    if dateRow:
        dateRow = dateRow[0]
        if data['start_date'] > data['end_date']:
            raise ValidationError('Start Date is greater than End date')
        elif SharedService.days_between(data['start_date'], data['end_date']) < 6:
            raise ValidationError('Given date range should me minimum 7days')
        elif (((dateRow['start_date'].strftime('%Y-%m-%d') <= data['start_date'] <= dateRow[
            'end_date'].strftime('%Y-%m-%d'))
               and (dateRow['start_date'].strftime('%Y-%m-%d') <= data['end_date'] <= dateRow[
                    'end_date'].strftime('%Y-%m-%d')))):
            if pk:  # for update
                existingDateList = self.get_queryset().filter(~Q(id=pk),
                                                              academic_year=data['academic_year']).values()
            else:
                existingDateList = self.get_queryset().filter(academic_year=data['academic_year']).values()
            for dateRange in existingDateList:
                if ((dateRange['start_date'].strftime('%Y-%m-%d') > data['start_date'] and dateRange[
                    'start_date'].strftime('%Y-%m-%d') < data['end_date'])
                        or (dateRange['end_date'].strftime('%Y-%m-%d') > data['start_date'] and dateRange[
                            'end_date'].strftime('%Y-%m-%d') < data['end_date'])):
                    raise ValidationError(
                        f"Given Date Range Already exist in range {dateRange['start_date'].strftime('%d-%m-%Y')} - {dateRange['end_date'].strftime('%d-%m-%Y')}")
        else:
            raise ValidationError('Given date range doesnot exist in the given academic year')
    else:
        raise ValidationError('Invalid Academic year')


def get_date_range(self, request):
    filter_query = {'is_active': True}
    if isinstance(request, dict):
        if 'academic_year' in request:
            filter_query['academic_year'] = request['academic_year']
    else:
        if request.GET.get('academic_year'):
            filter_query['academic_year'] = request.GET.get('academic_year')
        if request.GET.get('date_range'):
            filter_query['id'] = request.GET.get('date_range')
    try:
        daterange = self.get_queryset().filter(**filter_query).values()
    except:
        daterange = TimeTableDateRange.objects.filter(**filter_query).values()
    date_range_ids = [i['id'] for i in daterange]
    standard_section_ids = []
    schedule_data_in_key_value = {}
    schedule_data = TimeTableSchedule.objects.filter(time_table_schedule_parent__date_range__in=date_range_ids).order_by(
        'time_table_schedule_parent__standard_section').values(
            'time_table_schedule_parent__date_range',
            'time_table_schedule_parent__standard_section',
            'time_table_schedule_parent', 'time_table_schedule_parent__period_plan'
        ).distinct()
    for schedule in schedule_data:
        standard_section_ids.append(schedule['time_table_schedule_parent__standard_section'])
        temp = {
                    'time_table_schedule_parent': schedule['time_table_schedule_parent'],
                    'stand_sec_id': schedule['time_table_schedule_parent__standard_section'],
                    'time_table_schedule_parent__period_plan': schedule['time_table_schedule_parent__period_plan']

                }
        if schedule['time_table_schedule_parent__date_range'] in schedule_data_in_key_value:
            schedule_data_in_key_value[schedule['time_table_schedule_parent__date_range']]['date_ranges'].append(
                temp
            )
        else:
            schedule_data_in_key_value[schedule['time_table_schedule_parent__date_range']] = {'date_ranges': []}
            schedule_data_in_key_value[schedule['time_table_schedule_parent__date_range']]['date_ranges'].append(
                temp
            )
    standard_section_list = StandardSectionMapping.objects.filter(id__in=standard_section_ids).values('standard',
                                                                                                  'standard__name',
                                                                                                  'section',
                                                                                                  'section__name',
                                                                                                  'id')
    standard_section_list = {ssldata['id']: ssldata for ssldata in standard_section_list}
    temp_data = {}
    for date_range_id, stanSecData in schedule_data_in_key_value.items():
        for stand_sec_obj in stanSecData['date_ranges']:
            stand_sec_id = stand_sec_obj['stand_sec_id']
            sec_data = {'section': standard_section_list[stand_sec_id]['section'],
                       'section_name': standard_section_list[stand_sec_id]['section__name'],
                       'standard_section': standard_section_list[stand_sec_id]['id'],
                       'time_table_schedule_parent': stand_sec_obj['time_table_schedule_parent'],
                       'time_table_schedule_parent__period_plan': stand_sec_obj['time_table_schedule_parent__period_plan']
                       }
            stand_data = {'standard': standard_section_list[stand_sec_id]['standard'],
                         'standard_name': standard_section_list[stand_sec_id]['standard__name'],
                         'section_list': [sec_data]}
            if date_range_id in temp_data:
                if standard_section_list[stand_sec_id]['standard'] in temp_data[date_range_id]:
                    temp_data[date_range_id][standard_section_list[stand_sec_id]['standard']]['section_list'].append(
                        sec_data)
                else:
                    temp_data[date_range_id][standard_section_list[stand_sec_id]['standard']] = stand_data
            else:
                temp_data[date_range_id] = {}
                temp_data[date_range_id][standard_section_list[stand_sec_id]['standard']] = stand_data
    try:
        response = SharedService.read_data(self, True)
    except:
        query = TimeTableDateRange.objects.filter(**filter_query)
        serializer  = TimeTableDateRangeSerializer(query,many=True)
        response = {'data':serializer.data}
    for index, date_range_data in enumerate(response['data']):
        if date_range_data['id'] in temp_data:
            for temp_index in temp_data[date_range_data['id']]:
                if 'assigned_classes' in response['data'][index]:
                    response['data'][index]['assigned_classes'].append(temp_data[date_range_data['id']][temp_index])
                else:
                    response['data'][index]['assigned_classes'] = []
                    response['data'][index]['assigned_classes'].append(temp_data[date_range_data['id']][temp_index])
    return response

def timetable_schedule_add(self, data):
    data = data['assign_timetable']
    response = {}
    is_only_delete = False
    if 'onlydelete' in data and data['onlydelete']:
        is_only_delete = True
    if not is_only_delete and ('schedule_parent' not in data or  not data['schedule_parent']):
        schedule_parent = {
            'date_range': data['date_range'],
            'period_plan': data['period_plan'],
            'standard_section': data['standard_section']
        }
        validate_timetable_schedule_parent(schedule_parent)
        serializer = TimeTableScheduleParentSerializer(data=schedule_parent)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        data['schedule_parent'] = serializer.data['id']
    with transaction.atomic(using=get_current_db_name()):
        if is_only_delete:
            return SharedService.soft_delete_list_data(self, data['deletable_ids'])
        if data['deletable_ids']:
            SharedService.soft_delete_list_data(self, data['deletable_ids'])
        try:
            data_to_save = validate_schedule(self, data)
        except Exception as e:
            raise e
        if not data_to_save:
            raise ValidationError('Nothing to save')
        response = SharedService.add_or_update_data(self, data_to_save)
        response['schedule_parent'] = data['schedule_parent']
    return response

def validate_schedule(self, data):
    if not data['schedule_parent'] and not data['period_plan'] and not data['standard_section']:
        raise ValidationError('date range, period_plan and standard_section are mandatory')
    if not data['staff'] and not data['subject']:
        raise ValidationError('staff / subject any one of the value should be provided')
    schedule_parent_data = TimeTableScheduleParent.objects.get(id=data['schedule_parent'])
    deletable_ids = data['deletable_ids']
    given_ids = []
    period_day_mapping_list = []
    existing_period_mapping_list = []
    staff_subject_ids = {}
    data_to_save = []
    ignore_ids = []
    check_period_day_mapping_sub_in_given = {}
    exsiting_staff_period_mapping = {}
    given_period_day_mapping_ids = []
    staff_max_hour = ''
    time_format = "%H:%M:%S"
    total_assigned_minute = 0
    date_range_data = TimeTableDateRange.objects.filter(id=schedule_parent_data.date_range_id).first()
    academic_year = date_range_data.academic_year_id
    period_plan = schedule_parent_data.period_plan_id
    period_day_mappings = PeriodDayMapping.objects.filter(period__period_plan=period_plan).values()
    for period_data in period_day_mappings:
        existing_period_mapping_list.append(period_data['id'])
    standard_section = str(schedule_parent_data.standard_section_id)
    for subject_staff in data['subject_staff']:
        if 'id' in subject_staff and subject_staff['id']:
            given_ids.append(subject_staff['id'])
        given_period_day_mapping_ids.append(subject_staff['period_day_mapping'])
    given_period_day_mapping_data = PeriodDayMapping.objects.filter(id__in=given_period_day_mapping_ids).values('id', 'start_time', 'end_time')
    given_period_day_mapping_data = {e['id']:e for e in given_period_day_mapping_data}
    if data['staff']:
        staff_data = Staff.objects.filter(id=data['staff']).first()
        group_id = staff_data.users.groups.first().id
        staff_id = staff_data.id
        staff_details = StaffTeachingHour.objects.filter(academic_year=academic_year, staff=staff_id).values(
            'max_hour', 'assigned_subjects__subject', 'staff', 'staff__first_name', 'staff__middle_name', 'staff__last_name'
        )
        for staff_data in staff_details:
            staff_max_hour = staff_data['max_hour']
            staff_subject_ids[staff_data['assigned_subjects__subject']] = {}
        if group_id not in get_teaching_staff_group_ids(self):
            raise ValidationError('Staff is not in teaching group')
        ignore_ids = given_ids+deletable_ids
    existing_schedule_data = TimeTableSchedule.objects.filter(is_active=True, time_table_schedule_parent=data['schedule_parent'], staff=data['staff']).exclude(
        id__in=ignore_ids
    ).values(
    'id', 'staff_id', 'period_day_mapping_id', 'period_day_mapping__start_time', 'period_day_mapping__end_time', 'time_table_schedule_parent',
    'period_day_mapping'
    )
    exisitng_period_day_mapping_ids = []
    for existing_schedule in existing_schedule_data:
        exisitng_period_day_mapping_ids.append(existing_schedule['period_day_mapping_id'])
        key = str(existing_schedule['period_day_mapping_id'])
        exsiting_staff_period_mapping[key] = existing_schedule
        start_time = datetime.datetime.strptime(existing_schedule['period_day_mapping__start_time'].strftime(time_format), time_format)
        end_time = datetime.datetime.strptime(existing_schedule['period_day_mapping__end_time'].strftime(time_format), time_format)
        minutes = 0
        minutes = round((end_time - start_time).total_seconds() / 60)
        total_assigned_minute += minutes
    date_over_lap_check(exisitng_period_day_mapping_ids, given_period_day_mapping_data.keys(), data['staff'],True)
    existing_section_data = {str(e['time_table_schedule_parent'])+'_'+str(e['period_day_mapping']): e for e in existing_schedule_data}
    for subject_staff_mapping in data['subject_staff']:
        period_day_mapping_id = subject_staff_mapping['period_day_mapping']
        if period_day_mapping_id in check_period_day_mapping_sub_in_given:
            raise ValidationError('Duplicate in given data')
        check_period_day_mapping_sub_in_given[period_day_mapping_id] = ''
        period_day_mapping_list.append(int(period_day_mapping_id))
        temp_key = str(period_day_mapping_id)
        section_sub_key = str(standard_section) + '_' + str(period_day_mapping_id)
        if section_sub_key in existing_section_data:
            standard_section = StandardSectionMapping.objects.get(id=standard_section)
            period_mapping_obj = PeriodDayMapping.objects.get(id=period_day_mapping_id)
            raise ValidationError(f'Period - {period_mapping_obj.period.name} trying to add same period to standard - {standard_section.standard.name} - Section {standardSection.section.name}')
        if data['subject'] and data['staff'] and int(data['subject']) not in staff_subject_ids:
            subject_name = Subject.objects.get(id=data['subject'])
            raise ValidationError(f'Subject {subject_name.name} is not assigned to staff')
        temp_data = {
            'time_table_schedule_parent': data['schedule_parent'], 'period_day_mapping': period_day_mapping_id,
            'staff': data['staff'], 'standard_section': standard_section,
            'subject': data['subject']
        }
        if temp_key in exsiting_staff_period_mapping and exsiting_staff_period_mapping[temp_key]['id'] not in deletable_ids:
            temp_data['id'] = exsiting_staff_period_mapping[temp_key]['id']
        if 'id' in subject_staff_mapping and subject_staff_mapping['id']:
            temp_data['id'] = subject_staff_mapping['id']
        data_to_save.append(temp_data)
    if set(period_day_mapping_list) - set(existing_period_mapping_list):
        raise ValidationError(f'The given periods are not found existing list {",".join(list(set(period_day_mapping_list) - set(existing_period_mapping_list)))}')
    period_day_mapping_data = PeriodDayMapping.objects.filter(id__in=period_day_mapping_list).values('start_time', 'end_time', 'period', 'day', 'period__period_plan')
    if staff_max_hour == '':
        staff_total_minutes = 0
    else:
        staff_total_minutes = convert_time_to_minutes(staff_max_hour)
    for period_day_data in period_day_mapping_data:
        if period_day_data['period__period_plan'] != period_plan:
            raise ValidationError( 'Trying to insert other plans data ')
        start_time = datetime.datetime.strptime(period_day_data['start_time'].strftime(time_format), time_format)
        end_time = datetime.datetime.strptime(period_day_data['end_time'].strftime(time_format), time_format)
        minutes = 0
        minutes = round((end_time - start_time).total_seconds() / 60)
        total_assigned_minute += minutes
        if data['staff'] and total_assigned_minute > staff_total_minutes:
            raise ValidationError(f"The max hour for staff is {str(staff_max_hour)} /HH:MM. Trying to assign more than  that")
    return data_to_save

def convert_time_to_minutes(timeString):
    try:
        timeString = timeString.split(':')
        totalminutes = int(timeString[0]) * 60 + int(timeString[1])
        return totalminutes
    except:
        raise ValidationError('Invalid date string')

def validate_timetable_schedule_parent(data):
    periodPlanObj = PeriodPlan.objects.get(id=data['period_plan'])
    planStandardIds = periodPlanObj.standard.split(',')
    dateRangeObj = TimeTableDateRange.objects.get(id=data['date_range'])
    standardSecObj = StandardSectionMapping.objects.get(id=data['standard_section'])
    if periodPlanObj.academic_year != dateRangeObj.academic_year:
        raise ValidationError('Date range and period plan date academic year are different')
    if str(standardSecObj.standard_id) not in planStandardIds:
        raise ValidationError('Standard_section is not in the plan')


def get_staff_assigned_timetable(self, request):
    if not self.request.GET.get('date_range') or not self.request.GET.get('staff'):
        raise ValidationError('Date range and staff is mandatory')
    filter_query = {}
    given_day_id = None
    alternate_teacher_data = {}
    if self.request.GET.get('alternate_teacher_fordate'):
        alternate_teacher_fordate = self.request.GET.get('alternate_teacher_fordate')
        alternate_teacher_data = {t['timetable_schedule_id']: t for t in TimetableRequestForChange.objects.filter(
            fordate=alternate_teacher_fordate
        ).values('id', 'fordate', 'staff__first_name', 'timetable_schedule_id',
        'staff__middle_name', 'staff__last_name', 'staff', 'reason', 'timetable_schedule__period_day_mapping', subject_name=F('subject__name'))}
        selected_day_name = SharedService.get_day_for_date(alternate_teacher_fordate)
        given_day_id = Day.objects.get(name=selected_day_name).id
    date_range = TimeTableDateRange.objects.get(id=self.request.GET.get('date_range'))
    filter_query['academic_year'] = date_range.academic_year_id
    self.queryset = PeriodPlan.objects.filter(**filter_query)
    self.serializer_class = PeriodDetailedSerializer
    period_response = SharedService.read_data(self, True)['data']
    queryset = TimeTableSchedule.objects.filter(is_active=True, staff=self.request.GET.get('staff'),
                time_table_schedule_parent__date_range=self.request.GET.get('date_range'))
    serializer = TimeTableScheduleReadSerializer(queryset, many=True)
    perioda_day_staff_mapping = {period['period_day_mapping']:period for period in serializer.data}
    staff_mapped_data = {}
    for period_data in period_response:
        if 'period_period_plan' in period_data:
            for period_plan in period_data['period_period_plan']:
                for period_day_mapping in period_plan['perioddaymapping_period']:
                    if period_day_mapping['id'] in perioda_day_staff_mapping:
                        staff_data = perioda_day_staff_mapping[period_day_mapping['id']]
                        if staff_data['day'] not in staff_mapped_data:
                            staff_mapped_data[staff_data['day']] = {
                                'day': staff_data['day'],
                                'day_name': staff_data['day_name'],
                                'day_list': []
                            }
                        if str(staff_data['day']) == str(given_day_id) and staff_data['id'] in alternate_teacher_data:
                            staff_data['assigned_data'] = alternate_teacher_data[staff_data['id']]
                        staff_mapped_data[staff_data['day']]['day_list'].append(staff_data)
    staff_mapped_data = staff_mapped_data.values()
    return {'data': {'staffData': staff_mapped_data}}


def read_scheduled_data(self, request, extra_variables={}):
    request_change_data = {}
    alternate_teacher_fordate=None
    if request:
        alternate_teacher_fordate = request.GET.get('alternate_teacher_fordate')
        time_table_schedule_parent = request.GET.get('time_table_schedule_parent')
    if 'time_table_schedule_parent' in extra_variables:
        time_table_schedule_parent = int(extra_variables['time_table_schedule_parent'])
    if 'alternate_teacher_fordate' in extra_variables:
        alternate_teacher_fordate = extra_variables['alternate_teacher_fordate']
    if not time_table_schedule_parent and alternate_teacher_fordate:
        fordate = alternate_teacher_fordate
        academic_year = AcademicYear.get_academic_year_for_date(self, fordate)
        if not academic_year:
            raise ValidationError('Invalid date')
        date_range_data = TimeTableScheduleParent.objects.filter(date_range__academic_year=academic_year.id).values(
            'id', 'date_range__start_date', 'date_range__end_date'
        )
        schedule_parent_id = None
        for date_range in date_range_data:
            if date_range['date_range__start_date'].strftime('%Y-%m-%d') <= fordate <= date_range['date_range__end_date'].strftime('%Y-%m-%d'):
                schedule_parent_id = date_range['id']
                continue
        if not schedule_parent_id:
            raise ValidationError('time_table_schedule_parent are mandatory')
    elif time_table_schedule_parent:
        schedule_parent_id = time_table_schedule_parent
    else:
        raise ValidationError('No Timetable present the academic year')
    if alternate_teacher_fordate:
        for_date = alternate_teacher_fordate
        temp = TimetableRequestForChange.objects.filter(fordate=for_date).values('id', 'fordate', 'staff__first_name',
        'staff__middle_name', 'staff__last_name', 'staff', 'reason', 'timetable_schedule__period_day_mapping', subject_name=F('subject__name') )
        for t_row in temp:
            if t_row['timetable_schedule__period_day_mapping'] not in request_change_data:
                request_change_data[t_row['timetable_schedule__period_day_mapping']] = t_row
    schedule_parent_data = TimeTableScheduleParent.objects.get(id=schedule_parent_id)
    queryset = PeriodPlan.objects.get(id=schedule_parent_data.period_plan_id)
    period_response = PeriodDetailedSerializer(queryset, many=False).data
    schedulequeryset = TimeTableSchedule.objects.filter(
        is_active=True, time_table_schedule_parent=schedule_parent_data.id
    )
    serializer = TimeTableScheduleReadSerializer(schedulequeryset, many=True)
    period_day_section_mapping = {period['period_day_mapping']:period for period in serializer.data}
    period_response['day_list'] = Day.objects.filter(is_student_working_day=True).values()
    if 'period_period_plan' in period_response:
        for period_plan in period_response['period_period_plan']:
            result_period_plan = []
            for period_day_mapping in period_plan['perioddaymapping_period']:
                if alternate_teacher_fordate:
                    given_day = SharedService.get_day_for_date(alternate_teacher_fordate)
                    if str(given_day) != str(period_day_mapping['day_name']):
                        continue
                if period_day_mapping['id'] in request_change_data:
                    period_day_mapping['alternateTeacher'] = request_change_data[period_day_mapping['id']]
                if period_day_mapping['id'] in period_day_section_mapping:
                    period_day_mapping['assignedData'] = period_day_section_mapping[period_day_mapping['id']]
                result_period_plan.append(period_day_mapping)
            period_plan['perioddaymapping_period'] = result_period_plan
    return {'data': period_response}

def get_student_timetable_for_date(self, request, for_date, standard_section):
    timetable_parent = TimeTableScheduleParent.objects.filter(date_range__start_date__lte=for_date,
        date_range__end_date__gte=for_date,standard_section=standard_section
    ).values()
    if timetable_parent:
        timetable_parent = timetable_parent[0]['id']
        return read_scheduled_data(self, request, {'time_table_schedule_parent': timetable_parent, 'alternate_teacher_fordate': for_date})
    return None
    

def date_over_lap_check(existingPeriodMappingIds, givenPeriodMappingIds, staffId, raiseError=False):
    tempIds = list(set(existingPeriodMappingIds + list(givenPeriodMappingIds)))
    periodMappingData = PeriodDayMapping.objects.filter(id__in=tempIds).values(
        'start_time', 'end_time', 'day_id', 'day__name', 'period__name', 'id'
    )
    periodDayMapping = {}
    periodIdDataMapping = {}
    for period in periodMappingData:
        if period['day_id'] not in periodDayMapping:
            periodDayMapping[period['day_id']] = []
        periodIdDataMapping[period['id']] = period
        periodDayMapping[period['day_id']].append(period)
    duplicateDataList = {}
    for dayId in periodDayMapping:
        for index in range(0, len(periodDayMapping[dayId])):
            tableData = periodDayMapping[dayId][index]
            duplicateDataList[tableData['id']] = []
            for index1 in range(0, len(periodDayMapping[dayId])):
                if index == index1:
                    continue
                data = periodDayMapping[dayId][index1]
                if ((tableData['start_time'].strftime('%H:%M-%S') < data['start_time'].strftime('%H:%M-%S') < tableData['end_time'].strftime(
                                '%H:%M-%S'))
                                or (tableData['start_time'].strftime('%H:%M-%S') < data['end_time'].strftime('%H:%M-%S') < tableData[
                                    'end_time'].strftime('%H:%M-%S'))):
                    duplicateDataList[tableData['id']].append(data['id'])
                elif ((tableData['start_time'].strftime('%H:%M-%S') > data['start_time'].strftime('%H:%M-%S') and tableData[
                        'start_time'].strftime('%H:%M-%S') < data['end_time'].strftime('%H:%M-%S'))
                            or (tableData['end_time'].strftime('%H:%M-%S') > data['start_time'].strftime('%H:%M-%S') and tableData[
                                'end_time'].strftime('%H:%M-%S') < data['end_time'].strftime('%H:%M-%S'))):
                    duplicateDataList[tableData['id']].append(data['id'])
    errorMessage = ''
    for periodDayMappingId in duplicateDataList:
        if duplicateDataList[periodDayMappingId]:
            scheduleDetail = TimeTableSchedule.objects.filter(staff=staffId, period_day_mapping=periodDayMappingId).values(
                'time_table_schedule_parent__standard_section__section__name',
                'time_table_schedule_parent__standard_section__standard__name'
            )
            errorMessage += ' Standard '+scheduleDetail[0]['time_table_schedule_parent__standard_section__standard__name']
            errorMessage += ' Section '+scheduleDetail[0]['time_table_schedule_parent__standard_section__section__name']
            errorMessage += ' start time : '+periodIdDataMapping[periodDayMappingId]['start_time'].strftime('%H:%M-%S')
            errorMessage += ' end time : '+periodIdDataMapping[periodDayMappingId]['end_time'].strftime('%H:%M-%S')
    if errorMessage and raiseError:
        errorMessage = 'Staff already assigned to '+ errorMessage
        raise ValidationError(errorMessage)
    return duplicateDataList

def add_request_change(self, request):
    data = request.data['request_change']
    validate_request_change(data)
    return SharedService.add_or_update_data(self, [data])

def validate_request_change(data):
    scheduleData = TimeTableSchedule.objects.filter(id=data['timetable_schedule']).first()
    if str(scheduleData.staff_id) == str(data['staff']):
        raise ValidationError('Staff and alternative teacher both are same')
    filterQuery = {'fordate': data['fordate'], 'timetable_schedule_id': data['timetable_schedule'] }
    contentId = ContentType.objects.get(model='timetablerequestforchange').id
    rejectedIds = ApproveStatus.objects.filter(content_type_id=contentId,
        approval_status=2).values_list('id', flat=True)
    queryset = TimetableRequestForChange.objects.filter(**filterQuery).exclude(
        id__in=list(rejectedIds)
    ).values()
    if queryset:
        raise ValidationError('Alternate teacher already exist for the schedule')
    if 'id' in data and data['id']:
        queryset.exclude(id=data['id'])


def get_request_change_data(self, request):
    self.serializer_class = TimetableRequestForChangeReadSerializer
    queryset = self.filter_queryset(self.get_queryset()).filter(timetable_schedule__time_table_schedule_parent__date_range__academic_year=request.GET.get('academic_year'))
    if request.GET.get('fordate'):
        queryset = queryset.filter(fordate=request.GET.get('fordate'))
    if request.GET.get('date_range'):
        timetablescheduleIds = TimeTableSchedule.objects.filter(
            time_table_schedule_parent__date_range=request.GET.get('date_range')
        ).values_list('id', flat=True)
        queryset = queryset.filter(timetable_schedule__in=list(timetablescheduleIds))
    if request.GET.get('staff'):
        queryset = queryset.filter(staff=request.GET.get('staff'))
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
    ids = []
    contentId = ContentType.objects.get(model='timetablerequestforchange').id
    for temp in data:
        ids.append(temp['id'])
    approvalData = ApproveStatus.objects.filter(object_id__in=ids,content_type=contentId).values()
    tempApprovalData = {a[0]: a[1] for a in ApproveStatus.ApprovalStatus}
    approvalData = {t['object_id']:t for t in approvalData}
    for temp in data:
        temp['approval_data'] = 'Unapproved'
        temp['approval'] = 1
        if temp['id'] in approvalData:
            temp['approval_data'] = tempApprovalData[str(approvalData[temp['id']]['approval_status'])]
            temp['approval'] = approvalData[temp['id']]['approval_status']
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


def get_staff_timetable_for_daterange(self, date_range_id, staff_id=None):
    if not staff_id and not self.request.user.staff:
        raise ValidationError('Staff id is mandaotry')
    elif not staff_id:
        staff_id = self.request.user.staff.id
    schedulequeryset = self.get_queryset().filter(time_table_schedule_parent__date_range=date_range_id, staff=staff_id)
    serializer = TimeTableScheduleReadSerializer(schedulequeryset, many=True)
    day_list = Day.objects.filter(is_active=True,  is_teacher_working_day=True).values()
    return {'data': {'assigned_data': serializer.data, 'days': day_list}}