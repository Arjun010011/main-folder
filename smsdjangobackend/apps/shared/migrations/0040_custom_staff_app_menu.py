from django.db import migrations

class Migration(migrations.Migration):

    def initial_menu_url(apps, schema_editor):
        '''
        We can't import the Post model directly as it may be a newer
        version than this migration expects. We use the historical version.
        '''
        Url = apps.get_model('shared', 'Url')
        
        # Create and save Url objects individually to get primary keys
        url1 = Url(menu_name='staff_dashboard', menu_type='staff_app')
        url2 = Url(menu_name='student_dashboard', menu_type='app')
        url1.save()
        url2.save()

        Menu = apps.get_model('shared', 'Menu')

        # Now use the saved Url objects in Menu
        menus = [
            Menu(alias_name='Staff Dashboard', parent=0, first_child=0, next_menu=2, is_active=1,
                 new_window=0, menu_type='staff_app', url=url1),
            Menu(alias_name='Student Dashboard', parent=0, first_child=0, next_menu=2, is_active=1,
                 new_window=0, menu_type='app', url=url2),
        ]

        # Bulk create Menu objects
        Menu.objects.bulk_create(menus)

    dependencies = [
        ('shared', '0039_report_supported_doc_formate'),
    ]

    operations = [
        migrations.RunPython(initial_menu_url),
    ]