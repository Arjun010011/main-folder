from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from apps.classes.models.lesson_plan import (
    LessonPlanTemplate,
    LessonPlanSubtopicDetailAcademicYear,
    LessonPlanSubtopicDetailReview,
)
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.models.subject import Subject
from apps.classes.services.lesson_plan import (
    create_or_update_lesson_plan_template_academic_year,
)
from apps.institutes.models.academicYear import AcademicYear


class Command(BaseCommand):
    help = "Seed some dummy lesson planning data for LessonPlanAcademicYear and its children."

    def handle(self, *args, **options):
        academic_year = (
            AcademicYear.objects.order_by("-start_date").first()
            or AcademicYear.objects.order_by("-id").first()
        )
        subjects = list(Subject.objects.order_by("id")[:10])
        standard_sections = list(StandardSectionMapping.objects.order_by("id")[:10])

        if not academic_year or not subjects or not standard_sections:
            self.stdout.write(
                self.style.ERROR(
                    "Missing required base data (academic_year / subject / standard_section)."
                )
            )
            return

        # Single reviewer user (optional)
        User = get_user_model()
        reviewer = User.objects.order_by("id").first()

        today = date.today()

        created_lp_count = 0
        created_topic_count = 0
        created_subtopic_count = 0
        created_detail_count = 0
        created_review_count = 0

        # We want: 10 LessonPlanAcademicYear, ~100 topics/subtopics/details/reviews.
        # Strategy: 10 LPAs * 10 topics each, each topic with 1 subtopic and 1 detail (+ 1 review).
        for i in range(10):
            subject = subjects[i % len(subjects)]
            standard_section = standard_sections[i % len(standard_sections)]

            template, _ = LessonPlanTemplate.objects.get_or_create(
                subject=subject,
                standard=standard_section.standard,
                plan_name=f"Dummy Plan - Auto Seeded #{i+1}",
            )

            topics_data = []
            for t_index in range(1, 11):
                topic = {
                    "name": f"LP{i+1} Topic {t_index}",
                    "sequence": t_index,
                    "subtopics": [],
                }
                subtopic = {
                    "name": f"LP{i+1} Subtopic {t_index}.1",
                    "sequence": 1,
                    "subtopic_details": [],
                }
                day_offset = (i * 2) + t_index
                detail = {
                    "name": f"LP{i+1} Detail {t_index}.1.1",
                    "objectives": "Dummy objective text for testing.",
                    "activities": "Dummy activity description.",
                    "resource": "Textbook, notebook, projector.",
                    "assessment": "Teacher observation / worksheet check.",
                    "allocated_from_date": (today + timedelta(days=day_offset)).isoformat(),
                    "allocated_to_date": (today + timedelta(days=day_offset)).isoformat(),
                }
                subtopic["subtopic_details"].append(detail)
                topic["subtopics"].append(subtopic)
                topics_data.append(topic)

            # Track existing detail IDs so we can attach reviews only to newly created ones
            before_detail_ids = set(
                LessonPlanSubtopicDetailAcademicYear.objects.values_list("id", flat=True)
            )

            payload = {
                "academic_year": academic_year.id,
                "subject": subject.id,
                "standard_section": standard_section.id,
                "lesson_plan_template": template.id,
                "topics_data": topics_data,
            }

            create_or_update_lesson_plan_template_academic_year(self, payload)

            after_detail_ids = set(
                LessonPlanSubtopicDetailAcademicYear.objects.values_list("id", flat=True)
            )
            new_detail_ids = sorted(after_detail_ids - before_detail_ids)

            created_lp_count += 1
            created_topic_count += 10
            created_subtopic_count += 10  # one subtopic per topic
            created_detail_count += len(new_detail_ids)

            for d_id in new_detail_ids:
                LessonPlanSubtopicDetailReview.objects.create(
                    lesson_plan_subtopic_detail_academic_year_id=d_id,
                    message="Dummy review comment for testing.",
                    date=today,
                    created_by=reviewer,
                )
                created_review_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Created {created_lp_count} LessonPlanAcademicYear, "
                f"{created_topic_count} LessonPlanTopicAcademicYear, "
                f"{created_subtopic_count} LessonPlanSubtopicAcademicYear, "
                f"{created_detail_count} LessonPlanSubtopicDetailAcademicYear and "
                f"{created_review_count} LessonPlanSubtopicDetailReview dummy records."
            )
        )

