import copy
from datetime import timedelta
from datetime import datetime
from django.db import transaction
from django.db.models import Sum, Max
from collections import OrderedDict
from rest_framework import exceptions
from apps.finance.models.feeCollection import PaymentDetail
from apps.finance.models.fee_category import FeeCategoryFeeStandardSectionMapping
from apps.finance.services.additional_charge import add_additional_charge_mapping
from num2words import num2words

from apps.classes.models import StandardSectionMapping, Standard
from apps.classes.serializers import StandardSerializer
from apps.finance.models import FeeType, FeePlan, FeeStandardMapping
from apps.finance.models.concession import Concession, ConcessionType, FeePlanConcessionMapping
from apps.finance.models.fee import FeeStandardMappingItemSellingPrice
from apps.finance.serializers import CounterSerializer, FeeCategoryFeeStandardSectionMappingSerializer, FeePlanSerializer, FeeStandardMappingItemReadSellingPriceSerializer, FeeStandardMappingItemSellingPriceSerializer, FeeStandardMappingSerializer, FeeTermsSerializer, FeeTermsViewSerializer
from apps.finance.services import calculations
from apps.institutes.models import AcademicYear
from apps.institutes.serializers import AcademicYearViewSerializer
from apps.institutes.services import academic_year
from apps.notification.services.notification_service import send_notification

from apps.shared.models.counter import Counter
from apps.shared.services import CounterService, FormdefinitionService, NotificationBodyTemplate, SharedService, ConfigurationService
from apps.shared.services_shared.common import get_full_name
from apps.students.models import Student
from apps.students.serializers import StudentListSerializer
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models import RoutePrice
from apps.transport.models.route import RoutePricePlan
from apps.classes.services.standard import get_only_first_sem_standards

from apps.institutes.models import Institute
from apps.shared.services import PDFService
from apps.students.models.student import StudentGroup


ADMISSION_CODENAME = 'admission'
TRANSPORT_CODENAME = 'transport'
APPLICATION_CODENAME = 'application'
STORE_CODENAME = 'store'
CUSTOM_CODENAME = 'custom'

def add_types(self, data):
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response


def get_fee_types(self):
    route_plan = RoutePrice.objects.filter(price_plan__academic_year=self.request.query_params.get('academic_year'),
                                           is_active=True)
    response = SharedService.read_data(self, True)
    response['data'] = get_only_first_sem_standards(self, response['data'])
    fee_types = FeeStandardMapping.objects.filter(
        academic_year=self.request.query_params.get('academic_year'))
    fee_standard_mapping_ids_for_store = []
    fee_standard_mapping_items = {}
    if self.request.query_params.get('student_type'):
        fee_types = fee_types.filter(
            student_type__startswith=self.request.query_params.get('student_type'))
    for fee in response['data']:
        fee['is_approved'] = fee_types.filter(
            standard=fee['id'], is_approved='1').exists()
        fee['transport_plan_details'] = route_plan.filter(price_plan__standard=fee['id']).values('km', 'area__name',
                                                                                                 'rate').distinct()
        for fee_type in fee['fee_types']:
            if fee_type['codename'] == 'store':
                fee_standard_mapping_ids_for_store.append(fee_type['id'])
    if fee_standard_mapping_ids_for_store:
        queryset = FeeStandardMappingItemSellingPrice.objects.filter(
            fee_standard_mapping__in=fee_standard_mapping_ids_for_store)
        fee_standard_mapping_items = {
            fee_s['fee_standard_mapping']: fee_s for fee_s in FeeStandardMappingItemReadSellingPriceSerializer(queryset, many=True).data
        }
    for fee in response['data']:
        fee['group_mapping_data'] = {}
        for fee_type in fee['fee_types']:
            if fee_type['id'] in fee_standard_mapping_items:
                fee_type['store_data'] = fee_standard_mapping_items[fee_type['id']]
            if fee_type['fee_group'] not in fee['group_mapping_data']:
                group_data = {
                    'fee_group_name': None,
                    'fee_group_code_name': None,
                    'fee_group': None,
                    'fee_types': []
                }
                if fee_type['fee_group']:
                    group_data['fee_group_name'] = fee_type['fee_group_name']
                    group_data['fee_group_code_name']  = fee_type['fee_group_code_name']
                    group_data['fee_group'] = fee_type['fee_group']
                fee['group_mapping_data'][fee_type['fee_group']] = group_data
            fee['group_mapping_data'][fee_type['fee_group']]['fee_types'].append(fee_type)
        fee['group_mapping_data'] = fee['group_mapping_data'].values()
    return {'data': {'fee_types': response['data']}}


def update_fee_types(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(feestandardmapping__isnull=False):
        if queryset.filter(feestandardmapping__is_approved='1'):
            raise exceptions.ValidationError(
                'Fee type is planned and Approved.')
    response = SharedService.update_data(self, data, **kwargs)
    return response


def delete_fee_types(self):
    fee_type_ids = FeeType.objects.filter(
        codename__in=[ADMISSION_CODENAME, TRANSPORT_CODENAME, APPLICATION_CODENAME]).values_list('id', flat=True)
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(feestandardmapping__isnull=True):
        if int(self.kwargs['pk']) in fee_type_ids:
            raise exceptions.ValidationError('Fees cannot be deleted!')
        queryset.delete()
        return {'Reason': 'Data deleted successfully!'}
    raise exceptions.ValidationError(
        'Cannot delete some instances of data are referenced.')


# def update_fee_types_fee_plan(self, data, **kwargs):
#     queryset = self.get_queryset().filter(academic_year=data['academic_year'], standard=data['standard'],
#                                           fee_type=data['fee_type'])
#     instance = queryset.filter(id=self.kwargs['pk'])
#     if instance.filter(is_approved='1'):
#         raise exceptions.ValidationError('Cannot update fee is approved!')
#     standard_queryset = StandardSectionMapping.objects.filter(academic_year=data['academic_year'],
#                                                               standard=data['standard'])
#     if not standard_queryset:
#         raise exceptions.ValidationError(
#             f'standard id {data["standard"]} is not present in the given academic year!')
#     if not data['amount']:
#         raise exceptions.ValidationError('Please enter amount/percentage')
#     if data['codename'] == TRANSPORT_CODENAME:
#         if data['is_mandatory']:
#             raise exceptions.ValidationError(
#                 'Transport Fee should be selected as Non-Mandatory.')
#         if float(data['amount']) != 100:
#             raise exceptions.ValidationError('Percent should be 100%.')
#         is_amount = False
#     else:
#         is_amount = True
#     with transaction.atomic(using=get_current_db_name()):
#         partial = kwargs.pop('partial', False)
#         instance = self.get_object()
#         serializer = self.get_serializer(
#             instance=instance, data=data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#         data = {'standard_fee': [{'terms': 'Term1', 'rate': data['amount'], 'is_amount': is_amount,
#                                   'payment_start_date': instance.academic_year.start_date,
#                                   'payment_end_date': instance.academic_year.end_date,
#                                   'term_start_date': instance.academic_year.start_date,
#                                   'term_end_date': instance.academic_year.end_date}]}
#         serializer = FeeTermsSerializer(
#             instance=instance, data=data, partial=partial)
#         serializer.is_valid(raise_exception=True)
#         serializer.save()
#         return {'Reason': 'Data updated Successfully!'}

def update_fee_types_fee_plan(self, data, **kwargs):
    if 'pk' in kwargs and 'fee_types' not in data:
        pk = kwargs['pk']
        instance = FeeStandardMapping.objects.get(id=pk)
        if instance.is_approved == '1':
            raise exceptions.ValidationError('Cannot update: fee plan is approved.')
        with transaction.atomic(using=get_current_db_name()):
            if 'amount' in data:
                new_amount = float(data['amount'])
                if new_amount < float(instance.amount):
                    raise exceptions.ValidationError(
                        f'{instance.fee_type.name}: amount cannot be less than '
                        f'the previous amount ({instance.amount}).')
                instance.amount = new_amount
            if 'is_mandatory' in data:
                instance.is_mandatory = data['is_mandatory']
            if 'student_group' in data:
                instance.student_group_id = data['student_group']
            if 'gender' in data:
                instance.gender = data['gender']
            if 'is_new_student' in data:
                instance.is_new_student = data['is_new_student']
            if 'fee_group' in data:
                instance.fee_group_id = data['fee_group']
            instance.save()
            # Sync default Term1 rate if amount changed
            if 'amount' in data:
                fee_plans = FeePlan.objects.filter(standard_fee=instance)
                if fee_plans.count() == 1:
                    fp = fee_plans.first()
                    fp.rate = instance.amount
                    fp.save()
        return {'Reason': 'Data updated successfully!'}

    # Batch fee_group update (existing logic)
    data_to_update = []
    for fee_type in data['fee_types']:
        data_to_update.append(
            {
                'id': fee_type['id'], 'fee_group': fee_type['fee_group']
            }
        )
    with transaction.atomic(using=get_current_db_name()):
        for row_data in data_to_update:
            instance = FeeStandardMapping.objects.get(id=row_data['id'])
            serializer = self.get_serializer(
                instance=instance, data=row_data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
    return {'data': 'Data Updated successfully'}


def delete_fee_types_fee_plan(self):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(is_approved='1'):
        raise exceptions.ValidationError('Cannot delete fee is approved!')
    fee_plan_data = FeePlan.objects.filter(standard_fee=self.kwargs['pk'])
    fee_plan_ids = []
    for fee_plan in fee_plan_data.values('id'):
        fee_plan_ids.append(fee_plan['id'])
    payment_details = PaymentDetail.objects.filter(
        fee_plan__in=fee_plan_ids
    ).values()
    if payment_details:
        raise exceptions.ValidationError('Cannot delete: payments already exist for this fee plan.')
    with transaction.atomic(using=get_current_db_name()):
        fee_plan_data.delete()
        queryset.delete()
        return {'Reason': 'Data deleted successfully!'}


def delete_all_fee_plan(self, data):
    queryset = self.get_queryset().filter(
        academic_year=data['academic_year'], standard=data['standard'])
    if queryset.filter(is_approved='1'):
        raise exceptions.ValidationError('Cannot delete fee is approved!')

    # Block delete if any of these fee plans are referred to in payment detail
    fee_plan_ids = FeePlan.objects.filter(
        standard_fee__in=queryset.values_list('id', flat=True)
    ).values_list('id', flat=True)
    if PaymentDetail.objects.filter(fee_plan_id__in=fee_plan_ids).exists():
        raise exceptions.ValidationError(
            'Cannot delete: fee plan is already referred to in payment details.'
        )

    with transaction.atomic(using=get_current_db_name()):
        FeePlan.objects.filter(
            standard_fee__in=queryset.values_list('id', flat=True)).delete()
        queryset.delete()
    return {'Reason': 'Data deleted successfully!'}


def edit_fee_class_mapping(self, data):
    
    academic_year = data['academic_year']
    standards = data['standard']
    fee_types_data = data.get('fee_types', [])
    if not fee_types_data:
        raise exceptions.ValidationError('No fee types provided!')

    student_type = fee_types_data[0].get('student_type')
    fee_type_mapping = {f['id']: f for f in FeeType.objects.filter().values()}

    for standard in standards:
        existing_mappings = FeeStandardMapping.objects.filter(
            academic_year=academic_year,
            standard=standard,
            student_type=student_type
        )

        if not existing_mappings.exists():
            raise exceptions.ValidationError(
                f'No existing fee plan found for standard {standard} to edit.')

        if existing_mappings.filter(is_approved='1').exists():
            raise exceptions.ValidationError(
                'Cannot edit: fee plan is approved. Please unapprove first.')

    with transaction.atomic(using=get_current_db_name()):
        require_adjustment_list = []

        for standard in standards:
            existing_mappings = FeeStandardMapping.objects.filter(
                academic_year=academic_year,
                standard=standard,
                student_type=student_type
            )
            existing_mapping_by_id = {
                m.id: m for m in existing_mappings
            }
            incoming_mapping_ids = set()
            duplicate_test_dict = {}

            for m in existing_mappings:
                sg = str(m.student_group_id) if m.student_group_id else 'xyz'
                gn = str(m.gender) if m.gender else 'xyz'
                ins = str(m.is_new_student) if m.is_new_student is not None else 'xyz'
                duplicate_test_dict[f'{standard}_{m.fee_type_id}_{m.student_type}_{sg}_{gn}_{ins}'] = m.id

            for feetype in fee_types_data:
                fee_type_id = feetype['fee_type']
                mapping_id = feetype.get('id')  

                if mapping_id and mapping_id in existing_mapping_by_id:
                    incoming_mapping_ids.add(mapping_id)
                    mapping = existing_mapping_by_id[mapping_id]

                    new_amount = float(feetype['amount'])
                    if new_amount < float(mapping.amount):
                        raise exceptions.ValidationError(
                            f'{mapping.fee_type.name}: amount cannot be less than '
                            f'the previous amount ({mapping.amount}).')

                    update_data = {
                        'fee_type': fee_type_id,
                        'amount': new_amount,
                        'is_mandatory': feetype.get('is_mandatory', mapping.is_mandatory),
                        'sub_fee_type': feetype.get('sub_fee_type', mapping.sub_fee_type),
                        'student_type': feetype.get('student_type', mapping.student_type),
                    }
                    if 'fee_group' in feetype:
                        update_data['fee_group'] = feetype['fee_group']
                    if 'student_group' in feetype:
                        update_data['student_group'] = feetype['student_group']
                    if 'gender' in feetype:
                        update_data['gender'] = feetype['gender']
                    if 'is_new_student' in feetype:
                        update_data['is_new_student'] = feetype['is_new_student']
                    if 'receipt_alias' in feetype:
                        update_data['receipt_alias'] = feetype['receipt_alias']

                    serializer = self.get_serializer(
                        instance=mapping, data=update_data, partial=True)
                    serializer.is_valid(raise_exception=True)
                    serializer.save()

                    existing_fee_plans = {fp.terms: fp for fp in FeePlan.objects.filter(standard_fee=mapping)}

                    if 'terms_data' not in feetype:
                        if 'Term1' in existing_fee_plans:
                            fp = existing_fee_plans['Term1']
                            fp.rate = float(mapping.amount)
                            fp.save()
                    else:
                        incoming_terms = set()
                        for term_data in feetype['terms_data']:
                            term_name = term_data['terms']
                            incoming_terms.add(term_name)
                            if term_name in existing_fee_plans:
                                fp = existing_fee_plans[term_name]
                                if PaymentDetail.objects.filter(fee_plan=fp).exists():
                                    protected_fields = [
                                        'rate',
                                        'payment_start_date',
                                        'payment_end_date',
                                        'term_start_date',
                                        'term_end_date',
                                        'term_alias',
                                    ]
                                    has_structural_change = False
                                    for field in protected_fields:
                                        incoming_value = term_data.get(field, getattr(fp, field))
                                        if incoming_value != getattr(fp, field):
                                            has_structural_change = True
                                            break
                                    if has_structural_change:
                                        raise exceptions.ValidationError(
                                            f'{mapping.fee_type.name} {fp.terms}: cannot modify term - payment already exists.'
                                        )
                                else:
                                    fp.rate = float(term_data.get('rate', fp.rate))
                                    fp.payment_start_date = term_data.get('payment_start_date', fp.payment_start_date)
                                    fp.payment_end_date = term_data.get('payment_end_date', fp.payment_end_date)
                                    fp.term_start_date = term_data.get('term_start_date', fp.term_start_date)
                                    fp.term_end_date = term_data.get('term_end_date', fp.term_end_date)
                                    fp.term_alias = term_data.get('term_alias', fp.term_alias)
                                    fp.save()
                            else:
                                is_amount = False if feetype.get('codename') == TRANSPORT_CODENAME else True
                                FeePlan.objects.create(
                                    standard_fee=mapping,
                                    terms=term_name,
                                    rate=term_data.get('rate', 0),
                                    is_amount=is_amount,
                                    payment_start_date=term_data.get('payment_start_date'),
                                    payment_end_date=term_data.get('payment_end_date'),
                                    term_start_date=term_data.get('term_start_date'),
                                    term_end_date=term_data.get('term_end_date'),
                                    term_alias=term_data.get('term_alias'),
                                )

                        removed_terms = set(existing_fee_plans.keys()) - incoming_terms
                        if removed_terms:
                            raise exceptions.ValidationError(
                                f'Cannot remove terms: {", ".join(removed_terms)}. '
                                f'Fee plan terms cannot be deleted once created.')

                    current_plans = FeePlan.objects.filter(standard_fee=mapping)
                    term_rate_sum = sum(fp.rate for fp in current_plans if fp.is_amount)
                    if feetype.get('codename') != TRANSPORT_CODENAME and term_rate_sum != mapping.amount:
                        require_adjustment_list.append({
                            'fee_type_name': feetype.get('fee_type_name', ''),
                            'fee_standard_mapping_id': mapping.id,
                            'mapping_amount': mapping.amount,
                            'term_rate_sum': term_rate_sum,
                            'difference': mapping.amount - term_rate_sum,
                        })

                else:
                    codename = feetype.get('codename')
                    if codename is None and fee_type_id in fee_type_mapping:
                        codename = fee_type_mapping[fee_type_id].get('codename')

                    if not feetype.get('amount'):
                        raise exceptions.ValidationError(
                            f'Please enter amount/percentage for fee id {fee_type_id}')

                    if codename == TRANSPORT_CODENAME:
                        if feetype.get('is_mandatory'):
                            raise exceptions.ValidationError(
                                'Transport Fee should be selected as Non-Mandatory.')
                        if float(feetype['amount']) != 1:
                            raise exceptions.ValidationError(
                                f'Amount value should be 1 for {codename}')

                    if codename == STORE_CODENAME:
                        if feetype.get('is_mandatory'):
                            raise exceptions.ValidationError(
                                'Store Related Fee Type should be selected as Non-Mandatory.')
                        if 'store_details' not in feetype or not feetype['store_details']:
                            raise exceptions.ValidationError(
                                'store_details is mandatory')
                        if len(feetype['store_details']) < 1:
                            raise exceptions.ValidationError(
                                'Stock item is empty, Minimum one item should be added')
                        for stock in feetype['store_details']:
                            if 'stock' not in stock or not stock['stock']:
                                raise exceptions.ValidationError('Stock is mandatory')
                            if 'selling_price' not in stock:
                                raise exceptions.ValidationError(
                                    'selling_price is mandatory')

                    sg = str(feetype.get('student_group', '')) if feetype.get('student_group') else 'xyz'
                    gn = str(feetype.get('gender', '')) if feetype.get('gender') else 'xyz'
                    ins = str(feetype.get('is_new_student', '')) if feetype.get('is_new_student') is not None else 'xyz'
                    dup_key = f'{standard}_{fee_type_id}_{feetype.get("student_type", "")}_{sg}_{gn}_{ins}'
                    if dup_key in duplicate_test_dict:
                        raise exceptions.ValidationError('Duplicate values Found')
                    duplicate_test_dict[dup_key] = True

                    dict_data = {
                        **feetype,
                        'academic_year': academic_year,
                        'standard': standard,
                    }
                    serializer = self.get_serializer(data=dict_data)
                    serializer.is_valid(raise_exception=True)
                    new_mapping = serializer.save()

                    is_amount = False if codename == TRANSPORT_CODENAME else True
                    FeePlan.objects.create(
                        standard_fee=new_mapping,
                        terms='Term1',
                        rate=new_mapping.amount,
                        is_amount=is_amount,
                        payment_start_date=new_mapping.academic_year.start_date,
                        payment_end_date=new_mapping.academic_year.end_date,
                        term_start_date=new_mapping.academic_year.start_date,
                        term_end_date=new_mapping.academic_year.end_date,
                    )

                    if codename == STORE_CODENAME and 'store_details' in feetype:
                        data_to_save = []
                        check_duplicate = {}
                        total_amount = 0
                        for stock in feetype['store_details']:
                            if stock['stock'] in check_duplicate:
                                raise exceptions.ValidationError(
                                    'Duplicate stock data found')
                            check_duplicate[stock['stock']] = ''
                            data_to_save.append({
                                'fee_standard_mapping': new_mapping.id,
                                'stock': stock['stock'],
                                'selling_price': stock['selling_price'],
                                'quantity': stock.get('quantity', 1),
                            })
                            total_amount += float(stock['selling_price'])
                        if float(new_mapping.amount) != total_amount:
                            raise exceptions.ValidationError(
                                'Fee amount and the stocks amount are not matching')
                        add_store_selling_price_finance(self, data_to_save)

        if require_adjustment_list:
            return {
                'Reason': 'Data updated, but term amounts need adjustment.',
                'require_adjustment': True,
                'adjustments': require_adjustment_list,
            }

        return {'Reason': 'Data updated Successfully!'}

def add_fee_class_mapping(self, data):
    queryset = self.get_queryset().filter(academic_year=data['academic_year'])
    standard_queryset = StandardSectionMapping.objects.filter(
        academic_year=data['academic_year'])
    data_list = list()
    duplicate_test_dict={}
    fee_type_mapping = {f['id']: f for f in FeeType.objects.filter().values()}
    fee_plan_types = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'fee_plan_types')
    for standard in data['standard']:
        special_assignment_dict={}
        if not standard_queryset.filter(standard=standard):
            raise exceptions.ValidationError(
                f'standard id {standard} is not present in the given academic year!')
        standard_queryset_temp = queryset.filter(
            standard=standard, is_approved='1')
        fee_standard_duplicate_check = queryset.filter(standard=standard)
        for feetype in data['fee_types']:
            is_new_student = str(feetype['is_new_student']) if 'is_new_student' in feetype and feetype['is_new_student'] else 'xyz'
            if is_new_student == 2:
                feetype['is_new_student'] = False
            # if feetype.get('codename') != FinanceService.TRANSPORT_CODENAME:  # if not feetype.get('codename'):
            if standard_queryset_temp.filter(student_type=feetype['student_type']):
                raise exceptions.ValidationError(
                    f'plan is approved for {standard_queryset.filter(standard=standard).first().standard.name} {feetype["student_type"]}')
            if not feetype['amount']:
                raise exceptions.ValidationError(
                    f'Please enter amount/percentage for fee id {feetype["fee_type"]}')
            if feetype['codename'] == TRANSPORT_CODENAME:
                if feetype['is_mandatory']:
                    raise exceptions.ValidationError(
                        'Transport Fee should be selected as Non-Mandatory.')
                if float(feetype['amount']) != 1:
                    raise exceptions.ValidationError(
                        f'Amount value should be 1 for {feetype["codename"]}')
            if fee_type_mapping[feetype['fee_type']]['codename'] == STORE_CODENAME:
                if feetype['is_mandatory']:
                    raise exceptions.ValidationError(
                        'Store Related Fee Type should be selected as Non-Mandatory.')
                if 'store_details' not in feetype or not feetype['store_details']:
                    raise exceptions.ValidationError(
                        'store_details is mandatory')
                if len(feetype['store_details']) < 1:
                    raise exceptions.ValidationError(
                        'Stock item is empty, Minimum one item should be added')
                for stock in feetype['store_details']:
                    if 'stock' not in stock or not stock['stock']:
                        raise exceptions.ValidationError('Stock is mandatory')
                    if 'selling_price' not in stock:
                        raise exceptions.ValidationError(
                            'selling_price is mandatory')
            dict_data = {
                **feetype, **{'academic_year': data['academic_year'], 'standard': standard}}
            data_list.append(dict_data)
            student_group = str(feetype['student_group']) if 'student_group' in feetype and feetype['student_group'] else 'xyz'
            gender = str(feetype['gender']) if 'gender' in feetype and feetype['gender'] else 'xyz'
            duplicate_check_key = str(standard)+'_'+str(feetype['fee_type'])+'_'+str(feetype['student_type'])+'_'+student_group+'_'+gender+'_'+is_new_student
            if not duplicate_check_key in duplicate_test_dict:
                duplicate_test_dict[duplicate_check_key] = dict_data
            else:
                raise exceptions.ValidationError("Duplicate values Found")
            new_list=[]
            if 'student_group' in feetype and feetype['student_group']:
                new_list.append('student_group')
            if 'gender' in feetype and feetype['gender']:
                new_list.append('gender')
            if 'is_new_student' in feetype and feetype['is_new_student']:
                new_list.append('is_new_student')

            if not fee_plan_types:
                if not feetype['fee_type'] in special_assignment_dict:
                    special_assignment_dict[feetype['fee_type']]=new_list
                else:
                    if special_assignment_dict[feetype['fee_type']]==new_list:
                        continue
                    else:
                        raise exceptions.ValidationError("trying invalid format")
        for fees in fee_standard_duplicate_check:
            student_group = str(fees.student_group.id) if fees.student_group else 'xyz'
            gender = str(fees.gender) if fees.gender else 'xyz'
            is_new_student = str(fees.is_new_student) if fees.is_new_student!=None else 'xyz'
            duplicate_check_key = str(standard)+'_'+str(fees.fee_type.id)+'_'+str(fees.student_type)+'_'+student_group+'_'+gender+'_'+is_new_student
            if not duplicate_check_key in duplicate_test_dict:
                duplicate_test_dict[duplicate_check_key] = {}
            else:
                raise exceptions.ValidationError("Duplicate values Found")
            new_list=[]
            if fees.student_group:
                new_list.append('student_group')
            if fees.gender:
                new_list.append('gender')
            if fees.is_new_student:
                new_list.append('is_new_student')
            if not fees.fee_type.id in special_assignment_dict:
                special_assignment_dict[fees.fee_type.id]=new_list
            else:
                if special_assignment_dict[fees.fee_type.id]==new_list:
                    continue
    with transaction.atomic(using=get_current_db_name()):
        # response = SharedService.add_data(self, data_list)
        serializer = self.get_serializer(
            data=data_list, many=True, allow_empty=False)
        serializer.is_valid(raise_exception=True)
        fee_data = serializer.save()
        for idx, fee in enumerate(fee_data):
            is_amount = False if fee.fee_type.codename == TRANSPORT_CODENAME else True
            FeePlan.objects.create(standard_fee=fee, terms='Term1', rate=fee.amount, is_amount=is_amount,
                                   payment_start_date=fee.academic_year.start_date,
                                   payment_end_date=fee.academic_year.end_date,
                                   term_start_date=fee.academic_year.start_date,
                                   term_end_date=fee.academic_year.end_date)
            if fee.fee_type.codename == STORE_CODENAME:
                data_to_save = []
                check_duplicate = {}
                total_amount = 0
                for stock in data_list[idx]['store_details']:
                    if stock['stock'] in check_duplicate:
                        raise exceptions.ValidationError(
                            'Duplicate stock data found')
                    check_duplicate[stock['stock']] = ''
                    data_to_save.append({
                        'fee_standard_mapping': fee.id,
                        'stock': stock['stock'],
                        'selling_price': stock['selling_price'],
                        'quantity': stock['quantity']
                    })
                    total_amount += float(stock['selling_price'])
                if fee.amount != total_amount:
                    raise exceptions.ValidationError(
                        'Fee amount and the stocks amount are not matching')
                add_store_selling_price_finance(self, data_to_save)
        return {'Reason': 'Data added Successfully!', 'data': serializer.data}
    # return response


def copy_all_fee_plan(self, data):
    """Copy ALL fee plans from source academic year to target academic year.
    Iterates each standard that has fee plans in the source year and creates
    them in the target year (only if the standard exists in the target year
    and doesn't already have plans).
    """
    source_year = data.get('source_academic_year')
    target_year = data.get('target_academic_year')
    if not source_year or not target_year:
        raise exceptions.ValidationError('source_academic_year and target_academic_year are required')
    if str(source_year) == str(target_year):
        raise exceptions.ValidationError('Source and target academic year cannot be the same')

    # Fetch target academic year for dates
    try:
        target_ay = AcademicYear.objects.get(id=target_year)
    except AcademicYear.DoesNotExist:
        raise exceptions.ValidationError('Target academic year not found')

    # Get all fee plan mappings from source year
    source_mappings = FeeStandardMapping.objects.filter(
        academic_year=source_year
    ).select_related('fee_type', 'student_group', 'standard')

    if not source_mappings.exists():
        raise exceptions.ValidationError('No fee plans found in the source academic year')

    # Get standards available in target year
    target_standard_ids = set(
        StandardSectionMapping.objects.filter(
            academic_year=target_year
        ).values_list('standard_id', flat=True)
    )
    if not target_standard_ids:
        raise exceptions.ValidationError('No standards found in the target academic year')

    # Group source mappings by standard
    standard_groups = {}
    for mapping in source_mappings:
        std_id = mapping.standard_id
        if std_id not in standard_groups:
            standard_groups[std_id] = []
        standard_groups[std_id].append(mapping)

    # Check which target standards already have fee plans
    existing_target_standards = set(
        FeeStandardMapping.objects.filter(
            academic_year=target_year
        ).values_list('standard_id', flat=True)
    )

    copied_standards = []
    skipped_standards = []
    data_list = []

    for std_id, mappings in standard_groups.items():
        # Skip if standard doesn't exist in target year
        if std_id not in target_standard_ids:
            std_name = mappings[0].standard.name if mappings else str(std_id)
            skipped_standards.append(f'{std_name} (not in target year)')
            continue

        # Skip if standard already has fee plans in target year
        if std_id in existing_target_standards:
            std_name = mappings[0].standard.name if mappings else str(std_id)
            skipped_standards.append(f'{std_name} (already has fee plans)')
            continue

        for mapping in mappings:
            data_list.append({
                'academic_year': target_year,
                'standard': std_id,
                'fee_type': mapping.fee_type_id,
                'amount': mapping.amount,
                'is_mandatory': mapping.is_mandatory,
                'student_type': mapping.student_type,
                'student_group': mapping.student_group_id,
                'gender': mapping.gender,
                'is_new_student': mapping.is_new_student,
                'fee_group': mapping.fee_group_id if hasattr(mapping, 'fee_group_id') else None,
            })
        copied_standards.append(mappings[0].standard.name if mappings else str(std_id))

    if not data_list:
        msg = 'No standards to copy.'
        if skipped_standards:
            msg += f' Skipped: {", ".join(skipped_standards)}'
        raise exceptions.ValidationError(msg)

    with transaction.atomic(using=get_current_db_name()):
        serializer = FeeStandardMappingSerializer(data=data_list, many=True)
        serializer.is_valid(raise_exception=True)
        fee_data = serializer.save()

        # Create FeePlan (Term1) for each mapping — same as add_fee_class_mapping
        for fee in fee_data:
            is_amount = False if fee.fee_type.codename == TRANSPORT_CODENAME else True
            FeePlan.objects.create(
                standard_fee=fee,
                terms='Term1',
                rate=fee.amount,
                is_amount=is_amount,
                payment_start_date=target_ay.start_date,
                payment_end_date=target_ay.end_date,
                term_start_date=target_ay.start_date,
                term_end_date=target_ay.end_date,
            )

    result = {
        'Reason': f'Fee plans copied successfully for: {", ".join(copied_standards)}',
        'copied_standards': copied_standards,
    }
    if skipped_standards:
        result['skipped_standards'] = skipped_standards
    return result


def fee_term_date_validation(self, feeType):
    queryset = self.get_queryset().get(id=feeType['id'])
    term_start_date = queryset.academic_year.start_date
    payment_end_date = queryset.academic_year.start_date
    academic_year_end_date = queryset.academic_year.end_date
    max = len(feeType['standard_fee'])
    term_alias_duplicate = {}
    terms = {term['terms']: term for term in feeType['standard_fee']}
    for term in terms.values():
        if not term['term_start_date'] or not term['term_end_date'] or not term['payment_start_date'] or not term[
                'payment_end_date']:
            raise exceptions.ValidationError(
                f'Please enter date for {feeType["fee_type_name"]} {term["terms"]}')
        termStartDate = SharedService.date_to_obj(term['term_start_date'])
        termEndDate = SharedService.date_to_obj(term['term_end_date'])
        # if not (term_start_date <= termStartDate <= termEndDate <= academic_year_end_date):
        #     raise exceptions.ValidationError(
        #         f'Term date of {feeType["fee_type_name"]} {term["terms"]} is not in range/overlapped!')
        if 'term_alias' in term and term['term_alias'] in term_alias_duplicate:
            raise exceptions.ValidationError(f'{term["term_alias"]} duplicate found')
        if 'term_alias' in term and term['term_alias']:
            term_alias_duplicate[term['term_alias']] = ''
        term_start_date = termEndDate + timedelta(days=1)
        payStartDate = SharedService.date_to_obj(term['payment_start_date'])
        payEndDate = SharedService.date_to_obj(term['payment_end_date'])


def add_update_fee_plan(self, data, *args, **kwargs):
    if not data:
        raise exceptions.ValidationError('No data in request!')
    queryset = self.get_queryset()
    fee_standard_mapping_data = {fee_stand.id: fee_stand for fee_stand in queryset}
    fee_standard_mapping_to_update = []
    for feetype in data:
        if feetype['id'] in fee_standard_mapping_data:
            if fee_standard_mapping_data[feetype['id']].is_approved == '1':
                raise exceptions.ValidationError(
                    f'plan is approved for fee type {feetype["fee_type_name"]}.')
        else:
            raise exceptions.ValidationError(
                f'{feetype["fee_type_name"]} is not planned.')
        fee_data = fee_standard_mapping_data[feetype['id']]
        feetype['existing_fee_plans'] = {temp.id : temp for temp in fee_data.standard_fee.all()}
        # if fee_data.fee_type.codename == STORE_CODENAME and len(fee_data.standard_fee) > 1: nikhil check this error
        #     raise exceptions.ValidationError(
        #         'Store data should be in only one term')
        fee_term_date_validation(self, feetype)
        rate = 0
        is_transport = True if fee_data.fee_type.codename == TRANSPORT_CODENAME else False
        if is_transport:
            fee_standard_mapping_to_update.append({'id': feetype['id'], 'amount': feetype['amount']})
        if is_transport and float(feetype['amount']) >= 13.0:
            raise exceptions.ValidationError(
                f'{feetype["fee_type_name"]} {terms["terms"]} months should be less than 12')
        for terms in feetype['standard_fee']:
            if float(terms['rate']) <= 0.0:
                raise exceptions.ValidationError(
                    f'{feetype["fee_type_name"]} {terms["terms"]} amount should be greater than 0.')
            is_fee_fine_rate_empty = True if (
                'fee_fine_rate' not in terms or not terms['fee_fine_rate']) else False
            is_fee_fine_freq_empty = True if (
                'fee_fine_frequency_in_days' not in terms or not terms['fee_fine_frequency_in_days']) else False
            is_max_fin_fee_empty = True if (
                'max_fee_fine_rate' not in terms or not terms['max_fee_fine_rate']) else False
            if not (is_fee_fine_rate_empty and is_fee_fine_freq_empty and is_max_fin_fee_empty) and (is_fee_fine_freq_empty or is_fee_fine_freq_empty or is_max_fin_fee_empty):
                raise exceptions.ValidationError(
                    'fee_fine_rate fee_fine_frequency_in_days max_fee_fine_rate this are mandtory')
            if not (is_fee_fine_rate_empty and is_fee_fine_freq_empty and is_max_fin_fee_empty):
                if terms['max_fee_fine_rate'] < terms['fee_fine_rate']:
                    raise exceptions.ValidationError(
                        'max fee find amount is greater than fee fine rate')
            rate += float(terms['rate'])
            terms.update({'standard_fee': feetype['id'], 'rate': terms['rate'],
                          'is_amount': False if is_transport else True,
                          'fee_fine_rate': terms['fee_fine_rate'], 'fee_fine_frequency_in_days': terms['fee_fine_frequency_in_days'],
                          'max_fee_fine_rate': terms['max_fee_fine_rate'], 'term_alias': terms['term_alias'] if 'term_alias' in terms else None,
                          'additional_charge_data': terms['additional_charge_data'] if 'additional_charge_data' in terms else {}
                          })
        if not is_transport and rate != fee_data.amount:
            raise exceptions.ValidationError(
                f'{feetype["fee_type_name"]} Amount/Terms are not equal!')
        elif is_transport and rate != feetype['amount']:
            raise exceptions.ValidationError(
                f'{feetype["fee_type_name"]} Number of months are not equal!')
        SharedService.duplicate_list_two_objects(
            feetype['standard_fee'], 'standard_fee', 'terms')
    with transaction.atomic(using=get_current_db_name()):
        additional_data_save = {'data_list': []}
        deletable_fee_plan_ids = []
        for feetype in data:
            saving_fee_plan_ids = set()
            for fee_term in feetype['standard_fee']:
                if 'id' in fee_term and fee_term['id']:
                    fee_plan_instance = FeePlan.objects.get(id=fee_term['id'])
                    fee_plan_ser = FeePlanSerializer(instance=fee_plan_instance, data=fee_term)
                    fee_plan_ser.is_valid(raise_exception=True)
                    fee_plan_saved_data = fee_plan_ser.save()
                else:
                    fee_plan_ser = FeePlanSerializer(data=fee_term)
                    fee_plan_ser.is_valid(raise_exception=True)
                    fee_plan_saved_data = fee_plan_ser.save()
                additional_charge_data = fee_term.get('additional_charge_data', [])
                if additional_charge_data and 'data_list' in additional_charge_data and additional_charge_data['data_list']:
                    for addition_charge in additional_charge_data['data_list']:
                        addition_charge.update({'fee_plan': fee_plan_saved_data.id})
                        additional_data_save['data_list'].append(addition_charge)
                saving_fee_plan_ids.add(fee_plan_saved_data.id)
            deleted_ids = set(feetype['existing_fee_plans'].keys()) - saving_fee_plan_ids
            if deleted_ids:
                deletable_fee_plan_ids += deleted_ids
        if deletable_fee_plan_ids:
            if PaymentDetail.objects.filter(
                fee_plan__in=deletable_fee_plan_ids
            ).values():
                raise exceptions.ValidationError('Not able to delete the fee plan. Fees Already collected for the fee plan')
            FeePlan.objects.filter(id__in=deletable_fee_plan_ids).delete()
        for fee_standard_mapping in fee_standard_mapping_to_update:
            FeeStandardMapping.objects.filter(id=fee_standard_mapping['id']).update(
                amount=fee_standard_mapping['amount']
            )
        if 'data_list' in additional_data_save and additional_data_save['data_list']:
            add_additional_charge_mapping(self, additional_data_save['data_list'])
    return {'Reason': 'Data Updated Successfully!'}


def add_initial_counter_data(queryset, data):
    our_config = CounterService.COUNTERS['FEE_RECEIPT_FEE_TYPE']
    counter_data = []
    existing_counter = {counter['object_id']: counter for counter in Counter.objects.filter(
        type=our_config['type'], academic_year=data['academic_year']
    ).values()}
    for fee_data in queryset.values('fee_type_id', 'fee_type__codename').distinct():
        data_to_save = {}
        data_to_save['academic_year'] = data['academic_year']
        data_to_save['value'] = 1
        data_to_save['alias_name'] = our_config['alias_name']
        data_to_save['prefix'] = our_config['prefix']
        data_to_save['postfix'] = our_config['postfix']
        data_to_save['object_id'] = fee_data['fee_type_id']
        if fee_data['fee_type__codename'] == 'df_and_others_gurukula': #hardcode for gurukula
            prefix_hard_coded = 'ADMLO'
            prefix_hard_coded_new = 'ADMLN'
            old_student = our_config['type'] + 'O'
            new_student = our_config['type'] + 'N'
            temp_existing_counter_o = {counter['object_id']: counter for counter in Counter.objects.filter(
                type=old_student, academic_year=data['academic_year']
            ).values()}#nikhil change code later
            temp_existing_counter_n = {counter['object_id']: counter for counter in Counter.objects.filter(
                type=new_student, academic_year=data['academic_year']
            ).values()}#nikhil change code later
            if fee_data['fee_type_id'] not in temp_existing_counter_o:
                temp = copy.deepcopy(data_to_save)
                temp['type'] = old_student
                temp['prefix'] = prefix_hard_coded
                counter_data.append(
                    temp
                )
            if fee_data['fee_type_id'] not in temp_existing_counter_n:
                temp = copy.deepcopy(data_to_save)
                temp['type'] = new_student
                temp['prefix'] = prefix_hard_coded_new
                counter_data.append(
                    temp
                )
            else:
                if temp_existing_counter_o[fee_data['fee_type_id']]['type'] != old_student:
                    temp = copy.deepcopy(data_to_save)
                    temp['type'] = old_student
                    temp['prefix'] = prefix_hard_coded
                    counter_data.append(
                        temp
                    )
                if temp_existing_counter_n[fee_data['fee_type_id']]['type'] != new_student:
                    temp = copy.deepcopy(data_to_save)
                    temp['type'] = new_student
                    temp['prefix'] = prefix_hard_coded_new
                    counter_data.append(
                        temp
                    )
        else:
            if fee_data['fee_type_id'] not in existing_counter:
                temp = copy.deepcopy(data_to_save)
                temp['type'] = our_config['type']
                counter_data.append(
                    temp
                )
    if counter_data:
        serializer = CounterSerializer(data=counter_data, many=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()


def fee_approve(self, data):
    queryset = self.get_queryset().filter(academic_year=data['academic_year'], standard=data['standard'],
                                          student_type=data['student_type'])
    if queryset.filter(is_approved='1'):
        raise exceptions.ValidationError('Fee plan is already Approved!')
    # if queryset.filter(fee_type__codename=TRANSPORT_CODENAME) and (
    #         not RoutePricePlan.objects.filter(academic_year=data['academic_year'], standard=data['standard'],
    #                                           is_active=True)):
    #     raise exceptions.ValidationError(
    #         'Please plan the transport fee in Transport section!')
    detail = queryset.first()
    # if not queryset.filter(is_mandatory=1):
    #     raise exceptions.ValidationError(
    #         'Any one of the fees should be mandatory')
    with transaction.atomic(using=get_current_db_name()):
        # create the counter for each fee type on approve built for gurukula
        if FormdefinitionService.get_formdefintion_data(self, 'counter_confgiruation', 'fee_receipt_fee_type'):
            add_initial_counter_data(queryset, data)
    if queryset.update(is_approved='1'):
        SharedService.custom_thread(approve_notification, self, detail)
        return {
        'Reason': f'Fee plan is Approved for {detail.standard.name} in the Academic Year {detail.academic_year.start_date.year}-{detail.academic_year.end_date.year}'}
    raise exceptions.ValidationError('No data found!')


def approve_notification(self, detail):
    send_notification('approve_create',
                      body=f'Hi,<br/><br/>Fee plan is approved for the {detail.standard.name} in the Academic year '
                           f'{detail.academic_year.start_date.year}-{detail.academic_year.end_date.year}.'
                           f'<br/><br/>Thanks',
                      touserIds=[self.request.user.pk], pushData={'extra_params': {'heading': 'Fee(s) Approved'}})


def get_fee_plan(self, academic_year=None, standard_id=None, queryset=None):
    response = {'data': {}}
    filter_query = {}
    if not queryset:
        queryset = self.filter_queryset(self.get_queryset())
    if self.request.query_params.get('student_type'):
        filter_query['student_type__startswith'] = self.request.query_params.get('student_type')
    response['data']['plan'] = self.get_serializer(queryset, many=True).data
    for data in response['data']['plan']:
        is_transport = True if data['codename'] == 'transport' else False
        for fee in data['standard_fee']:
            if is_transport:
               amount = fee['rate']
            else:
                amount = fee['rate'] if fee['is_amount'] else calculations.convert_percentage_to_amount(
                    data['amount'], fee['rate'])
            fee.update({'amount': amount, 'fee_standard_mapping_id': data['id']})
    if self.request.GET.get('academic_year', academic_year):
        queryset = AcademicYear.objects.get(
            id=self.request.GET.get('academic_year', academic_year))
        response['data'].update(
            {'academic_year_value': AcademicYearViewSerializer(queryset).data['name']})
    if self.request.GET.get('standard', standard_id):
        queryset = Standard.objects.get(
            id=self.request.GET.get('standard', standard_id))
        response['data'].update(
            {'standard_name': StandardSerializer(queryset).data['name']})
    return response

"""
fee_group_wise_pending_amount->used to show the group amount paid summary
"""
def arrange_fee_plan_group_wise(self, fee_plan_data, fee_group_wise_pending_amount={}, fee_group_wise_student_fee_plan={},fee_collection_created=None):
    fee_plan_group_data = {}
    group_name_list = {}
    for fee_type in fee_plan_data:
        if 'fee_group' not in fee_type:
            fee_type['fee_group'] = ''
        if fee_type['fee_group'] not in fee_plan_group_data:
            group_data = {
                'fee_group_name': None,
                'fee_group_code_name': None,
                'fee_group': None,
                'fee_types': [],
                'total_discount': 0,
                'discount_list': []
            }
            if fee_type['fee_group']:
                group_data['fee_group_name'] = fee_type['fee_group_name']
                group_data['fee_group_code_name']  = fee_type['fee_group_code_name']
                group_data['fee_group'] = fee_type['fee_group']
            fee_plan_group_data[fee_type['fee_group']] = group_data
            temp = copy.deepcopy(group_data)
            del temp['fee_types']
            group_name_list[fee_type['fee_group']] = temp
        fee_plan_group_data[fee_type['fee_group']]['fee_types'].append(fee_type)
        if 'standard_fee' in fee_type:
            for standard_fee in fee_type['standard_fee']:
                fee_plan_group_data[fee_type['fee_group']]['total_discount'] += standard_fee['adjustment_amount'] if 'adjustment_amount' in standard_fee else 0
                fee_plan_group_data[fee_type['fee_group']]['discount_list'] += standard_fee['adjustment_list'] if 'adjustment_list' in standard_fee else []
        if fee_type['fee_group'] in fee_group_wise_pending_amount: #only used for invoice
            fee_plan_group_data[fee_type['fee_group']]['adjustment_list']=[]
            fee_plan_group_data[fee_type['fee_group']]['adjustment_list_till_date']=[]
            fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_till_date'] = 0
            fee_plan_group_data[fee_type['fee_group']]['adjustment_list_at_fee_collection']=[]
            fee_plan_group_data[fee_type['fee_group']]['adjustment_list_at_fee_collection_till_date']=[]
            fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_at_fee_collection_till_date'] = 0
            fee_plan_group_data[fee_type['fee_group']]['concession_list']=[]
            fee_plan_group_data[fee_type['fee_group']]['concession_list_till_date']=[]
            fee_plan_group_data[fee_type['fee_group']]['concession_amount_till_date'] = 0
            fee_plan_group_data[fee_type['fee_group']]['group_amount_paid'] = fee_group_wise_pending_amount[fee_type['fee_group']]['amount_paid']
            fee_plan_group_data[fee_type['fee_group']]['group_amount_pending'] = fee_group_wise_pending_amount[fee_type['fee_group']]['pending_amount']
            fee_plan_group_data[fee_type['fee_group']]['group_amount_pending_till_date'] = fee_group_wise_pending_amount[fee_type['fee_group']]['pending_amount_till_date']
            fee_plan_group_data[fee_type['fee_group']]['group_total_amount'] = fee_group_wise_pending_amount[fee_type['fee_group']]['total_payable_amount']
            fee_plan_group_data[fee_type['fee_group']]['paid_amount_in_words'] = f"{num2words(fee_group_wise_pending_amount[fee_type['fee_group']]['amount_paid'], lang='en')} Rupees"
            for fee_adjustment in fee_group_wise_student_fee_plan[fee_type['fee_group']]:
                if fee_adjustment['concession_amount']>0:
                    for fee_concession_list in fee_adjustment['concession_list']:
                        fee_plan_group_data[fee_type['fee_group']]['concession_amount'] = fee_concession_list['amount']
                        fee_plan_group_data[fee_type['fee_group']]['concession_list'].append(fee_concession_list)
                        if fee_concession_list['created'].strftime('%Y-%m-%d %H:%M:%S')<=fee_collection_created:
                            fee_plan_group_data[fee_type['fee_group']]['concession_amount_till_date'] += fee_concession_list['amount']
                            fee_plan_group_data[fee_type['fee_group']]['concession_list_till_date'].append(fee_concession_list)
                if fee_adjustment['adjustment_amount']>0:
                    for fee_adjustment_list in fee_adjustment['adjustment_list']:
                        fee_plan_group_data[fee_type['fee_group']]['adjustment_amount'] = fee_adjustment_list['amount']
                        fee_plan_group_data[fee_type['fee_group']]['adjustment_list'].append(fee_adjustment_list)
                        if fee_adjustment_list['created'].strftime('%Y-%m-%d %H:%M:%S')<=fee_collection_created:
                            fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_till_date'] += fee_adjustment_list['amount']
                            fee_plan_group_data[fee_type['fee_group']]['adjustment_list_till_date'].append(fee_adjustment_list)
                if fee_adjustment['adjustment_amount']>0:
                    for fee_adjustment_list in fee_adjustment['adjustment_list']:
                        if fee_adjustment_list['fee_collection_id']:
                            fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_at_fee_collection'] = fee_adjustment_list['amount']
                            fee_plan_group_data[fee_type['fee_group']]['adjustment_list_at_fee_collection'].append(fee_adjustment_list)
                            if fee_adjustment_list['created'].strftime('%Y-%m-%d %H:%M:%S')<=fee_collection_created:
                                fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_at_fee_collection_till_date'] += fee_adjustment_list['amount']
                                fee_plan_group_data[fee_type['fee_group']]['adjustment_list_at_fee_collection_till_date'].append(fee_adjustment_list)
            fee_plan_group_data[fee_type['fee_group']]['group_total_amount_till_date'] = fee_group_wise_pending_amount[fee_type['fee_group']]['total_amount']-fee_plan_group_data[fee_type['fee_group']]['adjustment_amount_till_date']-fee_plan_group_data[fee_type['fee_group']]['concession_amount_till_date']
        if fee_type['fee_group'] in fee_group_wise_student_fee_plan:
            fee_plan_group_data[fee_type['fee_group']]['fee_structure'] = fee_group_wise_student_fee_plan[fee_type['fee_group']]
            if 'fee_type_mapping' not in fee_plan_group_data[fee_type['fee_group']]:
                fee_plan_group_data[fee_type['fee_group']]['fee_type_mapping'] =  {}
            if fee_type['id'] not in fee_plan_group_data[fee_type['fee_group']]['fee_type_mapping']:
                total_amount = 0
                amount_paid = 0
                total_pending_amount = 0
                for standard_fee in fee_group_wise_student_fee_plan[fee_type['fee_group']]:
                    if not standard_fee['is_disabled']:
                        if fee_type['fee_type'] == standard_fee['fee_type']:
                            total_amount += standard_fee['total_amount']
                            total_pending_amount += standard_fee['pending_amount']
                            for payment_det in standard_fee['payment_detail']:
                                amount_paid += payment_det['amount_paid']
                fee_plan_group_data[fee_type['fee_group']]['fee_type_mapping'][fee_type['id']] = {'total_payable_amount': total_amount,
                    'currently_paid_amount': 0, 'pending_amount': total_pending_amount,'fee_type': fee_type['fee_type'],
                    'fee_type_name': fee_type['fee_type_name'],'total_amount_paid': amount_paid, 
                }
            fee_plan_group_data[fee_type['fee_group']]['fee_type_mapping'][fee_type['id']]['currently_paid_amount'] += fee_type['amount_paid']
    return fee_plan_group_data, group_name_list.values()

def get_student_fee_data(self, student, academic_year, standard):
    queryset = Student.objects.filter(id=student).first()
    if not queryset:
        raise exceptions.ValidationError('Student is not present.')
    student_serializer = StudentListSerializer(queryset)
    paid_data = calculations.paid_data_and_status(self,
        student, academic_year, standard)
    adjustment_fee = Concession.objects.filter(is_active=True, academic_year=academic_year,
                                               concession_adjustment__student=student).distinct().values(
        'concession_adjustment__reason_id', 'concession_type__name').first()
    if adjustment_fee:
        concession_reason = adjustment_fee['concession_adjustment__reason_id']
        concession_type = adjustment_fee['concession_type__name']
    else:
        concession_reason = concession_type = None
    return_data = {}
    return_data={'data': {'total_concession_amount': paid_data['concession_amount'], 'total_amount': paid_data['total_amount'],
                     'total_adjusted_amount': paid_data['total_adjusted_amount'],'total_adjusted_amount_at_fee_collection': paid_data['total_adjusted_amount_at_fee_collection'],
                     'plans': paid_data['data'],'adjustment_list':paid_data['adjustment_list'],
                     'total_pending_amount': paid_data['pending_amount'], 'is_paid_full_fee': paid_data['is_paid'],
                     'amount': paid_data['amount'], 'student': student_serializer.data, 'total_fine_amount': paid_data['total_fine_amount'],
                     'concession_reason': concession_reason, 'concession_type': concession_type, 
                     'total_paid_amount': paid_data['paid_amount']}}
    is_hide_fee_types_from_app = FormdefinitionService.get_formdefintion_data(self, 'fee_configurations', 'hide_fee_types_from_app')
    if is_hide_fee_types_from_app and self.request.GET.get('app_type') == 'student':
        hide_fee_plan_data={'amount':0,'total_amount':0,'total_adjusted_amount':0,'total_concession_amount':0,'total_fine_amount':0,
                            'total_paid_amount':0,'total_pending_amount':0,'plans':[]}
        for plan in paid_data['data']:
            temp_hide_fee_plan=copy.deepcopy(plan)
            temp_hide_fee_plan['adjustment']=0
            temp_hide_fee_plan['amount']=0
            temp_hide_fee_plan['concession_amount'] =0
            temp_hide_fee_plan['pending_amount']=0
            temp_hide_fee_plan['total_amount']=0
            temp_hide_fee_plan['total_paid_amount']=0    
            temp_hide_fee_plan['total_payable_amount']=0
            temp_hide_fee_plan['standard_fee']=[]
            for standard_fee in plan['standard_fee']:
                if not standard_fee['hide_from_app']:
                    temp_hide_fee_plan['standard_fee'].append(standard_fee)
                    temp_hide_fee_plan['adjustment']+=standard_fee['adjustment_amount']
                    temp_hide_fee_plan['amount']+=standard_fee['amount']
                    temp_hide_fee_plan['concession_amount']+=standard_fee['concession_amount']
                    temp_hide_fee_plan['pending_amount']+=standard_fee['pending_amount']
                    temp_hide_fee_plan['total_amount']+=standard_fee['total_amount']
                    temp_hide_fee_plan['total_paid_amount']+=standard_fee['paid_amount']
                    temp_hide_fee_plan['total_payable_amount']+=standard_fee['amount']
                    hide_fee_plan_data['amount']+=standard_fee['amount']
                    hide_fee_plan_data['total_amount']+=standard_fee['total_amount']
                    hide_fee_plan_data['total_adjusted_amount']+=standard_fee['adjustment_amount']
                    hide_fee_plan_data['total_concession_amount']+=standard_fee['concession_amount']
                    hide_fee_plan_data['total_fine_amount']+=standard_fee['total_fine_amount']
                    hide_fee_plan_data['total_paid_amount']+=standard_fee['paid_amount']
                    hide_fee_plan_data['total_pending_amount']+=standard_fee['pending_amount']
            if temp_hide_fee_plan['standard_fee']:
                hide_fee_plan_data['plans'].append(temp_hide_fee_plan)
        return_data['app_hided_data'] = hide_fee_plan_data
    return return_data


def get_fee_term_plan_student_list(self):
    student = self.request.GET.get('student')
    standard = self.request.GET.get('standard')
    academicYear = self.request.GET.get('academic_year')
    return get_student_fee_data(self, student, academicYear, standard)


def add_store_selling_price_finance(self, data):
    serializer = FeeStandardMappingItemSellingPriceSerializer(
        data=data, many=True)
    serializer.is_valid(raise_exception=True)
    serializer.save()
    return {'Reason': 'Data Saved Successfully'}


"""
    here the response should be the feeplan data
    Prepares the feeplan data with the automatic concession data
"""


def apply_automatic_concession_to_fee_plan(plans):
    fee_standard_mapping = []
    for fee_data in plans:
        for standard_fee in fee_data['standard_fee']:
            fee_standard_mapping.append(
                standard_fee['id']
            )
    concession_data = FeePlanConcessionMapping.objects.filter(fee_plan__in=fee_standard_mapping).values(
        'fee_plan__standard_fee', 'fee_plan', 'concession_amount', 'master', 'master__concession_type__name',
        'master__concession_type', 'id', 'master__concession_type__code'
    )
    concession_mapping_data = {}
    for row_data in concession_data:
        if row_data['fee_plan'] not in concession_mapping_data:
            concession_mapping_data[row_data['fee_plan']] = {
                'master_data': {
                    'concession_type': row_data['master__concession_type'],
                    'concession_type_name': row_data['master__concession_type__name'],
                    'concession_type_code': row_data['master__concession_type__code'],
                    'id': row_data['master']
                },
                'fee_plan_mapping': []
            }
        temp = {
            'fee_plan': row_data['fee_plan'],
            'concession_amount': row_data['concession_amount'],
            'id': row_data['id']
        }
        concession_mapping_data[row_data['fee_plan']
                                ]['fee_plan_mapping'] = temp
    # automatic means concession configured for fee term
    automatic_concession_details = None
    for fee_data in plans:
        for standard_fee in fee_data['standard_fee']:
            if standard_fee['id'] in concession_mapping_data:
                if 'automatic_concession_data' not in standard_fee:
                    standard_fee['automatic_concession_data'] = {
                        'concession_fee_plan_mapping': {},
                        'concession_master_data': concession_mapping_data[standard_fee['id']]['master_data']
                    }
                    automatic_concession_details = {
                        'id': concession_mapping_data[standard_fee['id']]['master_data']['concession_type'],
                        'name': concession_mapping_data[standard_fee['id']]['master_data']['concession_type_name'],
                        'code': concession_mapping_data[standard_fee['id']]['master_data']['concession_type_code']
                    }
                standard_fee['automatic_concession_data']['concession_fee_plan_mapping'] = concession_mapping_data[standard_fee['id']]['fee_plan_mapping']
    return plans, automatic_concession_details


def validate_apply_automatic_concession(
    self, total_amount, payment_total_amount, apply_automatic_concession_total_amount,
    concession_type
):
    concession_obj = ConcessionType.objects.get(
        id=concession_type
    )
    if not concession_obj.code:
        raise exceptions.ValidationError(
            'This is not the automatic concession type')
    if concession_obj.code == 'one_time_payment':
        pass
        # if total_amount != (payment_total_amount + apply_automatic_concession_total_amount):
        #     raise exceptions.ValidationError(
        #         'User has to pay full fees to apply the full payment concession type')
    else:
        raise exceptions.ValidationError('Unhanled concession Type')

def add_fee_group_type(self, data):
    SharedService.duplicate_list_one_object(data, 'name')
    response = SharedService.add_data(self, data)
    return response

def update_fee_group_type(self, data, **kwargs):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(fee_standard_mapping_fee_group__isnull=False):
        if queryset.filter(fee_standard_mapping_fee_group__is_approved='1'):
            raise exceptions.ValidationError(
                'Fee type is planned and Approved.')
    response = SharedService.update_data(self, data, **kwargs)
    return response

def delete_fee_group_type(self):
    queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if queryset.filter(fee_standard_mapping_fee_group__isnull=True):
        queryset.delete()
        return {'Reason': 'Data deleted successfully!'}
    raise exceptions.ValidationError(
        'Cannot delete some instances of data are referenced.')

def update_fee_type_category(self, data):
    filters = {
            'fee_category_fee_standard_section_mapping_fee_category__isnull': True,
            'fee_category_fee_standard_section_mapping_fee_category__is_active': False
            }
    instance = self.get_queryset().filter(id=self.kwargs['pk'])
    if instance.filter(**filters):
        raise exceptions.ValidationError('Cannot update some instances of data are referenced.')
    response = SharedService.update_data(self, data)
    return response

def delete_feetype_category(self):
    filters = {
        'fee_category_fee_standard_section_mapping_fee_category__isnull': True,
        'fee_category_fee_standard_section_mapping_fee_category__is_active': False  
    }
    self.queryset = self.get_queryset().filter(id=self.kwargs['pk'])
    if self.queryset.filter(**filters):
        raise exceptions.ValidationError('Cannot delete some instances of data are referenced.')
    response = SharedService.soft_delete_data(self)
    return response

def get_fee_plan_data(academic_year, standard_ids):
    fee_standard_data = FeeStandardMapping.objects.filter(standard__in=standard_ids, academic_year=academic_year).values(
        'academic_year', 'standard', 'fee_type', 'fee_type__name', 'amount', 'id'
    )
    fee_standard_ids = set()
    for fee_standard in fee_standard_data:
        fee_standard_ids.add(fee_standard['id'])
    fee_plan_data = FeePlan.objects.filter(standard_fee__in=fee_standard_ids).values()
    fee_standard_plan_mapping = {}
    fee_plan_ids = []
    for fee_plan_row in fee_plan_data:
        fee_plan_row['feecategoryfeestandardsectionmapping_sections'] = {}
        fee_plan_ids.append(fee_plan_row['id'])
        if fee_plan_row['standard_fee_id'] not in fee_standard_plan_mapping:
            fee_standard_plan_mapping[fee_plan_row['standard_fee_id']] = []
        fee_standard_plan_mapping[fee_plan_row['standard_fee_id']].append(
            fee_plan_row
        )
    for fee_standard in fee_standard_data:
        fee_standard['standard_fee_data'] = []
        if fee_standard['id'] in fee_standard_plan_mapping:
            fee_standard['standard_fee_data'] = fee_standard_plan_mapping[fee_standard['id']]
    return {'fee_standard_data': fee_standard_data, 'fee_plan_ids': fee_plan_ids}

def fee_category_fee_standard_section_add_data(self, data):
    data_to_update = []
    standard_ids = []
    given_standard_section_ids = set()
    data_to_save = []
    academic_year_unique_check = set()
    for given_data in data['fee_term_standard_section_mapping']:
        if not given_data['fee_category']:
            raise exceptions.ValidationError('Category is mandatory')
        given_standard_section_ids.add(given_data['standard_section'])
    standard_section_data = StandardSectionMapping.objects.filter(id__in=given_standard_section_ids).values('standard', 'academic_year_id')
    standard_ids = set()
    for standard_section in standard_section_data:
        academic_year_unique_check.add(standard_section['academic_year_id'])
        standard_ids.add(standard_section['standard'])
    if len(academic_year_unique_check)>1:
        raise exceptions.ValidationError('Only One Academic Year Data can be added')
    fee_term_data = get_fee_plan_data(list(academic_year_unique_check)[0], standard_ids)
    #validate Given Data 
    for row_data in data['fee_term_standard_section_mapping']:
        if row_data['fee_plan'] not in fee_term_data['fee_plan_ids']:
            raise exceptions.ValidationError('Invalid Fee Plan Data')
        if 'id' in row_data and row_data['id']:
            data_to_update.append(
                {
                'fee_category': row_data['fee_category'],
                'fee_plan': row_data['fee_plan'],
                'standard_section': row_data['standard_section'],
                'id': row_data['id']
                }
            )
        else:
            data_to_save.append(
                {
                    'fee_category': row_data['fee_category'],
                    'fee_plan': row_data['fee_plan'],
                    'standard_section': row_data['standard_section'],
                }
            )
    with transaction.atomic(using=get_current_db_name()):
        if data['deletable_ids']:
            FeeCategoryFeeStandardSectionMapping.objects.filter(
                id__in=data['deletable_ids']
            ).update(is_active=False)
        if data_to_update:
            for row_data in data_to_update:
                obj = FeeCategoryFeeStandardSectionMapping.objects.get(
                    id=row_data['id']
                )
                serializer = FeeCategoryFeeStandardSectionMappingSerializer(instance=obj, data=row_data)
                serializer.is_valid(raise_exception=True)
                serializer.save()
        if data_to_save:
            serializer = FeeCategoryFeeStandardSectionMappingSerializer(data=data_to_save, many=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
    return {'Reason': 'Data Saved Successfully'}

def get_fee_category_fee_standard_section_data(self, academic_year, standard_id):
    standard_section_ids = []
    fee_term_data_mapping = []
    fee_term_data = get_fee_plan_data(academic_year, [standard_id])
    standard_section_mapping = StandardSectionMapping.objects.filter(academic_year=academic_year, standard=standard_id).values(
        'id', 'standard__name', 'standard', 'section', 'section__name'
    )
    standard_and_section_mapping = {}
    section_details = {}
    standard_data = {}
    for standard_section in standard_section_mapping:
        standard_data = {'standard_name': standard_section['standard__name'], 'standard': standard_section['standard']}
        standard_section_ids.append(standard_section['id'])
        if standard_section['standard'] not in standard_and_section_mapping:
            standard_and_section_mapping[standard_section['standard']] = []
        section_details[standard_section['id']] = standard_section
        standard_and_section_mapping[standard_section['standard']].append(standard_section)
    existing_data = FeeCategoryFeeStandardSectionMapping.objects.filter(standard_section__in=standard_section_ids, is_active=True).values(
        'id', 'fee_category', 'fee_plan_id', 'standard_section_id', 'fee_category__name'
    )
    selected_existing_section = {}
    for existing in existing_data:
        if existing['fee_plan_id'] not in selected_existing_section:
            selected_existing_section[existing['fee_plan_id']] = {existing['standard_section_id']:{}}
        existing['standard_name'] = section_details[existing['standard_section_id']]['standard__name']
        existing['standard_id'] = section_details[existing['standard_section_id']]['standard']
        existing['section_id'] = section_details[existing['standard_section_id']]['section']
        existing['section_name'] = section_details[existing['standard_section_id']]['section__name']
        selected_existing_section[existing['fee_plan_id']][existing['standard_section_id']] = existing
    for standard_section in standard_section_mapping:
        for i, fee_term in enumerate(fee_term_data['fee_standard_data']):
            fee_term_temp = copy.copy(fee_term)
            data1 = []
            for index, fee_plan in enumerate(fee_term_temp['standard_fee_data']):
                fee_plan_temp = copy.copy(fee_plan)
                
                if fee_plan['id'] in selected_existing_section and standard_section['id'] in selected_existing_section[fee_plan['id']]:
                    data = copy.deepcopy(selected_existing_section[fee_plan['id']][standard_section['id']])
                    fee_plan_temp['feecategoryfeestandardsectionmapping_sections'] = data
                data1.append(fee_plan_temp)
            fee_term['standard_fee_data'] = data1
        temp_standard_section = copy.copy(fee_term_data['fee_standard_data'])
        standard_section['fee_plan_data'] = temp_standard_section
        fee_term_data_mapping.append(standard_section)
    standard_data['fee_term_data'] = fee_term_data_mapping
    return {'data': standard_data}

def download_fee_plan_pdf(self, academic_year_id, standard_ids):

    if not academic_year_id or not standard_ids:
        raise exceptions.ValidationError('academic_year and standard are required.')

    institute = Institute.objects.first()

    academic_year_obj = AcademicYear.objects.get(id=academic_year_id)
    academic_year_name = f"{academic_year_obj.start_date.year}-{academic_year_obj.end_date.year}"

    standard_id_list = [int(s) for s in str(standard_ids).split(',') if s]

    standards = Standard.objects.filter(id__in=standard_id_list).order_by('sequence')

    if not standards.exists():
        raise exceptions.ValidationError('No valid standards found.')

    standards_data = []

    for standard in standards:

        fee_standard_mappings = FeeStandardMapping.objects.filter(
            academic_year=academic_year_id,
            standard=standard.id,
        ).select_related('fee_type', 'student_group')

        if not fee_standard_mappings.exists():
            continue

        # Build composite groups matching frontend's buildGroupedFeeTypes logic
        group_map = OrderedDict()

        for mapping in fee_standard_mappings:
            if mapping.fee_type.codename == TRANSPORT_CODENAME:
                continue

            # Build composite group key from student_group + gender + is_new_student
            parts = []
            name_parts = []

            if mapping.student_group:
                parts.append(f'sg_{mapping.student_group_id}')
                name_parts.append(mapping.student_group.name)

            if mapping.gender and mapping.gender != 'all':
                parts.append(f'g_{mapping.gender}')
                name_parts.append(mapping.gender)

            if mapping.is_new_student is not None:
                parts.append(f'ns_{mapping.is_new_student}')
                name_parts.append('New Student' if mapping.is_new_student else 'Old Student')

            group_id = '_'.join(parts) if parts else 'all'
            group_name = ' · '.join(name_parts) if name_parts else 'General'

            if group_id not in group_map:
                group_map[group_id] = {
                    'id': group_id,
                    'name': group_name,
                    'total': 0,
                }

        # Sort: "all" first, then alphabetical
        student_groups = sorted(
            group_map.values(),
            key=lambda g: (0 if g['id'] == 'all' else 1, g['name'])
        )

        # Build fee type rows with amounts per composite group
        fee_type_rows = OrderedDict()

        for mapping in fee_standard_mappings:
            if mapping.fee_type.codename == TRANSPORT_CODENAME:
                continue

            ft_name = mapping.fee_type.name

            # Rebuild composite group key
            parts = []
            if mapping.student_group:
                parts.append(f'sg_{mapping.student_group_id}')
            if mapping.gender and mapping.gender != 'all':
                parts.append(f'g_{mapping.gender}')
            if mapping.is_new_student is not None:
                parts.append(f'ns_{mapping.is_new_student}')
            group_id = '_'.join(parts) if parts else 'all'

            if ft_name not in fee_type_rows:
                fee_type_rows[ft_name] = {
                    'name': ft_name,
                    'is_mandatory': mapping.is_mandatory == '1',
                    'amounts': {},
                }

            fee_type_rows[ft_name]['amounts'][group_id] = mapping.amount

        fee_rows = list(fee_type_rows.values())

        # Calculate totals per group
        for sg in student_groups:
            sg_id = sg['id']
            sg['total'] = sum(row['amounts'].get(sg_id, 0) for row in fee_rows)

        # Build group_amounts arrays for template
        for row in fee_rows:
            row['group_amounts'] = [
                row['amounts'].get(sg['id'], 0) for sg in student_groups
            ]

        standards_data.append({
            'standard_name': standard.name,
            'student_groups': student_groups,
            'fee_rows': fee_rows,
        })

    if not standards_data:
        raise exceptions.ValidationError('No fee plans found for selected standards.')

    context = {
        'institute': institute,
        'academic_year_name': academic_year_name,
        'standards_data': standards_data,
        'generated_date': datetime.now().strftime('%d-%b-%Y %I:%M %p'),
    }

    filename = f"Fee_Plan_{academic_year_name}_Multiple"

    template_path = 'fee_plan/default_fee_plan_pdf.html'

    response = PDFService.receipt_new(self, context, filename, template_path, False)
    return response