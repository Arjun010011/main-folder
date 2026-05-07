import os
from apps.shared.services import SharedService,UploadTypeService
from apps.shared.services import FormdefinitionService,SharedService
from apps.shared.models.custom_report import Report,ReportColumn,ReportFilter
from apps.classes.models.enrollment import StudentStandardMapping
from apps.students.serializers import StudentListSerializer
from apps.students.models import Student
from apps.institutes.models import Institute, AcademicYear
from apps.shared.services_shared.custom_report import download_fee_pending_report,get_report_data
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.students.services.student import get_student_admission_form

def promoted_students_list(self,data):
    try:
        report_data = get_report_data(self,data['report_id'])
        filter_dict={}
        columns = []
        for column in report_data['column_data']:
            columns.append(column['column_name'])
        for filters in report_data['filter_data']:
            if filters['filter_seleted_values']:
                filter_dict[filters['filter_name']] = filters['filter_seleted_values'].split(',')
                filter_dict[filters['filter_name']] = [int(i) for i in filter_dict[filters['filter_name']]]
        if 'from_academic_year' in filter_dict:
            from_filterqueryset={'academic_year__in':filter_dict['from_academic_year']}
        if 'from_standard' in filter_dict:
            from_filterqueryset['standard__in'] = filter_dict['from_standard']
        if 'to_academic_year' in filter_dict:
            to_filterqueryset={'academic_year__in':filter_dict['to_academic_year']}
            to_academic_year=filter_dict['to_academic_year']
        if 'to_standard' in filter_dict:
            to_filterqueryset['standard__in'] = filter_dict['to_standard']
        download_excel = self.request.GET.get('download_excel')
        from_standard_data = StudentStandardMapping.objects.filter(
            **from_filterqueryset
        ).values('standard', 'academic_year', 'standard__name', 'student')
        to_standard_data = StudentStandardMapping.objects.filter(
            **to_filterqueryset
        ).values('standard', 'academic_year', 'standard__name', 'student')
        from_student_standard_mapping = {}
        to_student_standard_mapping = {}
        extra_columns = []
        for student_standard in from_standard_data:
            if student_standard['student'] not in from_student_standard_mapping:
                from_student_standard_mapping[student_standard['student']] = {}
            from_student_standard_mapping[student_standard['student']] = {
                'standard': student_standard['standard'],
                'standard_name': student_standard['standard__name']
            }
        for student_standard in to_standard_data:
            if student_standard['student'] not in to_student_standard_mapping:
                to_student_standard_mapping[student_standard['student']] = {}
            to_student_standard_mapping[student_standard['student']] = {
                'standard': student_standard['standard'],
                'standard_name': student_standard['standard__name']
            }
        common_keys = from_student_standard_mapping.keys() & to_student_standard_mapping.keys()
        student_filter = {
            'is_active': True, 'id__in': common_keys
        }
        student_queryset = Student.objects.filter(**student_filter)
        student_serializer = StudentListSerializer(student_queryset, many=True)
        stu_data = student_serializer.data
        student_standard_data={}
        student_ids = [stu['id'] for stu in stu_data]
        admission_num_list = get_student_admission_form(self, student_ids)
        for student in stu_data:
            student['to_standard'] = to_student_standard_mapping[student['id']]['standard']
            student['to_standard_name'] = to_student_standard_mapping[student['id']]['standard_name']
            if student['to_standard'] not in student_standard_data:
                student_standard_data[student['to_standard']]={
                    'student_list':[],'standard': student['to_standard'],
                    'standard_name': student['to_standard_name'],
                }
            student['admission_num']=admission_num_list[student['id']]
            student_standard_data[student['to_standard']]['student_list'].append(student)
        file_name = 'Student Report'
        acad = AcademicYear.objects.filter(id__in=to_academic_year).first()
        file_name += ' ' + acad.start_date.strftime('%Y') + ' ' + acad.end_date.strftime('%Y')+'.xlsx'
        download_report= download_fee_pending_report(self, student_standard_data,file_name,extra_columns,report_data['column_data'])
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
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id,{'error': e.args[:250]})
        else:
            raise e  
        
