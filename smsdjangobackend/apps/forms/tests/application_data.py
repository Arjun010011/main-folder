from apps.classes.models import Standard, Section, StandardSectionMapping
from apps.finance.models import ApplicationPlan
from apps.forms.models import (ApplicationStudent, ApplicationStudentDetails, ApplicationStudentAddress,
                               ApplicationParentDetail, ApplicationGuardianDetail, ApplicationStudentParentMapping)
from apps.institutes.models import Institute, AcademicYear
from apps.shared.models import Country, State, District, City


def add_application_data(self):
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
    self.ap = ApplicationPlan.objects.create(academic_year=self.academic_year, standard=self.std1, amount=100)
    self.student = ApplicationStudent.objects.create(first_name='Student', middle_name='A', last_name='Rao',
                                                     dob='1995-11-18', gender='Boy', email='student@edubricz.com',
                                                     mobile_num='9876543210', current_standard=self.std1,
                                                     entry_academic_year=self.academic_year,
                                                     application_num='application1', application_date='2020-06-01')
    self.asd = ApplicationStudentDetails.objects.create(application_student=self.student, blood_group='B+',
                                                        aadhar_num='123456789876', place_of_birth='Bengaluru',
                                                        nationality='Indian', religion='Hindu', category='3B',
                                                        caste='Lingayath')
    self.asa = ApplicationStudentAddress.objects.create(address='#1 House', country=self.country, state=self.state,
                                                        district=self.district, city=self.city, pincode='562149',
                                                        type='CP', application_student=self.student)
    self.apd = ApplicationParentDetail.objects.create(father_name='Father', f_dob='1960-01-01', f_occupation='Job',
                                                      f_aadhar='123456789876', f_mobile_num='1234567890',
                                                      f_email='father@edubricz.com', f_office_address='Bengaluru',
                                                      f_education='BE', f_pan='BJVPN3456L', mother_name='Mother',
                                                      m_dob='1964-01-01', m_occupation='Job', m_education='BE',
                                                      m_aadhar='123456349876', m_mobile_num='1234567890',
                                                      m_email='mother@edubricz.com', m_office_address='Bengaluru',
                                                      m_pan='BJVPN5645L', f_annual_income='100000')
    self.agd = ApplicationGuardianDetail.objects.create(guardian_name='Guardian', g_dob='1966-01-01',
                                                        g_education='BE', g_occupation='Job', g_pan='BJVPN5655L',
                                                        g_aadhar='1354356349876', g_mobile_num='1264567890',
                                                        g_email='guardian@edubricz.com', annual_income='100000',
                                                        g_office_address='Bengaluru')
    self.asp = ApplicationStudentParentMapping.objects.create(application_student=self.student,
                                                              application_parent=self.apd,
                                                              application_guardian=self.agd)


def application_data(self):
    return {'id': self.student.pk, 'current_standard_name': 'Standard 1', 'entry_academic_year_value': '2020-2021',
            'first_name': 'Student', 'middle_name': 'A', 'last_name': 'Rao', 'application_date': '2020-06-01',
            'dob': '1995-11-18', 'gender': 'Boy', 'application_num': 'application1', 'email': 'student@edubricz.com',
            'mobile_num': '9876543210', 'is_active': True, 'current_standard': 2, 'profile_pic': None, 'enquiry': None,
            'entry_academic_year': self.academic_year.pk, 'application_payment': None, 'profile_pic_details': None}


def application_full_data(self):
    return {'id': self.student.pk,
            'student_details': {'id': self.asd.pk, 'blood_group': 'B+', 'aadhar_num': '123456789876',
                                'eid_num': '', 'place_of_birth': 'Bengaluru',
                                'nationality': 'Indian', 'religion': 'Hindu', 'category': '3B',
                                'caste': 'Lingayath', 'physically_handicaped': False,
                                'handicap_reason': '', 'medical_details': {},
                                'previous_school_details': {}, 'is_bpl': False, 'bpl_num': '',
                                'bpl_issue_authority': '', 'bpl_issue_date': None,
                                'application_student': self.student.pk},
            'student_address': [
                {'id': self.asa.pk, 'country_name': 'India', 'state_name': 'Karnataka', 'district_name': 'Bengaluru',
                 'city_name': 'Bengaluru', 'type': 'CP', 'address': '#1 House', 'pincode': 562149,
                 'country': self.country.pk, 'state': self.state.pk, 'district': self.district.pk, 'city': self.city.pk,
                 'application_student': self.student.pk}],
            'student_parent': {'id': self.asp.pk,
                               'application_parent': {'id': self.apd.pk, 'father_name': 'Father', 'f_dob': '1960-01-01',
                                                      'f_aadhar': '123456789876', 'f_mobile_num': '1234567890',
                                                      'f_occupation': 'Job', 'f_office_address': 'Bengaluru',
                                                      'f_education': 'BE', 'f_pan': 'BJVPN3456L', 'f_tax_payee': False,
                                                      'f_email': 'father@edubricz.com', 'mother_name': 'Mother',
                                                      'm_dob': '1964-01-01', 'm_aadhar': '123456349876',
                                                      'm_mobile_num': '1234567890', 'm_occupation': 'Job',
                                                      'm_office_address': 'Bengaluru', 'm_education': 'BE',
                                                      'm_pan': 'BJVPN5645L', 'm_tax_payee': False,
                                                      'm_email': 'mother@edubricz.com',
                                                      'f_annual_income': 100000.0},
                               'application_guardian': {'id': self.agd.pk, 'guardian_name': 'Guardian',
                                                        'g_dob': '1966-01-01', 'g_aadhar': '1354356349876',
                                                        'g_mobile_num': '1264567890', 'g_occupation': 'Job',
                                                        'g_office_address': 'Bengaluru', 'g_education': 'BE',
                                                        'g_pan': 'BJVPN5655L', 'g_tax_payee': False,
                                                        'g_email': 'guardian@edubricz.com', 'annual_income': 100000.0},
                               'application_student': self.student.pk},
            'current_standard_name': 'Standard 1', 'entry_academic_year_value': '2020-2021',
            'profile_pic_details': None, 'first_name': 'Student', 'middle_name': 'A',
            'last_name': 'Rao', 'application_date': '2020-06-01',
            'application_num': 'application1', 'dob': '1995-11-18', 'gender': 'Boy',
            'email': 'student@edubricz.com', 'mobile_num': '9876543210', 'is_active': True,
            'profile_pic': None, 'current_standard': 2, 'enquiry': None,
            'entry_academic_year': self.academic_year.pk}


def valid_payload(self):
    return {
        'student': {'first_name': 'Student1', 'middle_name': 'A', 'last_name': 'Rao', 'application_date': '2020-06-01',
                    'dob': '1995-11-18', 'gender': 'Boy', 'mobile_num': '9876543210', 'email': 'student@edubricz.com',
                    'profile_pic': None, 'current_standard': 2, 'enquiry': None,
                    'entry_academic_year': self.academic_year.pk},
        'student_detail': {'blood_group': 'B+', 'aadhar_num': '123456789876', 'eid_num': '',
                           'place_of_birth': 'Bengaluru', 'nationality': 'Indian', 'religion': 'Hindu',
                           'category': '3B', 'caste': 'Lingayath', 'physically_handicaped': False,
                           'handicap_reason': '', 'medical_details': {}, 'previous_school_details': {}, 'is_bpl': False,
                           'bpl_num': '', 'bpl_issue_authority': '', 'bpl_issue_date': None},
        'student_address': {'cp': True,
                            'current_address': {'address': '#1 House', 'pincode': 562149, 'country': self.country.pk,
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
        'fees': {'application_plan': self.ap.pk, 'mode_of_payment': 'Cash', 'payment_ref_num': '123456'}
    }


def invalid_payload(self):
    return {'student': {'first_name': 'Student', 'dob': '1995-11-18'}, 'parent_detail': {}, 'guardian_detail': {},
            'student_detail': {}, 'fees': {}, 'student_address': {}}
