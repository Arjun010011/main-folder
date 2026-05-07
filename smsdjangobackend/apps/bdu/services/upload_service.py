import importlib

import pyexcel
from django.apps import apps
from django.utils.module_loading import import_string
from rest_framework import exceptions

from apps.bdu.models import BduColumn
from apps.bdu.serializers import BduGetColumnSerializer, BduColumnSerializer
from apps.bdu.services.bdu_service import write_to_s3_file
from apps.bdu.services.validate_service import validate_main
from apps.bdu.utils import trim
from apps.notification.models.notification import NotificationApiConfiguration
from apps.shared.services import UploadTypeService, SharedService

supportedExtension = ['xls', 'xlsx']

def bdu_upload_file(self, request, *args, **kwargs):
    if request.FILES:
        file = request.FILES['uploads']  # fileObject
        filename = file.name
        extension = filename.split('.')[-1]
        # if bdu.bulk_upload_supported:
        #     supportedExtension = ['csv']
        if extension not in supportedExtension:
            raise exceptions.ValidationError('File format supports xls, xlsx!')
        content = file.read()
        sheet = pyexcel.get_sheet(file_type='xlsx', file_content=content, name_columns_by_row=0)
        if sheet.number_of_rows() < 1:
            raise exceptions.ValidationError('There is no data in the sheet. Please fill and upload it again.')
        if sheet.number_of_rows() > 5000:
            raise exceptions.ValidationError('Max limit is 5000, file has crossed more than the max limit.')
        validate_data_from_file(sheet)
        return validate_data(self, sheet)
    else:
        # data = validate_data_from_data(request.data)
        raise exceptions.ValidationError('Please select a file.')


def validate_data_from_file(sheet):
    colnames = trim(sheet.colnames)
    data = [name.replace('*', '') for name in colnames]
    sheet.colnames = data


def validate_data_from_data(data):
    res = {}
    colnames = trim(data['columns'])
    res['heading'] = colnames
    colsList = [name.replace('*', '') for name in colnames]
    res['columns'] = colsList
    res['rows'] = data['data']
    return res


def validate_data(self, sheet, include_hidden_column=False, update=False):
    bdu = get_detail(self, True)
    upload_type = bdu['data']['bdu']['upload_type']
    coumn_definitions, alias_scheme_column, schema_column_alias = prepare_column_definitions(bdu['data']['columns'])
    get_all_columns = list()
    email_id = None
    if self.request.user.student and self.request.user.student.email:
        email_id = self.request.user.student.email
    elif self.request.user.staff and self.request.user.staff.email:
        email_id = self.request.user.staff.email
    if not email_id:
        raise exceptions.ValidationError('Email is not configured for you, Please configure the email id before uploading the data')
    if not NotificationApiConfiguration.objects.filter(
        api_name='bduupload_update', notification_medium='email',
        enable_for_school=True
    ):
        raise exceptions.ValidationError('bduupload_update not enabled for notifications')
    for column_name, column_datas in coumn_definitions.items():  # coumn_definitions
        if not column_datas['exclude_from_view'] and ((column_datas['update_allowed'] and upload_type != 'insert') or (upload_type == 'insert')):
            get_all_columns.append(column_datas['alias'])
    if not get_all_columns:
        raise exceptions.ValidationError('There are no columns in the bdu, hence you cannot upload the data.')
    original_column_count = len(get_all_columns)
    data_uploaded_column_count = sheet.number_of_columns()  # len(data['columns'])
    if 'id' in sheet.colnames:  # data['columns']
        data_uploaded_column_count = data_uploaded_column_count - 1
    # uncomment below once completed developing bdu
    for col in sheet.colnames:
        if col not in get_all_columns:
            raise exceptions.ValidationError(
                f'{col} There are mismatch of headers. Download the template, fill data and upload it again.')
    if data_uploaded_column_count != original_column_count:
        raise exceptions.ValidationError(
            'There are mismatch of headers. Download the template, fill data and upload it again.')
    required_cols_not_present = requiredColumnsNotPresent(sheet.colnames, upload_type, coumn_definitions)
    if required_cols_not_present and (not update):
        raise exceptions.ValidationError('Mandatory columns in Sheet ' + required_cols_not_present.__str__())
    elif '' in sheet.colnames:
        raise exceptions.ValidationError('The column header should not be empty.')
    else:
        app_table = bdu['data']['bdu']['primary_table'].split('.')
        s3_upload_response = UploadTypeService.upload_file(self, {'file': self.request.FILES['uploads']}, path='bdu')
        s3_file = s3_upload_response['data']
        res = validate_and_add_data(self, coumn_definitions, s3_file, sheet, upload_type, app_table,
                                    update, bdu, alias_scheme_column, schema_column_alias)
        #SharedService.custom_thread(validate_and_add_data, self, coumn_definitions, s3_file, sheet, upload_type, app_table,
                                    #update, bdu, alias_scheme_column, schema_column_alias)
    return {'Reason': 'Data upload is in progress. The status will be sent your mail.', 'data': {}}


def validate_and_add_data(self, columnDefinitions, S3File, sheet, uploadType, appTable, update, bdu,
                          aliasSchemaColumn, schemaColumnAlias):
    response = validate_main(self, columnDefinitions, sheet, uploadType, appTable[1])
    if not update and not response['Reason']:
        response = custom_hook(self, bdu['data']['bdu']['process_hook'], response['data'], aliasSchemaColumn,
                               schemaColumnAlias, bdu['data']['bdu']['process_function'],
                               appTable, 'validate')
    response['S3File'] = S3File
    response['bdu_name'] = bdu['data']['bdu']['name']
    write_to_s3_file(self, response)
    return response

def get_detail(self, all_column_data=False, includes_ignored=False, download_data=False):
    response = {'Reason': '', 'data': {}}
    bdu = self.get_object()
    serializer = self.get_serializer(bdu)
    response['data']['bdu'] = serializer.data
    conditions = {'bdu': bdu.pk, 'ignored': False}
    # It will be useful in exportJSON function to get all the columns defined for bdu
    if includes_ignored:
        conditions = {'bdu': bdu.pk}
    if all_column_data:
        if download_data:
            conditions = {'bdu': bdu.pk}
        queryset = BduColumn.objects.filter(**conditions)
        columns = BduColumnSerializer(queryset, many=True).data
        # columns = BduColumn.objects.filter(**conditions).values()
    else:
        queryset = BduColumn.objects.filter(**conditions)
        columns = BduGetColumnSerializer(queryset, many=True).data
        # columns = BduColumn.objects.filter(**conditions).values('id', 'alias')
    if not columns:
        raise exceptions.ValidationError('No columns are defined for this BDU. Unable to generate file.')
    if all_column_data and download_data:
        column = list()
        for value in columns:
            if not value['ignored']:
                column.append(value)
        columns = column
    response['data']['columns'] = columns
    # bduColumnsIds = [i['id'] for i in columns]
    # response['data']['bduvalidation'] = BduValidation.objects.filter(bdu_column__in=bduColumnsIds).values()
    return response


def prepare_column_definitions(bduColumns=None, bduValidations=None):
    # columnDefinitions = {i['alias']: i for i in bduColumns}
    columnDefinitions = dict()
    aliasSchemaColumn = dict()
    schemaColumnAlias = dict()
    for i in bduColumns:
        columnDefinitions.update({i['alias']: i})
        aliasSchemaColumn.update({i['alias']: i['schema_column']})
        schemaColumnAlias.update({i['schema_column']: i['alias']})
    # if bduValidations is None:
    #     bduValidations = list()
    # if bduColumns is None:
    #     bduColumns = list()
    # bduValidations = {i['bdu_column_id']: i for i in bduValidations}
    # for bduColumn in bduColumns:
    #     columnName = bduColumn['alias']
    #     columnId = bduColumn['id']
    #     columnDefinitions[columnName] = bduColumn
    #     validations = list()
    #     if bduValidations.get(columnId):
    #         validations.append(bduValidations[columnId])
    #     columnDefinitions[columnName]['validation'] = validations
    return columnDefinitions, aliasSchemaColumn, schemaColumnAlias


def getMandatoryColumns(columnDefinitions):
    columns = list()
    for alias, bduColumn in columnDefinitions.items():
        if bduColumn['required']:
            columns.append(alias)
    return columns


def getUpdateAllowedColumns(columnDefinitions):
    columns = list()
    for alias, bduColumn in columnDefinitions.items():
        if bduColumn['update_allowed']:
            columns.append(alias)
    return columns


def requiredColumnsNotPresent(columns, uploadType, columnDefinitions):
    if uploadType == 'insert':
        requiredColumns = getMandatoryColumns(columnDefinitions)
    else:
        requiredColumns = getUpdateAllowedColumns(columnDefinitions)
    return list(set(requiredColumns) - set(columns))


def custom_hook(self, hook, rows=None, aliasSchemaColumn=None, schemaColumnAlias=None,
                processFunction=None, appTable=None, type='validate', csvInput=False):
    if schemaColumnAlias is None:
        schemaColumnAlias = dict()
    if aliasSchemaColumn is None:
        aliasSchemaColumn = dict()
    if rows is None:
        rows = list()
    if not hook or not processFunction:
        hook = 'common_upload'
        processFunction = 'add_bulk_data'
        model = apps.get_model(appTable[0], appTable[1])
        self.serializer_class = import_string(f'apps.{appTable[0]}.serializers.{model.__name__}Serializer')
    try:
        service = importlib.import_module(f'apps.bdu.services.{hook}')
    except Exception as e:
        raise exceptions.ValidationError(e)
    if not callable(getattr(service, processFunction)):
        raise exceptions.ValidationError(
            f'The process function {processFunction} does not exist in the BDU Hook {hook}')
    my_function = getattr(service, processFunction)
    response = my_function(self, rows, aliasSchemaColumn, schemaColumnAlias)
    return response
