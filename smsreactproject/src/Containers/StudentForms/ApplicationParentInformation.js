import React, { Component } from 'react'
import { Grid, FormLabel, CircularProgress, TextField, Box, Paper, FormControlLabel, Divider, Switch } from '@material-ui/core';
import _ from 'lodash';

import DynamicForm from 'Components/DynamicForm';
import Snackbar from '@material-ui/core/Snackbar';
import MuiAlert from '@material-ui/lab/Alert';
import { dateFormat } from 'Includes/functions';
import { validateMobileNumber, Alert } from 'Includes/functions';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';
import messages from './messages';

class ApplicationParentInformation extends Component {
    constructor(props) {
        super(props)
        this.state = {
            fieldErrors: {},
            fatherDetails: null,
            motherDetails: null,
            guardianDetails: null,
            bplDetails: null,
            parent: {
                address: {}, custom_form_data: {}
            },
            open: false,
            alertData: '',

        }
    }

    componentDidMount = () => {
        this.getParentInformation();
    }

    getParentInformation = () => {
        if (this.props.isEditForm && this.props.studentDetail.student_parent) {
            this.updateFatherInfo(this.props.studentDetail);
            this.updateMotherInfo(this.props.studentDetail);
            this.updateGuardianInfo(this.props.studentDetail);
            this.updateBPLInfo(this.props.studentDetail);
        }
        else if (this.props.isEditForm !== null) {
            this.updateFatherInfo();
            this.updateMotherInfo();
            this.updateGuardianInfo();
            this.updateBPLInfo();
        }
    }

    getEnquiry = (parentInf) => {
        this.setState({
            fatherDetails: null,
            motherDetails: null,
            guardianDetails: null,
        }, () => {
            this.updateFatherInfo(parentInf, true);
            this.updateMotherInfo(parentInf, true);
            this.updateGuardianInfo(parentInf, true);
        })
    }

    getExistingApplication = (parentInf) => {
        this.setState({
            fatherDetails: null,
            motherDetails: null,
            guardianDetails: null,
        }, () => {
            this.updateFatherInfo(parentInf, 'isExisiting');
            this.updateMotherInfo(parentInf, 'isExisiting');
            this.updateGuardianInfo(parentInf, 'isExisiting');
        })
    }

    updateFatherInfo = (students, isEnquiry) => {
        let studentInf = {}
        if (isEnquiry === 'isExisiting') {
            isEnquiry = false
            studentInf = students?.student_parent?.parent ?? {}
        }
        else if (isEnquiry) {
            studentInf = students
        }
        else if(students?.student_parent?.application_parent){
            studentInf = students?.student_parent?.application_parent
        }
        let { parent } = this.state;
        let { form_details } = this.props;
        let fieldDetail = _.cloneDeep(form_details.father_details.list)
        let value
        fieldDetail.forEach((field) => {
            if (field.isCustom) {
                value = students?.custom_form_data?.[field.name] ?? field.default
            }
            else {
                value = studentInf[field['name']] ? studentInf[field['name']] : field.default
            }
            if (field.type === 'dropDown' && (students?.custom_form_data?.[field.name] === false || studentInf[field['name']] === false)) {
                value = false
            }
            field.default = value
            if (field.isCustom) {
                parent['custom_form_data'][field.name] = value
            }
            else {
                parent[field['name']] = value
            }
        })
        this.setState({
            parent,
            fatherDetails: fieldDetail
        })
    }

    updateMotherInfo = (students, isEnquiry) => {
        let studentInf = students?.student_parent?.application_parent ?? {}
        if (isEnquiry) {
            studentInf = students
        }
        let { parent } = this.state
        let { form_details } = this.props;
        let fieldDetail = _.cloneDeep(form_details.mother_details.list)
        let value
        fieldDetail.forEach((field) => {
            if (field.isCustom) {
                value = students?.custom_form_data?.[field.name] ?? field.default
            }
            else {
                value = studentInf[field['name']] ? studentInf[field['name']] : field.default
            }
            field.default = value
            if (field.isCustom) {
                parent['custom_form_data'][field.name] = value
            }
            else {
                parent[field['name']] = value
            }
        })
        this.setState({
            parent,
            motherDetails: fieldDetail
        })
    }

    updateGuardianInfo = (students, isEnquiry) => {
        let studentInf = students?.student_parent?.application_guardian ?? {}
        if (isEnquiry) {
            studentInf = students
        }
        let { parent } = this.state
        let { form_details } = this.props;
        let fieldDetail = _.cloneDeep(form_details.guardian_details.list)
        let value
        fieldDetail.forEach((field) => {
            if (field.isCustom) {
                value = students?.custom_form_data?.[field.name] ?? field.default
            }
            else {
                value = studentInf?.[field['name']] ? studentInf[field['name']] : field.default
            }
            field.default = value
            if (field.isCustom) {
                parent['custom_form_data'][field.name] = value
            }
            else {
                parent[field['name']] = value
            }
        })
        this.setState({
            parent,
            guardianDetails: fieldDetail
        })
    }

    updateBPLInfo = (students) => {
        let studentInf = students?.student_details ?? {}
        let { parent } = this.state
        let { form_details } = this.props;
        let fieldDetail = _.cloneDeep(form_details.bpl_details.list)
        let value
        let bpl_exist = false
        fieldDetail.forEach((field) => {
            if (field.required) {
                bpl_exist = true
            }
            if (field.isCustom) {
                value = students?.custom_form_data?.[field.name] ?? field.default
            }
            else {
                value = studentInf[field['name']] ? studentInf[field['name']] : field.default
            }
            field.default = value
            if (field.isCustom) {
                parent['custom_form_data'][field.name] = value
            }
            else {
                parent[field['name']] = value
            }
        })
        if (bpl_exist) {
            fieldDetail[0]['default'] = true
            parent['is_bpl'] = 'yes'
        }
        this.setState({
            parent,
            bplDetails: fieldDetail
        })
    }

    updateFather = (name, value) => {
        let { parent, fatherDetails } = this.state
        fatherDetails.some((field) => {
            if (field.name === name) {
                field.default = value
                if (field.isCustom) {
                    parent['custom_form_data'][name] = value
                }
                else {
                    parent[name] = value
                }
            }
        })
        this.setState({
            fatherDetails,
            parent
        })
        this.props.handlePrompt(true)
    }

    updateMother = (name, value) => {
        let { parent, motherDetails } = this.state
        motherDetails.some((field) => {
            if (field.name === name) {
                field.default = value
                if (field.isCustom) {
                    parent['custom_form_data'][name] = value
                }
                else {
                    parent[name] = value
                }
            }
        })
        this.setState({
            motherDetails,
            parent
        })
        this.props.handlePrompt(true)
    }

    updateGuardian = (name, value) => {
        let { parent, guardianDetails } = this.state
        guardianDetails.some((field) => {
            if (field.name === name) {
                field.default = value
                if (field.isCustom) {
                    parent['custom_form_data'][name] = value
                }
                else {
                    parent[name] = value
                }
            }
        })
        this.setState({
            guardianDetails,
            parent
        })
        this.props.handlePrompt(true)
    }

    updateBpl = (name, value) => {
        let { parent, bplDetails, fieldErrors } = this.state
        bplDetails.some((field) => {
            if (field.name === name) {
                field.default = value
                if (field.isCustom) {
                    parent['custom_form_data'][name] = value
                }
                else {
                    parent[name] = value
                }
            }
        })
        delete fieldErrors[name]
        this.setState({
            bplDetails,
            parent,
            fieldErrors
        })
        this.props.handlePrompt(true)
        this.refs.father.updateErrors(fieldErrors)
    }

    scroll = () => {
        window.scrollTo(0, 0);
    }

    validate = () => {
        let { parent, fatherDetails, motherDetails, guardianDetails, bplDetails, fieldErrors } = this.state
        const { form_details } = this.props;

        let fatherTest = true;
        let motherTest = true;
        let guardianTest = true;
        let bplTest = true;
        let showError = '';
        let fatherRequired = false;
        let motherRequired = false;
        let guardianRequired = false;

        fieldErrors = {}
        this.refs.father.updateErrors(fieldErrors)
        this.refs.mother.updateErrors(fieldErrors)
        this.refs.guardian.updateErrors(fieldErrors)
        if (parent['is_bpl'] === 'yes') {
            this.refs.bpl.updateErrors(fieldErrors)
        }

        fatherDetails.map((field) => {
            if (Boolean(field.default)) {
                fatherRequired = true
                guardianRequired = false
            }
        })

        motherDetails.map((field) => {
            if (Boolean(field.default)) {
                motherRequired = true
                guardianRequired = false
            }
        })

        if (parent['mother_name'] === '' && parent['father_name'] === '') {
            guardianRequired = true
        }

        guardianDetails.map((field) => {
            if (Boolean(field.default)) {
                guardianRequired = true
            }
        })


        parent['f_dob'] = parent['f_dob'] ? dateFormat(parent['f_dob'], 'YYYY-MM-DD') : ''
        parent['m_dob'] = parent['m_dob'] ? dateFormat(parent['m_dob'], 'YYYY-MM-DD') : ''
        parent['g_dob'] = parent['g_dob'] ? dateFormat(parent['g_dob'], 'YYYY-MM-DD') : ''
        parent['bpl_issue_date'] = parent['bpl_issue_date'] ? dateFormat(parent['bpl_issue_date'], 'YYYY-MM-DD') : ''

        if (parent['father_name'] === '' && parent['mother_name'] === '') {
            guardianRequired = true
        }
        else {
            guardianRequired = false
        }

        fatherDetails.forEach((field) => {
            if (fatherRequired) {
                if (field.name === 'father_name') {
                    field.required = true
                }
            }
            else {
                field.required = false
            }
            let value = field.default;
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
                fatherTest = false
            }
            else if (field.type === 'phone_number') {
                let returnValue = validateMobileNumber(field, value)
                if (!returnValue.test) {
                    fieldErrors[name] = returnValue.error
                    fatherTest = false
                }
                else {
                    value = returnValue.value
                }
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[name] = field.regex.errorText;
                fatherTest = false
            }
        })

        motherDetails.forEach((field) => {
            if (motherRequired) {
                if (field.name === 'mother_name') {
                    field.required = true
                }
            }
            else {
                field.required = false
            }
            let value = field.default;
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
                motherTest = false
            }
            else if (field.type === 'phone_number') {
                let returnValue = validateMobileNumber(field, value)
                if (!returnValue.test) {
                    fieldErrors[name] = returnValue.error
                    motherTest = false
                }
                else {
                    value = returnValue.value
                }
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[name] = field.regex.errorText;
                motherTest = false
            }
        })

        guardianDetails.forEach((field) => {
            if (guardianRequired) {
                if (field.name === 'guardian_name') {
                    field.required = true
                }
            }
            else {
                field.required = false
            }
            let value = field.default;
            let name = field.name;
            if (field.required && (value === '' || value === null || value === 0)) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
                guardianTest = false
            }
            else if (field.type === 'phone_number') {
                let returnValue = validateMobileNumber(field, value)
                if (!returnValue.test) {
                    fieldErrors[name] = returnValue.error
                    guardianTest = false
                }
                else {
                    value = returnValue.value
                }
            }
            else if (field.regex && !field.regex.value.test(value) && value !== '') {
                fieldErrors[name] = field.regex.errorText;
                guardianTest = false
            }
        })

        bplDetails.forEach((field) => {
            let value = field.default;
            let name = field.name;
            if (field.required && (!Boolean(value))) {
                fieldErrors[name] = <FormattedMessage {...commonMessages.fieldMandatoryError} />;
                bplTest = false
            }
            else if (field.regex && !field.regex.value.test(value) && Boolean(value)) {
                fieldErrors[name] = field.regex.errorText;
                bplTest = false
            }
        })

        if (fatherTest && motherTest && guardianTest && bplTest) {
            return parent
        }
        else {
            if (!fatherTest) {
                showError = showError + ' Father Details'
            }
            if (!motherTest) {
                showError = showError + ' Mother Details'
            }
            if (!guardianTest) {
                showError = showError + ' Guardian Details'
            }
            if (!bplTest) {
                showError = showError + ' BPL Details '
            }
            this.setState({
                open: true,
                alertData: `Please Clear ${showError} Errors`,
            })
            this.refs.father.updateErrors(fieldErrors)
            this.refs.mother.updateErrors(fieldErrors)
            this.refs.guardian.updateErrors(fieldErrors)
            if (!parent['is_bpl'] && !form_details.bpl_details.hidden) {
                this.refs.bpl.updateErrors(fieldErrors)
            }
        }
    }
    handleClose = () => {
        this.setState({
            open: false
        })
    }

    render() {
        const {
            open, alertData, fatherDetails, motherDetails, guardianDetails, parent, bplDetails
        } = this.state
        const { isEditForm, loadingForm, form_details } = this.props;
        return (
            <Paper className='paper-plain-background m-b-10px'>
                {!form_details.father_details.hidden &&
                    <>
                        <Box className='form-left-heading m-t-20px m-b-20px p-t-20px'>
                            {form_details.father_details.label}
                        </Box>
                        {fatherDetails &&
                            <DynamicForm
                                fieldDetails={fatherDetails}
                                updateParent={this.updateFather}
                                loading={loadingForm}
                                ref={'father'}
                                idFormat={'application_2022_08_11_01_23_pm_'}
                            />
                        }
                        <Box mt={3} mb={3}>
                            <Divider />
                        </Box>
                    </>
                }

                {!form_details.mother_details.hidden &&
                    <>
                        <Box className='form-left-heading m-t-20px m-b-20px p-t-20px'>
                            {form_details.mother_details.label}
                        </Box>
                        {motherDetails &&
                            <DynamicForm
                                fieldDetails={motherDetails}
                                updateParent={this.updateMother}
                                loading={loadingForm}
                                ref={'mother'}
                                idFormat={'application_2022_08_11_01_23_pm_'}
                            />
                        }
                        <Box mt={3} mb={3}>
                            <Divider />
                        </Box>
                    </>
                }

                {!form_details.guardian_details.hidden &&
                    <>
                        <Box className='form-left-heading m-t-20px m-b-20px p-t-20px'>
                            {form_details.guardian_details.label}
                        </Box>
                        {guardianDetails &&
                            <DynamicForm
                                fieldDetails={guardianDetails}
                                updateParent={this.updateGuardian}
                                loading={loadingForm}
                                ref={'guardian'}
                                idFormat={'application_2022_08_11_01_23_pm_'}
                            />
                        }
                        <Box mt={3} mb={3}>
                            <Divider />
                        </Box>
                    </>
                }

                {!form_details.bpl_details.hidden &&
                    <>
                        <Box className='form-left-heading m-t-20px m-b-20px p-t-20px'>
                            {form_details.bpl_details.label}
                        </Box>
                        {bplDetails &&
                            <DynamicForm
                                fieldDetails={bplDetails}
                                updateParent={this.updateBpl}
                                isEditForm={isEditForm}
                                loading={loadingForm}
                                ref={'bpl'}
                                idFormat={'application_2022_08_11_01_23_pm_'}
                            />
                        }
                        <Box mt={3} mb={3}>
                            <Divider />
                        </Box>
                    </>
                }

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={open} autoHideDuration={2000} onClose={this.handleClose}>
                    <Alert onClose={this.handleClose} severity="error">
                        {alertData}
                    </Alert>
                </Snackbar>
            </Paper>
        )
    }
}

export default ApplicationParentInformation