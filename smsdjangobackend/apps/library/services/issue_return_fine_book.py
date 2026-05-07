
from re import I
from django.db import transaction
from django.utils import timezone
from datetime import datetime, timedelta
from rest_framework import exceptions
from apps.institutes.models.academicYear import AcademicYear

from apps.library.models.issue_return import FineExempted, IssueReturnBook, LibraryConfiguration, Renew
from apps.library.models.master import BookCopy, LibraryMembership
from apps.library.serializers import BookAndSearchUserSerializer, FineExemptedSerializer, FinePaymentDataDetailSerializer, FineSerializer, RenewDataSerializer, IssueReturnBookSerializer
from apps.library.services.master_services import get_accessible_lib_category_ids, get_library_configuration
from apps.shared.services import ConfigurationService, CounterService, FormdefinitionService, SharedService
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.students.services.staff import get_group_names_and_designations_for_staff
from apps.students.services.student import get_student_current_standard_section_name
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User
from apps.students.models.student import Student
from apps.staffs.models.staff import Staff
from apps.shared.services_shared.common import get_full_name
from apps.library.models.master import Publisher, BookAuthorMapping, Author

def get_user_current_holding_book(self, user_ids):
    issue_return_book = IssueReturnBook.objects.filter(
        issued_to_user__in=user_ids, is_returned=0
    ).values('issued_to_user', 'book_copy')
    issue_return_book_mapping = {}
    for issued_book in issue_return_book:
        if issued_book['issued_to_user'] not in issue_return_book_mapping:
            issue_return_book_mapping[issued_book['issued_to_user']] = []
        issue_return_book_mapping[issued_book['issued_to_user']].append(issued_book)
    user_book_mapping = {}
    for user_id in user_ids:
        user_book_mapping[user_id] = {'total_holding': 0, 'book_holding_list': []}
        if user_id in issue_return_book_mapping:
            user_book_mapping[user_id]['total_holding'] = len(issue_return_book_mapping[user_id])
            user_book_mapping[user_id]['book_holding_list'] = issue_return_book_mapping[user_id]
    return user_book_mapping

def issue_book_copy(self, data):
    issuing_book_copy_ids = []
    data_to_save = []
    mandatory_fields = ['book_copy', 'issued_to_user', 'assigned_configuration']
    transaction_id = data['transaction_id']
    today = datetime.today()
    todays_academic_year = AcademicYear.get_academic_year_for_date(self, today)
    issue_user_ids = []
    issue_configuration_ids = []
    issued_user_standard_map = {}
    for issue_book in data['issue_list']:
        SharedService.check_mandatory_field_in_list(mandatory_fields, issue_book)
        academic_year = issue_book['academic_year'] if 'academic_year' in issue_book else todays_academic_year
        config = get_library_configuration(issue_book['issued_to_user'], academic_year)
        issuing_book_copy_ids.append(issue_book['book_copy'])
        data_to_save.append({
            'book_copy': issue_book['book_copy'],
            'issued_to_user': issue_book['issued_to_user'],
            'issued_at': today,
            'transaction_id': transaction_id,
            'is_issued': True,
            'remark_on_issue': issue_book['remark_on_issue'],
            'issued_by_user': self.request.user.id,
            'due_date': today + timedelta(days=config['return_within_days']),
            'assigned_configuration': issue_book['assigned_configuration']
        })
        issue_user_ids.append(issue_book['issued_to_user'])
        issue_configuration_ids.append(issue_book['assigned_configuration'])
    issued_user_standard_map = {
        row['id']: row['student__current_standard']
        for row in User.objects.filter(id__in=issue_user_ids).values('id', 'student__current_standard')
    }
    user_book_details = get_user_book_details(issue_user_ids)
    library_configuration = {lib['id'] : lib for lib in LibraryConfiguration.objects.filter(id__in=issue_configuration_ids).values()}
    for row_data in data_to_save:
        row_data['current_standard'] = issued_user_standard_map.get(row_data['issued_to_user'])
        if len(user_book_details[row_data['issued_to_user']]['assigned_books']) >= library_configuration[row_data['assigned_configuration']]['number_of_books_per_user']:
            raise exceptions.ValidationError(f"Exceeding Limit  {library_configuration[row_data['assigned_configuration']]['number_of_books_per_user']} Books")
    book_issue_return_existing = IssueReturnBook.objects.filter(book_copy__in=issuing_book_copy_ids,is_returned=False).values_list("book_copy", flat=True)
    if book_issue_return_existing:
        book_copy_data = BookCopy.objects.filter(
            id__in=book_issue_return_existing
        ).values_list('book_number', flat=True)
        booknumberdata = ','.join(book_copy_data)
        raise exceptions.ValidationError(f'Book Number : {booknumberdata} still not returned')
    response = SharedService.add_data(self, data_to_save, True)
    return response

""" for_date -> string """
def find_fine_for_book(for_date, book_numbers=[], book_copy_ids=[], issue_return_ids=[]):
    filter_query = {}
    if book_numbers:
        filter_query = {
            'book_copy__book_number__in': book_numbers,
        }
    elif book_copy_ids:
        filter_query = {
            'book_copy__in': book_copy_ids,
        }
    elif issue_return_ids:
        filter_query = {
            'id__in': issue_return_ids
        }
    if filter_query:
        book_copy_data = IssueReturnBook.objects.filter(
            **filter_query
        ).values(
            'assigned_configuration', 'assigned_configuration__return_within_days',
            'assigned_configuration__number_of_books_per_user', 'assigned_configuration__fine_amount', 'assigned_configuration__fine_frequency_in_minutes',
            'assigned_configuration__max_fine_amount', 'due_date', 'id', 'book_copy__book_number', 'book_copy_id'
        )
    else:
        book_copy_data = []
    temp_issue_return_ids = [issue['id'] for issue in book_copy_data]
    renew_carry_forward_amount = {r['issue_return_book'] : r for r in Renew.objects.filter(issue_return_book__in=temp_issue_return_ids, is_active=True).values(
        'issue_return_book', 'carry_forward_fine_amount', 'number_of_minutes_from_due_date'
    )}
    return_fine_amount = {}
    for book_copy in book_copy_data:
        key = str(book_copy['book_copy__book_number'])
        if book_copy_ids:
            key = str(book_copy['book_copy_id'])
        elif issue_return_ids:
            key = str(book_copy['id'])
        return_fine_amount[key] = {'fine_amount': 0, 'fine_minutes': 0}
        if book_copy['id'] in renew_carry_forward_amount:
            return_fine_amount[key]['fine_amount'] = renew_carry_forward_amount[book_copy['id']]['carry_forward_fine_amount']
            return_fine_amount[key]['fine_minutes'] = renew_carry_forward_amount[book_copy['id']]['number_of_minutes_from_due_date']
        number_of_minutes_from_due_date = (for_date - book_copy['due_date']).total_seconds() / 60
        if number_of_minutes_from_due_date > 0:
            fine_amount = round((
                number_of_minutes_from_due_date / book_copy['assigned_configuration__fine_frequency_in_minutes']) \
                    * book_copy['assigned_configuration__fine_amount']
            )
            if fine_amount > book_copy['assigned_configuration__max_fine_amount']:
                fine_amount = book_copy['assigned_configuration__max_fine_amount']
            return_fine_amount[key]['fine_amount'] += fine_amount
            return_fine_amount[key]['fine_minutes'] += int(number_of_minutes_from_due_date)
    return return_fine_amount

def return_book_copy(self, data):
    issuereturnbook_ids = []
    payment_data = data['payment_details']
    book_copy_issue_mapping = {}
    today = datetime.today()
    for return_data in data['return_list']:
        issuereturnbook_ids.append(return_data['issuereturnbook_id'])
    issue_return_data = IssueReturnBook.objects.filter(
        id__in=issuereturnbook_ids
    ).values('book_copy', 'id', 'is_returned')
    issue_return_data_mapping = {}
    if len(issue_return_data) != len(issuereturnbook_ids):
        raise exceptions.ValidationError('Invalid issuereturnbook_ids')
    for issue_return in issue_return_data:
        issue_return_data_mapping[issue_return['id']] = issue_return
        if issue_return['is_returned']:
            raise exceptions.ValidationError('Book Already Returned')
        book_copy_issue_mapping[issue_return['book_copy']] = issue_return
    fine_amount_mapping = {}
    if book_copy_issue_mapping:
        fine_amount_mapping = find_fine_for_book(today, [], list(book_copy_issue_mapping.keys()))
    exempted_data_to_save = []
    for return_data in data['return_list']:
        is_exempted = True if 'is_exempted' in return_data and return_data['is_exempted'] else False
        calculated_fine_amount = fine_amount_mapping[str(issue_return_data_mapping[return_data["issuereturnbook_id"]]["book_copy"])]["fine_amount"]
        # if return_data.get('fine_amount', 0) > calculated_fine_amount:
        #     raise exceptions.ValidationError(f"Fine amount you have entered ({return_data['fine_amount']}) exceeds the calculated fine amount ({calculated_fine_amount})."
        #     )
        if  calculated_fine_amount > 0 and return_data['fine_amount'] <= 0 and ('is_exempted' not in return_data or not is_exempted):
            raise exceptions.ValidationError('When storing zero rupees you have to selected is_exempted to 1')
        if is_exempted and 'fine_amount' in return_data and return_data['fine_amount'] > 0:
            raise exceptions.ValidationError('When is_exempted is greater than zero fine amount should be set to 0')
        if is_exempted and ('reason_id' not in return_data):
            raise exceptions.ValidationError('reason_id is mandaotry for is_exempted')
        if is_exempted:
            exempted_data_to_save.append({
                'issue_return_book_id': return_data['issuereturnbook_id'],
                'fine_minutes': fine_amount_mapping[str(issue_return_data_mapping[return_data["issuereturnbook_id"]]["book_copy"])]['fine_minutes'],
                'amount': calculated_fine_amount,
                'reason': return_data['reason_id']
            })
        allow_to_edit_fine_amount = FormdefinitionService.get_formdefintion_data(self, 'library_configuration', 'allow_to_edit_fine_amount')
        if not allow_to_edit_fine_amount and return_data['fine_amount'] and float(return_data['fine_amount']) != calculated_fine_amount:
            raise exceptions.ValidationError(f'Fine Amount Mismatch. It should be {calculated_fine_amount}')
    with transaction.atomic(using=get_current_db_name()):
        counter, prefix, postfix = CounterService.get_countered_value(self, 'LIBRARY_FINE')
        receipt_num = f'{prefix}{counter.value}{postfix}'
        is_increment_counter = False
        total_amount = 0
        payment_detail_id = None
        for return_data in data['return_list']:
            if return_data['fine_amount']:
                total_amount += float(return_data['fine_amount'])
        if total_amount:
            payment_detail = {
                'transaction_date': today.date(),
                'receipt_num': receipt_num,
                'mode_of_payment': payment_data['mode_of_payment'],
                'payment_ref_num': payment_data['payment_ref_num'],
                'total_amount': total_amount
            }
            ser = FinePaymentDataDetailSerializer(data=payment_detail)
            ser.is_valid(raise_exception=True)
            payment_detail = ser.save()
            payment_detail_id = payment_detail.id
        for return_data in data['return_list']:
            # Set modified=now so lists sorted by -modified show this row after return
            # (QuerySet.update() does not auto-update auto_now fields.)
            IssueReturnBook.objects.filter(id=return_data['issuereturnbook_id']).update(
                returned_at=today, is_returned=1, returned_by_user=self.request.user.id,
                remark_on_return=return_data['remark_on_return'],
                modified=timezone.now(),
            )
            if return_data['fine_amount'] and float(return_data['fine_amount']) > 0:
                fine_data = {
                    'amount': return_data['fine_amount'],
                    'fine_minutes': fine_amount_mapping[str(issue_return_data_mapping[return_data['issuereturnbook_id']]['book_copy'])]['fine_minutes'],
                    'issue_return_book': return_data['issuereturnbook_id'],
                    'fine_payment_data': payment_detail_id
                }
                is_increment_counter = True
                ser = FineSerializer(data=fine_data)
                ser.is_valid(raise_exception=True)
                ser.save()
        if exempted_data_to_save:
            serF = FineExemptedSerializer(data=exempted_data_to_save, many=True)
            serF.is_valid(raise_exception=True)
            serF.save()
        if is_increment_counter:
            CounterService.increment_counter(self, counter)
    return {'Reason': 'Data Successfully', 'payment_detail_id': payment_detail_id}


def handle_issue_return_data(self, data):
    if 'issue_list' in data:
        response = issue_book_copy(self, data)
    elif 'return_list' in data:
        response = return_book_copy(self, data)
    elif 'issue_return_datas' in data:
        response = renew_book(self,data['issue_return_datas'], data['payment_details'])
    else:
        raise exceptions.ValidationError('Unhanled issue data')
    return response

def get_book_authors(book_ids):
    book_author_data = BookAuthorMapping.objects.filter(book__in=book_ids).values('book', 'author__name')
    book_author_mapping = {}
    for author in book_author_data:
        if author['book'] not in book_author_mapping:
            book_author_mapping[author['book']] = []
        book_author_mapping[author['book']].append(author)
    return book_author_mapping

def get_book_issue_return_details(user_ids):
    book_copy_ids = []
    book_ids = []
    user_book_detail_mapping = {}
    assigned_books = IssueReturnBook.objects.filter(
        issued_to_user__in=user_ids, returned_by_user__isnull=True
    ).values('book_copy__book', 'issued_to_user', 'book_copy', 'id')
    publisher_data = {pub['id'] : pub for pub in Publisher.objects.filter(is_active=True).values()}
    for assigned_book in assigned_books:
        book_copy_ids.append(assigned_book['book_copy'])
        book_ids.append(assigned_book['book_copy__book'])
    book_author_mapping = get_book_authors(book_ids)
    book_copy_data = {}
    for book in BookCopy.objects.filter(id__in=book_copy_ids).values(
        *book_copy_values
    ):
        book['author_details'] = []
        if book['book'] in book_author_mapping:
            book['author_details'] = book_author_mapping[book['book']]
        book['book_publisher_name'] = ''
        if book['book__publisher']:
            book['book_publisher_name'] = publisher_data[book['book__publisher']]['name']
        book_copy_data[book['id']] = book
    for assigned_book in assigned_books:
        if assigned_book['issued_to_user'] not in user_book_detail_mapping:
            user_book_detail_mapping[assigned_book['issued_to_user']] = []
        user_book_detail_mapping[assigned_book['issued_to_user']].append(book_copy_data[assigned_book['book_copy']])
    return user_book_detail_mapping


def issued_book_details(book_copy_ids=None, user_ids=None):
    book_copy_mapping = {}
    if book_copy_ids:
        filter_query = {'book_copy__in': book_copy_ids, 'is_returned': False}
    else:
        filter_query = {'issued_to_user__in': user_ids, 'returned_by_user__isnull': True}
    
    issue_return_books = IssueReturnBook.objects.filter(
        **filter_query
    ).values(
        'book_copy__book_number', 'issued_at', 'issued_to_user__staff__first_name',
        'issued_to_user__staff__middle_name', 'issued_to_user__staff__last_name',
        'issued_to_user__student__first_name', 'issued_to_user__student__middle_name',
        'issued_to_user__student__last_name', 'issued_to_user__is_staff', 
        'issued_to_user_id', 'due_date', 'book_copy_id', 'book_copy__book', 'id',
    )
    temp_book_copy_ids = []
    book_ids = []
    book_numbers = []
    issue_return_ids = []
    user_ids = []
    for book in issue_return_books:
        temp_book_copy_ids.append(book['book_copy_id'])
        book_ids.append(book['book_copy__book'])
        book_numbers.append(book['book_copy__book_number'])
        issue_return_ids.append(book['id'])
        user_ids.append(book['issued_to_user_id'])
    author_datas = Author.objects.filter(
        book_author_mapping_author__book__in=book_ids
    ).values('id', 'name', 'description', 'book_author_mapping_author__book')
    author_data_mapping = {}
    for author in author_datas:
        book_id = author['book_author_mapping_author__book']
        author_data_mapping.setdefault(book_id, []).append(author)
    if user_ids and issue_return_books:
        book_copy_mapping = {
            book_copy_data['id']: book_copy_data
            for book_copy_data in BookCopy.objects.filter(
                id__in=temp_book_copy_ids
            ).values(*book_copy_values)
        }
    fine_amount_mapping = find_fine_for_book(datetime.today(), book_numbers)
    renew_dates = {
    renew['issue_return_book_id']: renew['modified']
    for renew in Renew.objects.filter(issue_return_book_id__in=issue_return_ids).values('issue_return_book_id', 'modified')
}
    book_copy_wise_issue = {}
    user_wise_issue = {}
    user_queryset = User.objects.filter(id__in=user_ids)
    user_mapping_data = {u['id']: u for u in BookAndSearchUserSerializer(user_queryset, many=True).data}
    for issue_return_book in issue_return_books:
        issue_return_data = {}
        issue_return_data['user_details'] = {}
        book_number = issue_return_book['book_copy__book_number']
        issue_return_data['author_datas'] = author_data_mapping.get(issue_return_book['book_copy__book'], [])
        issue_return_data['issued_on'] = issue_return_book['issued_at']
        issue_return_data['issue_return_id'] = issue_return_book['id']
        if issue_return_book['issued_to_user_id'] in user_mapping_data:
            issue_return_data['user_details'] = user_mapping_data[issue_return_book['issued_to_user_id']]
        # if issue_return_book['issued_to_user__is_staff']:#neeed to remove this once the above user mapping data working fine
        #     name = get_full_name(
        #         issue_return_book['issued_to_user__staff__first_name'],
        #         issue_return_book['issued_to_user__staff__middle_name'],
        #         issue_return_book['issued_to_user__staff__last_name']
        #     )
        # else:
        #     name = get_full_name(
        #         issue_return_book['issued_to_user__student__first_name'],
        #         issue_return_book['issued_to_user__student__middle_name'],
        #         issue_return_book['issued_to_user__student__last_name']
        #     )
        # issue_return_data['user_details'] = {
        #     'name': name, 'user_id': issue_return_book['issued_to_user_id'],
        #     'is_staff': issue_return_book['issued_to_user__is_staff']
        # }
        issue_return_data['issued_to_user'] = issue_return_book['issued_to_user_id']
        issue_return_data['due_date'] = issue_return_book['due_date']
        issue_return_data['book_status'] = 'Issued'
        issue_return_data['fine_details'] = fine_amount_mapping[book_number]
        issue_return_data['renew_date'] = renew_dates.get(issue_return_book['id'])
        book_copy_wise_issue[issue_return_book['book_copy_id']] = issue_return_data
        user_id = issue_return_book['issued_to_user_id']
        if user_id not in user_wise_issue:
            user_wise_issue[user_id] = {'assigned_books': [], 'total_fine_amount': 0}
        user_wise_issue[user_id]['total_fine_amount'] += fine_amount_mapping[book_number]['fine_amount']
        user_wise_issue[user_id]['assigned_books'].append(issue_return_data)
        if user_ids:
            issue_return_data.update(book_copy_mapping[issue_return_book['book_copy_id']])
    if book_copy_ids:
        return {book_copy: book_copy_wise_issue.get(book_copy, {}) for book_copy in book_copy_ids}
    else:
        return {user_id: user_wise_issue.get(user_id, {}) for user_id in user_ids}
book_copy_values = [
    'book', 'book_number', 'bar_code', 'rack', 'book__title',
    'book__sub_title', 'book__price', 'book__category', 'book__sub_category',
    'book__sub_category__name', 'book__category__name',
    'book__publisher', 'id', 'book__publisher__name'
]   

def get_book_details(book_number, filters={}):
    book_copy_filter = {'book_number': book_number}
    if 'category_ids' in filters and filters['category_ids']:
        book_copy_filter['book__category__in'] = filters['category_ids']
    if 'sub_category' in filters and filters['sub_category']:
        book_copy_filter['book__sub_category'] = filters['sub_category']
    book_copy_data = BookCopy.objects.filter(
        **book_copy_filter
    ).values(
        *book_copy_values
    )
    if not book_copy_data:
        raise exceptions.ValidationError("Invalid Book Number")
    book_copy_data = book_copy_data[0]
    book_copy_data.update(issued_book_details([book_copy_data['id']])[book_copy_data['id']])
    if 'user_details' in book_copy_data and book_copy_data['user_details']:
        user_details = book_copy_data['user_details']
        user_id = user_details['id']
        student_id = user_details.get('student')
        staff_id = user_details.get('staff')
        if student_id:
            student_data = get_student_current_standard_section_name([student_id])
            if student_id in student_data:
                user_details['student_details']['standard_name'] = student_data[student_id].get('standard_name', 'N/A')
                user_details['student_details']['section_name'] = student_data[student_id].get('section_name', 'N/A')
        if staff_id:
            staff_data = get_group_names_and_designations_for_staff([staff_id])
            if staff_id in staff_data:
                user_details['staff_details']['group_names'] = staff_data[staff_id].get('group_names', 'N/A')
                user_details['staff_details']['designation'] = staff_data[staff_id].get('designation', 'N/A')
        issued_books = issued_book_details(None, [user_id])[user_id]
        user_details['assigned_books'] = issued_books.get('assigned_books', [])
        user_details['total_fine_amount']=issued_books.get('total_fine_amount',0)
    book_author_mapping = get_book_authors([book_copy_data['book']])
    book_copy_data['author_details'] = []
    if book_copy_data['book'] in book_author_mapping:
        book_copy_data['author_details'] = book_author_mapping[book_copy_data['book']]
    book_copy_data['book_publisher_name'] = book_copy_data['book__publisher__name']
    return book_copy_data

def get_user_book_details(user_ids=None, student_ids=None, staff_ids=None, barcodes=None):
    filter_user_data = {}
    if user_ids:
        filter_user_data = {'id__in': user_ids}
    elif student_ids:
        filter_user_data = {'student__in': student_ids}
    elif staff_ids:
        filter_user_data = {'staff__in': staff_ids}
    elif barcodes:
        filter_user_data = {'barcode_number__in': barcodes}
    else:
        raise exceptions.ValidationError('Invalid Input')
    queryset = User.objects.filter(**filter_user_data)
    user_data = BookAndSearchUserSerializer(queryset, many=True).data
    user_ids = []
    student_ids = []
    staff_ids = []
    for user in user_data:
        user_ids.append(user['id'])
        if user['student']:
            student_ids.append(user['student'])
        else:
            staff_ids.append(user['staff'])
    user_book_detail_mapping = issued_book_details(None, user_ids)
    return_user_data = {}
    studen_standard_section = get_student_current_standard_section_name(student_ids)
    staff_info = get_group_names_and_designations_for_staff(staff_ids)
    for user in user_data:
        if user['student'] in studen_standard_section:
            user['student_details']['standard_name'] = studen_standard_section[user['student']]['standard_name']
            user['student_details']['section_name'] = studen_standard_section[user['student']]['section_name']
        if user['staff'] in staff_info:
            user['staff_details']['group_names'] = staff_info[user['staff']]['group_names'] 
            user['staff_details']['designation'] = staff_info[user['staff']]['designation']
        user['assigned_books'] = []
        if user['id'] in user_book_detail_mapping:
            user['assigned_books'] = user_book_detail_mapping[user['id']]['assigned_books'] if 'assigned_books' in user_book_detail_mapping[user['id']] else []
            user['total_fine_amount'] = user_book_detail_mapping[user['id']]['total_fine_amount'] if 'total_fine_amount' in user_book_detail_mapping[user['id']] else 0
        if user_ids:
            return_user_data[user['id']] = user
        if barcodes:
            return_user_data[user['barcode_number']] = user
    return return_user_data

def search_book_and_user(self):
    book_number = self.request.GET.get('book_number')
    user_id = self.request.GET.get('user_id')
    user_bar_code= self.request.GET.get('user_bar_code')
    category = self.request.GET.get('category')
    sub_category = self.request.GET.get('sub_category')
    logged_in_user_id = self.request.user.id
    is_super_user = self.request.user.is_superuser
    category_ids = get_accessible_lib_category_ids(self, [category])
    filters = {'category_ids': category_ids} if category_ids else {}
    if sub_category:
        filters['sub_category'] = sub_category
    response = None
    if book_number:
        response = get_book_details(book_number, filters)
    elif user_bar_code:
        response = get_user_book_details(barcodes=[user_bar_code])
        if response is None or user_bar_code not in response:
            raise exceptions.ValidationError('Invalid Bar Code')
        user_data = response[user_bar_code]
        student_details = user_data.get('student_details')
        if student_details:
            student_standard = student_details.get('standard_name')
            if not student_standard:
                raise exceptions.ValidationError('Student has no associated standard')
            if not is_super_user:
                mapping_value = int(ConfigurationService.get_setting_value('staffstandardmapping'))
                if mapping_value == 1:
                    staff = Staff.objects.filter(users__id=logged_in_user_id).first()
                    assigned_standards = StaffStandardMapping.objects.filter(
                        staff_id=staff.id
                    ).values_list('standard__name', flat=True)
                    if student_standard not in assigned_standards:
                        raise exceptions.ValidationError(
                            f"Student's standard ({student_standard}) is not accessible"
                        )
        response = response[user_bar_code]
    elif user_id:
        response = get_user_book_details([user_id])
        if int(user_id) not in response:
            raise exceptions.ValidationError('Invalid User')
        response = response[int(user_id)]
    else:
        raise exceptions.ValidationError('Invalid response')
    return response

def renew_book(self, issue_return_datas, payment_details):
    issue_return_ids = []
    given_data = {}
    today = datetime.today()
    exempted_data_to_save = []
    is_of_exempted_data_to_save = []

    for issue_return in issue_return_datas:
        issue_return_ids.append(issue_return['issue_return_book_id'])
        if not issue_return.get('updated_due_date'):
            raise exceptions.ValidationError('updated_due_date is mandatory')
        given_data[issue_return['issue_return_book_id']] = issue_return

    issue_return_datas_db = IssueReturnBook.objects.filter(id__in=issue_return_ids).values()
    total_amount = payment_details.get('total_amount', 0) if payment_details else 0
    renew_data_to_save = []
    update_issue_return_data = []
    issue_return_fine_data = find_fine_for_book(today, [], [], issue_return_ids)

    for issue_return_row in issue_return_datas_db:
        if issue_return_row['due_date'] >= datetime.strptime(given_data[issue_return_row['id']]['updated_due_date'], '%Y-%m-%d %H:%M:%S'):
            raise exceptions.ValidationError('Renew Date should be greater than due date')

        carry_forward_fine_amount = issue_return_fine_data.get(str(issue_return_row['id']), {}).get('fine_amount', 0)
        is_exempted = given_data[issue_return_row['id']].get('is_exempted', False)
        if is_exempted:
            if 'reason_id' not in given_data[issue_return_row['id']]:
                raise exceptions.ValidationError('reason_id is mandatory for exempted fines')
            carry_forward_fine_amount_to_save = carry_forward_fine_amount
            carry_forward_fine_amount = 0 
            exempted_data_to_save.append({
                'issue_return_book_id': issue_return_row['id'],
                'fine_minutes': issue_return_fine_data.get(str(issue_return_row['id']), {}).get('fine_minutes', 0),
                'amount': carry_forward_fine_amount_to_save,
                'reason': given_data[issue_return_row['id']]['reason_id']
            })
        skip_amount = given_data[issue_return_row['id']].get('skip_fine_amount',False)
        is_of_exempted = given_data[issue_return_row['id']].get('is_of_exempted',False)
        
        if is_of_exempted:
            if 'reason_id' not in given_data[issue_return_row['id']]:
                raise exceptions.ValidationError('reason_id is mandatory for exempted fines')
            carry_forward_fine_amount = 0
            is_of_exempted_data_to_save.append({
                'issue_return_book_id': issue_return_row['id'],
                'fine_minutes': issue_return_fine_data.get(str(issue_return_row['id']), {}).get('fine_minutes', 0),
                'amount': skip_amount,
                'reason': given_data[issue_return_row['id']]['reason_id']
            })
        updated_carry_forward_fine_amount = carry_forward_fine_amount - total_amount if carry_forward_fine_amount else 0

        temp = {
            'issue_return_book': issue_return_row['id'],
            'updated_due_date': given_data[issue_return_row['id']]['updated_due_date'],
            'last_due_date': issue_return_row['due_date'],
            'carry_forward_fine_amount': updated_carry_forward_fine_amount,
            'number_of_minutes_from_due_date': issue_return_fine_data.get(str(issue_return_row['id']), {}).get('fine_minutes', 0)
        }
        renew_data_to_save.append(temp)
        update_issue_return_data.append({
            'due_date': temp['updated_due_date'],
            'issue_return_id': issue_return_row['id']
        })

    if update_issue_return_data or renew_data_to_save:
        with transaction.atomic(using=get_current_db_name()):
            counter, prefix, postfix = CounterService.get_countered_value(self, 'LIBRARY_FINE')
            receipt_num = f'{prefix}{counter.value}{postfix}'
            is_increment_counter = False
            payment_detail_id = None
            if payment_details:
                total_amount = payment_details.get('total_amount', 0)
                if total_amount > 0:
                    payment_detail = {
                        'transaction_date': today.date(),
                        'receipt_num': receipt_num,
                        'mode_of_payment': payment_details.get('mode_of_payment', ''),
                        'payment_ref_num': payment_details.get('payment_ref_num', ''),
                        'total_amount': total_amount
                    }
                    ser = FinePaymentDataDetailSerializer(data=payment_detail)
                    ser.is_valid(raise_exception=True)
                    payment_detail = ser.save()
                    payment_detail_id = payment_detail.id
                    for return_data in issue_return_datas_db:
                        book_copy_id = return_data.get('book_copy_id')
                        if not book_copy_id:
                            continue
                        fine_data = {
                            'amount': total_amount,
                            'fine_minutes': find_fine_for_book(today, [], [book_copy_id]).get(str(return_data['id']), {}).get('fine_minutes', 0),
                            'issue_return_book': return_data['id'],
                            'fine_payment_data': payment_detail_id
                        }
                        fine_serializer = FineSerializer(data=fine_data)
                        fine_serializer.is_valid(raise_exception=True)
                        fine_serializer.save()
            ser = RenewDataSerializer(data=renew_data_to_save, many=True)
            ser.is_valid(raise_exception=True)
            ser.save()
            for update_row in update_issue_return_data:
                inst = IssueReturnBook.objects.get(id=update_row['issue_return_id'])
                issue_return = IssueReturnBookSerializer(instance=inst, data=update_row, partial=True)
                issue_return.is_valid(raise_exception=True)
                issue_return.save()
            if exempted_data_to_save:
                serF = FineExemptedSerializer(data=exempted_data_to_save, many=True)
                serF.is_valid(raise_exception=True)
                serF.save()
            if is_of_exempted_data_to_save:
                serF = FineExemptedSerializer(data=is_of_exempted_data_to_save, many=True)
                serF.is_valid(raise_exception=True)
                serF.save()
    else:
        raise exceptions.ValidationError('No data to save')

    return {'Reason': 'Data Added Successfully', 'payment_detail_id': payment_detail_id, 'receipt_num': receipt_num}



def add_update_library_membership(self, data):
    enabled_user_ids = []
    disabled_user_ids = []
    for user in data['enabled_user_ids']:
        enabled_user_ids.append(user)
    for user in data['disabled_user_ids']:
        disabled_user_ids.append(user)
    existing_data = {lib['user_id'] : lib for lib in LibraryMembership.objects.filter(user__in=enabled_user_ids+disabled_user_ids).values()}
    data_to_save = []
    for enable_user_id in enabled_user_ids:
        if enable_user_id in existing_data and not existing_data[enable_user_id]['is_active']: #if inactive and now activating then store old history
            json_data = existing_data[enable_user_id]['history']
            json_data.append({'enabling': True, 'created': datetime.today()})
            data_to_save.append({
                'id': existing_data['id'],
                'history': json_data,
                'is_active': True
            })
        if not enable_user_id in existing_data:
            data_to_save.append({
                'user': enable_user_id
            })
    return SharedService.add_or_update_data(self, data)