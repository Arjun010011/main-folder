from rest_framework import exceptions
from datetime import datetime
from apps.classes.models.enrollment import Enrollment
from apps.classes.services.standard import get_standard_and_section

from apps.diary.models import Diary, StudentDiary, StandardSectionDiary
from apps.diary.services.diary import STATUS
from apps.shared.services import SharedService
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer


def get_diary_student_list(self):
    standardSection = self.request.GET.get('standard_section')
    status = self.request.GET.get('status')
    diary = Diary.objects.filter(id=self.request.GET.get('diary')).first()
    if not diary:
        raise exceptions.ValidationError('Home work is not exist(s).')
    filterQueryset = {'is_active': True}
    if diary.is_student:
        filterQueryset.update({'student_diary__diary': diary})
    else:
        if not standardSection:
            standardSection = StandardSectionDiary.objects.filter(diary=diary).values_list('standard_section',
                                                                                           flat=True)
        filterQueryset.update({'enrollment_standard_section_in': standardSection})
    if status:
        filterQueryset.update({'student_diary__status': status})
    studentQueryset = self.filter_queryset(self.get_queryset()).filter(**filterQueryset)
    student_serializer = self.get_serializer(studentQueryset, many=True)
    if self.request.GET.get('limit'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
    else:
        data = student_serializer.data
    # studentStatus = dict(StudentDiary.objects.filter(diary=diary).values_list('student', 'status'))
    studentStatus = StudentDiary.objects.filter(diary=diary).values('id', 'student', 'status', 'marks', 'read_time')
    studentStatus = {diary['student']: diary for diary in studentStatus}
    for student in data:
        if student['id'] in studentStatus:
            student.update({'status': studentStatus[student['id']]['status'],
                            'student_diary_id': studentStatus[student['id']]['id'],
                            'marks': studentStatus[student['id']]['marks'],
                            'read_time': studentStatus[student['id']]['read_time']})
        else:
            student.update({'status': STATUS['NOT_COMPLETED'], 'student_diary_id': None, 'marks': None})
    if self.request.GET.get('limit'):
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return {'data': data}


def get_diary_student(self):
    response = SharedService.read_data(self)
    student = self.request.user.student.pk if self.request.user.student else self.request.GET.get('student')
    if student:
        student_detail = Student.objects.get(id=student)
        student_serializer = StudentListSerializer(student_detail).data
        student_diary = StudentDiary.objects.filter(diary=self.kwargs['pk'], student=student).first()
        if student_diary and not student_diary.read_time:
            student_diary.read_time = datetime.now()
            student_diary.save()
        if student_diary:
            student_serializer.update({'marks': student_diary.marks, 'status': student_diary.status})
        else:
            student_serializer.update({'marks': None, 'status': STATUS['NOT_COMPLETED']})
        response['data']['student_details'] = student_serializer
    return response

def get_diary_standard_wise(self, extra_params={}):
    academic_year = extra_params['academic_year'] if 'academic_year' in extra_params else self.request.GET.get('academic_year')
    created_date = extra_params['created_date'] if 'created_date' in extra_params else self.request.GET.get('created_date')
    due_date = extra_params['due_date'] if 'due_date' in extra_params else self.request.GET.get('due_date')
    if not academic_year:
        raise exceptions.ValidationError('academic_year is mandatory')
    standard_section_data = get_standard_and_section(self, academic_year)
    standard_section_strength = Enrollment.objects.filter(
       standard_section__in=standard_section_data['standard_section_ids'],
       student__is_active=True
    ).values(
        'standard_section', 'student'
    )
    standard_section_strength_mapping = {}
    for standard_section in standard_section_strength:
        if standard_section['standard_section'] not in standard_section_strength_mapping:
            standard_section_strength_mapping[standard_section['standard_section']] = {'count': 0}
        standard_section_strength_mapping[standard_section['standard_section']]['count'] += 1
    standard_sect_filter = {'standard_section__in':standard_section_data['standard_section_ids']}
    if due_date:
        standard_sect_filter['diary__due_date'] = due_date
    if created_date:
        standard_sect_filter['diary__created__date'] = created_date
    standard_wise_diary = StandardSectionDiary.objects.filter(
        **standard_sect_filter
    ).values(
        'diary', 'diary__title', 'diary__description', 'diary__is_student',
        'diary__marks', 'diary__due_date', 'diary__status', 'diary__created_user',
        'standard_section', 'diary__is_student_can_update', 'diary__created',
        'diary__created_user__staff__first_name', 'diary__created_user__staff__middle_name',
        'diary__created_user__staff__last_name', 'diary__subject__name'
    )
    del standard_section_data['standard_section_ids']
    diary_ids = []
    standard_sec_wise_diary_mapping = {}
    for standard in standard_wise_diary:
        diary_ids.append(
            standard['diary']
        )
        if standard['standard_section'] not in standard_sec_wise_diary_mapping:
            standard_sec_wise_diary_mapping[standard['standard_section']] = []
        standard_sec_wise_diary_mapping[standard['standard_section']].append(standard)
    student_diary_data = StudentDiary.objects.filter(
        diary__in=diary_ids
    ).values(
        'status','marks', 'diary', 'student', 'read_time'
    )
    diary_student_status_mapping = {}
    for student_diary in student_diary_data:
        if student_diary['diary'] not in diary_student_status_mapping:
            diary_student_status_mapping[student_diary['diary']] = {
                'number_of_students': 0, 'number_of_students_read': 0
            }
        diary_student_status_mapping[student_diary['diary']]['number_of_students'] += 1
        if student_diary['read_time']:
            diary_student_status_mapping[student_diary['diary']]['number_of_students_read'] += 1
    for standard_section in standard_section_data['data']:
        for section_data in standard_section['sections']:
            section_data['strength'] = 0
            if section_data['standard_section'] in standard_section_strength_mapping:
                section_data['strength'] = standard_section_strength_mapping[section_data['standard_section']]['count']
            if section_data['standard_section'] in standard_sec_wise_diary_mapping:
                section_data['diary_data'] = standard_sec_wise_diary_mapping[section_data['standard_section']]
                for diary_data in section_data['diary_data']:
                    if diary_data['diary'] in diary_student_status_mapping:
                        diary_data.update(diary_student_status_mapping[diary_data['diary']])
    return standard_section_data

        
    