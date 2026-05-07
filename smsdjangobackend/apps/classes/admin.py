from django.contrib import admin
from apps.classes.models.standard import Board, Branch, Standard
from apps.classes.models.lesson_plan import (
    LessonPlanAcademicYear, 
    LessonPlanTopicAcademicYear, 
    LessonPlanSubtopicAcademicYear,
    LessonPlanSubtopicDetailAcademicYear,
    AiLessonPlanCache
)

# Register your models here.

class StandardAdmin(admin.ModelAdmin):
    list_display = ('name', 'get_branch','sequence')
    list_filter = ['is_active']

    def get_branch(self, obj):
        if obj.branch:
            return obj.branch.name
        return None


admin.site.register(Standard,StandardAdmin)


class BranchAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')

admin.site.register(Branch, BranchAdmin)

class BoardAdmin(admin.ModelAdmin):
    list_display = ('name', 'code')

admin.site.register(Board, BoardAdmin)

@admin.register(AiLessonPlanCache)
class AiLessonPlanCacheAdmin(admin.ModelAdmin):
    list_display = ('book_title', 'cache_key', 'source_filename', 'text_length',
                    'last_imported_tenant_db', 'updated_at')
    search_fields = ('book_title', 'source_filename', 'cache_key')
    readonly_fields = ('plan',)


class TopicInline(admin.TabularInline):
    model = LessonPlanTopicAcademicYear
    extra = 0

@admin.register(LessonPlanAcademicYear)
class LessonPlanAcademicYearAdmin(admin.ModelAdmin):
    list_display = ('academic_year', 'subject', 'standard_section', 'created')
    list_filter = ('academic_year', 'subject')
    inlines = [TopicInline]