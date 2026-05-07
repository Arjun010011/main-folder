import json
import PyPDF2
import tempfile
import os
import threading
import pdf2image
from datetime import datetime, timedelta, date
from apps.classes.models.standard import Standard
from apps.exams.models.marks import StudentMarkSectionWiseApproval
from apps.exams.models.result import StudentExamFinalResult
from apps.shared.models.counter import CounterStandardMapping
from apps.shared.models.custom_design_template import CustomDesignTemplateMap
from apps.shared.models.custom_design_template import CustomDesignTemplate
from apps.shared.models.counter_standard_section import CounterStandardSectionMapping
from apps.shared.models.custom import FormDefinition
from apps.classes.models.standard import Standard
from apps.shared.services_shared import custom_template_json_conversion
import pdfkit
from weasyprint import HTML, CSS
from pdf2image import convert_from_path
from zipfile import ZipFile
from playwright.sync_api import sync_playwright
from django.http import HttpResponse

import boto3
import shutil
from dateutil import relativedelta
from calendar import monthrange
import calendar
import re
from collections import defaultdict
import random
import string
import time


from django.contrib.contenttypes.models import ContentType
from django.core.paginator import Paginator, PageNotAnInteger, EmptyPage
from django.db import transaction
from django.http import HttpResponse
from django.template.loader import render_to_string
from rest_framework import exceptions
from storages.backends.s3boto3 import S3Boto3Storage
from weasyprint import HTML
from weasyprint.fonts import FontConfiguration
from django.conf import settings

from apps.classes.models import StandardSectionMapping
from apps.classes.models.enrollment import StudentStandardMapping
from apps.institutes.models import AcademicYear, FinancialYear
from apps.institutes.serializers import AcademicYearViewSerializer
from apps.notification.models.notification import NotificationApiConfiguration, NotificationVendor
from apps.shared.models.address import MapAddress
from apps.shared.models.approval import ApproveStatus
from apps.shared.models.configuration import Setting, SettingOverride
from apps.shared.models.fee_type_counter import CounterFeeTypeMapping, CounterMiscTypeMapping
from apps.shared.models.menu import Menu, Url
from apps.tenants.services.middlewares import get_current_db_name, set_db_for_router
from apps.students.models import StudentAddress,StudentDetails
from apps.shared.models import Caste,Category,Religion

from apps.institutes.models.institute import Institute
from apps.exams.models.exam import Exam
from apps.shared.models import Document, Counter
from apps.shared.models.custom_log import LogData
from apps.shared.serializers import CounterSerializer, DocumentSerializer, MapAddressSerializer, SettingOverrideSerializer

EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)
AWS_REGION_NAME = getattr(settings, 'AWS_REGION_NAME', None)
AWS_ACCESS_KEY_ID = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
AWS_SECRET_ACCESS_KEY = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
AWS_STORAGE_BUCKET_NAME = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)
AWS_S3_CUSTOM_DOMAIN = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
EDUBRICZ_SIGNUP_COMMUNICATION_KEY = getattr(settings, 'EDUBRICZ_SIGNUP_COMMUNICATION_KEY', None)
NOTIFICATION_BACKEND_COMMUNICATION = getattr(settings, 'NOTIFICATION_BACKEND_COMMUNICATION', None)
USE_S3_STORAGE = getattr(settings, 'USE_S3_STORAGE', True)

class SharedService(object):

    @staticmethod
    def add_data(self, data, isList=True):
        if isList:
            serializer = self.get_serializer(data=data, many=isList, allow_empty=False)
        else:
            serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return {'Reason': 'Data added Successfully!', 'data': serializer.data}

    @staticmethod
    def update_data(self, data, **kwargs):
        partial = kwargs.pop('partial', False)
        if 'customObject' in kwargs: #customobject function
            instance = kwargs['customObject'](data['id']) #when update is used for multiple models in same view
        elif 'customObjectData' in kwargs: #customobject
            instance = kwargs['customObjectData']
        else:
            instance = self.get_object()
        serializer = self.get_serializer(instance=instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return {'Reason': 'Data updated Successfully!', 'data': serializer.data}

    """ Add Or Update the  List of dict datas
        returns only last inserted data
    """

    @staticmethod
    def add_or_update_data(self, data, **kwargs):
        with transaction.atomic(using=get_current_db_name()):
            for listData in data:
                if 'id' in listData:
                    self.kwargs['pk'] = listData['id']
                    response = SharedService.update_data(self, listData, **kwargs)
                else:
                    response = SharedService.add_data(self, listData, False)
        return response

    @staticmethod
    def update_counter(self, data, **kwargs):
        dataList = list()
        for value in data:
            if 'id' not in value:
                raise exceptions.ValidationError('id is required.')
            self.kwargs['pk'] = value['id']
            instance = self.get_object()
            if int(instance.value) > 1:
                raise exceptions.ValidationError(f'Cannot update {instance.alias_name}. Since value is incremented.')
            dataList.append({'id': value['id'], 'prefix': value['prefix'], 'postfix': value['postfix']})
        with transaction.atomic(using=get_current_db_name()):
            for value in data:
                self.kwargs['pk'] = value['id']
                SharedService.update_data(self, value, **kwargs)
        return {'Reason': 'Data Saved Successfully'}

    @staticmethod
    def soft_delete_data(self):
        self.queryset.update(is_active=False)  # After assigning queryset this function is called
        return {'Reason': 'Data Deleted Successfully!'}

    @staticmethod
    def soft_delete_list_data(self, data, *args, **kwargs):
        if not data:
            raise exceptions.ValidationError('No data is selected to delete.')
        self.get_queryset().filter(id__in=data).update(is_active=False)
        return {'Reason': 'Data deleted Successfully!'}

    @staticmethod
    def read_data(self, isList=False):
        if isList:
            queryset = self.filter_queryset(self.get_queryset())
        else:
            queryset = self.get_object()
        serializer = self.get_serializer(queryset, many=isList)
        return {'data': serializer.data}
    
    @staticmethod
    def datetime_to_obj(d):
        return datetime.strptime(d, "%Y-%m-%dT%H:%M:%S")
    
    @staticmethod
    def get_standard_suffix_data(self):
        standard_data = Standard.objects.all().values()
        standard_suffix_data={}
        for standard in standard_data:
            if 'Standard' in standard['name']:
                if standard['name'] == 'Standard 1':
                    standard_suffix_data[standard['id']] = '1st std'
                elif standard['name'] == 'Standard 2':
                    standard_suffix_data[standard['id']] = '2nd std'
                elif standard['name'] == 'Standard 3':
                    standard_suffix_data[standard['id']] = '3rd std'
                elif standard['name'] == 'Standard 4' or standard['name'] == 'Standard 5' or standard['name'] == 'Standard 6' \
                    or standard['name'] == 'Standard 7' or standard['name'] == 'Standard 8' or standard['name'] == 'Standard 9' \
                    or standard['name'] == 'Standard 10':
                    standard_suffix_data[standard['id']] = standard['name'].replace('Standard','')+'th std'
                else:
                    standard_suffix_data[standard['id']] = standard['name']
            else:
                standard_suffix_data[standard['id']] = standard['name']
        return standard_suffix_data

    @staticmethod
    def read_data_paginated(self, isList=False):
        queryset = self.filter_queryset(self.get_queryset())
        data, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        serializer = self.get_serializer(data, many=isList)
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': serializer.data}}

    @staticmethod
    def is_json(myjson):
        try:
            json.loads(myjson)
        except ValueError:
            return False
        return True

    @staticmethod
    def check_all_dictvalues_not_emp_or_none(data):
        return any((not (x is None) and str(x).strip() != "") for x in data.values())

    @staticmethod
    def get_active_data(requestData):
        try:
            return requestData['is_active']
        except:
            return True

    # eg: [{'a':1,'b':1},{'a':2,'b':1}] duplicate (b:1) returns False for duplicate
    @staticmethod
    def duplicate_list_two_objects(data, column1, column2, reason='Duplicate Values Found'):
        testdata = {}
        for rowData in data:
            if rowData[column1] in testdata:
                if rowData[column2] in testdata[rowData[column1]]:
                    if reason != 'Duplicate Values Found':
                        raise exceptions.ValidationError(f'{reason} {rowData[column1].strftime("%Y/%m/%d")}')
                    raise exceptions.ValidationError(reason)
                else:
                    testdata[rowData[column1]].append(rowData[column2])
            else:
                testdata[rowData[column1]] = []
                testdata[rowData[column1]].append(rowData[column2])

    @staticmethod
    def duplicate_list_three_objects(data, column1, column2, column3):
        response = {'Result': True, 'Reason': ''}
        testdata = {}
        for i in data:
            if i[column1] in testdata:
                if i[column2] in testdata[i[column1]]:
                    if i[column3] in testdata[i[column1]][i[column2]]:
                        response['Result'] = False
                        response['Reason'] = "Duplicate values found"
                        return response
                    else:
                        testdata[i[column1]][i[column2]].append(i[column3])
                else:
                    testdata[i[column1]][i[column2]] = []
                    testdata[i[column1]][i[column2]].append(i[column3])
            else:
                testdata[i[column1]] = {}
                testdata[i[column1]][i[column2]] = []
                testdata[i[column1]][i[column2]].append(i[column3])
        return response

    @staticmethod
    def duplicate_list_four_objects(data):

        testdata = list()
        for i in data:
            dataList = str(i)
            if dataList in testdata:
                raise exceptions.ValidationError('Duplicate values found!')
            testdata.append(dataList)
        return True

    @staticmethod
    def duplicate_list_one_object(data, col):
        if len(data) != len(list({val[col]: val for val in data}.values())):
            raise exceptions.ValidationError(f'Duplicate values Found in {col}')

    @staticmethod
    def is_active_name_unique_data(self, data):
        return self.get_queryset().filter(is_active=True).filter(name__in=[val['name'] for val in data])

    @staticmethod
    def add_minutes_to_time(self, time, minutes):
        x = datetime.combine(date.min, time) - datetime.min
        return SharedService.time_to_obj(str(x + timedelta(0, minutes * 60)))

    @staticmethod
    def subtract_minutes_to_time(self, time, minutes):
        x = datetime.combine(date.min, time) - datetime.min
        return SharedService.time_to_obj(str(x - timedelta(0, minutes * 60)))

    @staticmethod
    def date_to_obj(d):
        return datetime.strptime(d, "%Y-%m-%d").date()

    @staticmethod
    def time_to_obj(d):
        return datetime.strptime(d, "%H:%M:%S").time()

    @staticmethod
    def get_time_difference_from_two_time(time1, time2, date_time_format):
        return datetime.strptime(time2.strftime(date_time_format), date_time_format) - datetime.strptime(time1.strftime(date_time_format), date_time_format)

    @staticmethod
    def get_time_string_difference(time1, time2, date_time_format='%H:%M:%S'):
        if time1 > time2:
            return (datetime.strptime(time1, date_time_format) - datetime.strptime(time2, date_time_format)).total_seconds() / 60.0
        return (datetime.strptime(time2, date_time_format) - datetime.strptime(time1, date_time_format)).total_seconds() / 60.0

    @staticmethod
    def get_month_difference_for_two_dates(date1, date2):
        return (date1.year - date2.year) * 12 + (date1.month - date2.month)

    @staticmethod
    def get_day_for_date(d):
        return calendar.day_name[datetime.strptime(d, "%Y-%m-%d").weekday()]

    @staticmethod
    def check_all_dictvalues_not_emp_in_list(data):
        for row in data:
            if SharedService.check_all_dictvalues_not_emp_or_none(row):
                return True
        return False

    @staticmethod
    def delete_unrefered_data(self, filter_query, errorMsg='Cannot delete some instances of data are referenced.'):
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if queryset.filter(**filter_query):
            queryset.delete()
            return {'Reason': 'Data deleted successfully!'}
        raise exceptions.ValidationError(errorMsg)

    #if referred soft delete else hard delete
    @staticmethod
    def soft_delete_on_datareferred(self, filter_query, errorMsg='Data Deleted successfuly!'):
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if queryset.filter(**filter_query):
            queryset.delete()
        else:
            queryset.update(is_active=False)
        return {'Reason': errorMsg}

    @staticmethod
    def days_between(d1, d2):
        d1 = datetime.strptime(d1, "%Y-%m-%d")
        d2 = datetime.strptime(d2, "%Y-%m-%d")
        return abs((d2 - d1).days)

    @staticmethod
    def month_and_days_between(d1, d2):
        d1 = datetime.strptime(d1, "%Y-%m-%d")
        d2 = datetime.strptime(d2, "%Y-%m-%d")
        r = relativedelta.relativedelta(d2, d1)
        return r.months

    @staticmethod
    def last_day_of_month(date_value=None, both=False):
        if not date_value:
            date_value = datetime.today()
        value = monthrange(date_value.year, date_value.month)[1]
        if both:
            return value, date_value.replace(day=value)
        return date_value.replace(day=value)

    @staticmethod
    def first_day_of_currentmonth():
        today = datetime.today()
        return datetime(today.year, today.month, 1)

    """ eg: startdate= 10-10-2010, endate= 31-09-10, data  = [{"from_date: 08-01-2010}, {to_date: 09-10-2010},
                                                        {"from_date: 06-02-2010}, {to_date: 12-11-2010}]
    """

    @staticmethod
    def check_two_date_range_exist(startdate, enddate, data, datakey1="from_date", datakey2="to_date"):
        if (startdate > enddate):
            raise exceptions.ValidationError('Start Date is greater than End date')
        for dateRow in data:
            if (((dateRow[datakey1].strftime('%Y-%m-%d') <= startdate <= dateRow[datakey2].strftime(
                    '%Y-%m-%d'))
                 or (dateRow[datakey1].strftime('%Y-%m-%d') <= enddate <= dateRow[datakey2].strftime(
                        '%Y-%m-%d')))):
                raise exceptions.ValidationError(
                    f'Given range Already exist in range {str(dateRow[datakey1])} - {str(dateRow[datakey2])}')

    """ Accept date object"""

    @staticmethod
    def get_for_date_from_date_range(from_date, to_date,return_format_date=None):
        delta = to_date - from_date
        current_datetime_range = []
        for index in range(delta.days + 1):
            for_date = from_date + timedelta(days=index)
            if return_format_date:
                for_date = for_date.date()
            current_datetime_range.append(for_date)
        return current_datetime_range

    # returns arguments such that params which are not empty
    # eg: ['approval_status' , '']
    @staticmethod
    def custom_filterset_fields(self, params, queryset):
        arguments = {}
        for param in params:
            if self.request.GET.get(param, None):
                arguments[param] = self.request.GET.get(param)
        return queryset.filter(**arguments)

    """ +91 9880231011 -> +919880231011 or +91 98802-12012"""

    @staticmethod
    def mob_remove_space_after_extension(mobileNum):
        return re.sub(r'^(\+)|[^\n\d]', r'\1', mobileNum)

    @staticmethod
    def validate_india_mobile_num(mobileNum):
        return re.match("^((\+)?(\d{2}))?(\d{10}){1}?$", mobileNum)

    # raise validation
    @staticmethod
    def validate_india_mobile_number(mobileNum):
        if not re.match("^((\+)?(\d{2}))?(\d{10}){1}?$", mobileNum):
            raise exceptions.ValidationError(f'Invalid mobile number - {mobileNum}')

    @staticmethod
    def validate_bank_account_num(accountNum):
        if not re.match(r"[0-9]{9,18}", accountNum):
            raise exceptions.ValidationError(f'Invalid account number - {accountNum}')

    @staticmethod
    def validate_ifsc_code(ifscCode):
        if not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", ifscCode):
            raise exceptions.ValidationError(f'Invalid Ifsc code - {ifscCode}')

    @staticmethod
    def validate_pan_num(panNum):
        if not re.match(r"^([a-zA-Z]){5}([0-9]){4}([a-zA-Z]){1}?$", panNum):
            raise exceptions.ValidationError(f'Invalid pan number - {panNum}')

    @staticmethod
    def validate_pfnum(pfNum):
        if not re.match(r"^([A-Z]){5}([0-9]){12,18}?$", pfNum):
            raise exceptions.ValidationError(f'Invalid Pf Number - {pfNum}')

    @staticmethod
    def get_edubricz_header(self):
        try:
            user = str(self.request.user)
        except Exception as e:
            user = 'admin'
        return {
            'headers': {'user': user, 'Secret-Key': EDUBRICZ_SIGNUP_COMMUNICATION_KEY, 'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'}}

    @staticmethod
    def get_notification_header():
        return {
            'headers': {'Notification-Communitcation-Key': NOTIFICATION_BACKEND_COMMUNICATION, 'Content-Type': 'application/json',
                        'Cache-Control': 'no-cache'}}

    @staticmethod
    def send_email(subject, body, emailList):
        import boto3
        client = boto3.client('ses', region_name='ap-south-1')
        response = client.send_email(
            Destination={
                'ToAddresses': [
                    emailList,
                ],
            },
            Message={
                'Body': {
                    # 'Html': {
                    #     'Charset': 'UTF-8',
                    #     'Data': BODY_HTML,
                    # },
                    'Text': {
                        'Charset': 'UTF-8',
                        'Data': body,
                    },
                },
                'Subject': {
                    'Charset': 'UTF-8',
                    'Data': subject,
                },
            },
            Source='nsns003@gmail.com',
            # If you are not using a configuration set, comment or delete the
            # following line
        )

    # loops the mandatory fields and raise the error( list, list )
    @staticmethod
    def check_mandatory_field_in_list(mandatoryFields, data):
        for key in mandatoryFields:
            if key not in data or not data[key]:
                if key in data and (data[key] == '0' or data[key] == 0):
                    continue
                raise exceptions.ValidationError(f'{key} is mandatory')

    @staticmethod
    def validate_email(emailId):
        regex = '^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$'
        if not re.search(regex, emailId):
            raise exceptions.ValidationError(f'{emailId} - Invalid email ')

    @staticmethod
    def custom_pagination(self, data, limit=10, page_no=1):

        paginator = Paginator(data, limit)
        try:
            data = paginator.page(page_no)
        except PageNotAnInteger:
            data = paginator.page(1)
        except EmptyPage:
            data = paginator.page(paginator.num_pages)
        try:
            next_page = data.next_page_number()
        except:
            next_page = None
        try:
            previous_page = data.previous_page_number()
        except:
            previous_page = None
        return data.object_list, paginator.count, next_page, previous_page
        # return {'count': paginator.count, 'next': next_page, 'previous': previous_page, 'data_list': data.object_list}

    @staticmethod
    def get_religion_category_caste(self, filter):
        queryset = self.get_queryset().filter(is_active=True, **filter)
        serializer = self.get_serializer(queryset, many=True)
        return {'data': serializer.data}

    @staticmethod
    def time_is_between(self, time, startTime, endTime):
        if endTime < startTime:
            return time >= startTime or time <= endTime
        return startTime <= time <= endTime

    """
        [   {'from_range' : 10, 'to_range' : 20},
            {'from_range' : 15, 'to_range' : 18}
        ]
        Shows error that 2nd array comes in range of 10 - 20
    """

    @staticmethod
    def checkduplicate_range_exist(self, dataList, key1, key2, key3=''):
        for index, data in enumerate(dataList):
            if data[key1] > data[key2]:
                raise exceptions.ValidationError(f'{data[key1]} {key1} is greater than {data[key2]} ')
            for index1, data1 in enumerate(dataList):
                if index1 == index:
                    continue
                if (((data[key1] <= data1[key1] <= data[key2])
                     or (data[key1] <= data1[key2] <= data[key2]))):
                    raise exceptions.ValidationError(
                        f'Given Range {data[key1]} - {data[key2]} Already exist in range {data1[key1]} - {data1[key2]}  {"for " + data1[key3] if key3 else ""}')

    # l1 = [{"index":1, "b":2}, {"index":2, "b":3}, {"index":3, "green":"eggs"}]
    # l2 = [{"index":1, "c":4}, {"index":2, "c":5}]
    # [{'b': 2, 'c': 4, 'index': 1},
    #  {'b': 3, 'c': 5, 'index': 2},
    #  {'green': 'eggs', 'index': 3}]
    @staticmethod
    def merge_two_array_based_on_key(self, list1, list2, key):

        d = defaultdict(dict)
        for l in (list1, list2):
            for elem in l:
                d[elem[key]].update(elem)
        return d.values()

    @staticmethod
    def get_current_details_for_user(self):
        response = {'data': {}}
        today = datetime.today().date()
        academicYear = AcademicYear.get_academic_year_for_date(self, today, True)
        finance_enabled_academic_year = AcademicYear.get_finance_enabled_academic_year_for_date(self, today)
        financial_year = FinancialYear.get_financial_year_for_date(self, today, False, True)
        if financial_year:
            financial_year['name'] = f'{financial_year["start_date"].year}-{financial_year["end_date"].year}'
        response['data'] = {
            'academic_year': AcademicYearViewSerializer(academicYear).data,
            'finance_enabled_academic_year': AcademicYearViewSerializer(finance_enabled_academic_year).data,
            'financial_year': financial_year,
            'standard_details': None,
        }
        if not self.request.user.is_staff:
            standarstandard_datad_student_data = StudentStandardMapping.objects.filter(
                    academic_year=academicYear, student_id=self.request.user.student
                ).first()
            try:
                standardSection = StandardSectionMapping.objects.filter(
                                    enrollments__student=self.request.user.student,standard = standarstandard_datad_student_data.standard.id
                                ).order_by('-academic_year__start_date').first()
            except:
                standardSection = None
            if standardSection:
                response['data']['standard_details'] = {'standard_id': standardSection.standard.pk,
                                                        'standard_name': standardSection.standard.name,
                                                        'section_id': standardSection.section.pk,
                                                        'section_name': standardSection.section.name,
                                                        'standard_section_id': standardSection.id
                                                    }
            else:
                try:
                    response['data']['standard_details'] = {
                        'standard_id': standarstandard_datad_student_data.standard.id,  
                        'standard_name': standarstandard_datad_student_data.standard.name

                    }
                except:
                    pass
        return response

    @staticmethod
    def set_db_in_thread(callable_function, db, *args):
        set_db_for_router(db)
        callable_function(*args)

    @staticmethod
    def custom_thread(callable_function, *args):
        db = get_current_db_name()
        th = threading.Thread(target=SharedService.set_db_in_thread, args=(callable_function, db, *args))
        th.start()

    @staticmethod
    def generate_random_number():
        result = ''.join((random.choice(string.ascii_lowercase) for x in range(7)))
        result += str(int(time.time()))
        return result

    @staticmethod
    def _model_to_dict(instance):
        if instance is None:
            return None
        data = {}
        for field in instance._meta.fields:
            value = getattr(instance, field.name)
            if hasattr(value, 'pk'):
                data[field.name] = value.pk
            elif hasattr(value, 'isoformat'):
                data[field.name] = value.isoformat()
            elif isinstance(value, (int, float, str, bool, type(None))):
                data[field.name] = value
            else:
                try:
                    json.dumps(value)
                    data[field.name] = value
                except (TypeError, ValueError):
                    data[field.name] = str(value)
        return data

    @staticmethod
    def _get_client_ip(request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR')

    @staticmethod
    def add_to_log(view, request, response=None, model_class=None, pk=None, model_instance=None, action=None, related_changes=None):
        """
        Single unified logging function with multi-table support.
        
        Usage for single table:
            SharedService.add_to_log(view, request, response, FeeCollection, id, action='UPDATE')
        
        Usage for multiple tables:
            related = [
                {"model": "FeeCollectionModeOfPayment", "object_id": "1", "action": "DELETE", "previous_data": {...}},
                {"model": "FeeCollectionModeOfPayment", "object_id": "2", "action": "CREATE", "new_data": {...}}
            ]
            SharedService.add_to_log(view, request, response, FeeCollection, id, action='UPDATE', related_changes=related)
        """
        try:
            previous_data = None
            new_data = None
            instance = model_instance
            
            if model_class and pk:
                try:
                    instance = model_class.objects.get(pk=pk)
                    if action in ['UPDATE', 'DELETE']:
                        previous_data = SharedService._model_to_dict(instance)
                    if action == 'UPDATE':
                        instance.refresh_from_db()
                        new_data = SharedService._model_to_dict(instance)
                except model_class.DoesNotExist:
                    pass
            
            if action == 'CREATE' and instance:
                new_data = SharedService._model_to_dict(instance)
            
            log_data = {
                'user_id': request.user.pk,
                'request_method': request.method,
                'request_path': request.get_full_path(),
                'request_body_new': request.data if hasattr(request, 'data') else None,
                'response': str(response)[:1000] if response else None,
                'client_ip': SharedService._get_client_ip(request),
                'header': str(request.headers)[:1000],
                'previous_data': previous_data,
                'new_data': new_data,
                'action': action,
                'related_changes': related_changes,
            }
            
            if instance is not None:
                log_data['content_type'] = ContentType.objects.get_for_model(instance)
                log_data['object_id'] = str(instance.pk)
            
            LogData.objects.create(**log_data)
        except Exception as e:
            print(f"Logging error: {e}")
    
    @staticmethod
    def build_related_change(model_class_or_instance, object_id=None, action=None, previous_data=None, new_data=None):
        if hasattr(model_class_or_instance, '_meta'):
            instance = model_class_or_instance
            model_name = instance._meta.model.__name__
            obj_id = str(instance.pk)
            if action == 'DELETE' and previous_data is None:
                previous_data = SharedService._model_to_dict(instance)
            if action == 'CREATE' and new_data is None:
                new_data = SharedService._model_to_dict(instance)
        else:
            model_name = model_class_or_instance.__name__
            obj_id = str(object_id)
        
        return {
            "model": model_name,
            "object_id": obj_id,
            "action": action,
            "previous_data": previous_data,
            "new_data": new_data
        }

    """ Returns is student and user login same and returns is_student """
    @staticmethod
    def is_check_student_login_user_same(self, student_id):
        is_student = True if self.request.user.student else False
        if is_student and str(self.request.user.student.id) == str(student_id):
            return True, is_student
        return False, is_student

    @staticmethod
    def format_amount(amount):
        return "{:0,.2f}".format(float(amount))

    @staticmethod
    def ordinal(n: int):
        if 11 <= (n % 100) <= 13:
            suffix = 'th'
        else:
            suffix = ['th', 'st', 'nd', 'rd', 'th'][min(n % 10, 4)]
        return str(n) + suffix

    @staticmethod
    def months_between(start_date, end_date):
        """
        Given two instances of ``datetime.date``, generate a list of dates on
        the 1st of every month between the two dates (inclusive).

        e.g. "5 Jan 2020" to "17 May 2020" would generate:

            1 Jan 2020, 1 Feb 2020, 1 Mar 2020, 1 Apr 2020, 1 May 2020

        """
        if start_date > end_date:
            raise ValueError(f"Start date {start_date} is not before end date {end_date}")

        year = start_date.year
        month = start_date.month

        while (year, month) <= (end_date.year, end_date.month):
            yield date(year, month, 1)

            # Move to the next month.  If we're at the end of the year, wrap around
            # to the start of the next.
            #
            # Example: Nov 2017
            #       -> Dec 2017 (month += 1)
            #       -> Jan 2018 (end of year, month = 1, year += 1)
            #
            if month == 12:
                month = 1
                year += 1
            else:
                month += 1

    @staticmethod
    def month_names_list(from_date, to_date):
        from_date = datetime.strptime(from_date, '%Y-%m-%d')
        to_date = datetime.strptime(to_date, '%Y-%m-%d')
        return_month_names = []
        for month in SharedService.months_between(from_date, to_date):
            return_month_names.append(month.strftime('%b'))
        return return_month_names

    """
        here params defines what is the relationship for the table
        eg: standard__branch = 1
        params_should_look_like
        params = {
            'branch': standard__branch,
            'board': standard__board
        }
    """
    @staticmethod
    def add_branch_and_board_filter(self, filter_query, params):
        if self.request.GET.get('branch') and params['branch']:
            filter_query[params['branch']] = self.request.GET.get('branch')
        if self.request.GET.get('board') and params['board']:
            filter_query[params['board']] = self.request.GET.get('board')
        return filter_query

    @staticmethod
    def read_params_in_dict(self):
        data = {k:v[0] for k,v in dict(self.request.GET).items()}
        return data

    @staticmethod
    def get_gender_relate_and_her_him(gender):
        if gender=='Girl':
            student_relate='D/O'
            student_her_him='her'
            student_he_she='she'
            student_miss_master='miss'
            student_sri_kum = 'kum'
            student_sri_smt = 'smt'
            student_son_daughter = 'Daughter'
            student_identify = 'Kumari'
        else:
            student_relate='S/O'
            student_her_him='his'
            student_he_she='he'
            student_miss_master='master'
            student_sri_kum = 'sri'
            student_sri_smt = 'sri'
            student_son_daughter='Son'
            student_identify='Master'
        return {'student_relate': student_relate, 'student_her_him': student_her_him,'student_he_she':student_he_she,'student_miss_master':student_miss_master,'student_sri_kum':student_sri_kum,'student_sri_smt':student_sri_smt,'student_son_daughter':student_son_daughter,
                'student_relate_kumari/master':student_identify}

    def get_gender_male_or_female(gender):
        if gender=='Girl':
            student_gender='Female'
        else:
            student_gender='Male'
        return student_gender
    
    @staticmethod
    def append_string(data):
        str_data=''
        for each_data in data:
            if each_data:
                str_data += ' ' + each_data
        return str_data

    @staticmethod
    def get_caste_religion_category_nationality(self,student_ids):
        values=['student','caste__name','category__name','religion__name','nationality__name']
        student_caste_religion_category_nationality_dict={stu['student']:stu for stu in StudentDetails.objects.filter(student=student_ids).values(*values)}
        return student_caste_religion_category_nationality_dict

    @staticmethod
    def get_is_sc_st(self,student_ids):
        category_codename = StudentDetails.objects.filter(student=student_ids).values('category__codename')
        if category_codename[0]['category__codename'] == 'sc' or category_codename[0]['category__codename'] == 'st':
            return "YES"
        return "No"

    @staticmethod
    def get_standard_section_for_acdemic_year_standard(self,academic_year,standard):
        standardSection = StandardSectionMapping.objects.filter(academic_year=academic_year,
                                                            standard__in=standard).values_list('standard',flat=True).distinct()
        return standardSection

    @staticmethod
    def get_standard_and_section_name_using_standard_section(self,standard_section_ids):
        standard_section_ids_list=list(standard_section_ids)
        values=['id','standard__name','section__name']
        standard_section_dict={sta['id']:sta for sta in StandardSectionMapping.objects.filter(id__in=standard_section_ids_list).values(*values)}
        return standard_section_dict

    @staticmethod
    def number_to_roman(number):
        is_number=True
        try:
            number=int(re.sub("[^0-9]","",number))
        except:
            result = number
            is_number=False
        if is_number:
            roman_numerals = {
                1000: 'M', 900: 'CM', 500: 'D', 400: 'CD',
                100: 'C', 90: 'XC', 50: 'L', 40: 'XL',
                10: 'X', 9: 'IX', 5: 'V', 4: 'IV', 1: 'I'
            }
            result = ''
            for value, numeral in sorted(roman_numerals.items(), reverse=True):
                while number >= value:
                    result += numeral
                    number -= value
        return result

    @staticmethod
    def flatten_dict(d, parent_key='', separator='.'):
        items = {}
        for k, v in d.items():
            new_key = f"{parent_key}{separator}{k}" if parent_key else k
            if isinstance(v, dict):
                items.update(SharedService.flatten_dict(v, new_key, separator=separator))
            else:
                items[new_key] = v
        return items

    @staticmethod
    def flatten_list_of_dicts(list_of_dicts):
        flattened_list = []
        for d in list_of_dicts:
            flattened_list.append(SharedService.flatten_dict(d))
        return flattened_list

    @staticmethod
    def standard_section_name_using_standard_section_mappingid(list_of_standard_section_id):
        standard_section_dict={}
        standard_section_data = StandardSectionMapping.objects.filter(id__in=list_of_standard_section_id).values('standard__name','section__name','id')
        if standard_section_data:
            for standard_section in standard_section_data:
                if standard_section['id'] not in standard_section_dict:
                    standard_section_dict[standard_section['id']] = str(standard_section['standard__name'])+str(standard_section['section__name'])
        return standard_section_dict
    
    @staticmethod
    def format_vehicle_number(vehicle_number):
        clean_number = re.sub(r'[^A-Za-z0-9]', '', vehicle_number.upper())
        length = len(clean_number)

        if length == 8:
            return f"{clean_number[:2]} {clean_number[2:4]} {clean_number[4:]}"
        elif length == 9:
            return f"{clean_number[:2]} {clean_number[2:4]} {clean_number[4:5]} {clean_number[5:]}"
        elif length == 10:
            return f"{clean_number[:2]} {clean_number[2:4]} {clean_number[4:6]} {clean_number[6:]}"
        else:
            return vehicle_number

    def template_to_html(template_data, sample_data):
        MM_TO_PX = 3.779527  # accurate mm → px

        PAGE_SIZES_MM = {
            "A4": (210, 297),
            "A5": (148, 210),
            "A3": (297, 420),
            "letter": (216, 279),
            "legal": (216, 356),
        }

        def get_page_dimensions(template_data):
            page_size = template_data.get("pageSize", "").lower()

            if page_size in PAGE_SIZES_MM:
                return PAGE_SIZES_MM[page_size]

            # fallback to custom size
            return (
                template_data.get("pageWidthMm", 210),
                template_data.get("pageHeightMm", 297),
            )

        # -------------------------------
        # Helpers
        # -------------------------------
        def css(style_dict):
            return ";".join(
                f"{k}:{v}" for k, v in style_dict.items()
                if v not in (None, "", "auto")
            )

        def resolve_path(data, path):
            if not path:
                return []
            for key in path.split("."):
                if isinstance(data, dict):
                    data = data.get(key, [])
                else:
                    return []
            return data if isinstance(data, list) else []


        # -------------------------------
        # Shape Renderer
        # -------------------------------
        def render_shape(el):
            kind = el.get("shapeKind", "rect")

            width = el.get("width", 100)
            height = el.get("height", 100)

            border_width = el.get("borderWidth", 1)
            border_color = el.get("borderColor", "#000")

            bg = el.get("backgroundColor", "transparent")

            style = {
                "width": f"{width}px",
                "height": f"{height}px",
                "background-color": bg,
                "box-sizing": "border-box",
            }

            if kind == "line":
                style.update({
                    "height": f"{border_width}px",
                    "background-color": border_color,
                })

            elif kind == "circle":
                style.update({
                    "border": f"{border_width}px solid {border_color}",
                    "border-radius": "50%",
                })

            elif kind == "ellipse":
                style.update({
                    "border": f"{border_width}px solid {border_color}",
                    "border-radius": "50%",
                })
            else:  # rect
                style.update({
                    "border": f"{border_width}px solid {border_color}",
                    "border-radius": f"{el.get('borderRadius', 0)}px",
                })

            return f"<div style='{css(style)}'></div>"

        # -------------------------------
        # Element Renderer (recursive)
        # -------------------------------
        def render_element(el):
            el_type = el.get("type")

            # -------- ROW --------
            if el_type == "row":
                row_style = {
                    "display": "flex",
                    "flex-direction": "row",
                    "gap": f"{el.get('gap', 0)}px",
                    "width": "100%",
                    "align-items": el.get("alignItems", "stretch"),
                    "justify-content": el.get("justifyContent", "flex-start"),
                    "border-radius": f"{el.get('borderRadius', 0)}px",
                    "border-style": f"{el.get('borderStyle', 'solid')}",
                    "border-width": f"{el.get('borderWidth', 0)}px",
                    "border-color": f"{el.get('borderColor', '#000')}",
                    "border-radius": f"{el.get('borderRadius', 0)}px",
                    "border-style": f"{el.get('borderStyle', 'solid')}",
                    "border-width": f"{el.get('borderWidth', 0)}px",
                    "background-color": f"{el.get('backgroundColor', 'transparent')}",
                    "background-color": f"{el.get('backgroundColor', 'transparent')}",
                }

                html = f"<div style='{css(row_style)}'>"
                for child in el.get("children", []):
                    html += render_element(child)
                html += "</div>"
                return html

            # -------- SHAPE --------
            if el_type == "shape":
                return render_shape(el)

            if el_type == "label":
                label_style = {
                    "font-size": f"{el.get('fontSize', 12)}px",
                    "font-weight": f"{el.get('fontWeight', 'normal')}",
                    "color": f"{el.get('color', '#000')}",
                    "text-align": f"{el.get('textAlign', 'left')}",
                    "margin-left": f"{el.get('marginLeft', 0)}px",
                    "margin-top": f"{el.get('marginTop', 0)}px",
                    "padding": f"{el.get('padding', 0)}px",
                    "background-color": f"{el.get('backgroundColor', 'transparent')}",
                    "text-decoration": f"{el.get('textDecoration', 'none')}",
                    "font-family": f"{el.get('fontFamily', 'Arial')}",
                    "font-style": f"{el.get('fontStyle', 'normal')}",   
                    "border": f"{el.get('border', 0)}px solid {el.get('borderColor', '#000')}",
                    "border-radius": f"{el.get('borderRadius', 0)}px",
                    "border-style": f"{el.get('borderStyle', 'solid')}",
                    "border-width": f"{el.get('borderWidth', 1)}px",
                    "border-color": f"{el.get('borderColor', '#000')}",
                    "border-radius": f"{el.get('borderRadius', 0)}px",
                    "border-style": f"{el.get('borderStyle', 'solid')}",
                    "border-width": f"{el.get('borderWidth', 0)}px",
                }
                return f"<div style='{css(label_style)}'>{el.get('text', '')}</div>"
            if el_type == "image":
                image_style = {
                    "width": f"{el.get('width', 100)}px",
                    "height": f"{el.get('height', 100)}px",
                    "margin-left": f"{el.get('marginLeft', 0)}px",
                    "margin-top": f"{el.get('marginTop', 0)}px",
                }
                return f"<img src='{el.get('src', '')}' style='{css(image_style)}'>"

            if el_type == "value": 
                value_style = {
                    "font-size": f"{el.get('fontSize', 12)}px",
                    "font-weight": f"{el.get('fontWeight', 'normal')}",
                    "color": f"{el.get('color', '#000')}"
                }
                return f"<div style='{css(value_style)}'>{sample_data[el.get('dataPath','')]}</div>"

                
            if el_type == "table":
                table_css = el.get("styles", {})
                columns = el.get("columns", [])
                selected = el.get("selectedColumns", [])
                column_widths = el.get("columnWidthsPx", [])
                from collections import OrderedDict

                data = resolve_path(sample_data, el.get("dataPath"))

                # Convert OrderedDict list → normal dict list
                if isinstance(data, list):
                    data = [dict(item) if isinstance(item, OrderedDict) else item for item in data]



                # ---------------- table style ----------------
                table_style = {
                    "border-collapse": table_css.get("borderCollapse", "collapse"),
                    "table-layout": table_css.get("tableLayout", "fixed"),
                    "margin-left": f"{table_css.get('marginLeft', 0)}px",
                    "margin-top": f"{table_css.get('marginTop', 0)}px",
                    "width": f"{table_css.get('widthPx', el.get('width', 100))}px",
                    "background-color": table_css.get("backgroundColor"),
                    "font-family": table_css.get("fontFamily"),
                    "font-size": f"{table_css.get('fontSize', 14)}px",
                    "color": table_css.get("color"),
                    "border": f"{table_css.get('borderWidth', 0)}px "
                            f"{table_css.get('borderStyle', 'solid')} "
                            f"{table_css.get('borderColor', '#000')}",
                    "box-sizing": "border-box",
                }

                html = f"<table style='{css(table_style)}'>"

                # ---------------- header ----------------
                th_css = el.get("th", {})
                html += "<thead><tr>"

                for idx, col in enumerate(columns):
                    if selected and col["key"] not in selected:
                        continue

                    th_style = {
                        "padding": f"{th_css.get('padding', 4)}px",
                        "background-color": th_css.get("backgroundColor"),
                        "color": th_css.get("color"),
                        "font-weight": th_css.get("fontWeight"),
                        "font-size": f"{th_css.get('fontSize', 14)}px",
                        "text-align": th_css.get("textAlign"),
                        "border": f"{th_css.get('borderWidth', 0)}px "
                                f"{th_css.get('borderStyle', 'solid')} "
                                f"{th_css.get('borderColor', '#000')}",
                        "height": f"{th_css.get('height', 32)}px",
                        "width": f"{column_widths[idx]}px" if idx < len(column_widths) else "auto",
                        "box-sizing": "border-box",
                        "word-wrap": "break-word",
                    }

                    html += f"<th style='{css(th_style)}'>{col.get('label', '')}</th>"

                html += "</tr></thead>"

                # ---------------- body ----------------
                td_css = el.get("td", {})
                tr_css = el.get("tr", {})

                html += "<tbody>"

                for row in data:
                    tr_style = {
                        "height": f"{tr_css.get('height', table_css.get('rowHeightPx', 25))}px",
                    }
                    html += f"<tr style='{css(tr_style)}'>"

                    for idx, col in enumerate(columns):
                        if selected and col["key"] not in selected:
                            continue

                        td_style = {
                            "padding": f"{td_css.get('padding', 4)}px",
                            "background-color": td_css.get("backgroundColor"),
                            "color": td_css.get("color"),
                            "font-size": f"{td_css.get('fontSize', 14)}px",
                            "text-align": td_css.get("textAlign"),
                            "border": f"{td_css.get('borderWidth', 0)}px "
                                    f"{td_css.get('borderStyle', 'solid')} "
                                    f"{td_css.get('borderColor', '#000')}",
                            "border-radius": f"{td_css.get('borderRadius', 0)}px",
                            "height": f"{td_css.get('height', table_css.get('rowHeightPx', 25))}px",
                            "box-sizing": "border-box",
                            "word-break": "break-word",
                            "overflow": "hidden",
                        }

                        value = row.get(col["key"], "")
                        html += f"<td style='{css(td_style)}'>{value}</td>"

                    html += "</tr>"

                html += "</tbody></table>"
                return html


            # -------- SECTION (COLUMN) --------
            if el_type == "section":
                section_style = {
                    "display": "flex",
                    "flex-direction": "column",
                    "gap": f"{el.get('gap', 0)}px",
                    "width": "100%",
                }

                html = f"<div style='{css(section_style)}'>"
                for child in el.get("children", []):
                    html += render_element(child)
                html += "</div>"
                return html

            return ""

        # -------------------------------
        # Page size
        # -------------------------------
        width_mm, height_mm = get_page_dimensions(template_data)


        root = template_data.get("root", {})

        # -------------------------------
        # HTML Head
        # -------------------------------
        html = f"""
    <!DOCTYPE html>
    <html>
    <head>
    <meta charset="utf-8">
    <style>
    @page {{
        size: {width_mm}mm {height_mm}mm;
        margin: 0;
    }}

    html, body {{
        width: {width_mm}mm;
        height: {height_mm}mm;
        margin: 0;
        padding: 0;
    }}

    body {{
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }}

    .page {{
        width: {width_mm}mm;
        height: {height_mm}mm;
        background: {template_data.get("pageBg", "#fff")};
        box-sizing: border-box;
        padding: 0;
        background-image: url('{template_data.get("pageBackgroundImage", "")}');
        background-size: cover;
        background-position: center;
        background-repeat: no-repeat;
    }}
    * {{
        box-sizing: border-box;
    }}
    </style>
    </head>
    <body>
    <div class="page">
    """

        # -------------------------------
        # Render Root
        # -------------------------------
        html += render_element(root)

        html += """
    </div>
    </body>
    </html>
    """

        return html


    


    

    def prepare_pdf(data, key=None, template_data=None):
        sample_data =data
        if key and data:
            template_map = CustomDesignTemplateMap.objects.filter(
                key='new_fee_receipt'
            ).first()

            if not template_map:
                return False

                # This is the related CustomDesignTemplate object
            template_obj = template_map.template  
                # This is the template_data column from CustomDesignTemplate
            template_data = template_obj.template_data
            template_data = custom_template_json_conversion.serialize_template_data_for_backend(template_data)
        
        print(sample_data,'sample_data')
        html = SharedService.template_to_html(template_data, sample_data)
        PAGE_SIZES_MM = {
            "A4": (210, 297),
            "A5": (148, 210),
            "A3": (297, 420),
            "letter": (216, 279),
            "legal": (216, 356),
        }

        def get_page_dimensions(template_data):
            page_size = template_data.get("pageSize", "").lower()

            if page_size in PAGE_SIZES_MM:
                return PAGE_SIZES_MM[page_size]

            # fallback to custom size
            return (
                template_data.get("pageWidthMm", 210),
                template_data.get("pageHeightMm", 297),
            )

        page_width_mm, page_height_mm = get_page_dimensions(template_data)


        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()

            page.set_content(html, wait_until="load")

            pdf_bytes = page.pdf(
                width=f"{page_width_mm}mm",
                height=f"{page_height_mm}mm",
                margin={
                    "top": "0mm",
                    "right": "0mm",
                    "bottom": "0mm",
                    "left": "0mm",
                },
                print_background=True
            )

            browser.close()

        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = "inline; filename=template.pdf"
        return response



class FormdefinitionService(object):
    #from here i am converting custom migration to post migration for the formdefintion
    @staticmethod
    def add(self, formData):
        response = {'Result': False, 'Reason': 'Invalid request'}
        try:
            ids = []
            testdata = {}
            if formData['data']:
                for rowData in formData['data']:
                    if 'id' in rowData:
                        ids.append(rowData['id'])
                    rowData['form_name'] = formData['form_name']
                    if rowData['form_name'] in testdata:
                        if rowData['column_name'] in testdata[rowData['form_name']]:
                            response['Result'] = False
                            response['Reason'] = "Duplicate values Found"
                            return response
                        else:
                            testdata[rowData['form_name']].append(rowData['column_name'])
                    else:
                        testdata[rowData['form_name']] = []
                        testdata[rowData['form_name']].append(rowData['column_name'])
                idsToDelete = list(
                    self.get_queryset().filter(form_name=rowData['form_name']).exclude(id__in=ids).values_list('id',
                                                                                                               flat=True))
                response = SharedService.add_or_update_data(self, formData['data'])
                if response['Result']:
                    if idsToDelete:
                        self.get_queryset().filter(id__in=idsToDelete).delete()
                    response['Result'] = True
                    response['Reason'] = 'Data Added Successfully'
            else:
                response['Reason'] = 'formdata cannot be empty'
        except Exception as e:
            response['Reason'] = e.args()
        return response

    @staticmethod
    def get_formdefintion_data(self, form_name, column_name):
        #dont use self inside this function not safe because most of the function calls without self
        value = FormDefinition.objects.get(form_name=form_name, column_name=column_name).default_value
        if value.isnumeric():
            return int(value)
        return value
        
    @staticmethod
    def get_formdefinition_for_multiple_data(self, data):
        form_names = []
        col_names = []
        form_name_col_name_mapping = {}
        for row_data in data:
            form_names.append(row_data['form_name'])
            col_names.append(row_data['column_name'])
        value_data = FormDefinition.objects.filter(form_name__in=form_names, column_name__in=col_names).values()
        for row_value in value_data:
            if row_value['form_name'] not in form_name_col_name_mapping:
                form_name_col_name_mapping[row_value['form_name']] = {}
            form_name_col_name_mapping[row_value['form_name']][row_value['column_name']] = row_value
        for row_data in data:
            if row_data['form_name'] not in form_name_col_name_mapping:
                raise exceptions.ValidationError(f'formname {row_data["form_name"]} does not exist')
            if row_data['column_name'] not in form_name_col_name_mapping[row_data['form_name']]:
                raise exceptions.ValidationError(f'column_name {row_data["column_name"]} does not exist')
        return form_name_col_name_mapping

    @staticmethod
    def get_formdefinition_for_app(self):
        return FormDefinition.objects.filter(form_name__in=[
            'transport_configurations', 'dashboard_configuration'
        ]).values()

    @staticmethod
    def generate_time_stamp():
        return time.time()

class UploadTypeService(S3Boto3Storage):
    # company = Institute.objects.first()

    # location = f'{company.company_id}/'

    @staticmethod
    def set_bucket_folder_path(folderName=None):
        if not USE_S3_STORAGE:
            base_folder = 'local'
            try:
                institute = Institute.objects.first()
                if institute and institute.company_id:
                    base_folder = institute.company_id
            except Exception:
                pass
            UploadTypeService.location = f'{base_folder}/{folderName}' if folderName else f'{base_folder}/'
            return
        try:
            UploadTypeService.location = f'{Institute.objects.first().company_id}/{folderName}' if folderName else f'{Institute.objects.first().company_id}/'
        except Exception as e:
            print(e.args, 'e args')
            raise exceptions.ValidationError('Unable to setup AWS S3 Bucket!')

    @staticmethod
    def get_mb_from_b(b):
        return (b / 1024) / 1024

    @staticmethod
    def upload_file(self, data, update=False, path=None,document_obj=None):
        if self.request.GET.get('path', path):
            UploadTypeService.set_bucket_folder_path(self.request.GET.get('path', path))
        else:
            UploadTypeService.set_bucket_folder_path()
        fileSize = data['size'] = data['file'].size
        data['file_name'] = data['file'].name
        data['content_type'] = data['file'].content_type
        instance = None
        if update and document_obj:
            instance = document_obj
            fileSize -= instance.size
        elif update:
            instance = self.get_object()
            fileSize -= instance.size
        mb = UploadTypeService.get_mb_from_b(fileSize)
        from apps.institutes.services.resource import available_resource_check, update_resource_usage
        resource, total_usage = available_resource_check('S3BUCKET', mb)
        serializer = DocumentSerializer(data=data, instance=instance, partial=update)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        if update and document_obj and document_obj.file:
            document_obj.file.delete(save=False)
        update_resource_usage(resource, total_usage)
        return {'Reason': 'Data updated Successfully!', 'data': serializer.data}

    @staticmethod
    def upload_file_multiple(self, data_list, path=None):
        if self.request.GET.get('path', path):
            UploadTypeService.set_bucket_folder_path(self.request.GET.get('path', path))
        else:
            UploadTypeService.set_bucket_folder_path()
        file_size = 0
        total_mb = 0
        for key in data_list:
            total_mb += UploadTypeService.get_mb_from_b(data_list[key].size)
        from apps.institutes.services.resource import available_resource_check, update_resource_usage
        resource, total_usage = available_resource_check('S3BUCKET', total_mb)
        save_data = []
        for key in  data_list:
            temp_data = {}
            temp_data['size'] = data_list[key].size
            file_size += temp_data['size']
            temp_data['file_name'] = data_list[key].name
            temp_data['content_type'] = data_list[key].content_type
            temp_data['file'] = data_list[key]
            instance = None
            if 'id' in temp_data and temp_data['id']:
                instance = Document.objects.get(id=temp_data['id'])
                file_size -= instance.size
            if instance:
                serializer = DocumentSerializer(data=temp_data, instance=instance, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = DocumentSerializer(data=temp_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            save_data.append(serializer.data)
        update_resource_usage(resource, total_usage)
        return {'Reason': 'Data updated Successfully!', 'data': save_data}

    @staticmethod
    def upload_local_file(S3File_NAME, path=None):
        try:
            if path:
                UploadTypeService.set_bucket_folder_path(path)
            location = UploadTypeService.location
            if not USE_S3_STORAGE:
                target_dir = os.path.join(settings.MEDIA_ROOT, location)
                os.makedirs(target_dir, exist_ok=True)
                shutil.copy2(S3File_NAME, os.path.join(target_dir, os.path.basename(S3File_NAME)))
                return f'{settings.MEDIA_URL}{location}/{os.path.basename(S3File_NAME)}'

            s3 = boto3.resource('s3', aws_access_key_id=AWS_ACCESS_KEY_ID, aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
            s3.meta.client.upload_file(Filename=S3File_NAME, Bucket=AWS_STORAGE_BUCKET_NAME,
                                       Key=UploadTypeService.location + '/' + S3File_NAME)
        finally:
            try:
                os.remove(S3File_NAME)
            except:
                pass
        return f'https://{AWS_S3_CUSTOM_DOMAIN}/{location}/{S3File_NAME}'

    @staticmethod
    def make_document_active(documentId, isList=False):
        if isList:
            Document.objects.filter(id__in=documentId).update(is_active=True)
        else:
            Document.objects.filter(id=documentId).update(is_active=True)

    # @staticmethod
    # def get_file(self, upload_type_name='Default', table_pk=None):
    #     upload_details, created = UploadType.objects.get_or_create(name=upload_type_name)
    #     queryset = Document.objects.filter(upload_type=upload_details.id)
    #     if table_pk:
    #         queryset = queryset.filter(table=table_pk)
    #     serializer = DocumentSerializer(queryset, many=True)
    #     return {'data': serializer.data}

    # Return { 1: {documnet object} } -> 1 is document id
    def get_file_details(self, documentIds):
        queryset = Document.objects.filter(id__in=documentIds)
        serializer = DocumentSerializer(queryset, many=True)
        returnData = {}
        for data in serializer.data:
            if data['id'] not in returnData:
                returnData[data['id']] = {}
            returnData[data['id']] = data
        return returnData

    @staticmethod
    def get_file_list_from_folder(self, folder_path):
        s3_client = boto3.client('s3',
                              aws_access_key_id=AWS_ACCESS_KEY_ID,
                              aws_secret_access_key=AWS_SECRET_ACCESS_KEY)
        # Use the list_objects_v2 method to get the contents of the specified folder
        response = s3_client.list_objects_v2(Bucket=AWS_STORAGE_BUCKET_NAME, Prefix=folder_path)
        paths = []
        # Check if 'Contents' is in the response
        if 'Contents' in response:
            # Create a list to hold the paths
            for obj in response['Contents']:
                if folder_path == obj['Key']:
                    continue
                url = f"https://{AWS_STORAGE_BUCKET_NAME}.s3.{AWS_REGION_NAME}.amazonaws.com/{obj['Key']}"
                paths.append(url)
        return paths
        

class MenuService(object):
    DASHBOARD_ID = 1  # Uppercase for const variable
    menuCount = 1
    totalMenu = 0

    def validate_urls(self, data):
        path = []
        old_path = []
        for url in data:
            if url['path'] in path:
                raise exceptions.ValidationError(f'Duplicate path {url["path"]}')
            if url['old_path'] in old_path:
                raise exceptions.ValidationError(f'Duplicate old path {url["old_path"]}')
            path.append(url['path'])
            old_path.append(url['old_path'])

    @staticmethod
    def add_urls(self, data, update_data_on_migration=False, *args, **kwargs):
        if update_data_on_migration:
            queryset = Url.objects.all()
            MenuService.validate_urls(self, data)
            with transaction.atomic(using=get_current_db_name()):
                url = dict(queryset.exclude(id__in=[1, 2]).exclude(path=None).values_list('path', 'id'))
                for data_object in data:
                    if data_object['path'] in url:
                        del url[data_object['path']]
                    else:
                        obj, created = queryset.update_or_create(path=data_object['old_path'],
                                                                 defaults={'path': data_object['path'],
                                                                           'description': data_object['description'],
                                                                           'menu_name': data_object['menu_name'],
                                                                           'menu_type': data_object['menu_type']
                                                                           })
                        if not created:
                            del url[data_object['old_path']]
                menu = Menu.objects.all()
                MenuService.url_menu_chain_resolve(url.values(), menu)
                queryset.filter(id__in=url.values()).delete()
            return {'Reason': 'Data added Successfully!'}
        elif self.request.query_params.get('menus_list'):
            queryset = self.get_queryset()
            MenuService.validate_urls(self, data)
            with open('apps/users/services/url_map.py', 'w') as dict_file:
                dict_file.write('url_map = ' + json.dumps(data, indent=4))
            return {'Reason': 'Data updated successfully.'}
        else:
            return SharedService.add_data(self, data, False)

    @staticmethod
    def url_menu_chain_resolve(data, menu):
        for i in data:
            try:
                m = menu.get(url=i)
                if menu.filter(first_child=m.id):
                    menu.filter(first_child=m.id).update(first_child=m.next_menu)
                elif menu.filter(next_menu=m.id):
                    menu.filter(next_menu=m.id).update(next_menu=m.next_menu)
                m.delete()
            except:
                pass

    @staticmethod
    def enable_disable_urls(self, data, *args, **kwargs):
        queryset = self.get_queryset().exclude(id__in=[1, 2]).exclude(path=None)
        menu = Menu.objects.all()
        with transaction.atomic(using=get_current_db_name()):
            queryset.filter(id__in=data['enable']).update(is_enabled=True)
            queryset.filter(id__in=data['disable']).update(is_enabled=False)
            MenuService.url_menu_chain_resolve(data['disable'], menu)
        return {'Reason': 'Data updated Successfully!'}

    @staticmethod
    def add_menu(self, data):
        data['menu_type'] = Url.objects.get(id=data['url']).menu_type
        with transaction.atomic(using=get_current_db_name()):
            queryset = self.get_queryset().filter(menu_type=data['menu_type'])
            if data['module']:  # json 1 for main module else sub module
                data['next_menu'] = queryset.get(id=data['main_module_after']).next_menu
                serializer = self.get_serializer(data=data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                queryset.filter(id=data['main_module_after']).update(next_menu=serializer.data['id'])
            else:
                data['parent'] = data['main_module_after']
                if data['sub_module_after']:
                    data['next_menu'] = queryset.get(id=data['sub_module_after']).next_menu
                    serializer = self.get_serializer(data=data)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    queryset.filter(id=data['sub_module_after']).update(next_menu=serializer.data['id'])
                else:
                    data['next_menu'] = queryset.get(id=data['main_module_after']).first_child
                    serializer = self.get_serializer(data=data)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    queryset.filter(id=data['main_module_after']).update(first_child=serializer.data['id'])
        return {'data': serializer.data, 'Reason': 'Data added Successfully!'}

    @staticmethod
    def recursiveMenus(menu, id, menuCount, totalMenu):
        if menuCount > totalMenu:
            raise exceptions.ValidationError('Invalid Menu Structure!')
        if menu[id]['first_child']:
            menuCount += 1
            menuCount, totalMenu = MenuService.recursiveMenus(menu, menu[id]['first_child'], menuCount, totalMenu)
        if menu[id]['next_menu']:
            menuCount += 1
            menuCount, totalMenu = MenuService.recursiveMenus(menu, menu[id]['next_menu'], menuCount, totalMenu)
        return menuCount, totalMenu

    @staticmethod
    def TreeValidate(self, menus, menu_type='web'):
        id_list = []
        menus_dict = {}
        menu_count = 1 #by default web dashbaord id
        total_menu = len(menus)
        dashboard_id = 1
        if menu_type == 'app':
            dashboard_id = Menu.objects.get(url__menu_name='student_dashboard').id
        elif menu_type == 'staff_app':
            dashboard_id = Menu.objects.get(url__menu_name='staff_dashboard').id
        menu_queryset = {menu['id']: menu for menu in self.get_queryset().filter(menu_type=menu_type).values('id', 'alias_name', 'url')}
        urls = []
        for menu in menus:
            id_list.append(menu['id'])
            menus_dict.update({menu['id']: menu})
            if menu['alias_name'] != menu_queryset[menu['id']]['alias_name']:
                if self.get_queryset().filter(alias_name=menu['alias_name']):
                    raise exceptions.ValidationError(f'Menu Name {menu["alias_name"]} is already exists.')
                if Url.objects.filter(menu_name=menu['alias_name']):
                    raise exceptions.ValidationError(f'Menu Name {menu["alias_name"]} is already exists.')
                urls.append({'id': menu_queryset[menu['id']]['url'], 'menu_name': menu['alias_name']})
        # if menu['parent'] == 0
        if len(id_list) != len(set(id_list)):
            raise exceptions.ValidationError('Duplicate menus found!')
        menu_count, total_menu = MenuService.recursiveMenus(menus_dict, dashboard_id, menu_count, total_menu)
        if menu_count != total_menu:
            raise exceptions.ValidationError('Invalid Menu Structure!')
        return urls

    @staticmethod
    def update_menu(self, data, **kwargs):
        urls = MenuService.TreeValidate(self, data['menus'], data['menu_type'])
        partial = kwargs.pop('partial', False)
        with transaction.atomic(using=get_current_db_name()):
            for menu in data['menus']:
                menu['menu_type'] = data['menu_type']
                self.kwargs['pk'] = menu['id']
                instance = self.get_object()
                serializer = self.get_serializer(instance=instance, data=menu, partial=partial)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            for menu in urls:
                Url.objects.filter(id=menu['id']).update(menu_name=menu['menu_name'])
            if data['deletetable_ids']:
                for del_data in data['deletetable_ids']:
                    if_first_child = Menu.objects.filter(first_child=del_data).first()
                    if_next_menu = Menu.objects.filter(next_menu=del_data).first()
                    if if_first_child:
                        make_next_menu_as_first_child = Menu.objects.filter(id=del_data).values().first()
                        if_first_child.first_child = make_next_menu_as_first_child['next_menu']
                        if_first_child.save()
                    if if_next_menu:
                        make_next_menu_as_next_child = Menu.objects.filter(id=del_data).values().first()
                        if_next_menu.next_menu = make_next_menu_as_next_child['next_menu']
                        if_next_menu.save()
                self.get_queryset().filter(id__in=data['deletetable_ids']).delete()
        return {'Reason': 'Data updated Successfully!'}


class PDFService(object):

    """Please dont use this"""
    @staticmethod
    def receipt(self, data, filename, htmlfilename, localPath=False):
        html = render_to_string(htmlfilename, data)
        font_config = FontConfiguration()
        if localPath:
            path = filename + '.pdf'
        else:
            path = HttpResponse(content_type="application/pdf")
            path['Content-Disposition'] = f'inline; filename={filename}.pdf'
        HTML(string=html, base_url='.').write_pdf(path, font_config=font_config)
        return path

    @staticmethod
    def receipt_new(self, data, filename, htmlfilename, localPath=False, options=None):
        html = render_to_string(htmlfilename, data)
        pdfkit_options = options or {}
        if localPath:
            path = filename + '.pdf'
            pdfkit.from_string(html, path, options=pdfkit_options)
            with open(path, 'rb') as pdf:
                pdf_data = pdf.read()
            pdf.close()
        else:
            pdfkit.from_string(html, 'out.pdf', options=pdfkit_options)
            with open("out.pdf", 'rb') as pdf:
                pdf_data = pdf.read()
            path = HttpResponse(pdf_data,content_type="application/pdf")
            path['Content-Disposition'] = 'inline; filename='+filename+'.pdf'
            pdf.close()
            os.remove('out.pdf')
        print(path,'path')
        return path
    
    @staticmethod
    def graph_receipt(self, data, filename, htmlfilename, localPath=False):
        html_content = render_to_string(htmlfilename, data)
        pdf_filename = "Marks_Report.pdf"
        zip_filename = "Payment_Report.zip"

        options = {
            "page-size": "A4",
            "margin-top": "5mm",
            "margin-right": "5mm",
            "margin-bottom": "5mm",
            "margin-left": "5mm",
            "encoding": "UTF-8",
            "disable-smart-shrinking": None,
            "no-outline": None,
            "enable-local-file-access": None,
            "image-quality": "85",
        }

        pdfkit.from_string(html_content, pdf_filename, options=options)
        # with open(pdf_filename, 'rb') as pdf:
        #     pdf_data = pdf.read()
        # path = HttpResponse(pdf_data,content_type="application/pdf")
        # path['Content-Disposition'] = 'inline; filename='+pdf_filename


        def delayed_cleanup():
            time.sleep(30)
            if os.path.exists(pdf_filename):
                os.remove(pdf_filename)
            

        threading.Thread(target=delayed_cleanup, daemon=True).start()
        return pdf_filename
    
    @staticmethod
    def return_pdf_report(self, data, filename, htmlfilename, localPath=False,document_type=None):
        filename=filename.replace("/","_")
        html = render_to_string(htmlfilename, data)
        if not os.path.exists('report'):
            os.makedirs('report')
        val=[]
        data=HTML(string=html)
        doc=data.render()
        for p in doc.pages:
            val.append(p)
        path = os.path.join('report',filename+'.pdf')
        pdf_file = doc.copy(val).write_pdf(path) # use metadata of pdf11   
        if document_type == 'img':
            image_path_list=[]
            zip_path = os.path.join('report',filename + '.zip')
            images = convert_from_path(path, dpi=400)
            for i in range(len(images)):
                file_suffix = '_'+str(int(i/2))+'_front' if i % 2 == 0 else '_'+str(int(i/2))+'_back'
                image_path = os.path.join('report',filename+file_suffix+'.jpg')
                # Save pages as images in the 
                images[i].save(image_path, 'JPEG')
                image_path_list.append(image_path)
            with ZipFile(zip_path, 'w') as zipf:
                for im_path in image_path_list:
                    zipf.write(im_path)
            for image_path in image_path_list:
                if os.path.exists(image_path):
                    os.remove(image_path)
            if os.path.exists(path):
                os.remove(path)
            return zip_path
        return path  

   
    @staticmethod
    def id_card(self, data, filename, htmlfilename, localPath=False):
        html = render_to_string(htmlfilename, data)
        val=[]
        data=HTML(string=html)
        doc=data.render()
        for p in doc.pages:
            val.append(p)
        pdf_file = doc.copy(val).write_pdf() # use metadata of pdf11
        path = HttpResponse(pdf_file,content_type="application/pdf")
        path['Content-Disposition'] = 'inline; filename='+filename+'.pdf'
        return path

    @staticmethod
    def return_pdf_path(self, data, filename, htmlfilename, localPath=False,document_type=None):
        filename=filename.replace("/","_")
        html = render_to_string(htmlfilename, data)
        if not os.path.exists('idcard_temp'):
            os.makedirs('idcard_temp')
        val=[]
        data=HTML(string=html)
        doc=data.render()
        for p in doc.pages:
            val.append(p)
        path = os.path.join('idcard_temp',filename+'.pdf')
        pdf_file = doc.copy(val).write_pdf(path) # use metadata of pdf11   
        if document_type == 'img':
            image_path_list=[]
            zip_path = os.path.join('idcard_temp',filename + '.zip')
            images = convert_from_path(path, dpi=400)
            for i in range(len(images)):
                file_suffix = '_'+str(int(i/2))+'_front' if i % 2 == 0 else '_'+str(int(i/2))+'_back'
                image_path = os.path.join('idcard_temp',filename+file_suffix+'.jpg')
                # Save pages as images in the 
                images[i].save(image_path, 'JPEG')
                image_path_list.append(image_path)
            if len(image_path_list) == 1:
                if os.path.exists(path):
                    os.remove(path)
                return image_path_list[0]
            with ZipFile(zip_path, 'w') as zipf:
                for im_path in image_path_list:
                    zipf.write(im_path)
            for image_path in image_path_list:
                if os.path.exists(image_path):
                    os.remove(image_path)
            if os.path.exists(path):
                os.remove(path)
            return zip_path
        return path    
    
    # @staticmethod
    # def return_pdf_path(self, data, filename, htmlfilename, localPath=False,document_type=None):
    #     html = render_to_string(htmlfilename, data)
    #     if not os.path.exists('idcard_temp'):
    #         os.makedirs('idcard_temp')
    #     val=[]
    #     data=HTML(string=html)
    #     doc=data.render()
    #     for p in doc.pages:
    #         val.append(p)
    #     path = os.path.join('idcard_temp',filename+'.pdf')
    #     pdf_file = doc.copy(val).write_pdf(path) # use metadata of pdf11   
    #     if document_type == 'img':
    #         image_path_list=[]
    #         zip_path = os.path.join('idcard_temp',filename + '.zip')
    #         images = convert_from_path(path, dpi=1000)
    #         for i in range(len(images)):
    #             file_suffix = ''+str(int(i/2))+'_front' if i % 2 == 0 else ''+str(int(i/2))+'_back'
    #             image_path = os.path.join('idcard_temp',filename+file_suffix+'.jpg')
    #             # Save pages as images in the 
    #             images[i].save(image_path, 'JPEG')
    #             image_path_list.append(image_path)
    #         with ZipFile(zip_path, 'w') as zipf:
    #             for im_path in image_path_list:
    #                 zipf.write(im_path)
    #         for image_path in image_path_list:
    #             if os.path.exists(image_path):
    #                 os.remove(image_path)
    #         if os.path.exists(path):
    #             os.remove(path)
    #         return zip_path
    #     return path
   
    @staticmethod
    def two_receipt(self, data, filename, htmlfilename_list, localPath=False):
        # Initialize list for rendered HTML strings
        rendered_html_strings = []
        temp_pdf_files = []

        # Render each HTML template with the given data
        for template in htmlfilename_list:
            rendered_html_strings.append(render_to_string(template, data))

        for html_string in rendered_html_strings:
            # Create a temporary file for each PDF
            temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
            pdfkit.from_string(html_string, temp_pdf.name)
            temp_pdf_files.append(temp_pdf.name)

        # Combine all PDFs into one
        merger = PyPDF2.PdfMerger()
        for pdf_file in temp_pdf_files:
            merger.append(pdf_file)

        # Write the combined PDF to a final temporary file
        final_pdf = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
        merger.write(final_pdf.name)
        merger.close()

        # Read the combined PDF
        with open(final_pdf.name, 'rb') as f:
            pdf_file = f.read()

        # Cleanup temporary files
        for temp_pdf_file in temp_pdf_files:
            os.remove(temp_pdf_file)
        os.remove(final_pdf.name)

        # Create an HTTP response with the combined PDF
        http_response = HttpResponse(pdf_file, content_type='application/pdf')
        http_response['Content-Disposition'] = f'filename="{filename}"'

        return http_response

class CounterService(object):
    #'is_global_counter': True one counter for all the year
    #is_custom used when other tables are realted example fee tyep wise we store the data if is_custom enabled default values wont be
    COUNTERS = {
        'ADMISSION': {'type': 'admission', 'alias_name': 'Admission', 'standard': False, 'prefix': 'adm', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'APPLICATION': {'type': 'application', 'alias_name': 'Application', 'standard': False, 'prefix': 'appln', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'APPLICATION_RECEIPT': {'type': 'application_receipt', 'alias_name': 'Application Receipt', 'standard': False, 'prefix': 'appln_recipt', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'MISC_RECEIPT': {'type': 'misc_receipt', 'alias_name': 'Miscellaneous Receipt', 'standard': False, 'prefix': 'misc_recipt', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'FEE_RECEIPT': {'type': 'fee_receipt', 'alias_name': 'Fee Receipt', 'standard': False, 'prefix': 'receipt', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'ADMISSION_D': {'type': 'admission_d', 'alias_name': 'Admission Day Scholar', 'standard': True, 'prefix': 'D', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'ADMISSION_R': {'type': 'admission_r', 'alias_name': 'Admission Residential', 'standard': True, 'prefix': 'R', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'FUEL_TOKEN': {'type': 'fuel_token', 'alias_name': 'Fuel Token', 'standard': False, 'prefix': 'fueltoken', 'postfix': '', 'financial_year': True, 'is_global_counter': False, 'is_custom': False},
        'ONLINE_TRANSACTION': {'type': 'online_transaction', 'alias_name': 'Online Transactions', 'standard': False, 'prefix': 'OT', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'PAYOUT': {'type': 'payout', 'alias_name': 'Payout Reference', 'standard': False, 'prefix': 'PO', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'BENEFICIARY': {'type': 'beneficiary', 'alias_name': 'Beneficiary', 'standard': False, 'prefix': 'BEN', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'ONLINE_TRANSACTION_REFUND': {'type': 'refund', 'alias_name': 'Refund', 'standard': False, 'prefix': 'REF', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'INVENTORY': {'type': 'inventory', 'alias_name': 'Inventory', 'standard': False, 'prefix': 'store_', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom':False},
        'FEE_RECEIPT_FEE_TYPE': {'type': 'fee_receipt_fee_type', 'alias_name': 'Fee Receipt', 'standard': False, 'prefix': 'fee_receipt_', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': True}, #only for gurukula
        'APPLICATION_FEE_RECEIPT_OLD_STUDENT': {'type': 'application_reciept_old_student', 'alias_name': 'Application Fee Reciept Old Student', 'standard': False, 'prefix': 'appln_old_', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'APPLICATION_FEE_RECEIPT_NEW_STUDENT': {'type': 'application_reciept_new_student', 'alias_name': 'Application Fee Reciept New Student', 'standard': False, 'prefix': 'appln_new_', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'STUDY_CERTIFICATE_MISC': {'type': 'study_certificate_misc', 'alias_name': 'Study Certificate', 'standard': False, 'prefix': 'SCML', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False}, #add codename sc
        'TC_CERTIFICATE_MISC': {'type': 'tc_certificate_misc', 'alias_name': 'TC certificate Reciept', 'standard': False, 'prefix': 'TCML', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False}, #add codename tc to misc type then it works
        'EXPENSE': {'type': 'expense', 'alias_name': 'Expense Receipt', 'standard': False, 'prefix': 'EXP_', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'LIBRARY_FINE': {'type': 'library_fine', 'alias_name': 'Library Fine Receipt', 'standard': False, 'prefix': 'FINE_', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
        'ENQUIRY': {'type': 'enquiry', 'alias_name': 'Enquiry', 'standard': False, 'prefix': 'enq', 'postfix': '', 'financial_year': False, 'is_global_counter': False, 'is_custom': False},
        'GATE_PASS': {'type': 'gate_pass', 'alias_name': 'Gate Pass', 'standard': False, 'prefix': 'GP-', 'postfix': '', 'financial_year': False, 'is_global_counter': True, 'is_custom': False},
    }

    @staticmethod
    def get_prefix_postfix_year(start_date, end_date):
        year = f'{start_date.year}-{end_date.strftime("%y")}'
        prefix = f'{year}/'
        postfix = f'/{year}'
        return prefix, postfix

    @staticmethod
    def get_countered_value(self, key, standard=None, object_id=None, type_name=None, **kwargs):
        counter_digits = 3
        try:
            counter_digits_value = FormdefinitionService.get_formdefintion_data(
                self, 'counter_confgiruation', 'counter_value_format'
            )
            if counter_digits_value not in (None, ''):
                counter_digits = int(counter_digits_value)
        except Exception:
            counter_digits = 3
        if counter_digits < 1:
            counter_digits = 1
        if counter_digits > 5:
            counter_digits = 5

        if not type_name:
            type_name = CounterService.COUNTERS[key]['type']
        try:
            if standard:
                counter = Counter.objects.get(type=type_name, is_active=True,
                                              standard=standard, **kwargs)
            elif object_id:
                counter = Counter.objects.get(type=type_name, is_active=True, object_id=object_id,
                                              **kwargs)
            else:
                counter = Counter.objects.get(type=type_name, is_active=True,
                                              **kwargs)
            prefix = counter.prefix if counter.prefix else ''
            postfix = counter.postfix if counter.postfix else ''
            counter.value = f"{int(counter.value):0{counter_digits}d}"
        except Exception as e:
            raise exceptions.ValidationError(f'{CounterService.COUNTERS[key]["alias_name"]} counter is not set. {e.args}')
        return counter, prefix, postfix

    @staticmethod
    def increment_counter(self, counter):
        counter.value = int(counter.value) + 1
        counter.save()

    @staticmethod
    def get_fee_type_preview(object_id):
        from apps.finance.models.fee import FeeType
        fee_type_data = FeeType.objects.filter(id=object_id).first()
        return fee_type_data

    @staticmethod
    def handle_custom_counter(counter, custom_data, enabled_custom_data):
        if 'academic_year' not in custom_data:
            custom_data['academic_year'] = {}
        if 'financial_year' not in custom_data:
            custom_data['financial_year'] = {}
        counter['object_data'] = {
            'name': '' ,
            'id': None
        }
        if 'fee_receipt_fee_type' in enabled_custom_data and (counter['type'] == 'fee_receipt_fee_type' or
            counter['type'] == 'fee_receipt_fee_typeN' or counter['type'] == 'fee_receipt_fee_typeO'
        ):
            object_data = CounterService.get_fee_type_preview(counter['object_id'])
            counter['object_data']['id'] = object_data.id if object_data else ''
            counter['object_data']['name'] = object_data.name if object_data else ''
            if counter['academic_year']:
                if counter['type'] not in custom_data['academic_year']:
                    custom_data['academic_year'][counter['type']] = []
                custom_data['academic_year'][counter['type']].append(counter)
            elif counter['financial_year']:
                if counter['type'] not in custom_data['financial_year']:
                    custom_data['financial_year'][counter['type']] = []
                custom_data['financial_year'][counter['type']] = counter
            else:
                pass #dont handle if it is not in academic_year or financial_year
        else:
            pass
        return custom_data

    @staticmethod
    def get_counter_list(self):
        queryset = self.filter_queryset(self.get_queryset())
        setting_values = ConfigurationService.get_setting_values(['is_application', 'admission_in_reg'])
        if setting_values['is_application'] == '0':
            queryset = queryset.exclude(type__in=[CounterService.COUNTERS['APPLICATION']['type'],
                                                  CounterService.COUNTERS['APPLICATION_RECEIPT']['type']])
        if setting_values['admission_in_reg'] == '1':
            queryset = queryset.exclude(type=CounterService.COUNTERS['ADMISSION']['type'])
        else:
            queryset = queryset.filter(standard=None)
        serializer = self.get_serializer(queryset, many=True)
        academic_year = list()
        financial_year = list()
        standard = {}
        custom_data = {}
        enabled_custom_data = {}
        fee_receipt_fee_type = FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'fee_receipt_fee_type')
        if fee_receipt_fee_type:
            enabled_custom_data['fee_receipt_fee_type'] = {
                'name': 'fee_receipt_fee_type', 'value': fee_receipt_fee_type, 'module_name': 'Fee Collection'
            }
        temp_type_mapping = {}
        for temp in CounterService.COUNTERS.values():
            temp_type_mapping[temp['type']] = temp
        for data in serializer.data:
            if enabled_custom_data and data['type'] == 'fee_receipt_fee_typeO' or data['type'] == 'fee_receipt_fee_typeN' or (data['type'] in temp_type_mapping and temp_type_mapping[data['type']]['is_custom']):
                custom_data = CounterService.handle_custom_counter(data, custom_data, enabled_custom_data)
            elif data['standard']:
                if data['standard'] in standard:
                    standard[data['standard']]['counter_detail'].append(data)
                else:
                    standard.update({data['standard']: {'standard': data['standard'],
                                                        'standard_name': data['standard_name'],
                                                        'counter_detail': [data]}})
            elif data['financial_year']:
                financial_year.append(data)
            else:
                academic_year.append(data)
        return {'data': {   'academic_year': academic_year, 'financial_year': financial_year,
                            'standard': standard.values(), 'custom_data': custom_data
                        }
                }

    @staticmethod
    def create_counter_for_standard(standard_ids):
        standard_counters = Counter.objects.all()
        counter_data = []
        for name, value in CounterService.COUNTERS.items():
            if value['standard']:
                for academic in AcademicYear.objects.all().values('id'):
                    for standard_id in standard_ids:
                        if not standard_counters.filter(standard=standard_id, academic_year=academic['id'], type=value['type']):
                            counter_data.append(
                                {
                                    'type':value['type'], 'alias_name':value['alias_name'],
                                    'value':1, 'prefix':value['prefix'], 'postfix':value['postfix'],
                                    'standard': standard_id, 'academic_year': academic['id']
                                }
                            )
        if counter_data:
            serializer = CounterSerializer(data=counter_data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return {'Reason': 'saved'}

    @staticmethod
    def create_counter_from_standard_mapping():
        standard_counters = Counter.objects.all()
        counter_data = []
        counter_standard = {c['counter_type_name']+'_'+c['group_name']:c for c in CounterStandardMapping.objects.filter(is_active=True).values()}
        for counter_key in counter_standard:
            if not standard_counters.filter(academic_year=None, type=counter_key):
                counter_data.append({
                    'type': counter_key, 'alias_name': counter_key,
                    'value':1, 'prefix': '', 'postfix': '',
                    'standard': '', 'academic_year': None
                })
            for academic in AcademicYear.objects.all().values('id'):
                if not standard_counters.filter(academic_year=academic['id'], type=counter_key):
                    counter_data.append(
                        {
                            'type': counter_key, 'alias_name': counter_key,
                            'value':1, 'prefix': '', 'postfix': '',
                            'standard': '', 'academic_year': academic['id']
                        }
                    )
        if counter_data:
            serializer = CounterSerializer(data=counter_data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return {'Reason': 'saved'}
    
    @staticmethod
    def create_counter_from_standard_section_mapping():
        counters = {c['type']: c for c in Counter.objects.filter(
            is_active=True, 
        ).values('type')}
        counter_data = []
        counter_standard_section = {
            c['counter_type_name']+'_'+c['group_name']+'_standard_section'
            :c for c in CounterStandardSectionMapping.objects.filter(is_active=True).values(
                'counter_type_name', 'group_name', 'standard_section__academic_year', 'standard_section'
            )
        }
        for counter_key in counter_standard_section:
            if counter_key not in counters:
                counter_data.append({
                    'type': counter_key, 'alias_name': counter_key,
                    'value':1, 'prefix': '', 'postfix': '',
                    'standard_section': counter_standard_section[counter_key]['standard_section'], 
                    'academic_year': counter_standard_section[counter_key]['standard_section__academic_year']
                })
        if counter_data:
            serializer = CounterSerializer(data=counter_data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return {'Reason': 'saved'}

    @staticmethod
    def create_counter_from_fee_mapping():
        fee_counters = Counter.objects.all()
        counter_data = []
        counter_standard = {c['counter_type_name']+'_'+c['group_name']:c for c in CounterFeeTypeMapping.objects.filter(is_active=True).values()}
        for counter_key in counter_standard:
            if counter_standard[counter_key]['is_global']:
                if not fee_counters.filter(academic_year=None, type=counter_key):
                    counter_data.append({
                        'type': counter_key, 'alias_name': counter_key,
                        'value':1, 
                        'prefix': counter_standard[counter_key]['default_prefix'],
                        'postfix': counter_standard[counter_key]['default_postfix'],
                        'fee_type': '', 'academic_year': None
                    })
            else:
                for academic in AcademicYear.objects.all().values('id'):
                    if not fee_counters.filter(academic_year=academic['id'], type=counter_key):
                        counter_data.append(
                            {
                                'type': counter_key, 'alias_name': counter_key,
                                'value':1,
                                'prefix': counter_standard[counter_key]['default_prefix'],
                                'postfix': counter_standard[counter_key]['default_postfix'],
                                'fee_type': '', 'academic_year': academic['id']
                            }
                        )
        if counter_data:
            serializer = CounterSerializer(data=counter_data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return {'Reason': 'saved'}
    
    @staticmethod
    def create_counter_from_misc_mapping():
        misc_counters = Counter.objects.all()
        counter_data = []
        counter_standard = {c['counter_type_name']+'_'+c['group_name']:c for c in CounterMiscTypeMapping.objects.filter(is_active=True).values()}
        for counter_key in counter_standard:
            if counter_standard[counter_key]['is_global']:
                if not misc_counters.filter(academic_year=None, type=counter_key):
                    counter_data.append({
                        'type': counter_key, 'alias_name': counter_key,
                        'value':1, 
                        'prefix': counter_standard[counter_key]['default_prefix'],
                        'postfix': counter_standard[counter_key]['default_postfix'],
                        'misc_type': '', 'academic_year': None
                    })
            else:
                for academic in AcademicYear.objects.all().values('id'):
                    if not misc_counters.filter(academic_year=academic['id'], type=counter_key):
                        counter_data.append(
                            {
                                'type': counter_key, 'alias_name': counter_key,
                                'value':1,
                                'prefix': counter_standard[counter_key]['default_prefix'],
                                'postfix': counter_standard[counter_key]['default_postfix'],
                                'misc_type': '', 'academic_year': academic['id']
                            }
                        )
        if counter_data:
            serializer = CounterSerializer(data=counter_data, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        return {'Reason': 'saved'}

class ApprovalService(object):
    @staticmethod
    def update_approval_status(self, content_object, approval_status, message='', reason=''):
        user = self.request.user if self.request.user.pk else None
        content_type = ContentType.objects.get_for_model(content_object)
        data = {'content_type': content_type, 'object_id': content_object.pk}
        approval, created = ApproveStatus.objects.get_or_create(**data)
        exam_final_result_exists = StudentMarkSectionWiseApproval.objects.filter(
            exam=content_object.pk, approval_status=1
        ).exists()
        if approval.approval_status == '1' and message and exam_final_result_exists:
            raise exceptions.ValidationError(message)
        approval.approval_status = approval_status
        approval.reason = reason
        if created:
            approval.created_user = user
        else:
            approval.user = user
        approval.save()
        return {'Reason': 'Updated the approval status'}

    @staticmethod
    def get_approval_status(self, content_object, message='', raise_approvals=['1']):
        content_type = ContentType.objects.get_for_model(content_object)
        data = {'content_type': content_type, 'object_id': content_object.pk}
        status_value = dict(ApproveStatus.ApprovalStatus)
        approval = ApproveStatus.objects.filter(**data)
        if not approval:
            return {'approval_status': 0, 'approval_status_value': status_value['0'], 'reason': ''}
        if approval.filter(approval_status__in=raise_approvals) and message:
            raise exceptions.ValidationError(message)
        approval = approval.values().first()
        approval['approval_status_value'] = status_value[approval['approval_status']]
        return approval


class ConfigurationService(object):
    @staticmethod
    def update_setting(self, data, **kwargs):
        with transaction.atomic(using=get_current_db_name()):
            for value in data:
                if 'id' not in value:
                    raise exceptions.ValidationError('id is required.')
                self.kwargs['pk'] = value['id']
                instance = self.get_object()
                if instance.regex and (not re.compile(instance.regex).match(value['value'])):
                    raise exceptions.ValidationError(f'{instance.name} : {instance.regex_error_message}')
                if value['academic_year']:
                    settingOverride = SettingOverride.objects.filter(is_active=True, standard=value['standard'],
                                                                     academic_year=value['academic_year'],
                                                                     setting=value['id'])
                    value['setting'] = value['id']
                    if settingOverride:
                        settingOverride.update(value=value['value'])
                    else:
                        serializer = SettingOverrideSerializer(data=value)
                        serializer.is_valid(raise_exception=True)
                        serializer.save()
                else:
                    SharedService.update_data(self, value, **kwargs)
            return {'Reason': 'Data Saved Successfully'}

    @staticmethod
    def get_settings(self):
        academicYear = self.request.GET.get('academic_year')
        standard = self.request.GET.get('standard')
        response = SharedService.read_data(self, True)
        settingOverride = dict(
            SettingOverride.objects.filter(is_active=True, standard=standard, academic_year=academicYear).values_list(
                'setting', 'value'))
        for setting in response['data']:
            if setting['id'] in settingOverride:
                setting['value'] = settingOverride[setting['id']]
        return response

    @staticmethod
    def get_setting_value(settingName, academicYear=None, standard=None):
        setting = Setting.objects.filter(name=settingName, is_active=True)
        if not setting:
            raise exceptions.ValidationError('Setting value is not found.')
        if academicYear:
            academic_year_override = setting.filter(setting_override__is_active=True, setting_override__standard=None,
                                                  setting_override__academic_year=academicYear).first()
            if standard:
                standard_override = setting.filter(setting_override__is_active=True, setting_override__standard=standard,
                                                  setting_override__academic_year=academicYear).first()
                if standard_override:
                    return standard_override.value
            if academic_year_override:
                return academic_year_override.value
        value = setting.first().value
        return value

    @staticmethod
    def get_setting_values(settingNames, academicYear=None, standard=None):
        setting = dict(Setting.objects.filter(name__in=settingNames, is_active=True).values_list('name', 'value'))
        if not setting:
            raise exceptions.ValidationError('Setting value is not found.')
        if academicYear:
            settingOverride = SettingOverride.objects.filter(is_active=True, academic_year=academicYear,
                                                             setting__name__in=settingNames)
            academicYearOverride = dict(settingOverride.filter(standard=None).values_list('setting__name', 'value'))
            for name, value in academicYearOverride.items():
                setting[name] = value
            if standard:
                standardOverride = dict(settingOverride.filter(standard=standard).values_list('setting__name', 'value'))
                for name, value in standardOverride.items():
                    setting[name] = value
        return setting


def add_google_map_data(map_data):
    mandatory_fields = [
        # 'address_one_map', 'city_map', 'district_map', 'state_map', 'country_map',
        # 'pincode_map', 'latitude_map', 'longitude_map'
    ]
    SharedService.check_mandatory_field_in_list(mandatory_fields, map_data)
    instance = None
    if 'id' in map_data and map_data['id']:
        instance = MapAddress.objects.get(id=map_data['id'])
    serializer = MapAddressSerializer(instance=instance, data=map_data)
    serializer.is_valid(raise_exception=True)
    map_data = serializer.save()
    return map_data

class NotificationBodyTemplate:

    def __init__(self, api_name) -> None:
        from apps.notification.default_variables import NotificationSupportedApis
        from apps.notification.templates.messages_format import common_html_data_email, common_html_data_push
        institute_data = Institute.get_institute(self)
        api_configuration_data = NotificationApiConfiguration.objects.filter(api_name=api_name).values(
            'notification_medium', 'template','template_for_other_user','template_id'
        )
        api_configuration_data = {api['notification_medium']: api for api in api_configuration_data}
        self.institute_data = institute_data
        self.design_template_email = common_html_data_email
        self.design_template_push = common_html_data_push
        self.email_template = api_configuration_data['email']['template'] if ('email' in api_configuration_data and api_configuration_data['email']['template']) else NotificationSupportedApis[api_name]['data_to_save']['email_template']
        self.sms_template = api_configuration_data['sms']['template'] if ('sms' in api_configuration_data and api_configuration_data['sms']['template']) else NotificationSupportedApis[api_name]['data_to_save']['sms_template']
        self.push_template = api_configuration_data['push']['template'] if ('push' in api_configuration_data and api_configuration_data['push']['template']) else NotificationSupportedApis[api_name]['data_to_save']['push_template']
        self.whatsapp_template = api_configuration_data['whatsapp']['template'] if ('whatsapp' in api_configuration_data and api_configuration_data['whatsapp']['template']) else NotificationSupportedApis[api_name]['data_to_save']['whatsapp_template']
        default_email_temp_for_other_user = NotificationSupportedApis[api_name]['data_to_save']['email_template_for_other_user'] \
            if 'email_template_for_other_user' in NotificationSupportedApis[api_name]['data_to_save'] else None
        default_sms_temp_for_other_user = NotificationSupportedApis[api_name]['data_to_save']['sms_template_for_other_user'] \
            if 'sms_template_for_other_user' in NotificationSupportedApis[api_name]['data_to_save'] else None
        default_push_temp_for_other_user = NotificationSupportedApis[api_name]['data_to_save']['push_template_for_other_user'] \
            if 'push_template_for_other_user' in NotificationSupportedApis[api_name]['data_to_save'] else None
        self.email_template_for_other_user = api_configuration_data['email']['template_for_other_user'] \
            if (
                'email' in api_configuration_data and 'template_for_other_user' in api_configuration_data['email'] and \
                api_configuration_data['email']['template_for_other_user']
            ) else default_email_temp_for_other_user
        self.sms_template_for_other_user = api_configuration_data['sms']['template_for_other_user'] \
            if (
                'sms' in api_configuration_data and 'template_for_other_user' in api_configuration_data['sms'] and \
                api_configuration_data['sms']['template_for_other_user']
            ) else default_sms_temp_for_other_user
        self.push_template_for_other_user = api_configuration_data['push']['template_for_other_user'] \
            if (
                'push' in api_configuration_data and 'template_for_other_user' in api_configuration_data['push'] and \
                api_configuration_data['push']['template_for_other_user']
            ) else default_push_temp_for_other_user
        default_whatsapp_template_id = NotificationSupportedApis[api_name]['data_to_save']['whatsapp_template_id'] \
            if 'whatsapp_template_id' in NotificationSupportedApis[api_name]['data_to_save'] else None
        self.whatsapp_template_id = api_configuration_data['whatsapp']['template_id'] \
            if (
                'whatsapp' in api_configuration_data and 'template_id' in api_configuration_data['whatsapp'] and \
                api_configuration_data['whatsapp']['template_id']
            ) else default_whatsapp_template_id
        if not self.email_template_for_other_user:
            self.email_template_for_other_user = self.email_template
        if not self.sms_template_for_other_user:
            self.sms_template_for_other_user = self.sms_template
        if not self.push_template_for_other_user:
            self.push_template_for_other_user = self.push_template
        # if 'email' in api_configuration_data and 'template_for_other_user' in api_configuration_data['email'] and not api_configuration_data['email']['template_for_other_user']:
        #     self.email_template_for_other_user = api_configuration_data['email']['template_for_other_user'] if ('email' in api_configuration_data and api_configuration_data['email']['template_for_other_user']) else NotificationSupportedApis[api_name]['data_to_save']['email_template_for_other_user']
        # if 'sms' in api_configuration_data:
        #     if api_configuration_data['sms']['template_for_other_user'] is not None:
        #         self.sms_template_for_other_user = api_configuration_data['sms']['template_for_other_user'] if ('sms' in api_configuration_data and api_configuration_data['sms']['template_for_other_user']) else NotificationSupportedApis[api_name]['data_to_save']['sms_template_for_other_user']
        # if 'push' in 'api_configuration_data':
        #     if api_configuration_data['push']['template_for_other_user'] is not None:
        #         self.push_template_for_other_user = api_configuration_data['push']['template_for_other_user'] if ('push' in api_configuration_data and api_configuration_data['push']['template_for_other_user']) else NotificationSupportedApis[api_name]['data_to_save']['push_template_for_other_user']
        self.api_name = api_name
    
    def select_template(self, medium, data):
        vendor_detail = {noti['notification_medium'] : noti for noti in NotificationVendor.objects.filter(is_active=True).values()} #only supporting sms brand name for now
        data['sms_brand_name'] = 'Edubricz'
        if vendor_detail and 'sms' in vendor_detail:
            data['sms_brand_name'] = vendor_detail['sms']['brand_name']
        return_message = ''
        institute_name = self.institute_data.name
        if medium == 'email':
            return_message = self.design_template_email.format(html_data=self.email_template.format(**data), institute_name=institute_name)
        if medium == 'push':
            return_message = self.push_template.format(**data)
        if medium == 'sms':
            return_message = self.sms_template.format(**data)
        return return_message

    def select_template_for_other_user(self,medium,data):
        return_message=''
        institute_name=self.institute_data.name
        if medium == 'email':
            return_message = self.design_template_email.format(html_data=self.email_template_for_other_user.format(**data), institute_name=institute_name)
        if medium == 'sms':
            return_message = self.sms_template_for_other_user.format(**data)
        if medium == 'push':
            return_message = self.push_template_for_other_user.format(**data)
        return return_message
    
    def select_whatsapp_template_id_and_field_data(self,medium,data):
        return_message={'field_values':{},'contact':{}}
        if medium == 'whatsapp':
            values = re.findall(r'\{([^}]+)\}', self.whatsapp_template)
            def repl(match, counter=[1]):
                replacement = f'{{{counter[0]}}}'
                counter[0] += 1
                return replacement
            return_message['whatsapp_template'] = self.whatsapp_template.format(**data)
            for index,value in enumerate(values):
                key='field_'+str(index+1)
                return_message['field_values'][key] = data[value]
            return_message['whatsapp_template_id'] = self.whatsapp_template_id
            if 'student_obj' in data:
                return_message['contact']['first_name']=data['student_obj'].first_name
                return_message['contact']['last_name']=data['student_obj'].last_name
                return_message['contact']['email']=data['student_obj'].email
            if 'staff_obj' in data:
                return_message['contact']['first_name']=data['staff_obj'].first_name
                return_message['contact']['last_name']=data['staff_obj'].last_name
                return_message['contact']['email']=data['staff_obj'].email
        return return_message   
