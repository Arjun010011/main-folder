from rest_framework import routers

from apps.general.views import (EventViewSet, HolidayCalenderForStudentViewSet, HolidayCalenderViewSet, HolidayPlanViewSet,
EventTypeViewSet, SchoolTimingViewSet,CalenderTypeViewSet)

router = routers.DefaultRouter()
router.register(r'eventtype', EventTypeViewSet, basename='eventtype')
router.register(r'event', EventViewSet, basename='event')
router.register(r'holidaycalender', HolidayCalenderViewSet, basename='holidaycalender')
router.register(r'holidaycalenderforstudent', HolidayCalenderForStudentViewSet, basename='holidaycalenderforstudent')
router.register(r'schooltimings', SchoolTimingViewSet, basename='schooltimings')
router.register(r'holidayplan', HolidayPlanViewSet, basename='holidayplan')
router.register(r'calendertype', CalenderTypeViewSet, basename='calendertype')

urlpatterns = router.urls
