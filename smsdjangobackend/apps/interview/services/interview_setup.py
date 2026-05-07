import logging

from django.db import transaction
from rest_framework import exceptions

from apps.interview.models import InterviewSetup, InterviewRound
from apps.interview.serializers import (
    InterviewSetupSerializer, InterviewRoundSerializer
)
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name

log = logging.getLogger(__name__)


def add_interview_setup(self, data):
    """
    Create an InterviewSetup along with its InterviewRound entries.
    Payload:
    {
        "name": "...",
        "job_role": 1,
        "no_of_rounds": 3,
        "description": "...",
        "rounds": [
            {"round_number":1, "round_name":"Written Test", "assigned_staff":5, "description":"..."},
            ...
        ]
    }
    """
    rounds_data = data.pop('rounds', [])
    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.add_data(self, data, False)
        setup_id = response['data']['id']

        # create rounds
        for r in rounds_data:
            r['interview_setup'] = setup_id
        if rounds_data:
            round_ser = InterviewRoundSerializer(data=rounds_data, many=True)
            round_ser.is_valid(raise_exception=True)
            round_ser.save()

    return response


def update_interview_setup(self, data, **kwargs):
    """
    Update an InterviewSetup and rebuild its rounds.
    """
    rounds_data = data.pop('rounds', [])
    setup_id = self.kwargs.get('pk')

    with transaction.atomic(using=get_current_db_name()):
        response = SharedService.update_data(self, data, **kwargs)

        # delete old rounds and recreate
        InterviewRound.objects.filter(interview_setup_id=setup_id).delete()
        for r in rounds_data:
            r['interview_setup'] = setup_id
            r.pop('id', None)
        if rounds_data:
            round_ser = InterviewRoundSerializer(data=rounds_data, many=True)
            round_ser.is_valid(raise_exception=True)
            round_ser.save()

    return response
