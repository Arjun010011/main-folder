from apps.classes.models.attendance import MachineUserMapping
from apps.classes.services.handled_machine_data import machine_user_mapping_add_or_update
from apps.shared.services_shared.common import get_full_name
from apps.users.models.user import User


def sync_copy_user_id_to_machine_id(self, params):
    machine_user_mapping = MachineUserMapping.objects.filter(is_active=True).values(
        'user_id', 'machine_user_id'
    )
    existing_user_ids = []
    existing_machine_user_ids = []
    for machine_row in machine_user_mapping:
        existing_user_ids.append(machine_row['user_id'])
        existing_machine_user_ids.append(machine_row['machine_user_id'])
    user_data = User.objects.filter(is_active=True, staff__isnull=False).exclude(id__in=existing_user_ids).values(
        'id', 'staff__first_name', 'staff__middle_name', 'staff__last_name'
    )
    create_machine_user_mapping_data = []
    for user_row_data in user_data:
        create_machine_user_mapping_data.append({
            'machine_user_id': user_row_data['id'],
            'first_name': get_full_name(
                user_row_data['staff__first_name'], 
                user_row_data['staff__middle_name'], 
                user_row_data['staff__last_name']
            ),
            'last_name': '',
            'user_id': user_row_data['id']
        })
    print(create_machine_user_mapping_data, 'asdf')
    machine_user_mapping_add_or_update(self, create_machine_user_mapping_data)