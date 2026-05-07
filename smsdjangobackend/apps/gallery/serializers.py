from apps.gallery.models import GalleryFolder, GalleryFile, GalleryTreeItem
from rest_framework import serializers
from apps.shared.serializers import DocumentSerializer

from rest_framework import serializers

from apps.gallery.models.mptt import GalleryTreeItemGroupPermission, GalleryTreeItemStandardPermission, GalleryTreeItemStandardSectionPermission, GalleryTreeItemUserPermission


class GalleryTreeItemSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItem
        fields = '__all__'

class GalleryFolderSerializer(serializers.ModelSerializer):


    class Meta:
        model = GalleryFolder
        fields = '__all__'


class GalleryFileSerializer(serializers.ModelSerializer):
    document_url = DocumentSerializer(read_only=True, source='gallery_file_upload_file')
    # owner_name = serializers.SerializerMethodField()

    # def get_owner_name(self, obj):
    #     if obj.created_by.staff:
    #         return obj.created_by.staff.first_name + ' ' + obj.created_by.staff.middle_name + ' ' +obj.created_by.staff.last_name
    #     elif obj.created_by.student:
    #         return obj.created_by.student.first_name + ' ' + obj.created_by.student.middle_name + ' ' +obj.created_by.student.last_name
    #     return obj.created_by.username
    class Meta:
        model = GalleryFile
        fields = '__all__'

class GalleryTreeItemUserPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemUserPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'user')
            )
        ]
        fields = '__all__'

class GalleryTreeItemGroupPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemGroupPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'group')
            )
        ]
        fields = '__all__'

class GalleryTreeItemStandardPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemStandardPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('standard', 'tree_item')
            )
        ]
        fields = '__all__'



class GalleryTreeItemStandardSectionPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemStandardSectionPermission
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('tree_item', 'standard_section')
            )
        ]
        fields = '__all__'

class GalleryTreeItemGroupPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemGroupPermission
        fields = '__all__'

class GalleryTreeItemStandardPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemStandardPermission
        fields = '__all__'



class GalleryTreeItemStandardSectionPermissionSerializer(serializers.ModelSerializer):

    class Meta:
        model = GalleryTreeItemStandardSectionPermission
        fields = '__all__'

class GalleryTreeItemUserReadPermissionSerializer(serializers.ModelSerializer):
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
        model = GalleryTreeItemUserPermission
        fields = '__all__'

class GalleryTreeItemGroupPermissionReadSerializer(serializers.ModelSerializer):
    group_name = serializers.ReadOnlyField(source='group.name')

    class Meta:
        model = GalleryTreeItemGroupPermission
        fields = '__all__'

class GalleryTreeItemStandardPermissionReadSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard.name')
    academic_year_start_date = serializers.ReadOnlyField(source='academic_year.start_date')
    academic_year_end_date = serializers.ReadOnlyField(source='academic_year.end_date')

    class Meta:
        model = GalleryTreeItemStandardPermission
        fields = '__all__'

class GalleryTreeItemStandardSectionReadPermissionSerializer(serializers.ModelSerializer):
    standard_name = serializers.ReadOnlyField(source='standard_section.standard.name')
    section_name = serializers.ReadOnlyField(source='standard_section.section.name')

    class Meta:
        model = GalleryTreeItemStandardSectionPermission
        fields = '__all__'