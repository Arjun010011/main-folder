""" For each update staff teaching hour subject mapping will be deleted please be careful while using this id"""
from django.db import transaction
from django.db.models.functions import Concat
from django.db.models import Value as V
from rest_framework import exceptions

from apps.classes.models import Subject
from apps.shared.services_shared.common import get_teaching_staff_group_ids
from apps.staffs.models import Staff
from apps.staffs.serializers import StaffSubjectSerilalizer
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.hr.models import StaffTeachingHour, StaffHourSubjectMapping
from apps.shared.services import SharedService
from apps.staffs.services.staff import get_staff_for_academic_year
from apps.hr.serializers import StaffTeachingHourSerializer, StaffHourSubjectMappingSerializer


def add_subject_to_staff(self, data):
    with transaction.atomic(using=get_current_db_name()):
        validate_staff_subject_mapping(self, data)
        instance = StaffTeachingHour.objects.get(id=data['id']) if 'id' in data else None
        serializer = StaffTeachingHourSerializer(instance=instance, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        teachingHour = serializer.save()
        dataAlreadyPresent = StaffHourSubjectMapping.objects.filter(staff_teaching_hour=teachingHour.id)
        # subjectMapping = {subject.subject.id: subject for subject in dataAlreadyPresent}
        subjectMapping={}
        for subject in dataAlreadyPresent:
            key=str(subject.subject.id)+'-'+str(subject.standard_section.id) if subject.standard_section else str(subject.subject.id)+'-'+''
            subjectMapping[key] = subject
        dataToSave = []
        data['subject'] = list(set(data['subject']))
        if not data.get('standard_section'):
            for subject_id in data['subject']:
                key = f"{subject_id}-"
                if key not in subjectMapping:
                    dataToSave.append({
                        'staff_teaching_hour': teachingHour.id,
                        'subject': subject_id,
                        'standard_section': None
                    })

            for key, subjectData in subjectMapping.items():
                if not subjectData.standard_section and subjectData.subject.id not in data['subject']:
                    subjectData.delete()

        else:
            for standard_section, subjects in data['standard_section'].items():
                for subject_id in subjects:
                    key = f"{subject_id}-{standard_section}"
                    if key not in subjectMapping:
                        dataToSave.append({
                            'staff_teaching_hour': teachingHour.id,
                            'subject': subject_id,
                            'standard_section': standard_section
                        })

        for key, subjectData in subjectMapping.items():
            section_id = subjectData.standard_section.id if subjectData.standard_section else ''
            subj_id = subjectData.subject.id
            if not subjectData.id:
                continue
            if not data.get('standard_section'):
                if not subjectData.standard_section and subj_id not in data['subject']:
                    if subjectData.id:
                        subjectData.delete()
                continue
            if str(section_id) not in data['standard_section']:
                if subjectData.id:
                    subjectData.delete()
                continue

            if subj_id not in data['standard_section'][str(section_id)]:
                if subjectData.id:
                    subjectData.delete()
        # for subjectId in data['subject']:
        #     subject = subjectMapping.get(subjectId, None)
        #     if subject is None:
        #         dataToSave.append({'staff_teaching_hour': teachingHour.id, 'subject': subjectId})
        # for subject_id, subjectData in subjectMapping.items():
        #     if subject_id not in data['subject']:
        #         subjectData.delete()
        serializer = StaffHourSubjectMappingSerializer(data=dataToSave, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        response = {'Reason': 'Data updated successfully' if instance else 'Data added succesfully'}
        return response


def validate_staff_subject_mapping(self, data):
    # if len(data['subject']) != len(set(data['subject'])):
    #     raise exceptions.ValidationError('Duplicates elements found')
    try:
        time = data['max_hour'].split(':')
        if len(time) > 2:
            raise Exception()
    except:
        raise exceptions.ValidationError('Invalid Time Format')


# def validate_staff_subject_mapping1(self, data):
#     response = {'Result': True, 'Reason': ''}
#     try:
#         listOfColumns = []
#         dataToSave = {}
#         for listOfItems in data['subject']:
#             a = [data['subject']]
#         listOfColumns.append(self.get_queryset().select_related('staff_teaching_hour').values_list('staff_teaching_hour_id__academic_year_id','staff_teaching_hour__staff_id','subject_id'))
#         duplicateArray = []
#         for dataList in listOfColumns:
#             if dataList not in duplicateArray:
#                 duplicateArray.append(dataList)
#             else:
#                 response['Result'] = False
#                 response['Reason'] = 'Duplicate entry found'
#                 return response
#     except Exception as e:
#         return {'Result':False, 'Reason': e.args}
#     return response

""" when no parameter we retrieve all staff data with assigned subject only. when academic year
    passed to the params we will retrieve the all staff and retrieve subject not assigned to that academic year.
    when both academic year and staff are set we retrieve assigned and unassigned subject for the individual staff
"""


def get_staff_subject(self):
    staffId = self.request.GET.get('staff', None)
    academicYear = self.request.GET.get('academic_year', None)
    staffIdsForAcademic = get_staff_for_academic_year(self, academicYear)
    if not staffIdsForAcademic:
        return {'data': []}
    self.queryset = self.get_queryset().filter(staff__in=staffIdsForAcademic)
    response = SharedService.read_data(self, True)
    standard_section = {}
    if academicYear and staffId:
        subjectIds = []
        if len(response['data']):
            tmpData = response['data'][0]
            response['data'] = {}
            response['data'] = tmpData
            for val in response['data']['assigned_subjects']:
                subjectIds.append(val['subject_id'])
                if val['standard_section']:
                    if val['standard_section'] not in standard_section:
                        standard_section[val['standard_section']]=[]
                    standard_section[val['standard_section']].append(val['subject_id'])
            response['data']['standard_section_subject'] = standard_section
        else:
            response['data'] = {}
        queryset = Subject.objects.exclude(id__in=subjectIds).filter(is_active=True).values()
        for data in queryset:
            text = ''
            data['subject_id']=data['id']
            if data['is_language']:
                if data['sequence'] == 1:
                    text = '[Lang 1]'
                if data['sequence'] == 2:
                    text = '[Lang 2]'
                if data['sequence'] == 3:
                    text = '[Lang 3]'
            data['subject_alias'] = f'{data["name"]} {text}'
        response['data']['unassigned_subject'] = queryset
        # response['data']['subjects_class_and_staff'] = staffStandardSubjects #get subject for standard and also assigned to staff
        queryset = Staff.objects.get(id=staffId)
        response['data']['staff']=staffId
        response['data']['staff_name'] = str(queryset)
    elif academicYear:
        staff_ids = [val['staff'] for val in response['data']]
        teaching_group_ids = get_teaching_staff_group_ids(self)
        teacher_staff_ids = User.objects.filter(is_active=True, groups__in=teaching_group_ids).values_list('staff',
                                                                                             flat=True)  # only teaching staff to fetched
        queryset = Staff.objects.exclude(id__in=staff_ids).filter(id__in=teacher_staff_ids)
        serializer = StaffSubjectSerilalizer(queryset, many=True)
        for temp in serializer.data:
            if 'assigned_subjects' not in temp:
                temp['assigned_subjects'] = []
        response['data'] += serializer.data
    if not academicYear and not staffId:
        staffId = self.request.user.staff.id
    return response


# staff and teacher mapping for timetable
def get_staff_subject_mapping(self, request):
    academicYearId = request.GET.get('academic_year', None)
    if not academicYearId:
        raise exceptions.ValidationError('Please provide academic year id')
    resData = self.get_queryset().filter(staff_teaching_hour__academic_year=academicYearId).values('subject_id',
                                                                                                   'staff_teaching_hour__staff')
    staffList = Staff.objects.filter(is_active=True).annotate(
        staff_name=Concat('first_name', V(' '), 'middle_name', V(' '), 'last_name')) \
        .values('id', 'staff_name')
    staffList = {data['id']: data['staff_name'] for data in staffList}
    subjectList = Subject.objects.filter(is_active=True).values('id', 'name')
    subjectList = {data['id']: data['name'] for data in subjectList}
    finalResult = {"subject_staff_mapping": {}, 'staffList': staffList, 'subjectList': subjectList}
    for data in resData:
        if data['subject_id'] in finalResult['subject_staff_mapping']:
            finalResult['subject_staff_mapping'][data['subject_id']].append(data['staff_teaching_hour__staff'])
        else:
            finalResult['subject_staff_mapping'][data['subject_id']] = []
            finalResult['subject_staff_mapping'][data['subject_id']].append(data['staff_teaching_hour__staff'])
    return {'Reason': '', 'data': finalResult}