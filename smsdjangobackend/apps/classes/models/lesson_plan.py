import uuid
from django.db import models
from django.conf import settings

from apps.institutes.models.academicYear import AcademicYear

from .standard import Standard, StandardSectionMapping
from .subject import Subject


class LessonPlanTemplate(models.Model):
    """Template for a lesson plan: subject + standard + plan name."""
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='lesson_plan_template_subject',
        null=True,
        blank=True
    )
    standard = models.ForeignKey(
        Standard,
        on_delete=models.CASCADE,
        related_name='lesson_plan_template_standard',
        null=True,
        blank=True
    )
    plan_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.plan_name} ({self.standard} - {self.subject})'


class LessonPlanTopic(models.Model):
    """Topic under a lesson plan template."""
    lesson_plan_template = models.ForeignKey(
        LessonPlanTemplate,
        on_delete=models.CASCADE,
        related_name='lesson_plan_topic_lesson_plan_template'
    )
    name = models.CharField(max_length=255)
    sequence = models.IntegerField(default=0, help_text='Order of topic')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class LessonPlanSubtopic(models.Model):
    """Subtopic under a topic."""
    topic = models.ForeignKey(
        LessonPlanTopic,
        on_delete=models.CASCADE,
        related_name='lesson_plan_subtopic_lesson_plan_topic'
    )
    name = models.CharField(max_length=255)
    sequence = models.IntegerField(default=0, help_text='Order of subtopic')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class LessonPlanSubtopicDetail(models.Model):
    """Details for a subtopic: name, objectives, activities, resource, assessment."""
    subtopic = models.ForeignKey(
        LessonPlanSubtopic,
        on_delete=models.CASCADE,
        related_name='lesson_plan_subtopic_detail_lesson_plan_subtopic'
    )
    name = models.CharField(max_length=255, blank=True)
    objectives = models.TextField(blank=True)
    activities = models.TextField(blank=True)
    resource = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f'Detail for {self.subtopic.name}'


# --- Academic-year-scoped lesson plan models ---


class LessonPlanAcademicYear(models.Model):
    """Lesson plan binding for an academic year: academic_year + subject + standard_section + template."""
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='lesson_plan_academic_year_academic_year',
        null=True,
        blank=True
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='lesson_plan_academic_year_subject',
        null=True,
        blank=True
    )
    standard_section = models.ForeignKey(
        StandardSectionMapping,
        on_delete=models.CASCADE,
        related_name='lesson_plan_academic_year_standard_section',
        null=True,
        blank=True
    )
    lesson_plan_template = models.ForeignKey(
        LessonPlanTemplate,
        on_delete=models.CASCADE,
        related_name='lesson_plan_academic_year_lesson_plan_template',
        null=True,
        blank=True
    )
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.academic_year} - {self.subject} - {self.standard_section}'


class LessonPlanTopicAcademicYear(models.Model):
    """Topic under a lesson plan for an academic year."""
    lesson_plan_academic_year = models.ForeignKey(
        LessonPlanAcademicYear,
        on_delete=models.CASCADE,
        related_name='lesson_plan_topic_academic_year_lesson_plan_academic_year'
    )
    name = models.CharField(max_length=255)
    sequence = models.IntegerField(default=0, help_text='Order of topic')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class LessonPlanSubtopicAcademicYear(models.Model):
    """Subtopic under a topic for an academic year."""
    lesson_plan_topic_academic_year = models.ForeignKey(
        LessonPlanTopicAcademicYear,
        on_delete=models.CASCADE,
        related_name='lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year'
    )
    name = models.CharField(max_length=255)
    sequence = models.IntegerField(default=0, help_text='Order of subtopic')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class LessonPlanSubtopicDetailAcademicYear(models.Model):
    """Details for a subtopic in an academic year. Use allocated_from_date and allocated_to_date for multi-day allocation."""
    lesson_plan_subtopic_academic_year = models.ForeignKey(
        LessonPlanSubtopicAcademicYear,
        on_delete=models.CASCADE,
        related_name='lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year'
    )
    name = models.CharField(max_length=255, blank=True)
    objectives = models.TextField(blank=True)
    activities = models.TextField(blank=True)
    resource = models.TextField(blank=True)
    assessment = models.TextField(blank=True)
    allocated_from_date = models.DateField(null=True, blank=True, help_text='First day of allocation (e.g. for 3–4 day subtopic)')
    allocated_to_date = models.DateField(null=True, blank=True, help_text='Last day of allocation')
    allocated_to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='lesson_plan_subtopic_detail_academic_year_allocated_to_user',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    completion_date = models.DateField(null=True, blank=True, help_text='Date when the detail was completed')

    # --- Tracking manual edits for AI merge logic ---
    is_manually_edited = models.BooleanField(
        default=False,
        help_text='True if a teacher has manually saved changes to this detail'
    )
    last_ai_synced_at = models.DateTimeField(
        null=True, blank=True,
        help_text='When this record was last updated by AI'
    )

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name or f'Detail for {self.lesson_plan_subtopic_academic_year.name}'


class LessonPlanSubtopicDetailReview(models.Model):
    """Review/feedback message for a subtopic detail. Stores text message, date, user who posted."""
    lesson_plan_subtopic_detail_academic_year = models.ForeignKey(
        LessonPlanSubtopicDetailAcademicYear,
        on_delete=models.CASCADE,
        related_name='lesson_plan_subtopic_detail_review_detail'
    )
    message = models.TextField(help_text='Review or feedback text')
    date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        related_name='lesson_plan_subtopic_detail_review_created_by',
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        parts = []
        if self.created_by:
            parts.append(str(self.created_by))
        if self.date:
            parts.append(str(self.date))
        return ' | '.join(parts) if parts else f'Review #{self.pk or "?"}'


class LessonPlanVersion(models.Model):
    """Immutable snapshots of a lesson plan for history and restoration."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lesson_plan = models.ForeignKey(
        LessonPlanAcademicYear,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.PositiveIntegerField(default=1)
    snapshot = models.JSONField(help_text='Full serialized plan JSON at this point in time')
    change_summary = models.TextField(blank=True, help_text='Summary of what changed in this version')
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-version_number']
        unique_together = ('lesson_plan', 'version_number')

    def __str__(self):
        return f'v{self.version_number} - {self.lesson_plan}'


class AiLessonPlanCache(models.Model):
    """Cached AI-generated lesson plan preview for textbook uploads.

    Lives in the central database (sms_central_library) and is shared
    across all tenant schools.  The TenantRouter directs all reads/writes
    for this model to 'central_db'.

    Cross-database ForeignKeys are not supported by MySQL, so we store
    the last-imported lesson plan reference as a plain integer ID plus
    the tenant database name that owns the imported copy.
    """
    book_fingerprint = models.CharField(max_length=64, db_index=True)
    cache_key = models.CharField(max_length=64, unique=True)
    source_filename = models.CharField(max_length=255, blank=True)
    book_title = models.CharField(max_length=255, db_index=True, blank=True)
    text_length = models.PositiveIntegerField(default=0, db_index=True)
    upload_count = models.PositiveIntegerField(default=1)
    plan = models.JSONField()

    # --- Cross-DB-safe tracking (replaces the old ForeignKey) ---
    last_imported_lesson_plan_id = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='PK of LessonPlanAcademicYear in the tenant DB',
    )
    last_imported_tenant_db = models.CharField(
        max_length=100, blank=True,
        help_text='Database key of the tenant that last imported this plan',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return self.book_title or self.source_filename or self.book_fingerprint
