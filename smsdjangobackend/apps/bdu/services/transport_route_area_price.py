import copy

from apps.bdu.services.error import common_response, error_validation
from apps.shared.services import ConfigurationService
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models.route import RouteArea, RoutePrice
from apps.transport.serializers import AreaPriceSerializer, RouteAreaSerializer, RoutePriceSerializer
from apps.transport.services.route import add_area, add_price, validate_add_and_update_area_data
from django.db import transaction

from rest_framework import exceptions


def add_bulk_application_student(self, rows, aliasSchemaColumn, schemaColumnAlias):
    global kwargs
    response = {'Reason': dict(), 'error': False}
    schema_rows = list()
    if 'name' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'name', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'institute_address' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'institute_address', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'price_plan_id' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'price_plan', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'rate' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'rate', 'Please make this field as Mandatory',
                                   {2: {}})
    areas = RouteArea.objects.all().values('id','name')
    existing_areas_names = {}
    existing_areas_ids = {}
    for area in areas:
        existing_areas_names[area['name']] = area
        existing_areas_ids[area['id']] = area
    existing_prices = {}
    all_prices = RoutePrice.objects.all().values('price_plan_id', 'rate', 'km', 'area_id')
    check_duplicate_areas = []
    price_on_area = ConfigurationService.get_setting_value('price_on_area')
    if price_on_area != '1':
        response['error'] = True
        response = common_response(self, response, 2, 'rate', 'Price_on_area is set to 0. it is not supported', {2: {}})
        return response

    for price in all_prices:
        if price['price_plan_id'] not in existing_prices:
            existing_prices[price['price_plan_id']] = {}
        if price['area_id'] not in existing_prices[price['price_plan_id']]:
            existing_prices[price['price_plan_id']][price['area_id']] = {}
        existing_prices[price['price_plan_id']][price['area_id']] = price
    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        error_dict = {index: {}}
        for key, value in row.items():
            if value == "":
                value = None
            if not value and aliasSchemaColumn[key] == "address_two":
                value = ""
            if not value and aliasSchemaColumn[key] == "is_aproved":
                value = 1
            temp_dict[aliasSchemaColumn[key]] = value
        if temp_dict['name'] in check_duplicate_areas:
            common_response(self, response, index, 'Duplicate values found in area name', route_serializer.errors,
                                            error_dict)
        check_duplicate_areas.append(temp_dict['name'])
        # try:
        if temp_dict['name'] in existing_areas_names:
            temp_dict['id'] = existing_areas_names[temp_dict['name']]['id']
        validate_add_and_update_area_data(self, [temp_dict])
        if 'id' in temp_dict and temp_dict['id']:
            if temp_dict['price_plan_id'] in existing_prices and temp_dict['id'] in existing_prices[temp_dict['price_plan_id']] and not temp_dict['is_update']:
                common_response(self, response, index, 'area_id', 'Duplicate price plan exist for the area',
                                        error_dict)
            route_area_obj = RouteArea.objects.get(id=temp_dict['id'])
            route_serializer = RouteAreaSerializer(instance=route_area_obj, data=temp_dict)
            route_serializer.is_valid()
            del temp_dict['id']
        else:
            route_serializer = RouteAreaSerializer(data=temp_dict)
            route_serializer.is_valid()
        if not route_serializer.is_valid():
            common_response(self, response, index, '', route_serializer.errors,
                                        error_dict)
        # except Exception as e:
        #     response = common_response(self, response, index, '', e.args,
        #                                    error_dict)
        schema_rows.append(temp_dict)
    if response['Reason']:
        response['error'] = True
        return response
    try:
        with transaction.atomic(using=get_current_db_name()):
            for row in schema_rows:
                if row.get('id'):
                    instance = RouteArea.objects.get(id=row.get('id'))
                    serializer = RouteAreaSerializer(instance=instance, data=row)
                    serializer.is_valid(raise_exception=True)
                    area = serializer.save()
                else:
                    serializer = RouteAreaSerializer(data=row)
                    serializer.is_valid(raise_exception=True)
                    area = serializer.save()
                temp = copy.deepcopy(row) #temp send for validation
                temp['rate'] = [
                    {
                        'area': area.pk,
                        'rate': row['rate']
                    }
                ]
                temp['price_plan'] = row['price_plan_id']
                add_price(self, temp, **{'is_only_validate': True}) #just for validation
                row['area'] = area.pk
                row['price_plan'] = temp['price_plan_id']
                rout_ser = AreaPriceSerializer(data=row)
                rout_ser.is_valid(raise_exception=True)
                rout_ser.save()
    except Exception as e:
        response['error'] = True
        response = common_response(self, response, 2, 'error', e.args, {2: {}})
        return response
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response