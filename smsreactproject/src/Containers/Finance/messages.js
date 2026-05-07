import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


export default defineMessages({
    viewFeeTermHeading: {
        id: 'src_Containers_Finance_viewFeeTermHeading',
        defaultMessage: 'Fee Term'
    },
    viewFeeTermStandard:{
        id: 'src_Containers_Finance_viewFeeTermStandard',
        defaultMessage: 'Standard'
    },
    viewFeeTermApproval:{
        id: 'src_Containers_Finance_viewFeeTermApproval',
        defaultMessage: 'Approval'
    },
    viewFeeTermFeeType:{
        id: 'src_Containers_Finance_viewFeeTermFeeType',
        defaultMessage: 'Fee Type'
    },
    viewFeeTermTotalAmount: {
        id: 'src_Containers_Finance_viewFeeTermTotalAmount',
        defaultMessage: 'Total Amount'
    },
    viewQuickPayTotalPendingAmount: {
        id: 'src_Containers_Finance_viewQuickPayTotalPendingAmount',
        defaultMessage: 'Total Pending Amount'
    },
    viewFeeTermTotalPercentage: {
        id: 'src_Containers_Finance_viewFeeTermTotalPercentage',
        defaultMessage: 'Total Percentage'
    },
    viewFeeTermTotalTerms: {
        id: 'src_Containers_Finance_viewFeeTermTotalTerms',
        defaultMessage: 'Total Terms'
    },
    viewFeeTermStartDate: {
        id: 'src_Containers_Finance_viewFeeTermStartDate',
        defaultMessage: 'Term Start Date'
    },
    viewFeeTermTermName:{
        id: 'src_Containers_Finance_viewFeeTermTermName',
        defaultMessage: 'Term'
    },
    viewFeeTermsTermName:{
        id: 'src_Containers_Finance_viewFeeTermsTermName',
        defaultMessage: 'Term(s)'
    },
    viewFeeTermEndDate: {
        id: 'src_Containers_Finance_viewFeeTermEndDate',
        defaultMessage: 'Term End date'
    },
    viewFeeTermPaymentStartDate: {
        id: 'src_Containers_Finance_viewFeeTermPaymentStartDate',
        defaultMessage: 'Payment Start Date'
    },
    viewFeeTermPaymentEndDate: {
        id: 'src_Containers_Finance_viewFeeTermPaymentEndDate',
        defaultMessage: 'Payment End Date'
    },
    viewFeeTermFeesNotSet: {
        id: 'src_Containers_Finance_viewFeeFeesNotSet',
        defaultMessage: 'Fee(s) is not yet planned'   
    },
    viewFeeTermFeesNotApproved: {
        id: 'src_Containers_Finance_viewFeeTermFeesNotApproved',
        defaultMessage: 'Fee(s) is not yet approved'   
    },
    viewFeeTermNotAbleToChangeFeePlan: {
        id: 'src_Containers_Finance_viewFeeTermNotAbleToChangeFeePlan',
        defaultMessage: `You won't be able to change fee plan once approved`
    },
    viewFeeTermAdmissionFeeIsNotAddedForTheStandard: {
        id: 'src_Containers_Finance_viewFeeTermAdmissionFeeIsNotAddedForTheStandard',
        defaultMessage: `Admission Fee is not added for the standard`
    },
    viewFeeTermPlanApprovedSuccessFully: {
        id: `src_Containers_Finance_viewFeeTermPlanApprovedSuccessFully`,
        defaultMessage: 'Fees plan has approved successfully'
    },
    viewFeeCollectionHeading: {
        id: `src_Containers_Finance_viewFeeCollectionHeading`,
        defaultMessage: 'Fee Collection'
    },
    viewFeeAdjustmentHeading: {
        id: `src_Containers_Finance_viewFeeAdjustmentHeading`,
        defaultMessage: 'Fee Adjustment'
    },
    viewFeeCollectionStudentList: {
        id: `src_Containers_Finance_viewFeeCollectionStudentList`,
        defaultMessage: 'View Student List'
    },
    viewFeeCollectionEnableAdjustment: {
        id: `src_Containers_Finance_viewFeeCollectionEnableAdjustment`,
        defaultMessage: 'Enable Adjustment'
    },
    viewFeeCollectionDisableAdjustment: {
        id: `src_Containers_Finance_viewFeeCollectionDisableAdjustment`,
        defaultMessage: 'Disable Adjustment'
    },
    viewFeeCollectionenableQuickFee: {
        id: `src_Containers_Finance_viewFeeCollectionenableQuickFee`,
        defaultMessage: 'Enable Quick Fee'
    },
    viewFeeCollectionNoStudentFoundError: {
        id: `src_Containers_Finance_viewFeeCollectionNoStudentFoundError`,
        defaultMessage: 'No students found in this standard'
    },
    viewFeeCollectionSelectAcademicandStandardError: {
        id: `src_Containers_Finance_viewFeeCollectionSelectAcademicandStandardError`,
        defaultMessage: `Select the Academic year and ${alias_names['standard']} to view the student list`
    },
    viewFeesTypeSelectTheAcademicYearError: {
        id: `src_Containers_Finance_viewFeesTypeSelectTheAcademicYearError`,
        defaultMessage: 'Select the Academic year to View Result'
    },
    viewFeesTypeSelectOneStandardToEdit: {
        id: `src_Containers_Finance_viewFeesTypeSelectOneStandardToEdit`,
        defaultMessage: `Select ${alias_names['standard']} to add plan`
    },
    viewFeesTypeStandardNotFound: {
        id: `src_Containers_Finance_viewFeesTypeStandardNotFound`,
        defaultMessage: `Standards are not found for this Academic Year`
    },
    feestypeAdmissionMandatory:{
        id: `src_Containers_Finance_feestypeAdmissionMandatory`,
        defaultMessage: `Admission Fees has to be Mandatory fee type`
    },
    concessionOnTotalAmount:{
        id: `src_Containers_Finance_Components_concessionOnTotalAmount`,
        defaultMessage: `Concession on Total Amount`
    },
    concessionOnfeeType:{
        id: `src_Containers_Finance_Components_concessionOnfeeType`,
        defaultMessage: `Concession on Total Amount`
    },
    concessionAmount:{
        id: `src_Containers_Finance_Components_concessionAmount`,
        defaultMessage: `Concession Amount`
    },
    selectConcession: {
        id: `src_Containers_Finance_Components_selectConcession`,
        defaultMessage: `Select Concession Type`
    },
    concessionType:{
        id: `src_Containers_Finance_Components_concessionType`,
        defaultMessage: `Concession Type`
    },
    feeConcession:{
        id: `src_Containers_Finance_Components_feeConcession`,
        defaultMessage: `Fee Concession`
    },
    feeConcessionList:{
        id: `src_Containers_Finance_Components_feeConcessionList`,
        defaultMessage: `Fee Concession List`
    },
    adjustedAmount:{
        id: `src_Containers_Finance_Components_adjustedAmount`,
        defaultMessage: `Adjusted Amount`
    },
    totalPayable:{
        id: `src_Containers_Finance_Components_totalPayable`,
        defaultMessage: `Total Payable`
    },
    pendingAmount:{
        id: `src_Containers_Finance_Components_pendingAmount`,
        defaultMessage: `Pending Amount`
    },
    paidAmount:{
        id: `src_Containers_Finance_Components_paidAmount`,
        defaultMessage: `Paid Amount`
    },
    addAnotherTerm: {
        id: `src_Containers_Finance_Components_addAnotherTerm`,
        defaultMessage: `Add Another Term`
    },
    amountPayable: {
        id: `src_Containers_Finance_Components_amountPayable`,
        defaultMessage: `Amount Payable`
    },
    enterAmountToProceed:{
        id: `src_Containers_Finance_Components_enterAmountToProceed`,
        defaultMessage: `Enter Amount To Proceed`
    },
    adjustementAmount:{
        id: `src_Containers_Finance_Components_adjustementAmount`,
        defaultMessage: `Adjustment Amount`
    },
    termTotal:{
        id: `src_Containers_Finance_Components_termTotal`,
        defaultMessage: `Term Total`
    },
    cashbookSummary:{
        id: `src_Containers_Finance_Components_cashbookSummary`,
        defaultMessage: `Cashbook Summary`
    },
    enableDisable:{
        id: `src_Containers_Finance_Components_enableDisable`,
        defaultMessage: `Enable/Disable`
    },
    standardAmount:{
        id: `src_Containers_Finance_Components_standardAmount`,
        defaultMessage: `Standard Amount` 
    },
    enterConcessionAmountError:{
        id: `src_Containers_Finance_Components_enterConcessionAmountError`,
        defaultMessage: `Enter Concession Amount to atleast 1 term to Apply` 
    },
    selectFeeType:{
        id: `src_Containers_Finance_Components_selectFeeType`,
        defaultMessage: `Select Fee Type` 
    },
    concessionAmountGreaterThanPending:{
        id: `src_Containers_Finance_Components_concessionAmountGreaterThanPending`,
        defaultMessage: `Concession Amount is greater than pending Amount` 
    },
    concessionApplied:{
        id: `src_Containers_Finance_Components_concessionApplied`,
        defaultMessage: `Concession Applied` 
    },
    feeAmount:{
        id: `src_Containers_Finance_Components_feeAmount`,
        defaultMessage: `Fee Amount` 
    },
    payableAmount: {
        id: `src_Containers_Finance_Components_payableAmount`,
        defaultMessage: `Payable Amount` 
    },
    applyConcession:{
        id: `src_Containers_Finance_Components_applyConcession`,
        defaultMessage: `Apply Concession` 
    },
    concessionCantBeRevereted:{
        id: `src_Containers_Finance_Components_concessionCantBeRevereted`,
        defaultMessage: `Concession can be applied once and can't be reverted or modified.` 
    },
    feestypeTransportNonMandatory:{
        id: `src_Containers_Finance_feestypeTransportNonMandatory`,
        defaultMessage: `Transport Fees should not be mandatory`
    },
    feestypeHostelNonMandatory:{
        id: `src_Containers_Finance_feestypeHostelNonMandatory`,
        defaultMessage: `Hostel Fees should not be mandatory`
    },
    feestypeCustomNonMandatory:{
        id: `src_Containers_Finance_feestypeCustomNonMandatory`,
        defaultMessage: `Custom Fees should not be mandatory`
    },
    feestypeStoreNonMandatory:{
        id: `src_Containers_Finance_feestypeStoreNonMandatory`,
        defaultMessage: `Store Fees should not be mandatory`
    },
    fineFrequencyInDays:{
        id: `src_Containers_Finance_fineFrequencyInDays`,
        defaultMessage: `Fine frequency in days`
    },
    fineAmountPerFreq:{
        id: `src_Containers_Finance_fineAmountPerFreq`,
        defaultMessage: `Fine amount per frequency (₹)`
    },
    maxFineAmount:{
        id: `src_Containers_Finance_maxFineAmount`,
        defaultMessage: `Maximum fine amount (₹)`
    },
    fineAmount:{
        id: `src_Containers_Finance_fineAmount`,
        defaultMessage: `Fine Amount`
    },
    sequence:{
        id: `src_Containers_Finance_sequence`,
        defaultMessage: `Sequence`   
    },
    additionalFeeType:{
        id: 'src_Containers_Finance_additionalFeeType',
        defaultMessage: 'Additional Fee Type'
    },
    enterReceiptNumberToProceed:{
        id: `src_Containers_Finance_Components_enterReceiptNumberToProceed`,
        defaultMessage: `Enter Receipt Number To Proceed`
    },
    enterReceiptDateToProceed:{
        id: `src_Containers_Finance_Components_enterReceiptDateToProceed`,
        defaultMessage: `Enter Receipt Date To Proceed`
    },
});