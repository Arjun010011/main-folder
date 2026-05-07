from django.db import models

from apps.hostel.models import RoomAllocation
from apps.institutes.models.building import Building
from apps.shared.models.document import Document
from apps.users.models.user import User

REASON_TYPE = {
    'school_visitor': 'School Visitor',
    'hostel_visitor': 'Hostel Visitor',
    'adjustment': 'Adjustment Reason',
    'upi_payment_list': 'Upi Paymnet Lists',
    'exam_student_remark': 'Exam Student Remark',
    'library_issue_return_reason': 'Library Issue Return Reason',
    'abacus_titles': 'Home Work Titles', #designed for abacus instutions
    'abacus_remarks': 'Abacus Remarks',
    'tc_revert':'TC Revert'
}

class Reason(models.Model):
    name = models.CharField(max_length=255)
    reason_type = models.CharField(default='School', max_length=50)
    is_active = models.BooleanField(default=True)


class Visitor(models.Model):
    name = models.CharField(max_length=255)
    reason = models.ForeignKey(Reason, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitor_reason')
    checkin = models.DateTimeField()
    checkout = models.DateTimeField(null=True)
    mobile = models.CharField(max_length=255, null=True, blank=True)
    roomallocation = models.ForeignKey(RoomAllocation, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='visitor_roomallocation')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='visitor_user')
    building = models.ForeignKey(Building, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='visitor_building') #this is required when building wont have room allocation
    feedback = models.CharField(max_length=255, null=True, blank=True)
    created = models.DateTimeField(auto_now_add=True)
    modified = models.DateTimeField(auto_now=True)

class VisitorDocumentMapping(models.Model):
    visitor = models.ForeignKey(Visitor, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitor_document_mapping_visitor')
    document = models.ForeignKey(Document, on_delete=models.SET_NULL, null=True, blank=True, related_name='visitor_document_mapping_document')
