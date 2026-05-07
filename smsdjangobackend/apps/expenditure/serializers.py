from django.apps import apps
from django.contrib.contenttypes.models import ContentType
from rest_framework import serializers

from apps.expenditure.models.expense import ExpenseType, Expense, ExpensePlan
from apps.expenditure.models.token import Token
from apps.shared.serializers import DocumentSerializer, CustomUniqueValidator


class ExpenseTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseType
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('name', 'expense_for'),
                message='Expense type is already exists.'
            )
        ]
        fields = '__all__'


class ExpensePlanSerializer(serializers.ModelSerializer):
    expense_type_name = serializers.ReadOnlyField(source='expense_type.name')
    expense_type_codename = serializers.ReadOnlyField(source='expense_type.codename')

    class Meta:
        model = ExpensePlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('financial_year', 'expense_type'),
                message='Expense type is already exists in the Financial year.'
            )
        ]
        fields = '__all__'


class TokenSerializer(serializers.ModelSerializer):
    other_details = serializers.SerializerMethodField()
    staff_first_name = serializers.ReadOnlyField(source='staff.first_name')
    staff_middle_name = serializers.ReadOnlyField(source='staff.middle_name')
    staff_last_name = serializers.ReadOnlyField(source='staff.last_name')

    def get_other_details(self, obj):
        if not obj.token_for:
            return None
        contentObj = ContentType.objects.get(id=obj.token_for.content_type.pk)
        model = apps.get_model(contentObj.app_label, contentObj.model)
        data = model.objects.filter(id=obj.token_for.object_id)
        return data.values().first()

    class Meta:
        model = Token
        fields = '__all__'


class ExpenseSerializer(serializers.ModelSerializer):
    expense_type_name = serializers.ReadOnlyField(source='expense_plan.expense_type.name')
    expense_type_codename = serializers.ReadOnlyField(source='expense_plan.expense_type.codename')
    expense_type = serializers.ReadOnlyField(source='expense_plan.expense_type.id')
    financial_year = serializers.ReadOnlyField(source='expense_plan.financial_year.id')
    attachment_details = DocumentSerializer(read_only=True, source='attachment')
    building_name = serializers.ReadOnlyField(source='building.name')
    token_details = TokenSerializer(read_only=True, source='token')
    amount = serializers.SerializerMethodField()
    other_details = serializers.SerializerMethodField()

    def get_amount(self, obj):
        return obj.total_amount - obj.tax_amount

    def get_other_details(self, obj):
        if not obj.token_for:
            return None
        contentObj = ContentType.objects.get(id=obj.token_for.content_type.pk)
        model = apps.get_model(contentObj.app_label, contentObj.model)
        data = model.objects.filter(id=obj.token_for.object_id)
        return data.values().first()

    class Meta:
        model = Expense
        fields = '__all__'
