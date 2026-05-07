from apps.classes.models.enrollment import Enrollment
from apps.classes.models.standard import StandardSectionMapping
from apps.exams.models.exam import Exam
from apps.exams.models.marks import StudentMark, StudentMarkSectionWiseApproval
from apps.exams.models.result import StudentExamFinalResult
from collections import defaultdict
import datetime
from rest_framework import exceptions

from apps.exams.services.mark import build_grade_mark_map, get_standard_section_subjects
from apps.institutes.models.academicYear import AcademicYear

def get_student_totals_for_section(exam_id, standard_section_id, valid_student_ids):
    grade_plan_map, fallback_plan_id, grade_value_map = build_grade_mark_map(exam_id, standard_section_id)

    marks = StudentMark.objects.filter(
        exam_schedule__exam_id=exam_id,
        is_active=True,
        student__in=valid_student_ids,
        student__enrollment__standard_section_id=standard_section_id
    ).select_related('exam_schedule', 'student')

    student_totals = defaultdict(float)
    for mark in marks:
        sid = mark.student_id
        if mark.marks is not None:
            student_totals[sid] += mark.marks
        elif mark.grade and mark.exam_schedule:
            subject_id = mark.exam_schedule.subject_id
            plan_id = grade_plan_map.get(subject_id) or fallback_plan_id
            avg = grade_value_map.get((mark.grade, plan_id), 0)
            student_totals[sid] += avg

    # Ensure all valid students are present (even if 0)
    return {sid: round(student_totals.get(sid, 0), 2) for sid in valid_student_ids}


def assign_continuous_ranks(student_totals):
    sorted_students = sorted(student_totals.items(), key=lambda x: x[1], reverse=True)
    return {sid: idx + 1 for idx, (sid, _) in enumerate(sorted_students)}


def sync_update_student_standard_and_section_rank(self, params):
    examId = int(Exam.objects.filter(is_active=True).last().id)
    if not examId:
        raise exceptions.ValidationError("please provide exam id ") #because sync should not affect old exam
    today_date = datetime.datetime.today()
    academic_year_id = AcademicYear.get_academic_year_for_date(self, today_date).id
    all_results = StudentExamFinalResult.objects.exclude(status='fail').filter(exam__academic_year=academic_year_id, exam=examId)
    StudentExamFinalResult.objects.filter(status='fail', exam__academic_year=academic_year_id, exam=examId).update(standard_rank=None, section_rank=None)

    # Build student_id → standard_section_id map
    enrollment_map = {
        e.student_id: e.standard_section_id
        for e in Enrollment.objects.filter(standard_section__academic_year=academic_year_id)
    }

    # Group by (exam_id, standard_section_id)
    grouped_data = defaultdict(set)
    for result in all_results:
        exam_id = result.exam_id
        student_id = result.student_id
        standard_section_id = enrollment_map.get(student_id)
        if standard_section_id:
            grouped_data[(exam_id, standard_section_id)].add(student_id)

    for (exam_id, section_id), student_ids in grouped_data.items():
        section = StandardSectionMapping.objects.get(id=section_id)
        academic_year_id = section.academic_year_id
        standard_id = section.standard_id

        # SECTION-WISE: Filter out 'fail' students again to be safe
        section_totals = get_student_totals_for_section(exam_id, section_id, student_ids)
        section_totals = {sid: total for sid, total in section_totals.items()
                          if StudentExamFinalResult.objects.filter(student_id=sid, exam_id=exam_id, status='fail').count() == 0}
        section_ranks = assign_continuous_ranks(section_totals)

        # STANDARD-WISE: Merge all section student totals except fail
        all_std_section_ids = StandardSectionMapping.objects.filter(
            standard_id=standard_id,
            academic_year_id=academic_year_id
        ).values_list('id', flat=True)

        all_std_student_ids = list(
            StudentExamFinalResult.objects.filter(
                exam_id=exam_id,
                student_id__in=enrollment_map.keys()
            ).exclude(status='fail').values_list('student_id', flat=True)
        )

        std_totals = {}
        for std_sec_id in all_std_section_ids:
            totals = get_student_totals_for_section(exam_id, std_sec_id, all_std_student_ids)
            for sid, marks in totals.items():
                if StudentExamFinalResult.objects.filter(student_id=sid, exam_id=exam_id, status='fail').count() == 0:
                    std_totals[sid] = std_totals.get(sid, 0) + marks

        standard_ranks = assign_continuous_ranks(std_totals)

        # SAVE RANKS
        for sid in student_ids:
            if sid not in section_ranks or sid not in standard_ranks:
                continue
            try:
                result = StudentExamFinalResult.objects.get(student_id=sid, exam_id=exam_id)
                result.section_rank = section_ranks[sid]
                result.standard_rank = standard_ranks[sid]
                result.save(update_fields=['section_rank', 'standard_rank'])
            except StudentExamFinalResult.DoesNotExist:
                continue

#this can affect all exams in the current academic year so be careful
def sync_update_proper_result_as_per_marks(self, params):
    today_date = datetime.datetime.today()
    academic_year_id = AcademicYear.get_academic_year_for_date(self, today_date).id
    today_date = datetime.datetime.today()
    approved_data = StudentMarkSectionWiseApproval.objects.filter(standard_section__academic_year=academic_year_id).values(
        'exam', 'standard_section'
    )
    academic_year_id = AcademicYear.get_academic_year_for_date(self, today_date).id
    resultData = []
    for approved in approved_data:
        examId =  approved['exam']
        responseData = get_standard_section_subjects(self, examId, approved['standard_section'],ignore_final_result_data=True)
        studentIds = [s['student'] for s in responseData['data']['student_list']]
        existingData = {s['student']: s for s in StudentExamFinalResult.objects.filter(student__in=studentIds, exam=examId).values('id', 'student')}
        for studentData in responseData['data']['student_list']:
            if studentData['student'] in existingData:
                proceed = True
                for subjectId in studentData['subject_list']:
                    subjectData = studentData['subject_list'][subjectId]
                    if 'attendance_status' not in subjectData:
                        temp = {'student': studentData['student'], 'subject': subjectData['subject'],
                                'student_name': studentData['student_name'], 'subject_name': subjectData['subject__name']}
                        proceed = False
                if proceed:
                    temp = {'status': studentData['total_result'], 'student': studentData['student'], 'exam': examId,
                                    'changed_user': self.request.user.id, 'id': existingData[studentData['student']]['id']}
                    resultData.append(temp)
    for result_row in resultData:
        obj = StudentExamFinalResult.objects.get(id=result_row['id'])
        obj.status = result_row['status']
        obj.save()