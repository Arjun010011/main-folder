from rest_framework import viewsets, exceptions
from rest_framework.views import Response
from django.db.models import Q

from apps.expenditure.models.expense import ExpenseType, Expense, ExpensePlan
from apps.expenditure.models.token import Token
from apps.expenditure.serializers import ExpenseTypeSerializer, ExpenseSerializer, ExpensePlanSerializer, \
    TokenSerializer
from apps.expenditure.services.expense import (add_expense_type, add_expense, download_expense_receipt, get_expense_report, add_expense_plan,
                                               update_expense, update_expense_plan, delete_expense)
from apps.expenditure.services.token import add_token, get_token
from apps.finance.services.fee_plan import TRANSPORT_CODENAME
from apps.shared.services import SharedService


class ExpenseTypeViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseTypeSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['expense_for', 'codename']

    def get_queryset(self):
        self.queryset = ExpenseType.objects.all()
        if self.request.GET.get('financial_year'):
            queryset = self.queryset.filter(expense_type__financial_year=self.request.GET.get('financial_year'),
                                            expense_type__is_active=True)
            self.queryset = self.queryset.exclude(id__in=queryset)
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_expense_type(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if queryset.filter(codename__in=[TRANSPORT_CODENAME]).exists():
            raise exceptions.ValidationError('Cannot update the expense type.')
        if ExpensePlan.objects.filter(expense_type=self.kwargs['pk']).exists():
            raise exceptions.ValidationError('Expense type is already used in expense plan')
        response = SharedService.update_data(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if queryset.filter(codename__in=[TRANSPORT_CODENAME]).exists():
            raise exceptions.ValidationError('Cannot delete the expense type.')
        if ExpensePlan.objects.filter(expense_type=self.kwargs['pk'], is_active=True):
            raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
        queryset.delete()
        return Response({'Reason': 'Data deleted successfully!'})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class ExpensePlanViewSet(viewsets.ModelViewSet):
    serializer_class = ExpensePlanSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'financial_year', 'expense_type__expense_for', 'expense_type__codename']

    def get_queryset(self):
        self.queryset = ExpensePlan.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_expense_plan(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_expense_plan(self, request.data, **kwargs)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        if self.queryset.filter(Q(expense_plan__isnull=True)| Q(expense_plan__is_active=False)):
            response = SharedService.soft_delete_data(self)
            return Response(response)
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = SharedService.read_data(self, True)
        return Response(response)


class ExpenseViewSet(viewsets.ModelViewSet):
    serializer_class = ExpenseSerializer
    http_method_names = ['get', 'post', 'put', 'delete']
    filterset_fields = ['is_active', 'date', 'expense_plan__financial_year', 'building']
    search_fields = ['token__token_num', 'expense_plan__expense_type__name', 'total_amount', 'ref_number', 'date']
    ordering_fields = ['token', 'expense_plan', 'total_amount', 'ref_number', 'date', 'id']

    def get_queryset(self):
        self.queryset = Expense.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_expense(self, request.data)
        return Response(response)

    def update(self, request, *args, **kwargs):
        response = update_expense(self, request.data, **kwargs)
        return Response(response)

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        if self.request.GET.get('print_receipt'):
            return download_expense_receipt(self, response['data'])
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_expense_report(self)
        if self.request.GET.get('download_excel'):
            return response
        else:
            return Response(response)

    def destroy(self, request, *args, **kwargs):
        response = delete_expense(self)
        return Response(response)


class TokenViewSet(viewsets.ModelViewSet):
    serializer_class = TokenSerializer
    http_method_names = ['get', 'post', 'delete']
    filterset_fields = ['financial_year', 'token_num', 'for_date', 'liter', 'staff', 'token_for']
    search_fields = ['token_num', 'liter', 'for_date', 'staff__first_name']
    ordering_fields = ['token_num', 'liter', 'for_date', ('staff_name', 'staff__first_name')]

    def get_queryset(self):
        self.queryset = Token.objects.all()
        return self.queryset

    def create(self, request, *args, **kwargs):
        response = add_token(self, request.data)
        return Response(response)

    def destroy(self, request, *args, **kwargs):
        self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
        SharedService.soft_delete_data(self)
        return Response({'Reason': 'Token cancelled successfully!'})

    def retrieve(self, request, *args, **kwargs):
        response = SharedService.read_data(self)
        return Response(response)

    def list(self, request, *args, **kwargs):
        response = get_token(self)
        return Response(response)
