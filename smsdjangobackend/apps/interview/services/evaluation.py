import logging

from django.db import transaction

from apps.tenants.services.middlewares import get_current_db_name
from apps.interview.models import InterviewEvaluation, JobApplication, InterviewRound

log = logging.getLogger(__name__)


def submit_evaluation(view, data):
    
    response = {}
    try:
        application_id = data.get('job_application')
        round_id = data.get('interview_round')
        notes = data.get('notes', '')
        decision = data.get('decision')  
        is_override = data.get('is_override', False)

        if not application_id or not round_id or not decision:
            response['error'] = 'job_application, interview_round, and decision are required.'
            return response

        with transaction.atomic(using=get_current_db_name()):
            application = JobApplication.objects.select_for_update().get(
                id=application_id, is_active=True
            )
            interview_round = InterviewRound.objects.get(id=round_id)
            interview_setup = interview_round.interview_setup

            # Determine current user's staff
            staff = None
            if hasattr(view, 'request') and hasattr(view.request, 'user') and hasattr(view.request.user, 'staff'):
                staff = view.request.user.staff

            # Check if user is incharge
            is_incharge = (
                staff and interview_setup.incharge_staff_id
                and interview_setup.incharge_staff_id == staff.id
            )

            # Incharge can override any round/decision; regular staff has checks
            if not is_incharge:
                if interview_round.round_number != application.current_round:
                    response['error'] = f'This candidate is currently on Round {application.current_round}. You cannot evaluate Round {interview_round.round_number}.'
                    return response

                if interview_round.assigned_staff and staff:
                    if interview_round.assigned_staff_id != staff.id:
                        response['error'] = 'You are not assigned to evaluate this round.'
                        return response

                if interview_round.round_number > 1:
                    prev_round_number = interview_round.round_number - 1
                    prev_evaluation = InterviewEvaluation.objects.filter(
                        job_application=application,
                        interview_round__round_number=prev_round_number,
                        interview_round__interview_setup=interview_setup,
                        decision='selected'
                    ).first()
                    if not prev_evaluation:
                        response['error'] = f'Round {prev_round_number} must be completed with a "Selected" decision before Round {interview_round.round_number} can be evaluated.'
                        return response

            evaluation, created = InterviewEvaluation.objects.update_or_create(
                job_application=application,
                interview_round=interview_round,
                defaults={
                    'evaluator_id': data.get('evaluator') or (staff.id if staff else None),
                    'notes': notes,
                    'decision': decision,
                    'is_active': True,
                }
            )

            total_rounds = interview_setup.no_of_rounds

            if decision == 'selected':
                current_round_num = interview_round.round_number
                if current_round_num < total_rounds:
                    application.current_round = current_round_num + 1
                    application.status = 2  # In Progress
                else:
                    application.status = 4  # Selected
            elif decision == 'rejected':
                application.status = 5  # Rejected
            elif decision == 'on_hold':
                application.status = 3  # On Hold

            # Link interview_setup if not already linked
            if not application.interview_setup:
                application.interview_setup = interview_setup

            application.save()

            response['data'] = {
                'id': evaluation.id,
                'decision': decision,
                'application_status': application.status,
                'current_round': application.current_round,
            }

    except JobApplication.DoesNotExist:
        response['error'] = 'Job application not found.'
    except InterviewRound.DoesNotExist:
        response['error'] = 'Interview round not found.'
    except Exception as e:
        log.exception('Error submitting evaluation')
        response['error'] = str(e)

    return response


def get_hire_prefill_data(application_id):
    response = {}
    try:
        application = JobApplication.objects.select_related(
            'job_role', 'photo', 'resume'
        ).prefetch_related(
            'interview_evaluation_job_application',
            'interview_evaluation_job_application__interview_round',
            'interview_evaluation_job_application__evaluator'
        ).get(id=application_id, is_active=True)

        if application.status not in [4, 6]:
            response['error'] = 'Candidate must be in Selected status to hire.'
            return response

        gender_map = {'Male': 'M', 'Female': 'F', 'Other': 'O'}

        response['data'] = {
            'first_name': application.first_name,
            'last_name': application.last_name or '',
            'email': application.email or '',
            'mobile_num': application.mobile_num or '',
            'dob': str(application.dob) if application.dob else '',
            'gender': gender_map.get(application.gender, ''),
            'qualification': application.qualification or '',
            'experience_in_num': str(application.experience_years) if application.experience_years else '',
            'profile_pic_id': application.photo_id,
            'address': application.address or '',
            'job_role': application.job_role.name if application.job_role else '',
            'application_id': application.id,
        }

    except JobApplication.DoesNotExist:
        response['error'] = 'Job application not found.'
    except Exception as e:
        log.exception('Error getting hire prefill data')
        response['error'] = str(e)

    return response
