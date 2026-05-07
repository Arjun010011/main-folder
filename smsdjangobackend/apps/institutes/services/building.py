from rest_framework.exceptions import ValidationError
from django.db import transaction
from datetime import date
from django.db.models import Q

from apps.institutes.serializers import FloorSerializer, RoomAssetMappingSerializer, RoomDocumentMappingSerializer
from apps.shared.services import SharedService
from apps.institutes.models.building import Floor, Room, Asset, RoomAssetMapping, RoomDocumentMapping
from apps.hostel.models import RoomAllocation
from apps.tenants.services.middlewares import get_current_db_name
from apps.hostel.services.hostel import check_allocation_date_overlaps

def add_or_update_building(self, data):
    validate_building_add_update(self, data)
    floorData = data['floor_list']
    dataToSaveNew = []
    del data['floor_list']
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_or_update_data(self, [data])
        buildingId = response['data']['id']
        for floor in floorData:
            floor['building'] = buildingId
            floor['is_active'] = True
        floorQueryset = Floor.objects.all()
        if data['deltable_floor_ids']:
            floorQueryset.filter(id__in=data['deltable_floor_ids']).update(is_active=False)
        for floor in floorData:
            if 'id' in floor:
                instance = floorQueryset.get(id=floor['id'])
                serializer = FloorSerializer(instance=instance, data=floor)
                serializer.is_valid(raise_exception=True)
                serializer.save()
            else:
                dataToSaveNew.append(floor)
        if dataToSaveNew:
            self.queryset = floorQueryset
            self.serializer_class = FloorSerializer
            SharedService.add_data(self, dataToSaveNew)
    return {'Reason': 'Data Saved Successfully'}


def validate_building_add_update(self, data):
    if data['building_type'] == 'Hostel' and not data['building_for']:
        raise ValidationError('Hostel for is mandatory')
    if not data['number_of_floors']:
        raise ValidationError('Number of floors cannot be empty')
    uniqueFloorNames = []
    numberofFloors = 0
    for floor in data['floor_list']:
        if not floor['name']:
            raise ValidationError('Floor name cannot be empty')
        if floor['name'] in uniqueFloorNames:
            raise ValidationError(f'{floor["name"]} - This floor name already exist.')
        if not floor['no_of_rooms']:
            raise ValidationError(f'{floor["name"]} - Number of rooms are mandatory')
        numberofFloors += 1
        uniqueFloorNames.append(floor['name'])
    if numberofFloors != data['number_of_floors']:
        raise ValidationError('Number of floors are not equal to floors List')

def delete_building(self, request):
    with transaction.atomic(using=get_current_db_name()):
        floorObj = Floor.objects.filter(building=self.kwargs['pk'])
        if floorObj:
            floorIds = floorObj.values_list('id', flat=True)
            roomObj = Room.objects.filter(floor__in=floorIds)
            if RoomAllocation.objects.filter(room__in=roomObj.values_list('id', flat=True), is_active=True):
                raise ValidationError('Some of the rooms are allocated to user you cant delete the building')
            if roomObj:
                roomObj.update(is_active=False)
            floorObj.update(is_active=False)
        SharedService.soft_delete_data(self)

def add_room(self, data):
    validate_add_room(self, data['rooms'])
    with transaction.atomic(using=get_current_db_name()):
        for roomData in data['rooms']:
            roomData['is_active'] = True
            response = SharedService.add_or_update_data(self, [roomData])
            deletableAssetIds = roomData['deletable_asset_list'] if 'deletable_asset_list' in roomData else []
            deletableDocumentIds = roomData['deletable_document_list'] if 'deletable_document_list' in roomData else []
            add_update_assetmapping(self, roomData['asset_list'], response['data']['id'], deletableAssetIds)
            add_update_document_to_room(self, roomData['document_list'], response['data']['id'], deletableDocumentIds)

def add_update_assetmapping(self, data, roomId, deletableIds):
    existingIds = []
    dataToSaveNew = []
    roomObj = RoomAssetMapping.objects.all()
    for assetData in data:
        assetData['room'] = roomId
        assetData['is_active'] = True
        if 'id' in assetData:
            existingIds.append(assetData['id'])
    if deletableIds:
        roomObj.filter(id__in=deletableIds).update(is_active=False)
    for assetData in data:
        if 'id' in assetData:
            instance = roomObj.get(id=assetData['id'])
            serializer = RoomAssetMappingSerializer(instance=instance, data=assetData)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            dataToSaveNew.append(assetData)
    if dataToSaveNew:
        self.queryset = roomObj
        self.serializer_class = RoomAssetMappingSerializer
        SharedService.add_data(self, dataToSaveNew)

def add_update_document_to_room(self, data, roomId, deletableIds):
    existingIds = []
    dataToSaveNew = []
    docObj = RoomDocumentMapping.objects.all()
    for documentData in data:
        documentData['room'] = roomId
        documentData['is_active'] = True
        if 'id' in documentData:
            existingIds.append(documentData['id'])
    if deletableIds:
        docObj.filter(id__in=deletableIds).update(is_active=False)
    for documentData in data:
        if 'id' in documentData:
            instance = docObj.get(id=documentData['id'])
            serializer = RoomDocumentMappingSerializer(instance=instance, data=documentData)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        else:
            dataToSaveNew.append(documentData)
    if dataToSaveNew:
        self.queryset = docObj
        self.serializer_class = RoomDocumentMappingSerializer
        SharedService.add_data(self, dataToSaveNew)


def validate_add_room(self, data):
    existingIds = {}
    for roomData in data:
        if 'id' in roomData and roomData['id']:
            existingIds[roomData['id']] = roomData['strength']
        if not roomData['strength']:
            raise ValidationError('Room strength is mandatory')
        assetNameList = []
        for asset in roomData['asset_list']:
            if asset['asset'] in assetNameList:
                astobj = Asset.objects.get(id=asset['asset'])
                raise ValidationError(f'{astobj.name} - duplicate assets')
            assetNameList.append(asset['asset'])
    if existingIds:
        roomObject = Room.objects.filter(id__in=existingIds.keys()).values('id', 'strength')
        changedStrengths = {}
        for roomData in roomObject:
            if roomData['strength'] > int(existingIds[roomData['id']]):
                changedStrengths[roomData['id']] = int(existingIds[roomData['id']])
        if changedStrengths:
            todaysDate = date.today().strftime('%Y-%m-%d %H:%M:%S')
            roomAllocationData = RoomAllocation.objects.filter(
                Q(checkin__gte=todaysDate) | Q(Q(checkout__isnull=True)|Q(checkout__gte=todaysDate)),
                room__in=changedStrengths.keys(), is_active=True
            ).values('checkin', 'checkout', 'room', 'id')
            existingRoomData = {}
            for room in roomAllocationData:
                if room['room'] not in existingRoomData:
                    existingRoomData[room['room']] = []
                room['checkin'] = room['checkin'].strftime('%Y-%m-%d %H:%M:%S')
                if room['checkout']:
                    room['checkout'] = room['checkout'].strftime('%Y-%m-%d %H:%M:%S')
                existingRoomData[room['room']].append(room)
            for roomId in existingRoomData:
                if int(existingIds[roomId]) >= len(existingRoomData[roomId]):
                    continue
                overLappingData = {}
                for index in range(0,len(existingRoomData[roomId])):
                    eroomData = existingRoomData[roomId][index]
                    overLappingData[eroomData['id']] = 0
                    for index1 in range( index, len(existingRoomData[roomId])):
                        roomData = existingRoomData[roomId][index1]
                        if not roomData['checkout'] and not eroomData['checkout']:
                            if roomData['checkin'] <= eroomData['checkin']:
                                overLappingData[eroomData['id']] += 1
                        elif not eroomData['checkout']:
                            if (roomData['checkin'] <= eroomData['checkin'] <= roomData['checkout']):
                                overLappingData[eroomData['id']] += 1
                        elif not roomData['checkout']:
                            if eroomData['checkin'] <= roomData['checkin'] <= eroomData['checkout']:
                                overLappingData[eroomData['id']] += 1
                        elif roomData['checkin'] <= eroomData['checkin'] <= roomData['checkout']:
                            overLappingData[eroomData['id']] += 1
                        elif eroomData['checkin'] <= roomData['checkin'] <= eroomData['checkout']:
                            overLappingData[eroomData['id']] += 1
                        maximumAllocatedKey = max(overLappingData, key=overLappingData.get)
                        if int(overLappingData[maximumAllocatedKey]) > int(existingIds[roomId]):
                            raise ValidationError(f"Not able to reduce the room count. Already students/staffs are there for date {eroomData['checkin']}. More than the given count")

def delete_room_data(self):
    roomId = self.kwargs['pk']
    self.queryset = RoomAssetMapping.objects.filter(room=roomId)
    SharedService.soft_delete_data(self)
    self.queryset = RoomDocumentMapping.objects.filter(room=roomId)
    SharedService.soft_delete_data(self)
    self.queryset = self.get_queryset().filter(id=roomId)
    return SharedService.soft_delete_data(self)
