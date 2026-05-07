from django.urls import path
from rest_framework import routers
from apps.notification.views import (
    BulkNotificationViewSet, FCMDeviceViewSet, NotificationViewSet, UnregisterFcmViewSet, 
    NotificationTypeListViewSet, NotificationTemplateViewSet, LanguageViewSet, NotificationMediumViewSet,
    SmsTemplateViewSet, GetCustomBulkNotificationViewSet, UserNotificationCategoryViewSet,
    NotificationCategoryViewSet
)

router = routers.DefaultRouter()
app_name = "csvupload"

# router.register(r'sendpushnotification', PushNotificationViewSet, basename='sendpushnotification')
router.register(r'fcmregister', FCMDeviceViewSet, basename='fcmregister')
router.register(r'unregister', UnregisterFcmViewSet, basename='unregister')
router.register(r'notification', NotificationViewSet, basename='notification')
router.register(r'notificationtypelist', NotificationTypeListViewSet, basename='notificationtypelist')
router.register(r'notificationtemplate', NotificationTemplateViewSet, basename='notificationtemplate')
router.register(r'bulknotification', BulkNotificationViewSet, basename='bulknotification')
router.register(r'language', LanguageViewSet, basename='language')
router.register(r'medium', NotificationMediumViewSet, basename='medium')
router.register(r'smstemplatelist', SmsTemplateViewSet, basename='medium')
router.register(r'getcustombulknotification', GetCustomBulkNotificationViewSet, basename='getcustombulknotification')
router.register(r'usernotificationcategory', UserNotificationCategoryViewSet, basename='usernotificationcategory')
router.register(r'notificationcategory', NotificationCategoryViewSet, basename='notificationcategory')
urlpatterns = router.urls
