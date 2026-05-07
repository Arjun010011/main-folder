from django.db import models
from django.core.exceptions import ValidationError

from apps.finance.models.fee import FeeType
from apps.classes.models.standard import StandardSectionMapping
from apps.shared.models.counter import Counter

class CounterStandardSectionMapping(models.Model): #support standard section wise along with fee type
    counter_type_name = models.CharField(max_length=255)
    group_name = models.CharField(max_length=255) #all the standard group based on this name
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='counter_standard_section_mapping_standard_section',
                                            null=True, blank=True, on_delete=models.SET_NULL
                                        )
    prefix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    prefix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    is_active=models.BooleanField(default=True)
    default_prefix = models.CharField(max_length=255, null=True, blank=True)
    default_postfix = models.CharField(max_length=255, null=True, blank=True)
    fee_type = models.ForeignKey(FeeType, related_name='counter_standard_section_mapping_fee_type', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('counter_type_name', 'standard_section', 'is_active')

    def save(self, *args, **kwargs):
        counter_obj = Counter.objects.filter(
            is_active=True
        ).values('type')
        is_type_found = False
        for counter_data in counter_obj:
            if counter_data['type'] == self.counter_type_name:
                is_type_found = True
        if not is_type_found:
            raise ValidationError(f'Counter value not found. Is should be only in {counter_obj}')
        super(CounterStandardSectionMapping, self).save(*args, **kwargs)