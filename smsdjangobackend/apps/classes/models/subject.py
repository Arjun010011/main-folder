from rest_framework import exceptions
from django.db import models
from django.core.exceptions import ValidationError

from .standard import Branch, StandardSectionMapping
from ...institutes.models import AcademicYear
from ...students.models import Student

class SubjectPartType(models.Model):
    name = models.CharField(max_length=100)
    code_name = models.CharField(max_length=100, null=True, blank=True)

class Subject(models.Model):
    name = models.CharField(max_length=255)
    subject_code = models.CharField(max_length=255,null=True, blank=True) #used for real time subject code
    codename = models.CharField(max_length=255, null=True, blank=True) #used to track language
    sequence = models.IntegerField(null=True, blank=True)
    is_language = models.BooleanField(default=False)
    subject_part_type = models.ForeignKey(SubjectPartType, related_name='subject_part_type', on_delete=models.CASCADE, default=1)
    is_active = models.BooleanField(default=True)

class AssignSubject(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, related_name='assigned_subjects', null=True,
                                         blank=True, on_delete=models.PROTECT)
    subject = models.ForeignKey(Subject, related_name='assignsubject', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class SubjectStudent(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='subject_student_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    subject = models.ForeignKey(Subject, related_name='subject_student', null=True, blank=True,
                                on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, related_name='student_subject', on_delete=models.CASCADE)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectBranchMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_branch_mapping_subject')
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, related_name='subject_branch_mapping_branch')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class CumulativeType(models.Model):
    name = models.CharField(max_length=255)
    alias = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class CourseOutcome(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ProgramOutcome(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ProgramSpecificOutcome(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ProgramEducationalObjectives(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectCourseOutcomeMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_mapping_subject')
    course_outcome = models.ForeignKey(CourseOutcome, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_mapping_course_outcome')
    description = models.CharField(max_length=255)
    target = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectProgramOutcomeMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_program_outcome_mapping_subject')
    program_outcome = models.ForeignKey(ProgramOutcome, on_delete=models.SET_NULL, null=True, related_name='subject_program_outcome_mapping_program_outcome')
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectProgramSpecificOutcomeMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_program_specific_outcome_mapping_subject')
    program_specific_outcome = models.ForeignKey(ProgramSpecificOutcome, on_delete=models.SET_NULL, null=True, related_name='subject_program_specific_outcome_mapping_program_specific_outcome')
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectProgramEducationalObjectives(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_program_educational_objectives_mapping_subject')
    program_educational_objectives = models.ForeignKey(ProgramEducationalObjectives, on_delete=models.SET_NULL, null=True, related_name='subject_program_educational_objectives_mapping_program_educational_objectives')
    description = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectCourseOutcomeProgramMappingMatrix(models.Model):
    subject_course_outcome = models.ForeignKey(SubjectCourseOutcomeMapping, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_program_mapping_matrix_subject_course_outcome')
    subject_program_outcome = models.ForeignKey(SubjectProgramOutcomeMapping, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_program_mapping_matrix_subject_program_outcome')
    value = models.IntegerField(default=0,null=True,blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectCourseOutcomeProgramSpecificOutcomeMappingMatrix(models.Model):
    subject_course_outcome = models.ForeignKey(SubjectCourseOutcomeMapping, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_program_specific_mapping_matrix_subject_course_outcome')
    subject_program_specific_outcome = models.ForeignKey(SubjectProgramSpecificOutcomeMapping, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_program_specific_mapping_matrix_subject_program_specific_outcome')
    value = models.IntegerField(default=0,null=True,blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectCourseOutcomeProgramEducationalObjectivesMappingMatrix(models.Model):
    subject_course_outcome = models.ForeignKey(SubjectCourseOutcomeMapping, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_subject_program_educational_objectives_matrix_subject_course_outcome')
    subject_program_educational_objectives = models.ForeignKey(SubjectProgramEducationalObjectives, on_delete=models.SET_NULL, null=True, related_name='subject_course_outcome_subject_program_educational_objectives_matrix_subject_subject_program_educational_objectives')
    value = models.IntegerField(default=0,null=True,blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class SubjectCategory(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255,null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if SubjectCategory.objects.filter(name=self.name).exists():
            raise exceptions.ValidationError('Duplicate Subject Category name exists')
        super().save(*args, **kwargs)

    def __str__(self):
        return '%s' % (self.name)

class SubjectDetails(models.Model):
    credit = models.FloatField(null=True,blank=True)
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_details_subject')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    subject_category = models.ForeignKey(SubjectCategory, on_delete=models.SET_NULL, null=True, related_name='subject_details_subject_category')

class SubjectTeachingHourMapping(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_teaching_hour_subject')
    teaching_type = models.IntegerField(default=0,null=True,blank=True) # 1-Thoery,2-Tutorial,3-Practical,4-Sale
    value = models.FloatField(null=True,blank=True)

class SubjectExamDetails(models.Model):
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_exam_details_subject')
    exam_type = models.IntegerField(default=0,null=True,blank=True) # 1-examconductionhour,2-ciemarks,3-seemarks,4-total_marks
    value = models.FloatField(null=True,blank=True)

class SubjectSubjectTypeMapping(models.Model):
    subject_type = models.IntegerField(default=0,null=True,blank=True) # 1-lab,2-elective
    subject = models.ForeignKey(Subject, on_delete=models.SET_NULL, null=True, related_name='subject_subject_type_subject')
    value = models.FloatField(null=True,blank=True)