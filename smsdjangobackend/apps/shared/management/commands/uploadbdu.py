"""
Import json data from URL to Datababse
"""
import json
import ast

from apps.bdu.models import Bdu, BduColumn, BduValidationClass, BduValidation
from apps.classes.models.attendance import MachineAttendanceFailedToSaveData, MachineAttendanceLog
from apps.shared.models import Url  # Import your model here
from django.core.management.base import BaseCommand
from rest_framework import exceptions

from apps.shared.models.menu import Menu
from apps.shared.services import SharedService, UploadTypeService
from apps.users.services.permissions import create_contenttypes_and_permissions, save_content_type_and_permission


class Command(BaseCommand):

    def import_bdus(self, dataList):
        bduValidationFields = [field.name for field in BduValidation._meta.get_fields()]
        bduColumnFields = [field.name for field in BduColumn._meta.get_fields()]
        for data in dataList:
            # try:  # try and catch for saving the objects
                # data['bdu']['transaction_id'] = random.randint(0, 9)
                try:
                    bdu = Bdu.objects.get(transaction_id=data['bdu']['transaction_id'])
                except Bdu.DoesNotExist:  #f BDU object does not exist
                    # create BDU object
                    bdu = Bdu(**data['bdu'])
                    bdu.save()
                for column in data['columns']:
                    if 'id' in column:
                        del column['id']
                    try:
                        validation = column.pop('bdu_validation_column')
                        if 'max_length' in column:
                            column.pop('max_length')
                        if 'type' in column:
                            column.pop('type')
                        column['bdu'] = bdu
                        tempCol = {}
                        for i in column:
                            if i in bduColumnFields:
                                tempCol.update({i:column[i]})
                        try:
                            obj = BduColumn.objects.get(schema_column=column['schema_column'], bdu=bdu.id)
                        except BduColumn.DoesNotExist:  #f BduColumn object does not exist
                            # create BduColumn object
                            obj = BduColumn(**column)
                            obj.save()
                        for val in validation:
                            val.pop('validation_type')
                            val['bdu_validation_class'] = BduValidationClass.objects.get(
                                id=val.pop('bdu_validation_class'))
                            val['bdu_column'] = obj
                            tempVal = {}
                            for i in val:
                                if i in bduValidationFields:
                                    tempVal.update({i:val[i]})
                            try:
                                bduval = BduValidation.objects.get(bdu_column=tempVal['bdu_column'])
                            except BduValidation.DoesNotExist:  #f BduColumn object does not exist
                                # create BduColumn object
                                bduval = BduValidation(**tempVal)
                                bduval.save()
                    except Exception as e:
                        pass
            # except Exception as ex:
            #     raise exceptions.ValidationError('Something went wrong')

    def validate_bdu_colums(self, dataList):
        for data in dataList:
            SharedService.duplicate_list_one_object(data['columns'], 'schema_column')
            SharedService.duplicate_list_one_object(data['columns'], 'alias')

    # def update_user_id_for_attendance_log(self):
    #     machineattendancelog = MachineAttendanceLog.objects.all()
    #     for machine_row in machineattendancelog:
    #         json_data =  ast.literal_eval(machine_row.json)
    #         if 'RealTime' in json_data and 'UserUpdated' in json_data['RealTime']:
    #             machine_row.machine_user_id = json_data['RealTime']['UserUpdated']['UserID']
    #         elif 'RealTime' in json_data and 'PunchLog' in json_data['RealTime']:
    #             machine_row.machine_user_id = json_data['RealTime']['PunchLog']['UserId']
    #         machine_row.save()

    def correct_resource_table(self):
        from apps.institutes.models.resource import Resource
        Resource.objects.filter(name="ivr").exclude(max_limit=50).delete()


    def handle(self, *args, **options):
        f = open('apps/shared/templates/jsons/bdu_list.json', )
        data = json.load(f)
        self.validate_bdu_colums(data)
        self.import_bdus(data)
        self.correct_resource_table()
        # self.update_user_id_for_attendance_log()