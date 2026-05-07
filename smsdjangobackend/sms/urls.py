"""sms URL Configuration

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/2.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
# from rest_framework_swagger.views import get_swagger_view

# schema_view = get_swagger_view(title='Pastebin API')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('users/', include('apps.users.urls'), name='users'),
    path('institutes/', include('apps.institutes.urls'), name='institutes'),
    path('classes/', include('apps.classes.urls'), name='classes'),
    path('finance/', include('apps.finance.urls'), name='finance'),
    path('staffs/', include('apps.staffs.urls'), name='staffs'),
    path('shared/', include('apps.shared.urls')),
    path('hr/', include('apps.hr.urls')),
    path('students/', include('apps.students.urls'), name='students'),
    path('forms/', include('apps.forms.urls'), name='forms'),
    path('shared/', include('apps.shared.urls')),
    path('bdu/', include('apps.bdu.urls')),
    path('general/', include('apps.general.urls')),
    path('transport/', include('apps.transport.urls')),
    path('payroll/', include('apps.payroll.urls')),
    path('tenants/', include('apps.tenants.urls')),
    path('tutorials/', include('apps.tutorials.urls')),
    path('exams/', include('apps.exams.urls')),
    path('expenditure/', include('apps.expenditure.urls')),
    path('diary/', include('apps.diary.urls')),
    path('app/', include('apps.app.urls')),
    path('store/', include('apps.store.urls')),
    path('hostel/', include('apps.hostel.urls')),
    path('quiz/', include('apps.quiz.urls')),
    path('admin/log_viewer/', include('log_viewer.urls')),
    path('notification/', include('apps.notification.urls')),
    path('payments/', include('apps.payments.urls')),
    path('chats/', include('apps.chats.urls')),
    path('library/', include('apps.library.urls')),
    path('feedbackform/', include('apps.feedbackform.urls')),
    path('appointments/', include('apps.appointments.urls')),
    path('asset/', include('apps.asset.urls')),
    path('gatepass/', include('apps.gatepass.urls')),
    # path('silk/', include('silk.urls')),
    # path('report_builder/', include('report_builder.urls'))
    # path('api-auth/', include('rest_framework.urls', namespace='rest_framework')),
    # path('swagger/', schema_view),
    path('canteen/', include('apps.canteen.urls')),
    path('interview/', include('apps.interview.urls')),
]

urlpatterns = [path('api/', include(urlpatterns))]

if settings.DEBUG and getattr(settings, 'MEDIA_URL', None):
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
