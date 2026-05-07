"""
Preset Formula Seeder Service

Creates SalaryFormula + SalaryFormulaRule records from predefined templates.
Uses existing SalaryComponent records (matched by codename).
"""

import logging
from django.db import transaction

from rest_framework import exceptions

from apps.tenants.services.middlewares import get_current_db_name
from apps.payroll.models.payroll import (
    SalaryFormula, SalaryFormulaRule, SalaryComponent,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Preset definitions
# ---------------------------------------------------------------------------

PRESET_FORMULAS = {
    'STANDARD_INDIAN': {
        'name': 'Standard Indian Payroll',
        'rules': [
            {'codename': 'basicpay',          'sequence': 10, 'calculation_type': 'PERCENT',   'value': 50,   'base_codename': None},
            {'codename': 'hra',               'sequence': 20, 'calculation_type': 'PERCENT',   'value': 20,   'base_codename': 'basicpay'},
            {'codename': 'da',                'sequence': 30, 'calculation_type': 'PERCENT',   'value': 10,   'base_codename': 'basicpay'},
            {'codename': 'special_allowance', 'sequence': 40, 'calculation_type': 'REMAINING', 'value': None, 'base_codename': None},
            {'codename': 'pf',                'sequence': 50, 'calculation_type': 'PERCENT',   'value': 12,   'base_codename': 'basicpay'},
            {'codename': 'pt',                'sequence': 60, 'calculation_type': 'FIXED',     'value': 200,  'base_codename': None},
        ],
    },

    'ESIC_INCLUDED': {
        'name': 'Standard Indian Payroll with ESIC',
        'rules': [
            {'codename': 'basicpay',          'sequence': 10, 'calculation_type': 'PERCENT',   'value': 40,   'base_codename': None},
            {'codename': 'hra',               'sequence': 20, 'calculation_type': 'PERCENT',   'value': 20,   'base_codename': 'basicpay'},
            {'codename': 'da',                'sequence': 30, 'calculation_type': 'PERCENT',   'value': 10,   'base_codename': 'basicpay'},
            {'codename': 'special_allowance', 'sequence': 40, 'calculation_type': 'REMAINING', 'value': None, 'base_codename': None},
            {'codename': 'pf',                'sequence': 50, 'calculation_type': 'PERCENT',   'value': 12,   'base_codename': 'basicpay'},
            {'codename': 'esic',              'sequence': 60, 'calculation_type': 'PERCENT',   'value': 0.75, 'base_codename': None},
            {'codename': 'pt',                'sequence': 70, 'calculation_type': 'FIXED',     'value': 200,  'base_codename': None},
        ],
    },

    'BASIC_HRA_PF': {
        'name': 'Basic + HRA + PF (Simple)',
        'rules': [
            {'codename': 'basicpay', 'sequence': 10, 'calculation_type': 'PERCENT', 'value': 60, 'base_codename': None},
            {'codename': 'hra',      'sequence': 20, 'calculation_type': 'PERCENT', 'value': 40, 'base_codename': 'basicpay'},
            {'codename': 'pf',       'sequence': 30, 'calculation_type': 'PERCENT', 'value': 12, 'base_codename': 'basicpay'},
        ],
    },

    'FLAT_SALARY': {
        'name': 'Flat Salary (No Component Split)',
        'rules': [
            {'codename': 'basicpay', 'sequence': 10, 'calculation_type': 'PERCENT', 'value': 100, 'base_codename': None},
            {'codename': 'pf',       'sequence': 20, 'calculation_type': 'PERCENT', 'value': 12,  'base_codename': 'basicpay'},
        ],
    },

    'TEACHING_STAFF': {
        'name': 'Teaching Staff Payroll',
        'rules': [
            {'codename': 'basicpay',          'sequence': 10, 'calculation_type': 'PERCENT',   'value': 45,   'base_codename': None},
            {'codename': 'hra',               'sequence': 20, 'calculation_type': 'PERCENT',   'value': 15,   'base_codename': 'basicpay'},
            {'codename': 'ta',                'sequence': 30, 'calculation_type': 'PERCENT',   'value': 10,   'base_codename': 'basicpay'},
            {'codename': 'medical_allowance', 'sequence': 40, 'calculation_type': 'PERCENT',   'value': 5,    'base_codename': 'basicpay'},
            {'codename': 'special_allowance', 'sequence': 50, 'calculation_type': 'REMAINING', 'value': None, 'base_codename': None},
            {'codename': 'pf',                'sequence': 60, 'calculation_type': 'PERCENT',   'value': 12,   'base_codename': 'basicpay'},
            {'codename': 'pt',                'sequence': 70, 'calculation_type': 'FIXED',     'value': 200,  'base_codename': None},
        ],
    },

    'NON_TEACHING_STAFF': {
        'name': 'Non-Teaching Staff Payroll',
        'rules': [
            {'codename': 'basicpay',          'sequence': 10, 'calculation_type': 'PERCENT',   'value': 50,    'base_codename': None},
            {'codename': 'hra',               'sequence': 20, 'calculation_type': 'PERCENT',   'value': 15,    'base_codename': 'basicpay'},
            {'codename': 'conveyance',        'sequence': 30, 'calculation_type': 'FIXED',     'value': 1600,  'base_codename': None},
            {'codename': 'special_allowance', 'sequence': 40, 'calculation_type': 'REMAINING', 'value': None,  'base_codename': None},
            {'codename': 'pf',                'sequence': 50, 'calculation_type': 'PERCENT',   'value': 12,    'base_codename': 'basicpay'},
            {'codename': 'esic',              'sequence': 60, 'calculation_type': 'PERCENT',   'value': 0.75,  'base_codename': None},
            {'codename': 'pt',                'sequence': 70, 'calculation_type': 'FIXED',     'value': 200,   'base_codename': None},
        ],
    },
}


# ---------------------------------------------------------------------------
# Seeder function
# ---------------------------------------------------------------------------

def seed_preset_formula(financial_year_id, preset_key, user=None):
    """
    Create a SalaryFormula + SalaryFormulaRule records from a preset template.

    Looks up SalaryComponent by codename. Skips rules whose component
    doesn't exist yet (logs a warning).

    Returns dict with formula_id, skipped_components list.
    """

    if preset_key not in PRESET_FORMULAS:
        raise exceptions.ValidationError(
            'Unknown preset "{}". Available: {}'.format(
                preset_key, list(PRESET_FORMULAS.keys())
            )
        )

    preset = PRESET_FORMULAS[preset_key]

    # Prevent duplicates
    if SalaryFormula.objects.filter(
        financial_year_id=financial_year_id,
        name=preset['name'],
        is_active=True,
    ).exists():
        raise exceptions.ValidationError(
            'Formula "{}" already exists for this financial year.'.format(preset['name'])
        )

    skipped = []

    with transaction.atomic(using=get_current_db_name()):
        formula = SalaryFormula.objects.create(
            financial_year_id=financial_year_id,
            name=preset['name'],
            is_default=True,
            is_active=True,
        )

        for rule_def in preset['rules']:
            try:
                component = SalaryComponent.objects.get(
                    codename=rule_def['codename'], is_active=True
                )
            except SalaryComponent.DoesNotExist:
                skipped.append(rule_def['codename'])
                logger.warning(
                    'seed_preset: codename="%s" not found — skipped.',
                    rule_def['codename'],
                )
                continue

            base_component = None
            if rule_def.get('base_codename'):
                base_component = SalaryComponent.objects.filter(
                    codename=rule_def['base_codename'], is_active=True
                ).first()
                if not base_component:
                    logger.warning(
                        'seed_preset: base codename="%s" not found — rule will use GROSS.',
                        rule_def['base_codename'],
                    )

            SalaryFormulaRule.objects.create(
                formula=formula,
                salary_component=component,
                base_component=base_component,
                sequence=rule_def['sequence'],
                calculation_type=rule_def['calculation_type'],
                value=rule_def.get('value') or 0,
                expression=rule_def.get('expression'),
                is_active=True,
                created_by=user,
                modified_by=user,
            )

    return {
        'Reason': 'Preset formula "{}" created successfully.'.format(preset['name']),
        'formula_id': formula.id,
        'financial_year_id': financial_year_id,
        'skipped_components': skipped,
    }
