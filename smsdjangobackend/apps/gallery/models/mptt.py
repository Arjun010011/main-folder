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


class GallerySetup(models.Model):
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


class GalleryTreeItem(MPTTModel):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE,
                            limit_choices_to={"model__in": ('Folder', 'File')})
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')
    is_active = models.BooleanField(default=True)
    is_public = models.BooleanField(default=False)
    parent = TreeForeignKey('self', blank=True, null=True, related_name='children', on_delete=models.CASCADE)
    setup = models.ForeignKey(GallerySetup, on_delete=models.PROTECT, null=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
    setup_ref_table_id = models.IntegerField(default=0)

    def __str__(self):
        return '%s' % (self.parent)


class GalleryTreeItemUserPermission(models.Model):
    tree_item = models.ForeignKey(GalleryTreeItem, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_user_permission_tree_item')
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_user_permission_user')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GalleryTreeItemGroupPermission(models.Model):
    tree_item = models.ForeignKey(GalleryTreeItem, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_group_permission_tree_item')
    group = models.ForeignKey(Group, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_user_permission_group')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GalleryTreeItemStandardPermission(models.Model):
    tree_item = models.ForeignKey(GalleryTreeItem, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_standard_permission_tree_item')
    standard = models.ForeignKey(Standard, null=True, on_delete=models.CASCADE, related_name='gallerytree_item_standard_permission_standard')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GalleryTreeItemStandardSectionPermission(models.Model):
    tree_item = models.ForeignKey(GalleryTreeItem, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_standard_section_permission_tree_item')
    standard_section = models.ForeignKey(StandardSectionMapping, null=True, on_delete=models.CASCADE, related_name='gallerytreeitem_standard_section_permission_standard_section')
    permission_mode = models.CharField(max_length=6, choices=permission_modes)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class GalleryFolder(models.Model):
    name = models.CharField(max_length=255)
    folder_type = models.CharField(max_length=50, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    tree_relation = GenericRelation(GalleryTreeItem, related_query_name="galleryfolder")
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s' % (self.name)

class GalleryFile(models.Model):
    name = models.CharField(max_length=255)
    upload_file = models.OneToOneField(Document, related_name='galleryfile_upload_file', blank=True, null=True,
                                       on_delete=models.PROTECT)
    file_type = models.CharField(max_length=20)
    size = models.CharField(max_length=255, null=True, blank=True)
    description = models.CharField(max_length=255, null=True, blank=True)
    date_created = models.DateTimeField(auto_now_add=True)
    date_updated = models.DateTimeField(auto_now=True)
    tree_relation = GenericRelation(GalleryTreeItem, related_query_name="galleryfile")
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return '%s' % (self.name)
