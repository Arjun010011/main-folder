from django.db.models import Q
from django.contrib.auth.models import Group
from rest_framework.views import Response, APIView
from rest_framework import viewsets
from apps.classes.models.enrollment import Enrollment
from apps.classes.models.standard import Standard, StandardSectionMapping

from rest_framework import exceptions
from apps.notification.models import NotificationApiConfiguration
from apps.notification.models.notification import BulkNotification, BulkNotificationCategory, BulkNotificationUsers, NotificationLangauge, NotificationLog, NotificationMedium, NotificationTemplate, NotificationType
from apps.shared.services import SharedService,NotificationBodyTemplate
from apps.notification.serializers import (
    BulkNotificationCategorySerializer, BulkNotificationReadSerializer, BulkNotificationSerializer, BulkNotificationUserSerializer, LanguageSerializer, NotificationApiConfigurationSerializer,
    NotificationLogSerializer, NotificationTemplateSerializer, NotificationTypeSerializer, NotificationMediumSerializer
    )
from apps.notification.services.notification_service import add_bulk_notification_data, add_notification_template, get_sms_template_list, get_user_notification_category, register_push, get_notification_list, unregister_push
from apps.users.models.user import User
from apps.users.serializers import UserReadSerializer
from apps.users.services.permissions import IsAuthenticated


class NotificationApiConfiViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationApiConfigurationSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = NotificationApiConfiguration.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class FCMDeviceViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']
    permission_classes = (IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        response = register_push(self, request.data)
        return Response(response)


class NotificationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'put', 'post']
    permission_classes = (IsAuthenticated,)
    filterset_fields = ['notification_medium']
    serializer_class = NotificationLogSerializer
    
    def get_queryset(self):
        self.queryset = NotificationLog.objects.all().order_by('-created')
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_notification_list(self, request)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        temp = {'is_read_by_user': True}
        response = SharedService.update_data(self, temp, **{'partial': True})
        return Response(response)

    #read all message
    def create(self, request, *args, **kwargs):
        NotificationLog.objects.filter(
            user=self.request.user.id
        ).update(
            is_read_by_user=True
        )
        return Response({'Reason': 'Marked all as read'})

class UnregisterFcmViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']
    permission_classes = (IsAuthenticated,)

    def create(self, request, *args, **kwargs):
        response = unregister_push(self, request.data)
        return Response(response)

class NotificationTypeListViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    permission_classes = (IsAuthenticated,)
    serializer_class = NotificationTypeSerializer
    
    def get_queryset(self):
        filter_query = {}
        app_type = self.request.GET.get('app_type')
        if app_type:
            if app_type == 'student':
                filter_query['visible_to__in'] = ['all', 'student']
            elif app_type == 'staff':
                filter_query['visible_to__in'] = ['all', 'staff']
        self.queryset = NotificationType.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class NotificationTemplateViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete']
    serializer_class = NotificationTemplateSerializer

    def get_queryset(self):
        self.queryset = NotificationTemplate.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_notification_template(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'bulk_notification_selected_template__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data, 'Not able to delete. Template already used')
        return Response(response)

class BulkNotificationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get', 'post', 'delete']
    serializer_class = BulkNotificationSerializer
    search_fields = ['message_data', 'heading']

    def get_queryset(self):
        from_date = self.request.GET.get('from_date')
        to_date = self.request.GET.get('to_date')
        filter_query = {}
        if not self.request.user.is_superuser:
            reporting_user_ids = list(User.getUserHierarchy(self, None, True, False))
            reporting_user_ids.append(self.request.user.id)
            filter_query['created_by_user__in'] = reporting_user_ids
        if from_date and to_date:
            self.queryset = BulkNotification.objects.filter(
                Q(created__range=(from_date, to_date)) | Q(schedule__range=(from_date, to_date)), **filter_query
            )
        else:
            self.queryset = BulkNotification.objects.filter(
                **filter_query
            )
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        if self.request.GET.get('get_user_details'):
            search = self.request.GET.get('search')
            q_query  = Q()
            if search:
                q_query = Q(user__staff__first_name__icontains=search) \
                     | Q(user__staff__middle_name__icontains=search) \
                     | Q(user__staff__last_name__icontains=search) \
                     | Q(user__student__first_name__icontains=search) \
                     | Q(user__student__middle_name__icontains=search) \
                     | Q(user__student__last_name__icontains=search)
            filter = {
                'bulk_notification': self.kwargs['pk']
            }
            not_queryset = BulkNotificationUsers.objects.filter(q_query,
                **filter
            )
            serializer = BulkNotificationUserSerializer(not_queryset, many=True)
            data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
            return Response({'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}})
        else:
            self.serializer_class = BulkNotificationReadSerializer
            response = SharedService.read_data(self)
            standard_section_data = {}
            response['data']['standard_section_names'] = []
            response['data']['group_names'] = []
            response['data']['user_names'] = []
            standard_section_ids = response['data']['standard_section_ids'].split(',') if response['data']['standard_section_ids'] else None
            if standard_section_ids:
                standard_section_data = {standard_section['id']:standard_section for standard_section in StandardSectionMapping.objects.filter(id__in=standard_section_ids).values(
                    'standard__name', 'standard_id', 'section_id', 'section__name', 'id'
                )}
            if response['data']['standard_section_ids']:
                temp = {}
                for standard_section in response['data']['standard_section_ids'].split(','):
                    if int(standard_section) in standard_section_data:
                        standard_section = standard_section_data[int(standard_section)]
                        if standard_section['standard_id'] not in temp:
                            temp[standard_section['standard_id']] = {'section_list': [], 'standard_name': standard_section['standard__name'],
                                'standard_id': standard_section['standard_id']
                            }
                        temp[standard_section['standard_id']]['section_list'].append({
                            'section': standard_section['section_id'], 'section_name': standard_section['section__name'],
                            'id': standard_section['id']
                        })
                response['data']['standard_section_names'] = temp.values()
            return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_bulk_notification_data(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.get_queryset().filter(id=self.kwargs['pk']).delete()
        return Response({'Reason': 'Data Deleted Successfully'})

class LanguageViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = LanguageSerializer

    def get_queryset(self):
        self.queryset = NotificationLangauge.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class NotificationMediumViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = NotificationMediumSerializer
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = NotificationMedium.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

class SmsTemplateViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = None
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return None

    def list(self, request, *args, **kwargs):
        response = get_sms_template_list(self, request)
        return Response(response)

class GetCustomBulkNotificationViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']
    serializer_class = None

    def list(self, request, *args, **kwargs):
        from apps.notification.templates import messages_format
        api_configuration_data = NotificationApiConfiguration.objects.filter(api_name__in=['username_password_bulk_notification_staff','username_password_bulk_notification_student']).values(
            'notification_medium', 'template','template_for_other_user','template_id','api_name'
        )
        notification_dict={}
        for notification in api_configuration_data:
            if notification['api_name'] not in notification_dict:
                notification_dict[notification['api_name']] = {}
            if notification['notification_medium'] not in notification_dict[notification['api_name']]:
                notification_dict[notification['api_name']][notification['notification_medium']] = notification['template']
        temp = [{
            'id': 'send_username_password_to_user',
            'label': 'Send Username and Password For Student',
            'email_title': '',
            'push_title': '',
            'email_message': notification_dict['username_password_bulk_notification_student']['email'],
            'push_message': None, 
            # 'email_message': '',
            # 'push_message': '',
            'sms_message': notification_dict['username_password_bulk_notification_student']['sms'],
            'whatsapp_title': '',
            'whatsapp_message': notification_dict['username_password_bulk_notification_student']['whatsapp'],
            'supported_mediums': ['push', 'email','sms','whatsapp']
        },
        {
            'id': 'send_username_password_to_user_staff',
            'label': 'Send Username and Password For Staff',
            'email_title': '',
            'push_title': '',
            'email_message': notification_dict['username_password_bulk_notification_staff']['email'],
            'push_message': None, 
            # 'email_message': '',
            # 'push_message': '',
            'sms_message': notification_dict['username_password_bulk_notification_staff']['sms'],
            'whatsapp_title': '',
            'whatsapp_message': notification_dict['username_password_bulk_notification_staff']['whatsapp'],
            'supported_mediums': ['push', 'email','sms','whatsapp']
        }]
        return Response({'data': temp})

class UserNotificationCategoryViewSet(viewsets.ModelViewSet):
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_user_notification_category(self)
        return Response(response)
    
class NotificationCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BulkNotificationCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = BulkNotificationCategory.objects.filter(is_active=True)
        return self.queryset

    def create(self, request):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def retrieve(self, request, pk=None):
        response = SharedService.read_data(self)
        return Response(response)

    def update(self, request, *args, **kwargs):
        if BulkNotification.objects.filter(bulk_notification_category=self.kwargs['pk']):
            raise exceptions.ValidationError('Cant edit, Notification Category Referred')
        response = SharedService.update_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'bulk_notification_bulk_notification_category__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data, 'Not able to delete. Notification Category Type already mapped to BulkNotification')
        return Response(response)

# class SmsTemplateListViewSet(viewsets.ModelViewSet):
#     http_method_names = ['post']
#     serializer_class = SmsTemplateListSerializer

#     def get_queryset(self):
#         self.queryset = SmsTemplateList.objects.all()
#         return self.queryset

#     def create(self, request, *args, **kwargs):
#         response = add_sms_template_list(self, request.data)
#         return Response(response)
