from rest_framework import viewsets, exceptions
from rest_framework.views import Response
from datetime import datetime
from num2words import num2words

from apps.shared.services import SharedService,PDFService
from apps.store.models.dataEntry import ItemSold 
from apps.store.models.master import (Category, SubCategory, Properties, PropertyValue, Item, Stock)
from apps.store.models.purchaseMaster import Vendor, PurchaseMaster
from apps.store.serializers import (CategorySerializer, ItemSoldReadSerializer, PackageSerializer, SubCategorySerializer, PropertiesSerializer,
                                    PropertyValueSerializer, ItemSerializer, VendorSerializer, StockSerializer,
                                    PurchaseMasterSerializer, GetPurchaseMasterSerializer, ItemSoldSerializer)
from apps.store.services.master import (add_sub_category, update_data, delete_data, add_property_value, get_data)
from apps.store.services.purchase_master import (add_stock, add_purchase_master, get_purchase_master, TRANSACTION_TYPE,
                                                 add_purchase_master_return, get_purchase_master_detail, add_item_sold, read_store_stock_detail,
                                                 update_stock, delete_stock, delete_item_sold, get_item_sold)
from apps.shared.services_shared.common import get_selected_template
from apps.institutes.models.institute import Institute
from apps.store.models.dataEntry import Package


class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Category.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['category'], 'name')
        response = SharedService.add_data(self, request.data['category'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'sub_category__is_active': True, 'sub_category__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'sub_category__is_active': True, 'sub_category__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class SubCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = SubCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'category']

    def get_queryset(self):
        self.queryset = SubCategory.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_sub_category(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'stock_sub_category__is_active': True, 'stock_sub_category__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'stock_sub_category__is_active': True, 'stock_sub_category__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class PropertiesViewSet(viewsets.ModelViewSet):
    serializer_class = PropertiesSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Properties.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['properties'], 'name')
        response = SharedService.add_data(self, request.data['properties'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'properties__is_active': True, 'properties__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'properties__is_active': True, 'properties__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class PropertyValueViewSet(viewsets.ModelViewSet):
    serializer_class = PropertyValueSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'properties']

    def get_queryset(self):
        self.queryset = PropertyValue.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_property_value(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'stock_property_value__is_active': True, 'stock_property_value__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'stock_property_value__is_active': True, 'stock_property_value__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'code']

    def get_queryset(self):
        self.queryset = Item.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['item'], 'name')
        response = SharedService.add_data(self, request.data['item'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'stock_item__is_active': True, 'stock_item__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'stock_item__is_active': True, 'stock_item__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class VendorViewSet(viewsets.ModelViewSet):
    serializer_class = VendorSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Vendor.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data['vendors'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'vendor_master__is_active': True, 'vendor_master__isnull': False}
        response = update_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'vendor_master__is_active': True, 'vendor_master__isnull': False}
        response = delete_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class StockViewSet(viewsets.ModelViewSet):
    serializer_class = StockSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'sub_category', 'item', 'property_value', 'category']
    search_fields = ['category__name', 'sub_category__name', 'item__name', 'opening_stock', 'available_stock']
    ordering_fields = ['category', 'sub_category', 'item', 'opening_stock', 'available_stock']

    def get_queryset(self):
        self.queryset = Stock.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = add_stock(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_stock(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_stock(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = read_store_stock_detail(self)
        return Response(response)


class PurchaseMasterViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseMasterSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'vendor', 'stock_date', 'invoice_date']
    search_fields = ['vendor__name', 'voucher_num', 'invoice_num', 'stock_date', 'invoice_date']
    ordering_fields = ['voucher_num', 'invoice_num', 'stock_date', 'invoice_date', ('vendor_name', 'vendor__name')]

    def get_queryset(self):
        self.queryset = PurchaseMaster.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_purchase_master(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = GetPurchaseMasterSerializer
        response = get_purchase_master(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = get_purchase_master_detail(self)
        return Response(response)


class PurchaseMasterReturnViewSet(viewsets.ModelViewSet):
    serializer_class = PurchaseMasterSerializer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'vendor', 'stock_date', 'invoice_date']
    search_fields = ['vendor__name', 'voucher_num', 'invoice_num', 'stock_date', 'invoice_date']
    ordering_fields = ['voucher_num', 'invoice_num', 'stock_date', 'invoice_date', ('vendor_name', 'vendor__name')]

    def get_queryset(self):
        self.queryset = PurchaseMaster.objects.filter(purchase_master__is_active=True,
                                                      purchase_master__transaction_type=TRANSACTION_TYPE[
                                                          'RETURNED']).distinct()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_purchase_master_return(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = GetPurchaseMasterSerializer
        response = get_purchase_master(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)


class ItemSoldViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSoldSerializer
    http_method_names = ['post', 'get', 'delete']
    search_fields = ['user__staff__first_name', 'user__student__first_name', 'for_date']
    ordering_fields = ['guest_name', 'for_date']

    def get_queryset(self):
        self.queryset = ItemSold.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_item_sold(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = ItemSoldReadSerializer
        response = get_item_sold(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = ItemSoldReadSerializer
        response = SharedService.read_data(self)
        if self.request.GET.get('print_receipt'):
            default = 'default_itemsold_receipt.html'
            selected_template, number_of_copies = get_selected_template(self, 'itemsold', 'pdf', default)
            response['number_of_copies'] = range(number_of_copies)
            response['data']['date'] = datetime.strptime(response['data']['for_date'], '%Y-%m-%d').strftime('%d-%m-%Y')
            response['data']['today'] = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
            response['data']['amount_in_words'] = num2words(response['data']['total_amount_inc_gst'], lang='en') + ' Only' 
            response['institute'] = Institute.get_institute(self)
            path = 'itemsold_receipts/'+selected_template
            response = PDFService.receipt_new(self, response, 'Item Sold Receipt', path)
            return response
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_item_sold(self, self.kwargs['pk'])
        return Response(response)


class PackageViewSet(viewsets.ModelViewSet):
    serializer_class = PackageSerializer
    http_method_names = ['post', 'get', 'delete']

    def get_queryset(self):
        self.queryset = Package.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.delete_unrefered_data()
        return Response(response)