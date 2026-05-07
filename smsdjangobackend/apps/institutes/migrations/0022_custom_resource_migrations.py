from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('institutes', '0021_auto_20251016_1348'),
    ]

    def intial_resource(apps, schema_editor):
        Resource = apps.get_model('institutes', 'Resource')
        # Resource.objects.bulk_create([
        #     Resource(name='ivr', alias_name='', max_limit=50, is_active=True),
        # ])


    operations = [
        migrations.RunPython(intial_resource)
    ]
