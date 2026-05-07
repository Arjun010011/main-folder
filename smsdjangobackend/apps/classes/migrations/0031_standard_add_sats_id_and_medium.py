# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0030_auto_20251010_1108'),
    ]

    operations = [
        migrations.AddField(
            model_name='standard',
            name='standard_id_according_to_sats',
            field=models.CharField(blank=True, help_text='SATS Portal Standard ID', max_length=255, null=True),
        ),
        migrations.AddField(
            model_name='standard',
            name='sats_medium',
            field=models.CharField(blank=True, help_text='Medium of instruction (e.g., English, Kannada)', max_length=255, null=True),
        )
    ]

