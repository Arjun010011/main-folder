from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate
from django.utils.translation import gettext_lazy as _

def custom_create_notification_api(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    from apps.notification.default_variables import available_types
    from apps.notification.models.notification import NotificationType
    from apps.notification.default_variables import NotificationSupportedApis
    from apps.notification.models.notification import NotificationTypeMapping
    from apps.institutes.models.resource import Resource
    """
    Create content types for models in the given app.
    """
    try:
        NotificationApiData = apps.get_model('notification', 'NotificationApiConfiguration')
    except LookupError:
        return
    notifiation_queryset = NotificationApiData.objects.filter().values(
        'api_name', 'notification_medium', 'is_default', 'id', 'template','template_for_other_user','template_id'
    )
    notification_api_dict = {str(obj['api_name']) + '' + str(obj['notification_medium']): obj for obj in
                           notifiation_queryset}
    dataToSave = []
    for available in available_types:
        NotificationType.objects.get_or_create(name=available)
    notification_type = NotificationType.objects.all().values()
    notification_type = {noti['name']: noti['id'] for noti in notification_type}
    for index, notification in NotificationSupportedApis.items():
        temp_data_to_save = notification['data_to_save']
        temp_medium_message = {}
        for notification_medium in notification['data_to_save']['notification_medium']:
            temp_medium_message[f'default_{notification_medium}_message'] = temp_data_to_save[
                f'default_{notification_medium}_message']
            del temp_data_to_save[f'default_{notification_medium}_message']
        for notification_medium in notification['data_to_save']['notification_medium']:
            notification_template_key = ''
            notification_template_key_for_other_user = ''
            notification_template_id_key =''
            if notification_medium == 'email':
                notification_template_key = 'email_template'
                notification_template_key_for_other_user = 'email_template_for_other_user'
            elif notification_medium == 'sms':
                notification_template_key = 'sms_template'
                notification_template_key_for_other_user = 'sms_template_for_other_user'
            elif notification_medium == 'push':
                notification_template_key = 'push_template'
                notification_template_key_for_other_user = 'push_template_for_other_user'
            elif notification_medium == 'webpush':
                notification_template_key = 'webpush_template'
            elif notification_medium == 'whatsapp':
                notification_template_key = 'whatsapp_template'
                notification_template_id_key = 'whatsapp_template_id'
            temp_key = temp_data_to_save['api_name'] + '' + notification_medium
            if temp_key not in notification_api_dict:
                temp_data_to_save['default_message'] = temp_medium_message[f'default_{notification_medium}_message']
                temp_data_to_save['notification_medium'] = notification_medium
                temp_data_to_save['template_id'] = None
                if notification_medium == 'push':
                    temp_data_to_save['subject'] = temp_data_to_save['push_subject']
                    temp_data_to_save['template'] = temp_data_to_save['push_template'] if 'push_template' in temp_data_to_save else None
                    temp_data_to_save['template_for_other_user']=temp_data_to_save['push_template_for_other_user'] if 'push_template_for_other_user' in temp_data_to_save else None
                if notification_medium == 'email':
                    temp_data_to_save['subject'] = temp_data_to_save['email_subject']
                    temp_data_to_save['template'] = temp_data_to_save['email_template'] if 'email_template' in temp_data_to_save else None
                    temp_data_to_save['template_for_other_user']=temp_data_to_save['email_template_for_other_user'] if 'email_template_for_other_user' in temp_data_to_save else None
                if notification_medium == 'sms':
                    temp_data_to_save['subject'] = temp_data_to_save['sms_subject'] if 'sms_subject' in temp_data_to_save else None
                    temp_data_to_save['template'] = temp_data_to_save['sms_template'] if 'sms_template' in temp_data_to_save else None
                    temp_data_to_save['template_for_other_user']=temp_data_to_save['sms_template_for_other_user'] if 'sms_template_for_other_user' in temp_data_to_save else None
                if notification_medium == 'webpush':
                    temp_data_to_save['subject'] = temp_data_to_save['webpush_subject']
                    temp_data_to_save['template'] = temp_data_to_save['webpush_template'] if 'webpush_template' in temp_data_to_save else None
                if notification_medium == 'whatsapp':
                    temp_data_to_save['subject'] = temp_data_to_save['whatsapp_subject']
                    temp_data_to_save['template'] = temp_data_to_save['whatsapp_template'] if 'whatsapp_template' in temp_data_to_save else None
                    temp_data_to_save['template_id'] = temp_data_to_save['whatsapp_template_id']
                    temp_data_to_save['template_for_other_user']=temp_data_to_save['whatsapp_template_for_other_user'] if 'whatsapp_template_for_other_user' in temp_data_to_save else None
                enable_for_school = temp_data_to_save['enable_school'] if 'enable_school' in temp_data_to_save else 0
                saving_data = {'api_name': temp_data_to_save['api_name'], 'description': temp_data_to_save['description'],
                    'suggestion': temp_data_to_save['suggestion'], 'customized_message': temp_data_to_save['suggestion'],
                    'default_message': temp_data_to_save['default_message'], 'notification_medium': temp_data_to_save['notification_medium'],'template_id':temp_data_to_save['template_id'],
                    'enable_for_school': enable_for_school, 'subject': temp_data_to_save['subject'], 'template': temp_data_to_save['template'], 'template_for_other_user': temp_data_to_save['template_for_other_user'],
                        
                }
                dataToSave.append(NotificationApiData(**saving_data))
            else:
                if notification_template_key and notification_template_key in notification['data_to_save'] and temp_key in notification_api_dict and notification_api_dict[temp_key]['is_default'] and \
                    notification_api_dict[temp_key]['template'] != notification['data_to_save'][notification_template_key]:
                    notifcation_api_obj = NotificationApiData.objects.get(
                        id=notification_api_dict[temp_key]['id']
                    )
                    notifcation_api_obj.template = notification['data_to_save'][notification_template_key]
                    notifcation_api_obj.save()
                if notification_template_id_key and notification_template_id_key in notification['data_to_save'] and temp_key in notification_api_dict and notification_api_dict[temp_key]['is_default'] and \
                    notification_api_dict[temp_key]['template_id'] != notification['data_to_save'][notification_template_id_key]:
                    notifcation_api_obj = NotificationApiData.objects.get(
                        id=notification_api_dict[temp_key]['id']
                    )
                    notifcation_api_obj.template_id = notification['data_to_save'][notification_template_id_key]
                    notifcation_api_obj.save()
                if  notification_template_key_for_other_user and notification_template_key_for_other_user in notification['data_to_save'] and \
                    temp_key in notification_api_dict and notification_api_dict[temp_key]['is_default'] and \
                    notification_api_dict[temp_key]['template_for_other_user'] != notification['data_to_save'][notification_template_key_for_other_user]:
                    notifcation_api_obj = NotificationApiData.objects.get(
                            id=notification_api_dict[temp_key]['id']
                        )
                    notifcation_api_obj.template_for_other_user = notification['data_to_save'][notification_template_key_for_other_user]
                    notifcation_api_obj.save()
            try:
                obj = NotificationType.objects.get(id=notification_type[temp_data_to_save['type']['name']])
                NotificationTypeMapping.objects.get_or_create(api_name=temp_data_to_save['api_name'],notification_type=obj)
            except Exception as e:
                pass
        #hardcoded because this is not api based notification
    obj, created = NotificationType.objects.get_or_create(name='bulk_notification')
    NotificationTypeMapping.objects.get_or_create(api_name='bulk_notification', notification_type=obj)
    if dataToSave:
        NotificationApiData.objects.using(using).bulk_create(dataToSave)

class NotificationConfig(AppConfig):
    name = 'apps.notification'
    verbose_name = _("Notification Apis List")

    def ready(self):
        post_migrate.connect(custom_create_notification_api, sender=self)
