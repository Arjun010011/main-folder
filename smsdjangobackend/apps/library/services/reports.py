import datetime, os
from apps.institutes.models.institute import Institute
from apps.library.models.issue_return import FinePaymentData, IssueReturnBook
from apps.library.models.master import BookCopy
from apps.library.serializers import FineBookReadSerializer, FinePaymentReadSerializer, Renew
from apps.shared.services import PDFService, SharedService
from apps.shared.services_shared.common import get_selected_template
from apps.shared.services_shared.store_api_result import start_long_running_process
from num2words import num2words
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.shared.services import UploadTypeService
from django.db.models import Q

def library_fine_pending_list(self, args):
    from apps.library.services.issue_return_fine_book import find_fine_for_book
    from apps.library.services.master_services import get_accessible_lib_category_ids
    filters = args['filters']
    download_data = args.get('download_data', None)
    sorting = args.get('sorting', ['due_date'])
    pageno = args.get('pageno')
    limit = args.get('limit')
    due_date = filters.get('due_date', datetime.datetime.today()) if 'due_date' in filters else datetime.datetime.today()
    print(due_date)
    category = filters.get('category', None)
    sub_category = filters.get('sub_category', None)
    user_type = filters.get('user_type', None)
    category_ids = get_accessible_lib_category_ids(self, [category])
    if isinstance(due_date, str):
        due_date = datetime.datetime.strptime(due_date, "%Y-%m-%d %H:%M:%S")
    filter_query = {
        'is_active': True,
        'is_issued': True,
        'is_returned': False,
        'due_date__lte': due_date
    }
    if category_ids:
        filter_query['book_copy__book__category__in'] = category_ids
    if sub_category:
        filter_query['book_copy__book__sub_category'] = sub_category
    if user_type == 'staff':
        filter_query['issued_to_user__staff__isnull'] = False
    elif user_type == 'student':
        filter_query['issued_to_user__student__isnull'] = False
    renew_query = {
        'is_active': True,
        'last_due_date__lte': due_date,
        'issue_return_book__is_returned': False
    }
    if category_ids:
        renew_query.update({'issue_return_book__book_copy__book__category__in': category_ids})
    if sub_category:
        renew_query['issue_return_book__book_copy__book__sub_category'] = sub_category
    find_renewal_data = Renew.objects.filter(**renew_query).values(
        'last_due_date', 'issue_return_book_id', 'updated_due_date'
    )
    issue_return_ids = []
    renew_data_mapping = {}
    for renew in find_renewal_data:
        issue_return_ids.append(renew['issue_return_book_id'])
        renew_data_mapping[renew['issue_return_book_id']] = renew
    query = Q()
    query |= Q(**filter_query)
    query |= Q(id__in=issue_return_ids)
    find_fine_data = IssueReturnBook.objects.filter(query).order_by(*sorting)
    filterd_fine_data = []
    book_copy_ids = [issue_return.book_copy_id for issue_return in find_fine_data]
    fine_amount_mapping = find_fine_for_book(due_date, [], book_copy_ids)
    print(fine_amount_mapping)
    issue_return_id_fine_mapping = {}
    for fine in find_fine_data:
        fine_amount = fine_amount_mapping.get(str(fine.book_copy_id), {}).get("fine_amount", 0)
        if fine_amount > 0:
            issue_return_id_fine_mapping[fine.id] = fine_amount
            filterd_fine_data.append(fine)
    if not download_data:
        filterd_fine_data, count, next_page, previous_page = SharedService.custom_pagination(
            self, filterd_fine_data, limit, pageno
        )
    fine_data = FineBookReadSerializer(filterd_fine_data, many=True).data
    for fine in fine_data:
        fine_amount = issue_return_id_fine_mapping.get(fine['id'], 0)  
        fine['fine_amount'] = fine_amount
        user_info = fine.get('issued_to_user', {})
        student_data = user_info.get('student')
        staff_data = user_info.get('staff')
        if student_data:
            fine['user_name'] = student_data.get('name', 'N/A')
            fine['user_type'] = 'Student'
            fine['mobile_num'] = student_data.get('mobile_num')
            fine['standard'] = student_data.get('current_standard_name')
        elif staff_data:
            fine['user_name'] = staff_data.get('name', 'N/A')
            fine['user_type'] = 'Staff'
            fine['mobile_num'] = staff_data.get('mobile_num')
        else:
            fine['user_name'] = 'N/A'
            fine['user_type'] = 'Unknown'
        issued_at_str = fine.get('issued_at', 'N/A')
        due_date_str = fine.get('due_date', 'N/A')
        fine['issued_at'] = datetime.datetime.fromisoformat(issued_at_str).date() if issued_at_str != 'N/A' else 'N/A'
        fine['due_date'] = datetime.datetime.fromisoformat(due_date_str).date() if due_date_str != 'N/A' else 'N/A'
    if download_data:
        start_long_running_process(self)
        SharedService.custom_thread(download_fine_pending_list, self, fine_data)
        return {'Reason': 'Data Added Successfully'}
    return {
        'data': fine_data,
        'count': count,
        'next_page': next_page,
        'previous_page': previous_page,
    }

def download_fine_pending_list(self, fine_data):
    try:
        options = {
            'title': 'Library Fine Report',
            'description': 'Report of all pending fines',
            'Data': fine_data,
            'columns': [
                {'column': 'User Name', 'required': False, 'schemacolumn': 'user_name'},
                {'column': 'User Type', 'required': False, 'schemacolumn': 'user_type'},
                {'column': 'Standard', 'required': False, 'schemacolumn':'standard'},
                {'column': 'Book Number', 'required': False, 'schemacolumn': 'book_copy'},
                {'column': 'Issued At', 'required': False, 'schemacolumn': 'issued_at'},
                {'column': 'Due Date', 'required': False, 'schemacolumn': 'due_date'},
                {'column': 'Fine Amount', 'required': False, 'schemacolumn': 'fine_amount'},
                {'column': 'Mobile Number', 'required': False, 'schemacolumn': 'mobile_num'},
            ]
        }
        file_name = 'fine_pending_list.xlsx'
        transaction_id = self.request.GET.get('transaction_id')

        response = write_to_excel_new(self, options)
        if response.status_code == 200:
            with open(file_name, 'wb') as file:
                file.write(response.content)
            url = UploadTypeService.upload_local_file(file_name, path='temp/FinePendingReports')
            if os.path.exists(file_name):
                os.remove(file_name)
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            store_long_running_process(self, transaction_id, {'error': str(e)})
        else:
            raise



def return_library_fine_paid_list(self, args):
    from apps.library.services.master_services import get_accessible_lib_category_ids
    download_data = args.get('download_data')
    from_date = args['filters'].get('start_date')
    to_date = args['filters'].get('end_date')
    category = args['filters'].get('category')
    sub_category = args['filters'].get('sub_category')
    pageno = args.get('pageno')  
    limit = args.get('limit') 
    sorting = args.get('sorting', ['-created'])
    filters = {}
    if from_date and to_date:
        filters['transaction_date__range'] = (from_date, to_date)
    if args['filters'].get('mode_of_payment'):
        filters['mode_of_payment'] = args['filters']['mode_of_payment']
    category_ids = get_accessible_lib_category_ids(self, [category])
    if category_ids:
        book_copy_filter = {'is_active': True, 'book__is_active': True, 'book__category__in': category_ids}
        if sub_category:
            book_copy_filter['book__sub_category'] = sub_category
        book_copy_ids = BookCopy.objects.filter(**book_copy_filter).values_list('id', flat=True)
        filters['fine_fine_payment_data__issue_return_book__book_copy__in'] = book_copy_ids

    data = FinePaymentData.objects.filter(**filters).order_by(*sorting)
    if not download_data:
        data, count, next_page, previous_page = SharedService.custom_pagination(
            data, list(data), limit, pageno
        )
    serialized_data = FinePaymentReadSerializer(data, many=True).data
    for record in serialized_data:
        fine_payment_data = record.get('fine_fine_payment_data', [])
        if fine_payment_data:
            fine_payment_record = fine_payment_data[0]
            issued_to_user = fine_payment_record.get('issue_return_book', {}).get('issued_to_user', {})
            due_date_str = fine_payment_record.get('issue_return_book', {}).get('due_date', 'N/A')
            issued_date_str = fine_payment_record.get('issue_return_book', {}).get('issued_at', 'N/A')
            record['due_date'] = datetime.datetime.fromisoformat(due_date_str).date() if due_date_str != 'N/A' else 'N/A'
            record['issued_at'] = datetime.datetime.fromisoformat(issued_date_str).date() if issued_date_str != 'N/A' else 'N/A'
            if issued_to_user.get('student'):
                student_info = issued_to_user['student']
                record['user_name'] = student_info.get('name', 'N/A')
                record['user_type']='Student'
                record['mobile_num'] = student_info.get('mobile_num', 'N/A')
                record['standard'] = student_info.get('current_standard_name','N/A')
            elif issued_to_user.get('staff'):
                staff_info = issued_to_user['staff']
                record['user_name'] = staff_info.get('name', 'N/A')
                record['user_type']='Staff'
                record['mobile_num'] = staff_info.get('mobile_num', 'N/A')
            else:
                record['user_name'] = 'N/A'
                record['mobile_num'] = 'N/A'

            record['amount'] = fine_payment_record.get('amount', 0)
            record['mode_of_payment']=record.get('mode_of_payment','N/A')
            record['reciept_num']=fine_payment_record.get('reciept_num','N/A')
            record['transaction_date']=record.get('transaction_date','N/A')

    if download_data:
        start_long_running_process(self)
        SharedService.custom_thread(download_fine_paid_list, self, serialized_data)
        return {'Reason': 'Data Added Successfully'}
    
    return {
        'data': {
            'count': count, 
            'next': next_page, 
            'previous': previous_page, 
            'data': serialized_data
        }
    }
def download_fine_paid_list(self, fine_paid_data):
    try:
        
        options = {
            'title': 'Paid Fine Report',
            'description': 'Report of all paid fines',
            'Data': fine_paid_data,
            'columns': [
                {"column": "Transaction Date", "required": False, "schemacolumn": "transaction_date"},
                {"column": "Amount", "required": False, "schemacolumn": "amount"},
                {"column": "Mode of Payment", "required": False, "schemacolumn": "mode_of_payment"},
                {"column": "User Type", "required": False, "schemacolumn": "user_type"},
                {"column": "User Name", "required": False, "schemacolumn": "user_name"},
                {"column": "Standard", "required": False, "schemacolumn": "standard"},
                {"column": "Mobile Number", "required": False, "schemacolumn": "mobile_num"},
                {"column": "Receipt Number", "required": False, "schemacolumn": "receipt_num"},
                {"column": "Due Date", "required": False, "schemacolumn": "due_date"},
                {"column": "Issued Date", "required": False, "schemacolumn": "issued_at"},
            ]
        }
        file_name = 'fine_paid_list.xlsx'

            
        transaction_id = self.request.GET.get('transaction_id')

        response= write_to_excel_new(self, options)
        if response.status_code == 200:
            with open(file_name, 'wb') as file:
                file.write(response.content)
            filename = file_name
            url = UploadTypeService.upload_local_file(filename, path='temp/FinePaidListReports')
            if os.path.exists(file_name):
                os.remove(file_name)
            store_long_running_process(self, transaction_id,{'url': url})
        else:
            store_long_running_process(self, transaction_id,{'error': f"error with status code {response.status_code}"})
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            store_long_running_process(self, transaction_id,{'error': e.args[:250]})
        else:
            raise e


def print_library_receipt(self, payment_id):
    obj = FinePaymentData.objects.get(id=payment_id)
    data = FinePaymentReadSerializer(obj).data
    selected_template, number_of_copies  = get_selected_template(self, 'library_receipts', 'pdf', 'default_lib_receipt.html')
    path = 'library_receipts/'+selected_template
    amount_in_words = num2words(data['total_amount'], lang='en')
    student_data = {}
    staff_data = {}
    if data['fine_fine_payment_data'][0]['issue_return_book']['issued_to_user']['student']:
        student_data = data['fine_fine_payment_data'][0]['issue_return_book']['issued_to_user']['student']
    elif data['fine_fine_payment_data']:
        staff_data = data['fine_fine_payment_data'][0]['issue_return_book']['issued_to_user']['staff']
    if 'transaction_date' in data and isinstance(data['transaction_date'], str):
        data['transaction_date'] = datetime.datetime.strptime(data['transaction_date'], '%Y-%m-%d').date()
    row_data ={'lib_data': data, 'amount_in_words': amount_in_words,
               'institute': Institute.get_institute(self), 
               'student_data': student_data, 
               'staff_data': staff_data,
               'number_of_copies': range(number_of_copies)}
    response = PDFService.receipt_new(self, row_data, str(data['receipt_num']), path)
    return response