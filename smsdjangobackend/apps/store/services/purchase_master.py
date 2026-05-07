from django.db import transaction
from rest_framework import exceptions
import datetime
from apps.finance.models.fee import StudentStoreMapping

from apps.notification.services.notification_service import send_notification
from apps.shared.services import CounterService, FormdefinitionService, NotificationBodyTemplate, SharedService
from apps.shared.services_shared.common import get_full_name
from apps.store.models.dataEntry import ItemSold, ItemSoldDetails
from apps.store.models.master import Item, Stock, StockAvailableBalanceTrack, StockSellingPriceTrack
from apps.store.models.purchaseMaster import PurchaseMasterStock
from apps.store.serializers import ItemSoldDetailsSerializer, ItemSoldModeOfPaymentSerializer, ItemSoldSerializer, StockSerializer, PurchaseMasterStockSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User

TRANSACTION_TYPE = {'RECEIVED': 'received', 'RETURNED': 'returned', 'CANCELLED': 'cancelled'}

#used as common for many places
def item_sold_details(self, stock_id):
    data = ItemSoldDetails.objects.filter(stock=stock_id, item_sold__is_active=True).values('id', 'quantity')
    return_data = {
        'total_items': 0, #including sold and pending to sale
        'number_of_items_issued': 0,
        'number_of_items_not_issued': 0,
    }
    for row_data in data:
        return_data['number_of_items_issued'] += row_data['quantity']
        return_data['total_items'] += row_data['quantity']
    return return_data

#used as common
def update_available_stock(self, stock_list):
    #[{'id': 1, 'available_stock': 1}]
    for stock in stock_list:
        instance = Stock.objects.get(id=stock['id'])
        stock_serializer = StockSerializer(instance=instance, partial=True,
                                            data=stock)
        stock_serializer.is_valid(raise_exception=True)
        stock_serializer.save()
    return True

def item_purchased_details(self, stock_id):
    data = PurchaseMasterStock.objects.filter(stock=stock_id).values('id', 'quantity')
    return_data = {
        'total_items': 0
    }
    for row_data in data:
        return_data['total_items'] += row_data['quantity']
    return return_data


def validate_stock_add_or_update(self, data):
    # nikhil move the validation function here for add and update stock
    pass

"""
If any changes done change in the update function as well
"""
def add_stock(self, data):
    if float(data['opening_stock']) < 0 or float(data['available_stock']) < 0 or float(data['min_stock']) < 0:
        raise exceptions.ValidationError('stock values should be greater than 0.')
    queryset = self.get_queryset().filter(is_active=True, item=data['item'])
    val, flag = '', True
    if data['category']:
        queryset = queryset.filter(category=data['category'])
    if data['sub_category']:
        queryset = queryset.filter(sub_category=data['sub_category'])
    if data['property_value']:
        queryset = queryset.filter(property_value__in=data['property_value'])
        if set(list(queryset.values_list('property_value', flat=True))) != set([int(i) for i in data['property_value']]):
            flag = False
        val = 'with similar properties '
    # if flag and queryset.exists():
    #     raise exceptions.ValidationError(f'Item name {val}is already exist(s).')
    response = SharedService.add_data(self, data, False)
    return response


def update_stock(self, data, **kwargs):
    is_stock_item_exist_in_selling = True if ItemSoldDetails.objects.filter(stock=data['id'], item_sold__is_active=True) else False
    is_stock_item_exist_in_buying = True if PurchaseMasterStock.objects.filter(stock=data['id']) else False
    block_edit_for_fields = ['opening_stock', 'item'] #block when already stock is reduced
    is_blocked_edit_fields_exist = set(data.keys()).intersection(block_edit_for_fields)
    if is_stock_item_exist_in_selling and is_blocked_edit_fields_exist:
        raise exceptions.ValidationError(f'{list(set(data.keys()).intersection(block_edit_for_fields))} non editable fields as item is issued')
    if is_stock_item_exist_in_buying and is_blocked_edit_fields_exist:
        raise exceptions.ValidationError(f'{list(set(data.keys()).intersection(block_edit_for_fields))} non editable fields as item is purchased')
    instance = Stock.objects.get(id=self.kwargs['pk'])
    if 'item' in data and data['item']:
        filter_query = {'is_active': True, 'item': data['item'], 'sub_category': data['sub_category']}
        if data['property_value']:
            filter_query['property_value__in'] = data['property_value']
        if Stock.objects.filter(**filter_query).exclude(id=instance.pk).exists():
            val = Item.objects.get(id=data['item']).name
            raise exceptions.ValidationError(f'Item name {val}is already exist(s).')
    selling_price_track = {
            'stock': instance, 'selling_price': instance.current_selling_price,
    }
    available_quan_track = {}
    if 'available_stock' in data and float(instance.available_stock) != float(data['available_stock']):
        if 'reason' not in data or not data['reason']:
            raise exceptions.ValidationError('reason is mandatory')
        if float(data['available_stock']) - instance.available_stock > 0:
            is_stock_increment = 1
        else:
            is_stock_increment = 0
        updating_stock = abs(float(data['available_stock']) - instance.available_stock)
        available_quan_track = {
            'stock': instance, 'current_available_stock': instance.available_stock,
            'updating_stock': updating_stock, 'is_stock_increment': is_stock_increment,
            'reason': data['reason'], 'updated_by_user': self.request.user 
        }
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, **kwargs)
        if 'current_selling_price' in data and float(instance.current_selling_price) != float(data['current_selling_price']):
            StockSellingPriceTrack.objects.create(**selling_price_track)
        if available_quan_track:
            StockAvailableBalanceTrack.objects.create(**available_quan_track)
    return response


def delete_stock(self):
    is_stock_item_exist_in_selling = True if ItemSoldDetails.objects.filter(stock=self.kwargs['pk'], item_sold__is_active=True) else False
    is_stock_item_exist_in_buying = True if PurchaseMasterStock.objects.filter(stock=self.kwargs['pk']) else False
    if is_stock_item_exist_in_selling:
        raise exceptions.ValidationError('Not able to delete the stock as there are some items issued')
    if is_stock_item_exist_in_buying:
        raise exceptions.ValidationError('Not able to delete the stock as there are some items purchased')
    if self.queryset:
        self.queryset.update(is_active=False, collected_by_user=self.request.user.id) #collected by user will be udpated to know who is deleted
    return {'Reason': 'Data Deleted Succesfully'}

def read_store_stock_detail(self):
    response = SharedService.read_data(self)
    response['item_issued_data'] = item_sold_details(self, self.kwargs['pk'])
    response['item_purchased_data'] = item_purchased_details(self, self.kwargs['pk'])
    return response


def add_purchase_master(self, data):
    if float(data['amount']) < 0 or float(data['total_amount']) < 0 or float(data['discount']) < 0 or float(
            data['tax']) < 0:
        raise exceptions.ValidationError('Amount values should be greater than 0.')
    # if float(data['total_amount']) < float(data['amount']):
    #     raise exceptions.ValidationError('Total amount should be greater than amount.')
    # total_amount = 0
    # if float(data['amount']):
    #     total_amount += float(data['amount'])
    # if float(data['tax']):
    #     total_amount += float(data['tax'])
    # if float(data['discount']):
    #     total_amount -= float(data['discount'])
    total_amount = float(data['amount']) + float(data['tax'])
    if float(data['discount']) > total_amount:
        raise exceptions.ValidationError('Discount should be lesser than total amount.')
    if (total_amount - float(data['discount'])) != float(data['total_amount']):
        raise exceptions.ValidationError('Amount(s) are mismatch.')
    tot_amount = 0
    stocks = Stock.objects.filter(is_active=True).values()
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, False)
        for stock in data['purchase_stock']:
            stock['transaction_type'] = TRANSACTION_TYPE['RECEIVED']
            stock['purchase_master'] = response['data']['id']
            stock_item = stocks.filter(id=stock['stock'])
            amount = float(stock['quantity']) * float(stock['unit_price'])
            if stock['tax']:
                amount += float(stock['tax'])
            if amount != float(stock['amount']):
                raise exceptions.ValidationError('Amount(s) are mismatch for items.')
            tot_amount += amount
            temp_quantity = stock_item.first()['available_stock']+float(stock['quantity'])
            stock_item.update(available_stock=temp_quantity)
        if data['amount'] != tot_amount:
            raise exceptions.ValidationError('Total amount is not equal to sum of item(s) amount.')
        serializer = PurchaseMasterStockSerializer(data=data['purchase_stock'], many=True, allow_empty=False,
                                                   context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
    SharedService.custom_thread(add_purchase_master_notification, self, response['data'])
    return response


def add_purchase_master_notification(self, data):
    body = f'Hi {self.request.user.staff.first_name},<br/><br/>Purchase of the item(s) with below details from Vendor '
    body += f'{data["vendor_name"]} is success.<br/>Invoice Date : {data["invoice_date"]}<br/>Invoice No. : {data["invoice_num"]}'
    if data["voucher_num"]:
        body += f'<br/>Voucher No. : {data["voucher_num"]}'
    send_notification('purchasemaster_create', body=body, touserIds=[self.request.user.pk],
                      pushData={'extra_params': {'heading': 'Item Purchased'}})


def get_purchase_master(self):
    response = SharedService.read_data(self, True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


def get_purchase_master_detail(self):
    response = SharedService.read_data(self)
    receivedData = dict()
    returnedData = dict()
    for data in response['data']['purchase_master']:
        if data['transaction_type'] == TRANSACTION_TYPE['RECEIVED']:
            receivedData.update({data['stock']: data})
        else:
            if data['stock'] in returnedData:
                returnedData[data['stock']] += data['quantity']
            else:
                returnedData.update({data['stock']: data['quantity']})
    for key, value in returnedData.items():
        receivedData[key]['returned_quantity'] = value
    response['data']['purchase_master'] = receivedData.values()
    return response


def add_purchase_master_return(self, data):
    purchase_stock = PurchaseMasterStock.objects.filter(is_active=True)
    with transaction.atomic(using=get_current_db_name()):
        for items in data['returned']:
            items['transaction_type'] = TRANSACTION_TYPE['RETURNED']
            item = purchase_stock.filter(id=items['id']).first()
            # item = stock_item.values().first()
            if item.stock.available_stock < float(items['quantity']):
                raise exceptions.ValidationError(
                    f'Return quantity exceeded the available quantity of item {item.stock.item.name}.')
            returned_items = purchase_stock.filter(stock=item.stock, purchase_master=item.purchase_master,
                                                   transaction_type=TRANSACTION_TYPE['RETURNED'])
            tot_return_items = 0
            for ret_item in returned_items:
                tot_return_items += ret_item.quantity
            if (float(items['quantity']) + tot_return_items) > item.quantity:
                raise exceptions.ValidationError(
                    f'Return quantity exceeded the received quantity of item {item.stock.item.name}.')
            items['stock'] = item.stock.pk
            items['purchase_master'] = item.purchase_master.pk
            del items['id']
            item.stock.available_stock -= float(items['quantity'])
            item.stock.save()
        serializer = PurchaseMasterStockSerializer(data=data['returned'], many=True, allow_empty=False,
                                                   context={'request': self.request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
    SharedService.custom_thread(add_purchase_master_return_notification, self, serializer.data[0])
    return {'Reason': 'Data added Successfully!', 'data': serializer.data}


def add_purchase_master_return_notification(self, data):
    body = f'Hi {self.request.user.staff.first_name},<br/><br/>Return of the item(s) from Vendor '
    body += f'{data["vendor_name"]} is success.'
    send_notification('purchasemasterreturn_create', body=body, touserIds=[self.request.user.pk],
                      pushData={'extra_params': {'heading': 'Item Returned.'}})


def update_student_store(self, update_stundent_store_issued, is_add=True):
    for row_data in update_stundent_store_issued:
        student_store = StudentStoreMapping.objects.get(id=row_data['student_store_mapping']
        )
        if is_add:
            student_store.issued_quantity += row_data['issued_quantity']
        else:
            student_store.issued_quantity -= row_data['issued_quantity']
        student_store.save()
    return {'Reason': 'Saved'}

def validate_mode_of_payment_data(mode_of_payment_list, total_payable_amount):
    temp_payable_total_amount = 0
    for mode_of_payment in mode_of_payment_list:
        if not mode_of_payment['mode_of_payment']:
            raise exceptions.ValidationError('mode_of_payment is mandatory')
        if not mode_of_payment['amount']:
            raise exceptions.ValidationError('Amount is mandatory in mode_of_payments')
        temp_payable_total_amount += mode_of_payment['amount']
    print(temp_payable_total_amount)
    print(total_payable_amount)
    if temp_payable_total_amount != total_payable_amount:
        raise exceptions.ValidationError('Mode Of Payment total amount is not equal to the total amount payable')

def add_mode_of_payment_data(mode_of_payment_list):
    serializer = ItemSoldModeOfPaymentSerializer(data=mode_of_payment_list, many=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()

def add_item_sold(self, data, fee_collection_obj=None):
    stocks = {stock['id'] : stock for stock in Stock.objects.filter(is_active=True).values(
        'opening_stock', 'available_stock', 'min_stock', 'item', 'item__name', 'id', 'current_selling_price'
    )}
    receipt_counter = None
    receipt_prefix = None
    receipt_postfix = None
    update_stundent_store_issued = []
    if fee_collection_obj:
        data['for_date'] = fee_collection_obj.transaction_date
        data['receipt_num'] = ''
        data['tax_amount'] = 0
        data['mode_of_payment'] = fee_collection_obj.mode_of_payment
        data['is_issued_from_finance'] = True
        data['user'] = [
            {'user': fee_collection_obj.student.user_student.id, 'transaction_id': str(datetime.datetime.now().timestamp())}
        ]
    if data['user']:
        user, user_len = 'user', len(data['user'])
    else:
        user, user_len = 'guest_list', 1
    item_sold_list = []
    if not fee_collection_obj: #counter wont get created on fee collection
        receipt_counter, receipt_prefix, receipt_postfix = CounterService.get_countered_value(self, 'INVENTORY', **{'academic_year': None})
        data['receipt_num'] = f'{receipt_prefix}{receipt_counter.value}{receipt_postfix}'
    is_unit_price_edit_permission = FormdefinitionService.get_formdefintion_data(self, 'inventory_configurations', 'is_unit_price_editable_on_issue')
    check_duplicate_user = {}
    check_duplicate_transaction = {}
    item_sold_data = {it['transaction_id']: '' for it in ItemSold.objects.all().values('transaction_id')}
    for row_data in data[user]:
        users = None
        if row_data.get('user') is not None and row_data.get('user') in check_duplicate_user:
            raise exceptions.ValidationError('Duplicate Users Found')
        if row_data['transaction_id'] in check_duplicate_transaction:
            raise exceptions.ValidationError(f'Duplicate transaction id found for {row_data["transaction_id"]}')
        if row_data.get('user'):
            check_duplicate_user[row_data['user']] = ''
            users = row_data['user']
        check_duplicate_transaction[row_data['transaction_id']] = ''
        temp = {
            'for_date': data['for_date'],
            'guest_name': row_data['guest_name'] if 'guest_name' in row_data else None,
            'user': users,
            'order_num': data['receipt_num'],
            'tax_amount': data['tax_amount'], #individual users tax amount
            'mode_of_payment': data['mode_of_payment'] if 'mode_of_payment' in data else None,
            'collected_by_user': self.request.user.id,
            'total_amount_inc_gst': 0,
            'transaction_id': row_data['transaction_id'],
            'item_sold_details': [],
            'is_issued_from_finance': True if 'is_issued_from_finance' in data else False
        }
        if row_data['transaction_id'] in item_sold_data:
            raise exceptions.ValidationError(f'Duplicate Transaction id found for {row_data["transaction_id"]}')
        if fee_collection_obj:
            temp['fee_collection'] = fee_collection_obj.id
        for stock in data['stock_details']:
            if stock['stock'] not in stocks:
                raise exceptions.ValidationError('Invalid Data')
            available_stock = stocks[stock['stock']]['available_stock']
            if (available_stock-stock['quantity']) < 0:
                raise exceptions.ValidationError(f'{Stock.objects.get(id=stock["stock"]).item.name} - trying to purchase more than available quantity {available_stock}')
            if fee_collection_obj:
                unit_price = stock['selling_price_per_unit']
                update_stundent_store_issued.append({
                    'student_store_mapping': stock['student_store_mapping'],
                    'student': fee_collection_obj.student,
                    'issued_quantity': stock['quantity']
                })
            else:
                unit_price = stocks[stock['stock']]['current_selling_price']
                if not is_unit_price_edit_permission and 'unit_price' in stock and stock['unit_price'] != unit_price:
                    raise exceptions.ValidationError('You dont have access to edit the unit price')
                if 'unit_price' in stock and is_unit_price_edit_permission:
                    unit_price = stock['unit_price']
            temp['total_amount_inc_gst'] += unit_price * stock['quantity']
            fee_standard_mapping_item_selling_price_id = stock['fee_standard_mapping_item_selling_price_id'] if 'fee_standard_mapping_item_selling_price_id' in stock and stock['fee_standard_mapping_item_selling_price_id'] else None
            temp['item_sold_details'].append({
                'stock': stock['stock'],
                'unit_price': unit_price,
                'quantity': stock['quantity'],
                'fee_standard_mapping_item_selling_price_id': fee_standard_mapping_item_selling_price_id,
                'student_store_mapping_id':stock['student_store_mapping'] if 'student_store_mapping' in stock else None
            })
        if 'mode_of_payment_list' not in data:
            data['mode_of_payment_list'] = [{
                "amount": temp['total_amount_inc_gst'],
                "mode_of_payment": data['mode_of_payment'],
                "note": data['payment_note'] if 'payment_note' in data else '',
                "payment_ref_num": "payment_reference_num",
            }]
        validate_mode_of_payment_data(data['mode_of_payment_list'], temp['total_amount_inc_gst'])
        item_sold_list.append(temp)
    with transaction.atomic(using=get_current_db_name()):
        update_stock_list ={}
        item_sold_serializer = ItemSoldSerializer
        for item_sold in item_sold_list:
            item_sold_serializer = ItemSoldSerializer(data=item_sold)
            item_sold_serializer.is_valid(raise_exception=True)
            item_sold_id = item_sold_serializer.save()
            for mode_of_payment in data['mode_of_payment_list']:
                mode_of_payment['item_sold'] = item_sold_id.id
            add_mode_of_payment_data(data['mode_of_payment_list'])
            for item_sold_detail in item_sold['item_sold_details']:
                if item_sold_detail['stock'] in update_stock_list:
                    available_stock = update_stock_list[item_sold_detail['stock']]['available_stock'] - float(item_sold_detail['quantity'])
                else:
                    available_stock = stocks[item_sold_detail['stock']]['available_stock'] - float(item_sold_detail['quantity'])
                update_stock_list[item_sold_detail['stock']] = {
                    'id': item_sold_detail['stock'],
                    'available_stock': available_stock,
                }
                item_sold_detail['item_sold_id'] = item_sold_id.id
                item_sold_detail['stock_id'] = item_sold_detail['stock']
                item_sold_detail['available_stock_after_order'] = available_stock
                item_sold_detail['fee_standard_mapping_item_selling_price'] = item_sold_detail['fee_standard_mapping_item_selling_price_id'] if 'fee_standard_mapping_item_selling_price_id' in item_sold_detail else None
                item_sold_detail['student_store_mapping'] = item_sold_detail['student_store_mapping_id']
                item_sold_detail_serializer = ItemSoldDetailsSerializer(data=item_sold_detail)
                item_sold_detail_serializer.is_valid(raise_exception=True)
                item_sold_detail_serializer.save()
            SharedService.custom_thread(add_item_sold_notification, self, item_sold)
            SharedService.custom_thread(minimum_stock_notification, self, item_sold)
        if update_stundent_store_issued:
            update_student_store(self, update_stundent_store_issued)
        if update_stock_list:
            update_available_stock(self, update_stock_list.values())
        if not fee_collection_obj: #counter wont get created on fee collection
            CounterService.increment_counter(self, receipt_counter)
        return {'data': 'Data Added Successfully'}

def minimum_stock_notification(self, data):
    stocks = '<table border=1><tr><th>Item Name</th><th>Quantity</th></tr>'
    count = 0
    for item in data:
        if item['stock_details']['available_stock'] <= item['stock_details']['min_stock']:
            count += 1
            stocks += f'<tr><td>{item["stock_details"]["item_name"]}</td><td>{int(item["stock_details"]["available_stock"])}</td></tr>'
    stocks += '</table>'
    if count:
        body = f'Hi {self.request.user.staff.first_name},<br/><br/>The Following item(s) have reached the minimum quantity limit<br/><br/>'
        send_notification('itemsold_min_alert_create', body=body + stocks, touserIds=[self.request.user.pk],
                          pushData={'extra_params': {'heading': 'Stock Alert'}})

def add_item_sold_notification(self, data):
    user = User.objects.get(id=data['user'])
    user_full_name = ''
    mobile_num = None
    email = None
    if user.student:
        user_full_name = get_full_name(user.student.first_name, user.student.middle_name, user.student.last_name)
        mobile_num = user.student.mobile_num
    elif user.staff:
        user_full_name = get_full_name(user.staff.first_name, user.staff.middle_name, user.staff.last_name)
        mobile_num = user.staff.mobile_num
    else:
        return
    notification_obj = NotificationBodyTemplate('itemsold_create')
    table_data = '<table border=1><tr><th>Item Name</th><th>Quantity</th><th>Price</th></tr>'
    stock_ids = [row_d['stock'] for row_d in data['item_sold_details']]
    stock_data = {item['id']: item['item__name'] for item in Stock.objects.filter(id__in=stock_ids).values('id', 'item__name')}
    for item in data['item_sold_details']:
        table_data += f'<tr><td>{stock_data[item["stock"]]}</td><td>{int(item["quantity"])}</td><td>{item["unit_price"]}</td></tr>'
    table_data += '</table>'
    temp = {
        'user_full_name': user_full_name,
        'total_amount': data['total_amount_inc_gst'],#nikhil
        'table_data': table_data,
        'for_date': data['for_date']
    }
    body_sms = notification_obj.select_template('sms', temp)
    body_email = notification_obj.select_template('email', temp)
    body_push = notification_obj.select_template('push', temp)
    customized_data = []
    if mobile_num:
        customized_data.append(
            {
                'mobile_number': mobile_num, 'sms_body': body_sms,'sms_notification': 1, 'user_id': user.id
            }
        )
    customized_data.append({
            'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user.id, 'extra_params': {'heading': 'Store item issued'}
    })
    if email:
        customized_data.append(
            {   'email': email, 'email_subject': None, 'user_id': user.id, 'email_body': body_email,
            }
        )
    if customized_data:
        send_notification('itemsold_create', customizedData=customized_data)


def update_item_sold(self, data):
    pass
    # stocks = Stock.objects.filter(is_active=True)
    # with transaction.atomic(using=get_current_db_name()):
    #     for stock in data['stock_details']:
    #         stock_item = stocks.filter(item=stock['item'], sub_category=stock['sub_category'])
    #         if stock['property_value']:
    #             stock_item = stock_item.filter(property_value__in=stock['property_value'])
    #         if 0 > len(stock_item) > 1:
    #             raise exceptions.ValidationError('something went wrong with stock(s).')
    #         available_stock = stock_item.first()
    #         if float(stock['quantity']) > available_stock.available_stock:
    #             raise exceptions.ValidationError(
    #                 f'Requested quantity exceeded the available quantity of the item {available_stock.item.name}.')
    #         stock.update({'for_date': data['for_date'], 'student': data['student'], 'staff': data['staff'],
    #                       'guest_name': data['guest_name']})
    #         available_stock.available_stock -= float(stock['quantity'])
    #         available_stock.save()
    #     response = SharedService.add_data(self, data['stock_details'])
    #     return response


def get_item_sold(self):
    queryset = self.filter_queryset(self.get_queryset()).order_by('-modified')
    if self.request.query_params.get('from_date') and self.request.query_params.get('to_date'):
        queryset = queryset.filter(
            for_date__range=(self.request.query_params.get('from_date'), self.request.query_params.get('to_date')))
    # if self.request.query_params.get('category'): wont work has we have changed the structure
    #     queryset = queryset.filter(stock__category=self.request.query_params.get('category'))
    # if self.request.query_params.get('sub_category'):
    #     queryset = queryset.filter(stock__sub_category=self.request.query_params.get('sub_category'))
    # if self.request.query_params.get('item'):
    #     queryset = queryset.filter(stock__item=self.request.query_params.get('item'))
    # if self.request.query_params.get('property_value'):
    #     queryset = queryset.filter(stock__property_value=self.request.query_params.get('property_value'))
    user = self.request.query_params.get('user')
    if user:
        if user == 'student':
            queryset = queryset.filter(user__student__isnull=False)
        if user == 'staff':
            queryset = queryset.filter(user__staff__isnull=False)
    paginated_queryset, count, next_page, previous_page = SharedService.custom_pagination(self, queryset,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    serializer = self.get_serializer(paginated_queryset, many=True)
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': serializer.data}}


def delete_item_sold(self, item_sold_id):
    item_sold_detail = ItemSoldDetails.objects.filter(item_sold=item_sold_id, item_sold__is_active=True)
    stock_ids = [row['stock_id'] for row in item_sold_detail.values()]
    stock_data = {stock['id']: stock for stock in Stock.objects.filter(id__in=stock_ids).values()}
    available_stock_update = {}
    update_stundent_store_issued = []
    for item_row in item_sold_detail.values(
        'stock_id', 'quantity', 'student_store_mapping', 'item_sold__fee_collection__student'
    ):
        if item_row['stock_id'] in available_stock_update:
            available_stock_update[item_row['stock_id']]['available_stock'] += item_row['quantity']
        else:
            available_stock_update[item_row['stock_id']] = {'id': item_row['stock_id'],
             'available_stock': stock_data[item_row['stock_id']]['available_stock'] + item_row['quantity']}
        if item_row['student_store_mapping']:
            update_stundent_store_issued.append({
                'student_store_mapping': item_row['student_store_mapping'],
                'student': item_row['item_sold__fee_collection__student'],
                'issued_quantity': item_row['quantity']
            })
    with transaction.atomic(using=get_current_db_name()):
        if not ItemSold.objects.get(id=item_sold_id).is_active:
            raise exceptions.ValidationError('Already deactivated')
        ItemSold.objects.filter(id=item_sold_id).update(is_active=False)
        if update_stundent_store_issued:
            update_student_store(self, update_stundent_store_issued, False)
        if available_stock_update:
            update_available_stock(self, available_stock_update.values())
    return {'Reason': 'Data Deleted Succesfully'}
    
    