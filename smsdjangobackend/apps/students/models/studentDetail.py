from django.db import models
from django.db.models import JSONField

from apps.forms.models import ApplicationStudent
from apps.institutes.models import AcademicYear
from .student import Student
from apps.shared.models import Document
from apps.shared.models.address import Country, State, District, City, MapAddress
from ...shared.models.caste import Nationality, Religion, Category, Caste

class PreviousSchoolDetails(models.Model):
    pre_school_name = models.CharField(max_length=255, blank=True, null=True)
    pre_left_standard = models.CharField(max_length=255, blank=True, null=True)
    pre_school_address = models.CharField(max_length=255, blank=True, null=True)
    pre_tc_issued_date = models.DateField(blank=True, null=True)
    pre_school_tc_number = models.CharField(max_length=255, blank=True, null=True)
    pre_register_number = models.CharField(max_length=255, blank=True, null=True)
    pre_working_experiance = models.CharField(max_length=255, blank=True, null=True)
    pre_working_joining_date = models.DateField(blank=True, null=True)
    pre_working_date_of_leaving = models.DateField(blank=True, null=True)
    pre_total_marks = models.CharField(max_length=255, blank=True, null=True)
    pre_secured_marks = models.CharField(max_length=255, blank=True, null=True)
    extra_activities = models.CharField(max_length=255,blank=True,null=True)
    pre_school_date_of_joining = models.DateField(blank=True, null=True)
    pre_school_left_date = models.DateField(blank=True, null=True)

class StudentDetails(models.Model):
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
    entry_academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL)
    student = models.OneToOneField(Student, related_name='student_details', on_delete=models.CASCADE)
    blood_group = models.CharField(max_length=3, choices=BloodGroup, blank=True, null=True)
    aadhar_num = models.CharField(max_length=255, blank=True, null=True)
    mother_tongue = models.CharField(max_length=255, blank=True, null=True)
    eid_num = models.CharField(max_length=255, blank=True, null=True)
    place_of_birth = models.CharField(max_length=255, blank=True, null=True)
    physically_handicaped = models.BooleanField(default=False, null=True)
    handicap_reason = models.CharField(max_length=255, blank=True, null=True)
    medical_details = JSONField(null=True)
    previous_school_details = JSONField(null=True) #marks details
    previous_school_details_new =models.ForeignKey(PreviousSchoolDetails,null=True,blank=True,on_delete=models.SET_NULL)
    application = models.OneToOneField(ApplicationStudent, null=True, blank=True, on_delete=models.SET_NULL)
    is_bpl = models.BooleanField(default=False, null=True)
    bpl_num = models.CharField(max_length=255, blank=True, null=True)
    bpl_issue_authority = models.CharField(max_length=255, blank=True, null=True)
    bpl_issue_date = models.DateField(blank=True, null=True)
    nationality = models.ForeignKey(Nationality, related_name='student_nationality', null=True, blank=True,
                                    on_delete=models.SET_NULL)
    religion = models.ForeignKey(Religion, related_name='student_religion', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    category = models.ForeignKey(Category, related_name='student_category', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    caste = models.ForeignKey(Caste, related_name='student_caste', null=True, blank=True, on_delete=models.SET_NULL)
    bank_name = models.CharField(max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_num = models.CharField(max_length=255, null=True, blank=True)
    ifsc = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StudentAddress(models.Model):
    address_type = (
        ('CP', 'CurrentPermanent'),
        ('C', 'Current'),
        ('P', 'Permanent'),
    )
    type = models.CharField(max_length=2, choices=address_type)
    address = models.CharField(max_length=255, blank=True, null=True)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL)
    state = models.ForeignKey(State, null=True, blank=True, on_delete=models.SET_NULL)
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL)
    city = models.ForeignKey(City, null=True, blank=True, on_delete=models.SET_NULL)
    pincode = models.IntegerField(null=True)
    map_address = models.ForeignKey(MapAddress, null=True, blank=True, on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, related_name='student_address', on_delete=models.CASCADE)


class ParentDetail(models.Model):
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
    f_profile_pic = models.OneToOneField(Document, related_name='father_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)
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
    m_profile_pic = models.OneToOneField(Document, related_name='mother_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    dependents = models.CharField(max_length=255, blank=True, null=True)


class GuardianDetail(models.Model):
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
    g_profile_pic = models.OneToOneField(Document, related_name='guardian_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)


class StudentParentMapping(models.Model):
    student = models.OneToOneField(Student, related_name='student_parent', on_delete=models.CASCADE)
    parent = models.ForeignKey(ParentDetail, null=True, blank=True, on_delete=models.SET_NULL)
    guardian = models.ForeignKey(GuardianDetail, null=True, blank=True, on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StudentType(models.Model):  # added to track old data (redundant in student because of performance)
    studentType = (
        ('Day Scholar', 'Day Scholar'),
        ('Residential', 'Residential'),
    )
    student = models.ForeignKey(Student, related_name='student_type_student', on_delete=models.CASCADE)
    student_type = models.CharField(max_length=12, choices=studentType, blank=True, null=True, default='Day Scholar')
    reg_num = models.CharField(max_length=255, blank=True, null=True)
    from_date = models.DateField(null=True)
    to_date = models.DateField(default='9999-12-31')
