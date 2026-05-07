from rest_framework import serializers, exceptions
from rest_framework.validators import UniqueValidator

from apps.payroll.models.payroll import (SalaryComponent, SalaryPlan, SalaryEmployeePlan, SalaryEmployeeMonthPlan,
                                       SalaryFormula, SalaryFormulaRule, SalaryEmployeeOverride, SalaryEmployeeIncrement,
                                       StaffManualAttendance)

from apps.shared.serializers import CustomUniqueValidator
from apps.staffs.models import Staff


class SalaryComponentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(
        validators=[CustomUniqueValidator(queryset=SalaryComponent.objects.filter(is_active=True))])

    class Meta:
        model = SalaryComponent
        exclude = ['created', 'modified']


class SalaryPlanSerializer(serializers.ModelSerializer):
    salary_component_name = serializers.ReadOnlyField(source='salary_component.name')
    is_deduction = serializers.ReadOnlyField(source='salary_component.is_deduction')
    percentage_component_name = serializers.ReadOnlyField(source='percentage_of.salary_component.name')
    percentage_of_component_id = serializers.SerializerMethodField()
    amount = serializers.SerializerMethodField()

    def get_percentage_of_component_id(self, obj):
        if obj.is_amount:
            return 0
        else:
            if obj.percentage_of is None:
                return None
        return obj.percentage_of.salary_component.id

    def get_amount(self, obj):
        if obj.is_amount:
            return obj.rate
        else:
            if obj.percentage_of:
                amount = self.get_amount(obj.percentage_of)
            elif self.context['request'].GET.get('staff'):
                try:
                    amount = Staff.objects.get(id=self.context['request'].GET.get('staff')).salary
                    if not amount:
                        raise exceptions.ValidationError('')
                except:
                    raise exceptions.ValidationError('Staff Fixed pay is not found.')
            else:
                amount = 0
            amount = (amount * obj.rate) / 100
            return amount

    def __init__(self, *args, **kwargs):
        remove_fields = kwargs.pop('remove_fields', None)
        super(SalaryPlanSerializer, self).__init__(*args, **kwargs)

        if remove_fields:
            # for multiple fields in a list
            for field_name in remove_fields:
                self.fields.pop(field_name)

    class Meta:
        model = SalaryPlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('financial_year', 'salary_component'),
                message='Salary component is already exists.'
            )
        ]
        exclude = ['created', 'modified']


class SalaryEmployeePlanSerializer(serializers.ModelSerializer):
    salary_component_name = serializers.ReadOnlyField(source='salary_component.name')
    is_deduction = serializers.ReadOnlyField(source='salary_component.is_deduction')

    class Meta:
        model = SalaryEmployeePlan
        # validators = [
        #     serializers.UniqueTogetherValidator(
        #         queryset=model.objects.all(),
        #         fields=('staff', 'salary_component'),
        #         message='Salary component is already exists for the Staff.'
        #     )
        # ]
        fields = '__all__'


class SalaryEmployeeMonthPlanSerializer(serializers.ModelSerializer):
    salary_component_name = serializers.ReadOnlyField(source='salary_component.name')
    is_deduction = serializers.ReadOnlyField(source='salary_component.is_deduction')

    class Meta:
        model = SalaryEmployeeMonthPlan
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('staff', 'salary_component', 'salary_month'),
                message='Salary component is already exists for the Staff.'
            )
        ]
        exclude = ['created', 'modified']


class SalaryFormulaRuleSerializer(serializers.ModelSerializer):

    class Meta:
        model = SalaryFormulaRule
        exclude = ['created_at', 'modified_at', 'created_by', 'modified_by']

    def validate(self, data):
        calc_type = data.get('calculation_type')
        value = data.get('value')
        base_component = data.get('base_component')
        expression = data.get('expression')

        # base_component is optional for PERCENT — null means "% of Gross Salary"

        if calc_type == 'EXPRESSION' and not expression:
            raise serializers.ValidationError(
                "expression is required for EXPRESSION calculation."
            )

        if calc_type in ['FIXED', 'PERCENT'] and value is None:
            raise serializers.ValidationError(
                "value is required for FIXED and PERCENT."
            )

        return data

class SalaryFormulaRuleReadSerializer(serializers.ModelSerializer):

    salary_component_name = serializers.ReadOnlyField(source='salary_component.name')
    base_component_name = serializers.ReadOnlyField(source='base_component.name')
    formula_name = serializers.ReadOnlyField(source='formula.name')
    created_by_name = serializers.ReadOnlyField(source='created_by.username')
    modified_by_name = serializers.ReadOnlyField(source='modified_by.username')

    class Meta:
        model = SalaryFormulaRule
        fields = '__all__'

class SalaryFormulaSerializer(serializers.ModelSerializer):

    class Meta:
        model = SalaryFormula
        exclude = ['created_at', 'modified_at']

    def validate(self, data):
        if data.get('is_default') and data.get('financial_year'):
            qs = SalaryFormula.objects.filter(
                financial_year=data['financial_year'],
                is_default=True
            )

            if self.instance:
                qs = qs.exclude(id=self.instance.id)

            if qs.exists():
                raise serializers.ValidationError(
                    "Default formula already exists for this financial year."
                )

        return data

class SalaryFormulaReadSerializer(serializers.ModelSerializer):

    financial_year_name = serializers.ReadOnlyField(source='financial_year.name')
    rules = SalaryFormulaRuleReadSerializer(many=True, read_only=True)

    class Meta:
        model = SalaryFormula
        fields = '__all__'

class SalaryEmployeeOverrideSerializer(serializers.ModelSerializer):

    staff_name = serializers.CharField(required=False, allow_blank=True)
    salary_year = serializers.IntegerField(required=False)
    salary_month = serializers.IntegerField(required=False)

    class Meta:
        model = SalaryEmployeeOverride
        exclude = ['created_at', 'modified_at']

    def validate(self, data):
        reason = (data.get('reason') or '').strip()
        if not reason:
            raise serializers.ValidationError(
                "Reason is mandatory for override."
            )

        if not data.get('month_plan'):
            raise serializers.ValidationError(
                "month_plan is required."
            )

        return data

    def create(self, validated_data):
        month_plan = validated_data.get('month_plan')
        if month_plan:
            if not validated_data.get('staff') and month_plan.staff:
                validated_data['staff'] = month_plan.staff
            if not validated_data.get('staff_name'):
                validated_data['staff_name'] = str(month_plan.staff) if month_plan.staff else ''
            if not validated_data.get('salary_year') and month_plan.salary_month:
                validated_data['salary_year'] = month_plan.salary_month.year
            if not validated_data.get('salary_month') and month_plan.salary_month:
                validated_data['salary_month'] = month_plan.salary_month.month
            if not validated_data.get('salary_component') and month_plan.salary_component:
                validated_data['salary_component'] = month_plan.salary_component
        return super().create(validated_data)

class SalaryEmployeeOverrideReadSerializer(serializers.ModelSerializer): 
    salary_component_name = serializers.ReadOnlyField(source='salary_component.name', default=None)
    is_deduction = serializers.ReadOnlyField(source='salary_component.is_deduction', default=None)
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username', default=None) 
    created_by_name = serializers.ReadOnlyField(source='created_by.username', default=None) 
    modified_by_name = serializers.ReadOnlyField(source='modified_by.username', default=None) 
    
    class Meta: 
        model = SalaryEmployeeOverride 
        fields = '__all__'

class SalaryEmployeeIncrementSerializer(serializers.ModelSerializer):

    staff_name = serializers.CharField(required=False, allow_blank=True)
    employee_plan = serializers.PrimaryKeyRelatedField(
        queryset=SalaryEmployeePlan.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = SalaryEmployeeIncrement
        exclude = ['created_at', 'modified_at', 'applied', 'old_gross', 'new_gross']

    def validate(self, data):
        calculation_mode = data.get('calculation_mode', 'AMOUNT')
        if calculation_mode == 'AMOUNT':
            amount = data.get('amount')
            if amount is not None and amount <= 0:
                raise serializers.ValidationError(
                    "Increment amount must be positive."
                )
        elif calculation_mode == 'PERCENTAGE':
            percentage = data.get('percentage')
            if percentage is not None and percentage <= 0:
                raise serializers.ValidationError(
                    "Percentage must be positive."
                )
        return data

    def create(self, validated_data):
        staff = validated_data.get('staff')
        if staff and not validated_data.get('staff_name'):
            validated_data['staff_name'] = str(staff)
        return super().create(validated_data)

class SalaryEmployeeIncrementReadSerializer(serializers.ModelSerializer): 
    approved_by_name = serializers.ReadOnlyField(source='approved_by.username', default=None) 
    created_by_name = serializers.ReadOnlyField(source='created_by.username', default=None) 
    modified_by_name = serializers.ReadOnlyField(source='modified_by.username', default=None)
    staff_salary = serializers.ReadOnlyField(source='staff.salary', default=None)
    employee_id = serializers.ReadOnlyField(source='staff.employee_id', default=None)
    date_joined = serializers.ReadOnlyField(source='staff.date_joined', default=None)
    staff_name = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        if obj.staff:
            parts = [p for p in [obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name] if p]
            return " ".join(parts)
        return obj.staff_name
    
    class Meta: 
        model = SalaryEmployeeIncrement 
        fields = '__all__'


class StaffManualAttendanceReadSerializer(serializers.ModelSerializer):
    staff_name = serializers.SerializerMethodField()
    absent_days = serializers.SerializerMethodField()
    attendance_source = serializers.SerializerMethodField()

    def get_staff_name(self, obj):
        if obj.staff:
            parts = [p for p in [obj.staff.first_name, obj.staff.middle_name, obj.staff.last_name] if p]
            return ' '.join(parts)
        return ''

    def get_absent_days(self, obj):
        return max(0, obj.working_days - obj.present_days)

    def get_attendance_source(self, obj):
        if obj.present_days > 0:
            return 'manual'
        return 'not_marked'

    class Meta:
        model = StaffManualAttendance
        fields = ['id', 'staff', 'staff_name', 'salary_month', 'working_days',
                  'present_days', 'absent_days', 'attendance_source', 'is_active']