"""
Service for Application Form OTP and Temporary Authentication
"""
import base64
import pyotp
from datetime import datetime, timedelta, date
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import exceptions
from knox.models import AuthToken
from knox import settings as knox_settings

from apps.users.models import User, Otp
from apps.users.services.default_variables import OtpMessageFormat, OtpEmailFormat
from apps.institutes.models import Institute
from apps.notification.services.notification_service import send_notification
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name

INTERVAL = 300  # 5 minutes OTP validity


class generateKey:
    @staticmethod
    def returnValue(phone):
        return str(str(phone) + str(date.today()) + 'APPLICATION_FORM_671237723').lower()


def generate_application_otp(self, request):
    """
    Generate OTP for application form login
    Does not require existing user - allows any mobile number
    """
    
    mobile = request.data.get('mobile_num')
    if not mobile:
        raise exceptions.ValidationError('Mobile Number is required')
    
    # Validate mobile number format (basic validation)
    if len(mobile) < 10:
        raise exceptions.ValidationError('Invalid Mobile Number')
    
    # Create or get OTP record
    try:
        otpModel = Otp.objects.get(mobile_or_email=mobile)
    except ObjectDoesNotExist:
        otpModel = Otp.objects.create(mobile_or_email=mobile, is_email=False)
    
    otpModel.counter += 1
    otpModel.is_verified = 0
    otpModel.save()
    
    # Generate OTP
    keygen = generateKey()
    key = base64.b32encode(keygen.returnValue(mobile).encode())
    otp = pyotp.TOTP(key, interval=INTERVAL)
    otp_value = otp.now()
    
    # Send OTP via SMS
    companyName = Institute.get_institute(self).name
    vendor_detail = None
    try:
        from apps.notification.models import NotificationVendor
        vendor_detail = NotificationVendor.objects.filter(notification_medium='sms', is_active=True).first()
    except:
        pass
    
    sms_brand_name = 'Edubricz'
    if vendor_detail and vendor_detail.brand_name:
        sms_brand_name = vendor_detail.brand_name
    
    body = OtpMessageFormat.format(
        otp=otp_value, 
        institute_name=companyName, 
        sms_brand_name=sms_brand_name
    )
    print(body,'databody')
    
    # Send SMS directly using vendor configuration to bypass NotificationApiConfiguration requirement
    try:
        from apps.notification.services.notification_service import get_sms_vendor, post_to_notification
        
        institute = Institute.get_institute(self)
        sms_vendor, sender_id = get_sms_vendor()
        
        # Create notification format directly
        notification_data = {
            "notification_entity": {
                "user_id": None,
                "company_id": institute.company_id,
                "channel": "sms",
                "vendor": sms_vendor,
                "client": sms_vendor,
                "priority": "medium",
                "sender_id": sender_id,
                "channel_data": {
                    "to": [mobile],
                    "data": body,
                    "body": body
                }
            }
        }
        
        # Send notification directly
        post_to_notification([notification_data], 'otpforemail__retrive')
    except Exception as e:
        # Log error but don't fail the OTP generation
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error sending OTP SMS to {mobile}: {str(e)}", exc_info=True)
        # Try fallback to send_notification if direct method fails
        try:
            send_notification(
                'otpforemail__retrive',
                '',
                [],
                [{'mobile_number': mobile, 'user_id': None, 'sms_body': body, 'sms_notification': 2}],
                allowableMedium=['sms']
            )
        except Exception as fallback_error:
            logger.error(f"Fallback send_notification also failed: {str(fallback_error)}", exc_info=True)
            # Still return success since OTP was generated, just SMS sending failed
            pass
    
    return {'Reason': 'OTP sent successfully to your mobile number'}


def verify_application_otp(self, request):
    """
    Verify OTP and create temporary session token for application form
    Returns a temporary token that can be used to submit application form
    """
    
    mobile = request.data.get('mobile_num')
    otp = request.data.get('otp')
    
    if not mobile or not otp:
        raise exceptions.ValidationError('Mobile Number and OTP are required')
    
    try:
        otpModel = Otp.objects.filter(mobile_or_email=mobile).last()
        if not otpModel:
            raise exceptions.ValidationError('OTP not found. Please request a new OTP')
    except Exception as e:
        raise exceptions.ValidationError('Invalid OTP')
    
    # Verify OTP
    keygen = generateKey()
    key = base64.b32encode(keygen.returnValue(mobile).encode())
    otp_key = pyotp.TOTP(key, interval=INTERVAL)
    
    if not otp_key.verify(otp):
        raise exceptions.ValidationError('Invalid OTP')
    
    # Mark OTP as verified
    otpModel.is_verified = True
    otpModel.save()
    
    # Create or get a temporary user for application form
    # Use a special username format to identify application form users
    temp_username = f'application_form_{mobile}'
    
    try:
        # Try to get existing temporary user
        temp_user = User.objects.get(username=temp_username)
        if not temp_user.is_active:
            temp_user.is_active = True
            temp_user.save()
        # Update mobile number if it's different
        if hasattr(temp_user, 'application_profile'):
            profile = temp_user.application_profile
            if profile.mobile_num != mobile:
                profile.mobile_num = mobile
                profile.save()
    except User.DoesNotExist:
        # Create temporary user for application form
        temp_user = User.objects.create(
            username=temp_username,
            is_active=True,
            is_staff=False,
            is_superuser=False
        )
        # Set a random password (not used for login)
        temp_user.set_unusable_password()
        temp_user.save()
        
        # Create profile for the user
        try:
            from apps.forms.models.applicationStudent import ApplicationUserProfile
            ApplicationUserProfile.objects.get_or_create(
                user=temp_user,
                defaults={'mobile_num': mobile}
            )
        except Exception as e:
            # If ApplicationUserProfile doesn't exist, log warning
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not create profile: {str(e)}")
    
    # Create temporary token (valid for 24 hours for application form)
    token_ttl = timedelta(hours=24)
    instance, token = AuthToken.objects.create(temp_user, token_ttl)
    
    return {
        'Reason': 'OTP verified successfully',
        'data': {
            'token': token,
            'expiry': instance.expiry,
            'mobile_num': mobile
        }
    }

