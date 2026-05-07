"""
    python manage.py seed_assets
"""

import logging
from datetime import date
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name


logger = logging.getLogger(__name__)

FY_START = date(2024, 4, 1)
FY_END = date(2025, 3, 31)

BANKS = [
    {'bank_name': 'Bank of Baroda',           'account_num': '55640100007553', 'opening_balance': 305464.24, 'ifsc': 'BARB0VJSVVK'},
    {'bank_name': 'Canara Bank',              'account_num': '06602200080031', 'opening_balance': 2667247.02, 'ifsc': 'CNRB0000660'},
    {'bank_name': 'Canara Bank',              'account_num': '06602210018925', 'opening_balance': 111457.65,  'ifsc': 'CNRB0000660'},
    {'bank_name': 'TAPCMS Society Bank Joint', 'account_num': '475',           'opening_balance': 42914.00,   'ifsc': 'TAPS0000001'},
]

FIXED_ASSET_GROUPS = [
    {
        'code': 'SCH-A1',
        'name': 'Sch-A1 - Building Construction (FA)',
        'assets': [
            {'code': 'SCH-A1-001', 'name': 'Building Expenses (2019-20)',    'cost': Decimal('83760.00')},
            {'code': 'SCH-A1-002', 'name': 'Building Expenses (Upto 17-18)', 'cost': Decimal('3250025.00')},
        ],
    },
    {
        'code': 'SCH-A2',
        'name': 'Sch-A2 - School Vehicles (FA)',
        'assets': [
            {'code': 'SCH-A2-001', 'name': 'Vehicle No.06 (KA.53/D-0388) (FA)', 'cost': Decimal('425139.00')},
            {'code': 'SCH-A2-002', 'name': 'Vehicle No.07 KA.51/AA-8796 (FA)',  'cost': Decimal('40874.00')},
            {'code': 'SCH-A2-003', 'name': 'Vehicle No.08 KA.53/D-8303 (FA)',   'cost': Decimal('665375.00')},
            {'code': 'SCH-A2-004', 'name': 'Vehicle No.09 KA.53/D-8304 (FA)',   'cost': Decimal('665375.00')},
        ],
    },
    {
        'code': 'SCH-A3',
        'name': 'Sch-A3 - Furniture & Fixtures (FA)',
        'assets': [
            {'code': 'SCH-A3-001', 'name': 'Fabrication Aluminium & UPVC',       'cost': Decimal('160529.00')},
            {'code': 'SCH-A3-002', 'name': 'Fabrication (Balaji Engg) 31.05.22', 'cost': Decimal('396176.22')},
            {'code': 'SCH-A3-003', 'name': 'Furniture & Fixtures (FA)',           'cost': Decimal('522693.22')},
        ],
    },
    {
        'code': 'SCH-A4',
        'name': 'Sch-A4 - Other Fixed Assets (FA)',
        'assets': [
            {'code': 'SCH-A4-001', 'name': 'Other Construction (FA)',                              'cost': Decimal('344045.00')},
            {'code': 'SCH-A4-002', 'name': '"Class Saathi" Clicker Bag - Hardware (FA)',            'cost': Decimal('279696.00')},
            {'code': 'SCH-A4-003', 'name': '1 HPasmsp 625 Openwell Texmo Pump Set',                'cost': Decimal('5397.00')},
            {'code': 'SCH-A4-004', 'name': 'Bamboo Lader (FA)',                                    'cost': Decimal('1044.00')},
            {'code': 'SCH-A4-005', 'name': 'Bandset Instruments (Ghosh) FA',                       'cost': Decimal('11444.00')},
            {'code': 'SCH-A4-006', 'name': 'Camera (Canon M5011 with EFM15-45MM IS STM Kit) FA',   'cost': Decimal('41763.90')},
            {'code': 'SCH-A4-007', 'name': 'CC Camera (FA)',                                       'cost': Decimal('238673.00')},
            {'code': 'SCH-A4-008', 'name': 'Cutting Machine (Turbo YS-5800) FA',                   'cost': Decimal('2044.00')},
            {'code': 'SCH-A4-009', 'name': 'D-Link Networking Cable (FA)',                         'cost': Decimal('13548.00')},
            {'code': 'SCH-A4-010', 'name': 'Epson Printer L3252 (10.07.24)',                       'cost': Decimal('11899.00')},
            {'code': 'SCH-A4-011', 'name': 'FAN (FA)',                                             'cost': Decimal('6194.00')},
            {'code': 'SCH-A4-012', 'name': 'Fire Extinguish (FA)',                                 'cost': Decimal('2892.00')},
            {'code': 'SCH-A4-013', 'name': 'Fire Proof Locker - BS T 1000',                       'cost': Decimal('65875.00')},
            {'code': 'SCH-A4-014', 'name': 'Fire Proof Locker - BS T 670',                        'cost': Decimal('36125.00')},
            {'code': 'SCH-A4-015', 'name': 'Floor Cusion Mat (FA)',                                'cost': Decimal('53199.00')},
            {'code': 'SCH-A4-016', 'name': 'Library Books (FA)',                                   'cost': Decimal('17164.00')},
            {'code': 'SCH-A4-017', 'name': 'Opp Smart Mobile Phone - F27 5g/256GB CPH2637',       'cost': Decimal('20035.00')},
            {'code': 'SCH-A4-018', 'name': 'POE Switch 4 Port  DS-3E0505P-E (FA)',                 'cost': Decimal('2771.00')},
            {'code': 'SCH-A4-019', 'name': 'Printer Cum Zerox Machine (Kyocera2020) FA 12.01.23', 'cost': Decimal('39430.65')},
            {'code': 'SCH-A4-020', 'name': 'Printer & ZEROX (FA)',                                 'cost': Decimal('35254.60')},
            {'code': 'SCH-A4-021', 'name': 'Projection Screen (F/A)',                              'cost': Decimal('4005.00')},
            {'code': 'SCH-A4-022', 'name': 'Science & Maths Lab Equp (FA)',                        'cost': Decimal('38126.00')},
            {'code': 'SCH-A4-023', 'name': 'Skyrimmer 2.0 3D Printer (FA)',                       'cost': Decimal('64116.00')},
            {'code': 'SCH-A4-024', 'name': 'Speaker (FA)',                                         'cost': Decimal('1713.00')},
            {'code': 'SCH-A4-025', 'name': 'Sports Items (FA)',                                    'cost': Decimal('149782.00')},
            {'code': 'SCH-A4-026', 'name': 'Stabilizer (Servo) 10KV (FA)',                         'cost': Decimal('7007.00')},
            {'code': 'SCH-A4-027', 'name': 'Television & Accessories (FA)',                        'cost': Decimal('156701.00')},
            {'code': 'SCH-A4-028', 'name': 'Thermometer (Infrared) FA',                            'cost': Decimal('1689.00')},
            {'code': 'SCH-A4-029', 'name': 'Time Monitoring System & Bell (FA)',                   'cost': Decimal('4316.00')},
            {'code': 'SCH-A4-030', 'name': 'Tonner Cartridge - (KYOCERA 2020) FA',                 'cost': Decimal('1458.60')},
            {'code': 'SCH-A4-031', 'name': 'Tonner Cartridge - (KYOCERA 2040) FA',                 'cost': Decimal('1182.50')},
            {'code': 'SCH-A4-032', 'name': 'U P S with Batteries (FA)',                            'cost': Decimal('143613.00')},
            {'code': 'SCH-A4-033', 'name': 'Zerox Machine (Kyocera Ecosys -M2040DN) FA 12.01.23',  'cost': Decimal('24447.27')},
        ],
    },
    {
        'code': 'SCH-A5',
        'name': 'Sch-A5 - Computer & Other Accessories (FA)',
        'assets': [
            {'code': 'SCH-A5-001', 'name': 'Computer & Accessories (FA)', 'cost': Decimal('17828.00')},
        ],
    },
]

LIABILITIES = [
    {
        'cat_code': 'CAPITAL_ACCOUNT', 'cat_name': 'Capital Account',
        'fc_code': 'CAPITAL_FUND', 'classification': 'LIABILITY', 'order': 1,
        'assets': [
            {'name': 'Capital Fund', 'amount': Decimal('36331711.87')},
        ],
    },
    {
        'cat_code': 'CURRENT_LIABILITIES', 'cat_name': 'Current Liabilities',
        'fc_code': 'PROVISIONS', 'classification': 'LIABILITY', 'order': 2,
        'assets': [
            {'name': 'Provision for Expenses 2024-25',                       'amount': Decimal('48171.00')},
            {'name': 'Provision for Salary Payable 2024-25',                 'amount': Decimal('38740.00')},
            {'name': 'Provision for Statutory Dues Payable 2024-25',         'amount': Decimal('258246.00')},
            {'name': 'Provision for EE Benefit -Gratuity Payable (L.Term)',   'amount': Decimal('1291890.00')},
            {'name': 'Provision for EE Benefit -Gratuity Payable (S.Term)',   'amount': Decimal('29688.00')},
        ],
    },
    {
        'cat_code': 'BRANCH_DIVISIONS', 'cat_name': 'Branch & Divisions',
        'fc_code': 'BRANCH_TRANSFERS', 'classification': 'LIABILITY', 'order': 3,
        'assets': [
            {'name': 'Fund Transfer - STATE Board (Branch)', 'amount': Decimal('20679477.00')},
        ],
    },
    {
        'cat_code': 'SCHOOL_VEHICLES_LOAN', 'cat_name': 'School Vehicles Loan (LL)',
        'fc_code': 'VEHICLE_LOANS', 'classification': 'LIABILITY', 'order': 4,
        'assets': [
            {'name': 'Veh.No08 KA.53/D-8303 Sundaram Loan C.No: P03930009', 'amount': Decimal('313732.00')},
            {'name': 'Veh.No.09 KA.53/D-8304 Sundaram Loan C.N: P03900008', 'amount': Decimal('313732.00')},
        ],
    },
    {
        'cat_code': 'LOANS_LL', 'cat_name': 'Loans (LL)',
        'fc_code': 'TERM_LOANS', 'classification': 'LIABILITY', 'order': 5,
        'assets': [
            {'name': 'D.M. Seetharama Setty (LL)', 'amount': Decimal('1286912.00')},
        ],
    },
]

RECOVERABLE_ASSETS = [
    {
        'cat_code': 'SUNDRY_DEBTORS', 'cat_name': 'Sundry Debtors',
        'fc_code': 'SUNDRY_DEBTORS', 'classification': 'FIXED_ASSET', 'order': 6,
        'linked_module': 'SUNDRY_DEBTORS',
        'assets': [
            {'name': 'Bills Receivable (TF and VF) - 2024-25',          'amount': Decimal('332500.00')},
            {'name': 'Bills Receivable (TF Old DUE) - 2017 to 2024',    'amount': Decimal('336700.00'),
             'credit_txn': Decimal('8600.00')},
        ],
    },
    {
        'cat_code': 'CASH_IN_HAND', 'cat_name': 'Cash-in-Hand',
        'fc_code': 'CASH_IN_HAND', 'classification': 'FIXED_ASSET', 'order': 7,
        'linked_module': 'CASH_IN_HAND',
        'assets': [],
    },
    {
        'cat_code': 'BANK_ACCOUNTS', 'cat_name': 'Bank Accounts',
        'fc_code': 'BANK_ACCOUNTS', 'classification': 'FIXED_ASSET', 'order': 8,
        'linked_module': 'BANK_ACCOUNT',
        'bank_linked': True,
        'assets': [
            {'name': 'SVVK - Bank of Baroda A/c.55640100007553 (SB)',        'amount': Decimal('305464.24'), 'account_num': '55640100007553'},
            {'name': 'SVVK - Canara Bank A/c.06602200080031 (SB)',           'amount': Decimal('2667247.02'), 'account_num': '06602200080031'},
            {'name': 'SVVK - Canara Bank A/c.06602210018925 (SB)',           'amount': Decimal('111457.65'),  'account_num': '06602210018925'},
            {'name': 'SVVK - TAPCMS Society Bank Joint A/c.475 (SB)',        'amount': Decimal('42914.00'),   'account_num': '475'},
        ],
    },
    {
        'cat_code': 'WIP_NEW_BUILDING', 'cat_name': 'Work in Progress - New Building',
        'fc_code': 'WORK_IN_PROGRESS', 'classification': 'FIXED_ASSET', 'order': 9,
        'assets': [
            {'name': 'Work in Progress - New Building (Labour)',   'amount': Decimal('6849360.00')},
            {'name': 'Work in Progress - New Building (Material)', 'amount': Decimal('13415253.00')},
        ],
    },
    {
        'cat_code': 'FIXED_DEPOSITS', 'cat_name': 'Fixed Deposits',
        'fc_code': 'FIXED_DEPOSITS', 'classification': 'FIXED_ASSET', 'order': 10,
        'assets': [
            {'name': 'FD-Canara Bank A/c:130032197625/1 (04/05/2024)',             'amount': Decimal('5293447.00')},
            {'name': 'FD-Canara Bank A/c:130032197625/2 (04/05/2024)',             'amount': Decimal('5293447.00')},
            {'name': 'FD-canara Bank A/c:140130804836/1 (03/8/2024)',              'amount': Decimal('5329655.00')},
            {'name': 'FD-canara Bank A/c:140130804836/2 (03/02/2025)',             'amount': Decimal('10736491.00')},
            {'name': 'FD-VCC Can A/c.06604050009094 /140048878425(8/6/18)',         'amount': Decimal('89053.00')},
            {'name': 'FD-VCC (Sy.Bk.A/c:06604050006071/1) 07/12/2015',            'amount': Decimal('110481.00')},
        ],
    },
    {
        'cat_code': 'LOANS_ADVANCES_OTHERS', 'cat_name': 'Loans & Advances - Others',
        'fc_code': 'LOANS_ADVANCES', 'classification': 'FIXED_ASSET', 'order': 11,
        'assets': [
            {'name': 'EReleGo Technologies (School Soft) Advance',          'amount': Decimal('20000.00')},
            {'name': 'HBSVRTS Expenditures Paid by SVVK (CA)',              'amount': Decimal('347719.00')},
            {'name': 'Yasha Keerthi Fuel Station (Sathisha K N) Advance',   'amount': Decimal('500000.00')},
        ],
    },
    {
        'cat_code': 'IT_REFUND_TCS', 'cat_name': 'IT Refund Receivable (TCS)',
        'fc_code': 'TAX_RECEIVABLES', 'classification': 'FIXED_ASSET', 'order': 12,
        'assets': [
            {'name': 'Veh No. 08 - TCS @ 1% (KA.53/D-8303)', 'amount': Decimal('17642.00')},
            {'name': 'Veh No. 09 - TCS @ 1% (KA.53/D-8304)', 'amount': Decimal('17642.00')},
            {'name': 'Veh No. 10 - TCS @ 1% (KA.53/AA-1200)', 'amount': Decimal('17600.00')},
            {'name': 'Veh No. 11 - TCS @ 1% (KA.53/AA-1196)', 'amount': Decimal('17600.00')},
        ],
    },
    {
        'cat_code': 'IT_REFUND_TDS', 'cat_name': 'IT Refund Receivable (TDS)',
        'fc_code': 'TAX_RECEIVABLES', 'classification': 'FIXED_ASSET', 'order': 13,
        'assets': [
            {'name': 'FD - TDS Receivable 2023-24', 'amount': Decimal('30223.00')},
            {'name': 'FD - TDS Receivable 2024-25', 'amount': Decimal('176677.00')},
        ],
    },
    {
        'cat_code': 'SALARY_ADVANCE', 'cat_name': 'Salary Advance to Staff',
        'fc_code': 'SALARY_ADVANCES', 'classification': 'FIXED_ASSET', 'order': 14,
        'linked_module': 'STAFF_SALARY_ADVANCE',
        'assets': [],
    },
    {
        'cat_code': 'NEW_BUILDING_MATERIAL', 'cat_name': 'New Building Construction - Material Contract',
        'fc_code': 'WORK_IN_PROGRESS', 'classification': 'FIXED_ASSET', 'order': 15,
        'assets': [
            {'name': 'Cauvery Conmix ( Concrete Mix.) Ad',                 'amount': Decimal('5500.00'),   'ob_type': 'CREDIT'},
            {'name': 'Kiran Traders ( Cement & Other) Ad',                 'amount': Decimal('473902.00')},
            {'name': 'Sri Srikanteshwara Swamy Enterprises (Blg.Co)Ad',    'amount': Decimal('182312.00')},
            {'name': 'Manjunatha Y K (Other Building Exp) Ad',             'amount': Decimal('3300.00'),   'ob_type': 'CREDIT'},
            {'name': 'Gayathri Glass and Plywoods (Material) Ad',          'amount': Decimal('242.00'),    'ob_type': 'CREDIT'},
            {'name': 'Srinivasa Vengamamba Concrete Blocks - Ad',          'amount': Decimal('400000.00')},
            {'name': 'Dinesh Enterprises ( Material ) Ad',                 'amount': Decimal('200000.00')},
            {'name': 'S V Facade Systems ( Material ) Ad',                 'amount': Decimal('200000.00')},
        ],
    },
]


class Command(BaseCommand):
    help = 'Seed all assets for FY 2024-25: Banks, Fixed Assets, Recoverable Assets'

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            'Starting unified seed for FY 2024-25...\n'
        ))

        with transaction.atomic(using=get_current_db_name()):
            fy = self._get_or_create_fy()
            self._clean_existing(fy)
            self._seed_banks(fy)
            self._seed_fixed_assets(fy)
            self._seed_recoverable(fy)

        self.stdout.write(self.style.SUCCESS('\nAll seeding completed successfully.'))

    def _clean_existing(self, fy):
        from apps.finance.models.recoverable_asset import RecoverableAsset, RecoverableAssetTransaction
        from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
        from apps.finance.models.bankTransaction import BankDetail, BankTransaction
        from apps.asset.models.asset_group import AssetGroup
        from apps.asset.models.asset import Asset
        from apps.asset.models.asset_cost_movement import AssetCostMovement

        self.stdout.write(self.style.WARNING('\n── Cleaning existing data ──'))

        with transaction.atomic(using=get_current_db_name()):
            ra_cats = RecoverableAssetCategory.objects.filter(financial_year=fy)
            ra_assets = RecoverableAsset.objects.filter(category__in=ra_cats)
            txn_count = RecoverableAssetTransaction.objects.filter(recoverable_asset__in=ra_assets).delete()[0]
            ra_count = ra_assets.delete()[0]
            cat_count = ra_cats.delete()[0]
            self.stdout.write(f'  [DELETED] {txn_count} RA transactions, {ra_count} RA assets, {cat_count} RA categories')

            banks = BankDetail.objects.filter(financial_year=fy)
            bt_count = BankTransaction.objects.filter(bank__in=banks).delete()[0]
            bank_count = banks.delete()[0]
            self.stdout.write(f'  [DELETED] {bt_count} bank transactions, {bank_count} bank details')

            groups = AssetGroup.objects.filter(is_active=True, group_type='FIXED_ASSET')
            assets = Asset.objects.filter(asset_group__in=groups)
            cm_count = AssetCostMovement.objects.filter(asset__in=assets).delete()[0]
            asset_count = assets.delete()[0]
            group_count = groups.delete()[0]
            self.stdout.write(f'  [DELETED] {cm_count} cost movements, {asset_count} assets, {group_count} asset groups')



    def _get_or_create_fy(self):
        from apps.institutes.models.financialyear import FinancialYear
        fy, created = FinancialYear.objects.get_or_create(
            start_date=FY_START, end_date=FY_END,
            defaults={'is_active': True},
        )
        tag = '[CREATED]' if created else '[EXISTS]'
        self.stdout.write(f'  {tag} Financial Year {FY_START} → {FY_END} (id={fy.pk})')
        return fy

    def _seed_banks(self, fy):
        from apps.finance.models.bankTransaction import BankDetail
        self.stdout.write(self.style.MIGRATE_HEADING('\n── Banks ──'))
        for b in BANKS:
            bank, created = BankDetail.objects.update_or_create(
                account_num=b['account_num'],
                financial_year=fy,
                defaults={
                    'bank_name': b['bank_name'],
                    'opening_balance': b['opening_balance'],
                    'ifsc': b['ifsc'],
                    'is_active': True,
                },
            )
            tag = '[CREATED]' if created else '[UPDATED]'
            self.stdout.write(f'  {tag} {b["bank_name"]} A/c.{b["account_num"]} = {b["opening_balance"]:,.2f}')

    def _seed_fixed_assets(self, fy):
        from apps.asset.models.asset_group import AssetGroup
        from apps.asset.models.asset import Asset
        from apps.asset.models.asset_cost_movement import AssetCostMovement

        self.stdout.write(self.style.MIGRATE_HEADING('\n── Fixed Assets ──'))

        for grp in FIXED_ASSET_GROUPS:
            group, g_created = AssetGroup.objects.get_or_create(
                code=grp['code'],
                defaults={
                    'name': grp['name'],
                    'group_type': 'FIXED_ASSET',
                    'depreciation_method': 'MANUAL',
                    'financial_year': fy,
                    'is_active': True,
                },
            )
            tag = '[CREATED]' if g_created else '[EXISTS]'
            self.stdout.write(f'\n  {tag} Group: {grp["code"]} — {grp["name"]}')

            for a in grp['assets']:
                asset, a_created = Asset.objects.get_or_create(
                    asset_code=a['code'],
                    defaults={
                        'asset_name': a['name'],
                        'asset_group': group,
                        'purchase_date': FY_START,
                        'original_cost': a['cost'],
                        'salvage_value': Decimal('0.00'),
                        'status': 'ACTIVE',
                        'is_active': True,
                    },
                )
                tag = '[CREATED]' if a_created else '[EXISTS]'
                self.stdout.write(f'    {tag} {a["code"]} — {a["name"]} = {a["cost"]:,.2f}')

                if not AssetCostMovement.objects.filter(
                    asset=asset, financial_year=fy, movement_type='OPENING'
                ).exists():
                    AssetCostMovement.objects.create(
                        asset=asset, financial_year=fy,
                        movement_type='OPENING', amount=asset.original_cost,
                        movement_date=FY_START, opening_source='MIGRATED',
                        opening_reference='As per audited Balance Sheet 2024-25',
                        remarks='Initial seeding',
                    )
                    self.stdout.write(f'      [MOVEMENT CREATED] OPENING {asset.original_cost:,.2f}')

    def _seed_recoverable(self, fy):
        from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
        from apps.finance.models.recoverable_asset import RecoverableAsset, RecoverableAssetTransaction
        from apps.finance.models.bankTransaction import BankDetail

        self.stdout.write(self.style.MIGRATE_HEADING('\n── Recoverable Assets ──'))

        all_groups = LIABILITIES + RECOVERABLE_ASSETS

        for grp in all_groups:
            cat, c_created = RecoverableAssetCategory.objects.update_or_create(
                code=grp['cat_code'], financial_year=fy,
                defaults={
                    'name': grp['cat_name'],
                    'description': f'Seeded for FY 2024-25',
                    'asset_types': [],
                    'balance_sheet_classification': grp['classification'],
                    'is_active': True,
                    'display_order': grp.get('order', 0),

                },
            )
            tag = '[CREATED]' if c_created else '[UPDATED]'
            self.stdout.write(f'\n  {tag} Category: {grp["cat_name"]} ({grp["cat_code"]})')

            linked_module = grp.get('linked_module')
            is_bank_linked = grp.get('bank_linked', False)

            for a in grp.get('assets', []):
                default_ob_type = 'CREDIT' if grp['classification'] == 'LIABILITY' else 'DEBIT'
                ob_type = a.get('ob_type', default_ob_type)
                credit_txn_amount = a.get('credit_txn')

                closing = a['amount']
                if credit_txn_amount and ob_type == 'DEBIT':
                    closing = a['amount'] - credit_txn_amount

                defaults = {
                    'asset_type': '',
                    'opening_balance': a['amount'],
                    'opening_balance_type': ob_type,
                    'closing_balance': closing,
                    'status': 'APPROVED',
                    'is_active': True,
                    'linked_module': linked_module,
                    'purpose': f'Seeded opening balance for FY 2024-25',
                }

                if is_bank_linked and 'account_num' in a:
                    bank = BankDetail.objects.filter(
                        account_num=a['account_num'], financial_year=fy
                    ).first()
                    if bank:
                        defaults['bank'] = bank
                        defaults['bank_name'] = bank.bank_name
                        defaults['account_number'] = bank.account_num

                asset, a_created = RecoverableAsset.objects.update_or_create(
                    name=a['name'], category=cat,
                    defaults=defaults,
                )
                tag = '[CREATED]' if a_created else '[UPDATED]'
                self.stdout.write(f'    {tag} {a["name"]} = {a["amount"]:,.2f} ({ob_type})')

                if credit_txn_amount:
                    txn, t_created = RecoverableAssetTransaction.objects.update_or_create(
                        recoverable_asset=asset,
                        transaction_type='CREDIT',
                        source_type='MANUAL',
                        remarks='[SEED] Credit recovery',
                        defaults={
                            'transaction_date': FY_START,
                            'amount': credit_txn_amount,
                        },
                    )
                    tag = '[CREATED]' if t_created else '[UPDATED]'
                    self.stdout.write(
                        f'      {tag} CREDIT txn = {credit_txn_amount:,.2f}'
                    )
