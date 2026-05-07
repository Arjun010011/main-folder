from django.db import transaction
from rest_framework import exceptions

from apps.canteen.models.mappings import StudentFeeMealPackageMapping, StaffMealPackagePayrollMapping
from apps.canteen.models.meal_package import MealPackage, MealPackageSubscription
from apps.canteen.serializers import (
    StudentFeeMealPackageMappingSerializer,
    StaffMealPackagePayrollMappingSerializer,
    MealPackageSubscriptionSerializer,
)
from apps.tenants.services.middlewares import get_current_db_name


def assign_meal_packages_for_student(student_user, custom_fee_id, package_ids, from_date, to_date, created_by=None):

    packages = MealPackage.objects.filter(pk__in=package_ids, is_active=True)
    if packages.count() != len(package_ids):
        raise exceptions.ValidationError("One or more meal packages not found.")

    mappings = []
    subscriptions = []

    with transaction.atomic(using=get_current_db_name()):
        for package in packages:
            existing = StudentFeeMealPackageMapping.objects.filter(
                custom_fee_id=custom_fee_id,
                meal_package=package,
                is_active=True,
            ).first()

            if existing:
                serializer = StudentFeeMealPackageMappingSerializer(
                    instance=existing,
                    data={"from_date": from_date, "to_date": to_date},
                    partial=True,
                )
                serializer.is_valid(raise_exception=True)
                mapping = serializer.save()
            else:
                serializer = StudentFeeMealPackageMappingSerializer(data={
                    "custom_fee": custom_fee_id,
                    "meal_package": package.pk,
                    "from_date": from_date,
                    "to_date": to_date,
                    "created_by": created_by.pk if created_by else None,
                })
                serializer.is_valid(raise_exception=True)
                mapping = serializer.save()

            mappings.append(mapping)

            # Auto-create or refresh subscription for the student
            end_date = to_date or package.end_date
            existing_sub = MealPackageSubscription.objects.filter(
                package=package,
                user=student_user,
                start_date=from_date,
            ).first()

            if existing_sub:
                sub_serializer = MealPackageSubscriptionSerializer(
                    instance=existing_sub,
                    data={"end_date": end_date, "status": 0},
                    partial=True,
                )
                sub_serializer.is_valid(raise_exception=True)
                sub = sub_serializer.save()
            else:
                sub_serializer = MealPackageSubscriptionSerializer(data={
                    "package": package.pk,
                    "user": student_user.pk,
                    "status": 0,    # Active
                    "start_date": from_date,
                    "end_date": end_date,
                })
                sub_serializer.is_valid(raise_exception=True)
                sub = sub_serializer.save()

            subscriptions.append(sub)

    return mappings, subscriptions


def remove_student_meal_packages(custom_fee_id, package_ids=None):
    with transaction.atomic(using=get_current_db_name()):
        qs = StudentFeeMealPackageMapping.objects.filter(
            custom_fee_id=custom_fee_id,
            is_active=True,
        )
        if package_ids:
            qs = qs.filter(meal_package_id__in=package_ids)
        qs.update(is_active=False)


def assign_meal_package_for_staff(staff, package_id, salary_component_id, amount, from_date, to_date, created_by=None):
    try:
        package = MealPackage.objects.get(pk=package_id, is_active=True)
    except MealPackage.DoesNotExist:
        raise exceptions.ValidationError("Meal package not found.")

    with transaction.atomic(using=get_current_db_name()):
        existing_mapping = StaffMealPackagePayrollMapping.objects.filter(
            staff=staff,
            meal_package=package,
            is_active=True,
        ).first()

        update_data = {
            "salary_component": salary_component_id,
            "amount": amount,
            "from_date": from_date,
            "to_date": to_date,
        }

        if existing_mapping:
            serializer = StaffMealPackagePayrollMappingSerializer(
                instance=existing_mapping,
                data=update_data,
                partial=True,
            )
            serializer.is_valid(raise_exception=True)
            mapping = serializer.save()
        else:
            serializer = StaffMealPackagePayrollMappingSerializer(data={
                "staff": staff.pk,
                "meal_package": package.pk,
                "created_by": created_by.pk if created_by else None,
                **update_data,
            })
            serializer.is_valid(raise_exception=True)
            mapping = serializer.save()

        sub = None
        if hasattr(staff, "user") and staff.user:
            end_date = to_date or package.end_date
            existing_sub = MealPackageSubscription.objects.filter(
                package=package,
                user=staff.user,
                start_date=from_date,
            ).first()

            if existing_sub:
                sub_serializer = MealPackageSubscriptionSerializer(
                    instance=existing_sub,
                    data={"end_date": end_date, "status": 0},
                    partial=True,
                )
                sub_serializer.is_valid(raise_exception=True)
                sub = sub_serializer.save()
            else:
                sub_serializer = MealPackageSubscriptionSerializer(data={
                    "package": package.pk,
                    "user": staff.user.pk,
                    "status": 0,
                    "start_date": from_date,
                    "end_date": end_date,
                })
                sub_serializer.is_valid(raise_exception=True)
                sub = sub_serializer.save()

    return mapping, sub


def get_student_meal_mappings(custom_fee_id):
    return StudentFeeMealPackageMapping.objects.filter(
        custom_fee_id=custom_fee_id,
        is_active=True,
    ).select_related("meal_package")


def get_staff_meal_mappings(staff_id):
    return StaffMealPackagePayrollMapping.objects.filter(
        staff_id=staff_id,
        is_active=True,
    ).select_related("meal_package", "salary_component")