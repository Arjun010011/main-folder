import { createSelector } from 'reselect';
const commonSelector = (state) => state.get('common');

export const makeSelectAcademicYear = () => createSelector(
    commonSelector,
    (academic_year_state) => academic_year_state.get('academic_year')
);

export const makeEnquiryFormList = () => createSelector(
    commonSelector,
    (enquiry_form_state) => enquiry_form_state.get('enquiry_form')
);

export const makeApplicationFormList = () => createSelector(
    commonSelector,
    (application_form_state) => application_form_state.get('application_form')
);

export const makeLoginApplicationFormList = () => createSelector(
    commonSelector,
    (login_application_form_state) => login_application_form_state.get('login_application_form')
);


export const makeAdmissionFormList = () => createSelector(
    commonSelector,
    (admission_form_state) => admission_form_state.get('admission_form')
);


export const makeStaffFormList = () => createSelector(
    commonSelector,
    (staff_form_state) => staff_form_state.get('staff_form')
);


export const makeModeOfPaymentList = () => createSelector(
    commonSelector,
    (mode_of_payment_list_state) => mode_of_payment_list_state.get('mode_of_payment_list')
);
