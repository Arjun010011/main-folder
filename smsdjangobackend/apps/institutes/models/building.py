from django.db import models

from apps.shared.models.document import Document

buildingType = (
    ('School', 'School'),
    ('Hostel', 'Hostel')
)


class Building(models.Model):
    buildingFor = (
        ('1', 'Student Boy'),
        ('2', 'Student Girl'),
        ('3', 'Staff Male'),
        ('4', 'Staff Female'),
        ('5', 'Student and Staff - Male'),
        ('6', 'Student and Staff - Female'),
    )
    name = models.CharField(max_length=255)
    building_type = models.CharField(default='1', max_length=10, choices=buildingType)
    building_for = models.CharField(default=None, null=True, blank=True, max_length=1, choices=buildingFor)
    address = models.CharField(max_length=255, null=True, blank=True)
    number_of_floors = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Floor(models.Model):
    name = models.CharField(max_length=255)
    no_of_rooms = models.IntegerField(default=0)
    building = models.ForeignKey(Building, null=True, on_delete=models.SET_NULL, related_name='floor_building')
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


# Image field we are storing in the document model
class Room(models.Model):
    name = models.CharField(max_length=255)
    floor = models.ForeignKey(Floor, on_delete=models.SET_NULL, null=True, blank=True)
    strength = models.IntegerField(default=0)
    description = models.CharField(max_length=255, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class RoomDocumentMapping(models.Model):
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True,
                                 related_name='roomdocument')
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True, related_name='roomdocument_room')
    description = models.CharField(max_length=255, null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Asset(models.Model):
    name = models.CharField(max_length=255)
    price = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class RoomAssetMapping(models.Model):
    room = models.ForeignKey(Room, on_delete=models.SET_NULL, null=True, blank=True,
                             related_name='roomassetmapping_room')
    asset = models.ForeignKey(Asset, on_delete=models.SET_NULL, null=True, blank=True)
    number_of_assets = models.IntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
