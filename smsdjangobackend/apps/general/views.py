from rest_framework import viewsets, exceptions
from operator import itemgetter
from rest_framework.views import Response
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.serializers import StandardSectionMappingSerializer

from apps.general.models import Event, HolidayCalender
from apps.general.models.event import EventType
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.general.serializers import (EventSerializer, HolidayCalenderSerializer, EventGetSerializer,
                                      EventTypeSerializer, HolidayCalenderForStudentSerializer, SchoolTimingSerializer,
                                      SchoolTimingParentReadSerializer,HolidayPlanSerializer)
from apps.general.models.holidayCalender import HolidayCalender, HolidayCalenderStudent,HolidayPlan
from apps.general.services.event import add_data, add_event, update_event
from apps.general.services.holiday import (add_holiday, delete_holiday_for_student, update_holiday, delete_holiday, add_holiday_for_student, update_holiday_for_student, 
                                           delete_holiday_for_student,add_holiday_plan,update_holiday_plan,read_holiday_data_for_student)

from apps.general.services.school_timing import add_school_timing
from apps.general.models.school_timing import SchoolTiming, SchoolTimingParent
from apps.shared.services import SharedService, ApprovalService

class EventTypeViewSet(viewsets.ModelViewSet):
    serializer_class = EventTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = EventType.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_data(self, request.data['event_types'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(event_type__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class EventViewSet(viewsets.ModelViewSet):
    serializer_class = EventSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Event.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_event(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_event(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = EventGetSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = EventGetSerializer
        response = SharedService.read_data(self, True)
        return Response(response)


class HolidayCalenderViewSet(viewsets.ModelViewSet):
    serializer_class = HolidayCalenderSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['financial_year']

    def get_queryset(self):
        self.queryset = HolidayCalender.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_holiday(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_holiday(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_holiday(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class HolidayPlanViewSet(viewsets.ModelViewSet):
    serializer_class = HolidayPlanSerializer
    http_method_names = ['post', 'put', 'delete', 'get']
    filterset_fields = ['is_active', 'academic_year']

    def get_queryset(self):
        self.queryset = HolidayPlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_holiday_plan(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_holiday_plan(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

class HolidayCalenderForStudentViewSet(viewsets.ModelViewSet):
    serializer_class = HolidayCalenderForStudentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = HolidayCalenderStudent.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_holiday_for_student(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_holiday_for_student(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_holiday_for_student(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        calender_response = {
            'id': response['data']['id'],
            'academic_year' : response['data']['academic_year'],
            'from_date' : response['data']['from_date'],
            'to_date' : response['data']['to_date'],
            'document_list' : response['data']['document_list'],
            'reason': response['data']['reason'],
            'calender_plan' :response['data']['holiday_plan'],
        }
        documents_list=[]
        for documents in response['data']['document_list']:
            if documents['is_active']:
                documents_list.append(documents)
        calender_response['document_list']=documents_list
        if response['data']['holiday_type'] == 1:
            calender_response['calender_type'] = "holiday"
        if response['data']['holiday_type'] == 2:
            calender_response['calender_type'] = "event"
        response_data ={'data':calender_response}
        return Response(response_data)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('download_pdf'):
            response = read_holiday_data_for_student(self, True)
            return response
        response = read_holiday_data_for_student(self)
        return Response(response)

class SchoolTimingViewSet(viewsets.ModelViewSet):
    serializer_class = SchoolTimingParentReadSerializer
    http_method_names = ['post', 'get', 'put', 'delete']
    filterset_fields = ['academic_year']

    def get_queryset(self):
        self.queryset = SchoolTimingParent.objects.all()
        return self.queryset

    def create(self, request):
        response = add_school_timing(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if not self.request.GET.get('academic_year'):
            raise exceptions.ValidationError('academic_year is Mandatory')
        standard_section_mapping = StandardSectionMapping.objects.filter(academic_year=self.request.GET.get('academic_year')).values(
            'id', 'standard'
        )
        standard_section_mapping_count = {}
        for standard in standard_section_mapping:
            if standard['standard'] not in standard_section_mapping_count:
                standard_section_mapping_count[standard['standard']] = 0
            standard_section_mapping_count[standard['standard']] += 1
        for temp in response['data']:
            standard_section_mapping_data = {}
            standard_section_details = StandardSectionMapping.objects.filter(
                id__in=temp['standard_section_ids'].split(',')
            )
            standard_section_data = StandardSectionMappingSerializer(standard_section_details, many=True)
            for standard_section in standard_section_data.data:
                if standard_section['standard'] not in standard_section_mapping_data:
                    standard_section_mapping_data[standard_section['standard']] = {
                        'section_list': [], 'total_sections': standard_section_mapping_count[standard_section['standard']],
                        'standard': standard_section['standard'], 'standard_name': standard_section['standard_name'],
                        'sequence': standard_section['standard_sequence']
                    }
                standard_section_mapping_data[standard_section['standard']]['section_list'].append(standard_section)
            temp['standard_section_data'] = sorted(standard_section_mapping_data.values(), key=lambda d: d['sequence'])
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        temp =  SharedService.read_data(self)
        temp = temp['data']
        academic_year = temp['academic_year']
        standard_section_mapping = StandardSectionMapping.objects.filter(academic_year=academic_year).values(
            'id', 'standard'
        )
        standard_section_mapping_count = {}
        for standard in standard_section_mapping:
            if standard['standard'] not in standard_section_mapping_count:
                standard_section_mapping_count[standard['standard']] = 0
            standard_section_mapping_count[standard['standard']] += 1
        standard_section_mapping_data = {}
        standard_section_details = StandardSectionMapping.objects.filter(
            id__in=temp['standard_section_ids'].split(',')
        )
        standard_section_data = StandardSectionMappingSerializer(standard_section_details, many=True)
        for standard_section in standard_section_data.data:
            if standard_section['standard'] not in standard_section_mapping_data:
                standard_section_mapping_data[standard_section['standard']] = {
                    'section_list': [], 'total_sections': standard_section_mapping_count[standard_section['standard']],
                    'standard': standard_section['standard'], 'standard_name': standard_section['standard_name']
                }
            standard_section_mapping_data[standard_section['standard']]['section_list'].append(standard_section)
        temp['standard_section_data'] = standard_section_mapping_data.values()
        return Response({'data': temp})

    def destroy(self, request, *args, **kwargs):
        SchoolTiming.objects.filter(
            school_timing_parent=self.kwargs['pk']
        ).delete()
        SchoolTimingParent.objects.filter(
            id=self.kwargs['pk']
        ).delete()
        return Response({'Reason': 'Data Delted Successfully'})
    
class CalenderTypeViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        data={
        "calender_type_list":[
        {
        "label":"Holiday",
        "name":"holiday"
        },
        {"label":"Event",
        "name":"event"
        }]}
        return Response({'data':data })