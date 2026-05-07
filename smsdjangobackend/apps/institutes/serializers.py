from django.core.validators import URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import InstituteAdresses
from apps.classes.serializers import AcademicYearBranchMappingReadSerializer, StandardSerializer
from apps.institutes.models.banner import Banner
from apps.institutes.models.biometric_machine import BiometricMachine
from apps.institutes.models.institute import Institute
from apps.institutes.models.building import Building, Floor, Asset, Room, RoomAssetMapping, RoomDocumentMapping
from apps.institutes.models.financialyear import FinancialYear
from apps.institutes.models.resource import Resource
from apps.institutes.models.sibling_institute import SwitchableInstitute, UserSwitchableInstituteMapping
from apps.institutes.models.visitor import Visitor, Reason, VisitorDocumentMapping
from apps.shared.serializers import DocumentSerializer, CustomUniqueValidator, ActiveFilteredListSerializer, MapAddressSerializer
from apps.users.serializers import UserReadSerializer

class AcademicYearSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    branch_data = AcademicYearBranchMappingReadSerializer(source='academic_year_branch_mapping_academic_year', many=True,read_only=True)


    def get_name(self, obj):
        if obj.alias:
            return obj.alias
        else:
            return f'{obj.start_date.year}-{obj.end_date.year}'

    class Meta:
        model = AcademicYear
        exclude = ['created', 'modified']

    def validate(self, data):
        # if data['end_date'].year - data['start_date'].year != 1:
        #     raise serializers.ValidationError("Academic is lesser than 1year.")
        return data


class AcademicYearViewSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    current_year = serializers.SerializerMethodField()
    branch_data = AcademicYearBranchMappingReadSerializer(source='academic_year_branch_mapping_academic_year', many=True)

    def get_name(self, obj):
        if obj.alias:
            return obj.alias
        else:
            return f'{obj.start_date.year}-{obj.end_date.year}'

    def get_current_year(self, obj):
        if obj.start_date <= datetime.now().date() <= obj.end_date:
            return True
        return False

    def to_representation(self, data):
        return super(AcademicYearViewSerializer, self).to_representation(data)

    class Meta:
        model = AcademicYear
        fields = [
            'id', 'name', 'start_date', 'end_date', 'current_year', 'branch_data','alias'
        ]


class FinancialYearSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return f'{obj.start_date.year}-{obj.end_date.year}'

    class Meta:
        model = FinancialYear
        exclude = ['created', 'modified']


class GetFinancialYearSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()
    current_year = serializers.SerializerMethodField()

    def get_current_year(self, obj):
        return False

    def get_name(self, obj):
        return f'{obj.start_date.year}-{obj.end_date.year}'

    class Meta:
        model = FinancialYear
        fields = ['id', 'name', 'start_date', 'end_date', 'current_year', 'is_locked']


class ResourceSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Resource.objects.filter(is_active=True))])

    class Meta:
        model = Resource
        exclude = ['created', 'modified']


class BuildingSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Building.objects.filter(is_active=True))])

    class Meta:
        model = Building
        fields = '__all__'


class FloorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('name', 'building', 'is_active'),
                message=_('Same floor Name exist for the building')
            )
        ]
        fields = '__all__'


class FloorReadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Floor
        list_serializer_class = ActiveFilteredListSerializer
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('name', 'building', 'is_active'),
                message=_('Same floor Name exist for the building')
            )
        ]
        exclude = ['created', 'modified']


class BuildingReadSerializer(serializers.ModelSerializer):
    floor_building = FloorReadSerializer(many=True, read_only=True)
    building_for_name = serializers.SerializerMethodField()

    def get_building_for_name(self, obj):
        for i in Building.buildingFor:
            if i[0] == obj.building_for:
                return i[1]

    class Meta:
        model = Building
        exclude = ['created', 'modified']


class AssetSerialzier(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Asset.objects.filter(is_active=True))])

    class Meta:
        model = Asset
        fields = '__all__'


class RoomAssetMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomAssetMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('room', 'asset', 'is_active'),
                message=_('Same Asset exist in the Room')
            )
        ]
        fields = '__all__'


class RoomAssetMappingReadSerializer(serializers.ModelSerializer):
    asset_name = serializers.ReadOnlyField(source='asset.name')

    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = RoomAssetMapping
        exclude = ['created', 'modified']


class RoomDocumentMappingSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomDocumentMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('room', 'document', 'is_active'),
                message=_('Duplicate Image Exist')
            )
        ]
        fields = '__all__'


class RoomDocumentMappingReadSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')

    class Meta:
        list_serializer_class = ActiveFilteredListSerializer
        model = RoomDocumentMapping
        exclude = ['created', 'modified']


class RoomSerializer(serializers.ModelSerializer):
    roomassetmapping_room = RoomAssetMappingReadSerializer(many=True, read_only=True)
    floor_name = serializers.ReadOnlyField(source='floor.name')
    building_name = serializers.ReadOnlyField(source='floor.building.name')
    roomdocument_room = RoomDocumentMappingReadSerializer(many=True, read_only=True)
    building = serializers.ReadOnlyField(source='floor.building.id')

    class Meta:
        model = Room
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('name', 'floor', 'is_active'),
                message=_('Same Room name exist in the floor')
            )
        ]
        fields = '__all__'


class BannerSerializer(serializers.ModelSerializer):
    file_details = DocumentSerializer(read_only=True, source='file')

    class Meta:
        model = Banner
        fields = '__all__'


class ReasonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Reason
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('reason_type', 'name'),
                message='Reason is already exist(s)'
            )
        ]
        fields = '__all__'

class VisitorDocumentMappingReadSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='document')

    def __init__(self, *args, **kwargs):
        super(VisitorDocumentMappingReadSerializer, self).__init__(*args, **kwargs)

    class Meta:
        model = VisitorDocumentMapping
        fields = '__all__'


class VisitorSerializer(serializers.ModelSerializer):
    from apps.hostel.serializers import RoomAllocationVisitorReadSerializer
    allocation_details = RoomAllocationVisitorReadSerializer(source='roomallocation', read_only=True)
    reason_details = ReasonSerializer(source='reason', read_only=True)
    building_name = serializers.ReadOnlyField(source='building.name')
    user_details = UserReadSerializer(source='user', read_only=True)
    document_data = VisitorDocumentMappingReadSerializer(many=True, source='visitor_document_mapping_visitor', read_only=True)

    class Meta:
        model = Visitor
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('checkin', 'name', 'checkout'),
                message='Visitor Already checked in'
            )
        ]
        fields = '__all__'

class VisitorDocumentMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = VisitorDocumentMapping
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('visitor', 'document'),
                message='visitor document already exist'
            )
        ]
        fields = '__all__'

class InstituteAddressSerializer(serializers.ModelSerializer):

    class Meta:
        model = InstituteAdresses
        fields = '__all__'

class InstituteAddressReadSerializer(serializers.ModelSerializer):
    map_address_data = MapAddressSerializer(read_only=True, source='map')
    standard_data = StandardSerializer(many=True, read_only=True, source='standard')

    class Meta:
        model = InstituteAdresses
        fields = '__all__'

class InstituteAddressReadWithoutStandardSerializer(serializers.ModelSerializer):
    map_address_data = MapAddressSerializer(read_only=True, source='map')

    class Meta:
        model = InstituteAdresses
        exclude = ['standard', 'created', 'modified']

class InstituteSerializer(serializers.ModelSerializer):
    document_details = DocumentSerializer(read_only=True, source='logo')

    class Meta:
        model = Institute
        exclude = ['created', 'modified']

    def validate_social_links(self, value):

        if value in (None, ''):
            return {}

        if not isinstance(value, dict):
            raise serializers.ValidationError(
                "social_links must be an object with key-value pairs."
            )

        allowed_keys = {
            "instagram",
            "facebook",
            "whatsapp",
            "phone",
            "website",
            "twitter",
            "linkedin",
            "youtube"
        }

        url_validator = URLValidator()

        for key, val in value.items():
            if not isinstance(key, str):
                raise serializers.ValidationError(
                    "All keys in social_links must be strings."
                )

            if key not in allowed_keys:
                raise serializers.ValidationError(
                    f"'{key}' is not a supported social link."
                )

            if not isinstance(val, str) or not val.strip():
                raise serializers.ValidationError(
                    f"Value for '{key}' must be a non-empty string."
                )

            if key in {"instagram", "facebook", "website", "twitter", "linkedin", "youtube"}:
                try:
                    url_validator(val)
                except DjangoValidationError:
                    raise serializers.ValidationError(
                        f"'{key}' must be a valid URL."
                    )

            if key in {"phone", "whatsapp"}:
                if not val.lstrip("+").isdigit():
                    raise serializers.ValidationError(
                        f"'{key}' must be a valid phone number."
                    )

        return value

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["social_links"] = data.get("social_links") or {}
        return data


class SwitchableInstituteSerializer(serializers.ModelSerializer):
    company_id = serializers.CharField(
        validators=[CustomUniqueValidator(queryset=SwitchableInstitute.objects.all(), message='company_id already exists')])

    class Meta:
        model = SwitchableInstitute
        fields = '__all__'

class UserSwitchableInstituteMappingSerializer(serializers.ModelSerializer):

    class Meta:
        model = UserSwitchableInstituteMapping
        fields = '__all__'

class BiometricMachineSerializer(serializers.ModelSerializer):

    class Meta:
        model = BiometricMachine
        fields = '__all__'