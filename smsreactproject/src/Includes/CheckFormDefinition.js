import { isUserHasPermission } from 'Includes/functions';


export const isFormDefinitionEnabled = (configuration, condition, trueCondition) => {
    const config = JSON.parse(localStorage.getItem(configuration)) ? JSON.parse(localStorage.getItem(configuration)) : {}
    return config?.[condition] ? config?.[condition] == trueCondition ? true : false : false
}

export const getFormDefinitionValue = (configuration, condition, defaultValue = null) => {
    const config = JSON.parse(localStorage.getItem(configuration)) ? JSON.parse(localStorage.getItem(configuration)) : {}
    return config?.[condition] !== undefined ? config?.[condition] : defaultValue
}

export const isQuickFeeModal = () => {
    return false
    let is_fee_group_enabled = isFormDefinitionEnabled('fee_configurations', 'is_fee_group_enabled', 1)
    let hide_fee_term_sequence = isFormDefinitionEnabled('fee_configurations', 'hide_fee_term_sequence', 1)
    if (is_fee_group_enabled) {
        return false
    }
    if (!hide_fee_term_sequence) {
        return false
    }
    if (!isUserHasPermission('fee_collection_editable', 'create')) {
        return false
    }
    return true
}