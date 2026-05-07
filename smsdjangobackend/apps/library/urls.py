from django.urls import path
from rest_framework import routers

from apps.library.views import (
    LibraryCategoryViewSet, LibraryStockVerificationParentViewSet, LibrarySubCategoryViewSet, LibraryAuthorViewSet,
    LibraryPublisherViewSet, LibraryBookViewSet, LibraryCopyViewSet, IssueReturnBookViewSet,
    LibraryConfigurationViewSet, BookAndUserSearchViewSet, LibraryVendorViewSet, RenewBookViewSet,
    LibraryMembershipViewSet, LibraryUserAttendanceViewSet, LibraryDashboardViewSet, LibraryReportViewSet,
    LibraryFineViewSet, LibraryRackViewSet, LibraryStockVerificationViewSet
)

router = routers.DefaultRouter()
router.register(r'librarycategory', LibraryCategoryViewSet, basename='librarycategory')
router.register(r'librarysubcategory', LibrarySubCategoryViewSet, basename='librarysubcategory')
router.register(r'libraryauthor', LibraryAuthorViewSet, basename='libraryauthor')
router.register(r'librarypublisher', LibraryPublisherViewSet, basename='librarypublisher')
router.register(r'librarybook', LibraryBookViewSet, basename='librarybook')
router.register(r'librarybookcopy', LibraryCopyViewSet, basename='librarybookcopy')
router.register(r'issuereturnbook', IssueReturnBookViewSet, basename='issuereturnbook')
router.register(r'libraryconfiguration', LibraryConfigurationViewSet, basename='libraryconfiguration')
router.register(r'bookandusersearch', BookAndUserSearchViewSet, basename='bookandusersearch')
router.register(r'renewbook', RenewBookViewSet, basename='renewbook')
router.register(r'librarymembership', LibraryMembershipViewSet, basename='librarymembership')
router.register(r'vendor', LibraryVendorViewSet, basename='vendor')
router.register(r'libraryuserattendance', LibraryUserAttendanceViewSet, basename='libraryuserattendance')
router.register(r'librarydashboard', LibraryDashboardViewSet, basename='librarydashboard')
router.register(r'libraryreport', LibraryReportViewSet, basename='libraryreport')
router.register(r'libraryfine', LibraryFineViewSet, basename='libraryfine')
router.register(r'libraryrack', LibraryRackViewSet, basename='libraryrack')
router.register(r'librarystockverification', LibraryStockVerificationViewSet, basename='librarystockverification')
router.register(r'librarystockverificationparent', LibraryStockVerificationParentViewSet, basename='librarystockverificationparent')
# Explicit route so "missing-sequence" is never matched as a detail PK (which returns 404).
urlpatterns = [
    path(
        "librarystockverification/missing-sequence/",
        LibraryStockVerificationViewSet.as_view({"get": "missing_sequence"}),
        name="librarystockverification-missing-sequence",
    ),
] + router.urls
