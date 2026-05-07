from apps.tutorials.models import Folder, File, TreeItem
from rest_framework import serializers
from apps.shared.serializers import DocumentSerializer

from rest_framework import serializers

from apps.tutorials.models.mptt import TreeItemGroupPermission, TreeItemStandardPermission, TreeItemStandardSectionPermission, TreeItemUserPermission


class TreeItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItem
        fields = '__all__'

class FolderSerializer(serializers.ModelSerializer):


    class Meta:
        model = Folder
        fields = '__all__'


class FileSerializer(serializers.ModelSerializer):
    document_url = DocumentSerializer(read_only=True, source='upload_file')
    # owner_name = serializers.SerializerMethodField()

    # def get_owner_name(self, obj):
    #     if obj.created_by.staff:
    #         return obj.created_by.staff.first_name + ' ' + obj.created_by.staff.middle_name + ' ' +obj.created_by.staff.last_name
    #     elif obj.created_by.student:
    #         return obj.created_by.student.first_name + ' ' + obj.created_by.student.middle_name + ' ' +obj.created_by.student.last_name
    #     return obj.created_by.username
    class Meta:
        model = File
        fields = '__all__'

class TreeItemUserPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemUserPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'user')
            )
        ]
        fields = '__all__'

class TreeItemGroupPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemGroupPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'group')
            )
        ]
        fields = '__all__'

class TreeItemStandardPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemStandardPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('standard', 'tree_item')
            )
        ]
        fields = '__all__'



class TreeItemStandardSectionPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemStandardSectionPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'standard_section')
            )
        ]
        fields = '__all__'

class TreeItemGroupPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemGroupPermission
        fields = '__all__'

class TreeItemStandardPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemStandardPermission
        fields = '__all__'



class TreeItemStandardSectionPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = TreeItemStandardSectionPermission
        fields = '__all__'

class TreeItemUserReadPermissionSerializer(serializers.ModelSerializer):
    student_details = serializers.SerializerMethodField()
    staff_details = serializers.SerializerMethodField()

    def get_student_details(self, obj):
        if obj.user.student:
            return {
                'first_name': obj.user.student.first_name,
                'middle_name': obj.user.student.middle_name,
                'last_name': obj.user.student.last_name,
                'current_standard': obj.user.student.current_standard.name
            }
        return {}

    def get_staff_details(self, obj):
        if obj.user.staff:
            return{
                'first_name': obj.user.staff.first_name,
                'middle_name': obj.user.staff.middle_name,
                'last_name': obj.user.staff.last_name
            }

    class Meta:
        model = TreeItemUserPermission
        fields = '__all__'

class TreeItemGroupPermissionReadSerializer(serializers.ModelSerializer):
    group_name = serializers.ReadOnlyField(source='group.name')

    class Meta:
        model = TreeItemGroupPermission
        fields = '__all__'

class TreeItemStandardPermissionReadSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')
    academic_year_start_date = serializers.ReadOnlyField(source='academic_year.start_date')
    academic_year_end_date = serializers.ReadOnlyField(source='academic_year.end_date')

    class Meta:
        model = TreeItemStandardPermission
        fields = '__all__'

class TreeItemStandardSectionReadPermissionSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')

    class Meta:
        model = TreeItemStandardSectionPermission
        fields = '__all__'