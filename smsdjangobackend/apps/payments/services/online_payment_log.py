from django.contrib.contenttypes.models import ContentType
from apps.payments.models.online_payments import OnlinePaymentLog

def update_onlinepaymentlog(data):
    content_type = ContentType.objects.get_for_model(data['content_obj'])
    data = {'content_type': content_type, 'object_id': data['content_obj'].pk, 
            'request_token':data['request_token'],'response_token':data['response_token'] if 'response_token' in data else None,
            'request_type':data['request_type']}
    onlinepaymentlog = OnlinePaymentLog.objects.create(**data)
    onlinepaymentlog.save()