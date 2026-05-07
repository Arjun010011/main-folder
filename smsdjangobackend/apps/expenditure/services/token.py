from datetime import datetime

from django.contrib.contenttypes.models import ContentType
from rest_framework import exceptions

from apps.expenditure.models import Expense
from apps.expenditure.models.token import TokenMapping
from apps.institutes.models import Institute
from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService, CounterService, PDFService, UploadTypeService
from apps.transport.models import Vehicle
from apps.users.models import User


def add_token(self, data):
    if float(data['liter']) <= 0:
        raise exceptions.ValidationError('Enter a valid liter.')
    if data['vehicle']:
        vehicle = Vehicle.objects.get(id=data['vehicle'])
        content_type = ContentType.objects.get_for_model(vehicle)
        content_type_data = {'content_type': content_type, 'object_id': data['vehicle']}
        token, created = TokenMapping.objects.get_or_create(**content_type_data)
        data.update({'token_for': token.pk})
    counter, prefix, postfix = CounterService.get_countered_value(self, 'FUEL_TOKEN',
                                                                  financial_year=data['financial_year'])
    data['token_num'] = f'{prefix}{counter.value}{postfix}'
    response = SharedService.add_data(self, data, False)
    CounterService.increment_counter(self, counter)
    SharedService.custom_thread(add_token_notification, self, response['data'])
    return response


def add_token_notification(self, data):
    data['today'] = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    data['institute'] = Institute.get_institute(self)
    data['for_date'] = SharedService.date_to_obj(data['for_date']).strftime('%d/%m/%Y')
    filename = PDFService.receipt(self, data, data['token_num'], 'fuelToken.html', True)
    url = UploadTypeService.upload_local_file(filename, path='fuel_token')
    user = User.objects.get(staff=data['staff']).pk
    body = f'Hi {data["staff_first_name"]},<br/><br/>Fuel Token is generated for the for the vehicle number '
    body += f'{data["other_details"]["vehicle_num"]}. Please find attached document for same.<br/><br/>Thanks,<br/>{self.request.user.staff.first_name}.'
    return send_notification('token_create', body=body, touserIds=[user],
                             attachmentLinks=[{"url": url, "file_name": filename.split('.')[0]}],
                             pushData={'extra_params': {'heading': 'Fuel Token'}})


def get_token(self):
    queryset = self.filter_queryset(self.get_queryset())
    if self.request.GET.get('from_date') and self.request.GET.get('to_date'):
        queryset = queryset.filter(for_date__range=(self.request.GET.get('from_date'), self.request.GET.get('to_date')))
    is_active = self.request.GET.get('is_active')
    if is_active == '0' or is_active == '1':
        queryset = queryset.filter(is_active=is_active)
    elif is_active == '2':
        queryset = queryset.filter(token_expense__isnull=False)
    elif is_active == '3':
        queryset = queryset.filter(is_active=1, token_expense__isnull=True)
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    for token in data:
        token.update({'is_claimed': queryset.filter(token_expense__token=token['id']).exists()})
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
