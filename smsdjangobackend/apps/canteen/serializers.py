from django.db import models
from rest_framework import serializers
from rest_framework import exceptions

from .models import (
    FoodCategory,
    FoodItem,
    FoodCombo,
    FoodComboItem,
    ComboOptionGroup,
    ComboOptionItem,
    Menu,
    MenuItem,
    MenuDiscount,
    Order,
    OrderItem,
    OrderItemComboOption,
    Wallet,
    WalletTransaction,
    MealPackage,
    MealPackageItem,
    MealPackageSubscription,
    MealPackageUsage,
    StudentFeeMealPackageMapping,
    StaffMealPackagePayrollMapping,
    FoodRequestConfig,
    FoodRequest,
)


def _validate_food_or_combo(food_item, combo, prefix=""):
    if bool(food_item) == bool(combo):
        raise exceptions.ValidationError(
            f"{prefix}Provide exactly one of food_item or combo."
        )

class FoodCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = "__all__"


class FoodCategoryReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCategory
        fields = "__all__"


class FoodItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodItem
        fields = "__all__"


class FoodItemReadSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name', default=None)

    class Meta:
        model = FoodItem
        fields = "__all__"

class FoodComboSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodCombo
        fields = "__all__"


class FoodComboItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodComboItem
        fields = "__all__"


class ComboOptionGroupSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComboOptionGroup
        fields = "__all__"


class ComboOptionItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ComboOptionItem
        fields = "__all__"


class ComboOptionItemReadSerializer(serializers.ModelSerializer):
    food_item = FoodItemReadSerializer(read_only=True)

    class Meta:
        model = ComboOptionItem
        fields = "__all__"


class ComboOptionGroupReadSerializer(serializers.ModelSerializer):
    options = ComboOptionItemReadSerializer(
        source="combo_option_item_option_group",
        many=True,
        read_only=True,
    )

    class Meta:
        model = ComboOptionGroup
        fields = "__all__"


class FoodComboItemReadSerializer(serializers.ModelSerializer):
    food_item = FoodItemReadSerializer(read_only=True)

    class Meta:
        model = FoodComboItem
        fields = "__all__"


class FoodComboReadSerializer(serializers.ModelSerializer):

    items = FoodComboItemReadSerializer(
        source="food_combo_item_combo",
        many=True,
        read_only=True,
    )

    option_groups = ComboOptionGroupReadSerializer(
        source="combo_option_group_combo",
        many=True,
        read_only=True,
    )

    class Meta:
        model = FoodCombo
        fields = "__all__"

class MenuSerializer(serializers.ModelSerializer):
    class Meta:
        model = Menu
        fields = "__all__"


class MenuDiscountSerializer(serializers.ModelSerializer):
    class Meta:
        model = MenuDiscount
        fields = "__all__"


class MenuDiscountReadSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.SerializerMethodField()

    class Meta:
        model = MenuDiscount
        fields = "__all__"

    def get_menu_item_name(self, obj):
        if obj.menu_item:
            if obj.menu_item.food_item:
                return obj.menu_item.food_item.name
            if obj.menu_item.combo:
                return obj.menu_item.combo.name
        return None


class MenuItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuItem
        fields = "__all__"

    def validate(self, attrs):
        food_item = attrs.get("food_item", getattr(self.instance, "food_item", None))
        combo = attrs.get("combo", getattr(self.instance, "combo", None))
        _validate_food_or_combo(food_item, combo, "MenuItem: ")
        return attrs


class MenuItemReadSerializer(serializers.ModelSerializer):

    food_item = FoodItemReadSerializer(read_only=True)
    combo = FoodComboReadSerializer(read_only=True)
    discount_info = serializers.SerializerMethodField()

    class Meta:
        model = MenuItem
        fields = "__all__"

    def get_discount_info(self, obj):
        discounts = MenuDiscount.objects.filter(
            is_active=True,
            menu=obj.menu,
        ).filter(
            models.Q(scope=0) | models.Q(scope=1, menu_item=obj)
        )
        if not discounts.exists():
            return None
        result = []
        for d in discounts:
            result.append({
                'id': d.id,
                'type': d.discount_type,
                'type_display': d.get_discount_type_display(),
                'scope': d.scope,
                'value': str(d.value),
                'label': d.label,
            })
        return result


class MenuReadSerializer(serializers.ModelSerializer):

    items = serializers.SerializerMethodField()
    discounts = MenuDiscountReadSerializer(
        source="menu_discount_menu",
        many=True,
        read_only=True,
    )

    class Meta:
        model = Menu
        fields = "__all__"

    def get_items(self, obj):
        items = obj.menu_item_menu.filter(is_active=True)
        return MenuItemReadSerializer(items, many=True).data


# ──────────────────────────────────────────────────────────────
#  ORDER
# ──────────────────────────────────────────────────────────────

class OrderSerializer(serializers.ModelSerializer):

    class Meta:
        model = Order
        fields = "__all__"


class OrderReadSerializer(serializers.ModelSerializer):

    items = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    payment_mode_display = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = "__all__"

    def get_items(self, obj):
        items = obj.order_item_order.filter(is_active=True)
        return OrderItemReadSerializer(items, many=True).data

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_payment_mode_display(self, obj):
        return obj.get_payment_mode_display()

    def get_username(self, obj):
        if obj.user:
            return getattr(obj.user, 'username', None)
        return None

    def get_user_display_name(self, obj):
        if obj.user:
            first_name = getattr(obj.user, 'first_name', '')
            last_name = getattr(obj.user, 'last_name', '')
            name = f"{first_name} {last_name}".strip()
            return name if name else getattr(obj.user, 'username', '')
        return None


class OrderItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = OrderItem
        fields = "__all__"

    def validate(self, attrs):
        food_item = attrs.get("food_item", getattr(self.instance, "food_item", None))
        combo = attrs.get("combo", getattr(self.instance, "combo", None))
        _validate_food_or_combo(food_item, combo, "OrderItem: ")
        return attrs


class OrderItemReadSerializer(serializers.ModelSerializer):

    food_item_name = serializers.SerializerMethodField()
    combo_name = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = "__all__"

    def get_food_item_name(self, obj):
        return obj.food_item.name if obj.food_item else None

    def get_combo_name(self, obj):
        return obj.combo.name if obj.combo else None


class OrderItemComboOptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItemComboOption
        fields = "__all__"


class OrderItemComboOptionReadSerializer(serializers.ModelSerializer):

    combo_option_item = ComboOptionItemReadSerializer(read_only=True)

    class Meta:
        model = OrderItemComboOption
        fields = "__all__"

class WalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = Wallet
        fields = "__all__"


class WalletReadSerializer(serializers.ModelSerializer):

    username = serializers.SerializerMethodField()
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = "__all__"

    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

    def get_user_display_name(self, obj):
        if obj.user:
            staff = getattr(obj.user, 'staff', None)
            student = getattr(obj.user, 'student', None)
            person = staff or student
            if person:
                parts = [
                    getattr(person, 'first_name', '') or '',
                    getattr(person, 'middle_name', '') or '',
                    getattr(person, 'last_name', '') or '',
                ]
                name = ' '.join(p for p in parts if p).strip()
                if name:
                    return name
            return obj.user.username
        return None


class WalletTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WalletTransaction
        fields = "__all__"


class WalletTransactionReadSerializer(serializers.ModelSerializer):
    transaction_type_display = serializers.SerializerMethodField()
    reference_type_display = serializers.SerializerMethodField()

    class Meta:
        model = WalletTransaction
        fields = "__all__"

    def get_transaction_type_display(self, obj):
        return obj.get_transaction_type_display()

    def get_reference_type_display(self, obj):
        return obj.get_reference_type_display()


# ──────────────────────────────────────────────────────────────
#  MEAL PACKAGE
# ──────────────────────────────────────────────────────────────

class MealPackageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPackage
        fields = "__all__"


class MealPackageItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = MealPackageItem
        fields = "__all__"

    def validate(self, attrs):
        food_item = attrs.get("food_item", getattr(self.instance, "food_item", None))
        combo = attrs.get("combo", getattr(self.instance, "combo", None))
        _validate_food_or_combo(food_item, combo, "MealPackageItem: ")
        return attrs


class MealPackageSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPackageSubscription
        fields = "__all__"

    def validate(self, attrs):
        start_date = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end_date = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start_date and end_date and start_date > end_date:
            raise exceptions.ValidationError("start_date cannot be after end_date.")
        return attrs


class MealPackageUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = MealPackageUsage
        fields = "__all__"


class MealPackageItemReadSerializer(serializers.ModelSerializer):

    food_item = FoodItemReadSerializer(read_only=True)
    combo = FoodComboReadSerializer(read_only=True)

    class Meta:
        model = MealPackageItem
        fields = "__all__"


class MealPackageReadSerializer(serializers.ModelSerializer):

    items = MealPackageItemReadSerializer(
        source="meal_package_item_package",
        many=True,
        read_only=True,
    )
    meal_type_display = serializers.SerializerMethodField()
    available_for_display = serializers.SerializerMethodField()
    duration_display = serializers.SerializerMethodField()

    class Meta:
        model = MealPackage
        fields = "__all__"

    def get_meal_type_display(self, obj):
        return obj.get_meal_type_display()

    def get_available_for_display(self, obj):
        return obj.get_available_for_display()

    def get_duration_display(self, obj):
        d = obj.duration_days
        if d and d >= 365 and d % 365 == 0:
            y = d // 365
            return f"{y} Year" if y == 1 else f"{y} Years"
        if d and d >= 30 and d % 30 == 0:
            m = d // 30
            return f"{m} Month" if m == 1 else f"{m} Months"
        return f"{d} Days" if d else "-"


class MealPackageSubscriptionReadSerializer(serializers.ModelSerializer):

    package = MealPackageReadSerializer(read_only=True)
    status_display = serializers.SerializerMethodField()
    username = serializers.SerializerMethodField()
    user_display_name = serializers.SerializerMethodField()

    class Meta:
        model = MealPackageSubscription
        fields = "__all__"

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_username(self, obj):
        if obj.user:
            return obj.user.username
        return None

    def get_user_display_name(self, obj):
        if obj.user:
            staff = getattr(obj.user, 'staff', None)
            student = getattr(obj.user, 'student', None)
            person = staff or student
            if person:
                parts = [
                    getattr(person, 'first_name', '') or '',
                    getattr(person, 'middle_name', '') or '',
                    getattr(person, 'last_name', '') or '',
                ]
                name = ' '.join(p for p in parts if p).strip()
                if name:
                    return name
            return obj.user.username
        return None


class MealPackageUsageReadSerializer(serializers.ModelSerializer):

    class Meta:
        model = MealPackageUsage
        fields = "__all__"

class StudentFeeMealPackageMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentFeeMealPackageMapping
        fields = "__all__"

    def validate(self, attrs):
        from_date = attrs.get("from_date", getattr(self.instance, "from_date", None))
        to_date = attrs.get("to_date", getattr(self.instance, "to_date", None))
        if from_date and to_date and from_date > to_date:
            raise exceptions.ValidationError("from_date cannot be after to_date.")
        return attrs


class StudentFeeMealPackageMappingReadSerializer(serializers.ModelSerializer):
    meal_package_name = serializers.ReadOnlyField(source='meal_package.name', default=None)

    class Meta:
        model = StudentFeeMealPackageMapping
        fields = "__all__"


class StaffMealPackagePayrollMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = StaffMealPackagePayrollMapping
        fields = "__all__"

    def validate(self, attrs):
        from_date = attrs.get("from_date", getattr(self.instance, "from_date", None))
        to_date = attrs.get("to_date", getattr(self.instance, "to_date", None))
        if from_date and to_date and from_date > to_date:
            raise exceptions.ValidationError("from_date cannot be after to_date.")
        return attrs


class StaffMealPackagePayrollMappingReadSerializer(serializers.ModelSerializer):
    meal_package_name = serializers.ReadOnlyField(source='meal_package.name', default=None)
    staff_name = serializers.SerializerMethodField()
    salary_component_name = serializers.ReadOnlyField(source='salary_component.name', default=None)

    class Meta:
        model = StaffMealPackagePayrollMapping
        fields = "__all__"

    def get_staff_name(self, obj):
        if obj.staff and hasattr(obj.staff, 'user') and obj.staff.user:
            return obj.staff.user.get_full_name() or obj.staff.user.username
        return None


# ──────────────────────────────────────────────────────────────
#  FOOD REQUEST
# ──────────────────────────────────────────────────────────────

class FoodRequestConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodRequestConfig
        fields = "__all__"


class FoodRequestConfigReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodRequestConfig
        fields = "__all__"


class FoodRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = FoodRequest
        fields = "__all__"
        read_only_fields = ['status', 'rejection_reason', 'reviewed_by', 'reviewed_at']

    def validate(self, attrs):
        from datetime import date as dt_date, datetime

        food_item = attrs.get('food_item', getattr(self.instance, 'food_item', None))
        combo = attrs.get('combo', getattr(self.instance, 'combo', None))
        custom_name = attrs.get('custom_item_name', getattr(self.instance, 'custom_item_name', ''))

        has_food = bool(food_item)
        has_combo = bool(combo)
        has_custom = bool(custom_name and custom_name.strip())
        total = sum([has_food, has_combo, has_custom])

        if total == 0:
            raise exceptions.ValidationError("Provide a food_item, combo, or custom_item_name.")
        if total > 1:
            raise exceptions.ValidationError("Only one of food_item, combo, or custom_item_name allowed.")

        requested_date = attrs.get('requested_date')
        if requested_date:
            config = FoodRequestConfig.objects.filter(is_active=True).first()
            min_advance = config.min_advance_days if config else 1
            cutoff_time = config.request_cutoff_time if config else datetime.strptime('18:00', '%H:%M').time()

            today = dt_date.today()
            min_date = today + __import__('datetime').timedelta(days=min_advance)

            if requested_date < min_date:
                raise exceptions.ValidationError(
                    f"Requested date must be at least {min_advance} day(s) from today ({min_date})."
                )

            now = datetime.now().time()
            if requested_date == min_date and now > cutoff_time:
                raise exceptions.ValidationError(
                    f"Request cutoff time ({cutoff_time.strftime('%I:%M %p')}) has passed. "
                    f"Please request for a later date."
                )

        return attrs


class FoodRequestReadSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    food_item_name = serializers.ReadOnlyField(source='food_item.name', default=None)
    combo_name = serializers.ReadOnlyField(source='combo.name', default=None)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    meal_type_display = serializers.CharField(source='get_requested_meal_type_display', read_only=True)
    reviewed_by_name = serializers.SerializerMethodField()
    item_display = serializers.SerializerMethodField()

    class Meta:
        model = FoodRequest
        fields = "__all__"

    def get_user_name(self, obj):
        if obj.user:
            return obj.user.get_full_name() or obj.user.username
        return None

    def get_reviewed_by_name(self, obj):
        if obj.reviewed_by:
            return obj.reviewed_by.get_full_name() or obj.reviewed_by.username
        return None

    def get_item_display(self, obj):
        if obj.food_item:
            return obj.food_item.name
        if obj.combo:
            return obj.combo.name
        return obj.custom_item_name or 'Unknown'