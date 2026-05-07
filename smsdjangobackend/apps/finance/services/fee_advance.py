import datetime

from num2words import num2words
from rest_framework import exceptions

from apps.institutes.models import Institute
from apps.shared.services import PDFService
from apps.shared.services_shared.common import get_selected_template
from apps.finance.serializers import FeeAdvanceCollectionSerializer, DepositWithdrawRecordSerializer
from django.contrib.contenttypes.models import ContentType
from django.db import transaction
from apps.finance.models.fee_advance import FeeAdvanceType, FeeAdvanceCollection
from apps.tenants.services.middlewares import get_current_db_name

# Payload keys for create / merged checks on update
_FEE_ADVANCE_COLLECTION_REQUIRED_FIELDS = (
    'fee_advance_type',
    'academic_year',
    'student',
    'amount',
    'transaction_date',
    'receipt_num',
    'mode_of_payment',
    'payment_note',
)


def validate_fee_advance_collection_data(data, instance=None, partial=False):
    """
    Business validation for FeeAdvanceCollection (create/update).
    - All listed fields mandatory on create; on partial update, merge instance for checks.
    - FKs: id must be present (from request or merged instance) and must exist in DB.
    - amount > 0; non-blank payment/receipt text fields.
    - Total advances capped when approved fee standard mapping exists (see calculations).
    """
    from apps.finance.services.calculations import validate_fee_advance_collection_amount
    from apps.institutes.models.academicYear import AcademicYear
    from apps.students.models.student import Student

    merged = dict(data)

    if instance:
        for fname in _FEE_ADVANCE_COLLECTION_REQUIRED_FIELDS:
            if fname not in merged or merged[fname] is None:
                merged[fname] = getattr(instance, fname)
    elif not partial:
        missing = [f for f in _FEE_ADVANCE_COLLECTION_REQUIRED_FIELDS if f not in merged or merged[f] is None]
        if missing:
            raise exceptions.ValidationError({f: 'This field is required.' for f in missing})

    fee_advance_type_id = merged.get('fee_advance_type')
    if fee_advance_type_id is not None and hasattr(fee_advance_type_id, 'pk'):
        fee_advance_type_id = fee_advance_type_id.pk
    if fee_advance_type_id is None:
        raise exceptions.ValidationError({'fee_advance_type': 'This field is required.'})
    if not FeeAdvanceType.objects.filter(pk=fee_advance_type_id).exists():
        raise exceptions.ValidationError({'fee_advance_type': 'Invalid fee advance type id.'})

    student_id = merged.get('student')
    if student_id is not None and hasattr(student_id, 'pk'):
        student_id = student_id.pk
    academic_year_id = merged.get('academic_year')
    if academic_year_id is not None and hasattr(academic_year_id, 'pk'):
        academic_year_id = academic_year_id.pk
    if student_id is None:
        raise exceptions.ValidationError({'student': 'This field is required.'})
    if academic_year_id is None:
        raise exceptions.ValidationError({'academic_year': 'This field is required.'})
    if not Student.objects.filter(pk=student_id).exists():
        raise exceptions.ValidationError({'student': 'Invalid student id.'})
    if not AcademicYear.objects.filter(pk=academic_year_id).exists():
        raise exceptions.ValidationError({'academic_year': 'Invalid academic year id.'})

    amount = merged.get('amount')
    if amount is None:
        raise exceptions.ValidationError({'amount': 'This field is required.'})
    try:
        amount_f = float(amount)
    except (TypeError, ValueError):
        raise exceptions.ValidationError({'amount': 'Enter a valid number.'})
    if amount_f <= 0:
        raise exceptions.ValidationError({'amount': 'Amount must be greater than zero.'})

    for text_f in ('receipt_num', 'mode_of_payment'):
        val = merged.get(text_f)
        if val is None:
            raise exceptions.ValidationError({text_f: 'This field is required.'})
        if isinstance(val, str) and not val.strip():
            raise exceptions.ValidationError({text_f: 'This field may not be blank.'})

    validate_fee_advance_collection_amount(
        student_id,
        academic_year_id,
        amount_f,
        exclude_collection_id=instance.pk if instance else None,
    )


def _cash_toward_term_principal(payment_detail):
    """Amount from PaymentDetail that counts toward term fee (excludes fine portion)."""
    ap = float(payment_detail.amount_paid or 0)
    ff = float(payment_detail.fee_fine_amount or 0)
    return max(0.0, ap - ff)


def sync_fee_advance_payment_details_for_fee_collection(
    fee_collection,
    academic_year_id,
    student_id,
    standard_fee_rows,
    payment_detail_saved_datas,
):
    """
    Persist how much fee advance applies to each fee_plan when a fee collection is saved.

    Rows: FeeAdvanceCollectionPaymentDetail (fee_advance_collection, fee_plan, amount).

    - Term principal = FeePlan.rate (same academic year as mapping).
    - Depletes advances in FeeAdvanceCollection id order (aligned with fee_calculation).
    """
    from django.db.models import Sum

    from apps.finance.models.fee import FeePlan
    from apps.finance.models.feeCollection import PaymentDetail
    from apps.finance.models.fee_advance import FeeAdvanceCollection, FeeAdvanceCollectionPaymentDetail

    if not student_id or not academic_year_id:
        return
    if not standard_fee_rows or not payment_detail_saved_datas:
        return

    try:
        ay_id = int(academic_year_id)
        stud_id = int(student_id)
    except (TypeError, ValueError):
        return

    advances = list(
        FeeAdvanceCollection.objects.filter(
            student_id=stud_id,
            academic_year_id=ay_id,
            is_active=True,
        ).order_by('id')
    )
    if not advances:
        return

    remaining = {}
    for adv in advances:
        used = (
            FeeAdvanceCollectionPaymentDetail.objects.filter(
                fee_advance_collection_id=adv.id,
            ).aggregate(s=Sum('amount'))['s']
            or 0
        )
        remaining[adv.id] = max(0.0, float(adv.amount) - float(used))

    # Map saved payment details by fee plan to avoid relying on list index ordering.
    payment_detail_by_fee_plan = {}
    for pd in payment_detail_saved_datas:
        if not pd or not getattr(pd, 'pk', None):
            continue
        if getattr(pd, 'fee_collection_id', None) != getattr(fee_collection, 'id', None):
            continue
        pd_fee_plan_id = getattr(pd, 'fee_plan_id', None)
        if pd_fee_plan_id:
            payment_detail_by_fee_plan[pd_fee_plan_id] = pd

    for term in standard_fee_rows:
        fee_plan_id = term.get('fee_plan')
        if not fee_plan_id:
            continue
        pd = payment_detail_by_fee_plan.get(fee_plan_id)
        if not pd:
            continue

        try:
            fp = FeePlan.objects.select_related('standard_fee').get(pk=fee_plan_id)
        except FeePlan.DoesNotExist:
            continue
        if not fp.standard_fee or fp.standard_fee.academic_year_id != ay_id:
            continue

        term_cap = float(fp.rate or 0)
        if term_cap <= 0:
            continue

        prior_qs = PaymentDetail.objects.filter(
            fee_plan_id=fee_plan_id,
            fee_collection__student_id=stud_id,
            fee_collection__is_active=True,
        ).exclude(pk=pd.pk)

        prior_pd_term = 0.0
        for q in prior_qs:
            prior_pd_term += _cash_toward_term_principal(q)

        prior_adv = (
            FeeAdvanceCollectionPaymentDetail.objects.filter(
                fee_plan_id=fee_plan_id,
                fee_advance_collection__student_id=stud_id,
                fee_advance_collection__academic_year_id=ay_id,
                fee_advance_collection__is_active=True,
            ).aggregate(s=Sum('amount'))['s']
            or 0
        )
        prior_adv = float(prior_adv)

        cash_toward_term = _cash_toward_term_principal(pd)

        # Principal still covered by advance after this cash payment toward the term.
        need_from_advance = term_cap - prior_pd_term - prior_adv - cash_toward_term
        if need_from_advance <= 0:
            continue

        total_remaining = sum(remaining.values())
        if total_remaining <= 0:
            continue

        need_from_advance = min(need_from_advance, total_remaining)

        for adv in advances:
            if need_from_advance <= 0:
                break
            r = remaining.get(adv.id, 0.0)
            if r <= 0:
                continue
            take = min(r, need_from_advance)
            if take > 0:
                FeeAdvanceCollectionPaymentDetail.objects.create(
                    fee_advance_collection_id=adv.id,
                    fee_plan_id=fee_plan_id,
                    amount=round(take, 2),
                )
                remaining[adv.id] = r - take
                need_from_advance -= take


def create_fee_advance_collection(data, request=None):
    """Validate payload then persist via serializer.save()."""
    if 'bank_detail_id' in data and data['bank_detail_id']:
        data['bank_detail'] = data['bank_detail_id']
        del data['bank_detail_id']
    validate_fee_advance_collection_data(data, instance=None, partial=False)
    deposit_data = {}
    if data.get('bank_detail'):
        deposit_data = {
            "bank_to": data['bank_detail'],
            "date": data.get('transaction_date'),
            "transaction_type": 1,
            "transaction_from": 6,
            "amount": data['amount'],
            "created_by": request.user.id if request and request.user else None,
        }
    with transaction.atomic(using=get_current_db_name()):
        serializer = FeeAdvanceCollectionSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if deposit_data:
            fee_advance_obj = FeeAdvanceCollection.objects.get(id=serializer.data['id'])
            content_type = ContentType.objects.get_for_model(fee_advance_obj)
            deposit_data['content_type'] = content_type.id
            deposit_data['object_id'] = fee_advance_obj.pk
            depositserializer = DepositWithdrawRecordSerializer(data=deposit_data)
            depositserializer.is_valid(raise_exception=True)
            depositserializer.save()
    return serializer


def update_fee_advance_collection(instance, data, partial=False):
    """Validate merged business rules then persist via serializer.save()."""

    validate_fee_advance_collection_data(data, instance=instance, partial=partial)
    serializer = FeeAdvanceCollectionSerializer(instance, data=data, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return serializer


def get_fee_advance_receipt(self, localPath=False):
    """Generate PDF receipt for a FeeAdvanceCollection record."""
    selected_template, number_of_copies = get_selected_template(
        self, 'fee_advance_receipt', 'pdf', 'default_fee_advance_receipt.html'
    )
    path = 'fee_advance_receipts/' + selected_template
    fee_advance_collection = self.get_object()
    today = datetime.datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    amount_in_words = num2words(fee_advance_collection.amount, lang='en') + ' Rupees'
    data = {
        'fee_advance_collection': fee_advance_collection,
        'today': today,
        'institute': Institute.get_institute(self),
        'amount_in_words': amount_in_words,
        'number_of_copies': range(number_of_copies),
    }
    receipt_num = fee_advance_collection.receipt_num or f'FA-{fee_advance_collection.id}'
    response = PDFService.receipt_new(self, data, receipt_num, path, localPath)
    return response
