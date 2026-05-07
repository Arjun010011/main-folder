from email.policy import default
from django.db import models
from rest_framework import exceptions

from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.finance.models.fee import FeePlan, FeeStandardMapping

class FeeCategory(models.Model): #fee category is used as accountable / unaccountable amount collections
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s '%(self.name)

class FeeCategoryFeeStandardSectionMapping(models.Model):
    fee_category = models.ForeignKey(FeeCategory, related_name='fee_category_fee_standard_section_mapping_fee_category',
                                      null=True, blank=True, on_delete=models.SET_NULL)
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='fee_category_fee_standard_section_mapping_standard_section',
                                         null=True, blank=True, on_delete=models.SET_NULL)
    fee_plan = models.ForeignKey(FeePlan, related_name='fee_category_fee_standard_section_mapping_fee_plan',
                                         null=True, blank=True, on_delete=models.SET_NULL) #fee_plan or fee_standard_mapping any one of this should be active
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


