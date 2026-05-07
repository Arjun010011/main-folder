import copy
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Min, Q, F, Count
from django.db.models.functions import Concat
from rest_framework import exceptions
from datetime import datetime, timedelta, date

from apps.general.models import HolidayCalender
from apps.hr.models import LeaveTypeMapping, StaffLeaveDates, LeaveType, Day, StaffLeaves
from apps.hr.services.default_varialbes import get_lop_attendance_list
from apps.hr.services.staffattendance import get_attendance_with_deductable_count, V, get_staff_full_name
from apps.institutes.models import FinancialYear
from apps.shared.models import Document
from apps.shared.services_shared.common import get_full_name
from apps.staffs.models import Staff
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.hr.serializers import LeaveTypeMappingSerializer, StaffLeaveDatesSerializers
from apps.shared.services import SharedService, UploadTypeService

def add_leavetype(self, data):
    self.queryset = self.get_queryset().filter(is_active=True)
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response


def update_leave_type(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(leavetypemapping__isnull=True):
        response = SharedService.update_data(self, data, **kwargs)
        return response
    raise exceptions.ValidationError('Data is Referred not able to edit')


def add_update_delete_leavetype_data(self, data):
    response = {'Reason': 'Data Save Successfully'}
    testdata = {}
    for plan in data:
        if float(plan['max_leave_num']) > 250:
            raise exceptions.ValidationError('Maximum leave cannot be greater than 100.')
        elif float(plan['max_leave_num']) < 0:
            raise exceptions.ValidationError('Maximum leave cannot be negative')
        elif plan['financial_year'] in testdata:
            if plan['leave_type'] in testdata[plan['financial_year']]:
                raise exceptions.ValidationError('Duplicate values Found.')
            else:
                testdata[plan['financial_year']].append(plan['leave_type'])
        else:
            testdata[plan['financial_year']] = []
            testdata[plan['financial_year']].append(plan['leave_type'])
    dataToSave = []
    with transaction.atomic(using=get_current_db_name()):
        for leave_data in data:
            if 'id' in leave_data:
                self.kwargs['pk'] = leave_data['id']
                instance = self.get_object()
                serializer = self.get_serializer(instance=instance, data=leave_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                dataToSave.append(leave_data)
        if dataToSave:
            response = SharedService.add_data(self, dataToSave, True)
    return response


def get_leaves_count(self):
    response = {'Reason': '', 'data': ''}
    queryset = LeaveTypeMapping.objects.filter(financial_year=self.request.GET.get('financial_year'),
                                               leave_type__is_active=True)
    serializer = self.get_serializer(queryset, many=True)
    response['data'] = serializer.data
    return response


def get_staff_leave_count(staff, fromDate, toDate="9999-12-31", approvalStatus=['Approved']):
    leaveDetails = StaffLeaveDates.objects.filter(staff_leave__staff=staff, staff_leave__is_active=1,
                                                staff_leave__approval_status__in=approvalStatus,
                                                fordate__range=(fromDate, toDate)) \
        .annotate(leave_type_id=F('staff_leave__leave_type__id')) \
        .values('leave_type_id', 'staff_leave__approval_status')
    resData = {}
    for leave in leaveDetails:
        if leave['leave_type_id'] in resData:
            resData[leave['leave_type_id']][leave['staff_leave__approval_status']] += 0.5
        else:
            resData[leave['leave_type_id']] = {}
            for approvaltype in approvalStatus:
                if approvaltype == leave['staff_leave__approval_status']:
                    resData[leave['leave_type_id']][approvaltype] = 0.5
                else:
                    resData[leave['leave_type_id']][approvaltype] = 0
    return resData

def create_default_leave_type(self, financialYearId):
    DEFAULT_LEAVE_TYPE_CODES = ['lop']
    postData = []
    defaultLeaveTypes = LeaveType.objects.filter(code__in=DEFAULT_LEAVE_TYPE_CODES).values()
    for leaveTypeData in defaultLeaveTypes:
        temp = {'financial_year': financialYearId, 'leave_type': leaveTypeData['id'], 'max_leave_num': 0,
                'carry_forward_num': 0}
        postData.append(temp)
    if postData:
        self.queryset = LeaveTypeMapping
        self.serializer_class = LeaveTypeMappingSerializer
        add_update_delete_leavetype_data(self, postData)


def add_applyleave(self, request, data):
    fromdate = SharedService.date_to_obj(data['applied_from_date'])
    todate = SharedService.date_to_obj(data['applied_to_date'])
    leave_code = LeaveType.objects.get(id=data['leave_type']).code
    logged_in_staff_id = User.get_my_staff_id(self)
    data_to_save = []
    from_session = data['from_session']
    to_session = data['to_session']
    if fromdate > todate:
        raise exceptions.ValidationError('Fromdate is greater than todate')
    elif fromdate == todate:
        if from_session == 'Session2' and to_session == 'Session1':
            raise exceptions.ValidationError('From session is greater than to Session')
    holiday_date_range_list = HolidayCalender.get_upcoming_holidays(self, fromdate, todate, False)
    applied_leave_date_range = SharedService.get_for_date_from_date_range(fromdate, todate)
    financial_year_from_id = FinancialYear.get_financial_year_for_date(self, fromdate)
    financial_year_to_id = FinancialYear.get_financial_year_for_date(self, todate)
    working_days = Day.get_staff_working_day(self)
    if financial_year_from_id and financial_year_to_id:
        if not LeaveTypeMapping.objects.filter(financial_year=financial_year_from_id['id'],
                                               leave_type=data['leave_type']).exists() or \
                not LeaveTypeMapping.objects.filter(financial_year=financial_year_to_id['id'],
                                                    leave_type=data['leave_type']).exists():
            raise exceptions.ValidationError('There is no leave plan for the financial year')
        for current_date in applied_leave_date_range:
            tmp_data = {}
            day = SharedService.get_day_for_date(current_date.strftime('%Y-%m-%d'))
            tmp_data['fordate'] = current_date
            if day in working_days and current_date not in holiday_date_range_list:
                if from_session == 'Session1' and fromdate == current_date:
                    tmp_data['session'] = 'Session1'
                elif from_session == 'Session2' and fromdate == current_date:
                    tmp_data['session'] = 'Session2'
                else:
                    tmp_data['session'] = 'Session1'
                data_to_save.append(tmp_data)
                if tmp_data['session'] != 'Session2':
                    tmp_data_new = {'fordate': current_date}
                    if to_session == 'Session1' and todate == current_date:
                        tmp_data_new['session'] = 'Session1'
                    elif to_session == 'Session2' and todate == current_date:
                        tmp_data_new['session'] = 'Session2'
                    else:
                        tmp_data_new['session'] = 'Session2'
                    if (tmp_data['session'] != tmp_data_new['session']):
                        data_to_save.append(tmp_data_new)
        if not data_to_save:
            raise exceptions.ValidationError('You have applied leave on holiday/non-working day')
        check_duplicate = list(
            StaffLeaveDates.objects.filter(staff_leave__staff=logged_in_staff_id, staff_leave__is_active=True).exclude(
                staff_leave__approval_status__in=['Rejected', 'Canceled']).values('fordate', 'session',
                                                                                  'staff_leave'))
        for row_data in data_to_save:
            check_duplicate.append(row_data)
        duplicate_list_two_objects(check_duplicate, 'fordate', 'session', logged_in_staff_id)
        if leave_code != 'lop':
            available_leaves = get_available_leaves(self, request, logged_in_staff_id, None,
                                                                       data['leave_type'])
            if 'total_leaves_available' not in available_leaves['data']:
                raise exceptions.ValidationError('Total available leaves not found')
            total_leaves = len(data_to_save) / 2
            if total_leaves > available_leaves['data']['total_leaves_available']:
                raise exceptions.ValidationError(
                    f'Not able to apply leave - Available leave count is - {available_leaves["data"]["total_leaves_available"]}')
        with transaction.atomic(using=get_current_db_name()):
            data['staff'] = logged_in_staff_id
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            staff_leave = serializer.save()
            for leave_dates in data_to_save:
                leave_dates['staff_leave'] = staff_leave.id
            leave_dates_serializer = StaffLeaveDatesSerializers(data=data_to_save, many=True)
            leave_dates_serializer.is_valid(raise_exception=True)
            leave_dates_serializer.save()
    else:
        raise exceptions.ValidationError('There is no financial Year for the applied date. Please contact Admin')
    if data['attach_file']:
        Document.objects.filter(id=data['attach_file']).update(is_active=True)
    return {'Result': 'Data Saved Successfully'}


def duplicate_list_two_objects(checkDuplicate, column1, column2, logedInStaffId):
    testdata = {}
    for rowData in checkDuplicate:
        if rowData[column1] in testdata:
            if rowData[column2] in testdata[rowData[column1]]:
                tmpReason = \
                    StaffLeaves.objects.filter(staff=logedInStaffId, staff_leave_date__fordate=rowData[column1],
                                               staff_leave_date__session=rowData[column2]).annotate(
                        todate=Max('staff_leave_date__fordate'), fromdate=Min('staff_leave_date__fordate')).values(
                        'applied_from_date', 'applied_to_date')[0]
                raise exceptions.ValidationError(
                    f'Leave Already Applied on {tmpReason["applied_from_date"].strftime("%Y-%m-%d")} to {tmpReason["applied_to_date"].strftime("%Y-%m-%d")}')
            else:
                testdata[rowData[column1]].append(rowData[column2])
        else:
            testdata[rowData[column1]] = []
            testdata[rowData[column1]].append(rowData[column2])


def delete_appliedLeave(self):
    data = self.get_queryset().filter(id=self.kwargs['pk']).values('approval_status')[0]
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if data['approval_status'] != 'NotApproved':
        raise exceptions.ValidationError('Not able to delete, Attendance already approved/ rejected')
    SharedService.soft_delete_data(self)
    return {'Reason': 'Data Deleted Successfully'}

    # cancel leave , staffId in place of pk




def update(self, request, pk=None):
    queryset = self.get_queryset().get(id=pk)
    leaveStatus = self.request.data['approval_status'] if self.request.data['approval_status'] else None
    if not self.request.user.is_superuser and not leaveStatus == "Canceled":
        reportingStaffIds = User.getUserHierarchy(self, None, True, True)
        if queryset.staff_id not in reportingStaffIds:
            raise exceptions.ValidationError(f'Not Authorized to perform this Action')
    logedInStaffId = User.get_my_staff_id(self)
    leaveStatus = self.request.data['approval_status'] if self.request.data['approval_status'] else None
    reason = approvedBy = None
    if 'cancel_reject_reason' in self.request.data:
        reason = self.request.data['cancel_reject_reason']
    if leaveStatus and leaveStatus in ['Approved', 'NotApproved', 'Rejected', 'Canceled']:
        if queryset.approval_status == "NotApproved":
            if (leaveStatus == "Approved" or leaveStatus == "Rejected") and queryset.staff_id == logedInStaffId:
                leaveStatus = "Approve" if leaveStatus == "Approved" else "Reject"
                raise exceptions.ValidationError(f'You yourself cant {leaveStatus} leave')
            elif queryset.staff_id != logedInStaffId and leaveStatus == "Canceled":
                raise exceptions.ValidationError('You cannot cancel others Leave')
            elif ((leaveStatus == "Canceled" or leaveStatus == "Rejected") and (not reason)):
                raise exceptions.ValidationError(f'{leaveStatus} Reason should not be empty')
            if leaveStatus == "Approved" or leaveStatus == "Rejected":
                approvedBy = User.get_my_staff_id(self)
                totalappliedleaves = (StaffLeaveDates.objects.filter(staff_leave=pk).count()) / 2
                availableLeaves = get_available_leaves(self, request, queryset.staff_id, None,
                                                                           queryset.leave_type)
                if totalappliedleaves > availableLeaves['data'][
                    'total_leaves_available'] and queryset.leave_type.code != 'lop':
                    raise exceptions.ValidationError(
                        f'Not able to apply leave - Available leave count is {availableLeaves["data"]["total_leaves_available"]}')
            if not self.get_queryset().filter(id=pk).update(approval_status=leaveStatus,
                                                            cancel_reject_reason=reason,
                                                            approved_by=approvedBy):  # NIKHIL HANDLE
                raise exceptions.ValidationError('Something went wrong')
        else:
            raise exceptions.ValidationError(f'Your leave already {queryset.approval_status}')
    else:
        raise exceptions.ValidationError('Please provide valid approval status')
    return {'Reason': 'Data Updated Successfully'}


def recent_leaves_from_today(self, request):
    startDate = request.GET.get('start_date', None)
    endDate = request.GET.get('end_date', '9999-12-29')
    exceptLoggedInUser = request.GET.get('exceptLoggedInUser', False)
    exceptStaffIds = []
    if exceptLoggedInUser:
        exceptStaffIds = [User.get_my_staff_id(self)]
    limit = int(request.GET.get('limit')) * 2 if request.GET.get('limit', None) else None
    responseData = get_staff_leaves(self, startDate, endDate, limit, exceptStaffIds)
    resultData = {}
    finalData = []
    for data in responseData['data']:
        sameDateToUser = False
        fromDate = data['fordate'].strftime('%Y-%m-%d')
        if fromDate in resultData:
            for key, leaveData in enumerate(resultData[fromDate]):
                if data['staff'] == leaveData['staff']:
                    resultData[fromDate][key]['to_session'] = data['to_session']
                    sameDateToUser = True
            if not sameDateToUser:
                resultData[fromDate].append(data)
        else:
            resultData[fromDate] = []
            resultData[fromDate].append(data)
    for forDate, value in resultData.items():
        resData = {"fodate": forDate, "leave_detail": value}
        finalData.append(resData)
    responseData['data'] = finalData
    return responseData


# send range from_date and end_date will get all the user on leave in the date range
# when endate and numofdays given first preference for endDate
def get_staff_leaves(self, startDate, endDate, limit=None, excludeStaffIds=[]):
    response = {'Reason': '', 'data': {}}
    if not startDate:
        startDate = date.today().strftime('%Y-%m-%d')
    if not endDate:
        endDate = '9999-12-29'
    if endDate < startDate:
        raise exceptions.ValidationError('End date is greater than start date')
    returnData = StaffLeaves.objects.filter(is_active=True,
                                            staff_leave_date__fordate__range=(startDate, endDate)) \
                     .exclude(Q(approval_status__in=["Rejected", "Canceled"]) | Q(staff__in=excludeStaffIds)) \
                     .annotate(fordate=F('staff_leave_date__fordate'), \
                               from_session=F('staff_leave_date__session'),
                               to_session=F('staff_leave_date__session'), \
                               staff_name=Concat('staff__first_name', V(' '), 'staff__middle_name', V(' '),
                                                 'staff__last_name')) \
                     .values('fordate', 'staff__profile_pic', 'staff_name', 'from_session', 'to_session',
                             'staff', 'staff__job_title').order_by('staff_leave_date__id').order_by(
        'fordate')[:limit]
    profilePicIds = [leaveData['staff__profile_pic'] for leaveData in returnData]
    uploadtypeObj = UploadTypeService()
    uploadtypeObj.set_bucket_folder_path()
    fileData = uploadtypeObj.get_file_details(profilePicIds)
    for data in returnData:
        data['profile_pic_details'] = {}
        if data['staff__profile_pic'] in fileData:
            data['profile_pic_details'] = fileData[data['staff__profile_pic']]
    return {'data': returnData}


def leave_approval_view(self, request):
    approvalStatus = request.GET.get('approval_status', None)
    filter_query = {'is_active': True}
    if approvalStatus:
        filter_query['approval_status'] = approvalStatus
    if not request.user.is_superuser:
        reportingStaffIds = User.getUserHierarchy(self, None, True, True)
        filter_query['staff_id__in'] = reportingStaffIds
    queryset = self.get_queryset().filter(**filter_query).annotate(
        todate=Max('staff_leave_date__fordate'), fromdate=Min('staff_leave_date__fordate'),
        staff_name=Concat('staff__first_name', V(' '), 'staff__middle_name', V(' '), 'staff__last_name')) \
        .values('id', 'staff_name', 'staff', 'fromdate', 'todate', 'reason_to_apply', 'leave_type__name',
                'staff__profile_pic', 'created').annotate(
        leave_count_halfdays=Count('staff_leave_date__fordate')).order_by('id')
    for index, rowData in enumerate(queryset):
        data = get_available_leaves(self, request, rowData['staff'])
        queryset[index]['available_leaves'] = data['data']['total_leaves_available']
    if request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                                request.GET.get('limit'),
                                                                                request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return queryset


""""
    {'2020-01-01' : 1, '2020-01-04': 2} count is based on sessions
    Except lop we will get all the leaves
"""


def get_staff_earned_leaves(self, fromDate, toDate, staff_ids):
    response = {}
    staff_leaves = StaffLeaveDates.objects.filter(staff_leave__staff__in=staff_ids, staff_leave__is_active=True).exclude(
        Q(staff_leave__approval_status__in=['Rejected', 'Canceled', 'NotApproved']) |
        Q(staff_leave__leave_type__code='lop')).values('fordate', 'session', 'staff_leave', 'staff_leave__staff')
    staff_leave_mapping = {}
    for leave in staff_leaves:
        fordate = leave['fordate'].strftime('%Y-%m-%d')
        if leave['staff_leave__staff'] not in staff_leave_mapping:
            staff_leave_mapping[leave['staff_leave__staff']] = {'date_list': {}, 'total_leave_sessions': 0}
        if fordate in staff_leave_mapping[leave['staff_leave__staff']]['date_list']:
            staff_leave_mapping[leave['staff_leave__staff']]['date_list'][fordate]['deductable_session'] += 1
        else:
            staff_leave_mapping[leave['staff_leave__staff']]['date_list'][fordate] = {'deductable_session': 1, 'session_list': []}
        staff_leave_mapping[leave['staff_leave__staff']]['date_list'][fordate]['session_list'].append(leave['session'])
        staff_leave_mapping[leave['staff_leave__staff']]['total_leave_sessions'] += 1
    for staff_id in staff_ids:
        if staff_id in staff_leave_mapping:
            response[staff_id] = staff_leave_mapping[staff_id]
        else:
            response[staff_id] = {}
    return response


""""
    {'2020-01-01' : 1, '2020-01-04': 2} count is based on sessions
"""


def get_staff_lop_leaves(self, from_date, to_date, staff_ids):
    response = {}
    staff_lops = StaffLeaveDates.objects.filter(staff_leave__staff__in=staff_ids, staff_leave__is_active=True,
                                               staff_leave__leave_type__code='lop',
                                               fordate__range=[from_date, to_date]).values('fordate', 'session',
                                                                                         'staff_leave', 'staff_leave__staff')
    staff_leave_mapping = {}
    for leave in staff_lops:
        fordate = leave['fordate'].strftime('%Y-%m-%d')
        if leave['staff_leave__staff'] not in staff_leave_mapping:
            staff_leave_mapping[leave['staff_leave__staff']] = {'date_list': {}, 'total_lops_sessions': 0}
        if fordate in staff_leave_mapping[leave['staff_leave__staff']]['date_list']:
            staff_leave_mapping[leave['staff_leave__staff']]['date_list'][fordate] += 1
        else:
            staff_leave_mapping[leave['staff_leave__staff']]['date_list'][fordate] = 0
        staff_leave_mapping[leave['staff_leave__staff']]['total_lops_sessions'] += 1
    for staff_id in staff_ids:
        if staff_id in staff_leave_mapping:
            response[staff_id] = staff_leave_mapping[staff_id]
        else:
            response[staff_id] = {}
    return response


def get_leave_summary_without_carryforward(self, request, currentDate=None):
    approval_types = StaffLeaves.Approvalstatuses
    approval_types = [a for a,b in approval_types]
    staff_id = User.get_my_staff_id(self)
    response = {'Reason': '', 'data': ''}
    staff_date_joined = Staff.objects.values_list('date_joined', flat=True).get(id=staff_id).strftime('%Y-%m-%d')
    financial_year = FinancialYear.get_financial_year_for_date(self,
                                                              staff_date_joined)  # financial year for staff Date joined
    result_data = {}
    number_of_months = 12
    if not currentDate:
        currentDate = date.today()
    if staff_date_joined > currentDate.strftime('%Y-%m-%d'):
        raise exceptions.ValidationError('DateJoined is greater than current date')
    current_date_financial_year = FinancialYear.get_financial_year_for_date(self, currentDate)
    if not 'id' in current_date_financial_year:
        raise exceptions.ValidationError('There is no financial year for currentDate')
    elif 'id' in financial_year and current_date_financial_year['id'] == financial_year['id']:
        # get number of months from date_joined and the end of the financial year this only occurs when the user add in the middle
        number_of_months = SharedService.month_and_days_between(staff_date_joined,
                                                              current_date_financial_year['end_date'].strftime(
                                                                  '%Y-%m-%d')) + 1
    available_leave_type = LeaveTypeMapping.objects.filter(financial_year=current_date_financial_year['id']) \
        .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                               'max_leave_num',
                                                                                               'leave_type',
                                                                                               'leave_code')
    result_data['upcoming_holidays'] = HolidayCalender.get_upcoming_holidays(self, currentDate, '9999-12-30', False)
    result_data['total_leaves_taken'] = 0
    result_data['total_leaves_available'] = 0
    result_data['leaves_taken_ds_month'] = 0
    if available_leave_type:
        staff_leaves = get_staff_leave_count(staff_id,current_date_financial_year['start_date'],
                                                                    current_date_financial_year['end_date'], approval_types)
        month_last_day = SharedService.last_day_of_month()
        month_first_day = SharedService.first_day_of_currentmonth()
        leaves_taken_ds_month = get_staff_leave_count(staff_id, month_first_day,
                                                                           month_last_day)
        for dsMonth in leaves_taken_ds_month:
            result_data['leaves_taken_ds_month'] += leaves_taken_ds_month[dsMonth]['Approved']
        for l in staff_leaves:
            result_data['total_leaves_taken'] += staff_leaves[l]['Approved']
        result_data['leave_balance'] = []
        temp_total_leave_balance = 0
        for leave in available_leave_type:
            tmpData = {'approved_leaves': 0, 'cancelled_leaves': 0, 'rejected_leaves': 0}
            num_of_leaves_per_month = leave['max_leave_num']
            if number_of_months != 12:
                num_of_leaves_per_month = leave['max_leave_num'] / number_of_months
                num_of_leaves_per_month = num_of_leaves_per_month * number_of_months
            if leave['leave_type'] in staff_leaves:
                num_of_leaves_per_month = num_of_leaves_per_month - Decimal(staff_leaves[leave['leave_type']]['Approved'])
                tmpData['approved_leaves'] = round(staff_leaves[leave['leave_type']]['Approved'], 2)
                tmpData['cancelled_leaves'] = round(staff_leaves[leave['leave_type']]['Cancelled'], 2)
                tmpData['rejected_leaves'] = round(staff_leaves[leave['leave_type']]['Rejected'], 2)
            tmpData['leave_type'] = leave['leave_type']
            tmpData['leave_name'] = leave['leave_name']
            tmpData['leave_code'] = leave['leave_code']
            if leave['leave_code'] == 'lop':
                tmpData['leave_balance'] = 0
            else:
                tmpData['leave_balance'] = round(num_of_leaves_per_month, 2)
            temp_total_leave_balance += num_of_leaves_per_month  # try to optimize
            result_data['leave_balance'].append(tmpData)
        result_data['total_leaves_available'] = temp_total_leave_balance
        result_data['financial_year'] = current_date_financial_year
        response['data'] = result_data

    return response


""" when leave type sent we get only given leavetype total available leaves """


def get_available_leaves(self, request, staffId, currentDate=None, leaveTypeId=None):
    response = {'Reason': '', 'data': ''}
    staffDateJoined = Staff.objects.values_list('date_joined', flat=True).get(id=staffId).strftime('%Y-%m-%d')
    financialYear = FinancialYear.get_financial_year_for_date(self,
                                                              staffDateJoined)  # financial year for staff Date joined
    resultData = {}
    numberOfMonths = 12
    if not currentDate:
        currentDate = date.today()
    if staffDateJoined > currentDate.strftime('%Y-%m-%d'):
        raise exceptions.ValidationError('DateJoined is greater than current date')
    currentDateFinancialYear = FinancialYear.get_financial_year_for_date(self, currentDate)
    if not 'id' in currentDateFinancialYear:
        raise exceptions.ValidationError('There is no financial year for currentDate')
    elif 'id' in financialYear and currentDateFinancialYear['id'] == financialYear['id']:
        # get number of months from date_joined and the end of the financial year this only occurs when the user add in the middle
        numberOfMonths = SharedService.month_and_days_between(staffDateJoined,
                                                              currentDateFinancialYear['end_date'].strftime(
                                                                  '%Y-%m-%d')) + 1
    if leaveTypeId:
        availableLeaveType = LeaveTypeMapping.objects.filter(financial_year=currentDateFinancialYear['id'],
                                                             leave_type=leaveTypeId) \
            .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                                   'max_leave_num',
                                                                                                   'leave_type',
                                                                                                   'leave_code')
    else:
        availableLeaveType = LeaveTypeMapping.objects.filter(financial_year=currentDateFinancialYear['id']) \
            .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                                   'max_leave_num',
                                                                                                   'leave_type',
                                                                                                   'leave_code')
    resultData['total_leaves_available'] = 0
    if availableLeaveType:
        staffLeaves = get_staff_leave_count(staffId,
                                                                    currentDateFinancialYear['start_date'],
                                                                    currentDateFinancialYear['end_date'])
        for leave in availableLeaveType:
            numOfLeavesPerMonth = leave['max_leave_num']
            if numberOfMonths != 12:
                numOfLeavesPerMonth = leave['max_leave_num'] / numberOfMonths
                numOfLeavesPerMonth = numOfLeavesPerMonth * numberOfMonths
            if leave['leave_type'] in staffLeaves:
                numOfLeavesPerMonth = numOfLeavesPerMonth - Decimal(staffLeaves[leave['leave_type']]['Approved'])

            resultData['total_leaves_available'] += numOfLeavesPerMonth
    response['data'] = resultData
    return response


def get_lop_count_and_date_status(self, from_date, to_date, staff_ids, raise_unapprove_error=True):
    hide_day_list_status = self.request.GET.get('hide_day_list_status', False)
    day_list_status_filter = self.request.GET.get('day_list_status_filter')
    if day_list_status_filter:
        day_list_status_filter = day_list_status_filter.split(',')
    unapproved_leave_data = StaffLeaveDates.objects.filter(
        staff_leave__staff__in=staff_ids, staff_leave__is_active=True,
        staff_leave__approval_status__in=['NotApproved'],
        fordate__range=(from_date, to_date
    )).values('fordate', 'staff_leave__staff', 'staff_leave__staff__first_name', 'staff_leave__staff__middle_name', 'staff_leave__staff__last_name')
    if raise_unapprove_error:
        unapproved_leaves = {}
        for unapproved in unapproved_leave_data:
            if unapproved['staff_leave__staff'] not in unapproved_leaves:
                unapproved_leaves[unapproved['staff_leave__staff']] = {}
            unapproved_leaves[unapproved['staff_leave__staff']][unapproved['fordate']] = unapproved
        if unapproved_leaves:
            error = ''
            for staff_id in unapproved_leaves:
                for_date_list = {}
                staff_name = ''
                for for_date in unapproved_leaves[staff_id]:
                    staff_name = f"\
                        {unapproved_leaves[staff_id][for_date]['staff_leave__staff__first_name']} \
                        {unapproved_leaves[staff_id][for_date]['staff_leave__staff__middle_name']} \
                        {unapproved_leaves[staff_id][for_date]['staff_leave__staff__last_name']}"
                    for_date_list[for_date.strftime('%Y-%m-%d')] = ''
                error += staff_name + ' '+ ','.join(for_date_list.keys())
            raise exceptions.ValidationError(f"Leave taken on given dates are not approved. {error}")
    holiday_date_range_list = HolidayCalender.get_upcoming_holidays(self, from_date, to_date)
    for index, element in enumerate(holiday_date_range_list):
        holiday_date_range_list[index] = element.strftime('%Y-%m-%d')
    earned_leaves = get_staff_earned_leaves(self, from_date, to_date, staff_ids)  # session based
    lop_leaves = get_staff_lop_leaves(self, from_date, to_date, staff_ids)
    working_days = Day.get_staff_working_day(self)
    attendance_dates = get_attendance_with_deductable_count(from_date, to_date, staff_ids)  # count will be in session
    error = ''
    for staff in lop_leaves:
        if 'datelist' in lop_leaves[staff] and lop_leaves[staff]['datelist']:
            for leave_date in lop_leaves[staff]['datelist']:
                if leave_date in attendance_dates['attendance_dates']:
                    staff_obj = Staff.objects.get(id=staff)
                    error += f"Name: {staff_obj.first_name} {staff_obj.middle_name} {staff_obj.last_name} Applied leave on {leave_date} but marked attendance on this day. Please resolve the conflict. "
    if error:
        raise exceptions.ValidationError(error)
    lop_constant_list = copy.deepcopy(get_lop_attendance_list())
    date_range_list = SharedService.get_for_date_from_date_range(
            datetime.strptime(from_date, '%Y-%m-%d'), datetime.strptime(to_date, '%Y-%m-%d')
    )
    response = {'staff_list': {}, 'day_list': {}}
    response_error = []
    staff_data = {s['staff_id'] : s for s in User.objects.filter(staff_id__in=staff_ids).values('staff_id','staff__first_name', 'staff__middle_name', 'staff__last_name','groups','groups__name', 'staff__date_joined')}
    for staff_id in staff_ids:
        if staff_id not in response['staff_list']:
            name = ''
            if int(staff_id) in staff_data:
                name = get_full_name(
                    staff_data[int(staff_id)]['staff__first_name'],
                    staff_data[int(staff_id)]['staff__middle_name'],
                    staff_data[int(staff_id)]['staff__last_name']
                )
            response['staff_list'][staff_id] = {
                'lop_days': 0.0,
                'total_days': 0,
                'status_report': {},
                'staff_details': {'name': name, 'staff_id': staff_id,'staff_group':staff_data[staff_id]['groups'],'staff_group_name':staff_data[staff_id]['groups__name'], 'date_joined': staff_data[staff_id]['staff__date_joined']}
            }
            if not hide_day_list_status:
                response['staff_list'][staff_id]['day_list_status'] = {}
        for for_date_time in date_range_list:
            date_joined = response['staff_list'][staff_id]['staff_details']['date_joined']
            temp = {}
            for_date = for_date_time.strftime('%Y-%m-%d')
            if for_date < date_joined.strftime('%Y-%m-%d'):
                continue
            response['day_list'][for_date] = {
                'date': for_date
            }
            response['staff_list'][staff_id]['total_days'] += 1
            day_name = SharedService.get_day_for_date(for_date)
            if 'date_list' in earned_leaves[staff_id] and for_date in earned_leaves[staff_id]['date_list']:
                if 'attendance_dates' in attendance_dates[staff_id] and for_date in attendance_dates[staff_id]['attendance_dates']:
                    if attendance_dates[staff_id]['attendance_dates'][for_date]['status'] == 'first_ses_leave_sec_sess_half' and 'Session1' in earned_leaves[staff_id]['date_list'][for_date]['session_list']:
                        temp = lop_constant_list['first_ses_leave_sec_sess_half']
                    elif attendance_dates[staff_id]['attendance_dates'][for_date]['status'] == 'first_ses_half_sec_sess_leave' and 'Session2' in earned_leaves[staff_id]['date_list'][for_date]['session_list']:
                        temp = lop_constant_list['first_ses_half_sec_sess_leave']
                    else:
                        name = get_staff_full_name(self, staff_id)
                        # response_error.append(
                        #     f"{name} : Taken leave on {for_date} but marked attendance on this day. Please resolve the conflict"
                        # )
                        if earned_leaves[staff_id]['date_list'][for_date]['deductable_session'] == 2:
                            temp = lop_constant_list['leave_applied']
                        else:
                            if 'Session1' in earned_leaves[staff_id]['date_list'][for_date]['session_list']:
                                temp = lop_constant_list['leave_applied']
                            else:
                                temp = lop_constant_list['leave_applied']
                else:
                    response['staff_list'][staff_id]['lop_days'] += 1
                    temp = lop_constant_list['unmarked']
            elif 'attendance_dates' in attendance_dates[staff_id] and for_date in attendance_dates[staff_id]['attendance_dates']:
                if day_name not in working_days and attendance_dates[staff_id]['attendance_dates'][for_date]['status'] != 'lop_attendance':
                    temp = lop_constant_list['nonworkingday']
                else:
                    response['staff_list'][staff_id]['lop_days'] += attendance_dates[staff_id]['attendance_dates'][for_date]['deductable_count']
                    temp = attendance_dates[staff_id]['attendance_dates'][for_date]
            elif for_date in holiday_date_range_list:
                temp = lop_constant_list['holiday']
            elif day_name not in working_days:
                temp = lop_constant_list['nonworkingday']
            else:
                response['staff_list'][staff_id]['lop_days'] += 1
                temp = lop_constant_list['unmarked']
            temp.update({ 'for_date': for_date })
            if 'status' in temp:
                if not hide_day_list_status:
                    if not day_list_status_filter or temp['status'] in day_list_status_filter:
                        response['staff_list'][staff_id]['day_list_status'][for_date] = copy.deepcopy(temp)
                if temp['status'] not in response['staff_list'][staff_id]['status_report']:
                    response['staff_list'][staff_id]['status_report'][temp['status']] = {'count': 0}
                if lop_constant_list[temp['status']]['deductable_count'] == 0.5:
                    if 'halfday' not in response['staff_list'][staff_id]['status_report']:
                        response['staff_list'][staff_id]['status_report']['halfday'] = {'count': 1}
                    else:
                        response['staff_list'][staff_id]['status_report']['halfday']['count'] += 1
                if (temp['status'] == 'first_ses_leave_sec_sess_half') or (temp['status'] == 'first_ses_half_sec_sess_leave'):
                    if 'leave_applied' not in response['staff_list'][staff_id]['status_report']:
                        response['staff_list'][staff_id]['status_report']['leave_applied'] = {'count': 0.5}
                    else:
                        response['staff_list'][staff_id]['status_report']['leave_applied']['count'] += 0.5
                response['staff_list'][staff_id]['status_report'][temp['status']]['count'] += 1
        response['staff_list'][staff_id]['lop_days'] += attendance_dates[staff_id]['deductableLateDays'] if 'deductableLateDays' in attendance_dates[staff_id] else 0
    if response_error:
        response_error = ', '.join(response_error)
        raise exceptions.ValidationError(response_error)
    response['day_list'] = response['day_list'].values()
    return response

""" returns staff id in list who are taken full day leave on given date range """
def get_staff_leave_list(fromDate, toDate):
    staff_leaves = StaffLeaveDates.objects.filter(fordate__range=(fromDate, toDate),staff_leave__approval_status__in=['Cancelled','Rejected']).values('staff_leave__staff__id', 'session' ,'fordate')
    staff_session_tracking = {}
    staff_having_two_session_holiday = []
    for row in staff_leaves:
        if row['fordate'] not in staff_session_tracking:
            staff_session_tracking[row['fordate']] = {}
        if row['staff_leave__staff__id'] not in staff_session_tracking[row['fordate']]:
            staff_session_tracking[row['fordate']][row['staff_leave__staff__id']] = {row['session']}
        else:
            staff_having_two_session_holiday.append(row['staff_leave__staff__id'])
    return staff_having_two_session_holiday

def get_modify_leave_data(self, data):
    for row_data in data:
        row_data['no_of_leaves'] = len(row_data['staff_leave_date'])/2
        row_data['from_session'] = row_data['staff_leave_date'][0]['session']
        row_data['to_session'] = row_data['staff_leave_date'][len(row_data['staff_leave_date'])-1]['session']
        del row_data['staff_leave_date']
    return data