from rest_framework import viewsets, exceptions
from rest_framework.views import Response, APIView

from apps.bdu.models import Bdu, BduValidationClass
from apps.bdu.serializers import BduSerializer, BduValidationClassSerializer, BduGetSerializer
from apps.bdu.services.download_service import bdu_download_file
from apps.bdu.services.bdu_service import bdu_add_or_update_data, get_bdu
from apps.bdu.services.models import get_models, get_model_fields
from apps.bdu.services.upload_service import bdu_upload_file
from apps.shared.services import SharedService


class BduValidationClassViewSet(viewsets.ModelViewSet):
    serializer_class = BduValidationClassSerializer
    http_method_names = ['get', 'post', 'put', 'delete']

    def get_queryset(self):
        self.queryset = BduValidationClass.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = SharedService.add_data(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        try:
            self.get_object().delete()
            return Response({'Reason': 'Data deleted successfully!'})
        except:
            raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')


class BduViewSet(viewsets.ModelViewSet):
    serializer_class = BduSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Bdu.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = bdu_add_or_update_data(self, request.data, *['add'], **kwargs)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = bdu_add_or_update_data(self, request.data, *args, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        response = SharedService.soft_delete_data(self)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class BduGetViewSet(viewsets.ModelViewSet):
    serializer_class = BduGetSerializer
    http_method_names = ['get']
    filterset_fields = ['is_active']

    def get_queryset(self):
        self.queryset = Bdu.objects.all()
        return self.queryset

    def retrieve(self, request, *args, **kwargs):
        response = get_bdu(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class BduUploadViewSet(viewsets.ModelViewSet):
    serializer_class = BduSerializer
    http_method_names = ['put', 'get']

    def get_queryset(self):
        self.queryset = Bdu.objects.all()
        return self.queryset

    def update(self, request, *args, **kwargs):
        # response = BulkDataService.add_bulk_student(self, request)
        response = bdu_upload_file(self, request, *args, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = bdu_download_file(self, request, *args, **kwargs)
        return response


class ModelAPIView(APIView):

    def get(self, request):
        response = get_models(self)
        return Response(response)


class ModelFieldAPIView(APIView):

    def get(self, request):
        response = get_model_fields(self)
        return Response(response)
