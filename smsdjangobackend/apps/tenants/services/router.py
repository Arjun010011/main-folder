from .middlewares import get_current_db_name

# Models that live in the central shared database (sms_central_library).
# Use lowercase model_name (Django's Meta.model_name convention).
CENTRAL_MODELS = {'ailessonplancache'}


class TenantRouter:
    """Routes database operations for the multi-tenant + central-library architecture.

    - AiLessonPlanCache → always 'central_db'
    - Everything else   → current tenant DB (from thread-local middleware)
    """

    def db_for_read(self, model, **hints):
        if model._meta.model_name in CENTRAL_MODELS:
            return 'central_db'
        return get_current_db_name()

    def db_for_write(self, model, **hints):
        if model._meta.model_name in CENTRAL_MODELS:
            return 'central_db'
        return get_current_db_name()

    def allow_relation(self, obj1, obj2, **hints):
        # Allow relations only if both objects live in the same database.
        # This prevents Django from accidentally creating cross-DB joins
        # between central_db (AiLessonPlanCache) and school DBs.
        db1 = self._get_db(obj1)
        db2 = self._get_db(obj2)
        if db1 and db2:
            return db1 == db2
        return True

    def _get_db(self, obj):
        if obj._meta.model_name in CENTRAL_MODELS:
            return 'central_db'
        return 'tenant'  # non-central models live in the tenant DB

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        # When model_name is None (e.g. RunSQL, RunPython operations),
        # allow on all DBs except central_db (which is AI-only).
        if model_name is None:
            return db != 'central_db'
        # Only create AiLessonPlanCache table in central_db
        if model_name in CENTRAL_MODELS:
            return db == 'central_db'
        # Don't create other tables in central_db
        if db == 'central_db':
            return False
        # For all other models on school DBs, let Django decide
        return None

