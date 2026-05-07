from datetime import date, datetime
from decimal import Decimal

from django.db import transaction
from rest_framework import exceptions

from apps.canteen.models.combo import ComboOptionGroup, ComboOptionItem, FoodCombo
from apps.canteen.models.food import FoodItem
from apps.canteen.models.meal_package import MealPackageUsage
from apps.canteen.models.menu import MenuItem
from apps.canteen.models.order import Order, OrderItem, OrderItemComboOption
from apps.canteen.serializers import (
    OrderItemComboOptionSerializer,
    OrderItemSerializer,
    OrderSerializer,
)
from apps.canteen.services import meal_package as meal_package_service
from apps.canteen.services import wallet as wallet_service
from apps.tenants.services.middlewares import get_current_db_name

def _generate_order_number():
    today_str = datetime.now().strftime("%Y%m%d")
    count = Order.objects.filter(created_at__date=date.today()).count() + 1
    return f"ORD-{today_str}-{count:04d}"


def _resolve_unit_price(menu_item, combo_id, food_item_id, idx):
    if menu_item and menu_item.price is not None:
        return Decimal(str(menu_item.price))
    if combo_id:
        try:
            combo_obj = FoodCombo.objects.get(pk=combo_id, is_active=True)
        except FoodCombo.DoesNotExist:
            raise exceptions.ValidationError(f"Item {idx + 1}: Combo not found.")
        return Decimal(str(combo_obj.price))
    try:
        food_obj = FoodItem.objects.get(pk=food_item_id, is_active=True)
    except FoodItem.DoesNotExist:
        raise exceptions.ValidationError(f"Item {idx + 1}: Food item not found.")
    return Decimal(str(food_obj.cost))


def _validate_combo_options(combo_id, combo_option_ids, idx):

    if not combo_option_ids or not combo_id:
        return [], Decimal("0.00")

    option_items = ComboOptionItem.objects.filter(
        pk__in=combo_option_ids, is_active=True
    ).select_related("option_group")

    if option_items.count() != len(combo_option_ids):
        raise exceptions.ValidationError(f"Item {idx + 1}: Some combo options not found.")

    group_selections = {}
    extra_price = Decimal("0.00")
    for opt in option_items:
        group_selections.setdefault(opt.option_group_id, []).append(opt)
        extra_price += Decimal(str(opt.extra_price))

    groups = ComboOptionGroup.objects.filter(combo_id=combo_id, is_active=True)
    for group in groups:
        selected = len(group_selections.get(group.pk, []))
        if selected < group.min_select:
            raise exceptions.ValidationError(
                f"Item {idx + 1}: Option group '{group.name}' requires "
                f"at least {group.min_select} selection(s), got {selected}."
            )
        if selected > group.max_select:
            raise exceptions.ValidationError(
                f"Item {idx + 1}: Option group '{group.name}' allows "
                f"at most {group.max_select} selection(s), got {selected}."
            )

    return list(option_items), extra_price

def create_order(user, data):
    items_data = data.get("items", [])
    if not items_data:
        raise exceptions.ValidationError("Order must have at least one item.")

    payment_mode = data.get("payment_mode", 0)
    order_type = data.get("order_type", 0)
    discount_amount = Decimal(str(data.get("discount_amount", 0)))
    subscription_id = data.get("meal_package_subscription")

    with transaction.atomic(using=get_current_db_name()):

        order_items_to_create = []
        total_amount = Decimal("0.00")

        for idx, item_data in enumerate(items_data):
            menu_item_id = item_data.get("menu_item")
            food_item_id = item_data.get("food_item")
            combo_id = item_data.get("combo")
            quantity = int(item_data.get("quantity", 1))
            combo_option_ids = item_data.get("combo_options", [])

            if quantity <= 0:
                raise exceptions.ValidationError(f"Item {idx + 1}: quantity must be at least 1.")

            menu_item = None
            if menu_item_id:
                try:
                    menu_item = MenuItem.objects.select_for_update().get(
                        pk=menu_item_id, is_active=True
                    )
                except MenuItem.DoesNotExist:
                    raise exceptions.ValidationError(f"Item {idx + 1}: Menu item not found.")

                if not food_item_id and menu_item.food_item_id:
                    food_item_id = menu_item.food_item_id
                if not combo_id and menu_item.combo_id:
                    combo_id = menu_item.combo_id

                if menu_item.quantity_available is not None:
                    remaining = menu_item.quantity_available - menu_item.quantity_sold
                    if remaining < quantity:
                        raise exceptions.ValidationError(
                            f"Item {idx + 1}: Only {remaining} left in stock."
                        )

            if bool(food_item_id) == bool(combo_id):
                raise exceptions.ValidationError(
                    f"Item {idx + 1}: Provide exactly one of food_item or combo."
                )

            unit_price = _resolve_unit_price(menu_item, combo_id, food_item_id, idx)
            resolved_options, extra_price = _validate_combo_options(combo_id, combo_option_ids, idx)

            effective_unit_price = unit_price + extra_price
            item_total = effective_unit_price * quantity
            total_amount += item_total

            order_items_to_create.append({
                "food_item_id": food_item_id if not combo_id else None,
                "combo_id": combo_id or None,
                "menu_item_id": menu_item_id,
                "quantity": quantity,
                "unit_price": effective_unit_price,
                "total_price": item_total,
                "combo_options": resolved_options,
                "menu_item_obj": menu_item,
            })

        net_amount = max(total_amount - discount_amount, Decimal("0.00"))

        if payment_mode == 0: 
            wallet = wallet_service.get_or_create_wallet(user)

        if payment_mode == 3 and not subscription_id:
            raise exceptions.ValidationError(
                "meal_package_subscription is required for package payment."
            )

        order_serializer = OrderSerializer(data={
            "order_number": _generate_order_number(),
            "user": user.pk,
            "order_type": order_type,
            "status": 0,    
            "payment_mode": payment_mode,
            "total_amount": total_amount,
            "discount_amount": discount_amount,
            "net_amount": net_amount,
            "meal_package_subscription": subscription_id,
            "notes": data.get("notes", ""),
            "pickup_time": data.get("pickup_time"),
        })
        order_serializer.is_valid(raise_exception=True)
        order = order_serializer.save()

        for item_info in order_items_to_create:
            item_serializer = OrderItemSerializer(data={
                "order": order.pk,
                "food_item": item_info["food_item_id"],
                "combo": item_info["combo_id"],
                "menu_item": item_info["menu_item_id"],
                "quantity": item_info["quantity"],
                "unit_price": item_info["unit_price"],
                "total_price": item_info["total_price"],
            })
            item_serializer.is_valid(raise_exception=True)
            order_item = item_serializer.save()

            for opt in item_info["combo_options"]:
                opt_serializer = OrderItemComboOptionSerializer(data={
                    "order_item": order_item.pk,
                    "combo_option_item": opt.pk,
                })
                opt_serializer.is_valid(raise_exception=True)
                opt_serializer.save()

            mi = item_info["menu_item_obj"]
            if mi:
                mi.quantity_sold += item_info["quantity"]
                mi.save(update_fields=["quantity_sold", "updated_at"])

        if payment_mode == 0 and net_amount > 0:
            wallet_service.deduct(
                wallet,
                net_amount,
                reference_type=1, 
                reference_id=order.pk,
                description=f"Payment for order {order.order_number}",
            )

        if payment_mode == 3:
            meal_package_service.record_usage(
                subscription_id=subscription_id,
                order_id=order.pk,
                usage_date=date.today(),
            )

    return order

def cancel_order(order_id):
    with transaction.atomic(using=get_current_db_name()):
        try:
            order = Order.objects.select_for_update().get(pk=order_id, is_active=True)
        except Order.DoesNotExist:
            raise exceptions.ValidationError("Order not found.")

        if order.status == 5:
            raise exceptions.ValidationError("Order is already cancelled.")
        if order.status >= 3:
            raise exceptions.ValidationError("Cannot cancel an order that is ready or delivered.")

        serializer = OrderSerializer(instance=order, data={"status": 5}, partial=True)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

        if order.payment_mode == 0 and order.net_amount > 0 and order.user:
            wallet = wallet_service.get_or_create_wallet(order.user)
            wallet_service.refund(
                wallet,
                order.net_amount,
                reference_id=order.pk,
                description=f"Refund for cancelled order {order.order_number}",
            )

        for oi in OrderItem.objects.filter(order=order, is_active=True):
            if oi.menu_item_id:
                try:
                    mi = MenuItem.objects.select_for_update().get(pk=oi.menu_item_id)
                    mi.quantity_sold = max(0, mi.quantity_sold - oi.quantity)
                    mi.save(update_fields=["quantity_sold", "updated_at"])
                except MenuItem.DoesNotExist:
                    pass

        if order.payment_mode == 3:
            MealPackageUsage.objects.filter(order=order, is_active=True).update(is_active=False)

    return order

VALID_TRANSITIONS = {
    0: [1, 5],      # Pending    → Confirmed | Cancelled
    1: [2, 5],      # Confirmed  → Preparing | Cancelled
    2: [3, 5],      # Preparing  → Ready     | Cancelled
    3: [4],         # Ready      → Delivered
}


def update_order_status(order_id, new_status):
    if new_status == 5:
        return cancel_order(order_id)

    with transaction.atomic(using=get_current_db_name()):
        try:
            order = Order.objects.select_for_update().get(pk=order_id, is_active=True)
        except Order.DoesNotExist:
            raise exceptions.ValidationError("Order not found.")

        valid_next = VALID_TRANSITIONS.get(order.status, [])
        if new_status not in valid_next:
            raise exceptions.ValidationError(
                f"Cannot change status from {order.get_status_display()} to status {new_status}."
            )

        serializer = OrderSerializer(instance=order, data={"status": new_status}, partial=True)
        serializer.is_valid(raise_exception=True)
        order = serializer.save()

    return order

def get_kitchen_summary(menu_date=None):
    if menu_date is None:
        menu_date = date.today()

    orders = Order.objects.filter(
        created_at__date=menu_date,
        is_active=True,
        status__in=[0, 1, 2, 3, 4],
    )

    order_items = OrderItem.objects.filter(
        order__in=orders, is_active=True
    ).select_related("order", "food_item", "combo")

    item_map = {}
    for oi in order_items:
        item_name = (oi.food_item.name if oi.food_item else
                     oi.combo.name if oi.combo else "Unknown")
        if item_name not in item_map:
            item_map[item_name] = {
                "item_name": item_name,
                "total_quantity": 0,
                "pending_count": 0,
                "preparing_count": 0,
                "ready_count": 0,
                "delivered_count": 0,
            }
        entry = item_map[item_name]
        entry["total_quantity"] += oi.quantity
        status = oi.order.status
        if status == 0 or status == 1:
            entry["pending_count"] += oi.quantity
        elif status == 2:
            entry["preparing_count"] += oi.quantity
        elif status == 3:
            entry["ready_count"] += oi.quantity
        elif status == 4:
            entry["delivered_count"] += oi.quantity

    summary = sorted(item_map.values(), key=lambda x: x["total_quantity"], reverse=True)

    return {
        "date": str(menu_date),
        "total_orders": orders.count(),
        "items": summary,
    }