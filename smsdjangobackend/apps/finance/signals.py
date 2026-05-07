# """
# Finance Dashboard Cache Signals
# Automatically update dashboard cache when models change
# """
# from django.db.models.signals import post_save, post_delete, pre_delete
# from django.dispatch import receiver
# from apps.finance.models.feeCollection import FeeCollection, PaymentDetail
# from apps.finance.models.concession import AdjustmentFee, Concession
# from apps.finance.models.fee import FeeplanStudentFeature
# from apps.students.models.student import Student
# from apps.classes.models.enrollment import StudentStandardMapping
# from apps.shared.services import SharedService
# from apps.finance.services.finance_dashboard import invalidate_dashboard_cache


# @receiver(post_save, sender=FeeCollection)
# def update_dashboard_on_fee_collection_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when fee collection is created or updated.
#     Invalidates cache at all levels: overall, standard-level, and student-level.
#     """
#     if not instance.is_active:
#         return
    
#     try:
#         # Get academic year and standard from PaymentDetail -> fee_plan -> standard_fee
#         # This is the most accurate way since fee collection is tied to specific fee plans
#         payment_details = PaymentDetail.objects.filter(
#             fee_collection=instance
#         ).select_related('fee_plan__standard_fee__academic_year', 'fee_plan__standard_fee__standard')
        
#         academic_years_standards = set()
#         student_id = instance.student_id if instance.student else None
        
#         # Collect all unique academic_year + standard combinations from payment details
#         for payment_detail in payment_details:
#             if payment_detail.fee_plan and payment_detail.fee_plan.standard_fee:
#                 academic_year_id = payment_detail.fee_plan.standard_fee.academic_year_id
#                 standard_id = payment_detail.fee_plan.standard_fee.standard_id
#                 academic_years_standards.add((academic_year_id, standard_id))
        
#         # If no payment details found yet (might be created after fee collection), 
#         # fall back to student's enrollment
#         if not academic_years_standards and instance.student:
#             student_standard = StudentStandardMapping.objects.filter(
#                 student=instance.student
#             ).select_related('academic_year', 'standard').order_by('-academic_year__start_date').first()
            
#             if student_standard:
#                 academic_years_standards.add((
#                     student_standard.academic_year_id,
#                     student_standard.standard_id
#                 ))
        
#         # Invalidate cache for each academic_year + standard combination
#         for academic_year_id, standard_id in academic_years_standards:
#             # Invalidate overall cache (no standard, no student)
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 None,  # standard_id=None for overall cache
#                 None   # student_id=None for overall cache
#             )
            
#             # Invalidate standard-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 None   # student_id=None for standard-level cache
#             )
            
#             # Invalidate student-level cache if student exists
#             if student_id:
#                 SharedService.custom_thread(
#                     invalidate_dashboard_cache,
#                     academic_year_id,
#                     standard_id,
#                     student_id
#                 )
#     except Exception:
#         # Silently fail to avoid breaking fee collection save
#         pass


# @receiver(post_save, sender=PaymentDetail)
# def update_dashboard_on_payment_detail_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when payment detail is created or updated.
#     This handles cases where PaymentDetail is created after FeeCollection.
#     """
#     if not instance.fee_collection or not instance.fee_collection.is_active:
#         return
    
#     try:
#         if instance.fee_plan and instance.fee_plan.standard_fee:
#             academic_year_id = instance.fee_plan.standard_fee.academic_year_id
#             standard_id = instance.fee_plan.standard_fee.standard_id
#             student_id = instance.fee_collection.student_id if instance.fee_collection.student else None
            
#             # Invalidate overall cache (no standard, no student)
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 None,  # standard_id=None for overall cache
#                 None   # student_id=None for overall cache
#             )
            
#             # Invalidate standard-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 None   # student_id=None for standard-level cache
#             )
            
#             # Invalidate student-level cache if student exists
#             if student_id:
#                 SharedService.custom_thread(
#                     invalidate_dashboard_cache,
#                     academic_year_id,
#                     standard_id,
#                     student_id
#                 )
                
#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.error(f"Error updating dashboard cache for payment detail {instance.id}: {str(e)}", exc_info=True)
#         # Silently fail to avoid breaking payment detail save


# @receiver(post_save, sender=AdjustmentFee)
# def update_dashboard_on_adjustment_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when adjustment is created or updated.
#     Invalidates cache at all levels: overall, standard-level, and student-level.
#     Also handles when adjustment is deactivated (is_active=False).
#     """
#     try:
#         if instance.student and instance.fee_plan and instance.fee_plan.standard_fee:
#             academic_year_id = instance.fee_plan.standard_fee.academic_year_id
#             standard_id = instance.fee_plan.standard_fee.standard_id
#             student_id = instance.student_id
            
#             # Invalidate overall cache (no standard, no student)
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 None,  # standard_id=None for overall cache
#                 None   # student_id=None for overall cache
#             )
            
#             # Invalidate standard-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 None   # student_id=None for standard-level cache
#             )
            
#             # Invalidate student-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.error(f"Error updating dashboard cache for adjustment {instance.id}: {str(e)}", exc_info=True)
#         # Silently fail to avoid breaking adjustment save
#         pass


# @receiver(post_delete, sender=AdjustmentFee)
# def update_dashboard_on_adjustment_delete(sender, instance, **kwargs):
#     """
#     Update dashboard cache when adjustment is deleted.
#     Invalidates cache at all levels: overall, standard-level, and student-level.
#     """
#     try:
#         if instance.student and instance.fee_plan and instance.fee_plan.standard_fee:
#             academic_year_id = instance.fee_plan.standard_fee.academic_year_id
#             standard_id = instance.fee_plan.standard_fee.standard_id
#             student_id = instance.student_id
            
#             # Invalidate overall cache (no standard, no student)
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 None,  # standard_id=None for overall cache
#                 None   # student_id=None for overall cache
#             )
            
#             # Invalidate standard-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 None   # student_id=None for standard-level cache
#             )
            
#             # Invalidate student-level cache
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.error(f"Error updating dashboard cache for deleted adjustment {instance.id}: {str(e)}", exc_info=True)
#         # Silently fail to avoid breaking adjustment delete
#         pass


# @receiver(post_save, sender=Concession)
# def update_dashboard_on_concession_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when concession is created or updated
#     """
#     if not instance.is_active:
#         return
    
#     try:
#         if instance.academic_year:
#             academic_year_id = instance.academic_year_id
#             standard_id = None
#             student_id = None
            
#             # Try to get standard and student from concession_adjustment
#             concession_adjustments = instance.concession_adjustment.all()
#             if concession_adjustments.exists():
#                 first_adj = concession_adjustments.first()
#                 if first_adj.fee_plan and first_adj.fee_plan.standard_fee:
#                     standard_id = first_adj.fee_plan.standard_fee.standard_id
#                 if first_adj.student:
#                     student_id = first_adj.student_id
            
#             # Invalidate cache in background thread
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception:
#         # Silently fail to avoid breaking concession save
#         pass


# @receiver(post_save, sender=FeeplanStudentFeature)
# def update_dashboard_on_feature_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when student feature (non-mandatory fee) is enabled
#     """
#     if not instance.is_active:
#         return
    
#     try:
#         if instance.student and instance.fee_plan and instance.fee_plan.standard_fee:
#             academic_year_id = instance.fee_plan.standard_fee.academic_year_id
#             standard_id = instance.fee_plan.standard_fee.standard_id
#             student_id = instance.student_id
            
#             # Invalidate cache in background thread
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception:
#         # Silently fail to avoid breaking feature save
#         pass


# @receiver(post_save, sender=Student)
# def update_dashboard_on_student_save(sender, instance, created, **kwargs):
#     """
#     Update dashboard cache when student is created or updated (only if active)
#     """
#     if not instance.is_active:
#         return
    
#     try:
#         # Get student's current enrollment to find academic year and standard
#         student_standard = StudentStandardMapping.objects.filter(
#             student=instance
#         ).select_related('academic_year', 'standard').order_by('-academic_year__start_date').first()
        
#         if student_standard:
#             academic_year_id = student_standard.academic_year_id
#             standard_id = student_standard.standard_id
#             student_id = instance.id
            
#             # Invalidate cache in background thread
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception:
#         # Silently fail to avoid breaking student save
#         pass


# @receiver(pre_delete, sender=Student)
# def update_dashboard_on_student_delete(sender, instance, **kwargs):
#     """
#     Update dashboard cache when student is deleted
#     """
#     try:
#         # Get student's enrollment before deletion
#         student_standard = StudentStandardMapping.objects.filter(
#             student=instance
#         ).select_related('academic_year', 'standard').order_by('-academic_year__start_date').first()
        
#         if student_standard:
#             academic_year_id = student_standard.academic_year_id
#             standard_id = student_standard.standard_id
#             student_id = instance.id
            
#             # Invalidate cache in background thread
#             SharedService.custom_thread(
#                 invalidate_dashboard_cache,
#                 academic_year_id,
#                 standard_id,
#                 student_id
#             )
#     except Exception:
#         # Silently fail to avoid breaking student delete
#         pass


# =============================================================================
# Recoverable Asset Transaction Signals
# Automatically update parent asset's closing_balance when transactions change
# =============================================================================

# from apps.finance.models.recoverable_asset import RecoverableAssetTransaction


# def recalculate_asset_closing_balance(asset):
#     """
#     Recalculate and update the closing_balance for a RecoverableAsset.
    
#     closing_balance = opening_balance + total_debits - total_credits
    
#     Debit types (increase balance): DEBIT, ADVANCE, INTEREST, PENALTY
#     Credit types (decrease balance): CREDIT, RECOVERY, ADJUSTMENT, REVERSAL
#     """
#     from decimal import Decimal
#     from django.db.models import Sum, Case, When, DecimalField
#     import logging
    
#     logger = logging.getLogger(__name__)
    
#     try:
#         txn_agg = asset.transactions.filter(is_active=True).aggregate(
#             total_debit=Sum(
#                 Case(
#                     When(transaction_type__in=['DEBIT', 'ADVANCE', 'INTEREST', 'PENALTY'], then='amount'),
#                     default=Decimal('0.00'),
#                     output_field=DecimalField()
#                 )
#             ),
#             total_credit=Sum(
#                 Case(
#                     When(transaction_type__in=['CREDIT', 'RECOVERY', 'ADJUSTMENT', 'REVERSAL'], then='amount'),
#                     default=Decimal('0.00'),
#                     output_field=DecimalField()
#                 )
#             )
#         )
        
#         total_debit = txn_agg['total_debit'] or Decimal('0.00')
#         total_credit = txn_agg['total_credit'] or Decimal('0.00')
        
#         # closing_balance = opening_balance + debits - credits
#         new_closing_balance = asset.opening_balance + total_debit - total_credit
        
#         if asset.closing_balance != new_closing_balance:
#             asset.closing_balance = new_closing_balance
#             asset.save(update_fields=['closing_balance', 'updated_at'])
#             logger.info(
#                 f"Updated closing_balance for RecoverableAsset {asset.id} ({asset.name}): "
#                 f"opening={asset.opening_balance}, debits={total_debit}, credits={total_credit}, "
#                 f"new_closing={new_closing_balance}"
#             )
#     except Exception as e:
#         logger.error(
#             f"Error recalculating closing_balance for RecoverableAsset {asset.id}: {str(e)}",
#             exc_info=True
#         )


# @receiver(post_save, sender=RecoverableAssetTransaction)
# def update_asset_closing_balance_on_transaction_save(sender, instance, **kwargs):
#     """
#     Recalculate parent asset's closing_balance when transaction is created or updated.
#     """
#     recalculate_asset_closing_balance(instance.recoverable_asset)


# @receiver(post_delete, sender=RecoverableAssetTransaction)
# def update_asset_closing_balance_on_transaction_delete(sender, instance, **kwargs):
#     """
#     Recalculate parent asset's closing_balance when transaction is hard deleted.
#     Note: For soft deletes (is_active=False), post_save signal handles it.
#     """
#     try:
#         # Check if asset still exists before recalculating
#         if instance.recoverable_asset_id:
#             from apps.finance.models.recoverable_asset import RecoverableAsset
#             try:
#                 asset = RecoverableAsset.objects.get(id=instance.recoverable_asset_id)
#                 recalculate_asset_closing_balance(asset)
#             except RecoverableAsset.DoesNotExist:
#                 pass  # Asset was deleted too, no need to update
#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.error(
#             f"Error updating closing_balance after transaction delete: {str(e)}",
#             exc_info=True
#         )


