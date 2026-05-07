import copy
from decimal import Decimal

from django.db import transaction
from django.db.models import Max, Min, Q, F, Count
from django.db.models.functions import Concat
from rest_framework import exceptions
from datetime import date

from apps.general.models import HolidayCalender
from apps.classes.models.studentleave import StudentLeaveTypeAcademicYearMapping, StudentLeaveDates, StudentLeaveType, StaffStandardSectionMapping,StudentLeaves
from apps.hr.services.staffattendance import get_attendance_with_deductable_count, V, get_staff_full_name
from apps.institutes.models import AcademicYear
from apps.shared.models import Document
from apps.shared.services_shared.common import get_full_name
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.classes.serializers import StudentLeaveDatesSerializers
from apps.shared.services import SharedService, UploadTypeService
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.hr.models.timeTable import Day
from apps.classes.models import Enrollment

def add_studentleavetype(self, data):
    self.queryset = self.get_queryset().filter(is_active=True)
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response


def update_studentleave_type(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(studentleavetypeacademicyearmapping__isnull=True):
        response = SharedService.update_data(self, data, **kwargs)
        return response
    raise exceptions.ValidationError('Data is Referred not able to edit')


def add_update_delete_studentleavetype_data(self, data):
    response = {'Reason': 'Data Save Successfully'}
    testdata = {}
    for plan in data:
        if float(plan['max_leave_num']) > 250:
            raise exceptions.ValidationError('Maximum leave cannot be greater than 100.')
        elif float(plan['max_leave_num']) < 0:
            raise exceptions.ValidationError('Maximum leave cannot be negative')
        elif plan['academic_year'] in testdata:
            if plan['leave_type'] in testdata[plan['academic_year']]:
                raise exceptions.ValidationError('Duplicate values Found.')
            else:
                testdata[plan['academic_year']].append(plan['leave_type'])
        else:
            testdata[plan['academic_year']] = []
            testdata[plan['academic_year']].append(plan['leave_type'])
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


def get_studentleaves_count(self):
    response = {'Reason': '', 'data': ''}
    queryset = StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=self.request.GET.get('academic_year'),
                                               leave_type__is_active=True)
    serializer = self.get_serializer(queryset, many=True)
    response['data'] = serializer.data
    return response


def get_student_leave_count(student, fromDate, toDate="9999-12-31", approvalStatus=['Approved']):
    leaveDetails = StudentLeaveDates.objects.filter(student_leave__student=student, student_leave__is_active=1,
                                                student_leave__approval_status__in=approvalStatus,
                                                fordate__range=(fromDate, toDate)) \
        .annotate(leave_type_id=F('student_leave__leave_type__id')) \
        .values('leave_type_id', 'student_leave__approval_status')
    resData = {}
    for leave in leaveDetails:
        if leave['leave_type_id'] in resData:
            resData[leave['leave_type_id']][leave['student_leave__approval_status']] += 0.5
        else:
            resData[leave['leave_type_id']] = {}
            for approvaltype in approvalStatus:
                if approvaltype == leave['student_leave__approval_status']:
                    resData[leave['leave_type_id']][approvaltype] = 0.5
                else:
                    resData[leave['leave_type_id']][approvaltype] = 0
    return resData

def add_applystudentleave(self, request, data):
    fromdate = SharedService.date_to_obj(data['applied_from_date'])
    todate = SharedService.date_to_obj(data['applied_to_date'])
    leave_code = StudentLeaveType.objects.get(id=data['leave_type']).code
    obj = User.objects.get(id=self.request.user.id)
    logged_in_student_id = obj.student_id
    data_to_save = []
    from_session = data['from_session']
    to_session = data['to_session']
    if fromdate > todate:
        raise exceptions.ValidationError('Fromdate is greater than todate')
    elif fromdate == todate:
        if from_session == 'Session2' and to_session == 'Session1':
            raise exceptions.ValidationError('From session is greater than to Session')
    holiday_date_range_list = HolidayCalenderStudent.get_upcoming_holidays(self, fromdate, todate, False)
    applied_leave_date_range = SharedService.get_for_date_from_date_range(fromdate, todate)
    academic_year_from_id = AcademicYear.get_academic_year_for_date(self, fromdate)
    academic_year_to_id = AcademicYear.get_academic_year_for_date(self, todate)
    working_days = Day.get_student_working_days(self)
    if academic_year_from_id and academic_year_to_id:
        if not StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=academic_year_from_id.id,
                                               leave_type=data['leave_type']).exists() or \
                not StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=academic_year_to_id.id,
                                                    leave_type=data['leave_type']).exists():
            raise exceptions.ValidationError('There is no leave plan for the Academic year')
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
            StudentLeaveDates.objects.filter(student_leave__student=logged_in_student_id, student_leave__is_active=True).exclude(
                student_leave__approval_status__in=['Rejected', 'Canceled']).values('fordate', 'session',
                                                                                  'student_leave'))
        for row_data in data_to_save:
            check_duplicate.append(row_data)
        duplicate_list_two_objects(check_duplicate, 'fordate', 'session', logged_in_student_id)
        available_leaves = get_available_studentleaves(self, request, logged_in_student_id, None,data['leave_type'])
        if 'total_leaves_available' not in available_leaves['data']:
            raise exceptions.ValidationError('Total available leaves not found')
        total_leaves = len(data_to_save) / 2
        if total_leaves > available_leaves['data']['total_leaves_available']:
            raise exceptions.ValidationError(
                f'Not able to apply leave - Available leave count is - {available_leaves["data"]["total_leaves_available"]}')
        with transaction.atomic(using=get_current_db_name()):
            data['student'] = logged_in_student_id
            serializer = self.get_serializer(data=data)
            serializer.is_valid(raise_exception=True)
            student_leave = serializer.save()
            for leave_dates in data_to_save:
                leave_dates['student_leave'] = student_leave.id
            leave_dates_serializer = StudentLeaveDatesSerializers(data=data_to_save, many=True)
            leave_dates_serializer.is_valid(raise_exception=True)
            leave_dates_serializer.save()
    else:
        raise exceptions.ValidationError('There is no Academic Year for the applied date. Please contact Admin')
    if data['attach_file']:
        Document.objects.filter(id=data['attach_file']).update(is_active=True)
    return {'Result': 'Data Saved Successfully'}


def duplicate_list_two_objects(checkDuplicate, column1, column2, logedInStudentId):
    testdata = {}
    for rowData in checkDuplicate:
        if rowData[column1] in testdata:
            if rowData[column2] in testdata[rowData[column1]]:
                tmpReason = \
                    StudentLeaves.objects.filter(student=logedInStudentId, student_leave_date_student_leave__fordate=rowData[column1],
                                               student_leave_date_student_leave__session=rowData[column2]).annotate(
                        todate=Max('student_leave_date_student_leave__fordate'), fromdate=Min('student_leave_date_student_leave__fordate')).values(
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
    is_staff = self.request.user.is_staff
    student_id = queryset.student_id
    academic_year_from_id = AcademicYear.get_academic_year_for_date(self, queryset.applied_from_date)
    if not self.request.user.is_superuser and not leaveStatus == "Canceled" and is_staff:
        standard_section = Enrollment.get_student_standard_for_academic(self,academic_year_from_id.id,student_id,True)
        class_teacher = StaffStandardSectionMapping.objects.filter(standard_section=standard_section['standard_section'],is_active=True).values('staff__users__id','staff_id','standard_section')
        if class_teacher and class_teacher[0]['staff_id'] != User.get_my_staff_id(self):
            raise exceptions.ValidationError(f'Not Authorized to perform this Action')
    logedInstudent_or_staffId = User.get_my_staff_id(self) if is_staff else self.request.user.student.id
    leaveStatus = self.request.data['approval_status'] if self.request.data['approval_status'] else None
    reason = approvedBy = None
    if 'cancel_reject_reason' in self.request.data:
        reason = self.request.data['cancel_reject_reason']
    if leaveStatus and leaveStatus in ['Approved', 'NotApproved', 'Rejected', 'Canceled']:
        if queryset.approval_status == "NotApproved":
            if (leaveStatus == "Approved" or leaveStatus == "Rejected") and not is_staff and queryset.student_id == logedInstudent_or_staffId:
                leaveStatus = "Approve" if leaveStatus == "Approved" else "Reject"
                raise exceptions.ValidationError(f'You yourself cant {leaveStatus} leave')
            elif not is_staff and queryset.student_id != logedInstudent_or_staffId and leaveStatus == "Canceled":
                raise exceptions.ValidationError('You cannot cancel others Leave')
            elif ((leaveStatus == "Canceled" or leaveStatus == "Rejected") and (not reason)):
                raise exceptions.ValidationError(f'{leaveStatus} Reason should not be empty')
            if leaveStatus == "Approved" or leaveStatus == "Rejected":
                if is_staff:
                    approvedBy = User.get_my_staff_id(self)
                    totalappliedleaves = (StudentLeaveDates.objects.filter(student_leave=pk).count()) / 2
                    availableLeaves = get_available_studentleaves(self, request, queryset.student_id, None,
                                                                            queryset.leave_type)
                    if totalappliedleaves > availableLeaves['data']['total_leaves_available']:
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


# def recent_studentleaves_from_today(self, request):
#     startDate = request.GET.get('start_date', None)
#     endDate = request.GET.get('end_date', '9999-12-29')
#     exceptLoggedInUser = request.GET.get('exceptLoggedInUser', False)
#     exceptStaffIds = []
#     if exceptLoggedInUser:
#         exceptStaffIds = [User.get_my_staff_id(self)]
#     limit = int(request.GET.get('limit')) * 2 if request.GET.get('limit', None) else None
#     responseData = get_staff_leaves(self, startDate, endDate, limit, exceptStaffIds)
#     resultData = {}
#     finalData = []
#     for data in responseData['data']:
#         sameDateToUser = False
#         fromDate = data['fordate'].strftime('%Y-%m-%d')
#         if fromDate in resultData:
#             for key, leaveData in enumerate(resultData[fromDate]):
#                 if data['staff'] == leaveData['staff']:
#                     resultData[fromDate][key]['to_session'] = data['to_session']
#                     sameDateToUser = True
#             if not sameDateToUser:
#                 resultData[fromDate].append(data)
#         else:
#             resultData[fromDate] = []
#             resultData[fromDate].append(data)
#     for forDate, value in resultData.items():
#         resData = {"fodate": forDate, "leave_detail": value}
#         finalData.append(resData)
#     responseData['data'] = finalData
#     return responseData


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
    returnData = self.get_queryset().filter(is_active=True,
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


def studentleave_approval_view(self, request):
    approvalStatus = request.GET.get('approval_status', None)
    filter_query = {'is_active': True}
    if approvalStatus:
        filter_query['approval_status'] = approvalStatus
    is_staff = request.user.is_staff
    if not request.user.is_superuser:
        if is_staff:
            class_teacher = StaffStandardSectionMapping.objects.filter(class_teacher_id=request.user.staff.id,is_active=True).values()
            students = Enrollment.objects.filter(standard_section_id=class_teacher[0]['standard_section_id']).values()
            student_ids = [stu['student_id'] for stu in students]
        else:
            student_ids = [request.user.student.id]
        filter_query['student_id__in'] = student_ids
    queryset = self.get_queryset().filter(**filter_query).annotate(
        todate=Max('student_leave_date_student_leave__fordate'), fromdate=Min('student_leave_date_student_leave__fordate'),
        student_name=Concat('student__first_name', V(' '), 'student__middle_name', V(' '), 'student__last_name')) \
        .values('id', 'student_name', 'student', 'fromdate', 'todate', 'reason_to_apply', 'leave_type__name',
                'student__profile_pic', 'created').annotate(
        leave_count_halfdays=Count('student_leave_date_student_leave__fordate')).order_by('id')
    for index, rowData in enumerate(queryset):
        data = get_available_studentleaves(self, request, rowData['student'])
        queryset[index]['available_leaves'] = data['data']['total_leaves_available']
    if request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                                request.GET.get('limit'),
                                                                                request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return queryset

def get_studentleave_summary_without_carryforward(self, request, currentDate=None):
    approval_types = StudentLeaves.Approvalstatuses
    approval_types = [a for a,b in approval_types]
    student_id = request.user.student.id
    response = {'Reason': '', 'data': ''}
    # student_date_joined = Student.objects.values_list('date_joined', flat=True).get(id=student_id).strftime('%Y-%m-%d')
    academic_year = AcademicYear.get_academic_year_for_date(self,date.today())  # financial year for staff Date joined
    result_data = {}
    number_of_months = 12
    if not currentDate:
        currentDate = date.today()
    # if student_date_joined > currentDate.strftime('%Y-%m-%d'):
        # raise exceptions.ValidationError('DateJoined is greater than current date')
    # current_date_academic_year = FinancialYear.get_financial_year_for_date(self, currentDate)
    if not academic_year:
        raise exceptions.ValidationError('There is no Academic year for currentDate')
    else:
        # get number of months from date_joined and the end of the financial year this only occurs when the user add in the middle
        number_of_months = SharedService.month_and_days_between(academic_year.start_date.strftime('%Y-%m-%d'),academic_year.end_date.strftime('%Y-%m-%d')) + 1
    available_leave_type = StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=academic_year.id) \
        .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                               'max_leave_num',
                                                                                               'leave_type',
                                                                                               'leave_code')
    result_data['upcoming_holidays'] = HolidayCalender.get_upcoming_holidays(self, currentDate, '9999-12-30', False)
    result_data['total_leaves_taken'] = 0
    result_data['total_leaves_available'] = 0
    result_data['leaves_taken_ds_month'] = 0
    if available_leave_type:
        student_leaves = get_student_leave_count(student_id,academic_year.start_date,academic_year.end_date, approval_types)
        month_last_day = SharedService.last_day_of_month()
        month_first_day = SharedService.first_day_of_currentmonth()
        leaves_taken_ds_month = get_student_leave_count(student_id, month_first_day,month_last_day)
        for dsMonth in leaves_taken_ds_month:
            result_data['leaves_taken_ds_month'] += leaves_taken_ds_month[dsMonth]['Approved']
        for l in student_leaves:
            result_data['total_leaves_taken'] += student_leaves[l]['Approved']
        result_data['leave_balance'] = []
        temp_total_leave_balance = 0
        for leave in available_leave_type:
            tmpData = {'approved_leaves': 0, 'cancelled_leaves': 0, 'rejected_leaves': 0}
            num_of_leaves_per_month = leave['max_leave_num']
            if number_of_months != 12:
                num_of_leaves_per_month = leave['max_leave_num'] / number_of_months
                num_of_leaves_per_month = num_of_leaves_per_month * number_of_months
            if leave['leave_type'] in student_leaves:
                num_of_leaves_per_month = num_of_leaves_per_month - Decimal(student_leaves[leave['leave_type']]['Approved'])
                tmpData['approved_leaves'] = round(student_leaves[leave['leave_type']]['Approved'], 2)
                tmpData['cancelled_leaves'] = round(student_leaves[leave['leave_type']]['Cancelled'], 2)
                tmpData['rejected_leaves'] = round(student_leaves[leave['leave_type']]['Rejected'], 2)
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
        result_data['academic_year'] = academic_year.id
        response['data'] = result_data
    return response


""" when leave type sent we get only given leavetype total available leaves """


def get_available_studentleaves(self, request, studentId, currentDate=None, leaveTypeId=None):
    response = {'Reason': '', 'data': ''}
    # staffDateJoined = Student.objects.values_list('date_joined', flat=True).get(id=staffId).strftime('%Y-%m-%d')
    # financialYear = FinancialYear.get_financial_year_for_date(self,staffDateJoined)  # financial year for staff Date joined
    resultData = {}
    numberOfMonths = 12
    if not currentDate:
        currentDate = date.today()
    # if staffDateJoined > currentDate.strftime('%Y-%m-%d'):
        # raise exceptions.ValidationError('DateJoined is greater than current date')
    currentDateAcademicYear = AcademicYear.get_academic_year_for_date(self, currentDate)
    if not currentDateAcademicYear:
        raise exceptions.ValidationError('There is no academic year for currentDate')
    # elif currentDateAcademicYear['id'] == fiYear['id']:
        # get number of months from date_joined and the end of the financial year this only occurs when the user add in the middle
    numberOfMonths = SharedService.month_and_days_between(currentDateAcademicYear.start_date.strftime('%Y-%m-%d'),currentDateAcademicYear.end_date.strftime('%Y-%m-%d')) + 1
    if leaveTypeId:
        availableLeaveType = StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=currentDateAcademicYear.id,
                                                             leave_type=leaveTypeId) \
            .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                                   'max_leave_num',
                                                                                                   'leave_type',
                                                                                                   'leave_code')
    else:
        availableLeaveType = StudentLeaveTypeAcademicYearMapping.objects.filter(academic_year=currentDateAcademicYear.id) \
            .annotate(leave_name=F('leave_type__name'), leave_code=F('leave_type__code'), ).values('leave_name',
                                                                                                   'max_leave_num',
                                                                                                   'leave_type',
                                                                                                   'leave_code')
    resultData['total_leaves_available'] = 0
    if availableLeaveType:
        studentLeaves = get_student_leave_count(studentId,currentDateAcademicYear.start_date,currentDateAcademicYear.end_date)
        for leave in availableLeaveType:
            numOfLeavesPerMonth = leave['max_leave_num']
            if numberOfMonths != 12:
                numOfLeavesPerMonth = leave['max_leave_num'] / numberOfMonths
                numOfLeavesPerMonth = numOfLeavesPerMonth * numberOfMonths
            if leave['leave_type'] in studentLeaves:
                numOfLeavesPerMonth = numOfLeavesPerMonth - Decimal(studentLeaves[leave['leave_type']]['Approved'])
            resultData['total_leaves_available'] += numOfLeavesPerMonth
    response['data'] = resultData
    return response

def get_modify_leave_data(self, data):
    for row_data in data:
        row_data['no_of_leaves'] = len(row_data['student_leave_date_student_leave'])/2
        row_data['from_session'] = row_data['student_leave_date_student_leave'][0]['session']
        row_data['to_session'] = row_data['student_leave_date_student_leave'][len(row_data['student_leave_date_student_leave'])-1]['session']
        del row_data['student_leave_date_student_leave']
    return data

def add_staff_standard_section_data(self, request_data):
    """Add class teacher or staff allocation to standard section.
    Supports two formats:
    1. List: [{staff, standard_section, ...}, ...]
    2. Object: {staff, standard_sections: [id, ...]} - one staff, multiple sections."""
    if isinstance(request_data, dict) and 'standard_sections' in request_data:
        staff_id = request_data.get('staff')
        standard_sections = list(request_data.get('standard_sections', []))
        extra_data = {k: v for k, v in request_data.items() if k not in ('staff', 'standard_sections')}
        with transaction.atomic(using=get_current_db_name()):
            existing = StaffStandardSectionMapping.objects.filter(
                staff_id=staff_id, is_active=True
            ).values_list('standard_section_id', flat=True)
            existing_ids = set(existing)
            new_ids = set(standard_sections)
            to_delete_ids = existing_ids - new_ids
            to_create_ids = new_ids - existing_ids
            StaffStandardSectionMapping.objects.filter(
                staff_id=staff_id, standard_section_id__in=to_delete_ids
            ).update(is_active=False)
            request_data = [
                {'staff': staff_id, 'is_active': True, 'standard_section': section_id, **extra_data}
                for section_id in to_create_ids
            ]
    if not isinstance(request_data, list):
        request_data = [request_data]
    for data in request_data:
        if 'is_active' not in data:
            data['is_active'] = True
        allocation_type = data.get('allocation_type', 'staff')
        data['is_class_teacher'] = allocation_type == 'class_teacher' or data.get('is_class_teacher', False)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        from_date = SharedService.date_to_obj(data.get('from_date')) if data.get('from_date') else None
        to_date = SharedService.date_to_obj(data.get('to_date')) if data.get('to_date') else None
        is_class_teacher = allocation_type == 'class_teacher' or data.get('is_class_teacher', False)
        if is_class_teacher and from_date and to_date:
            if self.get_queryset().filter(from_date__year=from_date.year, to_date__year=to_date.year,
                                         standard_section=data['standard_section'],
                                         is_class_teacher=True).exists():
                raise exceptions.ValidationError('The given date range has conflicts with other class teacher!')
        with transaction.atomic(using=get_current_db_name()):
            staff_standard_section_check(self, serializer, from_date, to_date, data['standard_section'],
                                        is_class_teacher=is_class_teacher)
    return {'Reason': 'Staff allocation added successfully!'}


def update_staff_standard_section(self, data, **kwargs):
    """Update class teacher or staff allocation."""
    response = {'Reason': ''}
    queryset = self.get_queryset()
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    serializer = self.get_serializer(instance=instance, data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    from_date = SharedService.date_to_obj(data.get('from_date')) if data.get('from_date') else getattr(instance, 'from_date', None)
    to_date = SharedService.date_to_obj(data.get('to_date')) if data.get('to_date') else getattr(instance, 'to_date', None)
    is_class_teacher = data.get('allocation_type', 'class_teacher') == 'class_teacher' or data.get('is_class_teacher', instance.is_class_teacher)
    if is_class_teacher and from_date and to_date:
        if queryset.filter(~Q(id=instance.id), from_date__year=from_date.year,
                          to_date__year=to_date.year, standard_section=data.get('standard_section', instance.standard_section_id),
                          is_class_teacher=True).exists():
            raise exceptions.ValidationError('The given date range has conflicts with other class teacher!')
    response['Reason'] = 'Staff allocation updated successfully!'
    staff_standard_section_check(self, serializer, from_date, to_date,
                                data.get('standard_section', instance.standard_section_id),
                                instance_id=instance.id, is_class_teacher=is_class_teacher)
    return response


def staff_standard_section_check(self, serializer, from_date, to_date, standard_section, instance_id=None, is_class_teacher=True):
    """Validate date conflicts for class teacher only. Staff allocations allow multiple per section."""
    if not is_class_teacher:
        return serializer.save()
    if not from_date or not to_date:
        return serializer.save()
    queryset = self.get_queryset().filter(is_class_teacher=True, standard_section=standard_section)
    listyear = queryset.filter(
        Q(to_date__year=from_date.year, standard_section=standard_section)
        | Q(from_date__year=to_date.year, standard_section=standard_section)
    ).order_by('from_date')
    if instance_id:
        listyear = listyear.exclude(id=instance_id)
    if listyear.count() == 2:
        row1 = listyear.filter(to_date__lt=from_date, standard_section=standard_section).exists()
        row2 = listyear.filter(from_date__gt=to_date, standard_section=standard_section).exists()
        if not (row1 and row2):
            raise exceptions.ValidationError('Date Conflicts!')
        mapping = serializer.save()
    elif listyear.count() == 1:
        if listyear.filter(
            Q(to_date__year=from_date.year, to_date__gte=from_date, standard_section=standard_section)
            | Q(from_date__year=to_date.year, from_date__lte=to_date, standard_section=standard_section)
        ).exists():
            raise exceptions.ValidationError('Date Conflicts!')
        mapping = serializer.save()
    else:
        mapping = serializer.save()
    return mapping