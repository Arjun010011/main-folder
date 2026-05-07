from django.contrib import admin

from apps.payments.models.beneficiary import Beneficiary, BeneficiaryFeePlanMapping

class BeneficiaryAdmin(admin.ModelAdmin):

    def get_queryset(self, request):
        qs = super(BeneficiaryAdmin, self).get_queryset(request)
        if request.user.is_superuser:
            return qs
        return []

    def get_exclude(self, request, obj):
        return ('created', 'modified')

    list_display = (
        'beneficiary_id',
        'user',
        'email',
        'phone',
        'bank_account',
        'account_holder_name',
        'ifsc',
        'address',
        'city',
        'state',
        'pincode',
        'status',
        'is_primary',
    )


class BeneficiaryFeePlanMappingAdmin(admin.ModelAdmin):

    def get_queryset(self, request):
        qs = super(BeneficiaryFeePlanMappingAdmin, self).get_queryset(request)
        if request.user.is_superuser:
            return qs
        return []
    raw_id_fields = (
        'fee_plan',
    )

    # search_fields = (
    #     'product__product_name',
    #     'product__product_code',
    # )

    list_display = (
        'beneficiary',
        'fee_plan',
        'is_amount',
        'rate',
        'priority'
    )

admin.site.register(Beneficiary, BeneficiaryAdmin)
admin.site.register(BeneficiaryFeePlanMapping, BeneficiaryFeePlanMappingAdmin)

