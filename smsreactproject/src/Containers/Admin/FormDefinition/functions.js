// Redux
import { createStructuredSelector } from 'reselect';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { makeAliasList } from 'Components/CommonComponent/selectors'
import { setAliasList } from 'Components/CommonComponent/actions';


import { Forms } from 'Constants/FormDefinition';
import { getKeyValueMap } from 'Includes/functions';
import { getRequest } from 'Includes/api/apicall';
import { GET_URL } from 'Includes/urls'

export const updateFormFields = (form_details, backendFieldsValue, form_name, name, isEditForm) => {
    form_details.map((parentField) => {
        if (parentField['page_details']['form_name'] === form_name) {
            backendFieldsValue.map((childField) => {
                Object.keys(parentField['page_details']['sub_sections']).map((field) => {
                    if (childField.column_name === parentField['page_details']['sub_sections'][field]['name']) {
                        parentField['page_details']['sub_sections'][field]['alias_name'] = childField.column_alias
                        if (name === 'update_label') {
                            parentField['page_details']['sub_sections'][field]['label'] = Boolean(childField.column_alias) ? childField.column_alias : parentField['page_details']['sub_sections'][field]['label']
                        }
                        parentField['page_details']['sub_sections'][field]['hidden'] = childField.hidden
                        parentField['page_details']['sub_sections'][field]['disable'] = !childField.editable
                        parentField['page_details']['sub_sections'][field]['backend_id'] = childField.id
                    }
                    if (childField.column_name !== parentField['page_details']['sub_sections'][field]['name']) {
                        parentField['page_details']['sub_sections'][field]['list'].map((insideField) => {
                            if (childField.column_name === `${parentField['page_details']['sub_sections'][field]['name']}_${insideField.name}`) {
                                if (name === 'update_label') {
                                    insideField['label'] = Boolean(childField.column_alias) ? childField.column_alias : insideField['label']
                                    insideField.required = childField.required ? childField.required : insideField.required
                                }
                                insideField.alias_name = childField.column_alias
                                insideField.required_temp = childField.required
                                insideField.hidden = childField.hidden
                                insideField.disabled = !childField.editable
                                if (!isEditForm) {
                                    insideField.default = insideField.default ? insideField.default : childField.default_value
                                }
                                insideField.default_value = insideField.default ? insideField.default : childField.default_value
                                insideField.column_name = childField.column_name
                                insideField.backend_id = childField.id
                            }
                        })
                    }
                })
            })
        }
    })
    return form_details
}

export const getFormDefiniationNames = async (formName, is_backend) => {
    // let storedAliasList = props.getAliasList;
    // if (!storedAliasList) {

    const url = GET_URL.formdefinition.api
    const params = { form_name: formName }
    let response = await getRequest(url, params, {})
    if (response && response.status === 200) {
        return await updateFields(response.data.data, formName, is_backend)
        // props.setAliasList(response.data.data);
    }
    // } else {
    //     updateFields(storedAliasList)
    // }
}

export const updateFields = (backendFieldsValue, formName, is_backend) => {
    let alias_list = []
    let updated_form_details
    if (backendFieldsValue.length !== 0 && !is_backend) {
        updated_form_details = updateFormFields(Forms, backendFieldsValue, formName, 'update_label')
        updated_form_details.map((data) => {
            if (data['page_details']['form_name'] === formName) {
                alias_list = data['page_details']['sub_sections']
            }
        })
    }
    else if (!is_backend) {
        Forms.map((data) => {
            if (data['page_details']['form_name'] === formName) {
                alias_list = data['page_details']['sub_sections']
            }
        })
    }
    if (is_backend) {
        return getKeyValueBackend(backendFieldsValue, formName)
    }
    else {
        return getKeyValueAlias(alias_list, formName)
    }
}

export const getKeyValueBackend = (alias_list, formName) => {
    let keyValueAlias = {}
    keyValueAlias = getKeyValueMap(alias_list, 'column_name', 'default_value')
    localStorage.setItem(formName, JSON.stringify(keyValueAlias));
    return keyValueAlias
}

export const getKeyValueAlias = (alias_list, formName) => {
    let keyValueAlias = {}
    Object.keys(alias_list).map((field) => {
        keyValueAlias = getKeyValueMap(alias_list[field]['list'], 'name', 'label')
    })
    localStorage.setItem(formName, JSON.stringify(keyValueAlias));
    return keyValueAlias
}

export const updateNewFormFields = (fields, form_name) => {
    let return_updated_form = []
    let return_temp = { page_details: { form_name: form_name, sub_sections: { sub_section_1: { list: [] } } } }
    let temp = {}
    fields.map((data) => {
        temp = {}
        temp.alias_name = data.column_alias
        temp.label = data.column_name
        temp.required = data.required
        temp.hidden = data.hidden
        temp.disabled = !data.editable
        temp.default_value = data.default_value
        temp.column_name = data.column_name
        temp.backend_id = data.id
        temp.description = data.description
        temp.type = 'text'
        return_temp['page_details']['sub_sections']['sub_section_1']['list'].push(temp)
    })
    return_updated_form.push(return_temp)
    return return_updated_form
}   