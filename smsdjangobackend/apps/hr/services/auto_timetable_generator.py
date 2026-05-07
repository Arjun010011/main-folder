"""
Automated Timetable Generation System (ATGS)
This service handles automatic generation of timetables based on constraints
"""
import random
from django.db import transaction
from django.db.models import Q, Count, Min
from rest_framework.exceptions import ValidationError
from apps.hr.models.timeTable import (
    Period, PeriodPlan, PeriodDayMapping, Day, 
    TimeTableSchedule, TimeTableScheduleParent
)
from apps.classes.models import StandardSectionMapping, Subject
from apps.hr.models import TimeTableDateRange, StaffTeachingHour, StaffHourSubjectMapping
from apps.staffs.models import Staff
from apps.shared.services_shared.common import get_full_name


class TimetableGenerator:
    """
    Automated Timetable Generator with Constraint Engine
    """
    
    def __init__(self, academic_year, date_range_id, period_plan_id, standard_sections, constraints=None, subject_filters=None):
        self.academic_year = academic_year
        self.date_range_id = date_range_id
        self.period_plan_id = period_plan_id
        self.standard_sections = standard_sections
        # Optional constraint toggles
        self.constraints = constraints or {}
        # Optional subject filters: {standard_section_id: [subject_id, ...]}
        self.subject_filters = subject_filters or {}
        
        # Load data
        self.date_range = TimeTableDateRange.objects.filter(
            id=date_range_id, academic_year=academic_year
        ).first()
        if not self.date_range:
            raise ValidationError('Invalid date range')
        
        self.period_plan = PeriodPlan.objects.filter(
            id=period_plan_id, academic_year=academic_year
        ).first()
        if not self.period_plan:
            raise ValidationError('Invalid period plan')
        
        # Load periods and days
        self.periods = Period.objects.filter(
            period_plan=self.period_plan, is_break=False
        ).annotate(
            earliest_start=Min('perioddaymapping_period__start_time')
        ).order_by('earliest_start', 'name')
        
        self.days = Day.objects.filter(is_active=True).order_by('id')
        
        # Load period-day mappings - only those with valid timing configured
        # Filter out any with NULL timing
        period_day_mappings_qs = PeriodDayMapping.objects.filter(
            period__period_plan=self.period_plan,
            period__is_break=False,
            start_time__isnull=False,
            end_time__isnull=False
        ).select_related('period', 'day').order_by('day__id', 'start_time')
        
        # Filter out any with empty/invalid timing in Python (since TimeField can't filter empty strings)
        # We need to evaluate the queryset and filter in Python to avoid ValidationError on invalid time formats
        valid_mappings = []
        for pdm in period_day_mappings_qs:
            try:
                # Try to access the time fields - if they're invalid, this will raise an error
                # Check if both times exist and are valid
                start_time = pdm.start_time
                end_time = pdm.end_time
                
                if start_time is not None and end_time is not None:
                    # Try to convert to string to ensure they're valid time objects
                    # This will raise ValueError if the time format is invalid
                    str(start_time)
                    str(end_time)
                    valid_mappings.append(pdm)
            except (ValueError, AttributeError, TypeError, ValidationError) as e:
                # Skip invalid timing - log for debugging if needed
                # print(f"Skipping period-day mapping {pdm.id} due to invalid timing: {e}")
                continue
        
        # Store as list since we've filtered it
        self.period_day_mappings = valid_mappings
        
        # Load staff-subject mappings
        self.staff_subject_mappings = StaffHourSubjectMapping.objects.filter(
            staff_teaching_hour__academic_year=academic_year
        ).select_related('staff_teaching_hour__staff', 'subject', 'standard_section')
        
        # Load existing assignments to avoid conflicts
        self.existing_assignments = self._load_existing_assignments()
        
        # Constraint tracking
        self.hard_constraints_violations = []
        self.soft_constraints_score = 0
        
    def _load_existing_assignments(self):
        """Load existing timetable assignments"""
        existing = {}
        parents = TimeTableScheduleParent.objects.filter(
            date_range=self.date_range,
            period_plan=self.period_plan
        ).select_related('standard_section')
        
        for parent in parents:
            schedules = TimeTableSchedule.objects.filter(
                time_table_schedule_parent=parent,
                is_active=True
            ).select_related('staff', 'subject', 'period_day_mapping')
            
            for schedule in schedules:
                key = (
                    parent.standard_section_id,
                    schedule.period_day_mapping_id
                )
                existing[key] = {
                    'staff_id': schedule.staff_id,
                    'subject_id': schedule.subject_id
                }
        
        return existing
    
    def _get_available_staff_subjects(self, standard_section_id, period_day_mapping_id):
        """
        Get available staff-subject combinations for a given slot
        """
        # period_day_mappings is now a list, not a queryset
        period_day = next(
            (pdm for pdm in self.period_day_mappings if pdm.id == period_day_mapping_id),
            None
        )
        
        if not period_day:
            return []
        
        # Skip if timing is not configured (check for None or empty string)
        if not period_day.start_time or not period_day.end_time or \
           str(period_day.start_time).strip() == '' or str(period_day.end_time).strip() == '':
            return []
        
        # Get staff-subject mappings for this standard section
        available = self.staff_subject_mappings.filter(
            Q(standard_section_id=standard_section_id) | Q(standard_section__isnull=True)
        ).select_related('staff_teaching_hour__staff', 'subject')

        # Apply subject filters if provided for this class
        allowed_subject_ids = self.subject_filters.get(int(standard_section_id)) or self.subject_filters.get(str(standard_section_id))
        if allowed_subject_ids:
            available = available.filter(subject_id__in=allowed_subject_ids)
        
        # Filter out staff who are already assigned at this time
        period_day_id = period_day.id
        conflicting_staff_ids = set()
        
        for key, assignment in self.existing_assignments.items():
            if key[1] == period_day_id and key[0] != standard_section_id:
                conflicting_staff_ids.add(assignment['staff_id'])
        
        # Also check in current generation assignments
        for key, assignment in self.current_assignments.items():
            if key[1] == period_day_id and key[0] != standard_section_id:
                conflicting_staff_ids.add(assignment['staff_id'])
        
        result = []
        for mapping in available:
            staff_id = mapping.staff_teaching_hour.staff_id
            if staff_id not in conflicting_staff_ids:
                staff_obj = mapping.staff_teaching_hour.staff
                staff_name = get_full_name(staff_obj.first_name, staff_obj.middle_name, staff_obj.last_name)
                result.append({
                    'staff_id': staff_id,
                    'staff_name': staff_name,
                    'subject_id': mapping.subject_id,
                    'subject_name': mapping.subject.name,
                })
        
        return result
    
    def _check_hard_constraints(self, standard_section_id, period_day_mapping_id, staff_id, subject_id):
        """
        Check hard constraints (must be satisfied)
        Returns: (is_valid, violation_message)
        """
        # period_day_mappings is now a list, not a queryset
        period_day = next(
            (pdm for pdm in self.period_day_mappings if pdm.id == period_day_mapping_id),
            None
        )
        if not period_day:
            return False, "Invalid period-day mapping"
        
        # Skip if timing is not configured (check for None or empty string)
        if not period_day.start_time or not period_day.end_time or \
           str(period_day.start_time).strip() == '' or str(period_day.end_time).strip() == '':
            return False, "Timing not configured for this period-day mapping"
        
        # Constraint 1: Teacher cannot be in two places at once (check current assignments)
        for key, assignment in self.current_assignments.items():
            if key[1] == period_day_mapping_id and key[0] != standard_section_id:
                if assignment['staff_id'] == staff_id:
                    # Get standard section name for better error message
                    try:
                        conflicting_section = StandardSectionMapping.objects.filter(id=key[0]).select_related('standard', 'section').first()
                        section_name = f"{conflicting_section.standard.name} - {conflicting_section.section.name}" if conflicting_section else f"Section {key[0]}"
                    except:
                        section_name = f"Section {key[0]}"
                    return False, f"Teacher already assigned to {section_name} at this time"
        
        # Constraint 1b: Check existing database assignments for staff conflicts
        existing_conflicts = TimeTableSchedule.objects.filter(
            period_day_mapping_id=period_day_mapping_id,
            staff_id=staff_id,
            is_active=True
        ).exclude(
            time_table_schedule_parent__standard_section_id=standard_section_id
        ).select_related('time_table_schedule_parent__standard_section__standard', 'time_table_schedule_parent__standard_section__section').first()
        
        if existing_conflicts:
            section = existing_conflicts.time_table_schedule_parent.standard_section
            section_name = f"{section.standard.name} - {section.section.name}"
            return False, f"Teacher already assigned to {section_name} at this time in existing timetable"
        
        # Constraint 2: Class cannot have two classes at same time (check current assignments)
        for key, assignment in self.current_assignments.items():
            if key[0] == standard_section_id and key[1] == period_day_mapping_id:
                return False, f"Class already has an assignment at this time"
        
        # Constraint 2b: Check existing database assignments for class conflicts
        existing_class_conflicts = TimeTableSchedule.objects.filter(
            time_table_schedule_parent__standard_section_id=standard_section_id,
            period_day_mapping_id=period_day_mapping_id,
            is_active=True
        ).first()
        
        if existing_class_conflicts:
            return False, f"Class already has an assignment at this time in existing timetable"
        
        # Constraint 3: Check if staff is available (from staff teaching hours)
        staff_mapping = self.staff_subject_mappings.filter(
            Q(staff_teaching_hour__staff_id=staff_id) &
            Q(subject_id=subject_id) &
            (Q(standard_section_id=standard_section_id) | Q(standard_section__isnull=True))
        ).first()
        
        if not staff_mapping:
            return False, f"Staff not assigned to teach this subject for this class"
        
        return True, None
    
    def _calculate_soft_constraints_score(self):
        """
        Calculate score based on soft constraints (preferences)
        Higher score = better timetable
        """
        score = 100  # Base score
        
        # Track staff workload
        staff_periods = {}
        for key, assignment in self.current_assignments.items():
            staff_id = assignment['staff_id']
            if staff_id:
                staff_periods[staff_id] = staff_periods.get(staff_id, 0) + 1
        
        # Soft constraint: Distribute staff workload evenly
        if staff_periods and self.constraints.get('spread_staff_load', True):
            max_periods = max(staff_periods.values())
            min_periods = min(staff_periods.values())
            if max_periods > 0:
                balance_ratio = min_periods / max_periods
                score += balance_ratio * 20  # Up to 20 points for balance
        
        # Soft constraint: Avoid consecutive periods for same staff
        if self.constraints.get('avoid_consecutive_periods', True):
            consecutive_penalty = 0
            for staff_id in staff_periods.keys():
                staff_assignments = [
                    (key[0], key[1]) for key, val in self.current_assignments.items()
                    if val['staff_id'] == staff_id
                ]
                if len(staff_assignments) > 1:
                    consecutive_penalty += 5
            score -= consecutive_penalty
        
        # Soft constraint: Distribute subjects across days
        subject_distribution = {}
        for key, assignment in self.current_assignments.items():
            period_day_id = key[1]
            subject_id = assignment['subject_id']
            # period_day_mappings is now a list, not a queryset
            period_day = next(
                (pdm for pdm in self.period_day_mappings if pdm.id == period_day_id),
                None
            )
            if period_day:
                day_name = period_day.day.name
                if subject_id not in subject_distribution:
                    subject_distribution[subject_id] = {}
                subject_distribution[subject_id][day_name] = subject_distribution[subject_id].get(day_name, 0) + 1
        
        # Reward even distribution
        if self.constraints.get('spread_subjects', True):
            for subject_id, days in subject_distribution.items():
                if len(days) > 1:
                    score += 10
        
        return max(0, score)  # Ensure non-negative
    
    def generate_timetable(self, max_iterations=1000, num_drafts=3):
        """
        Generate timetable using constraint-based algorithm
        
        Returns:
            List of draft timetables with scores
        """
        drafts = []
        
        for draft_num in range(num_drafts):
            self.current_assignments = {}
            self.hard_constraints_violations = []
            
            # Generate assignments for each standard section
            for standard_section_id in self.standard_sections:
                # Get all period-day mappings for this standard
                for period_day_mapping in self.period_day_mappings:
                    # Skip if timing is not configured (check for None or empty string)
                    if not period_day_mapping.start_time or not period_day_mapping.end_time or \
                       str(period_day_mapping.start_time).strip() == '' or str(period_day_mapping.end_time).strip() == '':
                        continue
                    
                    period_day_id = period_day_mapping.id
                    key = (standard_section_id, period_day_id)
                    
                    # Skip if already assigned
                    if key in self.current_assignments:
                        continue
                    
                    # Skip if already exists in database
                    if key in self.existing_assignments:
                        self.current_assignments[key] = self.existing_assignments[key]
                        continue
                    
                    # Get available staff-subject combinations
                    available = self._get_available_staff_subjects(
                        standard_section_id, period_day_id
                    )
                    
                    if not available:
                        continue
                    
                    # Try random assignment (can be improved with better algorithm)
                    attempts = 0
                    max_attempts = 10
                    assigned = False
                    
                    while attempts < max_attempts and not assigned:
                        choice = random.choice(available)
                        staff_id = choice['staff_id']
                        subject_id = choice['subject_id']
                        
                        is_valid, violation = self._check_hard_constraints(
                            standard_section_id, period_day_id, staff_id, subject_id
                        )
                        
                        if is_valid:
                            self.current_assignments[key] = {
                                'staff_id': staff_id,
                                'subject_id': subject_id,
                                'staff_name': choice['staff_name'],
                                'subject_name': choice['subject_name'],
                            }
                            assigned = True
                        else:
                            attempts += 1
                    
                    if not assigned and available:
                        # Force assignment if no valid option found
                        choice = random.choice(available)
                        self.current_assignments[key] = {
                            'staff_id': choice['staff_id'],
                            'subject_id': choice['subject_id'],
                            'staff_name': choice['staff_name'],
                            'subject_name': choice['subject_name'],
                        }
            
            # Calculate score
            score = self._calculate_soft_constraints_score()
            
            # Count violations
            violation_count = len(self.hard_constraints_violations)
            
            drafts.append({
                'draft_number': draft_num + 1,
                'assignments': self.current_assignments.copy(),
                'score': score,
                'violations': violation_count,
                'violation_messages': self.hard_constraints_violations.copy()
            })
        
        # Sort by score (highest first)
        drafts.sort(key=lambda x: x['score'], reverse=True)
        
        return drafts
    
    def apply_timetable_draft(self, draft_assignments):
        """
        Apply a generated draft to the database
        """
        with transaction.atomic():
            # Create or get schedule parents for each standard section
            schedule_parents = {}
            for standard_section_id in self.standard_sections:
                parent, created = TimeTableScheduleParent.objects.get_or_create(
                    date_range=self.date_range,
                    period_plan=self.period_plan,
                    standard_section_id=standard_section_id
                )
                schedule_parents[standard_section_id] = parent
            
            # Create schedule entries
            created_count = 0
            updated_count = 0
            
            for (standard_section_id, period_day_mapping_id), assignment in draft_assignments.items():
                parent = schedule_parents[standard_section_id]
                
                # Check if already exists
                existing = TimeTableSchedule.objects.filter(
                    time_table_schedule_parent=parent,
                    period_day_mapping_id=period_day_mapping_id,
                    is_active=True
                ).first()
                
                if existing:
                    # Update existing
                    existing.staff_id = assignment['staff_id']
                    existing.subject_id = assignment['subject_id']
                    existing.save()
                    updated_count += 1
                else:
                    # Create new
                    TimeTableSchedule.objects.create(
                        time_table_schedule_parent=parent,
                        period_day_mapping_id=period_day_mapping_id,
                        staff_id=assignment['staff_id'],
                        subject_id=assignment['subject_id'],
                        is_active=True
                    )
                    created_count += 1
            
            return {
                'created': created_count,
                'updated': updated_count,
                'total': created_count + updated_count
            }


def auto_generate_timetable(request, data):
    """
    Main function to generate timetable automatically
    
    Expected data:
    {
        'academic_year': int,
        'date_range': int,
        'period_plan': int,
        'standard_sections': [int, int, ...],  # List of standard section IDs
        'num_drafts': int (optional, default 3),
        'max_iterations': int (optional, default 1000)
    }
    """
    academic_year = data.get('academic_year')
    date_range_id = data.get('date_range')
    period_plan_id = data.get('period_plan')
    standard_sections = data.get('standard_sections', [])
    num_drafts = data.get('num_drafts', 3)
    max_iterations = data.get('max_iterations', 1000)
    constraints = data.get('constraints', {})
    subject_filters = data.get('subject_filters', {})
    
    if not all([academic_year, date_range_id, period_plan_id]):
        raise ValidationError('academic_year, date_range, and period_plan are mandatory')
    
    if not standard_sections:
        raise ValidationError('At least one standard_section must be provided')
    
    # Initialize generator
    generator = TimetableGenerator(
        academic_year=academic_year,
        date_range_id=date_range_id,
        period_plan_id=period_plan_id,
        standard_sections=standard_sections,
        constraints=constraints,
        subject_filters=subject_filters
    )
    
    # Generate drafts
    drafts = generator.generate_timetable(
        max_iterations=max_iterations,
        num_drafts=num_drafts
    )
    
    # Compute completeness summary (unassigned slots) per draft
    # Recompute valid period_day_mappings like in generator to ensure parity
    valid_period_day_mappings = []
    pdm_qs = PeriodDayMapping.objects.filter(
        period__period_plan_id=period_plan_id,
        period__is_break=False,
        start_time__isnull=False,
        end_time__isnull=False
    ).select_related('period', 'day').order_by('day__id', 'start_time')
    for pdm in pdm_qs:
        try:
            if pdm.start_time is not None and pdm.end_time is not None:
                str(pdm.start_time); str(pdm.end_time)
                valid_period_day_mappings.append(pdm)
        except Exception:
            continue
    total_slots_per_section = len(valid_period_day_mappings)

    # Format response
    formatted_drafts = []
    for draft in drafts:
        # build assignment aggregation
        per_section_counts = {}
        for (section_id, _pdm_id), _val in draft['assignments'].items():
            per_section_counts[section_id] = per_section_counts.get(section_id, 0) + 1
        per_section_summary = []
        total_assigned = 0
        missing_total = 0
        # fetch names for nicer messages
        names_map = {
            s['id']: f"{s['standard__name']} - {s['section__name']}"
            for s in StandardSectionMapping.objects.filter(id__in=standard_sections).select_related('standard','section').values('id','standard__name','section__name')
        }
        for section_id in standard_sections:
            assigned = per_section_counts.get(section_id, 0)
            missing = max(0, total_slots_per_section - assigned)
            total_assigned += assigned
            missing_total += missing
            per_section_summary.append({
                'standard_section': section_id,
                'section_name': names_map.get(section_id, f'Section {section_id}'),
                'assigned': assigned,
                'total_slots': total_slots_per_section,
                'missing': missing,
            })
        unassigned_summary = {
            'total_sections': len(standard_sections),
            'total_slots_per_section': total_slots_per_section,
            'total_assigned': total_assigned,
            'total_missing': missing_total,
            'per_section': per_section_summary,
        }
        formatted_drafts.append({
            'draft_number': draft['draft_number'],
            'score': round(draft['score'], 2),
            'violations': draft['violations'],
            'violation_messages': draft['violation_messages'],
            'unassigned_summary': unassigned_summary,
            'assignments': [
                {
                    'standard_section': key[0],
                    'period_day_mapping': key[1],
                    'staff': val['staff_id'],
                    'subject': val['subject_id'],
                    'staff_name': val.get('staff_name', ''),
                    'subject_name': val.get('subject_name', ''),
                }
                for key, val in draft['assignments'].items()
            ]
        })
    
    return {
        'reason': 'Timetable generation completed',
        'data': {
            'drafts': formatted_drafts,
            'total_drafts': len(formatted_drafts),
            'best_draft': formatted_drafts[0] if formatted_drafts else None
        }
    }


def apply_generated_timetable(request, data):
    """
    Apply a generated draft timetable to the database
    
    Expected data:
    {
        'academic_year': int,
        'date_range': int,
        'period_plan': int,
        'standard_sections': [int, int, ...],
        'draft_assignments': {
            (standard_section_id, period_day_mapping_id): {
                'staff_id': int,
                'subject_id': int
            }
        }
    }
    """
    academic_year = data.get('academic_year')
    date_range_id = data.get('date_range')
    period_plan_id = data.get('period_plan')
    standard_sections = data.get('standard_sections', [])
    draft_assignments = data.get('draft_assignments', {})
    
    if not all([academic_year, date_range_id, period_plan_id]):
        raise ValidationError('academic_year, date_range, and period_plan are mandatory')
    
    if not draft_assignments:
        raise ValidationError('No draft assignments provided')
    
    # Initialize generator
    generator = TimetableGenerator(
        academic_year=academic_year,
        date_range_id=date_range_id,
        period_plan_id=period_plan_id,
        standard_sections=standard_sections
    )
    
    # Convert draft_assignments format
    assignments_dict = {}
    for assignment in draft_assignments:
        key = (
            assignment['standard_section'],
            assignment['period_day_mapping']
        )
        assignments_dict[key] = {
            'staff_id': assignment['staff'],
            'subject_id': assignment['subject']
        }
    
    generator.current_assignments = assignments_dict
    
    # Apply to database
    result = generator.apply_timetable_draft(assignments_dict)
    
    return {
        'reason': 'Timetable applied successfully',
        'data': result
    }

