from django.db import models
from django.db.models import Count, Q

from .standard import StandardSectionMapping, Standard
from apps.students.models.student import Student, StudentGroup
from apps.institutes.models import AcademicYear


class Enrollment(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='enrollments', null=True,
                                         blank=True, on_delete=models.PROTECT)
    student = models.ForeignKey(Student, on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    """ Returns Standard Id """

    def get_student_standard_for_academic(self, academicYearId, studentId, returnStandardSection=False):
        standard = Enrollment.objects.filter(student=studentId, standard_section__academic_year=academicYearId).values(
            'standard_section__standard', 'standard_section', 'standard_section__standard__name', 'standard_section__section__name')
        if len(standard) > 0 and returnStandardSection:
            return standard[0]
        elif len(standard) > 0:
            return standard[0]['standard_section__standard']
        else:
            return 0


class StudentStandardMapping(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='student_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='student_standard', on_delete=models.CASCADE)
    student = models.ForeignKey(Student, related_name='standard_student', on_delete=models.CASCADE)
    reg_num = models.CharField(max_length=255, blank=True, null=True)
    is_new_student = models.BooleanField(default=False)
    student_group = models.ForeignKey(StudentGroup, related_name='standard_standard_mapping_student_group',on_delete=models.CASCADE,null=True,blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_student_standard_for_academic_year(self, academicYearId, studentId):
        standard_ids = list(StandardSectionMapping.objects.filter(academic_year=academicYearId).values_list('standard', flat=True))
        standard = StudentStandardMapping.objects.filter(student=studentId, academic_year=academicYearId, standard__in=standard_ids).values(
            'standard', 'standard__name')
        if len(standard) > 0:
            return standard[0]
        else:
            return 0
    
    @classmethod
    def get_student_last_standard(self, student_id):
        last_mapping = (
            StudentStandardMapping.objects
            .filter(student_id=student_id)
            .select_related('standard', 'academic_year')
            .order_by('-academic_year__start_date')  # latest academic year first
            .first()
        )

        if last_mapping:
            return {
                "standard_id": last_mapping.standard.id,
                "standard_name": last_mapping.standard.name,
                "academic_year": f"{last_mapping.academic_year.start_date} - {last_mapping.academic_year.end_date}"
            }
        return None
        

    @classmethod
    def get_gender_wise_student_count(cls, academic_year_id=None, section_wise=False):
        """
        Returns standard-wise or standard-section-wise student gender summary.
        Filters only active students.
        """
        if section_wise:
            filters = {"student__is_active": True}
            if academic_year_id:
                filters["standard_section__academic_year_id"] = academic_year_id

            values_fields = ["standard_section__standard_id", "standard_section__standard__name",
                            "standard_section__section_id", "standard_section__section__name"]

            result = (
                Enrollment.objects
                .filter(**filters)
                .values(*values_fields)
                .annotate(
                    boys=Count("student", filter=Q(student__gender="Boy"), distinct=True),
                    girls=Count("student", filter=Q(student__gender="Girl"), distinct=True),
                    others=Count("student", filter=Q(student__gender="Other"), distinct=True),
                    total=Count("student", distinct=True)
                )
                .order_by("standard_section__standard__sequence", "standard_section__section__name")
            )

        else:
            filters = {"student__is_active": True}
            if academic_year_id:
                filters["academic_year_id"] = academic_year_id

            result = (
                StudentStandardMapping.objects
                .filter(**filters)
                .values("standard_id", "standard__name")
                .annotate(
                    boys=Count("student", filter=Q(student__gender="Boy"), distinct=True),
                    girls=Count("student", filter=Q(student__gender="Girl"), distinct=True),
                    others=Count("student", filter=Q(student__gender="Other"), distinct=True),
                    total=Count("student", distinct=True)
                )
                .order_by("standard__sequence")
            )

        return list(result)

class StudentTcIssuedTrack(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='student_tc_issued_track_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL) #academic can be null when we dont have the old academic year for the school setup
    issued_for_standard = models.ForeignKey(Standard, related_name='student_tc_issued_track_current_standard', on_delete=models.CASCADE)
    student = models.ForeignKey(Student, related_name='student_tc_issued_track_student', on_delete=models.CASCADE)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)