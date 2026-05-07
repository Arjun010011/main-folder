import glob
import importlib
import os
import json
import shutil
from django.db import transaction
from django.forms.models import model_to_dict
from django.conf import settings
from zipfile import ZipFile
import time
from collections import defaultdict
from rest_framework import exceptions

from apps.shared.models.custom_report import Report,ReportColumn,ReportFilter,LongProcessingAPIResultMapping,ReportGroupHeading,ReportGroupName,ReportGroupNameValuesMapping
from apps.shared.serializers import CustomReportFilterSerializer,CustomReportColumnSerializer,ReportSerializer
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.students.serializers import StudentListSerializer
from apps.students.models import Student
from datetime import datetime
from apps.users.models import User
from rest_framework.exceptions import ValidationError
from apps.shared.services_shared.common import get_dynamic_values_for_template, get_full_name, get_selected_template
from apps.shared.services import ConfigurationService, FormdefinitionService, PDFService, SharedService
from apps.institutes.serializers import InstituteSerializer
from apps.notification.services.notification_service import send_email
from apps.notification.models.notification import NotificationMedium,BulkNotification
from apps.notification.serializers import BulkNotificationSerializer


from apps.finance.services import calculations
from apps.institutes.models import Institute, AcademicYear
from apps.shared.services import SharedService, UploadTypeService, PDFService
from apps.students.serializers import StudentListSerializer
from apps.bdu.services.write_to_excel import write_to_excel_new,write_to_excel_multiple_tabs
from apps.finance.services.fee_collection import num_sort
from apps.notification.services.notification_service import (send_notification,get_users_for_notification_list,get_user_contact_details, 
                                                             handle_email_notification_bulk,handle_sms_notification_bulk,handle_push_notification_bulk,
                                                             add_to_notification_users,post_to_notification
                                                             )
from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.users.serializers import UserReadSerializer
from django.contrib.contenttypes.models import ContentType
from apps.institutes.models import Institute
from apps.institutes.models.financialyear import FinancialYear

EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)

def download_custom_pdf(self,process_name, report_data,filename):
    selected_template, number_of_copies = get_selected_template(self, 'custom_report', 'pdf', 'default_student_wise_fee_pending.html')
    path = 'custom_report/' + selected_template
    today_date = datetime.now().strftime('%d/%m/%Y')
    pdf_path_list = []
    if not os.path.exists('pending_report'):
        os.makedirs('pending_report')
    zip_path = os.path.join('pending_report', filename + '.zip')
    if process_name =='fee_type_wise_pending_report':
        for student_standard in report_data:
            data = report_data[student_standard]
            data['today_date'] = today_date
            student_list = data.get('student_list', [])
            # if selected_template == 'fee_pending_fee_type.html': #For Fee types Download 
            #     fees_data = modify_fees(student_list, today_date)
            #     data.update(fees_data)
            # student_filename = f"{filename}_{student_standard}.pdf"
            # response = PDFService.receipt_new(self, data, student_filename, path, True)
            # pdf_path_list.append(response)
            # if selected_template == 'sbvshr_fee_pending_fee_type.html': #For Fee types Download 
            #     fees_data = modify_fees(student_list, today_date)
            #     data.update(fees_data)
            # if selected_template in ['fee_pending_fee_type.html', 'sbvshr_fee_pending_fee_type.html']:
            institute = Institute.get_institute(self)
            if institute.code == 'sbvshrpu':
                first_page_size = 9
                other_page_size = 11
                total = len(student_list)
                number_of_tens_plus_ten = {}
                start = first_page_size
                while start < total:
                    end = start + other_page_size
                    if end > total:
                        end = total
                    number_of_tens_plus_ten[start] = end
                    start += other_page_size
                remaining = total - first_page_size
                if remaining > 0:
                    used_last_page_rows = remaining % other_page_size
                    if used_last_page_rows == 0:
                        number_of_empty_spaces = 0
                    else:
                        number_of_empty_spaces = other_page_size - used_last_page_rows
                else:
                    number_of_empty_spaces = first_page_size - total  
                data["number_of_tens_plus_ten"] = number_of_tens_plus_ten
                data["number_of_empty_spaces"] = number_of_empty_spaces
                data["first_page_size"] = first_page_size
                data["other_page_size"] = other_page_size

            fees_data = modify_fees(student_list, today_date)
            data.update(fees_data)
            student_filename = f"{filename}_{student_standard}.pdf"
            response = PDFService.receipt_new(self, data, student_filename, path, True)
            pdf_path_list.append(response)
    if process_name =='fee_type_wise_pending_report_class_wise':
        selected_template, number_of_copies = get_selected_template(self, 'custom_report_class_wise', 'pdf', 'default_fee_class_wise.html')

        class_summary = get_fee_type_wise_summary(report_data)
        if class_summary:
            summary_data = {
                'today_date': today_date,
                'summary': class_summary
            }
            summary_template_path = 'custom_report_class_wise/' + selected_template
            summary_pdf_filename = 'Classwise_Fee_Summary.pdf'
            summary_pdf_path = PDFService.receipt_new(self, summary_data, summary_pdf_filename, summary_template_path, True)
            pdf_path_list.append(summary_pdf_path)

    with ZipFile(zip_path, 'w') as zipf:
        for pdf_path in pdf_path_list:
            zipf.write(pdf_path, arcname=os.path.basename(pdf_path))
    for pdf_path_data in pdf_path_list:
        if os.path.exists(pdf_path_data):
            os.remove(pdf_path_data)
    return zip_path

"""
For Fee Type Pending Report Download in PDF for the 
calculated fee types is modified  the required Structure for HTML Template
"""
def modify_fees(student_list, today_date): 
    class_total_amount = 0
    class_paid_amount = 0
    class_pending_amount = 0
    fees = []

    for index, student in enumerate(student_list):
        student_fees = []
        student_total_amount = 0
        student_pending_amount = 0
        student_paid_amount = 0
        
        if index == 0:
            student['today_date'] = today_date # today_date to be sent only for First student to display on the sheet header

        for key, value in student.items(): # Already  calculated fees is modified with the required structure for template
            if key.endswith('_pending') and value > 0:  
                fee_type = key.replace('_pending', '').replace('_', ' ').title()
                total_key = f"{key.replace('_pending', '_total')}"
                paid_key = f"{key.replace('_pending', '_paid')}"
                fee_details = {
                    'fee_type': fee_type,
                    'total': student.get(total_key, 0),
                    'paid': student.get(paid_key, 0),
                    'pending': value
                }
                student_fees.append(fee_details)
                student_total_amount += fee_details['total']
                student_paid_amount += fee_details['paid']
                student_pending_amount += fee_details['pending']
        student['total_amount'] = student_total_amount
        student['paid_amount'] = student_paid_amount
        student['pending_amount'] = student_pending_amount
        class_total_amount += student_total_amount
        class_paid_amount += student_paid_amount
        class_pending_amount += student_pending_amount
        student['fees'] = student_fees
        fees.extend(student_fees)
    return {
        'class_total_amount': class_total_amount,
        'class_paid_amount': class_paid_amount,
        'class_pending_amount': class_pending_amount,
        'fees': fees
    }


def get_fee_type_wise_summary(report_data):
    """
    Returns a dictionary with fee-type-wise summary.
    For each fee type, lists class-wise breakdown of total, paid, and pending amounts.
    """
    fee_type_summary = defaultdict(list)

    for _, data in report_data.items():
        student_list = data.get('student_list', [])

        for student in student_list:
            standard_name = student.get('standard') or student.get('standard_name') or 'Unknown'

            for key, pending_amount in student.items():
                if key.endswith('_pending'):
                    fee_type_key = key.replace('_pending', '')
                    fee_type_name = fee_type_key.replace('_', ' ').title()

                    total_amount = student.get(f'{fee_type_key}_total', 0)
                    paid_amount = student.get(f'{fee_type_key}_paid', 0)

                    # Find existing entry for the class under this fee type
                    existing = next((entry for entry in fee_type_summary[fee_type_name] if entry['class'] == standard_name), None)
                    if existing:
                        existing['collectable'] += total_amount
                        existing['collected'] += paid_amount
                        existing['balance'] += pending_amount
                    else:
                        fee_type_summary[fee_type_name].append({
                            'class': standard_name,
                            'collectable': total_amount,
                            'collected': paid_amount,
                            'balance': pending_amount,
                        })

    return dict(fee_type_summary)

def get_user_downloaded_report(self):
    report_id = self.request.GET.get('report_id')
    content_type = ContentType.objects.get(app_label='shared', model='report').id
    user_id = self.request.user.id
    long_process_data=LongProcessingAPIResultMapping.objects.filter(object_id=report_id, content_type=content_type,long_processing_api__user_id=user_id,long_processing_api__is_active=True).values('long_processing_api_id','long_processing_api__result_data',
                                                                                                                                       'long_processing_api__api_name','long_processing_api__transaction_id',
                                                                                                                                       'long_processing_api__last_updated_date_time','long_processing_api__execution_started_date_time',
                                                                                                                                       'long_processing_api__is_process_running','long_processing_api__user__staff__first_name','long_processing_api__user__staff__middle_name',
                                                                                                                                       'long_processing_api__user__staff__last_name')
    for process in long_process_data:
        process['name'] =get_full_name(process['long_processing_api__user__staff__first_name'],process['long_processing_api__user__staff__middle_name'],process['long_processing_api__user__staff__last_name'])
        if 'url' not in process['long_processing_api__result_data']:
            process['is_downloaded_successfully'] = False
            
            
            
        else:
            process['is_downloaded_successfully'] = True
    data_list, count, next_page, previous_page = SharedService.custom_pagination(self, long_process_data,
                                                                                            self.request.GET.get('limit'),
                                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data_list}}


def get_custom_report(self,data):
    report = Report.objects.filter(id=data['report_id']).first()
    process_hook = report.process_hook
    process_function = report.process_function
    service = importlib.import_module(f'apps.shared.services_shared.{process_hook}')
    my_function = getattr(service, process_function)
    response = my_function(self,data)
    return response

def get_report_data(self,report_id):
    report = Report.objects.get(id=report_id)
    column_data = ReportColumn.objects.filter(report=report_id).values()
    filter_data = ReportFilter.objects.filter(report=report_id).values()
    return {
        'column_data':column_data,'filter_data':filter_data,'report':report
    }


def download_fee_pending_report(self, data,file_name,extra_columns,column_data,academic_year_obj,report_name,fee_type_wise_summary={},student_group_wise_summary={},previous_year_summary={}):
    institute = Institute.get_institute(self)
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = {}
    options['columns'] =[]
    options['extraWorksheetData'] = dict()
    for columns in column_data:
        if columns['formate_type'] != 'flag':
            options['columns'].append(
                {
                    'column': columns['column_alias'], 'required': False, 'schemacolumn': columns['column_name']
                }
            )
    for extra_column in extra_columns:
        options['columns'].append(
            {
                'column': extra_column, 'required': False, 'schemacolumn': extra_column
            }
        )
    total_column_data = {
        'paid_amount':{'value': 0, 'is_auto_calculate': True},
        'pending_amount': {'value': 0, 'is_auto_calculate': True},
        'total_amount': {'value': 0, 'is_auto_calculate': True},
        'concession_amount': {'value': 0, 'is_auto_calculate': True},
        'sl_no': {'value': 'Total'}
        }
    for columns in column_data:
        if columns['formate_type'] == 'custom':
            total_column_data[columns['column_name']] = {'value': 0, 'is_auto_calculate': True}
    if fee_type_wise_summary and not report_name == 'fee_report_custom_division':
        options['Data']['fee_type_summary']={}
        options['fee_type_summary_column'] = [{
            'column': 'Fee Type' , 'required': False, 'schemacolumn': 'fee_type_name'
        },
        {
            'column': 'Standard' , 'required': False, 'schemacolumn': 'standard_name'
        },
        {
            'column': 'Total Number Of Students' , 'required': False, 'schemacolumn': 'no_of_students_count'
        },
        {
            'column': 'Total Amount' , 'required': False, 'schemacolumn': 'total_amount'
        },
        {
            'column': 'Collectable Amount' , 'required': False, 'schemacolumn': 'payable_amount'
        },
        {
            'column': 'Collected Amount' , 'required': False, 'schemacolumn': 'paid_amount'
        },
        {
            'column': 'Balance Amount' , 'required': False, 'schemacolumn': 'pending_amount'
        }
        ]
        sl_no = 0
        options['Data']['fee_type_summary']['student_list']=[]
        for fee_type in fee_type_wise_summary:
            total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
                'total_amount': 0,
                'payable_amount': 0,
                'paid_amount': 0,
                'pending_amount':  0
            }
            for standard_id in fee_type_wise_summary[fee_type]:
                standard = fee_type_wise_summary[fee_type][standard_id]
                sl_no += 1
                standard['sl_no'] = sl_no
                for total_column in total_column_data_local:
                    total_column_data_local[total_column] += standard[total_column]
                options['Data']['fee_type_summary']['student_list'].append(standard)
            options['Data']['fee_type_summary']['standard_name']='A Summary'
            if len(data) > 1:
                total_column_data_local['sl_no'] = 'Total'
                options['Data']['fee_type_summary']['student_list'].append(total_column_data_local)
                options['Data']['fee_type_summary']['student_list'].append({})
    if student_group_wise_summary and report_name == 'fee_report_custom_division':
        options['Data']['student_group_wise_summary']={}
        options['student_group_wise_summary_column'] = [{
            'column': 'Student Group' , 'required': False, 'schemacolumn': 'student_group_name'
        },
        {
            'column': 'Total Number Of Students' , 'required': False, 'schemacolumn': 'no_of_students_count'
        },
        {
            'column':  'Total Amount' , 'required': False, 'schemacolumn': 'total_amount'
        },
        {
            'column': 'Concession Amount' , 'required': False, 'schemacolumn': 'concession_amount'
        },
        {
            'column': 'Collectable Amount' , 'required': False, 'schemacolumn': 'payable_amount'
        },
        {
            'column': 'Collected Amount' , 'required': False, 'schemacolumn': 'paid_amount'
        },
        {
            'column': 'Balance Amount' , 'required': False, 'schemacolumn': 'pending_amount'
        }
        ]
        for columns in column_data:
            if columns['formate_type'] == 'custom':
                options['student_group_wise_summary_column'].append(
                    {
                        'column': columns['column_alias'], 'required': False, 'schemacolumn': columns['column_name']
                    }
                )
        sl_no = 0
        options['Data']['student_group_wise_summary']['student_list']=[]
        options['Data']['student_group_wise_summary']['student_list'].append(previous_year_summary)
        options['Data']['student_group_wise_summary']['student_list'].append({})
        total_column_data_local = {#keep total_column_data and total_column_data_local in sync for calculation
                'total_amount': 0,
                'payable_amount': 0,
                'paid_amount': 0,
                'pending_amount':  0,
                'concession_amount': 0,
                'no_of_students_count': 0
            }
        for columns in column_data:
            if columns['formate_type'] == 'custom':
                total_column_data_local[columns['column_name']] = 0
        for student_group in student_group_wise_summary:
            student_group = student_group_wise_summary[student_group]
            sl_no += 1
            student_group['sl_no'] = sl_no
            for total_column in total_column_data_local:
                if total_column != 'sl_no':
                    total_column_data_local[total_column] += student_group[total_column]
            options['Data']['student_group_wise_summary']['student_list'].append(student_group)
            options['Data']['student_group_wise_summary']['standard_name']='A Summary'
        if len(data) >= 1:
            total_column_data_local['student_group_name'] = 'Total'
            options['Data']['student_group_wise_summary']['student_list'].append(total_column_data_local)
            options['Data']['student_group_wise_summary']['student_list'].append({})
        if previous_year_summary:
            temp = {}
            for keys in total_column_data_local:
                if keys not in temp:
                    temp[keys] = total_column_data_local[keys]
                if keys not in ['sl_no','student_group_name']:
                    temp[keys] += previous_year_summary[keys] if keys in previous_year_summary else 0
            options['Data']['student_group_wise_summary']['student_list'].append(temp)
    options['Data'].update(data)
    options['report_name'] = report_name
    options['heading_one'] = institute.name
    options['heading_two'] = f'Fee Collection report as on {datetime.today().date()} {datetime.today().time()}'
    options['academic_year'] = academic_year_obj.start_date.strftime('%y') + '-' + academic_year_obj.end_date.strftime('%y')
    return write_to_excel_multiple_tabs(self, options,  {}, total_column_data)


def pending_term_wise(self,data):

    institute = Institute.get_institute(self)
    try:
        standard_suffix_data = SharedService.get_standard_suffix_data(self)
        is_pending_upto_today = FormdefinitionService.get_formdefintion_data(self, 'custom_report_configurations', 'get_pending_based_on_today')
        report_id = data['report_id']
        report = Report.objects.get(id=report_id)
        column_data = ReportColumn.objects.filter(report=report_id).values()
        filter_data = ReportFilter.objects.filter(report=report_id).values()
        is_notification_enabled = self.request.GET.get('notification')
        if self.request.GET.get('academic_year'):
            academic_year = self.request.GET.get('academic_year')
        else:
            academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today(), True).id
        if institute.code == 'cordialhighschool':
            academic_year = 1
        standard = self.request.GET.get('standard')
        fee_type_ids = self.request.GET.get('fee_type_ids', [])
        if fee_type_ids:
            fee_type_ids = fee_type_ids.split(',')
        fee_term_names = self.request.GET.get('fee_term_names', [])
        standard_ids=[]
        if standard:
            standard_ids = [standard]
        elif self.request.GET.get('standard_ids'):
            standard_ids = self.request.GET.get('standard_ids').split(',')
        filter_dict={}
        columns = []
        for column in column_data:
            columns.append(column['column_name'])
        for filters in filter_data:
            if filters['filter_seleted_values']:
                values = filters.get('filter_seleted_values')
                if not values:
                    continue
                if isinstance(values, list):
                    filter_dict[filters['filter_name']] = values
                elif isinstance(values, str):
                    filter_dict[filters['filter_name']] = [v.strip() for v in values.split(',')]
                else:
                    filter_dict[filters['filter_name']] = [values]
                filter_dict[filters['filter_name']] = [int(i) if filters['filter_name'] != 'fee_term_name' else i for i in filter_dict[filters['filter_name']]]
        if 'academic_year' in filter_dict:
            filterqueryset={'academic_year__in':filter_dict['academic_year']}
            academic_year = filter_dict['academic_year'][0]
        else:
            filterqueryset={'academic_year':academic_year}
        if 'standard' in filter_dict:
            filterqueryset['standard__in'] = filter_dict['standard']
        elif standard_ids:
            filterqueryset['standard__in'] = standard_ids
        if 'fee_type' in filter_dict:
            fee_type_ids = filter_dict['fee_type']
        if 'fee_term_name' in filter_dict:
            fee_term_names = filter_dict['fee_term_name']
        download_excel = self.request.GET.get('download_excel')
        student_standard_data = StudentStandardMapping.objects.filter(
            **filterqueryset
        ).values('standard', 'academic_year', 'standard__name', 'student','student_group','student_group__name')
        student_standard_mapping = {}
        standard_student_mapping = {}
        enrollent_student_standard_mapping = {}
        extra_columns = []
        group_wise_fee_details = {}
        total_group_report={'no_of_students_count':0, 'payable_amount':0, 'paid_amount':0, 'pending_amount':0}
        for student_standard in student_standard_data:
            if student_standard['student'] not in student_standard_mapping:
                student_standard_mapping[student_standard['student']] = {}
            student_standard_mapping[student_standard['student']] = {
                'standard': student_standard['standard'],
                'standard_name': student_standard['standard__name'],
                'academic_year': student_standard['academic_year'],'student_group': student_standard['student_group'],'student_group_name': student_standard['student_group__name']
            }
        student_filter = {
            'is_active': True, 'id__in': student_standard_mapping.keys()
        }
        report_group_name_values_mapping_queryset = ReportGroupNameValuesMapping.objects.filter(
            report_group_name__report=report_id,
            is_active=True,
            report_group_name__report_group_heading__is_active=True,
            report_group_name__is_active=True
        ).values('type', 'value', 'report_group_name_id')
        report_group_name_type_value_mapping = {}
        for detail in report_group_name_values_mapping_queryset:
            report_group_name_id = detail['report_group_name_id']
            if report_group_name_id not in report_group_name_type_value_mapping:
                report_group_name_type_value_mapping[report_group_name_id] = {}
            report_group_name_type_value_mapping[report_group_name_id][detail['type']] = detail['value']
        report_group_name_queryset = ReportGroupName.objects.filter(
            report=report_id,
            is_active=True,
            report_group_heading__is_active=True
        ).select_related('report_group_heading').values(
            'id',
            'group_name',
            'group_alias',
            'report_group_heading__heading',
            'report_group_heading__heading_alias',
            'report_group_heading__id'
        )
        report_group_heading_mapping = {}
        for detail in report_group_name_queryset:
            report_group_name_id = detail['id']
            report_group_heading_mapping[report_group_name_id] = {}
            group_heading_data = {
                'group_name': detail['group_name'],
                'group_alias': detail['group_alias'],
                'heading': detail['report_group_heading__heading'],
                'heading_alias': detail['report_group_heading__heading_alias'],
                'heading_id': detail['report_group_heading__id'],
                'heading_name': detail['report_group_heading__heading']
            }
            report_group_heading_mapping[report_group_name_id].update(group_heading_data)
        student_queryset = Student.objects.filter(**student_filter)
        student_serializer = StudentListSerializer(student_queryset, many=True)
        enrollment_data = Enrollment.objects.filter(standard_section__academic_year = academic_year, student__in=student_standard_mapping.keys()).values("standard_section__standard","standard_section__section",
                                                    "standard_section__standard__name","standard_section__section__name","standard_section_id","student_id")
        for enrl_stu in enrollment_data:
            if enrl_stu['student_id'] not in enrollent_student_standard_mapping:
                enrollent_student_standard_mapping[enrl_stu['student_id']] = {}
            if enrl_stu['standard_section__standard'] not in enrollent_student_standard_mapping[enrl_stu['student_id']]:
                enrollent_student_standard_mapping[enrl_stu['student_id']][enrl_stu['standard_section__standard']] = {}
            enrollent_student_standard_mapping[enrl_stu['student_id']][enrl_stu['standard_section__standard']]['standard_section_id']=enrl_stu['standard_section_id']
            enrollent_student_standard_mapping[enrl_stu['student_id']][enrl_stu['standard_section__standard']]['section_name']=enrl_stu['standard_section__section__name']
        stu_data = student_serializer.data
        students_in_pagination=[]
        students_only_pending_list=[]
        pending_students_user_list=[]
        fee_type_wise_summary={}
        previous_year_summary = {'student_group_name':"Previous Year Fees",
                                                    'no_of_students_count':0,
                                                    'total_amount':0,
                                                    'concession_amount':0,
                                                    'payable_amount':0,
                                                    'paid_amount':0,
                                                    'pending_amount':0}
        student_group_wise_summary={}
        response={'data':{}}
        if report.report_name == 'fee_report_custom_division':
            previous_student_list = []
            academic_year_obj = AcademicYear.objects.get(id=academic_year) if isinstance(academic_year, int) else academic_year
            prev_academic_year = AcademicYear.objects.filter(
                is_active=True,
                end_date__lt=academic_year_obj.start_date
            ).order_by('-end_date').first()
            previous_student_standard_mapping = {}
            prevoius_data = StudentStandardMapping.objects.filter(
                academic_year=prev_academic_year
            ).values('standard', 'academic_year', 'standard__name', 'student','student_group','student_group__name')
            for student_standard in prevoius_data:
                if student_standard['student'] not in previous_student_standard_mapping:
                    previous_student_standard_mapping[student_standard['student']] = {}
                previous_student_standard_mapping[student_standard['student']] = {
                    'standard': student_standard['standard'],
                    'standard_name': student_standard['standard__name'],
                    'academic_year': student_standard['academic_year'],'student_group': student_standard['student_group'],'student_group_name': student_standard['student_group__name']
                }
                previous_student_list.append(student_standard['student'])
            for student_id in previous_student_list:
                if report.report_name == 'fee_report_custom_division':
                    if student_id in previous_student_standard_mapping:
                        previous_fee_data = calculations.fee_calculation(self, student_id, prev_academic_year, previous_student_standard_mapping[student_id]['standard'], returnValue=True)['data']
                if previous_fee_data:
                    for pre_row_data in previous_fee_data:
                        if not fee_type_ids or pre_row_data['fee_type'] in fee_type_ids:
                            if pre_row_data['academic_year'] == prev_academic_year.id and pre_row_data['total_payable_amount']:
                                previous_year_summary['no_of_students_count']+=1
                                previous_year_summary['total_amount']+=pre_row_data['total_amount']
                                previous_year_summary['concession_amount']+=pre_row_data['concession_amount']
                                previous_year_summary['payable_amount']+=pre_row_data['total_payable_amount']
                                previous_year_summary['paid_amount']+=pre_row_data['total_paid_amount']
                                previous_year_summary['pending_amount']+=pre_row_data['pending_amount']
        for index, student in enumerate(stu_data):
            if student['student_parent'] and student['student_parent']['parent']:
                student['father_name'] = student['student_parent']['parent']['father_name']
                student['mother_name'] = student['student_parent']['parent']['mother_name']
                student['f_mobile_num'] = student['student_parent']['parent']['f_mobile_num']
                student['m_mobile_num'] = student['student_parent']['parent']['m_mobile_num']
            else:
                student['father_name'] = ''
                student['mother_name'] = ''
                student['f_mobile_num'] = ''
                student['m_mobile_num'] = ''
            student['notification_term_key'] =''
            student_only_pending={}
            standard_obj = student_standard_mapping[student['id']]
            standard = standard_obj['standard']
            try:
                standard_section_id = enrollent_student_standard_mapping[student['id']][standard]['standard_section_id']
            except:
                standard_section_id = None
            if 'academic_year__in' in filterqueryset and len(filterqueryset['academic_year__in']) > 1:
                fee_data={'data':[]}
                for academic_year_fil in filterqueryset['academic_year__in']:
                    if student_standard_mapping[student['id']]['academic_year'] == academic_year_fil:
                        fee_data['data']+=calculations.fee_calculation(self, student['id'], academic_year_fil, standard, returnValue=True)['data']
            else:
                fee_data = calculations.fee_calculation(self, student['id'], academic_year, standard, returnValue=True)
            today = datetime.today().date()
            term_wise_amount = {}
            total_amount=total_pending_amount=total_paid_amount=amount=total_adjustment_amount=0
            for column in column_data:
                if column['custom_calculation']:
                    column['is_filled'] = 0
            for row_data in fee_data['data']:
                if not fee_type_ids or row_data['fee_type'] in fee_type_ids:
                    for standard_fee in row_data['standard_fee']:
                        if 'student_group' in row_data:
                            student['student_group'] = row_data['student_group']
                        else:
                            student['student_group'] = None
                            row_data['student_group'] = None
                        if 'student_group_name' in row_data:
                            student['student_group_name'] = row_data['student_group_name']
                        else:
                            student['student_group_name'] = ''
                            row_data['student_group_name'] = ''
                        if not fee_term_names or standard_fee['terms'] in fee_term_names:
                            if standard_fee['is_disabled']:
                                continue
                            if report.report_name == 'pending_report':
                                if is_pending_upto_today and datetime.strptime(standard_fee['term_end_date'],'%Y-%m-%d').date()<today or not is_pending_upto_today:
                                    term_name = standard_fee['terms']
                                    pending_amount_key = term_name+'_pending'
                                    total_amount_key = term_name+'_total'
                                    paid_amount_key = term_name+'_paid'
                                    student['notification_term_key'] = term_name+' '
                                    if pending_amount_key not in term_wise_amount and 'fee_term_pending_amount' in columns:
                                        term_wise_amount[pending_amount_key] = 0
                                    if total_amount_key not in term_wise_amount and 'fee_term_total_amount' in columns:
                                        term_wise_amount[total_amount_key] = 0
                                    if paid_amount_key not in term_wise_amount and 'fee_term_paid_amount' in columns:
                                        term_wise_amount[paid_amount_key]=0
                                    if pending_amount_key in term_wise_amount:
                                        term_wise_amount[pending_amount_key] += standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    if total_amount_key in term_wise_amount:
                                        term_wise_amount[total_amount_key] += standard_fee['amount'] if 'amount' in standard_fee else 0
                                    if paid_amount_key in term_wise_amount:
                                        term_wise_amount[paid_amount_key] += standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    total_pending_amount+=standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    amount+=standard_fee['amount'] if 'amount' in standard_fee else 0
                                    total_paid_amount+=standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    total_amount+=standard_fee['total_amount'] if 'total_amount' in standard_fee else 0
                                    total_adjustment_amount+=standard_fee['concession_amount'] if 'concession_amount' in standard_fee else 0
                                    for adjustment in standard_fee['adjustment_list']:
                                        if not adjustment['is_addition']:
                                            total_adjustment_amount+=adjustment['amount']
                                    student['notification_term_key'] = '₹'+str(term_wise_amount[pending_amount_key])+'('+term_name+') '
                            if report.report_name in ['fee_type_wise_pending_report','fee_type_wise_pending_report_class_wise','full_fee_paid_report','fee_report','zero_amount_paid','group_wise_pending_report','fee_report_custom_division']:
                                if is_pending_upto_today and datetime.strptime(standard_fee['term_end_date'],'%Y-%m-%d').date()<today or not is_pending_upto_today or report.report_name == "fee_report":
                                    type_name = standard_fee['fee_type_name']
                                    pending_amount_key = type_name + '_pending'
                                    total_amount_key = type_name + '_total'
                                    paid_amount_key = type_name +'_paid'
                                    student['notification_term_key'] = type_name+' '
                                    if pending_amount_key not in term_wise_amount and 'fee_type_pending_amount' in columns:
                                        term_wise_amount[pending_amount_key] = 0
                                    if total_amount_key not in term_wise_amount and 'fee_type_total_amount' in columns:
                                        term_wise_amount[total_amount_key] = 0
                                    if paid_amount_key not in term_wise_amount and 'fee_type_paid_amount' in columns:
                                        term_wise_amount[paid_amount_key] = 0
                                    if pending_amount_key in term_wise_amount:
                                        term_wise_amount[pending_amount_key] += standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    if total_amount_key in term_wise_amount:
                                        term_wise_amount[total_amount_key] += standard_fee['amount'] if 'amount' in standard_fee else 0
                                    if paid_amount_key in term_wise_amount:
                                        term_wise_amount[paid_amount_key] += standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    total_pending_amount+=standard_fee['pending_amount'] if 'pending_amount' in standard_fee else 0
                                    amount+=standard_fee['amount'] if 'amount' in standard_fee else 0
                                    total_paid_amount+=standard_fee['paid_amount'] if 'paid_amount' in standard_fee else 0
                                    total_amount+=standard_fee['total_amount'] if 'total_amount' in standard_fee else 0
                                    total_adjustment_amount+=standard_fee['concession_amount'] if 'concession_amount' in standard_fee else 0
                                    for adjustment in standard_fee['adjustment_list']:
                                        if not adjustment['is_addition']:
                                            total_adjustment_amount+=adjustment['amount']
                                    if pending_amount_key in term_wise_amount:
                                        student['notification_term_key'] = '₹'+str(term_wise_amount[pending_amount_key])+'('+type_name+') '
                            if report.report_name == "full_fee_paid_report" and not total_pending_amount:
                                student_only_pending.update(student)
                                student_only_pending.update(term_wise_amount)
                            elif pending_amount_key in term_wise_amount and term_wise_amount[pending_amount_key] and report.report_name in ['fee_type_wise_pending_report','fee_type_wise_pending_report_class_wise','pending_report']:
                                student_only_pending.update(student)
                                student_only_pending.update(term_wise_amount)
                            elif report.report_name in ["fee_report","fee_report_custom_division"]:
                                student_only_pending.update(student)
                                student_only_pending.update(term_wise_amount)
                    if row_data['fee_type'] not in fee_type_wise_summary:
                        fee_type_wise_summary[row_data['fee_type']] = {}
                    if row_data['standard'] not in fee_type_wise_summary[row_data['fee_type']]:
                        fee_type_wise_summary[row_data['fee_type']][row_data['standard']] ={'fee_type_name':row_data['fee_type_name'],
                                                                                            'standard_name':row_data['standard_name'],
                                                                                            'no_of_students_count':0,
                                                                                            'total_amount':0,
                                                                                            'payable_amount':0,
                                                                                            'paid_amount':0,
                                                                                            'pending_amount':0}
                    fee_type_wise_summary[row_data['fee_type']][row_data['standard']]['no_of_students_count']+=1
                    fee_type_wise_summary[row_data['fee_type']][row_data['standard']]['total_amount']+=row_data['total_amount']
                    fee_type_wise_summary[row_data['fee_type']][row_data['standard']]['payable_amount']+=row_data['total_payable_amount']
                    fee_type_wise_summary[row_data['fee_type']][row_data['standard']]['paid_amount']+=row_data['total_paid_amount']
                    fee_type_wise_summary[row_data['fee_type']][row_data['standard']]['pending_amount']+=row_data['pending_amount']
                    if row_data['student_group'] not in student_group_wise_summary:
                        student_group_wise_summary[row_data['student_group']] = {'student_group_name':row_data['student_group_name'],
                                                                                'no_of_students_count':0,
                                                                                'total_amount':0,
                                                                                'concession_amount':0,
                                                                                'payable_amount':0,
                                                                                'paid_amount':0,
                                                                                'pending_amount':0}
                    student_group_wise_summary[row_data['student_group']]['no_of_students_count']+=1
                    student_group_wise_summary[row_data['student_group']]['total_amount']+=row_data['total_amount']
                    student_group_wise_summary[row_data['student_group']]['concession_amount']+=total_adjustment_amount
                    student_group_wise_summary[row_data['student_group']]['payable_amount']+=row_data['total_payable_amount']
                    student_group_wise_summary[row_data['student_group']]['paid_amount']+=row_data['total_paid_amount']
                    student_group_wise_summary[row_data['student_group']]['pending_amount']+=row_data['pending_amount']
                if report.report_name == "group_wise_pending_report":
                    for report_group_name_id in report_group_name_type_value_mapping:
                        if 'feetype' in report_group_name_type_value_mapping[report_group_name_id] and 'standard' in report_group_name_type_value_mapping[report_group_name_id] and 'academic_year' in report_group_name_type_value_mapping[report_group_name_id]:
                            feetype_values = report_group_name_type_value_mapping[report_group_name_id]['feetype']
                            feetype_values = feetype_values.split(',')
                            feetype_values = [int(feetype) for feetype in feetype_values]    
                            standard_values = report_group_name_type_value_mapping[report_group_name_id]['standard']
                            standard_values = standard_values.split(',')
                            standard_values = [int(standard) for standard in standard_values]
                            academic_year_values = report_group_name_type_value_mapping[report_group_name_id]['academic_year']
                            academic_year_values = academic_year_values.split(',')
                            academic_year_values = [int(academic_year) for academic_year in academic_year_values]
                            if feetype_values and standard_values and academic_year_values:
                                if row_data['fee_type'] in feetype_values and row_data['standard'] in standard_values and row_data['academic_year'] in academic_year_values:
                                    if report_group_heading_mapping[report_group_name_id]['heading_id'] not in group_wise_fee_details:
                                        group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']] = {'no_of_students_count':0,'payable_amount':0,'paid_amount':0,'pending_amount':0,'heading_name':report_group_heading_mapping[report_group_name_id]['heading_name']}
                                    if report_group_name_id not in group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']]:
                                        group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']][report_group_name_id] = {'no_of_students_count':0,'payable_amount':0,'paid_amount':0,'pending_amount':0,'group_name':report_group_heading_mapping[report_group_name_id]['group_name']}
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']][report_group_name_id]['no_of_students_count']+=1
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']][report_group_name_id]['payable_amount']+=row_data['total_payable_amount']
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']][report_group_name_id]['paid_amount']+=row_data['total_paid_amount']
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']][report_group_name_id]['pending_amount']+=row_data['pending_amount']
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']]['no_of_students_count']+=1
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']]['payable_amount']+=row_data['total_payable_amount']
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']]['paid_amount']+=row_data['total_paid_amount']
                                    group_wise_fee_details[report_group_heading_mapping[report_group_name_id]['heading_id']]['pending_amount']+=row_data['pending_amount']
                                    total_group_report['no_of_students_count']+=1
                                    total_group_report['payable_amount']+=row_data['total_payable_amount']
                                    total_group_report['paid_amount']+=row_data['total_paid_amount']
                                    total_group_report['pending_amount']+=row_data['pending_amount']
            if report.report_name == "zero_amount_paid" and not total_paid_amount:
                student_only_pending.update(student)
                student_only_pending.update(term_wise_amount)
            extra_columns+=term_wise_amount.keys()
            if student_only_pending:
                # student_only_pending.update(
                #     {
                #         'total_amount': fee_data['total_amount'], 'pending_amount': fee_data['total_pending_amount'],
                #         'paid_amount': fee_data['total_paid_amount'],
                #         'amount': fee_data['amount'],
                #         'standard_name': standard_obj['standard_name'],
                #         'concession_amount': fee_data['total_adjusted_amount'] + fee_data['concession_amount'],
                #     })
                student_only_pending.update(
                    {
                        'total_amount': total_amount, 'pending_amount': total_pending_amount,
                        'paid_amount': total_paid_amount,
                        'amount': amount,
                        'standard_name': standard_obj['standard_name'],
                        'standard_id' : standard_obj['standard'],
                        'concession_amount': total_adjustment_amount,
                    })
                remaining = total_paid_amount
                total_remaining = amount
                if report.report_name == "fee_report_custom_division":
                    for column in column_data:
                        if column['custom_calculation'] and 'is_filled' in column and not column['is_filled']:
                            if 'common_data' in column['custom_calculation']:
                                if 'except_student_group' not in column['custom_calculation']['common_data'] or column['custom_calculation']['common_data']['except_student_group'] != student['student_group']:
                                    if column['custom_calculation']['common_data']['is_percentage']:
                                        if column['custom_calculation']['common_data']['is_remaining']:
                                            amount_allocated = (total_remaining*column['custom_calculation']['common_data']['rate'])/100
                                            if amount_allocated>remaining:
                                                student_only_pending[column['column_name']] = remaining
                                                remaining = 0
                                                total_remaining = total_remaining - remaining
                                                column['is_filled'] = 1
                                            else:
                                                student_only_pending[column['column_name']] = amount_allocated
                                                remaining = remaining - amount_allocated
                                                total_remaining = total_remaining - amount_allocated
                                        if not column['custom_calculation']['common_data']['is_remaining']:
                                            student_only_pending[column['column_name']] = (total_paid_amount*column['custom_calculation']['common_data']['rate'])/100
                                            remaining = remaining - student_only_pending[column['column_name']]
                                            total_remaining = total_remaining - student_only_pending[column['column_name']]
                                            column['is_filled'] = 1
                                    else:
                                        if column['custom_calculation']['common_data']['is_remaining']:
                                            student_only_pending[column['column_name']] = column['custom_calculation']['common_data']['rate'] if remaining > column['custom_calculation']['common_data']['rate'] else remaining
                                            remaining = remaining - student_only_pending[column['column_name']]
                                            total_remaining = total_remaining - student_only_pending[column['column_name']]
                                            column['custom_calculation']['common_data']['is_filled'] = 1 if student_only_pending[column['column_name']] == column['custom_calculation']['common_data']['rate'] else 0
                                        if not column['custom_calculation']['common_data']['is_remaining']:
                                            student_only_pending[column['column_name']] = column['custom_calculation']['common_data']['rate'] if total_paid_amount > column['custom_calculation']['common_data']['rate'] else total_paid_amount
                                            remaining = remaining - student_only_pending[column['column_name']]
                                            total_remaining = total_remaining - student_only_pending[column['column_name']]
                                            column['custom_calculation']['common_data']['is_filled'] = 1 if student_only_pending[column['column_name']] == column['custom_calculation']['common_data']['rate'] else 0                                    
                            if 'standard_dict' in column['custom_calculation']:
                                if str(standard_obj['standard']) in column['custom_calculation']['standard_dict']:
                                    if 'except_student_group' not in column['custom_calculation']['standard_dict'][str(standard_obj['standard'])] or column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['except_student_group'] != student['student_group']:
                                        if column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['is_percentage']:
                                            if column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['is_remaining']:
                                                amount_allocated = (total_remaining*column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'])/100
                                                if amount_allocated > remaining:
                                                    student_only_pending[column['column_name']] = remaining
                                                    total_remaining = total_remaining - remaining
                                                    remaining = 0
                                                    column['is_filled'] = 1
                                                else:
                                                    student_only_pending[column['column_name']] = amount_allocated
                                                    remaining = remaining - amount_allocated
                                                    total_remaining = total_remaining - amount_allocated
                                            if not column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['is_remaining']:
                                                student_only_pending[column['column_name']] = (total_paid_amount*column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'])/100
                                                remaining = remaining - student_only_pending[column['column_name']]
                                                total_remaining = total_remaining - student_only_pending[column['column_name']]
                                                column['is_filled'] = 1
                                        else:
                                            if column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['is_remaining']:
                                                student_only_pending[column['column_name']] = column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] if remaining > column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] else remaining
                                                remaining = remaining - student_only_pending[column['column_name']]
                                                total_remaining = total_remaining - student_only_pending[column['column_name']]
                                                column['is_filled'] = 1 if student_only_pending[column['column_name']] == column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] else 0
                                            if not column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['is_remaining']:
                                                student_only_pending[column['column_name']] = column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] if total_paid_amount > column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] else total_paid_amount
                                                remaining = remaining - student_only_pending[column['column_name']]
                                                total_remaining = total_remaining - student_only_pending[column['column_name']]
                                                column['is_filled'] = 1 if student_only_pending[column['column_name']] == column['custom_calculation']['standard_dict'][str(standard_obj['standard'])]['rate'] else 0
                            if column['column_name'] not in student_group_wise_summary[row_data['student_group']]:
                                student_group_wise_summary[row_data['student_group']][column['column_name']] = 0
                            student_group_wise_summary[row_data['student_group']][column['column_name']] += student_only_pending[column['column_name']] if column['column_name'] in student_only_pending else 0
                if 'section_wise' in columns:
                    if standard_section_id not in standard_student_mapping:
                        standard_student_mapping[standard_section_id] = {'student_list': [], 'standard': standard,
                            'standard_name': student_standard_mapping[student['id']]['standard_name']+'-'+enrollent_student_standard_mapping[student['id']][standard]['section_name'],
                            'total_amount': 0, 'pending_amount': 0, 'paid_amount': 0,
                            'amount': 0, 'concession_amount': 0, 'standard_suffix':standard_suffix_data[standard]
                        }
                    if (report.report_name == "full_fee_paid_report" and not total_pending_amount) or report.report_name != "full_fee_paid_report":
                        standard_student_mapping[standard_section_id]['total_amount'] += student_only_pending['total_amount']
                        standard_student_mapping[standard_section_id]['pending_amount'] += student_only_pending['pending_amount']
                        standard_student_mapping[standard_section_id]['paid_amount'] += student_only_pending['paid_amount']
                        standard_student_mapping[standard_section_id]['amount'] += student_only_pending['amount']
                        standard_student_mapping[standard_section_id]['concession_amount'] += student_only_pending['concession_amount']
                        standard_student_mapping[standard_section_id]['student_list'].append(student_only_pending)
                else:
                    if standard not in standard_student_mapping:
                        standard_student_mapping[standard] = {'student_list': [], 'standard': standard,
                            'standard_name': student_standard_mapping[student['id']]['standard_name'],
                            'total_amount': 0, 'pending_amount': 0, 'paid_amount': 0,
                            'amount': 0, 'concession_amount': 0, 'standard_suffix':standard_suffix_data[standard]
                        }
                    if (report.report_name == "full_fee_paid_report" and not total_pending_amount) or report.report_name != "full_fee_paid_report":
                        standard_student_mapping[standard]['total_amount'] += student_only_pending['total_amount']
                        standard_student_mapping[standard]['pending_amount'] += student_only_pending['pending_amount']
                        standard_student_mapping[standard]['paid_amount'] += student_only_pending['paid_amount']
                        standard_student_mapping[standard]['amount'] += student_only_pending['amount']
                        standard_student_mapping[standard]['concession_amount'] += student_only_pending['concession_amount']
                        standard_student_mapping[standard]['student_list'].append(student_only_pending)
                        pending_students_user_list.append(student_only_pending['user_student'])
                        students_in_pagination.append(student_only_pending)
                        students_only_pending_list.append(student_only_pending)
                # supported_list = get_dynamic_values_for_template('custom_report')
                # supported_dynamic_variables = {}
                # for supported_row in supported_list:
                #     if not data.get('dynamic_list'):
                #         continue
                #     supported_dynamic_variables[supported_row['name']] = data['dynamic_list'].get(supported_row['name'])
                # standard_student_mapping[standard].update(supported_dynamic_variables)
                # pending_students_user_list.append(student_only_pending['user_student'])
                # students_in_pagination.append(student_only_pending)
                # students_only_pending_list.append(student_only_pending)
        if is_notification_enabled or download_excel:
            if extra_columns:
                extra_columns = list(set(extra_columns))
                extra_columns.sort()
                extra_columns.sort(key=num_sort)
            file_name = 'Fc Report'
            acad = AcademicYear.objects.get(id=academic_year)
            file_name += ' ' + acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')+str(int(time.time()))+'.xlsx'
            download_report= download_fee_pending_report(self, standard_student_mapping,file_name,extra_columns,column_data,acad,report.report_name,fee_type_wise_summary,student_group_wise_summary,previous_year_summary)
            if download_report.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(download_report.content)
                filename = file_name
            url = UploadTypeService.upload_local_file(filename, path='longrunning/FeeReport')
            if download_excel:
                if self.request.GET.get('long_running_process'):
                    if os.path.exists(file_name):
                        os.remove(file_name)
                    transaction_id = self.request.GET.get('transaction_id')
                    store_long_running_process(self, transaction_id,{'url': url})
                else:
                    return download_report
        download_pdf = self.request.GET.get('download_pdf')
        if download_pdf:
            acad = AcademicYear.objects.get(id=academic_year)
            process_name = report.report_name
            filename = 'pending_report/Report'+acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')+str(int(time.time()))+'.zip'
            if report.report_name == "group_wise_pending_report":
                financial_year_obj = FinancialYear.get_financial_year_for_date(self, datetime.today())
                institute = Institute.get_institute(self)
                path = 'sundry_debtors/sundry_debtors.html'
                for group in group_wise_fee_details.values():
                    group['data'] = []
                    if isinstance(group, dict):
                        for key, value in list(group.items()):
                            if isinstance(key, int) and isinstance(value, dict):
                                group['data'].append(value)
                                del group[key]
                sundry_data={
                    'column_data': group_wise_fee_details.values(),
                    'total_data': total_group_report,
                    'academic_year': acad,
                    'institute': institute,
                    'financial_year': financial_year_obj
                }
                if not os.path.exists('pending_report'):
                    os.makedirs('pending_report')
                pdf_filename_base = 'Report'+acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')+str(int(time.time()))
                pdf_filename = pdf_filename_base + '.pdf'
                pdf_path = os.path.join('pending_report', pdf_filename)
                PDFService.receipt_new(self, sundry_data, pdf_path.replace('.pdf', ''), path, True)
                filename = pdf_path
            else:
                download_report= download_custom_pdf(self,process_name, standard_student_mapping,'Report'+acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')+str(int(time.time())))
                filename = download_report
            url = UploadTypeService.upload_local_file(filename, path='longrunning/FeeReport')
            if download_pdf:
                if self.request.GET.get('long_running_process'):
                    folder_path = 'pending_report'
                    if os.path.exists(folder_path) and os.path.isdir(folder_path):
                        shutil.rmtree(folder_path)
                    if os.path.exists(filename):
                        os.remove(filename)
                    transaction_id = self.request.GET.get('transaction_id')
                    store_long_running_process(self, transaction_id,{'url': url})
                else:
                    return download_report

    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id,{'error': e.args[:250]})
        else:
            raise e
    if is_notification_enabled:
        try:
            if data['return_users_only']: #this is to send to frontend showing number of users  
                userserializer = UserReadSerializer(User.objects.filter(id__in=pending_students_user_list), many=True)
                data_list, count, next_page, previous_page = SharedService.custom_pagination(self, userserializer.data,
                                                                                            self.request.GET.get('limit'),
                                                                                            self.request.GET.get('pageno'))
                if academic_year:
                    student_ids = []
                    for temp in data_list:
                        if temp['student']:
                            student_ids.append(temp['student']['id'])
                    if student_ids:
                        enrollment_data = {enr['student'] : enr for enr in Enrollment.objects.filter(student__in=student_ids, standard_section__academic_year=academic_year).values(
                            'standard_section__standard__name', 'standard_section__section__name', 'standard_section', 'student'
                        )}
                        for user in userserializer.data:
                            if 'student' in user and user['student'] and user['student']['id'] in enrollment_data:
                                user['student']['enrollment_data'] = enrollment_data[user['student']['id']]
                message_details={
                    'email_message':report.email_template,'push_message':report.push_template,'sms_message':report.sms_template,'email_title':"",'sms_title':"",'push_title':"",
                    'supported_mediums': ['push', 'email','sms']
                }
                return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data_list},'message_data':message_details}
            if 'send_user_ids_as_per_backend' in data and data['send_user_ids_as_per_backend']:
                user_list = pending_students_user_list
            else:
                user_list = get_users_for_notification_list(self, data)
            user_data = get_user_contact_details(user_list)
            if not user_list:
                raise ValidationError('No users to send notification')
            if 'language' not in data or not data['language']:
                raise ValidationError('Langauge is mandatory')
            if 'schedule' in data and data['schedule']:
                if data['schedule'] < datetime.now().strftime('%Y-%m-%d %H:%M:%S'):
                    raise ValidationError('Schedule should be greater than now')
            else:
                data['schedule'] = None
            institue = Institute.objects.all().first()
            medium_error = ''
            if data['medium'] == 'email':
                handle_medium = handle_email_notification_bulk
                medium_error = 'Email id is not present'
            elif data['medium'] == 'sms':
                handle_medium = handle_sms_notification_bulk
                medium_error = 'Mobile num is not present'
            elif data['medium'] == 'push':
                handle_medium = handle_push_notification_bulk
                medium_error = 'Push not registered for the user'
            sent_user_ids = []
            notification_data = []
            unsendable_user_with_error = {}
            s3_objects = {'document_list': []}
            standard_suffix_data = SharedService.get_standard_suffix_data(self)
            for user_datas in user_data:
                for users in students_only_pending_list:
                    if user_datas['id'] == users['user_student']:
                        user_datas['pending_term'] = users['notification_term_key']
                        user_datas['standard_name'] = users['standard_name']
                        user_datas['standard_name_suffix'] = standard_suffix_data[users['standard_id']]
                        user_datas['institute_code'] = institue.code
                        user_datas['total_pending_amount'] = int(users['pending_amount'])
            data['message_data_new']=data['message_data']
            for user in user_data:
                data['message_data'] = data['message_data_new'].format(**user)
                return_data = handle_medium(self, user, data, institue, **s3_objects)
                if return_data:
                    sent_user_ids.append(user['id'])
                    return_data['transaction_id'] = data['transaction_id']
                    notification_data.append(return_data)
                else:
                    name = ''
                    if user['student']:
                        name += 'Student '+ get_full_name(user['student__first_name'], user['student__middle_name'], user['student__last_name'])
                    else:
                        name += 'Staff '+ get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name'])
                    unsendable_user_with_error[user['id']] = name + ' ' +medium_error
            sent_user_ids = list(set(sent_user_ids))
            with transaction.atomic(using=get_current_db_name()):
                data['notification_type'] = 1
                bulk_notification_data={
                    'message_data':data['message_data'],
                    'heading':data['heading'],
                    'academic_year_id': academic_year,
                    'created_by_user_id': self.request.user.id,
                    'schedule':data['schedule'],
                    'notification_medium_id':NotificationMedium.objects.filter(name=data['medium']).first().id,
                    'notification_type':1,
                    'language_id':data['language'],
                    'transaction_id':data['transaction_id']
                }
                bulk_response = BulkNotification.objects.create(**bulk_notification_data)
                bulk_response.save()
                response['data'] = model_to_dict(bulk_response)
                response['data']['sent_user_ids'] = sent_user_ids
                data['bulk_notification'] = bulk_response.id
                add_to_notification_users(self, data, sent_user_ids)
                if notification_data:
                    SharedService.custom_thread(post_to_notification, notification_data, 'bulk_notification')
                return response
        except Exception as e:
            SharedService.custom_thread(
                    send_email, [EMAIL_HOST_USER],'error',str(e.args)[:999]
                )
  
def get_column_filter_list_from_json(self):
    report_id=self.request.GET.get('report')
    report_code_name = Report.objects.filter(id=report_id).values('code_name').first()
    f = open('apps/shared/templates/jsons/custom_report_list.json', )
    data = json.load(f)
    for report_data in data:
        for category_data in report_data['reportcategory']:
            for subcategory_data in category_data['reportsubcategory']:
                for report in subcategory_data['report']:
                    if report['code_name'] == report_code_name['code_name']:
                        report_column_data = report['report_column']
                        report_filter_data = report['report_filter']
    return {'report_column_data':report_column_data,'report_filter_data':report_filter_data}

def get_column_list(self):
    column = ReportColumn.objects.filter(report_id=self.request.GET.get('report'))
    serializer_data = CustomReportColumnSerializer(column,many=True)
    response = serializer_data.data
    report_column_data = get_column_filter_list_from_json(self)['report_column_data']
    selected_column={}
    for column in response:
        selected_column[column['column_name']]=column
    for report_column in report_column_data:
        if report_column['column_name'] in selected_column:
            selected_column[report_column['column_name']]['is_selected']= True
        if report_column['column_name'] not in selected_column:
            selected_column[report_column['column_name']]= report_column
            selected_column[report_column['column_name']]['is_selected']= False
    return {'data':selected_column.values()}

def get_filter_list(self):
    filter_q = ReportFilter.objects.filter(report_id=self.request.GET.get('report'))
    serializer_data = CustomReportFilterSerializer(filter_q,many=True)
    response = serializer_data.data
    report_filter_data = get_column_filter_list_from_json(self)['report_filter_data']
    selected_filter={}
    return_data={}
    for filter in response:
        if filter['filter_name'] == 'standard':
            filter['filter_name']='standard_id'
        selected_filter[filter['filter_name']]=filter
    for report_filter in report_filter_data:
        if report_filter['filter_name'] == 'standard':
            report_filter['filter_name'] = 'standard_id'
        if report_filter['filter_name'] not in report_filter:
            return_data[report_filter['filter_name']]={}
        return_data[report_filter['filter_name']]['name']=report_filter['filter_name']
        return_data[report_filter['filter_name']]['label'] = report_filter['filter_alias']
        return_data[report_filter['filter_name']]['get_data_hard_coded'] = []
        return_data[report_filter['filter_name']]['is_mandatory'] = False
        return_data[report_filter['filter_name']]['selected_list'] = []
        if report_filter['filter_name'] in selected_filter:
            if selected_filter[filter['filter_name']]['filter_seleted_values']:
                return_data[report_filter['filter_name']]['selected_list'] = selected_filter[filter['filter_name']]['filter_seleted_values'].split(',')
            return_data[report_filter['filter_name']]['is_mandatory'] = selected_filter[filter['filter_name']]['is_mandatory']
        if report_filter['filter_name'] == 'academic_year':
            return_data[report_filter['filter_name']]['get_data_url']="getacademicyear"
            return_data[report_filter['filter_name']]['params']=[{"is_active":True}]
            return_data[report_filter['filter_name']]['referred_params']=[]
            return_data[report_filter['filter_name']]['get_data_list_access_key']="data"
            return_data[report_filter['filter_name']]['get_data_value_access_key']=[{"id":"id","name":"name"}]
            return_data[report_filter['filter_name']]['type']="dropDown"
            return_data[report_filter['filter_name']]['data_dependent_on']=[]
        if report_filter['filter_name'] == 'standard_id':
            return_data[report_filter['filter_name']]['get_data_url']="getstandard"
            return_data[report_filter['filter_name']]['params']=[]
            return_data[report_filter['filter_name']]['referred_params']=[{"name":"academic_year","is_mandatory":True}]
            return_data[report_filter['filter_name']]['get_data_list_access_key']="data"
            return_data[report_filter['filter_name']]['get_data_value_access_key']=[{"id":"id","name":"name"}]
            return_data[report_filter['filter_name']]['type']="multiSelect"
            return_data[report_filter['filter_name']]['data_dependent_on']=["academic_year"]
        if report_filter['filter_name'] == 'fee_type':
            return_data[report_filter['filter_name']]['get_data_url']="getonlyfeetype"
            return_data[report_filter['filter_name']]['params']=[{"student_type":'D'}]
            return_data[report_filter['filter_name']]['referred_params']=[{"name":"academic_year","is_mandatory":True},{"name":"standard_id","is_mandatory":True}]
            return_data[report_filter['filter_name']]['get_data_list_access_key']="data.data"
            return_data[report_filter['filter_name']]['get_data_value_access_key']=[{"id":"id","name":"name"}]
            return_data[report_filter['filter_name']]['type']="multiSelect"
            return_data[report_filter['filter_name']]['data_dependent_on']=["academic_year","standard_id"]
        if report_filter['filter_name'] == 'fee_term_name':
            return_data[report_filter['filter_name']]['get_data_url']="getonlyfeeterm"
            return_data[report_filter['filter_name']]['params']=[{"student_type":'D'}]
            return_data[report_filter['filter_name']]['referred_params']=[{"name":"academic_year","is_mandatory":True},{"name":"standard_id","is_mandatory":True},
                                                                          {"name":"fee_type","is_mandatory":True}]
            return_data[report_filter['filter_name']]['get_data_list_access_key']="data.data"
            return_data[report_filter['filter_name']]['get_data_value_access_key']=[{"id":"id","name":"name"}]
            return_data[report_filter['filter_name']]['type']="multiSelect"
            return_data[report_filter['filter_name']]['data_dependent_on']=["academic_year","standard_id","fee_type"]
    #     if report_filter['filter_name'] in selected_filter:
    #         selected_filter[report_filter['filter_name']]['is_selected']= True
    #     if report_filter['filter_name'] not in selected_filter:
    #         selected_filter[report_filter['filter_name']] = report_filter
    #         selected_filter[report_filter['filter_name']]['is_selected'] = False
    #         selected_filter[report_filter['filter_name']]['filter_seleted_values'] = None
    #         selected_filter[report_filter['filter_name']]['report'] = self.request.GET.get('report')
    return {'data':return_data.values()}

def gets_custom_report(self):
    self.queryset = ReportColumn.objects.filter(report_id=self.request.GET.get('report'))
    self.serializer_class = CustomReportColumnSerializer
    column = get_column_list(self)
    self.queryset = ReportFilter.objects.filter(report_id=self.request.GET.get('report'))
    self.serializer_class = CustomReportFilterSerializer
    filter_q = get_filter_list(self)
    report_details = Report.objects.filter(id=self.request.GET.get('report')).values('report_name','process_hook','process_function','code_name','transaction_id','email_template','push_template','sms_template','category','subcategory').first()
    data_details= {
        'data':{'column':column['data'],
        'filter':filter_q['data']}
    }
    data_details['data'].update(report_details)
    return data_details

def add_custom_report(self,data):
    instance =None
    try:
        instance = self.get_object()
    except:
        pass
    with transaction.atomic(using=get_current_db_name()):
        report={
            'report_name' : data['report_name'],
            'report_description' : data['report_description'],
            'process_hook': data['process_hook'],
            'process_function': data['process_function'],
            'code_name': data['code_name'],
            'transaction_id': data['transaction_id'],
            'category_id':data['category'],
            'subcategory_id':data['subcategory']
        }
        if instance:
            report_data=ReportSerializer(instance=instance,data=report)
            report_data.is_valid()
            report_data.save()
            if 'filters' in data:
                for filters in data['filters']:
                    try:
                        filt_obj = ReportFilter.objects.get(report_id=instance.id,filter_name=filters['filter_name'])
                        filter_update = CustomReportFilterSerializer(instance=filt_obj,data=filters)
                        filter_update.is_valid()
                        filter_update.save()
                    except:
                        filter_update = CustomReportFilterSerializer(data=filters)
                        filter_update.is_valid()
                        filter_update.save()
            if 'columns' in data:
                for column in data['columns']:
                    try:
                        col_obj = ReportColumn.objects.get(report_id=instance.id,column_name=column['column_name'])
                        column_update = CustomReportColumnSerializer(instance=col_obj,data=column)
                        column_update.is_valid()
                        column_update.save()
                    except:
                        column_update = CustomReportColumnSerializer(data=column)
                        column_update.is_valid()
                        column_update.save()
        else:
            report_data=Report.objects.create(**report)
            report_data.save()
            if 'filters' in data:
                for filters in data['filters']:
                    filters['report']=report_data.id
                filter_data = CustomReportFilterSerializer(data=data['filters'],many=True)
                filter_data.is_valid()
                filter_data.save()
            if 'columns' in data:
                for columns in data['columns']:
                    columns['report']=report_data.id
                column_data = CustomReportColumnSerializer(data=data['columns'],many=True)
                column_data.is_valid()
                column_data.save()
        return {'data':'report created'}

def add_custom_report_grouping(self,data):
    report_id = data.get('report_id')
    
    if not report_id:
        raise exceptions.ValidationError('report_id is required')
    
    report = Report.objects.get(id=report_id, is_active=True)
    
    headings_data = data.get('headings', [])
    # Support both naming conventions: deleted_heading_ids/deleted_group_ids/deleted_values_ids and deleteheadingids/deletegroupids/deletevalues
    delete_heading_ids = data.get('deleted_heading_ids', []) or data.get('deleteheadingids', [])
    delete_group_ids = data.get('deleted_group_ids', []) or data.get('deletegroupids', [])
    delete_value_ids = data.get('deleted_values_ids', []) or data.get('deletevalues', [])
    
    # Allow empty headings if we're only deleting
    has_deletions = (delete_heading_ids and isinstance(delete_heading_ids, list) and len(delete_heading_ids) > 0) or \
                    (delete_group_ids and isinstance(delete_group_ids, list) and len(delete_group_ids) > 0) or \
                    (delete_value_ids and isinstance(delete_value_ids, list) and len(delete_value_ids) > 0)
    
    if not headings_data or not isinstance(headings_data, list):
        if not has_deletions:
            raise exceptions.ValidationError('headings is required and must be a non-empty array')
        headings_data = []
    
    with transaction.atomic(using=get_current_db_name()):
        # Handle deletions first
        # Convert string IDs to integers if needed and filter out None/empty values
        def clean_ids(id_list):
            if not id_list or not isinstance(id_list, list):
                return []
            return [int(id) for id in id_list if id is not None and str(id).strip()]
        
        delete_value_ids = clean_ids(delete_value_ids)
        delete_group_ids = clean_ids(delete_group_ids)
        delete_heading_ids = clean_ids(delete_heading_ids)
        
        # Delete (deactivate) ReportGroupNameValuesMapping entries
        if delete_value_ids:
            ReportGroupNameValuesMapping.objects.filter(
                id__in=delete_value_ids
            ).update(is_active=False)
        
        # Delete (deactivate) ReportGroupName entries
        if delete_group_ids:
            ReportGroupName.objects.filter(
                id__in=delete_group_ids
            ).update(is_active=False)
            # Also deactivate all values_mapping for deleted groups
            ReportGroupNameValuesMapping.objects.filter(
                report_group_name_id__in=delete_group_ids
            ).update(is_active=False)
        
        # Delete (deactivate) ReportGroupHeading entries
        if delete_heading_ids:
            ReportGroupHeading.objects.filter(
                id__in=delete_heading_ids
            ).update(is_active=False)
            # Get all group names under these headings and deactivate them
            # Convert to list to avoid MySQL "can't specify target table for update in FROM clause" error
            group_names_under_headings = list(ReportGroupName.objects.filter(
                report_group_heading_id__in=delete_heading_ids
            ).values_list('id', flat=True))
            if group_names_under_headings:
                ReportGroupName.objects.filter(
                    id__in=group_names_under_headings
                ).update(is_active=False)
                # Also deactivate all values_mapping for these groups
                ReportGroupNameValuesMapping.objects.filter(
                    report_group_name_id__in=group_names_under_headings
                ).update(is_active=False)
        
        created_headings = []
        academic_year_values = []
        standard_values = []
        
        for heading_data in headings_data:
            if not heading_data.get('heading') or not heading_data.get('heading_alias'):
                raise exceptions.ValidationError('Each heading must have heading and heading_alias')
            
            # Check if ID is provided for edit, otherwise create or get by name
            heading_id = heading_data.get('id')
            if heading_id:
                # Update existing heading by ID
                report_group_heading = ReportGroupHeading.objects.filter(id=heading_id).first()
                if not report_group_heading:
                    raise exceptions.ValidationError(f'ReportGroupHeading with id {heading_id} does not exist')
                report_group_heading.heading = heading_data['heading']
                report_group_heading.heading_alias = heading_data['heading_alias']
                report_group_heading.is_active = True
                report_group_heading.save()
            else:
                # Check if ReportGroupHeading exists, update or create
                report_group_heading, created = ReportGroupHeading.objects.get_or_create(
                    heading=heading_data['heading'],
                    heading_alias=heading_data['heading_alias'],
                    defaults={'is_active': True}
                )
                if not created:
                    # Update existing heading if alias changed
                    if report_group_heading.heading_alias != heading_data['heading_alias']:
                        report_group_heading.heading_alias = heading_data['heading_alias']
                        report_group_heading.is_active = True
                        report_group_heading.save()
            
            group_names_data = heading_data.get('group_names', [])
            if not group_names_data or not isinstance(group_names_data, list):
                raise exceptions.ValidationError(f'group_names is required for heading: {heading_data.get("heading")} and must be a non-empty array')
            
            created_groups = []
            
            for group_name_data in group_names_data:
                if not group_name_data.get('group_name') or not group_name_data.get('group_alias'):
                    raise exceptions.ValidationError('Each group_name must have group_name and group_alias')
                
                # Check if ID is provided for edit, otherwise create or get by name
                group_name_id = group_name_data.get('id')
                if group_name_id:
                    # Update existing group name by ID
                    report_group_name = ReportGroupName.objects.filter(id=group_name_id).first()
                    if not report_group_name:
                        raise exceptions.ValidationError(f'ReportGroupName with id {group_name_id} does not exist')
                    report_group_name.group_name = group_name_data['group_name']
                    report_group_name.group_alias = group_name_data['group_alias']
                    report_group_name.report_group_heading = report_group_heading
                    report_group_name.report = report
                    report_group_name.is_active = True
                    report_group_name.save()
                else:
                    # Check if ReportGroupName exists, update or create
                    report_group_name, group_created = ReportGroupName.objects.get_or_create(
                        report=report,
                        report_group_heading=report_group_heading,
                        group_name=group_name_data['group_name'],
                        defaults={
                            'group_alias': group_name_data['group_alias'],
                            'is_active': True
                        }
                    )
                    if not group_created:
                        # Update existing group name
                        report_group_name.group_alias = group_name_data['group_alias']
                        report_group_name.is_active = True
                        report_group_name.save()
                
                values_mapping = group_name_data.get('values_mapping', [])
                if not values_mapping or not isinstance(values_mapping, list):
                    raise exceptions.ValidationError(f'values_mapping is required for group_name: {group_name_data.get("group_name")} and must be a non-empty array')
                
                created_mappings = []
                for mapping in values_mapping:
                    if not mapping.get('type') or not mapping.get('value'):
                        raise exceptions.ValidationError('Each values_mapping entry must have type and value')
                    
                    # Collect academic_year and standard values for ReportFilter
                    if mapping['type'] == 'academic_year':
                        # Split comma-separated values and add to list
                        values = [v.strip() for v in mapping['value'].split(',')]
                        academic_year_values.extend(values)
                    elif mapping['type'] == 'standard':
                        # Split comma-separated values and add to list
                        values = [v.strip() for v in mapping['value'].split(',')]
                        standard_values.extend(values)
                    
                    # Check if ID is provided for edit, otherwise create or get by type
                    mapping_id = mapping.get('id')
                    if mapping_id:
                        # Update existing mapping by ID
                        mapping_obj = ReportGroupNameValuesMapping.objects.filter(id=mapping_id).first()
                        if not mapping_obj:
                            raise exceptions.ValidationError(f'ReportGroupNameValuesMapping with id {mapping_id} does not exist')
                        mapping_obj.type = mapping['type']
                        mapping_obj.value = mapping['value']
                        mapping_obj.report_group_name = report_group_name
                        mapping_obj.is_active = True
                        mapping_obj.save()
                    else:
                        # Check if ReportGroupNameValuesMapping exists, update or create
                        existing_mapping = ReportGroupNameValuesMapping.objects.filter(
                            report_group_name=report_group_name,
                            type=mapping['type']
                        ).first()
                        
                        if existing_mapping:
                            # Update existing mapping
                            existing_mapping.value = mapping['value']
                            existing_mapping.is_active = True
                            existing_mapping.save()
                            mapping_obj = existing_mapping
                        else:
                            # Create new mapping
                            mapping_obj = ReportGroupNameValuesMapping.objects.create(
                                report_group_name=report_group_name,
                                type=mapping['type'],
                                value=mapping['value'],
                                is_active=True
                            )
                    
                    created_mappings.append({
                        'id': mapping_obj.id,
                        'type': mapping_obj.type,
                        'value': mapping_obj.value
                    })
                
                created_groups.append({
                    'id': report_group_name.id,
                    'group_name': report_group_name.group_name,
                    'group_alias': report_group_name.group_alias,
                    'values_mapping': created_mappings
                })
            
            created_headings.append({
                'id': report_group_heading.id,
                'heading': report_group_heading.heading,
                'heading_alias': report_group_heading.heading_alias,
                'group_names': created_groups
            })
        
        # Update or create ReportFilter entries for academic_year and standard (for report_id 8)
        if report_id == 8:
            # Update or create academic_year filter
            if academic_year_values:
                # Get unique values and join as comma-separated string
                unique_academic_year_values = sorted(set(academic_year_values))
                academic_year_filter_values = ','.join(unique_academic_year_values)
                academic_year_filter, created = ReportFilter.objects.get_or_create(
                    report_id=report_id,
                    filter_name='academic_year',
                    defaults={
                        'filter_alias': 'Academic Year',
                        'is_mandatory': False,
                        'is_default_selected': False,
                        'filter_data_type': 0,
                        'filter_seleted_values': academic_year_filter_values
                    }
                )
                if not created:
                    academic_year_filter.filter_seleted_values = academic_year_filter_values
                    academic_year_filter.save()
            
            # Update or create standard filter
            if standard_values:
                # Get unique values and join as comma-separated string
                unique_standard_values = sorted(set(standard_values))
                standard_filter_values = ','.join(unique_standard_values)
                standard_filter, created = ReportFilter.objects.get_or_create(
                    report_id=report_id,
                    filter_name='standard',
                    defaults={
                        'filter_alias': 'Standard',
                        'is_mandatory': False,
                        'is_default_selected': False,
                        'filter_data_type': 0,
                        'filter_seleted_values': standard_filter_values
                    }
                )
                if not created:
                    standard_filter.filter_seleted_values = standard_filter_values
                    standard_filter.save()
        
        # ── Auto-create / update RecoverableAsset records for Sundry Debtors ──
        # When report is group_wise_pending_report, each group should appear as
        # a recoverable asset under the Sundry Debtors category.
        if report.report_name == 'group_wise_pending_report':
            from decimal import Decimal
            from django.db.models import Sum, Q
            from apps.finance.models.recoverable_asset import RecoverableAsset
            from apps.finance.models.recoverable_asset_category import RecoverableAssetCategory
            from apps.finance.models.fee import FeePlan, FeeStandardMapping
            from apps.finance.models.feeCollection import PaymentDetail

            sundry_category = RecoverableAssetCategory.objects.filter(
                code='SUNDRY_DEBTORS', is_active=True
            ).first()

            if sundry_category:
                # Collect all ReportGroupName IDs we just created/updated
                all_group_name_ids = []
                for heading_info in created_headings:
                    for group_info in heading_info.get('group_names', []):
                        group_id = group_info.get('id')
                        if group_id:
                            all_group_name_ids.append(group_id)

                            # Extract filter IDs from value mappings
                            fee_type_ids = []
                            std_ids = []
                            ay_ids = []
                            for vm in group_info.get('values_mapping', []):
                                vals = [int(v.strip()) for v in str(vm.get('value', '')).split(',') if v.strip().isdigit()]
                                if vm['type'] == 'feetype':
                                    fee_type_ids.extend(vals)
                                elif vm['type'] == 'standard':
                                    std_ids.extend(vals)
                                elif vm['type'] == 'academic_year':
                                    ay_ids.extend(vals)

                            # Compute total pending = total payable - total paid
                            pending_amount = Decimal('0.00')
                            if fee_type_ids:
                                # Get matching FeeStandardMapping IDs
                                fsm_filter = Q(fee_type_id__in=fee_type_ids)
                                if std_ids:
                                    fsm_filter &= Q(standard_id__in=std_ids)
                                if ay_ids:
                                    fsm_filter &= Q(academic_year_id__in=ay_ids)
                                fsm_ids = list(FeeStandardMapping.objects.filter(fsm_filter).values_list('id', flat=True))

                                if fsm_ids:
                                    # Total payable from FeePlan.rate
                                    total_payable = FeePlan.objects.filter(
                                        standard_fee_id__in=fsm_ids
                                    ).aggregate(total=Sum('rate'))['total'] or 0

                                    # Total paid from PaymentDetail.amount_paid (only active collections)
                                    total_paid = PaymentDetail.objects.filter(
                                        fee_plan__standard_fee_id__in=fsm_ids,
                                        fee_collection__is_active=True
                                    ).aggregate(total=Sum('amount_paid'))['total'] or 0

                                    pending_amount = Decimal(str(total_payable)) - Decimal(str(total_paid))
                                    if pending_amount < 0:
                                        pending_amount = Decimal('0.00')

                            # Upsert RecoverableAsset for this group
                            asset, created_asset = RecoverableAsset.objects.get_or_create(
                                report_group_name_id=group_id,
                                defaults={
                                    'name': group_info.get('group_name', ''),
                                    'asset_type': 'SUNDRY',
                                    'category': sundry_category,
                                    'opening_balance': pending_amount,
                                    'closing_balance': pending_amount,
                                    'status': 'APPROVED',
                                    'is_active': True,
                                    'created_by': self.request.user if hasattr(self, 'request') else None,
                                    'updated_by': self.request.user if hasattr(self, 'request') else None,
                                }
                            )
                            if not created_asset:
                                # Update name and recompute balance
                                asset.name = group_info.get('group_name', asset.name)
                                asset.opening_balance = pending_amount
                                asset.closing_balance = pending_amount
                                asset.is_active = True
                                asset.updated_by = self.request.user if hasattr(self, 'request') else None
                                asset.save()

                # Soft-delete assets for deleted groups
                if delete_group_ids:
                    RecoverableAsset.objects.filter(
                        report_group_name_id__in=delete_group_ids,
                        category=sundry_category
                    ).update(is_active=False)

                # Also soft-delete assets for groups under deleted headings
                if delete_heading_ids:
                    deleted_heading_group_ids = list(ReportGroupName.objects.filter(
                        report_group_heading_id__in=delete_heading_ids
                    ).values_list('id', flat=True))
                    if deleted_heading_group_ids:
                        RecoverableAsset.objects.filter(
                            report_group_name_id__in=deleted_heading_group_ids,
                            category=sundry_category
                        ).update(is_active=False)

        response_data = {
            'report_id': report.id,
            'report_name': report.report_name,
            'headings': created_headings
        }
        
        return {'data_list': response_data, 'data': 'Custom report group wise report created successfully'}

def get_custom_report_grouping(self):
    report_id = self.request.GET.get('report_id')
    
    if not report_id:
        raise ValidationError({'error': 'report_id is required'})
    
    report = Report.objects.filter(id=report_id, is_active=True).first()
    if not report:
        raise ValidationError({'error': f'Report with id {report_id} does not exist'})
    
    # Get all ReportGroupName entries for this report
    report_group_names = ReportGroupName.objects.filter(
        report_id=report_id,
        is_active=True
    ).select_related('report_group_heading').prefetch_related('report_group_name_values_mapping_report_group_name')
    
    # Organize data by heading
    headings_dict = {}
    
    for group_name in report_group_names:
        heading = group_name.report_group_heading
        
        # Initialize heading if not exists
        if heading.id not in headings_dict:
            headings_dict[heading.id] = {
                'id': heading.id,
                'heading': heading.heading,
                'heading_alias': heading.heading_alias,
                'group_names': []
            }
        
        # Get values_mapping for this group_name
        values_mapping = ReportGroupNameValuesMapping.objects.filter(
            report_group_name=group_name,
            is_active=True
        ).values('id', 'type', 'value')
        
        # Add group_name to heading
        headings_dict[heading.id]['group_names'].append({
            'id': group_name.id,
            'group_name': group_name.group_name,
            'group_alias': group_name.group_alias,
            'values_mapping': list(values_mapping)
        })
    
    response_data = {
        'report_id': report.id,
        'report_name': report.report_name,
        'headings': list(headings_dict.values())
    }
    
    return {'data': response_data}