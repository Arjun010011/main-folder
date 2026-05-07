import React, { Component } from 'react'
import Swal from 'sweetalert2';
import { withRouter } from 'react-router-dom';
import { Paper, Box, Grid, Button, TextareaAutosize, TextField, FormControl, FormHelperText, CircularProgress, Tooltip } from '@material-ui/core';
import VisibilityOutlinedIcon from '@material-ui/icons/VisibilityOutlined';
import { Link } from 'react-router-dom';
import { MuiPickersUtilsProvider, KeyboardDatePicker, } from '@material-ui/pickers';
import DateFnsUtils from '@date-io/date-fns';
import HighlightOffIcon from '@material-ui/icons/HighlightOff';
import DeleteIcon from '@material-ui/icons/Delete';
import Snackbar from '@material-ui/core/Snackbar';
import moment from 'moment';

import BlankPagewithIcon from 'Components/BlankPageWithIcon'
import { DropDownWithSearch } from 'Components/DropDownWithSearch';
import loadingBar from 'images/loading.gif'
import { maxFileSize } from 'Constants'
import { supported_receipts, image_formats } from 'Containers/Expenses/Constants';
import { Dropdown } from 'Components/DropDown';
import { Divider } from '@material-ui/core';
import { gstinNumberRegex, amountRegexWithDecimals } from 'Constants/regularExpression'
import { getRequest, putRequest, postRequest } from 'Includes/api/apicall';
import { GET_URL, PUT_URL, POST_URL } from 'Includes/urls'
import { getUrlParam, getKeyValueMap, dateFormat, validateDate, Alert, isUserHasPermission, NumberFormatCustom } from 'Includes/functions';
import './styles.scss';
import { Actions } from 'Constants/permissions';


class CreateExpenses extends Component {

    constructor(props) {
        super(props)

        this.state = {
            submitDisable: false,
            expenses: { receipt_preview: '', selectedExpenses: null, receipt: '' },
            fieldErrors: {},
            expensesTypeList: [],
            buildingList: [],
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
            alertData: 'Please clear the errors',
            expenseDetails: {},
            isEdit: false,
            submitDisable: false,
            pageLoading: false,
            isBlankPage: true,
        }
    }


    componentDidMount = () => {
        if (this.props.location.pathname === Actions.hostel_expenses_create.update.url) {
            if (this.props.location.state && this.props.location.state.detail) {
                let id = this.props.location.state.detail
                this.updateExpenseDetails(id);
            }
            else {
                this.props.history.push(Actions.hostel_expenses_create.view.url);
            }
        }
        else {
            let { year, yearName, fromDate } = getUrlParam();
            this.setState({
                year: year,
                yearName: yearName,
                fromDate: dateFormat(fromDate, 'YYYY-MM-DD'),
            })
            this.getFinancialYearList(year)
        }
        this.getBuildingList()
    }

    getBuildingList = () => {
        const url = GET_URL.buildingdata.api
        const params = { is_active: true, building_type:'Hostel' }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    buildingList: response.data.data,
                })
            }
        })
    }



    getFinancialYearList = (year) => {
        const url = GET_URL.financialyear.api
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                let fromDate, yearName, ToYear, startDate, endDate
                response.data.data.map((data) => {
                    if (data.id == year) {
                        fromDate = data.start_date.split('-');
                        ToYear = data.end_date.split('-');
                        yearName = fromDate[0] + '-' + ToYear[0]
                        startDate = data.start_date
                        endDate = data.end_date
                    }
                })
                var SpecialTo = moment(endDate, "YYYY/MM/DD");
                if (moment() > SpecialTo) {
                    endDate = new Date()
                }
                this.setState({
                    yearList: response.data.data,
                    yearName,
                    fromDate: startDate,
                    toDate: endDate,
                    loading: false,
                    year: year,
                    toDate: new Date()

                }, () => {
                    if (year) {
                        this.getExpensesTypeList(year);
                    }
                })

            }
        })
    }

    updateExpenseDetails = (id) => {
        let { expenseDetails } = this.state;
        const url = GET_URL.expense.api + id + '/'
        getRequest(url, {}, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    expenseDetails: response.data.data,
                    isEdit: true,

                }, () => {
                    this.getFinancialYearList(response.data.data.financial_year)
                })
            }
        })
    }

    updateAllDetails = () => {
        let { expenses, expenseDetails, isEnable, expensesTypeList, upload_name } = this.state;
        expensesTypeList.map((data) => {
            if (data.id === expenseDetails.expense_plan) {
                expenses.selectedExpenses = data
            }
        })
        isEnable['selectedExpense'] = true
        expenses['selectedDate'] = expenseDetails.date
        expenses['amount'] = expenseDetails.amount
        expenses['amountTax'] = expenseDetails.tax_amount
        expenses['refNumber'] = expenseDetails.ref_number
        expenses['selectedBuilding'] = expenseDetails.building
        expenses['gst_number'] = expenseDetails.gst_number
        expenses['financial_year'] = expenseDetails.financial_year
        expenses['comment'] = expenseDetails.comment
        expenses['receipt'] = expenseDetails.attachment
        expenses['receipt_preview'] = expenseDetails.attachment_details ? expenseDetails.attachment_details.file : ''
        if (expenseDetails.attachment_details) {
            let fileName = expenseDetails.attachment_details.file
            let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
            let file_name = `${fileName.slice((Math.max(0, fileName.lastIndexOf("/")) || Infinity) + 1)}`;
            expenses['receipt_extension'] = file_extension
            expenses['receipt_name'] = file_name
            upload_name = 'Change Receipt'
        }

        Object.keys(expenses).map((temp) => {
            isEnable[temp] = true
        })
        this.setState({
            expenses,
            isEnable,
            upload_name
        })
    }

    getExpensesTypeList = (year) => {
        let { isEdit } = this.state;
        const url = GET_URL.expenseplan.api
        const params = { financial_year: year, is_active: true, expense_type__expense_for: 2 }
        getRequest(url, params, this.props).then(response => {
            if (response && response.status === 200) {
                this.setState({
                    expensesTypeList: response.data.data,
                    loading: false,
                    isBlankPage: false
                })
                if (isEdit) {
                    this.updateAllDetails();
                }
            }
        })
    }

    handleChange(event, acceptFileType) {
        let { expenses, enableUploadIcons } = this.state
        this.setState({ enableUploadIcons: false })
        let fileName = event.target.files[0]['name']
        let file_extension = `${fileName.slice((Math.max(0, fileName.lastIndexOf(".")) || Infinity) + 1)}`;
        let is_supported_types = true
        is_supported_types = supported_receipts.type.includes(file_extension.toLowerCase())
        if (event.target.files[0] && is_supported_types) {
            if (event.target.files[0].size < maxFileSize[acceptFileType].size) {
                let post = new FormData();
                post.append('file', event.target.files[0])

                if (expenses['receipt']) {
                    const url = PUT_URL.uploads.api + expenses['receipt'] + '/'
                    putRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            expenses['receipt'] = response.data.data.id
                            expenses['receipt_preview'] = response.data.data.file
                            expenses['receipt_extension'] = file_extension.toLowerCase()
                            expenses['receipt_name'] = fileName
                            this.setState({
                                expenses,
                                upload_name: 'Change Receipt'
                            })
                        }
                    })
                }
                else {
                    const url = POST_URL.uploads.api
                    postRequest(url, post, this.props).then(response => {
                        if (response && response.status === 200) {
                            expenses['receipt'] = response.data.data.id
                            expenses['receipt_preview'] = response.data.data.file
                            expenses['receipt_extension'] = file_extension.toLowerCase()
                            expenses['receipt_name'] = fileName
                            this.setState({
                                expenses,
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
                openError: true,
                alertData: supported_receipts.error
            })
        }
        enableUploadIcons = true
        this.setState({
            enableUploadIcons
        })
    }


    getAmountWithTax = () => {
        let { expenses } = this.state;
        let returnValue = expenses.amount
        if (!isNaN(parseFloat(expenses.amountTax) + parseFloat(expenses.amount)) && (expenses.amountTax)) {
            returnValue = parseFloat(expenses.amountTax) + parseFloat(expenses.amount);
            returnValue = parseFloat(returnValue).toFixed(2)
        }
        return returnValue
    }

    handleSearchChange = (e) => {
        let { expenses, fieldErrors, isEnable } = this.state;
        let { name, value } = e.target;
        if (name === 'amount' || name === 'amountTax') {
            isEnable['amountTax'] = true
        }
        expenses[name] = value
        delete fieldErrors[name]
        if ((name === 'amount' || name === 'amountTax') && !amountRegexWithDecimals.value.test(value) && value) {
            fieldErrors[name] = amountRegexWithDecimals.errorText
            this.setState({
                fieldErrors,
                expenses
            })
            return
        }
        isEnable[name] = true
        this.validateAmount()
        this.setState({
            expenses,
            isEnable,
            fieldErrors
        })
    }

    handleDropDownSearchChange = (e, newValue) => {
        let { expenses, fieldErrors, isEnable } = this.state;
        isEnable['selectedExpenses'] = true
        delete fieldErrors['selectedExpenses']
        expenses['selectedExpenses'] = newValue
        this.validateAmount()
        this.setState({
            expenses,
            fieldErrors,
            isEnable,
            isBlankPage: false
        })
    }

    validateAmount = () => {
        let { fieldErrors, expenses } = this.state;
        let error = false
        let maximumAmount = expenses.selectedExpenses ? expenses.selectedExpenses.max_amount ? expenses.selectedExpenses.max_amount : null : null
        if (parseFloat(expenses.amountTax) > parseFloat(expenses.amount)) {
            error = true
            fieldErrors['amountTax'] = `Please enter below amount ${expenses.amount}`
        }
        if (maximumAmount) {
            if (parseFloat(expenses.amount) > parseFloat(maximumAmount) && !error) {
                error = true
                fieldErrors['amount'] = `Maximum amount for ${expenses.selectedExpenses.expense_type_name} expense ${maximumAmount}`
            }
            else if (parseFloat(this.getAmountWithTax()) > parseFloat(maximumAmount)) {
                error = true
                fieldErrors['amountTax'] = `Including Amount and Tax, Maximum amount for ${expenses.selectedExpenses.expense_type_name} expense ${maximumAmount}`
            }
        }
        if (!error) {
            delete fieldErrors['amountTax']
            delete fieldErrors['amount']
        }
        this.setState({
            fieldErrors,
            maximumAmount
        })
    }

    handleDateSearchChange = (e) => {
        let { expenses, fromDate, toDate, fieldErrors, helperText, isEnable } = this.state;
        expenses['selectedDate'] = e
        delete fieldErrors['selectedDate']
        helperText['selectedDate'] = ''
        isEnable['selectedDate'] = true
        fromDate = dateFormat(fromDate, 'YYYY-MM-DD')
        toDate = dateFormat(toDate, 'YYYY-MM-DD')
        let error = validateDate(e, fromDate, toDate)
        if (error === 'Invalid Date')
            helperText['selectedDate'] = error
        else if (error !== '')
            fieldErrors['selectedDate'] = error
        this.setState({
            expenses,
            fieldErrors,
            isEnable
        })
    }

    getDateFormat = () => {
        let { expenses } = this.state;
        let returnValue = ''
        if (dateFormat(expenses.selectedDate, 'DD-MM-YYYY') !== 'Invalid date')
            returnValue = dateFormat(expenses.selectedDate, 'DD-MM-YYYY')
        return returnValue
    }

    handleViewImage = () => {
        let { expenses } = this.state;
        if (image_formats.includes(expenses.receipt_extension)) {
            this.setState({
                largeImagePreview: expenses.receipt_preview
            })
        }
        else {
            window.open(expenses.receipt_preview);
        }
    }

    handleDeleteImage = () => {
        let { expenses } = this.state;
        expenses['receipt'] = ''
        expenses['receipt_preview'] = ''
        expenses['receipt_name'] = ''
        expenses['receipt_extension'] = ''
        this.setState({
            expenses,
            upload_name: 'Upload Receipt'
        })
    }

    handleCloseLargeImage = () => {
        this.setState({
            largeImagePreview: ''
        })
    }

    validation = () => {
        let { openError } = this.state;
        let returnValue = true
        let { expenses, fieldErrors } = this.state;
        fieldErrors = {}
        if (!expenses.selectedDate) {
            fieldErrors['selectedDate'] = 'select date'
        }
        if (!expenses.selectedExpenses) {
            fieldErrors['selectedExpenses'] = 'select Expense Type'
        }
        if (!expenses.selectedBuilding) {
            fieldErrors['selectedBuilding'] = 'select Building'
        }
        if (!expenses.amount) {
            fieldErrors['amount'] = 'Enter Amount'
        }
        if (expenses.gst_number && !gstinNumberRegex.value.test(expenses.gst_number)) {
            fieldErrors['gst_number'] = gstinNumberRegex.errorText
        }
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
        let { expenses, expenseDetails, isEdit } = this.state;
        let validate = this.validation();
        if (validate) {
            this.setState({ submitDisable: true })
            let post_data = {
                date: dateFormat(expenses.selectedDate, 'YYYY-MM-DD'),
                expense_plan: expenses.selectedExpenses.id,
                amount: parseFloat(expenses.amount),
                total_amount: parseFloat(this.getAmountWithTax()),
                tax_amount: parseFloat(expenses.amountTax) ? parseFloat(expenses.amountTax) : 0.00,
                gst_number: expenses.gst_number,
                ref_number: expenses.refNumber,
                comment: expenses.comment,
                attachment: expenses.receipt ? expenses.receipt : null,
                building: expenses.selectedBuilding,
                token: null,
                vehicle: null
            }
            let url
            if (isEdit) {
                url = PUT_URL.expense.api + expenseDetails.id + '/'
                putRequest(url, post_data, this.props)
                    .then((response) => {
                        if (response && response.status === 200) {
                            Swal.fire({
                                position: 'top-end',
                                type: 'success',
                                title: 'Your Data has been saved',
                                showConfirmButton: false,
                                timer: 1500
                            })
                            this.props.history.push({
                                pathname: Actions.hostel_expenses_individual.view.url,
                                state: { detail: expenseDetails.id }
                            })
                        }
                        this.setState({ submitDisable: false })
                    });
            }
            else {
                url = PUT_URL.expense.api;
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
                            this.props.history.push(Actions.hostel_expenses_create.view.url)
                        }
                        this.setState({ submitDisable: false })
                    });
            }

        }
    }

    handleClose = () => {
        this.setState({
            openError: false
        })
    }

    render() {
        const { yearName, loading, expenses, fieldErrors, expensesTypeList, helperText, enableUploadIcons, buildingList, largeImagePreview,
            maximumAmount, isEdit, fromDate, toDate, isEnable, upload_name, openError, alertData, submitDisable, pageLoading, isBlankPage } = this.state
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
                                    Create Hostel Expenses for {yearName}
                                </Box>
                            </Grid>
                            <Grid item md={4} xs={12} >
                                <Box className='header-align end-flex-prop'>
                                    {isUserHasPermission('hostel_expenses_create', 'view') &&
                                        <Button
                                            variant="contained"
                                            component={Link} to={Actions.hostel_expenses_create.view.url}
                                            className='editbutton-view'
                                        ><VisibilityOutlinedIcon className='visibility-icon' /> {Actions.hostel_expenses_create.view.label}</Button>
                                    }
                                </Box>

                            </Grid>
                        </Grid>
                        <Grid container>
                            <Grid item md={3} xs={12}>
                                <DropDownWithSearch
                                    options={expensesTypeList}
                                    value={expenses.selectedExpenses}
                                    onChange={(e, newValue) => this.handleDropDownSearchChange(e, newValue)}
                                    name='selectedExpenses'
                                    label='Expense Type'
                                    optionValue='expense_type_name'
                                    className='width-100'
                                    helperText={expenses.selectedExpenses ? `` : fieldErrors['selectedExpenses']}
                                    error={fieldErrors['selectedExpenses']}
                                />
                            </Grid>
                        </Grid>
                        {isBlankPage && !pageLoading &&
                            <Grid item md={12} className='header-align'>
                                <BlankPagewithIcon data="Please Select Expense Type  and expect the result" />
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
                                        <Paper className='paper-plain-background header-align m-t-20px p-b-20px'>
                                            <Grid container spacing={2}>
                                                <Grid item md={6} xs={12}>
                                                    <MuiPickersUtilsProvider utils={DateFnsUtils}>
                                                        <KeyboardDatePicker
                                                            className='width-100'
                                                            autoOk
                                                            variant='inline'
                                                            inputVariant="outlined"
                                                            label='Date'
                                                            minDate={fromDate}
                                                            maxDate={toDate}
                                                            name='selectedDate'
                                                            // InputLabelProps={{ shrink: expenses.selectedDate ? true : false }}
                                                            format="dd-MM-yyyy"
                                                            value={expenses.selectedDate ? expenses.selectedDate : null}
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
                                                    {((isEdit && expenses.selectedBuilding) || !isEdit) &&
                                                        <Dropdown
                                                            data={buildingList}
                                                            name='selectedBuilding'
                                                            style='width-100'
                                                            value={expenses.selectedBuilding}
                                                            onChange={(e) => this.handleSearchChange(e)}
                                                            label='Building'
                                                            hideSelect={true}
                                                            error={fieldErrors['selectedBuilding']}
                                                        />
                                                    }
                                                </Grid>
                                            </Grid>
                                            <Grid container spacing={2} className='header-align'>
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Amount'
                                                        required={true}
                                                        name='amount'
                                                        type='text'
                                                        value={expenses.amount}
                                                        disabled={expenses.selectedExpenses ? false : true}
                                                        className='width-100'
                                                        InputProps={{
                                                            inputComponent: NumberFormatCustom,
                                                        }}
                                                        inputProps={{ maxLength: '15' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={expenses.selectedExpenses ? fieldErrors['amount'] ? fieldErrors['amount'] : expenses.selectedExpenses.max_amount ? `maximum amount is ${expenses.selectedExpenses.max_amount}` : '' : 'Select Expense Type to enter amount'}
                                                        error={fieldErrors['amount']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Tax'
                                                        name='amountTax'
                                                        type='text'
                                                        value={expenses.amountTax}
                                                        className='width-100'
                                                        disabled={expenses.amount ? false : true}
                                                        InputProps={{
                                                            inputComponent: NumberFormatCustom,
                                                        }}
                                                        inputProps={{ maxLength: '15' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={expenses.amount ? fieldErrors['amountTax'] ? fieldErrors['amountTax'] : expenses.selectedExpenses.max_amount ? `Including Amount and Tax, maximum amount is ${expenses.selectedExpenses.max_amount}` : '' : 'Enter amount to enter tax'}
                                                        error={fieldErrors['amountTax']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>

                                            </Grid>
                                            <Grid container spacing={2} className='header-align'>
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='Ref Number'
                                                        required={false}
                                                        name='refNumber'
                                                        value={expenses.refNumber}
                                                        className='width-100'
                                                        inputProps={{ maxLength: '20' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={fieldErrors['refNumber'] === '' ? helperText['refNumber'] : fieldErrors['refNumber']}
                                                        error={fieldErrors['refNumber']}
                                                        onChange={(e) => this.handleSearchChange(e)}
                                                    />
                                                </Grid>
                                                <Grid item md={6} xs={12}>
                                                    <TextField
                                                        label='GSTIN Number'
                                                        required={false}
                                                        name='gst_number'
                                                        value={expenses.gst_number}
                                                        className='width-100'
                                                        inputProps={{ maxLength: '15' }}
                                                        fullWidth={true}
                                                        variant="outlined"
                                                        helperText={fieldErrors['gst_number'] === '' ? helperText['gst_number'] : fieldErrors['gst_number']}
                                                        error={fieldErrors['gst_number']}
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
                                                            value={expenses.comment}
                                                            name='comment'
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
                                                </Box>
                                                <input type='file' id='upload-pic' className='display-none' onChange={(e) => this.handleChange(e, 'img')}
                                                    onClick={e => (e.target.value = null)} />

                                                {(expenses.receipt_preview !== '' && enableUploadIcons && expenses.receipt) &&
                                                    <Box className='flex-justify-space-around header-align'>
                                                        <Box>{expenses.receipt_name}</Box>
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
                                                {isEnable['selectedDate'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Date</Box>
                                                        <Box className='create-expenses-value'>{this.getDateFormat()}</Box>
                                                    </Box>
                                                }
                                                {isEnable['selectedExpenses'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Expenses Type</Box>
                                                        <Box className='create-expenses-value'>{expenses.selectedExpenses && expenses.selectedExpenses.expense_type_name}</Box>
                                                    </Box>
                                                }
                                                {isEnable['amount'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Amount</Box>
                                                        <Box className='create-expenses-value'>{expenses.amount}</Box>
                                                    </Box>
                                                }
                                                {isEnable['amountTax'] &&
                                                    <Box className='create-expenses-outer-box-label-value'>
                                                        <Box className='create-expenses-label'>Tax</Box>
                                                        <Box className='create-expenses-value'>{expenses.amountTax ? expenses.amountTax : 0.00}</Box>
                                                    </Box>
                                                }
                                                {isEnable['amountTax'] &&
                                                    <Box>
                                                        <Divider variant='middle' />
                                                        <Box className='create-expenses-outer-box-label-value'>
                                                            <Box className='create-expenses-total-label'>Total</Box>
                                                            <Box className='create-expenses-total-value'>{this.getAmountWithTax()}</Box>
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


export default withRouter(CreateExpenses)
