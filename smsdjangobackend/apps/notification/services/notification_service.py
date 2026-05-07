from datetime import datetime,timedelta
import json
import copy
from django.db import transaction
from django.db.models import Q
import pyexcel
import copy
import re
from copy import deepcopy
import os
from math import ceil

from rest_framework.exceptions import ValidationError
from apps.classes.models.enrollment import Enrollment, StudentStandardMapping
from apps.institutes.models.academicYear import AcademicYear
from apps.institutes.models.resource import ResourceFailureLog, Resource

from apps.institutes.services.resource import validate_and_update_resource
from apps.notification.email_formats import default_email_body_format, default_email_body_params
from apps.notification.models import NotificationApiConfiguration
from apps.notification.default_variables import NotificationSupportedApis
from apps.notification.models.notification import BulkNotificationCategory, BulkNotificationUsers, NotificationMedium, NotificationTypeMapping, NotificationVendor
from apps.notification.serializers import BulkNotificationDocumentMappingSerializer, NotificationApiConfigurationSerializer, NotificationLogSerializer
from apps.institutes.models import Institute
from apps.transport.models.route import RouteUserPickupMapping,RouteUserDropMapping
from apps.shared.models import Document
from apps.shared.serializers import DocumentSerializer
from apps.shared.services_shared.common import get_full_name
from apps.students.models.student import Student, StudentSiblingMapping
from apps.students.models.studentDetail import ParentDetail, StudentParentMapping
from apps.students.serializers import StudentParentDetailsSerializer, StudentSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models import User
from apps.shared.utils import http_request
from django.conf import settings
from apps.shared.services import SharedService,NotificationBodyTemplate,PDFService, UploadTypeService
from apps.users.serializers import UserReadSerializer
from apps.users.encrypt_decrypt import encrypt_password,decrypt_password
from apps.shared.services_shared.common import get_selected_template

NOTIFICATION_BACKEND_URL = getattr(settings, 'NOTIFICATION_BACKEND_URL', None)

NO_BALANCE_TEXT = 'no_balance'
DEFAULT_SMS_VENDOR = 'jtg'
DEFAULT_SENDER_ID = 'EDUBRZ'

def get_sms_vendor():
    notification_vendor = NotificationVendor.objects.filter(is_active=True, notification_medium='sms')
    if notification_vendor:
        notification_vendor = notification_vendor.first()
        return notification_vendor.vendor_name, notification_vendor.sender_id
    return DEFAULT_SMS_VENDOR, DEFAULT_SENDER_ID

def get_notification_post_format(subject='', toIds=[], body='', priority='low', type='email', template_id='',extra_params={}):
    whatsapp_vendor=NotificationVendor.objects.filter(is_active=True, notification_medium='whatsapp')
    whatsapp_vendor_name = 'apichat'
    if whatsapp_vendor:
        whatsapp_vendor=whatsapp_vendor.first()
        whatsapp_vendor_name = whatsapp_vendor.vendor_name
   
    
    
        
    sender_id = None
    if type == 'push':
        channel = 'push'
        client = 'fcm'
        vendor = 'fcm'
        channelData= {
                'messageType': '',
                'subject': subject,
                'to': toIds,
                'cc': [],
                'body': body,
                'attachmentLinks': [],
                'extra_params': {}
        }
    elif type == 'whatsapp':
        channel = 'whatsapp'
        client = whatsapp_vendor_name
        vendor = whatsapp_vendor_name
        channelData= {
                'to': toIds,
                'message': body,
                'template_id': template_id,
                'extra_params': extra_params
        }
    elif type == 'sms':
        sms_vendor, sender_id = get_sms_vendor()
        channel = 'sms'
        client = sms_vendor
        vendor = sms_vendor
        channelData= {
                "to": [
                toIds
                ],
                "data": body
        }
    else:
        vendor = 'ses'
        client = 'ses'
        channel = 'email'
        channelData= {
                'messageType': '',
                'subject': subject,
                'to': toIds,
                'cc': [],
                'body': body,
                'attachmentLinks': [],
                'extra_params': {}
        }
    return {
        'notification_entity': {
            'user_id': None,
            'company_id': Institute.get_institute(None).company_id,
            'channel': channel,
            'vendor': vendor,
            'client': client,
            'priority': priority,
            'channel_data': channelData,
            'sender_id': sender_id
        }
    }

def email_sending_format(emailConfigData, apiName, body, attachmentLinks):
    jsonConfigData = NotificationSupportedApis[apiName]
    emailConfigData['default_to_fetching_fields'] = jsonConfigData['default_to_fetching_fields']
    sendingFormat = get_notification_post_format(
        emailConfigData['subject'], [], body, jsonConfigData['priority'])
    if not body:
        body=f'{default_email_body_format}' % {**default_email_body_params,
                                                 'message': jsonConfigData['data_to_save']['default_email_message']}
    sendingFormat['notification_entity']['channel_data']['attachmentLinks'] = attachmentLinks
    return emailConfigData, sendingFormat

def sms_sending_format(smsConfigData, apiName, body):
    jsonConfigData = NotificationSupportedApis[apiName]
    smsConfigData['default_to_fetching_fields'] = jsonConfigData['default_to_fetching_fields']
    sendingFormat = get_notification_post_format(
        '', [], body, jsonConfigData['priority'],type='sms')
    return smsConfigData, sendingFormat

def whatsapp_sending_format(whatsappConfigData, apiName, body):
    jsonConfigData = NotificationSupportedApis[apiName]
    whatsappConfigData['default_to_fetching_fields'] = jsonConfigData['default_to_fetching_fields']
    sendingFormat = get_notification_post_format(
        '', [], body, jsonConfigData['priority'],type='whatsapp', template_id=whatsappConfigData['template_id'],extra_params=whatsappConfigData['extra_params'])
    return whatsappConfigData, sendingFormat

def push_sending_format(pushConfigData, apiName, body, attachmentLinks):
    jsonConfigData=NotificationSupportedApis[apiName]
    sendingFormat=get_notification_post_format(pushConfigData['subject'], [], body, jsonConfigData['priority'],
                                                 'push')
    if not body:
        body=f'{default_email_body_format}' % {**default_email_body_params,
                                                 'message': jsonConfigData['data_to_save']['default_push_message']}
    sendingFormat['notification_entity']['channel_data']['attachmentLinks'] = attachmentLinks
    return sendingFormat


"""
    Override config is user to override the default behaviours examples : priority, email_subject
    If touserIds are empty please send customizedData with email and user_id
    customizeddata email
    [
        {   'email' : 'test@gmail.com', 'mobile_number' : '91 9880230012', user_id: 1, 'email_subject' : 'data', 'email_body' : 'body',
        },
        {
            'push_subject' : '', 'push_body' : '', push_notification: 1, user_id: 1,
        },
        {
            'mobile_number' : '', 'sms_body': '', sms_notification: 1, user_id: 1
        }
        if email body not sent we fetch the body from params
    ]
    'push_notification' : 1 -> send this flag for push notification:
    Required fields : user_id, push_subject, push_body
    by default it will be email

    pushData = {'extra_params' : {}, 'push_body' : '' } -> if body is different from the orginal body
"""


def send_notification(apiName, body=None, touserIds=[], customizedData=[], attachmentLinks=[], pushData={}, allowableMedium=[
    'email', 'push', 'sms', 'whatsapp'
]):
    queryset = NotificationApiConfiguration.objects.filter((Q(enable_for_school = True) |Q(enable_for_otherusers=True)),api_name = apiName)
    serializer=NotificationApiConfigurationSerializer(queryset, many = True)
    response={}
    notificationdata=[]
    ccUserIds={}
    if queryset:
        emailEnabled=False
        smsEnabled=False
        pushEnabled=False
        whatsappEnabled=False
        mobileConfigData={}
        emailConfigData={}
        pushConfigData={}
        whatsappEnabled={}
        groupIds={}
        emailCustomizedData=[]
        pushCustomizedData=[]
        smsCustomizedData=[]
        whatsappCustomizedData=[]
        ccUserIds['email']=[]
        ccUserIds['sms']=[]
        ccUserIds['push']=[]
        ccUserIds['webpush']=[]
        ccUserIds['whatsapp']=[]
        groupIds['email']=[]
        groupIds['sms']=[]
        groupIds['push']=[]
        groupIds['webpush']=[]
        groupIds['whatsapp']=[]
        touserIds=list(set(touserIds))
        for configData in serializer.data:
            if configData['users']:
                ccUserIds[configData['notification_medium']] += configData['users']
            for groupId in configData['groups']:
                groupIds[configData['notification_medium']].append(groupId)
                tempIds=User.objects.filter(groups__in = groupIds[configData['notification_medium']]).values_list('id', flat = True)
                ccUserIds[configData['notification_medium']] += list(tempIds)
            if configData['notification_medium'] == 'email' and 'email' in allowableMedium:
                emailEnabled=True
                emailConfigData=configData
            if configData['notification_medium'] == 'sms' and 'sms' in allowableMedium:
                smsEnabled=True
                mobileConfigData=configData
            if configData['notification_medium'] == 'push' and 'push' in allowableMedium:
                pushEnabled=True
                pushConfigData=configData
            if configData['notification_medium'] == 'whatsapp' and 'whatsapp' in allowableMedium:
                whatsappEnabled=True
                whatsappConfigData=configData
        for configData in serializer.data:
            ccUserIds[configData['notification_medium']]=list(set(ccUserIds[configData['notification_medium']]))
            for t in customizedData:
                if 'push_notification' in t and t['push_notification'] and configData['enable_for_school'] and configData['notification_medium']=='push':
                    pushCustomizedData.append(t)
                elif 'sms_notification' in t and t['sms_notification'] and configData['enable_for_school'] and configData['notification_medium']=='sms':
                    smsCustomizedData.append(t)
                elif 'email_notification' in t and t['email_notification'] and configData['enable_for_school'] and configData['notification_medium']=='email':
                    emailCustomizedData.append(t)
                elif 'whatsapp_notification' in t and t['whatsapp_notification'] and configData['enable_for_school'] and configData['notification_medium']=='whatsapp':
                    whatsappCustomizedData.append(t)
                if ccUserIds[configData['notification_medium']]:
                    tempUserList = User.objects.filter(id__in=ccUserIds[configData['notification_medium']]).values('id', 'is_staff', 'staff', 'student',
                                                                        'staff__email', 'student__email', 'staff__mobile_num', 'student__mobile_num')
                    for user_obj in tempUserList:
                        cc_user_id = user_obj['id']
                        email_id = None
                        mobile_num = None
                        if user_obj['staff__email']:
                            email_id = user_obj['staff__email']
                        elif user_obj['student__email']:
                            email_id = user_obj['student__email']
                        if user_obj['staff__mobile_num']:
                            mobile_num = user_obj['staff__mobile_num']
                        elif user_obj['student__mobile_num']:
                            mobile_num = user_obj['student__mobile_num']
                        if 'push_notification' in t and t['push_notification'] and \
                            'push_body_for_others' in t and t['push_body_for_others'] and \
                            configData['notification_medium']=='push' and configData['enable_for_otherusers']:
                            copy_temp_push = copy.copy(t)
                            copy_temp_push['push_body'] = copy_temp_push['push_body_for_others']
                            copy_temp_push['user_id'] = cc_user_id
                            pushCustomizedData.append(copy_temp_push)
                        elif mobile_num and 'sms_notification' in t and t['sms_notification'] and \
                            'sms_body_for_others' in t and t['sms_body_for_others'] and \
                            configData['notification_medium']=='sms'and configData['enable_for_otherusers']:
                            copy_temp_sms = copy.copy(t)
                            copy_temp_sms['sms_body'] = copy_temp_sms['sms_body_for_others']
                            copy_temp_sms['user_id'] = cc_user_id
                            copy_temp_sms['mobile_number'] = mobile_num
                            smsCustomizedData.append(copy_temp_sms)
                        elif email_id and  'email_notification' in t and t['email_notification'] and \
                            'email_body_for_others' in t and t['email_body_for_others'] and \
                            configData['notification_medium']=='email'and configData['enable_for_otherusers']:
                            copy_temp_email = copy.copy(t)
                            copy_temp_email['email_body'] = copy_temp_email['email_body_for_others']
                            copy_temp_email['user_id'] = cc_user_id
                            copy_temp_email['email'] = email_id
                            emailCustomizedData.append(copy_temp_email)
                        elif mobile_num and  'whatsapp_notification' in t and t['whatsapp_notification'] and \
                            'whatsapp_body_for_others' in t and t['whatsapp_body_for_others'] and \
                            configData['notification_medium']=='whatsapp'and configData['enable_for_otherusers']:
                            copy_temp_whatsapp = copy.copy(t)
                            copy_temp_whatsapp['whatsapp_body'] = copy_temp_email['email_body_for_others']
                            copy_temp_whatsapp['user_id'] = cc_user_id
                            copy_temp_whatsapp['mobile_number'] = mobile_num
                            whatsappCustomizedData.append(copy_temp_whatsapp)
        if emailEnabled:
            notificationdata += send_notification_email(emailConfigData, apiName, touserIds, body, emailCustomizedData,
                                                        attachmentLinks )
        if whatsappEnabled:
            notificationdata += send_notification_whatsapp(whatsappConfigData, apiName, touserIds, body, whatsappCustomizedData,
                                                        attachmentLinks )
        if smsEnabled:
            notificationdata += send_notification_sms(
                mobileConfigData, apiName, touserIds, body, smsCustomizedData)
        if pushEnabled:
            if 'push_body' in pushData:
                body=pushData['push_body']
            print('hiiii')
            notificationdata += send_push_notification(pushConfigData, apiName, touserIds, body, pushCustomizedData,
                                                        attachmentLinks, pushData)
        if notificationdata:
            post_to_notification(notificationdata, apiName)
    return response


def get_email_list(touserIds, configedData):
    touserIds=list(set(touserIds))
    if configedData['default_to_fetching_fields']['email']:
        userList=User.objects.filter(id__in = touserIds).values(configedData['default_to_fetching_fields']['email'],
                                                                'id')
    else:
        tempUserList=User.objects.filter(id__in = touserIds).values('id', 'is_staff', 'staff', 'student',
                                                                    'staff__email', 'student__email')
        for user in tempUserList:
            if user['is_staff']:
                user['default_email']=user['staff__email']
            else:
                user['default_email']=user['student__email']
        userList=tempUserList
    return userList

def get_mobilenum_list(touserIds, configedData):
    touserIds=list(set(touserIds))
    if configedData['default_to_fetching_fields']['sms']:
        userList=User.objects.filter(id__in = touserIds).values(configedData['default_to_fetching_fields']['sms'],
                                                                'id')
    else:
        tempUserList=User.objects.filter(id__in = touserIds).values('id', 'is_staff', 'staff', 'student',
                                                                    'staff__mobile_num', 'student__mobile_num')
        for user in tempUserList:
            if user['is_staff']:
                user['default_mobile_num']=user['staff__mobile_num']
            else:
                user['default_mobile_num']=user['student__mobile_num']
        userList=tempUserList
    return userList

def send_notification_sms(smsConfigData, apiName, touserIds=[], body=None, customizedData=[]):
    configedData, sendingFormat = sms_sending_format(smsConfigData, apiName, body)
    mobileNumberList = []
    if customizedData:
        for customData in customizedData:
            tempFormat = copy.deepcopy(sendingFormat)
            tempFormat['notification_entity']['channel_data']['to'] = [customData['mobile_number']]
            tempFormat['notification_entity']['user_id'] = customData['user_id']
            if customData['sms_body']:
                tempFormat['notification_entity']['channel_data']['body'] = customData['sms_body']
            mobileNumberList.append(tempFormat)
    if touserIds:
        userList = get_mobilenum_list(touserIds, configedData)
        if userList:
            for userData in userList:
                tempFormat = copy.deepcopy(sendingFormat)
                mobileNum = None
                if 'default_mobile_num' in userData and userData['default_mobile_num']:
                    mobileNum = userData['default_mobile_num']
                elif configedData['default_to_fetching_fields']['sms'] in userData and userData[
                    configedData['default_to_fetching_fields']['sms']]:
                    mobileNum = userData[configedData['default_to_fetching_fields']['sms']]
                if mobileNum:
                    tempFormat['notification_entity']['channel_data']['to'] = [mobileNum]
                    tempFormat['notification_entity']['user_id'] = userData['id']
                mobileNumberList.append(tempFormat)
    return mobileNumberList

def send_notification_whatsapp(whatsappConfigData, apiName, touserIds=[], body=None, customizedData=[],attachmentLinks=[]):
    configedData, sendingFormat = whatsapp_sending_format(whatsappConfigData, apiName, body)
    mobileNumberList = []
    if customizedData:
        for customData in customizedData:
            tempFormat = copy.deepcopy(sendingFormat)
            tempFormat['notification_entity']['channel_data']['to'] = [customData['mobile_number']]
            tempFormat['notification_entity']['user_id'] = customData['user_id']
            if customData['whatsapp_body']:
                tempFormat['notification_entity']['channel_data']['body'] = customData['whatsapp_body']
                tempFormat['notification_entity']['channel_data']['template_id'] = customData['whatsapp_template_id']
                tempFormat['notification_entity']['channel_data']['field_value'] = customData['whatsapp_field_value']
                tempFormat['notification_entity']['channel_data']['contact'] = customData['whatsapp_contact_details']
            mobileNumberList.append(tempFormat)
    if touserIds:
        userList = get_mobilenum_list(touserIds, configedData)
        if userList:
            for userData in userList:
                tempFormat = copy.deepcopy(sendingFormat)
                mobileNum = None
                if 'default_mobile_num' in userData and userData['default_mobile_num']:
                    mobileNum = userData['default_mobile_num']
                elif configedData['default_to_fetching_fields']['whatsapp'] in userData and userData[
                    configedData['default_to_fetching_fields']['whatsapp']]:
                    mobileNum = userData[configedData['default_to_fetching_fields']['whatsapp']]
                if mobileNum:
                    tempFormat['notification_entity']['channel_data']['to'] = [mobileNum]
                    tempFormat['notification_entity']['user_id'] = userData['id']
                mobileNumberList.append(tempFormat)
    return mobileNumberList

def send_notification_email(emailConfigData, apiName, touserIds=[], body=None, customizedData=[], attachmentLinks=[]):
    try:
        company_name = Institute.get_institute(None).name
    except:
        company_name = 'Unknown'
    configedData, sendingFormat = email_sending_format(emailConfigData, apiName, body, attachmentLinks)
    emailList = []
    if customizedData:
        for customData in customizedData:
            tempFormat = copy.deepcopy(sendingFormat)
            tempFormat['notification_entity']['channel_data']['to'] = customData['email'] if isinstance(customData['email'], list) else [customData['email']]
            tempFormat['notification_entity']['user_id'] = customData['user_id']
            if 'attachmentLinks' in customData and customData['attachmentLinks']:
                tempFormat['notification_entity']['channel_data']['attachmentLinks'] = customData['attachmentLinks']
            if 'email_subject' in customData and customData['email_subject']:
                tempFormat['notification_entity']['channel_data']['subject'] = company_name.upper() + ' | ' +customData['email_subject']
            if customData['email_body']:
                tempFormat['notification_entity']['channel_data']['body'] = customData['email_body']
            emailList.append(tempFormat)
    if touserIds:
        userList = get_email_list(touserIds, configedData)
        if userList:
            for userData in userList:
                tempFormat = copy.deepcopy(sendingFormat)
                emailId = None
                if 'default_email' in userData and userData['default_email']:
                    emailId = userData['default_email']
                elif configedData['default_to_fetching_fields']['email'] in userData and userData[
                    configedData['default_to_fetching_fields']['email']]:
                    emailId = userData[configedData['default_to_fetching_fields']['email']]
                if emailId:
                    tempFormat['notification_entity']['channel_data']['to'] = [emailId]
                    tempFormat['notification_entity']['channel_data']['subject'] = company_name.upper() +' | '+tempFormat['notification_entity']['channel_data']['subject']
                    tempFormat['notification_entity']['user_id'] = userData['id']
                emailList.append(tempFormat)
    return emailList

def send_push_notification(pushConfidata, apiName, touserIds=[], body=None, customizedData=[], attachmentLinks=[],
                           pushData={}):
    sendingFormat = push_sending_format(pushConfidata, apiName, body, attachmentLinks)
    pushDataList = []
    if customizedData:
        tempUserId = {}
        for customData in customizedData:
            temp_format = copy.deepcopy(sendingFormat)
            temp = str(customData['user_id']) + '' + str(customData['push_subject'])
            if temp in tempUserId:
                continue
            tempUserId[temp] = ''  # avoid duplicate push for same user
            temp_format['notification_entity']['user_id'] = customData['user_id']
            user_obj = User.objects.get(id=customData['user_id'])
            sibling_user_ids = []
            if user_obj.student:
                sib = StudentSiblingMapping()
                sibling_data = sib.get_student_sibling_data([user_obj.student.id])
                if user_obj.student.id in sibling_data and 'sibling_list' in sibling_data[user_obj.student.id]:
                    sibling_user_ids = [sib['user_id'] for sib in sibling_data[user_obj.student.id]['sibling_list']]
            if customData['push_subject']:
                temp_format['notification_entity']['channel_data']['subject'] = customData['push_subject']
            if customData['push_body']:
                temp_format['notification_entity']['channel_data']['body'] = customData['push_body']
            temp_format['notification_entity']['channel_data']['sibling_user_ids'] = sibling_user_ids
            temp_format['notification_entity']['channel_data']['extra_params'] = customData['extra_params'] if 'extra_params' in customData else None
            # customData['extra_params'] if 'extra_params' in customData else {}
            pushDataList.append(temp_format)
    if touserIds:
        for user_id in touserIds:
            user_obj = User.objects.get(id=user_id)
            sibling_user_ids = []
            if user_obj.student:
                sib = StudentSiblingMapping()
                sibling_data = sib.get_student_sibling_data([user_obj.student.id])
                if user_obj.student.id in sibling_data and 'sibling_list' in sibling_data[user_obj.student.id]:
                    sibling_user_ids = [sib['user_id'] for sib in sibling_data[user_obj.student.id]['sibling_list']]
            temp_format = copy.deepcopy(sendingFormat)
            temp_format['notification_entity']['channel_data']['sibling_user_ids'] = sibling_user_ids
            temp_format['notification_entity']['user_id'] = user_id
            # pushData['extra_params'] if 'extra_params' in pushData else {}
            pushDataList.append(temp_format)
    return pushDataList


def send_email(emailIds, subject, body):
    sendingFormat = get_notification_post_format(subject, emailIds, body)
    return post_to_notification([sendingFormat])


def register_push(self, data, userId=None):
    kwargs = SharedService.get_notification_header()
    inst = Institute.objects.first()
    data['company_id'] = inst.company_id
    data['company_code'] = inst.code
    data['user_id'] = userId if userId else self.request.user.id
    url = NOTIFICATION_BACKEND_URL + 'notification/fcmregister/'
    response = http_request('POST', url, json.dumps(data), **kwargs)
    return response.json()

def unregister_push(self, data):
    kwargs = SharedService.get_notification_header()
    url = NOTIFICATION_BACKEND_URL + 'notification/unregisterfcm/'
    response = http_request('POST', url, json.dumps(data), **kwargs)
    return response.json()

def contains_non_english(text):
    # Match any character that is not a-z or A-Z or common punctuation/space
    return bool(re.search(r'[^a-zA-Z0-9\s.,!?;:\'"/()\[\]{}@#%&*-]', text))

def post_to_notification(dataList, api_name=''):
    ignore_resource_check = False
    if api_name == 'otpforemail__retrive':
        ignore_resource_check = True
    from apps.institutes.services.resource import available_resource_check
    smsIndexes = []
    emailIndexes = []
    pushIndexes = []
    webPushIndexes = []
    whatsappIndexes =[]
    ivrIndexes = []
    for index,notificationEntity in enumerate(dataList):
        notificationEntity = notificationEntity['notification_entity']
        if notificationEntity['channel'] == 'sms':
            smsIndexes.append(index)
        elif notificationEntity['channel'] == 'email':
            emailIndexes.append(index)
        elif notificationEntity['channel'] == 'push':
            pushIndexes.append(index)
        elif notificationEntity['channel'] == 'webpush':
            webPushIndexes.append(index)
        elif notificationEntity['channel'] == 'whatsapp':
            whatsappIndexes.append(index)
        elif notificationEntity['channel'] == 'ivr':
            ivrIndexes.append(index)
        else:
            raise ValidationError("Unknown channel")
    channel_indexes = {
        'email': emailIndexes,
        'sms': smsIndexes,
        'push': pushIndexes,
        'webpush': webPushIndexes,
        'whatsapp': whatsappIndexes,
        'ivr': ivrIndexes
    }
    for channel, index_list in channel_indexes.items():
        if not index_list:
            continue
        if not ignore_resource_check:
            try:
                validate_and_update_resource(
                    medium=channel,
                    total_users=len(index_list),
                    data=dataList[index_list[0]],  # one sample for message length
                    document_list=dataList[index_list[0]]['notification_entity']['channel_data'].get('attachmentLinks', []),
                    update=True
                )
            except Exception as e:
                failedList = [dataList[i] for i in index_list]
                for i in sorted(index_list, reverse=True):
                    del dataList[i]
                ResourceFailureLog.objects.create(
                    resource=Resource.objects.filter(name=channel).first(),
                    failed_json=json.dumps(failedList),
                    failed_reason='no_balance'
                )
    if len(dataList) > 0:
        dataList = add_to_notifcation_log(dataList, api_name)
        kwargs = SharedService.get_notification_header()
        url = NOTIFICATION_BACKEND_URL + 'notification/sendnotification/'
        response = http_request('POST', url, json.dumps(dataList), **kwargs)
        if response.status_code != 200:
            ResourceFailureLog.objects.create(**{
                'failed_json': json.dumps(dataList),
                'failed_reason': f'Error from server: {response.json()}'
            })
            raise ValidationError(f'Error from server: {response.json()}')
        return response
    else:
        raise ValidationError('Nothing to save / Package over')


def get_notification_list(self, request):
    notification_type = self.request.GET.get('notification_type')
    read_only = self.request.GET.get('read_only')
    unread_only = self.request.GET.get('unread_only')
    from_date = self.request.GET.get('from_date')
    is_circular = self.request.GET.get('circular')
    bulk_notification_category = self.request.GET.get('bulk_notification_category')
    if is_circular and not bulk_notification_category:
        raise ValidationError('bulk_notification_category is mandatory when for circular')
    to_date = self.request.GET.get('to_date', datetime.now().date().strftime('%Y-%m-%d'))
    queryset = self.filter_queryset(self.get_queryset()).order_by('-created')
    filter_query = {
        'user': self.request.user.id
    }
    if from_date:
        filter_query['created__date__gte'] = from_date
    if to_date:
        filter_query['created__date__lte'] = to_date
    if read_only:
        filter_query['is_read_by_user'] = True
    if unread_only:
        filter_query['is_read_by_user'] = False
    if notification_type:
        notification_type_list = NotificationTypeMapping.objects.filter(notification_type__name=notification_type).values_list('api_name', flat=True)
        filter_query['api_name__in'] = notification_type_list
    if is_circular:
        filter_query['notification_type'] = 2
        filter_query['bulk_notification_category'] = bulk_notification_category
    queryset = queryset.filter(**filter_query)
    serializer = self.get_serializer(queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                              self.request.GET.get('limit'),
                                                              self.request.GET.get('pageno'))
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}

def add_to_notifcation_log(notification_list, api_name):
    post_data = []
    obj = NotificationTypeMapping.objects.filter(api_name=api_name)
    notification_type = ''
    if obj:
        notification_type = obj.first().notification_type.name
    for data in notification_list:
        user_id = data['notification_entity']['user_id'] if data['notification_entity']['company_id'] else None
        transaction_id = data['transaction_id'] if 'transaction_id' in data else SharedService.generate_random_number()
        post_data.append(
            {'notification_type': notification_type, 'notification_medium': data['notification_entity']['channel'],
            'channel_data': data['notification_entity']['channel_data'], 'user': user_id,
            'api_name': api_name, 'transaction_id': transaction_id
            }
        )
    serializer = NotificationLogSerializer(data=post_data, many=True)
    serializer.is_valid(raise_exception=True)
    saved_datas = serializer.save()
    for index, save_data in enumerate(saved_datas):
        if notification_list[index]['notification_entity']['channel'] == 'push':
            if 'extra_params' not in notification_list[index]['notification_entity']['channel_data']:
                notification_list[index]['notification_entity']['channel_data']['extra_params'] = {}
            notification_list[index]['notification_entity']['channel_data']['extra_params']['notification_id'] = save_data.id
    return notification_list

def add_notification_template(self, data):
    return SharedService.add_or_update_data(self, data)

def get_user_contact_details(user_ids):
    user_data = User.objects.filter(id__in=user_ids).values(
        'id', 'username', 'staff__email', 'student__email', 'staff__mobile_num', 'student__mobile_num',
        'staff', 'student', 'student__first_name', 'student__middle_name', 'student__last_name',
        'staff__first_name', 'staff__middle_name', 'staff__last_name','password_two','student__profile_pic'
    ).order_by('id')
    student_ids = []
    for user in user_data:
        if user['student']:
            student_ids.append(user['student'])
    parent_ids = []
    student_parent_mapping = {}
    for stu in StudentParentMapping.objects.filter(student__in=student_ids).values('student_id', 'parent_id'):
        parent_ids.append(stu['parent_id'])
        student_parent_mapping[stu['student_id']] = stu['parent_id']
    student_parent_detail =  {par['id']:par for par in ParentDetail.objects.filter(id__in=parent_ids).values(
        'f_mobile_num', 'm_mobile_num', 'f_email', 'm_email', 'id', 'father_name'
    )}
    for user in user_data:
        user['name'] = ''
        if user['student']:
            user['name'] = get_full_name(user['student__first_name'], user['student__middle_name'], user['student__last_name'])
        elif user['staff']:
            user['name'] = get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name'])
        if user['student']:
            if user['student'] in student_parent_mapping and student_parent_mapping[user['student']] in student_parent_detail:
                user.update({
                    'f_mobile_num': student_parent_detail[student_parent_mapping[user['student']]]['f_mobile_num'],
                    'f_email': student_parent_detail[student_parent_mapping[user['student']]]['f_email'],
                    'm_mobile_num': student_parent_detail[student_parent_mapping[user['student']]]['m_mobile_num'],
                    'm_email': student_parent_detail[student_parent_mapping[user['student']]]['m_email'],
                    'father_name': student_parent_detail[student_parent_mapping[user['student']]]['father_name']
                })
            else:
                user.update({
                    'f_mobile_num': '',
                    'f_email': '',
                    'm_mobile_num': '',
                    'm_email': '',
                    'father_name': ''
                })
            student_ids.append(user['student'])
    return user_data

def handle_ivr_notification_bulk(self, user, data, institue, **kwargs):
    """
    Prepare notification payload for IVR channel.
    Mirrors handle_whatsapp_notification_bulk structure so downstream
    processing / post_to_notification can treat them similarly.
    """
    return_data = {}
    mobile_num = ''
    current_hour = datetime.now().hour
    if current_hour < 9 or current_hour >= 21:
        raise ValidationError("IVR notifications can only be sent between 9:00 AM and 9:00 PM.")
    if user.get('staff'):
        mobile_num = user.get('staff__mobile_num', '')
    elif user.get('student'):
        mobile_num = user.get('student__mobile_num', '')
     # Get attached documents (audio files expected)
    audio_files = kwargs.get('document_list', [])
    allowed_audio_extensions = ['.mp3', '.wav', '.m4a', '.ogg', '.aac']
    for file_data in audio_files:
        file_url = file_data.get('url', '')
        file_name = file_data.get('file_name', '')
        extension = os.path.splitext(file_name or file_url)[-1].lower()
        if extension not in allowed_audio_extensions:
            raise ValidationError(
                f"Invalid file type '{extension}' detected. "
                f"Only audio files ({', '.join(allowed_audio_extensions)}) are allowed for IVR notifications."
            )
    if mobile_num and audio_files:
        # Keep structure similar to other handlers so post_to_notification can reuse logic
        return_data = {
            "notification_entity": {
                "user_id": user['id'],
                "company_id": institue.company_id,
                "channel": "ivr",
                "vendor": "sarv",    # adjust if you use different IVR vendor
                "client": "sarv",
                "priority": "medium",
                "channel_data": {
                    "to": [mobile_num],
                    # Use message_data for the IVR script / text to speak
                    # downstream IVR service can convert to TTS or play audio
                    "body": data.get('message_data'),
                    "attachmentLinks": kwargs.get('document_list', []),
                    # keep template-related fields consistent with WhatsApp handler
                    "template_id": data.get('template_id'),
                    "field_value": data.get('field_value'),
                    "contact": data.get('contact'),
                    # optional: specify call preferences
                    "call_type": data.get('call_type', 'tts'),  # 'tts' or 'pre_recorded'
                }
            }
        }
    return return_data

def add_bulk_notification_data(self, data):
    from apps.students.services.student import get_student_current_standard_section_name
    from apps.notification.templates import messages_format

    data['academic_year'] = data['academic_year'] if 'academic_year' in data else None
    data['created_by_user'] = self.request.user.id
    data['notification_type'] = data['notification_type'] if 'notification_type' in data and data['notification_type'] else 0
    if str(data['notification_type']) == '1':
        raise ValidationError('Invalid notification type')
    if str(data['notification_type']) == '2' and ('bulk_notification_category' not in data or not data['bulk_notification_category']):
        raise ValidationError('bulk_notification_category is mandatory for bulk_notification_category')
    user_list = get_users_for_notification_list(self, data)
    if 'last_activity_less_than_week' in data and data['last_activity_less_than_week']:
        today = datetime.today()
        week_ago = today - timedelta(weeks=1)
        user_list = User.objects.filter(last_activity__lte=week_ago,id__in=user_list).values_list('id')
    if not user_list:
        raise ValidationError('No users to send notification')
    data['standard_section_ids'] = ','.join(str(v) for v in data['standard_section_ids'])
    if 'language' not in data or not data['language']:
        raise ValidationError('Langauge is mandatory')
    if 'schedule' in data and data['schedule']:
        if data['schedule'] < datetime.now().strftime('%Y-%m-%d %H:%M:%S'):
            raise ValidationError('Schedule should be greater than now')
    else:
        data['schedule'] = None
    user_data = get_user_contact_details(user_list)
    institue = Institute.objects.all().first()
    medium_error = ''
    if data['medium'] == 'email':
        handle_medium = handle_email_notification_bulk
        medium_error = 'Email id is not present'
    elif data['medium'] == 'sms':
        handle_medium = handle_sms_notification_bulk
        medium_error = 'Mobile num is not present'
    elif data['medium'] == 'push':
        handle_medium = handle_push_notification_bulk
        medium_error = 'Push not registered for the user'
    elif data['medium'] == 'whatsapp':
        handle_medium = handle_whatsapp_notification_bulk
        medium_error = 'Mobile num is not present'
    elif data['medium'] == 'ivr':
        handle_medium = handle_ivr_notification_bulk
        medium_error = 'Mobile num is not present'
    sent_user_ids = []
    notification_data = []
    unsendable_user_with_error = {}
    s3_objects = {'document_list': []}
    if 'birthday_wish' in data and data['birthday_wish']:
        doc_list = [u['student__profile_pic'] for u in user_data if u.get('student__profile_pic')]
        doc_obj = Document.objects.filter(id__in=doc_list)
        doc_ser = DocumentSerializer(doc_obj, many=True).data
        doc_data = {d['id']: d['file'] for d in doc_ser}
        selected_templates, number_of_copies = get_selected_template(self, 'birthday_wish_poster', 'pdf', 'default_birthday_wish_poster.html')
        path = 'birthday_wish_poster/' + selected_templates
        for user in user_data:
            # if not user.get('student__profile_pic') or user['student__profile_pic'] not in doc_data:
            #     continue
            template_data = {
                    'name': user.get('name', ''),
            }
            if user['student__profile_pic'] in doc_data:
                template_data['profile_pic_details']=doc_data[user['student__profile_pic']]
            base_filename = (user.get('name') or 'student') + '_' + datetime.now().strftime('%Y%m%d_%H%M%S')
            generated_path = PDFService.return_pdf_path(self, template_data, base_filename, path, True, 'img')
            url = UploadTypeService.upload_local_file(generated_path, path='BirthdayPosters')
            user['student_image']= [{
                'title': 'document',
                'document_data': 'data',
                'url': url,
                'file_name': base_filename
            }]
            if os.path.exists(generated_path):
                os.remove(generated_path)
    if 'documents' in data and data['documents']:
        document_ids = []
        for media in data['documents']:
            document_ids.append(media['document'])
        document_obj = Document.objects.filter(id__in=document_ids)
        document_ser = DocumentSerializer(document_obj, many=True).data
        doc_data = {d['id']: d['file'] for d in document_ser}
        for media in data['documents']:
            if media['document'] not in doc_data:
                raise ValidationError('Invalid document attached')
            file_name = media['name'] if 'name' in media else ''
            if not file_name:
                file_name = media['title'] if 'title' in media else ''
            s3_objects['document_list'].append({
                'title': media['title'] if 'title' in media else '',
                'document_data': doc_data[media['document']],
                'url': doc_data[media['document']], 
                'file_name': file_name
            })
    if data.get('custom_bulk_notification') and data['custom_bulk_notification'] in ['send_username_password_to_user','send_username_password_to_user_staff']:
        if data['medium'] == 'push':
            raise ValidationError('Push is not allowed to send username and password for the users')
        student_ids = []
        staff_ids = []
        for user in user_data:
            if user['student']:
                student_ids.append(user['student'])
            else:
                staff_ids.append(user['staff'])
        student_standard_data = get_student_current_standard_section_name(student_ids)
        institue_app_data = institue.app_data
        for user in user_data:
            user['school_code'] = institue.code
            user['school_email'] = institue.email if institue.email else ''
            user['school_name'] = institue.name
            if user['staff']:
                user['password'] = decrypt_password(user['password_two']) if user['password_two'] else user['username']
                user['app_link'] = 'https://play.google.com/store/apps/details?id=com.sms_react_native_staff'
                user['staff_app_android'] = institue_app_data['staff_app_android'] if institue_app_data and 'staff_app_android' in institue_app_data and institue_app_data['staff_app_android'] else 'https://rb.gy/kgs9gz'
                user['staff_app_ios'] = institue_app_data['staff_app_ios'] if institue_app_data and 'staff_app_ios' in institue_app_data and institue_app_data['staff_app_ios'] else 'https://rb.gy/fpvryn'
                notification_obj = NotificationBodyTemplate('username_password_bulk_notification_staff')
                body_email_staff = notification_obj.select_template('email',{})
                body_whatsapp_staff = notification_obj.select_template('whatsapp',{})
                body_sms_staff = notification_obj.select_template('sms',{})
                try:
                    body_ivr_staff = notification_obj.select_template('ivr',{})
                except Exception:
                    body_ivr_staff = None
                if data['medium'] == 'email':
                    user['custom_data'] = body_email_staff
                if data['medium'] == 'sms':
                    user['custom_data'] = body_sms_staff
                if data['medium'] == 'whatsapp':
                    user['custom_data'] = body_whatsapp_staff
                    data['field_value']={}
                    values = re.findall(r'\{([^}]+)\}',user['custom_data'])
                    def repl(match, counter=[1]):
                        replacement = f'{{{counter[0]}}}'
                        counter[0] += 1
                        return replacement
                    for index,value in enumerate(values):
                        key='field_'+str(index+1)
                        data['field_value'][key] = user[value]
                    data['template_id'] = 'staff_create'
                    data['contact']={
                        'first_name':user['staff__first_name'],
                        'last_name':user['staff__last_name'],
                        'email':user['staff__email']
                    }
                if data['medium'] == 'ivr':
                    # if you have an IVR template, put it here
                    if body_ivr_staff:
                        user['custom_data'] = body_ivr_staff
                    else:
                        # fallback to composing a simple message
                        user['custom_data'] = f"Hello {user.get('staff__first_name','')}. Your username is {user.get('username','')}"
                    data['field_value'] = {}
                    values = re.findall(r'\{([^}]+)\}', user['custom_data'])
                    for index, value in enumerate(values):
                        key = 'field_' + str(index + 1)
                        data['field_value'][key] = user.get(value, '')
                    data['template_id'] = 'staff_create_ivr'
                    data['contact'] = {
                        'first_name': user['staff__first_name'],
                        'last_name': user['staff__last_name'],
                        'email': user['staff__email']
                    }
            else:
                user['standard_name'] = ''
                user['section_name'] = ''
                user['admission_num'] = ''
                user['password'] =  decrypt_password(user['password_two']) if user['password_two'] else user['username']
                user['student_app_android'] = institue_app_data['student_app_android'] if institue_app_data and 'student_app_android' in institue_app_data and institue_app_data['student_app_android'] else 'https://rb.gy/3aj34l'
                user['student_app_ios'] = institue_app_data['student_app_ios'] if institue_app_data and 'student_app_ios' in institue_app_data and institue_app_data['student_app_ios'] else 'https://rb.gy/cu2q1o'
                user['app_link'] = 'https://play.google.com/store/apps/details?id=com.sms_react_native'
                notification_obj = NotificationBodyTemplate('username_password_bulk_notification_student')
                if user['student'] in student_standard_data:
                    user['standard_name'] = student_standard_data[user['student']]['standard_name']
                    user['section_name'] = student_standard_data[user['student']]['section_name']
                    user['admission_num'] = student_standard_data[user['student']]['admission_num']
                body_email_student = notification_obj.select_template('email',user)
                body_whatsapp_student = notification_obj.select_whatsapp_template_id_and_field_data('whatsapp',user)
                body_sms_student = notification_obj.select_template('sms',user)
                try:
                    body_ivr_student = notification_obj.select_template('ivr', user)
                except Exception:
                    body_ivr_student = None
                if data['medium'] == 'email':
                    user['custom_data'] = body_email_student
                if data['medium'] == 'sms':
                    user['custom_data'] = body_sms_student
                if data['medium'] == 'whatsapp':
                    user['custom_data'] = body_whatsapp_student['whatsapp_template']
                    user['field_value']=body_whatsapp_student['field_values'].copy()
                    # values = re.findall(r'\{([^}]+)\}',user['custom_data'])
                    # def repl(match, counter=[1]):
                    #     replacement = f'{{{counter[0]}}}'
                    #     counter[0] += 1
                    #     return replacement
                    # for index,value in enumerate(values):
                    #     key='field_'+str(index+1)
                    #     data['field_value'][key] = user[value]
                    data['template_id'] = body_whatsapp_student['whatsapp_template_id']
                    # data['contact']={
                    #     'first_name':user['student__first_name'],
                    #     'last_name':user['student__last_name'],
                    #     'email':user['student__email']
                    # }
                if data['medium'] == 'ivr':
                    if body_ivr_student:
                        user['custom_data'] = body_ivr_student
                    else:
                        # fallback to a simple TTS-friendly message
                        user['custom_data'] = f"Hello {user.get('student__first_name','')}. Your username is {user.get('username','')}"
                    # derive field values from the template placeholders (if any)
                    data['field_value'] = {}
                    values = re.findall(r'\{([^}]+)\}', user['custom_data'])
                    for index, value in enumerate(values):
                        key = 'field_' + str(index + 1)
                        data['field_value'][key] = user.get(value, '')
                    data['template_id'] = 'student_create_ivr'
    for user in user_data:
        if data['medium'] == 'email':
            if user['staff'] and not user['staff__email']:
                continue
            if user['student'] and not user['student__email']:
                continue
        if 'custom_data' in user and user['custom_data']:
            # data['field_value']={}
            # for index,value in enumerate(values):
            #     key='field_'+str(index+1)
            #     data['field_value'][key] = user[value]
            if 'field_value' in user:
                data['field_value']=user['field_value']
            data['contact']={
                        'first_name':user['student__first_name'],
                        'last_name':user['student__last_name'],
                        'email':user['student__email']
                    }
            data['message_data'] = user['custom_data'].format(**user)
        return_data = handle_medium(self, user, data, institue, **s3_objects)
        if return_data:
            sent_user_ids.append(user['id'])
            return_data['transaction_id'] = data['transaction_id']
            notification_data.append(return_data)
        else:
            name = ''
            if user['student']:
                name += 'Student '+ get_full_name(user['student__first_name'], user['student__middle_name'], user['student__last_name'])
            else:
                name += 'Staff '+ get_full_name(user['staff__first_name'], user['staff__middle_name'], user['staff__last_name'])
            unsendable_user_with_error[user['id']] = name + ' ' +medium_error
    sent_user_ids = list(set(sent_user_ids))
    if not sent_user_ids:
        raise ValidationError(f'No Users found / User {data["medium"]} not provided for users')
    if data.get('return_users_only'): #this is to send to frontend showing number of users
        serializer = UserReadSerializer(User.objects.filter(id__in=sent_user_ids), many=True)
        data_list, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data, self.request.GET.get('limit'), self.request.GET.get('pageno'))
        if data['academic_year']:
            student_ids = []
            for temp in data_list:
                if temp['student']:
                    student_ids.append(temp['student']['id'])
            if student_ids:
                enrollment_data = {enr['student'] : enr for enr in Enrollment.objects.filter(student__in=student_ids, standard_section__academic_year=data['academic_year']).values(
                    'standard_section__standard__name', 'standard_section__section__name', 'standard_section', 'student'
                )}
                for user in serializer.data:
                    if 'student' in user and user['student'] and user['student']['id'] in enrollment_data:
                        user['student']['enrollment_data'] = enrollment_data[user['student']['id']]
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data_list, 'unsendable_user_with_error': unsendable_user_with_error}}
    with transaction.atomic(using=get_current_db_name()):
        data['notification_medium'] = NotificationMedium.objects.filter(name=data['medium']).first().id
        response = SharedService.add_or_update_data(self, [data])
        response['data']['sent_user_ids'] = sent_user_ids
        data['bulk_notification'] = response['data']['id']
        add_to_notification_users(self, data, sent_user_ids)
        if 'documents' in data and data['documents']:
            add_to_notification_document_mapping(self, data['documents'], data['bulk_notification'])
        if notification_data:
            try:
                validate_and_update_resource(
                    medium=data['medium'],
                    total_users=len(sent_user_ids),
                    data=data,
                    document_list=data.get('documents', []),
                    update=False  # just check, don’t deduct yet
                )
            except ValidationError as e:
                raise e
            SharedService.custom_thread(post_to_notification, notification_data, 'bulk_notification')
        return response

def add_to_notification_users(self, data, sent_user_ids):
    for user in sent_user_ids:
        BulkNotificationUsers.objects.create(
                bulk_notification_id=data['bulk_notification'], user_id=user,
                delivery_status='unknown'
        )

def add_to_notification_document_mapping(self, document_list, bulk_notification_id):
    data_to_save = []
    for document in document_list:
        document['bulk_notification'] = bulk_notification_id
        data_to_save.append(document)
    ser = BulkNotificationDocumentMappingSerializer(data=data_to_save, many=True)
    ser.is_valid(raise_exception=True)
    ser.save()

def get_users_for_notification_list(self, data):
    user_list = []
    if 'standard_section_ids' in data and data['standard_section_ids']:
        temp = Student.get_student_for_standard(data['academic_year'], [], data['standard_section_ids'], ['user_student__id'])
        user_list += [user['user_student__id'] for user in temp]
    user_list += data['user_ids']
    if 'group_ids' in data and data['group_ids']:
        user_data = User.objects.filter(groups__in=data['group_ids'], is_active=True).values('id', 'student')
        academic_year = AcademicYear.get_academic_year_for_date(self, datetime.today())
        if not academic_year:
            raise ValidationError('Academic Year is not active')
        student_standard_mapping = {stu['student'] : stu for stu in StudentStandardMapping.objects.filter(academic_year=academic_year.id, student__is_active=True).values('student')}
        user_list = []
        for user in user_data:
            if user['student'] and user['student'] not in student_standard_mapping:
                continue
            user_list.append(user['id'])
    if 'transport_route_plan_ids' in data and data['transport_route_plan_ids']:
        pickup_users = RouteUserPickupMapping.objects.filter(pickup_route_plan__route__in=data['transport_route_plan_ids']).values('user')
        drop_users = RouteUserDropMapping.objects.filter(drop_route_plan__route__in=data['transport_route_plan_ids']).values('user')
        for user in pickup_users:
            user_list.append(user['user'])
        for user in drop_users:
            user_list.append(user['user'])
    return list(set(user_list))

def handle_email_notification_bulk(self, user, data, institue, **kwargs):
    email = []
    return_data = {}
    if user['staff']:
        email.append(user['staff__email'])
    elif user['student']:
        if user['student__email']:
            email.append(user['student__email'])
    if 'f_email' in user and user['f_email']:
        email.append(user['f_email'])
    if 'm_email' in user and user['m_email']:
        email.append(user['m_email'])
    if email:
        return_data = {
                "notification_entity":{
                    "user_id":user['id'],
                    "company_id":institue.company_id,
                    "channel":"email",
                    "vendor":"ses",
                    "client":"ses",
                    "priority":"medium",
                    "channel_data":{
                        "messageType":"",
                        "subject":data['heading'],
                        "to": email,
                        "cc":[],
                        "body":data['message_data'],
                        "attachmentLinks": kwargs['document_list'] if 'document_list' in kwargs else []
                    }
                }
            }
    return return_data

def handle_sms_notification_bulk(self, user, data, institue, **kwargs):
    mobile_num = ''
    return_data = {}
    if user['staff']:
        mobile_num = user['staff__mobile_num']
    elif user['student']:
        mobile_num = user['student__mobile_num']
    if mobile_num:
        sms_vendor, sender_id = get_sms_vendor()
        return_data = {
            "notification_entity":{
                "user_id": user['id'],
                "company_id": institue.company_id,
                "channel":"sms",
                "vendor": sms_vendor,
                "client":sms_vendor,
                "priority":"medium",
                "sender_id": sender_id,
                "channel_data":{
                    "to":[
                        mobile_num
                    ],
                    "data": '',
                    "body": data['message_data']
                }
            }
        }
    return return_data

def handle_whatsapp_notification_bulk(self, user, data, institue, **kwargs):
    return_data = {}
    whatsapp_vendor=NotificationVendor.objects.filter(is_active=True, notification_medium='whatsapp')
    whatsapp_vendor_name = 'apichat'
    if whatsapp_vendor:
        whatsapp_vendor=whatsapp_vendor.first()
        whatsapp_vendor_name = whatsapp_vendor.vendor_name
        
    mobile_num = ''
    return_data = {}
    if user['staff']:
        mobile_num = user['staff__mobile_num']
    elif user['student']:
        mobile_num = user['student__mobile_num']
    if mobile_num:
        return_data = {
            "notification_entity":{
                "user_id":user['id'],
                "company_id":institue.company_id,
                "channel":"whatsapp",
                "vendor":whatsapp_vendor_name,
                "client":whatsapp_vendor_name,
                "priority":"medium",
                "channel_data":{
                    "to": [mobile_num],
                    "body":data['message_data'],
                    "attachmentLinks": kwargs['document_list'] if 'document_list' in kwargs else [],
                    "template_id":data['template_id'],
                    "field_value":data['field_value'],
                    "contact":data['contact']
                }
            }
            }
    return return_data

def handle_push_notification_bulk(self, user, data, institue, **s3_objects):
    return_data = {
      "notification_entity":{
         "user_id": user['id'],
         "company_id": institue.company_id,
         "channel":"push",
         "vendor":"fcm",
         "client":"fcm",
         "priority":"medium",
         "channel_data":{
            "messageType":"",
            "subject": data['heading'],
            "to":[
               user['id']
            ],
            "cc":[],
            "body": data['message_data'],
            "extra_params": s3_objects
         },
      }
    }
    if "student_image" in user:
        return_data['notification_entity']['channel_data']['extra_params']['document_list']=user['student_image']
    return return_data

def send_web_push_notification(self, user_id, data, company_id):
    post_data = [{
        "notification_entity": {
            "user_id": user_id,
            "company_id": company_id,
            "channel": "webpush",
            "vendor":"fcm",
            "client":"fcm",
            "priority":"medium",
            "channel_data":{
                "messageType":"",
                "subject": data['heading'],
                "to":[
                    user_id
                ],
                "cc":[],
                "body": data['message_data'],
            },
            "extra_params":{}
        }
    }]
    return post_to_notification(post_data, 'web_push_server_operation')


def get_sms_template_list(self, request):
    url = NOTIFICATION_BACKEND_URL + 'notification/templatelist/'
    params = {'user_defined': 1}
    response = http_request('GET', url, None, params)
    return response.json()
    
def get_user_notification_category(self):
    logged_in_user_id = self.request.user.id
    bulk_notification_category_ids = BulkNotificationUsers.objects.filter(user=logged_in_user_id,bulk_notification__notification_type=2).values_list(
        'bulk_notification__bulk_notification_category', flat=True
    ).distinct()
    category_datas = BulkNotificationCategory.objects.filter(
        id__in=bulk_notification_category_ids
    ).values('id', 'name')
    return {'data': category_datas}



# def add_sms_template_list(self, data):
#     mandatory_list = ['template_name', 'template_dlt_id', 'header', 'content', 'for_api_name']
#     existing_templates = {s['template_dlt_id']: '' for s in SmsTemplateList.objects.all().values('template_dlt_id')}
#     api_name_list = set()
#     data_to_save = []
#     for row_data in data:
#         if row_data['template_dlt_id'] not in existing_templates:
#             SharedService.check_mandatory_field_in_list(mandatory_list, row_data)
#             api_name_list.add(row_data['for_api_name'])
#             data_to_save.append(row_data)
#     existing_api_name_list = NotificationApiConfiguration.objects.filter(
#         api_name__in=list(api_name_list)
#     ).values_list('api_name', flat=True).distinct()
#     if api_name_list - set(existing_api_name_list):
#         api_names = ','.join(list(api_name_list - set(existing_api_name_list)))
#         raise ValidationError(f"{api_names} doesn't exist" )
#     if data_to_save:
#         return SharedService.add_or_update_data(self, data_to_save)    
#     else:
#         return {'Reason': 'Nothing to save'}
    
# def upload_csv_template_list(self, request):
#     import pyexcel_xlsx
#     import pyexcel_ods
    
#     file = request.FILES["excel_file"] # fileObject
#     filename = file.name
#     extension = filename.split('.')[-1]
#     if extension not in ['xls', 'xlsx']:
#         raise ValidationError('File format supports xls, xlsx!')
#     content = file.read()
#     sheet = pyexcel.get_sheet(file_type=extension, file_content=content, name_columns_by_row=0)
#     if sheet.number_of_rows() < 1:
#         raise ValidationError('There is no data in the sheet. Please fill and upload it again.')
#     if sheet.number_of_rows() > 5000:
#         raise ValidationError('Max limit is 5000, file has crossed more than the max limit.')
#     sheet_data = list(sheet.rows())
#     column_index_data_mapping = {v:i for i,v in enumerate(sheet_data[1])}
#     mandatory_columns = [
#         'Template Name', 'Template Registration Number', 'Linked Headers', 'Api Name', 'Template Content'
#     ]
#     if set(mandatory_columns) - set(column_index_data_mapping):
#         raise ValidationError(f'{set(mandatory_columns) - set(column_index_data_mapping)}')
#     data_to_save = []
#     existing_template = {str(t['template_dlt_id']): t for t in SmsTemplateList.objects.all().values()}
#     for index in range(2, len(sheet_data)):
#         row = sheet_data[index]
#         template_name = str(row[column_index_data_mapping['Template Registration Number']]).replace('\t', '')
#         if template_name not in existing_template:
#             temp = {
#                 'template_name': row[column_index_data_mapping['Template Name']],
#                 'template_dlt_id': row[column_index_data_mapping['Template Registration Number']],
#                 'header': row[column_index_data_mapping['Linked Headers']],
#                 'for_api_name': row[column_index_data_mapping['Api Name']],
#                 'content': row[column_index_data_mapping['Template Content']],
#             }
#             data_to_save.append(temp)
#     if data_to_save:
#         serializer = SmsTemplateListSerializer(data=data_to_save, many=True, allow_empty=False)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#     else:
#         raise ValidationError('All data already saved')
#     return sheet.rows()
