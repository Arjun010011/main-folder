from re import L
from rest_framework.views import Response
from apps.library.models.attendance import LibraryUserAttendance
from apps.library.models.issue_return import IssueReturnBook, LibraryConfiguration
from django.db.models import Q

from apps.library.models.master import Author, Book, BookCategory, BookCopy, BookSubCategory, Publisher, Rack
from apps.library.models.stock_verification import StockVerification, StockVerificationParent
from apps.library.models.vendor import LibraryPurchaseMaster, LibraryVendor
from apps.library.serializers import (AuthorSerializer, BookCategorySerializer, BookCopySerializer, BookReadSerializer, BookSerilaizer, BookSubCategorySerializer, 
                                      IssueReturnBookSerializer, LibraryConfigurationReadSerializer, LibraryConfigurationSerializer, LibraryMembershipSerializer, 
                                      LibraryUserAttendanceSerializer, LibraryVendorSerializer, PublisherSerializer, RackSerializer, StockVerificationParentSerializer, StockVerificationSerializer)
from apps.library.services.issue_return_fine_book import handle_issue_return_data, search_book_and_user, renew_book
from apps.library.services.master_services import (
    add_or_update_book, create_library_configuration, delete_library_author,
    delete_library_category, delete_library_publisher, delete_library_rack, delete_sub_category_data, delete_vendor_data, get_accessible_lib_category_ids,
    get_book_complete_detail, get_book_details, get_library_configuration, get_library_dashboard, get_library_user_attendance, issue_return_book_list,
    libary_sub_category_update_data, library_add_author_data, library_add_publisher_data,
    library_add_sub_category, library_user_attendance, update_library_author, update_library_category,
    update_library_publisher, update_library_rack, update_membership_data, update_vendor_data)
from apps.library.services.reports import library_fine_pending_list, print_library_receipt, return_library_fine_paid_list
from apps.library.services.stock_verification import add_stock_verification, get_missing_sequence_report
from apps.shared.services import FormdefinitionService, SharedService
from rest_framework import viewsets, exceptions
from io import BytesIO
from barcode import Code128
from barcode.writer import ImageWriter
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from PIL import Image
from django.http import HttpResponse

from apps.shared.services_shared.store_api_result import start_long_running_process

class LibraryCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BookCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        filter_query = {'is_active':True}
        if not self.request.GET.get('show_all_category'):
            category_ids = get_accessible_lib_category_ids(self, None)
            if category_ids is not None:
                filter_query['id__in'] = category_ids
        self.queryset = BookCategory.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['category'], 'name')
        response = SharedService.add_data(self, request.data['category'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'book_sub_category_category__is_active': True, 'book_sub_category_category__isnull': False}
        response = update_library_category(self, request.data, filters, kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'book_sub_category_category__is_active': True, 'book_sub_category_category__isnull': False}
        response = delete_library_category(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibrarySubCategoryViewSet(viewsets.ModelViewSet):
    serializer_class = BookSubCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'category']

    def get_queryset(self):
        self.queryset = BookSubCategory.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = library_add_sub_category(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'book_sub_category__is_active': True, 'book_sub_category__isnull': False}
        response = libary_sub_category_update_data(self, request.data['sub_category'], filters, kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'book_sub_category__is_active': True, 'book_sub_category__isnull': False}
        response = delete_sub_category_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibraryAuthorViewSet(viewsets.ModelViewSet):
    serializer_class = BookSubCategorySerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'category']

    def get_queryset(self):
        self.queryset = BookSubCategory.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = library_add_sub_category(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'book_sub_category__is_active': True, 'book_sub_category__isnull': False}
        response = libary_sub_category_update_data(self, request.data['sub_category'], filters, kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'book_sub_category__is_active': True, 'book_sub_category__isnull': False}
        response = delete_sub_category_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibraryPublisherViewSet(viewsets.ModelViewSet):
    serializer_class = PublisherSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Publisher.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = library_add_publisher_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'book_publisher__is_active': True, 'book_publisher__isnull': False}
        response = update_library_publisher(self, request.data['publisher'], filters, kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'book_publisher__is_active': True, 'book_publisher__isnull': False}
        response = delete_library_publisher(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibraryAuthorViewSet(viewsets.ModelViewSet):
    serializer_class = AuthorSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Author.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = library_add_author_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_library_author(self, request.data['author'], kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_library_author(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibraryBookViewSet(viewsets.ModelViewSet):
    serializer_class = BookSerilaizer
    http_method_names = ['get', 'post']
    filterset_fields = ['is_active', 'category', 'sub_category', 'publisher']
    ordering_fields = ['title', 'sub_title', 'category__name', 'sub_category__name', 'publisher__name']

    def get_queryset(self):
        self.queryset = Book.objects.filter(is_active=True)
        return self.queryset
    
    def create(self, request, *args, **kwargs):
        response = add_or_update_book(self, request.data['book_list'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_book_details(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = BookReadSerializer
        response = get_book_complete_detail(self)
        return Response(response)

from apps.library.services.master_services import download_book_details
class LibraryCopyViewSet(viewsets.ModelViewSet):
    serializer_class = BookCopySerializer
    http_method_names = ['get']
    search_fields = ['book_number']
    ordering_fields = ['book_number']

    def list(self, request, *args, **kwargs):
        order_by = self.request.GET.get('ordering', '-id')
        category = self.request.GET.get('category')
        sub_category = self.request.GET.get('sub_category')
        book_id = self.request.GET.get('book')
        search = self.request.GET.get('search')
        download_data = self.request.GET.get('download_data', None)
        pageno = int(self.request.GET.get('pageno', 1))
        limit = int(self.request.GET.get('limit', 10))
        download_bar_code = self.request.GET.get('download_bar_code', False)

        category_ids = get_accessible_lib_category_ids(self, [category])
        filter_query = {'is_active': True}

        if category_ids is not None:
            filter_query['book__category__in'] = category_ids
        if sub_category:
            filter_query['book__sub_category'] = sub_category
        if book_id:
            filter_query['book'] = book_id

        q_query = Q()
        if search:
            q_query = Q(book__title__icontains=search) | Q(book__category__name__icontains=search) | Q(book_number__icontains=search)

        book_copy_list = BookCopy.objects.filter(q_query, **filter_query).values(
            'book', 'book_number', 'bar_code', 'rack', 'book__title', 'book__sub_title',
            'book__price', 'book__category__name', 'book__sub_category__name', 'book__publisher__name', 'id'
        ).order_by(order_by)

        if not download_data:
            data, count, next_page, previous_page = SharedService.custom_pagination(self, book_copy_list, limit, pageno)
        else:
            data = list(book_copy_list)
            count, next_page, previous_page = len(data), None, None

        book_copy_ids = [row['id'] for row in data]
        issued_books = IssueReturnBook.objects.filter(book_copy__in=book_copy_ids, is_issued=True, is_returned=False).values_list('book_copy_id', flat=True)
        
        for row_data in data:
            row_data['is_issued'] = row_data['id'] in issued_books

        if download_data:
            export_data = [
                {
                    'Book': row['book__title'],
                    'Book Number': row['book_number'],
                    'Bar Code': row['bar_code'],
                    'Rack': row['rack'],
                    'Title': row['book__title'],
                    'Subtitle': row['book__sub_title'],
                    'Category': row['book__category__name'],
                    'Sub Category': row['book__sub_category__name'],
                    'Publisher': row['book__publisher__name'],
                    'Price': row['book__price'],
                    'Is Issued': row_data['is_issued']
                }
                for row in data
            ]
            start_long_running_process(self)
            SharedService.custom_thread(download_book_details, self, export_data)
            return Response({'Reason': 'Data Added Successfully'})  
        elif download_bar_code:
            # Fetch barcodes only for selected or filtered books
            books = BookCopy.objects.filter(q_query, **filter_query).values(
                'id', 'book_number', 'bar_code', 'book__title', 'rack__name'
            ).order_by(order_by)

            # Create in-memory PDF
            buffer = BytesIO()
            p = canvas.Canvas(buffer, pagesize=A4)
            width, height = A4

            # Layout config
            x = 20 * mm
            y = height - 30 * mm
            label_width = 60 * mm
            label_height = 25 * mm
            margin_x = 10 * mm
            margin_y = 15 * mm
            labels_per_row = 3

            count = 0

            for book in books:
                bar_code = book.get('bar_code')
                if not bar_code:
                    continue  # Skip if no barcode

                # Generate barcode image
                barcode_buffer = BytesIO()
                barcode = Code128(bar_code, writer=ImageWriter())
                barcode.write(barcode_buffer)
                barcode_buffer.seek(0)

                # Convert to image for PDF placement
                img = Image.open(barcode_buffer)
                img_path = BytesIO()
                img.save(img_path, format="PNG")
                img_path.seek(0)

                # Draw barcode on PDF
                p.drawInlineImage(img_path, x, y - label_height, label_width, label_height)

                # Draw book info below the barcode
                p.setFont("Helvetica", 8)
                title = (book.get('book__title') or '')[:30]  # Limit long titles
                rack = book.get('rack__name') or ''
                p.drawString(x, y - label_height - 8, f"{title}")
                p.drawString(x, y - label_height - 15, f"Book#: {book['book_number']} | Rack: {rack}")

                # Move to next label
                count += 1
                if count % labels_per_row == 0:
                    x = 20 * mm
                    y -= label_height + margin_y
                else:
                    x += label_width + margin_x

                # Start a new page when space runs out
                if y < 40 * mm:
                    p.showPage()
                    x = 20 * mm
                    y = height - 30 * mm

            # Finalize and return PDF
            p.save()
            buffer.seek(0)

            response = HttpResponse(buffer, content_type='application/pdf')
            response['Content-Disposition'] = 'attachment; filename="book_barcodes.pdf"'
            return response
        return Response({
            'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}
        })


class IssueReturnBookViewSet(viewsets.ModelViewSet):
    serializer_class = IssueReturnBookSerializer
    http_method_names = ['post', 'get']

    def get_queryset(self):
        self.queryset = IssueReturnBook.objects.filter(
            is_active=True
        ).order_by('-created')
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = handle_issue_return_data(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(issue_return_book_list, self, request.GET.dict())
            return Response({'Result': True})
        else:
            response = response = issue_return_book_list(self, request.GET.dict())
            return Response(response)

class LibraryConfigurationViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryConfigurationSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        return LibraryConfiguration.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('config_for_student'):
            issuing_user_id = self.request.GET.get('issuing_user_id')
            academic_year =  self.request.GET.get('academic_year')
            response = get_library_configuration(issuing_user_id, academic_year)
            current_holding_books = IssueReturnBook.objects.filter(
                is_issued=True, is_returned=False, issued_to_user=issuing_user_id, is_active=True
            ).values('book_copy', 'due_date', 'remark_on_issue')
            response['current_holding_books'] = current_holding_books
        else:
            response = SharedService.read_data(self, True)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = LibraryConfigurationReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = create_library_configuration(self, request.data)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)
    
class BookAndUserSearchViewSet(viewsets.ModelViewSet):
    serializer_class = BookCopySerializer
    http_method_names = ['get']
    
    def get_queryset(self):
        return BookCopy.objects.all()

    def list(self, request):
        response = search_book_and_user(self)
        return Response(response)
    
class RenewBookViewSet(viewsets.ModelViewSet):
    serializer_class = IssueReturnBookSerializer
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        issue_return_datas = self.request.data.get('issue_return_datas')
        payment_details = None
        respone = renew_book(self,issue_return_datas,payment_details)
        return Response(respone)

class LibraryMembershipViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryMembershipSerializer
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = update_membership_data(self, request.data)
        return Response(response)

class LibraryVendorViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryVendorSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = LibraryVendor.objects.all()
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data['vendors'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'library_purchase_master_vendor__is_active': True, 'library_purchase_master_vendor__isnull': False}
        response = update_vendor_data(self, request.data, filters, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'library_purchase_master_vendor__is_active': True, 'library_purchase_master_vendor__isnull': False}
        response = delete_vendor_data(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)

class LibraryUserAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = LibraryUserAttendanceSerializer
    http_method_names = ['get', 'post', 'put']

    def get_queryset(self):
        self.queryset = LibraryUserAttendance.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = library_user_attendance(self, request.data)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return response

    def list(self, request, *args, **kwargs):
        if self.request.GET.get('long_running_process'):
            start_long_running_process(self)
            SharedService.custom_thread(get_library_user_attendance, self)
            return Response({'Result': True})
        else:
            response = get_library_user_attendance(self)
        return Response(response)

class LibraryDashboardViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = get_library_dashboard(self, request.data)
        return Response(response)
    
class LibraryReportViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post']

    def create(self, request, *args, **kwargs):
        response = library_fine_pending_list(self, request.data)
        return Response(response)
    
class LibraryFineViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['post' ,'get']

    def create(self, request, *args, **kwargs):
        response = return_library_fine_paid_list(self,request.data)
        return  Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = print_library_receipt(self, self.kwargs['pk'])
        return response
    
class LibraryRackViewSet(viewsets.ModelViewSet):
    serializer_class = RackSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        filter_query = {'is_active':True}
        self.queryset = Rack.objects.filter(**filter_query)
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def create(self, request, *args, **kwargs):
        SharedService.duplicate_list_one_object(request.data['racks'], 'name')
        response = SharedService.add_data(self, request.data['racks'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        filters = {'book_copy__isnull': False}
        response = update_library_rack(self, request.data, filters, kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filters = {'book_copy__isnull': False}
        response = delete_library_rack(self, filters)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)
    
class LibraryStockVerificationParentViewSet(viewsets.ModelViewSet):
    serializer_class = StockVerificationParentSerializer
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = StockVerificationParent.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        data_to_save = []
        for row_data in request.data['data_list']:
            row_data['created_by'] = self.request.user.id
            data_to_save.append(row_data)
        response = SharedService.add_data(self, data_to_save)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

class LibraryStockVerificationViewSet(viewsets.ModelViewSet):
    serializer_class = StockVerificationSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['stock_verification_parent']
    ordering_fields = ['created']

    def get_queryset(self):
        self.queryset = StockVerification.objects.filter(is_active=True).order_by('-created')
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_stock_verification(self, request.data)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def missing_sequence(self, request, *args, **kwargs):
        """Report missing book numbers in a start–end barcode sequence."""
        response = get_missing_sequence_report(request)
        return Response(response)


