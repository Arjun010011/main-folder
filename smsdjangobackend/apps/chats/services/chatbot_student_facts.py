"""
Answer chatbot questions about concrete student data (marks, attendance) with permission and scope checks.
"""
import re
from typing import List, Optional

from django.db.models import Q

from apps.chats.services.chatbot_service import ChatbotService
from apps.classes.models.attendance import BatchAttendance
from apps.exams.models.marks import StudentMark
from apps.students.models.student import Student


def _student_display_name(stu: Student) -> str:
    parts = [stu.first_name or '', stu.middle_name or '', stu.last_name or '']
    return ' '.join(p for p in parts if p).strip() or f"Student #{stu.id}"


def _visible_students_qs(user):
    """Students the requester may ask about (own child account, or staff standards, or superuser)."""
    qs = Student.objects.filter(is_active=True)
    if not user or not user.is_authenticated:
        return Student.objects.none()
    if user.is_superuser or any(
        g in user.groups.all().values_list('id', flat=True) for g in (1, 2)
    ):
        return qs
    try:
        if getattr(user, 'student_id', None):
            return qs.filter(id=user.student.id)
    except Exception:
        pass
    try:
        from apps.staffs.models.staff_standard import StaffStandardMapping
        std_ids = list(
            StaffStandardMapping.objects.filter(staff=user.staff).values_list('standard', flat=True)
        )
        if std_ids:
            return qs.filter(current_standard_id__in=std_ids)
    except Exception:
        pass
    return Student.objects.none()


def _wants_marks(q: str) -> bool:
    return bool(
        re.search(
            r'\b(marks?|marks?\s*card|report\s*card|score\s*card|grade\s*sheet|'
            r'scores?|grades?|results?|result|performance|exam\s*marks?)\b',
            q,
            re.I,
        )
    )


def _wants_attendance(q: str) -> bool:
    return bool(re.search(r'\b(attendance|attend|present|absent|absence)\b', q, re.I))


def _is_self_reference(q: str) -> bool:
    return bool(
        re.search(
            r"\b(my|me|myself|i\s+have|am\s+i)\b.*\b(marks?|scores?|attendance|results?|grades?)\b",
            q,
            re.I,
        )
        or re.search(
            r"\b(marks?|scores?|attendance|results?|grades?)\b.*\b(my|mine)\b",
            q,
            re.I,
        )
    )


def _looks_like_fact_lookup(raw: str, q_low: str) -> bool:
    """Exclude generic help questions (“what are marks”) from live DB lookup."""
    if _is_self_reference(q_low):
        return True
    if _extract_name_hint(raw):
        return True
    if re.search(
        r"\b(marks?|scores?|grades?|results?|attendance)\s+(for|of)\s+\S",
        raw,
        re.I,
    ):
        return True
    if re.search(
        r"\b(for|of)\s+.+?\s+\b(marks?|scores?|grades?|results?|attendance)\b",
        raw,
        re.I,
    ):
        return True
    return False


def _extract_name_hint(raw: str) -> Optional[str]:
    """Pull a probable student name from natural language."""
    q = raw.strip()
    patterns = [
        r"^(.+?)\s+(?:marks?\s*card|report\s*card|score\s*card|grade\s*sheet)\b",
        r"(?:marks?\s*card|report\s*card|score\s*card|grade\s*sheet)\s+(?:of|for)\s+(.+?)(?:\?|$)",
        r"(?:marks?|scores?|grades?|results?|attendance)\s+(?:of|for)\s+(.+?)(?:\?|$)",
        r"(?:of|for)\s+(.+?)\s+(?:marks?|marks?\s*card|report\s*card|scores?|grades?|results?|attendance)\b",
        r"(?:tell\s+me\s+about|about|show|what\s+(?:is|are))\s+(.+?)(?:\s+marks|\s+attendance|\s+grades|\?|$)",
        r"^(.+?)\s+(?:marks|attendance|scores|grades|results)\b",
    ]
    for pat in patterns:
        m = re.search(pat, q, re.I)
        if m:
            hint = m.group(1).strip()
            hint = re.sub(r"^(the|a|an)\s+", "", hint, flags=re.I).strip()
            if len(hint) >= 2:
                return hint
    return None


def _find_matching_students(name_hint: Optional[str], qs, limit: int = 8) -> List[Student]:
    if name_hint:
        hint = name_hint.strip()
        parts = [p for p in re.split(r"\s+", hint) if len(p) > 1]
        q = Q()
        if parts:
            for p in parts:
                q |= (
                    Q(first_name__icontains=p)
                    | Q(middle_name__icontains=p)
                    | Q(last_name__icontains=p)
                )
            found = list(qs.filter(q).distinct()[:limit])
            if found:
                return found
        return list(
            qs.filter(
                Q(first_name__icontains=hint)
                | Q(middle_name__icontains=hint)
                | Q(last_name__icontains=hint)
                | Q(current_reg_num__iexact=hint)
            ).distinct()[:limit]
        )
    return []


def _format_marks_answer(
    stu: Student,
    academic_year_id: Optional[int],
    exam_id: Optional[int] = None,
    group_by_exam: bool = False,
) -> str:
    qs = StudentMark.objects.filter(student=stu, is_active=True).select_related(
        'exam_schedule__subject', 'exam_schedule__exam__exam_type', 'exam_schedule__exam__term'
    )
    if academic_year_id:
        qs = qs.filter(exam_schedule__exam__academic_year_id=academic_year_id)
    if exam_id:
        qs = qs.filter(exam_schedule__exam_id=exam_id)
    qs = qs.order_by('-exam_schedule__fordate', 'exam_schedule__subject__name')[:80]
    rows = list(qs)
    if not rows:
        ay = f" for the selected academic year (id {academic_year_id})" if academic_year_id else ""
        ex = f" for the selected exam (id {exam_id})" if exam_id else ""
        return (
            f"No mark rows are stored yet for **{_student_display_name(stu)}**{ay}{ex}. "
            f"They may not be scheduled in an exam, or marks are not entered."
        )

    title = (
        f"**Marks card — {_student_display_name(stu)}**"
        if group_by_exam
        else f"**Marks for {_student_display_name(stu)}**"
    )
    lines = [title + (" (grouped by exam):" if group_by_exam else " (latest entries, max 80):"), ""]

    def _row_line(m) -> str:
        es = m.exam_schedule
        subj = es.subject.name if es and es.subject_id else '—'
        exam_name = (
            es.exam.exam_type.name
            if es and es.exam_id and es.exam and es.exam.exam_type_id
            else 'Exam'
        )
        when = es.fordate.strftime('%Y-%m-%d') if es and es.fordate else '—'
        mark_bit = ''
        if m.marks is not None:
            mark_bit = f"{m.marks:g}"
        if m.grade:
            mark_bit = f"{mark_bit} (grade {m.grade})" if mark_bit else f"grade {m.grade}"
        if not mark_bit:
            mark_bit = '—'
        return f"• **{subj}** — {exam_name}, date {when}: **{mark_bit}**"

    if group_by_exam:
        buckets = {}
        for m in rows:
            es = m.exam_schedule
            eid = es.exam_id if es and es.exam_id else 0
            exam_label = (
                es.exam.exam_type.name
                if es and es.exam_id and es.exam and es.exam.exam_type_id
                else ('Exam' if es else 'Other')
            )
            buckets.setdefault((eid, exam_label), []).append(m)
        for (_, exam_label), mrows in sorted(buckets.items(), key=lambda kv: kv[0][0] or 0, reverse=True):
            lines.append(f"**{exam_label}**")
            for m in mrows:
                lines.append(_row_line(m))
            lines.append("")
    else:
        for m in rows:
            lines.append(_row_line(m))
        lines.append("")

    lines.append("_Open **Exam → Enter marks / reports** in the menu for full detail and official cards._")
    return '\n'.join(lines)


def _format_attendance_answer(stu: Student, academic_year_id: Optional[int]) -> str:
    qs = BatchAttendance.objects.filter(student=stu).select_related('attendance_batch')
    if academic_year_id:
        qs = qs.filter(attendance_batch__academic_year_id=academic_year_id)
    recent = list(qs.order_by('-for_date')[:60])
    if not recent:
        ay = f" for academic year {academic_year_id}" if academic_year_id else ""
        return (
            f"No **batch attendance** rows found for **{_student_display_name(stu)}**{ay}. "
            f"If your school uses another attendance mode, check **Student Attendance** screens."
        )
    present = sum(1 for r in recent if r.status == 'present')
    absent = sum(1 for r in recent if r.status == 'absent')
    lines = [
        f"**Attendance for {_student_display_name(stu)}** (last {len(recent)} saved days in this system):",
        f"- Present: **{present}**  |  Absent: **{absent}**",
        "",
        "**Recent days:**",
    ]
    for r in recent[:20]:
        lines.append(f"• {r.for_date}: **{r.status}**")
    if len(recent) > 20:
        lines.append(f"... and {len(recent) - 20} more day(s) on file.")
    lines.append("")
    lines.append("_Figures come from **batch attendance** records only._")
    return '\n'.join(lines)


def _wants_marks_card_layout(q: str) -> bool:
    return bool(re.search(r'\b(marks?\s*card|report\s*card|score\s*card|grade\s*sheet)\b', q, re.I))


def try_answer_student_fact_query(
    query: str,
    user,
    academic_year=None,
    exam_id=None,
) -> Optional[str]:
    """
    If the user is asking for a specific student's marks and/or attendance, return a factual answer.
    Otherwise return None (caller continues with knowledge base).
    """
    if not user or not user.is_authenticated:
        return None

    raw = query.strip()
    if not raw:
        return None

    q_low = raw.lower()
    marks = _wants_marks(q_low)
    att = _wants_attendance(q_low)
    if not marks and not att:
        return None
    if not _looks_like_fact_lookup(raw, q_low):
        return None

    scope = _visible_students_qs(user)
    if not scope.exists():
        return None

    selected: List[Student] = []
    if _is_self_reference(q_low):
        try:
            if getattr(user, 'student_id', None):
                st = Student.objects.filter(id=user.student.id, is_active=True).first()
                if st:
                    selected = [st]
        except Exception:
            selected = []
        if not selected:
            # Staff/admin logins are often not tied to a Student row. For those users, don't hard-stop on "my ...":
            # let the flow continue and ask for a student name when role permissions allow cross-student lookup.
            can_lookup_marks = ChatbotService.check_permission_for_basename(user, 'studentmark', 'GET')
            can_lookup_attendance = ChatbotService.check_permission_for_basename(user, 'batchattendance', 'GET')
            can_lookup_others = bool(user.is_superuser or can_lookup_marks or can_lookup_attendance)
            if not can_lookup_others:
                return (
                    "**Your account is not linked to a student profile**, so I can’t load “my marks” or “my attendance”. "
                    "Log in as a student user, or ask using a student’s name (if your role allows)."
                )

    if not selected:
        hint = _extract_name_hint(raw)
        if not hint:
            return (
                "**Which student should I look up?** Try: `marks for Priya Sharma` or `attendance of Rahul` "
                "(use the name as it is usually stored). If you are a student, ask: **what are my marks**."
            )
        candidates = _find_matching_students(hint, scope, limit=8)
        if len(candidates) == 0:
            return (
                f"I couldn’t find an active student matching “**{hint}**” among the students your login can access. "
                "Check spelling or use first and last name."
            )
        if len(candidates) > 1:
            names = ', '.join(_student_display_name(s) for s in candidates[:5])
            extra = f" (+{len(candidates) - 5} more)" if len(candidates) > 5 else ""
            return (
                f"I found **several students** ({names}{extra}). "
                f"Please ask again with a **fuller name** (e.g. middle name or admission number)."
            )
        selected = candidates

    stu = selected[0]

    try:
        own_student_id = user.student.id if getattr(user, 'student', None) else None
    except Exception:
        own_student_id = None
    viewing_own_record = bool(own_student_id and stu.id == own_student_id)

    ay_id = None
    if academic_year is not None and academic_year != '':
        try:
            ay_id = int(academic_year)
        except (TypeError, ValueError):
            ay_id = None

    ex_id = None
    if exam_id is not None and exam_id != '':
        try:
            ex_id = int(exam_id)
        except (TypeError, ValueError):
            ex_id = None

    parts = []
    if marks:
        if not viewing_own_record and not ChatbotService.check_permission_for_basename(
            user, 'studentmark', 'GET'
        ):
            parts.append(
                "You **don’t have permission** to view student marks. Ask an administrator for **view** access to marks."
            )
        else:
            parts.append(
                _format_marks_answer(
                    stu,
                    ay_id,
                    exam_id=ex_id,
                    group_by_exam=_wants_marks_card_layout(raw),
                )
            )

    if att:
        if not viewing_own_record and not ChatbotService.check_permission_for_basename(
            user, 'batchattendance', 'GET'
        ):
            parts.append(
                "You **don’t have permission** to view batch attendance. Ask an administrator for **batch attendance** view access."
            )
        else:
            parts.append(_format_attendance_answer(stu, ay_id))

    if not parts:
        return None
    return '\n\n'.join(parts)
