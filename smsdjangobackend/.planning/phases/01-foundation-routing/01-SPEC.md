# Phase 1 SPEC: Foundation & Routing

## Goal
Establish the centralized database schema and implement the routing logic to ensure all AI cache operations are redirected to `central_db`.

## Requirements
- **INF-01**: Create MySQL database `sms_central_library`.
- **INF-02**: Add `central_db` configuration to `sms/settings/local.py`.
- **INF-03**: Update `apps/tenants/services/router.py` with `TenantRouter` updates including `allow_migrate` fixes.
- **INF-04**: Create `migrate_all_tenants` management command.
- **MOD-01**: Modify `AiLessonPlanCache` to remove the ForeignKey to `LessonPlanAcademicYear`.
- **MOD-02**: Add `book_title` and `text_length` (with indexes) to `AiLessonPlanCache`.
- **MOD-03**: Add `last_imported_tenant_db` and `last_imported_lesson_plan_id` fields.

## Boundaries
- This phase does NOT include the fuzzy matching logic (Phase 2).
- This phase does NOT change the UI for lesson plan creation.

## Acceptance Criteria
1. `AiLessonPlanCache` operations (read/write) target `central_db` regardless of request host.
2. `python manage.py migrate --database=central_db` creates the table in the central schema.
3. `python manage.py migrate --database=default` (and other tenants) does NOT create the `AiLessonPlanCache` table.
