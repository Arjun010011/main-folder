import logging
from datetime import datetime

from django.db import transaction

from apps.interview.serializers import (
    JobApplicationSerializer, JobApplicationDocumentSerializer
)
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name

log = logging.getLogger(__name__)


def generate_application_number():
    return 'JA' + datetime.now().strftime('%Y%m%d%H%M%S') + SharedService.generate_random_number()


def add_job_application_public(self, data):
    additional_docs = data.pop('additional_documents', [])
    custom_data = data.pop('custom_data', None)

    data['application_num'] = generate_application_number()
    data['applied_date'] = datetime.now().date()
    data['status'] = 1

    with transaction.atomic(using=get_current_db_name()):
        ser = JobApplicationSerializer(data=data)
        ser.is_valid(raise_exception=True)
        application = ser.save()

        for doc in additional_docs:
            doc['job_application'] = application.id
        if additional_docs:
            doc_ser = JobApplicationDocumentSerializer(data=additional_docs, many=True)
            doc_ser.is_valid(raise_exception=True)
            doc_ser.save()

        if custom_data:
            try:
                from apps.shared.services_shared.custom import add_or_update_custom_data
                custom_form_id = custom_data.get('custom_form_id')
                custom_form_data = custom_data.get('custom_form_data')
                if custom_form_id and custom_form_data:
                    add_or_update_custom_data(self, custom_form_id, custom_form_data, application)
            except Exception as e:
                log.warning(f"Custom data save skipped: {e}")


    return {'data': ser.data, 'Reason': 'Application submitted successfully!'}


def update_job_application(self, data, **kwargs):
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, partial=True, **kwargs)
    return response
