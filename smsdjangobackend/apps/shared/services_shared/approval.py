from rest_framework import exceptions
from apps.shared.models import approval
from apps.shared.models.approval import ApprovalTransition, ApproveStatus, GroupApprovalHierarchy, UserApprovalHierarchy
from django.contrib.contenttypes.models import ContentType
from apps.shared.serializers import ApprovalTransitionSerializer

class Approval(object):

    def __init__(self, request_obj, content_type_model, object_ids):
        self.current_user = request_obj.user.id
        self.is_superuser = request_obj.user.is_superuser
        self.current_user_group = list(request_obj.user.groups.all().values())
        try:
            self.content_type_obj = ContentType.objects.get(model=content_type_model)
        except:
            raise exceptions.ValidationError('Invalid content_type_model')
        self.approval_status_objects = ApproveStatus.objects.filter(
            content_type=self.content_type_obj.id, object_id__in=object_ids
        )

    @staticmethod
    def is_allowable_for_fee_collec_or_adj(approval_status):
        if (
            approval_status == 1 or approval_status == '1'
        ) or (
            approval_status == 2 or approval_status == '2'
        ):
            return True
        if (
            approval_status == 0 or approval_status == '0'
        ) or (
            approval_status == 3 or approval_status == '3'
        ):
            return False

    def get_approval_transition(self):
        return ApprovalTransition.objects.filter(
            approval_status_parent__in=self.approval_status_objects.values_list('id', flat=True)
        )

    def get_group_approval_heirarchy(self):
        return {gro.group_id : gro for gro in GroupApprovalHierarchy.objects.filter(is_active=True, content_type=self.content_type_obj.id)}

    def get_user_approval_heirarchy(self):
        return {usr.user_id : usr for usr in UserApprovalHierarchy.objects.filter(is_active=True, content_type=self.content_type_obj.id)}

    def get_last_step(self):
        return_data = {}
        approval_transition = {}
        for transition in self.get_approval_transition():
            if transition.approval_status_parent not in approval_transition:
                approval_transition[transition.approval_status_parent.id] = {
                    'step': 0,
                    'approval_status': transition.approval_status,
                    'user_id': transition.user_id
                }
            if transition.step > approval_transition[transition.approval_status_parent.id]['step']:
                approval_transition[transition.approval_status_parent.id] = transition
        for row_data in self.approval_status_objects:
            return_data[row_data.id] = {'step': 0, 'approval_status': '0', 'user_id': None}
            if row_data.id in approval_transition:
                return_data[row_data.id] = {
                    'step': approval_transition[row_data.id].step,
                    'approval_status': approval_transition[row_data.id].approval_status,
                    'user_id': approval_transition[row_data.id].user_id,
                }
        return return_data

    """
        checks is approval access there for the module
    """
    def check_for_approval_access(self):
        if self.is_superuser:
            return True
        access = False
        if self.current_user in self.get_user_approval_heirarchy():
            access = True
        for user_group in self.current_user_group:
            if user_group['id'] in self.get_group_approval_heirarchy():
                access = True
        return access

    """
        check approval for all the approval objects
    """
    def validate_approval(self, approval_status, kwargs):
        data_to_save = []
        if not self.check_for_approval_access():
            raise exceptions.ValidationError('Dont have access to approve')
        for row_data in self.approval_status_objects:
            step = 1
            last_approval_status = '0'
            last_user_id = 0
            if row_data.id in self.get_last_step():
                step = int(self.get_last_step()[row_data.id]['step']) + 1
                last_approval_status = self.get_last_step()[row_data.id]['approval_status']
                last_user_id = self.get_last_step()[row_data.id]['user_id']
            # if str(approval_status)  == str(last_approval_status) and str(last_user_id) == str(self.current_user):
            #     raise exceptions.ValidationError('Trying To Raise Same Request Mulitple Times')
            temp = {
                'approval_status_parent': row_data.id,
                'user': self.current_user,
                'step': step, #for now supporting only one sequence,
                'approval_status': approval_status,
                'reason': kwargs.get('reason'),
            }
            data_to_save.append(temp)
        return data_to_save
        
    def update_the_parent_status(self, approval_status):
        #for now i am updating the status directly
        self.approval_status_objects.update(approval_status=approval_status)
        return {'Reason': 'Status Updated'}


    def update_status(self, approval_status, kwargs={}):
        data_to_save = []
        data_to_save = self.validate_approval(approval_status, kwargs)
        ser = ApprovalTransitionSerializer(data=data_to_save, many=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        self.update_the_parent_status(approval_status)
        return {'Reason': 'Data Saved Successfully'}

    def get_approval_status_with_permission(self):
        approval_data_to_return = {}
        for approval_row in self.approval_status_objects:
            approval_row.is_has_approval_permission = self.check_for_approval_access()
            approval_data_to_return[approval_row.object_id] = approval_row
        return approval_data_to_return