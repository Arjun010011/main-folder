import json


def get_app_permission(self):
    f = open('apps/shared/templates/jsons/app_permission_list.json', )
    data = json.load(f)
    return {'data': data}


def add_app_permission(self, data):
    with open('apps/shared/templates/jsons/app_permission_list.json', 'w') as jsonFile:
        json.dump(data, jsonFile)
    return {'Reason': 'Data added Successfully!'}

def get_staff_app_permission(self):
    f = open('apps/shared/templates/jsons/staff_app_permission_list.json', )
    data = json.load(f)
    return {'data': data}

def add_staff_app_permission(self, data):
    with open('apps/shared/templates/jsons/staff_app_permission_list.json', 'w') as jsonFile:
        json.dump(data, jsonFile)
    return {'Reason': 'Data added Successfully!'}