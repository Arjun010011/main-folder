from django.db import models

from apps.shared.models.document import Document
from apps.library.models.master import Book, BookCopy

class LibraryVendor(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    address = models.CharField(max_length=255, null=True, blank=True)
    mobile_num = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class LibraryPurchaseMaster(models.Model):
    vendor = models.ForeignKey(LibraryVendor, null=True, blank=True, on_delete=models.SET_NULL, related_name='library_purchase_master_vendor')
    voucher_num = models.CharField(max_length=255, null=True, blank=True)
    invoice_num = models.CharField(max_length=255, null=True, blank=True)
    invoice_date = models.DateField(null=True)
    stock_date = models.DateField(null=True)
    comment = models.CharField(max_length=255, blank=True, null=True)
    attachment = models.OneToOneField(Document, related_name='library_purchase_master_attachment', blank=True, null=True,
                                      on_delete=models.SET_NULL)
    amount = models.FloatField(null=True)
    tax = models.FloatField(null=True)
    discount = models.FloatField(null=True)
    total_amount = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class LibraryPurchaseMasterStock(models.Model):
    transactionType = (
        ('received', 'received'),
        ('returned', 'returned'),
        ('cancelled', 'cancelled'),
    )
    transaction_type = models.CharField(max_length=20, choices=transactionType)
    quantity = models.FloatField(default=0)
    description = models.CharField(max_length=255, blank=True, null=True)
    unit_price = models.FloatField(null=True)
    tax = models.FloatField(null=True)
    amount = models.FloatField(null=True)
    book_copy = models.ForeignKey(BookCopy, null=True, blank=True, on_delete=models.SET_NULL,
                              related_name='library_purchase_master_stock_book_copy')
    purchase_master = models.ForeignKey(LibraryPurchaseMaster, null=True, blank=True, on_delete=models.SET_NULL,
                                        related_name='library_purchase_master_stock_purchase_master')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
