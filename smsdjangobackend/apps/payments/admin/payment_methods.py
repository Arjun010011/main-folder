from django.contrib import admin

from apps.payments.models.payment_methods import OnlinePaymentMethods

class OnlinePaymentMethodsAdmin(admin.ModelAdmin):

    def get_queryset(self, request):
        qs = super(OnlinePaymentMethodsAdmin, self).get_queryset(request)
        if request.user.is_superuser:  # PB superuser
            return qs
        return []

    def get_exclude(self, request, obj):
        return ('created', 'modified')

    list_display = (
        'transaction_type',
        'is_percentage',
        'fees',
        'max_fees',
    )

admin.site.register(OnlinePaymentMethods, OnlinePaymentMethodsAdmin)
