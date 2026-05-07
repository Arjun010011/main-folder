from django.apps import apps
from django.conf import settings

from apps.bdu.models import BduValidationClass
from apps.bdu.serializers import BduValidationClassSerializer

INSTALLED_APPS = getattr(settings, 'INSTALLED_APPS', None)


def get_models(self):
    modelList = list()
    for installed_apps in INSTALLED_APPS:
        if 'apps' in installed_apps:
            app = installed_apps.split('.')[1]
            for models in apps.get_app_config(app).models.keys():
                model = f'{app}.{models}'
                modelList.append({'id': model, 'name': model})
    return {'data': modelList}


def get_model_fields(self):
    fieldList = list()
    module = self.request.GET.get('id').split('.')
    appMeta = apps.get_model(module[0], module[1])._meta
    for field in appMeta._forward_fields_map:
        if '_id' in field or field in ['created', 'modified']:
            continue
        fieldDetails = appMeta.get_field(field)
        verboseName = fieldDetails.verbose_name
        if field == 'id':
            verboseName = appMeta.verbose_name + '_' + field
        fieldList.append({'schema_column': field, 'type': fieldDetails.get_internal_type(), 'alias': verboseName,
                          'max_length': fieldDetails.max_length, 'required': False, 'update_allowed': False,
                          'exclude_from_view': False, 'ignored': False})
    queryset = BduValidationClass.objects.all()
    serializer = BduValidationClassSerializer(queryset, many=True)
    return {'data': {'field_list': fieldList, 'bdu_validation_class': serializer.data}}
