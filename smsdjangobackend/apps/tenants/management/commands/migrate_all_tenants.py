"""Management command to run Django migrations on all tenant databases.

Skips 'central_db' — that database should be migrated separately with:
    python manage.py migrate --database=central_db

Usage:
    python manage.py migrate --database=central_db   # first
    python manage.py migrate_all_tenants              # then
"""
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.conf import settings


class Command(BaseCommand):
    help = 'Run migrate on all tenant databases (skips central_db)'

    def handle(self, *args, **options):
        for db_key in settings.DATABASES:
            if db_key == 'central_db':
                continue  # skip central, migrate it separately
            self.stdout.write(f'Migrating {db_key}...')
            call_command('migrate', database=db_key)
            self.stdout.write(self.style.SUCCESS(f'  Done: {db_key}'))
        self.stdout.write(self.style.SUCCESS('\nAll tenant databases migrated.'))
