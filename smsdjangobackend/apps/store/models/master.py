from django.db import models

from apps.users.models.user import User


class Category(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)


class SubCategory(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=255, null=True, blank=True)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name='sub_category')
    is_active = models.BooleanField(default=True)


class Properties(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)


class PropertyValue(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    properties = models.ForeignKey(Properties, null=True, blank=True, on_delete=models.SET_NULL,
                                   related_name='properties')
    is_active = models.BooleanField(default=True)


class Item(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)


class Stock(models.Model):
    opening_stock = models.FloatField(default=0)
    available_stock = models.FloatField(default=0)
    min_stock = models.FloatField(default=0)
    item = models.ForeignKey(Item, null=True, blank=True, on_delete=models.SET_NULL, related_name='stock_item')
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name='stock_category')
    sub_category = models.ForeignKey(SubCategory, null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name='stock_sub_category')
    property_value = models.ManyToManyField(PropertyValue, blank=True, related_name='stock_property_value')
    current_selling_price = models.FloatField(default=0)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StockSellingPriceTrack(models.Model):
    stock = models.ForeignKey(Stock, null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name='stock_selling_price_track_stock')
    selling_price = models.FloatField()
    created = models.DateTimeField(auto_now_add=True) #created date is used to store till what date the edit has happend
    modified = models.DateTimeField(auto_now=True)

class StockAvailableBalanceTrack(models.Model):
    stock = models.ForeignKey(Stock, null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name='stock_available_balance_track_stock')
    reason = models.CharField(max_length=255)
    current_available_stock = models.FloatField(default=0)
    updating_stock = models.FloatField(default=0) # eg: if current stock is 10 and we are update to 15 then the updating_stock value will be 5
    is_stock_increment = models.BooleanField(default=True) #if we are increasing the stock manually - False means it is decrementing
    updated_by_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL,
                                 related_name='stock_available_balance_track_updated_by_user')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)