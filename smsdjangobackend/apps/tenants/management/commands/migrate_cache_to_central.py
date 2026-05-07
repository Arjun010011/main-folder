"""One-time migration of AiLessonPlanCache rows from tenant DBs into central_db.

Copies cache entries from every tenant database into sms_central_library,
skipping duplicates (by cache_key) that already exist in central.

Usage:
    python manage.py migrate_cache_to_central
    python manage.py migrate_cache_to_central --dry-run   # preview only
"""
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import connections


class Command(BaseCommand):
    help = 'Copy AiLessonPlanCache rows from all tenant DBs into central_db'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be migrated without actually writing.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        central_cursor = connections['central_db'].cursor()

        # Get existing cache_keys in central to skip duplicates
        central_cursor.execute(
            'SELECT cache_key FROM classes_ailessonplancache'
        )
        existing_keys = {row[0] for row in central_cursor.fetchall()}
        self.stdout.write(f'Central DB already has {len(existing_keys)} entries.')

        total_migrated = 0

        for db_key in settings.DATABASES:
            if db_key == 'central_db':
                continue

            db_name = settings.DATABASES[db_key]['NAME']
            cursor = connections[db_key].cursor()

            # Check if the old table exists in this tenant DB
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.tables "
                "WHERE table_schema = %s AND table_name = 'classes_ailessonplancache'",
                [db_name],
            )
            if cursor.fetchone()[0] == 0:
                self.stdout.write(f'  {db_key} ({db_name}): no cache table, skipping.')
                continue

            # Check for the old FK column to determine source schema
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_schema = %s AND table_name = 'classes_ailessonplancache' "
                "AND column_name = 'last_imported_lesson_plan_academic_year_id'",
                [db_name],
            )
            has_old_fk = cursor.fetchone()[0] > 0

            cursor.execute('SELECT * FROM classes_ailessonplancache')
            columns = [desc[0] for desc in cursor.description]
            rows = cursor.fetchall()
            self.stdout.write(f'  {db_key} ({db_name}): {len(rows)} cache entries found.')

            for row in rows:
                row_dict = dict(zip(columns, row))
                cache_key = row_dict['cache_key']

                if cache_key in existing_keys:
                    self.stdout.write(f'    SKIP (duplicate): {row_dict.get("book_title", cache_key)}')
                    continue

                # Map the old FK field to the new integer field
                last_plan_id = None
                if has_old_fk:
                    last_plan_id = row_dict.get('last_imported_lesson_plan_academic_year_id')
                else:
                    last_plan_id = row_dict.get('last_imported_lesson_plan_id')

                if dry_run:
                    self.stdout.write(
                        self.style.WARNING(
                            f'    DRY-RUN: would migrate "{row_dict.get("book_title", cache_key)}"'
                        )
                    )
                else:
                    central_cursor.execute(
                        """INSERT INTO classes_ailessonplancache
                        (book_fingerprint, cache_key, source_filename, book_title,
                         text_length, upload_count, plan,
                         last_imported_lesson_plan_id, last_imported_tenant_db,
                         created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                        [
                            row_dict['book_fingerprint'],
                            row_dict['cache_key'],
                            row_dict.get('source_filename', ''),
                            row_dict.get('book_title', ''),
                            row_dict.get('text_length', 0),
                            row_dict.get('upload_count', 1),
                            row_dict['plan'],
                            last_plan_id,
                            db_key,
                            row_dict['created_at'],
                            row_dict['updated_at'],
                        ],
                    )
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'    MIGRATED: "{row_dict.get("book_title", cache_key)}"'
                        )
                    )
                    existing_keys.add(cache_key)
                    total_migrated += 1

        if dry_run:
            self.stdout.write(self.style.WARNING('\nDry run complete. No data written.'))
        else:
            self.stdout.write(
                self.style.SUCCESS(f'\nMigration complete. {total_migrated} entries copied to central_db.')
            )
