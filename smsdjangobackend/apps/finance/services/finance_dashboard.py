"""
Finance Dashboard Calculation Service
Pre-calculates and caches dashboard metrics based on events
"""
from django.db import transaction
from django.db.models import Sum, Count, F, Q
from decimal import Decimal
from datetime import datetime
from rest_framework import exceptions
from apps.finance.models.finance_dashboard import FinanceDashboardCache
from apps.finance.models.feeCollection import FeeCollection, PaymentDetail, FeeCollectionModeOfPayment, ApplicationPaymentDetail
from apps.finance.models.fee import FeePlan, FeeStandardMapping
from apps.finance.models.concession import AdjustmentFee, Concession
from apps.finance.models.miscellaneous import MiscellaneousPayment
from apps.students.models.student import Student
from apps.classes.models.enrollment import StudentStandardMapping
from apps.classes.models.standard import Standard
from apps.tenants.services.middlewares import get_current_db_name
from apps.finance.services import calculations


def calculate_dashboard_cache(academic_year_id, standard_id=None, student_id=None, force_recalculate=False):
    """
    Calculate and cache dashboard metrics for given filters
    Returns existing cache immediately if it exists (unless force_recalculate=True)
    Only recalculates if cache doesn't exist or force_recalculate is True
    """
    import logging
    from apps.institutes.models.academicYear import AcademicYear
    from apps.classes.models.standard import Standard
    from apps.students.models.student import Student
    logger = logging.getLogger(__name__)
    
    # Get the academic year object
    try:
        academic_year = AcademicYear.objects.get(id=academic_year_id)
    except AcademicYear.DoesNotExist:
        raise exceptions.ValidationError(f'Academic year with id {academic_year_id} does not exist')
    
    # Get standard and student objects if provided
    standard = None
    if standard_id:
        try:
            standard = Standard.objects.get(id=standard_id)
        except Standard.DoesNotExist:
            standard = None
    
    student = None
    if student_id:
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            student = None
    
    # If force_recalculate, delete existing cache first
    if force_recalculate:
        cache_params = {'academic_year': academic_year, 'is_active': True}
        if standard:
            cache_params['standard'] = standard
        else:
            cache_params['standard__isnull'] = True
        
        if student:
            cache_params['student'] = student
        else:
            cache_params['student__isnull'] = True
        
        deleted_count = FinanceDashboardCache.objects.filter(**cache_params).delete()[0]
        if deleted_count > 0:
            logger.info(f"Deleted {deleted_count} existing cache entry/entries for force recalculation")
    
    # Try to get existing cache first (if not forcing recalculation)
    if not force_recalculate:
        try:
            cache_params = {'academic_year': academic_year, 'is_active': True}
            if standard:
                cache_params['standard'] = standard
            else:
                cache_params['standard__isnull'] = True
            
            if student:
                cache_params['student'] = student
            else:
                cache_params['student__isnull'] = True
            
            cache = FinanceDashboardCache.objects.get(**cache_params)
            logger.info(f"Using existing cached finance dashboard data (last calculated: {cache.last_calculated})")
            return cache
        except FinanceDashboardCache.DoesNotExist:
            logger.info(f"Cache doesn't exist, will create new cache entry")
        except FinanceDashboardCache.MultipleObjectsReturned:
            # Handle duplicate cache entries - keep the most recent one, delete others
            logger.warning(f"Multiple cache entries found for academic_year={academic_year_id}, standard={standard_id}, student={student_id}. Cleaning up duplicates...")
            caches = FinanceDashboardCache.objects.filter(**cache_params).order_by('-last_calculated', '-created')
            cache = caches.first()  # Keep the most recent one
            # Delete the rest - get IDs excluding the one we're keeping
            if cache:
                duplicate_ids = list(caches.exclude(id=cache.id).values_list('id', flat=True))
                if duplicate_ids:
                    deleted_count = FinanceDashboardCache.objects.filter(id__in=duplicate_ids).delete()[0]
                    logger.info(f"Deleted {deleted_count} duplicate cache entries")
                logger.info(f"Using existing cached finance dashboard data (last calculated: {cache.last_calculated})")
                return cache
            else:
                # If somehow cache is None, recalculate
                logger.warning("Cache is None after duplicate cleanup, will recalculate")
        except Exception as e:
            logger.warning(f"Error retrieving cache: {str(e)}, will recalculate")
    
    # Cache doesn't exist or force_recalculate is True - calculate and create/update cache
    # Use select_for_update to prevent race conditions when multiple threads try to create cache simultaneously
    with transaction.atomic(using=get_current_db_name()):
        # Calculate metrics (this can take time)
        logger.info(f"Starting metrics calculation for academic_year={academic_year_id}, standard={standard_id}, student={student_id}")
        metrics = _calculate_metrics(academic_year_id, standard_id, student_id)
        logger.info(f"Metrics calculation completed")
        
        # Get or create cache entry
        # Separate query params (for filtering) from create params (for model creation)
        query_params = {'academic_year': academic_year, 'is_active': True}
        create_params = {'academic_year': academic_year, 'is_active': True}
        
        if standard:
            query_params['standard'] = standard
            create_params['standard'] = standard
        else:
            query_params['standard__isnull'] = True
            create_params['standard'] = None
        
        if student:
            query_params['student'] = student
            create_params['student'] = student
        else:
            query_params['student__isnull'] = True
            create_params['student'] = None
        
        # Use get_or_create with select_for_update to handle race conditions
        # This ensures only one thread can create the cache entry at a time
        max_retries = 3
        retry_count = 0
        cache = None
        created = False
        
        while retry_count < max_retries:
            try:
                # Try to get existing cache with row-level lock to prevent duplicates
                cache = FinanceDashboardCache.objects.select_for_update().filter(**query_params).first()
                
                if cache:
                    created = False
                    break
                else:
                    # Try to create new cache entry
                    cache = FinanceDashboardCache.objects.create(**create_params)
                    created = True
                    break
                    
            except FinanceDashboardCache.MultipleObjectsReturned:
                # Handle duplicate cache entries - keep the most recent one, delete others
                logger.warning(f"Multiple cache entries found during get_or_create. Cleaning up duplicates...")
                caches = FinanceDashboardCache.objects.filter(**query_params).order_by('-last_calculated', '-created')
                cache = caches.first()  # Keep the most recent one
                # Delete the rest - get IDs excluding the one we're keeping
                if cache:
                    duplicate_ids = list(caches.exclude(id=cache.id).values_list('id', flat=True))
                    if duplicate_ids:
                        deleted_count = FinanceDashboardCache.objects.filter(id__in=duplicate_ids).delete()[0]
                        logger.info(f"Deleted {deleted_count} duplicate cache entries")
                    created = False
                    break
                else:
                    # If somehow cache is None, retry
                    logger.warning("Cache is None after duplicate cleanup, retrying...")
                    retry_count += 1
                    continue
                    
            except Exception as e:
                # Handle IntegrityError (duplicate key) or other database errors
                if 'Duplicate entry' in str(e) or 'IntegrityError' in str(type(e).__name__):
                    logger.warning(f"Duplicate cache entry detected (race condition), retrying... (attempt {retry_count + 1}/{max_retries})")
                    # Another thread created the cache, try to get it
                    try:
                        cache = FinanceDashboardCache.objects.get(**query_params)
                        created = False
                        break
                    except FinanceDashboardCache.DoesNotExist:
                        retry_count += 1
                        if retry_count >= max_retries:
                            logger.error(f"Failed to create/get cache after {max_retries} retries: {str(e)}")
                            raise
                        continue
                else:
                    # Some other error, re-raise it
                    logger.error(f"Unexpected error creating cache: {str(e)}", exc_info=True)
                    raise
        
        if cache is None:
            raise Exception(f"Failed to create or retrieve cache after {max_retries} retries")
        
        # Update cache with calculated metrics
        cache.total_students = metrics['total_students']
        cache.total_fee_amount = metrics['total_fee_amount']
        cache.total_collected = metrics['total_collected']
        cache.total_pending = metrics['total_pending']
        cache.total_adjustment = metrics['total_adjustment']
        cache.total_concession = metrics['total_concession']
        cache.fee_type_breakdown = metrics['fee_type_breakdown']
        cache.payment_mode_breakdown = metrics['payment_mode_breakdown']
        cache.monthly_collection = metrics['monthly_collection']
        # Store additional breakdowns in monthly_collection JSON field (reusing it)
        extended_data = {
            'term_breakdown': metrics.get('term_breakdown', {}),
            'standard_breakdown': metrics.get('standard_breakdown', {}),
            'fee_type_detailed': metrics.get('fee_type_detailed', {}),
            'pending_breakdown': metrics.get('pending_breakdown', {}),
            'monthly_collection': metrics.get('monthly_collection', {})
        }
        cache.monthly_collection = extended_data
        cache.last_calculated = datetime.now()
        cache.save()
        
        logger.info(f"Cache {'created' if created else 'updated'} successfully")
        return cache


def _calculate_metrics(academic_year_id, standard_id=None, student_id=None):
    """
    Calculate all dashboard metrics
    """
    # Base filters
    fee_plan_filter = Q(standard_fee__academic_year_id=academic_year_id)
    fee_collection_filter = Q(
        payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id,
        is_active=True
    )
    student_filter = Q()
    
    if standard_id:
        fee_plan_filter &= Q(standard_fee__standard_id=standard_id)
        fee_collection_filter &= Q(payment_detail__fee_plan__standard_fee__standard_id=standard_id)
        student_filter = Q(standard_student__standard_id=standard_id, 
                          standard_student__academic_year_id=academic_year_id)
    else:
        # If no standard selected, count students enrolled in the academic year
        student_filter = Q(standard_student__academic_year_id=academic_year_id)
    
    if student_id:
        fee_collection_filter &= Q(student_id=student_id)
        student_filter = Q(id=student_id)
    
    # Total students - count students enrolled in the academic year (and standard if specified)
    total_students = Student.objects.filter(
        student_filter,
        is_active=True
    ).distinct().count() if not student_id else 1
    
    # Total fee amount, pending amount, and paid amount - calculate using fee_calculation for each student
    # This ensures we only count applicable fee plans (not disabled, matching student type, etc.)
    # IMPORTANT: We use fee_data['total_payable'] or fee_data['amount'] (NOT total_amount) because:
    # - total_amount includes increment adjustments but NOT decrement adjustments
    # - total_payable/amount includes ALL adjustments (both increment and decrement) and concessions
    # - For dashboard, we want the fee amount AFTER all adjustments are applied
    total_fee_amount = Decimal('0')
    total_pending_from_calculation = Decimal('0')  # Sum of total_pending_amount from each student
    total_paid_from_calculation = Decimal('0')  # Sum of total_paid_amount from each student (matches fee collection report)
    
    # Get students based on filters
    student_filter_for_fee = Q(
        standard_student__academic_year_id=academic_year_id,
        is_active=True
    )
    if standard_id:
        student_filter_for_fee &= Q(standard_student__standard_id=standard_id)
    if student_id:
        student_filter_for_fee = Q(id=student_id, is_active=True)
    
    students = Student.objects.filter(student_filter_for_fee).distinct()
    
    # Get student-standard mapping for each student
    student_standard_mapping = {}
    student_standard_data = StudentStandardMapping.objects.filter(
        academic_year_id=academic_year_id,
        student__in=students.values_list('id', flat=True)
    )
    if standard_id:
        student_standard_data = student_standard_data.filter(standard_id=standard_id)
    if student_id:
        student_standard_data = student_standard_data.filter(student_id=student_id)
    
    for mapping in student_standard_data:
        student_standard_mapping[mapping.student_id] = mapping.standard_id
    
    # Calculate fee for each student using fee_calculation (same logic as fee collection report)
    # Create a mock request object for fee_calculation with a mock user
    class MockGroupsQueryset:
        """Mock queryset that has a values() method returning empty list"""
        def values(self, *args, **kwargs):
            return []
    
    class MockGroups:
        """Mock groups manager that returns a queryset-like object"""
        def all(self):
            return MockGroupsQueryset()  # Return object with values() method, not a list
    
    class MockUser:
        def __init__(self):
            self.id = 1  # Set a valid ID to avoid None errors
            self.is_superuser = True  # Set to True to bypass permission checks
            self.groups = MockGroups()  # Properly mock groups.all() method
    
    class MockRequest:
        def __init__(self):
            self.GET = {}
            self.user = MockUser()  # Mock user for approval checks
    
    class MockSelf:
        def __init__(self):
            self.request = MockRequest()
    
    mock_self = MockSelf()
    
    # Track statistics for debugging
    students_processed = 0
    students_with_fees = 0
    students_with_errors = 0
    
    # Term-wise breakdown tracking (accumulate from student-applicable fees)
    term_breakdown_data = {}
    # Track which students have each term (for student_count)
    term_students = {}
    
    # Fee type-wise breakdown tracking (accumulate from student-applicable fees)
    fee_type_breakdown_data = {}
    # Track which students have each fee type (for student_count)
    fee_type_students = {}

    for student in students:
        if student.id not in student_standard_mapping:
            continue
        std_id = student_standard_mapping[student.id]
        students_processed += 1
        
        try:
            # Use fee_calculation to get the total amount and pending amount for this student (same as fee collection report)
            # Match fee collection report parameters EXACTLY: returnValue=True, termDivision=True (default)
            try:
                fee_data = calculations.fee_calculation(
                    mock_self, student.id, academic_year_id, std_id, returnValue=True, termDivision=True
                )
            except Exception as calc_error:
                import traceback
                print(f"ERROR in fee_calculation for student {student.id}: {str(calc_error)}")
                print(traceback.format_exc())
                raise
            
            # IMPORTANT: total_amount includes increment adjustments but NOT decrement adjustments
            # total_payable/amount includes both increment and decrement adjustments
            # For dashboard, we want the fee amount AFTER all adjustments (both increment and decrement)
            # So we should use total_payable or amount instead of total_amount
            if fee_data and isinstance(fee_data, dict):
                # Use total_payable (or amount) which includes all adjustments (both increment and decrement)
                # total_amount only includes increment adjustments, not decrement adjustments
                student_fee_amount = fee_data.get('total_payable', 0) or fee_data.get('amount', 0) or fee_data.get('total_amount', 0) or 0
                
                # Extract term-wise and fee type-wise breakdown from student's applicable fees
                if 'data' in fee_data:
                    for fee_item in fee_data['data']:
                        fee_type_name = fee_item.get('fee_type_name', 'Unknown')
                        
                        # Initialize fee type breakdown if not exists
                        if fee_type_name not in fee_type_breakdown_data:
                            fee_type_breakdown_data[fee_type_name] = {
                                'total_amount': 0,
                                'paid_amount': 0,
                                'pending_amount': 0,
                                'discounted_amount': 0,
                                'student_count': 0,
                            }
                            fee_type_students[fee_type_name] = set()
                        
                        for term in fee_item.get('standard_fee', []):
                            # Skip disabled (non-applicable) fee plans
                            if term.get('is_disabled'):
                                continue
                            term_name = term.get('terms') or 'N/A'
                            
                            # Initialize term breakdown if not exists
                            if term_name not in term_breakdown_data:
                                term_breakdown_data[term_name] = {
                                    'total_amount': 0,
                                    'paid_amount': 0,
                                    'pending_amount': 0,
                                    'discounted_amount': 0,
                                    'student_count': 0,
                                    'fee_types': {}
                                }
                                term_students[term_name] = set()
                            
                            # Accumulate term amounts
                            # IMPORTANT: total_amount includes increment adjustments but NOT decrement adjustments
                            # amount/total_payable represents the payable amount after ALL adjustments (both increment and decrement) and concessions
                            # For dashboard, we want the amount AFTER all adjustments, so use 'amount' field
                            # 'amount' field is the payable amount after all adjustments and concessions
                            term_total_amount = float(term.get('amount') or term.get('total_amount') or 0)
                            term_paid_amount = float(term.get('paid_amount') or 0)
                            term_pending_amount = float(term.get('pending_amount') or 0)
                            term_concession_amount = float(term.get('concession_amount') or 0)
                            term_adjustment_amount = float(term.get('adjustment_amount') or 0)
                            
                            term_breakdown_data[term_name]['total_amount'] += term_total_amount
                            term_breakdown_data[term_name]['paid_amount'] += term_paid_amount
                            term_breakdown_data[term_name]['pending_amount'] += term_pending_amount
                            term_breakdown_data[term_name]['discounted_amount'] += (term_concession_amount + term_adjustment_amount)
                            
                            # Track unique students for this term
                            term_students[term_name].add(student.id)
                            
                            # Track fee types breakdown
                            if fee_type_name not in term_breakdown_data[term_name]['fee_types']:
                                term_breakdown_data[term_name]['fee_types'][fee_type_name] = 0
                            term_breakdown_data[term_name]['fee_types'][fee_type_name] += term_total_amount
                            
                            # Accumulate fee type amounts (same logic as term breakdown)
                            fee_type_breakdown_data[fee_type_name]['total_amount'] += term_total_amount
                            fee_type_breakdown_data[fee_type_name]['paid_amount'] += term_paid_amount
                            fee_type_breakdown_data[fee_type_name]['pending_amount'] += term_pending_amount
                            fee_type_breakdown_data[fee_type_name]['discounted_amount'] += (term_concession_amount + term_adjustment_amount)
                            
                            # Track unique students for this fee type
                            fee_type_students[fee_type_name].add(student.id)
                
                # Get other fields for debugging and fallback
                amount_field = fee_data.get('amount', 0) or 0
                total_payable_field = fee_data.get('total_payable', 0) or 0
                student_paid_amount = fee_data.get('total_paid_amount', 0) or 0
                student_pending_amount = fee_data.get('total_pending_amount', 0) or 0
                
                # CRITICAL: If student_fee_amount is 0 but we have pending/paid amounts, there might be an issue
                # Use amount (total_payable) as fallback since it's calculated correctly after all adjustments
                if student_fee_amount == 0:
                    if student_paid_amount > 0 or student_pending_amount > 0 or amount_field > 0:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Student {student.id} (Standard {std_id}): student_fee_amount=0 but paid={student_paid_amount}, pending={student_pending_amount}, amount={amount_field}")
                        logger.warning(f"   Using amount/total_payable as fallback since it includes all adjustments.")
                        # Use amount (total_payable) as it's calculated correctly after all processing
                        if amount_field > 0:
                            student_fee_amount = amount_field
                        elif total_payable_field > 0:
                            student_fee_amount = total_payable_field
                        # If still 0, log all fee_data for debugging
                        if student_fee_amount == 0:
                            logger.error(f"   All amounts are 0! fee_data: {fee_data}")
                
                try:
                    amount_decimal = Decimal(str(student_fee_amount))
                    total_fee_amount += amount_decimal
                    if amount_decimal > 0:
                        students_with_fees += 1
                except (ValueError, TypeError) as conv_error:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Student {student.id}: Could not convert fee amount '{student_fee_amount}' to Decimal: {conv_error}")
                
                # Also get total_pending_amount from fee_calculation (matches fee collection report)
                if 'total_pending_amount' in fee_data and fee_data['total_pending_amount'] is not None:
                    try:
                        student_pending_amount = fee_data['total_pending_amount']
                        total_pending_from_calculation += Decimal(str(student_pending_amount))
                    except (ValueError, TypeError) as conv_error:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Student {student.id}: Could not convert total_pending_amount to Decimal: {conv_error}")
                
                # Get total_paid_amount from fee_calculation (matches fee collection report exactly)
                if 'total_paid_amount' in fee_data and fee_data['total_paid_amount'] is not None:
                    try:
                        student_paid_amount = fee_data['total_paid_amount']
                        total_paid_from_calculation += Decimal(str(student_paid_amount))
                    except (ValueError, TypeError) as conv_error:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(f"Student {student.id}: Could not convert total_paid_amount to Decimal: {conv_error}")
            else:
                # Log if fee_data is not a dict or is None
                import logging
                logger = logging.getLogger(__name__)
                if fee_data is None:
                    logger.warning(f"Student {student.id}: fee_calculation returned None")
                else:
                    logger.warning(f"Student {student.id}: fee_calculation returned {type(fee_data)} instead of dict: {fee_data}")
                
        except exceptions.ValidationError as e:
            # If no approved fee plan exists, student has 0 fees (this is expected for some students)
            # Don't count this as an error, just continue with 0 fees
            print(f"DEBUG: ValidationError for student {student.id}: {str(e)}")
            import logging
            logger = logging.getLogger(__name__)
            logger.debug(f"Student {student.id} has no approved fee plan: {str(e)}")
            # Student has 0 fees, continue
            continue
        except Exception as e:
            # If fee calculation fails for a student due to other reasons, log and continue
            students_with_errors += 1
            import traceback
            print(f"DEBUG: Exception for student {student.id}: {str(e)}")
            print(traceback.format_exc())
            import logging
            logger = logging.getLogger(__name__)
            error_msg = f"Error calculating fee for student {student.id}, standard {std_id}, academic_year {academic_year_id}: {str(e)}"
            logger.warning(error_msg)
            # Log full traceback for debugging
            logger.debug(traceback.format_exc())
            # Continue processing other students even if one fails
            continue
    
    # Log summary for debugging
    import logging
    logger = logging.getLogger(__name__)
    students_with_no_fees = students_processed - students_with_fees - students_with_errors
    logger.info(f"Finance dashboard calculation summary:")
    logger.info(f"  - Students processed: {students_processed}")
    logger.info(f"  - Students with fees > 0: {students_with_fees}")
    logger.info(f"  - Students with no fees (no approved plan): {students_with_no_fees}")
    logger.info(f"  - Students with errors: {students_with_errors}")
    logger.info(f"  - Total fee amount: {total_fee_amount}")
    logger.info(f"  - Total paid amount: {total_paid_from_calculation}")
    logger.info(f"  - Total pending amount: {total_pending_from_calculation}")
    
    # If total_fee_amount is 0, log a warning
    if total_fee_amount == 0 and students_processed > 0:
        logger.warning(f"WARNING: Total fee amount is 0 but {students_processed} students were processed. This might indicate:")
        logger.warning(f"  1. No students have approved fee plans")
        logger.warning(f"  2. All fee plans are disabled or not applicable")
        logger.warning(f"  3. Calculation is returning 0 for all students")
    
    # Get fee standard mappings for breakdown (needed for fee type breakdown)
    fee_standard_filter = Q(academic_year_id=academic_year_id, is_approved='1')
    if standard_id:
        fee_standard_filter &= Q(standard_id=standard_id)
    fee_standard_mappings = FeeStandardMapping.objects.filter(fee_standard_filter)
    
    # Get fee plans for breakdown
    fee_plan_ids = FeePlan.objects.filter(fee_plan_filter).values_list('id', flat=True)
    
    # Total collected - use total_paid_amount from fee_calculation (matches fee collection report exactly)
    # The fee collection report uses fee_data['total_paid_amount'] from fee_calculation for each student
    # This ensures we match the report's calculation logic exactly
    total_collected = total_paid_from_calculation
    
    # Get fee collections for breakdowns (still needed for payment mode and monthly breakdowns)
    fee_collections = FeeCollection.objects.filter(fee_collection_filter)
    
    # Total adjustment
    adjustment_filter = Q(
        fee_plan__standard_fee__academic_year_id=academic_year_id,
        is_active=True
    )
    if standard_id:
        adjustment_filter &= Q(fee_plan__standard_fee__standard_id=standard_id)
    if student_id:
        adjustment_filter &= Q(student_id=student_id)
    
    total_adjustment = AdjustmentFee.objects.filter(adjustment_filter).aggregate(
        total=Sum('amount')
    )['total'] or Decimal('0')
    
    # Total concession
    concession_filter = Q(
        academic_year_id=academic_year_id,
        is_active=True
    )
    if standard_id:
        concession_filter &= Q(concession_adjustment__fee_plan__standard_fee__standard_id=standard_id)
    if student_id:
        concession_filter &= Q(concession_adjustment__student_id=student_id)
    
    total_concession = Concession.objects.filter(concession_filter).aggregate(
        total=Sum('concession_adjustment__amount')
    )['total'] or Decimal('0')
    
    # Total pending - use total_pending_amount from fee_calculation (matches fee collection report exactly)
    # The fee collection report uses fee_data['total_pending_amount'] from fee_calculation for each student
    # This already accounts for adjustments and concessions correctly
    total_pending = total_pending_from_calculation
    
    # Ensure total_fee_amount is Decimal
    total_fee_amount = Decimal(str(total_fee_amount)) if total_fee_amount else Decimal('0')
    
    # Fee type breakdown - only include fee types with total > 0 (applicable)
    fee_type_breakdown = {}
    fee_type_data = fee_standard_mappings.values('fee_type__name').annotate(
        total=Sum('amount'),
        count=Count('id')
    )
    for item in fee_type_data:
        total_amount = float(item['total'] or 0)
        # Only include fee types that have a total amount > 0 (applicable)
        if total_amount > 0:
            fee_type_breakdown[item['fee_type__name']] = {
                'total': total_amount,
                'count': item['count']
            }
    
    # Payment mode breakdown
    payment_mode_breakdown = {}
    payment_mode_data = FeeCollectionModeOfPayment.objects.filter(
        fee_collection__in=fee_collections
    ).values('mode_of_payment').annotate(
        total=Sum('amount'),
        count=Count('id')
    )
    for item in payment_mode_data:
        payment_mode_breakdown[item['mode_of_payment']] = {
            'total': float(item['total']),
            'count': item['count']
        }
    
    # Monthly collection
    monthly_collection = {}
    if fee_collections.exists():
        monthly_data = fee_collections.extra(
            select={'month': "EXTRACT(month FROM transaction_date)"}
        ).values('month').annotate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        for item in monthly_data:
            if item['month']:
                month_name = datetime(2024, int(item['month']), 1).strftime('%B')
                monthly_collection[month_name] = {
                    'total': float(item['total']),
                    'count': item['count']
                }
    
    # Term-wise breakdown - use the aggregated data from student fee calculations
    # This ensures we only count fees that are actually applicable to students
    # Set student_count for each term
    for term_name in term_breakdown_data:
        if term_name in term_students:
            term_breakdown_data[term_name]['student_count'] = len(term_students[term_name])
        else:
            term_breakdown_data[term_name]['student_count'] = 0
    
    term_breakdown = term_breakdown_data
    
    # Fee type-wise breakdown - use the aggregated data from student fee calculations
    # This ensures we only count fees that are actually applicable to students
    # Set student_count for each fee type (same logic as term breakdown)
    for fee_type_name in fee_type_breakdown_data:
        if fee_type_name in fee_type_students:
            fee_type_breakdown_data[fee_type_name]['student_count'] = len(fee_type_students[fee_type_name])
        else:
            fee_type_breakdown_data[fee_type_name]['student_count'] = 0
    
    # Standard-wise breakdown - calculate using fee_calculation for each student (only applicable fees)
    standard_breakdown = {}
    if not standard_id:  # Only calculate if not filtering by standard
        standards = Standard.objects.filter(
            student_standard__academic_year_id=academic_year_id,
            student_standard__student__is_active=True
        ).distinct().order_by('sequence')
        
        # Create mock objects for fee_calculation (reuse from above)
        class MockGroupsQueryset:
            """Mock queryset that has a values() method returning empty list"""
            def values(self, *args, **kwargs):
                return []
        
        class MockGroups:
            """Mock groups manager that returns a queryset-like object"""
            def all(self):
                return MockGroupsQueryset()  # Return object with values() method, not a list
        
        class MockUser:
            def __init__(self):
                self.id = 1
                self.is_superuser = True
                self.groups = MockGroups()  # Properly mock groups.all() method
        
        class MockRequest:
            def __init__(self):
                self.GET = {}
                self.user = MockUser()
        
        class MockSelf:
            def __init__(self):
                self.request = MockRequest()
        
        mock_self = MockSelf()
        
        for std in standards:
            # Get all students in this standard for this academic year
            std_students_mapping = StudentStandardMapping.objects.filter(
                academic_year_id=academic_year_id,
                standard_id=std.id,
                student__is_active=True
            ).select_related('student')
            
            std_students = std_students_mapping.count()
            
            # Calculate total fee amount and pending amount using fee_calculation for each student
            std_total_fee = Decimal('0')
            std_total_pending = Decimal('0')
            students_with_fees = 0
            
            for mapping in std_students_mapping:
                student = mapping.student
                try:
                    # Use fee_calculation to get only applicable fees for this student
                    fee_data = calculations.fee_calculation(
                        mock_self, student.id, academic_year_id, std.id, returnValue=True, termDivision=True
                    )
                    
                    if fee_data and isinstance(fee_data, dict):
                        # Calculate amounts by summing from fee items (same approach as term-wise breakdown)
                        # This is the most reliable method as it uses actual term data
                        # Use EXACT same logic as term breakdown to ensure consistency
                        student_fee_total = Decimal('0')
                        student_paid_total = Decimal('0')
                        student_pending_total = Decimal('0')
                        if 'data' in fee_data:
                            for fee_item in fee_data['data']:
                                # Don't skip items with 'reason' - use same logic as term breakdown
                                if 'standard_fee' in fee_item:
                                    for term in fee_item.get('standard_fee', []):
                                        # Skip disabled (non-applicable) fee plans
                                        if term.get('is_disabled'):
                                            continue
                                        # Use EXACT same logic as term-wise breakdown (line 302)
                                        # total_amount represents the final amount after adjustments
                                        # amount represents the payable amount after all adjustments and concessions
                                        term_total_amount = float(term.get('total_amount') or term.get('amount') or 0)
                                        term_paid_amount = float(term.get('paid_amount') or 0)
                                        term_pending_amount = float(term.get('pending_amount') or 0)
                                        
                                        # Accumulate amounts (same as term breakdown)
                                        student_fee_total += Decimal(str(term_total_amount))
                                        student_paid_total += Decimal(str(term_paid_amount))
                                        student_pending_total += Decimal(str(term_pending_amount))
                        
                        # Fallback to top-level values if sum from terms is 0
                        # This ensures we get values even if term-level data is missing
                        if student_fee_total == 0:
                            total_amount_field = fee_data.get('total_amount', 0) or 0
                            if total_amount_field > 0:
                                student_fee_total = Decimal(str(total_amount_field))
                        
                        if student_paid_total == 0:
                            total_paid_amount = fee_data.get('total_paid_amount', 0) or 0
                            if total_paid_amount:
                                student_paid_total = Decimal(str(total_paid_amount))
                        
                        if student_pending_total == 0:
                            total_pending_amount = fee_data.get('total_pending_amount', 0) or 0
                            if total_pending_amount is not None:
                                student_pending_total = Decimal(str(total_pending_amount))
                        
                        # Always add the amounts (even if 0) to ensure consistency
                        std_total_fee += student_fee_total
                        std_total_pending += student_pending_total
                        
                        if student_fee_total > 0:
                            students_with_fees += 1
                            
                # except exceptions.ValidationError:
                #     # No approved fee plan for this student, skip (0 fees)
                #     continue
                except Exception as e:
                    print(e.args, 'ku ar')
                    # Log error but continue with other students
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.warning(f"Error calculating fee for student {student.id} in standard {std.id}: {str(e)}")
                    continue
            
            # Calculate collected amount for this standard
            std_collected = FeeCollection.objects.filter(
                payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id,
                payment_detail__fee_plan__standard_fee__standard_id=std.id,
                is_active=True
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
            std_collected_decimal = Decimal(str(std_collected)) if std_collected else Decimal('0')
            
            # Calculate total discount (concessions + adjustments) for this standard
            std_adjustment = AdjustmentFee.objects.filter(
                fee_plan__standard_fee__academic_year_id=academic_year_id,
                fee_plan__standard_fee__standard_id=std.id,
                is_active=True
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            std_concession = Concession.objects.filter(
                academic_year_id=academic_year_id,
                concession_adjustment__fee_plan__standard_fee__standard_id=std.id,
                is_active=True
            ).aggregate(total=Sum('concession_adjustment__amount'))['total'] or Decimal('0')
            
            std_discount = Decimal(str(std_adjustment)) + Decimal(str(std_concession))
            std_discount_float = float(std_discount)
            
            # Skip standards with no students and no fees (empty standards)
            if std_students == 0 and std_total_fee == 0:
                continue
            
            # Calculate collection rate
            fee_float = float(std_total_fee)
            collected_float = float(std_collected_decimal)
            pending_float = float(std_total_pending)
            
            standard_breakdown[std.name] = {
                'id': std.id,
                'sequence': std.sequence,  # Add sequence for frontend sorting
                'total_fee': fee_float,
                'total_collected': collected_float,
                'total_discount': std_discount_float,
                'total_pending': pending_float,
                'student_count': std_students,
                'collection_rate': (collected_float / fee_float * 100) if fee_float > 0 else 0
            }
    
    # Fee type wise detailed breakdown - use the aggregated data from student fee calculations
    # This ensures we only count fees that are actually applicable to students (same as term breakdown)
    # Use same structure as term_breakdown: total_amount, paid_amount, pending_amount, discounted_amount, student_count
    fee_type_detailed = {}
    for fee_type_name, fee_type_data in fee_type_breakdown_data.items():
        # Use the same structure as term breakdown for consistency
        fee_type_detailed[fee_type_name] = {
            'total_amount': fee_type_data['total_amount'],
            'paid_amount': fee_type_data['paid_amount'],
            'pending_amount': fee_type_data['pending_amount'],
            'discounted_amount': fee_type_data['discounted_amount'],
            'student_count': fee_type_data['student_count'],
        }
    
    # Pending fee breakdown by standard
    pending_breakdown = {}
    if not standard_id:
        pending_data = StudentStandardMapping.objects.filter(
            academic_year_id=academic_year_id,
            student__is_active=True
        ).values('standard__name', 'standard__id').annotate(
            student_count=Count('student', distinct=True)
        )
        for item in pending_data:
            std_name = item['standard__name'] or 'N/A'
            std_id = item['standard__id']
            # Calculate pending for this standard
            std_fee = FeeStandardMapping.objects.filter(
                academic_year_id=academic_year_id,
                standard_id=std_id,
                is_approved='1'
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            std_collected = FeeCollection.objects.filter(
                payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id,
                payment_detail__fee_plan__standard_fee__standard_id=std_id,
                is_active=True
            ).aggregate(total=Sum('total_amount'))['total'] or Decimal('0')
            # Ensure Decimal types before conversion
            std_fee_decimal = Decimal(str(std_fee)) if std_fee else Decimal('0')
            std_collected_decimal = Decimal(str(std_collected)) if std_collected else Decimal('0')
            pending_breakdown[std_name] = {
                'id': std_id,
                'student_count': item['student_count'],
                'total_fee': float(std_fee_decimal),
                'total_collected': float(std_collected_decimal),
                'total_pending': max(0, float(std_fee_decimal - std_collected_decimal)),
                'pending_per_student': max(0, float((std_fee_decimal - std_collected_decimal) / Decimal(str(item['student_count'])))) if item['student_count'] > 0 else 0
            }
    
    return {
        'total_students': total_students,
        'total_fee_amount': total_fee_amount,
        'total_collected': total_collected,
        'total_pending': total_pending,
        'total_adjustment': total_adjustment,
        'total_concession': total_concession,
        'fee_type_breakdown': fee_type_breakdown,
        'payment_mode_breakdown': payment_mode_breakdown,
        'monthly_collection': monthly_collection,
        'term_breakdown': term_breakdown,
        'standard_breakdown': standard_breakdown,
        'fee_type_detailed': fee_type_detailed,
        'pending_breakdown': pending_breakdown,
    }


def invalidate_dashboard_cache(academic_year_id, standard_id=None, student_id=None):
    """
    Invalidate and recalculate dashboard cache
    Uses a lock to prevent race conditions when multiple threads try to invalidate simultaneously
    """
    import time
    from apps.institutes.models.academicYear import AcademicYear
    from apps.classes.models.standard import Standard
    from apps.students.models.student import Student
    
    # Get the academic year object
    try:
        academic_year = AcademicYear.objects.get(id=academic_year_id)
    except AcademicYear.DoesNotExist:
        return
    
    cache_params = {'academic_year': academic_year, 'is_active': True}
    
    if standard_id:
        try:
            standard = Standard.objects.get(id=standard_id)
            cache_params['standard'] = standard
        except Standard.DoesNotExist:
            pass
    else:
        cache_params['standard__isnull'] = True
    
    if student_id:
        try:
            student = Student.objects.get(id=student_id)
            cache_params['student'] = student
        except Student.DoesNotExist:
            pass
    else:
        cache_params['student__isnull'] = True
    
    # Try to get existing cache first - if another thread is already recalculating, use that
    try:
        existing_cache = FinanceDashboardCache.objects.filter(**cache_params).order_by('-last_calculated').first()
        if existing_cache:
            # Check if cache was recently calculated (within last 5 seconds)
            # If so, another thread might be recalculating, so skip
            if existing_cache.last_calculated and (time.time() - existing_cache.last_calculated.timestamp()) < 5:
                return existing_cache
    except Exception as e:
        pass
    
    # Delete existing cache within a transaction to prevent race conditions
    try:
        with transaction.atomic(using=get_current_db_name()):
            # Use select_for_update to lock rows during deletion
            FinanceDashboardCache.objects.select_for_update().filter(**cache_params).delete()
    except Exception as e:
        # Continue anyway - the recalculation will handle duplicates
        pass
    
    # Recalculate with retry logic to handle race conditions
    max_retries = 3
    retry_delay = 0.5  # seconds
    
    for attempt in range(max_retries):
        try:
            return calculate_dashboard_cache(academic_year_id, standard_id, student_id, force_recalculate=True)
        except Exception as e:
            if 'Duplicate entry' in str(e) or 'IntegrityError' in str(type(e).__name__):
                if attempt < max_retries - 1:
                    time.sleep(retry_delay * (attempt + 1))  # Exponential backoff
                    continue
                else:
                    # Last attempt failed, try to get existing cache
                    try:
                        existing_cache = FinanceDashboardCache.objects.get(**cache_params)
                        return existing_cache
                    except FinanceDashboardCache.DoesNotExist:
                        raise
            else:
                # Some other error, re-raise it
                raise


def update_dashboard_on_student_added(academic_year_id, standard_id=None, student_id=None):
    """
    Update dashboard cache when a new student is added
    """
    # Update overall cache
    invalidate_dashboard_cache(academic_year_id)
    
    # Update standard-specific cache if applicable
    if standard_id:
        invalidate_dashboard_cache(academic_year_id, standard_id)
    
    # Update student-specific cache
    if student_id:
        invalidate_dashboard_cache(academic_year_id, standard_id, student_id)


def update_dashboard_on_adjustment(academic_year_id, standard_id=None, student_id=None):
    """
    Update dashboard cache when adjustment is given
    """
    invalidate_dashboard_cache(academic_year_id, standard_id, student_id)


def update_dashboard_on_concession(academic_year_id, standard_id=None, student_id=None):
    """
    Update dashboard cache when concession is given
    """
    invalidate_dashboard_cache(academic_year_id, standard_id, student_id)


def update_dashboard_on_fee_collection(academic_year_id, standard_id=None, student_id=None):
    """
    Update dashboard cache when fee is collected
    """
    invalidate_dashboard_cache(academic_year_id, standard_id, student_id)


def update_dashboard_on_student_deleted(academic_year_id, standard_id=None, student_id=None):
    """
    Update dashboard cache when student is deleted
    """
    invalidate_dashboard_cache(academic_year_id, standard_id, student_id)


def cleanup_duplicate_cache_entries():
    """
    Utility function to clean up duplicate FinanceDashboardCache entries.
    Keeps the most recent entry for each unique combination of academic_year, standard, and student.
    """
    import logging
    from django.db.models import Count
    logger = logging.getLogger(__name__)
    
    try:
        # Find all duplicate cache entries
        duplicates = FinanceDashboardCache.objects.values(
            'academic_year', 'standard', 'student'
        ).annotate(
            count=Count('id')
        ).filter(count__gt=1)
        
        total_deleted = 0
        
        for dup in duplicates:
            cache_params = {
                'academic_year_id': dup['academic_year'],
                'is_active': True
            }
            
            if dup['standard']:
                cache_params['standard_id'] = dup['standard']
            else:
                cache_params['standard__isnull'] = True
            
            if dup['student']:
                cache_params['student_id'] = dup['student']
            else:
                cache_params['student__isnull'] = True
            
            # Get all entries for this combination, ordered by most recent
            caches = FinanceDashboardCache.objects.filter(**cache_params).order_by('-last_calculated', '-created')
            
            # Keep the first (most recent), delete the rest
            cache_to_keep = caches.first()
            if cache_to_keep and caches.count() > 1:
                # Get IDs of duplicates to delete (excluding the one we're keeping)
                duplicate_ids = list(caches.exclude(id=cache_to_keep.id).values_list('id', flat=True))
                if duplicate_ids:
                    deleted_count = FinanceDashboardCache.objects.filter(id__in=duplicate_ids).delete()[0]
                    total_deleted += deleted_count
                    logger.info(f"Deleted {deleted_count} duplicate cache entries for academic_year={dup['academic_year']}, standard={dup['standard']}, student={dup['student']}")
        
        if total_deleted > 0:
            logger.info(f"Cleanup completed: Deleted {total_deleted} duplicate cache entries total")
        else:
            logger.info("No duplicate cache entries found")
        
        return total_deleted
        
    except Exception as e:
        logger.error(f"Error cleaning up duplicate cache entries: {str(e)}", exc_info=True)
        raise

