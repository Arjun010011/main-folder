from rest_framework import exceptions
from django.db import models
from django.core.exceptions import ValidationError

from apps.institutes.models.academicYear import AcademicYear
from apps.institutes.models.institute import Institute
from apps.shared.models.address import MapAddress
from apps.shared.models.document import DocumentType

class Board(models.Model):
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=255)
    
    def __str__(self):
        return '%s' % (self.name)


class Branch(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    def save(self, *args, **kwargs):
        if Branch.objects.filter(name=self.name).exists():
            raise exceptions.ValidationError('Duplicate branch name exists')
        super().save(*args, **kwargs)

    def __str__(self):
        return '%s' % (self.name)

class StandardYearName(models.Model): # 1 year BSC in standardyearname table and in standard table its 1 sem bsc
    name = models.CharField(max_length=255)

"""post migration written in standard service"""
class Standard(models.Model):
    name = models.CharField(max_length=255)
    codename = models.CharField(max_length=255)
    dise_code = models.CharField(max_length=255, null=True, blank=True)
    course = models.CharField(max_length=255, null=True, blank=True) #used to promote student from one course to other when sequence are similar
    sequence = models.IntegerField()
    branch = models.ForeignKey(Branch, on_delete=models.SET_NULL, null=True, blank=True, related_name='standard_branch')
    board = models.ForeignKey(Board, on_delete=models.SET_NULL, null=True, blank=True, related_name='standard_board')
    is_active = models.BooleanField(default=True)
    course_period = models.IntegerField(null=True)
    standardyearname = models.ForeignKey(StandardYearName, on_delete=models.SET_NULL, null=True, blank=True, related_name='standard_standardyearname')
    # standard_id_according_to_sats = models.CharField(max_length=255, null=True, blank=True, help_text="SATS Portal Standard ID")
    # sats_medium = models.CharField(max_length=255, null=True, blank=True, help_text="Medium of instruction (e.g., English, Kannada)")

    def save(self, *args, **kwargs):
        if Standard.objects.filter(
            sequence=self.sequence, branch=self.branch, board=self.board, course=self.course
        ).exclude(id=self.id):
            raise ValidationError("Duplicate course value found ['sequence', 'branch' , 'board', 'course]")
        super(Standard, self).save(*args, **kwargs)

    def __str__(self):
        return '%s' % (self.name)

class Section(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)


class StandardSectionMapping(models.Model):
    academic_year = models.ForeignKey(AcademicYear, related_name='standard_section', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='present_standard', on_delete=models.CASCADE)
    section = models.ForeignKey(Section, related_name='section', on_delete=models.CASCADE)
    strength = models.IntegerField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s - (%s)' % (self.standard.name,self.section.name)


class InstituteAdresses(models.Model):
    institute = models.ForeignKey(
        Institute, null=True, blank=True, on_delete=models.SET_NULL, related_name='institute_address_instiute'
    )
    map = models.OneToOneField(
        MapAddress, null=True, blank=True, on_delete=models.SET_NULL, related_name='map_address_data'
    )
    standard = models.ManyToManyField(Standard, blank=True, related_name='institute_address_standard')
    default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
 
class DocumentTypeStandardMapping(models.Model):
    document_type = models.ForeignKey(DocumentType, on_delete=models.CASCADE, related_name='document_type_standard_mapping_document_type')
    academic_year = models.ForeignKey(AcademicYear, related_name='document_type_standard_mapping_academic_year',null=True, blank=True, on_delete=models.SET_NULL)
    standard = models.ForeignKey(Standard, related_name='document_type_standard_mapping_standard', on_delete=models.CASCADE)
