"""
Unit tests for the Asset Management module.
Tests cover: AssetGroup CRUD, Asset CRUD, Depreciation, Disposal, CostMovement, Reports, Dashboard.
"""
import json
from decimal import Decimal

from django.test import TestCase, Client
from django.urls import reverse

from apps.asset.models import (
    AssetGroup, Asset, AssetDepreciationSnapshot,
    AssetDisposal, AssetCostMovement, AssetSnapshotLockHistory
)
from apps.institutes.models import FinancialYear

client = Client()


# ━━━━━━━━━━━━━━━ HELPERS ━━━━━━━━━━━━━━━
def _create_fy(start='2024-04-01', end='2025-03-31'):
    return FinancialYear.objects.create(start_date=start, end_date=end)


def _create_group(**kwargs):
    defaults = {
        'name': 'Furniture',
        'code': 'FUR',
        'depreciation_method': 'SLM',
        'useful_life_years': 10,
    }
    defaults.update(kwargs)
    return AssetGroup.objects.create(**defaults)


def _create_asset(group, **kwargs):
    defaults = {
        'asset_code': 'FA-001',
        'asset_name': 'Office Chair',
        'asset_group': group,
        'purchase_date': '2024-06-01',
        'original_cost': Decimal('50000.00'),
        'salvage_value': Decimal('5000.00'),
    }
    defaults.update(kwargs)
    return Asset.objects.create(**defaults)


# ━━━━━━━━━━━━━━━ ASSET GROUP TESTS ━━━━━━━━━━━━━━━

class AssetGroupModelTest(TestCase):
    """Test AssetGroup model behavior."""

    def test_create_group(self):
        group = _create_group()
        self.assertEqual(group.name, 'Furniture')
        self.assertTrue(group.is_active)
        self.assertTrue(group.is_depreciable)

    def test_non_depreciable_group(self):
        group = _create_group(name='Land', code='LAND', depreciation_method='NONE')
        self.assertFalse(group.is_depreciable)

    def test_hierarchy_path(self):
        parent = _create_group(name='Property', code='PROP')
        child = _create_group(name='Building', code='BLDG', parent_group=parent)
        path = child.get_hierarchy_path()
        self.assertEqual(path, ['Property', 'Building'])

    def test_get_all_children(self):
        parent = _create_group(name='Property', code='PROP')
        child1 = _create_group(name='Building', code='BLDG', parent_group=parent)
        child2 = _create_group(name='Land', code='LAND', parent_group=parent)
        grandchild = _create_group(name='Floor 1', code='FL1', parent_group=child1)
        children = parent.get_all_children()
        self.assertEqual(len(children), 3)

    def test_str_representation(self):
        group = _create_group()
        self.assertEqual(str(group), 'Furniture')


class AssetGroupAPITest(TestCase):
    """Test AssetGroup API endpoints."""

    def test_create_asset_group(self):
        payload = {
            'name': 'Computers',
            'code': 'COMP',
            'depreciation_method': 'SLM',
            'useful_life_years': 5,
        }
        response = client.post(
            reverse('asset-groups-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_create_group_missing_useful_life_slm(self):
        """SLM requires useful_life_years."""
        payload = {
            'name': 'Bad Group',
            'code': 'BAD',
            'depreciation_method': 'SLM',
            'useful_life_years': 0,
        }
        response = client.post(
            reverse('asset-groups-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_create_group_wdv_missing_rate(self):
        """WDV requires depreciation_rate."""
        payload = {
            'name': 'WDV Group',
            'code': 'WDV1',
            'depreciation_method': 'WDV',
            'useful_life_years': 10,
        }
        response = client.post(
            reverse('asset-groups-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_list_asset_groups(self):
        _create_group()
        response = client.get(reverse('asset-groups-list'))
        self.assertEqual(response.status_code, 200)

    def test_list_tree_view(self):
        _create_group()
        response = client.get(reverse('asset-groups-list') + '?tree_view=true')
        self.assertEqual(response.status_code, 200)

    def test_update_asset_group(self):
        group = _create_group()
        payload = {
            'name': 'Updated Furniture',
            'code': 'FUR',
            'depreciation_method': 'SLM',
            'useful_life_years': 15,
        }
        response = client.put(
            reverse('asset-groups-detail', kwargs={'pk': group.pk}),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_group_with_assets_fails(self):
        group = _create_group()
        _create_asset(group)
        response = client.delete(reverse('asset-groups-detail', kwargs={'pk': group.pk}))
        self.assertNotEqual(response.status_code, 200)

    def test_delete_group_with_children_fails(self):
        parent = _create_group(name='Parent', code='PAR')
        _create_group(name='Child', code='CHD', parent_group=parent)
        response = client.delete(reverse('asset-groups-detail', kwargs={'pk': parent.pk}))
        self.assertNotEqual(response.status_code, 200)

    def test_delete_empty_group(self):
        group = _create_group()
        response = client.delete(reverse('asset-groups-detail', kwargs={'pk': group.pk}))
        self.assertEqual(response.status_code, 200)

    def test_circular_parent_rejected(self):
        """Cannot set self as parent."""
        group = _create_group()
        payload = {
            'name': 'Furniture',
            'code': 'FUR',
            'depreciation_method': 'SLM',
            'useful_life_years': 10,
            'parent_group': group.pk,
        }
        response = client.put(
            reverse('asset-groups-detail', kwargs={'pk': group.pk}),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ ASSET TESTS ━━━━━━━━━━━━━━━

class AssetModelTest(TestCase):
    """Test Asset model behavior."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()

    def test_create_asset(self):
        asset = _create_asset(self.group)
        self.assertEqual(asset.status, 'ACTIVE')
        self.assertTrue(asset.is_active)
        self.assertFalse(asset.is_fully_depreciated)

    def test_put_to_use_defaults_to_purchase(self):
        asset = _create_asset(self.group, put_to_use_date=None)
        self.assertEqual(asset.put_to_use_date, asset.purchase_date)

    def test_capitalization_defaults_to_put_to_use(self):
        asset = _create_asset(self.group, put_to_use_date='2024-07-01', capitalization_date=None)
        self.assertEqual(str(asset.capitalization_date), '2024-07-01')

    def test_effective_useful_life_from_group(self):
        asset = _create_asset(self.group)
        self.assertEqual(asset.get_effective_useful_life(), 10)

    def test_effective_useful_life_override(self):
        asset = _create_asset(self.group, useful_life_years=5)
        self.assertEqual(asset.get_effective_useful_life(), 5)

    def test_depreciation_method_from_group(self):
        asset = _create_asset(self.group)
        self.assertEqual(asset.get_depreciation_method(), 'SLM')

    def test_is_depreciable(self):
        asset = _create_asset(self.group)
        self.assertTrue(asset.is_depreciable())

    def test_non_depreciable_asset(self):
        land_group = _create_group(name='Land', code='LAND', depreciation_method='NONE')
        asset = _create_asset(land_group, asset_code='FA-LAND')
        self.assertFalse(asset.is_depreciable())

    def test_str_representation(self):
        asset = _create_asset(self.group)
        self.assertIn('FA-001', str(asset))


class AssetAPITest(TestCase):
    """Test Asset API endpoints."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()

    def test_create_asset(self):
        payload = {
            'asset_code': 'FA-002',
            'asset_name': 'Desk',
            'asset_group': self.group.pk,
            'purchase_date': '2024-06-15',
            'original_cost': '25000.00',
            'salvage_value': '2500.00',
        }
        response = client.post(
            reverse('assets-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_create_asset_salvage_exceeds_cost(self):
        payload = {
            'asset_code': 'FA-BAD',
            'asset_name': 'Bad Asset',
            'asset_group': self.group.pk,
            'purchase_date': '2024-06-15',
            'original_cost': '10000.00',
            'salvage_value': '20000.00',
        }
        response = client.post(
            reverse('assets-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_create_asset_on_non_leaf_group(self):
        """Cannot assign asset to group with children."""
        child = _create_group(name='Child', code='CHD', parent_group=self.group)
        payload = {
            'asset_code': 'FA-003',
            'asset_name': 'Non-leaf',
            'asset_group': self.group.pk,
            'purchase_date': '2024-06-15',
            'original_cost': '10000.00',
        }
        response = client.post(
            reverse('assets-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_list_assets(self):
        _create_asset(self.group)
        response = client.get(reverse('assets-list'))
        self.assertEqual(response.status_code, 200)

    def test_retrieve_asset(self):
        asset = _create_asset(self.group)
        response = client.get(reverse('assets-detail', kwargs={'pk': asset.pk}))
        self.assertEqual(response.status_code, 200)

    def test_update_asset(self):
        asset = _create_asset(self.group)
        payload = {
            'asset_code': 'FA-001',
            'asset_name': 'Updated Chair',
            'asset_group': self.group.pk,
            'purchase_date': '2024-06-01',
            'original_cost': '55000.00',
            'salvage_value': '5000.00',
        }
        response = client.put(
            reverse('assets-detail', kwargs={'pk': asset.pk}),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_delete_asset(self):
        asset = _create_asset(self.group)
        response = client.delete(reverse('assets-detail', kwargs={'pk': asset.pk}))
        self.assertEqual(response.status_code, 200)

    def test_filter_by_status(self):
        _create_asset(self.group)
        response = client.get(reverse('assets-list') + '?status=ACTIVE')
        self.assertEqual(response.status_code, 200)

    def test_filter_by_group(self):
        _create_asset(self.group)
        response = client.get(reverse('assets-list') + f'?asset_group={self.group.pk}')
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ DISPOSAL TESTS ━━━━━━━━━━━━━━━

class AssetDisposalTest(TestCase):
    """Test asset disposal functionality."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()
        self.asset = _create_asset(self.group)

    def test_dispose_asset_sold(self):
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-01-15',
            'disposal_value': '10000.00',
            'reason': 'SOLD',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_dispose_asset_donated_zero_value(self):
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-01-15',
            'disposal_value': '0.00',
            'reason': 'DONATED',
            'remarks': 'Donated to charity',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_dispose_sold_zero_value_fails(self):
        """Sold assets must have disposal_value > 0."""
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-01-15',
            'disposal_value': '0.00',
            'reason': 'SOLD',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_dispose_donated_with_value_fails(self):
        """Donated assets must have disposal_value = 0."""
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-01-15',
            'disposal_value': '5000.00',
            'reason': 'DONATED',
            'remarks': 'Donated',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_dispose_donated_without_remarks_fails(self):
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-01-15',
            'disposal_value': '0.00',
            'reason': 'DONATED',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_disposal_before_purchase_fails(self):
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2023-01-01',
            'disposal_value': '5000.00',
            'reason': 'SOLD',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_double_disposal_fails(self):
        """Cannot dispose an already-disposed asset."""
        # First disposal
        AssetDisposal.objects.create(
            asset=self.asset,
            disposal_date='2025-01-10',
            disposal_value=Decimal('5000'),
            reason='SOLD'
        )
        self.asset.status = 'DISPOSED'
        self.asset.save()
        # Second
        payload = {
            'asset': self.asset.pk,
            'disposal_date': '2025-02-15',
            'disposal_value': '5000.00',
            'reason': 'SOLD',
        }
        response = client.post(
            reverse('asset-disposals-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_gain_loss_calculation(self):
        disposal = AssetDisposal(
            asset=self.asset,
            disposal_date='2025-01-10',
            disposal_value=Decimal('60000'),
            wdv_at_disposal=Decimal('45000'),
            reason='SOLD'
        )
        disposal.save()
        self.assertEqual(disposal.gain_loss, Decimal('15000'))

    def test_loss_calculation(self):
        disposal = AssetDisposal(
            asset=self.asset,
            disposal_date='2025-01-10',
            disposal_value=Decimal('20000'),
            wdv_at_disposal=Decimal('45000'),
            reason='SOLD'
        )
        disposal.save()
        self.assertEqual(disposal.gain_loss, Decimal('-25000'))

    def test_list_disposals(self):
        response = client.get(reverse('asset-disposals-list'))
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ DEPRECIATION SNAPSHOT TESTS ━━━━━━━━━━━━━━━

class DepreciationSnapshotModelTest(TestCase):
    """Test depreciation snapshot model."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()
        self.asset = _create_asset(self.group)

    def test_create_snapshot(self):
        snapshot = AssetDepreciationSnapshot.objects.create(
            asset=self.asset,
            financial_year=self.fy,
            opening_value=Decimal('50000'),
            depreciation_amount=Decimal('4500'),
            closing_value=Decimal('45500'),
            calculation_method='SLM',
        )
        self.assertFalse(snapshot.is_locked)
        self.assertEqual(snapshot.months_depreciated, 12)

    def test_unique_asset_fy(self):
        """Cannot create two snapshots for same asset + FY."""
        AssetDepreciationSnapshot.objects.create(
            asset=self.asset,
            financial_year=self.fy,
            opening_value=Decimal('50000'),
            depreciation_amount=Decimal('4500'),
            closing_value=Decimal('45500'),
            calculation_method='SLM',
        )
        with self.assertRaises(Exception):
            AssetDepreciationSnapshot.objects.create(
                asset=self.asset,
                financial_year=self.fy,
                opening_value=Decimal('50000'),
                depreciation_amount=Decimal('4500'),
                closing_value=Decimal('45500'),
                calculation_method='SLM',
            )

    def test_modify_locked_snapshot_fails(self):
        snapshot = AssetDepreciationSnapshot.objects.create(
            asset=self.asset,
            financial_year=self.fy,
            opening_value=Decimal('50000'),
            depreciation_amount=Decimal('4500'),
            closing_value=Decimal('45500'),
            calculation_method='SLM',
            is_locked=True,
        )
        snapshot.depreciation_amount = Decimal('5000')
        with self.assertRaises(Exception):
            snapshot.save()


class DepreciationAPITest(TestCase):
    """Test depreciation API."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()
        self.asset = _create_asset(self.group)

    def test_list_requires_fy(self):
        response = client.get(reverse('depreciation-list'))
        self.assertNotEqual(response.status_code, 200)

    def test_list_with_fy(self):
        response = client.get(reverse('depreciation-list') + f'?financial_year={self.fy.pk}')
        self.assertEqual(response.status_code, 200)

    def test_preview_depreciation(self):
        payload = {
            'action': 'preview',
            'financial_year': self.fy.pk,
        }
        response = client.post(
            reverse('depreciation-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_generate_depreciation(self):
        payload = {
            'action': 'generate',
            'financial_year': self.fy.pk,
        }
        response = client.post(
            reverse('depreciation-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 200)

    def test_unknown_action_fails(self):
        payload = {
            'action': 'unknown',
            'financial_year': self.fy.pk,
        }
        response = client.post(
            reverse('depreciation-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)

    def test_preview_without_fy_fails(self):
        payload = {'action': 'preview'}
        response = client.post(
            reverse('depreciation-list'),
            data=json.dumps(payload),
            content_type='application/json'
        )
        self.assertNotEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ COST MOVEMENT TESTS ━━━━━━━━━━━━━━━

class CostMovementModelTest(TestCase):
    """Test AssetCostMovement model."""

    def setUp(self):
        self.group = _create_group()
        self.fy = _create_fy()
        self.asset = _create_asset(self.group)

    def test_opening_movement(self):
        cm = AssetCostMovement(
            asset=self.asset,
            financial_year=self.fy,
            movement_type='OPENING',
            amount=Decimal('50000'),
            movement_date='2024-06-01',
            opening_source='MIGRATED',
            opening_reference='Initial balance',
        )
        cm.save()
        self.assertEqual(cm.movement_type, 'OPENING')

    def test_opening_without_source_fails(self):
        cm = AssetCostMovement(
            asset=self.asset,
            financial_year=self.fy,
            movement_type='OPENING',
            amount=Decimal('50000'),
            movement_date='2024-06-01',
        )
        with self.assertRaises(Exception):
            cm.save()

    def test_addition_movement(self):
        cm = AssetCostMovement(
            asset=self.asset,
            financial_year=self.fy,
            movement_type='ADDITION',
            amount=Decimal('10000'),
            movement_date='2024-09-01',
        )
        cm.save()
        self.assertEqual(cm.movement_type, 'ADDITION')

    def test_list_cost_movements(self):
        response = client.get(reverse('cost-movements-list'))
        self.assertEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ REPORT TESTS ━━━━━━━━━━━━━━━

class ReportAPITest(TestCase):
    """Test report endpoints."""

    def setUp(self):
        self.fy = _create_fy()

    def test_fixed_asset_register_requires_fy(self):
        response = client.get(reverse('fixed-asset-register-list'))
        self.assertNotEqual(response.status_code, 200)

    def test_fixed_asset_register_with_fy(self):
        response = client.get(
            reverse('fixed-asset-register-list') + f'?financial_year={self.fy.pk}'
        )
        self.assertEqual(response.status_code, 200)

    def test_asset_group_summary_requires_fy(self):
        response = client.get(reverse('asset-group-summary-list'))
        self.assertNotEqual(response.status_code, 200)

    def test_asset_group_summary_with_fy(self):
        response = client.get(
            reverse('asset-group-summary-list') + f'?financial_year={self.fy.pk}'
        )
        self.assertEqual(response.status_code, 200)

    def test_depreciation_schedule_requires_asset(self):
        response = client.get(reverse('depreciation-schedule-list'))
        self.assertNotEqual(response.status_code, 200)

    def test_cost_register_requires_fy(self):
        response = client.get(reverse('fixed-asset-cost-register-list'))
        self.assertNotEqual(response.status_code, 200)

    def test_cost_summary_requires_fy(self):
        response = client.get(reverse('asset-group-cost-summary-list'))
        self.assertNotEqual(response.status_code, 200)


# ━━━━━━━━━━━━━━━ DASHBOARD TEST ━━━━━━━━━━━━━━━

class DashboardAPITest(TestCase):

    def test_dashboard(self):
        response = client.get(reverse('dashboard-list'))
        self.assertEqual(response.status_code, 200)
