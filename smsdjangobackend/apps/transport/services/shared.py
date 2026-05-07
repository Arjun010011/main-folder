from datetime import date, timedelta

from apps.transport.models import VehicleLocation


def soft_delete_data(self):
    if self.queryset.filter(from_date=date.today()):
        self.queryset.delete()
    else:
        self.queryset.update(to_date=date.today() - timedelta(days=1))
    return {'Reason': 'Data Deleted Successfully!'}


from django.db.models import Max

def read_data(self, isList=False):

    if self.request.GET.get('vehicle'):
        queryset = VehicleLocation.objects.filter(
            vehicle=self.request.GET.get('vehicle')
        ).order_by('-created')[:1]

    else:
        latest = VehicleLocation.objects.values('vehicle').annotate(
            latest_created=Max('created')
        )

        queryset = VehicleLocation.objects.filter(
            created__in=[i['latest_created'] for i in latest]
        )

    serializer = self.get_serializer(queryset, many=True)
    return {'data': serializer.data}
