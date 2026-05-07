"""
Optimized Marks Card Generation Service
This service provides high-performance marks card generation with:
- Optimized database queries using select_related/prefetch_related
- Bulk data fetching
- Reduced N+1 query problems
- Efficient data structures
"""
import math
from num2words import num2words
from django.db.models import F, Value as V
from django.db.models.functions import Concat
from rest_framework.exceptions import ValidationError
from apps.exams.models.marks import StudentMark, StudentCumulativeMark, ExamScheduleCumulativeMapping, StudentMarkSectionWiseApproval, Grade, GradeExamScheduleMapping
from apps.exams.models import StudentExamFinalResult
from apps.exams.models.exam import Exam
from apps.exams.models.schedule import ExamSchedule
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.models import SubjectStudent
from apps.students.models.student import Student
from apps.students.models.studentDetail import StudentParentMapping, StudentDetails
from apps.classes.models.subject import SubjectPartType
from apps.shared.services_shared.common import get_full_name
from apps.students.services.student import get_student_admission_form_details
from apps.institutes.models.institute import Institute
from apps.institutes.serializers import InstituteSerializer
from apps.exams.services.mark import print_marks_card, get_student_grade, generate_chart, download_consolidation_marks, download_consolidation_marks_subject_wise
from apps.shared.services import FormdefinitionService
from apps.shared.models import Document
from apps.shared.serializers import DocumentSerializer


def get_standard_section_subjects_optimized(self, examId, standardSectionId, raiseErrorIfNotFinalized=False, student_ids=[], ignore_final_result_data=False):
    response = {'data': {}}
    required_form_definition = [
        {'form_name': 'exam_configurations', 'column_name': 'grade_plan'}
    ]
    temp_form_defintion = FormdefinitionService.get_formdefinition_for_multiple_data(self, required_form_definition)
    form_definition_tracking = {'exam_configurations_grade_plan': temp_form_defintion['exam_configurations']['grade_plan']}

    approval_data = list(StudentMarkSectionWiseApproval.objects.filter(exam=examId,
                                                                standard_section=standardSectionId).values())
    institute_objs = Institute.get_institute(self)
    if self.request.GET.get('exam_result'):
        if not approval_data or approval_data[0]['approval_status'] != 1:
            raise ValidationError('Student marks are not approved for the section')
    # Optimized: Use select_related to reduce queries
    exam_obj = Exam.objects.select_related('academic_year', 'exam_type', 'term').get(id=examId)
    standard_sec_obj = StandardSectionMapping.objects.select_related('standard', 'section').get(id=standardSectionId)
    values_list = ['id', 'first_name', 'middle_name','last_name', 'current_reg_num', 'student_name','dob']
    custom_annotate = {'student_name': Concat('first_name', V(' '), 'middle_name',V(' '), 'last_name')}
    if student_ids:
        student_data = Student.objects.filter(
            id__in=student_ids
        ).annotate(**custom_annotate).values(*values_list)
    else:
        student_data = Student.get_student_for_standard(None, None, [standardSectionId], values_list, custom_annotate)
    student_ids = []
    studentIdDict = {}
    part_type_list = SubjectPartType.objects.all().values()
    part_types = [{'name': s['name']} for s in part_type_list]
    for i in student_data:
        student_ids.append(i['id'])
        i['student'] = i['id']
        studentIdDict[i['id']] = i
    filterQuery = {'student__in': student_ids,
                'exam_schedule__exam': examId}
    scheduleQuery = {'exam': examId}
    scheduleQuery['standard_section'] = standardSectionId
    scheduleQuery['sub_schedule_parent'] = None
    # OPTIMIZED: Use select_related for all foreign keys
    scheduleData = ExamSchedule.objects.filter(**scheduleQuery).select_related(
        'subject', 'subject__subject_part_type', 'grade_plan'
    ).values('id', 'subject', 'subject__name', 'min_marks',
                                                                    'max_marks', 'subject__subject_part_type__name',
                                                                        'subject__subject_part_type',
                                                                        'subject__subject_part_type__code_name',
                                                                        'subject__subject_code', 'is_marks', 'grade_plan',
                                                                        'grade_plan__name','subject__codename', 'schedule_sequence'
                                                                    )
    student_admission_form = get_student_admission_form_details(self, student_ids)
    scheduleIds = []
    subjectList = {}
    scheduleSubjectIds = []
    grade_plan_ids = set()
    for schedule in scheduleData:
        scheduleIds.append(schedule['id'])
        temp = {'subject': schedule['subject'], 'subject_name': schedule['subject__name'], 'subject_part_type': schedule['subject__subject_part_type__name'],
                'min_marks': schedule['min_marks'], 'max_marks': schedule['max_marks'], 'schedule': schedule['id'],
                'subject_part_type_id': schedule['subject__subject_part_type'],
            'subject_part_type_code_name': schedule['subject__subject_part_type__code_name'],
                'subject__subject_code': schedule['subject__subject_code'], 'is_marks': schedule['is_marks'],
                'grade_plan': schedule['grade_plan'], 'grade_plan_name': schedule['grade_plan__name'],'subject__codename':schedule['subject__codename']
                }
        if schedule['grade_plan']:
            grade_plan_ids.add(schedule['grade_plan'])
        subjectList[schedule['subject']] = temp
        scheduleSubjectIds.append(schedule['subject'])
    # OPTIMIZED: Use select_related for subject relationships
    studentSubjectData = SubjectStudent.objects.filter(student__in=student_ids,
                                                    academic_year=exam_obj.academic_year,
                                                    subject__in=scheduleSubjectIds).select_related(
        'subject', 'subject__subject_part_type'
    ).values('subject', 'student',
                                                                                            'subject__name', 'subject__subject_code','subject__codename',
                                                                                            subject_name=F('subject__name'),
                                                                                            subject_part_type=F('subject__subject_part_type__name'),
                                                                                            subject_part_type_id=F('subject__subject_part_type'),
                                                                                            subject_part_type_code_name=F('subject__subject_part_type__code_name')
                                                                                            )
    studentSubjectMapping = {}
    for studentSubject in studentSubjectData:
        if studentSubject['student'] in studentSubjectMapping:
            studentSubjectMapping[studentSubject['student']].append(studentSubject)
        else:
            studentSubjectMapping[studentSubject['student']] = []
            studentSubjectMapping[studentSubject['student']].append(studentSubject)
    filterQuery['exam_schedule__in'] = scheduleIds
    filterQuery['is_active'] = True
    student_mark_data = []
    student_list=[]
    # OPTIMIZED: Use select_related for student and exam_schedule
    temp_student_data = StudentMark.objects.filter(**filterQuery).select_related(
        'student', 'exam_schedule', 'remark'
    ).values(
        'student__first_name', 'student__middle_name', 'student__last_name',
        'student__sts', 'student__current_reg_num', 'exam_schedule_id', 'marks',
        'student', 'staff', 'attendance_status', 'id', 'exam_schedule__is_marks',
        'exam_schedule__grade_plan', 'grade','student__mobile_num', 'student__dob',
        'marked_attendance_is_global','remark', 'student__profile_pic',
        'remark_is_global', 'marked_attendance_days', 'remark', 'remark__name'
    )
    exam_schedule_ids = []
    profile_photo_dict = {}
    for student_row in temp_student_data:
        exam_schedule_ids.append(student_row['exam_schedule_id'])
        student_list.append(student_row['student'])
        if student_row['student__profile_pic'] and student_row['student__profile_pic'] not in profile_photo_dict:
            profile_photo_dict[student_row['student__profile_pic']] = {
                'student_id' : student_row['student'],
                'student_profile_pic' : student_row['student__profile_pic']
            }
        student_row['first_name'] = student_row['student__first_name']
        student_row['dob'] = student_row['student__dob']
        student_row['middle_name'] = student_row['student__middle_name']
        student_row['last_name'] = student_row['student__last_name']
        student_row['mobile_num'] = student_row['student__mobile_num']
        student_row['is_marks'] = student_row['exam_schedule__is_marks']
        student_row['grade_plan'] = student_row['exam_schedule__grade_plan']
        student_row['full_name'] = get_full_name(
            student_row['student__first_name'],
            student_row['student__middle_name'],
            student_row['student__last_name']
        )
        student_row['sts'] = student_row['student__sts']
        student_row['current_reg_num'] = student_row['student__current_reg_num']
    profile_photo_list = list(profile_photo_dict.keys())
    temp_document_data = Document.objects.filter(id__in=profile_photo_list)
    document_serializer = DocumentSerializer(temp_document_data,many=True)
    # Optimized: Use dictionaries for O(1) lookups instead of nested loops
    document_dict = {doc['id']: doc for doc in document_serializer.data}
    temp_parent_data = StudentParentMapping.objects.filter(student__in=student_list).select_related('parent').values(
        'parent__father_name','parent__mother_name','student'
    )
    parent_dict = {p['student']: p for p in temp_parent_data}
    temp_student_detail = StudentDetails.objects.filter(student__in=student_list).select_related('caste').values(
        'caste__name','student'
    )
    detail_dict = {d['student']: d for d in temp_student_detail}
    for student_row in temp_student_data:
        # Optimized: Use dictionary lookup instead of nested loop
        if student_row['student'] in parent_dict:
            student_row['father_name'] = parent_dict[student_row['student']]['parent__father_name']
            student_row['mother_name'] = parent_dict[student_row['student']]['parent__mother_name']
        # Optimized: Use dictionary lookup instead of nested loop
        if student_row.get('student__profile_pic') and student_row['student__profile_pic'] in document_dict:
            student_row['student_profile_pic_file'] = document_dict[student_row['student__profile_pic']]['file']
        # Optimized: Use dictionary lookup instead of nested loop
        if student_row['student'] in detail_dict:
            student_row['caste_name'] = detail_dict[student_row['student']]['caste__name']
        student_mark_data.append(student_row)
    # OPTIMIZED: Use select_related for subject relationships
    temp_exam_schedule = ExamSchedule.objects.filter(id__in=exam_schedule_ids).select_related(
        'subject', 'subject__subject_part_type'
    ).values(
        'subject__name', 'subject__subject_code', 'subject__subject_part_type__name',
        'subject__subject_part_type__code_name', 'subject__subject_part_type__id',
        'subject', 'min_marks', 'max_marks', 'id', 'is_marks', 'grade_plan', 'subject__codename'
    )
    exam_schedule_data = {}
    for temp_schedule in temp_exam_schedule:
        temp_schedule['subject_name'] = temp_schedule['subject__name']
        temp_schedule['subject_code'] = temp_schedule['subject__subject_code']
        temp_schedule['codename'] = temp_schedule['subject__codename']
        temp_schedule['subject_part_type'] = temp_schedule['subject__subject_part_type__name']
        temp_schedule['subject_part_type_code_name'] = temp_schedule['subject__subject_part_type__code_name']
        temp_schedule['subject_part_type_id'] = temp_schedule['subject__subject_part_type__id']
        exam_schedule_data[temp_schedule['id']] = temp_schedule
        
    # serializer = StudentMarkReadSerializer(student_data, many=True)
    studentBasedData = {}
    enteredMarksStudentIds = []
    filter_query_cumulative = {
        'student__in': student_ids,
        'exam_cumulative__exam_schedule__in': scheduleIds,
        'is_active': True
    }
    # OPTIMIZED: Use select_related for cumulative relationships
    student_cumulative_data = StudentCumulativeMark.objects.filter(
        **filter_query_cumulative
    ).select_related(
        'exam_cumulative', 'exam_cumulative__cumulative_type', 'exam_cumulative__exam_schedule'
    ).values(
        'id', 'marks', 'exam_cumulative_id', 'exam_cumulative__exam_schedule', 'student', 'attendance_status', 'exam_cumulative__cumulative_type',
        'exam_cumulative__cumulative_type__name', 'exam_cumulative__max_marks','exam_cumulative__min_marks'
    )
    temp_schedule_cumulative_mapping = {}
    schedule_cumulative_mapping = {}
    # OPTIMIZED: Use select_related for cumulative type
    schedule_cumulative_data = ExamScheduleCumulativeMapping.objects.filter(
        exam_schedule__in=scheduleIds,
    ).select_related('cumulative_type').values(
        'exam_schedule', 'cumulative_type', 'max_marks', 'min_marks', 'cumulative_type__name',
        'cumulative_type__alias', 'id'
    )
    for schedule_cumulative in schedule_cumulative_data:
        if schedule_cumulative['id'] not in schedule_cumulative_data:
            temp_schedule_cumulative_mapping[schedule_cumulative['id']] = {
                'exam_schedule' : schedule_cumulative['exam_schedule'],
                'max_marks': schedule_cumulative['max_marks'],
                'min_marks': schedule_cumulative['min_marks'],
                'cumulative_type_data': [],
                'id': schedule_cumulative['id']
            }
        temp_schedule_cumulative_mapping[schedule_cumulative['id']]['cumulative_type_data'].append(
            {
            'id': schedule_cumulative['cumulative_type'],
            'name': schedule_cumulative['cumulative_type__name'],
            'alias': schedule_cumulative['cumulative_type__alias']
            }
        )
    for cum_row in temp_schedule_cumulative_mapping.values():
        if cum_row['exam_schedule'] not in schedule_cumulative_mapping:
            schedule_cumulative_mapping[cum_row['exam_schedule']] = []
        schedule_cumulative_mapping[cum_row['exam_schedule']].append(cum_row)
    student_cumulative_data_temp_mapping = {}
    for student_cum in student_cumulative_data: #this is to remove the duplicates
        if student_cum['id'] not in student_cumulative_data_temp_mapping:
            student_cumulative_data_temp_mapping[student_cum['id']] = {
                'cumulative_data_mapping': [], 'id' : student_cum['id'],
                'marks': student_cum['marks'], 'exam_cumulative_id': student_cum['exam_cumulative_id'],
                'exam_cumulative__exam_schedule': student_cum['exam_cumulative__exam_schedule'], 'student': student_cum['student'],
                'attendance_status': student_cum['attendance_status'], 'exam_cumulative__max_marks': student_cum['exam_cumulative__max_marks'],
                'exam_cumulative__min_marks': student_cum['exam_cumulative__min_marks']
            }
        student_cumulative_data_temp_mapping[student_cum['id']]['cumulative_data_mapping'].append({
            'cumulative_type_id': student_cum['exam_cumulative__cumulative_type'],
            'cumulative_type_name': student_cum['exam_cumulative__cumulative_type__name'],
        })
    student_cumulative_data_mapping = {}
    for cum in student_cumulative_data_temp_mapping.values():
        if cum['exam_cumulative__exam_schedule'] not in student_cumulative_data_mapping:
            student_cumulative_data_mapping[cum['exam_cumulative__exam_schedule']] = {cum['student']: []}
        elif cum['student'] not in student_cumulative_data_mapping[cum['exam_cumulative__exam_schedule']]:
            student_cumulative_data_mapping[cum['exam_cumulative__exam_schedule']][cum['student']] = []
        if cum['exam_cumulative__exam_schedule'] not in schedule_cumulative_mapping:
            schedule_cumulative_mapping[cum['exam_cumulative__exam_schedule']] = {}
        student_cumulative_data_mapping[cum['exam_cumulative__exam_schedule']][cum['student']].append(cum)
    for subject_id, schedule_row in subjectList.items():
        subjectList[subject_id]['total_max_marks'] = subjectList[subject_id]['max_marks'] if subjectList[subject_id]['max_marks'] else 0
        subjectList[subject_id]['total_min_marks'] = subjectList[subject_id]['min_marks'] if subjectList[subject_id]['min_marks'] else 0
        if subjectList[subject_id]['schedule'] in schedule_cumulative_mapping:
            subjectList[subject_id]['cumulative_data'] = schedule_cumulative_mapping[subjectList[subject_id]['schedule']]
            for temp_row in schedule_cumulative_mapping[subjectList[subject_id]['schedule']]:
                subjectList[subject_id]['total_max_marks'] += temp_row['max_marks'] if temp_row['max_marks'] else 0
                subjectList[subject_id]['total_min_marks'] += temp_row['min_marks'] if temp_row['min_marks'] else 0
    # entered student marks data
    for markData in student_mark_data:
        markData['exam_schedule'] = exam_schedule_data[markData['exam_schedule_id']]
        obtained_marks = 0
        total_marks = subjectList[markData['exam_schedule']['subject']]['total_max_marks']
        total_min_marks = subjectList[markData['exam_schedule']['subject']]['total_min_marks']
        #whatever key is added please add in unentered marks section also
        temp = {'id': markData['id'], 'marks': markData['marks'], 'subject': markData['exam_schedule']['subject'],
                'subject_name': markData['exam_schedule']['subject_name'],
                'subject__subject_code': markData['exam_schedule']['subject_code'],
                'subject__codename':markData['exam_schedule']['codename'],
                'subject_part_type': markData['exam_schedule']['subject_part_type'],
                'subject_part_type_code_name': markData['exam_schedule']['subject_part_type_code_name'],
                'subject_part_type_id': markData['exam_schedule']['subject_part_type_id'],
                'attendance_status': markData['attendance_status'], 'min_marks': markData['exam_schedule']['min_marks'],
                'max_marks': markData['exam_schedule']['max_marks'], 'result': 'pass', 'total_max_marks': total_marks,
                'total_min_marks': total_min_marks, 'cumulative_marks_data': [],
                'cumulative_data': [], 'is_marks': markData['is_marks'], 'grade' : markData['grade'],'grade_plan' :markData['exam_schedule']['grade_plan']
                }
        if markData['exam_schedule']['id'] in student_cumulative_data_mapping and markData['student'] in student_cumulative_data_mapping[markData['exam_schedule']['id']]:
            temp['cumulative_marks_data'] = student_cumulative_data_mapping[markData['exam_schedule']['id']][markData['student']]
            for cum_data in temp['cumulative_marks_data']:
                obtained_marks += cum_data['marks'] if cum_data['marks'] else 0
        if temp['attendance_status'] == 'Absent' or (temp['min_marks'] and not temp['marks']) or (temp['marks'] and temp['marks'] < temp['min_marks']):
            temp['result'] = 'fail'
        if markData['student'] in studentBasedData:
            studentBasedData[markData['student']]['obtained_marks'] += obtained_marks
            if temp['result'] == 'fail':
                studentBasedData[markData['student']]['total_result'] = 'fail'
            if temp['attendance_status'] == 'Absent':
                studentBasedData[markData['student']]['total_result'] = 'fail'
            if temp['attendance_status'] == 'Present':
                studentBasedData[markData['student']]['total_marks'] += total_marks
                studentBasedData[markData['student']]['obtained_marks'] += temp['marks'] if temp['marks'] else 0
            temp['total_marks'] = total_marks
            studentBasedData[markData['student']]['subject_list'][temp['subject']] = temp
        else:
            obtained_marks += temp['marks'] if temp['marks'] else 0
            mainTemp = {'student_name': markData['full_name'], 'student': markData['student'],
                        'sts': markData['sts'], 'father_name':markData['father_name'],'mother_name':markData['mother_name'],
                        'caste_name':markData['caste_name'],
                        'mobile_num':markData['mobile_num'],'current_reg_num':markData['current_reg_num'],
                        'first_name': markData['first_name'], 'middle_name': markData['middle_name'],
                        'last_name': markData['last_name'],
                        'total_marks': total_marks,'dob':markData['dob'],
                        'obtained_marks': obtained_marks, 'total_result': temp['result'],
                        'subject_list': {temp['subject']: temp}, 'part_type_list': part_types,
                        'marked_attendance_days': markData['marked_attendance_days'],
                        'remark': markData['remark'],
                        'remark_name': markData['remark__name']
                        }
            mainTemp['profile_pic_file'] = markData['student_profile_pic_file'] if 'student_profile_pic_file' in markData and markData['student_profile_pic_file'] else None
            studentBasedData[markData['student']] = mainTemp
            enteredMarksStudentIds.append(markData['student'])
    studentList = []
    finalResultData = {}
    isAnnounced = False
    # OPTIMIZED: Use select_related
    finalResultData = StudentExamFinalResult.objects.filter(student__in=enteredMarksStudentIds, exam=examId).select_related(
        'student', 'exam'
    ).values(
        'student', 'status', 'is_announced','section_rank','standard_rank')
    finalResultData = {temp['student']: temp for temp in finalResultData}
    # enterd marks students list -> checking for students subject unentered marks of the student
    for studentD in studentBasedData:
        if studentD not in finalResultData and raiseErrorIfNotFinalized:
            raise ValidationError('Student marks are not yet finalized')
        if studentD in studentSubjectMapping:
            if 'subject_list' not in studentBasedData[studentD]:
                studentBasedData[studentD]['subject_list'] = {}
            studentBasedData[studentD]['obtained_marks'] = 0
            for subData in studentSubjectMapping[studentD]:
                if subData['subject'] not in studentBasedData[studentD]['subject_list']:
                    if 'total_marks' not in studentBasedData[studentD]:
                        studentBasedData[studentD]['total_marks'] = 0
                    if subjectList[subData['subject']]['is_marks']:
                        studentBasedData[studentD]['total_marks'] += subjectList[subData['subject']]['max_marks'] if subjectList[subData['subject']]['max_marks'] else 0
                    if subData['subject'] in subjectList and 'cumulative_data' in subjectList[subData['subject']]:
                        subData['cumulative_data'] = subjectList[subData['subject']]['cumulative_data']
                    studentBasedData[studentD]['subject_list'][subData['subject']] = subData
                    if 'cumulative_data' in subData:
                        for cum_config_data in subData['cumulative_data']:
                            if cum_config_data['exam_schedule'] in student_cumulative_data_mapping and studentD in student_cumulative_data_mapping[cum_config_data['exam_schedule']]:
                                if 'cumulative_marks_data' not in subData:
                                    studentBasedData[studentD]['subject_list'][subData['subject']]['cumulative_marks_data'] = []
                                subData['cumulative_marks_data'] += student_cumulative_data_mapping[cum_config_data['exam_schedule']][studentD]
                                for cum_data in temp['cumulative_marks_data']:
                                    studentBasedData[studentD]['obtained_marks'] += cum_data['marks'] if cum_data['marks'] else 0
        if not ignore_final_result_data and studentD in finalResultData: #ignore fetchin from final result data when we are syncing the result again
            studentBasedData[studentD]['total_result'] = finalResultData[studentD]['status']
            studentBasedData[studentD]['section_rank'] = finalResultData[studentD]['section_rank']
            studentBasedData[studentD]['standard_rank'] = finalResultData[studentD]['standard_rank']
            if finalResultData[studentD]['is_announced']:
                studentBasedData[studentD]['is_announced'] = True
                isAnnounced = True
        studentList.append((studentBasedData[studentD]))
        enteredMarksStudentIds.append(studentD)
    # unentered subject data for student
    for studentId in studentIdDict:
        #if finalized ignoring unentered marks
        if studentId in finalResultData:
            continue
        if studentId not in studentBasedData and studentId in studentSubjectMapping:
            if raiseErrorIfNotFinalized:  # raise error if unentered student list found
                # OPTIMIZED: Use cached student data from studentIdDict instead of querying
                if studentId in studentIdDict:
                    student_obj_data = studentIdDict[studentId]
                    name = get_full_name(
                        student_obj_data.get('first_name', ''),
                        student_obj_data.get('middle_name', ''),
                        student_obj_data.get('last_name', '')
                    )
                else:
                    # Fallback to query only if not in cache
                    student_obj = Student.objects.select_related().get(id=studentId)
                    name = get_full_name(student_obj.first_name, student_obj.middle_name, student_obj.last_name)
                raise ValidationError(f'{name} marks are not yet entered for the section')
            if 'subject_list' not in studentIdDict[studentId]:
                studentIdDict[studentId]['subject_list'] = {}
            for subData in studentSubjectMapping[studentId]:
                if subData['subject'] not in studentIdDict[studentId]['subject_list']:
                    if 'total_marks' not in studentIdDict[studentId]:
                        studentIdDict[studentId]['total_marks'] = 0
                    if subjectList[subData['subject']]['is_marks']:
                        studentIdDict[studentId]['total_marks'] += subjectList[subData['subject']]['max_marks'] if subjectList[subData['subject']]['max_marks'] else 0
                    if subData['subject'] in subjectList and 'cumulative_data' in subjectList[subData['subject']]:
                        subData['cumulative_data'] = subjectList[subData['subject']]['cumulative_data']
                    studentIdDict[studentId]['subject_list'][subData['subject']] = subData
            studentList.append(studentIdDict[studentId])
    grade_data_tracking_indiviual = {'grade_plan_obj': None, 'grade_data': None}
    grade_data_tracking_total = {'grade_plan_obj': None, 'grade_data': None}
    # update obtained marks for each subject
    # OPTIMIZED: Use select_related
    grade_exam_schedule_mapping = list(GradeExamScheduleMapping.objects.filter(
            standard_section=standard_sec_obj.id, exam=exam_obj.id
        ).select_related('grade_plan', 'grade_plan_for_total').values(
        'max_no_of_days_attendance','grade_plan','grade_plan_for_total','attendance_from_date','attendance_to_date'
    ))
    
    # OPTIMIZED: Pre-fetch ALL grade data in bulk to eliminate N+1 queries
    all_grade_plan_ids_for_cache = set(grade_plan_ids)
    if grade_exam_schedule_mapping:
        if grade_exam_schedule_mapping[0].get('grade_plan'):
            all_grade_plan_ids_for_cache.add(grade_exam_schedule_mapping[0]['grade_plan'])
        if grade_exam_schedule_mapping[0].get('grade_plan_for_total'):
            all_grade_plan_ids_for_cache.add(grade_exam_schedule_mapping[0]['grade_plan_for_total'])
    
    # Bulk fetch all grades that might be needed
    all_grades_cache = {}
    if all_grade_plan_ids_for_cache:
        all_grades = Grade.objects.filter(grade_plan__in=all_grade_plan_ids_for_cache).select_related('grade_plan').values(
            'id', 'name', 'from_range', 'to_range', 'grade_plan_id', 'grade_plan__name', 'grade_plan__grade_type'
        )
        for grade in all_grades:
            key = (grade['grade_plan_id'], grade['name'])
            all_grades_cache[key] = grade
    
    # OPTIMIZED: Pre-fetch all final result grades in bulk
    all_finalized_grades = {}
    if enteredMarksStudentIds:
        finalized_grades_bulk = StudentExamFinalResult.objects.filter(
            student__in=enteredMarksStudentIds, exam=examId
        ).select_related('student', 'exam').values('student_id', 'exam_id', 'totalgrade')
        for fg in finalized_grades_bulk:
            all_finalized_grades[fg['student_id']] = fg.get('totalgrade', '')
    for idx, student_data in enumerate(studentList):
        part_one_subject_list = []
        part_two_subject_list = []
        is_present_in_all_subject = True
        studentList[idx]['part_type_data'] = {}
        studentList[idx]['part_type_data_code_wise'] = {}
        studentList[idx]['is_finalized'] = False
        studentList[idx]['cumulative_id_type_mapping'] = {}
        studentList[idx]['cumulative_id_type_mapping_total'] = []
        studentList[idx]['part_type_sequence'] = {}
        studentList[idx]['subject_names_part_wise']={}
        studentList[idx]['obtained_marks_list_part_wise']={}
        studentList[idx]['obtained_marks_list_part_wise_graph']={}
        studentList[idx]['obtained_grade_list_part_wise']={}
        if student_data['student'] in finalResultData:
            studentList[idx]['is_finalized'] = True
        #student_data['subject_list_data'] = sorted(student_data['subject_list'].values(), key=lambda v: (isinstance(v.get('subject__subject_code', "NA"), str), v.get('subject__subject_code', "NA"))) #used for printing marks card
        student_data['subject_list_data'] = sorted(
        student_data['subject_list'].values(),
            key=lambda v: (
                0, int(v['subject__subject_code'])  # Numeric codes
            ) if v.get('subject__subject_code') and str(v['subject__subject_code']).isdigit() else (
                1, str(v.get('subject__subject_code') or '')  # Non-numeric or None
            )
        )
        for subject_data in student_data['subject_list_data']:
            if subject_data['subject_part_type_code_name'] not in studentList[idx]['part_type_sequence']:
                studentList[idx]['part_type_sequence'][subject_data['subject_part_type_code_name']] = {'sequence': 0}
            studentList[idx]['part_type_sequence'][subject_data['subject_part_type_code_name']]['sequence'] += 1
            subject_data['sequence'] = studentList[idx]['part_type_sequence'][subject_data['subject_part_type_code_name']]['sequence']
            if subject_data['subject_part_type_code_name'] == 'part1':
                part_one_subject_list.append(subject_data)
            elif subject_data['subject_part_type_code_name'] == 'part2':
                part_two_subject_list.append(subject_data)
            if subject_data['subject_part_type_code_name'] not in studentList[idx]['subject_names_part_wise']:
                studentList[idx]['subject_names_part_wise'][subject_data['subject_part_type_code_name']]=[]
            if subject_data['subject_part_type_code_name'] not in studentList[idx]['obtained_marks_list_part_wise']:
                studentList[idx]['obtained_marks_list_part_wise'][subject_data['subject_part_type_code_name']]=[]
                studentList[idx]['obtained_grade_list_part_wise'][subject_data['subject_part_type_code_name']]=[]
                studentList[idx]['obtained_marks_list_part_wise_graph'][subject_data['subject_part_type_code_name']]=[]
            studentList[idx]['subject_names_part_wise'][subject_data['subject_part_type_code_name']].append(subject_data['subject_name'])
            if 'marks' in subject_data and subject_data['marks']:
                studentList[idx]['obtained_marks_list_part_wise'][subject_data['subject_part_type_code_name']].append(subject_data['marks'])
                studentList[idx]['obtained_marks_list_part_wise_graph'][subject_data['subject_part_type_code_name']].append(subject_data['marks'])
            else:
                studentList[idx]['obtained_marks_list_part_wise'][subject_data['subject_part_type_code_name']].append(0)
                if 'grade_plan' in subject_data and subject_data['grade_plan'] and subject_data['grade']:
                    # OPTIMIZED: Use cached grade data instead of querying
                    grade_key = (subject_data['grade_plan'], subject_data['grade'])
                    grade_plans = all_grades_cache.get(grade_key)
                    if grade_plans:
                        studentList[idx]['obtained_marks_list_part_wise_graph'][subject_data['subject_part_type_code_name']].append(grade_plans['to_range'])
                    else:
                        studentList[idx]['obtained_marks_list_part_wise_graph'][subject_data['subject_part_type_code_name']].append(0)
                else:
                    studentList[idx]['obtained_marks_list_part_wise_graph'][subject_data['subject_part_type_code_name']].append(0)
            if "result" in subject_data and subject_data['result'] == "fail":
                student_data['total_result'] = "fail"
        student_data['subject_list_data_part1']=part_one_subject_list
        student_data['subject_list_data_part2']=part_two_subject_list
        student_data['student_admission_form'] = student_admission_form[student_data['student']]
        student_data['student_admission_form']['admission_num'] =  student_data['student_admission_form']['admission_num'].replace('/', '-')
        studentList[idx]['total_summary'] = {
            'total_result': student_data['total_result'] if 'total_result' in student_data else None,
            'section_rank':student_data['section_rank'] if 'section_rank' in student_data else None,
            'standard_rank':student_data['standard_rank'] if 'standard_rank' in student_data else None,
            'total_marks': 0,
            'total_obtained_marks': 0,
            'total_min_marks': 0,
            'percentage': 0
        }
        for subject_id in student_data['subject_list']:
            subject_data = student_data['subject_list'][subject_id]
            student_data['subject_list'][subject_id]['cumulative_id_mark_mapping'] = {}
            studentList[idx]['subject_list'][subject_id]['cumulative_data'] = subjectList[subject_id]['cumulative_data'] if 'cumulative_data' in subjectList[subject_id] else []
            studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] = 0
            studentList[idx]['subject_list'][subject_id]['grade'] = subject_data['grade'] if 'grade' in subject_data else ''
            if subject_data['subject_part_type'] not in studentList[idx]['part_type_data']:
                studentList[idx]['part_type_data'][subject_data['subject_part_type']] = {
                    'total_marks': 0,'total_min_marks':0,
                    'total_result': student_data['total_result'] if 'total_result' in student_data else None,
                    'total_obtained_marks': 0
                }
            if subject_data['subject_part_type_code_name'] not in studentList[idx]['part_type_data_code_wise']:
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']] = {
                    'total_written_marks': 0,
                    'total_result': student_data['total_result'] if 'total_result' in student_data else None,
                    'total_written_obtained_marks': 0,
                    'total_marks': 0,'total_obtained_marks': 0,
                    'total_cumulative_obtained_marks': 0,
                    'total_cumulative_max_marks': 0,
                    'total_written_min_marks':0,
                    'total_min_marks':0
                }
            studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] = 0
            if 'marks' in subject_data:
                studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] += subject_data['marks'] if subject_data['marks'] else 0
            if 'cumulative_data' in subject_data:
                for cumulative_row in subject_data['cumulative_data']:
                    col_name = []
                    for cumulative_type in cumulative_row['cumulative_type_data']:
                        col_name.append(cumulative_type['name'])
                    col_name = ','.join(col_name)
                    studentList[idx]['cumulative_id_type_mapping'][col_name] = {
                        'col_name': col_name
                    }
                    student_data['subject_list'][subject_id]['cumulative_id_mark_mapping'][col_name] = {
                        'marks': 0,  # default if not entered
                        'exam_cumulative__max_marks': cumulative_row['max_marks'],
                        'exam_cumulative__min_marks': cumulative_row['min_marks'],
                        'cumulative_type_data': cumulative_row['cumulative_type_data'],
                    }
            if 'cumulative_marks_data' in subject_data:
                for cum_data in subject_data['cumulative_marks_data']:
                    col_name = []
                    for cumulative_type in cum_data['cumulative_data_mapping']:
                        col_name.append(cumulative_type['cumulative_type_name'])
                    col_name = ','.join(col_name)
                    student_data['subject_list'][subject_id]['cumulative_id_mark_mapping'][col_name] = cum_data
                    studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] += cum_data['marks']
            studentList[idx]['subject_list'][subject_id]['cumulative_mark_data_for_marks_card'] = [] #Indexing is imp
            if 'attendance_status' in subject_data and subject_data['attendance_status'] != 'Present':
                is_present_in_all_subject = False
            studentList[idx]['subject_list'][subject_id] = subject_data
            if 'total_obtained_marks' in subject_data and 'total_max_marks' in subject_data:
                if studentList[idx]['subject_list'][subject_id]['is_marks']:
                    studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_obtained_marks'] += subject_data['total_obtained_marks']
                    studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_marks'] += subject_data['total_max_marks']
                    studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_min_marks'] += subject_data['total_min_marks']
                    extra_params = {}
                    extra_params.update(grade_data_tracking_indiviual)
                    extra_params.update(form_definition_tracking)
                    is_fail = True if subject_data['result'] == "fail" else False
                    temp_grade_data = get_student_grade([subject_data],examId, standardSectionId, 'total_obtained_marks', 'total_max_marks', False, extra_params, is_fail)
                    grade_data = temp_grade_data['marksData']
                    grade_data_tracking_indiviual['grade_data'] = temp_grade_data['grade_data']
                    grade_data_tracking_indiviual['grade_plan_obj'] = temp_grade_data['grade_plan_obj']
                    studentList[idx]['subject_list'][subject_id]['grade'] = grade_data[0]['grade']
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_obtained_marks'] = studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_obtained_marks']
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_obtained_marks_in_word'] = num2words(studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_obtained_marks'], lang='en')
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_marks'] = studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_marks']
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_min_marks'] = studentList[idx]['part_type_data'][subject_data['subject_part_type']]['total_min_marks']
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_written_obtained_marks'] += 0 if not studentList[idx]['subject_list'][subject_id]['marks'] else studentList[idx]['subject_list'][subject_id]['marks']
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_written_marks'] += studentList[idx]['subject_list'][subject_id]['max_marks'] if studentList[idx]['subject_list'][subject_id]['max_marks'] else 0
                studentList[idx]['part_type_data_code_wise'][subject_data['subject_part_type_code_name']]['total_written_min_marks'] += studentList[idx]['subject_list'][subject_id]['min_marks'] if studentList[idx]['subject_list'][subject_id]['min_marks'] else 0

                student_data['total_summary']['total_marks'] += studentList[idx]['subject_list'][subject_id]['total_max_marks']
                student_data['total_summary']['total_min_marks'] += studentList[idx]['subject_list'][subject_id]['total_min_marks'] if studentList[idx]['subject_list'][subject_id]['total_min_marks'] else 0
                student_data['total_summary']['total_obtained_marks'] += studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] if studentList[idx]['subject_list'][subject_id]['total_obtained_marks'] else 0
                student_data['obtained_marks'] = student_data['total_summary']['total_obtained_marks']
        studentList[idx]['cumulative_id_type_mapping'] = studentList[idx]['cumulative_id_type_mapping'].values()
        for cumulative_row in studentList[idx]['cumulative_id_type_mapping']:
            for subject_id in student_data['subject_list']:
                mark = 0
                max_mark = 0
                subject_data = student_data['subject_list'][subject_id]
                if cumulative_row['col_name'] in subject_data['cumulative_id_mark_mapping']:
                    mark = subject_data['cumulative_id_mark_mapping'][cumulative_row['col_name']]['marks']
                    max_mark = subject_data['cumulative_id_mark_mapping'][cumulative_row['col_name']]['exam_cumulative__max_marks']
                studentList[idx]['subject_list'][subject_id]['cumulative_mark_data_for_marks_card'].append(
                    {
                        'mark': mark,
                        'max_mark' : max_mark
                    }
                )
        for index, cummulative_type in enumerate(studentList[idx]['cumulative_id_type_mapping']):
            total_mark = 0
            total_max_mark = 0
            for subject_id in studentList[idx]['subject_list']:
                subject_data = studentList[idx]['subject_list'][subject_id]
                if subject_data['subject_part_type_code_name'] =='part1': #for now only getting part1 total
                    try:
                        mark = subject_data['cumulative_mark_data_for_marks_card'][index]['mark']
                        max_mark = subject_data['cumulative_mark_data_for_marks_card'][index]['max_mark']
                    except:
                        mark = 0
                        max_mark=0
                    total_mark += mark
                    total_max_mark +=max_mark
            studentList[idx]['cumulative_id_type_mapping_total'].append({'total_obtained_mark': total_mark,'total_max_mark':total_max_mark})
        for subject_part_type_code_name in studentList[idx]['part_type_data_code_wise']:
            extra_params = {}
            extra_params.update(grade_data_tracking_total)
            extra_params.update(form_definition_tracking)
            temp_grade = get_student_grade([studentList[idx]['part_type_data_code_wise'][subject_part_type_code_name]],examId, standardSectionId, 'total_obtained_marks', 'total_marks', True, extra_params)
            # OPTIMIZED: Use cached finalized grade instead of querying
            finalized_grade_value = all_finalized_grades.get(studentList[idx]['student'], '')
            grade = temp_grade['marksData']
            grade_data_tracking_total['grade_data'] = temp_grade['grade_data']
            grade_data_tracking_total['grade_plan_obj'] = temp_grade['grade_plan_obj']
            studentList[idx]['part_type_data_code_wise'][subject_part_type_code_name]['grade'] = grade[0]['grade']
            studentList[idx]['part_type_data_code_wise'][subject_part_type_code_name]['percentage'] = grade[0]['percentage']
            if finalized_grade_value:
                studentList[idx]['part_type_data_code_wise'][subject_part_type_code_name]['dynamic_grade'] = finalized_grade_value
            if institute_objs.code == 'nandinividyanikethana' and self.request.GET.get('print_marks_card'):
                # Optimized: Add error handling for graph generation to prevent failures
                try:
                    if studentList[idx]['subject_names_part_wise'].get("part1") and studentList[idx]['obtained_marks_list_part_wise_graph'].get("part1"):
                        studentList[idx]['part1_graph'] = generate_chart(studentList[idx]['subject_names_part_wise']["part1"], studentList[idx]['obtained_marks_list_part_wise_graph']["part1"] ,'Scholastic', chart_type="bar", colors=None)
                except Exception as e:
                    studentList[idx]['part1_graph'] = None
                    print(f"Error generating part1_graph for student {studentList[idx].get('student')}: {str(e)}")
                
                try:
                    part2_values = studentList[idx]['obtained_marks_list_part_wise_graph'].get("parta", []) + studentList[idx]['obtained_marks_list_part_wise_graph'].get("partb", []) + studentList[idx]['obtained_marks_list_part_wise_graph'].get("partc", [])
                    if sum(part2_values):
                        part2_labels = studentList[idx]['subject_names_part_wise'].get("parta", []) + studentList[idx]['subject_names_part_wise'].get("partb", []) + studentList[idx]['subject_names_part_wise'].get("partc", [])
                        studentList[idx]['part2_graph'] = generate_chart(part2_labels, part2_values, 'Co-Scholastic', chart_type="pie", colors=None)
                    else:
                        studentList[idx]['part2_graph'] = None
                except Exception as e:
                    studentList[idx]['part2_graph'] = None
                    print(f"Error generating part2_graph for student {studentList[idx].get('student')}: {str(e)}")
                
                try:
                    if studentList[idx]['subject_names_part_wise'].get("char") and studentList[idx]['obtained_marks_list_part_wise_graph'].get("char"):
                        studentList[idx]['part3_graph'] = generate_chart(studentList[idx]['subject_names_part_wise']["char"], studentList[idx]['obtained_marks_list_part_wise_graph']["char"] ,'Personality And Character', chart_type="line", colors=None)
                    else:
                        studentList[idx]['part3_graph'] = None
                except Exception as e:
                    studentList[idx]['part3_graph'] = None
                    print(f"Error generating part3_graph for student {studentList[idx].get('student')}: {str(e)}")
        extra_params = {}
        extra_params.update(grade_data_tracking_total)
        extra_params.update(form_definition_tracking)
        is_fail = True if student_data.get('total_result') == 'fail' else False
        temp_grade = get_student_grade([student_data],examId, standardSectionId, 'obtained_marks', 'total_marks', True, extra_params, is_fail)
        grade_data = temp_grade['marksData']
        grade_data_tracking_total['grade_data'] = temp_grade['grade_data']
        grade_data_tracking_total['grade_plan_obj'] = temp_grade['grade_plan_obj']
        studentList[idx]['grade'] = grade_data[0]['grade']
        for part_type in student_data['part_type_data']:
            extra_params = {}
            extra_params.update(grade_data_tracking_total)
            extra_params.update(form_definition_tracking)
            temp_grade = get_student_grade([student_data['part_type_data'][part_type]],examId, standardSectionId, 'total_obtained_marks', 'total_marks', True, extra_params)
            grade_data = temp_grade['marksData']
            grade_data_tracking_total['grade_data'] = temp_grade['grade_data']
            grade_data_tracking_total['grade_plan_obj'] = temp_grade['grade_plan_obj']
            studentList[idx]['part_type_data'][part_type]['grade'] = grade_data[0]['grade']

        #always this line should be in last
        studentList[idx]['total_summary']['total_obtained_marks_in_word'] = num2words(studentList[idx]['total_summary']['total_obtained_marks'], lang='en')
        if studentList[idx]['total_summary']['total_obtained_marks']:
            studentList[idx]['total_summary']['percentage'] = (
                studentList[idx]['total_summary']['total_obtained_marks'] / studentList[idx]['total_summary']['total_marks']
            ) * 100
        else:
            studentList[idx]['total_summary']['percentage'] = 0
        marked_attendance_days = studentList[idx]['marked_attendance_days'] if 'marked_attendance_days' in studentList[idx] and studentList[idx]['marked_attendance_days'] else 0
        total_attendance = grade_exam_schedule_mapping[0]['max_no_of_days_attendance'] if len(grade_exam_schedule_mapping) > 0 and grade_exam_schedule_mapping[0]['max_no_of_days_attendance'] else 0
        studentList[idx]['marked_attendance_days_percentage'] = (marked_attendance_days / total_attendance)*100 if total_attendance else 0
    response['data']['student_list'] = sorted(studentList, key=lambda d: d['student_name'])
    response['data']['subject_list'] = sorted(
    subjectList.values(),
    key=lambda v: (
        0, int(v['subject__subject_code'])  # Numeric codes
    ) if v.get('subject__subject_code') and str(v['subject__subject_code']).isdigit() else (
        1, str(v.get('subject__subject_code') or '')  # Non-numeric or None
    ))
    response['data']['standard_name'] = standard_sec_obj.standard.name
    response['data']['section_name'] = standard_sec_obj.section.name
    response['data']['standard_section'] = standard_sec_obj.id
    response['data']['standard'] = standard_sec_obj.standard.id
    response['data']['is_announced'] = isAnnounced
    response['data']['approval_status'] = approval_data[0]['approval_status'] if approval_data else '0'
    response['data']['academic_year_details'] = {
            'start_date': exam_obj.academic_year.start_date,
            'end_date': exam_obj.academic_year.end_date,
        'academic_year': exam_obj.academic_year.id
    }
    response['data']['term_details'] = exam_obj.term.name
    response['data']['exam_details'] = exam_obj.exam_type.name
    response['data']['exam_code_name'] = exam_obj.exam_type.code
    response['data']['part_type_list'] = part_type_list
    if grade_exam_schedule_mapping:
        grade_plan_ids.add(grade_exam_schedule_mapping[0]['grade_plan'])
        grade_plan_ids.add(grade_exam_schedule_mapping[0]['grade_plan_for_total'])
        response['data']['max_no_of_days_attendance'] = grade_exam_schedule_mapping[0]['max_no_of_days_attendance'] if len(grade_exam_schedule_mapping) > 0 else None
        from_date_val = grade_exam_schedule_mapping[0]['attendance_from_date']
        to_date_val = grade_exam_schedule_mapping[0]['attendance_to_date']

        if isinstance(from_date_val, str) and from_date_val.lower() == "none":
          from_date_val = None
        if isinstance(to_date_val, str) and to_date_val.lower() == "none":
          to_date_val = None       
        response['data']['attendance_from_date'] = from_date_val
        response['data']['attendance_to_date'] = to_date_val
        # OPTIMIZED: Use select_related for grade_plan
        grade_data = Grade.objects.filter(grade_plan__in=grade_plan_ids).select_related(
            'grade_plan'
        ).values(
            'name', 'from_range', 'to_range', 'grade_plan',
            'grade_plan__name', 'grade_plan__grade_type'
        )
        response['data']['grade_type_data'] = {}
        for grade_row in grade_data:
            if grade_row['grade_plan'] not in response['data']['grade_type_data']:
                response['data']['grade_type_data'][grade_row['grade_plan']] = {
                    'grade_plan_name': grade_row['grade_plan__name'],
                    'grade_type': grade_row['grade_plan__grade_type'],
                    'grade_plan': grade_row['grade_plan'],
                    'grade_list': []
                }
            grade_data_temp={
                    'name': grade_row['name'], 'from_range': grade_row['from_range'],
                    'to_range': grade_row['to_range'], 'grade_plan': grade_row['grade_plan']
                }
            if grade_row['from_range'] and grade_row['to_range']:
                grade_data_temp['from_to_range'] = str(math.ceil(grade_row['to_range']))+'-'+str(math.ceil(grade_row['from_range']))
            else:
                grade_data_temp['from_to_range'] = ''
            response['data']['grade_type_data'][grade_row['grade_plan']]['grade_list'].append(grade_data_temp)
    else:
        response['data']['max_no_of_days_attendance'] = None
        response['data']['grade_type_data'] = {}
    try:
        response['data']['grade_plan_data_for_total'] = response['data']['grade_type_data'][grade_exam_schedule_mapping[0]['grade_plan_for_total']]['grade_list']
        response['data']['grade_plan_data_for_total'].sort(
        key=lambda x: x['to_range'] if x['to_range'] is not None else float('-inf'),
        reverse=True
        )
    except:
        response['data']['grade_plan_data_for_total'] = []
    response['institute_data'] = InstituteSerializer(Institute.get_institute(self)).data
    # Add version indicator for v2 API
    response['data']['api_version'] = 'v2'
    if self.request.GET.get('print_marks_card'):
        return print_marks_card(self, response)
    elif self.request.GET.get('print_consolidated_marks'):
        if response['institute_data']['code'] == 'sbvshr':
            if self.request.GET.get('print_consolidated_marks_new'):
                return download_consolidation_marks(self,response)
            return download_consolidation_marks_subject_wise(self,response)
        return download_consolidation_marks(self,response)
    return response
