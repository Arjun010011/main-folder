from django.db import models
from .food import FoodItem
from .combo import FoodCombo


class Menu(models.Model):

    MEAL_TYPE_CHOICES = [
        (0, "Breakfast"),
        (1, "Lunch"),
        (2, "Snacks"),
        (3, "Dinner"),
    ]

    name = models.CharField(max_length=200, default='Menu')
    meal_type = models.IntegerField(choices=MEAL_TYPE_CHOICES)
    description = models.TextField(blank=True, default='')
    is_todays_special = models.BooleanField(default=False)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.get_meal_type_display()}"


class MenuItem(models.Model):
    
    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="menu_item_menu")
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, null=True, blank=True, related_name="menu_item_food_item")
    combo = models.ForeignKey(FoodCombo, on_delete=models.CASCADE, null=True, blank=True, related_name="menu_item_combo")
    price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    quantity_available = models.PositiveIntegerField(null=True, blank=True)
    quantity_sold = models.PositiveIntegerField(default=0)
    is_available_today = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        item = self.food_item or self.combo
        return f"{self.menu} -> {item}"