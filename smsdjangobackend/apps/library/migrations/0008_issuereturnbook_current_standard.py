from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('classes', '0033_staffstandardsectionmapping_allocation_type'),
        ('library', '0007_stockverification_stockverificationparent'),
    ]

    operations = [
        migrations.AddField(
            model_name='issuereturnbook',
            name='current_standard',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='issue_return_book_current_standard',
                to='classes.standard',
            ),
        ),
    ]
