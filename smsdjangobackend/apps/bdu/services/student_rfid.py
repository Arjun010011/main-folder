from apps.bdu.services.error import common_response, error_validation
from apps.students.models.student import Student
from apps.students.services.student import add_student_rfid, get_student_id_fuzzy
from apps.tenants.services.middlewares import get_current_db_name
from django.db import transaction


def add_student_rfid_bdu(self, rows, aliasSchemaColumn, schemaColumnAlias):
    response = {'Reason': dict(), 'error': False}
    schema_rows = list()
    seen_rfids = {}

    mandatory_fields = ['academic_year', 'standard', 'full_name', 'rfid']
    for field in mandatory_fields:
        if field not in schemaColumnAlias:
            response = common_response(
                self, response, 2, field, f'Please make {field} field as Mandatory', {2: {}}
            )

    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        for key, value in row.items():
            temp_dict[aliasSchemaColumn[key]] = value

        academic_year_id = temp_dict.get('academic_year')
        standard_id = temp_dict.get('standard')
        student_name = temp_dict.get('full_name')
        rfid_value = str(temp_dict.get('rfid')).strip() if temp_dict.get('rfid') else None

        student_id = get_student_id_fuzzy(student_name, standard_id, academic_year_id)
        if not student_id:
            response = common_response(
                self, response, index, 'full_name',
                f'Student "{student_name}" not found for the given standard and academic year',
                {index: {}}
            )
            continue

        if not rfid_value:
            response = common_response(self, response, index, 'rfid', 'RFID value is required', {index: {}})
            continue

        if rfid_value in seen_rfids:
            response = common_response(
                self, response, index, 'rfid',
                f'RFID "{rfid_value}" is already used in row {seen_rfids[rfid_value]} in this sheet',
                {index: {}}
            )
            continue
        seen_rfids[rfid_value] = index

        existing_rfid = Student.objects.filter(rfid=rfid_value).exclude(id=student_id).first()
        if existing_rfid:
            response = common_response(
                self, response, index, 'rfid',
                f'RFID "{rfid_value}" is already assigned to another student in the database',
                {index: {}}
            )
            continue

        temp_dict['student'] = student_id
        temp_dict['rfid'] = rfid_value
        schema_rows.append(temp_dict)

    if response['Reason']:
        response['error'] = True
        return response

    try:
        with transaction.atomic(using=get_current_db_name()):
            request = type("Request", (), {})()  # Create a dummy request object
            request.data = {"rfid_datas": schema_rows}
            result = add_student_rfid(self,request)
            # for row in schema_rows:
            #     student_obj = Student.objects.get(id=row['student'])
            #     student_obj.rfid = row['rfid']
            #     student_obj.save(update_fields=['rfid'])
    except Exception as e:
        response['error'] = True
        response = common_response(self, response, index, 'error', f'Error: {str(e)}', {index: {}})
        return response

    response['Reason'] = 'RFID Data Updated Successfully!'
    response['error'] = False
    return response
