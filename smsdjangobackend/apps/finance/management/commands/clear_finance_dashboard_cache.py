"""
Django management command to clear and recalculate finance dashboard cache
Usage: python manage.py clear_finance_dashboard_cache [--academic_year ACADEMIC_YEAR_ID] [--all]
"""
from django.core.management.base import BaseCommand
from apps.finance.models.finance_dashboard import FinanceDashboardCache
from apps.finance.services.finance_dashboard import calculate_dashboard_cache
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard


class Command(BaseCommand):
    help = 'Clear and recalculate finance dashboard cache'

    def add_arguments(self, parser):
        parser.add_argument(
            '--academic_year',
            type=int,
            help='Academic year ID to clear cache for (if not provided, clears all)',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Clear and recalculate cache for all active academic years',
        )

    def handle(self, *args, **options):
        academic_year_id = options.get('academic_year')
        clear_all = options.get('all', False)

        if clear_all or not academic_year_id:
            # Clear all caches
            self.stdout.write(self.style.WARNING('Clearing all finance dashboard caches...'))
            count = FinanceDashboardCache.objects.all().delete()[0]
            self.stdout.write(self.style.SUCCESS(f'Deleted {count} cache entries'))

            # Recalculate for all active academic years
            academic_years = AcademicYear.objects.filter(is_active=True)
            self.stdout.write(f'Recalculating cache for {academic_years.count()} academic years...')
            
            for year in academic_years:
                try:
                    year_name = f'{year.start_date.year}-{year.end_date.year}'
                    self.stdout.write(f'  - Recalculating for {year_name} (ID: {year.id})...')
                    cache = calculate_dashboard_cache(year.id, force_recalculate=True)
                    self.stdout.write(
                        self.style.SUCCESS(
                            f'    ✓ Total Fee: ₹{cache.total_fee_amount:,.2f}, '
                            f'Collected: ₹{cache.total_collected:,.2f}, '
                            f'Pending: ₹{cache.total_pending:,.2f}'
                        )
                    )
                    
                    # Also recalculate for each standard
                    standards = Standard.objects.filter(
                        student_standard__academic_year_id=year.id,
                        student_standard__student__is_active=True
                    ).distinct()
                    
                    for std in standards:
                        try:
                            calculate_dashboard_cache(year.id, standard_id=std.id, force_recalculate=True)
                        except Exception as e:
                            self.stdout.write(
                                self.style.ERROR(f'    ✗ Error for standard {std.id}: {str(e)}')
                            )
                            
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'  ✗ Error for academic year {year.id}: {str(e)}')
                    )
            
            self.stdout.write(self.style.SUCCESS('\n✓ Cache recalculation completed!'))
        else:
            # Clear cache for specific academic year
            try:
                academic_year = AcademicYear.objects.get(id=academic_year_id)
                year_name = f'{academic_year.start_date.year}-{academic_year.end_date.year}'
                self.stdout.write(
                    self.style.WARNING(
                        f'Clearing cache for academic year {year_name} (ID: {academic_year_id})...'
                    )
                )
                
                # Delete cache for this academic year
                count = FinanceDashboardCache.objects.filter(academic_year_id=academic_year_id).delete()[0]
                self.stdout.write(self.style.SUCCESS(f'Deleted {count} cache entries'))
                
                # Recalculate
                self.stdout.write('Recalculating cache...')
                cache = calculate_dashboard_cache(academic_year_id, force_recalculate=True)
                
                self.stdout.write(self.style.SUCCESS('\n✓ Cache recalculated successfully!'))
                self.stdout.write(f'  Total Students: {cache.total_students}')
                self.stdout.write(f'  Total Fee Amount: ₹{cache.total_fee_amount:,.2f}')
                self.stdout.write(f'  Total Collected: ₹{cache.total_collected:,.2f}')
                self.stdout.write(f'  Total Pending: ₹{cache.total_pending:,.2f}')
                self.stdout.write(f'  Total Adjustment: ₹{cache.total_adjustment:,.2f}')
                self.stdout.write(f'  Total Concession: ₹{cache.total_concession:,.2f}')
                
            except AcademicYear.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Academic year with id {academic_year_id} does not exist!')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Error: {str(e)}')
                )

