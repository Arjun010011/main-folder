from datetime import date, timedelta

from rest_framework import exceptions

from apps.classes.models import StandardSectionMapping
from apps.classes.models.enrollment import StudentStandardMapping
from apps.shared.models.counter import Counter, CounterStandardMapping
from apps.shared.serializers import DocumentSerializer
from apps.shared.models import Document
from apps.students.models.student import Student
from apps.finance.models import AdmissionForm,FeeStandardMapping
from apps.finance.models.miscellaneous import MiscellaneousPayment
from apps.institutes.models import Institute
from apps.students.models import StudentAddress,StudentDetails
from apps.students.models.studentDetail import PreviousSchoolDetails
from apps.shared.models import Caste
from apps.students.serializers import StudentAddressSerializer
from apps.shared.services import ConfigurationService
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.students.services.student import get_student_address,get_student_admission_form,get_student_admission_form_details,get_student_admission_date
from apps.shared.services import FormdefinitionService, PDFService, SharedService, CounterService, ConfigurationService, UploadTypeService, NotificationBodyTemplate
from datetime import datetime
from num2words import num2words
from apps.shared.services_shared.common import get_dynamic_values_for_template
from apps.finance.serializers import FeeTermsSerializer
from apps.institutes.serializers import InstituteSerializer


def check_study_certificate_fee_paid(student_id):
    return MiscellaneousPayment.objects.filter(
        miscellaneous__student=student_id,
        miscellaneous__is_active=True,
        misc__misc_type__code_name='sc',
        misc__is_active=True
    ).exists()


def get_certificate(self, data):
    institute = Institute.get_institute(self)
    if 'certificate_type' not in data or not data['certificate_type']:
        raise exceptions.ValidationError('certification_type is mandatory')
    if 'student' not in data or not data['student']:
        raise exceptions.ValidationError('student is mandatory')
    if data['certificate_type'] == 'studycertificate':
        is_fee_mandatory = FormdefinitionService.get_formdefintion_data(
            self,
            'certificate_configuration',
            'is_fee_clearance_mandatory_for_study_certificate'
        )

        if is_fee_mandatory:
            if not check_study_certificate_fee_paid(data['student']):
                raise exceptions.ValidationError(
                    'Study Certificate fee is not paid. Please collect the fee before generating the certificate.'
                )

        return get_all_certificate(self, data)
    if data['certificate_type'] == 'transfercertificate':
        return get_transfer_certificate(self,data)
    if data['certificate_type'] == 'fee_structure':
        return get_feestructure(self,data)
    if data['certificate_type'] == 'character_certificate':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'conduct_certificate':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'bonified_certificate':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'admissionabstract':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'registration_form':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'achievementcertificate':
        if institute.code in ['jaihindinternational','jaihindinternationalgbpalya']:
            return get_all_certificate(self,data)
        else:
            raise exceptions.ValidationError('No template mapped')
    if data['certificate_type'] == 'sportcertificate':
        if institute.code in ['jaihindinternational','jaihindinternationalgbpalya','aips']:
            return get_all_certificate(self,data)
        else:
            raise exceptions.ValidationError('No template mapped')
    if data['certificate_type'] == 'graduationcertificate':
        if institute.code in ['jaihindinternational','jaihindinternationalgbpalya']:
            return get_all_certificate(self,data)
        else:
            raise exceptions.ValidationError('No template mapped')
    if data['certificate_type'] == 'music_achievement':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'poster_making_achievement':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'gramina_certificate':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'kannada_medium_certificate':
        return get_all_certificate(self,data)
    if data['certificate_type'] == 'degree_certificate':
        return get_all_certificate(self,data)
    raise exceptions.ValidationError('invalid certificate_type')

    #if self.request.GET.get('studycertificate'):
    #if self.request.GET.get('admissionabstract'):
     #   return get_admission_abstract(self)


def get_all_certificate(self,data):
    if 'certificate_no' in data and data['certificate_no']:
        certificate_no= data['certificate_no']
    else:
        certificate_no=None
    supported_list = get_dynamic_values_for_template(data['certificate_type'], certificate_no)
    # if data['certificate_type'] == 'studycertificate':
    #     supported_list = get_dynamic_values_for_template('study_certificate',certificate_no)
    # if data['certificate_type'] == 'character_certificate':
    #     supported_list = get_dynamic_values_for_template('character_certificate',certificate_no)
    # if data['certificate_type'] == 'achievementcertificate':
    #     supported_list = get_dynamic_values_for_template('achievement_certificate',certificate_no)  
    # if data['certificate_type'] == 'sportcertificate':
    #     supported_list = get_dynamic_values_for_template('sport_certificate',certificate_no)
    # if data['certificate_type'] == 'graduationcertificate':
    #     supported_list = get_dynamic_values_for_template('graduation_certificate',certificate_no)
    # if data['certificate_type'] == 'bonified_certificate':
    #     supported_list = get_dynamic_values_for_template('bonified_certificate',certificate_no)
    # if data['certificate_type'] == 'conduct_certificate':
    #     supported_list = get_dynamic_values_for_template('conduct_certificate',certificate_no)
    if data['certificate_type'] == 'transfercertificate':
        supported_list = get_dynamic_values_for_template('transfer_certificate',certificate_no)
    if data['certificate_type'] == 'studycertificate':
        supported_list = get_dynamic_values_for_template('study_certificate',certificate_no)
    if data['certificate_type'] == 'character_certificate':
        supported_list = get_dynamic_values_for_template('character_certificate',certificate_no)
    if data['certificate_type'] == 'achievementcertificate':
        supported_list = get_dynamic_values_for_template('achievement_certificate',certificate_no)  
    if data['certificate_type'] == 'sportcertificate':
        supported_list = get_dynamic_values_for_template('sport_certificate',certificate_no)
    if data['certificate_type'] == 'graduationcertificate':
        supported_list = get_dynamic_values_for_template('graduation_certificate',certificate_no)
    if data['certificate_type'] == 'bonified_certificate':
        supported_list = get_dynamic_values_for_template('bonified_certificate',certificate_no)
    if data['certificate_type'] == 'conduct_certificate':
        supported_list = get_dynamic_values_for_template('conduct_certificate',certificate_no)
    if data['certificate_type'] == 'registration_form':
        supported_list = get_dynamic_values_for_template('registration_form',certificate_no)
    if data['certificate_type'] == 'gramina_certificate':
        supported_list = get_dynamic_values_for_template('gramina_certificate',certificate_no)
    if data['certificate_type'] == 'kannada_medium_certificate':
        supported_list = get_dynamic_values_for_template('kannada_medium_certificate',certificate_no)
    if data['certificate_type'] == 'degree_certificate':
        supported_list = get_dynamic_values_for_template('degree_certificate',certificate_no)
    supported_dynamic_variables = {}
    for supported_row in supported_list:
        if data.get('dynamic_list'):
            supported_dynamic_variables[supported_row['name']] = data['dynamic_list'].get(supported_row['name'])
    student_id = data['student']
    student_details = Student.objects.filter(id=student_id).values('first_name','middle_name','last_name','student_parent__parent__father_name',
                                                                        'student_parent__parent__mother_name', 'profile_pic',
                                                                        'student_details__mother_tongue', 'dob', 'gender','sts','student_details__aadhar_num').first()
    student_details['profile_pic_details'] = ''
    if student_details['profile_pic']:
        document_details = Document.objects.get(id=student_details['profile_pic'])
        document_serializer = DocumentSerializer(document_details)
        student_details['profile_pic_details'] = document_serializer.data['file']
    report = StudentStandardMapping.objects.filter(student=student_id).order_by('academic_year__start_date').values(
        'academic_year', 'academic_year__start_date__year', 'academic_year__end_date__year', 'standard__name', 'standard__dise_code', 'standard')
    gender_details = SharedService.get_gender_relate_and_her_him(student_details['gender'])
    caste_religion_dict=SharedService.get_caste_religion_category_nationality(self,student_id)[student_id]
    student_relate = gender_details['student_relate']
    student_her_him = gender_details['student_her_him']
    student_he_she = gender_details['student_he_she']
    student_miss_master = gender_details['student_miss_master']
    student_sri_kum = gender_details['student_sri_kum']
    student_sri_smt = gender_details['student_sri_smt']
    student_identify = gender_details['student_relate_kumari/master']
    student_son_daughhter = gender_details['student_son_daughter']

    if supported_dynamic_variables.get('address'):
        student_address=supported_dynamic_variables['address']
    else:
        student_address=get_student_address([student_id])
        if student_id in student_address:
            address={
                'address_one':student_address[student_id]['address_one'] if 'address_one' in student_address[student_id] else '',
                'address_two':student_address[student_id]['address_two'] if 'address_two' in student_address[student_id] else '',
                'city':student_address[student_id]['city'] if 'city' in student_address[student_id] else '',
                'state':student_address[student_id]['state'] if 'state' in student_address[student_id] else '',
                'pincode':str(student_address[student_id]['pincode']) if 'pincode' in student_address[student_id] else ''
            }
            student_address=SharedService.append_string(address.values())
        else:
            student_address = '-'
    if supported_dynamic_variables.get('mother_tongue'):
        mother_tongue=supported_dynamic_variables['mother_tongue']
    else:
        mother_tongue=student_details['student_details__mother_tongue'] if student_details['student_details__mother_tongue'] else '-'
    if supported_dynamic_variables.get('aadhar_num'):
        aadhar_num=supported_dynamic_variables['aadhar_num']
    else:
        aadhar_num=student_details['student_details__aadhar_num'] if student_details['student_details__aadhar_num'] else '-'
    if supported_dynamic_variables.get('admission_num'):
        student_admission_num=supported_dynamic_variables['admission_num']
    else:
        student_admission_num=get_student_admission_form(self,[student_id])[student_id]
    if supported_dynamic_variables.get('admission_date'):
        student_admission_date = supported_dynamic_variables['admission_date']
    else:
        student_admission_date = get_student_admission_date(self,[student_id])[student_id].strftime("%d/%m/%Y")
    if supported_dynamic_variables.get('student_full_name'):
        student_full_name=supported_dynamic_variables['student_full_name']
    else:
        student_full_name=get_full_name(student_details['first_name'],student_details['middle_name'],student_details['last_name'])
    if supported_dynamic_variables.get('father_name'):
        father_name=supported_dynamic_variables['father_name']
    else:
        father_name=student_details['student_parent__parent__father_name']
    
    if supported_dynamic_variables.get('nationality'):
        nationality=supported_dynamic_variables['nationality']
    else:
        nationality=caste_religion_dict['nationality__name']
    if supported_dynamic_variables.get('religion'):
        religion=supported_dynamic_variables['religion']
    else:
        religion=caste_religion_dict['religion__name'] if caste_religion_dict['religion__name'] else '-'
    if supported_dynamic_variables.get('category'):
        category=supported_dynamic_variables['category']
    else:
        category=caste_religion_dict['category__name']if caste_religion_dict['category__name'] else '-'
    if supported_dynamic_variables.get('caste'):
        caste=supported_dynamic_variables['caste']
    else:
        caste=caste_religion_dict['caste__name'] if caste_religion_dict['caste__name'] else '-'
    if supported_dynamic_variables.get('mother_name'):
        mother_name=supported_dynamic_variables['mother_name']
    else:
        mother_name=student_details['student_parent__parent__mother_name'] if student_details['student_parent__parent__mother_name'] else '-'
    # Get current datetime object once to avoid inconsistencies
    today_obj = datetime.today()

    # Format full timestamp (used if needed anywhere with time)
    today = today_obj.strftime('%d/%m/%Y %H:%M:%S')

    # Format only date in dd/mm/yyyy format for certificate display
    today_date = today_obj.strftime('%d/%m/%Y')
    if not report:
        raise exceptions.ValidationError('data not found.')
    from_report = report.first()
    to_report = report.last()
    from apps.classes.models import StandardSectionMapping

    section_obj = StandardSectionMapping.objects.filter(
        enrollments__student=student_id,
        academic_year=to_report['academic_year'],
        standard=to_report['standard']
    ).values('section__name').first()

    section_name = section_obj['section__name'] if section_obj else ''
    institute = Institute.get_institute(self, [to_report['standard']])
    school_state_name = ''
    school_country_name = ''
    school_district_name = ''
    school_city_name = ''
    pincode = ''
    address = ''
    if supported_dynamic_variables.get('standard_name'):
        student_standard = supported_dynamic_variables['standard_name']
    else:
        student_standard = to_report['standard__name']
    if supported_dynamic_variables.get('academic_year'):
        student_academic_year = supported_dynamic_variables['academic_year']
    else:
        student_academic_year = f'{to_report["academic_year__start_date__year"]} - {to_report["academic_year__end_date__year"]}'
    if supported_dynamic_variables.get('from_academic_year'):
        from_academic_year=supported_dynamic_variables['from_academic_year']
    else:
        from_academic_year=f'{from_report["academic_year__start_date__year"]} - {from_report["academic_year__end_date__year"]}'
    if supported_dynamic_variables.get('to_academic_year'):
        to_academic_year=supported_dynamic_variables['to_academic_year']
    else:
        to_academic_year=f'{to_report["academic_year__start_date__year"]} - {to_report["academic_year__end_date__year"]}'
    try:
        if institute.institute_address:
            address_data_temp = institute.institute_address['map_address_data']
            school_state_name = address_data_temp['state_map'] if 'state_map' in address_data_temp else ''
            school_country_name = address_data_temp['country_map'] if 'country_map' in address_data_temp else ''
            school_district_name = address_data_temp['district_map'] if 'district_map' in address_data_temp else ''
            school_city_name = address_data_temp['city_map'] if 'city_map' in address_data_temp else ''
            pincode = institute.pincode if institute.pincode else ''
            address = institute.address if institute.address else ''
    except:
        pass
    dob_words=num2words(int(student_details['dob'].strftime('%d')), lang='en')+' '+student_details['dob'].strftime('%B')+' '+num2words(int(student_details['dob'].strftime('%Y')), lang='en')
    if data['certificate_type'] == 'studycertificate':
        default='default_study_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'study_certificate', 'pdf', default,None,None,None,certificate_no)
        path='study_certificate/'+selected_template
    if data['certificate_type'] == 'bonified_certificate':
        default='default_bonified_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'bonified_certificate', 'pdf', default,None,None,None,certificate_no)
        path='bonified_certificate/'+selected_template
    if data['certificate_type'] == 'conduct_certificate':
        default='default_conduct_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'conduct_certificate', 'pdf', default,None,None,None,certificate_no)
        path='conduct_certificate/'+selected_template
    if data['certificate_type'] == 'character_certificate':
        default='default_character_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'character_certificate', 'pdf', default,None,None,None,certificate_no)
        path='character_certificate/'+selected_template
    if data['certificate_type'] == 'achievementcertificate':
        default='jaihind_achievement_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'achievement_certificate', 'pdf', default,None,None,None,certificate_no)
        path='achievement_certificate/'+selected_template
    if data['certificate_type'] == 'sportcertificate':
        default='jaihind_sport_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'achievement_certificate', 'pdf', default,None,None,None,certificate_no)
        path='sport_certificate/'+selected_template 
    if data['certificate_type'] == 'graduationcertificate':
        default='jaihind_graduation_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'achievement_certificate', 'pdf', default,None,None,None,certificate_no)
        path='graduation_certificate/'+selected_template
    if data['certificate_type'] == 'poster_making_achievement':
        default='default_poster_making_achievement.html'
        selected_template, number_of_copies = get_selected_template(self, 'poster_making_achievement', 'pdf', default,None,None,None,certificate_no)
        path='poster_making_achievement/'+selected_template
    if data['certificate_type'] == 'music_achievement':
        default='default_music_achievement.html'
        selected_template, number_of_copies = get_selected_template(self, 'music_achievement', 'pdf', default,None,None,None,certificate_no)
        path='music_achievement/'+selected_template
    if data['certificate_type'] == 'registration_form':
        default='jaihind_registration_form.html'
        selected_template, number_of_copies = get_selected_template(self, 'registration_form', 'pdf', default,None,None,None,certificate_no)
        path='registration_form/'+selected_template
    if data['certificate_type'] == 'gramina_certificate':
        default='default_gramina_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'gramina_certificate', 'pdf', default,None,None,None,certificate_no)
        path='gramina_certificate/'+selected_template
    if data['certificate_type'] == 'kannada_medium_certificate':
        default='default_kannada_medium_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'kannada_medium_certificate', 'pdf', default,None,None,None,certificate_no)
        path='kannada_medium_certificate/'+selected_template
    if data['certificate_type'] == 'degree_certificate':
        default='default_degree_certificate.html'
        selected_template, number_of_copies = get_selected_template(self, 'degree_certificate', 'pdf', default,None,None,None,certificate_no)
        path='degree_certificate/'+selected_template
    if str(student_standard).isnumeric():
        student_standard = SharedService.ordinal(int(student_standard)) + ' STD'
    # Ensure DOB is always handled as datetime object
    # After student update, DOB may come as string instead of date object
    dob_value = student_details['dob']

    student_address = get_student_address([student_id])

    # Check if dob is provided in dynamic_list - if so, use that value
    if 'dob' in supported_dynamic_variables and supported_dynamic_variables['dob']:
        dob_value = supported_dynamic_variables['dob']
        
    if isinstance(dob_value, str):
        try:
            dob_value = datetime.strptime(dob_value, '%Y-%m-%d')
        except:
            try:
                dob_value = datetime.strptime(dob_value, '%d/%m/%Y')
            except:
                dob_value = datetime.strptime(dob_value, '%d-%m-%Y')
    dob_str = dob_value.strftime('%d/%m/%Y')
    return_data = {'first_name': student_details['first_name'], 'middle_name': student_details['middle_name'],
            'last_name': student_details['last_name'],'student_full_name':student_full_name, 'father_name': father_name,
            'mother_tongue':mother_tongue,
            'from_academic_year': from_academic_year,
            'from_standard_name': from_report['standard__name'],
            'from_standard_dise_code': from_report['standard__dise_code'],
            'to_academic_year': to_academic_year,
            'to_standard_name': to_report['standard__name'], 'to_standard_dise_code': to_report['standard__dise_code'],
            'school_name': institute.name, 'school_address': address, 'school_state': school_state_name,
            'school_country': school_country_name, 'school_district': school_district_name,
            'school_city': school_city_name, 'school_pincode': pincode,
            'school_tel_num': institute.tel_num, 'school_tel_num_2': institute.tel_num_2,
            'dob':student_details['dob'],'dob_str': dob_str, 'gender':student_details['gender'],'address':student_address,'admission_num':student_admission_num,'admission_date':student_admission_date,
            'today':today,'today_date':today_date,'academic_year':student_academic_year,'student_relate':student_relate,'student_her_him':student_her_him,'student_miss_master':student_miss_master,
            'mother_name':mother_name, 'standard_name':student_standard,'caste':caste,'nationality':nationality,'religion':religion,'category':category,'student_sri_kum':student_sri_kum,'student_sri_smt':student_sri_smt,'student_identify':student_identify,'student_son_daughter':student_son_daughhter,
            'profile_pic_details': student_details['profile_pic_details'],'student_he_she':student_he_she,'institute':institute ,'dob_in_words':dob_words,'sts':student_details['sts'],
            'aadhar_num':aadhar_num, "event_date": today_date, 'section_name': section_name,
            'student_address': student_address[student_id]
            }
    for supported_dynamic in supported_dynamic_variables:
        return_data[supported_dynamic] = supported_dynamic_variables[supported_dynamic]
    
    # CRITICAL: Ensure date fields are always in DD/MM/YYYY format after dynamic variables override
    # This prevents ISO format (YYYY-MM-DD) from appearing when dynamic_list contains date values
    # Reformat dob_str if it was overridden by dynamic_list with wrong format
    if 'dob_str' in return_data and return_data['dob_str']:
        dob_input = return_data['dob_str']
        if isinstance(dob_input, str):
            try:
                # Try parsing as ISO format (YYYY-MM-DD)
                dob_parsed = datetime.strptime(dob_input, '%Y-%m-%d')
                return_data['dob_str'] = dob_parsed.strftime('%d/%m/%Y')
            except:
                try:
                    # Try parsing as DD-MM-YYYY format
                    dob_parsed = datetime.strptime(dob_input, '%d-%m-%Y')
                    return_data['dob_str'] = dob_parsed.strftime('%d/%m/%Y')
                except:
                    # If already in correct format, keep it
                    pass
    
    # Always regenerate today's date to ensure consistency - ignore any override
    today_obj = datetime.today()
    return_data['today_date'] = today_obj.strftime('%d/%m/%Y')
    return_data['today'] = today_obj.strftime('%d/%m/%Y %H:%M:%S')
    return_data['event_date'] = return_data['today_date']
    #from django.shortcuts import render
    #return render(self.request, path, data)
    if data.get('get_dynamic_values'):
        for supported_row in supported_list:
            supported_row['value'] = ''
            if supported_row['name'] in return_data:
                supported_row['value'] = return_data[supported_row['name']]
        return supported_list
    else:
        # from django.shortcuts import render
        # return render(self.request, path, return_data)
        print(return_data)
        response = PDFService.receipt(self, return_data, 'certificate_type',path, False)
        return response

def get_transfer_certificate(self,data):
    student_id = data['student']
    student_details = Student.objects.filter(id=student_id).values('first_name','middle_name','last_name','student_parent__parent__father_name',
                                                                        'student_parent__parent__mother_name','student_details__place_of_birth',
                                                                        'student_details__mother_tongue', 'dob', 'gender','sts','current_reg_num','current_standard', 'profile_pic').first()
    student_details['profile_pic_details'] = ''
    if student_details['profile_pic']:
        document_details = Document.objects.get(id=student_details['profile_pic'])
        document_serializer = DocumentSerializer(document_details)
        student_details['profile_pic_details'] = document_serializer.data['file']
    report = StudentStandardMapping.objects.filter(student=student_id).order_by('academic_year__start_date').values(
        'academic_year__start_date__year', 'academic_year__end_date__year', 'standard__name', 'standard__dise_code', 'standard')
    if 'certificate_no' in data and data['certificate_no']:
        certificate_no= data['certificate_no']
    else:
        certificate_no=None
    supported_list = get_dynamic_values_for_template('transfer_certificate',certificate_no,[student_details['current_standard']])
    address = {}
    supported_dynamic_variables = {}
    for supported_row in supported_list:
        if data.get('dynamic_list'):
            supported_dynamic_variables[supported_row['name']] = data['dynamic_list'].get(supported_row['name'])
    gender_details = SharedService.get_gender_relate_and_her_him(student_details['gender'])
    student_relate = gender_details['student_relate']
    student_her_him = gender_details['student_her_him']
    student_he_she = gender_details['student_he_she']
    student_miss_master = gender_details['student_miss_master']
    student_sri_kum = gender_details['student_sri_kum']
    student_sri_smt = gender_details['student_sri_smt']
    gender=SharedService.get_gender_male_or_female(student_details['gender'])
    caste_religion_dict=SharedService.get_caste_religion_category_nationality(self,student_id)[student_id]
    if supported_dynamic_variables.get('address'):
        student_address=supported_dynamic_variables['address']
    else:
        student_address=get_student_address([student_id])
        if student_id in student_address:
            address={
                'address_one':student_address[student_id]['address_one'] if 'address_one' in student_address[student_id] else '',
                'address_two':student_address[student_id]['address_two'] if 'address_two' in student_address[student_id] else '',
                'city':student_address[student_id]['city'] if 'city' in student_address[student_id] else '',
                'state':student_address[student_id]['state'] if 'state' in student_address[student_id] else '',
                'pincode':str(student_address[student_id]['pincode']) if 'pincode' in student_address[student_id] else ''
            }
            student_address=SharedService.append_string(address.values())
        else:
            student_address = '-'
    admission_details_dict=get_student_admission_form_details(self,[student_id])[student_id]
    if not report:
        raise exceptions.ValidationError('data not found.')
    from_report = report.first()
    to_report = report.last()
    institute = Institute.get_institute(self, [to_report['standard']])
    try:
        if institute.institute_address:
            address_data_temp = institute.institute_address['map_address_data']
    except:
        address_data_temp = {}
    school_address = ''
    if 'address_one_map' in address_data_temp and address_data_temp['address_one_map']:
        school_address += ' '+address_data_temp['address_one_map']
    if 'address_two_map' in address_data_temp and address_data_temp['address_two_map']:
        school_address += ' '+address_data_temp['address_two_map']
    if 'city_map' in address_data_temp and address_data_temp['city_map']:
        school_address += ' '+address_data_temp['city_map']
    return_data = {
        'admission_num': admission_details_dict['admission_num'],
        'student_admission_date': admission_details_dict['admission_date'],
        'student_full_name': get_full_name(student_details['first_name'],student_details['middle_name'],student_details['last_name']),
        'father_name': student_details['student_parent__parent__father_name'],
        'mother_name': student_details['student_parent__parent__mother_name'],
        'dob': student_details['dob'], 
        'gender': gender, 'sts':student_details['sts'],'current_reg_num':student_details['current_reg_num'],
        'nationality': caste_religion_dict['nationality__name'],
        'religion': caste_religion_dict['religion__name'],
        'category': caste_religion_dict['category__name'],
        'caste': caste_religion_dict['caste__name'],
        'is_sc_st': SharedService.get_is_sc_st(self,student_id),
        'place_of_birth':student_details['student_details__place_of_birth'],
        'order_num': '',
        'part1_lan': '',
        'part2_sub': '',
        'exam_month_year': '',
        'reg_num': '',
        'is_passed': '',
        'passed_not_sub': '',
        'is_scholarship': '',
        'last_date_attendance': '',
        'fee_balance': '',
        'appln_date': '',
        'issue_date': datetime.today().strftime('%d/%m/%Y'),
        'today': datetime.today().strftime('%d/%m/%Y'),
        'stud_char': '',
        'tc_num': '',
        'student_address': student_address,
        'school_address': school_address,
        'school_state_name' : (address_data_temp['state_map'] if 'state_map' in address_data_temp else '') if address_data_temp else '',
        'school_country_name' : (address_data_temp['country_map'] if 'country_map' in address_data_temp else '') if address_data_temp else '',
        'school_district_name' : (address_data_temp['district_map'] if 'district_map' in address_data_temp else '') if address_data_temp else '',
        'school_city_name' : (address_data_temp['city_map'] if 'city_map' in address_data_temp else '') if address_data_temp else '',
        'school_pincode' : (address_data_temp['pincode_map'] if 'pincode_map' in address_data_temp else '') if address_data_temp else '',
        'pincode' :institute.pincode if institute.pincode else '',
        'address' :institute.address if institute.address else '',
        'institute':institute,
        'student_academic_year': f'{to_report["academic_year__start_date__year"]} - {to_report["academic_year__end_date__year"]}',
        'student_standard' : to_report['standard__name'],'student_he_she':student_he_she,
        'first_name': student_details['first_name'], 
        'middle_name': student_details['middle_name'],
        'last_name': student_details['last_name'],
        'mother_tongue': student_details['student_details__mother_tongue'],
        'from_academic_year': f'{from_report["academic_year__start_date__year"]} - {from_report["academic_year__end_date__year"]}',
        'from_standard_name': from_report['standard__name'],
        'from_standard_dise_code': from_report['standard__dise_code'],
        'to_academic_year': f'{to_report["academic_year__start_date__year"]} - {to_report["academic_year__end_date__year"]}',
        'to_standard_name': to_report['standard__name'], 'to_standard_dise_code': to_report['standard__dise_code'],
        'profile_pic_details': student_details['profile_pic_details']
    }
    for supported_dynamic in supported_dynamic_variables:
        return_data[supported_dynamic] = supported_dynamic_variables[supported_dynamic]
    
    # Ensure date fields are always in correct format for Transfer Certificate
    # Reformat DOB if it was overridden by dynamic_list with wrong format
    if 'dob' in return_data and return_data['dob']:
        dob_input = return_data['dob']
        if isinstance(dob_input, str):
            try:
                # Try parsing as ISO format (YYYY-MM-DD)
                dob_parsed = datetime.strptime(dob_input, '%Y-%m-%d')
                return_data['dob'] = dob_parsed
            except:
                try:
                    # Try parsing as DD-MM-YYYY format
                    dob_parsed = datetime.strptime(dob_input, '%d-%m-%Y')
                    return_data['dob'] = dob_parsed
                except:
                    # If already in correct format or other format, keep it
                    pass
    
    if isinstance(return_data.get('dob'), str):
        return_data['dob_in_words']=num2words(int(datetime.strptime(return_data['dob'], '%Y-%m-%d').strftime('%d')), lang='en')+' '+datetime.strptime(return_data['dob'], '%Y-%m-%d').strftime('%B')+' '+num2words(int(datetime.strptime(return_data['dob'], '%Y-%m-%d').strftime('%Y')), lang='en')
    else: 
        return_data['dob_in_words']=num2words(int(return_data['dob'].strftime('%d')), lang='en')+' '+return_data['dob'].strftime('%B')+' '+num2words(int(return_data['dob'].strftime('%Y')), lang='en')
    default='default_tc.html'
    selected_template, number_of_copies = get_selected_template(self, 'transfer_certificate', 'pdf', default,None,[student_details['current_standard']])
    path='transfer_certificate/'+selected_template
    if str(return_data['to_standard_name']).isnumeric():
        return_data['to_standard_name'] = SharedService.ordinal(int(return_data['to_standard_name'])) + ' STD'
    return_data.update({
                'school_name': institute.name,'school_trust_name': institute.trust_name,
                'school_tel_num': institute.tel_num, 'school_tel_num_2': institute.tel_num_2,
                'logo': institute.logo.file.url if institute.logo else '',
                'student_relate':student_relate,'student_her_him':student_her_him,'student_miss_master':student_miss_master,'student_sri_kum':student_sri_kum,'student_sri_smt':student_sri_smt
    })
    if isinstance(return_data['dob'], str):
        return_data['dob'] = datetime.strptime(return_data['dob'], '%Y-%m-%d')
    #from django.shortcuts import render
    #return render(self.request, path, data)
    if data.get('get_dynamic_values'):
        for supported_row in supported_list:
            supported_row['value'] = ''
            if supported_row['name'] in return_data:
                supported_row['value'] = return_data[supported_row['name']]
        return supported_list
    else:
        # from django.shortcuts import render
        # return render(self.request, path, return_data)
        response = PDFService.receipt(self, return_data, 'transfer_certificate',path, False)
        return response

def get_admission_abstract(self,data):
    queryset = data['student']
    student = self.get_queryset().filter(id=queryset)
    student_details = student.values('student_parent__parent__father_name', 'student_parent__parent__f_occupation',
                                     'student_parent__parent__mother_name', 'student_parent__parent__m_occupation',
                                     'student_parent__parent__f_annual_income',
                                     'student_parent__parent__dependents', 'student_details__mother_tongue',
                                     'student_details__nationality__name', 'student_details__religion__name',
                                     'student_details__caste__name', 'student_details__previous_school_details',
                                     'student_parent__guardian__g_office_address',
                                     'student_parent__guardian__guardian_name','first_name','middle_name','last_name',
                                     'last_name','dob','gender').first()
    student_address = StudentAddress.objects.filter(type__contains='P', student=queryset).first()
    student_address = StudentAddressSerializer(student_address).data
    report = StudentStandardMapping.objects.filter(student=queryset).order_by('academic_year__start_date').values(
        'academic_year', 'standard', 'standard__name', 'standard__dise_code')
    if not report:
        raise exceptions.ValidationError('data not found.')
    from_report = report.first()
    to_report = report.last()
    try:
        admitted_section = StandardSectionMapping.objects.filter(academic_year=from_report['academic_year'],
                                                                 standard=from_report['standard'],
                                                                 enrollments__student=queryset).values(
            'section__name').first()['section__name']
    except:
        raise exceptions.ValidationError('Student is not enrolled any class.')

    admission_details = AdmissionForm.objects.filter(academic_year=from_report['academic_year'],
                                                     student=queryset).values('admission_num',
                                                                                 'admission_date').first()
    institute = Institute.get_institute(self)
    data = {'school_name': institute.name, 'first_name': student_details['first_name'], 'middle_name': student_details['middle_name'],
            'last_name': student_details['last_name'], 'gender': student_details['gender'], 'dob': student_details['dob'],
            'age': (date.today() - student_details['dob']) // timedelta(days=365.2425),
            'father_name': student_details['student_parent__parent__father_name'],
            'father_occupation': student_details['student_parent__parent__f_occupation'],
            'mother_name': student_details['student_parent__parent__mother_name'],
            'mother_occupation': student_details['student_parent__parent__m_occupation'],
            'f_annual_income': student_details['student_parent__parent__f_annual_income'],
            'dependents': student_details['student_parent__parent__dependents'],
            'nationality': student_details['student_details__nationality__name'],
            'religion': student_details['student_details__religion__name'],
            'caste': student_details['student_details__caste__name'],
            'student_address': student_address,
            'previous_school_details': student_details['student_details__previous_school_details'],
            'mother_tongue': student_details['student_details__mother_tongue'],
            'guardian_name': student_details['student_parent__guardian__guardian_name'],
            'guardian_address': student_details['student_parent__guardian__g_office_address'],
            'admitted_standard_name': from_report['standard__name'],
            'admitted_section_name': admitted_section,
            'admitted_dise_code': from_report['standard__dise_code'],
            'class_of_leaving': to_report['standard__name'],
            'class_of_leaving_dise_code': to_report['standard__dise_code'],
            'admission_details': admission_details
            }
    return {'data': data}

def get_feestructure(self, data):
    student_id = data.get("student")
    
    if not student_id:
        raise exceptions.ValidationError("Student ID is required.")

    student_details = Student.objects.filter(id=student_id).values(
        'first_name', 'middle_name', 'last_name',
        'student_parent__parent__father_name',
        'student_parent__parent__mother_name',
        'student_details__place_of_birth',
        'student_details__mother_tongue',
        'dob', 'gender', 'sts', 'current_reg_num', 'current_standard'
    ).first()

    if not student_details:
        raise exceptions.ValidationError("Student not found.")
    
    if 'certificate_no' in data and data['certificate_no']:
        certificate_no= data['certificate_no']
    else:
        certificate_no=None
    supported_list = get_dynamic_values_for_template('fee_structure',certificate_no,[student_details['current_standard']])
    address = {}
    supported_dynamic_variables = {}
    for supported_row in supported_list:
        if data.get('dynamic_list'):
            supported_dynamic_variables[supported_row['name']] = data['dynamic_list'].get(supported_row['name'])

    standard_id = student_details['current_standard']
    if not standard_id:
        raise exceptions.ValidationError("Current standard not set for student.")

    student_mapping = StudentStandardMapping.objects.filter(
        student_id=student_id,
        standard_id=standard_id
    ).order_by("-academic_year__start_date").values(
        "academic_year",     "academic_year__start_date__year",
    "academic_year__end_date__year"
    ).first()

    if not student_mapping:
        raise exceptions.ValidationError("Academic year not found for this student and standard.")

    academic_year_id = student_mapping["academic_year"]
    academic_year_name = f"{student_mapping['academic_year__start_date__year']}-{student_mapping['academic_year__end_date__year']}"

    queryset = FeeStandardMapping.objects.filter(
        academic_year_id=academic_year_id,
        standard_id=standard_id
    ).order_by("id")

    if not queryset.exists():
        raise exceptions.ValidationError("Fee structure not found.")

    serializer = FeeTermsSerializer(queryset, many=True, context={'request': self.request})
    fee_data = serializer.data

    student_name = get_full_name(
        student_details["first_name"],
        student_details["middle_name"],
        student_details["last_name"]
    )

    institute = Institute.get_institute(self)

    return_data = {
        "student_name": student_name,
        "standard": queryset.first().standard.name,
        "academic_year": academic_year_name,  
        "fee_items": fee_data,
        "school_name": institute.name,
        "school_address": institute.address,
        "today": datetime.today().strftime('%d-%m-%Y'),
        "institute": institute
    }
    for supported_dynamic in supported_dynamic_variables:
        return_data[supported_dynamic] = supported_dynamic_variables[supported_dynamic]

    default_template = "default_fee_structure.html"
    selected_template, number_of_copies = get_selected_template(self, "fee_structure", "pdf", default_template)
    path = f"fee_structure/{selected_template}"

    if data.get('get_dynamic_values'):
        for supported_row in supported_list:
            supported_row['value'] = ''
            if supported_row['name'] in return_data:
                supported_row['value'] = return_data[supported_row['name']]
        return supported_list
    else:
        response = PDFService.receipt(self, return_data, 'fee_structure',path, False)
        return response