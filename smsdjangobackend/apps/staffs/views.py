from botocore.exceptions import ValidationError
from xml.dom import ValidationErr
from rest_framework.views import Response, APIView
from rest_framework import viewsets
from apps.shared.services_shared.common import get_teaching_staff_group_ids
from apps.shared.services_shared.store_api_result import start_long_running_process
from apps.staffs.models.department import Department, DepartmentStaffMapping
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.staffs.services.staff_certificate import get_staff_certificate

from apps.staffs.services.staff import (add_or_update_staff_standard_mapping, delete_department, delete_staff_detail,add_staff, generate_id_cards_for_staff,update_staff,get_staff_list,add_staff_group,
                                        update_staff_group,read_staff_group_mapping, read_staff_group_mapping,download_staff_data,add_mentor_student, read_mentor_student_mapping)
from apps.shared.services import SharedService, UploadTypeService
from .serializers import (DepartmentSerializer, DepartmentStaffMappingSerializer, DepartmentStaffMappingReadSerializer,
                          StaffSerializer, StaffAllDetailSerializer, StaffGetNameSerializer, StaffStandardMappingDataReadSerializer, 
                          StaffStandardMappingSerializer, StaffBranchMappingSerializer, MentorStudentMappingSerializer, StaffStudentMeetingSerializer)
from apps.staffs.models import Staff
from apps.staffs.models.staff import StaffBranchMapping, MentorStudentMapping, StaffStudentMeeting
from apps.shared.utils import (PostLimitOfsetPagination, PostPageNumberPagination)
from apps.users.services.permissions import OnlyRetrieveAccessForStaffData


class PaginatedStaffDetail(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    pagination_class = PostPageNumberPagination


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
    filterset_fields = ['employee_status']
    http_method_names = ['get', 'put', 'delete']

    def retrieve(self, request, *args, **kwargs):
        UploadTypeService.set_bucket_folder_path()
        response = get_staff_list(self, False)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_excel'):
            data = Staff.objects.select_related()
            serializer = StaffAllDetailSerializer(data, many=True)
            response = download_staff_data(self, serializer.data)
            return response
        else:
            response = get_staff_list(self)
            return Response(response)

    def destroy(self, request, *args, **kwargs):
        UploadTypeService.set_bucket_folder_path()
        response = delete_staff_detail(self)
        return Response(response)

class StaffAllDetailViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffAllDetailSerializer
    filterset_fields = ['is_active']
    http_method_names = ['get', 'post', 'put']
    permission_classes = (OnlyRetrieveAccessForStaffData,)

    def create(self, request, *args, **kwargs):
        UploadTypeService.set_bucket_folder_path()
        response = add_staff(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        UploadTypeService.set_bucket_folder_path()
        response = update_staff(self, request.data, **kwargs)
        return Response(response)

    def list(self, request, *args, **kwargs):
        data = Staff.objects.select_related()
        serializer = StaffAllDetailSerializer(data, many=True)
        return Response({'data': serializer.data})

    def retrieve(self, request, *args, **kwargs):
        UploadTypeService.set_bucket_folder_path()
        response = get_staff_list(self, False)
        return Response(response)


class StaffGetStaffFullName(APIView):

    def get(self, request):
        ordering = self.request.GET.get('ordering', ())
        if ordering:
            ordering = tuple(ordering.split(','))
        response = {}
        filter_data = {'is_active': True}
        if request.GET.get('teaching_staff'):
            filter_data['users__groups__id__in'] = get_teaching_staff_group_ids(self)
        data = Staff.objects.filter(**filter_data).order_by(*ordering)
        response['data'] = StaffGetNameSerializer(data, many=True).data
        return Response(response)

class StaffStandardMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StaffStandardMappingSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        if self.request.method == 'GET':
            self.search_fields = ['first_name', 'middle_name', 'last_name']
            #mapped_type = 'only_mapped' / 'only_not_mapped'
            self.queryset = Staff.objects.filter(is_active=True)
            if self.request.GET.get('mapped_type') and self.request.GET.get('mapped_type') == 'only_mapped':
                self.queryset = self.queryset.filter(staff_standard_mapping_staff__isnull=False)
            if self.request.GET.get('mapped_type') and self.request.GET.get('mapped_type') == 'only_not_mapped':
                self.queryset = self.queryset.filter(staff_standard_mapping_staff__isnull=True)
            self.queryset = self.queryset.distinct()
        else:
            self.search_fields = ['staff__first_name', 'staff__middle_name', 'staff__last_name']
            self.queryset = StaffStandardMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_update_staff_standard_mapping(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = StaffStandardMappingDataReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = StaffStandardMappingDataReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Department.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['departments'], 'name')
        response = SharedService.add_data(self, request.data['departments'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_department(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class GenerateIdCardForStaffViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(generate_id_cards_for_staff, self, request.data)
            return Response({'Result': True})
        response = generate_id_cards_for_staff(self, request.data)
        return response
        return Response(response)

class StaffCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = StaffSerializer
    http_method_names = ['post', 'get']
    queryset = Staff.objects.all()
    # def get_queryset(self):
    #     self.queryset = Staff.objects.all()
    #     return self.queryset

    def create(self, request, *args, **kwargs):
        request_dict=request.data
        response = get_staff_certificate(self, request.data)
        if 'get_dynamic_values' in request_dict and request_dict['get_dynamic_values']:
            return Response(response)
        else:
            response = get_staff_certificate(self, request.data)
            return response
    def list(self, request):
        response = get_staff_certificate(self, {"certificate_type":"teacher_appointment_letter","staff":464})
        return response
    
class StaffHODBranchViewSet(viewsets.ModelViewSet):
    serializer_class = StaffBranchMappingSerializer
    http_method_names = ['get', 'post', 'delete','put']

    def get_queryset(self):
        self.queryset = StaffBranchMapping.objects.filter()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_staff_group(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_staff_group(self, request.data)
        return Response(response)

    # def destroy(self, request, *args, **kwargs):
    #     response = delete_staff_group(self)
    #     return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_staff_group_mapping(self)
        return Response(response)
    
class MentorStudentMappingViewSet(viewsets.ModelViewSet):
    serializer_class = MentorStudentMappingSerializer
    filterset_fields = ['is_active']
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = MentorStudentMapping.objects.filter()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_mentor_student(self, request.data)
        return Response(response)

    # def destroy(self, request, *args, **kwargs):
    #     response = delete_staff_group(self)
    #     return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_mentor_student_mapping(self)
        return Response(response)
    
class StaffStudentMeetingViewSet(viewsets.ModelViewSet):
    serializer_class = StaffStudentMeetingSerializer
    http_method_names = ['get','post','delete','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        filter_query = {}
        if self.request.GET.get('student_id'):
            student_id = self.request.GET.get('student_id')
            filter_query['student_id'] = student_id
        if self.request.GET.get('staff_id'):
            staff_id = self.request.GET.get('staff_id')
            filter_query['staff_id'] = staff_id
        self.queryset = StaffStudentMeeting.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request):
        response = SharedService.add_data(self, request.data,False)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class DepartmentStaffMappingViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentStaffMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'department', 'staff']

    def get_queryset(self):
        self.queryset = DepartmentStaffMapping.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        data_list = request.data if isinstance(request.data, list) else [request.data]
        staff_ids = [item.get('staff') for item in data_list if item.get('staff')]
        already_assigned = DepartmentStaffMapping.objects.filter(
            staff_id__in=staff_ids, is_active=True
        ).values_list('staff_id', flat=True)
        if already_assigned:
            names = Staff.objects.filter(id__in=already_assigned).values_list('first_name', flat=True)
            return ValidationError(f"Staff already assigned to a department: {', '.join(names)}")
        response = SharedService.add_data(self, data_list)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = DepartmentStaffMappingReadSerializer
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = DepartmentStaffMappingReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)