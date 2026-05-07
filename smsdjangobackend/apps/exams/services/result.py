from rest_framework.exceptions import ValidationError
from django.db import transaction
from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from apps.classes.models.subject import SubjectPartType

from apps.exams.models import ResultConfiguration, ResultMarksConfiguration, ResultSectionMapping,Grade
from apps.exams.models.exam import GradePlan
from apps.classes.models import (Subject, StandardSectionMapping, Enrollment)
from apps.exams.models import (ExamSchedule, Exam, StudentMark, StudentExamFinalResult)
from apps.exams.models.exam import ExamTerm
from apps.exams.models.marks import StudentCumulativeMark, StudentMarkSectionWiseApproval
from apps.exams.models.result import ExamFinalResultConfiguration, ResultSectionApproval,ResultConfigurationMerge
from apps.exams.models.result_configuration import ExamResultConfiguration, ExamResultCumulativeConfiguration, ExamResultSubjectConfiguration
from apps.exams.serializers import (ExamFinalResultConfigurationSerializer, ExamResultCumulativeConfigurationSerializer, ExamResultMarksObtainedSerializer, ExamResultReadConfigurationSerializer, ExamResultSubjectConfigurationSerializer, ResultConfigurationSerializer, ResultSectionApprovalSerializer, ResultSectionMappingSerilaizer,
                                    ResultMarksConfigurationSerializer, ExamScheduleReadSerilaizer,ResultReadConfigurationMergeSerializer,
                                    ResultConfigurationReadSerializer,ResultConfigurationMergeSerializer)
from apps.shared.services import FormdefinitionService, SharedService
from apps.exams.services.exam import get_section_wise_list_for_exam, \
 examsConductedForStandardSection
from apps.exams.services.mark import get_approved_standard_section_list, get_marks_for_config, \
    get_standard_section_subjects, get_student_grade,get_grade_for_marks
from apps.students.models import Student
from apps.shared.models.approval import ApproveStatus
from apps.institutes.serializers import InstituteSerializer
from apps.institutes.models.institute import Institute
from apps.tenants.services.middlewares import get_current_db_name
from apps.bdu.services.write_to_excel import write_to_excel_new_consolidation

def add_result_configuration(self, data):
    result_configuration_data = {'term': data['term'], 'academic_year': data['academic_year']}
    validate_result_data(self, data)
    if 'id' in data:
        result_configuration_data['id'] = data['id']
    existing_approval_data = {r['standard_section_id']: r for r in ResultSectionApproval.objects.filter(
        result_config__academic_year=data['academic_year'], result_config__term=data['term']
    ).values()}
    with transaction.atomic(using=get_current_db_name()):
        self.serializer_class = ResultConfigurationSerializer
        config_data = SharedService.add_or_update_data(self, [result_configuration_data])
        standard_section_ids = [e['standard_section'] for e in data['section_list']]
        delete_config_related_data(self, config_data['data']['id'], standard_section_ids)
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
                    'standard_section': section_data['standard_section'], 'result_config': config_data['data']['id'],
                    'is_announced': False
                }
            add_or_update_result_sec_approval(self, approval_data)
            exam_resultmarkconfig_id_update_mapping = {}
            for subject_data in section_data['subject_list']:
                temp_result_data = {'result': config_data['data']['id'],
                                  'standard_section': section_data['standard_section'],
                                  'subject': subject_data['subject'], 'max_marks': subject_data['max_marks'],
                                  'min_marks': subject_data['min_marks']}
                standard_mapping_serializer = ResultSectionMappingSerilaizer(data=temp_result_data)
                standard_mapping_serializer.is_valid(raise_exception=True)
                standard_mapping_data = standard_mapping_serializer.save()
                marks_data = []
                for mark_data in subject_data['marks_configuration']:
                    marks = mark_data['marks'] if 'marks' in mark_data else 0
                    cum_marks = mark_data['cum_marks'] if 'cum_marks' in mark_data else None
                    is_cum_disabled = mark_data['is_cum_disabled'] if 'is_cum_disabled' in mark_data else None
                    is_disabled = mark_data['is_disabled'] if 'is_disabled' in mark_data else 0
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
                                      'is_cum_disabled': is_cum_disabled,'is_only_grade_for_config':mark_data['is_only_grade_for_config']})
                    merge_data = []
                    for merging_data in section_data['merge_list']:
                        merge_data.append({'name':merging_data['merge_id'],'result':config_data['data']['id'],'standard_section':section_data['standard_section'],'exam':merging_data['exam_list']})
                mark_config = ResultMarksConfigurationSerializer(data=marks_data, many=True)
                mark_config.is_valid(raise_exception=True)
                mark_config.save()
        response=ResultConfigurationMergeSerializer(data=merge_data,many=True)
        response.is_valid(raise_exception=True)
        response.save()
        '''exam_ind = subject_data['exam_merge'].index(mark_data['exam'])
        if exam_ind != 0:
        result_data['resultmarkconfig_id_id'] = exam_resultmarkconfig_id_update_mapping[(standard_mapping_data.id, subject_data['exam_merge'][exam_ind-1])]
        response=ResultMarksConfiguration.objects.create(**result_data)
        exam_resultmarkconfig_id_update_mapping[(standard_mapping_data.id, mark_data['exam'])] = response.id'''
        #mark_config = ResultMarksConfigurationSerializer(data=marks_data, many=True)
        #mark_config.is_valid(raise_exception=True)
        #response=mark_config.save()
        return {'data': 'Data Saved Successfully'}

def add_or_update_result_sec_approval(self, data):
    if 'id' in data and data['id']:
        instance = ResultSectionApproval.objects.get(id=data['id'])
        serializer = ResultSectionApprovalSerializer(instance=instance, data=data)
    else:
        serializer = ResultSectionApprovalSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Data Added Successfully'}

def delete_config_related_data(self, resultId, standardSectionIds):
    standardMappingObj = ResultSectionMapping.objects.filter(result=resultId, standard_section__in=standardSectionIds, is_active=True)
    resultconfigurationIds = ResultMarksConfiguration.objects.filter(
        result_section__in=standardMappingObj.values_list('id', flat=True))
    resultconfigurationIds.delete()
    standardMappingObj.update(is_active=False)


def validate_result_data(self, data):
    config_id = None
    if 'id' in data:
        config_id = data['id']
    validate_result_configuration(self, data['term'], data['academic_year'], config_id)
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
                        raise ValidationError(f'Exam marks is not equal to total marks {stand_sec_obj.standard.name} - {stand_sec_obj.section.name}')
    given_exam_data = Exam.objects.filter(id__in=list(exam_ids)).values('academic_year', 'term', 'exam_type__name')
    approval_data = ResultSectionApproval.objects.filter(result_config__term=data['term'],
        result_config__academic_year=data['academic_year'],
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
        if str(e_data['term']) != str(data['term']):
            raise ValidationError(f'{e_data["exam_type__name"]} is not in the same term')
    validate_standard_examschedule(self, section_subject_exam, data['term'])


def validate_result_configuration(self, term, academicYear, configId=None):
    excludeQuery = {}
    if configId:
        excludeQuery = {'id': configId}
    resultConfigObject = ResultConfiguration.objects.filter(term=term, academic_year=academicYear).exclude(
        **excludeQuery)
    if resultConfigObject.count() > 0:
        raise ValidationError(
            f'Result already configured for {resultConfigObject.values("term__name")[0]["term__name"]}')


def validate_standard_examschedule(self, sectionSubjectExam, term):
    scheduledData = ExamSchedule.objects.filter(exam__term=term).values('exam', 'subject',
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


def announce_result(self, request):
    examId = request.data['exam']
    examObj = Exam.objects.get(id=examId)
    if examObj.to_date >= datetime.now().date():
        raise ValidationError('Exam Todate is not completed yet')
    standardSectionId = request.data['standard_section']
    if not examId or not standardSectionId:
        raise ValidationError('Exam Id and standardSectionId is mandatory')
    if request.data.get('updates'):
        student_mapping_ids = {}
        for announce_row in request.data.get('updates'):
            student_mapping_ids[announce_row['student_id']] = announce_row['is_announced']
        studnetExamResult = StudentExamFinalResult.objects.filter(student__in=student_mapping_ids.keys(), result_config__isnull=True, exam=examId)
        for student_exam_result in studnetExamResult:
            student_exam_result.is_announced = student_mapping_ids[student_exam_result.student_id]
            student_exam_result.save()
    else:
        studentList = get_standard_section_subjects(self, examId, standardSectionId, True)
        studentIds = []
        for studentData in studentList['data']['student_list']:
            studentIds.append(studentData['student'])
        studnetExamResult = StudentExamFinalResult.objects.filter(student__in=studentIds, result_config__isnull=True, exam=examId)
        for studentData in studnetExamResult.values('is_announced', 'student__first_name'):
            if studentData['is_announced']:
                raise ValidationError(f'{studentData["student__first_name"]} is already announced')
        if not studnetExamResult.update(is_announced=True):
            raise ValidationError('Something went wrong')
    return {'Reason': 'Exam Result Announced'}


def announce_result_config(self, request):
    resultConfigId = request.data['result_config']
    standardSectionId = request.data['standard_section']
    if not resultConfigId or not standardSectionId:
        raise ValidationError('Result Config Id and standardSectionId is mandatory')
    request.GET._mutable = True
    request.GET['standard_section'] = standardSectionId
    request.GET['result_config'] = resultConfigId
    configMarks = get_marks_for_config(self, request)
    if configMarks['data']['is_announced']:
        raise ValidationError('Already Announced for the section')
    announceData = []
    for studentData in configMarks['data']['student_list']:
        temp = {'status': studentData['total_result'], 'result_config': resultConfigId, 'is_announced': True,
                'student': studentData['student']}
        if 'final_result_id' in studentData and studentData['final_result_id']:
            temp['id'] = studentData['final_result_id']
        else:
            temp['changed_user'] = request.user.id
        announceData.append(temp)
    if not announceData:
        raise ValidationError('Nothing to announce')
    return SharedService.add_or_update_data(self, announceData)


def convert_standard_to_section(data, academicYear):
    returnData = []
    for scheduleData in data:
        returnData.append(scheduleData)
    return returnData


def announce_result_list(self, request):
    student_result_data = {}
    standard_section_student_mapping = {}
    exam = request.GET.get('exam')
    if not exam:
        raise ValidationError('Exam is mandatory')
    exam_obj = Exam.objects.get(id=exam)
    academic_year = exam_obj.academic_year
    enrollment_filter = {'standard_section__academic_year': academic_year}
    enrollment_filter['standard_section__in'] = exam_obj.standard_section_ids.split(',')
    if self.request.GET.get('standard'):
        enrollment_filter['standard_section__standard'] = self.request.GET.get('standard')
    enrollment_data = dict(
        Enrollment.objects.order_by().filter(**enrollment_filter).values_list('student', 'standard_section'))
    standard_section_ids = enrollment_data.values()
    standard_section_data = StandardSectionMapping.objects.filter(id__in=standard_section_ids).values('id',
                                                                                                  'standard__name',
                                                                                                  'section__name',
                                                                                                  'standard', 'section')
    student_mark_queryset = StudentMark.objects.filter(is_active=True, exam_schedule__exam=exam,
                                                     exam_schedule__standard_section__in=standard_section_ids
                                                     ).values(  'student',
                                                                'student__first_name',
                                                                'student__middle_name',
                                                                'student__last_name',
                                                                'attendance_status',
                                                                'exam_schedule__min_marks',
                                                                'marks'
                                                            )
    standard_section_data = {standardData['id']: standardData for standardData in standard_section_data}
    approvedstandardsection_list = get_approved_standard_section_list(exam_obj.id)
    student_ids = set()
    # #student pass/fail result
    for mark_data in student_mark_queryset:
        student_id = mark_data['student']
        student_standard_section = enrollment_data[student_id]
        student_standard = standard_section_data[student_standard_section]['standard']
        mark_data['marks'] = 0 if mark_data['marks'] is None else mark_data['marks']
        mark_status = 'fail' if (
                    mark_data['attendance_status'] == 'Absent' or not mark_data['exam_schedule__min_marks'] or mark_data['exam_schedule__min_marks'] < mark_data[
                'marks']) else 'pass'
        if mark_data['student'] in student_result_data:
            if mark_status != 'pass':
                student_result_data[mark_data['student']]['status'] = mark_status
        else:
            student_result_data[mark_data['student']] = {'status': mark_status, 'standard': student_standard,
                                                      'standard_section': student_standard_section}
        if student_standard_section not in standard_section_student_mapping:
            standard_section_student_mapping[student_standard_section] = set()
        standard_section_student_mapping[student_standard_section].add(student_id)
        student_ids.add(student_id)
    student_exam_final_list = StudentExamFinalResult.objects.filter(student__in=list(student_ids), exam=exam).values()
    for final_data in student_exam_final_list:
        student_result_data[final_data['student_id']] = final_data
    standard_section_data = get_section_wise_list_for_exam([exam], filter_standard_section_ids=standard_section_ids)
    for standard_data in standard_section_data:
        for section_data in standard_data['section_list']:
            section_data['result_data'] = {}
            section_data['status'] = True
            temp = {'total': 0, 'pass': 0, 'fail': 0, 'is_announced': 0}
            if section_data['standard_section'] not in approvedstandardsection_list:
                section_data['status'] = False
                section_data['reason'] = 'Not finalized'
                continue
            if section_data['standard_section'] in standard_section_student_mapping:
                for student_id in standard_section_student_mapping[section_data['standard_section']]:
                    temp['total'] += 1
                    if student_result_data[student_id]['status'] == 'pass':
                        temp['pass'] += 1
                    else:
                        temp['fail'] += 1
                    temp['is_announced'] = student_result_data[student_id]['is_announced'] if student_id in student_result_data and 'is_announced' in student_result_data[student_id] else None
            section_data['result_data'] = temp
    return {'data': standard_section_data}


def announce_result_list_config(self, request):
    termId = request.GET.get('term', None)
    academicYearId = request.GET.get('academic_year', None)
    if not termId or not academicYearId:
        raise ValidationError('Term or Academic is mandatory')
    examData = Exam.objects.filter(is_active=True, term=termId, academic_year=academicYearId).values()
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
    announced_data = list(StudentExamFinalResult.objects.filter(
        result_config__academic_year=academicYearId,
        result_config__term=termId,
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


def get_configuration_data(self, request, termId, academicId):
    standard_section_heirarchy = get_section_wise_list_for_exam(None, {'term': termId, 'academic_year': academicId})
    standard_section_ids = []
    standard_section_mapping = {}
    subject_wise_config_data = {}  # here maps standard_section -> subject -> config data
    exam_data = Exam.objects.filter(term=termId, academic_year=academicId).values('id', 'exam_type__name', 'description')
    exam_data = {str(examObj['id']): examObj for examObj in exam_data}
    if not exam_data:
        raise ValidationError('No Exams Exist')
    for standard_data in standard_section_heirarchy:
        for section_data in standard_data['section_list']:
            standard_section_ids.append(section_data['standard_section'])
    result_section_approval = {r['standard_section'] : r for r in ResultSectionApproval.objects.filter(
        standard_section__in=standard_section_ids, result_config__term=termId, result_config__academic_year=academicId
    ).values('approval_status', 'is_announced', 'standard_section')}
    values = [
        'standard_section', 'subject', 'subject__name', 'standard_section__standard',
         'subject__sequence', 'subject__subject_part_type__name', 'subject__subject_part_type'
    ]
    schedule_data = ExamSchedule.objects.filter(standard_section__in=standard_section_ids,exam__term=termId, exam__academic_year=academicId).values(*values)
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

    result_configuration = ResultMarksConfiguration.objects.filter(result_section__result__academic_year=academicId,
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



def get_section_configuration_data(self, data):
    standard_section_id = self.request.GET.get('standard_section')
    term_id = self.request.GET.get('term')
    academic_year_id = self.request.GET.get('academic_year')
    result_data = get_result_configuration_mapping(None, term_id, academic_year_id, standard_section_id)
    return {
        'data': {
            'available_exam_list': examsConductedForStandardSection(term_id, academic_year_id, standard_section_id),
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


def get_result_configuration_mapping(result_config_id, term_id, academic_year_id, standard_section_id,
                                     return_serializer_data=False, show_final_result_data=False):
    if result_config_id:
        filter_query = {'id': result_config_id}
    else:
        filter_query = {'term': term_id, 'academic_year': academic_year_id}
    result_config = ResultConfiguration.objects.filter(**filter_query).first()
    approval_status = False
    try:
        approval_status =  ResultSectionApproval.objects.get(result_config=result_config.id, standard_section=standard_section_id).approval_status
    except:
        pass
    if not result_config_id and result_config:
        result_config_id = result_config.id
    exam_schedule_qs = ExamSchedule.objects.filter(exam__term=term_id, exam__academic_year=academic_year_id)
    exam_schedule_data =ExamScheduleReadSerilaizer(exam_schedule_qs, many=True).data
    schedule_data_for_section = []
    result_data = ResultConfigurationReadSerializer(result_config, context={'filtered_list': [
        {'name': 'standard_section', 'value': standard_section_id},
        {'name': 'is_active', 'value': True}
    ]})
    result_config_qs = ExamResultConfiguration.objects.filter(
        exam__term=term_id, exam__academic_year=academic_year_id
    )
    result_config_data = ExamResultReadConfigurationSerializer(result_config_qs, many=True).data
    merge_config_qs = ResultConfigurationMerge.objects.filter(result=result_config_id,standard_section=standard_section_id)
    merge_config_data = ResultReadConfigurationMergeSerializer(merge_config_qs,many=True).data
    merge_data_list=[]
    for merge_data in merge_config_data:
        merge_data_list.append({'merge_name':merge_data['merge_name'],'merge':merge_data['name'],'exam_list':merge_data['exam']})
    exam_subject_result_mapping_config = {}
    grade_plan_id = None
    grade_plan_name = None
    total_grade_plan_id = None
    total_grade_plan_name = None
    try:
        result_section_approval = ResultSectionApproval.objects.get(
            result_config=result_config_id, standard_section=standard_section_id
        )
        grade_plan_id = result_section_approval.grade_plan.id
        grade_plan_name = result_section_approval.grade_plan.name
        total_grade_plan_id = result_section_approval.total_grade_plan.id
        total_grade_plan_name = result_section_approval.total_grade_plan.name
    except:
        pass
    for exam_row in result_config_data:
        if exam_row['exam'] not in exam_subject_result_mapping_config:
            exam_subject_result_mapping_config[exam_row['exam']] = {}
        for result_config in exam_row['exam_result_subject_config']:
            if result_config['subject'] not in exam_subject_result_mapping_config[exam_row['exam']]:
                exam_subject_result_mapping_config[exam_row['exam']][result_config['subject']] = {'exam_test_list': {}}
            temp = {
                    'configured_marks': result_config['configured_marks'], 
                    'configured_min_marks': result_config['configured_min_marks'],
                    'configured_cumulative_max_marks': 0,
                    'configured_total_max_marks': result_config['configured_marks'],
            }
            if 'cumulative_data' in exam_row:
                for cum_row in exam_row['cumulative_data']:
                    temp['cumulative_max_marks'] += cum_row['configured_marks']
                    temp['configured_total_max_marks'] += cum_row['configured_marks']
            exam_subject_result_mapping_config[exam_row['exam']][result_config['subject']] = temp
    serialize_data = result_data.data
    for index, subject_data in enumerate(serialize_data['result_section_data']):
        serialize_data['result_section_data'][index]['exam_test_result'] = {}
        for index1, result_data in enumerate(subject_data['subject_exam_data']):
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
            'cum_max_marks': 0, 'cum_min_marks': 0, 'is_marks' : exam_schedule['is_marks'], 
        }
        if not exam_schedule['is_marks']:
            temp_exam_schedule['grade_plan']=exam_schedule['grade_plan']
            temp_exam_schedule['grade_plan_name']=exam_schedule['grade_plan_name']
        subject_data = {'subject': exam_schedule['subject'], 'subject_name': exam_schedule['subject_name'],
                       'is_configured': False, 'subject_part_type': exam_schedule['subject_part_type'],
                       'subject_part_type_id': exam_schedule['subject_part_type_id']}
        proceed = False  # track schedule exist for section
        if 'cumulative_mapping' in exam_schedule:
            for cum_row in exam_schedule['cumulative_mapping']:
                temp_exam_schedule['cum_max_marks'] += cum_row['max_marks'] if cum_row['max_marks'] else 0
                temp_exam_schedule['cum_min_marks'] += cum_row['min_marks'] if cum_row['min_marks'] else 0
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


def add_or_update_exam_status(self, request):
    saveData = validate_final_result(self, request.data)
    self._ignorevalidation = True
    return SharedService.add_or_update_data(self, saveData)


# validation for announcement and also for updating the final result
"""
    Supports Validating result config data
    Supports Validating individual exam
"""


def validate_final_result(self, data):
    isExam = False
    isResultConfig = False
    if 'exam' in data and data['exam']:
        isExam = True
        examData = Exam.objects.filter(is_active=True, id=data['exam']).first()
        notExistEr = 'Exam Id is inactive/not exist'
        finalResultQuery = {'exam': data['exam']}
    elif 'result_config' in data and data['result_config']:
        isResultConfig = True
        examData = ResultConfiguration.objects.filter(id=data['result_config']).first()
        notExistEr = 'ExamConfiguration Id is inactive/not exist'
        finalResultQuery = {'result_config': data['result_config']}
    else:
        raise ValidationError('Invalid params')
    studentIds = []
    existingStudentIds = []
    studentStatusMapping = {}
    errorStudentIds = []
    errorMessage = 'Something went wrong'
    if not examData:
        raise ValidationError(notExistEr)
    for statusData in data['status_list']:
        studentIds.append(statusData['student'])
        studentStatusMapping[statusData['student']] = statusData
    finalResultQuery['student__in'] = studentIds
    examfinalResultData = StudentExamFinalResult.objects.filter(**finalResultQuery).values()
    saveData = []
    for finalData in examfinalResultData:
        finalData['changed_user'] = self.request.user.id
        if finalData['is_announced']:
            errorMessage = 'Students are already announced'
            errorStudentIds.append(finalData['student_id'])
        finalData['status'] = studentStatusMapping[finalData['student_id']]['status']
        existingStudentIds.append(finalData['student_id'])
        del studentStatusMapping[
            finalData['student_id']]  # deleting because we use to add the remaining when it is config
        saveData.append(finalData)
    if isExam and set(studentIds) - set(existingStudentIds):
        errorStudentIds = []
        errorMessage = 'This students marks are not yet Finalized'
        errorStudentIds += (list(set(studentIds) - set(existingStudentIds)))
    if isResultConfig:
        for studentId in studentStatusMapping:
            studentData = studentStatusMapping[studentId]
            temp = {'student': studentData['student'], 'status': studentData['status'],
                    'result_config': data['result_config']}
            saveData.append(temp)
    if errorStudentIds:
        studentData = Student.objects.filter(id__in=errorStudentIds).values('first_name', 'middle_name', 'last_name')
        studentNames = []
        for sData in studentData:
            sData['middle_name'] = '' if not sData['middle_name'] else sData['middle_name']
            studentNames.append(sData['first_name'] + ' ' + sData['middle_name'] + ' ' + sData['last_name'])
        raise ValidationError(f'{studentNames} {errorMessage}')
    return saveData


def add_or_update_exam_result_configuration(self, data):
    for row_data in data['result_config_list']:
        validate_exam_result_subject_config(self, row_data)
    with transaction.atomic(using=get_current_db_name()):
        for row_data in data['result_config_list']:
            if 'deletable_exam_result_configuration_id' in row_data and row_data['deletable_exam_result_configuration_id']:
                ExamResultConfiguration.objects.filter(id=row_data['deletable_exam_result_configuration_id']).delete()
            if 'deletable_exam_result_subject_config_ids' in row_data and row_data['deletable_exam_result_subject_config_ids']:
                ExamResultSubjectConfiguration.objects.filter(id__in=row_data['deletable_exam_result_subject_config_ids']).delete()
            response = add_or_update_exam_result_configuration_parent(self, row_data['exam_result_configuration'])
            add_or_updated_exam_subject_config(self, row_data['exam_result_subject_config'], response['data']['id'])
    return {'Reason': 'Data Added/Updated Successfully'}

def add_or_update_exam_result_configuration_parent(self, data):
    return SharedService.add_or_update_data(self, [data])

def add_or_updated_exam_subject_config(self, data, result_config_id):
    for row_data in data:
        row_data['exam_result_configuration'] = result_config_id
        if 'id' in row_data:
            instance = ExamResultSubjectConfiguration.objects.get(id=row_data['id'])
            serializer = ExamResultSubjectConfigurationSerializer(instance=instance, data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            serializer = ExamResultSubjectConfigurationSerializer(data=row_data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        subject_save_id = serializer.data['id']
        if 'cumulative_data' in row_data and row_data['cumulative_data']:
            for cum_data in row_data['cumulative_data']:
                cum_data['exam_result_subject_config'] = subject_save_id
                if 'id' in cum_data:
                    instance = ExamResultCumulativeConfiguration.objects.get(id=cum_data['id'])
                    serializer_1 = ExamResultCumulativeConfigurationSerializer(instance=instance, data=cum_data)
                    serializer_1.is_valid(raise_exception=True)
                    serializer_1.save()
                else:
                    serializer_1 = ExamResultCumulativeConfigurationSerializer(data=cum_data)
                    serializer_1.is_valid(raise_exception=True)
                    serializer_1.save()
 

def validate_exam_result_subject_config(self, data):
    check_duplicate_subject = {}
    standard_section = data['exam_result_configuration']['standard_section']
    exam_id = data['exam_result_configuration']['exam']
    configured_stand_sec_ids = Exam.objects.get(id=exam_id).standard_section_ids.split(',')
    if str(standard_section) not in configured_stand_sec_ids:
        raise ValidationError('standard section ids are not configured in the given exam')
    if FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'grade_plan'):
        if 'grade_plan' not in data['exam_result_configuration'] or not data['exam_result_configuration']['grade_plan']:
            raise ValidationError('grade_plan is mandatory')
    # if 'is_fail_if_not_min' in data['exam_result_configuration'] and data['exam_result_configuration']['is_fail_if_not_min'] and not data['exam_result_configuration']['min_marks']:
    #     raise ValidationError('min_marks is mandatory')
    if 'id' in data['exam_result_configuration'] and data['exam_result_configuration']['id']:
        approval_status= ExamResultConfiguration.objects.get(id=data['exam_result_configuration']['id']).approval_status
        if approval_status not in ['0', '3']:
            raise ValidationError('You cant modify the configuration as it is approved')
    
    for row_data in data['exam_result_subject_config']:
        is_disabled = False
        if 'is_disabled' in row_data and row_data['is_disabled']:
            is_disabled = True
        if row_data['subject'] in check_duplicate_subject:
            raise ValidationError('Duplicate subject Found')
        if not is_disabled and 'configured_marks' not in row_data or not row_data['configured_marks']:
            raise  ValidationError('Configured Marks is mandatory')
        if not is_disabled and  'configured_min_marks' not in row_data or not row_data['configured_min_marks']:
            raise  ValidationError('configured_min_marks is mandatory')
        if not is_disabled and  row_data['configured_min_marks'] > row_data['configured_marks']:
            raise ValidationError('configured_min_marks should be less than configured_marks')
        check_duplicate_subject[row_data['subject']] = {}
        duplicate_cum_check = {}
        if 'cumulative_data' in row_data:
            for cum_row in row_data['cumulative_data']:
                if not is_disabled and 'configured_marks' not in cum_row or not row_data['configured_marks']:
                    raise ValidationError('confiugred_marks is mandatory')
                if cum_row['schedule_cumulative'] in duplicate_cum_check:
                    raise ValidationError('Duplicate cummulative')
                duplicate_cum_check[cum_row['schedule_cumulative']] = ''
    
def compare_schedule_and_result_config(row_data):
    #do the validation later
    schedule_subject_cum_mapping = {}
    for schedule in row_data['schedule_data']:
        schedule_subject_cum_mapping[schedule['subject']] = {}
        for cum_config in schedule['cumulative_mapping']:
            schedule_subject_cum_mapping[schedule['subject']][cum_config['id']] = cum_config
    for schedule_row in row_data['exam_result_subject_config']:
        pass
        

def approve_exam_result_configuration(self, data):
    result_configuration_ids = data['result_configuration_ids']
    queryset = ExamResultConfiguration.objects.filter(id__in=result_configuration_ids)
    serializer = ExamResultReadConfigurationSerializer(queryset, many=True)
    exam_ids = []
    for row_data in serializer.data:
        exam_schedule = ExamSchedule.objects.filter(exam=row_data['exam'], standard_section=row_data['standard_section'])
        exam_ids.append(row_data['exam'])
        row_data['schedule_data'] = ExamScheduleReadSerilaizer(exam_schedule, many=True).data
        # compare_schedule_and_result_config(row_data)
    content_type_obj_id = ContentType.objects.get(model='Exam').id
    approve_status_data = {ap['object_id']:'' for ap in ApproveStatus.objects.filter(object_id__in=exam_ids, content_type_id=content_type_obj_id, approval_status='1').values()}
    unapproved_exam_ids = []
    for exam in exam_ids:
        if exam not in approve_status_data:
            unapproved_exam_ids.append(exam)
    if unapproved_exam_ids:
        exam_data = list(Exam.objects.filter(id__in=unapproved_exam_ids).values_list('exam_type__name', flat=True))
        raise ValidationError(f'{"".join(str(x) for x in exam_data)} is not yet approved. Please approve exam for the standard section')
    if not queryset:
        raise ValidationError('No data to approve')
    queryset.update(approval_status='1')
    return {'Reason': 'Data Saved Successfully'}

"""
    returns examresult_config -> standard_section_id
    remove_unrelated_fiels -> this is used to store the marks json in the table, so removing few configuration fiels
"""
def get_exam_result_config(self, exam_result_configuration_ids, remove_unrelated_fiels=False, student_ids=[], raise_error_on_unapproval=True):
    exam_result_config_obj = ExamResultConfiguration.objects.filter(id__in=exam_result_configuration_ids)
    exam_result_serializer = ExamResultReadConfigurationSerializer(exam_result_config_obj, many=True).data
    result_config_exam_student_standard_sec_mapping = {}
    existing_result_config_ids = []
    for exam_result in exam_result_serializer:
        for result_subject in exam_result['exam_result_subject_config']:
            temp_cumulative_data = {}
            total_cumulative_configured_marks = 0
            for cum in result_subject['cumulative_data']:
                total_cumulative_configured_marks += cum['configured_marks']
                temp_cumulative_data[cum['schedule_cumulative']] = cum
            result_subject['cumulative_data'] = temp_cumulative_data
            result_subject['total_cumulative_configured_marks'] = total_cumulative_configured_marks
        existing_result_config_ids.append(exam_result['id'])
        if exam_result['approval_status'] != '1' and raise_error_on_unapproval:
            temp = StandardSectionMapping.objects.get(id=exam_result['standard_section'])
            raise ValidationError(f'Exam Result Config is not approved for {temp.standard.name} - {temp.section.name}')
        if exam_result['id'] not in result_config_exam_student_standard_sec_mapping:
            result_config_exam_student_standard_sec_mapping[exam_result['id']] = {
                exam_result['standard_section']: {'student_list': [], 'subject_list': []}
            }
        student_list = get_standard_section_subjects(self, exam_result['exam'], exam_result['standard_section'], False, student_ids)
        temp_subject_configurations = {t['subject']: t for t in exam_result['exam_result_subject_config']}
        updated_student_list = []
        temp_standard_subject_list = {}
        for student in student_list['data']['student_list']:
            temp_subject_list = {}
            #deleting because we are going to assign configured marks
            if 'obtained_marks' in student:
                del student['obtained_marks']
            if 'total_marks' in student:
                del student['total_marks']
            student['total_configured_marks'] = 0
            student['total_obtained_marks'] = 0
            student['total_original_max_marks']=0
            student['total_original_marks']=0
            student['total_result'] = 'pass'
            try:
                grade_list = Grade.objects.filter(grade_plan=exam_result['grade_plan']).values()
                grade_plan_obj = GradePlan.objects.get(id=exam_result['grade_plan'])
            except:
                raise ValidationError('Grade plan is not mapped')
            try:
                total_grade_list = Grade.objects.filter(grade_plan=exam_result['total_grade_plan']).values()
                total_grade_plan_obj = GradePlan.objects.get(id=exam_result['total_grade_plan'])
            except:
                raise ValidationError('Total Grade plan is not mapped')
            if exam_result['remarks']:
                remark_grade_list = Grade.objects.filter(grade_plan=exam_result['remarks']).values()
                remark_grade_plan_obj = GradePlan.objects.get(id=exam_result['remarks'])
            else:
                remark_grade_list =None
                remark_grade_plan_obj =None
            subject_name_list=[]
            obtained_original_marks_list=[]
            for subject in student['subject_list']:
                subject_data = student['subject_list'][subject]
                subject_name_list.append(subject_data['subject_name'])
                if 'marks' not in subject_data:
                    subject_data['marks']=0
                    subject_data['max_marks']=0
                    subject_data['grade']=0
                obtained_original_marks_list.append(subject_data['marks'])
                if subject in temp_subject_configurations:
                    obtained_marks = 0
                    if 'attendance_status' in subject_data and subject_data['attendance_status'] != 'Absent' and subject_data['is_marks']:
                        obtained_marks = ((subject_data['marks'] * temp_subject_configurations[subject]['configured_marks']) / subject_data['max_marks'])
                    student_data_temp = {
                        'subject': subject_data['subject'],
                        'subject_marks':subject_data['marks'],
                        'subject_max_marks':subject_data['max_marks'] if subject_data['max_marks'] else 0,
                        'subject_grade':subject_data['grade'],
                        'subject_remarks':'',
                        'subject__subject_code':subject_data['subject__subject_code'],
                        'subject_name': subject_data['subject_name'], 'obtained_marks': obtained_marks,'grade':'','percentage':0,
                        'configured_marks': temp_subject_configurations[subject]['configured_marks'], 'total_cumulative_obtained_marks': 0,
                        'total_cumulative_configured_marks': temp_subject_configurations[subject]['total_cumulative_configured_marks'], 
                        'cumulative_marks_data': {}, 'total_obtained_marks': obtained_marks,
                        'total_configured_marks': temp_subject_configurations[subject]['configured_marks'] if temp_subject_configurations[subject]['configured_marks'] else 0,
                        'configured_min_marks': temp_subject_configurations[subject]['configured_min_marks'],
                        'total_configured_min_marks': temp_subject_configurations[subject]['configured_min_marks'] if temp_subject_configurations[subject]['configured_min_marks'] else 0,
                        'attendance_status': subject_data['attendance_status'] if 'attendance_status' in subject_data else None,
                        'subject_part_type': subject_data['subject_part_type'], 'subject_part_type_id': subject_data['subject_part_type_id']
                    }
                    if not remove_unrelated_fiels and 'cumulative_data' in subject_data:
                        student_data_temp['cumulative_data'] = subject_data['cumulative_data']
                        for ix, cum in enumerate(student_data_temp['cumulative_data']):
                            student_data_temp['cumulative_data'][ix]['configured_marks'] = 0
                            if subject in temp_subject_configurations:
                                student_data_temp['cumulative_data'][ix]['configured_marks'] = temp_subject_configurations[subject]['cumulative_data'][cum['id']]['configured_marks']
                    if 'cumulative_marks_data' in subject_data:
                        subject_data['cumulative_marks_data'] = {cum['exam_cumulative_id']:cum for cum in subject_data['cumulative_marks_data']}
                        for cumulative_id in temp_subject_configurations[subject]['cumulative_data']:
                            cumulative_data = temp_subject_configurations[subject]['cumulative_data'][cumulative_id]
                            if cumulative_data['schedule_cumulative'] in subject_data['cumulative_marks_data']:
                                exam_cumulative_id = cumulative_data['schedule_cumulative']
                                cum_obtained_marks = ((subject_data['cumulative_marks_data'][exam_cumulative_id]['marks'] * \
                                cumulative_data['configured_marks']) / \
                                subject_data['cumulative_marks_data'][exam_cumulative_id]['exam_cumulative__max_marks'])
                                student_data_temp['cumulative_marks_data'][exam_cumulative_id] = {
                                    'configured_marks': cumulative_data['configured_marks'],
                                    'obtained_marks': cum_obtained_marks,
                                    'exam_cumulative_id': exam_cumulative_id,
                                    'student_cumulative_mark_id': cumulative_data['id']
                                }
                                student_data_temp['total_cumulative_obtained_marks'] += cum_obtained_marks
                                student_data_temp['total_obtained_marks'] += cum_obtained_marks
                    student_data_temp['total_configured_marks'] += student_data_temp['total_cumulative_configured_marks']
                    student_data_temp['grade'],student_data_temp['percentage']=get_grade_for_marks(grade_list,student_data_temp['total_obtained_marks'],student_data_temp['total_configured_marks'],grade_plan_obj)
                    student_data_temp['cumulative_marks_data'] = student_data_temp['cumulative_marks_data'].values()
                    if remark_grade_list and remark_grade_plan_obj:
                        student_data_temp['subject_remarks'],per=get_grade_for_marks(remark_grade_list,student_data_temp['subject_marks'],student_data_temp['subject_max_marks'],remark_grade_plan_obj)
                    student['total_configured_marks'] += student_data_temp['total_configured_marks']
                    student['total_obtained_marks'] += student_data_temp['total_obtained_marks']
                    student['total_original_max_marks']+=student_data_temp['subject_max_marks']
                    student['total_original_marks']+=student_data_temp['subject_marks'] if student_data_temp['subject_marks'] else 0
                    student['total_obtained_grade'],student['total_obtained_percentage']=get_grade_for_marks(total_grade_list,student['total_obtained_marks'],student['total_configured_marks'],total_grade_plan_obj)
                    student['total_obtained_marks_config']=((student['total_obtained_marks']*10)/student['total_configured_marks'])
                    if FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'is_marks_round_off'):
                        student_data_temp['total_obtained_marks']=round(student_data_temp['total_obtained_marks'])
                        student_data_temp['grade'],student_data_temp['percentage']=get_grade_for_marks(grade_list,student_data_temp['total_obtained_marks'],student_data_temp['total_configured_marks'],grade_plan_obj)
                        student['total_obtained_marks_config']=round(student['total_obtained_marks_config'])
                        student['total_obtained_grade_config'],student['total_obtained_percentage']=get_grade_for_marks(total_grade_list,student['total_obtained_marks_config'],student['total_configured_marks'],total_grade_plan_obj)
                        if remark_grade_list and remark_grade_plan_obj:
                            student['total_obtained_remarks'],per=get_grade_for_marks(remark_grade_list,student['total_obtained_marks_config'],student['total_configured_marks'],remark_grade_plan_obj)
                    temp_subject_list[subject] = student_data_temp
                    temp_standard_subject_list[subject] = {
                        "subject": student_data_temp['subject'],
                        "subject_name": student_data_temp['subject_name'],
                        "subject_part_type": student_data_temp['subject_part_type'],
                        "subject_part_type_id": student_data_temp['subject_part_type_id'],
                        "configured_marks": student_data_temp['configured_marks'],
                        "configured_min_marks": student_data_temp['configured_min_marks'],
                        "total_configured_marks": student_data_temp['total_configured_marks'],
                        "total_configured_min_marks": student_data_temp['total_configured_min_marks'],
                        "cumulative_data": student_data_temp['cumulative_data'] if 'cumulative_data' in student_data_temp else None
                    }
                    if student_data_temp['total_obtained_marks'] < temp_standard_subject_list[subject]['total_configured_min_marks']:
                        student['total_result'] = 'fail'
                    #grade_data = get_student_grade([student_data_temp],exam_result['id'], exam_result['standard_section'], 'total_obtained_marks', 'total_configured_marks')
            student['subject_list'] = temp_subject_list
            temp = sorted(temp_subject_list.values(), key=lambda v: (isinstance(v.get('subject__subject_code', "NA"), str), v.get('subject__subject_code', "NA"))) #used for printing marks card
            student['subject_list']={t['subject'] : t for t in temp}
            student['subject_name_list'] = subject_name_list
            student['obtained_original_marks_list'] = obtained_original_marks_list
            student['subject_list_list_type'] = student['subject_list'].values()
            #grade_data = get_student_grade([student],exam_result['id'], exam_result['standard_section'], 'total_obtained_marks', 'total_configured_marks', True)
            #student['grade'] = grade_data['grade_data']
            updated_student_list.append(student)
        result_config_exam_student_standard_sec_mapping[exam_result['id']][exam_result['standard_section']]['subject_list'] = temp_standard_subject_list.values()
        result_config_exam_student_standard_sec_mapping[exam_result['id']][exam_result['standard_section']]['student_list'] = updated_student_list
    if set(existing_result_config_ids) != set(exam_result_configuration_ids):
        raise ValidationError('Invalid result configuration ids')
    return result_config_exam_student_standard_sec_mapping

def get_announce_exam_result_config(self, exam_config_id, student_ids=[]):
    response = get_exam_result_config(self, [exam_config_id], False, student_ids)
    exam_result_config = ExamResultConfiguration.objects.get(id=exam_config_id)
    return {
        'data': {
            'standard': exam_result_config.standard_section.standard.id,
            'standard_name': exam_result_config.standard_section.standard.name,
            'section_name': exam_result_config.standard_section.section.name,
            'standard_section': exam_result_config.standard_section_id, 'is_announced': exam_result_config.is_announced,
            'approval_status': exam_result_config.approval_status,
            'academic_year':exam_result_config.standard_section.academic_year.id,
            'academic_year_details':{
                'start_date': exam_result_config.standard_section.academic_year.start_date,
                'end_date': exam_result_config.standard_section.academic_year.end_date,
                'id': exam_result_config.standard_section.academic_year.id
            },
            'term_details': exam_result_config.exam.term.name,
            'exam_details': exam_result_config.exam.exam_type.name,
            'exam_id': exam_result_config.exam.id,
            'exam_from_date': exam_result_config.exam.from_date,
            'exam_to_date': exam_result_config.exam.to_date,
            'student_list': response[exam_config_id][exam_result_config.standard_section_id]['student_list'],
            'subject_list': response[exam_config_id][exam_result_config.standard_section_id]['subject_list'],
            'exam_result_config_id': exam_result_config.id,
            'part_type_list': SubjectPartType.objects.all().values()
        }
    }

def json_for_exam_config_consolidated_marks(data,is_cum_type,cum_marks):
    inst_obj = Institute.objects.all().first()
    column_data=[
        {
            'column': 'SI', 'required': False, 'schemacolumn': 'sl_no'
        }]
    column_data.append(
        {
            'column': 'STUDENT NAME', 'required': False, 'schemacolumn': 'student_name'
        })
    for subjects in data['data']['subject_list']:
        subject=subjects['subject']
        key_marks = 'subject_'+str(subjects['subject'])+'_obtained_marks'
        key_grade = 'subject_'+str(subjects['subject'])+'_obtained_grade'
        key_config = 'subject_'+str(subjects['subject'])+'_config_marks'
        column_data.append(
        {
                'column':'CONF', 'required' : False, 'schemacolumn' : key_config,
                'parent':{'schemacolumn':key_config, 'column': subjects['subject_name'], 'number_of_cells': 3}
        }
        )
        column_data.append(
            {
            'column':'TOT', 'required' : False, 'schemacolumn' : key_marks,
            'parent':{'schemacolumn':f'parent_{subject}', 'column': subjects['subject_name'], 'number_of_cells': 0}
            }
            )
        column_data.append(
            {
            'column':'GRD', 'required' : False, 'schemacolumn' : key_grade,
            'parent':{'schemacolumn':f'parent_{subject}', 'column': subjects['subject_name'] , 'number_of_cells': 0}
            }
            )
    column_data.append(
        {
            'column':'TOT', 'required':False,'schemacolumn':'total_original_marks'
        })
    column_data.append({
            'column':'TOT CONF' , 'required':False, 'schemacolumn' : 'total_obtained_percentage'
        }
    )
    column_data.append({
            'column':'GRD' , 'required':False, 'schemacolumn' : 'total_obtained_grade'
        }
    )
    return column_data

def get_exam_config_consolidated_report(self,exam_result_config,student_id):
    data = get_announce_exam_result_config(self,exam_result_config,student_id)
    data['institute_data'] = InstituteSerializer(Institute.get_institute(self)).data
    consolidated_data=[]
    dyanmic_labels = {}
    is_cum_type=0
    cum_marks=None
    for students in data['data']['student_list']:
        student_name = students['student_name']
        student_row_data = {'student_name': student_name}
        for subjects in students['subject_list_list_type']:
            subject = subjects['subject']
            subject_marks_obtained = 'subject_'+str(subject)+'_obtained_marks'
            subject_grade_obtained='subject_'+str(subject)+'_obtained_grade'
            subject_config_marks_obtained='subject_'+str(subject)+'_config_marks'
            student_row_data[subject_marks_obtained] = subjects['subject_marks']
            student_row_data[subject_config_marks_obtained] = subjects['total_obtained_marks']
            student_row_data[subject_grade_obtained] = subjects['grade'] if 'grade' in subjects else ''
        student_row_data['total_obtained_marks'] = students['total_obtained_marks']
        student_row_data['total_obtained_grade'] = students['grade'] 
        student_row_data['total_original_marks'] = students['total_original_marks']
        consolidated_data.append(student_row_data)
    multiple_data = []
    options={}
    options['title'] = 'Consolidated_marks'
    options['description'] = 'marks'
    options['examname']= data['data']['exam_details']
    options['standardname']=data['data']['standard_name']
    options['sectionname']=data['data']['section_name']
    options['institute_name']=''
    options['extraWorksheet'] = False
    options['Data'] = consolidated_data
    options['extraWorksheetData'] = dict()
    options['columns'] = json_for_exam_config_consolidated_marks(data,is_cum_type,cum_marks)
    return write_to_excel_new_consolidation(self, options, {},{})

def get_exam_configured_result(self, request):
    exam = request.GET.get('exam')
    standard = request.GET.get('standard')
    filter_standard_section_ids = request.GET.get('standard_section_ids', None)
    if not request.GET.get('exam'):
        raise ValidationError('Exam is mandatory')
    section_ids=[]
    if standard:
        exam_obj = Exam.objects.get(
            id=exam
        )
        temp_standard_sect_ids = exam_obj.standard_section_ids.split(',')
        section_list_ids = StandardSectionMapping.objects.filter(standard=standard).values('id')
        filter_standard_section_ids = StandardSectionMapping.objects.filter(standard=standard, id__in=temp_standard_sect_ids).values_list()
        section_ids=[i['id'] for i in section_list_ids]
    exam_result_configuration_data = {}
    section_wise_mark_approval_data = {}
    student_mark_section_wise_approval = StudentMarkSectionWiseApproval.objects.filter(exam=exam, approval_status=1).values()
    if not student_mark_section_wise_approval:
        raise ValidationError('Exam marks is not approved yet')
    for smsw in student_mark_section_wise_approval:
        section_wise_mark_approval_data[smsw['standard_section_id']] = smsw
    for e in ExamResultConfiguration.objects.filter(exam=exam,standard_section__in=section_ids).values():
        if e['approval_status'] != '1':
            raise ValidationError('Exam Configuration is not approved. Please approve exam configuration')
        exam_result_configuration_data[e['id']] = e
    result_config_exam_student_standard_sec_mapping = get_exam_result_config(self, list(exam_result_configuration_data.keys()), True)
    standard_section_student_mapping = {}
    for result_config_id, result_config in result_config_exam_student_standard_sec_mapping.items():
        for standard_section_id, standard_section_data in result_config.items():
            standard_section_student_mapping[standard_section_id] = {'exam_result_config_id': result_config_id, 'student_data': standard_section_data}
    standard_section_data = get_section_wise_list_for_exam([exam], filter_standard_section_ids=section_ids)
    for standard in standard_section_data:
        for standard_section in standard['section_list']:
            temp = {
                "approval_error": "", "is_announced": False, "approval_status" : '0','exam_result_config_id': None, "result_data": {
                    "fail": 0, "pass": 0, "total": 0
                },
            }
            if standard_section['standard_section'] in standard_section_student_mapping and standard_section_student_mapping[standard_section['standard_section']]:
                mark_approval_data = {
                    'approval_status': False, 'is_announced': False
                }
                if temp['exam_result_config_id'] in section_wise_mark_approval_data:
                    mark_approval_data = section_wise_mark_approval_data[temp['exam_result_config_id']]
                temp['exam_result_config_id'] = standard_section_student_mapping[standard_section['standard_section']]['exam_result_config_id']
                if temp['exam_result_config_id'] in exam_result_configuration_data:
                    temp['approval_status'] =  exam_result_configuration_data[temp['exam_result_config_id']]['approval_status']
                    temp['is_announced'] =  exam_result_configuration_data[temp['exam_result_config_id']]['is_announced']
                for student in standard_section_student_mapping[standard_section['standard_section']]['student_data']['student_list']:
                    temp['result_data']['total'] += 1
                    if student['total_result'] == 'pass':
                        temp['result_data']['pass'] += 1
                    elif student['total_result'] == 'fail':
                        temp['result_data']['fail'] += 1
            standard_section.update(temp)
    return {'data': standard_section_data}

def announce_exam_result(self, data):
    exam_result_configuration_ids = data['exam_result_configuration_ids']
    announce_without_notification = data['announce_without_notification'] if 'announce_without_notification' in data else False
    result_config_exam_student_standard_sec_mapping = get_exam_result_config(self, exam_result_configuration_ids)
    final_result_mark_datas = []
    output_summary = {
        'no_of_students': 0,
        'no_of_sections': 0
    }
    for result_config_id, result_config_data in result_config_exam_student_standard_sec_mapping.items():
        output_summary['no_of_sections'] += 1
        for standard_section, standard_section_data in result_config_data.items():
            for student_data in standard_section_data['student_list']:
                output_summary['no_of_students'] += 1
                temp = {
                        'total_obtained_marks': student_data['total_obtained_marks'],
                        'total_configured_marks': student_data['total_configured_marks'],
                        'exam_result_configuration': result_config_id,
                        'grade_plan': student_data['grade_plan'],
                        'student': student_data['student'],
                        'standard_section': standard_section
                }
                final_result_mark_datas.append(temp)
    if not final_result_mark_datas:
        raise ValidationError('No data to Announce result')
    response = SharedService.add_data(self, final_result_mark_datas)
    ExamResultConfiguration.objects.filter(id__in=exam_result_configuration_ids).update(is_announced=True)
    return response

def read_exam_result_config(self, request):
    exam = self.request.GET.get('exam')
    standard_section = self.request.GET.get('standard_section')
    exam_schedule_ids = []
    if not exam or not standard_section:
        raise ValidationError('standard_section and exam are mandatory')
    result_temp = {}
    cum_schedule_mapping_data = {}
    if not exam or not standard_section:
        raise ValidationError('standard_section and exam are mandatory')
    try:
        instance = ExamResultConfiguration.objects.get(exam=exam, standard_section=standard_section)
        configuration_data = ExamResultReadConfigurationSerializer(instance).data
        for row_data in configuration_data['exam_result_subject_config']:
            temp = {}
            for cum_data in row_data['cumulative_data']:
                temp[cum_data['id']] = cum_data
            row_data['cumulative_data'] = temp
            result_temp[row_data['subject']] = row_data
    except Exception:
        configuration_data = {}
    configuration_data['exam_result_subject_config'] = result_temp
    exam_schedule = ExamSchedule.objects.filter(exam=exam, standard_section=standard_section)
    schedule_data = ExamScheduleReadSerilaizer(exam_schedule, many=True).data
    if not schedule_data:
        raise ValidationError('Exam is not yet scheduled')
    for temp_data in schedule_data:
        exam_schedule_ids.append(temp_data['id'])
        temp = {}
        if 'cumulative_mapping' in temp_data:
            for cum_row in temp_data['cumulative_mapping']:
                cum_row['cumulative_data'] = {}
                temp[cum_row['id']] = cum_row
                cum_schedule_mapping_data[cum_row['id']] = cum_row
            temp_data['cumulative_mapping'] = temp
        if temp_data['subject'] in configuration_data['exam_result_subject_config']:
            temp_data['configuration_data'] = configuration_data['exam_result_subject_config'][temp_data['subject']]
            cumulative_data = {}
            if 'cumulative_data' in temp_data['configuration_data'] and temp_data['configuration_data']['cumulative_data']:
                cumulative_data = {t['schedule_cumulative'] : t for t in temp_data['configuration_data']['cumulative_data'].values()}
                if 'cumulative_mapping' in temp_data and cumulative_data:
                    for cum_row_id in temp_data['cumulative_mapping']:
                        cum_row = temp_data['cumulative_mapping'][cum_row_id]
                        if cum_row_id in cumulative_data:
                            temp_data['cumulative_mapping'][cum_row_id]['cumulative_data'].update(cumulative_data[cum_row_id])
    response_data = {}
    response_data['schedule_data'] = schedule_data
    response_data['cumulative_data'] = cum_schedule_mapping_data.values()
    del configuration_data['exam_result_subject_config']
    response_data['configuration_data'] = configuration_data
    response_data['part_type_list'] = SubjectPartType.objects.all().values()
    return {'data': response_data}

def get_exam_configuration_data(self, request, exam):
    standard = self.request.GET.get('standard')
    standard_section_ids = self.request.GET.get('standard_section_ids')
    if standard_section_ids:
        standard_section_ids = standard_section_ids.split(',')
    if standard:
        standard_section_ids = StandardSectionMapping.objects.filter(
            standard=standard, academic_year=Exam.objects.get(id=exam).academic_year
        ).values_list('id', flat=True)
    standard_section_heirarchy = get_section_wise_list_for_exam([exam], {}, False, standard_section_ids)
    exam_result_config_data = {}
    standard_section_ids = []
    standard_section_mapping = {}
    section_subject_mapping = {}
    subject_wise_config_data = {}  # here maps standard_section -> subject -> config data
    for standard_data in standard_section_heirarchy:
        for section_data in standard_data['section_list']:
            standard_section_ids.append(section_data['standard_section'])
    exam_configuration_data = {e['standard_section_id']: e for e in ExamResultConfiguration.objects.filter(
        standard_section__in=standard_section_ids, exam=exam
    ).values()}
    values = [
        'standard_section', 'subject', 'subject__name', 'standard_section__standard',
        'subject__sequence', 'min_marks', 'max_marks', 'subject__subject_part_type__name',
        'subject__subject_part_type'
    ]
    schedule_data = ExamSchedule.objects.filter(standard_section__in=standard_section_ids,exam=exam).values(*values)
    for schedule in schedule_data:
        standard_id = schedule['standard_section__standard']
        if standard_id not in standard_section_mapping:
            standard_section_mapping[standard_id] = {}
        if schedule['standard_section'] not in section_subject_mapping:
            section_subject_mapping[schedule['standard_section']] = {}
            section_subject_mapping[schedule['standard_section']][schedule['subject']] = {'min_marks' : schedule['min_marks'], 
                                                                    'max_marks': schedule['max_marks']
                                                                }
        
        standard_section_mapping[standard_id][schedule['subject']] = {
                                                                    'subject': schedule['subject'],
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
    result_configuration = ExamResultSubjectConfiguration.objects.filter(exam_result_configuration__exam=exam,
        exam_result_configuration__standard_section__in=standard_section_ids
    ).values(
        'exam_result_configuration', 'configured_marks', 'configured_min_marks', 'is_disabled',
        'exam_result_configuration__standard_section', 'subject', 'exam_result_configuration__is_announced',
        'exam_result_configuration__approval_status'
    )
    for result_config_data in result_configuration:
        if result_config_data['exam_result_configuration__standard_section'] not in subject_wise_config_data:
            subject_wise_config_data[result_config_data['exam_result_configuration__standard_section']] = {}
        if result_config_data['subject'] not in subject_wise_config_data[
            result_config_data['exam_result_configuration__standard_section']]:
            subject_wise_config_data[result_config_data['exam_result_configuration__standard_section']][
                result_config_data['subject']] = result_config_data
    # chaning the key to orignal data
    for standard_data in standard_section_heirarchy:
        standard_data['subject_list'] = []
        if standard_data['standard'] in standard_section_mapping1:
            standard_data['subject_list'] = standard_section_mapping1[standard_data['standard']]
        for section_data in standard_data['section_list']:
            section_data['subject_data'] = {}
            section_data['exam_configuration_data'] = {}
            if section_data['standard_section'] in subject_wise_config_data:
                section_data['subject_data'] = subject_wise_config_data[section_data['standard_section']]
            if section_data['standard_section'] in exam_configuration_data:
                section_data['exam_configuration_data'] = exam_configuration_data[section_data['standard_section']]
    part_type_list = SubjectPartType.objects.all().values()
    return {'data': {'standard_data': standard_section_heirarchy, 'exam_result_config_data': exam_result_config_data, 
    'part_type_list': part_type_list}}


# Getting both exam and exam list for the student 
def student_exam_marks_list(self, request, only_announced=False):
    from apps.exams.services.exam import get_exam_list_for_student, get_student_exam_schedule
    academic_year = self.request.GET.get('academic_year')  
    try:
        logged_in_student = self.request.user.student.id
    except AttributeError:
        logged_in_student = self.request.GET.get('student_id')
    if not logged_in_student:
        raise ValidationError('Only student can view the data')
    if not academic_year:
        raise ValidationError('Academic year is mandatory')
    schedule_data = get_exam_list_for_student(self, request, logged_in_student)['data']
    exam_ids = []
    exam_schedule_ids = []
    for schedule in schedule_data:
        exam_ids.append(schedule['exam'])
        exam_schedule_ids += schedule['schedule_ids']

    student_mark_data = StudentMark.objects.filter(is_active=True, student=logged_in_student, exam_schedule__in=exam_schedule_ids).values()
    student_cumulative_mark_data = StudentCumulativeMark.objects.filter(is_active=True, student=logged_in_student,
        exam_cumulative__exam_schedule__in=exam_schedule_ids).values(
        'exam_cumulative', 'exam_cumulative__exam_schedule', 'marks', 'student'
    )
    student_cumulative_schedule_mapping = {}
    for cumulative_mark in student_cumulative_mark_data:
        if cumulative_mark['exam_cumulative__exam_schedule'] not in student_cumulative_schedule_mapping:
            student_cumulative_schedule_mapping[cumulative_mark['exam_cumulative__exam_schedule']] = {}
        student_cumulative_schedule_mapping[cumulative_mark['exam_cumulative__exam_schedule']][cumulative_mark['exam_cumulative']] = cumulative_mark
    student_mark_data = {s['exam_schedule_id'] : s for s in student_mark_data}

    announced_data = StudentExamFinalResult.objects.filter(is_announced=True, exam__in=exam_ids, student=logged_in_student).values()
    announced_data = {a['exam_id'] : a for a in announced_data}
    final_list = []
    for schedule in schedule_data:
        del schedule['schedule_ids']
        schedule['is_announced'] = False
        schedule['final_result'] = ''
        if schedule['exam'] in announced_data:
            schedule['is_announced'] = True
            schedule['final_result'] = announced_data[schedule['exam']]['status']
        elif only_announced:
            continue
        schedule['schedule_list'] = get_student_exam_schedule(self, request, logged_in_student,schedule['exam'], schedule['exam__term'])['data']['schedule_list']
        schedule['total_obtained_marks'] = 0
        schedule['total_marks'] = 0
        for index, sch in enumerate(schedule['schedule_list']):
            if not sch['max_marks']:
                sch['max_marks'] = 0
            schedule['total_marks'] += sch['max_marks']
            if schedule['is_announced'] and sch['id'] in student_mark_data:
                schedule['schedule_list'][index]['obtained_marks'] = student_mark_data[sch['id']]['marks']
                schedule['total_obtained_marks'] += student_mark_data[sch['id']]['marks'] if student_mark_data[sch['id']]['marks'] else 0
        del schedule['schedule_list']
        final_list.append(schedule)

    #Fetching Exam REsult config list

    student_standard_section = Enrollment.get_student_standard_for_academic(self, academic_year, logged_in_student, True)['standard_section']
    exam_config_data = {e['id']:e for e in ExamResultConfiguration.objects.filter(exam__in=exam_ids, standard_section=student_standard_section, is_announced=True).values(
        'id', 'exam__exam_type__name', 'exam__term__name','exam__exam_type__code', 'exam__from_date', 'exam__to_date', 'exam', 'exam__term', 'is_announced'
    )}
    exam_result_config = get_exam_result_config(self, exam_config_data.keys(), False, [logged_in_student], False)
    for config_id in exam_result_config:
        if 'student_list' in exam_result_config[config_id][student_standard_section] and exam_result_config[config_id][student_standard_section]['student_list']:
            student_data = exam_result_config[config_id][student_standard_section]['student_list'][0]
            temp = {
                'exam_name': exam_config_data[config_id]['exam__exam_type__name'],
                'exam_code': exam_config_data[config_id]['exam__exam_type__code'],
                'exam__term': exam_config_data[config_id]['exam__term'], 
                'term_name': exam_config_data[config_id]['exam__term__name'], 
                'start_date': exam_config_data[config_id]['exam__from_date'],
                'end_date': exam_config_data[config_id]['exam__to_date'],
                'exam': exam_config_data[config_id]['exam'],
                'is_announced': exam_config_data[config_id]['is_announced'],
                'final_result': student_data['total_result'],
                'total_obtained_marks': student_data['total_obtained_marks'],
                'total_marks': student_data['total_configured_marks'],
                'exam_config_id': config_id
            }
            final_list.append(temp)
    return final_list

def approve_result_config(self, request):
    academic_year = request.data['academic_year']
    term = request.data['term']
    standard_section_ids = request.data['standard_section_ids']
    approval_status = request.data['approval_status']
    data_to_save = []
    existing_data = {r['standard_section_id']:r for r in ResultSectionApproval.objects.filter(
        standard_section__in=standard_section_ids, result_config__academic_year=academic_year,
        result_config__term=term
    ).values()}
    configuration_data = {r['standard_section'] for r in ResultSectionMapping.objects.filter(
        standard_section__in=standard_section_ids, result__term= term, result__academic_year=academic_year,
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

def validate_final_result_configuration(self, academic_year, standard_section, config_id):
    exclude_query = {}
    result_config_obj = ExamFinalResultConfiguration.objects.filter(academic_year=academic_year, standard_section=standard_section).exclude(
        **exclude_query)
    if config_id and result_config_obj and str(config_id) != str(result_config_obj[0].id):
       raise ValidationError('Result already configured for the academic year')
    elif (not config_id) and (result_config_obj.count() > 0):
        raise ValidationError('Result already configured for the academic year')
    if result_config_obj and result_config_obj[0].is_finalized:
        raise ValidationError('Result is already finalized not abled to update any data for the section')

"""
    check configuration marks are exist
    get each term confiured marks
"""
def validate_final_result_data(self, data):
    config_id = None
    standard_section = data['standard_section']
    academic_year = data['academic_year']
    if 'id' in data:
        config_id = data['id']
    validate_final_result_configuration(self, academic_year, standard_section, config_id)
    terms_list = set() #getting terms list to check all terms are finalized
    for subject_data in data['subject_list']:
        for term_data in subject_data['terms_list']:
            terms_list.add(
                term_data['term']
            )
    result_configuration_list = ResultSectionApproval.objects.filter(
        approval_status=True, standard_section=standard_section,
        result_config__academic_year=academic_year,
        result_config__term__in=list(terms_list)
    ).values_list('result_config__term', flat=True)
    if terms_list - set(result_configuration_list):
        terms_list_names = ExamTerm.objects.filter(
            id__in=list(terms_list - set(result_configuration_list))
        ).values_list('name', flat=True)
        terms_list_names = ','.join(terms_list_names)
        raise ValidationError(f'Result configuration for the terms {terms_list_names} are not approved')
    marks_saving_data = ResultSectionMapping.objects.filter(
        standard_section=standard_section, result__academic_year=academic_year,
        result__term__in=terms_list, is_active=True
    ).values(
        'result__term', 'subject', 'max_marks', 'min_marks', 'id'
    )
    result_section_term_subject_mapping = {}
    for marks_data in marks_saving_data:
        if marks_data['result__term'] not in result_section_term_subject_mapping:
            result_section_term_subject_mapping[marks_data['result__term']] = {}
        result_section_term_subject_mapping[marks_data['result__term']][marks_data['subject']] = {
                'max_marks': marks_data['max_marks'], 'min_marks': marks_data['min_marks'], 'id': marks_data['id']
        }
    missing_subject_list = []
    total_max_marks = 0
    # Adds the id of the result_section mapping because there we store the marks configuration for the final result
    for subject_data in data['subject_list']:
        for term_data in subject_data['terms_list']:
            if term_data['term'] not in result_section_term_subject_mapping:
                term_name = ExamTerm.objects.get(id=term_data['term']).name
                subject_name = Subject.objects.get(id=subject_data['subject']).name
                missing_subject_list.append(
                    f'Subject - {subject_name} is missing for term {term_name}'
                )
            elif subject_data['subject'] not in result_section_term_subject_mapping[term_data['term']]:
                term_name = ExamTerm.objects.get(id=term_data['term']).name
                subject_name = Subject.objects.get(id=subject_data['subject']).name
                missing_subject_list.append(
                    f'Subject - {subject_name} is missing for term {term_name}'
                )
            else:
                term_data['id'] = result_section_term_subject_mapping[term_data['term']][subject_data['subject']]['id']
                total_max_marks += term_data['final_result_configured_marks']
            if term_data['final_result_disabled'] and term_data['final_result_configured_marks'] and term_data['final_result_configured_min_marks']:
                raise ValidationError('When disabled marks should be zero')
            if not term_data['final_result_disabled'] and not term_data['final_result_configured_marks']:
                raise ValidationError('marks is mandatory')
    if total_max_marks != data['total_max_marks']:
        raise ValidationError('Total max marks not matching') 
    if missing_subject_list:
        raise ValidationError(f'{",".join(missing_subject_list)}')
    configuration_list = ResultConfiguration.objects.filter(
        term__in=terms_list, academic_year=academic_year
    ).values_list('id', flat=True)
    return configuration_list, data


def add_final_exam_result_configuration(self, data):
    if FormdefinitionService.get_formdefintion_data(self, 'exam_configurations', 'grade_plan'):
        if 'grade_plan' not in data or not data['grade_plan']:
            raise ValidationError('grade_plan is mandatory')
    result_configuration_data = {
        'standard_section': data['standard_section'],
        'grade_plan': data['grade_plan'] if 'grade_plan' in data else None,
        'total_max_marks': data['total_max_marks'],
        'total_min_marks': data['total_min_marks'],
        'academic_year': data['academic_year']
    }
    configuration_list, data = validate_final_result_data(self, data)
    result_configuration_data['result_config_term'] = configuration_list
    with transaction.atomic(using=get_current_db_name()):
        if 'id' in data:
            result_configuration_data['id'] = data['id']
        SharedService.add_or_update_data(self, [result_configuration_data])
        for subject_data in data['subject_list']:
            for term_data in subject_data['terms_list']:
                res_sub = ResultSectionMapping.objects.get(id=term_data['id'])
                res_sub.final_result_configured_marks = term_data['final_result_configured_marks']
                res_sub.final_result_configured_min_marks = term_data['final_result_configured_min_marks']
                res_sub.final_result_disabled = term_data['final_result_disabled']
                res_sub.final_result_min_for_subject = subject_data['min_marks']
                res_sub.save()
    return {'Reason': 'Data Added Successfully'}

def exam_final_result_configuration_data(self, request, extra_kwargs={}):
    academic_year = request.GET.get('academic_year')
    standard_section = request.GET.get('standard_section')
    if 'academic_year' in extra_kwargs:
        academic_year = extra_kwargs['academic_year']
    if 'standard_section' in extra_kwargs:
        standard_section = extra_kwargs['standard_section']
    raise_error_if_final_not_configured = False
    if 'raise_error_if_final_not_configured' in extra_kwargs:
        raise_error_if_final_not_configured = extra_kwargs['raise_error_if_final_not_configured']
    response = {}
    if not academic_year or not standard_section:
        raise ValidationError('academic_year / standard_section is mandatory')
    exam_term_list = list(ExamTerm.objects.all().values())
    exam_term_ids = [e['id'] for e in exam_term_list]
    approved_term_list = ResultSectionApproval.objects.filter(
        result_config__academic_year=academic_year,
        standard_section=standard_section,
        approval_status=True
    ).values_list(
        'result_config__term', flat=True
    )
    if set(exam_term_ids) - set(approved_term_list):
        raise ValidationError(f'Terms - {",".join(list(ExamTerm.objects.filter(id__in=set(exam_term_ids)-set(approved_term_list)).values_list("name", flat=True)))} Not approved')
    try:
        obj = ExamFinalResultConfiguration.objects.get(
            academic_year=academic_year, standard_section=standard_section
        )
        serializer = ExamFinalResultConfigurationSerializer(obj)
        response = serializer.data
    except Exception as e:
        pass
    result_section_mapping = ResultSectionMapping.objects.filter(
        result__term__in=exam_term_ids, is_active=True, standard_section=standard_section
    ).values(
        'final_result_configured_marks', 'final_result_disabled', 'final_result_configured_min_marks',
        'final_result_min_for_subject',
        'max_marks', 'min_marks', 'subject', 'result__term', 'subject__name', 'subject__subject_part_type__name', 'result__term__name',
        'subject__subject_part_type'
    )
    temp_result_section_mapping = {}
    error_list = []
    for result in result_section_mapping:
        if raise_error_if_final_not_configured and not result['final_result_disabled'] and not result['final_result_configured_marks']:
            error_list.append(
                f'Subject - {result["subject__name"]} is not configured for term - {result["result__term__name"]}'
            )
        if result['subject'] not in temp_result_section_mapping:
            temp_result_section_mapping[result['subject']] = {
                'term_list': {}, 'subject_name': result['subject__name'],
                'subject_part_type': result['subject__subject_part_type__name'],
                'subject_part_type_id': result['subject__subject_part_type'],
                'subject': result['subject'],
                'subject_min_marks': result['final_result_min_for_subject'],
                'subject_max_marks': 0
            }
        if not temp_result_section_mapping[result['subject']]['subject_min_marks']:
            temp_result_section_mapping[result['subject']]['subject_min_marks'] = result['final_result_min_for_subject']
        result['final_result_configured_marks'] = result['final_result_configured_marks'] if result['final_result_configured_marks'] else None
        temp_result_section_mapping[result['subject']]['subject_max_marks'] += result['final_result_configured_marks'] if result['final_result_configured_marks'] else 0
        temp_result_section_mapping[result['subject']]['term_list'][result['result__term']] = {
            'final_result_configured_min_marks': result['final_result_configured_min_marks'],
            'final_result_configured_marks': result['final_result_configured_marks'],
            'min_marks': result['min_marks'],
            'max_marks': result['max_marks'],
            'is_disabled': result['final_result_disabled']
        }
    if error_list:
        raise ValidationError(error_list)
    response['result_data'] = temp_result_section_mapping.values()
    response['available_term_list'] = exam_term_list
    response['part_type_list'] = SubjectPartType.objects.all().values()
    return {'data': response}

def exam_final_result_summary(self, request):
    academic_year_id = request.GET.get('academic_year')
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
    final_result = {e['standard_section']: e for e in ExamFinalResultConfiguration.objects.filter(academic_year=academic_year_id).values(
        'standard_section', 'is_finalized'
    )}
    result_term_section_approval = {}
    for res in ResultSectionApproval.objects.filter(
            result_config__academic_year=academic_year_id
        ).values('result_config__term', 'standard_section', 'approval_status'):
        if res['result_config__term'] not in result_term_section_approval:
            result_term_section_approval[res['result_config__term']] = {}
        result_term_section_approval[res['result_config__term']][res['standard_section']] = {
            'approval_status': res['approval_status']
        }
    for standard_data in standard_section_heirarchy:
        for standard_section in standard_data['section_list']:
            standard_section['term_mark_mapping'] = {}
            total_final_max_marks = 0
            for term_data in exam_term_list:
                result_data = get_result_configuration_mapping(
                    None, term_data['id'],academic_year_id, standard_section['standard_section'], show_final_result_data=True
                )
                configured_max_marks = 0
                for res in result_data['result_data']:
                    if 'final_result_configured_marks' in res and res['final_result_configured_marks']:
                        total_final_max_marks += res['final_result_configured_marks']
                    configured_max_marks += res['configured_max_marks'] if 'configured_max_marks' in res and res['configured_max_marks'] else 0
                approval_status = False
                if term_data['id'] in result_term_section_approval and standard_section['standard_section'] in result_term_section_approval[term_data['id']]:
                    approval_status = result_term_section_approval[term_data['id']][standard_section['standard_section']]['approval_status']
                standard_section['term_mark_mapping'][term_data['id']] = {
                    'configured_marks': configured_max_marks,
                    'is_finalized': approval_status
                }
            standard_section['term_mark_mapping']['final_result_config'] = {
                'configured_marks': total_final_max_marks,
                'is_finalized': final_result[standard_section['standard_section']]['is_finalized'] if standard_section['standard_section'] in final_result else False
            }
    exam_term_list.append(
        {
        'name': 'Final Result Config', 'id': 'final_result_config'
        }
    )
    return {'data': {'standard_data': standard_section_heirarchy, 'exam_term_list': exam_term_list}}


def approve_final_result(self, request, result_config_id):
    exam_final_result_config = ExamFinalResultConfiguration.objects.get(id=result_config_id)
    if exam_final_result_config.is_finalized:
        raise ValidationError('Exam Already finalized')
    exam_final_result = exam_final_result_configuration_data(self, request, {
        'academic_year': exam_final_result_config.academic_year, 
        'standard_section': exam_final_result_config.standard_section,
        'raise_error_if_final_not_configured': True
    })
    exam_final_result_config.is_finalized = True
    exam_final_result_config.save()
    return exam_final_result

def get_standard_section_list_for_exam(self):
    exam = self.request.GET.get('exam')
    exam_ids = self.request.GET.get('exam_ids')
    term = self.request.GET.get('term')
    if exam_ids:
        if not isinstance(exam_ids,list):
            exam = exam_ids.split(',')
        else:
            exam=exam_ids
    elif term and not exam:
        academic_year = self.request.GET.get('academic_year')
        exam = Exam.objects.filter(
            term=term, academic_year=academic_year
        ).values_list('id', flat=True)
    elif not exam:
        raise ValidationError('Exam id is mandatory')
    else:
        exam = [exam]
    standard_section_heirarchy = get_section_wise_list_for_exam(exam)
    return standard_section_heirarchy
