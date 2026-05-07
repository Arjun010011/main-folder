from datetime import datetime
import os
from rest_framework import exceptions
from django.db import transaction
from django.db.models import Q
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.classes.models.enrollment import StudentStandardMapping
from apps.library.models.attendance import LibraryUserAttendance
from apps.library.models.issue_return import Fine, FinePaymentData, IssueReturnBook, LibraryConfiguration, Renew, StandardLibraryConfiguration

from apps.library.models.master import Author, Book, BookAuthorMapping, BookCopy, BookDetail, BookSubCategory, LibraryMembership, Publisher
from apps.library.serializers import BookAuthorMappingSerializer, BookCopySerializer, BookDetailSerializer, BookSerilaizer, FineReadSerializer, LibraryConfigurationSerializer, LibraryMembershipSerializer, LibraryUserAttendanceReadSerializer, LibraryUserAttendanceSerializer, StandardLibraryConfigurationSerializer
from apps.library.services.reports import library_fine_pending_list
from apps.shared.services import FormdefinitionService, SharedService, UploadTypeService
from apps.shared.services_shared.common import get_full_name
from apps.shared.services_shared.store_api_result import store_long_running_process, start_long_running_process
from apps.staffs.models.staff_standard import StaffStandardMapping
from apps.students.models.student import Student
from apps.students.services.student import get_student_admission_form_details
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User

# Common Function Starts From Here 
# if [] means dont have access to any category
# if None there is no concept of category mapping
# always check is not none because if is not none then he have access to all category if it throws [] then dont have access to any category
def get_accessible_lib_category_ids(self, given_category_ids):
    if given_category_ids:
        given_category_ids = None if all(element is None for element in given_category_ids) else given_category_ids
    from ast import literal_eval
    lib_category_user_mapping = FormdefinitionService.get_formdefintion_data(self, 'library_configuration', 'lib_category_user_mapping')
    cat_user_mapping = literal_eval(lib_category_user_mapping) if lib_category_user_mapping else None
    if cat_user_mapping:
        logged_in_user = self.request.user.id
        category_ids = []
        for lib_cat in cat_user_mapping:
            if str(lib_cat['user']) == str(logged_in_user):
                category_ids.append(lib_cat['category'])
        if not given_category_ids:
            return category_ids
        else:
            is_present = all(str(item) in map(str, category_ids) for item in given_category_ids) #check is given id present
            # if not is_present:
            #     raise exceptions.ValidationError('Dont have access to the given category')
            return given_category_ids
    else:
        if given_category_ids:
            return given_category_ids
        return None #if none there is no configuration to retrict so need to show all


def create_library_configuration(self, data):
    config_data = data['configuration_data']
    deletable_ids = data['deletable_ids']
    academic_year = data['academic_year'] if 'academic_year' in data and data['academic_year'] else None
    deletable_standard_ids = []
    existing_library_config_data = LibraryConfiguration.objects.filter(
        is_active=True
    ).values(
        'id', 'standard_library_config_library_config', 'standard_library_config_library_config__standard', 'standard_library_config_library_config__academic_year', 'is_default'
    )
    existing_default_ids = set()
    is_new_default_exist = False
    existing_academic_standard_mapping = {}
    for existing_data in existing_library_config_data:
        if existing_data['is_default']:
            existing_default_ids.add(existing_data['id'])
        if existing_data['standard_library_config_library_config__academic_year'] not in existing_academic_standard_mapping:
            existing_academic_standard_mapping[existing_data['standard_library_config_library_config__academic_year']] = {}
        if existing_data['standard_library_config_library_config__standard'] not in existing_academic_standard_mapping[
            existing_data['standard_library_config_library_config__academic_year']]:
            existing_academic_standard_mapping[existing_data['standard_library_config_library_config__academic_year']][
                existing_data['standard_library_config_library_config__standard']] = existing_data
    for row_data in config_data:
        if 'id' in row_data and row_data['id'] and not row_data['is_default'] and row_data['id'] in existing_default_ids:
            existing_default_ids.remove(row_data['id'])
        elif row_data['is_default']:
            is_new_default_exist = True
        if not row_data['is_default'] and not row_data['standards']:
            raise exceptions.ValidationError('If is_default is given then standards are mandatory')
        if 'deletable_standards' in row_data and row_data['deletable_standards']:
            deletable_standard_ids += row_data['deletable_standards']
        if 'return_within_days' not in row_data or not row_data['return_within_days']:
            raise exceptions.ValidationError('return_within_days is mandatory')
        if 'number_of_books_per_user' not in row_data or not row_data['number_of_books_per_user']:
            raise exceptions.ValidationError('number_of_books_per_user is mandatory')
        if 'fine_amount' not in row_data or row_data['fine_amount'] is None:
            raise exceptions.ValidationError('fine_amount is mandatory')
        if 'fine_frequency_in_minutes' not in row_data or row_data['fine_frequency_in_minutes'] is None:
            raise exceptions.ValidationError('fine_frequency_in_minutes is mandatory')
        if 'max_fine_amount' not in row_data or row_data['max_fine_amount'] is None:
            raise exceptions.ValidationError('max_fine_amount is mandatory')
        if 'standards' in row_data and row_data['standards']:
            for standard in row_data['standards']:
                standard_id = standard['standard']
                given_id = standard['id'] if 'id' in standard and standard['id'] else None
                if academic_year in existing_academic_standard_mapping and standard_id in \
                        existing_academic_standard_mapping[academic_year]:
                    if not ('id' in row_data and row_data['id'] and row_data['id'] ==
                            existing_academic_standard_mapping[academic_year][standard_id]['id'] and
                            given_id == existing_academic_standard_mapping[academic_year][standard_id][
                                'standard_library_config_library_config']):
                        raise exceptions.ValidationError('Duplicate configuration for the standard')
    if existing_default_ids and is_new_default_exist:
        LibraryConfiguration.objects.filter(id__in=existing_default_ids).update(is_default=False)
    if deletable_ids:
        if IssueReturnBook.objects.filter(assigned_configuration__in=deletable_ids, is_active=True):
            raise exceptions.ValidationError('Configuration already refered')
    with transaction.atomic(using=get_current_db_name()):
        if deletable_ids:
            LibraryConfiguration.objects.filter(id__in=deletable_ids).update(
                is_active=False
            )
        if deletable_standard_ids:
            StandardLibraryConfiguration.objects.filter(id__in=deletable_standard_ids).delete()
        for row_data in config_data:
            row_data['is_active'] = True
            data_to_save = []
            if 'id' in row_data and row_data['id']:
                ser = LibraryConfigurationSerializer(instance=LibraryConfiguration.objects.get(id=row_data['id']), data=row_data)
                ser.is_valid(raise_exception=True)
                ser.save()
            else:
                ser = LibraryConfigurationSerializer(data=row_data)
                ser.is_valid(raise_exception=True)
                ser.save()
            if 'standards' in row_data and row_data['standards']:
                for standard in row_data['standards']:
                    standard_id = standard['standard']
                    temp = {
                            'library_configuration': ser.data['id'],
                            'standard': standard_id,
                            'academic_year': academic_year
                        }
                    if 'id' in standard and standard['id']:
                        temp['id'] = standard['id']
                    data_to_save.append(
                        temp
                    )
            if data_to_save:
                for temp_row in data_to_save:
                    if 'id' in temp_row and temp_row['id']:
                        ser = StandardLibraryConfigurationSerializer(instance=StandardLibraryConfiguration.objects.get(id=temp_row['id']),data=temp_row)
                        ser.is_valid(raise_exception=True)
                        ser.save()
                    else:
                        ser = StandardLibraryConfigurationSerializer(data=temp_row)
                        ser.is_valid(raise_exception=True)
                        ser.save()
    return {'Reason': 'Data Saved Successfully'}

def get_library_configuration(issuing_user_id, academic_year):
    user_obj = User.objects.get(id=issuing_user_id)
    filter_query = {
        'is_active': True,
        'is_default': True
    }
    if user_obj.student:
        user_standard = StudentStandardMapping.objects.filter(
            student=user_obj.student,
            academic_year= academic_year
        ).first()
        if user_standard:
            standard_config = StandardLibraryConfiguration.objects.filter(
                standard=user_standard.standard,
                academic_year=academic_year,
                library_configuration__is_active=True
            ).first()
            if standard_config:
                filter_query['id'] = standard_config.library_configuration.id
                del filter_query['is_default']
    library_obj = LibraryConfiguration.objects.filter(**filter_query).values()
    if not library_obj:
        raise exceptions.ValidationError("Library Configuration is Not Configured")
    return library_obj[0]


def update_library_category(self, data, filters, kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_library_category(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def update_library_rack(self, data, filters, kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_library_rack(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def library_add_sub_category(self, data):
    SharedService.duplicate_list_one_object(data['sub_category'], 'name')
    for item in data['sub_category']:
        if not data['category']:
            raise exceptions.ValidationError('category is mandatory')
        item.update({'category': data['category']})
    response = SharedService.add_data(self, data['sub_category'])
    return response

def libary_sub_category_update_data(self, data, filters, kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if not data['category']:
            raise exceptions.ValidationError('category is mandatory')
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_sub_category_data(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response


def library_add_publisher_data(self, data):
    SharedService.duplicate_list_one_object(data['publisher'], 'name')
    response = SharedService.add_data(self, data['publisher'])
    return response

def update_library_publisher(self, data, filters, kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_library_publisher(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def library_add_author_data(self, data):
    SharedService.duplicate_list_one_object(data['author'], 'name')
    response = SharedService.add_data(self, data['author'])
    return response

def update_library_author(self, data, kwargs):
    if BookAuthorMapping.objects.filter(author=self.kwargs['pk']).exists():
            raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_library_author(self):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if BookAuthorMapping.objects.filter(author=self.kwargs['pk']).exists():
            raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def validate_book(self, data_list):
    book_title_list = []
    category_sub_category_book_mapping = {} #check given duplicate
    error_list = {}
    category_list = []
    subcategory_list = []
    book_number_list = []
    duplicate_book_number_list = []
    sub_category_list = []
    for book_row in data_list:
        if not book_row['book']['category']:
            book_row['book']['category'] = None
        if not book_row['book']['sub_category']:
            book_row['book']['sub_category'] = None
        else:
            sub_category_list.append(book_row['book']['sub_category'])
        category_list.append(book_row['book']['category'])
        subcategory_list.append(book_row['book']['sub_category'])
        book_title_list.append(
            book_row['book']['title']
        )
        local_check_duplicate = []
        for book_n_row in book_row['book_numbers']:
            book_number = book_n_row['book_number']
            if book_number in book_number_list or book_number in local_check_duplicate:
                duplicate_book_number_list.append(book_number)
            local_check_duplicate.append(book_number)
            book_number_list.append(book_number)
    subcategory_data = BookSubCategory.objects.filter(id__in=list(set(sub_category_list))).values()
    category_subcategory_mapping = {}
    for sub_category in subcategory_data:
        if sub_category['category_id'] not in category_subcategory_mapping:
            category_subcategory_mapping[sub_category['category_id']] = []
        category_subcategory_mapping[sub_category['category_id']].append(sub_category['id'])
    existing_book_list = Book.objects.filter(title__in=book_title_list).values('title', 'category', 'sub_category', 'id')
    book_copy_list = {book_c['book_number'] for book_c in BookCopy.objects.filter(book_number__in=book_number_list).values()}
    existing_book_mapping = {}
    for book in existing_book_list:
        if not book['category']:
            book['category'] = None
        if not book['sub_category']:
            book['sub_category'] = None
        if book['category'] not in existing_book_mapping:
            existing_book_mapping[book['category']] = {}
        if book['sub_category'] not in existing_book_mapping[book['category']]:
            existing_book_mapping[book['category']][book['sub_category']] = {}
        existing_book_mapping[book['category']][book['sub_category']][book['title']] = book
    for index, book_row in enumerate(data_list):
        category = book_row['book']['category']
        sub_category = book_row['book']['sub_category']
        book_edit_id = book_row['book']['id'] if 'id' in book_row['book'] and book_row['book']['id'] else False
        if sub_category and (category not in category_subcategory_mapping or sub_category not in category_subcategory_mapping[category]):
            if index not in error_list:
                error_list[index] = []
            error_list[index].append({
                'error': 'subcategory not inside the category in configuration'
            })
        if category not in category_sub_category_book_mapping:
            category_sub_category_book_mapping[category] = {}
        if sub_category not in category_sub_category_book_mapping[category]:
            category_sub_category_book_mapping[category][sub_category] = {}
        if book_row['book']['title'] in category_sub_category_book_mapping[category][sub_category]:
            if index not in error_list:
                error_list[index] = []
            error_list[index].append({'error': f'{book_row["book"]["title"]} Duplicate title in given list'})
        # if category in existing_book_mapping and sub_category in existing_book_mapping[category] \
        #     and book_row['book']['title'] in existing_book_mapping[category][sub_category] and (
        #         not book_edit_id or (existing_book_mapping[category][sub_category][book_row['book']['title']]['id'] != book_edit_id)
        #     ):
        #     if index not in error_list:
        #         error_list[index] = []
        #     error_list[index].append({
        #         'error': f'{book_row["book"]["title"]} - Given title already exist'
        #     })
        # if not book_row['book_numbers']:
        #     if index not in error_list:
        #         error_list[index] = []
        #     error_list[index].append(
        #         {
        #             'error': 'book_numbers list should not be empty'
        #         }
        #     )
        for book_row1 in book_row['book_numbers']:
            book_number = book_row1['book_number']
            if str(book_number) in book_copy_list or book_number in duplicate_book_number_list:
                if index not in error_list:
                    error_list[index] = []
                error_list[index].append({
                    'error': f'{book_number} Given book number already exist'
                })
        category_sub_category_book_mapping[book_row['book']['category']][book_row['book']['sub_category']][book_row['book']['title']] = book_row['book']
        
    if error_list:
        raise exceptions.ValidationError(error_list)
"""
check category inside subcate
"""

#multiple book add 
def add_or_update_book(self, data_list):
    validate_book(self, data_list)
    with transaction.atomic(using=get_current_db_name()):
        for book_row in data_list:
            # book_branch_mapping_data_to_save = []
            # branch_ids = book_row['branch_ids'] if 'branch_ids' in book_row else []
            # existing_branch_mapping = {}
            if 'id' in book_row['book'] and book_row['book']['id']:
                book_serializer = BookSerilaizer(instance= Book.objects.get(id=book_row['book']['id']),data=book_row['book'])
                book_serializer.is_valid(raise_exception=True)
                book = book_serializer.save()
                # existing_branch_mapping = {b['branch'] : b for b in BookBranchMapping.objects.filter(
                #     book=book
                # ).values('branch')}
            else:
                book_serializer = BookSerilaizer(data=book_row['book'])
                book_serializer.is_valid(raise_exception=True)
                book = book_serializer.save()
            # for book_branch in branch_ids:
            #     if int(book_branch) in existing_branch_mapping:
            #         book_branch_mapping_data_to_save.append({
            #             'branch': book_branch,
            #             'book': book.id
            #         })
            book_row['book_detail']['book'] = book.id
            if 'id' in book_row['book_detail'] and book_row['book_detail']['id']:
                book_detail_serializer = BookDetailSerializer(instance=BookDetail.objects.get(id=book_row['book_detail']['id']),
                    data=book_row['book_detail'])
                book_detail_serializer.is_valid(raise_exception=True)
                book_detail_serializer.save()
            else:
                book_detail_serializer = BookDetailSerializer(data=book_row['book_detail'])
                book_detail_serializer.is_valid(raise_exception=True)
                book_detail_serializer.save()
            if 'authors' in book_row and book_row['authors']:
                author_data = []
                existing_book_author_mappign = BookAuthorMapping.objects.filter(
                    book=book.id
                ).values_list('author', flat=True)
                for author in list(set(book_row['authors'])):
                    if author not in existing_book_author_mappign:
                        author_data.append(
                            {
                                'book': book.id,
                                'author': author
                            }
                        )
                if author_data:
                    book_auth_mapping = BookAuthorMappingSerializer(data=author_data, many=True)
                    book_auth_mapping.is_valid(raise_exception=True)
                    book_auth_mapping.save()
                if set(existing_book_author_mappign) - set(book_row['authors']):
                    BookAuthorMapping.objects.filter(book=book.id, author__in=list(
                        set(existing_book_author_mappign) - set(book_row['authors'])
                    )).delete()
            if 'book_numbers' in book_row and book_row['book_numbers']:
                book_number_data = []
                existing_book_number = {exis['book_number'] : exis for exis in BookCopy.objects.filter(
                    book=book.id
                ).values('book_number', 'id')}
                temp_book_number = []
                for book_no in book_row['book_numbers']:
                    if 'id' in book_no and book_no['id']:
                        if book_no['book_number'] in existing_book_number and existing_book_number[book_no['book_number']]['id'] != book_no['id']:
                            raise exceptions.ValidationError(f'Book number already exist for {book_no["book_number"]}')
                        book_number_data.append(
                            {
                                'id': book_no['id'],
                                'book': book.id,
                                'book_number': book_no['book_number'],
                                'bar_code': book_no['bar_code']
                            }
                        )
                    elif book_no['book_number'] not in existing_book_number:
                        book_number_data.append(
                            {
                                'book': book.id,
                                'book_number': book_no['book_number'],
                                'bar_code': book_no['bar_code']
                            }
                        )
                    if book_no['book_number'] in temp_book_number:
                        raise exceptions.ValidationError(f'Duplicate book number - {book_no["book_number"]}')
                    temp_book_number.append(book_no['book_number'])
                if book_number_data:
                    book_copy_serializer = BookCopySerializer(data=book_number_data, many=True)
                    book_copy_serializer.is_valid(raise_exception=True)
                    book_copy_serializer.save()
            if 'deletable_book_copy_ids' in book_row and book_row['deletable_book_copy_ids']:
                if book_row['deletable_book_copy_ids']:
                    BookCopy.objects.filter(id__in=book_row['deletable_book_copy_ids']).update(is_active=False)
            # if book_branch_mapping_data_to_save:
            #     ser = BookBranchMappingSerializer(data=book_branch_mapping_data_to_save, many=True)
            #     ser.is_valid(raise_exception=True)
            #     ser.save()
    return {'Reason': 'Data Added Successfully'}

def get_book_details(self):
    category = self.request.GET.get('category')
    sub_category = self.request.GET.get('sub_category')
    search = self.request.GET.get('search')
    download_data = self.request.GET.get('download_data', None)
    pageno = int(self.request.GET.get('pageno', 1))
    limit = int(self.request.GET.get('limit', 10))
    filter_query = {}
    query = Q()
    if category:
        filter_query['category'] = category
    if sub_category:
        filter_query['sub_category'] = sub_category
    if search:
        query = Q(title__icontains=search) | Q(sub_title__icontains=search) | \
                Q(category__name__icontains=search) | Q(sub_category__name__icontains=search)
    data = Book.objects.filter(query, **filter_query).values(
        'title', 'sub_title', 'price', 'category__name', 'sub_category__name', 'publisher__name',
        'category', 'sub_category', 'publisher', 'id'
    )
    if not download_data:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, data, limit, pageno)
    else:
        count, next_page, previous_page = len(data), None, None
    book_ids = [row['id'] for row in data]
    book_copy_data = BookCopy.objects.filter(book__in=book_ids).values('book')
    book_copy_count_mapping = {}
    for book_copy in book_copy_data:
        book_id = book_copy['book']
        if book_id not in book_copy_count_mapping:
            book_copy_count_mapping[book_id] = {'count': 0}
        book_copy_count_mapping[book_id]['count'] += 1
    for row in data:
        row['number_of_copies'] = book_copy_count_mapping.get(row['id'], {}).get('count', 0)
    if download_data:
        export_data = [
            {
                'Title': row['title'],
                'Subtitle': row['sub_title'],
                'Category': row['category__name'],
                'Sub Category': row['sub_category__name'],
                'Publisher': row['publisher__name'],
                'Price': row['price'],
                'Number of Copies': row['number_of_copies']
            }
            for row in data
        ]
        start_long_running_process(self)
        SharedService.custom_thread(download_book_titles_list, self, export_data)
        return {'Reason': 'Data Added Successfully'}
    return {
        'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}
    }

def download_book_titles_list(self, book_data):
    try:
        options = {
            'title': 'Library Book Details',
            'description': 'Detailed report of book inventory in library',
            'Data': book_data,
            'columns': [
                {'column': 'Title', 'required': False, 'schemacolumn': 'Title'},
                {'column': 'Subtitle', 'required': False, 'schemacolumn': 'Subtitle'},
                {'column': 'Category', 'required': False, 'schemacolumn': 'Category'},
                {'column': 'Sub Category', 'required': False, 'schemacolumn': 'Sub Category'},
                {'column': 'Publisher', 'required': False, 'schemacolumn': 'Publisher'},
                {'column': 'Price', 'required': False, 'schemacolumn': 'Price'},
                {'column': 'Number of Copies', 'required': False, 'schemacolumn': 'Number of Copies'},
            ]
        }
        file_name = 'book_details_list.xlsx'
        transaction_id = self.request.GET.get('transaction_id')
        response = write_to_excel_new(self, options)
        if response.status_code == 200:
            with open(file_name, 'wb') as file:
                file.write(response.content)
            url = UploadTypeService.upload_local_file(file_name, path='temp/BookTitleReports')
            if os.path.exists(file_name):
                os.remove(file_name)
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})

    except Exception as e:
        if self.request.GET.get('long_running_process'):
            store_long_running_process(self, transaction_id, {'error': str(e)[:250]})
        else:
            raise e


def get_book_complete_detail(self):
    response = SharedService.read_data(self)
    response['data']['number_of_copies'] = BookCopy.objects.filter(is_active=True, book=self.kwargs['pk']).count()
    return response
    
def download_library_issue_return(self, data, file_name, extra_columns=[]):
    multiple_data = []
    options={}
    options['title'] = f'{file_name}'
    options['description'] = f'{file_name}'
    options['extraWorksheet'] = False
    options['Data'] = data
    options['extraWorksheetData'] = dict()
    options['columns'] = [
        {
            'column': 'SL NO', 'required': False, 'schemacolumn': 'sl_no'
        },
        {
            'column': 'Book Number', 'required': False, 'schemacolumn': 'book_copy_data.book_number'
        },
        {
            'column': 'Book Title', 'required': False, 'schemacolumn': 'book_copy_data.book__title'
        },
        {
            'column': 'User Type', 'required': False, 'schemacolumn': 'issued_to_user_data.user_type'
        },
        {
            'column': 'User Detail',  'required': False, 'schemacolumn': 'issued_to_user_data.name'
        },
        {
            'column': 'Standard', 'required': False, 'schemacolumn':'issued_to_user_data.standard'
        },
        {
            'column': 'Mobile Number', 'required': False, 'schemacolumn':'issued_to_user_data.mobile_num'
        },
         {
            'column': 'Issued Date', 'required': False, 'schemacolumn': 'issued_at'
        },
         {
            'column': 'Due Date',  'required': False, 'schemacolumn': 'due_date'
        },
        {
            'column': 'Returned Date',  'required': False, 'schemacolumn': 'returned_at'
        },
        {
            'column': 'Book Status',  'required': False, 'schemacolumn': 'status'
        }
    ]
    sl_no = 0
    for row_data in data:
        sl_no += 1
        row_data['sl_no'] = sl_no
    return write_to_excel_new(self, options)

def issue_return_book_list(self, extra_params={}):
    try:
        search_value = extra_params['search'] if 'search' in extra_params else self.request.GET.get('search')
        is_issued_only = extra_params['is_issued_only'] if 'is_issued_only' in extra_params else self.request.GET.get('is_issued_only')
        is_returned_only = extra_params['is_returned_only'] if 'is_returned_only' in extra_params else self.request.GET.get('is_returned_only')
        is_renewed_only = extra_params['is_renewed_only'] if 'is_renewed_only' in extra_params else self.request.GET.get('is_renewed_only')
        issued_to_user = extra_params['issued_to_user'] if 'issued_to_user' in extra_params else self.request.GET.get('issued_to_user')
        issued_by_user = extra_params['issued_by_user'] if 'issued_by_user' in extra_params else self.request.GET.get('issued_by_user')
        returned_by_user = extra_params['returned_by_user'] if 'returned_by_user' in extra_params else self.request.GET.get('returned_by_user')
        due_date_from_range = extra_params['due_date_from_range'] if 'due_date_from_range' in extra_params else self.request.GET.get('due_date_from_range')
        due_date_to_range = extra_params['due_date_to_range'] if 'due_date_to_range' in extra_params else self.request.GET.get('due_date_to_range')
        category = extra_params['category'] if 'category' in extra_params else self.request.GET.get('category')
        subcategory = extra_params['sub_category'] if 'sub_category' in extra_params else self.request.GET.get('sub_category')
        # Default -modified so renewals (which touch modified) sort to the top
        ordering = extra_params['ordering'].split(',') if 'ordering' in extra_params and extra_params['ordering'] else ['-modified']
        user_type = extra_params['user_type'] if 'user_type' in extra_params else self.request.GET.get('user_type')
        status_param = extra_params['status'] if 'status' in extra_params else self.request.GET.get('status')
        status_list = [int(status) for status in status_param.split(',')] if status_param else []
        status_conditions = Q()
        if 2 in status_list:  # Returned
            status_conditions |= Q(is_returned=True, renew_issue_return_book__isnull=True)
        if 3 in status_list:  # Not Returned
            status_conditions |= Q(is_issued=True, is_returned=False, renew_issue_return_book__isnull=True)
        if 4 in status_list:  # Renewed
            status_conditions |= Q(renew_issue_return_book__isnull=False, is_returned=False)
        transaction_id = self.request.GET.get('transaction_id')
        filter_query = Q(is_active=True) & status_conditions
        if search_value:
            search_filter = (
                Q(book_copy__book_number__icontains=search_value) |
                Q(issued_to_user__student__first_name__icontains=search_value) |
                Q(issued_to_user__student__last_name__icontains=search_value) |
                Q(issued_to_user__staff__first_name__icontains=search_value) |
                Q(issued_to_user__staff__last_name__icontains=search_value)
            )
            filter_query &= search_filter

        if issued_to_user:
            filter_query &= Q(issued_to_user=issued_to_user)
        if issued_by_user:
            filter_query &= Q(issued_by_user=issued_by_user)
        if returned_by_user:
            filter_query &= Q(returned_by_user=returned_by_user)
        if due_date_from_range and due_date_to_range:
            filter_query &= Q(due_date__range=(due_date_from_range, due_date_to_range))
        if category:
            filter_query &= Q(book_copy__book__category=category)
        if subcategory:
            filter_query &= Q(book_copy__book__sub_category=subcategory)
        if user_type == 'student':
            filter_query &= Q(issued_to_user__student__isnull=False)
        elif user_type == 'staff':
            filter_query &= Q(issued_to_user__staff__isnull=False)
        queryset = IssueReturnBook.objects.filter(filter_query).values('id').distinct()
        unique_issue_books = IssueReturnBook.objects.filter(id__in=[entry['id'] for entry in queryset]).order_by(*ordering)
        serializer = self.get_serializer(unique_issue_books, many=True)
        # if not self.request.GET.get('long_running_process'):
        #     data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
        #                                                                             self.request.GET.get('limit'),
        #                                                                             self.request.GET.get('pageno'))
        #     response = {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
        # else:
        response = {'data': {'data_list': serializer.data}}
        book_copy_ids = []
        user_ids = []
        assigned_configuration_ids = []
        issued_returned_ids = []
        for row_data in response['data']['data_list']:
            book_copy_ids.append(row_data['book_copy'])
            user_ids.append(row_data['issued_to_user'])
            user_ids.append(row_data['issued_by_user'])
            user_ids.append(row_data['returned_by_user'])
            assigned_configuration_ids.append(row_data['assigned_configuration'])
            issued_returned_ids.append(row_data['id'])
        renewed_book_data = {}
        renewed_book_data = {Renew['issue_return_book']: '' for Renew in Renew.objects.filter(is_active=True, issue_return_book__in=issued_returned_ids).values('issue_return_book')}
        book_copy_data = {book_copy['id'] : book_copy for book_copy in BookCopy.objects.filter(
            id__in=book_copy_ids
        ).values(
            'book_number', 'book__title', 'book__sub_title', 'book__category__name',
            'book__sub_category__name', 'book__publisher', 'bar_code', 'rack', 'id'
        )}
        user_data = {user['id']: user for user in User.objects.filter(
            id__in=user_ids
        ).values(
            'student', 'staff', 'student', 'student__first_name', 'student__middle_name','student__current_standard__name',
            'student__last_name', 'staff__first_name', 'staff__middle_name', 'staff__last_name',
            'id', 'student__mobile_num', 'staff__mobile_num', 'staff__designation',
        )}
        assigned_config_data = {lib_config['id'] : lib_config for lib_config in LibraryConfiguration.objects.filter(
            id__in=assigned_configuration_ids
        ).values(
            'return_within_days', 'number_of_books_per_user', 'fine_amount', 'fine_frequency_in_minutes', 'max_fine_amount',
            'id'
        )}
        def return_user_details(user_data):
            temp = {
                'name': '',
                'mobile_num': '',
                'standard':'',
                'designation':'',
                'user_type': 'Student' if user_data['student'] else 'Staff'       
            }
            if user_data['student']:
                temp['name'] = get_full_name(user_data['student__first_name'], user_data['student__middle_name'], user_data['student__last_name'])
                temp['standard']=user_data['student__current_standard__name']
                temp['mobile_num']=user_data['student__mobile_num']
            elif user_data['staff']:
                temp['name'] = get_full_name(user_data['staff__first_name'], user_data['staff__middle_name'], user_data['staff__last_name'])
                temp['mobile_num']=user_data['staff__mobile_num']
                temp['designation']=user_data['staff__designation']
            return temp
        for row_data in response['data']['data_list']:
            row_data['book_copy_data'] = {}
            row_data['issued_by_user_data'] = {}
            row_data['issued_to_user_data'] = {}
            row_data['returned_by_user_data'] = {}
            row_data['assigned_configuration_data'] = {}
            if row_data['book_copy'] in book_copy_data:
                row_data['book_copy_data'] = book_copy_data[row_data['book_copy']]
            if row_data['issued_by_user'] in user_data:
                row_data['issued_by_user_data'] = return_user_details(user_data[row_data['issued_by_user']])
            if row_data['issued_to_user'] in user_data:
                row_data['issued_to_user_data'] = return_user_details(user_data[row_data['issued_to_user']])
            if row_data['returned_by_user'] in user_data:
                row_data['returned_by_user_data'] = return_user_details(user_data[row_data['returned_by_user']])
            if row_data['assigned_configuration'] in assigned_config_data:
                row_data['assigned_configuration_data'] = assigned_config_data[row_data['assigned_configuration']]
            if row_data['is_issued']:
                row_data['status'] = 'Issued'
            if row_data['is_returned']:
                row_data['status'] = 'Returned'
            if row_data['id'] in renewed_book_data:
                row_data['status'] = 'Renewed'
                if row_data.get('modified') and row_data.get('issued_at'):
                    modified_time = datetime.fromisoformat(row_data['modified'])
                    issued_at_time = datetime.fromisoformat(row_data['issued_at'])
                if 4 not in status_list:
                    if modified_time > issued_at_time:
                        row_data['issued_at'] = modified_time.isoformat()
                if 4 in status_list:
                    row_data['renewed_at'] = modified_time.isoformat()
        if '-modified' in ordering:
            response['data']['data_list'].sort(
                key=lambda x: x.get('modified') or '', reverse=True
            )
        elif len(ordering) == 1 and ordering[0] == 'modified':
            response['data']['data_list'].sort(
                key=lambda x: x.get('modified') or '', reverse=False
            )
        elif '-issued_at' in ordering and 4 not in status_list:
            response['data']['data_list'].sort(key=lambda x: x['issued_at'], reverse=True)
        elif 'issued_at' in ordering and '-issued_at' not in ordering and 4 not in status_list:
            response['data']['data_list'].sort(key=lambda x: x['issued_at'])
        elif 4 in status_list:
            response['data']['data_list'].sort(key=lambda x: x['renewed_at'],reverse = True)
        if self.request.GET.get('long_running_process'):
            file_name = 'issue_return_list.xlsx'
            flattened_list = SharedService.flatten_list_of_dicts(response['data']['data_list'])
            for row_data in flattened_list:
                if row_data.get('due_date'):
                    due_time = datetime.fromisoformat(row_data['due_date'])
                    row_data['due_date'] = due_time.strftime('%d-%m-%Y %H:%M') 

                if row_data.get('issued_at'):
                    issued_at_time = datetime.fromisoformat(row_data['issued_at'])
                    row_data['issued_at'] = issued_at_time.strftime('%d-%m-%Y %H:%M') 

                if row_data.get('returned_at'):
                    returned_at_time = datetime.fromisoformat(row_data['returned_at'])
                    row_data['returned_at'] = returned_at_time.strftime('%d-%m-%Y %H:%M')
            response = download_library_issue_return(self, flattened_list, file_name)
            if response.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                filename = file_name
                url = UploadTypeService.upload_local_file(filename, path='IssueReturnReports')
                if os.path.exists(file_name):
                    os.remove(file_name)
                store_long_running_process(self, transaction_id,{'url': url})
        else:
            data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data']['data_list'],
                                                                                    self.request.GET.get('limit'),
                                                                                    self.request.GET.get('pageno'))
            response = {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
            return response
    except Exception as e:
        if self.request.GET.get('long_running_process'):
            store_long_running_process(self, transaction_id,{'error': e.args[:250]})
        else:
            raise e

def update_vendor_data(self, data, filters, **kwargs):
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_vendor_data(self, filters):
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def update_membership_data(self,data):
    enable_user_ids = data['enabled_user_ids'] if 'enabled_user_ids' in data else []
    disable_user_ids = data['disabled_user_ids'] if 'disabled_user_ids' in data else[]
    if enable_user_ids:
        already_enabled_user_ids = LibraryMembership.objects.filter(user__in=enable_user_ids, is_active=True).values_list('user', flat=True)
        enable_user_ids =  set(enable_user_ids) - set(already_enabled_user_ids)
    if disable_user_ids:
        already_disable_user_ids = LibraryMembership.objects.filter(user__in=enable_user_ids, is_active=True).values_list('user', flat=True)
        disable_user_ids =  set(disable_user_ids) - set(already_disable_user_ids)
    if not enable_user_ids and not disable_user_ids:
        raise exceptions.ValidationError('No Matching Data Found / Nothing to Update')
    data_to_save = []
    for user in enable_user_ids:
        data_to_save.append({
            'user_id': user, 'from_date': datetime.today(),
        })
    with transaction.atomic(using=get_current_db_name()):
        if data_to_save:
            ser = LibraryMembershipSerializer(data=data_to_save, many=True)
            ser.is_valid(raise_exception=True)
            ser.save()
        for user in disable_user_ids:
            LibraryMembership.objects.filter(user_id=user).update(to_date=datetime.now(), is_active=False)
    return {'Reason': 'Data Updated Successfully'}
    

def get_library_user_attendance(self):
    from_date = self.request.GET.get('from_date')
    to_date = self.request.GET.get('to_date')
    visited_type = self.request.GET.get('visited_type')
    limit = self.request.GET.get('limit')
    pageno = self.request.GET.get('pageno')
    order_by = self.request.GET.get('ordering', '-fordate_time')
    filter_query = {}
    if from_date and to_date:
        filter_query['from_date'] = from_date + ' 00:00:00'
        filter_query['to_date'] = to_date + ' 00:00:00'
    if visited_type:
        filter_query['visited_type'] = visited_type
    if self.request.user.staff: #only filtering student data for now
        standard_ids =  StaffStandardMapping.objects.filter(staff=self.request.user.staff).values_list('standard', flat=True)
        user_ids = Student.objects.filter(current_standard__in=standard_ids).values_list('user_student', flat=True)
        filter_query['user__in'] = user_ids
    lib_queryset = LibraryUserAttendance.objects.filter(**filter_query).order_by(order_by)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, lib_queryset, limit, pageno)
    data = LibraryUserAttendanceReadSerializer(data, many=True).data
    student_ids = []
    for row_data in data:
        if row_data['user']['student'] and row_data['user']['student']:
            student_ids.append(row_data['user']['student']['id'])
    student_admission_num_history = get_student_admission_form_details(self, student_ids)
    for row_data in data:
        if row_data['user']['student'] and row_data['user']['student'] and row_data['user']['student']['id'] in student_admission_num_history:
            row_data['admission_num'] = student_admission_num_history[row_data['user']['student']['id']]['admission_num']
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}


def library_user_attendance(self, data):
    is_staff = False
    data_to_update = []
    data['visited_type'] = 1
    for_date = datetime.strptime(data['fordate_time'], "%Y-%m-%d %H:%M:%S").date()
    if 'for_date' in data and data['for_date']:
        for_date = data['for_date']
    bar_code = data['bar_code'] if 'bar_code' in data and data['bar_code'] else None
    if bar_code:
        try:
            user_obj = User.objects.get(barcode_number=data['bar_code'])
            data['user_id'] = user_obj.id
            if user_obj.is_staff:
                is_staff = True
        except Exception as e:
            raise exceptions.ValidationError('Invalid Bar Code')
    if not is_staff:
        try:
            LibraryMembership.objects.filter(user=data['user_id'], is_active=True)
        except:
            raise exceptions.ValidationError('The user is not a member of the library')
    
    todays_attendance = LibraryUserAttendance.objects.filter(is_active=True,fordate_time__date=for_date, user=data['user_id']).order_by('-fordate_time')
    if not todays_attendance.exists():
        # First entry - Check-in
        data['visited_type'] = 1
    else:
        # Alternate between check-in (1) and check-out (2)
        last_visit = todays_attendance.first()
        if last_visit.visited_type == 1:
            data['visited_type'] = 2  # Last was check-in, so now it's check-out
        else:
            data['visited_type'] = 1  # Last was check-out, so now it's check-in
    data_to_save = {
        'fordate_time': data['fordate_time'],
        'visited_type': data['visited_type'],
        'user': data['user_id']
    }
    with transaction.atomic(using=get_current_db_name()):
        ser = LibraryUserAttendanceSerializer(data=data_to_save)
        ser.is_valid(raise_exception=True)
        ser.save()
        # for update_data in data_to_update:
        #     LibraryUserAttendance.objects.filter(id=update_data['id']).update(visited_type=update_data['visited_type'])
    return {'Reason': 'Data Added Succesfully'}

def get_library_dashboard(self, data):
    category = data['category'] if 'category' in data else None
    sub_category = data['sub_category'] if 'sub_category' in data else None
    today = datetime.today().date().strftime('%Y-%m-%d')
    for_date = data['for_date'] if 'for_date' in data else today
    for_date_with_time = for_date + ' 23:59:59'
    total_result_value = 5
    return_data = {'basic_details': {}, 'book_statastic_details': {}}
    return_data['basic_details']['books_count'] = 0
    return_data['basic_details']['book_copy_count'] = 0
    book_copy_filter = {'is_active': True}
    if category is not None:
        book_copy_filter['book__category'] = category
    if sub_category is not None:
        book_copy_filter['book__sub_category'] = sub_category
    book_copy = BookCopy.objects.filter(**book_copy_filter).values('book', 'id')
    book_mapping = {}
    book_copy_ids = []
    for book_row in book_copy:
        return_data['basic_details']['book_copy_count'] += 1
        book_mapping[book_row['book']] = 1
        book_copy_ids.append(book_row['id'])
    author_filter = {'is_active':True}
    publisher_filter = {'is_active': True}
    if category is not None:
        author_ids = BookAuthorMapping.objects.filter(book__in=book_mapping.keys()).values_list('author', flat=True)
        return_data['basic_details']['author_count'] = len(set(list(author_ids)))
        publisher_ids = set(Book.objects.filter(id__in=book_mapping.keys()).values_list('publisher', flat=True))
        return_data['basic_details']['publisher_count'] = len(publisher_ids)
    else:
        return_data['basic_details']['author_count'] = Author.objects.filter(**author_filter).count()
        return_data['basic_details']['publisher_count']  = Publisher.objects.filter(**publisher_filter).count()

    return_data['basic_details']['books_count'] = len(book_mapping.keys())
    issue_return_ids = []
    issue_return_filter = {
        'is_active': True,
        'book_copy__in': book_copy_ids
    }
    issue_return_data = IssueReturnBook.objects.filter(**issue_return_filter).values(
        'book_copy_id','is_issued','issued_to_user_id','issued_at','returned_at',
        'is_returned','issued_by_user_id','returned_by_user_id','remark_on_issue',
        'remark_on_return','for_date','due_date','is_active','transaction_id',
        'assigned_configuration_id', 'id', 'issued_to_user__student', 'issued_to_user__staff'
    )
    return_data['book_statastic_details'] = {
    'issued_books': {'staffs': {'count': 0}, 'students': {'count': 0}},
    'returned_books': {'staffs': {'count': 0}, 'students': {'count': 0}},
    'renewed_books': {'staffs': {'count': 0}, 'students': {'count': 0}},
    'upcoming_book_return': []
    }
    issued_to_user_counts = {
        'staffs': 0,
        'students': 0
    }
    issue_return_ids = []
    for issue_return in issue_return_data:
        issue_return_ids.append(issue_return['id'])
        if issue_return['is_issued'] and not issue_return['is_returned']:
            if issue_return['issued_to_user__staff']:
                issued_to_user_counts['staffs'] += 1
            elif issue_return['issued_to_user__student']:
                issued_to_user_counts['students'] += 1
        if issue_return['is_returned'] and issue_return['returned_at']:
            if issue_return['issued_to_user__staff']:
                return_data['book_statastic_details']['returned_books']['staffs']['count'] += 1
            elif issue_return['issued_to_user__student']:
                return_data['book_statastic_details']['returned_books']['students']['count'] += 1
    library_renew_data = Renew.objects.filter(
        issue_return_book__in=issue_return_ids,
        issue_return_book__book_copy__in=book_copy_ids,
        is_active=True
    ).values(
        'issue_return_book', 'id', 'issue_return_book__is_issued', 
        'issue_return_book__is_returned', 'issue_return_book__issued_to_user__student',
        'issue_return_book__issued_to_user__staff'
    )

    renewed_books_count_staff = 0
    renewed_books_count_students = 0
    renewed_issue_return_ids = set() 
    for renew in library_renew_data:
        if renew['issue_return_book__is_issued'] and not renew['issue_return_book__is_returned']:
            issue_return_book_id = renew['issue_return_book']
            if issue_return_book_id not in renewed_issue_return_ids:
                renewed_issue_return_ids.add(issue_return_book_id)
                if renew['issue_return_book__issued_to_user__staff']:
                    renewed_books_count_staff += 1
                elif renew['issue_return_book__issued_to_user__student']:
                    renewed_books_count_students += 1
    issued_books_count_staff = sum(
        1 for issue_return in issue_return_data 
        if issue_return['id'] not in renewed_issue_return_ids and issue_return['is_issued'] and not issue_return['is_returned'] and issue_return['issued_to_user__staff']
    )
    issued_books_count_students = sum(
        1 for issue_return in issue_return_data 
        if issue_return['id'] not in renewed_issue_return_ids and issue_return['is_issued'] and not issue_return['is_returned'] and issue_return['issued_to_user__student']
    )
    return_data['book_statastic_details']['issued_books']['staffs']['count'] = issued_books_count_staff
    return_data['book_statastic_details']['issued_books']['students']['count'] = issued_books_count_students
    return_data['book_statastic_details']['renewed_books']['staffs']['count'] = renewed_books_count_staff
    return_data['book_statastic_details']['renewed_books']['students']['count'] = renewed_books_count_students
    upcoming_book_return = IssueReturnBook.objects.filter(
        is_returned=False, is_active=True, due_date__gte=today,
        book_copy__in=book_copy_ids
    ).order_by('due_date').values(
        'issued_to_user', 'issued_to_user__staff__first_name',
        'issued_to_user__staff__middle_name', 'issued_to_user__staff__last_name',
        'issued_to_user__student__first_name', 'issued_to_user__student__middle_name', 
        'issued_to_user__student__last_name', 'issued_to_user__student',
        'issued_to_user__staff', 'due_date'
    )[:total_result_value]
    upcoming_book_return_data = []
    for upcoming in upcoming_book_return:
        temp = {}
        if upcoming['issued_to_user__staff']:
            temp = {'name': get_full_name(
                    upcoming['issued_to_user__staff__first_name'],
                    upcoming['issued_to_user__staff__middle_name'],
                    upcoming['issued_to_user__staff__last_name']
                ), 'due_date': upcoming['due_date']
            }
        elif upcoming['issued_to_user__student']:
            temp = {'name': get_full_name(
                        upcoming['issued_to_user__student__first_name'],
                        upcoming['issued_to_user__student__middle_name'],
                        upcoming['issued_to_user__student__last_name']
                    ), 'due_date': upcoming['due_date']
            }
        else:
            continue
        upcoming_book_return_data.append(temp)
    return_data['book_statastic_details']['upcoming_book_return'] = upcoming_book_return_data
    fine_payment_data = FinePaymentData.objects.filter(
            is_active=True, fine_fine_payment_data__issue_return_book__book_copy__in=book_copy_ids
        ).order_by('transaction_date').values(
        'receipt_num', 'mode_of_payment', 'transaction_date',
        'fine_fine_payment_data__amount', 'id',
    )[:total_result_value]
    fine_data_ids = [fine['id'] for fine in fine_payment_data]
    fine_data = Fine.objects.filter(fine_payment_data__in=fine_data_ids,issue_return_book__book_copy__in=book_copy_ids).values(
        'issue_return_book__issued_to_user__student__first_name',
        'issue_return_book__issued_to_user__student__middle_name',
        'issue_return_book__issued_to_user__student__last_name',
        'issue_return_book__issued_to_user__staff__first_name',
        'issue_return_book__issued_to_user__staff__middle_name',
        'issue_return_book__issued_to_user__staff__last_name',
        'issue_return_book__issued_to_user__is_staff',
        'fine_payment_data'
    )
    fine_data_mapping = {}
    for fine_row in fine_data:
        if fine_row['issue_return_book__issued_to_user__is_staff']:
            fine_row['name'] = get_full_name(fine_row['issue_return_book__issued_to_user__staff__first_name'],
                                             fine_row['issue_return_book__issued_to_user__staff__middle_name'],
                                             fine_row['issue_return_book__issued_to_user__staff__last_name'],
                                             )
        else:
            fine_row['name'] = get_full_name(fine_row['issue_return_book__issued_to_user__student__first_name'],
                                             fine_row['issue_return_book__issued_to_user__student__middle_name'],
                                             fine_row['issue_return_book__issued_to_user__student__last_name'],
                                             )
        fine_data_mapping[fine_row['fine_payment_data']] = fine_row
    return_fine_data = []
    for fine_payment_row_data in fine_payment_data:
        fine_payment_row_data['name'] = fine_data_mapping[fine_payment_row_data['id']]['name']
        return_fine_data.append(fine_payment_row_data)
    return_data['payment_data'] = {
        'fine_payment_data': return_fine_data
    }
    fine_filters = {
        "filters" : {
            "due_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        "pageno": 1,
        "limit": 10,
        "sorting": ["due_date"]
    }
    if category is not None:
        fine_filters['filters']['category'] = category
    if sub_category is not None:
        fine_filters['filters']['sub_category'] = sub_category
    fine_pending_list = library_fine_pending_list(self, fine_filters)['data']
    return_fine_pending_list = []
    for fine_pending in fine_pending_list:
        return_fine_pending_list.append({
            'issued_to_user': fine_pending['issued_to_user'],
            'due_date': fine_pending['due_date'],
            'for_date': fine_pending['for_date']
        })
    return_data['fine_pending_list'] = return_fine_pending_list
    return {'data': return_data}

def download_book_details(self, book_data):
    try:
        options = {
            'title': 'Library Book Copies Report',
            'description': 'Detailed report of book copies including issued status',
            'Data': book_data,
            'columns': [
                {'column': 'Book', 'required': False, 'schemacolumn': 'Book'},
                {'column': 'Book Number', 'required': False, 'schemacolumn': 'Book Number'},
                {'column': 'Bar Code', 'required': False, 'schemacolumn': 'Bar Code'},
                {'column': 'Rack', 'required': False, 'schemacolumn': 'Rack'},
                {'column': 'Title', 'required': False, 'schemacolumn': 'Title'},
                {'column': 'Subtitle', 'required': False, 'schemacolumn': 'Subtitle'},
                {'column': 'Category', 'required': False, 'schemacolumn': 'Category'},
                {'column': 'Sub Category', 'required': False, 'schemacolumn': 'Sub Category'},
                {'column': 'Publisher', 'required': False, 'schemacolumn': 'Publisher'},
                {'column': 'Price', 'required': False, 'schemacolumn': 'Price'},
                {'column': 'Is Issued', 'required': False, 'schemacolumn': 'Is Issued'},
            ]
        }
        file_name = 'book_copies_report.xlsx'
        transaction_id = self.request.GET.get('transaction_id')
        response = write_to_excel_new(self, options)
        if response.status_code == 200:
            with open(file_name, 'wb') as file:
                file.write(response.content)
            url = UploadTypeService.upload_local_file(file_name, path='temp/BookCopiesReports')
            if os.path.exists(file_name):
                os.remove(file_name)
            store_long_running_process(self, transaction_id, {'url': url})
        else:
            store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})

    except Exception as e:
        if self.request.GET.get('long_running_process'):
            store_long_running_process(self, transaction_id, {'error': str(e)[:250]})
        else:
            raise e