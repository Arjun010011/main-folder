# from django.conf import settings
# import json
# import requests
# import re
# import datetime
# from django.db.models.functions import Concat
# from django.db.models import Value as V, F, CharField, Case, Value, When, Q

# from rest_framework.views import Response, exceptions
# from apps.staffs.serializers import StaffAllDetailSerializer
# from apps.students.serializers import StudentFullDetailsSerializer
# from apps.staffs.models import Staff
# from apps.students.models import Student
# from apps.shared.utils import http_request
# from apps.shared.services import SharedService
# from apps.notification.serializers import SmsLogSerializer, NotificationConfigurationSerializer

# class SmsSetup(object):

#     #http://websms.bulksmscenter.in/
#     _authKey = getattr(settings, "MESSAGING_AUTH_URL", None)
#     _senderId = 'Edubrz'
#     _url = 'http://websms.bulksmscenter.in/rest/services/'
#     _maxMessagePerRequest = 2
#     _signature = 'Signature'
#     _smsContentType = 'english'
#     _smsPurposeTypesUri= {
#         'personalized' : 'sendCustomGroupSms',
#         'bulksms': 'sendGroupSms', #bulk or personalized sms
#     },
#     _personalizedSmsUri = 'sendSMS/sendCustomGroupSms/'
#     _bulkSmsUri = 'sendSMS/sendGroupSms'
#     _smsClientName = 'websms'
#     _smsMaxSize = 500
#     _successCode = 3001

#     def sms_get_default_payload(self):
#         return {'senderId': self._senderId, "signature": self._signature, "smsContentType": self._smsContentType,
#                 'routeId': 1}

#     def get_query_string(self):
#         return {"AUTH_KEY": self._authKey}

#     @staticmethod
#     def get_student_data(ids):
#         queryset = Student.objects.filter(id_in=ids, is_active=True)
#         serializer = StudentFullDetailsSerializer(queryset, many=True, )
#         return serializer.data

#     """ All Staff table Joining data will be there """
#     def staff_related_data(self):
#         return {
#             'staff': { #parent used to join from this table
#                 'fields': ['first_name', 'middle_name', 'last_name', 'email', 'aadhar_num', 'mobile_num',
#                            'qualification', 'salary', 'date_joined', 'job_title'],
#                 'annotates': {
#                     'full_name': Concat('first_name', V(' '), 'middle_name', V(' '), 'last_name')
#                 }
#             },
#             'staffaddress': {
#                 'related_name': 'staff_address',
#                 'fields':['address'],
#                 'annotates':{
#                     'full_address': Concat('staff_address__address', V(' '), 'staff_address__city__name', V(' '), 'staff_address__district__name',
#                                        V(' '), 'staff_address__state__name', V(' '), 'staff_address__pincode', output_field=CharField()),
#                 }
#             }
#         }

#     """ Fetching fields from fields key and annotates keys
#         RelatedName is Mandatory if it is not parent
#     """
#     def student_related_data(self):
#         return {
#             'student': { #parent Table
#                 'fields': ['first_name', 'middle_name', 'last_name', 'dob', 'email', 'current_reg_num'],
#                 'annotates': {
#                     'full_name': Concat('first_name', V(' '), 'middle_name', V(' '), 'last_name'), 'standard_name': F('current_standard_id')
#                 },
#             },
#             'studentaddress':{
#                 'fields': ['address'],
#                 'related_name': 'student_address',
#                 'annotates':{
#                     'full_address': Concat('student_address__address', V(' '), 'student_address__city__name', V(' '), 'student_address__district__name',
#                                        V(' '), 'student_address__state__name', V(' '), 'student_address__pincode', output_field=CharField())
#                 }
#             },
#             'parentdetail': {
#                 'fields': [],
#                 'annotates':{ #mobile number first preference to fathernum, mothernum and guardian
#                     'parent_mobile': Case(
#                         When(~Q(Q(student_parent__parent__f_mobile_num=None) | Q(student_parent__parent__f_mobile_num__exact='')),then=F('student_parent__parent__f_mobile_num')),
#                         When(~Q(Q(student_parent__parent__m_mobile_num=None) | Q(student_parent__parent__m_mobile_num__exact='')),then=F('student_parent__parent__m_mobile_num')),
#                         When(~Q(Q(student_parent__guardian__g_mobile_num=None) | Q(student_parent__guardian__g_mobile_num__exact='')),then=F('student_parent__guardian__g_mobile_num')),
#                         default=Value(None),
#                         output_field=CharField(),
#                     )
#                 }
#             }
#         }


# def get_fields(self, request):
#     notificationObj = SmsSetup()
#     if request.GET.get('staff_fields'):
#         staffData = notificationObj.staff_related_data()
#         return {'data': loop_to_get_fields(staffData)}
#     elif request.GET.get('student_fields'):
#         studentData = notificationObj.student_related_data()
#         return {'data': loop_to_get_fields(studentData)}
#     else:
#         raise exceptions.ValidationError('Invalid request')

# def loop_to_get_fields(data):
#     tempFields = {}
#     for i in data:
#         for j in data[i]:
#             if j == 'annotates':
#                 for key in data[i][j].keys():
#                     tempFields.update({i+'.'+key:key})
#             elif j == 'fields':
#                 for lisData in data[i][j]:
#                     tempFields.update({i+'.'+lisData:lisData})
#     return tempFields



# """{
# 	"notification_type" : "immediate",
# 	"notification_for" : "Student",
# 	"message" : "Hi ###staff.full_name### ###Staff.first_name###",
# 	"ids": [],
#     "standard_ids": [1,2,3,4,5],
#     "standard_section_ids": [1,2,3],
# 	"academic_year" :1,
# 	"mobile_num": "staff.mobile_num"
# }"""

# """
#     For Otp - notification_type : immediate
#     notification_for : "Student" / "Teacher"
#     ids: [1]
#     mobile_num : fieldsname with dot a.mobile_num
# """
# #use this to send otp also
# def send_customized_message(data):
#     message = data['message']
#     smsObject = SmsSetup()
#     response = {}
#     if data['notification_for'] == 'Student':
#         if len(message) > smsObject._smsMaxSize:
#             raise exceptions.ValidationError('Sms size is more than required')
#         if ('ids' in data and not data['ids']) and ('academic_year' in data and not data['academic_year']):
#             raise exceptions.ValidationError('Either academic_year or student ids should be set')
#         student_structure_data = smsObject.student_related_data()
#         response = send_sms_student(data, message, student_structure_data, data['mobile_num'])
#     elif data['notification_for'] == 'Staff':
#         staff_structure_data = smsObject.staff_related_data()
#         response = send_sms_staff(data, message, staff_structure_data, data['mobile_num'])
#     return response


# def send_sms_student(data, message, structureData, mobileNumFetchField):
#     response = {}
#     ids = [] if 'ids' not in data else [] if not data['ids'] else data['ids']
#     academicYearId = '' if 'academic_year' not in data else '' if not data['academic_year'] else data['academic_year']
#     standardIds = [] if 'standard_ids' not in data else [] if not data['standard_ids'] else data['standard_ids']
#     standardSectionIds = [] if 'standard_section_ids' not in data else [] if not data['standard_section_ids'] else data['standard_section_ids']
#     customValues = ['id']
#     customMessage = get_table_and_column_names(message, customValues, 'student', mobileNumFetchField, structureData)
#     if not ids: #when all student selected we should specify the academic year details because we should fetch only those students
#         studentData = Student.get_student_for_standard(academicYearId, standardIds, standardSectionIds, customValues, customMessage['annotate'])
#     else:
#         studentData = Student.get_student_data(ids, customValues, customMessage['annotate'])
#     if not studentData:
#         raise exceptions.ValidationError('Student Data is Empty')
#     if customMessage['message'] != message:
#         response = personalized_sms_payload(data, customMessage['message'], studentData, customMessage['mobile_num'])
#     else:
#         response = bulk_sms_payload(data, customMessage['message'], studentData, customMessage['mobile_num'])
#     return response



# def send_sms_staff(data, message, structureData, mobileNumFetchField):
#     ids = [] if "All" in data['ids'] else data['ids']
#     customValues = ['id']
#     customMessage = get_table_and_column_names(message, customValues, 'staff', mobileNumFetchField, structureData)
#     staffData = Staff.get_staff_data(ids, customValues, customMessage['annotate'])
#     if not staffData:
#         raise exceptions.ValidationError('Staff Data is Empty')
#     if customMessage['message'] != message:
#         response = personalized_sms_payload(data,customMessage['message'], staffData, customMessage['mobile_num'])
#     else:
#         response = bulk_sms_payload(customMessage['message'], staffData, customMessage['mobile_num'])
#     return response


# """ ids => To get data from the table """


# def get_table_and_column_names(message, customValues, parentTableName, mobileNum, structureData):
#     mobile_fetch_field = ''
#     customAnnotate = {}
#     try:
#         tempMobile = re.search(r"(\w+)\.(\w+)", mobileNum)
#         mobile_fetch_field = message_convert_to_query_format(tempMobile.group(1).strip().lower(), tempMobile.group(2).strip().lower(), structureData, customAnnotate, parentTableName)
#         customValues.append(mobile_fetch_field)
#     except Exception as e:
#         raise exceptions.ValidationError('Mobile Fetch Field  is not valid')
#     tableRegex = re.findall(r"#{3}\s*(\w+)+\.(\w+)\s*#{3}", message)
#     tempMessage = message
#     for matchedData in tableRegex:
#         try:
#             tableName = matchedData[0].strip().lower()
#             columnName = matchedData[1].strip().lower()
#             temp = message_convert_to_query_format(tableName, columnName, structureData, customAnnotate, parentTableName)
#             tempMessage = re.sub(r'#{3}\s*(?i)(' + tableName + '+)+\.(?i)(' + columnName + '+)\s*#{3}',
#                                     '###' + temp + '###', tempMessage) #regex replaces a.b with a__b or b if a is parent
#             customValues.append(temp)
#         except exceptions.ValidationError as e:
#             raise exceptions.ValidationError(e.detail)
#         except:
#             raise exceptions.ValidationError(f'Error in the line - {matchedData}') #nikhil please change the error message
#     res = {'message': tempMessage, 'mobile_num': mobile_fetch_field, 'annotate': customAnnotate}
#     return res

# """ Function checks data in parent or child and convert to the query string"""
# def message_convert_to_query_format(tableName, columnName, structureData, customAnnotate, parentTableName):
#     temp = columnName
#     anotateName = False
#     if tableName not in structureData:
#         raise exceptions.ValidationError(f'{tableName} - Table Not found')
#     if "fields" not in structureData[tableName] or columnName not in structureData[tableName]['fields']:
#         if columnName not in structureData[tableName]['annotates']:
#             raise exceptions.ValidationError(f'{columnName} - doesnot exist in the given list')
#         else:
#             anotateName = True
#             customAnnotate.update(structureData[tableName]['annotates'])
#     if not anotateName and tableName.lower() != parentTableName.lower():
#         temp = structureData[tableName]['related_name'] + '__' + columnName
#     return temp

# def personalized_sms_payload(data, customMessage, rowData, mobileField):
#     notificationObject = SmsSetup()
#     payload = notificationObject.sms_get_default_payload()
#     sentSmsNumList = []
#     countMessages = 0
#     for row in rowData:
#         cMessage = custom_message_ready(customMessage, row)
#         if not row[mobileField]:
#             raise exceptions.ValidationError(f'Mobile Number Not Found for id - {row["id"]}')
#         mobileNum = str(SharedService.mob_remove_space_after_extension(row[mobileField]))
#         if SharedService.validate_india_mobile_num(mobileNum):
#             cMessage = clean_sms_content(cMessage)
#             temp = {'mobileNumber': mobileNum, "isAdvanceSms": cMessage}
#             sentSmsNumList.append(temp)
#             countMessages += 1
#         else:
#             raise exceptions.ValidationError(f'Mobile Number is not valid - {mobileNum}')
#     if countMessages > notificationObject._maxMessagePerRequest:
#         raise exceptions.ValidationError(
#             f'Count per request is limited to {notificationObject._maxMessagePerRequest}. Trying to send {countMessages}')
#     if not sentSmsNumList:
#         raise exceptions.ValidationError('The sending request is empty')
#     payload.update({'sentSmsNumList': sentSmsNumList})
#     return send_sms(data, payload, notificationObject._personalizedSmsUri, 'personalised', countMessages, 'bulk')

# def clean_sms_content(smsContent):
#     smsContent.replace('"', '\\"')
#     smsContent.replace('\\', '\\\\')
#     return smsContent

# #bulk sms payload same sms without dynamic data
# def bulk_sms_payload(data, message, rowData, mobileField):
#     notificationObject = SmsSetup()
#     payload = notificationObject.sms_get_default_payload()
#     cleanedMessage = clean_sms_content(message)
#     payload.update({'smsContent': cleanedMessage})
#     mobileNumList=[]
#     countMessages = 0
#     for row in rowData:
#         if not row[mobileField]:
#             raise exceptions.ValidationError(f'Mobile Number Not Found for id - {row["id"]}')
#         mobileNum = str(SharedService.mob_remove_space_after_extension(row[mobileField]))
#         if SharedService.validate_india_mobile_num(mobileNum):
#             mobileNumList.append(mobileNum)
#             countMessages += 1
#     if countMessages > notificationObject._maxMessagePerRequest:
#         raise exceptions.ValidationError(
#             f'Count per request is limited to {notificationObject._maxMessagePerRequest}. Trying to send {countMessages}')
#     if not mobileNumList:
#         raise exceptions.ValidationError('The sending request is empty')
#     mobileNumList = ','.join(map(str, mobileNumList))
#     payload.update({'mobileNumbers': mobileNumList})
#     return send_sms(data, payload, notificationObject._bulkSmsUri, 'commonsms', countMessages, 'bulk')

# """ replace message with a__b with its content """

# def custom_message_ready(customMessage, rowData):
#     for row in rowData:
#         if not rowData[row]:
#             raise exceptions.ValidationError(f'The field {row} is empty for id - {rowData["id"]}')
#         customMessage = re.sub(r'#{3}\s*(?i)(' + row + '+)\s*#{3}', ' '+str(rowData[row])+' ', customMessage)
#     return customMessage

# #send type id always when it is not smstype is bulk
# def send_sms(requestData, payload, uri, smsPurpose, count, smsType='api'):
#     if requestData['notification_type'] == 'scheduled':
#         validateScheduled(requestData['scheduled_date'])
#         payload.update({'scheduleddate':requestData['scheduled_date']})
#     notificationObect = SmsSetup()
#     url = notificationObect._url + uri
#     payload = json.dumps(payload)
#     response = http_request("POST", url, payload, notificationObect.get_query_string()).json()
#     if int(response['responseCode']) == int(notificationObect._successCode):
#         if smsType == 'bulk':
#             typeId = save_data_to_notification_config(requestData)
#         save_to_log(notificationObect, payload, smsPurpose, count, smsType, response, typeId)
#         response = {'Reason': 'Message sent successfully'}
#     return response

# def validateScheduled(scheduledDate):
#     format_str = '%d/%m/%Y %H:%M:%S' # The format
#     now = datetime.datetime.strptime(datetime.datetime.now().strftime(format_str), format_str)
#     datetime_obj = datetime.datetime.strptime(scheduledDate, format_str)
#     if datetime_obj < now or ((datetime_obj-now).days <= 0 and ((datetime_obj - now).seconds / 60) < 5):
#         raise exceptions.ValidationError('The Given time should be greater than current time and Greater than 5 Min from current time')
#     if (datetime_obj - now).days > 7:
#         raise exceptions.ValidationError('Given date should be less than 7days')



# def save_data_to_notification_config(requestData):
#     dataToSave = {'request_json': requestData}
#     serializer = NotificationConfigurationSerializer(data=dataToSave)
#     serializer.is_valid(raise_exception=True)
#     row = serializer.save()
#     return row.id



# def save_to_log(notificationObject, payload, smsPurpose, count, smsType, response, typeId):
#     # SharedService.upload_json()
#     dataToSave = {  'sms_purpose': smsPurpose, 'response': response, 'count' : count, 'sms_type': smsType, 'sms_type_id': typeId,
#                     'client_name' : notificationObject._smsClientName, 's3_url_request': 'test'}
#     serializer = SmsLogSerializer(data=dataToSave)
#     serializer.is_valid(raise_exception=True)
#     serializer.save()

# def add_client(data):
#     notificationObect = SmsSetup()
#     queryString = {'fname': data['first_name'], 'lname': data['last_name'], 'user_name': data['username'], 'mob_no': data['mobile_num'], 'user_email': data['user_email'], 'expiry': data['expirty_date'], 'utype': 5}
#     queryString.update(notificationObect.get_query_string())
#     url = notificationObect._url + notificationObect._clientAddUri
#     kwargs = {'headers': {'headers':{'Cache-Control': 'no-cache'}}}
#     response = http_request('GET', url, None, queryString, **kwargs).json()
#     return response


















# # http://websms.bulksmscenter.in/
# """"    1 = Transactional Route, 2 = Promotional Route, 3 = Trans DND Route,
#         7 = Transcrub Route, 8 = OTP Route, 9 = Trans Stock Route, 10 = Trans Property Route,
#         11 = Trans DND Other Route, 12 = TransCrub Stock, 13 = TransCrub Property,
#         14 = Trans Crub Route. (RouteId)
# """


# def send_sms1(self, mobileNumbers, smsContent, routeId):
#     defaultRouteIds = [1, 2, 3, 7, 8, 9, 10, 11, 12, 13, 14]
#     if routeId not in defaultRouteIds:
#         raise exceptions.ValidationError('Invalid Route ID')
#     check_mobile_number_validation(mobileNumbers)
#     validate_sms_content(smsContent)
#     url = getattr(settings, "MESSAGING_URL", None)
#     authKey = getattr(settings, "MESSAGING_AUTH_URL", None)
#     querystring = {"AUTH_KEY": authKey}
#     mobileNumbers = ','.join(map(str, mobileNumbers))
#     payload = json.dumps(
#         {"smsContent": smsContent, "routeId": routeId, "mobileNumbers": mobileNumbers, "senderId": "edbrcz",
#          "signature": "signature", "smsContentType": "english"})
#     headers = {
#         'Content-Type': "application/json",
#         'Cache-Control': "no-cache"
#     }
#     response = requests.request("POST", url, data=payload, headers=headers, params=querystring)
#     return response


# def validate_sms_content(smsContent):
#     smsContent.replace('"', '\\"')
#     # nikhil want to replace / this with //// but right now not able to do


# def check_mobile_number_validation(mobileNumbers):
#     for phoneno in mobileNumbers:
#         if not re.compile("(0/91)?[6-9][0-9]{9}"):
#             raise exceptions.ValidationError(f'Mobile Number ${phoneno} is not valid')
