from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.db import models, transaction
from apps.tenants.services.middlewares import get_current_db_name
from rest_framework import exceptions, viewsets
from rest_framework.views import Response

from apps.canteen.models import (
    FoodCategory, FoodCombo, FoodComboItem, FoodItem,
    ComboOptionGroup, ComboOptionItem,
    Menu, MenuItem, MenuDiscount,
    MealPackage, MealPackageItem, MealPackageSubscription, MealPackageUsage,
    Order, OrderItem, OrderItemComboOption,
    StudentFeeMealPackageMapping, StaffMealPackagePayrollMapping,
    Wallet, WalletTransaction,
    FoodRequestConfig, FoodRequest,
)
from apps.canteen.serializers import (
    FoodCategoryReadSerializer, FoodCategorySerializer,
    FoodComboItemReadSerializer, FoodComboItemSerializer,
    FoodComboReadSerializer, FoodComboSerializer,
    FoodItemReadSerializer, FoodItemSerializer,
    ComboOptionGroupReadSerializer, ComboOptionGroupSerializer,
    ComboOptionItemReadSerializer, ComboOptionItemSerializer,
    MealPackageItemReadSerializer, MealPackageItemSerializer,
    MealPackageReadSerializer, MealPackageSerializer,
    MealPackageSubscriptionReadSerializer, MealPackageSubscriptionSerializer,
    MealPackageUsageReadSerializer, MealPackageUsageSerializer,
    MenuItemReadSerializer, MenuItemSerializer,
    MenuReadSerializer, MenuSerializer,
    MenuDiscountReadSerializer, MenuDiscountSerializer,
    OrderItemComboOptionReadSerializer, OrderItemComboOptionSerializer,
    OrderItemReadSerializer, OrderItemSerializer,
    OrderReadSerializer, OrderSerializer,
    StaffMealPackagePayrollMappingReadSerializer, StaffMealPackagePayrollMappingSerializer,
    StudentFeeMealPackageMappingReadSerializer, StudentFeeMealPackageMappingSerializer,
    WalletReadSerializer, WalletSerializer,
    WalletTransactionReadSerializer, WalletTransactionSerializer,
    FoodRequestConfigSerializer, FoodRequestConfigReadSerializer,
    FoodRequestSerializer, FoodRequestReadSerializer,
)
from apps.canteen.services import fee_integration as fee_integration_service
from apps.canteen.services import meal_package as meal_package_service
from apps.canteen.services import orders as order_service
from apps.canteen.services import wallet as wallet_service
from apps.canteen.services import dashboard as dashboard_service
from apps.canteen.services.receipt import generate_receipt
from apps.shared.services import SharedService
from apps.staffs.models.staff import Staff

#  FOOD CATALOGUE
class FoodCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = FoodCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    search_fields = ['name']

    def get_queryset(self):
        self.queryset = FoodCategory.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodCategoryReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = FoodCategoryReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

class FoodItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'category', 'food_type', 'is_available']
    search_fields = ['name']

    def get_queryset(self):
        self.queryset = FoodItem.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = FoodItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

class FoodComboViewSet(viewsets.ModelViewSet):
    serializer_class = FoodComboSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    search_fields = ['name']

    def get_queryset(self):
        self.queryset = FoodCombo.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodComboReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = FoodComboReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

class FoodComboItemViewSet(viewsets.ModelViewSet):
    serializer_class = FoodComboItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'combo', 'food_item']

    def get_queryset(self):
        self.queryset = FoodComboItem.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodComboItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = FoodComboItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

class ComboOptionGroupViewSet(viewsets.ModelViewSet):
    serializer_class = ComboOptionGroupSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'combo']
    search_fields = ['name']

    def get_queryset(self):
        self.queryset = ComboOptionGroup.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = ComboOptionGroupReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = ComboOptionGroupReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

class ComboOptionItemViewSet(viewsets.ModelViewSet):
    serializer_class = ComboOptionItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'option_group', 'food_item']

    def get_queryset(self):
        self.queryset = ComboOptionItem.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = ComboOptionItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = ComboOptionItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

#  MENU & DISCOUNTS
class MenuViewSet(viewsets.ModelViewSet):
    serializer_class = MenuSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'meal_type', 'is_todays_special']
    search_fields = ['name', 'description']

    def get_queryset(self):
        self.queryset = Menu.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MenuReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        if request.query_params.get('action') == 'todays_menu':
            menus = Menu.objects.filter(
                is_active=True
            ).prefetch_related(
                'menu_item_menu', 'menu_item_menu__food_item',
                'menu_item_menu__combo', 'menu_discount_menu',
            )
            page_menus, count, next_page, previous_page = SharedService.custom_pagination(
                self, menus,
                request.GET.get('limit', 20),
                request.GET.get('pageno', 1)
            )

            data = MenuReadSerializer(page_menus, many=True).data
            for menu_data in data:
                menu_data['items'] = [
                    item for item in menu_data.get('items', [])
                    if item.get('is_available_today', True)
                ]

            return Response({'data': {
                'count': count,
                'next': next_page,
                'previous': previous_page,
                'data_list': data,
            }})

        self.serializer_class = MenuReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class MenuItemViewSet(viewsets.ModelViewSet):
    serializer_class = MenuItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'menu', 'menu__meal_type', 'is_available_today']

    def get_queryset(self):
        self.queryset = MenuItem.objects.select_related(
            'menu', 'food_item', 'food_item__category', 'combo',
        ).all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MenuItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MenuItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class MenuDiscountViewSet(viewsets.ModelViewSet):
    serializer_class = MenuDiscountSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'menu', 'scope', 'discount_type']

    def get_queryset(self):
        self.queryset = MenuDiscount.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MenuDiscountReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MenuDiscountReadSerializer
        return Response(SharedService.read_data_paginated(self, True))

#  ORDER
class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'status', 'order_type', 'payment_mode', 'user']
    search_fields = ['order_number']

    def get_queryset(self):
        self.queryset = Order.objects.all().order_by('-created_at')
        return self.queryset

    def create(self, request, *args, **kwargs):
        order = order_service.create_order(request.user, request.data)
        return Response({'Reason': 'Order created successfully!', 'data': OrderReadSerializer(order).data})

    def update(self, request, *args, **kwargs):
        action = request.query_params.get('action')

        if action == 'cancel':
            order = order_service.cancel_order(kwargs['pk'])
            return Response({'Reason': 'Order cancelled successfully!', 'data': OrderReadSerializer(order).data})

        if action == 'update_status':
            new_status = request.data.get('status')
            if new_status is None:
                raise exceptions.ValidationError("status is required.")
            order = order_service.update_order_status(kwargs['pk'], int(new_status))
            return Response({'Reason': 'Order status updated!', 'data': OrderReadSerializer(order).data})

        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        if request.query_params.get('receipt') == 'true':
            return generate_receipt(self)
        self.serializer_class = OrderReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        action = request.query_params.get('action')

        if action == 'kitchen_summary':
            menu_date_str = request.query_params.get('date')
            menu_date = SharedService.date_to_obj(menu_date_str) if menu_date_str else date.today()
            return Response({'data': order_service.get_kitchen_summary(menu_date)})

        if action == 'dashboard_stats':
            stats_date_str = request.query_params.get('date')
            stats_date = SharedService.date_to_obj(stats_date_str) if stats_date_str else date.today()
            return Response({'data': dashboard_service.get_admin_dashboard_stats(stats_date)})

        if action == 'my_dashboard':
            return Response({'data': dashboard_service.get_my_dashboard(request.user)})

        # Filter by date range
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        if from_date:
            self.queryset = self.get_queryset().filter(created_at__date__gte=from_date)
        if to_date:
            self.queryset = self.queryset.filter(created_at__date__lte=to_date)

        self.serializer_class = OrderReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class OrderItemViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'order']

    def get_queryset(self):
        self.queryset = OrderItem.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = OrderItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = OrderItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class OrderItemComboOptionViewSet(viewsets.ModelViewSet):
    serializer_class = OrderItemComboOptionSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'order_item']

    def get_queryset(self):
        self.queryset = OrderItemComboOption.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = OrderItemComboOptionReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = OrderItemComboOptionReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


# ──────────────────────────────────────────────────────────────
#  WALLET
# ──────────────────────────────────────────────────────────────

class WalletViewSet(viewsets.ModelViewSet):
    serializer_class = WalletSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'user']
    search_fields = ['user__first_name', 'user__last_name', 'user__username']

    def get_queryset(self):
        qs = Wallet.objects.select_related('user').all().order_by('-id')
        user_type = self.request.query_params.get('user_type')
        if user_type == 'staff':
            qs = qs.filter(user__staff__isnull=False)
        elif user_type == 'student':
            qs = qs.filter(user__student__isnull=False)
        self.queryset = qs
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data, isList=False))

    def update(self, request, *args, **kwargs):
        if request.query_params.get('action') == 'top_up':
            wallet, tx = wallet_service.top_up_by_wallet_id(
                wallet_id=kwargs['pk'],
                amount=request.data.get('amount'),
                description=request.data.get('description', 'Wallet top-up'),
            )
            return Response({
                'Reason': 'Wallet topped up successfully!',
                'data': {
                    'wallet_balance': str(wallet.balance),
                    'transaction_id': tx.pk,
                }
            })

        if request.query_params.get('action') == 'manual_debit':
            amount = request.data.get('amount')
            description = request.data.get('description', 'Manual deduction')
            if not amount or float(amount) <= 0:
                raise exceptions.ValidationError("Amount must be greater than zero.")
            try:
                wallet = Wallet.objects.get(pk=kwargs['pk'], is_active=True)
            except Wallet.DoesNotExist:
                raise exceptions.ValidationError("Wallet not found.")
            wallet, tx = wallet_service.deduct(
                wallet,
                amount,
                reference_type=4,  # Adjustment
                description=description,
            )
            return Response({
                'Reason': 'Amount deducted successfully!',
                'data': {
                    'wallet_balance': str(wallet.balance),
                    'transaction_id': tx.pk,
                }
            })

        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = WalletReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = WalletReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class WalletTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = WalletTransactionSerializer
    http_method_names = ['get']
    filterset_fields = ['wallet', 'transaction_type', 'reference_type']

    def get_queryset(self):
        self.queryset = WalletTransaction.objects.all().order_by('-created_at')
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = WalletTransactionReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = WalletTransactionReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


# ──────────────────────────────────────────────────────────────
#  MEAL PACKAGE SYSTEM
# ──────────────────────────────────────────────────────────────

class MealPackageViewSet(viewsets.ModelViewSet):
    serializer_class = MealPackageSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'meal_type', 'available_for']
    search_fields = ['name', 'description']

    def get_queryset(self):
        self.queryset = MealPackage.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MealPackageReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MealPackageReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class MealPackageItemViewSet(viewsets.ModelViewSet):
    serializer_class = MealPackageItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['package']

    def get_queryset(self):
        self.queryset = MealPackageItem.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MealPackageItemReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MealPackageItemReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class MealPackageSubscriptionViewSet(viewsets.ModelViewSet):
    serializer_class = MealPackageSubscriptionSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'status', 'package', 'user']

    def get_queryset(self):
        qs = MealPackageSubscription.objects.select_related('user', 'package').all().order_by('-created_at')
        user_type = self.request.query_params.get('user_type')
        if user_type == 'staff':
            qs = qs.filter(user__staff__isnull=False)
        elif user_type == 'student':
            qs = qs.filter(user__student__isnull=False)
        self.queryset = qs
        return self.queryset

    def create(self, request, *args, **kwargs):
        user_id = request.data.get('user')
        package_id = request.data.get('package')
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')

        if not all([user_id, package_id, start_date_str, end_date_str]):
            raise exceptions.ValidationError("user, package, start_date, and end_date are required.")

        User = get_user_model()
        try:
            user = User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise exceptions.ValidationError("User not found.")

        subscription = meal_package_service.subscribe(
            user, package_id,
            SharedService.date_to_obj(start_date_str),
            SharedService.date_to_obj(end_date_str),
        )
        return Response({
            'Reason': 'Subscription created successfully!',
            'data': MealPackageSubscriptionReadSerializer(subscription).data,
        })

    def update(self, request, *args, **kwargs):
        action = request.query_params.get('action')

        if action == 'pause':
            with transaction.atomic(using=get_current_db_name()):
                try:
                    sub = MealPackageSubscription.objects.select_related('package').get(
                        pk=kwargs['pk'], is_active=True
                    )
                except MealPackageSubscription.DoesNotExist:
                    raise exceptions.ValidationError("Subscription not found.")
                if sub.status != 0:
                    raise exceptions.ValidationError("Only active subscriptions can be paused.")
                if not sub.package.is_pause_allowed:
                    raise exceptions.ValidationError("Pausing is not allowed for this package.")
                sub.status = 1
                sub.paused_at = date.today()
                sub.save()
                return Response({
                    'Reason': 'Subscription paused!',
                    'data': MealPackageSubscriptionReadSerializer(sub).data,
                })

        if action == 'resume':
            with transaction.atomic(using=get_current_db_name()):
                try:
                    sub = MealPackageSubscription.objects.select_related('package').get(
                        pk=kwargs['pk'], is_active=True
                    )
                except MealPackageSubscription.DoesNotExist:
                    raise exceptions.ValidationError("Subscription not found.")
                if sub.status != 1:
                    raise exceptions.ValidationError("Only paused subscriptions can be resumed.")
                if sub.paused_at:
                    paused_days = (date.today() - sub.paused_at).days
                    if paused_days > 0:
                        sub.end_date = sub.end_date + timedelta(days=paused_days)
                sub.status = 0
                sub.paused_at = None
                sub.save()
                return Response({
                    'Reason': 'Subscription resumed! End date extended.',
                    'data': MealPackageSubscriptionReadSerializer(sub).data,
                })

        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        if request.query_params.get('action') == 'remaining':
            try:
                subscription = MealPackageSubscription.objects.select_related("package").get(
                    pk=kwargs['pk'], is_active=True
                )
            except MealPackageSubscription.DoesNotExist:
                raise exceptions.ValidationError("Subscription not found.")
            return Response({'data': meal_package_service.get_remaining_usage(subscription)})

        self.serializer_class = MealPackageSubscriptionReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MealPackageSubscriptionReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class MealPackageUsageViewSet(viewsets.ModelViewSet):
    serializer_class = MealPackageUsageSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'subscription', 'usage_date']

    def get_queryset(self):
        self.queryset = MealPackageUsage.objects.all().order_by('-usage_date')
        return self.queryset

    def create(self, request, *args, **kwargs):
        subscription_id = request.data.get('subscription')
        usage_date_str = request.data.get('usage_date')

        if not subscription_id:
            raise exceptions.ValidationError("subscription is required.")
        if not usage_date_str:
            raise exceptions.ValidationError("usage_date is required.")

        usage = meal_package_service.record_usage(
            subscription_id=subscription_id,
            order_id=request.data.get('order'),
            usage_date=SharedService.date_to_obj(usage_date_str),
            quantity=int(request.data.get('quantity', 1)),
        )
        return Response({
            'Reason': 'Usage recorded successfully!',
            'data': MealPackageUsageReadSerializer(usage).data,
        })

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = MealPackageUsageReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = MealPackageUsageReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


# ──────────────────────────────────────────────────────────────
#  FEE & PAYROLL INTEGRATION
# ──────────────────────────────────────────────────────────────

class StudentFeeMealPackageMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StudentFeeMealPackageMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'custom_fee', 'meal_package']

    def get_queryset(self):
        self.queryset = StudentFeeMealPackageMapping.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        package_ids = request.data.get('package_ids')
        student_user_id = request.data.get('student_user_id')

        if package_ids and student_user_id:
            User = get_user_model()
            try:
                student_user = User.objects.get(pk=student_user_id)
            except User.DoesNotExist:
                raise exceptions.ValidationError("Student user not found.")

            from_date = SharedService.date_to_obj(request.data.get('from_date'))
            to_date_str = request.data.get('to_date')
            to_date = SharedService.date_to_obj(to_date_str) if to_date_str else None

            mappings, subscriptions = fee_integration_service.assign_meal_packages_for_student(
                student_user=student_user,
                custom_fee_id=request.data.get('custom_fee'),
                package_ids=package_ids,
                from_date=from_date,
                to_date=to_date,
                created_by=request.user,
            )
            return Response({
                'Reason': f'{len(mappings)} meal package(s) assigned successfully!',
                'data': {
                    'mappings_count': len(mappings),
                    'subscriptions_count': len(subscriptions),
                }
            })

        return Response(SharedService.add_data(self, request.data, isList=False))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = StudentFeeMealPackageMappingReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = StudentFeeMealPackageMappingReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class StaffMealPackagePayrollMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StaffMealPackagePayrollMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'staff', 'meal_package']

    def get_queryset(self):
        self.queryset = StaffMealPackagePayrollMapping.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        staff_id = request.data.get('staff')
        package_id = request.data.get('meal_package')
        from_date_str = request.data.get('from_date')

        if staff_id and package_id and from_date_str:
            try:
                staff = Staff.objects.get(pk=staff_id)
            except Staff.DoesNotExist:
                raise exceptions.ValidationError("Staff not found.")

            to_date_str = request.data.get('to_date')
            mapping, subscription = fee_integration_service.assign_meal_package_for_staff(
                staff=staff,
                package_id=package_id,
                salary_component_id=request.data.get('salary_component'),
                amount=request.data.get('amount', 0),
                from_date=SharedService.date_to_obj(from_date_str),
                to_date=SharedService.date_to_obj(to_date_str) if to_date_str else None,
                created_by=request.user,
            )
            return Response({
                'Reason': 'Staff meal package assigned!',
                'data': StaffMealPackagePayrollMappingReadSerializer(mapping).data,
            })

        return Response(SharedService.add_data(self, request.data, isList=False))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = StaffMealPackagePayrollMappingReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = StaffMealPackagePayrollMappingReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


# ──────────────────────────────────────────────────────────────
#  FOOD REQUEST SYSTEM
# ──────────────────────────────────────────────────────────────

class FoodRequestConfigViewSet(viewsets.ModelViewSet):
    serializer_class = FoodRequestConfigSerializer
    http_method_names = ['get', 'post', 'put']

    def get_queryset(self):
        self.queryset = FoodRequestConfig.objects.all().order_by('-id')
        return self.queryset

    def create(self, request, *args, **kwargs):
        existing = FoodRequestConfig.objects.filter(is_active=True).first()
        if existing:
            for key, val in request.data.items():
                if hasattr(existing, key) and key not in ('id', 'created_at', 'updated_at'):
                    setattr(existing, key, val)
            existing.save()
            return Response({
                'Reason': 'Configuration updated!',
                'data': FoodRequestConfigReadSerializer(existing).data,
            })
        return Response(SharedService.add_data(self, request.data))

    def update(self, request, *args, **kwargs):
        return Response(SharedService.update_data(self, request.data, **kwargs))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodRequestConfigReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        self.serializer_class = FoodRequestConfigReadSerializer
        return Response(SharedService.read_data_paginated(self, True))


class FoodRequestViewSet(viewsets.ModelViewSet):
    serializer_class = FoodRequestSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'status', 'user', 'requested_date', 'requested_meal_type']
    search_fields = ['custom_item_name']

    def get_queryset(self):
        self.queryset = FoodRequest.objects.select_related(
            'user', 'food_item', 'combo', 'reviewed_by',
        ).all().order_by('-created_at')
        return self.queryset

    def create(self, request, *args, **kwargs):
        data = request.data.copy()
        data['user'] = request.user.pk
        serializer = FoodRequestSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        instance = serializer.save()
        return Response({
            'Reason': 'Food request submitted successfully!',
            'data': FoodRequestReadSerializer(instance).data,
        })

    def update(self, request, *args, **kwargs):
        action = request.query_params.get('action')

        if action == 'accept':
            try:
                req = FoodRequest.objects.get(pk=kwargs['pk'], is_active=True)
            except FoodRequest.DoesNotExist:
                raise exceptions.ValidationError("Request not found.")
            if req.status != 0:
                raise exceptions.ValidationError("Only pending requests can be accepted.")
            req.status = 1
            req.reviewed_by = request.user
            req.reviewed_at = datetime.now()
            req.save()
            return Response({
                'Reason': 'Request accepted!',
                'data': FoodRequestReadSerializer(req).data,
            })

        if action == 'reject':
            try:
                req = FoodRequest.objects.get(pk=kwargs['pk'], is_active=True)
            except FoodRequest.DoesNotExist:
                raise exceptions.ValidationError("Request not found.")
            if req.status != 0:
                raise exceptions.ValidationError("Only pending requests can be rejected.")
            reason = request.data.get('rejection_reason', '')
            if not reason.strip():
                raise exceptions.ValidationError("rejection_reason is required.")
            req.status = 2
            req.rejection_reason = reason
            req.reviewed_by = request.user
            req.reviewed_at = datetime.now()
            req.save()
            return Response({
                'Reason': 'Request rejected.',
                'data': FoodRequestReadSerializer(req).data,
            })

        if action == 'cancel':
            try:
                req = FoodRequest.objects.get(pk=kwargs['pk'], is_active=True)
            except FoodRequest.DoesNotExist:
                raise exceptions.ValidationError("Request not found.")
            if req.user_id != request.user.pk:
                raise exceptions.ValidationError("You can only cancel your own requests.")
            if req.status != 0:
                raise exceptions.ValidationError("Only pending requests can be cancelled.")

            config = FoodRequestConfig.objects.filter(is_active=True).first()
            if config:
                cancel_cutoff = config.cancellation_cutoff_time
                day_before = req.requested_date - timedelta(days=1)
                now = datetime.now()
                if now.date() > day_before or (now.date() == day_before and now.time() > cancel_cutoff):
                    raise exceptions.ValidationError(
                        f"Cancellation window has passed. Cutoff: {cancel_cutoff.strftime('%I:%M %p')} "
                        f"the day before ({day_before})."
                    )

            req.status = 3
            req.save()
            return Response({
                'Reason': 'Request cancelled.',
                'data': FoodRequestReadSerializer(req).data,
            })

        return Response(SharedService.update_data(self, request.data, **kwargs))

    def destroy(self, request, *args, **kwargs):
        return Response(SharedService.soft_delete_data(self))

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = FoodRequestReadSerializer
        return Response(SharedService.read_data(self))

    def list(self, request, *args, **kwargs):
        action = request.query_params.get('action')

        if action == 'my_requests':
            qs = self.get_queryset().filter(user=request.user)
            self.queryset = qs
            self.serializer_class = FoodRequestReadSerializer
            return Response(SharedService.read_data_paginated(self, True))

        if action == 'kitchen':
            qs = self.get_queryset()
            req_date = request.query_params.get('requested_date')
            if req_date:
                qs = qs.filter(requested_date=req_date)
            status = request.query_params.get('status')
            if status is not None:
                qs = qs.filter(status=int(status))
            self.queryset = qs
            self.serializer_class = FoodRequestReadSerializer
            return Response(SharedService.read_data_paginated(self, True))

        self.serializer_class = FoodRequestReadSerializer
        return Response(SharedService.read_data_paginated(self, True))