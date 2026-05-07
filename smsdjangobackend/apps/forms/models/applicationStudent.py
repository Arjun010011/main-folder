from datetime import datetime

from django.db import models
from django.db.models import JSONField

from apps.classes.models.standard import Standard
from apps.forms.models.enquiryStudent import EnquiryStudent
from apps.institutes.models import AcademicYear
from apps.shared.models.document import Document, DocumentType
from apps.shared.models.caste import Nationality, Religion, Category, Caste
from apps.shared.models.address import (
    Country, State, District, City, MapAddress
)
from apps.students.models.student import Student

class ApplicationStudent(models.Model):
    Gender = (
        ('Boy', 'Boy'),
        ('Girl', 'Girl'),
        ('Other', 'Other'),
    )
    studentType = (
        ('Day Scholar', 'Day Scholar'),
        ('Residential', 'Residential'),
    )
    profile_pic = models.OneToOneField(Document, related_name='application_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    application_date = models.DateField(default=datetime.now)
    application_num = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True)
    gender = models.CharField(
        max_length=5, choices=Gender, blank=True, null=True)
    student_type = models.CharField(
        max_length=12, choices=studentType, blank=True, null=True, default='Day Scholar')
    email = models.EmailField(blank=True, null=True)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    current_standard = models.ForeignKey(
        Standard, on_delete=models.SET_NULL, null=True, blank=True)
    enquiry = models.OneToOneField(
        EnquiryStudent, null=True, blank=True, on_delete=models.SET_NULL)
    entry_academic_year = models.ForeignKey(AcademicYear, on_delete=models.SET_NULL, null=True, related_name='entry_year_application', blank=True,
                                            )
    is_active = models.BooleanField(default=True)
    is_approved = models.BooleanField(default=True)
    approved_by = models.ForeignKey(
        'users.User', related_name='application_student_approved_by', on_delete=models.SET_NULL, blank=True, null=True)

    student = models.ForeignKey(Student, related_name='application_student_student', null=True, blank=True,
                                    on_delete=models.SET_NULL) #when we collect application form for existing student from student table
    user = models.ForeignKey('users.User', related_name='application_student_user', null=True, blank=True,
                             on_delete=models.SET_NULL) # User who submitted the application (from OTP login)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class ApplicationStudentDetails(models.Model):
    BloodGroup = (
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
    )
    application_student = models.OneToOneField(ApplicationStudent, related_name='student_details',
                                               on_delete=models.CASCADE)
    blood_group = models.CharField(
        max_length=3, choices=BloodGroup, blank=True, null=True)
    aadhar_num = models.CharField(max_length=255, blank=True, null=True)
    mother_tongue = models.CharField(max_length=255, blank=True, null=True)
    eid_num = models.CharField(max_length=255, blank=True, null=True)
    place_of_birth = models.CharField(max_length=255, blank=True, null=True)
    physically_handicaped = models.BooleanField(default=False, null=True)
    handicap_reason = models.CharField(max_length=255, blank=True, null=True)
    medical_details = JSONField(null=True)
    previous_school_details = JSONField(null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    is_bpl = models.BooleanField(default=False, null=True)
    bpl_num = models.CharField(max_length=255, blank=True, null=True)
    bpl_issue_authority = models.CharField(
        max_length=255, blank=True, null=True)
    bpl_issue_date = models.DateField(blank=True, null=True)
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_num = models.CharField(max_length=255, null=True, blank=True)
    ifsc = models.CharField(max_length=255, null=True, blank=True)
    nationality = models.ForeignKey(Nationality, related_name='application_nationality', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    religion = models.ForeignKey(Religion, related_name='application_religion', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    category = models.ForeignKey(Category, related_name='application_category', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    caste = models.ForeignKey(Caste, related_name='application_caste',
                              null=True, blank=True, on_delete=models.SET_NULL)


class ApplicationStudentAddress(models.Model):
    address_type = (
        ('CP', 'CurrentPermanent'),
        ('C', 'Current'),
        ('P', 'Permanent'),
    )
    type = models.CharField(max_length=2, choices=address_type)
    address = models.CharField(max_length=255, blank=True)
    country = models.ForeignKey(
        Country, null=True, blank=True, on_delete=models.SET_NULL)
    state = models.ForeignKey(
        State, null=True, blank=True, on_delete=models.SET_NULL)
    district = models.ForeignKey(
        District, null=True, blank=True, on_delete=models.SET_NULL)
    city = models.ForeignKey(
        City, null=True, blank=True, on_delete=models.SET_NULL)
    pincode = models.IntegerField(null=True)
    map_address = models.ForeignKey(MapAddress, null=True, blank=True, on_delete=models.SET_NULL)
    application_student = models.ForeignKey(ApplicationStudent, related_name='student_address',
                                            on_delete=models.CASCADE)


class ApplicationParentDetail(models.Model):
    father_name = models.CharField(max_length=255, blank=True, null=True)
    f_dob = models.DateField(blank=True, null=True)
    f_aadhar = models.CharField(max_length=255, blank=True, null=True)
    f_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    f_occupation = models.CharField(max_length=255, blank=True, null=True)
    f_office_address = models.CharField(max_length=255, blank=True, null=True)
    f_education = models.CharField(max_length=255, blank=True, null=True)
    f_pan = models.CharField(max_length=255, blank=True, null=True)
    f_tax_payee = models.BooleanField(default=False, null=True)
    f_email = models.EmailField(blank=True, null=True)
    mother_name = models.CharField(max_length=255, blank=True, null=True)
    m_dob = models.DateField(blank=True, null=True)
    m_aadhar = models.CharField(max_length=255, blank=True, null=True)
    m_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    m_occupation = models.CharField(max_length=255, blank=True, null=True)
    m_office_address = models.CharField(max_length=255, blank=True, null=True)
    m_education = models.CharField(max_length=255, blank=True, null=True)
    m_pan = models.CharField(max_length=255, blank=True, null=True)
    m_tax_payee = models.BooleanField(default=False, null=True)
    m_email = models.EmailField(blank=True, null=True)
    f_annual_income = models.FloatField(null=True)
    m_annual_income = models.FloatField(null=True)
    dependents = models.CharField(max_length=255, blank=True, null=True)


class ApplicationGuardianDetail(models.Model):
    guardian_name = models.CharField(max_length=255, blank=True, null=True)
    g_dob = models.DateField(blank=True, null=True)
    g_aadhar = models.CharField(max_length=255, blank=True, null=True)
    g_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    g_occupation = models.CharField(max_length=255, blank=True, null=True)
    g_office_address = models.CharField(max_length=255, blank=True, null=True)
    g_education = models.CharField(max_length=255, blank=True, null=True)
    g_pan = models.CharField(max_length=255, blank=True, null=True)
    g_tax_payee = models.BooleanField(default=False, null=True)
    g_email = models.EmailField(blank=True, null=True)
    g_annual_income = models.FloatField(null=True)


class ApplicationStudentParentMapping(models.Model):
    application_student = models.OneToOneField(ApplicationStudent, related_name='student_parent',
                                               on_delete=models.CASCADE)
    application_parent = models.ForeignKey(
        ApplicationParentDetail, null=True, blank=True, on_delete=models.SET_NULL)
    application_guardian = models.ForeignKey(ApplicationGuardianDetail, null=True,
                                             blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ApplicationStudentDocumentMapping(models.Model):
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='application_student_document_mapping_document')
    student = models.ForeignKey(ApplicationStudent, on_delete=models.CASCADE, related_name='application_student_document_mapping_student')
    document_type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='application_student_document_mapping_document_type')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class ApplicationUserProfile(models.Model):
    """
    Profile for application form users (created via OTP login)
    """
    user = models.OneToOneField('users.User', related_name='application_profile', on_delete=models.CASCADE)
    mobile_num = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'forms_applicationuserprofile'