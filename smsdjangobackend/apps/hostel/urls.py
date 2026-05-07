from rest_framework import routers
from apps.hostel.views import (RoomAllocationViewSet, UserAttendanceViewSet, DepositViewSet, WithdrawViewSet, 
StudentTransactionViewSet, HostelSummaryViewSet, StudentHostelDetails, ReturnBackViewSet)

router = routers.DefaultRouter()
router.register(r'roomallocation', RoomAllocationViewSet, basename='roomallocation')
router.register(r'usercheckincheckout', UserAttendanceViewSet, basename='usercheckincheckout')
router.register(r'deposit', DepositViewSet, basename='deposit')
router.register(r'withdraw', WithdrawViewSet, basename='withdraw')
router.register(r'returnback', ReturnBackViewSet, basename='returnback')
router.register(r'studenttransactionlist', StudentTransactionViewSet, basename='studenttransactionlist')
router.register(r'hostelsummary', HostelSummaryViewSet, basename='hostelsummary')
router.register(r'student_hostel_details', StudentHostelDetails, basename='student_hostel_details')
urlpatterns = router.urls
