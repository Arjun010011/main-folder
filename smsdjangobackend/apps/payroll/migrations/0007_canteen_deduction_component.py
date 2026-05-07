from django.db import migrations


def create_canteen_component(apps, schema_editor):
    SalaryComponent = apps.get_model('payroll', 'SalaryComponent')
    if not SalaryComponent.objects.filter(codename='canteen_deduction').exists():
        SalaryComponent.objects.create(
            name='Canteen Deduction',
            codename='canteen_deduction',
            is_deduction=True,
            is_active=True,
        )


def remove_canteen_component(apps, schema_editor):
    SalaryComponent = apps.get_model('payroll', 'SalaryComponent')
    SalaryComponent.objects.filter(codename='canteen_deduction').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('payroll', '0006_auto_20260330_1833'),
    ]

    operations = [
        migrations.RunPython(create_canteen_component, remove_canteen_component),
    ]
