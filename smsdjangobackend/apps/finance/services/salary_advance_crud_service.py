import logging

from django.db import transaction

from apps.finance.models.recoverable_asset import RecoverableAsset
from apps.tenants.services.middlewares import get_current_db_name

logger = logging.getLogger(__name__)


def sync_salary_advance_to_recoverable_asset(salary_advance):

    linked_ra = RecoverableAsset.objects.filter(
        salary_advance=salary_advance, is_active=True
    ).first()
    if not linked_ra:
        return

    update_fields = ['updated_at']
    if linked_ra.closing_balance != salary_advance.closing_balance:
        linked_ra.closing_balance = salary_advance.closing_balance
        update_fields.append('closing_balance')
    if linked_ra.opening_balance != salary_advance.opening_balance:
        linked_ra.opening_balance = salary_advance.opening_balance
        update_fields.append('opening_balance')
    if linked_ra.name != salary_advance.name:
        linked_ra.name = salary_advance.name
        update_fields.append('name')

    if len(update_fields) > 1:
        linked_ra.save(update_fields=update_fields)
        logger.info(f'Synced SA {salary_advance.id} → RA {linked_ra.id}')


def soft_delete_salary_advance_cascade(salary_advance):
    RecoverableAsset.objects.filter(
        salary_advance=salary_advance, is_active=True
    ).update(is_active=False)


def create_recoverable_asset_for_salary_advance(salary_advance, category_id, created_by=None):

    with transaction.atomic(using=get_current_db_name()):
        ra = RecoverableAsset.objects.create(
            category_id=category_id,
            salary_advance=salary_advance,
            name=salary_advance.name or f'SA-{salary_advance.id}',
            asset_type='STAFF_SALARY_ADVANCE',
            linked_module='STAFF_SALARY_ADVANCE',
            opening_balance=salary_advance.opening_balance or salary_advance.total_amount or 0,
            opening_balance_type='DEBIT',
            closing_balance=salary_advance.closing_balance or salary_advance.opening_balance or 0,
            status='APPROVED',
            created_by=created_by,
        )
        logger.info(f'Auto-created RA {ra.id} for SA {salary_advance.id} (category={category_id})')
        return ra
