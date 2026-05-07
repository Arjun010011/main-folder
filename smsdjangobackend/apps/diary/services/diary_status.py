from rest_framework import exceptions

from apps.diary.models import StaffDiary, StudentDiary
from apps.diary.services import diary


def check_permission(self, instance, status=None, user=None, **filter):
    user = user or self.request.user if self.request.user.pk else None
    if user.is_superuser:
        raise exceptions.ValidationError('Super user do not have permission to perform this action.')
    if user.pk != instance.created_user.pk:
        staffid = StaffDiary.objects.filter(diary=instance, **filter).values_list('staff', flat=True)
        if not user.student and user.staff.pk not in staffid:
            raise exceptions.ValidationError('User do not have permission to perform this action.')
        if self.request.user.student and status != diary.STATUS['SUBMITTED']:
            raise exceptions.ValidationError('User do not have permission to perform this action')


def update_diary_status(self, data, **kwargs):
    instance = self.get_object()
    check_permission(self, instance, data['status'], **{'evaluate': True})
    if self.request.user.student and self.request.user.student.id != data['student']:
        raise exceptions.ValidationError('You dont have permissions')
    if instance.status == diary.STATUS['COMPLETED']:
        raise exceptions.ValidationError('Home work status is completed. Unable to update the status.')
    if data:
        instance, created = StudentDiary.objects.get_or_create(diary=instance, student_id=data['student'])
        instance.status = data['status']
        instance.marks = data['marks']
    else:
        instance.status = diary.STATUS['COMPLETED']
    instance.save()
    return {'Reason': 'Status updated successfully.'}
