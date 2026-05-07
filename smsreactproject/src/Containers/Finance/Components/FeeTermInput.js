import React from 'react';
import { Box, Button, TextField, Grid, Snackbar } from '@material-ui/core';
import PropTypes from 'prop-types';
import DateFnsUtils from '@date-io/date-fns';
import moment from 'moment';
import { MuiPickersUtilsProvider, KeyboardDatePicker, KeyboardTimePicker } from '@material-ui/pickers';
import ControlPointOutlinedIcon from '@material-ui/icons/ControlPointOutlined';

import { getPercent, validateDate, Alert, isUserHasPermission } from 'Includes/functions';
import AddInputField from 'Components/AddInputField';
import { validateAmount } from 'Includes/validations';
import { TRANSPORT_CODE, APPROVAL_STATUS, minDate, maxDate } from 'Constants';

import './../styles.scss';
const doNotShowTotalAmt = [TRANSPORT_CODE];

class FeeTermInput extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            fieldError: [],
            selectedFeePlan: {},
            totalAmountError: "",
            snackbar: { show: false, data: '' },
            permissions: []
        }
    }
    componentWillReceiveProps(nextProps) {
        if (this.state.selectedFeePlan !== nextProps.selectedFeePlan && nextProps.updateInputFields && nextProps.selectedFeePlan.standard_fee) {
            const fieldError = []
            for (let fee_plan = 0; fee_plan < nextProps.selectedFeePlan.standard_fee.length; fee_plan++) {
                let data = { amount: '', term_start_date: '', term_end_date: '', payment_start_date: '', payment_end_date: '' };
                fieldError.push(data);
            }
            this.setState({ fieldError, selectedFeePlan: { ...nextProps.selectedFeePlan } }, () => { this.calculateDifferenceAmount() })
        }
    }
    componentDidMount = () => {
        let permissions = [];
        if (isUserHasPermission('fee_plan', 'create')) {
            permissions.push('create');
        }
        this.setState({ permissions });
    }
    onBlurFieldValue = (e, index) => {
        let { selectedFeePlan, fieldError } = this.state;
        let { value, name } = e.target;
        fieldError[index][name] = "";
        this.setState({ selectedFeePlan, fieldError }, () => {
            this.props.updateFeeData(selectedFeePlan, false);
            this.calculateDifferenceAmount();
        })
    }
    onChangeFieldValue = (e, index) => {
        let { selectedFeePlan, fieldError } = this.state;
        let { value, name } = e.target;
        // let amount_perc = getPercent(selectedFeePlan.amount, value);
        let test = validateAmount(value, false, 0, null)
        if (value === '') {
            selectedFeePlan.standard_fee[index].amount = '';
            fieldError[index][name] = "";
        }
        else if (test.errorFound) {
            fieldError[index][name] = test.errorText;
        }
        else {
            if (!Number.isNaN(parseInt(value)) && parseInt(value) !== 0) {
                value = parseInt(value)
            }
            selectedFeePlan.standard_fee[index].amount = value;

            fieldError[index][name] = "";
        }
        this.setState({ selectedFeePlan, fieldError }, () => {
            this.props.updateFeeData(selectedFeePlan, false);
            this.calculateDifferenceAmount();
        })
    }
    onChangeTotalAmount = (e) => {
        let { value } = e.target;
        let { selectedFeePlan, totalAmountError } = this.state;
        let test = validateAmount(value);
        if (!test && value === '') {
            totalAmountError = "Please Enter Total Amount";
            selectedFeePlan.amount = value;
        }
        else if (!test) {
            totalAmountError = "special case not allowed";
        }
        else {
            if (!Number.isNaN(parseInt(value)) && parseInt(value) !== 0) {
                value = parseInt(value)
            }
            selectedFeePlan.amount = value;
            totalAmountError = "";
        }
        this.setState({ selectedFeePlan, totalAmountError }, () => {
            this.props.updateFeeData(selectedFeePlan, false);
            this.calculateDifferenceAmount();
        })
    }
    onClickActionButton = (action, index) => {
        let selectedFeePlan = JSON.parse(JSON.stringify(this.state.selectedFeePlan));
        let fieldError = [...this.state.fieldError];
        let { differenceAmount } = this.state;
        let errors
        if (action === "delete") {
            fieldError.splice(index, 1);
            selectedFeePlan.standard_fee.splice(index, 1);
            selectedFeePlan.standard_fee.forEach((element, index) => {
                element.terms = 'Term' + index;
            });
        }
        else {
            fieldError.forEach((data, index) => {
                Object.keys(data).forEach((temp) => {
                    if (data[temp] != '') {
                        errors = true
                    }
                })
            })
            if (errors) {
                let snackbar = { show: true, data: `Please Clear Errors` };
                this.setState({ snackbar });
                return
            }
            else {
                const amount = selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].amount;
                let academic_year_end_date = new Date(selectedFeePlan.academic_year_end_date);
                let academic_year_end_date_format = moment(academic_year_end_date).format('YYYY-MM-DD')
                let academic_year_start_date = new Date(selectedFeePlan.academic_year_start_date);

                let term_enddate = new Date(selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].term_end_date);
                let aterm_enddate_format = moment(term_enddate).format('YYYY-MM-DD');
                if (aterm_enddate_format === academic_year_end_date_format) {
                    let snackbar = { show: true, data: `Last term end date is equal to academic year end date` };
                    this.setState({ snackbar });
                    return
                }
                if (!Boolean(amount)) {
                    let snackbar = { show: true, data: `Add ${selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].terms} amount` };
                    this.setState({ snackbar });
                    return
                }
                let last_term_start_date = moment(selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].term_start_date);
                let last_term_end_date = moment(selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].term_end_date);

                let differenceInDays = last_term_end_date.diff(last_term_start_date, 'days')
                let term_start_date = new Date(selectedFeePlan.standard_fee[selectedFeePlan.standard_fee.length - 1].term_end_date);
                term_start_date = new Date(term_start_date.setDate(term_start_date.getDate() + 1));
                if (validateDate(term_start_date, new Date(academic_year_start_date), academic_year_end_date, 'YYYY-MM-DD') !== '') {
                    term_start_date = new Date(academic_year_end_date.setDate(academic_year_end_date.getDate() + 1));
                }
                let term_end_date = new Date(term_start_date);
                term_end_date = new Date(moment(term_end_date).add('days', differenceInDays));
                if (validateDate(term_end_date, new Date(term_start_date), academic_year_end_date, 'YYYY-MM-DD') !== '') {
                    term_end_date = new Date(academic_year_end_date.setDate(academic_year_end_date.getDate()));
                }
                let first_payment_start_date = selectedFeePlan.standard_fee[0].payment_start_date;
                let payment_start_date = new Date(first_payment_start_date);
                let payment_end_date = new Date(term_end_date);
                if (validateDate(payment_end_date, new Date(payment_start_date), academic_year_end_date, 'YYYY-MM-DD') !== '') {
                    payment_end_date = new Date(academic_year_end_date.setDate(academic_year_end_date.getDate() - 1));
                }
                let tempAmount = selectedFeePlan.codename === TRANSPORT_CODE ? 12 - parseFloat(selectedFeePlan.amount) : ((differenceAmount) >= 0) ? parseInt(differenceAmount) : 0;
                let data = { id: "", terms: "", amount: tempAmount, term_start_date, term_end_date, payment_end_date, payment_start_date };
                if (data.amount < 1) {
                    data.amount = 0;
                }
                selectedFeePlan.standard_fee.push(data);
                let errorData = { amount: '', term_start_date: '', term_end_date: '', payment_start_date: '', payment_end_date: '' };
                fieldError.push(errorData);
                differenceAmount = 0;
            }
        }
        selectedFeePlan.standard_fee.forEach((element, index) => {
            const num = index + 1
            element.terms = 'Term' + num;
        });
        this.setState({ selectedFeePlan, fieldError, differenceAmount }, () => {
            const { selectedFeePlan, fieldError } = this.state;
            let fee_index = fieldError.length - 1;
            let { term_end_date, term_start_date, payment_end_date, payment_start_date } = selectedFeePlan.standard_fee[fee_index]
            fieldError[fee_index]['term_end_date'] = this.validationForDate(selectedFeePlan, term_end_date, 'term_end_date', fee_index)
            fieldError[fee_index]['term_start_date'] = this.validationForDate(selectedFeePlan, term_start_date, 'term_start_date', fee_index);
            fieldError[fee_index]['payment_end_date'] = this.validationForDate(selectedFeePlan, payment_end_date, 'payment_end_date', fee_index)
            fieldError[fee_index]['payment_start_date'] = this.validationForDate(selectedFeePlan, payment_start_date, 'payment_start_date', fee_index)

            this.setState({ fieldError });
            this.props.updateFeeData(selectedFeePlan, false);
            this.calculateDifferenceAmount();

        })
    }
    calculateDifferenceAmount = () => {
        const selectedFeePlan = { ...this.state.selectedFeePlan };
        let total = 0;
        if (selectedFeePlan.amount && !isNaN(selectedFeePlan.amount))
            total = parseInt(selectedFeePlan.amount);
        let sumOftermsAmount = 0;
        selectedFeePlan.standard_fee.map((temp, terms) => {
            if (temp.amount && !isNaN(temp.amount))
                sumOftermsAmount = parseInt(sumOftermsAmount) + parseInt(temp.amount);
        });
        const differenceAmount = total - sumOftermsAmount;
        this.setState({ differenceAmount });
    }
    onChangeTermDate = (e, type, index) => {
        let selectedFeePlan = { ...this.state.selectedFeePlan };
        let field_name = (e && e.currentTarget) ? e.currentTarget.name : type;
        let fieldValue = e ? e : selectedFeePlan.standard_fee[index][field_name];
        fieldValue = moment(fieldValue).format("YYYY-MM-DD");
        selectedFeePlan.standard_fee[index][field_name] = fieldValue;
        this.setState({
            selectedFeePlan,
        });
    }
    handleTermsDate = (e, type, index) => {
        let selectedFeePlan = { ...this.state.selectedFeePlan };
        let field_name = (e && e.currentTarget) ? e.currentTarget.name : type;
        let fieldValue = (e && e.currentTarget) ? e.currentTarget.value : selectedFeePlan.standard_fee[index][field_name];
        if (e && (field_name.includes("start_date") || field_name.includes("end_date"))) {
            fieldValue = moment(fieldValue, 'DD-MM-YYYY').format('YYYY-MM-DD');
        }
        let errorMessage = this.validationForDate(selectedFeePlan, fieldValue, field_name, index);
        let { fieldError } = this.state;
        fieldError[index][field_name] = ''
        if (errorMessage !== '') {
            fieldError[index][field_name] = errorMessage;
            this.setState({ fieldError });
        }
        else {
            selectedFeePlan.standard_fee[index][field_name] = fieldValue;

            //dependecy check after changing date
            for (let fee_index in selectedFeePlan.standard_fee) {
                let fee = selectedFeePlan.standard_fee[fee_index];
                for (let [term_key, term_value] of Object.entries(fee)) {
                    if (term_key.includes('date') && !(index === fee_index && term_key === field_name)) {
                        fieldError[fee_index][term_key] = this.validationForDate(selectedFeePlan, term_value, term_key, fee_index);
                    }
                }
            }
            this.setState({ selectedFeePlan, fieldError }, () => {
                this.props.updateFeeData(selectedFeePlan, false);
            });
        }
    }
    validationForDate = (selectedFeePlan, fieldValue, field_name, index) => {
        let errorMessage = '';
        let academic_year_start_date = new Date(selectedFeePlan.academic_year_start_date);
        let academic_year_end_date = new Date(selectedFeePlan.academic_year_end_date);
        let academic_year_end_date_formatted = moment(academic_year_end_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
        const term_start_date = selectedFeePlan.standard_fee[index]['term_start_date'];
        const term_end_date = selectedFeePlan.standard_fee[index]['term_end_date'];
        const payment_start_date = selectedFeePlan.standard_fee[index]['payment_start_date'];
        const term_start_formatted = moment(term_start_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
        const term_end_formatted = moment(term_end_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
        const payment_start_formatted = moment(payment_start_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
        const yesterday_date = new Date(new Date().setDate(new Date().getDate() - 1));
        const validateTermStartDate = validateDate(fieldValue, academic_year_start_date, academic_year_end_date, 'YYYY-MM-DD')
        if ((field_name === 'term_start_date') && validateTermStartDate !== '') {
            let acdemic_start_date_formatted = moment(selectedFeePlan.academic_year_start_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
            let academic_year_end_date_formatted = moment(selectedFeePlan.academic_year_end_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
            errorMessage = validateTermStartDate;
            if (validateTermStartDate !== 'Invalid Date') {
                errorMessage = `${selectedFeePlan.standard_fee[index].terms} start date is not in a range of academic year(${acdemic_start_date_formatted})-(${academic_year_end_date_formatted})`;
            }
        } else if (field_name === 'term_end_date') {
            errorMessage = this.dependentDateFieldCheck(term_start_date, 'term start date', 'term end date');
            const validateTermEndtDate = validateDate(fieldValue, new Date(term_start_date), new Date(academic_year_end_date), 'YYYY-MM-DD')
            if (errorMessage === '' && validateTermEndtDate !== '') {
                errorMessage = 'Invalid Date';
                if (validateTermEndtDate !== 'Invalid Date') {
                    errorMessage = `${selectedFeePlan.standard_fee[index].terms} end date should be between ${selectedFeePlan.standard_fee[index].terms} start date(${term_start_formatted}) and academic year end date${academic_year_end_date_formatted}`;
                }
            }
        } else if (field_name === 'payment_start_date') {
            errorMessage = this.dependentDateFieldCheck(term_start_date, 'term end date', 'payment start date');
            const validatePaymentStartDate = validateDate(fieldValue, new Date(payment_start_date), new Date(term_end_date), 'YYYY-MM-DD')
            if (errorMessage === '' && validatePaymentStartDate !== '') {
                errorMessage = 'Invalid Date';
                if (validatePaymentStartDate !== 'Invalid Date') {
                    errorMessage = `${selectedFeePlan.standard_fee[index].terms} payment start date should be less than ${selectedFeePlan.standard_fee[index].terms} term end date(${term_end_formatted})`;
                }
            }
        } else if (field_name === 'payment_end_date') {
            errorMessage = this.dependentDateFieldCheck(term_start_date, 'term end date', 'payment end date');
            errorMessage = this.dependentDateFieldCheck(term_start_date, 'payment start date', 'payment end date');
            const validatePaymentEndDate = validateDate(new Date(fieldValue), new Date(payment_start_date), new Date(term_end_date), 'YYYY-MM-DD')
            if (errorMessage === '' && validatePaymentEndDate !== '') {
                errorMessage = 'Invalid Date';
                if (validatePaymentEndDate !== 'Invalid Date') {
                    errorMessage = `${selectedFeePlan.standard_fee[index].terms} payment end date should be between ${selectedFeePlan.standard_fee[index].terms} payment start date(${payment_start_formatted}) and ${selectedFeePlan.standard_fee[index].terms} term end date(${term_end_formatted})`;

                }
            }
        } else if (index > 0) {
            if (field_name === 'term_start_date') {
                let last_term_end_date = selectedFeePlan.standard_fee[index - 1]['term_end_date'];
                if (validateDate(fieldValue, new Date(last_term_end_date), academic_year_end_date, 'YYYY-MM-DD') !== '') {
                    last_term_end_date = moment(last_term_end_date, 'YYYY-MM-DD', true).format('DD-MM-YYYY');
                    errorMessage = `${selectedFeePlan.standard_fee[index].terms} start date should be greater than ${selectedFeePlan.standard_fee[index - 1].terms} end date(${last_term_end_date})`;
                }
            }
        }
        return errorMessage;
    }

    dependentDateFieldCheck = (field, fieldName, dependentFieldName) => {
        let errorMessage = ''
        if (!Boolean(field)) {
            errorMessage = `Select ${dependentFieldName} before selecting ${fieldName}`;
        }
        return errorMessage;
    }

    handleCloseSnackbar = () => {
        const snackbar = { show: false, data: '' }
        this.setState({ snackbar });
    }
    submit = () => {
        const { fieldError } = this.state;
        let snackbar = { show: false, data: '' };
        for (let fee = 0; fee < fieldError.length; fee++) {
            for (let [key, error] of Object.entries(fieldError[fee])) {
                if (error !== '') {
                    snackbar = { show: true, data: error };
                    this.setState({ snackbar });
                    return;
                }
            }
        }
        if (!snackbar.show) {
            this.props.submitFeeTems();
        }
    }

    render() {
        const { fieldError, selectedFeePlan, totalAmountError, differenceAmount, snackbar, permissions } = this.state;
        const disabled = selectedFeePlan.is_approved === APPROVAL_STATUS.approved ||
            !permissions.includes('create') ? true : false;
        const academic_year_max_date = (selectedFeePlan && selectedFeePlan.academic_year_end_date) ? moment(selectedFeePlan.academic_year_end_date).format('YYYY-MM-DD') : maxDate;
        const academic_year_min_date = (selectedFeePlan && selectedFeePlan.academic_year_start_date) ? moment(selectedFeePlan.academic_year_start_date).format('YYYY-MM-DD') : minDate;
        return (
            <Box>

                {disabled && permissions.includes('create') &&
                    <Box p={2} className="red-text">Note: Since Fee Plan is already Approved, you cannot modify fee structure.</Box>}
                {!disabled && <Box className="total-amt-box end-flex-prop">
                    Difference {selectedFeePlan.codename !== TRANSPORT_CODE ? 'Amount' : 'Percent'}: {differenceAmount}
                </Box>}
                {!doNotShowTotalAmt.includes(selectedFeePlan.codename) && <Box className="fee-term-details">
                    <TextField
                        id="outlined-name"
                        label={'Enter Total Amount*'}
                        fullWidth
                        value={selectedFeePlan.amount}
                        onChange={(e) => this.onChangeTotalAmount(e)}
                        margin="normal"
                        variant="outlined"
                        autoComplete="off"
                        helperText={totalAmountError !== "" && totalAmountError}
                        error={totalAmountError === "" || !totalAmountError ? false : true}
                        inputProps={{ maxLength: 50 }}
                        className="fee-type-inp fee-term-data"
                        disabled={true}
                    />
                </Box>}
                {selectedFeePlan.standard_fee && selectedFeePlan.standard_fee.map((term, index) => {
                    let showDeleteButton = !disabled && selectedFeePlan.standard_fee.length > 1 ? true : false;
                    let showAddButton = false;
                    if (!disabled && selectedFeePlan.standard_fee.length - 1 === index) {
                        showAddButton = true;
                    }
                    return <Box key={index}>
                        {/* <Box className="fee-term-details"> */}
                        <Box>
                            <Box className="fee-term-data term-name">{term.terms}
                            </Box>
                            <Box className="fee-term-data">
                                <Box className='fee-term-data start-date-term'>
                                    <AddInputField
                                        name={'amount'}
                                        fieldValue={term.amount}
                                        fieldError={fieldError[index]['amount']}
                                        fieldProps={this.fieldProps}
                                        label={selectedFeePlan.codename === TRANSPORT_CODE ? 'Enter Percentage *' : 'Enter Amount *'}
                                        showAddButton={false}
                                        showDeleteButton={false}
                                        onBlurFieldValue={this.onBlurFieldValue}
                                        onChangeFieldValue={this.onChangeFieldValue}
                                        onClickActionButton={this.onClickActionButton}
                                        index={index}
                                        disabled={disabled}
                                        totalAmount={selectedFeePlan.amount}
                                    />
                                </Box>

                                <Box className="date-fee-term">
                                    <Box className='start-date-term'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                autoOk
                                                required
                                                variant='inline'
                                                inputVariant='outlined'
                                                label="Term Start Date"
                                                fullWidth
                                                name='term_start_date'
                                                minDate={academic_year_min_date}
                                                maxDate={academic_year_max_date}
                                                onClose={(e) => this.handleTermsDate(e, "term_start_date", index)}
                                                onBlur={(e) => this.handleTermsDate(e, "term_start_date", index)}
                                                InputLabelProps={{ shrink: (term.term_start_date) ? true : false }}
                                                format='dd-MM-yyyy'
                                                value={term.term_start_date}
                                                onChange={(e) => this.onChangeTermDate(e, "term_start_date", index)}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                }}
                                                helperText={(!fieldError[index]['term_start_date']) ? '' : fieldError[index]['term_start_date']}
                                                error={fieldError[index]['term_start_date'] ? true : false}
                                            />
                                        </MuiPickersUtilsProvider>

                                    </Box>
                                    <Box className='start-date-term'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils} >
                                            <KeyboardDatePicker
                                                autoOk
                                                required
                                                variant='inline'
                                                inputVariant='outlined'
                                                label="Term End Date"
                                                fullWidth
                                                name='term_end_date'
                                                minDate={academic_year_min_date}
                                                maxDate={academic_year_max_date}
                                                onClose={(e) => this.handleTermsDate(e, "term_end_date", index)}
                                                onBlur={(e) => this.handleTermsDate(e, "term_end_date", index)}
                                                InputLabelProps={{ shrink: (term.term_end_date) ? true : false }}
                                                format='dd-MM-yyyy'
                                                value={term.term_end_date}
                                                onChange={(e) => this.onChangeTermDate(e, "term_end_date", index)}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                }}
                                                helperText={(!fieldError[index]['term_end_date']) ? 'Valid Format DD-MM-YYYY' : fieldError[index]['term_end_date']}
                                                error={fieldError[index]['term_end_date'] ? true : false}
                                            />
                                        </MuiPickersUtilsProvider>
                                    </Box>
                                </Box>
                                <Box className="date-fee-term">
                                    <Box className='start-date-term'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                            <KeyboardDatePicker
                                                autoOk
                                                required
                                                variant='inline'
                                                inputVariant='outlined'
                                                label="Payment Start Date"
                                                fullWidth
                                                name='payment_start_date'
                                                minDate={academic_year_min_date}
                                                maxDate={academic_year_max_date}
                                                onClose={(e) => this.handleTermsDate(e, "payment_start_date", index)}
                                                onBlur={(e) => this.handleTermsDate(e, "payment_start_date", index)}
                                                InputLabelProps={{ shrink: (term.payment_start_date) ? true : false }}
                                                format='dd-MM-yyyy'
                                                value={term.payment_start_date}
                                                onChange={(e) => this.onChangeTermDate(e, "payment_start_date", index)}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                }}
                                                helperText={(!fieldError[index]['payment_start_date']) ? 'Valid Format DD-MM-YYYY' : fieldError[index]['payment_start_date']}
                                                error={fieldError[index]['payment_start_date'] ? true : false}
                                            />

                                        </MuiPickersUtilsProvider>
                                    </Box>
                                    <Box className='start-date-term'>
                                        <MuiPickersUtilsProvider utils={DateFnsUtils} >
                                            <KeyboardDatePicker
                                                autoOk
                                                required
                                                variant='inline'
                                                inputVariant='outlined'
                                                label="Payment End Date"
                                                fullWidth
                                                name='payment_end_date'
                                                minDate={academic_year_min_date}
                                                maxDate={academic_year_max_date}
                                                onClose={(e) => this.handleTermsDate(e, "payment_end_date", index)}
                                                onBlur={(e) => this.handleTermsDate(e, "payment_end_date", index)}
                                                InputLabelProps={{ shrink: (term.payment_end_date) ? true : false }}
                                                format='dd-MM-yyyy'
                                                value={term.payment_end_date}
                                                onChange={(e) => this.onChangeTermDate(e, "payment_end_date", index)}
                                                KeyboardButtonProps={{
                                                    'aria-label': 'change date',
                                                }}
                                                helperText={(!fieldError[index]['payment_end_date']) ? 'Valid Format DD-MM-YYYY' : fieldError[index]['payment_end_date']}
                                                error={fieldError[index]['payment_end_date'] ? true : false}
                                            />

                                        </MuiPickersUtilsProvider>
                                    </Box>
                                </Box>
                            </Box>

                        </Box>
                        <Box className={'fee-term-add-button text-align-right'}>

                            {showDeleteButton && <div><Button
                                variant='contained'
                                onClick={() => this.onClickActionButton('delete', index)}
                                className='attendance-absent fee-term-delete'
                            > Delete</Button></div>}
                            {showAddButton && <div><Button
                                variant='contained'
                                onClick={() => this.onClickActionButton('add', index)}
                                className='editbutton-view mr-0 add-fee-term-but'
                            ><ControlPointOutlinedIcon className='visibility-icon' /> Add Another Term</Button></div>}
                        </Box>
                    </Box>
                })}

                <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={snackbar.show} autoHideDuration={10000} onClose={this.handleCloseSnackbar}>
                    <Alert onClose={this.handleCloseSnackbar} severity="error">
                        {snackbar.data}
                    </Alert>
                </Snackbar>
                {!disabled && <Box className='end-flex-prop'>
                    <Button className="submit fee-ter-submit-button" variant="contained" onClick={() => this.submit()} >
                        Submit
                    </Button>
                </Box>}
            </Box>
        )
    }
}

FeeTermInput.propTypes = {
    menuItems: PropTypes.array,
}

FeeTermInput.defaultProps = {
    menuItems: []
};
export default FeeTermInput