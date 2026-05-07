from apps.classes.models import Standard, Section, StandardSectionMapping
from apps.forms.models import EnquiryStudent, EnquiryStudentDetails
from apps.institutes.models import Institute, AcademicYear
from apps.shared.models import Country, State, District, City


def add_enquiry_data(self):
    self.institute = Institute.objects.create(name='School', code='school', company_id=1)
    self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
    self.std1 = Standard.objects.get(id=2)
    self.a = Section.objects.create(name='A')
    self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                     section=self.a, strength=10)
    self.country = Country.objects.create(name='India', code='IN')
    self.state = State.objects.create(name='Karnataka', code='KA', country=self.country)
    self.district = District.objects.create(name='Bengaluru', state=self.state)
    self.city = City.objects.create(name='Bengaluru', district=self.district)
    self.student = EnquiryStudent.objects.create(first_name='Student', middle_name='A', last_name='Rao',
                                                 dob='1995-11-18', gender='Boy', email='student@edubricz.com',
                                                 mobile_num='9876543210', current_standard=self.std1,
                                                 entry_academic_year=self.academic_year, enquiry_num='enquiry1',
                                                 enquiry_date='2020-06-01')
    self.sd = EnquiryStudentDetails.objects.create(enquiry_student=self.student, father_name='Father',
                                                   f_mobile_num='1234567890', f_email='father@edubricz.com',
                                                   mother_name='Mother', m_mobile_num='8765456789',
                                                   m_email='mother@edubricz.com', guardian_name='Guardian',
                                                   g_mobile_num='8765445676', g_email='guardian@edubricz.com',
                                                   address='#1 House', country=self.country, state=self.state,
                                                   district=self.district, city=self.city, pincode='562149',
                                                   previous_school_details={'name': 'old school'})


def enquiry_data(self):
    return {'id': self.student.pk, 'current_standard_name': 'Standard 1', 'entry_academic_year_value': '2020-2021',
            'first_name': 'Student', 'middle_name': 'A', 'last_name': 'Rao', 'enquiry_date': '2020-06-01',
            'enquiry_num': 'enquiry1', 'dob': '1995-11-18', 'gender': 'Boy', 'email': 'student@edubricz.com',
            'mobile_num': '9876543210', 'is_active': True, 'current_standard': 2,
            'entry_academic_year': self.academic_year.pk}


def enquiry_full_data(self):
    return {'id': self.student.pk, 'current_standard_name': 'Standard 1', 'entry_academic_year_value': '2020-2021',
            'first_name': 'Student', 'middle_name': 'A', 'last_name': 'Rao', 'enquiry_date': '2020-06-01',
            'enquiry_num': 'enquiry1', 'dob': '1995-11-18', 'gender': 'Boy', 'email': 'student@edubricz.com',
            'mobile_num': '9876543210', 'is_active': True, 'current_standard': 2,
            'entry_academic_year': self.academic_year.pk,
            'student_details': {'id': self.sd.pk, 'country_name': 'India', 'state_name': 'Karnataka',
                                'district_name': 'Bengaluru', 'city_name': 'Bengaluru', 'father_name': 'Father',
                                'f_mobile_num': '1234567890', 'f_email': 'father@edubricz.com', 'mother_name': 'Mother',
                                'm_mobile_num': '8765456789', 'm_email': 'mother@edubricz.com',
                                'guardian_name': 'Guardian', 'g_mobile_num': '8765445676',
                                'g_email': 'guardian@edubricz.com', 'address': '#1 House', 'pincode': 562149,
                                'previous_school_details': {'name': 'old school'}, 'enquiry_student': self.student.pk,
                                'country': self.country.pk, 'state': self.state.pk, 'district': self.district.pk,
                                'city': self.city.pk}}


def valid_payload(self):
    return {'student': {'first_name': 'Student2', 'middle_name': 'A', 'last_name': 'Rao', 'dob': '1995-11-17',
                        'gender': 'Boy', 'email': 'student2@edubricz.com', 'mobile_num': '846845314',
                        'current_standard': '2', 'entry_academic_year': self.academic_year.pk},
            'student_detail': {'father_name': 'father', 'f_mobile_num': '9876543214', 'f_email': 'father@gmail.com',
                               'mother_name': 'mother', 'm_mobile_num': '1234567890', 'm_email': 'mother@gmail.com',
                               'guardian_name': 'guardian', 'g_mobile_num': '1234567890',
                               'g_email': 'guardian@gmail.com', 'address': '#1 House', 'country': self.country.pk,
                               'state': self.state.pk, 'district': self.district.pk, 'city': self.city.pk,
                               'pincode': '562149', 'previous_school_details': {'name': 'old school'}}}
