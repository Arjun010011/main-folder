from multiprocessing.spawn import import_main_path
from django.db import models

from apps.students.models import Student
from apps.users.models import User
from apps.institutes.models import AcademicYear



class DepositAndWithDraw(models.Model):
    deposit_types = (
        ('1', 'is_deposit'),
        ('2', 'withdraw'),
        ('3', 'returnback'),
    )
    academic_year = models.ForeignKey(AcademicYear, related_name='deposit_and_with_draw_academic_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='deposit_and_with_draw_student')
    amount = models.FloatField(default=0.0)
    balance = models.FloatField(default=0.0) #just to know what was the balance when the amount withdrawed
    deposited_or_withdraw_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                related_name='deposit_and_with_draw_deposited_or_withdraw_by')
    deposit_type = models.CharField(max_length=6, choices=deposit_types)
    description = models.CharField(max_length=255, null=True, blank=True)
    transaction_id = models.CharField(max_length=255, unique=True)
    fordate = models.DateField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
