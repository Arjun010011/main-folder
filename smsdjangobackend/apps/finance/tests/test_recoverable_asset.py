"""
Unit tests for the Recoverable Asset module.
Tests cover: Category CRUD, RecoverableAsset CRUD, Transaction CRUD,
History, Reports, Dashboard, edge cases.
"""
import json
from decimal import Decimal

from django.test import TestCase, Client
from django.urls import reverse

from apps.finance.models.recoverable_asset import (
    RecoverableAsset, RecoverableAssetTransaction, RecoverableAssetHistory
)
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.institutes.models import FinancialYear

client = Client()


# ━━━━━━━━━━━━━━━ HELPERS ━━━━━━━━━━━━━━━
def _create_fy(start='2024-04-01', end='2025-03-31'):
    return FinancialYear.objects.create(start_date=start, end_date=end)


def _create_category(**kwargs):
    defaults = {
        'code': 'STABILITY_FUND',
        'name': 'Stability Fund',
        'is_system': True,
        'asset_types': ['STABILITY_FUND'],
    }
    defaults.update(kwargs)
    return RecoverableAssetCategory.objects.create(**defaults)


def _create_asset(category=None, fy=None, **kwargs):
    defaults = {
        'name': 'Test Stability Fund',
        'asset_type': 'STABILITY_FUND',
        'opening_balance': Decimal('10000.00'),
        'closing_balance': Decimal('10000.00'),
        'status': 'APPROVED',
    }
    if category:
        defaults['category'] = category
    if fy:
        defaults['financial_year'] = fy
    defaults.update(kwargs)
    return RecoverableAsset.objects.create(**defaults)


def _create_transaction(asset, **kwargs):
    defaults = {
        'recoverable_asset': asset,
        'transaction_date': '2024-08-15',
        'transaction_type': 'CREDIT',
        'amount': Decimal('5000.00'),
    }
    defaults.update(kwargs)
    return RecoverableAssetTransaction.objects.create(**defaults)


# ━━━━━━━━━━━━━━━ CATEGORY TESTS ━━━━━━━━━━━━━━━

class RecoverableAssetCategoryModelTest(TestCase):
    """Test RecoverableAssetCategory model."""

    def test_create_system_category(self):
        cat = _create_category()
        self.assertTrue(cat.is_system)
        self.assertIn('System', str(cat))

    def test_create_custom_category(self):
        cat = _create_category(
            code='CUSTOM_1', name='Custom Type', is_system=False
        )
        self.assertFalse(cat.is_system)
        self.assertNotIn('System', str(cat))

    def test_linked_system_category(self):
        cat = _create_category(
            code='SALARY_ADV', name='Salary Advance',
            is_system=True, is_linked_system=True
        )
        self.assertTrue(cat.is_linked_system)
        self.assertIn('Linked', str(cat))

    def test_unique_code(self):
        _create_category()
        with self.assertRaises(Exception):
            _create_category()

    def test_system_category_choices_structure(self):
        """Built-in SYSTEM_CATEGORY_CHOICES should have expected keys."""
        for choice in RecoverableAssetCategory.SYSTEM_CATEGORY_CHOICES:
            self.assertIn('code', choice)
            self.assertIn('name', choice)
            self.assertIn('asset_types', choice)


class RecoverableAssetCategoryAPITest(TestCase):
    """Test Category API endpoints."""

    def test_create_category(self):
        payload = {
            'code': 'DEPOSITS',
            'name': 'Security Deposits',
            'asset_types': ['DEPOSIT'],
        }
        response = client.post(
            reverse('recoverableassetcategory-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_list_categories(self):
        _create_category()
        response = client.get(reverse('recoverableassetcategory-list'))
        self.assertEqual(response.status_code, 200)

    def test_update_category(self):
        cat = _create_category()
        payload = {
            'code': 'STABILITY_FUND',
            'name': 'Updated Stability Fund',
            'asset_types': ['STABILITY_FUND'],
        }
        response = client.put(
            reverse('recoverableassetcategory-detail', kwargs={'pk': cat.pk}),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_category(self):
        cat = _create_category(code='TEMP', name='Temp', is_system=False)
        response = client.delete(
            reverse('recoverableassetcategory-detail', kwargs={'pk': cat.pk})
        )
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ RECOVERABLE ASSET TESTS ━━━━━━━━━━━━━━━

class RecoverableAssetModelTest(TestCase):
    """Test RecoverableAsset model."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()

    def test_create_stability_fund(self):
        asset = _create_asset(self.category, self.fy)
        self.assertEqual(asset.asset_type, 'STABILITY_FUND')
        self.assertEqual(asset.status, 'APPROVED')
        self.assertTrue(asset.is_active)

    def test_create_loan(self):
        cat = _create_category(code='LOANS', name='Loans', asset_types=['LOAN', 'ADVANCE'])
        asset = _create_asset(
            cat, self.fy,
            name='Vendor Loan', asset_type='LOAN',
            counterparty_name='ABC Corp', counterparty_type='VENDOR',
            total_amount=Decimal('100000'), monthly_recovery_amount=Decimal('10000'),
        )
        self.assertEqual(asset.asset_type, 'LOAN')
        self.assertEqual(asset.counterparty_type, 'VENDOR')

    def test_create_advance(self):
        cat = _create_category(code='ADV', name='Advances', asset_types=['ADVANCE'])
        asset = _create_asset(
            cat, self.fy,
            name='Travel Advance', asset_type='ADVANCE',
            counterparty_name='John Doe', counterparty_type='INDIVIDUAL',
        )
        self.assertEqual(asset.asset_type, 'ADVANCE')

    def test_create_deposit(self):
        cat = _create_category(code='DEP', name='Deposits', asset_types=['DEPOSIT'])
        asset = _create_asset(
            cat, self.fy,
            name='Rental Deposit', asset_type='DEPOSIT',
            counterparty_name='Landlord', counterparty_type='INSTITUTION',
        )
        self.assertEqual(asset.asset_type, 'DEPOSIT')

    def test_create_staff_salary_advance(self):
        asset = _create_asset(
            self.category, self.fy,
            name='Salary Advance', asset_type='STAFF_SALARY_ADVANCE',
            total_amount=Decimal('25000'), monthly_recovery_amount=Decimal('5000'),
            auto_deduct_from_payroll=True,
        )
        self.assertEqual(asset.asset_type, 'STAFF_SALARY_ADVANCE')
        self.assertTrue(asset.auto_deduct_from_payroll)

    def test_str_representation(self):
        asset = _create_asset(self.category, self.fy)
        self.assertIn('Stability Fund', str(asset))

    def test_default_status_approved(self):
        asset = _create_asset(self.category, self.fy)
        self.assertEqual(asset.status, 'APPROVED')

    def test_closure_reasons(self):
        asset = _create_asset(
            self.category, self.fy,
            status='CLOSED', closure_reason='NORMAL_RECOVERY',
        )
        self.assertEqual(asset.closure_reason, 'NORMAL_RECOVERY')

    def test_interest_fields(self):
        asset = _create_asset(
            self.category, self.fy,
            interest_type='SIMPLE', interest_rate=Decimal('8.50'),
        )
        self.assertEqual(asset.interest_type, 'SIMPLE')
        self.assertEqual(asset.interest_rate, Decimal('8.50'))

    def test_particulars_stability_fund(self):
        asset = _create_asset(
            self.category, self.fy,
            bank_name='SBI', account_number='1234567890', account_label='OLD',
        )
        particulars = asset.get_particulars()
        self.assertIn('Stability Fund', particulars)
        self.assertIn('SBI', particulars)
        self.assertIn('Old', particulars)

    def test_particulars_loan(self):
        asset = _create_asset(
            self.category, self.fy,
            name='Equipment Loan', asset_type='LOAN',
            counterparty_name='XYZ Corp',
        )
        particulars = asset.get_particulars()
        self.assertIn('XYZ Corp', particulars)
        self.assertIn('Loan', particulars)

    def test_particulars_salary_advance_without_staff(self):
        asset = _create_asset(
            self.category, self.fy,
            name='Advance', asset_type='STAFF_SALARY_ADVANCE',
        )
        particulars = asset.get_particulars()
        self.assertIn('Staff Salary Advance', particulars)


class RecoverableAssetAPITest(TestCase):
    """Test RecoverableAsset API endpoints."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()

    def test_create_asset(self):
        payload = {
            'name': 'New Fund',
            'asset_type': 'STABILITY_FUND',
            'category': self.category.pk,
            'financial_year': self.fy.pk,
            'opening_balance': '15000.00',
        }
        response = client.post(
            reverse('recoverableasset-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_list_assets(self):
        _create_asset(self.category, self.fy)
        response = client.get(reverse('recoverableasset-list'))
        self.assertEqual(response.status_code, 200)

    def test_filter_by_asset_type(self):
        _create_asset(self.category, self.fy)
        response = client.get(reverse('recoverableasset-list') + '?asset_type=STABILITY_FUND')
        self.assertEqual(response.status_code, 200)

    def test_filter_by_stability_fund_legacy(self):
        _create_asset(self.category, self.fy)
        response = client.get(reverse('recoverableasset-list') + '?stability_fund=true')
        self.assertEqual(response.status_code, 200)

    def test_filter_by_loans_advance_legacy(self):
        response = client.get(reverse('recoverableasset-list') + '?loans_advance=true')
        self.assertEqual(response.status_code, 200)

    def test_filter_by_salary_advance_legacy(self):
        response = client.get(reverse('recoverableasset-list') + '?salary_advance=true')
        self.assertEqual(response.status_code, 200)

    def test_filter_by_category(self):
        _create_asset(self.category, self.fy)
        response = client.get(
            reverse('recoverableasset-list') + f'?category={self.category.pk}'
        )
        self.assertEqual(response.status_code, 200)

    def test_retrieve_asset(self):
        asset = _create_asset(self.category, self.fy)
        response = client.get(
            reverse('recoverableasset-detail', kwargs={'pk': asset.pk})
        )
        self.assertEqual(response.status_code, 200)

    def test_update_asset(self):
        asset = _create_asset(self.category, self.fy)
        payload = {
            'name': 'Updated Fund',
            'asset_type': 'STABILITY_FUND',
            'opening_balance': '20000.00',
        }
        response = client.put(
            reverse('recoverableasset-detail', kwargs={'pk': asset.pk}),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_asset(self):
        asset = _create_asset(self.category, self.fy)
        response = client.delete(
            reverse('recoverableasset-detail', kwargs={'pk': asset.pk})
        )
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ TRANSACTION TESTS ━━━━━━━━━━━━━━━

class TransactionModelTest(TestCase):
    """Test RecoverableAssetTransaction model."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()
        self.asset = _create_asset(self.category, self.fy)

    def test_create_credit_transaction(self):
        txn = _create_transaction(self.asset, transaction_type='CREDIT')
        self.assertTrue(txn.is_credit_type())
        self.assertFalse(txn.is_debit_type())

    def test_create_debit_transaction(self):
        txn = _create_transaction(self.asset, transaction_type='DEBIT')
        self.assertTrue(txn.is_debit_type())
        self.assertFalse(txn.is_credit_type())

    def test_advance_is_debit(self):
        txn = _create_transaction(self.asset, transaction_type='ADVANCE')
        self.assertTrue(txn.is_debit_type())

    def test_recovery_is_credit(self):
        txn = _create_transaction(self.asset, transaction_type='RECOVERY')
        self.assertTrue(txn.is_credit_type())

    def test_interest_is_debit(self):
        txn = _create_transaction(self.asset, transaction_type='INTEREST')
        self.assertTrue(txn.is_debit_type())

    def test_penalty_is_debit(self):
        txn = _create_transaction(self.asset, transaction_type='PENALTY')
        self.assertTrue(txn.is_debit_type())

    def test_adjustment_is_credit(self):
        txn = _create_transaction(self.asset, transaction_type='ADJUSTMENT')
        self.assertTrue(txn.is_credit_type())

    def test_reversal_is_credit(self):
        txn = _create_transaction(self.asset, transaction_type='REVERSAL')
        self.assertTrue(txn.is_credit_type())

    def test_str_representation(self):
        txn = _create_transaction(self.asset)
        self.assertIn('CREDIT', str(txn))

    def test_transaction_default_active(self):
        txn = _create_transaction(self.asset)
        self.assertTrue(txn.is_active)


class TransactionAPITest(TestCase):
    """Test Transaction API endpoints."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()
        self.asset = _create_asset(self.category, self.fy)

    def test_create_transaction(self):
        payload = {
            'recoverable_asset': self.asset.pk,
            'stability_fund': self.asset.pk,
            'transaction_date': '2024-09-01',
            'transaction_type': 'CREDIT',
            'amount': '5000.00',
        }
        response = client.post(
            reverse('recoverableassettransaction-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_create_transaction_zero_amount_fails(self):
        payload = {
            'recoverable_asset': self.asset.pk,
            'stability_fund': self.asset.pk,
            'transaction_date': '2024-09-01',
            'transaction_type': 'CREDIT',
            'amount': '0.00',
        }
        response = client.post(
            reverse('recoverableassettransaction-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_create_transaction_negative_amount_fails(self):
        payload = {
            'recoverable_asset': self.asset.pk,
            'stability_fund': self.asset.pk,
            'transaction_date': '2024-09-01',
            'transaction_type': 'CREDIT',
            'amount': '-500.00',
        }
        response = client.post(
            reverse('recoverableassettransaction-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_list_transactions(self):
        response = client.get(reverse('recoverableassettransaction-list'))
        self.assertEqual(response.status_code, 200)

    def test_filter_by_asset(self):
        _create_transaction(self.asset)
        response = client.get(
            reverse('recoverableassettransaction-list') + f'?recoverable_asset={self.asset.pk}'
        )
        self.assertEqual(response.status_code, 200)

    def test_filter_by_date_range(self):
        _create_transaction(self.asset)
        response = client.get(
            reverse('recoverableassettransaction-list') + '?start_date=2024-01-01&end_date=2025-12-31'
        )
        self.assertEqual(response.status_code, 200)

    def test_filter_stability_fund_legacy(self):
        response = client.get(
            reverse('recoverableassettransaction-list') + '?stability_fund=true'
        )
        self.assertEqual(response.status_code, 200)

    def test_create_transaction_on_inactive_asset_fails(self):
        self.asset.is_active = False
        self.asset.save()
        payload = {
            'recoverable_asset': self.asset.pk,
            'stability_fund': self.asset.pk,
            'transaction_date': '2024-09-01',
            'transaction_type': 'CREDIT',
            'amount': '5000.00',
        }
        response = client.post(
            reverse('recoverableassettransaction-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ HISTORY TESTS ━━━━━━━━━━━━━━━

class HistoryModelTest(TestCase):
    """Test RecoverableAssetHistory model."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()
        self.asset = _create_asset(self.category, self.fy)

    def test_create_history(self):
        history = RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset,
            action='CREATE',
            new_data={'name': 'Test'},
        )
        self.assertEqual(history.action, 'CREATE')
        self.assertIsNone(history.previous_data)

    def test_update_history(self):
        history = RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset,
            action='UPDATE',
            previous_data={'name': 'Old Name'},
            new_data={'name': 'New Name'},
        )
        self.assertEqual(history.action, 'UPDATE')
        self.assertIsNotNone(history.previous_data)

    def test_delete_history(self):
        history = RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset,
            action='DELETE',
            previous_data={'name': 'Deleted'},
        )
        self.assertEqual(history.action, 'DELETE')

    def test_transaction_history_link(self):
        txn = _create_transaction(self.asset)
        history = RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset,
            recoverable_asset_transaction=txn,
            action='CREATE',
            new_data={'amount': '5000'},
        )
        self.assertEqual(history.recoverable_asset_transaction, txn)


class HistoryAPITest(TestCase):
    """Test History API endpoints."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()
        self.asset = _create_asset(self.category, self.fy)

    def test_list_history(self):
        RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset, action='CREATE',
            new_data={'name': 'Test'},
        )
        response = client.get(reverse('recoverableassethistory-list'))
        self.assertEqual(response.status_code, 200)

    def test_filter_history_by_asset(self):
        RecoverableAssetHistory.objects.create(
            recoverable_asset=self.asset, action='CREATE',
            new_data={'name': 'Test'},
        )
        response = client.get(
            reverse('recoverableassethistory-list') + f'?recoverable_asset={self.asset.pk}'
        )
        self.assertEqual(response.status_code, 200)

    def test_filter_transaction_history(self):
        response = client.get(
            reverse('recoverableassethistory-list') + '?is_transaction_history=true'
        )
        self.assertEqual(response.status_code, 200)

    def test_filter_non_transaction_history(self):
        response = client.get(
            reverse('recoverableassethistory-list') + '?is_transaction_history=false'
        )
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ REPORT & DASHBOARD TESTS ━━━━━━━━━━━━━━━

class RecoverableAssetReportAPITest(TestCase):
    """Test report and dashboard endpoints."""

    def test_report_endpoint(self):
        response = client.get(reverse('recoverableassetreport-list'))
        self.assertEqual(response.status_code, 200)

    def test_dashboard_endpoint(self):
        response = client.get(reverse('recoverableasset_dashboard-list'))
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ EDGE CASE TESTS ━━━━━━━━━━━━━━━

class RecoverableAssetEdgeCaseTest(TestCase):
    """Edge case and boundary condition tests."""

    def setUp(self):
        self.category = _create_category()
        self.fy = _create_fy()

    def test_zero_opening_balance(self):
        asset = _create_asset(
            self.category, self.fy,
            opening_balance=Decimal('0.00'),
            closing_balance=Decimal('0.00'),
        )
        self.assertEqual(asset.opening_balance, Decimal('0.00'))

    def test_large_amount(self):
        asset = _create_asset(
            self.category, self.fy,
            opening_balance=Decimal('9999999999999.99'),
            closing_balance=Decimal('9999999999999.99'),
        )
        self.assertEqual(asset.opening_balance, Decimal('9999999999999.99'))

    def test_all_asset_types(self):
        """Verify all 5 asset types can be created."""
        types = ['STABILITY_FUND', 'LOAN', 'ADVANCE', 'DEPOSIT', 'STAFF_SALARY_ADVANCE']
        for i, at in enumerate(types):
            asset = _create_asset(
                self.category, self.fy,
                name=f'Asset {at}',
                asset_type=at,
            )
            self.assertEqual(asset.asset_type, at)

    def test_all_status_choices(self):
        statuses = ['DRAFT', 'APPROVED', 'CLOSED', 'CANCELLED']
        for st in statuses:
            asset = _create_asset(
                self.category, self.fy,
                name=f'Asset {st}',
                status=st,
            )
            self.assertEqual(asset.status, st)

    def test_all_counterparty_types(self):
        cpts = ['INSTITUTION', 'VENDOR', 'INDIVIDUAL', 'BANK', 'EMPLOYEE']
        for ct in cpts:
            asset = _create_asset(
                self.category, self.fy,
                name=f'Asset {ct}',
                counterparty_type=ct,
            )
            self.assertEqual(asset.counterparty_type, ct)

    def test_all_interest_types(self):
        types = ['NONE', 'SIMPLE', 'COMPOUND']
        for it in types:
            asset = _create_asset(
                self.category, self.fy,
                name=f'Asset {it}',
                interest_type=it,
            )
            self.assertEqual(asset.interest_type, it)

    def test_all_transaction_types(self):
        asset = _create_asset(self.category, self.fy)
        types = ['CREDIT', 'DEBIT', 'ADVANCE', 'RECOVERY',
                 'ADJUSTMENT', 'INTEREST', 'PENALTY', 'REVERSAL']
        for tt in types:
            txn = _create_transaction(asset, transaction_type=tt)
            self.assertEqual(txn.transaction_type, tt)

    def test_all_closure_reasons(self):
        reasons = ['', 'NORMAL_RECOVERY', 'WRITE_OFF', 'SETTLEMENT']
        for r in reasons:
            asset = _create_asset(
                self.category, self.fy,
                name=f'Closed {r}',
                status='CLOSED',
                closure_reason=r,
            )
            self.assertEqual(asset.closure_reason, r)

    def test_all_account_labels(self):
        labels = ['OLD', 'NEW', 'OTHER']
        for lbl in labels:
            asset = _create_asset(
                self.category, self.fy,
                name=f'Label {lbl}',
                account_label=lbl,
            )
            self.assertEqual(asset.account_label, lbl)

    def test_recovery_fields(self):
        asset = _create_asset(
            self.category, self.fy,
            total_amount=Decimal('50000'),
            monthly_recovery_amount=Decimal('5000'),
            tenure_months=10,
            emi_amount=Decimal('5250'),
            start_month='2024-07-01',
            expected_end_date='2025-04-30',
        )
        self.assertEqual(asset.tenure_months, 10)
        self.assertEqual(asset.emi_amount, Decimal('5250'))

    def test_penalty_rate(self):
        asset = _create_asset(
            self.category, self.fy,
            penalty_rate=Decimal('2.50'),
        )
        self.assertEqual(asset.penalty_rate, Decimal('2.50'))

    def test_source_types_on_transactions(self):
        asset = _create_asset(self.category, self.fy)
        sources = ['MANUAL', 'PAYROLL', 'ADJUSTMENT', 'INTEREST_CALC', 'PENALTY_CALC']
        for src in sources:
            txn = _create_transaction(asset, source_type=src)
            self.assertEqual(txn.source_type, src)

    def test_adjustment_reasons(self):
        asset = _create_asset(self.category, self.fy)
        reasons = ['', 'WRITE_OFF', 'SETTLEMENT', 'CORRECTION', 'WAIVER']
        for r in reasons:
            txn = _create_transaction(
                asset, transaction_type='ADJUSTMENT', adjustment_reason=r,
            )
            self.assertEqual(txn.adjustment_reason, r)
