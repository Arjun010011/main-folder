from django.db.models import Sum
from rest_framework import exceptions

from apps.finance.models import FeeStandardMapping
from apps.finance.models.concession import Concession
from apps.finance.services import calculations
from apps.shared.services import SharedService

CONCESSION_TYPE_TOTAL = 'total'


def get_concession_students_list(self):
    academic_year = self.request.GET.get('academic_year')
    standard = self.request.GET.get('standard')
    if not FeeStandardMapping.objects.filter(academic_year=academic_year, standard=standard, is_approved='1'):
        raise exceptions.ValidationError('Fee plan is not approved.')
    student_queryset = self.filter_queryset(self.get_queryset()).filter(is_active=True,
                                                                       standard_student__academic_year=academic_year,
                                                                       standard_student__standard=standard)
    student_serializer = self.get_serializer(student_queryset, many=True)
    data, count, next_page, previous_page = SharedService.custom_pagination(self, student_serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    concession_student = Concession.objects.filter(is_active=True, academic_year=academic_year, concession_adjustment__is_active=True).values(
        'concession_adjustment__student', 'concession_type__name').annotate(
        concession_amount=Sum('concession_adjustment__amount')).values('concession_adjustment__student',
                                                                       'concession_type__name',
                                                                       'concession_amount')
    concession_student = {concess['concession_adjustment__student']: concess for concess in concession_student}
    for student_list in data:
        paid_data = calculations.paid_data_and_status(self, student_list['id'], academic_year, standard)
        is_full_paid = paid_data['is_paid']
        if student_list['id'] in concession_student:
            concession_applied = True
            concession_name = concession_student[student_list['id']]['concession_type__name']
            concession_amount = concession_student[student_list['id']]['concession_amount']
        else:
            concession_applied = False
            concession_name = None
            concession_amount = 0
        student_list.update({'concession_applied': concession_applied, 'concession_type_name': concession_name,
                            'concession_amount': concession_amount, 'is_fully_paid': is_full_paid})
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
