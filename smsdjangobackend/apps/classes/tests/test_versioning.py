from django.test import TestCase
from apps.classes.models import (
    LessonPlanAcademicYear,
    LessonPlanTopicAcademicYear,
    LessonPlanSubtopicAcademicYear,
    LessonPlanSubtopicDetailAcademicYear,
    LessonPlanVersion,
    Standard,
    Section,
    StandardSectionMapping,
    Subject,
    AiLessonPlanCache
)
from apps.classes.models.subject import SubjectPartType
from apps.institutes.models.academicYear import AcademicYear
from apps.users.models.user import User
from apps.classes.services.versioning_service import (
    create_lesson_plan_snapshot,
    merge_ai_content,
    restore_lesson_plan_version
)
from apps.classes.services.ai_lesson_plan import import_ai_lesson_plan
from apps.classes.serializers import LessonPlanAcademicYearReadSerializer

class VersioningServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create(username='testuser', first_name='Test', last_name='User')
        self.academic_year = AcademicYear.objects.create(
            start_date='2026-06-01', end_date='2027-05-31', is_active=True
        )
        self.subject_part_type = SubjectPartType.objects.create(name='Theory')
        self.subject = Subject.objects.create(
            name='Science', subject_part_type=self.subject_part_type, is_active=True
        )
        self.standard = Standard.objects.create(name='Class 9', sequence=9)
        self.section = Section.objects.create(name='A')
        self.standard_section = StandardSectionMapping.objects.create(
            academic_year=self.academic_year, standard=self.standard, section=self.section
        )
        
        # Create a basic lesson plan
        self.lp_acad = LessonPlanAcademicYear.objects.create(
            academic_year=self.academic_year,
            subject=self.subject,
            standard_section=self.standard_section
        )
        self.topic = LessonPlanTopicAcademicYear.objects.create(
            lesson_plan_academic_year=self.lp_acad, name='Biology', sequence=1
        )
        self.subtopic = LessonPlanSubtopicAcademicYear.objects.create(
            lesson_plan_topic_academic_year=self.topic, name='Cells', sequence=1
        )
        self.detail = LessonPlanSubtopicDetailAcademicYear.objects.create(
            lesson_plan_subtopic_academic_year=self.subtopic,
            name='Cell Structure',
            objectives='Learn about cells',
            is_manually_edited=True # Teacher edited this
        )

    def test_create_snapshot(self):
        version = create_lesson_plan_snapshot(self.lp_acad, user=self.user, change_summary="Initial state")
        self.assertEqual(LessonPlanVersion.objects.count(), 1)
        self.assertEqual(version.version_number, 1)
        self.assertEqual(version.snapshot['topics'][0]['name'], 'Biology')
        self.assertEqual(version.snapshot['topics'][0]['subtopics'][0]['subtopic_details'][0]['name'], 'Cell Structure')

    def test_merge_ai_content_preserves_manual_edits(self):
        # New AI content has different objectives for the same detail name
        new_topics_data = [
            {
                'name': 'Biology',
                'sequence': 1,
                'subtopics': [
                    {
                        'name': 'Cells',
                        'sequence': 1,
                        'subtopic_details': [
                            {
                                'name': 'Cell Structure',
                                'objectives': 'AI NEW OBJECTIVES',
                                'activities': 'AI activities'
                            },
                            {
                                'name': 'New AI Detail',
                                'objectives': 'New objectives',
                                'activities': 'New activities'
                            }
                        ]
                    }
                ]
            }
        ]
        
        merged_data = merge_ai_content(self.lp_acad, new_topics_data)
        
        # Check that 'Cell Structure' objectives are PRESERVED (from manual edit)
        detail_1 = merged_data[0]['subtopics'][0]['subtopic_details'][0]
        self.assertEqual(detail_1['name'], 'Cell Structure')
        self.assertEqual(detail_1['objectives'], 'Learn about cells') # Preserved
        self.assertTrue(detail_1['is_manually_edited'])
        
        # Check that 'New AI Detail' is added
        detail_2 = merged_data[0]['subtopics'][0]['subtopic_details'][1]
        self.assertEqual(detail_2['name'], 'New AI Detail')
        self.assertEqual(detail_2['objectives'], 'New objectives') # From AI
        self.assertFalse(detail_2.get('is_manually_edited', False))

    def test_restore_version(self):
        # 1. Create snapshot
        create_lesson_plan_snapshot(self.lp_acad, user=self.user, change_summary="v1")
        
        # 2. Modify current state (delete and add something else)
        self.detail.delete()
        LessonPlanSubtopicDetailAcademicYear.objects.create(
            lesson_plan_subtopic_academic_year=self.subtopic,
            name='Wrong Detail',
            objectives='Something wrong'
        )
        
        # 3. Restore v1
        restore_lesson_plan_version(self.lp_acad, 1)
        
        # 4. Verify state is back to v1
        self.lp_acad.refresh_from_db()
        topics = self.lp_acad.lesson_plan_topic_academic_year_lesson_plan_academic_year.all()
        self.assertEqual(topics.count(), 1)
        self.assertEqual(topics[0].name, 'Biology')
        
        subtopics = topics[0].lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year.all()
        self.assertEqual(subtopics.count(), 1)
        self.assertEqual(subtopics[0].name, 'Cells')
        
        details = subtopics[0].lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year.all()
        self.assertEqual(details.count(), 1)
        self.assertEqual(details[0].name, 'Cell Structure')
        self.assertEqual(details[0].objectives, 'Learn about cells')

    def test_import_ai_plan_triggers_snapshot_and_merge(self):
        # Mocking or using real import_ai_lesson_plan
        cache_entry = AiLessonPlanCache.objects.create(
            book_fingerprint='test_fingerprint',
            cache_key='test_cache_key',
            plan={
                'topics': [
                    {
                        'name': 'Biology',
                        'subtopics': [
                            {
                                'name': 'Cells',
                                'details': [
                                    {
                                        'name': 'Cell Structure',
                                        'objectives': 'AI objectives',
                                        'activities': 'AI activities'
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        )
        
        # Call import
        import_ai_lesson_plan({
            'cache_key': 'test_cache_key',
            'academic_year': self.academic_year,
            'subject': self.subject,
            'standard_section': self.standard_section,
            'replace_existing': True,
            'user': self.user
        })
        
        # 1. Check if snapshot was created
        self.assertEqual(LessonPlanVersion.objects.count(), 1)
        self.assertEqual(LessonPlanVersion.objects.first().change_summary, "Imported AI plan from cache test_cache_key")
        
        # 2. Check if merge was successful (cell structure should be preserved because it was manually edited in setup)
        detail = LessonPlanSubtopicDetailAcademicYear.objects.get(
            lesson_plan_subtopic_academic_year__name='Cells',
            name='Cell Structure'
        )
        self.assertEqual(detail.objectives, 'Learn about cells') # Preserved
