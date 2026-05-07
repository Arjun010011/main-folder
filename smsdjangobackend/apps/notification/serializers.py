from apps.notification.models.notification import BulkNotification, BulkNotificationCategory, BulkNotificationDocumentMapping, BulkNotificationUsers, NotificationLangauge, NotificationLog, NotificationMedium, NotificationTemplate, NotificationType
from apps.shared.serializers import DocumentSerializer
from apps.users.models import user
from apps.users.serializers import GroupSerializer, UserReadSerializer
from rest_framework import serializers
from apps.notification.models import  NotificationApiConfiguration

class NotificationApiConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationApiConfiguration
        fields = '__all__'

class NotificationLogSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationLog
        fields = '__all__'

class NotificationTypeSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationType
        fields = '__all__'

class NotificationTemplateSerializer(serializers.ModelSerializer):
    language_name = serializers.ReadOnlyField(source='language.name')
    notification_medium_name = serializers.ReadOnlyField(source='notification_medium.name')

    class Meta:
        model = NotificationTemplate
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('notification_medium', 'name'),
                message=('Notification Medium should be unique')
            )
        ]
        fields = '__all__'

class BulkNotificationDocumentMappingReadSerializer(serializers.ModelSerializer):
    document = DocumentSerializer(read_only=True)

    class Meta:
        model = BulkNotificationDocumentMapping
        fields = '__all__'

class BulkNotificationSerializer(serializers.ModelSerializer):
    notification_medium_name = serializers.ReadOnlyField(source='notification_medium.name')
    language_name = serializers.ReadOnlyField(source='language.name')
    notification_list = BulkNotificationDocumentMappingReadSerializer(many=True, source='bulk_notification_document_mapping_bulk_notification', read_only=True)

    class Meta:
        model = BulkNotification
        fields = '__all__'

class BulkNotificationUserSerializer(serializers.ModelSerializer):
    user = UserReadSerializer(read_only=True)

    class Meta:
        model = BulkNotificationUsers
        fields = '__all__'

class BulkNotificationReadSerializer(serializers.ModelSerializer):
    notification_medium_name = serializers.ReadOnlyField(source='notification_medium.name')
    language_name = serializers.ReadOnlyField(source='language.name')
    notification_list = BulkNotificationDocumentMappingReadSerializer(many=True, source='bulk_notification_document_mapping_bulk_notification', read_only=True)

    class Meta:
        model = BulkNotification
        fields = '__all__'

class LanguageSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationLangauge
        fields = '__all__'

class NotificationMediumSerializer(serializers.ModelSerializer):

    class Meta:
        model = NotificationMedium
        fields = '__all__'

class BulkNotificationDocumentMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = BulkNotificationDocumentMapping
        fields = '__all__'

class BulkNotificationCategorySerializer(serializers.ModelSerializer):

    class Meta:
        model = BulkNotificationCategory
        fields = '__all__'