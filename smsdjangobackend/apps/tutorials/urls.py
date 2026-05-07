from django.urls import path
from rest_framework import routers
from apps.tutorials.views import (
    CreateFolderViewSet, CreateFileViewSet, GetFolderViewSet, MoveFolderOrFileViewSet,
    GetTreeStructureViewSet, GetFolderImgVideoViewSet, TreeItemStandardSectionPermissionViewSet,
    TreeItemUserPermissionViewSet, TreeItemGroupPermissionViewSet, TreeItemStandardPermissionViewSet,
    CopyPermissionViewSet
)

router = routers.DefaultRouter()

router.register(r'createfolder', CreateFolderViewSet, basename='createfolder'),
router.register(r'createfile', CreateFileViewSet, basename='createfile'),
router.register(r'getfoldercontent', GetFolderViewSet, basename='getfoldercontent'),
router.register(r'movefolderorfile', MoveFolderOrFileViewSet, basename='movefolderorfile'),
router.register(r'gettreestrucutre', GetTreeStructureViewSet, basename='gettreestrucutre'),
router.register(r'getfoldercontentimgvideo', GetFolderImgVideoViewSet, basename='getfoldercontentimgvideo'),
router.register(r'tutorialuserpermission', TreeItemUserPermissionViewSet, basename='tutorialuserpermission'),
router.register(r'tutorialgrouppermission', TreeItemGroupPermissionViewSet, basename='tutorialgrouppermission'),
router.register(r'tutorialstandardpermission', TreeItemStandardPermissionViewSet, basename='tutorialstandardpermission'),
router.register(r'tutorialstandardsectionpermission', TreeItemStandardSectionPermissionViewSet, basename='tutorialstandardsectionpermission')
router.register(r'copypermission', CopyPermissionViewSet, basename='copypermission')
urlpatterns = router.urls
