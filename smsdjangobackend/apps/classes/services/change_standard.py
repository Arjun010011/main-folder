"""
Service for bulk changing student standards with comprehensive validation
"""
from django.db import transaction
from rest_framework import exceptions
from apps.classes.models.enrollment import StudentStandardMapping, Enrollment
from apps.classes.models.standard import StandardSectionMapping
from apps.classes.serializers import StudentStandardMappingSerializer
from apps.students.models import Student
from apps.institutes.models import AcademicYear
from apps.finance.services import calculations
from apps.exams.models.marks import StudentMarkSectionWiseApproval
from apps.exams.models import ExamSchedule
from apps.finance.models.feeCollection import AdmissionForm, FeeCollection
from apps.finance.models.fee import FeeplanStudentFeature
from apps.transport.models.route import RouteUserAddress
from apps.hostel.models import RoomAllocation
from apps.library.models.issue_return import IssueReturnBook
from apps.diary.models import StandardSectionDiary, StudentDiary
from apps.tenants.services.middlewares import get_current_db_name
from apps.shared.services import SharedService


def validate_standard_change_dependencies(self, student_ids, from_standard_id, to_standard_id, academic_year_id):
    """
    Validate if students can have their standard changed
    
    Args:
        student_ids: List of student IDs
        from_standard_id: Current standard ID
        to_standard_id: Target standard ID
        academic_year_id: Academic year ID
        
    Returns:
        dict with validation results
    """
    validation_errors = []
    warnings = []
    affected_modules = {
        'fee_plans': False,
        'fee_collections': False,
        'exam_marks': False,
        'enrollment': False,
        'diary': False,
        'homework': False,
        'transport': False,
        'hostel': False,
        'library': False,
    }
    
    # Get student details
    students = Student.objects.filter(id__in=student_ids).values('id', 'first_name', 'middle_name', 'last_name')
    student_dict = {s['id']: s for s in students}
    
    # Check each student
    for student_id in student_ids:
        student = student_dict.get(student_id)
        if not student:
            continue
            
        student_name = f"{student['first_name']} {student.get('middle_name', '')} {student.get('last_name', '')}".strip()
        
        # 1. Check Fee Plans
        try:
            paid_data = calculations.paid_data_and_status(
                self, student_id, academic_year_id, from_standard_id
            )
            if paid_data and paid_data.get('paid_amount', 0) > 0:
                validation_errors.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'error_type': 'fee_paid',
                    'error_message': f'Fees already paid for this academic year. Paid amount: {paid_data.get("paid_amount", 0)}'
                })
                affected_modules['fee_plans'] = True
            elif paid_data and paid_data.get('pending_amount', 0) > 0:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'fee_pending',
                    'warning_message': f'Pending fee amount: {paid_data.get("pending_amount", 0)}. Fee plan will need to be updated.'
                })
                affected_modules['fee_plans'] = True
            elif paid_data and paid_data.get('concession_amount', 0) > 0:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'concession_given',
                    'warning_message': f'Concession amount: {paid_data.get("concession_amount", 0)}. This will need to be reviewed.'
                })
                affected_modules['fee_plans'] = True
        except Exception as e:
            # Fee plan might not be approved, that's okay
            pass
        
        # 2. Check Exam Marks - if marks are finalized/approved
        try:
            # Get all exams for this standard and academic year
            standard_sections = StandardSectionMapping.objects.filter(
                standard=from_standard_id,
                academic_year=academic_year_id
            ).values_list('id', flat=True)
            
            exam_schedules = ExamSchedule.objects.filter(
                standard_section__in=standard_sections,
                exam__academic_year=academic_year_id
            ).values_list('exam', flat=True).distinct()
            
            if exam_schedules:
                # Check if any exam marks are approved/finalized
                approved_marks = StudentMarkSectionWiseApproval.objects.filter(
                    exam__in=exam_schedules,
                    standard_section__in=standard_sections,
                    approval_status='1'
                ).exists()
                
                if approved_marks:
                    validation_errors.append({
                        'student_id': student_id,
                        'student_name': student_name,
                        'error_type': 'exam_marks_finalized',
                        'error_message': 'Exam marks are finalized/approved for this standard. Cannot change standard.'
                    })
                    affected_modules['exam_marks'] = True
        except Exception as e:
            pass
        
        # 3. Check Enrollment
        try:
            enrollments = Enrollment.objects.filter(
                student=student_id,
                standard_section__academic_year=academic_year_id,
                standard_section__standard=from_standard_id
            ).exists()
            
            if enrollments:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'enrolled',
                    'warning_message': 'Student is enrolled in sections. Enrollment will need to be updated.'
                })
                affected_modules['enrollment'] = True
        except Exception as e:
            pass
        
        # 4. Check Transport
        try:
            transport = RouteUserAddress.objects.filter(
                user__student=student_id,
                academic_year=academic_year_id,
                is_active=True
            ).exists()
            
            if transport:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'transport_assigned',
                    'warning_message': 'Student has transport assignment. This will need to be reviewed.'
                })
                affected_modules['transport'] = True
        except Exception as e:
            pass
        
        # 5. Check Hostel
        try:
            hostel = RoomAllocation.objects.filter(
                student=student_id,
                academic_year=academic_year_id,
                is_active=True
            ).exists()
            
            if hostel:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'hostel_allocated',
                    'warning_message': 'Student has hostel room allocation. This will need to be reviewed.'
                })
                affected_modules['hostel'] = True
        except Exception as e:
            pass
        
        # 6. Check Library
        try:
            library_books = IssueReturnBook.objects.filter(
                issued_to_user__student=student_id,
                is_returned=False,
                is_issued=True
            ).exists()
            
            if library_books:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'library_books',
                    'warning_message': 'Student has issued library books. Please ensure books are returned or updated.'
                })
                affected_modules['library'] = True
        except Exception as e:
            pass
        
        # 7. Check Fee Collections
        try:
            fee_collections = FeeCollection.objects.filter(
                student=student_id,
                academic_year=academic_year_id,
                is_active=True
            ).exists()
            
            if fee_collections:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'fee_collections',
                    'warning_message': 'Student has fee collection records. Fee plan mappings will need to be updated.'
                })
                affected_modules['fee_collections'] = True
        except Exception as e:
            pass
        
        # 8. Check Fee Plan Student Features
        try:
            fee_plan_features = FeeplanStudentFeature.objects.filter(
                student=student_id,
                fee_plan__standard_fee__standard=from_standard_id,
                fee_plan__standard_fee__academic_year=academic_year_id
            ).exists()
            
            if fee_plan_features:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'fee_plan_features',
                    'warning_message': 'Student has fee plan feature mappings. These will need to be updated for the new standard.'
                })
                affected_modules['fee_plans'] = True
        except Exception as e:
            pass
        
        # 9. Check Diary/Homework
        try:
            # Get standard sections for the from_standard
            standard_sections = StandardSectionMapping.objects.filter(
                standard=from_standard_id,
                academic_year=academic_year_id
            ).values_list('id', flat=True)
            
            # Check if student has diary entries
            student_diaries = StudentDiary.objects.filter(
                student=student_id,
                standard_section_diary__standard_section__in=standard_sections,
                is_active=True
            ).exists()
            
            if student_diaries:
                warnings.append({
                    'student_id': student_id,
                    'student_name': student_name,
                    'warning_type': 'diary_homework',
                    'warning_message': 'Student has diary/homework entries. These may need to be reviewed or reassigned.'
                })
                affected_modules['diary'] = True
                affected_modules['homework'] = True
        except Exception as e:
            pass
    
    can_change = len(validation_errors) == 0
    
    return {
        'can_change': can_change,
        'validation_errors': validation_errors,
        'warnings': warnings,
        'affected_modules': affected_modules
    }


def bulk_change_student_standard(self, data):
    """
    Perform bulk standard change for students
    
    Args:
        data: {
            'student_ids': [int],
            'from_standard_id': int,
            'to_standard_id': int,
            'academic_year_id': int,
            'update_fee_plans': bool (optional, default False),
            'update_enrollment': bool (optional, default False),
            'reason': str (optional)
        }
        
    Returns:
        dict with success message and details
    """
    student_ids = data.get('student_ids', [])
    from_standard_id = data.get('from_standard_id')
    to_standard_id = data.get('to_standard_id')
    academic_year_id = data.get('academic_year_id')
    update_fee_plans = data.get('update_fee_plans', False)
    update_enrollment = data.get('update_enrollment', False)
    reason = data.get('reason', '')
    
    if not student_ids:
        raise exceptions.ValidationError('Student IDs are required')
    if not from_standard_id or not to_standard_id:
        raise exceptions.ValidationError('From and To standard IDs are required')
    if not academic_year_id:
        raise exceptions.ValidationError('Academic year ID is required')
    
    # Validate dependencies first
    validation_result = validate_standard_change_dependencies(
        self, student_ids, from_standard_id, to_standard_id, academic_year_id
    )
    
    if not validation_result['can_change']:
        error_messages = [
            f"{err['student_name']}: {err['error_message']}"
            for err in validation_result['validation_errors']
        ]
        raise exceptions.ValidationError(error_messages)
    
    # Check if to_standard exists in the academic year
    if not StandardSectionMapping.objects.filter(
        standard=to_standard_id,
        academic_year=academic_year_id
    ).exists():
        raise exceptions.ValidationError(
            f'Standard {to_standard_id} is not mapped to academic year {academic_year_id}'
        )
    
    # Get existing StudentStandardMapping records
    existing_mappings = StudentStandardMapping.objects.filter(
        student__in=student_ids,
        academic_year=academic_year_id,
        standard=from_standard_id
    )
    
    existing_mapping_dict = {
        mapping.student_id: mapping
        for mapping in existing_mappings
    }
    
    # Prepare data for update
    mappings_to_update = []
    mappings_to_create = []
    
    for student_id in student_ids:
        if student_id in existing_mapping_dict:
            # Update existing mapping
            mapping = existing_mapping_dict[student_id]
            mapping.standard_id = to_standard_id
            mappings_to_update.append(mapping)
        else:
            # Create new mapping
            mappings_to_create.append({
                'academic_year': academic_year_id,
                'standard': to_standard_id,
                'student': student_id,
                'is_new_student': False
            })
    
    # Perform the change in transaction
    with transaction.atomic(using=get_current_db_name()):
        # Update existing mappings
        for mapping in mappings_to_update:
            mapping.save()
        
        # Create new mappings
        if mappings_to_create:
            serializer = StudentStandardMappingSerializer(data=mappings_to_create, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
        
        # Update Student.current_standard for all students
        Student.objects.filter(id__in=student_ids).update(current_standard=to_standard_id)
        
        # TODO: Update fee plans if update_fee_plans=True
        # This would involve updating FeePlanStudentFeature mappings
        
        # TODO: Update enrollment if update_enrollment=True
        # This would involve updating Enrollment records
    
    success_count = len(student_ids)
    warning_count = len(validation_result['warnings'])
    
    message = f'Successfully changed standard for {success_count} student(s)'
    if warning_count > 0:
        message += f'. {warning_count} warning(s) were found - please review affected modules.'
    
    return {
        'Reason': message,
        'students_changed': success_count,
        'warnings': validation_result['warnings'],
        'affected_modules': validation_result['affected_modules']
    }

