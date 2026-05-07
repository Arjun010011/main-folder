from django.core.exceptions import ObjectDoesNotExist
from django.db import transaction
from rest_framework import exceptions

from apps.forms.serializers import EnquiryStudentSerializer, EnquiryStudentDetailSerializer, EnquiryFollowupSerializer
from apps.forms.models import EnquiryStudentDetails, ApplicationStudent, EnquiryStudent, EnquiryFollowup
from apps.institutes.models import Institute
from apps.notification.services.notification_service import send_notification
from apps.shared.services_shared.custom import add_or_update_custom_data
from apps.shared.services import NotificationBodyTemplate, SharedService, ConfigurationService,CounterService, add_google_map_data
from apps.tenants.services.middlewares import get_current_db_name
from datetime import datetime
from apps.shared.services import PDFService
from apps.shared.services_shared.common import get_full_name
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.models.custom import CustomForm
from apps.institutes.models import Institute

def add_enquiry(self, data):
    with transaction.atomic(using=get_current_db_name()):
        serializer = EnquiryStudentSerializer(data=data['student'])
        serializer.is_valid(raise_exception=True)
        student = serializer.save()
        counter, prefix, postfix = CounterService.get_countered_value(self, 'ENQUIRY',
                                                                  academic_year=student.entry_academic_year)
        student.enquiry_num = f'{prefix}{counter.value}{postfix}'
        student.save()
        # Create initial enquiry followup on enquiry creation
        EnquiryFollowup.objects.create(
            enquiry_student=student,
            followup_date=student.enquiry_date,
            status=1,  # Following
            no_of_followup=1,
            academic_year=student.entry_academic_year
        )
        if SharedService.check_all_dictvalues_not_emp_or_none(data['student_detail']):
            data['student_detail']['enquiry_student'] = student.id
            if 'map_address_data' in data['student_detail']:
                map_data = add_google_map_data(data['student_detail']['map_address_data'])
                data['student_detail']['map_address'] = map_data.id
            else:
                data['student_detail']['map_address'] = None
            data['student_detail']['address'] = data['student_detail']['address'] if 'address' in data['student_detail'] else None
            data['student_detail']['country'] = data['student_detail']['country'] if 'country' in data['student_detail'] else None
            data['student_detail']['state'] = data['student_detail']['state'] if 'state' in data['student_detail'] else None
            data['student_detail']['city'] = data['student_detail']['city'] if 'city' in data['student_detail'] else None
            data['student_detail']['pincode'] = data['student_detail']['pincode'] if 'pincode' in data['student_detail'] else None
            data['student_detail']['eligible_type'] = 0 if 'eligible_type' not in data['student_detail'] or data['student_detail']['eligible_type'] == None else data['student_detail']['eligible_type']
            data['student_detail']['marks'] = None if 'marks' not in data['student_detail'] or data['student_detail']['marks'] == "" else data['student_detail']['marks']
            stud_serializer = EnquiryStudentDetailSerializer(data=data['student_detail'])
            stud_serializer.is_valid(raise_exception=True)
            stud_serializer.save()
        if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
            add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], student)
        CounterService.increment_counter(self, counter)
    SharedService.custom_thread(student_application_form_notification, self, student)
    return {'Reason': f'Enquiry form successfully created! Enquiry # : {student.enquiry_num}',
                'data': {'id': student.id}}

def add_enquiry_followup(self, data):
    if EnquiryStudent.objects.get(id=data['enquiry_student']).staff:
        data['staff_name'] = EnquiryStudent.objects.get(id=data['enquiry_student']).staff.first_name + ' ' + EnquiryStudent.objects.get(id=data['enquiry_student']).staff.last_name
    
    data['no_of_followup'] = EnquiryFollowup.objects.filter(enquiry_student=data['enquiry_student']).count() + 1
    serializer = EnquiryFollowupSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Enquiry followup successfully created!',
            'data': {'id': serializer.data['id']}}

from django.db.models import OuterRef, Subquery
def read_all_enquiry_followup(self, **kwargs):
    queryset = self.filter_queryset(self.get_queryset())
    serializer = self.get_serializer(queryset, many=True)
    return serializer.data

from django.db.models import Count, Value
from django.db.models.functions import Concat

def read_enquiry_employee_report(self):
    entry_academic_year = self.request.query_params.get("entry_academic_year")

    queryset = (
        EnquiryStudent.objects
        .filter(
            entry_academic_year_id=entry_academic_year,
            enquiryfollowup_enquiry_student__isnull=False , # only enquiries with followups
            enquiryfollowup_enquiry_student__academic_year=entry_academic_year
        )
        .annotate(
            staff_name=Concat(
                'staff__first_name',
                Value(' '),
                'staff__last_name'
            )
        )
        .values('staff_name')
        .annotate(count=Count('id', distinct=True))
    )

    serializer = self.get_serializer(queryset, many=True)
    return serializer.data

from django.db.models import Count
from django.utils.timezone import now
from calendar import monthrange

def read_enquiry_dashboard(self):
    entry_academic_year = self.request.query_params.get("entry_academic_year")
    today = now().date()

    first_day = today.replace(day=1)
    last_day = today.replace(day=monthrange(today.year, today.month)[1])

    queryset = EnquiryFollowup.objects.filter(academic_year_id=entry_academic_year)

    # Total distinct enquiries
    total_enquiries = EnquiryStudent.objects.filter(entry_academic_year_id=entry_academic_year).count()

    # Enquiries this month
    enquiries_this_month = (
        queryset
        .filter(created__date__gte=first_day, created__date__lte=last_day,academic_year_id=entry_academic_year)
        .values('enquiry_student')
        .distinct()
        .count()
    )

    # Status counts
    from django.db.models import Q

    # Step 1: students who moved ahead (status 2 or 3)
    excluded_students = queryset.filter(
        Q(status=2) | Q(status=3)
    ).values_list('enquiry_student', flat=True)

    # Step 2: count only pure "following" students
    following = queryset.filter(
        status=1
    ).exclude(
        enquiry_student__in=excluded_students
    ).values('enquiry_student').distinct().count()

    # Other counts (no change)
    not_interested = queryset.filter(status=2).values('enquiry_student').distinct().count()
    admitted = queryset.filter(status=3).values('enquiry_student').distinct().count()

    # Staff breakdown (from EnquiryStudent table)
    staff_queryset = (
        queryset
        .values(
            'enquiry_student__staff',
            'enquiry_student__staff__first_name',
            'enquiry_student__staff__last_name'
        )
        .annotate(count=Count('enquiry_student', distinct=True))
        .order_by('-count')
    )

    staff_data = []

    for row in staff_queryset:
        staff_name = "Unassigned"

        if row["enquiry_student__staff"]:
            first = row["enquiry_student__staff__first_name"] or ""
            last = row["enquiry_student__staff__last_name"] or ""
            staff_name = f"{first} {last}".strip()

        staff_data.append({
            "staff_id": row["enquiry_student__staff"],
            "staff_name": staff_name,
            "count": row["count"]
        })

    data = {
        "total_enquiries": total_enquiries,
        "enquiries_this_month": enquiries_this_month,
        "status_breakdown": {
            "following": following,
            "not_interested": not_interested,
            "admitted": admitted
        },
        "staff_breakdown": staff_data
    }

    return {"data": data}
from django.db.models import OuterRef, Subquery

def read_last_enquiry_followup(self):

    queryset = self.filter_queryset(self.get_queryset())

    entry_academic_year = self.request.GET.get("entry_academic_year")

    latest_followup = EnquiryFollowup.objects.filter(
        enquiry_student_id=OuterRef('enquiry_student_id'),
        academic_year_id=entry_academic_year
    ).order_by('-followup_date', '-created', '-id')

    queryset = queryset.filter(
        academic_year_id=entry_academic_year,
        id=Subquery(latest_followup.values('id')[:1])
    )

    data, count, next_page, previous_page = SharedService.custom_pagination(
        self,
        queryset,
        self.request.GET.get('limit'),
        self.request.GET.get('pageno')
    )

    serializer = self.get_serializer(data, many=True)

    return {
        'Reason': 'Latest enquiry followup successfully read!',
        'data': {
            'count': count,
            'next': next_page,
            'previous': previous_page,
            'data_list': serializer.data
        }
    }


def student_application_form_notification(self, student):
    action = 'enquiry_create'
    notification_obj = NotificationBodyTemplate(action)
    customized_data = list()
    gender_details =SharedService.get_gender_relate_and_her_him(student.gender)
    institute = Institute.objects.first()  # Adjust query to fetch the correct instance
    institute_phone_num = getattr(institute, 'tel_num', 'N/A')
    school_name = getattr(institute, 'name', 'N/A')
    temp = {
        'student_name': student.first_name,
        'start_year': student.entry_academic_year.start_date.year,
        'end_year': student.entry_academic_year.end_date.year,
        'standard_name': student.current_standard.name,
        'student_relate':gender_details['student_son_daughter'],
        'institute_phone_num':institute_phone_num,
        'school_name':school_name,
        'student_obj':student
    }
    body_email = notification_obj.select_template('email', temp)
    body_sms = notification_obj.select_template('sms', temp)
    whatsapp_details = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp', temp)
    if student.email:
        customized_data.append(
            {'email': student.email, 'user_id': None, 'email_subject': None,
                                   'email_body': body_email, 'email_notification':1}
        )
    if student.mobile_num:
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': None, 'sms_body': body_sms, 'sms_notification': 1}
        )
        customized_data.append(
            {'mobile_number': student.mobile_num, 'user_id': None, 'whatsapp_body': whatsapp_details['whatsapp_template'], 'whatsapp_notification': 1,
             'whatsapp_template_id':whatsapp_details['whatsapp_template_id'],'whatsapp_field_value':whatsapp_details['field_values'],'whatsapp_contact_details':whatsapp_details['contact']}
        )
    if customized_data:
        send_notification(action, body=None, customizedData=customized_data)


def update_enquiry(self, data, **kwargs):
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    serializer = EnquiryStudentSerializer(instance=instance, data=data['student'], partial=partial)
    serializer.is_valid(raise_exception=True)
    if SharedService.check_all_dictvalues_not_emp_or_none(data['student_detail']):
        data['student_detail']['enquiry_student'] = instance.id
        try:
            queryset = EnquiryStudentDetails.objects.get(enquiry_student=instance)
        except:
            queryset = None
        if queryset and queryset.map_address_id:
            data['student_detail']['map_address_data']['id'] = queryset.map_address_id
        if 'map_address_data' in data['student_detail']:
            map_data = add_google_map_data(data['student_detail']['map_address_data'])
            data['student_detail']['map_address'] = map_data.id
        else:
            data['student_detail']['map_address'] = None
        data['student_detail']['address'] = data['student_detail']['address'] if 'address' in data['student_detail'] else None
        data['student_detail']['country'] = data['student_detail']['country'] if 'country' in data['student_detail'] else None
        data['student_detail']['state'] = data['student_detail']['state'] if 'state' in data['student_detail'] else None
        data['student_detail']['city'] = data['student_detail']['city'] if 'city' in data['student_detail'] else None
        data['student_detail']['pincode'] = data['student_detail']['pincode'] if 'pincode' in data['student_detail'] else None
        data['student_detail']['eligible_type'] = 0 if data['student_detail']['eligible_type'] == None else data['student_detail']['eligible_type']
        stud_serializer = EnquiryStudentDetailSerializer(data=data['student_detail'], instance=queryset,
                                                         partial=partial)
        stud_serializer.is_valid(raise_exception=True)
        stud_serializer.save()
    serializer.save()
    if 'custom_form_id' in data and data['custom_form_id'] and 'custom_form_data' in data and data['custom_form_data']:
        add_or_update_custom_data(self, data['custom_form_id'], data['custom_form_data'], instance)
    return {'Reason': 'Data updated Successfully!'}


def delete_enquiry(self, data):
    if not data:
        raise exceptions.ValidationError('No data is selected to delete.')
    enquiryIds = ApplicationStudent.objects.filter(enquiry__in=data).values_list('enquiry', flat=True)
    data = list(set(data) - set(enquiryIds))
    queryset = self.get_queryset()
    with transaction.atomic(using=get_current_db_name()):
        queryset.filter(id__in=enquiryIds).update(is_active=False)
        queryset.filter(id__in=data).delete()
    return {'Reason': 'Data deleted Successfully!'}


def get_enquiry_for_application(self):
    try:
        application_obj = ApplicationStudent.objects.get(enquiry__enquiry_num=self.kwargs['enquiry_num'], is_active=True)
        raise exceptions.ValidationError(f'Application details already exists for enquiry!')
        # raise exceptions.ValidationError(f'Application # {application.application_num} already exists for enquiry!')
    except ObjectDoesNotExist:
        pass
    response = SharedService.read_data(self)
    return response

from dateutil.relativedelta import relativedelta
from apps.shared.services_shared.common import get_selected_template


def get_enquiry_student(self, response):
    selected_template, number_of_copies = get_selected_template(self, 'admission_form', 'pdf', 'default_enquiry_form.html')
    path = 'enqury_forms/' + selected_template
    enquiry_data = EnquiryStudent.objects.filter(
        student_details=response['data']['id'],
        current_standard=response['data']['current_standard']
    ).values('student_details')
    response['data']['enrollment_data'] = enquiry_data[0] if len(enquiry_data) > 0 else {}
    response['data']['today'] = datetime.today().strftime('%d/%m/%Y')
    response['data']['institute'] = Institute.get_institute(self)
    response['data']['current_year'] = datetime.today().year
    if 'dob' in response['data'] and response['data']['dob']:
        try:
            dob = datetime.strptime(response['data']['dob'], '%Y-%m-%d')
            response['data']['dob'] = dob.strftime("%d-%m-%Y")
            today = datetime.today()
            age = relativedelta(today, dob)
            response['data']['age_years'] = age.years
            response['data']['age_months'] = age.months
        except (ValueError, TypeError):
            response['data']['dob'] = None
            response['data']['age_years'] = None
            response['data']['age_months'] = None

    if 'enquiry_date' in response['data'] and response['data']['enquiry_date']:
        date=datetime.strptime(response['data']['enquiry_date'],'%Y-%m-%d')
        response['data']['enquiry_date'] =date.strftime('%d-%m-%Y')
     
    print(response['data'],'iiii')
    response = PDFService.receipt(self, response['data'], 'enquiry_form', path, False)

    return response

def download_enquiry_student_data(self,data):
    student_list=[]
    student_dict={}
    student_details_dict={}
    for student in data:
        student_list.append(student['id'])
        student_dict[student['id']] = student
    enq_student_details = EnquiryStudentDetails.objects.filter(enquiry_student__in=student_list).values('father_name','f_mobile_num','mother_name','guardian_name',
                        'address','city','pincode','enquiry_student')
    for student in enq_student_details:
        student_details_dict[student['enquiry_student']] = student
    for student in data:
        student['name'] = get_full_name(student['first_name'],student['middle_name'],student['last_name'])
        if student['id'] in student_details_dict:
            student.update(student_details_dict[student['id']])
    institute=Institute.get_institute(self)
    custom_data = CustomForm.objects.filter(
        form_for='enquiry_form',is_active=1
    ).values('field_structure')
    options={}
    options['title'] = 'Student Details'
    options['description'] = 'Student Report'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Student Name', 'required': False, 'schemacolumn': 'name'
        },
        {
            'column': 'Gender', 'required': False, 'schemacolumn': 'gender'
        },
        {
            'column': 'Standard Name', 'required': False, 'schemacolumn': 'current_standard_name'
        }
        ,{
            'column': 'Blood Group', 'required': False, 'schemacolumn':'blood_group'
        }
        ,{
            'column': 'Date Of Birth', 'required': False, 'schemacolumn': 'dob'
        },{
            'column': 'Father Name', 'required': False, 'schemacolumn': 'father_name'
        },{
            'column': 'Father Mob', 'required': False, 'schemacolumn': 'f_mobile_num'
        },
        {
            'column': 'Mother Name', 'required': False, 'schemacolumn': 'mother_name'
        },{
            'column': 'Mother Mob', 'required': False, 'schemacolumn': 'm_mobile_num'
        },{
            'column': 'Guardian Name', 'required': False, 'schemacolumn': 'guardian_name'
        },{
            'column': 'Enquiry Number', 'required': False, 'schemacolumn': 'enquiry_num'
        },
        {
            'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'
        },{
            'column': 'Enquiry Date', 'required': False, 'schemacolumn': 'enquiry_date'
        },
        {
            'column': 'Address', 'required': False, 'schemacolumn': 'address'
        },
        {
            'column': 'City', 'required': False, 'schemacolumn': 'city'
        }
    ]
    for custom_admission_form in custom_data:
        for custom_fields in custom_admission_form['field_structure']:
            options['columns'].append({
                'column':custom_fields['label'], 'required': False, 'schemacolumn': custom_fields['name']
            })

    return write_to_excel_new(self, options, {}, {})