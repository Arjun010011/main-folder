"""
Timetable View Services
Provides per-teacher, per-room, and per-class timetable views
"""
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from apps.hr.models.timeTable import TimeTableSchedule, TimeTableScheduleParent, PeriodDayMapping
from apps.hr.models import TimeTableDateRange
from apps.staffs.models import Staff
from apps.institutes.models import Room
from apps.classes.models import StandardSectionMapping
from apps.shared.services_shared.common import get_full_name


def get_teacher_timetable(request, teacher_id):
    """
    Get timetable for a specific teacher
    
    Returns:
    {
        'teacher_id': int,
        'teacher_name': str,
        'timetable': [
            {
                'day': str,
                'period': str,
                'start_time': str,
                'end_time': str,
                'subject': str,
                'subject_id': int,
                'class_section': str,
                'class_section_id': int,
            }
        ]
    }
    """
    if not teacher_id:
        raise ValidationError('teacher_id is required')
    
    teacher = Staff.objects.filter(id=teacher_id, is_active=True).first()
    if not teacher:
        raise ValidationError('Teacher not found')
    
    teacher_name = get_full_name(teacher.first_name, teacher.middle_name, teacher.last_name)
    
    # Get all schedules for this teacher
    schedules = TimeTableSchedule.objects.filter(
        staff_id=teacher_id,
        is_active=True
    ).select_related(
        'subject', 'period_day_mapping__period', 'period_day_mapping__day',
        'time_table_schedule_parent__standard_section__standard',
        'time_table_schedule_parent__standard_section__section'
    ).order_by(
        'period_day_mapping__day__id',
        'period_day_mapping__start_time'
    )
    
    timetable = []
    for schedule in schedules:
        if schedule.period_day_mapping and schedule.subject:
            period_day = schedule.period_day_mapping
            standard_section = schedule.time_table_schedule_parent.standard_section
            
            timetable.append({
                'day': period_day.day.name if period_day.day else '',
                'period': period_day.period.name if period_day.period else '',
                'start_time': str(period_day.start_time) if period_day.start_time else '',
                'end_time': str(period_day.end_time) if period_day.end_time else '',
                'subject': schedule.subject.name,
                'subject_id': schedule.subject.id,
                'class_section': f"{standard_section.standard.name} - {standard_section.section.name}",
                'class_section_id': standard_section.id,
            })
    
    return {
        'teacher_id': teacher_id,
        'teacher_name': teacher_name,
        'timetable': timetable
    }


def get_room_timetable(request, room_id):
    """
    Get timetable for a specific room
    
    Note: Currently rooms are not assigned in TimeTableSchedule.
    This is a placeholder for when room assignment is implemented.
    
    Returns:
    {
        'room_id': int,
        'room_name': str,
        'timetable': []
    }
    """
    if not room_id:
        raise ValidationError('room_id is required')
    
    from apps.institutes.models import Room
    room = Room.objects.filter(id=room_id, is_active=True).first()
    if not room:
        raise ValidationError('Room not found')
    
    # TODO: When room assignment is added to TimeTableSchedule, implement this
    # For now, return empty timetable
    return {
        'room_id': room_id,
        'room_name': room.name,
        'timetable': [],
        'message': 'Room assignment not yet implemented in timetable system'
    }


def get_class_timetable(request, class_section_id):
    """
    Get timetable for a specific class/section
    
    Returns:
    {
        'class_section_id': int,
        'class_section_name': str,
        'timetable': [
            {
                'day': str,
                'period': str,
                'start_time': str,
                'end_time': str,
                'subject': str,
                'subject_id': int,
                'teacher': str,
                'teacher_id': int,
            }
        ]
    }
    """
    if not class_section_id:
        raise ValidationError('class_section_id is required')
    
    class_section = StandardSectionMapping.objects.filter(
        id=class_section_id
    ).select_related('standard', 'section').first()
    
    if not class_section:
        raise ValidationError('Class section not found')
    
    class_section_name = f"{class_section.standard.name} - {class_section.section.name}"
    
    # Get schedule parent for this class section
    schedule_parent = TimeTableScheduleParent.objects.filter(
        standard_section_id=class_section_id
    ).first()
    
    if not schedule_parent:
        return {
            'class_section_id': class_section_id,
            'class_section_name': class_section_name,
            'timetable': []
        }
    
    # Get all schedules for this class
    schedules = TimeTableSchedule.objects.filter(
        time_table_schedule_parent=schedule_parent,
        is_active=True
    ).select_related(
        'subject', 'staff', 'period_day_mapping__period', 'period_day_mapping__day'
    ).order_by(
        'period_day_mapping__day__id',
        'period_day_mapping__start_time'
    )
    
    timetable = []
    for schedule in schedules:
        if schedule.period_day_mapping:
            period_day = schedule.period_day_mapping
            teacher_name = ''
            if schedule.staff:
                teacher_name = get_full_name(
                    schedule.staff.first_name,
                    schedule.staff.middle_name,
                    schedule.staff.last_name
                )
            
            timetable.append({
                'day': period_day.day.name if period_day.day else '',
                'period': period_day.period.name if period_day.period else '',
                'start_time': str(period_day.start_time) if period_day.start_time else '',
                'end_time': str(period_day.end_time) if period_day.end_time else '',
                'subject': schedule.subject.name if schedule.subject else '',
                'subject_id': schedule.subject.id if schedule.subject else None,
                'teacher': teacher_name,
                'teacher_id': schedule.staff.id if schedule.staff else None,
            })
    
    return {
        'class_section_id': class_section_id,
        'class_section_name': class_section_name,
        'timetable': timetable
    }


def get_conflict_report(request):
    """
    Get conflict report for all timetables
    
    Returns:
    {
        'teacher_conflicts': [
            {
                'teacher_id': int,
                'teacher_name': str,
                'conflicts': [
                    {
                        'timeslot': str,
                        'conflicting_classes': [str, str]
                    }
                ]
            }
        ],
        'class_conflicts': [
            {
                'class_section_id': int,
                'class_section_name': str,
                'conflicts': [
                    {
                        'timeslot': str,
                        'conflicting_subjects': [str, str]
                    }
                ]
            }
        ],
        'room_conflicts': []  # TODO: When room assignment is implemented
    }
    """
    # Get all active schedules
    schedules = TimeTableSchedule.objects.filter(
        is_active=True
    ).select_related(
        'staff', 'subject', 'period_day_mapping__period', 'period_day_mapping__day',
        'time_table_schedule_parent__standard_section'
    )
    
    # Track teacher conflicts
    teacher_slots = {}  # {(teacher_id, period_day_mapping_id): [class_section_names]}
    teacher_conflicts = {}
    
    # Track class conflicts
    class_slots = {}  # {(class_section_id, period_day_mapping_id): [subject_names]}
    class_conflicts = {}
    
    for schedule in schedules:
        if not schedule.staff or not schedule.period_day_mapping:
            continue
        
        teacher_id = schedule.staff.id
        period_day_id = schedule.period_day_mapping.id
        class_section = schedule.time_table_schedule_parent.standard_section
        class_section_name = f"{class_section.standard.name} - {class_section.section.name}"
        
        # Check teacher conflicts
        key = (teacher_id, period_day_id)
        if key not in teacher_slots:
            teacher_slots[key] = []
        teacher_slots[key].append(class_section_name)
        
        if len(teacher_slots[key]) > 1:
            if teacher_id not in teacher_conflicts:
                teacher_name = get_full_name(
                    schedule.staff.first_name,
                    schedule.staff.middle_name,
                    schedule.staff.last_name
                )
                teacher_conflicts[teacher_id] = {
                    'teacher_id': teacher_id,
                    'teacher_name': teacher_name,
                    'conflicts': []
                }
            
            period_day = schedule.period_day_mapping
            timeslot = f"{period_day.day.name} - {period_day.period.name} ({period_day.start_time} - {period_day.end_time})"
            
            # Check if this conflict already recorded
            existing = next(
                (c for c in teacher_conflicts[teacher_id]['conflicts'] if c['timeslot'] == timeslot),
                None
            )
            if not existing:
                teacher_conflicts[teacher_id]['conflicts'].append({
                    'timeslot': timeslot,
                    'conflicting_classes': teacher_slots[key]
                })
        
        # Check class conflicts
        class_key = (class_section.id, period_day_id)
        if class_key not in class_slots:
            class_slots[class_key] = []
        if schedule.subject:
            class_slots[class_key].append(schedule.subject.name)
        
        if len(class_slots[class_key]) > 1:
            if class_section.id not in class_conflicts:
                class_conflicts[class_section.id] = {
                    'class_section_id': class_section.id,
                    'class_section_name': class_section_name,
                    'conflicts': []
                }
            
            period_day = schedule.period_day_mapping
            timeslot = f"{period_day.day.name} - {period_day.period.name} ({period_day.start_time} - {period_day.end_time})"
            
            existing = next(
                (c for c in class_conflicts[class_section.id]['conflicts'] if c['timeslot'] == timeslot),
                None
            )
            if not existing:
                class_conflicts[class_section.id]['conflicts'].append({
                    'timeslot': timeslot,
                    'conflicting_subjects': class_slots[class_key]
                })
    
    return {
        'teacher_conflicts': list(teacher_conflicts.values()),
        'class_conflicts': list(class_conflicts.values()),
        'room_conflicts': [],  # TODO: Implement when room assignment is added
        'total_conflicts': len(teacher_conflicts) + len(class_conflicts)
    }

