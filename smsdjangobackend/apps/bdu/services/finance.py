import copy

from apps.bdu.services.error import common_response, error_validation
from apps.finance.services import fee_plan
from apps.finance.services.fee_collection import add_fee_collection
from apps.finance.services.fee_plan import get_student_fee_data
from apps.shared.services import ConfigurationService
from apps.students.services.student import get_student_id_fuzzy
from apps.tenants.services.middlewares import get_current_db_name
from apps.transport.models.route import RouteArea, RoutePrice
from apps.transport.serializers import AreaPriceSerializer, RouteAreaSerializer, RoutePriceSerializer
from apps.transport.services.route import add_area, add_price, validate_add_and_update_area_data
from django.db import transaction
from datetime import datetime, date

from rest_framework import exceptions

def split_amount_across_terms(amount_to_allocate, fee_plan_data):
    allocated_terms = []
    total_term_pending = 0
    remaining_amount = amount_to_allocate
    for plan in fee_plan_data.get('data', {}).get('plans', []):
        for term in plan.get('standard_fee', []):
            if not term.get('allow_fee_collection', False):
                continue

            term_pending = float(term['pending_amount'])
            total_term_pending+=term_pending

            if term_pending <= 0:
                continue

            pay_now = min(remaining_amount, term_pending)

            allocated_terms.append({
                "fee_plan": term["id"],
                "amount_paid": pay_now,
                "pending_amount": round(term_pending - pay_now, 2)
            })

            remaining_amount -= pay_now

            if remaining_amount <= 0:
                break
        if remaining_amount <= 0:
            break
    if total_term_pending < amount_to_allocate:
        return None
    return allocated_terms

def get_feecollection_payload(academic_year_id, student_id, temp_dict, allocated_terms, receipt_num, receipt_date):
    actual_paid_amount = sum([t["amount_paid"] for t in allocated_terms])

    fee_collection_payload = {
        "academic_year": academic_year_id,
        "student": student_id,
        "mode_of_payment": temp_dict["mode_of_payment"],
        "mode_of_payment_list": [{
            "mode_of_payment": temp_dict["mode_of_payment"],
            "payment_ref_num": temp_dict.get("payment_ref_num", ""),
            "note": temp_dict.get("payment_note", ""),
            "amount": actual_paid_amount
        }],
        "standard_fee": allocated_terms,
        "receipt_num": receipt_num,
        "receipt_date": receipt_date
    }
    return fee_collection_payload


def normalize_receipt_date(receipt_date):
    if not receipt_date:
        return None
    if isinstance(receipt_date, str):
        return datetime.strptime(receipt_date.split(" ")[0], "%Y-%m-%d").date()
    if isinstance(receipt_date, datetime):
        return receipt_date.date()
    if isinstance(receipt_date, date):
        return receipt_date
    return None


def add_fee_transactions(self, rows, aliasSchemaColumn, schemaColumnAlias):
    global kwargs
    response = {'Reason': dict(), 'error': False}
    schema_rows = list()
    if 'paid_amount' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'paid_amount', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'academic_year' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'academic_year', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'student_name' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'student_name', 'Please make this field as Mandatory',
                                   {2: {}})
    if 'mode_of_payment' not in schemaColumnAlias:
        response = common_response(self, response, 2, 'mode_of_payment', 'Please make this field as Mandatory',
                                   {2: {}})
    for index, row in enumerate(rows, start=2):
        temp_dict = dict()
        error_dict = {index: {}}
        for key, value in row.items():
            temp_dict[aliasSchemaColumn[key]] = value
        standard_id = temp_dict.get('standard_id')  # assuming it's in the data
        academic_year_id = temp_dict.get('academic_year')
        receipt_num = temp_dict.get('receipt_num')
        receipt_date = normalize_receipt_date(temp_dict.get('receipt_date'))
        temp_dict['receipt_date'] = receipt_date
        student_name = temp_dict.get('student_name')
        student_id = get_student_id_fuzzy(student_name, standard_id, academic_year_id)
        if not student_id:
            response = common_response(self, response, index, 'student_name', 'Student Name not found',
                                   {index: {}})
        else:
            temp_dict['student'] = student_id
            fee_type_name = temp_dict.get("fee_type_name")
            fee_plan_data = get_student_fee_data(
                    self,
                    student_id,
                    academic_year_id,
                    standard_id
                )
            if fee_type_name:
                # Normalize for case-insensitive match
                fee_type_name = fee_type_name.strip().lower()
                fee_plan_data_filtered = [
                    fee for fee in fee_plan_data["data"]["plans"]
                    if isinstance(fee, dict) and fee.get("fee_type_name", "").strip().lower() == fee_type_name
                ]

                if not fee_plan_data_filtered:
                    response = common_response(
                        self, response, index, 'fee_type_name',
                        f'Fee Type "{temp_dict.get("fee_type_name")}" not found for student',
                        {index: {}}
                    )
                    continue
                fee_plan_data["data"]["plans"] = fee_plan_data_filtered
            temp_dict['receipt_num'] = receipt_num
            try:
                temp_dict['paid_amount'] = float(temp_dict['paid_amount'])
            except:
                return common_response(self, response, index, 'paid_amount', 'Invalid amount format', {index: {}})
            # allocated_terms = split_amount_across_terms(temp_dict['paid_amount'], fee_plan_data)
            # if not allocated_terms:
            #     response = common_response(self, response, index, 'paid_amount', 'Amount to be Allocated is greater that the pending amount', {index: {}})
            #     continue
            # receipt_date = normalize_receipt_date(row.get('receipt_date'))
            # fee_collection_payload = get_feecollection_payload(academic_year_id, student_id, temp_dict, allocated_terms, receipt_num, receipt_date)
            # try:
            #     add_fee_collection(self, fee_collection_payload, is_validate_only=True, dont_send_notification=True)
            # except Exception as e:
            #     response = common_response(self, response, index, 'fee_collection', f'Error: {str(e)}', {index: {}})
            schema_rows.append(copy.deepcopy(temp_dict))
    if response['Reason']:
        response['error'] = True
        return response
    try:
        with transaction.atomic(using=get_current_db_name()):
            for index, row in enumerate(schema_rows, start=2):
                fee_type_name = row.get("fee_type_name")
                fee_plan_data_original = get_student_fee_data(self, row['student'], row['academic_year'], row['standard_id'])
                if fee_type_name:
                    # Normalize for case-insensitive match
                    fee_type_name = fee_type_name.strip().lower()
                    fee_plan_data_filtered = [
                        fee for fee in fee_plan_data_original["data"]["plans"]
                        if isinstance(fee, dict) and fee.get("fee_type_name", "").strip().lower() == fee_type_name
                    ]

                    if not fee_plan_data_filtered:
                        response = common_response(
                            self, response, index, 'fee_type_name',
                            f'Fee Type "{temp_dict.get("fee_type_name")}" not found for student',
                            {index: {}}
                        )
                        continue
                    fee_plan_data_original["data"]["plans"] = fee_plan_data_filtered
                allocated_terms = split_amount_across_terms(row['paid_amount'], fee_plan_data_original)
                if not allocated_terms:
                    raise exceptions.ValidationError('Amount to be Allocated is greater that the pending amount')
                receipt_date = row.get('receipt_date')
                fee_collection_payload = get_feecollection_payload(row['academic_year'], row['student'], row, allocated_terms, row['receipt_num'], receipt_date)
                result = add_fee_collection(self, fee_collection_payload, dont_send_notification=True)
    except Exception as e:
        response['error'] = True
        response = common_response(self, response, index, 'errornik', e.args, {index: {}})
        return response
    response['Reason'] = 'Data added Successfully!'
    response['error'] = False
    return response