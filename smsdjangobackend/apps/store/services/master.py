from rest_framework import exceptions

from apps.shared.services import SharedService


def update_data(self, data, filters, **kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_data(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response


def add_sub_category(self, data):
    SharedService.duplicate_list_one_object(data['sub_category'], 'name')
    for item in data['sub_category']:
        item.update({'category': data['category']})
    response = SharedService.add_data(self, data['sub_category'])
    return response


def add_property_value(self, data):
    SharedService.duplicate_list_one_object(data['values'], 'name')
    for item in data['values']:
        item.update({'properties': data['properties']})
    response = SharedService.add_data(self, data['values'])
    return response


def add_item(self, data):
    SharedService.duplicate_list_one_object(data['values'], 'name')
    for item in data['values']:
        item.update({'properties': data['properties']})
    response = SharedService.add_data(self, data['values'])
    return response


def get_data(self):
    queryset = self.filter_queryset(self.get_queryset())
    paginated_queryset, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    serializer = self.get_serializer(paginated_queryset, many=True)
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': serializer.data}}
