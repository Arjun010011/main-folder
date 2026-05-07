from datetime import datetime, date, timedelta
import json
import os

from django.db import transaction
from django.db.models import Q, F, Value as V

from rest_framework.views import Response
from apps.institutes.models import institute
from apps.institutes.services import academic_year
from rest_framework import exceptions
from apps.institutes.models import AcademicYear
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping, StudentTcIssuedTrack
from apps.classes.models.subject import SubjectStudent
from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.classes.serializers import StudentStandardMappingSerializer, StudentTcIssuedTrackSerializer, SubjectStudentSerializer
from apps.finance.models import FeePlan
from apps.finance.models.feeCollection import AdmissionForm
from apps.finance.serializers import AdmissionFormHistorySerializer, AdmissionFormSerializer
from apps.finance.services.calculations import paid_data_and_status
from apps.forms.models.applicationStudent import ApplicationStudent
from apps.institutes.models import AcademicYear
from apps.institutes.models import Institute
from apps.library.models.master import LibraryMembership
from apps.shared.services import SharedService,PDFService
from apps.institutes.models.institute import ServiceTagList
from apps.notification.services.notification_service import send_notification
from apps.shared.services_shared.common import get_selected_template
from apps.shared.models.configuration import Setting
from apps.shared.models.counter import CounterStandardMapping, Counter
from apps.shared.services_shared.common import get_full_name
from apps.shared.services_shared.custom import add_or_update_custom_data,get_custom_data_for_objects
from apps.shared.services import FormdefinitionService, NotificationBodyTemplate, SharedService, UploadTypeService, CounterService, ConfigurationService, add_google_map_data
from apps.shared.utils import http_request
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.classes.models.studentleave import StaffStandardSectionMapping
from apps.students.models import (StudentDetails, ParentDetail, GuardianDetail, StudentAddress,
                                  StudentParentMapping, Student)
from apps.students.models.student import StudentDocumentMapping, StudentSiblingMapping, StudentIdCardUpdate,IdCardUpdate
from apps.students.models.studentDetail import StudentType, PreviousSchoolDetails
from apps.students.serializers import (StudentDetailSerializer, StudentAddressSerializer, ParentDetailSerializer,
                                       GuardianDetailSerializer, StudentDocumentMappingSerializer, StudentListIdCardSerializer, StudentParentMappingSerializer, StudentRfidSerializer, StudentSiblingSerializer,
                                       StudentUniqueRegNumSerializer, StudentSerializer, StudentTypeSerializer,
                                       StudentListSerializer, StudentPreviousSchoolDetailsSerializer,StudentIdCardUpdateSerializer,IdCardDataSyncSerializer,StudentToIdCardSerializer,IdCardToStudentSerializer)
from apps.students.services.download_excel import download_student_data
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.users.services.user import soft_delete_user_login
from apps.shared.services_shared.custom import get_custom_data_for_objects
from apps.shared.models.custom import CustomData, CustomForm
from django.contrib.contenttypes.models import ContentType
from apps.classes.models.attendance import MachineUserMapping,SubjectAttendance
from apps.classes.serializers import  MachineUserMappingSerializer ,GetStandardSectionSubjectSerializer
from apps.institutes.models.biometric_machine import BiometricMachine
from django.core.files.uploadedfile import InMemoryUploadedFile
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.staffs.serializers import StaffSerializer
from apps.students.models import Student,StudentIdCardUpdate
from apps.staffs.models import Staff
from django.db.models import Q, Case, When, BooleanField
from apps.users.encrypt_decrypt import decrypt_password
from apps.institutes.models.sibling_institute import SwitchableInstitute
from django.db.models import Q, Value
from django.db.models.functions import Coalesce, Concat
from apps.hr.models.staffTeachingHour import StaffTeachingHour
from apps.institutes.services.academic_year import get_current_academic_year
from apps.shared.serializers import DocumentSerializer

STUDENT_TYPE = {'RESIDENTIAL': 'Residential', 'DAY_SCHOLAR': 'Day Scholar', 'BOTH': 'Both'}

""" Common Function Starts From Here """

def get_student_id_fuzzy(student_name, standard_id, academic_year_id):
    name_parts = student_name.strip().split()

    students = Student.objects.filter(is_active=True)
    filtered_students = students.none()

    if len(name_parts) == 1:
        fname = name_parts[0]
        filtered_students = students.filter(
            first_name__iexact=fname
        ).filter(
            (Q(middle_name__isnull=True) | Q(middle_name="")) &
            (Q(last_name__isnull=True) | Q(last_name=""))
        )

    elif len(name_parts) == 2:
        fname, second = name_parts
        filtered_students = students.filter(
            first_name__iexact=fname
        ).filter(
            (Q(middle_name__iexact=second) & (Q(last_name__isnull=True) | Q(last_name=""))) |
            ((Q(middle_name__isnull=True) | Q(middle_name="")) & Q(last_name__iexact=second))
        )

    elif len(name_parts) == 3:
        fname, mname, lname = name_parts
        filtered_students = students.filter(
            first_name__iexact=fname,
            middle_name__iexact=mname,
            last_name__iexact=lname
        )

    else:
        return None

    mapping = StudentStandardMapping.objects.filter(
        academic_year_id=academic_year_id,
        standard_id=standard_id,
        student__in=filtered_students
    ).first()

    return mapping.student_id if mapping else None


def get_student_detailed_data(self,student_ids):
    return_data = {}
    filter_student_fields = [
        'first_name', 'middle_name', 'last_name',
        'dob', 'gender', 'mobile_num', 'id'
    ]
    filter_student_detail_fields = ['blood_group', 'student_id']
    student_standard_section  = get_student_current_standard_section_name(student_ids)
    student_queryset = Student.objects.filter(id__in=student_ids, is_active=True).order_by('first_name')
    student_ser = StudentListIdCardSerializer(student_queryset, many=True).data
    custom_dict = get_custom_data_for_objects(self,student_ser,'Student',modify_existing_data=False)
    custom_data_mapping = custom_dict['custom_data_mapping']
    custom_data = custom_dict['custom_data']
    student_data = []
    for student in student_ser:
        # if not student['profile_pic_details']:
        #     continue
        student['admission_num']= AdmissionForm.get_student_admission_num(self, student['id'])
        student['dob_changed'] = datetime.strptime(student['dob'], "%Y-%m-%d").strftime('%d-%m-%Y')
        student['standard_name'] = student_standard_section[student['id']]['standard_name'] if student['id'] in student_standard_section else ''
        student['standard_name_roman'] = SharedService.number_to_roman(student_standard_section[student['id']]['standard_name']) if student['id'] in student_standard_section else ''
        student['section_name'] = student_standard_section[student['id']]['section_name'] if student['id'] in student_standard_section else ''
        if student['id'] in custom_data_mapping:
            for custom_admission_form in custom_data:
                for custom_fields in custom_admission_form['field_structure']:
                    custom_fields_list=list(custom_data_mapping[student['id']]['data'].keys())
                    if custom_fields['name'] in custom_fields_list:
                        student.update({
                        custom_fields['name']:custom_data_mapping[student['id']]['data'][custom_fields['name']]
                        })
        if 'custom_address_line_one' in student:
            if 'custom_address_line_two' not in student:
                student['custom_address_line_two'] = ''
            student_address = student['custom_address_line_one'] + ' ' + student['custom_address_line_two'] + ' ' + student['custom_city'] + ' ' + str(student['custom_pincode'])
            split_index = student_address.rfind('bengaluru')
            if not split_index:
                split_index = student_address.rfind('bangalore')
            student['custom_split_address'] = []
            if int(split_index) > 0:
                student['custom_split_address'].append(student_address[:split_index])
                student['custom_split_address'].append(student_address[split_index:])
            else:
                student['custom_split_address'].append(student_address)
        student_data.append(student)
    return student_data



"""
returns the last standard in the page
"""
def get_student_current_standard(student_ids):
    student_standard_data = StudentStandardMapping.objects.filter(student__in=student_ids).values(
        'student', 'standard', 'standard__sequence', 'academic_year', 'standard__name'
    )
    student_standard_mapping = {}
    for student_standard in student_standard_data:
        if student_standard['student'] not in student_standard_mapping:
            student_standard_mapping[student_standard['student']] = student_standard
        elif student_standard_mapping[student_standard['student']]['standard__sequence'] < student_standard['standard__sequence']:
            student_standard_mapping[student_standard['student']] = student_standard
    return student_standard_mapping

#common function
def get_student_current_standard_section_name(student_ids):
    student_current_standard = get_student_current_standard(student_ids)
    enrollment_data = Enrollment.objects.filter(student__in=student_ids).values(
        'standard_section__standard', 'standard_section__academic_year',
        'student_id', 'standard_section__section__name', 'standard_section__standard__name'
    )
    admission_mapping = get_student_admission_form_details({}, student_ids)
    enrollment_mapping = {}
    for enrollment in enrollment_data:
        if enrollment['student_id'] not in enrollment_mapping:
            enrollment_mapping[enrollment['student_id']] = {}
        if enrollment['standard_section__academic_year'] not in enrollment_mapping[enrollment['student_id']]:
            enrollment_mapping[enrollment['student_id']][enrollment['standard_section__academic_year']] = {}
        enrollment_mapping[enrollment['student_id']][enrollment['standard_section__academic_year']] = enrollment
    for student_id in student_current_standard:
        student_current_standard[student_id]['standard_name'] = student_current_standard[student_id]['standard__name']
        student_current_standard[student_id]['section_name'] = ''
        student_current_standard[student_id]['admission_num'] = ''
        if student_id in enrollment_mapping and student_current_standard[student_id]['academic_year'] in enrollment_mapping[student_id]:
            student_current_standard[student_id]['section_name'] = enrollment_mapping[student_id][student_current_standard[student_id]['academic_year']]['standard_section__section__name']
        if student_id in admission_mapping:
            student_current_standard[student_id]['admission_num'] = admission_mapping[student_id]['admission_num']

    return student_current_standard

#common function
{
    'standard_ids': [1, 2],
    'academic_year': 1,

    'standard_section_ids': [1, 2, 3],

    'student_ids': [1, 2]
}
def get_students_for_standard_or_section(extra_params={}):
    standard_ids = extra_params.get('standard_ids')
    academic_year = extra_params.get('academic_year')
    standard_section_ids = extra_params.get('standard_section_ids')
    student_ids = extra_params.get('student_ids')
    if standard_ids and academic_year:
        student_ids = StudentStandardMapping.objects.filter(academic_year=academic_year, standard__in=standard_ids).values_list('student_id', flat=True)
    elif standard_section_ids:
        student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student_id', flat=True)
    elif student_ids:
        pass
    else:
        raise exceptions.ValidationError('Invalid Filters Supplied')
    return student_ids

def get_students_standards_list(self, student_ids):
    student_admission_mapping = get_student_admission_form_details(self, student_ids, admission_history=False)
    student_standard_mapping = {}
    student_standard_mapping_for_sem_wise = {}
    for stu in StudentStandardMapping.objects.filter(
            student__in=student_ids
        ).values(
            'academic_year', 'standard','student', 'academic_year__start_date',
            'academic_year__end_date', 'standard__name', 'student__first_name',
            'student__middle_name', 'student__last_name', 'student__student_group__name','standard__sequence','standard__standardyearname','standard__standardyearname__name'
        ):
        if stu['student'] not in student_standard_mapping:
            student_standard_mapping[stu['student']] = []
        student_standard_mapping[stu['student']].append(stu)
        if stu ['standard__standardyearname']:
            if stu['student'] not in student_standard_mapping_for_sem_wise:
                student_standard_mapping_for_sem_wise[stu['student']] = {}
            if stu['standard__standardyearname'] not in student_standard_mapping_for_sem_wise[stu['student']]:
                student_standard_mapping_for_sem_wise[stu['student']][stu['standard__standardyearname']] = []
            student_standard_mapping_for_sem_wise[stu['student']][stu['standard__standardyearname']].append(stu)
    if student_standard_mapping_for_sem_wise:
        for student in student_standard_mapping_for_sem_wise:
            student_standard_mapping[student] = []
            for standardyearname in student_standard_mapping_for_sem_wise[student]:
                for index,standarddata in enumerate(student_standard_mapping_for_sem_wise[student][standardyearname]):
                    if index == 0:
                        sequence = standarddata['standard__sequence']
                        stu = standarddata
                    if standarddata['standard__sequence']<sequence:
                        sequence = standarddata['standard__sequence']
                        stu = standarddata
                student_standard_mapping[student].append(stu)
    student_standard_data = {}
    for student in student_ids:
        if student not in student_standard_data:
            student_standard_data[student] = []
        if student in student_standard_mapping:
            for temp_data in student_standard_mapping[student]:
                temp = {
                    'academic_year': temp_data['academic_year'],
                    'start_date': temp_data['academic_year__start_date'],
                    'end_date': temp_data['academic_year__end_date'],
                    'year_name': f'{temp_data["academic_year__start_date"].strftime("%Y")} - {temp_data["academic_year__end_date"].strftime("%Y")}',
                    'admission_num': '',
                    'student': student,
                    'standard': temp_data['standard'],
                    'standard_name': temp_data['standard__standardyearname__name'] if temp_data['standard__standardyearname'] else temp_data['standard__name'],
                    'full_name': get_full_name(temp_data['student__first_name'], temp_data['student__middle_name'], temp_data['student__last_name'])
                }
                temp['student_group_name'] = temp_data['student__student_group__name']
                if student in student_admission_mapping:
                    temp['admission_num'] = student_admission_mapping[student]['admission_num']
                student_standard_data[student].append(temp)
    return student_standard_data

def get_student_standard_list_for_tc(self, student_id):
    student_standard_mapping = list(StudentStandardMapping.objects.filter(
        student=student_id
    ).values(
        'standard',
        'standard__sequence',
        'academic_year',
        standard_name=F('standard__name'),
    ).order_by('-standard__sequence')[:2])
    if len(student_standard_mapping) == 1: #when we are promoting the student whose standard not mapped in the old academic
        previous_standard = Standard.objects.filter(
            is_active=True, sequence=student_standard_mapping[0]['standard__sequence']-1
        ).values(
            'sequence',
            standard=F('id'),
            standard_name=F('name'),
        )
        student_standard_mapping += previous_standard
    return student_standard_mapping
    

def get_student_current_from_and_to_standard(self, student_ids):
    student_standard_data = StudentStandardMapping.objects.filter(student__in=student_ids).values(
        'student', 'standard', 'standard__sequence', 'academic_year'
    )
    student_standard_mapping = {}
    for student_standard in student_standard_data:
        if student_standard['student'] not in student_standard_mapping:
            student_standard_mapping[student_standard['student']] = {
                'from_standard': student_standard,
                'to_standard': student_standard
            }
        elif student_standard_mapping[student_standard['student']]['to_standard']['standard_sequence'] < student_standard['sequence']:
            student_standard_mapping[student_standard['student']]['to_standard'] = student_standard
        elif student_standard_mapping[student_standard['student']]['from_standard']['standard_sequence'] > student_standard['sequence']:
            student_standard_mapping[student_standard['student']]['from_standard'] = student_standard
    return student_standard_mapping

def get_student_admission_form(self, student_ids):
    student_admission_num_dict = {stu['student'] : stu['admission_num'] for stu in 
        AdmissionForm.objects.filter(student__in=student_ids).values('student', 'admission_num')
    }
    return student_admission_num_dict

def get_student_admission_date(self,student_ids):
    student_admission_date_dict = {stu['student'] : stu['admission_date'] for stu in 
        AdmissionForm.objects.filter(student__in=student_ids).values('student', 'admission_date')
    }
    return student_admission_date_dict

def get_student_personal_details(self, student_ids):
    student_details_dict = {stu['student'] : stu for stu in
        StudentDetails.objects.filter(student__in=student_ids).values('student','aadhar_num', 'caste__name','category__name','blood_group')
    }
    return student_details_dict

def get_student_admission_form_details(self, student_ids, admission_history=False):
    values = ['student', 'admission_num', 'admission_date','id']
    if admission_history:
        values.append('admission_form_history_admission_form__data')
    student_admission_num_dict = {stu['student'] : stu for stu in 
        AdmissionForm.objects.filter(student__in=student_ids).values(*values)
    }
    return student_admission_num_dict

from apps.students.models.studentDetail import StudentAddress


def get_student_address(student_ids, type='CP'):
    return_data = {}
    filter_query = {'student__in': student_ids}
    if type == 'C':
        filter_query['type'] = 'C'
    elif type == 'P':
        filter_query['type'] = 'P'
    
    student_address_data = StudentAddress.objects.filter(
        **filter_query
    ).values(
        'address','country__name','state__name','district__name','city__name','student','map_address', 'map_address__address_one_map', 'map_address__address_two_map','map_address__city_map',
        'map_address__district_map','map_address__state_map','map_address__country_map',
        'map_address__pincode_map','map_address__latitude_map','map_address__longitude_map','pincode'
    )
    for student in student_address_data:
        temp = {
            'address_one': '',
            'address_two': '',
            'country': '',
            'state': '',
            'district': '',
            'city': '',
            'latitude': '',
            'longitude': '',
            'pincode': '',
            'is_google_map': False
        }
        if student['map_address']:
            temp['address_one'] = student['map_address__address_one_map']
            temp['address_two'] = student['map_address__address_two_map']
            temp['city'] = student['map_address__city_map']
            temp['district'] = student['map_address__district_map']
            temp['state'] = student['map_address__state_map']
            temp['country'] = student['map_address__country_map']
            temp['pincode'] = student['map_address__pincode_map']
            temp['latitude'] = student['map_address__latitude_map']
            temp['longitude'] = student['map_address__longitude_map']
            temp['is_google_map'] = True
        else:
            temp['address_one'] = student['address']
            temp['city'] = student['city__name']
            temp['district'] = student['district__name']
            temp['state'] = student['state__name']
            temp['country'] = student['country__name']
            temp['pincode'] = student['pincode']
            
        return_data[student['student']] = temp
    return return_data

""" Common Function Ends Here """

def add_student(self, data, isCreateLogin=False, add_all_details=False):
    from apps.finance.services.feature import add_bulk_feature
    from apps.classes.services.promote import get_next_academic_year
    """When you update the logic here please update logic in bulk data update"""

    setting_values = ConfigurationService.get_setting_values(
        ['is_application', 'unique_reg_num', 'is_residential', 'subject_assignment', 'admission_in_reg'],
        data['student_detail']['entry_academic_year'], data['student']['current_standard'])
    entry_standard = data['student']['current_standard']
    parentDetail = guardianDetail = curr_serializer = student = parent_serializer = False
    guardian_serializer = permanent_serializer = False
    profilePicId = data['student']['profile_pic']
    response = {'Result': True, 'Reason': '', 'nonEmptyDict': []}
    admission_counter = None
    standard_group_wise_sequence = {}
    sequence_list =[]
    standard_detail_dict={}
    standard_details = Standard.objects.all().values('id','name','sequence','course_period','standardyearname_id')
    for standard in standard_details:
        if standard['standardyearname_id']:
            if standard['standardyearname_id'] not in standard_group_wise_sequence:
                standard_group_wise_sequence[standard['standardyearname_id']] = []
            standard_group_wise_sequence[standard['standardyearname_id']].append(standard)
        if standard['sequence'] not in standard_detail_dict:
            standard_detail_dict[standard['sequence']] = {}
        standard_detail_dict[standard['sequence']]={
            'id':standard['id'],'name':standard['name'],'sequence':standard['sequence'],'course_period':standard['course_period']
        }
        if standard['id'] == data['student']['current_standard']:
            course_period = standard['course_period']
            current_standard_sequence = standard['sequence']
            is_current_standard_having_group = standard['standardyearname_id']
    if is_current_standard_having_group:
        for group_id in standard_group_wise_sequence:
            for index,sequence in enumerate(standard_group_wise_sequence[group_id]):
                if not index:
                    min_sequence = sequence['sequence']
                    min_sequence_standard = sequence['id']
                if sequence['sequence'] < min_sequence:
                    min_sequence = sequence['sequence']
                    min_sequence_standard = sequence['id']
            sequence_list.append({'sequence':min_sequence,'standard':min_sequence_standard})
        sequence_list = sorted(sequence_list, key=lambda x: x['sequence'])
        current_sequence_indices_in_sequence_list = [i for i, d in enumerate(sequence_list) if d['sequence'] == current_standard_sequence]
    if add_all_details and isCreateLogin and FormdefinitionService.get_formdefintion_data({}, 'student_configuration', 'auto_login_create'):
        default_passwor = 'edubricz'
        default_password = FormdefinitionService.get_formdefintion_data({}, 'student_configuration', 'default_password')
        if default_password:
            default_passwor = default_password
        data['student_detail']['admission_num'], admission_counter = generate_admission_num_to_admission_form(
            self, data['student_detail']['entry_academic_year'], entry_standard
        )
        if 'users' not in data:
            data['users'] = {}
        data['users']['username'] = data['student_detail']['admission_num']
        data['users']['password'] = default_passwor
    if isCreateLogin:
        if User.isUsernameExist(self, data['users']['username']):
            raise exceptions.ValidationError('Username is already exists.')
    if not data['student']['current_standard']:
        raise exceptions.ValidationError('Standard is required!')
    if add_all_details:
        response = validate_all_details(self, data, setting_values)
        if data['student_detail']['is_existing_student'] is False and setting_values[
            'is_application'] == '1' and StudentDetails.objects.filter(
            application=data['student_detail']['application']).exists():
            raise exceptions.ValidationError('Application number must be unique!')
    if response['Result']:
        if 'parent_detail' in response['nonEmptyDict']:
            parent_serializer = ParentDetailSerializer(data=data['parent_detail'])
            parent_serializer.is_valid(raise_exception=True)  # raise exception from serializer
        if 'guardian_detail' in response['nonEmptyDict']:
            guardian_serializer = GuardianDetailSerializer(data=data['guardian_detail'])
            guardian_serializer.is_valid(raise_exception=True)  # raise exception from serializer
        with transaction.atomic(using=get_current_db_name()):
            if setting_values['unique_reg_num'] == '1':
                serializer = StudentUniqueRegNumSerializer(data=data['student'])
            else:
                serializer = StudentSerializer(data=data['student'])
            serializer.is_valid(raise_exception=True)
            student = serializer.save()
            if add_all_details and student.id:
                data['student_detail']['previous_school_details_new'] = None
                if 'previous_school_details_new' in response['nonEmptyDict']:
                    prev_school_serializer = StudentPreviousSchoolDetailsSerializer(data=data['student_detail']['previousschool_details_new'])
                    prev_school_serializer.is_valid(raise_exception=True)
                    prev_school_details=prev_school_serializer.save()
                    data['student_detail']['previous_school_details_new'] = prev_school_details.id
                data['student_detail']['student'] = student.id
                stud_serializer = StudentDetailSerializer(data=data['student_detail'])
                stud_serializer.is_valid(raise_exception=True)
                if SharedService.check_all_dictvalues_not_emp_or_none(data['student_address']):
                    if SharedService.check_all_dictvalues_not_emp_or_none(
                            data['student_address']['current_address']):
                        data['student_address']['current_address']['student'] = student.id
                        data['student_address']['current_address']['type'] = 'CP'
                        if data['student_address']['cp'] and not data['student_address']['permanent_address']:
                            if SharedService.check_all_dictvalues_not_emp_or_none(
                                    data['student_address']['permanent_address']):
                                data['student_address']['permanent_address']['application_student'] = student.id
                                data['student_address']['permanent_address']['type'] = 'P'
                                data['student_address']['current_address']['type'] = 'C'
                                if 'map_address_data' in data['student_address']['permanent_address'] and data['student_address']['permanent_address']['map_address_data']:
                                    map_data = add_google_map_data(data['student_address']['permanent_address']['map_address_data'])
                                    data['student_address']['permanent_address']['map_address'] = map_data.id
                                else:
                                    data['student_address']['permanent_address']['map_address']=None
                                data['student_address']['permanent_address']['address'] = data['student_address']['current_address']['address'] \
                                    if 'current_address' in data['student_address'] and 'address' in data['student_address']['current_address']else None
                                data['student_address']['permanent_address']['country'] = data['student_address']['current_address']['country'] \
                                    if 'current_address' in data['student_address'] and 'country' in data['student_address']['current_address']else None
                                data['student_address']['permanent_address']['state'] = data['student_address']['current_address']['state'] \
                                    if 'current_address' in data['student_address'] and 'state' in data['student_address']['current_address']else None
                                data['student_address']['permanent_address']['district'] = data['student_address']['current_address']['district'] \
                                    if 'current_address' in data['student_address'] and 'district' in data['student_address']['current_address']else None
                                data['student_address']['permanent_address']['city'] = data['student_address']['current_address']['city'] \
                                    if 'current_address' in data['student_address'] and 'city' in data['student_address']['current_address']else None
                                data['student_address']['permanent_address']['pincode'] = data['student_address']['current_address']['pincode'] \
                                    if 'current_address' in data['student_address'] and 'pincode' in data['student_address']['current_address']else None
                                permanent_serializer = StudentAddressSerializer(
                                    data=data['student_address']['permanent_address'])
                                permanent_serializer.is_valid(raise_exception=True)
                        if not data['student_address']['cp']:
                            if SharedService.check_all_dictvalues_not_emp_or_none(
                                    data['student_address']['permanent_address']):
                                data['student_address']['permanent_address']['student'] = student.id
                                data['student_address']['permanent_address']['type'] = 'P'
                                data['student_address']['current_address']['type'] = 'C'
                                if 'map_address_data' in data['student_address']['permanent_address']:
                                    map_data = add_google_map_data(data['student_address']['permanent_address']['map_address_data'])
                                    data['student_address']['permanent_address']['map_address'] = map_data.id
                                else:
                                    data['student_address']['permanent_address']['map_address'] = None
                                data['student_address']['permanent_address']['address'] = data['student_address']['permanent_address']['address'] if 'address' in data['student_address']['permanent_address'] else None
                                data['student_address']['permanent_address']['country'] = data['student_address']['permanent_address']['country'] if 'country' in data['student_address']['permanent_address'] else None
                                data['student_address']['permanent_address']['state'] = data['student_address']['permanent_address']['state'] if 'state' in data['student_address']['permanent_address'] else None
                                data['student_address']['permanent_address']['district'] = data['student_address']['permanent_address']['district'] if 'district' in data['student_address']['permanent_address'] else None
                                data['student_address']['permanent_address']['city'] = data['student_address']['permanent_address']['city'] if 'city' in data['student_address']['permanent_address'] else None
                                data['student_address']['permanent_address']['pincode'] = data['student_address']['permanent_address']['pincode'] if 'pincode' in data['student_address']['permanent_address'] else None
                                permanent_serializer = StudentAddressSerializer(
                                    data=data['student_address']['permanent_address'])
                                permanent_serializer.is_valid(raise_exception=True)
                        if 'map_address_data' in data['student_address']['current_address']:
                            map_data = add_google_map_data(data['student_address']['current_address']['map_address_data'])
                            data['student_address']['current_address']['map_address'] = map_data.id
                        else:
                            data['student_address']['current_address']['map_address'] = None
                        data['student_address']['current_address']['address'] = data['student_address']['current_address']['address'] if 'address' in data['student_address']['current_address'] else None
                        data['student_address']['current_address']['country'] = data['student_address']['current_address']['country'] if 'country' in data['student_address']['current_address'] else None
                        data['student_address']['current_address']['state'] = data['student_address']['current_address']['state'] if 'state' in data['student_address']['current_address'] else None
                        data['student_address']['current_address']['district'] = data['student_address']['current_address']['district'] if 'district' in data['student_address']['current_address'] else None
                        data['student_address']['current_address']['city'] = data['student_address']['current_address']['city'] if 'city' in data['student_address']['current_address'] else None
                        data['student_address']['current_address']['pincode'] = data['student_address']['current_address']['pincode'] if 'pincode' in data['student_address']['current_address'] else None
                        curr_serializer = StudentAddressSerializer(
                            data=data['student_address']['current_address'])
                        curr_serializer.is_valid(raise_exception=True)
                if data['feature']:
                    temp = {'feature': data['feature'], 'student_feature': [student.id], 'feature_status': 1}
                    if 'fee_plan_item_selling_mapping' in data and data['fee_plan_item_selling_mapping']:
                        temp['fee_plan_item_selling_mapping'] = data['fee_plan_item_selling_mapping']
                    add_bulk_feature(self, temp)
                if course_period:
                    studentStandard=[]
                    for year in range(course_period):
                        student_group = data['student']['student_group'] if 'student_group' in data['student'] else None
                        if not year:
                            temp_standard_data = {
                                'academic_year':data['student_detail']['entry_academic_year'],
                                'student':student.id,'reg_num':data['student']['current_reg_num'],'student_group':student_group,
                                'standard':data['student']['current_standard'],'is_new_student':data['student']['is_new_student']}
                            current_academic_year = data['student_detail']['entry_academic_year']
                        else:
                            academic_year_obj=AcademicYear.objects.get(id=current_academic_year)
                            next_academic_year = get_next_academic_year(academic_year_obj)
                            temp_standard_data = {
                                'academic_year':str(next_academic_year.id),
                                'student':student.id,'reg_num':data['student']['current_reg_num'],'is_new_student':0}
                            if is_current_standard_having_group:
                                temp_standard_data['standard']=sequence_list[current_sequence_indices_in_sequence_list[0]+year]['standard']
                            else:
                                temp_standard_data['standard']=standard_detail_dict[current_standard_sequence+year]['id']
                            current_academic_year=next_academic_year.id
                        studentStandard.append(temp_standard_data)
                        student_standard = StudentStandardMappingSerializer(data=studentStandard,many=True)
                        student_standard.is_valid(raise_exception=True)
                else:
                    studentStandard = {'academic_year': data['student_detail']['entry_academic_year'],
                                    'standard': data['student']['current_standard'], 'student': student.id,
                                    'reg_num': data['student']['current_reg_num'], 'is_new_student': data['student']['is_new_student']}
                    if 'student_group' in data['student']:
                        studentStandard['student_group'] = data['student']['student_group']
                    student_standard = StudentStandardMappingSerializer(data=studentStandard)
                    student_standard.is_valid(raise_exception=True)
                reg = None
                if setting_values['unique_reg_num'] == '0' and setting_values['admission_in_reg'] == '1':
                    if setting_values['is_residential'] == '1' and student.student_type == STUDENT_TYPE['RESIDENTIAL']:
                        student_type = 'ADMISSION_R'
                    else:
                        student_type = 'ADMISSION_D'
                    counter, prefix, postfix = CounterService.get_countered_value(self, student_type,
                                                                                  standard=data['student'][
                                                                                      'current_standard'],
                                                                                  academic_year=data['student_detail'][
                                                                                      'entry_academic_year'])
                    reg = prefix + '{:0>3}'.format(counter.value) + postfix
                    student.current_reg_num = reg
                    student.save()
                if setting_values['is_residential'] == '1':
                    academicYear = AcademicYear.objects.get(id=data['student_detail']['entry_academic_year'])
                    student_type = {'student_type': data['student']['student_type'], 'student': student.id,
                                    'from_date': academicYear.start_date, 'to_date': academicYear.end_date,
                                    'reg_num': reg}
                    studentType_serializer = StudentTypeSerializer(data=student_type)
                    studentType_serializer.is_valid(raise_exception=True)
                    studentType_serializer.save()
                if setting_values['subject_assignment'] != '2':
                    if not data['subject_detail']:
                        raise exceptions.ValidationError('Please select the subject(s).')
                    subjectList = list()
                    for sub in data['subject_detail']:
                        if sub:
                            subjectList.append(
                                {'student': student.id, 'academic_year': data['student_detail']['entry_academic_year'],
                                 'subject': sub})
                    subject_serializer = SubjectStudentSerializer(data=subjectList, many=True)
                    subject_serializer.is_valid(raise_exception=True)
                    subject_serializer.save()
                if parent_serializer:
                    parentDetail = parent_serializer.save()
                    data['parent'] = parentDetail.id
                if guardian_serializer:
                    guardianDetail = guardian_serializer.save()
                    data['guardian'] = guardianDetail.id
                if parentDetail or guardianDetail:
                    data['student'] = student.id
                    map_serializer = StudentParentMappingSerializer(data=data)
                    map_serializer.is_valid(raise_exception=True)  # raise exception from serializer
                    map_serializer.save()
                if stud_serializer:
                    studDetail = stud_serializer.save()
                    student.entry_academic_year = studDetail.entry_academic_year
                if curr_serializer:
                    curr_serializer.save()
                if permanent_serializer:
                    permanent_serializer.save()
                student_standard.save()
                if isCreateLogin:
                    data['users']['student'] = student.id
                    data['users']['email'] = student.email
                    data['users']['mobile_num'] = student.mobile_num
                    User.create_login_for_student(self, data['users'])
                if setting_values['unique_reg_num'] == '0' and setting_values['admission_in_reg'] == '1':
                    CounterService.increment_counter(self, counter)
                if 'document_list' in data and data['document_list']:
                    add_or_update_student_document(student.id, data['document_list'])
                if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
                    add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], student)
                if 'sibling_data' in data:
                    if data['sibling_data']:
                        for sibling in data['sibling_data']:
                            if sibling['student'] == 'self':
                                sibling['student'] = student.id
                            if sibling['student_parent_tree'] == 'self':
                                sibling['student_parent_tree'] = student.id
                        add_or_update_sibling(self, data['sibling_data'])
                admission_num = data['student_detail']['admission_num'] if 'admission_num' in data['student_detail'] and data['student_detail']['admission_num'] else None
                admission_date = data['student_detail']['admission_date'] if 'admission_date' in data['student_detail'] and data['student_detail']['admission_date'] else None
                add_student_to_admission_form(
                    self, data['student_detail']['entry_academic_year'], data['student_detail']['student'], entry_standard, admission_num, admission_date, admission_counter=admission_counter
                )
        if profilePicId:
            UploadTypeService.make_document_active(profilePicId)
        response.pop('nonEmptyDict')
        SharedService.custom_thread(student_admission_form_notification, self, student)
        # Dashboard cache is now updated automatically via signals (apps.finance.signals)
        return {'Reason': 'Student successfully created!', 'data': {'id': student.id}}

def student_admission_form_notification(self, student):
    action = 'studentall_create'
    notification_obj = NotificationBodyTemplate(action)
    inst_obj=Institute.get_institute(self)
    customized_data = list()
    institue_app_data =inst_obj.app_data
    temp = {
        'student_name': student.first_name,
        'name':get_full_name(student.first_name,student.middle_name,student.last_name),
        'start_year': student.entry_academic_year.start_date.year,
        'end_year': student.entry_academic_year.end_date.year,
        'username': student.user_student.username,
        'standard_name': student.current_standard.name,
        'password': decrypt_password(student.user_student.password_two),
        'student_app_android' : institue_app_data['student_app_android'] if institue_app_data and 'student_app_android' in institue_app_data and institue_app_data['student_app_android'] else 'https://rb.gy/3aj34l',
        'student_app_ios' : institue_app_data['student_app_ios'] if institue_app_data and 'student_app_ios' in institue_app_data and institue_app_data['student_app_ios'] else 'https://rb.gy/cu2q1o',
        'school_name' :inst_obj.name,
        'school_code':inst_obj.code,
        'student_obj':student
        
    }
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    body_sms = notification_obj.select_template('sms', temp)
    whatsapp_details = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp', temp)
    if student.email:
        customized_data.append(
            {'email': student.email, 'user_id': student.user_student.id, 'email_subject': None,
                                   'email_body': body_email, 'email_notification':1}
        )
    if student.mobile_num:
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': student.user_student.id, 'sms_body': body_sms, 'sms_notification': 1}
        )
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': student.user_student.id, 'whatsapp_body': whatsapp_details['whatsapp_template'], 'whatsapp_notification': 1,
             'whatsapp_template_id':whatsapp_details['whatsapp_template_id'],'whatsapp_field_value':whatsapp_details['field_values'],'whatsapp_contact_details':whatsapp_details['contact']}
        )
    customized_data.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}})
    send_notification(action, body=None, customizedData=customized_data)


def validate_all_details(self, data, setting_values, student=None):
    response = {'Result': True, 'nonEmptyDict': []}
    if data['student']['current_reg_num'] and setting_values['admission_in_reg'] == '0':
        regNumCheck = StudentStandardMapping.objects.filter(academic_year=data['student_detail']['entry_academic_year'],
                                                            reg_num=data['student']['current_reg_num'])
        if student:
            regNumCheck = regNumCheck.exclude(student=student)
        # if regNumCheck:
        #     raise exceptions.ValidationError('Register number is already exist(s) in the Academic year.')
    student_details_validation(data['student_detail'], setting_values['is_application'])
    response['nonEmptyDict'].append('student_detail')
    if SharedService.check_all_dictvalues_not_emp_or_none(data['parent_detail']):
        student_parents_validation(data['parent_detail'])
        response['nonEmptyDict'].append('parent_detail')
    if SharedService.check_all_dictvalues_not_emp_or_none(data['guardian_detail']):
        student_guardian_validation(data['guardian_detail'])
        response['nonEmptyDict'].append('guardian_detail')
    if 'previousschool_details_new' in data['student_detail'] and SharedService.check_all_dictvalues_not_emp_or_none(data['student_detail']['previousschool_details_new']):
        response['nonEmptyDict'].append('previous_school_details_new')
    if data['feature']:
        if len(data['feature']) != len(set(data['feature'])):
            raise exceptions.ValidationError('Duplicate features found!')
    if 'document_list' in data and data['document_list']:
        deletable_document_list = []
        if 'deletable_document_list' in data and data['deletable_document_list']:
            deletable_document_list = data['deletable_document_list']
        validate_document_list(data['document_list'], deletable_document_list, student)
    return response

def validate_document_list(document_list, deletable_document_list=[], student=None):
    duplicate_document = {}
    duplicate_document_type = {}
    existing_document_list = {}
    if student:
        existing_document_list = {
            student_document['id']: student_document for student_document in StudentDocumentMapping.objects.filter(student=student).exclude(id__in=deletable_document_list).values()
        }
    for document in document_list:
        if document['document'] in existing_document_list:
            if 'id' not in document or document['id'] != existing_document_list[document['document']]['id']:
                raise exceptions.ValidationError('Duplicate Document list found')
        if document['document'] in duplicate_document:
            raise exceptions.ValidationError('Duplicate Document')
        if document['document_type']:
            duplicate_document_type[document['document_type']] = ''
        if document['document']:
            duplicate_document[document['document']] = ''

def student_details_validation(data, is_application):
    if is_application == '1' and data['is_existing_student'] is False:
        if not data['application']:
            raise exceptions.ValidationError('Application number is required!')
        if not ApplicationStudent.objects.filter(is_active=True, id=data['application'], is_approved=True).exists():
            raise exceptions.ValidationError('Students Application Form is not approved please approve application form')
    if not data['entry_academic_year']:
        raise exceptions.ValidationError('Academic year is required!')
    return True


def student_parents_validation(data):
    if (not data['father_name']) and (not data['mother_name']):
        raise exceptions.ValidationError('Parent name is required!')
    return True


def student_guardian_validation(data):
    if not data['guardian_name']:
        raise exceptions.ValidationError('Guardian name is required!')
    return True


def restrict_update(self, instance, data):
    admissionForm = AdmissionForm.objects.filter(student=self.kwargs['pk']).order_by('academic_year__start_date')
    if admissionForm:
        if instance.current_standard.pk != data['student']['current_standard']:
            raise exceptions.ValidationError('Standard cannot be updated!')
        return True
    return False

def get_child_data(self, child_tracking_sib, student_id, child_list=[]):
    if student_id in child_tracking_sib and  child_tracking_sib[student_id]['child_student_id']:
        child_list.append(child_tracking_sib[student_id])
        self.get_child_data(child_tracking_sib, child_tracking_sib[student_id]['child_student_id'], child_list)
    elif student_id in child_tracking_sib:
        child_list.append(child_tracking_sib[student_id])
    return child_list

"""
    Supports only for one chain link
"""
def add_or_update_sibling(self, sibling_list):
    sibling_student_ids = set()
    given_key_student_mapping = []
    duplicate_student_check = {}
    duplicate_student_parent_check = {}
    parent_child_data = []
    child_data = []
    #sibling list should be ordered
    is_parent_last_null_exist = False
    for sibling in sibling_list:
        if not sibling['student']:
            raise exceptions.ValidationError('student is mandatory')
        sibling_student_ids.add(sibling['student'])
        if sibling['student'] in child_data:
            raise exceptions.ValidationError('Invalid sibling data duplicate child')
        child_data.append(sibling['student'])
        if sibling['student_parent_tree']:
            sibling_student_ids.add(sibling['student_parent_tree'])
        given_key_student_mapping.append(str(sibling['student']))
        if sibling['student'] in duplicate_student_check:
            raise exceptions.ValidationError(f'{sibling["student"]} duplicate student found')
        if sibling['student_parent_tree'] in duplicate_student_parent_check:
            raise exceptions.ValidationError(f'{sibling["student_parent_tree"]} duplicate student found')
        if sibling['student_parent_tree'] in parent_child_data:
            raise exceptions.ValidationError('Invalid Sibling data duplicate parent')
        if sibling['student_parent_tree'] is None:
            is_parent_last_null_exist = True
        parent_child_data.append(sibling['student_parent_tree'])
    if not is_parent_last_null_exist:
        raise exceptions.ValidationError('Invalid Sibling data no end')
    #validation
    sibling_student_ids = list(sibling_student_ids)
    child_data = [child_data[r] for r in range(0, len(child_data)-1)]
    parent_child_data = parent_child_data[1:len(parent_child_data)]
    if child_data != parent_child_data:
        raise exceptions.ValidationError('Invalid Sibling data')
    given_key_student_mapping = '_'.join(given_key_student_mapping)
    sib_obj = StudentSiblingMapping()
    student_sibling_data = sib_obj.get_student_sibling_data(sibling_student_ids)
    student_sibling_list_ids = {}
    for student_data in student_sibling_data.values():
        key = []
        associated_ids = []
        for sibling in student_data['sibling_list']:
            key.append(str(sibling['student_id']))
            associated_ids.append(sibling['id'])
        if key:
            key = '_'.join(key)
            student_sibling_list_ids[key] = associated_ids
    StudentSiblingMapping.objects.filter(Q(student__in=sibling_student_ids) | Q(student_parent_tree__in=sibling_student_ids)).delete()
    std = StudentSiblingSerializer(data=sibling_list, many=True)
    std.is_valid(raise_exception=True)
    std.save()


def update_student(self, data, add_all_details=False, **kwargs):
    from apps.users.services.auth import update_mobile_and_email_signup
    setting_values = ConfigurationService.get_setting_values(['is_application', 'unique_reg_num', 'admission_in_reg'])
    student_detail_queryset = None
    stud_serializer = parentDetail = guardianDetail = curr_serializer = parent_serializer = stud_prev_school_serializer = False
    guardian_serializer = permanent_serializer = False
    profilePicId = data['student']['profile_pic']
    response = {'Result': True, 'Reason': '', 'nonEmptyDict': []}
    partial = kwargs.pop('partial', False)
    if not data['student']['current_standard']:
        raise exceptions.ValidationError('Standard is required!')
    instance = self.get_object()
    existingMobile = instance.mobile_num
    existingEmail = instance.email
    studentData = data['student']
    studentData['id'] = self.kwargs['pk']
    admission = restrict_update(self, instance, data)
    if add_all_details:
        parentId = data['parent_detail'].pop('id', None)  # update validating without id
        guardianId = data['guardian_detail'].pop('id', None)
        response = validate_all_details(self, data, setting_values, instance.pk)
        data['parent_detail']['id'] = parentId
        data['guardian_detail']['id'] = guardianId
    if response['Result']:
        if 'parent_detail' in response['nonEmptyDict']:
            try:
                queryset = ParentDetail.objects.get(id=data['parent_detail']['id'])
            except:
                queryset = None
            parent_serializer = ParentDetailSerializer(data=data['parent_detail'], instance=queryset, partial=partial)
            parent_serializer.is_valid(raise_exception=True)  # raise exception from serializer
        elif data['parent_detail']['id']:
            ParentDetail.objects.filter(id=data['parent_detail']['id']).delete()
        if 'guardian_detail' in response['nonEmptyDict']:
            try:
                queryset = GuardianDetail.objects.get(id=data['guardian_detail']['id'])
            except:
                queryset = None
            guardian_serializer = GuardianDetailSerializer(data=data['guardian_detail'], instance=queryset,
                                                           partial=partial)
            guardian_serializer.is_valid(raise_exception=True)  # raise exception from serializer
        elif data['guardian_detail']['id']:
            GuardianDetail.objects.filter(id=data['guardian_detail']['id']).delete()
        if 'student_detail' in response['nonEmptyDict']:
            data['student_detail']['student'] = instance.id
            if "bpl_issue_date" in data['student_detail'] and data["student_detail"]['bpl_issue_date'] == "":
                    del data["student_detail"]['bpl_issue_date']
            try:
                student_detail_queryset = StudentDetails.objects.get(student=instance)
            except:
                student_detail_queryset = None
            stud_serializer = StudentDetailSerializer(data=data['student_detail'], instance=student_detail_queryset,
                                                      partial=partial)
            stud_serializer.is_valid(raise_exception=True)
            if 'previous_school_details_new' in response['nonEmptyDict']:
                try:
                    prev_school_details_queyset = PreviousSchoolDetails.objects.get(id=student_detail_queryset.previous_school_details_new.id)
                except:
                    prev_school_details_queyset = None
                stud_prev_school_serializer = StudentPreviousSchoolDetailsSerializer(data=data['student_detail']['previousschool_details_new'], instance=prev_school_details_queyset,
                                                        partial=partial)
                stud_prev_school_serializer.is_valid(raise_exception=True)
        if SharedService.check_all_dictvalues_not_emp_or_none(data['student_address']):
            if SharedService.check_all_dictvalues_not_emp_or_none(
                    data['student_address']['current_address']):
                data['student_address']['current_address']['student'] = instance.id
                data['student_address']['current_address']['type'] = 'CP'
                try:
                    queryset_current = StudentAddress.objects.get(student=instance, type__contains='C')
                except:
                    queryset_current = None
                if not data['student_address']['cp']:
                    if SharedService.check_all_dictvalues_not_emp_or_none(
                            data['student_address']['permanent_address']):
                        data['student_address']['permanent_address']['student'] = instance.id
                        data['student_address']['permanent_address']['type'] = 'P'
                        data['student_address']['current_address']['type'] = 'C'
                        try:
                            queryset_permanent = StudentAddress.objects.get(student=instance, type='P')
                        except:
                            queryset_permanent = None
                        if queryset_permanent and queryset_permanent.map_address:
                            data['student_address']['permanent_address']['map_address_data']['id'] = queryset_permanent.map_address_id
                        if 'map_address_data' in data['student_address']['permanent_address'] and data['student_address']['permanent_address']['map_address_data']:
                            map_data = add_google_map_data(data['student_address']['permanent_address']['map_address_data'])
                            data['student_address']['permanent_address']['map_address'] = map_data.id
                        else:
                            data['student_address']['permanent_address']['map_address'] = None
                        data['student_address']['permanent_address']['address'] = data['student_address']['permanent_address']['address'] if 'address' in data['student_address']['permanent_address'] else None
                        data['student_address']['permanent_address']['country'] = data['student_address']['permanent_address']['country'] if 'country' in data['student_address']['permanent_address'] else None
                        data['student_address']['permanent_address']['state'] = data['student_address']['permanent_address']['state'] if 'state' in data['student_address']['permanent_address'] else None
                        data['student_address']['permanent_address']['district'] = data['student_address']['permanent_address']['district'] if 'district' in data['student_address']['permanent_address'] else None
                        data['student_address']['permanent_address']['city'] = data['student_address']['permanent_address']['city'] if 'city' in data['student_address']['permanent_address'] else None
                        data['student_address']['permanent_address']['pincode'] = data['student_address']['permanent_address']['pincode'] if 'pincode' in data['student_address']['permanent_address'] else None
                        permanent_serializer = StudentAddressSerializer(instance=queryset_permanent,
                                                                        data=data['student_address'][
                                                                            'permanent_address'], partial=partial)
                        permanent_serializer.is_valid(raise_exception=True)
                else:
                    try:
                        queryset_permanent = StudentAddress.objects.get(student=instance, type='P')
                        queryset_permanent.delete()
                    except:
                        pass
                if queryset_current and queryset_current.map_address and 'map_address_data' in data['student_address']['current_address'] and data['student_address']['current_address']['map_address_data']:
                    data['student_address']['current_address']['map_address_data']['id'] = queryset_current.map_address_id
                if 'map_address_data' in data['student_address']['current_address'] and data['student_address']['current_address']['map_address_data']:
                    map_data = add_google_map_data(data['student_address']['current_address']['map_address_data'])
                    data['student_address']['current_address']['map_address'] = map_data.id
                else:
                    data['student_address']['current_address']['map_address'] = None
                data['student_address']['current_address']['address'] = data['student_address']['current_address']['address'] if 'address' in data['student_address']['current_address'] else None
                data['student_address']['current_address']['country'] = data['student_address']['current_address']['country'] if 'country' in data['student_address']['current_address'] else None
                data['student_address']['current_address']['state'] = data['student_address']['current_address']['state'] if 'state' in data['student_address']['current_address'] else None
                data['student_address']['current_address']['district'] = data['student_address']['current_address']['district'] if 'district' in data['student_address']['current_address'] else None
                data['student_address']['current_address']['city'] = data['student_address']['current_address']['city'] if 'city' in data['student_address']['current_address'] else None
                data['student_address']['current_address']['pincode'] = data['student_address']['current_address']['pincode'] if 'pincode' in data['student_address']['current_address'] else None
                curr_serializer = StudentAddressSerializer(data=data['student_address']['current_address'],
                                                           instance=queryset_current, partial=partial)
                curr_serializer.is_valid(raise_exception=True)
        with transaction.atomic(using=get_current_db_name()):
            try:
                studInstance = StudentStandardMapping.objects.get(
                    academic_year=student_detail_queryset.entry_academic_year, standard=instance.current_standard,
                    student=instance.id)
            except:
                studInstance = None
            if not admission:
                studentStandard = {'academic_year': data['student_detail']['entry_academic_year'],
                                   'standard': data['student']['current_standard'], 'student': instance.id,
                                    'is_new_student': data['student']['is_new_student']   
                                }
                student_standard = StudentStandardMappingSerializer(data=studentStandard, instance=studInstance)
                student_standard.is_valid(raise_exception=True)
                student_standard.save()
            elif studInstance and studInstance.is_new_student != data['student']['is_new_student']:
                temp_student_standard = {'is_new_student': data['student']['is_new_student']}
                student_standard = StudentStandardMappingSerializer(data=temp_student_standard, instance=studInstance, partial=True)
                student_standard.is_valid(raise_exception=True)
                student_standard.save()
            if setting_values['unique_reg_num'] == '1':
                serializer = StudentUniqueRegNumSerializer(data=data['student'], instance=instance, partial=partial)
            else:
                serializer = StudentSerializer(data=data['student'], instance=instance, partial=partial)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            reg_num = StudentStandardMapping.objects.filter(standard=data['student']['current_standard'],
                                                            student=instance).order_by(
                'academic_year__start_date').last()
            if reg_num:
                reg_num.reg_num = data['student']['current_reg_num']
                reg_num.save()
            if parent_serializer:
                parentDetail = parent_serializer.save()
                data['parent'] = parentDetail.id
            if guardian_serializer:
                guardianDetail = guardian_serializer.save()
                data['guardian'] = guardianDetail.id
            if parentDetail or guardianDetail:
                data['student'] = instance.id
                try:
                    queryset = StudentParentMapping.objects.get(student=instance)
                except:
                    queryset = None
                map_serializer = StudentParentMappingSerializer(data=data, instance=queryset, partial=partial)
                map_serializer.is_valid(raise_exception=True)  # raise exception from serializer
                map_serializer.save()
            if stud_serializer:
                stud_serializer.save()
            if stud_prev_school_serializer:
                stud_prev_school_serializer.save()
            if curr_serializer:
                curr_serializer.save()
            if permanent_serializer:
                permanent_serializer.save()
            if str(existingMobile) != str(studentData['mobile_num']) or str(existingEmail) != str(studentData['email']):
                userid = User.objects.get(student=studentData['id']).id
                update_mobile_and_email_signup(self, userid, studentData['mobile_num'], studentData['email'])
            if 'document_list' in data and data['document_list']:
                deletable_document_list = []
                if 'deletable_document_list' in data and data['deletable_document_list']:
                    deletable_document_list = data['deletable_document_list']
                add_or_update_student_document(studentData['id'], data['document_list'], deletable_document_list)
            if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
                add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], instance)
            if 'sibling_data' in data:
                if data['sibling_data']:
                    for sibling in data['sibling_data']:
                        if sibling['student'] == 'self':
                            sibling['student'] = instance.id
                        if sibling['student_parent_tree'] == 'self':
                            sibling['student_parent_tree'] = instance.id
                    add_or_update_sibling(self, data['sibling_data'])
                else:
                    StudentSiblingMapping.objects.filter(
                        Q(student= instance.id) | Q(student_parent_tree=instance.id)
                    ).delete()
        if profilePicId:
            UploadTypeService.make_document_active(profilePicId)
        response.pop('nonEmptyDict')
    return {'Reason': 'Student details updated Successfully!'}


def add_or_update_student_document(student_id, document_list, deletable_document_list=[]):
    if deletable_document_list:
        StudentDocumentMapping.objects.filter(id__in=deletable_document_list).update(is_active=False)
    for data in document_list:
        data['student'] = student_id
        if 'id' in data and data['id']:
            serializer = StudentDocumentMappingSerializer(instance=StudentDocumentMapping.objects.get(id=data['id']),data=data)
        else:
            serializer = StudentDocumentMappingSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def get_student_admission_form_receipt(self,response):
    default='default_adm_form.html'
    selected_template, number_of_copies = get_selected_template(self, 'admission_form', 'pdf', default)
    path='admission_form/'+selected_template
    enrollment_data = Enrollment.objects.filter(student=response['data']['id'], standard_section__standard=response['data']['current_standard']).values(
    'student', standard_name=F('standard_section__standard__name'), section_name=F('standard_section__section__name')
        )
    response['data']['enrollment_data'] = enrollment_data[0] if len(enrollment_data) > 0 else {}
    response['data']['today'] = datetime.today().strftime('%d/%m/%Y')
    response['data']['dob'] = datetime.strptime(response['data']['dob'], '%Y-%m-%d')
    if response['data']['admission_date']:
        response['data']['admission_date'] = datetime.strptime(response['data']['admission_date'], '%Y-%m-%d')
    response['data']['institute'] = Institute.get_institute(self)
    response['data']['student_details']['is_sc_st'] = SharedService.get_is_sc_st(self,response['data']['id'])
    response['data']['admission_type'] = 'new admission' if response['data']['is_new_student'] else 'old student'
    response = PDFService.receipt(self, response['data'], 'admission_form',path, False)
    return response

def get_student_data(self):
    response = SharedService.read_data(self)
    institute = Institute.objects.filter().first()
    admission_form = AdmissionForm.objects.filter(student=self.kwargs['pk']).order_by('academic_year').last()
    if admission_form:
        admission_form = AdmissionFormSerializer(admission_form).data
        response['data'].update(
            {'admission_year': admission_form['academic_year_value'], 'admission_num': admission_form['admission_num'],
             'admission_date': admission_form['admission_date']})
    else:
        response['data'].update({'admission_year': None, 'admission_num': None, 'admission_date': None})
    student_academic_year_list = StudentStandardMapping.objects.filter(student=response['data']['id']).values('academic_year','academic_year__start_date','academic_year__end_date')
    last_academic_year_end_date = student_academic_year_list[0]['academic_year__end_date']
    last_academic_year_id = student_academic_year_list[0]['academic_year']
    today = date.today()
    current_academic_year_id = None
    for academic_year in student_academic_year_list:
        start_date = academic_year['academic_year__start_date']
        end_date = academic_year['academic_year__end_date']
        if start_date <= today <= end_date:
            current_academic_year_id = academic_year['academic_year']
        if last_academic_year_end_date <= end_date:
            last_academic_year_end_date = end_date
            last_academic_year_id = academic_year['academic_year']
    if institute.code == 'santhoshnursing':
        academic_year_id_to_use = current_academic_year_id or last_academic_year_id #for nursing colleges
    else:
        academic_year_id_to_use = last_academic_year_id
    student_standard = StudentStandardMapping.objects.get(student=response['data']['id'],standard=response['data']['current_standard'],academic_year=academic_year_id_to_use)
    # response['data']['student_details']['entry_academic_year'] = student_standard.academic_year.id
    # response['data']['student_details']['entry_academic_year_value'] = str(student_standard.academic_year.start_date.year)+'-'+str(student_standard.academic_year.end_date.year)
    try:
        response['data']['student_details']['section_name'] = Enrollment.objects.get(standard_section__academic_year=student_standard.academic_year.id,student=response['data']['id']).standard_section.section.name
    except:
        response['data']['student_details']['section_name'] = ''
    user = User.objects.filter(student=response['data']['id']).first()
    response['data']['username'] = user.username if user else None
    response['data']['barcode_number'] = user.barcode_number if user else None
    sib_obj = StudentSiblingMapping()
    sibling_data = sib_obj.get_student_sibling_data([response['data']['id']])
    response['data']['sibling_data'] = sibling_data[response['data']['id']]['sibling_list']
    return response

def get_student_list(self):
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    standard = self.request.GET.get('current_standard')
    if not standard:
        standard = self.request.GET.get('standard')
    show_based_on_standard_permission = self.request.GET.get('show_based_on_standard_permission')
    filter_query = {}
    exclude_query = {}
    if standard:
        standard = standard.split(',')
    if show_based_on_standard_permission and int(ConfigurationService.get_setting_value('staffstandardmapping'))==1:
        staff_id = self.request.user.staff.id if self.request.user.staff else None
        standard_ids = StaffStandardMapping.objects.filter(staff=staff_id).values_list('standard', flat=True)
        filter_query['current_standard__in'] = standard_ids
    branch = self.request.GET.get('branch')
    board = self.request.GET.get('board')
    sibling_data = self.request.GET.get('sibling_data')
    academic_year = self.request.GET.get('student_details__entry_academic_year')
    student_academic_year = self.request.GET.get('student_academic_year')
    student_type = self.request.GET.get('student_type')
    admission_list = self.request.GET.get('admission_list')
    admission_history = self.request.GET.get('admission_history')
    is_new_student = self.request.GET.get('is_new_student')
    download_excel = self.request.GET.get('download_excel') #nikhil
    user_last_activity_date_range = self.request.GET.get('user_last_activity_date_range')
    logged_in_users = self.request.GET.get('logged_in_users')
    not_logged_in_users = self.request.GET.get('not_logged_in_users')
    standard_section = self.request.GET.get('standard_section')
    section = self.request.GET.get('section')
    student_group = self.request.GET.get('student_group')
    library_membership_data = self.request.GET.get('library_membership_data')
    show_only_library_member = self.request.GET.get('show_only_library_member')
    gender = self.request.GET.get('gender')
    is_academic_newstudent = self.request.GET.get('is_academic_newstudent')
    if user_last_activity_date_range:
        if self.request.GET.get('last_activity_active_users'):
            filter_query['user_student__last_activity__gte'] = user_last_activity_date_range
        elif self.request.GET.get('last_activity_inactive_users'):
            exclude_query['user_student__last_activity__gte'] = user_last_activity_date_range
    if logged_in_users:
        filter_query['user_student__last_login__isnull'] = False
    elif not_logged_in_users:
        filter_query['user_student__last_login__isnull'] = True
    if is_new_student:
        filter_query['is_new_student'] = is_new_student
    if student_type:
        filter_query['student_type__startswith'] = student_type
    if academic_year:
        filter_query['student_details__entry_academic_year'] = academic_year
    if from_date and to_date:
        filter_query['student_admission__admission_date__range'] = (from_date, to_date)
    if branch:
        filter_query['current_standard__branch'] = branch
    if board:
        filter_query['current_standard__board'] = board
    if student_group:
        filter_query['student_group'] = student_group
    if gender:
        filter_query['gender'] = gender
    if student_academic_year and is_academic_newstudent:
        if is_academic_newstudent == "new_student":
            filter_query['student_details__entry_academic_year'] = student_academic_year
    if admission_list:
        data = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
        filter_query['student_admission__academic_year'] = data
    if not academic_year and not student_academic_year:
        academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
    elif student_academic_year:
        academic_year = student_academic_year
        student_ids = StudentStandardMapping.objects.filter(academic_year=academic_year).values_list('student', flat=True)
        filter_query['id__in'] = student_ids
    if standard and section:
        if show_based_on_standard_permission and int(ConfigurationService.get_setting_value('staffstandardmapping')) == 2:
            staff_id = self.request.user.staff.id if self.request.user.staff else None
            standard_section_ids = StaffStandardSectionMapping.objects.filter(staff=staff_id,standard_section__section=section,
            standard_section__academic_year=academic_year,standard_section__standard__in=standard).values_list('standard_section', flat=True)
            student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student', flat=True)
        else:
            student_ids = Enrollment.objects.filter(standard_section__standard__in=standard,standard_section__section=section, standard_section__academic_year=academic_year).values_list('student', flat=True)
        filter_query['id__in'] = student_ids
    elif section:
        if show_based_on_standard_permission and int(ConfigurationService.get_setting_value('staffstandardmapping')) == 2:
            staff_id = self.request.user.staff.id if self.request.user.staff else None
            standard_section_ids = StaffStandardSectionMapping.objects.filter(staff=staff_id,standard_section__section=section,
            standard_section__academic_year=academic_year).values_list('standard_section', flat=True)
            student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student', flat=True)
        else:
            student_ids = Enrollment.objects.filter(standard_section__section=section, standard_section__academic_year=academic_year).values_list('student', flat=True)
        filter_query['id__in'] = student_ids
    elif standard_section:
        if show_based_on_standard_permission and int(ConfigurationService.get_setting_value('staffstandardmapping')) == 2:
            staff_id = self.request.user.staff.id if self.request.user.staff else None
            standard_section_ids = StaffStandardSectionMapping.objects.filter(staff=staff_id,standard_section__in=standard_section.split(',')).values_list('standard_section', flat=True)
            student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student', flat=True)
        else:
            student_ids = Enrollment.objects.filter(standard_section__in=standard_section.split(',')).values_list('student', flat=True)
        filter_query['id__in'] = student_ids
    elif standard:
        student_ids = StudentStandardMapping.objects.filter(standard__in=standard,
        academic_year=academic_year).values_list('student', flat=True)
        filter_query['id__in'] = student_ids
    if show_only_library_member:
        student_ids = LibraryMembership.objects.filter(is_active=True, user__student__isnull=False).values_list('user__student', flat=True)
        filter_query['id__in'] = student_ids
    queryset = self.filter_queryset(self.get_queryset()).filter(**filter_query).exclude(**exclude_query)
    if not download_excel:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
    else:
        data = queryset
    data = self.get_serializer(data, many=True).data
    current = {s['student_id']:s for s in StudentStandardMapping.objects.filter(academic_year=academic_year).values(
        'student_id', 'standard_id','student_group_id','student_group__name','is_new_student')}
    if standard:
        enrollment_data_mapping = {e['student_id']: e for e  in Enrollment.objects.filter(
            standard_section__academic_year=academic_year,standard_section__standard__in = standard
        ).values(
            'standard_section', 'standard_section__section__name', 'student_id',
            'standard_section__standard__name', 'standard_section__standard__id'
        )}
    else:
        enrollment_data_mapping = {e['student_id']: e for e  in Enrollment.objects.filter(
            standard_section__academic_year=academic_year
        ).values(
            'standard_section', 'standard_section__section__name', 'student_id',
            'standard_section__standard__name', 'standard_section__standard__id'
        )}
    student_ids = []
    for student in data:
        student_ids.append(student['id'])
    if library_membership_data:
        library_membership_mapping = {lib['user__student'] : lib for lib in LibraryMembership.objects.filter(
            Q(to_date__gte=datetime.today())|Q(to_date__isnull=True),
            user__student__in=student_ids,
            from_date__lte=datetime.today(),
            is_active=True
        ).values(
            'user__student', 'from_date', 'to_date'
        )}
    student_address_details = get_student_address(student_ids)
    student_admission_num_mapping = get_student_admission_form_details(self, student_ids, admission_history)
    student_details = get_student_personal_details(self,student_ids)
    custom_dict = get_custom_data_for_objects(self,data,'Student',modify_existing_data=False)
    custom_data_mapping = custom_dict['custom_data_mapping']
    custom_data = custom_dict['custom_data']
    for student in data:
        if library_membership_data:
            student['is_library_member'] = False
            if student['id'] in library_membership_mapping:
                student['is_library_member'] = True
        if student['dob']:
            student['dob_str'] = datetime.strptime(student['dob'],'%Y-%m-%d').date()
            student['dob_str'] = student['dob_str'].strftime('%d-%m-%Y')
        else:
            student['dob_str'] = ''
        if download_excel:
            student['father_name'] = ''
            student['mother_name'] = ''
            student['guardian_name'] = ''
            if 'student_parent' in student and student['student_parent']:
                if 'parent' in student['student_parent'] and student['student_parent']['parent']:
                    student['father_name'] = student['student_parent']['parent']['father_name']
                    student['f_mobile_num'] = student['student_parent']['parent']['f_mobile_num']
                    student['mother_name'] = student['student_parent']['parent']['mother_name']
                    student['m_mobile_num'] = student['student_parent']['parent']['m_mobile_num']
                if 'guardian' in student['student_parent'] and student['student_parent']['guardian']:
                    student['guardian_name'] = student['student_parent']['guardian']['guardian_name']
        if student['id'] in student_address_details:
            student.update({
                'address_one': student_address_details[student['id']]['address_one'],
                'address_two': student_address_details[student['id']]['address_two'],
                'city': student_address_details[student['id']]['city'],
                'district': student_address_details[student['id']]['district'],
                'state': student_address_details[student['id']]['state'],
                'country': student_address_details[student['id']]['country'],
                'pincode': student_address_details[student['id']]['pincode']
            })
        if student['id'] in student_admission_num_mapping:
            student.update({
                'admission_num': student_admission_num_mapping[student['id']]['admission_num'],
                'admission_date': student_admission_num_mapping[student['id']]['admission_date'],
                'admission_form_id': student_admission_num_mapping[student['id']]['id'],
                'admission_history': student_admission_num_mapping[student['id']]['admission_form_history_admission_form__data'] if 'admission_form_history_admission_form__data' in student_admission_num_mapping[student['id']] else {} 
            })
        if student['id'] in student_details:
            student.update({
                'aadhar_num': student_details[student['id']]['aadhar_num'],
                'caste_name': student_details[student['id']]['caste__name'],
                'category_name': student_details[student['id']]['category__name'],
                'blood_group': student_details[student['id']]['blood_group']
            })
        if student['id'] in custom_data_mapping:
            for custom_admission_form in custom_data:
                for custom_fields in custom_admission_form['field_structure']:
                    custom_fields_list=list(custom_data_mapping[student['id']]['data'].keys())
                    if custom_fields['name'] in custom_fields_list:
                        student.update({
                        custom_fields['name']:custom_data_mapping[student['id']]['data'][custom_fields['name']]
                        })
        current_data = None
        if student['id'] in current:
            current_data = current[student['id']]
        if current_data:
            student.update({'current': current_data['standard_id'],
                            'current_name': current_data['student_id'],
                            'current_student_group_id':current_data['student_group_id'],
                            'current_student_group_name':current_data['student_group__name'],
                            'current_is_new_student':current_data['is_new_student'],
                            'current_student_type_name':'New Student' if current_data['is_new_student'] else 'Old Student'})
        else:
            student.update({'current': None, 'current_name': None})
        if student['id'] in enrollment_data_mapping:
            student.update({
                'current_standard_name': enrollment_data_mapping[student['id']]['standard_section__standard__name'],
                'current_standard': enrollment_data_mapping[student['id']]['standard_section__standard__id'],
                'current_standard_section': enrollment_data_mapping[student['id']]['standard_section'],
                'current_standard_section_name': enrollment_data_mapping[student['id']]['standard_section__section__name']
            })
        else:
            student.update({
                'current_standard_section': '',
                'current_standard_section_name': ''
            })
    if sibling_data:
        s = StudentSiblingMapping()
        sibling_data = s.get_student_sibling_data(student_ids)
        for student in data:
            student['sibling_data'] = []
            if student['id'] in sibling_data:
                student['sibling_data'] = sibling_data[student['id']]['sibling_list']
    
    # Check for study certificate issue status if requested
    show_study_certificate_issue_details = self.request.GET.get('show_study_certificate_issue_details')
    if show_study_certificate_issue_details and academic_year and student_ids:
        from apps.finance.models.miscellaneous import MiscellaneousPayment
        
        # Get all payment details for study certificates in this academic year for these students
        study_cert_payments = MiscellaneousPayment.objects.filter(
            miscellaneous__student__in=student_ids,
            miscellaneous__is_active=True,
            misc__academic_year=academic_year,
            misc__misc_type__code_name='sc',
            misc__is_active=True
        ).values_list('miscellaneous__student', flat=True).distinct()
        
        # Create a set of student IDs with study certificates
        students_with_study_cert = set(study_cert_payments)
        
        # Add the field to each student
        for student in data:
            student['is_study_certificate_issued'] = student['id'] in students_with_study_cert
    else:
        # Default to False if not requested
        for student in data:
            student['is_study_certificate_issued'] = False  
    get_advance_fee = self.request.GET.get('get_advance_fee')
    if get_advance_fee and academic_year and student_ids:
        from apps.finance.models.fee_advance import FeeAdvanceCollection
        advance_fee_details = FeeAdvanceCollection.objects.filter(
            academic_year=academic_year,
            student__in=student_ids,
            is_active=True
        ).values('student', 'amount', 'fee_advance_type__name', 'transaction_date', 'receipt_num', 'payment_ref_num', 'mode_of_payment', 'payment_note', 'id')
        advance_fee_mapping = {}
        total_advance_paid = {}
        for advance in advance_fee_details:
            if advance['student'] not in advance_fee_mapping:
                advance_fee_mapping[advance['student']] = []
                total_advance_paid[advance['student']] = 0
            advance_fee_mapping[advance['student']].append(advance)
            total_advance_paid[advance['student']] += advance['amount']
        for student in data:
            student['advance_fee_details'] = advance_fee_mapping.get(student['id'], [])
            student['total_advance_paid'] = total_advance_paid.get(student['id'],0)
    else:
        for student in data:
            student['advance_fee_details'] = []
    if not download_excel:
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
    else:
        return download_student_data(self, data)

def validate_student_delete(self, student_ids):
    from apps.finance.services.fee_collection import get_fee_list_for_student
    fee_collection_data = get_fee_list_for_student(self, student_ids)
    error_data = ''
    ignore_fee_pending_while_giving_tc = FormdefinitionService.get_formdefintion_data({}, 'student_configuration', 'ignore_fee_pending_while_giving_tc')
    for student_id in student_ids:
        if student_id in fee_collection_data:
            for academic_year_data in fee_collection_data[student_id]:
                if 'pending_amount' in academic_year_data and 'paid_amount' in academic_year_data and float(academic_year_data['pending_amount']) and academic_year_data['paid_amount'] > 0:
                    error_data += f'{academic_year_data["year_name"]} Pending amount is {academic_year_data["pending_amount"]} '
    if error_data and not ignore_fee_pending_while_giving_tc:
        error_data += ' ' + 'Please collect the pending fees. If student taken TC depromote the student and then delete the student'
        raise exceptions.ValidationError(error_data)

def delete_student(self, student_id, *args, **kwargs):
    from apps.users.services.auth import expire_all_token_for_user
    with transaction.atomic(using=get_current_db_name()):
        validate_student_delete(self, student_id)
        soft_delete_user_login(self, student_id, key='studentList')
        
        # Get academic year and standard for dashboard update
        from apps.classes.models.enrollment import StudentStandardMapping
        student_standards = StudentStandardMapping.objects.filter(student__in=student_id).values('academic_year', 'standard').distinct()
        
        Student.objects.filter(id__in=student_id).update(is_active=False)
        user_ids = User.objects.filter(student__in=student_id).values_list('id', flat=True)
        expire_all_token_for_user(user_ids, True)
        
        # Dashboard cache is now updated automatically via signals (apps.finance.signals)
        
        return {'Reason': 'Data deleted Successfully!'}

def issue_tc_for_student(self, student_id, standard, is_validate_only=False):
    # try:
    #     student_standard_mapping = StudentStandardMapping.objects.get(standard=standard, student=student_id)
    # except:
    #     raise exceptions.ValidationError('Student not alloted to the given standard')
    student_standard_list = get_student_standard_list_for_tc(self, student_id)
    student_tc_standards = {stu['standard']: stu for stu in student_standard_list} #check whether tc take for latest standards
    if standard not in student_tc_standards:
        standard_names = Standard.objects.filter(id__in=student_tc_standards.keys()).values_list('name', flat=True)
        raise exceptions.ValidationError(f'trying to give tc for old standard. standard should be in {"/".join(standard_names)}')
    academic_year = student_tc_standards[standard]['academic_year'] if 'academic_year' in student_tc_standards[standard] else None
    if not academic_year:
        raise exceptions.ValidationError("Invalid academic year")
    try:
        paid_amount = paid_data_and_status(self, student_id, academic_year, standard)
    except:#catching when the fee term plan is not done
        paid_amount = None
    ignore_fee_pending_while_giving_tc = FormdefinitionService.get_formdefintion_data({}, 'student_configuration', 'ignore_fee_pending_while_giving_tc')
    if paid_amount and paid_amount['pending_amount'] and not ignore_fee_pending_while_giving_tc:
        raise exceptions.ValidationError('Fees is not paid yet')
    data_to_save = {
        'issued_for_standard': standard,
        'academic_year': academic_year,
        'student': student_id
    }
    if StudentTcIssuedTrack.objects.filter(
        student=student_id, is_active=True
    ).exists():
        raise exceptions.ValidationError('Tc already taken')
    serializer = StudentTcIssuedTrackSerializer(data=data_to_save)
    serializer.is_valid(raise_exception=True)
    if is_validate_only:
        return True
    with transaction.atomic(using=get_current_db_name()):
        serializer.save()
        delete_student(self, [student_id])

def issue_tc_for_multiple_student(self, data_list):
    with transaction.atomic(using=get_current_db_name()):
        for student in data_list['student_list']:
            issue_tc_for_student(self, student['student'], student['standard'])
    return {'Reason': 'Tc issue successfully'}


def add_student_type(self, data, **kwargs):
    setting_values = ConfigurationService.get_setting_values(['is_residential'])
    with transaction.atomic(using=get_current_db_name()):
        try:
            student = Student.objects.get(id=data['student'])
            student_year = StudentStandardMapping.objects.get(student=student, standard=student.current_standard)
        except:
            raise exceptions.ValidationError('Student is not found.')
        if student.student_type == data['student_type']:
            raise exceptions.ValidationError(f'Student already present in {student.student_type}.')
        if setting_values['is_residential'] == '0':
            raise exceptions.ValidationError(f'School has only 1 type i.e Day Scholar.')
        student_type = 'ADMISSION_R' if data['student_type'] == STUDENT_TYPE['RESIDENTIAL'] else 'ADMISSION_D'
        counter, prefix, postfix = CounterService.get_countered_value(self, student_type,
                                                                      standard=student.current_standard,
                                                                      academic_year=student_year.academic_year)
        reg = prefix + '{:0>3}'.format(counter.value) + postfix
        data['reg_num'] = reg
        self.get_queryset().filter(student=data['student'], to_date__gte=date.today()).update(
            to_date=SharedService.date_to_obj(data['from_date']) - timedelta(days=1))
        data['to_date'] = student_year.academic_year.end_date
        student.student_type = data['student_type']
        student.current_reg_num = reg
        student.save()
        CounterService.increment_counter(self, counter)
        return SharedService.add_data(self, data, False)


def update_student_type(self, data, **kwargs):
    setting_values = ConfigurationService.get_setting_values(['is_residential'])
    instance = self.get_object()
    with transaction.atomic(using=get_current_db_name()):
        if setting_values['is_residential'] == '0':
            raise exceptions.ValidationError(f'School has only 1 type i.e Day Scholar.')
        self.get_queryset().filter(student=data['student'], to_date=(instance.from_date - timedelta(days=1))).update(
            to_date=SharedService.date_to_obj(data['from_date']) - timedelta(days=1))
        return SharedService.update_data(self, data, **kwargs)


def get_student_type(self):
    res = SharedService.read_data(self, True)
    response = {'data': {'student_type_details': res['data']}}
    if self.request.GET.get('student'):
        try:
            queryset = Student.objects.get(id=self.request.GET.get('student'))
        except:
            raise exceptions.ValidationError('Student is not found.')
        response['data']['student_details'] = StudentListSerializer(queryset).data
    return response

def add_student_rfid(self, request):
    data = request.data
    post_data = []
    temp_post_data = []
    rfid_list = []
    validation_rfid_student_mapping = {}
    duplicate_student_find = {}
    student_ids = []
    for d in data['rfid_datas']:
        if d['rfid']:
            rfid = str(d['rfid']).strip() if d['rfid'] else None
            temp = {
                'rfid': rfid,
                'id': d['student'],
            }
            if (temp['id'], temp['rfid']) in duplicate_student_find:
                raise exceptions.ValidationError(f'Duplicate student found {temp} {duplicate_student_find}')
            duplicate_student_find[(temp['id'], temp['rfid'])] = ''
            if temp['rfid']:
                rfid_list.append(temp['rfid'])
                validation_rfid_student_mapping[str(temp['rfid'])+''+str(temp['id'])] = temp
            temp_post_data.append(
                temp
            )
            student_ids.append(d['student'])
    student_with_rfid = {stu['id'] : stu['rfid'] for stu in Student.objects.filter(id__in=student_ids).values('rfid', 'id')}
    for row in temp_post_data:
        if not student_with_rfid[row['id']] == row['rfid']:
            post_data.append(row)
    if rfid_list:
        existing_student_ids = Student.objects.filter(rfid__in=rfid_list).values('id', 'rfid', 'first_name')
        for existing in existing_student_ids:
            temp_str = str(existing['rfid']) + '' + str(existing['id'])
            if temp_str not in validation_rfid_student_mapping:
                raise exceptions.ValidationError(
                    f'Duplicate Rfid found for student {existing["first_name"]} - {existing["rfid"]}'
                )
    with transaction.atomic(using=get_current_db_name()):
        if post_data:
            for temp in post_data:
                instance = Student.objects.get(pk=int(temp['id']))
                temp['user'] = instance.user_student.id
                temp['full_name'] = get_full_name(instance.first_name, instance.middle_name, instance.last_name)
                serializer = StudentRfidSerializer(instance=instance, data=temp, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            for temp in post_data:
                add_user_to_cams_server(temp)
                try:
                    obj = MachineUserMapping.objects.get(user=temp['user'])
                except:
                    obj = None
                machine_user_mapping = {
                    'user_id': temp['user'],
                    'machine_user_id': temp['user'],
                    'is_user_updated_to_machine': True,
                    'username_in_machine': temp['full_name'],
                    'biometric_machine': None
                }
                if obj:
                    serializer = MachineUserMappingSerializer(instance=obj, data=machine_user_mapping, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = MachineUserMappingSerializer(data=machine_user_mapping)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()

    return {'Reason': 'Data Added Successfully'}

#only for student it works for now
def add_user_to_cams_server(data):
    if SwitchableInstitute.objects.filter(
        is_active=True
    ):
        return {'User has switchable institute mapping, skipped CAMS server addition'}
    current_time = datetime.today().strftime('%d/%m/%Y %H:%M:%S') 
    payload = {
        "Add": {
            "User": {
                "UserID": str(data['user']),
                "FirstName": data['full_name'],
                "LastName": "",
                "UserType": "User"
            }
        },
        "OperationID": SharedService.generate_random_number(),
        "AuthToken": "f2PwnCA8Qo54Kja3IgDNcF3seEwGJmiU",
        "Time": current_time  # Adjust to GMT if needed
    }

    if data.get('rfid'):
        payload['Add']['Template'] = [
            {
                "Type": "Card",
                "UserID": str(data['user']),
                "Data": data['rfid']
            }
        ]

    biometric_list = BiometricMachine.objects.filter(is_active=True).values()
    if not biometric_list:
        raise exceptions.ValidationError('Please add biometric machine data')

    for service_tag in biometric_list:
        service_tag_id = service_tag.get('service_tag_id')
        if not service_tag_id:          
            continue
        
        if service_tag.get('token'):
            payload['AuthToken'] = service_tag['token']
        
        url = f'https://robot.camsunit.com/external/api3.0/biometric?stgid={service_tag_id}'
      
        response = http_request('POST', url, payload=json.dumps(payload), params=None)
        parsed_data = json.loads(response.content)
        if parsed_data['Status'] != 'done':
            paresed_input = json.loads(payload)
            raise exceptions.ValidationError(f'Error from server: {parsed_data} {paresed_input}')

    return {'saved_machine_user_mapping_ids': [data.get('user')]}

def get_student_sibling_data(self, request):
    return_data = []
    student_id = self.request.user.student.id if self.request.user.student else None
    if student_id:  
        sib_obj = StudentSiblingMapping()
        sibling_data = sib_obj.get_student_sibling_data([student_id])
        if student_id in sibling_data:
            return_data = sibling_data[student_id]['sibling_list']
    return {'data': return_data}

def generate_admission_num_to_admission_form(self, academic_year, standard):
    if FormdefinitionService.get_formdefintion_data({}, 'counter_confgiruation', 'admission_fee_standard_wise'):
        counter_standard = CounterStandardMapping.objects.filter(
            standard=standard, is_active=True,  counter_type_name='admission'
        ).first()
        if not counter_standard:#pick the default
            admission_counter, admission_prefix, admission_postfix = CounterService.get_countered_value(self,
                                                                                                        'ADMISSION',
                                                                                                        academic_year=academic_year)
        else:
            key = counter_standard.counter_type_name + '_' + counter_standard.group_name
            counter = Counter.objects.get(type=key, academic_year=int(academic_year))
            prefix_str_for_prefix = counter_standard.prefix_str_for_prefix if counter_standard.prefix_str_for_prefix else ''
            postfix_str_for_prefix = counter_standard.postfix_str_for_prefix if counter_standard.postfix_str_for_prefix else ''
            prefix_str_for_postfix = counter_standard.prefix_str_for_postfix if counter_standard.prefix_str_for_postfix else ''
            postfix_str_for_postfix = counter_standard.postfix_str_for_postfix if counter_standard.postfix_str_for_postfix else ''
            admission_prefix = counter.prefix if counter.prefix else ''
            admission_postfix = counter.postfix if counter.postfix else ''
            admission_prefix = f'{prefix_str_for_prefix}{admission_prefix}{postfix_str_for_prefix}'
            admission_postfix = f'{prefix_str_for_postfix}{admission_postfix}{postfix_str_for_postfix}'
            admission_counter = counter
        admission_num = f'{admission_prefix}{admission_counter.value}{admission_postfix}'
    else:
        admission_counter, admission_prefix, admission_postfix = CounterService.get_countered_value(self,
                                                                                                    'ADMISSION',
                                                                                                    academic_year=academic_year)
        admission_num = f'{admission_prefix}{admission_counter.value}{admission_postfix}'
    return admission_num, admission_counter

def add_student_to_admission_form(
        self, academic_year, student_id, standard, admission_num=None, admission_date=None, get_admission_num=False,
        update_id=None, admission_counter=None
):
    student = Student.objects.get(id=student_id)
    if not admission_num:
        admission_num, admission_counter = generate_admission_num_to_admission_form(self, academic_year, standard)
    if get_admission_num:
        return admission_num
    admission_data = {'academic_year': academic_year, 'student': student_id,
                    'admission_num': admission_num}
    if admission_date:
        admission_data['admission_date'] = admission_date
    with transaction.atomic(using=get_current_db_name()):
        if update_id:
            admission_data['admission_date'] = datetime.today().date()
            admission_data['id'] = update_id
            instance = AdmissionForm.objects.get(id=update_id)
            admission_serializer = AdmissionFormSerializer(instance=instance, data=admission_data)
            admission_serializer.is_valid(raise_exception=True)
        else:
            admission_serializer = AdmissionFormSerializer(data=admission_data)
            admission_serializer.is_valid(raise_exception=True)
        StudentDetails.objects.filter(student=student_id).update(entry_academic_year=academic_year)
        setting_values = ConfigurationService.get_setting_values(
            ['is_residential', 'unique_reg_num', 'admission_in_reg'], academic_year, standard)
        reg = None
        if setting_values['unique_reg_num'] == '0' and setting_values['admission_in_reg'] == '1':
            if setting_values['is_residential'] == '1' and student.student_type == STUDENT_TYPE['RESIDENTIAL']:
                student_type = 'ADMISSION_R'
            else:
                student_type = 'ADMISSION_D'
            reg_counter, prefix, postfix = CounterService.get_countered_value(self, student_type, standard=standard,
                                                                            academic_year=academic_year)
            reg = prefix + '{:0>3}'.format(reg_counter.value) + postfix
            student.current_reg_num = reg
            student.save()
            CounterService.increment_counter(self, reg_counter)
        if setting_values['is_residential'] == '1':
            academic_year = AcademicYear.objects.get(id=academic_year)
            if not StudentType.objects.filter(student=student_id, from_date__gte=academic_year.start_date,
                                            to_date__lte=academic_year.end_date).exists():
                student_type = {'student_type': student.student_type, 'student': student_id,
                            'from_date': academic_year.start_date, 'to_date': academic_year.end_date,
                            'reg_num': reg}
                student_type_serializer = StudentTypeSerializer(data=student_type)
                student_type_serializer.is_valid(raise_exception=True)
                student_type_serializer.save()
        admission_serializer.save()
        if admission_counter:
            CounterService.increment_counter(self, admission_counter)
    return {'Reason': 'Admission Form Added successfully'}


def readmission_student(self, data):
    student_ids = [stu for stu in data['student_ids']]
    academic_year = data['academic_year']
    standard = data['standard']
    admission_form_list = AdmissionForm.objects.filter(student__in=student_ids
    ).values()
    admission_history = []
    #validation
    academic_year_values = {aca['id']: aca for aca in AcademicYear.objects.all().values()}
    for admission in admission_form_list:
        if str(admission['academic_year_id']) == str(academic_year):
            raise exceptions.ValidationError('Trying to do admission for the same academic year')
        if academic_year_values[admission['academic_year_id']]['start_date'] > academic_year_values[academic_year]['start_date']:
            raise exceptions.ValidationError('Trying to move for past academic year')
    with transaction.atomic(using=get_current_db_name()):
        for admission in admission_form_list:
            temp = {'admission_form': admission['id'], 'data': json.loads(json.dumps(admission, indent=4, sort_keys=True, default=str))}
            admission_history.append(temp)
            add_student_to_admission_form(self, academic_year, admission['student_id'], standard, None, None, False,admission['id'])
        ser = AdmissionFormHistorySerializer(data=admission_history, many=True)
        ser.is_valid(raise_exception=True)
        ser.save()
    return {'Reason': 'Re admission successfull'}


def add_or_edit_admission_form(self, data):
    response = SharedService.add_or_update_data(self, data)
    return response

def get_deleted_student_list(self, extra_params={}):
    only_tc_issued = extra_params['only_tc_issued'] if 'only_tc_issued' in extra_params else self.request.GET.get('only_tc_issued')
    only_deleted_students = extra_params['only_deleted_students'] if 'only_deleted_students' in extra_params else self.request.GET.get('only_deleted_students')
    order_by = extra_params['ordering'] if 'ordering' in extra_params else self.request.GET.get('ordering')
    academic_year = extra_params['academic_year'] if 'academic_year' in extra_params else self.request.GET.get('academic_year') #only for tc issued students
    filter_query = {'is_active': False}
    search_query = extra_params.get('search') or self.request.GET.get('search')
    q_filter = Q()

    if search_query:
        search_fields = ['first_name', 'middle_name', 'last_name']
        for field in search_fields:
            q_filter |= Q(**{f"{field}__icontains": search_query})

    if only_tc_issued:
        filter_query['student_tc_issued_track_student__isnull'] = False
        filter_query['student_tc_issued_track_student__academic_year'] = academic_year
    elif only_deleted_students:
        filter_query['student_tc_issued_track_student__isnull'] = True
        if academic_year:
            filter_query['id__in'] = StudentStandardMapping.objects.filter(
                academic_year=academic_year, student__is_active=False
            ).values_list('id', flat=True)

    #  Build the final queryset safely
    student_data = Student.objects.filter(**filter_query).filter(q_filter)

    # Apply ordering if exists
    if self.request.GET.get('ordering'):
        order_by = self.request.GET.get('ordering').split(',')
        student_data = student_data.order_by(*order_by)

    # Apply values() as before
    student_data = student_data.values(
        'first_name', 'middle_name', 'last_name', 'mobile_num',
        'student_tc_issued_track_student__id',
        'current_standard__name','student_tc_issued_track_student__issued_for_standard',
        'student_tc_issued_track_student__issued_for_standard__name',
        'student_tc_issued_track_student__issued_for_standard__sequence',
        'student_tc_issued_track_student__academic_year',
        'student_tc_issued_track_student__modified', 'modified',
        'current_standard', 'current_standard__sequence', 'profile_pic', 'id'
    )
    deleted_student_data = []
    for student in student_data:
        temp = {
            'name': get_full_name(student['first_name'], student['middle_name'], student['last_name']),
            'is_tc_issued': False, 'standard_name': student['current_standard__name'],
            'standard': student['current_standard'],
            'academic_year': student['student_tc_issued_track_student__academic_year'],
            'tc_issued_date_time': student['student_tc_issued_track_student__modified'],
            'deleted_date_time': student['modified'], 'standard_sequence': student['current_standard__sequence'],
            'profile_pic': student['profile_pic'], 'profile_pic_details': {}, 'student_id': student['id']
        }
        if student['student_tc_issued_track_student__issued_for_standard__sequence']:
            temp['standard_sequence'] = student['student_tc_issued_track_student__issued_for_standard__sequence']
        if student['student_tc_issued_track_student__issued_for_standard']:
            temp['standard'] = student['student_tc_issued_track_student__issued_for_standard']
            temp['standard_name'] = student['student_tc_issued_track_student__issued_for_standard__name']
        if temp['tc_issued_date_time']:
            temp['is_tc_issued'] = True
        deleted_student_data.append(temp)
    if order_by:
        for ordering in reversed(order_by):
            reverse_sort = ordering.startswith('-')
            deleted_student_data = sorted(
                deleted_student_data,
                key=lambda k: k[ordering[1:]] if reverse_sort else k[ordering],
                reverse=reverse_sort
            )
    data, count, next_page, previous_page = SharedService.custom_pagination(self, deleted_student_data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('page'))
    profile_pic_ids = []
    for row_data in data:
        if row_data['profile_pic']:
            profile_pic_ids.append(row_data['profile_pic'])
    if profile_pic_ids:
        profile_data_mapping = UploadTypeService.get_file_details(self, profile_pic_ids)
        for row_data in data:
            if row_data['profile_pic'] in profile_data_mapping:
                row_data['profile_pic_details'] = profile_data_mapping[row_data['profile_pic']]
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}

def bulk_student_data_update(self, data):
    student_ids = []
    for student in data:
        student_ids.append(student['id'])

def _get_size(image_stream):
    image_stream.seek(0, 2)  # Move to the end of the BytesIO object
    size = image_stream.tell()
    image_stream.seek(0)  # Reset the stream position to the beginning
    return size

def generate_id_cards_for_student(self, data):
    try:
        academic_year = data['academic_year'] if 'academic_year' in data else None
        standard_ids = data['standard_ids'] if 'standard_ids' in data else None
        standard_section_ids = data['standard_section_ids'] if 'standard_section_ids' in data else None
        student_ids = data['student_ids'] if 'student_ids' in data else None
        file_name = 'id_card'
        if data.get('file_name'):
            file_name = data.get('file_name')
        if standard_ids and academic_year:
            student_ids = StudentStandardMapping.objects.filter(standard__in=standard_ids,academic_year=academic_year).values_list('student_id', flat=True)
        elif standard_section_ids:
            student_ids = Enrollment.objects.filter(standard_section__in=standard_section_ids).values_list('student_id', flat=True)
        elif student_ids:
            pass
        else:
            raise exceptions.ValidationError("Invalid params")
        institute_data = Institute.get_institute(self)
        student_data = get_student_detailed_data(self,student_ids)
        selected_templates, number_of_copies = get_selected_template(self, 'idcards', 'pdf', 'default_id_card.html', academic_year, standard_ids)
        path = 'idcards/'+selected_templates
        # from django.shortcuts import render
        # return render(self.request, path, {'data': student_data, 'institute': institute_data})
        if self.request.GET.get('long_running_process') and not self.request.GET.get('update_print'):
            pages = [student_data[i:i+10] for i in range(0,len(student_data),10)]
            # for i in student_data[0]:
            #     print(i)
            
            # for i in range(student_data[0]):
            #     print(i)
            response = PDFService.return_pdf_path(self, {'data': student_data, 'institute': institute_data,'pages':pages}, file_name, path, True,data['document_type'])
            url = UploadTypeService.upload_local_file(response, path='idcard_pdfs')
            if os.path.exists(response):
                os.remove(response)
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            if self.request.GET.get('preview'):
                variabledata = self.request.data.get('student_data')
                # update preview values
                student_data[0]['name'] = variabledata.get('name')
                student_data[0]['admission_num'] = variabledata.get('admission_no')
                student_data[0]['standard_name'] = variabledata.get('class')
                student_data[0]['mobile_num'] = variabledata.get('mobile')
                student_data[0]['dob'] = variabledata.get('dob')
                student_data[0]['student_parent']['parent']['father_name']=variabledata.get('father_name')
                student_data[0]['student_parent']['parent']['mother_name']=variabledata.get('mother_name')
                # student_data[0]['student_parent']['student_details']['blood_group']=variabledata.get('blood_group')
                # student_data[0]['student_parent']['student_details']['mother_tongue']=variabledata.get('mother_tongue')
                
                
                                # ensure profile_pic_details exists
                if not student_data[0].get('profile_pic_details'):
                    student_data[0]['profile_pic_details'] = {}
                student_data[0]['profile_pic_details']['file'] = variabledata.get('pic_url')


            if self.request.GET.get('update_print'):
                for student in student_data:
                    updated_data = StudentIdCardUpdate.objects.get(
                        student=student['id'],
                        academic_year=academic_year
                    )

                    if updated_data:
                        student['name'] = updated_data.name
                        student['admission_num'] = updated_data.admission_no
                        student['standard_name'] = updated_data.student_class
                        student['mobile_num'] = updated_data.mobile
                        student['dob'] = updated_data.dob
                        if student['student_parent'].get('student_details'):
                            student['student_parent']['student_details']['blood_group']=updated_data.blood_group
                        if student['student_parent'].get('parent'):
                            student['student_parent']['parent']['father_name']=updated_data.father_name
                        profile_pic_details = DocumentSerializer(updated_data.processed_image).data
                        if profile_pic_details['file']:
                            student['profile_pic_details'] = profile_pic_details


            pages = [student_data[i:i+10] for i in range(0, len(student_data), 10)]

            response = PDFService.id_card(
                self,
                {
                    'data': student_data,
                    'institute': institute_data,
                    'pages': pages
                },
                file_name,
                path
            )

            return response
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': e.args[:250]})
        else:
            raise e

def get_combined_student_staff_data(self, page, limit, search_query=None):
 
    active_library_members = set(
        LibraryMembership.objects.filter(
            Q(to_date__gte=datetime.today()) | Q(to_date__isnull=True),
            from_date__lte=datetime.today(),
            is_active=True
        ).values_list('user__student', flat=True)
    )  
    filter_query = Q(is_active=True)

    if search_query:
        search_fields = ['first_name', 'middle_name', 'last_name']
        search_filter = Q()
        for field in search_fields:
            search_filter |= Q(**{f"{field}__icontains": search_query})
        filter_query &= search_filter

    students = list(
        Student.objects.filter(filter_query).annotate(
            is_library_member=Case(
                When(id__in=active_library_members, then=True),
                default=False,
                output_field=BooleanField(),
            )
        )
    )
    staff = list(Staff.objects.filter(filter_query))

    student_ids = [student.id for student in students]
    student_admission_num_mapping = get_student_admission_form_details(self, student_ids)

    combined_data = students + staff
    paginated_data, total_count, next_page, previous_page = SharedService.custom_pagination(
        self, combined_data, limit, page
    )

    paginated_students = [obj for obj in paginated_data if isinstance(obj, Student)]
    paginated_staff = [obj for obj in paginated_data if isinstance(obj, Staff)]

    serialized_students = StudentSerializer(paginated_students, many=True).data

    for student in serialized_students:
        if student['id'] in student_admission_num_mapping:
            student.update({
                'admission_num': student_admission_num_mapping[student['id']]['admission_num']
            })

    serialized_staff = StaffSerializer(paginated_staff, many=True).data
    serialized_data = serialized_students + serialized_staff

    return {
        'data': serialized_data,
        'count': total_count,
        'next': next_page,
        'previous': previous_page
    }

def revert_deleted_students(student_id, reason_id):
    try:
        student_to_revert = Student.objects.filter(id=student_id, is_active=False).first()
        if not student_to_revert:
            return {'status': 'error', 'message': 'No deleted student found with the provided ID.'}
        student_to_revert.is_active = True
        student_to_revert.save()
        student_save = StudentTcIssuedTrack.objects.filter(student_id=student_id).first()
        if student_save:
            student_save.is_active = False
            student_save.reason_id = reason_id
            student_save.save()
        return {
            'status': 'success',
            'message': f'Successfully reverted the student with ID {student_id}.',
        }
    except Exception as e:
        return {'status': 'error', 'message': str(e)}
    
def get_student_academic_data(self, request):
    student_id = self.request.GET.get('student_id')
    standard_section_id = (
        int(self.request.GET.get('standard_section_id'))
        if self.request.GET.get('standard_section_id') else None
    )
    if not standard_section_id and student_id:
        academic_year_obj = AcademicYear.get_academic_year_for_date(self, datetime.today(), True)
        standard_list = StudentStandardMapping.objects.filter(
            student_id=student_id,
            academic_year_id=academic_year_obj.id
        ).values_list('standard_id', flat=True)

        standard_section_id = Enrollment.objects.filter(
            student_id=student_id,
            standard_section__standard__in=standard_list
        ).values_list('standard_section_id', flat=True).first()

    if not standard_section_id:
        return {'standard_section_data': {}, 'attendance_data': {}}

    ss_obj = StandardSectionMapping.objects.get(id=standard_section_id)
    standard_section_data = GetStandardSectionSubjectSerializer(ss_obj).data

    staff_qs = StaffTeachingHour.objects.filter(
        assigned_subjects__standard_section__id=standard_section_id
    ).values(
        'id',
        'staff_id',
        'staff__first_name',
        'staff__middle_name',
        'staff__last_name',
        'assigned_subjects__standard_section__standard__name',
        'assigned_subjects__standard_section__section__name',
        'assigned_subjects__subject__id',
        'assigned_subjects__subject__name',
    ).distinct()

    staff_standard_section_subject = {}  # {subject_id: staff_info_dict}

    for row in staff_qs:
        subj_id = row.get('assigned_subjects__subject__id')
        if not subj_id:
            continue
        staff_name_parts = [
            row.get('staff__first_name') or '',
            row.get('staff__middle_name') or '',
            row.get('staff__last_name') or ''
        ]
        staff_name = ' '.join([p for p in staff_name_parts if p]).strip()

        staff_info = {
            'staff_teaching_hour_id': row.get('id'),
            'staff_id': row.get('staff_id'),
            'staff_name': staff_name,
            'standard_name': row.get('assigned_subjects__standard_section__standard__name'),
            'section_name': row.get('assigned_subjects__standard_section__section__name'),
            'subject_name': row.get('assigned_subjects__subject__name'),
            'subject_id': subj_id,
            'standard_section': standard_section_id,
        }
        staff_standard_section_subject[subj_id] = staff_info

    for subject in standard_section_data.get('assigned_subjects', []):
        subj_id = subject.get('subject_id') or subject.get('id')
        if subj_id in staff_standard_section_subject:
            subject.update(staff_standard_section_subject[subj_id])

    extra_details = {
        "from_date": getattr(ss_obj.academic_year, 'start_date', None),
        "to_date": getattr(ss_obj.academic_year, 'end_date', None),
        "academic_year": getattr(ss_obj.academic_year, 'id', None),
        "student_id": student_id
    }
    attendance_data = get_student_subject_attendance_details(self, extra_details)

    return {'standard_section_data': standard_section_data, 'attendance_data': attendance_data}

def get_student_subject_attendance_details(self, details):
    is_today_marked = False
    attendance = {}
    student_subject_mapping = {}
    student_ids_with_attendance = set()
    days_count = {}
    days = 0
    filter_query = {'student': details['student_id']}
    academic_year_qs = AcademicYear.objects.filter(is_active=True).order_by('start_date')
    data = academic_year_qs.get(start_date__lte=details['from_date'], end_date__gte=details['to_date'])
    subjectstudent_filter_query = {
        'academic_year': data,
        'student': details['student_id']
    }
    subjectstudent_qs = SubjectStudent.objects.filter(**subjectstudent_filter_query)
    subjectstudent_data = list(subjectstudent_qs.values('student_id', 'subject_id'))
    for row in subjectstudent_data:
        sid = row['student_id']
        sub_id = row['subject_id']
        student_subject_mapping.setdefault(sid, {'subject': []})
        student_subject_mapping[sid]['subject'].append(sub_id)
    if details.get('from_date') and details.get('to_date'):
        filter_query['for_date__range'] = (details['from_date'], details['to_date'])
    queryset = SubjectAttendance.objects.filter(**filter_query)
    attendance_rows = list(queryset.values('student', 'subject', 'status', 'for_date', 'from_time', 'to_time'))
    for r in attendance_rows:
        key = f"{r['from_time']}-{r['to_time']}"
        date_key = r['for_date']
        days_count.setdefault(date_key, {})
        days_count[date_key].setdefault(key, True)
    for _, sessions in days_count.items():
        days += len(sessions)
    for student_id, info in student_subject_mapping.items():
        attendance.setdefault(student_id, {})
        for sub in info['subject']:
            attendance[student_id].setdefault(sub, {
                'present': 0,
                'absent': 0,
                'total': 0,
                'todays_status': 'Un Marked'
            })
    for r in attendance_rows:
        student_ids_with_attendance.add(r['student'])
    today_date = datetime.now().date()
    for r in attendance_rows:
        sid = r['student']
        sub = r['subject']
        status = r['status']
        for_date = r['for_date']  # date object
        if sid not in attendance:
            attendance[sid] = {}
        if sub not in attendance[sid]:
            attendance[sid][sub] = {
                'present': 0,
                'absent': 0,
                'total': 0,
                'todays_status': 'Un Marked'
            }
        if for_date == today_date:
            attendance[sid][sub]['todays_status'] = status
            is_today_marked = True
        if status == 'present':
            attendance[sid][sub]['present'] += 1
        else:
            attendance[sid][sub]['absent'] += 1
        attendance[sid][sub]['total'] += 1
    return attendance


def student_id_card_update(self, validated_data):
    """
    Validate that no StudentIdCardUpdate exists for this student + academic_year.
    Raises ValidationError if duplicate. Caller should create via serializer.save().
    """
    student = validated_data.get('student')
    academic_year = validated_data.get('academic_year')
    student_id = student.id if hasattr(student, 'id') else student
    academic_year_id = academic_year.id if hasattr(academic_year, 'id') else academic_year
    student_exists = StudentIdCardUpdate.objects.filter(
        student_id=student_id, academic_year_id=academic_year_id
    ).first()
    if student_exists:
        raise exceptions.ValidationError("Student ID card already exists for this student and academic year.")
    return {'status': 'success', 'message': 'Student ID card updated successfully'}


def get_student_id_card_update_data(self, data):
    from apps.students.serializers import StudentIdCardUpdateSerializer

    student_id = data.get('student_id')
    if not student_id:
        return {'status': 'error', 'message': 'student_id required'}
    instance = StudentIdCardUpdate.objects.filter(student_id=student_id).select_related(
        'student', 'academic_year', 'image', 'processed_image'
    ).first()
    if not instance:
        return {'status': 'not_found', 'message': 'No ID card update found for this student', 'data': None}
    return {
        'status': 'success',
        'message': 'Student ID card data retrieved',
        'data': StudentIdCardUpdateSerializer(instance).data
    }


def student_id_card_delete(self, data, kwargs):
    obj_id = kwargs.get('pk')
    student_id_card_update = StudentIdCardUpdate.objects.filter(id=obj_id).first()
    if student_id_card_update:
        student_id_card_update.delete()
        return {'status': 'success', 'message': 'Student ID card deleted successfully'}
    else:
        raise exceptions.ValidationError("Student ID card not found")


def create_student_idcard_update(self,request,*args,**kwargs):
    group_name = request.data.get('group_name')
    student_ids = request.data.get('student_id')
    academic_year = request.data.get('academic_year')

        # ✅ Handle group assignment properly
    if group_name and student_ids and academic_year:
        for student_id in student_ids:
            try:
                student_obj = Student.objects.get(
                    id=student_id,
                    academic_year=academic_year
                )
                student_obj.group_name = group_name
                student_obj.save()
            except Student.DoesNotExist:
                continue  # or handle error if needed

    # ✅ Serializer logic
    serializer = StudentIdCardUpdateSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    student_id_card_update(self, serializer.validated_data)  # raises if duplicate

    instance = serializer.save()

    return Response({
        'status': 'success',
        'message': 'Student ID card updated successfully',
        'data': StudentIdCardUpdateSerializer(instance).data
    })
    
    
    
def update_student_idcard_update(self, request, *args, **kwargs):
        from rest_framework import status as drf_status
        from rest_framework.response import Response
        from django.shortcuts import get_object_or_404

        group_name = request.data.get('group_name')
        student_ids = request.data.get('ids')
        academic_year = request.data.get('academic_year')
        group_update = request.data.get('group_update')
        
        # ✅ GROUP / STATUS UPDATE FLOW
        if group_name  and academic_year and group_update:

            academic_year_obj = AcademicYear.objects.get(id=academic_year)
            # ✅ GROUP ASSIGNMENT
            StudentIdCardUpdate.objects.filter(
                id__in=student_ids,
                academic_year=academic_year
            ).update(group_name=group_name)

            idcard_update = IdCardUpdate.objects.create(
                academic_year=academic_year_obj,
                group_name=group_name,
                status="Photos Taken"
            )

            return Response({
                'status': 'success',
                'message': 'Student group updated successfully',
                'data': student_ids
            })

        # ✅ SINGLE RECORD UPDATE
        obj_id = kwargs.get('pk')
        instance = get_object_or_404(StudentIdCardUpdate, id=obj_id)

        serializer = StudentIdCardUpdateSerializer(
            instance,
            data=request.data,
            partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                'status': 'success',
                'message': 'Student ID card updated successfully',
                'data': serializer.data
            },
            status=drf_status.HTTP_200_OK
        )
        

def list_student_idcard_update(self, request, *args, **kwargs):
        from django.db.models import Q
        queryset = self.get_queryset()


        # 🔍 Search filter
        search = request.GET.get('search')
        if search:
            queryset = queryset.filter(
                Q(student__first_name__icontains=search) |
                Q(student__middle_name__icontains=search) |
                Q(student__last_name__icontains=search)
            )

        # 📅 Academic year filter
        academic_year = request.GET.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)

        # 👤 Student filter
        student = request.GET.get('student')
        if student:
            queryset = queryset.filter(student_id=student)

        # 🎓 Standard filter
        standard = request.GET.get('standard')
        if standard:
            queryset = queryset.filter(student_class=standard)

        queryset = queryset.order_by('-id')
        
        reprint = request.GET.get('reprint')
        
        from django.db.models import F
        if reprint:
            id = request.GET.get('id')
            updated = StudentIdCardUpdate.objects.filter(id=id).update(
            print_count=F('print_count') + 1
            )

            if not updated:
                return Response({
                    'status': 'error',
                    'message': 'Record not found'
                })

            return Response({
                'status': 'success',
                'message': 'Print Count Incremented',
                'data': ''
            })

        # 🚨 GROUP BASED RESPONSE
        if request.GET.get('groups'):
            grouped_data = {}

            if request.GET.get('group_exchange'):
                from_group = request.GET.get('from_group')
                to_group = request.GET.get('to_group')
                academic_year = request.GET.get('academic_year')
                status = request.GET.get('status')
                academic_year_obj=AcademicYear.objects.get(id=academic_year)

                if not all([from_group, to_group, academic_year]):
                    return Response({
                        'status': 'error',
                        'message': 'Missing required parameters'
                    })
                    
                from django.db.models import F
                if status == 'Printed Id Sent':
                    StudentIdCardUpdate.objects.filter(
                        group_name=from_group,
                        academic_year=academic_year
                    ).update(print_count=F('print_count') + 1)

                StudentIdCardUpdate.objects.filter(
                    group_name=from_group,
                    academic_year=academic_year
                ).update(group_name=to_group, status=status)
                
                
                
                IdCardUpdate.objects.create(
                    group_name=from_group,
                    academic_year=academic_year_obj,
                    status=f'Merged to {to_group}'
                )

                return Response({
                    'status': 'success'
                })

            if request.GET.get('status'):
                status = request.GET.get('status')
                academic_year = request.GET.get('academic_year')
                academic_year_obj = AcademicYear.objects.get(id=academic_year)
                group_name = request.GET.get('group_name')
                if group_name == 'Ungrouped':
                    data = StudentIdCardUpdate.objects.filter(group_name=group_name, academic_year=academic_year).update(status=status, group_name='Default Group')
                    
                    newData = IdCardUpdate.objects.create(
                        academic_year=academic_year_obj,
                        group_name = 'Default Group',
                        status=status
                        )
                    from django.db.models import F
                    if status == 'Printed Id Sent':
                        StudentIdCardUpdate.objects.filter(
                            group_name='Default Group',
                            academic_year=academic_year
                        ).update(print_count=F('print_count') + 1)
                    return Response({
                        'status': 'success'
                    })
                    
                

                idcard_update = IdCardUpdate.objects.create(
                    academic_year=academic_year_obj,
                    group_name=group_name,
                    status=status
                )
                
                data = StudentIdCardUpdate.objects.filter(group_name=group_name, academic_year=academic_year).update(status=status)
                if status == 'Printed Id Sent':
                        from django.db.models import F
                        StudentIdCardUpdate.objects.filter(
                            group_name=group_name,
                            academic_year=academic_year
                        ).update(print_count=F('print_count') + 1)
                
                return Response({
                    'status': 'success'
                })

            for obj in queryset:
                group = obj.group_name or "Ungrouped"
                status = obj.status or "No Status"

                if group not in grouped_data:
                    grouped_data[group] = {}

                if status not in grouped_data[group]:
                    grouped_data[group][status] = []

                grouped_data[group][status].append(obj)

            # Serialize grouped data
            final_data = {}

            for group, statuses in grouped_data.items():
                final_data[group] = {}

                for status, items in statuses.items():
                    serializer = StudentIdCardUpdateSerializer(items, many=True)
                    final_data[group][status] = serializer.data

            return Response({
                "data": final_data
            })

        # 📄 Normal pagination response
        data, count, next_page, previous_page = SharedService.custom_pagination(
            self,
            queryset,
            request.GET.get('limit'),
            request.GET.get('pageno')
        )

        serializer = StudentIdCardUpdateSerializer(data, many=True)

        return Response({
            'data': {
                'count': count,
                'next': next_page,
                'previous': previous_page,
                'data_list': serializer.data
            }
        })
        
        

from django.db.models import Count, Sum, Q
from apps.students.models import Student, StudentIdCardUpdate


def get_dashboard_data(academic_year_id):
    data = {}

    # -------------------------
    # Total Students (IMPORTANT FIX)
    # -------------------------
    total_students = Student.objects.filter(is_active=True).count()

    id_cards = StudentIdCardUpdate.objects.filter(
        academic_year_id=academic_year_id,
        is_active=True
    )

    started_students = id_cards.values_list('student_id', flat=True)

    data['total_students'] = total_students
    data['total_id_cards'] = id_cards.count()

    # -------------------------
    # NOT STARTED (VERY IMPORTANT)
    # -------------------------
    data['not_started'] = Student.objects.filter(
        is_active=True
    ).exclude(id__in=started_students).count()

    # -------------------------
    # STATUS COUNTS
    # -------------------------
    status_counts = list(
        id_cards.values('status')
        .annotate(count=Count('id'))
        .order_by('status')
    )

    data['status_counts'] = status_counts

    # -------------------------
    # DERIVED METRICS
    # -------------------------
    data['photo_taken'] = id_cards.filter(
        status="Photos Taken"
    ).count()

    data['printed'] = id_cards.filter(
        status__icontains="Printed"
    ).count()

    data['pending'] = id_cards.exclude(
        status__icontains="Printed"
    ).count()

    # -------------------------
    # GROUP COUNTS
    # -------------------------
    data['group_counts'] = list(
        id_cards.values('group_name')
        .annotate(count=Count('id'))
        .order_by('group_name')
    )

    # -------------------------
    # TOTAL PRINTS
    # -------------------------
    data['total_prints'] = id_cards.aggregate(
        total=Sum('print_count')
    )['total'] or 0

    # -------------------------
    # RECENT
    # -------------------------
    data['recent_updates'] = list(
        id_cards.order_by('-created').values(
            'id',
            'name',
            'roll_no',
            'status',
            'group_name',
            'print_count'
        )[:10]
    )

    return data

from rest_framework.response import Response
from django.db import transaction

def idcard_data_sync(self, request, *args, **kwargs):
    serializer = IdCardDataSyncSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    data = serializer.validated_data

    academic_year = data['academic_year']
    bulk = data['bulk']
    student_to_id = data['student_to_id']
    student_ids = data.get('student_ids', [])

    # ✅ Get students
    if bulk == 1 and student_to_id == 1:
        students = Student.objects.filter(
            student_id_card_update_student__academic_year_id=academic_year,
            student_id_card_update_student__is_active=True,
            is_active=True
        ).distinct()
        
    elif bulk == 1 and student_to_id == 2:
        students= Student.objects.filter(is_active = True)
    else:
        students = Student.objects.filter(id__in=student_ids, is_active=True,academic_year=academic_year)

    updated_count = 0
    with transaction.atomic():

        if student_to_id in [1, 2]:
            # 🔁 STUDENT → ID CARD

            payload = [
                {
                    "student": student.id,
                    "academic_year": academic_year
                }
                for student in students
            ]

            serializer = StudentToIdCardSerializer(data=payload, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()

            updated_count = len(payload)

        else:
            # 🔁 ID CARD → STUDENT

            id_cards = StudentIdCardUpdate.objects.filter(
                academic_year_id=academic_year
            )

            if bulk == 0:
                id_cards = id_cards.filter(student_id__in=student_ids)

            for id_card in id_cards:
                serializer = IdCardToStudentSerializer(
                    instance=id_card.student,
                    data={},
                    partial=True,
                    context={"id_card": id_card}
                )
                serializer.is_valid(raise_exception=True)
                serializer.save()

            updated_count = id_cards.count()

    return Response({
        "status": "success",
        "message": "Data synced successfully",
        "updated_count": updated_count
    })