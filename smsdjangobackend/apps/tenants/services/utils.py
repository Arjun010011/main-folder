from django.conf import settings
from rest_framework import exceptions

COMPANY_DATA = getattr(settings, 'COMPANY_DATA', None)
DOMAIN_EXTENSION = getattr(settings, 'DOMAIN_EXTENSION', None)

def hostname_from_request(request):
    # split on `:` to remove port
    return request.get_host().split(':')[0].lower()


def tenant_db_from_request(request):
    return 'default'
    hostname = hostname_from_request(request)
    host = get_tenants_map(hostname)
    return host

def get_tenants_map(hostname):
    #when domain and database name are different use this
    mappedData = {
        'localhost': 'default'
    }
    for d in COMPANY_DATA['data']:
        temp = d['domain']
        if DOMAIN_EXTENSION:
            temp += '.' + DOMAIN_EXTENSION
        mappedData[temp] = d['database_key']
    if hostname not in mappedData:
        raise exceptions.ValidationError('Invalid Host')
    return mappedData[hostname]

def get_current_database_name(database_key):
    database_name = ''
    for company in COMPANY_DATA['data']:
        if company['database_key'] == database_key:
            database_name = company['database_name']
    return database_name