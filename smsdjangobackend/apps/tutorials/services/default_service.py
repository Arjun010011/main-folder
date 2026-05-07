import copy
import time
from django.contrib.contenttypes.models import ContentType
from rest_framework import exceptions
from django.db import transaction
from django.db.models import Q, F
from apps.classes.services.enrollment import get_student_todays_standard_and_section

from apps.tenants.services.middlewares import get_current_db_name
from apps.tutorials.models import Folder, File, TreeItem,TutorialSetup
from django.apps import apps
from apps.tutorials.models.mptt import TreeItemGroupPermission, TreeItemStandardPermission, TreeItemStandardSectionPermission, TreeItemUserPermission
from apps.shared.services import FormdefinitionService, UploadTypeService, SharedService
from apps.tutorials.serializers import FileSerializer, FolderSerializer

acceptedFileTypes = {'videos' : ('mp4', 'mov', 'wmv') ,
    'files' : ('doc', 'docx',  'odt', 'txt', 'xls', 'xlsx','jpeg', 'jpg', 'pdf', 'png', 'pptx', 'ppt', 'csv')}

def create_folder(self, data):
    # validate_level_model(self, data) #This for dynamic video tutorial
    childrenIds = get_childrenIds_in_folder(self, data['parent_id'])
    if self.get_queryset().filter(id__in=childrenIds,folder__name=data['name']).exists():
        raise exceptions.ValidationError(f'{data["name"]} - Folder name already exist')
    kwargs = { 'parent': self.get_queryset().get(id=data['parent_id']), 'created_by_id': self.request.user.id}
    with transaction.atomic(using=get_current_db_name()):
        folderClass = ContentType.objects.get(model='Folder').model_class()
        serializer = FolderSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        serializer = serializer.save()
        contentObject = folderClass.objects.get(id=serializer.id)
        obj = self.get_queryset().create(content_object=contentObject, **kwargs)
        obj.refresh_from_db()
    return {'Reason': 'Data Saved Successfully', 'tree_item_id': obj.id}

def check_level_for_parent(self, parentId):
    self.kwargs['pk'] = parentId
    instance = self.get_object()
    return instance.level

def validate_level_model(self, data): #planned for second phase
    level = check_level_for_parent(self, data['parent_id'])
    try:
        obj = TutorialSetup.objects.get(level=level)
    except:
        return
    contentObj = ContentType.objects.get(id=obj.content_type_id)
    model = apps.get_model(contentObj.app_label, contentObj.model)
    data['setup_ref_table_id'] = 1 ##front-end should send this data
    try:
        model.objects.get(data=data['setup_ref_table_id'])
    except:
        raise exceptions.ValidationError('Model as not active references')


def update_folder_or_file(self, data):
    if 'name' in data and data['name']:
        rename_folder_or_file(self, data)
    if 'description' in data and data['description']:
        update_description(self, data)
    return {'Reason': 'Data Updated Successfully'}

def rename_folder_or_file(self, data):
    childObj = self.get_object()
    if childObj.parent_id:
        parentObj = TreeItem.objects.get(id=childObj.parent_id)
        treeType = check_new_name_exist(self, data['name'], childObj,parentObj)
        if treeType == 'folder':
            Folder.objects.filter(id=childObj.object_id).update(name=data['name'])
        elif treeType == 'file':
            File.objects.filter(id=childObj.object_id).update(name=data['name'])
        else:
            raise exceptions.ValidationError('Unknown file type')
    return {'Reason' : 'Data updated Successfully'}

def update_description(self, data):
    childObj = self.get_object()
    if childObj.content_type.model == 'folder':
        Folder.objects.filter(id=childObj.object_id).update(description=data['description'])
    elif childObj.content_type.model == 'file':
        File.objects.filter(id=childObj.object_id).update(description=data['description'])
    return {'Reason' : 'Data updated Successfully'}

def create_file(self, data_set):
    row_data = {'data_list': []}
    if 'is_multiple' in data_set and data_set['is_multiple']: #multiple file upload
        row_data['data_list'] = data_set['data_list']
    else:
        row_data['data_list'] = [data_set]
    file_names = []
    duplicate_names = {}
    duplicate_files = {}
    for row in row_data['data_list']:
        if row['file_type'] not in acceptedFileTypes['videos'] and row['file_type'] not in acceptedFileTypes['files']:
            raise exceptions.ValidationError(f'Supported file formats are - {acceptedFileTypes}')
        file_names.append(row['name'])
        row['parent_id'] = data_set['parent_id']
        if row['upload_file'] in duplicate_files:
            raise exceptions.ValidationError(f'{row["name"]} duplicate content exist')
        if row['name'] in duplicate_names:
            raise exceptions.ValidationError(f'{row["name"]} duplicate name found')
        duplicate_names[row['name']] = ''
        duplicate_files[row['upload_file']] = ''
    children_ids = get_childrenIds_in_folder(self, data_set['parent_id'])
    existing_data = self.get_queryset().filter(id__in=children_ids,file__name__in=file_names)
    allow_duplicate_files = FormdefinitionService.get_formdefintion_data(self, 'tutorial_configuration', 'allow_duplicate_files')
    if existing_data.exists(): #check children with same name
        if not allow_duplicate_files:
            for existing in existing_data.values('file__name'):
                for row in row_data['data_list']:
                    if row['name'] == existing['file__name']:
                        row['name'] += '_' + str(int(time.time()))
        else:
            names = ','.join(existing_data.values_list('file__name', flat=True))
            raise exceptions.ValidationError(f'{names} - File name already exist')
    kwargs = {  'parent': self.get_queryset().get(id=data_set['parent_id']), 'created_by_id': self.request.user.id}
    file_class = ContentType.objects.get(model='File').model_class()
    return_ids = []
    for data in row_data['data_list']:
        with transaction.atomic(using=get_current_db_name()):
            serializer = FileSerializer(data=data)
            serializer.is_valid(raise_exception=True)
            serializer = serializer.save()
            file_object = file_class.objects.get(id=serializer.id)
            obj = self.get_queryset().create(content_object=file_object, **kwargs)
            return_ids.append(obj.id)
            obj.refresh_from_db()
    return {'Reason': 'Data Saved Successfully', 'tree_item_id': obj.id, 'tree_item_ids': return_ids}


""" Should return file object """
def save_file(self, data):
    file_serializer = FileSerializer(data=data)
    if file_serializer.is_valid():
        return file_serializer.save()
    else:
        raise exceptions.ValidationError(f'Something went wrong {file_serializer.errors}')


""" Checks Parent folder exist and retrives childrens if any (get only folders and files )"""
def get_childrenIds_in_folder(self, parentId=None):
    try:
        treeObj = self.get_queryset().get(id=parentId)
    except:
        raise exceptions.ValidationError('Parent Folder doesnt exist')
    if treeObj.content_type.model != 'folder':
        raise exceptions.ValidationError('Given Parent is not a folder')
    return treeObj.get_children().values_list('id', flat=True)


def get_folder_and_files(self, parentId, imageAndVideo=False):

    with transaction.atomic(using=get_current_db_name()):
        response = get_childrens_in_folder(self, parentId, imageAndVideo)
        try:
            self.kwargs['pk'] = parentId
            instance = self.get_object()
            response['previous_parent_id'] = 1 if not instance.parent_id else instance.parent_id
        except:
            response['previous_parent_id'] = 1
        response['breadcrumbs'] = get_bread_crums_for_folder(self, parentId)
        return response

def check_for_child_permissions(self, tree_item_ids, user_obj, permission_tree_items_ids={}):
    user_id = user_obj.id
    is_staff = user_obj.is_staff
    group_id = user_obj.groups.first().pk
    is_super_user = user_obj.is_superuser
    standard_permissions = []
    standard_section_permissions = []
    temp_tree_item_ids = copy.deepcopy(tree_item_ids)
    if is_super_user:
        temp = {}
        for tree_item in temp_tree_item_ids:
            temp[tree_item] = {'tree_item': tree_item, 'permission_mode': 4}
        return temp
    user_permissions = TreeItemUserPermission.objects.filter(user=user_id, tree_item__in=temp_tree_item_ids).values(
        'tree_item', 'permission_mode'
    )
    tree_item_data = TreeItem.objects.filter(id__in=tree_item_ids)
    for tree in tree_item_data:
        if tree.is_public:
            permission_tree_items_ids[tree.id] = {'tree_item': tree.id, 'permission_mode': '1'}
            temp_tree_item_ids.remove(tree.id)
        elif tree.created_by_id == self.request.user.id:
            permission_tree_items_ids[tree.id] = {'tree_item': tree.id, 'permission_mode': '4'}
            temp_tree_item_ids.remove(tree.id)
    for user_permission in user_permissions: #remove ids which have permissions
        if user_permission['tree_item'] in temp_tree_item_ids and int(user_permission['permission_mode']) == 4:
            temp_tree_item_ids.remove(user_permission['tree_item'])
    parent_ids = TreeItem.objects.filter(id__in=temp_tree_item_ids).values('parent_id','id')
    parent_id_list = []
    parent_dict ={}
    tree_item_id_payment_mapping ={}
    standard_permission_list =[]
    standard_section_permission_list=[]
    group_permission_list=[]
    for item in parent_ids:
        parent_id_list.append(item['parent_id'])
        if item['parent_id'] not in parent_dict:
            parent_dict[item['parent_id']]={'tree_item_id':[]}
        if item['id'] not in tree_item_id_payment_mapping:
            tree_item_id_payment_mapping[item['id']] = item['parent_id']
        parent_dict[item['parent_id']]['tree_item_id'].append(item['id'])
    group_permissions = TreeItemGroupPermission.objects.filter(group=group_id, tree_item__in=temp_tree_item_ids+parent_id_list).values(
        'tree_item', 'permission_mode'
    )
    for group_permission in group_permissions:
        group_permission_list.append(group_permission['tree_item'])
        if group_permission['tree_item'] in parent_dict:
            parent_dict[group_permission['tree_item']]['permission_mode'] = group_permission['permission_mode']
    group_permissions=list(group_permissions)
    for item in temp_tree_item_ids:
        if tree_item_id_payment_mapping[item] in group_permission_list:
            group_permissions.append({'tree_item':item,'permission_mode':parent_dict[tree_item_id_payment_mapping[item]]['permission_mode']})
    for group_permission in group_permissions: #remove ids which have permissions
        if group_permission['tree_item'] in temp_tree_item_ids and int(group_permission['permission_mode']) == 4:
            temp_tree_item_ids.remove(group_permission['tree_item'])
    if not is_staff:
        student_id = user_obj.student.id
        current_academic_year, current_standard, current_standard_section = get_student_todays_standard_and_section(self, student_id)
        current_standard_section=current_standard_section['standard_section']
        if current_academic_year and current_standard:
            standard_permissions = TreeItemStandardPermission.objects.filter(
                tree_item__in=temp_tree_item_ids+parent_id_list, standard_id=current_standard
            ).values('tree_item', 'permission_mode')
            for standard_permission in standard_permissions:
                standard_permission_list.append(standard_permission['tree_item'])
                if standard_permission['tree_item'] in parent_dict:
                    parent_dict[standard_permission['tree_item']]['permission_mode'] = standard_permission['permission_mode']
            standard_permissions=list(standard_permissions)
            for item in temp_tree_item_ids:
                if tree_item_id_payment_mapping[item] in standard_permission_list:
                    standard_permissions.append({'tree_item':item,'permission_mode':parent_dict[tree_item_id_payment_mapping[item]]['permission_mode']})
        for standard_permission in standard_permissions: #remove ids which have permissions
            if standard_permission['tree_item'] in temp_tree_item_ids and int(standard_permission['permission_mode']) == 4:
                temp_tree_item_ids.remove(standard_permission['tree_item'])
        if current_standard_section:
            standard_section_permissions = TreeItemStandardSectionPermission.objects.filter(tree_item__in=temp_tree_item_ids+parent_id_list, standard_section=current_standard_section).values('tree_item', 'permission_mode')
            for standard_section_permission in standard_section_permissions:
                standard_section_permission_list.append(standard_section_permission['tree_item'])
                if standard_section_permission['tree_item'] in parent_dict:
                    parent_dict[standard_section_permission['tree_item']]['permission_mode'] = standard_section_permission['permission_mode']
            standard_section_permissions=list(standard_section_permissions)
            for item in temp_tree_item_ids:
                if tree_item_id_payment_mapping[item] in standard_section_permission_list:
                    standard_section_permissions.append({'tree_item':item,'permission_mode':parent_dict[tree_item_id_payment_mapping[item]]['permission_mode']})
        for standard_section_permission in standard_section_permissions: #remove ids which have permissions
            if standard_section_permission['tree_item'] in temp_tree_item_ids and int(standard_section_permission['permission_mode']) == 4:
                temp_tree_item_ids.remove(standard_section_permission['tree_item'])
    for group_permission in group_permissions:
        if group_permission['tree_item'] in permission_tree_items_ids and int(permission_tree_items_ids[group_permission['tree_item']]['permission_mode']) > int(group_permission['permission_mode']):
            continue #skip when user already have greater permission
        permission_tree_items_ids[group_permission['tree_item']] = {'tree_item': group_permission['tree_item'], 'permission_mode': group_permission['permission_mode']}
        if group_permission['tree_item'] in temp_tree_item_ids:
            temp_tree_item_ids.remove(group_permission['tree_item'])
    for standard_permission in standard_permissions:
        if standard_permission['tree_item'] in permission_tree_items_ids and int(permission_tree_items_ids[standard_permission['tree_item']]['permission_mode']) > int(standard_permission['permission_mode']):
            continue #skip when user already have greater permission
        permission_tree_items_ids[standard_permission['tree_item']] = {'tree_item': standard_permission['tree_item'], 'permission_mode': standard_permission['permission_mode']}
        if standard_permission['tree_item'] in temp_tree_item_ids:
            temp_tree_item_ids.remove(standard_permission['tree_item'])
    for standard_section_permission in standard_section_permissions:
        if standard_section_permission['tree_item'] in permission_tree_items_ids and int(permission_tree_items_ids[standard_section_permission['tree_item']]['permission_mode']) > int(standard_section_permission['permission_mode']):
            continue #skip when user already have greater permission
        permission_tree_items_ids[standard_section_permission['tree_item']] = {'tree_item': standard_section_permission['tree_item'], 'permission_mode': standard_section_permission['permission_mode']}
        if standard_section_permission['tree_item'] in temp_tree_item_ids:
            temp_tree_item_ids.remove(standard_section_permission['tree_item'])
    if len(temp_tree_item_ids) <= 0: #if all permission given to the folder no need to check for the parent
        return permission_tree_items_ids
    # Now checking any of the child have the permissin to view or not
    for tree_item in temp_tree_item_ids:
        try:
            children_ids = get_childrenIds_in_folder(self, tree_item)
        except:
            children_ids = []
        is_child_have_permission = check_for_child_permissions(self, list(children_ids), user_obj, {})
        if len(is_child_have_permission) > 0:
            permission_tree_items_ids[tree_item] = {'tree_item': tree_item, 'permission_mode': '1'} #when child have access we give parent view access
        permission_tree_items_ids.update(is_child_have_permission)
    return permission_tree_items_ids

def get_childrens_in_folder(self, parentId, imageAndVideo=False):

    with transaction.atomic(using=get_current_db_name()):
        childrenIds = get_childrenIds_in_folder(self, parentId)
        treeData = self.get_queryset().filter(id__in=childrenIds)
        response = get_folders_and_files(self, treeData, imageAndVideo)
        return response

def get_bread_crums_for_folder(self, id):
    folderFilterValues = ['id', 'name', 'tree_id']
    if int(id) and id:
        try:
            treeObj = self.get_queryset().get(id=id)
        except:
            raise exceptions.ValidationError(f'Folder doesnt exist')
        if treeObj.content_type.model != 'folder':
            raise exceptions.ValidationError(f'Given is not a folder')
        descendantIds =  treeObj.get_ancestors(include_self=True).values_list('id', flat=True)
        treeData = TreeItem.objects.filter(id__in=descendantIds).exclude(id=1)
        folderIds = []
        for row in treeData:
            if row.content_type.model == 'folder':
                folderIds.append(row.object_id)
        folders = Folder.objects.filter(id__in=folderIds).annotate(tree_id=F('tree_relation__id')).order_by(F('tree_relation__level')).values(*folderFilterValues)
    else:
        folders = []
    return folders


""" Returns all the folders and files inside the parent tree, data takes queryset of treeData """

def get_folders_and_files(self, data, imageAndVideo=False):
    folderIds = []
    fileIds = []
    folderAndTreeMapping = {}
    fileAndTreeMapping = {}
    tree_item_ids = []
    tree_permission_data = {}
    for row in data:
        tree_item_ids.append(row.id)
    data = TreeItem.objects.filter(id__in=tree_item_ids)
    tree_permission_data = check_for_child_permissions(self, tree_item_ids, self.request.user, tree_permission_data)
    for row in data:
        if self.request.user.is_superuser or row.id in tree_permission_data or row.created_by_id == self.request.user.id:
            if row.content_type.model == 'folder':
                folderIds.append(row.object_id)
                folderAndTreeMapping[row.object_id] = row
            elif row.content_type.model == 'file':
                fileAndTreeMapping[row.object_id] = row
                fileIds.append(row.object_id)

    folders = Folder.objects.filter(id__in=folderIds)
    folderSerializer = FolderSerializer(folders, many=True)
    folders = folderSerializer.data
    files = File.objects.filter(id__in=fileIds)
    fileserializer = FileSerializer(files, many=True)
    files = fileserializer.data
    for index in folders:
        index['tree_id'] = folderAndTreeMapping[index['id']].id
        temp_created_by = folderAndTreeMapping[index['id']].created_by
        if temp_created_by:
            index['created_by'] = temp_created_by.id
            if temp_created_by.student:
                index['created_by_name'] = temp_created_by.student.first_name
                if temp_created_by.student.middle_name:
                    index['created_by_name'] += ' '+temp_created_by.student.middle_name
                if temp_created_by.student.last_name:
                    index['created_by_name'] += ' '+temp_created_by.student.last_name
            elif temp_created_by.staff:
                index['created_by_name'] = temp_created_by.staff.first_name
                if temp_created_by.staff.middle_name:
                    index['created_by_name'] += ' '+temp_created_by.staff.middle_name
                if temp_created_by.staff.last_name:
                    index['created_by_name'] += ' '+temp_created_by.staff.last_name
            else:
                index['created_by_name'] = temp_created_by.username
        index['permission'] = int(tree_permission_data[index['tree_id']]['permission_mode']) if index['tree_id'] in tree_permission_data else 0
        if folderAndTreeMapping[index['id']].created_by_id == self.request.user.id:
             index['permission'] = 4
    for index in files:
        index['tree_id'] = fileAndTreeMapping[index['id']].id
        temp_created_by = fileAndTreeMapping[index['id']].created_by
        if temp_created_by:
            index['created_by'] = temp_created_by.id
            if temp_created_by.student:
                index['created_by_name'] = temp_created_by.student.first_name
                if temp_created_by.student.middle_name:
                    index['created_by_name'] += ' '+temp_created_by.student.middle_name
                if temp_created_by.student.last_name:
                    index['created_by_name'] += ' '+temp_created_by.student.last_name
            elif temp_created_by.staff:
                index['created_by_name'] = temp_created_by.staff.first_name
                if temp_created_by.staff.middle_name:
                    index['created_by_name'] += ' '+temp_created_by.staff.middle_name
                if temp_created_by.staff.last_name:
                    index['created_by_name'] += ' '+temp_created_by.staff.last_name
            else:
                index['created_by_name'] = temp_created_by.username
        index['permission'] = tree_permission_data[index['tree_id']]['permission_mode'] if index['tree_id'] in tree_permission_data else 0
        if fileAndTreeMapping[index['id']].created_by_id == self.request.user.id:
             index['permission'] = 4
    response = {}
    response['folders'] = folders
    if imageAndVideo:
        response['videos'] = []
        response['files'] = [] # group all documents except videos
        for index, fileData in enumerate(files):
            if fileData['file_type'] in acceptedFileTypes['videos']:
                response['videos'].append(fileData)
            else:
                response['files'].append(fileData)
    else:
        response['files'] = files
    return response

def move_folder_or_file(self, data, childId):
    with transaction.atomic(using=get_current_db_name()):
        parentId = data['parent_id']
        parentObj = TreeItem.objects.get(id=parentId)
        childObj = TreeItem.objects.get(id=childId)
        check_folder_or_file_already_exist(self,childObj,parentObj)
        childObj.move_to(parentObj, 'last-child')
        childObj.save()
        childObj.refresh_from_db()
        return  {'Reason': 'Folder Moved successfully'}

#this check node
def check_folder_or_file_already_exist(self, childObj, parentObj):

    if childObj.content_type.model == 'folder' and  self.get_queryset().filter(parent=parentObj,folder__name=childObj.folder.values()[0]['name'], is_active=True).exists():
        raise exceptions.ValidationError('Folder Name already exist')
    elif childObj.content_type.model == 'file' and self.get_queryset().filter(parent=parentObj,file__name=childObj.file.values()[0]['name'], is_active=True).exists():
        raise exceptions.ValidationError('File Name already exist')
    return childObj.content_type.model #returning for some case

def check_new_name_exist(self, newName, childObj, parentObj):
    if childObj.content_type.model == 'folder' and  self.get_queryset()\
        .filter(parent=parentObj,folder__name=newName, is_active=True).exclude(id=childObj.id).exists():
        raise exceptions.ValidationError('Folder Name already exist')
    elif childObj.content_type.model == 'file' and self.get_queryset()\
        .filter(parent=parentObj,file__name=newName, is_active=True).exclude(id=childObj.id).exists():
        raise exceptions.ValidationError('File Name already exist')
    return childObj.content_type.model #returning for some case

def read_folder_file_obj(self, tree_item_obj):
    obj = None
    file_type = ''
    if tree_item_obj.content_type.model == 'folder':
        obj = Folder.objects.filter(id=tree_item_obj.object_id)
        file_type = 'folder'
    elif tree_item_obj.content_type.model == 'file':
        obj = File.objects.filter(id=tree_item_obj.object_id)
        file_type = 'file'
    return obj, file_type

