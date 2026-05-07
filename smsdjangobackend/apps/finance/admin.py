from django.contrib import admin

from apps.finance.models.fee_category import FeeCategory, FeeCategoryFeeStandardSectionMapping

class FeeCategoryAdmin(admin.ModelAdmin):

    ordering = ('name', 'code')
    list_filter = (
        'name', 'code', 'is_active'
    )
    list_display = (
        'name', 'code'
    )

class FeeCategoryFeeStandardSectionMappingAdmin(admin.ModelAdmin):

    ordering = ('fee_category', 'standard_section', 'fee_plan')
    list_filter = (
        'fee_category', 'standard_section', 'fee_plan'
    )

admin.site.register(FeeCategory, FeeCategoryAdmin)
admin.site.register(FeeCategoryFeeStandardSectionMapping, FeeCategoryFeeStandardSectionMappingAdmin)
