import json
import ast
from datetime import datetime, timedelta
from django.core.serializers.json import DjangoJSONEncoder
from django.conf import settings
from dateutil import parser as date_parser
from datetime import date
from django.db import transaction

from rest_framework import exceptions
from apps.classes.serializers import MachineUserMappingReadSerializer, MachineUserMappingSerializer, MachineAttendanceSerializer
from apps.institutes.models.institute import Institute, ServiceTagList
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.enrollment import StudentStandardMapping,Enrollment
from apps.institutes.models.sibling_institute import SwitchableInstitute
from apps.notification.services.notification_service import send_email
from apps.classes.models.attendance import MachineAttendanceFailedToSaveData, MachineAttendanceLog, MachineUserLog, MachineUserMapping, MachineAttendance
from apps.classes.services.attendance import add_user_attendance_machine,is_machine_attendance_exist, get_student_attendance_status,send_notification_for_machine
from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService
from apps.shared.services_shared.common import get_full_name
from apps.shared.utils import http_request
from apps.staffs.services.staff import get_staff_list
from apps.tenants.services.middlewares import get_current_db_name, set_db_for_router
from apps.users.models.user import User
from apps.students.services.student import add_user_to_cams_server,get_student_admission_form
from apps.bdu.services.write_to_excel import write_to_excel_multiple_tabs

EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)

def user_added_to_machine(self, data, user_id, machine_user_id, username):
    for_date = date_parser.parse(data['RealTime']['UserUpdated']['OperationTime']).date()
    operation_id = data['RealTime']['OperationID']
    temp = {
        'for_date': for_date,
        'operation': operation_id,
        'json': json.loads(json.dumps(data, cls=DjangoJSONEncoder)),
        'machine_user_id': data['RealTime']['UserUpdated']['UserID']
    }
    try:
        machin_usr_map = MachineUserMapping.objects.get(machine_user_id=machine_user_id, is_active=True)
        machin_usr_map.username_in_machine = username
        machin_usr_map.is_user_updated_to_machine = True
    except:
        pass
    MachineAttendanceLog.objects.create(
        **temp
    )
    if not MachineUserLog.objects.filter(operation_id=operation_id):
        data_to_save = {
            'machine_user_id': machine_user_id,
            'template': data['RealTime']['UserUpdated']['Template'],
            'user_id': user_id,
            'operation_id': operation_id
        }
        MachineUserLog.objects.create(**data_to_save)

def find_machine_id_in_sibling(self, machine_user_id):
    machine_user_mapping = MachineUserMapping.get_user_for_machine(self, [machine_user_id])
    if not machine_user_mapping:
        switchable_companies = SwitchableInstitute.objects.filter(is_active=True).values()
        machine_user_mapping = {}
        for switchable in switchable_companies:
            machine_user_data = MachineUserMapping.objects.using(switchable['database_name']).filter(
                machine_user_id=machine_user_id, is_active=True
            ).first()
            if machine_user_data:
                machine_user_mapping[machine_user_id] = machine_user_data
                set_db_for_router(switchable['database_name'])
            break
    return machine_user_mapping

#is_return_to_local - 1 when data processed locally
#when calling in list please be careful on finding machine id sibling

def handle_machine_data(self, data, is_return_to_local=False, is_send_notification=True):
    is_data_processed = False
    try:
        if 'RealTime' in data and 'PunchLog' in data['RealTime']:
            machine_user_id = int(data['RealTime']['PunchLog']['UserId'])
            machine_user_mapping= find_machine_id_in_sibling(self, machine_user_id)
            if machine_user_id not in machine_user_mapping:
                add_machine_failure_log(self, {
                    'data': data, 'failed_data': F'machine user id : {machine_user_id} not found'
                })
            else:
                user_id = machine_user_mapping[machine_user_id].user.id
                add_user_attendance_machine(self, data, user_id, is_send_notification)
                is_data_processed = True
        elif 'RealTime' in data and 'UserUpdated' in data['RealTime']:
            machine_user_id = int(data['RealTime']['UserUpdated']['UserID'])
            user_name = data['RealTime']['UserUpdated']['FirstName'] + ' ' + data['RealTime']['UserUpdated']['LastName']
            machine_user_mapping= find_machine_id_in_sibling(self, machine_user_id)
            if machine_user_id not in machine_user_mapping:
                add_machine_failure_log(self, {
                    'data': data, 'failed_data':  F'machine user mapping id : {machine_user_id} not found'
                })
            else:
                user_id = machine_user_mapping[machine_user_id].user.id
                user_added_to_machine(self, data, user_id, machine_user_id, user_name)
                is_data_processed = True
        else:
            raise exceptions.ValidationError('Unknown type data recieved')
    except Exception as e:
        add_machine_failure_log(self, {
            'data': data, 'failed_data': str(e.args)[:999]
        })
    if is_return_to_local:
        return {'is_data_processed': is_data_processed}
    return {'status': 'done'}

def add_machine_failure_log(self, data):
    machine_user_id = None
    try:
        operation_id = data['data']['RealTime']['OperationID']
    except:
        operation_id = None
    try: #try to catch machine userid
        if 'RealTime' in data['data'] and 'UserUpdated' in data['data']['RealTime']:
            machine_user_id = int(data['data']['RealTime']['UserUpdated']['UserId'])
        elif 'RealTime' in data['data'] and 'PunchLog' in data['data']['RealTime']:
            machine_user_id = int(data['data']['RealTime']['PunchLog']['UserId'])
    except Exception as e:
        pass
    operation_obj = MachineAttendanceFailedToSaveData.objects.filter(operation_id=operation_id).first()
    if operation_obj:
        operation_obj.failed_data=data['failed_data']
        operation_obj.save()
    else:
        data_to_save = MachineAttendanceFailedToSaveData.objects.create(
            json=json.loads(json.dumps(data['data'], cls=DjangoJSONEncoder)),
            failed_data = data['failed_data'], machine_user_id=machine_user_id,
            operation_id = operation_id
        )
        institute = Institute.objects.filter().first()
        message = f'{institute.name} ({institute.code})- Attendance for the machine is failed. Failure Id - {data_to_save.id}'
        emails = ['prashanthedubricz@gmail.com', EMAIL_HOST_USER]
        SharedService.custom_thread(
                    send_email, emails, message, data['failed_data']
                )

def machine_user_mapping_add_or_update(self, data):
    data_to_save = []
    machine_data = MachineUserMapping.objects.filter(is_active=True)
    machine_user_data_map = {}
    machine_map_id_usermap = {}
    user_ids = []
    institute = Institute.objects.filter().first()
    for machine_row in machine_data:
        machine_user_data_map[machine_row.machine_user_id] = machine_row
        machine_map_id_usermap[machine_row.id] = machine_row
    for row_data in data:
        if 'id' in row_data and row_data['id']:
            if machine_map_id_usermap[row_data['id']].is_user_updated_to_machine and row_data['machine_user_id'] != machine_map_id_usermap[row_data['id']].machine_user_id:
                raise exceptions.ValidationError('machine_user_id is already update to the machine')
            temp = {
                    'id': row_data['id'],
                    'user_id': row_data['user_id'],
                    'first_name': row_data['first_name'],
                    'last_name': row_data['last_name']
            }
            if 'machine_user_id' in row_data and row_data['machine_user_id']:
                temp['machine_user_id'] = row_data['machine_user_id']
            data_to_save.append(
                temp
            )
        else:
            if institute.code == 'svvk':
                row_data['machine_user_id'] = int(row_data['machine_user_id']) + 5000
            if row_data['machine_user_id'] in machine_user_data_map:
                raise exceptions.ValidationError('user id already exist')
            data_to_save.append(
                {
                    'user_id': row_data['user_id'],
                    'first_name': row_data['first_name'],
                    'last_name': row_data['last_name'],
                    'machine_user_id': row_data['machine_user_id']
                }
            )
        user_ids.append(row_data['user_id'])
    user_data = {u.id: u for u in User.objects.filter(
        id__in=user_ids
    )}
    with transaction.atomic(using=get_current_db_name()):
        data_to_add_to_machine = []
        for row_data in data_to_save:
            username = ''
            if row_data['user_id'] in user_data:
                if user_data[row_data['user_id']].staff:
                    username = get_full_name(
                        user_data[row_data['user_id']].staff.first_name,
                        user_data[row_data['user_id']].staff.middle_name,
                        user_data[row_data['user_id']].staff.last_name
                    )
                elif user_data[row_data['user_id']].student:
                    username = get_full_name(
                        user_data[row_data['user_id']].student.first_name,
                        user_data[row_data['user_id']].student.middle_name,
                        user_data[row_data['user_id']].student.last_name
                    )
            row_data['username_in_machine'] = username
            if 'id' in row_data and row_data['id']:
                instance = MachineUserMapping.objects.get(id=row_data['id'])
                serializer = MachineUserMappingSerializer(instance=instance, data=row_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = MachineUserMappingSerializer(data=row_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            data_to_add_to_machine.append(serializer.data)
        if data_to_add_to_machine:
            SharedService.custom_thread(
                add_user_list_to_cams_server, self, data_to_add_to_machine
            )
    return {'Reason': 'Data Saved Successfully'}

def add_user_list_to_cams_server(self, data_list):
    # service_tag_list = ServiceTagList.objects.filter(is_active=True, device_for=1).values()

    saved_machine_user_mapping_ids = []
    for row_data in data_list:
        row_data['full_name'] = row_data['user_details']['full_name']
        response = add_user_to_cams_server(row_data)
        if 'id' in row_data and response['is_saved']:
            saved_machine_user_mapping_ids.append(
                row_data['id']
            )
    return {"Reason": 'Data Added', 'saved_machine_user_mapping_ids': saved_machine_user_mapping_ids}

def add_staff_user_to_cams_server(self, data, service_tag_list):
    today = date.today()
    time = today.strftime("%Y-%m-%d %H:%M:%S")
    is_saved = True
    payload =  {
        "Add": {
            "User": {
                "UserID": str(data['machine_user_id']),
                "FirstName": data['username_in_machine'],
                "LastName": '',
                "UserType": "User"
            },
        },
        "OperationID": SharedService.generate_random_number(),
        "Time": time + ' ' + 'GMT +0530'
    }
    try:
        for service_tag in service_tag_list:
            if not service_tag['token']:
                raise exceptions.ValidationError('token is expired')
        for service_tag in service_tag_list:
            payload['AuthToken'] = service_tag['token']
            url = 'https://robot.camsunit.com/external/api3.0/biometric?stgid='+service_tag['serivce_tag_id']
            response = http_request('POST', url , payload=json.dumps(payload), params=None)
            parsed_data = json.loads(response.content)
            if parsed_data['Status'] != 'done':
                raise exceptions.ValidationError(f'Error from server {parsed_data}')
    except Exception as e:
        is_saved = False
        add_machine_failure_log(self, {
            'data': payload, 'failed_data': F'{e.args[:700]} failed in adding user to cam machine in add_staff_user_to_cams_server function'
        })
    return {'Reason': 'Data Saved Successfully', 'is_saved': is_saved}

def get_machine_user_mapping_data(self):
    if self.request.GET.get('show_only_staff'):
        response = get_staff_list(self, True, {'show_only_important_data': True})
        user_ids = []
        for row_data in response['data']:
            user_ids.append(row_data['user_id'])
        queryset = MachineUserMapping.objects.filter(
            user__in=user_ids
        )
        serializer = MachineUserMappingReadSerializer(queryset, many=True)
        machine_data = {ser['user'] : ser for ser in serializer.data}
        data_list = []
        for row_data in response['data']:
            if row_data['user_id'] not in machine_data:
                data_list.append(row_data)
        response['data'] = data_list
    else:
        raise exceptions.ValidationError('Unhandled type using show_only_staff to see staff data')
    return response

def process_failed_data(self, data):
    filter_query = {'is_data_processed': False}
    machine_data = MachineAttendanceFailedToSaveData.objects.filter(**filter_query).values()
    processed_data_ids = []
    not_processed_data_ids = []
    for row_data in machine_data:
        json_data =  ast.literal_eval(row_data['json'])
        if not row_data['is_data_processed']:
            response = handle_machine_data(self, json_data, True, False)
            if not response['is_data_processed']:
                not_processed_data_ids.append(row_data['id'])
            else:
                processed_data_ids.append(row_data['id'])
    MachineAttendanceFailedToSaveData.objects.filter(
        id__in=processed_data_ids
    ).update(is_data_processed=True)
    message = 'Data Success'
    if not_processed_data_ids:
        message = 'Few Data is not processed' + ','.join(str(x) for x in not_processed_data_ids)
    return {'Reason': f'{message}'}

# sync attendance whoever machine attendance is not synced
def process_unsynced_data(self):
    machine_data = MachineAttendanceLog.objects.all().values()
    for row_data in machine_data:
        json_data =  ast.literal_eval(row_data['json'])
        handle_machine_data(self, json_data, True, False)
    return {'Reason': 'Data Processing Started'}

def add_user_data_to_machine(self):
    machine_queryset = MachineUserMapping.objects.filter(is_active=True, is_user_updated_to_machine=False)
    machine_data = MachineUserMappingReadSerializer(machine_queryset, many=True).data
    if machine_data:
        for row_data in machine_data:
            rfid = None
            if row_data['user_details']['student']:
                name = row_data['user_details']['student']['full_name']
                rfid = row_data['user_details']['student']['rfid']
            elif row_data['user_details']['staff']:
                name = row_data['user_details']['staff']['full_name']
            else:
                continue
            temp = {
                'user': row_data.get('user'),
                'full_name': name,
                'rfid': rfid
            }
            response = add_user_to_cams_server(temp)
            if response and 'saved_machine_user_mapping_ids' in response:
                if response['saved_machine_user_mapping_ids']:
                    MachineUserMapping.objects.filter(
                        id__in=response['saved_machine_user_mapping_ids']
                    ).update(is_user_updated_to_machine=True)
            else:
                raise exceptions.ValidationError(f'Unexpected response format: {response}')
        return response

    raise exceptions.ValidationError('No data to save')

def student_rfid_attendance_add(self,data):
    #handling for student
    status={}
    for_date = datetime.strptime(data['for_date'], '%Y-%m-%d').date()
    student_id_list = data['student_id']
    try:
        academic_year = AcademicYear.get_academic_year_for_date(self, for_date).id
    except:
        raise exceptions.ValidationError('Invalid academic year')
    if data['status'] == 'present':
        in_time = data['in_time']
        if data['out_time']:
            out_time = data['out_time']
            status = get_student_attendance_status(self, student_id_list, academic_year, for_date,in_time, out_time)
        else:
            out_time=None
            status='checkinmarked'
    elif data['status'] == 'absent':
        in_time = None
        out_time = None
    for student_id in student_id_list:
        if data['status'] == 'absent':
            status[student_id]=data['status']
        is_machine_data_exist, existing_machine_data = is_machine_attendance_exist(self, student_id, for_date, academic_year)
        machine_data = {
                'student': student_id,
                'for_date': for_date,
                'in_time': in_time,
                'out_time': out_time,
                'academic_year': academic_year}
        machine_data['status']= status[student_id] if data['status']=='absent' or data['out_time'] else status
        if is_machine_data_exist:
            machine_data['id'] = existing_machine_data['id']
            instance = MachineAttendance.objects.get(id=machine_data['id'])
            serializer = MachineAttendanceSerializer(instance=instance, data=machine_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = MachineAttendanceSerializer(data=machine_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        SharedService.custom_thread(send_notification_for_machine, self, machine_data)
    return {'data':serializer.data}

def download_rfid_report(self,data,file_name,for_date):
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = []
    options['date'] = for_date
    options['extraWorksheetData'] = dict()
    options['columns']=[
        {
            'column': 'SI NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Name', 'required': False, 'schemacolumn': 'student_name'
        },
        {
            'column':'Standard', 'required':False, 'schemacolumn':'standard_name'
        },
        {
            'column':'Intime', 'required':False,'schemacolumn':'intime_modified'
        },
        {
            'column':'Outtime', 'required':False,'schemacolumn':'outtime_modified'
        },
        {
            'column':'Status', 'required':False,'schemacolumn':'status'
        }
    ]
    options['Data']=data
    return write_to_excel_multiple_tabs(self, options, {}, {})

def get_student_rfid_attendance(self, request):
    return_data=[]
    queryset = self.get_queryset()
    from_date = self.request.GET.get('from_date', None)
    to_date = self.request.GET.get('to_date', None)
    for_date = self.request.GET.get('for_date', None)
    standard_section = self.request.GET.get('standard_section')
    attendance_status = self.request.GET.get('attendance_status')
    if attendance_status:
        if attendance_status == 'Present':
            attendance_status = 'present'
        if attendance_status == 'Absent':
            attendance_status = 'absent'
        if attendance_status == 'Present':
            attendance_status = 'present'
        if attendance_status == 'Un Marked':
            attendance_status = 'unmarked'
    if standard_section:
        standard_section=standard_section.split(',')
    if not for_date:
        for_date=datetime.today().strftime('%Y-%m-%d')
    if self.request.GET.get('academic_year'):
        academic_year = self.request.GET.get('academic_year')
    else:
        academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today(), True).id
    filter_query={'academic_year_id':academic_year, 'student__is_active':True}
    if self.request.GET.get('standard_id'):
        standard_id = self.request.GET.get('standard_id').split(',')
        filter_query['standard_id__in']=standard_id
    if standard_section:
        student_ids = list(Enrollment.objects.filter(standard_section__in=standard_section).values_list('student_id', flat=True))
        filter_query['student_id__in'] = student_ids
    student_standard_mapping = StudentStandardMapping.objects.filter(**filter_query)
    student_standard_data={}
    return_data_standard_wise ={}
    for students in student_standard_mapping:
        if students.standard.id not in return_data_standard_wise:
            return_data_standard_wise[students.standard.id]={}
            return_data_standard_wise[students.standard.id]['student_list']={}
            return_data_standard_wise[students.standard.id]['standard_name']=students.standard.name
        if students.student.id not in return_data_standard_wise[students.standard.id]['student_list']:
            student_name = get_full_name(students.student.first_name, students.student.middle_name, students.student.last_name)
            return_data_standard_wise[students.standard.id]['student_list'][students.student.id]={
                'student':students.student.id,'student_name':student_name,'in_time':'','out_time':'','status':'','admission_num':'',
                'standard_name':students.standard.name,'intime_modified':'','outtime_modified':''
            }
        if students.student.id not in student_standard_data:
            student_standard_data[students.student.id]={'standard':students.standard.id,'standard_name':students.standard.name}
    students_admission_num=get_student_admission_form(self,student_standard_data.keys())
    for student_adm in students_admission_num:
        return_data_standard_wise[student_standard_data[student_adm]['standard']]['student_list'][student_adm]['admission_num']=students_admission_num[student_adm]
    if for_date:
        queryset = queryset.filter(for_date=for_date)
    if from_date and to_date:
        queryset = queryset.filter(for_date__range=(from_date, to_date))
    serializer = self.get_serializer(queryset, many=True)
    for data in serializer.data:
        if data['student'] in student_standard_data:
            if data['student'] in return_data_standard_wise[student_standard_data[data['student']]['standard']]['student_list']:
                data['admission_num'] = students_admission_num[data['student']]
                data['standard_name'] = student_standard_data[data['student']]['standard_name']
                data['intime_modified'] = datetime.fromisoformat(data['in_time']) if data['in_time'] else ''
                data['intime_modified'] = data['intime_modified'].strftime("%I:%M %p") if data['in_time'] else ''
                data['outtime_modified'] = datetime.fromisoformat(data['out_time']) if data['out_time'] else ''
                data['outtime_modified'] = data['outtime_modified'].strftime("%I:%M %p") if data['out_time'] else ''
                return_data_standard_wise[student_standard_data[data['student']]['standard']]['student_list'][data['student']]=data
    standard_id_list = return_data_standard_wise.keys()
    for standards in standard_id_list:
        return_data_standard_wise[standards]['student_list']=return_data_standard_wise[standards]['student_list'].values()
        return_data.extend(return_data_standard_wise[standards]['student_list'])
    response_data=[]
    if attendance_status:
        for student in return_data:
            if attendance_status in ['present'] and student['intime_modified']:
                response_data.append(student)
            if attendance_status in ['absent','unmarked'] and not student['intime_modified']:
                response_data.append(student)
    if self.request.GET.get('download_excel'):
        response = download_rfid_report(self,return_data_standard_wise,'rfid_report',for_date)
        return response
    if attendance_status:
        return_data = response_data
    if not self.request.GET.get('pageno'):
        return return_data
    else:
        response_data, count, next_page, previous_page = SharedService.custom_pagination(self, return_data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': response_data}}