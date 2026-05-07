from django.db import transaction
from django.db.models import Max, Case, When, F, Count
from apps.institutes.services import academic_year
from apps.shared.services_shared.common import get_full_name
from apps.shared.services_shared.store_api_result import store_long_running_process
from rest_framework import exceptions
from datetime import datetime

from apps.classes.models import StandardSectionMapping, AssignSubject, Enrollment, SubjectStudent, standard
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.serializers import EnrolledStudentsSerializer, SubjectStudentSerializer
from apps.exams.models.exam import Exam
from apps.exams.models.marks import StudentMark
from apps.exams.models.schedule import ExamSchedule
from apps.finance.models import AdmissionForm
from apps.institutes.models.academicYear import AcademicYear
from apps.notification.services.notification_service import send_notification
from apps.shared.services import ApprovalService, CounterService, SharedService, ConfigurationService, FormdefinitionService, NotificationBodyTemplate
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer
from apps.students.services.student import add_student_to_admission_form, get_student_admission_form
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.classes.models.attendance import AttendanceBatchStudentMapping

def read_student_section(self):
    queryset = self.filter_queryset(self.get_queryset())
    serializer = self.get_serializer(queryset, many=True)
    standard_id = self.request.GET.get('standard')
    academic_year = self.request.GET.get('academic_year')
    filter_query = {
        'standard':standard_id, 'student__is_active':True,
        'academic_year':academic_year
    }
    if self.request.GET.get('branch'):
        filter_query['standard__branch'] = self.request.GET.get('branch')
    if self.request.GET.get('board'):
        filter_query['standard__board'] = self.request.GET.get('board')
    academic_year_student_ids = StudentStandardMapping.objects.filter(
        **filter_query
    ).values_list('student', flat=True)
    #getting unenrolled data
    enrolled_student_ids = Enrollment.objects.filter(
        standard_section__standard=standard_id,
        standard_section__academic_year=academic_year
    ).values_list('student', flat=True)
    unenrolled_data = Student.objects.filter(
        id__in=academic_year_student_ids
    ).exclude(
        id__in=enrolled_student_ids
    )
    student_serializer = StudentListSerializer(unenrolled_data, many=True)
    return {'data': {'sections': serializer.data, 'students': student_serializer.data}}


def add_enrollment(self, data):
    if len(data['student']) != len(set(data['student'])):
        raise exceptions.ValidationError('Duplicate students found!')
    try:
        standardSection = StandardSectionMapping.objects.get(id=data['standard_section'])
    except:
        raise exceptions.ValidationError('Standard Section not found!')
    strength = self.get_queryset().filter(standard_section=data['standard_section']).annotate(
        strength=Count('student'))
    strength = strength[0].strength if strength else 0
    if (len(data['student']) + strength) > standardSection.strength:
        raise exceptions.ValidationError('Max strength exceeded!')
    dataList = list()
    subjectList = list()
    subject_assignment = ConfigurationService.get_setting_value('subject_assignment', standardSection.academic_year,
                                                                standardSection.standard)
    if subject_assignment == '2':
        subjects = AssignSubject.objects.filter(standard_section=data['standard_section']).values_list('subject', flat=True)
        if not subjects:
            raise exceptions.ValidationError('Subject(s) are not assigned to section.')
    subject_student = SubjectStudent.objects.filter(student__in = data['student'],academic_year = standardSection.academic_year).values('student','subject')
    subject_already_assigned={}
    for student in subject_student:
        if student['student'] not in subject_already_assigned:
            subject_already_assigned[student['student']]=[]
        subject_already_assigned[student['student']].append(student['subject'])
    for student in data['student']:
        # if not admission.filter(academic_year=standardSection.academic_year, student=student):
        #     add_student_to_admission_form(self, standardSection.academic_year.id, student, standardSection.standard.id)
            # raise exceptions.ValidationError(f'Student {student} is not admissioned!')
        dataList.append({'standard_section': data['standard_section'], 'student': student})
        if subject_assignment == '2':
            for subject in subjects:
                if student not in subject_already_assigned or subject not in subject_already_assigned[student]:
                    subjectList.append(
                        {'student': student, 'academic_year': standardSection.academic_year.pk, 'subject': subject})
    with transaction.atomic(using=get_current_db_name()):
        if subject_assignment == '2':
            serializer = SubjectStudentSerializer(data=subjectList, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        response = SharedService.add_data(self, dataList)
    
    SharedService.custom_thread(enrollment_notification, self, standardSection, data['student'])
    return response

def copy_enrollment_data(self, data):
    response = {'Reason': 'Data Added Successfully', 'total_enrolled_students': 0}

    if not data.get('to_academic_year') or not data.get('from_academic_year') or not data.get('standard_ids'):
        raise exceptions.ValidationError('to_academic_year / from_academic_year / standard_ids are mandatory')

    from_academic_year = data.get('from_academic_year')
    to_academic_year = data.get('to_academic_year')
    standard_ids = data.get('standard_ids')

    # Get previous year enrollment data: student -> section
    from_enrollments = Enrollment.objects.filter(
        standard_section__academic_year=from_academic_year,
        student__is_active=True
    ).values('student', 'standard_section__section')

    student_prev_section_map = {
        enr['student']: enr['standard_section__section'] for enr in from_enrollments
    }

    if not student_prev_section_map:
        return {'Reason': 'No previous year enrollment data found.', 'total_enrolled_students': 0}

    # Get students mapped to standards in new year (to_academic_year)
    students_with_standard = StudentStandardMapping.objects.filter(
        academic_year=to_academic_year,
        standard__in=standard_ids,
        student__in=student_prev_section_map.keys()  # Only consider those with previous enrollment
    ).values('student', 'standard')

    # Get (standard, section) → standard_section_id mapping for new year
    std_sec_map = {}
    for item in StandardSectionMapping.objects.filter(
        academic_year=to_academic_year,
        standard__in=standard_ids
    ).values('standard', 'section', 'id'):
        std_sec_map.setdefault(item['standard'], {})[item['section']] = item['id']

    # Build enrollment requests
    enrollment_data_map = {}
    for s in students_with_standard:
        student = s['student']
        standard = s['standard']
        section = student_prev_section_map.get(student)

        if not section:
            continue  # skip students with no section data

        std_sec_id = std_sec_map.get(standard, {}).get(section)
        if std_sec_id:
            enrollment_data_map.setdefault(std_sec_id, []).append(student)

    total_enrolled = 0

    with transaction.atomic(using=get_current_db_name()):
        for std_sec_id, student_list in enrollment_data_map.items():
            # Exclude students already enrolled
            existing_students = set(
                Enrollment.objects.filter(
                    standard_section_id=std_sec_id,
                    student__in=student_list
                ).values_list('student', flat=True)
            )
            new_students = [s for s in student_list if s not in existing_students]

            if not new_students:
                continue

            enrollment_payload = {
                'standard_section': std_sec_id,
                'student': new_students
            }

            # Reuse your existing add_enrollment method
            add_enrollment(self, enrollment_payload)
            total_enrolled += len(new_students)

        response['total_enrolled_students'] = total_enrolled
        return response

def enrollment_summary(self):
    try:
        academic_year = self.request.query_params.get('academic_year')
        standard = self.request.query_params.get('standard')
        transaction_id = self.request.GET.get('transaction_id')

        if not academic_year:
            raise exceptions.ValidationError('Academic year is required')

        student_standard_qs = StudentStandardMapping.objects.filter(
            academic_year=academic_year, student__is_active=True
        ).exclude(student__current_standard__codename='passedout')

        if standard:
            student_standard_qs = student_standard_qs.filter(standard=standard)

        # All students mapped to standards in the academic year
        mapped_students = student_standard_qs.values_list('student', flat=True)

        # Get standard_section IDs for that academic year and standard (if any)
        std_sec_ids = StandardSectionMapping.objects.filter(
            academic_year=academic_year
        )
        if standard:
            std_sec_ids = std_sec_ids.filter(standard=standard)
        std_sec_ids = std_sec_ids.values_list('id', flat=True)

        # All enrolled students in Enrollment table for those standard_sections
        enrolled_students = Enrollment.objects.filter(
            standard_section_id__in=std_sec_ids
        ).values_list('student', flat=True)

        enrolled_set = set(enrolled_students)
        mapped_set = set(mapped_students)
        unenrolled_set = mapped_set - enrolled_set
        total_summary = {
            'academic_year': academic_year,
            'standard': standard,
            'total_mapped_students': len(mapped_set),
            'total_enrolled_students': len(enrolled_set),
            'total_unenrolled_students': len(unenrolled_set),
            'unenrolled_student_ids': list(unenrolled_set)
        }
        store_long_running_process(self, transaction_id, total_summary)
    except Exception as e:
        store_long_running_process(self, transaction_id, {'error': str(e)[:250]})

# def copy_enrollment_data(self, data):
#     print(data, 'asdfas')
#     response = {'Reason': 'Data Added Successfully'}
#     if data.get('to_academic_year') or data.get('from_academic_year') or data.get('standard_ids'):
#         raise exceptions.ValidationError('to_academic_year / from_academic_year / standard_ids are mandatory')
#     from_academic_year = data.get('from_academic_year')
#     to_academic_year = data.get('to_academic_year')
#     standard_ids = data.get('standard_ids')
#     from_academic_year_student_datas = Enrollment.objects.filter(
#         standard_section__academic_year=from_academic_year, student__is_active=True
#     ).values(
#         'student', 'standard_section__section'
#     )
#     student_previous_section_mapping = {}
#     for from_enr in from_academic_year_student_datas:
#         student_previous_section_mapping[from_enr['student']] = {"section_id": from_enr['standard_section__section']}
#     student_with_standard = StudentStandardMapping.objects.filter(
#         academic_year = data.get('to_academic_year'),
#         standard__in=standard_ids
#     ).values(
#         'student', 'standard'
#     )
#     to_standard_section_data = {}
#     standard_section_data = StandardSectionMapping.objects.filter(
#         academic_year=to_academic_year, standard__in=standard_ids
#     ).values(
#         'standard', 'section', 'id'
#     )
#     for standard_section in standard_section_data:
#         if standard_section['standard'] not in to_standard_section_data:
#             to_standard_section_data[standard_section['standard']] = {}
#         if standard_section['section'] not in to_standard_section_data[standard_section['standard']]:
#             to_standard_section_data[standard_section['standard']][standard_section['section']] = standard_section['id']
#     standard_section_student_to_save = {}
#     for student_standard in student_with_standard:
#     return response

def shared_enroll_notification(self, standardSection, students):
    users = User.objects.filter(student__in=students)
    customizedData = list()
    notification_obj = NotificationBodyTemplate('enrollment_create')
    for student in users:
        temp = {
            'standard_name': standardSection.standard.name,
            'section_name': standardSection.section.name,
            'start_year': standardSection.academic_year.start_date.year,
            'end_year': standardSection.academic_year.end_date.year,
            'student_name': student.student.first_name.upper()
        }
        body_email = notification_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp)
        body_whatsapp = notification_obj.select_template('whatsapp', temp)
        if student.student.email:
            customizedData.append({'email': student.student.email, 'user_id': student.pk, 'email_subject': None,
                                   'email_body': body_email, 'email_notification': 1})
        if student.student.mobile_num:
            customizedData.append({'mobile_number':student.student.mobile_num,'whatsapp_body':body_whatsapp,'whatsapp_notification':1,'user_id':student.student.pk})
        customizedData.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}})
    return customizedData


def enrollment_notification(self, standardSection, students):
    customizedData = shared_enroll_notification(self, standardSection, students)
    send_notification('enrollment_create', body=None, customizedData=customizedData)


def shuffle_student_notification(self, standard_section):
    customizedData = list()
    for section in standard_section.values():
        customizedData += shared_enroll_notification(self, section['standard_section'], section['student'])
    send_notification('enrollment_create', body=None, customizedData=customizedData)


def read_shuffle_student(self):
    queryset = self.get_queryset().filter(standard_section__academic_year=self.request.GET.get('academic_year'),
                                          standard_section__standard=self.request.GET.get('standard'),
                                          standard_section__section=self.request.GET.get('section'),
                                          student__is_active=True
                                        )
    if queryset:
        strength = set(queryset.values_list('standard_section__strength', flat=True)).pop()
    else:
        strength = 0
    serializer = EnrolledStudentsSerializer(queryset, many=True)
    return {'data': {'strength': strength, 'enrollments': serializer.data}}

def get_exam_schedule_preview(student_id, old_section, new_section):
    result = {"movable": [], "skipped": []}

    # Get academic year from new section
    try:
        new_section_obj = StandardSectionMapping.objects.get(id=new_section)
    except StandardSectionMapping.DoesNotExist:
        return result

    academic_year_id = new_section_obj.academic_year_id

    # Prefetch new schedules only for this academic year
    new_schedules = ExamSchedule.objects.filter(
        standard_section=new_section,
        exam__academic_year_id=academic_year_id
    ).select_related("exam", "subject")

    new_lookup = {(s.exam_id, s.subject_id): s for s in new_schedules}

    # Student info
    student_obj = Student.objects.filter(id=student_id).first()
    student_name = get_full_name(student_obj.first_name, student_obj.middle_name, student_obj.last_name)

    # Get old marks only for this academic year
    old_marks = StudentMark.objects.filter(
        student_id=student_id,
        exam_schedule__exam__academic_year_id=academic_year_id
    ).select_related(
        "exam_schedule__exam",
        "exam_schedule__subject"
    )
    result['student_name'] = student_name

    for mark in old_marks:
        old_schedule = mark.exam_schedule
        if not old_schedule:
            continue

        key = (old_schedule.exam_id, old_schedule.subject_id)

        if key in new_lookup:
            new_schedule = new_lookup[key]
            result["movable"].append({
                "student_id": student_id,
                "student_name": student_name,
                "exam": old_schedule.exam_id,
                "exam_name": old_schedule.exam.description if old_schedule.exam else "",
                "subject": old_schedule.subject_id,
                "subject_name": old_schedule.subject.name if old_schedule.subject else "",
                "from_schedule_id": old_schedule.id,
                "to_schedule_id": new_schedule.id
            })
        else:
            result["skipped"].append({
                "student_id": student_id,
                "student_name": student_name,
                "exam": old_schedule.exam_id,
                "exam_name": old_schedule.exam.description if old_schedule.exam else "",
                "subject": old_schedule.subject_id,
                "subject_name": old_schedule.subject.name if old_schedule.subject else "",
                "from_schedule_id": old_schedule.id,
                "reason": "Not scheduled in new section"
            })

    return result

def preview_shuffle_enrollment(self, data):
    """
    Preview which students and exam marks will move when shuffling.
    """
    preview_result = {"students": []}

    for section in data:
        new_section_id = section['standard_section']
        student_id = section['student']

        # Get new section object
        new_section = StandardSectionMapping.objects.get(id=new_section_id)
        academic_year_id = new_section.academic_year_id

        # Get old enrollment (current section)
        old_enrollment = Enrollment.objects.filter(
            student_id=student_id,
            standard_section__academic_year_id=academic_year_id
        ).first()
        if not old_enrollment:
            continue

        old_section_id = old_enrollment.standard_section_id
        old_section = StandardSectionMapping.objects.filter(id=old_section_id).first()

        
        from_section_name = (
            f"{old_section.standard.name} - {old_section.section.name}"
            if old_section else "N/A"
        )
        to_section_name = f"{new_section.standard.name} - {new_section.section.name}"

        # Build exam schedule preview
        exam_preview = get_exam_schedule_preview(student_id, old_section_id, new_section_id)

        # Add all data to preview
        preview_result["students"].append({
            "student_id": student_id,
            "from_section": old_section_id,
            "from_section_name": from_section_name,
            "to_section": new_section_id,
            "to_section_name": to_section_name,
            "student_name": exam_preview['student_name'],
            "movable_marks": exam_preview["movable"],
            "skipped_marks": exam_preview["skipped"]
        })

    return preview_result

def shuffle_enrollment(self, data, **kwargs):
    preview = self.request.GET.get('preview')
    # global standardSection
    standard_section = dict()
    subjects = AssignSubject.objects.all()
    for section in data:
        SharedService.duplicate_list_one_object(section['enrollments'], 'student')
        try:
            standardSection = StandardSectionMapping.objects.get(id=section['standard_section'])
        except:
            raise exceptions.ValidationError('Standard Section not found!')
        standard_section.update({section['standard_section']: {'standard_section': standardSection, 'student': list()}})
        sub = subjects.filter(standard_section=section['standard_section'])
        if not sub:
            raise exceptions.ValidationError(f'Subject(s) are not assigned to section {standardSection.section.name}.')
        strength = self.get_queryset().filter(standard_section=section['standard_section']).annotate(
            strength=Count('student'))
        strength = strength[0].strength if strength else 0
        # if (len(section['enrollments']) + strength) > standardSection.strength:
        #     raise exceptions.ValidationError(f'Max strength exceeded! in section {standardSection.section.name}')
    students = dict(
        Enrollment.objects.filter(standard_section__in=standard_section.keys()).values_list('student',
                                                                                            'standard_section'))
    standard_section_keys = standard_section.keys()
    # schedule_data = StudentMark.objects.filter(exam_schedule__standard_section__in=standard_section_keys, exam_schedule__exam__is_active=True)
    # if schedule_data:
    #     for exam in Exam.objects.filter(id__in=list(schedule_data.values_list('exam_schedule__exam', flat=True))):
    #         exam_data = Exam.objects.get(id=exam.id)
    #         ApprovalService.get_approval_status(self, exam_data, 'Section Data is referred in Exam cant shuffle the students',
                                                # ['1', '3'])
    data_list = list()
    for section in data:
        for enrollment in section['enrollments']:
            if students[enrollment['student']] != section['standard_section']:
                print(students[enrollment['student']], "enrollment['student']")
                print(section['standard_section'], "section['standard_section']")
                print("----------------")
                enrollment.update({'standard_section': section['standard_section']})
                data_list.append(enrollment)
                standard_section[section['standard_section']]['student'].append(enrollment['student'])
    if preview:
        return preview_shuffle_enrollment(self, data_list)
    with transaction.atomic(using=get_current_db_name()):
        for data in data_list:
            self.kwargs['pk'] = data['id']
            SharedService.update_data(self, data, **kwargs)
    SharedService.custom_thread(shuffle_student_notification, self, standard_section)
    return {'Reason': 'Data Shuffled Successfully!'}


def get_enrolled_students(self):
    pagination = self.request.GET.get('pagination', False)
    response = SharedService.read_data(self, True)
    if pagination:
        limit = self.request.GET.get('limit')
        pageno = self.request.GET.get('pageno')
        limit = int(limit) if limit is not None else 10
        pageno = int(pageno) if pageno is not None else 1
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                                limit,
                                                                                pageno)
        """If you are changing here change in non pagination"""
        student_ids = []
        for row_data in data:
            student_ids.append(row_data['student'])
        student_admission_list = get_student_admission_form(self, student_ids)
        for row_data in data:
            row_data['admission_num'] = ''
            if row_data['student'] in student_admission_list:
                row_data['admission_num'] = student_admission_list[row_data['student']]
        """If you are changing here change in pagination"""
        if self.request.GET.get('subject'):
            queryset = SubjectStudent.objects.filter(academic_year=self.request.GET.get('academic_year'))
            for student in data:
                subject = queryset.filter(student=student['student']).order_by(
                    F('subject__sequence').asc(nulls_last=True))
                student.update({'assigned_subject': SubjectStudentSerializer(subject, many=True).data})
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
    """If you are changing here change in pagination"""
    student_ids = []
    for row_data in response['data']:
        student_ids.append(row_data['student'])
    student_admission_list = get_student_admission_form(self, student_ids)
    for row_data in response['data']:
        row_data['admission_num'] = ''
        if row_data['student'] in student_admission_list:
            row_data['admission_num'] = student_admission_list[row_data['student']]
    if self.request.GET.get('subject'):
        queryset = SubjectStudent.objects.filter(academic_year=self.request.GET.get('academic_year'))
        for student in response['data']:
            subject = queryset.filter(student=student['student']).order_by(
                F('subject__sequence').asc(nulls_last=True))
            student.update({'assigned_subject': SubjectStudentSerializer(subject, many=True).data})
    order_by_gender = FormdefinitionService.get_formdefintion_data(self, 'student_attendance_configuration', 'order_by_gender')
    if int(order_by_gender) == 1:
        gender_priority = {'Boy': 0, 'Girl': 1}
        response['data'] = sorted(response['data'], key=lambda d: (gender_priority.get(d.get('student_gender'), 2), d['name']))
    else:
        response['data'] = sorted(response['data'], key=lambda d: d['name'])
    return response


def get_student_todays_standard_and_section(self, student_id):
    academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today(), True)
    standard = None
    standard_section = None
    if not academic_year:
        return standard, standard_section
    try:
        standard_section = Enrollment.get_student_standard_for_academic(self, academic_year.id, student_id,True)
        standard_section = standard_section if standard_section else None
        standard = StudentStandardMapping.objects.filter(academic_year=academic_year.id, student=student_id).first().standard_id
    except:
        pass
    return academic_year, standard, standard_section   

def read_student_batch(self):
    queryset = self.filter_queryset(self.get_queryset())
    serializer = self.get_serializer(queryset, many=True)
    standard_id = self.request.GET.get('standard')
    standard_section_ids = self.request.GET.get('standard_section_ids')
    if standard_section_ids:
        standard_section_ids=standard_section_ids.split(",")
    subject_ids = self.request.GET.get('subject_ids')
    if subject_ids:
        subject_ids=subject_ids.split(",")
    academic_year = self.request.GET.get('academic_year')
    filter_query = {
        'student__is_active':True,
        'academic_year':academic_year
    }
    if standard_section_ids:
        filter_query['student__enrollment__standard_section__in'] = standard_section_ids
    if standard_id:
        filter_query['standard'] = standard_id
    academic_year_student_ids = StudentStandardMapping.objects.filter(
        **filter_query
    ).values_list('student', flat=True)
    if subject_ids:
        academic_year_student_ids = SubjectStudent.objects.filter(subject__in = subject_ids, academic_year = academic_year,student__in=academic_year_student_ids).values_list('student_id')
    enrolled_student_ids = AttendanceBatchStudentMapping.objects.filter(
        attendance_batch__academic_year=academic_year
    ).values_list('student', flat=True)
    unenrolled_data = Student.objects.filter(
        id__in=academic_year_student_ids
    ).exclude(
        id__in=enrolled_student_ids
    )
    enrolled_data = Student.objects.filter(id__in=enrolled_student_ids)
    student_serializer_unenrolled = StudentListSerializer(unenrolled_data, many=True)
    student_serializer_enrolled = StudentListSerializer(enrolled_data, many=True)
    if self.request.GET.get('limit') and self.request.GET.get('page'):
        if self.request.GET.get('unenrolled_students'):
            data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer_unenrolled.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('page'))
        else:
            data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer_enrolled.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('page'))
        return {'data':data,'count':count,'next_page':next_page,'previous_page':previous_page}    
    else:
        return {'data': {'sections': serializer.data, 'students': student_serializer_unenrolled.data, 
                        'unenrolled_students':student_serializer_unenrolled.data, 'enrolled_students':student_serializer_enrolled.data}}

def get_batch_students(self):
    pagination = self.request.GET.get('pagination', False)
    response = SharedService.read_data(self, True)
    if pagination:
        limit = self.request.GET.get('limit')
        pageno = self.request.GET.get('pageno')
        limit = int(limit) if limit is not None else 10
        pageno = int(pageno) if pageno is not None else 1
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                                limit,
                                                                                pageno)
        """If you are changing here change in non pagination"""
        student_ids = []
        for row_data in data:
            student_ids.append(row_data['student'])
        student_admission_list = get_student_admission_form(self, student_ids)
        for row_data in data:
            row_data['admission_num'] = ''
            if row_data['student'] in student_admission_list:
                row_data['admission_num'] = student_admission_list[row_data['student']]
        """If you are changing here change in pagination"""
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
    """If you are changing here change in pagination"""
    student_ids = []
    for row_data in response['data']:
        student_ids.append(row_data['student'])
    student_admission_list = get_student_admission_form(self, student_ids)
    for row_data in response['data']:
        row_data['admission_num'] = ''
        if row_data['student'] in student_admission_list:
            row_data['admission_num'] = student_admission_list[row_data['student']]
    response['data']  = sorted(response['data'], key=lambda d: d['name'])
    """ changes till here """
    return response