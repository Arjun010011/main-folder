import ast
import operator as op
import math
import logging
import calendar
from decimal import Decimal, ROUND_HALF_UP
from datetime import date, datetime, timedelta

from django.db import models, transaction
from rest_framework import exceptions

from apps.payroll.models.payroll import (
    SalaryFormula, SalaryFormulaRule,
    SalaryEmployeePlan, SalaryEmployeeMonthPlan,
    SalaryEmployeeOverride, SalaryEmployeeIncrement,
    SalaryComponent, PayrollFormulaAuditLog,
    StaffManualAttendance,
)
from apps.payroll.serializers import SalaryEmployeeMonthPlanSerializer
from apps.finance.services.salary_advance_payroll import get_recovery_details_for_payroll, create_recovery_from_payroll, check_payroll_period_processed
from apps.staffs.models import Staff, AccountDetail

from apps.tenants.services.middlewares import get_current_db_name
from apps.hr.models import AssignShift, Day
from apps.hr.models.staffAttendance import StaffAttendance
from apps.general.models import HolidayCalender
from apps.hr.services.default_varialbes import get_lop_attendance_list
from apps.shared.services import SharedService
from apps.staffs.models import StaffSalary as StaffSalaryModel
from apps.staffs.models import AccountDetail as AccDetail


logger = logging.getLogger(__name__)

_SAFE_OPS = {
    ast.Add:  op.add,
    ast.Sub:  op.sub,
    ast.Mult: op.mul,
    ast.Div:  op.truediv,
    ast.USub: op.neg,
    ast.UAdd: op.pos,
    ast.Eq:   op.eq,
    ast.NotEq: op.ne,
    ast.Lt:   op.lt,
    ast.LtE:  op.le,
    ast.Gt:   op.gt,
    ast.GtE:  op.ge,
    ast.Mod:  op.mod,
    ast.Pow:  op.pow,
    ast.FloorDiv: op.floordiv,
}

_SAFE_FUNCS = {
    'min': min,
    'max': max,
    'round': round,
    'abs': abs,
    'ceil': math.ceil,
    'floor': math.floor,
    'int': int,
    'float': float,
}


def _ast_eval(node, ns):
    if isinstance(node, ast.Num):
        return float(node.n)
    if isinstance(node, ast.Constant):
        if isinstance(node.value, bool):  
             return node.value
        if not isinstance(node.value, (int, float)):
            raise ValueError(
                f'Only numeric and boolean constants are allowed, got: {type(node.value).__name__}'
            )
        return float(node.value)
    if isinstance(node, ast.Name):
        key = node.id
        if key in ns:
            return ns[key]
        if key.upper() in ns:
            return ns[key.upper()]
        raise ValueError(
            f'Unknown variable "{key}". Available: {sorted(ns.keys())}'
        )
    if isinstance(node, ast.BinOp):
        op_fn = _SAFE_OPS.get(type(node.op))
        if not op_fn:
            raise ValueError(f'Operator not allowed: {type(node.op).__name__}')
        left  = _ast_eval(node.left,  ns)
        right = _ast_eval(node.right, ns)
        if isinstance(node.op, (ast.Div, ast.FloorDiv)) and right == 0:
            raise ValueError('Division by zero in expression.')
        return op_fn(left, right)
    if isinstance(node, ast.UnaryOp):
        op_fn = _SAFE_OPS.get(type(node.op))
        if not op_fn:
            raise ValueError(f'Unary operator not allowed: {type(node.op).__name__}')
        return op_fn(_ast_eval(node.operand, ns))
    
    if isinstance(node, ast.Compare):
        left = _ast_eval(node.left, ns)
        for operation, comparator in zip(node.ops, node.comparators):
            op_fn = _SAFE_OPS.get(type(operation))
            if not op_fn:
                raise ValueError(f'Comparison operator not allowed: {type(operation).__name__}')
            right = _ast_eval(comparator, ns)
            if not op_fn(left, right):
                return False
            left = right
        return True

    if isinstance(node, ast.Call):
        if not isinstance(node.func, ast.Name):
             raise ValueError('Function calls must be by name only.')
        func_name = node.func.id
        if func_name not in _SAFE_FUNCS:
             raise ValueError(f'Function "{func_name}" is not allowed.')
        
        args = [_ast_eval(arg, ns) for arg in node.args]
        return _SAFE_FUNCS[func_name](*args)

    if isinstance(node, ast.IfExp):
        test_val = _ast_eval(node.test, ns)
        if test_val:
            return _ast_eval(node.body, ns)
        else:
            return _ast_eval(node.orelse, ns)

    if isinstance(node, ast.BoolOp):
        values = [_ast_eval(val, ns) for val in node.values]
        if isinstance(node.op, ast.And):
            return all(values)
        if isinstance(node.op, ast.Or):
            return any(values)

    raise ValueError(f'Expression node type not allowed: {type(node).__name__}')


def safe_eval_expression(expression, ns):
    
    try:
        tree = ast.parse(expression.strip(), mode='eval')
    except SyntaxError as exc:
        raise ValueError(f'Invalid expression syntax: {exc}')
    return _ast_eval(tree.body, ns)


def validate_expression_syntax(expression):
    
    try:
        tree = ast.parse(expression.strip(), mode='eval')
        for node in ast.walk(tree):
            if isinstance(node, (ast.Call, ast.Attribute, ast.Import,
                                  ast.ImportFrom, ast.FunctionDef)):
                return {
                    'valid': False,
                    'error': f'Forbidden node type: {type(node).__name__}',
                }
        return {'valid': True, 'error': None}
    except SyntaxError as exc:
        return {'valid': False, 'error': str(exc)}

def _build_dependency_graph(rules):
    
    graph, id_to_name = {}, {}
    for rule in rules:
        if not rule.salary_component:
            continue
        cid = rule.salary_component.id
        id_to_name[cid] = rule.salary_component.name
        graph[cid] = rule.base_component.id if rule.base_component else None
    return graph, id_to_name


def _dfs_cycle(start, graph, visiting, visited):
    
    visiting.add(start)
    neighbor = graph.get(start)
    if neighbor is not None:
        if neighbor in visiting:
            return [neighbor, start]      
        if neighbor not in visited:
            path = _dfs_cycle(neighbor, graph, visiting, visited)
            if path:
                return [start] + path
    visiting.discard(start)
    visited.add(start)
    return []


def detect_circular_dependencies(rules):
    
    graph, id_to_name = _build_dependency_graph(rules)
    visited = set()
    for node in list(graph.keys()):
        if node not in visited:
            cycle = _dfs_cycle(node, graph, set(), visited)
            if cycle:
                return {
                    'has_cycle': True,
                    'cycle': [id_to_name.get(n, str(n)) for n in cycle],
                }
    return {'has_cycle': False, 'cycle': []}

def _build_formula_snapshot(formula, rules):
    
    return {
        'formula_id':   formula.id,
        'formula_name': formula.name,
        'captured_at':  datetime.utcnow().isoformat(),
        'rules': [
            {
                'sequence':         r.sequence,
                'component':        r.salary_component.name    if r.salary_component else None,
                'codename':         r.salary_component.codename if r.salary_component else None,
                'is_deduction':     r.salary_component.is_deduction if r.salary_component else None,
                'calculation_type': r.calculation_type,
                'value':            str(r.value) if r.value is not None else None,
                'base_component':   r.base_component.name    if r.base_component else None,
                'base_codename':    r.base_component.codename if r.base_component else None,
                'expression':       r.expression,
            }
            for r in rules if r.salary_component
        ],
    }


def _formula_version(formula, rules):
    
    modified = max(
        (r.modified_at for r in rules if getattr(r, 'modified_at', None)),
        default=datetime.utcnow(),
    )
    epoch = int(modified.timestamp()) if hasattr(modified, 'timestamp') else 0
    return f'f{formula.id}_r{len(rules)}_m{epoch}'

def _audit(action, user=None, formula=None, staff=None, salary_month=None, details=None):

    try:
        PayrollFormulaAuditLog.objects.create(
            action=action,
            formula=formula,
            staff=staff,
            salary_month=salary_month,
            performed_by=user if (user and hasattr(user, 'pk')) else None,
            details=details or {},
        )
    except Exception as exc:
        logger.warning('Audit log failed [%s]: %s', action, exc)

def get_historical_staff_salary(staff, year, month):
    
    last_day = calendar.monthrange(year, month)[1]
    target_date = date(year, month, last_day)

    salary_row = StaffSalaryModel.objects.filter(
        staff=staff, is_active=True,
        from_date__lte=target_date,
    ).filter(
        models.Q(to_date__gte=date(year, month, 1)) | models.Q(to_date__isnull=True)
    ).order_by('-from_date').first()

    if not salary_row:
        salary_row = StaffSalaryModel.objects.filter(
            staff=staff, is_active=True, to_date__isnull=True
        ).order_by('-from_date').first()
    if not salary_row:
        salary_row = StaffSalaryModel.objects.filter(
            staff=staff, is_active=True
        ).order_by('-from_date').first()

    return Decimal(str(salary_row.salary if salary_row else (staff.salary or 0)))


def _round2(value):
    if not isinstance(value, Decimal):
        value = Decimal(str(value))
    return value.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def _get_formula(financial_year_id):
    formula = SalaryFormula.objects.filter(
        financial_year=financial_year_id,
        is_default=True,
        is_active=True,
    ).first()
    if not formula:
        # Fallback: look for a global default formula (not linked to any FY)
        formula = SalaryFormula.objects.filter(
            financial_year__isnull=True,
            is_default=True,
            is_active=True,
        ).first()
    if not formula:
        raise exceptions.ValidationError(
            'No active default formula found for this financial year.'
        )
    return formula


def _get_rules(formula):
    rules = list(
        SalaryFormulaRule.objects
        .filter(formula=formula, is_active=True)
        .order_by('sequence')
        .select_related('salary_component', 'base_component')
    )
    if not rules:
        raise exceptions.ValidationError('Formula has no active rules.')
    return rules

def formula_is_in_use(formula_id):
    return SalaryEmployeeMonthPlan.objects.filter(
        formula_id=formula_id,
        is_active=True,
    ).exists()

def get_rule_dependents(formula_id, rule_id):
    
    try:
        target_rule = SalaryFormulaRule.objects.select_related(
            'salary_component'
        ).get(id=rule_id, formula_id=formula_id)
    except SalaryFormulaRule.DoesNotExist:
        return {'dependents': [], 'warnings': ['Rule not found.']}

    if not target_rule.salary_component:
        return {'dependents': [], 'warnings': []}

    target_comp = target_rule.salary_component
    target_codename = (target_comp.codename or target_comp.name.upper()).strip()

    all_rules = SalaryFormulaRule.objects.filter(
        formula_id=formula_id,
    ).exclude(id=rule_id).select_related('salary_component', 'base_component')

    dependents = []
    for rule in all_rules:
        if not rule.salary_component:
            continue

        if rule.base_component and rule.base_component.id == target_comp.id:
            reason = f'{rule.salary_component.name} uses {target_comp.name} as base component ({rule.calculation_type})'
            dependents.append({
                'id': rule.id,
                'sequence': rule.sequence,
                'component': rule.salary_component.name,
                'codename': rule.salary_component.codename,
                'is_active': rule.is_active,
                'reason': reason,
            })
            continue

        if rule.calculation_type == 'EXPRESSION' and rule.expression:
            expr_upper = rule.expression.upper()
            if target_codename.upper() in expr_upper:
                reason = f'{rule.salary_component.name} references {target_codename} in expression'
                dependents.append({
                    'id': rule.id,
                    'sequence': rule.sequence,
                    'component': rule.salary_component.name,
                    'codename': rule.salary_component.codename,
                    'is_active': rule.is_active,
                    'reason': reason,
                })

    warnings = []
    active_deps = [d for d in dependents if d['is_active']]
    if active_deps:
        names = ', '.join(d['component'] for d in active_deps)
        warnings.append(
            f'Disabling {target_comp.name} will affect {len(active_deps)} '
            f'active rule(s): {names}. These rules will compute as ₹0 for the disabled component.'
        )

    return {'dependents': dependents, 'warnings': warnings}


def toggle_rule_active(formula_id, rule_id, is_active, user=None):
    
    try:
        rule = SalaryFormulaRule.objects.select_related(
            'salary_component'
        ).get(id=rule_id, formula_id=formula_id)
    except SalaryFormulaRule.DoesNotExist:
        raise exceptions.ValidationError('Rule not found.')

    dep_info = {'dependents': [], 'warnings': []}
    if not is_active:
        dep_info = get_rule_dependents(formula_id, rule_id)

    rule.is_active = is_active
    if user and hasattr(user, 'pk'):
        rule.modified_by = user
    rule.save(update_fields=['is_active', 'modified_by', 'modified_at'])

    comp_name = rule.salary_component.name if rule.salary_component else 'Unknown'
    status = 'enabled' if is_active else 'disabled'

    return {
        'Reason': f'{comp_name} {status} successfully.',
        'rule_id': rule.id,
        'is_active': rule.is_active,
        'dependents': dep_info['dependents'],
        'warnings': dep_info['warnings'],
    }

def formula_preview(formula_id, staff_id, salary_month=None):
    try:
        formula = SalaryFormula.objects.get(id=formula_id, is_active=True)
    except SalaryFormula.DoesNotExist:
        raise exceptions.ValidationError('Formula not found or inactive.')

    all_rules = list(
        SalaryFormulaRule.objects
        .filter(formula=formula)
        .order_by('sequence')
        .select_related('salary_component', 'base_component')
    )
    if not all_rules:
        raise exceptions.ValidationError('Formula has no rules.')

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        raise exceptions.ValidationError('Staff not found or inactive.')

    target_year = None
    target_month = None
    if salary_month:
        try:
            parts = str(salary_month).split('-')
            target_year = int(parts[0])
            target_month = int(parts[1])
        except (IndexError, ValueError):
            pass
    if not target_year or not target_month:
        today = date.today()
        target_year = today.year
        target_month = today.month

    annual_salary_val = get_historical_staff_salary(staff, target_year, target_month)
    annual_salary = Decimal(str(annual_salary_val or 0))
    if annual_salary <= 0:
        raise exceptions.ValidationError(
            f'{staff.first_name}: gross salary is ₹0. Set Staff.salary first.'
        )
    gross = (annual_salary / 12).quantize(Decimal('0.01')) 

    if salary_month:
        try:
            att = compute_staff_attendance(staff_id, target_year, target_month)
        except Exception:
            att = {'absent_days': 0, 'half_days': 0, 'working_days': calendar.monthrange(target_year, target_month)[1]}

        working_days = att.get('working_days', calendar.monthrange(target_year, target_month)[1])
        working_days = max(working_days, 1)
        absent_days = att.get('absent_days', 0)
        half_days = att.get('half_days', 0)
        present_days = att.get('present_days', working_days)
    else:
        last_day = calendar.monthrange(target_year, target_month)[1]
        working_days = last_day
        present_days = last_day
        absent_days = 0
        half_days = 0
    account = AccountDetail.objects.filter(staff=staff, is_active=True).first()

    ded_codes = {
        (r.salary_component.codename or r.salary_component.name.upper())
        for r in all_rules
        if r.salary_component and r.salary_component.is_deduction and r.is_active
    }

    ctx = {
        'gross': gross,
        'components': {},
        'working': working_days,
        'present': present_days,
        'ded_codes': ded_codes,
        'account': account,
    }
    full_ctx = {**ctx, 'present': working_days, 'components': {}}

    steps = []
    for rule in all_rules:
        if not rule.salary_component:
            continue

        comp = rule.salary_component
        codename = comp.codename or comp.name.upper()

        detail = ''
        if rule.calculation_type == 'FIXED':
            detail = f'₹{rule.value}'
        elif rule.calculation_type == 'PERCENT':
            base_name = rule.base_component.name if rule.base_component else 'Gross'
            detail = f'{rule.value}% of {base_name}'
        elif rule.calculation_type == 'REMAINING':
            detail = 'Auto balance'
        elif rule.calculation_type == 'EXPRESSION':
            detail = rule.expression or ''

        if rule.is_active:
            try:
                full_value = float(_calc_component(rule, full_ctx))
                prorated_value = float(_calc_component(rule, ctx))
            except Exception:
                full_value = 0.0
                prorated_value = 0.0

            ctx['components'][codename] = Decimal(str(prorated_value))
            full_ctx['components'][codename] = Decimal(str(full_value))
        else:
            full_value = 0.0
            prorated_value = 0.0
            ctx['components'][codename] = Decimal('0')
            full_ctx['components'][codename] = Decimal('0')

        lop_amount = 0.0
        if not comp.is_deduction and present_days < working_days and rule.is_active:
            lop_amount = round(full_value - prorated_value, 2)

        steps.append({
            'sequence': rule.sequence,
            'salary_component': comp.id,
            'component': comp.name,
            'codename': codename,
            'calculation_type': rule.calculation_type,
            'detail': detail,
            'full_value': round(full_value, 2),
            'prorated_value': round(prorated_value, 2),
            'lop_amount': lop_amount,
            'is_deduction': comp.is_deduction,
            'is_active': rule.is_active,
            'is_optional': getattr(rule, 'is_optional', False),
        })

    pending_overrides = {
        ov.salary_component_id: ov
        for ov in SalaryEmployeeOverride.objects.filter(
            staff=staff, salary_year=target_year, salary_month=target_month,
            is_active=True, month_plan__isnull=True,
        )
    }
    for step in steps:
        comp_id = step.get('salary_component')
        if comp_id and comp_id in pending_overrides:
            override_amount = float(pending_overrides[comp_id].amount)
            step['original_value'] = step['prorated_value']
            step['prorated_value'] = override_amount
            step['full_value'] = override_amount
            step['lop_amount'] = 0.0
            step['overridden'] = True
            step['override_reason'] = pending_overrides[comp_id].reason

    active_steps = [s for s in steps if s['is_active']]
    gross_earnings = sum(s['prorated_value'] for s in active_steps if not s['is_deduction'])
    total_deductions = sum(s['prorated_value'] for s in active_steps if s['is_deduction'])
    net_pay = gross_earnings - total_deductions
    total_lop = sum(s['lop_amount'] for s in active_steps)

    sa_deduction_amount = 0.0
    sa_preview_details = []
    try:
        preview_salary_month = date(target_year, target_month, 1)
        recovery = get_recovery_details_for_payroll(staff_id, preview_salary_month)
        if recovery['total_recovery'] > Decimal('0'):
            available_for_sa = max(net_pay, 0.0)
            sa_deduction_amount = float(min(
                float(recovery['total_recovery']),
                available_for_sa
            ))
            sa_preview_details = recovery.get('advances', [])
            if sa_deduction_amount > 0:
                steps.append({
                    'sequence': 9999,
                    'salary_component': None,
                    'component': 'Salary Advance Deduction',
                    'codename': 'SALARY_ADVANCE_DEDUCTION',
                    'calculation_type': 'SYSTEM',
                    'detail': f'Auto-deduct from {len(sa_preview_details)} advance(s)',
                    'full_value': round(float(recovery['total_recovery']), 2),
                    'prorated_value': round(sa_deduction_amount, 2),
                    'lop_amount': 0.0,
                    'is_deduction': True,
                    'is_active': True,
                    'is_optional': False,
                    'is_system': True,
                })
                total_deductions += sa_deduction_amount
                net_pay -= sa_deduction_amount
    except ImportError:
        pass
    except Exception as exc:
        logger.warning('SA preview failed for staff %s: %s', staff_id, exc)

    canteen_deduction_amount = 0.0
    canteen_preview_packages = []
    try:
        from apps.canteen.models.mappings import StaffMealPackagePayrollMapping
        preview_salary_month = date(target_year, target_month, 1)
        canteen_mappings = StaffMealPackagePayrollMapping.objects.filter(
            staff_id=staff_id,
            is_active=True,
            from_date__lte=preview_salary_month,
        ).filter(
            models.Q(to_date__gte=preview_salary_month) | models.Q(to_date__isnull=True)
        ).select_related('meal_package')
        for cm in canteen_mappings:
            amt = float(cm.amount or 0)
            if amt > 0:
                canteen_deduction_amount += amt
                canteen_preview_packages.append({
                    'package': cm.meal_package.name if cm.meal_package else '',
                    'amount': amt,
                })
        if canteen_deduction_amount > 0:
            available_for_canteen = max(net_pay, 0.0)
            canteen_deduction_amount = min(canteen_deduction_amount, available_for_canteen)
            steps.append({
                'sequence': 9998,
                'salary_component': None,
                'component': 'Canteen Deduction',
                'codename': 'CANTEEN_DEDUCTION',
                'calculation_type': 'SYSTEM',
                'detail': f'Meal package deduction ({len(canteen_preview_packages)} package(s))',
                'full_value': round(canteen_deduction_amount, 2),
                'prorated_value': round(canteen_deduction_amount, 2),
                'lop_amount': 0.0,
                'is_deduction': True,
                'is_active': True,
                'is_optional': False,
                'is_system': True,
            })
            total_deductions += canteen_deduction_amount
            net_pay -= canteen_deduction_amount
    except ImportError:
        pass
    except Exception as exc:
        logger.warning('Canteen deduction preview failed for staff %s: %s', staff_id, exc)

    name_parts = [staff.first_name or '']
    if getattr(staff, 'middle_name', None):
        name_parts.append(staff.middle_name)
    if getattr(staff, 'last_name', None):
        name_parts.append(staff.last_name)

    return {
        'staff': {
            'id': staff.id,
            'name': ' '.join(name_parts).strip(),
            'gross': float(gross),
        },
        'attendance': {
            'working_days': working_days,
            'present_days': present_days,
            'absent_days': absent_days,
            'half_days': half_days,
            'lop_days': absent_days + (half_days * 0.5),
        },
        'steps': steps,
        'totals': {
            'gross_earnings': round(gross_earnings, 2),
            'total_deductions': round(total_deductions, 2),
            'net_pay': round(net_pay, 2),
            'total_lop': round(total_lop, 2),
        },
        'salary_advance_recovery': {
            'deduction_amount': round(sa_deduction_amount, 2),
            'advances': [{
                'name': a.get('name', ''),
                'total': float(a.get('total', 0)),
                'outstanding_before': float(a.get('outstanding_before', 0)),
            } for a in sa_preview_details] if sa_preview_details else [],
        },
        'canteen_deduction': {
            'deduction_amount': round(canteen_deduction_amount, 2),
            'packages': canteen_preview_packages,
        },
    }

def _calc_component(rule, ctx):
    
    gross    = ctx['gross']
    comps    = ctx['components']
    working  = max(ctx['working'], 1)
    present  = ctx['present']
    is_ded   = rule.salary_component.is_deduction

    def prorate(v):
        return v if is_ded else (v * Decimal(present)) / Decimal(working)

    try:
        t = rule.calculation_type

        if t == 'FIXED':
            return _round2(prorate(Decimal(str(rule.value or 0))))

        if t == 'PERCENT':
            if rule.base_component:
                code = rule.base_component.codename or rule.base_component.name.upper()
                base = comps.get(code, gross)
            else:
                base = gross
            pct = Decimal(str(rule.value or 0)) / Decimal('100')
            return _round2(prorate(base * pct))

        if t == 'REMAINING':
            if rule.base_component:
                code = rule.base_component.codename or rule.base_component.name.upper()
                base = comps.get(code, gross)
            else:
                base = gross
            earned = sum(v for k, v in comps.items() if k not in ctx['ded_codes'])
            remaining = max(base - earned, Decimal('0'))
            return _round2(prorate(remaining))

        if t == 'EXPRESSION':
            ns = {
                'GROSS': float(gross), 'GS': float(gross),
                'WORKING': float(working), 'PRESENT': float(present),
                'ESIC_OPTED': bool(ctx.get('account') and ctx['account'].esi_num),
                'PF_OPTED':   bool(ctx.get('account') and ctx['account'].pf_num),
            }
            ns.update({k: float(v) for k, v in comps.items()})
            ns.update({k.upper(): float(v) for k, v in comps.items()})
            
            result = safe_eval_expression(rule.expression, ns)

            expr_upper = rule.expression.upper()
            if 'WORKING' in expr_upper or 'PRESENT' in expr_upper:
                return _round2(Decimal(str(result)))

            return _round2(prorate(Decimal(str(result))))

    except Exception as exc:
        logger.error(
            'calc_component [%s | %s]: %s',
            rule.salary_component.name, rule.calculation_type, exc,
        )
    return Decimal('0')

def validate_formula_rules(formula_id):
    
    try:
        formula = SalaryFormula.objects.get(id=formula_id, is_active=True)
    except SalaryFormula.DoesNotExist:
        return {'valid': False, 'errors': ['Formula not found or inactive.'], 'cycle': []}

    try:
        rules = _get_rules(formula)
    except exceptions.ValidationError as exc:
        return {'valid': False, 'errors': [str(exc.detail)], 'cycle': []}

    errors = []
    seen   = {}

    for rule in rules:
        if not rule.salary_component:
            errors.append(f'Rule {rule.sequence}: salary_component is missing.')
            continue

        seq = rule.sequence
        cid = rule.salary_component.id

        if rule.calculation_type == 'PERCENT' and not rule.base_component:
            errors.append(
                f'Rule {seq} ({rule.salary_component.name}): '
                f'PERCENT requires base_component.'
            )

        if rule.base_component:
            bid = rule.base_component.id
            if bid in seen and seen[bid] >= seq:
                errors.append(
                    f'Rule {seq} ({rule.salary_component.name}): '
                    f'base_component "{rule.base_component.name}" '
                    f'(seq {seen[bid]}) must appear before this rule.'
                )

        if rule.calculation_type == 'EXPRESSION':
            if not rule.expression:
                errors.append(f'Rule {seq}: EXPRESSION type requires expression field.')
            else:
                check = validate_expression_syntax(rule.expression)
                if not check['valid']:
                    errors.append(
                        f'Rule {seq} ({rule.salary_component.name}): '
                        f'Expression error — {check["error"]}'
                    )

        seen[cid] = seq

    cycle_result = detect_circular_dependencies(rules)
    if cycle_result['has_cycle']:
        cycle_str = ' → '.join(cycle_result['cycle'])
        errors.append(f'Circular dependency detected: {cycle_str}')

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'cycle': cycle_result['cycle'],
    }


def get_formula_summary(formula_id):
    try:
        formula = SalaryFormula.objects.get(id=formula_id)
    except SalaryFormula.DoesNotExist:
        return {}

    rules = SalaryFormulaRule.objects.filter(
        formula=formula, is_active=True
    ).order_by('sequence').select_related('salary_component', 'base_component')

    earnings, deductions = [], []
    for r in rules:
        if not r.salary_component:
            continue
        entry = {
            'sequence':   r.sequence,
            'component':  r.salary_component.name,
            'codename':   r.salary_component.codename,
            'type':       r.calculation_type,
            'value':      str(r.value) if r.value is not None else None,
            'expression': r.expression,
            'base':       r.base_component.name if r.base_component else None,
        }
        (deductions if r.salary_component.is_deduction else earnings).append(entry)

    return {
        'id':             formula.id,
        'name':           formula.name,
        'description':    getattr(formula, 'description', ''),
        'is_default':     formula.is_default,
        'financial_year': formula.financial_year_id,
        'earnings':       earnings,
        'deductions':     deductions,
        'total_rules':    len(earnings) + len(deductions),
        'in_use':         formula_is_in_use(formula.id),   
    }

def compute_staff_attendance(staff_id, year, month):
    month_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    month_end = date(year, month, last_day)

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        raise exceptions.ValidationError('Staff not found or inactive.')

    # HIGHEST PRIORITY: Manual attendance overrides everything
    manual = StaffManualAttendance.objects.filter(
        staff_id=staff_id, salary_month=month_start, is_active=True
    ).first()
    if manual and manual.present_days > 0:
        return {
            'working_days': manual.working_days,
            'present_days': manual.present_days,
            'half_days': 0,
            'absent_days': max(0, manual.working_days - manual.present_days),
            'leave_days': 0,
            'details': {'manual_override': manual.working_days},
        }

    date_joined = staff.date_joined
    effective_start = max(month_start, date_joined) if date_joined else month_start

    if staff.date_left and staff.date_left < month_start:
        return {
            'working_days': 0, 'present_days': 0, 'half_days': 0,
            'absent_days': 0, 'leave_days': 0, 'details': {},
        }
    effective_end = min(month_end, staff.date_left) if staff.date_left else month_end

    holiday_dates = set()
    try:
        holidays = HolidayCalender.get_upcoming_holidays(
            None, effective_start, effective_end, True
        )
        for h in holidays:
            if isinstance(h, str):
                holiday_dates.add(h)
            else:
                holiday_dates.add(h.strftime('%Y-%m-%d') if hasattr(h, 'strftime') else str(h))
    except Exception:
        pass  

    shift_assignments = AssignShift.objects.filter(
        staff_id=staff_id,
        fromdate__lte=effective_end,
        todate__gte=effective_start,
    ).select_related('shift')

    working_day_names = set(
        Day.objects.filter(is_teacher_working_day=True).values_list('name', flat=True)
    )

    working_dates = set()
    current = effective_start
    while current <= effective_end:
        date_str = current.strftime('%Y-%m-%d')
        if date_str not in holiday_dates:
            day_name = SharedService.get_day_for_date(date_str)
            if day_name in working_day_names:
                has_shift = shift_assignments.filter(
                    fromdate__lte=current, todate__gte=current
                ).exists()
                if has_shift:
                    working_dates.add(date_str)
        current += timedelta(days=1)

    working_days = len(working_dates)

    attendance_records = StaffAttendance.objects.filter(
        staff_id=staff_id,
        for_date__gte=effective_start,
        for_date__lte=effective_end,
        is_active=True,
    ).values('for_date', 'status')

    attendance_map = {}
    for rec in attendance_records:
        date_str = rec['for_date'].strftime('%Y-%m-%d')
        attendance_map[date_str] = rec['status']

    lop_config = get_lop_attendance_list()
    total_deduction = 0.0
    details = {}
    half_days = 0
    absent_days = 0
    leave_days = 0

    for wd in working_dates:
        status = attendance_map.get(wd, 'unmarked')  

        details[status] = details.get(status, 0) + 1

        deduction = 1.0  
        if status in lop_config:
            deduction = float(lop_config[status].get('deductable_count', 1))

        total_deduction += deduction

        if deduction == 0.5:
            half_days += 1
        elif deduction >= 1.0 and status not in ('present', 'late', 'leave_applied',
                                                    'holiday', 'nonworkingday'):
            absent_days += 1

        if status == 'leave_applied':
            leave_days += 1

    present_days = round(working_days - total_deduction, 1)
    present_days = max(present_days, 0)

    return {
        'working_days': working_days,
        'present_days': present_days,
        'half_days': half_days,
        'absent_days': absent_days,
        'leave_days': leave_days,
        'details': details,
    }


def compute_bulk_attendance(staff_ids, year, month):
    
    month_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    month_end = date(year, month, last_day)

    holiday_dates = set()
    try:
        holidays = HolidayCalender.get_upcoming_holidays(
            None, month_start, month_end, True
        )
        for h in holidays:
            if isinstance(h, str):
                holiday_dates.add(h)
            else:
                holiday_dates.add(h.strftime('%Y-%m-%d') if hasattr(h, 'strftime') else str(h))
    except Exception:
        pass

    working_day_names = set(
        Day.objects.filter(is_teacher_working_day=True).values_list('name', flat=True)
    )

    lop_config = get_lop_attendance_list()

    day_name_map = {}
    current = month_start
    while current <= month_end:
        date_str = current.strftime('%Y-%m-%d')
        day_name_map[date_str] = SharedService.get_day_for_date(date_str)
        current += timedelta(days=1)

    staff_map = {
        s.id: s
        for s in Staff.objects.filter(id__in=staff_ids, is_active=True)
    }

    all_shifts = AssignShift.objects.filter(
        staff_id__in=staff_ids,
        fromdate__lte=month_end,
        todate__gte=month_start,
    ).select_related('shift').values_list('staff_id', 'fromdate', 'todate')

    staff_shifts = {}
    for sid, fromdate, todate in all_shifts:
        staff_shifts.setdefault(sid, []).append((fromdate, todate))

    all_attendance = StaffAttendance.objects.filter(
        staff_id__in=staff_ids,
        for_date__gte=month_start,
        for_date__lte=month_end,
        is_active=True,
    ).values('staff_id', 'for_date', 'status')

    staff_attendance_map = {}
    for rec in all_attendance:
        date_str = rec['for_date'].strftime('%Y-%m-%d')
        staff_attendance_map.setdefault(rec['staff_id'], {})[date_str] = rec['status']

    result = {}
    for staff_id in staff_ids:
        try:
            staff = staff_map.get(staff_id)
            if not staff:
                raise exceptions.ValidationError('Staff not found or inactive.')

            date_joined = staff.date_joined
            effective_start = max(month_start, date_joined) if date_joined else month_start

            if staff.date_left and staff.date_left < month_start:
                result[staff_id] = {
                    'working_days': 0, 'present_days': 0, 'half_days': 0,
                    'absent_days': 0, 'leave_days': 0, 'details': {},
                }
                continue
            effective_end = min(month_end, staff.date_left) if staff.date_left else month_end

            shifts = staff_shifts.get(staff_id, [])
            working_dates = set()
            current = effective_start
            while current <= effective_end:
                date_str = current.strftime('%Y-%m-%d')
                if date_str not in holiday_dates:
                    day_name = day_name_map.get(date_str, '')
                    if day_name in working_day_names:
                        has_shift = any(
                            fd <= current <= td for fd, td in shifts
                        )
                        if has_shift:
                            working_dates.add(date_str)
                current += timedelta(days=1)

            working_days_count = len(working_dates)
            attendance_map = staff_attendance_map.get(staff_id, {})

            total_deduction = 0.0
            details = {}
            half_days = 0
            absent_days = 0
            leave_days = 0

            for wd in working_dates:
                status = attendance_map.get(wd, 'unmarked')
                details[status] = details.get(status, 0) + 1
                deduction = 1.0
                if status in lop_config:
                    deduction = float(lop_config[status].get('deductable_count', 1))
                total_deduction += deduction
                if deduction == 0.5:
                    half_days += 1
                elif deduction >= 1.0 and status not in ('present', 'late', 'leave_applied',
                                                          'holiday', 'nonworkingday'):
                    absent_days += 1
                if status == 'leave_applied':
                    leave_days += 1

            present_days = round(working_days_count - total_deduction, 1)
            present_days = max(present_days, 0)

            result[staff_id] = {
                'working_days': working_days_count,
                'present_days': present_days,
                'half_days': half_days,
                'absent_days': absent_days,
                'leave_days': leave_days,
                'details': details,
            }
        except Exception as exc:
            logger.warning('Attendance compute failed for staff %s: %s', staff_id, exc)
            result[staff_id] = {
                'working_days': 30, 'present_days': 30,
                'half_days': 0, 'absent_days': 0, 'leave_days': 0,
                'details': {}, 'error': str(exc),
            }
    return result


def run_formula_engine(staff_id, financial_year_id, year, month,
                       working_days=None, present_days=None, user=None):
    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        raise exceptions.ValidationError('Staff not found or inactive.')

    if working_days is None or present_days is None:
        att = compute_staff_attendance(staff_id, year, month)
        working_days = working_days if working_days is not None else att['working_days']
        present_days = present_days if present_days is not None else att['present_days']

    working_days = max(working_days, 1) if working_days else 1
    present_days = present_days if present_days is not None else working_days

    annual_salary_val = get_historical_staff_salary(staff, year, month)
    annual_salary = Decimal(str(annual_salary_val or 0))
    if annual_salary <= 0:
        raise exceptions.ValidationError(
            f'{staff.first_name}: fixed pay is 0. Set Staff.salary before generating.'
        )
    gross = (annual_salary / 12).quantize(Decimal('0.01'))  # annual → monthly

    formula      = _get_formula(financial_year_id)
    rules        = _get_rules(formula)
    salary_month = date(year, month, 1)
    account      = AccountDetail.objects.filter(staff=staff, is_active=True).first()

    if SalaryEmployeeMonthPlan.objects.filter(
        staff=staff, salary_month=salary_month, is_locked=True,
    ).exists():
        raise exceptions.ValidationError(
            f'Salary already locked for {month}/{year}. Cannot regenerate.'
        )

    cycle_result = detect_circular_dependencies(rules)
    if cycle_result['has_cycle']:
        cycle_str = ' → '.join(cycle_result['cycle'])
        raise exceptions.ValidationError(
            f'Formula has a circular dependency: {cycle_str}. '
            f'Fix the rule sequence before generating.'
        )

    snapshot = _build_formula_snapshot(formula, rules)
    version  = _formula_version(formula, rules)

    ded_codes = {
        (r.salary_component.codename or r.salary_component.name.upper())
        for r in rules
        if r.salary_component and r.salary_component.is_deduction
    }

    ctx = {
        'gross':      gross,
        'components': {},
        'working':    working_days,
        'present':    present_days,
        'ded_codes':  ded_codes,
        'account':    account,
    }
    full_ctx = {**ctx, 'present': working_days, 'components': {}}

    to_create = []

    with transaction.atomic(using=get_current_db_name()):
        SalaryEmployeeMonthPlan.objects.filter(
            staff=staff, salary_month=salary_month, is_locked=False,
        ).delete()

        for rule in rules:
            if not rule.salary_component:
                continue

            value      = _calc_component(rule, ctx)
            full_value = _calc_component(rule, full_ctx)

            lop_amount = Decimal('0')
            if not rule.salary_component.is_deduction and present_days < working_days:
                lop_amount = full_value - value

            codename = rule.salary_component.codename or rule.salary_component.name.upper()
            ctx['components'][codename]      = value
            full_ctx['components'][codename] = full_value

            to_create.append(SalaryEmployeeMonthPlan(
                staff             = staff,
                salary_component  = rule.salary_component,
                amount            = value,
                salary_month      = salary_month,
                account           = account,
                lop               = int(working_days - present_days),
                is_locked         = False,
                lop_amount        = lop_amount,
                formula           = formula,
                formula_snapshot  = snapshot,    
                formula_version   = version,  
                is_active         = True,
                created_by        = user,
                modified_by       = user,
            ))

        try:
            recovery = get_recovery_details_for_payroll(staff.id, salary_month)
            if recovery['total_recovery'] > Decimal('0'):
                formula_earnings = sum(
                    r.amount for r in to_create
                    if not r.salary_component.is_deduction
                )
                formula_deductions = sum(
                    r.amount for r in to_create
                    if r.salary_component.is_deduction
                )
                available_net = max(formula_earnings - formula_deductions, Decimal('0'))
                sa_amount = min(recovery['total_recovery'], available_net)

                if sa_amount > Decimal('0'):
                    sa_component = SalaryComponent.objects.filter(
                        codename='salary_advance_deduction',
                        is_active=True,
                    ).first()
                    if sa_component:
                        to_create.append(SalaryEmployeeMonthPlan(
                            staff            = staff,
                            salary_component = sa_component,
                            amount           = _round2(sa_amount),
                            salary_month     = salary_month,
                            account          = account,
                            lop              = int(working_days - present_days),
                            is_locked        = False,
                            lop_amount       = Decimal('0'),
                            formula          = formula,
                            formula_snapshot = snapshot,
                            formula_version  = version,
                            is_active        = True,
                            created_by       = user,
                            modified_by      = user,
                        ))
        except ImportError:
            logger.warning('salary_advance_payroll not available; skipping SA deduction.')
        except Exception as exc:
            logger.warning('SA deduction injection failed for staff %s: %s', staff.id, exc)

        # ── Canteen Deduction injection (like SA above) ──
        try:
            from apps.canteen.models.mappings import StaffMealPackagePayrollMapping
            canteen_mappings = StaffMealPackagePayrollMapping.objects.filter(
                staff=staff,
                is_active=True,
                from_date__lte=salary_month,
            ).filter(
                models.Q(to_date__gte=salary_month) | models.Q(to_date__isnull=True)
            )
            canteen_total = sum(Decimal(str(cm.amount or 0)) for cm in canteen_mappings)
            if canteen_total > Decimal('0'):
                formula_earnings = sum(
                    r.amount for r in to_create
                    if not r.salary_component.is_deduction
                )
                formula_deductions = sum(
                    r.amount for r in to_create
                    if r.salary_component.is_deduction
                )
                available_net = max(formula_earnings - formula_deductions, Decimal('0'))
                canteen_amount = min(canteen_total, available_net)

                if canteen_amount > Decimal('0'):
                    canteen_component = SalaryComponent.objects.filter(
                        codename='canteen_deduction',
                        is_active=True,
                    ).first()
                    if canteen_component:
                        to_create.append(SalaryEmployeeMonthPlan(
                            staff            = staff,
                            salary_component = canteen_component,
                            amount           = _round2(canteen_amount),
                            salary_month     = salary_month,
                            account          = account,
                            lop              = int(working_days - present_days),
                            is_locked        = False,
                            lop_amount       = Decimal('0'),
                            formula          = formula,
                            formula_snapshot = snapshot,
                            formula_version  = version,
                            is_active        = True,
                            created_by       = user,
                            modified_by      = user,
                        ))
        except ImportError:
            logger.warning('canteen models not available; skipping canteen deduction.')
        except Exception as exc:
            logger.warning('Canteen deduction injection failed for staff %s: %s', staff.id, exc)

        # --- Apply pending overrides (saved before salary generation) ---
        pending_overrides = {
            ov.salary_component_id: ov
            for ov in SalaryEmployeeOverride.objects.filter(
                staff=staff, salary_year=year, salary_month=month,
                is_active=True, month_plan__isnull=True,
            )
        }
        for rec in to_create:
            comp_id = rec.salary_component_id
            if comp_id in pending_overrides:
                rec.amount = pending_overrides[comp_id].amount
                rec.lop_amount = Decimal('0')

        records = SalaryEmployeeMonthPlan.objects.bulk_create(to_create)

        if pending_overrides:
            created_records = SalaryEmployeeMonthPlan.objects.filter(
                staff=staff, salary_month=salary_month, is_active=True,
            )
            for rec in created_records:
                comp_id = rec.salary_component_id
                if comp_id in pending_overrides:
                    SalaryEmployeeOverride.objects.filter(
                        id=pending_overrides[comp_id].id
                    ).update(month_plan_id=rec.id)

    _audit(
        action='GENERATE',
        user=user,
        formula=formula,
        staff=staff,
        salary_month=salary_month,
        details={
            'records_created': len(records),
            'working_days':    working_days,
            'present_days':    present_days,
            'formula_version': version,
            'gross':           str(gross),
        },
    )
    return records


def generate_formula_salary(self, data, user=None):
    staff_id          = data.get('staff')
    financial_year_id = data.get('financial_year')
    salary_month      = data.get('salary_month')
    working_days      = data.get('working_days')
    present_days      = data.get('present_days')
    if working_days is not None:
        working_days = int(working_days)
    if present_days is not None:
        present_days = float(present_days)

    if not all([staff_id, financial_year_id, salary_month]):
        raise exceptions.ValidationError('staff, financial_year, salary_month are required.')

    try:
        parsed = date(*[int(x) for x in salary_month.split('-')])
    except (ValueError, AttributeError):
        raise exceptions.ValidationError('salary_month must be YYYY-MM format.')

    records = run_formula_engine(
        staff_id, financial_year_id, parsed.year, parsed.month,
        working_days, present_days, user,
    )
    return {
        'Reason': f'Generated {len(records)} records.',
        'data':   SalaryEmployeeMonthPlanSerializer(records, many=True).data,
    }


def apply_pending_increments_for_month(salary_month_date):
    pending = SalaryEmployeeIncrement.objects.filter(
        applied=False,
        is_active=True,
        increment_type='INCREMENT',
        effective_date__lte=salary_month_date,
    ).select_related('staff').order_by('effective_date', 'id')

    applied_count = 0
    for inc in pending:
        try:
            staff = inc.staff
            if not staff or not staff.is_active:
                continue
            with transaction.atomic(using=get_current_db_name()):
                staff.salary = inc.new_gross
                staff.save(update_fields=['salary'])
                inc.applied = True
                inc.save(update_fields=['applied'])
                applied_count += 1
                logger.info(
                    'Auto-applied increment %s: %s salary %s -> %s',
                    inc.id, staff.first_name, inc.old_gross, inc.new_gross
                )
        except Exception as exc:
            logger.error('Failed to auto-apply increment %s: %s', inc.id, exc)
    return applied_count


def generate_formula_salary_bulk(self, data, user=None):
    financial_year_id = data.get('financial_year')
    salary_month      = data.get('salary_month')
    attendance_overrides = data.get('attendance_overrides', {})

    if not all([financial_year_id, salary_month]):
        raise exceptions.ValidationError('financial_year, salary_month are required.')

    try:
        parsed = date(*[int(x) for x in salary_month.split('-')])
    except (ValueError, AttributeError):
        raise exceptions.ValidationError('salary_month must be YYYY-MM format.')

    last_day = calendar.monthrange(parsed.year, parsed.month)[1]
    apply_pending_increments_for_month(date(parsed.year, parsed.month, last_day))

    year, month = parsed.year, parsed.month
    month_start = date(year, month, 1)

    staff_qs = Staff.objects.filter(
        is_active=True,
        date_joined__lte=month_start,
    ).exclude(
        date_left__lt=month_start,
    ).only('id', 'first_name', 'salary')

    if not staff_qs.exists():
        return {'Reason': 'No eligible staff found.', 'count': 0, 'errors': []}

    success, errors = 0, []
    for staff in staff_qs:
        try:
            override = attendance_overrides.get(str(staff.id), {})
            wd = int(override['working_days']) if 'working_days' in override else None
            pd = float(override['present_days']) if 'present_days' in override else None

            run_formula_engine(
                staff.id, financial_year_id, year, month,
                wd, pd, user,
            )
            success += 1
        except Exception as exc:
            errors.append({'staff_id': staff.id, 'name': staff.first_name, 'error': str(exc)})

    _audit(
        action='GENERATE_BULK',
        user=user,
        salary_month=month_start,
        details={
            'financial_year_id': financial_year_id,
            'success':           success,
            'errors':            len(errors),
        },
    )

    sa_preview = []
    try:
        for staff in staff_qs:
            details = get_recovery_details_for_payroll(staff.id, month_start)
            if details.get('total_recovery', 0) > Decimal('0'):
                sa_preview.append({
                    'staff_id': staff.id,
                    'staff_name': staff.first_name,
                    'total_recovery': str(details['total_recovery']),
                    'advance_count': len(details.get('advances', [])),
                })
    except ImportError:
        pass

    return {
        'Reason': f'Generated for {success} staff. {len(errors)} errors.',
        'count':  success,
        'errors': errors or None,
        'salary_advance_preview': sa_preview or None,
    }


def get_attendance_preview(self, data, user=None):
    salary_month = data.get('salary_month')
    if not salary_month:
        raise exceptions.ValidationError('salary_month is required.')

    try:
        parsed = date(*[int(x) for x in salary_month.split('-')])
    except (ValueError, AttributeError):
        raise exceptions.ValidationError('salary_month must be YYYY-MM format.')

    year, month = parsed.year, parsed.month
    month_start = date(year, month, 1)

    staff_qs = Staff.objects.filter(
        is_active=True,
        date_joined__lte=month_start,
    ).exclude(
        date_left__lt=month_start,
    ).only('id', 'first_name', 'middle_name', 'last_name', 'salary')

    if not staff_qs.exists():
        return {'data': [], 'count': 0}

    staff_ids = list(staff_qs.values_list('id', flat=True))
    bulk_att = compute_bulk_attendance(staff_ids, year, month)

    result = []
    for staff in staff_qs:
        att = bulk_att.get(staff.id, {})
        name_parts = [staff.first_name or '']
        if staff.middle_name:
            name_parts.append(staff.middle_name)
        if staff.last_name:
            name_parts.append(staff.last_name)

        result.append({
            'staff_id':     staff.id,
            'staff_name':   ' '.join(name_parts).strip(),
            'gross_salary': round(float(staff.salary or 0) / 12, 2),
            'working_days': att.get('working_days', 0),
            'present_days': att.get('present_days', 0),
            'half_days':    att.get('half_days', 0),
            'absent_days':  att.get('absent_days', 0),
            'leave_days':   att.get('leave_days', 0),
            'details':      att.get('details', {}),
            'error':        att.get('error'),
        })

    return {'data': result, 'count': len(result)}


def lock_formula_salaries(self, data, user=None):
    salary_month = data.get('salary_month')
    if not salary_month:
        raise exceptions.ValidationError('salary_month is required.')

    try:
        parsed = date(*[int(x) for x in salary_month.split('-')])
    except (ValueError, AttributeError):
        raise exceptions.ValidationError('salary_month must be YYYY-MM format.')

    qs = SalaryEmployeeMonthPlan.objects.filter(
        salary_month=parsed,
        is_locked=False,
        is_active=True,
        formula__isnull=False,
    )
    count = qs.count()
    if not count:
        return {'Reason': 'No unlocked formula records found for this month.', 'count': 0}

    staff_ids = list(qs.values_list('staff_id', flat=True).distinct())

    qs.update(is_locked=True, modified_by=user)

    recovery_summary = {
        'staff_processed': 0,
        'total_recovered': Decimal('0'),
        'advances_closed': [],
        'errors': [],
    }
    try:
        for staff_id in staff_ids:
            try:
                if check_payroll_period_processed(staff_id, parsed):
                    continue  

                sa_plan_row = SalaryEmployeeMonthPlan.objects.filter(
                    staff_id=staff_id,
                    salary_month=parsed,
                    salary_component__codename='salary_advance_deduction',
                    is_active=True,
                ).first()
                capped_amount = sa_plan_row.amount if sa_plan_row else None

                if capped_amount is not None and capped_amount <= Decimal('0'):
                    continue  

                result = create_recovery_from_payroll(
                    staff_id=staff_id,
                    salary_month=parsed,
                    payroll_id=None,
                    user=user,
                    available_amount=capped_amount,
                    remarks=f'Auto-deducted on salary lock for {salary_month}',
                )
                if result.get('total_recovered', 0) > Decimal('0'):
                    recovery_summary['staff_processed'] += 1
                    recovery_summary['total_recovered'] += result['total_recovered']
                    recovery_summary['advances_closed'].extend(result.get('advances_closed', []))
            except Exception as exc:
                recovery_summary['errors'].append({
                    'staff_id': staff_id, 'error': str(exc),
                })
    except ImportError:
        logger.warning('salary_advance_payroll not available; skipping SA recovery.')

    _audit(
        action='LOCK',
        user=user,
        salary_month=parsed,
        details={
            'locked_count': count,
            'salary_month': salary_month,
            'sa_recovery': {
                'staff_processed': recovery_summary['staff_processed'],
                'total_recovered': str(recovery_summary['total_recovered']),
                'advances_closed': recovery_summary['advances_closed'],
            },
        },
    )
    return {
        'Reason': f'Locked {count} records for {salary_month}.',
        'count':  count,
        'salary_advance_recovery': {
            'staff_processed': recovery_summary['staff_processed'],
            'total_recovered': str(recovery_summary['total_recovered']),
            'advances_closed_count': len(recovery_summary['advances_closed']),
            'errors': recovery_summary['errors'] or None,
        },
    }

def _get_calendar_working_days(year, month):

    month_start = date(year, month, 1)
    last_day = calendar.monthrange(year, month)[1]
    month_end = date(year, month, last_day)

    working_day_names = set(
        Day.objects.filter(is_teacher_working_day=True).values_list('name', flat=True)
    )

    holiday_dates = set()
    try:
        holidays = HolidayCalender.get_upcoming_holidays(None, month_start, month_end, True)
        for h in holidays:
            if isinstance(h, str):
                holiday_dates.add(h)
            else:
                holiday_dates.add(h.strftime('%Y-%m-%d') if hasattr(h, 'strftime') else str(h))
    except Exception:
        pass

    count = 0
    current = month_start
    while current <= month_end:
        date_str = current.strftime('%Y-%m-%d')
        if date_str not in holiday_dates:
            day_name = SharedService.get_day_for_date(date_str)
            if day_name in working_day_names:
                count += 1
        current += timedelta(days=1)

    return count


def load_manual_attendance(salary_month):

    if salary_month >= date.today().replace(day=1):
        raise exceptions.ValidationError('Attendance can only be entered for past months.')

    staff_ids = SalaryEmployeePlan.objects.filter(
        is_approved=True
    ).values_list('staff_id', flat=True).distinct()

    staff_list = Staff.objects.filter(id__in=staff_ids, is_active=True)

    fallback_wd = _get_calendar_working_days(salary_month.year, salary_month.month)

    has_staff_attendance = False
    created_count = 0

    for staff in staff_list:
        record, was_created = StaffManualAttendance.objects.get_or_create(
            staff=staff,
            salary_month=salary_month,
            defaults={'working_days': 0, 'present_days': 0, 'is_active': True}
        )

        try:
            att = compute_staff_attendance(staff.id, salary_month.year, salary_month.month)
            wd = att['working_days']
            pd_val = att['present_days']
            if pd_val > 0:
                has_staff_attendance = True
        except Exception:
            wd = fallback_wd
            pd_val = 0

        # If shift-based attendance returned 0 working days, use calendar fallback
        if wd == 0:
            wd = fallback_wd

        if was_created:
            record.working_days = wd
            record.present_days = pd_val
            record.save(update_fields=['working_days', 'present_days'])
            created_count += 1
        else:
            if record.working_days != wd:
                record.working_days = wd
                record.save(update_fields=['working_days'])

    records = StaffManualAttendance.objects.select_related('staff').filter(
        salary_month=salary_month, is_active=True, staff__is_active=True
    ).order_by('staff__first_name')

    return records, has_staff_attendance, created_count


def bulk_update_manual_attendance(updates):
    """Bulk update present_days on manual attendance records.
    Returns updated_count.
    """
    if not updates or not isinstance(updates, list):
        raise exceptions.ValidationError('updates array is required.')

    updated_count = 0
    for item in updates:
        record_id = item.get('id')
        present_days = item.get('present_days')

        if not record_id or present_days is None:
            continue

        try:
            present_days = float(present_days)
        except (TypeError, ValueError):
            raise exceptions.ValidationError(f'present_days must be a number for record {record_id}.')

        try:
            record = StaffManualAttendance.objects.get(id=record_id, is_active=True)
        except StaffManualAttendance.DoesNotExist:
            raise exceptions.ValidationError(f'Record {record_id} not found.')

        if present_days < 0:
            raise exceptions.ValidationError(f'present_days cannot be negative for {record.staff}.')
        if present_days > record.working_days:
            raise exceptions.ValidationError(
                f'present_days ({present_days}) cannot exceed working_days ({record.working_days}) for {record.staff}.'
            )

        record.present_days = present_days
        record.save(update_fields=['present_days'])
        updated_count += 1

    return updated_count


def apply_salary_override(self, data, user=None):
    month_plan_id = data.get('month_plan')
    amount        = data.get('amount')
    reason        = (data.get('reason') or '').strip()
    component_id  = data.get('salary_component')
    is_permanent  = data.get('is_permanent', False)

    if not reason:
        raise exceptions.ValidationError('reason is mandatory for overrides.')
    if amount is None:
        raise exceptions.ValidationError('amount is required.')

    if month_plan_id:
        try:
            month_plan = SalaryEmployeeMonthPlan.objects.select_related(
                'salary_component', 'staff'
            ).get(id=month_plan_id, is_active=True)
        except SalaryEmployeeMonthPlan.DoesNotExist:
            raise exceptions.ValidationError('Month plan record not found.')
    else:
        staff_id = data.get('staff')
        salary_month_date = data.get('salary_month_date')  # "YYYY-M" format
        if not staff_id or not component_id or not salary_month_date:
            raise exceptions.ValidationError(
                'Either month_plan OR (staff, salary_component, salary_month_date) are required.'
            )
        try:
            start_date = datetime.strptime(str(salary_month_date), "%Y-%m").date()
        except ValueError:
            raise exceptions.ValidationError('salary_month_date must be in YYYY-M format.')
        month_plan = SalaryEmployeeMonthPlan.objects.select_related(
            'salary_component', 'staff'
        ).filter(
            staff_id=staff_id,
            salary_component_id=component_id,
            salary_month=start_date,
            is_active=True,
        ).first()
        if not month_plan:
            try:
                staff_obj = Staff.objects.get(id=staff_id)
            except Staff.DoesNotExist:
                raise exceptions.ValidationError('Staff not found.')
            try:
                comp_obj = SalaryComponent.objects.get(id=component_id, is_active=True)
            except SalaryComponent.DoesNotExist:
                raise exceptions.ValidationError('Salary component not found.')

            staff_name = ''
            parts = [staff_obj.first_name or '']
            if getattr(staff_obj, 'middle_name', None):
                parts.append(staff_obj.middle_name)
            if getattr(staff_obj, 'last_name', None):
                parts.append(staff_obj.last_name)
            staff_name = ' '.join(parts).strip()

            new_amount = Decimal(str(amount))
            override = SalaryEmployeeOverride.objects.create(
                month_plan       = None,
                staff            = staff_obj,
                staff_name       = staff_name,
                salary_year      = start_date.year,
                salary_month     = start_date.month,
                salary_component = comp_obj,
                amount           = new_amount,
                reason           = reason,
                is_permanent     = bool(is_permanent),
                approved_by      = user,
                is_active        = True,
                created_by       = user,
                modified_by      = user,
            )
            _audit(
                action='OVERRIDE',
                user=user,
                staff=staff_obj,
                salary_month=start_date,
                details={
                    'override_id':  override.id,
                    'old_amount':   'N/A (pending)',
                    'new_amount':   str(new_amount),
                    'reason':       reason,
                    'is_permanent': override.is_permanent,
                    'component':    comp_obj.name,
                    'status':       'PENDING',
                },
            )
            return {
                'Reason': 'Override saved. Will be applied when salary is generated.',
                'id':     override.id,
                'staff':  staff_name,
                'new_amount': str(new_amount),
                'status': 'PENDING',
            }

    if month_plan.is_locked and not is_permanent:
        raise exceptions.ValidationError(
            'Record is locked. Non-permanent overrides cannot be applied to locked salary records.'
        )

    component = month_plan.salary_component
    if component_id:
        try:
            component = SalaryComponent.objects.get(id=component_id, is_active=True)
        except SalaryComponent.DoesNotExist:
            raise exceptions.ValidationError('Salary component not found.')

    staff = month_plan.staff
    staff_name = ''
    if staff:
        parts = [staff.first_name or '']
        if getattr(staff, 'middle_name', None):
            parts.append(staff.middle_name)
        if getattr(staff, 'last_name', None):
            parts.append(staff.last_name)
        staff_name = ' '.join(parts).strip()

    sal_year = month_plan.salary_month.year if month_plan.salary_month else None
    sal_month = month_plan.salary_month.month if month_plan.salary_month else None

    old_amount = month_plan.amount
    new_amount = Decimal(str(amount))

    override = SalaryEmployeeOverride.objects.create(
        month_plan       = month_plan,
        staff            = staff,
        staff_name       = staff_name,
        salary_year      = sal_year,
        salary_month     = sal_month,
        salary_component = component,
        amount           = new_amount,
        reason           = reason,
        is_permanent     = bool(is_permanent),
        approved_by      = user,
        is_active        = True,
        created_by       = user,
        modified_by      = user,
    )

    month_plan.amount = new_amount
    month_plan.save(update_fields=['amount'])

    _audit(
        action='OVERRIDE',
        user=user,
        staff=month_plan.staff,
        salary_month=month_plan.salary_month,
        details={
            'override_id':  override.id,
            'old_amount':   str(old_amount),
            'new_amount':   str(new_amount),
            'reason':       reason,
            'is_permanent': override.is_permanent,
            'component':    component.name if component else None,
        },
    )
    return {
        'Reason': 'Override applied successfully.',
        'id':     override.id,
        'staff':  str(month_plan.staff),
        'old_amount': str(old_amount),
        'new_amount': str(new_amount),
    }


def apply_salary_increment(self, data, user=None):
    
    staff_id         = data.get('staff')
    increment_type   = data.get('increment_type', 'INCREMENT')
    calculation_mode = data.get('calculation_mode', 'AMOUNT')
    raw_amount       = Decimal(str(data.get('amount', 0)))
    percentage_val   = data.get('percentage')
    effective_date   = data.get('effective_date')
    reason           = data.get('reason', '')
    bonus_name       = data.get('bonus_name', '')
    employee_plan_id = data.get('employee_plan')

    if not staff_id:
        raise exceptions.ValidationError('staff is required.')
    if not effective_date:
        raise exceptions.ValidationError('effective_date is required.')
    if increment_type not in ('INCREMENT', 'BONUS'):
        raise exceptions.ValidationError('increment_type must be INCREMENT or BONUS.')
    if calculation_mode not in ('AMOUNT', 'PERCENTAGE'):
        raise exceptions.ValidationError('calculation_mode must be AMOUNT or PERCENTAGE.')

    try:
        staff = Staff.objects.get(id=staff_id, is_active=True)
    except Staff.DoesNotExist:
        raise exceptions.ValidationError('Staff not found.')

    employee_plan = None
    if employee_plan_id:
        try:
            employee_plan = SalaryEmployeePlan.objects.get(id=employee_plan_id, staff=staff)
        except SalaryEmployeePlan.DoesNotExist:
            raise exceptions.ValidationError('Employee plan not found.')

    # Read old_gross from StaffSalary (single source of truth)
    current_salary_row = StaffSalaryModel.objects.filter(
        staff=staff, is_active=True, to_date__isnull=True
    ).order_by('-from_date').first()
    if not current_salary_row:
        current_salary_row = StaffSalaryModel.objects.filter(
            staff=staff, is_active=True
        ).order_by('-from_date').first()

    old_gross = Decimal(str(current_salary_row.salary if current_salary_row else (staff.salary or 0)))
    new_gross = None

    if calculation_mode == 'PERCENTAGE':
        if not percentage_val or Decimal(str(percentage_val)) <= 0:
            raise exceptions.ValidationError('Percentage must be positive.')
        percentage_val = Decimal(str(percentage_val))
        amount = (old_gross * percentage_val / Decimal('100')).quantize(Decimal('0.01'))
    else:
        amount = raw_amount
        percentage_val = None

    if amount <= 0:
        raise exceptions.ValidationError('Increment amount must be positive.')

    eff_date = effective_date
    if isinstance(eff_date, str):
        eff_date = date.fromisoformat(eff_date)
    should_apply_now = (eff_date <= date.today())

    if increment_type == 'INCREMENT':
        new_gross = old_gross + amount

        # Close old StaffSalary record and create new one
        if current_salary_row:
            current_salary_row.to_date = eff_date - timedelta(days=1)
            current_salary_row.save(update_fields=['to_date'])

        StaffSalaryModel.objects.create(
            staff=staff,
            salary=new_gross,
            from_date=eff_date,
            to_date=None,
            comments=f'Increment: {reason}' if reason else 'Salary Increment',
            is_active=True,
        )

    increment = SalaryEmployeeIncrement.objects.create(
        employee_plan    = employee_plan,
        staff            = staff,
        increment_type   = increment_type,
        calculation_mode = calculation_mode,
        percentage       = percentage_val,
        amount           = amount,
        old_gross        = old_gross,
        new_gross        = new_gross,
        bonus_name       = bonus_name or '',
        effective_date   = effective_date,
        reason           = reason,
        approved_by      = user,
        applied          = should_apply_now,
        is_active        = True,
        created_by       = user,
        modified_by      = user,
    )

    _audit(
        action=increment_type,
        user=user,
        staff=staff,
        details={
            'increment_id':     increment.id,
            'calculation_mode': calculation_mode,
            'percentage':       str(percentage_val) if percentage_val else None,
            'amount':           str(amount),
            'old_gross':        str(old_gross),
            'new_gross':        str(new_gross) if new_gross else None,
            'effective_date':   str(effective_date),
            'reason':           reason,
            'bonus_name':       bonus_name,
            'applied_now':      should_apply_now,
        },
    )
    return {
        'Reason':    f'{increment_type} applied successfully.' if should_apply_now else f'{increment_type} scheduled for {effective_date}.',
        'id':        increment.id,
        'staff':     str(staff),
        'amount':    str(amount),
        'old_gross': str(old_gross),
        'new_gross': str(new_gross) if new_gross else None,
        'applied':   should_apply_now,
    }