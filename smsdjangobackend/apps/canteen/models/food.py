from django.db import models
from apps.shared.models.document import Document


class FoodCategory(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=100, unique=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class FoodItem(models.Model):

    FOOD_TYPE_CHOICES = (
        (0, "Veg"),
        (1, "Non-Veg"),
        (2, "Egg"),
    )
    
    name = models.CharField(max_length=200)
    category = models.ForeignKey(FoodCategory, on_delete=models.SET_NULL, null=True, related_name="food_item_category")
    code = models.CharField(max_length=50, unique=True)
    food_type = models.IntegerField(choices=FOOD_TYPE_CHOICES, default=0)
    image = models.OneToOneField(Document, related_name='food_item_image', blank=True, null=True, on_delete=models.SET_NULL)
    preparation_time = models.PositiveIntegerField(help_text="Preparation time in minutes", null=True, blank=True)
    allergy_info = models.TextField(null=True, blank=True)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    calories = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    display_order = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"