from apps.shared.models.menu import Menu
from apps.classes.models.standard import Board, Branch
from apps.shared.services import FormdefinitionService, SharedService
from apps.institutes.models import Institute
from apps.shared.models.custom import FormDefinition
from apps.shared.models.configuration import Setting
from apps.shared.serializers import GetSettingSerializer, MenuSerializer

def get_app_user(self):
    response = {'data': {}}
    self.kwargs['pk'] = self.request.user.pk
    response['data']['user'] = SharedService.read_data(self)['data']
    app_type = self.request.GET.get('app_type')
    settingData = Setting.objects.filter(is_active=1)
    settingData = GetSettingSerializer(settingData, many=True).data
    settingData = {setting['name']: setting for setting in settingData}
    response['data']['settings'] = settingData
    if app_type == 'staff':
        app_type = 'staff_app'
    elif app_type == 'student':
        app_type = 'app'
    queryset = Menu.objects.filter(menu_type=app_type)
    serializer = MenuSerializer(queryset, many=True)
    response['data']['menu'] = serializer.data
    response['data']['user']['other_details'] = SharedService.get_current_details_for_user(self)['data']
    response['data']['branches'] = Branch.objects.all().values()
    response['data']['boards'] = Board.objects.all().values()
    institutedata = Institute.objects.filter().values()[0]
    response['data']['user']['institute_details'] = institutedata
    groups = list()
    for group in response['data']['user']['groups']:
        for permission in group.pop('permissions'):
            groups.append(permission)
    response['data']['user']['groups'] = set(groups)
    response['data']['formdefintion'] = FormdefinitionService.get_formdefinition_for_app(self)
    return response
