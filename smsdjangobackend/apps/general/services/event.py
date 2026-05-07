from django.db import transaction
from django.db.models import Q
from rest_framework import exceptions

from apps.general.serializers import EventGetSerializer
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name


def add_data(self, data):
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response


def add_event(self, data):
    if event_validation(self, data):
        with transaction.atomic(using=get_current_db_name()):
            return SharedService.add_data(self, data, isList=False)


def update_event(self, data, **kwargs):
    if event_validation(self, data, True):
        return SharedService.update_data(self, data, **kwargs)


def event_validation(self, data, update=False):
    response = {}
    if data['from_date'] > data['to_date']:
        raise exceptions.ValidationError('Incorrect date range!')
    if data['start_time'] >= data['end_time']:
        raise exceptions.ValidationError('Incorrect time range!')
    if len(data['staff']) != len(set(data['staff'])):
        raise exceptions.ValidationError('Duplicate staff Found!')
    if len(data['student']) != len(set(data['student'])):
        raise exceptions.ValidationError('Duplicate student Found!')
    eventList = self.get_queryset().filter(is_active=True)
    if not data['is_school']:
        if not data['standard_section']:
            raise exceptions.ValidationError('Standard section cant be empty!')
        if len(data['standard_section']) != len(set(data['standard_section'])):
            raise exceptions.ValidationError('Duplicate class Found!')
    if update:
        eventList = eventList.exclude(id=self.kwargs['pk'])
    if eventList:
        eventDateList = eventList.filter(
            Q(from_date__gte=data['from_date'], from_date__lte=data['to_date']) | Q(
                to_date__gte=data['from_date'], to_date__lte=data['to_date'])).order_by('from_date')
        if eventDateList:
            eventTimeList = eventDateList.filter(
                Q(start_time__gte=data['start_time'], start_time__lte=data['end_time']) | Q(
                    end_time__gte=data['start_time'], end_time__lte=data['end_time']))
            # if eventTimeList:
            #     serializer = EventGetSerializer(eventTimeList, many=True)
            #     for data in serializer.data:
            #         if data['standard_section']:
            #             for row, standard in enumerate(data['standard_section']):
            #                 response.update(
            #                     {row: f"Event {data['name']} has conflicts! for {standard['standard_name']}"
            #                           f" {standard['section_name']} from {data['from_date']} to "
            #                           f"{data['to_date']} and from {data['start_time']} to {data['end_time']}"})
            #         else:
            #             response.update({'0': f"Event {data['name']} has conflicts! from {data['from_date']} to "
            #                                   f"{data['to_date']} and from {data['start_time']} to {data['end_time']}"})
            #     raise exceptions.ValidationError(response)
    return True
