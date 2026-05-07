from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('institutes', '0002_initial'),
    ]

    def intial_resource(apps, schema_editor):
        Resource = apps.get_model('institutes', 'Resource')
        Resource.objects.bulk_create([
            Resource(name='s3bucket', alias_name='', max_limit=5000, is_active=True),
            Resource(name='sms', alias_name='', max_limit=5000, is_active=True),
            Resource(name='email', alias_name='', max_limit=5000, is_active=True),
            Resource(name='push', alias_name='', max_limit=1000000, is_active=True),
        ])


    operations = [
        migrations.RunPython(intial_resource)
    ]
