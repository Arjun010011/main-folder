from django.db import models
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.general.models.long_processing import LongProcessingApiResult
from apps.shared.models import Document

class ReportCategory(models.Model):
    name = models.CharField(max_length=255)
    alias = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ReportSubCategory(models.Model):
    name = models.CharField(max_length=255)
    alias = models.CharField(max_length=255)
    category = models.ForeignKey(ReportCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='reportsubcategory_reportcategory')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Report(models.Model):
    category = models.ForeignKey(ReportCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_reportcategory')
    subcategory = models.ForeignKey(ReportSubCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_reportsubcategory')
    report_name = models.CharField(max_length=255)
    report_description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    process_hook = models.CharField(max_length=255)
    process_function = models.CharField(max_length=255)
    code_name = models.CharField(max_length=255)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    transaction_id = models.IntegerField(default=0)
    email_template = models.CharField(max_length=255,null=True)
    push_template = models.CharField(max_length=255,null=True)
    sms_template = models.CharField(max_length=255,null=True)
    supported_doc_formate = models.CharField(max_length=255,null=True)

class CustomDownloadTypes(models.Model):
    type = models.CharField(max_length=255)

class SheetClassification(models.Model):
    sheet_name = models.CharField(max_length=255)
    sheet_alias = models.CharField(max_length=255)

class TabClassification(models.Model):
    tab_name = models.CharField(max_length=255)
    tab_alias = models.CharField(max_length=255)

class ReportColumn(models.Model):
    report = models.ForeignKey(Report, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_column_report_name')
    column_name = models.CharField(max_length=255)
    column_alias = models.CharField(max_length=255)
    formate_type = models.CharField(max_length=255)
    sheet = models.ForeignKey(SheetClassification, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_column_sheet_name')
    tab = models.ForeignKey(TabClassification, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_column_tab_name')
    is_default_selected = models.BooleanField(default=False)
    custom_calculation = models.JSONField(null=True, blank=True)

class ReportSummary(models.Model):
    report_column = models.ForeignKey(ReportColumn, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_summary_report_column')
    alias = models.CharField(max_length=255)
    calculation_type = models.CharField(max_length=255)

class ReportFilter(models.Model):
    filter_name = models.CharField(max_length=255)
    filter_alias = models.CharField(max_length=255)
    report = models.ForeignKey(Report, null=True, blank=True, on_delete=models.SET_NULL, related_name='report_filter_report_name')
    is_mandatory = models.BooleanField(default=False)
    is_default_selected = models.BooleanField(default=False)
    filter_data_type = models.IntegerField(default=0)
    filter_seleted_values = models.CharField(max_length=255, null=True, blank=True)

class LongProcessingAPIResultMapping(models.Model):
    long_processing_api = models.ForeignKey(LongProcessingApiResult, null=True, blank=True, on_delete=models.SET_NULL, related_name='long_processing_api_result_report_mapping_long_processing_api')
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

class ReportDocumentMapping(models.Model):
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='report_document_mapping_document')
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='report_document_mapping_report')

class ReportGroupHeading(models.Model):
    heading = models.CharField(max_length=255)
    heading_alias = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ReportGroupName(models.Model):
    report = models.ForeignKey(Report, on_delete=models.CASCADE, related_name='report_group_name_report')
    group_name = models.CharField(max_length=255)
    group_alias = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    report_group_heading = models.ForeignKey(ReportGroupHeading, on_delete=models.CASCADE, related_name='report_group_name_report_group_heading')

class ReportGroupNameValuesMapping(models.Model):
    report_group_name = models.ForeignKey(ReportGroupName, on_delete=models.CASCADE, related_name='report_group_name_values_mapping_report_group_name')
    type = models.CharField(max_length=255)
    value = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)