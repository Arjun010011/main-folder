import calendar
from datetime import datetime, timedelta
from decimal import Decimal
from datetime import date
from django.db.models import Q

from django.db.models import Count, Sum
from django.db import transaction
from apps.classes.services.standard import PASSED_OUT
from rest_framework import exceptions
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.institutes.models.resource import Resource

from apps.classes.models import Standard
from apps.classes.models.attendance import Attendance
from apps.classes.models.standard import InstituteAdresses, StandardSectionMapping
from apps.classes.models.enrollment import StudentStandardMapping, StudentTcIssuedTrack
from apps.finance.models.feeCollection import ApplicationPaymentDetail, FeeCollection, PaymentDetail
from apps.finance.models.miscellaneous import MiscellaneousPayment
from apps.finance.services.fee_collection import get_cashbook_total_report
from apps.general.models import HolidayCalender
from apps.hr.models import StaffAttendance
from apps.institutes.models import AcademicYear, Institute
from apps.institutes.models.institute import InstitutePocMapping
from apps.institutes.serializers import InstituteAddressReadSerializer, InstituteAddressSerializer
from apps.notification.models.notification import NotificationLog, NotificationType
from apps.shared.serializers import DocumentSerializer
from apps.shared.services import CounterService, FormdefinitionService, SharedService, UploadTypeService
from apps.shared.services_shared.common import get_full_name
from apps.staffs.models import Staff
from apps.students.models import Student
from apps.shared.services import add_google_map_data
from apps.shared.models import Document
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User

@receiver(post_save, sender=AcademicYear)
def handle_academic_save(sender, instance, **kwargs):
    standard_list = list(Standard.objects.all().values_list('id', flat=True))
    CounterService.create_counter_for_standard(standard_list) #calling counter when standard is created

def add_institute(self, data):
    if self.get_queryset():
        raise exceptions.ValidationError('Institute details already exists!')
    else:
        with transaction.atomic(using=get_current_db_name()):
            map_data = add_google_map_data(data['map_address_data'])
            response = SharedService.add_data(self, data, False)
            InstituteAdresses.objects.create(
                map_id=map_data.id, institute_id=response['data']['id'], default=True
            )
            return response

def update_institute(self, data, **kwargs):
    kwargs['partial'] = True
    del data['code']
    map_data = add_google_map_data(data['map_address_data'])
    response = SharedService.update_data(self, data, **kwargs)
    existing_address = InstituteAdresses.objects.filter(institute=self.kwargs['pk'], default=True)
    if existing_address:
        existing_address.update(
            map_id=map_data.id, institute_id=response['data']['id'], default=True, is_active=True
        )
    else:
        InstituteAdresses.objects.create(
            map_id=map_data.id, institute_id=response['data']['id'], default=True
        )
    if 'poc' in data:
        existing_poc = InstitutePocMapping.objects.filter(institute=self.kwargs['pk'], is_active=True)
        if existing_poc:
            if data['poc'] != existing_poc[0].poc:
                existing_poc.update(
                    is_active=False,end_date = datetime.today().date()
                )
                InstitutePocMapping.objects.create(
                poc=data['poc'], institute_id=response['data']['id'],is_active=True,start_date=datetime.today().date()
                )
        else:
            InstitutePocMapping.objects.create(
                poc=data['poc'], institute_id=response['data']['id'],is_active=True,start_date=datetime.today().date()
            )
    UploadTypeService.make_document_active(data['logo'])
    return response

def get_dashboard(self):
    response = dict()
    academic_year_list = AcademicYear.objects.all().order_by('start_date')
    today_date = datetime.today()
    try:
        academic_year = AcademicYear.get_academic_year_for_date(self, today_date, True)
    except Exception as e:
        academic_year = academic_year_list.filter(start_date__gte=today_date).first()
    if not academic_year:
        academic_year = AcademicYear.objects.all().first()
    if not academic_year:
        return response
    students = Student.objects.filter(is_active=True)
    days = 7
    response['student_login_activity'] = {'total_students': 0, 'days': days, 'active_students': 0, 'in_active_students': 0}
    for student in students.values('user_student__last_activity'):
        if not student['user_student__last_activity'] or (datetime.now() - student['user_student__last_activity']).days > days:
            response['student_login_activity']['in_active_students'] += 1
        else:
            response['student_login_activity']['active_students'] += 1
    response['students'] = students.count()
    staff_present = StaffAttendance.objects.filter(for_date=datetime.today()).exclude(status='absent').count()
    staffs = Staff.objects.filter(is_active=True)
    response['staff_attendence'] = f'{staff_present}/{staffs.filter(is_active=True).count()}'
    standards = Standard.objects.filter(is_active=True, present_standard__academic_year=academic_year)
    response['standards'] = standards.distinct().count()
    standards_chart_data = dict()
    standards_chart_data['academic_year'] = f'{academic_year.start_date.year}-{academic_year.end_date.year}'
    chartDataDict = dict()
    chartDataDict['name'] = 'Standards'
    chartDataDict['data'] = standards.annotate(strength=Sum('present_standard__strength'), percentage=Count(
        'present_standard__enrollments__student')).values('name', 'strength', 'percentage')
    for standard in chartDataDict['data']:
        standard.update({'percentage': (standard['percentage'] / standard['strength']) * 100})
    standards_chart_data['chartData'] = list()
    standards_chart_data['chartData'].append(chartDataDict)
    response['standards_chart_data'] = standards_chart_data
    response['staff_students_data'] = dict()
    years_list = [f'{year.start_date.year}-{year.end_date.year}' for year in academic_year_list]
    response['staff_students_data']['years_list'] = years_list
    series = dict()
    series['name'] = 'Students'
    series['data'] = academic_year_list.values('id').annotate(count=Count('admission_year__student')).values_list(
        'count', flat=True)
    response['staff_students_data']['series'] = list()
    response['staff_students_data']['series'].append(series)
    series = dict()
    series['name'] = 'Staffs'
    series['data'] = [staffs.filter(date_joined__lte=academic_year.end_date).count() for academic_year in
                      academic_year_list]
    response['staff_students_data']['series'].append(series)
    response['student_joining_variance'] = dict()
    response['student_joining_variance']['pointStart'] = academic_year_list.first().start_date.year
    response['student_joining_variance']['data'] = list()
    for name, data in {'enquiry': 'entry_year_enquiry__entry_academic_year',
                       'application': 'entry_year_application__entry_academic_year'}.items():
        series = dict()
        series['name'] = name
        series['data'] = academic_year_list.values('id').annotate(count=Count(data)).values_list('count', flat=True)
        response['student_joining_variance']['data'].append(series)
    startDate = academic_year.start_date
    endDate = academic_year.start_date + timedelta(days=364)
    holidays = HolidayCalender.objects.filter(from_date__gte=startDate, to_date__lte=endDate)
    response['holidays'] = holidays.values()
    return response

def add_institute_address_data(self, data):
    data = data['addresses']
    post_data = []
    with transaction.atomic(using=get_current_db_name()):
        serializer = InstituteAddressReadSerializer(InstituteAdresses.objects.filter(is_active=True), many=True)
        existing_mapping = {}
        existing_standards_id_mapping = {}
        for e in serializer.data:
            tem = str(Decimal(e['map_address_data']['latitude_map']).normalize()) + str(Decimal(e['map_address_data']['longitude_map']).normalize())
            existing_mapping[tem] = e
            for stnd in e['standard']:
                existing_standards_id_mapping[stnd] = e['id']
        for temp_data in data:
            temp = str(temp_data['map_address_data']['latitude_map']) + str(temp_data['map_address_data']['longitude_map'])
            if temp in existing_mapping and ('id' not in temp_data or str(existing_mapping[temp]['id']) != str(temp_data['id'])):
                raise exceptions.ValidationError('Addess already added for the standard')
            for stnd in temp_data['standard']:
                if stnd in existing_standards_id_mapping and ('id' not  in temp_data or str(temp_data['id']) != str(existing_standards_id_mapping[stnd])):
                    raise exceptions.ValidationError('Address already added for few standards')
        for temp_data in data:
            map_data = add_google_map_data(temp_data['map_address_data'])
            temp = {
                'institute': Institute.objects.first().id,
                'map': map_data.id,
                'standard': temp_data['standard'],
                'default': False
            }
            if 'id' in temp_data and temp_data['id']:
                temp['id'] = temp_data['id']
                temp_obj = InstituteAdresses.objects.get(id=temp['id'])
                if temp_obj.default:
                    raise exceptions.ValidationError('Default address cant be edited')
            post_data.append(temp)
    return SharedService.add_or_update_data(self, post_data)

def is_applicable_for_birthday(given_dob, birthday_days):
    day_of_dob_date = given_dob.timetuple().tm_yday
    day_of_today = date.today().timetuple().tm_yday
    if calendar.isleap(date.today().year):
        day_of_today -= 1
    if calendar.isleap(given_dob.year):
        day_of_dob_date -= 1
    diff_days = (day_of_dob_date - day_of_today)
    if diff_days >= 0 and diff_days <= birthday_days:
        return True, diff_days
    return False, 0

def get_user_related_data(self, extra_params={}):
    today_date = datetime.today()
    student_standard = StudentStandardMapping.objects.filter(academic_year_id = extra_params['academic_year_student']).values('student_id')
    current_academic_year_students = [student['student_id'] for student in student_standard]
    user_data = User.objects.filter(is_active=True).exclude(
        Q(is_superuser=True) | Q(groups__name__in=['Edubricz Admin']) | Q(student__current_standard__codename='passedout')
    ).values(
        'staff', 'staff__first_name', 'staff__middle_name',
        'staff__last_name',
        'student', 'student__first_name', 'student__middle_name',
        'student__last_name', 'last_activity', 'last_login',
        'staff__dob', 'student__dob', 'id', 'student__is_active',
        'staff__is_active', 'student__profile_pic', 'staff__profile_pic'
    )
    birthday_students_count = extra_params['birthday_students_count'] if 'birthday_students_count' in extra_params else 7
    birthday_staffs_count = extra_params['birthday_staffs_count'] if 'birthday_staffs_count' in extra_params else 7
    birthday_days = extra_params['birthday_days'] if 'birthday_days' in extra_params else 3
    user_last_activity_from_date_time = datetime.strptime(extra_params['user_last_activity_from_date_time'], '%Y-%m-%d %H:%M:%S') \
        if 'user_last_activity_from_date_time' in extra_params and extra_params['user_last_activity_from_date_time'] else today_date
    academic_year_list = extra_params['academic_year_list']
    attendance_for_date_till = extra_params['attendance_for_date_till']
    staff_attendance_mapping = {}
    student_attendance_mapping = {}
    staff_attendance_data = StaffAttendance.objects.filter(
        for_date__gte=attendance_for_date_till, is_active=True
    ).values('for_date', 'status', 'staff')
    student_attendance_data = Attendance.objects.filter(
        for_date__gte=attendance_for_date_till
    ).values('for_date', 'status', 'student')
    total_days_till_today = (today_date.date() - attendance_for_date_till).days + 1
    report_data = {
        'total_students': 0,
        'total_staffs': 0,
        'total_students_academic_year' : {'academic_year':'','students_count':0},
        'total_logged_in_students': 0,
        'total_logged_in_staffs': 0,
        'last_activity_students_based_on_date': 0,
        'last_activity_staffs_based_on_date': 0,
        'upcoming_student_birthdays': [],
        'upcoming_staff_birthdays': []
    }
    temp_academic_year = academic_year_list.filter(id=extra_params['academic_year_student'])
    report_data['total_students_academic_year']['academic_year']=f'{temp_academic_year[0].start_date.year}-{temp_academic_year[0].end_date.year}'
    report_data['staff_students_data'] = dict()
    years_list = [f'{year.start_date.year}-{year.end_date.year}' for year in academic_year_list]
    report_data['staff_students_data']['years_list'] = years_list
    series = dict()
    series['name'] = 'Students'
    series['data'] = academic_year_list.values('id').annotate(count=Count('admission_year__student')).values_list(
        'count', flat=True)
    report_data['staff_students_data']['series'] = list()
    report_data['staff_students_data']['series'].append(series)
    series = dict()
    series['name'] = 'Staffs'
    staffs = Staff.objects.filter(is_active=True) #imporove this
    series['data'] = [staffs.filter(date_joined__lte=academic_year.end_date).count() for academic_year in
                      academic_year_list]
    report_data['staff_students_data']['series'].append(series)
    for staff_attendance in staff_attendance_data:
        if staff_attendance['staff'] not in staff_attendance_mapping:
            staff_attendance_mapping[staff_attendance['staff']] = {'present': 0, 'present_percentage': 0}
        if staff_attendance['status'] == 'present':
            staff_attendance_mapping[staff_attendance['staff']]['present'] += 1
            staff_attendance_mapping[staff_attendance['staff']]['present_percentage'] = (staff_attendance_mapping[staff_attendance['staff']]['present'] / total_days_till_today) * 100
        if staff_attendance['status'] == 'halfday' or staff_attendance['status'] == 'lateandhalfday':
            staff_attendance_mapping[staff_attendance['staff']]['present'] += 0.5
            staff_attendance_mapping[staff_attendance['staff']]['present_percentage'] = (staff_attendance_mapping[staff_attendance['staff']]['present'] / total_days_till_today) * 100
    for student_attendance in student_attendance_data:
        if student_attendance['student'] not in student_attendance_mapping:
            student_attendance_mapping[student_attendance['student']] = {'present': 0, 'present_percentage': 0}
        if student_attendance['status'] == 'present':
            student_attendance_mapping[student_attendance['student']]['present'] += 0.5
            student_attendance_mapping[student_attendance['student']]['present_percentage'] = (student_attendance_mapping[student_attendance['student']]['present'] / total_days_till_today) * 100
            student_attendance_mapping[student_attendance['student']]['present_percentage'] = (student_attendance_mapping[student_attendance['student']]['present'] / total_days_till_today) * 100
    
    percentage_track = {'total_present_percentage_staff': 0, 'total_present_percentage_student': 0}
    document_ids = []
    for user in user_data:
        if user['staff'] and user['staff__is_active']:
            document_ids.append(user['staff__profile_pic'])
            if user['staff'] in staff_attendance_mapping:
                percentage_track['total_present_percentage_staff'] += staff_attendance_mapping[user['staff']]['present_percentage']
            if user['last_activity']:
                if user['last_activity'] >= user_last_activity_from_date_time:
                    report_data['last_activity_staffs_based_on_date'] += 1
            report_data['total_staffs'] += 1
            if user['last_login']:
                report_data['total_logged_in_staffs'] += 1
            if user['staff__dob']:
                is_appl, diff_days = is_applicable_for_birthday(user['staff__dob'], birthday_days)
                if is_appl:
                    report_data['upcoming_staff_birthdays'].append({
                        'name': get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name']),
                        'date': user['staff__dob'], 'days_left': diff_days, 'profile_pic': user['staff__profile_pic']
                    })
        elif user['student'] and user['student__is_active']:
            document_ids.append(user['student__profile_pic'])
            if user['student'] in student_attendance_mapping:
                percentage_track['total_present_percentage_student'] += student_attendance_mapping[user['student']]['present_percentage']
            if user['last_activity']:
                if user['last_activity'] >= user_last_activity_from_date_time:
                    report_data['last_activity_students_based_on_date'] += 1
            if user['student'] in current_academic_year_students:
                report_data['total_students_academic_year']['students_count'] +=1
            report_data['total_students'] += 1
            if user['last_login']:
                report_data['total_logged_in_students'] += 1
            if user['student__dob']:
                is_appl, diff_days = is_applicable_for_birthday(user['student__dob'], birthday_days)
                if is_appl:
                    report_data['upcoming_student_birthdays'].append({
                        'name': get_full_name(user['student__first_name'], user['student__middle_name'], user['student__last_name']),
                        'date': user['student__dob'], 'days_left': diff_days, 'profile_pic': user['student__profile_pic']
                    })
    document_queryset = Document.objects.filter(
        id__in=document_ids
    )
    document_data = {doc['id']: doc for doc in DocumentSerializer(document_queryset, many=True).data}
    try:
        staff_attendance_present_percentage = round((percentage_track['total_present_percentage_staff'] / (report_data['total_staffs'] * 100)) * 100, 2)
    except:
        staff_attendance_present_percentage = 0
    try:
        student_attendance_present_percentage = round((percentage_track['total_present_percentage_student'] / (report_data['total_students'] * 100)) * 100, 2)
    except:
        student_attendance_present_percentage = 0
    report_data['staff_attendance'] =  {
        'present_percentage': staff_attendance_present_percentage,
    }
    report_data['student_attendance'] =  {
        'present_percentage': student_attendance_present_percentage,
    }
    for student_data in report_data['upcoming_staff_birthdays']:
        student_data['profile_pic_url'] = document_data[student_data['profile_pic']]['file'] if student_data['profile_pic'] in document_data else None
    for staff_data in report_data['upcoming_student_birthdays']:
        staff_data['profile_pic_url'] = document_data[staff_data['profile_pic']]['file'] if staff_data['profile_pic'] in document_data else None
        
    report_data['upcoming_student_birthdays'] = sorted(report_data['upcoming_student_birthdays'], key=lambda d: d['days_left'])[:birthday_students_count]
    report_data['upcoming_staff_birthdays'] = sorted(report_data['upcoming_staff_birthdays'], key=lambda d: d['days_left'])[:birthday_staffs_count]
    return report_data

def get_standard_section_related_data(self, extra_params={}):
    academic_year = extra_params['academic_year']
    return_data = {
        'number_of_standards': 0,
        'number_of_classes_with_sections': 0
    }
    standard_sec = StandardSectionMapping.objects.filter(academic_year=academic_year).values()
    temp_standards_counts = {}
    for standard_se in standard_sec:
        return_data['number_of_classes_with_sections'] += 1
        if standard_se['standard_id'] not in temp_standards_counts:
            temp_standards_counts[standard_se['standard_id']] = ''
    return_data['number_of_standards'] = len(temp_standards_counts.keys())
    return return_data

def get_notification_status(self, extra_params):
    today_date = datetime.today()
    for_date = extra_params['notification_for_date_time']
    notification_types = NotificationType.objects.all().values_list('name', flat=True)
    notification_log = NotificationLog.objects.filter(
        notification_type__in=notification_types,
        created__gte=for_date
    ).values('notification_type')
    notification_datas = {}
    notification_summary = {}
    return_data = {'label': [], 'values': []}
    for notification in notification_log:
        if notification['notification_type'] not in notification_datas:
            notification_datas[notification['notification_type']] = 0
        notification_datas[notification['notification_type']] += 1
    for notification in notification_types:
        notification_summary[notification] = {'count': 0}
        if notification in notification_datas:
            notification_summary[notification]['count'] = notification_datas[notification]
    for summary in notification_summary:
        return_data['label'].append(summary)
        return_data['values'].append(notification_summary[summary]['count'])
    return return_data

def get_fee_collection_data(self, extra_params={}):
    academic_year = self.request.GET.get('academic_year')
    for_date = extra_params['fee_from_date']
    today_date = datetime.today().date()
    if isinstance(for_date, str):
        for_date = datetime.strptime(for_date, '%Y-%m-%d').date()
    to_date = today_date if for_date <= today_date else for_date
    hide_misc_fees = FormdefinitionService.get_formdefintion_data(self, 'dashboard_configuration', 'hide_misc_fees_in_dashboard')
    payment_filter_query = {
        'fee_collection__is_active':1,
    }
    appln_filter_query={
        'student__is_active':1
    }
    misc_filter_query={
        'miscellaneous__is_active':1
    }
    if academic_year:
        payment_filter_query['fee_plan__standard_fee__academic_year'] = academic_year
        appln_filter_query['student__entry_academic_year']=academic_year
        misc_filter_query['misc__academic_year']=academic_year
    else:
        appln_filter_query['transaction_date__range'] = (for_date, to_date)
        misc_filter_query['miscellaneous__date__range'] = (for_date, to_date)
        payment_filter_query['fee_collection__transaction_date__range'] = (for_date, to_date)

    payment = PaymentDetail.objects.filter(
        **payment_filter_query
    )
    application = ApplicationPaymentDetail.objects.filter(
        **appln_filter_query
    )
    misc = None if str(hide_misc_fees) == '1' else MiscellaneousPayment.objects.filter(**misc_filter_query)
    fee_collection = get_cashbook_total_report(self, payment, application, misc, None)['fee_type_summary']
    total = 0
    for fee in fee_collection:
        total += fee['amount']
    report = {
        'total_collected': total,
        'collection_list': fee_collection
    }
    return report

def get_dashboard_new(self):
    today_date = datetime.today()
    academic_year_list = AcademicYear.objects.all().order_by('start_date')
    query_obj = {
        'birthday_students_count': self.request.GET.get('birthday_students_count') if self.request.GET.get('birthday_students_count') else 7,
        'birthday_staffs_count': self.request.GET.get('birthday_staffs_count') if self.request.GET.get('birthday_staffs_count') else 7,
        'birthday_days': self.request.GET.get('birthday_days') if self.request.GET.get('birthday_days') else 7,
        'user_last_activity_from_date_time': self.request.GET.get('user_last_activity_from_date_time') if self.request.GET.get('user_last_activity_from_date_time') else 3,
        'notification_for_date_time': self.request.GET.get('notification_for_date_time') if self.request.GET.get('notification_for_date_time') else today_date,
        'fee_from_date': self.request.GET.get('fee_from_date') if self.request.GET.get('fee_from_date') else  today_date.date(),
        'collection_list_count': self.request.GET.get('collection_list_count') if self.request.GET.get('collection_list_count') else  today_date.date(),
        'attendance_for_date_till': datetime.strptime(self.request.GET.get('attendance_for_date_till'), '%Y-%m-%d').date() if self.request.GET.get('attendance_for_date_till') else today_date.date(),
        'academic_year_list': academic_year_list
    }
    get_user_data = self.request.GET.get('get_user_data')
    get_standard_data = self.request.GET.get('get_standard_data')
    get_notification_data = self.request.GET.get('get_notification_data')
    get_fee_data = self.request.GET.get('get_fee_data')
    get_resource_usage = self.request.GET.get('get_resource_usage')
    academic_year =  AcademicYear.get_academic_year_for_date(self, today_date, True,False,True)
    query_obj['academic_year'] = academic_year
    if self.request.GET.get('academic_year'):
        academic_year_for_student = self.request.GET.get('academic_year')
    else:
        academic_year_for_student=academic_year.id
    query_obj['academic_year_student'] = academic_year_for_student
    response = {'data': {}}
    if get_user_data:
        response['data']['user_data'] = get_user_related_data(self, query_obj)
    if get_standard_data:
        response['data']['standard_data'] = get_standard_section_related_data(self, query_obj)
    if get_notification_data:
        response['data']['notification_data'] = get_notification_status(self, query_obj)
    if get_fee_data:
        response['data']['fee_data'] = get_fee_collection_data(self, query_obj)

    if get_resource_usage:
        resource_data = Resource.objects.filter(
            is_active=True
        ).exclude(
            name='s3bucket'
        ).values('name', 'alias_name', 'usage', 'max_limit')
        for resource in resource_data:
            resource['available'] = resource['max_limit'] - resource['usage']
            # if resource['name'] == 's3bucket':
            #     resource['alias_name'] = 'Storage'
            #     resource['usage'] = str(round(resource['usage'],2))+ ' mb'
            #     resource['available'] = str(round(resource['available'],2)) + ' mb'
        response['data']['resource_usage'] = resource_data
    return response
