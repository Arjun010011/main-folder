from apps.staffs.models.staff import Staff


def get_group_names_and_designations_for_staff(staff_ids):
    staff_data = Staff.objects.filter(id__in=staff_ids).prefetch_related('users__groups')
    
    staff_info_mapping = {}
    for staff in staff_data:
        group_names = staff.users.groups.values_list('name', flat=True)
        staff_info_mapping[staff.id] = {
            'group_names': list(group_names),  
            'designation': staff.designation
        }
    return staff_info_mapping