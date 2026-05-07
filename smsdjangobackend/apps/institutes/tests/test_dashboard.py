from rest_framework import status
from django.test import TestCase, Client
from django.urls import reverse

from apps.institutes.models import Institute, AcademicYear

client = Client()


class DashBoardViewSetTest(TestCase):

    def setUp(self):
        self.academic_year1 = AcademicYear.objects.create(start_date='2019-06-01', end_date='2020-04-30')
        self.academic_year2 = AcademicYear.objects.create(start_date='2020-06-01', end_date='2021-04-30')
        self.data = {'students': 0, 'staff_attendence': '0/0', 'standards': 0,
                     'standards_chart_data': {'academic_year': '2020-2021',
                                              'chartData': [{'name': 'Standards', 'data': []}]},
                     'staff_students_data': {'years_list': ['2019-2020', '2020-2021'],
                                             'series': [{'name': 'Students', 'data': [0, 0]},
                                                        {'name': 'Staffs', 'data': [0, 0]}]},
                     'student_joining_variance': {'pointStart': 2019, 'data': [{'name': 'enquiry', 'data': [0, 0]},
                                                                               {'name': 'application',
                                                                                'data': [0, 0]}]},
                     'holidays': []}

    def test_get_dashboard_pos(self):
        # lis() is used because the response is coming in queryset[] list

        response = client.get(reverse('dashboard-list'))
        response.data['standards_chart_data']['chartData'][0]['data'] = list(
            response.data['standards_chart_data']['chartData'][0]['data'])
        response.data['staff_students_data']['series'][0]['data'] = list(
            response.data['staff_students_data']['series'][0]['data'])
        response.data['student_joining_variance']['data'][0]['data'] = list(
            response.data['student_joining_variance']['data'][0]['data'])
        response.data['student_joining_variance']['data'][1]['data'] = list(
            response.data['student_joining_variance']['data'][1]['data'])
        response.data['holidays'] = list(response.data['holidays'])
        self.assertEqual(response.data, self.data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
