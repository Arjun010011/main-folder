def common_response(self, response, index, column, error, errors):
    errors[index][column] = error
    if response['Reason'] and response['Reason'].get(index):
        response['Reason'][index].update(errors[index])
    else:
        response['Reason'].update(errors)
    return response


def error_validation(self, errors, schemaColumnAlias, response):
    for index, row in enumerate(errors, start=2):
        errorDict = {index: {}}
        for key, error in row.items():
            if schemaColumnAlias.get(key):
                response = common_response(self, response, index, schemaColumnAlias[key], error, errorDict)
            else:
                response = common_response(self, response, index, key, error, errorDict)
    return response
