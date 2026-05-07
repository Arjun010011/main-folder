from django.db import migrations


class Migration(migrations.Migration):
    
    dependencies = [
        ('users', '0004_reportinggroupmapping_group_type'),
    ]

    def intial_group_type(apps, schema_editor):
        ReportingGroupMapping = apps.get_model('users', 'ReportingGroupMapping')
        for reporting in ReportingGroupMapping.objects.all():
            if reporting.group.id in [6,3]:
                reporting.group_type = 1 #updating to teacher group
            reporting.save()


    operations = [
        migrations.RunPython(intial_group_type)
    ]
