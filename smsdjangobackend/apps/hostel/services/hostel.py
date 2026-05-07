from rest_framework.exceptions import ValidationError
from datetime import datetime
from django.db.models import Q, F
from apps.finance.models.fee import FeePlan
from apps.finance.services import fee_plan

from apps.hostel.serializers import (RoomForAllocationSerializer, StaffAllocationSerializer,
                                     StudentAllocationSerializer, UserAttendanceReadSerializer,
                                     StudentAllocationReadSerializerPocketMoney
                                    )
from apps.hostel.models import RoomAllocation, UserAttendance
from apps.institutes.models import Room, RoomAssetMapping
from apps.institutes.serializers import BuildingReadSerializer
from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService
from apps.classes.models.enrollment import StudentStandardMapping
from apps.staffs.models import Staff
from apps.students.models import Student, student
from apps.institutes.models.academicYear import AcademicYear
from apps.users.models.user import User


HOSTEL_CODENAME='hostel'

def allocate_room_to_user(self, data):
    validate_room_allocation(self, data)
    response = SharedService.add_or_update_data(self, [data])
    SharedService.custom_thread(allocate_room_to_user_notification, self, data)
    return response


def allocate_room_to_user_notification(self, data):
    room = RoomAllocation.objects.filter(room=data['room']).first()
    if room:
        user = User.objects.filter(is_active=True)
        if data['student']:
            user = user.get(student=data['student'])
            body = f'Dear Parents,<br/><br/>Student {user.student.first_name} has '
        else:
            user = user.get(staff=data['staff'])
            body = f'Hi {user.staff.first_name},<br/><br/>You have'
        body += 'been allocated to the Hostel. Please find the below details<br/><br/>'
        body += f'Building Name: {room.room.floor.building.name}<br/>'
        body += f'Building for: {BuildingReadSerializer.get_building_for_name(self, room.room.floor.building)}<br/>'
        body += f'Address: {room.room.floor.building.address}<br/>'
        body += f'Floor Name: {room.room.floor.name}<br/>'
        body += f'Room Name: {room.room.name}<br/>'
        body += f'Room Strength: {room.room.strength}<br/>'
        body += f'Check-in: {room.checkin}<br/>'
        if room.checkout:
            body += f'Check-out: {room.checkout}<br/>'
        send_notification('roomallocation_create', body=body, touserIds=[user.pk],
                          pushData={'extra_params': {'heading': 'Room Allocated'}})


def validate_room_allocation(self, data):
    roomalocObj = RoomAllocation.objects.all()
    dataId = data['id'] if 'id' in data else None
    allocationFilter = {'is_active': True}  # find the overlap of the student
    if data['student']:
        # studentData = roomalocObj.filter(
        #     academic_year=data['academic_year'],student=data['student'],
        #     is_active=True
        # ).exclude(id=dataId).values('room__name')
        # if studentData:
        #     roomName = studentData[0]['room__name']
        #     raise ValidationError(f'Already student assigned to room - {roomName}')
        if not StudentStandardMapping.objects.filter(academic_year=data['academic_year'],
                                                     student=data['student']).count():
            raise ValidationError('Student does not exist in the given academic year')
        allocationFilter['student'] = data['student']
    elif data['staff']:
        # staffData = roomalocObj.filter(
        #     academic_year=data['academic_year'],student=data['staff'],
        #     is_active=True
        # ).exclude(id=dataId).values('room__name')
        # if staffData:
        #     roomName = staffData['room__name']
        #     raise ValidationError(f'Already student assigned to room - {roomName}')
        if not Staff.objects.filter(is_active=True).count():
            raise ValidationError('Staff is inactive / does not exist')
        allocationFilter['staff'] = data['staff']
    else:
        raise ValidationError('Student/Staff id is mandatory')
    if not data['room']:
        raise ValidationError('Room Id is mandatory')
    roomData = Room.objects.filter(id=data['room'], is_active=True).first()
    if not roomData:
        raise ValidationError('Room is Inactive/Not Exist')
    if data['checkout'] and data['checkin'] > data['checkout']:
        raise ValidationError('Start Date should be before End date')
    existinData = roomalocObj.filter(is_active=True, room=data['room']).exclude(id=dataId).values('checkin', 'checkout',
                                                                                                  'room', 'room__name')
    existingStudentData = roomalocObj.filter(**allocationFilter).exclude(id=dataId).values('checkin', 'checkout',
                                                                                           'room', 'room__name')
    existingUsersInRoom = 0
    for rowData in existingStudentData:
        if not rowData['checkout']:
            if data['checkin'] and data['checkout'] and data['checkout'] < rowData['checkin'].strftime(
                    '%Y-%m-%d %H:%M:%S'):
                continue
            raise ValidationError(f'Still User as not checked out of the room {rowData["room__name"]}')
        check_allocation_date_overlaps(rowData['checkin'].strftime('%Y-%m-%d %H:%M:%S'),
                                       rowData['checkout'].strftime('%Y-%m-%d %H:%M:%S'),
                                       data['checkin'], data['checkout'], True, rowData['room__name'])
    for tableData in existinData:
        if tableData['checkout'] and tableData['checkout'] < datetime.now(): #if already checked out ignore
            continue
        if not tableData['checkout']:
            if data['checkin'] and data['checkout'] and data['checkout'] < tableData['checkin'].strftime(
                    '%Y-%m-%d %H:%M:%S'):
                continue
            existingUsersInRoom += 1
            continue
        existingUsersInRoom += check_allocation_date_overlaps(tableData['checkin'].strftime('%Y-%m-%d %H:%M:%S'),
                                                              tableData['checkout'].strftime('%Y-%m-%d %H:%M:%S'),
                                                              data['checkin'], data['checkout'])
    if roomData.strength == existingUsersInRoom:
        raise ValidationError(f'Room Strength is Full - Total Room Capacity is {roomData.strength}')
    if data['checkout']:
        if data['checkin'] > data['checkout'] or data['checkin'] == data['checkout']:
            raise ValidationError('Checkout should be greater than checkin')


def check_allocation_date_overlaps(eCheckIn, eCheckout, checkin, checkout, raiseE=False, roomName=''):
    existingCount = 0
    if not checkout:
        checkoutMsg = ''
    else:
        checkoutMsg = ' - ' + datetime.strptime(checkout, '%Y-%m-%d %H:%M:%S').strftime('%d-%m-%Y %H:%M:%S')
    if not eCheckout:
        echeckoutMsg = ''
    else:
        echeckoutMsg = ' - ' + datetime.strptime(eCheckout, '%Y-%m-%d %H:%M:%S').strftime('%d-%m-%Y %H:%M:%S')
    echeckInMsg = datetime.strptime(eCheckIn, '%Y-%m-%d %H:%M:%S').strftime('%d-%m-%Y %H:%M:%S')
    if (eCheckIn <= checkin <= eCheckout):
        existingCount += 1
        if raiseE:
            raise ValidationError(f"User Already exist in range {echeckInMsg} - {echeckoutMsg} For {roomName}")
    elif checkout and (eCheckIn <= checkout <= eCheckout):
        existingCount += 1
        if raiseE:
            raise ValidationError(f"User Already exist in range {echeckInMsg} - {echeckoutMsg} For {roomName}")
    # check existing date in range of give date
    elif (eCheckIn >= checkin and (not checkout or eCheckIn <= checkout)):
        existingCount += 1
        if raiseE:
            raise ValidationError(f"User Already exist in range {echeckInMsg} {checkoutMsg} For {roomName}")
    elif checkout and (eCheckout >= checkin and (not checkout or eCheckout <= checkout)):
        existingCount += 1
        if raiseE:
            raise ValidationError(f"User Already exist in range {echeckInMsg} - {echeckoutMsg} For {roomName}")
    return existingCount


def add_update_user_attendance(self, data):
    roomAllocationIds = [aData['roomallocation'] for aData in data['attendance_data']]
    roomAlloationData = RoomAllocation.objects.filter(id__in=roomAllocationIds, is_active=True).values('checkin',
                                                                                                       'checkout', 'id')
    roomAlloationData = {roomAlloc['id']: roomAlloc for roomAlloc in roomAlloationData}
    for attendanceData in data['attendance_data']:
        dataId = attendanceData['id'] if 'id' in attendanceData else None
        if not attendanceData['roomallocation']:
            raise ValidationError('Room allocation is mandatory')
        if attendanceData['checkout'] and attendanceData['checkout'] < attendanceData['checkin']:
            raise ValidationError('Checkout time should be less than checkin')
        filterQuery = {'roomallocation': attendanceData['roomallocation']}
        if attendanceData['student']:
            filterQuery['student'] = attendanceData['student']
        if attendanceData['staff']:
            filterQuery['staff'] = attendanceData['staff']
        latestObj = self.get_queryset().filter(**filterQuery)
        if attendanceData['roomallocation'] not in roomAlloationData:
            raise ValidationError('Room allocation id does not exist')
        if attendanceData['checkin'] < roomAlloationData[attendanceData['roomallocation']]['checkin'].strftime(
                "%Y-%m-%d %H:%M:%S"):
            raise ValidationError(
                f'Checkin date should be greater than {roomAlloationData[attendanceData["roomallocation"]]["checkin"]}')
        if roomAlloationData[attendanceData['roomallocation']]['checkout'] and attendanceData['checkin'] > \
                roomAlloationData[attendanceData['roomallocation']]['checkout'].strftime("%Y-%m-%d %H:%M:%S"):
            raise ValidationError(
                f'Checkout date should be less than {roomAlloationData[attendanceData["roomallocation"]]["checkout"]}')
        if latestObj:
            latestObjC = latestObj.latest('checkin')
            lastCheckout = latestObjC.checkout.strftime("%Y-%m-%d %H:%M:%S") if latestObjC.checkout else None
            lastCheckin = latestObjC.checkin.strftime("%Y-%m-%d %H:%M:%S") if latestObjC.checkin else None
            if dataId:
                latestExclId = latestObj.exclude(id=dataId)
                latestExclCheckIn = None
                latestExclCheckOut = None
                if latestExclId:
                    latestExclId = latestExclId.latest('checkin')
                    if latestExclId:
                        latestExclCheckIn = latestExclId.checkin.strftime("%Y-%m-%d %H:%M:%S")
                        latestExclCheckOut = latestExclId.checkout.strftime("%Y-%m-%d %H:%M:%S")
                if latestExclCheckOut and attendanceData['checkin'] <= latestExclCheckOut:
                    raise ValidationError(
                        f"Checkin date {attendanceData['checkin']} should be greater than previous checkout {latestExclCheckOut}")
            else:
                if not lastCheckout:
                    raise ValidationError(
                        f'Please update the checkout details for last entry {latestObjC.checkin.strftime("%d-%m-%Y %H:%M:%S")}')
                if attendanceData['checkin'] < lastCheckout or attendanceData['checkin'] < lastCheckin:
                    raise ValidationError(
                        f'Always checkin and checkout should be greater than last checkin and checkout data (last checkin/checkout latestObj{lastCheckin} / {lastCheckout})')
    SharedService.add_or_update_data(self, data['attendance_data'])


def get_allocation_list(self):
    roomRoomAllocationMapping = {}
    roomAssetMapping = {}
    uniqueAssetList = set()
    roomFor = self.request.GET.get('roomFor', None)
    assetFilterList = self.request.GET.get('asset_list', None)
    availableCount = self.request.GET.get('show_available_count', None)
    floor = self.request.GET.get('floor', None)
    building = self.request.GET.get('building', None)
    filterQuery = {'is_active': True}
    if floor:
        filterQuery['floor'] = floor
    if building:
        filterQuery['floor__building'] = building
    if assetFilterList:
        assetFilterList = list(assetFilterList.split(','))
    if self.request.GET.get('search'):
        filterQuery['name__icontains'] = self.request.GET.get('search')
    roomData = Room.objects.filter(**filterQuery).values('id', 'name', 'strength', 'description',
                                                         'floor', floor_name=F('floor__name'),
                                                         building_name=F('floor__building__name'),
                                                         building_for=F('floor__building__building_for'))
    roomIds = [roomD['id'] for roomD in roomData]
    queryset = self.get_queryset().filter(Q(checkout__gt=datetime.now()) | Q(checkout=None),
                                          checkin__lte=datetime.now(), room__in=roomIds)
    roomAllocationData = self.filter_queryset(queryset).values(
        'checkin', 'checkout', 'student', 'room', 'id', 'staff'
    )
    roomAssetData = RoomAssetMapping.objects.filter(is_active=True, room__in=roomIds).values(
        'asset__name', 'asset', 'number_of_assets', 'room'
    )
    for roomAsset in roomAssetData:
        uniqueAssetList.add(roomAsset['asset__name'])
        if roomAsset['room'] not in roomAssetMapping:
            roomAssetMapping[roomAsset['room']] = {'data': [], 'isSearchedListFound': True}
        if assetFilterList and roomAsset['asset'] not in assetFilterList:
            roomAssetMapping[roomAsset['room']]['isSearchedListFound'] = False
        roomAssetMapping[roomAsset['room']]['data'].append(roomAsset)
    for roomAlloc in roomAllocationData:
        if roomAlloc['room'] not in roomRoomAllocationMapping:
            roomRoomAllocationMapping[roomAlloc['room']] = {'data': [], 'isStudentExist': False, 'isStaffExist': False}
        if roomAlloc['student']:
            roomRoomAllocationMapping[roomAlloc['room']]['isStudentExist'] = True
        if roomAlloc['staff']:
            roomRoomAllocationMapping[roomAlloc['room']]['isStaffExist'] = True
        roomRoomAllocationMapping[roomAlloc['room']]['data'].append(roomAlloc)
    returnData = []
    for roomD in roomData:
        if roomFor:
            if roomFor == 'student':
                if roomD['id'] not in roomRoomAllocationMapping or not roomRoomAllocationMapping[roomD['id']][
                    'isStudentExist']:
                    continue
            elif roomFor == 'staff':
                if roomD['id'] not in roomRoomAllocationMapping or not roomRoomAllocationMapping[roomD['id']][
                    'isStaffExist']:
                    continue
        if assetFilterList and (
                roomD['id'] not in roomAssetMapping or roomAssetMapping[roomD['id']]['isSearchedListFound']):
            continue
        roomD['available'] = roomD['strength']
        roomD['occupied'] = 0
        roomD['asset_details'] = []
        if roomD['id'] in roomAssetMapping:
            roomD['asset_details'] = roomAssetMapping[roomD['id']]['data']
        if roomD['id'] in roomRoomAllocationMapping:
            roomD['occupied'] = len(roomRoomAllocationMapping[roomD['id']]['data'])
            roomD['available'] = roomD['strength'] - roomD['occupied']
        if availableCount and roomD['available'] < int(availableCount):
            continue
        returnData.append(roomD)
    if self.request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, returnData,
                                                                                self.request.GET.get('limit'),
                                                                                self.request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data,
                         'asset_list': uniqueAssetList}}
    return {'data': returnData}


def get_individual_allocation_data(self, request):
    self.queryset = Room.objects.filter(is_active=True)
    queryset = self.get_object()
    previousData = self.request.GET.get('previous_data', None)
    serializer = RoomForAllocationSerializer(queryset, context={'previous_data': previousData})
    currentAllocationDetails = []
    upcomingAllocationDetails = []
    # not to filter when seeing the old data
    tempData = {}
    tempData = serializer.data
    if not previousData:
        del tempData['allocation_details']
        for data in serializer.data['allocation_details']:
            checkin = datetime.strptime(data['checkin'], "%Y-%m-%dT%H:%M:%S")
            if checkin <= datetime.now():
                currentAllocationDetails.append(data)
            else:
                upcomingAllocationDetails.append(data)
        tempData['current_allocation_details'] = currentAllocationDetails
        tempData['upcoming_allocation_details'] = upcomingAllocationDetails
    return tempData


def read_student_list_checkindata(self, request):
    response = {'data': []}
    userFor = request.GET.get('user', None)
    checkin = request.GET.get('checkin', None)
    allocatedUserOnly = request.GET.get('allocated_user_only', None)
    building = request.GET.get('building', None)
    if not checkin:
        checkin = datetime.today().strftime('%Y-%m-%d %H:%M:%S')
    if userFor and checkin:
        tempFilter = {}
        if userFor == 'staff' and checkin:
            fordate = list(checkin.split(' '))[0]
            queryset = Staff.objects.filter(Q(date_left__lte=fordate) | Q(date_left=None),
                                            date_joined__lte=fordate, is_active=True)
            if allocatedUserOnly and allocatedUserOnly == 'true':
                queryset = queryset.filter(
                    Q(roomallocation_staff__checkout__gte=checkin) | Q(roomallocation_staff__checkout__isnull=True),
                    roomallocation_staff__checkin__lte=checkin
                )
                if building:
                    tempFilter['roomallocation_staff__room__floor__building'] = building
                queryset = queryset.filter(**tempFilter)
            serializer = StaffAllocationSerializer(queryset, many=True, context={'checkin': checkin})
            response['data'] = serializer.data
        if userFor == 'student':
            standardFilter = {}
            student_queryset = Student.objects.filter(fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename=HOSTEL_CODENAME)
            if request.GET.get('academic_year'):
                standardFilter = {'academic_year': request.GET.get('academic_year')}
            if request.GET.get('standard'):
                standardFilter['standard'] = request.GET.get('standard')
            if allocatedUserOnly and allocatedUserOnly == 'true':
                student_queryset = student_queryset.filter(
                    Q(roomallocation_student__checkout__gte=checkin) | Q(roomallocation_student__checkout__isnull=True),
                    roomallocation_student__checkin__lte=checkin
                ).order_by('id').distinct()
            if standardFilter:
                student_list = list(
                    StudentStandardMapping.objects.filter(student__fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename=HOSTEL_CODENAME,
                    student__student_admission__academic_year=request.GET.get('academic_year'),
                    **standardFilter).values_list('student', flat=True))
                if student_queryset:
                    student_queryset = student_queryset.filter(id__in=student_list, fee_plan_student_feature_student__fee_plan__standard_fee__academic_year= request.GET.get('academic_year'))
                else:
                    student_queryset = Student.objects.filter(id__in=student_list)
            if building:
                student_queryset = student_queryset.filter(roomallocation_student__room__floor__building=building)
            if student_queryset:
                student_queryset = student_queryset.order_by('id').distinct()
                serializer = StudentAllocationSerializer(student_queryset, many=True, context={'checkin': checkin})
                response['data'] = serializer.data
    else:
        raise ValidationError('user is mandatory')
    if request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, response['data'],
                                                                                request.GET.get('limit'),
                                                                                request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return response


def read_individual_student_list_checkindata(self, request):
    staffStudentId = self.kwargs['pk']
    userFor = request.GET.get('user', None)
    fromdate = request.GET.get('fromDate', None)
    todate = request.GET.get('toDate', None)
    filterQuery = {}
    if not userFor:
        raise ValidationError('Please provide user to get the type of the user')
    if userFor == 'student':
        filterQuery['student'] = staffStudentId
    elif userFor == 'staff':
        filterQuery['staff'] = staffStudentId
    if fromdate:
        filterQuery['checkin__gte'] = fromdate
    if todate:
        filterQuery['checkin__lte'] = todate
    queryset = UserAttendance.objects.filter(**filterQuery).order_by('-checkin')
    serializer = UserAttendanceReadSerializer(queryset, many=True)
    if request.GET.get('pagination'):
        data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                request.GET.get('limit'),
                                                                                request.GET.get('pageno'))
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return {'data': serializer.data}

def get_student_opted_for_hostel_list(self, academic_year=None, standard_ids=[], standard_section_ids=[], values=['id']):
    filter_query = {}
    if self.request.GET.get('building'):
        filter_query = {
            'roomallocation_student__room__in': list(Room.objects.filter(floor__building=self.request.GET.get('building')).values_list('id', flat=True))
        }
    filter_query['fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename'] = HOSTEL_CODENAME
    if academic_year:
        filter_query['fee_plan_student_feature_student__fee_plan__standard_fee__academic_year'] = academic_year
    if standard_section_ids or standard_ids:
        filter_query['id__in'] = [s['id'] for s in Student.get_student_for_standard(academic_year, standard_ids, standard_section_ids, ['id'])]
    student_list = Student.objects.filter(**filter_query).distinct().values(*values)
    return student_list

def get_student_opted_hostel_list_based_on_academic_year(self):
    filter_query = {
        'fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename': HOSTEL_CODENAME
    }
    student_list = Student.objects.filter(**filter_query).annotate(
        academic_year=F('fee_plan_student_feature_student__fee_plan__standard_fee__academic_year'),
        start_date=F('fee_plan_student_feature_student__fee_plan__standard_fee__academic_year__start_date'),
        end_date=F('fee_plan_student_feature_student__fee_plan__standard_fee__academic_year__end_date')
    ).values(
        'academic_year', 'start_date', 'end_date', 'id'
    )
    return student_list

def get_allocated_students_list(self, request):
    from apps.hostel.services.pocket_money import get_student_wise_balance
    building = request.GET.get('building')
    floor = request.GET.get('floor')
    standard = request.GET.get('standard')
    academic_year = request.GET.get('academic_year')
    now = datetime.today().strftime('%Y-%m-%d %H:%M:%S')
    response = []
    filter_queryset = {}
    if floor:
        filter_queryset['roomallocation_student__room__floor'] = floor
    elif building:
        filter_queryset['roomallocation_student__room__floor__building'] = building
    if standard and academic_year:
        filter_queryset['standard_student__standard'] = standard
        filter_queryset['standard_student__academic_year'] = academic_year
    if request.GET.get('is_upcoming'):
        student_queryset = Student.objects.filter(
            Q(roomallocation_student__checkin__gte=now), **filter_queryset
        )
    elif request.GET.get('checkedout'):
        student_queryset = Student.objects.filter(
            Q(roomallocation_student__checkout__lte=now), **filter_queryset
        ).exclude(roomallocation_student__checkout__isnull=True)
    else:
        student_queryset = Student.objects.filter(
            Q(roomallocation_student__checkout__gte=now)|Q(roomallocation_student__checkout__isnull=True), 
            Q(roomallocation_student__checkin__lte=now), **filter_queryset,
            roomallocation_student__is_active=True, is_active=True
        )
    if student_queryset:
        student_queryset = student_queryset.order_by('id').distinct()
        serializer = StudentAllocationSerializer(student_queryset, many=True, context={'individual': True})
        response = serializer.data
    data, count, next_page, previous_page = SharedService.custom_pagination(self, response,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    student_ids = [d['id'] for d in data]
    student_balance = get_student_wise_balance(self, student_ids)
    for d in data:
        if d['id'] in student_balance:
            d['balance'] = student_balance[d['id']]['balance']
            d['deposited_amount'] = student_balance[d['id']]['deposited_amount']
            d['withdrawed_amount'] = student_balance[d['id']]['withdrawed_amount']
            d['returnback'] = student_balance[d['id']]['returnback']
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data }}


def get_indvidual_student_transaction(self, request, studentid):
    obj = Student.objects.get(id=studentid)
    serializer = StudentAllocationReadSerializerPocketMoney(obj, context={'individual': True})
    transaction_data = []
    if serializer.data:
        transaction_data = serializer.data['deposit_and_with_draw_student']
    student_data = {}
    for temp in serializer.data:
        if temp != 'deposit_and_with_draw_student':
            student_data[temp] = serializer.data[temp]
    data, count, next_page, previous_page = SharedService.custom_pagination(self, transaction_data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data, 'student_data': student_data }}

def get_hostel_summary(self, request):
    from apps.hostel.services.pocket_money import get_student_wise_balance
    return_data = {
        'total_no_of_seats':0,
        'total_no_of_rooms':0,
        'occupied_seats':0,
        'total_available_seats':0,
        'unallocated_students':0,
        'total_students': 0,
        'total_pocket_collected':0,
        'total_pocket_distributed':0,
        'total_pocket_balance':0
    }
    academic = AcademicYear.get_academic_year_for_date(self, datetime.today().date(), True)
    if not academic:
        raise ValidationError('Academic year not found for todays date')
    academic = academic.id
    student_ids = get_student_opted_for_hostel_list(self, academic)
    return_data['total_students'] = len(student_ids)
    student_data = get_student_wise_balance(self, student_ids)
    opted_student_ids = set()
    for student in student_data:
        opted_student_ids.add(student)
        return_data['total_pocket_collected'] += student_data[student]['deposited_amount']
        return_data['total_pocket_distributed'] += student_data[student]['withdrawed_amount']
        return_data['total_pocket_balance'] += student_data[student]['balance']
    building = self.request.GET.get('building')
    filter_query = {}
    temp_filter = {'is_active': True}
    if building:
        temp_filter['floor__building'] = building
    floor_data = Room.objects.filter(**temp_filter)
    room_allocation_details = RoomForAllocationSerializer(floor_data, many=True, context={'current_data': True})
    allocated_student_ids = set()
    allocated_staff_ids = set()
    if room_allocation_details.data:
        for room in room_allocation_details.data:
            return_data['total_no_of_seats'] += room['strength']
            return_data['total_no_of_rooms'] += 1
            return_data['occupied_seats'] += len(room['allocation_details'])
            for allocation_data in room['allocation_details']:
                if allocation_data['student_details']:
                    allocated_student_ids.add(allocation_data['student_details']['id'])
                else:
                    allocated_staff_ids.add(allocation_data['staff_details']['id'])
    student_allocated_without_opted = allocated_student_ids - opted_student_ids
    return_data['unallocated_students'] = return_data['total_students'] - return_data['occupied_seats'] + len(student_allocated_without_opted)
    return_data['total_available_seats'] = return_data['total_no_of_seats'] - return_data['occupied_seats']

    academic_year_list = AcademicYear.objects.all().values('id', 'start_date', 'end_date')
    academic_year_mapping = {}
    for academic in academic_year_list:
        academic_year_mapping[academic['id']] = str(academic['start_date'].strftime('%Y'))+'-'+ str(academic['end_date'].strftime('%Y'))
    filter_query['fee_plan_student_feature_student__fee_plan__standard_fee__fee_type__codename']=HOSTEL_CODENAME
    
    student_opted = Student.objects.filter(**filter_query).values('id', 'fee_plan_student_feature_student__fee_plan__standard_fee__academic_year')
    academic_count = {}
    for stud in student_opted:
        if stud['fee_plan_student_feature_student__fee_plan__standard_fee__academic_year'] not in academic_count:
            academic_count[stud['fee_plan_student_feature_student__fee_plan__standard_fee__academic_year']] = 0
        academic_count[stud['fee_plan_student_feature_student__fee_plan__standard_fee__academic_year']] += 1
    data_list = []
    for academic_year in academic_year_mapping:
        if academic_year in academic_count:
            data_list.append(academic_count[academic_year])
        else:
            data_list.append(0)
    return_data['year_list'] = academic_year_mapping.values()
    return_data['data_list'] = data_list
    return_data['student_allocated_without_opted'] = student_allocated_without_opted
    return {'data': return_data}

def student_individual_detail(self, student_id):
    obj = Student.objects.get(id=student_id)
    if self.request.GET.get('history_data'):
        serializer = StudentAllocationReadSerializerPocketMoney(obj)
    else:
        serializer = StudentAllocationReadSerializerPocketMoney(obj, context={'individual': True})
    total_deposited = 0
    total_withdrawed = 0
    total_return_back = 0
    for transaction in serializer.data['deposit_and_with_draw_student']:
        if str(transaction['deposit_type']) == '1':
            total_deposited += transaction['amount']
        elif str(transaction['deposit_type']) == '2':
            total_withdrawed += transaction['amount']
        elif str(transaction['deposit_type']) == '3':
            total_return_back += transaction['amount']
    total_balance = total_deposited - total_withdrawed - total_return_back
    return {
        'data': serializer.data, 'total_deposited': total_deposited, 'total_withdrawed': total_withdrawed, 
        'balance': total_balance, 'total_return_back': total_return_back
    }