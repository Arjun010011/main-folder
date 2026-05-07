from apps.hr.models.timeTable import PeriodPlan, TimeTableScheduleParent, TimetableRequestForChange
import datetime

from django.db.models import Max, Min
from rest_framework import exceptions, viewsets
from rest_framework.decorators import action
from rest_framework.views import Response

from apps.hr.models import (Shift, AssignShift, StaffAttendance, StaffHourSubjectMapping,
                            LeaveType, LeaveTypeMapping, StaffTeachingHour, StaffLeaves, Period,
                            Day, StaffLeaveDates, TimeTableDateRange, TimeTableSchedule
                            )
from apps.hr.models.timeTable import PeriodDayMapping
from apps.hr.serializers import (ShiftSerializer, ShiftReadSerializer, AssignShiftSerializer, StaffAttendanceSerializer,
                                 LeaveTypeSerializer, LeaveTypeMappingSerializer,
                                 StaffTeachingHourSerializer, GetStaffTeachingHourSerializer, GetAssignShiftSerializer,
                                 StaffLeaveSerializers, GetStaffLeaveSerializers, DaysSerializer, TimeTableDateRangeSerializer,
                                 TimeTableScheduleSerializer, PeriodPlanSerializer, PeriodDetailedSerializer, TimeTableScheduleParentSerializer,
                                 TimetableRequestForChangeSerializer,PeriodDayMappingSerializer
                                )
from apps.hr.services.shift import shift_add_or_update, read_shift, assign_shift_add, update_assign_shift, getshift_details, \
    getshift_assigned_unassigned_details, custom_assign_shift_add, get_custom_shift_details
from apps.hr.services.staffattendance import get_staff_attendance_detailed, staff_attendance_add, staff_attendance_bulk, update_staff_attendance, get_staff_attendance, \
    get_unmarked_attendance_for_date,get_staff_attendance_with_intime_outtime_detailed, custom_bulk_attendance_edit, get_department_wise_attendance_report, bulk_update_attendance_status, bulk_update_attendance_details
from apps.hr.services.staffleave import add_leavetype, get_modify_leave_data, update_leave_type, add_update_delete_leavetype_data, \
    get_leaves_count, add_applyleave, delete_appliedLeave, update, leave_approval_view, recent_leaves_from_today, \
    get_leave_summary_without_carryforward
from apps.hr.services.staffsubject import add_subject_to_staff, get_staff_subject, get_staff_subject_mapping
from apps.hr.services.timetable import (copy_period_plan_api, get_staff_timetable_for_daterange, period_add, period_delete, timetable_add,
timetable_update, get_date_range, timetable_schedule_add, read_scheduled_data,
validate_timetable_schedule_parent, get_staff_assigned_timetable, add_request_change, get_request_change_data)
from apps.hr.services.auto_timetable_generator import auto_generate_timetable, apply_generated_timetable
from apps.hr.services.bulk_timetable import bulk_timetable_assignment, get_bulk_timetable_data
from apps.hr.services.timetable_views import get_teacher_timetable, get_room_timetable, get_class_timetable, get_conflict_report
from apps.shared.services import SharedService, ApprovalService
from apps.shared.utils import (PostLimitOfsetPagination)
from apps.users.models import User
from apps.institutes.models import FinancialYear
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.institutes.serializers import InstituteSerializer
from apps.institutes.models import AcademicYear
from apps.institutes.models.institute import Institute
from apps.shared.services import ConfigurationService, FormdefinitionService, PDFService, SharedService


class ShiftViewSet(viewsets.ModelViewSet):
    serializer_class = ShiftSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = Shift.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = shift_add_or_update(self, request.data)
        return Response(response)

    # def retrieve(self, request, pk=None):
    #     response = SharedService.read_data(self)
    #     return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = ShiftReadSerializer
        response = read_shift(self, request.data, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = ShiftReadSerializer
        response = read_shift(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(assign_shift_shift__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Shift Already assigned not able to delete')


# all data should be in array
class AssignShiftViewSet(viewsets.ModelViewSet):
    serializer_class = AssignShiftSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['fromdate', 'shift', 'todate']

    def get_queryset(self):
        self.queryset = AssignShift.objects.all()
        return self.queryset

    def create(self, request):
        priority = request.data.get('priority', 1)
        if int(priority) >= AssignShift.PRIORITY_TEMPORARY_OVERRIDE:
            response = custom_assign_shift_add(self, request.data)
        else:
            response = assign_shift_add(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_assign_shift(self, request.data, self.kwargs['pk'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = GetAssignShiftSerializer
        response = {'data':[]}
        if request.GET.get('priority_gte'):
            response['data'] = get_custom_shift_details(self, request)
        else:
            response['data'] = getshift_details(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        queryset = self.get_queryset().get(id=self.kwargs['pk'])
        if queryset.fromdate < datetime.date.today():
            raise exceptions.ValidationError('Not able delete the shift, shift already started')
        queryset.delete()
        return Response({'Reason': 'Data Deleted Successfully'})


class GetUnassignedShift(viewsets.ModelViewSet):
    serializer_class = AssignShiftSerializer
    http_method_names = ['get']
    filterset_fields = ['fromdate', 'shift', 'todate']

    def get_queryset(self):
        self.queryset = AssignShift.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = GetAssignShiftSerializer
        response = getshift_assigned_unassigned_details(self, request)
        return Response(response)


class StaffAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAttendanceSerializer
    http_methods_names = ['get', 'post', 'delete']
    filterset_fields = ['staff']

    def get_queryset(self):
        self.queryset = StaffAttendance.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = staff_attendance_add(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_staff_attendance(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('return_detailed_report'):
            response = get_staff_attendance_detailed(self, request)
        elif self.request.GET.get('download_department_wise_report'):
            response = get_department_wise_attendance_report(self, request)
            return response
        elif self.request.GET.get('return_intime_outtime_report'):
            response = get_staff_attendance_with_intime_outtime_detailed(self,request)
            return response
        else:
            response = get_staff_attendance(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class StaffUnmarkedAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAttendanceSerializer
    http_methods_names = ['get']

    def get_queryset(self):
        self.queryset = StaffAttendance.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_unmarked_attendance_for_date(self, request)
        return Response(response)


# {
# 	"max_hour": 2,
# 	"academic_year": 1,
# 	"staff": 1,
# 	"subject": [1,2]
# }
class StaffSubjectMappingViewSet(viewsets.ModelViewSet):
    queryset = StaffTeachingHour.objects.all()
    serializer_class = StaffTeachingHourSerializer
    http_methods_names = ['post']

    def create(self, request):
        response = add_subject_to_staff(self, request.data)
        return Response(response)


class GetStaffSubjectMappingViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'staff']

    def get_queryset(self):
        self.serializer_class = GetStaffTeachingHourSerializer
        self.queryset = StaffTeachingHour.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_staff_subject(self)
        return Response(response)


class StaffSubjectMapViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    queryset = StaffHourSubjectMapping.objects.all()

    def list(self, request, *args, **kwargs):
        response = get_staff_subject_mapping(self, request)
        return Response(response)


class LeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeSerializer
    http_methods_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = LeaveType.objects.all()
        return self.queryset

    def create(self, request):
        response = add_leavetype(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        self.queryset = self.get_queryset().filter(is_active=True)
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('current_financial_year', None):
            currentDate = datetime.date.today()
            financialYearData = FinancialYear.get_financial_year_for_date(self, currentDate)
            finYearId = financialYearData['id']
            response = {}
            response['data'] = self.get_queryset().filter(leavetypemapping__financial_year=finYearId).values()
        else:
            self.queryset = self.get_queryset().filter(is_active=True)
            response = SharedService.read_data(self, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        if request.data['code'] in LeaveType.get_default_leave_codes(self):
            raise exceptions.ValidationError('Cant edit default leave type')
        response = update_leave_type(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.values()[0]['code'] in LeaveType.get_default_leave_codes(self):
            raise exceptions.ValidationError('Cant delete default leave type')
        if self.queryset.filter(leavetypemapping__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Leave type is already mapped in leave plan')



class LeaveTypeMappingViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveTypeMappingSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['financial_year']

    def get_queryset(self):
        self.queryset = LeaveTypeMapping.objects.all()
        return self.queryset

    def create(self, request):  # add and update
        response = add_update_delete_leavetype_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):

        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_leaves_count(self)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        leaveTypeId = self.get_queryset().filter(id=self.get_object().id).values_list('leave_type', flat=True)
        if StaffLeaves.objects.filter(leave_type__in=leaveTypeId):
            raise exceptions.ValidationError('Staff have already applied for this leave types')
        else:
            self.get_object().delete()
            return Response({'Result': True, 'Reason': 'Data Deleted Successfully'})


class ApplyLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = StaffLeaveSerializers
    http_method_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['staff', 'leave_type']

    def get_queryset(self):
        self.queryset = StaffLeaves.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(is_active=True)
        response = add_applyleave(self,request, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = {'Result': False, 'Reason': 'Invalid Request'}
        try:
            response = delete_appliedLeave(self)
        except Exception as e:
            response['Reason'] = e.args
        return Response(response)

    def list(self, request, *args, **kwargs):
        staff_id = User.get_my_staff_id(self)
        filter_query = {
            'is_active': True,
            'staff': staff_id
        }
        if self.request.GET.get('approval_status'):
            filter_query['approval_status__in'] = self.request.GET.get('approval_status').split(',')
        queryset = self.get_queryset().filter(
            **filter_query
        ).annotate(
            todate=Max('staff_leave_date__fordate'),
            fromdate=Min('staff_leave_date__fordate')
        )
        if self.request.GET.get('ordering'):
            queryset = queryset.order_by(self.request.GET.get('ordering'))
        if self.request.GET.get('leave_type'):
            leave_types = [int(temp) for temp in self.request.GET.get('leave_type').split(',')]
            queryset = queryset.filter(leave_type__in=leave_types)
        serializer = GetStaffLeaveSerializers(queryset, many=True)
        if request.GET.get('pagination'):
            data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                    request.GET.get('limit'),
                                                                                    request.GET.get('pageno'))
            data = get_modify_leave_data(self, data)
            return Response({'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}})
        data = get_modify_leave_data(self, serializer.data)
        return Response({'data': data})

    # update used for cancel leave, Approve Leave, reject leave
    def update(self, request, pk=None):
        response = update(self, request.data, pk)
        return Response(response)


# Only For View
class LeaveApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = GetStaffLeaveSerializers
    http_method_names = ['get', 'post', 'delete', 'put']
    queryset = StaffLeaves.objects.all()
    filterset_fields = ['approval_status']

    def list(self, request, *args, **kwargs):
        response = leave_approval_view(self, request)
        return Response(response)


class StaffLeaveListViewSet(viewsets.ModelViewSet):
    serializer_class = StaffLeaveSerializers
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = StaffLeaves.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = recent_leaves_from_today(self, request)
        return Response(response)


class ApplyLeavePagination(viewsets.ModelViewSet):
    queryset = StaffLeaves.objects.all()
    serializer_class = StaffLeaveSerializers
    http_method_names = ['get']
    pagination_class = PostLimitOfsetPagination


class LeaveSummaryViewSet(viewsets.ModelViewSet):
    serializer_class = StaffLeaveSerializers

    def get_queryset(self):
        self.queryset = StaffLeaveDates.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_leave_summary_without_carryforward(self, request)
        return Response(response)



class DaysViewSet(viewsets.ModelViewSet):
    serializer_class = DaysSerializer
    http_methods_names = ['get']

    def get_queryset(self):
        self.queryset = Day.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, request)
        return Response(response)


class PeriodsViewSet(viewsets.ModelViewSet):
    serializer_class = PeriodPlanSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['academic_year']

    def get_object(self):
        return self.queryset.objects.get(id=self.kwargs['pk'])

    def get_queryset(self):
        self.queryset = PeriodPlan.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(is_active=True)
        if self.request.data.get('is_period_copy'):
            new_plan_name = request.data['new_plan_name']
            source_plan_id = request.data['source_plan_id']
            new_academic_year = request.data['new_academic_year']
            standards = request.data['standards']
            response = copy_period_plan_api(self, source_plan_id, new_plan_name, new_academic_year, standards)
        else:
            response = period_add(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = period_delete(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if request.GET.get('standard'):
            tempData = []
            for data in response['data']:
                if 'standard_list' in data and data['standard_list']:
                    for standardData in data['standard_list']:
                        if int(standardData['id']) == int(request.GET.get('standard')):
                            tempData.append(data)
                            continue
            response['data'] = tempData
        return Response(response)

    def retrieve(self, request, pk=None):
        self.queryset = PeriodPlan
        self.serializer_class = PeriodDetailedSerializer
        response = SharedService.read_data(self)
        return Response(response)

class TimeTableDateRangeViewSet(viewsets.ModelViewSet):
    serializer_class = TimeTableDateRangeSerializer
    http_methods_names = ['post', 'get', 'put']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = TimeTableDateRange.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = timetable_add(self, request.data)
        return Response(response)

    def update(self, request, pk=None):
        response = timetable_update(self, request.data, pk)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_date_range(self, request)
        return Response(response)


class TimeTableScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = TimeTableScheduleSerializer
    http_methods_names = ['post']
    filterset_fields = ['time_table_schedule_parent', 'staff']

    def get_queryset(self):
        self.queryset = TimeTableSchedule.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = timetable_schedule_add(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_scheduled_data(self, request)
        if self.request.GET.get('download_pdf'):
            selected_template, number_of_copies = get_selected_template(self, 'timetable', 'pdf', 'default_timetable.html')
            path = 'timetable/'+selected_template
            response['institute_data'] = InstituteSerializer(Institute.get_institute(self)).data
            #from django.shortcuts import render
            #return render(self.request, path, response)
            response = PDFService.receipt_new(self, response, "timetable", path, False)
            return response
        return Response(response)

class TimeTableScheduleParentViewSet(viewsets.ModelViewSet):
    serializer_class = TimeTableScheduleParentSerializer
    http_methods_names = ['post','get']
    filterset_fields = ['date_range', 'standard_section']

    def get_queryset(self):
        self.queryset = TimeTableScheduleParent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        validate_timetable_schedule_parent(self, request.data)
        response = SharedService.add_or_update_data(self, [request.data])
        return Response(response)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).first()
        serializer = self.get_serializer(queryset)
        if not serializer.data['date_range']:
            raise exceptions.ValidationError('Timetable not configured')
        return Response({'data': serializer.data})

class TimeTableStaffAssignedViewSet(viewsets.ModelViewSet):
    serializer_class = PeriodPlanSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = PeriodPlan.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_staff_assigned_timetable(self, request)
        return Response(response)

class TimetableRequestChangeViewSet(viewsets.ModelViewSet):
    serializer_class = TimetableRequestForChangeSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = TimetableRequestForChange.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_request_change_data(self, request)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_request_change(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk']).delete()
        return Response({'Reason': 'Data Deleted Successfully'})

class ApproveTimetableRequestChangeViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        data = request.data
        instance = TimetableRequestForChange.objects.get(id=data['id'])
        existing_data_except_current = TimetableRequestForChange.objects.filter(timetable_schedule=data['timetable_schedule']).exclude(
            id=data['id']
        ).values()
        for existing in existing_data_except_current:
            obj = TimetableRequestForChange.objects.get(id=existing['id'])
            ApprovalService.get_approval_status(
                self, obj, 'Data is already approved for other staff for the date'
            )
        return Response(ApprovalService.update_approval_status(
            self, instance, data['approval_status'], 'Already Approved',
                                                      data['reason']))

class GetStaffTimeTableViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        filter_query = {'is_active': True}
        if self.request.GET.get('branch'):
            filter_query = {'branch': self.request.GET.get('branch')}
        if self.request.GET.get('board'):
            filter_query = {'board': self.request.GET.get('board')}
        self.queryset = TimeTableSchedule.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_staff_timetable_for_daterange(self, request.GET.get('date_range'), request.GET.get('staff'))
        return Response(response)


class StaffAttendanceBulkViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAttendanceSerializer
    http_method_names = ['post', 'put']

    def get_queryset(self):
        self.queryset = StaffAttendance.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        # Route to separate custom function when attendance_ids or staff_attendance_pairs present (bulk edit)
        if request.data.get('attendance_ids') or request.data.get('staff_attendance_pairs'):
            response = custom_bulk_attendance_edit(self, request.data)
        else:
            response = staff_attendance_bulk(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        # PUT method routes to custom_bulk_attendance_edit
        response = custom_bulk_attendance_edit(self, request.data)
        return Response(response)
    
    @action(detail=False, methods=['put'])
    def bulk_update(self, request):
        """
        Custom action for bulk updating attendance without requiring an ID in the URL
        """
        try:
            # Check if this is a bulk edit (has in_time/out_time fields for editing) or just status update
            # Note: for_date is used in both cases, so we check for in_time/out_time instead
            # Also check if staff_attendance_pairs is present (status-only update for unmarked records)
            if 'in_time' in request.data or 'out_time' in request.data:
                # Bulk edit with date/time/status
                response = bulk_update_attendance_details(self, request.data)
            else:
                # Bulk update status only (supports both attendance_ids and staff_attendance_pairs)
                response = bulk_update_attendance_status(self, request.data)
            return Response(response)
        except exceptions.ValidationError as e:
            return Response({'Result': False, 'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'Result': False, 'detail': f'An error occurred: {str(e)}'}, status=500)
    
    def update(self, request, *args, **kwargs):
        """
        Handle PUT requests with ID (for single record updates if needed)
        For bulk updates, use the bulk_update action instead
        """
        try:
            # Check if this is a bulk edit (has in_time/out_time fields for editing) or just status update
            if 'in_time' in request.data or 'out_time' in request.data:
                # Bulk edit with date/time/status
                response = bulk_update_attendance_details(self, request.data)
            else:
                # Bulk update status only
                response = bulk_update_attendance_status(self, request.data)
            return Response(response)
        except exceptions.ValidationError as e:
            return Response({'Result': False, 'detail': str(e)}, status=400)
        except Exception as e:
            return Response({'Result': False, 'detail': f'An error occurred: {str(e)}'}, status=500)

class GetTodayTimeTablePeriodViewSet(viewsets.ModelViewSet):
    serializer_class = PeriodDayMappingSerializer
    http_method_names = ['get']

    def get_queryset(self):
        standard = self.request.GET.get('standard')
        for_date = self.request.GET.get('for_date')
        date_object = datetime.datetime.strptime(for_date, "%Y-%m-%d").date()
        academicYear = AcademicYear.get_academic_year_for_date(self, date_object , True)
        period_data = PeriodDayMapping.objects.filter(day__name = date_object.strftime("%A"),period__period_plan__academic_year=academicYear)
        matching_ids = [
            record.id for record in period_data 
            if standard in record.period.period_plan.standard.split(',')
        ]
        self.queryset = PeriodDayMapping.objects.filter(id__in = matching_ids)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class AutoTimetableGeneratorViewSet(viewsets.ViewSet):
    """
    Automated Timetable Generation System (ATGS)
    Generates timetables automatically based on constraints
    """
    http_method_names = ['post', 'get']
    
    def create(self, request):
        """Generate timetable automatically"""
        response = auto_generate_timetable(request, request.data)
        return Response(response)
    
    def list(self, request):
        """Apply a generated timetable draft"""
        # For applying, we'll use POST to a different endpoint
        # This list method can be used for getting generation status
        return Response({'message': 'Use POST to generate timetable'})


class ApplyGeneratedTimetableViewSet(viewsets.ViewSet):
    """
    Apply a generated timetable draft to the database
    """
    http_method_names = ['post']
    
    def create(self, request):
        """Apply generated timetable"""
        response = apply_generated_timetable(request, request.data)
        return Response(response)


class BulkTimetableAssignmentViewSet(viewsets.ViewSet):
    """
    Bulk Timetable Assignment ViewSet
    Handles both GET (to fetch data) and POST (to save assignments)
    """
    http_method_names = ['get', 'post']
    
    def list(self, request):
        """Get bulk timetable data (periods, days, staff, subjects, etc.)"""
        response = get_bulk_timetable_data(self, request)
        return Response(response)
    
    def create(self, request):
        """Save bulk timetable assignments"""
        response = bulk_timetable_assignment(self, request.data)
        return Response(response)


class TeacherTimetableViewSet(viewsets.ViewSet):
    """
    Get timetable for a specific teacher
    """
    http_method_names = ['get']
    
    def retrieve(self, request, pk=None):
        """Get teacher timetable"""
        response = get_teacher_timetable(request, pk)
        return Response({'data': response})


class RoomTimetableViewSet(viewsets.ViewSet):
    """
    Get timetable for a specific room
    """
    http_method_names = ['get']
    
    def retrieve(self, request, pk=None):
        """Get room timetable"""
        response = get_room_timetable(request, pk)
        return Response({'data': response})


class ClassTimetableViewSet(viewsets.ViewSet):
    """
    Get timetable for a specific class/section
    """
    http_method_names = ['get']
    
    def retrieve(self, request, pk=None):
        """Get class timetable"""
        response = get_class_timetable(request, pk)
        return Response({'data': response})


class TimetableConflictReportViewSet(viewsets.ViewSet):
    """
    Get conflict report for all timetables
    """
    http_method_names = ['get']
    
    def list(self, request):
        """Get conflict report"""
        response = get_conflict_report(request)
        return Response({'data': response})
