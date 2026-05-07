"""
Area-wise Pending Report Service
Returns detailed area-wise pending report with student details
"""
from decimal import Decimal
from django.db.models import Sum, Q
from rest_framework import exceptions
from apps.finance.services.finance_dashboard import _calculate_metrics
from apps.transport.models.route import RouteUserAddress
from apps.finance.models.fee import FeeType, FeeplanStudentFeature, FeePlan, FeeStandardMapping
from apps.students.models.student import Student
from apps.classes.models.enrollment import StudentStandardMapping
from apps.finance.services import calculations
from apps.finance.models.feeCollection import PaymentDetail
import logging

logger = logging.getLogger(__name__)


def get_area_wise_pending_report(self):
    """
    Get area-wise pending report with student details for each area
    """
    academic_year_id = self.request.GET.get('academic_year')
    standard_id = self.request.GET.get('standard')
    area_id = self.request.GET.get('area')
    include_students = self.request.GET.get('include_students', 'true').lower() == 'true'
    
    if not academic_year_id:
        raise exceptions.ValidationError('academic_year is required')
    
    try:
        academic_year_id = int(academic_year_id)
    except (ValueError, TypeError):
        raise exceptions.ValidationError('academic_year must be a valid integer')
    
    if standard_id:
        try:
            standard_id = int(standard_id)
        except (ValueError, TypeError):
            standard_id = None
    else:
        standard_id = None
    
    if area_id:
        try:
            area_id = int(area_id)
        except (ValueError, TypeError):
            area_id = None
    else:
        area_id = None
    
    # Get transport fee type
    transport_fee_type = FeeType.objects.filter(codename='transport').first()
    if not transport_fee_type:
        transport_fee_type = FeeType.objects.filter(
            Q(name__iexact='transport fee') | Q(name__iexact='transport')
        ).first()
    
    if not transport_fee_type:
        return {
            'data': {
                'areas': [],
                'summary': {
                    'total_areas': 0,
                    'total_students': 0,
                    'total_fee': 0,
                    'total_paid': 0,
                    'total_pending': 0
                }
            }
        }
    
    # Get all students with transport area assignments - optimize with select_related and prefetch_related
    transport_students_with_address = RouteUserAddress.objects.filter(
        academic_year_id=academic_year_id,
        is_active=True,
        user__student__isnull=False,
        user__student__is_active=True
    ).select_related('area', 'user', 'user__student')
    
    if area_id:
        transport_students_with_address = transport_students_with_address.filter(
            area_id=area_id
        )
    
    if standard_id:
        transport_students_with_address = transport_students_with_address.filter(
            user__student__standard_student__standard_id=standard_id,
            user__student__standard_student__academic_year_id=academic_year_id
        )
    
    # Create mapping of student_id -> area_name and get student IDs in one pass
    student_area_mapping = {}
    all_student_ids = []
    for route_address in transport_students_with_address:
        student_id = route_address.user.student_id
        if student_id and student_id not in student_area_mapping:
            area_name = route_address.area.name if route_address.area else 'Not Assigned'
            student_area_mapping[student_id] = area_name
            all_student_ids.append(student_id)
    
    # Process students and group by area
    area_wise_data = {}
    
    # Batch fetch students and their standard mappings to reduce queries
    students = Student.objects.filter(
        id__in=all_student_ids,
        is_active=True
    ).select_related()
    
    student_standard_mappings = StudentStandardMapping.objects.filter(
        student_id__in=all_student_ids,
        academic_year_id=academic_year_id
    ).select_related('standard')
    
    # Create mapping of student_id -> standard_id
    student_standard_map = {}
    for mapping in student_standard_mappings:
        student_standard_map[mapping.student_id] = mapping
    
    # Create mock self for fee_calculation (reuse for all students)
    class MockGroupsQueryset:
        def values(self, *args, **kwargs):
            return []
    
    class MockGroups:
        def all(self):
            return MockGroupsQueryset()
    
    class MockUser:
        def __init__(self):
            self.id = 1
            self.is_superuser = True
            self.groups = MockGroups()
    
    class MockRequest:
        def __init__(self):
            self.GET = {}
            self.user = MockUser()
    
    class MockSelf:
        def __init__(self):
            self.request = MockRequest()
    
    mock_self = MockSelf()
    
    # Create student lookup dictionary
    student_dict = {student.id: student for student in students}
    
    # Import serializer at module level to avoid repeated imports
    from apps.students.serializers import StudentListSerializer
    
    # Process students in batches to avoid memory issues
    batch_size = 50
    total_processed = 0
    
    for i in range(0, len(all_student_ids), batch_size):
        batch_student_ids = all_student_ids[i:i + batch_size]
        
        for student_id in batch_student_ids:
            try:
                # Get student from dictionary instead of querying
                student = student_dict.get(student_id)
                if not student:
                    continue
                
                area_name = student_area_mapping.get(student_id, 'Not Assigned')
                
                # Get student's standard from pre-fetched mapping
                student_standard_mapping = student_standard_map.get(student_id)
                
                if not student_standard_mapping:
                    continue
                
                std_id = student_standard_mapping.standard_id
                
                # Calculate fee for this student
                fee_data = calculations.fee_calculation(
                    mock_self, student.id, academic_year_id, std_id, returnValue=True, termDivision=True
                )
                
                # Calculate transport fee amounts
                transport_fee_pending = Decimal('0')
                transport_fee_paid = Decimal('0')
                transport_fee_total = Decimal('0')
                
                if fee_data and isinstance(fee_data, dict):
                    if 'data' in fee_data:
                        for fee_item in fee_data['data']:
                            if fee_item.get('codename') == 'transport':
                                # Get area name from fee calculation if not already set
                                if not area_name or area_name == 'Not Assigned':
                                    if fee_item.get('areaname'):
                                        area_name = fee_item.get('areaname')
                                    elif 'standard_fee' in fee_item:
                                        for term in fee_item['standard_fee']:
                                            if term.get('areaname'):
                                                area_name = term.get('areaname')
                                                break
                                
                                # Sum transport fee amounts from all terms
                                if 'standard_fee' in fee_item:
                                    for term in fee_item['standard_fee']:
                                        if term.get('is_disabled'):
                                            continue
                                        transport_fee_total += Decimal(str(term.get('total_amount', 0) or term.get('amount', 0) or 0))
                                        transport_fee_paid += Decimal(str(term.get('paid_amount', 0) or 0))
                                        transport_fee_pending += Decimal(str(term.get('pending_amount', 0) or 0))
                                else:
                                    transport_fee_total += Decimal(str(fee_item.get('total_amount', 0) or 0))
                                    transport_fee_paid += Decimal(str(fee_item.get('total_paid_amount', 0) or 0))
                                    transport_fee_pending += Decimal(str(fee_item.get('pending_amount', 0) or 0))
                
                # Initialize area if not exists
                if area_name not in area_wise_data:
                    area_wise_data[area_name] = {
                        'area_name': area_name,
                        'student_count': 0,
                        'total_pending': Decimal('0'),
                        'total_paid': Decimal('0'),
                        'total_fee': Decimal('0'),
                        'students': []
                    }
                
                # Add student to area
                area_wise_data[area_name]['student_count'] += 1
                area_wise_data[area_name]['total_pending'] += transport_fee_pending
                area_wise_data[area_name]['total_paid'] += transport_fee_paid
                area_wise_data[area_name]['total_fee'] += transport_fee_total
                
                # Add student details only if requested (to improve performance)
                if include_students:
                    student_serializer = StudentListSerializer(student)
                    area_wise_data[area_name]['students'].append({
                        'student': student_serializer.data,
                        'transport_fee_total': float(transport_fee_total),
                        'transport_fee_paid': float(transport_fee_paid),
                        'transport_fee_pending': float(transport_fee_pending),
                        'standard_name': student_standard_mapping.standard.name if student_standard_mapping.standard else 'N/A'
                    })
                else:
                    # Just track counts without student details for faster processing
                    pass
                
                total_processed += 1
                
            except Exception as e:
                logger.error(f"Error processing student {student_id}: {str(e)}", exc_info=True)
                continue
        
        # Log progress for large datasets
        if len(all_student_ids) > 100:
            logger.info(f"Processed {min(i + batch_size, len(all_student_ids))}/{len(all_student_ids)} students")
        
        # Log progress for large datasets
        if len(all_student_ids) > 100:
            logger.info(f"Processed {min(i + batch_size, len(all_student_ids))}/{len(all_student_ids)} students")
    
    logger.info(f"Total students processed: {total_processed}/{len(all_student_ids)}")
    
    # Convert to list and calculate summary
    areas_list = []
    total_students = 0
    total_fee = Decimal('0')
    total_paid = Decimal('0')
    total_pending = Decimal('0')
    
    for area_name, area_data in area_wise_data.items():
        areas_list.append({
            'area_name': area_name,
            'student_count': area_data['student_count'],
            'total_fee': float(area_data['total_fee']),
            'total_paid': float(area_data['total_paid']),
            'total_pending': float(area_data['total_pending']),
            'students': area_data['students']
        })
        total_students += area_data['student_count']
        total_fee += area_data['total_fee']
        total_paid += area_data['total_paid']
        total_pending += area_data['total_pending']
    
    return {
        'data': {
            'areas': areas_list,
            'summary': {
                'total_areas': len(areas_list),
                'total_students': total_students,
                'total_fee': float(total_fee),
                'total_paid': float(total_paid),
                'total_pending': float(total_pending)
            }
        }
    }

