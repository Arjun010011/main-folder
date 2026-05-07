from datetime import datetime

from apps.hr.services.staffleave import create_default_leave_type
from apps.institutes.models import FinancialYear
from apps.shared.serializers import CounterSerializer
from apps.shared.services import SharedService, CounterService


def add_update_financial_year(self, data, pk=None):
    queryset = self.get_queryset().exclude(id=pk).values() if pk else self.get_queryset().values()
    SharedService.check_two_date_range_exist(data['start_date'], data['end_date'], queryset, 'start_date', 'end_date')
    if pk:
        response = SharedService.update_data(self, data)
    else:
        response = SharedService.add_data(self, data, False)
        create_default_leave_type(self, response['data']['id'])
        counterList = list()
        for name, value in CounterService.COUNTERS.items():
            if value['financial_year']:
                counterList.append(
                    {'type': value['type'], 'alias_name': value['alias_name'], 'financial_year': response['data']['id'],
                     'value': 1, 'prefix': value['prefix'], 'postfix': value['postfix']})
        serializer = CounterSerializer(data=counterList, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
    return response


def get_current_financial_year(self):
    response = SharedService.read_data(self, True)
    financialYear = FinancialYear.get_financial_year_for_date(self, datetime.today())
    if financialYear:
        for data in response['data']:
            if data['id'] == financialYear['id']:
                data['current_year'] = True
                break
    return response
