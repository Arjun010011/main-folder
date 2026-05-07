from datetime import datetime
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.students.models.student import Student
from apps.students.models.studentDetail import ParentDetail, StudentDetails, StudentParentMapping
from apps.students.services.student import get_student_admission_form, get_student_admission_form_details,get_student_address
from apps.shared.services_shared.common import get_full_name
from apps.students.services.student import get_student_personal_details,get_custom_data_for_objects
from itertools import groupby

def orgainze_download_report(self, data, columns):
    data = sorted(data, key=lambda k: k['name'])
    options={}
    options['title'] = 'Standard Wise'
    options['description'] = 'Student Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = columns
    total_column_data = {
    }
    return write_to_excel_new(self, options, {}, total_column_data)
    
def download_student_report(self, data):
    configurations = {}
    filter_query = {'is_active': True}
    student_standard_mapping_data = {}
    standard_mapping_columns = ['student', 'standard', 'standard__name']
    student_ids = []
    student_parent_mapping = {}
    enrollment_data = {}
    configurations['supported_columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Gender', 'required': False, 'schemacolumn': 'gender'
        },
        {
            'column': 'DOB', 'required': False, 'schemacolumn': 'dob_str'
        },
        {
            'column': 'Admission Number', 'required': False, 'schemacolumn': 'admission_num'
        },
        {
            'column': 'Sats', 'required': False, 'schemacolumn': 'sts'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'standard__name'
        },
        {
            'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
        },
        
        {
            'column': 'Father Name', 'required': False, 'schemacolumn': 'parent__father_name'
        },{
            'column': 'Mother Name', 'required': False, 'schemacolumn': 'parent__mother_name'
        },{
            'column': 'Father Mobile Number', 'required': False, 'schemacolumn': 'parent__f_mobile_num'
        },{
            'column': 'Mother Mobile Number', 'required': False, 'schemacolumn': 'parent__m_mobile_num'
        },{
            'column': 'Student Aadhar Number', 'required': False, 'schemacolumn': 'aadhar_num'
        },{
            'column': 'Category', 'required': False, 'schemacolumn': 'category_name'
        },{
            'column': 'Caste', 'required': False, 'schemacolumn': 'caste_name'
        },{
            'column': 'Admission Date', 'required': False, 'schemacolumn': 'admission_date'
        },{
            'column': 'Address', 'required': False, 'schemacolumn': 'address'
        },{
            'column': 'Previous school name', 'required': False, 'schemacolumn': 'previous_school_name'
        }
    ]

    filters = data['filters']
    report_type = filters.get('report_type')
    standard_ids = filters['standard_ids']
    student_details__entry_academic_year = filters['student_details__entry_academic_year'] if 'student_details__entry_academic_year' in filters else None
    if student_details__entry_academic_year:
        filter_query['student_details__entry_academic_year'] = student_details__entry_academic_year
        academic_year = student_details__entry_academic_year
    else:
        academic_year = filters['academic_year']
    if standard_ids:
        student_standard_mapping = StudentStandardMapping.objects.filter(
            standard__in=standard_ids, academic_year=academic_year
        ).values(*standard_mapping_columns)
        filter_query['id__in'] = []
        for student in student_standard_mapping:
            if standard_ids:
                filter_query['id__in'].append(student['student'])
                student_standard_mapping_data[student['student']] = student
        
    student_data = Student.objects.filter(**filter_query).values()
    if not student_standard_mapping_data:
        student_standard_mapping = StudentStandardMapping.objects.filter(
            academic_year=academic_year
        ).values(*standard_mapping_columns)
        for student in student_standard_mapping:
            student_standard_mapping_data[student['student']] = student
    for student_row in student_data:
        if student_row['dob']:
            student_row['dob_str'] = student_row['dob'].strftime('%d-%m-%Y')
        else:
            student_row['dob_str'] = ''
        student_ids.append(student_row['id'])
    student_details_data_dict={}
    student_details_data=StudentDetails.objects.filter(student__in=student_ids).values()
    student_address_details = get_student_address(student_ids)
    for student in student_details_data:
        student_details_data_dict[student['student_id']]=student
    enrollment_data = Enrollment.objects.filter(student__in=student_ids).values(
        'student', 
        'standard_section',
        'standard_section__standard__name', 
        'standard_section__section__name'
    )
    student_enrollment_map = {}
    for enrollment in enrollment_data:
        student_enrollment_map[enrollment['student']] = {
            'standard_name': enrollment['standard_section__standard__name'],
            'section_name': enrollment['standard_section__section__name']
        }
    student_admission_num_mapping = get_student_admission_form_details(self, student_ids)
    student_details = get_student_personal_details(self,student_ids)
    custom_dict = get_custom_data_for_objects(self,student_data,'Student',modify_existing_data=False)
    custom_data_mapping = custom_dict['custom_data_mapping']
    custom_data = custom_dict['custom_data']
    student_parent_data = StudentParentMapping.objects.filter(
        student__in=student_ids
    ).values(
        'student', 'parent', 'parent__father_name', 'parent__f_mobile_num',
        'parent__mother_name', 'parent__m_mobile_num'
    )
    for student_parent in student_parent_data:
        student_parent_mapping[student_parent['student']] = student_parent
    index = 0
    gender_count_map = {}
    section_gender_count_map = {}
    for student in student_data:
        index += 1
        student['name'] = get_full_name(student['first_name'], student['middle_name'], student['last_name'])
        student['admission_num'] = ''
        if student['id'] in student_parent_mapping:
            student.update(student_parent_mapping[student['id']])
        if student['id'] in student_standard_mapping_data:
            student.update(student_standard_mapping_data[student['id']])
        if student['id'] in student_details:
            student.update({
                'aadhar_num': student_details[student['id']]['aadhar_num'],
                'caste_name': student_details[student['id']]['caste__name'],
                'category_name': student_details[student['id']]['category__name'],
            })
        if student['id'] in student_admission_num_mapping:
            student.update({
                'admission_num': student_admission_num_mapping[student['id']]['admission_num'],
                'admission_date': student_admission_num_mapping[student['id']]['admission_date'],
                'admission_form_id': student_admission_num_mapping[student['id']]['id'],
                'admission_history': student_admission_num_mapping[student['id']]['admission_form_history_admission_form__data'] if 'admission_form_history_admission_form__data' in student_admission_num_mapping[student['id']] else {} 
            })
        if student['id'] in custom_data_mapping:
            for custom_admission_form in custom_data:
                for custom_fields in custom_admission_form['field_structure']:
                    custom_fields_list=list(custom_data_mapping[student['id']]['data'].keys())
                    if custom_fields['name'] in custom_fields_list:
                        student.update({
                        custom_fields['name']:custom_data_mapping[student['id']]['data'][custom_fields['name']]
                        })
        if student['id'] in student_details_data_dict:
            if 'previous_school_details' in student_details_data_dict[student['id']] and student_details_data_dict[student['id']]['previous_school_details'] and 'pre_school_name' in student_details_data_dict[student['id']]['previous_school_details']:
                student.update({'previous_school_name':student_details_data_dict[student['id']]['previous_school_details']['pre_school_name']})
        if student['id'] in student_address_details:
            if not student_address_details[student['id']]['address_one']:
                student_address_details[student['id']]['address_one']=''
            if not student_address_details[student['id']]['address_two']:
                student_address_details[student['id']]['address_two']=''
            if not student_address_details[student['id']]['city']:
                student_address_details[student['id']]['city']=''
            if not student_address_details[student['id']]['district']:
                student_address_details[student['id']]['district']=''
            student.update({
                'address':student_address_details[student['id']]['address_one']+' '+student_address_details[student['id']]['address_two']+' '+student_address_details[student['id']]['city']
            })
        if student['standard__name'] not in gender_count_map:
            gender_count_map[student['standard__name']] = {"name": student['standard__name'], "Boys": 0, "Girls": 0}
        if student['gender'] == "Boy":
            gender_count_map[student['standard__name']]["Boys"] += 1
        elif student['gender'] == "Girl":
            gender_count_map[student['standard__name']]["Girls"] += 1
        standard_name = ''
        section_name = ''
        if student['id'] in student_enrollment_map:
            enrollment = student_enrollment_map[student['id']]
            standard_name = enrollment['standard_name']
            section_name = enrollment['section_name']
        else:
            standard_name = 'Unenrolled'

        section_key = f"{standard_name} - {section_name}"
        if section_key not in section_gender_count_map:
            section_gender_count_map[section_key] = {"name": standard_name, "section": section_name, "Boys": 0, "Girls": 0}

        if student['gender'] == "Boy":
            section_gender_count_map[section_key]["Boys"] += 1
        elif student['gender'] == "Girl":
            section_gender_count_map[section_key]["Girls"] += 1

    for custom_admission_form in custom_data:
        for custom_fields in custom_admission_form['field_structure']:
           configurations['supported_columns'].append({
                'column':custom_fields['label'], 'required': False, 'schemacolumn': custom_fields['name']
            })
    configurations['supported_ordered_columns'] = ['name', 'admission_num']

    if 'return_configurations' in data and data['return_configurations']: #returns columsn and ordering
        return configurations
    if report_type == "boy_girl_report":
        if filters.get("filter_type") == 'section_wise':
            result_data = list(section_gender_count_map.values())
            supported_columns = [
                {"column": "Standard", "required": False, "schemacolumn": "name"},
                {"column": "Section", "required": False, "schemacolumn": "section"},
                {"column": "Boys", "required": False, "schemacolumn": "Boys"},
                {"column": "Girls", "required": False, "schemacolumn": "Girls"},
            ]
            return orgainze_download_report(self, result_data, supported_columns)
        else:
            result_data = list(gender_count_map.values())
            supported_columns = [
                {"column": "Standard", "required": False, "schemacolumn": "name"},
                {"column": "Boys", "required": False, "schemacolumn": "Boys"},
                {"column": "Girls", "required": False, "schemacolumn": "Girls"},
            ]
            return orgainze_download_report(self, result_data, supported_columns)
    else:
        return orgainze_download_report(self, student_data, configurations['supported_columns'])


    
    