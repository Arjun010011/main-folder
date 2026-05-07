import json
from datetime import datetime
from rest_framework import exceptions
from apps.shared.models.template_mapping import TemplateMapping,TemplateStandardMapping

from apps.shared.serializers import TransactionIdTrackingSerializer
from apps.shared.services_shared import application_form
from apps.shared.services_shared import enquiry_form
from apps.shared.services_shared import admission_form
from apps.shared.models.custom import CustomData, CustomForm, FormDefinition
from apps.users.models.user import ReportingGroupMapping
from apps.shared.models.document import DocumentType
from apps.shared.variables.default_variables import json_dynamic_values_for_template
from apps.students.models.student import StudentDocumentMapping

def get_file_path_name(self, form_name):
    path = ''
    if form_name == 'enquiry_form':
        path = 'apps/shared/templates/jsons/enquiry_form.py'
    if form_name == 'application_form':
        path = 'apps/shared/templates/jsons/application_form.py'
    if form_name == 'admission_form':
        path = 'apps/shared/templates/jsons/admission_form.py'
    if not path:
        raise exceptions.ValidationError('Invalid for type')
    return path

def return_list(self, form_name):
    data_list = []
    form_definition_name = ''
    if form_name == 'enquiry_form':
        data_list = enquiry_form.data_list
        form_definition_name = 'enquiry_form'
    if form_name == 'application_form':
        data_list = application_form.data_list
        form_definition_name = 'application_form'
    if form_name == 'admission_form':
        data_list = admission_form.data_list
        form_definition_name = 'admission_form'
    if not data_list:
        raise exceptions.ValidationError('Invalid for type')
    custom_form_data = CustomForm.objects.filter(form_for=form_name, is_active=True).first()
    custom_form_data_mapping = {}
    for custom_form in custom_form_data.field_structure:
        if custom_form['sub_section'] not in custom_form_data_mapping:
            custom_form_data_mapping[custom_form['sub_section']] = {}
        custom_form_data_mapping[custom_form['sub_section']][custom_form['coming_after']] = custom_form
    form_definition_data = {form_definition['column_name']:form_definition for form_definition in FormDefinition.objects.filter(form_name=form_definition_name).values()}
    return data_list, custom_form_data_mapping, form_definition_data


def add_or_update_front_end_urls(self, data):
    path = get_file_path_name(self, data['form_name'])
    with open(path, 'w') as dict_file:
        dict_file.write('data_list = ' + json.dumps(data, indent=4))
    return {'Reason': 'Data Added Successfully'}

def get_form_structure(self, request):
    import copy
    form_name = request.GET.get('form_name')
    data_list, custom_form_data_mapping, form_definition_data = return_list(self, form_name)
    if custom_form_data_mapping:
        data_list_copy = copy.deepcopy(data_list)
        for  sub_section_name in data_list['sub_sections']:
            if sub_section_name in custom_form_data_mapping:
                index_track = 0
                if "" in custom_form_data_mapping[sub_section_name]:
                    data_list_copy['sub_sections'][sub_section_name]['list'].insert(0, custom_form_data_mapping[sub_section_name][""])
                    index_track += 1
                for idx2, row_data in enumerate(data_list['sub_sections'][sub_section_name]['list']):
                    if row_data['name'] in custom_form_data_mapping[sub_section_name]:
                        index_track += 1
                        data_list_copy['sub_sections'][sub_section_name]['list'].insert(idx2+index_track,custom_form_data_mapping[sub_section_name][row_data['name']])
        data_list = data_list_copy
    if form_definition_data:
        for  sub_section_name in data_list['sub_sections']:
            for idx2, row_data in enumerate(data_list['sub_sections'][sub_section_name]['list']):
                if sub_section_name+'_'+row_data['name'] in form_definition_data:
                    data_list['sub_sections'][sub_section_name]['list'][idx2]['form_definition_data'] = form_definition_data[sub_section_name+'_'+row_data['name']]
    return data_list


def get_full_name(first_name, middle_name, last_name):
    name = first_name
    if middle_name:
        name += ' '+middle_name
    if last_name:
        name += ' '+last_name
    return name

def get_full_name_with_double_space(first_name, middle_name, last_name):
    name = get_full_name(first_name, middle_name, last_name)
    name_list = name.split(' ')
    return_name = ''
    is_dot_added_first = False
    for index, row_name in enumerate(name_list):
        if (len(row_name) <= 1 and index == 0) or (len(row_name) <= 1 and is_dot_added_first):
            row_name += '.'
            is_dot_added_first = True
        elif len(row_name) <= 1:
            row_name = '.'+row_name
        if index > 0:
            row_name = ' '+row_name
        return_name += row_name
    return return_name

def get_full_name_with_dot(name):
    if not name:
        return name
    name_list = name.split(' ')
    return_name = ''
    is_dot_added_first = False
    for index, row_name in enumerate(name_list):
        if (len(row_name) <= 1 and index == 0) or (len(row_name) <= 1 and is_dot_added_first):
            row_name += '.'
            is_dot_added_first = True
        elif len(row_name) <= 1:
            row_name = '.'+row_name
        if index > 0:
            row_name = ' '+row_name
        return_name += row_name
    return return_name

def get_full_name_dot_inbetween(first_name, middle_name, last_name):
    name = first_name
    if middle_name:
        name += '.'+middle_name
    if last_name:
        name += '.'+last_name
    return name

def add_double_space(name_part):
    if name_part is None:
        return ""
    parts = name_part.split()
    for i in range(1, len(parts)):  # Start from the second part
        if len(parts[i]) == 1:  # Check if it is a single letter
            parts[i] = "  " + parts[i]  # Add extra space before it
    return "  ".join(parts)

def get_dynamic_values_for_template(model_name,certificate_no=None,standard_list=None):
    selected_template  = get_selected_template({}, model_name, 'pdf', None,None,standard_list,None,certificate_no)[0]
    if not selected_template:
        if model_name == 'study_certificate':
            selected_template = 'default_study_certificate'
        elif model_name == 'character_certificate':
            selected_template = 'default_character_certificate'
        elif model_name == 'fee_structure':
            selected_template = 'default_fee_structure'
        elif model_name == 'transfer_certificate':
            selected_template = 'default'
        elif model_name == 'achievement_certificate':
            selected_template = 'jaihind_achievement_certificate'
        elif model_name == 'sport_certificate':
            selected_template = 'inps_sport_certificate'
        if model_name == 'bonified_certificate':
            selected_template = 'default_bonified_certificate'
        if model_name == 'conduct_certificate':
            selected_template = 'default_conduct_certificate'
        elif model_name == 'graduation_certificate':
            selected_template = 'jaihind_graduation_certificate'            
        elif model_name == 'custom_report':
            selected_template = 'ssps_fee_pending' #default
        elif model_name == 'teacher_appointment_letter' :
            selected_template =   'default' 
        elif model_name == 'teacher_experience_letter' :
            selected_template =   'default' 
        elif model_name == 'registration_form' :
            selected_template =   'jaihind_registration_form'
        elif model_name == 'gramina_certificate':
            selected_template =  'default_gramina_certificate'
        elif model_name == 'kannada_medium_certificate':
            selected_template =  'default_kannada_medium_certificate'
        else:
            selected_template = 'default_' + model_name
    selected_template = selected_template.replace('.html', '')
    if model_name in json_dynamic_values_for_template and selected_template in json_dynamic_values_for_template[model_name]:
        return json_dynamic_values_for_template[model_name][selected_template]
    if model_name in json_dynamic_values_for_template and 'default' in json_dynamic_values_for_template[model_name]:
        return json_dynamic_values_for_template[model_name]['default']
    return json_dynamic_values_for_template
    return []

def get_selected_template(self, module, template_type, default_path, academic_year=None, standard_ids=[],fee_type=None,certificate_no=None,return_obj=False):
    filter_query = {'module': module, 'is_active': True}
    templates_mapped = TemplateMapping.objects.filter(**filter_query)
    default_template_mapping_obj=templates_mapped.first()
    templates_list=[]
    for template in templates_mapped:
        templates_list.append(template.id)
    
    templates = TemplateStandardMapping.objects.filter(template__in=templates_list).values('academic_year','standard',
                                                                     'fee_type','multiple_template_no')
    temp_data ={'academic_year':'','standard_ids':[],'fee_type':''}
    for template in templates:
        if template['academic_year'] and template['standard'] and template['fee_type']:
            if template['academic_year'] == academic_year and template['standard'] in standard_ids and template['fee_type'] == fee_type:
                temp_data['academic_year'] = academic_year
                temp_data['standard_ids'] = standard_ids
                temp_data['fee_type'] = fee_type
        elif template['academic_year'] and template['standard']:
            if template['academic_year'] == academic_year and template['standard'] in standard_ids:
                temp_data['academic_year'] = academic_year
                temp_data['standard_ids'] = standard_ids
        elif template['standard'] and template['fee_type']:
            if template['fee_type'] == fee_type and template['standard'] in standard_ids:
                temp_data['fee_type'] = fee_type
                temp_data['standard_ids'] = standard_ids
        elif template['academic_year'] and template['fee_type']:
            if template['academic_year'] == academic_year and template['fee_type'] == fee_type:
                temp_data['academic_year'] = academic_year
                temp_data['fee_type'] = fee_type
        elif template['fee_type']:
            if template['fee_type'] == fee_type:
                temp_data['fee_type'] = fee_type
        elif template['standard']:
            if template['standard'] in standard_ids:
                temp_data['standard_ids'] = standard_ids
    if template_type:
        filter_query['template_type'] = template_type
    if temp_data['academic_year']:
        filter_query['template_standard_mapping_template__academic_year'] = temp_data['academic_year']
    if temp_data['standard_ids']:
        filter_query['template_standard_mapping_template__standard__in'] = temp_data['standard_ids']
    if temp_data['fee_type']:
        filter_query['template_standard_mapping_template__fee_type'] = temp_data['fee_type']
    if certificate_no:
        filter_query['template_standard_mapping_template__multiple_template_no'] = certificate_no
    template_mapping_obj = TemplateMapping.objects.filter(**filter_query).first()
    if not template_mapping_obj:
        template_mapping_obj = default_template_mapping_obj
    if return_obj:
        if template_mapping_obj:
            return {'path':template_mapping_obj.name+'.html',
                    'no_of_copies':template_mapping_obj.no_of_copies,
                    'template_type':template_mapping_obj.template_type}
        else:
            return {'path':default_path,
                    'no_of_copies':1,
                    'template_type':'pdf'}
    if template_mapping_obj:
        return template_mapping_obj.name+'.html' , template_mapping_obj.no_of_copies
    else:
        return default_path, 1 #1 is number of compies

def get_teaching_staff_group_ids(self):
    reporting_group_list = ReportingGroupMapping.objects.filter(group_type=1).values_list('group', flat=True)
    return reporting_group_list

def get_client_ip(self):
    x_forwarded_for = self.request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[-1].strip()
    else:
        ip = self.request.META.get('REMOTE_ADDR')
    return ip

def save_transaction_tracking(data):
    ser = TransactionIdTrackingSerializer(data=data)
    ser.is_valid(raise_exception=True)
    ser.save()

def notuploaded_files_list(self):
    standard_id = self.request.GET.get('standard_id')
    student_id = self.request.GET.get('student_id')
    documents_uploaded_list = []
    documents_data = {}
    notuploaded_documents_list =[]
    notuploaded_documents={'details':[],'count':0}
    doc_filter={}
    doc_filter['is_active']=True
    if standard_id:
        doc_filter['document_type_standard_mapping_document_type__standard']=standard_id
        documents=DocumentType.objects.filter(**doc_filter).values('id','name')
        for document in documents:
            documents_data[document['id']] = {'id':document['id'],'name':document['name']}
    if student_id:
        documents_student_uploaded = StudentDocumentMapping.objects.filter(student=student_id,is_active=True).values('student','document_type','document_id')
        for document in documents_student_uploaded:
            documents_uploaded_list.upload(document['document_type'])
    documents=DocumentType.objects.filter(document_type_standard_mapping_document_type__standard=standard_id,is_active=True).values('id','name')
    for document in documents:
        documents_data[document['id']] = {'id':document['id'],'name':document['name']}
    notuploaded_documents_list = [doc for doc in documents_data.values() if doc not in documents_uploaded_list]
    for document in notuploaded_documents_list:
        notuploaded_documents['details'].append({
            'id':document['id'],
            'name':document['name']
        })
        notuploaded_documents['count']+=1
    return notuploaded_documents

def format_date_range(from_date, to_date):
    def fmt(d):
        day = int(d.strftime("%d"))
        suffix = "TH" if 4 <= day <= 20 or 24 <= day <= 30 else ["ST", "ND", "RD"][day % 10 - 1]
        return f"{day}{suffix} {d.strftime('%B').upper()} {d.year}"

    f, t = datetime.strptime(from_date, "%Y-%m-%d"), datetime.strptime(to_date, "%Y-%m-%d")
    return f"( {fmt(f)} - {fmt(t)} )"