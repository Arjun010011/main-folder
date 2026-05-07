import datetime
from rest_framework import exceptions

from django.db import models
from apps.classes.models.standard import Standard
from apps.institutes.models.academicYear import AcademicYear
from apps.institutes.models.visitor import Reason
from apps.library.models.master import BookCopy

from apps.shared.models.mode_of_payment import ModeOfPayment
from apps.users.models import User

class LibraryConfiguration(models.Model):
    return_within_days = models.IntegerField(default=7)
    number_of_books_per_user = models.IntegerField(default=2)
    fine_amount = models.FloatField(null=True, blank=True)
    fine_frequency_in_minutes = models.IntegerField(null=True, blank=True)
    max_fine_amount = models.FloatField(null=True, blank=True)
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
    If you want configuration for the different standard you can use this table
    If not mapped to the standard default configuration will be selected
"""
class StandardLibraryConfiguration(models.Model):
    library_configuration = models.ForeignKey(LibraryConfiguration, null=True, on_delete=models.SET_NULL,
        related_name='standard_library_config_library_config')
    standard = models.ForeignKey(Standard, null=True, on_delete=models.SET_NULL,
        related_name='standard_library_config_standard')
    academic_year = models.ForeignKey(AcademicYear, null=True, on_delete=models.SET_NULL,
        related_name='standard_library_config_academic_year')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class IssueReturnBook(models.Model):
    book_copy = models.ForeignKey(BookCopy, null=True, on_delete=models.SET_NULL, related_name='issue_return_book_book_copy')
    is_issued = models.BooleanField(default=False)
    issued_to_user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='issue_return_book_issued_to_user')
    current_standard = models.ForeignKey(Standard, null=True, blank=True, on_delete=models.SET_NULL, related_name='issue_return_book_current_standard')
    issued_at = models.DateTimeField(null=True, blank=True)
    returned_at = models.DateTimeField(null=True, blank=True)
    is_returned = models.BooleanField(default=False)
    issued_by_user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='issue_return_book_detail_issued_by_user')
    returned_by_user = models.ForeignKey(User, null=True, on_delete=models.SET_NULL, related_name='issue_return_book_detial_issued_by_user')
    remark_on_issue = models.CharField(max_length=255, null=True, blank=True)
    remark_on_return = models.CharField(max_length=255, null=True, blank=True)
    for_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    transaction_id = models.CharField(max_length=255, null=True, blank=True) # here transaction id is used to find whether all book issue on the same transaction
    assigned_configuration = models.ForeignKey(LibraryConfiguration, null=True, blank=True, on_delete=models.SET_NULL, related_name='issue_return_book_assigned_configuration')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FinePaymentData(models.Model):
    transaction_date = models.DateField(default=datetime.date.today)
    receipt_num = models.CharField(max_length=255, blank=True, null=True)
    mode_of_payment = models.CharField(max_length=30, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    total_amount = models.FloatField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        mode_of_payment_list = ModeOfPayment.objects.all().values_list('name', flat=True)
        if self.mode_of_payment not in mode_of_payment_list:
            raise exceptions.ValidationError(f'Invalid mode of payment {self.mode_of_payment}')
        super().save(*args, **kwargs)

class Fine(models.Model):
    fine_payment_data = models.ForeignKey(FinePaymentData, null=True, on_delete=models.SET_NULL, related_name='fine_fine_payment_data')
    amount = models.FloatField(null=True)
    issue_return_book = models.ForeignKey(IssueReturnBook, null=True, on_delete=models.SET_NULL, related_name='fine_issue_return_book')
    fine_minutes = models.IntegerField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FineExempted(models.Model):
    issue_return_book = models.ForeignKey(IssueReturnBook, null=True, on_delete=models.SET_NULL, related_name='fine_exempted_issue_return_book')
    fine_minutes = models.IntegerField(null=True)
    amount = models.FloatField(null=True)
    reason = models.ForeignKey(Reason, null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Renew(models.Model):
    issue_return_book = models.ForeignKey(IssueReturnBook, null=True, on_delete=models.SET_NULL, related_name='renew_issue_return_book')
    last_due_date = models.DateTimeField()
    updated_due_date = models.DateTimeField()
    carry_forward_fine_amount = models.FloatField(default=0)
    is_active = models.BooleanField(default=True)
    number_of_minutes_from_due_date = models.IntegerField(default=0)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)