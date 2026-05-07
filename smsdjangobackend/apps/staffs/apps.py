from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate
from django.utils.translation import gettext_lazy as _

#nikhil remove this once executed
def custom_staff_salary_data(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    StaffSalary = apps.get_model('staffs', 'StaffSalary')
    Staff = apps.get_model('staffs', 'Staff')
    existing_staff_salary = StaffSalary.objects.all().values()
    data_to_save = []
    if not existing_staff_salary:
        staff_list = Staff.objects.all()
        for staff in staff_list:
            salary = staff.salary if staff.salary else 0
            data_to_save.append(
                StaffSalary(staff=staff, salary=salary, from_date=staff.date_joined)
            )
        StaffSalary.objects.using(using).bulk_create(data_to_save)

class StaffsConfig(AppConfig):
    name = 'apps.staffs'

    def ready(self):
        pass
        #nikhil remove this once executed
        # post_migrate.connect(custom_staff_salary_data, sender=self)