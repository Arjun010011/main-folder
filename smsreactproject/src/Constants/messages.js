import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

export default defineMessages({
  editSchool: {
    id: 'src_editSchool',
    defaultMessage: `Edit ${alias_names['school']}`,
  },
  title: {
    id: 'src_title',
    defaultMessage: 'Title',
  },
  actions: {
    id: 'src_actions',
    defaultMessage: 'Action',
  },
  amountWithoutSymb: {
    id: 'src_amountWithoutSymb',
    defaultMessage: 'Amount',
  },
  amount: {
    id: 'src_amount',
    defaultMessage: 'Amount (₹)',
  },
  percentage: {
    id: 'src_percentage',
    defaultMessage: 'Percentage',
  },
  total: {
    id: 'src_total',
    defaultMessage: 'Total',
  },
  receiptNumber: {
    id: 'src_receiptNumber',
    defaultMessage: 'Receipt No.',
  },
  invoice: {
    id: 'src_invoice',
    defaultMessage: 'Invoice',
  },
  enterAmountError: {
    id: 'src_enterAmountError',
    defaultMessage: 'Enter amount',
  },
  selectAcademicYear: {
    id: 'src_selectAcademicYear',
    defaultMessage: 'Select Academic year',
  },
  academicYear: {
    id: 'src_academicYear',
    defaultMessage: 'Academic Year',
  },
  academicYearError: {
    id: 'src_academicYearError',
    defaultMessage: 'Select Academic year',
  },
  selectDateError: {
    id: 'src_selectDateError',
    defaultMessage: 'Select Date',
  },
  studentName: {
    id: 'src_studentName',
    defaultMessage: 'Student Name',
  },
  date: {
    id: 'src_date',
    defaultMessage: 'Date',
  },
  regNum: {
    id: 'src_regNum',
    defaultMessage: 'Register No.',
  },
  standard: {
    id: 'src_standard',
    defaultMessage: `${alias_names['standard']}`,
  },
  standards: {
    id: 'src_standards',
    defaultMessage: `${alias_names['standard']}(s)`,
  },
  section: {
    id: 'src_section',
    defaultMessage: `${alias_names['section']}`,
  },
  selectStudent: {
    id: 'src_selectStudent',
    defaultMessage: 'Select Student',
  },
  addMore: {
    id: 'src_addMore',
    defaultMessage: 'Add More',
  },
  fieldMandatoryError: {
    id: 'src_fieldMandatoryError',
    defaultMessage: 'This field is Mandatory',
  },
  clearAllErrors: {
    id: 'src_clearAllErrors',
    defaultMessage: 'Clear all the error(s)',
  },
  comments: {
    id: 'src_comments',
    defaultMessage: 'Comments',
  },
  studentType: {
    id: 'src_studentType',
    defaultMessage: 'Student Type'
  },
  dayScholar: {
    id: 'src_dayScholar',
    defaultMessage: 'Day Scholar'
  },
  residential: {
    id: 'src_residential',
    defaultMessage: 'Residential'
  },
  approve: {
    id: 'src_approve',
    defaultMessage: 'Approve'
  },
  approved: {
    id: 'src_approved',
    defaultMessage: 'Approved'
  },
  submit: {
    id: 'src_submit',
    defaultMessage: 'Submit'
  },
  duplicateFoundLabel: {
    id: 'src_duplicateFound',
    defaultMessage: 'Data is already exist(s)'
  },
  dataHasBeenSaved: {
    id: 'src_dataHasBeenSaved',
    defaultMessage: 'Your data has been saved'
  },
  name: {
    id: 'src_name',
    defaultMessage: 'Name'
  },
  description: {
    id: 'src_description',
    defaultMessage: 'Description'
  },
  level: {
    id: 'src_level',
    defaultMessage: 'Rack Level'
  },
  code: {
    id: 'src_code',
    defaultMessage: 'Code'
  },
  value: {
    id: 'src_value',
    defaultMessage: 'Value'
  },
  invoiceNumber: {
    id: 'src_invoiceNumber',
    defaultMessage: 'Invoice Number',
  },
  invoiceDate: {
    id: 'src_invoiceDate',
    defaultMessage: 'Invoice Date',
  },
  return: {
    id: 'src_return',
    defaultMessage: 'Return',
  },
  view: {
    id: 'src_view',
    defaultMessage: 'View',
  },
  enterValue: {
    id: 'src_enterValue',
    defaultMessage: 'Enter Value',
  },
  totalAmount: {
    id: 'src_totalAmount',
    defaultMessage: 'Total Amount',
  },
  enterAmount: {
    id: 'src_enterAmount',
    defaultMessage: 'Enter Amount',
  },
  term: {
    id: 'src_term',
    defaultMessage: 'Term'
  },
  cancel: {
    id: 'src_cancel',
    defaultMessage: 'Cancel'
  },
  noDataForYear: {
    id: 'src_noDataForYear',
    defaultMessage: 'No data Found for selected Year'
  },
  noData: {
    id: 'src_noData',
    defaultMessage: 'No data found'
  },
  selectYear: {
    id: 'src_selectYear',
    defaultMessage: 'Select Year'
  },
  languageList: {
    id: 'src_languageList',
    defaultMessage: 'Language(s)'
  },
  subjectList: {
    id: 'src_subjectList',
    defaultMessage: 'Subject(s)'
  },
  areYouSure: {
    id: 'src_areYouSure',
    defaultMessage: 'Are you sure?'
  },
  revertError: {
    id: 'src_revertError',
    defaultMessage: 'You won\'t be able to revert this!'
  },
  deleteText: {
    id: 'src_deleteText',
    defaultMessage: 'Yes, delete it!'
  },
  sections: {
    id: 'src_sections',
    defaultMessage: `${alias_names['section']}`
  },
  subjects: {
    id: 'src_subjects',
    defaultMessage: 'Subjects'
  },
  course: {
    id: 'src_course',
    defaultMessage: 'Course Outcome'
  },
  phoneNum: {
    id: 'src_phoneNum',
    defaultMessage: 'Phone Number'
  },
  dob: {
    id: 'src_dob',
    defaultMessage: 'Date Of Birth'
  },
  studentErr: {
    id: 'src_studentErr',
    defaultMessage: 'Please select atleast one student!!'
  },
  close: {
    id: 'src_close',
    defaultMessage: 'Close'
  },
  pass: {
    id: 'src_pass',
    defaultMessage: 'Pass'
  },
  fail: {
    id: 'src_fail',
    defaultMessage: 'RETENTION'
  },
  modify: {
    id: 'src_modify',
    defaultMessage: 'Modify'
  },
  add: {
    id: 'src_add',
    defaultMessage: 'Add'
  },
  studentList: {
    id: 'src_studentList',
    defaultMessage: 'Student(s)'
  },
  noStdErr: {
    id: 'src_noStdErr',
    defaultMessage: 'Select year To Proceed'
  },
  noSecErr: {
    id: 'src_noSecErr',
    defaultMessage: `Select ${alias_names['standard']} To Proceed`
  },
  selectStandard: {
    id: 'src_selectStandard',
    defaultMessage: `Select ${alias_names['standard']}`
  },
  address: {
    id: 'src_address',
    defaultMessage: 'Address'
  },
  address1: {
    id: 'src_address1',
    defaultMessage: 'Address Line 1'
  },
  address2: {
    id: 'src_address2',
    defaultMessage: 'Address Line 2'
  },
  country: {
    id: 'src_country',
    defaultMessage: 'Country'
  },
  state: {
    id: 'src_state',
    defaultMessage: 'State'
  },
  district: {
    id: 'src_district',
    defaultMessage: 'District'
  },
  city: {
    id: 'src_city',
    defaultMessage: 'City'
  },
  pincode: {
    id: 'src_pincode',
    defaultMessage: 'Pincode'
  },
  start_date: {
    id: 'src_startDate',
    defaultMessage: 'Start Date'
  },
  end_date: {
    id: 'src_endDate',
    defaultMessage: 'End Date'
  },
  reset: {
    id: 'src_reset',
    defaultMessage: 'Reset'
  },
  financialYear: {
    id: 'src_financialYear',
    defaultMessage: 'Financial Year',
  },
  subjectName: {
    id: 'src_subjectName',
    defaultMessage: 'Subject Name',
  },
  courseName: {
    id: 'src_courseName',
    defaultMessage: 'Course Name',
  },
  isLanguage: {
    id: 'src_isLanguage',
    defaultMessage: 'Is Language',
  },
  strength: {
    id: 'src_strength',
    defaultMessage: 'Strength',
  },
  sectionName: {
    id: 'src_sectionName',
    defaultMessage: `${alias_names['section']} Name`,
  },
  maxStrength: {
    id: 'src_maxStrength',
    defaultMessage: 'Max Strength {value}',
  },
  invalidValue: {
    id: 'src_invalidValue',
    defaultMessage: 'Invalid Value',
  },
  showMore: {
    id: 'src_showMore',
    defaultMessage: 'Show More',
  },
  showLess: {
    id: 'src_showLess',
    defaultMessage: 'Show Less',
  },
  mobileNo: {
    id: 'src_mobileNo',
    defaultMessage: 'Mobile No.',
  },
  dateRange: {
    id: 'src_dateRange',
    defaultMessage: 'Date Range',
  },
  email: {
    id: 'src_email',
    defaultMessage: 'Email',
  },
  gender: {
    id: 'src_gender',
    defaultMessage: 'Gender',
  },
  firstName: {
    id: 'src_firstName',
    defaultMessage: 'First Name',
  },
  middleName: {
    id: 'src_middleName',
    defaultMessage: 'Middle Name',
  },
  lastName: {
    id: 'src_lastName',
    defaultMessage: 'Last Name',
  },
  dateOfJoining: {
    id: 'src_dateOfJoining',
    defaultMessage: 'Date Of Joining',
  },
  dateLeft: {
    id: 'src_dateLeft',
    defaultMessage: 'Date Left',
  },
  workDateOfJoining: {
    id: 'src_workDateOfJoining',
    defaultMessage: 'Working Date Of Joining',
  },
  workDateLeft: {
    id: 'src_workDateLeft',
    defaultMessage: 'Working Date Left',
  },
  aadharNumber: {
    id: 'src_aadharNumber',
    defaultMessage: 'Aadhar No.',
  },
  altMobileNo: {
    id: 'src_altMobileNo',
    defaultMessage: 'Alternative Mobile No.',
  },
  stsNumber: {
    id: 'src_stsNumber',
    defaultMessage: 'Sts No.',
  },
  accountNumber: {
    id: 'src_accountNumber',
    defaultMessage: 'Account No.',
  },
  ifscCode: {
    id: 'src_ifscCode',
    defaultMessage: 'IFSC Code',
  },
  totalMarks: {
    id: 'src_totalMarks',
    defaultMessage: 'Total Marks',
  },
  maxMarks: {
    id: 'src_maxMarks',
    defaultMessage: 'Max Marks',
  },
  selectStudentType: {
    id: 'src_selectStudentType',
    defaultMessage: 'Select Student Type',
  },
  clickHere: {
    id: 'src_sclickHere',
    defaultMessage: 'Click Here',
  },
  passwordInvalidError: {
    id: 'src_passwordInvalidError',
    defaultMessage: 'Password Should Contain Atleast 8 length',
  },
  enable: {
    id: 'src_enable',
    defaultMessage: 'Enable'
  },
  disable: {
    id: 'src_disable',
    defaultMessage: 'Disable'
  },
  tableLoading: {
    id: 'src_tableLoading',
    defaultMessage: 'Loading...'
  },
  tableNoMatch: {
    id: 'src_tableNoMatch',
    defaultMessage: 'Sorry, there is no matching data to display'
  },
  amountPaid: {
    id: `src_amountPaid`,
    defaultMessage: `Amount Paid`
  },
  modOfPayment: {
    id: `src_modOfPayment`,
    defaultMessage: `Mode Of Payment`
  },
  discount: {
    id: `src_discount`,
    defaultMessage: `Discount`
  },
  generateReport: {
    id: `src_generateReport`,
    defaultMessage: `Generate Report`
  },
  enterValidAmount: {
    id: `src_enterValidAmount`,
    defaultMessage: `Enter Valid Amount`
  },
  phoneNo: {
    id: `src_phoneNo`,
    defaultMessage: `Phone No`
  },
  sectionErr: {
    id: `src_sectionErr`,
    defaultMessage: `section not selected`
  },
  toStandard: {
    id: `src_toStandard`,
    defaultMessage: `To Standard`
  },
  firstLang: {
    id: `src_firstLang`,
    defaultMessage: `Lang 1`
  },
  secondLang: {
    id: `src_secondLang`,
    defaultMessage: `Lang 2`
  },
  thirdLang: {
    id: `src_thirdLang`,
    defaultMessage: `Lang 3`
  },
  collection: {
    id: `src_collection`,
    defaultMessage: `Collection`
  },
  expense: {
    id: `src_expense`,
    defaultMessage: `Expense`
  },
  apply: {
    id: `src_apply`,
    defaultMessage: `Apply`
  },
  applied: {
    id: `src_applied`,
    defaultMessage: `Applied`
  },
  staffName: {
    id: 'src_staffName',
    defaultMessage: 'Staff Name'
  },
  slno: {
    id: 'src_slNo',
    defaultMessage: 'Sl No'
  },
  transactionDate: {
    id: 'src_transactionDate',
    defaultMessage: 'Transaction Date'
  },
  profilePic: {
    id: 'src_profilePic',
    defaultMessage: 'Profile Pic'
  },
  status: {
    id: 'src_status',
    defaultMessage: 'Status'
  },
  present: {
    id: 'src_present',
    defaultMessage: 'Present'
  },
  absent: {
    id: 'src_absent',
    defaultMessage: 'Absent'
  },
  attendance: {
    id: 'src_attendance',
    defaultMessage: 'Attendance'
  },
  print: {
    id: 'src_print',
    defaultMessage: 'Print'
  },
  selectFinancialYear: {
    id: 'src_selectFinancialYear',
    defaultMessage: 'Select Financial year',
  },
  rate: {
    id: 'src_rate',
    defaultMessage: 'Rate',
  },
  employeeID: {
    id: 'src_employeeID',
    defaultMessage: 'Employee ID',
  },
  joiningDate: {
    id: 'src_joiningDate',
    defaultMessage: 'Joining Date',
  },
  paid: {
    id: 'src_paid',
    defaultMessage: 'Paid',
  },
  month: {
    id: 'src_month',
    defaultMessage: 'Month',
  },
  payNow: {
    id: 'src_payNow',
    defaultMessage: 'Pay Now',
  },
  download: {
    id: 'src_download',
    defaultMessage: 'Download',
  },
  type: {
    id: 'src_type',
    defaultMessage: 'Type',
  },
  salary: {
    id: 'src_salary',
    defaultMessage: 'Salary',
  },
  designation: {
    id: 'src_designation',
    defaultMessage: 'Designation',
  },
  noOfStudents: {
    id: 'src_noOfStudents',
    defaultMessage: 'No. Of Students',
  },
  sectionNames: {
    id: 'src_sectionNames',
    defaultMessage: `${alias_names['section']} Name(s)`,
  },
  result: {
    id: 'src_result',
    defaultMessage: 'Result',
  },
  select: {
    id: 'src_select',
    defaultMessage: 'Select',
  },
  selectSection: {
    id: 'src_selectSection',
    defaultMessage: `Select ${alias_names['section']}`
  },
  admissioNo: {
    id: 'src_admissioNo',
    defaultMessage: 'Admission No.',
  },
  username: {
    id: 'src_username',
    defaultMessage: 'Username',
  },
  json: {
    id: 'src_json',
    defaultMessage: 'JSON',
  },
  enableDisable: {
    id: `src_enableDisable`,
    defaultMessage: `Enable/Disable`
  },
  barcodeNumber: {
    id: `src_barcodeNumber`,
    defaultMessage: `Barcode`
  },
  certificateType:{
    id: `src_certificate`,
    defaultMessage: `Certificate`
  },
  studycertificate: {
    id: 'src_Containers_Certificates_studyCertificate',
    defaultMessage: 'Study Certificate',
  },
  charactercertificate: {
    id: 'src_Containers_Certificates_characterCertificate',
    defaultMessage: 'Character Certificate',
  },
  admissionAbstract: {
    id: 'src_Containers_Certificates_admissionAbstract',
    defaultMessage: 'Admission Abstract',
  },tccertificate: {
    id: 'src_Containers_Certificates_tcCertificate',
    defaultMessage: 'TC Certificate',
  },
  CircularType : {
    id: 'src_Containers_Certificates_CircularType',
    defaultMessage: 'CircularType',
  },
  monthWise: {
    id: `src_monthWise`,
    defaultMessage: `Month Wise`
  },
  dayWise: {
    id: `src_dayWise`,
    defaultMessage: `Day Wise`
  },
 department: {
    id: 'src_department',
    defaultMessage: 'Department'
  },
  aboutCIS : {
    id: `src_aboutCIS`,
    defaultMessage: `How did you know about CIS`
  },
  transport : {
    id :`transport`,
    defaultMessage : `Transport Required?`
  }
})