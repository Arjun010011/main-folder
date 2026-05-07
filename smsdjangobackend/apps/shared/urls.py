from django.urls import path, include
from rest_framework import routers

from apps.shared.views import (AppAssetsAPIView, CountryViewSet, DocumentTypeViewSet, FormDefinitionViewSet, StateViewSet, DistrictViewSet, CityViewSet,
                               UploadViewSet, StatesForCountryApiView, DistrictsForStateApiView,
                               CitiesForDistrictApiView, FormDefinitionGetFormNames, MenuViewSet, 
                               UrlViewSet, DownloadJson, SettingViewSet, NationalityViewSet, ReligionViewSet,
                               CategoryViewSet,CasteViewSet, CounterViewSet, TemplateMappingViewSet, UrlOperationViewSet, CustomFormViewSet,
                               UploadFrontEndFieldViewSet, TemplateMappingFilterDatasViewSet, SyncDataViewSet,GenerateCustomReportViewSet,CertificateMappingFilterDatasViewSet,
                               MultipleUploadViewSet ,DynamicvaluesForTemplateViewSet, S3PresignedUrlViewSet, LongProcessingApiResultViewset, CustomReportColumnViewSet,
                               ModeOfPaymentViewSet, MultipleStudyCertificateViewSet,MultipleOtherCertificateViewSet, CustomReportViewSet, CustomReportCategoryViewSet, CustomReportFilterViewSet, CustomReportSubCategoryViewSet,
                            CustomReportDownloadedByUserViewSet, CustomReportMessageDataViewSet, MultipleStaffCertificateViewSet, CustomDesignTemplateViewSet, CustomDesignTemplateMapViewSet, CustomReportGroupingViewSet, CustomDesignTemplatePrintViewSet, TemplateSampleJsonViewSet)

router = routers.DefaultRouter()
router.register(r'country', CountryViewSet, basename='country')
router.register(r'formdefinition', FormDefinitionViewSet, basename='formdefinition')
router.register(r'state', StateViewSet, basename='state')
router.register(r'district', DistrictViewSet, basename='district')
router.register(r'city', CityViewSet, basename='city')
router.register(r'uploads', UploadViewSet, basename='uploads')
router.register(r'multipleupload', MultipleUploadViewSet, basename='multipleupload')
router.register(r'urlsmenu', UrlViewSet, basename='urlsmenu')
router.register(r'urlsoperation', UrlOperationViewSet, basename='urlsoperation')
router.register(r'menu', MenuViewSet, basename='menu')
router.register(r'setting', SettingViewSet, basename='setting')
router.register(r'nationality', NationalityViewSet, basename='nationality')
router.register(r'religion', ReligionViewSet, basename='religion')
router.register(r'category', CategoryViewSet, basename='category')
router.register(r'caste', CasteViewSet, basename='caste')
router.register(r'counter', CounterViewSet, basename='counter')
router.register(r'templatemapping', TemplateMappingViewSet, basename='templatemapping')
router.register(r'templatemappingfilterdatas', TemplateMappingFilterDatasViewSet, basename='templatemappingfilterdatas')
router.register(r'certificate', CertificateMappingFilterDatasViewSet, basename='certificate')
router.register(r'documenttype', DocumentTypeViewSet, basename='documenttype')
router.register(r'customform', CustomFormViewSet, basename='customform')
router.register(r'uploadfrontendfield', UploadFrontEndFieldViewSet, basename='uploadfrontendfield')
router.register(r'syncdatas', SyncDataViewSet, basename='syncdatas')
router.register(r'dynamicvaluesfortemplate', DynamicvaluesForTemplateViewSet, basename='dynamicvaluesfortemplate')
router.register(r'longprocessingapiresult', LongProcessingApiResultViewset, basename='longprocessingapiresult')
router.register(r'modeofpayment', ModeOfPaymentViewSet, basename='modeofpayment')
router.register(r'multiplestudycertificate', MultipleStudyCertificateViewSet, basename='multiplestudycertificate')
router.register(r'multipleothercertificate',MultipleOtherCertificateViewSet, basename='multipleothercertificate')
router.register(r'multiplestaffcertificate',MultipleStaffCertificateViewSet, basename='multiplestaffcertificate')
router.register(r'customreport', CustomReportViewSet, basename='customreport')
router.register(r'generatecustomreport', GenerateCustomReportViewSet, basename='generatecustomreport')
router.register(r'customreportcategory', CustomReportCategoryViewSet, basename='customreportcategory')
router.register(r'customreportsubcategory', CustomReportSubCategoryViewSet, basename='customreportsubcategory')
router.register(r'customreportfilter', CustomReportFilterViewSet, basename='customreportfilter')
router.register(r'customreportcolumn', CustomReportColumnViewSet, basename='customreportcolumn')
router.register(r'customreportdownloadedbyuser', CustomReportDownloadedByUserViewSet, basename='customreportdownloadedbyuser')
router.register(r'customreportmessagedata', CustomReportMessageDataViewSet, basename='customreportmessagedata')
router.register(r'customdesigntemplate', CustomDesignTemplateViewSet, basename='customdesigntemplate')
router.register(r'customdesigntemplatemap', CustomDesignTemplateMapViewSet, basename='customdesigntemplatemap')
router.register(r'customdesigntemplatepdf', CustomDesignTemplatePrintViewSet, basename='customdesigntemplatepdf')
router.register(r'customreportgrouping', CustomReportGroupingViewSet, basename='customreportgrouping')
router.register(r'templatesamplejson', TemplateSampleJsonViewSet, basename='templatesamplejson')
router.register(r'customreportgrouping', CustomReportGroupingViewSet, basename='customreportgrouping')
urlpatterns = router.urls

urlpatterns += [
    path('getstatesforcountry/<int:countryid>/', StatesForCountryApiView.as_view(), name='getstatesforcountry'),
    path('getdistrictsforstate/<int:stateid>/', DistrictsForStateApiView.as_view(), name='getdistrictsforstate'),
    path('getcitiesfordistrict/<int:districtid>/', CitiesForDistrictApiView.as_view(), name='getcitiesfordistrict'),
    path('getformdefinitionslist/', FormDefinitionGetFormNames.as_view(), name='getformdefinitionslist'),
    path('downloadjson/', DownloadJson.as_view(), name='downloadjson'),
    path('appassets/', AppAssetsAPIView.as_view(), name='appassets'),
    # path('s3presignedurl/', S3PresignedUrlViewSet.as_view(), name='s3presignedurl'),
]
