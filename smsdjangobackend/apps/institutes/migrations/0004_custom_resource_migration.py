from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('institutes', '0003_custom_resource_migrations'),
    ]

    def intial_resource(apps, schema_editor):
        Resource = apps.get_model('institutes', 'Resource')
        Resource.objects.bulk_create([
            Resource(name='webpush', alias_name='', max_limit=50000, is_active=True),
        ])


    operations = [
        migrations.RunPython(intial_resource)
    ]
