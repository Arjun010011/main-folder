from apps.bdu.services.error import error_validation


def add_bulk_data(self, rows, aliasSchemaColumn, schemaColumnAlias):
    response = {'Reason': dict()}
    schemaRows = list()
    for row in rows:
        tempDict = dict()
        for key, value in row.items():
            tempDict[aliasSchemaColumn[key]] = value
        schemaRows.append(tempDict)
    serializer = self.get_serializer(data=schemaRows, many=True, allow_null=False)
    serializer.is_valid()
    response = error_validation(self, serializer.errors, schemaColumnAlias, response)
    if response['Reason']:
        response['error'] = True
        return response
    serializer.save()
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response
