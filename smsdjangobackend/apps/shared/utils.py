import logging

from django.http import Http404
from django.core.exceptions import PermissionDenied
from rest_framework.filters import OrderingFilter
from rest_framework.views import Response, set_rollback
from rest_framework import exceptions
from rest_framework.pagination import (
    LimitOffsetPagination,
    PageNumberPagination
)
import json
import requests

log = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    data = 'Something went wrong!'
    set_rollback()
    log.error(exc)
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    if isinstance(exc, exceptions.APIException):
        headers = {}
        if getattr(exc, 'auth_header', None):
            headers['WWW-Authenticate'] = exc.auth_header
        if getattr(exc, 'wait', None):
            headers['Retry-After'] = '%d' % exc.wait

        if isinstance(exc.detail, list):
            data = exc.detail
        else:
            data = [exc.detail]

        return Response({'Result': False, 'Reason': data, 'status': exc.status_code}, status=exc.status_code,
                        headers=headers)
    if isinstance(exc, KeyError):
        data = exc.args

    if isinstance(exc, TypeError):
        data = exc.args

    try:
        status = exc.status_code
    except:
        status = 500

    return Response({'Result': False, 'Reason': data, 'status': status}, status=status)


class PostLimitOfsetPagination(LimitOffsetPagination):
    default_limit = 5
    max_limit = 10


class PostPageNumberPagination(PageNumberPagination):
    page_size = 10


def http_request(requestType, url, payload=None, params=None, **kwargs):
    headers = {
        'Content-Type': "application/json",
        'Cache-Control': "no-cache"
    }
    if 'headers' in kwargs:
        headers = kwargs.get('headers')
        kwargs.pop('headers')
    try:
        response = requests.request(requestType, url, data=payload, params=params, headers=headers, **kwargs)
    except requests.exceptions.Timeout:
        raise Exception('Server timeout error. Please contact Edubricz support.')
    except requests.exceptions.RequestException as e:
        raise Exception('Connection issue with Server. Please contact Edubricz support.', e)
    except Exception as e:
        raise Exception(e.args)
    return response


class CustomOrderingFilter(OrderingFilter):
    ''' this allows us to "alias" fields on our model to ensure consistency at the API level
        We do so by allowing the ordering_fields attribute to accept a list of tuples.
        You can mix and match, i.e.:
        ordering_fields = (('alias1', 'field1'), 'field2', ('alias2', 'field2')) '''

    def remove_invalid_fields(self, queryset, fields, view, request):
        valid_fields = getattr(view, 'ordering_fields', self.ordering_fields)
        if valid_fields is None or valid_fields == '__all__':
            return super(CustomOrderingFilter, self).remove_invalid_fields(queryset, fields, view, request)

        aliased_fields = {}
        for field in valid_fields:
            if isinstance(field, tuple):
                aliased_fields[field[0]] = field[1]
            else:
                aliased_fields[field] = field

        ordering = []
        for raw_field in fields:
            invert = raw_field[0] == '-'
            field = raw_field.lstrip('-')
            if field in aliased_fields:
                if invert:
                    ordering.append('-{}'.format(aliased_fields[field]))
                else:
                    ordering.append(aliased_fields[field])
        return ordering
