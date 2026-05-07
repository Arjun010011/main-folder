from django.contrib import admin
from apps.exams.models.marks import StudentMarkAuditLog
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.models.subject import Subject

from django.contrib.auth import get_user_model

class EditedByFilter(admin.SimpleListFilter):
    title = 'Edited By'
    parameter_name = 'edited_by'

    def lookups(self, request, model_admin):
        User = get_user_model()
        user_ids = StudentMarkAuditLog.objects.values_list('edited_by', flat=True).distinct()
        users = User.objects.filter(id__in=user_ids)
        return [(str(user.id), user.username) for user in users]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(edited_by__id=self.value())
        return queryset


class StandardSectionFilter(admin.SimpleListFilter):
    title = 'Standard Section (with Academic Year)'
    parameter_name = 'standard_section'

    def lookups(self, request, model_admin):
        sections = StandardSectionMapping.objects.select_related('standard', 'section', 'academic_year').order_by('-academic_year__start_date')
        return [
            (
                str(s.id),
                f"{s.standard.name} - {s.section.name} "
                f"({s.academic_year.start_date.year}–{s.academic_year.end_date.year})"
                if s.academic_year and s.academic_year.start_date and s.academic_year.end_date
                else f"{s.standard.name} - {s.section.name} (N/A)"
            )
            for s in sections
        ]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(student_mark__exam_schedule__standard_section__id=self.value())
        return queryset


class SubjectFilter(admin.SimpleListFilter):
    title = 'Subject'
    parameter_name = 'subject'

    def lookups(self, request, model_admin):
        return [(str(sub.id), sub.name) for sub in Subject.objects.all()]

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(student_mark__exam_schedule__subject__id=self.value())
        return queryset



@admin.register(StudentMarkAuditLog)
class StudentMarkAuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'student_mark',
        'get_exam_name',
        'get_standard_section',
        'get_subject_name',
        'field_name',
        'old_value',
        'new_value',
        'edited_by',
        'edited_on',
    ]
    list_filter = ['field_name', 'edited_on', StandardSectionFilter, SubjectFilter, EditedByFilter]
    search_fields = [
        'student_mark__id',
        'field_name',
        'edited_by__username',
        'student_mark__exam_schedule__exam__description',
        'student_mark__exam_schedule__subject__name',
        'student_mark__exam_schedule__standard_section__standard__name',
        'student_mark__exam_schedule__standard_section__section__name',
    ]

    def get_exam_name(self, obj):
        try:
            return obj.student_mark.exam_schedule.exam.description
        except:
            return '-'
    get_exam_name.short_description = 'Exam'

    def get_standard_section(self, obj):
        try:
            standard = obj.student_mark.exam_schedule.standard_section.standard.name
            section = obj.student_mark.exam_schedule.standard_section.section.name
            return f"{standard} - {section}"
        except:
            return '-'
    get_standard_section.short_description = 'Standard-Section'

    def get_subject_name(self, obj):
        try:
            return obj.student_mark.exam_schedule.subject.name
        except:
            return '-'
    get_subject_name.short_description = 'Subject'
