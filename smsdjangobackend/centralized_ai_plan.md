# Centralized AI Lesson Plan Library - Implementation Plan

## Objective
Create a shared, cost-effective library of AI-generated lesson plans accessible by all schools (tenants) without redundant Gemini API calls.

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                    Same MySQL Server                     │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐    │
│  │  School DB (A)   │    │   sms_central_library    │    │
│  │  - Students      │    │                          │    │
│  │  - Staff         │    │   - AiLessonPlanCache    │    │
│  │  - LessonPlan*   │◄───│     (Master AI JSON)     │    │
│  │  - Exams         │    │                          │    │
│  │  - Subjects      │    │                          │    │
│  └──────────────────┘    └──────────────────────────┘    │
│  ┌──────────────────┐              ▲                     │
│  │  School DB (B)   │              │                     │
│  │  - Students      │──────────────┘                     │
│  │  - Staff         │    (All schools read/write         │
│  │  - LessonPlan*   │     AI cache from central)         │
│  │  - Exams         │                                    │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘

* LessonPlanAcademicYear, Topics, Subtopics, Details, Reviews
  remain in the school's private DB (the "Instance").
```

- **Private Databases**: Each school keeps its own DB for Students, Staff, Exams, Subjects, and imported Lesson Plans.
- **Central Database**: A new MySQL schema (`sms_central_library`) on the **same server** stores only `AiLessonPlanCache`.
- **Dynamic Routing**: The Django `TenantRouter` redirects all `AiLessonPlanCache` reads/writes to the Central DB.

---

## 2. Technical Components

### A. Create the Central Database
Run this SQL on the MySQL server:
```sql
CREATE DATABASE sms_central_library CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### B. Django Settings
Add the central DB to **both** `sms/settings/local.py` and `sms/settings/production.py`:
```python
DATABASES['central_db'] = {
    'ENGINE': 'django.db.backends.mysql',
    'NAME': 'sms_central_library',
    'USER': 'pooja',        # use production credentials in production.py
    'PASSWORD': 'edubricz',
    'HOST': '127.0.0.1',
    'PORT': '3306',
    'OPTIONS': {
        'charset': 'utf8mb4',
    },
}
```

### C. Multi-Tenant Router Logic
Update `apps/tenants/services/router.py`:
```python
CENTRAL_MODELS = {'ailessonplancache'}

class TenantRouter:
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
        return None  # let Django decide for same-tenant models

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
```


### D. Fix the Cross-Database ForeignKey
The `AiLessonPlanCache` model currently has this field:
```python
last_imported_lesson_plan_academic_year = models.ForeignKey(LessonPlanAcademicYear, ...)
```
This FK points to a **school-specific** table, but the cache will live in the **central** DB. Cross-database FKs don't work in MySQL.

**Fix**: Remove the FK and store just the ID as an integer field:
```python
# BEFORE (broken across databases)
last_imported_lesson_plan_academic_year = models.ForeignKey(LessonPlanAcademicYear, ...)

# AFTER (safe across databases)
last_imported_lesson_plan_id = models.PositiveIntegerField(null=True, blank=True)
last_imported_tenant_db = models.CharField(max_length=100, blank=True)
```
This stores which school DB and which plan ID was last imported, without requiring a real FK.

**Also add these two fields** needed for fuzzy matching (Section 3):
```python
# These must be populated when saving a new cache entry
book_title = models.CharField(max_length=255, db_index=True, blank=True)
text_length = models.PositiveIntegerField(default=0, db_index=True)
```
Populate `book_title` from the book's metadata or filename, and `text_length` from `len(normalized_text)` before hashing. Both fields must be indexed for fast fuzzy-match lookups as the library grows.

### E. Update the Service Layer (`ai_lesson_plan.py`)
The current code uses `transaction.atomic(using=db_name)` where `db_name` comes from the tenant middleware. This must be split:

```python
# Cache operations → always use 'central_db'
with transaction.atomic(using='central_db'):
    cache_entry = AiLessonPlanCache.objects.filter(cache_key=cache_key).first()
    # ... save/update cache ...

# Import operations → use the school's private DB
with transaction.atomic(using=get_current_db_name()):
    # ... create LessonPlanAcademicYear, Topics, etc. ...
```

### F. Run Migrations
```bash
# Create the migration for the model changes (FK removal)
python manage.py makemigrations classes

# Migrate the central_db (creates AiLessonPlanCache table)
python manage.py migrate --database=central_db

# Migrate ALL tenant databases (not just 'default')
# Each tenant DB key from DATABASES dict must be migrated.
# The router will automatically skip AiLessonPlanCache for these.
python manage.py migrate --database=default
# (repeat for every tenant database key, e.g.:
#  python manage.py migrate --database=school_a
#  python manage.py migrate --database=school_b
#  ... etc.)
```

**Recommended**: Create a management command that loops through all tenant databases automatically:
```python
# apps/tenants/management/commands/migrate_all_tenants.py
from django.core.management import call_command
from django.core.management.base import BaseCommand  # required — without this the command crashes with NameError
from django.conf import settings

class Command(BaseCommand):
    help = 'Run migrate on all tenant databases'

    def handle(self, *args, **options):
        for db_key in settings.DATABASES:
            if db_key == 'central_db':
                continue  # skip central, migrate it separately
            self.stdout.write(f'Migrating {db_key}...')
            call_command('migrate', database=db_key)
            self.stdout.write(self.style.SUCCESS(f'Done: {db_key}'))
```
Usage:
```bash
python manage.py migrate --database=central_db
python manage.py migrate_all_tenants
```

---

## 3. Data Flow & Intelligent Matching

### Step-by-step:
1. **Upload**: User uploads a PDF textbook.
2. **Extract & Hash**: System extracts all text → normalizes it → generates SHA256 hash.
3. **Exact Match Check**: Query `central_db` for `cache_key = <hash>`.
4. **If no exact match → Fuzzy Match**:
   - Query `central_db` for entries with the same `book_title` (case-insensitive).
   - Compare `text_length` — if within ±10% of an existing entry, flag as potential match.
   - Present the user with: *"We found a similar plan for [Book Title]. Use it or generate new?"*
5. **Result**:
   - **HIT (exact or fuzzy accepted)**: Return cached JSON. Time: ~100ms. Cost: $0.
   - **MISS**: Call Gemini API → save result to `central_db`. Time: ~30s. Cost: API tokens.

### Why Title + Text Length (not SimHash):
SimHash requires an additional library and is complex to tune. For textbooks:
- Same title + similar length = almost certainly the same book with minor edits.
- This is simple, fast, and requires no new dependencies.
- Can upgrade to SimHash later if needed.

---

## 4. Migration of Existing Data

You currently have **2 cached plans** in your local school DB (`nandini_local_test`):
- *Unit 1: My Land - Together We Can* (englishtexbook.pdf)
- *Mathematics Grade 1* (demo-math-book.pdf)

**Migration steps**:
1. Create the `sms_central_library` database.
2. Run migrations to create the `AiLessonPlanCache` table in `central_db`.
3. Run a one-time data migration script to copy existing cache entries from each school DB into `central_db`.
4. Verify the data is correct in `central_db`.
5. Optionally drop the `AiLessonPlanCache` table from school databases (or leave it — the router will ignore it).

---

## 5. Copy-on-Import Pattern (Master vs. Instance)

- **Central DB** = "Master" (read-only raw AI JSON).
- **School DB** = "Instance" (editable copy with school-specific data).

When a school clicks "Import":
1. System reads the JSON plan from `central_db` (the Master).
2. System creates `LessonPlanAcademicYear`, `Topics`, `Subtopics`, `Details` in the **school's private DB**.
3. From this point, the school owns that copy — they can add notes, assign teachers, change dates.
4. The Master in `central_db` is never modified by any school.

---

## 6. Future Enhancements
- **Global Search**: Allow schools to browse the Central Library by Book Title/Subject before uploading a PDF.
- **Plan Versioning**: If a school improves an AI plan, allow them to "contribute" the improved version back to the Central Library.

---

## 7. Finalized Decisions
- [x] **Private School Notes**: Use "Master vs. Instance" (Copy-on-Import). Schools edit their own copy. Central stays untouched.
- [x] **Centralize Subjects?**: No. Subjects stay in school DBs. Central Library stores "Subject Name" as text for search only.
- [x] **Server Choice**: Same MySQL server, separate database schema (`sms_central_library`).
- [x] **Fuzzy Matching**: Use Title + Text Length comparison (simple, no new dependencies). Upgrade to SimHash later if needed.
- [x] **Cross-DB FK**: Remove the ForeignKey from `AiLessonPlanCache` → store plain integer ID + tenant DB name instead.
