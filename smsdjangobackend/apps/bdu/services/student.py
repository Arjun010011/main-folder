import json

from django.db import transaction
from rest_framework import exceptions
from apps.classes.models.standard import StandardSectionMapping

from apps.classes.serializers import EnrollmentSerializer, StudentStandardMappingSerializer
from apps.forms.models import ApplicationStudent
from apps.institutes.models.institute import Institute
from apps.bdu.services.error import error_validation, common_response
from apps.shared.models.custom import CustomForm
from apps.shared.services import SharedService
from apps.shared.services_shared.custom import add_custom_form_data_bdu, validate_and_filter_only_custom_data
from apps.shared.utils import http_request
from apps.students.models import Student
from apps.students.serializers import (StudentSerializer, StudentDetailSerializer, ParentDetailSerializer,
                                       StudentAddressSerializer, StudentParentMappingSerializer,
                                       GuardianDetailSerializer, StudentBulkAddressSerializer)
from apps.students.services.student import add_student_to_admission_form, get_student_id_fuzzy
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from django.conf import settings
from apps.users.serializers import UserSerializer

from apps.users.services.user import check_username

SERVER_URL = getattr(settings, 'SERVER_URL', None)

def add_bulk_student(self, rows, alias, schemaColumnAlias):
    global kwargs
    parent = guardian = None
    response = {'Reason': dict()}
    schema_rows = list()
    appln_list = list()
    username_list = {'username': {}}
    credentials = {'credentials': list()}
    parent_detail = guardian_detail = address = signup = section_id = is_section_id_exist = False
    company_id = Institute.get_institute(self).company_id
    if 'entry_academic_year' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'entry_academic_year', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'current_standard' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'current_standard', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'address' in schemaColumnAlias or 'address_one_map' in schemaColumnAlias:
        address = True
    if 'section_id' in schemaColumnAlias:
        section_id = True
    if 'father_name' in schemaColumnAlias or 'mother_name' in schemaColumnAlias:
        parent_detail = True
    if 'guardian_name' in schemaColumnAlias:
        guardian_detail = True
    if 'username' in schemaColumnAlias and 'password' in schemaColumnAlias:
        signup = True
    if 'section_id' in schemaColumnAlias and 'section_id' in schemaColumnAlias:
        is_section_id_exist = True
    custom_form_data = CustomForm.objects.filter(form_for='admission_form', is_active=True).first()
    custom_modified_datas = []
    academic_year_list = set()
    standard_list = set()
    section_list = set()
    standard_section_mapping_data = {}
    standard_section_data = StandardSectionMapping.objects.all().values()
    if is_section_id_exist:
        for stnd_sec in standard_section_data:
            if stnd_sec['academic_year_id'] not in standard_section_mapping_data:
                standard_section_mapping_data[stnd_sec['academic_year_id']] = {}
            if stnd_sec['standard_id'] not in standard_section_mapping_data[stnd_sec['academic_year_id']]:
                standard_section_mapping_data[stnd_sec['academic_year_id']][stnd_sec['standard_id']] = {}
            if stnd_sec['section_id'] not in standard_section_mapping_data[stnd_sec['academic_year_id']][stnd_sec['standard_id']]:
                standard_section_mapping_data[stnd_sec['academic_year_id']][stnd_sec['standard_id']][stnd_sec['section_id']] = stnd_sec['id']
    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        cred = dict()
        error_dict = {index: {}}
        is_address_data_exist = False
        for key, value in row.items():
            temp_dict[alias[key]] = value
            if alias[key] == 'application':
                appln_list.append(value)
            if signup:
                if alias[key] == 'username':
                    if value in username_list['username']:
                        response = common_response(self, response, index, 'username', 'Username Exist in the Given Sheet Itself.',
                                           error_dict)
                    username_list['username'][value] = {'username': value}
                    cred.update({'username': value})
                if alias[key] == 'password':
                    cred.update({'password': str(value)})
            if alias[key] == 'current_standard' and (not temp_dict['current_standard']):
                response = common_response(self, response, index, 'current_standard', 'This field is Mandatory.',
                                      error_dict)
            if alias[key] == 'current_standard':
                standard_list.add(value)
            if alias[key] == 'entry_academic_year' and (not temp_dict['entry_academic_year']):
                response = common_response(self, response, index, 'entry_academic_year', 'This field is Mandatory.',
                                           error_dict)
            if alias[key] == 'entry_academic_year':
                academic_year_list.add(value)
            if alias[key] == 'section_id':
                section_list.add(value)
        if 'aadhar_num' in temp_dict and temp_dict['aadhar_num'] and 'eid_num' in temp_dict and temp_dict['eid_num']:
            response = common_response(self, response, index, 'aadhar_num', 'when aadhar_number is provided. Eid number is not needed',
                                        error_dict)
        if 'address' in temp_dict and temp_dict['address']:
            temp_dict.update({'address': temp_dict['address']})
            is_address_data_exist = True
        elif 'address_one_map' in temp_dict and temp_dict['address_one_map']:
            temp_dict.update({'address_one_map': temp_dict['address_one_map']})
            temp_dict.update({'address': temp_dict['address_one_map']})
            is_address_data_exist = True
        if 'city' in temp_dict and temp_dict['city']:
            is_address_data_exist = True
        if 'district' in temp_dict and temp_dict['district']:
            is_address_data_exist = True
        if 'country' in temp_dict and temp_dict['country']:
            is_address_data_exist = True
        if 'state' in temp_dict and temp_dict['state']:
            is_address_data_exist = True
        if 'pincode' in temp_dict and temp_dict['pincode']:
            is_address_data_exist = True
        if 'latitude' in  temp_dict and temp_dict['latitude']:
            is_address_data_exist = True
        if 'longitude' in temp_dict and temp_dict['longitude']:
            is_address_data_exist = True
        if 'city_map' in temp_dict and temp_dict['city_map']:
            temp_dict.update({'city': temp_dict['city_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'district_map' in temp_dict and temp_dict['district_map']:
            temp_dict.update({'district': temp_dict['district_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'country_map' in temp_dict and temp_dict['country_map']:
            temp_dict.update({'country': temp_dict['country_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'state_map' in temp_dict and temp_dict['state_map']:
            temp_dict.update({'state': temp_dict['state_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'pincode_map' in temp_dict and temp_dict['pincode_map']:
            temp_dict.update({'pincode': temp_dict['pincode_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'latitude_map' in  temp_dict and temp_dict['latitude_map']:
            temp_dict.update({'latitude': temp_dict['latitude_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if 'longitude_map' in temp_dict and temp_dict['longitude_map']:
            temp_dict.update({'longitude': temp_dict['longitude_map']}) #temp saving all data in manual address
            is_address_data_exist = True
        if is_address_data_exist:
            temp_dict.update({'type': 'CP'})
        academic_year = temp_dict.get('entry_academic_year')
        standard_id = temp_dict.get('current_standard')
        section_id = temp_dict.get('section_id')
        if is_section_id_exist and section_id and (int(academic_year) not in standard_section_mapping_data or int(standard_id) not in standard_section_mapping_data[int(academic_year)] or section_id not in standard_section_mapping_data[int(academic_year)][int(standard_id)]):
                response = common_response(self, response, index, 'section_id', f'Invalid section id . {standard_section_mapping_data}',
                                                error_dict)
        if is_address_data_exist:
            address_serializer = StudentBulkAddressSerializer(data=temp_dict, allow_null=False)
            address_serializer.is_valid()
            if address_serializer.errors:
                response = common_response(self, response, index, 'address', address_serializer.errors,
                                        error_dict)
        if parent_detail:
            parent_data = {}
            if ('father_name' in row and row['father_name']) or ('mother_name' in row and row['mother_name']):
                parent_data = row
            if parent_data:
                parent_serializer = ParentDetailSerializer(data=parent_data, allow_null=False)
                parent_serializer.is_valid()
                if parent_serializer.errors:
                    response = common_response(self, response, index, 'father_name', parent_serializer.error_messages,
                                        error_dict)
        if guardian_detail:
            guardian_data = []
            if 'guardian_name' in row and row['guardian_name']:
                guardian_data.append(row)
            if guardian_data:
                guardian_serializer = GuardianDetailSerializer(data=guardian_data, allow_null=False)
                guardian_serializer.is_valid()
                if guardian_serializer.errors:
                    response = common_response(self, response, index, 'guardian_name', guardian_serializer.errors,
                                        error_dict)
        if 'student_type' not in temp_dict or (not temp_dict['student_type']):
            temp_dict['student_type'] = 'Day Scholar'
        credentials['credentials'].append(cred)
        schema_rows.append(temp_dict)
    student_serializer = StudentSerializer(data=schema_rows, many=True, allow_null=False)
    student_serializer.is_valid()
    response = error_validation(self, student_serializer.errors, schemaColumnAlias, response)
    user_serializer = UserSerializer(data=credentials['credentials'], many=True, allow_null=False)
    user_serializer.is_valid()
    response = error_validation(self, user_serializer.errors, schemaColumnAlias, response)
    if 'application' in schemaColumnAlias:
        application_dict = dict(
            ApplicationStudent.objects.filter(application_num__in=appln_list).values_list('application_num', 'id'))
        for application_data_list in schema_rows:
            try:
                application_data_list['application'] = application_dict[application_data_list['application']]
            except Exception:
                pass
    student_detail_serializer = StudentDetailSerializer(data=schema_rows, many=True, allow_null=False,
                                                        remove_fields=['student'])
    student_detail_serializer.is_valid()
    response = error_validation(self, student_detail_serializer.errors, schemaColumnAlias, response)
    for schema in schema_rows:
        pass
    if custom_form_data:
        custom_modified_datas, response = validate_and_filter_only_custom_data(self, response, custom_form_data, schema_rows, 'Student')
    if signup:
        kwargs = SharedService.get_edubricz_header(self)
        post_data = {'company': company_id, 'user_list': username_list}
        remote_response = http_request('POST', SERVER_URL + 'users/checkusernames/', json.dumps(post_data),
                                        **kwargs)
        if remote_response.status_code == 200:
            remote_response = remote_response.json()
            res = check_username(self, username_list)
            if (not remote_response['Result']) or (not res['Result']):
                for index, row in enumerate(schema_rows, start=2):
                    errorDict = {index: {}}
                    if ('data' in remote_response and str(row['username']) in remote_response['data']):
                        response = common_response(self, response, index, 'username', remote_response['Reason'],
                                                    errorDict)
                    elif 'data' in res and row['username'] in res['data']:
                        response = common_response(self, response, index, 'username', res['Reason'],
                                                    errorDict)
                if not response['Reason']:
                    response = common_response(self, response, 2, 'username', 'username already exists',
                                                    {2: {}})
        else:
            response = common_response(self, response, 2, 'username', remote_response.json(),
                                         {2: {}})
    if response['Reason']:
        response['error'] = True
        return response
    try:
        with transaction.atomic(using=get_current_db_name()):
            student_serializer = StudentSerializer(data=schema_rows, many=True)
            student_serializer.is_valid(raise_exception=True)
            student = student_serializer.save()
            if len(student) != len(schema_rows):
                raise exceptions.ValidationError('rows not equal to students')
            save_enrollment_data = []
            for i, j in zip(student, schema_rows):
                section = j['section_id'] if 'section_id' in j and j['section_id'] else None
                j.update({
                    'student': i.pk,
                    'standard': j['current_standard'],
                    'academic_year': j['entry_academic_year'],
                })
                if section:
                    j.update({'section': section})
                academic_year = j['entry_academic_year']
                standard = j['current_standard']
                if section:
                    save_enrollment_data.append({
                        'student': i.pk,
                        'standard_section': standard_section_mapping_data[academic_year][standard][section]
                    })
            student_standard = StudentStandardMappingSerializer(data=schema_rows, many=True)
            student_standard.is_valid(raise_exception=True)
            student_standard.save()
            student_standard = EnrollmentSerializer(data=save_enrollment_data, many=True)
            student_standard.is_valid(raise_exception=True)
            student_standard.save()
            if signup:
                extra_fields = {'groups': [7]}
                for user in schema_rows:
                    if 'mobile_num' in user:
                        extra_fields['mobile_num'] = user['mobile_num']
                    else:
                        extra_fields['mobile_num'] = None
                    if 'email' in user:
                        extra_fields['email'] = user['email']
                    else:
                        extra_fields['email'] = None
                    user['password'] = str(user['password'])
                    User.objects._create_user(username=user['username'], password=user['password'],is_central_signup=False,
                                                student=Student.objects.get(id=user['student']), **extra_fields)
            serializer = StudentDetailSerializer(data=schema_rows, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            if address:
                serializer = StudentAddressSerializer(data=schema_rows, many=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            if parent_detail:
                parent_data = []
                for schema in schema_rows: #nikhil put error when other fields given but not name
                    if schema['father_name'] or schema['mother_name']:
                        parent_data.append(schema)
                if parent_data:
                    serializer = ParentDetailSerializer(data=parent_data, many=True)
                    serializer.is_valid(raise_exception=True)
                    parent = serializer.save()
                    [j.update({'parent': i.pk}) for i, j in zip(parent, schema_rows)]
            if guardian_detail:
                guardian_data = []
                for schema in schema_rows:#nikhil put error when other fields given but not name
                    if schema['guardian_name']:
                        guardian_data.append(schema)
                if guardian_data:
                    serializer = GuardianDetailSerializer(data=guardian_data, many=True)
                    serializer.is_valid(raise_exception=True)
                    guardian = serializer.save()
                    [j.update({'guardian': i.pk}) for i, j in zip(guardian, schema_rows)]
            if parent or guardian:
                map_serializer = StudentParentMappingSerializer(data=schema_rows, many=True)
                map_serializer.is_valid(raise_exception=True)  # raise exception from serializer
                map_serializer.save()
            if custom_modified_datas:
                add_custom_form_data_bdu(self, schema_rows, custom_modified_datas, 'student')
            for schema_row in schema_rows:
                if not schema_row['admission_num']:
                    schema_row['admission_num'] = None
                add_student_to_admission_form(
                    self, schema_row['entry_academic_year'], schema_row['student'], schema_row['current_standard'],
                    schema_row['admission_num'], schema_row['admission_date'])
            if signup:
                credentials['company_id'] = company_id
                remote_response = http_request('POST', SERVER_URL + 'users/multiplesignup/', json.dumps(credentials),
                                            **kwargs)
                if remote_response.status_code != 200 or (not remote_response.json()['Result']):
                    raise exceptions.ValidationError(remote_response.json())
    except Exception as e:
        # Delete if username is created in Server
        if signup:
            temp_username_list = []
            for user in username_list['username']:
                temp_username_list.append(username_list['username'][user]['username'])
            http_request('DELETE', SERVER_URL + 'users/multiplesignup/'+str(company_id)+'/', json.dumps({'username': temp_username_list}), **kwargs)
        response = common_response(self, response, 2, 'error', e.args, {2: {}})
        response['error'] = True
        return response
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response

# def temp_update_student(self, rows, alias, schemaColumnAlias):
#     response = {'Reason': dict()}
#     for index, row in enumerate(rows, start=2):
#         Student.objects.filter(first_name=row['first name'], dob=row['dob']).update(last_name=row['last name'])
#     return response


def add_student_reg_num(self, rows, aliasSchemaColumn, schemaColumnAlias):
    response = {'Reason': dict(), 'error': False}
    schema_rows = list()
    seen_rfids = {}


    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        for key, value in row.items():
            temp_dict[aliasSchemaColumn[key]] = value

        academic_year_id = temp_dict.get('academic_year_id')
        standard_id = temp_dict.get('standard_id')
        student_name = temp_dict.get('student_name')
        current_reg_num = str(temp_dict.get('current_reg_num')).strip() if temp_dict.get('current_reg_num') else None

        student_id = get_student_id_fuzzy(student_name, standard_id, academic_year_id)
        if not student_id:
            response = common_response(
                self, response, index, 'student_name',
                f'Student "{student_name}" not found for the given standard and academic year',
                {index: {}}
            )
            continue

        if not current_reg_num:
            response = common_response(self, response, index, 'current_reg_num', 'Register Number value is required', {index: {}})
            continue

        if current_reg_num in seen_rfids:
            response = common_response(
                self, response, index, 'rfid',
                f'RFID "{current_reg_num}" is already used in row {seen_rfids[current_reg_num]} in this sheet',
                {index: {}}
            )
            continue
        seen_rfids[current_reg_num] = index

        existing_rfid = Student.objects.filter(current_reg_num=current_reg_num).exclude(id=student_id).first()
        if existing_rfid:
            response = common_response(
                self, response, index, 'rfid',
                f'RFID "{current_reg_num}" is already assigned to another student in the database',
                {index: {}}
            )
            continue

        temp_dict['student'] = student_id
        temp_dict['current_reg_num'] = current_reg_num
        schema_rows.append(temp_dict)

    if response['Reason']:
        response['error'] = True
        return response

    try:
        with transaction.atomic(using=get_current_db_name()):
            request = type("Request", (), {})()  # Create a dummy request object
            request.data = {"rfid_datas": schema_rows}
            for schema in schema_rows:
                s = Student.objects.get(id=schema['student'])
                s.current_reg_num = schema['current_reg_num']
                s.save()
    except Exception as e:
        response['error'] = True
        response = common_response(self, response, index, 'error', f'Error: {str(e)}', {index: {}})
        return response

    response['Reason'] = 'Student Data Updated Successfully!'
    response['error'] = False
    return response
