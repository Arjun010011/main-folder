import datetime
from django.db.models import Q
from apps.institutes.models import institute
from apps.institutes.models.institute import Institute
from apps.shared.services_shared.common import get_selected_template
from rest_framework import exceptions
from apps.classes.models.enrollment import StudentStandardMapping

from apps.general.models import HolidayCalender
from apps.institutes.models import AcademicYear
from apps.general.models.holidayCalender import HolidayCalenderStudent, EventImageMapping,HolidayPlan
from apps.general.serializers import HolidayCalenderForStudentSerializer, HolidayCalenderSerializer, EventDocumentMappingSerializer
from apps.hr.models import StaffLeaveDates, StaffLeaves
from apps.shared.services import PDFService, SharedService, ConfigurationService, ApprovalService
from apps.classes.models import StandardSectionMapping
from apps.shared.constants import STUDENT_GROUP

def holiday_validation(self, data, update=False):
    response = {'Reason': {}}
    if data['from_date'] > data['to_date']:
        raise exceptions.ValidationError('Incorrect date range!')
    if StaffLeaveDates.objects.filter(fordate__gte=data['from_date'], fordate__lte=data['to_date']):
        raise exceptions.ValidationError('Unable to add Holiday!')
    holidays = HolidayCalender.objects.filter(
        Q(from_date__gte=data['from_date'], from_date__lte=data['to_date']) |
        Q(to_date__gte=data['from_date'], to_date__lte=data['to_date'])).order_by('from_date')
    if update:
        holidays = holidays.exclude(id=self.kwargs['pk'])
    if holidays:
        serializer = HolidayCalenderSerializer(holidays, many=True)
        for row, data in enumerate(serializer.data):
            response['Reason'].update(
                {row: f"Holiday {data['reason']} has conflicts! from {data['from_date']} to {data['to_date']}"})
        raise exceptions.ValidationError(response)
    return True


def add_holiday(self, data):
    for holiday in data['holidays']:
        holiday.update({'financial_year': data['financial_year']})
        holiday_validation(self, holiday)
    response = SharedService.add_data(self, data['holidays'])
    return response


def update_holiday(self, data, **kwargs):
    if holiday_validation(self, data, True):
        response = SharedService.update_data(self, data, **kwargs)
        return response


def delete_holiday(self):
    data = self.get_object()
    dates = SharedService.get_for_date_from_date_range(data.from_date, data.to_date)
    for date in dates:
        if StaffLeaves.objects.filter(applied_from_date__lte=date, applied_to_date__gte=date):
            raise exceptions.ValidationError('Unable to delete Holiday!')
    if data.delete():
        return {'Reason': 'Data deleted successfully!'}
    raise exceptions.ValidationError('Unable to delete the data!')

def holiday_validation_for_student(self, data, update=False):
    response = {'Reason': {}}
    if data['from_date'] > data['to_date']:
        raise exceptions.ValidationError('Incorrect date range!')
    holidays = HolidayCalenderStudent.objects.filter(
        Q(from_date__gte=data['from_date'], from_date__lte=data['to_date']) |
        Q(to_date__gte=data['from_date'], to_date__lte=data['to_date'])).order_by('from_date')
    if update:
        holidays = holidays.exclude(id=self.kwargs['pk'])
    # if holidays:
    #     serializer = HolidayCalenderForStudentSerializer(holidays, many=True)
    #     for row, data in enumerate(serializer.data):
    #         response['Reason'].update(
    #             {row: f"{data['reason']} has conflicts! from {data['from_date']} to {data['to_date']}"})
    #     raise exceptions.ValidationError(response)
    return True

def add_holiday_for_student(self, data):
    for calender in data['calender_list']:
        temp_calender={'reason':calender['reason'],'from_date':calender['from_date'],'to_date':calender['to_date'],
                       'academic_year_id': data['academic_year'],'holiday_plan_id':data['calender_plan']}
        if data['calender_type'] == "holiday":
            temp_calender['holiday_type']=1
        if data['calender_type'] == "event":
            temp_calender['holiday_type']=2
        holiday_validation_for_student(self, temp_calender)
        doc_calender = HolidayCalenderStudent.objects.create(**temp_calender)
        if 'document_list' in calender and calender['document_list']:
            add_or_update_event_document(doc_calender.id, calender['document_list'])
    return {'data':'data added sucessfully'}


def update_holiday_for_student(self, data, **kwargs):
    if holiday_validation_for_student(self, data, True):
        data['holiday_plan'] = data['calender_plan']
        if data['calender_type'] == "holiday":
            data['holiday_type'] = 1
        if data['calender_type'] == "event":
            data['holiday_type'] = 2
        response = SharedService.update_data(self, data, **kwargs)
        instance = self.get_object()
        if 'document_list' in data and data['document_list']:
            deletable_document_list = []
            if 'deletable_document_list' in data and data['deletable_document_list']:
                deletable_document_list = data['deletable_document_list']
            add_or_update_event_document(instance.id, data['document_list'], deletable_document_list)
        return response

def delete_holiday_for_student(self):
    data = self.get_object()
    dates = SharedService.get_for_date_from_date_range(data.from_date, data.to_date)
    for date in dates:
        if StaffLeaves.objects.filter(applied_from_date__lte=date, applied_to_date__gte=date):
            raise exceptions.ValidationError('Unable to delete Holiday!')
    if data.delete():
        return {'Reason': 'Data deleted successfully!'}
    raise exceptions.ValidationError('Unable to delete the data!')

def validate_holiday_plan(self, data, is_update=True):
    if len(data['standard']) != len(set(data['standard'])):
        raise exceptions.ValidationError('Duplicate standards found!')
    standardSection = SharedService.get_standard_section_for_acdemic_year_standard(self,data['academic_year'],data['standard'])
    if len(standardSection) != len(set(data['standard'])):
        raise exceptions.ValidationError('Standard is not present in the academic year!')
    queryset = self.get_queryset().filter(is_active=True, academic_year=data['academic_year'])
    if is_update:
        queryset = queryset.exclude(id=self.kwargs['pk'])
    if queryset.filter(standard__in=data['standard']).exists():
        raise exceptions.ValidationError('Standard(s) is already exist(s) in the academic year.')

def add_holiday_plan(self, data):
    validate_holiday_plan(self, data, False)
    serializer = self.get_serializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Data added Successfully!'}

def update_holiday_plan(self, data, **kwargs):
    validate_holiday_plan(self, data)
    response = SharedService.update_data(self, data, **kwargs)
    return response

def add_or_update_event_document(calender_id, document_list, deletable_document_list=[]):
    if deletable_document_list:
        EventImageMapping.objects.filter(id__in=deletable_document_list).update(is_active=False)
    for data in document_list:
        data['event_calender'] = calender_id
        data['image'] = data['document']
        if 'id' in data and data['id']:
            serializer = EventDocumentMappingSerializer(instance=EventImageMapping.objects.get(id=data['id']),data=data)
        else:
            serializer = EventDocumentMappingSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def read_holiday_data_for_student(self, download_pdf=False):
    calender_plan = self.request.GET.get('calender_plan')
    academic_year = self.request.GET.get('academic_year')
    user = self.request.user
    # group = user.groups.first().pk nikhil hardcode
    group = 1
    if group == STUDENT_GROUP:
        try:
            if not academic_year:
                academic_year = AcademicYear.get_academic_year_for_date(self, datetime.datetime.today(), True).id
        except:
            raise exceptions.ValidationError('Academic year not set for the current date')
        standard_obj = StudentStandardMapping.get_student_standard_for_academic_year(self,academic_year,user.student.pk)
        try:
            holiday_plan = HolidayPlan.objects.filter(academic_year=academic_year,standard=standard_obj['standard'], is_active=True).first()
        except:
            raise exceptions.ValidationError('Student is not enrolled to any class.')
        try:
            calender_plan = holiday_plan.id
        except:
            raise exceptions.ValidationError('Holiday plan is not set for this academic year.')
    filter_query={}
    response =[]
    if academic_year:
        filter_query['academic_year']= academic_year
    if calender_plan:
        filter_query['holiday_plan']= calender_plan
    if self.request.GET.get('calender_type') == 'holiday':
        filter_query['holiday_type']=1
    if self.request.GET.get('calender_type') == 'event':
        filter_query['holiday_type']= 2
    query_set = HolidayCalenderStudent.objects.filter(**filter_query).order_by('from_date')
    serializer = HolidayCalenderForStudentSerializer(query_set, many=True)
    for data in serializer.data:
        response_data={
            "id" :data['id'],
            "document_list" : data['document_list'],
            "from_date" : data['from_date'],
            "to_date" : data['to_date'],
            "reason" : data['reason'],
            "academic_year" : data['academic_year'],
            "calender_plan" : data['holiday_plan']
        }
        if data['holiday_type'] == 1:
            response_data['calender_type'] = "holiday"
        if data['holiday_type'] == 2:
            response_data['calender_type'] = "event"
        response.append(response_data)
    if download_pdf:
        default = 'default_holiday_event.html'
        selected_template, number_of_copies = get_selected_template(self, 'holiday_event', 'pdf', default)
        path = 'holiday_event/'+selected_template
        academic_year_obj = AcademicYear.objects.get(id=academic_year)
        format = "%d-%m-%Y"
        temp_data = {
                'data_list': response, 
                'institute': Institute.get_institute(self),
                'academic_year_start_date': academic_year_obj.start_date.strftime(format),
                'academic_year_end_date': academic_year_obj.end_date.strftime(format)
            }
        response = PDFService.receipt_new(self, temp_data, 'holiday_event', path,False)
        return response
    return {'data': response}
