from datetime import datetime, date, timedelta

from rest_framework import exceptions
from django.db import transaction

from apps.classes.models import (
    LessonPlanTemplate,
    LessonPlanTopic,
    LessonPlanSubtopic,
    LessonPlanSubtopicDetail,
    LessonPlanAcademicYear,
    LessonPlanTopicAcademicYear,
    LessonPlanSubtopicAcademicYear,
    LessonPlanSubtopicDetailAcademicYear,
    LessonPlanSubtopicDetailReview,
    LessonPlanSubtopicDetailAcademicYear

)
from apps.classes.serializers import (
    LessonPlanTopicWriteSerializer,
    LessonPlanSubtopicWriteSerializer,
    LessonPlanSubtopicDetailWriteSerializer,
    LessonPlanAcademicYearSerializer,
    LessonPlanTopicAcademicYearSerializer,
    LessonPlanSubtopicAcademicYearSerializer,
    LessonPlanSubtopicDetailAcademicYearSerializer,
    LessonPlanStatusReadSerializer,
    LessonPlanSubtopicDetailStatusSerializer,
    LessonPlanTemplateSerializer,
    StandardSectionMappingSerializer,
    SubjectSerializer,
    LessonPlanSubtopicDetailReviewWriteSerializer
)
from apps.institutes.serializers import AcademicYearSerializer
from apps.tenants.services.middlewares import get_current_db_name
from django.db.models import Q
from apps.hr.models import StaffHourSubjectMapping
from apps.institutes.models.academicYear import AcademicYear
from urllib.parse import urlencode


def create_or_update_lesson_plan_template(self, data):
    """
    Create or update lesson plan. Uses frontend keys: plan_name, subject, standard,
    is_active, topics_data, id. Each topic: id, name, topic_name, sequence, subtopics.
    Each subtopic: id, name, sequence, subtopic_details.
    """
    plan_name = (data.get('plan_name') or '').strip()
    if not plan_name:
        raise exceptions.ValidationError('plan_name is required')

    template_id = data.get('id')
    if template_id is not None:
        try:
            template_id = int(template_id)
        except (TypeError, ValueError):
            template_id = None

    subject_id = data.get('subject')
    if subject_id is not None and subject_id != '':
        try:
            subject_id = int(subject_id)
        except (TypeError, ValueError):
            subject_id = None
    standard_id = data.get('standard')
    if standard_id is not None and standard_id != '':
        try:
            standard_id = int(standard_id)
        except (TypeError, ValueError):
            standard_id = None

    topics_data = data.get('topics_data')
    if not isinstance(topics_data, list):
        topics_data = []

    with transaction.atomic(using=get_current_db_name()):
        if template_id:
            try:
                template = LessonPlanTemplate.objects.get(id=template_id)
            except LessonPlanTemplate.DoesNotExist:
                raise exceptions.ValidationError('Lesson plan template not found.')
            template.plan_name = plan_name
            template.subject_id = subject_id
            template.standard_id = standard_id
            if 'is_active' in data:
                template.is_active = data.get('is_active', True)
            existing_topic_ids = set(
                LessonPlanTopic.objects.filter(lesson_plan_template=template).values_list('id', flat=True)
            )
        else:
            template = LessonPlanTemplate(
                plan_name=plan_name,
                subject_id=subject_id,
                standard_id=standard_id,
                is_active=data.get('is_active', True),
            )
            existing_topic_ids = set()

        template.save()

        topics_create_data = []
        ordered_topics = [None] * len(topics_data)
        topic_create_indices = []

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic_name = (t_data.get('name') or t_data.get('topic_name') or '').strip()
            if not topic_name:
                continue
            topic_id = t_data.get('id')
            if topic_id is not None:
                try:
                    topic_id = int(topic_id)
                except (TypeError, ValueError):
                    topic_id = None
            if topic_id and LessonPlanTopic.objects.filter(id=topic_id, lesson_plan_template=template).exists():
                topic = LessonPlanTopic.objects.get(id=topic_id)
                topic.name = topic_name
                topic.sequence = t_data.get('sequence', seq)
                topic.save()
                ordered_topics[seq] = topic
            else:
                topics_create_data.append({
                    'lesson_plan_template': template.id,
                    'name': topic_name,
                    'sequence': t_data.get('sequence', seq),
                })
                topic_create_indices.append(seq)

        if topics_create_data:
            ser = LessonPlanTopicWriteSerializer(data=topics_create_data, many=True)
            ser.is_valid(raise_exception=True)
            created_topics = ser.save()
            for j, idx in enumerate(topic_create_indices):
                ordered_topics[idx] = created_topics[j]

        seen_topic_ids = {t.id for t in ordered_topics if t is not None}

        subtopics_create_data = []
        ordered_subtopics_by_topic = [[] for _ in topics_data]
        subtopic_create_topic_indices = []
        subtopic_create_sub_indices = []

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic = ordered_topics[seq] if seq < len(ordered_topics) else None
            if topic is None:
                continue
            subtopics_data = t_data.get('subtopics')
            if not isinstance(subtopics_data, list):
                subtopics_data = []
            for s_seq, s_data in enumerate(subtopics_data):
                if not isinstance(s_data, dict):
                    continue
                subtopic_name = (s_data.get('name') or '').strip()
                if not subtopic_name:
                    continue
                subtopic_id = s_data.get('id')
                if subtopic_id is not None:
                    try:
                        subtopic_id = int(subtopic_id)
                    except (TypeError, ValueError):
                        subtopic_id = None
                if subtopic_id and LessonPlanSubtopic.objects.filter(id=subtopic_id, topic=topic).exists():
                    subtopic = LessonPlanSubtopic.objects.get(id=subtopic_id)
                    subtopic.name = subtopic_name
                    subtopic.sequence = s_data.get('sequence', s_seq)
                    subtopic.save()
                    ordered_subtopics_by_topic[seq].append(subtopic)
                else:
                    subtopics_create_data.append({
                        'topic': topic.id,
                        'name': subtopic_name,
                        'sequence': s_data.get('sequence', s_seq),
                    })
                    subtopic_create_topic_indices.append(seq)
                    subtopic_create_sub_indices.append(len(ordered_subtopics_by_topic[seq]))
                    ordered_subtopics_by_topic[seq].append(None)

        if subtopics_create_data:
            ser = LessonPlanSubtopicWriteSerializer(data=subtopics_create_data, many=True)
            ser.is_valid(raise_exception=True)
            created_subtopics = ser.save()
            for j, topic_idx in enumerate(subtopic_create_topic_indices):
                sub_idx = subtopic_create_sub_indices[j]
                ordered_subtopics_by_topic[topic_idx][sub_idx] = created_subtopics[j]

        details_create_data = []
        subtopic_keep_detail_ids = {}

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            subtopics_data = t_data.get('subtopics')
            if not isinstance(subtopics_data, list):
                subtopics_data = []
            for s_seq, s_data in enumerate(subtopics_data):
                if not isinstance(s_data, dict):
                    continue
                subtopic_list = ordered_subtopics_by_topic[seq] if seq < len(ordered_subtopics_by_topic) else []
                if s_seq >= len(subtopic_list):
                    continue
                subtopic = subtopic_list[s_seq]
                if subtopic is None:
                    continue
                details_list = s_data.get('subtopic_details')
                if not isinstance(details_list, list):
                    details_list = []
                if subtopic.id not in subtopic_keep_detail_ids:
                    subtopic_keep_detail_ids[subtopic.id] = []
                for d in details_list:
                    if not isinstance(d, dict):
                        continue
                    name_val = (d.get('name') or '') or ''
                    objectives_val = (d.get('objectives') or '') or ''
                    activities_val = (d.get('activities') or '') or ''
                    resource_val = (d.get('resource') or '') or ''
                    assessment_val = (d.get('assessment') or '') or ''
                    detail_id = d.get('id')
                    if detail_id is not None:
                        try:
                            detail_id = int(detail_id)
                        except (TypeError, ValueError):
                            detail_id = None
                    if detail_id and LessonPlanSubtopicDetail.objects.filter(id=detail_id, subtopic=subtopic).exists():
                        detail_obj = LessonPlanSubtopicDetail.objects.get(id=detail_id)
                        detail_obj.name = name_val
                        detail_obj.objectives = objectives_val
                        detail_obj.activities = activities_val
                        detail_obj.resource = resource_val
                        detail_obj.assessment = assessment_val
                        detail_obj.save()
                        subtopic_keep_detail_ids[subtopic.id].append(detail_obj.id)
                    else:
                        details_create_data.append({
                            'subtopic': subtopic.id,
                            'name': name_val,
                            'objectives': objectives_val,
                            'activities': activities_val,
                            'resource': resource_val,
                            'assessment': assessment_val,
                        })

        if details_create_data:
            ser = LessonPlanSubtopicDetailWriteSerializer(data=details_create_data, many=True)
            ser.is_valid(raise_exception=True)
            created_details = ser.save()
            for i, d in enumerate(details_create_data):
                sid = d['subtopic']
                if sid not in subtopic_keep_detail_ids:
                    subtopic_keep_detail_ids[sid] = []
                if i < len(created_details):
                    subtopic_keep_detail_ids[sid].append(created_details[i].id)

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic = ordered_topics[seq] if seq < len(ordered_topics) else None
            if topic is None:
                continue
            subtopic_list = ordered_subtopics_by_topic[seq] if seq < len(ordered_subtopics_by_topic) else []
            seen_subtopic_ids = {s.id for s in subtopic_list if s is not None}
            for subtopic in subtopic_list:
                if subtopic is None:
                    continue
                keep_ids = subtopic_keep_detail_ids.get(subtopic.id, [])
                LessonPlanSubtopicDetail.objects.filter(subtopic=subtopic).exclude(id__in=keep_ids).delete()
            LessonPlanSubtopic.objects.filter(topic=topic).exclude(id__in=seen_subtopic_ids).delete()

        LessonPlanTopic.objects.filter(lesson_plan_template=template).exclude(id__in=seen_topic_ids).delete()

    return {'Reason': 'Lesson plan template saved successfully.', 'data': {'id': template.id}}


def _parse_int(val, default=None):
    if val is None or val == '':
        return default
    try:
        return int(val)
    except (TypeError, ValueError):
        return default


def _parse_date(val):
    if val is None or val == '':
        return None
    if isinstance(val, (datetime, date)):
        return val.date() if isinstance(val, datetime) else val
    s = str(val).strip()
    if not s:
        return None
    # Use first 10 chars for YYYY-MM-DD when string is longer (e.g. ISO datetime)
    date_part = s[:10] if len(s) >= 10 else s
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.strptime(date_part, fmt).date()
        except (TypeError, ValueError):
            continue
    return None


def create_or_update_lesson_plan_template_academic_year(self, data):
    """
    Create or update lesson plan for an academic year.
    Uses frontend keys: academic_year, subject, standard_section, lesson_plan_template,
    topics_data, id. Each topic: id, name/topic_name, sequence, subtopics.
    Each subtopic: id, name, sequence, subtopic_details.
    Each subtopic_detail: id, name, objectives, activities, resource, assessment,
        allocated_from_date, allocated_to_date, allocated_to_user, completion_date.
    """
    academic_year_id = _parse_int(data.get('academic_year'))
    if not academic_year_id:
        raise exceptions.ValidationError('academic_year is required')

    lp_acad_id = _parse_int(data.get('id'))
    subject_id = _parse_int(data.get('subject'))
    standard_section_id = _parse_int(data.get('standard_section'))
    lesson_plan_template_id = _parse_int(data.get('lesson_plan_template'))

    topics_data = data.get('topics_data')
    if not isinstance(topics_data, list):
        topics_data = []

    root_data = {
        'academic_year': academic_year_id,
        'subject': subject_id,
        'standard_section': standard_section_id,
        'lesson_plan_template': lesson_plan_template_id,
    }

    with transaction.atomic(using=get_current_db_name()):
        if lp_acad_id:
            try:
                lp_acad = LessonPlanAcademicYear.objects.get(id=lp_acad_id)
            except LessonPlanAcademicYear.DoesNotExist:
                raise exceptions.ValidationError('Lesson plan academic year not found.')
            root_ser = LessonPlanAcademicYearSerializer(lp_acad, data=root_data, partial=True)
        else:
            root_ser = LessonPlanAcademicYearSerializer(data=root_data)
        root_ser.is_valid(raise_exception=True)
        lp_acad = root_ser.save()

        ordered_topics = [None] * len(topics_data)

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic_name = (t_data.get('name') or t_data.get('topic_name') or '').strip()
            if not topic_name:
                continue
            topic_id = _parse_int(t_data.get('id'))
            topic_data = {
                'lesson_plan_academic_year': lp_acad.id,
                'name': topic_name,
                'sequence': t_data.get('sequence', seq),
            }
            if topic_id and LessonPlanTopicAcademicYear.objects.filter(id=topic_id, lesson_plan_academic_year=lp_acad).exists():
                topic = LessonPlanTopicAcademicYear.objects.get(id=topic_id)
                topic_ser = LessonPlanTopicAcademicYearSerializer(topic, data=topic_data, partial=True)
            else:
                topic_ser = LessonPlanTopicAcademicYearSerializer(data=topic_data)
            topic_ser.is_valid(raise_exception=True)
            topic = topic_ser.save()
            ordered_topics[seq] = topic

        seen_topic_ids = {t.id for t in ordered_topics if t is not None}
        ordered_subtopics_by_topic = [[] for _ in topics_data]

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic = ordered_topics[seq] if seq < len(ordered_topics) else None
            if topic is None:
                continue
            subtopics_data = t_data.get('subtopics') or []
            for s_seq, s_data in enumerate(subtopics_data):
                if not isinstance(s_data, dict):
                    continue
                subtopic_name = (s_data.get('name') or '').strip()
                if not subtopic_name:
                    continue
                subtopic_id = _parse_int(s_data.get('id'))
                subtopic_data = {
                    'lesson_plan_topic_academic_year': topic.id,
                    'name': subtopic_name,
                    'sequence': s_data.get('sequence', s_seq),
                }
                if subtopic_id and LessonPlanSubtopicAcademicYear.objects.filter(
                    id=subtopic_id, lesson_plan_topic_academic_year=topic
                ).exists():
                    subtopic = LessonPlanSubtopicAcademicYear.objects.get(id=subtopic_id)
                    subtopic_ser = LessonPlanSubtopicAcademicYearSerializer(subtopic, data=subtopic_data, partial=True)
                else:
                    subtopic_ser = LessonPlanSubtopicAcademicYearSerializer(data=subtopic_data)
                subtopic_ser.is_valid(raise_exception=True)
                subtopic = subtopic_ser.save()
                ordered_subtopics_by_topic[seq].append((s_seq, subtopic))

        subtopic_keep_detail_ids = {}

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            subtopics_data = t_data.get('subtopics') or []
            for s_seq, s_data in enumerate(subtopics_data):
                if not isinstance(s_data, dict):
                    continue
                subtopic_list = ordered_subtopics_by_topic[seq] if seq < len(ordered_subtopics_by_topic) else []
                if s_seq >= len(subtopic_list):
                    continue
                _, subtopic = subtopic_list[s_seq]
                details_list = s_data.get('subtopic_details') or []
                if subtopic.id not in subtopic_keep_detail_ids:
                    subtopic_keep_detail_ids[subtopic.id] = []

                for d in details_list:
                    if not isinstance(d, dict):
                        continue
                    # Support allocated_date (single) or allocated_from_date / allocated_to_date
                    allocated_from = _parse_date(
                        d.get('allocated_from_date') or d.get('allocated_from') or d.get('allocated_date')
                    )
                    allocated_to = _parse_date(
                        d.get('allocated_to_date') or d.get('allocated_to') or d.get('allocated_date')
                    )
                    allocated_to_user_provided = ('allocated_to_user' in d) or ('allocated_to_user_id' in d)
                    allocated_to_user = None
                    if allocated_to_user_provided:
                        allocated_to_user = _parse_int(d.get('allocated_to_user') or d.get('allocated_to_user_id'))
                    detail_data = {
                        'lesson_plan_subtopic_academic_year': subtopic.id,
                        'name': d.get('name') or '',
                        'objectives': d.get('objectives') or '',
                        'activities': d.get('activities') or '',
                        'resource': d.get('resource') or '',
                        'assessment': d.get('assessment') or '',
                        'allocated_from_date': allocated_from,
                        'allocated_to_date': allocated_to,
                        'completion_date': _parse_date(d.get('completion_date')),
                    }
                    # If this is a manual save from the UI, mark it as edited.
                    # If it's an AI sync or restore, preserve the value if provided in the payload.
                    if not data.get('_is_ai_sync'):
                        detail_data['is_manually_edited'] = True
                    elif 'is_manually_edited' in d:
                        detail_data['is_manually_edited'] = d['is_manually_edited']

                    if 'last_ai_synced_at' in d:
                        detail_data['last_ai_synced_at'] = d['last_ai_synced_at']

                    if allocated_to_user_provided:
                        detail_data['allocated_to_user'] = allocated_to_user
                    detail_id = _parse_int(d.get('id'))
                    if detail_id and LessonPlanSubtopicDetailAcademicYear.objects.filter(
                        id=detail_id, lesson_plan_subtopic_academic_year=subtopic
                    ).exists():
                        detail_obj = LessonPlanSubtopicDetailAcademicYear.objects.get(id=detail_id)
                        detail_ser = LessonPlanSubtopicDetailAcademicYearSerializer(detail_obj, data=detail_data, partial=True)
                    else:
                        detail_ser = LessonPlanSubtopicDetailAcademicYearSerializer(data=detail_data)
                    detail_ser.is_valid(raise_exception=True)
                    detail_obj = detail_ser.save()
                    subtopic_keep_detail_ids[subtopic.id].append(detail_obj.id)

        for seq, t_data in enumerate(topics_data):
            if not isinstance(t_data, dict):
                continue
            topic = ordered_topics[seq] if seq < len(ordered_topics) else None
            if topic is None:
                continue
            subtopic_list = [st for _, st in ordered_subtopics_by_topic[seq]]
            seen_subtopic_ids = {s.id for s in subtopic_list}

            for subtopic in subtopic_list:
                keep_ids = subtopic_keep_detail_ids.get(subtopic.id, [])
                LessonPlanSubtopicDetailAcademicYear.objects.filter(
                    lesson_plan_subtopic_academic_year=subtopic
                ).exclude(id__in=keep_ids).delete()
            LessonPlanSubtopicAcademicYear.objects.filter(
                lesson_plan_topic_academic_year=topic
            ).exclude(id__in=seen_subtopic_ids).delete()

        LessonPlanTopicAcademicYear.objects.filter(
            lesson_plan_academic_year=lp_acad
        ).exclude(id__in=seen_topic_ids).delete()

    return {'Reason': 'Lesson plan academic year saved successfully.', 'data': {'id': lp_acad.id}}


def _ensure_staff_mapped_to_subject(request, standard_section_id, subject_id, academic_year_id):
    """Raise ValidationError if the request user's staff is not mapped to this subject in StaffHourSubjectMapping."""
    if getattr(request.user, 'is_superuser', False):
        return
    if not getattr(request, 'user', None) or not getattr(request.user, 'staff', None):
        raise exceptions.ValidationError('User must be a staff member.')
    staff = request.user.staff
    qs = StaffHourSubjectMapping.objects.filter(
        staff_teaching_hour__staff=staff,
        staff_teaching_hour__academic_year_id=academic_year_id,
        subject_id=subject_id,
    ).filter(
        Q(standard_section_id=standard_section_id) | Q(standard_section_id__isnull=True)
    )
    if not qs.exists():
        raise exceptions.ValidationError(
            'You are not mapped to this subject and standard-section in staff teaching hours.'
        )


def _classify_detail_for_date(detail, yesterday, today, tomorrow):
    """
    Classify a detail into 'pending', 'today', or 'tomorrow'.
    - Yesterday's task (pending): allocated_to_date is a day less than today (to_date == yesterday).
    - Today's task: allocated_from_date <= today AND allocated_to_date >= today (range includes today).
      If to_date < today then it is NOT today's task (it ended before today).
    - Tomorrow's task: allocated_from_date <= tomorrow AND (to_date is None or to_date >= tomorrow).
    """
    from_date = getattr(detail, 'allocated_from_date', None)
    to_date = getattr(detail, 'allocated_to_date', None)
    if not from_date:
        return None
    # Yesterday's task: allocated_to_date is a day less than today (ended yesterday)
    if to_date is not None and to_date == yesterday:
        return 'pending'
    # Overdue: ended before today and not completed → pending
    completion = getattr(detail, 'completion_date', None)
    if to_date is not None and to_date < today and not completion:
        return 'pending'
    # Today's task: from_date <= today AND (to_date is None or to_date >= today)
    if from_date <= today and (to_date is None or to_date >= today):
        return 'today'
    # Tomorrow's task: from_date <= tomorrow AND (to_date is None or to_date >= tomorrow)
    if from_date <= tomorrow and (to_date is None or to_date >= tomorrow):
        return 'tomorrow'
    return None


def get_lesson_plan_status_details(request):
    """
    GET lesson plan status for standard_section, subject, optional fordate.
    Params: standard_section, subject, academic_year, fordate (optional, YYYY-MM-DD).
    If fordate: return data with pending_tasks, todays_tasks, tomorrows_tasks (each list of tasks with detail + topic/subtopic).
    Else: return all topics and subtopics with details (full tree).
    """

    standard_section_id = _parse_int(request.GET.get('standard_section'))
    subject_id = _parse_int(request.GET.get('subject'))
    academic_year_id = _parse_int(request.GET.get('academic_year'))
    fordate_str = request.GET.get('fordate') or request.GET.get('for_date')
    current_user_id = getattr(getattr(request, 'user', None), 'id', None)

    if not standard_section_id or not subject_id or not academic_year_id:
        raise exceptions.ValidationError('standard_section, subject, and academic_year are required.')

    lp_acad = LessonPlanAcademicYear.objects.filter(
        standard_section_id=standard_section_id,
        subject_id=subject_id,
        academic_year_id=academic_year_id,
        is_active=True,
        lesson_plan_topic_academic_year_lesson_plan_academic_year__lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year__lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year__allocated_to_user_id=current_user_id,
    ).prefetch_related(
        'lesson_plan_topic_academic_year_lesson_plan_academic_year__lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year__lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year__lesson_plan_subtopic_detail_review_detail',
    ).distinct().first()

    if not lp_acad:
        return {'data': None, 'Reason': 'No lesson plan allocation found for this standard-section and subject.'}

    fordate = _parse_date(fordate_str) if fordate_str else None

    if fordate:
        # Return pending_tasks, todays_tasks, tomorrows_tasks
        yesterday = fordate - timedelta(days=1)
        tomorrow = fordate + timedelta(days=1)
        pending_tasks = []
        todays_tasks = []
        tomorrows_tasks = []

        detail_serializer = LessonPlanSubtopicDetailStatusSerializer()
        topics_qs = getattr(lp_acad, 'lesson_plan_topic_academic_year_lesson_plan_academic_year', None)
        if topics_qs:
            for topic in topics_qs.order_by('sequence', 'id'):
                subtopics_qs = getattr(topic, 'lesson_plan_subtopic_academic_year_lesson_plan_topic_academic_year', None)
                if not subtopics_qs:
                    continue
                for subtopic in subtopics_qs.order_by('sequence', 'id'):
                    details_qs = getattr(subtopic, 'lesson_plan_subtopic_detail_academic_year_lesson_plan_subtopic_academic_year', None)
                    if not details_qs:
                        continue
                    for detail in details_qs.order_by('id'):
                        # Show only tasks allocated to the logged-in user.
                        if getattr(detail, 'allocated_to_user_id', None) != current_user_id:
                            continue
                        bucket = _classify_detail_for_date(detail, yesterday, fordate, tomorrow)
                        if bucket is None:
                            continue
                        detail_data = detail_serializer.to_representation(detail)
                        task = {
                            'topic_id': topic.id,
                            'topic_name': topic.name,
                            'topic_sequence': topic.sequence,
                            'subtopic_id': subtopic.id,
                            'subtopic_name': subtopic.name,
                            'subtopic_sequence': subtopic.sequence,
                            'detail': detail_data,
                        }
                        if bucket == 'pending':
                            pending_tasks.append(task)
                        elif bucket == 'today':
                            todays_tasks.append(task)
                        else:
                            tomorrows_tasks.append(task)
        lesson_plan_summary = {
            'id': lp_acad.id,
            'academic_year': AcademicYearSerializer(lp_acad.academic_year).data if lp_acad.academic_year_id else None,
            'subject': SubjectSerializer(lp_acad.subject).data if lp_acad.subject_id else None,
            'standard_section': StandardSectionMappingSerializer(lp_acad.standard_section).data if lp_acad.standard_section_id else None,
            'lesson_plan_template': LessonPlanTemplateSerializer(lp_acad.lesson_plan_template).data if lp_acad.lesson_plan_template_id else None,
        }
        return {
            'data': {
                'lesson_plan': lesson_plan_summary,
                'pending_tasks': pending_tasks,
                'todays_tasks': todays_tasks,
                'tomorrows_tasks': tomorrows_tasks,
            },
        }

    # No fordate: return full tree filtered to logged-in user's allocations.
    serializer = LessonPlanStatusReadSerializer(lp_acad)
    data = serializer.data
    filtered_topics = []
    for topic in data.get('topics', []):
        filtered_subtopics = []
        for subtopic in topic.get('subtopics', []):
            filtered_details = [
                detail for detail in subtopic.get('subtopic_details', [])
                if detail.get('allocated_to_user') == current_user_id
            ]
            if filtered_details:
                subtopic['subtopic_details'] = filtered_details
                filtered_subtopics.append(subtopic)
        if filtered_subtopics:
            topic['subtopics'] = filtered_subtopics
            filtered_topics.append(topic)
    data['topics'] = filtered_topics
    return {'data': data}


def _filter_detail_for_allocation(queryset, standard_section_id, subject_id, academic_year_id):
    """Filter LessonPlanSubtopicDetailAcademicYear queryset by allocation."""
    return queryset.filter(
        lesson_plan_subtopic_academic_year__lesson_plan_topic_academic_year__lesson_plan_academic_year__standard_section_id=standard_section_id,
        lesson_plan_subtopic_academic_year__lesson_plan_topic_academic_year__lesson_plan_academic_year__subject_id=subject_id,
        lesson_plan_subtopic_academic_year__lesson_plan_topic_academic_year__lesson_plan_academic_year__academic_year_id=academic_year_id,
    )


def update_lesson_plan_status(request, data):
    """
    Update lesson plan status. Validates user is mapped in StaffHourSubjectMapping.
    Body: standard_section, subject, academic_year (required);
          subtasks: list of { id, comment, completed_date };
          id = subtopic detail id; comment = text area (optional, multi-line); completed_date optional.
    """

    standard_section_id = _parse_int(data.get('standard_section'))
    subject_id = _parse_int(data.get('subject'))
    academic_year_id = _parse_int(data.get('academic_year'))

    if not standard_section_id or not subject_id or not academic_year_id:
        raise exceptions.ValidationError('standard_section, subject, and academic_year are required.')

    _ensure_staff_mapped_to_subject(request, standard_section_id, subject_id, academic_year_id)

    # List of subtasks: subtopic_detail_id = detail id, id = review id (when editing that review), comment, completed_date
    subtasks = data.get('subtasks') or data.get('subtask_list') or data.get('sub_task_list')
    if isinstance(subtasks, list) and len(subtasks) > 0:
        updated = []
        for item in subtasks:
            if not isinstance(item, dict):
                continue
            detail_id = _parse_int(item.get('subtopic_detail_id') or item.get('subtopic_detail'))
            if not detail_id:
                continue
            detail = _filter_detail_for_allocation(
                LessonPlanSubtopicDetailAcademicYear.objects.filter(id=detail_id),
                standard_section_id, subject_id, academic_year_id,
            ).first()
            if not detail:
                raise exceptions.ValidationError(
                    f'Subtopic detail id {detail_id} not found or does not belong to this allocation.'
                )
            completed_date = _parse_date(item.get('completed_date') or item.get('completion_date'))
            # Update detail using serializer (edit existing row; pass completion_date even if null to allow clearing)
            if 'completed_date' in item or 'completion_date' in item:
                detail_data = {'completion_date': completed_date}
                detail_ser = LessonPlanSubtopicDetailAcademicYearSerializer(detail, data=detail_data, partial=True)
                detail_ser.is_valid(raise_exception=True)
                detail = detail_ser.save()
            comment = (item.get('comment') or item.get('message') or '').strip()
            if comment:
                review_date = completed_date or getattr(detail, 'completion_date', None)
                # id in item = review id (edit that specific review); else update/create the one for this detail
                review_id = _parse_int(item.get('id'))
                if review_id:
                    existing_review = LessonPlanSubtopicDetailReview.objects.filter(
                        id=review_id,
                        lesson_plan_subtopic_detail_academic_year=detail,
                    ).first()
                else:
                    existing_review = LessonPlanSubtopicDetailReview.objects.filter(
                        lesson_plan_subtopic_detail_academic_year=detail,
                    ).order_by('-id').first()
                if existing_review:
                    # Edit existing review (no new row)
                    review_ser = LessonPlanSubtopicDetailReviewWriteSerializer(
                        existing_review,
                        data={'message': comment, 'date': review_date},
                        partial=True,
                    )
                    review_ser.is_valid(raise_exception=True)
                    review_ser.save()
                else:
                    # First comment for this detail: create once
                    review_ser = LessonPlanSubtopicDetailReviewWriteSerializer(
                        data={
                            'lesson_plan_subtopic_detail_academic_year': detail.id,
                            'message': comment,
                            'date': review_date,
                            'created_by': request.user.id,
                        },
                    )
                    review_ser.is_valid(raise_exception=True)
                    review_ser.save()
            updated.append({
                'id': detail.id,
                'completed_date': getattr(detail, 'completion_date', None),
                'comment_updated': bool(comment),
            })
        return {'Reason': 'Lesson plan status updated.', 'data': {'updated': updated}}

    # Single detail: subtopic_detail_id + completion_date (update via serializer)
    detail_id = _parse_int(data.get('subtopic_detail_id'))
    if detail_id:
        detail = _filter_detail_for_allocation(
            LessonPlanSubtopicDetailAcademicYear.objects.filter(id=detail_id),
            standard_section_id, subject_id, academic_year_id,
        ).first()
        if not detail:
            raise exceptions.ValidationError('Subtopic detail not found or does not belong to this allocation.')
        completion_date = _parse_date(data.get('completion_date'))
        detail_ser = LessonPlanSubtopicDetailAcademicYearSerializer(
            detail, data={'completion_date': completion_date}, partial=True,
        )
        detail_ser.is_valid(raise_exception=True)
        detail = detail_ser.save()
        return {'Reason': 'Lesson plan status updated.', 'data': {'id': detail.id, 'completion_date': detail.completion_date}}

    # Add a review/comment (create via serializer)
    review_detail_id = _parse_int(data.get('lesson_plan_subtopic_detail_academic_year'))
    if review_detail_id:
        detail = _filter_detail_for_allocation(
            LessonPlanSubtopicDetailAcademicYear.objects.filter(id=review_detail_id),
            standard_section_id, subject_id, academic_year_id,
        ).first()
        if not detail:
            raise exceptions.ValidationError('Subtopic detail not found or does not belong to this allocation.')
        message = (data.get('message') or '').strip()
        if not message:
            raise exceptions.ValidationError('message is required for adding a comment.')
        review_ser = LessonPlanSubtopicDetailReviewWriteSerializer(
            data={
                'lesson_plan_subtopic_detail_academic_year': detail.id,
                'message': message,
                'date': _parse_date(data.get('date')),
                'created_by': request.user.id,
            },
        )
        review_ser.is_valid(raise_exception=True)
        review = review_ser.save()
        return {'Reason': 'Comment added.', 'data': {'id': review.id}}

    raise exceptions.ValidationError(
        'Provide subtasks (list of { subtopic_detail_id, comment, completed_date }; id = review id when editing that review), '
        'or single subtopic_detail_id with completion_date, '
        'or lesson_plan_subtopic_detail_academic_year with message.'
    )


def get_staff_lesson_plan_dashboard(request):
    """
    Dashboard API for staff: returns lesson plan summary per (subject, standard_section)
    the staff is mapped to, based on selected date/date-range.
    Counts: total_subtopics_allocated, completed, pending.
    Query params:
      - academic_year (optional)
      - subject (optional filter)
      - standard_section (optional filter)
      - date (optional, single date filter)
      - from_date + to_date (optional range filter; if provided, date is ignored)
    Response includes:
      - dashboard_totals (overall selected period totals)
      - dashboard_list (subject/standard_section-wise totals)
      - graph_data (ready-to-render chart data)
      - dropdown options
    """
    from django.db.models import Q
    from apps.hr.models import StaffHourSubjectMapping
    from apps.institutes.models.academicYear import AcademicYear
    from urllib.parse import urlencode

    if not getattr(request, 'user', None) or not getattr(request.user, 'staff', None):
        raise exceptions.ValidationError('User must be a staff member.')
    staff = request.user.staff

    academic_year_id = _parse_int(request.GET.get('academic_year'))
    if not academic_year_id:
        today_ay = date.today()
        ay = AcademicYear.objects.filter(
            is_active=True,
            start_date__lte=today_ay,
            end_date__gte=today_ay,
        ).order_by('-start_date').first()
        academic_year_id = ay.id if ay else None
    if not academic_year_id:
        return {
            'dashboard_list': [],
            'subject_options': [],
            'standard_section_options': [],
            'academic_year': None,
            'Reason': 'No academic year found.',
        }

    filter_subject_id = _parse_int(request.GET.get('subject'))
    filter_standard_section_id = _parse_int(request.GET.get('standard_section'))
    selected_date = _parse_date(request.GET.get('date'))
    from_date = _parse_date(request.GET.get('from_date'))
    to_date = _parse_date(request.GET.get('to_date'))

    if from_date and to_date and from_date > to_date:
        raise exceptions.ValidationError('from_date cannot be greater than to_date.')

    # Date selection precedence:
    # 1) from_date + to_date (range)
    # 2) date (single day)
    # 3) default to today
    filter_mode = 'single_date'
    if from_date and to_date:
        filter_mode = 'date_range'
        period_start = from_date
        period_end = to_date
    else:
        selected_date = selected_date or date.today()
        period_start = selected_date
        period_end = selected_date

    # Staff mappings: (subject_id, standard_section_id) for this academic year
    mappings = StaffHourSubjectMapping.objects.filter(
        staff_teaching_hour__staff=staff,
        staff_teaching_hour__academic_year_id=academic_year_id,
    ).select_related('subject', 'standard_section').order_by('subject__name')

    if filter_subject_id:
        mappings = mappings.filter(subject_id=filter_subject_id)
    if filter_standard_section_id:
        mappings = mappings.filter(
            Q(standard_section_id=filter_standard_section_id) | Q(standard_section_id__isnull=True)
        )

    # Collect distinct (subject_id, standard_section_id). If standard_section is null, we need all sections for that subject.
    seen = set()
    pairs = []
    for m in mappings:
        key = (m.subject_id, m.standard_section_id)
        if key in seen:
            continue
        seen.add(key)
        pairs.append((m.subject_id, m.standard_section_id, m.subject, m.standard_section))

    dashboard_list = []
    total_allocated_overall = 0
    total_completed_overall = 0

    for subject_id, ss_id, subject_obj, ss_obj in pairs:
        if ss_id is not None:
            lp_acad_qs = LessonPlanAcademicYear.objects.filter(
                academic_year_id=academic_year_id,
                subject_id=subject_id,
                standard_section_id=ss_id,
                is_active=True,
            )
        else:
            lp_acad_qs = LessonPlanAcademicYear.objects.filter(
                academic_year_id=academic_year_id,
                subject_id=subject_id,
                is_active=True,
            )

        if filter_standard_section_id and ss_id is None:
            lp_acad_qs = lp_acad_qs.filter(standard_section_id=filter_standard_section_id)

        for lp_acad in lp_acad_qs.select_related('subject', 'standard_section', 'academic_year'):
            detail_base = LessonPlanSubtopicDetailAcademicYear.objects.filter(
                lesson_plan_subtopic_academic_year__lesson_plan_topic_academic_year__lesson_plan_academic_year=lp_acad
            )

            # Selected-period allocation filter:
            # - date range: detail allocation window overlaps selected range
            # - single date: selected day must lie within allocation window
            if filter_mode == 'date_range':
                detail_base = detail_base.filter(
                    Q(
                        allocated_from_date__lte=period_end,
                    ) & (
                        Q(allocated_to_date__isnull=True) | Q(allocated_to_date__gte=period_start)
                    )
                    |
                    Q(completion_date__gte=period_start, completion_date__lte=period_end)
                )
            else:
                detail_base = detail_base.filter(
                    Q(
                        allocated_from_date__lte=period_start
                    ) & (
                        Q(allocated_to_date__isnull=True) | Q(allocated_to_date__gte=period_start)
                    )
                    |
                    Q(completion_date=period_start)
                )

            total_subtopics_allocated = detail_base.count()
            total_subtopics_completed = detail_base.filter(completion_date__isnull=False).count()
            total_subtopics_pending = total_subtopics_allocated - total_subtopics_completed

            total_allocated_overall += total_subtopics_allocated
            total_completed_overall += total_subtopics_completed

            update_query = {
                'academic_year': academic_year_id,
                'subject': lp_acad.subject_id,
                'standard_section': lp_acad.standard_section_id,
            }
            if filter_mode == 'date_range':
                update_query['from_date'] = period_start.isoformat()
                update_query['to_date'] = period_end.isoformat()
            else:
                update_query['date'] = period_start.isoformat()
            update_query_string = urlencode(update_query)

            dashboard_list.append({
                'lesson_plan_academic_year_id': lp_acad.id,
                'subject': SubjectSerializer(lp_acad.subject).data if lp_acad.subject_id else None,
                'standard_section': StandardSectionMappingSerializer(lp_acad.standard_section).data if lp_acad.standard_section_id else None,
                'academic_year': AcademicYearSerializer(lp_acad.academic_year).data if lp_acad.academic_year_id else None,
                'total_subtopics_allocated': total_subtopics_allocated,
                'total_subtopics_completed': total_subtopics_completed,
                'total_subtopics_pending': total_subtopics_pending,
                # Kept for backward compatibility with old UI keys.
                'total_syllabus': total_subtopics_allocated,
                'completed': total_subtopics_completed,
                'pending_syllabus': total_subtopics_pending,
                # Kept for compatibility with existing dashboard UI widgets.
                'todays_assigned_tasks': total_subtopics_allocated,
                # Frontend can use this to redirect to update status page.
                'update_action': {
                    'label': 'Update',
                    'api_query': update_query,
                    'api_url': f'/classes/updatelessonplanningstatus/?{update_query_string}',
                    'ui_path': f'/lesson-plan/update-status?{update_query_string}',
                },
            })

    # Dropdown options: distinct subjects and standard_sections from mappings (or from all staff mappings for this AY)
    all_mappings = StaffHourSubjectMapping.objects.filter(
        staff_teaching_hour__staff=staff,
        staff_teaching_hour__academic_year_id=academic_year_id,
    ).select_related('subject', 'standard_section')
    subject_ids = all_mappings.values_list('subject_id', flat=True).distinct()
    ss_ids = all_mappings.exclude(standard_section_id__isnull=True).values_list('standard_section_id', flat=True).distinct()
    from apps.classes.models.standard import StandardSectionMapping
    from apps.classes.models.subject import Subject
    subject_options = SubjectSerializer(Subject.objects.filter(id__in=subject_ids).order_by('name'), many=True).data
    standard_section_options = StandardSectionMappingSerializer(
        StandardSectionMapping.objects.filter(id__in=ss_ids).select_related('standard', 'section').order_by('standard__sequence', 'section__name'),
        many=True,
    ).data

    ay_obj = AcademicYear.objects.filter(id=academic_year_id).first()
    total_pending_overall = total_allocated_overall - total_completed_overall

    def _safe_get_name(obj):
        if isinstance(obj, dict):
            return obj.get('name')
        return None

    def _safe_standard_section_name(ss_obj):
        if not isinstance(ss_obj, dict):
            return None
        standard_obj = ss_obj.get('standard')
        section_obj = ss_obj.get('section')
        standard_name = standard_obj.get('name') if isinstance(standard_obj, dict) else ''
        section_name = section_obj.get('name') if isinstance(section_obj, dict) else ''
        value = '{} - {}'.format(standard_name, section_name).strip(' -')
        return value or None

    graph_data = {
        # Suitable for donut/pie chart
        'overall_distribution': [
            {'label': 'Allocated', 'value': total_allocated_overall},
            {'label': 'Completed', 'value': total_completed_overall},
            {'label': 'Pending', 'value': total_pending_overall},
        ],
        # Suitable for grouped bar chart per row
        'row_wise_distribution': [
            {
                'lesson_plan_academic_year_id': row.get('lesson_plan_academic_year_id'),
                'subject_name': _safe_get_name(row.get('subject')),
                'standard_section_name': _safe_standard_section_name(row.get('standard_section')),
                'allocated': row.get('total_subtopics_allocated', 0),
                'completed': row.get('total_subtopics_completed', 0),
                'pending': row.get('total_subtopics_pending', 0),
            }
            for row in dashboard_list
        ],
    }
    return {
        'dashboard_totals': {
            'total_subtopics_allocated': total_allocated_overall,
            'total_subtopics_completed': total_completed_overall,
            'total_subtopics_pending': total_pending_overall,
        },
        'dashboard_list': dashboard_list,
        'graph_data': graph_data,
        'subject_options': subject_options,
        'standard_section_options': standard_section_options,
        'academic_year': AcademicYearSerializer(ay_obj).data if ay_obj else None,
        'selected_filter': {
            'mode': filter_mode,
            'date': period_start.isoformat() if filter_mode == 'single_date' else None,
            'from_date': period_start.isoformat() if filter_mode == 'date_range' else None,
            'to_date': period_end.isoformat() if filter_mode == 'date_range' else None,
        },
    }
