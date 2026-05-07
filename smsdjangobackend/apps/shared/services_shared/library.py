from apps.library.models.master import Book, BookCategory, BookCopy, BookSubCategory
from django.db import transaction
from apps.tenants.services.middlewares import get_current_db_name

def sync_update_book_subcategory(self):
    # Fetch target categories and subcategories once
    try:
        category1 = BookCategory.objects.get(id=2)
        subcategory1 = BookSubCategory.objects.get(id=1)
        category2 = BookCategory.objects.get(id=2)
        subcategory2 = BookSubCategory.objects.get(id=2)
    except (BookCategory.DoesNotExist, BookSubCategory.DoesNotExist):
        return  # Exit if categories or subcategories do not exist

    # Lists to store updates and mismatches
    updated_records = []
    mismatches = []

    # Iterate through BookCopy records
    for book_copy in BookCopy.objects.all():
        # Determine the target category and subcategory based on the book_number prefix
        if book_copy.book_number.startswith('PUS'):
            target_category, target_subcategory = category2, subcategory2
        elif book_copy.book_number.startswith('PU0'):
            target_category, target_subcategory = category1, subcategory1
        else:
            continue  # Skip if no matching prefix

        current_book = book_copy.book
        # Check if the book's current category and subcategory need to be updated
        if current_book.category != target_category or current_book.sub_category != target_subcategory:
            # Try to find an existing Book with the correct category/subcategory
            existing_book = Book.objects.filter(
                title=current_book.title,
                category=target_category,
                sub_category=target_subcategory
            ).first()

            # Create a new Book entry if one doesn't already exist
            if not existing_book:
                with transaction.atomic(using=get_current_db_name()):
                    existing_book = Book.objects.create(
                        title=current_book.title,
                        title_number=current_book.title_number,
                        sub_title=current_book.sub_title,
                        price=current_book.price,
                        category=target_category,
                        sub_category=target_subcategory,
                        publisher=current_book.publisher,
                        is_active=current_book.is_active,
                    )

            book_copy.book = existing_book
            book_copy.save()
        
            updated_records.append(book_copy.book_number)

    for book_copy in BookCopy.objects.all():
        if book_copy.book_number.startswith('PU0') and book_copy.book.sub_category != subcategory1:
            mismatches.append((book_copy.book_number, book_copy.book.sub_category, subcategory1))
        elif book_copy.book_number.startswith('PUS') and book_copy.book.sub_category != subcategory2:
            mismatches.append((book_copy.book_number, book_copy.book.sub_category, subcategory2))

    if updated_records:
        print("Updated records:")
        for book_number in updated_records:
            print(f"BookCopy '{book_number}' was updated to the correct subcategory.")
    else:
        print("No records were updated.")

    if mismatches:
        print("\nMismatches found:")
        for book_number, actual_subcategory, expected_subcategory in mismatches:
            print(f"BookCopy '{book_number}' is in subcategory '{actual_subcategory}', but expected '{expected_subcategory}'.")
    else:
        print("\nAll BookCopy records are correctly categorized.")