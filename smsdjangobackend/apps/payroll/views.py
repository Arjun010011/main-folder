from datetime import date, datetime
import calendar  
from django.db.models import Q
from rest_framework import viewsets, exceptions
from rest_framework.response import Response

from apps.payroll.models.payroll import (SalaryComponent, SalaryPlan, SalaryEmployeePlan, SalaryEmployeeMonthPlan,
                                         SalaryFormula, SalaryFormulaRule,
                                         SalaryEmployeeOverride, SalaryEmployeeIncrement,
                                         StaffManualAttendance)
from apps.payroll.serializers import (SalaryComponentSerializer, SalaryPlanSerializer, SalaryEmployeePlanSerializer,
                                      SalaryEmployeeMonthPlanSerializer,
                                      SalaryFormulaSerializer, SalaryFormulaReadSerializer,
                                      SalaryFormulaRuleSerializer, SalaryFormulaRuleReadSerializer,
                                      SalaryEmployeeOverrideSerializer, SalaryEmployeeOverrideReadSerializer,
                                      SalaryEmployeeIncrementSerializer, SalaryEmployeeIncrementReadSerializer,
                                      StaffManualAttendanceReadSerializer)
from apps.payroll.services.payroll import (get_payslip_month, generate_salary_employee_year_plan, get_payslip)
from apps.payroll.services.payroll_calculation import salary_plan_add_update, generate_salary_plan, get_salary_plan
from apps.payroll.services.payroll_component import (add_salary_component, delete_salary_component,
                                                     update_salary_component, get_salary_component)
from apps.payroll.services.payroll_employee import (download_staff_salary_bulk, generate_salary_employee_plan, add_salary_employee_plan,
                                                    generate_salary_employee_month_plan, add_salary_employee_month_plan)
from apps.payroll.services.payroll_engine import (
    toggle_rule_active, validate_formula_rules,
    apply_salary_override, apply_salary_increment,
    generate_formula_salary, generate_formula_salary_bulk,
    lock_formula_salaries, get_attendance_preview, formula_preview,
)
from apps.payroll.services.payroll_formula_service import seed_preset_formula
from apps.payroll.services.dashboard import (
    get_payroll_summary, get_monthly_payroll_trend,
    get_top_earners, get_component_breakdown,
    get_payroll_summary_table, download_payroll_summary_excel,
)

from apps.shared.services import SharedService
from apps.staffs.models import Staff, StaffSalary
from apps.staffs.serializers import StaffAllDetailSerializer, StaffSalarySerializer
from apps.payroll.services.payroll_engine import load_manual_attendance, bulk_update_manual_attendance


class SalaryComponentViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryComponentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'is_deduction']

    def get_queryset(self):
        self.queryset = SalaryComponent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_salary_component(self, request.data['salary_components'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_salary_component(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_salary_component(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_salary_component(self)
        return Response(response)


class SalaryPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryPlanSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['financial_year']

    def get_queryset(self):
        self.queryset = SalaryPlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = salary_plan_add_update(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_salary_plan(self)
        return Response(response)


class SalaryPlanGenerateViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryPlanSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = SalaryPlan.objects.filter(financial_year=self.request.GET.get('financial_year'))
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = generate_salary_plan(self)
        return Response(response)


class SalaryEmployeePlanViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryEmployeePlanSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['staff']

    def get_queryset(self):
        self.queryset = SalaryEmployeePlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_salary_employee_plan(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.is_approved:
            raise exceptions.ValidationError('Data is Approved!')
        instance.delete()
        return Response({'Reason': 'Data is deleted Successfully!'})

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = generate_salary_employee_plan(self)
        return Response(response)


class SalaryEmployeeMonthPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryEmployeeMonthPlanSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['staff']

    def get_queryset(self):
        self.queryset = SalaryEmployeeMonthPlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_salary_employee_month_plan(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_payslip_month(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = generate_salary_employee_month_plan(self)
        return Response(response)


class PaySlipViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAllDetailSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = Staff.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_payslip(self, self.request.GET.get('salary_month'))
        return response

    def list(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class SalaryEmployeeYearPlanViewSet(viewsets.ModelViewSet):
    serializer_class = SalaryEmployeeMonthPlanSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = SalaryEmployeeMonthPlan.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = generate_salary_employee_year_plan(self)
        return Response(response)

class DownloadStaffSalaryViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAllDetailSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return Staff.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        month = self.request.GET.get('salary_month')
        if not month:
            raise exceptions.ValidationError('salary_month is mandatory')
        financial_year = self.request.GET.get('financial_year')
        response = download_staff_salary_bulk(self, month, financial_year)
        return response


class SalaryFormulaViewSet(viewsets.ModelViewSet):

    serializer_class = SalaryFormulaSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['financial_year', 'is_default', 'is_active']

    def get_queryset(self):
        self.queryset = SalaryFormula.objects.select_related('financial_year').filter(is_active=True)
        return self.queryset

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryFormulaReadSerializer
        return SalaryFormulaSerializer

    def create(self, request, *args, **kwargs):
        is_default = str(request.data.get('is_default', False)).lower() in ['true', '1', 'yes']
        if is_default:
            today = date.today()
            current_month = date(today.year, today.month, 1)
            if SalaryEmployeeMonthPlan.objects.filter(salary_month=current_month, is_active=True).exists():
                raise exceptions.ValidationError('Cannot set default formula: Salary records have already been generated for the current month.')

        response = SharedService.add_data(self, request.data, isList=False)
        
        if is_default and response.get('id'):
            SalaryFormula.objects.filter(is_default=True).exclude(pk=response['id']).update(is_default=False)
            
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        
        if 'is_default' in request.data:
            is_default = str(request.data.get('is_default', False)).lower() in ['true', '1', 'yes']
            if is_default and not instance.is_default:
                today = date.today()
                current_month = date(today.year, today.month, 1)
                if SalaryEmployeeMonthPlan.objects.filter(salary_month=current_month, is_active=True).exists():
                    raise exceptions.ValidationError('Cannot switch default formula: Salary records have already been generated for the current month. Please delete them first.')

        response = SharedService.update_data(self, request.data, **kwargs)
        
        instance.refresh_from_db()
        if instance.is_default:
            SalaryFormula.objects.filter(is_default=True).exclude(pk=instance.pk).update(is_default=False)
            
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, isList=True)
        return Response(response)


class SalaryFormulaRuleViewSet(viewsets.ModelViewSet):

    serializer_class = SalaryFormulaRuleSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    filterset_fields = ['formula', 'salary_component', 'calculation_type', 'is_active']

    def get_queryset(self):
        self.queryset = SalaryFormulaRule.objects.select_related(
            'formula', 'salary_component', 'base_component',
        ).all()
        return self.queryset

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryFormulaRuleReadSerializer
        return SalaryFormulaRuleSerializer

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['created_by'] = request.user.id if request.user else None
        data['modified_by'] = request.user.id if request.user else None
        response = SharedService.add_data(self, data, isList=False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        data = request.data.copy()
        data['modified_by'] = request.user.id if request.user else None
        response = SharedService.update_data(self, data, **kwargs)
        return Response(response)

    def partial_update(self, request, *args, **kwargs):
        rule = self.get_object()
        is_active = request.data.get('is_active')
        if is_active is None:
            raise exceptions.ValidationError('is_active is required for PATCH.')
        response = toggle_rule_active(
            formula_id=rule.formula_id,
            rule_id=rule.id,
            is_active=bool(is_active),
            user=request.user,
        )
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        validate = request.GET.get('validate', '').lower() == 'true'
        formula_id = request.GET.get('formula')

        response = SharedService.read_data(self, isList=True)

        if validate and formula_id:
            validation = validate_formula_rules(formula_id)
            if isinstance(response, dict):
                response['validation'] = validation

        return Response(response)


class SalaryEmployeeOverrideViewSet(viewsets.ModelViewSet):

    serializer_class = SalaryEmployeeOverrideSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['staff', 'salary_year', 'salary_month', 'salary_component', 'is_permanent']

    def get_queryset(self):
        self.queryset = SalaryEmployeeOverride.objects.select_related(
            'staff', 'salary_component', 'month_plan',
        ).all()
        return self.queryset

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryEmployeeOverrideReadSerializer
        return SalaryEmployeeOverrideSerializer

    def create(self, request, *args, **kwargs):
        response = apply_salary_override(self, request.data, user=request.user)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.month_plan and instance.month_plan.is_locked and not instance.is_permanent:
            raise exceptions.ValidationError('Cannot update non-permanent override on locked salary record.')
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.month_plan and instance.month_plan.is_locked and not instance.is_permanent:
            raise exceptions.ValidationError('Cannot delete non-permanent override on locked salary record.')
        instance.delete()
        return Response({'Reason': 'Override deleted successfully.'})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, isList=True)
        return Response(response)


class SalaryEmployeeIncrementViewSet(viewsets.ModelViewSet):

    serializer_class = SalaryEmployeeIncrementSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['staff', 'increment_type', 'applied', 'calculation_mode']

    def get_queryset(self):
        self.queryset = SalaryEmployeeIncrement.objects.select_related(
            'staff', 'employee_plan',
        ).all()
        return self.queryset

    def get_serializer_class(self):
        if self.action in ('list', 'retrieve'):
            return SalaryEmployeeIncrementReadSerializer
        return SalaryEmployeeIncrementSerializer

    def create(self, request, *args, **kwargs):
        response = apply_salary_increment(self, request.data, user=request.user)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.applied:
            raise exceptions.ValidationError('Cannot delete an already applied increment.')
        instance.delete()
        return Response({'Reason': 'Increment record deleted successfully.'})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, isList=True)
        return Response(response)


class FormulaPayrollGenerateViewSet(viewsets.ModelViewSet):

    serializer_class = SalaryEmployeeMonthPlanSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = SalaryEmployeeMonthPlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        action = request.data.get('action', '').strip().lower()

        if action == 'generate':
            response = generate_formula_salary(self, request.data, user=request.user)

        elif action == 'generate_bulk':
            response = generate_formula_salary_bulk(self, request.data, user=request.user)

        elif action == 'lock':
            response = lock_formula_salaries(self, request.data, user=request.user)

        elif action == 'seed_preset':
            financial_year = request.data.get('financial_year')
            preset_key     = request.data.get('preset_key', '').strip().upper()

            if not financial_year:
                raise exceptions.ValidationError('financial_year is required for seed_preset.')
            if not preset_key:
                raise exceptions.ValidationError('preset_key is required for seed_preset.')

            response = seed_preset_formula(financial_year, preset_key, user=request.user)

        elif action == 'attendance_preview':
            response = get_attendance_preview(self, request.data, user=request.user)

        elif action == 'formula_preview':
            formula_id = request.data.get('formula')
            staff_id = request.data.get('staff')
            if not formula_id:
                raise exceptions.ValidationError('formula is required for formula_preview.')
            if not staff_id:
                raise exceptions.ValidationError('staff is required for formula_preview.')
            response = formula_preview(
                formula_id=formula_id,
                staff_id=staff_id,
                salary_month=request.data.get('salary_month'),
            )

        else:
            raise exceptions.ValidationError(
                'Unknown action "{}". '
                'Supported: generate, generate_bulk, lock, seed_preset, attendance_preview, formula_preview.'.format(action)
            )

        return Response(response)


class StaffSalaryViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSalarySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['staff', 'is_active']

    def get_queryset(self):
        self.queryset = StaffSalary.objects.select_related('staff').filter(is_active=True).order_by("staff__first_name")
        return self.queryset

    def _check_payroll_exists(self, staff_id):
        if SalaryEmployeeMonthPlan.objects.filter(
            staff_id=staff_id, is_active=True
        ).exists():
            raise exceptions.ValidationError(
                'Cannot modify salary — payroll records already exist for this staff. '
                'Use Salary Increment to change salary going forward.'
            )

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.staff_id:
            self._check_payroll_exists(instance.staff_id)
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.staff_id:
            self._check_payroll_exists(instance.staff_id)
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, isList=True)
        return Response(response)


class PayrollDashboardViewSet(viewsets.ViewSet):
    
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        month_param = request.GET.get('month')
        target_month = None
        if month_param:
            try:
                target_month = datetime.strptime(month_param, '%Y-%m').date()
            except ValueError:
                pass

        return Response({
            'status': 200,
            'data': {
                'summary': get_payroll_summary(),
                'monthly_trend': get_monthly_payroll_trend(),
                'top_earners': get_top_earners(month=target_month),
                'component_breakdown': get_component_breakdown(month=target_month),
            }
        })

class PayrollSummaryViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        salary_month_str = request.GET.get('salary_month')
        extn = request.GET.get('extn', '').lower()

        if not salary_month_str:
            raise exceptions.ValidationError('salary_month is required (YYYY-MM).')
        try:
            parsed = datetime.strptime(salary_month_str, '%Y-%m').date()
        except (ValueError, TypeError):
            raise exceptions.ValidationError('salary_month must be YYYY-MM format.')

        salary_month = date(parsed.year, parsed.month, 1)

        if extn == 'xlsx':
            return download_payroll_summary_excel(self, salary_month)

        result = get_payroll_summary_table(salary_month)
        return Response({
            'status': 200,
            **result,
        })


class StaffManualAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = StaffManualAttendanceReadSerializer
    http_method_names = ['get', 'post', 'put']

    def get_queryset(self):
        self.queryset = StaffManualAttendance.objects.select_related('staff').filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        salary_month_str = request.data.get('salary_month')
        if not salary_month_str:
            raise exceptions.ValidationError('salary_month is required.')
        try:
            salary_month = date.fromisoformat(str(salary_month_str))
        except (TypeError, ValueError):
            raise exceptions.ValidationError('salary_month must be in YYYY-MM-DD format.')

        records, has_staff_attendance, created_count = load_manual_attendance(salary_month)

        serializer = StaffManualAttendanceReadSerializer(records, many=True)
        return Response({
            'Reason': f'Loaded {records.count()} records ({created_count} new).',
            'data': serializer.data,
            'has_staff_attendance': has_staff_attendance,
        })

    def update(self, request, *args, **kwargs):
        is_bulk = request.GET.get('is_bulk', '').lower() == 'true'
        if not is_bulk:
            raise exceptions.ValidationError('Only bulk update (is_bulk=true) is supported.')

        updated_count = bulk_update_manual_attendance(request.data.get('updates', []))

        return Response({
            'Reason': f'Updated {updated_count} attendance record(s).',
            'count': updated_count,
        })

    def list(self, request, *args, **kwargs):
        salary_month = request.GET.get('salary_month')
        if salary_month:
            self.queryset = self.get_queryset().filter(salary_month=salary_month)
        response = SharedService.read_data_paginated(self, isList=True)
        return Response(response)
