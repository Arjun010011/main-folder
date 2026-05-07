from decimal import Decimal

from django.db import models
from django.core.validators import MinValueValidator

from apps.staffs.models import Staff
from apps.users.models import User
from apps.institutes.models import FinancialYear


class SalaryAdvance(models.Model):

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('APPROVED', 'Approved'),
        ('CLOSED', 'Closed'),
        ('CANCELLED', 'Cancelled'),
    )

    INTEREST_TYPE_CHOICES = (
        ('NONE', 'No Interest'),
        ('SIMPLE', 'Simple Interest'),
        ('COMPOUND', 'Compound Interest'),
    )

    CLOSURE_REASON_CHOICES = (
        ('', 'Not Applicable'),
        ('NORMAL_RECOVERY', 'Fully Recovered'),
        ('WRITE_OFF', 'Written Off'),
        ('SETTLEMENT', 'Settled'),
    )

    BALANCE_TYPE_CHOICES = (
        ('DEBIT', 'Debit'),
        ('CREDIT', 'Credit'),
    )

    name = models.CharField(max_length=255)
    staff = models.ForeignKey(
        Staff,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='salary_advance_staff'
    )
    financial_year = models.ForeignKey(
        FinancialYear,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name='salary_advance_financial_year'
    )

    total_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Total advance/loan amount"
    )
    opening_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    opening_balance_type = models.CharField(
        max_length=10, choices=BALANCE_TYPE_CHOICES, default='DEBIT',
        help_text="Whether the opening balance is a debit or credit entry"
    )
    closing_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    monthly_recovery_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text="Monthly recovery amount"
    )
    start_month = models.DateField(
        null=True, blank=True,
        help_text="Recovery starts from this month"
    )
    tenure_months = models.PositiveIntegerField(
        null=True, blank=True,
        help_text="Tenure in months"
    )
    emi_amount = models.DecimalField(
        max_digits=15, decimal_places=2,
        null=True, blank=True,
        help_text="EMI amount for loan type"
    )
    expected_end_date = models.DateField(null=True, blank=True)

    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=2,
        default=Decimal('0.00'),
        help_text="Annual interest rate percentage"
    )
    interest_type = models.CharField(
        max_length=10, choices=INTEREST_TYPE_CHOICES, default='NONE'
    )

    auto_deduct_from_payroll = models.BooleanField(default=False)
    deduction_priority = models.PositiveIntegerField(default=1)

    penalty_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='APPROVED')
    closure_reason = models.CharField(
        max_length=20, choices=CLOSURE_REASON_CHOICES, default='', blank=True
    )

    purpose = models.TextField(blank=True, null=True)
    remarks = models.TextField(blank=True, null=True)

    approved_on = models.DateField(null=True, blank=True)
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='salary_advance_approved_by'
    )

    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='salary_advance_created_by'
    )
    updated_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True,
        related_name='salary_advance_updated_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Salary Advance'
        verbose_name_plural = 'Salary Advances'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.get_status_display()})"

    def get_particulars(self):
        if self.staff:
            staff_name = f"{self.staff.first_name or ''} {self.staff.middle_name or ''} {self.staff.last_name or ''}".strip()
            return f"{staff_name} (Staff Salary Advance)"
        return f"{self.name.strip()} (Staff Salary Advance)" if self.name else 'Staff Salary Advance'

    def recalculate_closing_balance(self):
        from django.db.models import Sum, Case, When, DecimalField as DField

        txn_agg = self.salary_advance_transaction_salary_advance.filter(
            is_active=True
        ).aggregate(
            total_debit=Sum(
                Case(
                    When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DField()
                )
            ),
            total_credit=Sum(
                Case(
                    When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
                    default=Decimal('0.00'),
                    output_field=DField()
                )
            )
        )

        total_debit = txn_agg['total_debit'] or Decimal('0.00')
        total_credit = txn_agg['total_credit'] or Decimal('0.00')

        ob_type = self.opening_balance_type or 'DEBIT'
        if ob_type == 'CREDIT':
            new_closing = self.opening_balance + total_credit - total_debit
        else:
            new_closing = self.opening_balance + total_debit - total_credit

        if self.closing_balance != new_closing:
            self.closing_balance = new_closing
            self.save(update_fields=['closing_balance', 'updated_at'])

        from apps.finance.models.recoverable_asset import RecoverableAsset
        RecoverableAsset.objects.filter(
            salary_advance=self, is_active=True
        ).update(closing_balance=new_closing)


class SalaryAdvanceTransaction(models.Model):

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
    )

    ADJUSTMENT_REASON_CHOICES = (
        ('', 'Not Applicable'),
        ('WRITE_OFF', 'Write-off'),
        ('SETTLEMENT', 'Settlement'),
        ('CORRECTION', 'Correction'),
        ('WAIVER', 'Interest/Penalty Waiver'),
    )

    salary_advance = models.ForeignKey(
        SalaryAdvance,
        on_delete=models.CASCADE,
        related_name='salary_advance_transaction_salary_advance'
    )
    transaction_date = models.DateField()
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPE_CHOICES)
    amount = models.DecimalField(
        max_digits=15, decimal_places=2,
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
        related_name='salary_advance_transaction_created_by'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Salary Advance Transaction'
        verbose_name_plural = 'Salary Advance Transactions'
        ordering = ['transaction_date', 'created_at']

    def __str__(self):
        return f"{self.salary_advance.name} - {self.transaction_type} - {self.amount}"

    def is_debit_type(self):
        return self.transaction_type in ('DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY')

    def is_credit_type(self):
        return self.transaction_type in ('CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL')
