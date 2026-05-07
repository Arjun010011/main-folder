"""
Seed Janajoythi Payroll Formula
================================
Creates the "Janajoythi Payroll" formula with components and rules.

Usage:
    python manage.py seed_janajoythi_payroll
    python manage.py seed_janajoythi_payroll --teardown
"""
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.tenants.services.middlewares import get_current_db_name
from apps.payroll.models.payroll import (
    SalaryComponent,
    SalaryFormula,
    SalaryFormulaRule,
)

FORMULA_NAME = 'Janajoythi Payroll'

# (codename, display_name, is_deduction)
COMPONENTS = [
    ('HRA',  'House Rent Allowance',       False),
    ('BA',   'Basic Allowance',            False),
    ('DA',   'Dearness Allowance',         False),
    ('OA',   'Other Allowance',            False),
    ('PF',   'Provident Fund',             True),
    ('ESIC', 'Employee State Insurance',   True),
    ('PT',   'Professional Tax',           True),
    ('LIC',  'Life Insurance Corporation', True),
]

# (seq, codename, calc_type, value, base_codename, expression, is_optional)
#
# Engine namespace: GROSS, WORKING, PRESENT, ESIC_OPTED, PF_OPTED
#                   + all computed codenames from earlier sequences.
# Engine auto-prorates earnings by PRESENT/WORKING; deductions are NOT prorated.
RULES = [
    (1, 'HRA',  'EXPRESSION', None, None, 'round(GROSS * 0.30)',                                            False),
    (2, 'BA',   'EXPRESSION', None, None, 'ceil(min(GROSS - HRA, 15000) / 2)',                              False),
    (3, 'DA',   'EXPRESSION', None, None, 'min(GROSS - HRA, 15000) - BA',                                  False),
    (4, 'OA',   'EXPRESSION', None, None, 'max(GROSS - HRA - BA - DA, 0)',                                 False),
    (5, 'PF',   'EXPRESSION', None, None, 'round((BA + DA) * 0.12)',                                       False),
    (6, 'ESIC', 'EXPRESSION', None, None, 'ceil(GROSS * 0.0075) if (GROSS <= 21000 and ESIC_OPTED) else 0', True),
    (7, 'PT',   'EXPRESSION', None, None, '200 if GROSS > 25000 else 0',                                   False),
    (8, 'LIC',  'FIXED',      0,    None, None,                                                            True),
]


class Command(BaseCommand):
    help = 'Seed Janajoythi Payroll formula (components + rules)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--teardown', action='store_true',
            help='Remove the Janajoythi formula and its rules',
        )

    def handle(self, *args, **options):
        if options['teardown']:
            self._teardown()
        else:
            self._setup()

    # ─── SETUP ────────────────────────────────────────────────────
    def _setup(self):
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(' Janajoythi Payroll — Seed Setup')
        self.stdout.write('=' * 60)

        with transaction.atomic(using=get_current_db_name()):
            comp_map = self._seed_components()
            self._seed_formula(comp_map)

        self.stdout.write(self.style.SUCCESS('\n✓ Janajoythi Payroll seeded.'))
        self.stdout.write('''
Staff setup:
  Staff.salary      = monthly_gross × 12
  AccountDetail:
    esi_num         → populate to enable ESIC
    account_num     → bank A/C shown on payslip
  LIC               → set per-staff via salary override (fixed deduction)
''')

    def _seed_components(self):
        self.stdout.write('  Seeding salary components…')
        result = {}
        for codename, name, is_ded in COMPONENTS:
            obj, created = SalaryComponent.objects.get_or_create(
                codename=codename,
                defaults={'name': name, 'is_deduction': is_ded, 'is_active': True},
            )
            if not created and obj.is_deduction != is_ded:
                obj.is_deduction = is_ded
                obj.save(update_fields=['is_deduction'])
            result[codename] = obj
        self.stdout.write(f'    → {len(result)} components ready.')
        return result

    def _seed_formula(self, comp_map):
        self.stdout.write('  Seeding formula + rules…')

        formula, created = SalaryFormula.objects.get_or_create(
            name=FORMULA_NAME, version=1,
            defaults={
                'description': (
                    'Janajoythi Payroll: HRA 30%, BA+DA capped at ₹15000, '
                    'PF 12% of BA+DA, ESIC 0.75% (conditional), PT ₹200 slab, '
                    'LIC fixed per-staff.'
                ),
                'is_active': True, 'is_default': True,
            },
        )

        # Re-seed rules (idempotent)
        old = SalaryFormulaRule.objects.filter(formula=formula).delete()[0]
        if old:
            self.stdout.write(f'    → Cleared {old} old rules.')

        for seq, codename, calc_type, value, base_code, expr, optional in RULES:
            SalaryFormulaRule.objects.create(
                formula=formula,
                salary_component=comp_map[codename],
                sequence=seq,
                calculation_type=calc_type,
                value=Decimal(str(value)) if value is not None else Decimal('0'),
                base_component=comp_map.get(base_code),
                expression=expr or '',
                is_active=True,
                is_optional=optional,
            )

        self.stdout.write(f'    → {len(RULES)} rules created.')

    # ─── TEARDOWN ─────────────────────────────────────────────────
    def _teardown(self):
        self.stdout.write('  Teardown: Janajoythi Payroll…')
        with transaction.atomic(using=get_current_db_name()):
            formula = SalaryFormula.objects.filter(name=FORMULA_NAME).first()
            if formula:
                n = SalaryFormulaRule.objects.filter(formula=formula).delete()[0]
                formula.delete()
                self.stdout.write(f'    → Deleted formula + {n} rules.')
            else:
                self.stdout.write('    → Formula not found.')
        self.stdout.write(self.style.SUCCESS('✓ Teardown complete.'))
