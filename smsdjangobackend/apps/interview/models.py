from datetime import datetime
import uuid

from django.db import models

from apps.shared.models.document import Document
from apps.staffs.models import Staff


class JobRole(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class InterviewSetup(models.Model):
    name = models.CharField(max_length=255)
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.CASCADE,
        related_name='interview_setup_job_role'
    )
    incharge_staff = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interview_setup_incharge_staff'
    )
    no_of_rounds = models.IntegerField(default=1)
    description = models.TextField(blank=True, null=True)
    requirements = models.TextField(blank=True, null=True)
    instructions = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    public_token = models.UUIDField(default=uuid.uuid4, null=True, blank=True, editable=False)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.job_role.name}"


class InterviewRound(models.Model):
    interview_setup = models.ForeignKey(
        InterviewSetup,
        on_delete=models.CASCADE,
        related_name='interview_round_interview_setup'
    )
    round_number = models.IntegerField()
    round_name = models.CharField(max_length=255)
    assigned_staff = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interview_round_assigned_staff'
    )
    description = models.TextField(blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['round_number']

    def __str__(self):
        return f"Round {self.round_number}: {self.round_name}"


class JobApplication(models.Model):
    GENDER_CHOICES = (
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    )
    STATUS_CHOICES = (
        (1, 'New'),
        (2, 'In Progress'),
        (3, 'On Hold'),
        (4, 'Selected'),
        (5, 'Rejected'),
        (6, 'Hired'),
    )

    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    mobile_num = models.CharField(max_length=20)
    dob = models.DateField(blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    job_role = models.ForeignKey(
        JobRole,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_application_job_role'
    )
    interview_setup = models.ForeignKey(
        InterviewSetup,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_application_interview_setup'
    )
    qualification = models.CharField(max_length=255, blank=True, null=True)
    experience_years = models.IntegerField(blank=True, null=True)
    current_organization = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    application_num = models.CharField(max_length=255, unique=True, blank=True, null=True)
    applied_date = models.DateField(default=datetime.now)
    current_round = models.IntegerField(default=1)
    scheduled_date = models.DateField(blank=True, null=True)
    scheduled_time = models.TimeField(blank=True, null=True)
    photo = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_application_photo'
    )
    resume = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='job_application_resume'
    )
    status = models.IntegerField(choices=STATUS_CHOICES, default=1)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name or ''} - {self.application_num or 'No#'}"


class JobApplicationDocument(models.Model):
    job_application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='job_application_document_job_application'
    )
    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name='job_application_document_document'
    )
    document_label = models.CharField(max_length=255, blank=True, null=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.document_label or 'Document'} - {self.job_application}"


class InterviewEvaluation(models.Model):
    DECISION_CHOICES = (
        ('selected', 'Selected'),
        ('on_hold', 'On Hold'),
        ('rejected', 'Rejected'),
    )

    job_application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='interview_evaluation_job_application'
    )
    interview_round = models.ForeignKey(
        InterviewRound,
        on_delete=models.CASCADE,
        related_name='interview_evaluation_interview_round'
    )
    evaluator = models.ForeignKey(
        Staff,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='interview_evaluation_evaluator'
    )
    notes = models.TextField(blank=True, null=True)
    decision = models.CharField(max_length=20, choices=DECISION_CHOICES, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['interview_round__round_number']

    def __str__(self):
        return f"Eval: {self.job_application} - Round {self.interview_round.round_number}"
