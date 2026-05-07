from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('institutes', '0016_institutepocmapping'),
    ]

    def intial_resource(apps, schema_editor):
        Resource = apps.get_model('institutes', 'Resource')
        Resource.objects.get_or_create(
            name='whatsapp', alias_name='', max_limit=5000, is_active=True
        )


    operations = [
        migrations.RunPython(intial_resource)]