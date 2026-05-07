from decimal import Decimal

from django.db import transaction
from rest_framework import exceptions

from apps.canteen.models.wallet import Wallet, WalletTransaction
from apps.canteen.serializers import WalletTransactionSerializer
from apps.tenants.services.middlewares import get_current_db_name


def get_or_create_wallet(user):
    wallet, _ = Wallet.objects.get_or_create(user=user, defaults={"balance": 0})
    return wallet


def top_up(wallet, amount, description="Wallet top-up"):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise exceptions.ValidationError("Top-up amount must be greater than zero.")

    with transaction.atomic(using=get_current_db_name()):
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        balance_before = wallet.balance
        new_balance = wallet.balance + amount
        wallet.balance = new_balance
        wallet.save(update_fields=["balance", "updated_at"])

        serializer = WalletTransactionSerializer(data={
            "wallet": wallet.pk,
            "transaction_type": 0,          
            "amount": amount,
            "balance_before": balance_before,
            "balance_after": new_balance,
            "reference_type": 0,          
            "description": description,
        })
        serializer.is_valid(raise_exception=True)
        tx = serializer.save()

    return wallet, tx


def deduct(wallet, amount, reference_type, reference_id=None, description=""):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise exceptions.ValidationError("Deduction amount must be greater than zero.")

    with transaction.atomic(using=get_current_db_name()):
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        if wallet.balance < amount:
            raise exceptions.ValidationError(
                f"Insufficient wallet balance. Available: ₹{wallet.balance}, Required: ₹{amount}"
            )

        balance_before = wallet.balance
        new_balance = wallet.balance - amount
        wallet.balance = new_balance
        wallet.save(update_fields=["balance", "updated_at"])

        serializer = WalletTransactionSerializer(data={
            "wallet": wallet.pk,
            "transaction_type": 1,          
            "amount": amount,
            "balance_before": balance_before,
            "balance_after": new_balance,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "description": description,
        })
        serializer.is_valid(raise_exception=True)
        tx = serializer.save()

    return wallet, tx


def refund(wallet, amount, reference_id=None, description="Refund"):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise exceptions.ValidationError("Refund amount must be greater than zero.")

    with transaction.atomic(using=get_current_db_name()):
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
        balance_before = wallet.balance
        new_balance = wallet.balance + amount
        wallet.balance = new_balance
        wallet.save(update_fields=["balance", "updated_at"])

        serializer = WalletTransactionSerializer(data={
            "wallet": wallet.pk,
            "transaction_type": 0,          
            "amount": amount,
            "balance_before": balance_before,
            "balance_after": new_balance,
            "reference_type": 3,            
            "reference_id": reference_id,
            "description": description,
        })
        serializer.is_valid(raise_exception=True)
        tx = serializer.save()

    return wallet, tx


def top_up_by_wallet_id(wallet_id, amount, description="Wallet top-up"):
    if not amount:
        raise exceptions.ValidationError("amount is required.")

    try:
        wallet = Wallet.objects.get(pk=wallet_id, is_active=True)
    except Wallet.DoesNotExist:
        raise exceptions.ValidationError("Wallet not found.")

    return top_up(wallet, amount, description)