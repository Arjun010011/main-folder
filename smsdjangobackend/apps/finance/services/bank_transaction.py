from datetime import date, timedelta

from django.db import transaction
from rest_framework import exceptions

from apps.finance.models import FeeType
from apps.finance.models.bankTransaction import BankTransaction, BankFeeTypeMapping, BankDetail
from apps.finance.serializers import GetBankTransactionSerializer, BankFeeTypeMappingSerializer
from apps.shared.services import SharedService, UploadTypeService
from apps.tenants.services.middlewares import get_current_db_name


def add_bank_details(self, data):
    SharedService.duplicate_list_one_object(data, 'account_num')
    for bank in data:
        if float(bank['opening_balance']) < 0:
            raise exceptions.ValidationError('Opening balance should not be negative value')
    response = SharedService.add_data(self, data)
    return response


def update_bank_details(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(bank_fee_type_mapping_bank__isnull=False) or queryset.filter(bank_transaction_bank__isnull=False):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_bank_details(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(bank_fee_type_mapping_bank__isnull=False) or self.queryset.filter(bank_transaction_bank__isnull=False):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response


def add_bank_fee_type(self, data):
    SharedService.duplicate_list_one_object(data, 'bank')
    SharedService.duplicate_list_two_objects(data, 'bank', 'fee_type')
    queryset = self.get_queryset()
    response = SharedService.add_data(self, data)
    return response


def update_bank_fee_type(self, data, **kwargs):
    instance = self.get_object()
    if BankTransaction.objects.filter(is_active=True, bank=data['bank']).exists():
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    queryset = self.get_queryset()
    if queryset.filter(bank=data['bank']):
        raise exceptions.ValidationError('Bank is already mapped to fee type.')
    if queryset.exclude(id=instance.pk).filter(to_date__gte=date.today(), fee_type=data['fee_type']):
        raise exceptions.ValidationError('Fee type is already mapped to other Bank.')
    instance.to_date = date.today() - timedelta(days=1)
    with transaction.atomic(using=get_current_db_name()):
        instance.save()
        response = SharedService.add_data(self, data, False)
        return response


def delete_bank_fee_type(self):
    instance = self.get_object()
    if BankTransaction.objects.filter(is_active=True, bank=instance.bank).exists():
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    instance.to_date = date.today() - timedelta(days=1)
    instance.save()
    return {'Reason': 'Data deleted Successfully!'}


def get_bank_fee_type(self):
    queryset = self.filter_queryset(self.get_queryset()).filter(fee_type=self.kwargs['pk'],
                                                                to_date__gte=date.today()).first()
    serializer = self.get_serializer(queryset)
    if queryset:
        bankTransaction = BankTransaction.objects.filter(bank=queryset.bank).order_by('created').last()
        if bankTransaction:
            balance = bankTransaction.balance
        else:
            balance = queryset.bank.opening_balance
    else:
        balance = None
    serializer.data['bank_details']['balance'] = balance
    return {'data': serializer.data}


def add_bank_transaction(self, data):
    if not BankFeeTypeMapping.objects.filter(bank=data['bank']):
        raise exceptions.ValidationError('Fee type is not mapped with the bank.')
    if float(data['amount']) <= 0:
        raise exceptions.ValidationError('Please enter the amount greater than 0.')
    queryset = self.get_queryset().filter(is_active=True, bank=data['bank']).order_by('created').last()
    if queryset:
        balance = queryset.balance
    else:
        balance = BankDetail.objects.get(id=data['bank']).opening_balance
    if data['is_deposit']:
        data['balance'] = balance + float(data['amount'])
    else:
        if balance < float(data['amount']):
            raise exceptions.ValidationError('Insufficient balance to withdraw the amount.')
        data['balance'] = balance - float(data['amount'])
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, False)
        UploadTypeService.make_document_active(data['attachment'])
    return response


def get_bank_transaction(self):
    self.serializer_class = GetBankTransactionSerializer
    feeType = dict(FeeType.objects.all().values_list('id', 'name'))
    bankFeeType = dict(BankFeeTypeMapping.objects.all().values_list('bank', 'fee_type'))
    queryset = self.filter_queryset(self.get_queryset())
    bankFeeList = list()
    for bank, fee in bankFeeType.items():
        value = queryset.filter(bank=bank).order_by('created').last()
        if value:
            bankFeeList.append(value)
    serializer = self.get_serializer(bankFeeList, many=True)
    for bank in serializer.data:
        if bankFeeType[bank['bank']] in feeType:
            bank.update({'fee_type_name': feeType[bankFeeType[bank['bank']]]})
    return {'data': serializer.data}


def get_bank_transaction_detail(self):
    queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True, bank=self.kwargs['bank'])
    if self.request.GET.get('from_date') and self.request.GET.get('to_date'):
        queryset = queryset.filter(date__range=(self.request.GET.get('from_date'), self.request.GET.get('to_date')))
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
