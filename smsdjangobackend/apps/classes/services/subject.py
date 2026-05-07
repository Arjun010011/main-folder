from asyncio import exceptions
from django.db import transaction
from django.db.models import F, Q
from rest_framework.exceptions import ValidationError

from apps.classes.models import StandardSectionMapping, Subject, AssignSubject, Enrollment
from apps.classes.models.subject import (CumulativeType, SubjectBranchMapping, SubjectStudent,CourseOutcome,ProgramOutcome,SubjectCourseOutcomeProgramMappingMatrix,SubjectCourseOutcomeMapping,SubjectDetails,
                                        SubjectProgramOutcomeMapping,SubjectProgramSpecificOutcomeMapping,SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix,ProgramSpecificOutcome,
                                        SubjectTeachingHourMapping,SubjectExamDetails,SubjectSubjectTypeMapping,SubjectProgramEducationalObjectives,ProgramEducationalObjectives,
                                        SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix)
from apps.classes.models.staff_subject import StaffSubjectDetails
from apps.exams.models.schedule import ExamSchedule
from apps.hr.models.timeTable import TimeTableSchedule
from apps.hr.models.staffTeachingHour import StaffTeachingHour
from apps.shared.models.approval import ApproveStatus
from apps.students.models import Student
from apps.classes.serializers import (SubjectBranchMappingSerializer, SubjectSerializer, SubjectProgramSpecificOutcomeMappingSerializer, SubjectSubjectTypeMappingSerializer,SubjectProgramEducationalObjectivesSerializer,
                                      SubjectProgramOutcomeMappingSerializer,SubjectCourseOutcomeMappingSerializer,SubjectDetailsSerializer,SubjectExamDetailsSerializer,SubjectTeachingHourMappingSerializer,
                                      SubjectCourseOutcomeProgramMappingMatrixSerializer,SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrixSerializer,
                                      SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrixSerializer)
from apps.shared.services import SharedService, ConfigurationService
from apps.tenants.services.middlewares import get_current_db_name
from apps.diary.models import Diary
from django.contrib.contenttypes.models import ContentType

def add_subject(self, data):
    data_list = []
    name_list = []
    code_list = []
    for subject in data:
        name = subject['name']
        if 'subject_code' in subject and subject['subject_code']:
            code_list.append(subject['subject_code'])
            name += '____' + subject['subject_code']
        name_list.append(name)
    if len(name_list) != len(set(name_list)):
        raise ValidationError('Duplicate subject(s) found.')
    if len(code_list) != len(set(code_list)):
        raise ValidationError('Duplicate subject codes found.')
    existing_data = self.get_queryset().filter(is_active=True).values()
    for existing in existing_data:
        name = existing['name']
        if existing['subject_code']:
            name += '____' + existing['subject_code']
        if existing['name'] in name_list:
            raise ValidationError('Subject name is already exists.')
        if existing['subject_code'] and existing['subject_code'] in code_list:
            raise ValidationError('Subject code is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        for subject in data:
            subject_code = subject['subject_code'] if 'subject_code' in subject else None
            subject_part_type = subject['subject_part_type'] if 'subject_part_type' in subject else None
            saving_data = {}
            if 'branches' in subject and subject['branches']:
                if SubjectBranchMapping.objects.filter(id__in=subject['branches'], subject__name=subject['name'],
                    subject__subject_code=subject_code
                ).exists():
                    raise ValidationError(f'Duplicate subject {subject["name"]}')
            else:
                if Subject.objects.filter(name=subject['name'], is_active=True, subject_code=subject_code).exists():
                    raise ValidationError(f'Duplicate subject {subject["name"]}')
            if subject['is_language']:
                codename = subject['name'].lower()
                num_of_lang = ConfigurationService.get_setting_value('number_of_language')
                start = 0 if num_of_lang == '0' else 1
                for count in range(start, int(num_of_lang) + 1):
                    saving_data = {'name': subject['name'], 'sequence': count, 'is_language': subject['is_language'],
                                     'codename': codename, 'subject_code': subject_code, 'subject_part_type': subject_part_type}
                    response = SharedService.add_data(self, saving_data, False)
                    if 'branches' in subject and subject['branches']:
                        add_or_update_branch_subject(self, subject['branches'], response['data']['id'])
            else:
                saving_data = {
                    'name': subject['name'], 'sequence': None, 'subject_code': subject_code, 'subject_part_type': subject_part_type
                }
                response = SharedService.add_data(self, saving_data, False)
                if 'branches' in subject and subject['branches']:
                    add_or_update_branch_subject(self, subject['branches'], response['data']['id'])
        return {'Reason': 'Data Saved Successfully'}

def add_or_update_branch_subject(self, branch_ids, subject_id):
    existing_branch_ids = SubjectBranchMapping.objects.filter(subject=subject_id).values_list('branch', flat=True)
    savable_branch_ids = set(branch_ids) - set(existing_branch_ids)
    deletable_branch_ids = set(existing_branch_ids) - set(branch_ids)
    if deletable_branch_ids:
        SubjectBranchMapping.objects.filter(branch__in=deletable_branch_ids, subject=subject_id).delete()
    if savable_branch_ids:
        data_to_save = []
        for branch_id in savable_branch_ids:
            data_to_save.append(
                {'branch': branch_id, 'subject': subject_id}
            )
        serializer = SubjectBranchMappingSerializer(data=data_to_save, many=True, allow_empty=False)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    

def update_subject(self, data, **kwargs):
    queryset = self.get_queryset().filter(is_active=True)
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(assignsubject__isnull=False) or instance.filter(
            staffhoursubjectmapping__isnull=False) or instance.filter(subject_diary__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    subName = queryset.filter(name=instance.name, sequence__in=[1, 2, 3])
    if instance.is_language:
        if subName.filter(assignsubject__isnull=False) or subName.filter(
                staffhoursubjectmapping__isnull=False) or subName.filter(subject_diary__isnull=False):
            raise ValidationError('Cannot update some instances of data are referenced.')
        instanceExclude = queryset.exclude(id__in=subName)
    else:
        instanceExclude = queryset.exclude(Q(id=instance.pk)|Q(id__in=subName))
    if instanceExclude.filter(name=data['name'], subject_code=data['subject_code']):
        raise ValidationError(f'Subject name is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        subject_ids = []
        if data['is_language']:
            subject_obj = Subject.objects.get(id=self.kwargs['pk'])
            subject_lower = subject_obj.codename.lower() if subject_obj.codename else subject_obj
            if 'branches' in data and data['branches']:
                if SubjectBranchMapping.objects.filter(id__in=data['branches'], subject__name=data['name'],
                    subject__is_active=True, subject__is_language=True).exclude(subject__codename=subject_lower).exists():
                    raise ValidationError(f'Duplicate subject {data["name"]}')
            elif Subject.objects.filter(name=data['name'], is_active=True, is_language=True).exclude(codename=subject_lower).exists():
                raise ValidationError(f'Duplicate subject {data["name"]}')
        if data['is_language']:
            if instance.is_language:
                codename = data['name'].lower()
                queryset.filter(codename=instance.codename).update(name=data['name'], codename=codename, subject_part_type=data['subject_part_type'], subject_code=data['subject_code'])
            else:
                instance.is_active = False
                instance.save()
                dataList = list()
                codename = data['name'].lower()
                num_of_lang = ConfigurationService.get_setting_value('number_of_language')
                start = 0 if num_of_lang == '0' else 1
                for count in range(start, int(num_of_lang) + 1):
                    dataList.append({'name': data['name'], 'sequence': count, 'is_language': data['is_language'],
                                     'codename': codename, 'subject_part_type': data['subject_part_type'], 'subject_code': data['subject_code']})
                saved_data = SharedService.add_data(self, dataList)
                for saved in saved_data['data']:
                    subject_ids.append(saved['id'])
        else:
            if instance.is_language:
                subName.update(is_active=False)
                data['is_active'] = True
                data['sequence'] = None
                data['codename'] = None
            saved_data = SharedService.update_data(self, data, **kwargs)
            subject_ids.append(saved_data['data']['id'])
        if 'branches' in data and data['branches']:
            for subject in subject_ids:
                add_or_update_branch_subject(self, data['branches'], subject)
        return {'Reason': 'Data updated Successfully!'}


def delete_subject(self):
    queryset = self.get_queryset().filter(is_active=True)
    self.queryset = queryset.filter(id=self.kwargs['pk'])
    if self.queryset.filter(assignsubject__isnull=False) or self.queryset.filter(
            staffhoursubjectmapping__isnull=False) or self.queryset.filter(subject_diary__isnull=False):
        raise ValidationError('Cannot delete some instances of data are referenced.')
    instance = self.get_object()
    if instance.is_language:
        self.queryset = queryset.filter(name=instance.name, sequence__in=[1, 2, 3])
        if self.queryset.filter(assignsubject__isnull=False) or self.queryset.filter(
                staffhoursubjectmapping__isnull=False) or self.queryset.filter(subject_diary__isnull=False):
            raise ValidationError('Cannot update some instances of data are referenced.')
    else:
        self.queryset = queryset.filter(id=self.kwargs['pk'])
    response = SharedService.soft_delete_data(self)
    return response


def read_assigned_sub_classes(self):
    queryset = AssignSubject.objects.filter(
        standard_section__academic_year=self.request.GET.get('academic_year')).order_by(
        F('subject__sequence').asc(nulls_last=True)).annotate(section_id=F('standard_section__section__id'),
                                                              section_name=F('standard_section__section__name'),
                                                              standard_id=F('standard_section__standard__id'),
                                                              standard_name=F('standard_section__standard__name'),
                                                              subject_name=F('subject__name'),
                                                              subject_sequence=F('subject__sequence'),
                                                              subject_is_language=F('subject__is_language')).values(
        'section_id', 'standard_id', 'standard_name', 'subject', 'subject_name', 'id', 'section_name',
        'standard_section', 'subject_sequence', 'subject_is_language')
    resultData = {}
    excludeIds = []
    for x in queryset:
        excludeIds.append(x['standard_section'])
        subjectTmpData = {'id': x['subject'], 'name': x['subject_name'], 'subject_mapping_id': x['id'],
                          'subject_sequence': x['subject_sequence'], 'subject_is_language': x['subject_is_language']}
        if x['standard_id'] in resultData:
            section_index = next((index for (index, d) in enumerate(resultData[x['standard_id']]['sections']) if
                                  d["id"] == x['section_id']), None)
            if section_index is None:
                sectionTmpData = {'id': x['section_id'], 'name': x['section_name'], 'subjects': [],
                                  'standard_section': x['standard_section']}
                sectionTmpData['subjects'].append(subjectTmpData)
                resultData[x['standard_id']]['sections'].append(sectionTmpData)
            else:
                resultData[x['standard_id']]['sections'][section_index]['subjects'].append(subjectTmpData)
        else:
            sectionTmpData = {'id': x['section_id'], 'name': x['section_name'], 'subjects': [],
                              'standard_section': x['standard_section']}
            sectionTmpData['subjects'].append(subjectTmpData)
            tmpResData = {'id': x['standard_id'], 'name': x['standard_name'], 'sections': []}
            tmpResData['sections'].append(sectionTmpData)
            resultData[x['standard_id']] = tmpResData
    unassignedSubClasses = {}
    filter_query = {
        'academic_year': self.request.GET.get('academic_year'),
        'section__is_active':True,
        'standard__is_active': True
    }
    if self.request.GET.get('branch'):
        filter_query['standard__branch'] = self.request.GET.get('branch')
    if self.request.GET.get('board'):
        filter_query['standard__board'] = self.request.GET.get('board')
    queryset = StandardSectionMapping.objects.exclude(id__in=excludeIds).filter(
       **filter_query).values('standard__id', 'standard__name', 'section__id', 'section__name', 'id')
    for i in queryset:
        sectionData = {'id': i['section__id'], 'name': i['section__name'], 'subjects': [],
                       'standard_section': i['id']}
        if i['standard__id'] in unassignedSubClasses:
            unassignedSubClasses[i['standard__id']]['sections'].append(sectionData)
        else:
            unassignedSubClasses[i['standard__id']] = {'id': i['standard__id'], 'name': i['standard__name'],
                                                       'sections': []}
            unassignedSubClasses[i['standard__id']]['sections'].append(sectionData)
    finalResult = []
    for key in resultData:
        if key in unassignedSubClasses:
            resultData[key]['sections'] += unassignedSubClasses[key]['sections']
            del unassignedSubClasses[key]
        finalResult.append(resultData[key])
    for i in unassignedSubClasses:
        finalResult.append(unassignedSubClasses[i])
    return {'data': finalResult}


def add_subject_to_list(standard, subjectIds, subjectList):
    for subject in standard['assigned_subjects']:
        if subject['subject_id'] not in subjectIds:
            subjectList.append(subject)
            subjectIds.append(subject['subject_id'])


def read_assign_subjects(self):
    academic_year = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard')
    response = {'data': {}}
    standard_section_ids = [int(x) for x in self.request.GET.get('standard_section').split(",")] if self.request.GET.get('standard_section') else []
    section_ids = [int(x) for x in self.request.GET.get('section').split(",")] if self.request.GET.get('section') else []
    if self.request.GET.get('for_admission'):
        subjectList = list()
        subjectIds = list()
        if standard_section_ids:
            queryset = self.get_queryset().get(id__in=standard_section_ids)
            serializer = self.get_serializer(queryset)
            add_subject_to_list(serializer.data, subjectIds, subjectList)
        else:
            queryset = self.filter_queryset(self.get_queryset())
            serializer = self.get_serializer(queryset, many=True)
            for standard in serializer.data:
                add_subject_to_list(standard, subjectIds, subjectList)
        response['data'] = subjectList
    else:
        # Fallback: when only academic_year is provided, return grouped assigned subjects for all standards/sections
        if academic_year and not standard and not standard_section_ids and not section_ids:
            return read_assigned_sub_classes(self)
        if academic_year and standard:
            queryset = self.get_queryset().get(academic_year=self.request.GET.get('academic_year'),
                                           standard=self.request.GET.get('standard'),
                                           section__in=section_ids)
        elif standard_section_ids:
            queryset = self.get_queryset().get(id__in=standard_section_ids)
        serializer = self.get_serializer(queryset)
        subjectIds = [i['subject_id'] for i in serializer.data['assigned_subjects']]
        response['data'] = serializer.data
        branch_ids = self.request.GET.get('branch').split(',') if self.request.GET.get('branch') else None
        filter_query = {
            'is_active':True
        }
        if branch_ids:
            filter_query['id__in'] = SubjectBranchMapping.objects.filter(branch__in=branch_ids).values_list('subject', flat=True)
        response['data']['unassignedsubjects'] = Subject.objects.exclude(id__in=subjectIds).filter(
                **filter_query
            ).values(
                subject=F('id'), subject_id=F('id'), subject_name=F('name'),
                subject_codename=F('codename'),
                subject_sequence=F('sequence'), subject_is_language=F('is_language'),
            )
    return response


def copy_assign_subject_data(self, data):
    response = {'Reason': 'Data Added Successfully', 'total_assigned_subjects': 0}

    if not data.get('to_academic_year') or not data.get('from_academic_year') or not data.get('standard_ids'):
        raise exceptions.ValidationError('to_academic_year / from_academic_year / standard_ids are mandatory')

    from_academic_year = data.get('from_academic_year')
    to_academic_year = data.get('to_academic_year')
    standard_ids = data.get('standard_ids')

    # Get previous year enrollment data: student -> section
    from_subjects = AssignSubject.objects.filter(
        standard_section__academic_year=from_academic_year,
    ).values('subject', 'standard_section__section', 'standard_section', 'standard_section__standard')

    previous_standard_section_sub_map = {}
    for prev_sub in from_subjects:
        standard_id = prev_sub['standard_section__standard']
        section_id = prev_sub['standard_section__section']
        if standard_id not in previous_standard_section_sub_map:
            previous_standard_section_sub_map[standard_id] = {}
        if section_id not in previous_standard_section_sub_map[standard_id]:
            previous_standard_section_sub_map[standard_id][section_id] = set()
        previous_standard_section_sub_map[standard_id][section_id].add(prev_sub['subject'])

    standard_section_mapping = StandardSectionMapping.objects.filter(standard__in=standard_ids, academic_year=to_academic_year).values(
        'standard', 'section', 'id'
    )

    # Map current sections to the subjects from the previous academic year
    standard_section_subj_mapping = {}
    for current_standard_sec in standard_section_mapping:
        standard = current_standard_sec['standard']
        section = current_standard_sec['section']
        
        # Only proceed if the subjects exist for the current section in the previous academic year
        if standard in previous_standard_section_sub_map and section in previous_standard_section_sub_map[standard]:
            standard_section_subj_mapping[current_standard_sec['id']] = previous_standard_section_sub_map[standard][section]
 
    # Assign the subjects to the current year's sections
    total_assigned = 0
    for standard_sect_id, subjects in standard_section_subj_mapping.items():
        # Check if the subjects are already assigned to the section in the current academic year
        existing_subjects = AssignSubject.objects.filter(
            standard_section_id=standard_sect_id
        ).values_list('subject', flat=True)

        # Filter out the subjects that are already assigned
        new_subjects = subjects - set(existing_subjects)

        if new_subjects:
            temp = {
                'assigned_subjects': list(new_subjects),
                'standard_section': standard_sect_id
            }
            # Assuming `assign_subject` is defined elsewhere as a method to handle the subject assignment
            result = assign_subject(self, temp)  
            if result:  # if there's any result or indication of success from assign_subject
                total_assigned += len(new_subjects)
                
    # Update the response with the total number of assigned subjects
    response['total_assigned_subjects'] = total_assigned
    return response
    


def assign_subject(self, data, **kwargs):
    from apps.exams.models import ExamSchedule
    data_list = list()
    if len(set(data['assigned_subjects'])) != len(data['assigned_subjects']):
        raise ValidationError('Duplicate Values Found!')
    instance = self.get_queryset().filter(standard_section=data['standard_section'])
    standard_sec_obj = StandardSectionMapping.objects.get(id=data['standard_section'])
    subject_mapping = {subject.subject.id: subject for subject in instance}
    enrolled_students = list(Enrollment.objects.filter(standard_section=data['standard_section']).values_list('student', flat=True))
    student_subjects = {sub['subject']: sub for sub in SubjectStudent.objects.filter(student__in=enrolled_students, academic_year=standard_sec_obj.academic_year).values(
        'subject', 'subject__name'
    )}
    removed_subjects = list(set(subject_mapping.keys())-set(data['assigned_subjects']))
    if removed_subjects:
        diary_data = Diary.objects.filter(subject__in=removed_subjects, diary_standard__standard_section=data['standard_section'])
        if diary_data:
            subject_list = list(diary_data.values_list('subject', flat=True))
            subject_names = ','.join(str(x) for x in Subject.objects.filter(id__in=subject_list).values_list('name', flat=True))
            raise ValidationError(f'Subject are referred in Diary. Not able to edit the subjects [ {subject_names} ]')
        exam_schedule_data = ExamSchedule.objects.filter(subject__in=removed_subjects, standard_section=data['standard_section'])
        if exam_schedule_data:
            subject_list = list(exam_schedule_data.values_list('subject', flat=True))
            subject_names = ','.join(str(x) for x in Subject.objects.filter(id__in=subject_list).values_list('name', flat=True))
            raise ValidationError(f'Subject are referred in Exam. Not able to edit the subjects [ {subject_names} ]')
        timetable_schedule = TimeTableSchedule.objects.filter(subject__in=removed_subjects,time_table_schedule_parent__standard_section=data['standard_section'], is_active=True)
        if timetable_schedule:
            subject_list = list(timetable_schedule.values_list('subject', flat=True))
            subject_names = ','.join(str(x) for x in Subject.objects.filter(id__in=subject_list).values_list('name', flat=True))
            raise ValidationError(f'Subject are referred in Timetable. Not able to edit the subjects [ {subject_names} ]')
    if not data['assigned_subjects']:
        if subject_mapping:
            if Enrollment.objects.filter(standard_section=data['standard_section']):
                raise ValidationError('Unable to delete. Student(s) are enrolled to the section.')
        else:
            raise ValidationError('Subject is not selected.')
    for subject_id in data['assigned_subjects']:
        subject = subject_mapping.get(subject_id, None)
        if subject is None:
            data_list.append({'standard_section': data['standard_section'], 'subject': subject_id})
    serializer = self.get_serializer(data=data_list, many=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic(using=get_current_db_name()):
        for subject_id, subject_data in subject_mapping.items():
            if subject_id not in data['assigned_subjects']:
                subject_data.delete()
        serializer.save()
    return {'Reason': 'Data updated successfully!'}


def assign_subject_student_multiple(self, subject_data, **kwargs):
    if 'student_ids' in subject_data and subject_data['student_ids']:
        for student_id in subject_data['student_ids']:
            subject_data['student'] = student_id
            assign_subject_student(self, subject_data)
    if 'student' in subject_data and subject_data['student']:
        assign_subject_student(self, subject_data, **kwargs)
    return {'Reason': 'Data Saved Successfully'}

def assign_subject_student(self, data, **kwargs):
    dataList = list()
    if len(set(data['assigned_subjects'])) != len(data['assigned_subjects']):
        raise ValidationError('Duplicate Values Found!')
    instance = self.get_queryset().filter(academic_year=data['academic_year'], student=data['student'])
    subject_mapping = {subject.subject.id: subject for subject in instance}
    student_id = data['student']
    standard_section_data = Enrollment.get_student_standard_for_academic(self, data['academic_year'], student_id, True)
    exam_ids = ExamSchedule.objects.filter(
        standard_section=standard_section_data['standard_section'], exam__academic_year=data['academic_year']
    ).values_list('exam', flat=True)
    content_type = ContentType.objects.get(app_label='exams', model='exam').id
    if ApproveStatus.objects.filter(object_id__in=exam_ids, content_type=content_type, approval_status=1):
        raise ValidationError('Exam is already approved for the student , you cant edit the subject')
    for subjectId in data['assigned_subjects']:
        subject = subject_mapping.get(subjectId, None)
        if subject is None:
            dataList.append({'student': data['student'], 'subject': subjectId, 'academic_year': data['academic_year']})
    serializer = self.get_serializer(data=dataList, many=True)
    serializer.is_valid(raise_exception=True)
    with transaction.atomic(using=get_current_db_name()):
        for subject_id, subjectData in subject_mapping.items():
            if subject_id not in data['assigned_subjects']:
                subjectData.delete()
        serializer.save()
    return {'Reason': 'Data updated successfully!'}


def get_assign_subject_student(self):
    res = SharedService.read_data(self, True)
    if self.request.GET.get('is_list'):
        return res
    standardSection = StandardSectionMapping.objects.get(id=self.request.GET.get('standard_section'))
    response = {'data': {}}
    response['data']['assigned_subjects'] = res['data']
    subjectIds = [i['subject'] for i in response['data']['assigned_subjects']]
    unassigned = Subject.objects.filter(assignsubject__standard_section__academic_year=standardSection.academic_year,
                                        assignsubject__standard_section__standard=standardSection.standard).exclude(
        id__in=subjectIds).distinct()
    response['data']['unassigned_subjects'] = SubjectSerializer(unassigned, many=True).data
    return response


def get_subjects_for_standard(self, academicYearId, standardId):
    standardSectionIds = StandardSectionMapping.objects.filter(academic_year=academicYearId,
                                                               standard=standardId).values_list('id', flat=True)
    subjectList = AssignSubject.objects.filter(standard_section__in=standardSectionIds).annotate(subjectId=F('subject'),
                                                                                                 name=F(
                                                                                                     'subject__name')).values(
        'subjectId', 'name').distinct().order_by('subjectId')
    return subjectList


def get_subjects_for_standards(self, academicYearId, standardIds):
    resultData = {}
    subjectList = AssignSubject.objects.filter(standard_section__standard__in=standardIds,
                                               standard_section__academic_year=academicYearId).values('subject',
                                                                                                      subject_code=F(
                                                                                                          'subject__codename'),
                                                                                                      subject_name=F(
                                                                                                          'subject__name'),
                                                                                                      standard=F(
                                                                                                          'standard_section__standard'),
                                                                                                      standard_name=F(
                                                                                                          'standard_section__standard__name'),
                                                                                                      sequence=F(
                                                                                                          'subject__sequence'),
                                                                                                      is_language=F(
                                                                                                          'subject__is_language')).distinct()
    for data in subjectList:
        if data['standard'] in resultData:
            resultData[data['standard']].append(data)
        else:
            resultData[data['standard']] = []
            resultData[data['standard']].append(data)
    return resultData


def get_subjects_for_sections(self, standardSectionIds):
    resultData = {}
    subjectList = AssignSubject.objects.filter(standard_section__in=standardSectionIds).values('subject',
                                                                                               'standard_section',
                                                                                                subject_code=F(
                                                                                                   'subject__codename'),
                                                                                                subject_name=F(
                                                                                                   'subject__name'),
                                                                                                standard=F(
                                                                                                   'standard_section__standard'),
                                                                                                standard_name=F(
                                                                                                   'standard_section__standard__name'),
                                                                                                sequence=F(
                                                                                                   'subject__sequence'),
                                                                                                is_language=F(
                                                                                                   'subject__is_language'),
                                                                                                section_name=F(
                                                                                                   'standard_section__section__name'),
                                                                                                subject_part_type=F(
                                                                                                    'subject__subject_part_type__name'
                                                                                                ),
                                                                                                subject_part_type_id=F(
                                                                                                    'subject__subject_part_type__id'
                                                                                                )
                                                                                                ).distinct()
    for data in subjectList:
        if data['standard_section'] in resultData:
            resultData[data['standard_section']].append(data)
        else:
            resultData[data['standard_section']] = []
            resultData[data['standard_section']].append(data)
    return resultData


""" checks given subject assigned to student or raise error """


def check_subject_assigned_to_student(data):
    studentIds = []
    stdSubMapping = {}
    for studentData in data:
        studentIds.append(studentData['student'])
    studentSubject = SubjectStudent.objects.filter(student__in=studentIds).values('subject', 'student')
    for subjectData in studentSubject:
        if subjectData['student'] not in stdSubMapping:
            stdSubMapping[subjectData['student']] = []
        stdSubMapping[subjectData['student']].append(subjectData['subject'])
    for studentData in data:
        if not studentData['subject_list']:  # when no subjects given
            continue
        if studentData['student'] not in stdSubMapping:
            subjectNameList = Subject.objects.filter(id__in=studentData['subject_list']).values_list('name', flat=True)
            subjectNameList = ','.join(subjectNameList)
            studentObj = Student.objects.get(id=studentData['student'])
            raise ValidationError(
                f'Student {studentObj.first_name} {studentObj.middle_name} {studentObj.last_name} not assigned to {subjectNameList}')
        if set(studentData['subject_list']).difference(set(stdSubMapping[studentData['student']])):
            subjectNameList = Subject.objects.filter(id__in=list(
                set(studentData['subject_list']).difference(set(stdSubMapping[studentData['student']])))).values_list(
                'name', flat=True)
            subjectNameList = ','.join(subjectNameList)
            studentObj = Student.objects.get(id=studentData['student'])
            raise ValidationError(
                f'Student {studentObj.first_name} {studentObj.middle_name} {studentObj.last_name} not assigned to {subjectNameList}')

def validate_cumulative_type(self, data):
    SharedService.duplicate_list_one_object(data,'name')
    SharedService.duplicate_list_one_object(data,'alias')
    existing_data = CumulativeType.objects.filter(is_active=True).values()
    existing_alias_names = {}
    existing_names = {}
    for cum in existing_data:
        existing_alias_names[cum['alias']] = cum
        existing_names[cum['name']] = cum
    for row_data in data:
        if row_data['alias'] in existing_alias_names:
            if 'id' not in row_data or str(row_data['id']) != str(existing_alias_names[row_data['alias']]['id']):
                raise ValidationError(f'{row_data["alias"]} already exists')
        if row_data['name']in existing_names:
            if 'id' not in row_data or str(row_data['id']) != str(existing_names[row_data['name']]['id']):
                raise ValidationError(f'{row_data["name"]} already exists')
            
def add_courseoutcome(self, data):
    name_code_list = []
    name_list = []
    code_list = []
    for course in data:
        name = course['name']
        if 'code' in course and course['code']:
            code_list.append(course['code'])
            name += '____' + course['code']
        name_list.append(course['name'])
        name_code_list.append(name)
    if len(name_list) != len(set(name_list)):
        raise ValidationError('Duplicate Course(s) found.')
    if len(name_code_list) != len(set(name_code_list)):
        raise ValidationError('Duplicate Course(s) found.')
    if len(code_list) != len(set(code_list)):
        raise ValidationError('Duplicate Course codes found.')
    existing_data = self.get_queryset().filter(is_active=True).values()
    for existing in existing_data:
        name = existing['name']
        if existing['code']:
            name += '____' + existing['code']
        if existing['name'] in name_list:
            raise ValidationError('Course name is already exists.')
        if name in name_code_list:
            raise ValidationError('Course name is already exists.')
        if existing['code'] in code_list:
            raise ValidationError('Course code is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        for course in data:
            code = course['code'] if 'code' in course else None
            saving_data = {}
            if CourseOutcome.objects.filter(name=course['name'], is_active=True, code=code).exists():
                raise ValidationError(f'Duplicate Course {course["name"]}')
            saving_data = {
                'name': course['name'],'code': code
            }
            response = SharedService.add_data(self, saving_data, False)
        return {'Reason': 'Data Saved Successfully'}
    
def add_programoutcome(self, data):
    name_code_list = []
    name_list = []
    code_list = []
    for program in data:
        name = program['name']
        if 'code' in program and program['code']:
            code_list.append(program['code'])
            name += '____' + program['code']
        name_list.append(program['name'])
        name_code_list.append(name)
    if len(name_code_list) != len(set(name_code_list)):
        raise ValidationError('Duplicate Program(s) found.')
    if len(name_list) != len(set(name_list)):
        raise ValidationError('Duplicate Program(s) found.')
    if len(code_list) != len(set(code_list)):
        raise ValidationError('Duplicate Program codes found.')
    existing_data = self.get_queryset().filter(is_active=True).values()
    for existing in existing_data:
        name = existing['name']
        if existing['code']:
            name += '____' + existing['code']
        if existing['name'] in name_list:
            raise ValidationError('Program name is already exists.')
        if name in name_code_list:
            raise ValidationError('Course name is already exists.')
        if existing['code'] in code_list:
            raise ValidationError('Program code is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        for program in data:
            code = program['code'] if 'code' in program else None
            saving_data = {}
            if ProgramOutcome.objects.filter(name=program['name'], is_active=True, code=code).exists():
                raise ValidationError(f'Duplicate Program {program["name"]}')
            saving_data = {
                'name': program['name'],'code': code
            }
            response = SharedService.add_data(self, saving_data, False)
        return {'Reason': 'Data Saved Successfully'}
    
def add_programspecificoutcome(self, data):
    name_code_list = []
    name_list = []
    code_list = []
    for program in data:
        name = program['name']
        if 'code' in program and program['code']:
            code_list.append(program['code'])
            name += '____' + program['code']
        name_list.append(program['name'])
        name_code_list.append(name)
    if len(name_code_list) != len(set(name_code_list)):
        raise ValidationError('Duplicate ProgramSpecific(s) found.')
    if len(name_list) != len(set(name_list)):
        raise ValidationError('Duplicate ProgramSpecific(s) found.')
    if len(code_list) != len(set(code_list)):
        raise ValidationError('Duplicate ProgramSpecific codes found.')
    existing_data = self.get_queryset().filter(is_active=True).values()
    for existing in existing_data:
        name = existing['name']
        if existing['code']:
            name += '____' + existing['code']
        if existing['name'] in name_list:
            raise ValidationError('Program Specific name is already exists.')
        if name in name_code_list:
            raise ValidationError('Program Specific name is already exists.')
        if existing['code'] in code_list:
            raise ValidationError('Program Specific code is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        for program in data:
            code = program['code'] if 'code' in program else None
            saving_data = {}
            if ProgramSpecificOutcome.objects.filter(name=program['name'], is_active=True, code=code).exists():
                raise ValidationError(f'Duplicate Program Specific name {program["name"]} Found')
            saving_data = {
                'name': program['name'],'code': code
            }
            response = SharedService.add_data(self, saving_data, False)
        return {'Reason': 'Data Saved Successfully'}
    
def update_programspecificoutcome(self, data, **kwargs):
    queryset = self.get_queryset().filter(is_active=True)
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_program_specific_outcome_mapping_program_specific_outcome__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    progName = queryset.filter(name=instance.name)
    instanceExclude = queryset.exclude(Q(id=instance.pk)|Q(id__in=progName))
    if instanceExclude.filter(name=data['name'], code=data['code']):
        raise ValidationError(f'Program Specific name is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        program_obj = ProgramSpecificOutcome.objects.get(id=self.kwargs['pk'])
        program_lower = program_obj.code.lower() if program_obj.code else program_obj
        if ProgramSpecificOutcome.objects.filter(name=data['name'], is_active=True).exclude(code=program_lower).exists():
            raise ValidationError(f'Duplicate Program Specific name {data["name"]}')
        saved_data = SharedService.update_data(self, data, **kwargs)
        return {'Reason': 'Data updated Successfully!'}
    
def delete_programspecificoutcome(self):
    queryset = self.queryset
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_program_specific_outcome_mapping_program_specific_outcome__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    with transaction.atomic(using=get_current_db_name()):
        deleted_data = SharedService.soft_delete_data(self)
        return {'Reason': 'Data deleted Successfully!'}
    
def update_courseoutcome(self, data, **kwargs):
    queryset = self.get_queryset().filter(is_active=True)
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_course_outcome_mapping_course_outcome__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    if SubjectCourseOutcomeProgramMappingMatrix.objects.filter(subject_course_outcome__course_outcome=self.kwargs['pk']):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    subName = queryset.filter(name=instance.name)
    instanceExclude = queryset.exclude(Q(id=instance.pk)|Q(id__in=subName))
    if instanceExclude.filter(name=data['name'], code=data['code']):
        raise ValidationError(f'Course name is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        course_obj = CourseOutcome.objects.get(id=self.kwargs['pk'])
        course_lower = course_obj.code.lower() if course_obj.code else course_obj
        if CourseOutcome.objects.filter(name=data['name'], is_active=True).exclude(code=course_lower).exists():
            raise ValidationError(f'Duplicate Course {data["name"]}')
        saved_data = SharedService.update_data(self, data, **kwargs)
        return {'Reason': 'Data updated Successfully!'}
    
def delete_courseoutcome(self):
    queryset = self.queryset
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_course_outcome_mapping_course_outcome__isnull=False):
        raise ValidationError('Cannot Delete some instances of data are referenced.')
    if SubjectCourseOutcomeProgramMappingMatrix.objects.filter(subject_course_outcome__course_outcome=self.kwargs['pk']):
        raise ValidationError('Cannot Delete some instances of data are referenced.')
    with transaction.atomic(using=get_current_db_name()):
        deleted_data = SharedService.soft_delete_data(self)
        return {'Reason': 'Data deleted Successfully!'}
    
def update_programoutcome(self, data, **kwargs):
    queryset = self.get_queryset().filter(is_active=True)
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_course_outcome_program_mapping_matrix_program_outcome__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    progName = queryset.filter(name=instance.name)
    instanceExclude = queryset.exclude(Q(id=instance.pk)|Q(id__in=progName))
    if instanceExclude.filter(name=data['name'], code=data['code']):
        raise ValidationError(f'Program name is already exists.')
    with transaction.atomic(using=get_current_db_name()):
        program_obj = ProgramOutcome.objects.get(id=self.kwargs['pk'])
        program_lower = program_obj.code.lower() if program_obj.code else program_obj
        if ProgramOutcome.objects.filter(name=data['name'], is_active=True).exclude(code=program_lower).exists():
            raise ValidationError(f'Duplicate Program {data["name"]}')
        saved_data = SharedService.update_data(self, data, **kwargs)
        return {'Reason': 'Data updated Successfully!'}
    
def delete_programoutcome(self):
    queryset = self.queryset
    instance = queryset.filter(id=self.kwargs['pk'])
    if instance.filter(subject_course_outcome_program_mapping_matrix_program_outcome__isnull=False):
        raise ValidationError('Cannot update some instances of data are referenced.')
    instance = self.get_object()
    with transaction.atomic(using=get_current_db_name()):
        deleted_data = SharedService.soft_delete_data(self)
        return {'Reason': 'Data deleted Successfully!'}
    
def add_subject_course_outcome_program_mapping_matrix(self,data):
    # dup_check_po={}
    # for sub_co_mapping in subject_CO_PO_mapping:
    #     key=str(sub_co_mapping['subject_course_outcome_id'])+'_'+str(sub_co_mapping['subject_program_outcome_id'])+'_'+str(sub_co_mapping['is_active'])
    #     if key not in dup_check_po:
    #         dup_check_po[key] = key
    #     else:
    #         raise ValidationError(f'Duplicate subject and course outcome and Program mapping found')
    # for subject_co in data['co_po_mapping']:
    #     key = str(subject_co['subject_course_outcome'])+'_'+str(subject_co['subject_program_outcome'])+'_'+str(1)
    #     if key not in dup_check_po:
    #         dup_check_po[key]=key
    #     else:
    #         raise ValidationError(f'Duplicate subject and course outcome mapping and program mapping found')
    # dup_check_pso={}
    # for sub_co_mapping in subject_CO_PSO_mapping:
    #     key=str(sub_co_mapping['subject_course_outcome_id'])+'_'+str(sub_co_mapping['subject_program_specific_outcome_id'])+'_'+str(sub_co_mapping['is_active'])
    #     if key not in dup_check_pso:
    #         dup_check_pso[key] = key
    #     else:
    #         raise ValidationError(f'Duplicate subject and course outcome and Program mapping found')
    # for subject_co in data['co_pso_mapping']:
    #     key = str(subject_co['subject_course_outcome'])+'_'+str(subject_co['subject_program_specific_outcome'])+'_'+str(1)
    #     if key not in dup_check_pso:
    #         dup_check_pso[key]=key
    #     else:
    #         raise ValidationError(f'Duplicate subject and course outcome mapping and program mapping found')
    with transaction.atomic(using=get_current_db_name()):
        for co_po in data['co_po_mapping']:
            if 'id' in co_po and co_po['id']:
                instance = SubjectCourseOutcomeProgramMappingMatrix.objects.get(id = co_po['id'])
                serializer = SubjectCourseOutcomeProgramMappingMatrixSerializer(instance=instance, data=co_po, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = SubjectCourseOutcomeProgramMappingMatrixSerializer(data=co_po)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        for co_pso in data['co_pso_mapping']:
            if 'id' in co_pso and co_pso['id']:
                instance = SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix.objects.get(id = co_pso['id'])
                serializer = SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrixSerializer(instance=instance, data=co_pso, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrixSerializer(data=co_pso)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        for co_peo in data['co_peo_mapping']:
            if 'id' in co_peo and co_peo['id']:
                instance = SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix.objects.get(id = co_peo['id'])
                serializer = SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrixSerializer(instance=instance, data=co_peo, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                serializer = SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrixSerializer(data=co_peo)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        return {'Reason': 'Data added Successfully'}

def read_subject_course_outcome_program_mapping_matrix(self,return_dict=False):
    subject_id = self.request.GET.get('subject_id')
    return_response = {'subject_name':''}
    co_po_dict = {}
    co_pso_dict = {}
    co_peo_dict = {}
    subject_CO = SubjectCourseOutcomeMapping.objects.filter(subject_id=subject_id,is_active=True).values('id','subject_id','course_outcome','course_outcome__name','description')
    subject_PO = SubjectProgramOutcomeMapping.objects.filter(subject_id=subject_id,is_active=True).values('id','subject_id','program_outcome','program_outcome__name','description')
    subject_PSO = SubjectProgramSpecificOutcomeMapping.objects.filter(subject_id=subject_id,is_active=True).values('id','subject_id','program_specific_outcome','program_specific_outcome__name','description')
    subject_PEO = SubjectProgramEducationalObjectives.objects.filter(subject_id=subject_id,is_active=True).values('id','subject_id','program_educational_objectives','program_educational_objectives__name','description')
    subject_CO_PO_mapping = SubjectCourseOutcomeProgramMappingMatrix.objects.filter(subject_course_outcome__subject_id = subject_id,is_active=True).values('subject_course_outcome','subject_program_outcome','value',
                                                        'subject_course_outcome__course_outcome__name','subject_course_outcome__subject__name','subject_program_outcome__program_outcome__name','id','subject_course_outcome__subject')
    subject_CO_PSO_mapping = SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix.objects.filter(subject_course_outcome__subject_id = subject_id,is_active=True).values('subject_course_outcome','subject_program_specific_outcome','value',
                                                        'subject_course_outcome__course_outcome__name','subject_course_outcome__subject__name','subject_program_specific_outcome__program_specific_outcome__name','id')
    subject_CO_PEO_mapping = SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix.objects.filter(subject_course_outcome__subject_id = subject_id,is_active=True).values('subject_course_outcome','subject_program_educational_objectives','value',
                                                        'subject_course_outcome__course_outcome__name','subject_course_outcome__subject__name','subject_program_educational_objectives__program_educational_objectives__name','id')
    for subj_co in subject_CO:
        for subj_po in subject_PO:
            key = str(subj_po['id'])+'_'+str(subj_co['id'])
            if key not in co_po_dict:
                co_po_dict[key] = {}
            co_po_dict[key]['course_outcome'] = subj_co['course_outcome']
            co_po_dict[key]['course_outcome_name'] = subj_co['course_outcome__name']
            co_po_dict[key]['subject_course_outcome'] = subj_co['id']
            co_po_dict[key]['program_outcome'] = subj_po['program_outcome']
            co_po_dict[key]['program_outcome_name'] = subj_po['program_outcome__name']
            co_po_dict[key]['subject_program_outcome'] = subj_po['id']
    for subj_co in subject_CO:
        for subj_pso in subject_PSO:
            key = str(subj_pso['id'])+'_'+str(subj_co['id'])
            if key not in co_pso_dict:
                co_pso_dict[key] = {}
            co_pso_dict[key]['course_outcome'] = subj_co['course_outcome']
            co_pso_dict[key]['course_outcome_name'] = subj_co['course_outcome__name']
            co_pso_dict[key]['subject_course_outcome'] = subj_co['id']
            co_pso_dict[key]['program_specific_outcome'] = subj_pso['program_specific_outcome']
            co_pso_dict[key]['program_specific_outcome_name'] = subj_pso['program_specific_outcome__name']
            co_pso_dict[key]['subject_program_specific_outcome'] = subj_pso['id']
    for subj_co in subject_CO:
        for subj_peo in subject_PEO:
            key = str(subj_peo['id'])+'_'+str(subj_co['id'])
            if key not in co_peo_dict:
                co_peo_dict[key] = {}
            co_peo_dict[key]['course_outcome'] = subj_co['course_outcome']
            co_peo_dict[key]['course_outcome_name'] = subj_co['course_outcome__name']
            co_peo_dict[key]['subject_course_outcome'] = subj_co['id']
            co_peo_dict[key]['program_educational_objectives'] = subj_peo['program_educational_objectives']
            co_peo_dict[key]['program_educational_objectives_name'] = subj_peo['program_educational_objectives__name']
            co_peo_dict[key]['subject_program_educational_objectives'] = subj_peo['id']
    for co_po in subject_CO_PO_mapping:
        key = str(co_po['subject_program_outcome'])+'_'+str(co_po['subject_course_outcome'])
        co_po_dict[key]['value']=co_po['value'] 
    for co_pso in subject_CO_PSO_mapping:
        key = str(co_pso['subject_program_specific_outcome'])+'_'+str(co_pso['subject_course_outcome'])
        co_pso_dict[key]['value']=co_pso['value'] 
    for co_peo in subject_CO_PEO_mapping:
        key = str(co_peo['subject_program_educational_objectives'])+'_'+str(co_peo['subject_course_outcome'])
        co_peo_dict[key]['value']=co_peo['value'] 
    if subject_CO_PO_mapping:
        return_response['subject_id'] = subject_CO_PO_mapping[0]['subject_course_outcome__subject']
        return_response['subject_name'] = subject_CO_PO_mapping[0]['subject_course_outcome__subject__name']
    return_response['co_po_mapping'] = co_po_dict.values()
    return_response['co_pso_mapping'] = co_pso_dict.values()
    return_response['co_peo_mapping'] = co_peo_dict.values()
    return return_response

def add_staff_subject_course_design(self,data):
    with transaction.atomic(using=get_current_db_name()):
        if 'co' in data:
            for course_outcome in data['co']:
                temp_co = {"subject":data['subject_id'],
                    "course_outcome":course_outcome['course_outcome_id'],
                    "description":course_outcome['description'],
                    "target":course_outcome['target'],
                    "cognitive_level":"L1,L2,L3",
                    "sessions":10}
                if 'id' in course_outcome and course_outcome['id']:
                    temp_co['id'] = course_outcome['id']
                if 'id' in course_outcome and course_outcome['id']:
                    instance = SubjectCourseOutcomeMapping.objects.get(id = course_outcome['id'])
                    serializer = SubjectCourseOutcomeMappingSerializer(instance=instance, data=temp_co, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectCourseOutcomeMappingSerializer(data=temp_co)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
        if 'po' in data:
            for program_outcome in data['po']:
                temp_po = {"subject":data['subject_id'],
                    "program_outcome":program_outcome['program_outcome_id'],
                    "description":program_outcome['description'],
                    }
                if 'id' in program_outcome and program_outcome['id']:
                    temp_po['id'] = program_outcome['id']
                if 'id' in program_outcome and program_outcome['id']:
                    instance = SubjectProgramOutcomeMapping.objects.get(id = program_outcome['id'])
                    serializer = SubjectProgramOutcomeMappingSerializer(instance=instance, data=temp_po, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectProgramOutcomeMappingSerializer(data=temp_po)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
        if 'pso' in data:
            for program_specific_outcome in data['pso']:
                temp_pso = {"subject":data['subject_id'],
                    "program_specific_outcome":program_specific_outcome['program_specific_outcome_id'],
                    "description":program_specific_outcome['description'],
                    }
                if 'id' in program_specific_outcome and program_specific_outcome['id']:
                    temp_pso['id'] = program_specific_outcome['id']
                if 'id' in program_specific_outcome and program_specific_outcome['id']:
                    instance = SubjectProgramSpecificOutcomeMapping.objects.get(id = program_specific_outcome['id'])
                    serializer = SubjectProgramSpecificOutcomeMappingSerializer(instance=instance, data=temp_pso, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectProgramSpecificOutcomeMappingSerializer(data=temp_pso)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
        if 'peo' in data:
            for program_educational_objectives in data['peo']:
                temp_peo = {"subject":data['subject_id'],
                    "program_educational_objectives":program_educational_objectives['program_educational_objectives_id'],
                    "description":program_educational_objectives['description'],
                    }
                if 'id' in program_educational_objectives and program_educational_objectives['id']:
                    temp_peo['id'] = program_educational_objectives['id']
                if 'id' in program_educational_objectives and program_educational_objectives['id']:
                    instance = SubjectProgramEducationalObjectives.objects.get(id = program_educational_objectives['id'])
                    serializer = SubjectProgramEducationalObjectivesSerializer(instance=instance, data=temp_peo, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectProgramEducationalObjectivesSerializer(data=temp_peo)
                    serializer.is_valid(raise_exception=True)
                    serializer.save() 
        if 'delete_list_co' in data:
            co_update = SubjectCourseOutcomeMapping.objects.filter(id__in=data['delete_list_co']).update(is_active=False)
        if 'delete_list_po' in data:
            po_update = SubjectProgramOutcomeMapping.objects.filter(id__in=data['delete_list_po']).update(is_active=False)
        if 'delete_list_pso' in data:
            pso_update = SubjectProgramSpecificOutcomeMapping.objects.filter(id__in=data['delete_list_pso']).update(is_active=False)
        if 'delete_list_peo' in data:
            peo_update = SubjectProgramEducationalObjectives.objects.filter(id__in=data['delete_list_peo']).update(is_active=False)
    return {'Data Saved Successfully'}

def read_staff_subject_course_design(self):
    subject_id = self.request.GET.get('subject_id')
    staff_id = self.request.GET.get('staff_id')
    filter_query = {}
    co_filter_query = {'is_active':True}
    po_filter_query = {'is_active':True}
    pso_filter_query = {'is_active':True}
    peo_filter_query = {'is_active':True}
    co_dict = {}
    po_dict = {}
    pso_dict = {}
    peo_dict = {}
    return_response ={}
    if subject_id:
        filter_query['assigned_subjects__subject_id'] = subject_id
    if staff_id:
        filter_query['staff_id'] = staff_id
    staff_subject = StaffTeachingHour.objects.filter(**filter_query).values_list('assigned_subjects__subject_id',flat=True)
    co_filter_query['subject__in'] = staff_subject
    po_filter_query['subject__in'] = staff_subject
    pso_filter_query['subject__in'] = staff_subject
    peo_filter_query['subject__in'] = staff_subject
    subject_details = Subject.objects.filter(id__in = staff_subject).values()
    subject_co = (
                SubjectCourseOutcomeMapping.objects
                .filter(**co_filter_query)
                .annotate(
                    course_outcome_name=F('course_outcome__name'),
                    subject_name=F('subject__name'),
                    name=F('course_outcome__name'),
                    co_id=F('id')
                )
                .values(
                    'co_id',
                    'id',
                    'subject',
                    'subject__name',       # original style
                    'subject_name',        # alias
                    'course_outcome',
                    'course_outcome_id',
                    'course_outcome__name',# original style
                    'course_outcome_name', # alias
                    'description',
                    'target',
                    'name'
                )
            )
    subject_po = (
            SubjectProgramOutcomeMapping.objects
            .filter(**po_filter_query)
            .annotate(
                program_outcome_name=F('program_outcome__name'),
                subject_name=F('subject__name'),
                po_id=F('id')
            )
            .values(
                'po_id',
                'id',
                'subject',
                'subject__name',
                'subject_name',
                'program_outcome',
                'program_outcome__name',
                'program_outcome_name',
                'program_outcome_id',
                'description',
            )
        )
    subject_pso = (
            SubjectProgramSpecificOutcomeMapping.objects
            .filter(**pso_filter_query)
            .annotate(
                program_specific_outcome_name=F('program_specific_outcome__name'),
                subject_name=F('subject__name'),
                pso_id=F('id')
            )
            .values(
                'pso_id',
                'id',
                'subject',
                'subject__name',
                'subject_name',
                'program_specific_outcome',
                'program_specific_outcome__name',
                'program_specific_outcome_name',
                'program_specific_outcome_id',
                'description',
            )
        )
    subject_peo = (
            SubjectProgramEducationalObjectives.objects
            .filter(**peo_filter_query)
            .annotate(
                program_educational_objectives_name=F('program_educational_objectives__name'),
                subject_name=F('subject__name'),
                peo_id=F('id')
            )
            .values(
                'peo_id',
                'id',
                'subject',
                'subject__name',
                'subject_name',
                'program_educational_objectives',
                'program_educational_objectives__name',
                'program_educational_objectives_name',
                'program_educational_objectives_id',
                'description',
            )
        )

    for course_outcome in subject_co:
        if course_outcome['subject'] not in co_dict:
            co_dict[course_outcome['subject']] = []
        course_outcome['course_outcome_id'] = {'id':course_outcome['course_outcome_id'],'name':course_outcome['course_outcome_name']}
        co_dict[course_outcome['subject']].append(course_outcome)
    for program_outcome in subject_po:
        if program_outcome['subject'] not in po_dict:
            po_dict[program_outcome['subject']] = []
        course_outcome['program_outcome_id'] = {'id':program_outcome['program_outcome_id'],'name':program_outcome['program_outcome_name']}
        po_dict[program_outcome['subject']].append(program_outcome)
    for program_specific_outcome in subject_pso:
        if program_specific_outcome['subject'] not in pso_dict:
            pso_dict[program_specific_outcome['subject']] = []
        program_specific_outcome['program_specific_outcome_id'] = {'id':program_specific_outcome['program_specific_outcome_id'],'name':program_specific_outcome['program_specific_outcome_name']}
        pso_dict[program_specific_outcome['subject']].append(program_specific_outcome)
    for program_educational_objectives in subject_peo:
        if program_educational_objectives['subject'] not in peo_dict:
            peo_dict[program_educational_objectives['subject']] = []
        program_educational_objectives['program_educational_objectives_id'] = {'id':program_educational_objectives['program_educational_objectives_id'],'name':program_educational_objectives['program_educational_objectives_name']}
        peo_dict[program_educational_objectives['subject']].append(program_educational_objectives)
    for subject in subject_details:
        if subject['id'] not in return_response:
            return_response[subject['id']] = {}
        return_response[subject['id']]['subject_id'] = subject['id']
        return_response[subject['id']]['id'] = subject['id']
        return_response[subject['id']]['subject_code'] = subject['subject_code']
        return_response[subject['id']]['subject_name'] = subject['name']
        return_response[subject['id']]['no_of_cos'] = len(co_dict[subject['id']]) if subject['id'] in co_dict else 0
        return_response[subject['id']]['co'] = co_dict[subject['id']] if subject['id'] in co_dict else []
        return_response[subject['id']]['po'] = po_dict[subject['id']] if subject['id'] in po_dict else []
        return_response[subject['id']]['pso'] = pso_dict[subject['id']] if subject['id'] in pso_dict else []
        return_response[subject['id']]['peo'] = peo_dict[subject['id']] if subject['id'] in peo_dict else []
    if subject_id:
        return return_response[int(subject_id)]
    else:
        return return_response.values()
    
def read_staff_subjects(self):
    staff_id = None
    if self.request.user.staff:
        staff_id = self.request.user.staff.id
    filter_query={'academic_year_id':self.request.GET.get('academic_year')}
    if staff_id:
        filter_query['staff_id'] = staff_id
    subjects = StaffTeachingHour.objects.filter(**filter_query).annotate(
        subject_id=F('assigned_subjects__subject_id'),
        subject_name=F('assigned_subjects__subject__name')
    ).values('subject_id', 'subject_name')
    print(subjects,'subjectsssss')
    return subjects  

    
def add_subjectdetails_data(self,data):
    response={
            "data" : {}
        }
    if 'subject_id' in data and data['subject_id']:
        response['data']['id'] = data['subject_id']
    if 'subject_id' not in data or not data['subject_id']:
        existing_data = Subject.objects.filter(is_active=True).values()
        for existing in existing_data:
            name = existing['name']
            if existing['subject_code']:
                name += '____' + existing['subject_code']
            if existing['name'] == data['name']:
                raise ValidationError('Subject name is already exists.')
            if existing['subject_code'] == data['subject_code']:
                raise ValidationError('Subject code is already exists.')
        subject_code = data['subject_code'] if 'subject_code' in data else None
        subject_part_type = data['subject_part_type'] if 'subject_part_type' in data else None
        saving_data = {}
        if Subject.objects.filter(name=data['name'], is_active=True, subject_code=subject_code).exists():
            raise ValidationError(f'Duplicate subject {data["name"]}')
        saving_data = {
                'name': data['name'], 'sequence': None, 'subject_code': subject_code, 'subject_part_type': subject_part_type
            }
    with transaction.atomic(using=get_current_db_name()):
        if 'subject_id' not in data or not data['subject_id']:
            serializer = SubjectSerializer(data=saving_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            response['data'] = serializer.data
        if 'branches' in data and data['branches']:
            data['branches'] = data['branches']
            add_or_update_branch_subject(self, [data['branches']], response['data']['id'])
        subjectteachinghour_qs = SubjectTeachingHourMapping.objects.filter(subject_id = response['data']['id']).values()
        subject_teachinghour={}
        for subject in subjectteachinghour_qs:
            if subject['subject_id'] not in subject_teachinghour:
                subject_teachinghour[subject['subject_id']] = {}
            if subject['teaching_type'] not in subject_teachinghour[subject['subject_id']]:
                subject_teachinghour[subject['subject_id']][subject['teaching_type']] = {}
            subject_teachinghour[subject['subject_id']][subject['teaching_type']] = subject
        subjectexamdetails_qs = SubjectExamDetails.objects.filter(subject_id = response['data']['id']).values()
        subject_examdetails={}
        for subject in subjectexamdetails_qs:
            if subject['subject_id'] not in subject_examdetails:
                subject_examdetails[subject['subject_id']] = {}
            if subject['exam_type'] not in subject_examdetails[subject['subject_id']]:
                subject_examdetails[subject['subject_id']][subject['exam_type']] = {}
            subject_examdetails[subject['subject_id']][subject['exam_type']] = subject
        subjecttypedetails_qs = SubjectSubjectTypeMapping.objects.filter(subject_id = response['data']['id']).values()
        subject_typedetails={}
        for subject in subjecttypedetails_qs:
            if subject['subject_id'] not in subject_typedetails:
                subject_typedetails[subject['subject_id']] = {}
            if subject['subject_type'] not in subject_typedetails[subject['subject_id']]:
                subject_typedetails[subject['subject_id']] = {}
            subject_typedetails[subject['subject_id']] = subject
        try:
            subject_details_obj = SubjectDetails.objects.get(subject_id = response['data']['id'])
        except:
            subject_details_obj = None
        temp_subject_details={}
        if 'subject_category' in data and data['subject_category']:
            temp_subject_details = {
                "subject":response['data']['id'],
                "subject_category":data['subject_category']
            }
        if 'credit' in data and data['credit']:
            if temp_subject_details:
                temp_subject_details['credit'] = data['credit']
            else:
                temp_subject_details = {
                "subject":response['data']['id'],
                "credit":data['credit']
            }
        sub_teacher_details = []
        if 'subject_teaching_details' in data and data['subject_teaching_details']:
            if 'theory_hour' in data['subject_teaching_details'] and data['subject_teaching_details']['theory_hour']:
                temp_sub_teacher_details={ 'subject':response['data']['id'] }
                temp_sub_teacher_details['teaching_type'] = 1
                temp_sub_teacher_details['value'] = data['subject_teaching_details']['theory_hour']
                if response['data']['id'] in subject_teachinghour and 1 in subject_teachinghour[response['data']['id']]:
                    temp_sub_teacher_details['id'] = subject_teachinghour[response['data']['id']][1]['id']
                sub_teacher_details.append(temp_sub_teacher_details)
            if 'tutorial_hour' in data['subject_teaching_details'] and data['subject_teaching_details']['tutorial_hour']:
                temp_sub_teacher_details={ 'subject':response['data']['id'] }
                temp_sub_teacher_details['teaching_type'] = 2
                temp_sub_teacher_details['value'] = data['subject_teaching_details']['tutorial_hour']
                if response['data']['id'] in subject_teachinghour and 2 in subject_teachinghour[response['data']['id']]:
                    temp_sub_teacher_details['id'] = subject_teachinghour[response['data']['id']][2]['id']
                sub_teacher_details.append(temp_sub_teacher_details)
            if 'practical_hour' in data['subject_teaching_details'] and data['subject_teaching_details']['practical_hour']:
                temp_sub_teacher_details={ 'subject':response['data']['id'] }
                temp_sub_teacher_details['teaching_type'] = 3
                temp_sub_teacher_details['value'] = data['subject_teaching_details']['practical_hour']
                if response['data']['id'] in subject_teachinghour and 3 in subject_teachinghour[response['data']['id']]:
                    temp_sub_teacher_details['id'] = subject_teachinghour[response['data']['id']][3]['id']
                sub_teacher_details.append(temp_sub_teacher_details)
            if 'saae_hour' in data['subject_teaching_details'] and data['subject_teaching_details']['saae_hour']:
                temp_sub_teacher_details={ 'subject':response['data']['id'] }
                temp_sub_teacher_details['teaching_type'] = 4
                temp_sub_teacher_details['value'] = data['subject_teaching_details']['saae_hour']
                if response['data']['id'] in subject_teachinghour and 4 in subject_teachinghour[response['data']['id']]:
                    temp_sub_teacher_details['id'] = subject_teachinghour[response['data']['id']][4]['id']
                sub_teacher_details.append(temp_sub_teacher_details)
        sub_marks_details = []
        if 'exam_marks_details' in data and data['exam_marks_details']:
            if 'exam_conduction_hour' in data['exam_marks_details'] and data['exam_marks_details']['exam_conduction_hour']:
                temp={}
                temp={
                    'exam_type':1,
                    'value': data['exam_marks_details']['exam_conduction_hour'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_examdetails and 1 in subject_examdetails[response['data']['id']]:
                    temp['id'] = subject_examdetails[response['data']['id']][1]['id']
                sub_marks_details.append(temp)
            if 'cie_marks' in data['exam_marks_details'] and data['exam_marks_details']['cie_marks']:
                temp={}
                temp={
                    'exam_type':2,
                    'value': data['exam_marks_details']['cie_marks'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_examdetails and 2 in subject_examdetails[response['data']['id']]:
                    temp['id'] = subject_examdetails[response['data']['id']][2]['id']
                sub_marks_details.append(temp)
            if 'see_marks' in data['exam_marks_details'] and data['exam_marks_details']['see_marks']:
                temp={}
                temp={
                    'exam_type':3,
                    'value': data['exam_marks_details']['see_marks'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_examdetails and 3 in subject_examdetails[response['data']['id']]:
                    temp['id'] = subject_examdetails[response['data']['id']][3]['id']
                sub_marks_details.append(temp)
            if 'total_marks' in data['exam_marks_details'] and data['exam_marks_details']['total_marks']:
                temp={}
                temp={
                    'exam_type':4,
                    'value': data['exam_marks_details']['total_marks'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_examdetails and 4 in subject_examdetails[response['data']['id']]:
                    temp['id'] = subject_examdetails[response['data']['id']][4]['id']
                sub_marks_details.append(temp)
        sub_type_details = []
        if 'subject_type_details' in data and data['subject_type_details']:
            if 'is_lab' in data['subject_type_details'] and data['subject_type_details']['is_lab']:
                temp={}
                temp = {
                    'subject_type':1,
                    'value': data['subject_type_details']['is_lab'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_typedetails:
                    temp['id'] = subject_typedetails[response['data']['id']]['id']
                sub_type_details.append(temp)
            if 'is_elective' in data['subject_type_details'] and data['subject_type_details']['is_elective']:
                temp={}
                temp = {
                    'subject_type':2,
                    'value': data['subject_type_details']['is_elective'],
                    'subject':response['data']['id']
                }
                if response['data']['id'] in subject_typedetails:
                    temp['id'] = subject_typedetails[response['data']['id']]['id']
                sub_type_details.append(temp)
        if subject_details_obj:
            subject_details_obj.credit=data['credit']
            subject_details_obj.save()
        elif temp_subject_details:
            serializer = SubjectDetailsSerializer(data = temp_subject_details)
            serializer.is_valid()
            serializer.save()
        if sub_teacher_details:
           for teaching_detail in sub_teacher_details:
                if 'id' in teaching_detail and teaching_detail['id']:
                    instance = SubjectTeachingHourMapping.objects.get(id=teaching_detail['id'])
                    serializer = SubjectTeachingHourMappingSerializer(instance=instance, data=teaching_detail, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectTeachingHourMappingSerializer(data = teaching_detail)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
        if sub_marks_details:
           for teaching_detail in sub_marks_details:
                if 'id' in teaching_detail and teaching_detail['id']:
                    instance = SubjectExamDetails.objects.get(id=teaching_detail['id'])
                    serializer = SubjectExamDetailsSerializer(instance=instance, data=teaching_detail, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectExamDetailsSerializer(data = teaching_detail)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
        if sub_type_details:
           for teaching_detail in sub_type_details:
                if 'id' in teaching_detail and teaching_detail['id']:
                    instance = SubjectSubjectTypeMapping.objects.get(id=teaching_detail['id'])
                    serializer = SubjectSubjectTypeMappingSerializer(instance=instance, data=teaching_detail, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                else:
                    serializer = SubjectSubjectTypeMappingSerializer(data = teaching_detail)
                    serializer.is_valid(raise_exception=True)
                    serializer.save() 
    return {'data':"Data Saved Successfully"}
                   
