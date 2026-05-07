from django.db import models

from apps.classes.models import Standard
from apps.classes.models.standard import StandardSectionMapping
from apps.institutes.models import AcademicYear, FinancialYear
from django.core.exceptions import ValidationError
from django.core.exceptions import MultipleObjectsReturned

class Counter(models.Model):
    object_id = models.PositiveIntegerField(default=0)
    type = models.CharField(max_length=255, null=True, blank=True)
    value = models.CharField(max_length=255, null=True, blank=True)
    alias_name = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    prefix = models.CharField(max_length=255, null=True, blank=True)
    postfix = models.CharField(max_length=255, null=True, blank=True)
    academic_year = models.ForeignKey(AcademicYear, related_name='counter_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    financial_year = models.ForeignKey(FinancialYear, related_name='counter_financial_year', null=True, blank=True,
                                       on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='counter_standard', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='counter_standard_section', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self._state.adding:
            try:
                counter_obj = Counter.objects.get(
                    object_id=self.object_id,
                    type=self.type,
                    academic_year=self.academic_year,
                    financial_year=self.financial_year,
                    standard=self.standard
                )
                if counter_obj:
                    raise ValidationError('Duplicate counter values found')
            except Counter.DoesNotExist:
                pass
            except MultipleObjectsReturned:
                raise ValidationError('Duplicate counter values found')
        super(Counter, self).save(*args, **kwargs)

class CounterStandardMapping(models.Model):
    counter_type_name = models.CharField(max_length=255)
    group_name = models.CharField(max_length=255) #all the standard group based on this name
    standard = models.ForeignKey(Standard, related_name='counter_standard_mapping', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    prefix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_prefix = models.CharField(max_length=255, null=True, blank=True)
    prefix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    postfix_str_for_postfix = models.CharField(max_length=255, null=True, blank=True)
    is_global = models.BooleanField(default=False) #is_global false then creates counter for all the academic year
    is_active=models.BooleanField(default=True)
    default_prefix = models.CharField(max_length=255, null=True, blank=True)
    default_postfix = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('counter_type_name', 'standard', 'is_active')

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
        super(CounterStandardMapping, self).save(*args, **kwargs)

