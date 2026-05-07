from django.db.models import Sum, F
from django.db import transaction
from apps.finance.models.fee_mismatch import FeeMismatchReconciliationLog, FeeMismatchPaymentChangeLog
from apps.finance.models.feeCollection import PaymentDetail
from apps.classes.models.enrollment import StudentStandardMapping
from apps.students.models import Student
from apps.finance.models.fee import FeePlan, FeeStandardMapping
from apps.tenants.services.middlewares import get_current_db_name

def get_fee_mismatch_students(self):
    request = self.request
    academic_year_id = request.GET.get('academic_year')
    standard_ids = request.GET.get('standard')
    pageno = int(request.GET.get('pageno', 1))
    limit = int(request.GET.get('limit', 10))
    
    if not academic_year_id:
        return {'data_list': [], 'count': 0}
        
    academic_year_id = int(academic_year_id)
    if standard_ids:
        standard_ids = [int(s) for s in standard_ids.split(',')]
    
    mismatch_list = []
    
    student_standard_filter = {'academic_year_id': academic_year_id}
    if standard_ids:
        student_standard_filter['standard_id__in'] = standard_ids
    
    student_standard_mappings = StudentStandardMapping.objects.filter(
        **student_standard_filter,
        student__is_active=True
    ).select_related('student', 'student_group').values(
        'student_id', 'standard_id', 'student_group_id', 'is_new_student',
        'student__first_name', 'student__middle_name', 'student__last_name',
        'student__current_reg_num', 'student_group__name'
    )
    
    # Defensive mapping: keep first occurrence if multiple rows exist (data issue)
    student_mapping_dict = {}
    for s in student_standard_mappings:
        student_mapping_dict.setdefault(s['student_id'], s)
    student_ids = list(student_mapping_dict.keys())
    
    if not student_ids:
        return {'data_list': [], 'count': 0}
    
    # NOTE: Terms intentionally ignored here.
    # This function detects mismatches, not reconciliation candidates.
    payment_data = PaymentDetail.objects.filter(
        fee_collection__student_id__in=student_ids,
        fee_collection__is_active=True,
        fee_plan__standard_fee__academic_year_id=academic_year_id
    ).values(
        'fee_collection__student_id',
        'fee_plan__standard_fee__student_group_id',
        'fee_plan__standard_fee__is_new_student',
        'fee_plan__standard_fee__student_group__name'
    ).annotate(
        total_paid=Sum('amount_paid')
    )
    
    student_payment_group_map = {}
    for p in payment_data:
        student_id = p['fee_collection__student_id']
        if student_id not in student_payment_group_map:
            student_payment_group_map[student_id] = []
        student_payment_group_map[student_id].append(p)
    
    for student_id, current_mapping in student_mapping_dict.items():
        if student_id not in student_payment_group_map:
            continue
        
        payments = student_payment_group_map[student_id]
        current_group = current_mapping['student_group_id']
        current_is_new = current_mapping['is_new_student']
        
        for payment in payments:
            payment_group = payment['fee_plan__standard_fee__student_group_id']
            payment_is_new = payment['fee_plan__standard_fee__is_new_student']
            
            has_group_mismatch = payment_group is not None and current_group != payment_group
            has_new_student_mismatch = payment_is_new is not None and current_is_new != payment_is_new
            
            if has_group_mismatch or has_new_student_mismatch:
                mismatch_list.append({
                    'student_id': student_id,
                    'student_name': ' '.join(filter(None, [
                        current_mapping['student__first_name'],
                        current_mapping['student__middle_name'],
                        current_mapping['student__last_name']
                    ])),
                    'student_reg_num': current_mapping['student__current_reg_num'],
                    'current_student_group': current_mapping['student_group__name'],
                    'current_student_group_id': current_group,
                    'current_is_new_student': current_is_new,
                    'payment_student_group': payment['fee_plan__standard_fee__student_group__name'],
                    'payment_student_group_id': payment_group,
                    'payment_is_new_student': payment_is_new,
                    'total_paid': payment['total_paid'] or 0,
                    'mismatch_type': {
                        'student_group': has_group_mismatch,
                        'is_new_student': has_new_student_mismatch
                    }
                })
                break 
    
    total_count = len(mismatch_list)
    start_index = (pageno - 1) * limit
    end_index = start_index + limit
    paginated_list = mismatch_list[start_index:end_index]
    
    return {'data_list': paginated_list, 'count': total_count}


def create_fee_mismatch_reconciliation(request, data):
    
    student_id = int(data['student_id'])
    academic_year_id = int(data['academic_year'])
    original_student_group_id = int(data['original_student_group']) if data.get('original_student_group') else None
    new_student_group_id = int(data['new_student_group'])
    
    student = Student.objects.get(id=student_id)
    
    with transaction.atomic(using=get_current_db_name()):
        # Idempotency guard: prevent duplicate reconciliation
        if FeeMismatchReconciliationLog.objects.filter(
            student_id=student_id,
            academic_year_id=academic_year_id,
            is_reconciled=True
        ).exists():
            raise ValueError("Student already reconciled for this academic year")
        
        # Row locking to prevent race conditions on financial data
        payment_details_to_check = PaymentDetail.objects.select_for_update().filter(
            fee_collection__student_id=student_id,
            fee_collection__is_active=True,
            fee_plan__standard_fee__academic_year_id=academic_year_id
        ).select_related('fee_plan', 'fee_plan__standard_fee', 'fee_plan__standard_fee__fee_type')
        
        log = FeeMismatchReconciliationLog.objects.create(
            student=student,
            academic_year_id=academic_year_id,
            original_student_group_id=original_student_group_id,
            new_student_group_id=new_student_group_id,
            original_is_new_student=data.get('original_is_new_student'),
            new_is_new_student=data.get('new_is_new_student'),
            original_total_fee=data.get('original_total_fee', 0),
            new_total_fee=data.get('new_total_fee', 0),
            total_paid=data.get('total_paid', 0),
            adjustment_amount=data.get('adjustment_amount', 0),
            reason=data.get('reason', ''),
            is_reconciled=False,
            reconciled_by=request.user
        )
        
        updated_count = 0
        skipped_count = 0
        payment_changes = []
        debug_info = []
        
        for payment_detail in payment_details_to_check:
            old_fee_plan = payment_detail.fee_plan
            if not old_fee_plan or not old_fee_plan.standard_fee:
                skipped_count += 1
                debug_info.append(f"PD {payment_detail.id}: no fee_plan/standard_fee")
                continue
            
            old_standard_fee = old_fee_plan.standard_fee
            
            if old_standard_fee.student_group_id == new_student_group_id:
                skipped_count += 1
                debug_info.append(f"PD {payment_detail.id}: already correct group")
                continue
            
            new_standard_fee = FeeStandardMapping.objects.filter(
                standard_id=old_standard_fee.standard_id,
                academic_year_id=old_standard_fee.academic_year_id,
                student_group_id=new_student_group_id
            ).select_related('fee_type').first()
            
            if not new_standard_fee:
                skipped_count += 1
                debug_info.append(f"PD {payment_detail.id}: no FeeStandardMapping for std={old_standard_fee.standard_id}, ay={old_standard_fee.academic_year_id}, group={new_student_group_id}")
                continue
            
            old_terms = old_fee_plan.terms or ''
            
            new_fee_plan = FeePlan.objects.filter(
                standard_fee=new_standard_fee,
                terms=old_terms
            ).first()
            
            if not new_fee_plan and old_terms:
                new_fee_plan = FeePlan.objects.filter(
                    standard_fee=new_standard_fee,
                    terms__iexact=old_terms
                ).first()
            
            if not new_fee_plan:
                new_fee_plan = FeePlan.objects.filter(
                    standard_fee=new_standard_fee
                ).first()
            
            if not new_fee_plan:
                skipped_count += 1
                debug_info.append(f"PD {payment_detail.id}: no FeePlan for standard_fee {new_standard_fee.id}")
                continue
            
            if new_fee_plan.id == old_fee_plan.id:
                skipped_count += 1
                debug_info.append(f"PD {payment_detail.id}: same fee_plan")
                continue
            
            old_fee_type_name = old_standard_fee.fee_type.name if old_standard_fee.fee_type else ''
            new_fee_type_name = new_standard_fee.fee_type.name if new_standard_fee.fee_type else ''
            
            payment_changes.append({
                'payment_detail_id': payment_detail.id,
                'old_fee_plan_id': old_fee_plan.id,
                'new_fee_plan_id': new_fee_plan.id,
                'old_fee_plan_name': f"{old_fee_type_name} - {old_fee_plan.terms or ''}",
                'new_fee_plan_name': f"{new_fee_type_name} - {new_fee_plan.terms or ''}",
                'old_standard_fee_id': old_standard_fee.id,
                'new_standard_fee_id': new_standard_fee.id,
                'amount_paid': payment_detail.amount_paid or 0
            })
            
            payment_detail.fee_plan = new_fee_plan
            payment_detail.save()
            updated_count += 1
        
        for change in payment_changes:
            FeeMismatchPaymentChangeLog.objects.create(
                reconciliation_log=log,
                **change
            )
        
        # Only mark as reconciled if data was actually mutated
        log.is_reconciled = updated_count > 0
        debug_summary = f" | Checked: {payment_details_to_check.count()}, Updated: {updated_count}, Skipped: {skipped_count}"
        if updated_count == 0 and debug_info:
            debug_summary += f" | Debug: {'; '.join(debug_info[:5])}"
        log.reason = (log.reason or '') + debug_summary
        log.save()
    
    return log


def preview_fee_mismatch_reconciliation(data):
    
    student_id = int(data['student_id'])
    academic_year_id = int(data['academic_year'])
    new_student_group_id = int(data['new_student_group'])
    selected_fee_type_id = data.get('fee_type_id') 
    
    student_mapping = StudentStandardMapping.objects.filter(
        student_id=student_id,
        academic_year_id=academic_year_id
    ).first()
    
    if not student_mapping:
        return {
            'error': True,
            'message': 'Student enrollment not found for this academic year'
        }
    
    standard_id = student_mapping.standard_id
    
    available_fee_types = FeeStandardMapping.objects.filter(
        standard_id=standard_id,
        academic_year_id=academic_year_id,
        student_group_id=new_student_group_id
    ).select_related('fee_type', 'student_group').values(
        'id', 'fee_type_id', 'fee_type__name', 'amount', 'student_group__name', 'student_group_id'
    )
    
    payment_details = PaymentDetail.objects.filter(
        fee_collection__student_id=student_id,
        fee_collection__is_active=True,
        fee_plan__standard_fee__academic_year_id=academic_year_id
    ).select_related(
        'fee_plan', 
        'fee_plan__standard_fee', 
        'fee_plan__standard_fee__fee_type',
        'fee_plan__standard_fee__student_group'
    )
    
    total_old_paid = 0
    old_distribution = []
    
    for pd in payment_details:
        old_fee_plan = pd.fee_plan
        if not old_fee_plan or not old_fee_plan.standard_fee:
            continue
        
        old_sf = old_fee_plan.standard_fee
        amount = float(pd.amount_paid or 0)
        total_old_paid += amount
        
        old_distribution.append({
            'fee_type': old_sf.fee_type.name if old_sf.fee_type else 'Unknown',
            'term': old_fee_plan.terms or '',
            'amount_paid': amount,
            'payment_detail_id': pd.id,
            'fee_plan_id': old_fee_plan.id
        })
    
    fee_type_options = []
    
    # Prefetch all fee plans to avoid N+1 queries
    fee_plans_by_sf = {}
    for fp in FeePlan.objects.filter(
        standard_fee_id__in=[f['id'] for f in available_fee_types]
    ).order_by('sequence', 'terms').values('id', 'terms', 'rate', 'standard_fee_id', 'sequence'):
        fee_plans_by_sf.setdefault(fp['standard_fee_id'], []).append(fp)
    
    for fsm in available_fee_types:
        fee_plans = sorted(
            fee_plans_by_sf.get(fsm['id'], []),
            key=lambda x: (x['sequence'] or 0, x['terms'] or '')
        )
        
        terms = []
        total_rate = 0
        remaining = total_old_paid
        overflow = 0
        
        for fp in fee_plans:
            rate = float(fp['rate'] or 0)
            total_rate += rate
            
            allocated = 0
            if remaining > 0:
                allocated = min(remaining, rate)
                remaining -= allocated
            
            terms.append({
                'term': fp['terms'],
                'rate': rate,
                'allocated': allocated,
                'fee_plan_id': fp['id']
            })
        
        if total_old_paid > total_rate:
            overflow = total_old_paid - total_rate
        
        can_allocate = overflow == 0
        
        fee_type_options.append({
            'id': fsm['fee_type_id'],
            'key': fsm['id'],
            'name': fsm['fee_type__name'],
            'student_group': fsm['student_group__name'] or 'No Group',
            'student_group_id': fsm['student_group_id'],
            'is_target_group': fsm['student_group_id'] == new_student_group_id,
            'total_rate': total_rate,
            'terms': terms,
            'standard_fee_id': fsm['id'],
            'total_allocated': min(total_old_paid, total_rate),
            'overflow': overflow,
            'can_allocate': can_allocate
        })
    
    can_reconcile = False
    selected_option = None
    
    if selected_fee_type_id:
        for opt in fee_type_options:
            if opt['id'] == int(selected_fee_type_id):
                selected_option = opt
                can_reconcile = opt['can_allocate']
                break
    
    return {
        'fee_type_options': fee_type_options,
        'old_distribution': old_distribution,
        'selected_fee_type_id': int(selected_fee_type_id) if selected_fee_type_id else None,
        'can_reconcile': can_reconcile,
        'summary': {
            'total_payments': len(payment_details),
            'total_old_paid': total_old_paid
        }
    }

