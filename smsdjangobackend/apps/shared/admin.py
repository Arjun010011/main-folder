from django.contrib import admin
from apps.classes.models.standard import Standard
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.finance.models.fee import FeeType
from apps.finance.models.feeCollection import FeeCollection
from apps.finance.models.miscellaneous import MiscellaneousType
from apps.shared.models.counter_standard_section import CounterStandardSectionMapping
from apps.shared.models.mode_of_payment import ModeOfPayment

from apps.shared.models.address import Country, State, District, City
from apps.shared.models.approval import ApprovalTransition, GroupApprovalHierarchy, UserApprovalHierarchy
from apps.shared.models.caste import Caste, Category, Religion
from apps.shared.models.document import DocumentType
from apps.shared.models.counter import Counter, CounterStandardMapping
from django import forms
from apps.shared.models.fee_type_counter import CounterFeeTypeMapping,CounterMiscTypeMapping

from apps.shared.services import CounterService

@receiver(post_save, sender=CounterStandardMapping)
def handled_standard_save(sender, instance, **kwargs):
    sync_standards_in_counter_for_all()

@receiver(post_save, sender=CounterStandardSectionMapping)
def handled_standard_section_save(sender, instance, **kwargs):
    sync_standard_section_in_counter_for_all()

@receiver(post_save, sender=CounterFeeTypeMapping)
def handled_feetype_save(sender, instance, **kwargs):
    sync_fee_type_in_counter_for_all()

@receiver(post_save, sender=CounterMiscTypeMapping)
def handled_misctype_save(sender, instance, **kwargs):
    sync_misc_type_in_counter_for_all()

class CountryAdmin(admin.ModelAdmin):
    list_display = ('name', 'code', 'is_active')
    search_fields = ('name', 'code')

class StateAdmin(admin.ModelAdmin):
    list_select_related = ()
    def get_country(self, obj):
        return obj.country.name

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'country':
            kwargs['queryset'] = Country.objects.all()
        return super(StateAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    get_country.short_description = 'Country'
    get_country.admin_order_field = 'country__name'
    list_display = ('name', 'code', 'get_country', 'is_active')
    search_fields = ('name', 'country')

class DistrictAdmin(admin.ModelAdmin):
    list_select_related = ()
    def get_country(self, obj):
        return obj.state.country.name
    def state(self, obj):
        return obj.state.name

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'state':
            kwargs['queryset'] = State.objects.all()
        return super(DistrictAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    get_country.short_description = 'Country'
    list_display = ('name', 'get_country', 'state', 'is_active')
    search_fields = ('name', 'state')

class CityAdmin(admin.ModelAdmin):

    def get_country(self, obj):
        return obj.district.state.country.name
    def state(self, obj):
        return obj.district.state.name
    def district(self, obj):
        return obj.district.name

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'district':
            kwargs['queryset'] = District.objects.all()
        return super(CityAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    get_country.short_description = 'Country'
    list_display = ('name', 'get_country', 'state', 'district', 'is_active')
    search_fields = ('name', 'district')

class DocumentTypeAdmin(admin.ModelAdmin):
    pass

class CounterAdmin(admin.ModelAdmin):
    list_select_related = ()

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        return True

    def has_add_permission(self, request, obj=None):
        return False

    def get_standard(self, obj):
        if obj.standard:
            return obj.standard.name
        return ''

    def selected_academic(self, obj):
        if obj.academic_year:
            return str(obj.academic_year.start_date) + ' ' + str(obj.academic_year.end_date)
        return ''

    def selected_financial(self, obj):
        if obj.financial_year:
            return str(obj.financial_year.start_date.strftime('%Y')) + ' '  + str(obj.financial_year.end_date)
        return ''
    
    def get_standard_section(self, obj):
        if obj.standard_section:
            return obj.standard_section.standard.name + ' ' + obj.standard_section.section.name
        return '' 

    list_display = (
        'alias_name', 'type', 'value', 'get_standard', 'selected_academic', 'selected_financial',
        'prefix', 'postfix', 'get_standard_section'
    )
    list_filter = (
        'alias_name','type'
    )
    search_fields = ('alias_name', 'prefix')
    ordering = ('alias_name', 'academic_year', 'standard__sequence')


"""
if you want to sync all the counter standard group basis sync it
Nikhil please write a button in django admin to call this function
"""
def sync_standards_in_counter_for_all():
    CounterService.create_counter_from_standard_mapping()
    return {'Reason': "Data Saved"}

def sync_standard_section_in_counter_for_all():
    CounterService.create_counter_from_standard_section_mapping()
    return {'Reason': "Data Saved"}

def sync_fee_type_in_counter_for_all():
    CounterService.create_counter_from_fee_mapping()
    return {'Reason': 'Data Saved'}

def sync_misc_type_in_counter_for_all():
    CounterService.create_counter_from_misc_mapping()
    return {'Reason': 'Data Saved'}

class CounterStandardMappingAdmin(admin.ModelAdmin):

    def get_standard_name(self, obj):
        if obj.standard.name:
            return obj.standard.name
        return ''
    
    list_display = (
        'get_standard_name', 'counter_type_name', 'is_active', 'group_name', 'is_global',
        'prefix_str_for_prefix', 'postfix_str_for_prefix', 'prefix_str_for_postfix','postfix_str_for_postfix'
    )
    ordering = ('standard', 'counter_type_name')
    list_filter = (
        'is_active', 'counter_type_name'
    )

class CounterStandardSectionMappingAdmin(admin.ModelAdmin):

    def get_standard_name(self, obj):
        if obj.standard_section.standard.name:
            return obj.standard_section.standard.name
        return ''
    
    def get_section_name(self, obj):
        if obj.standard_section:
            return obj.standard_section.section.name
        return ''
    
    def get_academic_year(self, obj):
        if obj.standard_section:
            return str(obj.standard_section.academic_year.start_date) + ' ' + str(obj.standard_section.academic_year.end_date)
        return ''
    
    list_display = (
        'get_standard_name', 'get_section_name', 'get_academic_year', 'counter_type_name', 'is_active', 'group_name',
        'prefix_str_for_prefix', 'postfix_str_for_prefix', 'prefix_str_for_postfix','postfix_str_for_postfix'
    )
    ordering = ('standard_section__standard', 'counter_type_name')
    list_filter = (
        'is_active', 'counter_type_name'
    )

class FeeTypeChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return "{}".format(obj.name)

class MiscTypeChoiceField(forms.ModelChoiceField):
    def label_from_instance(self, obj):
        return "{}".format(obj.name)

class CounterFeeTypeMappingAdmin(admin.ModelAdmin):

    def get_fee_type_name(self, obj):
        if obj.fee_type.name:
            return obj.fee_type.name
        return ''
    

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'fee_type':
            return FeeTypeChoiceField(queryset=FeeType.objects.all())
        return super(CounterFeeTypeMappingAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)
    
    list_display = (
        'get_fee_type_name', 'counter_type_name', 'mode_of_payment', 'is_active', 'group_name', 'is_global',
        'prefix_str_for_prefix', 'postfix_str_for_prefix', 'prefix_str_for_postfix','postfix_str_for_postfix'
    )
    ordering = ('fee_type', 'counter_type_name')
    list_filter = (
        'is_active', 'counter_type_name'
    )

class CounterMiscTypeMappingAdmin(admin.ModelAdmin):

    def get_misc_type_name(self, obj):
        if obj.misc_type.name:
            return obj.misc_type.name
        return ''

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name == 'misc_type':
            return MiscTypeChoiceField(queryset=MiscellaneousType.objects.all())
        return super(CounterMiscTypeMappingAdmin, self).formfield_for_foreignkey(db_field, request, **kwargs)

    list_display = (
        'get_misc_type_name', 'counter_type_name', 'mode_of_payment', 'is_active', 'group_name', 'is_global',
        'prefix_str_for_prefix', 'postfix_str_for_prefix', 'prefix_str_for_postfix','postfix_str_for_postfix'
    )
    ordering = ('misc_type', 'counter_type_name')
    list_filter = (
        'is_active', 'counter_type_name'
    )

class CasteAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')

class ReligionAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')

class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active')

class GroupApprovalHierarchyAdmin(admin.ModelAdmin):
    def get_group_name(self, obj):
        if obj.group:
            return obj.group.name
        return ''
    list_display = ('get_group_name', 'sequence')

class UserApprovalHierarchyAdmin(admin.ModelAdmin):
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return ''
    list_display = ('get_username', 'sequence')

class ApprovalTransitionAdmin(admin.ModelAdmin):
    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return ''

    list_display = ('approval_status', 'get_username')

class ModeOfPaymentAdmin(admin.ModelAdmin):
    list_display = ('label', 'name', 'mandatory_fields', 'allowed_app_types')


admin.site.register(DocumentType, DocumentTypeAdmin)
admin.site.register(Country, CountryAdmin)
admin.site.register(State, StateAdmin)
admin.site.register(District, DistrictAdmin)
admin.site.register(City, CityAdmin)
admin.site.register(Counter, CounterAdmin)
admin.site.register(CounterStandardMapping, CounterStandardMappingAdmin)
admin.site.register(CounterStandardSectionMapping, CounterStandardSectionMappingAdmin)
admin.site.register(Caste, CasteAdmin)
admin.site.register(Religion, ReligionAdmin)
admin.site.register(Category, CategoryAdmin)
admin.site.register(CounterFeeTypeMapping, CounterFeeTypeMappingAdmin)
admin.site.register(CounterMiscTypeMapping, CounterMiscTypeMappingAdmin)
admin.site.register(GroupApprovalHierarchy, GroupApprovalHierarchyAdmin)
admin.site.register(UserApprovalHierarchy, UserApprovalHierarchyAdmin)
admin.site.register(ApprovalTransition, ApprovalTransitionAdmin)
admin.site.register(ModeOfPayment, ModeOfPaymentAdmin)
# @admin.register(UploadType, Document)
# class SharedAdmin(admin.ModelAdmin):
#     pass
