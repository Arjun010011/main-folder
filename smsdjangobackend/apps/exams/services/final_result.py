from rest_framework.exceptions import ValidationError
from django.db import transaction
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from apps.classes.models.subject import SubjectPartType

from apps.exams.models import ResultConfiguration, ResultMarksConfiguration, ResultSectionMapping
from apps.classes.models import (Subject, StandardSectionMapping, Enrollment)
from apps.exams.models import (ExamSchedule, Exam, StudentMark, StudentExamFinalResult)
from apps.exams.models.exam import ExamTerm
from apps.exams.models.marks import StudentCumulativeMark, StudentMarkSectionWiseApproval
from apps.exams.models.result import ExamFinalResultConfiguration, ResultSectionApproval,ResultConfigurationMerge
from apps.exams.models.result_configuration import ExamResultConfiguration, ExamResultCumulativeConfiguration, ExamResultSubjectConfiguration
from apps.exams.models.final_result import FinalResultSectionApproval,FinalResultConfiguration,FinalResultSectionMapping,FinalResultMarksConfiguration,FinalResultConfigurationMerge,StudentExamFinalResultForFinalConfig
from apps.exams.serializers import (ExamFinalResultConfigurationSerializer, ExamResultCumulativeConfigurationSerializer, ExamResultMarksObtainedSerializer, ExamResultReadConfigurationSerializer, ExamResultSubjectConfigurationSerializer, ResultConfigurationSerializer, ResultSectionApprovalSerializer, ResultSectionMappingSerilaizer,
                                    ResultMarksConfigurationSerializer, ExamScheduleReadSerilaizer,ResultReadConfigurationMergeSerializer,FinalResultMarksConfigurationSerializer,FinalResultConfigurationMergeSerializer,FinalResultConfigurationReadSerializer,FinalResultConfigurationReadSerializer,
                                    ResultConfigurationReadSerializer,ResultConfigurationMergeSerializer, FinalResultConfigurationSerializer,FinalResultSectionMappingSerializer,FinalResultSectionApprovalSerializer,FinalResultReadConfigurationMergeSerializer)
from apps.shared.services import FormdefinitionService, SharedService
from apps.exams.services.exam import get_section_wise_list_for_exam,examsConductedForStandardSectionnew
from apps.exams.services.mark import get_approved_standard_section_list, get_marks_for_config, get_standard_section_subjects, get_student_grade
from apps.students.models import Student
from apps.shared.models.approval import ApproveStatus
from apps.tenants.services.middlewares import get_current_db_name

def add_final_result_configuration(self, data):
    result_configuration_data = {'academic_year': data['academic_year'],'exam':data['exam']}
    validate_result_data(self, data)
    if 'id' in data:
        result_configuration_data['id'] = data['id']
    existing_approval_data = {r['standard_section_id']: r for r in FinalResultSectionApproval.objects.filter(
        final_result_config__academic_year=data['academic_year'],final_result_config__exam=data['exam']
    ).values()}
    with transaction.atomic(using=get_current_db_name()):
        self.serializer_class = FinalResultConfigurationSerializer
        config_data = SharedService.add_or_update_data(self, [result_configuration_data])
        standard_section_ids = [e['standard_section'] for e in data['section_list']]
        delete_final_config_related_data(self, config_data['data']['id'], standard_section_ids)
        for section_data in data['section_list']:
            grade_plan = None
            if 'grade_plan' in section_data:
                grade_plan = section_data['grade_plan']
            if 'total_grade_plan' in section_data:
                total_grade_plan = section_data['total_grade_plan']
            if int(section_data['standard_section']) in existing_approval_data:
                approval_data = existing_approval_data[int(section_data['standard_section'])]
                approval_data['grade_plan'] = grade_plan
                approval_data['total_grade_plan'] = total_grade_plan
            else:
                approval_data = {
                    'approval_status': 0, 'grade_plan': grade_plan,'total_grade_plan': total_grade_plan,
                    'standard_section': section_data['standard_section'], 'final_result_config': config_data['data']['id'],
                    'is_announced': False
                }
            add_or_update_final_result_sec_approval(self, approval_data)
            exam_resultmarkconfig_id_update_mapping = {}
            for subject_data in section_data['subject_list']:
                temp_result_data = {'final_result': config_data['data']['id'],
                                  'standard_section': section_data['standard_section'],
                                  'subject': subject_data['subject'], 'max_marks': subject_data['max_marks'],
                                  'min_marks': subject_data['min_marks']}
                standard_mapping_serializer = FinalResultSectionMappingSerializer(data=temp_result_data)
                standard_mapping_serializer.is_valid(raise_exception=True)
                standard_mapping_data = standard_mapping_serializer.save()
                marks_data = []
                for mark_data in subject_data['marks_configuration']:
                    marks = mark_data['marks'] if 'marks' in mark_data else 0
                    cum_marks = mark_data['cum_marks'] if 'cum_marks' in mark_data else None
                    is_cum_disabled = mark_data['is_cum_disabled'] if 'is_cum_disabled' in mark_data else None
                    is_disabled = mark_data['is_disabled'] if 'is_disabled' in mark_data else 0
                    cum_marks_detail = None
                    # Handle individual cumulative type marks
                    if 'cum_marks_list' in mark_data and mark_data['cum_marks_list']:
                        import json
                        cum_marks_detail = json.dumps(mark_data['cum_marks_list'])
                        # Compute total cum_marks for backward compatibility
                        cum_marks_total = 0
                        any_cum_disabled = False
                        for cum_item in mark_data['cum_marks_list']:
                            if not cum_item.get('is_cum_disabled', False):
                                cum_marks_total += float(cum_item.get('marks', 0) or 0)
                            else:
                                any_cum_disabled = True
                        cum_marks = cum_marks_total if cum_marks_total > 0 else cum_marks
                        if any_cum_disabled and not is_cum_disabled:
                            is_cum_disabled = False  # individual types handle their own disable
                    if marks and is_disabled:
                        raise ValidationError('Disabled configuration should not have marks')
                    if not mark_data['is_only_grade_for_config']:
                        if not marks and not is_disabled:
                            raise ValidationError('marks / isdiabled any one of the value should be provided')
                    if cum_marks and is_cum_disabled:
                        raise ValidationError('Disabled cumulative configuration should not have marks')
                    marks_data.append({'marks': mark_data['marks'], 'exam': mark_data['exam'],
                                      'result_section': standard_mapping_data.id,
                                      'is_disabled': mark_data['is_disabled'], 'cum_marks': cum_marks, 
                                      'is_cum_disabled': is_cum_disabled,'is_only_grade_for_config':mark_data['is_only_grade_for_config'],
                                      'cum_marks_detail': cum_marks_detail})
                    merge_data = []
                    for merging_data in section_data['merge_list']:
                        merge_data.append({'name':merging_data['merge_id'],'final_result_config':config_data['data']['id'],'standard_section':section_data['standard_section'],'exam':merging_data['exam_list']})
                mark_config = FinalResultMarksConfigurationSerializer(data=marks_data, many=True)
                mark_config.is_valid(raise_exception=True)
                mark_config.save()
        response=FinalResultConfigurationMergeSerializer(data=merge_data,many=True)
        response.is_valid(raise_exception=True)
        response.save()
        return {'data': 'Data Saved Successfully'}

def add_or_update_final_result_sec_approval(self, data):
    if 'id' in data and data['id']:
        instance = FinalResultSectionApproval.objects.get(id=data['id'])
        serializer = FinalResultSectionApprovalSerializer(instance=instance, data=data)
    else:
        serializer = FinalResultSectionApprovalSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Data Added Successfully'}

def delete_final_config_related_data(self, resultId, standardSectionIds):
    standardMappingObj = FinalResultSectionMapping.objects.filter(final_result=resultId, standard_section__in=standardSectionIds, is_active=True)
    resultconfigurationIds = FinalResultMarksConfiguration.objects.filter(
        result_section__in=standardMappingObj.values_list('id', flat=True))
    MergeIds=FinalResultConfigurationMerge.objects.filter(final_result_config=resultId, standard_section__in=standardSectionIds)
    MergeIds.delete()
    resultconfigurationIds.delete()
    standardMappingObj.update(is_active=False)


def validate_result_data(self, data):
    config_id = None
    if 'id' in data:
        config_id = data['id']
    validate_final_result_configuration(self, data['academic_year'],data['exam'], config_id)
    section_subject_exam = []
    exam_ids = set()
    temp_section_ids = []  # used to check duplicatesection
    for section_data in data['section_list']:
        if FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'grade_plan'):
            if 'grade_plan' not in section_data or not section_data['grade_plan']:
                raise ValidationError('grade_plan is mandatory')
        if section_data['standard_section'] in temp_section_ids:
            stand_sec_obj = StandardSectionMapping.objects.get(id=section_data["standard_section"])
            raise ValidationError(
                f'Duplicate Standard Section found for {stand_sec_obj.standard.name} - {stand_sec_obj.section.name}')
        temp_section_ids.append(section_data['standard_section'])
        temp_subject_ids = []  # checking for duplicate subject in section
        for subject_data in section_data['subject_list']:
            if subject_data['subject'] in temp_subject_ids:
                stand_sec_obj = StandardSectionMapping.objects.get(id=section_data["standard_section"])
                raise ValidationError(f'Duplicate Subject id found \
            {Subject.objects.get(id=subject_data["subject"]).name} for standard {stand_sec_obj.standard.name} - {stand_sec_obj.section.name}')
            for exam_details in subject_data['marks_configuration']:
                if not exam_details['is_only_grade_for_config']:
                    if not subject_data['max_marks'] or not subject_data['min_marks']:
                        raise ValidationError('Minimum and Maximum Marks are mandatory')
                    if subject_data['min_marks'] > subject_data['max_marks']:
                        raise ValidationError('Minimum marks should be less than the Maximum Marks')
            temp_subject_ids.append(subject_data['subject'])
            temp_total_marks = 0
            for exam_data in subject_data['marks_configuration']:
                exam_ids.add(exam_data['exam'])
                temp = {'standard_section': section_data['standard_section'], 'subject': subject_data['subject'],
                        'exam': exam_data['exam']}
                section_subject_exam.append(temp)
                temp_total_marks += exam_data['marks'] if exam_data['marks'] else 0
                temp_total_marks += exam_data['cum_marks'] if ('cum_marks' in exam_data and exam_data['cum_marks']) else 0
            for exam_details in subject_data['marks_configuration']:
                if not exam_details['is_only_grade_for_config']:
                    if subject_data['max_marks'] != temp_total_marks:
                        stand_sec_obj = StandardSectionMapping.objects.get(id=section_data["standard_section"])
                        # raise ValidationError(f'Exam marks is not equal to total marks {stand_sec_obj.standard.name} - {stand_sec_obj.section.name}')
    given_exam_data = Exam.objects.filter(id__in=list(exam_ids)).values('academic_year', 'exam_type__name')
    approval_data = FinalResultSectionApproval.objects.filter(
        final_result_config__academic_year=data['academic_year'],
        standard_section__in=temp_section_ids
    ).values(
        'approval_status', 'standard_section__section__name', 'standard_section__standard__name', 'standard_section'
    )
    for approval in approval_data:
        if approval['approval_status']:
            error_data  = approval['standard_section__standard__name'] + ' - ' + approval['standard_section__section__name']
            raise ValidationError(f'{error_data} already approved result configuration')
    for e_data in given_exam_data:
        if str(e_data['academic_year']) != str(data['academic_year']):
            raise ValidationError(f'{e_data["exam_type__name"]} is not in the same academic year')
    validate_standard_examschedule_final(self, section_subject_exam, data['academic_year'])


def validate_final_result_configuration(self, academicYear, exam,configId=None):
    excludeQuery = {}
    if configId:
        excludeQuery = {'id': configId}
    resultConfigObject = FinalResultConfiguration.objects.filter(academic_year=academicYear,exam=exam).exclude(
        **excludeQuery)
    if resultConfigObject.count() > 0:
        raise ValidationError(
            f'Result already configured for the academic year')


def validate_standard_examschedule_final(self, sectionSubjectExam, academic_year):
    scheduledData = ExamSchedule.objects.filter(exam__academic_year=academic_year).values('exam', 'subject',
                                                                        'standard_section',
                                                                        'exam__academic_year')
    existingScheduledMapping = []
    examAcademicIds = []
    standardSectionMapping = {}
    for data in scheduledData:
        examAcademicIds.append(data['exam__academic_year'])
    for data in scheduledData:
        tempKey = str(data['standard_section']) + '_' + str(data['subject']) + '_' + str(data['exam'])
        existingScheduledMapping.append(tempKey)
    for givenData in sectionSubjectExam:
        tempKey = str(givenData['standard_section']) + '_' + str(givenData['subject']) + '_' + str(givenData['exam'])
        if tempKey not in existingScheduledMapping:
            examName = Exam.objects.get(id=givenData['exam'])
            standSecObj = StandardSectionMapping.objects.get(id=givenData["standard_section"])
            raise ValidationError(
                f'Subject {Subject.objects.get(id=givenData["subject"]).name} is not scheduled for {standSecObj.standard.name} - {standSecObj.section.name} for {examName.exam_type.name}')


# def validate_and_return_announce_result(self, examId, standardSection):
# examObj = Exam.objects.get(id=examId)
# academicyear= examObj.academic_year
# filterQuery = {'exam': examObj}
# standardIds = examObj.standard_ids.split(',')
# standardData = Standard.objects.filter(id__in=standardIds).values('id', 'name')
# standardData = {standard['id']: standard['name'] for standard in standardData}
# filterQuery['standard__in'] = standardIds
# enrolledStudents = Enrollment.objects.order_by().filter(standard_section__standard__in=standardIds,
# standard_section__academic_year=academicyear).annotate( full_name=Concat('student__first_name', V(' '),
# 'student__middle_name', V(' '), 'student__last_name'),
# standard=F('standard_section__standard')).values('student', 'standard', 'full_name')
# studentData = {val['student'] : val for val in enrolledStudents} #student standard Mappings
# studentQueryset = Student.objects.filter(id__in=studentData.keys()).distinct()
# # studentSubjectData = {student['id']: student for student in studentSubjectData.data} #student in standard
# scheduleData = ExamSchedule.objects.filter(**filterQuery).values()
# scheduleIds = []
# scheduleStandardSubjectMapping = {}
# for schedule in scheduleData:
#     scheduleIds.append(schedule['id'])
#     standardId = schedule['standard_id']
#     subjectId = schedule['subject_id']
#     if standardId in scheduleStandardSubjectMapping:
#         scheduleStandardSubjectMapping[standardId].append(subjectId)
#     else:
#         scheduleStandardSubjectMapping[standardId] = []
#         scheduleStandardSubjectMapping[standardId].append(subjectId)
# scheduleData = {schedule['id'] : schedule for schedule in scheduleData}
# studentMarks = StudentMark.objects.filter(exam_schedule__in=scheduleData.keys()).annotate(subject=F('exam_schedule__subject')).\
#     values('student', 'attendance_status','subject', 'marks')
# studentMarkMapping = {}
# for mark in studentMarks:
#     temp = {mark['subject']: mark['marks']}
#     if mark['student'] in studentMarkMapping:
#         studentMarkMapping[mark['student']][mark['subject']] = mark['marks']
#     else:
#         studentMarkMapping[mark['student']] = {}
#         studentMarkMapping[mark['student']][mark['subject']] = mark['marks']
# unmarkedStudentMarks = {}
# markedStudentMarks = {}
# for student in studentSubjectData.data:
#     studentId = student['id']
#     studentStandard = studentData[studentId]['standard']
#     standardName = standardData[studentStandard]
#     for studentSubject in student['student_subject']:
#         subjectId = studentSubject['subject']
#         if studentStandard in scheduleStandardSubjectMapping and subjectId in scheduleStandardSubjectMapping[studentStandard]:
#             if studentId not in studentMarkMapping or subjectId not in studentMarkMapping[studentId]:
#                 temp = {'standard': studentStandard, 'student': studentId, 'student_name': studentData[studentId]['full_name'],
#                  'subject': subjectId, 'standard_name': standardName}
#                 if studentStandard in unmarkedStudentMarks:
#                     unmarkedStudentMarks[studentStandard].append(temp)
#                 else:
#                     unmarkedStudentMarks[studentStandard] = []
#                     unmarkedStudentMarks[studentStandard].append(temp)
#             else:
#                 temp = {'standard': studentStandard, 'student': studentId, 'student_name': studentData[studentId]['full_name'],
#                  'subject': subjectId, 'marks': studentMarkMapping[studentId][subjectId], 'standard_name': standardName}
#                 if studentId in markedStudentMarks:
#                     markedStudentMarks[studentId].append(temp)
#                 else:
#                     markedStudentMarks[studentId] = []
#                     markedStudentMarks[studentId].append(temp)
# #unmarked attendance grouped by standard
# #marked attendace grouped by student
# return {'marked_marks' : markedStudentMarks, 'unmarked_marks': unmarkedStudentMarks}


def get_final_configuration_data(self, request, academicId,exam):
    standard_section_heirarchy = get_section_wise_list_for_exam(None, {'academic_year': academicId})
    standard_section_ids = []
    standard_section_mapping = {}
    subject_wise_config_data = {}  # here maps standard_section -> subject -> config data
    exam_data = Exam.objects.filter(academic_year=academicId).values('id', 'exam_type__name', 'description')
    exam_data = {str(examObj['id']): examObj for examObj in exam_data}
    if not exam_data:
        raise ValidationError('No Exams Exist')
    for standard_data in standard_section_heirarchy:
        for section_data in standard_data['section_list']:
            standard_section_ids.append(section_data['standard_section'])
    result_section_approval = {r['standard_section'] : r for r in FinalResultSectionApproval.objects.filter(
        standard_section__in=standard_section_ids, final_result_config__academic_year=academicId, final_result_config__exam=exam
    ).values('approval_status', 'is_announced', 'standard_section')}
    values = [
        'standard_section', 'subject', 'subject__name', 'standard_section__standard',
         'subject__sequence', 'subject__subject_part_type__name', 'subject__subject_part_type'
    ]
    schedule_data = ExamSchedule.objects.filter(standard_section__in=standard_section_ids, exam__academic_year=academicId).values(*values)
    schedule_data = schedule_data |  ExamSchedule.objects.filter(standard_section__in=standard_section_ids).values(*values) #for some reason Q() not working temproary solution 
    for schedule in schedule_data:
        standard_id = schedule['standard_section__standard']
        if standard_id not in standard_section_mapping:
            standard_section_mapping[standard_id] = {}
        standard_section_mapping[standard_id][schedule['subject']] = {'subject': schedule['subject'],
                                                                   'subject_name': schedule['subject__name'],
                                                                    'subject_sequence': schedule['subject__sequence'],
                                                                    'subject_part_type': schedule['subject__subject_part_type__name'],
                                                                    'subject_part_type_id': schedule['subject__subject_part_type']
                                                                }

    standard_section_mapping1 = {}
    for standard_id in standard_section_mapping:
        standard_section_mapping1[standard_id] = []
        for subjectId in standard_section_mapping[standard_id]:
            standard_section_mapping1[standard_id].append(standard_section_mapping[standard_id][subjectId])

    result_configuration = FinalResultMarksConfiguration.objects.filter(result_section__final_result__academic_year=academicId,result_section__final_result__exam=exam,
                                                                      exam__in=exam_data.keys()).values(
        'id', 'result_section', 'exam', 'marks', 'result_section__standard_section', 'result_section__subject',
        'exam__exam_type__name', 'result_section__max_marks', 'result_section__min_marks', 'is_disabled',
        'cum_marks'
    )
    for result_config_data in result_configuration:
        if result_config_data['result_section__standard_section'] not in subject_wise_config_data:
            subject_wise_config_data[result_config_data['result_section__standard_section']] = {}
        if result_config_data['result_section__subject'] not in subject_wise_config_data[
            result_config_data['result_section__standard_section']]:
            temp = {'max_marks': 0, 'min_marks': 0, 'exam_list': []}
            subject_wise_config_data[result_config_data['result_section__standard_section']][
                result_config_data['result_section__subject']] = temp
        exam_temp = {'exam': result_config_data['exam'], 'exam_type_name': result_config_data['exam__exam_type__name'],
                    'configured_marks': result_config_data['marks'], 'is_disabled': result_config_data['is_disabled'],
                    'configured_cum_marks': result_config_data['cum_marks']
                    }
        subject_wise_config_data[result_config_data['result_section__standard_section']][
            result_config_data['result_section__subject']]['max_marks'] = result_config_data['result_section__max_marks']
        subject_wise_config_data[result_config_data['result_section__standard_section']][
            result_config_data['result_section__subject']]['min_marks'] = result_config_data['result_section__min_marks']
        subject_wise_config_data[result_config_data['result_section__standard_section']][
            result_config_data['result_section__subject']]['exam_list'].append(exam_temp)
    # chaning the key to orignal data
    for standard_data in standard_section_heirarchy:
        standard_data['subject_list'] = []
        if standard_data['standard'] in standard_section_mapping1:
            standard_data['subject_list'] = standard_section_mapping1[standard_data['standard']]
        standard_data['subject_list'] = sorted(standard_data['subject_list'], key=lambda d: d['subject_name'])
        for section_data in standard_data['section_list']:
            section_data['subject_data'] = {}
            if section_data['standard_section'] in subject_wise_config_data:
                section_data['subject_data'] = subject_wise_config_data[section_data['standard_section']]
            if section_data['standard_section'] in result_section_approval:
                section_data['approval_status'] = result_section_approval[section_data['standard_section']]['approval_status']
                section_data['is_announced'] = result_section_approval[section_data['standard_section']]['is_announced']
    part_type_list = SubjectPartType.objects.all().values()
    return {'data': {'standard_data': standard_section_heirarchy, 'part_type_list': part_type_list}}



def get_final_section_configuration_data(self, data):
    standard_section_id = self.request.GET.get('standard_section')
    academic_year_id = self.request.GET.get('academic_year')
    exam = self.request.GET.get('exam')

    result_data = get_final_result_configuration_mapping(None, exam,academic_year_id, standard_section_id)
    return {
        'data': {
            'available_exam_list': examsConductedForStandardSectionnew(academic_year_id, standard_section_id),
            'result_data': result_data['result_data'],
            'config_id': result_data['configuration_id'],
            'grade_plan': result_data['grade_plan'],
            'grade_plan_name': result_data['grade_plan_name'],
            'total_grade_plan': result_data['total_grade_plan'],
            'total_grade_plan_name': result_data['total_grade_plan_name'],
            'merge_data': result_data['merge_data'],
            'exam_subject_result_mapping_config': result_data['exam_subject_result_mapping_config'],
            'approval_status': result_data['approval_status'],
            'part_type_list': SubjectPartType.objects.all().values()
        }
    }


def get_final_result_configuration_mapping(result_config_id, exam,academic_year_id, standard_section_id,
                                     return_serializer_data=False, show_final_result_data=False):
    if result_config_id:
        filter_query = {'id': result_config_id}
    else:
        filter_query = {'academic_year': academic_year_id,'exam':exam}
    result_config = FinalResultConfiguration.objects.filter(**filter_query).first()
    approval_status = False
    try:
        approval_status =  FinalResultSectionApproval.objects.get(final_result_config=result_config.id, standard_section=standard_section_id).approval_status
    except:
        pass
    if not result_config_id and result_config:
        result_config_id = result_config.id
    exam_schedule_qs = ExamSchedule.objects.filter(exam__academic_year=academic_year_id)
    exam_schedule_data =ExamScheduleReadSerilaizer(exam_schedule_qs, many=True).data
    schedule_data_for_section = []
    result_data = FinalResultConfigurationReadSerializer(result_config, context={'filtered_list': [
        {'name': 'standard_section', 'value': standard_section_id},
        {'name': 'is_active', 'value': True}
    ]})
    merge_config_qs = FinalResultConfigurationMerge.objects.filter(final_result_config=result_config_id,standard_section=standard_section_id)
    merge_config_data = FinalResultReadConfigurationMergeSerializer(merge_config_qs,many=True).data
    merge_data_list=[]
    for merge_data in merge_config_data:
        merge_data_list.append({'merge_name':merge_data['merge_name'],'merge':merge_data['name'],'exam_list':merge_data['exam']})
    exam_subject_result_mapping_config = {}
    grade_plan_id = None
    grade_plan_name = None
    total_grade_plan_id = None
    total_grade_plan_name = None
    try:
        result_section_approval = FinalResultSectionApproval.objects.get(
            final_result_config=result_config_id, standard_section=standard_section_id
        )
        grade_plan_id = result_section_approval.grade_plan.id
        grade_plan_name = result_section_approval.grade_plan.name
        total_grade_plan_id = result_section_approval.total_grade_plan.id
        total_grade_plan_name = result_section_approval.total_grade_plan.name
    except:
        pass
    serialize_data = result_data.data
    for index, subject_data in enumerate(serialize_data['result_section_data']):
        serialize_data['result_section_data'][index]['exam_test_result'] = {}
        for index1, result_data in enumerate(subject_data['subject_exam_data']):
            # Parse cum_marks_detail JSON if present
            if result_data.get('cum_marks_detail'):
                import json
                try:
                    result_data['cum_marks_list'] = json.loads(result_data['cum_marks_detail'])
                except (json.JSONDecodeError, TypeError):
                    result_data['cum_marks_list'] = None
            serialize_data['result_section_data'][index]['exam_test_result'][result_data['exam']] = result_data
        if not return_serializer_data:
            del serialize_data['result_section_data'][index]['subject_exam_data']
    subject_config_data = {}
    for index, subject_data1 in enumerate(serialize_data['result_section_data']):
        subject_data1 = {**subject_data1, **subject_data1['exam_test_result']}
        subject_config_data[subject_data1['subject']] = subject_data1
    subject_schedule_data = {}
    for exam_schedule in exam_schedule_data:
        temp_exam_schedule = {
            'min_marks': exam_schedule['min_marks'], 'max_marks': exam_schedule['max_marks'],
            'cum_max_marks': 0, 'cum_min_marks': 0, 'is_marks' : exam_schedule['is_marks'], 'exam_description':exam_schedule['exam_description']
        }
        if not exam_schedule['is_marks']:
            temp_exam_schedule['grade_plan']=exam_schedule['grade_plan']
            temp_exam_schedule['grade_plan_name']=exam_schedule['grade_plan_name']
        subject_data = {'subject': exam_schedule['subject'], 'subject_name': exam_schedule['subject_name'],
                       'is_configured': False, 'subject_part_type': exam_schedule['subject_part_type'],
                       'subject_part_type_id': exam_schedule['subject_part_type_id']}
        proceed = False  # track schedule exist for section
        # Build individual cumulative_list with per-type data
        cumulative_list = []
        if 'cumulative_mapping' in exam_schedule:
            for cum_row in exam_schedule['cumulative_mapping']:
                cum_max = cum_row['max_marks'] if cum_row['max_marks'] else 0
                cum_min = cum_row['min_marks'] if cum_row['min_marks'] else 0
                temp_exam_schedule['cum_max_marks'] += cum_max
                temp_exam_schedule['cum_min_marks'] += cum_min
                # Extract cumulative type info
                cum_type_id = None
                cum_type_name = ''
                cum_type_alias = ''
                if cum_row.get('cumulative_type_data') and len(cum_row['cumulative_type_data']) > 0:
                    cum_type_id = cum_row['cumulative_type_data'][0].get('id')
                    cum_type_name = cum_row['cumulative_type_data'][0].get('name', '')
                    cum_type_alias = cum_row['cumulative_type_data'][0].get('alias', '')
                cumulative_list.append({
                    'cum_type_id': cum_type_id,
                    'cum_type_name': cum_type_name,
                    'cum_type_alias': cum_type_alias,
                    'cum_max_marks': cum_max,
                    'cum_min_marks': cum_min,
                })
        temp_exam_schedule['cumulative_list'] = cumulative_list
        temp_exam_schedule['total_max_marks'] = temp_exam_schedule['max_marks'] if temp_exam_schedule['max_marks'] else 0 +  temp_exam_schedule['cum_max_marks']
        temp_exam_schedule['total_min_marks'] = temp_exam_schedule['min_marks'] if temp_exam_schedule['min_marks'] else 0 +  temp_exam_schedule['cum_min_marks']
        if str(exam_schedule['standard_section']) == str(standard_section_id):
            proceed = True
            if exam_schedule['subject'] in subject_schedule_data:
                subject_schedule_data[exam_schedule['subject']]['exam_test_list'][
                    exam_schedule['exam']] = temp_exam_schedule
            else:
                subject_schedule_data[exam_schedule['subject']] = subject_data
                subject_schedule_data[exam_schedule['subject']]['exam_test_list'] = {}
                subject_schedule_data[exam_schedule['subject']]['exam_test_list'][
                    exam_schedule['exam']] = temp_exam_schedule
        if exam_schedule['subject'] in subject_config_data and exam_schedule['exam'] in subject_config_data[
            exam_schedule['subject']] and proceed:
            if not subject_schedule_data[exam_schedule['subject']]['is_configured']:
                subject_schedule_data[exam_schedule['subject']]['is_configured'] = True
                subject_schedule_data[exam_schedule['subject']]['configured_max_marks'] = \
                subject_config_data[exam_schedule['subject']]['max_marks']
                subject_schedule_data[exam_schedule['subject']]['configured_min_marks'] = \
                subject_config_data[exam_schedule['subject']]['min_marks']
                if show_final_result_data:
                    subject_schedule_data[exam_schedule['subject']]['final_result_configured_marks'] = \
                    subject_config_data[exam_schedule['subject']]['final_result_configured_marks']
                    subject_schedule_data[exam_schedule['subject']]['final_result_configured_min_marks'] = \
                    subject_config_data[exam_schedule['subject']]['final_result_configured_min_marks']
                    subject_schedule_data[exam_schedule['subject']]['final_result_disabled'] = \
                    subject_config_data[exam_schedule['subject']]['final_result_disabled']
            subject_schedule_data[exam_schedule['subject']]['exam_test_list'][exam_schedule['exam']]['configured_marks'] = \
            subject_config_data[exam_schedule['subject']][exam_schedule['exam']]['marks'] if 'marks' in subject_config_data[exam_schedule['subject']][exam_schedule['exam']] else 0
            subject_schedule_data[exam_schedule['subject']]['exam_test_list'][exam_schedule['exam']]['configured_cum_marks'] = \
            subject_config_data[exam_schedule['subject']][exam_schedule['exam']]['cum_marks']
            subject_schedule_data[exam_schedule['subject']]['exam_test_list'][exam_schedule['exam']]['is_disabled'] = \
            subject_config_data[exam_schedule['subject']][exam_schedule['exam']]['is_disabled']
            # Populate individual configured cum marks per cumulative type
            config_cum_marks = subject_config_data[exam_schedule['subject']][exam_schedule['exam']].get('cum_marks_list', None)
            if config_cum_marks:
                cum_marks_map = {str(cm['cum_type_id']): cm for cm in config_cum_marks}
                for cum_item in subject_schedule_data[exam_schedule['subject']]['exam_test_list'][exam_schedule['exam']]['cumulative_list']:
                    cum_key = str(cum_item['cum_type_id'])
                    if cum_key in cum_marks_map:
                        cum_item['configured_cum_marks'] = cum_marks_map[cum_key].get('marks')
                        cum_item['is_cum_disabled'] = cum_marks_map[cum_key].get('is_cum_disabled', False)
    for subject_d in subject_schedule_data:
        schedule_data_for_section.append(subject_schedule_data[subject_d])
    if return_serializer_data:
        return serialize_data
    return {
        'result_data': schedule_data_for_section, 'configuration_id': result_config_id, 
        'exam_subject_result_mapping_config': exam_subject_result_mapping_config, 'grade_plan':grade_plan_id,
        'grade_plan_name': grade_plan_name, 'total_grade_plan':total_grade_plan_id,
        'total_grade_plan_name': total_grade_plan_name,'approval_status': approval_status,'merge_data':merge_data_list
    }

def approve_final_result_config(self, request):
    academic_year = request.data['academic_year']
    standard_section_ids = request.data['standard_section_ids']
    approval_status = request.data['approval_status']
    exam = request.data['exam']
    data_to_save = []
    existing_data = {r['standard_section_id']:r for r in FinalResultSectionApproval.objects.filter(
        standard_section__in=standard_section_ids, final_result_config__academic_year=academic_year, final_result_config__exam=exam
    ).values()}
    configuration_data = {r['standard_section'] for r in FinalResultSectionMapping.objects.filter(
        standard_section__in=standard_section_ids, final_result__academic_year=academic_year,final_result_config__exam=exam,
        is_active=True
    ).values('standard_section')}

    data_to_save = []
    error_data = []
    for standard_section in standard_section_ids:
        if standard_section not in configuration_data:
            standard_sec_obj = StandardSectionMapping.objects.get(id=standard_section)
            error_data.append(
                f'{standard_sec_obj.standard.name} {standard_sec_obj.section.name} no configuration data found to approve'
            )
        if standard_section not in existing_data:
            raise ValidationError('standard section not yet configured to approve')
        temp = existing_data[standard_section]
        temp['approval_status'] = approval_status
        data_to_save.append(temp)
    if error_data:
        raise ValidationError(error_data)
    if data_to_save:
        SharedService.add_or_update_data(self, data_to_save)
    else:
        raise ValidationError('No configuration data')
    return {'Reason': 'Approved Successfully'}

def announce_final_result_list_config(self, request):
    academicYearId = request.GET.get('academic_year', None)
    exam = request.GET.get('exam', None)
    if not academicYearId:
        raise ValidationError('Academic is mandatory')
    examData = Exam.objects.filter(is_active=True, academic_year=academicYearId).values()
    examData = {examObj['id']: examObj for examObj in examData.values()}
    standard = self.request.GET.get('standard')
    standard_section_ids = self.request.GET.get('standard_section_ids')
    if standard_section_ids:
        standard_section_ids = standard_section_ids.split(',')
    if standard:
        standard_section_ids = StandardSectionMapping.objects.filter(
            standard=standard, academic_year=academicYearId
        ).values_list('id', flat=True)
    standardSectionData = get_section_wise_list_for_exam(examData.keys(), {}, False, standard_section_ids)
    request.GET._mutable = True
    standardSectionIds = set()
    for standardSecObj in standardSectionData:
        for sectionData in standardSecObj['section_list']:
            standardSectionIds.add(sectionData['standard_section'])
    enrollment_data = Enrollment.objects.filter(
        standard_section__in=list(standardSectionIds)
    ).values('standard_section', 'student')
    section_student_mapping = {}
    student_ids = []
    for enrollment in enrollment_data:
        student_ids.append(enrollment['student'])
        if enrollment['standard_section'] not in section_student_mapping:
            section_student_mapping[enrollment['standard_section']] = []
        section_student_mapping[enrollment['standard_section']].append(enrollment['student'])
    announced_data = list(StudentExamFinalResultForFinalConfig.objects.filter(
        final_result_config__academic_year=academicYearId,final_result_config__exam=exam,
        student__in=student_ids,
        is_announced=True
    ).values_list('student', flat=True))
    section_announcement_data = {}
    for section_id in section_student_mapping:
        section_announcement_data[section_id] = True
        for student in section_student_mapping[section_id]:
            if student not in announced_data:
                section_announcement_data[section_id] = False
    for standardSecObj in standardSectionData:
        for sectionData in standardSecObj['section_list']:
            request.GET['raise_approval_error'] = False
            request.GET['standard_section'] = sectionData['standard_section']
            marksData = get_marks_for_config(self, request)
            sectionData['is_announced'] = section_announcement_data[sectionData['standard_section']] if sectionData['standard_section'] in section_announcement_data else False
            if not marksData['isapproved']:
                sectionData['result_data'] = {'total': '', 'pass': '', 'fail': ''}
                sectionData['isapproved'] = False
                sectionData['approval_error'] = marksData['approvalError']
                continue
            sectionData['result_data'] = {'total': 0, 'pass': 0, 'fail': 0}
            sectionData['isapproved'] = True
            sectionData['approval_error'] = ''
            for markData in marksData['data']['student_list']:
                sectionData['result_data']['total'] += 1
                if markData['total_result'] == 'fail':
                    sectionData['result_data']['fail'] += 1
                elif markData['total_result'] == 'pass':
                    sectionData['result_data']['pass'] += 1
    return {'data': standardSectionData}

def exam_final_result_config_summary(self, request):
    academic_year_id = request.GET.get('academic_year')
    exam_id = request.GET.get('exam_id')
    standard = request.GET.get('standard')
    standard_section_ids = request.GET.get('standard_section_ids')
    if not academic_year_id:
        raise ValidationError('academic_year is mandatory')
    filter_for_section = {'academic_year': academic_year_id}
    standard_section_ids = None
    if standard:
        standard_section_ids = StandardSectionMapping.objects.filter(
            standard=standard, academic_year=academic_year_id
        ).values_list('id', flat=True)
        if not standard_section_ids:
            raise ValidationError('Given Standard not configured for the exam')
    elif standard_section_ids:
        standard_section_ids = [int(x) for x in standard_section_ids.split(',')]
        if not standard_section_ids:
            raise ValidationError('Given Standard not configured for the exam')
    standard_section_heirarchy = get_section_wise_list_for_exam(None, filter_for_section, False, standard_section_ids)
    exam_term_list = list(ExamTerm.objects.all().values())
    result_term_section_approval = {}
    for res in FinalResultSectionApproval.objects.filter(
            final_result_config__academic_year=academic_year_id
        ).values('final_result_config', 'standard_section', 'approval_status'):
        if res['final_result_config'] not in result_term_section_approval:
            result_term_section_approval[res['final_result_config']] = {}
        result_term_section_approval[res['final_result_config']][res['standard_section']] = {
            'approval_status': res['approval_status']
        }
    for standard_data in standard_section_heirarchy:
        for standard_section in standard_data['section_list']:
            standard_section['term_mark_mapping'] = {}
            total_final_max_marks = 0
            for term_data in exam_term_list:
                # result_data = get_final_result_configuration_mapping(
                #     None, term_data['id'],academic_year_id, standard_section['standard_section'], show_final_result_data=True
                # )
                configured_max_marks = 0
                # for res in result_data['result_data']:
                #     if 'final_result_configured_marks' in res and res['final_result_configured_marks']:
                #         total_final_max_marks += res['final_result_configured_marks']
                #     configured_max_marks += res['configured_max_marks'] if 'configured_max_marks' in res and res['configured_max_marks'] else 0
                approval_status = False
                if term_data['id'] in result_term_section_approval and standard_section['standard_section'] in result_term_section_approval[term_data['id']]:
                    approval_status = result_term_section_approval[term_data['id']][standard_section['standard_section']]['approval_status']
                standard_section['term_mark_mapping'][term_data['id']] = {
                    'configured_marks': configured_max_marks,
                    'is_finalized': approval_status
                }
            standard_section['term_mark_mapping']['final_result_config'] = {
                'configured_marks': 0,
                'is_finalized': False
            }
    exam_term_list.append(
        {
        'name': 'Final Result Config', 'id': 'final_result_config'
        }
    )
    return {'data': {'standard_data': standard_section_heirarchy, 'exam_term_list': exam_term_list}}


def announce_final_result_config(self, request):
    finalresultConfigId = request.data['final_result_config']
    standardSectionId = request.data['standard_section']
    if not finalresultConfigId or not standardSectionId:
        raise ValidationError('Final Result Config Id and standardSectionId is mandatory')
    request.GET._mutable = True
    request.GET['standard_section'] = standardSectionId
    request.GET['result_config'] = finalresultConfigId
    configMarks = get_marks_for_config(self, request)
    if configMarks['data']['is_announced']:
        raise ValidationError('Already Announced for the section')
    announceData = []
    for studentData in configMarks['data']['student_list']:
        temp = {'status': studentData['total_result'], 'result_config': finalresultConfigId, 'is_announced': True,
                'student': studentData['student']}
        if 'final_result_id' in studentData and studentData['final_result_id']:
            temp['id'] = studentData['final_result_id']
        else:
            temp['changed_user'] = request.user.id
        announceData.append(temp)
    if not announceData:
        raise ValidationError('Nothing to announce')
    return SharedService.add_or_update_data(self, announceData)
