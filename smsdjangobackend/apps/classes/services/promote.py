from django.db import transaction
from rest_framework import exceptions
from apps.classes.models import Standard, Enrollment, PromoteStudent
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.serializers import StandardSerializer, EnrolledStudentsSerializer, StudentStandardMappingSerializer
from apps.classes.services.standard import PASSED_OUT
from apps.finance.services import calculations
from apps.institutes.models import AcademicYear
from apps.finance.models import AdmissionForm
from apps.institutes.serializers import AcademicYearViewSerializer
from apps.notification.services.notification_service import send_notification
from apps.shared.services import NotificationBodyTemplate, SharedService
from apps.students.models import Student
from apps.students.models.studentDetail import StudentDetails
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.students.services.student import add_student_to_admission_form, get_student_admission_form_details
from apps.classes.models.standard import StandardSectionMapping,StandardYearName
from django.db.models import Q

def get_next_academic_year(academic_year):
    try:
        # Find the academic year that starts after the current academic year ends
        # Order by start_date to get the immediate next academic year
        next_academic_year = AcademicYear.objects.filter(
            start_date__gt=academic_year.start_date
        ).order_by('start_date').first()
        if not next_academic_year:
            raise exceptions.ValidationError('Next Academic Year not Found!')
    except exceptions.ValidationError:
        raise
    except Exception as e:
        raise exceptions.ValidationError(f'Next Academic Year not Found! Error: {str(e)}')
    return next_academic_year

def get_next_academic_year_and_standard(academic_year, from_standard, flag=False):
    if flag:
        try:
            academic_year = AcademicYear.objects.get(id=academic_year)
        except:
            raise exceptions.ValidationError('Academic Year not Found!')
    next_academic_year = get_next_academic_year(academic_year)
    nextAcademicYear = AcademicYearViewSerializer(next_academic_year)
    if not from_standard:
        raise exceptions.ValidationError('Please select standard')
    standard = Standard.objects.filter(is_active=True)
    from_sequence = standard.filter(id=from_standard).first()
    to_standard = standard.filter(sequence=from_sequence.sequence + 1, branch=from_sequence.branch, course=from_sequence.course)
    filter_standard = standard.filter(id__in=to_standard)
    if not filter_standard.filter(present_standard__academic_year=next_academic_year):
        if filter_standard.filter(present_standard__academic_year=academic_year):
            raise exceptions.ValidationError('Next Standard is not set in the next academic year.')
        else:
            to_standard = standard.filter(id=PASSED_OUT)
    return nextAcademicYear.data, to_standard

def add_promote_student(self, data):
    from_academic_year = data['from_academic_year']
    from_standard = data['from_standard']
    message = 'Student Promoted Successfully' if data['is_passed'] else 'Student Marked Fail'
    if len(data['student']) != len(set(data['student'])):
        raise exceptions.ValidationError('Duplicate Students Found!')
    promote_data = get_promote_student(self, from_standard, from_academic_year)
    to_academic_year = promote_data['data']['to_academic_year']
    to_standard_list_data = {to['id']: to for to in promote_data['data']['to_standard_list']}
    if int(data['to_academic_year']) != to_academic_year['id']:
        raise exceptions.ValidationError('Invalid To Academic Year!')
    if data['is_passed']:
        if int(data['to_standard']) not in to_standard_list_data:
            raise exceptions.ValidationError('Invalid To standard!')
    if promote_data['data']['from_standard_year_name'] and to_standard_list_data[data['to_standard']]['standardyearname']:
        if promote_data['data']['from_standard_year_name'] == to_standard_list_data[data['to_standard']]['standardyearname']:
            data['to_academic_year'] = data['from_academic_year']
    data_list = list()
    student_list = list()
    student_ids = [student for student in data['student']]
    student_academic_mapping = [stu['student_id'] for stu in StudentStandardMapping.objects.filter(student__in=student_ids, academic_year=data['to_academic_year']).values()]
    for student in data['student']:
        # paidData = calculations.paid_data_and_status(self, student, from_academic_year, from_standard)
        # if not paidData['is_paid']:
        #     name = Student.objects.get(id=student).first_name
        #     raise exceptions.ValidationError(f'{name} is not paid the fee(s)')
        data_list.append(
            {
                'from_academic_year': data['from_academic_year'], 'to_academic_year': data['to_academic_year'],
                'from_standard': data['from_standard'], 'to_standard': data['to_standard'], 'student': student
            }
        )
        if promote_data['data']['from_standard_year_name'] and to_standard_list_data[data['to_standard']]['standardyearname']:
            if promote_data['data']['from_standard_year_name'] == to_standard_list_data[data['to_standard']]['standardyearname']:
                student_list.append({'academic_year': data['to_academic_year'], 'standard': data['to_standard'],
                                    'student': student})
        else:
            if student not in student_academic_mapping:
                student_list.append({'academic_year': data['to_academic_year'], 'standard': data['to_standard'],
                                    'student': student})
    serializer = self.get_serializer(data=data_list, many=True, allow_empty=False)
    serializer.is_valid(raise_exception=True)
    if student_list:
        student_standard = StudentStandardMappingSerializer(data=student_list, many=True)
        student_standard.is_valid(raise_exception=True)
    with transaction.atomic(using=get_current_db_name()):
        Student.objects.filter(id__in=data['student']).update(current_standard=data['to_standard'], is_new_student=False)
        serializer.save()
        if student_list:
            student_standard.save()
    SharedService.custom_thread(promote_notification, self, data['to_standard'], data['student'])
    return {'Reason': message}

def add_promote_student_academic_year(self, data):
    from_academic_year = data.get('from_academic_year')
    if not from_academic_year:
        raise exceptions.ValidationError('from_academic_year is required')
    enrollments = Enrollment.objects.filter(
        standard_section__academic_year=from_academic_year,
        student__is_active=True
    ).values_list('standard_section__standard', flat=True).distinct()
    standard_ids = [sid for sid in enrollments if sid]
    if not standard_ids:
        return {'Reason': 'No eligible students found for promotion.'}

    payloads = []
    for standard_id in standard_ids:
        promote_data = get_promote_student(self, standard_id, from_academic_year)
        to_academic_year = promote_data['data'].get('to_academic_year', {}).get('id')
        to_standard_list = promote_data['data'].get('to_standard_list', [])
        from_standard_obj = Standard.objects.filter(id=standard_id).first()
        from_standard_name = from_standard_obj.name if from_standard_obj else f'Standard {standard_id}'

        if not to_academic_year:
            raise exceptions.ValidationError(f'{from_standard_name}: target academic year missing')
        if not isinstance(to_standard_list, list) or len(to_standard_list) == 0:
            raise exceptions.ValidationError(f'{from_standard_name}: target standard missing')
        # Use the first backend-suggested target standard; add_promote_student() will still
        # run its own validation and reject invalid mappings.
        to_standard = to_standard_list[0].get('id')
        if not to_standard:
            raise exceptions.ValidationError(f'{from_standard_name}: invalid target standard')

        promoted_students = set(PromoteStudent.objects.filter(
            from_academic_year=from_academic_year,
            from_standard=standard_id
        ).values_list('student', flat=True))

        enrolled_students = Enrollment.objects.filter(
            standard_section__academic_year=from_academic_year,
            standard_section__standard=standard_id,
            student__is_active=True
        ).values_list('student', flat=True).distinct()

        student_ids = [sid for sid in enrolled_students if sid not in promoted_students]
        if not student_ids:
            continue
        payloads.append({
            'from_academic_year': from_academic_year,
            'to_academic_year': to_academic_year,
            'student': student_ids,
            'from_standard': standard_id,
            'to_standard': to_standard,
            'is_passed': True
        })

    if not payloads:
        return {'Reason': 'No eligible students found for promotion.'}

    total_students = 0
    for payload in payloads:
        add_promote_student(self, payload)
        total_students += len(payload['student'])
    return {'Reason': f'Student Promoted Successfully. Total promoted: {total_students}'}

#on depromote update current standard
def depromote_student(self, data):
    from_academic_year = data['from_academic_year']
    from_standard = data['from_standard']
    student_ids = data['student']
    error_data = []
    student_standard_obj = StudentStandardMapping.objects.filter(
        academic_year=from_academic_year,
        standard=from_standard,
        student__in=student_ids
    )
    promote_student_obj = PromoteStudent.objects.filter(
        to_academic_year=from_academic_year,
        student__in=student_ids,
        to_standard=from_standard
    )
    student_standard_mapping_existing = {
        student_obj['student_id']: student_obj for student_obj in student_standard_obj.values()
    }
    academic_year_obj = AcademicYear.objects.get(id=data['from_academic_year'])
    enrollment_data = {e['student_id']: e for e in Enrollment.objects.filter(
        student__in=student_ids, standard_section__academic_year=from_academic_year
    ).values()}
    student_standard_mapping = StudentStandardMapping.objects.filter(
        student__in=student_ids, academic_year__start_date__lt=academic_year_obj.start_date
    ).values('standard', 'standard__sequence', 'student')
    student_standard_mapping_higher_standard = {s['student']: 1 for s in StudentStandardMapping.objects.filter(
        student__in=student_ids, academic_year__start_date__gt=academic_year_obj.end_date
    ).values('student')}
    student_standard_mapping_data = {}
    for student_standard in student_standard_mapping:
        if student_standard['student'] not in student_standard_mapping_data:
            student_standard_mapping_data[student_standard['student']] = []
        student_standard_mapping_data[student_standard['student']].append(student_standard)
    for student in student_ids:
        if student in student_standard_mapping_higher_standard:
            student_obj = Student.objects.get(id=student)
            error_data.append(f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - Higher standard found not able to depromote old data')
            continue
        if student not in student_standard_mapping_existing:
            student_obj = Student.objects.get(id=student)
            error_data.append(f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - Not able to depromote. Not valid input')
            continue
        if student not in student_standard_mapping_data:
                student_obj = Student.objects.get(id=student)
                error_data.append(
                    f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - There is no previous standard to depromote'
                )
                continue
        if student in enrollment_data:
            student_obj = Student.objects.get(id=student)
            error_data.append(f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - Not able to depromote. Already alloted to sections please remove from the sections')
            continue
        try:
            paid_data = calculations.paid_data_and_status(self, student, from_academic_year, from_standard)
        except:
            paid_data = None
            pass #when fee plan not approved we ignore it
        if paid_data and paid_data['paid_amount']:
            student_obj = Student.objects.get(id=student)
            error_data.append(f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - Not able to depromote. Already student paid fees in the current acadmeic year')
            continue
        if paid_data and paid_data['concession_amount']:
            student_obj = Student.objects.get(id=student)
            error_data.append(f'{student_obj.first_name} {student_obj.middle_name} {student_obj.last_name} - Not able to depromote, Concession is given to the student')
            continue
    if error_data:
        raise exceptions.ValidationError(error_data)
    with transaction.atomic(using=get_current_db_name()):
        for promoted in promote_student_obj.values():
            Student.objects.filter(id=promoted['student_id']).update(
                current_standard=promoted['from_standard_id']
            )
        student_standard_obj.delete()
        promote_student_obj.delete()
    return {'Reason': 'Student Depromoted Succesfully'}

def promote_notification(self, toStandard, students):
    users = User.objects.filter(student__in=students)
    customizedData = list()
    notification_obj = NotificationBodyTemplate('promotestudent_create')
    # Handle both queryset and integer ID cases
    if isinstance(toStandard, int):
        try:
            standard_obj = Standard.objects.get(id=toStandard)
            to_standard_name = standard_obj.name
        except Standard.DoesNotExist:
            to_standard_name = "Unknown Standard"
    else:
        # If it's a queryset, get the first one
        standard_obj = toStandard.first() if hasattr(toStandard, 'first') else toStandard
        to_standard_name = standard_obj.name if standard_obj else "Unknown Standard"
    
    for student in users:
        temp = {
            'student_name': student.student.first_name.upper(),
            'to_standard': to_standard_name
        }
        body_push = notification_obj.select_template('push', temp)
        if student.student.email:
            body_email = notification_obj.select_template('email', temp)
            customizedData.append({'email': student.student.email, 'user_id': student.pk, 'email_subject': None,
                                   'email_body': body_email,'email_notification':1})
        if student.student.mobile_num:
            body_sms = notification_obj.select_template('sms', temp)
            customizedData.append({
                'mobile_number' : student.student.mobile_num, 'sms_body': body_sms, 'sms_notification': 1, 'user_id': student.pk
            })
        customizedData.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': student.pk, 'extra_params': {}}
        )
    send_notification('promotestudent_create', body=None, customizedData=customizedData)

#dont use the self.request
def get_promote_student(self, standard_id, academic_year):
    academic_year_obj = AcademicYear.objects.get(id=academic_year)
    to_academic_year = get_next_academic_year(academic_year_obj)
    to_academic_year = AcademicYearViewSerializer(to_academic_year).data
    standard_obj = Standard.objects.all()
    from_standard = standard_obj.filter(id=standard_id).first()
    is_sem_wise = StandardYearName.objects.first()
    if is_sem_wise:
        to_standard_list = standard_obj.filter(sequence__gte=from_standard.sequence+1)
        if to_standard_list[0].standardyearname and from_standard.standardyearname and to_standard_list[0].standardyearname == from_standard.standardyearname:
            to_academic_year = AcademicYearViewSerializer(academic_year_obj).data
    else:
        to_standard_list = standard_obj.filter(Q(sequence__gt=from_standard.sequence)|Q(codename='passedout'))
    to_standard_serializer = StandardSerializer(to_standard_list, many=True)
    return {'data': {'to_academic_year': to_academic_year, 'to_standard_list': to_standard_serializer.data,'from_standard_year_name':from_standard.standardyearname_id}}


def get_elligible_for_promote_student(self):
    academic_year = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard')
    is_new_student = self.request.GET.get('is_new_student')
    filter_query = {
        'standard_section__academic_year': academic_year,
        'standard_section__standard': standard,
        'student__is_active': True
    }
    if is_new_student is not None:
        temp_student_ids = StudentStandardMapping.objects.filter(is_new_student=is_new_student, academic_year=academic_year, standard=standard).values_list('student', flat=True)
        filter_query['student__in'] = temp_student_ids
    queryset = Enrollment.objects.filter(**filter_query)
    if self.request.GET.get('section'):
        queryset = queryset.filter(standard_section__section=self.request.GET.get('section'))
    serializer = EnrolledStudentsSerializer(queryset, many=True)
    student_report = dict(
        PromoteStudent.objects.filter(from_academic_year=academic_year, from_standard=standard).values_list('student',
                                                                                                           'to_standard'))
    data_list = list()
    student_ids = []
    for student in serializer.data:
        student_ids.append(student['student'])
    student_admission_num_mapping = get_student_admission_form_details(self, student_ids, False)
    if serializer.data:
        for student in serializer.data:
            if student['student'] in student_report:
                if int(standard) == student_report[student['student']]:
                    student.update({'progress_status': 'Fail', 'is_paid_full_fee': True})
                else:
                    student.update({'progress_status': 'Pass', 'is_paid_full_fee': True})
            else:
                try:
                    paid_data = calculations.paid_data_and_status(self, student['student'], academic_year, standard)
                except:
                    paid_data = {'is_paid': 0, 'pending_amount': 0}
                    pass #bypass when the fee plan not approved
                student.update({'progress_status': None, 'is_paid_full_fee': paid_data['is_paid'], 'pending_amount': paid_data['pending_amount']})
            if student['student'] in student_admission_num_mapping:
                student['admission_num'] = student_admission_num_mapping[student['student']]['admission_num']
            data_list.append(student)
    return {'data': data_list}

def move_student_to_previous_acadmeic(self, data):
    student_standard_mapping_data = [student['student_id'] for student in StudentStandardMapping.objects.filter(student__in=data['student_ids'], academic_year=data['academic_year']).values()]
    standard_mapping_data_to_add = []
    if not StandardSectionMapping.objects.filter(academic_year=data['academic_year'], standard=data['standard']).exists():
        raise exceptions.ValidationError('Standard is not mapped to the academic year')
    admission_for_objs = {a['student'] : a['id'] for a in AdmissionForm.objects.filter(student__in=data['student_ids']).values('id', 'student')}
    for student in data['student_ids']:
        if student not in student_standard_mapping_data:
            standard_mapping_data_to_add.append(
                {
                    'academic_year': data['academic_year'],
                    'standard': data['standard'],
                    'student': student,
                }
            )
        admission_form_obj= AdmissionForm.objects.filter(student=student)
        if not admission_form_obj or not admission_form_obj.filter(academic_year=data['academic_year']):
            admission_num = None
            admission_date = None
            admission_obj = admission_form_obj.first()
            if admission_obj:
                admission_date = admission_obj.admission_date
                admission_num = admission_obj.admission_num
            if data['admission_date']:
                admission_date = data['admission_date']
            add_student_to_admission_form(self, data['academic_year'], student, data['standard'], admission_num, admission_date, False, admission_for_objs[student])
    if standard_mapping_data_to_add:
        student_standard = StudentStandardMappingSerializer(data=standard_mapping_data_to_add,many=True)
        student_standard.is_valid(raise_exception=True)
        student_standard.save()
    return {'Reason': 'Data Saved Successfully'}