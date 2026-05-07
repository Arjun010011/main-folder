from datetime import datetime, timedelta

from django.db import transaction
from django.db.models import F, Q
from rest_framework import exceptions

from apps.diary.models import StudentDiary, Diary
from apps.diary.services.diary import STATUS
from apps.shared.models import document
from apps.shared.models.document import Document
from apps.shared.serializers import DocumentSerializer
from apps.shared.services import NotificationBodyTemplate, SharedService, UploadTypeService
from apps.students.models import Student, student
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.notification.services.notification_service import send_notification

DOCUMENT_TIME_FRAME = 15  # valid time in minutes for update or delete

def upload_diary_document(self, data):
    SharedService.duplicate_list_one_object(data['document_detail'], 'document')
    dataList = list()
    notification_obj = NotificationBodyTemplate('diary_chat_create')
    user = self.request.user if self.request.user.pk else None
    docList = list()
    to_user = User.objects.get(student=data['student']).pk if data['student'] else None
    notification_data = []
    for doc in data['document_detail']:
        dataList.append(
            {'diary': data['diary'], 'document': doc['document'], 'comment': doc['comment'], 'user': user.pk,
             'to_user': to_user})
        docList.append(doc['document'])
        if to_user and user.pk != to_user and doc['comment']:
            notification_data.append({
                'body': doc['comment'],
                'user': to_user,
                'body_push': doc['comment'],
                'body_email': doc['comment'],
                'body_sms': doc['comment'],
            })
        elif to_user and user.pk != to_user and doc['document']:
            temp = Document.objects.get(id=doc['document'])
            serializer = DocumentSerializer(instance=temp)
            notification_data.append({
                'body': serializer.data,
                'user': to_user,
                'body_push': serializer.data,
                'body_email': serializer.data,
                'body_sms': serializer.data,
            })
    with transaction.atomic(using=get_current_db_name()):
        diary = Diary.objects.get(id=data['diary'])
        if data['student_detail']:
            student = Student.objects.get(id=data['student_detail']['student'])
            instance, created = StudentDiary.objects.get_or_create(diary=diary, student=student)
            instance.status = data['student_detail']['status']
            instance.marks = data['student_detail']['marks']
            temp = {
                'status': instance.status,
                'marks': instance.marks,
                'student_name': student.first_name
            }
            body_email = notification_obj.select_template('email', temp)
            body_sms = notification_obj.select_template('sms', temp)
            body_push = notification_obj.select_template('push', temp)
            notification_data.append({
                'body_email': body_email,
                'user': User.objects.get(student=data['student_detail']['student']).id,
                'body_push': body_push,
                'body_sms': body_sms
            })
            instance.save()
        response = SharedService.add_data(self, dataList)
    SharedService.custom_thread(send_diary_notification, self, notification_data, diary)
    UploadTypeService.make_document_active(docList, True)
    return response

def send_diary_notification(self, notification_data, diary):
    customized_data = []
    for notification in notification_data:
        student_data = User.objects.get(id=notification['user'])
        extra_params = {'diaryId': diary.pk, 'studentId':student_data.student.id, 'screen': 'student_diary'}
        customized_data.append(
        {   'push_subject': 'HomeWork Chat Message', 'push_body': notification['body_push'], 'push_notification': 1,
            'user_id': notification['user'], 'extra_params': extra_params
        })
        customized_data.append({
            'mobile_number': student_data.student.mobile_num, 'sms_body': notification['body_sms'],
            'sms_notification': 1, 'user_id': notification['user']
        })
        if student_data.student.email:
            customized_data.append({'email': student_data.student.email, 'user_id': student_data.pk, 'email_subject': None,
                                   'email_body': notification['body_email'], 'email_notification':1 })
    if customized_data:
        send_notification('diary_chat_create', body=None, customizedData=customized_data)

def get_diary_document(self):
    queryset = self.filter_queryset(self.get_queryset())
    student_id = None
    if self.request.user.student:
        student_id = self.request.user.student
    elif self.request.GET.get('student'):
        student_id = self.request.GET.get('student')
    if student_id:
        user = User.objects.get(student=self.request.GET.get('student'))
        queryset = queryset.filter(Q(user=user) | Q(to_user=user))
    recent_fetched_id = self.request.GET.get('recent_fetched_id')
    if recent_fetched_id:
        queryset = queryset.filter(id__gt=recent_fetched_id)
    serializer = self.get_serializer(queryset, many=True)
    for data in serializer.data:
        data['update_expiry_time'] = datetime.strptime(data['created'], '%Y-%m-%dT%H:%M:%S.%f') + timedelta(minutes=15)
    return {'data': serializer.data}


def validate_data(self, user, action):
    instance = self.get_object()
    if instance.from_diary:
        raise exceptions.ValidationError(f'Cannot {action}.')
    queryset = self.get_queryset().filter(diary=instance.diary).order_by('-created')
    lastData = queryset.first()
    if lastData.user.pk != user:
        raise exceptions.ValidationError(f'Cannot {action} since other user updated.')
    lastGroup = list()
    for doc in queryset:
        if doc.user.pk != user:
            break
        lastGroup.append(doc.pk)
    timediff = datetime.now() - instance.created
    if (instance.pk not in lastGroup) or (timediff.seconds / 60) > DOCUMENT_TIME_FRAME:
        raise exceptions.ValidationError(f'Cannot {action} the older values.')


def update_diary_document(self, data, **kwargs):
    data['user'] = self.request.user.pk if self.request.user.pk else None
    validate_data(self, data['user'], 'update')
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, **kwargs)
        UploadTypeService.make_document_active(data['document'])
        return response


def delete_diary_document(self):
    user = self.request.user.pk if self.request.user.pk else None
    validate_data(self, user, 'delete')
    instance = self.get_object()
    instance.delete()
    return {'Reason': 'Data is deleted Successfully!'}
