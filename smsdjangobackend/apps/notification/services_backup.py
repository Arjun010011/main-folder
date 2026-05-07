from django.conf import settings
import json
import requests
import re
from rest_framework.views import Response, exceptions

class NotificationService():

    #http://websms.bulksmscenter.in/
    """"    1 = Transactional Route, 2 = Promotional Route, 3 = Trans DND Route,
            7 = Transcrub Route, 8 = OTP Route, 9 = Trans Stock Route, 10 = Trans Property Route,
            11 = Trans DND Other Route, 12 = TransCrub Stock, 13 = TransCrub Property,
            14 = Trans Crub Route. (RouteId)
    """
    def send_sms(self, mobileNumbers, smsContent, routeId):
        defaultRouteIds = [1,2,3,7,8,9,10,11,12,13,14]
        if routeId not in defaultRouteIds:
            raise exceptions.ValidationError('Invalid Route ID')
        NotificationService.check_mobile_number_validation(mobileNumbers)
        NotificationService.validate_sms_content(smsContent)
        url = getattr(settings, "MESSAGING_URL", None)
        authKey = getattr(settings, "MESSAGING_AUTH_URL", None)
        querystring = {"AUTH_KEY":authKey}
        mobileNumbers = ','.join(map(str, mobileNumbers))
        payload = json.dumps({"smsContent":smsContent,"routeId":routeId,"mobileNumbers":mobileNumbers,"senderId":"edbrcz","signature":"signature","smsContentType":"english"})
        headers = {
            'Content-Type': "application/json",
            'Cache-Control': "no-cache"
        }
        response = requests.request("POST", url, data=payload, headers=headers, params=querystring)
        return response

    @staticmethod
    def validate_sms_content(smsContent):
        smsContent.replace('"','\\"')
        #nikhil want to replace / this with //// but right now not able to do


    @staticmethod
    def check_mobile_number_validation(mobileNumbers):
        for phoneno in mobileNumbers:
            if not re.compile("(0/91)?[6-9][0-9]{9}"):
                raise exceptions.ValidationError(f'Mobile Number ${phoneno} is not valid')
