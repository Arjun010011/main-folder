from datetime import datetime, timedelta, date

from django.db import transaction
from django.db.models.functions import Concat
from django.db.models import Value as V

from apps.hr.models import ShiftSchedule, AssignShift
from apps.hr.serializers import ShiftSchedulesSerializer
from apps.institutes.models import FinancialYear
from apps.notification.services.notification_service import send_notification
from apps.shared.services import NotificationBodyTemplate, SharedService
from rest_framework import exceptions

from apps.staffs.models import Staff
from apps.staffs.serializers import StaffGetNameSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User


def shift_add_or_update(self, data):
    postData = convert_to_shift_format(self, data)
    validate_add_shift(self, postData)
    with transaction.atomic(using=get_current_db_name()):
        newData = []
        if 'deletable_ids' in data and data['deletable_ids']:
            ShiftSchedule.objects.filter(id__in=data['deletable_ids']).update(is_active=False)
        response = SharedService.add_or_update_data(self, [postData['shift_details']])
        for index, shiftScheduleData in enumerate(postData['shift_schedules']):
            shiftScheduleData['shift'] = response['data']['id']
            if 'id' in shiftScheduleData:
                queryset = self.get_queryset().filter(id=response['data']['id'])
                if not queryset.filter(assign_shift_shift__isnull=True):
                    raise exceptions.ValidationError('Shift Already assigned not able to edit')
                instance = ShiftSchedule.objects.get(id=shiftScheduleData['id'])
                serializer = ShiftSchedulesSerializer(instance=instance, data=shiftScheduleData, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                newData.append(shiftScheduleData)
        if newData:
            serializer = ShiftSchedulesSerializer(data=newData, many=True, allow_empty=False)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return response


def convert_to_shift_format(self, data):
    tempData = {'shift_details': data['shift_details'], 'shift_schedules': []}
    for scheduleData in data['shift_schedules']:
        for dayData in scheduleData['working_days']:
            tempDict = {'day': dayData['day']}
            if 'id' in dayData:
                tempDict['id'] = dayData['id']
            tempDict['first_session_end_time'] = scheduleData['first_session_end_time']
            tempDict['second_session_start_time'] = scheduleData['second_session_start_time']
            tempDict['start_time'] = scheduleData['start_time']
            tempDict['end_time'] = scheduleData['end_time']
            tempDict['buffer_time'] = scheduleData['buffer_time']
            tempDict['late_buffer_time'] = scheduleData['late_buffer_time']
            tempData['shift_schedules'].append(tempDict)
    return tempData


def validate_add_shift(self, data):
    daysDuplicate = []
    if (data['shift_details']['late_attempt_per_month'] and not data['shift_details']['deduction_days']) or \
            (not data['shift_details']['late_attempt_per_month'] and data['shift_details']['deduction_days']):
        raise exceptions.ValidationError('Please fill lateattempt and deduction days')
    for shiftData in data['shift_schedules']:
        startTime = shiftData['start_time']
        endTime = shiftData['end_time']
        firstSes = shiftData['first_session_end_time']
        secondSes = shiftData['second_session_start_time']
        lateBuffer = shiftData['late_buffer_time']
        bufferTime = shiftData['buffer_time']
        if startTime == endTime:
            raise exceptions.ValidationError('Start time and endtime should not be equal')
        if firstSes and not secondSes:
            raise exceptions.ValidationError(
                'When First session end time is specified second session start date is mandatory')
        # if lateBuffer and not bufferTime:
        #     raise exceptions.ValidationError('When late buffer time is given. Buffer time is mandatory')
        if bufferTime and lateBuffer and bufferTime <= lateBuffer:
            raise exceptions.ValidationError('Late buffer time should be less than buffer time')
        if firstSes:
            if not SharedService.time_is_between(self, firstSes, startTime, endTime):
                raise exceptions.ValidationError(
                    'Shift first session end time should be between shift start time and shift end time')
            if secondSes and not SharedService.time_is_between(self, secondSes, startTime, endTime):
                raise exceptions.ValidationError(
                    'Shift second session start time should be between shift start time and shift end time')
            if secondSes and not SharedService.time_is_between(self, firstSes, startTime, secondSes):
                raise exceptions.ValidationError(
                    'First session should be between start time and secondSession start time')
            if SharedService.get_time_string_difference(startTime, firstSes) < float(shiftData['buffer_time']):
                raise exceptions.ValidationError(
                    'Buffer duration should be below shift start time and first session end time')
            if SharedService.get_time_string_difference(secondSes, endTime) < float(shiftData['buffer_time']):
                raise exceptions.ValidationError(
                    'Buffer duration should be below shift end time and second session start time')
            if SharedService.get_time_string_difference(startTime, firstSes) < float(lateBuffer):
                raise exceptions.ValidationError(
                    'Late Buffer duration should be below shift start time and first session end time')
            if secondSes and SharedService.get_time_string_difference(secondSes, endTime) < float(lateBuffer):
                raise exceptions.ValidationError(
                    'Late Buffer duration should be below shift end time and second session start time')
        else:
            if SharedService.get_time_string_difference(startTime, endTime) < float(bufferTime):
                raise exceptions.ValidationError('Buffer duration should be below shift start time and shift end time')
            if SharedService.get_time_string_difference(startTime, endTime) < float(lateBuffer):
                raise exceptions.ValidationError(
                    'Late Buffer duration should be below shift start time and first session end time')
        if shiftData['day'] in daysDuplicate:
            raise exceptions.ValidationError('Duplicate Day found')
        daysDuplicate.append(shiftData['day'])


def assign_shift_add(self, data):
    dataToSave = validate_assign_shift(self, data)
    response = SharedService.add_data(self, dataToSave)
    SharedService.custom_thread(assign_shift_add_notification, self, data)
    return response


def assign_shift_add_notification(self, data, api_name='assignshift_create'):
    users = User.objects.filter(staff__in=data['staffids'])
    shifts = ShiftSchedule.objects.filter(shift=data['shift'])
    shift = shifts.first()
    customized_list = list()
    day_details_email = ''
    day_details_sms_push = ''
    for shift in shifts:
        if shift.day.is_teacher_working_day and shift.day.is_active:
            day_details_email += f'<br/> Day: {shift.day.name} | Time: {shift.start_time} - {shift.end_time}<br/>'
            day_details_sms_push += f'\n Day: {shift.day.name} \n Time: {shift.start_time} - {shift.end_time}\n'
    notification_obj = NotificationBodyTemplate(api_name)
    temp = {
        'staff_name': '',
        'shift_name': shift.shift.name,
        'fromdate' : SharedService.date_to_obj(data["fromdate"]).strftime("%d/%m/%Y"),
        'todate': SharedService.date_to_obj(data["todate"]).strftime("%d/%m/%Y"),
        'day_details': day_details_sms_push
    }
    for staff in users:
        temp['staff_name'] = staff.staff.first_name
        if staff.staff.email:
            temp['day_details'] = day_details_email
            body_email = notification_obj.select_template('email', temp)
            customized_list.append(
                {'email': staff.staff.email, 'user_id': staff.id, 'email_subject': None, 'email_body': body_email,'email_notification':1}
            )
        if staff.staff.mobile_num:
            temp['day_details'] = day_details_sms_push
            body_sms = notification_obj.select_template('sms', temp)
            customized_list.append(
                {'mobile_number': staff.staff.mobile_num, 'user_id': staff.id, 'sms_body': body_sms, 'sms_notification': 1}
            )
        temp['day_details'] = day_details_sms_push
        body_push = notification_obj.select_template('push', temp)
        customized_list.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': staff.id, 'extra_params': {}}
        )
    send_notification(api_name, body=None, customizedData=customized_list)


def getshift_details(self, request, extra_params={}):
    queryset = AssignShift.objects.filter(staff__is_active=True)
    shift = extra_params['shift'] if 'shift' in extra_params else self.request.GET.get('shift')
    fromdate = extra_params['fromdate'] if 'fromdate' in extra_params else self.request.GET.get('fromdate')
    todate = extra_params['todate'] if 'todate' in extra_params else self.request.GET.get('todate')
    if shift:
        queryset = queryset.filter(shift=shift)
    if fromdate and todate:
        fromDate = fromdate
        toDate = todate
        tmpQueryset = queryset.values()
        tmpIds = []
        for tableData in tmpQueryset:
            if ((tableData['fromdate'].strftime('%Y-%m-%d') <= fromDate <= tableData['todate'].strftime('%Y-%m-%d'))
                    or (tableData['fromdate'].strftime('%Y-%m-%d') <= toDate <= tableData['todate'].strftime(
                        '%Y-%m-%d'))):
                tmpIds.append(tableData['id'])
            if ((fromDate <= tableData['fromdate'].strftime('%Y-%m-%d') <= toDate)
                    or (fromDate <= tableData['todate'].strftime('%Y-%m-%d') <= toDate)):
                tmpIds.append(tableData['id'])
        queryset = queryset.filter(id__in=tmpIds)
    elif fromdate:
        queryset = queryset.filter(fromdate__gte=fromdate)
    elif todate:
        queryset = queryset.filter(fromdate__lte=todate)
    return queryset.annotate(
        staff_name=Concat('staff__first_name', V(' '), 'staff__middle_name', V(' '), 'staff__last_name')). \
        values('id', 'staff_name', 'staff', 'fromdate', 'todate', 'shift',
               'shift__name')


def getshift_assigned_unassigned_details(self, request):
    fromdate = request.GET.get('fromdate', None)
    todate = request.GET.get('todate', None)
    if not fromdate and not todate:
        raise exceptions.ValidationError('fromdate and todate are mandatory')
    assignedShiftData = getshift_details(self, request)
    staffIds = []
    for shiftData in assignedShiftData:
        staffIds.append(shiftData['staff'])
    queryset = Staff.objects.exclude(id__in=staffIds).filter(is_active=True)
    serializer = StaffGetNameSerializer(queryset, many=True)
    return {'data': {'unassigned_staff': serializer.data, 'assigned_staff': assignedShiftData}}


def read_shift(self, data, list=False):
    response = SharedService.read_data(self, list)
    returnResponse = []
    if list:
        for shiftData in response['data']:
            tempReturnData = get_single_shift_data(self, shiftData)
            returnResponse.append(tempReturnData)
    else:
        tempReturnData = get_single_shift_data(self, response['data'])
        return {'data': tempReturnData}
    return {'data': returnResponse}


def get_single_shift_data(self, shiftData):
    tempSchedule = {}
    for scheduleData in shiftData['shiftschedule_shift']:
        key = str(scheduleData['start_time']) + '' + str(scheduleData['end_time']) + '' \
              + str(scheduleData['first_session_end_time']) + '' + str(scheduleData['second_session_start_time']) + '' \
              + str(scheduleData['buffer_time']) + '' + str(scheduleData['late_buffer_time'])
        tempDayData = {'day': scheduleData['day'], 'day_name': scheduleData['day_name']}
        if 'id' in scheduleData:
            tempDayData['id'] = scheduleData['id']
        if key in tempSchedule:
            tempSchedule[key]['working_days'].append(tempDayData)
        else:
            del scheduleData['day_name']
            del scheduleData['day']
            del scheduleData['shift']
            tempSchedule[key] = scheduleData
            tempSchedule[key]['working_days'] = []
            tempSchedule[key]['working_days'].append(tempDayData)
    tempScheduleGetData = []
    for schedule in tempSchedule:
        tempScheduleGetData.append(tempSchedule[schedule])
    tempShiftData = {
        'id': shiftData['id'],
        'name': shiftData['name'],
        'late_attempt_per_month': shiftData['late_attempt_per_month'],
        'deduction_days': shiftData['deduction_days'],
        'shift_schedules': tempScheduleGetData
    }
    return tempShiftData


# check financial year exist in the date range  ?
def validate_assign_shift(self, data):
    staffIds = data['staffids']
    dataToSave = []
    if data['fromdate'] > data['todate']:
        raise exceptions.ValidationError(f'Fromdate is greater than to date')
    financialYearFromId = FinancialYear.get_financial_year_for_date(self, data['fromdate'])
    financialYearToId = FinancialYear.get_financial_year_for_date(self, data['todate'])
    staffJoiningDetails = Staff.objects.filter(id__in=staffIds).values('id', 'date_joined')
    staffJoiningData = {}
    for i in staffJoiningDetails:
        staffJoiningData[i['id']] = i['date_joined']
    if not financialYearFromId:
        raise exceptions.ValidationError(f'Financial Year not set for the given date {data["fromdate"]}')
    if not financialYearToId:
        raise exceptions.ValidationError(f'Financial Year not set for the given date {data["todate"]}')
    querydata = list(self.get_queryset().filter(staff__in=set(staffIds)).values())
    existingdata = {}
    for i in querydata:
        if not i['staff_id'] in existingdata:
            existingdata[i['staff_id']] = []
            existingdata[i['staff_id']].append({'fromdate': i['fromdate'], 'todate': i['todate']})
        else:
            existingdata[i['staff_id']].append({'fromdate': i['fromdate'], 'todate': i['todate']})
    error_list = []
    for staffId in staffIds:
        tempData = {}
        if staffJoiningData[staffId].strftime('%Y-%m-%d') > data['fromdate']:
            staffname = Staff.get_staff_full_name(self, staffId)
            error_list.append(f"Shift from date should be greater than joining date of staff ( {staffname} ) ( joining date - {staffJoiningData[staffId].strftime('%Y-%m-%d')}).")
            continue
        if staffId in existingdata:
            for tableData in existingdata[staffId]:
                # check given date in database date range
                if ((tableData['fromdate'].strftime('%Y-%m-%d') <= data['fromdate'] <= tableData['todate'].strftime(
                        '%Y-%m-%d'))
                        or (tableData['fromdate'].strftime('%Y-%m-%d') <= data['todate'] <= tableData[
                            'todate'].strftime('%Y-%m-%d'))):
                    staffname = Staff.get_staff_full_name(self, staffId)
                    raise exceptions.ValidationError(
                        f"Given date {data['fromdate']} to {data['todate']} range already exist range for {staffname} ")
                # check existing date in range of give date
                if ((tableData['fromdate'].strftime('%Y-%m-%d') >= data['fromdate'] and tableData[
                    'fromdate'].strftime('%Y-%m-%d') <= data['todate'])
                        or (tableData['todate'].strftime('%Y-%m-%d') >= data['fromdate'] and tableData[
                            'todate'].strftime('%Y-%m-%d') <= data['todate'])):
                    staffname = Staff.get_staff_full_name(self, staffId)
                    raise exceptions.ValidationError(
                        f"Given date {data['fromdate']} to {data['todate']} overlaps the current range for {staffname}")
        tempData = {'staff': staffId, 'fromdate': data['fromdate'], 'todate': data['todate'],
                    'shift': data['shift']}
        dataToSave.append(tempData)
    if error_list:
        raise exceptions.ValidationError(error_list)
    return dataToSave


def update_assign_shift(self, data, id):
    response = {'Reason': ''}
    dataToUpdate = {}
    dataToSave = {}
    givenFromDate = datetime.strptime(data['fromdate'], "%Y-%m-%d").date()
    givenToDate = datetime.strptime(data['todate'], "%Y-%m-%d").date()
    todayDate = date.today()
    givenShift = data['shift']
    queryset = self.get_queryset().get(id=id)
    currentShift = queryset.shift.id
    if givenFromDate > givenToDate:
        raise exceptions.ValidationError('From Date Cannot be greater than to Date')
    if givenFromDate < todayDate or givenToDate < todayDate:  # dont change the occurence
        raise exceptions.ValidationError('From Date and to Date should be greater than todays date')
    if queryset.fromdate < todayDate:  # check if shift already started
        if givenShift != currentShift or givenFromDate != todayDate:
            dataToUpdate['todate'] = todayDate - timedelta(days=1)
            dataToSave['fromdate'] = givenFromDate.strftime('%Y-%m-%d')
            dataToSave['todate'] = givenToDate.strftime('%Y-%m-%d')
        else:
            dataToUpdate['todate'] = givenToDate
    kwargs = {'partial': True}
    with transaction.atomic(using=get_current_db_name()):
        if dataToUpdate:
            data = dataToUpdate
            response = SharedService.update_data(self, data, **kwargs)
            data.update(queryset.__dict__)
            data['staffids'] = [data['staff_id']]
            data['shift'] = data['shift_id']
            data['fromdate'] = data['fromdate'].strftime('%Y-%m-%d')
            data['todate'] = data['todate'].strftime('%Y-%m-%d')
            SharedService.custom_thread(assign_shift_add_notification, self, data, 'assignshift_update')
        if dataToSave:
            dataToSave['shift'] = givenShift
            dataToSave['staffids'] = [queryset.staff.id]
            assign_shift_add(self, dataToSave)
    return response


def update_shift_type(self, request):
    assignedShift = AssignShift.objects.filter(shift=self.kwargs['pk']).values()
    currentDate = date.today()
    if assignedShift:
        for shift in assignedShift:
            if shift.fromdate <= currentDate:
                raise exceptions.ValidationError(
                    'You cant able to edit shift timing. Shift is assigned to staff. Please create new shift')
    SharedService.update_data(self, request.data)


def custom_assign_shift_add(self, data):
    
    from apps.hr.serializers import AssignShiftSerializer
    staffIds = data['staffids']
    priority = data.get('priority', AssignShift.PRIORITY_TEMPORARY_OVERRIDE)

    if data['fromdate'] > data['todate']:
        raise exceptions.ValidationError('From date is greater than to date')


    staffJoiningDetails = Staff.objects.filter(id__in=staffIds).values('id', 'date_joined')
    staffJoiningData = {i['id']: i['date_joined'] for i in staffJoiningDetails}
    error_list = []
    for staffId in staffIds:
        if staffId not in staffJoiningData:
            error_list.append(f"Staff with ID {staffId} not found")
            continue
        if staffJoiningData[staffId].strftime('%Y-%m-%d') > data['fromdate']:
            staffname = Staff.get_staff_full_name(self, staffId)
            error_list.append(
                f"Shift from date should be greater than joining date of staff ({staffname}) "
                f"(joining date - {staffJoiningData[staffId].strftime('%Y-%m-%d')})."
            )
    if error_list:
        raise exceptions.ValidationError(error_list)

    existing_same_priority = list(
        AssignShift.objects.filter(staff__in=set(staffIds), priority=priority).values()
    )
    existing_by_staff = {}
    for rec in existing_same_priority:
        if rec['staff_id'] not in existing_by_staff:
            existing_by_staff[rec['staff_id']] = []
        existing_by_staff[rec['staff_id']].append(rec)

    for staffId in staffIds:
        if staffId in existing_by_staff:
            for tableData in existing_by_staff[staffId]:
                td_from = tableData['fromdate'].strftime('%Y-%m-%d')
                td_to = tableData['todate'].strftime('%Y-%m-%d')
                if (td_from <= data['fromdate'] <= td_to) or (td_from <= data['todate'] <= td_to):
                    staffname = Staff.get_staff_full_name(self, staffId)
                    raise exceptions.ValidationError(
                        f"Given date {data['fromdate']} to {data['todate']} overlaps existing "
                        f"custom shift range for {staffname}"
                    )
                if (data['fromdate'] <= td_from <= data['todate']) or (data['fromdate'] <= td_to <= data['todate']):
                    staffname = Staff.get_staff_full_name(self, staffId)
                    raise exceptions.ValidationError(
                        f"Given date {data['fromdate']} to {data['todate']} overlaps existing "
                        f"custom shift range for {staffname}"
                    )
    dataToSave = []
    for staffId in staffIds:
        record = {
            'staff': staffId,
            'fromdate': data['fromdate'],
            'todate': data['todate'],
            'shift': data.get('shift', None),
            'priority': priority,
            'custom_time_start': data.get('custom_time_start', None),
            'custom_time_end': data.get('custom_time_end', None),
            'custom_buffer_time': data.get('custom_buffer_time', None),
            'custom_late_buffer_time': data.get('custom_late_buffer_time', None),
        }
        dataToSave.append(record)

    self.serializer_class = AssignShiftSerializer
    self.queryset = AssignShift.objects.all()
    response = SharedService.add_data(self, dataToSave)
    return response


def get_custom_shift_details(self, request):

    queryset = AssignShift.objects.filter(staff__is_active=True)
    priority_gte = request.GET.get('priority_gte')
    fromdate = request.GET.get('fromdate')
    todate = request.GET.get('todate')

    if priority_gte:
        queryset = queryset.filter(priority__gte=int(priority_gte))

    if fromdate and todate:
        tmpQueryset = queryset.values()
        tmpIds = []
        for tableData in tmpQueryset:
            td_from = tableData['fromdate'].strftime('%Y-%m-%d')
            td_to = tableData['todate'].strftime('%Y-%m-%d')
            if (td_from <= fromdate <= td_to) or (td_from <= todate <= td_to):
                tmpIds.append(tableData['id'])
            if (fromdate <= td_from <= todate) or (fromdate <= td_to <= todate):
                tmpIds.append(tableData['id'])
        queryset = queryset.filter(id__in=tmpIds)
    elif fromdate:
        queryset = queryset.filter(fromdate__gte=fromdate)
    elif todate:
        queryset = queryset.filter(fromdate__lte=todate)

    return queryset.annotate(
        staff_name=Concat('staff__first_name', V(' '), 'staff__middle_name', V(' '), 'staff__last_name')
    ).values(
        'id', 'staff_name', 'staff', 'fromdate', 'todate', 'shift', 'shift__name',
        'priority', 'custom_time_start', 'custom_time_end', 'custom_buffer_time', 'custom_late_buffer_time'
    )