from datetime import datetime
from rest_framework import exceptions

from apps.staffs.models.staff import Staff
from apps.staffs.serializers import StaffSerializer
from apps.shared.models import Document
from apps.shared.serializers import DocumentSerializer
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.shared.services import PDFService, SharedService
from apps.institutes.models import Institute
from apps.shared.services_shared.common import get_dynamic_values_for_template

def get_staff_certificate(self, data):
    institute = Institute.get_institute(self)
    if 'certificate_type' not in data or not data['certificate_type']:
        raise exceptions.ValidationError('certification_type is mandatory')
    if 'staff' not in data or not data['staff']:
        raise exceptions.ValidationError('staff is mandatory')
    if data['certificate_type'] == 'teacherappiontmentletter':
        return get_all_staff_certificates(self, data)
    if data['certificate_type'] == 'teacherexperienceletter':
        return get_all_staff_certificates(self, data)
    return get_all_staff_certificates(self, data)

def get_all_staff_certificates(self, data):
    if 'certificate_no' in data and data['certificate_no']:
        certificate_no = data['certificate_no']
    else:
        certificate_no = None
    if data['certificate_type'] == 'teacherappiontmentletter':
        supported_list = get_dynamic_values_for_template('teacher_appointment_letter',certificate_no)
    if data['certificate_type'] == 'teacherexperienceletter':
        supported_list = get_dynamic_values_for_template('teacher_experience_letter',certificate_no)
    supported_dynamic_variables = {}
    for supported_row in supported_list:
        if data.get('dynamic_list'):
            supported_dynamic_variables[supported_row['name']] = data['dynamic_list'].get(supported_row['name'])    
    staff_id = data['staff']
    staff_details = Staff.objects.filter(id=staff_id).values(
        'first_name', 'middle_name', 'last_name', 'profile_pic', 'dob', 'gender', 'designation', 'date_joined','salary','date_left'
    ).first()
    
    if not staff_details:
        raise exceptions.ValidationError('Staff data not found.')
    
    staff_details['profile_pic_details'] = ''
    if staff_details['profile_pic']:
        document_details = Document.objects.get(id=staff_details['profile_pic'])
        document_serializer = DocumentSerializer(document_details)
        staff_details['profile_pic_details'] = document_serializer.data['file']
    
    staff_full_name = get_full_name(staff_details['first_name'], staff_details['middle_name'], staff_details['last_name'])
    gender_details = SharedService.get_gender_relate_and_her_him(staff_details['gender'])
    
    today_date = datetime.today().strftime('%d/%m/%Y')
    staff_id = data['staff']
    
    try:
        staff_obj = Staff.objects.get(id=staff_id)
    except Staff.DoesNotExist:
        raise exceptions.ValidationError('Staff data not found.')

    serialized_staff = StaffSerializer(staff_obj).data
    reporting_to = serialized_staff.get('users', {}).get('reporting_to', {})
    reporting_too=reporting_to.get('username')
 
    certificate_templates = {
        'teacherappiontmentletter': 'teacher_appointment_letter.html',
        'teacherexperienceletter': 'teacher_experience_letter.html',
        'employment_certificate': 'default_employment_certificate.html',
        'achievement_certificate': 'default_staff_achievement_certificate.html'
    }
    if data['certificate_type'] == 'teacherappiontmentletter':
        default='lr_cambridge_teacher_appointment_letter.html'
        selected_template, number_of_copies = get_selected_template(self, 'teacher_appiontment_letter', 'pdf', default,None,None,None,certificate_no)
        path='teacher_appointment_letter/'+selected_template
    if data['certificate_type'] == 'teacherexperienceletter':
        default='teacher_experience_letter.html'
        selected_template, number_of_copies = get_selected_template(self, 'teacherexperienceletter', 'pdf', default,None,None,None,certificate_no)
        path='teacher_experience_letter/'+selected_template

    if data['certificate_type'] not in certificate_templates:
        raise exceptions.ValidationError('Invalid certificate_type11')
    
    default_template = certificate_templates[data['certificate_type']]
    selected_template, number_of_copies = get_selected_template(
        self, data['certificate_type'], 'pdf', default_template, None, None, None, certificate_no
    )
    
    # path = f'teacher_appointment_letter/{selected_template}'
    
    return_data = {
        'first_name': staff_details['first_name'],
        'middle_name': staff_details['middle_name'],
        'last_name': staff_details['last_name'],
        'staff_full_name': staff_full_name,
        'designation': staff_details['designation'],
        'date_joined': staff_details['date_joined'].strftime('%d/%m/%Y') if staff_details.get('date_joined') else '',
        'date_left': staff_details['date_left'].strftime('%d/%m/%Y') if staff_details.get('date_left') else '',
        'dob': staff_details['dob'].strftime('%d/%m/%Y'),
        'today_date': today_date,
        'reporting_too': reporting_too,
        'gender': staff_details['gender'],
        'profile_pic_details': staff_details['profile_pic_details'],
        'staff_relate': gender_details['student_relate'],
        'staff_her_him': gender_details['student_her_him'],
        'salary': staff_details['salary']
        }
    for supported_dynamic in supported_dynamic_variables:
        return_data[supported_dynamic] = supported_dynamic_variables[supported_dynamic]

    if data.get('get_dynamic_values'):
        for supported_row in supported_list:
            supported_row['value'] = ''
            if supported_row['name'] in return_data:
                supported_row['value'] = return_data[supported_row['name']]
        return supported_list
    else:
        # from django.shortcuts import render
        # return render(self.request, path, return_data)
        response = PDFService.receipt(self, return_data, 'teacher_appointment_letter',path, False)
        return response

