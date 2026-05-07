from rest_framework import routers
from apps.finance.views import (AdditionalChargeTypeViewSet, AdditionalChargeViewSet, AdjustmentApprovalRequestViewSet, MyAdjustmentsListViewSet, FeeCategoryFeeStandardSectionMappingViewSet, FeeTypeViewSet, FeeStandardMappingViewSet, GetFeeCodeNamesViewSet, GetSiblingFeeListViewSet, MiscFeeRecieptViewSet, StandardFeeViewSet, FeePlanViewSet,
                                FeeCollectionViewSet, StandardFeeTermViewSet, ApproveViewSet,
                                FeePlanStatusStudentListViewSet, FeeStandardMappingDeleteAllViewSet,
                                ApplicationPaymentDetailViewSet, ApplicationPaymentViewSet, SingleFeePlanViewSet,
                                AdmissionFormViewSet, FeatureStudentViewSet, ConcessionTypeViewSet,
                                ConcessionStudentListViewSet, ConcessionViewSet, FeeCollectionReportViewSet,
                                CashbookViewSet, BalanceViewSet, PaymentViewSet, AdjustmentFeePlanViewSet,
                                BankDetailViewSet, BankFeeTypeMappingViewSet, BankTransactionViewSet,
                                MiscellaneousTypeViewSet, MiscellaneousMappingViewSet, MiscellaneousViewSet,
                                CashbookFeeTypeViewSet, ValidateFeeCollectionViewSet, FeePlanConcessionViewSet,
                                FeeGroupViewSet, FeeGroupTypesViewSet, PrintDummyReceiptViewSet, GetFeeListForStudentViewSet,
                                FeePlanAdditionalChargeMappingViewSet, FeeCollectionSummaryReportViewSet, FeeCollectionReportFilterDatasViewSet,
                                FeeCategoryViewSet,GetOnlyFeeTypeViewSet,GetOnlyFeeTermViewSet,ApplicationFeesTransactionViewSet,TemplateMappingFilterDatasViewSet,
                                FinanceDashboardViewSet, TallyViewSet, AccountingViewSet, AreaWisePendingReportViewSet, DepositDataViewSet,
                                RecoverableAssetViewSet, RecoverableAssetHistoryViewSet, RecoverableAssetTransactionViewSet,
                                RecoverableAssetCategoryViewSet, RecoverableAssetReportViewSet,
                                RecoverableAssetDashboardViewSet,

                                SalaryAdvanceReportViewSet,
                                SalaryAdvancePayrollViewSet,
                                SalaryAdvanceChargesViewSet,
                                SalaryAdvanceViewSet,
                                SalaryAdvanceTransactionViewSet,
                                FeeMismatchReconciliationViewSet,
                                CopyAllFeePlanViewSet, DenominationViewSet,
                                BalanceSheetViewSet,
                                BalanceSheetLockHistoryViewSet, FinanceAuditLogViewSet,
                                StaffWalletViewSet, BankBalanceCarryForwardViewSet,
                                FYCarryForwardViewSet, PendingFeesCalculationViewSet,
                                ActiveFinancialYearViewSet,
                                FeeAdvanceTypeViewSet, FeeAdvanceCollectionViewSet
                            )



router = routers.DefaultRouter()
router.register(r'addfeetypes', FeeTypeViewSet, basename='addfeetypes')
router.register(r'getfeetypes', StandardFeeViewSet, basename='getfeetypes')
router.register(r'feetypes', FeeStandardMappingViewSet, basename='feetypes')
router.register(r'feetypesdeleteall', FeeStandardMappingDeleteAllViewSet, basename='feetypesdeleteall')
router.register(r'getfeetermplan', StandardFeeTermViewSet, basename='getfeetermplan')
router.register(r'approve', ApproveViewSet, basename='approve')
router.register(r'feeplan', FeePlanViewSet, basename='feeplan')
router.register(r'singlefeeplan', SingleFeePlanViewSet, basename='singlefeeplan')
router.register(r'feecollection', FeeCollectionViewSet, basename='feecollection')
router.register(r'payment', PaymentViewSet, basename='payment')
router.register(r'feecollectionreport', FeeCollectionReportViewSet, basename='feecollectionreport')
router.register(r'feecollectionsummaryreport', FeeCollectionSummaryReportViewSet, basename='feecollectionsummaryreport')
router.register(r'cashbook', CashbookViewSet, basename='cashbook')
router.register(r'cashbookfeetype', CashbookFeeTypeViewSet, basename='cashbookfeetype')
router.register(r'balance', BalanceViewSet, basename='balance')
router.register(r'feeplanstudentlist', FeePlanStatusStudentListViewSet, basename='feeplanstudentlist')
router.register(r'applicationplan', ApplicationPaymentViewSet, basename='applicationplan')
router.register(r'applicationfees', ApplicationPaymentDetailViewSet, basename='applicationfees')
router.register(r'applicationfeestransaction', ApplicationFeesTransactionViewSet, basename='applicationfeestransaction')
router.register(r'admissionfees', AdmissionFormViewSet, basename='admissionfees')
router.register(r'adjustment', AdjustmentFeePlanViewSet, basename='adjustment')
router.register(r'adjustmentapprovalrequest', AdjustmentApprovalRequestViewSet, basename='adjustmentapprovalrequest')
router.register(r'myadjustments', MyAdjustmentsListViewSet, basename='myadjustments')
router.register(r'feature', FeatureStudentViewSet, basename='feature')
router.register(r'concessiontypes', ConcessionTypeViewSet, basename='concessiontypes')
router.register(r'concession', ConcessionViewSet, basename='concession')
router.register(r'concessionstudentlist', ConcessionStudentListViewSet, basename='concessionstudentlist')
router.register(r'bankdetail', BankDetailViewSet, basename='bankdetail')
router.register(r'bankfeetype', BankFeeTypeMappingViewSet, basename='bankfeetype')
router.register(r'banktransaction', BankTransactionViewSet, basename='banktransaction')
router.register(r'misctype', MiscellaneousTypeViewSet, basename='misctype')
router.register(r'miscplan', MiscellaneousMappingViewSet, basename='miscplan')
router.register(r'misc', MiscellaneousViewSet, basename='misc')
router.register(r'validate_fee_collection', ValidateFeeCollectionViewSet, basename='validate_fee_collection')
router.register(r'feeplanconcession', FeePlanConcessionViewSet, basename='feeplanconcession')
router.register(r'miscfeereciept', MiscFeeRecieptViewSet, basename='miscfeereciept')
router.register(r'feegroup', FeeGroupViewSet, basename='feegroup')
router.register(r'feegrouptypes', FeeGroupTypesViewSet, basename='feegrouptypes')
router.register(r'printdummyreceipt', PrintDummyReceiptViewSet, basename='printdummyreceipt')
router.register(r'getfeelistforstudent', GetFeeListForStudentViewSet, basename='getfeelistforstudent')
router.register(r'getfeecodenames', GetFeeCodeNamesViewSet, basename='getfeecodenames')
router.register(r'additionalchargetype', AdditionalChargeTypeViewSet, basename='additionalchargetype')
router.register(r'additionalcharge', AdditionalChargeViewSet, basename='additionalcharge')
router.register(r'feeplanadditionalchargemapping', FeePlanAdditionalChargeMappingViewSet, basename='feeplanadditionalchargemapping')
router.register(r'feecollectionreportfilterdatas', FeeCollectionReportFilterDatasViewSet, basename='feecollectionreportfilterdatas')
router.register(r'feecategory', FeeCategoryViewSet, basename='feecategory')
router.register(r'feecategorystandardsectionwise', FeeCategoryFeeStandardSectionMappingViewSet, basename='feecategorystandardsectionwise')
router.register(r'getonlyfeetype', GetOnlyFeeTypeViewSet, basename='getonlyfeetype')
router.register(r'getonlyfeeterm', GetOnlyFeeTermViewSet, basename='getonlyfeeterm')
router.register(r'getsiblingfeelist', GetSiblingFeeListViewSet, basename='getsiblingfeelist')
router.register(r'templatemappingfilterdatas', TemplateMappingFilterDatasViewSet, basename='templatemappingfilterdatas')
router.register(r'finance_dashboard', FinanceDashboardViewSet, basename='finance_dashboard')
router.register(r'area_wise_pending_report', AreaWisePendingReportViewSet, basename='area_wise_pending_report')
router.register(r'tally', TallyViewSet, basename='tally')
router.register(r'accounting', AccountingViewSet, basename='accounting')
router.register(r'depositdata',DepositDataViewSet,basename='depositdata')
router.register(r'recoverableasset', RecoverableAssetViewSet, basename='recoverableasset')
router.register(r'recoverableassethistory', RecoverableAssetHistoryViewSet, basename='recoverableassethistory')
router.register(r'recoverableassettransaction', RecoverableAssetTransactionViewSet, basename='recoverableassettransaction')
router.register(r'recoverableassetcategory', RecoverableAssetCategoryViewSet, basename='recoverableassetcategory')
router.register(r'recoverableassetreport', RecoverableAssetReportViewSet, basename='recoverableassetreport')
router.register(r'recoverableassetdashboard', RecoverableAssetDashboardViewSet, basename='recoverableassetdashboard')

# Salary Advance routes
router.register(r'salary-advance', SalaryAdvanceViewSet, basename='salary-advance')
router.register(r'salary-advance-transaction', SalaryAdvanceTransactionViewSet, basename='salary-advance-transaction')
router.register(r'salary-advance-report', SalaryAdvanceReportViewSet, basename='salary-advance-report')
router.register(r'salary-advance-payroll', SalaryAdvancePayrollViewSet, basename='salary-advance-payroll')
router.register(r'salary-advance-charges', SalaryAdvanceChargesViewSet, basename='salary-advance-charges')
router.register(r'fee_mismatch', FeeMismatchReconciliationViewSet, basename='fee_mismatch')
router.register(r'copyallfeeplan', CopyAllFeePlanViewSet, basename='copyallfeeplan')

# Balance Sheet
router.register(r'balance_sheet', BalanceSheetViewSet, basename='balance_sheet')

router.register(r'balance_sheet_lock_history', BalanceSheetLockHistoryViewSet, basename='balance_sheet_lock_history')
router.register(r'finance_audit_log', FinanceAuditLogViewSet, basename='finance_audit_log')

# Cash In Hand Opening Balance
router.register(r'staff_wallet', StaffWalletViewSet, basename='staff_wallet')

# Denominations
router.register(r'denominations', DenominationViewSet, basename='denominations')

# Bank Balance Carry Forward
router.register(r'bank_balance_carry_forward', BankBalanceCarryForwardViewSet, basename='bank_balance_carry_forward')
router.register(r'feeadvancetype', FeeAdvanceTypeViewSet, basename='feeadvancetype')
router.register(r'feeadvancecollection', FeeAdvanceCollectionViewSet, basename='feeadvancecollection')

# FY Carry Forward (all modules)
router.register(r'fy_carry_forward', FYCarryForwardViewSet, basename='fy_carry_forward')

# Pending Fees Calculation
router.register(r'pending_fees_calculation', PendingFeesCalculationViewSet, basename='pending_fees_calculation')

# Active Financial Year
router.register(r'active_financial_year', ActiveFinancialYearViewSet, basename='active_financial_year')

# router.register(r'adjustmentreport', AdjustmentReportViewSet, basename='adjustmentreport')
urlpatterns = router.urls
