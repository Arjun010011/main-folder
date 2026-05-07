from decimal import Decimal
from django.db.models import Sum, Q
from apps.finance.models.fee_advance import FeeAdvanceCollection, FeeAdvanceCollectionPaymentDetail


ZERO = Decimal('0.00')


def _parse_ids(val):
    if not val:
        return []
    if isinstance(val, list):
        return [int(x) for x in val if x is not None and str(x).strip()]
    if isinstance(val, str):
        return [int(x.strip()) for x in val.split(',') if x.strip()]
    return []


def calculate_advance_fees_for_asset(asset, up_to_date=None):
    
    config = asset.advance_fee_config
    if not config:
        return {
            "total_advance": Decimal('0'),
            "total_used": Decimal('0'),
            "net_advance": Decimal('0'),
            "collection_count": 0,
        }

    fee_advance_type_ids = _parse_ids(config.get('fee_advance_types', []))

    qs = FeeAdvanceCollection.objects.filter(is_active=True)

    if fee_advance_type_ids:
        qs = qs.filter(fee_advance_type_id__in=fee_advance_type_ids)

    if up_to_date:
        qs = qs.filter(transaction_date__lte=up_to_date)

    agg = qs.aggregate(total=Sum('amount'))
    total_advance = Decimal(str(agg['total'] or 0))

    used_qs = FeeAdvanceCollectionPaymentDetail.objects.filter(
        fee_advance_collection__in=qs
    )
    used_agg = used_qs.aggregate(total=Sum('amount'))
    total_used = Decimal(str(used_agg['total'] or 0))

    net_advance = total_advance - total_used

    return {
        "total_advance": float(total_advance),
        "total_used": float(total_used),
        "net_advance": float(net_advance),
        "collection_count": qs.count(),
    }


def compute_advance_fee_balance(asset, up_to_date=None):
    calc = calculate_advance_fees_for_asset(asset, up_to_date=up_to_date)
    return Decimal(str(calc['net_advance']))
