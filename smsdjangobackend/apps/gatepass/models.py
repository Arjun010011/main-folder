"""
Gate Pass models - supports User (student or staff) leaving campus.
"""
from django.db import models

from apps.users.models.user import User
from apps.classes.models.standard import StandardSectionMapping


class GatePass(models.Model):
    GOING_WITH_CHOICES = (
        ('parent', 'Parent'),
        ('guardian', 'Guardian'),
        ('self', 'Self'),
    )
    STATUS_CHOICES = (
        ('requested', 'REQUESTED'),
        ('approved', 'APPROVED'),
        ('rejected', 'REJECTED'),
        ('exited', 'EXITED'),
        ('returned', 'RETURNED'),
        ('expired', 'EXPIRED'),
    )

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='gatepasses')
    standard_section = models.ForeignKey(
        StandardSectionMapping, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='gatepasses', help_text='Class-Section for students; optional for staff'
    )
    reason = models.CharField(max_length=500)
    going_with = models.CharField(max_length=20, choices=GOING_WITH_CHOICES)
    guardian_name = models.CharField(max_length=255, blank=True)
    guardian_phone = models.CharField(max_length=20, blank=True)
    expected_return_time = models.DateTimeField(null=True, blank=True)
    date = models.DateField()
    approval_authority = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='gatepass_approval_authority'
    )

    gate_pass_number = models.CharField(max_length=50, unique=True, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')

    requested_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name='gatepasses_requested'
    )
    approved_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='gatepasses_approved'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    reject_reason = models.CharField(max_length=255, blank=True)

    exit_time = models.DateTimeField(null=True, blank=True)
    guard_name = models.CharField(max_length=255, blank=True)
    return_time = models.DateTimeField(null=True, blank=True)
    exit_verified_at = models.DateTimeField(null=True, blank=True, help_text='When watchman verified checkout')
    return_verified_at = models.DateTimeField(null=True, blank=True, help_text='When watchman verified return')

    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created']
        verbose_name = 'Gate Pass'
        verbose_name_plural = 'Gate Passes'

    def __str__(self):
        return f'{self.gate_pass_number} - {self.user}'
