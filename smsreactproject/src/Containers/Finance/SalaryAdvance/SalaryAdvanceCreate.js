import React, { Component } from 'react';
import { withRouter, Link } from 'react-router-dom';
import { Grid, Paper, Box, Button, Typography, Divider } from '@material-ui/core';
import Swal from 'sweetalert2';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import classNames from 'classnames';

import DynamicForm from 'Components/DynamicForm';
import loadingBar from 'images/loading.gif';
import { amountRegexWithDecimals, nameWithQuoteRegex } from 'Constants/regularExpression';
import { postRequest, getRequest } from 'Includes/api/apicall';
import { POST_URL, GET_URL } from 'Includes/urls';
import { Actions } from 'Constants/permissions';
import { dateFormat, isUserHasPermission, isObjectValuesEmpty, numberWithCommas } from 'Includes/functions';


class SalaryAdvanceCreate extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            loading: true,
            payloadData: {
                advance_type: 'SALARY_ADVANCE'
            },
            fieldErrors: {},
            calculatedEmi: null,
            fieldDetails: [
                {
                    label: 'Staff', name: 'staff', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-select-staff', default: '', type: 'dropDown',
                    list: [], customName: 'name'
                },
                {
                    label: 'Financial Year', name: 'financial_year', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-select-fy', default: '', type: 'dropDown',
                    list: [], customName: 'name'
                },
                {
                    label: 'Advance Type', name: 'advance_type', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-select-type', default: 'SALARY_ADVANCE', type: 'dropDown',
                    list: [
                        { id: 'SALARY_ADVANCE', name: 'Salary Advance' },
                        { id: 'LOAN', name: 'Loan' },
                        { id: 'OTHER', name: 'Other' }
                    ]
                },
                {
                    label: 'Total Amount', regex: amountRegexWithDecimals, name: 'total_amount', md: 6, maxLength: 15, className: 'md-up-width-85', required: true,
                    id: 'outlined-textarea-amount', default: '', rows: null, type: 'amount'
                },
                {
                    label: 'Description', regex: nameWithQuoteRegex, name: 'description', md: 6, maxLength: 255, className: 'md-up-width-85', required: false,
                    id: 'outlined-textarea', default: '', rows: null, type: 'text'
                },
                {
                    label: 'Tenure (Months)', name: 'tenure_months', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-tenure-months', default: '', type: 'number',
                    fieldKey: 'tenure_months'
                },
                {
                    label: 'Approved On', name: 'approved_on', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-textarea-approved-on', default: null, type: 'date'
                },
                {
                    label: 'Approved By', name: 'approved_by', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-select-approved-by', default: '', type: 'dropDown',
                    list: [], customName: 'name'
                },
                {
                    label: 'Interest Type', name: 'interest_type', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-select-interest-type', default: 'NONE', type: 'dropDown',
                    list: [
                        { id: 'NONE', name: 'No Interest' },
                        { id: 'SIMPLE', name: 'Simple Interest' },
                        { id: 'COMPOUND', name: 'Compound Interest' }
                    ]
                },
                {
                    label: 'Interest Rate (% per annum)', regex: amountRegexWithDecimals, name: 'interest_rate', md: 6, maxLength: 5, className: 'md-up-width-85', required: false,
                    id: 'outlined-textarea-interest', default: '0', rows: null, type: 'amount',
                    interestRateField: true
                },
                {
                    label: 'Penalty Rate (%)', regex: amountRegexWithDecimals, name: 'penalty_rate', md: 6, maxLength: 5, className: 'md-up-width-85', required: false,
                    id: 'outlined-textarea-penalty', default: '0', rows: null, type: 'amount'
                },
                {
                    label: 'Recoverable Category', name: 'category', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-select-category', default: '', type: 'dropDown',
                    list: [], customName: 'name'
                },

                {
                    label: 'Remarks', name: 'remarks', md: 12, className: 'width-100', required: false,
                    id: 'outlined-textarea-remarks', default: '', rows: 2, type: 'text_area',
                    categoryField: true
                },
                {
                    label: 'Auto Deduct from Payroll', name: 'auto_deduct_from_payroll', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-select-auto-deduct', default: 'NO', type: 'dropDown',
                    list: [
                        { id: 'YES', name: 'Yes' },
                        { id: 'NO', name: 'No' }
                    ]
                },
                {
                    label: 'Monthly Recovery Amount', regex: amountRegexWithDecimals, name: 'monthly_recovery_amount', md: 6, maxLength: 15, className: 'md-up-width-85', required: true,
                    id: 'outlined-textarea-monthly', default: '', rows: null, type: 'amount',
                    fieldKey: 'monthly_recovery', autoDeductField: true
                },

                {
                    label: 'Recovery Start Month', name: 'start_month', md: 6, className: 'md-up-width-85', required: true,
                    id: 'outlined-textarea-date', default: null, type: 'date',
                    autoDeductField: true
                },
                {
                    label: 'Deduction Priority', name: 'deduction_priority', md: 6, className: 'md-up-width-85', required: false,
                    id: 'outlined-select-priority', default: 1, type: 'dropDown',
                    list: [
                        { id: 1, name: '1 - Highest' },
                        { id: 2, name: '2' },
                        { id: 3, name: '3' },
                        { id: 4, name: '4' },
                        { id: 5, name: '5 - Lowest' }
                    ],
                    autoDeductField: true
                }
            ],
            fieldValues: null
        }
        this.viewUrl = Actions.salary_advance.view.url
    }

    componentDidMount = () => {
        this.loadDropdownData()
    }

    loadDropdownData = async () => {
        const { fieldDetails } = this.state

        try {
            const staffResponse = await getRequest(GET_URL.staff.api, { is_active: true, limit: 10 }, this.props)
            if (staffResponse && staffResponse.status === 200) {
                const staffList = staffResponse.data.data.data_list || staffResponse.data.data || []

                fieldDetails.forEach(field => {
                    if (field.name === 'staff') {
                        field.list = staffList.map(s => ({
                            id: s.id,
                            name: s.name || s.full_name || `${s.first_name} ${s.last_name}`
                        }))
                    }
                    if (field.name === 'approved_by') {
                        field.list = staffList.filter(s => s.user_id).map(s => ({
                            id: s.user_id,
                            name: s.name || s.full_name || `${s.first_name} ${s.last_name}`
                        }))
                    }
                })
            }
        } catch (e) {
            console.error('Error loading staff', e)
        }

        // Load financial years
        try {
            const fyResponse = await getRequest(GET_URL.financialyear.api, { limit: 20 }, this.props)
            if (fyResponse && fyResponse.status === 200) {
                const fyList = fyResponse.data.data.data_list || fyResponse.data.data || []
                fieldDetails.forEach(field => {
                    if (field.name === 'financial_year') {
                        field.list = fyList.map(fy => ({
                            id: fy.id,
                            name: fy.name || `${fy.start_date?.substring(0, 4)}-${fy.end_date?.substring(0, 4)}`
                        }))
                    }
                })
            }
        } catch (e) {
            console.error('Error loading financial years', e)
        }

        // Load recoverable asset categories
        try {
            const catResponse = await getRequest(GET_URL.recoverableAssetCategory.api, { is_active: true, limit: 100 }, this.props)
            if (catResponse && catResponse.status === 200) {
                const catList = catResponse.data.data.data_list || catResponse.data.data || []
                fieldDetails.forEach(field => {
                    if (field.name === 'category') {
                        field.list = catList.map(c => ({
                            id: c.id,
                            name: c.name + (c.financial_year_name ? ` (${c.financial_year_name})` : '')
                        }))
                    }
                })
            }
        } catch (e) {
            console.error('Error loading categories', e)
        }

        this.setState({
            fieldDetails,
            fieldValues: this.getFieldsForType('SALARY_ADVANCE', fieldDetails),
            loading: false
        })
    }

    getFieldsForType = (advanceType, allFields, payloadData) => {
        const autoDeduct = (payloadData || this.state.payloadData || {}).auto_deduct_from_payroll === 'YES'
        const interestType = (payloadData || this.state.payloadData || {}).interest_type || 'NONE'
        // Filter fields based on advance type, auto deduct, and interest type
        return allFields.filter(field => {
            if (field.fieldKey === 'monthly_recovery') {
                return advanceType !== 'LOAN' && autoDeduct
            }
            if (field.fieldKey === 'tenure_months') {
                return advanceType === 'LOAN'
            }
            if (field.autoDeductField) {
                return autoDeduct
            }
            if (field.interestRateField) {
                return interestType === 'SIMPLE' || interestType === 'COMPOUND'
            }
            if (field.categoryField) {
                return !!(payloadData || this.state.payloadData || {}).category
            }
            return true
        })
    }

    calculateEmi = (principal, rate, months) => {
        if (!principal || !months || months <= 0) return null

        principal = parseFloat(principal)
        rate = parseFloat(rate || 0) / 1200 // Monthly rate from annual %
        months = parseInt(months)

        if (rate === 0) {
            // No interest - simple division
            return (principal / months).toFixed(2)
        }

        // Standard EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
        const emi = principal * rate * Math.pow(1 + rate, months) / (Math.pow(1 + rate, months) - 1)
        return emi.toFixed(2)
    }

    loadCategoriesForFY = async (fyId) => {
        const { fieldDetails } = this.state
        try {
            const params = { is_active: true, limit: 100 }
            if (fyId) params.financial_year = fyId
            const catResponse = await getRequest(GET_URL.recoverableAssetCategory.api, params, this.props)
            if (catResponse && catResponse.status === 200) {
                const catList = catResponse.data.data.data_list || catResponse.data.data || []
                fieldDetails.forEach(field => {
                    if (field.name === 'category') {
                        field.list = catList.map(c => ({
                            id: c.id,
                            name: c.name + (c.financial_year_name ? ` (${c.financial_year_name})` : '')
                        }))
                    }
                })
                this.setState({ fieldDetails })
            }
        } catch (e) {
            console.error('Error loading categories for FY', e)
        }
    }

    updateParent = (name, value) => {
        let { payloadData, fieldDetails, calculatedEmi } = this.state
        payloadData[name] = value

        // If financial_year changes, reload categories
        if (name === 'financial_year') {
            payloadData.category = ''
            this.loadCategoriesForFY(value)
        }

        // If category changes, re-filter fields to show/hide asset fields
        if (name === 'category') {
            const fieldValues = this.getFieldsForType(payloadData.advance_type || 'SALARY_ADVANCE', fieldDetails, payloadData)
            if (!value) {
                delete payloadData.asset_name
                delete payloadData.remarks
            }
            this.setState({ payloadData, fieldValues })
            return
        }

        // If advance_type changes, filter fields
        if (name === 'advance_type') {
            const fieldValues = this.getFieldsForType(value, fieldDetails, payloadData)
            // Reset type-specific fields
            if (value === 'LOAN') {
                delete payloadData.monthly_recovery_amount
                calculatedEmi = null
            } else {
                delete payloadData.tenure_months
                calculatedEmi = null
            }
            this.setState({ payloadData, fieldValues, calculatedEmi })
            return
        }

        // If auto_deduct_from_payroll changes, re-filter fields
        if (name === 'auto_deduct_from_payroll') {
            const fieldValues = this.getFieldsForType(payloadData.advance_type || 'SALARY_ADVANCE', fieldDetails, payloadData)
            if (value !== 'YES') {
                delete payloadData.monthly_recovery_amount
                delete payloadData.start_month
                delete payloadData.deduction_priority
            }
            this.setState({ payloadData, fieldValues })
            return
        }

        // If interest_type changes, re-filter fields
        if (name === 'interest_type') {
            const fieldValues = this.getFieldsForType(payloadData.advance_type || 'SALARY_ADVANCE', fieldDetails, payloadData)
            if (value === 'NONE') {
                payloadData.interest_rate = '0'
            }
            this.setState({ payloadData, fieldValues })
            return
        }

        // Calculate EMI for LOAN type when relevant fields change
        if (payloadData.advance_type === 'LOAN' &&
            ['total_amount', 'tenure_months', 'interest_rate'].includes(name)) {
            calculatedEmi = this.calculateEmi(
                payloadData.total_amount,
                payloadData.interest_rate,
                payloadData.tenure_months
            )
        }

        this.setState({ payloadData, calculatedEmi })
    }

    validate = (payload) => {
        let fieldErrors = {}
        const { fieldValues } = this.state

        fieldValues.forEach(field => {
            let value = payload[field.name]
            if (field.required && (value === '' || value === null || value === undefined || value === 0)) {
                fieldErrors[field.name] = `${field.label} is required`
            }
        })

        // Extra validation for LOAN type
        if (payload.advance_type === 'LOAN') {
            if (!payload.tenure_months || parseInt(payload.tenure_months) <= 0) {
                fieldErrors.tenure_months = 'Tenure must be greater than 0'
            }
        } else {
            if (payload.monthly_recovery_amount && parseFloat(payload.monthly_recovery_amount) > parseFloat(payload.total_amount)) {
                fieldErrors.monthly_recovery_amount = 'Cannot exceed total amount'
            }
        }

        if (isObjectValuesEmpty(fieldErrors)) {
            return true
        } else {
            this.refs.salaryAdvanceForm.updateErrors(fieldErrors)
            this.setState({ fieldErrors })
            return false
        }
    }

    getPayload = () => {
        let { payloadData, fieldValues } = this.state
        fieldValues.forEach(field => {
            if (!(field.name in payloadData)) {
                payloadData[field.name] = field.default
            }
        })
        return payloadData
    }

    getStaffName = (staffId) => {
        if (!staffId) return null
        const staffField = this.state.fieldDetails.find(f => f.name === 'staff')
        if (staffField && staffField.list) {
            const staff = staffField.list.find(s => String(s.id) === String(staffId))
            if (staff) return `${staff.name} (Staff Salary Advance)`
        }
        return null
    }

    submit = () => {
        this.setState({ submitDisable: true })
        const payload = this.getPayload()

        if (this.validate(payload)) {
            const formattedPayload = {
                staff: parseInt(payload.staff) || null,
                financial_year: payload.financial_year ? parseInt(payload.financial_year) : null,
                advance_type: payload.advance_type || 'SALARY_ADVANCE',
                name: this.getStaffName(payload.staff) || `Staff ${payload.advance_type || 'SALARY_ADVANCE'}`,
                purpose: payload.description || '',
                remarks: payload.remarks || '',
                total_amount: parseFloat(payload.total_amount) || 0,
                opening_balance: parseFloat(payload.total_amount) || 0,
                start_month: payload.start_month ? dateFormat(payload.start_month, 'YYYY-MM-DD') : null,
                approved_on: payload.approved_on ? dateFormat(payload.approved_on, 'YYYY-MM-DD') : null,
                approved_by: parseInt(payload.approved_by) || null,
                interest_type: payload.interest_type || 'NONE',
                interest_rate: parseFloat(payload.interest_rate) || 0,
                penalty_rate: parseFloat(payload.penalty_rate) || 0,
                auto_deduct_from_payroll: payload.auto_deduct_from_payroll === 'YES',
                deduction_priority: parseInt(payload.deduction_priority) || 1,
                status: 'APPROVED',
                category: payload.category || null,
            }

            if (payload.advance_type === 'LOAN') {
                formattedPayload.tenure_months = parseInt(payload.tenure_months)
                formattedPayload.monthly_recovery_amount = 0
            } else {
                formattedPayload.monthly_recovery_amount = parseFloat(payload.monthly_recovery_amount) || 0
            }

            postRequest(POST_URL.salaryAdvance.api, formattedPayload, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Salary Advance has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(this.viewUrl)
                    } else {
                        this.setState({ submitDisable: false })
                    }
                })
                .catch(err => {
                    console.error('Error saving salary advance', err)
                    this.setState({ submitDisable: false })
                })
        } else {
            this.setState({ submitDisable: false })
        }
    }

    render() {
        const { submitDisable, loading, fieldValues, payloadData, calculatedEmi } = this.state
        const isLoan = payloadData.advance_type === 'LOAN'

        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }

        return (
            <Paper className={classNames('paper-background')}>
                <Box>
                    <Grid container>
                        <Grid item md={6} xs={12} className={classNames('header-align')}>
                            <Box className='heading'>
                                Add {isLoan ? 'Staff Loan' : 'Salary Advance'}
                            </Box>
                            <Box className='sub-heading'>
                                Create a new {isLoan ? 'loan' : 'salary advance'} for staff member
                            </Box>
                        </Grid>
                        <Grid item md={6} xs={12}>
                            <Box className={classNames('header-align', 'end-flex-prop')}>
                                {isUserHasPermission('salary_advance', 'view') &&
                                    <Button
                                        variant="contained"
                                        component={Link}
                                        to={this.viewUrl}
                                        className='editbutton-view'
                                    >
                                        <VisibilityOutlinedIcon className='visibility-icon' /> Salary Advance
                                    </Button>
                                }
                            </Box>
                        </Grid>
                    </Grid>
                    <Grid container className='header-padding-top'>
                        <Grid item xl={8} lg={10} md={12} xs={12}>
                            <Grid container className='add-vehicle-form'>
                                {fieldValues &&
                                    <DynamicForm
                                        fieldDetails={fieldValues}
                                        updateParent={this.updateParent}
                                        isEditForm={false}
                                        loading={loading}
                                        ref={'salaryAdvanceForm'}
                                        idFormat={'salary_advance_create_'}
                                    />
                                }

                                {isLoan && calculatedEmi && (
                                    <Grid item xs={12}>
                                        <Box mt={2} p={2} style={{ backgroundColor: '#e3f2fd', borderRadius: 8 }}>
                                            <Typography variant="subtitle1" color="primary" gutterBottom>
                                                <strong>Calculated EMI</strong>
                                            </Typography>
                                            <Typography variant="h5" color="primary">
                                                {numberWithCommas(calculatedEmi)} / month
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                {payloadData.interest_rate > 0
                                                    ? `Based on ${payloadData.interest_rate}% annual interest over ${payloadData.tenure_months} months`
                                                    : `Zero interest, ${payloadData.tenure_months} equal installments`
                                                }
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}

                                <Box className="button-group" style={{ width: '100%', marginTop: 20 }}>
                                    <Button
                                        className='submit'
                                        variant="contained"
                                        disabled={submitDisable}
                                        style={{ float: 'right' }}
                                        onClick={this.submit}
                                    >
                                        Submit
                                    </Button>
                                </Box>
                            </Grid>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
        )
    }
}

export default withRouter(SalaryAdvanceCreate)
