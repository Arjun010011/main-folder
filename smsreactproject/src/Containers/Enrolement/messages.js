import { defineMessages } from "react-intl";

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


export default defineMessages({
  assignSubjectsHead: {
    id: "src_Containers_Enrolement_assignSubjectsHead",
    defaultMessage: "Assign subjects",
  },
  firstLang: {
    id: "src_Containers_Enrolement_firstLang",
    defaultMessage: "First Language",
  },
  secondLang: {
    id: "src_Containers_Enrolement_secondLang",
    defaultMessage: "Second Language",
  },
  thirdLang: {
    id: "src_Containers_Enrolement_thirdLang",
    defaultMessage: "Third Language",
  },
  subjectError: {
    id: "src_Containers_Enrolement_subjectError",
    defaultMessage: "Please select atleast one subject",
  },
  lang1: {
    id: "src_Containers_Enrolement_lang1",
    defaultMessage: "Lang 1",
  },
  lang2: {
    id: "src_Containers_Enrolement_lang2",
    defaultMessage: "Lang 2",
  },
  lang3: {
    id: "src_Containers_Enrolement_lang3",
    defaultMessage: "Lang 3",
  },
  enrollStudents: {
    id: "src_Containers_Enrolement_enrollStudents",
    defaultMessage: "Enroll Students",
  },
  enrollment: {
    id: "src_Containers_Enrolement_enrollment",
    defaultMessage: "Enrollment",
  },
  unenrolled: {
    id: "src_Containers_Enrolement_unenrolled",
    defaultMessage: "Unenrolled",
  },
  enrolled: {
    id: "src_Containers_Enrolement_enrolled",
    defaultMessage: "Enrolled",
  },
  enrollingStudents: {
    id: "src_Containers_Enrolement_enrollingStudents",
    defaultMessage: "Enrolling Students",
  },
  toacademicYear: {
    id: "src_Containers_Enrolement_toacademicYear",
    defaultMessage: "To Academic Year",
  },
  promotepassStuHead: {
    id: "src_Containers_Enrolement_promotepassStuHead",
    defaultMessage:
      "Students selected Promote from {from_standard_name} to {to_standard_name}",
  },
  promoteFailStuHead: {
    id: "src_Containers_Enrolement_promoteFailStuHead",
    defaultMessage: "Students selected to fail in {from_standard_name}",
  },
  nextYearErr: {
    id: "src_Containers_Enrolement_nextYearErr",
    defaultMessage:
      "Next Academic Year not Found! Please Add Next Academic Year to Promote the Student",
  },
  promoteHead: {
    id: "src_Containers_Enrolement_promoteHead",
    defaultMessage: "Promote Student",
  },
  assignSubjetsStdErr: {
    id: "src_Containers_Enrolement_assignSubjetsStdErr",
    defaultMessage:
      `Please Select the Academic year, ${alias_names['standard']} and ${alias_names['section']} to view the student assigned subjects`,
  },
  subToStu: {
    id: "src_Containers_Enrolement_subToStu",
    defaultMessage: "Subject to students",
  },
  suffleStudentsHead: {
    id: "src_Containers_Enrolement_suffleStudentsHead",
    defaultMessage: "Shuffle students",
  },
  noStuShuffleErr: {
    id: "src_Containers_Enrolement_noStuShuffleErr",
    defaultMessage:
      `No students are available in both the ${alias_names['section']}'s to submit!!`,
  },
  noCgngShuffleErr: {
    id: "src_Containers_Enrolement_noCgngShuffleErr",
    defaultMessage: "No changes are done. Please check and submit!!",
  },
  norightErr: {
    id: "src_Containers_Enrolement_norightErr",
    defaultMessage: `Select Right ${alias_names['section']} To Proceed`, 
  },
  noleftErr: {
    id: "src_Containers_Enrolement_noleftErr",
    defaultMessage: `Select Left ${alias_names['section']} To Proceed`,
  },
  reportHistory: {
    id: "src_Containers_Enrolement_reportHistory",
    defaultMessage: "Report History",
  },
  tcHead: {
    id: "src_Containers_Enrolement_tcHead",
    defaultMessage: "TC Students",
  },
  previousYearEnrollmentData:{
    id: "src_Containers_Enrolement_previousYearEnrollmentData",
    defaultMessage: "Copy Other Academic Year Enrollment data to ",
  },
  changeStandardTitle: {
    id: "src_Containers_Enrolement_changeStandardTitle",
    defaultMessage: "Change standard (same academic year)",
  },
  changeStandardInfoBanner: {
    id: "src_Containers_Enrolement_changeStandardInfoBanner",
    defaultMessage:
      "Choose academic year and class (standard) to load everyone in that class: all sections when you leave section as “All sections”, or one section when you pick it. The list mixes enrolled students and those mapped to the class but not on a section roll (shown as “not on roll”). Profile “current standard” must match before a move. Then pick the new standard and review impact.",
  },
  changeStandardHistoryTitle: {
    id: "src_Containers_Enrolement_changeStandardHistoryTitle",
    defaultMessage: "Recent standard moves (audit)",
  },
  changeStandardHistoryHint: {
    id: "src_Containers_Enrolement_changeStandardHistoryHint",
    defaultMessage:
      "Log for the selected academic year. When a class is selected above, only moves from that class are listed; otherwise all moves for the year (up to 500).",
  },
  changeStandardHistoryEmpty: {
    id: "src_Containers_Enrolement_changeStandardHistoryEmpty",
    defaultMessage: "No standard moves recorded yet for this filter.",
  },
  changeStandardAllSections: {
    id: "src_Containers_Enrolement_changeStandardAllSections",
    defaultMessage: "All sections",
  },
  changeStandardTargetLabel: {
    id: "src_Containers_Enrolement_changeStandardTargetLabel",
    defaultMessage: "New standard",
  },
  changeStandardReviewImpact: {
    id: "src_Containers_Enrolement_changeStandardReviewImpact",
    defaultMessage: "Review impact",
  },
  changeStandardImpactTitle: {
    id: "src_Containers_Enrolement_changeStandardImpactTitle",
    defaultMessage: "Standard change — impact",
  },
  changeStandardMoveSummary: {
    id: "src_Containers_Enrolement_changeStandardMoveSummary",
    defaultMessage: "Selected students will move from {fromName} to {toName}.",
  },
  changeStandardErrors: {
    id: "src_Containers_Enrolement_changeStandardErrors",
    defaultMessage: "Blocked — fix these before continuing",
  },
  changeStandardWarnings: {
    id: "src_Containers_Enrolement_changeStandardWarnings",
    defaultMessage: "Warnings — review after the change",
  },
  changeStandardAffectedAreas: {
    id: "src_Containers_Enrolement_changeStandardAffectedAreas",
    defaultMessage: "Areas that may be affected",
  },
  changeStandardNoOtherImpact: {
    id: "src_Containers_Enrolement_changeStandardNoOtherImpact",
    defaultMessage: "No extra module flags from this check (still review warnings above).",
  },
  changeStandardReason: {
    id: "src_Containers_Enrolement_changeStandardReason",
    defaultMessage: "Reason (stored in audit log)",
  },
  changeStandardApply: {
    id: "src_Containers_Enrolement_changeStandardApply",
    defaultMessage: "Apply standard change",
  },
  changeStandardConfirmTitle: {
    id: "src_Containers_Enrolement_changeStandardConfirmTitle",
    defaultMessage: "Apply this standard change?",
  },
  changeStandardConfirmText: {
    id: "src_Containers_Enrolement_changeStandardConfirmText",
    defaultMessage:
      "This updates class mapping, profile current standard, repoints fee-plan feature mappings and payment lines to matching plans on the new standard where possible, and moves enrollments to the first section of the new standard.",
  },
  changeStandardPickTarget: {
    id: "src_Containers_Enrolement_changeStandardPickTarget",
    defaultMessage: "Select the new standard first.",
  },
  changeStandardTargetMustDiffer: {
    id: "src_Containers_Enrolement_changeStandardTargetMustDiffer",
    defaultMessage: "New standard must be different from the current one.",
  },
  changeStandardFeeMapTitle: {
    id: "src_Containers_Enrolement_changeStandardFeeMapTitle",
    defaultMessage: "Fee plan mapping (current standard → new standard)",
  },
  changeStandardFeeMapSummary: {
    id: "src_Containers_Enrolement_changeStandardFeeMapSummary",
    defaultMessage:
      "Each distinct fee plan on the current standard maps to a default plan on the new standard (same fee type; same term when possible). You can override targets per line below.",
  },
  changeStandardFeeMapOldPlan: {
    id: "src_Containers_Enrolement_changeStandardFeeMapOldPlan",
    defaultMessage: "Current fee plan",
  },
  changeStandardFeeMapNewPlan: {
    id: "src_Containers_Enrolement_changeStandardFeeMapNewPlan",
    defaultMessage: "Default target on new standard",
  },
  changeStandardFeeMapMatch: {
    id: "src_Containers_Enrolement_changeStandardFeeMapMatch",
    defaultMessage: "How it was matched",
  },
  changeStandardFeePerStudent: {
    id: "src_Containers_Enrolement_changeStandardFeePerStudent",
    defaultMessage: "Per-student lines (features & receipts)",
  },
  changeStandardFeeFeatureRows: {
    id: "src_Containers_Enrolement_changeStandardFeeFeatureRows",
    defaultMessage: "Student fee-plan features",
  },
  changeStandardFeePaymentRows: {
    id: "src_Containers_Enrolement_changeStandardFeePaymentRows",
    defaultMessage: "Paid receipt lines (payment details)",
  },
  changeStandardFeeTargetSelect: {
    id: "src_Containers_Enrolement_changeStandardFeeTargetSelect",
    defaultMessage: "Target fee plan on new standard",
  },
  changeStandardFeeUseDefault: {
    id: "src_Containers_Enrolement_changeStandardFeeUseDefault",
    defaultMessage: "Use default (auto)",
  },
  changeStandardFeeUnmapped: {
    id: "src_Containers_Enrolement_changeStandardFeeUnmapped",
    defaultMessage: "No auto target — choose a plan",
  },
  changeStandardFeeAdjustmentTitle: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjustmentTitle",
    defaultMessage: "Adjust receipt line amounts (lower standard fee)",
  },
  changeStandardFeeAdjustmentIntro: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjustmentIntro",
    defaultMessage:
      "Collected amounts on the current standard are higher than the fee on the new standard for the lines below. Reduce “Amount paid” on each receipt line so that, for each fee plan group, the sum of (amount paid + fine) is not more than “Payable on new standard”. Minimum amount paid is the fine on that line. Then re-check; if validation passes, apply the standard change and your edits are saved together.",
  },
  changeStandardFeeAdjustmentOpen: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjustmentOpen",
    defaultMessage: "Adjust receipt amounts",
  },
  changeStandardFeeAdjustmentRecheck: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjustmentRecheck",
    defaultMessage: "Re-check with these amounts",
  },
  changeStandardRecheckImpact: {
    id: "src_Containers_Enrolement_changeStandardRecheckImpact",
    defaultMessage: "Re-check impact",
  },
  changeStandardFeeAdjPayable: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjPayable",
    defaultMessage: "Payable on new standard",
  },
  changeStandardFeeAdjCollected: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjCollected",
    defaultMessage: "Total collected (current)",
  },
  changeStandardFeeAdjExcess: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjExcess",
    defaultMessage: "Excess",
  },
  changeStandardFeeAdjAmountPaid: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjAmountPaid",
    defaultMessage: "New amount paid",
  },
  changeStandardFeeAdjMinNote: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjMinNote",
    defaultMessage: "Min = fine on line",
  },
  changeStandardFeeAdjustmentSuggestedHint: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjustmentSuggestedHint",
    defaultMessage:
      "Suggested amounts split the excess across lines in each fee group (you can edit). New total should not exceed payable.",
  },
  changeStandardFeeAdjNewTotal: {
    id: "src_Containers_Enrolement_changeStandardFeeAdjNewTotal",
    defaultMessage: "New total (paid + fine) / payable",
  },
  changeStandardFeeAlignLabel: {
    id: "src_Containers_Enrolement_changeStandardFeeAlignLabel",
    defaultMessage: "When receipts are more than the new class fee",
  },
  changeStandardFeeAlignIncrease: {
    id: "src_Containers_Enrolement_changeStandardFeeAlignIncrease",
    defaultMessage:
      "Increase allocated fee (fee addition adjustments) to match what was collected — receipts stay unchanged.",
  },
  changeStandardFeeAlignReduce: {
    id: "src_Containers_Enrolement_changeStandardFeeAlignReduce",
    defaultMessage: "Reduce receipt amounts instead (use adjustment screen to edit lines).",
  },
  // assignSubErr: {
  //   id: 'src_Containers_Enrolement_assignSubErr',
  //   defaultMessage: 'please assign subjects!!'
  // }
});
