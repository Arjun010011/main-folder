from django.db import transaction
from apps.library.models.master import Author, Book, BookAuthorMapping, BookCopy, Publisher
from apps.library.models.vendor import LibraryVendor
from apps.shared.services import SharedService
from apps.store.serializers import VendorSerializer
from apps.tenants.services.middlewares import get_current_db_name

from apps.bdu.services.error import error_validation, common_response
from apps.library.serializers import AuthorSerializer, BookAuthorMappingSerializer, BookCopySerializer, BookDetailSerializer, BookSerilaizer, LibraryVendorSerializer, PublisherSerializer
from apps.library.services.master_services import add_or_update_book

def add_library_book(self, rows, alias, schemaColumnAlias):
    response = {'Reason': dict()}
    schema_rows = list()
    book_rows = {}
    publisher_rows = []
    vendor_rows = []
    book_detail_rows = {}
    # book_branch_mapping = {}
    book_copy_rows = {}
    book_author_rows = []
    author_name_book_title_mapping = {}
    author_id_book_title_mapping = {}
    given_book_title_list = []
    given_author_title_list = []
    publisher_name_list = []
    vendor_name_list = []
    vendor_name_list = []
    book_title_publisher_mapping = {}
    book_title_vendor_mapping = {}
    book_copy_book_numbers = []
    duplicate_book_number = {}
    duplicate_book_bar_number = {}
    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        error_dict = {index: {}}
        temp_author_name_list = list()
        temp_author_id_list = list()
        for key, value in row.items():
            temp_dict[alias[key]] = value
        if ('author1_name' in temp_dict and temp_dict['author1_name'] and 'author1_name' in temp_dict) and ('author1' in temp_dict and temp_dict['author1']):
            response = common_response(self, response, index, 'author1_name', 'Both author1 and author1_name should not be given.',
                                           error_dict)
        if ('author2_name' in temp_dict and temp_dict['author2_name'] and 'author2_name' in temp_dict) and ('author2' in temp_dict and temp_dict['author2']):
            response = common_response(self, response, index, 'author2_name', 'Both author2 and author2_name should not be given.',
                                           error_dict)
        if ('author3_name' in temp_dict and temp_dict['author3_name'] and 'author3_name' in temp_dict) and ('author3' in temp_dict and temp_dict['author3']):
            response = common_response(self, response, index, 'author3_name', 'Both author3 and author3_name should not be given.',
                                           error_dict)
        if ('author4_name' in temp_dict and temp_dict['author4_name'] and 'author4_name' in temp_dict) and ('author4' in temp_dict and temp_dict['author4']):
            response = common_response(self, response, index, 'author4_name', 'Both author4 and author4_name should not be given.',
                                           error_dict)
        if 'title' in temp_dict and temp_dict['title']:
            given_book_title_list.append(temp_dict['title'])
        if 'author1_name' in temp_dict and temp_dict['author1_name']:
            temp_author_name_list.append(temp_dict['author1_name'])
        if 'author2_name' in temp_dict and temp_dict['author2_name']:
            temp_author_name_list.append(temp_dict['author2_name'])
        if 'author3_name' in temp_dict and temp_dict['author3_name']:
            temp_author_name_list.append(temp_dict['author3_name'])
        if 'author4_name' in temp_dict and temp_dict['author4_name']:
            temp_author_name_list.append(temp_dict['author4_name'])
        if 'author1' in temp_dict and temp_dict['author1']:
            temp_author_id_list.append(temp_dict['author1'])
        if 'author2' in temp_dict and temp_dict['author2']:
            temp_author_id_list.append(temp_dict['author2'])
        if 'author3' in temp_dict and temp_dict['author3']:
            temp_author_id_list.append(temp_dict['author3'])
        if 'author4' in temp_dict and temp_dict['author4']:
            temp_author_id_list.append(temp_dict['author4'])
        if not temp_dict['book_number']:
            response = common_response(self, response, index, 'book_number', 'Book Number is mandatory',
                                           error_dict)
        if temp_dict['book_number'] in duplicate_book_number:
            response = common_response(self, response, index, 'book_number', 'Book Number is already exists',
                                           error_dict)
        if temp_dict['bar_code'] in duplicate_book_bar_number:
            response = common_response(self, response, index, 'common_response', 'Bar Code is already exists',
                                           error_dict)
        duplicate_book_number[temp_dict['book_number']] = {}
        duplicate_book_bar_number[temp_dict['bar_code']] = {}
        if temp_author_name_list:
            given_author_title_list += temp_author_name_list
        if 'publisher_name' in temp_dict and temp_dict['publisher_name']:
            publisher_name_list.append(temp_dict['publisher_name'])
            book_title_publisher_mapping[temp_dict['title'].upper()] = temp_dict['publisher_name'].upper()
        if 'vendor_name' in temp_dict and temp_dict['vendor_name']:
            vendor_name_list.append(temp_dict['vendor_name'])
            book_title_vendor_mapping[temp_dict['title'].upper()] = temp_dict['vendor_name'].upper()
        if 'vendor_name' in temp_dict and temp_dict['vendor_name']:
            vendor_name_list.append(temp_dict['vendor_name'])
        for temp_author_name in temp_author_name_list:
            author_name_book_title_mapping[temp_author_name.upper()] = temp_dict['title'].upper()
        for temp_author_id in temp_author_id_list:
            author_id_book_title_mapping[temp_author_id] = temp_dict['title'].upper()
        book_copy_book_numbers.append(temp_dict['book_number'])
    existing_books = {book['title'].upper() : book for book in Book.objects.filter(is_active=True, title__in=given_book_title_list).values()}
    existing_publishers = {pub['name'].upper() : pub for pub in Publisher.objects.filter(name__in=publisher_name_list).values()}
    existing_author = {auth['name'].upper() : auth for auth in Author.objects.filter(name__in=given_author_title_list).values()}
    existing_vendors = {ven['name'].upper() : ven for ven in LibraryVendor.objects.filter(name__in=vendor_name_list).values()}
    # book_copy_data = BookCopy.objects.filter(book_number__in=book_copy_book_numbers).values('book_number', 'id', 'bar_code')
    # existing_book_copy_data = {}
    # existing_book_row_data = {}
    # for book_copy in book_copy_data:
    #     existing_book_copy_data[book_copy['book_number']] = book_copy
    #     existing_book_row_data[book_copy['bar_code']] = book_copy

    for index, row in enumerate(rows, start=2):
        error_dict = {index: {}}
        temp_dict = dict()
        for key, value in row.items():
            temp_dict[alias[key]] = value
        book_fields = ['title', 'book_id', 'sub_title', 'price', 'category', 'sub_category', 'publisher', 'publisher_name', 'title_number']
        book_copy_fields = ['book_number', 'bar_code', 'rack', 'bill_date', 'bill_no', 'stock_date', 'title', 'book_id']
        book_author_fields = ['author1', 'author2', 'author3', 'author4','author1_name', 'author2_name', 'author3_name', 'author4_name']
        book_detail_fields = ['isbn', 'edition', 'remarks', 'bill_date', 'year_of_publication', 'title'] #ad
        if temp_dict['title'].upper() not in existing_books and temp_dict['title'] not in book_rows:
            # branch_ids = []
            for book_field in book_fields:
                if book_field in temp_dict:
                    if temp_dict['title'].upper() not in book_rows:
                        book_rows[temp_dict['title'].upper()] = {}
                    book_rows[temp_dict['title'].upper()].update({book_field: temp_dict[book_field] if temp_dict[book_field] != "" else None})
            for book_detail_field in book_detail_fields:
                if book_detail_field in temp_dict:
                    if temp_dict['title'].upper() not in book_detail_rows:
                        book_detail_rows[temp_dict['title'].upper()] = {}
                    book_detail_rows[temp_dict['title'].upper()].update({book_detail_field: temp_dict[book_detail_field] if temp_dict[book_detail_field] != "" else None})
            # if 'branch_ids' in temp_dict and temp_dict['branch_ids']:
            #     branch_ids = temp_dict.split(',')
            #     book_branch_mapping[temp_dict['title'].upper()].update({
            #         'branch': branch_ids, 'title': temp_dict['title']
            #     })
        for book_copy_field in book_copy_fields:
            if book_copy_field in temp_dict:
                if index not in book_copy_rows:
                    book_copy_rows[index] = {}
                book_copy_rows[index].update({book_copy_field: temp_dict[book_copy_field] if temp_dict[book_copy_field] != "" else None})
    for author in list(set(given_author_title_list)):
        if author.upper() not in existing_author:
            book_author_rows.append({'name': author})
    for publisher in list(set(publisher_name_list)):
        if publisher.upper() not in existing_publishers:
            publisher_rows.append({'name': publisher})
    for ven in list(set(vendor_name_list)):
        if ven.upper() not in existing_vendors:
            vendor_rows.append({'name': ven})
    if book_rows:
        book_serializer = BookSerilaizer(data=list(book_rows.values()), many=True, allow_null=False)
        book_serializer.is_valid()
        if book_serializer.errors: #nikhil check the index while showing the error
            response = error_validation(self, book_serializer.errors, schemaColumnAlias, response)
    book_copy_serializer = BookCopySerializer(data=list(book_copy_rows.values()), many=True, allow_null=False)
    book_copy_serializer.is_valid()
    if book_copy_serializer.errors: #nikhil check the index while showing the error
        response = error_validation(self, book_copy_serializer.errors, schemaColumnAlias, response)
    response = error_validation(self, book_copy_serializer.errors, schemaColumnAlias, response)
    #return serializer error differently
    publisher_serializer = author_serializer = None
    if publisher_rows:
        publisher_serializer = PublisherSerializer(data=publisher_rows, many=True)
        publisher_serializer.is_valid()
        if publisher_serializer.errors: #nikhil check the index while showing the error
            response = error_validation(self, publisher_serializer.errors, schemaColumnAlias, response)
    if book_author_rows:
        author_serializer = AuthorSerializer(data=book_author_rows, many=True)
        author_serializer.is_valid()
        if author_serializer.errors:
            response = error_validation(self, publisher_serializer.errors, schemaColumnAlias, response)
    if response['Reason']:
        response['error'] = True
        return response
    try:
        with transaction.atomic(using=get_current_db_name()):
            book_author_mapping = []
            book_data_to_save = []
            book_saved_data_title_mapping = {}
            # book_branch_data_to_save = []
            if publisher_rows:
                publisher_serializer = PublisherSerializer(data=publisher_rows, many=True)
                publisher_serializer.is_valid(raise_exception=True)
                publisher = publisher_serializer.save()
                for pub in publisher:
                    existing_publishers[pub.name.upper()] = {'id': pub.id}
            if vendor_rows:
                vendor_serializer = LibraryVendorSerializer(data=vendor_rows, many=True)
                vendor_serializer.is_valid(raise_exception=True)
                vendor = vendor_serializer.save()
                for ven in vendor:
                    existing_vendors[ven.name.upper()] = {'id': ven.id}
            for book_data in book_rows.values():
                if book_data['title'].upper() not in existing_books:
                    if book_data['title'].upper() in book_title_publisher_mapping:
                        book_data['publisher'] = existing_publishers[book_title_publisher_mapping[book_data['title'].upper()]]['id']
                    book_data_to_save.append(book_data)
            if book_data_to_save:
                book_serializer = BookSerilaizer(data=book_data_to_save, many=True)
                book_serializer.is_valid(raise_exception=True)
                book = book_serializer.save()
                for book_row in book:
                    existing_books[book_row.title.upper()] = {'id': book_row.pk}
                    book_saved_data_title_mapping[book_row.id] = book_row
            book_detail_to_save = {}
            for book_detail in book_detail_rows.values():
                book_id = existing_books[book_detail['title'].upper()]['id']
                if book_detail['title'] not in book_detail_to_save:
                    is_empty = True
                    for detail_row_key in book_detail:
                        if detail_row_key != 'title' and book_detail[detail_row_key] != '' and book_detail[detail_row_key] is not None:
                            is_empty = False
                    if not is_empty:
                        book_detail['book'] = book_id
                        book_detail_to_save[book_detail['title']] = book_detail
            # for book_branch in book_branch_mapping.values():
            #     book_id = existing_books[book_branch['title'].upper()]['id']
            #     if book_detail['title'] not in book_branch_mapping:
            #         book_branch_data_to_save[book_branch['title']] = 
            if book_detail_to_save:
                book_detail_serializer = BookDetailSerializer(data=list(book_detail_to_save.values()),many=True, allow_null=False)
                book_detail_serializer.is_valid(raise_exception=True)
                book_detail_serializer.save()
            author_ids = []
            if book_author_rows:
                author_serializer = AuthorSerializer(data=book_author_rows, many=True)
                author_serializer.is_valid(raise_exception=True)
                book_author = author_serializer.save()
                for bk_author in book_author:
                    existing_author[bk_author.name.upper()] = {'id': bk_author.id}
                    author_ids.append(bk_author.id)
            if given_author_title_list:
                existing_book_author_mapping = {str(book_auth['author_id'])+'_'+str(book_auth['book_id']): book_auth for book_auth in BookAuthorMapping.objects.filter(author__name__in=given_author_title_list).values('book_id', 'author_id')}
                for e_author in list(set(given_author_title_list)):
                    book_id = existing_books[author_name_book_title_mapping[e_author.upper()]]['id']
                    author_id = existing_author[e_author.upper()]['id']
                    temp_key = str(book_id) + '_' + str(author_id)
                    if temp_key not in existing_book_author_mapping:
                        book_author_mapping.append({
                            'book': book_id,
                            'author': author_id
                        })
                book_author_serializer = BookAuthorMappingSerializer(data=book_author_mapping, many=True)
                book_author_serializer.is_valid()
                book_author_serializer.save()
            book_copy_rows = book_copy_rows.values()
            for book_copy in book_copy_rows:
                book_copy['book'] = existing_books[book_copy['title'].upper()]['id']
            book_copy_serializer = BookCopySerializer(data=list(book_copy_rows),many=True, allow_null=False)
            book_copy_serializer.is_valid(raise_exception=True)
            book_copy_serializer.save()
    except Exception as e:
        response = common_response(self, response, 2, 'error', e.args, {2: {}})
        response['error'] = True
        return response
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response