"""
Gate Pass API views. Standard CRUD only (no @action) so permission module maps to view/add/change/delete.
- Workflow: PATCH with body action=approve|reject|exit|record_return
- PDF: GET /gatepass/{id}/pdf/  (explicit path, same view permission)
- Verify: GET /gatepass/?pass_number=GP-xxx
- Watchman verify (public): GET/POST /gatepass/verify/ - scan QR opens link, watchman marks exit/return
"""
from rest_framework import viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from apps.users.services.permissions import IsAuthenticated
from apps.shared.services import SharedService

from apps.gatepass.models import GatePass
from apps.gatepass.serializers import GatePassSerializer
from apps.gatepass.services.gatepass import (
    create_gatepass,
    approve_gatepass,
    reject_gatepass,
    record_exit,
    record_return,
    get_gatepass_pdf,
    update_gatepass,
    delete_gatepass,
    get_gatepass_by_number,
    verify_exit_by_watchman,
    verify_return_by_watchman,
)


class GatePassPdfView(APIView):
    """GET /gatepass/gatepass/<id>/pdf/ - same permission as view gatepass."""
    def get(self, request, pk):
        return get_gatepass_pdf(self, pk)


class GatePassVerifyView(APIView):
    """
    Public API for watchman: scan QR opens frontend /gatepass/verify?pass=GP-xxx.
    GET ?pass_number=GP-xxx -> gate pass details.
    POST { pass_number, action: 'exit'|'return', guard_name? } -> mark exit or return (stored in DB with verified_at).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pass_number = request.query_params.get('pass_number') or request.query_params.get('pass')
        obj, err = get_gatepass_by_number(pass_number)
        if err:
            return Response(err, status=404)
        serializer = GatePassSerializer(obj)
        return Response({'valid': True, 'data': serializer.data})

    def post(self, request):
        pass_number = request.data.get('pass_number') or request.data.get('pass')
        action = (request.data.get('action') or '').strip().lower()
        guard_name = request.data.get('guard_name', '')
        if not pass_number:
            return Response({'valid': False, 'message': 'pass_number is required.'}, status=400)
        if action == 'exit':
            try:
                obj = verify_exit_by_watchman(pass_number, guard_name=guard_name)
                serializer = GatePassSerializer(obj)
                return Response({'Reason': 'Checkout verified and recorded.', 'data': serializer.data})
            except Exception as e:
                return Response({'valid': False, 'message': str(e)}, status=400)
        if action == 'return':
            try:
                obj = verify_return_by_watchman(pass_number)
                serializer = GatePassSerializer(obj)
                return Response({'Reason': 'Return verified and recorded.', 'data': serializer.data})
            except Exception as e:
                return Response({'valid': False, 'message': str(e)}, status=400)
        return Response({'valid': False, 'message': 'action must be exit or return.'}, status=400)


class GatePassViewSet(viewsets.ModelViewSet):
    serializer_class = GatePassSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    filterset_fields = ['status', 'date', 'user']
    search_fields = ['gate_pass_number', 'reason', 'guardian_name']
    ordering_fields = ['id', 'gate_pass_number', 'date', 'status', 'created']
    ordering = ['-id']
    queryset = GatePass.objects.all().select_related(
        'user', 'user__student', 'user__staff', 'standard_section',
        'standard_section__standard', 'standard_section__section',
    )

    def list(self, request, *args, **kwargs):
        pass_number = request.query_params.get('pass_number')
        if pass_number:
            obj = GatePass.objects.filter(gate_pass_number=pass_number).select_related(
                'user', 'user__student', 'user__staff', 'standard_section',
            ).first()
            if not obj:
                return Response({'valid': False, 'message': 'Gate pass not found'}, status=404)
            serializer = GatePassSerializer(obj)
            return Response({'valid': True, 'data': serializer.data})
        # Server-side pagination: limit, pageno, ordering, search (same as other screens)
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        obj = create_gatepass(self, request.data)
        serializer = self.get_serializer(obj)
        return Response({'Reason': 'Gate pass requested successfully', 'data': serializer.data})

    def update(self, request, *args, **kwargs):
        data = request.data or {}
        action = data.get('action')
        pk = kwargs['pk']
        if action == 'approve':
            obj = approve_gatepass(self, pk)
            serializer = self.get_serializer(obj)
            return Response({'Reason': 'Gate pass approved', 'data': serializer.data})
        if action == 'reject':
            obj = reject_gatepass(self, pk, reason=data.get('reason', ''))
            serializer = self.get_serializer(obj)
            return Response({'Reason': 'Gate pass rejected', 'data': serializer.data})
        if action == 'exit':
            obj = record_exit(self, pk, guard_name=data.get('guard_name', ''))
            serializer = self.get_serializer(obj)
            return Response({'Reason': 'Exit recorded', 'data': serializer.data})
        if action == 'record_return':
            obj = record_return(self, pk)
            serializer = self.get_serializer(obj)
            return Response({'Reason': 'Return recorded', 'data': serializer.data})
        obj = update_gatepass(self, pk, data)
        serializer = self.get_serializer(obj)
        return Response({'Reason': 'Gate pass updated', 'data': serializer.data})

    def partial_update(self, request, *args, **kwargs):
        return self.update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        delete_gatepass(self, kwargs['pk'])
        return Response(status=204)
