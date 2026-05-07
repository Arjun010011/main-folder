import { defineMessages } from 'react-intl';

const alias_names = JSON.parse(localStorage.getItem('alias_name')) ? JSON.parse(localStorage.getItem('alias_name')) : {}

export default defineMessages({
    enquiryDate: {
        id: 'src_Constants_FormDefinition_enquiryDate',
        defaultMessage: 'Enquiry Date',
    },
    fatherName: {
        id: 'src_Constants_FormDefinition_fatherName',
        defaultMessage: `Father's Name`,
    },
    fatherMobileNo: {
        id: 'src_Constants_FormDefinition_fatherMobileNo',
        defaultMessage: `Father's Mobile No.`,
    },
    fatherEmail: {
        id: 'src_Constants_FormDefinition_fatherEmail',
        defaultMessage: `Father's Email`,
    },
    fatherProfilePic: {
        id: 'src_Constants_FormDEfinition_fatherProfilePic',
        defaultMessage : `Father's Photo`
    },
    motherName: {
        id: 'src_Constants_FormDefinition_motherName',
        defaultMessage: `Mother's Name`,
    },
    motherMobileNo: {
        id: 'src_Constants_FormDefinition_motherMobileNo',
        defaultMessage: `Mother's Mobile No.`,
    },
    motherEmail: {
        id: 'src_Constants_FormDefinition_motherEmail',
        defaultMessage: `Mother's Email`,
    },
    motherProfilePic: {
        id: 'src_Constants_FormDEfinition_motherProfilePic',
        defaultMessage : `Mother's Photo`
    },
    guardianName: {
        id: 'src_Constants_FormDefinition_guardianName',
        defaultMessage: `Guardian's Name`,
    },
    guardianMobileNo: {
        id: 'src_Constants_FormDefinition_guardianMobileNo',
        defaultMessage: `Guardian's Mobile No.`,
    },
    guardianEmail: {
        id: 'src_Constants_FormDefinition_guardianEmail',
        defaultMessage: `Guardian's Email`,
    },
    guardianProfilePic: {
        id: 'src_Constants_FormDEfinition_guardianProfilePic',
        defaultMessage : `Guardian's Photo`
    },
    schoolName: {
        id: 'src_Constants_FormDefinition_schoolName',
        defaultMessage: `${alias_names['school']} Name`,
    },
    schoolAddress: {
        id: 'src_Constants_FormDefinition_schoolAddress',
        defaultMessage: `${alias_names['school']} Address`,
    },
    tcNo: {
        id: 'src_Constants_FormDefinition_tcNo',
        defaultMessage: 'TC No.',
    },
    tcDate: {
        id: 'src_Constants_FormDefinition_tcDate',
        defaultMessage: 'TC Date',
    },
    previousStandard: {
        id: 'src_Constants_FormDefinition_previousStandard',
        defaultMessage: `Previous ${alias_names['standard']}`,
    },
    aadharEidNumber: {
        id: 'src_Constants_FormDefinition_aadharEidNumber',
        defaultMessage: 'Aadhar Eid No.',
    },
    motherTongue: {
        id: 'src_Constants_FormDefinition_motherTongue',
        defaultMessage: 'Mother Tongue',
    },
    placeOfBirth: {
        id: 'src_Constants_FormDefinition_placeOfBirth',
        defaultMessage: 'Place Of Birth',
    },
    nationality: {
        id: 'src_Constants_FormDefinition_nationality',
        defaultMessage: 'Nationality',
    },
    religion: {
        id: 'src_Constants_FormDefinition_religion',
        defaultMessage: 'Religion',
    },
    category: {
        id: 'src_Constants_FormDefinition_category',
        defaultMessage: 'Category',
    },
    caste: {
        id: 'src_Constants_FormDefinition_caste',
        defaultMessage: 'Caste',
    },
    bloodGroup: {
        id: 'src_Constants_FormDefinition_bloodGroup',
        defaultMessage: 'Blood Group',
    },
    applicationDate: {
        id: 'src_Constants_FormDefinition_applicationDate',
        defaultMessage: 'Application Date',
    },
    physicallyHandicaped: {
        id: 'src_Constants_FormDefinition_physicallyHandicaped',
        defaultMessage: 'Physically Handicaped',
    },
    handicapReason: {
        id: 'src_Constants_FormDefinition_handicapReason',
        defaultMessage: 'Handicaped Reason',
    },
    physicianName: {
        id: 'src_Constants_FormDefinition_physicianName',
        defaultMessage: 'Physician Name',
    },
    insCompany: {
        id: 'src_Constants_FormDefinition_insCompany',
        defaultMessage: 'Insurance Company',
    },
    preferedHospital: {
        id: 'src_Constants_FormDefinition_preferedHospital',
        defaultMessage: 'Preferred Hospital',
    },
    fatherDob: {
        id: 'src_Constants_FormDefinition_fatherDob',
        defaultMessage: `Father's DOB`,
    },
    fatherAadharNumber: {
        id: 'src_Constants_FormDefinition_fatherAadharNumber',
        defaultMessage: `Father's Aadhar No.`,
    },
    fatherEducation: {
        id: 'src_Constants_FormDefinition_fatherEducation',
        defaultMessage: `Father's Education`,
    },
    fatherOccupation: {
        id: 'src_Constants_FormDefinition_fatherOccupation',
        defaultMessage: `Father's Occupation`,
    },
    fatherOfficeAddress: {
        id: 'src_Constants_FormDefinition_fatherOfficeAddress',
        defaultMessage: `Father's Office Address`,
    },
    fatherPanNumber: {
        id: 'src_Constants_FormDefinition_fatherPanNumber',
        defaultMessage: `Father's PAN`,
    },
    fatherTaxPayee: {
        id: 'src_Constants_FormDefinition_fatherTaxPayee',
        defaultMessage: `Is Father Indian Tax Payer`,
    },

    motherDob: {
        id: 'src_Constants_FormDefinition_motherDob',
        defaultMessage: `Mother's DOB`,
    },
    motherAadharNumber: {
        id: 'src_Constants_FormDefinition_motherAadharNumber',
        defaultMessage: `Mother's Aadhar No.`,
    },
    motherEducation: {
        id: 'src_Constants_FormDefinition_motherEducation',
        defaultMessage: `Mother's Education`,
    },
    motherOccupation: {
        id: 'src_Constants_FormDefinition_motherOccupation',
        defaultMessage: `Mother's Occupation`,
    },
    motherOfficeAddress: {
        id: 'src_Constants_FormDefinition_motherOfficeAddress',
        defaultMessage: 'Mother Office Address',
    },
    motherPanNumber: {
        id: 'src_Constants_FormDefinition_motherPanNumber',
        defaultMessage: `Mother's PAN`,
    },
    motherTaxPayee: {
        id: 'src_Constants_FormDefinition_motherTaxPayee',
        defaultMessage: `Is Mother Indian Tax Payer`,
    },
    parentsAnuualIncome: {
        id: 'src_Constants_FormDefinition_parentsAnuualIncome',
        defaultMessage: `Parent's Annual Income`,
    },
    numberOfDependents: {
        id: 'src_Constants_FormDefinition_numberOfDependents',
        defaultMessage: 'Number Of Dependents',
    },

    guardianDob: {
        id: 'src_Constants_FormDefinition_guardianDob',
        defaultMessage: `Guardian's DOB`,
    },
    guardianAadharNumber: {
        id: 'src_Constants_FormDefinition_guardianAadharNumber',
        defaultMessage: `Guardian's Aadhar No.`,
    },
    guardianEducation: {
        id: 'src_Constants_FormDefinition_guardianEducation',
        defaultMessage: `Guardian's Education`,
    },
    guardianOccupation: {
        id: 'src_Constants_FormDefinition_guardianOccupation',
        defaultMessage: `Guardian's Occupation`,
    },
    guardianOfficeAddress: {
        id: 'src_Constants_FormDefinition_guardianOfficeAddress',
        defaultMessage: `Guardian's Office Address`,
    },
    guardianPanNumber: {
        id: 'src_Constants_FormDefinition_guardianPanNumber',
        defaultMessage: `Guardian's PAN`,
    },
    guardianTaxPayee: {
        id: 'src_Constants_FormDefinition_guardianTaxPayee',
        defaultMessage: `Is Guardian Indian Tax Payer`,
    },
    guardianAnnualIncome: {
        id: 'src_Constants_FormDefinition_guardianAnnualIncome',
        defaultMessage: `Guardian's Annual Income`,
    },

    isBpl: {
        id: 'src_Constants_FormDefinition_isBpl',
        defaultMessage: 'Is BPL Holder',
    },
    bplNumber: {
        id: 'src_Constants_FormDefinition_bplNumber',
        defaultMessage: 'BPL No.',
    },
    bplIssueAuthority: {
        id: 'src_Constants_FormDefinition_bplIssueAuthority',
        defaultMessage: ' BPL Card Issue Authority',
    },
    bplIssueDate: {
        id: 'src_Constants_FormDefinition_bplIssueDate',
        defaultMessage: 'Issue Date',
    },
    particularsOfLastExamPassed: {
        id: 'src_Constants_FormDefinition_particularsOfLastExamPassed',
        defaultMessage: 'Particulars of the last exam passed',
    },
    attempts: {
        id: 'src_Constants_FormDefinition_attempts',
        defaultMessage: 'Attempts',
    },
    yearAndMonthOfPassing: {
        id: 'src_Constants_FormDefinition_yearAndMonthOfPassing',
        defaultMessage: 'Year & Month Of Passing',
    },
    resultWithClass: {
        id: 'src_Constants_FormDefinition_resultWithClass',
        defaultMessage: 'Result With Class',
    },
    kannada: {
        id: 'src_Constants_FormDefinition_kannada',
        defaultMessage: 'Kannada',
    },
    english: {
        id: 'src_Constants_FormDefinition_english',
        defaultMessage: 'English',
    },
    hindi: {
        id: 'src_Constants_FormDefinition_hindi',
        defaultMessage: 'Hindi',
    },
    mathematics: {
        id: 'src_Constants_FormDefinition_mathematics',
        defaultMessage: 'Mathematics',
    },
    science: {
        id: 'src_Constants_FormDefinition_science',
        defaultMessage: 'Science',
    },
    socialStudies: {
        id: 'src_Constants_FormDefinition_socialStudies',
        defaultMessage: 'Social Studies',
    },
    kannadaOrHindi: {
        id: 'src_Constants_FormDefinition_KannadaOrHindi',
        defaultMessage: 'Kannada/Hindi',
    },
    physics: {
        id: 'src_Constants_FormDefinition_physics',
        defaultMessage: 'Physics',
    },
    chemistry: {
        id: 'src_Constants_FormDefinition_chemistry',
        defaultMessage: 'Chemistry',
    },
    biology: {
        id: 'src_Constants_FormDefinition_biology',
        defaultMessage: 'Biology',
    },
    secondLanguage: {
        id: 'src_Constants_FormDefinition_secondLanguage',
        defaultMessage: 'Second Language',
    },
    mediumOfInstruction: {
        id: 'src_Constants_FormDefinition_MediumOfInstruction',
        defaultMessage: 'Medium Of Instruction',
    },
    extraActivity: {
        id: 'src_Constants_FormDefinition_extraActivity',
        defaultMessage: 'Extra Activity',
    },
    regNum: {
        id: 'src_Constants_FormDefinition_regNum',
        defaultMessage: 'Register No.',
    },
    workingExperience:{
        id: 'src_Constants_FormDefinition_workingExperience',
        defaultMessage: 'Working Experience',
    },
    preTotalMarks:{
        id: 'src_Constants_FormDefinition_preTotalMarks',
        defaultMessage: 'Total Marks',
    },
    preSecuredMarks:{
        id: 'src_Constants_FormDefinition_preSecuredMarks',
        defaultMessage: 'Secured Marks',
    },
    
}
);