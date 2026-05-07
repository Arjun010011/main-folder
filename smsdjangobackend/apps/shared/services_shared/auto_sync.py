import json
import ast
from datetime import datetime
from apps.classes.models import standard
from apps.finance.services import calculations
from apps.finance.services.fee_plan import apply_automatic_concession_to_fee_plan, arrange_fee_plan_group_wise, get_fee_plan
from apps.shared.models.custom import FormDefinition
from apps.shared.services_shared.exam import sync_update_proper_result_as_per_marks, sync_update_student_standard_and_section_rank
from apps.shared.services_shared.syncs.staff_biometric import sync_copy_user_id_to_machine_id
import barcode
from barcode.writer import ImageWriter
from io import BytesIO
from django.db import transaction
from apps.shared.services_shared.syncs.student_sync import sync_copy_father_number_to_primary_number, sync_remove_spaces_from_aadhar_card
from apps.tenants.services.middlewares import get_current_db_name


from apps.classes.models.enrollment import StudentStandardMapping,Enrollment
from apps.classes.models.standard import Standard
from apps.classes.serializers import MachineAttendanceSerializer, StandardSerializer,StudentStandardMappingSerializer
from apps.classes.models.subject import AssignSubject, SubjectStudent
from apps.classes.serializers import EnrollmentSerializer, SubjectStudentSerializer
from apps.classes.services.handled_machine_data import add_user_data_to_machine, process_unsynced_data
from apps.diary.models.diary import Diary, StaffDiary
from apps.diary.serializers import StaffDiarySerializer
from apps.hr.models.staffAttendance import StaffAttendance
from apps.classes.models.attendance import MachineUserMapping,MachineAttendanceFailedToSaveData
from apps.hr.services.staffattendance import get_staff_attendance_status
from apps.hr.services.timetable import date_over_lap_check
from apps.shared.services_shared.common import get_selected_template
from apps.notification.services.notification_service import send_notification
from apps.shared.services import NotificationBodyTemplate
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.models.caste import Caste
from apps.shared.utils import http_request
from django.conf import settings
from rest_framework import exceptions
from django.db.models import F
from apps.classes.models import StandardSectionMapping,PromoteStudent
from apps.classes.models.attendance import Attendance
from django.db.models.functions import Concat
from django.db.models import F, Value as V
from django.http import HttpResponse
from openpyxl import Workbook

from apps.institutes.models import Institute
from apps.shared.services import FormdefinitionService, SharedService, UploadTypeService,PDFService
from apps.students.models.student import Student
from django.core.files.uploadedfile import InMemoryUploadedFile
from apps.students.models.studentDetail import StudentAddress, StudentDetails
from apps.users.models.user import User
from datetime import date,time
from apps.institutes.serializers import AcademicYearViewSerializer, InstituteSerializer
from apps.institutes.models.institute import Institute
from apps.staffs.models import Staff
from apps.hr.services.staffattendance import get_intime_outtime,staff_attendence_daily_report,json_staff_daily_attendence_report
from apps.bdu.services.write_to_excel import write_to_excel_new_attendance,write_to_excel_new,write_to_excel_new_student_attendence
from apps.finance.models.feeCollection import AdmissionForm, FeeCollection, PaymentDetail, FeeCollectionModeOfPayment
from apps.payments.models.online_payments import OnlinePayment
from apps.finance.models.fee import FeePlan, FeeStandardMapping, FeeplanStudentFeature
from apps.finance.services.finance_dashboard import calculate_dashboard_cache
from apps.finance.models.finance_dashboard import FinanceDashboardCache
from apps.finance.models.fee_category import FeeCategoryFeeStandardSectionMapping
from apps.finance.serializers import FeeCollectionSerializer, FeeTermsSerializer, GetFeeCollectionSerializer, PaymentDetailSerializer
from apps.users.services.auth import expire_all_token_for_user
from apps.classes.services.handled_machine_data import find_machine_id_in_sibling,add_user_attendance_machine
from apps.classes.services.attendance import get_school_timing_data_for_standard_sections
from apps.shared.services_shared.library import sync_update_book_subcategory
from apps.users.encrypt_decrypt import encrypt_password,decrypt_password
from apps.users.services.auth import update_username_password_bulk



AWS_S3_CUSTOM_DOMAIN = getattr(settings, 'AWS_S3_CUSTOM_DOMAIN', None)
SERVER_URL = getattr(settings, 'SERVER_URL', None)


def get_sync_list():
    return {
        'sync_user_to_signup': {
            'label': 'Sync User To Signup', 'description': 'Sync User To Signup',
            'function': sync_user_to_signup,
            'params': {},
        },
        'sync_update_current_standard_for_student':{
            'label': 'Sync student current standard', 'description': 'Sync Student Current Standard',
            'function': sync_update_current_standard_for_student,
            'params': {},
        },
        'sync_update_current_standard_for_student_for_current_academic_year':{
            'label': 'Sync student current standard to current academic year', 
            'description': 'Used For Colleges with multiple years. Here we sync students standard according to the current academic year using studentstandard mapping',
            'function': sync_update_current_standard_for_student,
            'params': {'sync_to_current_academic_year': True},
        },
        'sync_update_student_category_for_caste': {
            'label': 'Update Student Category based on Caste',
            'description': 'While adding the caste from bdu if they missed adding category for the caste we will sync update category for all the caste',
            'function': sync_update_student_category_for_caste
        },
        # 'sync_assign_subject_to_student': {
        #     'label': 'Sync Class Subject To Student',
        #     'description': 'Sync Standard Subject to Student',
        #     'function': sync_standard_subject
        # },
        'sync_shift_not_assigned_datas': {
            'label': 'Sync not assigned shift data from staff attendance',
            'description': 'Read all shift not assigned data from the staff attendance syncs the data',
            'function': sync_shift_not_assigned_datas,
            'params': {},
        },
        'sync_school_data_not_assigned_datas': {
            'label': 'Sync not assigned school data from staff attendance',
            'description': 'Read all shift not assigned data from the staff attendance syncs the data',
            'function': sync_school_details_not_assigned_datas,
            'params': {},
        },
        'sync_caste_name_brackets_remove': {
            'label': 'Sync to remove brackets from caste name',
            'description': 'Sync to remove brackets from caste name',
            'function': sync_caste_name_brackets_remove,
            'params': {},
        },
        'sync_get_daily_attendance_report_staff': {
            'label': 'Sync to send daily attendance to a email id',
            'description': 'Sync to send daily attendance to a email id',
            'function': get_staff_daily_attendence,
            'params': {},
        },
        'sync_get_daily_attendance_report_student': {
            'label': 'Sync to send daily attendance to a email id',
            'description': 'Sync to send daily attendance to a email id',
            'function': get_attendence_daily_report,
            'params': {},
        },
        'sync_entry_academic_year':{
            'label': 'Sync to change entry academic year',
            'description': 'Sync to change entry academic year',
            'function':sync_update_entry_academic_year,
            'params': {},
        },
        'sync_section_using_preveious_academic_year':{
            'label': 'Sync section using previous academic year',
            'description': 'Sync section using previous academic year',
            'function':sync_section_using_previous_academic_year,
            'params': {},
        },
        # 'sync_counter_fee_type_wise':{
        #     'label': 'Sync counter fee type wise',
        #     'description': 'Sync counter',
        #     'function':sync_counter_fee_type_wise
        # },
        'sync_for_barcode_number':{
            'label': 'Sync For barcode Number',
            'description': 'Sync for barcode number generation using student id',
            'function':sync_for_barcode_number,
            'params': {},
        },
        'sync_users_for_diary':{
            'label': 'Sync Users For Diary Based on Formdefinition ',
            'description': 'Whatever user ids mentioned in the assign_teachers form definitions those user will get existing diary permissions',
            'function':sync_teachers_for_diary,
            'params': {},
        },
        'sync_remove_duplicate_standard_section_mapping':{
            'label': 'Delete duplicate student from section',
            'description': 'Remove Duplicate Sections',
            'function':remove_duplicate_standard_section_mapping,
            'params': {},
        },
        'delete_student_from_enrollment_not_matching_standard':{
            'label': 'Delete Enrollment data whose standards are not matching',
            'description': 'Delete Enrollment data whose standards are not matching',
            'function':delete_student_from_enrollment_not_matching_standard,
            'params': {},
        },
        'update_student_password_same_as_username': {
            'label': 'set password same as username',
            'description': 'set password same as username whoever is not logged in',
            'function':update_student_password_same_as_username,
            'params': {},
        },
        'update_student_password_same_as_dob': {
            'label': 'set password same as date of birth',
            'description': 'set password same as date of birth whoever is not logged in',
            'function':update_student_password_same_as_dob,
            'params': {},
        },
        'copy_register_num_to_admission_num':{
            'label': 'Copy Register number from student table and put in admission number',
            'description': 'Copy Register number from student table and put in admission number',
            'function':copy_register_num_to_admission_num,
            'params': {},
        },
        'assign_current_academic_section_subj_to_student': {
            'label': 'Sync Standard Section Subjects to Student',
            'description': 'Sync Standard Section Subjects to Student',
            'function':assign_current_academic_section_subj_to_student,
            'params': {},
        },
        'read_machine_attendance_and_update':
        {
            'label': 'Sync All Machine Attendance to Staff Attendance',
            'description': 'Sync All Machine Attendance to Staff Attendance',
            'function':read_machine_attendance_and_update,
            'params': {},
        },
        'add_users_from_edubricz_to_machine': {
            'label': 'Add Users From Edubricz To Biometric Device',
            'description': 'Add Users From Edubricz To Biometric Device',
            'function': add_users_to_biometric_machine,
            'params': {},
        },
        'sync_category_for_section_category_feeplan_mapping': {
            'label': 'Sync category for section category feeplan mapping',
            'description': 'Sync Fee category for section category feeplan mapping in payment detail table',
            'function': sync_feecategory_based_on_reciptnum,
            'params': {},
        },
        'sync_feecategory_based_on_feeplan_id': {
            'label': 'Sync fee category based on fee plan id without section descrimination',
            'description': 'Sync Fee category in payment detail table based on feecategory plan mapping without section discrimination',
            'function': sync_feecategory_based_on_feeplan_id,
            'params': {},
        },
        'sync_standard_based_on_course_period': {
            'label': 'Sync standard based on course period',
            'description': 'Sync standard based on course period',
            'function': sync_standard_based_on_course_period,
            'params': {},
        },
         'sync_update_address_to_bengaluru': {
            'label': 'Sync update address to bengaluru',
            'description': 'Sync update address to bengaluru in students.models.studentDetail(StudentAddress)',
            'function': snyc_update_address_to_bengaluru,
            'params': {},
        },
        "sync_non_mandatory_fee_type_to_features_table": {
            "label": "Sync to assign non mandatory fees",
            "description": "Sync to assign non mandatory fee that was mandatory before",
            "function": sync_non_mandatory_fee_type_to_features_table,
            'params': {},
        },
        "sync_copy_father_number_to_primary_number": {
            "label": "Copy Father number to primary student mobile number",
            "description": "Copy from father mobile number to student mobile number. Only if student mobile number is empty and parent mobile have some value",
            "function": sync_copy_father_number_to_primary_number,
            'params': {},
        },
        "sync_remove_spaces_from_aadhar_card": {
            "label": "Remove spaces from aadhard card for student , parent and guardian",
            "description": "Remove spaces from aadhard card for student , parent and guardian",
            "function": sync_remove_spaces_from_aadhar_card,
            'params': {},
        },
        "sync_copy_user_id_to_machine_id": {
            "label": "Create Machine User Id Mapping table using staff userid ",
            "description": "Copy Staffs User Id to MachineUserMapping Userid. It will sync whichever user is not alread synced",
            "function": sync_copy_user_id_to_machine_id,
            'params': {},
        },
        # "sync_convert_muliple_fee_plan_to_one": {
        #     "label": "Sync to convert multiple fee plan to one",
        #     "description": "For Apuc converting terms to single fee plan",
        #     "function": sync_convert_muliple_fee_plan_to_one
        # }
        "sync_user_name_as_mobile_number": {
            "label": "Sync User Name Same as Mobile Number",
            "description": "Sync User Name Same as Mobile Number",
            "function": sync_username_same_as_mobile_number,
            'params': {},
        },
        "sync_update_student_standard_and_section_rank":{
            "label": "Update student standard and section rank in FinalResult",
            "description": "Update student standard and section rank in FinalResult",
            "function": sync_update_student_standard_and_section_rank,
            'params': {},
        },
        "sync_update_proper_result_as_per_marks": {
            "label": "Update student result to pass / fail according to there marks",
            "description": "Update student result to pass / fail according to there marks. Sometimes they might manually changed the result from pass to fail or fail to pass",
            "function": sync_update_proper_result_as_per_marks,
            'params': {},
        },
        "sync_update_default_permission_to_student": {
            "label": "Update default permissions for the student",
            "description": "Update default Permissions to the student",
            "function": sync_update_default_permission_to_student,
            'params': {},
        },
        "sync_update_txn_id_to_payment_ref_num": {
            "label": "Sync txn_id from gateway_response to payment_ref_num",
            "description": "Fetch txn_id from OnlinePayment gateway_response and update FeeCollection payment_ref_num",
            "function": sync_update_txn_id_to_payment_ref_num,
            'params': {},
        },
        "sync_finance_dashboard_cache": {
            "label": "Sync Finance Dashboard Cache",
            "description": "Recalculate and sync finance dashboard cache for all academic years and standards. Ensures all cache entries are up to date.",
            "function": sync_finance_dashboard_cache,
            'params': {},
        }
    }

def get_sync_list_data():
    return_list = []
    for key, sync in get_sync_list().items():
        return_list.append(
            {
                'label': sync['label'], 'description': sync['description'],
                'sync_type': key
            }
        )
    return return_list

def sync_user_to_signup(self, params):
    data = {}
    data['company'] = Institute.get_institute(self).company_id
    active_users = User.objects.filter(is_active=True).values(
        'username', 'password', 'is_staff', student_mobile_num=F('student__mobile_num'), student_email=F('student__email'),
        staff_email=F('student__email'), staff_mobile_num=F('staff__mobile_num')
    )
    for user in active_users:
        user['email'] = ''
        user['mobile_num'] = ''
        if user['student_email']:
            user['email'] = user['student_email']
        elif user['staff_email']:
            user['email'] = user['staff_email']
        if user['staff_mobile_num']:
            user['mobile_num'] = user['staff_mobile_num']
        elif user['student_mobile_num']:
            user['mobile_num'] = user['student_mobile_num']
    kwargs = SharedService.get_edubricz_header(self)
    data['user_list'] = list(active_users)
    data['is_delete_if_not_exist'] = True
    remote_response = http_request('POST', SERVER_URL + 'users/syncuser/', json.dumps(data), **kwargs)
    if remote_response.status_code != 200:
        raise exceptions.ValidationError(f'Error from server: {remote_response.json()}')
    return True


from datetime import date
from collections import defaultdict

def sync_update_current_standard_for_student(self, params):
    sync_to_current_academic_year = params.get('sync_to_current_academic_year', False)
    today = date.today()

    #  Fetch all students
    student_data = Student.objects.filter(is_active=True).values('current_standard', 'id')

    #  Group all mappings per student (list instead of overwriting)
    student_standard_mapping = defaultdict(list)
    for stu in StudentStandardMapping.objects.all().values(
        'student', 'standard', 'academic_year',
        'academic_year__start_date', 'academic_year__end_date'
    ):
        student_standard_mapping[stu['student']].append(stu)

    student_current_standard_track = {}
    student_data_to_update = []

    for student_id, mappings in student_standard_mapping.items():
        selected_mapping = None

        if sync_to_current_academic_year:
            #  Pick the academic year where today falls in range (if multiple, pick first match)
            for m in mappings:
                if m['academic_year__start_date'] <= today <= m['academic_year__end_date']:
                    selected_mapping = m
                    break
        else:
            #  Pick the latest academic year (max start_date)
            selected_mapping = max(
                mappings,
                key=lambda x: x['academic_year__start_date'],
                default=None
            )

        if selected_mapping:
            student_current_standard_track[student_id] = selected_mapping

    #  Compare and collect updates
    for student in student_data:
        sid = student['id']
        if (
            sid in student_current_standard_track and
            student['current_standard'] != student_current_standard_track[sid]['standard']
        ):
            student_data_to_update.append({
                'student': sid,
                'current_standard': student_current_standard_track[sid]['standard']
            })

    #  Update students
    for stu in student_data_to_update:
        Student.objects.filter(id=stu['student']).update(
            current_standard=stu['current_standard']
        )

    return {'Reason': f'{len(student_data_to_update)} students updated successfully'}



def create_sync(self, sync_type):
    if sync_type not in get_sync_list():
        raise exceptions.ValidationError('invalid sync list')
    sync_list = get_sync_list()
    sync_data = sync_list[sync_type]
    sync_function = sync_data['function']
    sync_params = sync_data.get('params', {})
    #SharedService.custom_thread(sync_function,self,sync_params)
    response = sync_function(self,sync_params)
    return {'Reason': 'Synced'}

def sync_update_student_category_for_caste(params):
    student_details = StudentDetails.objects.filter(caste__isnull=False)
    caste_data = {cas['id'] : cas for cas in Caste.objects.all().values()}
    for student in student_details:
        if not student.category and student.caste in caste_data:
            student.category = caste_data[student.caste]
            student.save()
    return {'Reason': 'Data Synced'}

def sync_update_entry_academic_year(self, params):
    NewStudents = Student.objects.all().values('id')
    for students in NewStudents:
        student_data=StudentStandardMapping.objects.filter(student_id=students['id'])
        for index,data in enumerate(student_data):
            if index==0:
                entry_acc_year = data.academic_year.start_date.year
                entry_acc_year_id = data.academic_year
            if entry_acc_year > data.academic_year.start_date.year:
                entry_acc_year = data.academic_year.start_date.year
                entry_acc_year_id = data.academic_year
        StudentDetails.objects.filter(student_id=students['id']).update(entry_academic_year=entry_acc_year_id)
    return {'Reason': 'Data Synced'}

def sync_section_using_previous_academic_year(self, params):
    promoted_students = PromoteStudent.objects.values('student', 'from_academic_year', 'from_standard', 'to_academic_year', 'to_standard')
    enrollment_data = Enrollment.objects.values('standard_section', 'student_id', 'standard_section__standard', 'standard_section__section', 'standard_section__academic_year')
    academic_year_standard_section_data = {}
    for enrollment in enrollment_data:
        if enrollment['standard_section__academic_year'] not in academic_year_standard_section_data:
            academic_year_standard_section_data[enrollment['standard_section__academic_year']] = {}
        if enrollment['standard_section__standard'] not in academic_year_standard_section_data[enrollment['standard_section__academic_year']]:
            academic_year_standard_section_data[enrollment['standard_section__academic_year']][enrollment['standard_section__standard']] = {}
        if enrollment['student_id'] not in academic_year_standard_section_data[enrollment['standard_section__academic_year']][enrollment['standard_section__standard']]:
            academic_year_standard_section_data[enrollment['standard_section__academic_year']][enrollment['standard_section__standard']][enrollment['student_id']] = None
        academic_year_standard_section_data[enrollment['standard_section__academic_year']][enrollment['standard_section__standard']][enrollment['student_id']] = enrollment['standard_section__section'] 
    enrollment_data_to_save = []
    standard_section_mapping = StandardSectionMapping.objects.values('standard', 'section', 'id', 'academic_year')
    academic_year_standard_section_mapping = {}
    for standard_section in standard_section_mapping:
        if standard_section['academic_year'] not in academic_year_standard_section_mapping:
            academic_year_standard_section_mapping[standard_section['academic_year']] = {}
        if standard_section['standard'] not in academic_year_standard_section_mapping[standard_section['academic_year']]:
            academic_year_standard_section_mapping[standard_section['academic_year']][standard_section['standard']] = {}
        if standard_section['section'] not in academic_year_standard_section_mapping[standard_section['academic_year']][standard_section['standard']]:
            academic_year_standard_section_mapping[standard_section['academic_year']][standard_section['standard']][standard_section['section']] = {}
        academic_year_standard_section_mapping[standard_section['academic_year']][standard_section['standard']][standard_section['section']] = {'standard_section': standard_section['id']}
    for promote in promoted_students:
        if not (promote['to_academic_year'] in academic_year_standard_section_data and promote['to_standard'] in academic_year_standard_section_data[promote['to_academic_year']] and promote['student'] in academic_year_standard_section_data[promote['to_academic_year']][promote['to_standard']]):
            section_id = academic_year_standard_section_data[promote['from_academic_year']][promote['from_standard']][promote['student']]
            try:
                standard_section_id = academic_year_standard_section_mapping[promote['to_academic_year']][promote['to_standard']][section_id]['standard_section']
                enrollment_data_to_save.append({
                    'standard_section': standard_section_id,
                    'student': promote['student'],
                })
            except:
                pass
    if enrollment_data_to_save:
        ser = EnrollmentSerializer(data=enrollment_data_to_save, many=True)
        ser.is_valid(raise_exception=True)
        ser.save()
    else:
        raise exceptions.ValidationError('No data to save')

def sync_standard_subject(self):
    academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
    
def sync_shift_not_assigned_datas(self, params):
    staff_attendance_data = StaffAttendance.objects.filter(
        status='shiftnotassigned'
    ).values('staff', 'for_date', 'in_time', 'out_time', 'status', 'id')
    count = 0
    for row_data in staff_attendance_data:
        count += 1
        in_time = row_data['for_date'].strftime('%Y-%m-%d') +' ' + row_data['in_time'].strftime('%H:%M:%S')
        out_time = row_data['for_date'].strftime('%Y-%m-%d') +' ' + row_data['out_time'].strftime('%H:%M:%S')
        result = get_staff_attendance_status(self, [row_data['staff']], row_data['for_date'].strftime('%Y-%m-%d'), in_time, out_time)
        if row_data['staff'] in result:
            StaffAttendance.objects.filter(
                id=row_data['id']
            ).update(
                status=result[row_data['staff']]
            )
    return {'Reason': f'Data Synced Count {count}'}

def sync_school_details_not_assigned_datas(self, params):
    failed_attendance_data = MachineAttendanceFailedToSaveData.objects.all().values()
    for row_data in failed_attendance_data:
        row_data['json']=ast.literal_eval(row_data['json'])
        if 'RealTime' in row_data['json'] and 'PunchLog' in row_data['json']['RealTime']:
            machine_user_id = int(row_data['json']['RealTime']['PunchLog']['UserId'])
            machine_user_mapping= find_machine_id_in_sibling(self, machine_user_id)
            if machine_user_id not in machine_user_mapping:
                continue
            else:
                user_id = machine_user_mapping[machine_user_id].user.id
                add_user_attendance_machine(self, row_data['json'], user_id, False)
                is_data_processed = True

# def sync_studentsattendnace_and_machine_attendance(self):
#     students_attendance_data = Attendance.objects.all().values('id','for_date','session','status','standard_section__academic_year_id','student_id','standard_section_id')
#     for row_data in students_attendance_data:
#         if row_data['status'] == 'present':
#             for_date_obj = datetime.strptime(row_data['for_date'], "%Y-%m-%d")
#             school_timing_data_section_wise = get_school_timing_data_for_standard_sections(self, [row_data['standard_section_id']], row_data['standard_section__academic_year'],for_date_obj)
#             # in_time = school_timing_data_section_wise[row_data['standard_section_id']]['']

def sync_caste_name_brackets_remove(self, params):
    data=Caste.objects.values("name","id")
    for i in data:
        k=i['name'].split('(',1)[0]
        Caste.objects.filter(pk=i['id']).update(name=k)
    return {'Reason': f'Data Synced'}

def get_staff_daily_attendence(self, params):
    from apps.hr.services.staffleave import get_lop_count_and_date_status
    institute_data = InstituteSerializer(Institute.get_institute(self)).data
    today = date.today()
    today_str=str(today)
    staff_ids = list(Staff.objects.filter(is_active=True, date_joined__lte=today_str).values_list('id', flat=True))
    staff_id_machine = list(MachineUserMapping.objects.filter(is_active=True,user__staff_id__in=staff_ids).values_list('user__staff_id', flat=True))
    lop_data = get_lop_count_and_date_status(self, today_str, today_str, staff_id_machine, False)
    lop_data=get_intime_outtime(self,lop_data)
    data=lop_data['staff_list']
    options={}
    options['Data'],options['present_num'],options['absent_num']= staff_attendence_daily_report(self,data,staff_ids,today_str)
    options['extraWorksheetData'] = dict()
    options['columns'] = json_staff_daily_attendence_report(today_str)
    options['title']='Staff attendence Daily Report'
    options['institute_name']=institute_data['name']
    options['institute_code']=institute_data['code']
    options['date']=today_str
    selected_template, number_of_copies = get_selected_template(self, 'staff_daily_attendance', 'pdf', 'bluebell_staff_daily_attendance.html')
    path = 'staff_daily_attendance/'+selected_template
    # from django.shortcuts import render
    # return render(self.request, path, response)
    filename = "staff_daily_attendance"+today_str
    response = PDFService.receipt_new(self, options,filename, path, False)
    if response.status_code == 200:
        with open(filename, 'wb') as file:
            file.write(response.content)
    if options['institute_code'] == 'bluebell':
        email_id_list=['bluebellschool59@gmail.com','edubricz@gmail.com']
    elif options['institute_code'] == 'shiksha':
        email_id_list=['shikshaintacademy@gmail.com','edubricz@gmail.com']
    url=UploadTypeService.upload_local_file(filename,path='StaffAttendance')
    customizedData = list()
    notification_obj = NotificationBodyTemplate('staff_daily_attendance_report_create')
    body_email = notification_obj.select_template('email',{})
    for email_id in email_id_list:
        customizedData.append({'email':  email_id, 'user_id':None,'email_subject': None,
                                   'email_body': body_email,'email_notification':1,'attachmentLinks':[{'url': url, 'file_name': filename.split('.')[0]}]})
    send_notification('staff_daily_attendance_report_create', body=None, customizedData=customizedData)
    # write_to_excel_new_attendance(self,options,{},{})

def get_attendence_daily_report(self, params):
    institute_data = InstituteSerializer(Institute.get_institute(self)).data
    filter_query = {'student__is_active': True}
    current_academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today(), True).id
    standard_section_ids = StandardSectionMapping.objects.filter(academic_year=current_academic_year).values_list('id',flat=True)
    filter_query['standard_section__in']=standard_section_ids
    student_ids = Enrollment.objects.filter(**filter_query).values_list('student', flat=True)
    filter_query['student__in'] = student_ids
    filter_query['for_date'] = datetime.today()
    values_list=['id','for_date','session','status','standard_section_id','student_id','student_name','standard_section__section__name','standard_section__standard__name']
    custom_annotate = {'student_name': Concat('student__first_name', V(' '), 'student__middle_name',V(' '), 'student__last_name')}
    student_attendance = Attendance.objects.filter(**filter_query).annotate(**custom_annotate).values(*values_list)
    section_wise_student_attendence={}
    section_wise_total_session_status={}
    for standard_section in standard_section_ids:
        section_wise_student_attendence[standard_section]=[]
        section_wise_total_session_status[standard_section]={}
        section_wise_total_session_status[standard_section]['session1_present']=0
        section_wise_total_session_status[standard_section]['session2_present']=0
        section_wise_total_session_status[standard_section]['session1_absent']=0
        section_wise_total_session_status[standard_section]['session2_absent']=0
        for student in student_attendance:
            student_attendance1={}
            if student['standard_section_id'] == standard_section:
                flag=0
                for student1 in section_wise_student_attendence[standard_section]:
                    if 'student_id' in student1 and student1['student_id']==student['student_id']:
                        if student['session']=='Session1':
                            student1['status_session1']=student['status']
                            if student['status'] == 'present':
                                section_wise_total_session_status[standard_section]['session1_present']+=1
                            else:
                                section_wise_total_session_status[standard_section]['session1_absent']+=1
                        elif student['session']=='Session2':
                            student1['status_session2']=student['status']
                            if student['status'] == 'present':
                                section_wise_total_session_status[standard_section]['session2_present']+=1
                            else:
                                section_wise_total_session_status[standard_section]['session2_absent']+=1
                        flag=1
                if flag==0:
                    student_attendance1['student_id']=student['student_id']
                    student_attendance1['student_name']=student['student_name']
                    if student['session']=='Session1':
                        student_attendance1['status_session1']=student['status']
                        if student['status'] == 'present':
                            section_wise_total_session_status[standard_section]['session1_present']+=1
                        else:
                            section_wise_total_session_status[standard_section]['session1_absent']+=1
                    elif student['session']=='Session2':
                        student_attendance1['status_session2']=student['status']
                        if student['status'] == 'present':
                            section_wise_total_session_status[standard_section]['session2_present']+=1
                        else:
                            section_wise_total_session_status[standard_section]['session2_absent']+=1
                    section_wise_student_attendence[standard_section].append(student_attendance1)
    options={}
    options['Data'] = section_wise_student_attendence
    options['summary_data'] = section_wise_total_session_status
    options['extraWorksheetData'] = dict()
    options['columns'],summary_data = json_student_attendence_report()
    options['title']='Students attendence Report'
    options['institute_name']=institute_data['name']
    options['institute_code']=institute_data['code']
    options['date']=str(date.today())
    options['standard_dict']=SharedService.get_standard_and_section_name_using_standard_section(self,standard_section_ids)
    selected_template, number_of_copies = get_selected_template(self, 'staff_daily_attendance', 'pdf', 'bluebell_student_daily_attendance.html')
    path = 'student_daily_attendance/'+selected_template
    # from django.shortcuts import render
    # return render(self.request, path, response)
    filename = "student_daily_attendance"+options['date']
    response = PDFService.receipt_new(self, options,filename, path, False)
    if response.status_code == 200:
        with open(filename, 'wb') as file:
            file.write(response.content)
    url = UploadTypeService.upload_local_file(filename, path='longrunning/FeeReport')
    customizedData = list()
    notification_obj = NotificationBodyTemplate('student_daily_attendance_report_create')
    body_email = notification_obj.select_template('email',{})
    if options['institute_code'] == 'bluebell':
        email_id_list=['bluebellschool59@gmail.com','edubricz@gamil.com']
    elif options['institute_code'] == 'shiksha':
        email_id_list=['shikshaintacademy@gmail.com','edubricz@gmail.com']
    if email_id_list:
        url=UploadTypeService.upload_local_file(filename,path='StudentAttendance')
        customizedData = list()
        notification_obj = NotificationBodyTemplate('student_daily_attendance_report_create')
        body_email = notification_obj.select_template('email',{})
        for email_id in email_id_list:
            customizedData.append({'email':  email_id, 'user_id':None,'email_subject': None,
                                   'email_body': body_email,'email_notification':1,'attachmentLinks':[{'url': url, 'file_name': filename.split('.')[0]}]})
        send_notification('student_daily_attendance_report_create', body=None, customizedData=customizedData)
    # return write_to_excel_new_student_attendence(self,standard_section_ids,options,summary_data,{})

def json_student_attendence_report():
    column_data=[
        {
            'column': 'STUDENT NAME', 'required': False, 'schemacolumn': 'student_name'
        }]
    column_data.append({
                'column':'Morning Status', 'required': False, 'schemacolumn': 'status_session1'
        })
    column_data.append({
                'column':'Afternoon Status', 'required': False, 'schemacolumn': 'status_session2'
        })
    summary_data=[{
            'label':'No of students present in First session',
            'value':'session1_present'
        }]
    summary_data.append({
            'label':'No of students present in Second session',
            'value':'session2_present'
    })
    summary_data.append({
            'label':'No of students absent in First session',
            'value':'session1_absent'
    })
    summary_data.append({
            'label':'No of students absent in Second session',
            'value':'session2_absent'
    })
    return column_data,summary_data

# def sync_counter_fee_type_wise(self):
#     existing_plan=[374,382,384,386,373,381,383,385,372,382,384,386,381,383,385]
#     payment_detail = PaymentDetail.objects.filter(fee_plan__in=existing_plan).values('fee_collection__student_id','fee_plan_id','id')
#     existing_payment_details={}
#     for payments in payment_detail:
#         if payments['fee_collection__student_id'] not in existing_payment_details:
#             existing_payment_details[payments['fee_collection__student_id']] = {'payment_details':[],'plans':[]}
#         existing_payment_details[payments['fee_collection__student_id']]['payment_details'].append({'plan':payments['fee_plan_id'],'id':payments['id'],'student_id':payments['fee_collection__student_id']})
#         existing_payment_details[payments['fee_collection__student_id']]['plans'].append(payments['fee_plan_id'])
#     upcoming_payment=[]
#     for students in existing_payment_details:
#         if 374 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 374:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':701})
#                 elif payment_details['plan'] == 382:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':702})
#                 elif payment_details['plan'] == 384:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':703})
#                 elif payment_details['plan'] == 386:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':704})
#         if 373 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 373:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':705})
#                 elif payment_details['plan'] == 381:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':706})
#                 elif payment_details['plan'] == 383:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':707})
#                 elif payment_details['plan'] == 385:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':708})
#         if 372 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 372:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':694})
#                 elif payment_details['plan'] == 382:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':695})
#                 elif payment_details['plan'] == 384:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':696})
#                 elif payment_details['plan'] == 386:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':697})
#         if 372 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 381:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':698})
#                 elif payment_details['plan'] == 383:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':699})
#                 elif payment_details['plan'] == 385:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':700})
#     for payment in upcoming_payment:
#         PaymentDetail.objects.filter(id=payment['payment_id']).update(fee_plan_id=payment['changed_plan'])
#     payment_detail = FeeplanStudentFeature.objects.filter(fee_plan__in=existing_plan).values('student_id','fee_plan_id','id')
#     existing_payment_details={}
#     for payments in payment_detail:
#         if payments['student_id'] not in existing_payment_details:
#             existing_payment_details[payments['student_id']] = {'payment_details':[],'plans':[]}
#         existing_payment_details[payments['student_id']]['payment_details'].append({'plan':payments['fee_plan_id'],'id':payments['id'],'student_id':payments['student_id']})
#         existing_payment_details[payments['student_id']]['plans'].append(payments['fee_plan_id'])
#     upcoming_payment=[]
#     for students in existing_payment_details:
#         if 374 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 374:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':701})
#                 elif payment_details['plan'] == 382:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':702})
#                 elif payment_details['plan'] == 384:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':703})
#                 elif payment_details['plan'] == 386:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':704})
#         if 373 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 373:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':705})
#                 elif payment_details['plan'] == 381:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':706})
#                 elif payment_details['plan'] == 383:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':707})
#                 elif payment_details['plan'] == 385:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':708})
#         if 372 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 372:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':694})
#                 elif payment_details['plan'] == 382:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':695})
#                 elif payment_details['plan'] == 384:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':696})
#                 elif payment_details['plan'] == 386:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':697})
#         if 372 in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 381:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':698})
#                 elif payment_details['plan'] == 383:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':699})
#                 elif payment_details['plan'] == 385:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':700})
#         if [374,373,372] not in existing_payment_details[students]['plans']:
#             for payment_details in existing_payment_details[students]['payment_details']:
#                 if payment_details['plan'] == 381:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':698})
#                 elif payment_details['plan'] == 383:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':699})
#                 elif payment_details['plan'] == 385:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':700})
#                 elif payment_details['plan'] == 372:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':694})
#                 elif payment_details['plan'] == 382:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':695})
#                 elif payment_details['plan'] == 384:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':696})
#                 elif payment_details['plan'] == 386:
#                     upcoming_payment.append({'payment_id':payment_details['id'],'changed_plan':697})
#     for payment in upcoming_payment:
#         FeeplanStudentFeature.objects.filter(id=payment['payment_id']).update(fee_plan_id=payment['changed_plan'])
#     return True

def _get_size(image_stream):
    image_stream.seek(0, 2)  # Move to the end of the BytesIO object
    size = image_stream.tell()
    image_stream.seek(0)  # Reset the stream position to the beginning
    return size

def sync_for_barcode_number(self, params):
    user_details = User.objects.all()
    Code128 = barcode.get_barcode_class('code128')
    UploadTypeService.set_bucket_folder_path('id_card')
    for user in user_details:
        if not user.barcode_number:
            counter_value = '{0:05}'.format(int(user.id))
            user.barcode_number = 'JJ'+counter_value
            user.save()
        if not user.barcode_url:
            code128 = Code128(user.barcode_number, writer=ImageWriter())
            image_stream = BytesIO()
            code128.write(image_stream)

            # Move to the beginning of the BytesIO object
            image_stream.seek(0)

            barcode_file = InMemoryUploadedFile(
                file=image_stream,  # File-like object
                field_name=None,    # No specific field name
                name='barcode'+str(user.barcode_number)+'.png',      # Filename
                content_type='image/png',  # Content type
                size=_get_size(image_stream),  # Size in bytes
                charset=None        # No specific charset
            )
            s3_upload_response = UploadTypeService.upload_file(self, {'file': barcode_file}, path='temp')
            user.barcode_url = s3_upload_response['data']['file']
            user.save()
    return {'Reason': f'Data Synced'}

def sync_teachers_for_diary(self, params):
    existing_diary = Diary.objects.filter(is_active=True).values('id')
    staff_diary_data = StaffDiary.objects.all().values()
    staff_diary_mapping = {}
    for staff_diary in staff_diary_data:
        if staff_diary['staff_id'] not in staff_diary_mapping:
            staff_diary_mapping[staff_diary['staff_id']] = []
        staff_diary_mapping[staff_diary['staff_id']].append(staff_diary['diary_id'])
    user_ids = FormdefinitionService.get_formdefintion_data(self, 'diary_form', 'assign_teachers')
    user_ids = str(user_ids).split(',') if user_ids else []
    staff_data = []
    data_to_save = []
    if user_ids:
        staff_data = User.objects.filter(id__in=user_ids, staff__isnull=False).values('staff')
    for staff in staff_data:
        for diary in existing_diary:
            save_data = True
            if staff['staff'] in staff_diary_mapping and diary['id'] in staff_diary_mapping[staff['staff']]:
                save_data = False
            if save_data:
                data_to_save.append({
                    'view': 1, 'update': 1, 'evaluate': 1, 'staff': staff['staff'], 'diary': diary['id']
                })
    if data_to_save:
        serializer = StaffDiarySerializer(data=data_to_save, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

def remove_duplicate_standard_section_mapping(self, params):
    enrollment_data = Enrollment.objects.all().values('student','standard_section', 'id')
    enrollment_mapping = {}
    for enrollment in enrollment_data:
        if enrollment['student'] not in enrollment_mapping:
            enrollment_mapping[enrollment['student']] = {}
        if enrollment['standard_section'] not in enrollment_mapping[enrollment['student']]:
            enrollment_mapping[enrollment['student']] = {enrollment['standard_section']: ''}
        else:
            Enrollment.objects.get(id=enrollment['id']).delete()
    return {'Reason': 'Data Deleted Successfully'}

def delete_student_from_enrollment_not_matching_standard(self, params):
    enrollment_data = Enrollment.objects.all().values('standard_section', 'student', 'standard_section__academic_year', 'standard_section__standard', 'id')
    student_standard_mapping = StudentStandardMapping.objects.all().values(
        'academic_year', 'standard', 'student'
    )
    student_standard_mapping_track = {}
    deletable_enrollment_data = []
    for student_standard in student_standard_mapping:
        if student_standard['student'] not in student_standard_mapping_track:
            student_standard_mapping_track[student_standard['student']] = {}
        if student_standard['academic_year'] not in student_standard_mapping_track[student_standard['student']]:
            student_standard_mapping_track[student_standard['student']][student_standard['academic_year']] = student_standard['standard']
    for enrollment in enrollment_data:
        if student_standard_mapping_track[enrollment['student']][enrollment['standard_section__academic_year']] != enrollment['standard_section__standard']:
            deletable_enrollment_data.append(enrollment['id'])
    if deletable_enrollment_data:
        Enrollment.objects.filter(id__in=deletable_enrollment_data).delete()
        return {'Reason': 'Deleted Succcessfully'}
    else:
        raise exceptions.ValidationError('Enrollment Data is Correct')
    
def temp_update_password():
    password_change_user_list = []
    user_data = User.objects.filter(student__isnull=False,last_login__isnull=True)
    for user_obj in user_data:
        user_obj.set_password(user_obj.username)
        user_obj.password_two=encrypt_password(user_obj.username)
        password_change_user_list.append(user_obj.id)
        user_obj.save()
    if password_change_user_list:
        expire_all_token_for_user(password_change_user_list, True)

def update_student_password_same_as_username(self, params): #should be careful for this function
    institute_obj = Institute.objects.all().first()
    date_format = "%Y-%m-%d"
    input_date = datetime.strptime('2024-07-14', date_format)
    today = datetime.today()
    SharedService.custom_thread(temp_update_password)

def temp_update_password_as_dob():
    password_change_user_list = []

    user_data = (
        User.objects
        .filter(
            student__isnull=False,
            student__dob__isnull=False,
            last_login__isnull=True
        )
        .select_related('student')
    )

    for user_obj in user_data:
        dob_password = user_obj.student.dob.strftime('%d%m%Y')

        user_obj.set_password(dob_password)
        user_obj.password_two = encrypt_password(dob_password)

        password_change_user_list.append(user_obj.id)
        user_obj.save()

    if password_change_user_list:
        expire_all_token_for_user(password_change_user_list, True)

def update_student_password_same_as_dob(self, params): #should be careful for this function
    SharedService.custom_thread(temp_update_password_as_dob)

def sync_username_same_as_mobile_number(self, params):
    # Retrieve relevant data in one go, joining User and Student tables
    student_data = list(
        Student.objects
        .filter(is_active=True, user_student__is_active=True)
        .select_related('user_student')
        .values('id', 'mobile_num', 'user_student__id', 'user_student__username')
    )

    # Get a set of existing usernames to check for duplicates
    existing_usernames = set(
        User.objects.filter(is_active=True).values_list('username', flat=True)
    )

    users_to_update = []
    data_to_update = []
    password_change_user_list = []

    for student in student_data:
        mobile_num_cleaned = student['mobile_num'].replace('+91', '')
        new_username = mobile_num_cleaned

        if new_username != student['user_student__username']:
            # Handle potential duplicates
            suffix = 1
            while new_username in existing_usernames and new_username != student['user_student__username']:
                new_username = f"{mobile_num_cleaned}_{suffix}"
                suffix += 1

            # Update the in-memory set to prevent conflicts later in the same loop
            if new_username not in existing_usernames:
                existing_usernames.add(new_username)

            user_obj = User(
                id=student['user_student__id'],
                username=new_username,
                password_two=encrypt_password(new_username)
            )
            user_obj.set_password(new_username) # Set the password
            users_to_update.append(user_obj)
            data_to_update.append({'username': new_username, 'password': new_username, 'old_username': student['user_student__username']})
            password_change_user_list.append(student['user_student__id'])

    # Perform all database updates in a single, atomic transaction
    with transaction.atomic(using=get_current_db_name()):
        if users_to_update:
            # Use Django's bulk_update for efficiency
            User.objects.bulk_update(users_to_update, ['username', 'password', 'password_two'])

    if password_change_user_list:
        expire_all_token_for_user(password_change_user_list, True)
    if data_to_update:
        update_username_password_bulk(self, {'data_list': data_to_update})

def copy_register_num_to_admission_num(self, params):
    student_data = Student.objects.all().values('id', 'current_reg_num')
    for student in student_data:
        if student['current_reg_num']:
            AdmissionForm.objects.filter(student_id=student['id']).update(
                admission_num=student['current_reg_num']
            )

def assign_current_academic_section_subj_to_student(self, params):
    #raise exceptions.ValidationError("Ask Backend to execute this code checking whehter subjewise subjects are allocated wantedly")
    today = datetime.today()
    academic_year = AcademicYear.get_academic_year_for_date(self, today)
    if not academic_year:
        raise exceptions.ValidationError('Academic is mandatory')
    academic_year = academic_year.id
    assign_subject_data = AssignSubject.objects.filter(standard_section__academic_year=academic_year).values()
    subject_to_student = SubjectStudent.objects.filter(academic_year=academic_year).values()
    enrollment_data = Enrollment.objects.filter(standard_section__academic_year=academic_year).values()
    standard_section_subject_mapping = {}
    student_subject_mapping = {}
    student_subject_data_to_save = []
    for assign_subject in assign_subject_data:
        if assign_subject['standard_section_id'] not in standard_section_subject_mapping:
            standard_section_subject_mapping[assign_subject['standard_section_id']] = []
        standard_section_subject_mapping[assign_subject['standard_section_id']].append(assign_subject['subject_id'])
    for stu_subj in subject_to_student:
        if stu_subj['student_id'] not in student_subject_mapping:
            student_subject_mapping[stu_subj['student_id']] = []
        student_subject_mapping[stu_subj['student_id']].append(stu_subj['subject_id'])
    for enrollment in enrollment_data:
        existing_student_subjects = student_subject_mapping[enrollment['student_id']] if enrollment['student_id'] in student_subject_mapping else []
        section_subjects = standard_section_subject_mapping[enrollment['standard_section_id']] if enrollment['standard_section_id'] in standard_section_subject_mapping else []
        subjects_to_add = set(section_subjects) - set(existing_student_subjects)
        for subject in subjects_to_add:
            student_subject_data_to_save.append({
                'academic_year': academic_year,
                'subject': subject,
                'student': enrollment['student_id']
            })
    if student_subject_data_to_save:
        ser = SubjectStudentSerializer(data=student_subject_data_to_save, many=True)
        ser.is_valid(raise_exception=True)
        ser.save()

def read_machine_attendance_and_update(self, params):
    process_unsynced_data(self)

def add_users_to_biometric_machine(self, params):
    add_user_data_to_machine(self)

def sync_feecategory_for_section_category_feeplan_mapping(self):
    payment_detail=PaymentDetail.objects.filter(category__isnull=True).values('id','category','fee_collection__student','fee_plan','fee_plan__standard_fee__academic_year','fee_plan__standard_fee__standard')
    fee_category_plan_data=FeeCategoryFeeStandardSectionMapping.objects.filter().values('fee_plan','fee_category','standard_section')
    fee_category_plan_dict={}
    for category in fee_category_plan_data:
        if category['fee_plan'] not in fee_category_plan_dict:
            fee_category_plan_dict[category['fee_plan']] = {category['standard_section']:{}}
        if category['standard_section'] not in fee_category_plan_dict[category['fee_plan']]:
            fee_category_plan_dict[category['fee_plan']][category['standard_section']]={}
        fee_category_plan_dict[category['fee_plan']][category['standard_section']]={'category':category['fee_category'],'standard_section':category['standard_section']}
    student_dict={}
    for payment in payment_detail:
        if payment['fee_collection__student'] not in student_dict:
            student_dict[payment['fee_collection__student']] = {payment['fee_plan']:{'academic_year':payment['fee_plan__standard_fee__academic_year'],
                                                                                       'standard':payment['fee_plan__standard_fee__standard']}}
            student_dict[payment['fee_collection__student']][payment['fee_plan']]['payment_id']=[]
        if payment['fee_plan'] not in student_dict[payment['fee_collection__student']]:
            student_dict[payment['fee_collection__student']][payment['fee_plan']] =  {'academic_year':payment['fee_plan__standard_fee__academic_year'],
                                                                                       'standard':payment['fee_plan__standard_fee__standard']}
            student_dict[payment['fee_collection__student']][payment['fee_plan']]['payment_id']=[]
        student_dict[payment['fee_collection__student']][payment['fee_plan']]['payment_id'].append(payment['id'])
    for student in student_dict:
        for fee_plan in student_dict[student]:
            enrol = Enrollment.objects.filter(student=student,standard_section__academic_year=student_dict[student][fee_plan]['academic_year'],
                                                         standard_section__standard=student_dict[student][fee_plan]['standard']).first()
            if enrol:
                standard_section_value = enrol.standard_section.id
                if fee_plan in fee_category_plan_dict and standard_section_value in fee_category_plan_dict[fee_plan]:
                    category = fee_category_plan_dict[fee_plan][standard_section_value]['category']
                    payment = PaymentDetail.objects.filter(id__in=student_dict[student][fee_plan]['payment_id']).update(category=category)

def sync_feecategory_based_on_reciptnum(self, params):
    payment_detail=PaymentDetail.objects.filter().values('id','category','receipt_num')
    for payment in payment_detail:
        if "Stlhs0" in payment['receipt_num'] or "Stlhs1" in payment['receipt_num']:
            PaymentDetail.objects.filter(id=payment['id']).update(category=1)
        elif "StlhsT" in payment['receipt_num']:
            PaymentDetail.objects.filter(id=payment['id']).update(category=2)
  
def sync_feecategory_based_on_feeplan_id(self, params):
    payment_detail=PaymentDetail.objects.filter().values('id','category','fee_collection__student','fee_plan','fee_plan__standard_fee__academic_year','fee_plan__standard_fee__standard')
    fee_category_plan_data=FeeCategoryFeeStandardSectionMapping.objects.filter().values('fee_plan','fee_category')
    fee_category_plan_dict={}
    for category in fee_category_plan_data:
        if category['fee_plan'] not in fee_category_plan_dict:
            fee_category_plan_dict[category['fee_plan']] = {}
        fee_category_plan_dict[category['fee_plan']]={'category':category['fee_category'],'fee_plan':category['fee_plan']}
    payment_dict={}
    for payment in payment_detail:
        if payment['fee_plan'] not in payment_dict:
            payment_dict[payment['fee_plan']]={'fee_plan':payment['fee_plan'],'payment_id':[]}
        payment_dict[payment['fee_plan']]['payment_id'].append(payment['id'])
    for fee_plan in payment_dict:
        payment_saved = PaymentDetail.objects.filter(id__in=payment_dict[fee_plan]['payment_id']).update(category=fee_category_plan_dict[fee_plan]['category'])

def sync_standard_based_on_course_period(self, params):
    student_standard = StudentStandardMapping.objects.filter(student_id=119).values('id','student','standard','academic_year','reg_num','standard__sequence')
    standard_details = Standard.objects.filter().values('id','name','sequence','course_period')
    standard_dict={}
    sequence_dict={}
    for standard in standard_details:
        if standard['id'] not in standard_dict:
            standard_dict[standard['id']]={}
        standard_dict[standard['id']]={
            'id':standard['id'],'name':standard['name'],'sequence':standard['sequence'],'course_period':standard['course_period']
        }
        if standard['sequence'] not in sequence_dict:
            sequence_dict[standard['sequence']]={}
        sequence_dict[standard['sequence']] = {
            'id':standard['id'],'name':standard['name'],'sequence':standard['sequence'],'course_period':standard['course_period']
        }
    duplicate_check_dict={}
    studentStandard=[]
    duplicate_student_academicyear={}
    for student in student_standard:
        duplicate_check_key=str(student['student'])+'_'+str(student['standard'])+'_'+str(student['academic_year'])
        duplicate_student_ay_key=str(student['student'])+'_'+str(student['academic_year'])
        if duplicate_check_key not in duplicate_check_dict:
            duplicate_check_dict[duplicate_check_key]={'key':duplicate_check_key}
        if duplicate_student_ay_key not in duplicate_student_academicyear:
            duplicate_student_academicyear[duplicate_student_ay_key]={'key':duplicate_student_ay_key}
    for student in student_standard:
        if standard_dict[student['standard']]['course_period']:
            for period in range(standard_dict[student['standard']]['course_period']):
                if not period:
                    continue
                else:
                    if student['standard__sequence']+period in sequence_dict:
                        duplicate_check_key1=str(student['student'])+'_'+str(sequence_dict[student['standard__sequence']+period]['id'])+'_'+str(int(student['academic_year'])+period)
                        duplicate_student_ay_key1=str(student['student'])+'_'+str(int(student['academic_year'])+period)
                        if duplicate_check_key1 not in duplicate_check_dict and duplicate_student_ay_key1 not in duplicate_student_academicyear:
                            temp_standard_detail = {
                                'reg_num':student['reg_num'],'academic_year':int(student['academic_year'])+period,
                                'standard':sequence_dict[student['standard__sequence']+period]['id'],'student':student['student'],'is_new_student':0
                            }
                            duplicate_check_dict[duplicate_check_key1]={'key':duplicate_check_key1}
                            duplicate_student_academicyear[duplicate_student_ay_key1]={'key':duplicate_student_ay_key1}
                            studentStandard.append(temp_standard_detail)
        else:
            continue
    student_standard = StudentStandardMappingSerializer(data=studentStandard,many=True)
    student_standard.is_valid(raise_exception=True)
    student_standard.save()

def snyc_update_address_to_bengaluru(self, params):
    variants = ["BANGALORE", "Bangalore", "B'LORE", "Bengalore", "B'lore", "Banglore","BLORE","B'LR","banglore", "BANGALURU", "bangaluru", "BANGLORE"]
    entries = StudentAddress.objects.all()
    for entry in entries:
        address = entry.address
        if address:
            if any(variant in address for variant in variants):
                for variant in variants:
                    address = address.replace(variant, "Bengaluru")

                entry.address = address
                entry.save()

def sync_non_mandatory_fee_type_to_features_table(self):
    institute_obj = Institute.objects.all().first()
    if institute_obj.code == 'slvvidyanikethan':
        fee_payment_detail = PaymentDetail.objects.filter(fee_plan__standard_fee__fee_type=7,fee_plan__standard_fee__academic_year=1,fee_plan__standard_fee__is_mandatory=0).values('fee_plan_id','fee_collection__student_id')
        features_for_duplicate_check = FeeplanStudentFeature.objects.filter(fee_plan__standard_fee__fee_type=7,fee_plan__standard_fee__academic_year=1,fee_plan__standard_fee__is_mandatory=0).values('fee_plan_id','student_id')
        features_duplicated_check_dict ={}
        for features in features_for_duplicate_check:
            key=str(features['fee_plan_id'])+'_'+str(features['student_id'])
            features_duplicated_check_dict[key]={'fee_plan_id':features['fee_plan_id'],'student_id':features['student_id']}
        with transaction.atomic(using=get_current_db_name()):
            for payment in fee_payment_detail:
                key1= str(payment['fee_plan_id'])+'_'+str(payment['fee_collection__student_id'])
                if key1 not in features_duplicated_check_dict:
                    add_feature = FeeplanStudentFeature.objects.create(amount=0,fee_plan_id = payment['fee_plan_id'],student_id=payment['fee_collection__student_id'],is_active=1)
                    add_feature.save()
                    features_duplicated_check_dict[key1]={'fee_plan_id':payment['fee_plan_id'],'student_id':payment['fee_collection__student_id']}

def sync_convert_muliple_fee_plan_to_one(self):
    import copy
    from django.db.models import Sum
    queryset = FeeCollection.objects.filter(
        payment_detail__fee_plan__standard_fee__academic_year=2,
        # payment_detail__fee_plan__standard_fee__standard=18,
        payment_detail__fee_plan__terms__in=['Term2', 'Term3', 'Term4']
    ).distinct()
    ser = GetFeeCollectionSerializer(queryset, many=True)
    
    fee_collection_mapping = {}
    fee_collection_ids = []
    fee_payment_detail_data_to_update = []
    new_fee_plan_data = []
    deleteable_ids = []
    for fee_collection in ser.data:
        print(fee_collection['payment_detail'], 'fee collection')
        updatable_data = {}
        for payment_detail in fee_collection['payment_detail']:#find term1
            if payment_detail['fee_payment_terms'] == 'Term1':
                updatable_data = copy.deepcopy(payment_detail) 
        for payment_detail in fee_collection['payment_detail']:
            if updatable_data and payment_detail['fee_payment_terms'] != 'Term1':
                updatable_data['amount_paid'] += payment_detail['amount_paid']
                deleteable_ids.append(payment_detail['id'])
        if not updatable_data:
            new_fee_plan_data.append(fee_collection)
        else:
            updatable_data['fee_plan_id'] = updatable_data['fee_plan']
            fee_payment_detail_data_to_update.append(updatable_data)
    for new_fee_plan in new_fee_plan_data:
        updatable_data = {}
        for index, payment_detail in enumerate(new_fee_plan['payment_detail']):
            if index == 0:
                updatable_data = copy.deepcopy(payment_detail)
                standard_fee_id = FeePlan.objects.get(id=payment_detail['fee_plan']).standard_fee_id
                fee_plan_id = FeePlan.objects.get(standard_fee_id=standard_fee_id, terms='Term1').id
                updatable_data['fee_plan_id'] = fee_plan_id #changing the fee plan
            else:
                updatable_data['amount_paid'] += payment_detail['amount_paid']
                deleteable_ids.append(payment_detail['id'])
        fee_payment_detail_data_to_update.append(updatable_data)
    for payment_detail in fee_payment_detail_data_to_update:
        print(payment_detail['fee_plan_id'], 'fee plan id')
        PaymentDetail.objects.filter(id=payment_detail['id']).update(
            amount_paid=payment_detail['amount_paid'],
            fee_plan_id=payment_detail['fee_plan_id']
        )
    print(deleteable_ids, 'deleteable ids ')
    PaymentDetail.objects.filter(id__in=deleteable_ids).delete()
    for fee_plan in FeePlan.objects.filter(standard_fee__academic_year=2, terms='Term1'):
        merged_fee_data = (
            FeePlan.objects
            .filter(terms__in=['Term2', 'Term3', 'Term4'])
            .values('standard_fee')  # Group by standard_fee
            .annotate(total_rate=Sum('rate'))
        )
    for data in merged_fee_data:
        FeePlan.objects.filter(
            standard_fee_id=data['standard_fee'], 
            terms='Term1',
            standard_fee__academic_year=2
        ).update(
            rate=F('rate') + data['total_rate']
        )

    FeePlan.objects.filter(
        standard_fee__academic_year=2,
        terms__in=['Term2', 'Term3', 'Term4']
    ).delete()
    return {
        'fee_plan_data_to_update': fee_payment_detail_data_to_update, 
        'new_fee_plan_data': new_fee_plan_data, 
        'deleteable_ids': deleteable_ids
    }


    # calculated = calculations.fee_calculation_bulk_students(self, temp_academic_year, {
    #     'standard_ids': [18],
    #     'academic_year': 1,
    #     'is_active': 1,
    #     'standard_ids': [18],
    #     'fee_type_ids': [6],
    #     'fee_term_names': 'Term1,Term2,Term3,Term4',
    #     'term_wise_download': 1
    # })
    # for fee_data in calculated:
        
    # return calculated
    # return response


def sync_update_default_permission_to_student(self, params):
    from django.contrib.auth.models import Group, Permission

    perm_codes = [
        "app_logout_student_add",
        "app_chat_list_view",
        "app_chat_view",
        "app_search_chat_view",
        "app_can_group_chat_add",
        "app_can_delete_chat_delete",
        "app_route_plan_view",
        "app_driver_ridedetail_view",
        "app_diary_list_view",
        "app_student_diary_view",
        "app_view_tutorial_view",
        "app_timetable_view",
        "app_attendance_profile_view",
        "app_holiday_list_view",
        "app_event_list_view",
        "app_student_fees_list_view",
        "app_student_fee_pay_add",
        "app_fee_payment_summary_view",
        "app_student_fees_info_list_view",
        "app_student_fee_details_view",
        "app_exam_schedule_list_student_view",
        "app_schedule_exam_app_view",
        "app_student_mark_view",
        "app_student_mark_detail_view",
        "app_download_hallticket_view",
        "app_switch_account_add",
        "app_profile_setting_view",
    ]

    # just fetch the student group (raise error if missing)
    student_group = Group.objects.get(name="student")

    permissions = Permission.objects.filter(
        codename__in=perm_codes,
        content_type__app_label="app_screen_name"
    )

    # add only missing permissions
    for perm in permissions:
        if not student_group.permissions.filter(id=perm.id).exists():
            student_group.permissions.add(perm)

def sync_update_txn_id_to_payment_ref_num(self, params):
    """
    Sync function to fetch bank_ref_id from OnlinePayment gateway_response 
    and update FeeCollection payment_ref_num and FeeCollectionModeOfPayment payment_ref_num
    """
    count = 0
    mode_of_payment_count = 0
    # Get all OnlinePayment records that have gateway_response with bank_ref_id
    online_payments = OnlinePayment.objects.filter(
        gateway_response__isnull=False,
        entity_name='FC'
    ).exclude(gateway_response={})
    
    for online_payment in online_payments:
        try:
            gateway_response = online_payment.gateway_response
            if isinstance(gateway_response, dict) and 'bank_ref_id' in gateway_response:
                bank_ref_id = gateway_response.get('bank_ref_id')
                # Only update if bank_ref_id exists and is not 'NA'
                if bank_ref_id and bank_ref_id != 'NA':
                    # Get the related FeeCollection via OneToOne relationship
                    try:
                        fee_collection = FeeCollection.objects.get(online_payment=online_payment)
                        # Update FeeCollection.payment_ref_num if it's empty
                        if not fee_collection.payment_ref_num:
                            fee_collection.payment_ref_num = bank_ref_id
                            fee_collection.save()
                            count += 1
                        
                        # Update FeeCollectionModeOfPayment.payment_ref_num for Online mode of payment
                        updated_rows = FeeCollectionModeOfPayment.objects.filter(
                            fee_collection=fee_collection,
                            mode_of_payment='Online'
                        ).exclude(payment_ref_num=bank_ref_id).update(payment_ref_num=bank_ref_id)
                        
                        if updated_rows > 0:
                            mode_of_payment_count += updated_rows
                    except FeeCollection.DoesNotExist:
                        # FeeCollection doesn't exist for this OnlinePayment, skip
                        continue
        except Exception as e:
            # Continue processing other records if one fails
            continue
    
    return {'Reason': f'Data Synced. Updated {count} FeeCollection records and {mode_of_payment_count} FeeCollectionModeOfPayment records with bank_ref_id'}


def sync_finance_dashboard_cache(self, params):
    """
    Sync function to recalculate and update finance dashboard cache for all academic years and standards.
    Ensures all cache entries are up to date and nothing is missing.
    Forces recalculation to ensure data is accurate.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    overall_count = 0
    standard_count = 0
    error_count = 0
    
    try:
        # Get all active academic years
        academic_years = AcademicYear.objects.filter(is_active=True).order_by('-id')
        logger.info(f"Starting finance dashboard cache sync for {academic_years.count()} academic years")
        
        for academic_year in academic_years:
            try:
                logger.info(f"Syncing cache for academic year {academic_year.id} ({academic_year.year_name})")
                # Calculate overall cache (no standard, no student) - FORCE RECALCULATION
                cache = calculate_dashboard_cache(academic_year.id, standard_id=None, student_id=None, force_recalculate=True)
                overall_count += 1
                logger.info(f"  Overall cache updated: total_fee={cache.total_fee_amount}, total_collected={cache.total_collected}, total_pending={cache.total_pending}")
                
                # Get all standards that have students enrolled in this academic year
                standards = Standard.objects.filter(
                    student_standard__academic_year_id=academic_year.id,
                    student_standard__student__is_active=True
                ).distinct().order_by('sequence')
                
                # Calculate cache for each standard
                for standard in standards:
                    try:
                        logger.info(f"  Syncing cache for standard {standard.id} ({standard.name})")
                        cache = calculate_dashboard_cache(academic_year.id, standard_id=standard.id, student_id=None, force_recalculate=True)
                        standard_count += 1
                        logger.info(f"    Standard cache updated: total_fee={cache.total_fee_amount}, total_collected={cache.total_collected}, total_pending={cache.total_pending}")
                    except Exception as e:
                        error_count += 1
                        logger.error(f"    Error syncing standard {standard.id}: {str(e)}", exc_info=True)
                        # Continue processing other standards even if one fails
                        continue
                        
            except Exception as e:
                error_count += 1
                logger.error(f"Error syncing academic year {academic_year.id}: {str(e)}", exc_info=True)
                # Continue processing other academic years even if one fails
                continue
        
        message = f'Finance Dashboard Cache Synced Successfully. '
        message += f'Overall cache entries: {overall_count}, '
        message += f'Standard-wise cache entries: {standard_count}'
        if error_count > 0:
            message += f', Errors encountered: {error_count}'
        
        logger.info(message)
        return {'Reason': message}
        
    except Exception as e:
        logger.error(f'Error syncing finance dashboard cache: {str(e)}', exc_info=True)
        return {'Reason': f'Error syncing finance dashboard cache: {str(e)}'}