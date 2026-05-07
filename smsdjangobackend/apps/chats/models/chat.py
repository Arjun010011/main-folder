from datetime import datetime
from django.db import models
from django.db.models import JSONField

from apps.classes.models.standard import StandardSectionMapping
from apps.shared.models.document import Document
from apps.users.models.user import User

class Conversation(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True) #null for individual conversation
    description = models.CharField(max_length=255, null=True, blank=True)#null for individual conversation
    is_active = models.BooleanField(default=True)
    conversation_type = models.IntegerField(default=1) # 1 - individual conversation # 2 - group
    message_last_updated = models.DateTimeField()
    document = models.ForeignKey(Document, null=True, blank=True, related_name='conversation_document', on_delete=models.SET_NULL)
    is_only_admin_can_text = models.BooleanField(default=False)
    group_status = models.IntegerField(default=1)#group status 1 means group exited but we need to show dat group in the list
    created_by = models.ForeignKey(User, null=True, blank=True, related_name='conversation_created_by', on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ConversationStandardSectionMapping(models.Model):
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, blank=True, related_name='conversation_standard_section_mapping_standard_section', 
                                         on_delete=models.SET_NULL)
    conversation = models.ForeignKey(Conversation, null=True, blank=True, related_name='conversation_standard_section_mapping_conversation',
    on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
    

class UserConversationMapping(models.Model):
    user = models.ForeignKey(User, null=True, blank=True, related_name='user_conversation_mapping_user', on_delete=models.SET_NULL)
    conversation = models.ForeignKey(Conversation, null=True, blank=True, related_name='user_conversation_mapping_conversation', on_delete=models.SET_NULL)
    is_admin = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Message(models.Model):
    conversation = models.ForeignKey(Conversation, null=True, blank=True, related_name='message_conversation', on_delete=models.SET_NULL)
    data = models.TextField(null=True, blank=True)
    document = models.ForeignKey(Document, related_name='message_document', on_delete=models.DO_NOTHING, blank=True, null=True)
    is_message_seen = models.BooleanField(default=False)#enable when all user sees the message
    is_active = models.BooleanField(default=True)
    from_user = models.ForeignKey(User, null=True, blank=True, related_name='message_from_user', on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        Conversation.objects.filter(message_last_updated=datetime.now())
        super().save(*args, **kwargs)

class MessageUserDetail(models.Model):
    read_by_user = models.ForeignKey(User, null=True, blank=True, related_name='message_user_detail_read_by_user', on_delete=models.SET_NULL)
    message = models.ForeignKey(Message, null=True, blank=True, related_name='message_user_detail_message', on_delete=models.SET_NULL)
    read_by_user_time = models.DateTimeField(null=True, blank=True)


