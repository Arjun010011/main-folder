import json
from django.db import transaction
from rest_framework import exceptions

from apps.forms.serializers import (ApplicationStudentDetailSerializer, ApplicationStudentBulkAddressSerializer,
                                    ApplicationParentDetailSerializer, ApplicationGuardianDetailSerializer,
                                    ApplicationStudentAddressSerializer, ApplicationStudentParentMappingSerializer,
                                    ApplicationStudentSerializer)
from apps.forms.models import EnquiryStudent
from apps.bdu.services.error import error_validation, common_response
from apps.shared.models import Counter
from apps.shared.models.custom import CustomForm
from apps.shared.serializers import CustomDataSerializer
from apps.shared.services import CounterService
from apps.shared.services_shared.custom import  add_custom_form_data_bdu, validate_and_filter_only_custom_data
from apps.tenants.services.middlewares import get_current_db_name


def add_bulk_application_student(self, rows, aliasSchemaColumn, schemaColumnAlias):
    global kwargs
    parent = guardian = None
    response = {'Reason': dict(), 'error': False}
    schema_rows = list()
    enquiry_list = list()
    student_detail = parent_detail = guardian_detail = address = False
    if 'mother_tongue' in schemaColumnAlias or 'aadhar_num' in schemaColumnAlias:
        student_detail = True
    if 'address' in schemaColumnAlias:
        address = True
    if 'father_name' in schemaColumnAlias or 'mother_name' in schemaColumnAlias:
        parent_detail = True
    if 'guardian_name' in schemaColumnAlias:
        guardian_detail = True
    if 'entry_academic_year' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'entry_academic_year', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'current_standard' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'current_standard', 'Please make this field as Mandatory',
                                   {2: {}})
    application_format = Counter.objects.filter(type=CounterService.COUNTERS['APPLICATION']['type']).first()
    if not application_format:
        response = common_response(self, response, 2, 'application_num', 'Application format is not set.',
                                   {2: {}})
    custom_form_data = CustomForm.objects.filter(form_for='application_form', is_active=True).first()
    custom_modified_datas = []
    application_num_counter = list()
    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        error_dict = {index: {}}
        for key, value in row.items():
            temp_dict[aliasSchemaColumn[key]] = value
            if aliasSchemaColumn[key] == 'enquiry':
                enquiry_list.append(value)
            elif aliasSchemaColumn[key] == 'current_standard' and (not temp_dict['current_standard']):
                response = common_response(self, response, index, 'current_standard', 'This field is Mandatory.',
                                           error_dict)
            elif aliasSchemaColumn[key] == 'entry_academic_year' and (not temp_dict['entry_academic_year']):
                response = common_response(self, response, index, 'entry_academic_year', 'This field is Mandatory.',
                                           error_dict)
            elif aliasSchemaColumn[key] == 'application_num' and application_format:
                if temp_dict['application_num']:
                    application_number = str(temp_dict['application_num'])
                    if is_application_number_valid(application_format, application_number):
                        response = is_application_valid_number(self, response, index, error_dict, application_number,
                                                               application_num_counter)
                    else:
                        response = common_response(self, response, index, 'application_num',
                                                   'Application number format is invalid.', error_dict)
                # else:
                #     response = common_response(self, response, index, 'application_num', 'This field is Mandatory.',
                #                                error_dict)
        if address:
            temp_dict.update({'type': 'CP'})
        schema_rows.append(temp_dict)
    if enquiry_list:
        enquiry_dict = dict(EnquiryStudent.objects.filter(enquiry_num__in=enquiry_list).values_list('enquiry_num', 'id'))
        for row, enquirty_data_list in enumerate(schema_rows, 2):
            try:
                enquirty_data_list['enquiry'] = enquiry_dict[enquirty_data_list['enquiry']]
            except Exception:
                pass
    student_serializer = ApplicationStudentSerializer(data=schema_rows, many=True, allow_null=False)
    student_serializer.is_valid()
    response = error_validation(self, student_serializer.errors, schemaColumnAlias, response)
    if student_detail:
        student_detail_serializer = ApplicationStudentDetailSerializer(data=schema_rows, many=True, allow_null=False,
                                                                       remove_fields=['application_student'])
        student_detail_serializer.is_valid()
        response = error_validation(self, student_detail_serializer.errors, schemaColumnAlias, response)
    if address:
        address_serializer = ApplicationStudentBulkAddressSerializer(data=schema_rows, many=True, allow_null=False)
        address_serializer.is_valid()
        response = error_validation(self, address_serializer.errors, schemaColumnAlias, response)
    if parent_detail:
        parent_serializer = ApplicationParentDetailSerializer(data=schema_rows, many=True, allow_null=False)
        parent_serializer.is_valid()
        response = error_validation(self, parent_serializer.errors, schemaColumnAlias, response)
    if guardian_detail:
        guardian_serializer = ApplicationGuardianDetailSerializer(data=schema_rows, many=True, allow_null=False)
        guardian_serializer.is_valid()
        response = error_validation(self, guardian_serializer.errors, schemaColumnAlias, response)
    if custom_form_data:
        custom_modified_datas, response = validate_and_filter_only_custom_data(self, custom_form_data, schema_rows, 'ApplicationStudent')
    if response['Reason']:
        response['error'] = True
        return response
    try:
        with transaction.atomic(using=get_current_db_name()):
            student_serializer = ApplicationStudentSerializer(data=schema_rows, many=True)
            student_serializer.is_valid(raise_exception=True)
            student = student_serializer.save()
            if len(student) != len(schema_rows):
                raise exceptions.ValidationError('rows not equal to students')
            [j.update({'application_student': i.pk}) for i, j in zip(student, schema_rows)]
            if student_detail:
                serializer = ApplicationStudentDetailSerializer(data=schema_rows, many=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            if address:
                serializer = ApplicationStudentAddressSerializer(data=schema_rows, many=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            if parent_detail:
                serializer = ApplicationParentDetailSerializer(data=schema_rows, many=True)
                serializer.is_valid(raise_exception=True)
                parent = serializer.save()
                [j.update({'application_parent': i.pk}) for i, j in zip(parent, schema_rows)]
            if guardian_detail:
                serializer = ApplicationGuardianDetailSerializer(data=schema_rows, many=True)
                serializer.is_valid(raise_exception=True)
                guardian = serializer.save()
                [j.update({'application_guardian': i.pk}) for i, j in zip(guardian, schema_rows)]
            if parent or guardian:
                map_serializer = ApplicationStudentParentMappingSerializer(data=schema_rows, many=True)
                map_serializer.is_valid(raise_exception=True)  # raise exception from serializer
                map_serializer.save()
            if application_format and application_num_counter:
                application_num_counter.sort()
                application_format.value = application_num_counter[-1] + 1
                application_format.save()
            if custom_modified_datas:
                add_custom_form_data_bdu(self, schema_rows, custom_modified_datas, 'application_student')
    except Exception as e:
        response['error'] = True
        response = common_response(self, response, 2, 'error', e.args, {2: {}})
        return response
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response

def is_application_valid_number(self, response, index, errorDict, application_number, application_num_counter):
    if 0 < application_number < 10000:
        application_num_counter.append(application_number)
    else:
        response = common_response(self, response, index, 'application_num',
                                   'Application number should be between 1 to 9999.', errorDict)
    return response


def is_application_number_valid(application_format, application_number):
    if application_number.startswith(application_format.prefix):
        application_number = application_number.replace(application_format.prefix, '', 1)
    else:
        return False
    if application_format.postfix and application_number.endswith(application_format.postfix):
        application_number = ''.join(application_number.rsplit(application_format.postfix, 1))
    else:
        return False
    return application_number.isnumeric()
