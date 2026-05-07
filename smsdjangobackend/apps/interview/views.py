import logging

from django.db.models import Q
from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.views import Response

from apps.interview.models import (
    JobRole, InterviewSetup, InterviewRound,
    JobApplication, JobApplicationDocument, InterviewEvaluation
)
from apps.interview.serializers import (
    JobRoleSerializer,
    InterviewSetupSerializer, InterviewSetupReadSerializer,
    InterviewRoundSerializer, InterviewRoundReadSerializer,
    JobApplicationSerializer, JobApplicationReadSerializer,
    JobApplicationDocumentSerializer,
    InterviewEvaluationSerializer, InterviewEvaluationReadSerializer
)
from apps.interview.services.job_role import add_job_role, update_job_role
from apps.interview.services.interview_setup import add_interview_setup, update_interview_setup
from apps.interview.services.job_application import add_job_application_public, update_job_application
from apps.interview.services.evaluation import submit_evaluation, get_hire_prefill_data
from apps.shared.services import SharedService
from apps.users.services.permissions import IsAuthenticated, OnlyListAccess

log = logging.getLogger(__name__)

class JobRoleViewSet(viewsets.ModelViewSet):
    serializer_class = JobRoleSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = JobRole.objects.all().order_by('-id')
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_job_role(self, request.data.get('job_roles', [request.data]))
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_job_role(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

class InterviewSetupViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewSetupSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'job_role']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = InterviewSetup.objects.filter(is_active=True).select_related(
            'job_role'
        ).prefetch_related(
            'interview_round_interview_setup',
            'interview_round_interview_setup__assigned_staff'
        ).order_by('-id')
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = InterviewSetupReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_interview_setup(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_interview_setup(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = InterviewSetupReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

class InterviewRoundViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewRoundSerializer
    http_method_names = ['get']
    filterset_fields = ['interview_setup']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = InterviewRound.objects.select_related('assigned_staff')
        if self.request.GET.get('interview_setup'):
            self.queryset = self.queryset.filter(
                interview_setup_id=self.request.GET.get('interview_setup')
            )
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = InterviewRoundReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

class JobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    http_method_names = ['get', 'put', 'delete']
    filterset_fields = ['is_active', 'status', 'job_role', 'interview_setup']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = JobApplication.objects.filter(is_active=True).select_related(
            'job_role', 'photo', 'resume', 'interview_setup'
        ).prefetch_related(
            'interview_evaluation_job_application',
            'interview_evaluation_job_application__interview_round',
            'interview_evaluation_job_application__evaluator',
            'job_application_document_job_application',
            'job_application_document_job_application__document'
        ).order_by('-id')

        my_interviews = self.request.GET.get('my_interviews')
        if my_interviews == '1' and hasattr(self.request.user, 'staff') and self.request.user.staff:
            staff = self.request.user.staff
            assigned_setup_ids = InterviewRound.objects.filter(
                assigned_staff=staff
            ).values_list('interview_setup_id', flat=True).distinct()
            incharge_setup_ids = InterviewSetup.objects.filter(
                incharge_staff=staff
            ).values_list('id', flat=True)
            self.queryset = self.queryset.filter(
                Q(interview_setup_id__in=assigned_setup_ids) |
                Q(interview_setup_id__in=incharge_setup_ids)
            ).distinct()

        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = JobApplicationReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = JobApplicationReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_job_application(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    @action(detail=True, methods=['get'], url_path='hire_prefill')
    def hire_prefill(self, request, pk=None):
        response = get_hire_prefill_data(pk)
        return Response(response)

class InterviewEvaluationViewSet(viewsets.ModelViewSet):
    serializer_class = InterviewEvaluationSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['job_application', 'interview_round']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = InterviewEvaluation.objects.filter(is_active=True).select_related(
            'evaluator', 'interview_round', 'job_application'
        )
        if self.request.GET.get('job_application'):
            self.queryset = self.queryset.filter(
                job_application_id=self.request.GET.get('job_application')
            )
        return self.queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = InterviewEvaluationReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = submit_evaluation(self, request.data)
        return Response(response)

class PublicJobApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = JobApplicationSerializer
    http_method_names = ['post', 'get']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        self.queryset = InterviewSetup.objects.filter(is_active=True).select_related('job_role')
        return self.queryset

    def list(self, request, *args, **kwargs):
        token = request.query_params.get('token', None)
        queryset = InterviewSetup.objects.filter(is_active=True).select_related('job_role')
        if token:
            queryset = queryset.filter(public_token=token)
        data = []
        for setup in queryset:
            data.append({
                'id': setup.id,
                'name': setup.name,
                'job_role': setup.job_role_id,
                'job_role_name': setup.job_role.name if setup.job_role else None,
                'requirements': setup.requirements or '',
                'instructions': setup.instructions or '',
                'public_token': str(setup.public_token),
            })
        return Response({'data': data})

    def create(self, request, *args, **kwargs):
        response = add_job_application_public(self, request.data)
        return Response(response)
