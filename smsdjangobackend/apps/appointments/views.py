from rest_framework import viewsets, exceptions, permissions
from rest_framework.views import Response, APIView

from apps.appointments.models.master import StaffAppointment, StaffAvailability, UserStaffAppointmentMapping
from apps.appointments.serializers import BookAppointmentSerializer, StaffAvailabilitySerializer, UserStaffAppointmentMappigSerializer
from apps.appointments.services.master import get_staff_available_calendar, create_staff_availablity, get_available_staff_timings,add_appointment_data,get_staff_appointment,staff_appointment_detail
from apps.shared.services import SharedService
from apps.staffs.models.staff import Staff
from django.utils.dateparse import parse_date


class BookAppointmentViewSet(viewsets.ModelViewSet):
    serializer_class = BookAppointmentSerializer
    http_method_names = ['post', 'put', 'get','delete']

    def get_queryset(self):
        self.queryset = StaffAppointment.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_appointment_data(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        data = staff_appointment_detail(self, kwargs)
        return Response(data)

    def list(self, request, *args, **kwargs):
        response = get_staff_appointment(self)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)
    
class StaffAvailablityViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAvailabilitySerializer
    http_method_names = ['post', 'put', 'get','delete']

    def get_queryset(self):
        self.queryset = StaffAvailability.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = create_staff_availablity(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)
    
    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)
    
class StaffCalendarViewSet(viewsets.ModelViewSet):
    http_method_names = ['get'] 

    def get_queryset(self):
        return Staff.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        staff_id = request.query_params.get("staff")
        start_date = request.query_params.get("start_date")
        end_date = request.query_params.get("end_date")
        if not staff_id or not start_date or not end_date:
            return Response("staff_id, start_date and end_date are required.")
        try:
            start_date = parse_date(start_date)
            end_date = parse_date(end_date)
            if not start_date or not end_date:
                return Response("Invalid date format. Use YYYY-MM-DD")
        except Exception as e:
            return Response(str(e))
        try:
            staff = Staff.objects.get(id=staff_id, is_active=True)
        except Staff.DoesNotExist:
            return Response("Staff not found")
        calendar_data = get_staff_available_calendar(self,staff, start_date, end_date)
        return Response(calendar_data)
    
class AppointmentRemarkUpdateViewSet(viewsets.ModelViewSet):
    serializer_class = UserStaffAppointmentMappigSerializer
    http_method_names = ['post'] 

    def get_queryset(self):
        return UserStaffAppointmentMapping.objects.filter(is_active=True)
    
    def create(self, request, *args, **kwargs):
        response = SharedService.add_or_update_data(self, request.data)
        return Response(response)
    
class CheckAvailabilityTimingsViewSet(viewsets.ModelViewSet):
    serializer_class = StaffAvailabilitySerializer
    http_method_names = ['get']

    def get_queryset(self):
        return StaffAvailability.objects.filter(is_active=True)
    
    def list(self, request, *args, **kwargs):
        response = get_available_staff_timings(self)
        return Response(response)
