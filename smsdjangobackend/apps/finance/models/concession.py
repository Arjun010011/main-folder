from django.db import models

from apps.finance.models import FeePlan
from apps.finance.models.feeCollection import FeeCollection
from apps.institutes.models import AcademicYear
from apps.institutes.models.visitor import Reason
from apps.students.models import Student
from apps.users.models import User
from apps.shared.models.document import Document


class ConcessionType(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=255, null=True) #if code is there then it is automatic concession - manual concessions, automatic concession -> concession for full payment something like dat
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


class Concession(models.Model):
    types = (('feetype', 'feetype'),
             ('total', 'total'))
    concession_type = models.ForeignKey(ConcessionType, related_name='concession_type', null=True, blank=True,
                                        on_delete=models.SET_NULL)
    concession_on_type = models.CharField(default='total', max_length=7, choices=types)
    is_active = models.BooleanField(default=True)
    academic_year = models.ForeignKey(AcademicYear, related_name='concession_year', null=True, blank=True,
                                      on_delete=models.SET_NULL)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class AdjustmentFeeParent(models.Model):
    total_amount = models.FloatField(default=0.0)
    is_active = models.BooleanField(default=True)
    student = models.ForeignKey(Student, null=True, blank=True, related_name='adjustment_fee_parent_student', on_delete=models.SET_NULL)
    approved_documents = models.ManyToManyField(Document, related_name='adjustment_fee_parent_documents', blank=True, help_text="Approved documents for adjustment")
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class AdjustmentFee(models.Model):
    fee_plan = models.ForeignKey(FeePlan, related_name='adjustment_fee_plan', null=True, blank=True,
                                 on_delete=models.SET_NULL)
    amount = models.FloatField(null=True)
    is_active = models.BooleanField(default=True)
    is_addition = models.BooleanField(default=False)
    reason_id = models.ForeignKey(Reason, null=True, blank=True, related_name='adjustment_fee_reason', on_delete=models.SET_NULL)
    student = models.ForeignKey(Student, null=True, blank=True, related_name='adjustment_fee_student',
                                on_delete=models.SET_NULL)
    user = models.ForeignKey(User, null=True, blank=True, related_name='adjustment_fee_user', on_delete=models.SET_NULL)
    concession = models.ForeignKey(Concession, related_name='concession_adjustment', null=True, blank=True,
                                   on_delete=models.SET_NULL)
    fee_collection = models.ForeignKey(FeeCollection, related_name='adjustment_fee_fee_collection_id', null=True, blank=True,
                                   on_delete=models.SET_NULL) #used to store discount given on the fee collection and we should have track when discount given
    adjustment_fee_parent = models.ForeignKey(AdjustmentFeeParent, related_name='adjustment_fee_adjustment_fee_parent', on_delete=models.SET_NULL, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)


#when full fees paid this concession will be applied, developed for this reason
class FeePlanConcessionMappingMaster(models.Model):
    concession_type = models.ForeignKey(ConcessionType, related_name='fee_plan_concession_mapping_concession_type',
                                null=True, blank=True, on_delete=models.SET_NULL)
    is_active = models.BooleanField(default=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class FeePlanConcessionMapping(models.Model):
    fee_plan = models.ForeignKey(FeePlan, related_name='fee_plan_concession_mapping_fee_plan',
                                null=True, blank=True, on_delete=models.SET_NULL)
    master = models.ForeignKey(FeePlanConcessionMappingMaster,
                            related_name='fee_plan_concession_mapping_master', null=True, blank=True, on_delete=models.SET_NULL)
    concession_amount = models.FloatField()
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)
