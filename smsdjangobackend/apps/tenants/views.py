from rest_framework import viewsets
from rest_framework.views import Response
from apps.institutes.serializers import InstituteSerializer

from apps.tenants.services.tenants import add_company, update_company_json, validate_add_company, server_operations
from rest_framework import permissions
from apps.shared.services import SharedService

class CompanyViewSet(viewsets.ModelViewSet):
    http_method_names = ['post', 'put']
    permission_classes = (permissions.AllowAny,)
    serializer_class = InstituteSerializer

    def create(self, request, *args, **kwargs):
        validate_add_company(self, request)
        SharedService.custom_thread(add_company, self, request)
        return Response({'Reason': 'You will get mail once success'})

    def update(self, request, *args, **kwargs):
        response = update_company_json(self, request, **kwargs)
        return Response(response)

class ServerOpertationViewSet(viewsets.ModelViewSet):
    http_method_names = ['post']
    permission_classes = (permissions.AllowAny,)
    serializer_class = InstituteSerializer

    def create(self, request, *args, **kwargs):
        response = server_operations(self, request)
        return Response(response)