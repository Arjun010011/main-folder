from unittest.mock import Mock, patch

from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from apps.classes.models import (
    AiLessonPlanCache,
    LessonPlanAcademicYear,
    Standard,
    StandardSectionMapping,
    Section,
    Subject,
)
from apps.classes.models.subject import SubjectPartType
from apps.institutes.models.academicYear import AcademicYear
from apps.users.models.user import User


class AiLessonPlanApiTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.user = User.objects.create(username='planner-user', password='password')
        self.client.force_authenticate(user=self.user)

        self.academic_year = AcademicYear.objects.create(
            start_date='2026-06-01',
            end_date='2027-05-31',
            is_active=True,
        )
        self.subject_part_type = SubjectPartType.objects.create(name='Theory')
        self.subject = Subject.objects.create(
            name='Mathematics',
            subject_part_type=self.subject_part_type,
            is_active=True,
        )
        self.standard = Standard.objects.create(
            name='Class 8',
            codename='class-8',
            sequence=8,
            is_active=True,
        )
        self.section = Section.objects.create(name='A', is_active=True)
        self.standard_section = StandardSectionMapping.objects.create(
            academic_year=self.academic_year,
            standard=self.standard,
            section=self.section,
        )

        self.preview_url = '/api/classes/ailessonplanpreview/'
        self.import_url = '/api/classes/ailessonplanimport/'
        self.ncert_preview_url = '/api/classes/ailessonplanncertpreview/'
        self.ncert_hierarchy_url = '/api/classes/ncerthierarchy/'
        self.text = 'Chapter 1 Algebra and Chapter 2 Geometry'
        self.pdf_bytes = b'%PDF-1.4 fake'
        self.plan = {
            'title': 'Mathematics Lesson Plan',
            'period_minutes': 40,
            'teacher_suggestions': ['Revise concepts'],
            'lesson_plan_academic_year': {
                'academic_year': '2026-2027',
                'subject': 'Mathematics',
                'standard_section': 'Class 8 - A',
                'lesson_plan_template': None,
                'is_active': True,
            },
            'topics': [
                {
                    'name': 'Algebra',
                    'sequence': 1,
                    'subtopics': [
                        {
                            'name': 'Integers',
                            'sequence': 1,
                            'periods': 2,
                            'hours': 1.33,
                            'notes': 'Start from real-world examples',
                            'details': [
                                {
                                    'name': 'Introduction to integers',
                                    'objectives': 'Understand integers',
                                    'activities': 'Board work',
                                    'resource': 'Textbook chapter 1',
                                    'assessment': 'Quick quiz',
                                    'allocated_from_date': None,
                                    'allocated_to_date': None,
                                    'allocated_to_user': None,
                                    'completion_date': None,
                                    'reviews': [],
                                }
                            ],
                        }
                    ],
                }
            ],
            'holiday_calendar': [],
            'days': [
                {
                    'name': 'Monday',
                    'is_active': True,
                    'is_teacher_working_day': True,
                    'is_student_working_day': True,
                }
            ],
            'modules': [
                {
                    'module_title': 'Algebra',
                    'total_periods': 2,
                    'total_hours': 1.33,
                    'topics': [
                        {
                            'topic': 'Integers',
                            'periods': 2,
                            'hours': 1.33,
                            'notes': 'Start from real-world examples',
                        }
                    ],
                }
            ],
            'total_periods': 2,
            'total_hours': 1.33,
            'summary': {
                'total_periods': 2,
                'total_hours': 1.33,
                'periods_per_week': 6,
                'working_days_per_week': 6,
                'govt_holidays_per_year': 17,
                'govt_holidays_estimated': 0.1,
                'unexpected_holidays_per_month': 3,
                'unexpected_holidays_estimated': 0.2,
                'estimated_weeks': 0.33,
                'estimated_teaching_days': 2.0,
                'estimated_calendar_days': 2.3,
            },
        }

    def _build_upload(self, name='lesson-book.pdf'):
        return SimpleUploadedFile(name, self.pdf_bytes, content_type='application/pdf')

    def _preview_payload(self, upload, **overrides):
        payload = {
            'file': upload,
            'academic_year': self.academic_year.id,
            'subject': self.subject.id,
            'standard_section': self.standard_section.id,
        }
        payload.update(overrides)
        return payload

    def _ncert_preview_payload(self, **overrides):
        payload = {
            'academic_year': self.academic_year.id,
            'subject': self.subject.id,
            'standard_section': self.standard_section.id,
            'book_code': 'math8',
            'book_title': 'Mathematics Textbook',
            'pdf_url': 'https://ncert.nic.in/textbook/pdf/math8.pdf',
        }
        payload.update(overrides)
        return payload

    @patch('apps.classes.services.ai_lesson_plan.generate_study_plan')
    @patch('apps.classes.services.ai_lesson_plan.extract_text_from_pdf')
    def test_duplicate_preview_uses_cache(self, extract_text_mock, generate_plan_mock):
        extract_text_mock.return_value = self.text
        generate_plan_mock.return_value = self.plan

        first_response = self.client.post(
            self.preview_url,
            self._preview_payload(self._build_upload()),
            format='multipart',
        )
        second_response = self.client.post(
            self.preview_url,
            self._preview_payload(self._build_upload('same-content.pdf')),
            format='multipart',
        )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(second_response.status_code, 200)
        self.assertFalse(first_response.json()['is_cached'])
        self.assertTrue(second_response.json()['is_cached'])
        self.assertEqual(generate_plan_mock.call_count, 1)
        self.assertEqual(AiLessonPlanCache.objects.count(), 1)

        cache_entry = AiLessonPlanCache.objects.first()
        self.assertEqual(cache_entry.upload_count, 2)
        self.assertEqual(cache_entry.source_filename, 'same-content.pdf')

    @patch('apps.classes.services.ai_lesson_plan.generate_study_plan')
    @patch('apps.classes.services.ai_lesson_plan.extract_text_from_pdf')
    def test_preview_returns_fuzzy_match_before_regeneration(self, extract_text_mock, generate_plan_mock):
        extract_text_mock.return_value = self.text
        AiLessonPlanCache.objects.create(
            book_fingerprint='z' * 64,
            cache_key='y' * 64,
            source_filename='math-grade-8.pdf',
            book_title='Mathematics Lesson Plan',
            text_length=len(' '.join(self.text.split()).lower()),
            plan=self.plan,
        )

        response = self.client.post(
            self.preview_url,
            self._preview_payload(
                self._build_upload(),
                book_title='Mathematics Lesson Plan',
            ),
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json()['is_fuzzy_match'])
        self.assertFalse(response.json()['is_cached'])
        self.assertEqual(generate_plan_mock.call_count, 0)

    @patch('apps.classes.services.ai_lesson_plan.generate_study_plan')
    @patch('apps.classes.services.ai_lesson_plan.extract_text_from_pdf')
    def test_preview_can_accept_fuzzy_match(self, extract_text_mock, generate_plan_mock):
        extract_text_mock.return_value = self.text
        cache_entry = AiLessonPlanCache.objects.create(
            book_fingerprint='x' * 64,
            cache_key='w' * 64,
            source_filename='math-grade-8.pdf',
            book_title='Mathematics Lesson Plan',
            text_length=len(' '.join(self.text.split()).lower()),
            plan=self.plan,
        )

        response = self.client.post(
            self.preview_url,
            self._preview_payload(
                self._build_upload('matched-book.pdf'),
                book_title='Mathematics Lesson Plan',
                use_fuzzy_match=True,
            ),
            format='multipart',
        )

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.json()['is_fuzzy_match'])
        self.assertTrue(response.json()['is_cached'])
        self.assertEqual(generate_plan_mock.call_count, 0)

        cache_entry.refresh_from_db()
        self.assertEqual(cache_entry.upload_count, 2)
        self.assertEqual(cache_entry.source_filename, 'matched-book.pdf')

    def test_import_creates_academic_year_lesson_plan(self):
        cache_entry = AiLessonPlanCache.objects.create(
            book_fingerprint='a' * 64,
            cache_key='b' * 64,
            source_filename='lesson-book.pdf',
            book_title='Mathematics Lesson Plan',
            text_length=len(self.text),
            plan=self.plan,
        )

        response = self.client.post(
            self.import_url,
            {
                'cache_key': cache_entry.cache_key,
                'academic_year': self.academic_year.id,
                'subject': self.subject.id,
                'standard_section': self.standard_section.id,
                'replace_existing': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(LessonPlanAcademicYear.objects.count(), 1)

        lesson_plan = LessonPlanAcademicYear.objects.first()
        self.assertEqual(
            lesson_plan.lesson_plan_topic_academic_year_lesson_plan_academic_year.count(),
            1,
        )
        topic = lesson_plan.lesson_plan_topic_academic_year_lesson_plan_academic_year.first()
        self.assertEqual(topic.name, 'Algebra')
        subtopic = topic.lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year.first()
        self.assertEqual(subtopic.name, 'Integers')
        detail = subtopic.lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year.first()
        self.assertEqual(detail.objectives, 'Understand integers')

        cache_entry.refresh_from_db()
        self.assertEqual(cache_entry.last_imported_lesson_plan_id, lesson_plan.id)
        self.assertTrue(cache_entry.last_imported_tenant_db)  # should be set to current DB

    def test_import_requires_replace_when_existing_plan_exists(self):
        LessonPlanAcademicYear.objects.create(
            academic_year=self.academic_year,
            subject=self.subject,
            standard_section=self.standard_section,
        )
        cache_entry = AiLessonPlanCache.objects.create(
            book_fingerprint='c' * 64,
            cache_key='d' * 64,
            source_filename='lesson-book.pdf',
            book_title='Mathematics Lesson Plan',
            text_length=len(self.text),
            plan=self.plan,
        )

        response = self.client.post(
            self.import_url,
            {
                'cache_key': cache_entry.cache_key,
                'academic_year': self.academic_year.id,
                'subject': self.subject.id,
                'standard_section': self.standard_section.id,
                'replace_existing': False,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn('replace_existing', response.json())

    def test_import_replaces_existing_plan_when_confirmed(self):
        existing_plan = LessonPlanAcademicYear.objects.create(
            academic_year=self.academic_year,
            subject=self.subject,
            standard_section=self.standard_section,
        )
        cache_entry = AiLessonPlanCache.objects.create(
            book_fingerprint='e' * 64,
            cache_key='f' * 64,
            source_filename='lesson-book.pdf',
            book_title='Mathematics Lesson Plan',
            text_length=len(self.text),
            plan=self.plan,
        )

        response = self.client.post(
            self.import_url,
            {
                'cache_key': cache_entry.cache_key,
                'academic_year': self.academic_year.id,
                'subject': self.subject.id,
                'standard_section': self.standard_section.id,
                'replace_existing': True,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(LessonPlanAcademicYear.objects.count(), 1)

        existing_plan.refresh_from_db()
        topic = existing_plan.lesson_plan_topic_academic_year_lesson_plan_academic_year.first()
        self.assertEqual(topic.name, 'Algebra')

    @patch('apps.classes.services.ai_lesson_plan.generate_study_plan')
    @patch('apps.classes.services.ai_lesson_plan.extract_text_from_pdf')
    @patch('apps.classes.services.ai_lesson_plan.download_ncert_book_as_upload')
    def test_ncert_preview_uses_downloaded_book(self, download_mock, extract_text_mock, generate_plan_mock):
        download_mock.return_value = self._build_upload('ncert-book.pdf')
        extract_text_mock.return_value = self.text
        generate_plan_mock.return_value = self.plan

        response = self.client.post(
            self.ncert_preview_url,
            self._ncert_preview_payload(),
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()['book_title'], 'Mathematics Lesson Plan')
        download_mock.assert_called_once()
        self.assertEqual(generate_plan_mock.call_count, 1)

    @patch('apps.classes.services.ncert_service.requests.get')
    def test_ncert_hierarchy_endpoint_returns_fallback_when_page_has_no_classes(self, requests_get_mock):
        response_mock = Mock()
        response_mock.text = '<html><body><select id="subject"><option value="math">Mathematics</option></select></body></html>'
        response_mock.raise_for_status.return_value = None
        requests_get_mock.return_value = response_mock

        response = self.client.get(self.ncert_hierarchy_url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()['data']), 12)
