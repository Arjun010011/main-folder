from django.db import models
import datetime
from rest_framework.exceptions import ValidationError

from apps.classes.models.standard import Standard
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.models import Document
from django.db.models import Q, F

from apps.shared.models.document import DocumentType

class StudentGroup(models.Model):
    name = models.CharField(max_length=255)
    code_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            if StudentGroup.objects.filter(
                name=self.name, is_active=self.is_active
            ).exclude(id=self.id):
                raise ValidationError("Duplicate Student Group")
        super(StudentGroup, self).save(*args, **kwargs)

# Ex: English and Kannada
class StudentMedium(models.Model):
    name = models.CharField(max_length=255)
    code_name = models.CharField(max_length=50)
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if self.is_active:
            if StudentMedium.objects.filter(
                name=self.name, is_active=self.is_active
            ).exclude(id=self.id):
                raise ValidationError("Duplicate Student Medium")
        super(StudentMedium, self).save(*args, **kwargs)

class Student(models.Model):
    Gender = (
        ('Boy', 'Boy'),
        ('Girl', 'Girl'),
        ('Other', 'Other'),
    )
    studentType = (
        ('Day Scholar', 'Day Scholar'),
        ('Residential', 'Residential'),
    )
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    profile_pic = models.OneToOneField(Document, related_name='student_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    gender = models.CharField(max_length=5, choices=Gender, blank=True, null=True)
    student_type = models.CharField(max_length=12, choices=studentType, default='Day Scholar')
    email = models.EmailField(blank=True, null=True)
    student_group = models.ForeignKey(StudentGroup, on_delete=models.SET_NULL, related_name='student_student_group', null=True, blank=True)
    student_medium = models.ForeignKey(StudentMedium, on_delete=models.SET_NULL, related_name='student_student_medium', null=True, blank=True)
    current_reg_num = models.CharField(max_length=255, blank=True, null=True)
    sts = models.CharField(max_length=255, blank=True, null=True)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    current_standard = models.ForeignKey(Standard, on_delete=models.SET_NULL, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    rfid = models.CharField(max_length=250, null=True, blank=True)
    is_new_student = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    """
        When standardIds are passed we will be fetching standardsectionIds for that we get the data
        Passing only sectionIds wont work as expected
    """

    def get_student_for_standard(academicYearId, standardIds, standardSectionIds=[], values=[], customAnnotate={}):
        from apps.classes.models.enrollment import Enrollment  # imported here because of circular dependencies
        response = {}
        filter_query = {}
        if academicYearId and standardIds:
            filter_query['student__is_active'] = True
            filter_query['standard_section__standard__in'] = standardIds
            filter_query['standard_section__academic_year'] = academicYearId
        section_filter_query = {'standard_section__in': standardSectionIds, 'student__is_active': True}
        enrollment_data = Enrollment.objects.order_by().filter(Q(**filter_query) | Q(**section_filter_query)).values(
                'student', 'standard_section', 'standard_section__section__name', 'standard_section__standard__name',
                'standard_section__standard'
        ).distinct()
        student_ids = set()
        student_standard_section_mapping = {}
        for row_data in enrollment_data:
            student_ids.add(row_data['student'])
            student_standard_section_mapping[row_data['student']] = row_data
        response = Student.objects.filter(
            id__in=list(student_ids)).annotate(**customAnnotate).values(*values)
        for stud in response:
            if 'id' in stud and stud['id'] in student_standard_section_mapping:
                stud.update(student_standard_section_mapping[stud['id']])
        return response

    def get_student_data(ids, customValues=[], customAnnotate={}):
        return Student.objects.filter(id__in=ids).annotate(**customAnnotate).values(*customValues)

class StudentDocumentMapping(models.Model):
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_document_mapping_document')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_document_mapping_student')
    document_type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='student_document_mapping_document_type')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

"""
    1 -> null 
    2 -> 1 - sister
    3 -> 2 - brother
"""

class StudentSiblingMapping(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_sibling_mapping_student')
    student_parent_tree = models.ForeignKey(Student, null=True, on_delete=models.CASCADE, related_name='student_sibling_mapping_student_parent_tree')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def get_parent_data(self, student_sibling_data, student_id, parent_list=[]):
        if student_id in student_sibling_data and student_sibling_data[student_id]['student_parent_tree_id']:
            parent_list.append(student_sibling_data[student_id])
            self.get_parent_data(student_sibling_data, student_sibling_data[student_id]['student_parent_tree_id'], parent_list)
        elif student_id in student_sibling_data:
            parent_list.append(student_sibling_data[student_id])
        return list(reversed(parent_list))

    def get_child_data(self, child_tracking_sib, student_id, child_list=[]):
        if student_id in child_tracking_sib and  child_tracking_sib[student_id]['child_student_id']:
            child_list.append(child_tracking_sib[student_id])
            self.get_child_data(child_tracking_sib, child_tracking_sib[student_id]['child_student_id'], child_list)
        elif student_id in child_tracking_sib:
            child_list.append(child_tracking_sib[student_id])
        return child_list

    def update_elder_younger_data(self, student_id, sibling_list):
        from apps.classes.models.enrollment import Enrollment 
        is_student_found = False #to find elder or younger
        student_ids = []
        student_obj = Student.objects.get(id=student_id)
        for sibling in sibling_list:
            sibling['relation_ship_for_me'] = ''
            if sibling['student_id'] == student_id:
                is_student_found = True
            elif student_obj.dob == sibling['student__dob']:
                sibling['relation_ship_for_me'] = 'twins'
            elif is_student_found:
                relation_ship_type = 'youngerbrother' if sibling['student__gender'] == 'Boy' else 'youngersister'
                sibling['relation_ship_for_me'] = relation_ship_type
            else:
                relation_ship_type = 'elderbrother' if sibling['student__gender'] == 'Boy' else 'eldersister'
                sibling['relation_ship_for_me'] = relation_ship_type
            student_ids.append(sibling['student_id'])
        today_date = datetime.datetime.today()
        try:
            academic_year = AcademicYear.get_academic_year_for_date(self, today_date).id
            enrollment_data = {e['student']: e for e in Enrollment.objects.filter(student__in=student_ids, standard_section__academic_year=academic_year).values(
                'standard_section', 'standard_section__section__name', 'standard_section__standard__name', 'student',
                'standard_section__standard'
            )}
            for sibling in sibling_list:
                sibling['section'] = ''
                sibling['section_name'] = ''
                sibling['standard'] = sibling['student__current_standard']
                sibling['standard_name'] = sibling['student__current_standard__name']
                if sibling['student_id'] in enrollment_data:
                    sibling['section'] = enrollment_data[sibling['student_id']]['standard_section']
                    sibling['section_name'] = enrollment_data[sibling['student_id']]['standard_section__section__name']
                    sibling['standard'] = enrollment_data[sibling['student_id']]['standard_section__standard']
                    sibling['standard_name'] = enrollment_data[sibling['student_id']]['standard_section__standard__name']
        except:
            pass
        return sibling_list

    """
        Eg: 1-> null
            2 -> 1
            3 -> 2
    """
    def get_student_sibling_data(self, student_ids):
        return_data = {}
        #{1: null, 2 : {student:'', student_parent: 1}}
        student_parent_track_sibling_data = {s['student_id']: s for s in StudentSiblingMapping.objects.all().values(
            'student__first_name', 'student__middle_name', 'student__last_name', 'student__dob', 'student__gender',
            'student_parent_tree__first_name', 'student_parent_tree__middle_name', 'student_parent_tree__last_name',
            'student_parent_tree__dob', 'student_parent_tree__gender', 'student_parent_tree_id', 'student_id',
            'student__current_standard', 'student__current_standard__name',
            'id', user_id=F('student__user_student__id')
        )}
        #{1 : {student:'', child_data: 2}}
        student_child_track_sibling_data = {}
        for student in student_parent_track_sibling_data:
            if student_parent_track_sibling_data[student]['student_parent_tree_id']:
                student_parent_track_sibling_data[student]['child_student_id'] = student
                student_child_track_sibling_data[student_parent_track_sibling_data[student]['student_parent_tree_id']] = student_parent_track_sibling_data[student]
        for student in student_ids:
            parent_data = []
            child_data = []
            if student_parent_track_sibling_data:
                parent_data = self.get_parent_data(student_parent_track_sibling_data, student, [])
            if student_child_track_sibling_data:
                child_data = self.get_child_data(student_child_track_sibling_data, student, [])
            sibling_list = parent_data + child_data #always ordered from elder to younger
            self.update_elder_younger_data(student, sibling_list)
            return_data[student] = {'sibling_list': sibling_list}
        return return_data



class StudentIdCardUpdate(models.Model):
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='student_id_card_update_academic_year')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='student_id_card_update_student')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    admission_no = models.CharField(max_length=255, blank=True, null=True)
    blood_group = models.CharField(max_length=255, blank=True, null=True)
    student_class= models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    father_name = models.CharField(max_length=255, blank=True, null=True)
    mobile= models.CharField(max_length=255, blank=True, null=True)
    name = models.CharField(max_length=255, blank=True, null=True)
    roll_no = models.CharField(max_length=255, blank=True, null=True)
    image = models.OneToOneField(Document, related_name='student_id_card_update_image', blank=True, null=True,
    on_delete=models.SET_NULL)
    processed_image = models.OneToOneField(Document, related_name='student_id_card_update_processed_image', blank=True, null=True,
    on_delete=models.SET_NULL)
    group_name = models.CharField(max_length=255, blank=True, null=True,default='Ungrouped')
    status = models.CharField(max_length=255, blank=True, null=True,default='Photos Taken')
    print_count=models.IntegerField(default=0)



class IdCardUpdate(models.Model):


    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='id_card_update_academic_year'
    )

    status = models.CharField(
        max_length=255,
        blank=True,
        null=True
    )
    group_name = models.CharField(max_length=255, blank=True, null=True)

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if self.status:
            exists = IdCardUpdate.objects.filter(
                academic_year=self.academic_year,
                status=self.status
            ).exclude(id=self.id).exists()


        super().save(*args, **kwargs)