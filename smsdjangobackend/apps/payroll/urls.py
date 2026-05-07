from rest_framework import routers

from apps.payroll.views import (SalaryComponentViewSet, SalaryPlanViewSet, SalaryPlanGenerateViewSet,
                                SalaryEmployeePlanViewSet, SalaryEmployeeMonthPlanViewSet,
                                SalaryEmployeeYearPlanViewSet, PaySlipViewSet, DownloadStaffSalaryViewSet,
                                SalaryFormulaViewSet, SalaryFormulaRuleViewSet,
                                SalaryEmployeeOverrideViewSet, SalaryEmployeeIncrementViewSet,
                                FormulaPayrollGenerateViewSet,
                                PayrollDashboardViewSet,
                                PayrollSummaryViewSet,
                                StaffSalaryViewSet,
                                StaffManualAttendanceViewSet)

router = routers.DefaultRouter()
router.register(r'salarycomponent', SalaryComponentViewSet, basename='salarycomponent')
router.register(r'salaryplan', SalaryPlanViewSet, basename='salaryplan')
router.register(r'salaryplangenerate', SalaryPlanGenerateViewSet, basename='salaryplangenerate')
router.register(r'salaryemployeeplan', SalaryEmployeePlanViewSet, basename='salaryemployeeplan')
router.register(r'salaryemployeemonthplan', SalaryEmployeeMonthPlanViewSet, basename='salaryemployeemonthplan')
router.register(r'payslip', PaySlipViewSet, basename='payslip')
router.register(r'salaryemployeeyearplan', SalaryEmployeeYearPlanViewSet, basename='salaryemployeeyearplan')
router.register(r'downloadstaffsalary', DownloadStaffSalaryViewSet, basename='downloadstaffsalary')

# Formula-Based Payroll Engine
router.register(r'staffsalary', StaffSalaryViewSet, basename='staffsalary')
router.register(r'salaryformula', SalaryFormulaViewSet, basename='salaryformula')
router.register(r'salaryformularule', SalaryFormulaRuleViewSet, basename='salaryformularule')
router.register(r'salaryoverride', SalaryEmployeeOverrideViewSet, basename='salaryoverride')
router.register(r'salaryincrement', SalaryEmployeeIncrementViewSet, basename='salaryincrement')
router.register(r'formulapayrollgenerate', FormulaPayrollGenerateViewSet, basename='formulapayrollgenerate')

# Dashboard
router.register(r'dashboard', PayrollDashboardViewSet, basename='payroll-dashboard')

# Payroll Summary
router.register(r'payrollsummary', PayrollSummaryViewSet, basename='payrollsummary')

# Manual Attendance
router.register(r'staffmanualattendance', StaffManualAttendanceViewSet, basename='staffmanualattendance')

urlpatterns = router.urls
