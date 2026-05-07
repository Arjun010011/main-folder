from apps.classes.models import Standard, Section, StandardSectionMapping
from apps.forms.models import ApplicationStudent
from apps.institutes.models import Institute, AcademicYear
from apps.shared.models import Country, State, District, City, Nationality, Religion, Category, Caste
from apps.students.models import Student, StudentDetails, StudentAddress, GuardianDetail, StudentParentMapping, \
    ParentDetail


def add_student_data(self):
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
    self.nationality = Nationality.objects.create(name='Indian')
    self.religion = Religion.objects.create(name='Hindu')
    self.category = Category.objects.create(name='3B')
    self.caste = Caste.objects.create(name='nagartha')
    self.student = Student.objects.create(first_name='Student', middle_name='A', last_name='Rao', dob='1995-11-18',
                                          gender='Boy', email='student@edubricz.com', mobile_num='9876543210',
                                          current_reg_num='1234', current_standard=self.std1, sts='1')
    self.sd = StudentDetails.objects.create(student=self.student, blood_group='B+',
                                            entry_academic_year=self.academic_year, aadhar_num='123456789876',
                                            place_of_birth='Bengaluru', nationality=self.nationality,
                                            religion=self.religion, category=self.category, caste=self.caste)
    self.sa = StudentAddress.objects.create(address='#1 House', country=self.country, state=self.state, city=self.city,
                                            district=self.district, pincode='562149', type='CP', student=self.student)
    self.pd = ParentDetail.objects.create(father_name='Father', f_dob='1960-01-01', f_occupation='Job',
                                          f_aadhar='123456789876', f_mobile_num='1234567890', f_pan='BJVPN3456L',
                                          f_email='father@edubricz.com', f_office_address='Bengaluru', f_education='BE',
                                          mother_name='Mother', m_dob='1964-01-01', m_occupation='Job',
                                          m_education='BE', m_aadhar='123456349876', m_mobile_num='1234567890',
                                          m_email='mother@edubricz.com', m_office_address='Bengaluru',
                                          m_pan='BJVPN5645L', parents_annual_income='100000')
    self.gd = GuardianDetail.objects.create(guardian_name='Guardian', g_dob='1966-01-01', g_education='BE',
                                            g_occupation='Job', g_pan='BJVPN5655L', g_aadhar='1354356349876',
                                            g_mobile_num='1264567890', g_email='guardian@edubricz.com',
                                            annual_income='100000', g_office_address='Bengaluru')
    self.sp = StudentParentMapping.objects.create(student=self.student, parent=self.pd, guardian=self.gd)
    self.application = ApplicationStudent.objects.create(first_name='Student', dob='1995-11-18')


def student_data(self):
    return {'id': self.student.pk, 'current_standard_name': 'Standard 1', 'first_name': 'Student', 'middle_name': 'A',
            'last_name': 'Rao', 'dob': '1995-11-18', 'gender': 'Boy', 'email': 'student@edubricz.com',
            'mobile_num': '9876543210', 'is_active': True, 'current_standard': 2, 'profile_pic': None,
            'profile_pic_details': None, 'current_reg_num': '1234', 'sts': '1'}


def student_list_data(self):
    return {'id': self.student.pk, 'name': 'Student A Rao', 'standard': 'Standard 1', 'dob': '1995-11-18',
            'email': 'student@edubricz.com', 'gender': 'Boy', 'current_reg_num': '1234', 'mobile_num': '9876543210',
            'current_standard': 2, 'profile_pic_details': None}


def student_full_data(self):
    return {'id': self.student.pk,
            'student_details': {'id': self.sd.pk, 'nationality_name': 'Indian',
                                'religion_name': 'Hindu', 'category_name': '3B', 'caste_name': 'nagartha',
                                'blood_group': 'B+', 'aadhar_num': '123456789876',
                                'eid_num': None, 'place_of_birth': 'Bengaluru',
                                'entry_academic_year_value': '2020-2021', 'mother_tongue': None,
                                'nationality': self.nationality.pk, 'religion': self.religion.pk,
                                'category': self.category.pk, 'caste': self.caste.pk, 'physically_handicaped': False,
                                'handicap_reason': None, 'medical_details': {}, 'student': self.student.pk,
                                'previous_school_details': {}, 'is_bpl': False, 'bpl_num': None,
                                'bpl_issue_authority': None, 'bpl_issue_date': None, 'application': None,
                                'entry_academic_year': self.academic_year.pk},
            'student_address': [
                {'id': self.sa.pk, 'country_name': 'India', 'state_name': 'Karnataka', 'district_name': 'Bengaluru',
                 'city_name': 'Bengaluru', 'type': 'CP', 'address': '#1 House', 'pincode': 562149,
                 'country': self.country.pk, 'state': self.state.pk, 'district': self.district.pk,
                 'city': self.city.pk,
                 'student': self.student.pk}],
            'student_parent': {'id': self.sp.pk,
                               'parent': {'id': self.pd.pk, 'father_name': 'Father', 'f_dob': '1960-01-01',
                                          'f_aadhar': '123456789876', 'f_mobile_num': '1234567890',
                                          'f_occupation': 'Job', 'f_office_address': 'Bengaluru',
                                          'f_education': 'BE', 'f_pan': 'BJVPN3456L', 'f_tax_payee': False,
                                          'f_email': 'father@edubricz.com', 'mother_name': 'Mother',
                                          'm_dob': '1964-01-01', 'm_aadhar': '123456349876',
                                          'm_mobile_num': '1234567890', 'm_occupation': 'Job',
                                          'm_office_address': 'Bengaluru', 'm_education': 'BE',
                                          'm_pan': 'BJVPN5645L', 'm_tax_payee': False,
                                          'm_email': 'mother@edubricz.com', 'dependents': '',
                                          'parents_annual_income': 100000.0},
                               'guardian': {'id': self.gd.pk, 'guardian_name': 'Guardian',
                                            'g_dob': '1966-01-01', 'g_aadhar': '1354356349876',
                                            'g_mobile_num': '1264567890', 'g_occupation': 'Job',
                                            'g_office_address': 'Bengaluru', 'g_education': 'BE',
                                            'g_pan': 'BJVPN5655L', 'g_tax_payee': False,
                                            'g_email': 'guardian@edubricz.com', 'annual_income': 100000.0},
                               'student': self.student.pk},
            'current_standard_name': 'Standard 1', 'profile_pic': None, 'current_standard': 2, 'is_active': True,
            'profile_pic_details': None, 'first_name': 'Student', 'middle_name': 'A', 'last_name': 'Rao',
            'dob': '1995-11-18', 'gender': 'Boy', 'current_reg_num': '1234', 'email': 'student@edubricz.com',
            'mobile_num': '9876543210', 'sts': '1'}


def valid_payload(self):
    return {
        'student': {'first_name': 'Student1', 'middle_name': 'A', 'last_name': 'Rao', 'dob': '1995-11-18',
                    'gender': 'Boy', 'mobile_num': '9876543210', 'email': 'student@edubricz.com', 'profile_pic': None,
                    'current_standard': 2, 'enquiry': None},
        'feature': None,
        'student_detail': {'blood_group': 'B+', 'aadhar_num': '123456789876', 'eid_num': '',
                           'entry_academic_year': self.academic_year.pk, 'application': self.application.pk,
                           'place_of_birth': 'Bengaluru', 'nationality': self.nationality.pk,
                           'religion': self.religion.pk, 'category': self.category.pk, 'caste': self.caste.pk,
                           'physically_handicaped': False,
                           'handicap_reason': '', 'medical_details': {}, 'previous_school_details': {},
                           'is_bpl': False, 'bpl_num': '', 'bpl_issue_authority': '', 'bpl_issue_date': None},
        'student_address': {'cp': True,
                            'current_address': {'address': '#1 House', 'pincode': 562149,
                                                'country': self.country.pk,
                                                'state': self.state.pk, 'district': self.district.pk,
                                                'city': self.city.pk,
                                                }},
        'parent_detail': {'father_name': 'Father', 'f_dob': '1960-01-01', 'f_aadhar': '123456789876',
                          'f_mobile_num': '1234567890', 'f_occupation': 'Job', 'f_office_address': 'Bengaluru',
                          'f_education': 'BE', 'f_pan': 'BJVPN3456L', 'f_tax_payee': False,
                          'f_email': 'father@edubricz.com', 'mother_name': 'Mother', 'm_dob': '1964-01-01',
                          'm_aadhar': '123456349876', 'm_mobile_num': '1234567890', 'm_occupation': 'Job',
                          'm_office_address': 'Bengaluru', 'm_education': 'BE', 'm_pan': 'BJVPN5645L',
                          'm_tax_payee': False, 'm_email': 'mother@edubricz.com', 'parents_annual_income': 100000.0
                          },
        'guardian_detail': {'guardian_name': 'Guardian', 'g_dob': '1966-01-01', 'g_aadhar': '1354356349876',
                            'g_mobile_num': '1264567890', 'g_occupation': 'Job', 'g_office_address': 'Bengaluru',
                            'g_education': 'BE', 'g_pan': 'BJVPN5655L', 'g_tax_payee': False,
                            'g_email': 'guardian@edubricz.com', 'annual_income': 100000.0
                            },
    }


def invalid_payload(self):
    return {'student': {'first_name': 'Student', 'dob': '1995-11-18', 'profile_pic': None, 'current_standard': 2},
            'parent_detail': {}, 'guardian_detail': {}, 'student_address': {}, 'feature': None,
            'student_detail': {'entry_academic_year': self.academic_year.pk, 'application': self.application.pk}}
