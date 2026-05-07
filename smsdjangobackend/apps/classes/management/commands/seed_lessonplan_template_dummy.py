from django.core.management.base import BaseCommand

from apps.classes.models.lesson_plan import (
    LessonPlanTemplate,
    LessonPlanTopic,
    LessonPlanSubtopic,
    LessonPlanSubtopicDetail,
)
from apps.classes.models.standard import Standard
from apps.classes.models.subject import Subject


class Command(BaseCommand):
    help = "Seed dummy data for LessonPlanTemplate and its Topic/Subtopic/Detail tables."

    def add_arguments(self, parser):
        parser.add_argument(
            "--templates",
            type=int,
            default=5,
            help="How many templates to seed (default: 5)",
        )
        parser.add_argument(
            "--topics",
            type=int,
            default=10,
            help="Topics per template (default: 10)",
        )
        parser.add_argument(
            "--subtopics",
            type=int,
            default=1,
            help="Subtopics per topic (default: 1)",
        )
        parser.add_argument(
            "--details",
            type=int,
            default=1,
            help="Details per subtopic (default: 1)",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Create even if similar dummy names already exist.",
        )

    def handle(self, *args, **options):
        template_count = int(options["templates"])
        topics_per_template = int(options["topics"])
        subtopics_per_topic = int(options["subtopics"])
        details_per_subtopic = int(options["details"])
        force = bool(options["force"])

        subjects = list(Subject.objects.order_by("id")[: max(10, template_count)])
        standards = list(Standard.objects.order_by("sequence", "id")[: max(10, template_count)])

        if not subjects or not standards:
            self.stdout.write(
                self.style.ERROR("Missing base data (Subject / Standard). Seed those first.")
            )
            return

        created_templates = 0
        created_topics = 0
        created_subtopics = 0
        created_details = 0

        for i in range(template_count):
            subject = subjects[i % len(subjects)]
            standard = standards[i % len(standards)]
            plan_name = f"Dummy Template - Auto Seeded #{i + 1}"

            template_qs = LessonPlanTemplate.objects.filter(
                subject=subject,
                standard=standard,
                plan_name=plan_name,
            )
            if template_qs.exists() and not force:
                template = template_qs.first()
            else:
                template = LessonPlanTemplate.objects.create(
                    subject=subject,
                    standard=standard,
                    plan_name=plan_name,
                    is_active=True,
                )
                created_templates += 1

            for t_index in range(1, topics_per_template + 1):
                topic_name = f"T{i + 1}.{t_index} Topic"
                topic, topic_created = LessonPlanTopic.objects.get_or_create(
                    lesson_plan_template=template,
                    name=topic_name,
                    defaults={"sequence": t_index},
                )
                if topic_created:
                    created_topics += 1

                for s_index in range(1, subtopics_per_topic + 1):
                    subtopic_name = f"T{i + 1}.{t_index}.{s_index} Subtopic"
                    subtopic, subtopic_created = LessonPlanSubtopic.objects.get_or_create(
                        topic=topic,
                        name=subtopic_name,
                        defaults={"sequence": s_index},
                    )
                    if subtopic_created:
                        created_subtopics += 1

                    for d_index in range(1, details_per_subtopic + 1):
                        detail_name = f"T{i + 1}.{t_index}.{s_index}.{d_index} Detail"
                        detail_qs = LessonPlanSubtopicDetail.objects.filter(
                            subtopic=subtopic, name=detail_name
                        )
                        if detail_qs.exists() and not force:
                            continue
                        LessonPlanSubtopicDetail.objects.create(
                            subtopic=subtopic,
                            name=detail_name,
                            objectives="Dummy objective text for testing.",
                            activities="Dummy activity description.",
                            resource="Textbook, notebook, projector.",
                            assessment="Teacher observation / worksheet check.",
                        )
                        created_details += 1

        self.stdout.write(
            self.style.SUCCESS(
                "Seed complete. "
                f"Created templates={created_templates}, topics={created_topics}, "
                f"subtopics={created_subtopics}, details={created_details}."
            )
        )

