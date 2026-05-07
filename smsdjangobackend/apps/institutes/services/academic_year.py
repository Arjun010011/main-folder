from datetime import datetime, timedelta, date

from django.db import transaction
from django.db.models import Q, F
from rest_framework import exceptions

from apps.institutes.models import AcademicYear
from apps.institutes.models.academic_year_branch import AcademicYearBranchMapping
from apps.institutes.serializers import AcademicYearSerializer,AcademicYearBranchMappingReadSerializer
from apps.shared.serializers import CounterSerializer
from apps.shared.services import ConfigurationService, SharedService, CounterService
from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.models.counter import Counter,CounterStandardMapping
from apps.shared.models.fee_type_counter import CounterFeeTypeMapping, CounterMiscTypeMapping
from apps.shared.models.counter_standard_section import CounterStandardSectionMapping


def get_counter_list_for_academic_year(self, academic_year, data=None):
    """
    Build the list of counter dicts for the given academic year.
    Takes self and academic_year; optional data (with 'branch' key) for previous year branch filter.
    Returns counterList (list of counter payloads for CounterSerializer).
    """
    counterList = list()
    default_postfix = ''
    for name, value in CounterService.COUNTERS.items():
        if value['standard'] is False and value['financial_year'] is False and value['is_global_counter'] is False:
            counterList.append(
                {
                    'type': value['type'],
                    'alias_name': value['alias_name'],
                    'academic_year': academic_year.pk,
                    'value': 1,
                    'prefix': f'{value["prefix"]}-{str(academic_year.start_date.year)[-2:]}-{str(academic_year.end_date.year)[-2:]}-',
                    'postfix': value['postfix'],
                }
            )
            if value.get('postfix') is not None:
                default_postfix = value['postfix']
    counter_fee_type_mapping = CounterFeeTypeMapping.objects.filter(is_active=True, is_global=False).distinct().values('counter_type_name', 'group_name')
    counter_misc_type_mapping = CounterMiscTypeMapping.objects.filter(is_active=True, is_global=False).distinct().values('counter_type_name', 'group_name')
    counter_standard_mapping = CounterStandardMapping.objects.filter(is_active=True, is_global=False).distinct().values('counter_type_name', 'group_name')
    counter_standard_section_mapping = CounterStandardSectionMapping.objects.filter(is_active=True).distinct().values('counter_type_name', 'group_name')
    academic_year_filter = {
        'is_active': True,
        'finance_enabled': True,
        'end_date__year': academic_year.start_date.year,
    }
    if data and data.get('branch'):
        academic_year_filter['academic_year_branch_mapping_academic_year__branch__in'] = data['branch']
    previous_year = AcademicYear.objects.filter(**academic_year_filter).first()
    counter_prefix_mapping = {}
    counter_fee_type_list = []
    if previous_year:
        for counter_fee_type in counter_fee_type_mapping:
            counter_fee_type_list.append(f"{counter_fee_type['counter_type_name']}_{counter_fee_type['group_name']}")
        for counter_misc_type in counter_misc_type_mapping:
            counter_fee_type_list.append(f"{counter_misc_type['counter_type_name']}_{counter_misc_type['group_name']}")
        for counter_standard in counter_standard_mapping:
            counter_fee_type_list.append(f"{counter_standard['counter_type_name']}_{counter_standard['group_name']}")
        for counter_standard_section in counter_standard_section_mapping:
            counter_fee_type_list.append(f"{counter_standard_section['counter_type_name']}_{counter_standard_section['group_name']}")
        previous_counter_list = Counter.objects.filter(academic_year=previous_year, type__in=counter_fee_type_list).values('type', 'prefix')
        for counter in previous_counter_list:
            counter_prefix_mapping[counter['type']] = counter['prefix']
    year_suffix = f'{str(academic_year.start_date.year)[-2:]}-{str(academic_year.end_date.year)[-2:]}-'
    for counter_fee_type in counter_fee_type_mapping:
        ctype = f"{counter_fee_type['counter_type_name']}_{counter_fee_type['group_name']}"
        prefix = counter_prefix_mapping.get(ctype)
        temp = {
            'type': ctype,
            'alias_name': ctype,
            'academic_year': academic_year.pk,
            'value': 1,
            'postfix': default_postfix,
            'prefix': prefix + year_suffix if prefix else f'{counter_fee_type["group_name"]}_{year_suffix}',
        }
        counterList.append(temp)
    for counter_misc_type in counter_misc_type_mapping:
        ctype = f"{counter_misc_type['counter_type_name']}_{counter_misc_type['group_name']}"
        prefix = counter_prefix_mapping.get(ctype)
        temp = {
            'type': ctype,
            'alias_name': ctype,
            'academic_year': academic_year.pk,
            'value': 1,
            'postfix': default_postfix,
            'prefix': prefix + year_suffix if prefix else f'{counter_misc_type["group_name"]}_{year_suffix}',
        }
        counterList.append(temp)
    for counter_standard in counter_standard_mapping:
        ctype = f"{counter_standard['counter_type_name']}_{counter_standard['group_name']}"
        prefix = counter_prefix_mapping.get(ctype)
        temp = {
            'type': ctype,
            'alias_name': ctype,
            'academic_year': academic_year.pk,
            'value': 1,
            'postfix': default_postfix,
            'prefix': prefix + year_suffix if prefix else f'{counter_standard["group_name"]}_{year_suffix}',
        }
        counterList.append(temp)
    for counter_standard_section in counter_standard_section_mapping:
        ctype = f"{counter_standard_section['counter_type_name']}_{counter_standard_section['group_name']}"
        prefix = counter_prefix_mapping.get(ctype)
        temp = {
            'type': ctype,
            'alias_name': ctype,
            'academic_year': academic_year.pk,
            'value': 1,
            'postfix': default_postfix,
            'prefix': prefix + year_suffix if prefix else f'{counter_standard_section["group_name"]}_{year_suffix}',
        }
        counterList.append(temp)
    return counterList


def add_academic_year(self, data):
    serializer = self.get_serializer(data=data)
    serializer.is_valid(raise_exception=True)
    startdate = SharedService.date_to_obj(data['start_date'])
    enddate = SharedService.date_to_obj(data['end_date'])
    if int(ConfigurationService.get_setting_value('is_academic_branch_mapping')):
        if 'branch' in data and data['branch']:
            if self.get_queryset().filter(Q(start_date__lte=startdate, academic_year_branch_mapping_academic_year__branch__in = data['branch']) |
             Q(end_date__gte=enddate, academic_year_branch_mapping_academic_year__branch__in = data['branch'])).exists():
                raise exceptions.ValidationError('The given date range has conflicts with other academic year of same Branch!')
        else:
            # raise exceptions.ValidationError('Branch is required!')
            pass
    else:
        if self.get_queryset().filter(start_date__year=startdate.year, end_date__year=enddate.year).exists():
            # raise exceptions.ValidationError('The given date range has conflicts with other academic year!')
            pass
    with transaction.atomic(using=get_current_db_name()):
        academic_year = academic_year_check(self, serializer, data, startdate, enddate)
        counterList = get_counter_list_for_academic_year(self, academic_year, data)
        if counterList:
            counter_serializer = CounterSerializer(data=counterList, many=True)
            counter_serializer.is_valid(raise_exception=True)
            counter_serializer.save()
    return {'Reason': 'Academic year added successfully!', 'data': {'id': academic_year.pk}}


def update_academic_year(self, data, isDelete=False, **kwargs):
    response = {'Reason': ''}
    updatetime = 3
    queryset = self.get_queryset()
    partial = kwargs.pop('partial', False)
    instance = self.get_object()
    if isDelete:
        queryset.filter(id=instance.id).update(is_active=False)
        response['Reason'] = 'Academic year Deleted Successfully!'
    else:
        serializer = self.get_serializer(instance=instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        startdate = SharedService.date_to_obj(data['start_date'])
        enddate = SharedService.date_to_obj(data['end_date'])
        if int(ConfigurationService.get_setting_value('is_academic_branch_mapping')):
            if 'branch' in data and data['branch']:
                if queryset.filter(~Q(id=instance.id),Q(start_date__lte=startdate,academic_year_branch_mapping_academic_year__branch__in=data['branch'])|
                Q(end_date__gte=enddate,academic_year_branch_mapping_academic_year__branch__in=data['branch'])).exists():
                    raise exceptions.ValidationError('The given date range has conflicts with other academic year of same Branch!')
            else:
                pass
                # raise exceptions.ValidationError('Branch is required!')
        else:
            if queryset.filter(~Q(id=instance.id), start_date__year=startdate.year,
                           end_date__year=enddate.year).exists():
                pass
                # raise exceptions.ValidationError('The given date range has conflicts with other academic year!')
        response['Reason'] = 'Academic year updated successfully!'
        academic_year_check(self, serializer, data, startdate, enddate, instance.id)
    return response


def academic_year_check(self, serializer, data, startdate, enddate, instance_id=None):
    listyear = self.get_queryset().filter(Q(end_date__year=startdate.year)
                                          | Q(start_date__year=enddate.year)).order_by('start_date')
    if instance_id:
        listyear = listyear.exclude(id=instance_id)
    if not int(ConfigurationService.get_setting_value('is_academic_branch_mapping')):
        if listyear.count() == 2:
            row1 = listyear.filter(end_date__lt=startdate).exists()
            row2 = listyear.filter(start_date__gt=enddate).exists()
            if not (row1 and row2):
                raise exceptions.ValidationError('Date Conflicts!')
            else:
                academic_year = serializer.save()
        elif listyear.count() == 1:
            if listyear.filter(Q(end_date__year=startdate.year, end_date__gte=startdate)
                            | Q(start_date__year=enddate.year, start_date__lte=enddate)).exists():
                raise exceptions.ValidationError('Date Conflicts!')
            else:
                academic_year = serializer.save()
        else:
            academic_year = serializer.save()
    else:
        academic_year = serializer.save()
        academic_year_branches = []
        if not instance_id and data.get("branch"):
            for branch in data['branch']:
                academic_year_branches.append({
                    "academic_year": academic_year.pk,
                    "branch": branch
                })
            branch_serializer = AcademicYearBranchMappingReadSerializer(data=academic_year_branches, many=True)
            branch_serializer.is_valid(raise_exception=True)
            branch_serializer.save()
        elif instance_id and data.get("branch"):
            existing_academic_year_branches = AcademicYearBranchMapping.objects.filter(academic_year=instance_id).values_list('branch', flat=True)
            for branch in data['branch']:
                if branch not in existing_academic_year_branches:
                    academic_year_branches.append({
                        "academic_year": academic_year.pk,
                        "branch": branch
                    })
            if academic_year_branches:
                branch_serializer = AcademicYearBranchMappingReadSerializer(data=academic_year_branches, many=True)
                branch_serializer.is_valid(raise_exception=True)
                branch_serializer.save()
            excisting_to_delete_branch = set(existing_academic_year_branches) - set(data['branch'])
            AcademicYearBranchMapping.objects.filter(academic_year=instance_id, branch__in=excisting_to_delete_branch).delete()
    return academic_year


def get_current_academic_year(self):
    response = SharedService.read_data(self, True)
    queryset = AcademicYear.get_academic_year_for_date(self, datetime.today(), True)
    if queryset:
        for data in response['data']:
            if data['id'] == queryset.pk:
                data['current_year'] = True
                break
    return response

# 1 return_obj -> returns object
# 2 returns values ->
# if branch is not given return default obj
def get_academic_year_for_branch(self, return_obj=1, return_default_obj=None, order_by=[]):
    branch_ids = self.request.GET.get('branch')
    if branch_ids and int(ConfigurationService.get_setting_value('is_academic_branch_mapping')):
        filter_query = {'is_active': True,'academic_year_branch_mapping_academic_year__branch__in':branch_ids}
        if self.request.GET.get('is_finance_page'):
            filter_query['finance_enabled'] = True
        obj = AcademicYear.objects.filter(**filter_query)
        if order_by:
            obj = obj.order_by(*order_by)
        if return_obj == 1:
            return obj
        else:
            return obj.values(
                'start_date', 'end_date', branch_name=F('academic_year_branch_mapping_academic_year__branch__name'),
                branch_code=F('academic_year_branch_mapping_academic_year__branch__code'),
                branch_description=F('academic_year_branch_mapping_academic_year__branch__description')
            )
    else:
        if return_obj == 1:
            return return_default_obj
        else:
            serializer = AcademicYearSerializer(return_default_obj, many=True)
            return serializer.data