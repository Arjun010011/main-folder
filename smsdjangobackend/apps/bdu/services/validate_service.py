import re
from datetime import datetime
from rest_framework import exceptions

from apps.bdu.utils import trim
from apps.shared.services import SharedService


def validate_main(self, columnDefinitions, sheet, uploadType, tableName, getRowData=1):
    response = {'Reason': dict(), 'data': list(), 'error': True}
    cellDatas = dict()
    # index start from 1pr
    for index, row in enumerate(sheet.rows(), start=2):
        row = trim(row)
        rowData = dict()
        strippedTableName = tableName + '_id'
        errorDict = {}
        allEmpty = 'There is no data to insert or update.'
        for columnAlias, cellValue in zip(sheet.colnames, row):
            errorDict[columnAlias] = list()
            if columnAlias != 'id' or columnDefinitions[columnAlias]['schema_column'] != 'id':
                if cellValue:
                    allEmpty = ''
            if columnDefinitions.get(columnAlias):
                if (not columnDefinitions[columnAlias]['required']) and cellValue == '' and (
                        not columnDefinitions[columnAlias]['exclude_from_view']) and uploadType == 'insert':
                    rowData[columnAlias] = None
                    if not errorDict[columnAlias]:
                        del errorDict[columnAlias]
                    continue
                if (columnDefinitions[columnAlias]['required'] and cellValue == '' and uploadType == 'insert') or (
                        columnAlias == strippedTableName and (not cellValue) and uploadType != 'insert'):
                    errorDict[columnAlias].append('Mandatory field cannot be empty.')
                if columnDefinitions[columnAlias]['update_allowed'] and cellValue == '' and uploadType != 'insert':
                    rowData[columnAlias] = cellValue
                    if not errorDict[columnAlias]:
                        del errorDict[columnAlias]
                    continue
                schemaColumn = columnDefinitions[columnAlias]['schema_column']
                for columnValidationRule in columnDefinitions[columnAlias]['bdu_validation_column']:
                    validationClassId = columnValidationRule['bdu_validation_class']
                    if validationClassId == 9:  # duplicatesInSheet required this
                        try:
                            cellDatas[columnAlias].append(cellValue)
                        except:
                            cellDatas[columnAlias] = [cellValue]
                    validationResult = validateCellData(validationClassId, columnValidationRule['validation_value'],
                                                        cellValue, row, schemaColumn, cellDatas, columnAlias)
                    if validationResult['Reason']:
                        errorDict[columnAlias].append(validationResult['Reason'])
                    else:
                        cellValue = validationResult['SanitizedValue']
            rowData[columnAlias] = cellValue
            if not errorDict[columnAlias]:
                del errorDict[columnAlias]
        if errorDict:
            response['Reason'].update({index: errorDict})
        if allEmpty:
            response['Reason'].update({index: allEmpty})
        if getRowData:
            response['data'].append(rowData)
    return response


def validateCellData(validationClassId, validationValue, cellValue, row, columnName, cellDatas=dict(), alias=None):
    response = {'Reason': list(), 'SanitizedValue': ''}
    if validationClassId == 1:
        response['SanitizedValue'] = cellValue
    elif validationClassId == 2:  # Date (DD-MM-YYYY)
        response = is_date(cellValue, '%d-%m-%Y', 'DD-MM-YYYY')
    elif validationClassId == 3:
        # Is mobile # 1) Begins with 0 or 91 # 2) Then contains 7 or 8 or 9. # 3) Then contains 9 digits
        response = check_regex_or_mobile(cellValue, '(0/91)?[7-9][0-9]{9}', 'Phone number')
    elif validationClassId == 4:  # Date (YYYY-MM-DD)
        response = is_date(cellValue, '%Y-%m-%d', 'YYYY-MM-DD')
    elif validationClassId == 5:  # Datetime (YYYY-MM-DD H:M:S)
        response = is_date(cellValue, '%Y-%m-%d %H:%M:%S', 'YYYY-MM-DD H:M:S', 'time')
    elif validationClassId == 6:  # Is numeric
        response = is_numeric(cellValue)
    elif validationClassId == 7:  # Min length
        response = check_string_length(cellValue, validationValue, 0)
    elif validationClassId == 8:  # Max length
        response = check_string_length(cellValue, 0, validationValue)
    elif validationClassId == 9:  # duplicate in Sheet
        response = check_for_duplicate(cellValue, cellDatas, alias)
    elif validationClassId == 10:  # custom Regex
        response = check_regex_or_mobile(cellValue, validationValue)
    elif validationClassId == 11:  # Is Alphabets
        response = is_alpha(cellValue)
    return response


def is_date(data, format, value, dt='date'):
    response = {'Reason': '', 'SanitizedValue': ''}
    try:
        if isinstance(data, datetime):
            d = data
        else:
            d = datetime.strptime(data, format)
        if dt == 'date':
            response['SanitizedValue'] = datetime.date(d)
        else:
            response['SanitizedValue'] = d
    except:
        response['Reason'] = f'Incorrect date format, should be {value}'
    return response


# it is checking for custom regex or is_valid_mobile
def check_regex_or_mobile(cellValue, validationValue, value=''):
    response = {'Reason': '', 'SanitizedValue': ''}
    try:
        if cellValue:
            if not str(cellValue).startswith('+'):
                cellValue = '+'+str(cellValue)
        SharedService.validate_india_mobile_number(cellValue)
        response['SanitizedValue'] = cellValue
    except Exception as e:
        response['Reason'] = 'Invalid mobile number eg: +917892086332 or 917892086332'
    return response


def is_numeric(cellValue):
    response = {'Reason': '', 'SanitizedValue': ''}
    if str(cellValue).isnumeric():
        response['SanitizedValue'] = cellValue
    else:
        response['Reason'] = f'The value {cellValue} should be numeric.'
    return response


def is_alpha(cellValue):
    response = {'Reason': '', 'SanitizedValue': ''}
    if str(cellValue).isalpha():
        response['SanitizedValue'] = cellValue
    else:
        response['Reason'] = f'The value {cellValue} should be alphabets.'
    return response


def check_string_length(string, minLength=0, maxLength=0):
    response = {'Reason': '', 'SanitizedValue': string}
    length = len(str(string))
    if maxLength == 0:
        if length < int(minLength):
            response['Reason'] = f'The value {string} should have minimum {minLength} letters.'
    else:
        if length > int(maxLength):
            response['Reason'] = f'The value {string} should have maximum {maxLength} letters.'
    return response


def check_for_duplicate(cellValue, cellDatas, alias):
    response = {'Reason': '', 'SanitizedValue': ''}
    count = 0
    for value in cellDatas[alias]:
        if cellValue == value:
            count += 1
        if count == 2:
            break
    if count > 1:
        response['Reason'] = f'The value {cellValue} is duplicate.'
    else:
        response['SanitizedValue'] = cellValue
    return response
