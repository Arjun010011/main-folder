from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import Q, F, Count, Sum
from rest_framework import exceptions

from apps.classes.models.enrollment import Enrollment
from apps.diary.models import StandardSectionDiary, StaffDiary, StudentDiary, DocumentDiary
from apps.diary.models.diary import Diary, StudentDiaryRemarkMapping, StudentDiarySubjectMapping, StudentDiaryTitleMapping
from apps.diary.serializers import (StandardSectionDiarySerializer, StaffDiarySerializer, StudentDiaryRemarkMappingSerializer, StudentDiarySerializer,
                                    DocumentDiarySerializer, StudentDiarySubjectMappingSerializer, StudentDiaryTitleMappingSerializer)
from apps.diary.services.diary_status import check_permission
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.services import FormdefinitionService, NotificationBodyTemplate, SharedService, UploadTypeService
from apps.staffs.models.staff import Staff
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.notification.services.notification_service import send_notification
from apps.shared.services_shared.common import get_full_name
from apps.classes.models.subject import AssignSubject
from apps.students.services.download_hw_excel import download_diary_student_data
import os
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.shared.services import NotificationBodyTemplate, PDFService, SharedService, ConfigurationService,CounterService, add_google_map_data

STATUS = {'COMPLETED': 'Completed', 'NOT_COMPLETED': 'Not Completed', 'SUBMITTED': 'Submitted', 'RESUBMIT': 'Resubmit'}


def add_update_diary_data(self, data, update=False, **kwargs):
    student_ids_for_notification = []
    user = self.request.user if self.request.user.pk else None
    if user.is_superuser:
        raise exceptions.ValidationError('Super user do not have permission to perform this action.')
    instance = None
    if update:
        instance = self.get_object()
        check_permission(self, instance, None, user, **{'update': True})
        if instance.status == STATUS['COMPLETED']:
            raise exceptions.ValidationError('Home work status is completed. Unable to update.')
    SharedService.duplicate_list_one_object(data['standard_details'], 'standard_section')
    SharedService.duplicate_list_one_object(data['staff_details'], 'staff')
    SharedService.duplicate_list_one_object(data['document_details'], 'document')
    SharedService.duplicate_list_one_object(data['student_details'], 'student')

    if update is False:
        data['created_user'] = user.pk
    data['status'] = STATUS['NOT_COMPLETED']
    data['is_student'] = True if data['student_details'] else False
    partial = kwargs.pop('partial', False)
    serializer = self.get_serializer(data=data, instance=instance, partial=partial)
    serializer.is_valid(raise_exception=True)
    diary_id = None
    is_abacus_enabled = FormdefinitionService.get_formdefintion_data(self, 'diary_form', 'is_abacus_enabled')
    with transaction.atomic(using=get_current_db_name()):
        diary = serializer.save()
        diary_id = diary.pk
        user_ids = FormdefinitionService.get_formdefintion_data(self, 'diary_form', 'assign_teachers')
        if user_ids:
            staff_data = Staff.objects.filter(users__in=str(user_ids).split(',')).values('id')
            existing_staff_ids = []
            for staff_row in data['staff_details']:
                existing_staff_ids.append(staff_row['staff'])
            for staff in staff_data:
                if staff not in existing_staff_ids:
                    data['staff_details'].append({
                        'staff': staff['id'], 'evaluate': True, 'update': True, 'view': True
                    })
        if data['standard_details'] or data['deleted_standard_details']:
            standardSection = StandardSectionDiary.objects.all()
            standardSection.filter(id__in=data['deleted_standard_details']).delete()
            for standard in data['standard_details']:
                standard['diary'] = diary.pk
                if 'id' in standard:
                    instance = standardSection.get(id=standard['id'])
                else:
                    instance = None
                serializer = StandardSectionDiarySerializer(data=standard, instance=instance, partial=partial)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        if data['staff_details'] or data['deleted_staff_details']:
            staffDiary = StaffDiary.objects.all()
            staffDiary.filter(id__in=data['deleted_staff_details']).delete()
            for staff in data['staff_details']:
                staff['diary'] = diary.pk
                if 'id' in staff:
                    instance = staffDiary.get(id=staff['id'])
                else:
                    instance = None
                serializer = StaffDiarySerializer(data=staff, instance=instance, partial=partial)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        if data['student_details'] or data['deleted_student_details']:
            studentDiary = StudentDiary.objects.all()
            studentDiary.filter(id__in=data['deleted_student_details']).delete()
            for student in data['student_details']:
                student['diary'] = diary.pk
                if 'id' in student:
                    instance = studentDiary.get(id=student['id'])
                else:
                    student['status'] = STATUS['NOT_COMPLETED']
                    instance = None
                    student_ids_for_notification.append(student['student'])
                serializer = StudentDiarySerializer(data=student, instance=instance, partial=partial)
                serializer.is_valid(raise_exception=True)
                student_diary = serializer.save()
                if is_abacus_enabled:
                    StudentDiarySubjectMapping.objects.filter(student_diary=student_diary).delete()
                    StudentDiaryTitleMapping.objects.filter(student_diary=student_diary).delete()
                    StudentDiaryRemarkMapping.objects.filter(student_diary=student_diary).delete()
                    student_diary_subject_mapping = []
                    student_diary_title_mapping = []
                    student_diary_remark_mapping = []
                    for subject in student['subject_ids']:
                        student_diary_subject_mapping.append({
                            'student_diary': student_diary.id,
                            'subject': subject
                        })
                    for title in student['diary_titles']:
                        student_diary_title_mapping.append({
                            'student_diary': student_diary.id,
                            'diary_title': title
                        })
                    for remark in student['remarks']:
                        student_diary_remark_mapping.append({
                            'student_diary': student_diary.id,
                            'remark': remark
                        })
                    stu_dia_sub_map = StudentDiarySubjectMappingSerializer(data=student_diary_subject_mapping, many=True)
                    stu_dia_sub_map.is_valid(raise_exception=True)
                    stu_dia_sub_map.save()
                    stu_dia_tit_map =  StudentDiaryTitleMappingSerializer(data=student_diary_title_mapping, many=True)
                    stu_dia_tit_map.is_valid(raise_exception=True)
                    stu_dia_tit_map.save()
                    stu_dia_rem_map = StudentDiaryRemarkMappingSerializer(data=student_diary_remark_mapping, many=True)
                    stu_dia_rem_map.is_valid(raise_exception=True)
                    stu_dia_rem_map.save()
             
        if data['document_details'] or data['deleted_document_details']:
            documentDiary = DocumentDiary.objects.all()
            documentDiary.filter(id__in=data['deleted_document_details']).delete()
            docId = list()
            for document in data['document_details']:
                document['diary'] = diary.pk
                document['from_diary'] = True
                if 'id' in document:
                    instance = documentDiary.get(id=document['id'])
                else:
                    document['user'] = user.pk
                    instance = None
                serializer = DocumentDiarySerializer(data=document, instance=instance, partial=partial)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                docId.append(document['document'])
            UploadTypeService.make_document_active(docId, True)
    if student_ids_for_notification:
        SharedService.custom_thread(send_notification_update_diary, self, student_ids_for_notification, diary)
    return {'Reason': 'Data updated Successfully!', 'id': diary_id}

def send_notification_update_diary(self, student_ids_for_notification, diary):
    studentData = User.objects.filter(student__in=student_ids_for_notification).values(
        'id', 'student__email', 'student__mobile_num'
    )
    customized_data = []
    notification_obj = NotificationBodyTemplate('diary_create')
    for student in studentData:
        temp = {
            'title': diary.title
        }
        body_email = notification_obj.select_template('email', temp)
        body_sms = notification_obj.select_template('sms', temp)
        body_push = notification_obj.select_template('push', temp)
        customized_data.append(
            {'push_subject': 'New HomeWork', 'push_body': body_push, 'push_notification': 1, 'user_id': student['id'],
            'extra_params': {'params': {'diary_id': diary.pk, 'screen':'student_diary'}}})
        if student['student__mobile_num']:
            customized_data.append({
                'mobile_number': student['student__mobile_num'], 'sms_body': body_sms,
                'sms_notification': 1, 'user_id': student['id']
            })
        if student['student__email']:
            customized_data.append({'email': student['student__email'], 'user_id': student['id'], 'email_subject': None,
                'email_body': body_email,'email_notification':1})
    if customized_data:
        send_notification('diary_create', body=None, customizedData=customized_data)

def get_diary_details(self, queryset, values, user, student_statuses=None):
    student_diary = standard_section_diary = None
    student_diary = StudentDiary.objects.all()
    if student_statuses:
        student_diary = student_diary.filter(status__in=student_statuses)
    standard_section_diary = StandardSectionDiary.objects.all()
    if user.is_staff:
        staff_diary = StaffDiary.objects.filter(staff=user.staff.pk)
        for i, j in zip(queryset, values):
            if i.created_user == user:
                j['update'] = True
                j['evaluate'] = True
            else:
                sd = staff_diary.filter(diary=j['id']).first()
                if sd:
                    j['update'] = sd.update
                    j['evaluate'] = sd.evaluate
            student = student_diary.filter(diary=j['id'])
            ssd = standard_section_diary.filter(diary=j['id'])
            if i.is_student:
                total_student = student.aggregate(total_student=Count('diary'))
            else:
                total_student = ssd.aggregate(total_student=Sum('standard_section__strength'))
            submitted_student = student.aggregate(
                submitted_student=Count('diary', filter=Q(status__in=['Submitted'])))
            j.update(**total_student, **submitted_student, **{
                'standard_codename': ssd.values_list('standard_section__standard__codename', flat=True).distinct()})
    else:
        for i, j in zip(queryset, values):
            student = student_diary.filter(diary=j['id'], student=user.student).first()
            if student:
                j.update({'student_status': student.status})
            else:
                j.update({'student_status': STATUS['NOT_COMPLETED']})
    return values


def get_values(self, queryset, values, user, student_statuses=None):
    
    student_diary = standard_section_diary = None
    student_diary = StudentDiary.objects.all()
    if student_statuses:
        student_diary = student_diary.filter(status__in=student_statuses)
    standard_section_diary = StandardSectionDiary.objects.all()
    if user.is_staff:
        staff_diary = StaffDiary.objects.filter(staff=user.staff.pk)
        for i, j in zip(queryset, values):
            if i.created_user == user:
                j['update'] = True
                j['evaluate'] = True
            else:
                sd = staff_diary.filter(diary=j['id']).first()
                if sd:
                    j['update'] = sd.update
                    j['evaluate'] = sd.evaluate
            student = student_diary.filter(diary=j['id'])
            ssd = standard_section_diary.filter(diary=j['id'])
            if i.is_student:
                total_student = student.aggregate(total_student=Count('diary'))
            else:
                total_student = ssd.aggregate(total_student=Sum('standard_section__strength'))
            submitted_student = student.aggregate(
                submitted_student=Count('diary', filter=Q(status__in=['Submitted'])))
            j.update(**total_student, **submitted_student, **{
                'standard_codename': ssd.values_list('standard_section__standard__codename', flat=True).distinct()})
    else:
        for i, j in zip(queryset, values):
            student = student_diary.filter(diary=j['id'], student=user.student).first()
            if student:
                j.update({'student_status': student.status})
            else:
                j.update({'student_status': STATUS['NOT_COMPLETED']})
    return values


def get_home_work(self, queryset, user, fromDate, toDate):
    subject = self.request.GET.get('subject')
    studentStatus = None
    if subject:
        queryset = queryset.filter(subject__in=subject.split(','))
    if user.is_staff:
        if self.request.GET.get('section'):
            queryset = queryset.filter(diary_standard__standard_section__section=self.request.GET.get('section'),
                                       diary_standard__standard_section__standard=self.request.GET.get('standard'))
        elif self.request.GET.get('standard'):
            queryset = queryset.filter(diary_standard__standard_section__standard=self.request.GET.get('standard'))
        queryset = queryset.filter(
            Q(created_user=user) | Q(diary_staff__staff=user.staff, diary_staff__view=True)).distinct()
        if self.request.GET.get('student_status'):
            student_status = [STATUS[s] for s in self.request.GET.get('student_status').split(',')]
            queryset = queryset.filter(diary_student__status__in=student_status)
    else:
        student_query_filter = {'diary_student__student': user.student}
        studentStandardQueryset = queryset.filter(is_student=False,
                                                  diary_standard__standard_section__enrollments__student=user.student)
        if self.request.GET.get('student_status'):
            studentStatus = [STATUS[s] for s in self.request.GET.get('student_status').split(',')]
            student_query_filter['diary_student__status__in'] = studentStatus
            studentQueryset = queryset.filter(**student_query_filter)
            studentStandard = studentStandardQueryset.filter(diary_student__status__in=studentStatus)
            if STATUS['NOT_COMPLETED'] in studentStatus:
                studentStandardQueryset = studentStandardQueryset | studentStandard
            else:
                studentStandardQueryset = studentStandard
            queryset = (studentQueryset | studentStandardQueryset).distinct()
    if not self.request.GET.get('ordering'):
        queryset = queryset.order_by('due_date', 'created')
    if self.request.GET.get('week_data'):
        today = datetime.now().date()
        tomorrow = today + timedelta(days=1)
        startDate = today - timedelta(days=today.weekday())
        endDate = startDate + timedelta(days=6)
        todayqueryset = queryset.filter(due_date=today)
        todayValues = get_values(self, todayqueryset, user)
        tomorrowqueryset = queryset.filter(due_date=tomorrow)
        tomorrowValues = get_values(self, tomorrowqueryset, user)
        weekqueryset = queryset.filter(due_date__range=(startDate, endDate)).exclude(due_date=today).exclude(
            due_date=tomorrow)
        weekValues = get_values(self, weekqueryset, user)
        return {'data': {'today': todayValues, 'tomorrow': tomorrowValues, 'week': weekValues}}
    if fromDate and toDate:
        queryset = queryset.filter(due_date__range=(fromDate, toDate))
    dataValues = get_values(self, queryset.distinct(), user, studentStatus)
    if self.request.GET.get('limit'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, dataValues,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return {'data': dataValues}


def get_home_work_new(self, extra_params={}):
    user = self.request.user if self.request.user.pk else None
    download_pdf = self.request.GET.get('download_pdf', False)
    if user.is_superuser:
        raise exceptions.ValidationError('Super user dont have permission to perform this action')
    status = []
    ordering = None
    #first extra_params will be given preference
    from_date = extra_params.get('from_date')
    to_date = extra_params.get('to_date')
    filter_query = {'is_active': True}
    if not from_date:
        from_date  = self.request.GET.get('from_date')
    if not to_date:
        to_date = self.request.GET.get('to_date')
    if from_date and to_date:
        filter_query['due_date__range'] = (from_date, to_date)
    status = extra_params.get('status') if extra_params.get('status') else self.request.GET.get('status')
    if status:
        status = status.split(',')
        status = [STATUS[sta] for sta in status]
        filter_query['status__in'] = status
    search = extra_params.get('search') if extra_params.get('search') else self.request.GET.get('search')
    subjects = extra_params.get('subject') if extra_params.get('subject') else self.request.GET.get('subject')
    section = extra_params.get('section') if extra_params.get('section') else self.request.GET.get('section')
    standard = extra_params.get('standard') if extra_params.get('standard') else self.request.GET.get('standard')
    student_status = extra_params['student_status'] \
        if extra_params.get('student_status') else self.request.GET.get('student_status')
    if student_status:
        student_status = [STATUS[s] for s in student_status.split(',')]
    if extra_params.get('ordering'):
        ordering = [extra_params['ordering']]
    if not ordering and self.request.GET.get('ordering'):
        ordering = [self.request.GET.get('ordering')]
    allowed_ordering = {
        'title': 'title', 'subject__name': 'subject__name', 'created_user__staff__first_name': 'created_user__staff__first_name',
        'subject_name': 'subject__name', 'staff_first_name': 'created_user__staff__first_name'
    }
    if ordering: #ignoring if not valid ordering
        new_ordering = []
        for order in ordering:
            if order.replace('-', '') in allowed_ordering:
                new_ordering.append(allowed_ordering[order])
        ordering = new_ordering
    q_query  = ()
    values = ['id', 'description', 'title','due_date','subject_name','marks','staff_first_name','staff', 'status', 'is_student_can_update', 'created_user_id', 'created']
    annotate = {
        'subject_name': F('subject__name'), 'staff_first_name': F('created_user__staff__first_name'),
        'staff': F('created_user__staff')
    }
    if search:
        q_query = Q(title__icontains=self.request.GET.get('search')) | Q(description__icontains=self.request.GET.get('search'))
        q_query = q_query | Q(subject__name__icontains=self.request.GET.get('search'))
    if subjects:
        filter_query['subject__in'] = [int(s) for s in subjects.split(',')]
    if user.is_staff:
        if section:
            filter_query['diary_standard__standard_section__section__in'] = section.split(',')
        if standard:
            filter_query['diary_standard__standard_section__standard'] = standard
        if q_query:
            q_query = Q(q_query) & Q(Q(created_user=user) | Q(diary_staff__staff=user.staff, diary_staff__view=True))
        else:
            q_query = Q(Q(created_user=user) | Q(diary_staff__staff=user.staff, diary_staff__view=True))
    else:
        filter_query['diary_student__student'] = user.student
    if student_status:
        filter_query['diary_student__status__in'] = student_status
    if not ordering:
        ordering = ['-due_date', 'created']
    if q_query:
        data_values = Diary.objects.all().filter(q_query, **filter_query).order_by(*ordering).values('diary_student__diary').annotate(
            **annotate
        ).values(*values).distinct()
    else:
        data_values = Diary.objects.all().filter(**filter_query).order_by(*ordering).values('diary_student__diary').annotate(
            **annotate
        ).values(*values).distinct()
    is_abacus_enabled = FormdefinitionService.get_formdefintion_data(self, 'diary_form', 'is_abacus_enabled')
    pagination = False
    if self.request.GET.get('limit'):
        pagination = True
        data_values, count, next_page, previous_page = SharedService.custom_pagination(self, data_values,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
    elif is_abacus_enabled and download_pdf:
        return get_abacus_home_work(self, data_values)
    #before returning the data adding the permissions and total student summary data in the list
    diary_ids = []
    for data in data_values:
        diary_ids.append(
            data['id']
        )
    diary_student_data = StudentDiary.objects.filter(diary__in=diary_ids).values(
        'diary', 'status', 'marks', 'student'
    )
    standard_values = StandardSectionDiary.objects.filter(diary_id__in=diary_ids).values(
        'diary_id',
        standard_name=F('standard_section__standard__name'),
        section_name=F('standard_section__section__name')
    )
    diary_standard_data = {}
    for diary_std in standard_values:
        if diary_std["diary_id"] not in diary_standard_data:
            diary_standard_data[diary_std["diary_id"]] = []
        diary_standard_data[diary_std["diary_id"]].append(diary_std)

    if self.request.user.is_staff:
        diary_permission_mapping = {s['diary']: s for s in StaffDiary.objects.filter(
            diary__in=diary_ids, staff=self.request.user.staff.id
        ).values('view', 'update', 'evaluate', 'diary')}
        diary_student_status_mapping = {}
        diary_student_mapping = {}
        for diary_student in diary_student_data:
            if diary_student['diary'] not in diary_student_mapping:
                diary_student_mapping[diary_student['diary']] = []
            diary_student_mapping[diary_student['diary']].append(diary_student)
            if diary_student['diary'] not in diary_student_status_mapping:
                diary_student_status_mapping[diary_student['diary']] = {
                    'Not Completed': 0, 'Submitted': 0, 'Resubmit': 0, 'Completed': 0
                }
            diary_student_status_mapping[diary_student['diary']][diary_student['status']] += 1
        for idx, row_data in enumerate(data_values):
            row_data['standards'] = diary_standard_data.get(row_data['id'], [])
            if row_data['created_user_id'] == user.id:
                data_values[idx]['update'] = True
                data_values[idx]['evaluate'] = True
                data_values[idx]['view'] = True
            elif row_data['id'] in diary_permission_mapping:
                data_values[idx]['update'] = diary_permission_mapping[row_data['id']]['update']
                data_values[idx]['evaluate'] = diary_permission_mapping[row_data['id']]['evaluate']
                data_values[idx]['view'] = diary_permission_mapping[row_data['id']]['view']
            if row_data['id'] in diary_student_mapping:
                data_values[idx]['total_student'] = len(diary_student_mapping[row_data['id']])
            if row_data['id'] in diary_student_status_mapping:
                data_values[idx]['submitted_student'] = diary_student_status_mapping[row_data['id']]['Completed']
    else:
        diary_student_status = {s['diary']: s for s in StudentDiary.objects.filter(diary__in=diary_ids, student=self.request.user.student).values(
            'diary', 'status', 'marks', 'student'
        )}
        for idx, row_data in enumerate(data_values):
            row_data['standards'] = diary_standard_data.get(row_data['id'], [])
            if row_data['id'] in diary_student_status:
                data_values[idx]['student_status'] = diary_student_status[row_data['id']]['status']
    if pagination:
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data_values}}
    else:
        return {'data': data_values}

def get_abacus_home_work(self, data):
    try:
        diary_ids = [row_data['id'] for row_data in data]
        student_diary_data = StudentDiary.objects.filter(
            diary__in=diary_ids,
            diary__due_date__gte = self.request.GET.get('from_date'),
            diary__due_date__lte = self.request.GET.get('to_date')
        ).values(
            'student__first_name', 'student__middle_name', 'student__last_name',
            'diary__due_date', 'diary', 'student', 'id'
        )
        student_ids = []
        student_diary_ids = []
        for student_diary in student_diary_data:
            student_ids.append(student_diary['student'])
            student_diary_ids.append(student_diary['id'])
        diary_subject_mapping = StudentDiarySubjectMapping.objects.filter(student_diary__in=student_diary_ids).values('student_diary', 'subject__name')
        diary_title_mapping = StudentDiaryTitleMapping.objects.filter(student_diary__in=student_diary_ids).values('student_diary', 'diary_title__name')
        diary_remark_mapping = StudentDiaryRemarkMapping.objects.filter(student_diary__in=student_diary_ids).values('student_diary', 'remark__name')
        diary_subject_mapping_data = {}
        diary_title_mapping_data = {}
        diary_remark_mapping_data = {}
        for diary_subject in diary_subject_mapping:
            if diary_subject['student_diary'] not in diary_subject_mapping_data:
                diary_subject_mapping_data[diary_subject['student_diary']] = []
            diary_subject_mapping_data[diary_subject['student_diary']].append(diary_subject['subject__name'])
        for diary_title in diary_title_mapping:
            if diary_title['student_diary'] not in diary_title_mapping_data:
                diary_title_mapping_data[diary_title['student_diary']] = []
            diary_title_mapping_data[diary_title['student_diary']].append(diary_title['diary_title__name'])
        for diary_remark in diary_remark_mapping:
            if diary_remark['student_diary'] not in diary_remark_mapping_data:
                diary_remark_mapping_data[diary_remark['student_diary']] = []
            diary_remark_mapping_data[diary_remark['student_diary']].append(diary_remark['remark__name'])
        academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today())
        enrollment_data = Enrollment.objects.filter(student__in=student_ids, standard_section__academic_year=academic_year).values(
            'standard_section__standard__name',
            'standard_section__section__name',
            'student',
            'standard_section__standard__branch__name'
        )
        student_standard_section_mapping = {}
        for enrollment in enrollment_data:
            student_standard_section_mapping[enrollment['student']] = {
                'standard_name': enrollment['standard_section__standard__name'],
                'section_name': enrollment['standard_section__section__name'],
                'branch_name': enrollment['standard_section__standard__branch__name']
            }
        for student_diary in student_diary_data:
            student_diary['standard_name'] = student_standard_section_mapping[student_diary['student']]['standard_name']
            student_diary['branch'] = student_standard_section_mapping[student_diary['student']]['branch_name']
            student_diary['section_name'] = student_standard_section_mapping[student_diary['student']]['section_name']
            student_diary['name'] = get_full_name(student_diary['student__first_name'], student_diary['student__middle_name'], student_diary['student__last_name'])
            student_diary['subjects'] = diary_subject_mapping_data[student_diary['id']] if student_diary['id'] in diary_subject_mapping_data else []
            student_diary['titles'] = diary_title_mapping_data[student_diary['id']] if student_diary['id'] in diary_title_mapping_data else []
            student_diary['remarks'] = diary_remark_mapping_data[student_diary['id']] if student_diary['id'] in diary_remark_mapping_data else []
        pdf_template_path = 'homeworkAbacus.html'
        if self.request.GET.get('long_running_process'):
            # For long running process - save to storage and return URL
            response = PDFService.return_pdf_report(self, {'student_list': student_diary_data}, 'homeworkAbacus', pdf_template_path, True,self.request.GET.get('document_type'))
            url = UploadTypeService.upload_local_file(response, path='homework_pdfs')
            if os.path.exists(response):
                os.remove(response)
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            # Immediate response
            response = PDFService.receipt(self, {'student_list': student_diary_data}, 'homeworkAbacus', pdf_template_path, False)
            return response
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': e.args[:250]})
        else:
            raise e

def get_diary_list(self):
    user = self.request.user if self.request.user.pk else None
    if user.is_superuser:
        raise exceptions.ValidationError('Super user do not have permission to perform this action.')
    status = []
    from_date  = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    if self.request.GET.get('status'):
        status = self.request.GET.get('status').split(',')
        status = [STATUS[sta] for sta in status]
    filter_query = {'is_active' : True}
    if status:
        filter_query['status__in'] = status
    queryset = self.filter_queryset(self.get_queryset()).filter(**filter_query)
    if self.request.GET.get('search'):
        queryset = queryset.filter(
            Q(title__icontains=self.request.GET.get('search')) | Q(description__icontains=self.request.GET.get('search'))
        )
    return get_home_work(self, queryset, user, from_date, to_date)


def delete_diary(self):
    instance = self.get_object()
    check_permission(self, instance, **{'update': True})
    if self.get_object().status == STATUS['COMPLETED']:
        raise exceptions.ValidationError(f'Home work status is completed. Unable to delete.')
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    response = SharedService.soft_delete_data(self)
    return response
