from django.apps import AppConfig, apps
from django.db import DEFAULT_DB_ALIAS
from django.db.models.signals import post_migrate
from django.utils.translation import gettext_lazy as _

def custom_create_group(sender, using=DEFAULT_DB_ALIAS, **kwargs): #delete after once run
    Url = apps.get_model('shared', 'Url')
    Url.objects.filter(menu_type='student_app').update(menu_type='app')

class UsersConfig(AppConfig):
    name = 'apps.users'
    verbose_name = _("Authentications and Authorizations")

    def ready(self):
        post_migrate.connect(custom_create_group, sender=self)