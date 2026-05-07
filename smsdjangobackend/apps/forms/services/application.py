from datetime import datetime

from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import exceptions

from apps.finance.services.forms import add_application_fee
from apps.forms.models.applicationStudent import ApplicationStudentDocumentMapping
from apps.forms.serializers import (ApplicationParentDetailSerializer, ApplicationGuardianDetailSerializer, ApplicationStudentDocumentMappingSerializer,
                                    ApplicationStudentSerializer, ApplicationStudentDetailSerializer,
                                    ApplicationStudentAddressSerializer, ApplicationStudentParentMappingSerializer)
from apps.forms.models import (ApplicationParentDetail, ApplicationGuardianDetail, ApplicationStudentDetails,
                               ApplicationStudentAddress, ApplicationStudentParentMapping)
from apps.institutes.models.academicYear import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.models.address import MapAddress
from apps.shared.services_shared.custom import add_or_update_custom_data
from apps.shared.services import FormdefinitionService, NotificationBodyTemplate, SharedService, CounterService, UploadTypeService, ConfigurationService, add_google_map_data, PDFService
from apps.students.models import StudentDetails
from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.services import ConfigurationService
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.models.custom import CustomForm
from apps.institutes.models import Institute
from apps.shared.services_shared.common import get_full_name, get_selected_template
from apps.payments.services.order_payments import update_payment_status
from apps.payments.models.online_payments import OnlinePayment
from apps.payments.constants import PENDING_PAYMENT_STATUSES

def add_application(self, data, is_approved):
    parentDetail = None
    is_approved = True if (self.request.user and is_approved) else False
    if ConfigurationService.get_setting_value('is_application_auto_approve'):
        is_approved = True
    stud_serializer = parsentDetail = guardianDetail = curr_serializer = parent_serializer = False
    guardian_serializer = permanent_serializer = False
    if SharedService.check_all_dictvalues_not_emp_or_none(data['parent_detail']):
        parent_serializer = ApplicationParentDetailSerializer(data=data['parent_detail'])
        parent_serializer.is_valid(raise_exception=True)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['guardian_detail']):
        guardian_serializer = ApplicationGuardianDetailSerializer(data=data['guardian_detail'])
        guardian_serializer.is_valid(raise_exception=True)
    # upload_details, created = UploadType.objects.get_or_create(name='ApplicationStudent')
    counter, prefix, postfix = CounterService.get_countered_value(self, 'APPLICATION',
                                                                  academic_year=data['student']['entry_academic_year'])
    data['student']['application_num'] = f'{prefix}{counter.value}{postfix}'
    data['student']['is_approved'] = is_approved
    data['student']['student'] = data['student']['student'] if 'student' in data['student'] else None
    # Link application to user if authenticated (from OTP login)
    if hasattr(self, 'request') and self.request.user and self.request.user.is_authenticated:
        data['student']['user'] = self.request.user.id
    if 'document_list' in data and data['document_list']:
        deletable_document_list = []
        if 'deletable_document_list' in data and data['deletable_document_list']:
            deletable_document_list = data['deletable_document_list']
        validate_document_list(data['document_list'], deletable_document_list, None)
    with transaction.atomic(using=get_current_db_name()):
        serializer = ApplicationStudentSerializer(data=data['student'])
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        if not student.id:
            raise exceptions.ValidationError('Application form not created!')
        if SharedService.check_all_dictvalues_not_emp_or_none(data['student_detail']):
            data['student_detail']['application_student'] = student.id
            stud_serializer = ApplicationStudentDetailSerializer(data=data['student_detail'])
            stud_serializer.is_valid(raise_exception=True)
        if SharedService.check_all_dictvalues_not_emp_or_none(data['student_address']):
            if SharedService.check_all_dictvalues_not_emp_or_none(
                    data['student_address']['current_address']):
                data['student_address']['current_address']['application_student'] = student.id
                data['student_address']['current_address']['type'] = 'CP'
                if 'permanent_address' not in data['student_address']:
                    data['student_address']['permanent_address']={}
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
                        permanent_serializer = ApplicationStudentAddressSerializer(
                            data=data['student_address']['permanent_address'])
                        permanent_serializer.is_valid(raise_exception=True)
                if not data['student_address']['cp'] and data['student_address']['permanent_address']:
                    if SharedService.check_all_dictvalues_not_emp_or_none(
                            data['student_address']['permanent_address']):
                        data['student_address']['permanent_address']['application_student'] = student.id
                        data['student_address']['permanent_address']['type'] = 'P'
                        data['student_address']['current_address']['type'] = 'C'
                        if 'map_address_data' in data['student_address']['permanent_address'] and data['student_address']['permanent_address']['map_address_data']:
                            map_data = add_google_map_data(data['student_address']['permanent_address']['map_address_data'])
                            data['student_address']['permanent_address']['map_address'] = map_data.id
                        else:
                            data['student_address']['permanent_address']['map_address'] = None
                        data['student_address']['permanent_address']['address'] = data['student_address']['permanent_address']['address'] \
                            if 'permanent_address' in data['student_address'] and 'address' in data['student_address']['permanent_address']else None
                        data['student_address']['permanent_address']['country'] = data['student_address']['permanent_address']['country'] \
                            if 'permanent_address' in data['student_address'] and 'country' in data['student_address']['permanent_address']else None
                        data['student_address']['permanent_address']['state'] = data['student_address']['permanent_address']['state'] \
                            if 'permanent_address' in data['student_address'] and 'state' in data['student_address']['permanent_address']else None
                        data['student_address']['permanent_address']['district'] = data['student_address']['permanent_address']['district'] \
                            if 'permanent_address' in data['student_address'] and 'district' in data['student_address']['permanent_address']else None
                        data['student_address']['permanent_address']['city'] = data['student_address']['permanent_address']['city'] \
                            if 'permanent_address' in data['student_address'] and 'city' in data['student_address']['permanent_address']else None
                        data['student_address']['permanent_address']['pincode'] = data['student_address']['permanent_address']['pincode'] \
                            if 'permanent_address' in data['student_address'] and 'pincode' in data['student_address']['permanent_address']else None
                        permanent_serializer = ApplicationStudentAddressSerializer(
                            data=data['student_address']['permanent_address'])
                        permanent_serializer.is_valid(raise_exception=True)
                if 'map_address_data' in data['student_address']['current_address'] and data['student_address']['current_address']['map_address_data']:
                    map_data = add_google_map_data(data['student_address']['current_address']['map_address_data'])
                    data['student_address']['current_address']['map_address'] = map_data.id
                else:
                    data['student_address']['current_address']['map_address'] = None
                data['student_address']['current_address']['address'] = data['student_address']['current_address']['address'] \
                    if 'current_address' in data['student_address'] and 'address' in data['student_address']['current_address']else None
                data['student_address']['current_address']['country'] = data['student_address']['current_address']['country'] \
                    if 'current_address' in data['student_address'] and 'country' in data['student_address']['current_address']else None
                data['student_address']['current_address']['state'] = data['student_address']['current_address']['state'] \
                    if 'current_address' in data['student_address'] and 'state' in data['student_address']['current_address']else None
                data['student_address']['current_address']['district'] = data['student_address']['current_address']['district'] \
                    if 'current_address' in data['student_address'] and 'district' in data['student_address']['current_address']else None
                data['student_address']['current_address']['city'] = data['student_address']['current_address']['city'] \
                    if 'current_address' in data['student_address'] and 'city' in data['student_address']['current_address']else None
                data['student_address']['current_address']['pincode'] = data['student_address']['current_address']['pincode'] \
                    if 'current_address' in data['student_address'] and 'pincode' in data['student_address']['current_address']else None
                curr_serializer = ApplicationStudentAddressSerializer(
                    data=data['student_address']['current_address'])
                curr_serializer.is_valid(raise_exception=True)
        data['fees']['student'] = student.id
        data['fees']['is_new_student'] = False if 'student' in data['student'] and data['student']['student'] else True
        if 'is_active' in data['student'] and data['student']['is_active']:
            res = add_application_fee(self, data['fees'],data['student']['application_date'])  # application fees
        else:
            res = None
        if parent_serializer:
            parentDetail = parent_serializer.save()
            data['application_parent'] = parentDetail.id
        if guardian_serializer:
            guardianDetail = guardian_serializer.save()
            data['application_guardian'] = guardianDetail.id
        if parentDetail or guardianDetail:
            data['application_student'] = student.id
            map_serializer = ApplicationStudentParentMappingSerializer(data=data)
            map_serializer.is_valid(raise_exception=True)
            map_serializer.save()
        if stud_serializer:
            stud_serializer.save()
        if curr_serializer:
            curr_serializer.save()
        if permanent_serializer:
            permanent_serializer.save()
        if 'document_list' in data and data['document_list']:
            add_or_update_student_app_document(student.id, data['document_list'])
        if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
            add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], student)
        UploadTypeService.make_document_active(data['student']['profile_pic'])
        CounterService.increment_counter(self, counter)
    SharedService.custom_thread(student_application_form_notification, self, student)
    return_data = {'id': student.id}
    if res:
        return_data['receipt_id'] = res['data']['id']
    return {'Reason': f'Application form successfully created! Application # : {student.application_num}',
                'data': return_data}

def validate_document_list(document_list, deletable_document_list=[], student=None):
    duplicate_document = {}
    duplicate_document_type = {}
    existing_document_list = {}
    if student:
        existing_document_list = {
            student_document['document_id']: student_document for student_document in ApplicationStudentDocumentMapping.objects.filter(student=student).exclude(id__in=deletable_document_list).values()
        }
    for document in document_list:
        if document['document'] and document['document'] in existing_document_list:
            if 'id' not in document or document['id'] != existing_document_list[document['document']]['id']:
                raise exceptions.ValidationError('Duplicate Document list found')
        if document['document'] in duplicate_document:
            raise exceptions.ValidationError('Duplicate Document')
        if document['document_type']:
            duplicate_document_type[document['document_type']] = ''
        if document['document']:
            duplicate_document[document['document']] = ''

def add_or_update_student_app_document(student_id, document_list, deletable_document_list=[]):
    if deletable_document_list:
        ApplicationStudentDocumentMapping.objects.filter(id__in=deletable_document_list).update(is_active=False)
    for data in document_list:
        data['student'] = student_id
        if 'id' in data and data['id']:
            serializer = ApplicationStudentDocumentMappingSerializer(instance=ApplicationStudentDocumentMapping.objects.get(id=data['id']),data=data)
        else:
            serializer = ApplicationStudentDocumentMappingSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def student_application_form_notification(self, student):
    action = 'application_create'
    notification_obj = NotificationBodyTemplate(action)
    customized_data = list()
    temp = {
        'student_name': student.first_name,
        'start_year': student.entry_academic_year.start_date.year,
        'end_year': student.entry_academic_year.end_date.year,
        'standard_name': student.current_standard.name
    }
    body_email = notification_obj.select_template('email', temp)
    body_sms = notification_obj.select_template('sms', temp)
    if student.email:
        customized_data.append(
            {'email': student.email, 'user_id': None, 'email_subject': None,
                                   'email_body': body_email,'email_notification':1}
        )
    if student.mobile_num:
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': None, 'sms_body': body_sms, 'sms_notification': 1}
        )
    if customized_data:
        send_notification(action, body=None, customizedData=customized_data)


def update_application(self, data, **kwargs):
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    stud_serializer = parentDetail = guardianDetail = curr_serializer = parent_serializer = False
    guardian_serializer = permanent_serializer = False
    parentId = data['parent_detail'].pop('id', None)  # update validating without id
    guardianId = data['guardian_detail'].pop('id', None)
    deletable_document_list = []
    if 'document_list' in data and data['document_list']:
        if 'deletable_document_list' in data and data['deletable_document_list']:
            deletable_document_list = data['deletable_document_list']
        validate_document_list(data['document_list'], deletable_document_list, instance.id)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['parent_detail']):
        if parentId:
            data['parent_detail']['id'] = parentId
        try:
            instance_parent = ApplicationParentDetail.objects.get(id=data['paexceptionsrent_detail']['id'])
        except:
            instance_parent = None
        parent_serializer = ApplicationParentDetailSerializer(data=data['parent_detail'],
                                                              instance=instance_parent, partial=partial)
        parent_serializer.is_valid(raise_exception=True)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['guardian_detail']):
        if guardianId:
            data['guardian_detail']['id'] = guardianId
        try:
            instance_guardian = ApplicationGuardianDetail.objects.get(id=data['guardian_detail']['id'])
        except:
            instance_guardian = None
        guardian_serializer = ApplicationGuardianDetailSerializer(data=data['guardian_detail'],
                                                                  instance=instance_guardian,
                                                                  partial=partial)
        guardian_serializer.is_valid(raise_exception=True)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['student_detail']):
        data['student_detail']['application_student'] = instance.id
        try:
            queryset = ApplicationStudentDetails.objects.get(application_student=instance)
        except:
            queryset = None
        stud_serializer = ApplicationStudentDetailSerializer(data=data['student_detail'], instance=queryset,
                                                             partial=partial)
        stud_serializer.is_valid(raise_exception=True)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['student_address']):
        if SharedService.check_all_dictvalues_not_emp_or_none(data['student_address']['current_address']):
            data['student_address']['current_address']['application_student'] = instance.id
            data['student_address']['current_address']['type'] = 'CP'
            try:
                queryset_current = ApplicationStudentAddress.objects.get(application_student=instance,
                                                                         type__contains='C')
            except:
                queryset_current = None
            if not data['student_address']['cp']:
                if SharedService.check_all_dictvalues_not_emp_or_none(
                        data['student_address']['permanent_address']):
                    data['student_address']['permanent_address']['application_student'] = instance.id
                    data['student_address']['permanent_address']['type'] = 'P'
                    data['student_address']['current_address']['type'] = 'C'
                    try:
                        queryset_permanent = ApplicationStudentAddress.objects.get(
                            application_student=instance, type='P')
                    except:
                        queryset_permanent = None
                    if queryset_permanent and queryset_permanent.map_address:
                        data['student_address']['permanent_address']['map_address_data']['id'] = queryset_permanent.map_address_id
                    if 'map_address_data' in data['student_address']['permanent_address']:
                        map_data = add_google_map_data(data['student_address']['permanent_address']['map_address_data'])
                        data['student_address']['permanent_address']['map_address'] = map_data.id
                    data['student_address']['permanent_address']['address'] = ""
                    data['student_address']['permanent_address']['country'] = ""
                    data['student_address']['permanent_address']['state'] = ""
                    data['student_address']['permanent_address']['district'] = ""
                    data['student_address']['permanent_address']['city'] = ""
                    data['student_address']['permanent_address']['pincode'] = None
                    permanent_serializer = ApplicationStudentAddressSerializer(instance=queryset_permanent,
                                                                               data=data['student_address'][
                                                                                   'permanent_address'],
                                                                               partial=partial)
                    permanent_serializer.is_valid(raise_exception=True)
            else:
                try:
                    queryset_permanent = ApplicationStudentAddress.objects.get(application_student=instance,
                                                                               type='P')
                    queryset_permanent.delete()
                    if queryset_permanent and queryset_permanent.map_address_id:
                        MapAddress.objects.filter(id=queryset_permanent.map_address_id).delete()
                except:
                    pass
            if queryset_current and queryset_current.map_address:
                data['student_address']['current_address']['map_address_data']['id'] = queryset_current.map_address_id
            if 'map_address_data' in data['student_address']['current_address']:
                map_data = add_google_map_data(data['student_address']['current_address']['map_address_data'])
                data['student_address']['current_address']['map_address'] = map_data.id
            data['student_address']['current_address']['address'] = ""
            data['student_address']['current_address']['country'] = ""
            data['student_address']['current_address']['state'] = ""
            data['student_address']['current_address']['district'] = ""
            data['student_address']['current_address']['city'] = ""
            data['student_address']['current_address']['pincode'] = None
            curr_serializer = ApplicationStudentAddressSerializer(instance=queryset_current, partial=partial,
                                                                  data=data['student_address'][
                                                                      'current_address'])
            curr_serializer.is_valid(raise_exception=True)
    if parent_serializer:
        parentDetail = parent_serializer.save()
        data['application_parent'] = parentDetail.id
    if guardian_serializer:
        guardianDetail = guardian_serializer.save()
        data['application_guardian'] = guardianDetail.id
    if parentDetail or guardianDetail:
        data['application_student'] = instance.id
        try:
            queryset = ApplicationStudentParentMapping.objects.get(application_student=instance)
        except:
            queryset = None
        map_serializer = ApplicationStudentParentMappingSerializer(data=data, instance=queryset,
                                                                   partial=partial)
        map_serializer.is_valid(raise_exception=True)
        map_serializer.save()
    serializer = ApplicationStudentSerializer(data=data['student'], instance=instance, partial=partial)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    if stud_serializer:
        stud_serializer.save()
    if curr_serializer:
        curr_serializer.save()
    if permanent_serializer:
        permanent_serializer.save()
    if 'document_list' in data and data['document_list']:
        add_or_update_student_app_document(instance.id, data['document_list'], deletable_document_list)
    if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
        add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], instance)
    UploadTypeService.make_document_active(data['student']['profile_pic'])
    return {'Reason': 'Application form successfully updated!'}

def delete_application(self, data):
    if not data:
        raise exceptions.ValidationError('No data is selected to delete.')
    studentDetails = StudentDetails.objects.filter(application__in=data)
    if studentDetails.exists():
        studentsName = ''
        for app in studentDetails:
            studentsName += app.application.first_name + ', '
        raise exceptions.ValidationError(f'Cannot delete the application for the student(s): {studentsName}')
    self.get_queryset().filter(id__in=data).update(is_active=False)
    return {'Reason': 'Data deleted Successfully!'}


def get_application_for_admission(self):
    applicationNum = self.request.GET.get('application_num')
    academicYear = self.request.GET.get('academic_year')
    queryset = None
    try:
        StudentDetails.objects.get(student__is_active=True, application__application_num=applicationNum,
                                   application__entry_academic_year=academicYear)
        raise exceptions.ValidationError(f'Admission details already exists for Application!')
    except ObjectDoesNotExist:
        pass
    self.kwargs['application_num'] = applicationNum
    response = SharedService.read_data(self)
    return response

def download_application_student_data(self,data):
    student_list=[]
    student_dict={}
    student_details_dict={}
    student_parent_dict={}
    student_address_dict={}
    for student in data:
        student_list.append(student['id'])
        student_dict[student['id']] = student
    appln_student_details = ApplicationStudentDetails.objects.filter(application_student__in=student_list).values('blood_group','application_student',
                        'aadhar_num','caste__name','category__name')
    appln_parent_details = ApplicationStudentParentMapping.objects.filter(application_student__in = student_list).values('application_parent__father_name','application_parent__mother_name',
                        'application_parent__f_mobile_num','application_parent__m_mobile_num','application_guardian__guardian_name','application_student')
    appln_student_address = ApplicationStudentAddress.objects.filter(application_student__in=student_list).values('address','country','state','district','city','application_student')
    for student in appln_student_details:
        student_details_dict[student['application_student']] = student
    for student in appln_parent_details:
        student_parent_dict[student['application_student']] = student
    for student in appln_student_address:
        student_address_dict[student['application_student']] = student
    for student in data:
        student['name'] = get_full_name(student['first_name'],student['middle_name'],student['last_name'])
        if student['id'] in student_details_dict:
            student.update(student_details_dict[student['id']])
        if student['id'] in student_parent_dict:
            student.update(student_parent_dict[student['id']])
        if student['id'] in student_address_dict:
            student.update(student_address_dict[student['id']])
    institute=Institute.get_institute(self)
    custom_data = CustomForm.objects.filter(
        form_for='application_form',is_active=1
    ).values('field_structure')
    options={}
    options['title'] = 'Student Details'
    options['description'] = 'Student Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
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
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'current_standard_name'
        }
        ,{
            'column': 'Blood Group', 'required': False, 'schemacolumn':'blood_group'
        }
        ,{
            'column': 'Date Of Birth', 'required': False, 'schemacolumn': 'dob'
        },{
            'column': 'Father Name', 'required': False, 'schemacolumn': 'application_parent__father_name'
        },{
            'column': 'Father Mob', 'required': False, 'schemacolumn': 'application_parent__f_mobile_num'
        },
        {
            'column': 'Mother Name', 'required': False, 'schemacolumn': 'application_parent__mother_name'
        },{
            'column': 'Mother Mob', 'required': False, 'schemacolumn': 'application_parent__m_mobile_num'
        },{
            'column': 'Guardian Name', 'required': False, 'schemacolumn': 'application_parent__guardian_name'
        },{
            'column': 'Application Number', 'required': False, 'schemacolumn': 'application_num'
        },
        {
            'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
        },{
            'column': 'Student Aadhar Number', 'required': False, 'schemacolumn': 'aadhar_num'
        },{
            'column': 'Category', 'required': False, 'schemacolumn': 'category__name'
        },{
            'column': 'Caste', 'required': False, 'schemacolumn': 'caste__name'
        },{
            'column': 'Application Date', 'required': False, 'schemacolumn': 'application_date'
        },
        {
            'column': 'Address', 'required': False, 'schemacolumn': 'address'
        },
        {
            'column': 'City', 'required': False, 'schemacolumn': 'city'
        }
    ]
    for custom_admission_form in custom_data:
        for custom_fields in custom_admission_form['field_structure']:
            options['columns'].append({
                'column':custom_fields['label'], 'required': False, 'schemacolumn': custom_fields['name']
            })

    return write_to_excel_new(self, options, {}, {})


def get_application_form(self, response):
    """Generate PDF for application form. Uses application_form module templates."""
    default = 'default_application_form.html'
    selected_template, number_of_copies = get_selected_template(
        self, 'application_form', 'pdf', default
    )
    path = 'application_form/' + selected_template

    data = response['data']
    data['today'] = datetime.today().strftime('%d/%m/%Y')
    data['institute'] = Institute.get_institute(self)
    data['custom_form_data'] = data.get('custom_form_data') or {}

    if data.get('dob') and isinstance(data['dob'], str):
        try:
            data['dob'] = datetime.strptime(data['dob'], '%Y-%m-%d').date()
        except (ValueError, TypeError):
            pass
    if data.get('application_date') and isinstance(data['application_date'], str):
        try:
            data['application_date'] = datetime.strptime(
                data['application_date'][:10], '%Y-%m-%d'
            ).date()
        except (ValueError, TypeError):
            pass

    if data.get('dob'):
        try:
            from num2words import num2words
            dob_val = data['dob']
            data['dob_in_words'] = (
                num2words(int(dob_val.strftime('%d')), lang='en').title() + ' ' +
                dob_val.strftime('%B') + ' ' +
                num2words(int(dob_val.strftime('%Y')), lang='en').title()
            )
        except Exception:
            data['dob_in_words'] = ''

    if data.get('student_details') and data['student_details'].get('previous_school_details'):
        prev = data['student_details']['previous_school_details']
        for date_key in ['to_date', 'from_date', 'tc_issued_date']:
            if prev.get(date_key) and isinstance(prev[date_key], str):
                try:
                    parsed = datetime.strptime(prev[date_key][:10], '%Y-%m-%d')
                    prev[date_key] = parsed.strftime('%d/%m/%Y')
                except (ValueError, TypeError):
                    pass

    custom = data.get('custom_form_data', {})
    for date_key in ['leaving_certificate_date', 'doj', 'doa', 'fee_receipt_date']:
        if custom.get(date_key) and isinstance(custom[date_key], str):
            try:
                parsed = datetime.strptime(custom[date_key][:10], '%Y-%m-%d')
                custom[date_key] = parsed.strftime('%d/%m/%Y')
            except (ValueError, TypeError):
                pass

    return PDFService.receipt(self, data, 'application_form', path, False)
