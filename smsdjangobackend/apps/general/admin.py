from django.contrib import admin
from apps.general.models import Event


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    pass
