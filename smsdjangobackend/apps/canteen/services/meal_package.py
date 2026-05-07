from datetime import date, timedelta

from django.db import transaction
from rest_framework import exceptions

from apps.canteen.models.meal_package import (
    MealPackage,
    MealPackageSubscription,
    MealPackageUsage,
)
from apps.canteen.serializers import (
    MealPackageSubscriptionSerializer,
    MealPackageUsageSerializer,
)
from apps.tenants.services.middlewares import get_current_db_name


def subscribe(user, package_id, start_date, end_date):
    try:
        package = MealPackage.objects.get(pk=package_id, is_active=True)
    except MealPackage.DoesNotExist:
        raise exceptions.ValidationError("Meal package not found or is inactive.")

    if start_date > end_date:
        raise exceptions.ValidationError("start_date cannot be after end_date.")

    with transaction.atomic(using=get_current_db_name()):
        serializer = MealPackageSubscriptionSerializer(data={
            "package": package.pk,
            "user": user.pk,
            "status": 0,   
            "start_date": start_date,
            "end_date": end_date,
        })
        serializer.is_valid(raise_exception=True)
        subscription = serializer.save()

    return subscription


def check_eligibility(subscription, usage_date=None):
    if usage_date is None:
        usage_date = date.today()

    if subscription.status != 0:
        return False, "Subscription is not active."

    if usage_date < subscription.start_date or usage_date > subscription.end_date:
        return False, "Usage date is outside the subscription period."

    weekday = str(usage_date.weekday())     # 0=Mon … 6=Sun
    package_items = subscription.package.meal_package_item_package.filter(is_active=True)
    if package_items.exists():
        has_valid_day = any(
            weekday in [d.strip() for d in item.days_of_week.split(",") if d.strip()]
            for item in package_items
        )
        if not has_valid_day:
            return False, "No meals available for this day of the week."

    return True, "Eligible"


def record_usage(subscription_id, order_id, usage_date, quantity=1):
    try:
        subscription = MealPackageSubscription.objects.select_related("package").get(
            pk=subscription_id, is_active=True
        )
    except MealPackageSubscription.DoesNotExist:
        raise exceptions.ValidationError("Subscription not found.")

    eligible, reason = check_eligibility(subscription, usage_date)
    if not eligible:
        raise exceptions.ValidationError(reason)

    with transaction.atomic(using=get_current_db_name()):
        serializer = MealPackageUsageSerializer(data={
            "subscription": subscription.pk,
            "order": order_id,
            "usage_date": usage_date,
            "quantity": quantity,
        })
        serializer.is_valid(raise_exception=True)
        usage = serializer.save()

    return usage


def get_remaining_usage(subscription):
    total_used = (
        MealPackageUsage.objects
        .filter(subscription=subscription, is_active=True)
        .values_list("quantity", flat=True)
    )
    total_used_count = sum(total_used)

    package_items = subscription.package.meal_package_item_package.all()
    if package_items.exists():
        total_allowed = 0
        current = subscription.start_date
        while current <= subscription.end_date:
            weekday = str(current.weekday())
            for item in package_items:
                allowed_days = [d.strip() for d in item.days_of_week.split(",") if d.strip()]
                if weekday in allowed_days:
                    total_allowed += item.quantity
            current += timedelta(days=1)
    else:
        total_allowed = (subscription.end_date - subscription.start_date).days + 1

    return {
        "total_allowed": total_allowed,
        "total_used": total_used_count,
        "remaining": max(0, total_allowed - total_used_count),
    }


def get_active_subscriptions(user):
    today = date.today()
    return MealPackageSubscription.objects.filter(
        user=user,
        status=0,
        is_active=True,
        start_date__lte=today,
        end_date__gte=today,
    ).select_related("package")