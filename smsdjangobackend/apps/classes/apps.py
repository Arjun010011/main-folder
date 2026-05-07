
from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate

def custom_create_fee(sender, using=DEFAULT_DB_ALIAS, **kwargs):
    pass
    """
    Create content types for models in the given app.
    """
    # Students = apps.get_model('students', 'Student')
    # student_standard = apps.get_model('classes','StudentStandardMapping')
    # NewStudents = Students.objects.filter(is_new_student=True).values('id')
    # for students in NewStudents:
    #     student_data=student_standard.objects.filter(student_id=students['id'])
    #     for index,data in enumerate(student_data):
    #         if index==0:
    #             entry_acc_year = data.academic_year.start_date.year
    #             query_to_update=data
    #         if entry_acc_year > data.academic_year.start_date.year:
    #             entry_acc_year = data.academic_year.start_date.year
    #             query_to_update=data
    #     student_standard.objects.filter(id=query_to_update.id).update(is_new_student=1)
    #     student_standard.objects.filter(student_id=students['id']).exclude(id=query_to_update.id).update(is_new_student=0)
class ClassesConfig(AppConfig):
    name = 'apps.classes'

    def ready(self):
        pass
        # post_migrate.connect(custom_create_fee, sender=self)