from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('institutes', '0018_auto_20250509_1728'),
    ]

    def intial_resource(apps, schema_editor):
        Resource = apps.get_model('institutes', 'Resource')
        Resource.objects.bulk_create([
            Resource(name='ivr', alias_name='', max_limit=5, is_active=True),
        ])


    operations = [
        migrations.RunPython(intial_resource)
    ]
