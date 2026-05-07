from rest_framework import viewsets
from rest_framework.views import Response
from rest_framework import permissions
from rest_framework.exceptions import ValidationError

from apps.forms.serializers import (ApplicationStudentSerializer, ApplicationStudentFullDetailsSerializer,
                                    ApplicationSearchSerializer, EnquiryStudentSerializer, EnquiryStudentListSerializer,
                                    EnquiryStudentFullDetailsSerializer, EnquirySearchSerializer,
                                    EnquiryFollowupWithEnquirySerializer, EnquiryEmployeeReportSerializer)
from apps.forms.models import EnquiryStudent, ApplicationStudent, EnquiryFollowup
from apps.forms.services.application import (add_application, update_application, delete_application,get_application_form,
                                             get_application_for_admission,download_application_student_data)
from apps.forms.services.enquiry import add_enquiry, update_enquiry, delete_enquiry, get_enquiry_for_application, get_enquiry_student,download_enquiry_student_data,read_last_enquiry_followup,add_enquiry_followup,read_all_enquiry_followup,read_enquiry_employee_report,read_enquiry_dashboard
from apps.forms.services.shared import get_forms_paginated_list
from apps.forms.services.application_auth import generate_application_otp, verify_application_otp
from apps.forms.services.application_payment import (get_application_fee_amount, create_application_payment_order)
from apps.finance.services.forms import get_application_fee_receipt
from apps.payments.services.order_payments import update_payment_status
from apps.shared.services_shared.custom import get_custom_data_for_objects
from apps.shared.services import SharedService
from django.contrib.contenttypes.models import ContentType
from apps.users.services.permissions import OnlyCreateAccess
from apps.payments.models.online_payments import OnlinePayment
from apps.payments.constants import PENDING_PAYMENT_STATUSES

class EnquiryStudentViewSet(viewsets.ModelViewSet):
    serializer_class = EnquiryStudentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['current_standard', 'is_active']
    permission_classes = (OnlyCreateAccess,)

    def get_queryset(self):
        self.queryset = EnquiryStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_enquiry(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        staff = request.GET.get('staff')
        if staff:
            EnquiryStudent.objects.filter(id =kwargs['pk']).update(staff=staff)
            return Response({'message': 'Staff updated successfully'})
        response = update_enquiry(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_enquiry(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)

        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class GetEnquiryStudentViewSet(viewsets.ModelViewSet):
    serializer_class = EnquiryStudentFullDetailsSerializer
    http_method_names = ['get']
    filterset_fields = ['first_name', 'entry_academic_year', 'is_active']
    search_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'enquiry_date', 'enquiry_num',
                     'current_standard__name']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'enquiry_date', 'enquiry_num', 'id',
                       ('current_standard_name', 'current_standard__name'), ('full_name', 'first_name')]

    def get_queryset(self):
        self.queryset = EnquiryStudent.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        response['data'] = get_custom_data_for_objects(self, [response['data']], 'EnquiryStudent')[0]
        
        if request.GET.get('enquiry_form_download'):
            response = get_enquiry_student(self, response)
            print(response)
            return response  # Ensure this returns the correct Response, HttpResponse, or HttpStreamingResponse
        else:
            return Response(response)  # Return regular API response
    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_excel'):
            response = get_forms_paginated_list(self, 'enquiry')
            response = download_enquiry_student_data(self, response)
            return response
        response = get_forms_paginated_list(self, 'enquiry')
        return Response(response)


class GetEnquiryStudentForApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = EnquiryStudentFullDetailsSerializer
    http_method_names = ['get']
    lookup_field = 'enquiry_num'
    search_fields = ['first_name', 'enquiry_num']

    def get_queryset(self):
        self.queryset = EnquiryStudent.objects.all()
        return self.queryset

    def get_object(self):
        try:
            filter_query = {
                'enquiry_num': self.kwargs['enquiry_num']
            }
            if self.request.GET.get('branch'):
                filter_query['current_standard__branch'] = self.request.GET.get('branch')
            return self.get_queryset().get(**filter_query)
        except Exception as e:
            raise ValidationError('Application number doesnot exist or Application Number is not approved')

    def retrieve(self, request, *args, **kwargs):
        response = get_enquiry_for_application(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = EnquirySearchSerializer
        response = SharedService.read_data(self, True)
        return Response(response)


class EnquiryStudentListViewSet(viewsets.ModelViewSet):
    serializer_class = EnquiryStudentListSerializer
    http_method_names = ['get']
    filterset_fields = ['current_standard', 'is_active']

    def get_queryset(self):
        self.queryset = EnquiryStudent.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class EnquiryFollowupViewSet(viewsets.ReadOnlyModelViewSet):
    """API to fetch enquiry followup with enquiry and student details."""
    serializer_class = EnquiryFollowupWithEnquirySerializer
    http_method_names = ['get','post']
    filterset_fields = ['enquiry_student', 'status','staff_name','academic_year']
    search_fields = ['enquiry_student__first_name', 'enquiry_student__last_name', 'enquiry_student__enquiry_num']
    ordering_fields = ['followup_date', 'next_followup_date', 'no_of_followup']

    def get_queryset(self):
        return EnquiryFollowup.objects.select_related(
            'enquiry_student',
            'enquiry_student__student_details',
            'enquiry_student__student_details__country',
            'enquiry_student__student_details__state',
            'enquiry_student__student_details__district',
            'enquiry_student__student_details__city',
            'enquiry_student__student_details__map_address',
            'enquiry_student__current_standard',
            'enquiry_student__entry_academic_year'
        ).all()

    def retrieve(self, request, *args, **kwargs):
        response = read_all_enquiry_followup(self,**kwargs)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_last_enquiry_followup(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_enquiry_followup(self, request.data)
        return Response(response)
    

class EnquiryEmployeeReportViewSet(viewsets.ModelViewSet):
    serializer_class = EnquiryEmployeeReportSerializer
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = read_enquiry_employee_report(self)
        return Response(response)

class EnquiryDashboardViewSet(viewsets.ViewSet):

    def list(self, request):
        data = read_enquiry_dashboard(self)
        return Response(data)

class ApplicationStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationStudentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['first_name', 'application_num', 'entry_academic_year', 'is_active']
    search_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'application_date', 'application_num',
                     'current_standard__name', 'is_approved']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'application_date', 'application_num',
                       ('current_standard_name', 'current_standard__name'), 'id', ('full_name', 'first_name')]

    def get_queryset(self):
        self.queryset = ApplicationStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_application(self, request.data, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_application(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_application(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_excel'):
            response = get_forms_paginated_list(self, 'application')
            response = download_application_student_data(self, response)
            return response
        response = get_forms_paginated_list(self, 'application')
        return Response(response)

class ApplicationStudentPublicViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationStudentSerializer
    http_method_names = ['post']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        self.queryset = ApplicationStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_application(self, request.data, False)
        return Response(response)

class GetApplicationStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationStudentFullDetailsSerializer
    http_method_names = ['get']
    filterset_fields = ['first_name', 'current_standard', 'entry_academic_year', 'is_active', 'is_approved']

    def get_queryset(self):
        self.queryset = ApplicationStudent.objects.filter()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        response['data'] = get_custom_data_for_objects(self, [response['data']], 'ApplicationStudent')[0]
        if request.GET.get('application_form_download'):
            return get_application_form(self, response)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class GetApplicationForAdmissionStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationStudentFullDetailsSerializer
    http_method_names = ['get']
    lookup_field = 'application_num'
    search_fields = ['first_name', 'application_num', 'is_approved']

    def get_object(self):
        try:
            return self.get_queryset().get(application_num=self.kwargs['application_num'], is_approved=True)
        except:
            raise ValidationError('Application number doesnot exist or Application Number is not approved')

    def get_queryset(self):
        filter_query = {'is_active': True}
        if self.request.GET.get('academic_year'):
            filter_query['entry_academic_year'] = self.request.GET.get('academic_year')
        if self.request.GET.get('branch'):
            filter_query['current_standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['current_standard__board'] = self.request.GET.get('board')
        self.queryset = ApplicationStudent.objects.filter(**filter_query)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_application_for_admission(self)
        response['data'] = get_custom_data_for_objects(self, [response['data']], 'ApplicationStudent')[0]
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = ApplicationSearchSerializer
        response = SharedService.read_data(self, True)
        return Response(response)


class ApproveApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationStudentSerializer
    http_method_names = ['put']

    def get_queryset(self):
        return ApplicationStudent.objects.all()

    def update(self, request, *args, **kwargs):
        data = {'is_approved': True, 'approved_by': self.request.user.id}
        return Response(SharedService.update_data(self, data, **{'partial': True}))


class ApplicationFormOtpViewSet(viewsets.ModelViewSet):
    """
    Public API for Application Form OTP generation and verification
    """
    http_method_names = ['post']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return []

    def create(self, request, *args, **kwargs):
        if 'is_verify' in request.data and request.data['is_verify']:
            # Verify OTP
            response = verify_application_otp(self, request)
        else:
            # Generate OTP
            response = generate_application_otp(self, request)
        return Response(response)


class ApplicationFeePaymentViewSet(viewsets.ModelViewSet):
    """
    Public API for Application Fee Payment
    """
    http_method_names = ['post', 'get']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return []

    def create(self, request, *args, **kwargs):
        """
        Create payment order for application fee
        """
        response = create_application_payment_order(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        """
        Get application fee amount for a standard
        """
        application_student_id = request.GET.get('application_student_id')
        standard_id = request.GET.get('standard_id')
        academic_year_id = request.GET.get('academic_year_id')
        
        if not application_student_id:
            raise ValidationError('Application Student ID is required')
        
        fee_amount = get_application_fee_amount(self, application_student_id, standard_id, academic_year_id)
        
        return Response({
            'data': {
                'fee_amount': fee_amount,
                'application_student_id': application_student_id
            }
        })


class ApplicationUserDashboardViewSet(viewsets.ModelViewSet):
    """
    API for User Dashboard - Get user's applications and payments
    Requires authentication via token from OTP login
    """
    http_method_names = ['get']
    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        return []

    def list(self, request, *args, **kwargs):
        """
        Get user's applications and payment history
        """
        from apps.forms.models import ApplicationStudent
        from apps.finance.models import ApplicationPaymentDetail
        from apps.forms.serializers import ApplicationStudentSerializer
        pending_order_data = OnlinePayment.objects.filter(
            user=request.user, payment_status__in=PENDING_PAYMENT_STATUSES,
        ).values('order_id')
        for pending in pending_order_data:
            update_payment_status(self, {'orderId': pending['order_id']})
        
        user = request.user
        applications = ApplicationStudent.objects.filter(user=user, is_active=True).order_by('-created')
        payments = ApplicationPaymentDetail.objects.filter(user=user).order_by('-created')
        
        application_serializer = ApplicationStudentSerializer(applications, many=True)
        payment_data = []
        for payment in payments:
            payment_data.append({
                'id': payment.id,
                'application_student_id': payment.student.id if payment.student else None,
                'application_num': payment.student.application_num if payment.student else None,
                'student_name': payment.student.first_name if payment.student else None,
                'amount_paid': payment.amount_paid,
                'receipt_num': payment.receipt_num,
                'transaction_date': payment.transaction_date,
                'mode_of_payment': payment.mode_of_payment,
                'payment_ref_num': payment.payment_ref_num,
                'created': payment.created
            })
        
        return Response({
            'data': {
                'applications': application_serializer.data,
                'payments': payment_data,
                'total_applications': applications.count(),
                'total_payments': payments.count()
            }
        })

    def retrieve(self, request, *args, **kwargs):
        application_student_id = kwargs['pk']

        if request.GET.get('receipt'):
            return get_application_fee_receipt(self, data={
                'application_student_id': application_student_id
            })

        # No receipt param -> return application form PDF
        from apps.forms.serializers import ApplicationStudentFullDetailsSerializer
        application_student = ApplicationStudent.objects.get(
            id=application_student_id,
            user=request.user
        )
        response = {'data': ApplicationStudentFullDetailsSerializer(application_student).data}
        response['data'] = get_custom_data_for_objects(self, [response['data']], 'ApplicationStudent')[0]
        return get_application_form(self, response)