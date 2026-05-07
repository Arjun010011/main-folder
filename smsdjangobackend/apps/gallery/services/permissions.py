from rest_framework.exceptions import ValidationError
from apps.classes.models.enrollment import Enrollment
from apps.institutes.models.academicYear import AcademicYear
from apps.shared.services import SharedService
from django.db.models import F

from apps.gallery.models.mptt import GalleryTreeItem, GalleryTreeItemGroupPermission, GalleryTreeItemStandardPermission, GalleryTreeItemStandardSectionPermission, GalleryTreeItemUserPermission
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name
from apps.gallery.serializers import GalleryTreeItemGroupPermissionSerializer, GalleryTreeItemSerializer, GalleryTreeItemStandardPermissionSerializer, GalleryTreeItemStandardSectionPermissionSerializer, GalleryTreeItemUserPermissionSerializer


def update_tree_item_data(self, data_to_update):
    for data in data_to_update:
        GalleryTreeItem.objects.filter(id=data['tree_item']).update(
            data
        )


def add_gallery_user_permission(self, data):
    from apps.users.models import User
    tree_item_data = GalleryTreeItem.objects.filter(id__in=data['tree_item_list'])
    user_list = data['user_data']
    data_to_save = []
    data_to_update_tree_item = []
    is_delete_existing_permission = data['is_delete_existing_permission']
    deletable_ids = data['deletable_ids']
    is_apply_to_all = data['apply_to_all'] if 'apply_to_all' in data and data['apply_to_all'] else None
    if is_apply_to_all:
        user_list = User.objects.filter(is_active=True).annotate(user=F('id')).values('user')
    for tree_item in tree_item_data:
        if tree_item.is_public:
            data_to_update_tree_item.append({'id': tree_item.id, 'is_public': False})
        for user in user_list:
            if is_apply_to_all:
                permission_mode = is_apply_to_all['permission_mode']
            else:
                permission_mode = user['permission_mode']
            temp  = {'permission_mode': permission_mode, 'tree_item': tree_item.id, 'user': user['user']}
            if 'id' in user and user['id']:
                temp['id'] = user['id']
            data_to_save.append(temp)
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            GalleryTreeItemUserPermission.objects.filter(id__in=deletable_ids).delete()
        if is_delete_existing_permission:
            GalleryTreeItemUserPermission.objects.filter(tree_item__in=data['tree_item_list']).delete()
        if data_to_save:
            for data in data_to_save:
                if 'id' in data and data['id']:
                    kwargs = {'customObjectData': GalleryTreeItemUserPermission.objects.get(id=data['id'])}
                    SharedService.update_data(self, data, **kwargs)
                else:
                    SharedService.add_data(self, data, False)
        if data_to_update_tree_item:
            update_tree_item_data(self, data_to_update_tree_item)
    return {'Reason': 'Data Added Succesfully'}

def add_gallery_group_permission(self, data):
    tree_item_data = GalleryTreeItem.objects.filter(id__in=data['tree_item_list'])
    group_list = data['group_data']
    data_to_save = []
    data_to_update_tree_item = []
    is_delete_existing_permission = data['is_delete_existing_permission']
    deletable_ids = data['deletable_ids']
    for tree_item in tree_item_data:
        if tree_item.is_public:
            data_to_update_tree_item.append({'id': tree_item.id, 'is_public': False})
        for group in group_list:
            temp = {'permission_mode': int(group['permission_mode']), 'tree_item': tree_item.id, 'group': group['group']}
            if 'id' in group and group['id']:
                temp['id'] = group['id']
            data_to_save.append(temp)
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            GalleryTreeItemGroupPermission.objects.filter(id__in=deletable_ids).delete()
        if is_delete_existing_permission:
            GalleryTreeItemGroupPermission.objects.filter(tree_item__in=data['tree_item_list']).delete()
        for data in data_to_save:
            if 'id' in data and data['id']:
                kwargs = {'customObjectData': GalleryTreeItemGroupPermission.objects.get(id=data['id'])}
                SharedService.update_data(self, data, **kwargs)
            else:
                SharedService.add_data(self, data, False)
        if data_to_update_tree_item:
            update_tree_item_data(self, data_to_update_tree_item)
    return {'Reason': 'Data Added Succesfully'}

def add_gallery_standard_permission(self, data):
    tree_item_data = GalleryTreeItem.objects.filter(id__in=data['tree_item_list'])
    standard_list = data['standard_data']
    data_to_save = []
    data_to_update_tree_item = []
    deletable_ids = data['deletable_ids']
    existing_data_mapping = {}
    is_delete_existing_permission = data['is_delete_existing_permission']
    if not is_delete_existing_permission: #if existing is deleting no need to check the existing permission
        standard_ids = [stan['standard'] for stan in standard_list]
        existing_data = GalleryTreeItemStandardPermission.objects.filter(standard__in=standard_ids).values()
        for existing in existing_data:
            key = str(existing['standard_id']) + str(existing['tree_item_id'])
            existing_data_mapping[key] = existing
    for tree_item in tree_item_data:
        if tree_item.is_public:
            data_to_update_tree_item.append({'id': tree_item.id, 'is_public': False})
        for standard in standard_list:
            key = str(standard['standard']) + str(tree_item.id)
            if key in existing_data_mapping:
                if not ('id' in standard and standard['id'] and str(standard['id']) == str(existing_data_mapping[key]['id'])):
                    raise ValidationError('Duplicate data found for the standard')
            existing_data_mapping[key] = ''
            data_to_save.append({'permission_mode': int(standard['permission_mode']), 'tree_item': tree_item.id,
            'standard': standard['standard']})
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            GalleryTreeItemStandardPermission.objects.filter(id__in=deletable_ids).delete()
        if is_delete_existing_permission:
            GalleryTreeItemStandardPermission.objects.filter(tree_item__in=data['tree_item_list']).delete()
        if data_to_save:
            for data in data_to_save:
                if 'id' in data and data['id']:
                    kwargs = {'customObjectData': GalleryTreeItemStandardPermission.objects.get(id=data['id'])}
                    SharedService.update_data(self, data, **kwargs)
                else:
                    SharedService.add_data(self, data, False)
        if data_to_update_tree_item:
            update_tree_item_data(self, data_to_update_tree_item)
    return {'Reason': 'Data Added Succesfully'}

def add_gallery_standard_section_permission(self, data):
    tree_item_data = GalleryTreeItem.objects.filter(id__in=data['tree_item_list'])
    standard_section_list = data['standard_section_data']
    data_to_save = []
    data_to_update_tree_item = []
    deletable_ids = data['deletable_ids']
    is_delete_existing_permission = data['is_delete_existing_permission']
    for tree_item in tree_item_data:
        if tree_item.is_public:
            data_to_update_tree_item.append({'id': tree_item.id, 'is_public': False})
        for standad_section in standard_section_list:
            temp = {'permission_mode': int(standad_section['permission_mode']),
            'tree_item': tree_item.id, 'standard_section': standad_section['standard_section']}
            if 'id' in standad_section and standad_section['id']:
                temp['id'] = standad_section['id']
            data_to_save.append(temp)
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            GalleryTreeItemStandardSectionPermission.objects.filter(id__in=deletable_ids).delete()
        if is_delete_existing_permission:
            GalleryTreeItemStandardSectionPermission.objects.filter(tree_item__in=data['tree_item_list']).delete()
        if data_to_save:
            for data in data_to_save:
                if 'id' in data and data['id']:
                    kwargs = {'customObjectData': GalleryTreeItemStandardSectionPermission.objects.get(id=data['id'])}
                    SharedService.update_data(self, data, **kwargs)
                else:
                    SharedService.add_data(self, data, False)
        if data_to_update_tree_item:
            update_tree_item_data(self, data_to_update_tree_item)
    return {'Reason': 'Data Added Succesfully'}

def get_user_permission_modes(self, tree_item_ids):
    from datetime import datetime
    academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today())
    standard_data = None
    standard_section_id = None
    standard_id = None
    standard_permission = {}
    standard_section_permission = {}
    group_permission = {}
    if academic_year and academic_year.id and self.request.user.student and self.request.user.student.id:
        standard_data = Enrollment.get_student_standard_for_academic(self, academic_year.id, self.request.user.student.id, returnStandardSection=False)
        if standard_data:
            standard_id = standard_data['standard_section__standard']
            standard_section_id = standard_data['standard_section']
    if standard_id:
        standard_permission = {tree['tree_item'] : tree for tree in GalleryTreeItemStandardPermission.objects.filter(
            tree_item__in=tree_item_ids, standard=standard_id
        ).values('permission_mode', 'tree_item')}
    if standard_section_id:
        standard_section_permission = {tree['tree_item'] : tree for tree in GalleryTreeItemStandardSectionPermission.objects.filter(
            tree_item__in=tree_item_ids, standard_section=standard_section_id
        ).values('permission_mode', 'tree_item')}
    groups = self.request.user.groups.values_list('id',flat = True)
    if groups:
        group_permission = {tree['tree_item'] : tree for tree in GalleryTreeItemGroupPermission.objects.filter(tree_item__in=tree_item_ids, group__in=list(groups)).values('permission_mode', 'tree_item')}
    user_permission = {tree['tree_item'] : tree for tree in GalleryTreeItemUserPermission.objects.filter(tree_item__in=tree_item_ids, user=self.request.user.id).values('permission_mode', 'tree_item')}
    tree_item_data = {}
    for tree in tree_item_ids:
        tree_item_data[tree] = {'permission': 0}
        if self.request.user.is_superuser:
            tree_item_data[tree]['permission'] = 4
            continue
        if tree in group_permission and int(group_permission[tree]['permission_mode']) > int(tree_item_data[tree]['permission']):
            tree_item_data[tree]['permission'] = int(group_permission[tree]['permission_mode'])
        if tree in user_permission and int(user_permission[tree]['permission_mode']) > int(tree_item_data[tree]['permission']):
            tree_item_data[tree]['permission'] = int(user_permission[tree]['permission_mode'])
        if tree in standard_permission and int(standard_permission[tree]['permission_mode']) > int(tree_item_data[tree]['permission']):
            tree_item_data[tree]['permission'] = int(standard_permission[tree]['permission_mode'])
        if tree in standard_section_permission and int(standard_section_permission[tree]['permission_mode']) > int(tree_item_data[tree]['permission']):
            tree_item_data[tree]['permission'] = int(standard_section_permission[tree]['permission_mode'])
    return tree_item_data

def copy_permission(self, data):
    copy_from_tree_obj = GalleryTreeItem.objects.get(id=data['copy_from_tree_id'])
    values = ['id', 'created_by']
    data['copy_to_tree_ids'] = data['copy_to_tree_ids'] if 'copy_to_tree_ids' in data and data['copy_to_tree_ids'] else data['copy_to_tree_id']
    copy_to_tree_objs = GalleryTreeItem.objects.filter(id__in=data['copy_to_tree_ids']).values(*values)
    if len(copy_to_tree_objs) != len(data['copy_to_tree_ids']):
        raise ValidationError('You cannot do change to other owned forlder/file')
    for copy_to_tree in copy_to_tree_objs:
        if str(copy_to_tree['created_by']) != str(self.request.user.id):
            raise ValidationError('You cannot do changes to other owned folder/file')
    if not copy_to_tree_objs:
        raise ValidationError('Invalid Folder / File')
    group_permission = list(GalleryTreeItemGroupPermission.objects.filter(tree_item=copy_from_tree_obj.id).values())
    user_permission = list(GalleryTreeItemUserPermission.objects.filter(tree_item=copy_from_tree_obj.id).values())
    standard_permission = list(GalleryTreeItemStandardPermission.objects.filter(tree_item=copy_from_tree_obj.id).values())
    standard_section_permission = list(GalleryTreeItemStandardSectionPermission.objects.filter(tree_item=copy_from_tree_obj.id).values())
    group_data_to_save = []
    user_data_to_save = []
    standard_data_to_save = []
    standard_section_data_to_save = []
    for copy_to_tree_obj in copy_to_tree_objs:
        for group in group_permission:
            if 'id' in group:
                del group['id']
            group['tree_item'] = copy_to_tree_obj['id']
            group['group'] = group['group_id']
            group_data_to_save.append(group)
        for user in user_permission:
            if 'id' in user:
                del user['id']
            user['tree_item'] = copy_to_tree_obj['id']
            user['user'] = user['user_id']
            user_data_to_save.append(user)
        for standard in standard_permission:
            if 'id' in standard:
                del standard['id']
            standard['tree_item'] = copy_to_tree_obj['id']
            standard['standard'] = standard['standard_id']
            standard_data_to_save.append(standard)
        for standard_section in standard_section_permission:
            if 'id' in standard_section:
                del standard_section['id']
            standard_section['tree_item'] = copy_to_tree_obj['id']
            standard_section['standard_section'] = standard_section['standard_section_id']
            standard_section_data_to_save.append(standard_section)
    #delete all existing data
    with transaction.atomic(using=get_current_db_name()):
        if group_data_to_save:
            GalleryTreeItemGroupPermission.objects.filter(tree_item__in=data['copy_to_tree_ids']).delete()
            serializer = GalleryTreeItemGroupPermissionSerializer(data=group_data_to_save, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        if user_data_to_save:
            GalleryTreeItemUserPermission.objects.filter(tree_item__in=data['copy_to_tree_ids']).delete()
            serializer = GalleryTreeItemUserPermissionSerializer(data=user_data_to_save, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        if standard_data_to_save:
            GalleryTreeItemStandardPermission.objects.filter(tree_item__in=data['copy_to_tree_ids']).delete()
            serializer = GalleryTreeItemStandardPermissionSerializer(data=standard_data_to_save, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        if standard_section_data_to_save:
            GalleryTreeItemStandardSectionPermission.objects.filter(tree_item__in=data['copy_to_tree_ids']).delete()
            serializer = GalleryTreeItemStandardSectionPermissionSerializer(data=standard_section_data_to_save, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
    return {'Reason': 'Data Saved Successfully'}
        