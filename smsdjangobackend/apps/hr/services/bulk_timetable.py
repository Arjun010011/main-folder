"""
Bulk Timetable Assignment Service
This service handles bulk assignment of timetables across multiple standards
"""
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from apps.hr.models.timeTable import Period, PeriodPlan, PeriodDayMapping, Day, TimeTableSchedule, TimeTableScheduleParent
from apps.classes.models import StandardSectionMapping, Subject
from apps.hr.models import TimeTableDateRange
from apps.staffs.models import Staff
from apps.shared.services import SharedService
from apps.tenants.services.middlewares import get_current_db_name
from apps.hr.serializers import TimeTableScheduleSerializer


def bulk_timetable_assignment(self, data):
    """
    Bulk assign timetable for multiple standards at once
    
    Expected data structure:
    {
        'academic_year': int,
        'date_range': int,
        'period_plan': int,
        'assignments': [
            {
                'standard_section': int,
                'assignments': [
                    {
                        'period_day_mapping': int,
                        'staff': int,
                        'subject': int
                    }
                ]
            }
        ]
    }
    """
    response = {'Reason': 'Bulk Timetable Assignment Completed Successfully', 'data': {}}
    
    academic_year = data.get('academic_year')
    date_range_id = data.get('date_range')
    period_plan_id = data.get('period_plan')
    assignments = data.get('assignments', [])
    
    if not academic_year or not date_range_id or not period_plan_id:
        raise ValidationError('academic_year, date_range, and period_plan are mandatory')
    
    if not assignments:
        raise ValidationError('No assignments provided')
    
    # Validate date range exists
    date_range = TimeTableDateRange.objects.filter(id=date_range_id, academic_year=academic_year).first()
    if not date_range:
        raise ValidationError('Invalid date range for the academic year')
    
    # Validate period plan exists
    period_plan = PeriodPlan.objects.filter(id=period_plan_id, academic_year=academic_year).first()
    if not period_plan:
        raise ValidationError('Invalid period plan for the academic year')
    
    success_count = 0
    error_count = 0
    errors = []
    
    # Track period_day_mapping assignments across all standard sections to prevent conflicts
    period_day_mapping_assignments = {}  # {period_day_mapping_id: [standard_section_ids]}
    
    # First pass: Check for conflicts before saving
    for standard_assignment in assignments:
        standard_section_id = standard_assignment.get('standard_section')
        if not standard_section_id:
            continue
        
        period_assignments = standard_assignment.get('assignments', [])
        for assignment in period_assignments:
            period_day_mapping_id = assignment.get('period_day_mapping')
            if period_day_mapping_id:
                if period_day_mapping_id not in period_day_mapping_assignments:
                    period_day_mapping_assignments[period_day_mapping_id] = []
                period_day_mapping_assignments[period_day_mapping_id].append(standard_section_id)
    
    # Check for conflicts: same period/day assigned to multiple standard sections
    for period_day_mapping_id, section_ids in period_day_mapping_assignments.items():
        if len(section_ids) > 1:
            # Get section names for error message
            conflicting_sections = StandardSectionMapping.objects.filter(
                id__in=section_ids
            ).select_related('standard', 'section').values('standard__name', 'section__name')
            
            section_names = [f"{s['standard__name']} - {s['section__name']}" for s in conflicting_sections]
            period_obj = PeriodDayMapping.objects.filter(id=period_day_mapping_id).select_related('period', 'day').first()
            
            if period_obj:
                error_msg = f"Period '{period_obj.period.name}' on '{period_obj.day.name}' is assigned to multiple standard sections: {', '.join(section_names)}. Each standard section must have unique period assignments."
                errors.append(error_msg)
                error_count += len(section_ids)
    
    # If there are conflicts, return early
    if errors:
        response['data'] = {
            'success_count': 0,
            'error_count': error_count,
            'errors': errors
        }
        return response
    
    with transaction.atomic(using=get_current_db_name()):
        for standard_assignment in assignments:
            standard_section_id = standard_assignment.get('standard_section')
            if not standard_section_id:
                error_count += 1
                errors.append('Standard section is missing in one of the assignments')
                continue
            
            # Validate standard section exists
            standard_section = StandardSectionMapping.objects.filter(
                id=standard_section_id,
                academic_year=academic_year
            ).first()
            
            if not standard_section:
                error_count += 1
                errors.append(f'Standard section {standard_section_id} not found')
                continue
            
            # Get or create schedule parent
            schedule_parent, created = TimeTableScheduleParent.objects.get_or_create(
                date_range_id=date_range_id,
                period_plan_id=period_plan_id,
                standard_section_id=standard_section_id,
                defaults={}
            )
            
            # Process assignments for this standard section
            period_assignments = standard_assignment.get('assignments', [])
            
            for assignment in period_assignments:
                period_day_mapping_id = assignment.get('period_day_mapping')
                staff_id = assignment.get('staff')
                subject_id = assignment.get('subject')
                
                if not period_day_mapping_id:
                    error_count += 1
                    errors.append(f'Period day mapping missing for standard section {standard_section_id}')
                    continue
                
                if not staff_id and not subject_id:
                    error_count += 1
                    errors.append(f'Staff or Subject required for period {period_day_mapping_id}')
                    continue
                
                # Validate period day mapping belongs to the period plan
                period_day_mapping = PeriodDayMapping.objects.filter(
                    id=period_day_mapping_id,
                    period__period_plan_id=period_plan_id
                ).first()
                
                if not period_day_mapping:
                    error_count += 1
                    errors.append(f'Period day mapping {period_day_mapping_id} not found in period plan')
                    continue
                
                # Check if this period_day_mapping is already assigned to another standard section
                # (prevent two classes from sharing the same period)
                conflicting_schedule = TimeTableSchedule.objects.filter(
                    period_day_mapping_id=period_day_mapping_id,
                    is_active=True,
                    time_table_schedule_parent__date_range_id=date_range_id,
                    time_table_schedule_parent__period_plan_id=period_plan_id
                ).exclude(
                    time_table_schedule_parent__standard_section_id=standard_section_id
                ).select_related('time_table_schedule_parent__standard_section__standard', 
                                'time_table_schedule_parent__standard_section__section',
                                'period_day_mapping__period',
                                'period_day_mapping__day').first()
                
                if conflicting_schedule:
                    conflict_parent = conflicting_schedule.time_table_schedule_parent
                    conflict_std = conflict_parent.standard_section
                    period_obj = conflicting_schedule.period_day_mapping
                    error_msg = f"Period '{period_obj.period.name}' on '{period_obj.day.name}' is already assigned to {conflict_std.standard.name} - {conflict_std.section.name}. Cannot assign the same period to multiple standard sections."
                    error_count += 1
                    errors.append(error_msg)
                    continue
                
                # Check if assignment already exists for this standard section
                existing_schedule = TimeTableSchedule.objects.filter(
                    time_table_schedule_parent=schedule_parent,
                    period_day_mapping_id=period_day_mapping_id,
                    is_active=True
                ).first()
                
                schedule_data = {
                    'time_table_schedule_parent': schedule_parent.id,
                    'period_day_mapping': period_day_mapping_id,
                    'staff': staff_id,
                    'subject': subject_id,
                    'is_active': True
                }
                
                try:
                    if existing_schedule:
                        # Update existing
                        serializer = TimeTableScheduleSerializer(
                            instance=existing_schedule,
                            data=schedule_data
                        )
                    else:
                        # Create new
                        serializer = TimeTableScheduleSerializer(data=schedule_data)
                    
                    serializer.is_valid(raise_exception=True)
                    serializer.save()
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append(f'Error assigning {period_day_mapping_id} to {standard_section_id}: {str(e)}')
    
    response['data'] = {
        'success_count': success_count,
        'error_count': error_count,
        'errors': errors
    }
    
    return response


def get_bulk_timetable_data(self, request):
    """
    Get data needed for bulk timetable assignment UI
    Returns standards, sections, periods, days, staff, subjects
    """
    academic_year = request.GET.get('academic_year')
    date_range_id = request.GET.get('date_range')
    period_plan_id = request.GET.get('period_plan')
    
    if not academic_year:
        raise ValidationError('academic_year is mandatory')
    
    response_data = {}
    
    # Get standards and sections
    from apps.classes.services.standard import get_standard_and_section
    standard_section_data = get_standard_and_section(self, academic_year)
    response_data['standards'] = standard_section_data['data']
    
    # Get periods and days if period_plan is provided
    if period_plan_id:
        # Get periods and sort by their earliest start time across all days
        # This ensures periods are in chronological order
        from django.db.models import Min
        periods = Period.objects.filter(
            period_plan_id=period_plan_id,
            is_break=False
        ).annotate(
            earliest_start_time=Min('perioddaymapping_period__start_time')
        ).order_by('earliest_start_time', 'id').values('id', 'name')
        
        days = Day.objects.filter(is_active=True).order_by('id').values('id', 'name')
        
        period_day_mappings = PeriodDayMapping.objects.filter(
            period__period_plan_id=period_plan_id,
            period__is_break=False
        ).select_related('period', 'day').order_by(
            'period__id', 'day__id'
        ).values(
            'id', 'period__id', 'period__name', 'period__is_break', 'day__id', 'day__name',
            'start_time', 'end_time'
        )
        
        # Convert time fields to strings
        for pdm in period_day_mappings:
            if pdm.get('start_time'):
                pdm['start_time'] = pdm['start_time'].strftime('%H:%M:%S') if hasattr(pdm['start_time'], 'strftime') else str(pdm['start_time'])
            if pdm.get('end_time'):
                pdm['end_time'] = pdm['end_time'].strftime('%H:%M:%S') if hasattr(pdm['end_time'], 'strftime') else str(pdm['end_time'])
        
        response_data['periods'] = list(periods)
        response_data['days'] = list(days)
        response_data['period_day_mappings'] = list(period_day_mappings)
    else:
        response_data['periods'] = []
        response_data['days'] = []
        response_data['period_day_mappings'] = []
    
    # Get staff and subjects if date_range is provided
    if date_range_id:
        # Get staff subject mapping
        # StaffHourSubjectMapping -> staff_teaching_hour -> academic_year
        from apps.hr.models import StaffHourSubjectMapping, StaffTeachingHour, TimeTableSchedule
        import datetime
        
        staff_subject_mapping = StaffHourSubjectMapping.objects.filter(
            staff_teaching_hour__academic_year=academic_year
        ).select_related('staff_teaching_hour__staff', 'subject', 'staff_teaching_hour').values(
            'staff_teaching_hour__staff__id', 
            'staff_teaching_hour__staff__first_name', 
            'staff_teaching_hour__staff__middle_name', 
            'staff_teaching_hour__staff__last_name',
            'subject__id', 
            'subject__name',
            'staff_teaching_hour__id',
            'staff_teaching_hour__max_hour'
        )
        
        # Get allocated hours for each staff from existing timetable schedules
        # Get all schedule parents for this date range
        schedule_parents = TimeTableScheduleParent.objects.filter(
            date_range_id=date_range_id
        ).values_list('id', flat=True)
        
        # Get all existing schedules for these parents
        existing_schedules = TimeTableSchedule.objects.filter(
            time_table_schedule_parent__in=schedule_parents,
            is_active=True,
            staff__isnull=False
        ).select_related('period_day_mapping', 'staff').values(
            'staff__id',
            'period_day_mapping__start_time',
            'period_day_mapping__end_time'
        )
        
        # Calculate allocated hours per staff
        staff_allocated_hours = {}
        time_format = "%H:%M:%S"
        for schedule in existing_schedules:
            staff_id = schedule['staff__id']
            if not staff_id:
                continue
            if staff_id not in staff_allocated_hours:
                staff_allocated_hours[staff_id] = 0
            
            if schedule['period_day_mapping__start_time'] and schedule['period_day_mapping__end_time']:
                start_time = datetime.datetime.strptime(
                    schedule['period_day_mapping__start_time'].strftime(time_format), 
                    time_format
                )
                end_time = datetime.datetime.strptime(
                    schedule['period_day_mapping__end_time'].strftime(time_format), 
                    time_format
                )
                minutes = round((end_time - start_time).total_seconds() / 60)
                staff_allocated_hours[staff_id] += minutes
        
        # Convert minutes to hours:minutes format
        def minutes_to_hours_minutes(minutes):
            hours = minutes // 60
            mins = minutes % 60
            return f"{hours:02d}:{mins:02d}"
        
        # Rename fields to match frontend expectations and add allocated hours
        formatted_mapping = []
        for mapping in staff_subject_mapping:
            staff_id = mapping['staff_teaching_hour__staff__id']
            allocated_minutes = staff_allocated_hours.get(staff_id, 0)
            max_hour = mapping.get('staff_teaching_hour__max_hour', '')
            
            formatted_mapping.append({
                'staff__id': staff_id,
                'staff__first_name': mapping['staff_teaching_hour__staff__first_name'],
                'staff__middle_name': mapping['staff_teaching_hour__staff__middle_name'],
                'staff__last_name': mapping['staff_teaching_hour__staff__last_name'],
                'subject__id': mapping['subject__id'],
                'subject__name': mapping['subject__name'],
                'allocated_hours': minutes_to_hours_minutes(allocated_minutes),
                'allocated_minutes': allocated_minutes,
                'max_hour': max_hour,
            })
        
        response_data['staff_subject_mapping'] = formatted_mapping
        
        # Get existing timetable assignments if date_range and period_plan are provided
        if date_range_id and period_plan_id:
            # Get all schedule parents for this date range and period plan
            schedule_parents = TimeTableScheduleParent.objects.filter(
                date_range_id=date_range_id,
                period_plan_id=period_plan_id
            ).select_related('standard_section').values('id', 'standard_section_id')
            
            # Get all existing schedules
            existing_schedules = TimeTableSchedule.objects.filter(
                time_table_schedule_parent__in=[sp['id'] for sp in schedule_parents],
                is_active=True
            ).select_related('staff', 'subject', 'period_day_mapping', 'time_table_schedule_parent').values(
                'time_table_schedule_parent__standard_section_id',
                'period_day_mapping_id',
                'staff_id',
                'subject_id'
            )
            
            # Format existing assignments: {standard_section_id: {period_day_mapping_id: {staff, subject}}}
            existing_assignments = {}
            for schedule in existing_schedules:
                standard_section_id = schedule['time_table_schedule_parent__standard_section_id']
                period_day_mapping_id = schedule['period_day_mapping_id']
                
                if standard_section_id not in existing_assignments:
                    existing_assignments[standard_section_id] = {}
                
                existing_assignments[standard_section_id][period_day_mapping_id] = {
                    'staff': schedule['staff_id'],
                    'subject': schedule['subject_id']
                }
            
            response_data['existing_assignments'] = existing_assignments
        else:
            response_data['existing_assignments'] = {}
    else:
        response_data['staff_subject_mapping'] = []
        response_data['existing_assignments'] = {}
    
    # Always get staff list and subject list for name lookup (needed for displaying existing assignments)
    from apps.staffs.models import Staff
    from apps.shared.services_shared.common import get_full_name
    staff_list = Staff.objects.filter(is_active=True).values(
        'id', 'first_name', 'middle_name', 'last_name'
    )
    # Format staff list with full names
    formatted_staff_list = []
    for staff in staff_list:
        full_name = get_full_name(
            staff.get('first_name', ''),
            staff.get('middle_name', ''),
            staff.get('last_name', '')
        )
        formatted_staff_list.append({
            'id': staff['id'],
            'name': full_name,
            'first_name': staff.get('first_name', ''),
            'middle_name': staff.get('middle_name', ''),
            'last_name': staff.get('last_name', ''),
        })
    response_data['staff_list'] = formatted_staff_list
    
    # Get subject list for name lookup
    from apps.classes.models import Subject
    subject_list = Subject.objects.filter(is_active=True).values('id', 'name')
    response_data['subject_list'] = list(subject_list)
    
    return {'data': response_data}

