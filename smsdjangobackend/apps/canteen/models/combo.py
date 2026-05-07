from django.db import models
from .food import FoodItem


class FoodCombo(models.Model):

    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, unique=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"


class FoodComboItem(models.Model):
    combo = models.ForeignKey(FoodCombo, on_delete=models.CASCADE, related_name="food_combo_item_combo")
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name="food_combo_item_food_item")
    quantity = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.combo.name} -> {self.food_item.name} x{self.quantity}"


class ComboOptionGroup(models.Model):
    combo = models.ForeignKey(FoodCombo, on_delete=models.CASCADE, related_name="combo_option_group_combo")
    name = models.CharField(max_length=200)       
    min_select = models.PositiveIntegerField(default=1)
    max_select = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.combo.name} | {self.name}"


class ComboOptionItem(models.Model):
    option_group = models.ForeignKey(ComboOptionGroup, on_delete=models.CASCADE, related_name="combo_option_item_option_group")
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, related_name="combo_option_item_food_item")
    extra_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.option_group.name} -> {self.food_item.name}"