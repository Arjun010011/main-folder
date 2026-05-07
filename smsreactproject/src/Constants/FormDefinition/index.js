import EnquiryForm from './EnquiryForm';
import ApplicationForm from './ApplicationForm';
import AdmissionForm from './AdmissionForm';
import AliasNames from './AliasNames';
import LoginApplicationForm from './LoginApplicationForm';
import StudentBulkUpdateFields from './StudentBulkUpdateFields';
import StaffForm from './StaffForm';

export const Forms = [
    ...StaffForm,
    ...EnquiryForm,
    ...ApplicationForm,
    ...AdmissionForm,
    ...StudentBulkUpdateFields,
    ...AliasNames,
    ...LoginApplicationForm
]



