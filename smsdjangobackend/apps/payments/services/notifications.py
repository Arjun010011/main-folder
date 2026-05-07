from django.conf import settings

from apps.users.models import User
from apps.institutes.models.institute import Institute
from apps.notification.services.notification_service import send_notification

def payout_status_update_failure_notification(self, payout_obj, error):
    EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)
    institute_obj = Institute.objects.all().first()
    super_admin_ids = User.objects.filter(
        is_superuser=True, staff__email__isnull=False
    ).values_list('id')
    super_admin_ids = list(super_admin_ids)

    body = f'Payout status update Failed for order id: {payout_obj.payout_order_id} and amount: {payout_obj.amount}. Resolve the error(s) and upload it again.'
    bodyFormat = f'Hi,<br/><br/>{body}<br/><br/>Error details:<br/> {str(error)} <br/><br/>Thanks,<br/>Edubricz'

    customizedData = [
        {'email': EMAIL_HOST_USER, 'user_id': self.request.user.pk, 'email_body': '',
         'email_subject': f'Payout failed for {institute_obj.name}({institute_obj.code})'}
    ]
    send_notification('payout_error', bodyFormat,
                      touserIds=super_admin_ids, customizedData=customizedData)

def send_fee_collection_payout_failure_notification(self, payout_obj, error):
    EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)
    institute_obj = Institute.objects.all().first()
    super_admin_ids = User.objects.filter(
        is_superuser=True, staff__email__isnull=False
    ).values_list('id')
    super_admin_ids = list(super_admin_ids)

    body = f'Payout is Failed for order id: {payout_obj.payout_order_id} and amount: {payout_obj.amount}. Resolve the error(s) and upload it again.'
    bodyFormat = f'Hi,<br/><br/>{body}<br/><br/>Error details:<br/> {str(error)} <br/><br/>Thanks,<br/>Edubricz'

    customizedData = [
        {'email': EMAIL_HOST_USER, 'user_id': self.request.user.pk, 'email_body': '',
         'email_subject': f'Payout failed for {institute_obj.name}({institute_obj.code})'}
    ]
    send_notification('payout_error', bodyFormat,
                      touserIds=super_admin_ids, customizedData=customizedData)

def send_low_balance_notification(self, balance, amount, fee_collection_ids):
    EMAIL_HOST_USER = getattr(settings, 'EMAIL_HOST_USER', None)
    institute_obj = Institute.objects.all().first()
    super_admin_ids = User.objects.filter(
        is_superuser=True, staff__email__isnull=False
    ).values_list('id')
    super_admin_ids = list(super_admin_ids)

    body = f'''
        Found low balance in cashfree: {balance}.<br/>
        amount trying credit: {amount}.<br/>
        Trying to settle fee_collection ids {str(fee_collection_ids)}
    '''

    bodyFormat = f'Hi,<br/><br/>{body}<br/><br/>Thanks,<br/>Edubricz'

    customizedData = [
        {'email': EMAIL_HOST_USER, 'user_id': self.request.user.pk, 'email_body': '',
         'email_subject': f'Low cashfree balance for {institute_obj.name}({institute_obj.code})'}
    ]
    send_notification('low_balance_error', bodyFormat,
                      touserIds=super_admin_ids, customizedData=customizedData)
