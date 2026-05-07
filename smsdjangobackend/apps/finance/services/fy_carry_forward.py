from decimal import Decimal
from django.db.models import Sum, Case, When, DecimalField, Q
import logging

from apps.tenants.services.middlewares import get_current_db_name
from django.db import transaction as db_transaction

from apps.institutes.models.financialyear import FinancialYear
from apps.finance.models.bankTransaction import BankDetail, BankTransaction
from apps.finance.models.deposit import DepositWithdrawRecord
from apps.finance.models.recoverable_asset import RecoverableAsset
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
from apps.payroll.models.salary_advance import SalaryAdvance
from apps.finance.serializers import _compute_actual_bank_balance
from apps.finance.services.advance_fee_calculator import compute_advance_fee_balance

from apps.asset.models.asset import Asset
from apps.asset.models.asset_group import AssetGroup
from apps.asset.models.depreciation_snapshot import AssetDepreciationSnapshot
from apps.asset.models.asset_cost_movement import AssetCostMovement


ZERO = Decimal('0.00')
logger = logging.getLogger(__name__)


def get_next_financial_year(source_fy):
    return FinancialYear.objects.filter(
        start_date__gt=source_fy.end_date,
        is_active=True
    ).order_by('start_date').first()


def preview_carry_forward(source_fy_id):
    
    try:
        source_fy = FinancialYear.objects.get(id=source_fy_id)
    except FinancialYear.DoesNotExist:
        return {'error': 'Financial year not found'}

    target_fy = get_next_financial_year(source_fy)

    result = {
        'source_fy': {
            'id': source_fy.id,
            'name': f"{source_fy.start_date.year}-{source_fy.end_date.year}",
            'is_locked': source_fy.is_locked,
        },
        'target_fy': {
            'id': target_fy.id if target_fy else None,
            'name': f"{target_fy.start_date.year}-{target_fy.end_date.year}" if target_fy else None,
        } if target_fy else None,
        'banks': _preview_bank_carry_forward(source_fy),
        'asset_groups': _preview_asset_group_carry_forward(source_fy),
        'fixed_assets': _preview_asset_carry_forward(source_fy),
        'recoverable_assets': _preview_recoverable_carry_forward(source_fy),
        'salary_advances': _preview_salary_advance_carry_forward(source_fy),
        'cash_in_hand': _preview_cash_in_hand_carry_forward(source_fy),

    }

    return result


def execute_carry_forward(source_fy_id, target_fy_id, user=None):
    
    try:
        source_fy = FinancialYear.objects.get(id=source_fy_id)
        target_fy = FinancialYear.objects.get(id=target_fy_id)
    except FinancialYear.DoesNotExist:
        return {'error': 'Financial year not found'}

    if not source_fy.is_locked:
        return {'error': 'Source FY must be locked (balance sheet must be locked) before carry-forward'}

    results = {}

    with db_transaction.atomic(using=get_current_db_name()):
        results['banks'] = _execute_bank_carry_forward(source_fy, target_fy)
        results['asset_groups'] = _execute_asset_group_carry_forward(source_fy, target_fy)
        results['fixed_assets'] = _execute_asset_carry_forward(source_fy, target_fy)
        results['recoverable_assets'] = _execute_recoverable_carry_forward(source_fy, target_fy)
        results['salary_advances'] = _execute_salary_advance_carry_forward(source_fy, target_fy)
        results['cash_in_hand'] = _execute_cash_in_hand_carry_forward(source_fy, target_fy)


    logger.info(
        f'Carry-forward completed: source FY {source_fy.id} → target FY {target_fy.id}. '
        f'Results: {results}'
    )
    return {'success': True, 'results': results}

def _preview_bank_carry_forward(source_fy):

    banks = BankDetail.objects.filter(is_active=True, financial_year=source_fy)
    items = []
    for bank in banks:
        opening = float(bank.opening_balance or 0)

        credit = 0
        debit = 0

        txns = BankTransaction.objects.filter(
            bank=bank, is_active=True,
            date__gte=source_fy.start_date, date__lte=source_fy.end_date
        )
        for txn in txns:
            if txn.amount is None:
                continue
            if txn.is_deposit:
                credit += float(txn.amount)
            else:
                debit += float(txn.amount)

        deposits = DepositWithdrawRecord.objects.filter(
            is_active=True,
            date__gte=source_fy.start_date, date__lte=source_fy.end_date
        ).filter(Q(bank_from=bank) | Q(bank_to=bank))
        for d in deposits:
            if d.amount is None:
                continue
            if d.bank_to_id == bank.id:
                credit += float(d.amount)
            if d.bank_from_id == bank.id:
                debit += float(d.amount)

        closing = opening + credit - debit

        items.append({
            'bank_id': bank.id,
            'bank_name': bank.bank_name,
            'account_num': bank.account_num,
            'opening_balance': opening,
            'credit': credit,
            'debit': debit,
            'closing_balance': closing,
        })

    return items


def _preview_asset_group_carry_forward(source_fy):
    """Preview which asset groups will be carried forward."""
    groups = AssetGroup.objects.filter(
        financial_year=source_fy, is_active=True
    ).order_by('display_order', 'name')

    items = []
    for group in groups:
        asset_count = Asset.objects.filter(
            asset_group=group, is_active=True, status='ACTIVE'
        ).count()
        items.append({
            'group_id': group.id,
            'name': group.name,
            'code': group.code,
            'group_type': group.group_type,
            'depreciation_method': group.depreciation_method,
            'useful_life_years': group.useful_life_years,
            'asset_count': asset_count,
        })
    return items


def _execute_asset_group_carry_forward(source_fy, target_fy):
    """Clone asset groups from source FY to target FY."""
    groups = AssetGroup.objects.filter(
        financial_year=source_fy, is_active=True
    ).order_by('display_order', 'name')

    created = 0
    updated = 0
    group_map = {}  # old group id -> new group object

    # First pass: create/update groups without parent references
    for group in groups:
        existing = AssetGroup.objects.filter(
            financial_year=target_fy,
            code=group.code,
            is_active=True,
        ).first() if group.code else None

        if existing:
            group_map[group.id] = existing
            updated += 1
        else:
            new_group = AssetGroup.objects.create(
                name=group.name,
                code=group.code,
                group_type=group.group_type,
                financial_year=target_fy,
                depreciation_method=group.depreciation_method,
                useful_life_years=group.useful_life_years,
                depreciation_rate=group.depreciation_rate,
                display_order=group.display_order,
                description=group.description,
                is_active=True,
            )
            group_map[group.id] = new_group
            created += 1

    # Second pass: set parent_group references
    for old_group in groups:
        if old_group.parent_group_id and old_group.parent_group_id in group_map:
            new_group = group_map[old_group.id]
            new_group.parent_group = group_map[old_group.parent_group_id]
            new_group.save(update_fields=['parent_group'])

    return {'created': created, 'updated': updated, 'group_map': {k: v.id for k, v in group_map.items()}}


def _execute_bank_carry_forward(source_fy, target_fy):

    banks = BankDetail.objects.filter(is_active=True, financial_year=source_fy)
    preview = _preview_bank_carry_forward(source_fy)
    created = 0
    updated = 0
    for bank in banks:
        bank_data = next((b for b in preview if b['bank_id'] == bank.id), None)
        if not bank_data:
            continue

        closing = bank_data['closing_balance']

        bank.closing_balance = closing
        bank.save()

        existing = BankDetail.objects.filter(
            is_active=True, financial_year=target_fy,
            account_num=bank.account_num, bank_name=bank.bank_name
        ).first()
        if existing:
            existing.opening_balance = closing
            existing.save(update_fields=['opening_balance'])
            updated += 1
            continue

        BankDetail.objects.create(
            bank_id=bank.bank_id,
            bank_name=bank.bank_name,
            branch_name=bank.branch_name,
            account_num=bank.account_num,
            ifsc=bank.ifsc,
            financial_year=target_fy,
            opening_balance=closing,
            opening_balance_type=bank.opening_balance_type,
            closing_balance=0,
        )
        created += 1

    return {'created': created, 'updated': updated}

def _preview_asset_carry_forward(source_fy):
    assets = Asset.objects.filter(
        is_active=True, status='ACTIVE',
        purchase_date__lte=source_fy.end_date
    ).order_by('asset_name')

    items = []
    for asset in assets:
        snapshot = AssetDepreciationSnapshot.objects.filter(
            asset=asset, financial_year=source_fy
        ).first()

        if snapshot:
            closing_value = float(snapshot.closing_value or 0)
        else:
            closing_value = float(asset.original_cost or 0)

        items.append({
            'asset_id': asset.id,
            'asset_name': asset.asset_name,
            'asset_code': asset.asset_code,
            'original_cost': float(asset.original_cost or 0),
            'closing_value': closing_value,
        })

    return items


def _execute_asset_carry_forward(source_fy, target_fy):
    preview = _preview_asset_carry_forward(source_fy)
    created = 0
    updated = 0

    for item in preview:
        asset_id = item['asset_id']
        closing_value = Decimal(str(item['closing_value']))

        existing = AssetCostMovement.objects.filter(
            asset_id=asset_id,
            movement_type='OPENING',
            financial_year=target_fy
        ).first()

        if existing:
            if existing.amount != closing_value and closing_value > 0:
                existing.amount = closing_value
                existing.remarks = f'Carry forward from FY {source_fy.start_date.year}-{source_fy.end_date.year} (updated)'
                existing.save(update_fields=['amount', 'remarks'])
                updated += 1
            continue

        if closing_value > 0:
            AssetCostMovement.objects.create(
                asset_id=asset_id,
                financial_year=target_fy,
                movement_type='OPENING',
                opening_source='PREVIOUS_FY_CLOSING',
                amount=closing_value,
                movement_date=target_fy.start_date,
                remarks=f'Carry forward from FY {source_fy.start_date.year}-{source_fy.end_date.year}'
            )
            created += 1

    return {'created': created, 'updated': updated}

def _preview_recoverable_carry_forward(source_fy):

    assets = RecoverableAsset.objects.filter(
        Q(category__financial_year=source_fy) | Q(category__financial_year__isnull=True),
        is_active=True, status__in=['APPROVED', 'CLOSED']
    ).exclude(
        linked_module='STAFF_SALARY_ADVANCE'
    ).select_related('category', 'bank')

    items = []
    for asset in assets:
        ob_type = getattr(asset, 'opening_balance_type', 'DEBIT') or 'DEBIT'

        linked = asset.linked_module
        is_auto_advance = (
            linked == 'ADVANCE_FEE' and bool(asset.advance_fee_config)
        )

        if linked == 'BANK_ACCOUNT' and asset.bank:
            closing = _compute_actual_bank_balance(
                asset.bank, up_to_date=source_fy.end_date
            )
            opening = Decimal(str(asset.opening_balance or 0))
            additions = max(closing - opening, ZERO) if closing > opening else ZERO
            deductions = max(opening - closing, ZERO) if opening > closing else ZERO
            is_auto_pending = False
        elif is_auto_advance:
            closing = compute_advance_fee_balance(asset, up_to_date=source_fy.end_date)
            opening = Decimal(str(asset.opening_balance or 0))
            additions = max(closing - opening, ZERO) if closing > opening else ZERO
            deductions = max(opening - closing, ZERO) if opening > closing else ZERO
            is_auto_pending = False
            ob_type = 'CREDIT'  # Advance fees are always credit (liability)
        else:
            txn_filter = Q(
                is_active=True,
                transaction_date__gte=source_fy.start_date,
                transaction_date__lte=source_fy.end_date
            )
            is_auto_pending = (
                asset.linked_module == 'SUNDRY_DEBTORS'
                and asset.pending_fees_config
            )
            if is_auto_pending:
                txn_filter &= ~Q(remarks__startswith='[AUTO]')

            pre_txns = asset.recoverable_asset_transaction_recoverable_asset.filter(txn_filter).aggregate(
                debits=Sum(Case(
                    When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                    default=ZERO, output_field=DecimalField()
                )),
                credits=Sum(Case(
                    When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                    default=ZERO, output_field=DecimalField()
                ))
            )

            additions = pre_txns['debits'] or ZERO
            deductions = pre_txns['credits'] or ZERO
            opening = Decimal(str(asset.opening_balance or 0))

            if ob_type == 'CREDIT':
                closing = opening + deductions - additions
            else:
                closing = opening + additions - deductions

        items.append({
            'asset_id': asset.id,
            'name': str(asset),
            'category': asset.category.name if asset.category else '',
            'linked_module': asset.linked_module,
            'opening_balance': float(opening),
            'additions': float(additions),
            'deductions': float(deductions),
            'closing_balance': float(closing),
            'opening_balance_type': ob_type,
            'is_auto_pending': is_auto_pending,
            'is_auto_advance': is_auto_advance,
        })

    return items


def _execute_recoverable_carry_forward(source_fy, target_fy):

    preview = _preview_recoverable_carry_forward(source_fy)
    created = 0
    updated = 0
    skipped = 0

    target_category_map = {}

    for item in preview:
        asset = RecoverableAsset.objects.select_related(
            'category', 'bank'
        ).get(id=item['asset_id'])
        closing = Decimal(str(item['closing_balance']))

        if asset.status == 'CLOSED' and closing == ZERO:
            skipped += 1
            continue

        target_category = asset.category
        if asset.category and asset.category.financial_year_id:
            cat_key = (asset.category.name, target_fy.id)
            if cat_key not in target_category_map:
                target_cat = RecoverableAssetCategory.objects.filter(
                    name=asset.category.name, financial_year=target_fy, is_active=True
                ).first()
                if not target_cat:
                    target_cat = RecoverableAssetCategory.objects.create(
                        name=asset.category.name,
                        code=asset.category.code,
                        financial_year=target_fy,
                        balance_sheet_classification=asset.category.balance_sheet_classification,
                        display_order=asset.category.display_order,
                        is_active=True,
                    )
                target_category_map[cat_key] = target_cat
            target_category = target_category_map[cat_key]

        match_filter = {
            'is_active': True,
            'category': target_category,
        }

        linked = asset.linked_module
        target_bank = asset.bank
        if linked == 'BANK_ACCOUNT' and asset.bank:
            fy_bank = BankDetail.objects.filter(
                is_active=True, financial_year=target_fy,
                account_num=asset.bank.account_num,
                bank_name=asset.bank.bank_name,
            ).first()
            if fy_bank:
                target_bank = fy_bank

        if linked == 'STAFF_SALARY_ADVANCE':
            # SA-linked assets are handled by _execute_salary_advance_carry_forward
            continue
        elif linked == 'BANK_ACCOUNT' and asset.bank:
            match_filter['bank__account_num'] = asset.bank.account_num
            match_filter['bank__bank_name'] = asset.bank.bank_name
            match_filter['linked_module'] = linked
        elif linked == 'CASH_IN_HAND':
            match_filter['linked_module'] = linked
            match_filter['name'] = asset.name
        elif linked == 'SUNDRY_DEBTORS':
            match_filter['linked_module'] = linked
            match_filter['name'] = asset.name
        elif linked == 'ADVANCE_FEE':
            match_filter['linked_module'] = linked
            match_filter['name'] = asset.name
        else:
            match_filter['name'] = asset.name
            if asset.asset_type:
                match_filter['asset_type'] = asset.asset_type

        existing = RecoverableAsset.objects.filter(**match_filter).first()

        if closing == ZERO:
            if existing:
                existing.opening_balance = ZERO
                existing.opening_balance_type = item['opening_balance_type']
                existing.closing_balance = ZERO
                existing.save(update_fields=[
                    'opening_balance', 'opening_balance_type', 'closing_balance'
                ])
                updated += 1
            else:
                skipped += 1
            continue

        if existing:
            existing.opening_balance = abs(closing)
            existing.opening_balance_type = item['opening_balance_type']

            txn_q = Q(is_active=True)
            if item.get('is_auto_pending'):
                txn_q &= ~Q(remarks__startswith='[AUTO]')
            if item.get('is_auto_advance'):
                txn_q &= ~Q(remarks__startswith='[AUTO-ADV]')
            target_txns = existing.recoverable_asset_transaction_recoverable_asset.filter(txn_q).aggregate(
                debits=Sum(Case(
                    When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                    default=ZERO, output_field=DecimalField()
                )),
                credits=Sum(Case(
                    When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                    default=ZERO, output_field=DecimalField()
                ))
            )
            t_additions = target_txns['debits'] or ZERO
            t_deductions = target_txns['credits'] or ZERO
            new_opening = abs(closing)
            if item['opening_balance_type'] == 'CREDIT':
                existing.closing_balance = new_opening + t_deductions - t_additions
            else:
                existing.closing_balance = new_opening + t_additions - t_deductions

            if asset.pending_fees_config:
                existing.pending_fees_config = asset.pending_fees_config
            if asset.advance_fee_config:
                existing.advance_fee_config = asset.advance_fee_config
            if asset.linked_module:
                existing.linked_module = asset.linked_module
            # Update bank FK to target FY's BankDetail for BANK_ACCOUNT
            if linked == 'BANK_ACCOUNT' and target_bank:
                existing.bank = target_bank
            update_fields = [
                'opening_balance', 'opening_balance_type', 'closing_balance',
                'pending_fees_config', 'advance_fee_config', 'linked_module',
            ]
            if linked == 'BANK_ACCOUNT':
                update_fields.append('bank')
            existing.save(update_fields=update_fields)
            updated += 1
            continue

        RecoverableAsset.objects.create(
            name=asset.name,
            category=target_category,
            bank=target_bank,
            bank_name=asset.bank_name,
            account_number=asset.account_number,
            counterparty_name=asset.counterparty_name,
            counterparty_type=asset.counterparty_type,
            asset_type=asset.asset_type,
            account_label=asset.account_label,
            opening_balance=abs(closing),
            opening_balance_type=item['opening_balance_type'],
            closing_balance=abs(closing),
            status='APPROVED',
            linked_module=asset.linked_module,
            pending_fees_config=asset.pending_fees_config,
            advance_fee_config=asset.advance_fee_config,
            remarks=asset.remarks,
        )
        created += 1

    return {'created': created, 'updated': updated, 'skipped': skipped}


def _preview_salary_advance_carry_forward(source_fy):
    advances = SalaryAdvance.objects.filter(
        financial_year=source_fy, is_active=True,
        status__in=['APPROVED', 'CLOSED']
    ).select_related('staff')

    items = []
    for adv in advances:
        items.append({
            'advance_id': adv.id,
            'name': str(adv),
            'staff_name': str(adv.staff) if adv.staff else '',
            'opening_balance': float(adv.opening_balance or 0),
            'closing_balance': float(adv.closing_balance or 0),
            'status': adv.status,
        })
    return items


def _execute_salary_advance_carry_forward(source_fy, target_fy):
    preview = _preview_salary_advance_carry_forward(source_fy)
    created = 0
    updated = 0
    skipped = 0

    for item in preview:
        adv = SalaryAdvance.objects.get(id=item['advance_id'])
        closing = Decimal(str(item['closing_balance']))

        if adv.status == 'CLOSED' and closing == ZERO:
            skipped += 1
            continue

        existing = SalaryAdvance.objects.filter(
            financial_year=target_fy,
            staff=adv.staff,
            name=adv.name,
            is_active=True,
        ).first()

        if closing == ZERO:
            if existing:
                existing.opening_balance = ZERO
                existing.closing_balance = ZERO
                existing.save(update_fields=['opening_balance', 'closing_balance'])
                updated += 1
            else:
                skipped += 1
            continue

        if existing:
            existing.opening_balance = abs(closing)
            existing.closing_balance = abs(closing)
            existing.save(update_fields=['opening_balance', 'closing_balance'])
            RecoverableAsset.objects.filter(
                salary_advance=existing, is_active=True
            ).update(opening_balance=abs(closing), closing_balance=abs(closing))
            updated += 1
        else:
            new_sa = SalaryAdvance.objects.create(
                name=adv.name,
                staff=adv.staff,
                financial_year=target_fy,
                total_amount=adv.total_amount,
                opening_balance=abs(closing),
                opening_balance_type=adv.opening_balance_type,
                closing_balance=abs(closing),
                monthly_recovery_amount=adv.monthly_recovery_amount,
                start_month=adv.start_month,
                tenure_months=adv.tenure_months,
                emi_amount=adv.emi_amount,
                expected_end_date=adv.expected_end_date,
                interest_rate=adv.interest_rate,
                interest_type=adv.interest_type,
                auto_deduct_from_payroll=adv.auto_deduct_from_payroll,
                deduction_priority=adv.deduction_priority,
                penalty_rate=adv.penalty_rate,
                status='APPROVED' if closing > ZERO else 'CLOSED',
                purpose=adv.purpose,
                remarks=adv.remarks,
            )

            # Create linked RecoverableAsset for balance sheet
            # Find or create the SA category for the target FY
            sa_category = RecoverableAssetCategory.objects.filter(
                financial_year=target_fy,
                code='STAFF_SALARY_ADVANCE',
                is_active=True,
            ).first()
            if not sa_category:
                sa_category = RecoverableAssetCategory.objects.create(
                    name='Staff Salary Advance',
                    code='STAFF_SALARY_ADVANCE',
                    financial_year=target_fy,
                    balance_sheet_classification='LIABILITY',
                    is_active=True,
                )

            RecoverableAsset.objects.create(
                name=new_sa.name,
                category=sa_category,
                linked_module='STAFF_SALARY_ADVANCE',
                salary_advance=new_sa,
                opening_balance=abs(closing),
                opening_balance_type=adv.opening_balance_type,
                closing_balance=abs(closing),
                status='APPROVED',
            )
            created += 1

    return {'created': created, 'updated': updated, 'skipped': skipped}

def _preview_cash_in_hand_carry_forward(source_fy):

    wallets = StaffWallet.objects.filter(is_active=True).select_related('staff')
    items = []

    for wallet in wallets:
        opening = float(wallet.opening_balance or 0)
        user = wallet.staff.user if hasattr(wallet.staff, 'user') else None

        if not user:
            items.append({
                'wallet_id': wallet.id,
                'staff_name': str(wallet.staff),
                'opening_balance': opening,
                'deposits': 0,
                'withdrawals': 0,
                'closing_balance': opening,
            })
            continue

        deposits = DepositWithdrawRecord.objects.filter(
            is_active=True,
            date__gte=source_fy.start_date,
            date__lte=source_fy.end_date,
            user_to=user,
            transaction_type=1,
            bank_to__isnull=True,
            bank_from__isnull=True,
        ).aggregate(total=Sum('amount'))['total'] or 0

        withdrawals = DepositWithdrawRecord.objects.filter(
            is_active=True,
            date__gte=source_fy.start_date,
            date__lte=source_fy.end_date,
            user_from=user,
            transaction_type=2,
            bank_to__isnull=True,
            bank_from__isnull=True,
        ).aggregate(total=Sum('amount'))['total'] or 0

        closing = opening + float(deposits) - float(withdrawals)

        items.append({
            'wallet_id': wallet.id,
            'staff_name': str(wallet.staff),
            'opening_balance': opening,
            'deposits': float(deposits),
            'withdrawals': float(withdrawals),
            'closing_balance': closing,
        })

    return items


def _execute_cash_in_hand_carry_forward(source_fy, target_fy):

    preview = _preview_cash_in_hand_carry_forward(source_fy)
    updated = 0

    for item in preview:
        closing = Decimal(str(item['closing_balance']))
        wallet = StaffWallet.objects.get(id=item['wallet_id'])

        wallet.opening_balance = closing
        wallet.opening_date = target_fy.start_date
        wallet.save()

        staff_name = str(wallet.staff) if wallet.staff else ''
        linked_ra = RecoverableAsset.objects.filter(
            linked_module='CASH_IN_HAND',
            is_active=True,
            category__financial_year=target_fy,
        )
        if staff_name:
            linked_ra = linked_ra.filter(name__icontains=staff_name.strip())
        linked_ra = linked_ra.first()
        if linked_ra:
            linked_ra.opening_balance = closing
            linked_ra.closing_balance = closing
            linked_ra.save(update_fields=['opening_balance', 'closing_balance'])

        updated += 1

    return {'updated': updated}


def re_sync_carry_forward(source_fy_id, target_fy_id, user=None):
    return execute_carry_forward(source_fy_id, target_fy_id, user=user)
