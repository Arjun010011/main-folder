"""
Gate Pass services: create, approve, reject, exit, return, PDF, QR.
"""
import io
import base64
import logging
import tempfile
import os
from datetime import datetime
from django.db import transaction
from django.utils import timezone
from rest_framework import exceptions

from apps.gatepass.models import GatePass
from apps.shared.services import PDFService, SharedService
from apps.shared.services_shared.common import get_selected_template
from apps.tenants.services.middlewares import get_current_db_name


def _generate_gate_pass_number():
    """Generate unique gate pass number: GP-YYYY-NNNN."""
    year = timezone.now().year
    last = GatePass.objects.filter(
        gate_pass_number__startswith=f'GP-{year}-'
    ).order_by('-id').values_list('gate_pass_number', flat=True).first()
    if last:
        try:
            seq = int(last.split('-')[-1]) + 1
        except (ValueError, IndexError):
            seq = 1
    else:
        seq = 1
    return f'GP-{year}-{seq:04d}'


def _get_user_display_info(user):
    """Get admission/employee number, class, section, user_type for user (student or staff)."""
    info = {'admission_number': None, 'class_name': None, 'section_name': None, 'full_name': '', 'user_type': ''}
    name_parts = []
    if user.student:
        s = user.student
        name_parts = [s.first_name or '', s.middle_name or '', s.last_name or '']
        info['admission_number'] = s.current_reg_num
        info['user_type'] = 'student'
        if s.current_standard:
            info['class_name'] = s.current_standard.name
        # section from enrollment - caller can pass standard_section
    elif user.staff:
        st = user.staff
        name_parts = [st.first_name or '', st.middle_name or '', st.last_name or '']
        info['admission_number'] = st.employee_id
        info['user_type'] = 'staff'
    info['full_name'] = ' '.join(p for p in name_parts if p).strip() or user.username
    return info


def create_gatepass(view_self, data):
    """Create gate pass via serializer. Gate pass number from Counter. Status: REQUESTED."""
    from apps.gatepass.serializers import GatePassCreateSerializer
    from apps.shared.services import CounterService

    with transaction.atomic(using=get_current_db_name()):
        counter, prefix, postfix = CounterService.get_countered_value(view_self, 'GATE_PASS')
        gate_pass_number = f'{prefix}{counter.value}{postfix}'
        serializer = GatePassCreateSerializer(
            data=data,
            context={'request': view_self.request, 'gate_pass_number': gate_pass_number},
        )
        serializer.is_valid(raise_exception=True)
        obj = serializer.save()
        CounterService.increment_counter(view_self, counter)
    return obj


def approve_gatepass(view_self, gatepass_id):
    """Approve gate pass. Status: APPROVED."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'requested':
        raise exceptions.ValidationError(f'Cannot approve gate pass in status: {obj.status}.')
    obj.status = 'approved'
    obj.approved_by = view_self.request.user
    obj.approved_at = timezone.now()
    obj.save(update_fields=['status', 'approved_by', 'approved_at', 'modified'])
    return obj


def reject_gatepass(view_self, gatepass_id, reason=None):
    """Reject gate pass. Status: REJECTED."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'requested':
        raise exceptions.ValidationError(f'Cannot reject gate pass in status: {obj.status}.')
    obj.status = 'rejected'
    obj.approved_by = view_self.request.user
    obj.approved_at = timezone.now()
    obj.reject_reason = reason or ''
    obj.save(update_fields=['status', 'approved_by', 'approved_at', 'reject_reason', 'modified'])
    return obj


def record_exit(view_self, gatepass_id, guard_name=None):
    """Record security exit. Status: EXITED."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'approved':
        raise exceptions.ValidationError(f'Exit only allowed for approved pass. Current: {obj.status}.')
    obj.status = 'exited'
    obj.exit_time = timezone.now()
    obj.guard_name = guard_name or ''
    obj.save(update_fields=['status', 'exit_time', 'guard_name', 'modified'])
    return obj


def record_return(view_self, gatepass_id):
    """Record student return. Status: RETURNED."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'exited':
        raise exceptions.ValidationError(f'Return only allowed after exit. Current: {obj.status}.')
    obj.status = 'returned'
    obj.return_time = timezone.now()
    obj.save(update_fields=['status', 'return_time', 'modified'])
    return obj


def get_gatepass_by_number(pass_number):
    """Get gate pass by gate_pass_number. Returns (obj, error_response) or (obj, None)."""
    if not pass_number:
        return None, {'valid': False, 'message': 'Pass number is required.'}
    obj = GatePass.objects.filter(gate_pass_number=pass_number).select_related(
        'user', 'user__student', 'user__staff', 'standard_section',
        'standard_section__standard', 'standard_section__section',
    ).first()
    if not obj:
        return None, {'valid': False, 'message': 'Gate pass not found.'}
    return obj, None


def verify_exit_by_watchman(pass_number, guard_name=None):
    """Record checkout (exit) and mark as verified by watchman. Status: EXITED."""
    obj, err = get_gatepass_by_number(pass_number)
    if err:
        raise exceptions.ValidationError(err['message'])
    if obj.status != 'approved':
        raise exceptions.ValidationError(f'Exit only allowed for approved pass. Current: {obj.status}.')
    now = timezone.now()
    obj.status = 'exited'
    obj.exit_time = now
    obj.exit_verified_at = now
    obj.guard_name = guard_name or ''
    obj.save(update_fields=['status', 'exit_time', 'exit_verified_at', 'guard_name', 'modified'])
    return obj


def verify_return_by_watchman(pass_number):
    """Record return and mark as verified by watchman. Status: RETURNED."""
    obj, err = get_gatepass_by_number(pass_number)
    if err:
        raise exceptions.ValidationError(err['message'])
    if obj.status != 'exited':
        raise exceptions.ValidationError(f'Return only allowed after exit. Current: {obj.status}.')
    now = timezone.now()
    obj.status = 'returned'
    obj.return_time = now
    obj.return_verified_at = now
    obj.save(update_fields=['status', 'return_time', 'return_verified_at', 'modified'])
    return obj


def update_gatepass(view_self, gatepass_id, data):
    """Update gate pass (only when status is requested)."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'requested':
        raise exceptions.ValidationError(f'Can only edit gate pass in REQUESTED status. Current: {obj.status}.')
    allowed = {'reason', 'going_with', 'guardian_name', 'guardian_phone', 'expected_return_time', 'date'}
    update_fields = []
    for key in allowed:
        if key not in data:
            continue
        val = data[key]
        if key == 'expected_return_time' and val in (None, ''):
            obj.expected_return_time = None
        else:
            setattr(obj, key, val)
        update_fields.append(key)
    if update_fields:
        update_fields.append('modified')
        obj.save(update_fields=update_fields)
    return obj


def delete_gatepass(view_self, gatepass_id):
    """Delete gate pass (only when status is requested)."""
    obj = GatePass.objects.filter(id=gatepass_id).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status != 'requested':
        raise exceptions.ValidationError(f'Can only delete gate pass in REQUESTED status. Current: {obj.status}.')
    obj.delete()
    return None


def get_verify_url(gatepass):
    """
    Return frontend URL for the verify page (QR / PDF).

    Multi-tenant: https://{institute.code}.{DOMAIN_EXTENSION}/gatepass/verify?pass=...
    DOMAIN_EXTENSION is set per environment (e.g. production.py). Local dev with empty
    DOMAIN_EXTENSION falls back to http://localhost:3000 (same path).
    """
    from django.conf import settings
    from apps.institutes.models import Institute

    pass_num = gatepass.gate_pass_number
    path = f'/gatepass/verify?pass={pass_num}'
    domain_ext = (getattr(settings, 'DOMAIN_EXTENSION', None) or '').strip()
    institute = Institute.objects.first()
    code = (institute.code or '').strip().lower() if institute else ''

    if domain_ext and code:
        host = f'{code}.{domain_ext}'.rstrip('.')
        return f'https://{host}{path}'

    # No DOMAIN_EXTENSION (e.g. local): single-host dev frontend
    if not domain_ext:
        return f'http://localhost:3000{path}'

    # DOMAIN_EXTENSION set but institute code missing — cannot build tenant URL
    return pass_num


def get_qr_data_url(gatepass):
    """Return base64 data URL for QR code containing verification link. Requires: pip install qrcode[pil]"""
    try:
        import qrcode
    except ImportError as e:
        logging.warning(
            'Gate pass QR not generated: qrcode package not installed. '
            'Install with: pip install qrcode[pil] (or pip install qrcode Pillow). Error: %s',
            e,
        )
        return None
    try:
        payload = get_verify_url(gatepass)
        qr = qrcode.QRCode(version=1, box_size=6, border=2)
        qr.add_data(payload)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        data = base64.b64encode(buffer.getvalue()).decode()
        return f'data:image/png;base64,{data}'
    except Exception as e:
        logging.warning('Gate pass QR generation failed: %s', e, exc_info=True)
        return None


def get_qr_image_path(gatepass):
    """
    Write QR code (verification URL) to a temp file for PDF. Caller must delete file after PDF.
    Returns None if qrcode is not available.
    """
    try:
        import qrcode
    except ImportError:
        return None
    payload = get_verify_url(gatepass)
    qr = qrcode.QRCode(version=1, box_size=6, border=2)
    qr.add_data(payload)
    qr.make(fit=True)
    img = qr.make_image(fill_color='black', back_color='white')
    fd, path = tempfile.mkstemp(suffix='.png', prefix='gatepass_qr_')
    try:
        with os.fdopen(fd, 'wb') as f:
            img.save(f, format='PNG')
        return path
    except Exception:
        try:
            os.close(fd)
        except Exception:
            pass
        try:
            os.remove(path)
        except Exception:
            pass
        return None


def get_gatepass_pdf(view_self, gatepass_id):
    """Generate printable PDF for gate pass using mapped template (same as fee collection receipt)."""
    obj = GatePass.objects.filter(id=gatepass_id).select_related(
        'user', 'user__student', 'user__staff', 'standard_section',
        'standard_section__standard', 'standard_section__section'
    ).first()
    if not obj:
        raise exceptions.ValidationError('Gate pass not found.')
    if obj.status not in ('requested', 'approved', 'exited', 'returned'):
        raise exceptions.ValidationError('PDF only for requested/approved/exited/returned passes.')

    info = _get_user_display_info(obj.user)
    if obj.standard_section:
        info['class_name'] = obj.standard_section.standard.name if obj.standard_section.standard else None
        info['section_name'] = obj.standard_section.section.name if obj.standard_section.section else None

    from apps.institutes.models import Institute
    institute_data = Institute.get_institute(view_self)

    # Use base64 data URL for QR; WeasyPrint embeds it reliably (wkhtmltopdf often fails with images)
    qr_data_url = get_qr_data_url(obj)
    context = {
        'gatepass': obj,
        'user_info': info,
        'institute': institute_data,
        'qr_data_url': qr_data_url,
    }
    default = 'gatepass_pdf.html'
    selected_template, _ = get_selected_template(view_self, 'gate_pass', 'pdf', default)
    template_path = 'gatepass/' + selected_template
    filename = obj.gate_pass_number
    return PDFService.receipt(view_self, context, filename, template_path, False)
