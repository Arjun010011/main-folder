"""
Tally-like Accounting View Service
Provides ledger, day book, trial balance, and financial reports
"""
import os
from datetime import datetime, date
from decimal import Decimal
from django.db.models import Q, Sum, F, Count, Case, When, Value, CharField
from django.db.models.functions import Coalesce
from django.utils import timezone
from collections import defaultdict

from apps.finance.models.feeCollection import FeeCollection, PaymentDetail, ApplicationPaymentDetail
from apps.finance.models.concession import AdjustmentFee, Concession
from apps.finance.models.miscellaneous import MiscellaneousPayment
from apps.expenditure.models import Expense
from apps.finance.models.bankTransaction import BankTransaction
from apps.students.models.student import Student
from apps.institutes.models.academicYear import AcademicYear
from apps.classes.models.standard import Standard
from apps.bdu.services.write_to_excel import write_to_excel_new
from apps.shared.services_shared.store_api_result import store_long_running_process
from apps.shared.services import UploadTypeService


def get_ledger_view(self):
    """
    Get ledger view - account-wise transaction listing
    Similar to Tally's ledger view showing all transactions for each account
    """
    try:
        from_date = self.request.GET.get('from_date')
        to_date = self.request.GET.get('to_date')
        account_type = self.request.GET.get('account_type', 'all')  # all, student, fee_type, expense, bank
        account_id = self.request.GET.get('account_id')
        academic_year_id = self.request.GET.get('academic_year')
        
        # Default date range: current month
        if not from_date:
            from_date = date.today().replace(day=1)
        else:
            from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
        
        ledger_data = []
        
        # Student-wise ledger (Fee Collections)
        if account_type in ['all', 'student']:
            fee_collections = FeeCollection.objects.filter(
                is_active=True,
                transaction_date__gte=from_date,
                transaction_date__lte=to_date
            )
            
            if account_id:
                fee_collections = fee_collections.filter(student_id=account_id)
            
            if academic_year_id:
                fee_collections = fee_collections.filter(
                    payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id
                ).distinct()
            
            for fc in fee_collections.select_related('student'):
                if not fc.student:
                    continue
                
                student_name = f"{fc.student.first_name or ''} {fc.student.middle_name or ''} {fc.student.last_name or ''}".strip()
                student_name = student_name or fc.student.current_reg_num or 'Unknown'
                
                ledger_data.append({
                    'date': fc.transaction_date,
                    'voucher_type': 'Receipt',
                    'voucher_no': fc.receipt_num or f'FC-{fc.id}',
                    'account': f"Student: {student_name}",
                    'account_id': fc.student_id,
                    'account_type': 'student',
                    'particulars': f"Fee Collection - {fc.receipt_num or fc.id}",
                    'debit': 0,
                    'credit': float(fc.total_amount or 0),
                    'balance': 0,  # Will be calculated
                    'mode_of_payment': fc.mode_of_payment,
                    'reference': fc.payment_ref_num,
                    'transaction_id': fc.id,
                    'transaction_model': 'FeeCollection'
                })
        
        # Fee Type-wise ledger
        if account_type in ['all', 'fee_type']:
            payment_details = PaymentDetail.objects.filter(
                fee_collection__is_active=True,
                fee_collection__transaction_date__gte=from_date,
                fee_collection__transaction_date__lte=to_date
            ).select_related('fee_plan__fee_type', 'fee_collection')
            
            if academic_year_id:
                payment_details = payment_details.filter(
                    fee_plan__standard_fee__academic_year_id=academic_year_id
                )
            
            for pd in payment_details:
                if not pd.fee_plan or not pd.fee_plan.fee_type:
                    continue
                
                fee_type_name = pd.fee_plan.fee_type.name
                ledger_data.append({
                    'date': pd.fee_collection.transaction_date,
                    'voucher_type': 'Receipt',
                    'voucher_no': pd.fee_collection.receipt_num or f'FC-{pd.fee_collection_id}',
                    'account': f"Fee Type: {fee_type_name}",
                    'account_id': pd.fee_plan.fee_type_id,
                    'account_type': 'fee_type',
                    'particulars': f"{pd.fee_collection.student.first_name if pd.fee_collection.student else 'N/A'} - {fee_type_name}",
                    'debit': 0,
                    'credit': float(pd.amount_paid or 0),
                    'balance': 0,
                    'mode_of_payment': pd.fee_collection.mode_of_payment,
                    'reference': pd.fee_collection.payment_ref_num,
                    'transaction_id': pd.id,
                    'transaction_model': 'PaymentDetail'
                })
        
        # Expense ledger
        if account_type in ['all', 'expense']:
            expenses = Expense.objects.filter(
                is_active=True,
                date__gte=from_date,
                date__lte=to_date
            )
            
            if account_id:
                expenses = expenses.filter(expense_plan_id=account_id)
            
            for exp in expenses.select_related('expense_plan'):
                expense_name = exp.expense_plan.name if exp.expense_plan else 'General Expense'
                ledger_data.append({
                    'date': exp.date,
                    'voucher_type': 'Payment',
                    'voucher_no': exp.receipt_num or f'EXP-{exp.id}',
                    'account': f"Expense: {expense_name}",
                    'account_id': exp.expense_plan_id,
                    'account_type': 'expense',
                    'particulars': f"{exp.payee_name or 'N/A'} - {exp.comment or ''}",
                    'debit': float(exp.total_amount or 0),
                    'credit': 0,
                    'balance': 0,
                    'mode_of_payment': exp.mode_of_payment,
                    'reference': exp.ref_number,
                    'transaction_id': exp.id,
                    'transaction_model': 'Expense'
                })
        
        # Bank transaction ledger
        if account_type in ['all', 'bank']:
            bank_transactions = BankTransaction.objects.filter(
                is_active=True,
                transaction_date__gte=from_date,
                transaction_date__lte=to_date
            )
            
            if account_id:
                bank_transactions = bank_transactions.filter(bank_detail_id=account_id)
            
            for bt in bank_transactions.select_related('bank_detail'):
                bank_name = bt.bank_detail.name if bt.bank_detail else 'Bank'
                transaction_type = 'Deposit' if bt.transaction_type == 'credit' else 'Withdrawal'
                
                ledger_data.append({
                    'date': bt.transaction_date,
                    'voucher_type': transaction_type,
                    'voucher_no': bt.transaction_ref_num or f'BT-{bt.id}',
                    'account': f"Bank: {bank_name}",
                    'account_id': bt.bank_detail_id,
                    'account_type': 'bank',
                    'particulars': bt.remarks or '',
                    'debit': float(bt.amount) if bt.transaction_type == 'debit' else 0,
                    'credit': float(bt.amount) if bt.transaction_type == 'credit' else 0,
                    'balance': 0,
                    'mode_of_payment': 'Bank Transfer',
                    'reference': bt.transaction_ref_num,
                    'transaction_id': bt.id,
                    'transaction_model': 'BankTransaction'
                })
        
        # Adjustment ledger (concessions/adjustments)
        if account_type in ['all', 'adjustment']:
            adjustments = AdjustmentFee.objects.filter(
                is_active=True,
                fee_plan__standard_fee__academic_year_id=academic_year_id
            ) if academic_year_id else AdjustmentFee.objects.filter(is_active=True)
            
            # Filter by date if adjustment has a date field, otherwise use created date
            for adj in adjustments.select_related('student', 'fee_plan__fee_type'):
                if not adj.student or not adj.fee_plan:
                    continue
                
                adj_date = getattr(adj, 'created', timezone.now()).date() if hasattr(adj, 'created') else date.today()
                
                if from_date <= adj_date <= to_date:
                    student_name = f"{adj.student.first_name or ''} {adj.student.middle_name or ''} {adj.student.last_name or ''}".strip()
                    fee_type_name = adj.fee_plan.fee_type.name if adj.fee_plan.fee_type else 'N/A'
                    
                    # Adjustments can be additions or deductions
                    is_addition = adj.is_addition if hasattr(adj, 'is_addition') else False
                    amount = float(adj.amount or 0)
                    
                    ledger_data.append({
                        'date': adj_date,
                        'voucher_type': 'Journal',
                        'voucher_no': f'ADJ-{adj.id}',
                        'account': f"Student: {student_name}",
                        'account_id': adj.student_id,
                        'account_type': 'adjustment',
                        'particulars': f"Adjustment - {fee_type_name} ({'Addition' if is_addition else 'Deduction'})",
                        'debit': 0 if is_addition else amount,
                        'credit': amount if is_addition else 0,
                        'balance': 0,
                        'mode_of_payment': 'Adjustment',
                        'reference': adj.reason_id if hasattr(adj, 'reason_id') else None,
                        'transaction_id': adj.id,
                        'transaction_model': 'AdjustmentFee'
                    })
        
        # Sort by date and calculate running balance
        ledger_data.sort(key=lambda x: (x['date'], x['transaction_id']))
        
        # Calculate running balance per account
        account_balances = {}
        for entry in ledger_data:
            account_key = f"{entry['account_type']}_{entry['account_id']}"
            if account_key not in account_balances:
                account_balances[account_key] = 0
            
            account_balances[account_key] += entry['credit'] - entry['debit']
            entry['balance'] = account_balances[account_key]
        
        # Get summary by account
        account_summary = {}
        for entry in ledger_data:
            account_key = entry['account']
            if account_key not in account_summary:
                account_summary[account_key] = {
                    'account': account_key,
                    'account_id': entry['account_id'],
                    'account_type': entry['account_type'],
                    'total_debit': 0,
                    'total_credit': 0,
                    'balance': 0,
                    'transaction_count': 0
                }
            
            account_summary[account_key]['total_debit'] += entry['debit']
            account_summary[account_key]['total_credit'] += entry['credit']
            account_summary[account_key]['transaction_count'] += 1
        
        # Calculate final balance for each account
        for account_key, summary in account_summary.items():
            summary['balance'] = summary['total_credit'] - summary['total_debit']
        
        return {
            'data': ledger_data,
            'summary': list(account_summary.values()),
            'total_debit': sum(entry['debit'] for entry in ledger_data),
            'total_credit': sum(entry['credit'] for entry in ledger_data),
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d')
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting ledger view: {str(e)}", exc_info=True)
        return {'error': str(e), 'data': [], 'summary': []}


def get_day_book(self):
    """
    Get Day Book - daily transaction summary
    Shows all transactions day-wise, similar to Tally's Day Book
    """
    try:
        from_date = self.request.GET.get('from_date')
        to_date = self.request.GET.get('to_date')
        academic_year_id = self.request.GET.get('academic_year')
        
        # Default date range: current month
        if not from_date:
            from_date = date.today().replace(day=1)
        else:
            from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
        
        day_book_data = []
        
        # Fee Collections
        fee_collections = FeeCollection.objects.filter(
            is_active=True,
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        if academic_year_id:
            fee_collections = fee_collections.filter(
                payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id
            ).distinct()
        
        for fc in fee_collections.select_related('student'):
            student_name = f"{fc.student.first_name or ''} {fc.student.middle_name or ''} {fc.student.last_name or ''}".strip() if fc.student else 'N/A'
            
            day_book_data.append({
                'date': fc.transaction_date,
                'voucher_type': 'Receipt',
                'voucher_no': fc.receipt_num or f'FC-{fc.id}',
                'account': f"Student: {student_name}" if fc.student else 'N/A',
                'particulars': f"Fee Collection",
                'debit': 0,
                'credit': float(fc.total_amount or 0),
                'mode_of_payment': fc.mode_of_payment,
                'reference': fc.payment_ref_num
            })
        
        # Expenses
        expenses = Expense.objects.filter(
            is_active=True,
            date__gte=from_date,
            date__lte=to_date
        )
        
        for exp in expenses.select_related('expense_plan'):
            expense_name = exp.expense_plan.name if exp.expense_plan else 'General Expense'
            day_book_data.append({
                'date': exp.date,
                'voucher_type': 'Payment',
                'voucher_no': exp.receipt_num or f'EXP-{exp.id}',
                'account': f"Expense: {expense_name}",
                'particulars': f"{exp.payee_name or 'N/A'} - {exp.comment or ''}",
                'debit': float(exp.total_amount or 0),
                'credit': 0,
                'mode_of_payment': exp.mode_of_payment,
                'reference': exp.ref_number
            })
        
        # Bank Transactions
        bank_transactions = BankTransaction.objects.filter(
            is_active=True,
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        for bt in bank_transactions.select_related('bank_detail'):
            bank_name = bt.bank_detail.name if bt.bank_detail else 'Bank'
            transaction_type = 'Deposit' if bt.transaction_type == 'credit' else 'Withdrawal'
            
            day_book_data.append({
                'date': bt.transaction_date,
                'voucher_type': transaction_type,
                'voucher_no': bt.transaction_ref_num or f'BT-{bt.id}',
                'account': f"Bank: {bank_name}",
                'particulars': bt.remarks or '',
                'debit': float(bt.amount) if bt.transaction_type == 'debit' else 0,
                'credit': float(bt.amount) if bt.transaction_type == 'credit' else 0,
                'mode_of_payment': 'Bank Transfer',
                'reference': bt.transaction_ref_num
            })
        
        # Miscellaneous Payments
        misc_payments = MiscellaneousPayment.objects.filter(
            is_active=True,
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        for mp in misc_payments.select_related('miscellaneous__miscellaneous_type'):
            misc_type = mp.miscellaneous.miscellaneous_type.name if mp.miscellaneous and mp.miscellaneous.miscellaneous_type else 'Misc'
            
            day_book_data.append({
                'date': mp.transaction_date,
                'voucher_type': 'Receipt' if mp.amount > 0 else 'Payment',
                'voucher_no': mp.receipt_num or f'MISC-{mp.id}',
                'account': f"Misc: {misc_type}",
                'particulars': mp.remarks or '',
                'debit': 0 if mp.amount > 0 else abs(float(mp.amount)),
                'credit': float(mp.amount) if mp.amount > 0 else 0,
                'mode_of_payment': mp.mode_of_payment,
                'reference': mp.payment_ref_num
            })
        
        # Sort by date
        day_book_data.sort(key=lambda x: (x['date'], x['voucher_no']))
        
        # Group by date for summary
        daily_summary = defaultdict(lambda: {'debit': 0, 'credit': 0, 'count': 0})
        for entry in day_book_data:
            date_str = entry['date'].strftime('%Y-%m-%d')
            daily_summary[date_str]['debit'] += entry['debit']
            daily_summary[date_str]['credit'] += entry['credit']
            daily_summary[date_str]['count'] += 1
            daily_summary[date_str]['balance'] = daily_summary[date_str]['credit'] - daily_summary[date_str]['debit']
        
        return {
            'data': day_book_data,
            'daily_summary': [{'date': k, **v} for k, v in sorted(daily_summary.items())],
            'total_debit': sum(entry['debit'] for entry in day_book_data),
            'total_credit': sum(entry['credit'] for entry in day_book_data),
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d')
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting day book: {str(e)}", exc_info=True)
        return {'error': str(e), 'data': [], 'daily_summary': []}


def get_trial_balance(self):
    """
    Get Trial Balance - summary of all accounts with debit/credit balances
    """
    try:
        from_date = self.request.GET.get('from_date')
        to_date = self.request.GET.get('to_date')
        academic_year_id = self.request.GET.get('academic_year')
        
        # Default date range: current financial year or academic year
        if not from_date:
            from_date = date.today().replace(month=4, day=1)  # Financial year start (April)
            if date.today().month < 4:
                from_date = from_date.replace(year=from_date.year - 1)
        else:
            from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
        
        if not to_date:
            to_date = date.today()
        else:
            to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
        
        trial_balance = {}
        
        # Student accounts (Fee Receivables)
        fee_collections = FeeCollection.objects.filter(
            is_active=True,
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        if academic_year_id:
            fee_collections = fee_collections.filter(
                payment_detail__fee_plan__standard_fee__academic_year_id=academic_year_id
            ).distinct()
        
        student_credits = fee_collections.values('student_id', 'student__first_name', 'student__last_name', 'student__current_reg_num').annotate(
            total_credit=Sum('total_amount')
        )
        
        for sc in student_credits:
            if not sc['student_id']:
                continue
            student_name = f"{sc['student__first_name'] or ''} {sc['student__last_name'] or ''}".strip() or sc['student__current_reg_num'] or 'Unknown'
            account_name = f"Student: {student_name}"
            if account_name not in trial_balance:
                trial_balance[account_name] = {'debit': 0, 'credit': 0, 'account_type': 'student'}
            trial_balance[account_name]['credit'] += float(sc['total_credit'] or 0)
        
        # Fee Type accounts (Income)
        payment_details = PaymentDetail.objects.filter(
            fee_collection__is_active=True,
            fee_collection__transaction_date__gte=from_date,
            fee_collection__transaction_date__lte=to_date
        )
        
        if academic_year_id:
            payment_details = payment_details.filter(
                fee_plan__standard_fee__academic_year_id=academic_year_id
            )
        
        fee_type_credits = payment_details.values('fee_plan__fee_type__name').annotate(
            total_credit=Sum('amount_paid')
        )
        
        for ftc in fee_type_credits:
            if not ftc['fee_plan__fee_type__name']:
                continue
            account_name = f"Fee Income: {ftc['fee_plan__fee_type__name']}"
            if account_name not in trial_balance:
                trial_balance[account_name] = {'debit': 0, 'credit': 0, 'account_type': 'income'}
            trial_balance[account_name]['credit'] += float(ftc['total_credit'] or 0)
        
        # Expense accounts
        expenses = Expense.objects.filter(
            is_active=True,
            date__gte=from_date,
            date__lte=to_date
        )
        
        expense_debits = expenses.values('expense_plan__name').annotate(
            total_debit=Sum('total_amount')
        )
        
        for ed in expense_debits:
            if not ed['expense_plan__name']:
                continue
            account_name = f"Expense: {ed['expense_plan__name']}"
            if account_name not in trial_balance:
                trial_balance[account_name] = {'debit': 0, 'credit': 0, 'account_type': 'expense'}
            trial_balance[account_name]['debit'] += float(ed['total_debit'] or 0)
        
        # Bank accounts
        bank_transactions = BankTransaction.objects.filter(
            is_active=True,
            transaction_date__gte=from_date,
            transaction_date__lte=to_date
        )
        
        bank_balances = bank_transactions.values('bank_detail__name', 'transaction_type').annotate(
            total_amount=Sum('amount')
        )
        
        for bb in bank_balances:
            if not bb['bank_detail__name']:
                continue
            account_name = f"Bank: {bb['bank_detail__name']}"
            if account_name not in trial_balance:
                trial_balance[account_name] = {'debit': 0, 'credit': 0, 'account_type': 'bank'}
            
            if bb['transaction_type'] == 'debit':
                trial_balance[account_name]['debit'] += float(bb['total_amount'] or 0)
            else:
                trial_balance[account_name]['credit'] += float(bb['total_amount'] or 0)
        
        # Convert to list and calculate balances
        trial_balance_list = []
        total_debit = 0
        total_credit = 0
        
        for account_name, data in sorted(trial_balance.items()):
            balance = data['credit'] - data['debit']
            trial_balance_list.append({
                'account_name': account_name,
                'account_type': data['account_type'],
                'debit': data['debit'],
                'credit': data['credit'],
                'balance': balance
            })
            total_debit += data['debit']
            total_credit += data['credit']
        
        return {
            'data': trial_balance_list,
            'total_debit': total_debit,
            'total_credit': total_credit,
            'difference': total_credit - total_debit,
            'from_date': from_date.strftime('%Y-%m-%d'),
            'to_date': to_date.strftime('%Y-%m-%d')
        }
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting trial balance: {str(e)}", exc_info=True)
        return {'error': str(e), 'data': [], 'total_debit': 0, 'total_credit': 0}


def get_account_list(self):
    """
    Get list of all accounts for dropdown/filter
    """
    try:
        account_type = self.request.GET.get('account_type', 'all')
        accounts = []
        
        if account_type in ['all', 'student']:
            students = Student.objects.filter(is_active=True).values('id', 'first_name', 'middle_name', 'last_name', 'current_reg_num')[:1000]
            for s in students:
                name = f"{s['first_name'] or ''} {s['middle_name'] or ''} {s['last_name'] or ''}".strip() or s['current_reg_num'] or 'Unknown'
                accounts.append({
                    'id': s['id'],
                    'name': name,
                    'type': 'student',
                    'display_name': f"Student: {name}"
                })
        
        if account_type in ['all', 'fee_type']:
            from apps.finance.models.fee import FeeType
            fee_types = FeeType.objects.filter(is_active=True).values('id', 'name')
            for ft in fee_types:
                accounts.append({
                    'id': ft['id'],
                    'name': ft['name'],
                    'type': 'fee_type',
                    'display_name': f"Fee Type: {ft['name']}"
                })
        
        if account_type in ['all', 'expense']:
            from apps.expenditure.models import ExpensePlan
            expense_plans = ExpensePlan.objects.filter(is_active=True).values('id', 'name')
            for ep in expense_plans:
                accounts.append({
                    'id': ep['id'],
                    'name': ep['name'],
                    'type': 'expense',
                    'display_name': f"Expense: {ep['name']}"
                })
        
        if account_type in ['all', 'bank']:
            from apps.finance.models.bankTransaction import BankDetail
            banks = BankDetail.objects.filter(is_active=True).values('id', 'name')
            for b in banks:
                accounts.append({
                    'id': b['id'],
                    'name': b['name'],
                    'type': 'bank',
                    'display_name': f"Bank: {b['name']}"
                })
        
        return {'data': accounts}
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting account list: {str(e)}", exc_info=True)
        return {'error': str(e), 'data': []}


def download_tally_ledger_report(self):
    """
    Download Ledger Report as Excel
    """
    try:
        ledger_data = get_ledger_view(self)
        
        if 'error' in ledger_data:
            raise Exception(ledger_data.get('error', 'Unknown error'))
        
        # Format data for Excel
        excel_data = []
        for entry in ledger_data.get('data', []):
            excel_data.append({
                'date': entry['date'].strftime('%d-%m-%Y') if isinstance(entry['date'], date) else entry['date'],
                'voucher_type': entry.get('voucher_type', ''),
                'voucher_no': entry.get('voucher_no', ''),
                'account': entry.get('account', ''),
                'particulars': entry.get('particulars', ''),
                'debit': f"{entry.get('debit', 0):.2f}",
                'credit': f"{entry.get('credit', 0):.2f}",
                'balance': f"{entry.get('balance', 0):.2f}",
                'mode_of_payment': entry.get('mode_of_payment', ''),
                'reference': entry.get('reference', ''),
            })
        
        # Add summary rows
        summary = ledger_data.get('summary', [])
        if summary:
            excel_data.append({})  # Empty row
            excel_data.append({
                'date': 'SUMMARY',
                'voucher_type': '',
                'voucher_no': '',
                'account': 'Account',
                'particulars': 'Total Debit',
                'debit': 'Total Credit',
                'credit': 'Balance',
                'balance': '',
                'mode_of_payment': '',
                'reference': '',
            })
            for acc_summary in summary:
                excel_data.append({
                    'date': '',
                    'voucher_type': '',
                    'voucher_no': '',
                    'account': acc_summary.get('account', ''),
                    'particulars': f"{acc_summary.get('total_debit', 0):.2f}",
                    'debit': f"{acc_summary.get('total_credit', 0):.2f}",
                    'credit': f"{acc_summary.get('balance', 0):.2f}",
                    'balance': '',
                    'mode_of_payment': '',
                    'reference': '',
                })
        
        # Add totals
        excel_data.append({})  # Empty row
        excel_data.append({
            'date': 'TOTAL',
            'voucher_type': '',
            'voucher_no': '',
            'account': '',
            'particulars': f"{ledger_data.get('total_debit', 0):.2f}",
            'debit': f"{ledger_data.get('total_credit', 0):.2f}",
            'credit': f"{ledger_data.get('total_credit', 0) - ledger_data.get('total_debit', 0):.2f}",
            'balance': '',
            'mode_of_payment': '',
            'reference': '',
        })
        
        options = {
            'title': 'Tally Ledger Report',
            'description': f"Ledger Report from {ledger_data.get('from_date', '')} to {ledger_data.get('to_date', '')}",
            'Data': excel_data,
            'columns': [
                {'column': 'Date', 'required': False, 'schemacolumn': 'date'},
                {'column': 'Voucher Type', 'required': False, 'schemacolumn': 'voucher_type'},
                {'column': 'Voucher No', 'required': False, 'schemacolumn': 'voucher_no'},
                {'column': 'Account', 'required': False, 'schemacolumn': 'account'},
                {'column': 'Particulars', 'required': False, 'schemacolumn': 'particulars'},
                {'column': 'Debit', 'required': False, 'schemacolumn': 'debit'},
                {'column': 'Credit', 'required': False, 'schemacolumn': 'credit'},
                {'column': 'Balance', 'required': False, 'schemacolumn': 'balance'},
                {'column': 'Mode of Payment', 'required': False, 'schemacolumn': 'mode_of_payment'},
                {'column': 'Reference', 'required': False, 'schemacolumn': 'reference'},
            ]
        }
        
        file_name = f'tally_ledger_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        response = write_to_excel_new(self, options)
        
        if self.request.GET.get('long_running_process'):
            if response.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                url = UploadTypeService.upload_local_file(file_name, path='TallyReports')
                if os.path.exists(file_name):
                    os.remove(file_name)
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'url': url})
            else:
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})
        else:
            return response
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error downloading ledger report: {str(e)}", exc_info=True)
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': str(e)[:250]})
        else:
            raise e


def download_tally_daybook_report(self):
    """
    Download Day Book Report as Excel
    """
    try:
        daybook_data = get_day_book(self)
        
        if 'error' in daybook_data:
            raise Exception(daybook_data.get('error', 'Unknown error'))
        
        # Format data for Excel
        excel_data = []
        for entry in daybook_data.get('data', []):
            excel_data.append({
                'date': entry['date'].strftime('%d-%m-%Y') if isinstance(entry['date'], date) else entry['date'],
                'voucher_type': entry.get('voucher_type', ''),
                'voucher_no': entry.get('voucher_no', ''),
                'account': entry.get('account', ''),
                'particulars': entry.get('particulars', ''),
                'debit': f"{entry.get('debit', 0):.2f}",
                'credit': f"{entry.get('credit', 0):.2f}",
                'mode_of_payment': entry.get('mode_of_payment', ''),
                'reference': entry.get('reference', ''),
            })
        
        # Add daily summary
        daily_summary = daybook_data.get('daily_summary', [])
        if daily_summary:
            excel_data.append({})  # Empty row
            excel_data.append({
                'date': 'DAILY SUMMARY',
                'voucher_type': '',
                'voucher_no': '',
                'account': 'Date',
                'particulars': 'Total Debit',
                'debit': 'Total Credit',
                'credit': 'Balance',
                'mode_of_payment': '',
                'reference': '',
            })
            for daily in daily_summary:
                excel_data.append({
                    'date': daily.get('date', ''),
                    'voucher_type': '',
                    'voucher_no': '',
                    'account': '',
                    'particulars': f"{daily.get('debit', 0):.2f}",
                    'debit': f"{daily.get('credit', 0):.2f}",
                    'credit': f"{daily.get('balance', 0):.2f}",
                    'mode_of_payment': '',
                    'reference': '',
                })
        
        # Add totals
        excel_data.append({})  # Empty row
        excel_data.append({
            'date': 'TOTAL',
            'voucher_type': '',
            'voucher_no': '',
            'account': '',
            'particulars': f"{daybook_data.get('total_debit', 0):.2f}",
            'debit': f"{daybook_data.get('total_credit', 0):.2f}",
            'credit': f"{daybook_data.get('total_credit', 0) - daybook_data.get('total_debit', 0):.2f}",
            'mode_of_payment': '',
            'reference': '',
        })
        
        options = {
            'title': 'Tally Day Book Report',
            'description': f"Day Book Report from {daybook_data.get('from_date', '')} to {daybook_data.get('to_date', '')}",
            'Data': excel_data,
            'columns': [
                {'column': 'Date', 'required': False, 'schemacolumn': 'date'},
                {'column': 'Voucher Type', 'required': False, 'schemacolumn': 'voucher_type'},
                {'column': 'Voucher No', 'required': False, 'schemacolumn': 'voucher_no'},
                {'column': 'Account', 'required': False, 'schemacolumn': 'account'},
                {'column': 'Particulars', 'required': False, 'schemacolumn': 'particulars'},
                {'column': 'Debit', 'required': False, 'schemacolumn': 'debit'},
                {'column': 'Credit', 'required': False, 'schemacolumn': 'credit'},
                {'column': 'Mode of Payment', 'required': False, 'schemacolumn': 'mode_of_payment'},
                {'column': 'Reference', 'required': False, 'schemacolumn': 'reference'},
            ]
        }
        
        file_name = f'tally_daybook_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        response = write_to_excel_new(self, options)
        
        if self.request.GET.get('long_running_process'):
            if response.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                url = UploadTypeService.upload_local_file(file_name, path='TallyReports')
                if os.path.exists(file_name):
                    os.remove(file_name)
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'url': url})
            else:
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})
        else:
            return response
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error downloading daybook report: {str(e)}", exc_info=True)
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': str(e)[:250]})
        else:
            raise e


def download_tally_trial_balance_report(self):
    """
    Download Trial Balance Report as Excel
    """
    try:
        trial_balance_data = get_trial_balance(self)
        
        if 'error' in trial_balance_data:
            raise Exception(trial_balance_data.get('error', 'Unknown error'))
        
        # Format data for Excel
        excel_data = []
        for entry in trial_balance_data.get('data', []):
            excel_data.append({
                'account_name': entry.get('account_name', ''),
                'account_type': entry.get('account_type', ''),
                'debit': f"{entry.get('debit', 0):.2f}",
                'credit': f"{entry.get('credit', 0):.2f}",
                'balance': f"{entry.get('balance', 0):.2f}",
            })
        
        # Add totals
        excel_data.append({})  # Empty row
        excel_data.append({
            'account_name': 'TOTAL',
            'account_type': '',
            'debit': f"{trial_balance_data.get('total_debit', 0):.2f}",
            'credit': f"{trial_balance_data.get('total_credit', 0):.2f}",
            'balance': f"{trial_balance_data.get('difference', 0):.2f}",
        })
        
        options = {
            'title': 'Tally Trial Balance Report',
            'description': f"Trial Balance Report from {trial_balance_data.get('from_date', '')} to {trial_balance_data.get('to_date', '')}",
            'Data': excel_data,
            'columns': [
                {'column': 'Account Name', 'required': False, 'schemacolumn': 'account_name'},
                {'column': 'Account Type', 'required': False, 'schemacolumn': 'account_type'},
                {'column': 'Debit', 'required': False, 'schemacolumn': 'debit'},
                {'column': 'Credit', 'required': False, 'schemacolumn': 'credit'},
                {'column': 'Balance', 'required': False, 'schemacolumn': 'balance'},
            ]
        }
        
        file_name = f'tally_trial_balance_report_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx'
        response = write_to_excel_new(self, options)
        
        if self.request.GET.get('long_running_process'):
            if response.status_code == 200:
                with open(file_name, 'wb') as file:
                    file.write(response.content)
                url = UploadTypeService.upload_local_file(file_name, path='TallyReports')
                if os.path.exists(file_name):
                    os.remove(file_name)
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'url': url})
            else:
                transaction_id = self.request.GET.get('transaction_id')
                store_long_running_process(self, transaction_id, {'error': f"Error with status code {response.status_code}"})
        else:
            return response
            
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error downloading trial balance report: {str(e)}", exc_info=True)
        if self.request.GET.get('long_running_process'):
            transaction_id = self.request.GET.get('transaction_id')
            store_long_running_process(self, transaction_id, {'error': str(e)[:250]})
        else:
            raise e


