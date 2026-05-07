from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator

from apps.users.models import User
from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
from apps.finance.models.bankTransaction import BankDetail


class RecoverableAsset(models.Model):

    ASSET_TYPE_CHOICES = [
        ('LOAN', 'Loan'),
        ('ADVANCE', 'Advance'),
        ('DEPOSIT', 'Deposit'),
        ('STAFF_SALARY_ADVANCE', 'Staff Salary Advance'),
        ('SUNDRY', 'Sundry Debtors'),
    ]

    COUNTERPARTY_TYPE_CHOICES = (
        ('INSTITUTION', 'Institution'),
        ('VENDOR', 'Vendor'),
        ('INDIVIDUAL', 'Individual'),
        ('BANK', 'Bank'),
        ('EMPLOYEE', 'Employee'),
    )

    ACCOUNT_LABEL_CHOICES = (
        ('OLD', 'Old'),
        ('NEW', 'New'),
        ('OTHER', 'Other'),
    )

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('CLOSED', 'Closed'),
        ('CANCELLED', 'Cancelled'),
    )

    BALANCE_TYPE_CHOICES = (
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    )

    LINKED_MODULE_CHOICES = (
        ('SUNDRY_DEBTORS', 'Pending Fees'),
        ('STAFF_SALARY_ADVANCE', 'Staff Salary Advance'),
        ('CASH_IN_HAND', 'Cash in Hand'),
        ('BANK_ACCOUNT', 'Bank Account'),
        ('ADVANCE_FEE', 'Advance Fee'),
    )

    name = models.CharField(max_length=255)
    asset_type = models.CharField(max_length=25, choices=ASSET_TYPE_CHOICES, blank=True, default='')
    category = models.ForeignKey(
        RecoverableAssetCategory,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='recoverable_asset_category',
        help_text='Category for grouping and reporting'
    )

    linked_module = models.CharField(
        max_length=30, choices=LINKED_MODULE_CHOICES,
        blank=True, null=True,
        help_text="Link this asset to a specific module for tracking."
    )
    salary_advance = models.ForeignKey(
        'payroll.SalaryAdvance',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recoverable_asset_salary_advance',
        help_text='Linked salary advance from payroll module'
    )
    pending_fees_config = models.JSONField(
        null=True, blank=True,
        help_text='Fee mapping config for SUNDRY_DEBTORS'
    )
    advance_fee_config = models.JSONField(
        null=True, blank=True,
        help_text='Advance fee config for ADVANCE_FEE'
    )

    counterparty_name = models.CharField(max_length=255, blank=True, null=True)
    counterparty_type = models.CharField(max_length=20, choices=COUNTERPARTY_TYPE_CHOICES, blank=True, null=True)

    bank = models.ForeignKey(
        BankDetail,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recoverable_asset_bank',
        help_text="Linked bank account"
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=30, blank=True, null=True)
    account_label = models.CharField(max_length=10, choices=ACCOUNT_LABEL_CHOICES, default='OTHER')

    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    opening_balance_type = models.CharField(
        max_length=10, choices=BALANCE_TYPE_CHOICES, default='DEBIT',
        help_text="Whether the opening balance is a debit or credit entry"
    )
    closing_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='APPROVED')

    remarks = models.TextField(blank=True, null=True)

    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='recoverable_asset_created_by'
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='recoverable_asset_updated_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Recoverable Asset'
        verbose_name_plural = 'Recoverable Assets'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_asset_type_display() or self.get_linked_module_display() or ''})"

    def get_particulars(self):
        if self.linked_module == 'STAFF_SALARY_ADVANCE' and self.salary_advance:
            return self.salary_advance.get_particulars()

        if self.asset_type in ['LOAN', 'ADVANCE', 'DEPOSIT']:
            type_label = self.get_asset_type_display() if self.asset_type else ''
            if self.counterparty_name:
                base_name = self.counterparty_name.strip()
                if self.name and self.name.strip() != self.counterparty_name.strip():
                    base_name = f"{self.counterparty_name.strip()}, {self.name.strip()}"
            else:
                base_name = self.name.strip() if self.name else ''
            return f"{base_name} ({type_label})" if type_label else base_name

        return self.name or ''

    def recalculate_closing_balance(self):
        from apps.finance.serializers import recalculate_asset_closing_balance
        recalculate_asset_closing_balance(self)


class RecoverableAssetTransaction(models.Model):

    TRANSACTION_TYPE_CHOICES = (
        ('CREDIT', 'Credit'),
        ('DEBIT', 'Debit'),
        ('ADVANCE', 'Advance'),
        ('RECOVERY', 'Recovery'),
        ('ADJUSTMENT', 'Adjustment'),
        ('INTEREST', 'Interest Charge'),
        ('PENALTY', 'Late Payment Penalty'),
        ('REVERSAL', 'Reversal'),
    )

    SOURCE_TYPE_CHOICES = (
        ('MANUAL', 'Manual'),
        ('PAYROLL', 'Payroll'),
        ('ADJUSTMENT', 'Adjustment'),
        ('INTEREST_CALC', 'Interest Calculation'),
        ('PENALTY_CALC', 'Penalty Calculation'),
        ('BANK_TRANSFER', 'Bank/Cash Transfer'),
    )

    ADJUSTMENT_REASON_CHOICES = (
        ('', 'Not Applicable'),
        ('WRITE_OFF', 'Write-off'),
        ('SETTLEMENT', 'Settlement'),
        ('CORRECTION', 'Correction'),
        ('WAIVER', 'Interest/Penalty Waiver'),
    )

    recoverable_asset = models.ForeignKey(
        RecoverableAsset,
        on_delete=models.CASCADE,
        related_name='recoverable_asset_transaction_recoverable_asset'
    )
    transaction_date = models.DateField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )

    source_type = models.CharField(
        max_length=20, choices=SOURCE_TYPE_CHOICES, default='MANUAL'
    )
    source_reference = models.CharField(max_length=100, null=True, blank=True)
    adjustment_reason = models.CharField(
        max_length=20, choices=ADJUSTMENT_REASON_CHOICES, default='', blank=True
    )

    remarks = models.TextField(blank=True, null=True)
    metadata = models.JSONField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='recoverable_asset_transaction_created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Recoverable Asset Transaction'
        verbose_name_plural = 'Recoverable Asset Transactions'
        ordering = ['transaction_date', 'created_at']

    def __str__(self):
        return f"{self.recoverable_asset.name} - {self.transaction_type} - {self.amount}"

    def is_debit_type(self):
        return self.transaction_type in ('DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY')

    def is_credit_type(self):
        return self.transaction_type in ('CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL')


class RecoverableAssetHistory(models.Model):

    ACTION_CHOICES = (
        ('CREATE', 'Create'),
        ('UPDATE', 'Update'),
        ('DELETE', 'Delete'),
    )

    recoverable_asset = models.ForeignKey(
        RecoverableAsset,
        on_delete=models.CASCADE,
        related_name='recoverable_asset_history_recoverable_asset'
    )
    recoverable_asset_transaction = models.ForeignKey(
        RecoverableAssetTransaction,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='recoverable_asset_history_recoverable_asset_transaction'
    )

    action = models.CharField(max_length=10, choices=ACTION_CHOICES)
    previous_data = models.JSONField(blank=True, null=True)
    new_data = models.JSONField(blank=True, null=True)

    performed_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True
    )
    performed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Recoverable Asset History'
        verbose_name_plural = 'Recoverable Asset Histories'
        ordering = ['-performed_at']

    def __str__(self):
        return f"{self.recoverable_asset.name} - {self.action} - {self.performed_at}"
