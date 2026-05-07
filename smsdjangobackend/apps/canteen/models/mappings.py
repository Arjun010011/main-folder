from django.conf import settings
from django.db import models

from apps.finance.models.fee import FeeplanStudentFeature
from apps.payroll.models.payroll import SalaryComponent
from apps.staffs.models.staff import Staff

from .meal_package import MealPackage


class StudentFeeMealPackageMapping(models.Model):

    custom_fee = models.ForeignKey(
        FeeplanStudentFeature,
        on_delete=models.CASCADE,
        related_name="student_fee_mealpackage_mapping_custom_fee",
    )
    meal_package = models.ForeignKey(
        MealPackage,
        on_delete=models.CASCADE,
        related_name="student_fee_mealpackage_mapping_meal_package",
    )

    from_date = models.DateField()
    to_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_fee_mealpackage_mapping_created_by",
    )


class StaffMealPackagePayrollMapping(models.Model):

    staff = models.ForeignKey(
        Staff,
        on_delete=models.CASCADE,
        related_name="staff_mealpackage_payroll_mapping_staff",
    )
    meal_package = models.ForeignKey(
        MealPackage,
        on_delete=models.CASCADE,
        related_name="staff_mealpackage_payroll_mapping_meal_package",
    )
    salary_component = models.ForeignKey(
        SalaryComponent,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_mealpackage_payroll_mapping_salary_component",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    from_date = models.DateField()
    to_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="staff_mealpackage_payroll_mapping_created_by",
    )

