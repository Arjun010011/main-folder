import json
import re
import datetime



from django.forms import ValidationError
from rest_framework import exceptions
from apps.bdu.services.validate_service import is_date, is_numeric
from apps.shared.models.custom import CustomData, CustomForm
from apps.shared.serializers import CustomDataSerializer
from apps.shared.services import SharedService, UploadTypeService
from django.contrib.contenttypes.models import ContentType
from apps.bdu.services.error import common_response

def add_custom_form(self, data):
    if not data['field_structure']:
        raise exceptions.ValidationError("Field Structure can't be empty")
    if not data['form_for']:
        raise exceptions.ValidationError('form_for is mandatory')
    validate_field_structure(self, data['field_structure'])
    #making old data inactive
    queryset = self.get_queryset().filter(
        form_for=data['form_for']
    )
    if 'id' in data and data['id']:
        queryset.exclude(id=data['id'])
    queryset.update(is_active=False)
    data['is_active'] = True
    response = SharedService.add_or_update_data(self, [data])
    return response

def validate_field_structure(self, data):
    duplicate_coming_after = []
    mandatory_fields_check = [
        'name', 'type', 'label', 'isCustom', 'required', 'className', 'form_name',
        'sub_section', 'coming_after'
    ]
    for row_data in data:
        SharedService.check_mandatory_field_in_list(mandatory_fields_check, row_data)
        if row_data['coming_after'] in duplicate_coming_after:
            raise exceptions.ValidationError('Duplicate coming_after')
        duplicate_coming_after.append(row_data['coming_after'])

def add_or_update_custom_data(self, custom_form_id, custom_data, obj):
    data_to_save = {}
    if not custom_form_id:
        raise exceptions.ValidationError('custom_form_id is mandatory')
    if not custom_data:
        raise exceptions.ValidationError('custom_data is mandatory')
    data_to_save['content_type'] = ContentType.objects.get_for_model(obj).id
    data_to_save['object_id'] = obj.id
    data_to_save['custom_field'] = custom_form_id
    data_to_save['data'] = custom_data
    custom_form_data = CustomForm.objects.filter(id=custom_form_id).values()[0]
    validate_custom_form_data(custom_form_data, custom_data)
    existing_data = CustomData.objects.filter(content_type=data_to_save['content_type'], object_id=data_to_save['object_id'], custom_field=custom_form_id)
    if existing_data:
        data_to_save['id'] = existing_data.first().id
    if 'id' in data_to_save and data_to_save['id']:
        instance = CustomData.objects.get(id=data_to_save['id'])
        serializer = CustomDataSerializer(instance=instance, data=data_to_save)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = CustomDataSerializer(data=data_to_save)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def validate_custom_form_data(custom_form_data, given_data):
    field_structure = custom_form_data['field_structure']
    fields = {}
    for field in field_structure:
        fields[field['name']] = field
    for row_data in given_data:
        if row_data not in fields:
            raise exceptions.ValidationError(f'{row_data} not exist in structure')

def get_custom_data_for_objects(self, data, model,modify_existing_data=True):
    obj_ids = []
    custom_data_mapping = {}
    for d in data:
        obj_ids.append(d['id'])
    content_obj = ContentType.objects.get(model=model)
    custom_data = CustomData.objects.filter(
        content_type=content_obj.id, object_id__in=obj_ids
    ).values('id','data', 'object_id')
    if custom_data:
        for custom in custom_data:
            custom_data_mapping[custom['object_id']] = custom
        for d in data:
            d['custom_form_data'] = {}
            if d['id'] in custom_data_mapping:
                d['custom_form_data'] = custom_data_mapping[d['id']]['data']
    if not modify_existing_data:
        custom_field_data = CustomForm.objects.filter(
            form_for='admission_form',is_active=1).values('field_structure')
        return  {'custom_data_mapping':custom_data_mapping,'custom_data': custom_field_data}
    return data

"Takes all fields and return only custom field data structure only"
def validate_and_filter_only_custom_data(self, response, custom_form_obj, rows, model):
    field_structure = custom_form_obj.field_structure
    content_type_obj_id = ContentType.objects.get(model=model).id
    field_names = {}
    savable_rows = []
    for row_data in field_structure:
        field_names[row_data['name']] = row_data
    for idx, row in enumerate(rows):
        temp = {}
        for field_name in row:
            if row[field_name] and field_name in field_names:
                temp[field_name] = convert_to_string(row[field_name])
        if temp:
            try:
                temp = valid_field_structure(self, field_names, temp)
            except Exception as e:
                temp_idx = idx + 3
                error_dict = {temp_idx: {}}
                response = common_response(self, response, temp_idx, e.args[0]['key'], e.args[0]['error'],
                                           error_dict)
            temp['data'] = json.loads(json.dumps(temp, indent=4, sort_keys=True, default=str))
            temp['content_type'] = content_type_obj_id
            temp['object_id'] = None
            temp['custom_field'] = custom_form_obj.id
        savable_rows.append(temp)
    return savable_rows, response

def convert_to_string(data):
    if isinstance(data, datetime.date):
        return data.strftime('%Y-%m-%d')
    elif isinstance(data, datetime.datetime):
        return data.strftime('%Y-%m-%d %H:%m:%S')
    return data

def add_custom_form_data_bdu(self, rows, custom_form_data, key_to_fetch_id):
    data_to_save = []
    for idx, custom in enumerate(custom_form_data):
        if custom:
            custom['object_id'] = rows[idx][key_to_fetch_id]
            data_to_save.append(custom)
    if data_to_save:
        serializer = CustomDataSerializer(data=data_to_save, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

#raise error with field name so it will be useful to show in the bdu sheets
def valid_field_structure(self, field_name_structure_mappig, data_to_be_saved):
    for name in data_to_be_saved:
        if name not in field_name_structure_mappig:
            raise exceptions.ValidationError({"key": name, 'error': 'invalid column specified'})
        if field_name_structure_mappig[name]['regex']:
            validate_regex(self, name,  field_name_structure_mappig[name]['regex'], data_to_be_saved[name])
        if field_name_structure_mappig[name]['required'] and not data_to_be_saved[name]:
            raise exceptions.ValidationError({"key": name, 'error': f'{name} this field is required'})
        if not data_to_be_saved[name]:
            continue #code stops here if no data
        if  field_name_structure_mappig[name]['type'] == 'text':
            validate_text(self, name,  data_to_be_saved[name])
        elif field_name_structure_mappig[name]['type'] == 'number':
            validate_number(self, name,  data_to_be_saved[name])
        elif field_name_structure_mappig[name]['type'] == 'date':
            validate_date(self, name,  data_to_be_saved[name])
        elif field_name_structure_mappig[name]['type'] == 'phone_number':
            data_to_be_saved[name] = validate_phone_number(self, name,  data_to_be_saved[name])
        elif field_name_structure_mappig[name]['type'] == 'dropDown':
            validate_drop_down(self, name, field_name_structure_mappig[name]['list'], data_to_be_saved[name], 'dropdown')
        elif field_name_structure_mappig[name]['type'] == 'radio':
            validate_drop_down(self, name, field_name_structure_mappig[name]['list'], data_to_be_saved[name], 'radio')
        elif field_name_structure_mappig[name]['type'] == 'switch':
            validate_switch(self, name,  data_to_be_saved[name])
    return data_to_be_saved
            

def validate_regex(self, column_name, regex, value):
    pass
    #nikhil fetch this from regex class name
    # if not re.match(regex, value):
    #     raise exceptions.ValidationError({"key": column_name, 'error': f'not matching the regex {regex}'})
    
def validate_text(self, column_name, value):
    pass

def validate_number(self, column_name, value):
    if not is_numeric(value):
        raise exceptions.ValidationError({"key": column_name, 'error': 'Invalid Number'})

def validate_date(self, column_name, value):
    try:
        if not isinstance(value, datetime.date):
            datetime.datetime.strptime(value, '%Y-%m-%d')
    except Exception as e:
        raise exceptions.ValidationError({"key": column_name, 'error': 'Invalid Date'})
    

def validate_phone_number(self, column_name, value):
    try:
        if value:
            if not str(value).startswith('+'):
                value = '+'+str(value)
        SharedService.validate_india_mobile_number(value)
        return value
    except:
        raise exceptions.ValidationError({"key": column_name, 'error': 'Invalid mobile number eg: +917892126002'})
    

#validating radio , checkbox , drop down
def validate_drop_down(self, column_name, drop_down_list, value, type1):
    drop_down_list = [d['id'] for d in drop_down_list]
    if value and value not in drop_down_list:
        raise exceptions.ValidationError({"key": column_name, 'error': f'Invalid value for {type1} available list are {str(drop_down_list)}'})
    

def validate_switch(self, column_name, value):
    if not isinstance(value, (bool)):
        raise exceptions.ValidationError({"key": column_name, 'error': 'Invalid switch'})
    
def get_app_assets(self):
    folder_path = 'companies-images/AppImages/'
    if self.request.GET.get('app_type') == 'student' or self.request.GET.get('app_type') == 'app':
        folder_path += 'student_app_icons/'
    elif self.request.GET.get('app_type') == 'staff' or self.request.GET.get('app_type') == 'staff_app':
        folder_path += 'staff_app_icons/'
    else:
        raise exceptions.ValidationError('Invalid Path')
    return UploadTypeService.get_file_list_from_folder(self, folder_path)