from rest_framework import serializers
from apps.library.models.attendance import LibraryUserAttendance
from apps.library.models.issue_return import Fine, FinePaymentData, FineExempted, IssueReturnBook, LibraryConfiguration, StandardLibraryConfiguration, Renew
from apps.library.models.master import Author, Book, BookAuthorMapping, BookCategory, BookCopy, BookDetail, BookSubCategory, LibraryMembership, Publisher, Rack

from apps.library.models.stock_verification import StockVerification, StockVerificationParent
from apps.library.models.vendor import LibraryPurchaseMaster, LibraryVendor
from apps.shared.serializers import CustomUniqueValidator, DocumentUrlSerializer
from apps.shared.services_shared.common import get_full_name
from apps.staffs.models.staff import Staff
from apps.users.models.user import User
from apps.students.models.student import Student
from apps.users.serializers import UserReadSerializer


class RackSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Rack.objects.filter(is_active=True))])

    class Meta:
        model = Rack
        fields = '__all__'

class BookCategorySerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=BookCategory.objects.filter(is_active=True))])

    class Meta:
        model = BookCategory
        fields = '__all__'

class BookSubCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = BookSubCategory
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('name', 'category'),
                message='sub category is already exist(s) in the category.'
            )
        ]
        fields = '__all__'

class AuthorSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Author.objects.filter(is_active=True))])

    class Meta:
        model = Author
        fields = '__all__'

class PublisherSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=Publisher.objects.filter(is_active=True))])

    class Meta:
        model = Publisher
        fields = '__all__'


class BookSerilaizer(serializers.ModelSerializer):
    # title = serializers.CharField(validators=[CustomUniqueValidator(queryset=Book.objects.filter(is_active=True))])

    class Meta:
        model = Book
        fields = '__all__'

class BookDetailSerializer(serializers.ModelSerializer):

    class Meta:
        model = BookDetail
        fields = '__all__'

class BookAuthorMappingSerializer(serializers.ModelSerializer):
    
    class Meta:
        model  = BookAuthorMapping
        fields = '__all__'

class BookAuthorMappingReadSerializer(serializers.ModelSerializer):
    book_name = serializers.ReadOnlyField(source='book.name')
    author_name = serializers.ReadOnlyField(source='author.name')

    class Meta:
        model = BookAuthorMapping
        exclude = ['created', 'modified']

class BookReadSerializer(serializers.ModelSerializer):
    book_detail = BookDetailSerializer(read_only=True, source='book_detail_book')
    publisher_name = serializers.ReadOnlyField(source='publisher.name')
    category_name = serializers.ReadOnlyField(source='category.name')
    sub_category_name = serializers.ReadOnlyField(source='sub_category.name')
    book_author_mapping_book = BookAuthorMappingReadSerializer(many=True)

    class Meta:
        model = Book
        fields = '__all__'


class BookCopySerializer(serializers.ModelSerializer):
    book_number = serializers.CharField(validators=[CustomUniqueValidator(queryset=BookCopy.objects.filter(is_active=True))])
    bar_code = serializers.CharField(validators=[CustomUniqueValidator(queryset=BookCopy.objects.filter(is_active=True))])

    class Meta:
        model = BookCopy
        fields = '__all__'

class IssueReturnBookSerializer(serializers.ModelSerializer):

    class Meta:
        model = IssueReturnBook
        fields = '__all__'


class FineStaffSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Staff
        fields = ['name', 'profile_pic_details']

class FineStudentSerializer(serializers.ModelSerializer):
    current_standard_name = serializers.ReadOnlyField(source='current_standard.name')
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField(read_only=True)

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)

    class Meta:
        model = Student
        fields = ['name', 'mobile_num', 'profile_pic_details', 'current_standard_name']

class FineBookUserSerializer(serializers.ModelSerializer):
    staff = FineStaffSerializer(read_only=True)
    student = FineStudentSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['staff', 'student', 'id']

class FineBookReadSerializer(serializers.ModelSerializer):
    issued_to_user = FineBookUserSerializer(read_only=True)
    book_number = serializers.ReadOnlyField(source='book_copy.book_number')

    class Meta:
        model = IssueReturnBook
        fields = '__all__'

class LibraryStaffReadSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)
    
    class Meta:
        model = Staff
        fields = ['name', 'mobile_num', 'profile_pic_details']

class LibraryStudentReadSerializer(serializers.ModelSerializer):
    profile_pic_details = DocumentUrlSerializer(read_only=True, source='profile_pic')
    name = serializers.SerializerMethodField()

    def get_name(self, obj):
        return get_full_name(obj.first_name, obj.middle_name, obj.last_name)
    
    class Meta:
        model = Student
        fields = ['name', 'mobile_num', 'profile_pic_details']

class BookAndSearchUserSerializer(serializers.ModelSerializer):
    staff_details = LibraryStaffReadSerializer(read_only=True, source='staff')
    student_details = LibraryStudentReadSerializer(read_only=True, source='student')
    
    class Meta:
        model = User
        fields = ['id', 'staff', 'student', 'is_staff', 'staff_details', 'student_details', 'barcode_number']

class LibraryConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = LibraryConfiguration
        fields = '__all__'


class StandardLibraryConfigurationSerializer(serializers.ModelSerializer):

    class Meta:
        model = StandardLibraryConfiguration
        fields = '__all__'

class StandardLibraryConfigurationReadSerializer(serializers.ModelSerializer):
    academic_year_value = serializers.SerializerMethodField()
    standard_name = serializers.ReadOnlyField(source='standard.name')

    def get_academic_year_value(self, obj):
        if obj.academic_year:
            return f'{obj.academic_year.start_date.year}-{obj.academic_year.end_date.year}'
        return ''
    
    class Meta:
        model = StandardLibraryConfiguration
        fields = '__all__'

class StandardLibraryConfigurationRead2Serializer(serializers.ModelSerializer):

    class Meta:
        model = LibraryConfiguration
        fields = '__all__'

class LibraryConfigurationReadSerializer(serializers.ModelSerializer):
    standard_library_config_library_config = StandardLibraryConfigurationReadSerializer(many=True)

    class Meta:
        model = LibraryConfiguration
        fields = '__all__'

class FineSerializer(serializers.ModelSerializer):

    class Meta:
        model = Fine
        fields = '__all__'

class IssueReturnBookReadForFineSerializer(serializers.ModelSerializer):
    issued_to_user = FineBookUserSerializer(read_only=True)
    book_copy_number = serializers.ReadOnlyField(source='book_copy.book_number')

    class Meta:
        model = IssueReturnBook
        fields = ['issued_to_user', 'book_copy_number','due_date', 'issued_at']

class FineReadSerializer(serializers.ModelSerializer):
    issue_return_book = IssueReturnBookReadForFineSerializer(read_only=True)

    class Meta:
        model = Fine
        fields = '__all__'

class FinePaymentDataDetailSerializer(serializers.ModelSerializer):

    class Meta:
        model = FinePaymentData
        fields = '__all__'

class FinePaymentReadSerializer(serializers.ModelSerializer):
    fine_fine_payment_data = FineReadSerializer(read_only=True, many=True)

    class Meta:
        model = FinePaymentData
        fields = '__all__'

class RenewDataSerializer(serializers.ModelSerializer):

    class Meta:
        model = Renew
        fields = '__all__'

class LibraryMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.CharField(validators=[CustomUniqueValidator(queryset=LibraryMembership.objects.filter(is_active=True))])

    class Meta:
        model = LibraryMembership
        fields = '__all__'

class LibraryVendorSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = LibraryVendor
        fields = '__all__'

class LibraryPurchaseMasterSerializer(serializers.ModelSerializer):

    class Meta:
        model = LibraryPurchaseMaster
        fields = '__all__'

class LibraryUserAttendanceSerializer(serializers.ModelSerializer):

    class Meta:
        model = LibraryUserAttendance
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=model.objects.filter(is_active=True),
                fields=('user', 'fordate_time'),
                message='Duplicate Attendance for the same date and time already exists'
            )
        ]
        fields = '__all__'

class LibraryUserAttendanceReadSerializer(serializers.ModelSerializer):
    user = UserReadSerializer(read_only=True)

    class Meta:
        model = LibraryUserAttendance
        fields = '__all__'


class FineExemptedSerializer(serializers.ModelSerializer):
    issue_return_book_id = serializers.CharField()

    class Meta:
        model = FineExempted
        fields = '__all__'

class StockVerificationParentSerializer(serializers.ModelSerializer):
    name = serializers.CharField(validators=[CustomUniqueValidator(queryset=StockVerificationParent.objects.filter(is_active=True))])
    created_by_user_name = serializers.SerializerMethodField()

    def get_created_by_user_name(self, obj):
        if obj.created_by and obj.created_by.staff:
            return get_full_name(obj.created_by.staff.first_name, obj.created_by.staff.middle_name, obj.created_by.staff.last_name)
        elif obj.created_by and obj.created_by.student:
            return get_full_name(obj.created_by.student.first_name, obj.created_by.student.middle_name, obj.created_by.student.last_name)
        elif obj.created_by:
            return obj.created_by.username
        else:
            return ""

    class Meta:
        model = StockVerificationParent
        fields = '__all__'

class StockVerificationSerializer(serializers.ModelSerializer):
    bar_code = serializers.ReadOnlyField(source='book_copy.bar_code')
    book_title = serializers.ReadOnlyField(source='book_copy.book.title')
    verified_by_name = serializers.SerializerMethodField()

    def get_verified_by_name(self, obj):
        name = ''
        if obj.verified_by.staff:
            name = get_full_name(obj.verified_by.staff.first_name, obj.verified_by.staff.middle_name, obj.verified_by.staff.last_name)
        elif obj.verified_by.student:
            name = get_full_name(obj.verified_by.student.first_name, obj.verified_by.student.middle_name, obj.verified_by.student.last_name)
        else:
            name = obj.verified_by.username
        return name 

    class Meta:
        model = StockVerification
        fields = '__all__'

# class BookBranchMappingSerializer(serializers.ModelSerializer):

#     class Meta:
#         model = BookBranchMapping
#         fields = '__all__'