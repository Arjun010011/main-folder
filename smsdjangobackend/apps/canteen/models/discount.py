from django.db import models
from .menu import Menu, MenuItem


class MenuDiscount(models.Model):

    DISCOUNT_TYPE_CHOICES = [
        (0, "Flat"),
        (1, "Percent"),
    ]
    SCOPE_CHOICES = [
        (0, "Menu-wide"),
        (1, "Item-specific"),
    ]

    menu = models.ForeignKey(Menu, on_delete=models.CASCADE, related_name="menu_discount_menu")
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, null=True, blank=True, related_name="menu_discount_menu_item")
    discount_type = models.IntegerField(choices=DISCOUNT_TYPE_CHOICES, default=0)
    scope = models.IntegerField(choices=SCOPE_CHOICES, default=0)
    value = models.DecimalField(max_digits=10, decimal_places=2)
    label = models.CharField(max_length=200, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.menu} | {self.get_discount_type_display()} {self.value} | {self.label}"
