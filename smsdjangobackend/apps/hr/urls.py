from django.urls import path
from rest_framework import routers

from apps.hr.views import ( ShiftViewSet, AssignShiftViewSet, GetUnassignedShift, StaffAttendanceViewSet, StaffSubjectMappingViewSet,
                            LeaveTypeViewSet, LeaveTypeMappingViewSet,GetStaffSubjectMappingViewSet, ApplyLeaveViewSet,
                            ApplyLeavePagination,
                            LeaveSummaryViewSet, StaffLeaveListViewSet, LeaveApprovalViewSet, StaffSubjectMapViewSet,
                            StaffUnmarkedAttendanceViewSet, DaysViewSet, PeriodsViewSet, TimeTableDateRangeViewSet,
                            TimeTableScheduleViewSet, TimeTableScheduleParentViewSet, TimeTableStaffAssignedViewSet,
                            TimetableRequestChangeViewSet, ApproveTimetableRequestChangeViewSet, GetStaffTimeTableViewSet,
                            StaffAttendanceBulkViewSet,GetTodayTimeTablePeriodViewSet, AutoTimetableGeneratorViewSet,
                            ApplyGeneratedTimetableViewSet, BulkTimetableAssignmentViewSet, TeacherTimetableViewSet,
                            RoomTimetableViewSet, ClassTimetableViewSet, TimetableConflictReportViewSet
                            )


router = routers.DefaultRouter()
router.register(r'shift', ShiftViewSet, basename='shift'),
router.register(r'assignshift', AssignShiftViewSet, basename='assignshift'),
router.register(r'getunassigned', GetUnassignedShift, basename='getunassigned'), #get unassigned and assigned shifts
router.register(r'staffattendance', StaffAttendanceViewSet, basename='staffattendance')
router.register(r'staffattendancebulk', StaffAttendanceBulkViewSet, basename='staffattendancebulk')
router.register(r'staffunmarkedattendance', StaffUnmarkedAttendanceViewSet, basename='staffunmarkedattendance')
router.register(r'staffsubject', StaffSubjectMappingViewSet, basename='staffsubject')
router.register(r'leavetype', LeaveTypeViewSet, basename='leavetype')
router.register(r'leaveplan', LeaveTypeMappingViewSet, basename='leaveplan')
router.register(r'getstaffsubject', GetStaffSubjectMappingViewSet, basename='getstaffsubject')
router.register(r'getstaffsubmapping', StaffSubjectMapViewSet, basename='getstaffsubmapping')
router.register(r'applyleave', ApplyLeaveViewSet, basename='applyleave')
router.register(r'applyleavepagination', ApplyLeavePagination, basename='applyleavepagination')
router.register(r'leavesummary', LeaveSummaryViewSet, basename='leavesummary')
router.register(r'staffleavelist', StaffLeaveListViewSet, basename='staffleavelist')
router.register(r'leaveapprovalview', LeaveApprovalViewSet, basename='leaveapprovalview')
router.register(r'days', DaysViewSet, basename='days')
router.register(r'period', PeriodsViewSet, basename='period')
router.register(r'timetabledaterange', TimeTableDateRangeViewSet, basename='timetabledaterange')
router.register(r'assigntimetable', TimeTableScheduleViewSet, basename='assigntimetable')
router.register(r'assigntimetableparent', TimeTableScheduleParentViewSet, basename='assigntimetableparent')
router.register(r'timetablestaffassigned', TimeTableStaffAssignedViewSet, basename='timetablestaffassigned')
router.register(r'timetablerequestchange', TimetableRequestChangeViewSet, basename='timetablerequestchange')
router.register(r'approvetimetablerequestchange', ApproveTimetableRequestChangeViewSet, basename='approvetimetablerequestchange')
router.register(r'getstafftimetable', GetStaffTimeTableViewSet, basename='getstafftimetable')
router.register(r'gettodaytimetableperiod', GetTodayTimeTablePeriodViewSet, basename='gettodaytimetableperiod')
router.register(r'autogeneratetimetable', AutoTimetableGeneratorViewSet, basename='autogeneratetimetable')
router.register(r'applygeneratedtimetable', ApplyGeneratedTimetableViewSet, basename='applygeneratedtimetable')
router.register(r'bulktimetableassignment', BulkTimetableAssignmentViewSet, basename='bulktimetableassignment')
router.register(r'teachertimetable', TeacherTimetableViewSet, basename='teachertimetable')
router.register(r'roomtimetable', RoomTimetableViewSet, basename='roomtimetable')
router.register(r'classtimetable', ClassTimetableViewSet, basename='classtimetable')
router.register(r'timetableconflicts', TimetableConflictReportViewSet, basename='timetableconflicts')


# router.register(r'noofdayappliedleave', NumberOfDayLeaveViewSet, basename='noofdayappliedleave')

# router.register(r'periods', PeriodsViewSet, basename='periods')

urlpatterns = router.urls
