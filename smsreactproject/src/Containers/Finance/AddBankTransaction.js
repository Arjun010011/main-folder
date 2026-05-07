import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter, Link } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, CircularProgress, Tooltip, Divider, Snackbar } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { MuiPickersUtilsProvider, KeyboardDatePicker, } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import DeleteIcon from '@material-ui/icons/Delete';

import ToggleButton from '@material-ui/lab/ToggleButton';
import ToggleButtonGroup from '@material-ui/lab/ToggleButtonGroup';
import commonMessages from 'Constants/messages'
import { FormattedMessage } from 'react-intl';

import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { maxFileSize, minDate } from 'Constants'
import { supported_receipts, image_formats } from 'Containers/Expenses/Constants';
import { Dropdown } from 'Components/DropDown';

import { gstinNumberRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { getRequest, putRequest, postRequest, deleteRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL, DEL_URL } from 'Includes/urls'
import { getUrlParam, numberWithCommas, dateFormat, validateDate, Alert, isUserHasPermission, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';


class AddBankTransaction extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            transaction: { receipt_preview: '', selectedFeeType: null, receipt: '', type: 'Deposit' },
            fieldErrors: {},
            financeTypeList: [],
            helperText: {},
            imagesPreview: [],
            imageUploading: false,
            largeImagePreview: '',
            loading: true,
            maximumAmount: '',
            enableUploadIcons: true,
            isEnable: {},
            upload_name: 'Upload Receipt',
            openError: false,
            alertData: 'Clear the errors',
            expenseDetails: {},
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
            bankInformation: {},
            staffList: [],
            denominationList: [],
            denominationCounts: {}
        }
    }


    componentDidMount = () => {
        this.getFinanceTypeList();
        this.getStaffList();
        this.getDenominationList();
    }

    getDenominationList = () => {
        const url = GET_URL.denominations.api;
        const params = { is_active: true };
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    denominationList: response.data.data,
                })
            }
        })
    }

    handleDenominationChange = (id, count) => {
        let { denominationCounts } = this.state;
        denominationCounts[id] = count;
        this.setState({ denominationCounts });
    }

    getDenominationTotal = () => {
        let { denominationCounts, denominationList } = this.state;
        let total = 0;
        Object.keys(denominationCounts).forEach(id => {
            const count = parseInt(denominationCounts[id]) || 0;
            const denomination = denominationList.find(d => d.id === parseInt(id));
            if (denomination && count > 0) {
                total += (denomination.amount * count);
            }
        });
        return total;
    }


    getFinanceTypeList = () => {
        const url = GET_URL.addFeeType.api
        const params = { is_active: true, assigned_for_bank: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    financeTypeList: response.data.data,
                    loading: false,
                })
            }
        })
    }

    getStaffList = () => {
        const url = GET_URL.staff.api
        const params = { is_active: true }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    staffList: response.data.data,
                })
            }
        })
    }

    handleChange(event, acceptFileType) {
        let { transaction, enableUploadIcons } = this.state
        this.setState({ enableUploadIcons: false, alertImageData: '' })
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let is_supported_types = true
        is_supported_types = supported_receipts.type.includes(file_extension.toLowerCase())
        if (event.target.files[0] && is_supported_types) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                let post = new FormData();
                post.append('file', event.target.files[0])

                if (transaction['receipt']) {
                    const url = PUT_URL.uploads.api + transaction['receipt'] + '/'
                    putRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            transaction['receipt'] = response.data.data.id
                            transaction['receipt_preview'] = response.data.data.file
                            transaction['receipt_extension'] = file_extension.toLowerCase()
                            transaction['receipt_name'] = fileName
                            this.setState({
                                transaction,
                                upload_name: 'Change Receipt'
                            })
                        }
                    })
                }
                else {
                    const url = POST_URL.uploads.api
                    postRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            transaction['receipt'] = response.data.data.id
                            transaction['receipt_preview'] = response.data.data.file
                            transaction['receipt_extension'] = file_extension.toLowerCase()
                            transaction['receipt_name'] = fileName
                            this.setState({
                                transaction,
                                upload_name: 'Change Receipt'
                            })
                        }

                    })
                }

            }
            else {
                this.setState({
                    openError: true,
                    alertData: 'Please Upload Below 3 MB Pic'
                })
            }
        }
        else if (!is_supported_types) {
            this.setState({
                openError: false,
                alertData: supported_receipts.error,
                alertImageData: supported_receipts.error
            })
        }
        enableUploadIcons = true
        this.setState({
            enableUploadIcons
        })
    }


    getAmountWithBalance = () => {
        let { transaction, bankInformation } = this.state;
        let returnValue = 0
        if (transaction.type === 'Deposit') {
            if (!isNaN(parseFloat(bankInformation.balance) + parseFloat(transaction.amount))) {
                returnValue = parseFloat(bankInformation.balance) + parseFloat(transaction.amount);
                returnValue = parseFloat(returnValue).toFixed(2)
            }
        }
        else {
            if (!isNaN(parseFloat(bankInformation.balance) - parseFloat(transaction.amount))) {
                returnValue = parseFloat(bankInformation.balance) - parseFloat(transaction.amount);
                returnValue = parseFloat(returnValue).toFixed(2)
            }
        }
        return numberWithCommas(returnValue)
    }

    getAmount = (value) => {
        let returnValue = 0
        if (!isNaN(parseFloat(value))) {
            returnValue = parseFloat(value);
        }
        return numberWithCommas(returnValue)
    }

    handleSearchChange = (e) => {
        let { transaction, fieldErrors, isEnable } = this.state;
        let { name, value } = e.target;
        if (name === 'amount') {
            isEnable['amountTax'] = true
        }
        transaction[name] = value
        delete fieldErrors[name]
        if ((name === 'amount') && !amountRegexWithDecimals.value.test(value) && value) {
            fieldErrors[name] = amountRegexWithDecimals.errorText
            this.setState({
                fieldErrors,
                transaction
            })
            return
        }
        isEnable[name] = true
        this.validateAmount()
        this.setState({
            transaction,
            isEnable,
            fieldErrors
        })
    }

    handleDropDownSearchChange = (e, newValue, name) => {
        let { transaction, fieldErrors, pageLoading } = this.state;
        transaction[name] = newValue
        delete fieldErrors[name]
        if (name === 'selectedFeeType') {
            pageLoading = true
        }
        this.setState({
            transaction,
            fieldErrors,
            isBlankPage: false,
            pageLoading
        }, () => {
            if (name === 'selectedFeeType')
                this.getBankInformation(newValue);
        })
    }

    getBankInformation = (newValue) => {
        const url = GET_URL.bankfeetype.api + newValue.id + '/'
        const params = { is_active: true, assigned_for_bank: 1 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    bankInformation: response.data.data.bank_details,
                    pageLoading: false,
                })
            }
        })
    }

    validateAmount = () => {
        let { fieldErrors, transaction, bankInformation } = this.state;
        let error = false
        if (parseFloat(bankInformation.balance) < parseFloat(transaction.amount) && transaction.type === 'Withdraw') {
            error = true
            fieldErrors['amount'] = `Enter below amount ${bankInformation.balance}`
        }
        if (parseFloat(transaction.amount) === 0) {
            error = true
            fieldErrors['amount'] = `Enter above 0 amount`
        }
        this.setState({
            fieldErrors,
            error
        })
    }

    handleDateSearchChange = (e) => {
        let { transaction, fieldErrors, helperText, isEnable } = this.state;
        transaction['selectedDate'] = e
        delete fieldErrors['selectedDate']
        helperText['selectedDate'] = ''
        isEnable['selectedDate'] = true
        let fromDate = dateFormat(minDate, 'YYYY-MM-DD')
        let toDate = dateFormat(new Date(), 'YYYY-MM-DD')
        let error = validateDate(e, fromDate, toDate)
        if (error === 'Invalid Date')
            helperText['selectedDate'] = error
        else if (error !== '')
            fieldErrors['selectedDate'] = error
        this.setState({
            transaction,
            fieldErrors,
            isEnable
        })
    }

    getDateFormat = () => {
        let { transaction } = this.state;
        let returnValue = ''
        if (dateFormat(transaction.selectedDate, 'DD-MM-YYYY') !== 'Invalid date')
            returnValue = dateFormat(transaction.selectedDate, 'DD-MM-YYYY')
        return returnValue
    }

    handleViewImage = () => {
        let { transaction } = this.state;
        if (image_formats.includes(transaction.receipt_extension)) {
            this.setState({
                largeImagePreview: transaction.receipt_preview
            })
        }
        else {
            window.open(transaction.receipt_preview);
        }
    }

    handleDeleteImage = () => {
        let { transaction } = this.state;
        if (transaction['receipt']) {
            const url = DEL_URL.uploads.api + transaction['receipt'] + '/'
            deleteRequest(url, {}, this.props).then(response => {
                if (response && response.status === 200) {
                    transaction['receipt'] = ''
                    transaction['receipt_preview'] = ''
                    transaction['receipt_name'] = ''
                    transaction['receipt_extension'] = ''
                    this.setState({
                        transaction,
                        upload_name: 'Upload Receipt'
                    })
                }
            })
        }
        else {
            transaction['receipt'] = ''
            transaction['receipt_preview'] = ''
            transaction['receipt_name'] = ''
            transaction['receipt_extension'] = ''
            this.setState({
                transaction,
                upload_name: 'Upload Receipt'
            })
        }
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    validation = () => {
        let { openError, fromDate, toDate } = this.state;
        let returnValue = true
        let { transaction, fieldErrors } = this.state;
        if (!transaction.selectedDate) {
            fieldErrors['selectedDate'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (transaction.selectedDate) {
            let error = validateDate(transaction.selectedDate, fromDate, toDate)
            if (error !== '')
                fieldErrors['selectedDate'] = error
        }
        if (!transaction.amount) {
            fieldErrors['amount'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        if (!transaction.selectedStaff) {
            fieldErrors['selectedStaff'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        }
        // if (!transaction.comment && transaction.type == 'Withdraw') {
        //     fieldErrors['comment'] = <FormattedMessage {...commonMessages.fieldMandatoryError} />
        // }
        // if (transaction.comment && transaction.comment.length <= 35) {
        //     fieldErrors['comment'] = 'Enter comment more than 35 characters'
        // }
        if (Object.keys(fieldErrors).length > 0) {
            returnValue = false
            openError = true
        }
        this.setState({
            fieldErrors,
            openError
        })

        return returnValue
    }

    submit = () => {
        let { transaction, bankInformation } = this.state;
        let validate = this.validation();
        if (validate) {
            this.setState({ submitDisable: true })
            
            let post_data = {
                date: dateFormat(transaction.selectedDate, 'YYYY-MM-DD'),
                bank: bankInformation.id,
                amount: parseFloat(transaction.amount),
                ref_number: transaction.refNumber,
                particulars: transaction.comment,
                attachment: transaction.receipt ? transaction.receipt : null,
                staff: transaction.selectedStaff.id,
                is_deposit: transaction.type === 'Deposit' ? true : false,
            }

            if (transaction.type === 'Deposit') {
                let denominationsPayload = [];
                Object.keys(this.state.denominationCounts).forEach(id => {
                    const count = parseInt(this.state.denominationCounts[id]);
                    if (count > 0) {
                        denominationsPayload.push({ "denomination": id, "count": count });
                    }
                });
                if (denominationsPayload.length > 0) {
                    post_data.denominations = denominationsPayload;
                }
            }

            let url = POST_URL.banktransaction.api;
            postRequest(url, post_data, this.props)
                .then((response) => {
                    if (response && response.status === 200) {
                        Swal.fire({
                            position: 'top-end',
                            type: 'success',
                            title: 'Your Data has been saved',
                            showConfirmButton: false,
                            timer: 1500
                        })
                        this.props.history.push(Actions.fee_type_bank_transactions.view.url)
                    }
                    this.setState({ submitDisable: false })
                });

        }
    }

    handleClose = () => {
        this.setState({
            openError: false,
            alertImageData: ''
        })
    }

    changeToggle = (event, value) => {
        let { transaction, fieldErrors } = this.state;
        if (value !== null) {
            delete fieldErrors['amount']
            delete fieldErrors['comment']
            transaction.type = value
            this.setState({
                transaction,
                fieldErrors
            }, () => {
                this.validateAmount()
            })
        }
    }

    render() {
        const { alertImageData, loading, transaction, fieldErrors, financeTypeList, helperText, enableUploadIcons, imageUploading, largeImagePreview,
            bankInformation, staffList, toDate, isEnable, upload_name, openError, alertData, submitDisable, pageLoading, isBlankPage } = this.state
        if (loading) {
            return (
                <Box display='flex'>
                    <img src={loadingBar} className='loading' alt='loading' />
                </Box>
            )
        }
        else {
            return (
                <div>
                    {largeImagePreview &&
                        <Box className='set-question-large-image-preview-box'>
                            <img src={largeImagePreview} alt='Image Preview' className='set-question-large-image-preview' />
                            <Tooltip title='Close Image' placement='top-start'>
                                <Box className='set-question-large-image-remove-icon-box'
                                    onClick={this.handleCloseLargeImage}>
                                    <HighlightOffIcon className='set-question-large-image-remove-icon' />
                                </Box>
                            </Tooltip>
                        </Box>
                    }
                    <Paper className='paper-background'>
                        <Grid container>
                            <Grid item md={8} xs={12} className='header-align'>
                                <Box className='heading'>
                                    Create a Transaction
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('sections', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.fee_type_bank_balance.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.fee_type_bank_balance.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    id="combo-box-demo"
                                    options={financeTypeList}
                                    value={transaction.selectedFeeType}
                                    onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedFeeType')}
                                    name='selectedFeeType'
                                    label='Finance Type'
                                    className='width-100'
                                    helperText={transaction.selectedFeeType ? `` : fieldErrors['selectedFeeType']}
                                    error={fieldErrors['selectedFeeType']}
                                    hideClearIcon={true}
                                />
                            </Grid>
                            <Grid item md={1}></Grid>

                        </Grid>
                        {isBlankPage && !pageLoading &&
                            <Grid item md={12} className='header-align'>
                                <BlankPagewithIcon data="Select Finance Type" />
                            </Grid>
                        }
                        {pageLoading &&
                            <Box className='loading'>
                                <CircularProgress />
                            </Box>
                        }
                        {!pageLoading && !isBlankPage &&
                            <Box>
                                <Grid container spacing={2}>
                                    <Grid item md={8} xs={12}>
                                        <Paper className='paper-plain-background header-align p-b-20px'>
                                            <Grid container spacing={3}>
                                                <Grid item md={12} xs={12} style={{ marginTop: '20px' }}>
                                                    <ToggleButtonGroup size="medium" value={transaction.type} exclusive onChange={this.changeToggle} style={{ backgroundColor: 'white' }}>
                                                        <ToggleButton key={2} value="Deposit"
                                                            className={transaction.type == 'Deposit' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                            Deposit
                                                        </ToggleButton>
                                                        <ToggleButton key={1} value="Withdraw"
                                                            className={transaction.type == 'Withdraw' ? 'selected-transaction-type' : 'not-selected-transaction-type'}>
                                                            Withdraw
                                                        </ToggleButton>
                                                    </ToggleButtonGroup>
                                                </Grid>
                                                <Grid item md={6} xs={12}>
                                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                        <KeyboardDatePicker
                                                            className='width-100'
                                                            autoComplete="off"
                                                            autoOk
                                                            variant='inline'
                                                            inputVariant="outlined"
                                                            label='Date'
                                                            minDate={minDate}
                                                            maxDate={new Date()}
                                                            name='selectedDate'
                                                            // InputLabelProps={{ shrink: transaction.selectedDate ? true : false }}
                                                            format="dd-MM-yyyy"
                                                            value={transaction.selectedDate ? transaction.selectedDate : null}
                                                            required={true}
                                                            onChange={(e) => this.handleDateSearchChange(e)}
                                                            KeyboardButtonProps={{
                                                                'aria-label': 'change date',
                                                            }}
                                                            helperText={fieldErrors['selectedDate'] === "" ? helperText['selectedDate'] : fieldErrors['selectedDate']}
                                                            error={fieldErrors['selectedDate'] && (fieldErrors['selectedDate'] === "" ? false : true)}
                                                        />
                                                    </MuiPickersUtilsProvider>
                                                </Grid>
                                                <Grid item md={6} xs={12}>
                                                    <DropDownWithSearch
                                                        id="combo-box-demo"
                                                        options={staffList}
                                                        autoComplete="off"
                                                        value={transaction.selectedStaff}
                                                        onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue, 'selectedStaff')}
                                                        optionValue='full_name'
                                                        name='selectedStaff'
                                                        label='Staff'
                                                        className='width-100'
                                                        helperText={transaction.selectedStaff ? `` : fieldErrors['selectedStaff']}
                                                        error={fieldErrors['selectedStaff']}
                                                    />

                                                </Grid>
                                            </Grid>
                                            <Grid container spacing={3} className='header-align'>
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Amount'
                                                        autoComplete="off"
                                                        required={true}
                                                        name='amount'
                                                        value={transaction.amount}
                                                        disabled={transaction.selectedFeeType ? false : true}
                                                        className='width-100'
                                                        InputProps={{
                                                            inputComponent: NumberFormatCustom,
                                                        }}
                                                        inputProps={{ maxLength: '15', style: { textAlign: 'right' } }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={transaction.selectedFeeType ? fieldErrors['amount'] ? fieldErrors['amount'] : transaction.selectedFeeType.max_amount ? `maximum amount is ${transaction.selectedFeeType.max_amount}` : '' : 'Select Expense Type to enter amount'}
                                                        error={fieldErrors['amount']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>
                                                
                                                {transaction.type === 'Deposit' && this.state.denominationList.length > 0 && (
                                                    <Grid item md={12} xs={12} style={{marginTop: '10px'}}>
                                                        <Divider />
                                                        <Box className='create-expenses-comment header-align' style={{marginTop: '10px', marginBottom: '10px'}}>Denominations (Optional)</Box>
                                                        <Grid container spacing={2}>
                                                            {this.state.denominationList.map(denom => (
                                                                <Grid item md={3} xs={6} key={denom.id}>
                                                                    <TextField
                                                                        label={`₹ ${denom.amount}`}
                                                                        autoComplete="off"
                                                                        type="number"
                                                                        value={this.state.denominationCounts[denom.id] || ''}
                                                                        className='width-100'
                                                                        inputProps={{ min: 0 }}
                                                                        fullWidth={true}
                                                                        variant="outlined"
                                                                        onChange={(e) => this.handleDenominationChange(denom.id, e.target.value)}
                                                                    />
                                                                </Grid>
                                                            ))}
                                                        </Grid>
                                                        {this.getDenominationTotal() > 0 && (
                                                            <Box mt={2} textAlign="right" fontWeight="bold">
                                                                Total Denomination Amount: {numberWithCommas(this.getDenominationTotal())}
                                                                {this.getDenominationTotal() !== parseFloat(transaction.amount || 0) && (
                                                                    <span style={{color: 'red', display: 'block', fontSize: '0.85em', fontWeight: 'normal'}}>
                                                                        Warning: Denomination total does not match entered Amount
                                                                    </span>
                                                                )}
                                                            </Box>
                                                        )}
                                                    </Grid>
                                                )}

                                                <Grid item md={6} xs={12}>

                                                    <TextField
                                                        label='Ref Number'
                                                        required={false}
                                                        autoComplete="off"
                                                        name='refNumber'
                                                        value={transaction.refNumber}
                                                        className='width-100'
                                                        inputProps={{ maxLength: '20' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={fieldErrors['refNumber'] === '' ? helperText['refNumber'] : fieldErrors['refNumber']}
                                                        error={fieldErrors['refNumber']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>
                                            </Grid>
                                            <Grid container>
                                                <Grid item md={12}>
                                                    <FormControl
                                                        fullWidth
                                                        error={fieldErrors.comment && (fieldErrors.comment ? true : false)}
                                                    >
                                                        <Box className='create-expenses-comment header-align'>Comment</Box>
                                                        <TextareaAutosize aria-label="minimum height"
                                                            className='create-expenses-comment-auto-size'
                                                            value={transaction.comment}
                                                            name='comment'
                                                            maxLength={200}
                                                            onChange={(e) => this.handleSearchChange(e)}
                                                            required
                                                        />
                                                        {fieldErrors.comment &&
                                                            <FormHelperText>{fieldErrors.comment}</FormHelperText>
                                                        }
                                                    </FormControl>
                                                </Grid>
                                            </Grid>

                                        </Paper>
                                    </Grid>

                                    <Grid item md={4} xs={12}>
                                        <Paper className='header-align create-expenses-right-part-paper'>
                                            <Box className='text-center'>
                                                <Box className='header-align'>
                                                    {enableUploadIcons &&
                                                        <label htmlFor='upload-pic'>
                                                            <Button variant="raised" component='span' className='create-expenses-upload-receipts-button'>
                                                                {upload_name}<Box className='upload-icon'><i class="fa fa-upload" aria-hidden="true"></i></Box>
                                                            </Button>
                                                        </label>
                                                    }
                                                    {alertImageData &&
                                                        <Box className='error-content p-t-20px'>{alertImageData} </Box>
                                                    }
                                                </Box>
                                                <input type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleChange(e, 'img')}
                                                    onClick={e => (e.target.value = null)} />

                                                {(transaction.receipt_preview !== '' && enableUploadIcons && transaction.receipt) &&
                                                    <Box className='flex-justify-space-around header-align'>
                                                        <Box>{transaction.receipt_name}</Box>
                                                        <Box><VisibilityOutlinedIcon onClick={this.handleViewImage} className='create-expenses-image-view' /></Box>
                                                        <Box><DeleteIcon onClick={this.handleDeleteImage} className='create-expenses-image-delete' /></Box>
                                                    </Box>
                                                }
                                                {!enableUploadIcons &&
                                                    <Box className='upload-profile-loading'>
                                                        <CircularProgress />
                                                    </Box>
                                                }
                                            </Box>
                                            <Box className='create-expenses-info-outer-box'>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Bank ID</Box>
                                                    <Box className='create-expenses-value'>{bankInformation.bank_id}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Bank Name</Box>
                                                    <Box className='create-expenses-value'>{bankInformation.bank_name}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Account Number</Box>
                                                    <Box className='create-expenses-value'>{bankInformation.account_num}</Box>
                                                </Box>
                                                <Box className='create-expenses-outer-box-label-value'>
                                                    <Box className='create-expenses-label'>Available Balance</Box>
                                                    <Box className='create-expenses-value'>{numberWithCommas(bankInformation.balance)}</Box>
                                                </Box>
                                                {isEnable['amount'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Amount</Box>
                                                        <Box className='create-expenses-value'>{this.getAmount(transaction.amount)}</Box>
                                                    </Box>
                                                }
                                                {transaction.type === 'Deposit' && isEnable['amount'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label deposit-transaction'>{`+  Deposit`}</Box>
                                                    </Box>
                                                }
                                                {transaction.type === 'Withdraw' && isEnable['amount'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label withdraw-transaction'>{`-  Withdraw`}</Box>
                                                    </Box>
                                                }
                                                {isEnable['amountTax'] &&
                                                    <Box>
                                                        <Divider variant='middle' />
                                                        <Box className='create-expenses-outer-box-label-value'>
                                                            <Box className='create-expenses-total-label'>Total</Box>
                                                            <Box className='create-expenses-total-value'>{this.getAmountWithBalance()}</Box>
                                                        </Box>
                                                    </Box>
                                                }
                                            </Box>
                                        </Paper>
                                    </Grid>
                                </Grid>
                                <Grid item md={12}>
                                    <Box display='flex' marginLeft='auto' justifyContent='flex-end' className='header-align'>
                                        <Button variant="contained" color="primary"
                                            className='submit'
                                            disabled={submitDisable ? submitDisable : !enableUploadIcons}
                                            onClick={this.submit}>
                                            Submit &nbsp;{' '}
                                        </Button>
                                    </Box>
                                </Grid>
                            </Box>
                        }
                    </Paper>
                    <Snackbar anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} open={openError} autoHideDuration={2000} onClose={this.handleClose}>
                        <Alert onClose={this.handleClose} severity="error">
                            {alertData}
                        </Alert>
                    </Snackbar>
                </div>
            )
        }
    }
}


export default withRouter(AddBankTransaction)