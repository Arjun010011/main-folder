from django.contrib.auth.models import Group
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey
from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.shared.models import Document
from apps.users.models import User
from django.contrib.contenttypes.fields import GenericForeignKey, GenericRelation
from django.contrib.contenttypes.models import ContentType

permission_modes = (
    (1, 'read'),
    (2, 'write'),
    (3, 'read_write'),
    (4, 'allpermission')
)


class TutorialSetup(models.Model):
    sequence = models.IntegerField()
    level = models.IntegerField()
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True)
    label_name = models.CharField(max_length=255)
    api_name = models.CharField(max_length=255)
    filters = models.CharField(max_length=255)
    allow_create_folder = models.BooleanField(default=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return '%s' % (self.model)


class TreeItem(MPTTModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE,
                            limit_choices_to={"model__in": ('Folder', 'File')})
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)
    parent = TreeForeignKey('self', blank=True, null=True, related_name='children', on_delete=models.CASCADE)
    setup = models.ForeignKey(TutorialSetup, on_delete=models.PROTECT, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    setup_ref_table_id = models.IntegerField(default=0)

    def __str__(self):
        return '%s' % (self.parent)


class TreeItemUserPermission(models.Model):
    tree_item = models.ForeignKey(TreeItem, null=True, on_delete=models.CASCADE, related_name='treeitem_user_permission_tree_item')
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name='treeitem_user_permission_user')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class TreeItemGroupPermission(models.Model):
    tree_item = models.ForeignKey(TreeItem, null=True, on_delete=models.CASCADE, related_name='treeitem_group_permission_tree_item')
    group = models.ForeignKey(Group, null=True, on_delete=models.CASCADE, related_name='treeitem_user_permission_group')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class TreeItemStandardPermission(models.Model):
    tree_item = models.ForeignKey(TreeItem, null=True, on_delete=models.CASCADE, related_name='treeitem_standard_permission_tree_item')
    standard = models.ForeignKey(Standard, null=True, on_delete=models.CASCADE, related_name='tree_item_standard_permission_standard')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class TreeItemStandardSectionPermission(models.Model):
    tree_item = models.ForeignKey(TreeItem, null=True, on_delete=models.CASCADE, related_name='treeitem_standard_section_permission_tree_item')
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, on_delete=models.CASCADE, related_name='treeitem_standard_section_permission_standard_section')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Folder(models.Model):
    name = models.CharField(max_length=255)
    folder_type = models.CharField(max_length=50, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    tree_relation = GenericRelation(TreeItem, related_query_name="folder")
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s' % (self.name)

class File(models.Model):
    name = models.CharField(max_length=255)
    upload_file = models.OneToOneField(Document, related_name='upload_file', blank=True, null=True,
                                       on_delete=models.PROTECT)
    file_type = models.CharField(max_length=20)
    size = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    tree_relation = GenericRelation(TreeItem, related_query_name="file")
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s' % (self.name)
