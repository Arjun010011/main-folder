from rest_framework.exceptions import ValidationError
import json
from django.db import connection
import subprocess
from apps.institutes.models.institute import Institute
from apps.shared.services import SharedService
from apps.users.models import User

from apps.notification.services.notification_service import send_notification, send_web_push_notification
from django.conf import settings

DB = getattr(settings, 'DATABASES', None)

def add_company(self, request):
    customized_data = []
    body = 'Company Data Created Successfully. <br/>'
    email_sending_body = {'email': request.data['email_ids'], 'user_id': None, 'email_subject': 'New Company Creation',
                                'email_body': body}
    try:
        company_data = {'data': []}
        f = open('apps/tenants/templates/jsons/companies.json', )
        company_data = json.load(f)
        company_data['data'].append(
            {
                "database_name": request.data['database_name'],
                "domain": request.data['domain'],
                "database_key": request.data['database_key']
            }
        )
        cursor = connection.cursor()
        create_query = 'create database '+request.data['database_name']
        cursor.execute(create_query)
        with open('apps/tenants/templates/jsons/companies.json', 'w') as jsonFile:
            json.dump(company_data, jsonFile)
        cmd = 'sh server.sh -n '+request.data['database_name']
        cmd += ' -k '+request.data['database_key']
        cmd += ' -h '+DB['default']['HOST']
        cmd += ' -x '+DB['default']['USER']
        cmd += ' -z '+DB['default']['PASSWORD']
        default_username = request.data['default_username'] if 'default_username' in request.data else 'admin'
        default_password = request.data['default_password'] if 'default_password' in request.data else 'edubricz'
        subprocess.call(cmd, shell=True)
        insetQuery = 'use ' + str(request.data['database_name'])+';insert into `institutes_institute`(`name`, `code`, `tel_num`, `company_id`, `enquiry_format`, `application_format`, `admission_format`, `created`, `modified`, `quiz_instructions`, `social_links`)values("'+str(
            request.data["name"])+'","'+str(request.data["code"])+'","'+str(request.data["tel_num"])+'","'+str(request.data["company_id"])+'","'+str(request.data["enquiry_format"])+'","'+str(request.data["application_format"])+'","'+str(request.data["admission_format"])+f'",NOW(),NOW(), "", JSON_OBJECT())'
        cursor.execute(insetQuery)
        User.objects.create_superuser(default_username, default_password)
    except Exception as e:
        email_sending_body['email_body'] = str(e.args) + ' <br />'
        email_sending_body['email_subject'] += '<div style="color:red"> Failed </div>'
    email_sending_body['email_body'] += 'Request Data: <br/>'+ json.dumps(request.data)
    customized_data.append(email_sending_body)
    #nikhil write this different function to send notification when company is not created we wont get company object so
    send_notification('company_create', body, touserIds=[], customizedData=customized_data)
    return {'Reason': 'Company created successfully!'}

def validate_add_company(self, request):
    companyData = {'data': []}
    f = open('apps/tenants/templates/jsons/companies.json', )
    companyData = json.load(f)
    for i in companyData['data']:
        if i['database_name'] == request.data['database_name']:
            raise ValidationError('Given database already exist')
        if i['database_key'] == request.data['database_key']:
            raise ValidationError('Given database_key already exists')

def update_company_json(self, request, *args, **kwargs):
    response = {'Reason': 'Data updated Sucesfully'}
    f = open('apps/tenants/templates/jsons/companies.json', )
    originalData = json.load(f)
    databaseNames = []
    databaseKeyNames = []
    for t in originalData['data']:
        databaseNames.append(t['database_name'])
        databaseKeyNames.append(t['database_key'])
    dataToAppend = []
    for i in request.data['companies_list']:
        if i['database_name'] in databaseNames:
            continue
        if i['database_key'] in databaseKeyNames:
            continue
        dataToAppend.append(i)
    originalData['data'] += dataToAppend
    with open('apps/tenants/templates/jsons/companies.json', 'w') as jsonFile:
        json.dump(originalData, jsonFile)
    cmd = 'sh reload_server.sh'
    subprocess.call(cmd, shell=True)
    return response


def server_operations(self, request):
    cmd = None
    if request.data['command'] == 'reload':
        cmd = 'sh reload_server.sh '
    elif request.data['command'] == 'gitpull':
        cmd = 'sh server.sh -g git'
    elif request.data['command'] == 'uploadurl':
        cmd = 'sh server.sh -u uploadurl'
    elif request.data['command'] == 'all':
        cmd = 'sh server.sh -g git -u uploadurl'
    if cmd:
        SharedService.custom_thread(process_data, self, cmd, request)
    return {'Reason': 'you will get notification once process done'}

def process_data(self, cmd, request):
    try:
        subprocess.call(cmd, shell=True)
        message_data = 'executed command : '+cmd+ ' Result Successs' 
    except subprocess.CalledProcessError as err:
        message_data = f"{err} {err.stderr.decode('utf8')}"
    data = {
        'heading': 'Server Operation',
        'message_data' :'executed command : '+cmd+ ' Result:'+ message_data
    }
    send_web_push_notification, self, request.data['user'], data, None

def clear_data_in_database(self, request):
    pass