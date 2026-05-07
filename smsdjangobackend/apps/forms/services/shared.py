from apps.classes.models.enrollment import StudentStandardMapping
from apps.notification.models import notification
from apps.notification.services.notification_service import send_notification
from apps.shared.services import NotificationBodyTemplate, SharedService
from apps.students.models import StudentDetails
from apps.users.models import User


def get_forms_paginated_list(self, type):
    fromDate = self.request.GET.get('from_date')
    toDate = self.request.GET.get('to_date')
    queryset = self.filter_queryset(self.get_queryset())
    if self.request.GET.get('current_standard'):
        current_standard = self.request.GET.get('current_standard').split(',')
        queryset = queryset.filter(current_standard__in=current_standard)
    if self.request.GET.get('branch'):
        queryset = queryset.filter(current_standard__branch=self.request.GET.get('branch'))
    if self.request.GET.get('board'):
        queryset = queryset.filter(current_standard__board=self.request.GET.get('board'))
    if fromDate and toDate:
        if type == 'application':
            queryset = queryset.filter(application_date__range=(fromDate, toDate))
        else:
            queryset = queryset.filter(enquiry_date__range=(fromDate, toDate))
    if self.request.GET.get('student_type'):
        queryset = queryset.filter(student_type__startswith=self.request.GET.get('student_type'))
    serializer = self.get_serializer(queryset, many=True)
    if self.request.GET.get('download_excel'):
        return serializer.data
    data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                            self.request.GET.get('limit'),
                                                                            self.request.GET.get('pageno'))
    if type == 'application':
        studentDetails = StudentDetails.objects.all()
        for student in data:
            student.update({'admission': studentDetails.filter(application=student['id']).exists()})
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'student_list': data}}
