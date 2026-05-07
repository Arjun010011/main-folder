import json
import logging
import boto3
from django.conf import settings
from botocore.client import Config


import pdfkit
import html

from rest_framework.views import Response, APIView
from apps.classes.models.standard import Standard
from apps.shared.models import (
    Document,
    Nationality,
    Religion,
    Category,
    Caste,
    Counter,
    CustomDesignTemplate,
    CustomDesignTemplateMap,
)
from apps.shared.models.custom_design_template import TemplateSampleJson

from apps.shared.models.configuration import Setting
from apps.shared.models.document import DocumentType
from apps.shared.models.menu import Menu, Url
from rest_framework import permissions

from apps.shared.models.mode_of_payment import ModeOfPayment
from apps.shared.services_shared.common import notuploaded_files_list
from apps.shared.models.template_mapping import TemplateMapping, TemplateStandardMapping
from apps.shared.services_shared.auto_sync import create_sync, get_sync_list_data
from apps.shared.variables.default_variables import default_template_list
from apps.shared.variables.default_variables import default_certificates_list
from apps.shared.serializers import (CustomFormSerializer, DocumentTypeSerializer, StatesForCountrySerializer, DistrictsForStateSerializer,
                                     CitiesForDistrictSerializer, ModeOfPaymentSerializer,
                                     CountrySerializer, FormDefinitionSerializer, FormDefinitionListSerializer,
                                     DocumentSerializer, MenuSerializer, TemplateStandardMappingSerializer, UrlSerializer, SettingSerializer,
                                     NationalitySerializer, ReligionSerializer, CategorySerializer, CasteSerializer,CustomReportColumnSerializer,
                                     CounterSerializer, TemplateMappingSerializer, ReportSerializer, CustomReportFilterSerializer, CustomReportCategorySerializer, CustomReportSubCategorySerializer,
                                     CustomDesignTemplateSerializer, CustomDesignTemplateMapSerializer, TemplateSampleJsonSerializer)
from apps.general.serializers import LongProcessingApiResultSerializer
from apps.shared.models.address import Country, State, District, City
from apps.shared.models.custom import CustomForm, FormDefinition
from apps.general.models.long_processing import LongProcessingApiResult
from apps.shared.models.custom_report import Report, ReportCategory, ReportSubCategory, ReportFilter, ReportColumn, LongProcessingAPIResultMapping, ReportGroupHeading, ReportGroupName, ReportGroupNameValuesMapping
from apps.shared.services_shared.custom_report import get_custom_report, add_custom_report,get_user_downloaded_report,get_column_list,get_filter_list,gets_custom_report,add_custom_report_grouping,get_custom_report_grouping
from rest_framework import viewsets, exceptions
from apps.shared.services_shared.custom import add_custom_form, get_app_assets
from apps.shared.services_shared.common import get_dynamic_values_for_template
from apps.shared.services_shared.common import add_or_update_front_end_urls, get_form_structure
from apps.shared.services import SharedService, UploadTypeService, MenuService, CounterService, \
    ConfigurationService, FormdefinitionService
from apps.shared.services_shared.store_api_result import start_long_running_process
from apps.users.services.permissions import IsAuthenticated, OnlyListAccess
from apps.shared.variables.default_variables import default_certificates_list
from apps.shared.variables.default_variables import defult_staff_certificate_list
AWS_ACCESS_KEY_ID = getattr(settings, 'AWS_ACCESS_KEY_ID', None)
AWS_SECRET_ACCESS_KEY = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None)
AWS_STORAGE_BUCKET_NAME = getattr(settings, 'AWS_STORAGE_BUCKET_NAME', None)

log = logging.getLogger(__name__)

class CountryViewSet(viewsets.ModelViewSet):
    queryset = Country.objects.all()
    serializer_class = CountrySerializer
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)
    http_method_names = ['get', 'post', 'put', 'delete']

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request):
        SharedService.duplicate_list_one_object(request.data['countries'], 'name')
        response = SharedService.add_data(self, request.data['countries'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'state__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data,
                                                       'Not able to delete. Some State refers to this Country')
        return Response(response)



class StateViewSet(viewsets.ModelViewSet):
    queryset = State.objects.all()
    serializer_class = StatesForCountrySerializer
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    http_method_names = ['get', 'post', 'put', 'delete']

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request):
        SharedService.duplicate_list_one_object(request.data['states'], 'name')
        for item in request.data['states']:
            item.update({'country': request.data['country']})
        response = SharedService.add_data(self, request.data['states'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'district__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data,
                                                       'Not able to delete. Some District refers to this State')
        return Response(response)


class DistrictViewSet(viewsets.ModelViewSet):
    queryset = District.objects.all()
    serializer_class = DistrictsForStateSerializer
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)
    http_method_names = ['get', 'post', 'put', 'delete']

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request):
        SharedService.duplicate_list_one_object(request.data['districts'], 'name')
        for item in request.data['districts']:
            item.update({'state': request.data['state']})
        response = SharedService.add_data(self, request.data['districts'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'city__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data,
                                                       'Not able to delete. Some City refers to this City')
        return Response(response)


class CityViewSet(viewsets.ModelViewSet):
    queryset = City.objects.all()
    serializer_class = CitiesForDistrictSerializer
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)
    http_method_names = ['get', 'post', 'put', 'delete']

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request):
        SharedService.duplicate_list_one_object(request.data['cities'], 'name')
        for item in request.data['cities']:
            item.update({'district': request.data['district']})
        response = SharedService.add_data(self, request.data['cities'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class StatesForCountryApiView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        self.queryset = State.objects.all()
        return self.queryset

    def get(self, request, countryid, format=None):
        response = {}
        data = self.get_queryset().filter(country_id=countryid, is_active=True)
        serializer = StatesForCountrySerializer(data, many=True)
        response['data'] = serializer.data
        return Response(response)


class DistrictsForStateApiView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        self.queryset = District.objects.all()
        return self.queryset

    def get(self, request, stateid, format=None):
        response = {}
        data = self.get_queryset().filter(state_id=stateid, is_active=True)
        serializer = DistrictsForStateSerializer(data, many=True)
        response['data'] = serializer.data
        return Response(response)


class CitiesForDistrictApiView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        self.queryset = City.objects.all()
        return self.queryset

    def get(self, request, districtid, format=None):
        response = {'Reason': ''}
        data = self.get_queryset().filter(district_id=districtid, is_active=True)
        serializer = CitiesForDistrictSerializer(data, many=True)
        response['data'] = serializer.data
        return Response(response)


"""
    Accepts only list eg: [{"form_name":"","column_name":""}]
"""


class FormDefinitionViewSet(viewsets.ModelViewSet):
    queryset = FormDefinition.objects.all()
    serializer_class = FormDefinitionSerializer
    http_method_names = ['get', 'post']  # add post delete in post method itself
    filterset_fields = ['form_name']
    permission_classes = (OnlyListAccess,)

    def create(self, request):
        response = SharedService.add_or_update_data(self, request.data)
        return Response(response)

    def list(self, request):
        response = SharedService.read_data(self, True)
        return Response(response)



class FormDefinitionGetFormNames(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        response = {'Reason': ''}
        data = FormDefinition.objects.order_by('form_name').values('form_name').distinct()
        serializer = FormDefinitionListSerializer(data, many=True)
        response['data'] = serializer.data
        return Response(response)

class MultipleUploadViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = Document.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = UploadTypeService.upload_file_multiple(self, request.data)
        return Response(response)

class UploadViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    http_method_names = ['post', 'get', 'put', 'delete']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = Document.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        if self.request.GET.get('presigned_url'):
            response = UploadTypeService.get_presigned_url(self, request.data) 
        else:
            response = UploadTypeService.upload_file(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = UploadTypeService.upload_file(self, request.data, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        # response = SharedService.dict_to_json(self, {'a':'b'}, 'abcd.json', )
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class MenuViewSet(viewsets.ModelViewSet):
    serializer_class = MenuSerializer
    http_method_names = ['post', 'get', 'delete', 'put']
    filterset_fields = ['menu_type']

    def get_queryset(self):
        self.queryset = Menu.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = MenuService.add_menu(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = MenuService.update_menu(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class UrlViewSet(viewsets.ModelViewSet):
    serializer_class = UrlSerializer
    http_method_names = ['post', 'get', 'put', 'delete']
    filterset_fields = ['is_enabled']

    def get_queryset(self):
        self.queryset = Url.objects.all()
        if self.request.GET.get('available_urls'):
            self.queryset = self.queryset.filter(menu_url__isnull=True)
        if self.request.GET.get('menu_type'):
            self.queryset = self.queryset.filter(menu_type=self.request.GET.get('menu_type'))
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = MenuService.add_urls(self, request.data, *args, **kwargs)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        log.info('Available Urls : ' + json.dumps(response['data']))
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'menu_url__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data)
        return Response(response)


class UrlOperationViewSet(viewsets.ModelViewSet):
    serializer_class = UrlSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = Url.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = MenuService.enable_disable_urls(self, request.data, *args, **kwargs)
        return Response(response)


class DownloadJson(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request, format=None):
        from apps.users.services.permissions import permission_map
        return Response(permission_map)


class SettingViewSet(viewsets.ModelViewSet):
    serializer_class = SettingSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Setting.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = ConfigurationService.update_setting(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = ConfigurationService.get_settings(self)
        return Response(response)


class NationalityViewSet(viewsets.ModelViewSet):
    serializer_class = NationalitySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = Nationality.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['nationality'], 'name')
        response = SharedService.add_data(self, request.data['nationality'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)



class ReligionViewSet(viewsets.ModelViewSet):
    serializer_class = ReligionSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = Religion.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['religion'], 'name')
        for item in request.data['religion']:
            item.update({'nationality': request.data['nationality']})
        response = SharedService.add_data(self, request.data['religion'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.get_religion_category_caste(self, {'nationality': self.kwargs['pk']})
        return Response(response)



class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = Category.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['category'], 'name')
        for item in request.data['category']:
            item.update({'religion': request.data['religion']})
        response = SharedService.add_data(self, request.data['category'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.get_religion_category_caste(self, {'religion': self.kwargs['pk']})
        return Response(response)



class CasteViewSet(viewsets.ModelViewSet):
    serializer_class = CasteSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = Caste.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['caste'], 'name')
        for item in request.data['caste']:
            item.update({'category': request.data['category']})
        response = SharedService.add_data(self, request.data['caste'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        filter = {}
        if self.request.GET.get('category'):
            filter = {'category': self.kwargs['pk']}
        if self.request.GET.get('religion'):
            filter = {'religion': self.kwargs['pk']}
        response = SharedService.get_religion_category_caste(self, filter)
        return Response(response)



class CounterViewSet(viewsets.ModelViewSet):
    serializer_class = CounterSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'academic_year', 'financial_year']

    def get_queryset(self):
        global_counters = []
        for counter_data in CounterService.COUNTERS.values():
            if counter_data['is_global_counter']:
                global_counters.append(counter_data['type'])
        self.queryset = Counter.objects.exclude(type__in=global_counters)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.update_counter(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

    def list(self, request, *args, **kwargs):
        response = CounterService.get_counter_list(self)
        return Response(response)


class TemplateMappingViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateMappingSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'template_type', 'module']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = TemplateMapping.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['templates'], 'name')
        response = SharedService.add_data(self, request.data['templates'])
        standard_mapping = []
        academic_year = request.data.get('academic_year')
        if request.data.get('standard_ids'): #add validations
            for standard in request.data['standard_ids']:
                standard_mapping.append({
                    'standard': standard,
                    'academic_year': academic_year,
                    'template': response['data'][0]['id']
                })
            if standard_mapping:
                ser = TemplateStandardMappingSerializer(data=standard_mapping, many=True)
                ser.is_valid(raise_exception=True)
                ser.save()
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class DocumentTypeViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentTypeSerializer
    http_method_names = ['get']


    def get_queryset(self):
        self.queryset = DocumentType.objects.filter(is_active=True)
        if self.request.GET.get('group_type'):
            self.queryset = self.queryset.filter(group_type__contains=self.request.GET.get('group_type'))
        if self.request.GET.get('standard_id'):
            self.queryset = self.queryset.filter(document_type_standard_mapping_document_type__standard=self.request.GET.get('standard_id'))
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        if self.request.GET.get('student_id'):
            response['documents_not_uploaded'] = notuploaded_files_list(self)
        return Response(response)

class CustomFormViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFormSerializer
    http_method_names = ['get', 'post', 'delete', 'put']
    filterset_fields = ['form_for', 'is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = CustomForm.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_custom_form(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        data = {'is_active': request.data['is_active']} #this is to only allow enabling and disabling
        if request.data['is_active']:
            CustomForm.objects.filter(form_for=self.get_object().form_for).update(is_active=False)
        response = SharedService.update_data(self, data, **{'partial': True})
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'custom_data_custom_field__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data, 'Not able to delete. Custom Data Exist for the form')
        return Response(response)

class UploadFrontEndFieldViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post', 'get']

    def create(self, request, *args, **kwargs):
        response = add_or_update_front_end_urls(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_form_structure(self, request)
        return Response(response)

class TemplateMappingFilterDatasViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        return Response({'data': default_template_list})
    
class CertificateMappingFilterDatasViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        return Response({'data': default_certificates_list})    

class SyncDataViewSet(viewsets.ModelViewSet):
    serializer_class = CustomFormSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        return None

    def create(self, request, *args, **kwargs):
        return Response(create_sync(self, request.data['sync_type']))

    def list(self, request, *args, **kwargs):
        return Response({'data': get_sync_list_data()})

class DynamicvaluesForTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def get_queryset(self):
        return None

    def list(self,request,*args,**kwargs):
        model_name = self.request.GET.get('model_name')
        if not model_name:
            raise exceptions.ValidationError('model_name is mandatory')
        return Response({'data':get_dynamic_values_for_template(model_name)})

class S3PresignedUrlViewSet(APIView):

    def post(self,request,*args,**kwargs):
        return_response = {}
        duplicate_check = {}
        # validation 
        for file_row in request.data['file_list']:
            key = file_row['file_name'] + file_row['folder_name']
            if key in duplicate_check:
                raise exceptions.ValidationError('Duplicate key exists')
            duplicate_check[key] = ''
            mandatory_fields = ['transaction_to_track_file', 'file_name', 'size_in_mb', 'content_type', 'folder_name']
            SharedService.check_mandatory_field_in_list(mandatory_fields, file_row)
        s3_client = boto3.client(
            's3',
            region_name='ap-south-1',
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            config=Config(signature_version='s3v4')
        )
        for file_row in request.data['file_list']:
            file_to_upload = file_row['file_name'] + '_' + SharedService.generate_random_number()
            response = s3_client.generate_presigned_post(
                'edubricz-local',
                file_to_upload,
                Fields={
                    "acl": 'public-read',
                    "Content-Type": 'jpg'
                },
                Conditions=[
                    {"acl": 'public-read'},
                    {"Content-Type": 'jpg'},
                ],
                ExpiresIn=3600,
            )
            return_response[file_row['transaction_to_track_file']] = {
                'presigned_data': response,
                'transaction_to_track_file': file_row['transaction_to_track_file'],
                'uploaded_id': file_row['uploaded_id']
            }
            


        # https://www.hacksoft.io/blog/direct-to-s3-file-upload-with-django
        
        

        return Response(return_response)

class LongProcessingApiResultViewset(viewsets.ModelViewSet):
    serializer_class = LongProcessingApiResultSerializer
    http_method_names = ['get']

    def get_queryset(self):
        return LongProcessingApiResult.objects.all()

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('transaction_id'):
            queryset = LongProcessingApiResult.objects.get(transaction_id=self.request.GET.get('transaction_id'))
            serializer = self.get_serializer(queryset)
            response = {'data': serializer.data}
        else:
            response = SharedService.read_data(self, True)
        return Response(response)
    
class ModeOfPaymentViewSet(viewsets.ModelViewSet):
    serializer_class = ModeOfPaymentSerializer
    http_method_names = ['get']


    def list(self, request, *args, **kwargs):
        mode_of_payment_data = ModeOfPayment.objects.filter(is_active=True).order_by('sequence').values()
        for mode_of_payment in mode_of_payment_data:
            if mode_of_payment['allowed_app_types']:
                mode_of_payment['allowed_app_types'] = mode_of_payment['allowed_app_types'].split(',')
            else:
                mode_of_payment['allowed_app_types'] = []
            if mode_of_payment['mandatory_fields']:
                mode_of_payment['mandatory_fields'] = mode_of_payment['mandatory_fields'].split(',')
            else:
                mode_of_payment['mandatory_fields'] = []
            if mode_of_payment['display_fields']:
                mode_of_payment['display_fields'] = mode_of_payment['display_fields'].split(',')
            else:
                mode_of_payment['display_fields'] = []
        allowed_app_types = self.request.GET.get('allowed_app_types')
        if allowed_app_types:
            def local_filter(row):
                if allowed_app_types in row['allowed_app_types']:
                    return True
                else:
                    return False
            mode_of_payment_data = filter(local_filter, mode_of_payment_data)
        return Response({'data': mode_of_payment_data})

class MultipleStudyCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        multiple_certificate={"study_certificate_list":[]}
        multiple_certificate_count = FormDefinition.objects.filter(form_name='certificate_configuration',column_name='is_multiple_study_certificate').values('default_value')
        for count in range(int(multiple_certificate_count[0]['default_value'])):
            multiple_certificate['study_certificate_list'].append(
                {
                    "lable": "Certificate Type "+str(count+1),
                    "value": count+1
                }
            )
        return Response({'data': multiple_certificate})
    
class MultipleOtherCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        certificate_mappings=default_certificates_list
        return Response({'data': certificate_mappings})    

class MultipleStaffCertificateViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        certificate_mappings=defult_staff_certificate_list
        return Response({'data': certificate_mappings})

class CustomReportCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomReportCategorySerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = ReportCategory.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
class CustomReportSubCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CustomReportSubCategorySerializer
    http_method_names = ['get']
    filterset_fields = ['category','is_active']

    def get_queryset(self):
        self.queryset = ReportSubCategory.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
class CustomReportFilterViewSet(viewsets.ModelViewSet):
    serializer_class = CustomReportFilterSerializer
    http_method_names = ['get']
    filterset_fields = ['report']

    def get_queryset(self):
        self.queryset = ReportFilter.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_filter_list(self)
        return Response(response)
    
class CustomReportColumnViewSet(viewsets.ModelViewSet):
    serializer_class = CustomReportColumnSerializer
    http_method_names = ['get']
    filterset_fields = ['report']

    def get_queryset(self):
        self.queryset = ReportColumn.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_column_list(self)
        return Response(response)
    
class CustomReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    http_method_names = ['get','post','put']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Report.objects.all()
        return self.queryset
    
    def create(self, request, *args, **kwargs):
        response = add_custom_report(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = add_custom_report(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response= SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = gets_custom_report(self)
        # if self.request.GET.get('download_excel'):
            # return response
        return Response(response)

class CustomReportMessageDataViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Report.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        message_data={}
        message_data['data']={'email_message':response['data']['email_template'],'push_message':response['data']['push_template'],'sms_message':response['data']['sms_template'],
                                'email_title':"",'sms_title':"",'push_title':"",'supported_mediums':['push','email','sms']

        }
        return Response(message_data)

class GenerateCustomReportViewSet(viewsets.ModelViewSet):
    serializer_class = ReportSerializer
    http_method_names = ['post']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Report.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            data=request.data
            start_long_running_process(self,data['report_id'])
            SharedService.custom_thread(get_custom_report, self, request.data)
            return Response({'Result': True})
        response = get_custom_report(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response= SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_custom_report(self)
        if self.request.GET.get('download_excel'):
            return response
        return Response(response)

class CustomReportDownloadedByUserViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response= get_user_downloaded_report(self)
        return Response(response)

class AppAssetsAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return None

    def get(self, request, *args, **kwargs):
        response = get_app_assets(self)
        return Response(response)

class CustomDesignTemplateViewSet(viewsets.ModelViewSet):
    serializer_class = CustomDesignTemplateSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        from apps.institutes.models.institute import Institute
        institute = Institute.get_institute(self)
        queryset = CustomDesignTemplate.objects.filter(institute=institute, is_active=True)
        
        # Filter by module if provided
        if self.request.GET.get('module'):
            queryset = queryset.filter(module=self.request.GET.get('module'))
        
        # Filter by academic_year if provided
        if self.request.GET.get('academic_year'):
            queryset = queryset.filter(academic_year=self.request.GET.get('academic_year'))
        
        # Filter by standard if provided
        if self.request.GET.get('standard'):
            queryset = queryset.filter(standard=self.request.GET.get('standard'))
        
        return queryset

    def create(self, request, *args, **kwargs):
        from apps.institutes.models.institute import Institute
        institute = Institute.get_institute(self)
        
        # Set institute and created_by automatically
        data = request.data.copy()
        data['institute'] = institute.id
        data['created_by'] = request.user.id
        
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=200, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'Reason': 'Template deleted successfully'})


class CustomDesignTemplateMapViewSet(viewsets.ModelViewSet):
    serializer_class = CustomDesignTemplateMapSerializer
    http_method_names = ['get', 'post', 'put', 'patch', 'delete']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        from apps.institutes.models.institute import Institute
        institute = Institute.get_institute(self)
        return CustomDesignTemplateMap.objects.filter(template__institute=institute).select_related('template')

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=200, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(status=204)


from rest_framework.viewsets import ViewSet
from django.http import HttpResponse
import pdfkit


from rest_framework.viewsets import ViewSet

class CustomDesignTemplatePrintViewSet(ViewSet):

    def create(self, request, *args, **kwargs):
        template_data = request.data.get("template_data")
        sample_data = request.data.get("sample_data", {})

        return SharedService.prepare_pdf(sample_data, template_data=template_data)


class TemplateSampleJsonViewSet(viewsets.ModelViewSet):
    serializer_class = TemplateSampleJsonSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return TemplateSampleJson.objects.all()
    
    def list(self, request):
        queryset = TemplateSampleJson.objects.all()
        serializer = TemplateSampleJsonSerializer(queryset, many=True)
        return Response({
            'data': serializer.data
        })
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=200)
    
    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)
    
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({'Reason': 'Template sample deleted successfully'})
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
        
class CustomReportGroupingViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post','get']

    def get_queryset(self):
        self.queryset = ReportGroupName.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        if request.GET.get('report_id'):
            # Get custom report grouping data
            response = get_custom_report_grouping(self)
            return Response(response)
        else:
            # Default list view
            response = SharedService.read_data(self, True)
            return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_custom_report_grouping(self, request.data)
        return Response(response)
