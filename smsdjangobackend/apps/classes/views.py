from apps.classes.models.enrollment import StudentStandardMapping
from apps.shared.services_shared.store_api_result import start_long_running_process
from rest_framework import viewsets, exceptions, permissions
from rest_framework.views import Response, APIView
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from datetime import datetime
from django.db.models import F

from apps.classes.models import (Subject, Standard, Section, StandardSectionMapping, Enrollment, AssignSubject,
                                 PromoteStudent, SubjectStudent,
                                 LessonPlanTemplate, LessonPlanTopic, LessonPlanSubtopic, LessonPlanSubtopicDetail, LessonPlanAcademicYear, LessonPlanTopicAcademicYear, LessonPlanSubtopicAcademicYear, LessonPlanSubtopicDetailAcademicYear, LessonPlanSubtopicDetailReview,
                                 LessonPlanVersion, AiLessonPlanCache)
from apps.classes.models.attendance import Attendance, MachineAttendance, MachineAttendanceFailedToSaveData, MachineAttendanceLog, MachineUserLog, MachineUserMapping, SubjectAttendance, AttendanceBatch,AttendanceBatchStudentMapping,BatchAttendance, StandardAttendanceConfiguration
from apps.classes.models.standard import Board, Branch
from apps.classes.models.subject import CumulativeType, SubjectBranchMapping, SubjectPartType,CourseOutcome, ProgramOutcome, ProgramSpecificOutcome, SubjectCategory, SubjectDetails,ProgramEducationalObjectives
from apps.classes.serializers import (CumulativeSerializer, GetEnrollmentStandard, MachineAttendanceFailedToSaveDataSerializer, MachineAttendanceLogSerializer, MachineAttendanceSerializer, MachineUserLogSerializer, MachineUserMappingReadSerializer, MachineUserMappingSerializer, SubjectPartTypeSerializer, 
                                        SubjectSerializer, SubjectAttendanceSerializer,AttendanceBatchSerializer,AttendanceBatchStudentMappingSerializer,
                                        StandardSerializer, SectionSerializer, EnrollmentSerializer,StandardAttendanceConfigurationSerializer,
                                        StandardSectionMappingSerializer, AssignSubjectSerializer,BranchSerializer,SubjectCategorySerializer,
                                        PromoteStudentSerializer, FilterSectionSerializer,BatchAttendanceSerializer,
                                        FilterSectionStrengthSerializer, GetSubjectSerializer,GetStudentLeaveSerializers,ProgramEducationalObjectivesSerializer,
                                        GetStandardSectionSubjectSerializer, EnrolledStudentsSerializer,StaffStandardSectionMappingSerializer,StaffStandardMappingDataReadSerializer,
                                        GetEnrollmentSerializer, AttendanceSerializer, SubjectStudentSerializer,StudentLeaveTypeSerializer,StudentLeaveSerializers,StudentLeaveTypeAcademicYearMappingSerializer,
                                        CourseOutcomeSerializer,ProgramOutcomeSerializer,StaffSubjectDetailsSerializer, ProgramSpecificOutcomeSerializer, SubjectDetailsSerializer, SubjectDetailsReadSerializer,
                                        LessonPlanTemplateReadSerializer,LessonPlanAcademicYearSerializer,LessonPlanAcademicYearReadSerializer,
                                        AiLessonPlanPreviewSerializer, AiLessonPlanImportSerializer, AiLessonPlanNcertPreviewSerializer,
                                        LessonPlanVersionSerializer
                                    )
from apps.hr.serializers import TimeTableScheduleReadSerializer
from apps.shared.models.configuration import Setting
from apps.shared.utils import (PostLimitOfsetPagination)
from apps.users.models import User
from django.db.models import Max, Min
from apps.classes.models.staff_subject import StaffSubjectDetails
from apps.classes.services.attendance import (add_attendance, add_attendance_bulk, attendance_report, get_attendance_detail, get_attendance_section_wise_report, get_attendance_standard_section_wise,get_attendance,get_student_attendance_individual,get_student_subject_attendance_individual,get_rfid_attendance_detail,
                                              get_attendance_report, get_rfid_student_attendance_individual, get_student_rfid_attendance_list,get_student_attendance_list,get_student_subject_attendance_list,)
from apps.classes.services.subject_attendance import (get_subject_attendance,get_subject_attendance_detail,add_subject_attendance_bulk,upload_subject_attendance_bulk,get_subject_attendance_report,staff_subject_attendance_report,
                                                      subject_attendance_report,get_subject_attendance_single_report,get_notmarked_attendance_list,update_subject_attendance_bulk)
from apps.classes.services.enrollment import (copy_enrollment_data, read_student_section, add_enrollment, shuffle_enrollment,read_student_batch,get_batch_students,
                                              read_shuffle_student, get_enrolled_students, enrollment_summary)
from apps.classes.services.handled_machine_data import get_machine_user_mapping_data, handle_machine_data, machine_user_mapping_add_or_update, process_failed_data,student_rfid_attendance_add,get_student_rfid_attendance
from apps.classes.services.promote import (add_promote_student, add_promote_student_academic_year, depromote_student, get_promote_student, get_elligible_for_promote_student,move_student_to_previous_acadmeic)
from apps.classes.services.change_standard import (validate_standard_change_dependencies, bulk_change_student_standard)
from apps.classes.services.standard import (add_data, get_standard_and_section, add_class_mapping, PASSED_OUT,
                                            read_class_mapping, delete_class_mapping, add_dise_code,get_only_first_sem_standards,
                                            get_standard_for_current_year, FAILED, add_multiple_class_mapping)
from apps.classes.services.subject import (assign_subject_student_multiple, copy_assign_subject_data, read_assigned_sub_classes, read_assign_subjects, add_subject, assign_subject,read_staff_subjects,
                                           update_subject, assign_subject_student, get_assign_subject_student,read_subject_course_outcome_program_mapping_matrix, add_subjectdetails_data,
                                           delete_subject, validate_cumulative_type,add_staff_subject_course_design,read_staff_subject_course_design,update_programspecificoutcome,add_programspecificoutcome,
                                           add_courseoutcome,add_programoutcome,update_courseoutcome,update_programoutcome,add_subject_course_outcome_program_mapping_matrix,delete_courseoutcome,delete_programoutcome)
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.classes.models.studentleave import StudentLeaveDates,StudentLeaves,StudentLeaveType,StaffStandardSectionMapping,StudentLeaveTypeAcademicYearMapping
from apps.classes.services.student_leave import add_studentleavetype,add_applystudentleave,add_update_delete_studentleavetype_data,update_studentleave_type,get_studentleaves_count,update,get_studentleave_summary_without_carryforward,studentleave_approval_view,delete_appliedLeave,get_modify_leave_data,add_staff_standard_section_data,update_staff_standard_section
from apps.students.models.student import Student
from apps.institutes.models import AcademicYear
from apps.institutes.serializers import AcademicYearSerializer
from apps.shared.services import SharedService,ConfigurationService,FormdefinitionService
from apps.students.services.student import get_student_standard_list_for_tc
from apps.users.services.permissions import IsAuthenticated
from apps.users.services.permissions import OnlyListAccess
from apps.shared.services_shared.common import get_full_name
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer
from apps.classes.services.batch_attendance import (add_attendancebatch,add_attendance_batch_student,get_batch_attendance, get_batchattendance_detail,
                                                    add_batchattendance_bulk,add_batchattendance,get_batchattendance_report,add_attendance_batch_student_standard_section_subject_wise)
from apps.classes.services.download_service import get_std_subject_attendance, get_sats_attendance
from apps.hr.models.timeTable import TimeTableSchedule
from apps.staffs.models import Staff
from apps.classes.services.lesson_plan import (
    create_or_update_lesson_plan_template,
    create_or_update_lesson_plan_template_academic_year,
    get_lesson_plan_status_details,
    get_staff_lesson_plan_dashboard,
    update_lesson_plan_status,
)
from apps.classes.services.ai_lesson_plan import (
    build_ai_lesson_plan_preview,
    build_ai_lesson_plan_preview_from_ncert,
    import_ai_lesson_plan,
)
from apps.classes.services.ncert_service import get_ncert_books, get_ncert_hierarchy

class SubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Subject.objects.all()
        if self.request.GET.get('branch'):
            subject_ids = list(SubjectBranchMapping.objects.filter(branch=self.request.GET.get('branch')).values_list('subject', flat=True))
            self.queryset = self.queryset.filter(id__in=subject_ids)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_subject(self, request.data['subjects'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_subject(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_subject(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        subject_branch_mapping = {}
        subject_data = SubjectBranchMapping.objects.all().values('branch', 'subject', 'branch__name')
        for subject in subject_data:
            if subject['subject'] not in subject_branch_mapping:
                subject_branch_mapping[subject['subject']] = []
            subject_branch_mapping[subject['subject']].append(subject)
        for subject in response['data']:
            subject['branches'] = []
            if subject['id'] in subject_branch_mapping:
                subject['branches'] = subject_branch_mapping[subject['id']]
        return Response(response)


class StandardViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSerializer
    http_method_names = ['get', 'post', 'put']
    filterset_fields = ['is_active', 'board', 'branch']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        self.queryset = Standard.objects.all().exclude(id__in=[PASSED_OUT, FAILED]).order_by('sequence')
        if not self.request.GET.get('miscellaneous_standard'): #used for misc counter
            self.queryset = self.queryset.exclude(codename='miscellaneous_standard')
        if self.request.GET.get('academic_year'):
            self.queryset = self.queryset.exclude(present_standard__academic_year=self.request.GET.get('academic_year'))
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_data(self, request.data['standards'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if self.request.GET.get('is_finance_page') and self.queryset.filter(standardyearname__isnull=False).exists():
            response['data'] = get_only_first_sem_standards(self,response['data'])
        return Response(response)


class DiseCodeViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = Standard.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_dise_code(self, request.data['disecode'], **kwargs)
        return Response(response)


class FilterStandardViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSerializer
    http_method_names = ['get']
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        self.queryset = Standard.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = get_standard_for_current_year(self)
        if self.request.GET.get('is_finance_page') and Standard.objects.filter(standardyearname__isnull=False).exists():
            response['data'] = get_only_first_sem_standards(self,response['data'])
        return Response(response)


class SectionViewSet(viewsets.ModelViewSet):
    serializer_class = SectionSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Section.objects.all().order_by('name')
        if not self.request.user.is_anonymous and not self.request.user.is_superuser and self.request.user and self.request.user.staff and self.request.GET.get('academic_year'):
            setting_value = ConfigurationService.get_setting_value('staffstandardmapping')
            if int(setting_value) == 2:
                section_list = StaffStandardSectionMapping.objects.filter(staff=self.request.user.staff,is_active=True,standard_section__academic_year=self.request.GET.get('academic_year')).values_list('standard_section__section', flat=True)
                self.queryset = self.queryset.filter(id__in=section_list)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_data(self, request.data['sections'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(section__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('academic_year') and self.request.GET.get('standard') and self.request.GET.get('unassigned_sections'):
            queryset = Section.objects.exclude(id__in=StandardSectionMapping.objects.filter(
                academic_year=self.request.GET.get('academic_year'),
                standard=self.request.GET.get('standard')
            ).values_list('section', flat=True))
        else:
            queryset = self.get_queryset()
        queryset = self.filter_queryset(queryset)
        serializer = self.get_serializer(queryset, many=True)
        return Response({'data': serializer.data})


class FilterSectionViewSet(viewsets.ModelViewSet):
    serializer_class = FilterSectionSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        filter_query = {'section__is_active': True}
        if self.request.GET.get('branch'):
            filter_query['standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard__board'] = self.request.GET.get('board')
        self.queryset = StandardSectionMapping.objects.filter(**filter_query).order_by('section__name')
        if not self.request.user.is_anonymous and not self.request.user.is_superuser and self.request.user and self.request.user.staff:
            setting_value = ConfigurationService.get_setting_value('staffstandardmapping')
            if int(setting_value) == 2:
                section_list = StaffStandardSectionMapping.objects.filter(staff=self.request.user.staff,is_active=True,standard_section__academic_year=self.request.GET.get('academic_year')).values_list('standard_section_id', flat=True)
                self.queryset = self.queryset.filter(id__in=section_list)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class StandardSectionMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSectionMappingSerializer
    http_method_names = ['post', 'put', 'delete', 'get']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        filter_query = {}
        if self.request.GET.get('branch'):
            filter_query['standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard__board'] = self.request.GET.get('board')
        self.queryset = StandardSectionMapping.objects.filter(**filter_query)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_class_mapping(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = read_class_mapping(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        if not int(request.data['strength']):
            raise exceptions.ValidationError('Enter Valid strength.')
        existing_count = Enrollment.objects.filter(standard_section=self.kwargs['pk']).count()
        if int(existing_count) > int(request.data['strength']):
            raise exceptions.ValidationError('Existing section strength is greater than the given strength')
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_class_mapping(self, request.data)
        return Response(response)


class GetStandardAndSectionApiView(APIView):
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        filter_query = {'section__is_active': True}
        self.queryset = StandardSectionMapping.objects.filter(**filter_query)
        return self.queryset

    def get(self, request):
        response = get_standard_and_section(self)
        return Response(response)


class GetStudentEnrollViewSet(viewsets.ModelViewSet):
    serializer_class = FilterSectionStrengthSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard']

    def get_queryset(self):
        filter_query = {'section__is_active': True}
        if self.request.GET.get('branch'):
            filter_query['standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard__board'] = self.request.GET.get('board')
        self.queryset = StandardSectionMapping.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = read_student_section(self)
        return Response(response)


class EnrollmentViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    http_method_names = ['post', 'put', 'get']

    def get_queryset(self):
        filter_query = {}
        if self.request.GET.get('branch'):
            filter_query['standard_section__standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard_section__standard__board'] = self.request.GET.get('board')
        self.queryset = Enrollment.objects.filter(**filter_query)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = None
        if request.data.get('copy_enrollment_data'):
            response = copy_enrollment_data(self, request.data)
            return Response(response)
        else:
            response = add_enrollment(self, request.data)
        if not response:
            raise exceptions.ValidationError("Invalid data")
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = GetEnrollmentSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = GetEnrollmentSerializer
        response = SharedService.read_data(self, True)
        return Response(response)
    
class AssignSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = AssignSubjectSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        filter_query = {}
        if self.request.GET.get('branch'):
            filter_query['standard_section__standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard_section__standard__board'] = self.request.GET.get('board')
        self.queryset = AssignSubject.objects.filter(**filter_query)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = None
        if request.data.get('copy_subject_data'):
            response = copy_assign_subject_data(self, request.data)
            return Response(response)
        else:
            response = assign_subject(self, request.data)
        if not response:
            raise exceptions.ValidationError("Invalid data")
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_assigned_sub_classes(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class AssignStudentSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectStudentSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['academic_year', 'student']

    def get_queryset(self):
        self.queryset = SubjectStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = assign_subject_student_multiple(self, request.data, **kwargs)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_assign_subject_student(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class GetSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = GetSubjectSerializer
    http_method_names = ['get']

    def get_queryset(self):
        filter_query = {'subject__is_active':True, 'standard_section__academic_year': self.request.GET.get('acadmeic_year')}
        if self.request.GET.get('branch'):
            filter_query['standard_section__standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard_section__standard__board'] = self.request.GET.get('board')
        self.queryset = AssignSubject.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class GetAssignedSubjectViewSet(viewsets.ModelViewSet):
    serializer_class = GetStandardSectionSubjectSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard']

    def get_queryset(self):
        self.queryset = StandardSectionMapping.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = read_assign_subjects(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class PromoteStudentViewSet(viewsets.ModelViewSet):
    serializer_class = PromoteStudentSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = PromoteStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        if request.data.get('promote_all'):
            response = add_promote_student_academic_year(self, request.data)
        else:
            response = add_promote_student(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class GetPromoteStudentViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicYearSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = AcademicYear.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_elligible_for_promote_student(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        standard_id = request.GET.get('standard')
        academic_year = self.kwargs['pk']
        response = get_promote_student(self, standard_id, academic_year)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_elligible_for_promote_student(self)
        return Response(response)

class BulkChangeStandardViewSet(viewsets.ModelViewSet):
    """
    ViewSet for bulk changing student standards with comprehensive validation
    """
    http_method_names = ['post']
    
    def get_queryset(self):
        return None
    
    def create(self, request, *args, **kwargs):
        """
        Validate and perform bulk standard change
        """
        action = request.data.get('action', 'change')
        
        if action == 'validate':
            # Validation endpoint
            student_ids = request.data.get('student_ids', [])
            from_standard_id = request.data.get('from_standard_id')
            to_standard_id = request.data.get('to_standard_id')
            academic_year_id = request.data.get('academic_year_id')
            
            # Check if all required fields are provided and valid
            if not student_ids or len(student_ids) == 0:
                raise exceptions.ValidationError('student_ids is required and cannot be empty')
            if not from_standard_id or from_standard_id == 0:
                raise exceptions.ValidationError('from_standard_id is required')
            if not to_standard_id or to_standard_id == 0:
                raise exceptions.ValidationError('to_standard_id is required')
            if not academic_year_id or academic_year_id == 0:
                raise exceptions.ValidationError('academic_year_id is required')
            
            response = validate_standard_change_dependencies(
                self, student_ids, from_standard_id, to_standard_id, academic_year_id
            )
            return Response(response)
        else:
            # Perform the change
            response = bulk_change_student_standard(self, request.data)
            return Response(response)


class EnrolledStudentStandardViewSet(viewsets.ModelViewSet):
    serializer_class = EnrolledStudentsSerializer
    http_method_names = ['get']
    search_fields = ['student__first_name', 'student__middle_name', 'student__last_name', 'student__current_reg_num']
    ordering_fields = [('student_first_name', 'student__first_name'), ('student_middle_name', 'student__middle_name'),
                       ('student_last_name', 'student__last_name'), ('student_current_reg_num', 'current_reg_num')]

    # filterset_fields = ['academic_year', 'standard', 'section']

    def get_queryset(self):
        filter_query = {}
        filter_query['student__is_active'] = True
        is_new_student = self.request.GET.get('is_new_student', None)
        if self.request.GET.get('standard_section'):
            filter_query['standard_section'] = self.request.GET.get('standard_section')
            academic_year = StandardSectionMapping.objects.get(id=self.request.GET.get('standard_section'))
        else:
            filter_query['standard_section__academic_year'] = self.request.GET.get('academic_year')
            filter_query['standard_section__standard'] = self.request.GET.get('standard')
            if self.request.GET.get('section'):
                filter_query['standard_section__section'] = self.request.GET.get('section')
            academic_year = self.request.GET.get('academic_year')
        if self.request.GET.get('student_subject') and self.request.GET.get('academic_year'):#get students assigned to the subject
            student_ids = list(SubjectStudent.objects.filter(
              subject=self.request.GET.get('student_subject'),
              academic_year=self.request.GET.get('academic_year')
            ).values_list('student', flat=True))
            filter_query['student__in'] = student_ids
        if is_new_student is not None:
            student_ids = StudentStandardMapping.objects.filter(is_new_student=is_new_student, academic_year=academic_year).values_list(
                'student', flat=True
            )
            filter_query['student__in'] = student_ids
        self.queryset = Enrollment.objects.filter(
            **filter_query
        )
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_enrolled_students(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class ShuffleStudentStandardViewSet(viewsets.ModelViewSet):
    serializer_class = EnrollmentSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        self.queryset = Enrollment.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = shuffle_enrollment(self, request.data, **kwargs)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_shuffle_student(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)
    
class SubjectAttendanceDetailViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    filterset_fields = ['standard_section']

    def get_queryset(self):
        self.queryset = AssignSubject.objects.filter(standard_section__section__is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        if (self.request.GET.get('attendance_report')):
            response = get_subject_attendance_single_report(self)
            return Response(response)
        response = get_subject_attendance(self)
        if (self.request.GET.get('print_report')):
            return response
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_subject_attendance_detail(self)
        return Response(response)
    
class SubjectAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectAttendanceSerializer
    http_methods_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['for_date', 'subject', 'status', 'standard_section', 'student','from_time','to_time','transaction_id']

    def get_queryset(self):
        filter_query = {'student__is_active': True}
        if self.request.GET.get('subject'):
            student_ids = SubjectStudent.objects.filter(
                subject=self.request.GET.get('subject')
            ).values_list('student', flat=True)
            filter_query['student__in'] = student_ids
        self.queryset = SubjectAttendance.objects.filter(**filter_query).order_by('student__first_name')
        return self.queryset

    def create(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            if 'upload_bulk' in request.data or 'upload_subject_attendance_bulk' in request.data:
                response = upload_subject_attendance_bulk(self, request.data)
            # Check if data contains max_days and present_obtained (new format)
            elif 'subject' in request.data and isinstance(request.data['subject'], list) and len(request.data['subject']) > 0:
                first_subject = request.data['subject'][0]
                if 'max_days' in first_subject and 'present_obtained' in first_subject and 'students' in first_subject:
                    response = update_subject_attendance_bulk(self, request.data)
                elif 'new_format' in request.data:
                    response = add_subject_attendance_bulk(self, request.data)
                else:
                    response = add_attendance(self, request.data)
            elif 'new_format' in request.data:
                response = add_subject_attendance_bulk(self, request.data)
            else:
                response = add_attendance(self, request.data)
            return Response(response)

    def update(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            response = SharedService.update_data(self, request.data, **kwargs)
            return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_subject_attendance_report(self)
        return response

    def list(self, request, *args, **kwarg):
        subject_attendance_filter_query = {'student__is_active': True}
        for filter_set in self.filterset_fields:
            if request.GET.get(filter_set):
                subject_attendance_filter_query[filter_set] = request.GET.get(filter_set)
        student_ids = []
        subject_student_mapping = {}
        enrollment_mapping = {}
        academic_year = None
        enrollment_data = Enrollment.objects.filter(
            standard_section=self.request.GET.get('standard_section'),
            student__is_active=True
        ).values('student', 'standard_section__standard__name', 'standard_section__section__name', 'standard_section','standard_section__academic_year_id')
        for student in enrollment_data:
            student_ids.append(student['student'])
            academic_year = student['standard_section__academic_year_id']
            enrollment_mapping[student['student']] = student
        # if self.request.GET.get('timetable_schedule'):
        #     student_ids=[]
        #     batch = TimeTableScheduleStaffSubjectBatch.objects.filter(timetable_schedule=self.request.GET.get('timetable_schedule')).first()
        #     subject_time_table_batch = {}
        #     # BatchWiseStudentMapping.objects.filter(timetable_batch = batch.timetable_batch).values('student')
        #     for student in subject_time_table_batch:
        #         student_ids.append(student['student'])
        #         subject_student_mapping[student['student']] = student
        # else:
        subject_student_data = SubjectStudent.objects.filter(subject=self.request.GET.get('subject'),academic_year = academic_year,student__in=student_ids,student__is_active=True).values('student','subject')
        student_ids = []
        for student in subject_student_data:
            student_ids.append(student['student'])
            subject_student_mapping[student['student']] = student
        subject_attendance_filter_query['student__in'] = student_ids
        time_list = []
        subject_attendance_data={}
        if self.request.GET.get('is_report'):
            filter_query={'for_date':self.request.GET.get('for_date')}
            filter_query['subject']=self.request.GET.get('subject')
            student_attendance = SubjectAttendance.objects.filter(**filter_query).values('for_date', 'subject', 'status', 'standard_section', 'student', 'marked_by', 'id','from_time','to_time')
            for attendance in student_attendance:
                if attendance['student'] not in subject_attendance_data:
                    subject_attendance_data[attendance['student']]={}
                key=attendance['from_time'].strftime('%H:%M')+'-'+attendance['to_time'].strftime('%H:%M')
                if key not in time_list:
                    time_list.append(key)
                if key not in subject_attendance_data[attendance['student']]:
                    subject_attendance_data[attendance['student']][key]=attendance['status']
                # if key not in subject_attendance_data[attendance['student']]['time_data']:
                #     subject_attendance_data[attendance['student']]['time_data'][key]=attendance['status']
        else:
            if self.request.GET.get('transaction_id'):
                subject_attendance_data = {att['student'] : att for att in SubjectAttendance.objects.filter(transaction_id=self.request.GET.get('transaction_id')).values(
                    'for_date', 'subject', 'status', 'standard_section', 'student', 'marked_by', 'id','from_time','to_time'
                )}
        order_by_gender = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'order_by_gender')
        gender_ordering = ['gender', 'first_name'] if int(order_by_gender) == 1 else ['first_name']
        student_data = Student.objects.filter(id__in=student_ids).order_by(*gender_ordering).values(
            'first_name', 'middle_name', 'last_name', 'gender',
            'current_reg_num', 'mobile_num', 'dob',
            'profile_pic', 'id'
        )
        profile_pic_ids = []
        for student in student_data:
            if student['profile_pic']:
                profile_pic_ids.append(student['profile_pic'])
        document_queryset = Document.objects.filter(id__in=profile_pic_ids)
        doc_serializer = DocumentSerializer(document_queryset, many=True)
        doc_mapping = {doc['id']: doc for doc in doc_serializer.data}
        return_data = []
        for student in student_data:
            student['name'] = get_full_name(student['first_name'], student['middle_name'], student['last_name'])
            student_id = student['id']
            student['student'] = student_id
            del student['id']
            student['student_first_name'] = student['first_name']
            student['student_middle_name'] = student['middle_name']
            student['student_last_name'] = student['last_name']
            if student_id in subject_attendance_data:
                student.update(subject_attendance_data[student_id])
            if student_id in enrollment_mapping:
                student['standard_name'] = enrollment_mapping[student_id]['standard_section__standard__name']
                student['standard_section'] = enrollment_mapping[student_id]['standard_section']
                student['section_name'] = enrollment_mapping[student_id]['standard_section__section__name']
            student['profile_pic_details'] = doc_mapping[student['profile_pic']] if student['profile_pic'] in doc_mapping else None
            return_data.append(student)
        return Response({'data': return_data,'time_list':time_list})
    
    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'Reason': 'Data Deleted Successfully'})


class AttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_methods_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['for_date', 'session', 'status', 'standard_section', 'student']

    def get_queryset(self):
        filter_query = {'student__is_active': True}
        if self.request.GET.get('standard_section'):
            student_ids = Enrollment.objects.filter(
                standard_section=self.request.GET.get('standard_section')
            ).values_list('student', flat=True)
            filter_query['student__in'] = student_ids
        self.queryset = Attendance.objects.filter(**filter_query).order_by('student__first_name')
        return self.queryset

    def create(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            if 'new_format' in request.data:
                response = add_attendance_bulk(self, request.data)
            else:
                response = add_attendance(self, request.data)
            return Response(response)

    def update(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            response = SharedService.update_data(self, request.data, **kwargs)
            return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_attendance_report(self)
        return response

    def list(self, request, *args, **kwarg):
        attendance_filter_query = {'student__is_active': True}
        for filter_set in self.filterset_fields:
            if request.GET.get(filter_set):
                attendance_filter_query[filter_set] = request.GET.get(filter_set)
        student_ids = []
        enrollment_mapping = {}
        enrollment_data = Enrollment.objects.filter(
            standard_section=self.request.GET.get('standard_section'),
            student__is_active=True
        ).values('student', 'standard_section__standard__name', 'standard_section__section__name', 'standard_section')
        for student in enrollment_data:
            student_ids.append(student['student'])
            enrollment_mapping[student['student']] = student
        attendance_filter_query['student__in'] = student_ids
        attendance_data = {att['student'] : att for att in Attendance.objects.filter(**attendance_filter_query).values(
            'for_date', 'session', 'status', 'standard_section', 'student', 'marked_by', 'id'
        )}
        order_by_gender = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'order_by_gender')
        gender_ordering = ['gender', 'first_name'] if int(order_by_gender) == 1 else ['first_name']
        student_data = Student.objects.filter(id__in=student_ids).order_by(*gender_ordering).values(
            'first_name', 'middle_name', 'last_name', 'gender',
            'current_reg_num', 'mobile_num', 'dob',
            'profile_pic', 'id'
        )
        profile_pic_ids = []
        for student in student_data:
            if student['profile_pic']:
                profile_pic_ids.append(student['profile_pic'])
        document_queryset = Document.objects.filter(id__in=profile_pic_ids)
        doc_serializer = DocumentSerializer(document_queryset, many=True)
        doc_mapping = {doc['id']: doc for doc in doc_serializer.data}
        return_data = []
        for student in student_data:
            student['name'] = get_full_name(student['first_name'], student['middle_name'], student['last_name'])
            student_id = student['id']
            student['student'] = student_id
            del student['id']
            student['student_first_name'] = student['first_name']
            student['student_middle_name'] = student['middle_name']
            student['student_last_name'] = student['last_name']
            if student_id in attendance_data:
                student.update(attendance_data[student_id])
            if student_id in enrollment_mapping:
                student['standard_name'] = enrollment_mapping[student_id]['standard_section__standard__name']
                student['standard_section'] = enrollment_mapping[student_id]['standard_section']
                student['section_name'] = enrollment_mapping[student_id]['standard_section__section__name']
            student['profile_pic_details'] = doc_mapping[student['profile_pic']] if student['profile_pic'] in doc_mapping else None
            return_data.append(student)
        return Response({'data': return_data})



    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'Reason': 'Data Deleted Successfully'})


class AttendanceDetailViewSet(viewsets.ModelViewSet):
    serializer_class = FilterSectionSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard']

    def get_queryset(self):
        self.queryset = StandardSectionMapping.objects.filter(section__is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('standard_section_summary'):
            response = get_attendance_standard_section_wise(self)
        else:
            response = get_attendance(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_attendance_detail(self)
        return Response(response)
    
class RFIDAttendanceDetailViewSet(viewsets.ModelViewSet):
    serializer_class = FilterSectionSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year', 'standard']

    def get_queryset(self):
        self.queryset = StandardSectionMapping.objects.filter(section__is_active=True)
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_rfid_attendance_detail(self)
        return Response(response)

class StrengthFromPreviousYearViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSectionMappingSerializer
    http_method_names = ['post']

    def get_queryset(self):
        filter_query = {'section__is_active': True}
        if self.request.GET.get('branch'):
            filter_query['standard__branch'] = self.request.GET.get('branch')
        if self.request.GET.get('board'):
            filter_query['standard__board'] = self.request.GET.get('board')
        self.queryset = StandardSectionMapping.objects.filter(**filter_query)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_multiple_class_mapping(self, request.data)
        return Response(response)

class HandleMachineViewSet(viewsets.ModelViewSet):
    serializer_class = MachineAttendanceSerializer
    http_method_names = ['post']
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        self.queryset = MachineAttendance.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = handle_machine_data(self, request.data)
        return Response(response)


class StudentRfidAttendanceReportViewSet(viewsets.ModelViewSet):
    serializer_class = EnrolledStudentsSerializer
    http_method_names = ['get']
    search_fields = ['student__first_name', 'student__middle_name', 'student__last_name', 'student__current_reg_num']
    ordering_fields = [('student_first_name', 'student__first_name'), ('student_middle_name', 'student__middle_name'),
                       ('student_last_name', 'student__last_name'), ('student_current_reg_num', 'current_reg_num')]

    # filterset_fields = ['academic_year', 'standard', 'section']

    def get_queryset(self):
        filter_query = {
            'standard_section__academic_year': self.request.GET.get('academic_year'),
            'standard_section__standard': self.request.GET.get('standard'),
        }
        if self.request.GET.get('section'):
            filter_query['standard_section__section'] = self.request.GET.get('section')
        if self.request.user.student:
            filter_query['student'] = self.request.user.student.id
        self.queryset = Enrollment.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        subject = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'is_subject_wise')
        attendance_type = None
        if request.user.student:
            student_standard = StudentStandardMapping.get_student_last_standard(2)
            # student_standard = StudentStandardMapping.get_student_last_standard(self.request.user.student)
            if student_standard:
                try:
                    standard_attendance_config = StandardAttendanceConfiguration.objects.get(standard_id=student_standard['standard_id'])
                except Exception as e:
                    standard_attendance_config = None
                if standard_attendance_config:
                    attendance_type = standard_attendance_config.attendance_type
        if rfid or str(attendance_type) == '2':
            response = get_student_rfid_attendance_list(self, request)
        elif subject or str(attendance_type) == '3':
            response = get_student_subject_attendance_list(self,request)
        else:
            response = get_student_attendance_list(self,request)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        subject = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'is_subject_wise')
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date')
        if not start_date and self.request.GET.get('fromDate'):
            start_date = self.request.GET.get('fromDate')
        if not end_date and self.request.GET.get('toDate'):
            end_date = self.request.GET.get('toDate')
        if rfid:
            response = get_rfid_student_attendance_individual(
                self, self.kwargs['pk'], self.request.GET.get('academic_year'),
                start_date, end_date
            )
        elif subject:
            response = get_student_subject_attendance_individual(
                self, self.kwargs['pk'], self.request.GET.get('academic_year'),self.request.GET.get('subject'),
                start_date, end_date
            )
        else:
            response = get_student_attendance_individual(
                self, self.kwargs['pk'], self.request.GET.get('academic_year'),
                start_date, end_date
            )
        return Response(response)

class StudentAttendanceIndividualViewSet(viewsets.ModelViewSet):
    serializer_class = EnrolledStudentsSerializer
    http_method_names = ['get']
    permission_classes = [permissions.IsAuthenticated]

    def retrieve(self, request, *args, **kwargs):
        start_date = self.request.GET.get('start_date')
        end_date = self.request.GET.get('end_date') 
        academic_year_id = self.request.GET.get('academic_year')  

        if academic_year_id:
            try:
                academic_year = AcademicYear.objects.get(id=academic_year_id)
            except AcademicYear.DoesNotExist:
                raise exceptions.ValidationError("Invalid academic year provided.")
        else:
            try:
                academic_year = AcademicYear.objects.latest('start_date')
            except AcademicYear.DoesNotExist:
                raise exceptions.ValidationError("No academic year found in the system.")
        
        response = get_student_attendance_individual(
            self, self.kwargs['pk'], academic_year.id, start_date, end_date
        )

        return Response(response)

class BoardViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = None

    def get_queryset(self):
        self.queryset = Board.objects.all()
        return self.queryset

    def list(self, request):
        return Response({'data': Board.objects.all().values()})

class BranchViewSet(viewsets.ModelViewSet):
    http_method_names = ['get','post','put','delete']
    serializer_class = BranchSerializer

    def get_queryset(self):
        self.queryset = Branch.objects.filter(is_active=True)
        return self.queryset

    def list(self, request):
        return Response({'data': Branch.objects.filter(is_active=True).values()})
    
    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        if Standard.objects.filter(branch=self.queryset):
            raise exceptions.ValidationError('Branch is Already Refered')
        else:
            response = SharedService.soft_delete_data(self)
            return Response(response)
        
class CumulativeTypeViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete']
    serializer_class = CumulativeSerializer
    
    def get_queryset(self):
        self.queryset = CumulativeType.objects.filter(is_active=True)
        return self.queryset

    def list(self, request):
        return  Response(SharedService.read_data(self, True))

    def create(self, request, *args, **kwargs):
        validate_cumulative_type(self, request.data['post_data'])
        return  Response(SharedService.add_or_update_data(self, request.data['post_data']))

    def destroy(self, request, *args, **kwargs):
        filter_data = {'exam_schedule_cumulative_mapping_cumulative_type__isnull': True}
        return  Response(SharedService.delete_unrefered_data(self, filter_data, 'Data Referred in cumulative mapping'))

class GetMyStandardViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = GetEnrollmentStandard
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        student_id = self.request.GET.get('student')
        if not student_id:
            if not self.request.user or not self.request.user.student: #for some reason we using same api for lading studnet standard
                raise exceptions.ValidationError('Only student can view the data')
            student_id = self.request.user.student
        self.queryset = Enrollment.objects.filter(student=student_id)
        return self.queryset

    def list(self, request):
        if self.request.GET.get('tc_standards'):
            return Response({'data': get_student_standard_list_for_tc(self, self.request.GET.get('student'))})
        return Response(SharedService.read_data(self, True))

class GetMyStandardViewSet1(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = GetEnrollmentStandard

    def get_queryset(self):
        student_id = self.request.GET.get('student_id')
        self.queryset = Enrollment.objects.filter(student=student_id)
        return self.queryset

    def list(self, request):
        if self.request.GET.get('tc_standards'):
            return Response({'data': get_student_standard_list_for_tc(self, self.request.GET.get('student'))})
        return Response(SharedService.read_data(self, True))

class GetSubjectPartTypeViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = SubjectPartTypeSerializer

    def get_queryset(self):
        self.queryset = SubjectPartType.objects.all()
        return self.queryset

    def list(self, request):
        return Response(SharedService.read_data(self, True))

class DepromoteStudentViewSet(viewsets.ModelViewSet):
    serializer_class = PromoteStudentSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = PromoteStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = depromote_student(self, request.data)
        return Response(response)

class MoveStudentToPreviousViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = move_student_to_previous_acadmeic(self, request.data)
        return Response(response)

class MachineUserMappingViewSet(viewsets.ModelViewSet):
    serializer_class = MachineUserMappingSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['is_active', 'user__is_staff']
    ordering_fields = [('student_first_name', 'student__first_name'), ('student_middle_name', 'student__middle_name'),
                       ('student_last_name', 'student__last_name'), ('student_current_reg_num', 'current_reg_num')]

    def get_queryset(self):
        return MachineUserMapping.objects.filter(is_active=True)

    def create(self, request, *args, **kwargs):
        response = machine_user_mapping_add_or_update(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('only_mapped'):
            self.serializer_class = MachineUserMappingReadSerializer
            response = SharedService.read_data_paginated(self, True)
        else:
            response = get_machine_user_mapping_data(self)
        return Response(response)

class AttendanceReportViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = attendance_report(self, request.data)
        return Response(response)
    
class SubjectAttendanceReportViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectAttendanceSerializer
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = subject_attendance_report(self, request.data)
        return Response(response)

class ProcessFaileDataViewSet(viewsets.ModelViewSet):
    serializer_class = MachineAttendanceFailedToSaveDataSerializer
    http_method_names = ['post', 'get']
    filterset_fields = ['is_data_processed']

    def get_queryset(self):
        return MachineAttendanceFailedToSaveData.objects.all()

    def create(self, request, *args, **kwargs):
        response = process_failed_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        return Response(SharedService.read_data_paginated(self, True))

class MachineAttendanceLogViewSet(viewsets.ModelViewSet):
    serializer_class = MachineAttendanceLogSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return MachineAttendanceLog.objects.all()
    
    def list(self, request, *args, **kwargs):
        return Response(SharedService.read_data_paginated(self, True))

class MachineUserLogViewSet(viewsets.ModelViewSet):
    serializer_class = MachineUserLogSerializer
    http_method_names = ['get']
    search_fields = [
        'user__staff__first_name', 'user__staff__middle_name', 'user__staff__last_name'
        'user__student__first_name', 'user__student__middle_name', 'user__student__last_name'
    ]

    def get_queryset(self):
        return MachineUserLog.objects.all()

    def list(self, request, *args, **kwargs):
        return Response(SharedService.read_data_paginated(self, True))
    
class RfidAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = MachineAttendanceSerializer
    http_methods_names = ['get', 'post', 'delete']
    filterset_fields = ['student']

    def get_queryset(self):
        self.queryset = MachineAttendance.objects.filter()
        return self.queryset

    def create(self, request):
        response = student_rfid_attendance_add(self, request.data)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = student_rfid_attendance_add(self, request.data)
        return Response(response)
    
    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_student_rfid_attendance(self, request)
        if self.request.GET.get('download_excel'):
            return response
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response({'Reason': 'Data Deleted Successfully'})
   
class StudentLeaveTypeViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLeaveTypeSerializer
    http_methods_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = StudentLeaveType.objects.all()
        return self.queryset

    def create(self, request):
        response = add_studentleavetype(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        self.queryset = self.get_queryset().filter(is_active=True)
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('current_academic_year', None):
            currentDate = datetime.date.today()
            academicYearData = AcademicYear.get_academic_year_for_date(self, currentDate)
            acaYearId = academicYearData['id']
            response = {}
            response['data'] = self.get_queryset().filter(studentleavetypeacademicyearmapping__academic_year=acaYearId).values()
        else:
            self.queryset = self.get_queryset().filter(is_active=True)
            response = SharedService.read_data(self, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_studentleave_type(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(studentleavetypeacademicyearmapping__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Leave type is already mapped in leave plan')

class StudentLeaveTypeAcademicYearMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLeaveTypeAcademicYearMappingSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = StudentLeaveTypeAcademicYearMapping.objects.all()
        return self.queryset

    def create(self, request):  # add and update
        response = add_update_delete_studentleavetype_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_studentleaves_count(self)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        leaveTypeId = self.get_queryset().filter(id=self.get_object().id).values_list('leave_type', flat=True)
        if StudentLeaves.objects.filter(leave_type__in=leaveTypeId):
            raise exceptions.ValidationError('Student have already applied for this leave types')
        else:
            self.get_object().delete()
            return Response({'Result': True, 'Reason': 'Data Deleted Successfully'})


class ApplyStudentLeaveViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLeaveSerializers
    http_method_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['student', 'leave_type']

    def get_queryset(self):
        self.queryset = StudentLeaves.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(is_active=True)
        response = add_applystudentleave(self,request, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = {'Result': False, 'Reason': 'Invalid Request'}
        try:
            response = delete_appliedLeave(self)
        except Exception as e:
            response['Reason'] = e.args
        return Response(response)

    def list(self, request, *args, **kwargs):
        obj = User.objects.get(id=self.request.user.id)
        student_id = obj.student_id
        filter_query = {
            'is_active': True,
            'student': student_id
        }
        if self.request.GET.get('approval_status'):
            filter_query['approval_status__in'] = self.request.GET.get('approval_status').split(',')
        queryset = self.get_queryset().filter(
            **filter_query
        ).annotate(
            todate=Max('student_leave_date_student_leave__fordate'),
            fromdate=Min('student_leave_date_student_leave__fordate')
        )
        if self.request.GET.get('ordering'):
            queryset = queryset.order_by(self.request.GET.get('ordering'))
        if self.request.GET.get('leave_type'):
            leave_types = [int(temp) for temp in self.request.GET.get('leave_type').split(',')]
            queryset = queryset.filter(leave_type__in=leave_types)
        serializer = GetStudentLeaveSerializers(queryset, many=True)
        if request.GET.get('pagination'):
            data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                    request.GET.get('limit'),
                                                                                    request.GET.get('pageno'))
            data = get_modify_leave_data(self, data)
            return Response({'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}})
        data = get_modify_leave_data(self, serializer.data)
        return Response({'data': data})

    # update used for cancel leave, Approve Leave, reject leave
    def update(self, request, pk=None):
        response = update(self, request.data, pk)
        return Response(response)


# Only For View
class StudentLeaveApprovalViewSet(viewsets.ModelViewSet):
    serializer_class = GetStudentLeaveSerializers
    http_method_names = ['get', 'post', 'delete', 'put']
    queryset = StudentLeaves.objects.all()
    filterset_fields = ['approval_status']

    def list(self, request, *args, **kwargs):
        response = studentleave_approval_view(self, request)
        return Response(response)


# class StudentLeaveListViewSet(viewsets.ModelViewSet):
#     serializer_class = StudentLeaveSerializers
#     http_method_names = ['get']

#     def get_queryset(self):
#         self.queryset = StudentLeaves.objects.filter()
#         return self.queryset

#     def list(self, request, *args, **kwargs):
#         response = recent_studentleaves_from_today(self, request)
#         return Response(response)


class ApplyStudentLeavePagination(viewsets.ModelViewSet):
    queryset = StudentLeaves.objects.all()
    serializer_class = StudentLeaveSerializers
    http_method_names = ['get']
    pagination_class = PostLimitOfsetPagination


class StudentLeaveSummaryViewSet(viewsets.ModelViewSet):
    serializer_class = StudentLeaveSerializers

    def get_queryset(self):
        self.queryset = StudentLeaveDates.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_studentleave_summary_without_carryforward(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.values()[0]['code'] in StudentLeaveType.get_default_leave_codes(self):
            raise exceptions.ValidationError('Cant delete default leave type')
        if self.queryset.filter(leavetypemapping__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Leave type is already mapped in leave plan')
    
class StaffStandardSectionMappingViewSet(viewsets.ModelViewSet):
    serializer_class = StaffStandardSectionMappingSerializer
    http_method_names = ['get', 'post', 'delete','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        if self.request.method == 'GET':
            self.search_fields = ['first_name', 'middle_name', 'last_name']
            # mapped_type = 'only_mapped' / 'only_not_mapped'
            self.queryset = Staff.objects.filter(is_active=True)
            academic_year = self.request.GET.get('academic_year')
            mapped_type = self.request.GET.get('mapped_type')
            if mapped_type == 'only_mapped':
                self.queryset = self.queryset.filter(staff_standard_section_mapping_staff__isnull=False)
                if academic_year:
                    self.queryset = self.queryset.filter(
                        staff_standard_section_mapping_staff__standard_section__academic_year_id=academic_year
                    )
            elif mapped_type == 'only_not_mapped':
                if academic_year:
                    self.queryset = self.queryset.exclude(
                        staff_standard_section_mapping_staff__standard_section__academic_year_id=academic_year
                    )
                else:
                    self.queryset = self.queryset.filter(staff_standard_section_mapping_staff__isnull=True)
            self.queryset = self.queryset.distinct()
        else:
            self.search_fields = ['staff__first_name', 'staff__middle_name', 'staff__last_name']
            self.queryset = StaffStandardSectionMapping.objects.all()
        return self.queryset

    def create(self, request):
        response = add_staff_standard_section_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = StaffStandardMappingDataReadSerializer
        response = SharedService.read_data_paginated(self,True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = update_staff_standard_section(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)
    
class EnrollmentSummaryViewSet(viewsets.ModelViewSet):
    serializer_class = StaffStandardSectionMappingSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Enrollment.objects.all()
        return self.queryset
    
    def list(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(enrollment_summary, self)
            return Response({'Result': True})
        raise exceptions.ValidationError('longrunning process is compulsory')

class StaffSubjectAttendanceReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    
    def list(self, request, *args, **kwargs):
        response = staff_subject_attendance_report(self)
        return Response(response)

class AttendanceBatchViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceBatchSerializer
    http_method_names = ['get','put','delete','post']

    def get_queryset(self):
        self.queryset = AttendanceBatch.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = add_attendancebatch(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        batch_student_data = AttendanceBatchStudentMapping.objects.filter(attendance_batch=request.data['id'],is_active=True)
        batch_attendance_data = BatchAttendance.objects.filter(attendance_batch=request.data['id'])
        if batch_student_data or batch_attendance_data:
            raise exceptions.ValidationError(f'Cannot update. Since the Batch id already assigned.')
        response = add_attendancebatch(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        batch_student_data = AttendanceBatchStudentMapping.objects.filter(attendance_batch=request.data['id'],is_active=True)
        batch_attendance_data = BatchAttendance.objects.filter(attendance_batch=request.data['id'],
                                                                                is_active=True)
        if batch_student_data or batch_attendance_data:
            raise exceptions.ValidationError(f'Cannot delete. Since the Batch id already assigned.')
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

class AttendanceBatchStudentMappingViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceBatchStudentMappingSerializer
    http_method_names = ['get','put','delete','post']

    def get_queryset(self):
        self.queryset = AttendanceBatchStudentMapping.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        standard_section_ids = request.data['standard_section_ids']
        if not standard_section_ids:
            response = add_attendance_batch_student(self, request.data)
        else:
            response = add_attendance_batch_student_standard_section_subject_wise(self,request.data)
        return Response(response)
    
    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)
    
    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        response = SharedService.soft_delete_data(self)
        return Response(response)

class BatchAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = BatchAttendanceSerializer
    http_methods_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['for_date', 'status', 'attendance_batch', 'student']

    def get_queryset(self):
        filter_query = {'student__is_active': True}
        if self.request.GET.get('attendance_batch'):
            student_ids = AttendanceBatchStudentMapping.objects.filter(
                attendance_batch=self.request.GET.get('attendance_batch')
            ).values_list('student', flat=True)
            filter_query['student__in'] = student_ids
        self.queryset = BatchAttendance.objects.filter(**filter_query).order_by('student__first_name')
        return self.queryset

    def create(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            if 'new_format' in request.data:
                response = add_batchattendance_bulk(self, request.data)
            else:
                response = add_batchattendance(self, request.data)
            return Response(response)

    def update(self, request, *args, **kwargs):
        rfid=int(ConfigurationService.get_setting_value('studentattendancetype'))
        if rfid:
            raise exceptions.ValidationError('RFID IS ENABLED YOU CAN NOT MARK ATTENDENCE IN THIS PAGE PLEASE MARK ATTENDANCE IN RFID PAGE')
        else:
            response = SharedService.update_data(self, request.data, **kwargs)
            return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_batchattendance_report(self)
        return response

    def list(self, request, *args, **kwarg):
        attendance_filter_query = {'student__is_active': True}
        for filter_set in self.filterset_fields:
            if request.GET.get(filter_set):
                attendance_filter_query[filter_set] = request.GET.get(filter_set)
        student_ids = []
        enrollment_mapping = {}
        enrollment_data = AttendanceBatchStudentMapping.objects.filter(
            attendance_batch=self.request.GET.get('attendance_batch'),
            student__is_active=True
        ).values('student', 'attendance_batch')
        for student in enrollment_data:
            student_ids.append(student['student'])
            enrollment_mapping[student['student']] = student
        attendance_filter_query['student__in'] = student_ids
        attendance_data = {att['student'] : att for att in BatchAttendance.objects.filter(**attendance_filter_query).values(
            'for_date', 'status', 'attendance_batch', 'student', 'marked_by', 'id'
        )}
        student_data = Student.objects.filter(id__in=student_ids).order_by('first_name').values(
            'first_name', 'middle_name', 'last_name',
            'current_reg_num', 'mobile_num', 'dob',
            'profile_pic', 'id'
        )
        profile_pic_ids = []
        for student in student_data:
            if student['profile_pic']:
                profile_pic_ids.append(student['profile_pic'])
        document_queryset = Document.objects.filter(id__in=profile_pic_ids)
        doc_serializer = DocumentSerializer(document_queryset, many=True)
        doc_mapping = {doc['id']: doc for doc in doc_serializer.data}
        return_data = []
        for student in student_data:
            student['name'] = get_full_name(student['first_name'], student['middle_name'], student['last_name'])
            student_id = student['id']
            student['student'] = student_id
            del student['id']
            student['student_first_name'] = student['first_name']
            student['student_middle_name'] = student['middle_name']
            student['student_last_name'] = student['last_name']
            if student_id in attendance_data:
                student.update(attendance_data[student_id])
            # if student_id in enrollment_mapping:
            #     student['standard_name'] = enrollment_mapping[student_id]['standard_section__standard__name']
            #     student['standard_section'] = enrollment_mapping[student_id]['standard_section']
            #     student['section_name'] = enrollment_mapping[student_id]['standard_section__section__name']
            student['profile_pic_details'] = doc_mapping[student['profile_pic']] if student['profile_pic'] in doc_mapping else None
            return_data.append(student)
        return Response({'data': return_data})

    def destroy(self, request, *args, **kwargs):
        self.get_object().delete()
        return Response({'Reason': 'Data Deleted Successfully'})

class BatchAttendanceDetailViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceBatchSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = AttendanceBatch.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_batch_attendance(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_batchattendance_detail(self)
        return Response(response)

class GetStudentForBatchViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceBatchSerializer
    http_method_names = ['get']
    filterset_fields = ['academic_year','is_active']

    def get_queryset(self):
        self.queryset = AttendanceBatch.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = read_student_batch(self)
        return Response(response)

class BatchStudentStandardViewSet(viewsets.ModelViewSet):
    serializer_class = AttendanceBatchStudentMappingSerializer
    http_method_names = ['get']
    search_fields = ['student__first_name', 'student__middle_name', 'student__last_name', 'student__current_reg_num']
    ordering_fields = [('student_first_name', 'student__first_name'), ('student_middle_name', 'student__middle_name'),
                       ('student_last_name', 'student__last_name'), ('student_current_reg_num', 'current_reg_num')]

    # filterset_fields = ['academic_year', 'standard', 'section']

    def get_queryset(self):
        filter_query = {}
        filter_query['student__is_active'] = True
        if self.request.GET.get('attendance_batch'):
            filter_query['attendance_batch'] = self.request.GET.get('attendance_batch')
        else:
            filter_query['student__standard_student__standard'] = self.request.GET.get('standard')
            filter_query['attendance_batch__academic_year'] = self.request.GET.get('academic_year')
        self.queryset = AttendanceBatchStudentMapping.objects.filter(
            **filter_query
        )
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_batch_students(self)
        return Response(response)

class StandardAttendanceConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = StandardAttendanceConfigurationSerializer
    http_method_names = ['get']
    filterset_fields = ['standard']

    def get_queryset(self):
        self.queryset = StandardAttendanceConfiguration.objects.filter()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
class DownloadDayWiseAttendance(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_methods_names = ['get']

    def get_queryset(self):
        filter_query = {'student__is_active': True}
        if self.request.GET.get('standard_section'):
            student_ids = Enrollment.objects.filter(
                standard_section=self.request.GET.get('standard_section')
            ).values_list('student', flat=True)
            filter_query['student__in'] = student_ids
        self.queryset = Attendance.objects.filter(**filter_query).order_by('student__first_name')
        return self.queryset
    
    def list(self, request, *args, **kwargs):
        is_long_running_process = self.request.GET.get('long_running_process')
        download_excel = self.request.GET.get("download_excel")
        if is_long_running_process and download_excel:
            start_long_running_process(self)
            SharedService.custom_thread(get_std_subject_attendance,self)
            return Response({'Result': True})
        else:
            response = get_attendance_section_wise_report(self)
            return response

class DownloadSatsAttendance(viewsets.ModelViewSet):
    serializer_class = AttendanceSerializer
    http_method_names = ['get']

    def get_queryset(self):
        filter_query = {'student__is_active': True}
        if self.request.GET.get('standard_section'):
            student_ids = Enrollment.objects.filter(
                standard_section=self.request.GET.get('standard_section')
            ).values_list('student', flat=True)
            filter_query['student__in'] = student_ids
        self.queryset = Attendance.objects.filter(**filter_query).order_by('student__first_name')
        return self.queryset
    
    def list(self, request, *args, **kwargs):
        is_long_running_process = self.request.GET.get('long_running_process')
        download_excel = self.request.GET.get("download_excel")
        if is_long_running_process and download_excel:
            start_long_running_process(self)
            SharedService.custom_thread(get_sats_attendance, self)
            return Response({'Result': True})
        else:
            response = get_sats_attendance(self)
            return response
    
class CourseOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = CourseOutcomeSerializer
    http_method_names = ['get','post','delete','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = CourseOutcome.objects.all()
        return self.queryset

    def create(self, request):
        response = add_courseoutcome(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self,True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = update_courseoutcome(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = delete_courseoutcome(self)
        return Response(response)
    
class ProgramOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramOutcomeSerializer
    http_method_names = ['get','post','delete','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = ProgramOutcome.objects.filter()
        return self.queryset

    def create(self, request):
        response = add_programoutcome(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self,True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = update_programoutcome(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = delete_programoutcome(self)
        return Response(response)

class ProgramEducationalObjectivesViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramEducationalObjectivesSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = ProgramEducationalObjectives.objects.filter()
        return self.queryset

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self,True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = delete_programoutcome(self)
        return Response(response)
    
class ProgramSpecificOutcomeViewSet(viewsets.ModelViewSet):
    serializer_class = ProgramSpecificOutcomeSerializer
    http_method_names = ['get','post','delete','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = ProgramSpecificOutcome.objects.filter()
        return self.queryset

    def create(self, request):
        response = add_programspecificoutcome(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self,True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = update_programspecificoutcome(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = delete_programoutcome(self)
        return Response(response)

class SubjectCOPOPSOMappingMatrixViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get','post','delete','put']

    def create(self, request):
        response = add_subject_course_outcome_program_mapping_matrix(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_subject_course_outcome_program_mapping_matrix(self)
        return Response(response)
    
class StaffSubjectCourseDesign(viewsets.ModelViewSet):
    serializer_class = StaffSubjectDetailsSerializer
    http_method_names = ['get','post']
    
    def get_queryset(self):
        self.queryset = StaffSubjectDetails.objects.all()
        return self.queryset

    def create(self, request):
        response = add_staff_subject_course_design(self, request.data)
        return Response(response)
    
    def list(self, request, *args, **kwargs):
        response = read_staff_subject_course_design(self)
        return Response(response)

class SubjectCategoryViewSet(viewsets.ModelViewSet):
    http_method_names = ['get','post','put','delete']
    serializer_class = SubjectCategorySerializer
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = SubjectCategory.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self,True)
        return Response(response)
    
    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)
    
class SubjectDetailsViewSet(viewsets.ModelViewSet):
    serializer_class = SubjectDetailsReadSerializer
    http_method_names = ['get','post']
    filterset_fields = ['subject_id','subject_category_id']

    def get_queryset(self):
        self.queryset = SubjectDetails.objects.filter()
        branch_id = self.request.query_params.get('branch')
        if branch_id:
            self.queryset = self.queryset.filter(subject__subject_branch_mapping_subject__branch_id=branch_id)
        return self.queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        subject_id = request.query_params.get('subject_id')
        if subject_id:
            try:
                subject_id = int(subject_id)
            except ValueError:
                return Response({"detail": "subject_id must be an integer"}, status=400)
            queryset = queryset.filter(subject_id=subject_id)
        response = SharedService.read_data(self,True)
        if not response['data']:
            subject_data = (
                            Subject.objects
                            .filter(id=subject_id)
                            .annotate(subject=F("id"))   # rename id → subject_id
                            .values("subject", "name", "subject_code")
                        )
            response['data'] = subject_data[0] if subject_data else []
        return Response(response)
    
    def create(self, request, *args, **kwargs):
        response = add_subjectdetails_data(self, request.data)
        return Response(response)
    
class AttendanceNotMarkedTimetable(viewsets.ModelViewSet):
    serializer_class = TimeTableScheduleReadSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = TimeTableSchedule.objects.filter()
        return self.queryset

    def list(self,request,*args,**kwargs):
        response = get_notmarked_attendance_list(self)
        return Response(response)

class LessonPlanTemplateViewSet(viewsets.ModelViewSet):
    """GET: list/retrieve lesson plan templates. POST: create or update (send id for edit)."""
    queryset = LessonPlanTemplate.objects.all()
    serializer_class = LessonPlanTemplateReadSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['is_active', 'subject', 'standard']

    def get_queryset(self):
        queryset = LessonPlanTemplate.objects.all().order_by('-modified')

        standard_section = self.request.query_params.get('standard_section')
        subject = self.request.query_params.get('subject')

        if standard_section:
            mapping = StandardSectionMapping.objects.filter(id=standard_section).first()
            if mapping and mapping.standard_id:
                queryset = queryset.filter(standard=mapping.standard_id)
        if subject:
            queryset = queryset.filter(subject=subject)

        return queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = LessonPlanTemplateReadSerializer
        if request.GET.get('pageno'):
            response = SharedService.read_data_paginated(self, True)
        else:
            response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = LessonPlanTemplateReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = create_or_update_lesson_plan_template(self, request.data)
        return Response(response)

class LessonPlanTemplateAcademicYearViewSet(viewsets.ModelViewSet):
    serializer_class = LessonPlanAcademicYearSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['is_active', 'subject', 'standard_section','academic_year']

    def get_queryset(self):
        queryset = LessonPlanAcademicYear.objects.all().order_by('-modified')
        return queryset

    def list(self, request, *args, **kwargs):
        self.serializer_class = LessonPlanAcademicYearReadSerializer
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = create_or_update_lesson_plan_template_academic_year(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = LessonPlanAcademicYearReadSerializer
        response = SharedService.read_data(self)
        return Response(response)


class AILessonPlanPreviewView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request, *args, **kwargs):
        serializer = AiLessonPlanPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = build_ai_lesson_plan_preview(serializer.validated_data)
        return Response(response)


class AILessonPlanImportView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AiLessonPlanImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # Inject current user for snapshot attribution
        data = serializer.validated_data
        data['user'] = request.user
        response = import_ai_lesson_plan(data)
        return Response(response)


class NcertHierarchyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        return Response({"data": get_ncert_hierarchy()})


class NcertBooksView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        class_num = request.GET.get("class_num") or request.GET.get("class")
        subject_name = request.GET.get("subject")
        if not class_num or not subject_name:
            raise exceptions.ValidationError(
                {"detail": "class_num and subject are required."}
            )
        return Response({"data": get_ncert_books(class_num, subject_name)})


class AILessonPlanNcertPreviewView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        serializer = AiLessonPlanNcertPreviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        response = build_ai_lesson_plan_preview_from_ncert(serializer.validated_data)
        return Response(response)


class UpdateLessonPlanStatusViewSet(viewsets.ViewSet):
    """
    list (GET): Fetch lesson plan status. Query params: standard_section, subject, academic_year, fordate (optional).
    create (POST): Update status (completion_date or add comment). Validates user is mapped in StaffHourSubjectMapping.
    """
    http_method_names = ['get', 'post']

    def list(self, request, *args, **kwargs):
        response = get_lesson_plan_status_details(request)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = update_lesson_plan_status(request, request.data)
        return Response(response)


class StaffLessonPlanDashboardViewSet(viewsets.ViewSet):
    """
    GET: Dashboard for logged-in staff. Returns completed, total/pending syllabus, today's assigned tasks
    per (subject, standard_section). No filters = all mapped allocations; optional query params
    subject, standard_section, academic_year for dropdown filtering and report-style view.
    """
    permission_classes = [permissions.IsAuthenticated]
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_staff_lesson_plan_dashboard(request)
        return Response(response)


from apps.classes.services.versioning_service import restore_lesson_plan_version

class LessonPlanVersionViewSet(viewsets.ReadOnlyModelViewSet):
    """GET: list versions for a lesson plan. POST (action): restore a version."""
    queryset = LessonPlanVersion.objects.all()
    serializer_class = LessonPlanVersionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        lesson_plan_id = self.request.query_params.get('lesson_plan')
        if not lesson_plan_id:
            return LessonPlanVersion.objects.none()
        return LessonPlanVersion.objects.filter(lesson_plan_id=lesson_plan_id).order_by('-version_number')

    @action(detail=True, methods=['post'], url_path='restore')
    def restore(self, request, pk=None):
        version = self.get_object()
        restore_lesson_plan_version(version.lesson_plan, version.version_number)
        return Response({"Reason": f"Restored to version {version.version_number}"})
