from rest_framework.exceptions import ValidationError
from apps.classes.models.subject import CumulativeType, SubjectPartType,AssignSubject
from apps.exams.models.exam import ExamTerm, GradePlan
from apps.exams.models.marks import (
    Grade,
    GradeExamScheduleMapping,
    StudentMark,
    StudentMarkQuestionWise,
    StudentCumulativeMark,
)
from apps.exams.models.result import StudentExamFinalResult
from apps.exams.models.schedule import ExamScheduleCumulativeMapping, ExamScheduleQuestionmapping
from apps.shared.services import ConfigurationService, FormdefinitionService, SharedService, PDFService, ApprovalService
from apps.classes.models import StandardSectionMapping, Standard, Subject, SubjectStudent, standard
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.classes.models.studentleave import StaffStandardSectionMapping
from apps.students.models import Student
from collections import defaultdict

from django.db.models import Q, F, Count
from django.db import transaction
from apps.bdu.utils import trim

from apps.exams.models import Exam, ExamSchedule, StudentScheduleMapping
from apps.exams.models.result_configuration import ExamResultConfiguration
from apps.institutes.models import Institute
from datetime import date, time, datetime, timedelta
from apps.classes.models import Enrollment
from apps.students.serializers import StudentParentDetailsSerializer, StudentParentDetailedDataSerializer
from apps.exams.serializers import ExamScheduleCumulativeMappingSerializer, ExamScheduleReadSerilaizer, GradeExamScheduleMappingSerializer, ExamScheduleQuestionmappingSerializer, ExamScheduleSerilaizer
from apps.classes.services.subject import (get_subjects_for_sections)
from apps.classes.services.standard import get_section_inside_standard, get_standard_section_for_standard
from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.services_shared.common import get_selected_template
from apps.students.services.student import get_student_admission_form_details
from apps.finance.services import calculations as fee_calculations

def add_update_exam(self, data, isUpdate=False):
    excludeQuery = {}
    deletablestandardSecIds = []
    standardSectionIds = []
    standardSectionData = StandardSectionMapping.objects.filter(academic_year=data['academic_year']).values()
    sectionStandardMapping = {}
    standardSectionMapping = {}
    for standSec in standardSectionData:
        sectionStandardMapping[standSec['id']] = standSec['standard_id']
        if standSec['standard_id'] in standardSectionMapping:
            standardSectionMapping[standSec['standard_id']].append(standSec['id'])
        else:
            standardSectionMapping[standSec['standard_id']] = []
            standardSectionMapping[standSec['standard_id']].append(standSec['id'])

    # Legacy contract: callers must send `standard_section_ids` for this academic year.
    # New schedule UI uses `apps.exams.services.exam_payload_ui_v2` to expand `standard_ids` first.
    standard_section_ids_raw = data.get('standard_section_ids')
    if not standard_section_ids_raw:
        raise ValidationError('Standard ids cannot be empty')
    standardSectionIds = list(set(str(standard_section_ids_raw).split(",")))
    data['standard_section_ids'] = ','.join(str(s) for s in standardSectionIds)

    student_data = list(Enrollment.objects.filter(
        standard_section__in=standardSectionIds
    ).values_list(
        'standard_section', flat=True
    ))
    error_data = []
    for standard_section in standardSectionIds:
        if int(standard_section) not in student_data:
            sec_obj = StandardSectionMapping.objects.get(id=standard_section)
            error_data.append(f' {sec_obj.standard.name} - {sec_obj.section.name} no students found')
    if error_data:
        raise ValidationError(error_data) 
    if isUpdate:
        data['id'] = self.kwargs['pk']
        examData = Exam.objects.get(id=data['id'])
        ApprovalService.get_approval_status(self, examData, message='Not able to edit schedule exam already approved or waiting for approval', raise_approvals=[1,3])
        excludeQuery = {'id': data['id']}
        existingStandSecIds = [s for s in str(examData.standard_section_ids).split(",") if str(s).strip()]

        # If schedule/marks dependencies exist, allow only "add new standard/section".
        # Do not allow changing core exam fields or removing existing sections.
        schedule_qs = ExamSchedule.objects.filter(exam=examData.id)
        has_schedule_dependency = schedule_qs.exists()
        has_marks_dependency = StudentMark.objects.filter(exam_schedule__exam=examData.id).exists()
        if has_schedule_dependency or has_marks_dependency:
            if str(data.get('from_date')) != str(examData.from_date):
                raise ValidationError('Cannot edit from date after schedule is configured. Only adding new standards is allowed.')
            if str(data.get('to_date')) != str(examData.to_date):
                raise ValidationError('Cannot edit to date after schedule is configured. Only adding new standards is allowed.')
            if str(data.get('exam_type')) != str(examData.exam_type_id):
                raise ValidationError('Cannot edit exam type after schedule is configured. Only adding new standards is allowed.')
            if str(data.get('term')) != str(examData.term_id):
                raise ValidationError('Cannot edit term after schedule is configured. Only adding new standards is allowed.')
            if str(data.get('academic_year')) != str(examData.academic_year_id):
                raise ValidationError('Cannot edit academic year after schedule is configured. Only adding new standards is allowed.')
    if not isUpdate:
        data['created_by'] = self.request.user.id
    if data['from_date'] > data['to_date']:
        raise ValidationError('To date should be greater than from date')
    existingDatas = self.get_queryset().filter(from_date__gte=data['from_date'], from_date__lte=data['to_date'],
                                               to_date__lte=data['to_date'], to_date__gte=data['from_date']).exclude(
        **excludeQuery)
    existingDataForExamType = self.get_queryset().filter(academic_year=data['academic_year'],
                                                         exam_type_id=data['exam_type'], term=data['term']).exclude(
        **excludeQuery).values()
    # Allow cross-year bulk copy payloads to pass source-year standard_section_ids.
    # If an id is not part of the target academic year, remap by (standard, section)
    # into the target academic year when possible.
    remappedStandardSectionIds = []
    for standSecId in standardSectionIds:
        standSecIdInt = int(standSecId)
        if standSecIdInt in sectionStandardMapping:
            remappedStandardSectionIds.append(standSecIdInt)
            continue

        src_mapping = StandardSectionMapping.objects.filter(id=standSecIdInt).values(
            'standard_id', 'section_id'
        ).first()
        if not src_mapping:
            raise ValidationError(f'{standSecId} - not exist in the given academic year')

        target_mapping = StandardSectionMapping.objects.filter(
            academic_year=data['academic_year'],
            standard_id=src_mapping['standard_id'],
            section_id=src_mapping['section_id'],
        ).values('id').first()
        if not target_mapping:
            raise ValidationError(f'{standSecId} - not exist in the given academic year')

        remappedStandardSectionIds.append(int(target_mapping['id']))

    standardSectionIds = list(set(remappedStandardSectionIds))
    data['standard_section_ids'] = ','.join(str(s) for s in standardSectionIds)
    if isUpdate:
        existingStandSecIds = [s for s in str(examData.standard_section_ids).split(",") if str(s).strip()]
        deletablestandardSecIds = list(set(existingStandSecIds) - set([str(s) for s in standardSectionIds]))
        schedule_dependency_exists = ExamSchedule.objects.filter(exam=examData.id).exists() or StudentMark.objects.filter(
            exam_schedule__exam=examData.id
        ).exists()
        if schedule_dependency_exists and deletablestandardSecIds:
            raise ValidationError(
                'Cannot remove already configured standard/section. Only adding new standards is allowed.'
            )
    if existingDatas:  # check same standard exam scheduled on the same date range and also check for same kind of exam .
        existingScheduledStndIds = []
        existingScheduledStndSecIds = []
        for existingData in existingDatas.values():
            existingScheduledStndSecIds += existingData['standard_section_ids'].split(",")
        if existingScheduledStndIds:
            sectionIdsForStandrd = list(StandardSectionMapping.objects.filter(standard__in=existingScheduledStndIds,
                                                                                academic_year=data[
                                                                                    'academic_year']).values_list(
                'standard', flat=True))
            sectionIdsForStandrd = []
            for stndId in existingScheduledStndIds:
                sectionIdsForStandrd += standardSectionMapping[int(stndId)]
            existingScheduledStndSecIds += sectionIdsForStandrd
        sectionConflictIds = set(existingScheduledStndSecIds).intersection(set(standardSectionIds))
        if sectionConflictIds:
            standard_sect_data = StandardSectionMapping.objects.filter(id__in=sectionConflictIds).values(
                'section__name', 'standard__name')
            sectionNames = [obj['section__name'] for obj in standard_sect_data]
            standardName = standard_sect_data[0]['standard__name']
            raise ValidationError(
                f'Exam already created for {standardName} - {",".join(sectionNames)} , for date {existingData["from_date"]} - {existingData["to_date"]}')
    if existingDataForExamType:
        existingStandardSecIds = []
        existingStandardIds = []
        for existingDataE in existingDataForExamType:
            existingStandardSecIds += existingDataE['standard_section_ids'].split(',')
        if existingStandardIds:
            for stanId in existingStandardIds:
                existingStandardSecIds += standardSectionMapping[int(stanId)]
        if set(existingStandardSecIds).intersection(set(standardSectionIds)):
            raise ValidationError(f'Same Type of exam created in given academic year')
    if deletablestandardSecIds and 'id' in data:
        ExamSchedule.objects.filter(standard_section_id__in=deletablestandardSecIds, exam=data['id']).delete()
    response = SharedService.add_or_update_data(self, [data])
    return response


def approve_exam(self, data, **kwargs):
    instance = self.get_object()
    ignore_approve_exam_validation = FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'ignore_approve_exam_validation')
    # if self.request.GET.get('ignore_approve_exam_validation'):
    #     ignore_approve_exam_validation = self.request.GET.get('ignore_approve_exam_validation')
    # ignore_approve_exam_validation = True #nikhil
    if not ignore_approve_exam_validation:
        scheduleData = ExamSchedule.objects.filter(exam=instance).values(
            'fordate', 'start_time', 'min_marks', 'max_marks', 'is_sub_schedule',
            'standard_section_id', 'id', 'standard_section__section__name',
            'standard_section__standard__name', 'grade_plan', 'is_marks', 'subject__name'
        )
        data['reason'] = data['reason'] if 'reason' in data else ''
        existingSectionIds = instance.standard_section_ids.split(',')
        subScheduleIds = []
        if FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'grade_plan'):
            for standard_section in existingSectionIds:
                GradeExamScheduleMapping.get_my_grade_data(self, instance, standard_section, True)
                GradeExamScheduleMapping.get_my_grade_data(self, instance, standard_section, True, True)
        errors = {}
        for schedule in scheduleData:
            # if schedule['is_marks'] and (not schedule['fordate'] or not schedule['start_time'] or not schedule['min_marks'] or not schedule[
            #     'max_marks']):
            #     print(schedule, 'schedule')
            #     temp = f'( Standard - {schedule["standard_section__standard__name"]} Section - {schedule["standard_section__section__name"]} ) schedule is not configured fully. \
            #         Make sure fordate, start_time, min_marks, max_marks all are provided for subject {schedule["subject__name"]}'
            #     temp_key = schedule["standard_section__standard__name"]+''+schedule["standard_section__section__name"]
            #     errors[temp_key] = temp
            # elif not schedule['is_marks'] and (not schedule['grade_plan'] or not schedule['fordate'] or not schedule['start_time']):
            #     temp = f'( Standard - {schedule["standard_section__standard__name"]} Section - {schedule["standard_section__section__name"]} ) \
            #         schedule is not configured fully. Make sure grade_plan is provided for subject - {schedule["subject__name"]}'
            #     temp_key = schedule["standard_section__standard__name"]+''+schedule["standard_section__section__name"]
            #     errors[temp_key] = temp
            if str(schedule['standard_section_id']) in existingSectionIds:
                    existingSectionIds.remove(str(schedule['standard_section_id']))
            if schedule['is_sub_schedule']:
                subScheduleIds.append(schedule['id'])
        if errors:
            errors = list(errors.values())
            raise ValidationError(errors)
        if subScheduleIds:
            existingMappedList = list(
                StudentScheduleMapping.objects.filter(exam_schedule__in=subScheduleIds).values_list('exam_schedule',
                                                                                                    flat=True))
            differenceIds = set(subScheduleIds) - set(existingMappedList)
            if differenceIds:
                standSecIds = []
                standardIds = []
                scheduleData = ExamSchedule.objects.filter(id__in=differenceIds).values()
                for i in scheduleData:
                    standSecIds.append(i['standard_section_id'])
                if standSecIds:
                    stand = StandardSectionMapping.objects.filter(id__in=standSecIds).values('standard__name',
                                                                                            'section__name')
                    error = ''
                    for i in stand:
                        error = i['standard__name'] + ' ' + i['section__name'] + '. '
                    raise ValidationError(f'Atleast one student should be configured for Exam schedule - {error}')
                if standardIds:
                    standardNames = Standard.objects.filter(id__in=standardIds).values_list('name', flat=True)
                    standardNames = ','.join(str(e) for e in standardNames)
                    raise ValidationError(f'Atleast one student should be configured for - {standardNames}')
        if existingSectionIds:
            standardSectionName = StandardSectionMapping.objects.filter(id__in=existingSectionIds).values(
                'standard__name',
                'section__name')
            errorText = ''
            for eT in standardSectionName:
                errorText += eT['standard__name'] + ' ' + eT['section__name'] + '. '
            raise ValidationError(f'Atleast one subject should be configured for - {errorText}')
    response = ApprovalService.update_approval_status(self, instance, data['approval_status'], 'Marks are finalized For students',
                                                      data['reason'])
    return response

#nikhil later move from serializer to this function 
# def exam_schedule_serializer_alternative(self, filter_query={}):
#     schedule_ids = []
#     exam_schedule = ExamSchedule.objects.filter(**filter_query).values(
#         'subject__name', 'subject__codename', 'subject__subject_part_type__name', 'subject__subject_part_type__id',
#         'subject__is_language', 'subject__sequence', 'standard_section__standard__name',
#         'standard_section__standard', 'standard_section__section__name', 'exam__academic_year__id', 'id',
#         'exam','standard_section_id','subject','is_sub_schedule','sub_schedule_parent','fordate','start_time','end_time',
#         'min_marks','max_marks','next_linking_id','grade_plan','is_marks', 'grade_plan__name'
#     )
#     for row_schedule in exam_schedule:
#         schedule_ids.append(row_schedule['id'])
#     exam_cumulative_data_mapping = {}
#     exam_cumulative_data = ExamScheduleCumulativeMapping.objects.filter(exam_schedule__in=schedule_ids).values(
#         'exam_schedule', 'cumulative_type', 'max_marks', 'min_marks'
#     )
#     exam_cumulative_type = {cum['id']: cum for cum in CumulativeType.objects.filter().values()}
#     for exam_cumulative in exam_cumulative_data:
#         if exam_cumulative['exam_schedule'] not in exam_cumulative_data_mapping:
#             exam_cumulative_data_mapping[exam_cumulative['exam_schedule']] = []
#         exam_cumulative['cumulative_type_data'] = []
#         for cumulative_type in exam_cumulative['cumulative_type']:
#             if cumulative_type['cumulative_type'] in exam_cumulative_type:
#                 exam_cumulative['cumulative_type_data'].append(exam_cumulative_type[cumulative_type['cumulative_type']])
#         exam_cumulative_data_mapping[exam_cumulative['exam_schedule']].append(exam_cumulative)
#     for row_schedule in exam_schedule:
#         row_schedule['cumulative_mapping']  = []
#         if row_schedule['id'] in exam_cumulative_data_mapping:
#             row_schedule['cumulative_mapping']  = exam_cumulative_data_mapping[row_schedule['id']]
#         row_schedule.update(
#             {
#                 'subject_name': row_schedule['subject__name'], 'subject_code': row_schedule['subject__codename'],
#                 'subject_part_type': row_schedule['subject__subject_part_type__name'], 'subject_part_type_id': row_schedule['subject__subject_part_type__id'],
#                 'is_language': row_schedule['subject__is_language'], 'sequence': row_schedule['subject__sequence'],
#                 'standard_name': row_schedule['standard_section__standard__name'],  'standard_id': row_schedule['standard_section__standard'],
#                 'standard_section_name': row_schedule['standard_section__section__name'], 'academic_year': row_schedule['exam__academic_year__id'], 
#                 'total_max_marks': 0, 'total_min_marks': 0 #nikhil find this also same serializer
#             }
#         )
#     return exam_schedule


def schedule_summary_data(return_data, exam_data):
    standard_section_ids = []
    for standard_data in return_data.values():
        for section_data in standard_data['section_list']:
            standard_section_ids.append(section_data['id'])
    filter_enrollment = {
        'standard_section__academic_year': exam_data.academic_year
    }
    filter_enrollment['standard_section__in'] = list(standard_section_ids)
    student_data = Enrollment.objects.filter(**filter_enrollment).values('student','standard_section',
                                                                            standardId=F(
                                                                                'standard_section__standard'),
                                                                            sectionId=F(
                                                                                'standard_section__section'),
                                                                            section_name=F(
                                                                                'standard_section__section__name'),
                                                                            standard_name=F(
                                                                                'standard_section__standard__name'
                                                                        ))  # Enrolled students for the scheduled exam data
    standard_student_mapping = {}
    student_data_new = {}  # studentid and stduent data mapping
    for student in student_data:
        if student['standard_section'] in standard_student_mapping:
            standard_student_mapping[student['standard_section']].append(student)
        else:
            standard_student_mapping[student['standard_section']] = []
            standard_student_mapping[student['standard_section']].append(student)
    final_return_data = []
    for standard_data in return_data.values():
        temp_standard_data = {
            'id': standard_data['id'],
            'section_list': [],
            'standard_name': standard_data['standard_name']
        }
        for section_data in standard_data['section_list']:
            section_temp = {
                'standard_section': section_data['id'],
                'name': section_data['section_name'],
                'start_date': None,
                'end_date': None,
                'no_of_students': len(standard_student_mapping[section_data['id']]) if section_data['id'] in standard_student_mapping else 0,
                'no_of_subjects': 0,
                'total_marks': 0
            }
            for subject_data in section_data['subject_list']:
                section_temp['no_of_subjects'] += 1
                section_temp['total_marks'] += subject_data['max_marks'] if subject_data['max_marks'] else 0
                if not section_temp['start_date'] or subject_data['fordate'] < section_temp['start_date']:
                    section_temp['start_date'] = subject_data['fordate']
                if not section_temp['end_date'] or subject_data['fordate'] > section_temp['end_date']:
                    section_temp['end_date'] = subject_data['fordate']
            temp_standard_data['section_list'].append(section_temp)
        final_return_data.append(temp_standard_data)
    return final_return_data


def get_exam_schedule_data(self, request):
    return_data = []
    existing_scheduled_data = {}
    exam_data = Exam.objects.get(id=request.GET.get('exam'))
    standard_id = request.GET.get('standard')
    if not request.GET.get('exam'):
        raise ValidationError('Exam Id is mandatory')
    approval = ApprovalService.get_approval_status(self, exam_data)
    serializer = self.get_serializer(self.get_queryset().filter(exam=self.request.GET.get('exam')), many=True)
    serializer_key = 'standard_section_id'
    serializer_key1 = 'standard_section_name'
    for data in serializer.data:
        if data[serializer_key] not in existing_scheduled_data:
            existing_scheduled_data[data[serializer_key]] = {'subject_list': {}, serializer_key1: data[serializer_key1],
                                                          'id': data[serializer_key]}
        if data['is_sub_schedule'] and data['sub_schedule_parent']:
            if 'sub_schedule_list' in existing_scheduled_data[data[serializer_key]]:
                existing_scheduled_data[data[serializer_key]]['sub_schedule_list'].append(data)
            else:
                existing_scheduled_data[data[serializer_key]]['sub_schedule_list'] = []
                existing_scheduled_data[data[serializer_key]]['sub_schedule_list'].append(data)
        else:
            existing_scheduled_data[data[serializer_key]]['subject_list'][data['id']] = data
    for eSchedule in existing_scheduled_data:
        if 'sub_schedule_list' in existing_scheduled_data[eSchedule]:
            for subjectData in existing_scheduled_data[eSchedule]['sub_schedule_list']:
                if 'sub_schedule_list' not in existing_scheduled_data[eSchedule]['subject_list'][
                    subjectData['sub_schedule_parent']]:
                    existing_scheduled_data[eSchedule]['subject_list'][subjectData['sub_schedule_parent']][
                        'sub_schedule_list'] = []
                existing_scheduled_data[eSchedule]['subject_list'][subjectData['sub_schedule_parent']][
                    'sub_schedule_list'].append(subjectData)
        existing_scheduled_data[eSchedule]['subject_list'].pop('sub_schedule_list', None)
        existing_scheduled_data[eSchedule]['subject_list'] = existing_scheduled_data[eSchedule]['subject_list'].values()
    standard_section_ids = list(set(exam_data.standard_section_ids.split(',')))
    grade_exam_schedule_data = {}
    grade_exam_schedule_total_data = {}
    for g in GradeExamScheduleMapping.objects.filter(
            standard_section__in=standard_section_ids, exam=exam_data.id
        ).values(
            'grade_plan', 'grade_plan__name', 'standard_section_id', 'id',
            'grade_plan_for_total', 'grade_plan_for_total__name', 'max_no_of_days_attendance', 'attendance_from_date','attendance_to_date'
    ):
        grade_exam_schedule_data[g['standard_section_id']] = {
            'grade_plan': g['grade_plan'],
            'grade_plan__name': g['grade_plan__name'],
            'standard_section_id': g['standard_section_id'],
            'id': g['id'], 'max_no_of_days_attendance': g['max_no_of_days_attendance'] , 'attendance_from_date':g['attendance_from_date'] , 'attendance_to_date':g['attendance_to_date']
        }
        grade_exam_schedule_total_data[g['standard_section_id']] = {
            'grade_plan_for_total': g['grade_plan_for_total'],
            'grade_plan_for_total__name': g['grade_plan_for_total__name']
        }
    filter_query = {'id__in':standard_section_ids}
    if standard_id:
        filter_query['standard'] = standard_id
    standard_section_name_mapping = StandardSectionMapping.objects.filter(**filter_query).values('id', 'standard__name',
        'standard', name=F('section__name'))
    standard_section_ids = [i['id'] for i in standard_section_name_mapping]
    standard_section_name_mapping = {i['id']: i for i in standard_section_name_mapping}
    if standard_section_ids:
        standardSectionSubjects = get_subjects_for_sections(self, standard_section_ids)
        subjectStandardSecIds = [key for key in standardSectionSubjects]
        unassignedSubjectStandards = set(standard_section_ids) - set(subjectStandardSecIds)
        if unassignedSubjectStandards:
            standardSecNames = StandardSectionMapping.objects.filter(id__in=unassignedSubjectStandards).values(
                'section__name', 'standard__name'
            )
            tempName = ''
            tempMaping = {}
            for standData in standardSecNames:
                if standData['standard__name'] not in tempMaping:
                    tempMaping[standData['standard__name']] = ''
                    tempName = ' '+standData['standard__name'] + ' | Sections - '
                tempName += standData['section__name'] + ', '
            raise ValidationError('Subject are not assgined for - ' + tempName)
        for standard_sec in standardSectionSubjects:
            temp_data = {'section_name': standard_section_name_mapping[standard_sec]['name'], 'id': standard_sec,
                        'subject_list': [], 'standard_name': standard_section_name_mapping[standard_sec]['standard__name'],
                        'standard': standard_section_name_mapping[standard_sec]['standard'], 'grade_plan_data': {}}
            if standard_sec in grade_exam_schedule_data:
                temp_data['grade_plan_data'] = grade_exam_schedule_data[standard_sec]
            if standard_sec in grade_exam_schedule_total_data:
                temp_data['grade_plan_data_for_total'] = grade_exam_schedule_total_data[standard_sec]
            if standard_sec in existing_scheduled_data:
                if approval['approval_status'] == '1':
                    temp_data['subject_list'] = existing_scheduled_data[standard_sec]['subject_list']
                else:
                    subjectList = SharedService.merge_two_array_based_on_key(self,
                                                                                existing_scheduled_data[standard_sec][
                                                                                    'subject_list'],
                                                                                standardSectionSubjects[standard_sec],
                                                                                'subject')
                    temp_data['subject_list'] = subjectList
            elif not approval['approval_status'] == '1':
                temp_data['subject_list'] = standardSectionSubjects[standard_sec]
            temp_data['subject_list'] = list(temp_data['subject_list'])
            try:
                temp_data['subject_list'].sort(key=lambda d: (d['fordate'] or date(1, 1, 1), d['start_time'] or '00:00'))
            except:
                pass
            return_data.append(temp_data)
    if not standard_id and not self.request.GET.get('schedule_summary'):
        tempData = {}
        for data in return_data:
            if data['standard'] not in tempData:
                tempData[data['standard']] = {'standard_name': data['standard_name'],
                'id': data['standard'], 'section_list': []}
            tempData[data['standard']]['section_list'].append(data)
        return_data = tempData
    part_type_list = SubjectPartType.objects.all().values()
    if self.request.GET.get('schedule_summary'):
        return_data = schedule_summary_data(return_data, exam_data)
        return return_data
    return {
        'data': {
            'schedule_list': return_data, 'approval_status': ApprovalService.get_approval_status(self, exam_data),
            'part_type_list': part_type_list
    }}


def add_update_schedule(self, requestData, isUpdate=False):
    examId = requestData['exam']
    examData = Exam.objects.get(id=examId)
    ApprovalService.get_approval_status(self, examData, 'Not able to edit schedule exam already approved/pending',
                                        ['1', '3'])
    examStandorSecIds = set(examData.standard_section_ids.split(","))
    key = 'standard_section_list'
    errorKey = 'Section'
    key1 = 'standard_section'
    excludeScheduleIds = []
    dataToSave = []
    childDataToSave = {}
    duplicateStandardOrSecList = []
    deletableSchduleIds = []
    deletable_cumulative_ids = []
    grade_plan_data = []
    delete_grade_plan_ids = []
    standard_section_list = []
    temp_id_count = 0
    schedule_grade_plan_ids = []
    for row_data in requestData[key]:
        for subject_data in row_data['subject_list']:
            temp_grade_plan = subject_data['grade_plan'] if 'grade_plan' in subject_data and subject_data['grade_plan'] else None
            if temp_grade_plan:
                schedule_grade_plan_ids.append(temp_grade_plan)
    grade_plan_values = {gra['id']: gra for gra in GradePlan.objects.filter(
        id__in=schedule_grade_plan_ids
    ).values('id', 'grade_type')}
    for row_data in requestData[key]:  # data['id'] is standard id
        standardOrSecId = row_data['id']
        standard_section_list.append(standardOrSecId)
        grade_plan_id = row_data['grade_plan'] if 'grade_plan' in row_data and row_data['grade_plan'] else None
        max_no_of_days_attendance = row_data['max_no_of_days_attendance'] if 'max_no_of_days_attendance' in row_data and row_data['max_no_of_days_attendance'] else None
        grade_plan_mapping_id = row_data['grade_plan_mapping_id'] if 'grade_plan_mapping_id' in row_data and row_data['grade_plan_mapping_id'] else None
        grade_plan_for_total = row_data['grade_plan_for_total'] if 'grade_plan_for_total' in row_data and row_data['grade_plan_for_total'] else None
        delete_grade_plan_id = row_data['delete_gradeexamschedule_id'] if 'delete_gradeexamschedule_id' in row_data and row_data['delete_gradeexamschedule_id'] else None
        if delete_grade_plan_id:
            delete_grade_plan_ids.append(delete_grade_plan_id)
        if str(standardOrSecId) not in examStandorSecIds:
            raise ValidationError(f'{get_standard_name(standardOrSecId)} is not mapped in exam')
        if standardOrSecId in duplicateStandardOrSecList:
            raise ValidationError(f'Duplicate {errorKey} Found')
        duplicateStandardOrSecList.append(standardOrSecId)
        duplicateSubjectList = []
        data, temp_id_count = get_subschedule_subject_in_row(row_data['subject_list'], temp_id_count)
        merge_subject_list = {}
        for subject_data in data:
            if 'next_subject_linking_id' in subject_data and subject_data['next_subject_linking_id']:
                merge_subject_list[subject_data['next_subject_linking_id']] = ''
                merge_subject_list[subject_data['subject']] = ''
        for subjectData in data:
            saved_data = False
            if ('child_sub_schedule' not in subjectData) and subjectData['subject'] in duplicateSubjectList:
                raise ValidationError(
                    f'Duplicate subject found for {get_standard_name(standardOrSecId)} - {get_subject_name(subjectData["subject"])}')
            temp_grade_plan = subjectData['grade_plan'] if 'grade_plan' in subjectData else None
            temp_is_marks = subjectData['is_marks'] if 'is_marks' in subjectData else True
            temp = {'subject': subjectData['subject'], 'exam': examId, 'tempId': subjectData['tempId'],
                    'fordate': None, 'start_time': None, 'end_time': None, 'min_marks': None, 'max_marks': None, 'next_linking_temp_id':
                    subjectData['next_linking_temp_id'], 'next_linking_id': None, 'grade_plan': temp_grade_plan, 'is_marks': temp_is_marks,
                    'schedule_sequence':subjectData['schedule_sequence'] if subjectData.get('schedule_sequence', 0) else 0,
                }
            if 'next_linking_id' in subjectData:
                temp['next_linking_id'] = subjectData['next_linking_id']
            temp['standard_section'] = standardOrSecId
            if 'fordate' in subjectData and subjectData['fordate']:
                temp['fordate'] = subjectData['fordate']
                if not examData.from_date <= SharedService.date_to_obj(
                        subjectData['fordate']) and examData.to_date >= SharedService.date_to_obj(
                        subjectData['fordate']):
                    raise ValidationError(
                        f'{subjectData["fordate"]} should be in the range {examData.from_date} - {examData.to_date}')
                saved_data = True
            if ('start_time' in subjectData and 'end_time' not in subjectData) or (
                    'start_time' in subjectData and 'end_time' not in subjectData) \
                    or ('start_time' in subjectData and not subjectData['start_time']) or (
                    'end_time' in subjectData and not subjectData['end_time']):
                raise ValidationError(
                    f'Start Time and end time both are mandatory for {get_standard_name(standardOrSecId)} - {get_subject_name(subjectData["subject"])}')
            if 'start_time' in subjectData and ('fordate' not in subjectData or not subjectData['fordate']):
                raise ValidationError(
                    f'When start time is provided fordate is mandatory for {get_standard_name(standardOrSecId)} - {get_subject_name(subjectData["subject"])}')
            if 'start_time' in subjectData and subjectData['start_time'] and 'end_time' in subjectData and subjectData[
                'end_time']:
                temp['start_time'] = subjectData['start_time']
                temp['end_time'] = subjectData['end_time']
                if subjectData['start_time'] and subjectData['end_time'] and subjectData['start_time'] > subjectData[
                    'end_time']:
                    raise ValidationError('Start time is should be less than end time')
            if ('min_marks' in subjectData and subjectData['min_marks']) and (
                    'max_marks' in subjectData and subjectData['max_marks']) and (
                    not subjectData['is_marks'] and (subjectData['max_marks'] or subjectData['min_marks'])
                ):
                raise ValidationError('For Grade Plan there is no min and max marks')
            if temp_grade_plan and temp_is_marks:
                raise ValidationError('when grade_plan is given is_marks should be False')
            if temp_grade_plan and temp_grade_plan in grade_plan_values and int(grade_plan_values[temp_grade_plan]['grade_type']) != 2:
                raise ValidationError('Grade plan should be grade type')
            if not temp_is_marks and not temp_grade_plan:
                raise ValidationError('is_marks is false then grade_plan is mandatory')
            if ('min_marks' in subjectData and subjectData['min_marks'] is not None) and (
                    'max_marks' in subjectData and subjectData['max_marks']):
                if float(subjectData['min_marks']) > float(subjectData['max_marks']):
                    raise ValidationError('Minimum Marks should be less than Max Marks')
                temp['min_marks'] = subjectData['min_marks']
                temp['max_marks'] = subjectData['max_marks']
                saved_data = True
            if temp_grade_plan:
                saved_data = True
            elif ('min_marks' in subjectData and 'max_marks' not in subjectData) or (
                    'max_marks' in subjectData and 'min_marks' not in subjectData):
                raise ValidationError(
                    f'If min marks is provided max marks is mandatory for {get_standard_name(data["id"])} - {get_subject_name(subjectData["subject"])} ')
            if subjectData['subject'] in merge_subject_list:
                saved_data = True
            if 'id' in subjectData and saved_data:
                temp['id'] = subjectData['id']
                excludeScheduleIds.append(subjectData['id'])
                saved_data = True
            elif (not saved_data) and 'id' in subjectData:
                deletableSchduleIds.append(subjectData['id'])
                excludeScheduleIds.append(subjectData['id'])
            temp['is_sub_schedule'] = subjectData['is_sub_schedule']
            temp_deletable_cum_ids = []
            if 'deletable_cumulative_mapping' in subjectData:
                temp_deletable_cum_ids = subjectData['deletable_cumulative_mapping']
                deletable_cumulative_ids += temp_deletable_cum_ids
            if 'cumulative_mapping' in subjectData:
                temp_id = subjectData['id'] if 'id' in subjectData else None
                validate_cummaltive_data(self, temp_id, subjectData['cumulative_mapping'], temp_deletable_cum_ids)
                temp['cumulative_mapping'] = subjectData['cumulative_mapping']
                temp['deletable_cumulative_mapping'] = temp_deletable_cum_ids
            if saved_data:
                if 'child_sub_schedule' in subjectData and subjectData['child_sub_schedule']:
                    temp['child_sub_schedule'] = True
                    if temp['tempId'] in childDataToSave:
                        childDataToSave[temp['tempId']].append(temp)
                    else:
                        childDataToSave[temp['tempId']] = []
                        childDataToSave[temp['tempId']] = temp
                else:
                    duplicateSubjectList.append(subjectData['subject'])
                    dataToSave.append(temp)
        attendance_from_date = row_data.get('attendance_from_date', None)
        attendance_to_date = row_data.get('attendance_to_date', None)

        # Convert date objects to string if needed
        if isinstance(attendance_from_date, date):
            attendance_from_date = attendance_from_date.strftime('%Y-%m-%d')
        if isinstance(attendance_to_date, date):
            attendance_to_date = attendance_to_date.strftime('%Y-%m-%d')

        # Only create mapping if at least one of these is given
        if grade_plan_id or max_no_of_days_attendance is not None or attendance_from_date or attendance_to_date:
            temp_new = {
                'exam': examId,
                'standard_section': standardOrSecId,
                'grade_plan': grade_plan_id,
                'grade_plan_for_total': grade_plan_for_total,
                'max_no_of_days_attendance': max_no_of_days_attendance,
                'attendance_from_date': attendance_from_date,
                'attendance_to_date': attendance_to_date,
            }
            if grade_plan_mapping_id:
                temp_new['id'] = grade_plan_mapping_id
            grade_plan_data.append(temp_new)
    
    deletableIds = get_sub_schedule_changed_ids(examId, dataToSave)
    excludeScheduleIds += deletableIds
    deletableSchduleIds += deletableIds
    examScheduleData = ExamSchedule.objects.filter(exam=examId, standard_section__in=standard_section_list).exclude(id__in=excludeScheduleIds).values('start_time',
                                                                                                          'end_time',
                                                                                                          'exam__exam_type__name',
                                                                                                          'id',
                                                                                                          'fordate',
                                                                                                          'subject',
                                                                                                          'standard_section',
                                                                                                          'standard_section__section__name')
    tempChildData = [childDataToSave[i] for i in childDataToSave]
    tempScheduledData = list(examScheduleData) + dataToSave + tempChildData
    existingStandardOrSecIds = [schedule[key1] for schedule in examScheduleData]
    duplicateStandardOrSecList += existingStandardOrSecIds
    standardOrSubjects = get_subjects_for_sections(self, duplicateStandardOrSecList)
    tempstandardOrSubjects = {}
    for standard in standardOrSubjects:
        for subject in standardOrSubjects[standard]:
            if standard in tempstandardOrSubjects:
                tempstandardOrSubjects[standard].append(subject['subject'])
            else:
                tempstandardOrSubjects[standard] = []
                tempstandardOrSubjects[standard].append(subject['subject'])
    checkDuplicateTime = {}
    chain_data_dict = {}
    for standard_section in standard_section_list:
        parent_data = {}
        child_data = {}
        for d_row in tempScheduledData:
            if str(d_row['standard_section']) == str(standard_section):
                if 'next_linking_temp_id' in d_row:
                    if not d_row['next_linking_temp_id']:
                        parent_data[d_row['tempId']] = None
                    else:
                        child_data[d_row['next_linking_temp_id']] = d_row['tempId']
        chain_data_dict[standard_section] = find_chain(parent_data, child_data)
    with transaction.atomic(using=get_current_db_name()):
        if deletableSchduleIds:
            schedules_with_marks = StudentMark.objects.filter(
            exam_schedule_id__in=deletableSchduleIds,
                is_active=True  # only check active marks
            ).values_list('exam_schedule_id', flat=True).distinct()

            if schedules_with_marks:
                # Optional: get subject + section info for a friendly error
                schedule_subjects = ExamSchedule.objects.filter(id__in=schedules_with_marks).select_related(
                    'subject', 'standard_section__standard', 'standard_section__section'
                )
                error_msg = "Cannot delete schedule(s) as marks already exist:\n"
                for schedule in schedule_subjects:
                    error_msg += f"- {schedule.standard_section.standard.name} {schedule.standard_section.section.name} - {schedule.subject.name}\n"
                raise ValidationError(error_msg)
            ExamSchedule.objects.filter(id__in=deletableSchduleIds).delete()
            ExamScheduleCumulativeMapping.objects.filter(exam_schedule__in=deletableSchduleIds).delete()
        if deletable_cumulative_ids:
            ExamScheduleCumulativeMapping.objects.filter(id__in=deletable_cumulative_ids).delete()
        for tempData in tempScheduledData:
            standardOrSecId = tempData[key1]
            fordate = None
            if 'fordate' in tempData and tempData['fordate']:
                fordate = tempData['fordate']
                if isinstance(fordate, date):
                    fordate = fordate.strftime('%Y-%m-%d')
            if standardOrSecId not in tempstandardOrSubjects:
                raise ValidationError(
                    f'{get_subject_name(tempData["subject"])} is not assigned to {get_standard_name(standardOrSecId)}')
            if tempData['subject'] not in tempstandardOrSubjects[
                standardOrSecId]:  # nikhil check this why not executnig this
                raise ValidationError(
                    f'{get_subject_name(tempData["subject"])} is not assigned to {get_standard_name(standardOrSecId)}')
            if fordate:
                if standardOrSecId in checkDuplicateTime:
                    if fordate in checkDuplicateTime[standardOrSecId]:
                        if 'start_time' in tempData and 'end_time' in tempData and tempData['start_time'] and tempData[
                            'end_time']:
                            check_two_time_range_exist(tempData['start_time'], tempData['end_time'],
                                                    checkDuplicateTime[standardOrSecId][fordate], tempData, chain_data_dict[standardOrSecId]
                                            )
                        checkDuplicateTime[standardOrSecId][fordate].append(tempData)
                    else:
                        checkDuplicateTime[standardOrSecId][fordate] = []
                        checkDuplicateTime[standardOrSecId][fordate].append(tempData)
                else:
                    checkDuplicateTime[standardOrSecId] = {fordate: []}
                    checkDuplicateTime[standardOrSecId][fordate].append(tempData)
        self.kwargs['partial'] = True
        check_unique_together(dataToSave)
        save_schedule_data(self, dataToSave, childDataToSave)
        if delete_grade_plan_ids:
            delete_grade_schedule_mapping(self, delete_grade_plan_ids)
        if grade_plan_data:
            add_or_update_grade_schedule_mapping(self, grade_plan_data)
    return {'Reason': 'Data Saved Successfully'}

def validate_cummaltive_data(self, schedule_id, cumulative_data, deletable_ids):
    duplicate_cummilative_type = {}
    updateable_ids = []
    for temp in cumulative_data:
        if 'id' in temp and temp['id']:
            updateable_ids.append(temp['id'])
    if schedule_id:
        for row in ExamScheduleCumulativeMapping.objects.filter(exam_schedule=schedule_id).exclude(id__in=deletable_ids).exclude(id__in=updateable_ids).values(
            'id', 'cumulative_type'
        ):
            duplicate_cummilative_type[row['cumulative_type']] = row
    for row_data in cumulative_data:
        for cum_id in row_data['cumulative_type']:
            if cum_id in duplicate_cummilative_type:
                if 'id' in row_data and str(row_data['id'] == duplicate_cummilative_type[cum_id]):
                    pass
                else:
                    raise ValidationError(f'{cum_id} Duplicate cumulative data')
        if not row_data['max_marks']:
            raise ValidationError('Max marks is mandatory')

def get_subschedule_subject_in_row(subjectList, tempId=0):
    tempReturnData = []
    for i in subjectList:
        tempId += 1
        i['tempId'] = tempId
        if i['is_sub_schedule']:
            for j in i['sub_schedule_list']:
                j['is_sub_schedule'] = True
                j['child_sub_schedule'] = True
                j['subject'] = i['subject']
                j['tempId'] = tempId
                tempReturnData.append(j)
        tempReturnData.append(i)
    subject_index_mapping = {s['subject']: s for s in tempReturnData}
    for temp in tempReturnData:
        temp['next_linking_temp_id'] = None
        if 'next_subject_linking_id' in temp and temp['next_subject_linking_id']:
            if subject_index_mapping[temp['next_subject_linking_id']]['tempId'] == temp['tempId']:
                raise ValidationError('Linking other subject have issue')
            if subject_index_mapping[temp['next_subject_linking_id']]['fordate'] != temp['fordate']:
                raise ValidationError('fordate is mandatory')
            temp['next_linking_temp_id'] = subject_index_mapping[temp['next_subject_linking_id']]['tempId']
    return tempReturnData, tempId


# if changed from subschedule 1 to 0 delete the child references
def get_sub_schedule_changed_ids(examId, dataToSave):
    parentIds = []
    for i in dataToSave:
        if 'id' in i and not i['is_sub_schedule']:
            parentIds.append(i['id'])
    if parentIds:
        return ExamSchedule.objects.filter(sub_schedule_parent__in=parentIds).values_list('id', flat=True)
    return []


def check_unique_together(dataToSave):
    key = 'standard_section'
    duplicateKeys = []
    for i in dataToSave:
        if 'child_sub_schedule' not in i:
            tempKey = str(i[key]) + '-' + str(i['exam']) + '' + str(i['subject'])
            if tempKey in duplicateKeys:
                raise ValidationError('Subject is already assigned to the standard')
            duplicateKeys.append(tempKey)

def morning_evening_session_division(self,subject_list):
    subject_schedule_date_wise={}
    subject_list_session_wise=[]
    for subject in subject_list:
        if subject['fordate'] not in subject_schedule_date_wise:
            subject_schedule_date_wise[subject['fordate']]=[]
        subject_schedule_date_wise[subject['fordate']].append(subject)
    for date in subject_schedule_date_wise:
        sorted_list = sorted(subject_schedule_date_wise[date], key=lambda x: x['start_time'],reverse=True)
        temp={}
        for index,subjects in enumerate(sorted_list):
            temp['fordate'] = date
            temp['session'+str(index)] = subjects['subject_name']
            temp['session'+str(index)+'start_time'] = subjects['start_time']
            temp['session'+str(index)+'end_time'] = subjects['end_time']
        subject_list_session_wise.append(temp)
    return subject_list_session_wise

def save_schedule_data(self, dataToSave, childDataToSave):
    linking_ids = []
    temp_id_orginal_id_mapping = {}
    linking_data_to_update = []
    for list_data in dataToSave:
        if 'next_linking_temp_id' in list_data and list_data['next_linking_temp_id']:
            linking_ids.append(list_data['next_linking_temp_id'])
    with transaction.atomic(using=get_current_db_name()):
        for listData in dataToSave:
            if 'id' in listData:
                self.kwargs['pk'] = listData['id']
                response = SharedService.update_data(self, listData)
            else:
                response = SharedService.add_data(self, listData, False)
            saved_id = response['data']['id']
            temp_id_orginal_id_mapping[listData['tempId']] = saved_id
            if listData['next_linking_temp_id'] in linking_ids:
                listData['id'] = saved_id
                linking_data_to_update.append(listData)
            if listData['tempId'] in childDataToSave:
                for childId in childDataToSave:
                    rowDataToSave = childDataToSave[childId]
                    rowDataToSave['sub_schedule_parent'] = saved_id
                    if 'id' in rowDataToSave:
                        self.kwargs['pk'] = rowDataToSave['id']
                        response = SharedService.update_data(self, rowDataToSave)
                    else:
                        response = SharedService.add_data(self, rowDataToSave, False)
            if 'cumulative_mapping' in listData and listData['cumulative_mapping']:
                for indx, temp in enumerate(listData['cumulative_mapping']):
                    listData['cumulative_mapping'][indx]['exam_schedule'] = saved_id
                add_update_cumulative_data(self, listData['cumulative_mapping'])
        if linking_data_to_update:
            for row_data in linking_data_to_update:
                temp = {'next_linking_id': temp_id_orginal_id_mapping[row_data['next_linking_temp_id']]}
                self.kwargs['pk'] = row_data['id']
                response = SharedService.update_data(self, temp, **{'partial': True})
    return {'Reason': 'Data Added/Updated successfully'}

def add_update_cumulative_data(self, data_to_save):
    for row_data in data_to_save:
        if 'id' in row_data and row_data['id']:
            schedule_obj = ExamScheduleCumulativeMapping.objects.get(id=row_data['id'])
            serializer = ExamScheduleCumulativeMappingSerializer(instance=schedule_obj, data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = ExamScheduleCumulativeMappingSerializer(data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()

def get_standard_name(standardOrSecId):
    return StandardSectionMapping.objects.get(id=standardOrSecId).section.name


def get_subject_name(subjectId):
    return Subject.objects.get(id=subjectId).name

def find_is_schedule_is_same_in_list(chain_data_dict, link_temp_id_one, link_temp_id_two):
    for chain in chain_data_dict:
        temp_list = [chain]
        if chain_data_dict[chain]:
            for row_temp_id in chain_data_dict[chain]:
                temp_list.append(row_temp_id)
        if link_temp_id_one in temp_list and link_temp_id_two in temp_list:
            return True
    return False

def check_two_time_range_exist(starttime, endtime, data, temp_data, chain_data_dict, datakey1="start_time",
                               datakey2="end_time"):
    if isinstance(starttime, time):
        starttime = starttime.strftime('%H:%M:%S')
    if isinstance(endtime, time):
        endtime = endtime.strftime('%H:%M:%S')
    if (starttime > endtime):
        raise ValidationError('Start Date is greater than End date')
    for time_row in data:
        existing_start_time = time_row[datakey1]
        existing_end_time = time_row[datakey2]
        if isinstance(existing_start_time, time):
            existing_start_time = existing_start_time.strftime('%H:%M:%S')
        if isinstance(existing_end_time, time):
            existing_end_time = existing_end_time.strftime('%H:%M:%S')
        if (existing_start_time and existing_end_time ) and (((existing_start_time < starttime < existing_end_time)
             or (existing_start_time < endtime < existing_end_time))):
            if find_is_schedule_is_same_in_list(chain_data_dict, time_row['tempId'], temp_data['tempId']):
                continue
            subject_name = Subject.objects.get(id=time_row['subject'])
            temp_subject_obj = Subject.objects.get(id=temp_data['subject'])
            standard_sec = StandardSectionMapping.objects.get(id=time_row['standard_section'])
            temp_sec_obj = StandardSectionMapping.objects.get(id=temp_data['standard_section'])
            section_name = standard_sec.section.name
            temp_section_name = temp_sec_obj.section.name
            raise ValidationError(
                f'Fordate {time_row["fordate"]} {str(existing_start_time)}-{str(existing_end_time)} - ({section_name}-{subject_name.name}) '
                f'overlaps with ({temp_section_name}-{temp_subject_obj.name}) ({starttime}-{endtime})')

def chain_link(child_data, child_id, child_ids=[]):
    if child_id in child_data:
        child_ids.append(child_data[child_id])
        chain_link(child_data, child_data[child_id], child_ids)
    return child_ids

def find_chain(p_data, c_data):
    childids = []
    for parent in p_data:
        if parent in c_data:
            if not p_data[parent]:
                p_data[parent] = []
            childids = chain_link(c_data, parent, childids)
            p_data[parent] = childids
            childids = []
    removable_keys = []
    for p_row in p_data:
        if p_data[p_row]:
            removable_keys += p_data[p_row]
    for key in removable_keys:
        p_data.pop(key, None)
    return p_data


def merge_if_date_time_together(self, temp_list):
    inst_obj = Institute.objects.all().first()
    parent_data = {}
    child_data = {}
    final_list = []
    temp_schedule_mapping = {}
    schedule_id_local_tracking = []
    for temp in temp_list:
        temp_schedule_mapping[temp['schedule_id']] = temp
        parent_data[temp['schedule_id']] = None
        if temp['next_linking_id']:
            child_data[temp['next_linking_id']] = temp['schedule_id']
    chain_list = find_chain(parent_data, child_data)
    for chain in chain_list:
        temp = temp_schedule_mapping[chain]
        schedule_id_local_tracking.append(temp['schedule_id'])
        if chain_list[chain]:
            for idx, sub_chain in enumerate(reversed(chain_list[chain])):
                if chain in child_data:
                    del child_data[chain]
                temp['subject_name'] = temp['subject_name']
                schedule_id_local_tracking.append(sub_chain)
                if inst_obj.code=='aips' or inst_obj.code == 'nps':
                    divider = ' / ' if len(chain_list[chain]) == (idx+1) else ' , '
                else:
                    divider = ' & ' if len(chain_list[chain]) == (idx+1) else ' , '
                temp['subject_name'] += divider+temp_schedule_mapping[sub_chain]['subject_name']
        final_list.append(temp)
    for child in child_data:
        if child_data[child] not in schedule_id_local_tracking:
            temp = temp_schedule_mapping[child_data[child]]
            final_list.append(temp)
    return final_list

def get_halticket(self, request):
    standardId = self.request.GET.get('standard', None)
    standardName = ''
    start_time = None
    end_time = None
    examId = self.request.GET.get('exam', None)
    sunday_holiday_alias = FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'sunday_holiday_alias name')
    study_holiday_alias = FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'study_holiday_alias name')
    if self.request.user.student:
        studentId = self.request.user.student.id
    else:
        studentId = self.request.GET.get('student', None)
    standardSectionIds = self.request.GET.get('standard_section', None)
    if standardSectionIds:
        standardSectionIds = [int(standardSectionIds)]
    termId = self.request.GET.get('term', None)
    if not termId:
        raise ValidationError('Term is mandatory')
    filename = 'halticket'
    examDetail = Exam.objects.get(id=examId)
    schedule_filter = {'exam':examDetail.id, 'exam__term':termId}
    fromMonth = examDetail.from_date.strftime("%B")
    toMonth = examDetail.to_date.strftime("%B")
    fromYear = examDetail.from_date.strftime("%Y")
    toYear = examDetail.to_date.strftime("%Y")
    dateString = fromMonth + ' ' + fromYear
    if (fromMonth != toMonth):
        dateString = fromMonth + ' - ' + toMonth + ' ' + fromYear
        if fromYear != toYear:
            dateString = fromMonth + ' ' + fromYear + ' ' + ' - ' + toMonth + ' ' + toYear
    if examDetail.exam_type.exam_type == 'Exam':
        dateString += ' Examination'
    else:
        dateString += ' Test'
    student_standard_section_mapping = {}
    studentIds = []
    if standardId:
        standardId = int(standardId)
        studentList = Student.get_student_for_standard(examDetail.academic_year_id, [standardId])
        if not studentList:
            raise ValidationError('No student Present in the standard')
        for student in studentList:
            studentIds.append(student['id'])
            student_standard_section_mapping[student['id']] = student
        schedule_filter['standard_section__standard'] = standardId
    elif studentId:
        standard_obj = Enrollment.get_student_standard_for_academic(self, examDetail.academic_year_id, studentId, True)
        if not standard_obj:
            raise ValidationError('User not Enrolled to any standard')
        standardId = standard_obj['standard_section__standard']
        schedule_filter['standard_section'] = standard_obj['standard_section']
        studentIds = [studentId]
        student_standard_section_mapping[int(studentId)] = standard_obj
    elif standardSectionIds:
        studentList = Student.get_student_for_standard(examDetail.academic_year_id, [], standardSectionIds)
        if not studentList:
            raise ValidationError('No student Present in the standard')
        for student in studentList:
            studentIds.append(student['id'])
            student_standard_section_mapping[student['id']] = student
        schedule_filter['standard_section__in'] = standardSectionIds
    else:
        raise ValidationError('Mandatory Fields Missing')

    # When formdefinition is enabled and student himself prints hall ticket, ensure all fees (due by payment_end_date) are paid.
    # Only fee terms with payment_end_date <= exam from_date are considered; all such must be paid.
    validate_fee_for_student_hallticket = FormdefinitionService.get_formdefintion_data(
        self, 'exam_configurations', 'validate_fee_paid_for_student_hallticket'
    )
    if validate_fee_for_student_hallticket and getattr(self.request.user, 'student', None):
        paid_data = fee_calculations.paid_data_and_status(
            self, studentId, examDetail.academic_year_id, standardId,
            payment_end_date_cutoff=examDetail.from_date
        )
        if paid_data['pending_amount']:
            pending_msg = paid_data.get('pending_amount_due_by_cutoff', paid_data.get('pending_amount', 0))
            raise ValidationError(
                'Hall ticket cannot be generated. All fees due by this exam period (as per payment end date) must be paid. '
                'Pending amount: {}'.format(pending_msg)
            )

    queryset = Student.objects.filter(id__in=studentIds, is_active=True)
    studentSerializer = StudentParentDetailedDataSerializer(queryset, many=True, context={'filtered_list': [
        {'name': 'standard_section', 'value': examDetail.academic_year_id},
        {'name': 'student_id', 'value': studentIds},
    ], 'academic_year': examDetail.academic_year_id})
    studentList = studentSerializer.data
    scheduledExams = self.get_queryset().filter(**schedule_filter).values('fordate', 'subject','subject__subject_part_type__code_name',
                                                                                              'subject__name',
                                                                                              'start_time', 'end_time',
                                                                                              'standard_section_id',
                                                                                              'standard_section__standard',
                                                                                              'standard_section__standard__name',
                                                                                              'next_linking_id', 'id',
                                                                                              'is_sub_disabled_for_halticket'
                                                                                            )
    scheduledExams = {exam['subject']: exam for exam in scheduledExams if not exam['is_sub_disabled_for_halticket']}
    admission_details_dict=get_student_admission_form_details(self,studentIds)
    if not len(scheduledExams) > 0:
        raise ValidationError('No Exam scheduled for standard')
    finalScheduledData = []
    if standardId:
        standardName = Standard.objects.get(id=standardId).name
    elif standardSectionIds:
        stand_obj = StandardSectionMapping.objects.filter(id__in=standardSectionIds).first() #works only if standard sections ids are of same standard
        standardName = stand_obj.standard.name
        standardId = stand_obj.standard.id
    for student in studentList:
        admission_num = {'admission_num': ''}
        if student['id'] in admission_details_dict:
            admission_num=admission_details_dict[student['id']]
        if student['id'] in  student_standard_section_mapping:
            student.update(student_standard_section_mapping[student['id']])
        temp_list = []
        if len(student['student_subject']) <= 0:
            continue
        for subjectData in student['student_subject']:
            tempsubject = {}
            if subjectData['subject_id'] in scheduledExams and subjectData['academic_year'] == examDetail.academic_year_id:
                tempsubject = {'subject_name': subjectData['subject'],
                               'fordate': scheduledExams[subjectData['subject_id']]['fordate'],
                               'start_time': scheduledExams[subjectData['subject_id']]['start_time'],
                               'end_time': scheduledExams[subjectData['subject_id']]['end_time'],
                               'code': subjectData['subject_code'],'subject_part_code':scheduledExams[subjectData['subject_id']]['subject__subject_part_type__code_name'],
                               'next_linking_id': scheduledExams[subjectData['subject_id']]['next_linking_id'],
                               'schedule_id': scheduledExams[subjectData['subject_id']]['id']
                               }
                if tempsubject['start_time']:
                    if not start_time or tempsubject['start_time'] < start_time:
                        start_time = tempsubject['start_time']
                if tempsubject['end_time']:
                    if not end_time or tempsubject['end_time'] > end_time:
                        end_time = tempsubject['end_time']
                temp_list.append(tempsubject)
        temp_list.sort(key=lambda d: (d['fordate'] or date(1, 1, 1), d['start_time'] or '00:00'))
        # If both sunday_holiday and study_holiday aliases are enabled, append unscheduled dates between exam dates
        if sunday_holiday_alias and study_holiday_alias:
            scheduled_dates = sorted({t['fordate'] for t in temp_list if t.get('fordate')})
            scheduled_dates = list(scheduled_dates)
            current = scheduled_dates[0]
            holiday_schedule_id = -1
            while current <= scheduled_dates[-1]:
                if current not in scheduled_dates:
                    alias = sunday_holiday_alias if current.weekday() == 6 else study_holiday_alias
                    temp_list.append({
                        'subject_name': alias,
                        'fordate': current,
                        'start_time': None,
                        'end_time': None,
                        'code': '',
                        'subject_part_code': '',
                        'next_linking_id': None,
                        'schedule_id': holiday_schedule_id,
                    })
                    holiday_schedule_id -= 1
                current += timedelta(days=1)
            temp_list.sort(key=lambda d: (d['fordate'] or date(1, 1, 1), d['start_time'] or '00:00'))
        for subject in temp_list:
            subject['start_time']=subject['start_time'].strftime("%I:%M %p") if subject['start_time'] else ''
            subject['end_time']=subject['end_time'].strftime("%I:%M %p") if subject['end_time'] else ''
        temp_list = merge_if_date_time_together(self, temp_list)
        session_wise_schedule = morning_evening_session_division(self,temp_list)
        if len(temp_list) > 0:
            temp = {'admission_num':admission_num['admission_num'],'student_data': student, 'subject_list': temp_list,'session_wise':session_wise_schedule}
            finalScheduledData.append(temp)
    if not finalScheduledData:
        raise ValidationError('No data found')
    finalScheduledData = sorted(finalScheduledData, key=lambda k:trim(k['student_data']['full_name'].lower()))
    institute_data = Institute.get_institute(self, [standardId])
    '''institute_data.document_details = { #nikhil we are pringint gnatus check and change accordingly
        'file': 'https://edubriczproduction1.s3.amazonaws.com/19/natus_logo_updated_npyddtc.png'
    }'''
    exam_obj = Exam.objects.get(id=examId)
    data = {'institute': institute_data, 'standard_name': standardName,
            'student_list': finalScheduledData, 'dateString': dateString, 'examDetail': examDetail, 'start_time': start_time,
            'end_time': end_time}
    data['academic_year_details']={
        'start_date': exam_obj.academic_year.start_date,
        'end_date': exam_obj.academic_year.end_date,
        'academic_year': exam_obj.academic_year.id
    }
    data['standard_name_in_roman'] = SharedService.number_to_roman(standardName)
    academic_year=data['academic_year_details']['academic_year']
    selected_template,no_of_copies  = get_selected_template(self, 'hall_ticket', 'pdf', 'halticket.html',academic_year,[standardId])
    path = 'hall_ticket/' + selected_template
    #Drag and drop design template check
    designtemplatecheck = SharedService.prepare_pdf(key='hall_ticket', data=data)
    if designtemplatecheck == False:
        response = PDFService.receipt(self, data, filename, path)
    else:
        response = designtemplatecheck
    return response


def get_exam_and_test_list_for_term(termIds, academicYear, standardIds):
    examData = Exam.objects.filter(term__in=termIds, academic_year=academicYear, is_active=True).values('id',
                                                                                                        'standard_section_ids',
                                                                                                        name=F(
                                                                                                            'exam_type__name'))
    returnData = []  # only return the specified standard data
    examStandardSectionIds = []
    sectionStandardMapping = []
    for data in examData:
        examStandardSectionIds += data['standard_section_ids'].split(',')
    if examStandardSectionIds and examStandardSectionIds != '':
        standardFilter = {'academic_year': academicYear}
        if standardIds:
            standardFilter['standard__in'] = standardIds
        sectionFilter = {'id__in': examStandardSectionIds}
        sectionStandardMapping = list(
            StandardSectionMapping.objects.filter(Q(**standardFilter) | Q(**sectionFilter)).values_list('id',
                                                                                                        flat=True))
    for data in examData:
        examData = {'name': data['name'], 'id': data['id']}
        examStandSecIds = list(map(int, data['standard_section_ids'].split(',')))
        if (set(examStandSecIds) & set(sectionStandardMapping)):
            returnData.append(examData)
    return returnData


def add_or_update_student_to_schedule(self, data):
    scheduleStudentMapping = {}
    deletableIds = data['deletable_ids']
    data = data['student_schedule']
    for tempData in data:
        if tempData['exam_schedule'] in scheduleStudentMapping:
            raise ValidationError('Duplicate exam Id found')
        else:
            scheduleStudentMapping[tempData['exam_schedule']] = tempData['student_list']
    scheduleIds = list(scheduleStudentMapping.keys())
    scheduleData = ExamSchedule.objects.filter(id__in=scheduleIds).values(
                                                                          'standard', 'standard_section', 'exam',
                                                                          'exam__academic_year', 'subject', 'id')
    standSecIds = []
    examIds = set()
    academicYearId = None
    dataToSave = []
    givenScheduleData = {}
    for i in scheduleData:
        standSecIds.append(i['standard_section'])
        examIds.add(i['exam'])
        academicYearId = i['exam__academic_year']
        givenScheduleData[i['id']] = i
    if len(examIds) > 1:
        raise ValidationError('You can configure for only one exam')
    studentDatas = Student.get_student_for_standard(academicYearId, [], standSecIds, ['id', 'first_name',
                                                                                               'middle_name',
                                                                                               'last_name'])
    studentDatas = {student['id']: student for student in studentDatas}
    givenStudentIds = list(studentDatas.keys())
    for indx, tempData in enumerate(data):
        uniqueStudentList = []
        for indx1, student in enumerate(tempData['student_list']):
            studentId = student['student']
            if studentId in uniqueStudentList:
                del data[indx]['student_list'][indx1]
                continue
            uniqueStudentList.append(studentId)
            if studentId not in studentDatas:
                studentObj = Student.objects.get(id=studentId)
                name = studentObj.first_name + ' ' + studentObj.middle_name + ' ' + studentObj.last_name
                raise ValidationError(f'Student {name} not found in the given scheduled standard')
            tempData = {'student': student['student'], 'exam_schedule': tempData['exam_schedule']}
            if 'id' in student:
                tempData['id'] = student['id']
            dataToSave.append(tempData)
    with transaction.atomic(using=get_current_db_name()):
        if deletableIds:
            self.get_queryset().filter(id__in=deletableIds).delete()
        existingScheduleMapping = self.get_queryset().filter(
            Q(exam_schedule__in=scheduleIds) | Q(student__in=givenStudentIds)).values(
            'exam_schedule__is_sub_schedule', 'exam_schedule__sub_schedule_parent', 'id', 'student', 'exam_schedule',
            'exam_schedule__exam',
            'exam_schedule__subject'
        )
        checkDuplicateStudent = {}
        for schedule in existingScheduleMapping:
            key = str(schedule['exam_schedule__exam']) + '_' + str(schedule['student']) + '_' + str(
                schedule['exam_schedule__subject'])
            checkDuplicateStudent[key] = ''
        for indx, tempData in enumerate(data):
            for indx1, student in enumerate(tempData['student_list']):
                key = str(givenScheduleData[tempData['exam_schedule']]['exam']) + '_' + str(
                    student['student']) + '_' + str(givenScheduleData[tempData['exam_schedule']]['subject'])
                if key in checkDuplicateStudent:
                    studentObj = Student.objects.get(id=student['student'])
                    subjectObj = Subject.objects.get(id=givenScheduleData[tempData['exam_schedule']]['subject'])
                    name = studentObj.first_name + ' ' + studentObj.middle_name + ' ' + studentObj.last_name
                    raise ValidationError(f'Student {name} with subject {subjectObj.name} already exist')
                checkDuplicateStudent[key] = ''
        return SharedService.add_or_update_data(self, dataToSave)


def get_standards_for_exam(self, request):
    response = {'data': []}
    return_data = []
    term_id = request.GET.get('term', None)
    academic_year = request.GET.get('academic_year', None)
    exam_id = request.GET.get('exam', None)
    setting_value = ConfigurationService.get_setting_value('staffstandardmapping')
    filter_query = {}
    if term_id and academic_year:
        filter_query['exam__academic_year'] = academic_year
        filter_query['exam__term'] = term_id
    if exam_id:
        filter_query['exam'] = exam_id
    if int(setting_value) == 1:
        filter_query['standard_section__standard__in'] = StaffStandardMapping.objects.filter(staff=self.request.user.staff).values_list('standard', flat=True)
    if int(setting_value) == 2:
        filter_query['standard_section__in'] = StaffStandardSectionMapping.objects.filter(staff=self.request.user.staff).values_list('standard_section', flat=True)
    queryset = self.get_queryset().filter(**filter_query).values(
        'standard_section__standard__name',
        'standard_section__standard', 'standard_section__standard__name',
        'standard_section__section__name', 'standard_section'
        ).order_by('standard_section__standard__sequence', 'standard_section__section__name')
    standard_data = {}
    for i in queryset:
        if i['standard_section__standard'] not in standard_data:
            standard_data[i['standard_section__standard']] = {'id': i['standard_section__standard'],
                                                                'name': i['standard_section__standard__name'], 'section_list': {}}
        standard_data[i['standard_section__standard']]['section_list'][i['standard_section']] = {
            'standard_section': i['standard_section'],
            'standard_section_name': i['standard_section__section__name']
        }
    for standard in standard_data:
        standard_data[standard]['section_list'] = standard_data[standard]['section_list'].values()
        return_data.append(standard_data[standard])
    response['data'] = return_data
    return response


# get all standard and section in the exam converts standard to sections and section with standard data
# eg: {'standard_list' : [ 'standard_name': 'Standard1' , 'section_list': {'section' : 1, 'section_name' }]} -> something like this it gives the output
def get_section_wise_list_for_exam(examIds=None, filterQuery={}, standard_subject_mapping=False, filter_standard_section_ids=None):
    if examIds:
        filterQuery['id__in'] = examIds
    examData = Exam.objects.filter(**filterQuery).values()
    standard_section_ids = []
    uniqueAcademicYear = set()
    for examObj in examData:
        uniqueAcademicYear.add(examObj['academic_year_id'])
        for sta_sec_row in examObj['standard_section_ids'].split(','):
            if not filter_standard_section_ids:
                standard_section_ids.append(int(sta_sec_row))
            elif int(sta_sec_row) in filter_standard_section_ids:
                standard_section_ids.append(int(sta_sec_row))
    if len(uniqueAcademicYear) > 1:
        raise ValidationError('You should standard and section only for one academic year')
    return get_section_inside_standard(standard_section_ids, standard_subject_mapping)


def get_subject_for_term(termId, academicYear):
    subjectList = ExamSchedule.objects.filter(exam__term=termId, exam__academic_year=academicYear,
                                              exam__is_active=True).order_by('subject').values('subject', name=F(
        'subject__name')).distinct()
    return subjectList


def examsConductedForStandardSection(termId, academicYear, standardSectionId):
    standardSectionIds = []
    resultData = []
    examData = list(Exam.objects.filter(
        is_active=True, academic_year=academicYear, term=termId, exam_type__is_active=True
    ).values('standard_section_ids',
             'exam_type__name', 'exam_type__code', 'id'
             ))
    for exam in examData:
        standardSectionIds += exam['standard_section_ids'].split(',')
        exam['standard_section_ids'] = exam['standard_section_ids'].split(',')
    if standardSectionIds:
        for index, exam in enumerate(examData):
            isExist = False
            for standrdSec in exam['standard_section_ids']:
                if standrdSec == standardSectionId:
                    isExist = True
            if isExist:
                del exam['standard_section_ids']
                resultData.append(exam)
    return resultData

def examsConductedForStandardSectionnew(academicYear, standardSectionId):
    standardSectionIds = []
    resultData = []
    examData = list(Exam.objects.filter(
        is_active=True, academic_year=academicYear, exam_type__is_active=True
    ).values('standard_section_ids',
             'exam_type__name', 'exam_type__code', 'id'
             ))
    for exam in examData:
        standardSectionIds += exam['standard_section_ids'].split(',')
        exam['standard_section_ids'] = exam['standard_section_ids'].split(',')
    if standardSectionIds:
        for index, exam in enumerate(examData):
            isExist = False
            for standrdSec in exam['standard_section_ids']:
                if standrdSec == standardSectionId:
                    isExist = True
            if isExist:
                del exam['standard_section_ids']
                resultData.append(exam)
    return resultData

def get_student_exam_schedule(self, request,student_id=None , examId=None, termId=None):
    examId = examId if examId else request.GET.get('exam')
    termId = termId if termId else request.GET.get('term')
    examData = Exam.objects.filter(is_active=True, id=examId).values(
        'exam_type__name', 'description', 'from_date', 'to_date', 'id', 'academic_year'
    )[0]
    if not examId or not termId:
        raise ValidationError('exam and term is mandatory')
    try:
        studentId = self.request.user.student.id
    except AttributeError:
        studentId = student_id
    subjectIds = list(SubjectStudent.objects.filter(student=studentId, academic_year=examData['academic_year']).values_list('subject', flat=True))
    standardData = Enrollment.get_student_standard_for_academic(
                    self, examData['academic_year'], studentId, True)
    queryset = ExamSchedule.objects.filter(subject__in=subjectIds, exam=examId, standard_section=standardData['standard_section'])
    scheduleData = ExamScheduleReadSerilaizer(queryset, many=True)
    scheduleData = sorted(
        scheduleData.data,
        key=lambda d: (d['fordate'] is None, d['fordate'])
    )
    termData = ExamTerm.objects.filter(id=termId).values('name', 'id')[0]
    return {'data': {'schedule_list': scheduleData, 'exam': examData, 'term_data': termData, 'standard_section': standardData['standard_section']}}

def get_exam_list_for_student(self, request,student_id=None):
    academicYear = request.GET.get('academic_year')
    if not academicYear:
        raise ValidationError('Academic Year is mandatory')
    try:
        studentId = self.request.user.student.id
    except AttributeError:
        studentId = student_id
    studentStandard = Enrollment.get_student_standard_for_academic(self, academicYear, studentId, True)
    if not studentStandard:
        raise ValidationError('Student is not enrolled for the current academic year')
    subjectIds = list(SubjectStudent.objects.filter(student=studentId).values_list('subject', flat=True))
    studentScheduleIds = StudentScheduleMapping.objects.filter(exam_schedule__exam__academic_year=academicYear, student=studentId).values_list('id', flat=True)
    examScheduleData = ExamSchedule.objects.filter(Q(standard_section=studentStandard['standard_section']) | Q(id__in=studentScheduleIds),
    exam__academic_year=academicYear,
    exam__is_active=True, subject__in=subjectIds
    ).values(
        'exam__exam_type__name', 'exam__exam_type', 'exam__exam_type__code', 'exam__description',
        'exam__term__name', 'exam__term', 'fordate',  'min_marks', 'max_marks', 'exam', 'exam', 'id'
    )
    scheduleList = {}
    for schedule in examScheduleData:
        key = str(schedule['exam']) + '' + str(schedule['exam__term'])
        if key not in scheduleList:
            scheduleList[key] = {
                'exam_name': schedule['exam__exam_type__name'], 'exam_code': schedule['exam__exam_type__code'],
                'exam__term': schedule['exam__term'], 'term_name': schedule['exam__term__name'],
                'start_date': schedule['fordate'], 'end_date': schedule['fordate'],
                'total_marks': 0, 'exam': schedule['exam'], 'schedule_ids': []
            }
        if not schedule['max_marks']:
            schedule['max_marks'] = 0
        scheduleList[key]['total_marks'] += schedule['max_marks']
        # Handle None fordate values safely in comparisons
        if schedule['fordate'] is not None:
            if scheduleList[key]['start_date'] is None or schedule['fordate'] < scheduleList[key]['start_date']:
                scheduleList[key]['start_date'] = schedule['fordate']
            if scheduleList[key]['end_date'] is None or schedule['fordate'] > scheduleList[key]['end_date']:
                scheduleList[key]['end_date'] = schedule['fordate']
        scheduleList[key]['schedule_ids'].append(schedule['id'])
    upcomingList = []
    inprogressList = []
    completedList = []
    now = datetime.now().date()
    for schedule in scheduleList.values():
        # Handle None dates safely
        start_date = schedule['start_date']
        end_date = schedule['end_date']
        
        if start_date is None or end_date is None:
            # If dates are None, add to completed list
            completedList.append(schedule)
        elif start_date <= now <= end_date:
            inprogressList.append(schedule)
        elif start_date > now:
            upcomingList.append(schedule)
        else:
            completedList.append(schedule)
    # Sort lists, handling None dates by putting them at the end
    max_date = date.max
    upcomingList = sorted(upcomingList, key=lambda d: d['start_date'] if d['start_date'] is not None else max_date)
    inprogressList = sorted(inprogressList, key=lambda d: d['start_date'] if d['start_date'] is not None else max_date)
    completedList = sorted(completedList, key=lambda d: d['start_date'] if d['start_date'] is not None else max_date)
    return {'data': inprogressList + upcomingList + completedList }

def add_or_update_grade_schedule_mapping(self, data):
    validate_grade_schedule_mapping(self, data)
    for row_data in data:
        if 'id' in row_data and row_data['id']:
            serializer = GradeExamScheduleMappingSerializer(instance=GradeExamScheduleMapping.objects.get(id=row_data['id']), data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = GradeExamScheduleMappingSerializer(data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()

def validate_grade_schedule_mapping(self, data):
    exam_ids = []
    for row_data in data:
        if not row_data['grade_plan']:
            raise ValidationError('grade plan is mandatory')
        exam_ids.append(row_data['exam'])
    exam_mapping = {exam['id']: exam for exam in Exam.objects.filter(id__in=exam_ids).values('id', 'standard_section_ids')}
    for row_data in data:
        if str(row_data['standard_section']) not in exam_mapping[int(row_data['exam'])]['standard_section_ids'].split(','):
            raise ValidationError(f'{row_data["standard_section"]} standard section data is mandatory')
        

def delete_grade_schedule_mapping(self, ids):
    GradeExamScheduleMapping.objects.filter(id__in=ids).delete()


def _schedule_copy_as_date(val):
    if val is None:
        return None
    if hasattr(val, 'date'):
        return val.date()
    return val


def _schedule_copy_build_holiday_set(academic_year_id, range_start, range_end):
    from django.db.models import Q
    from apps.general.models.holidayCalender import HolidayCalenderStudent
    blocked = set()
    if not academic_year_id or not range_start or not range_end:
        return blocked
    qs = HolidayCalenderStudent.objects.filter(
        academic_year_id=academic_year_id,
        holiday_type=1,
    ).filter(Q(from_date__lte=range_end, to_date__gte=range_start))
    for h in qs:
        for day in SharedService.get_for_date_from_date_range(h.from_date, h.to_date):
            blocked.add(day)
    return blocked


def _schedule_copy_is_blocked(d, holiday_dates, include_weekend):
    if include_weekend and d.weekday() >= 5:
        return True
    return d in holiday_dates


def _schedule_copy_snap_forward(d, holiday_dates, include_weekend, lo, hi):
    cur = d
    for _ in range(732):
        if lo and cur < lo:
            cur = lo
        if not _schedule_copy_is_blocked(cur, holiday_dates, include_weekend):
            if hi and cur > hi:
                raise ValidationError(
                    'Schedule could not be placed inside the target exam window after skipping weekends and holidays. '
                    'Try an earlier start date, turn off calendar adjustment, or extend the target exam dates.'
                )
            return cur
        cur += timedelta(days=1)
    raise ValidationError('Unable to find enough working days to place the full schedule.')


def _schedule_copy_clear_target_exam_schedules(target_exam):
    sched_ids = list(ExamSchedule.objects.filter(exam=target_exam).values_list('id', flat=True))
    if sched_ids:
        ExamScheduleQuestionmapping.objects.filter(exam_schedule_id__in=sched_ids).delete()
        ExamScheduleCumulativeMapping.objects.filter(exam_schedule_id__in=sched_ids).delete()
        ExamSchedule.objects.filter(exam=target_exam).update(next_linking_id=None)
        ExamSchedule.objects.filter(exam=target_exam, is_sub_schedule=True).delete()
        ExamSchedule.objects.filter(exam=target_exam).delete()
    GradeExamScheduleMapping.objects.filter(exam=target_exam).delete()


def clear_entire_exam_schedule_if_no_marks(self, data):
    """
    Remove all ExamSchedule rows (and related mappings) for an exam only when there is no marks entry data.

    Blocks if any active StudentMark, StudentMarkQuestionWise, or StudentCumulativeMark references the schedules.
    """
    exam_id = data.get('exam_id') or data.get('exam')
    if not exam_id:
        raise ValidationError('exam_id is required')
    exam = Exam.objects.filter(id=exam_id, is_active=True).first()
    if not exam:
        raise ValidationError('Exam not found or inactive')

    ApprovalService.get_approval_status(
        self, exam,
        message='Cannot clear schedule for an exam that is already approved or pending approval',
        raise_approvals=[1, 3],
    )

    sched_ids = list(ExamSchedule.objects.filter(exam_id=exam_id).values_list('id', flat=True))
    if not sched_ids:
        return {'message': 'This exam has no schedule rows to remove.', 'deleted_schedule_rows': 0}

    if StudentMark.objects.filter(exam_schedule_id__in=sched_ids, is_active=True).exists():
        raise ValidationError(
            'Cannot delete the entire schedule: student marks exist for this exam. '
            'Remove or deactivate marks first.'
        )

    q_map_ids = list(
        ExamScheduleQuestionmapping.objects.filter(exam_schedule_id__in=sched_ids).values_list('id', flat=True)
    )
    if q_map_ids and StudentMarkQuestionWise.objects.filter(
        exam_schedule_question_mapping_id__in=q_map_ids, is_active=True
    ).exists():
        raise ValidationError(
            'Cannot delete the entire schedule: question-wise marks exist for this exam.'
        )

    cum_ids = list(
        ExamScheduleCumulativeMapping.objects.filter(exam_schedule_id__in=sched_ids).values_list('id', flat=True)
    )
    if cum_ids and StudentCumulativeMark.objects.filter(exam_cumulative_id__in=cum_ids, is_active=True).exists():
        raise ValidationError(
            'Cannot delete the entire schedule: cumulative marks exist for this exam.'
        )

    with transaction.atomic(using=get_current_db_name()):
        StudentScheduleMapping.objects.filter(exam_schedule_id__in=sched_ids).delete()
        _schedule_copy_clear_target_exam_schedules(exam)

    return {
        'message': 'Entire exam schedule removed (no marks were linked).',
        'deleted_schedule_rows': len(sched_ids),
    }


def _exam_dashboard_standards_display(exam):
    """Human-readable standards/sections for an exam (from standard_section_ids)."""
    raw = exam.standard_section_ids
    if not raw or not str(raw).strip():
        return ''
    section_ids = []
    for x in str(raw).split(','):
        x = (x or '').strip()
        if not x:
            continue
        try:
            section_ids.append(int(x))
        except (TypeError, ValueError):
            continue
    if not section_ids:
        return ''
    data = (
        StandardSectionMapping.objects.filter(id__in=section_ids)
        .values('standard', 'section__name', 'standard__name', 'standard__sequence')
        .order_by('standard__sequence', 'section__name')
    )
    by_std = {}
    for row in data:
        std_id = row['standard']
        if std_id not in by_std:
            by_std[std_id] = {'name': row['standard__name'] or '', 'sections': []}
        sec = row['section__name']
        if sec and sec not in by_std[std_id]['sections']:
            by_std[std_id]['sections'].append(sec)
    bits = []
    for std_id in sorted(by_std.keys(), key=lambda k: (by_std[k]['name'] or '')):
        item = by_std[std_id]
        name = item['name'] or '—'
        if item['sections']:
            bits.append(f"{name} ({', '.join(item['sections'])})")
        else:
            bits.append(name)
    return '; '.join(bits)


def _schedule_times_overlap(start_a, end_a, start_b, end_b):
    if start_a is None or end_a is None or start_b is None or end_b is None:
        return False
    return start_a < end_b and start_b < end_a


def _count_cross_exam_section_datetime_clashes(exam_ids):
    """
    Count unordered pairs of schedule rows (different exams) for the same class (standard_section)
    on the same calendar date with overlapping start/end times.
    """
    exam_ids = [int(x) for x in exam_ids if x is not None]
    if len(exam_ids) < 2:
        return 0
    schedules = (
        ExamSchedule.objects.filter(exam_id__in=exam_ids)
        .exclude(fordate__isnull=True)
        .exclude(start_time__isnull=True)
        .exclude(end_time__isnull=True)
        .exclude(standard_section_id__isnull=True)
        .values('exam_id', 'standard_section_id', 'fordate', 'start_time', 'end_time')
    )
    by_key = defaultdict(list)
    for s in schedules:
        by_key[(s['standard_section_id'], s['fordate'])].append(s)
    clash_pairs = 0
    for _key, lst in by_key.items():
        n = len(lst)
        if n < 2:
            continue
        for i in range(n):
            for j in range(i + 1, n):
                a, b = lst[i], lst[j]
                if a['exam_id'] == b['exam_id']:
                    continue
                if _schedule_times_overlap(
                    a['start_time'], a['end_time'], b['start_time'], b['end_time']
                ):
                    clash_pairs += 1
    return clash_pairs


def _compute_exam_schedule_dashboard_summary(academic_year_id, term_id, exam_list, rows):
    """Aggregate metrics for the exam schedule dashboard (JSON-serializable)."""
    today = date.today()
    week_end = today + timedelta(days=6)
    exam_ids = [e.id for e in exam_list]
    total_exams = len(rows)
    total_schedule_rows = sum(int(r.get('schedule_count') or 0) for r in rows)

    exams_with_rows = sum(1 for r in rows if int(r.get('schedule_count') or 0) > 0)
    pending_timetable = total_exams - exams_with_rows
    pct_scheduled = (
        round(100.0 * exams_with_rows / total_exams, 1) if total_exams else 0.0
    )

    published = sum(1 for r in rows if str(r.get('approval_status')) == '1')
    pending_approval = sum(1 for r in rows if str(r.get('approval_status')) == '3')
    rejected = sum(1 for r in rows if str(r.get('approval_status')) == '2')
    draft = sum(
        1
        for r in rows
        if str(r.get('approval_status')) not in ('1', '2', '3')
    )

    upcoming_next_7 = 0
    todays_exams = 0
    exams_concluded = 0
    last_exam_date = None
    for ex in exam_list:
        fd, td = ex.from_date, ex.to_date
        if fd and today <= fd <= week_end:
            upcoming_next_7 += 1
        if fd and td and fd <= today <= td:
            todays_exams += 1
        if td and td < today:
            exams_concluded += 1
        cand = td or fd
        if cand and (last_exam_date is None or cand > last_exam_date):
            last_exam_date = cand

    distinct_standard_ids = set()
    for ex in exam_list:
        raw = ex.standard_section_ids
        if not raw or not str(raw).strip():
            continue
        sec_ids = []
        for x in str(raw).split(','):
            x = (x or '').strip()
            if not x:
                continue
            try:
                sec_ids.append(int(x))
            except (TypeError, ValueError):
                continue
        if sec_ids:
            for sid in StandardSectionMapping.objects.filter(id__in=sec_ids).values_list(
                'standard_id', flat=True
            ):
                distinct_standard_ids.add(sid)
    distinct_standards_count = len(distinct_standard_ids)

    per_day = []
    avg_rows_per_day = 0.0
    max_rows_single_day = 0
    if exam_ids:
        per_day = list(
            ExamSchedule.objects.filter(exam_id__in=exam_ids)
            .exclude(fordate__isnull=True)
            .values('fordate')
            .annotate(c=Count('id'))
        )
        if per_day:
            counts = [int(x['c']) for x in per_day]
            max_rows_single_day = max(counts)
            num_days = len(counts)
            if num_days and total_schedule_rows:
                avg_rows_per_day = round(total_schedule_rows / num_days, 2)

    class_time_clashes = _count_cross_exam_section_datetime_clashes(exam_ids)

    total_sections_ay = StandardSectionMapping.objects.filter(
        academic_year_id=academic_year_id
    ).count()
    scheduled_sections = 0
    if exam_ids:
        scheduled_sections = (
            ExamSchedule.objects.filter(
                exam_id__in=exam_ids,
                standard_section__academic_year_id=academic_year_id,
            )
            .aggregate(n=Count('standard_section_id', distinct=True))
            .get('n')
            or 0
        )
    sections_pending = max(0, int(total_sections_ay) - int(scheduled_sections))

    return {
        'total_exams': total_exams,
        'exams_with_schedule_rows': exams_with_rows,
        'pct_exams_scheduled': pct_scheduled,
        'pending_timetable_exams': pending_timetable,
        'published_exams': published,
        'draft_exams': draft,
        'pending_approval_exams': pending_approval,
        'rejected_exams': rejected,
        'exams_concluded': exams_concluded,
        'distinct_standards_count': distinct_standards_count,
        'total_schedule_rows': total_schedule_rows,
        'upcoming_exams_next_7_days': upcoming_next_7,
        'todays_exams_count': todays_exams,
        'last_exam_date': last_exam_date.isoformat() if last_exam_date else None,
        'avg_schedule_rows_per_calendar_day': avg_rows_per_day,
        'max_schedule_rows_single_day': max_rows_single_day,
        'class_time_clashes': class_time_clashes,
        'teacher_conflicts': None,
        'room_conflicts': None,
        'total_sections_academic_year': int(total_sections_ay),
        'sections_with_schedule': int(scheduled_sections),
        'sections_pending': sections_pending,
    }


def get_exam_schedule_dashboard(self, academic_year, term):
    """
    List exams for an academic year + term with schedule row counts and approval status.
    Query params: academic_year (id), term (id).
    """
    if not academic_year or not term:
        raise ValidationError('academic_year and term are required')
    qs = (
        Exam.objects.filter(academic_year_id=academic_year, term_id=term, is_active=True)
        .select_related('exam_type', 'term', 'academic_year')
        .order_by('-from_date', '-to_date', '-id')
    )
    exam_list = list(qs)
    exam_ids = [e.id for e in exam_list]
    schedule_counts = {}
    if exam_ids:
        schedule_counts = dict(
            ExamSchedule.objects.filter(exam_id__in=exam_ids)
            .values('exam_id')
            .annotate(c=Count('id'))
            .values_list('exam_id', 'c')
        )
    rows = []
    for exam in exam_list:
        schedule_count = int(schedule_counts.get(exam.id, 0))
        ap = ApprovalService.get_approval_status(self, exam)
        rows.append(
            {
                'id': exam.id,
                'exam_type_name': exam.exam_type.name if exam.exam_type else '',
                'term_name': exam.term.name if exam.term else '',
                'from_date': exam.from_date,
                'to_date': exam.to_date,
                'description': exam.description or '',
                'standards_display': _exam_dashboard_standards_display(exam),
                'schedule_count': schedule_count,
                'approval_status': ap.get('approval_status'),
                'approval_status_value': ap.get('approval_status_value'),
            }
        )
    summary = _compute_exam_schedule_dashboard_summary(
        academic_year, term, exam_list, rows
    )

    erc_by_exam = {}
    if exam_ids:
        for item in (
            ExamResultConfiguration.objects.filter(exam_id__in=exam_ids)
            .values('exam_id')
            .annotate(
                result_config_total=Count('id'),
                result_config_approved=Count('id', filter=Q(approval_status='1')),
                result_config_announced=Count('id', filter=Q(is_announced=True)),
            )
        ):
            erc_by_exam[item['exam_id']] = item

    def _mini_exam_row(r):
        desc = r.get('description') or ''
        if len(desc) > 120:
            desc = desc[:117] + '...'
        return {
            'id': r['id'],
            'exam_type_name': r.get('exam_type_name') or '',
            'description': desc,
        }

    exam_lists = {
        'timetable_approved': [],
        'results_finalized_all_sections': [],
        'results_announced_all_sections': [],
    }
    for r in rows:
        er = erc_by_exam.get(r['id'], {})
        r['result_config_total'] = int(er.get('result_config_total') or 0)
        r['result_config_approved'] = int(er.get('result_config_approved') or 0)
        r['result_config_announced'] = int(er.get('result_config_announced') or 0)

        if str(r.get('approval_status')) == '1':
            exam_lists['timetable_approved'].append(_mini_exam_row(r))
        tot = r['result_config_total']
        if tot > 0 and r['result_config_approved'] == tot:
            exam_lists['results_finalized_all_sections'].append(_mini_exam_row(r))
        if tot > 0 and r['result_config_announced'] == tot:
            exam_lists['results_announced_all_sections'].append(_mini_exam_row(r))

    summary['exam_lists'] = exam_lists
    return {'data': rows, 'summary': summary}


def clear_exam_schedules_bulk_if_no_marks(self, data):
    """
    Clear schedules for many exams. Each exam is processed independently (partial success allowed).
    Payload: { "exam_ids": [1, 2, 3] }
    """
    raw_ids = data.get('exam_ids') or []
    if not isinstance(raw_ids, list):
        raise ValidationError('exam_ids must be a list')
    ids = []
    for x in raw_ids:
        try:
            ids.append(int(x))
        except (TypeError, ValueError):
            continue
    ids = list(dict.fromkeys(ids))
    if not ids:
        raise ValidationError('exam_ids must contain at least one valid exam id')
    cleared = []
    failed = []
    for eid in ids:
        try:
            r = clear_entire_exam_schedule_if_no_marks(self, {'exam_id': eid})
            cleared.append({'exam_id': eid, 'result': r})
        except ValidationError as e:
            detail = e.detail
            if isinstance(detail, list):
                msg = ' '.join(str(x) for x in detail)
            elif isinstance(detail, dict):
                msg = ' '.join(str(v) for v in detail.values())
            else:
                msg = str(detail)
            failed.append({'exam_id': eid, 'detail': msg})
    return {
        'cleared': cleared,
        'failed': failed,
        'cleared_count': len(cleared),
        'failed_count': len(failed),
    }


def copy_exam_schedule(self, data):
    """
    Deep copy schedules from source exam to target exam.

    Payload:
      - source_exam_id, target_exam_id (required)
      - target_start_date (required): calendar date (YYYY-MM-DD) for the earliest dated value in the source
      - respect_calendars (optional, default True): treat Sat/Sun and student holiday calendar as non-working
      - replace_existing (optional, default False): remove target schedules and grade-exam mappings before copy

    Copies timings, marks, grade plans, cumulative mappings, sub-schedules, next_linking,
    question mappings, frame/marks-entry deadlines, and GradeExamScheduleMapping (attendance window).
    """
    source_exam_id = data.get('source_exam_id')
    target_exam_id = data.get('target_exam_id')
    target_start_raw = data.get('target_start_date') or data.get('new_from_date')
    respect_calendars = data.get('respect_calendars', True)
    if isinstance(respect_calendars, str):
        respect_calendars = respect_calendars.lower() not in ('0', 'false', 'no')
    replace_existing = bool(data.get('replace_existing') or data.get('force_replace'))

    if not source_exam_id or not target_exam_id:
        raise ValidationError('source_exam_id and target_exam_id are required')
    if int(source_exam_id) == int(target_exam_id):
        raise ValidationError('Source and target exam must be different')
    if not target_start_raw:
        raise ValidationError(
            'target_start_date is required: calendar date for the first exam-related day in the new schedule.'
        )

    source_exam = Exam.objects.get(id=source_exam_id)
    target_exam = Exam.objects.get(id=target_exam_id)
    ApprovalService.get_approval_status(
        self, target_exam,
        message='Cannot copy to an exam that is already approved or pending approval',
        raise_approvals=[1, 3]
    )

    target_standard_section_ids = {
        int(str(x).strip())
        for x in target_exam.standard_section_ids.split(',')
        if str(x).strip()
    }
    if not target_standard_section_ids:
        raise ValidationError('Target exam has no standard sections configured')

    # Map source-section-id -> target-section-id using (standard_id, section_id),
    # so cross-academic-year copies work even when mapping IDs differ.
    target_mappings = StandardSectionMapping.objects.filter(
        id__in=target_standard_section_ids
    ).values('id', 'standard_id', 'section_id')
    target_key_to_id = {
        (int(m['standard_id']), int(m['section_id'])): int(m['id'])
        for m in target_mappings
    }

    source_mappings = StandardSectionMapping.objects.filter(
        id__in=[
            int(str(x).strip())
            for x in source_exam.standard_section_ids.split(',')
            if str(x).strip()
        ]
    ).values('id', 'standard_id', 'section_id')
    source_to_target_section_map = {}
    for sm in source_mappings:
        key = (int(sm['standard_id']), int(sm['section_id']))
        if key in target_key_to_id:
            source_to_target_section_map[int(sm['id'])] = target_key_to_id[key]

    source_section_ids_to_copy = list(source_to_target_section_map.keys())
    if not source_section_ids_to_copy:
        raise ValidationError(
            'No matching standard-section mapping found between source and target exam.'
        )

    source_schedules = list(
        ExamSchedule.objects.filter(
            exam=source_exam,
            standard_section_id__in=source_section_ids_to_copy
        ).select_related('standard_section', 'subject', 'grade_plan').order_by('id')
    )
    if not source_schedules:
        raise ValidationError(
            'No schedules found in source exam for standard sections that exist on the target exam.'
        )

    if ExamSchedule.objects.filter(exam=target_exam).exists():
        if not replace_existing:
            raise ValidationError(
                'This exam already has a schedule. Enable "Replace existing schedule" to overwrite, or remove it manually.'
            )
        _schedule_copy_clear_target_exam_schedules(target_exam)

    user_anchor = SharedService.date_to_obj(target_start_raw)
    if user_anchor < target_exam.from_date or user_anchor > target_exam.to_date:
        raise ValidationError('target_start_date must fall within the target exam window.')

    grade_rows = list(GradeExamScheduleMapping.objects.filter(
        exam=source_exam,
        standard_section_id__in=source_section_ids_to_copy,
    ))
    date_set = set()
    for s in source_schedules:
        for fld in ('fordate', 'questionframe_lastdate', 'marksentry_lastdate'):
            v = getattr(s, fld)
            d = _schedule_copy_as_date(v)
            if d:
                date_set.add(d)
    for g in grade_rows:
        for fld in ('attendance_from_date', 'attendance_to_date'):
            v = getattr(g, fld)
            d = _schedule_copy_as_date(v)
            if d:
                date_set.add(d)
    sorted_dates = sorted(date_set)
    if not sorted_dates:
        raise ValidationError(
            'The source schedule has no dates to remap. Configure exam, frame, marks entry, or attendance dates first.'
        )

    range_end = target_exam.to_date + timedelta(days=370)
    holiday_dates = _schedule_copy_build_holiday_set(
        target_exam.academic_year_id,
        user_anchor,
        range_end,
    )

    date_map = {}
    prev_src = None
    prev_tgt = None
    for src_d in sorted_dates:
        if prev_src is None:
            tgt = _schedule_copy_snap_forward(
                user_anchor, holiday_dates, respect_calendars,
                target_exam.from_date, target_exam.to_date,
            )
            date_map[src_d] = tgt
            prev_src, prev_tgt = src_d, tgt
            continue
        gap_days = (src_d - prev_src).days
        candidate = prev_tgt + timedelta(days=gap_days)
        candidate = _schedule_copy_snap_forward(
            candidate, holiday_dates, respect_calendars,
            target_exam.from_date, target_exam.to_date,
        )
        if candidate < prev_tgt:
            candidate = _schedule_copy_snap_forward(
                prev_tgt + timedelta(days=1),
                holiday_dates, respect_calendars,
                target_exam.from_date, target_exam.to_date,
            )
        date_map[src_d] = candidate
        prev_src, prev_tgt = src_d, candidate

    def map_field(val):
        d = _schedule_copy_as_date(val)
        if not d:
            return None
        mapped = date_map.get(d)
        if not mapped:
            raise ValidationError(f'Internal copy error: date {d} missing from remap table')
        return mapped

    def _attendance_datetime_from_date(d, end_of_day):
        if not d:
            return None
        t = time(23, 59, 59) if end_of_day else time.min
        return datetime.combine(d, t)

    id_to_new_schedule = {}
    parent_schedules = [s for s in source_schedules if (not s.is_sub_schedule or not s.sub_schedule_parent_id)]
    child_schedules = [s for s in source_schedules if s.is_sub_schedule and s.sub_schedule_parent_id]

    def build_schedule_row(old_schedule, new_exam_id, new_sub_schedule_parent_id=None):
        mapped_standard_section_id = source_to_target_section_map.get(int(old_schedule.standard_section_id))
        if not mapped_standard_section_id:
            raise ValidationError(
                f'No matching target standard-section for source section id {old_schedule.standard_section_id}'
            )
        return ExamSchedule(
            exam_id=new_exam_id,
            standard_section_id=mapped_standard_section_id,
            subject=old_schedule.subject,
            is_sub_schedule=old_schedule.is_sub_schedule,
            sub_schedule_parent_id=new_sub_schedule_parent_id,
            fordate=map_field(old_schedule.fordate) if old_schedule.fordate else None,
            start_time=old_schedule.start_time,
            end_time=old_schedule.end_time,
            min_marks=old_schedule.min_marks,
            max_marks=old_schedule.max_marks,
            grade_plan=old_schedule.grade_plan,
            is_marks=old_schedule.is_marks,
            is_sub_disabled_for_halticket=old_schedule.is_sub_disabled_for_halticket,
            schedule_sequence=old_schedule.schedule_sequence,
            questionframe_lastdate=(
                map_field(old_schedule.questionframe_lastdate) if old_schedule.questionframe_lastdate else None
            ),
            marksentry_lastdate=(
                map_field(old_schedule.marksentry_lastdate) if old_schedule.marksentry_lastdate else None
            ),
        )

    with transaction.atomic(using=get_current_db_name()):
        for old in parent_schedules:
            new_schedule = build_schedule_row(old, target_exam_id, None)
            new_schedule.save()
            id_to_new_schedule[old.id] = new_schedule
            for cum in ExamScheduleCumulativeMapping.objects.filter(exam_schedule=old).prefetch_related(
                    'cumulative_type'):
                cum_types = list(cum.cumulative_type.values_list('id', flat=True))
                new_cum = ExamScheduleCumulativeMapping(
                    exam_schedule=new_schedule,
                    max_marks=cum.max_marks,
                    min_marks=cum.min_marks,
                )
                new_cum.save()
                if cum_types:
                    new_cum.cumulative_type.set(cum_types)

        for old in child_schedules:
            new_parent = id_to_new_schedule.get(old.sub_schedule_parent_id)
            new_sub_parent_id = new_parent.id if new_parent else None
            new_schedule = build_schedule_row(old, target_exam_id, new_sub_parent_id)
            new_schedule.save()
            id_to_new_schedule[old.id] = new_schedule
            for cum in ExamScheduleCumulativeMapping.objects.filter(exam_schedule=old).prefetch_related(
                    'cumulative_type'):
                cum_types = list(cum.cumulative_type.values_list('id', flat=True))
                new_cum = ExamScheduleCumulativeMapping(
                    exam_schedule=new_schedule,
                    max_marks=cum.max_marks,
                    min_marks=cum.min_marks,
                )
                new_cum.save()
                if cum_types:
                    new_cum.cumulative_type.set(cum_types)

        for old in source_schedules:
            if old.next_linking_id_id and old.id in id_to_new_schedule and old.next_linking_id_id in id_to_new_schedule:
                new_schedule = id_to_new_schedule[old.id]
                new_link = id_to_new_schedule[old.next_linking_id_id]
                new_schedule.next_linking_id = new_link
                new_schedule.save(update_fields=['next_linking_id'])

        for old in source_schedules:
            if old.id not in id_to_new_schedule:
                continue
            new_sched = id_to_new_schedule[old.id]
            old_qs = list(ExamScheduleQuestionmapping.objects.filter(exam_schedule_id=old.id))
            q_old_to_new = {}
            for oq in old_qs:
                nq = ExamScheduleQuestionmapping(
                    exam_schedule=new_sched,
                    question_number=oq.question_number,
                    sub_question_number=oq.sub_question_number,
                    description=oq.description,
                    is_active=oq.is_active,
                    sequence=oq.sequence,
                    max_marks=oq.max_marks,
                    min_marks=oq.min_marks,
                    course_outcome_id=oq.course_outcome_id,
                    group_name=oq.group_name,
                )
                nq.save()
                q_old_to_new[oq.id] = nq
            for oq in old_qs:
                if oq.option_link_id_id and oq.id in q_old_to_new:
                    nq = q_old_to_new[oq.id]
                    link_new = q_old_to_new.get(oq.option_link_id_id)
                    if link_new:
                        nq.option_link_id = link_new
                        nq.save(update_fields=['option_link_id'])

        for gm in grade_rows:
            mapped_standard_section_id = source_to_target_section_map.get(int(gm.standard_section_id))
            if not mapped_standard_section_id:
                continue
            af = map_field(gm.attendance_from_date) if gm.attendance_from_date else None
            at = map_field(gm.attendance_to_date) if gm.attendance_to_date else None
            GradeExamScheduleMapping.objects.update_or_create(
                exam=target_exam,
                standard_section_id=mapped_standard_section_id,
                defaults={
                    'grade_plan': gm.grade_plan,
                    'grade_plan_for_total': gm.grade_plan_for_total,
                    'is_final_marks_grade_plan': gm.is_final_marks_grade_plan,
                    'max_no_of_days_attendance': gm.max_no_of_days_attendance,
                    'attendance_from_date': _attendance_datetime_from_date(af, False),
                    'attendance_to_date': _attendance_datetime_from_date(at, True),
                },
            )

    return {
        'message': 'Exam schedule copied successfully with new dates.',
        'copied_count': len(id_to_new_schedule),
        'replace_existing': replace_existing,
        'respect_calendars': respect_calendars,
    }


def create_question_based_exam_schedule(self,data):
    if 'standard_section_id' not in data or not data['standard_section_id']:
        subject_assigned_section = AssignSubject.objects.filter(subject_id = data['subject_id'],standard_section__academic_year = data['academic_year']).values_list("standard_section_id",flat=True)
    else:
        subject_assigned_section = data['standard_section_id'].split(",")
    exam_schedule_data = ExamSchedule.objects.filter(standard_section__in = subject_assigned_section,exam = data['exam_id'],subject=data['subject_id']).values()
    standsec_sub_exam_schedule_mapping = {}
    if exam_schedule_data:
        for standard_section_data in exam_schedule_data:
            if standard_section_data['standard_section_id'] not in standsec_sub_exam_schedule_mapping:
                standsec_sub_exam_schedule_mapping[standard_section_data['standard_section_id']] = {}
            standsec_sub_exam_schedule_mapping[standard_section_data['standard_section_id']] = standard_section_data['id']
    question_dict = {}
    question_list =[]
    question_option_question_mapping = {}
    exam_subject_max_marks = 0 
    exam_subject_min_marks = 0
    for question in data['question_list']:
        if question['question_number'] not in question_dict:
            question_dict[question['question_number']] = {"sub_question_list":[],"max_marks":0,"min_marks":0,"is_option_present":0}
        question_dict[question['question_number']]['sub_question_list'].append(question)
        if "option_question" in question:
            if question['option_question']:
                question_dict[question['question_number']]['is_option_present'] = 1
            if question['question_number'] not in question_option_question_mapping:
                question_option_question_mapping[question['question_number']] = []
            question_option_question_mapping[question['question_number']].append(question)
        if "max_marks" in question and question['max_marks']:
            question_dict[question['question_number']]['max_marks'] += question["max_marks"]
        question_dict[question['question_number']]['min_marks'] += question["min_marks"] if 'min_marks' in question and question['min_marks'] else 0
        question_list.append(question['question_number'])
    for question in question_option_question_mapping:
        for option_question in question_option_question_mapping[question]:
            if option_question['option_question']:
                if option_question['option_question'] not in question_list:
                    raise ValidationError("option question is not present")
                if question_dict[question]["max_marks"] != question_dict[option_question['option_question']]["max_marks"]:
                    raise ValidationError("question and option question marks are not same")
        if not question_dict[question]['is_option_present'] or question_dict[question]['is_option_present'] == 0:
            exam_subject_max_marks += question_dict[question]['max_marks']
            exam_subject_min_marks += question_dict[question]['min_marks']
    question_no_question_id_mapping = {}
    with transaction.atomic(using=get_current_db_name()):
        for standard_section_id in subject_assigned_section:
            temp_data = {
                    "standard_section" : standard_section_id,
                    "exam":data['exam_id'],
                    "subject":data['subject_id'],
                    "max_marks":exam_subject_max_marks,
                    "min_marks":exam_subject_min_marks,
                    "is_marks":1,
                }
            if 'fordate' in data and data['fordate']:
                temp_data['fordate'] = data['fordate']
            if 'start_time' in data and data['start_time']:
                temp_data['start_time'] = data['start_time']
            if 'end_time' in data and data['end_time']:
                temp_data['end_time'] = data['end_time']
            if standard_section_id in standsec_sub_exam_schedule_mapping:
                instance = ExamSchedule.objects.get(standard_section_id=standard_section_id,exam_id=data['exam_id'],subject_id=data['subject_id'])
                serializer = ExamScheduleSerilaizer(instance=instance, data=temp_data, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer=serializer.save()
            else:
                serializer = ExamScheduleSerilaizer(data=temp_data)
                serializer.is_valid(raise_exception=True)
                serializer=serializer.save()
            pending_links = []  # (child_id, {"qno": int, "sub": str|None, "seq": int|None})
            for qno, bundle in question_dict.items():
                for sub in bundle['sub_question_list']:
                    natural_key = {
                        "exam_schedule_id": serializer.id,
                        "question_number":   sub['question_number'],
                        "sub_question_number": sub['sub_question_number'],
                        "sequence": sub.get('sequence', 0),  # include if duplicates can occur
                        "course_outcome_id":int(sub['co'])
                    }
                    defaults = {
                        "group_name":  f"{serializer.id}_{sub['question_number']}",
                        "description": sub.get('description', ''),
                        "max_marks":   sub.get('max_marks', 0),
                        "min_marks":   sub.get('min_marks', 0),
                    }

                    if sub.get('id'):
                        exam_q = ExamScheduleQuestionmapping.objects.get(id=sub['id'])
                        for k, v in {**natural_key, **defaults}.items():
                            setattr(exam_q, k, v)
                        exam_q.save()
                    else:
                        exam_q, _ = ExamScheduleQuestionmapping.objects.update_or_create(
                            **natural_key, defaults=defaults
                        )
                    if sub.get("option_question"):
                        pending_links.append(
                            (exam_q.id, {"qno": sub["option_question"], 
                                        "sub": sub.get("option_sub_question_number"),  # if you add it to payload
                                        "seq": sub.get("option_sequence")})            # optional
                        )
            for child_id, target in pending_links:
                qs = ExamScheduleQuestionmapping.objects.filter(
                    exam_schedule_id=serializer.id,
                    question_number=target["qno"],
                )
                if target.get("sub") is not None:
                    qs = qs.filter(sub_question_number=target["sub"])
                elif target.get("seq") is not None:
                    qs = qs.filter(sequence=target["seq"])
                link = qs.order_by('sequence', 'id').first()  # deterministic

                if not link:
                    continue

                child = ExamScheduleQuestionmapping.objects.get(id=child_id)
                if hasattr(child, "option_link"):
                    child.option_link = link
                    child.save(update_fields=["option_link"])
                else:
                    setattr(child, "option_link_id", link)  # assign instance if FK is oddly named
                    child.save(update_fields=["option_link_id"])
    return {"data saved successfully"}