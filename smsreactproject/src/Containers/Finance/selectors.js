import { createSelector } from 'reselect';

const commonSelector = (state) => state.get('common');

export const makeSelectAcademicYear = () => createSelector(
    commonSelector,
    (academic_year_state) => academic_year_state.get('academic_year')
);