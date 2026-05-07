from django.contrib import admin

# # Register your models here.
from mptt.admin import DraggableMPTTAdmin
from apps.gallery.models import GalleryTreeItem, GalleryFolder, GalleryFile
from django.utils.html import format_html, mark_safe
from django.utils.translation import gettext as _, gettext_lazy


# admin.site.register(TreeItem, DraggableMPTTAdmin)# dont use this because folder can be inside file which is bug
# admin.site.register(Folder)
# admin.site.register(File)

class MPTTCustomAdmin(DraggableMPTTAdmin):
    """
    The ``DraggableMPTTAdmin`` modifies the standard Django administration
    change list to a drag-drop enabled interface.
    """

    def indented_title(self, item):
        """
        Generate a short title for an object, indent it depending on
        the object's depth in the hierarchy.
        """
        tempLabel = ''
        if item.content_type.model == 'galleryfolder':
            tempLabel = item.folder.values()[0]['name']+' (Folder)'
        elif item.content_type.model == 'galleryfile':
            tempLabel = item.folder.values()[0]['name']+ ('File')
        return format_html(
            '<div style="text-indent:{}px">'+tempLabel+'</div>',
            item._mpttfield('level') * self.mptt_level_indent,
            item,
        )
    indented_title.short_description = gettext_lazy('title')

admin.site.register(GalleryTreeItem, MPTTCustomAdmin)# dont use this because folder can be inside file which is bug
