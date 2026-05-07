import datetime

from django.db import models

from apps.expenditure.models.token import TokenMapping, Token
from apps.institutes.models import FinancialYear, Building
from apps.shared.models import Document


class ExpenseType(models.Model):
    expenseFor = (
        (1, 'school'),
        (2, 'hostel'),
    )
    name = models.CharField(max_length=255)
    codename = models.CharField(max_length=255, null=True, blank=True)
    expense_for = models.CharField(max_length=10, choices=expenseFor, default='1')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ExpensePlan(models.Model):
    expense_type = models.ForeignKey(ExpenseType, related_name='expense_type', null=True, blank=True,
                                     on_delete=models.SET_NULL)
    financial_year = models.ForeignKey(FinancialYear, related_name='expense_year', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    max_amount = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Expense(models.Model):
    modeofpayment = (
        ('Cash', 'Cash'),
        ('Cheque', 'Cheque'),
        ('CreditCard', 'Credit card'),
        ('DebitCard', 'Debit card'),
        ('NetBanking', 'Net Banking'),
        ('UPIPayments', 'UPI payments'),
        ('Online', 'Online'), # Online cashfree payment
        ('Debit', 'Debit'),
        ('Credit', 'Credit')
    )
    date = models.DateField(default=datetime.date.today)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    expense_plan = models.ForeignKey(ExpensePlan, related_name='expense_plan', null=True, blank=True,
                                     on_delete=models.SET_NULL)
    total_amount = models.FloatField(null=True)
    payee_name = models.CharField(max_length=255, null=True, blank=True)
    purchased_receipt_num = models.CharField(max_length=255, blank=True, null=True)
    tax_amount = models.FloatField(null=True)
    gst_number = models.CharField(max_length=255, blank=True, null=True)
    mode_of_payment = models.CharField(max_length=20, choices=modeofpayment, blank=True, null=True, default='Cash')
    ref_number = models.CharField(max_length=255, blank=True, null=True)
    cheque_clearance_date = models.DateField(blank=True, null=True)
    comment = models.CharField(max_length=255, blank=True, null=True)
    attachment = models.OneToOneField(Document, related_name='expense_attachment', blank=True, null=True,
                                      on_delete=models.SET_NULL)
    building = models.ForeignKey(Building, related_name='expense_building', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    token_for = models.ForeignKey(TokenMapping, related_name='token_for_expense', null=True, blank=True,
                                  on_delete=models.SET_NULL)
    token = models.ForeignKey(Token, related_name='token_expense', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
