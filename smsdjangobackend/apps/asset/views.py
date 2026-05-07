import logging

from django.db.models import Q
from apps.asset.services.dashboard import get_full_asset_dashboard
from rest_framework import viewsets, exceptions
from rest_framework.views import Response
from rest_framework.decorators import action

from apps.asset.models import AssetGroup, Asset, AssetDepreciationSnapshot, AssetDisposal, AssetCostMovement, AssetSnapshotLockHistory
from apps.asset.serializers import (
    AssetGroupSerializer,
    AssetSerializer, AssetReadSerializer,
    AssetDepreciationSnapshotReadSerializer,
    AssetDisposalSerializer, AssetDisposalReadSerializer,
    AssetCostMovementSerializer, AssetCostMovementReadSerializer,
    SnapshotLockHistorySerializer, AssetDashboardGroupSerializer
)
from apps.asset.services.asset_group import get_asset_group_tree
from apps.asset.services.asset_cost import ensure_opening_balance_exists
from apps.asset.services.depreciation import (
    preview_depreciation, generate_snapshots, lock_snapshots,
    unlock_snapshots, bulk_edit_snapshots, reset_to_calculated, get_lock_history
)
from apps.asset.services.reports import (
    get_fixed_asset_register, get_asset_group_summary, get_depreciation_schedule,
    download_fixed_asset_register_excel, download_asset_group_summary_excel,
    get_fixed_asset_cost_register, get_asset_group_cost_summary,
    download_fixed_asset_cost_register_excel, download_asset_group_cost_summary_excel,
    download_fixed_asset_register_excel_lrp, download_asset_group_summary_excel_lrp,
    download_fixed_asset_cost_register_excel_lrp, download_asset_group_cost_summary_excel_lrp,
    download_depreciation_schedule_excel,
    download_fixed_asset_register_pdf, download_asset_group_summary_pdf,
    download_depreciation_schedule_pdf, download_fixed_asset_cost_register_pdf,
    download_asset_group_cost_summary_pdf,
    download_fixed_asset_register_pdf_lrp, download_asset_group_summary_pdf_lrp,
    download_depreciation_schedule_pdf_lrp, download_fixed_asset_cost_register_pdf_lrp,
    download_asset_group_cost_summary_pdf_lrp,
    get_disposal_list, download_disposal_list_excel, download_disposal_list_pdf,
    download_disposal_list_excel_lrp, download_disposal_list_pdf_lrp,
)
from apps.shared.services import SharedService
from apps.shared.services_shared.store_api_result import (
    start_long_running_process, store_long_running_process
)
from apps.institutes.models.financialyear import FinancialYear


from apps.asset.services.asset_crud_service import (
    check_previous_fy_locked, validate_asset_group_create, validate_asset_group_update,
    cascade_delete_asset_group, validate_asset_create, validate_asset_update,
    validate_asset_destroy, validate_depreciation_action, route_depreciation_action,
    validate_disposal_create, validate_cost_movement_create
)


class AssetGroupViewSet(viewsets.ModelViewSet):
    serializer_class = AssetGroupSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['depreciation_method', 'parent_group', 'financial_year']

    def get_queryset(self):
        self.queryset = AssetGroup.objects.filter(is_active=True).select_related('parent_group')
        return self.queryset

    def create(self, request, *args, **kwargs):
        validate_asset_group_create(request.data.get('financial_year'))
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        validate_asset_group_update(instance, request.data.get('financial_year'))
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        check_previous_fy_locked(instance.financial_year_id, 'delete asset group')
        confirm = request.GET.get('confirm') == 'true'
        should_proceed, warning = cascade_delete_asset_group(instance, confirm)
        if not should_proceed:
            return Response(warning)
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('tree_view'):
            response = get_asset_group_tree(self)
        else:
            response = SharedService.read_data_paginated(self, True)
        return Response(response)


class AssetViewSet(viewsets.ModelViewSet):
    serializer_class = AssetSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['asset_group', 'status', 'is_fully_depreciated', 'expense_id']
    search_fields = ['asset_code', 'asset_name', 'location']

    def get_queryset(self):
        self.queryset = Asset.objects.filter(is_active=True).select_related('asset_group', 'bank')

        financial_year_id = self.request.GET.get('financial_year')
        if financial_year_id:
            try:
                fy = FinancialYear.objects.get(id=financial_year_id)
                self.queryset = self.queryset.filter(
                    Q(asset_cost_movement_asset__financial_year=fy) |
                    Q(asset_depreciation_snapshot_asset__financial_year=fy) |
                    Q(purchase_date__gte=fy.start_date, purchase_date__lte=fy.end_date)
                ).distinct()
            except FinancialYear.DoesNotExist:
                pass

        return self.queryset

    def create(self, request, *args, **kwargs):
        validate_asset_create(request.data.get('asset_group'))
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        validate_asset_update(
            instance,
            request.data.get('asset_group'),
            self.request.GET.get('financial_year')
        )
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        validate_asset_destroy(instance)
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = AssetReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = AssetReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    @action(detail=True, methods=['post'], url_path='dispose')
    def dispose(self, request, pk=None):
        data = request.data.copy()
        data['asset'] = pk
        validate_disposal_create(pk, data.get('disposal_date'))
        serializer = AssetDisposalSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        disposal = serializer.save()
        read_serializer = AssetDisposalReadSerializer(disposal)
        response = {'Reason': 'Asset disposed successfully!', 'data': read_serializer.data}
        return Response(response)



class DepreciationViewSet(viewsets.ModelViewSet):

    serializer_class = AssetDepreciationSnapshotReadSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['financial_year', 'is_locked', 'asset__asset_group']

    def get_queryset(self):
        self.queryset = AssetDepreciationSnapshot.objects.select_related(
            'asset', 'asset__asset_group', 'financial_year'
        )
        return self.queryset

    def list(self, request, *args, **kwargs):
        financial_year_id = request.GET.get('financial_year')
        if not financial_year_id:
            raise exceptions.ValidationError("financial_year is required.")
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):

        action_type = request.data.get('action', 'preview')
        financial_year_id = request.data.get('financial_year')
        validate_depreciation_action(action_type, financial_year_id, request.data)
        response = route_depreciation_action(self, action_type, financial_year_id, request.data)
        return Response(response)


class DepreciationHistoryViewSet(viewsets.ModelViewSet):
    serializer_class = SnapshotLockHistorySerializer
    http_method_names = ['get']
    filterset_fields = ['financial_year', 'action']

    def get_queryset(self):
        self.queryset = AssetSnapshotLockHistory.objects.select_related(
            'financial_year', 'performed_by'
        )
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        financial_year_id = request.GET.get('financial_year')
        if financial_year_id:
            response = get_lock_history(self, financial_year_id)
        else:
            response = SharedService.read_data_paginated(self, True)
        return Response(response)


class AssetDisposalViewSet(viewsets.ModelViewSet):
    serializer_class = AssetDisposalSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['asset__asset_group', 'reason']

    def get_queryset(self):
        self.queryset = AssetDisposal.objects.select_related(
            'asset', 'asset__asset_group'
        )
        return self.queryset

    def create(self, request, *args, **kwargs):
        validate_disposal_create(request.data.get('asset'), request.data.get('disposal_date'))
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = AssetDisposalReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = AssetDisposalReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)


class AssetCostMovementViewSet(viewsets.ModelViewSet):
    serializer_class = AssetCostMovementReadSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['asset', 'financial_year', 'movement_type']

    def get_queryset(self):
        self.queryset = AssetCostMovement.objects.select_related(
            'asset', 'asset__asset_group', 'financial_year'
        )
        return self.queryset

    def create(self, request, *args, **kwargs):
        validate_cost_movement_create(request.data.get('financial_year'))
        self.serializer_class = AssetCostMovementSerializer
        response = SharedService.add_data(self, request.data, isList=False)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)


class FixedAssetRegisterViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):

        financial_year_id = request.GET.get('financial_year')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if not financial_year_id:
            raise exceptions.ValidationError("financial_year is required.")

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_fixed_asset_register_pdf_lrp, self)
                return Response({'Result': True})
            return download_fixed_asset_register_pdf(self)

        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_fixed_asset_register_excel_lrp, self)
                return Response({'Result': True})
            return download_fixed_asset_register_excel(self, financial_year_id)

        response = get_fixed_asset_register(self, financial_year_id, request)
        return Response(response)


class AssetGroupSummaryViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if not financial_year_id:
            raise exceptions.ValidationError("financial_year is required.")

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_asset_group_summary_pdf_lrp, self)
                return Response({'Result': True})
            return download_asset_group_summary_pdf(self)

        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_asset_group_summary_excel_lrp, self)
                return Response({'Result': True})
            return download_asset_group_summary_excel(self, financial_year_id)

        response = get_asset_group_summary(self, financial_year_id)
        return Response(response)


class DepreciationScheduleViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        asset_id = request.GET.get('asset')
        download_pdf = request.GET.get('download_pdf')
        download_excel = request.GET.get('download_excel')
        is_long_running_process = request.GET.get('long_running_process')

        if not asset_id:
            raise exceptions.ValidationError("asset is required.")

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_depreciation_schedule_pdf_lrp, self)
                return Response({'Result': True})
            return download_depreciation_schedule_pdf(self)

        if download_excel:
            return download_depreciation_schedule_excel(self, asset_id)

        response = get_depreciation_schedule(self, asset_id=asset_id)
        return Response(response)


class FixedAssetCostRegisterViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if not financial_year_id:
            raise exceptions.ValidationError("financial_year is required.")

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_fixed_asset_cost_register_pdf_lrp, self)
                return Response({'Result': True})
            return download_fixed_asset_cost_register_pdf(self)

        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_fixed_asset_cost_register_excel_lrp, self)
                return Response({'Result': True})
            return download_fixed_asset_cost_register_excel(self, financial_year_id)

        response = get_fixed_asset_cost_register(self, financial_year_id, request)
        return Response(response)


class AssetGroupCostSummaryViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if not financial_year_id:
            raise exceptions.ValidationError("financial_year is required.")

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_asset_group_cost_summary_pdf_lrp, self)
                return Response({'Result': True})
            return download_asset_group_cost_summary_pdf(self)

        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_asset_group_cost_summary_excel_lrp, self)
                return Response({'Result': True})
            return download_asset_group_cost_summary_excel(self, financial_year_id)

        response = get_asset_group_cost_summary(self, financial_year_id)
        return Response(response)


class DisposalListViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        financial_year_id = request.GET.get('financial_year')
        download_excel = request.GET.get('download_excel')
        download_pdf = request.GET.get('download_pdf')
        is_long_running_process = request.GET.get('long_running_process')

        if download_pdf:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_disposal_list_pdf_lrp, self)
                return Response({'Result': True})
            return download_disposal_list_pdf(self)

        if download_excel:
            if is_long_running_process:
                start_long_running_process(self)
                SharedService.custom_thread(download_disposal_list_excel_lrp, self)
                return Response({'Result': True})
            return download_disposal_list_excel(self, financial_year_id)

        response = get_disposal_list(self, financial_year_id)
        return Response(response)


class AssetDashboardViewSet(viewsets.ViewSet):
    http_method_names = ['get']

    def list(self, request):
        is_long_running_process = request.GET.get('long_running_process')
        fy_id = request.GET.get('financial_year_id')

        if is_long_running_process:
            start_long_running_process(self)
            SharedService.custom_thread(_asset_dashboard_lrp, self)
            return Response({'Result': True})

        data = get_full_asset_dashboard(fy_id)
        return Response(data)


def _asset_dashboard_lrp(view_self):
    logger = logging.getLogger(__name__)
    transaction_id = view_self.request.GET.get('transaction_id')
    fy_id = view_self.request.GET.get('financial_year_id')
    try:
        data = get_full_asset_dashboard(fy_id)
        store_long_running_process(view_self, transaction_id, data)
    except Exception as e:
        logger.error(f'Error in asset dashboard LRP: {e}', exc_info=True)
        store_long_running_process(
            view_self, transaction_id, {'error': str(e)[:250]},
        )