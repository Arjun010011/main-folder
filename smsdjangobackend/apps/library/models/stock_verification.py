from django.db import models

from apps.institutes.models.academicYear import AcademicYear
from apps.library.models.master import BookCopy
from apps.users.models.user import User

class StockVerificationParent(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_verification_parent_user')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StockVerification(models.Model):
    stock_verification_parent = models.ForeignKey(StockVerificationParent, on_delete=models.SET_NULL, null=True, blank=True)
    book_copy = models.ForeignKey(BookCopy, on_delete=models.SET_NULL, null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='stock_verification_user')
    verified_date = models.DateField(null=True, blank=True)
    remarks = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)