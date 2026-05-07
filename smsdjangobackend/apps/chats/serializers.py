from rest_framework import serializers

from apps.chats.models.chat import Conversation, ConversationStandardSectionMapping, Message, UserConversationMapping
from apps.shared.serializers import DocumentUrlSerializer
from apps.shared.services_shared.common import get_full_name
from apps.staffs.models.staff import Staff
from apps.students.models.student import Student
from apps.users.models.user import User

class MessageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Message
        extra_kwargs = {'conversation': {'required': True}}
        fields = '__all__'

class ConversationSerializer(serializers.ModelSerializer):

    class Meta:
        model = Conversation
        extra_kwargs = {'conversation_type': {'required': True}}
        fields = '__all__'

class ConversationReadSerializer(serializers.ModelSerializer):
    document_details = DocumentUrlSerializer(read_only=True, source='document')

    class Meta:
        model = Conversation
        fields = ['id', 'document_details']

class ConversationDetailedReadSerializer(serializers.ModelSerializer):
    document_details = DocumentUrlSerializer(read_only=True, source='document')

    class Meta:
        model = Conversation
        fields = '__all__'

class UserConversationMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserConversationMapping
        extra_kwargs = {'user': {'required': True},
                        'conversation': {'required': True}
                        }
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('user', 'conversation'),
                message=('User and Conversation Should be Unique')
            )
        ]
        fields = '__all__'

class ConversationStandardSectionMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = ConversationStandardSectionMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('standard_section', 'conversation'),
                message=('standard_section and Conversation Should be Unique')
            )
        ]
        fields = '__all__'

class ChatStudentSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['profile_pic_details', 'name', 'id']

class ChatStaffSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    full_name = serializers.SerializerMethodField()

    def get_full_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['profile_pic_details', 'full_name', 'id']

class ChatUserReadSerializer(serializers.ModelSerializer):
    staff = ChatStaffSerializer(read_only=True)
    student = ChatStudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['student', 'staff', 'username', 'is_superuser', 'id']

class MessageReadSerializer(serializers.ModelSerializer):
    from_user_data = ChatUserReadSerializer(source='from_user')
    document_content_type = serializers.ReadOnlyField(source='document.content_type')

    class Meta:
        model = Message
        fields = ['conversation', 'data', 'document', 'is_message_seen', 'from_user', 'from_user_data', 'id', 'from_user', 'document_content_type']

class MessageIndividualSerializer(serializers.ModelSerializer):
    document = DocumentUrlSerializer()
    from_user_data = ChatUserReadSerializer(source='from_user')

    class Meta:
        model = Message
        fields = ['conversation', 'data', 'document', 'is_message_seen', 'from_user_data', 'id', 'created']

class ChatStudentSearchSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)
    user_id = serializers.ReadOnlyField(read_only=True, source='user_student.id')

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True), fields=('first_name', 'dob'),
                message='Student with same Name and Date of birth is already exists.')]
        fields = ['name', 'profile_pic_details', 'current_standard_name', 'user_id', 'id']

class ChatUserReadSearchSerializer(serializers.ModelSerializer):
    staff = ChatStaffSerializer(read_only=True)
    student = ChatStudentSearchSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['student', 'staff', 'username', 'is_superuser', 'id']

class UserConversationMappingReadSerializer(serializers.ModelSerializer):
    user_data = ChatUserReadSerializer(read_only=True, source='user')

    class Meta:
        model = UserConversationMapping
        fields = '__all__'
