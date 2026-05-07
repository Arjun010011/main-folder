from django.db import models

class PaymentGateWays(models.Model):
    name = models.CharField(max_length=50, default='')
    code = models.CharField(max_length=50, default='')
    is_active = models.BooleanField(default=True)
    merc_id = models.CharField(max_length=50, default='')
    api_key = models.CharField(max_length=255, null=True, blank=True)
    aggregator_id = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name