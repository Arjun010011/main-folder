from rest_framework import viewsets, exceptions
from rest_framework.views import Response, APIView
from django.db.models import Q
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.serializers import StudentStandardMappingSerializer
from django.conf import settings

from apps.institutes.models import AcademicYear, Institute, FinancialYear, Building, Asset, Room
from apps.institutes.models.institute import InstitutePocMapping
from apps.institutes.models.academic_year_branch import AcademicYearBranchMapping
from apps.institutes.models.banner import Banner
from apps.classes.models.standard import InstituteAdresses
from apps.institutes.models.biometric_machine import BiometricMachine
from apps.institutes.models.resource import Resource
from apps.institutes.models.visitor import Visitor, Reason, REASON_TYPE
from apps.institutes.serializers import (AcademicYearSerializer, BiometricMachineSerializer, InstituteAddressReadSerializer, InstituteSerializer, AcademicYearViewSerializer,
                                         FinancialYearSerializer, GetFinancialYearSerializer, ResourceSerializer,
                                         BuildingSerializer, BuildingReadSerializer, AssetSerialzier, RoomSerializer,
                                         BannerSerializer, SwitchableInstituteSerializer, UserSwitchableInstituteMappingSerializer, VisitorSerializer, ReasonSerializer, InstituteAddressSerializer)
from apps.institutes.services.academic_year import add_academic_year, get_academic_year_for_branch, update_academic_year, get_current_academic_year
from apps.institutes.services.banner import add_update_delete_banner
from apps.institutes.services.financial_year import add_update_financial_year, get_current_financial_year
from apps.institutes.services.institute import add_institute, get_dashboard, get_dashboard_new, update_institute, add_institute_address_data
from apps.institutes.services.resource import add_resource
from apps.institutes.services.building import (add_or_update_building, delete_building, add_room, delete_room_data,
                                            )
from apps.institutes.services.switchable import create_switchable_institute, create_user_switchable
from apps.institutes.services.visitor import add_update_visitor_user_attendance
from apps.institutes.services.visitor_pass import get_visitor_pass_pdf
from apps.shared.models.address import MapAddress
from apps.shared.services import SharedService, UploadTypeService
from apps.shared.utils import http_request
from apps.users.services.auth import generate_otp_for_mobile, verify_otp_for_sms_and_email
from apps.users.services.permissions import IsAuthenticated
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.services.permissions import OnlyListAccess
from apps.users.services.permissions import OnlyListAccess

SERVER_URL = getattr(settings, 'SERVER_URL', None)

class AcademicYearViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicYearSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        if self.request.GET.get("is_finance_page"):
            self.queryset = AcademicYear.objects.filter(finance_enabled=True)
        else:
            self.queryset = AcademicYear.objects.all()
        return get_academic_year_for_branch(self, 1, self.queryset,['start_date'])

    def create(self, request, *args, **kwargs):
        response = add_academic_year(self, request.data['academicyear'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_academic_year(self, request.data['academicyear'], **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = update_academic_year(self, request, True, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class GetAcademicYearViewSet(viewsets.ModelViewSet):
    serializer_class = AcademicYearViewSerializer
    http_method_names = ['get']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        if self.request.GET.get("is_finance_page"):
            self.queryset = AcademicYear.objects.filter(finance_enabled=True,is_active=True).order_by('start_date')
        else:
            self.queryset = AcademicYear.objects.filter(is_active=True).order_by('start_date')
        return get_academic_year_for_branch(self, 1, self.queryset,['start_date'])

    def list(self, request, *args, **kwargs):
        response = get_current_academic_year(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        raise exceptions.MethodNotAllowed(request.method)


class InstituteViewSet(viewsets.ModelViewSet):
    serializer_class = InstituteSerializer
    http_method_names = ['get', 'post', 'put', 'patch']

    def get_queryset(self):
        self.queryset = Institute.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_institute(self, request.data['institute'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_institute(self, request.data['institute'], **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        temp = MapAddress.objects.filter(
            map_address_data__institute=response['data'][0]['id'], map_address_data__default=1
        ).values()
        if temp:
           response['data'][0]['map_address_data'] = temp[0]
        active_poc = InstitutePocMapping.objects.filter(
            institute=response['data'][0]['id'], is_active=True
        ).first()
        if active_poc:
            response['data'][0]['poc'] = active_poc.poc
        return Response(response)


class FinancialYearViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialYearSerializer
    http_methods_names = ['post', 'put', 'get', 'delete']
    filterset_fields = ['is_active']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = FinancialYear.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_update_financial_year(self, request.data['financialyear'])
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = add_update_financial_year(self, request.data['financialyear'], kwargs['pk'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        # self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        # response = SharedService.soft_delete_data(self)
        # return Response(response)
        pass

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)


class GetFinancialYearViewSet(viewsets.ModelViewSet):
    serializer_class = GetFinancialYearSerializer
    http_method_names = ['get']
    permission_classes = (OnlyListAccess,)

    def get_queryset(self):
        self.queryset = FinancialYear.objects.filter(is_active=True).order_by('start_date')
        return self.queryset

    def list(self, request, *args, **kwargs):
        response = get_current_financial_year(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)


class DashBoardViewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_dashboard(self)
        return Response(response)


class ResourceViewSet(viewsets.ModelViewSet):
    serializer_class = ResourceSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    lookup_field = 'name'

    def get_queryset(self):
        self.queryset = Resource.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_resource(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        if 'usage' in request.data:
            del request.data['usage']
        kwargs['partial'] = True
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(name=self.kwargs['name'])
        response = SharedService.soft_delete_data(self)
        return Response(response)


class BuildingViewset(viewsets.ModelViewSet):
    serializer_class = BuildingSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['building_type']

    def get_queryset(self):
        self.queryset = Building.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_or_update_building(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = BuildingReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = BuildingReadSerializer
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        delete_building(self, request)
        return Response({'Reason': 'Data Deleted Succesfully'})


class AssetViewset(viewsets.ModelViewSet):
    serializer_class = AssetSerialzier
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = Asset.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_or_update_data(self, request.data)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        filter_data = {'roomassetmapping__isnull': True}
        response = SharedService.delete_unrefered_data(self, filter_data,
                                                       'Not able to delete. Asset is already mapped to room')
        return Response(response)


class RoomViewSet(viewsets.ModelViewSet):
    serializer_class = RoomSerializer
    http_method_names = ['get', 'post', 'delete']
    search_fields = ['floor__name', 'name']
    filterset_fields = ['floor', 'roomassetmapping_room__id', 'floor__building']

    def get_queryset(self):
        filterQuery = {'is_active': True}
        assetFilterList = self.request.GET.get('asset_list', None)
        if assetFilterList:
            assetFilterList = list(assetFilterList.split(','))
            filterQuery['roomassetmapping_room__asset__in'] = assetFilterList
        self.queryset = Room.objects.filter(**filterQuery).distinct()
        return self.queryset

    def create(self, request, *args, **kwargs):
        add_room(self, request.data)
        return Response({'Reason': 'Data Added Successfully'})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data_paginated(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        delete_room_data(self)
        return Response({'Reason': 'Data Deleted Succesfully'})


class BannerViewSet(viewsets.ModelViewSet):
    serializer_class = BannerSerializer
    http_method_names = ['get', 'post']
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        self.queryset = Banner.objects.all()
        if self.request.query_params.get('is_active'):
            self.queryset = self.queryset.exclude(sequence=None).order_by('sequence')
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_update_delete_banner(self, request.data['banner'])
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


def _visitor_checkin_bound(raw, end_of_day=False):
    """
    Build checkin filter value from fromDate/toDate query params.
    Supports YYYY-MM-DD or YYYY-MM-DD HH:MM:SS — do not append time if already present
    (avoids '2026-03-01 00:00:00 00:00:00' from clients that send full datetimes).
    """
    s = (raw or "").strip().replace("T", " ")
    if not s:
        return None
    has_time = len(s) > 10 and bool(s[10:].strip())
    if not has_time:
        day = s[:10]
        return f"{day} 23:59:59" if end_of_day else f"{day} 00:00:00"
    return s


class VisitorViewSet(viewsets.ModelViewSet):
    serializer_class = VisitorSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['reason__reason_type', 'reason', 'building']
    search_fields = ['name', 'checkin', 'checkout', 'user__staff__first_name', 'user__student__first_name']

    def get_queryset(self):
        filter_queryset = {}
        if self.request.GET.get('fromDate') and self.request.GET.get('toDate'):
            filter_queryset['checkin__gte'] = _visitor_checkin_bound(
                self.request.GET.get('fromDate'), end_of_day=False
            )
            filter_queryset['checkin__lte'] = _visitor_checkin_bound(
                self.request.GET.get('toDate'), end_of_day=True
            )
        or_condition = None
        if self.request.GET.get('roomallocation__room__floor__building'):
            or_condition = Q(roomallocation__room__floor__building=self.request.GET.get(
                'roomallocation__room__floor__building')) | Q(
                    building=self.request.GET.get('roomallocation__room__floor__building')
                )
        if or_condition:
            return Visitor.objects.filter(or_condition, **filter_queryset)
        return Visitor.objects.filter(**filter_queryset)

    def create(self, request, *args, **kwargs):
        response = add_update_visitor_user_attendance(self, request)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if request.GET.get("print_pass"):
            return get_visitor_pass_pdf(self)
        queryset = self.filter_queryset(self.get_queryset())
        summary = {
            "total_visitors": queryset.count(),
            "checked_out": queryset.exclude(checkout__isnull=True).count(),
            "still_inside": queryset.filter(checkout__isnull=True).count(),
        }
        response = SharedService.read_data_paginated(self, True)
        if isinstance(response, dict) and "data" in response:
            response["data"]["summary"] = summary
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = SharedService.delete_unrefered_data(self, {})
        return Response(response)


class VisitorVerifyView(APIView):
    """
    Authenticated ERP users: GET ?visitor=<id> to confirm pass matches records (QR opens
    /school/visitor/verify?visitor=... after login).
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        raw = request.query_params.get("visitor") or request.query_params.get("visitor_id")
        if raw is None or str(raw).strip() == "":
            return Response(
                {"valid": False, "message": "visitor id is required."},
                status=400,
            )
        if not str(raw).strip().isdigit():
            return Response(
                {"valid": False, "message": "Invalid visitor id."},
                status=400,
            )
        vid = int(str(raw).strip())
        obj = (
            Visitor.objects.filter(id=vid)
            .select_related(
                "reason",
                "building",
                "user",
                "user__staff",
                "user__student",
                "roomallocation",
            )
            .first()
        )
        if not obj:
            return Response(
                {"valid": False, "message": "Visitor not found."},
                status=404,
            )
        serializer = VisitorSerializer(obj)
        return Response({"valid": True, "data": serializer.data})


class ReasonViewSet(viewsets.ModelViewSet):
    serializer_class = ReasonSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'reason_type']

    def get_queryset(self):
        self.queryset = Reason.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        for reason_data in request.data['reason']:
            if reason_data['reason_type'] not in REASON_TYPE:
                raise exceptions.ValidationError('Invalid type')
        response = SharedService.add_data(self, request.data['reason'])
        return Response(response)

    def update(self, request, *args, **kwargs):#nikhil check for validation and avoid update 
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        if request.GET.get('reason_types'):
            return Response({'data': [{'id': r, 'label': REASON_TYPE[r]} for r in REASON_TYPE]})
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(visitor_reason__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        if self.queryset.filter(adjustment_fee_reason__isnull=True):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')

class InstituteAddressViewset(viewsets.ModelViewSet):
    serializer_class = InstituteAddressSerializer
    http_method_names = ['get', 'post', 'delete']

    def get_queryset(self):
        self.queryset = InstituteAdresses.objects.filter(is_active=True)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_institute_address_data(self, request.data)
        return Response(response)
    
    def retrieve(self, request, *args, **kwargs):
        self.serializer_class = InstituteAddressReadSerializer
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        self.serializer_class = InstituteAddressReadSerializer
        if self.request.GET.get('student') and self.request.GET.get('academic_year'):
            try:
                student_standard = StudentStandardMapping.objects.get(student=self.request.GET.get('student'), academic_year=self.request.GET.get('academic_year'))
                address_data = InstituteAdresses.objects.filter(standard=student_standard.standard, is_active=True)
                serializer = InstituteAddressReadSerializer(address_data, many=True)
                if serializer.data:
                    return Response({'data': serializer.data[0]})
                else:
                    serializer = InstituteAddressReadSerializer(InstituteAdresses.objects.filter(default=True), many=True)
                    return Response({'data': serializer.data[0]})
            except:
                raise exceptions.ValidationError('Student Not opted for any standard')
        else:
            response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

class AppVersionViewSet(viewsets.ModelViewSet):
    serializer_class = None
    http_method_names = ['get']
    permission_classes = (OnlyListAccess,)

    def list(self, request, *args, **kwargs):
        kwargs = SharedService.get_edubricz_header(self)
        url = SERVER_URL + 'company/appversion'
        device_type = None
        if int(request.GET.get('device_type')) == 1:
            device_type = 'android'
        if int(request.GET.get('device_type')) == 2:
            device_type = 'ios'
        params = {
            'version_name': self.request.GET.get('version_name'),
            'app_type': request.GET.get('app_type'), 'device_type': device_type,
            'app_host': request.GET.get('app_host')
        }
        if not params['version_name']:
            raise exceptions.ValidationError('version_name is mandatory')
        remote_response = http_request('GET', url, None, params, **kwargs)
        if remote_response.status_code != 200:
            raise exceptions.ValidationError(remote_response.json())
        response = remote_response.json()
        return Response(response)

class SwitchableInstituteViewSet(viewsets.ModelViewSet):
    serializer_class = SwitchableInstituteSerializer
    http_method_names = ['post', 'get']

    def create(self, request, *args, **kwargs):
        response = create_switchable_institute(self, request.data)
        return Response(response)


class UserSwitchableInstituteMappingViewSet(viewsets.ModelViewSet):
    serializer_class = UserSwitchableInstituteMappingSerializer
    http_method_names = ['post', 'get']

    def create(self, request, *args, **kwargs):
        response = create_user_switchable(self, request.data)
        return Response(response)

class BiometricMachineViewSet(viewsets.ModelViewSet):
    serializer_class = BiometricMachineSerializer
    http_method_names = ['get', 'post']

    def get_queryset(self):
        return BiometricMachine.objects.all()

    def list(self, request, *args, **kwargs):
        return SharedService.read_data(self, True)

    def create(self, request, *args, **kwargs):
        return SharedService.add_data(self, request.data, False)
    
    def destroy(self, request, *args, **kwargs):
        return SharedService.soft_delete_data(self)

    def update(self, request, *args, **kwargs):
        return SharedService.update_data(self, request.data)

class DashBoardViewNewSet(viewsets.ModelViewSet):
    permission_classes = (IsAuthenticated,)
    http_method_names = ['get']

    def list(self, request, *args, **kwargs):
        response = get_dashboard_new(self)
        return Response(response)
    
class VisitorOtpViewSet(APIView):
    permission_classes = []  # if you want open access

    def post(self, request, format=None):
        if 'is_verify' in request.data and request.data['is_verify']:
            response = verify_otp_for_sms_and_email(self, request)
        else:
            response = generate_otp_for_mobile(self, request)
        return Response(response)