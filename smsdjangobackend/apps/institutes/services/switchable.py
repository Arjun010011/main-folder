from copy import copy
from rest_framework.exceptions import ValidationError
from django.db import transaction
from apps.institutes.models.institute import Institute

from apps.institutes.models.sibling_institute import SwitchableInstitute, UserSwitchableInstituteMapping
from apps.shared.services import SharedService
from apps.shared.services_shared.common import get_full_name
from apps.shared.utils import http_request
from apps.tenants.services.middlewares import get_current_db_name, set_db_for_router
from apps.tenants.services.utils import get_current_database_name
from apps.users.models.user import User
from django.conf import settings

EDUBRICZ_SIGNUP_COMMUNICATION_KEY = getattr(settings, 'EDUBRICZ_SIGNUP_COMMUNICATION_KEY', None)
SERVER_URL = getattr(settings, 'SERVER_URL', None)


def get_sibling_company_data(self, company_id):
    kwargs = SharedService.get_edubricz_header(self)
    url = SERVER_URL + 'company/company/' + str(company_id)
    remote_response = http_request('GET', url, None, {}, **kwargs)
    if remote_response.status_code != 200:
        raise ValidationError(remote_response.json())
    return remote_response.json()['data']

def create_switchable_institute(self, data):
    mandatory_fields = ['company_id']
    SharedService.check_mandatory_field_in_list(mandatory_fields, data)
    remote_response = get_sibling_company_data(self, data['company_id'])
    inst_obj = Institute.objects.using(remote_response['database_name']).get(id=data['company_id'])
    current_db_inst_obj = Institute.objects.all().first()
    if inst_obj.company_id != data['company_id']:
        raise ValidationError('company_id and given company id is not matching')
    with transaction.atomic(using=get_current_db_name()):
        data['database_name'] = inst_obj.database_name
        response = SharedService.add_or_update_data(self, [data])
        set_db_for_router(remote_response['database_name'])
        data['database_name'] = current_db_inst_obj.database_name
        data['company_id'] = current_db_inst_obj.company_id
        with transaction.atomic(using=remote_response['database_name']):
            SharedService.add_or_update_data(self, [data])
    return response

def create_user_switchable(self, data):
    response = {'Reason': 'Data Added Successfully'}
    existing_data_sets = UserSwitchableInstituteMapping.objects.all().values(
        'switchable_institute_user_id', 'user_id'
    )
    existing_switchable_institute_user_ids = {}
    existing_user_ids = {}
    for existing in existing_data_sets:
        existing_switchable_institute_user_ids[existing['switchable_institute_user_id']] = ''
        existing_user_ids[existing['user_id']] = ''
    switchable_inst_id = data['switchable_institute']
    current_db = get_current_db_name()
    current_selected_db_name = get_current_database_name(current_db)
    """ Other Company Data"""
    switchable_company_data = SwitchableInstitute.objects.get(id=switchable_inst_id)
    other_institute = SwitchableInstitute.objects.using(switchable_company_data.database_name).filter(
        database_name=current_selected_db_name, is_active=True
    ).first()
    switch_able_user_data = User.objects.using(switchable_company_data.database_name).filter(id__in=existing_switchable_institute_user_ids.keys()).values()
    sibling_company_data = get_sibling_company_data(self, switchable_inst_id)
    other_company_database_key = sibling_company_data['database_key']
    if len(switch_able_user_data) != len(existing_switchable_institute_user_ids.keys()):
        raise ValidationError('missing user data')
    if not switchable_inst_id:
        raise ValidationError('switchable_inst_id is mandatory')
    data_to_save = []
    data_to_save_other_db = []
    error_user_ids = []
    error_switchable_user_ids = []
    error_data = ''
    for row_data in data['user_list']:
        temp_data = copy(row_data)
        if row_data['switchable_institute_user_id'] in existing_switchable_institute_user_ids:
            error_switchable_user_ids.append(row_data['switchable_institute_user_id'])
        elif row_data['user'] in existing_user_ids:
            error_user_ids.append(row_data['user'])
        temp_data['switchable_institute'] = switchable_inst_id
        data_to_save.append(temp_data)
        temp_data = copy(row_data)
        temp_data['user']= row_data['switchable_institute_user_id']
        temp_data['switchable_institute_user_id'] = row_data['user']
        temp_data['switchable_institute'] = other_institute.id
        data_to_save_other_db.append(temp_data)
    if error_user_ids:
        name = ''
        error_data += 'Duplicate users : '
        user_data = User.objects.filter(
            id__in=error_user_ids
        ).values('staff__first_name', 'staff__middle_name', 'staff__last_name',
            'student__first_name', 'student__middle_name', 'student__last_name'
        )
        for user in user_data:
            if user['staff__first_name']:
                name = get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name'])
            elif user['student__first_name']:
                name = get_full_name(
                    user['student__first_name'], user['student__middle_name'], user['student__last_name']
                )
            error_data += ' ' + name
    if error_switchable_user_ids:
        name = ''
        error_data += 'Switchable Company Duplicate users :'
        user_data = User.objects.using(switchable_company_data.database_name).filter(
            id__in=error_switchable_user_ids
        ).values('staff__first_name', 'staff__middle_name', 'staff__last_name',
            'student__first_name', 'student__middle_name', 'student__last_name'
        )
        for user in user_data:
            if user['staff__first_name']:
                name = get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name'])
            elif user['student__first_name']:
                name = get_full_name(
                    user['student__first_name'], user['student__middle_name'], user['student__last_name']
                )
            error_data += ' ' + name
    if error_data:
        raise ValidationError(error_data)
    with transaction.atomic(using=get_current_db_name()):
        SharedService.add_or_update_data(self, data_to_save, many=True)
        set_db_for_router(other_company_database_key)
        with transaction.atomic(using=other_company_database_key):
            SharedService.add_or_update_data(self, data_to_save_other_db, many=True)
        set_db_for_router(current_db) #reset to current connection
    return response
