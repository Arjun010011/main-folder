from datetime import datetime, timedelta
from apps.hr.models import Day
from apps.students.models import Student
from apps.general.models import HolidayCalender
from rest_framework.exceptions import ValidationError
from rest_framework import exceptions
from apps.classes.models.attendance import AttendanceBatch,BatchAttendance,AttendanceBatchStudentMapping
from apps.classes.serializers import AttendanceBatchSerializer, AttendanceBatchStudentMappingSerializer, AttendanceBatchStandardSectionSubjectMappingSerializer
from apps.shared.services_shared.common import get_full_name
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name
from apps.classes.services.attendance import get_working_dates,attendance_notification
from apps.shared.services import SharedService,PDFService,NotificationBodyTemplate
from django.db.models import Count
from apps.institutes.models import Institute
from apps.users.models.user import User
from apps.notification.services.notification_service import send_notification
from apps.classes.models.enrollment import StudentStandardMapping,StandardSectionMapping,Enrollment
from apps.classes.models.subject import SubjectStudent


def add_attendancebatch(self,request_data):
    attendance_batch_data = AttendanceBatch.objects.all().values()
    batchcode_for_duplicate_check = {}
    batchname_for_duplicate_check = {}
    data_to_save = []
    for data in attendance_batch_data:
        if data['code'] not in batchcode_for_duplicate_check:
            if 'id' in request_data and request_data['id'] != data['id']:
                batchcode_for_duplicate_check[data['code']]={'code':data['code']}
        else:
            raise ValidationError(f'Duplicate Batch Exists1')
        if data['name'] not in batchname_for_duplicate_check:
            if 'id' in request_data and request_data['id'] != data['id']:
                batchname_for_duplicate_check[data['name']]={'name':data['name']}
        else:
            raise ValidationError(f'Duplicate Batch Exists2')
    if 'id' in request_data:
        if request_data['code'] not in batchcode_for_duplicate_check:
            batchcode_for_duplicate_check[request_data['code']]={'code':request_data['code']}
        else:
            raise ValidationError(f'Duplicate Batch Exists3')
        if request_data['name'] not in batchname_for_duplicate_check:
            batchname_for_duplicate_check[request_data['name']]={'name':request_data['name']}
        else:
            raise ValidationError(f'Duplicate Batch Exists4')
        temp_data = {
            'name':request_data['name'],
            'code':request_data['code'],
            'academic_year':request_data['academic_year']
        }
        instance = AttendanceBatch.objects.get(id=request_data['id'])
        serializer  = AttendanceBatchSerializer(instance=instance,data=temp_data,partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return {'Reason': 'Data updated Successfully!', 'data': serializer.data}      
    for data in request_data:
        if data['code'] not in batchcode_for_duplicate_check:
            batchcode_for_duplicate_check[data['code']]={'code':data['code']}
        else:
            raise ValidationError(f'Duplicate Batch Exists')
        if data['name'] not in batchname_for_duplicate_check:
            batchname_for_duplicate_check[data['name']]={'name':data['name']}
        else:
            raise ValidationError(f'Duplicate Batch Exists')
        temp_data = {
            'name':data['name'],
            'code':data['code'],
            'academic_year':data['academic_year']
        }
        data_to_save.append(temp_data)
    serializer = AttendanceBatchSerializer(data=data_to_save,many=True)
    serializer.is_valid()
    serializer.save()
    return {'Reason': 'Data updated Successfully!', 'data': serializer.data}

def add_attendance_batch_student(self,data):
    data_to_save = []
    for student in data['student_list']:
        temp_data = {
            'attendance_batch':data['attendance_batch'],
            'student':student
        }
        data_to_save.append(temp_data)
    serializer = AttendanceBatchStudentMappingSerializer(data=data_to_save,many=True)
    serializer.is_valid()
    serializer.save()
    return {'data':'Data Added Successfully'}

def validate_attendance_batch_standard_section_subject(self,data):
    if 'name' not in data or not data['name']:
        raise exceptions.ValidationError('Batch name is mandatory')
    if 'code' not in data or not data['code']:
        raise exceptions.ValidationError('Batch code is mandatory') 
    if 'academic_year' not in data or not data['academic_year']:
        raise exceptions.ValidationError('Academic Year is mandatory') 
    if 'standard_section_ids' not in data or not data['standard_section_ids']:
        raise exceptions.ValidationError('Standard Section is mandatory') 
    if 'student_ids' not in data or not data['student_ids']:
        raise exceptions.ValidationError('There is no student to map for the batch') 
    if AttendanceBatch.objects.filter(name=data['name'],code=data['name']) and not 'id' in data and not data['id']:
        raise exceptions.ValidationError('Duplicate Batch found')

def add_attendance_batch_student_standard_section_subject_wise(self,data):
    validate_attendance_batch_standard_section_subject(self,data)
    batch_dict = {}
    standard_section_batch_dict = {}
    student_batch_dict ={}
    standard_section_batch_list=[]
    student_batch_list=[]
    student_list=[]
    attendance_batch_obj=None
    standard_section_subject_list = []
    if data['name']:
        batch_dict['name'] = data['name']
    if data['code']:
        batch_dict['code'] = data['code']
    if data['academic_year']:
        batch_dict['academic_year'] = data['academic_year']
    standard_section_mapping=StandardSectionMapping.objects.filter(academic_year=data['academic_year']).values_list('id',flat=True)
    invalid_ids = set(data['standard_section_ids']) - set(standard_section_mapping)    
    if invalid_ids:
        raise exceptions.ValidationError('Standard section is not in the given academic year') 
    standard_ids = StandardSectionMapping.objects.filter(id__in=data['standard_section_ids']).values_list('standard_id',flat=True)
    student_standard_mapping = StudentStandardMapping.objects.filter(standard__in = standard_ids,academic_year = data['academic_year']).values_list('student_id',flat=True)
    enrollment_data = Enrollment.objects.filter(standard_section__in = data['standard_section_ids']).values_list('student_id',flat=True)
    if 'subject_ids' in data and data['subject_ids']:
        assign_subject = SubjectStudent.objects.filter(student__in=enrollment_data,subject__in=data['subject_ids'],academic_year = data['academic_year']).values_list('student_id',flat=True)
    for student in data['student_ids']:
        if student not in student_standard_mapping:
            raise exceptions.ValidationError('Student is not in the given Standard')
        if student not in enrollment_data:
            raise exceptions.ValidationError('Student is not enrolled to the given section')
        if 'subject_ids' in data and data['subject_ids'] and student not in assign_subject:
            raise exceptions.ValidationError('Student is not mapped to the given subject')
    if 'id' in data and data['id']:
        attendance_batch_obj = AttendanceBatch.objects.filter(id=data['id']).first()
        attendance_batch_data = AttendanceBatchSerializer(attendance_batch_obj).data
        for standard_section in attendance_batch_data['attendance_standard_section']:
            if attendance_batch_data['batch_type'] == 'standard_section':
                standard_section_subject_list.append(standard_section['standard_section_id'])
            if attendance_batch_data['batch_type'] == 'subject':
                standard_section_subject_list.append(str(standard_section['standard_section_id'])+str(standard_section['subject_id']))
        if attendance_batch_data['batch_type'] == 'standard_section':
            for standard_section in data['standard_section_ids']:
                if standard_section['standard_section_id'] not in standard_section_subject_list:
                    standard_section_batch_dict={
                        'standard_section': standard_section['standard_section_id'],
                        'attendance_batch':data['id']
                    }
                    standard_section_batch_list.append(standard_section_batch_dict)
        if attendance_batch_data['batch_type'] == 'subject':
            for standard_section in data['standard_section_ids']:
                for subject in data['subject_ids']:
                    if 'subject_ids' in standard_section and standard_section['subject_ids']:
                        if str(standard_section)+str(subject) not in standard_section_subject_list:
                            standard_section_batch_dict={
                                'standard_section': standard_section,
                                'subject': subject,
                                'attendance_batch':data['id']
                            }
                            standard_section_batch_list.append(standard_section_batch_dict)
        for student in attendance_batch_data['attendance_student']:
            student_list.append(student['student'])
        for student in data['student_ids']:
            if student not in student_list:
                student_batch_dict={
                    "student":student,
                    "attendance_batch":data['id']
                    }
                student_batch_list.append(student_batch_dict)
    else:
        if data['batch_type'] == 'standard_section':
            for standard_section in data['standard_section_ids']:
                standard_section_batch_dict={
                    'standard_section': standard_section,
                }
                standard_section_batch_list.append(standard_section_batch_dict)
        if data['batch_type'] == 'subject':
            for standard_section in data['standard_section_ids']:
                for subject in data['subject_ids']:
                    standard_section_batch_dict={
                        'standard_section': standard_section,
                        'subject': subject,
                    }
                    standard_section_batch_list.append(standard_section_batch_dict)
        for student in data['student_ids']:
            if student not in student_list:
                student_batch_dict={
                    "student":student,
                    }
                student_batch_list.append(student_batch_dict)
    with transaction.atomic(using=get_current_db_name()):
        if attendance_batch_obj:
            serializer = AttendanceBatchSerializer(instance=attendance_batch_obj,data=batch_dict)
            serializer.is_valid()
            serializer.save()
        else:
            serializer=AttendanceBatchSerializer(data=batch_dict)
            serializer.is_valid()
            serializer.save()
            for standard_section in standard_section_batch_list:
                standard_section['attendance_batch'] = serializer.instance.id
            for student in student_batch_list:
                student['attendance_batch'] = serializer.instance.id
        if standard_section_batch_list:
            standard_section_serializer = AttendanceBatchStandardSectionSubjectMappingSerializer(data=standard_section_batch_list,many=True)
            standard_section_serializer.is_valid()
            standard_section_serializer.save()
        if student_batch_list:
            student_serializer = AttendanceBatchStudentMappingSerializer(data=student_batch_list,many=True)
            student_serializer.is_valid()
            student_serializer.save()
        if 'removed_student_ids' in data and data['removed_student_ids']:
            student_update = AttendanceBatchStudentMapping.objects.filter(attendance_batch = attendance_batch_obj.id,student_id=data['removed_student_ids']).update(is_active=False)
    return {"data":"Data Added Successfully","data_list":serializer.data}
    
def get_batch_attendance(self):
    for_date = self.request.GET.get('for_date')
    day = datetime.strptime(for_date, '%Y-%m-%d').strftime('%A')
    working_days = Day.get_student_working_days(self)
    holiday_reason = ''
    if day not in working_days:
        holiday_reason += day + ', '
    holidays = HolidayCalender.objects.filter(from_date__lte=for_date, to_date__gte=for_date)
    if holidays:
        for holiday in holidays:
            holiday_reason += holiday.reason + ', '
    holiday_reason = ''
    if holiday_reason:
        holiday_reason += "It's a holiday. Reason: " + holiday_reason[:-2] + '.'
    attendance = BatchAttendance.objects.filter(for_date=for_date).values(
        'for_date', 'status', 'attendance_batch', 'student', 'marked_by'
    )
    queryset = self.filter_queryset(self.get_queryset())
    data = queryset.values()
    attendance_batch_ids = [row_data['id'] for row_data in data]
    batch_student_data = AttendanceBatchStudentMapping.objects.filter(
        attendance_batch__in=attendance_batch_ids, student__is_active=True
    ).values(
        'id', 'attendance_batch', 'attendance_batch__name', 'student'
    )
    batch_enrol = {}
    student_batch_mapping = {}
    for enr in batch_student_data:
        if enr['attendance_batch'] not in batch_enrol:
            batch_enrol[enr['attendance_batch']] = 0
        batch_enrol[enr['attendance_batch']] += 1
        student_batch_mapping[enr['student']] = enr['attendance_batch']
    attendance_batch_mapping = {}
    for attendance_row in attendance:
        batch = attendance_row['attendance_batch']
        if attendance_row['student'] in student_batch_mapping:
            batch = student_batch_mapping[attendance_row['student']]
        if batch not in attendance_batch_mapping:
            attendance_batch_mapping[batch] = {'present': 0, 'absent': 0}
        if attendance_row['status'] == 'present':
            attendance_batch_mapping[batch]['present'] += 1
        else:
            attendance_batch_mapping[batch]['absent'] += 1
    for section in data:
        section['strength'] = 0
        if section['id'] in batch_enrol:
            section['strength'] = batch_enrol[section['id']]
        if section['id'] not in attendance_batch_mapping:
            sessions = {'present': 0, 'absent': 0}
        else:
            sessions = attendance_batch_mapping[section['id']]
        session = sessions['present']
        section.update({'total_present': sessions['present']})
    return {'data': {'data_list': data, 'holiday_reason': holiday_reason, 'is_attendance_marked': True if attendance else False}}

def get_batchattendance_detail(self):
    # queryset = self.filter_queryset(self.get_queryset())
    ordering = self.request.GET.get('ordering')
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    attendance_status = self.request.GET.get('attendance_status')
    batch_id = self.kwargs['pk']
    is_today_marked = False
    student_ids = []
    student_data = AttendanceBatchStudentMapping.objects.filter(attendance_batch=batch_id).values()
    for student in student_data:
        student_ids.append(student['student_id'])
    filter_query = {'student__in': student_ids}
    if from_date and to_date:
        filter_query['for_date__range'] = (from_date, to_date)
    if attendance_status:
        if attendance_status == "Present":
            attendance_status = "present"
        elif attendance_status == "Absent":
            attendance_status = "absent"
    queryset = BatchAttendance.objects.filter(**filter_query)
    attendance_data = queryset.values()
    days_count = {}
    attendance = {}
    students = []
    document_ids = []
    student_ids_attendance = []
    for attendance_row in attendance_data:
        days_count[attendance_row['for_date']] = ''
    days = len(days_count.keys())
    students = queryset.values('student', 'status', 'for_date')
    todays_date = datetime.now().date().strftime('%Y-%m-%d')
    for student in students:
        student_ids_attendance.append(student['student'])
    student_ids_attendance=list(set(student_ids_attendance))
    for student in student_ids:
        if student not in student_ids_attendance:
            attendance[student]={
                'present': 0, 'absent': 0, 'total': 0, 'todays_status': 'Un Marked'
            }
    for student in students:
        is_todays_date = False
        if student['for_date'].strftime('%Y-%m-%d') == todays_date:
            is_todays_date = True
            is_today_marked = True
        if student['student'] not in attendance:
            attendance[student['student']] = {
                'present': 0, 'absent': 0, 'total': 0, 'todays_status': 'Un Marked'
            }
        if is_todays_date:
            attendance[student['student']]["todays_status"] = student['status']
        if student['status'] == 'present':
            attendance[student['student']]['present'] += 1
        else:
            attendance[student['student']]['absent'] += 1
        attendance[student['student']]['total'] += 1
    student_list = Student.objects.filter(id__in=attendance.keys()).values(
        'current_reg_num',
        'email',
        'first_name',
        'id',
        'is_new_student',
        'last_name',
        'middle_name',
        'mobile_num',
        'user_student',
        'profile_pic'
    )
    for data in student_list:
        data['name'] = get_full_name(data['first_name'], data['middle_name'], data['last_name'])
        data.update(attendance[data['id']])
        if data['profile_pic']:
            document_ids.append(data['profile_pic'])
    document_queryset = Document.objects.filter(id__in=document_ids)
    document_data = {doc['id']: doc for doc in DocumentSerializer(document_queryset, many=True).data}
    filtered_student_list=[]
    for student_row in student_list:
        student_row['profile_pic_details'] = {}
        if student_row['profile_pic'] and student_row['profile_pic'] in document_data:
            student_row['profile_pic_details'] = document_data[student_row['profile_pic']]
        if attendance_status and attendance_status == student_row['todays_status']:
            filtered_student_list.append(student_row)
    if attendance_status:
        student_list = filtered_student_list
    if ordering:
        if '-' in ordering:
            ordering = ordering.replace('-', '')
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower(), reverse=True)
        else:
            student_list = sorted(student_list, key=lambda k: k[ordering] if isinstance(k[ordering], int) else k[ordering].lower())
    # std_sec_obj = StandardSectionMapping.objects.get(id=std_sec_id)
    # standard_section_data = {
    #     'standard_name': std_sec_obj.standard.name,
    #     'section_name': std_sec_obj.section.name,
    # }
    return {'data': {'days': days, 'student': student_list, 'is_today_marked': is_today_marked}}

def add_batchattendance_bulk(self, data):
    format = "%Y-%m-%d"
    from_date = data['from_date']
    to_date = data['to_date']
    attendance_batch = data['attendance_batch']
    attendance = data['attendance']
    with transaction.atomic(using=get_current_db_name()):
        date_range_list = get_working_dates(self, from_date, to_date)
        if not date_range_list:
            raise exceptions.ValidationError('Your mostly marking attendance on non working daysS')
        for for_date in date_range_list:
            temp = {
                'for_date': for_date.strftime(format),
                'attendance_batch': attendance_batch,
                'attendance': attendance,
                'marked_by': self.request.user.id
            }
            add_batchattendance(self, temp)
    return {'Reason': 'Data Saved Successfully'}

def add_batchattendance(self, data):
    if SharedService.date_to_obj(data['for_date']) > datetime.today().date():
        raise exceptions.ValidationError('Marking attendance for future date.')
    strength = AttendanceBatchStudentMapping.objects.filter(attendance_batch=data['attendance_batch'], student__is_active=True).values('attendance_batch').annotate(
        count=Count('attendance_batch'))
    if not strength:
        raise exceptions.ValidationError('Students are not enrolled to the Batch.')
    count = len(data['attendance'])
    strength = strength[0]['count']
    if count != strength:
        raise exceptions.ValidationError(
            f'{strength} student(s) are enrolled in the batch. marking attendance for {count} student(s)')
    dataList = list()
    students = list()
    attendance_data = BatchAttendance.objects.filter(for_date=data['for_date'], student__is_active=True).values('student', 'id')
    attendance_data = {str(atd['student']): atd for atd in attendance_data}
    for student, status in data['attendance'].items():
        temp = {'for_date': data['for_date'], 'attendance_batch': data['attendance_batch'],
             'student': student, 'status': status}
        if str(student) in attendance_data:
            temp['id'] = attendance_data[str(student)]['id']
        dataList.append(
            temp
        )
        students.append(student)
    response = SharedService.add_or_update_data(self, dataList)
    if students:
        SharedService.custom_thread(batch_attendance_notification, self, data, students)
    return response

def batch_attendance_notification(self, data, students):
    users = User.objects.filter(student__in=students)
    customizedData = list()
    customizedPresentData = list()
    staff_first_name = self.request.user.staff.first_name if self.request.user.staff else ''
    notification_obj = NotificationBodyTemplate('batch_attendance_create')
    notification_present_obj = NotificationBodyTemplate('batch_attendance_present_create')
    institute_obj = Institute.get_institute(self)
    for student in users:
        status=data['attendance'][str(student.student.id)]
        temp = {
            'student_name':student.student.first_name,
            'fordate':SharedService.date_to_obj(data["for_date"]).strftime("%d/%m/%Y"),
            'institute_name':institute_obj.code,
            'status':status
        }
        body_email = notification_obj.select_template('email', temp) if status=='absent' else notification_present_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp) if status=='absent' else notification_present_obj.select_template('push', temp)
        body_sms = notification_obj.select_template('sms',temp) if status=='absent' else notification_present_obj.select_template('sms', temp)
        if student.student.mobile_num:
            sms_data = {
                'mobile_number':student.student.mobile_num,'sms_body':body_sms,'sms_notification':1,'user_id':student.pk}
            customizedData.append(sms_data) if status=='absent' else customizedPresentData.append(sms_data)
        if student.student.email:
            email_data = {'email': student.student.email, 'user_id': student.pk, 'email_subject': None,
                                   'email_body': body_email,'email_notification':1}
            customizedData.append(email_data) if status=='absent' else customizedPresentData.append(email_data)
        push_data={'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}}
        customizedData.append(push_data) if status=='absent' else customizedPresentData.append(push_data)
    send_notification('batch_attendance_create', body=None, customizedData=customizedData)
    send_notification('batch_attendance_present_create', body=None,customizedData=customizedPresentData)

def get_batchattendance_report(self):
    attendance = self.get_queryset().filter(student=self.kwargs['pk'])
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    standard = None
    if fromDate and toDate:
        attendance = attendance.filter(for_date__range=(fromDate, toDate))
    if self.request.GET.get('attendance_batch'):
        attendance = attendance.filter(attendance_batch=self.request.GET.get('attendance_batch'))
        standard = [AttendanceBatch.objects.get(id=self.request.GET.get('attendance_batch')).name]
    if not attendance:
        raise exceptions.ValidationError('No data exists to generate the report for the student.')
    today = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    fromDate = SharedService.date_to_obj(fromDate)
    toDate = SharedService.date_to_obj(toDate)
    data = {'attendance': attendance.order_by('for_date'), 'today': today, 'institute': Institute.get_institute(self, standard),
            'from_date': fromDate, 'to_date': toDate}
    response = PDFService.receipt(self, data, attendance.first().student.first_name, 'attendanceReport.html')
    return response