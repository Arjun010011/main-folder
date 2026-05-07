import re

from django.db import transaction

from apps.library.models.master import BookCopy
from apps.library.models.stock_verification import StockVerification
from rest_framework import exceptions
from apps.library.serializers import StockVerificationSerializer
from apps.tenants.services.middlewares import get_current_db_name

# Max book numbers to expand in one request (inclusive range size)
MAX_SEQUENCE_RANGE = 10000

_BARCODE_TAIL_DIGITS = re.compile(r"^(.+?)(\d+)$")


def _split_barcode_tail(bar_code):
    """Split barcode into (prefix, digit_string) e.g. PU004123 -> ('PU', '004123'). Pure digits allowed."""
    s = (bar_code or "").strip()
    if not s:
        raise exceptions.ValidationError("Book number is required.")
    # Pure numeric barcodes (e.g. 4138, 6000) — no letter prefix
    if s.isdigit():
        return "", s
    m = _BARCODE_TAIL_DIGITS.match(s)
    if not m:
        raise exceptions.ValidationError(
            "Book number must be all digits or end with digits and a prefix (e.g. PU004123)."
        )
    return m.group(1), m.group(2)


def build_expected_barcodes(start_barcode: str, end_barcode: str):
    """
    Build every barcode in the numeric sequence from start to end (same prefix, zero-padded width).
    """
    p1, d1 = _split_barcode_tail(start_barcode)
    p2, d2 = _split_barcode_tail(end_barcode)
    if p1 != p2:
        raise exceptions.ValidationError(
            "Start and end book numbers must share the same prefix (e.g. PU004000 and PU004100)."
        )
    n1, n2 = int(d1), int(d2)
    if n1 > n2:
        n1, n2 = n2, n1
    width = max(len(d1), len(d2))
    count = n2 - n1 + 1
    if count > MAX_SEQUENCE_RANGE:
        raise exceptions.ValidationError(
            f"Range is too large (maximum {MAX_SEQUENCE_RANGE} book numbers per request)."
        )
    expected = [f"{p1}{str(i).zfill(width)}" for i in range(n1, n2 + 1)]
    return p1, n1, n2, width, expected


def get_missing_sequence_report(request):
    """
    Query params: start_barcode, end_barcode
    Optional: stock_verification_parent_id — if set, also lists books in catalog but not verified yet.
    """
    start_barcode = request.query_params.get("start_barcode")
    end_barcode = request.query_params.get("end_barcode")
    parent_id = request.query_params.get("stock_verification_parent_id")

    if not start_barcode or not end_barcode:
        raise exceptions.ValidationError(
            "start_barcode and end_barcode are required."
        )

    prefix, n1, n2, width, expected = build_expected_barcodes(
        start_barcode, end_barcode
    )
    expected_set = set(expected)

    existing = set(
        BookCopy.objects.filter(bar_code__in=expected).values_list(
            "bar_code", flat=True
        )
    )

    missing_in_catalog = sorted(expected_set - existing)

    result = {
        "prefix": prefix,
        "start_number": n1,
        "end_number": n2,
        "digit_width": width,
        "total_expected": len(expected),
        "found_in_catalog": len(existing),
        "missing_in_catalog": missing_in_catalog,
    }

    if parent_id:
        verified = set(
            StockVerification.objects.filter(
                is_active=True,
                stock_verification_parent_id=parent_id,
                book_copy__bar_code__in=expected,
            ).values_list("book_copy__bar_code", flat=True)
        )
        not_yet_verified = sorted([b for b in existing if b not in verified])
        result["verified_in_this_session"] = len(verified)
        result["not_yet_verified"] = not_yet_verified

    return {"data": result}

def add_stock_verification(self, data):
    book_bar_code_list = []
    stock_verification_parent_id = data['stock_verification_parent_id']
    data_to_save = []
    for row_data in data['data_list']:
        book_bar_code_list.append(row_data['bar_code'])
    book_copy_list = {bc['bar_code'] : bc for bc in BookCopy.objects.filter(
        bar_code__in=book_bar_code_list
    ).values('bar_code', 'id')}
    for bar_code in book_bar_code_list:
        if bar_code not in book_copy_list:
            raise exceptions.ValidationError(f'{bar_code} bar code doesnot exist')
        data_to_save.append(
            {
                'stock_verification_parent': stock_verification_parent_id,
                'verified_by': self.request.user.id,
                'verified_date': data['fordate'],
                'book_copy': book_copy_list[bar_code]['id']
            }
        )
    existing_bar_code = StockVerification.objects.filter(is_active=True, stock_verification_parent=stock_verification_parent_id).values_list('book_copy__bar_code', flat=True)
    for bar_code in book_bar_code_list:
        if bar_code in existing_bar_code:
            raise exceptions.ValidationError(f'{bar_code} bar code already exist')
    with transaction.atomic(using=get_current_db_name()):
        ser = StockVerificationSerializer(data=data_to_save, many=True)
        ser.is_valid(raise_exception=True)
        ser.save()
    return {'Reason':'Data Added Successfully'}