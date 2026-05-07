from django.db import models
from rest_framework import exceptions

from apps.finance.models.fee import FeeStandardMappingItemSellingPrice, StudentStoreMapping
from apps.finance.models.feeCollection import FeeCollection
from apps.shared.models.mode_of_payment import ModeOfPayment
from apps.store.models.master import Item, Stock
from apps.users.models import User

class ItemSold(models.Model):
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
    for_date = models.DateField(null=True)
    order_num = models.CharField(max_length=255, null=True, blank=True)
    total_amount_inc_gst = models.FloatField(null=True)
    tax_amount = models.FloatField(null=True)
    guest_name = models.CharField(max_length=255, null=True, blank=True)
    mode_of_payment = models.CharField(max_length=20, choices=modeofpayment, blank=True, null=True) #this temp dont use this everywhere
    fee_collection = models.ForeignKey(FeeCollection, related_name='item_sold_fee_collection',
        on_delete=models.SET_NULL, null=True, blank=True)#when paid as normal fees from finance
    is_issued_from_finance = models.BooleanField(default=False) #when we issue without paying the fees we will enable this
    payee_name = models.CharField(max_length=250, null=True, blank=True)
    payment_reference_num = models.CharField(max_length=250, null=True, blank=True)
    collected_by_user = models.ForeignKey(User, related_name='item_sold_collected_by_user', null=True, blank=True, on_delete=models.SET_NULL)
    user = models.ForeignKey(User, related_name='item_sold_user', null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    transaction_id = models.CharField(max_length=255, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ItemSoldModeOfPayment(models.Model):
    mode_of_payment = models.CharField(max_length=20, blank=True, null=True)
    payment_ref_num = models.CharField(max_length=255, blank=True, null=True)
    item_sold = models.ForeignKey(ItemSold, null=True, blank=True, related_name='item_sold_mode_of_payment_item_sold',
                                on_delete=models.SET_NULL)
    amount = models.FloatField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        mode_of_payment_list = ModeOfPayment.objects.all().values_list('name', flat=True)
        if self.mode_of_payment not in mode_of_payment_list:
            raise exceptions.ValidationError(f'Invalid mode of payment {self.mode_of_payment}')
        super().save(*args, **kwargs)

class ItemSoldDetails(models.Model):
    item_sold = models.ForeignKey(ItemSold, related_name='item_sold_details_item_sold', null=True, on_delete=models.SET_NULL)
    stock = models.ForeignKey(Stock, related_name='item_sold_details_item', null=True, on_delete=models.SET_NULL)
    available_stock_after_order = models.FloatField(default=0) #just to know what was the stock after the deduction of the item
    unit_price = models.FloatField()
    student_store_mapping = models.ForeignKey(
        StudentStoreMapping, related_name='item_sold_details_student_store_mapping',
        on_delete=models.SET_NULL, null=True, blank=True
    ) #used when sale done on fee collection
    quantity = models.FloatField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

# Screen to map list of items in one group. FOr example if standard 1 have multiple items mapped we can pick that package
class Package(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class PackageItemMapping(models.Model):
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='package_item_mapping_package')
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='package_item_mapping_stock')
    quantity = models.FloatField(default=1)  # How many items per package
    unit_price = models.FloatField(null=True, blank=True)  # Optional fixed rate per item in package

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.package.name} - {self.stock.item.name} (x{self.quantity})"
