from django.core.management.base import BaseCommand

from django.contrib.contenttypes.models import ContentType
from apps.gallery.models import GalleryFolder, GalleryFile, GalleryTreeItem

class Command(BaseCommand):

    def handle(self, *args, **options):

        contenttype = ContentType.objects.get(app_label='gallery', model='galleryfolder')
        try:
            if not GalleryFolder.objects.filter(id=1).exists():
                GalleryFolder.objects.get_or_create(id=1, name='Root', folder_type=None, description='', created=None)
                GalleryTreeItem.objects.get_or_create (    id=1, object_id=1, is_active=1, lft=1, rght=2, tree_id=1, level=0,
                                            content_type_id=contenttype.id, parent_id=None, setup_ref_table_id=0,
                                            setup_id=None, is_public=False)
        except:
            return "Something went wrong"
