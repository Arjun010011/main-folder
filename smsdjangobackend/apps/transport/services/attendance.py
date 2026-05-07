from datetime import date

from rest_framework import exceptions

from apps.shared.services import SharedService
from apps.transport.models import RideDetail
from apps.transport.services.ride import ride_status


def add_attendance(self, data):
    SharedService.duplicate_list_one_object(data['attendance'], 'user')
    ride_detail = RideDetail.objects.filter(route=data['route'], for_date=date.today(), is_active=True,
                                           type=data['type'])
    if not ride_detail:
        raise exceptions.ValidationError('Ride is not started.')
    if len(ride_detail) != 1:
        raise exceptions.ValidationError('Duplicate ride(s) found.')
    ride_detail = ride_detail.first()
    for attendance in data['attendance']:
        attendance.update({'ride_detail': ride_detail.pk})
    SharedService.add_data(self, data['attendance'])
    return {'Reason': 'Attendance is updated.', 'data': ride_status(self)['data']}
