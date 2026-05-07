import datetime
from django.db.models.functions import Concat
from django.db.models import Value as V

from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.classes.services.attendance import get_school_timing_data_for_standard_section
from apps.diary.models import Diary
from apps.diary.services.diary import get_home_work, STATUS, get_home_work_new
from apps.finance.services.fee_plan import get_student_fee_data
from apps.general.models import HolidayCalender, school_timing
from apps.general.models.holidayCalender import HolidayCalenderStudent
from apps.hr.models.timeTable import Day, TimeTableDateRange, TimeTableSchedule
from apps.hr.services.timetable import read_scheduled_data
from apps.institutes.models import AcademicYear
from apps.notification.models.notification import NotificationLog
from apps.shared.constants import STUDENT_GROUP, TEACHER_GROUP
from apps.shared.models import Document
from apps.shared.serializers import  DocumentUrlSerializer
from apps.shared.services import SharedService


def get_diary_data(self, data, user, from_date, to_date):
    data['diary'] = get_home_work_new(self, {'stats': STATUS['NOT_COMPLETED'], 'from_date': from_date, 'to_date': to_date})['data']


def get_fee_data(self, data, student, fromDate, toDate):
    academicYear = AcademicYear.get_academic_year_for_date(self, datetime.datetime.today(), True)
    if academicYear:
        standard = StudentStandardMapping.objects.filter(academic_year=academicYear, student=student)
        if standard:
            standard = standard.first().standard
            try:#catch fees no approved
                fees = get_student_fee_data(self, student, academicYear.pk, standard)['data']
                if fees['total_pending_amount'] > 0:
                    for fee in fees['plans']:
                        if 'pending_amount' in fee and fee['pending_amount'] > 0:
                            for term in fee['standard_fee']:
                                if 'pending_amount' in term and term['pending_amount'] > 0 and fromDate <= SharedService.date_to_obj(
                                        term['payment_end_date']) <= toDate:
                                    fee_detail = {'fee_type_name': fee['fee_type_name'], 'terms': term['terms'],
                                                'payment_end_date': term['payment_end_date'],
                                                'pending_amount': term['pending_amount']}
                                    data['fee'].append(fee_detail)
            except:
                fees = []


#loop the date till we get working day
def find_working_day_with_increment(self, for_date, standard_section, academic_year):
    i=1
    j=0
    current_time = datetime.datetime.today().strftime('%H:%M:%S')
    scholl_timing = get_school_timing_data_for_standard_section(self, standard_section, academic_year, for_date)
    scholl_end_timing = scholl_timing['end_time'].strftime('%H:%M:%S') if scholl_timing else '17:00:00'
    if( current_time >  scholl_end_timing):
        for_date = for_date + datetime.timedelta(days=1) #add when end of the day is over
    while(i>0 and j<100): #looping till working day gets for safety stopping after 100 days
        i=0
        day_name = SharedService.get_day_for_date(for_date.strftime('%Y-%m-%d'))
        day_obj = Day.objects.get(name=day_name)
        holiday = HolidayCalenderStudent.objects.filter(from_date__lte=for_date, to_date__gte=for_date,holiday_type=1).values('id')
        if not day_obj.is_student_working_day:
            for_date = for_date + datetime.timedelta(days=1)
            j+=1
            i = 1
        elif len(holiday) > 0:
            for_date = for_date + datetime.timedelta(days=1)
            j+=1
            i = 1
    return for_date

def get_students_timetable_for_date(self, request, for_date, standard_section):
    day_name = SharedService.get_day_for_date(for_date.strftime('%Y-%m-%d'))
    timetable_schedule = TimeTableSchedule.objects.filter(
        time_table_schedule_parent__date_range__start_date__lte=for_date,
        time_table_schedule_parent__date_range__end_date__gte=for_date,
        period_day_mapping__day__name=day_name,
        time_table_schedule_parent__standard_section=standard_section,
        is_active=True
    ).annotate(full_name=Concat('staff__first_name', V(' '), 'staff__middle_name', V(' '), 'staff__last_name')).values(
        'period_day_mapping__start_time', 'period_day_mapping__end_time',
        'full_name', 'subject', 'id', 'subject__name', 'staff__profile_pic', 'staff'
    )
    document_ids = []
    for schedule_row in timetable_schedule:
        if schedule_row['staff__profile_pic']:
            document_ids.append(schedule_row['staff__profile_pic'])
    document_queryset = Document.objects.filter(id__in=document_ids)
    document_data = {doc['id'] : doc for doc in DocumentUrlSerializer(document_queryset, many=True).data}
    for schedule_row in timetable_schedule:
        schedule_row['profile_pic_details'] = None
        if schedule_row['staff__profile_pic'] in document_data:
            schedule_row['profile_pic_details'] = document_data[schedule_row['staff__profile_pic']]
    return timetable_schedule

def upcoming_task(self, request):
    fromDate = datetime.datetime.today().date()
    toDate = fromDate + datetime.timedelta(days=7)
    data = {'diary': [], 'fee': [], 'timetable': {}, 'unread_message_count': 0,
            'holiday': HolidayCalender.get_upcoming_holidays(self, fromDate, toDate, False)}
    user = self.request.user
    group = user.groups.first().pk
    today_date = datetime.datetime.today()
    academic_year = AcademicYear.get_academic_year_for_date(self, today_date)
    if group == STUDENT_GROUP:
        get_diary_data(self, data, user, fromDate, toDate)
        get_fee_data(self, data, user.student.pk, fromDate, toDate)
        try:
            standard_section = Enrollment.get_student_standard_for_academic(self, academic_year, user.student.pk, True)
            for_date = find_working_day_with_increment(self, today_date, standard_section['standard_section'], academic_year)
            data['timetable']['fordate'] = for_date
            data['timetable']['period_list'] = get_students_timetable_for_date(self, request, for_date, standard_section['standard_section'])
            for_date = for_date.strftime('%Y-%m-%d')
        except:
            pass
    elif group == TEACHER_GROUP:
        get_diary_data(self, data, user, fromDate, toDate)
    data['unread_message_count'] = NotificationLog.objects.filter(user=user,is_read_by_user=False).count()
    return {'data': data}
