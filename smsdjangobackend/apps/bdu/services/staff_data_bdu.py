from django.db import transaction
from rest_framework import exceptions
from django.contrib.auth.models import Group


from apps.forms.serializers import (ApplicationStudentDetailSerializer, ApplicationStudentBulkAddressSerializer,
                                    ApplicationParentDetailSerializer, ApplicationGuardianDetailSerializer,
                                    ApplicationStudentAddressSerializer, ApplicationStudentParentMappingSerializer,
                                    ApplicationStudentSerializer)
from apps.forms.models import EnquiryStudent
from apps.bdu.services.error import error_validation, common_response
from apps.shared.models import Counter
from apps.shared.services import CounterService
from apps.staffs.services.staff import add_staff
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User


def add_bulk_staff_data(self, rows, aliasSchemaColumn, schemaColumnAlias):
   for index, row in enumerate(rows, start=2):
        staff_data = {
            'staff': {
                "first_name": row["first name"],
                "middle_name": row["middle name"],
                "last_name": row['last name'],
                "dob": row['dob'],
                "email": row['email'],
                "mobile_num": row['mobile num'],
                "alternate_mobile_num": row['alternate mobile num'],
                "qualification": row['qualification'],
                "designation": row['designation'],
                "gender": row['gender'],
                "marital_status": row['marital status'],
                "employee_status": "F",
                "frequency": "M",
                "measure": "12",
                "salary": row['salary'],
                "aadhar_num": row['aadhar num'],
                "job_title": row['job title'],
                "date_joined": row['date joined'],
                "employee_id": row['Employee Id'],
                "father_or_husband_name": row["father or husband name"],
                "experience_in_num": row["experience in num"],
                "previous_job_details": {
                    "prev_school_name": row['Previous Institute Name'],
                    "prev_date_joined": row['Previous job Date of joining'],
                    "prev_date_left": row['Previous Job Last Working Day'],
                    "prev_designation": '',
                    "prev_reason_leaving": row['Previous Job Leaving Reason']
                },
                "profile_pic": ''
            },
            'staff_nominee': {},
            'accounts':{},
            'users': {
                "username": row['Username'],
                "password": row['Password'],
                "groups": [
                    Group.objects.get(name=row['Job Role']).id
                ],
                "reporting_to": User.objects.filter(is_superuser=True).first().id
            },
        }
        response = add_staff(self, staff_data)
        error_dict = {index: {}}
        return response

            