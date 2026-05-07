"""
Visitor pass PDF (HTML template + WeasyPrint), same pattern as hall ticket / gate pass QR.
"""
import base64
import io
import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import exceptions

from apps.institutes.models.institute import Institute
from apps.institutes.models.visitor import Visitor
from apps.shared.services import PDFService
from apps.shared.services_shared.common import get_selected_template


def get_visitor_verify_url(visitor_id):
    """
    Frontend URL opened when QR is scanned (security desk logs into ERP).

    Multi-tenant: https://{institute.code}.{DOMAIN_EXTENSION}/school/visitor/verify?visitor=...
    Local dev: http://localhost:3000/school/visitor/verify?visitor=...
    """
    path = "/school/visitor/verify?visitor=%s" % int(visitor_id)
    domain_ext = (getattr(settings, "DOMAIN_EXTENSION", None) or "").strip()
    institute = Institute.objects.first()
    code = (institute.code or "").strip().lower() if institute else ""

    if domain_ext and code:
        host = "%s.%s" % (code, domain_ext)
        host = host.rstrip(".")
        return "https://%s%s" % (host, path)

    if not domain_ext:
        return "http://localhost:3000%s" % path

    return str(visitor_id)


def get_visitor_qr_data_url(visitor_id):
    """Base64 PNG data URL for WeasyPrint (same approach as gate pass)."""
    try:
        import qrcode
    except ImportError as e:
        logging.warning(
            "Visitor pass QR not generated: install qrcode[pil]. Error: %s",
            e,
        )
        return None
    try:
        payload = get_visitor_verify_url(visitor_id)
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        data = base64.b64encode(buffer.getvalue()).decode()
        return "data:image/png;base64,%s" % data
    except Exception as e:
        logging.warning("Visitor pass QR generation failed: %s", e, exc_info=True)
        return None


def _full_name(first, middle, last):
    parts = [p for p in [first or "", middle or "", last or ""] if str(p).strip()]
    return " ".join(parts).strip() or "—"


def _visited_for_row(visitor):
    user = visitor.user
    if not user:
        return "—", "—"
    if user.staff_id and user.staff:
        s = user.staff
        return "Staff", _full_name(s.first_name, s.middle_name, s.last_name)
    if user.student_id and user.student:
        st = user.student
        return "Student", _full_name(st.first_name, st.middle_name, st.last_name)
    return "—", "—"


def _adjust_for_display(dt):
    """Avoid localtime() on naive datetimes (USE_TZ=False or naive values from DB)."""
    if dt is None:
        return None
    use_tz = getattr(settings, "USE_TZ", True)
    if use_tz:
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return timezone.localtime(dt)
    return dt


def _format_dt(dt):
    if not dt:
        return "—"
    adj = _adjust_for_display(dt)
    return adj.strftime("%d-%m-%Y %I:%M %p") if adj else "—"


def _resolve_visitor_pass_template_filename(view_self):
    """Same as gate_pass: active TemplateMapping for module visitor_pass (no URL template picker)."""
    selected, _copies = get_selected_template(
        view_self,
        "visitor_pass",
        "pdf",
        "visitor_pass.html",
        None,
        [],
    )
    return selected


def get_visitor_pass_pdf(view_self):
    raw = view_self.request.GET.get("visitor") or view_self.request.GET.get("visitors")
    if not raw:
        raise exceptions.ValidationError(
            "Query parameter visitor (id) or visitors (comma-separated ids) is required."
        )

    ids = []
    for x in raw.split(","):
        x = x.strip()
        if x.isdigit():
            ids.append(int(x))
    if not ids:
        raise exceptions.ValidationError("Invalid visitor id(s).")

    qs = Visitor.objects.filter(id__in=ids).select_related(
        "reason", "building", "user", "user__staff", "user__student", "roomallocation"
    )
    by_id = {v.id: v for v in qs}
    ordered = []
    missing = []
    for i in ids:
        if i in by_id:
            ordered.append(by_id[i])
        else:
            missing.append(i)
    if missing:
        raise exceptions.ValidationError(
            "Visitor(s) not found: %s" % ", ".join(str(m) for m in missing)
        )

    institute = Institute.get_institute(view_self)
    visitor_rows = []
    for v in ordered:
        vf_type, vf_name = _visited_for_row(v)
        visitor_rows.append(
            {
                "id": v.id,
                "name": v.name or "—",
                "mobile": v.mobile or "—",
                "checkin": _format_dt(v.checkin),
                "checkout": _format_dt(v.checkout) if v.checkout else "—",
                "building": v.building.name if v.building else "—",
                "reason": v.reason.name if v.reason else "—",
                "visited_for_type": vf_type,
                "visited_name": vf_name,
                "qr_data_url": get_visitor_qr_data_url(v.id),
            }
        )

    template_file = _resolve_visitor_pass_template_filename(view_self)
    template_path = "visitor_pass/" + template_file

    data = {
        "institute": institute,
        "visitor_rows": visitor_rows,
        "generated_at": _adjust_for_display(timezone.now()).strftime("%d-%m-%Y %I:%M %p"),
    }
    return PDFService.receipt(view_self, data, "visitor_pass", template_path)
