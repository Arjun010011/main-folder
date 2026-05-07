from rest_framework import viewsets
from rest_framework.views import Response
from django.contrib.auth.models import Group
from rest_framework import exceptions
from apps.classes.models.standard import Standard, StandardSectionMapping
from apps.classes.serializers import StandardSerializer
from apps.classes.services.standard import get_standard_and_section, get_standard_for_current_year
from django.db.models import Q

from apps.tutorials.models import TreeItem
from apps.users.models.user import User
from apps.users.serializers import UserReadSerializer
from apps.tutorials.models.mptt import TreeItemGroupPermission, TreeItemStandardPermission, TreeItemStandardSectionPermission, TreeItemUserPermission
from apps.tutorials.serializers import  (
    TreeItemGroupPermissionReadSerializer, TreeItemSerializer, TreeItemStandardPermissionReadSerializer, TreeItemStandardSectionReadPermissionSerializer, TreeItemUserPermissionSerializer, TreeItemGroupPermissionSerializer, 
    TreeItemStandardPermissionSerializer, TreeItemStandardSectionPermissionSerializer, TreeItemUserReadPermissionSerializer
)
from apps.shared.services import SharedService, UploadTypeService
from apps.tutorials.services import default_service
from apps.tutorials.services.permissions import (
    add_tutorial_standard_section_permission, add_tutorial_group_permission, add_tutorial_user_permission,
    add_tutorial_standard_permission, copy_permission
)

class CreateFolderViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    http_method_names = ['post', 'delete', 'put']

    def get_queryset(self):
        self.queryset = TreeItem.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = default_service.create_folder(self, request.data['data'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = default_service.update_folder_or_file(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        if self.kwargs['pk'] == 1:
            raise exceptions.ValidationError('You cant delete parent_root table data')
        response = SharedService.soft_delete_list_data(self, request.data)
        return Response(response)



class CreateFileViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    http_method_names = ['post', 'delete', 'put']

    def get_queryset(self):

        self.queryset = TreeItem.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):

        UploadTypeService.set_bucket_folder_path()
        response = default_service.create_file(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = default_service.update_folder_or_file(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.soft_delete_list_data(self, request.data)
        return Response(response)

class GetFolderViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    queryset = TreeItem.objects.filter(is_active=True)
    http_method_names = ['get']

    def retrieve(self, request, pk=None):
        UploadTypeService.set_bucket_folder_path()
        response = default_service.get_folder_and_files(self, pk)
        return Response(response)

class GetFolderImgVideoViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    queryset = TreeItem.objects.filter(is_active=True)
    http_method_names = ['get']

    def retrieve(self, request, pk=None):
        UploadTypeService.set_bucket_folder_path()
        response = default_service.get_folder_and_files(self, pk, True)
        return Response(response)

class MoveFolderOrFileViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    queryset = TreeItem.objects.filter()
    http_method_names = ['put']

    def update(self, request, *args, **kwargs):
        response = default_service.move_folder_or_file(self, request.data, self.kwargs['pk'])
        return Response(response)

class GetTreeStructureViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemSerializer
    http_method_names = ['get']

    def get_queryset(self):
        self.queryset = TreeItem.objects.filter(is_active=True)
        return self.queryset

    def list(self, request, *args, **kwargs):
        treeObj = TreeItem.objects.get(id=1)
        response = treeObj.get_family().values()
        return Response(response)

class TreeItemUserPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemUserPermissionSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        if self.request.method == 'GET':
            filters = self.request.GET.dict()
            search = filters.get('search')
            filter_query = {'is_active': True}
            query = {}
            if search:
                query = Q(staff__first_name__icontains=search) | Q(staff__middle_name__icontains=search) | Q(staff__last_name__icontains=search) | Q(
                student__middle_name__icontains=search) | Q(student__last_name__icontains=search) | Q(student__first_name__icontains=search)
                self.queryset = User.objects.filter(query, **filter_query)
            else:
                self.queryset = User.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_tutorial_user_permission(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = UserReadSerializer
        if not self.request.GET.get('tree_item'):
            raise exceptions.ValidationError('tree_item is mandatory')
        response = SharedService.read_data(self, True)
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                        self.request.GET.get('limit'),
                                                                        self.request.GET.get('pageno'))
        user_ids = []
        for temp_data in data:
            user_ids.append(temp_data['id'])
        tree_item_data = {temp['user_id']: temp for temp in TreeItemUserPermission.objects.filter(user__in=user_ids,
            tree_item=self.request.GET.get('tree_item')).values()
        }
        for temp_data in data:
            temp_data['permission_data'] = {}
            if temp_data['id'] in tree_item_data:
                temp_data['permission_data'] = tree_item_data[temp_data['id']]
        return Response({'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}})

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class TreeItemGroupPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemGroupPermissionSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        self.queryset = TreeItemGroupPermission.objects.filter(tree_item=self.request.GET.get('tree_item'))
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_tutorial_group_permission(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = {'data': {'groups': []}}
        self.serializer_class = TreeItemGroupPermissionReadSerializer
        if not self.request.GET.get('tree_item'):
            raise exceptions.ValidationError('tree_item is mandatory')
        permission_data = SharedService.read_data(self, True)
        permission_data = {perm['group']:perm for perm in permission_data['data']}
        group_data = Group.objects.all().order_by('id').values()
        for group in group_data:
            group['permission_data'] = {}
            if group['id'] in permission_data:
                group['permission_data'] = permission_data[group['id']]
        response['data']['groups'] = group_data
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class TreeItemStandardPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemStandardPermissionSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        if self.request.method == 'GET':
            self.queryset = Standard.objects.filter(is_active=True)
        else:
            self.queryset = TreeItemStandardPermission.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_tutorial_standard_permission(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = StandardSerializer
        standard_data = get_standard_for_current_year(self)
        standard_ids = [stand['id'] for stand in standard_data['data']]
        permission_data = {tree['standard_id']: tree for tree in TreeItemStandardPermission.objects.filter(standard__in=standard_ids,
            tree_item=self.request.GET.get('tree_item')
        ).values()}
        for standard in standard_data['data']:
            standard['permission_data'] = {}
            if standard['id'] in permission_data:
                standard['permission_data'] = permission_data[standard['id']]
        if not self.request.GET.get('tree_item'):
            raise exceptions.ValidationError('tree_item is mandatory')
        return Response(standard_data)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class TreeItemStandardSectionPermissionViewSet(viewsets.ModelViewSet):
    serializer_class = TreeItemStandardSectionPermissionSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        if self.request.method == 'GET':
            self.queryset = StandardSectionMapping.objects.all()
        else:
            self.queryset = TreeItemStandardSectionPermission.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_tutorial_standard_section_permission(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        #get list of the academic year the permission is already set for
        tree_item = self.request.GET.get('tree_item')
        if self.request.GET.get('get_academic_years'):
            return Response({'data': TreeItemStandardSectionPermission.objects.filter(
                tree_item=tree_item
            ).distinct().order_by('standard_section__academic_year').values(
                'standard_section__academic_year',
                'standard_section__academic_year__start_date',
                'standard_section__academic_year__end_date',
            )})
        self.queryset = StandardSectionMapping.objects.all()
        academic_year = self.request.GET.get('academic_year')
        standard_section_list = []
        standard_section_data = get_standard_and_section(self, academic_year)
        for standard_section in standard_section_data['data']:
            for section in standard_section['sections']:
                standard_section_list.append(section['standard_section'])
        permission_data = {tree['standard_section_id']: tree for tree in TreeItemStandardSectionPermission.objects.filter(tree_item=tree_item, standard_section__in=standard_section_list).values()}
        for standard_section in standard_section_data['data']:
            for section in standard_section['sections']:
                section['permission_data'] = {}
                if section['standard_section'] in permission_data:
                    section['permission_data'] = permission_data[section['standard_section']]
        return Response(standard_section_data)
    
    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class CopyPermissionViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']
    serializer_class = None

    def create(self, request, *args, **kwargs):
        response = copy_permission(self, request.data)
        return Response(response)