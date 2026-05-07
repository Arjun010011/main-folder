from datetime import datetime

from django.db import models
from django.db.models import JSONField

from apps.classes.models.standard import Standard
from apps.institutes.models import AcademicYear
from apps.shared.models.address import Country, State, District, City, MapAddress
from apps.staffs.models import staff

class EnquiryStudent(models.Model):
    Gender = (
        ('Boy', 'Boy'),
        ('Girl', 'Girl'),
        ('Other', 'Other'),
    )
    Transport = (
        ('Yes','yes'),
        ('No','no'),
    )
    studentType = (
        ('Day Scholar', 'Day Scholar'),
        ('Residential', 'Residential'),
    )
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    enquiry_date = models.DateField(default=datetime.now)
    enquiry_num = models.CharField(max_length=255, unique=True, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=5, choices=Gender, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    current_standard = models.ForeignKey(Standard, null=True, blank=True, on_delete=models.SET_NULL)
    entry_academic_year = models.ForeignKey(AcademicYear, related_name='entry_year_enquiry', null=True,
                                            blank=True, on_delete=models.SET_NULL)
    transport_required= models.CharField(max_length=5, choices=Transport,blank=True,null=True)
    student_type = models.CharField(max_length=12,choices=studentType ,blank=True, null=True)
    about_school = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    staff = models.ForeignKey(
        "staffs.Staff",
        on_delete=models.CASCADE,
        null=True,
        blank=True
    )


class EnquiryStudentDetails(models.Model):
    enquiry_student = models.OneToOneField(EnquiryStudent, related_name='student_details', on_delete=models.CASCADE)
    father_name = models.CharField(max_length=255, blank=True, null=True)
    f_occupation = models.CharField(max_length=255, blank=True, null=True)
    f_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    f_email = models.EmailField(blank=True, null=True)
    mother_name = models.CharField(max_length=255, blank=True, null=True)
    m_occupation = models.CharField(max_length=255,blank=True,null=True)
    m_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    m_email = models.EmailField(blank=True, null=True)
    guardian_name = models.CharField(max_length=255, blank=True, null=True)
    g_occupation = models.CharField(max_length=255, blank=True, null=True)
    g_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    g_email = models.EmailField(blank=True, null=True)
    address = models.CharField(max_length=255, blank=True, null=True)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL)
    state = models.ForeignKey(State, null=True, blank=True, on_delete=models.SET_NULL)
    district = models.ForeignKey(District, null=True, blank=True, on_delete=models.SET_NULL)
    city = models.ForeignKey(City, null=True, blank=True, on_delete=models.SET_NULL)
    pincode = models.IntegerField(null=True)
    map_address = models.ForeignKey(MapAddress, null=True, blank=True, on_delete=models.SET_NULL)
    previous_school_details = JSONField(null=True)
    eligible_type = models.IntegerField(default=0) #entrance exam passed or not 0 no entrance exam, 1 - eligible means passed 2: failed in entrance
    marks = models.FloatField(null=True, blank=True) #entrance exam marks
    remarks = models.CharField(max_length=255, null=True, blank=True) #entrance exam remarks if failed
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)




class EnquiryFollowup(models.Model):

    FollowupStatus = (
        (1, 'Following'),
        (2, 'Not Interested'),
        (3, 'Admitted'),   
    )

    enquiry_student = models.ForeignKey(
        EnquiryStudent,
        related_name="enquiryfollowup_enquiry_student",
        on_delete=models.CASCADE
    )

    followup_date = models.DateField(blank=True, null=True)
    next_followup_date = models.DateField(blank=True, null=True)
    remarks = models.CharField(max_length=255, blank=True, null=True)
    academic_year = models.ForeignKey(AcademicYear, null=True, blank=True, on_delete=models.SET_NULL)

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    no_of_followup = models.IntegerField(default=1)
    status = models.IntegerField(choices=FollowupStatus, default=1)
    staff_name = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return f"{self.enquiry_student} - {self.followup_date}"


