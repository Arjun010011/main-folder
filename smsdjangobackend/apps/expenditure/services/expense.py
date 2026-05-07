from datetime import datetime
from django.contrib.contenttypes.models import ContentType
from rest_framework import exceptions
from django.db import transaction
from num2words import num2words
from django.db.models import Q

from apps.shared.services import CounterService, PDFService, SharedService, UploadTypeService, FormdefinitionService

from apps.expenditure.models.expense import ExpensePlan
from apps.expenditure.models.token import Token, TokenMapping
from apps.institutes.serializers import InstituteSerializer
from apps.shared.services_shared.common import get_selected_template
from apps.transport.models import Vehicle
from apps.institutes.models.institute import Institute
from apps.tenants.services.middlewares import get_current_db_name
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.finance.serializers import DepositWithdrawRecordSerializer
from apps.expenditure.models import Expense

from apps.finance.models.bankTransaction import BankDetail, BankTransaction
from apps.finance.models.deposit import DepositWithdrawRecord as DWR
from apps.finance.models.cash_in_hand_opening_balance import StaffWallet
        

def add_expense_type(self, data):
    SharedService.duplicate_list_one_object(data['expense_type'], 'name')
    response = SharedService.add_data(self, data['expense_type'])
    return response


def add_expense_plan(self, data):
    SharedService.duplicate_list_one_object(data['expense_plan'], 'expense_type')
    for type in data['expense_plan']:
        if type['max_amount'] is None or float(type['max_amount']) > 0:
            type.update({'financial_year': data['financial_year']})
        else:
            raise exceptions.ValidationError('Enter a valid max amount.')
    response = SharedService.add_data(self, data['expense_plan'])
    return response


def update_expense_plan(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(expense_plan__isnull=True):
        if data['max_amount'] is None or float(data['max_amount']) > 0:
            response = SharedService.update_data(self, data, **kwargs)
            return response
        else:
            raise exceptions.ValidationError('Enter a valid max amount.')
    raise exceptions.ValidationError('Cannot update some instances of data are referenced.')


def validate_expense(self, data):
    if float(data['total_amount']) < float(data['amount']):
        raise exceptions.ValidationError('Amount should be lesser than or equal to total amount.')
    if float(data['total_amount']) < 1 or float(data['amount']) < 1:
        raise exceptions.ValidationError('Amount should be greater than Rs.0.')
    if float(data['total_amount']) != float(data['amount']) + float(data['tax_amount']):
        raise exceptions.ValidationError('There is mismatch in the amount.')
    if 'payee_name' not in data and not data['payee_name']:
        raise exceptions.ValidationError('payee_name is mandatory')
    max_amount = ExpensePlan.objects.get(id=data['expense_plan']).max_amount
    if max_amount:
        if float(data['total_amount']) > max_amount:
            raise exceptions.ValidationError(f'Maximum expense limit is Rs.{max_amount}')
    if data['token']:
        data.update({'token_for': Token.objects.get(id=data['token']).token_for.pk})
    elif data['vehicle']:
        vehicle = Vehicle.objects.get(id=data['vehicle'])
        content_type = ContentType.objects.get_for_model(vehicle)
        content_type_data = {'content_type': content_type, 'object_id': data['vehicle']}
        token, created = TokenMapping.objects.get_or_create(**content_type_data)
        data.update({'token_for': token.pk})

def get_expense_receipt_num(self):
    receipt_counter_t, receipt_prefix_t, receipt_postfix_t = CounterService.get_countered_value(self, 'EXPENSE', None, None, 'expense')
    return f'{receipt_prefix_t}{receipt_counter_t.value}{receipt_postfix_t}'


def add_expense(self, data):
    validate_expense(self, data)
    # Get financial_year from the ExpensePlan
    expense_plan = ExpensePlan.objects.get(id=data['expense_plan'])
    financial_year_id = expense_plan.financial_year_id

    deposit = None
    if data.get('bank_detail_id'):
        # Validate bank has sufficient balance before deducting
        bank_id = data['bank_detail_id']
        try:
            bank = BankDetail.objects.get(id=bank_id)
            bank_balance = float(bank.opening_balance)
        except BankDetail.DoesNotExist:
            raise exceptions.ValidationError('Selected bank does not exist.')
        # Add BankTransaction deposits/withdrawals
        for txn in BankTransaction.objects.filter(bank_id=bank_id, is_active=True):
            if txn.is_deposit:
                bank_balance += float(txn.amount)
            else:
                bank_balance -= float(txn.amount)
        # Add/subtract DepositWithdrawRecord transfers
        for dep in DWR.objects.filter(Q(bank_from=bank_id) | Q(bank_to=bank_id), is_active=True).values():
            if dep['bank_to_id'] == bank_id:
                bank_balance += dep['amount']
            if dep['bank_from_id'] == bank_id:
                bank_balance -= dep['amount']
        if bank_balance < float(data['total_amount']):
            raise exceptions.ValidationError(
                f'Insufficient bank balance. Available: {bank_balance}, Required: {data["total_amount"]}'
            )
        deposit = {
            "date": data['date'],
            "transaction_type": 2,
            "transaction_from": 3,
            "amount": data['total_amount'],
            "created_by": self.request.user.id,
            "financial_year": financial_year_id,
            "bank_from": data['bank_detail_id'],
        }
    elif data.get('withdraw_from_cash_in_hand'):
        # Validate cash-in-hand has sufficient balance before deducting

        user_id = self.request.user.id
        cash_balance = 0.0
        try:
            wallet = StaffWallet.objects.get(staff__users__id=user_id)
            cash_balance = float(wallet.opening_balance or 0)
        except StaffWallet.DoesNotExist:
            pass
        # Add/subtract DepositWithdrawRecord transfers involving this user
        for dep in DWR.objects.filter(Q(user_from=user_id) | Q(user_to=user_id), is_active=True).values():
            if dep.get('user_to_id') == user_id:
                cash_balance += float(dep['amount'])
            if dep.get('user_from_id') == user_id:
                cash_balance -= float(dep['amount'])
        if cash_balance < float(data['total_amount']):
            raise exceptions.ValidationError(
                f'Insufficient cash in hand balance. Available: {cash_balance}, Required: {data["total_amount"]}'
            )
        deposit = {
            "date": data['date'],
            "transaction_type": 2,
            "transaction_from": 3,
            "amount": data['total_amount'],
            "created_by": self.request.user.id,
            "financial_year": financial_year_id,
            "user_from": self.request.user.id,
        }
    with transaction.atomic(using=get_current_db_name()):
        data['receipt_num'] = get_expense_receipt_num(self)
        response = SharedService.add_data(self, data, False)
        if deposit:
            expense = Expense.objects.get(id=response['data']['id'])
            content_type = ContentType.objects.get_for_model(expense)
            deposit['content_type'] = content_type.id
            deposit['object_id'] = expense.pk
            depositserializer = DepositWithdrawRecordSerializer(data=deposit)
            depositserializer.is_valid(raise_exception=True)
            depositserializer.save()
        UploadTypeService.make_document_active(data['attachment'])
        return response


def check_expense_time_window(expense):
    """Check if the expense is within the allowed edit/delete time window."""
    try:
        number_of_days = FormdefinitionService.get_formdefintion_data(
            None, 'expense_configuration', 'valid_days_to_edit_delete_expense'
        )
    except Exception:
        number_of_days = 7  # default fallback
    if number_of_days == 0:
        return  # 0 means no restriction
    today = datetime.now().date()
    days_since_created = SharedService.days_between(
        expense.created.strftime('%Y-%m-%d'), today.strftime('%Y-%m-%d')
    )
    if days_since_created > number_of_days:
        raise exceptions.ValidationError(
            f'Cannot edit/delete the expense after {number_of_days} days of creation.'
        )


def update_expense(self, data, **kwargs):
    validate_expense(self, data)
    expense = self.get_object()
    check_expense_time_window(expense)
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, **kwargs)
        UploadTypeService.make_document_active(data['attachment'])
        # Update the linked DWR amount to match the new total_amount
        content_type = ContentType.objects.get_for_model(expense)
        dwr = DWR.objects.filter(
            content_type=content_type,
            object_id=expense.pk,
            is_active=True
        ).first()
        if dwr:
            dwr.amount = float(data['total_amount'])
            dwr.date = data.get('date', dwr.date)
            dwr.save()
        return response


def delete_expense(self):
    """Delete an expense and deactivate its linked DWR to restore bank/cash balance."""
    expense = Expense.objects.get(id=self.kwargs['pk'])
    check_expense_time_window(expense)
    with transaction.atomic(using=get_current_db_name()):
        content_type = ContentType.objects.get_for_model(expense)
        # Deactivate the linked DepositWithdrawRecord so bank/cash balance is restored
        DWR.objects.filter(
            content_type=content_type,
            object_id=expense.pk,
            is_active=True
        ).update(is_active=False)
        # Soft-delete the expense
        Expense.objects.filter(id=expense.pk).update(is_active=False)
    return {'Reason': 'Data Deleted Successfully!'}


def get_expense_report(self, return_all_data=False, start_date=None, end_date=None, expense_for=None):
    start_date = self.request.GET.get('start_date', start_date)
    end_date = self.request.GET.get('end_date', end_date)
    expense_plan = self.request.GET.get('expense_plan')
    download_excel = self.request.GET.get('download_excel')
    filter_query = {'is_active':True}
    if expense_plan:
        filter_query['expense_plan'] = expense_plan
    if start_date and end_date:
        filter_query['date__range'] = (start_date, end_date)
    if self.request.GET.get('expense_for', expense_for):
        filter_query['expense_plan__expense_type__expense_for'] = self.request.GET.get('expense_for', expense_for)
    if self.request.GET.get('codename'):
        filter_query['expense_plan__expense_type__codename'] = self.request.GET.get('codename')
    if filter_query:
        queryset = self.filter_queryset(self.get_queryset()).filter(**filter_query)
    else:
        queryset = self.filter_queryset(self.get_queryset())
    serializer = self.get_serializer(queryset, many=True)
    if return_all_data:
        return serializer.data
    if not download_excel:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get('limit', 10) or 10,
                                                                            self.request.GET.get('pageno', 1) or 1)
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    else:
        data=serializer.data
        return download_expense_report(self,data)

def download_expense_report(self,response):
    expense_list=[]
    for expense_details in response:
        expenses={}
        expenses['expense_type_name']=expense_details['expense_type_name']
        expenses['amount']=expense_details['amount']
        expenses['date']=expense_details['date']
        expenses['receipt_num']=expense_details['receipt_num']
        expenses['total_amount']=expense_details['total_amount']
        expenses['payee_name']=expense_details['payee_name']
        expenses['tax_amount']=expense_details['tax_amount']
        expenses['gst_number']=expense_details['gst_number']
        expenses['mode_of_payment']=expense_details['mode_of_payment']
        expenses['ref_number']=expense_details['ref_number']
        expenses['comment']=expense_details['comment']
        expense_list.append(expenses)
    options={}
    options['Data'] = expense_list
    options['extraWorksheetData'] = dict()
    options['columns'] = json_expense_report()
    options['title']='Expenses'
    return write_to_excel_new(self,options,{},{})

def json_expense_report():
    column_data=[
        {
            'column': 'Expense Name', 'required': False, 'schemacolumn': 'expense_type_name'
        }]
    column_data.append({
                'column':'Date', 'required': False, 'schemacolumn': 'date'
        })
    column_data.append({
                'column':'Receipt Number', 'required': False, 'schemacolumn': 'receipt_num'
        })
    column_data.append({
                'column':'Payee Name', 'required': False, 'schemacolumn': 'payee_name'
        })
    column_data.append({
                'column':'Reference Number', 'required': False, 'schemacolumn': 'ref_number'
        })
    column_data.append({
                'column':'GST', 'required': False, 'schemacolumn': 'gst_number'
        })
    column_data.append({
                'column':'Amount', 'required': False, 'schemacolumn': 'amount'
        })
    column_data.append({
                'column':'Tax Amount', 'required': False, 'schemacolumn': 'tax_amount'
        })
    column_data.append({
                'column':'Total Amount', 'required': False, 'schemacolumn': 'total_amount'
        })
    column_data.append({
                'column':'Mode of payment', 'required': False, 'schemacolumn': 'mode_of_payment'
        })
    column_data.append({
                'column':'Comment', 'required': False, 'schemacolumn': 'comment'
        })
    return column_data

def download_expense_receipt(self, expense_data):
    default = 'default_expense_receipt.html'
    selected_template, number_of_copies = get_selected_template(self, 'expense', 'pdf', default)
    data = {'number_of_copies': range(number_of_copies)}
    expense_data['date'] = datetime.strptime(expense_data['date'], '%Y-%m-%d').strftime('%d-%m-%Y')
    data['expense_data'] = expense_data
    data['today'] = datetime.today().strftime('%d/%m/%Y %H:%M:%S')
    data['expense_data']['amount_in_words'] = num2words(expense_data['total_amount'], lang='en') + ' Only' 
    data['institute_data'] = Institute.get_institute(self)
    path = 'expense_receipts/'+selected_template
    response = PDFService.receipt_new(self, data, 'Expense Receipt', path)
    return response