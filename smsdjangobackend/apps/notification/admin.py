from django.contrib import admin
from apps.notification.models import NotificationApiConfiguration
from apps.notification.models.notification import NotificationLangauge, NotificationVendor


# Register your models here.

class NotificationApiConfigurationAdmin(admin.ModelAdmin):
    list_display = (
        'api_name', 'description', 'suggestion', 'customized_message', 'default_message',
        'notification_medium', 'enable_for_school'
    )
    list_filter = (
        'api_name', 'description', 'suggestion', 'customized_message', 'default_message',
        'notification_medium', 'enable_for_school'
    )
    readonly_fields = ('api_name', 'notification_medium', 'description')

    def has_add_permission(self, request, obj=None):
        return False

    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        if 'extra_params' in form.base_fields:
            form.base_fields['extra_params'].help_text = (
                "Provide JSON format. Example: "
                '{"template_id": "image_url"}'
            )
        return form
 
class NotificationLangaugeAdmin(admin.ModelAdmin):
    pass

class NotificationVendorAdmin(admin.ModelAdmin):
    list_display = (
        'notification_medium', 'vendor_name', 'is_active'
    )
    list_filter = (
        'notification_medium', 'vendor_name', 'is_active'
    )


admin.site.register(NotificationApiConfiguration, NotificationApiConfigurationAdmin)
admin.site.register(NotificationLangauge, NotificationLangaugeAdmin)
admin.site.register(NotificationVendor, NotificationVendorAdmin)
