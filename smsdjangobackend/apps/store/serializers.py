from rest_framework import serializers

from apps.shared.serializers import CustomUniqueValidator, DocumentSerializer
from apps.staffs.serializers import StaffGetNameSerializer
from apps.store.models.dataEntry import ItemSold, ItemSoldDetails, ItemSoldModeOfPayment
from apps.store.models.master import Category, SubCategory, Properties, PropertyValue, Item, Stock
from apps.store.models.purchaseMaster import Vendor, PurchaseMaster, PurchaseMasterStock
from apps.students.serializers import StudentListSerializer
from apps.users.serializers import UserReadSerializer
from apps.store.models.dataEntry import Package

class CategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Category.objects.filter(is_active=True))])

    class Meta:
        model = Category
        fields = '__all__'


class SubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SubCategory
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'category'),
                message='sub category is already exist(s) in the category.'
            )
        ]
        fields = '__all__'


class PropertiesSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Properties.objects.filter(is_active=True))])

    class Meta:
        model = Properties
        fields = '__all__'


class PropertyValueSerializer(serializers.ModelSerializer):
    properties_name = serializers.ReadOnlyField(source='properties.name')

    class Meta:
        model = PropertyValue
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'properties'),
                message='value is already exist(s) in the property.'
            )
        ]
        fields = '__all__'


class ItemSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Item.objects.filter(is_active=True))])

    class Meta:
        model = Item
        fields = '__all__'


class StockSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    sub_category_name = serializers.ReadOnlyField(source='sub_category.name')
    item_name = serializers.ReadOnlyField(source='item.name')
    item_code = serializers.ReadOnlyField(source='item.code')
    property_values = PropertyValueSerializer(read_only=True, source='property_value', many=True)

    class Meta:
        model = Stock
        fields = '__all__'


class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'address'),
                message='vendor name and address is already exist(s).'
            )
        ]
        fields = '__all__'


class FilteredListSerializer(serializers.ListSerializer):

    def to_representation(self, data):
        if self.context['request'].GET.get('transaction_type'):
            data = data.filter(transaction_type=self.context['request'].GET.get('transaction_type'))
        return super(FilteredListSerializer, self).to_representation(data)


class PurchaseMasterStockSerializer(serializers.ModelSerializer):
    vendor_name = serializers.ReadOnlyField(source='purchase_master.vendor.name')
    stock_details = StockSerializer(read_only=True, source='stock')

    class Meta:
        list_serializer_class = FilteredListSerializer
        model = PurchaseMasterStock
        fields = '__all__'


class PurchaseMasterSerializer(serializers.ModelSerializer):
    vendor_name = serializers.ReadOnlyField(source='vendor.name')
    attachment_details = DocumentSerializer(read_only=True, source='attachment')
    purchase_master = PurchaseMasterStockSerializer(read_only=True, many=True)
    invoice_num = serializers.CharField(validators=[CustomUniqueValidator(queryset=PurchaseMaster.objects.all())])

    class Meta:
        model = PurchaseMaster
        fields = '__all__'


class GetPurchaseMasterSerializer(serializers.ModelSerializer):
    vendor_name = serializers.ReadOnlyField(source='vendor.name')
    attachment_details = DocumentSerializer(read_only=True, source='attachment')

    class Meta:
        model = PurchaseMaster
        fields = '__all__'


class ItemSoldSerializer(serializers.ModelSerializer):
    user_data = UserReadSerializer(read_only=True, source='user')
    transaction_id = serializers.CharField(validators=[CustomUniqueValidator(queryset=ItemSold.objects.all())])

    class Meta:
        model = ItemSold
        fields = '__all__'

class ItemSoldDetailsReadSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='stock.item.name')
    total = serializers.SerializerMethodField()

    class Meta:
        model = ItemSoldDetails
        fields = '__all__'

    def get_total(self, obj):
        return obj.quantity * obj.unit_price if obj.quantity and obj.unit_price else 0

class ItemSoldReadSerializer(serializers.ModelSerializer):
    user_data = UserReadSerializer(read_only=True, source='user')
    item_sold_details_item_sold = ItemSoldDetailsReadSerializer(many=True)

    class Meta:
        model = ItemSold
        fields = '__all__'

class ItemSoldDetailsSerializer(serializers.ModelSerializer):
    item_sold_id = serializers.IntegerField(required=True)
    stock_id = serializers.IntegerField(required=True)

    class Meta:
        model = ItemSoldDetails
        fields = '__all__'

class PackageSerializer(serializers.ModelSerializer):

    class Meta:
        model = Package
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.all(),
                fields=('mode_of_payment', 'item_sold'),
                message='Mode of payment already exist in fee collection'
            )
        ]
        fields = '__all__'


class ItemSoldModeOfPaymentSerializer(serializers.ModelSerializer):

    class Meta:
        model = ItemSoldModeOfPayment
        fields = '__all__'