"""
Finance Dashboard View Service
Uses cached data from database (FinanceDashboardCache) when available
Recalculates and updates cache if needed
"""
from apps.finance.models.finance_dashboard import FinanceDashboardCache
from apps.finance.services.finance_dashboard import calculate_dashboard_cache
from rest_framework import exceptions
from decimal import Decimal


def get_finance_dashboard(self):
    """
    Get finance dashboard data from cache (stored in database)
    If cache doesn't exist or needs update, recalculate and store it
    """
    import logging
    logger = logging.getLogger(__name__)
    
    academic_year_id = self.request.GET.get('academic_year')
    standard_id = self.request.GET.get('standard')
    student_id = self.request.GET.get('student')
    
    # Handle empty string or None
    if not academic_year_id or academic_year_id == '':
        raise exceptions.ValidationError('academic_year is required')
    
    # Convert to int if it's a string
    try:
        academic_year_id = int(academic_year_id)
    except (ValueError, TypeError):
        raise exceptions.ValidationError('academic_year must be a valid integer')
    
    # Convert standard_id and student_id to int if provided
    if standard_id:
        try:
            standard_id = int(standard_id)
        except (ValueError, TypeError):
            standard_id = None
    else:
        standard_id = None
    
    if student_id:
        try:
            student_id = int(student_id)
        except (ValueError, TypeError):
            student_id = None
    else:
        student_id = None
    
    try:
        # Check if force recalculation is requested
        force_recalculate = self.request.GET.get('force_recalculate', '0') == '1'
        
        # First, try to get existing cache if not forcing recalculation
        if not force_recalculate:
            try:
                from apps.institutes.models.academicYear import AcademicYear
                academic_year = AcademicYear.objects.get(id=academic_year_id)
                
                cache_params = {'academic_year': academic_year, 'is_active': True}
                if standard_id:
                    from apps.classes.models.standard import Standard
                    try:
                        standard = Standard.objects.get(id=standard_id)
                        cache_params['standard'] = standard
                    except Standard.DoesNotExist:
                        pass
                else:
                    cache_params['standard__isnull'] = True
                
                if student_id:
                    from apps.students.models.student import Student
                    try:
                        student = Student.objects.get(id=student_id)
                        cache_params['student'] = student
                    except Student.DoesNotExist:
                        pass
                else:
                    cache_params['student__isnull'] = True
                
                existing_cache = FinanceDashboardCache.objects.filter(**cache_params).order_by('-last_calculated').first()
                if existing_cache:
                    logger.info(f"Returning existing cached finance dashboard data (last calculated: {existing_cache.last_calculated})")
                    monthly_collection_data = existing_cache.monthly_collection or {}
                    return {
                        'data': {
                            'total_students': existing_cache.total_students,
                            'total_fee_amount': float(existing_cache.total_fee_amount),
                            'total_collected': float(existing_cache.total_collected),
                            'total_pending': float(existing_cache.total_pending),
                            'total_adjustment': float(existing_cache.total_adjustment),
                            'total_concession': float(existing_cache.total_concession),
                            'fee_type_breakdown': existing_cache.fee_type_breakdown or {},
                            'payment_mode_breakdown': existing_cache.payment_mode_breakdown or {},
                            'monthly_collection': monthly_collection_data.get('monthly_collection', {}),
                            'term_breakdown': monthly_collection_data.get('term_breakdown', {}),
                            'standard_breakdown': monthly_collection_data.get('standard_breakdown', {}),
                            'fee_type_detailed': monthly_collection_data.get('fee_type_detailed', {}),
                            'pending_breakdown': monthly_collection_data.get('pending_breakdown', {}),
                            'area_wise_pending': monthly_collection_data.get('area_wise_pending', {}),
                            'last_calculated': existing_cache.last_calculated.isoformat() if existing_cache.last_calculated else None,
                        }
                    }
            except Exception as cache_error:
                logger.warning(f"Error retrieving existing cache: {str(cache_error)}, will calculate new cache")
        
        # Calculate/update cache (this will get or create and update the cache entry)
        logger.info(f"Starting finance dashboard calculation for academic_year={academic_year_id}, standard={standard_id}, student={student_id}, force_recalculate={force_recalculate}")
        cache = calculate_dashboard_cache(academic_year_id, standard_id, student_id, force_recalculate=force_recalculate)
        logger.info(f"Finance dashboard calculation completed successfully")
        
        # Extract data from cache
        monthly_collection_data = cache.monthly_collection or {}
        
        # Return cached data
        return {
            'data': {
                'total_students': cache.total_students,
                'total_fee_amount': float(cache.total_fee_amount),
                'total_collected': float(cache.total_collected),
                'total_pending': float(cache.total_pending),
                'total_adjustment': float(cache.total_adjustment),
                'total_concession': float(cache.total_concession),
                'fee_type_breakdown': cache.fee_type_breakdown or {},
                'payment_mode_breakdown': cache.payment_mode_breakdown or {},
                'monthly_collection': monthly_collection_data.get('monthly_collection', {}),
                'term_breakdown': monthly_collection_data.get('term_breakdown', {}),
                'standard_breakdown': monthly_collection_data.get('standard_breakdown', {}),
                'fee_type_detailed': monthly_collection_data.get('fee_type_detailed', {}),
                'pending_breakdown': monthly_collection_data.get('pending_breakdown', {}),
                'area_wise_pending': monthly_collection_data.get('area_wise_pending', {}),
                'last_calculated': cache.last_calculated.isoformat() if cache.last_calculated else None,
            }
        }
    except exceptions.ValidationError:
        # Re-raise validation errors as-is
        raise
    except Exception as e:
        logger.error(f"Error calculating finance dashboard: {str(e)}", exc_info=True)
        # Try to return any existing cache as fallback
        try:
            from apps.institutes.models.academicYear import AcademicYear
            academic_year = AcademicYear.objects.get(id=academic_year_id)
            cache_params = {'academic_year': academic_year, 'is_active': True}
            if standard_id:
                cache_params['standard_id'] = standard_id
            else:
                cache_params['standard__isnull'] = True
            if student_id:
                cache_params['student_id'] = student_id
            else:
                cache_params['student__isnull'] = True
            
            fallback_cache = FinanceDashboardCache.objects.filter(**cache_params).order_by('-last_calculated').first()
            if fallback_cache:
                logger.warning(f"Returning fallback cached data due to calculation error")
                monthly_collection_data = fallback_cache.monthly_collection or {}
                return {
                    'data': {
                        'total_students': fallback_cache.total_students,
                        'total_fee_amount': float(fallback_cache.total_fee_amount),
                        'total_collected': float(fallback_cache.total_collected),
                        'total_pending': float(fallback_cache.total_pending),
                        'total_adjustment': float(fallback_cache.total_adjustment),
                        'total_concession': float(fallback_cache.total_concession),
                        'fee_type_breakdown': fallback_cache.fee_type_breakdown or {},
                        'payment_mode_breakdown': fallback_cache.payment_mode_breakdown or {},
                        'monthly_collection': monthly_collection_data.get('monthly_collection', {}),
                        'term_breakdown': monthly_collection_data.get('term_breakdown', {}),
                        'standard_breakdown': monthly_collection_data.get('standard_breakdown', {}),
                        'fee_type_detailed': monthly_collection_data.get('fee_type_detailed', {}),
                        'pending_breakdown': monthly_collection_data.get('pending_breakdown', {}),
                        'area_wise_pending': monthly_collection_data.get('area_wise_pending', {}),
                        'last_calculated': fallback_cache.last_calculated.isoformat() if fallback_cache.last_calculated else None,
                        'warning': f'Using cached data due to calculation error: {str(e)}'
                    }
                }
        except Exception as fallback_error:
            logger.error(f"Error retrieving fallback cache: {str(fallback_error)}")
        
        # Return error response instead of letting it hang
        raise exceptions.APIException(f"Error calculating finance dashboard: {str(e)}")

