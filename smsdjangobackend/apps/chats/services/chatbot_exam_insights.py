"""
Exam-related factual answers for the assistant: class ranks, exam disambiguation.
"""
import re
from typing import Dict, List, Optional, Tuple

from django.db.models import Sum

from apps.chats.services.chatbot_service import ChatbotService
from apps.chats.services.chatbot_student_facts import _student_display_name, _visible_students_qs
from apps.exams.models.exam import Exam
from apps.exams.models.marks import StudentMark
from apps.students.models.student import Student


def _can_view_marks_facts(user) -> bool:
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    return bool(
        ChatbotService.check_permission_for_basename(user, 'studentmark', 'GET')
        or ChatbotService.check_permission_for_basename(user, 'exam_result', 'GET')
    )


def _parse_ay_id(academic_year) -> Optional[int]:
    if academic_year is None or academic_year == '':
        return None
    try:
        return int(academic_year)
    except (TypeError, ValueError):
        return None


def _wants_class_rank(q: str) -> bool:
    """True for topper / rank / 'who scored more' style questions (need an exam context)."""
    return bool(
        re.search(
            r'('
            r'\brank(ing)?s?\b|\bclass\s*rank\b|\bfirst\s*rank\b|\b1st\s*rank\b|\bsecond\s*rank\b|\b2nd\s*rank\b|'
            r'\btoppers?\b|\btop\s*student\b|'
            r'\bwho\s+(topped|came\s+first|is\s+first|got\s+first|has\s+the\s+highest|has\s+first)\b|'
            r'\bwho\s+scored\s+(the\s+)?(highest|more|higher|maximum|max)\b|'
            r'\bwho\s+scored\s+more\b|\bscored\s+more\s+marks?\b|\bwho\s+scored\s+more\s+marks?\b|'
            r'\bwho\s+(has|got)\s+(the\s+)?most\s+marks?\b|'
            r'\bwho\s+(has|got)\s+(the\s+)?highest\s+marks?\b|'
            r'\bhighest\s*(total\s*)?marks\b|\bbest\s*marks?\b|\btop\s*scorer\b|'
            r'\bwho\s+got\s+rank\s*\d+\b|\bposition\s*\d+\b'
            r')',
            q,
            re.I,
        )
    )


def _extract_exam_hint(q_raw: str) -> Optional[str]:
    """Short token like FA1 / SA2 from natural language."""
    q = q_raw.strip()
    m = re.search(
        r'\b(?:exam|assessment|test)\s+([a-z0-9][a-z0-9\-\s]{0,24})\b',
        q,
        re.I,
    )
    if m:
        return m.group(1).strip()
    m = re.search(r'\b(fa\s*\d+|sa\s*\d+|pt\s*\d+|term\s*\d+)\b', q, re.I)
    if m:
        return re.sub(r'\s+', '', m.group(1).upper())
    m = re.search(r'\b(?:in|for)\s+exam\s+([^\?\.]{2,40})', q, re.I)
    if m:
        return m.group(1).strip()
    return None


def _normalize_hint(s: str) -> str:
    return re.sub(r'[^a-z0-9]', '', (s or '').lower())


def _exam_matches_hint(exam: Exam, hint: str) -> bool:
    if not hint:
        return False
    hn = _normalize_hint(hint)
    if not hn:
        return False
    et = getattr(exam, 'exam_type', None)
    if et:
        for field in (et.name, et.code or ''):
            if not field:
                continue
            fn = _normalize_hint(field)
            if hn == fn or hn in fn or fn in hn:
                return True
            if hn in _normalize_hint(field):
                return True
    if exam.description and hn in _normalize_hint(exam.description):
        return True
    return False


def _exam_option_label(exam: Exam) -> str:
    parts: List[str] = []
    if exam.exam_type_id and exam.exam_type:
        parts.append(exam.exam_type.name or '')
    if exam.term_id and exam.term:
        alias = getattr(exam.term, 'alias_name', None) or ''
        parts.append(exam.term.name or alias)
    if exam.from_date:
        parts.append(exam.from_date.strftime('%Y-%m-%d'))
    label = ' · '.join(p for p in parts if p)
    return label or f"Exam id {exam.id}"


def _list_exams_for_year(academic_year_id: int, hint: Optional[str] = None) -> List[Exam]:
    qs = list(
        Exam.objects.filter(is_active=True, academic_year_id=academic_year_id)
        .select_related('exam_type', 'term')
        .order_by('-from_date', '-id')[:80]
    )
    if hint:
        return [e for e in qs if _exam_matches_hint(e, hint)]
    return qs[:24]


def _structured_exam_pick(
    options: List[Exam], original_query: str, prompt: str
) -> Tuple[str, Dict]:
    body = prompt + '\n\n' + 'Tap an exam below, or type the exam name more precisely (e.g. **FA1**).'
    structured = {
        'type': 'exam_choice',
        'prompt': prompt,
        'options': [
            {'exam_id': e.id, 'label': _exam_option_label(e)}
            for e in options[:12]
        ],
        'followup_context': {
            'intent': 'class_rank',
            'original_query': original_query,
        },
    }
    return body, structured


def _compute_exam_totals(exam_id: int, visible_student_ids: List[int]) -> List[Tuple[int, float, Student]]:
    rows = (
        StudentMark.objects.filter(
            is_active=True,
            exam_schedule__exam_id=exam_id,
            student_id__in=visible_student_ids,
            marks__isnull=False,
        )
        .values('student_id')
        .annotate(total=Sum('marks'))
        .order_by('-total', 'student_id')
    )
    totals = list(rows)
    if not totals:
        return []
    st_map = {
        s.id: s
        for s in Student.objects.filter(id__in=[r['student_id'] for r in totals]).only(
            'id', 'first_name', 'middle_name', 'last_name', 'current_reg_num'
        )
    }
    out: List[Tuple[int, float, Student]] = []
    for r in totals:
        sid = r['student_id']
        st = st_map.get(sid)
        if st:
            out.append((sid, float(r['total'] or 0), st))
    return out


def _format_rank_answer(exam: Exam, ranked: List[Tuple[int, float, Student]], top_n: int = 8) -> str:
    if not ranked:
        return (
            f"No entered marks were found for **{_exam_option_label(exam)}** among students you can access. "
            'Marks may not be published yet.'
        )
    lines = [
        f"**Totals for {_exam_option_label(exam)}** (sum of entered subject marks):",
        '',
    ]
    prev_total: Optional[float] = None
    rank = 0
    pos = 0
    for sid, total, stu in ranked[:top_n]:
        pos += 1
        if prev_total is None or total < prev_total - 1e-9:
            rank = pos
            prev_total = total
        lines.append(f"{rank}. **{_student_display_name(stu)}** — **{total:g}**")
    if len(ranked) > top_n:
        lines.append(f'… and {len(ranked) - top_n} more students with marks on file.')
    lines.append('')
    lines.append('_Ranks use **competition ranking** (ties share the same rank). Totals follow saved mark rows only._')
    return '\n'.join(lines)


def try_answer_exam_rank_query(
    query: str,
    user,
    academic_year=None,
    exam_id=None,
) -> Optional[Tuple[str, Optional[Dict]]]:
    """
    Class / cohort rank for an exam (total marks across subjects in that exam).

    Returns (message, structured) where structured is set when the user must pick an exam.
    """
    if not user or not user.is_authenticated:
        return None
    if not _wants_class_rank(query):
        return None
    if not _can_view_marks_facts(user):
        return (
            'You **do not have permission** to view exam marks or results. Ask an administrator for '
            '**student marks** or **exam result** view access.',
            None,
        )

    ay_id = _parse_ay_id(academic_year)
    if not ay_id:
        return (
            'Please **select an academic year** in the app header, then ask again so I can find the right exams.',
            None,
        )

    scope = _visible_students_qs(user)
    visible_ids = list(scope.values_list('id', flat=True))
    if not visible_ids:
        return (
            'I could not determine which students your login may access, so I cannot compute ranks.',
            None,
        )

    eid = None
    if exam_id is not None and exam_id != '':
        try:
            eid = int(exam_id)
        except (TypeError, ValueError):
            eid = None

    if eid:
        exam = Exam.objects.filter(id=eid, is_active=True, academic_year_id=ay_id).select_related(
            'exam_type', 'term'
        ).first()
        if not exam:
            return ('That **exam id** is not available for the selected academic year.', None)
        ranked = _compute_exam_totals(exam.id, visible_ids)
        text = _format_rank_answer(exam, ranked)
        return text, None

    hint = _extract_exam_hint(query)
    candidates: List[Exam] = _list_exams_for_year(ay_id, hint=hint) if hint else []

    if not candidates:
        candidates = list(
            Exam.objects.filter(is_active=True, academic_year_id=ay_id)
            .select_related('exam_type', 'term')
            .order_by('-from_date', '-id')[:12]
        )
    if not candidates:
        return ('No **active exams** are on file for this academic year yet.', None)

    if len(candidates) == 1:
        ex = candidates[0]
        ranked = _compute_exam_totals(ex.id, visible_ids)
        return _format_rank_answer(ex, ranked), None

    if hint:
        prompt = (
            f'More than one exam could match **{hint}**, or I need you to pick the exact paper. '
            'Choose one exam for the rank list:'
        )
    else:
        prompt = 'Which **exam** should I use for the rank list? Pick one below (or type e.g. **FA1**):'
    return _structured_exam_pick(candidates, query.strip(), prompt)
