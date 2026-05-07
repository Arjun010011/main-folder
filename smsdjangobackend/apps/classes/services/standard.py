from datetime import datetime
from itertools import groupby
from operator import itemgetter
from django.db.models import Q

from django.db import transaction
from django.db.models import Sum
from rest_framework import exceptions
from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.classes.models import Standard
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping, StandardSectionMapping
from apps.classes.models.studentleave import StaffStandardSectionMapping
from apps.classes.models.subject import AssignSubject
from apps.classes.serializers import StandardSerializer
from apps.finance.models import ApplicationPlan, FeeStandardMapping
from apps.forms.models import EnquiryStudent, ApplicationStudent
from apps.institutes.models import AcademicYear
from apps.shared.models import Counter
from apps.shared.serializers import CounterSerializer
from apps.shared.services import SharedService, CounterService, ConfigurationService
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.tenants.services.middlewares import get_current_db_name

PASSED_OUT = 1
FAILED = 2

@receiver(post_save, sender=Standard)
def handled_standard_save(sender, instance, **kwargs):
    CounterService.create_counter_for_standard([instance.id])

def get_standard_for_current_year(self, params={}, return_obj=False):
    branch = self.request.GET.get('branch')
    board = self.request.GET.get('board')
    academic_year = self.request.GET.get('academic_year')
    only_standards = self.request.GET.get('only_standards')
    exclude_query = {}
    filter_query = {'is_active': True}
    if params:
        if 'branch' in params and params['branch']:
            branch = params['branch']
        if 'board' in params and params['board']:
            board = params['board']
        if 'academic_year' in params and params['academic_year']:
            academic_year = params['academic_year']
        if 'filter_query' in params and params['filter_query']:
            filter_query.update(filter_query)
    order_by = ['sequence']
    query = Q()
    if branch:
        filter_query['branch'] = branch
    if board:
        filter_query['board'] = board
    if academic_year:
        year = academic_year
        filter_query['present_standard__academic_year'] = year
    else:
        year = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
        query = Q(present_standard__academic_year=year) | Q(id=PASSED_OUT)
    if not self.request.user.is_anonymous and not self.request.user.is_superuser and self.request.user and self.request.user.staff:
        setting_value = ConfigurationService.get_setting_value('staffstandardmapping')
        if int(setting_value) == 1:
            filter_query['id__in'] = StaffStandardMapping.objects.filter(staff=self.request.user.staff).values_list('standard', flat=True)
        if int(setting_value) == 2:
            filter_query['id__in'] = StaffStandardSectionMapping.objects.filter(staff=self.request.user.staff,is_active=True,standard_section__academic_year=academic_year).values_list('standard_section__standard', flat=True)
    if only_standards:
        exclude_query['codename__in'] = ['passedout', 'failed']
    queryset = Standard.objects.filter(query, **filter_query).exclude(**exclude_query).distinct().order_by(*order_by)
    if return_obj:
        return queryset
    serializer = StandardSerializer(queryset, many=True)
    if queryset.filter(standardyearname__isnull=False).exists() and self.request.GET.get('is_finance_page'):
        standard_year_name_dict = {}
        return_data=[]
        for standard in serializer.data:
            if standard['standardyearname']:
                if standard['standardyearname'] not in standard_year_name_dict:
                    standard_year_name_dict[standard['standardyearname']] = []
                standard_year_name_dict[standard['standardyearname']].append(standard)
            else:
                return_data.append(standard)
        if standard_year_name_dict:
            for standardyearname in standard_year_name_dict:
                for index,standarddata in enumerate(standard_year_name_dict[standardyearname]):
                    if index == 0:
                        sequence = standarddata['sequence']
                        stu = standarddata
                        stu['name'] = standarddata['standardyearname_name']
                    if standarddata['sequence']<sequence:
                        sequence = standarddata['sequence']
                        stu = standarddata
                        stu['name'] = standarddata['standardyearname_name']
                return_data.append(stu)
        return {'data': return_data}
    return {'data': serializer.data}

def add_data(self, data):
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response

def add_dise_code(self, data, **kwargs):
    with transaction.atomic(using=get_current_db_name()):
        for std in data:
            self.kwargs['pk'] = std['id']
            kwargs['partial'] = True
            SharedService.update_data(self, std, **kwargs)
    return {'Reason': 'Data updated Successfully!'}

def get_standard_and_section(self, academicYear=None):
    academicYear = self.request.GET.get('academic_year', academicYear)
    if not academicYear:
        academicYear = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
        if not academicYear:
            raise exceptions.ValidationError('No Academic year for today')
    filter_query = {
        'academic_year': academicYear, 'standard__is_active': True
    }
    if self.request.GET.get('branch'):
        filter_query['standard__branch'] = self.request.GET.get('branch')
    if self.request.GET.get('board'):
        filter_query['standard__board'] = self.request.GET.get('board')
    if self.request.user and self.request.user.staff:
        setting_value = ConfigurationService.get_setting_value('staffstandardmapping')
        if int(setting_value) == 1:
            filter_query['standard__in'] = StaffStandardMapping.objects.filter(staff=self.request.user.staff).values_list('standard', flat=True)
        if int(setting_value) == 2:
            filter_query['id__in'] = StaffStandardSectionMapping.objects.filter(staff=self.request.user.staff).values_list('standard_section', flat=True)
    standard_section = StandardSectionMapping.objects.filter(**filter_query).order_by(
        'standard__sequence', 'section__name').values('id', 'standard', 'standard__name', 'section__name', 'section')
    result_data = {}
    standard_section_ids = []
    for data in standard_section:
        standard_section_ids.append(data['id'])
        section_data = {'id': data['section'], 'name': data['section__name'], 'standard_section': data['id']}
        if data['standard'] in result_data:
            result_data[data['standard']]['sections'].append(section_data)
        else:
            result_data[data['standard']] = {'id': data['standard'], 'name': data['standard__name'], 'sections': []}
            result_data[data['standard']]['sections'].append(section_data)
    response = {'data': [x for x in result_data.values()], 'standard_section_ids': standard_section_ids}
    return response



def add_class_mapping(self, data):
    serializer = None
    if data['standard'] in [PASSED_OUT, FAILED]:
        raise exceptions.ValidationError('Incorrect Standard.')
    for section in data['section']:
        if not int(section['strength']) or int(section['strength']) > 999:
            raise exceptions.ValidationError(f'{section["section"]}: Enter Valid strength.')
        section.update({'academic_year': data['academic_year'], 'standard': data['standard'],
                        'section': section['section'], 'strength': section['strength']})
    SharedService.duplicate_list_two_objects(data['section'], 'standard', 'section')
    setting_values = ConfigurationService.get_setting_values(['is_residential', 'unique_reg_num'],
                                                             data['academic_year'], data['standard'])
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data['section'])
        if serializer:
            serializer.save()
    return response

def add_multiple_class_mapping(self, data):
    serializer = None
    academic_year = data['academic_year']
    copy_from_academic_year = data['copy_from_academic_year']
    standard_ids = data['standard_ids'] if 'standard_ids' in data else None
    if not academic_year or not copy_from_academic_year:
        raise exceptions.ValidationError('academic_year/copy_from_academic_year should be mandatory')
    temp_filter = {'academic_year':copy_from_academic_year}
    if standard_ids:
        temp_filter['standard__in'] = standard_ids
    standard_section_ids = StandardSectionMapping.objects.filter(**temp_filter).values()
    existin_standard_data = StandardSectionMapping.objects.filter(academic_year=academic_year).values()
    existing_standard_section_ids = {}
    for s in existin_standard_data:
        if s['standard_id'] not in existing_standard_section_ids:
            existing_standard_section_ids[s['standard_id']] = []
        existing_standard_section_ids[s['standard_id']].append(s['section_id'])
    data_to_save = []
    with transaction.atomic(using=get_current_db_name()):
        for standard_section in standard_section_ids:
            if standard_section['standard_id'] not in existing_standard_section_ids or standard_section['section_id'] not in existing_standard_section_ids[standard_section['standard_id']]:
                setting_values = ConfigurationService.get_setting_values(['is_residential', 'unique_reg_num'],
                                                    academic_year, standard_section['standard_id'])
                if setting_values['unique_reg_num'] == '0':
                    counters = Counter.objects.filter(academic_year=academic_year, standard=standard_section['standard_id'],
                                                    is_active=True)
                    counter_list = list()
                    standard = Standard.objects.get(id=standard_section['standard_id'])
                    codename = standard.codename.replace('standard', '')
                    for name, value in CounterService.COUNTERS.items():
                        if value['standard'] is True and (not counters.filter(type=value['type'])):
                            if setting_values['is_residential'] == '0' and name == 'ADMISSION_R':
                                continue
                            counter_list.append(
                                {'type': value['type'], 'alias_name': value['alias_name'], 'academic_year': academic_year,
                                'value': 1, 'standard': standard_section['standard_id'], 'prefix': value['prefix'] + codename,
                                'postfix': value['postfix']})
                    serializer = CounterSerializer(data=counter_list, many=True)
                    serializer.is_valid(raise_exception=True)
                data_to_save.append(
                    {
                        'academic_year': academic_year,
                        'standard': standard_section['standard_id'],
                        'section': standard_section['section_id'],
                        'strength': standard_section['strength']
                    }
                )
        if data_to_save:
            response = SharedService.add_data(self, data_to_save)
        else:
            raise exceptions.ValidationError('All data are already copied')
        if serializer:
            serializer.save()
    return response


def delete_class_mapping(self, data):
    standard_section = self.get_queryset()
    standardSection = standard_section.filter(id__in=data)
    standardIds = list(set(standardSection.values_list('standard', flat=True)))
    academicYear = list(set(standardSection.values_list('academic_year', flat=True)))
    section = len(standard_section.filter(academic_year__in=academicYear, standard__in=standardIds))
    deleteCounter = False
    if section == 1 or section == len(data):
        if ApplicationPlan.objects.filter(academic_year__in=academicYear, standard__in=standardIds).exists():
            raise exceptions.ValidationError('Cannot delete as data is already referred')
        if EnquiryStudent.objects.filter(entry_academic_year__in=academicYear,
                                         current_standard__in=standardIds).exists():
            raise exceptions.ValidationError('Cannot delete as student(s) already submitted enquiry form for standard')
        if ApplicationStudent.objects.filter(entry_academic_year__in=academicYear,
                                             current_standard__in=standardIds).exists():
            raise exceptions.ValidationError(
                'Cannot delete as student(s) already submitted application form for standard')
        if FeeStandardMapping.objects.filter(academic_year__in=academicYear, standard__in=standardIds).exists():
            raise exceptions.ValidationError('Cannot delete fee is assigned for the Standard')
        if StudentStandardMapping.objects.filter(academic_year__in=academicYear, standard__in=standardIds).exists():
            raise exceptions.ValidationError('Cannot delete as student(s) already admitted for standard')
        deleteCounter = True
    with transaction.atomic(using=get_current_db_name()):
        try:
            standardSection.delete()
            if deleteCounter:
                Counter.objects.filter(academic_year__in=academicYear, standard__in=standardIds,
                                       is_active=True).delete()
        except Exception as e:
            raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    return {'Reason': 'Data deleted Successfully!'}


def read_class_mapping(self):
    queryset = self.get_queryset().filter(standard__is_active=True, section__is_active=True,
                                          academic_year=self.request.GET.get('academic_year')).order_by(
        'standard__sequence').order_by('standard__branch__name')
    data = queryset.values('standard', 'standard__name').annotate(Sum('strength'))
    section = queryset.values('id', 'standard', 'section', 'section__name', 'strength').order_by('standard','section__name')
    rows = groupby(section, itemgetter('standard'))
    # sectiondata = {key: list(items) for key, items in rows}
    sectiondata = {}
    standard_section_ids = []
    for key, items in rows:
        sectiondata[key] = list(items)
    for key,items in sectiondata.items():
        for item in items:
            standard_section_ids.append(item['id'])
    enrollment_data = Enrollment.objects.filter(standard_section_id__in=standard_section_ids).values() 
    strengthdata = {}
    for enrollment in enrollment_data:
        if enrollment['standard_section_id'] not in strengthdata:
           strengthdata[enrollment['standard_section_id']]  = 0
        strengthdata[enrollment['standard_section_id']] += 1
    for key, items in sectiondata.items():
        for item in items:
            item['current_strength'] = 0
            if item['id'] in strengthdata:
                item['current_strength'] += strengthdata[item['id']]
    for items in data:
        items.update({'section': sectiondata[items['standard']]})
        total_strength = sum(section['current_strength'] for section in items['section'])
        items['total_strength'] = total_strength
    return {'data': data}
    



"""
    eg: [
            {
                "standard_name": "Standard 2",
                "standard": 7,
                "section_list": [
                    {
                        "section_name": "Section A",
                        "standard_name": "Section A",
                        "standard_section": 61
                   },
                ]
            }
        ]
"""
def get_section_inside_standard(standard_section_ids, standard_subject_mapping=False):
    result_data = {}
    return_data = []
    standard_obj = StandardSectionMapping.objects.filter(id__in=standard_section_ids).values('standard', 'section', 'id', 'standard__name', 'section__name')
    for standard_data in standard_obj:
        standard_section_ids.append(standard_data['id'])
        tempsection = {'section_name': standard_data['section__name'], 'standard_name': standard_data['standard__name'], 'standard_section': standard_data['id']}
        tempstandard = {'standard_name': standard_data['standard__name'], 'standard': standard_data['standard'], 'section_list': []}
        if standard_data['standard'] not in result_data:
            result_data[standard_data['standard']] = tempstandard
        result_data[standard_data['standard']]['section_list'].append(tempsection)
    if result_data:
        return_data = result_data.values()
    if standard_subject_mapping:
        subject_data = AssignSubject.objects.filter(standard_section__in=standard_section_ids).values('id', 'subject','standard_section', 'subject__name')
        subject_mapping_data = {}
        for subject_row in subject_data:
            if subject_row['standard_section'] not in subject_mapping_data:
                subject_mapping_data[subject_row['standard_section']] = {subject_row['subject']: {}}
            if subject_row['subject'] not in subject_mapping_data[subject_row['standard_section']]:
                subject_mapping_data[subject_row['standard_section']][subject_row['subject']] = {}
            subject_mapping_data[subject_row['standard_section']][subject_row['subject']] = subject_row
        for standard_data in result_data.values():
            for index, standard_section in enumerate(standard_data['section_list']):
                if standard_section['standard_section'] in subject_mapping_data:
                    standard_data['section_list'][index]['subject_list'] = subject_mapping_data[standard_section['standard_section']]
    return return_data

def get_standard_section_for_standard(academic_year, standard_ids):
    return StandardSectionMapping.objects.filter(academic_year=academic_year, standard__in=standard_ids).values('id', 'standard')

def get_only_first_sem_standards(self, data):
    standard_year_name_dict = {}
    return_data=[]
    for standard in data:
        if standard['standardyearname']:
            if standard['standardyearname'] not in standard_year_name_dict:
                standard_year_name_dict[standard['standardyearname']] = []
            standard_year_name_dict[standard['standardyearname']].append(standard)
        else:
            return_data.append(standard)
    if standard_year_name_dict:
        for standardyearname in standard_year_name_dict:
            for index,standarddata in enumerate(standard_year_name_dict[standardyearname]):
                if index == 0:
                    sequence = standarddata['sequence']
                    stu = standarddata
                    stu['name'] = standarddata['standardyearname_name']
                if standarddata['sequence']<sequence:
                    sequence = standarddata['sequence']
                    stu = standarddata
                    stu['name'] = standarddata['standardyearname_name']
            return_data.append(stu)
    return return_data