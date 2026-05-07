from rest_framework import serializers


from apps.shared.models import Document, Nationality, Religion, Category, Caste, Counter
from apps.shared.models.address import MapAddress, State, Country, District, City
from apps.shared.models.approval import ApprovalTransition
from apps.shared.models.configuration import Setting, SettingOverride, TransactionIdTracking
from apps.shared.models.custom import CustomData, CustomForm, FormDefinition
from apps.shared.models.custom_report import Report, ReportCategory, ReportFilter, ReportSubCategory, ReportColumn
from django.utils.translation import gettext_lazy as _
from apps.shared.models.document import DocumentType

from apps.shared.models.menu import Menu, Url
from rest_framework.validators import UniqueValidator
from rest_framework.exceptions import ValidationError
from django.db import DataError

from apps.shared.models.mode_of_payment import ModeOfPayment
# from apps.shared.models.custom_report import Report, ReportCategory, ReportColumn, ReportFilter, ReportSubCategory
from apps.shared.models.template_mapping import TemplateMapping, TemplateStandardMapping
from apps.shared.models.custom_design_template import CustomDesignTemplate, CustomDesignTemplateMap, TemplateSampleJson


class ActiveFilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        data = data.filter(is_active=1)
        return super(ActiveFilteredListSerializer, self).to_representation(data)


"""
    {'filtered_list' : [{'name': is_active__in, 'value': [0,1]},{}]}
"""


class CustomFilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        if self.context.get('filtered_list'):
            filterQuery = {}
            for columnData in self.context.get('filtered_list'):
                filterQuery[columnData['name']] = columnData['value']
            data = data.filter(**filterQuery)
        return super(CustomFilteredListSerializer, self).to_representation(data)


class StatesForCountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'country')
            )
        ]
        fields = '__all__'


class DistrictsForStateSerializer(serializers.ModelSerializer):
    class Meta:
        model = District
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'state'),
                message=_("duplicate entry found for district name")
            )
        ]
        fields = '__all__'


class CitiesForDistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'district'),
                message=_("duplicate entry found for city name ")
            )
        ]
        fields = '__all__'


class CountrySerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[UniqueValidator(queryset=Country.objects.filter(is_active=True))])

    class Meta:
        model = Country
        fields = '__all__'


class FormDefinitionSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormDefinition
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('form_name', 'column_name'),
                message=_("duplicate entry found for form_name and column name")
            )
        ]
        fields = '__all__'


class FormDefinitionListSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormDefinition
        fields = ['id', 'form_name']

class DocumentSerializer(serializers.ModelSerializer):

    class Meta:
        model = Document
        fields = '__all__'

class DocumentUrlSerializer(serializers.ModelSerializer):

    class Meta:
        model = Document
        fields = ['file', 'id', 'content_type']


class MenuSerializer(serializers.ModelSerializer):
    path = serializers.ReadOnlyField(source='url.path')
    image_url = serializers.ReadOnlyField(source='url.image_url')

    class Meta:
        model = Menu
        exclude = ['created', 'modified']


class UrlSerializer(serializers.ModelSerializer):

    class Meta:
        model = Url
        fields = '__all__'


class SettingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=Setting.objects.filter(is_active=True),
                                                             message='Setting name is already exists.')])

    class Meta:
        model = Setting
        exclude = ['created', 'modified']


class SettingOverrideSerializer(serializers.ModelSerializer):
    class Meta:
        model = SettingOverride
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('setting', 'academic_year', 'standard'),
                message='setting is already exist(s) for the standard in the academic year.'
            )
        ]
        exclude = ['created', 'modified']


class GetSettingSerializer(serializers.ModelSerializer):
    setting_override = SettingOverrideSerializer(many=True)

    class Meta:
        model = Setting
        exclude = ['created', 'modified']


def qs_exists(queryset):
    try:
        return queryset.exists()
    except (TypeError, ValueError, DataError):
        return False


class CustomUniqueValidator(UniqueValidator):

    def __call__(self, value, serializer_field):
        field_name = serializer_field.source_attrs[-1]
        instance = getattr(serializer_field.parent, 'instance', None)

        queryset = self.queryset
        queryset = self.filter_queryset(value, queryset, field_name)
        queryset = self.exclude_current_instance(queryset, instance)
        if qs_exists(queryset):
            message = ''
            for value in queryset.values():
                message += str(value[field_name]) + ' is already exist. '
            raise ValidationError(message, code='unique')


class NationalitySerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[UniqueValidator(queryset=Nationality.objects.filter(is_active=True))])

    class Meta:
        model = Nationality
        fields = '__all__'


class ReligionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Religion
        validators = [serializers.UniqueTogetherValidator(
            queryset=model.objects.filter(is_active=True),
            fields=('name', 'nationality'),
            message='nationality and religion already exists.'
        )]
        fields = '__all__'


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'religion'),
                message='religion and category already exists.'
            )
        ]
        fields = '__all__'


class CasteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Caste
        fields = '__all__'


class CounterSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')

    class Meta:
        model = Counter
        fields = '__all__'

class TemplateStandardMappingSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')
    academic_year_value = serializers.SerializerMethodField()

    def get_academic_year_value(self, obj):
        if obj.academic_year:
            return str(obj.academic_year.start_date) + ' ' + str(obj.academic_year.end_date)
        return ''

    class Meta:
        model = TemplateStandardMapping
        fields = '__all__'

class TemplateMappingSerializer(serializers.ModelSerializer):
    template_standard_mapping_template = TemplateStandardMappingSerializer(many=True, read_only=True)

    class Meta:
        model = TemplateMapping
        fields = '__all__'


class MapAddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = MapAddress
        fields = '__all__'

class DocumentTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = DocumentType
        fields = '__all__'

class CustomFormSerializer(serializers.ModelSerializer):
    form_name = serializers.CharField(
        validators=[UniqueValidator(queryset=CustomForm.objects.filter(is_active=True))])

    class Meta:
        model = CustomForm
        fields = '__all__'

class ReportSerializer(serializers.ModelSerializer):

    class Meta:
        model = Report
        fields = '__all__'

class CustomReportCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportCategory
        fields = '__all__'

class CustomReportSubCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportSubCategory
        fields = '__all__'

class CustomReportFilterSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportFilter
        fields = '__all__'

class CustomReportColumnSerializer(serializers.ModelSerializer):

    class Meta:
        model = ReportColumn
        fields = '__all__'

class CustomDataSerializer(serializers.ModelSerializer):

    class Meta:
        model = CustomData
        fields = '__all__'

class ApprovalTransitionSerializer(serializers.ModelSerializer):

    class Meta:
        model = ApprovalTransition
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('approval_status_parent', 'step')
            )
        ]
        fields = '__all__'


class ModeOfPaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = ModeOfPayment
        fields = '__all__'

class TransactionIdTrackingSerializer(serializers.ModelSerializer):

    class Meta:
        model = TransactionIdTracking
        fields = '__all__'

class CustomDesignTemplateSerializer(serializers.ModelSerializer):
    institute_name = serializers.CharField(source='institute.name', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            if obj.created_by.staff:
                return f"{obj.created_by.staff.first_name} {obj.created_by.staff.last_name}".strip()
            elif obj.created_by.student:
                return f"{obj.created_by.student.first_name} {obj.created_by.student.last_name}".strip()
        return None

    class Meta:
        model = CustomDesignTemplate
        fields = '__all__'
        read_only_fields = ('created', 'modified', 'created_by')


class CustomDesignTemplateMapSerializer(serializers.ModelSerializer):
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = CustomDesignTemplateMap
        fields = '__all__'
        read_only_fields = ('created', 'modified')


class TemplateSampleJsonSerializer(serializers.ModelSerializer):
    class Meta:
        model = TemplateSampleJson
        fields = '__all__'