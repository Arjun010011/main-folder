from django.db import models
from django.conf import settings
from .food import FoodItem
from .combo import FoodCombo


class MealPackage(models.Model):
    
    MEAL_TYPE_CHOICES = [
        (0, "Breakfast"),
        (1, "Lunch"),
        (2, "Snacks"),
        (3, "Dinner"),
        (4, "All Meals"),
    ]

    AVAILABLE_FOR_CHOICES = [
        (0, "Staff"),
        (1, "Student"),
        (2, "Both"),
    ]

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    meal_type = models.IntegerField(choices=MEAL_TYPE_CHOICES)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    duration_days = models.PositiveIntegerField(default=30, help_text="Package validity in days")
    available_for = models.IntegerField(choices=AVAILABLE_FOR_CHOICES, default=2)
    is_pause_allowed = models.BooleanField(default=True, help_text="Whether subscriptions can be paused")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.meal_type})"


class MealPackageItem(models.Model):

    package = models.ForeignKey(MealPackage, on_delete=models.CASCADE, related_name="meal_package_item_package")
    food_item = models.ForeignKey(FoodItem, on_delete=models.CASCADE, null=True, blank=True, related_name="meal_package_item_food_item")
    combo = models.ForeignKey(FoodCombo, on_delete=models.CASCADE, null=True, blank=True, related_name="meal_package_item_combo")
    days_of_week = models.CharField(max_length=20, help_text="Comma-separated weekday numbers: 0=Mon … 6=Sun")
    quantity = models.PositiveIntegerField(default=1)

    def __str__(self):
        item = self.food_item or self.combo
        return f"{self.package.name} -> {item}"


class MealPackageSubscription(models.Model):
    
    STATUS_CHOICES = [
        (0, "Active"),
        (1, "Paused"),
        (2, "Expired"),
        (3, "Cancelled"),
    ]

    package = models.ForeignKey(MealPackage, on_delete=models.CASCADE, related_name="meal_package_subscription_package")
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="canteen_meal_package_subscription_user",
    )
    status = models.IntegerField(choices=STATUS_CHOICES, default=0)
    start_date = models.DateField()
    end_date = models.DateField()
    paused_at = models.DateField(null=True, blank=True, help_text="Date when subscription was paused")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"User {self.user_id if self.user_id else '-'} -> {self.package.name}"


class MealPackageUsage(models.Model):

    subscription = models.ForeignKey(
        MealPackageSubscription,
        on_delete=models.CASCADE,
        related_name="meal_package_usage_subscription",
    )
    order = models.ForeignKey(
        "canteen.Order",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="meal_package_usage_order",
    )
    usage_date = models.DateField()
    quantity = models.PositiveIntegerField(default=1)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.subscription_id} | {self.usage_date} | x{self.quantity}"