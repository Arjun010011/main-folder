from datetime import date
from apps.shared.services import SharedService
from apps.transport.models import Vehicle, VehicleDriverMapping


def read_driver_details(self):
    response = SharedService.read_data(self, True)
    vehicleDriverQueryset = VehicleDriverMapping.objects.filter(to_date__gte=date.today())
    vehicleDriver = dict(vehicleDriverQueryset.values_list('driver', 'vehicle'))
    vehicleDriverId = dict(vehicleDriverQueryset.values_list('driver', 'id'))
    vehicle = Vehicle.objects.filter(is_active=True, id__in=list(vehicleDriver.values())).values()
    vehicle = {v['id']: v for v in vehicle}
    for data in response['data']:
        try:
            data.update({'vehicle_details': vehicle[vehicleDriver[data['id']]],
                         'vehicle_driver_id': vehicleDriverId[data['id']]})
        except:
            data.update({'vehicle_details': None, 'vehicle_driver_id': None})
    return response


from django.db.models import OuterRef, Subquery

def read_driver_location(self,request):
    driver = self.request.GET.get('driver')

    if driver:
        queryset = self.get_queryset().filter(driver=driver).order_by('-id').first()
        serializer = self.get_serializer(queryset)
        return {'data': serializer.data}

    latest = self.get_queryset().filter(
        driver=OuterRef('driver')
    ).order_by('-id')

    queryset = self.get_queryset().filter(
        id=Subquery(latest.values('id')[:1])
    )

    serializer = self.get_serializer(queryset, many=True)
    return {'data': serializer.data}