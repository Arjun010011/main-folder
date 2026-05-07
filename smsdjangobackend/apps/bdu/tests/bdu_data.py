from apps.bdu.models import BduValidationClass, Bdu, BduColumn, BduValidation


def add_bdu_data(self):
    self.bdu = Bdu.objects.create(name='Student', description='Students details', primary_table='Student',
                                  upload_type='both', transaction_id='1')
    self.bdu_column = BduColumn.objects.create(bdu=self.bdu, schema_column='first_name', required=True,
                                               alias='First Name')
    self.bdu_validation_class = BduValidationClass.objects.get(id=7)
    self.bdu_validation = BduValidation.objects.create(bdu_column=self.bdu_column, validation_value='Min length 2',
                                                       bdu_validation_class=self.bdu_validation_class)


def bdu_data(self):
    return {'id': self.bdu.pk, 'name': 'Student', 'description': 'Students details', 'primary_table': 'Student',
            'upload_type': 'both', 'process_hook': None, 'process_function': None, 'is_active': True,
            'read_only': False, 'transaction_id': '1', 'bulk_upload_supported': False}


def bdu_full_data(self):
    return {'id': self.bdu.pk, 'bdu_column_bdu': [{'id': self.bdu_column.pk, 'bdu_validation_column': [
        {'id': self.bdu_validation.pk, 'validation_type': 'Min length', 'error_message': None,
         'validation_value': 'Min length 2',
         'bdu_column': self.bdu_column.pk, 'bdu_validation_class': 7}], 'schema_table': None,
                                                   'schema_column': 'first_name',
                                                   'required': True, 'alias': 'First Name', 'update_allowed': True,
                                                   'exclude_from_view': False, 'ignored': False, 'bdu': self.bdu.pk}],
            'name': 'Student',
            'description': 'Students details', 'primary_table': 'Student', 'upload_type': 'both', 'process_hook': None,
            'process_function': None, 'is_active': True, 'read_only': False, 'transaction_id': '1',
            'bulk_upload_supported': False}


def valid_payload(self):
    return {
        'bdu': {'name': 'Student', 'description': 'Students details', 'primary_table': 'Student', 'upload_type': 'both',
                'process_hook': None, 'process_function': None, 'read_only': False, 'transaction_id': '1',
                'bulk_upload_supported': False}, 'columns': [
            {'bdu': self.bdu.pk, 'schema_table': '', 'schema_column': 'last_name', 'required': True,
             'alias': 'Last Name', 'update_allowed': True, 'exclude_from_view': '0', 'ignored': '0',
             'validations': [{'bdu_validation_class': '7', 'validation_value': 'Min length 2'}]}]}


def invalid_payload(self):
    return {
        'bdu': {'name': 'Student', 'description': 'Students details', 'primary_table': 'Student', 'upload_type': 'both',
                'process_hook': None, 'process_function': None, 'read_only': False, 'transaction_id': '1',
                'bulk_upload_supported': False}, 'columns': [
            {'bdu': self.bdu.pk, 'schema_table': '', 'schema_column': 'first_name', 'required': True,
             'alias': 'First Name', 'update_allowed': True, 'exclude_from_view': '0', 'ignored': '0',
             'validations': [{'bdu_validation_class': '7', 'validation_value': 'Min length 2'}]}]}
