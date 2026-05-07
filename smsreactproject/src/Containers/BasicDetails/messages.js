import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}


export default defineMessages({
  schoolBasisViewHead: {
    id: 'src_Containers_BaicDetails_schoolBasisViewHead',
    defaultMessage: `${alias_names['school']} Details`,
  },
  schoolBasisViewSubHead: {
    id: 'src_Containers_BaicDetails_schoolBasisViewSubHead',
    defaultMessage: `The yearly schedule of the ${alias_names['school']} is defined here over a period time.The academic year over 12 months of time.`,
  },
  basicDetTopic: {
    id: 'src_Containers_BaicDetails_basicDetTopic',
    defaultMessage: 'Basic Details',
  },
  schoolAddress: {
    id: 'src_Containers_BaicDetails_schoolAddress',
    defaultMessage: `${alias_names['school']} Address`,
  },
  alternateNum: {
    id: 'src_Containers_BaicDetails_alternateNum',
    defaultMessage: ' Alternative Mobile Number',
  },
  schoolName: {
    id: 'src_Containers_BaicDetails_schoolName',
    defaultMessage: `${alias_names['school']} Name`,
  },
  schoolCode: {
    id: 'src_Containers_BaicDetails_schoolCode',
    defaultMessage: `${alias_names['school']} Code`,
  },
  boardName: {
    id: 'src_Containers_BaicDetails_boardName',
    defaultMessage: 'Board Name',
  },
  faxNumber: {
    id: 'src_Containers_BaicDetails_faxNumber',
    defaultMessage: 'Fax Number',
  },
  schoolType: {
    id: 'src_Containers_BaicDetails_schoolType',
    defaultMessage: `${alias_names['school']} Type`,
  },
  schoolGst: {
    id: 'src_Containers_BaicDetails_schoolGst',
    defaultMessage: 'GSTIN No.',
  },
  schoolMobile: {
    id: 'src_Containers_BaicDetails_schoolMobile',
    defaultMessage: 'Mobile No.',
  },
  schoolEmail: {
    id: 'src_Containers_BaicDetails_schoolEmail',
    defaultMessage: 'Email',
  },
  enquiryFormat: {
    id: 'src_Containers_BaicDetails_enquiryFormat',
    defaultMessage: 'Enquiry Format',
  },
  trusts: {
    id: 'src_Containers_BaicDetails_trusts',
    defaultMessage: 'Trust(s)',
  },
  start_date: {
    id: 'src_Containers_BaicDetails_startDate',
    defaultMessage: 'Start Date',
  },
  end_date: {
    id: 'src_Containers_BaicDetails_trusts',
    defaultMessage: 'Trust(s)',
  },
  editAcademicYear: {
    id: 'src_Containers_BasicDetails_editAcademicYear',
    defaultMessage: 'Edit Academic Year',
  },
  editFinancialYear: {
    id: 'src_Containers_BasicDetails_editFinancialYear',
    defaultMessage: 'Edit Financial Year',
  },
  editSection: {
    id: 'src_Containers_BasicDetails_editSection',
    defaultMessage: 'Edit Section Name',
  },
  editSubject: {
    id: 'src_Containers_BasicDetails_editSubject',
    defaultMessage: 'Edit Subject Name',
  },
  classStrengthLabel: {
    id: 'src_Containers_BasicDetails_classStrengthLabel',
    defaultMessage: `${alias_names['standard']}`,
  },
  addSection: {
    id: 'src_Containers_BasicDetails_addSection',
    defaultMessage: `Add ${alias_names['section']}`,
  },
  deleteClass: {
    id: 'src_Containers_BasicDetails_deleteClass',
    defaultMessage: 'Delete Class',
  },
  addSectionStrength: {
    id: 'src_Containers_BasicDetails_addSectionStrength',
    defaultMessage: `Add ${alias_names['section']}/Strength for `,
  },
  thereIsNoStandardAddStandard: {
    id: 'src_Containers_BasicDetails_thereIsNoStandardAddStandard',
    defaultMessage: ' No classes added for selected academic year, add class to expect a result ',
  },
  counterFormat: {
    id: 'src_Containers_BasicDetails_counterFormat',
    defaultMessage: 'Counter Format',
  },
  editStrengthFor: {
    id: 'src_Containers_BasicDetails_editStrengthFor',
    defaultMessage: 'Edit Strength For {standard_name} {section_name}',
  },
  searchSchoolName: {
    id: 'src_Containers_BaicDetails_searchSchoolName',
    defaultMessage: `Search ${alias_names['school']} Name`,
  },
  pocName: {
    id: 'src_Containers_BaicDetails_pocName',
    defaultMessage: "POC Name",
  },
}); 