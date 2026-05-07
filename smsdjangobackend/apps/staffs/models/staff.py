from django.db import models
from django.db.models import JSONField
from django.db.models.functions import Concat
from django.db.models import Value as V

from apps.shared.models.address import Country, State, District, City, MapAddress
from apps.shared.models import Document
from apps.classes.models.standard import Branch
from ...shared.models.caste import Nationality, Religion
from apps.shared.models.document import DocumentType
from apps.institutes.models import AcademicYear
from apps.students.models.student import Student

class Staff(models.Model):
    Gender = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    Frequency = (
        ('M', 'Month'),
        ('W', 'Week'),
        ('H', 'Hour'),
        ('D', 'Day'),
    )
    EmployeeStatus = (
        ('F', 'Fulltime'),
        ('P', 'Parttime'),
        ('C', 'Contract'),
    )
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
    first_name = models.CharField(max_length=255)
    middle_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    father_or_husband_name = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=1, choices=Gender)
    email = models.EmailField(blank=True, null=True)
    employee_id = models.CharField(max_length=255, blank=True, null=True)
    aadhar_num = models.CharField(max_length=255, blank=True, null=True)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    alternate_mobile_num = models.CharField(max_length=255, blank=True, null=True)
    qualification = models.CharField(max_length=255, blank=True, null=True)
    designation = models.CharField(max_length=255, blank=True, null=True)
    salary = models.FloatField(blank=True, null=True)
    marital_status = models.CharField(max_length=255, blank=True, null=True)
    employee_status = models.CharField(default='F', max_length=1, choices=EmployeeStatus)
    frequency = models.CharField(max_length=1, choices=Frequency, blank=True, null=True)
    measure = models.IntegerField(null=True, blank=True)  # measure unit based on frequency choices
    previous_job_details = JSONField(null=True)
    profile_pic = models.OneToOneField(Document, related_name='staff_profile_pic', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    date_joined = models.DateField()  # always should be mandatory because leave and salary will be calculated from this field
    date_left = models.DateField(blank=True, null=True)
    reason_for_leaving = models.CharField(max_length=255, blank=True, null=True)
    job_title = models.CharField(max_length=255, blank=True, null=True)
    experience_in_num = models.CharField(max_length=255, blank=True, null=True)
    dl_number = models.CharField(max_length=100, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    blood_group = models.CharField(max_length=3, choices=BloodGroup, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    religion = models.ForeignKey(Religion, related_name='staff_religion', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    nationality = models.ForeignKey(Nationality, related_name='staff_nationality', null=True, blank=True,
                                    on_delete=models.SET_NULL)

    def __str__(self):
        return '%s %s %s' % (self.first_name, self.middle_name, self.last_name)

    def get_staff_full_name(self, staffId):
        return Staff.objects.filter(id=staffId).annotate(
            staff_name=Concat('first_name', V(' '), 'middle_name', V(' '), 'last_name')).values()[0]['staff_name']

    def get_all_staff_full_name(self, staffIds):
        return Staff.objects.filter(id__in=staffIds).annotate(
            staff_name=Concat('first_name', V(' '), 'middle_name', V(' '), 'last_name')).values('staff_name')

    def get_staff_data(ids, customValues, customAnnotate):
        filter_query = {'is_active': True}
        if ids:
            filter_query.update({'id__in': ids})
        queryset = Staff.objects.filter(**filter_query).annotate(**customAnnotate).values(*customValues)
        return queryset
    
class StaffDocumentMapping(models.Model):
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_document_mapping_document')
    staff = models.ForeignKey(Staff, on_delete=models.CASCADE, related_name='staff_document_mapping_staff')
    document_type = models.ForeignKey(DocumentType, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff_document_mapping_document_type')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StaffSalary(models.Model):
    staff = models.ForeignKey(Staff, related_name='staff_salary', on_delete=models.CASCADE, null=True, blank=True)
    salary = models.DecimalField(max_digits=30, decimal_places=2)
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)
    comments = models.CharField(max_length=255, null=True, blank=True)
    # is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class StaffNomineeDetail(models.Model):
    name = models.CharField(max_length=255, blank=True, null=True)
    relationship_name = models.CharField(max_length=255, blank=True, null=True)
    dob = models.DateField(blank=True, null=True)
    staff = models.ForeignKey(Staff, related_name='nominee_detail', on_delete=models.CASCADE)
    address = models.CharField(max_length=255, blank=True, null=True)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s :%s' % (self.name, self.relationship_name)


class AccountDetail(models.Model):
    name = models.CharField(max_length=255)
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    account_num = models.CharField(max_length=255)
    mobile_num = models.CharField(max_length=255, blank=True, null=True)
    ifsc = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    esi_num = models.CharField(max_length=255, blank=True, null=True)
    pan_num = models.CharField(max_length=255, blank=True, null=True)
    uan_num = models.CharField(max_length=255, blank=True, null=True)
    pf_num = models.CharField(max_length=255, blank=True, null=True)
    staff = models.ForeignKey(Staff, related_name='accounts', on_delete=models.CASCADE, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class StaffAddress(models.Model):
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
    staff = models.ForeignKey(Staff, related_name='staff_address', on_delete=models.CASCADE)

class StaffBranchMapping(models.Model):
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL,related_name='staff_group_mapping_staff')
    branch = models.ForeignKey(Branch,null=True, blank=True, on_delete=models.SET_NULL,related_name='staff_group_mapping_branch')
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class HODBranchMapping(models.Model):
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL,related_name='hod_group_mapping_staff')
    branch = models.ForeignKey(Branch,null=True, blank=True, on_delete=models.SET_NULL,related_name='hod_group_mapping_branch')
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class MentorStudentMapping(models.Model):
    student = models.ForeignKey(Student,related_name='mentor_student_mapping_student', null=True, blank=True,on_delete=models.PROTECT)
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL,related_name='mentor_student_mapping_staff')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    from_date = models.DateField(blank=True, null=True)
    to_date = models.DateField(blank=True, null=True)

class StaffStudentMeeting(models.Model):
    student = models.ForeignKey(Student,related_name='staff_student_meeting_student', null=True, blank=True,on_delete=models.PROTECT)
    staff = models.ForeignKey(Staff, null=True, blank=True, on_delete=models.SET_NULL,related_name='staff_student_meeting_staff')
    is_active = models.BooleanField(default=True)    
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    from_date = models.DateField(blank=True, null=True)
    time = models.DateTimeField(blank=True, null=True)
    status = models.CharField(blank=True,null=True,max_length=255)
    reason = models.CharField(blank=True,null=True,max_length=255)
    remark = models.CharField(blank=True,null=True,max_length=255)