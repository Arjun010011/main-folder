import datetime
from django.conf import settings
from django.db import models

from apps.institutes.models import FinancialYear
from apps.staffs.models import Staff, AccountDetail
from apps.users.models import User


CALCULATION_TYPE_CHOICES = [
    ('FIXED', 'Fixed Amount'),
    ('PERCENT', 'Percentage of Component'),
    ('REMAINING', 'Remaining Amount'),
    ('EXPRESSION', 'Custom Expression'),
]

INCREMENT_TYPE_CHOICES = [
    ('INCREMENT', 'Salary Increment'),
    ('BONUS', 'One-time Bonus'),
]

CALCULATION_MODE_CHOICES = [
    ('AMOUNT', 'Fixed Amount'),
    ('PERCENTAGE', 'Percentage'),
]

class SalaryComponent(models.Model):    
    name = models.CharField(max_length=255)
    codename = models.CharField(max_length=255, null=True, blank=True)
    is_deduction = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['codename']),
        ]

    def __str__(self):
        return self.name

class SalaryFormula(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    version = models.PositiveIntegerField(default=1)

    financial_year = models.ForeignKey(
        FinancialYear,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='salary_formula_financial_year'
    )

    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('name', 'version')
        ordering = ['name', '-version']

    def __str__(self):
        return f"{self.name} v{self.version}"

    def next_version(self):
        latest = SalaryFormula.objects.filter(
            name=self.name
        ).order_by('-version').values_list('version', flat=True).first()
        return (latest or 0) + 1


class SalaryFormulaRule(models.Model):

    formula = models.ForeignKey(
        SalaryFormula,
        related_name='salary_formula_rule_formula',
        on_delete=models.CASCADE
    )

    salary_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_formula_rule_salary_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    sequence = models.PositiveIntegerField(default=1)

    calculation_type = models.CharField(
        max_length=20,
        choices=CALCULATION_TYPE_CHOICES,
        default='FIXED'
    )

    value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0
    )

    base_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_formula_rule_base_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    expression = models.TextField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    is_optional = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        User,
        related_name='salary_formula_rule_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    modified_by = models.ForeignKey(
        User,
        related_name='salary_formula_rule_modified_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ['formula', 'sequence']

    def __str__(self):
        component = self.salary_component.name if self.salary_component else "Unknown"
        return f"{self.formula.name} - {component} (seq {self.sequence})"

class SalaryPlan(models.Model):

    financial_year = models.ForeignKey(
        FinancialYear,
        related_name='salary_plan_financial_year',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    salary_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_plan_salary_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    formula = models.ForeignKey(
        SalaryFormula,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='salary_plan_formula'
    )

    use_formula = models.BooleanField(default=False)

    is_amount = models.BooleanField(default=True)
    rate = models.FloatField(null=True)

    percentage_of = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SalaryEmployeePlan(models.Model):

    staff = models.ForeignKey(
        Staff,
        related_name='salary_employee_plan_staff',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    salary_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_employee_plan_salary_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    formula = models.ForeignKey(
        SalaryFormula,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='salary_employee_plan_formula'
    )

    use_formula = models.BooleanField(default=False)

    amount = models.FloatField(null=True)

    is_approved = models.BooleanField(default=False)
    salary_plan_approved_date = models.DateField(null=True)

    approved_user = models.ForeignKey(
        User,
        null=True,
        blank=True,
        related_name='salary_employee_plan_approved_user',
        on_delete=models.SET_NULL
    )

    is_fixed_deduction = models.BooleanField(default=False)

    from_date = models.DateField(default=datetime.date.today)
    to_date = models.DateField(default='9999-12-31')

class SalaryEmployeeMonthPlan(models.Model):

    staff = models.ForeignKey(
        Staff,
        related_name='salary_employee_month_plan_staff',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    account = models.ForeignKey(
        AccountDetail,
        related_name='salary_employee_month_plan_account',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    salary_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_employee_month_plan_salary_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True)
    lop = models.FloatField(null=True)

    salary_month = models.DateField(null=True)

    is_locked = models.BooleanField(default=False)

    lop_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True
    )

    formula = models.ForeignKey(
        SalaryFormula,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='salary_employee_month_plan_formula'
    )

    formula_snapshot = models.JSONField(null=True, blank=True)

    formula_version = models.CharField(
        max_length=64,
        null=True,
        blank=True
    )

    salary_date = models.DateField(default=datetime.date.today)

    is_active = models.BooleanField(default=True)

    created_by = models.ForeignKey(
        User,
        related_name='salary_employee_month_plan_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    modified_by = models.ForeignKey(
        User,
        related_name='salary_employee_month_plan_modified_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['salary_month']),
            models.Index(fields=['staff', 'salary_month']),
        ]

class SalaryEmployeeOverride(models.Model):

    month_plan = models.ForeignKey(
        SalaryEmployeeMonthPlan,
        related_name='salary_employee_override_month_plan',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    staff = models.ForeignKey(
        Staff,
        related_name='salary_employee_override_staff',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    staff_name = models.CharField(max_length=255, blank=True, default='')
    salary_year = models.PositiveIntegerField(null=True, blank=True)
    salary_month = models.PositiveIntegerField(null=True, blank=True)

    salary_component = models.ForeignKey(
        SalaryComponent,
        related_name='salary_employee_override_salary_component',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    reason = models.TextField()

    approved_by = models.ForeignKey(
        User,
        related_name='salary_employee_override_approved_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    is_active = models.BooleanField(default=True)
    is_permanent = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        User,
        related_name='salary_employee_override_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    modified_by = models.ForeignKey(
        User,
        related_name='salary_employee_override_modified_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ['-salary_year', '-salary_month', 'staff_name']
        unique_together = ('staff', 'salary_year', 'salary_month', 'salary_component')

class SalaryEmployeeIncrement(models.Model):

    employee_plan = models.ForeignKey(
        SalaryEmployeePlan,
        related_name='salary_employee_increment_employee_plan',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    staff = models.ForeignKey(
        Staff,
        related_name='salary_employee_increment_staff',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    staff_name = models.CharField(max_length=255)

    increment_type = models.CharField(
        max_length=20,
        choices=INCREMENT_TYPE_CHOICES,
        default='INCREMENT'
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)

    calculation_mode = models.CharField(
        max_length=20,
        choices=CALCULATION_MODE_CHOICES,
        default='AMOUNT'
    )

    percentage = models.DecimalField(
        max_digits=6, decimal_places=2,
        null=True, blank=True,
        help_text='Percentage value when calculation_mode is PERCENTAGE'
    )

    old_gross = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text='Staff gross salary before this increment'
    )

    new_gross = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True,
        help_text='Staff gross salary after this increment'
    )

    bonus_name = models.CharField(
        max_length=255, null=True, blank=True,
        help_text='Name/title of the bonus (for BONUS type)'
    )

    effective_date = models.DateField(default=datetime.date.today)

    applied = models.BooleanField(default=False)

    reason = models.TextField(null=True, blank=True)

    approved_by = models.ForeignKey(
        User,
        related_name='salary_employee_increment_approved_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    new_employee_plan = models.ForeignKey(
        SalaryEmployeePlan,
        related_name='salary_employee_increment_new_employee_plan',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        User,
        related_name='salary_employee_increment_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    modified_by = models.ForeignKey(
        User,
        related_name='salary_employee_increment_modified_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )

    class Meta:
        ordering = ['-effective_date', 'staff_name']

class PayrollFormulaAuditLog(models.Model):

    ACTION_CHOICES = [
        ('GENERATE', 'Generate Single'),
        ('GENERATE_BULK', 'Generate Bulk'),
        ('LOCK', 'Lock Month'),
        ('OVERRIDE', 'Override'),
        ('INCREMENT', 'Increment'),
        ('BONUS', 'Bonus'),
        ('SEED_PRESET', 'Seed Preset'),
    ]

    action = models.CharField(max_length=50, choices=ACTION_CHOICES)

    formula = models.ForeignKey(
        SalaryFormula,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='payroll_formula_audit_log_formula'
    )

    staff = models.ForeignKey(
        Staff,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='payroll_formula_audit_log_staff'
    )

    salary_month = models.DateField(null=True, blank=True)

    performed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='payroll_formula_audit_log_performed_by'
    )

    details = models.JSONField(default=dict, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action} | {self.staff} | {self.salary_month}"


class StaffManualAttendance(models.Model):
    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name='staff_manual_attendance_staff'
    )
    salary_month = models.DateField(help_text='First day of the month (e.g. 2026-03-01)')
    working_days = models.PositiveIntegerField(help_text='Total working days in the month')
    present_days = models.FloatField(help_text='Days present (can be fractional for half-days)')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['staff', '-salary_month']
        unique_together = ('staff', 'salary_month')
        indexes = [
            models.Index(fields=['salary_month']),
        ]

    def __str__(self):
        return f"{self.staff} - {self.salary_month}"