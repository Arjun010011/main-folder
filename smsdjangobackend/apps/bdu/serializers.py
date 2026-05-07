from rest_framework import serializers
from rest_framework.validators import UniqueValidator

from apps.bdu.models import (Bdu, BduValidationClass, BduColumn, BduValidation)


class BduSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bdu
        exclude = ['created', 'modified']


class BduValidationClassSerializer(serializers.ModelSerializer):
    validation_type = serializers.CharField(validators=[
        UniqueValidator(queryset=BduValidationClass.objects.all(), message='Validation type is already exists.')])
    name = serializers.ReadOnlyField(source='validation_type')

    class Meta:
        model = BduValidationClass
        exclude = ['created', 'modified']


class BduValidationSerializer(serializers.ModelSerializer):
    validation_type = serializers.ReadOnlyField(source='bdu_validation_class.validation_type')
    error_message = serializers.ReadOnlyField(source='bdu_validation_class.error_message')
    bdu_transaction_id = serializers.ReadOnlyField(source='bdu_column.bdu.transaction_id', read_only=True)

    class Meta:
        model = BduValidation
        exclude = ['created', 'modified']


class BduColumnSerializer(serializers.ModelSerializer):
    bdu_validation_column = BduValidationSerializer(many=True, read_only=True)

    class Meta:
        model = BduColumn
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('bdu', 'schema_column'),
                message='Schema Column is exists in BDU.'
            )
        ]
        exclude = ['created', 'modified']


class BduGetColumnSerializer(serializers.ModelSerializer):
    bdu_validation_column = BduValidationSerializer(many=True, read_only=True)

    class Meta:
        model = BduColumn
        fields = ['id', 'alias', 'bdu_validation_column']


class BduGetSerializer(serializers.ModelSerializer):
    bdu_column_bdu = BduColumnSerializer(read_only=True, many=True)

    class Meta:
        model = Bdu
        exclude = ['created', 'modified']


class BduUpdateColumnSerializer(serializers.ModelSerializer):
    bdu_validation_column = BduValidationSerializer(many=True)

    class Meta:
        model = BduColumn
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('bdu', 'schema_column')
            )
        ]
        fields = '__all__'

    def update(self, instance, validated_data):
        bdu_validation_data = validated_data.pop('bdu_validation_column')
        bdu_column = (instance.bdu_validation_column).all()
        bdu_column = list(bdu_column)
        instance.bdu = validated_data.get('bdu', instance.bdu)
        instance.schema_table = validated_data.get('schema_table', instance.schema_table)
        instance.schema_column = validated_data.get('schema_column', instance.schema_column)
        instance.required = validated_data.get('required', instance.required)
        instance.alias = validated_data.get('alias', instance.alias)
        instance.update_allowed = validated_data.get('update_allowed', instance.update_allowed)
        instance.exclude_from_view = validated_data.get('exclude_from_view', instance.exclude_from_view)
        instance.ignored = validated_data.get('ignored', instance.ignored)
        instance.save()

        for bdu_data in bdu_validation_data:
            if bdu_column:
                bdu = bdu_column.pop(0)
                bdu.bdu_validation_class = bdu_data.get('bdu_validation_class', bdu.bdu_validation_class)
                bdu.validation_value = bdu_data.get('validation_value', bdu.validation_value)
                bdu.save()
            else:
                BduValidation.objects.create(bdu_column=instance, **bdu_data)

        for bdu_data in bdu_column:
            bdu_data.delete()
        return instance


# class GeneralSerializer(serializers.ModelSerializer):
#     class Meta:
#         model = None
#         fields = '__all__'
