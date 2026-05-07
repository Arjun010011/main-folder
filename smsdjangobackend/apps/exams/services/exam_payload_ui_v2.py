"""
Exam create/update payload helpers for the new schedule / exam UI.

Legacy clients continue to call `add_update_exam` in `exam.py` with
`standard_section_ids` only. New UI may send `standard_ids` (standards only)
or opt in via `ui_version`; those requests are normalized here, then delegated
to the unchanged core implementation in `exam.py`.
"""

from copy import deepcopy

from rest_framework.exceptions import ValidationError

from apps.classes.models import StandardSectionMapping


def should_route_exam_payload_through_ui_v2(data):
    """Detect payloads that need new-UI normalization before `add_update_exam`."""
    if not isinstance(data, dict):
        return False
    section_raw = str(data.get("standard_section_ids") or "").strip()
    standard_raw = str(data.get("standard_ids") or "").strip()
    if standard_raw and not section_raw:
        return True
    ver = data.get("ui_version")
    if ver in (2, "2", "v2", "V2"):
        return True
    return False


def _build_standard_section_mappings(academic_year_id):
    """Same mapping shape as `add_update_exam` in `exam.py` (for expansion)."""
    standard_section_data = StandardSectionMapping.objects.filter(
        academic_year=academic_year_id
    ).values()
    section_standard_mapping = {}
    standard_section_mapping = {}
    for stand_sec in standard_section_data:
        section_standard_mapping[stand_sec["id"]] = stand_sec["standard_id"]
        sid = stand_sec["standard_id"]
        if sid in standard_section_mapping:
            standard_section_mapping[sid].append(stand_sec["id"])
        else:
            standard_section_mapping[sid] = [stand_sec["id"]]
    return section_standard_mapping, standard_section_mapping


def prepare_exam_payload_for_schedule_ui_v2(data):
    """
    Mutates `data` in place so `add_update_exam` receives `standard_section_ids`.

    Supports:
    - `standard_section_ids` (comma-separated) — optional cleanup / ensure key
    - `standard_ids` only — expands to all section ids for the academic year
    """
    if not isinstance(data, dict):
        raise ValidationError("Invalid payload")

    academic_year = data.get("academic_year")
    if academic_year is None or str(academic_year).strip() == "":
        raise ValidationError("academic_year is required")

    _, standard_section_mapping = _build_standard_section_mappings(academic_year)

    standard_section_ids_raw = data.get("standard_section_ids")
    standard_ids_raw = data.get("standard_ids")

    standard_section_ids_str = (
        str(standard_section_ids_raw).strip() if standard_section_ids_raw is not None else ""
    )
    standard_ids_str = str(standard_ids_raw).strip() if standard_ids_raw is not None else ""

    if standard_section_ids_str:
        data["standard_ids"] = ""
        section_ids = list({s for s in standard_section_ids_str.split(",") if str(s).strip()})
        data["standard_section_ids"] = ",".join(str(s) for s in section_ids)
        return

    if standard_ids_str:
        standard_ids_list = [s for s in standard_ids_str.split(",") if str(s).strip()]
        try:
            standard_ids_list_int = [int(s) for s in standard_ids_list]
        except (TypeError, ValueError) as exc:
            raise ValidationError("Invalid standard_ids") from exc

        expanded = []
        for std_id in standard_ids_list_int:
            expanded.extend(standard_section_mapping.get(std_id, []))
        expanded = list(set(expanded))
        data["standard_section_ids"] = ",".join(str(s) for s in expanded)
        data["standard_ids"] = ",".join(str(s) for s in standard_ids_list_int)
        return

    raise ValidationError("standard_section_ids or standard_ids is required")


def add_update_exam_ui_v2(self, data, is_update=False):
    """Normalize new-UI payload, then run legacy-safe `add_update_exam`."""
    from apps.exams.services.exam import add_update_exam

    payload = deepcopy(data) if isinstance(data, dict) else data
    prepare_exam_payload_for_schedule_ui_v2(payload)
    if isinstance(payload, dict):
        payload.pop("ui_version", None)
    return add_update_exam(self, payload, is_update)


def bulk_add_update_exams_ui_v2(self, exams):
    """
    Bulk create/update exam(s) for the new UI (single transaction).

    Each item is normalized via `prepare_exam_payload_for_schedule_ui_v2`, then
    passed to `add_update_exam`.
    """
    from django.db import transaction

    from apps.exams.services.exam import add_update_exam

    if not isinstance(exams, list) or not exams:
        raise ValidationError("bulk_exams must be a non-empty list")

    results = []
    with transaction.atomic():
        for idx, exam_data in enumerate(exams):
            payload = deepcopy(exam_data) if isinstance(exam_data, dict) else exam_data
            prepare_exam_payload_for_schedule_ui_v2(payload)
            if isinstance(payload, dict):
                payload.pop("ui_version", None)
            response = add_update_exam(self, payload, isUpdate=False)
            results.append({"index": idx, "payload": exam_data, "response": response})

    return {
        "success_count": len(results),
        "failure_count": 0,
        "successes": results,
        "failures": [],
    }
