import json
import os
from hashlib import sha256
from pathlib import Path
from typing import List

from django.db import transaction
from rest_framework import exceptions
import requests

from apps.classes.models import AiLessonPlanCache, LessonPlanAcademicYear
from apps.classes.services.lesson_plan import create_or_update_lesson_plan_template_academic_year
from apps.classes.services.ncert_service import download_ncert_book_as_upload
from apps.tenants.services.middlewares import get_current_db_name

MAX_FILE_SIZE_MB = 20
MAX_CHARS_PER_CHUNK = 12000
MAX_TOTAL_CHARS = 120000


def load_studyplanner_env():
    env_path = Path(__file__).resolve().parents[3] / ".env"
    if not env_path.exists():
        return
    with env_path.open() as env_file:
        for raw_line in env_file:
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_studyplanner_env()

PROMPT_TEMPLATE = (
    "Analyze the following textbook content and generate a structured lesson plan.\n"
    "Break the content into academic-year topics, subtopics, and teaching details.\n"
    "If exact academic-year metadata is not present in the textbook, keep those metadata fields null.\n"
    "If dates, reviews, holiday entries, or assigned users are not present, return null or empty arrays for them.\n\n"
    "Return ONLY valid JSON in this format:\n"
    "{{\n"
    'title: string,\n'
    "period_minutes: number,\n"
    "teacher_suggestions: string[],\n"
    "lesson_plan_academic_year: {{\n"
    "academic_year: string | null,\n"
    "subject: string | null,\n"
    "standard_section: string | null,\n"
    "lesson_plan_template: string | null,\n"
    "is_active: boolean\n"
    "}},\n"
    "topics: [\n"
    "{{\n"
    "name: string,\n"
    "sequence: number,\n"
    "subtopics: [\n"
    "{{\n"
    "name: string,\n"
    "sequence: number,\n"
    "periods: number,\n"
    "hours: number,\n"
    "notes: string,\n"
    "details: [\n"
    "{{\n"
    "name: string,\n"
    "objectives: string,\n"
    "activities: string,\n"
    "resource: string,\n"
    "assessment: string,\n"
    "allocated_from_date: string | null,\n"
    "allocated_to_date: string | null,\n"
    "allocated_to_user: string | null,\n"
    "completion_date: string | null,\n"
    "reviews: [\n"
    "{{\n"
    "message: string,\n"
    "date: string | null,\n"
    "created_by: string | null\n"
    "}}\n"
    "]\n"
    "}}\n"
    "]\n"
    "}}\n"
    "]\n"
    "}}\n"
    "],\n"
    "holiday_calendar: [\n"
    "{{\n"
    "financial_year: string | null,\n"
    "from_date: string | null,\n"
    "to_date: string | null,\n"
    "reason: string\n"
    "}}\n"
    "],\n"
    "days: [\n"
    "{{\n"
    "name: string,\n"
    "is_active: boolean,\n"
    "is_teacher_working_day: boolean,\n"
    "is_student_working_day: boolean\n"
    "}}\n"
    "]\n"
    "}}\n\n"
    "Period length in minutes: {period_minutes}\n"
    "Lesson Plan Start Date: {start_date}\n"
    "Lesson Plan End Date: {end_date}\n"
    "If start_date and end_date are valid dates, proportionately assign realistic `allocated_from_date` and `allocated_to_date` (in YYYY-MM-DD format) to each subtopic detail based on overall duration and content weight. Ensure dates are sequential and valid. If dates are missing, keep them null.\n"
    "Also include 5-8 teacher_suggestions as short bullet-like strings.\n"
    "Textbook content:\n"
    "<<<{text}>>>"
)


def _require_dependency(module_name, package_name):
    try:
        return __import__(module_name, fromlist=["*"])
    except ImportError as exc:
        raise RuntimeError(
            f"{package_name} is not installed in the project venv. "
            f"Install the updated requirements/base.txt dependencies first."
        ) from exc


def normalize_text_for_fingerprint(text):
    return " ".join(text.split()).lower()


def get_normalized_text_length(text):
    return len(normalize_text_for_fingerprint(text))


def build_book_fingerprint(text):
    normalized_text = normalize_text_for_fingerprint(text)
    return sha256(normalized_text.encode("utf-8")).hexdigest()


def build_generation_signature():
    signature_payload = {
        "prompt_template": PROMPT_TEMPLATE,
        "gemini_model": os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite"),
        "period_minutes": int(os.getenv("PERIOD_MINUTES", "40")),
        "periods_per_week": int(os.getenv("PERIODS_PER_WEEK", "6")),
        "working_days_per_week": int(os.getenv("WORKING_DAYS_PER_WEEK", "6")),
        "govt_holidays_per_year": int(os.getenv("GOVT_HOLIDAYS_PER_YEAR", "17")),
        "unexpected_holidays_per_month": int(os.getenv("UNEXPECTED_HOLIDAYS_PER_MONTH", "3")),
        "max_chars_per_chunk": MAX_CHARS_PER_CHUNK,
        "max_total_chars": MAX_TOTAL_CHARS,
    }
    return sha256(
        json.dumps(signature_payload, sort_keys=True).encode("utf-8")
    ).hexdigest()


def build_cache_key(text):
    return sha256(
        f"{build_book_fingerprint(text)}:{build_generation_signature()}".encode("utf-8")
    ).hexdigest()


def extract_text_from_pdf(file_obj):
    pdfplumber = _require_dependency("pdfplumber", "pdfplumber")

    text_parts = []
    with pdfplumber.open(file_obj) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                text_parts.append(page_text)
    text = "\n".join(text_parts).strip()
    if not text:
        raise exceptions.ValidationError("No extractable text found in PDF.")
    return text


def chunk_text(text, max_chars):
    if len(text) <= max_chars:
        return [text]
    chunks = []
    start = 0
    while start < len(text):
        end = min(start + max_chars, len(text))
        chunks.append(text[start:end])
        start = end
    return chunks


def _is_retryable_error(exc):
    message = str(exc)
    return "503" in message or "UNAVAILABLE" in message


def _unique_models(models):
    seen = set()
    ordered = []
    for model in models:
        if model and model not in seen:
            ordered.append(model)
            seen.add(model)
    return ordered


def call_gemini_for_plan(text_chunk, start_date=None, end_date=None):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise exceptions.ValidationError("GEMINI_API_KEY is not set.")
    period_minutes = int(os.getenv("PERIOD_MINUTES", "40"))
    prompt = PROMPT_TEMPLATE.format(
        text=text_chunk, 
        period_minutes=period_minutes,
        start_date=start_date or 'None',
        end_date=end_date or 'None'
    )

    model_preference = os.getenv("GEMINI_MODEL", "gemini-2.5-flash-lite")
    fallback_models = [
        model_preference,
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.5-pro",
    ]

    last_error = None
    for model_name in _unique_models(fallback_models):
        try:
            response = requests.post(
                f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent",
                params={"key": api_key},
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {
                        "responseMimeType": "application/json",
                    },
                },
                timeout=120,
            )
            response.raise_for_status()
            payload = response.json()
            text_parts = []
            for candidate in payload.get("candidates", []):
                content = candidate.get("content", {})
                for part in content.get("parts", []):
                    if isinstance(part, dict) and part.get("text"):
                        text_parts.append(part["text"])
            if not text_parts:
                raise RuntimeError("Gemini response did not contain any text output.")
            return json.loads("\n".join(text_parts))
        except Exception as exc:  # pragma: no cover - network/provider behavior
            last_error = exc
            if _is_retryable_error(exc):
                continue
            raise

    if last_error:
        raise last_error
    raise RuntimeError("Gemini request failed.")


def combine_plans(plans):
    if len(plans) == 1:
        return plans[0]

    combined_topics = []
    title = plans[0].get("title", "Lesson Plan")
    period_minutes = plans[0].get("period_minutes", 40)
    teacher_suggestions = plans[0].get("teacher_suggestions", [])
    lesson_plan_academic_year = plans[0].get("lesson_plan_academic_year", {})
    holiday_calendar = plans[0].get("holiday_calendar", [])
    days = plans[0].get("days", [])

    for plan in plans:
        combined_topics.extend(plan.get("topics", []))

    return {
        "title": title,
        "period_minutes": period_minutes,
        "teacher_suggestions": teacher_suggestions,
        "lesson_plan_academic_year": lesson_plan_academic_year,
        "topics": combined_topics,
        "holiday_calendar": holiday_calendar,
        "days": days,
    }


def _normalize_plan(plan):
    period_minutes = int(os.getenv("PERIOD_MINUTES", str(plan.get("period_minutes", 40))))
    plan["period_minutes"] = period_minutes

    total_periods = 0
    total_hours = 0.0
    modules = []

    for topic_index, topic in enumerate(plan.get("topics", []), start=1):
        topic["sequence"] = int(topic.get("sequence", topic_index))
        module_periods = 0
        module_hours = 0.0
        module_topics = []

        for subtopic_index, subtopic in enumerate(topic.get("subtopics", []), start=1):
            subtopic["sequence"] = int(subtopic.get("sequence", subtopic_index))
            periods = int(subtopic.get("periods", 1))
            hours = subtopic.get("hours")
            if hours is None:
                hours = round((periods * period_minutes) / 60, 2)
            subtopic["periods"] = periods
            subtopic["hours"] = float(hours)

            details = subtopic.get("details", [])
            if not details:
                details = [
                    {
                        "name": subtopic.get("name", ""),
                        "objectives": "",
                        "activities": "",
                        "resource": "",
                        "assessment": "",
                        "allocated_from_date": None,
                        "allocated_to_date": None,
                        "allocated_to_user": None,
                        "completion_date": None,
                        "reviews": [],
                    }
                ]
            for detail in details:
                detail["name"] = detail.get("name") or subtopic.get("name", "")
                detail["objectives"] = detail.get("objectives", "")
                detail["activities"] = detail.get("activities", "")
                detail["resource"] = detail.get("resource", "")
                detail["assessment"] = detail.get("assessment", "")
                detail["allocated_from_date"] = detail.get("allocated_from_date")
                detail["allocated_to_date"] = detail.get("allocated_to_date")
                detail["allocated_to_user"] = detail.get("allocated_to_user")
                detail["completion_date"] = detail.get("completion_date")
                detail["reviews"] = detail.get("reviews", [])
            subtopic["details"] = details

            module_topics.append(
                {
                    "topic": subtopic.get("name", ""),
                    "periods": periods,
                    "hours": float(hours),
                    "notes": subtopic.get("notes", ""),
                }
            )
            module_periods += periods
            module_hours += float(hours)

        modules.append(
            {
                "module_title": topic.get("name", f"Topic {topic_index}"),
                "total_periods": module_periods,
                "total_hours": round(module_hours, 2),
                "topics": module_topics,
            }
        )
        total_periods += module_periods
        total_hours += module_hours

    plan["total_periods"] = total_periods
    plan["total_hours"] = round(total_hours, 2)
    plan["modules"] = modules
    plan.setdefault(
        "lesson_plan_academic_year",
        {
            "academic_year": None,
            "subject": None,
            "standard_section": None,
            "lesson_plan_template": None,
            "is_active": True,
        },
    )
    plan.setdefault("holiday_calendar", [])
    if not plan.get("days"):
        plan["days"] = [
            {
                "name": day_name,
                "is_active": True,
                "is_teacher_working_day": day_name != "Sunday",
                "is_student_working_day": day_name != "Sunday",
            }
            for day_name in [
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
            ]
        ]
    return plan


def _build_summary(plan):
    periods_per_week = int(os.getenv("PERIODS_PER_WEEK", "6"))
    working_days_per_week = int(os.getenv("WORKING_DAYS_PER_WEEK", "6"))
    govt_holidays_per_year = int(os.getenv("GOVT_HOLIDAYS_PER_YEAR", "17"))
    unexpected_holidays_per_month = int(os.getenv("UNEXPECTED_HOLIDAYS_PER_MONTH", "3"))

    total_periods = plan.get("total_periods", 0) or 0
    if periods_per_week <= 0 or working_days_per_week <= 0:
        return {
            "total_periods": total_periods,
            "total_hours": plan.get("total_hours", 0),
            "periods_per_week": periods_per_week,
            "working_days_per_week": working_days_per_week,
            "govt_holidays_per_year": govt_holidays_per_year,
            "unexpected_holidays_per_month": unexpected_holidays_per_month,
            "estimated_weeks": 0,
            "estimated_teaching_days": 0,
            "estimated_calendar_days": 0,
        }

    estimated_weeks = total_periods / periods_per_week
    estimated_teaching_days = estimated_weeks * working_days_per_week
    estimated_months = estimated_weeks / 4.3
    govt_holidays_estimated = round(govt_holidays_per_year * (estimated_months / 12), 1)
    unexpected_holidays_estimated = round(unexpected_holidays_per_month * estimated_months, 1)
    estimated_calendar_days = estimated_teaching_days + govt_holidays_estimated + unexpected_holidays_estimated

    return {
        "total_periods": total_periods,
        "total_hours": plan.get("total_hours", 0),
        "periods_per_week": periods_per_week,
        "working_days_per_week": working_days_per_week,
        "govt_holidays_per_year": govt_holidays_per_year,
        "govt_holidays_estimated": govt_holidays_estimated,
        "unexpected_holidays_per_month": unexpected_holidays_per_month,
        "unexpected_holidays_estimated": unexpected_holidays_estimated,
        "estimated_weeks": round(estimated_weeks, 2),
        "estimated_teaching_days": round(estimated_teaching_days, 1),
        "estimated_calendar_days": round(estimated_calendar_days, 1),
    }


def generate_study_plan(text, start_date=None, end_date=None):
    if len(text) > MAX_TOTAL_CHARS:
        text = text[:MAX_TOTAL_CHARS]

    chunks = chunk_text(text, MAX_CHARS_PER_CHUNK)
    plans = [call_gemini_for_plan(chunk, start_date=start_date, end_date=end_date) for chunk in chunks]
    combined = combine_plans(plans)
    normalized = _normalize_plan(combined)
    normalized["summary"] = _build_summary(normalized)
    return normalized


def _build_standard_section_display(standard_section):
    parts = []
    if getattr(standard_section, "standard_id", None):
        parts.append(standard_section.standard.name)
    if getattr(standard_section, "section_id", None):
        parts.append(standard_section.section.name)
    return " - ".join(parts)


def _get_existing_plan_summary(academic_year, subject, standard_section):
    existing_plan = LessonPlanAcademicYear.objects.filter(
        academic_year=academic_year,
        subject=subject,
        standard_section=standard_section,
    ).order_by("-modified").first()
    if not existing_plan:
        return None, None

    topic_count = existing_plan.lesson_plan_topic_academic_year_lesson_plan_academic_year.count()
    return existing_plan, {
        "id": existing_plan.id,
        "topic_count": topic_count,
        "modified": existing_plan.modified,
    }


def _validate_pdf(uploaded_file):
    if uploaded_file.content_type != "application/pdf":
        raise exceptions.ValidationError("Invalid file type. Please upload a PDF.")
    if uploaded_file.size > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise exceptions.ValidationError(
            f"File too large. Max size is {MAX_FILE_SIZE_MB} MB."
        )





def _build_metadata_payload(validated_data):
    lesson_plan_template = validated_data.get("lesson_plan_template")
    standard_section = validated_data["standard_section"]
    return {
        "academic_year": validated_data["academic_year"].id,
        "subject": validated_data["subject"].id,
        "standard_section": standard_section.id,
        "lesson_plan_template": lesson_plan_template.id if lesson_plan_template else None,
        "standard_section_display": _build_standard_section_display(standard_section),
    }


def _find_fuzzy_match(text_length):
    """Find a similar plan by text_length ±10% in central_db.

    Returns the best matching AiLessonPlanCache entry, or None.
    """
    if text_length <= 0:
        return None
    tolerance = int(text_length * 0.10)
    lower = text_length - tolerance
    upper = text_length + tolerance
    return (
        AiLessonPlanCache.objects.using('central_db')
        .filter(
            text_length__gte=lower,
            text_length__lte=upper,
        )
        .order_by('-updated_at')
        .first()
    )


def _build_ai_lesson_plan_preview_from_upload(validated_data, uploaded_file):
    _validate_pdf(uploaded_file)

    text = extract_text_from_pdf(uploaded_file)
    normalized_text_length = get_normalized_text_length(text)
    book_fingerprint = build_book_fingerprint(text)
    cache_key = build_cache_key(text)

    # --- Step 1: Exact cache hit (same content + same generation params) ---
    cache_entry = AiLessonPlanCache.objects.using('central_db').filter(
        cache_key=cache_key
    ).first()
    is_cached = bool(cache_entry and not validated_data.get("force_regenerate"))

    if is_cached:
        with transaction.atomic(using='central_db'):
            cache_entry.upload_count += 1
            cache_entry.source_filename = uploaded_file.name
            cache_entry.save(update_fields=["upload_count", "source_filename", "updated_at"])
    else:
        # --- Step 2: Fuzzy match (same title + similar length) ---
        # Extract title from filename for fuzzy lookup before generating
        fuzzy_match = _find_fuzzy_match(
            text_length=normalized_text_length,
        )

        # If a fuzzy match exists and the user hasn't explicitly accepted/declined it,
        # return the fuzzy suggestion so the frontend can ask "use this or generate new?"
        if fuzzy_match and not validated_data.get("use_fuzzy_match") and not validated_data.get("force_regenerate"):
            existing_plan, existing_plan_summary = _get_existing_plan_summary(
                validated_data["academic_year"],
                validated_data["subject"],
                validated_data["standard_section"],
            )
            metadata = _build_metadata_payload(validated_data)
            fuzzy_plan = fuzzy_match.plan
            return {
                "cache_key": fuzzy_match.cache_key,
                "is_cached": False,
                "is_fuzzy_match": True,
                "fuzzy_match": {
                    "cache_key": fuzzy_match.cache_key,
                    "book_title": fuzzy_match.book_title,
                    "text_length": fuzzy_match.text_length,
                    "source_filename": fuzzy_match.source_filename,
                },
                "book_title": fuzzy_match.book_title,
                "source_filename": uploaded_file.name,
                "text_length": normalized_text_length,
                "upload_count": fuzzy_match.upload_count,
                "metadata": metadata,
                "ai_metadata": fuzzy_plan.get("lesson_plan_academic_year", {}),
                "teacher_suggestions": fuzzy_plan.get("teacher_suggestions", []),
                "summary": fuzzy_plan.get("summary", {}),
                "topics": fuzzy_plan.get("topics", []),
                "holiday_calendar": fuzzy_plan.get("holiday_calendar", []),
                "days": fuzzy_plan.get("days", []),
                "modules": fuzzy_plan.get("modules", []),
                "total_periods": fuzzy_plan.get("total_periods", 0),
                "total_hours": fuzzy_plan.get("total_hours", 0),
                "existing_plan": existing_plan_summary,
                "existing_plan_requires_replace": bool(existing_plan),
            }

        # If the user explicitly accepted the fuzzy match, treat it like a cache hit
        if fuzzy_match and validated_data.get("use_fuzzy_match"):
            cache_entry = fuzzy_match
            is_cached = True
            with transaction.atomic(using='central_db'):
                cache_entry.upload_count += 1
                cache_entry.source_filename = uploaded_file.name
                cache_entry.save(update_fields=["upload_count", "source_filename", "updated_at"])
        else:
            # --- Step 3: No match at all — call Gemini API ---
            academic_year = validated_data.get("academic_year")
            start_date = validated_data.get("start_date") or (academic_year.start_date if academic_year else None)
            end_date = validated_data.get("end_date") or (academic_year.end_date if academic_year else None)

            # Format dates as strings for the prompt
            start_date_str = start_date.strftime('%Y-%m-%d') if start_date else None
            end_date_str = end_date.strftime('%Y-%m-%d') if end_date else None

            plan = generate_study_plan(text, start_date=start_date_str, end_date=end_date_str)

            with transaction.atomic(using='central_db'):
                if cache_entry:
                    # force_regenerate case: overwrite existing exact entry
                    cache_entry.upload_count += 1
                    cache_entry.source_filename = uploaded_file.name
                    cache_entry.book_fingerprint = book_fingerprint
                    cache_entry.book_title = plan.get("title", "")
                    cache_entry.text_length = normalized_text_length
                    cache_entry.plan = plan
                    cache_entry.save(
                        update_fields=[
                            "upload_count",
                            "source_filename",
                            "book_fingerprint",
                            "book_title",
                            "text_length",
                            "plan",
                            "updated_at",
                        ]
                    )
                else:
                    cache_entry = AiLessonPlanCache.objects.using('central_db').create(
                        book_fingerprint=book_fingerprint,
                        cache_key=cache_key,
                        source_filename=uploaded_file.name,
                        book_title=plan.get("title", ""),
                        text_length=normalized_text_length,
                        plan=plan,
                    )

    # --- School-specific queries → use the tenant DB ---
    existing_plan, existing_plan_summary = _get_existing_plan_summary(
        validated_data["academic_year"],
        validated_data["subject"],
        validated_data["standard_section"],
    )
    plan = cache_entry.plan
    metadata = _build_metadata_payload(validated_data)

    return {
        "cache_key": cache_entry.cache_key,
        "is_cached": is_cached,
        "is_fuzzy_match": False,
        "book_title": cache_entry.book_title,
        "source_filename": cache_entry.source_filename,
        "text_length": cache_entry.text_length,
        "upload_count": cache_entry.upload_count,
        "metadata": metadata,
        "ai_metadata": plan.get("lesson_plan_academic_year", {}),
        "teacher_suggestions": plan.get("teacher_suggestions", []),
        "summary": plan.get("summary", {}),
        "topics": plan.get("topics", []),
        "holiday_calendar": plan.get("holiday_calendar", []),
        "days": plan.get("days", []),
        "modules": plan.get("modules", []),
        "total_periods": plan.get("total_periods", 0),
        "total_hours": plan.get("total_hours", 0),
        "existing_plan": existing_plan_summary,
        "existing_plan_requires_replace": bool(existing_plan),
    }


def build_ai_lesson_plan_preview(validated_data):
    return _build_ai_lesson_plan_preview_from_upload(validated_data, validated_data["file"])


def build_ai_lesson_plan_preview_from_ncert(validated_data):
    uploaded_file = download_ncert_book_as_upload(
        validated_data["book_code"],
        book_title=validated_data.get("book_title", ""),
        pdf_url=validated_data.get("pdf_url", ""),
    )
    return _build_ai_lesson_plan_preview_from_upload(validated_data, uploaded_file)


def _build_topics_payload(plan):
    topics_data = []
    for topic in plan.get("topics", []):
        topic_payload = {
            "name": topic.get("name", ""),
            "sequence": topic.get("sequence", 0),
            "subtopics": [],
        }
        for subtopic in topic.get("subtopics", []):
            subtopic_payload = {
                "name": subtopic.get("name", ""),
                "sequence": subtopic.get("sequence", 0),
                "subtopic_details": [],
            }
            details = subtopic.get("details") or []
            if not details:
                details = [{"name": subtopic.get("name", "")}]
            for detail in details:
                subtopic_payload["subtopic_details"].append(
                    {
                        "name": detail.get("name") or subtopic.get("name", ""),
                        "objectives": detail.get("objectives") or "",
                        "activities": detail.get("activities") or "",
                        "resource": detail.get("resource") or "",
                        "assessment": detail.get("assessment") or "",
                        "allocated_from_date": detail.get("allocated_from_date") or None,
                        "allocated_to_date": detail.get("allocated_to_date") or None,
                    }
                )
            topic_payload["subtopics"].append(subtopic_payload)
        topics_data.append(topic_payload)
    return topics_data


def import_ai_lesson_plan(validated_data):
    from apps.classes.services.versioning_service import create_lesson_plan_snapshot, merge_ai_content
    db_name = get_current_db_name()

    # Read cache from central_db (the "Master")
    cache_entry = AiLessonPlanCache.objects.using('central_db').filter(
        cache_key=validated_data["cache_key"]
    ).first()
    if not cache_entry:
        raise exceptions.ValidationError({"cache_key": "Cached lesson plan preview not found."})

    academic_year = validated_data["academic_year"]
    subject = validated_data["subject"]
    standard_section = validated_data["standard_section"]
    lesson_plan_template = validated_data.get("lesson_plan_template")

    existing_plan, _ = _get_existing_plan_summary(academic_year, subject, standard_section)
    
    if existing_plan:
        if not validated_data.get("replace_existing"):
            raise exceptions.ValidationError(
                {"replace_existing": "A lesson plan already exists for this academic year, subject, and standard section."}
            )
        
        # Take a snapshot before overwriting/merging
        create_lesson_plan_snapshot(
            existing_plan, 
            user=validated_data.get('user'), 
            change_summary=f"Imported AI plan from cache {validated_data['cache_key']}"
        )
        
        # Perform Three-Way Merge to preserve manual edits
        new_ai_topics = _build_topics_payload(cache_entry.plan)
        topics_data = merge_ai_content(existing_plan, new_ai_topics)
    else:
        topics_data = _build_topics_payload(cache_entry.plan)

    payload = {
        "id": existing_plan.id if existing_plan else None,
        "academic_year": academic_year.id,
        "subject": subject.id,
        "standard_section": standard_section.id,
        "lesson_plan_template": lesson_plan_template.id if lesson_plan_template else None,
        "topics_data": topics_data,
        "_is_ai_sync": True,
    }

    # Create the "Instance" (editable copy) in the school's private DB
    with transaction.atomic(using=db_name):
        response = create_or_update_lesson_plan_template_academic_year(None, payload)
        lesson_plan_id = response["data"]["id"]

    # Update tracking fields back in central_db (no FK, just IDs)
    cache_entry.last_imported_lesson_plan_id = lesson_plan_id
    cache_entry.last_imported_tenant_db = db_name
    cache_entry.save(update_fields=[
        "last_imported_lesson_plan_id",
        "last_imported_tenant_db",
        "updated_at",
    ])

    return {
        "Reason": "AI lesson plan imported successfully.",
        "data": {
            "id": lesson_plan_id,
            "cache_key": cache_entry.cache_key,
            "replaced_existing": bool(existing_plan),
        },
    }
