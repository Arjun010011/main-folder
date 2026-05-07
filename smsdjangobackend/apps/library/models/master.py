from django.db import models
from django.db.models import JSONField


from apps.shared.models.document import Document
from apps.users.models.user import User

class Rack(models.Model):
    name = models.CharField(max_length=255, null=True, blank=True)
    level = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BookCategory(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BookSubCategory(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    category = models.ForeignKey(BookCategory, null=True, blank=True,
    on_delete=models.CASCADE, related_name='book_sub_category_category')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Author(models.Model):
    name = models.CharField(max_length=255)
    description = models.CharField(max_length=500, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class Publisher(models.Model):
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

class Book(models.Model):
    title = models.CharField(max_length=255)
    title_number = models.CharField(max_length=255, null=True, blank=True)
    sub_title = models.CharField(max_length=255, null=True, blank=True)
    price = models.FloatField(default=0)
    category = models.ForeignKey(BookCategory, null=True, on_delete=models.CASCADE, related_name='book_category')
    sub_category = models.ForeignKey(BookSubCategory, null=True, on_delete=models.CASCADE, related_name='book_sub_category')
   
    publisher = models.ForeignKey(Publisher, null=True, blank=True, on_delete=models.SET_NULL, related_name='book_publisher')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BookDetail(models.Model):
    isbn = models.CharField(null=True, blank=True, max_length=255)
    edition = models.CharField(null=True, blank=True, max_length=255)
    source_vendor = models.CharField(max_length=255, null=True)
    remarks = models.CharField(max_length=500, null=True, blank=True)
    year_of_publication = models.CharField(null=True, blank=True, max_length=255)
    book = models.OneToOneField(
        Book, null=True, blank=True, on_delete=models.SET_NULL, related_name='book_detail_book'
    )
    total_pages = models.IntegerField(null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BookImageMapping(models.Model):
    image_type = (
        ('book_image', 'book_image'),
        ('soft_copy', 'soft_copy')
    )
    book = models.ForeignKey(Book, null=True, on_delete=models.CASCADE, related_name='book_image_mapping_book')
    image = models.ForeignKey(Document, related_name='book_image_mapping_image', blank=True, null=True,
                                       on_delete=models.SET_NULL)
    image_type = models.CharField(max_length=50, choices=image_type, default='book_image')
       
class BookCopy(models.Model):
    book = models.ForeignKey(Book, null=True, on_delete=models.CASCADE, related_name='book_copy_book')
    book_number = models.CharField(max_length=255)
    bar_code = models.CharField(max_length=255,null=True, blank=True)
    rack = models.ForeignKey(Rack, null=True, blank=True, on_delete=models.SET_NULL, related_name='book_copy')
    bill_date = models.DateTimeField(null=True, blank=True) #temp for jnanajyothi
    bill_no = models.CharField(max_length=255, null=True, blank=True)
    stock_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class BookAuthorMapping(models.Model):
    book = models.ForeignKey(Book, null=True, on_delete=models.CASCADE, related_name='book_author_mapping_book')
    author = models.ForeignKey(Author, null=True, on_delete=models.CASCADE, related_name='book_author_mapping_author')
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class LibraryMembership(models.Model):
    user = models.ForeignKey(User, null=True, on_delete=models.CASCADE, related_name='library_membership_user')
    from_date = models.DateTimeField(null=True, blank=True)
    to_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True) #deactivate when disabled
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)