from rest_framework import viewsets
from rest_framework.views import Response

from apps.diary.models.diary import Diary, DocumentDiary, StandardSectionDiary
from apps.diary.serializers import DiarySerializer, DocumentDiarySerializer, AppDiarySerializer, StandardSectionDiarySerializer
from apps.diary.services.diary import add_update_diary_data, get_diary_list, delete_diary, get_home_work_new,get_abacus_home_work
from apps.diary.services.diary_document import upload_diary_document, get_diary_document, update_diary_document, \
    delete_diary_document
from apps.diary.services.diary_status import update_diary_status
from apps.diary.services.diary_student import get_diary_standard_wise, get_diary_student_list, get_diary_student
from apps.shared.services import SharedService
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer
from apps.users.services.permissions import IsAuthenticated
from apps.shared.services_shared.store_api_result import start_long_running_process


class DiaryViewSet(viewsets.ModelViewSet):
    serializer_class = DiarySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    ordering_fields = ['title', 'due_date', ('subject_name', 'subject__name')]
    permission_classes_by_action = IsAuthenticated

    def get_queryset(self):
        self.queryset = Diary.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_update_diary_data(self, request.data, False, **kwargs)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = add_update_diary_data(self, request.data, True, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_diary(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_home_work_new(self)
        return Response(response)
    
class DiaryReportViewSet(viewsets.ModelViewSet):
    serializer_class = DiarySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    ordering_fields = ['title', 'due_date', ('subject_name', 'subject__name')]
    permission_classes_by_action = IsAuthenticated
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Diary.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            response = SharedService.read_data(self,True)
            SharedService.custom_thread(get_abacus_home_work, self, response['data'])
            return Response({'Result': True})
        response = SharedService.read_data(self,True)
        response = get_abacus_home_work(self,response.data)
        return Response(response)
       
        # return response


class AppDiaryViewSet(viewsets.ModelViewSet):
    serializer_class = AppDiarySerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = Diary.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_diary_student(self)
        return Response(response)


class DiaryStatusViewSet(viewsets.ModelViewSet):
    serializer_class = DiarySerializer
    http_method_names = ['put']

    def get_queryset(self):
        self.queryset = Diary.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        response = update_diary_status(self, request.data, **kwargs)
        return Response(response)


class DiaryStudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentListSerializer
    http_method_names = ['get']
    search_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num']
    ordering_fields = ['first_name', 'middle_name', 'last_name', 'current_reg_num']

    def get_queryset(self):
        self.queryset = Student.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_diary_student_list(self)
        return Response(response)


class DiaryDocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentDiarySerializer
    http_method_names = ['post', 'get', 'put', 'delete']
    filterset_fields = ['diary', 'user']
    ordering_fields = ['created']

    def get_queryset(self):
        self.queryset = DocumentDiary.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = upload_diary_document(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_diary_document(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_diary_document(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_diary_document(self)
        return Response(response)

class DiaryStandardWiseViewSet(viewsets.ModelViewSet):
    serializer_class = StandardSectionDiarySerializer
    http_method_names = ['get']

    def get_queryset(self):
        return StandardSectionDiary.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        response = get_diary_standard_wise(self)
        return Response(response)