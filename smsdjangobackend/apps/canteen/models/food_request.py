from django.db import models
from django.conf import settings
from .food import FoodItem
from .combo import FoodCombo


class FoodRequestConfig(models.Model):

    request_cutoff_time = models.TimeField(
        default='18:00:00',
        help_text='Latest time to submit a request for the next day (e.g. 18:00)',
    )
    min_advance_days = models.PositiveIntegerField(
        default=1,
        help_text='Minimum days in advance a request must be placed',
    )
    cancellation_cutoff_time = models.TimeField(
        default='20:00:00',
        help_text='Latest time to cancel a request (day before requested date)',
    )

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"FoodRequestConfig (cutoff={self.request_cutoff_time}, advance={self.min_advance_days}d)"

    class Meta:
        verbose_name = 'Food Request Configuration'
        verbose_name_plural = 'Food Request Configuration'


class FoodRequest(models.Model):

    STATUS_CHOICES = [
        (0, 'Pending'),
        (1, 'Accepted'),
        (2, 'Rejected'),
        (3, 'Cancelled'),
    ]

    MEAL_TYPE_CHOICES = [
        (0, 'Breakfast'),
        (1, 'Lunch'),
        (2, 'Snacks'),
        (3, 'Dinner'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='canteen_food_request_user',
    )
    food_item = models.ForeignKey(
        FoodItem, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='food_request_food_item',
    )
    combo = models.ForeignKey(
        FoodCombo, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='food_request_combo',
    )
    custom_item_name = models.CharField(
        max_length=300, blank=True, default='',
        help_text='Free-text item name if not from catalog',
    )
    quantity = models.PositiveIntegerField(default=1)
    allergy_info = models.TextField(blank=True, default='')
    cooking_instructions = models.TextField(blank=True, default='')
    requested_date = models.DateField()
    requested_meal_type = models.IntegerField(choices=MEAL_TYPE_CHOICES)

    status = models.IntegerField(choices=STATUS_CHOICES, default=0)
    rejection_reason = models.TextField(blank=True, default='')
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='canteen_food_request_reviewed_by',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        item = self.food_item or self.combo or self.custom_item_name or 'Unknown'
        return f"Request #{self.pk} by {self.user_id} - {item} on {self.requested_date}"

    class Meta:
        ordering = ['-created_at']
