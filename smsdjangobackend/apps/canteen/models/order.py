from django.db import models
from django.conf import settings

from apps.canteen.models.menu import MenuItem
from apps.canteen.models.food import FoodItem
from apps.canteen.models.combo import FoodCombo, ComboOptionItem
from apps.canteen.models.meal_package import MealPackageSubscription


class Order(models.Model):


    ORDER_TYPE_CHOICES = [
        (0, "Walk-in"),
        (1, "Package Redemption"),
        (2, "Pre-order"),
    ]

    STATUS_CHOICES = [
        (0, "Pending"),
        (1, "Confirmed"),
        (2, "Preparing"),
        (3, "Ready for Pickup"),
        (4, "Delivered"),
        (5, "Cancelled"),
    ]

    PAYMENT_MODE_CHOICES = [
        (0, "Wallet"),
        (1, "Cash"),
        (2, "UPI"),
        (3, "Cheque"),
        (4, "Card"),
        (5, "Online"),
        (6, "Package"),
    ]

    order_number = models.CharField(max_length=50)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="order_user",
    )
    order_type = models.IntegerField(choices=ORDER_TYPE_CHOICES, default=0)
    status = models.IntegerField(choices=STATUS_CHOICES, default=0)
    payment_mode = models.IntegerField(choices=PAYMENT_MODE_CHOICES)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2)
    meal_package_subscription = models.ForeignKey(
        MealPackageSubscription, on_delete=models.SET_NULL,
        null=True, blank=True, related_name="order_meal_package_subscription"
    )
    notes = models.TextField(blank=True)
    pickup_time = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order {self.order_number} | User {self.user_id if self.user_id else '-'}"


class OrderItem(models.Model):

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="order_item_order")
    food_item = models.ForeignKey(FoodItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_item_food_item")
    combo = models.ForeignKey(FoodCombo, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_item_combo")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.SET_NULL, null=True, blank=True, related_name="order_item_menu_item",)

    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        item = self.food_item or self.combo
        return f"Order {self.order.order_number} -> {item} x{self.quantity}"


class OrderItemComboOption(models.Model):
    
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name="order_item_combo_option_order_item")
    combo_option_item = models.ForeignKey(ComboOptionItem, on_delete=models.CASCADE, related_name="order_item_combo_option_combo_option_item")

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order_item} -> {self.combo_option_item.food_item.name}"