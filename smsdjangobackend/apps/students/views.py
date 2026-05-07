from django.db.models import Value, F, Func, CharField
from django.db.models.functions import Concat

from rest_framework import viewsets, exceptions, filters
from rest_framework.views import Response
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping, StudentTcIssuedTrack
from apps.classes.serializers import StudentTcIssuedTrackSerializer
from apps.finance.models.feeCollection import AdmissionForm
from apps.finance.serializers import AdmissionFormSerializer
from apps.shared.services_shared.custom import get_custom_data_for_objects
from apps.shared.services_shared.store_api_result import start_long_running_process
from apps.students.models.student import StudentGroup
from apps.students.models.studentDetail import StudentType
from apps.students.serializers import (StudentGroupSerializer, StudentRfidSerializer, StudentSerializer, StudentListSerializer, StudentFullDetailsSerializer,
                                       StudentTypeSerializer)
from apps.students.models import Student
from apps.shared.services import SharedService
from apps.students.services.certificate import get_certificate
from apps.students.services.reports import download_student_report
from apps.students.services.student import (add_or_edit_admission_form, add_student_to_admission_form, get_student_list, add_student, get_student_sibling_data, issue_tc_for_multiple_student, readmission_student, update_student, get_student_data,
                                            delete_student, add_student_type, get_student_type, update_student_type, get_student_admission_form_receipt,generate_id_cards_for_student,
                                            add_student_rfid, get_deleted_student_list,get_combined_student_staff_data,revert_deleted_students, get_student_academic_data)
from apps.users.services.permissions import OnlyRetrieveAccessForStudentData
from apps.users.models.user import User
from apps.users.services.user import revert_soft_delete_user_login  
from apps.students.models.student import StudentIdCardUpdate, IdCardUpdate
from apps.students.serializers import IdCardUpdateSerializer, StudentIdCardUpdateSerializer
from apps.shared.variables.default_variables import json_dynamic_values_for_template
from apps.students.services.idcard import process_and_upload
from apps.students.services.student import student_id_card_update, get_student_id_card_update_data, student_id_card_delete,create_student_idcard_update,update_student_idcard_update,list_student_idcard_update,get_dashboard_data,idcard_data_sync
from apps.institutes.models.academicYear import AcademicYear


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']
    search_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'dob', 'current_standard__name',
                     'student_admission__admission_num', 'current_reg_num', 'user_student__barcode_number','student_parent__parent__f_mobile_num','student_parent__parent__m_mobile_num']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'mobile_num', 'dob', 'current_reg_num', 'full_name',
                       ('current_standard_name', 'current_standard__name'), ('admission_num', 'id'), 'id'
                    ]

    def get_queryset(self):
        self.queryset = Student.objects.annotate(
            full_name=Concat(
                F('first_name'),
                Value(' '),
                F('middle_name'),
                Value(' '),
                F('last_name'),
                output_field=CharField()
            )
        )
        search_fields = self.request.query_params.getlist('search_fields', [])
        if search_fields:
            self.filter_backends = [filters.SearchFilter]
            self.search_fields = search_fields
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        if request.GET.get('academic_year_for_standard'):
            student_obj = Student.objects.get(id=self.kwargs['pk'])
            enrolled_data = Enrollment.objects.filter(
                standard_section__academic_year=request.GET.get('academic_year_for_standard'),
                student=student_obj.id
            ).values(
                'standard_section', 'standard_section__section__name', 'standard_section__standard__name',
            )
            student_data = {
                'first_name':student_obj.first_name,
                'middle_name':student_obj.middle_name,
                'last_name': student_obj.last_name,
                'id': student_obj.id,
            }
            if enrolled_data:
                student_data = {**student_data, **enrolled_data[0]}
            return Response({'data': student_data})
        else:
            response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_student_list(self)
        print('response', response)
        if self.request.GET.get('download_excel'):
            return response
        return Response(response)

class StudentAllDetailsViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    http_method_names = ['post', 'put', 'delete']
    filterset_fields = ['current_standard', 'is_active']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_student(self, request.data, True, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_student(self, request.data, True, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_student(self, request.data, *args, **kwargs)
        return Response(response)
    #
    # def retrieve(self, request, *args, **kwargs):
    #     response = SharedService.read_data(self)
    #     return Response(response)
    #
    # def list(self, request, *args, **kwargs):
    #     response = SharedService.read_data(self, True)
    #     return Response(response)


class StudentListViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    filterset_fields = ['current_standard', 'is_active']
    permission_classes = (OnlyRetrieveAccessForStudentData,)
    

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class GetStudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentFullDetailsSerializer
    http_method_names = ['get']
    filterset_fields = ['first_name', 'current_standard', 'current_reg_num', 'is_active']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_student_data(self)
        response['data'] = get_custom_data_for_objects(self, [response['data']], 'Student')[0]
        if request.GET.get('admission_form_download'):
            response = get_student_admission_form_receipt(self,response)
            return response
        else:
            return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    

    
    
class CertificateViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = get_certificate(self, request.data)
        if request.data.get('get_dynamic_values'):
            return Response(response)
        else:
            response = get_certificate(self, request.data)
            return response
        
    def list(self, request):
        response = get_certificate(self, {"certificate_type":"studycertificate","student":464})
        return response


class StudentTypeViewSet(viewsets.ModelViewSet):
    serializer_class = StudentTypeSerializer
    http_method_names = ['post', 'get', 'put']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = StudentType.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_student_type(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_student_type(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_student_type(self, request.data, **kwargs)
        return Response(response)

class StudentRfidRegisterViewSet(viewsets.ModelViewSet):
    serializer_class = StudentRfidSerializer
    http_method_names = ['post', 'get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num','full_name']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_student_rfid(self, request)
        return Response(response)

    def list(self, request):
        response = SharedService.read_data_paginated(self, request)
        return Response(response)

class SiblingDataViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request):
        response = get_student_sibling_data(self, request)
        return Response(response)

class StudentGroupViewset(viewsets.ModelViewSet):
    serializer_class = StudentGroupSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = StudentGroup.objects.filter(is_active=True)
        return self.queryset

    def list(self, request):
        response =  SharedService.read_data(self, True)
        return Response(response)

class StudentAdmissionNumViewset(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request):
        if AdmissionForm.objects.filter(admission_num=self.request.GET.get('admission_num')):
            raise exceptions.ValidationError('Admission Number already exist')
        return Response({'Reason': 'Avaialble'})

class StudentReadmissionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = readmission_student(self, request.data)
        return Response(response)

class IssueTcForStudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentTcIssuedTrackSerializer
    http_method_names = ['post', 'get']
    
    def get_queryset(self):
        return StudentTcIssuedTrack.objects.all()

    def create(self, request, *args, **kwargs):
        response = issue_tc_for_multiple_student(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_deleted_student_list(self, {'only_tc_issued': True})
        return Response(response)

class AdmissionNumberViewSet(viewsets.ModelViewSet):
    serializer_class = AdmissionFormSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = AdmissionForm.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_edit_admission_form(self, request.data)
        return Response(response)

class StudentReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = download_student_report(self, request.data)
        return response

class DeletedStudentViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_deleted_student_list(self)
        return Response(response)
    
class UploadIdCardViewSet(viewsets.ModelViewSet):
    serializer_class =None
    http_method_names = ['post']
    
    def create(self, request, *args, **kwargs):
        image_url_or_file = request.data.get('file') or request.FILES.get('file')
        if not image_url_or_file:
            return Response(
                {'error': 'file is required (URL string or file upload)'},
                status=400
            )
        bgcolor = request.data.get('bgcolor', '#FFFFFF')
        bgremove= request.data.get('bgremove',1)
        crop = request.data.get('crop',1)
        response = process_and_upload(self, image_url_or_file, crop,bgremove,bgcolor=bgcolor,)
        return Response(response)
    
    
class GenerateIdCardViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post', 'get']


    def create(self, request, *args, **kwargs):
        if self.request.GET.get('update_print'):
            response = generate_id_cards_for_student(self, request.data)
            return response
        if self.request.GET.get('preview'):
            response = generate_id_cards_for_student(self, request.data)
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(generate_id_cards_for_student, self, request.data)
            return Response({'Result': True})
        response = generate_id_cards_for_student(self, request.data)
        return response
        return Response(response)

    def list(self, request, *args, **kwargs):
        data = {'academic_year': 2, 'standard_section_ids': [25], 'document_type': 'pdf', 'file_name': 'LKG-A'}
        response = generate_id_cards_for_student(self, data)
        return response
    
class CombinedStudentStaffViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        page = int(self.request.GET.get('pageno'))
        limit = int(self.request.GET.get('limit'))
        search_query = self.request.GET.get('search', '')  

        response = get_combined_student_staff_data(self,page,limit,search_query)
        return Response(response)
    
class StudentRevertViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']
    def create(self, request, *args, **kwargs):
        student_id = request.data.get('student_id')
        reason_id = request.data.get('reason_id')
        if not student_id:
            return Response({'status': 'error', 'message': 'No student ID provided.'}, status=400)
        if not reason_id:
            return Response({'status': 'error', 'message': 'No reason ID provided.'}, status=400)
        student_result = revert_deleted_students(student_id, reason_id)
        user_result = revert_soft_delete_user_login(student_id, key='student')
        return Response({
            'student_result': student_result,
            'user_result': user_result,
        })

class StudentStandardWiseReport(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('standard_section_wise_report'):
            response = StudentStandardMapping.get_gender_wise_student_count(self.request.GET.get('academic_year'), True)
        else:
            response = StudentStandardMapping.get_gender_wise_student_count(self.request.GET.get('academic_year'))
        return Response({'data': response})
    
class StudentAcademicDetailsViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_student_academic_data(self,request.data)
        return Response(response)


from rest_framework import viewsets
from rest_framework.response import Response

class StudentIdCardUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = StudentIdCardUpdateSerializer
    http_method_names = ['post', 'get', 'delete', 'put']

    def get_queryset(self):
        return StudentIdCardUpdate.objects.select_related('student', 'academic_year', 'image', 'processed_image').all()

    def create(self, request, *args, **kwargs):
        response = create_student_idcard_update(self,request,*args,**kwargs)

        return response

    def update(self, request, *args, **kwargs):
        
        response = update_student_idcard_update(self, request, *args, **kwargs)
        return response

    def list(self, request, *args, **kwargs):
        response = list_student_idcard_update(self, request, *args, **kwargs)
        return response
        

    def retrieve(self, request, *args, **kwargs):
        academicyear = self.request.GET.get('academicyear')
        instance = StudentIdCardUpdate.objects.get(
            student=kwargs['pk'],
            academic_year=academicyear
        )

        serializer = StudentIdCardUpdateSerializer(instance)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        response = student_id_card_delete(self, request.data, kwargs)
        return Response(response)

class IdCardUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = IdCardUpdateSerializer
    http_method_names = ['post','get']

    def get_queryset(self):
        return IdCardUpdate.objects.all()

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    

class IdCardDashboardViewSet(viewsets.ModelViewSet):

    def get_queryset(self):
        return IdCardUpdate.objects.all()

    def list(self, request, *args, **kwargs):
        academicyear= self.request.GET.get('academicyear')
        response = get_dashboard_data(academicyear)
        return Response(response)
    
    
class IdCardDataSyncViewSet(viewsets.ViewSet):

    def create(self, request, *args, **kwargs):
        return idcard_data_sync(self, request, *args, **kwargs)