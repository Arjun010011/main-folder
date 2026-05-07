import datetime

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models

from apps.institutes.models import FinancialYear
from apps.staffs.models import Staff


class TokenMapping(models.Model):
    content_type = models.ForeignKey(ContentType, blank=True, null=True, on_delete=models.SET_NULL)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')


class Token(models.Model):
    for_date = models.DateField(default=datetime.date.today)
    token_num = models.CharField(max_length=255, null=True, blank=True)
    liter = models.FloatField(null=True)
    financial_year = models.ForeignKey(FinancialYear, related_name='token_year', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    staff = models.ForeignKey(Staff, related_name='token_staff', null=True, blank=True,
                              on_delete=models.SET_NULL)
    token_for = models.ForeignKey(TokenMapping, related_name='token_token_mapping', null=True, blank=True,
                                  on_delete=models.SET_NULL)
    comment = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
