from rest_framework.views import Response
from rest_framework import viewsets
from datetime import date
from rest_framework.exceptions import ValidationError
from apps.app import views
from apps.hostel.models.pocket_money import DepositAndWithDraw

from apps.hostel.serializers import (DepositAndWithDrawSerializer, RoomAllocationSerializer, UserAttendanceSerializer,  StudentAllocationSerializer)
from apps.hostel.models import RoomAllocation, UserAttendance
from apps.institutes.models import Room
from apps.hostel.services.hostel import (allocate_room_to_user, get_allocated_students_list, get_allocation_list, get_hostel_summary, get_individual_allocation_data,
                                         add_update_user_attendance, read_student_list_checkindata,
                                         read_individual_student_list_checkindata, get_indvidual_student_transaction, student_individual_detail)
from apps.hostel.services.pocket_money import (add_deposit_and_withdraw)
from apps.shared.services import SharedService


class RoomAllocationViewSet(viewsets.ModelViewSet):
    serializer_class = RoomAllocationSerializer
    http_method_names = ['get', 'post', 'delete']
    search_fields = ['room__name']

    def get_object(self):
        if self.action == 'retrieve':
            return Room.objects.get(id=self.kwargs['pk'])
        else:
            return self.get_queryset().get(pk=self.kwargs['pk'])

    def get_queryset(self):
        self.queryset = RoomAllocation.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        allocate_room_to_user(self, request.data)
        return Response({'Reason': 'Data Added Successfully'})

    def retrieve(self, request, *args, **kwargs):
        response = get_individual_allocation_data(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_allocation_list(self)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        todaysDate = date.today().strftime('%Y-%m-%d %H:%M:%S')
        if not self.get_queryset().filter(checkin__gte=todaysDate, id=self.kwargs['pk']):
            raise ValidationError('Checkin is already started you are not able to delete')
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class UserAttendanceViewSet(viewsets.ModelViewSet):
    serializer_class = UserAttendanceSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = UserAttendance.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        add_update_user_attendance(self, request.data)
        return Response({'Reason': 'Data Added Successfully'})

    def retrieve(self, request, *args, **kwargs):
        response = read_individual_student_list_checkindata(self, request)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = read_student_list_checkindata(self, request)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.delete_unrefered_data(self, {})
        return Response(response)

class DepositViewSet(viewsets.ModelViewSet):
    serializer_class = DepositAndWithDrawSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = DepositAndWithDraw
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_deposit_and_withdraw(self, request, '1')
        return Response(response)
        
class WithdrawViewSet(viewsets.ModelViewSet):
    serializer_class = DepositAndWithDrawSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = DepositAndWithDraw
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_deposit_and_withdraw(self, request, '2')
        return Response(response)

class ReturnBackViewSet(viewsets.ModelViewSet):
    serializer_class = DepositAndWithDrawSerializer
    http_method_names = ['post']

    def get_queryset(self):
        self.queryset = DepositAndWithDraw
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_deposit_and_withdraw(self, request, '3')
        return Response(response)


class StudentTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = StudentAllocationSerializer
    http_method_names =  ['get']

    def get_queryset(self):
        if self.request.GET.get('fromdate') and self.request.get('todate'):
            return DepositAndWithDraw.objects.filter(fordate__gte=self.request.GET.get('fromdate'),
            fordate__lte=self.request.GET.get('todate'))
        return DepositAndWithDraw.objects.all()

    def list(self, request, *args, **kwargs):
        response = get_allocated_students_list(self, request)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        response = get_indvidual_student_transaction(self, request, self.kwargs['pk'])
        return Response(response)
        
class HostelSummaryViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request):
        response = get_hostel_summary(self, request)
        return Response(response)

class StudentHostelDetails(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']

    def list(self, request):
        pass

    def retrieve(self, request, *args, **kwargs):
        response = student_individual_detail(self, self.kwargs['pk'])
        return Response(response)