from http.client import responses
from rest_framework.exceptions import ValidationError
from rest_framework import viewsets, permissions
from rest_framework.views import Response
from apps.institutes.models.institute import Institute

from apps.feedbackform.models import FeedBackForm, FeedBackFormResponse as R
from apps.feedbackform.serializers import (FeedBackFormSerializer,
FeedBackFormResponseListReadSerializer, FeedBackFormResponseReadForEvaluteSerializer, FeedBackFormReadWithResponseSerializer, FeedBackFormReadWithResponseForSummarySerializer)
from apps.feedbackform.services.feedbackform import (
    create_feedbackform, delete_feedbackform, read_feedbackform_data, add_feedbackform_response, read_feedbackform_data_individual,
    get_feedbackform_response_data, evaluate_feedbackform_marks, evaluate_all_student_feedbackform_marks, feedbackform_response_summary,
    feedbackform_response_summary_for_staff, feedbackform_response_summary_for_student, get_feedbackform_terms_and_condition
)
from apps.shared.services import SharedService

"""
    This Api is only for the Staff
"""


class FeedBackFormViewSet(viewsets.ModelViewSet):
    serializer_class = FeedBackFormSerializer
    http_method_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = FeedBackForm.objects.filter()
        return self.queryset

    def get_object(self):
        if self.action == 'retrieve':
            return self.get_queryset().get(form_code=self.kwargs['pk'])
        elif self.action == 'destroy':
            return self.get_queryset().get(form_code=self.kwargs['pk'])
        else:
            return self.get_queryset().get(pk=self.kwargs['pk'])

    def create(self, request):
        if not self.request.user.is_staff:
            raise ValidationError('Only staff have access on this api')
        response = create_feedbackform(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_feedbackform_data(self, request)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = read_feedbackform_data_individual(self, request)
        return Response(response)

    def update(self, request, *args, **kwargs):
        # for now we give only support for approval
        data = {'is_finalized': True}
        response = SharedService.update_data(self, data, **{'partial': True})
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        if not self.request.user.is_staff:
            raise ValidationError('Only staff have access on this api')
        response = delete_feedbackform(self, request)
        return Response(response)


class FeedBackFormResponseViewSet(viewsets.ModelViewSet):
    serializer_class = FeedBackFormResponseListReadSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['form', 'is_submitted']

    def get_queryset(self):
        if self.request.GET.get('standard_section'):
            from apps.students.models.student import Student
            studentIds = Student.get_student_for_standard(
                None, [], [self.request.GET.get('standard_section')], ['id'])
            studentIds = [s['id'] for s in studentIds]
            self.queryset = R.objects.filter(
                is_active=True, student__in=studentIds)
        elif self.request.GET.get('form'):
            self.queryset = R.objects.filter(
                is_active=True, form=self.request.GET.get('form'))
        else:
            self.queryset = R.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = add_feedbackform_response(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_feedbackform_response_data(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(
            is_active=True, id=self.kwargs['pk'], is_evaluated=False, is_submitted=False)
        if not self.queryset:
            raise ValidationError(' is already evaluated or deleted')
        queryset.delete()
        return Response({'Reason': 'Data deleted successfully'})


class FeedBackFormEvalutaionViewSet(viewsets.ModelViewSet):
    serializer_class = FeedBackFormResponseReadForEvaluteSerializer
    http_method_names = ['put', 'post']

    def get_queryset(self):
        return R.objects.filter(is_active=True)

    def update(self, request, *args, **kwargs):
        response = evaluate_feedbackform_marks(self, request)
        return Response(response)

    """ evaluate for all marks """

    def create(self, request, *args, **kwargs):
        response = evaluate_all_student_feedbackform_marks(self, request)
        return Response(response)


class FeedBackFormResponseSummary(viewsets.ModelViewSet):
    serializer_class = FeedBackFormReadWithResponseSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return FeedBackForm.objects.all()

    def retrieve(self, request, *args, **kwargs):
        response = feedbackform_response_summary(self, request)
        return Response(response)

    def list(self, request):
        self.serializer_class = FeedBackFormReadWithResponseForSummarySerializer
        if self.request.user.is_staff:
            response = feedbackform_response_summary_for_staff(self, request)
        elif self.request.user.is_staff and request.GET.get('student'):
            response = feedbackform_response_summary_for_student(
                self, request, request.GET.get('student'))
        elif self.request.user.student:
            response = feedbackform_response_summary_for_student(
                self, request, self.request.user.student.id)
        else:
            raise ValidationError('User type is not valid')
        return Response(response)

class FeedBackFormTermsAndConditionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return FeedBackForm.objects.all()

    def retrieve(self, request, *args, **kwargs):
        response = get_feedbackform_terms_and_condition(self, request)
        return Response(response)

class FeedBackTypesViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return None

    def retrieve(self, request):
        response = [{
            'label':'Subject',
            'name':'subject'
        },
        {
            'label':'Staff',
            'name':'staff'
        },
        {
            'label':'Institute',
            'name':'institute'
        },
        {
            'label':'',
            'name':'institute'
        }]
        return Response(response)
