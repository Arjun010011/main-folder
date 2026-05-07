from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.classes.models.subject import CumulativeType, Subject
from apps.exams.models import (ExamType, Exam, ExamSchedule, StudentScheduleMapping, ExamTerm,
ResultConfiguration, StudentMark, StudentExamFinalResult)
from rest_framework import viewsets, exceptions
from apps.exams.models.exam import GradePlan
from apps.exams.models.schedule import ExamScheduleQuestionmapping
from apps.exams.models.marks import GradeExamScheduleMapping,StudentMarkSectionWiseApproval, StudentMarkQuestionWise
from apps.exams.models.result import ExamFinalResultConfiguration, ResultSectionApproval,ResultConfigurationMergeName
from apps.exams.models.result_configuration import ExamResultConfiguration, ExamResultMarksObtained
from apps.exams.serializers import ( ExamFinalResultConfigurationSerializer, ExamResultConfigurationSerializer, ExamResultMarksObtainedSerializer, ExamTypeSerializer, ExamSerializer, ExamReadSerializer,
 ExamScheduleSerilaizer, ExamScheduleSerilaizer, GradePlanSerializer, ResultSectionApprovalSerializer, StudentMarkSerializer, ResultConfigurationSerializer,
 ExamScheduleReadSerilaizer, StudentMarkReadSerializer, ExamTermReadSerializer, ScheduleStudentSerializer, StudentExamFinalResultSerializer,ResultConfigurationMergeNameViewSetSerializer,ExamMarkUnapproveSerializer,FinalResultConfigurationSerializer,FinalResultSectionApprovalSerializer,
 ExamScheduleReadSerilaizer, StudentMarkReadSerializer, ExamTermReadSerializer, ScheduleStudentSerializer, StudentExamFinalResultSerializer,ResultConfigurationMergeNameViewSetSerializer,ExamMarkUnapproveSerializer,
 StudentExamFinalResultForFinalConfigSerializer,ExamScheduleQuestionmappingSerializer, StudentMarkQuestionWiseSerializer)
from apps.exams.models.final_result import ( FinalResultConfiguration,FinalResultSectionApproval,StudentExamFinalResultForFinalConfig)
from apps.exams.services.final_result import add_final_result_configuration,get_final_section_configuration_data,get_final_configuration_data,approve_final_result_config,announce_final_result_list_config,announce_final_result_config
from apps.institutes.models import academicYear
from apps.shared.services import FormdefinitionService, SharedService, ApprovalService
from apps.institutes.models.institute import Institute
from apps.institutes.serializers import InstituteSerializer
from apps.shared.services import PDFService,SharedService
from apps.shared.services_shared.common import get_selected_template
from apps.exams.services.mark import (add_update_mark, add_update_grade, get_marks_for_config, get_marks_card_for_config,get_consolidated_report_for_config,get_marks_card_for_finalconfig,get_consolidated_report_for_finalconfig,get_question_mark,
get_standard_section_subjects, get_all_standard_marks, approve_student_mark, approve_student_mark_for_config, student_exam_mark, get_marks_for_final_config, add_update_question_mark,get_amrita_report,get_exam_data_exceptions, process_standard_consolidated_marks,
get_multiple_standard_section_subjects)
from apps.exams.services.mark_optimized import get_standard_section_subjects_optimized
from rest_framework.response import Response
from rest_framework import status
from apps.exams.services.exam import ( add_update_exam,
add_update_schedule, get_halticket,get_exam_schedule_data, approve_exam, add_or_update_student_to_schedule, get_standards_for_exam, get_student_exam_schedule,
get_exam_list_for_student, create_question_based_exam_schedule, copy_exam_schedule, clear_entire_exam_schedule_if_no_marks,
get_exam_schedule_dashboard, clear_exam_schedules_bulk_if_no_marks)
from apps.exams.services.exam_payload_ui_v2 import (
    add_update_exam_ui_v2,
    bulk_add_update_exams_ui_v2,
    should_route_exam_payload_through_ui_v2,
)
from apps.exams.services.result import (add_final_exam_result_configuration, add_or_update_exam_result_configuration, add_result_configuration, announce_exam_result, announce_result, approve_exam_result_configuration, approve_final_result, approve_result_config, exam_final_result_configuration_data, exam_final_result_summary, get_announce_exam_result_config, get_configuration_data, announce_result_list, get_exam_configuration_data, get_exam_configured_result,
get_section_configuration_data, announce_result_list_config, add_or_update_exam_status, announce_result_config, get_standard_section_list_for_exam, read_exam_result_config, student_exam_marks_list,get_exam_config_consolidated_report)
from apps.exams.services.final_result import exam_final_result_config_summary
from django.contrib.contenttypes.models import ContentType
from apps.shared.models.approval import ApproveStatus
from rest_framework.views import APIView
import copy
import os
from django.http import FileResponse
from django.db import transaction
from apps.shared.services_shared.store_api_result import start_long_running_process
from apps.classes.models.standard import StandardSectionMapping
from apps.exams.services.mark import download_consolidation_marks_for_standard


# Create your views here.

class ExamTermViewSet(viewsets.ModelViewSet):
    serializer_class = ExamTermReadSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = ExamTerm.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class ExamTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ExamTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['exam_type']

    def get_queryset(self):
        self.queryset = ExamType.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        id = self.kwargs['pk']
        examIds = list(Exam.objects.filter(exam_type=id).values_list('id', flat=True))
        contentTypeId = ContentType.objects.get(model='exam', app_label='exams').id
        approvalStatus = ApproveStatus.objects.filter(content_type=contentTypeId, object_id__in=examIds).values(
            'approval_status'
        )
        isApprovalStatsExist = False
        for a in approvalStatus:
            if a['approval_status'] != '0':
                isApprovalStatsExist = True
        if isApprovalStatsExist:
            raise exceptions.ValidationError(f'Exam Type Cant be edited as in exams are approved')
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'exam_type_related__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data, 'Not able to delete. Exam type already mapped to Exam')
        return Response(response)

class ExamViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['academic_year', 'term']

    def get_queryset(self):
        self.queryset = Exam.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        bulk_exams = None
        if isinstance(request.data, dict):
            bulk_exams = request.data.get("bulk_exams") or request.data.get("exams")

        if bulk_exams is not None:
            response = bulk_add_update_exams_ui_v2(self, bulk_exams)
            # Return HTTP 200 even for partial failures; frontend will display details.
            return Response(response, status=status.HTTP_200_OK)

        if should_route_exam_payload_through_ui_v2(request.data):
            response = add_update_exam_ui_v2(self, request.data, False)
        else:
            response = add_update_exam(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        self.serializer_class = ExamReadSerializer
        response = SharedService.read_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        if should_route_exam_payload_through_ui_v2(request.data):
            response = add_update_exam_ui_v2(self, request.data, True)
        else:
            response = add_update_exam(self, request.data, True)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = ExamReadSerializer
        response = SharedService.read_data(self, True)
        if self.request.GET.get('branch'):
            filtered_list = []
            for temp in response['data']:
                standard_section_ids = temp['standard_section_ids'].split(',')
                if StandardSectionMapping.objects.filter(id__in=standard_section_ids, standard__branch=self.request.GET.get('branch')):
                    filtered_list.append(temp)
            response['data'] = filtered_list
        if self.request.GET.get('board'):
            filtered_list = []
            for temp in response['data']:
                standard_section_ids = temp['standard_section_ids'].split(',')
                if StandardSectionMapping.objects.filter(id__in=standard_section_ids, standard__board=self.request.GET.get('board')):
                    filtered_list.append(temp)
            response['data'] = filtered_list

        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'examschedule__isnull': True}
        examData = self.get_queryset().get(id=self.kwargs['pk'])
        ApprovalService.get_approval_status(self, examData, message='Not able to edit schedule exam already approved or waiting for approval', raise_approvals=[1,3])
        response = SharedService.delete_unrefered_data(self, filter_data, 'Not able to delete. Exam Schedule data is referred')
        return Response(response)

class ExamApproveViewSet(viewsets.ModelViewSet):
    serializer_class = ExamSerializer
    http_method_names = ['get', 'put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Exam.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = approve_exam(self, request.data, **kwargs)
        return Response(response)

class ExamScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ExamScheduleSerilaizer
    http_method_names = ['get', 'post', 'put']
    filterset_fields = ['standard_section']

    def get_queryset(self):
        self.queryset = ExamSchedule.objects.all()
        return self.queryset

    def create(self, request):
        response = add_update_schedule(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        self.serializer_class = ExamScheduleReadSerilaizer
        response = SharedService.read_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = add_update_schedule(self, request.data, True)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = ExamScheduleReadSerilaizer
        response = get_exam_schedule_data(self, request)
        return Response(response)

class ExamStudentScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = ExamScheduleReadSerilaizer
    http_method_names = ['get']

    def retrieve(self,request, pk=None):
        response = get_student_exam_schedule(self, request)
        return Response(response)

    def list(self, request):
        response = get_exam_list_for_student(self, request)
        return Response(response)

class StudentMarkViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentMark.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = add_update_mark(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        self.serializer_class = StudentMarkReadSerializer
        response = SharedService.read_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        throwError = request.GET.get('raise_error_for_not_finalized')
        student_ids = request.GET.get('student_ids', [])
        download_type = request.GET.get('type') 
        if student_ids:
            student_ids = [int(stu) for stu in student_ids.split(',')]
        if self.request.user and self.request.user.student:
            temp_student_ids = copy.deepcopy(student_ids)
            temp_student_ids.remove(self.request.user.student.id)
            if temp_student_ids:
                raise exceptions.ValidationError('Student Ids are mandatory')
            student_ids = [self.request.user.student.id]
        print_marks_card = self.request.GET.get('print_marks_card')
        print_consolidated_marks = self.request.GET.get('print_consolidated_marks')
        standard_id = self.request.GET.get('standard')
        standard_section_id = request.GET.get('standard_section')  
        if print_consolidated_marks and not standard_id and not standard_section_id:
            raise exceptions.ValidationError('Either standard or standard_section parameter is required for consolidated marks download')
        if print_consolidated_marks and standard_id and not standard_section_id:
            if self.request.GET.get('long_running_process'):
                start_long_running_process(self)
                SharedService.custom_thread(process_standard_consolidated_marks, self, request, standard_id, throwError, student_ids)
                return Response({'Result': True})
            section_mappings = list(StandardSectionMapping.objects.filter(
                standard=standard_id
            ).values('id', 'standard__name', 'section__name'))
            if not section_mappings:
                raise exceptions.ValidationError('No active sections found for the standard')
            all_sections_data = []
            standard_name = None
            for section in section_mappings:
                try:
                    original_get = request.GET.copy()
                    temp_get = original_get.copy()
                    if 'print_consolidated_marks' in temp_get:
                        temp_get.pop('print_consolidated_marks')
                    request.GET = temp_get   
                    section_response = get_standard_section_subjects(
                        self,
                        request.GET.get('exam'),
                        section['id'],
                        throwError,
                        student_ids
                    )
                    request.GET = original_get
                    if section_response and 'data' in section_response:
                        student_count = len(section_response['data'].get('student_list', []))
                        if student_count > 0:
                            section_response['data']['section_id'] = section['id']
                            section_response['data']['section_name'] = section['section__name']
                            all_sections_data.append(section_response['data'])
                            if not standard_name:
                                standard_name = section['standard__name']
                except Exception as e:
                    import traceback
                    traceback.print_exc()
                    continue          
            if all_sections_data:
                return download_consolidation_marks_for_standard(self, all_sections_data, standard_name)
            else:
                raise exceptions.ValidationError('No marks data found for any section in the standard')
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(get_standard_section_subjects, self, request.GET.get('exam'), request.GET.get('standard_section'), throwError, student_ids)
            return Response({'Result': True})
        response = get_standard_section_subjects(self, request.GET.get('exam'), request.GET.get('standard_section'), throwError, student_ids)
        if download_type == 'pdf':
            return response
        if print_marks_card or print_consolidated_marks:
            # Check if response is already an HttpResponse (FileResponse) - return it directly
            from django.http import HttpResponse, FileResponse
            if isinstance(response, (HttpResponse, FileResponse)):
                return response
            # If it's a file path string, open it
            institute_obj = Institute.get_institute(self)
            if institute_obj.code == 'nandinividyanikethana':
                return FileResponse(open(response,'rb'),as_attachment=True, filename="maks_card.pdf")
            return response
        
        else:
            return Response(response)

class ApproveStudentMarkViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = StudentMark.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        examId = request.GET.get('exam')
        configId = request.GET.get('result_config')
        standardSectionId = request.GET.get('standard_section')
        if examId:
            response = approve_student_mark(self, examId, standardSectionId)
        elif configId:
            response = approve_student_mark_for_config(self, request, configId, standardSectionId)
        return Response(response)

class StudentMarkSummary(viewsets.ModelViewSet):
    serializer_class = StudentMarkSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = StudentMark.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_all_standard_marks(self, request.GET.get('exam'))
        return Response(response)

class ExamMarkUnapproveViewSet(viewsets.ModelViewSet):
    serializer_class = ExamMarkUnapproveSerializer
    http_method_names = ['put']
    filterset_fields = ['exam','standard_section']

    def get_queryset(self):
        self.queryset = StudentMarkSectionWiseApproval.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        SharedService.add_to_log(self, request, response)
        return Response(response)

class GradeViewSet(viewsets.ModelViewSet):
    serializer_class = GradePlanSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['grade_type']

    def get_queryset(self):
        self.queryset = GradePlan.objects.filter()
        return self.queryset

    def create(self, request):
        response = add_update_grade(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self, False)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        grade_plan_id = self.kwargs['pk']
        if GradeExamScheduleMapping.objects.filter(grade_plan=grade_plan_id).exists():
            raise exceptions.ValidationError(f'Data referred in Exam Schedule Mapping for standard {GradeExamScheduleMapping.objects.filter(grade_plan=grade_plan_id).first().standard_section.standard.name}')
        return Response(SharedService.delete_unrefered_data(self, {}))

class HallTicketViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = ExamSchedule.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_halticket(self, request)
        return response
        # return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class ResultConfigurationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post']
    serializer_class = ResultConfigurationSerializer

    def get_queryset(self):
        self.queryset = ResultConfiguration.objects.all()
        return self.queryset

    def create(self, request):
        response = add_result_configuration(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = get_section_configuration_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        termId = request.GET.get('term')
        academicId = request.GET.get('academic_year')
        response = get_configuration_data(self, request, termId, academicId)
        return Response(response)

class AnnounceResultViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = ExamSchedule.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = announce_result_list(self, request)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = announce_result(self, request)
        return Response(response)

class ScheduleStudentViewSet(viewsets.ModelViewSet):
    serializer_class = ScheduleStudentSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentScheduleMapping.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        pass

    def create(self, request):
        response = add_or_update_student_to_schedule(self, request.data)
        return Response(response)

class GetScheduledStandardViewSet(viewsets.ModelViewSet):
    serializer_class = ExamScheduleReadSerilaizer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = ExamSchedule.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_standards_for_exam(self, request)
        return Response(response)

class StudentMarkResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = None
        return self.queryset

    def list(self, request, *args, **kwargs):
        print_marks_card = self.request.GET.get('print_marks_card')
        consolidated_report = self.request.GET.get('consolidated_report')
        if print_marks_card:
            response = get_marks_card_for_config(self, request)
            return response
        if consolidated_report:
            response = get_consolidated_report_for_config(self, request)
            return response
        response = get_marks_for_config(self, request)
        return Response(response)

class AnnounceResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = StudentExamFinalResultSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentExamFinalResult.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = announce_result_list_config(self, request)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = announce_result_config(self, request)
        return Response(response)

class ResultConfigurationMergeNameViewSet(viewsets.ModelViewSet):
    serializer_class = ResultConfigurationMergeNameViewSetSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = ResultConfigurationMergeName.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.soft_delete_data(self)
        return Response(response)

class ExamStatusViewSet(viewsets.ModelViewSet):
    serializer_class = StudentExamFinalResultSerializer

    def get_queryset(self):
        self.queryset = StudentExamFinalResult.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_update_exam_status(self, request)
        return Response(response)

class ExamStudentMarkScheduleListViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkReadSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return None

    def list(self, request, *args, **kwargs):
        response = student_exam_marks_list(self, request, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        exam_config_id = self.request.GET.get('exam_config')
        if not self.request.user.student or not self.request.user.student.id:
            raise exceptions.ValidationError('Only student are allowed to access')
        student_id = self.request.user.student.id
        if exam_config_id:
            response = get_announce_exam_result_config(self, int(exam_config_id), [student_id])
            if 'data' in response and 'student_list' in response['data'] and len(response['data']['student_list']) > 0:
                response['data']['student_data'] = response['data']['student_list'][0]
                del response['data']['student_list']
        else:
            response = student_exam_mark(self, request)
        return Response(response)

class StudentExamMarksSummaryViewSet(viewsets.ViewSet):
    serializer_class = StudentMarkReadSerializer
    http_method_names = ['get']

    def list(self, request):
        response = student_exam_marks_list(self, request,True)
        return Response(response)

class ExamResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultConfigurationSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = ExamResultConfiguration.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_update_exam_result_configuration(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response_data = read_exam_result_config(self, request)
        return Response(response_data)

    def list(self, request, *args, **kwargs):
        exam = self.request.GET.get('exam')
        if not exam:
            raise exceptions.ValidationError('exam is mandatory')
        response = get_exam_configuration_data(self, request, exam)
        return Response(response)

class ExamResultConfigApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultConfiguration
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = ExamResultConfiguration.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = approve_exam_result_configuration(self, request.data)
        return Response(response)

class AnnounceExamResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultMarksObtainedSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        self.queryset = ExamResultMarksObtained.objects.all()
        return self.queryset

    def get_object(self):
        return ExamResultConfiguration.objects.get(id=self.kwargs['pk'])

    def create(self, request, *args, **kwargs):
        response = announce_exam_result(self, request.data)
        return Response(response)
    
    def list(self, request, *args, **kwargs):
        if self.request.GET.get('print_config_marks_card') or self.request.GET.get('download_consolidated_marks'):
            standard_section_id = self.request.GET.get('standard_section')
            student_id = self.request.GET.get('student_ids')
            if student_id:
                student_id=str(student_id).split(',')
            exam=self.request.GET.get('exam')
            try:
                exam_result_config = ExamResultConfiguration.objects.get(exam_id=exam,standard_section_id=standard_section_id)
            except:
                raise exceptions.ValidationError('exam result is not configured')
            if self.request.GET.get('print_config_marks_card'):
                response = get_announce_exam_result_config(self,exam_result_config.id,student_id)
                standard = response['data']['standard']
                academic_year = response['data']['academic_year']
                selected_template, number_of_copies = get_selected_template(self, 'marks_card', 'pdf', 'jnana_jyothi_marks_card.html', academic_year, [standard])
                path = 'marks_card/'+selected_template
                response['institute_data'] = InstituteSerializer(Institute.get_institute(self)).data
                # from django.shortcuts import render
                # return render(self.request, path, response)
                response = PDFService.receipt_new(self, response, "marks_card", path, False)
            elif self.request.GET.get('download_consolidated_marks'):
                response = get_exam_config_consolidated_report(self,exam_result_config.id,student_id)
            return response
        else:
            response = get_exam_configured_result(self, request)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        student_id=[]
        if self.request.GET.get('student_ids'):
            student_id=str(self.request.GET.get('student_ids')).split(',')
        response = get_announce_exam_result_config(self, int(self.kwargs['pk']),student_id)
        return Response(response)

class ApproveResultConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = ResultSectionApprovalSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = ResultSectionApproval.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = approve_result_config(self, request)
        return Response(response)

class ExamFinalResultConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = ExamFinalResultConfigurationSerializer
    http_method_names = ['post', 'get', 'put']

    def get_queryset(self):
        self.queryset = ExamFinalResultConfiguration.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_final_exam_result_configuration(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = exam_final_result_configuration_data(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = exam_final_result_summary(self, request)
        return Response(response)

    def update(self, request, *args, **kwargs):
        id = self.kwargs['pk']
        response = approve_final_result(self, request, id)
        return Response(response)
    
class ExamFinalResultConfigurationnewViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = exam_final_result_config_summary(self, request)
        return Response(response)

#approvig the configuration data has to be provided
#approved config result should be saved

#result configuration id is going or not
#validate exam before announcing the exam
#notification should be sent

class StandardSectionDataForExamViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        return None
    
    def list(self, request, *args, **kwargs):
        standard_section_heirarchy = get_standard_section_list_for_exam(self)
        return Response(standard_section_heirarchy)
 
class FinalResultConfigurationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post']
    serializer_class = FinalResultConfigurationSerializer

    def get_queryset(self):
        self.queryset = FinalResultConfiguration.objects.all()
        return self.queryset

    def create(self, request):
        response = add_final_result_configuration(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = get_final_section_configuration_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        academicId = request.GET.get('academic_year')
        exam = request.GET.get('exam')
        response = get_final_configuration_data(self, request, academicId, exam)
        return Response(response)

class FinalApproveResultConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = FinalResultSectionApprovalSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = FinalResultSectionApproval.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = approve_final_result_config(self, request)
        return Response(response)
    
class FinalAnnounceResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = StudentExamFinalResultForFinalConfigSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentExamFinalResultForFinalConfig.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = announce_final_result_list_config(self, request)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = announce_final_result_config(self, request)
        return Response(response)

class StudentMarkFinalResultConfigViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    ordering_fields = ['']

    def get_queryset(self):
        self.queryset = None
        return self.queryset

    def list(self, request, *args, **kwargs):
        print_marks_card = self.request.GET.get('print_marks_card')
        consolidated_report = self.request.GET.get('consolidated_report')
        if print_marks_card:
            # if self.request.GET.get('long_running_process'):
                # start_long_running_process(self)
                # SharedService.custom_thread(get_marks_card_for_finalconfig, self, request)
                # return Response({'Result': True})
            response = get_marks_card_for_finalconfig(self, request)
            return response
        if consolidated_report:
            response = get_consolidated_report_for_finalconfig(self, request)
            return response
        response = get_marks_for_final_config(self, request)
        return Response(response)

class SubjectWiseReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    
    def get_queryset(self):
        return None
    
    def list(self, request, *args, **kwargs):
        response = self.get_subject_wise_report()
        return Response(response)
    
    def get_subject_wise_report(self):
        # Get parameters from request
        academic_year = self.request.GET.get('academic_year')
        exams = self.request.GET.get('exams', '').split(',') if self.request.GET.get('exams') else []
        subjects = self.request.GET.get('subjects', '').split(',') if self.request.GET.get('subjects') else []
        standard_sections = self.request.GET.get('standard_sections', '').split(',') if self.request.GET.get('standard_sections') else []
        students = self.request.GET.get('students', '').split(',') if self.request.GET.get('students') else []
        report_type = self.request.GET.get('report_type', 'subject')
        
        # Validate required parameters
        if not academic_year:
            raise ValidationError('Academic year is required')
        if not exams:
            raise ValidationError('At least one exam is required')
        
        return self.generate_report_data(exams, standard_sections, subjects, students, report_type)
    
    def generate_report_data(self, exams, standard_sections, subjects, students, report_type):
        all_student_data = []
        section_data = {}
        
        # If no standard sections specified, get all sections for the exams
        if not standard_sections:
            standard_sections = self.get_standard_sections_for_exams(exams)
        print(standard_sections, 'asdfsad')
        print(exams, 'exams')
        # Collect data from all sections and exams
        for exam_id in exams:
            for section_id in standard_sections:
                try:
                    # Use existing method - call it correctly as a method of this class
                    student_data = self.get_standard_section_subjects(
                        examId=exam_id, 
                        standardSectionId=section_id, 
                        raiseErrorIfNotFinalized=False,
                        student_ids=students if students else [],
                        ignore_final_result_data=False
                    )
                    print(student_data, 'student_data')
                    if student_data and 'data' in student_data and 'student_list' in student_data['data']:
                        # Add exam and section context to each student
                        for student in student_data['data']['student_list']:
                            student['exam_id'] = int(exam_id)
                            student['exam_name'] = student_data['data']['exam_details']
                            student['section_id'] = int(section_id)
                            student['standard_name'] = student_data['data']['standard_name']
                            student['section_name'] = student_data['data']['section_name']
                            student['class_section'] = f"{student_data['data']['standard_name']} - {student_data['data']['section_name']}"
                            
                            # Filter by subjects if specified
                            if subjects:
                                filtered_subjects = {}
                                for subject_id in subjects:
                                    if int(subject_id) in student['subject_list']:
                                        filtered_subjects[int(subject_id)] = student['subject_list'][int(subject_id)]
                                student['subject_list'] = filtered_subjects
                                student['subject_list_data'] = [s for s in student['subject_list_data'] if s['subject'] in [int(sid) for sid in subjects]]
                            
                            all_student_data.append(student)
                        
                        # Store section info
                        section_key = f"{section_id}_{exam_id}"
                        section_data[section_key] = {
                            'standard_name': student_data['data']['standard_name'],
                            'section_name': student_data['data']['section_name'],
                            'exam_name': student_data['data']['exam_details'],
                            'subject_list': student_data['data']['subject_list']
                        }
                except Exception as e:
                    print(f"Error getting data for exam {exam_id}, section {section_id}: {str(e)}")
                    continue
        
        # Generate report based on type
        if report_type == 'subject':
            return self.generate_subject_analysis_report(all_student_data, section_data)
        elif report_type == 'student':
            return self.generate_student_performance_report(all_student_data, section_data)
        elif report_type == 'ranking':
            return self.generate_ranking_report(all_student_data, section_data)
        elif report_type == 'comparative':
            return self.generate_comparative_report(all_student_data, section_data, exams)
        else:
            return self.generate_subject_analysis_report(all_student_data, section_data)
    
    def get_standard_sections_for_exams(self, exam_ids):
        """Get all standard sections that have schedules for given exams"""
        sections = ExamSchedule.objects.filter(
            exam__in=exam_ids
        ).values_list('standard_section', flat=True).distinct()
        return list(sections)
    
    # Add the existing get_standard_section_subjects method to this class
    def get_standard_section_subjects(self, examId, standardSectionId, raiseErrorIfNotFinalized=False, student_ids=[], ignore_final_result_data=False):
        # Copy the entire existing function body here
        response = {'data': {}}
        required_form_definition = [
            {'form_name': 'exam_configurations', 'column_name': 'grade_plan'}
        ]
        temp_form_defintion = FormdefinitionService.get_formdefinition_for_multiple_data(self, required_form_definition)
        form_definition_tracking = {'exam_configurations_grade_plan': temp_form_defintion['exam_configurations']['grade_plan']}
        
        # ... rest of the existing function code ...
        # (Copy the entire body of the existing get_standard_section_subjects function)
        
        # For now, I'll provide a simplified version that calls the service
        try:
            from apps.exams.services.mark import get_standard_section_subjects as service_get_standard_section_subjects
            return service_get_standard_section_subjects(self, examId, standardSectionId, raiseErrorIfNotFinalized, student_ids, ignore_final_result_data)
        except ImportError:
            # If the service doesn't exist, return empty data
            return {
                'data': {
                    'student_list': [],
                    'subject_list': [],
                    'standard_name': '',
                    'section_name': '',
                    'exam_details': ''
                }
            }
    
    def generate_subject_analysis_report(self, all_student_data, section_data):
        """Generate subject-wise analysis report using existing data structure"""
        table_data = []
        chart_data = []
        subject_summary = {}
        
        # Process each student
        for student in all_student_data:
            if not student.get('subject_list_data'):
                continue
                
            student_row = {
                'id': student['student'],
                'student_name': student['student_name'],
                'admission_number': student.get('current_reg_num', ''),
                'class_section': student['class_section'],
                'exam_name': student['exam_name'],
                'total_marks': student['total_summary']['total_marks'] if 'total_summary' in student else 0,
                'total_obtained_marks': student['total_summary']['total_obtained_marks'] if 'total_summary' in student else 0,
                'percentage': round(student['total_summary']['percentage'], 2) if 'total_summary' in student else 0,
                'grade': student.get('grade', ''),
                'result': student.get('total_result', ''),
                'subject_details': []
            }
            
            # Add subject details
            for subject_data in student.get('subject_list_data', []):
                subject_detail = {
                    'subject_name': subject_data.get('subject_name', ''),
                    'subject_code': subject_data.get('subject__subject_code', ''),
                    'marks': subject_data.get('marks', 0),
                    'max_marks': subject_data.get('max_marks', 0),
                    'total_obtained_marks': subject_data.get('total_obtained_marks', 0),
                    'total_max_marks': subject_data.get('total_max_marks', 0),
                    'grade': subject_data.get('grade', ''),
                    'attendance': subject_data.get('attendance_status', ''),
                    'result': subject_data.get('result', ''),
                    'percentage': round((subject_data.get('total_obtained_marks', 0) / subject_data.get('total_max_marks', 1) * 100), 2) if subject_data.get('total_max_marks', 0) > 0 else 0
                }
                student_row['subject_details'].append(subject_detail)
                
                # Track subject-wise statistics
                subject_id = subject_data.get('subject')
                if subject_id and subject_id not in subject_summary:
                    subject_summary[subject_id] = {
                        'subject_name': subject_data.get('subject_name', ''),
                        'total_students': 0,
                        'total_marks': 0,
                        'students_appeared': 0,
                        'students_passed': 0
                    }
                
                if subject_id:
                    subject_summary[subject_id]['total_students'] += 1
                    if subject_data.get('attendance_status') == 'Present':
                        subject_summary[subject_id]['students_appeared'] += 1
                        subject_summary[subject_id]['total_marks'] += subject_data.get('total_obtained_marks', 0)
                        if subject_data.get('result') != 'fail':
                            subject_summary[subject_id]['students_passed'] += 1
            
            table_data.append(student_row)
            
            # Chart data
            chart_data.append({
                'student': student['student_name'],
                'total_marks': student_row['total_obtained_marks'],
                'percentage': student_row['percentage'],
                'class_section': student['class_section']
            })
        
        # Calculate overall statistics
        total_students = len(table_data)
        if total_students > 0:
            avg_percentage = sum(row['percentage'] for row in table_data) / total_students
            highest_percentage = max(row['percentage'] for row in table_data)
            pass_count = sum(1 for row in table_data if row['result'] != 'fail')
            pass_rate = (pass_count / total_students) * 100
        else:
            avg_percentage = highest_percentage = pass_rate = 0
            pass_count = 0
        
        # Sort by percentage (descending) and add ranks
        table_data.sort(key=lambda x: x['percentage'], reverse=True)
        for i, row in enumerate(table_data):
            row['rank'] = i + 1
        
        summary = {
            'total_students': total_students,
            'average_percentage': round(avg_percentage, 2),
            'highest_percentage': round(highest_percentage, 2),
            'pass_rate': round(pass_rate, 2),
            'students_passed': pass_count,
            'students_failed': total_students - pass_count,
            'subjects_analyzed': len(subject_summary),
            'subject_wise_summary': list(subject_summary.values())
        }
        
        return {
            'table': table_data,
            'chart': chart_data,
            'summary': summary,
            'report_type': 'subject_analysis'
        }

    # Add other report generation methods here...

class MultipleExamStandardSectionViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    
    def list(self, request, *args, **kwargs):
        exam_ids = request.GET.get('exams', '').split(',')
        if not exam_ids or exam_ids == ['']:
            return Response({'data': []})
        
        # Get all standard sections that have schedules for these exams
        sections_data = {}
        
        for exam_id in exam_ids:
            try:
                response = get_all_standard_marks(self, exam_id)
                if response and 'data' in response:
                    for standard in response['data']:
                        if 'section_list' in standard:
                            for section in standard['section_list']:
                                section_key = section['id']
                                if section_key not in sections_data:
                                    sections_data[section_key] = {
                                        'id': section['id'],
                                        'standard__name': standard['standard__name'],
                                        'section__name': section['section__name'],
                                        'exam_ids': []
                                    }
                                sections_data[section_key]['exam_ids'].append(int(exam_id))
            except Exception as e:
                continue
        
        return Response({'data': list(sections_data.values())})

# Student-wise Report APIView
class StudentWiseReportAPIView(APIView):
    def get(self, request):
        student_id = request.query_params.get('student')
        marks = StudentMark.objects.filter(student_id=student_id, is_active=True).select_related('exam_schedule__subject')

        data = [
            {
                'subject': m.exam_schedule.subject.name if m.exam_schedule and m.exam_schedule.subject else '',
                'marks': m.marks,
                'grade': m.grade,
                'attendance': m.attendance_status,
                'remarks': str(m.remark) if m.remark else ''
            } for m in marks
        ]
        chart_data = [{'subject': d['subject'], 'marks': d['marks'] or 0} for d in data]

        return Response({'table': data, 'chart': chart_data})

# Rank-wise Report APIView
class RankWiseReportAPIView(APIView):
    def get(self, request):
        exam_id = request.query_params.get('exam')
        standard_section_id = request.query_params.get('standard_section')

        if not exam_id or not standard_section_id:
            return Response({"detail": "exam and standard_section parameters are mandatory."}, status=status.HTTP_400_BAD_REQUEST)

        # aggregate and rank students by total marks for exam and standard_section
        aggregated = StudentMark.objects.filter(
            exam_schedule__exam_id=exam_id,
            exam_schedule__standard_section_id=standard_section_id,
            is_active=True
        ).values('student_id', 'student__name').annotate(total_marks=Sum('marks')).order_by('-total_marks')

        ranked_list = []
        rank = 1
        for item in aggregated:
            ranked_list.append({
                'rank': rank,
                'student': item['student__name'],
                'total_marks': item['total_marks'] or 0,
                'grade': '',  # optionally calculate grade here
                'id': item['student_id']
            })
            rank += 1

        return Response({'table': ranked_list, 'chart': ranked_list})

# Cumulative Report APIView
class CumulativeReportAPIView(APIView):
    def get(self, request):
        student_id = request.query_params.get('student')
        cumulatives = StudentCumulativeMark.objects.filter(student_id=student_id, is_active=True).select_related('exam_cumulative__exam_schedule__exam')

        data = [{
            'exam': c.exam_cumulative.exam_schedule.exam.description if c.exam_cumulative and c.exam_cumulative.exam_schedule and c.exam_cumulative.exam_schedule.exam else '',
            'marks': c.marks,
            'grade': c.grade,
            'attendance': c.attendance_status
        } for c in cumulatives]

        chart_data = [{'exam': d['exam'], 'marks': d['marks'] or 0} for d in data]

        return Response({'table': data, 'chart': chart_data})

# Attendance Report APIView
class AttendanceReportAPIView(APIView):
    def get(self, request):
        exam_id = request.query_params.get('exam')
        standard_section_id = request.query_params.get('standard_section')

        attendance_qs = StudentMark.objects.filter(
            exam_schedule__exam_id=exam_id,
            exam_schedule__standard_section_id=standard_section_id,
            is_active=True
        ).select_related('student', 'exam_schedule__subject')

        data = [{
            'student': a.student.name if a.student else '',
            'subject': a.exam_schedule.subject.name if a.exam_schedule and a.exam_schedule.subject else '',
            'attendance_status': a.attendance_status,
            'marked_attendance_days': a.marked_attendance_days,
        } for a in attendance_qs]

        return Response({'table': data, 'chart': []})

# Audit Log Report APIView
class AuditLogReportAPIView(APIView):
    def get(self, request):
        logs = StudentMarkAuditLog.objects.select_related('edited_by', 'student_mark').order_by('-edited_on')[:100]
        data = [{
            'student_mark_id': log.student_mark.id,
            'field_name': log.field_name,
            'old_value': log.old_value,
            'new_value': log.new_value,
            'edited_by': log.edited_by.username if log.edited_by else '',
            'edited_on': log.edited_on.strftime('%Y-%m-%d %H:%M:%S') if log.edited_on else ''
        } for log in logs]

        return Response({'table': data})

# Student Profile Detail APIView
class StudentProfileAPIView(APIView):
    def get(self, request, student_id):
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            return Response({'detail': 'Student not found'}, status=status.HTTP_404_NOT_FOUND)
        
        data = {
            'id': student.id,
            'name': student.name,
            'email': student.email,
            'class_section': str(student.class_section) if student.class_section else '',
            # add any additional fields needed
        }

        return Response(data)
    
class StandardSectionsByExams(APIView):
    
    def get(self, request):
        exam_ids = request.GET.get('exams', '')
        if not exam_ids:
            return Response({'error': 'exams parameter is required'}, status=400)
        
        exam_id_list = [int(i) for i in exam_ids.split(',') if i.isdigit()]
        if not exam_id_list:
            return Response({'error': 'Invalid exams parameter'}, status=400)
        
        # Query to get distinct standard sections for the given exams
        queryset = (
            ExamSchedule.objects
            .filter(exam__id__in=exam_id_list)
            .values(
                'standard_section__id',
                'standard_section__standard__id',
                'standard_section__standard__name',
                'standard_section__section__id',
                'standard_section__section__name',
            )
            .distinct()
            .order_by('standard_section__standard__name', 'standard_section__section__name')
        )
        
        # Construct response data
        data = []
        for item in queryset:
            data.append({
                'id': item['standard_section__id'],
                'standard_id': item['standard_section__standard__id'],
                'standard_name': item['standard_section__standard__name'],
                'section_id': item['standard_section__section__id'],
                'section_name': item['standard_section__section__name'],
                'display_name': f"{item['standard_section__standard__name']} - {item['standard_section__section__name']}",
            })
        
        return Response({'data': data})

class SubjectsByExamIdsView(APIView):

    def get(self, request):
        exam_ids_param = request.GET.get('exam_ids', '')
        if not exam_ids_param:
            return Response({'error': 'Parameter exam_ids is required'}, status=400)
        
        try:
            exam_ids = [int(eid.strip()) for eid in exam_ids_param.split(',') if eid.strip().isdigit()]
            if not exam_ids:
                return Response({'error': 'Invalid exam_ids parameter'}, status=400)
        except Exception:
            return Response({'error': 'Invalid exam_ids parameter'}, status=400)

        subject_qs = (
            Subject.objects.filter(examschedule__exam__id__in=exam_ids)
            .distinct()
            .values('id', 'name', 'subject_code')
            .order_by('name')
        )
        subjects = list(subject_qs)

        return Response({'data': subjects})
    
class ExamScheduleQuestionmappingViewSet(viewsets.ModelViewSet):
    serializer_class = ExamScheduleQuestionmappingSerializer
    http_method_names = ['get','post']

    def get_queryset(self):
        self.queryset = ExamScheduleQuestionmapping.objects.filter()
        return self.queryset
    
    def create(self, request, *args, **kwargs):
        response = create_question_based_exam_schedule(self, request.data)
        return Response(response)
    
class QuestionwiseMarksEntryViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkQuestionWiseSerializer
    http_method_names = ['get','post']

    def get_queryset(self):
        self.queryset = StudentMarkQuestionWise.objects.filter(is_active=True)
        return self.queryset
    
    def create(self, request, *args, **kwargs):
        response = add_update_question_mark(self, request.data)
        return Response(response)
    
    def list(self, request, *args, **kwargs):
        response = get_question_mark(self, request.data)
        return Response(response)
    
class MarksReportAmritaViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self,request, *args, **kwargs):
        response= get_amrita_report(self,request)
        return response
    
class ExamQuestionMarksExeptionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self,request, *args, **kwargs):
        response= get_exam_data_exceptions(self,request)
        return Response(response)

class StudentMarkV2ViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentMark.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        throwError = request.GET.get('raise_error_for_not_finalized')
        student_ids = request.GET.get('student_ids', [])
        if student_ids:
            student_ids = [int(stu) for stu in student_ids.split(',')]
        if self.request.user and self.request.user.student:
            temp_student_ids = copy.deepcopy(student_ids)
            temp_student_ids.remove(self.request.user.student.id)
            if temp_student_ids:
                raise exceptions.ValidationError('Student Ids are mandatory')
            student_ids = [self.request.user.student.id]
        print_marks_card = self.request.GET.get('print_marks_card')
        print_consolidated_marks = self.request.GET.get('print_consolidated_marks')
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(get_standard_section_subjects_optimized, self, request.GET.get('exam'), request.GET.get('standard_section'), throwError, student_ids)
            return Response({'Result': True})
        response = get_standard_section_subjects_optimized(self, request.GET.get('exam'), request.GET.get('standard_section'), throwError, student_ids)
        if print_marks_card or print_consolidated_marks:
            institute_obj = Institute.get_institute(self)
            if institute_obj.code == 'nandinividyanikethana':
                file_path = os.path.abspath(response) if isinstance(response, str) else response
                if os.path.exists(file_path):
                    return FileResponse(open(file_path, 'rb'), as_attachment=True, filename="marks_card.pdf")
                else:
                    raise exceptions.ValidationError(f'PDF file not found: {file_path}')
            return response
        else:
            return Response(response)

class StudentMarkResultConfigV2ViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = None
        return self.queryset

    def list(self, request, *args, **kwargs):
        print_marks_card = self.request.GET.get('print_marks_card')
        consolidated_report = self.request.GET.get('consolidated_report')
        if print_marks_card:
            response = get_marks_card_for_config(self, request)
            return response
        if consolidated_report:
            response = get_consolidated_report_for_config(self, request)
            return response
        response = get_marks_for_config(self, request)
        return Response(response)

class AnnounceExamResultConfigV2ViewSet(viewsets.ModelViewSet):
    serializer_class = ExamResultMarksObtainedSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = ExamResultMarksObtained.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        exam_config_id = self.request.GET.get('exam_config')
        student_ids = self.request.GET.get('student_ids', [])
        if student_ids:
            student_ids = [int(stu) for stu in student_ids.split(',')]
        if not exam_config_id:
            raise exceptions.ValidationError('Exam Config Id is mandatory')
        response = get_announce_exam_result_config(self, int(exam_config_id), student_ids)
        return Response(response)

class StudentMarkFinalResultConfigV2ViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = None
        return self.queryset

    def list(self, request, *args, **kwargs):
        print_marks_card = self.request.GET.get('print_marks_card')
        consolidated_report = self.request.GET.get('consolidated_report')
        if print_marks_card:
            if self.request.GET.get('long_running_process'):
                start_long_running_process(self)
                SharedService.custom_thread(get_marks_card_for_finalconfig, self, request)
                return Response({'Result': True})
            response = get_marks_card_for_finalconfig(self, request)
            return response
        if consolidated_report:
            response = get_consolidated_report_for_finalconfig(self, request)
            return response
        response = get_marks_for_final_config(self, request)
        return Response(response)


class CopyScheduleAPIView(APIView):
    """
    API endpoint to copy exam schedule from one exam to another
    """
    def post(self, request):
        # Create a mock viewset-like object for the service function
        class MockViewSet:
            def __init__(self, request):
                self.request = request
                self.kwargs = {}

        mock_viewset = MockViewSet(request)
        try:
            create_exam_data = request.data.get('create_exam')
            copy_payload = dict(request.data)

            if create_exam_data:
                # Atomic create + copy: if copy fails, the newly created exam is rolled back.
                with transaction.atomic():
                    exam_viewset = ExamViewSet()
                    exam_viewset.request = request
                    exam_viewset.args = ()
                    exam_viewset.kwargs = {}
                    exam_viewset.format_kwarg = None
                    if should_route_exam_payload_through_ui_v2(create_exam_data):
                        created_exam = add_update_exam_ui_v2(exam_viewset, create_exam_data, False)
                    else:
                        created_exam = add_update_exam(exam_viewset, create_exam_data)
                    target_exam_id = created_exam.get('data', {}).get('id')
                    if not target_exam_id:
                        raise exceptions.ValidationError('Failed to create exam before copying schedule.')
                    copy_payload['target_exam_id'] = target_exam_id
                    copy_payload['replace_existing'] = False
                    result = copy_exam_schedule(mock_viewset, copy_payload)
                    result['created_exam_id'] = target_exam_id
                    result['created_exam'] = created_exam.get('data', {})
            else:
                result = copy_exam_schedule(mock_viewset, copy_payload)
            return Response(result, status=status.HTTP_200_OK)
        except exceptions.ValidationError as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)


class BulkCopyExamAPIView(APIView):
    """
    POST: create multiple exams in one request, atomically.
    If any one exam fails validation/creation, the whole batch rolls back.
    """
    def post(self, request):
        bulk_exams = request.data.get('bulk_exams') or request.data.get('exams')
        if not bulk_exams:
            return Response(
                {'detail': 'bulk_exams is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        exam_viewset = ExamViewSet()
        exam_viewset.request = request
        exam_viewset.args = ()
        exam_viewset.kwargs = {}
        exam_viewset.format_kwarg = None
        try:
            result = bulk_add_update_exams_ui_v2(exam_viewset, bulk_exams)
            return Response(result, status=status.HTTP_200_OK)
        except exceptions.ValidationError as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)


class ClearExamScheduleAPIView(APIView):
    """
    POST: remove all schedule rows for an exam only when no student marks / question-wise / cumulative marks exist.
    """
    def post(self, request):
        class MockViewSet:
            def __init__(self, request):
                self.request = request
                self.kwargs = {}

        mock_viewset = MockViewSet(request)
        try:
            result = clear_entire_exam_schedule_if_no_marks(mock_viewset, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except exceptions.ValidationError as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)


class ExamScheduleDashboardAPIView(APIView):
    """GET: exams for academic_year + term with schedule row counts and approval status."""

    def get(self, request):
        class MockViewSet:
            def __init__(self, request):
                self.request = request
                self.kwargs = {}

        mock_viewset = MockViewSet(request)
        try:
            result = get_exam_schedule_dashboard(
                mock_viewset,
                request.query_params.get('academic_year'),
                request.query_params.get('term'),
            )
            return Response(result, status=status.HTTP_200_OK)
        except exceptions.ValidationError as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)


class BulkClearExamScheduleAPIView(APIView):
    """POST: clear schedules for multiple exams (same rules as single clear; partial success)."""

    def post(self, request):
        class MockViewSet:
            def __init__(self, request):
                self.request = request
                self.kwargs = {}

        mock_viewset = MockViewSet(request)
        try:
            result = clear_exam_schedules_bulk_if_no_marks(mock_viewset, request.data)
            return Response(result, status=status.HTTP_200_OK)
        except exceptions.ValidationError as e:
            detail = e.detail if hasattr(e, 'detail') else str(e)
            return Response({'detail': detail}, status=status.HTTP_400_BAD_REQUEST)


class StudentMarkBulkNotificationViewSet(viewsets.ModelViewSet):
    serializer_class = StudentMarkSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = StudentMark.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = get_multiple_standard_section_subjects(self, request.data.get('exam_id'), request.data.get('standard_section_ids'), False, [], True,request.data)
        return Response(response)