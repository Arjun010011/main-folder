from django.urls import path
from rest_framework import routers
from apps.gallery.views import (
    CreateGalleryFolderViewSet, CreateGalleryFileViewSet, GetGalleryFolderViewSet, MoveGalleryFolderOrFileViewSet,
    GetGalleryTreeStructureViewSet, GetGalleryFolderImgVideoViewSet, GalleryTreeItemUserPermissionViewSet,
    GalleryTreeItemGroupPermissionViewSet, GalleryTreeItemStandardPermissionViewSet, GalleryTreeItemStandardSectionPermissionViewSet,
    GalleryCopyPermissionViewSet
)

router = routers.DefaultRouter()

router.register(r'creategalleryfolder', CreateGalleryFolderViewSet, basename='creategalleryfolder'),
router.register(r'creategalleryfile', CreateGalleryFileViewSet, basename='creategalleryfile'),
router.register(r'getgalleryfoldercontent', GetGalleryFolderViewSet, basename='getgalleryfoldercontent'),
router.register(r'movegalleryfolderorfile', MoveGalleryFolderOrFileViewSet, basename='movegalleryfolderorfile'),
router.register(r'getgallerytreestrucutre', GetGalleryTreeStructureViewSet, basename='getgallerytreestrucutre'),
router.register(r'getgalleryfoldercontentimgvideo', GetGalleryFolderImgVideoViewSet, basename='getgalleryfoldercontentimgvideo'),
router.register(r'galleryuserpermission', GalleryTreeItemUserPermissionViewSet, basename='galleryuserpermission'),
router.register(r'gallerygrouppermission', GalleryTreeItemGroupPermissionViewSet, basename='gallerygrouppermission'),
router.register(r'gallerystandardpermission', GalleryTreeItemStandardPermissionViewSet, basename='gallerystandardpermission'),
router.register(r'gallerystandardsectionpermission', GalleryTreeItemStandardSectionPermissionViewSet, basename='gallerystandardsectionpermission')
router.register(r'gallerycopypermission', GalleryCopyPermissionViewSet, basename='gallerycopypermission')
urlpatterns = router.urls
