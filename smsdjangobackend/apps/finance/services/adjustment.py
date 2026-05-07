import copy
from django.db import transaction
from rest_framework import exceptions
from apps.classes.models.standard import Standard

from apps.finance.models import FeePlan
from apps.finance.models.concession import AdjustmentFee, AdjustmentFeeParent
from apps.finance.models.feeCollection import AdmissionForm
from apps.finance.serializers import AdjustmentFeeParentReadSerializer, AdjustmentFeeParentSerializer, AdjustmentFeeSerializer, AdmissionFormSerializer
from apps.finance.services import calculations, fee_plan
from apps.institutes.models.visitor import Reason
from apps.notification.services.notification_service import send_notification
from apps.shared.models.approval import ApproveStatus
from apps.shared.services import ApprovalService, CounterService, NotificationBodyTemplate, SharedService
from apps.shared.services_shared.approval import Approval
from apps.students.models.student import Student
from apps.students.serializers import StudentSerializer
from apps.students.services.student import get_student_admission_form, get_student_current_standard
from apps.tenants.services.middlewares import get_current_db_name
from apps.users.models.user import User
from apps.shared.services_shared.common import get_full_name
from django.contrib.contenttypes.models import ContentType


def check_is_adjustment_in_pending(self, student_ids, academic_year):
    pass
    # adjustment_student_datas = AdjustmentFee.objects.filter(id__in=student_ids)
    # student_parent_ids = []
    # for adjustment in adjustment_student_datas:
    #     if adjustment['adjustment_fee_parent']:
    #         student_parent_ids.append(adjustment['adjustment_fee_parent'])
    # if student_parent_ids:
    #     approval_obj = Approval(self.request, 'AdjustmentFeeParent', adjustment_fee_parent)
    #     approval_obj.update_status(approval_status, data)

"""
    fee_data is passed here because when fees is collected all the pending will be changed in the fee collection api
    is_request where user request for the approval
"""
def add_fee_plan_adjustment(self, data, fee_data=None, fee_collection_id=None, is_request_for_approval=False):
    response = {'Reason': 'Data Updated Successfully'}
    adjustment = dict()
    user = self.request.user.pk if self.request.user.pk else None
    fee_plan_ids = []
    temp_data_to_add = []
    delete_data_to_ids = data.get('delete_data_to_ids')
    fee_plan_adjustment_mapping = {}
    adjust_data = []
    if delete_data_to_ids:
        adjust_data = AdjustmentFee.objects.filter(id__in=delete_data_to_ids)
        for adj in adjust_data:
            if int(adj.fee_plan.id) not in fee_plan_adjustment_mapping:
                fee_plan_adjustment_mapping[int(adj.fee_plan.id)] = {'deleting_total_adjustment': 0}
            if adj.is_addition:
                fee_plan_adjustment_mapping[int(adj.fee_plan.id)]['deleting_total_adjustment'] += adj.amount
            elif not adj.is_addition:
                fee_plan_adjustment_mapping[int(adj.fee_plan.id)]['deleting_total_adjustment'] -= adj.amount
    for fee_plan in data['adjustment']:
        fee_plan.update({'student': data['student'], 'user': user, 'is_active': True})
        adjustment.update({fee_plan['fee_plan']: fee_plan})
        if 'id' in fee_plan and fee_plan['id']:
            raise exceptions.ValidationError('Update is not allowed')
        temp_data_to_add.append(fee_plan)
        if 'adjustment_is_addition' in fee_plan: #nikhil temp fix for nisarga
            fee_plan['is_addition'] = True
    if not fee_data:
        fee_data = calculations.fee_calculation(self, data['student'], data['academic_year'], data['standard'], True, True)
    adjustment_approval_list = []
    for fee in fee_data['data']:
        for terms in fee['standard_fee']:
            fee_plan_ids.append(terms['id'])
            adding_adjustment_amount = 0
            if terms['id'] in adjustment:
                adj = adjustment[terms['id']]
                if not adj['is_addition']:
                    pass
                    # if float(adj['amount']) > float(terms['pending_amount']):
                    #     raise exceptions.ValidationError(
                    #         f'{fee["fee_type_name"]} {terms["terms"]} adjustment amount should be lesser then pending amount {terms["pending_amount"]}.')
                else:
                    adding_adjustment_amount += adj['amount']
            if terms['id'] in fee_plan_adjustment_mapping:
                if (float(terms['amount']) - float(fee_plan_adjustment_mapping[terms['id']]['deleting_total_adjustment']) \
                    - terms['paid_amount'] + float(adding_adjustment_amount)) < 0:
                    raise exceptions.ValidationError(
                        f'paid amount is {terms["paid_amount"]}, trying to remove the adjustment where total amount will go to negative. ie \
                            {float(terms["amount"]) - float(fee_plan_adjustment_mapping[terms["id"]]["deleting_total_adjustment"]) - terms["paid_amount"]}'
                    )
    adjustment_parent_objs = AdjustmentFeeParent.objects.filter(
        adjustment_fee_adjustment_fee_parent__fee_plan__in=fee_plan_ids,
        adjustment_fee_adjustment_fee_parent__student=data['student']
    ).order_by('id').distinct()
    for adjustment_p in adjustment_parent_objs:
        ApprovalService.get_approval_status(self, adjustment_p, 'Other Adjustment are still in pending status', ['0', '3'])
    with transaction.atomic(using=get_current_db_name()):
        adj_parent_ids_to_udpate = set()
        if delete_data_to_ids:
            adjustment_approval_list += delete_data_to_ids
            for adj in adjust_data:
                if adj.fee_collection and adj.fee_collection.is_active:
                    raise exceptions.ValidationError('We can delete the fee collection adjustment datas')
                if adj.adjustment_fee_parent:
                    adj_parent_ids_to_udpate.add(adj.adjustment_fee_parent.id)
            # Save individually to trigger signals (instead of bulk update)
            for adj in adjust_data:
                adj.is_active = False
                adj.save()  # This will trigger post_save signal
        if temp_data_to_add:
            adj_parent_data = {
                'student': data['student']
            }
            
            adj_serializer = AdjustmentFeeParentSerializer(data=adj_parent_data)
            adj_serializer.is_valid(raise_exception=True)
            adj_par_obj = adj_serializer.save()
            adjustment_parent_id = adj_par_obj.id
            adj_parent_ids_to_udpate.add(adjustment_parent_id)
            
            # Add approved documents if provided (ManyToMany requires object to be saved first)
            if 'approved_document_ids' in data and data['approved_document_ids']:
                document_ids = data['approved_document_ids']
                if isinstance(document_ids, list) and len(document_ids) > 0:
                    from apps.shared.models.document import Document
                    # Filter out any None or invalid IDs and convert to integers
                    valid_document_ids = []
                    for doc_id in document_ids:
                        if doc_id is not None:
                            try:
                                valid_document_ids.append(int(doc_id))
                            except (ValueError, TypeError):
                                continue
                    
                    if valid_document_ids:
                        # Don't filter by is_active since documents might be newly uploaded with is_active=False
                        documents = Document.objects.filter(id__in=valid_document_ids)
                        document_count = documents.count()
                        if document_count > 0:
                            # Clear existing documents and set new ones
                            adj_par_obj.approved_documents.clear()
                            adj_par_obj.approved_documents.add(*documents)
                            # Force save to ensure the relationship is persisted
                            adj_par_obj.save()
            for temp_data in temp_data_to_add:
                if fee_collection_id:
                    temp_data['fee_collection'] = fee_collection_id
                temp_data['adjustment_fee_parent'] = adjustment_parent_id
                serializer = AdjustmentFeeSerializer(data=temp_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()  # This will trigger post_save signal automatically
            if is_request_for_approval and adj_par_obj:
                ApprovalService.update_approval_status(
                    self, adj_par_obj, '0', message='Already Approved', reason=data['reason'] if 'reason' in data else None
                )
        if adj_parent_ids_to_udpate:
            update_adjustment_total(self, adj_parent_ids_to_udpate)
            # Dashboard cache is now updated automatically via signals (apps.finance.signals)
    
            try:
                return {'Reason': 'Data added Successfully!', 'data': serializer.data}
            except:
                return {'Reason': 'Data added Successfully!', 'data': {}}

def update_adjustment_total(self, adjustment_unapproved_parent_ids):
    adj_parent_and_amount_map = {}
    adjustment_parent_data = AdjustmentFee.objects.filter(adjustment_fee_parent__in=list(adjustment_unapproved_parent_ids), is_active=True).values(
        'amount', 'is_addition', 'adjustment_fee_parent'
    )
    for adj in adjustment_parent_data:
        if adj['adjustment_fee_parent'] not in adj_parent_and_amount_map:
            adj_parent_and_amount_map[adj['adjustment_fee_parent']] = {'total_amount': 0}
        if adj['is_addition']:
            adj_parent_and_amount_map[adj['adjustment_fee_parent']]['total_amount'] += adj['amount']
        else:
            adj_parent_and_amount_map[adj['adjustment_fee_parent']]['total_amount'] -= adj['amount']
    for adj_parent, adj_parent_data in adj_parent_and_amount_map.items():
        if int(adj_parent_data['total_amount']) == 0:
            AdjustmentFeeParent.objects.filter(id=adj_parent).update(total_amount=adj_parent_data['total_amount'], is_active=False)
        else:
            AdjustmentFeeParent.objects.filter(id=adj_parent).update(total_amount=adj_parent_data['total_amount'])
    return {'Reason': 'Data Updated Successfully'}

"""
used for adjustment for fee group
"""
def apply_adjustment_in_fee_collection(adjustment_data, fee_plan, fee_plan_list):
    adjustment_data_to_save= []
    total_applying_adjstment = 0
    for adjustment_row in adjustment_data:
        applying_amount = adjustment_row['amount']
        total_applying_adjstment += applying_amount
        for fee_row in fee_plan:
            if not applying_amount:
                continue;
            if 'fee_group' in adjustment_data:
                if str(fee_row['fee_group']) == str(adjustment_row['fee_group']) and fee_row['pending_amount']:
                    total_appied_adjustment = 0
                    if fee_row['pending_amount'] > applying_amount:
                        applied_adjustment = applying_amount
                        fee_row['pending_amount'] -= applied_adjustment
                        applying_amount -= applied_adjustment
                        total_appied_adjustment += applied_adjustment
                    else:
                        applied_adjustment = fee_row['pending_amount']
                        applying_amount -= applied_adjustment
                        fee_row['pending_amount'] -= applied_adjustment
                        total_appied_adjustment += applied_adjustment
                    for standard_fee in fee_row['standard_fee']:
                        if total_appied_adjustment and standard_fee['id'] in fee_plan_list:
                            if standard_fee['pending_amount'] > total_appied_adjustment:
                                applying_adjustment = total_appied_adjustment
                                standard_fee['pending_amount'] -= applying_adjustment
                            else:
                                applying_adjustment = standard_fee['pending_amount']
                                standard_fee['pending_amount'] -= applying_adjustment
                            total_appied_adjustment -= applying_adjustment
                            standard_fee['adjustment_amount'] += applying_adjustment
                            temp_adjustment = {
                                'is_addition': 0, 'fee_plan': standard_fee['id'],
                                'amount': applying_adjustment, 'reason_id': adjustment_row['reason_id']
                            }
                            adjustment_data_to_save.append(temp_adjustment)
                            fee_plan_list[standard_fee['id']]['amount_paid'] -= applying_adjustment
                            if not fee_plan_list[standard_fee['id']]['amount_paid']:
                                del fee_plan_list[standard_fee['id']]
                    if fee_row['pending_amount'] < 0:
                        raise exceptions.ValidationError('Issue with adjustment')
            else:
                if fee_row['pending_amount']:
                    total_appied_adjustment = 0
                    for standard_fee in fee_row['standard_fee']:
                        if standard_fee['id'] in fee_plan_list:
                            if fee_row['pending_amount'] > applying_amount:
                                applied_adjustment = applying_amount
                                fee_row['pending_amount'] -= applied_adjustment
                                applying_amount -= applied_adjustment
                                total_appied_adjustment += applied_adjustment
                            else:
                                applied_adjustment = fee_row['pending_amount']
                                applying_amount -= applied_adjustment
                                fee_row['pending_amount'] -= applied_adjustment
                                total_appied_adjustment += applied_adjustment
                            if total_appied_adjustment and standard_fee['id'] in fee_plan_list:
                                if standard_fee['pending_amount'] > total_appied_adjustment:
                                    applying_adjustment = total_appied_adjustment
                                    standard_fee['pending_amount'] -= applying_adjustment
                                else:
                                    applying_adjustment = standard_fee['pending_amount']
                                    standard_fee['pending_amount'] -= applying_adjustment
                                total_appied_adjustment -= applying_adjustment
                                standard_fee['adjustment_amount'] += applying_adjustment
                                temp_adjustment = {
                                    'is_addition': 0, 'fee_plan': standard_fee['id'],
                                    'amount': applying_adjustment, 'reason_id': adjustment_row['reason_id']
                                }
                                adjustment_data_to_save.append(temp_adjustment)
                                fee_plan_list[standard_fee['id']]['amount_paid'] -= applying_adjustment
                                if not fee_plan_list[standard_fee['id']]['amount_paid']:
                                    del fee_plan_list[standard_fee['id']]
                    if fee_row['pending_amount'] < 0:
                        raise exceptions.ValidationError('Issue with adjustment')

        if applying_amount:
            raise exceptions.ValidationError('Invalid discount')
    return total_applying_adjstment, fee_plan, adjustment_data_to_save, fee_plan_list
    # for fee_group in adjustment_fee_group:
    #     if fee_group not in existing_fee_group_wise_pending_amount:
    #         raise exceptions.ValidationError('Invalid fee group')
    #     if existing_fee_group_wise_pending_amount[fee_group] < adjustment_fee_group[fee_group]:
    #         raise exceptions.ValidationError('Fee plan pending amount is less than the adjustment in the group')
    

# def check_is_other_adjustment_in_pending(self, adjustment_ids):
#     adj_data = AdjustmentFee.objects.filter(id__in=adjustment_ids).values('id', 'student', 'fee_plan')
#     student_ids = []
#     fee_plan_ids = []
#     for adj in adj_data:
#         student_ids.append(adj['student'])
#         fee_plan_ids.append(adj['fee_plan'])
#     adj_obj_exist = AdjustmentApprovalMapping.objects.filter(
#         adjustment__student__in=student_ids, adjustment__fee_plan__in=fee_plan_ids,
#     ).exclude(approval__approval_status=1) #if rejected we should first cancel that
#     if adj_obj_exist.exists():
#         raise exceptions.ValidationError('Adjustment already in process. Please approve or reject the adjustment first')

# def add_or_update_adj_request_approval(self, data_list):
#     adjustment_fee_approval = []
#     for idx, data in enumerate(data_list):
#         data['requested_by_user'] = self.request.user.id
#         requested_to_user_list = data['requested_to_user_list']
#         mandatory_fields = ['approval_status']
#         SharedService.check_mandatory_field_in_list(mandatory_fields, data)
#         mandatory_fields_requested = ['requested_to_user', 'sequence', 'approval_status']
#         for request_to in requested_to_user_list:
#             SharedService.check_mandatory_field_in_list(mandatory_fields_requested, request_to)
#         adjustment_ids = data['adjustment_list']
#         adj_data = {adj['id']: adj for adj in AdjustmentFee.objects.filter(id__in=adjustment_ids).values(
#             'student__first_name', 'student__middle_name', 'student__last_name', 'student', 'id'
#         )}
#         check_is_other_adjustment_in_pending(self, adjustment_ids)
#         temp_data_to_save = {
#             "approval_data":{
#                 "approval_status": data['approval_status'],
#                 "requested_by_user": self.request.user.id,
#             },
#             "requested_to_users": [],
#             "adjustment_list": data['adjustment_list']
#         }
#         for requested_user in requested_to_user_list:
#             temp_data_to_save['requested_to_users'].append(
#                 {
#                     'approval_status': 0,
#                     'approval_history': {},
#                     'requested_to_user': requested_user['requested_to_user'],
#                     'sequence': requested_user['sequence'],
#                 }
#             )
#         adjustment_fee_approval.append(temp_data_to_save)
#     with transaction.atomic(using=get_current_db_name()):
#         notification_list = []
#         for adjustment_fee in adjustment_fee_approval:
#             temp_notifcation = {}
#             adj_fee_approval = AdjustmentFeeApprovalSerializer(data=adjustment_fee['approval_data'])
#             adj_fee_approval.is_valid(raise_exception=True)
#             adj_obj = adj_fee_approval.save()
#             for temp_req in adjustment_fee['requested_to_users']:
#                 temp_notifcation['requested_by_user'] = get_full_name(
#                     self.request.staff.first_name, self.request.staff.middle_name, self.request.staff.last_name
#                 ) if self.request.user.staff else ''
#                 temp_notifcation['requested_to_user'] = temp_req['requested_to_user']
#                 temp_notifcation['adjustment_fee_approval_id'] = adj_obj.id
#                 temp_notifcation['approval_type'] = "Approve"
#                 adj_temp_data = adj_data[adjustment_fee['adjustment_list'][0]]
#                 temp_notifcation['student_name'] = get_full_name(
#                     adj_temp_data['student__first_name'],
#                     adj_temp_data['student__middle_name'],
#                     adj_temp_data['student__last_name'],
#                 )
#                 temp_req['adjustment_fee_approval'] = adj_obj.id
#             adj_reqested_to_user_ser = AdjustmentRequestedToUserSerializer(data=adjustment_fee['requested_to_users'], many=True)
#             adj_reqested_to_user_ser.is_valid(raise_exception=True)
#             adj_reqested_to_user_ser.save()
#             adj_mapping = []
#             for adjustment_id in adjustment_fee['adjustment_list']:
#                 adj_mapping.append({
#                     'approval': adj_obj.id,
#                     'adjustment': adjustment_id
#                 })
#             adj_appr_map = AdjustmentApprovalMappingSerializer(data=adj_mapping, many=True)
#             adj_appr_map.is_valid(raise_exception=True)
#             adj_appr_map.save()
#             notification_list.append(temp_notifcation)
#         notification_for_adjustment_request(self, notification_list)
#     return {'Reason': 'Data Saved Succesfully'}

def notification_for_adjustment_request(self, data_list):
    user_mapping = {u['requested_to_user']: u for u in data_list}
    customized_data = list()
    notification_obj = NotificationBodyTemplate('adjustment_approval')
    users = User.objects.filter(id__in=user_mapping.keys())
    customized_data = []
    for user in users:
        data = user_mapping[user.id]
        requested_to_name = get_full_name(user.staff.first_name, user.staff.middle_name, user.staff.last_name) if user.staff else ''
        temp = {
            'requested_to': requested_to_name,
            'requested_by_user': data['requested_by_user'],
            'approval_type': data['approval_type'],
            'student_name': data['student_name']
        }
        body_email = notification_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp)
        if user.staff and user.staff.email:
            customized_data.append({'email': user.staff.email, 'user_id': user.pk, 'email_subject': None,
                                   'email_body': body_email})
        customized_data.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user.pk, 'extra_params': {}})
    if customized_data:
        return send_notification('enrollment_create', body=None, customizedData=customized_data)

def approve_or_reject_adjustment(self, data):
    adjustment_unapproved_parent_ids = data['adjsutment_parent_ids']
    approval_status = data['approval_status']
    adjustment_fee_parent = AdjustmentFeeParent.objects.filter(id__in=adjustment_unapproved_parent_ids)
    approval_obj = Approval(self.request, 'AdjustmentFeeParent', adjustment_fee_parent)
    approval_obj.update_status(approval_status, data)
    return {'Reason': 'Approved/Unapproved Successfully'}

def notification_for_adjustment_request_approval(self, data_list):
    user_mapping = {u['requested_to_user']: u for u in data_list}
    customized_data = list()
    notification_obj = NotificationBodyTemplate('adjustment_approval')
    users = User.objects.filter(id__in=user_mapping.keys())
    customized_data = []
    for user in users:
        data = user_mapping[user.id]
        requested_to_name = get_full_name(user.staff.first_name, user.staff.middle_name, user.staff.last_name) if user.staff else ''
        temp = {
            'requested_to': requested_to_name,
            'requested_by_user': data['requested_by_user'],
            'approval_type': data['approval_type'],
            'student_name': data['student_name']
        }
        body_email = notification_obj.select_template('email', temp)
        body_push = notification_obj.select_template('push', temp)
        if user.staff and user.staff.email:
            customized_data.append({'email': user.staff.email, 'user_id': user.pk, 'email_subject': None,
                                   'email_body': body_email})
        customized_data.append(
            {'push_subject': None, 'push_body': body_push, 'push_notification': 1, 'user_id': user.pk, 'extra_params': {}})
    if customized_data:
        return send_notification('enrollment_create', body=None, customizedData=customized_data)

def get_adjustment_parent_data(self, is_list=True):
    content_type = ContentType.objects.get(model='AdjustmentFeeParent')
    filter_query = {}
    approval_filter = {
        'content_type':content_type
    }
    is_paginated = int(self.request.GET.get('pagination', 1))
    if is_list:
        filter_query['is_active'] = True
        if self.request.GET.get('ids'):
            filter_query['id__in'] = self.request.GET.get('ids').split(',')
            approval_filter['object_id__in'] = self.request.GET.get('ids').split(',')
    else:
        filter_query['id'] = self.kwargs['pk']
    exclude_filter = {}
    if self.request.GET.get('exclude_approval_status'):
        exclude_filter['approval_status'] = self.request.GET.get('exclude_approval_status')
    if self.request.GET.get('approval_statuses'):
        approval_filter['approval_status__in']=[int(a) for a in self.request.GET.get('approval_statuses').split(',')]
    ids = [app.object_id for app in ApproveStatus.objects.filter(**approval_filter).exclude(**exclude_filter)]
    filter_query['id__in'] = ids
    queryset = AdjustmentFeeParent.objects.filter(**filter_query)
    serializer = AdjustmentFeeParentReadSerializer(queryset, many=True)
    if is_paginated:
        data, count, next_page, previous_page = SharedService.custom_pagination(self, serializer.data,
                                                                                    self.request.GET.get('limit'),
                                                                                    self.request.GET.get('pageno'))
    else:
        data = serializer.data
    adjsutment_parent_ids = []
    student_aca_standard = {}
    student_ids = set()
    standard_ids = set()
    for row_data in data:
        student_ids.add(row_data['student'])
        adjsutment_parent_ids.append(row_data['id'])
        academic_year = row_data['adjustment_fee_adjustment_fee_parent'][0]['academic_year']
        standard = row_data['adjustment_fee_adjustment_fee_parent'][0]['standard']
        key = str(row_data['student']) + '_' + \
                str(academic_year) + '_' + \
                str(standard)
        row_data['key'] = key
        if key not in student_aca_standard: #only load unique student details
            student_aca_standard[key] = {
                'academic_year': academic_year,
                'standard': standard,
                'student': row_data['student'],
                'paid_status': calculations.fee_calculation(self, row_data['student'], academic_year, standard)
            }
            standard_ids.add(standard)
    standard_data_mapping = {sta['id'] : sta for sta in Standard.objects.filter(id__in=list(standard_ids)).values('id', 'name')}
    student_admission_num_mapping = get_student_admission_form(self, student_ids)
    student_quer = Student.objects.filter(id__in=student_ids)
    student_ser = {stu['id'] : stu for stu in StudentSerializer(student_quer, many=True).data}
    approval_obj = Approval(self.request, 'AdjustmentFeeParent', adjsutment_parent_ids)
    approval_statuses = approval_obj.get_approval_status_with_permission()
    for row_data in data:
        row_data['admission_num'] = student_admission_num_mapping[row_data['student']] if row_data['student'] in student_admission_num_mapping else ''
        row_data['student_data'] = student_ser[row_data['student']]
        paid_status = student_aca_standard[row_data['key']]['paid_status']
        if 'data' in paid_status:
            del paid_status['data']
        row_data['standard_name'] =  standard_data_mapping[student_aca_standard[row_data['key']]['standard']]['name']
        row_data['payment_status']  = paid_status
        row_data['adjustment_applied_amount'] = row_data['total_amount']
        row_data['previous_applied_adjustment_amount'] = (-paid_status['total_adjusted_amount']) - row_data['total_amount']
        row_data['is_has_approval_permission'] = False
        row_data['approval_status'] = None
        row_data['approval_status_text'] = None
        if row_data['id'] in approval_statuses:
            row_data['is_has_approval_permission'] = approval_statuses[row_data['id']].is_has_approval_permission
            row_data['approval_status'] = approval_statuses[row_data['id']].approval_status
            temp = {app[0]: app[1] for app in ApproveStatus.ApprovalStatus}
            row_data['approval_status_text'] = temp[row_data['approval_status']]
    if not is_list:
        return {'data': data[0]}
    if not is_paginated:
        return {'data': data}
    return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}


def get_my_adjustments_list(self):
    """
    Get list of adjustments created by the current user
    Returns adjustments based on AdjustmentFeeParent
    """
    from apps.finance.models.concession import AdjustmentFee, AdjustmentFeeParent
    from apps.finance.serializers import AdjustmentFeeParentReadSerializer
    from apps.students.models.student import Student
    from apps.students.serializers import StudentSerializer
    from apps.students.services.student import get_student_admission_form
    from apps.shared.services import SharedService
    
    current_user_id = self.request.user.id
    is_paginated = int(self.request.GET.get('pagination', 1))
    
    # Get adjustment parent IDs where the user created the adjustments
    user_adjustment_parent_ids = AdjustmentFee.objects.filter(
        user_id=current_user_id,
        is_active=True,
        adjustment_fee_parent__is_active=True
    ).values_list('adjustment_fee_parent_id', flat=True).distinct()
    
    if not user_adjustment_parent_ids:
        if is_paginated:
            return {'data': {'count': 0, 'next': None, 'previous': None, 'data_list': []}}
        return {'data': []}
    
    # Get adjustment parents queryset
    queryset = AdjustmentFeeParent.objects.filter(
        id__in=user_adjustment_parent_ids,
        is_active=True
    ).order_by('-id')  # Order by most recent first
    
    # Paginate queryset first (before serialization) for better performance
    if is_paginated:
        paginated_queryset, count, next_page, previous_page = SharedService.custom_pagination(
            self, queryset,
            self.request.GET.get('limit'),
            self.request.GET.get('pageno')
        )
        # Serialize only the paginated queryset
        serializer = AdjustmentFeeParentReadSerializer(paginated_queryset, many=True)
        data = serializer.data
    else:
        # Serialize all records if not paginated
        serializer = AdjustmentFeeParentReadSerializer(queryset, many=True)
        data = serializer.data
        count = len(data)
        next_page = None
        previous_page = None
    
    # Get student IDs from paginated data and fetch student data
    student_ids = [row_data['student'] for row_data in data if row_data.get('student')]
    if student_ids:
        student_admission_num_mapping = get_student_admission_form(self, student_ids)
        student_quer = Student.objects.filter(id__in=student_ids)
        student_ser = {stu['id']: stu for stu in StudentSerializer(student_quer, many=True).data}
    else:
        student_admission_num_mapping = {}
        student_ser = {}
    
    # Enrich data with admission numbers and student data
    for row_data in data:
        student_id = row_data.get('student')
        if student_id:
            row_data['admission_num'] = student_admission_num_mapping.get(student_id, '')
            row_data['student_data'] = student_ser.get(student_id, {})
        else:
            row_data['admission_num'] = ''
            row_data['student_data'] = {}
        
        # Get reason from adjustment fees (combine all reasons)
        if row_data.get('adjustment_fee_adjustment_fee_parent'):
            reasons = [
                adj.get('reason_name', '') 
                for adj in row_data['adjustment_fee_adjustment_fee_parent']
                if adj.get('reason_name')
            ]
            row_data['reason'] = ', '.join(set(reasons)) if reasons else ''
        else:
            row_data['reason'] = ''
    
    if is_paginated:
        return {'data': {'count': count, 'next': next_page, 'previous': previous_page, 'data_list': data}}
    return {'data': data}


    # adjustment_fee_approval_ids = data['adjustment_fee_approval_ids']
    # approval_status = data['approval_status']
    # rejected_reason = data['rejected_reason'] if 'rejected_reason' in data else ''
    # current_user = self.request.user.id
    # adj_data = AdjustmentRequestedToUsers.objects.filter(
    #     adjustment_fee_approval__in=adjustment_fee_approval_ids,
    #     requested_to_user=current_user
    # )
    # existing_adj_datas = {}
    # for adj in adj_data:
    #     existing_adj_datas[adj.adjustment_fee_approval] = adj
    # if len(set(existing_adj_datas.keys())) != len(set(adjustment_fee_approval_ids)):
    #     raise exceptions.ValidationError('Few adjustment are not mapping to the user')
    # with transaction.atomic(using=get_current_db_name()):
    #     for adj in adj_data:
    #         if str(adj.approval_status) == str(approval_status):
    #             raise exceptions.ValidationError('Approval Stauts are same')
    #         if not adj.approval_history:
    #             adj.approval_history = []
    #         adj.approval_history.append(
    #             {
    #                 'requested_to_user': adj.requested_to_user.id,
    #                 'approval_status': adj.approval_status,
    #                 'sequence': adj.sequence,
    #                 'adjustment_fee_approval': adj.adjustment_fee_approval.id,
    #                 'rejected_reason': adj.rejected_reason,
    #             }
    #         )
    #         adj.approval_status = approval_status
    #         if adj.approval_status == 2:
    #             adj.rejected_reason = rejected_reason
    #         adj.save()
    # return {'Reason': 'Data Updated Successfully'}

# def get_adjustment_report(self, extra_params={}):
#     filter_query = {}
#     user_id = extra_params['user'] if 'user' in extra_params else self.request.GET.get('user')
#     # from_date = extra_params['from_date'] if 'from_date' 
#     if user_id:
#         filter_query['user'] = user_id
    
#     adjustment_data = AdjustmentFee.objects.filter(**filter_query)