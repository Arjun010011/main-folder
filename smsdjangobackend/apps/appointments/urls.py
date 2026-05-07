from rest_framework import routers
from django.urls import path

from apps.appointments.views import BookAppointmentViewSet, StaffAvailablityViewSet, StaffCalendarViewSet, AppointmentRemarkUpdateViewSet, CheckAvailabilityTimingsViewSet
# , StaffHolidayViewSet


router = routers.DefaultRouter()
router.register(r'bookappointment', BookAppointmentViewSet, basename='bookappointment')
# router.register(r'appointmentapprove', AppointmentApproveViewSet, basename='appointmentapprove')
router.register(r'staffavailability', StaffAvailablityViewSet, basename='staffavailability')
# router.register(r'staffholiday', StaffHolidayViewSet, basename='staffholiday')
router.register(r'staffcalendar', StaffCalendarViewSet, basename='staffcalendar')
router.register(r'appointmentremarkupdate', AppointmentRemarkUpdateViewSet, basename='appointmentremarkupdate')
router.register(r'checkavailabilitytimings', CheckAvailabilityTimingsViewSet, basename='checkavailabilitytimings')
urlpatterns = router.urls

