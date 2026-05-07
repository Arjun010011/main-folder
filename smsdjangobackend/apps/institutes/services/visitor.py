import json
from django.db import transaction
from apps.institutes.models.visitor import Visitor, VisitorDocumentMapping
from apps.institutes.serializers import VisitorDocumentMappingSerializer
from apps.tenants.services.middlewares import get_current_db_name
from rest_framework.exceptions import ValidationError
from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService, UploadTypeService
from apps.users.models.user import User

def add_update_visitor_user_attendance(self, request):
    post_data = {}
    vis_obj = None
    with transaction.atomic(using=get_current_db_name()):
        if 'data' in request.data and request.data['data']:
            post_data = json.loads(request.data['data'])
        else:
            raise ValidationError('invalid data')
        if 'id' in post_data and post_data['id']:
            vis_obj = Visitor.objects.get(id=post_data['id'])
            if 'checkin' not in post_data:
                post_data['checkin'] = vis_obj.checkin.strftime('%Y-%m-%d %H:%M:%S')
            if 'reason' not in post_data:
                post_data['reason'] = vis_obj.reason.id
        if 'student' in post_data and post_data['student']:
            post_data['user'] = User.objects.filter(student=post_data['student']).first().id
        if 'staff' in post_data and post_data['staff']:
            post_data['user'] = User.objects.filter(staff=post_data['staff']).first().id
        if 'user' not in post_data:
            post_data['user'] = None
        if 'reason' not in post_data or not post_data['reason']:
            raise ValidationError('Reason is mandatory')
        if post_data['checkout'] and post_data['checkin'] > post_data['checkout']:
            raise ValidationError('Checkin time should be less than checkout')
        if 'id' in post_data and post_data['id']:
            temp = SharedService.update_data(self, post_data, **{'customObjectData': vis_obj, 'partial': True})
        else:
            temp = SharedService.add_data(self, post_data, False)
            mobile = str(temp['data']['mobile'])
            if not mobile.startswith('91'):
                mobile = '91' + mobile

            customized_data = [{
                'user_id': None,
                'mobile_number': mobile,
                'whatsapp_notification': 1,
                'whatsapp_body': None,
            }]
            print('customized_data',customized_data)
            send_notification(
                'visitor_management_create',
                body=None,
                customizedData=customized_data
            )
            
        visitor_id = temp['data']['id']
        if 'file' in request.data and request.data['file']:
            response_file = UploadTypeService.upload_file(self, {'file': request.data['file']})
            image_row = {
                    'document': response_file['data']['id'],
                    'visitor': visitor_id
            }
            if 'visitor_file_mapping_id' in request.data and request.data['visitor_file_mapping_id']:
                image_row['id'] = request.data['visitor_file_mapping_id']
            add_or_update_visitor_doc_mapping(self, image_row)
    return {'data': 'Data Saved Successfully'}
            
def add_or_update_visitor_doc_mapping(self, visitor_data):
    if 'id' in visitor_data and visitor_data['id']:
        instance= VisitorDocumentMapping.objects.get(id=visitor_data['id'])
        serializer = VisitorDocumentMappingSerializer(instance=instance, data=visitor_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = VisitorDocumentMappingSerializer(data=visitor_data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return serializer.data