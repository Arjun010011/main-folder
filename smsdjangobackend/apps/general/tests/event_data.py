from apps.classes.models import Standard, Section, StandardSectionMapping
from apps.general.models.event import EventType, Event
from apps.institutes.models import AcademicYear
from apps.staffs.models import Staff
from apps.students.models import Student


def add_event_data(self):
    # self.institute = Institute.objects.create(name='School', code='school', company_id=1)
    self.academic_year = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
    self.std1 = Standard.objects.get(id=2)
    self.a = Section.objects.create(name='A')
    self.ss1 = StandardSectionMapping.objects.create(academic_year=self.academic_year, standard=self.std1,
                                                     section=self.a, strength=10)
    self.student = Student.objects.create(first_name='Student', dob='1995-11-18', current_standard=self.std1)
    self.staff = Staff.objects.create(first_name='Staff', gender='M', date_joined='2020-06-01', salary=100)
    self.event_type = EventType.objects.create(name='Cultural')
    self.event = Event.objects.create(name='School day', place='school', description='school day',
                                      type=self.event_type, from_date='2020-06-01', to_date='2020-06-01',
                                      start_time='09:00', end_time='10:00', alternate_contact='9876543210')
    self.event.standard_section.add(self.ss1)
    self.event.staff.add(self.staff)
    self.event.student.add(self.student)


def event_data(self):
    return {'id': self.event.pk,
            'standard_section': [{'id': self.ss1.pk, 'standard_name': 'Standard 1', 'section_name': 'A'}],
            'student': [{'id': self.student.pk, 'name': 'Student None None'}],
            'staff': [{'id': self.staff.pk, 'full_name': 'Staff None', 'mobile_num': None}], 'type_name': 'Cultural',
            'name': 'School day', 'place': 'school', 'description': 'school day', 'from_date': '2020-06-01',
            'to_date': '2020-06-01', 'start_time': '09:00:00', 'end_time': '10:00:00', 'is_school': False,
            'alternate_contact': '9876543210', 'is_active': True, 'type': self.event_type.pk}


def valid_payload(self):
    return {'name': 'Pooja', 'type': self.event_type.pk, 'description': 'pooja', 'place': 'school',
            'from_date': '2020-06-01', 'to_date': '2020-06-01', 'start_time': '11:00', 'end_time': '12:00',
            'alternate_contact': '9876543210', 'staff': [self.staff.pk], 'student': [self.student.pk],
            'is_school': False, 'standard_section': [self.ss1.pk]}


def invalid_payload(self):
    return {'name': 'Pooja', 'type': self.event_type.pk, 'description': 'pooja', 'place': 'school',
            'from_date': '2020-06-01', 'to_date': '2020-06-01', 'start_time': '09:00', 'end_time': '12:00',
            'alternate_contact': '9876543210', 'staff': [self.staff.pk], 'student': [self.student.pk],
            'is_school': False, 'standard_section': [self.ss1.pk]}
