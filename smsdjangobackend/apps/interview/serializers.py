from rest_framework import serializers

from apps.interview.models import (
    JobRole, InterviewSetup, InterviewRound, InterviewRound,
    JobApplication, JobApplicationDocument, InterviewEvaluation
)



# ─── Job Role ───────────────────────────────────────────────
class JobRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRole
        fields = '__all__'


# ─── Interview Round ────────────────────────────────────────
class InterviewRoundSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewRound
        fields = '__all__'


class InterviewRoundReadSerializer(serializers.ModelSerializer):
    assigned_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewRound
        fields = '__all__'

    def get_assigned_staff_name(self, obj):
        if obj.assigned_staff:
            first = obj.assigned_staff.first_name or ''
            last = obj.assigned_staff.last_name or ''
            return f"{first} {last}".strip()
        return None


# ─── Interview Setup ────────────────────────────────────────
class InterviewSetupSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewSetup
        fields = '__all__'


class InterviewSetupReadSerializer(serializers.ModelSerializer):
    job_role_name = serializers.CharField(source='job_role.name', read_only=True)
    rounds = InterviewRoundReadSerializer(source='interview_round_interview_setup', many=True, read_only=True)
    incharge_staff_name = serializers.SerializerMethodField()

    class Meta:
        model = InterviewSetup
        fields = '__all__'

    def get_incharge_staff_name(self, obj):
        if obj.incharge_staff:
            first = obj.incharge_staff.first_name or ''
            last = obj.incharge_staff.last_name or ''
            return f"{first} {last}".strip()
        return None


# ─── Job Application Document ───────────────────────────────
class JobApplicationDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplicationDocument
        fields = '__all__'


class JobApplicationDocumentReadSerializer(serializers.ModelSerializer):
    document_url = serializers.SerializerMethodField()

    class Meta:
        model = JobApplicationDocument
        fields = '__all__'

    def get_document_url(self, obj):
        if obj.document and obj.document.file:
            return obj.document.file.url
        return None


# ─── Interview Evaluation ───────────────────────────────────
class InterviewEvaluationSerializer(serializers.ModelSerializer):
    class Meta:
        model = InterviewEvaluation
        fields = '__all__'


class InterviewEvaluationReadSerializer(serializers.ModelSerializer):
    evaluator_name = serializers.SerializerMethodField()
    round_number = serializers.IntegerField(source='interview_round.round_number', read_only=True)
    round_name = serializers.CharField(source='interview_round.round_name', read_only=True)

    class Meta:
        model = InterviewEvaluation
        fields = '__all__'

    def get_evaluator_name(self, obj):
        if obj.evaluator:
            first = obj.evaluator.first_name or ''
            last = obj.evaluator.last_name or ''
            return f"{first} {last}".strip()
        return None


# ─── Job Application ────────────────────────────────────────
class JobApplicationSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobApplication
        fields = '__all__'


class JobApplicationReadSerializer(serializers.ModelSerializer):
    job_role_name = serializers.SerializerMethodField()
    full_name = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()
    resume_url = serializers.SerializerMethodField()
    documents = JobApplicationDocumentReadSerializer(source='job_application_document_job_application', many=True, read_only=True)
    evaluations = InterviewEvaluationReadSerializer(source='interview_evaluation_job_application', many=True, read_only=True)
    interview_setup_name = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    can_evaluate = serializers.SerializerMethodField()
    is_my_round = serializers.SerializerMethodField()
    is_incharge = serializers.SerializerMethodField()

    class Meta:
        model = JobApplication
        fields = '__all__'

    def get_job_role_name(self, obj):
        if obj.job_role:
            return obj.job_role.name
        return None

    def get_full_name(self, obj):
        first = obj.first_name or ''
        last = obj.last_name or ''
        return f"{first} {last}".strip()

    def get_photo_url(self, obj):
        if obj.photo and obj.photo.file:
            return obj.photo.file.url
        return None

    def get_resume_url(self, obj):
        if obj.resume and obj.resume.file:
            return obj.resume.file.url
        return None

    def get_interview_setup_name(self, obj):
        if obj.interview_setup:
            return obj.interview_setup.name
        return None

    def get_status_display(self, obj):
        return obj.get_status_display()

    def get_can_evaluate(self, obj):
        if obj.status in (4, 6):  
            return False
        if obj.status in (3, 5):
            return True
        current_evals = [
            e for e in obj.interview_evaluation_job_application.all()
            if e.interview_round and e.interview_round.round_number == obj.current_round
               and e.decision
        ]
        return len(current_evals) == 0

    def get_is_my_round(self, obj):
        request = self.context.get('request')
        if not request or not obj.interview_setup:
            return False
        user_staff_id = getattr(request.user, 'staff_id', None)
        if not user_staff_id:
            return False
        try:
            current_round = InterviewRound.objects.filter(
                interview_setup=obj.interview_setup,
                round_number=obj.current_round
            ).first()
            if current_round:
                return current_round.assigned_staff_id == user_staff_id
        except Exception:
            pass
        return False

    def get_is_incharge(self, obj):
        request = self.context.get('request')
        if not request or not obj.interview_setup:
            return False
        user_staff_id = getattr(request.user, 'staff_id', None)
        if not user_staff_id:
            return False
        return obj.interview_setup.incharge_staff_id == user_staff_id

