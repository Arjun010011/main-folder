from django.contrib import admin

from apps.students.models.student import StudentGroup, StudentMedium

# Register your models here.
class StudentGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'code_name')
    list_filter = ['is_active']

admin.site.register(StudentGroup, StudentGroupAdmin)

class StudentMediumAdmin(admin.ModelAdmin):
    list_display = ('name', 'is_active', 'code_name')
    list_filter = ['is_active']

admin.site.register(StudentMedium, StudentMediumAdmin)