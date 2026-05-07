"""
Custom payroll formula seed migration.

Components and calculation logic:
- Earnings:
  - HRA = round(GROSS * 30%)
  - BA  = ceil(min(GROSS - HRA, 15000) / 2)
  - DA  = min(GROSS - HRA, 15000) - BA
  - OA  = max(GROSS - HRA - BA - DA, 0)
- Deductions:
  - PF   = round((BA + DA) * 12%)
  - ESIC = ceil(GROSS * 0.75%) if GROSS <= 21000 and ESIC opted, else 0
  - PT   = 200 if GROSS > 25000, else 0
  - LIC  = fixed deduction (optional; default 0, per-staff override supported)
"""
from decimal import Decimal

from django.db import migrations


FORMULA_NAME = 'Default Formula'
FORMULA_VERSION = 1

# (codename, display_name, is_deduction)
COMPONENTS = [
    ('HRA', 'House Rent Allowance', False),
    ('BA', 'Basic Allowance', False),
    ('DA', 'Dearness Allowance', False),
    ('OA', 'Other Allowance', False),
    ('PF', 'Provident Fund', True),
    ('ESIC', 'Employee State Insurance', True),
    ('PT', 'Professional Tax', True),
    ('LIC', 'Life Insurance Corporation', True),
]

# (sequence, codename, calculation_type, value, base_codename, expression, is_optional)
RULES = [
    (1, 'HRA', 'EXPRESSION', None, None, 'round(GROSS * 0.30)', False),
    (2, 'BA', 'EXPRESSION', None, None, 'ceil(min(GROSS - HRA, 15000) / 2)', False),
    (3, 'DA', 'EXPRESSION', None, None, 'min(GROSS - HRA, 15000) - BA', False),
    (4, 'OA', 'EXPRESSION', None, None, 'max(GROSS - HRA - BA - DA, 0)', False),
    (5, 'PF', 'EXPRESSION', None, None, 'round((BA + DA) * 0.12)', False),
    (6, 'ESIC', 'EXPRESSION', None, None, 'ceil(GROSS * 0.0075) if (GROSS <= 21000 and ESIC_OPTED) else 0', True),
    (7, 'PT', 'EXPRESSION', None, None, '200 if GROSS > 25000 else 0', False),
    (8, 'LIC', 'FIXED', 0, None, None, True),
]


def seed_default_formula(apps, schema_editor):
    SalaryComponent = apps.get_model('payroll', 'SalaryComponent')
    SalaryFormula = apps.get_model('payroll', 'SalaryFormula')
    SalaryFormulaRule = apps.get_model('payroll', 'SalaryFormulaRule')

    component_map = {}
    for codename, name, is_deduction in COMPONENTS:
        component, _ = SalaryComponent.objects.get_or_create(
            codename=codename,
            defaults={
                'name': name,
                'is_deduction': is_deduction,
                'is_active': True,
            },
        )
        updates = []
        if component.is_deduction != is_deduction:
            component.is_deduction = is_deduction
            updates.append('is_deduction')
        if not component.is_active:
            component.is_active = True
            updates.append('is_active')
        if updates:
            component.save(update_fields=updates)
        component_map[codename] = component

    SalaryFormula.objects.filter(is_default=True).update(is_default=False)

    formula, _ = SalaryFormula.objects.get_or_create(
        name=FORMULA_NAME,
        version=FORMULA_VERSION,
        defaults={
            'description': (
                'Default payroll formula: HRA 30%, BA+DA capped at 15000, '
                'PF 12% on BA+DA, ESIC 0.75% conditional, PT slab at 200, '
                'and LIC fixed optional deduction.'
            ),
            'is_active': True,
            'is_default': True,
        },
    )

    changed_fields = []
    if not formula.is_active:
        formula.is_active = True
        changed_fields.append('is_active')
    if not formula.is_default:
        formula.is_default = True
        changed_fields.append('is_default')
    if changed_fields:
        formula.save(update_fields=changed_fields)

    SalaryFormulaRule.objects.filter(formula=formula).delete()
    for sequence, codename, calc_type, value, base_codename, expression, is_optional in RULES:
        SalaryFormulaRule.objects.create(
            formula=formula,
            salary_component=component_map[codename],
            sequence=sequence,
            calculation_type=calc_type,
            value=Decimal(str(value)) if value is not None else Decimal('0'),
            base_component=component_map.get(base_codename),
            expression=expression or '',
            is_active=True,
            is_optional=is_optional,
        )


def unseed_default_formula(apps, schema_editor):
    SalaryFormula = apps.get_model('payroll', 'SalaryFormula')
    SalaryFormulaRule = apps.get_model('payroll', 'SalaryFormulaRule')

    formula = SalaryFormula.objects.filter(
        name=FORMULA_NAME,
        version=FORMULA_VERSION,
    ).first()
    if not formula:
        return

    SalaryFormulaRule.objects.filter(formula=formula).delete()
    formula.delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0007_canteen_deduction_component'),
    ]

    operations = [
        migrations.RunPython(seed_default_formula, unseed_default_formula),
    ]
