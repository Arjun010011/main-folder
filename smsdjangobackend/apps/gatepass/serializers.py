"""
Gate Pass serializers.
"""
from django.utils import timezone
from rest_framework import serializers

from apps.gatepass.models import GatePass
from apps.gatepass.services.gatepass import _get_user_display_info
from apps.tenants.services.middlewares import get_current_db_name


class GatePassSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_type = serializers.SerializerMethodField()
    admission_number = serializers.SerializerMethodField()
    class_name = serializers.SerializerMethodField()
    section_name = serializers.SerializerMethodField()

    def get_user_name(self, obj):
        info = _get_user_display_info(obj.user)
        return info.get('full_name', '')

    def get_user_type(self, obj):
        if obj.user.student:
            return 'Student'
        if obj.user.staff:
            return 'Staff'
        return ''

    def get_admission_number(self, obj):
        info = _get_user_display_info(obj.user)
        return info.get('admission_number')

    def get_class_name(self, obj):
        if obj.standard_section and obj.standard_section.standard:
            return obj.standard_section.standard.name
        info = _get_user_display_info(obj.user)
        return info.get('class_name')

    def get_section_name(self, obj):
        if obj.standard_section and obj.standard_section.section:
            return obj.standard_section.section.name
        return None

    class Meta:
        model = GatePass
        fields = [
            'id', 'user', 'user_name', 'user_type', 'admission_number', 'class_name', 'section_name',
            'standard_section', 'reason', 'going_with', 'guardian_name', 'guardian_phone',
            'expected_return_time', 'date', 'approval_authority', 'gate_pass_number',
            'status', 'requested_by', 'approved_by', 'approved_at', 'reject_reason',
            'exit_time', 'guard_name', 'return_time', 'exit_verified_at', 'return_verified_at',
            'created', 'modified',
        ]
        read_only_fields = ['gate_pass_number', 'status', 'approved_by', 'approved_at',
                           'exit_time', 'return_time', 'exit_verified_at', 'return_verified_at',
                           'created', 'modified']


class GatePassCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating gate pass; validation and DB write go through here."""

    class Meta:
        model = GatePass
        fields = [
            'user', 'standard_section', 'reason', 'going_with', 'guardian_name',
            'guardian_phone', 'expected_return_time', 'date', 'approval_authority',
        ]

    def validate_user(self, value):
        if not value:
            raise serializers.ValidationError('User is required.')
        return value

    def validate_reason(self, value):
        return value or ''

    def validate_going_with(self, value):
        return value or 'parent'

    def create(self, validated_data):
        from django.db import transaction

        request = self.context.get('request')
        if not request:
            raise serializers.ValidationError('Request context is required to create gate pass.')
        gate_pass_number = self.context.get('gate_pass_number')
        if not gate_pass_number:
            raise serializers.ValidationError('Gate pass number from counter is required.')
        validated_data['gate_pass_number'] = gate_pass_number
        validated_data['status'] = 'requested'
        validated_data['requested_by'] = request.user
        validated_data.setdefault('date', timezone.now().date())

        with transaction.atomic(using=get_current_db_name()):
            return super().create(validated_data)
