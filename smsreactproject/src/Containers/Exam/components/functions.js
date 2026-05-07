
import { dateFormat, timeFormat } from 'Includes/functions';
import moment from 'moment';
import { getSettingValue } from 'Includes/functions';

const number_of_language = parseInt(getSettingValue('number_of_language')) > 1 ? true : false;

export const getAliasLanguage = (sequence, alias_names) => {
    let return_value
    if (number_of_language) {
        if (sequence == 1) {
            return_value = alias_names['first_language']
        }
        else if (sequence == 2) {
            return_value = alias_names['second_language']
        }
        else if (sequence == 3) {
            return_value = alias_names['third_language']
        }
    }
    if (!return_value) {
        return_value = ''
    }
    return return_value
}

export const validateBetweenTimeAndDateRangeInArrays = (fields, from, to, forDate, conflictName, alias_names) => {
    let errorFound = false
    let formatValue = 'HH:mm:ss'
    let parentFromValue, parentToValue, fromValue, toValue, parentDate, dateValue, parent_subject_code, parent_sequence, parent_is_language, child_subject_code, child_sequence, child_is_language
    fields.map((parentField, parentIndex) => {
        parentField[forDate + '_error'] = ''
        parentFromValue = moment(parentField[from], formatValue)
        parentToValue = moment(parentField[to], formatValue)
        parentDate = dateFormat(parentField[forDate], 'YYYY-MM-DD')
        parent_subject_code = parentField.subject_code
        parent_sequence = parentField.sequence
        parent_is_language = parentField.is_language
        fields.map((field, index) => {
            if (timeFormat(field[from]) && timeFormat(field[to]) && timeFormat(parentField[from]) && timeFormat(parentField[to])) {
                fromValue = timeFormat(field[from]) ? moment(field[from], formatValue) : moment(parentField[from], formatValue)
                toValue = timeFormat(field[to]) ? moment(field[to], formatValue) : moment(parentField[to], formatValue)
                dateValue = dateFormat(field[forDate], 'YYYY-MM-DD')
                child_subject_code = field.subject_code
                child_sequence = field.sequence
                child_is_language = field.is_language
                if (timeFormat(field[from]) && timeFormat(field[to]) && !timeFormat(parentField[from]) && !timeFormat(parentField[to])) {
                    parentFromValue = moment(field[from], formatValue)
                    parentToValue = moment(field[to], formatValue)
                }
                let DutyDayStartTime = moment(parentFromValue, 'HH:mm')
                let DutyDayEndTime = moment(parentToValue, 'HH:mm')
                let isAfter = true
                isAfter = (DutyDayEndTime.isAfter(DutyDayStartTime))
                if (!isAfter && parentField[from] && parentField[to] && (parentIndex !== index)) {
                    parentField[forDate + '_error'] = `End time should be greater than ${timeFormat(fromValue)}`;
                    errorFound = true
                }
                if (moment(parentFromValue).isBetween(fromValue, toValue, null, '()') && (parentDate === dateValue) && (parentIndex !== index) && ((!parentField['refBaseId'] && !field['refBaseId']) || (parentField['refBaseId'] && field['refBaseId'] && (parentField['refBaseId'] !== field['refBaseId']))) &&
                    !(parent_is_language && child_is_language && (parent_subject_code === child_subject_code || parent_sequence === child_sequence))) {
                    parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                    errorFound = true
                }
                if (moment(parentToValue).isBetween(fromValue, toValue, null, '()') && (parentDate === dateValue) && (parentIndex !== index) && ((!parentField['refBaseId'] && !field['refBaseId']) || (parentField['refBaseId'] && field['refBaseId'] && (parentField['refBaseId'] !== field['refBaseId']))) &&
                    !(parent_is_language && child_is_language && (parent_subject_code === child_subject_code || parent_sequence === child_sequence))) {
                    parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                    errorFound = true
                }
                if (!errorFound) {
                    delete parentField[forDate + '_error']
                }
            }
        })
    })
    return fields
}

export const validateBetweenTimeAndDateRangeInArraysWithSubSchedule = (fields, from, to, forDate, conflictName, alias_names) => {
    let errorFound = false
    let formatValue = 'HH:mm:ss'
    let parentFromValue, parentToValue, fromValue, toValue, parentDate, dateValue, parent_subject_code, parent_sequence, parent_is_language, child_subject_code, child_sequence, child_is_language
    fields.map((parentField, parentIndex) => {
        parentFromValue = moment(parentField[from], formatValue)
        parentToValue = moment(parentField[to], formatValue)
        parentDate = dateFormat(parentField[forDate], 'YYYY-MM-DD')
        parent_subject_code = parentField.subject_code
        parent_sequence = parentField.sequence
        parent_is_language = parentField.is_language
        fields.map((field, index) => {
            fromValue = timeFormat(field[from]) ? moment(field[from], formatValue) : moment(parentField[from], formatValue)
            toValue = timeFormat(field[to]) ? moment(field[to], formatValue) : moment(parentField[to], formatValue)
            dateValue = dateFormat(field[forDate], 'YYYY-MM-DD')
            child_subject_code = field.subject_code
            child_sequence = field.sequence
            child_is_language = field.is_language
            if (timeFormat(field[from]) && timeFormat(field[to]) && !timeFormat(parentField[from]) && !timeFormat(parentField[to])) {
                parentFromValue = moment(field[from], formatValue)
                parentToValue = moment(field[to], formatValue)
            }
            if (moment(parentFromValue).isBetween(fromValue, toValue, null, '()') && (parentDate === dateValue) && (parentIndex !== index) &&
                !(parent_is_language && child_is_language && (parent_subject_code === child_subject_code || parent_sequence === child_sequence))) {
                parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                errorFound = true
            }
            if (moment(parentToValue).isBetween(fromValue, toValue, null, '()') && (parentDate === dateValue) && (parentIndex !== index) &&
                !(parent_is_language && child_is_language && (parent_subject_code === child_subject_code || parent_sequence === child_sequence))) {
                parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                errorFound = true
            }
            if (!errorFound) {
                delete parentField[forDate + '_error']
            }
            if (field.sub_schedule_list) {
                field.sub_schedule_list.map((subSchedule, schIndex) => {
                    let SubFromValue = timeFormat(subSchedule[from]) ? moment(subSchedule[from], formatValue) : moment(parentField[from], formatValue)
                    let subToValue = timeFormat(subSchedule[to]) ? moment(subSchedule[to], formatValue) : moment(parentField[from], formatValue)
                    let subDateValue = dateFormat(subSchedule[forDate], 'YYYY-MM-DD')
                    if (moment(parentFromValue).isBetween(SubFromValue, subToValue, null, '()') && (parentDate === subDateValue)) {
                        parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)} schedule ${schIndex + 2}`;
                        subSchedule[forDate + '_error'] = `Date and Time conflict with ${parentField[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                        errorFound = true
                    }
                    if (moment(parentToValue).isBetween(SubFromValue, subToValue, null, '()') && (parentDate === subDateValue)) {
                        parentField[forDate + '_error'] = `Date and Time conflict with ${field[conflictName]} ${getAliasLanguage(child_sequence, alias_names)} schedule ${schIndex + 2}`;
                        subSchedule[forDate + '_error'] = `Date and Time conflict with ${parentField[conflictName]} ${getAliasLanguage(child_sequence, alias_names)}`;
                        errorFound = true
                    }
                    if (!errorFound) {
                        delete parentField[forDate + '_error']
                        delete subSchedule[forDate + '_error']
                    }
                })
            }

        })
    })
    return fields
}