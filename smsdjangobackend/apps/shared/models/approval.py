from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from django.db import models
from django.contrib.auth.models import Group

from apps.users.models import User


class ApproveStatus(models.Model):
    ApprovalStatus = (('0', 'Unapproved'),
                      ('1', 'Approved'),
                      ('2', 'Rejected'),
                      ('3', 'Pending'),)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    approval_status = models.CharField(default='0', max_length=1, choices=ApprovalStatus)
    reason = models.CharField(max_length=255, null=True, blank=True)
    user = models.ForeignKey(User, null=True, blank=True, related_name='user_approve', on_delete=models.SET_NULL)
    created_user = models.ForeignKey(User, null=True, blank=True, related_name='created_user_approve',
                                     on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GroupApprovalHierarchy(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, related_name='group_approval_hierarchy_group')
    sequence = models.IntegerField(default=0)
    is_active = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class UserApprovalHierarchy(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='user_approval_hierarchy_user')
    sequence = models.IntegerField(default=0)
    is_active = models.BooleanField(default=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class ApprovalTransition(models.Model):
    ApprovalStatus = (('0', 'Unapproved'),
                      ('1', 'Approved'),
                      ('2', 'Rejected'),
                      ('3', 'Pending'),)
    approval_status_parent = models.ForeignKey(
        ApproveStatus, on_delete=models.CASCADE, related_name='approval_transition_approve_status',
        null=True
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='approval_transition_user',
        null=True
    )
    step = models.IntegerField(default=1)
    approval_status = models.CharField(default='0', max_length=1, choices=ApprovalStatus)
    reason = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)